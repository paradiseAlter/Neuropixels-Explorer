"""Register one physical Allen VBN probe in the existing Explorer catalog.

Each physical probe is a separate Recording; it is never represented as a
shank of another probe. NWB sources and labels remain unchanged.
SPDX-License-Identifier: MIT
"""
from __future__ import annotations

import argparse
from contextlib import closing
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sqlite3
import sys

import h5py
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from neuropixels_explorer.migrations import SCHEMA_VERSION, initialize_database, validate_schema


def text(value):
    return value.decode() if isinstance(value, bytes) else str(value)


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as stream:
        while block := stream.read(4 * 1024 * 1024):
            result.update(block)
    return result.hexdigest()


def insert(connection, table, **values):
    connection.execute(f"INSERT INTO {table} ({','.join(values)}) VALUES ({','.join('?' for _ in values)})", tuple(values.values()))


def import_probe(nwb, root: Path, database: Path, probe_name: str, video: Path = None, clock_path: Path = None, *, output_subdir="derived"):
    root = root.resolve()
    now = datetime.now(timezone.utc).isoformat()
    with h5py.File(nwb, "r") as source:
        session = text(source["identifier"][()])
        if not session.isdigit() or probe_name not in source["general/devices"]:
            raise ValueError("Expected an Allen numeric session and an existing physical probe")
        device = source[f"general/devices/{probe_name}"]
        probe_id, rate = int(device.attrs["probe_id"]), float(device.attrs["sampling_rate"])
        if not np.isfinite(rate) or rate <= 0:
            raise ValueError("Invalid probe sample rate")
        recording_id = f"allen-{session}-{probe_name}"
        folder = root / output_subdir / session / probe_name
        if not folder.resolve().is_relative_to(root):
            raise ValueError("Import output must remain inside the managed data root")
        manifest_path = folder / "explorer-import.json"
        if manifest_path.exists():
            raise ValueError("This probe already has a completed import; use its existing catalog")
        folder.mkdir(parents=True, exist_ok=True)
        electrodes, units = source["general/extracellular_ephys/electrodes"], source["units"]
        e = {key: electrodes[key][:] for key in ["id", "probe_id", "probe_channel_number", "location", "probe_horizontal_position", "probe_vertical_position"]}
        lookup = {int(value): i for i, value in enumerate(e["id"])}
        peaks = np.asarray([lookup[int(channel)] for channel in units["peak_channel_id"][:]])
        selected = np.flatnonzero(e["probe_id"][peaks] == probe_id)
        if not len(selected):
            raise ValueError("Selected probe has no units")
        ids, stops = units["id"][:], units["spike_times_index"][:].astype(np.int64)
        starts = np.r_[0, stops[:-1]]
        counts = stops[selected] - starts[selected]
        total = int(counts.sum())
        times, clusters = np.empty(total, dtype=np.float64), np.empty(total, dtype=np.int64)
        position, max_error = 0, 0.0
        for index, count in zip(selected, counts):
            seconds = units["spike_times"][starts[index]:stops[index]]
            if not np.all(np.isfinite(seconds)) or np.any(np.diff(seconds) < 0):
                raise ValueError("NWB unit spike times must be finite and sorted")
            samples = seconds * rate
            if len(seconds):
                max_error = max(max_error, float(np.max(np.abs(samples / rate - seconds))))
            times[position:position + count] = samples
            clusters[position:position + count] = ids[index]
            position += count
        order = np.argsort(times, kind="stable")
        times, clusters = times[order], clusters[order]
        del order
        if not total:
            raise ValueError("Selected probe has no spikes")
        duration = float(times[-1] / rate)
        np.save(folder / "spike_times.npy", times)
        np.save(folder / "spike_clusters.npy", clusters)
        (folder / "params.py").write_text(f"# NWB seconds times fitted probe sampling_rate; float64 preserves session-clock timing.\nsample_rate = {rate!r}\n", encoding="utf-8")
        quality = [text(units["quality"][index]) for index in selected]
        (folder / "cluster_group.tsv").write_text("cluster_id\tgroup\n" + "".join(f"{int(ids[i])}\t{q}\n" for i, q in zip(selected, quality)), encoding="utf-8")
        channel_indices = np.flatnonzero(e["probe_id"] == probe_id)
        np.save(folder / "channel_positions.npy", np.c_[e["probe_horizontal_position"][channel_indices], e["probe_vertical_position"][channel_indices]])
        np.save(folder / "channel_probe_groups.npy", np.zeros(len(channel_indices), dtype=np.int32))
        metadata = {"source_format": "Allen VBN NWB", "session_id": session, "probe_id": probe_id,
                    "probe_name": probe_name, "unit_count": len(selected), "spike_count": total,
                    "sample_rate_hz": rate, "max_seconds_round_trip_error": max_error,
                    "time_representation": "float64 sample-equivalent values; divide by sample_rate_hz to recover original NWB session seconds",
                    "unit_identity": "Original Allen NWB unit id stored as cluster_id; no relabeling",
                    "anatomy": "Original Allen peak-channel location; no inferred anatomy or new registration",
                    "cohort_note": "Physical probes from the same session are not independent animals"}
        if isinstance(nwb, (str, Path)):
            original = Path(nwb).resolve()
            metadata["source_nwb"] = str(original)
            metadata["source_nwb_sha256"] = digest(original)
        assets = []
        for filename, role in [("spike_times.npy", "spike_times"), ("spike_clusters.npy", "spike_clusters"),
                               ("params.py", "params"), ("cluster_group.tsv", "unit_metadata"),
                               ("channel_positions.npy", "channel_positions"), ("channel_probe_groups.npy", "channel_probe_groups")]:
            path = folder / filename
            assets.append((path, role, digest(path), "application/octet-stream"))
        if video:
            video = video.resolve()
            if not video.is_relative_to(root) or not clock_path:
                raise ValueError("Video must be under data root and have an explicit verified clock file")
            clock = json.loads(clock_path.read_text(encoding="utf-8"))
            if clock["video"]["sha256"] != digest(video) or clock["session_id"] != session:
                raise ValueError("Video clock belongs to different media or session")
        initialize_database(database)
        with closing(sqlite3.connect(database)) as connection, connection:
            connection.execute("PRAGMA foreign_keys = ON")
            dataset_id = "allen-vbn-public"
            if not connection.execute("SELECT 1 FROM datasets WHERE dataset_id=?", (dataset_id,)).fetchone():
                insert(connection, "datasets", dataset_id=dataset_id, dataset_name="Allen Visual Behavior Neuropixels",
                       source_data_origin="Allen Institute public VBN", import_status="ready_with_warnings",
                       description="Matched neural/video development corpus. Head-fixed task data; no ethogram ground truth.",
                       storage_policy="register_in_place", schema_version=SCHEMA_VERSION, created_at_utc=now, updated_at_utc=now)
            recording_index = connection.execute("SELECT COALESCE(MAX(recording_index),0)+1 FROM recordings").fetchone()[0]
            insert(connection, "recordings", recording_id=recording_id, dataset_id=dataset_id, recording_index=recording_index,
                   legacy_kilosort_folder=f"Allen {session} / {probe_name} ({probe_id})", source_data_origin="Allen Institute public VBN",
                   source_processing_stage="Original NWB unit spikes adapted without reclassification", student_modified_source_data=0,
                   source_acquisition_id=session, sample_rate_hz=rate, recording_duration_s=duration, spike_count=total,
                   cluster_count=len(selected), good_unit_count=quality.count("good"),
                   subject_id=text(source["general/subject/subject_id"][()]), experimental_condition=text(source["session_description"][()]),
                   event_data_status="Original NWB task events; analysis exports stored beside source", independence_status="Shared mouse/session across physical probes")
            insertion_id = f"{recording_id}:insertion"
            insert(connection, "probe_insertions", probe_insertion_id=insertion_id, recording_id=recording_id, probe_name=f"{probe_name} / Allen {probe_id}",
                   probe_model="Neuropixels 1.0", shank_count=1, coordinate_system="Allen probe-local micrometres",
                   trajectory_status="probe_geometry_only", metadata_json=json.dumps({"source_group_id": 0, "allen_probe_id": probe_id}))
            for j in np.flatnonzero(e["probe_id"] == probe_id):
                insert(connection, "channels", channel_id=f"{recording_id}:channel:{int(e['id'][j])}", probe_insertion_id=insertion_id,
                       recording_channel=int(e["probe_channel_number"][j]), electrode_index=int(e["probe_channel_number"][j]),
                       shank_id=0, x_um=float(e["probe_horizontal_position"][j]), y_um=float(e["probe_vertical_position"][j]))
            for index, count, label in zip(selected, counts, quality):
                j = peaks[index]
                region = text(e["location"][j])
                mapped = region not in {"", "nan", "None", "root", "void"}
                region_id = f"allen-ccfv3:{region}" if mapped else None
                if mapped and not connection.execute("SELECT 1 FROM brain_regions WHERE brain_region_id=?", (region_id,)).fetchone():
                    insert(connection, "brain_regions", brain_region_id=region_id, atlas_name="Allen CCF", atlas_version="v3",
                           acronym=region, display_name=region, annotation_status="atlas_registered")
                unit_id = f"{recording_id}:unit:{int(ids[index])}"
                insert(connection, "units", unit_id=unit_id, recording_id=recording_id, cluster_id=int(ids[index]), spike_count=int(count),
                       recording_duration_s=duration, unit_firing_rate_hz=float(units["firing_rate"][index]), kilosort_label=label,
                       is_good_unit=int(label == "good"), is_neural_brain_region=int(mapped))
                insert(connection, "unit_locations", unit_id=unit_id, probe_insertion_id=insertion_id,
                       peak_channel_id=f"{recording_id}:channel:{int(e['id'][j])}", brain_region_id=region_id,
                       probe_depth_um=float(e["probe_vertical_position"][j]), x_um=float(e["probe_horizontal_position"][j]),
                       y_um=float(e["probe_vertical_position"][j]), shank_id=0, location_source=f"Original NWB peak channel {int(e['id'][j])}; Allen label {region}",
                       atlas_registration_status="atlas_registered" if mapped else "unmapped")
            def asset(path, role, checksum, media_type, original=False):
                relative = path.relative_to(root).as_posix()
                insert(connection, "data_assets", dataset_id=dataset_id, recording_id=recording_id, asset_role=role, media_type=media_type,
                       storage_backend="project_file", storage_uri=f"project://{relative}", relative_path=relative,
                       filename=path.name, extension=path.suffix, byte_size=path.stat().st_size, checksum_algorithm="sha256", checksum=checksum,
                       checksum_status="verified", availability_status="available", source_data_origin="Allen Institute public VBN",
                       processing_stage="original Allen source" if original else "derived Explorer input; original source preserved",
                       is_original=int(original), metadata_json=json.dumps(metadata))
                return connection.execute("SELECT last_insert_rowid()").fetchone()[0]
            for args in assets:
                asset(*args)
            if video:
                existing = connection.execute("SELECT asset_id FROM data_assets WHERE dataset_id=? AND storage_uri=?",
                                              (dataset_id, f"project://{video.relative_to(root).as_posix()}" )).fetchone()
                video_asset = existing[0] if existing else asset(video, "video", clock["video"]["sha256"], "video/mp4",
                    original=not clock["timeMapping"]["provenance"].get("prefix_remux", False))
                video_id = f"{recording_id}:side"
                insert(connection, "video_streams", video_stream_id=video_id, dataset_id=dataset_id, recording_id=recording_id,
                       source_asset_id=video_asset, video_name=video.name, camera_id="side",
                       duration_s=clock["video"]["duration_s"], frame_rate_hz=clock["video"]["fps"], frame_count=clock["video"]["frame_count"],
                       width_px=clock["video"]["width"], height_px=clock["video"]["height"], codec="h264",
                       timestamp_source="Allen exposure-start TTLs in NWB session clock", availability_status="available")
                signal_id = f"{recording_id}:nwb-clock"
                insert(connection, "signal_streams", signal_stream_id=signal_id, recording_id=recording_id,
                       stream_name="NWB session clock; raw voltage not downloaded", stream_kind="other", sample_rate_hz=rate,
                       duration_s=duration, availability_status="declared_not_present", metadata_json=json.dumps({"purpose": "time reference only; no raw voltage provider"}))
                mapping = clock["timeMapping"]
                insert(connection, "time_mappings", time_mapping_id=f"{recording_id}:side-clock", dataset_id=dataset_id,
                       source_type="video_stream", source_id=video_id, target_type="signal_stream", target_id=signal_id,
                       mapping_method="frame_timestamps", offset_s=mapping["offset_s"], scale=mapping["scale"],
                       matched_event_count=mapping["matched_event_count"], residual_rms_ms=mapping["residual_rms_ms"],
                       verification_status="verified", provenance_json=json.dumps(mapping["provenance"]))
            insert(connection, "ingest_runs", ingest_run_id=f"{recording_id}:import", dataset_id=dataset_id, started_at_utc=now,
                   completed_at_utc=now, status="completed_with_warnings", importer_version="allen-probe-adapter/1",
                   source_root_uri=f"Allen VBN session {session}", recording_count=1, unit_count=len(selected), asset_count=len(assets) + int(bool(video)),
                   warning_count=1)
            validate_schema(connection)
        manifest_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--nwb", type=Path, required=True)
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--probe", default="probeC")
    parser.add_argument("--video", type=Path)
    parser.add_argument("--video-clock", type=Path)
    args = parser.parse_args()
    print(json.dumps(import_probe(args.nwb, args.data_root, args.database, args.probe, args.video, args.video_clock), indent=2))


if __name__ == "__main__":
    main()
