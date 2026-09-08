"""Bind decoded video frames to Allen exposure timestamps, without extrapolation.

Supports a full original video or a prefix remux with unchanged frame order.
SPDX-License-Identifier: MIT
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np


def compress_clock(video, neural, tolerance):
    """Keep anchors until every measured frame differs by <= tolerance seconds."""
    retained = {0, len(video) - 1}
    pending = [(0, len(video) - 1)]
    while pending:
        start, end = pending.pop()
        if end - start < 2:
            continue
        predicted = neural[start] + (video[start:end + 1] - video[start]) * (neural[end] - neural[start]) / (video[end] - video[start])
        error = np.abs(neural[start:end + 1] - predicted)
        index = start + int(np.argmax(error))
        if error[index - start] > tolerance:
            retained.add(index)
            pending.extend([(start, index), (index, end)])
    indices = np.asarray(sorted(retained))
    return video[indices], neural[indices]


def sha256(path):
    result = hashlib.sha256()
    with path.open("rb") as source:
        while block := source.read(4 * 1024 * 1024):
            result.update(block)
    return result.hexdigest()


def build(video_path, timestamps_path, session_id, output, prefix=False):
    import av
    timestamps = np.load(timestamps_path, allow_pickle=False)
    if timestamps.ndim != 1:
        raise ValueError("Expected one exposure timestamp per recorded video frame")
    with av.open(str(video_path)) as container:
        stream = container.streams.video[0]
        stream.codec_context.thread_count = 2
        stream.thread_type = "FRAME"
        times = np.asarray([frame.time for frame in container.decode(stream)], dtype=float)
        video = {"name": video_path.name, "sha256": sha256(video_path), "frame_count": len(times),
                 "fps": float(stream.average_rate), "width": stream.width, "height": stream.height,
                 "duration_s": float(stream.duration * stream.time_base)}
    if not len(times) or (len(times) != len(timestamps) and not (prefix and len(times) < len(timestamps))):
        raise ValueError("Video and timestamp frame counts differ")
    if np.any(np.diff(times) <= 0) or not np.all(np.isfinite(times)):
        raise ValueError("Decoded presentation timestamps must be finite and increasing")
    neural = timestamps[:len(times)]
    valid = np.isfinite(neural)
    indices = np.flatnonzero(valid)
    if len(indices) < 2 or np.any(np.diff(neural[valid]) <= 0) or np.any(np.diff(indices) != 1):
        raise ValueError("Only missing prefix/tail timestamps are supported; interior missing timestamps need explicit gaps")
    x, y = times[valid], neural[valid]
    vx, ny = compress_clock(x, y, .0001)
    errors = np.interp(x, vx, ny) - y
    scale, offset = np.polyfit(x, y, 1)
    affine_errors = offset + scale * x - y
    result = {"schema": "allen-video-clock/1", "session_id": str(session_id), "video": video,
              "timeMapping": {"method": "frame_timestamps", "offset_s": float(offset), "scale": float(scale),
                  "verification_status": "verified", "matched_event_count": len(indices),
                  "residual_rms_ms": float(np.sqrt(np.mean(errors ** 2)) * 1000),
                  "provenance": {"kind": "Allen exposure-start TTLs; decoded video PTS",
                      "timestamps_file": timestamps_path.name, "timestamps_sha256": sha256(timestamps_path),
                      "prefix_remux": prefix, "missing_frame_indices": np.flatnonzero(~valid).tolist(),
                      "frame_clock": {"video_s": vx.tolist(), "neural_s": ny.tolist()},
                      "maximum_anchor_error_ms": float(np.max(np.abs(errors)) * 1000),
                      "maximum_affine_error_ms": float(np.max(np.abs(affine_errors)) * 1000),
                      "meaning": "Clock correspondence, not proof of behavior labels or response latency; no extrapolation"}}}
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--timestamps", type=Path, required=True)
    parser.add_argument("--session-id", type=int, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--prefix-remux", action="store_true", help="Input is an unchanged prefix of the source frame sequence")
    args = parser.parse_args()
    result = build(args.video, args.timestamps, args.session_id, args.output, args.prefix_remux)
    print(json.dumps({"frames": result["video"]["frame_count"], "matched": result["timeMapping"]["matched_event_count"],
                      "anchor_error_ms": result["timeMapping"]["provenance"]["maximum_anchor_error_ms"]}))


if __name__ == "__main__":
    main()
