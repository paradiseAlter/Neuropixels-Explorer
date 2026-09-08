"""SPDX-License-Identifier: MIT

Local candidate adapters. No raw videos, model weights or third-party algorithms
are bundled. Model outputs always remain suggestions until reviewed in Explorer.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "neuropixels-behavior-candidates/1"


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def bouts(labels: list[str], boundaries: list[float], distances=None) -> list[dict]:
    if len(boundaries) != len(labels) + 1 or not labels:
        raise ValueError("Expected one more frame boundary than labels")
    if any(not math.isfinite(v) or v < 0 for v in boundaries):
        raise ValueError("Frame boundaries must be finite video-relative seconds")
    if any(b <= a for a, b in zip(boundaries, boundaries[1:])):
        raise ValueError("Frame boundaries must be strictly increasing")
    result = []
    start = 0
    for stop in range(1, len(labels) + 1):
        if stop != len(labels) and labels[stop] == labels[start]:
            continue
        item = {"start": boundaries[start], "end": boundaries[stop], "group_id": str(labels[start])}
        if distances is not None:
            item["distance"] = float(sum(distances[start:stop]) / (stop - start))
        result.append(item)
        start = stop
    return result


def keypoint_csv(path: Path, duration: float, fps: float | None = None, boundary_path: Path | None = None) -> tuple[list[dict], dict]:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    if not rows or len(rows) > 10_000_000 or "syllable" not in rows[0]:
        raise ValueError("Expected a dense, one-recording Keypoint-MoSeq CSV with a syllable column")
    for index, row in enumerate(rows):
        frame = row.get("frame", row.get("frame_index", row.get("")))
        if frame not in (None, "") and float(frame) != index:
            raise ValueError("Frames must be consecutive from zero; sparse or concatenated recordings are not supported")
        if not row["syllable"].strip():
            raise ValueError("Missing syllable label")
    labels = [row["syllable"].strip() for row in rows]
    if boundary_path:
        if boundary_path.suffix.lower() == ".npy":
            import numpy as np
            values = np.load(boundary_path, allow_pickle=False)
            if values.ndim != 1:
                raise ValueError("Boundary timestamps must be one-dimensional")
            boundaries = values.tolist()
        else:
            boundaries = json.loads(boundary_path.read_text(encoding="utf-8-sig"))
        timing = {"method": "provided_video_frame_boundaries", "sha256": file_digest(boundary_path)}
    else:
        if fps is None or not math.isfinite(fps) or fps <= 0:
            raise ValueError("Supply --fps for constant-frame-rate video or --boundaries for explicit frame-boundary timestamps")
        if abs(len(rows) / fps - duration) > max(.001, .25 / fps):
            raise ValueError("Frame count / FPS disagrees with video duration; use explicit video-relative boundaries")
        boundaries = [i / fps for i in range(len(rows))] + [duration]
        timing = {"method": "declared_constant_fps", "fps": fps, "verification_status": "unverified"}
    if len(boundaries) != len(labels) + 1 or abs(boundaries[0]) > 1e-6 or abs(boundaries[-1] - duration) > 1e-4:
        raise ValueError("Supply N+1 boundaries covering this whole video from 0 to duration; acquisition/neural timestamps cannot be used directly")
    return bouts(labels, boundaries), timing


def cluster_features(payload: dict, count: int, method: str) -> tuple[list[dict], dict]:
    import numpy as np
    import sklearn
    from sklearn.cluster import AgglomerativeClustering, KMeans
    from sklearn.preprocessing import StandardScaler

    x = np.asarray(payload["features"], dtype=float)
    times = np.asarray(payload["times"], dtype=float)
    duration = float(payload["video"]["duration"])
    if x.ndim != 2 or x.shape[1] == 0 or x.shape[1] > 256 or x.shape[0] != len(times) or len(times) < count or not np.isfinite(x).all():
        raise ValueError("Invalid feature matrix")
    if len(times) > (5000 if method == "ward" else 60000):
        raise ValueError("Too many samples for this evaluation method")
    if times[0] != 0 or not np.isfinite(times).all() or np.any(np.diff(times) <= 0) or times[-1] >= duration:
        raise ValueError("Expected ordered video-relative sample times beginning at zero")
    x = StandardScaler().fit_transform(x)
    unique = len(np.unique(x, axis=0))
    count = min(count, unique)
    model = KMeans(n_clusters=count, n_init=10, random_state=42) if method == "kmeans" else AgglomerativeClustering(n_clusters=count, linkage="ward")
    from threadpoolctl import threadpool_limits
    with threadpool_limits(limits=1):
        labels = model.fit_predict(x)
    filtered = labels.copy()
    for i in range(1, len(labels) - 1):
        if labels[i - 1] == labels[i + 1]:
            filtered[i] = labels[i - 1]
    centers = {group: x[filtered == group].mean(axis=0) for group in np.unique(filtered)}
    distances = [float(np.linalg.norm(row - centers[group])) for row, group in zip(x, filtered)]
    result = bouts([str(int(v)) for v in filtered], times.tolist() + [duration], distances)
    return result, {"implementation": f"scikit-learn {sklearn.__version__}", "license": "BSD-3-Clause",
                    "method": method, "groups": count, "sample_count": len(times), "seed": 42 if method == "kmeans" else None,
                    "temporal_filter": "majority_of_three", "features": payload.get("feature_method", "external")}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    kp = sub.add_parser("keypoint-moseq", help="Convert independently generated per-frame syllables; does not install or run Keypoint-MoSeq")
    kp.add_argument("--csv", type=Path, required=True)
    kp.add_argument("--video", type=Path, required=True)
    kp.add_argument("--duration", type=float, required=True)
    timing = kp.add_mutually_exclusive_group(required=True)
    timing.add_argument("--fps", type=float)
    timing.add_argument("--boundaries", type=Path, help="JSON/NPY array of N+1 video-relative frame-boundary times")
    kp.add_argument("--output", type=Path, required=True)
    feature = sub.add_parser("features", help="Cluster externally extracted motion/pose/video features with optional scikit-learn")
    feature.add_argument("--input", type=Path, required=True)
    feature.add_argument("--method", choices=["kmeans", "ward"], default="kmeans")
    feature.add_argument("--groups", type=int, default=8)
    feature.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    if args.output.exists():
        parser.error("Output already exists. Choose another path to preserve the previous run.")
    if args.command == "keypoint-moseq":
        if not math.isfinite(args.duration) or args.duration <= 0:
            parser.error("Video duration must be positive")
        segments, parameters = keypoint_csv(args.csv, args.duration, args.fps, args.boundaries)
        video = {"name": args.video.name, "size": args.video.stat().st_size, "duration": args.duration}
        method = "external-keypoint-moseq-csv"
        source = {"filename": args.csv.name, "sha256": file_digest(args.csv)}
        license_note = "Converter: MIT; Keypoint-MoSeq itself is not bundled and has separate academic/non-commercial terms."
    else:
        if not 2 <= args.groups <= 32:
            parser.error("Choose 2–32 target groups")
        payload = json.loads(args.input.read_text(encoding="utf-8-sig"))
        segments, parameters = cluster_features(payload, args.groups, args.method)
        video = payload["video"]
        method = f"sklearn-{args.method}/1"
        source = {"filename": args.input.name, "sha256": file_digest(args.input)}
        license_note = "Adapter: MIT; scikit-learn: BSD-3-Clause; installed separately."
    result = {"schema": SCHEMA, "timebase": "video_seconds", "video": video,
              "run": {"id": str(uuid.uuid4()), "method": method, "parameters": parameters, "source": source,
                      "createdAt": datetime.now(timezone.utc).isoformat(), "license": license_note,
                      "limitations": "Unreviewed motion/state groups; no semantic behavior accuracy or neural synchronization is implied."},
              "segments": segments}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"output": str(args.output), "segments": len(segments), "groups": len({s["group_id"] for s in segments})}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
