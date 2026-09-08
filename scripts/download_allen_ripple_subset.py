"""Extract selected Allen sessions from the published OSF ripple archive.

Only requested ZIP members are transferred. Original gzip bytes are preserved.
SPDX-License-Identifier: MIT
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import zipfile
import time

import requests

OSF_FILE = "https://api.osf.io/v2/files/68c89cf8f043ce674f4141eb/"


class RemoteZip(io.RawIOBase):
    def __init__(self, url, size, budget=200_000_000):
        self.url, self.size, self.position = url, size, 0
        self.stable_url = url
        self.budget, self.transferred = budget, 0
        self.session = requests.Session()
        self.etag = None

    def seekable(self):
        return True

    def readable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=0):
        self.position = offset if whence == 0 else self.position + offset if whence == 1 else self.size + offset
        if not 0 <= self.position <= self.size:
            raise ValueError("Invalid archive position")
        return self.position

    def read(self, size=-1):
        count = min(self.size - self.position, size if size >= 0 else self.size)
        if not count:
            return b""
        if self.transferred + count > self.budget:
            raise ValueError("Subset transfer exceeds its 200 MB budget")
        start, end = self.position, self.position + count - 1
        headers = {"Range": f"bytes={start}-{end}", "Accept-Encoding": "identity"}
        if self.etag:
            headers["If-Match"] = self.etag
        for attempt in range(5):
            try:
                with self.session.get(self.url, headers=headers, timeout=(15, 60)) as response:
                    response.raise_for_status()
                    if response.status_code != 206 or response.headers.get("Content-Range") != f"bytes {start}-{end}/{self.size}":
                        raise ValueError("Archive server must honor exact byte ranges")
                    data = response.content
                    if len(data) != count:
                        raise ValueError("Truncated archive range")
                    self.etag = response.headers.get("ETag")
                    self.url = response.url
                break
            except requests.RequestException:
                if attempt == 4:
                    raise
                self.url = self.stable_url
                time.sleep(2 ** attempt)
        self.position += count
        self.transferred += count
        return data

    def close(self):
        self.session.close()
        super().close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--sessions", type=int, nargs="+", required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    response = requests.get(OSF_FILE, timeout=30)
    response.raise_for_status()
    metadata = response.json()["data"]
    (root / "source-archive.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    requested = {f"swrs_session_{number}" for number in args.sessions}
    receipts = []
    with RemoteZip(metadata["links"]["download"], metadata["attributes"]["size"]) as source:
        with zipfile.ZipFile(source) as archive:
            members = [member for member in archive.infolist() if not member.is_dir()
                       and "allen_visbehave_swr_murphylab2024" in PurePosixPath(member.filename).parts
                       and requested.intersection(PurePosixPath(member.filename).parts)
                       and "__MACOSX" not in PurePosixPath(member.filename).parts]
            if sum(member.file_size for member in members) > 200_000_000:
                raise ValueError("Extracted subset exceeds its 200 MB budget")
            print(json.dumps({"matching_files": len(members), "compressed_bytes": sum(x.compress_size for x in members)}), flush=True)
            for member in members:
                components = PurePosixPath(member.filename).parts
                folder = next(part for part in components if part in requested)
                target = (root / folder / components[-1]).resolve()
                if not target.is_relative_to(root):
                    raise ValueError("Unsafe archive path")
                target.parent.mkdir(parents=True, exist_ok=True)
                if target.exists():
                    data = target.read_bytes()
                    # zipfile's CRC check is repeated for newly downloaded members only.
                    import zlib
                    if len(data) != member.file_size or zlib.crc32(data) != member.CRC:
                        raise ValueError("Existing subset file differs from the published archive")
                else:
                    data = archive.read(member)  # Includes ZIP CRC32 validation.
                    temporary = target.with_name(target.name + ".part")
                    temporary.write_bytes(data)
                    temporary.replace(target)
                receipts.append({"path": target.relative_to(root).as_posix(), "zip_member": member.filename,
                                 "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                                 "zip_crc32_verified": True, "zip_crc32": f"{member.CRC:08x}"})
                print(json.dumps(receipts[-1]), flush=True)
        result = {"source": OSF_FILE, "archive_hashes": metadata["attributes"]["extra"]["hashes"],
                  "whole_archive_hash_verified": False, "range_bytes_transferred": source.transferred,
                  "requested_sessions": args.sessions,
                  "missing_sessions": sorted(requested - {Path(x["path"]).parts[0] for x in receipts}),
                  "files": receipts}
    (root / "subset-receipt.json").write_text(json.dumps(result, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
