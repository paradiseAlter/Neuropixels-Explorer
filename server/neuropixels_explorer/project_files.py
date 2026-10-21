"""Explorer project documents: catalog metadata, linked files and annotation drafts."""
from __future__ import annotations

import copy
import hashlib
import json
import sqlite3
from pathlib import Path
import uuid

SCHEMA = "neuropixels-explorer-project/1"
TABLES = ("datasets", "brain_regions", "recordings", "units", "data_assets",
          "probe_insertions", "channels", "unit_locations", "probe_atlas_sites")


def snapshot(local, project):
    rid = project["recordingIds"][0]
    with local.service.connect() as db:
        rows = lambda sql: [dict(r) for r in db.execute(sql, (rid,))]
        result = {
            "datasets": rows("SELECT * FROM datasets WHERE dataset_id IN (SELECT dataset_id FROM recordings WHERE recording_id=?)"),
            "recordings": rows("SELECT * FROM recordings WHERE recording_id=?"),
            "units": rows("SELECT * FROM units WHERE recording_id=?"),
            "data_assets": rows("SELECT * FROM data_assets WHERE recording_id=?"),
            "probe_insertions": rows("SELECT * FROM probe_insertions WHERE recording_id=?"),
            "channels": rows("SELECT * FROM channels WHERE probe_insertion_id IN (SELECT probe_insertion_id FROM probe_insertions WHERE recording_id=?)"),
            "unit_locations": rows("SELECT * FROM unit_locations WHERE unit_id IN (SELECT unit_id FROM units WHERE recording_id=?)"),
            "probe_atlas_sites": rows("SELECT * FROM probe_atlas_sites WHERE dataset_id IN (SELECT dataset_id FROM recordings WHERE recording_id=?)"),
            "brain_regions": [dict(r) for r in db.execute("SELECT * FROM brain_regions")],
        }
    return result


def linked_file(local, relative):
    if relative.startswith("@local/"):
        return copy.deepcopy(local.state["assets"][relative[7:]])
    path = local.paths.resolve_asset(relative)
    stat = path.stat()
    return {"path": str(path), "size": stat.st_size, "mtime_ns": stat.st_mtime_ns}


def document(local, project):
    catalog = snapshot(local, project)
    files = {}
    for asset in catalog["data_assets"]:
        relative = asset.get("relative_path")
        if relative and asset["availability_status"] == "available":
            try:
                files[str(asset["asset_id"])] = linked_file(local, relative)
            except OSError:
                # Keep missing links visible after reopening.
                files[str(asset["asset_id"])] = {"path": str(local.paths.resolve_asset(relative)), "size": asset["byte_size"], "mtime_ns": None}
    videos = {}
    for rid, video in project.get("videos", {}).items():
        videos[rid] = {"descriptor": video, "file": linked_file(local, "@local/" + video["video_stream_id"])}
    return {"schema": SCHEMA, "project": {k: copy.deepcopy(v) for k, v in project.items()
            if k not in {"file", "videos", "catalog", "assets"}}, "catalog": catalog, "files": files, "videos": videos}


def write(local, project, path):
    path = Path(path)
    if not path.name.endswith(".neuroproject.json"):
        raise ValueError("Save the project with the .neuroproject.json extension")
    value = document(local, project)
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    project["file"] = str(path.resolve())
    project["savedAt"] = local.now()
    project["dirty"] = False
    local.save()
    return {"project": project, "saved": True}


