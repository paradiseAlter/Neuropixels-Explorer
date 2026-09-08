"""Prepare one V1-containing physical probe and side camera per Allen session.

Run after download_allen_dataset.py, or use --ready-only for a partial corpus.
Original sources and scientific unit labels remain unchanged.
SPDX-License-Identifier: MIT
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import sqlite3
from contextlib import closing

import h5py
import numpy as np

from analyze_allen_session import analyze, strings
from build_allen_video_clock import build
from import_allen_probe import import_probe


def choose_probe(nwb):
    with h5py.File(nwb, "r") as source:
        electrodes, units = source["general/extracellular_ephys/electrodes"], source["units"]
        lookup = {int(value): index for index, value in enumerate(electrodes["id"][:])}
        peaks = np.asarray([lookup[int(value)] for value in units["peak_channel_id"][:]])
        locations = strings(electrodes["location"][:])[peaks]
        probes = electrodes["probe_id"][:][peaks]
        candidates = [(int(np.sum((locations == "VISp") & (probes == device.attrs["probe_id"]))), name)
                      for name, device in source["general/devices"].items() if "probe_id" in device.attrs]
        candidates.sort(key=lambda item: (-item[0], item[1]))
        if not candidates or candidates[0][0] == 0:
            raise ValueError("Session has no V1-containing probe")
        return candidates[0][1]


def prepare(root, session):
    sid = str(session["ecephys_session_id"])
    source = root / "sources/v0.5.0" / sid
    nwb = source / f"ecephys_session_{sid}.nwb"
    video = source / "behavior_videos/side.mp4"
    timestamps = source / "behavior_videos/side_timestamps.npy"
    output = root / "derived" / sid
    output.mkdir(parents=True, exist_ok=True)
    clock_path = output / "side-full.clock.json"
    receipt = json.loads(video.with_name(video.name + ".receipt.json").read_text(encoding="utf-8"))
    if clock_path.exists():
        clock = json.loads(clock_path.read_text(encoding="utf-8"))
        if clock["session_id"] != sid or clock["video"]["sha256"] != receipt["sha256"]:
            raise ValueError("Existing clock does not match the verified session video")
    else:
        clock = build(video, timestamps, sid, clock_path)
    return sid, nwb, video, clock_path, choose_probe(nwb), clock


def run(root, plan_path, database, workers=2, ready_only=False):
    root = root.resolve()
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    expected = {item["path"]: item for item in plan["files"]}
    ready, pending = [], []
    for session in plan["sessions"]:
        sid = str(session["ecephys_session_id"])
        names = [f"sources/v0.5.0/{sid}/ecephys_session_{sid}.nwb",
                 f"sources/v0.5.0/{sid}/behavior_videos/side.mp4",
                 f"sources/v0.5.0/{sid}/behavior_videos/side_timestamps.npy"]
        complete = True
        for name in names:
            path = root / name
            receipt_path = path.with_name(path.name + ".receipt.json")
            if not path.exists() or not receipt_path.exists() or path.stat().st_size != expected[name]["size"]:
                complete = False
                break
            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            if receipt["identity"] != {key: expected[name].get(key) for key in ("url", "size", "etag", "blake2b")}:
                raise ValueError(f"Source receipt disagrees with plan: {name}")
        (ready if complete else pending).append(session)
    if pending and not ready_only:
        raise ValueError("Some required downloads are incomplete; finish downloading or explicitly choose --ready-only")
    results = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        jobs = [pool.submit(prepare, root, session) for session in ready]
        for job in as_completed(jobs):
            sid, nwb, video, clock_path, probe, clock = job.result()
            analysis_path = root / "analysis" / sid / "analysis-summary.json"
            analysis = json.loads(analysis_path.read_text(encoding="utf-8")) if analysis_path.exists() else analyze(nwb, analysis_path.parent)
            if analysis["session_id"] != sid:
                raise ValueError("Existing analysis belongs to a different session")
            manifest = root / "derived" / sid / probe / "explorer-import.json"
            if manifest.exists():
                if not database.exists():
                    raise ValueError("Existing derived probe has no requested catalog; preserve it and use its original catalog")
                with closing(sqlite3.connect(database)) as connection:
                    if not connection.execute("SELECT 1 FROM recordings WHERE recording_id=?", (f"allen-{sid}-{probe}",)).fetchone():
                        raise ValueError("Existing derived probe is not registered in the requested catalog")
                imported = json.loads(manifest.read_text(encoding="utf-8"))
            else:
                imported = import_probe(nwb, root, database, probe, video, clock_path)
            result = {"session_id": sid, "probe": probe, "units": imported["unit_count"], "spikes": imported["spike_count"],
                      "video_frames": clock["video"]["frame_count"], "matched_frames": clock["timeMapping"]["matched_event_count"],
                      "clock_reconstruction_max_error_ms": clock["timeMapping"]["provenance"]["maximum_anchor_error_ms"],
                      "psth_units": analysis["unit_count"], "active_changes": analysis["active_change_count"]}
            results.append(result)
            print(json.dumps(result), flush=True)
    report = {"prepared": sorted(results, key=lambda value: value["session_id"]),
              "pending_sessions": [str(session["ecephys_session_id"]) for session in pending],
              "probe_selection": "Physical probe with most original VISp units, alphabetical tie-break; all original units preserved"}
    destination = root / "derived/demo-preparation.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--workers", type=int, choices=[1, 2], default=2)
    parser.add_argument("--ready-only", action="store_true")
    args = parser.parse_args()
    run(args.root, args.plan, args.database, args.workers, args.ready_only)
