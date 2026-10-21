"""Local, user-selected sources and lightweight persistent recording projects.

Only the native picker creates file grants. HTTP clients use opaque IDs, never
arbitrary filesystem paths. Kilosort/video stay in place; NWB adaptation creates
derived arrays. Existing catalog and annotation identities are retained.
SPDX-License-Identifier: MIT
"""
from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
import threading
import uuid
from datetime import datetime, timezone

import numpy as np

from .ingest import EXACT_ROLES, UNIT_METADATA_NAMES, VIDEO_EXTENSIONS, media_type
from .migrations import SCHEMA_VERSION
from . import project_files
from .project_checks import inspect_files


def native_pick(kind):
    options = {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}
    result = subprocess.run([sys.executable, "-m", "neuropixels_explorer.local_picker", kind],
                            capture_output=True, text=True, encoding="utf-8", check=True, **options)
    value = json.loads(result.stdout)["path"]
    return Path(value).resolve() if value else None


def insert(connection, table, **values):
    connection.execute(f"INSERT INTO {table} ({','.join(values)}) VALUES ({','.join('?' for _ in values)})", tuple(values.values()))


class LocalProjects:
    def __init__(self, service, picker=None):
        self.service, self.paths = service, service.paths
        self.picker = picker or native_pick
        self.file = self.paths.data_root / ".explorer-local.json"
        self.lock = threading.RLock()
        self.operation_lock = threading.Lock()
        self.jobs, self.candidates = {}, {}
        self.state = json.loads(self.file.read_text(encoding="utf-8")) if self.file.exists() else {"assets": {}, "projects": []}

    def save(self):
        temporary = self.file.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(self.state, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(self.file)

    def grant(self, path):
        path = Path(path).resolve(strict=True)
        stat = path.stat()
        token = hashlib.sha256(json.dumps([str(path), stat.st_size, stat.st_mtime_ns]).encode("utf-8")).hexdigest()[:32]
        with self.lock:
            self.state["assets"][token] = {"path": str(path), "size": stat.st_size, "mtime_ns": stat.st_mtime_ns}
            self.save()
        return token

    def recent(self):
        with self.lock:
            return json.loads(json.dumps({"projects": [{k: v for k, v in p.items() if k != "annotations"} for p in reversed(self.state["projects"])]}))

    @staticmethod
    def now():
        return datetime.now(timezone.utc).isoformat()

    def get_project(self, project_id):
        return next(p for p in self.state["projects"] if p["id"] == project_id)

    @staticmethod
    def validate_annotations(docs, recording_id):
        if not isinstance(docs, dict) or len(docs) > 100:
            raise ValueError("Invalid project annotation collection")
        for key, doc in docs.items():
            context = doc.get("context", {})
            if doc.get("schema") != "neuropixels-annotations/1" or context.get("key") != key or context.get("recordingKey") != recording_id:
                raise ValueError("Annotations belong to a different recording")
            if not isinstance(doc.get("segments"), list) or len(doc["segments"]) > 100000:
                raise ValueError("Invalid annotation segments")

    def annotation(self, payload):
        with self.lock:
            project = self.get_project(payload["projectId"])
            docs = project.setdefault("annotations", {})
            key = payload["key"]
            if "document" in payload:
                self.validate_annotations({key: payload["document"]}, project["recordingIds"][0])
                docs[key] = payload["document"]
                project.update(dirty=True, updatedAt=self.now())
                self.save()
            return {"document": docs.get(key)}

    def checks(self, recording_id, project_id=None):
        paths, issues = {}, {}
        with self.service.connect() as db:
            recording = dict(db.execute("SELECT * FROM recordings WHERE recording_id=?", (recording_id,)).fetchone())
            for row in db.execute("SELECT * FROM data_assets WHERE recording_id=? AND availability_status='available'", (recording_id,)):
                try:
                    path = self.paths.resolve_asset(row["relative_path"])
                    if not path.is_file():
                        raise FileNotFoundError(path.name)
                    paths[row["asset_role"]] = path
                except (OSError, ValueError, KeyError) as error:
                    issues[row["asset_role"]] = str(error)
            locations = db.execute("SELECT COUNT(*) FROM unit_locations WHERE unit_id IN (SELECT unit_id FROM units WHERE recording_id=?) AND probe_depth_um IS NOT NULL", (recording_id,)).fetchone()[0]
            anatomy = db.execute("SELECT COUNT(*) FROM unit_locations WHERE unit_id IN (SELECT unit_id FROM units WHERE recording_id=?) AND brain_region_id IS NOT NULL", (recording_id,)).fetchone()[0]
        project = self.get_project(project_id) if project_id else self.project_for(recording_id)
        video = project.get("videos", {}).get(recording_id)
        if video and video.get("clockIssue"):
            issues["frame_clock"] = video["clockIssue"]
        if video:
            try:
                self.paths.resolve_asset("@local/" + video["video_stream_id"])
            except (OSError, ValueError, KeyError) as error:
                issues["video"] = str(error)
                video = None
        return {"checks": inspect_files(paths, recording["sample_rate_hz"], anatomy=anatomy, locations=locations,
                  allen=recording_id.startswith("allen-"), video=video, issues=issues),
                "matched": {role: path.name for role, path in paths.items()}, "issues": issues}

    def start(self, kind, payload):
        if kind not in {"folder", "nwb", "video", "clock", "import", "mapping", "open-project", "save-project"}:
            raise ValueError("Unknown local action")
        job_id = uuid.uuid4().hex
        job = {"id": job_id, "status": "working", "phase": "selecting" if kind not in {"import", "mapping"} else "importing"}
        with self.lock:
            self.jobs[job_id] = job
            # Keep completed job metadata bounded; projects persist separately.
            for key in list(self.jobs)[:-32]:
                if self.jobs[key]["status"] != "working":
                    self.jobs.pop(key)

        def run():
            if not self.operation_lock.acquire(blocking=False):
                job.update(status="error", message="Another selection or import is still open. Finish it first.")
                return
            try:
                if kind == "import":
                    result = self.import_candidate(payload["candidateId"], payload.get("sampleRate"), payload.get("projectName"), payload.get("mode"))
                elif kind == "mapping":
                    result = self.update_mapping(payload)
                elif kind == "save-project":
                    with self.lock:
                        project = self.get_project(payload["projectId"])
                    path = self.picker(kind) if payload.get("saveAs") or not project.get("file") else Path(project["file"])
                    if path is None:
                        job.update(status="cancelled")
                        return
                    with self.lock:
                        result = project_files.write(self, project, path)
                else:
                    path = self.picker(kind)
                    if path is None:
                        job.update(status="cancelled")
                        return
                    job["phase"] = "reading"
                    result = self.select_path(kind, path, payload)
                job.update(status="ready", result=result)
            except Exception as error:
                job.update(status="error", message=str(error))
            finally:
                self.operation_lock.release()
        threading.Thread(target=run, daemon=True).start()
        return dict(job)

    def job(self, job_id):
        with self.lock:
            return json.loads(json.dumps(self.jobs[job_id]))

    def select_path(self, kind, path, payload=None):
        """Internal picker seam; deliberately not exposed as an HTTP path API."""
        payload = payload or {}
        path = Path(path).resolve(strict=True)
        if kind == "open-project":
            return project_files.read(self, path)
        if kind == "video":
            return self.attach_video(payload["recordingId"], path, payload.get("projectId"))
        if kind == "clock":
            if path.stat().st_size > 50_000_000:
                raise ValueError("Time-mapping file exceeds 50 MB")
            value = json.loads(path.read_text(encoding="utf-8"))
            return self.update_mapping({**payload, "clock": value})
        found = []
        if kind == "nwb":
            found = self.describe_nwb(path)
        else:
            # Bounded discovery: a recording folder or a small session tree.
            for directory, dirs, names in os.walk(path, followlinks=False):
                relative = Path(directory).relative_to(path)
                dirs[:] = [d for d in dirs if not d.startswith(".") and len(relative.parts) < 3]
                if "spike_times.npy" in names and "spike_clusters.npy" in names:
                    folder = Path(directory)
                    rate = self.sample_rate(folder)
                    found.append({"kind": "kilosort", "path": str(folder), "name": folder.name, "sampleRate": rate})
                    dirs[:] = []
                else:
                    for name in names:
                        if name.lower().endswith(".nwb"):
                            found.extend(self.describe_nwb(Path(directory) / name))
                if len(found) >= 64:
                    break
        if not found:
            raise ValueError("No processed recording found. Choose a Kilosort folder containing spike_times.npy and spike_clusters.npy, or an Allen NWB file.")
        result = []
        for candidate in found:
            key = uuid.uuid4().hex
            self.candidates[key] = candidate
            result.append({k: v for k, v in candidate.items() if k != "path"} | {"candidateId": key})
        return {"sourceName": path.name, "candidates": result}

    @staticmethod
    def sample_rate(folder):
        params = folder / "params.py"
        match = re.search(r"^\s*sample_rate\s*=\s*([\d.eE+-]+)", params.read_text(encoding="utf-8", errors="replace"), re.M) if params.exists() else None
        rate = float(match[1]) if match else None
        return rate if rate and math.isfinite(rate) and rate > 0 else None

    @staticmethod
    def describe_nwb(path):
        import h5py
        try:
            with h5py.File(path, "r") as source:
                raw = source["identifier"][()]
                session = raw.decode() if isinstance(raw, bytes) else str(raw)
                units, electrodes = source["units"], source["general/extracellular_ephys/electrodes"]
                lookup = dict(zip(electrodes["id"][:].tolist(), electrodes["probe_id"][:].tolist()))
                counts = {}
                for channel in units["peak_channel_id"][:]:
                    probe = lookup[int(channel)]
                    counts[probe] = counts.get(probe, 0) + 1
                result = []
                for name, device in source["general/devices"].items():
                    probe = device.attrs.get("probe_id")
                    if probe in counts and "sampling_rate" in device.attrs:
                        result.append({"kind": "nwb", "path": str(path), "probe": name,
                                       "name": f"Allen {session} · {name}", "units": counts[probe],
                                       "recordingId": f"allen-{session}-{name}"})
                if not result or not session.isdigit():
                    raise ValueError("No Allen physical probes with processed units")
                return result
        except (KeyError, OSError, ValueError) as error:
            raise ValueError("This file is not a supported Allen ecephys NWB with units, peak channels and probe metadata: " + str(error)) from error

    def import_candidate(self, candidate_id, sample_rate=None, project_name=None, mode=None):
        candidate = self.candidates[candidate_id]
        source = Path(candidate["path"])
        if candidate["kind"] == "nwb":
            recording_id = candidate["recordingId"]
            with self.service.connect() as connection:
                exists = connection.execute("SELECT 1 FROM recordings WHERE recording_id=?", (recording_id,)).fetchone()
            if not exists:
                module_path = self.paths.static_root / "scripts" / "import_allen_probe.py"
                spec = importlib.util.spec_from_file_location("explorer_allen_adapter", module_path)
                adapter = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(adapter)
                adapter.import_probe(source, self.paths.data_root, self.paths.database_path, candidate["probe"],
                                     output_subdir=".explorer-imports")
            else:
                with self.service.connect() as connection:
                    asset = connection.execute("SELECT metadata_json FROM data_assets WHERE recording_id=? AND asset_role='spike_times'", (recording_id,)).fetchone()
                expected = json.loads(asset[0]).get("source_nwb_sha256") if asset else None
                if not expected:
                    raise ValueError("An existing recording uses this Allen identity but its source checksum is unavailable. Open it from Recent instead.")
                digest = hashlib.sha256()
                with source.open("rb") as stream:
                    for block in iter(lambda: stream.read(4 * 1024 * 1024), b""):
                        digest.update(block)
                if digest.hexdigest() != expected:
                    raise ValueError("The selected NWB differs from the source of this existing Allen recording. Its saved data have not been replaced.")
        else:
            rate = candidate.get("sampleRate") or float(sample_rate or 0)
            if not math.isfinite(rate) or rate <= 0:
                raise ValueError("Sampling rate is missing in params.py. Enter the recording's original rate in Hz.")
            recording_id = self.import_kilosort(source, rate)
        self.service.invalidate_recordings([recording_id])
        with self.lock:
            project = None if project_name else next((p for p in self.state["projects"] if recording_id in p["recordingIds"]), None)
            if not project:
                project = {"id": uuid.uuid4().hex, "name": str(project_name or candidate["name"]).strip()[:200], "source": str(source),
                           "recordingIds": [recording_id], "videos": {}, "annotations": {}, "mode": mode or "neural", "dirty": True}
                self.state["projects"].append(project)
                self.save()
        # A nearby video is suggested, never silently equated with a neural clock.
        folders = [source if source.is_dir() else source.parent]
        folders += [folder / "behavior_videos" for folder in list(folders)]
        videos = [p for folder in folders if folder.is_dir() for p in folder.iterdir() if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS]
        choices = [{"token": self.grant(v), "name": v.name} for v in videos[:20]]
        return {"project": project, "recordingId": recording_id, "nearbyVideos": choices, **self.checks(recording_id, project["id"])}

    def import_kilosort(self, folder, rate):
        times_path, clusters_path = folder / "spike_times.npy", folder / "spike_clusters.npy"
        times = np.load(times_path, mmap_mode="r", allow_pickle=False).reshape(-1)
        clusters = np.load(clusters_path, mmap_mode="r", allow_pickle=False).reshape(-1)
        if times.size != clusters.size or not times.size or times.dtype.kind not in "fiu" or clusters.dtype.kind not in "iu":
            raise ValueError("Spike times and cluster IDs must be numeric, non-empty arrays with equal lengths")
        if not np.isfinite(times).all() or np.any(times < 0) or np.any(times[1:] < times[:-1]):
            raise ValueError("Spike times must be finite, nonnegative and sorted")
        signature = [(str(p), p.stat().st_size, p.stat().st_mtime_ns) for p in (times_path, clusters_path)]
        # Reuse an indexed local recording, including its Unit anatomy metadata.
        with self.service.connect() as connection:
            for row in connection.execute("SELECT a.recording_id, a.relative_path FROM data_assets a JOIN recordings r USING(recording_id) WHERE a.asset_role='spike_times' AND r.sample_rate_hz=?", (rate,)):
                try:
                    if self.paths.resolve_asset(row["relative_path"]) == times_path.resolve():
                        other = connection.execute("SELECT relative_path FROM data_assets WHERE recording_id=? AND asset_role='spike_clusters'", (row["recording_id"],)).fetchone()
                        if other and self.paths.resolve_asset(other[0]) == clusters_path.resolve():
                            return row["recording_id"]
                except (OSError, ValueError, KeyError):
                    continue
        recording_id = "local-" + hashlib.sha256(json.dumps([signature, rate]).encode()).hexdigest()[:24]
        with self.service.connect() as connection:
            if connection.execute("SELECT 1 FROM recordings WHERE recording_id=?", (recording_id,)).fetchone():
                return recording_id
        ids, counts = np.unique(clusters, return_counts=True)
        duration = float(times[-1]) / rate
        labels = {}
        for name in ("cluster_KSLabel.tsv", "cluster_group.tsv", "cluster_info.tsv"):
            if (folder / name).is_file():
                with (folder / name).open(encoding="utf-8-sig", newline="") as stream:
                    for row in csv.DictReader(stream, delimiter="\t"):
                        cluster = row.get("cluster_id", row.get("id"))
                        if cluster is not None:
                            labels[int(cluster)] = row.get("group") or row.get("KSLabel") or "unknown"
        assets = []
        for path in folder.iterdir():
            name = path.name.lower()
            role = EXACT_ROLES.get(name)
            if name == "channel_probe_groups.npy":
                role = "channel_probe_groups"
            if name in UNIT_METADATA_NAMES:
                role = "unit_metadata"
            if path.is_file() and role and role != "raw_voltage":
                assets.append((path, role, self.grant(path)))
        now = datetime.now(timezone.utc).isoformat()
        dataset = "local-processed"
        with sqlite3.connect(self.paths.database_path) as connection:
            connection.execute("PRAGMA foreign_keys=ON")
            if not connection.execute("SELECT 1 FROM datasets WHERE dataset_id=?", (dataset,)).fetchone():
                insert(connection, "datasets", dataset_id=dataset, dataset_name="Local recordings", source_data_origin="User-selected processed recordings",
                       import_status="ready", storage_policy="register_in_place", schema_version=SCHEMA_VERSION, created_at_utc=now, updated_at_utc=now)
            index = connection.execute("SELECT COALESCE(MAX(recording_index),0)+1 FROM recordings").fetchone()[0]
            insert(connection, "recordings", recording_id=recording_id, dataset_id=dataset, recording_index=index,
                   legacy_kilosort_folder=f"{folder.name} · {recording_id[-6:]}", source_data_origin="User-selected Kilosort",
                   source_processing_stage="Processed unit spikes; unchanged", student_modified_source_data=0,
                   sample_rate_hz=rate, recording_duration_s=duration, spike_count=int(times.size), cluster_count=int(ids.size),
                   good_unit_count=sum(labels.get(int(i)) == "good" for i in ids), independence_status="Not specified")
            for cluster, count in zip(ids, counts):
                label = labels.get(int(cluster), "unknown")
                insert(connection, "units", unit_id=f"{recording_id}:unit:{int(cluster)}", recording_id=recording_id, cluster_id=int(cluster),
                       spike_count=int(count), recording_duration_s=duration, unit_firing_rate_hz=float(count / duration) if duration else 0.,
                       kilosort_label=label, is_good_unit=int(label == "good"), is_neural_brain_region=0)
            for path, role, token in assets:
                insert(connection, "data_assets", dataset_id=dataset, recording_id=recording_id, asset_role=role, media_type=media_type(path.name),
                       storage_backend="local_file", storage_uri=f"selected://{token}/{recording_id}", relative_path=f"@local/{token}",
                       filename=path.name, extension=path.suffix, byte_size=path.stat().st_size, checksum_status="not_computed",
                       availability_status="available", source_data_origin="User-selected Kilosort", processing_stage="Original processed output", is_original=1)
        return recording_id

    def project_for(self, recording_id):
        with self.service.connect() as connection:
            recording = connection.execute("SELECT legacy_kilosort_folder FROM recordings WHERE recording_id=?", (recording_id,)).fetchone()
        if recording is None:
            raise ValueError("Open a neural recording before attaching video")
        project = next((p for p in self.state["projects"] if recording_id in p["recordingIds"]), None)
        if project is None:
            project = {"id": uuid.uuid4().hex, "name": recording[0], "recordingIds": [recording_id], "videos": {}}
            self.state["projects"].append(project)
        return project

    def adopt(self, recording_id):
        with self.lock:
            project = self.project_for(recording_id)
            if recording_id not in project["videos"]:
                descriptor = next((v for v in self.service.videos()["videos"] if v["recording_id"] == recording_id), None)
                if descriptor and descriptor.get("mediaUrl"):
                    path, _ = self.service.video_media(descriptor["video_stream_id"])
                    attached = self.attach_video(recording_id, path, project["id"])["video"]
                    attached["timeMapping"] = descriptor.get("timeMapping")
            project.setdefault("annotations", {})
            project.setdefault("dirty", True)
            self.save()
        return {"project": project}

    def attach_video(self, recording_id, path, project_id=None):
        if path.suffix.lower() not in VIDEO_EXTENSIONS:
            raise ValueError("Choose a behavior video file")
        token = self.grant(path)
        descriptor = {"video_stream_id": token, "recording_id": recording_id, "video_name": path.name,
                      "byte_size": path.stat().st_size, "media_url": f"/api/local/media/{token}",
                      "timeMapping": {"mapping_method": "manual_offset", "offset_s": 0, "scale": 1, "verification_status": "unverified"}}
        try:
            import av
            with av.open(str(path)) as media:
                stream = media.streams.video[0]
                descriptor["frame_rate_hz"] = float(stream.average_rate) if stream.average_rate else None
                descriptor["duration_s"] = float(stream.duration * stream.time_base) if stream.duration else None
        except (ImportError, OSError, ValueError, IndexError):
            pass  # Browser decoding still works; no clock verification is implied.
        with self.lock:
            project = self.get_project(project_id) if project_id else self.project_for(recording_id)
            if recording_id not in project["recordingIds"]:
                raise ValueError("Video must belong to the project's recording")
            project["videos"][recording_id] = descriptor
            project.update(mode="combined", dirty=True)
            self.save()
        # Our Allen clock exports use <video-stem>.clock.json beside the media.
        clock_path = path.with_suffix(".clock.json")
        if clock_path.is_file() and clock_path.stat().st_size <= 50_000_000:
            try:
                self.update_mapping({"projectId": project["id"], "recordingId": recording_id,
                                     "clock": json.loads(clock_path.read_text(encoding="utf-8"))})
            except (ValueError, KeyError, TypeError) as error:
                with self.lock:
                    descriptor["clockIssue"] = str(error)
                    self.save()
        return {"project": project, "video": descriptor}

    def attach_granted(self, recording_id, token, project_id=None):
        return self.attach_video(recording_id, self.paths.resolve_asset(f"@local/{token}"), project_id)

    def update_mapping(self, payload):
        with self.lock:
            project = self.get_project(payload["projectId"]) if payload.get("projectId") else self.project_for(payload["recordingId"])
            video = project["videos"].get(payload["recordingId"])
            if not video:
                raise ValueError("Attach a video before setting its alignment")
            if "clock" in payload:
                clock = payload["clock"]
                identity = clock.get("video", {})
                if not identity.get("sha256"):
                    raise ValueError("A verified clock must include the source video's SHA-256 identity")
                path = self.paths.resolve_asset("@local/" + video["video_stream_id"])
                digest = hashlib.sha256()
                with path.open("rb") as stream:
                    for block in iter(lambda: stream.read(4 * 1024 * 1024), b""):
                        digest.update(block)
                if digest.hexdigest() != identity["sha256"]:
                    raise ValueError("This clock belongs to a different video")
                mapping = clock["timeMapping"]
                # Clock data are validated again by TimeMapping in the browser.
                if (mapping.get("method") or mapping.get("mapping_method")) != "frame_timestamps" or not mapping.get("provenance"):
                    raise ValueError("Expected a frame-timestamp mapping with provenance")
                anchors = mapping["provenance"].get("frame_clock", {})
                video_times, neural_times = anchors.get("video_s", []), anchors.get("neural_s", [])
                if len(video_times) < 2 or len(video_times) != len(neural_times):
                    raise ValueError("The clock needs paired video and neural frame timestamps")
                for values in (video_times, neural_times):
                    if any(not isinstance(v, (int, float)) or isinstance(v, bool) for v in values):
                        raise ValueError("Frame clock timestamps must be numbers")
                    numbers = np.asarray(values, dtype=float)
                    if not np.isfinite(numbers).all() or np.any(np.diff(numbers) <= 0):
                        raise ValueError("Frame clock timestamps must be finite and strictly increasing")
                if mapping.get("verification_status") != "verified":
                    raise ValueError("This clock has not been verified")
                if not math.isfinite(float(mapping.get("offset_s", 0))) or not math.isfinite(float(mapping.get("scale", 1))) or float(mapping.get("scale", 1)) <= 0:
                    raise ValueError("Invalid frame clock offset or scale")
                session = clock.get("session_id")
                if session and not payload["recordingId"].startswith(f"allen-{session}-"):
                    raise ValueError("The frame clock belongs to a different Allen session")
                video["frame_rate_hz"] = identity.get("fps")
            else:
                offset = float(payload["offset"])
                if not math.isfinite(offset):
                    raise ValueError("Alignment must be a finite time offset")
                mapping = {"mapping_method": "manual_offset", "offset_s": offset, "scale": 1, "verification_status": "unverified", "matched_event_count": 1}
                previous = video.get("timeMapping", {})
                anchors = (previous.get("provenance") or {}).get("frame_clock")
                if anchors:
                    shift = offset - float(previous.get("offset_s", 0))
                    if "videoAt" in payload and "neuralAt" in payload:
                        at, neural = float(payload["videoAt"]), float(payload["neuralAt"])
                        if not math.isfinite(at) or not math.isfinite(neural) or not anchors["video_s"][0] <= at <= anchors["video_s"][-1]:
                            raise ValueError("Choose an event inside the available frame clock")
                        shift = neural - float(np.interp(at, anchors["video_s"], anchors["neural_s"]))
                    mapping = json.loads(json.dumps(previous))
                    mapping.update(method="manual_offset", mapping_method="manual_offset", verification_status="unverified",
                                   offset_s=float(previous.get("offset_s", 0)) + shift, matched_event_count=1, residual_rms_ms=None)
                    mapping["provenance"]["frame_clock"]["neural_s"] = [value + shift for value in anchors["neural_s"]]
            video["timeMapping"] = json.loads(json.dumps(mapping))
            video.pop("clockIssue", None)
            project["dirty"] = True
            self.save()
            return {"project": project, "video": video}