def read(local, path):
    path = Path(path)
    if path.stat().st_size > 64 * 1024 * 1024:
        raise ValueError("Project file exceeds 64 MB")
    value = json.loads(path.read_text(encoding="utf-8"))
    if value.get("schema") != SCHEMA:
        raise ValueError("Choose an Explorer .neuroproject.json project file")
    project = copy.deepcopy(value["project"])
    rid, = project["recordingIds"]
    if not isinstance(project.get("id"), str) or not isinstance(project.get("name"), str):
        raise ValueError("Project identity is missing")
    catalog = value["catalog"]
    if len(catalog["recordings"]) != 1 or catalog["recordings"][0]["recording_id"] != rid:
        raise ValueError("Project recording metadata does not match")
    local.validate_annotations(project.get("annotations", {}), rid)
    grants = {}
    def register(ref):
        source = Path(ref["path"])
        if not source.is_absolute():
            source = (path.parent / source).resolve()
        ref = {"path": str(source), "size": ref["size"], "mtime_ns": ref["mtime_ns"]}
        token = hashlib.sha256(json.dumps([ref["path"], ref["size"], ref["mtime_ns"]]).encode()).hexdigest()[:32]
        grants[token] = ref
        return token
    asset_links = {}
    for asset in catalog["data_assets"]:
        if asset["recording_id"] != rid:
            raise ValueError("Unexpected recording in project assets")
        ref = value["files"].get(str(asset["asset_id"]))
        if ref:
            token = register(ref)
            asset_links[asset["asset_id"]] = token
            asset.update(relative_path=f"@local/{token}", storage_uri=f"selected://{token}/{rid}", storage_backend="local_file")
    project["videos"] = {}
    for recording, video in value.get("videos", {}).items():
        if recording != rid or Path(video["file"]["path"]).suffix.lower() not in {".mp4", ".webm", ".mov", ".avi", ".mkv"}:
            raise ValueError("Unexpected project video")
        token = register(video["file"])
        descriptor = video["descriptor"]
        descriptor.update(video_stream_id=token, recording_id=rid, media_url=f"/api/local/media/{token}")
        project["videos"][rid] = descriptor
    with sqlite3.connect(local.paths.database_path) as db:
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        if db.execute("SELECT 1 FROM recordings WHERE recording_id=?", (rid,)).fetchone():
            # Existing scientific metadata wins; check that this is the same source.
            existing = {r["asset_role"]: r for r in db.execute("SELECT * FROM data_assets WHERE recording_id=?", (rid,))}
            for asset in catalog["data_assets"]:
                if asset["asset_role"] in {"spike_times", "spike_clusters"}:
                    old = existing.get(asset["asset_role"])
                    if not old or linked_file(local, old["relative_path"]) != grants[asset_links[asset["asset_id"]]]:
                        raise ValueError("This recording ID is already linked to different files. Open the project in a separate catalog.")
        else:
            asset_ids = {}
            for table in TABLES:
                columns = {r[1] for r in db.execute(f"PRAGMA table_info({table})")}
                for original in catalog.get(table, []):
                    row = dict(original)
                    if not set(row) <= columns:
                        raise ValueError("Project metadata contains an unknown column")
                    if table in {"units", "probe_insertions"} and row["recording_id"] != rid:
                        raise ValueError("Unexpected recording metadata")
                    old_id = row.pop("asset_id", None) if table == "data_assets" else None
                    if "source_asset_id" in row:
                        row["source_asset_id"] = asset_ids.get(row["source_asset_id"])
                    if table == "recordings":
                        row["recording_index"] = db.execute("SELECT COALESCE(MAX(recording_index),0)+1 FROM recordings").fetchone()[0]
                    conflict = "OR IGNORE " if table in {"datasets", "brain_regions", "probe_atlas_sites"} else ""
                    cursor = db.execute(f"INSERT {conflict}INTO {table} ({','.join(row)}) VALUES ({','.join('?' for _ in row)})", tuple(row.values()))
                    if old_id is not None:
                        asset_ids[old_id] = cursor.lastrowid
    with local.lock:
        local.state["assets"].update(grants)
        project.update(file=str(path.resolve()), dirty=False)
        local.state["projects"] = [p for p in local.state["projects"] if p["id"] != project["id"]] + [project]
        local.save()
    local.service.invalidate_recordings([rid])
    return {"project": project, "recordingId": rid, "opened": True}
