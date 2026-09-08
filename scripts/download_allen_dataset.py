"""Download an explicit public Allen file plan, with resumable verified ranges.

SPDX-License-Identifier: MIT
No credentials, full-bucket mirroring, or overwrite of completed files.
"""
from __future__ import annotations

import argparse
import concurrent.futures as futures
import hashlib
import json
import math
import shutil
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

import requests

ALLOWED_HOSTS = {
    "visual-behavior-neuropixels-data.s3.amazonaws.com",
    "visual-behavior-neuropixels-data.s3.us-west-2.amazonaws.com",
    "allen-brain-observatory.s3.amazonaws.com",
    "allen-brain-observatory.s3.us-west-2.amazonaws.com",
    "dandiarchive.s3.amazonaws.com",
}


def contained(root: Path, relative: str) -> Path:
    destination = (root / relative).resolve()
    if not destination.is_relative_to(root) or destination == root:
        raise ValueError("Download destination escapes its data root")
    return destination


def atomic_json(path: Path, payload) -> None:
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    temp.replace(path)


def download_file(item: dict, root: Path, workers: int, chunk_size: int) -> dict:
    url = item["url"]
    if urlparse(url).scheme != "https" or urlparse(url).hostname not in ALLOWED_HOSTS:
        raise ValueError("Only explicit HTTPS URLs in the public Allen buckets are accepted")
    target = contained(root, item["path"])
    size = int(item["size"])
    if size <= 0:
        raise ValueError("Planned file size must be positive")
    target.parent.mkdir(parents=True, exist_ok=True)
    receipt = target.with_name(target.name + ".receipt.json")
    identity = {k: item.get(k) for k in ("url", "size", "etag", "blake2b")}
    if target.exists():
        if receipt.exists():
            saved = json.loads(receipt.read_text())
            if saved.get("identity") == identity and target.stat().st_size == size:
                return {"file": item["path"], "status": "previously_verified", "bytes": size}
        raise ValueError(f"Existing file has no matching download receipt: {target}")
    staging = target.with_name(target.name + ".parts")
    staging.mkdir(exist_ok=True)
    source_file = staging / "source.json"
    staging_identity = {"identity": identity, "chunk_size": chunk_size}
    if source_file.exists() and json.loads(source_file.read_text()) != staging_identity:
        raise ValueError("Partial data belongs to another object version or chunk size")
    atomic_json(source_file, staging_identity)
    transfer_url = url.replace("allen-brain-observatory.s3.amazonaws.com", "allen-brain-observatory.s3.us-west-2.amazonaws.com")
    transfer_etag = item.get("etag")
    if item.get("delivery_url"):
        mirror = item["delivery_url"]
        if not mirror.startswith("https://api.dandiarchive.org/api/assets/") or not item.get("blake2b"):
            raise ValueError("Mirrors require a public DANDI asset and a primary Allen hash")
        with requests.get(mirror, headers={"Range": "bytes=0-0"}, stream=True, timeout=(15, 45)) as resolved:
            resolved.raise_for_status()
            if urlparse(resolved.url).hostname not in ALLOWED_HOSTS or resolved.headers.get("Content-Range") != f"bytes 0-0/{size}":
                raise ValueError("Mirror does not match the expected object size")
            transfer_url = resolved.url
            transfer_etag = resolved.headers.get("etag")
    clients = threading.local()
    ranges = [(i, start, min(size, start + chunk_size) - 1) for i, start in enumerate(range(0, size, chunk_size))]
    resumed = sum(min(chunk_size, size - start) for index, start, _ in ranges
                  if (staging / f"{index:06d}.part").exists()
                  and (staging / f"{index:06d}.part").stat().st_size == min(chunk_size, size - start))
    completed = [0]
    lock = threading.Lock()

    def fetch(spec):
        index, start, end = spec
        path = staging / f"{index:06d}.part"
        expected = end - start + 1
        if not path.exists() or path.stat().st_size != expected:
            for attempt in range(5):
                try:
                    existing = path.stat().st_size if path.exists() else 0
                    if existing > expected:
                        raise ValueError("Partial range exceeds the expected length")
                    if existing == expected:
                        break
                    read_start = start + existing
                    headers = {"Range": f"bytes={read_start}-{end}", "Accept-Encoding": "identity"}
                    if transfer_etag:
                        headers["If-Match"] = transfer_etag
                    if not hasattr(clients, "session"):
                        clients.session = requests.Session()
                    with clients.session.get(transfer_url, headers=headers, stream=True, timeout=(15, 45)) as response:
                        response.raise_for_status()
                        if response.status_code != 206 or response.headers.get("Content-Range") != f"bytes {read_start}-{end}/{size}":
                            raise ValueError("Server did not honor the requested byte range")
                        with path.open("ab" if existing else "wb") as output:
                            for block in response.iter_content(256 * 1024):
                                output.write(block)
                        if path.stat().st_size != expected:
                            raise ValueError("Truncated range")
                    break
                except (requests.RequestException, ValueError):
                    if attempt == 4:
                        raise
                    time.sleep(min(8, 2 ** attempt))
        with lock:
            completed[0] += expected

    started = time.monotonic()
    with futures.ThreadPoolExecutor(max_workers=workers) as pool:
        pending = {pool.submit(fetch, part) for part in ranges}
        while pending:
            done, pending = futures.wait(pending, timeout=15, return_when=futures.FIRST_EXCEPTION)
            for job in done:
                job.result()
            elapsed = time.monotonic() - started
            print(json.dumps({"file": item["path"], "completed_bytes": completed[0], "total_bytes": size,
                              "resumed_bytes": resumed, "new_mib_per_s": round(max(0, completed[0] - resumed) / max(1, elapsed) / 2 ** 20, 2)}), flush=True)
    sha = hashlib.sha256()
    blake = hashlib.blake2b()
    md5 = hashlib.md5()
    partial = target.with_name(target.name + ".assembling")
    with partial.open("wb") as output:
        for index, _, _ in ranges:
            with (staging / f"{index:06d}.part").open("rb") as part:
                while block := part.read(4 * 1024 * 1024):
                    output.write(block)
                    sha.update(block)
                    blake.update(block)
                    md5.update(block)
    if partial.stat().st_size != size or (item.get("blake2b") and blake.hexdigest() != item["blake2b"]):
        raise ValueError(f"Whole-file integrity check failed: {item['path']}")
    source_etag = str(item.get("etag") or "").strip('"')
    candidate_etag = hashlib.md5(md5.digest()).hexdigest() + "-1" if source_etag.endswith("-1") else md5.hexdigest()
    result = {"upstream_etag_md5_verified": source_etag == candidate_etag, "md5": md5.hexdigest(), "identity": identity, "sha256": sha.hexdigest(), "blake2b": blake.hexdigest(),
              "upstream_blake2b_verified": bool(item.get("blake2b")), "bytes": size,
              "delivery_source": item.get("delivery_url", transfer_url),
              "finished_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    partial.replace(target)
    atomic_json(receipt, result)
    # Delete only our verified range chunks within the checked, task-owned staging directory.
    for index, _, _ in ranges:
        (staging / f"{index:06d}.part").unlink()
    source_file.unlink()
    staging.rmdir()
    return {"file": item["path"], "status": "complete", **result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=12)
    parser.add_argument("--file-jobs", type=int, default=1, help="Concurrent files, each with --workers range requests")
    parser.add_argument("--chunk-mib", type=int, default=8)
    parser.add_argument("--max-gb", type=float, default=80)
    args = parser.parse_args()
    if not 1 <= args.workers <= 64 or not 1 <= args.chunk_mib <= 64 or not 1 <= args.file_jobs <= 3:
        parser.error("Choose 1-64 workers, 1-3 concurrent files, and 1-64 MiB chunks")
    if not math.isfinite(args.max_gb) or args.max_gb <= 0:
        parser.error("Choose a finite, positive download budget")
    root = args.root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    plan = json.loads(args.plan.read_text(encoding="utf-8"))
    items = plan["files"]
    if len({item["path"] for item in items}) != len(items):
        parser.error("Duplicate download destinations")
    total = sum(int(item["size"]) for item in items)
    if total > args.max_gb * 10 ** 9 or shutil.disk_usage(root).free < total * 1.2:
        parser.error("Download plan exceeds the budget or available disk capacity")
    completed = []
    with futures.ThreadPoolExecutor(max_workers=args.file_jobs) as pool:
        jobs = {pool.submit(download_file, item, root, args.workers, args.chunk_mib * 2 ** 20) for item in items}
        for job in futures.as_completed(jobs):
            result = job.result()
            completed.append(result)
            atomic_json(root / f"{args.plan.stem}-progress.json", {"planned_bytes": total, "files": completed})
            print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
