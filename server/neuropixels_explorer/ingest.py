from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sqlite3
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any, BinaryIO, Callable

import numpy as np

from .paths import RuntimePaths


MAX_SESSION_FILES = 2048
COPY_CHUNK_BYTES = 8 * 1024 * 1024

EXACT_ROLES = {
    "spike_times.npy": "spike_times",
    "spike_clusters.npy": "spike_clusters",
    "amplitudes.npy": "spike_amplitudes",
    "spike_positions.npy": "spike_positions",
    "spike_templates.npy": "spike_templates",
    "templates.npy": "templates",
    "templates_ind.npy": "template_indices",
    "channel_positions.npy": "channel_positions",
    "channel_shanks.npy": "channel_probe_groups",
    "channel_map.npy": "channel_map",
    "channel_geometry.csv": "channel_geometry",
    "params.py": "kilosort_parameters",
    "continuous.dat": "raw_voltage",
}
UNIT_METADATA_NAMES = {
    "cluster_group.tsv",
    "cluster_kslabel.tsv",
    "cluster_info.tsv",
    "cluster_amplitude.tsv",
    "cluster_contampct.tsv",
}
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
SINGLETON_ROLES = {
    "spike_times",
    "spike_clusters",
    "spike_amplitudes",
    "spike_positions",
    "spike_templates",
    "templates",
    "template_indices",
    "channel_positions",
    "channel_probe_groups",
    "channel_map",
    "channel_geometry",
    "kilosort_parameters",
    "raw_voltage",
}
RECORDING_SPECIFIC_HASH_ROLES = {
    "spike_times",
    "spike_clusters",
    "spike_amplitudes",
    "spike_positions",
    "spike_templates",
    "templates",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def media_type(filename: str) -> str:
    return {
        ".npy": "application/x-npy",
        ".tsv": "text/tab-separated-values",
        ".csv": "text/csv",
        ".py": "text/x-python",
        ".dat": "application/octet-stream",
        ".mp4": "video/mp4",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
    }.get(Path(filename).suffix.lower(), "application/octet-stream")


def role_for_filename(filename: str) -> str | None:
    normalized = Path(filename).name.lower()
    if normalized in EXACT_ROLES:
        return EXACT_ROLES[normalized]
    if normalized in UNIT_METADATA_NAMES or (normalized.startswith("cluster_") and normalized.endswith(".tsv")):
        return "unit_metadata"
    if Path(normalized).suffix in VIDEO_EXTENSIONS:
        return "video"
    return None


def safe_relative_path(value: Any, filename: str) -> str:
    text = str(value or filename).replace("\\", "/").strip()
    if not text:
        text = filename
    path = PurePosixPath(text)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise IngestError("invalid_relative_path", f"Unsafe relative path: {text}")
    if re.match(r"^[A-Za-z]:", text):
        raise IngestError("absolute_path_rejected", "Machine-specific absolute paths are not accepted")
    return path.as_posix()


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(COPY_CHUNK_BYTES), b""):
            digest.update(chunk)
    return digest.hexdigest()


class IngestError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        status: int = 422,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.status = status
        self.details = details or []

    def payload(self) -> dict[str, Any]:
        return {
            "error": self.code,
            "message": str(self),
            "details": self.details,
        }


@dataclass
class IngestCandidate:
    client_index: int
    filename: str
    relative_path: str
    byte_size: int
    last_modified: int | None
    recording_id: str
    role: str
    media_type: str
    staged_path: Path | None = None
    checksum_sha256: str | None = None
    shape: tuple[int, ...] | None = None
    dtype: str | None = None

    def public(self) -> dict[str, Any]:
        return {
            "clientIndex": self.client_index,
            "filename": self.filename,
            "relativePath": self.relative_path,
            "byteSize": self.byte_size,
            "recordingId": self.recording_id,
            "role": self.role,
            "uploaded": self.staged_path is not None,
            "shape": list(self.shape) if self.shape is not None else None,
            "dtype": self.dtype,
        }


@dataclass
class IngestSession:
    session_id: str
    dataset_id: str
    source_kind: str
    created_at_utc: str
    staging_directory: Path
    candidates: list[IngestCandidate]
    ignored: list[dict[str, Any]] = field(default_factory=list)

    def public(self) -> dict[str, Any]:
        return {
            "sessionId": self.session_id,
            "datasetId": self.dataset_id,
            "sourceKind": self.source_kind,
            "createdAtUtc": self.created_at_utc,
            "files": [candidate.public() for candidate in self.candidates],
            "ignored": self.ignored,
        }


class IncrementalIngestManager:
    def __init__(
        self,
        paths: RuntimePaths,
        *,
        on_commit: Callable[[set[str]], None] | None = None,
        fault_injector: Callable[[str, int], None] | None = None,
    ) -> None:
        self.paths = paths
        self.on_commit = on_commit
        self.fault_injector = fault_injector
        self._sessions: dict[str, IngestSession] = {}
        self._lock = threading.RLock()
        self._commit_lock = threading.Lock()
        self._staging_root = self.paths.data_root / ".neuropixels-ingest" / "staging"
        self._managed_root = self.paths.data_root / "managed-assets"

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.paths.database_path, timeout=30)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _dataset_id(self, connection: sqlite3.Connection) -> str:
        rows = connection.execute("SELECT dataset_id FROM datasets ORDER BY dataset_id").fetchall()
        if len(rows) != 1:
            raise IngestError(
                "dataset_scope_ambiguous",
                f"Incremental ingest requires exactly one dataset; found {len(rows)}",
            )
        return str(rows[0][0])

    def _recordings(self, connection: sqlite3.Connection) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in connection.execute(
                """
                SELECT recording_id, recording_index, legacy_kilosort_folder, spike_count
                FROM recordings
                ORDER BY recording_index
                """
            )
        ]

    @staticmethod
    def _resolve_recording(
        relative_path: str,
        recordings: list[dict[str, Any]],
        expected_recording_id: str | None,
    ) -> str:
        parts = {part.casefold() for part in PurePosixPath(relative_path).parts[:-1]}
        exact = [
            row
            for row in recordings
            if str(row["recording_id"]).casefold() in parts
            or str(row["legacy_kilosort_folder"]).casefold() in parts
        ]
        detected: dict[str, Any] | None = exact[0] if len(exact) == 1 else None
        if detected is None:
            numbers = {
                int(match.group(1))
                for part in parts
                for match in [re.search(r"(?:^|[_-])(?:ks\d*[_-]?)?exp(?:eriment)?[_-]?(\d+)(?:$|[_-])", part)]
                if match
            }
            numbered = [row for row in recordings if int(row["recording_index"]) in numbers]
            if len(numbered) == 1:
                detected = numbered[0]

        if expected_recording_id:
            expected = next(
                (row for row in recordings if row["recording_id"] == expected_recording_id),
                None,
            )
            if expected is None:
                raise IngestError(
                    "unknown_recording",
                    f"The requested Recording is not in the catalog: {expected_recording_id}",
                )
            if detected is not None and detected["recording_id"] != expected_recording_id:
                raise IngestError(
                    "wrong_recording",
                    (
                        f"{relative_path} belongs to {detected['legacy_kilosort_folder']} "
                        f"({detected['recording_id']}), not {expected['legacy_kilosort_folder']} "
                        f"({expected_recording_id})"
                    ),
                )
            return expected_recording_id

        if detected is not None:
            return str(detected["recording_id"])
        if len(recordings) == 1:
            return str(recordings[0]["recording_id"])
        raise IngestError(
            "recording_not_detected",
            f"Could not determine which Recording owns {relative_path}; select its enclosing Recording folder",
        )

    def create_session(self, payload: dict[str, Any]) -> dict[str, Any]:
        file_rows = payload.get("files")
        if not isinstance(file_rows, list) or not file_rows:
            raise IngestError("empty_selection", "No files were supplied")
        if len(file_rows) > MAX_SESSION_FILES:
            raise IngestError(
                "too_many_files",
                f"A supplement may contain at most {MAX_SESSION_FILES} files",
                status=413,
            )
        source_kind = str(payload.get("sourceKind") or "files")
        if source_kind not in {"files", "folder", "api"}:
            raise IngestError("invalid_source_kind", f"Unsupported source kind: {source_kind}")
        expected_recording = str(payload.get("expectedRecordingId") or "").strip() or None
        expected_roles = {
            str(role)
            for role in (payload.get("expectedRoles") or [])
            if str(role).strip()
        }

        connection = self.connect()
        try:
            dataset_id = self._dataset_id(connection)
            recordings = self._recordings(connection)
        finally:
            connection.close()

        candidates: list[IngestCandidate] = []
        ignored: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []
        seen: set[tuple[str, str, str]] = set()
        for client_index, metadata in enumerate(file_rows):
            if not isinstance(metadata, dict):
                errors.append({"index": client_index, "message": "File metadata is invalid"})
                continue
            filename = Path(str(metadata.get("name") or "")).name
            role = role_for_filename(filename)
            if not filename or role is None:
                ignored.append({"clientIndex": client_index, "filename": filename, "reason": "unsupported"})
                continue
            if expected_roles and role not in expected_roles:
                item = {"clientIndex": client_index, "filename": filename, "reason": "different_data_role"}
                if source_kind == "folder":
                    ignored.append(item)
                    continue
                errors.append({**item, "message": f"{filename} is {role}, not one of {sorted(expected_roles)}"})
                continue
            try:
                relative_path = safe_relative_path(metadata.get("relativePath"), filename)
                recording_id = self._resolve_recording(relative_path, recordings, expected_recording)
                byte_size = int(metadata.get("size"))
                if byte_size < 0:
                    raise ValueError
            except (IngestError, TypeError, ValueError) as error:
                errors.append({"clientIndex": client_index, "filename": filename, "message": str(error)})
                continue
            identity = (
                recording_id,
                role,
                filename.casefold() if role not in SINGLETON_ROLES else "singleton",
            )
            if identity in seen:
                errors.append(
                    {
                        "clientIndex": client_index,
                        "filename": filename,
                        "message": f"The selection contains more than one {role} file for {recording_id}",
                    }
                )
                continue
            seen.add(identity)
            candidates.append(
                IngestCandidate(
                    client_index=client_index,
                    filename=filename,
                    relative_path=relative_path,
                    byte_size=byte_size,
                    last_modified=(
                        int(metadata["lastModified"])
                        if metadata.get("lastModified") is not None
                        else None
                    ),
                    recording_id=recording_id,
                    role=role,
                    media_type=media_type(filename),
                )
            )
        if errors:
            raise IngestError(
                "selection_rejected",
                "One or more selected files do not match the requested Recording or data role",
                details=errors,
            )
        if not candidates:
            raise IngestError(
                "no_matching_files",
                "The selection did not contain a supported file for this missing item",
                details=ignored,
            )

        session_id = uuid.uuid4().hex
        staging_directory = self._staging_root / session_id
        staging_directory.mkdir(parents=True, exist_ok=False)
        session = IngestSession(
            session_id=session_id,
            dataset_id=dataset_id,
            source_kind=source_kind,
            created_at_utc=utc_now(),
            staging_directory=staging_directory,
            candidates=candidates,
            ignored=ignored,
        )
        with self._lock:
            self._sessions[session_id] = session
        return session.public()

    def _session(self, session_id: str) -> IngestSession:
        with self._lock:
            session = self._sessions.get(session_id)
        if session is None:
            raise IngestError("unknown_ingest_session", "The ingest session is missing or expired", status=404)
        return session

    def _candidate(self, session: IngestSession, client_index: int) -> IngestCandidate:
        candidate = next(
            (item for item in session.candidates if item.client_index == client_index),
            None,
        )
        if candidate is None:
            raise IngestError("unknown_ingest_file", f"File index {client_index} is not part of this session", status=404)
        return candidate

    def upload_file(
        self,
        session_id: str,
        client_index: int,
        source: BinaryIO,
        content_length: int | None,
    ) -> dict[str, Any]:
        session = self._session(session_id)
        candidate = self._candidate(session, client_index)
        if candidate.staged_path is not None:
            raise IngestError("file_already_uploaded", f"{candidate.filename} was already uploaded", status=409)
        if content_length is None:
            raise IngestError("content_length_required", "File uploads require Content-Length", status=411)
        if int(content_length) != candidate.byte_size:
            raise IngestError(
                "file_size_mismatch",
                f"{candidate.filename} declared {candidate.byte_size} bytes but sent {content_length}",
            )

        partial = session.staging_directory / f"{client_index:05d}.part"
        staged = session.staging_directory / f"{client_index:05d}.upload"
        digest = hashlib.sha256()
        remaining = int(content_length)
        try:
            with partial.open("xb") as handle:
                while remaining:
                    chunk = source.read(min(COPY_CHUNK_BYTES, remaining))
                    if not chunk:
                        raise IngestError(
                            "truncated_upload",
                            f"{candidate.filename} ended before {content_length} bytes",
                        )
                    handle.write(chunk)
                    digest.update(chunk)
                    remaining -= len(chunk)
            os.replace(partial, staged)
            shape, dtype = self._validate_uploaded_file(candidate, staged)
            candidate.staged_path = staged
            candidate.checksum_sha256 = digest.hexdigest()
            candidate.shape = shape
            candidate.dtype = dtype
            self._reject_known_other_recording(candidate)
        except Exception:
            partial.unlink(missing_ok=True)
            staged.unlink(missing_ok=True)
            candidate.staged_path = None
            candidate.checksum_sha256 = None
            raise
        return candidate.public()

    def _recording_shape_context(self, recording_id: str) -> dict[str, int | None]:
        connection = self.connect()
        try:
            recording = connection.execute(
                "SELECT spike_count FROM recordings WHERE recording_id = ?",
                (recording_id,),
            ).fetchone()
            channel_count = connection.execute(
                """
                SELECT COUNT(*)
                FROM channels c
                JOIN probe_insertions pi USING (probe_insertion_id)
                WHERE pi.recording_id = ?
                """,
                (recording_id,),
            ).fetchone()[0]
        finally:
            connection.close()
        return {
            "spike_count": int(recording[0]) if recording else None,
            "channel_count": int(channel_count) or None,
        }

    def _validate_uploaded_file(
        self,
        candidate: IngestCandidate,
        path: Path,
    ) -> tuple[tuple[int, ...] | None, str | None]:
        if candidate.byte_size <= 0:
            raise IngestError("empty_file", f"{candidate.filename} is empty")
        # Staged uploads intentionally use an opaque .upload suffix. Validation
        # must follow the declared source filename, not the temporary path.
        if Path(candidate.filename).suffix.lower() != ".npy":
            if candidate.role in {"unit_metadata", "channel_geometry", "kilosort_parameters"}:
                try:
                    with path.open("r", encoding="utf-8-sig") as stream:
                        stream.read(4096)
                except UnicodeDecodeError as error:
                    raise IngestError("text_encoding_invalid", f"{candidate.filename} is not readable text") from error
            return None, None

        array = None
        try:
            array = np.load(path, mmap_mode="r", allow_pickle=False)
            shape = tuple(int(value) for value in array.shape)
            dtype = str(array.dtype)
            context = self._recording_shape_context(candidate.recording_id)
            spike_count = context["spike_count"]
            channel_count = context["channel_count"]

            if candidate.role in {"spike_times", "spike_clusters"}:
                if len(shape) != 1:
                    raise IngestError("shape_mismatch", f"{candidate.filename} must be one-dimensional; found {shape}")
                if not np.issubdtype(array.dtype, np.integer):
                    raise IngestError("dtype_mismatch", f"{candidate.filename} must contain integer sample or cluster IDs")
            elif candidate.role in {"spike_amplitudes", "spike_templates"}:
                if len(shape) not in {1, 2} or (len(shape) == 2 and shape[1] != 1):
                    raise IngestError("shape_mismatch", f"{candidate.filename} must contain one value per spike; found {shape}")
            elif candidate.role == "spike_positions":
                if len(shape) != 2 or shape[1] < 2:
                    raise IngestError("shape_mismatch", f"spike_positions.npy must have shape (spikes, >=2); found {shape}")
            elif candidate.role == "templates":
                if len(shape) != 3 or any(value <= 0 for value in shape):
                    raise IngestError("shape_mismatch", f"templates.npy must have shape (templates, samples, channels); found {shape}")
                if channel_count is not None and shape[2] != channel_count:
                    raise IngestError(
                        "shape_mismatch",
                        f"templates.npy has {shape[2]} channels but {candidate.recording_id} has {channel_count}",
                    )
            elif candidate.role == "channel_positions":
                if len(shape) != 2 or shape[1] < 2:
                    raise IngestError("shape_mismatch", f"channel_positions.npy must have shape (channels, >=2); found {shape}")
                if channel_count is not None and shape[0] != channel_count:
                    raise IngestError(
                        "shape_mismatch",
                        f"channel_positions.npy has {shape[0]} channels but {candidate.recording_id} has {channel_count}",
                    )
            elif candidate.role in {"channel_probe_groups", "channel_map"}:
                if len(shape) != 1:
                    raise IngestError("shape_mismatch", f"{candidate.filename} must be one-dimensional; found {shape}")
                if channel_count is not None and shape[0] != channel_count:
                    raise IngestError(
                        "shape_mismatch",
                        f"{candidate.filename} has {shape[0]} channels but {candidate.recording_id} has {channel_count}",
                    )

            if candidate.role in {
                "spike_times",
                "spike_clusters",
                "spike_amplitudes",
                "spike_positions",
                "spike_templates",
            } and spike_count is not None and shape[0] != spike_count:
                raise IngestError(
                    "shape_mismatch",
                    f"{candidate.filename} has {shape[0]} spike rows but {candidate.recording_id} expects {spike_count}",
                )
            return shape, dtype
        except (ValueError, OSError) as error:
            if isinstance(error, IngestError):
                raise
            raise IngestError("npy_invalid", f"{candidate.filename} is not a readable non-pickled NPY array") from error
        finally:
            memory_map = getattr(array, "_mmap", None)
            if memory_map is not None:
                memory_map.close()

    def _reject_known_other_recording(self, candidate: IngestCandidate) -> None:
        if candidate.role not in RECORDING_SPECIFIC_HASH_ROLES or not candidate.checksum_sha256:
            return
        connection = self.connect()
        try:
            row = connection.execute(
                """
                SELECT a.recording_id, r.legacy_kilosort_folder
                FROM data_assets a
                JOIN recordings r USING (recording_id)
                WHERE a.asset_role = ? AND a.checksum = ?
                  AND a.recording_id <> ? AND a.availability_status = 'available'
                LIMIT 1
                """,
                (candidate.role, candidate.checksum_sha256, candidate.recording_id),
            ).fetchone()
        finally:
            connection.close()
        if row is not None:
            raise IngestError(
                "wrong_recording",
                f"{candidate.filename} matches {row['legacy_kilosort_folder']} ({row['recording_id']}), not {candidate.recording_id}",
            )

    def _asset_scope_rows(
        self,
        connection: sqlite3.Connection,
        candidate: IngestCandidate,
    ) -> list[sqlite3.Row]:
        rows = connection.execute(
            """
            SELECT * FROM data_assets
            WHERE recording_id = ? AND asset_role = ?
            ORDER BY availability_status = 'available' DESC, asset_id
            """,
            (candidate.recording_id, candidate.role),
        ).fetchall()
        if candidate.role == "unit_metadata":
            return [row for row in rows if str(row["filename"]).casefold() == candidate.filename.casefold()]
        return rows

    def _existing_asset_checksum(self, row: sqlite3.Row) -> str | None:
        if row["checksum_status"] == "verified" and row["checksum"]:
            return str(row["checksum"])
        relative_path = row["relative_path"]
        if not relative_path:
            return None
        path = self.paths.resolve_asset(str(relative_path))
        if not path.is_file():
            return None
        return file_sha256(path)

    def _prepare_action(
        self,
        connection: sqlite3.Connection,
        session: IngestSession,
        candidate: IngestCandidate,
    ) -> dict[str, Any]:
        if candidate.staged_path is None or candidate.checksum_sha256 is None:
            raise IngestError("upload_incomplete", f"{candidate.filename} has not been uploaded")
        rows = self._asset_scope_rows(connection, candidate)
        available_rows = [row for row in rows if row["availability_status"] == "available"]
        for row in available_rows:
            existing_checksum = self._existing_asset_checksum(row)
            if existing_checksum == candidate.checksum_sha256 and int(row["byte_size"] or 0) == candidate.byte_size:
                return {"action": "duplicate", "asset_id": int(row["asset_id"]), "row": row}
        if available_rows:
            raise IngestError(
                "asset_conflict",
                (
                    f"{candidate.recording_id} already has an available {candidate.role} asset. "
                    "The selected file differs, so it was not overwritten."
                ),
                status=409,
            )

        missing_row = next((row for row in rows if row["availability_status"] != "available"), None)
        relative_path = PurePosixPath(
            "managed-assets",
            session.dataset_id,
            candidate.recording_id,
            candidate.filename,
        ).as_posix()
        final_path = self.paths.resolve_asset(relative_path)
        reuse_final = False
        if final_path.exists():
            if final_path.is_file() and final_path.stat().st_size == candidate.byte_size and file_sha256(final_path) == candidate.checksum_sha256:
                reuse_final = True
            else:
                raise IngestError(
                    "managed_path_conflict",
                    f"The managed destination for {candidate.filename} already exists with different content",
                    status=409,
                )
        return {
            "action": "completed_missing" if missing_row is not None else "inserted",
            "asset_id": int(missing_row["asset_id"]) if missing_row is not None else None,
            "row": missing_row,
            "relative_path": relative_path,
            "final_path": final_path,
            "reuse_final": reuse_final,
        }

    def _register_asset(
        self,
        connection: sqlite3.Connection,
        session: IngestSession,
        candidate: IngestCandidate,
        action: dict[str, Any],
    ) -> int:
        if action["action"] == "duplicate":
            return int(action["asset_id"])
        metadata = json.dumps(
            {
                "batch_id": session.session_id,
                "dtype": candidate.dtype,
                "shape": list(candidate.shape) if candidate.shape is not None else None,
                "source_kind": session.source_kind,
                "source_relative_path": candidate.relative_path,
            },
            sort_keys=True,
        )
        values = (
            candidate.media_type,
            f"project://{action['relative_path']}",
            action["relative_path"],
            candidate.filename,
            Path(candidate.filename).suffix.lower() or None,
            candidate.byte_size,
            "sha256",
            candidate.checksum_sha256,
            "verified",
            "available",
            "user_incremental",
            "incremental_ingest",
            metadata,
        )
        if action["action"] == "completed_missing":
            connection.execute(
                """
                UPDATE data_assets
                SET media_type = ?, storage_backend = 'project_file', storage_uri = ?,
                    relative_path = ?, filename = ?, extension = ?, byte_size = ?,
                    checksum_algorithm = ?, checksum = ?, checksum_status = ?,
                    availability_status = ?, source_data_origin = ?, processing_stage = ?,
                    is_original = 1, metadata_json = ?
                WHERE asset_id = ?
                """,
                (*values, int(action["asset_id"])),
            )
            return int(action["asset_id"])
        cursor = connection.execute(
            """
            INSERT INTO data_assets(
                dataset_id, recording_id, asset_role, media_type, storage_backend,
                storage_uri, relative_path, filename, extension, byte_size,
                checksum_algorithm, checksum, checksum_status, availability_status,
                source_data_origin, processing_stage, is_original, metadata_json
            ) VALUES (?, ?, ?, ?, 'project_file', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (session.dataset_id, candidate.recording_id, candidate.role, *values),
        )
        return int(cursor.lastrowid)

    def _register_stream_contract(
        self,
        connection: sqlite3.Connection,
        session: IngestSession,
        candidate: IngestCandidate,
        asset_id: int,
        action: dict[str, Any],
    ) -> None:
        storage_uri = (
            str(action["row"]["storage_uri"])
            if action["action"] == "duplicate"
            else f"project://{action['relative_path']}"
        )
        if candidate.role == "raw_voltage":
            row = connection.execute(
                "SELECT signal_stream_id FROM signal_streams WHERE recording_id = ? AND stream_kind = 'raw_voltage' LIMIT 1",
                (candidate.recording_id,),
            ).fetchone()
            if row is not None:
                connection.execute(
                    """
                    UPDATE signal_streams
                    SET source_asset_id = ?, storage_format = 'binary',
                        declared_source_uri = ?, availability_status = 'available'
                    WHERE signal_stream_id = ?
                    """,
                    (asset_id, storage_uri, row[0]),
                )
        elif candidate.role == "video":
            video_id = f"{candidate.recording_id}:video:{asset_id}"
            connection.execute(
                """
                INSERT INTO video_streams(
                    video_stream_id, dataset_id, recording_id, source_asset_id,
                    video_name, availability_status, metadata_json
                ) VALUES (?, ?, ?, ?, ?, 'available', ?)
                ON CONFLICT(video_stream_id) DO NOTHING
                """,
                (
                    video_id,
                    session.dataset_id,
                    candidate.recording_id,
                    asset_id,
                    candidate.filename,
                    json.dumps({"synchronization_status": "unverified"}, sort_keys=True),
                ),
            )

    def commit(self, session_id: str) -> dict[str, Any]:
        session = self._session(session_id)
        missing_uploads = [candidate.filename for candidate in session.candidates if candidate.staged_path is None]
        if missing_uploads:
            raise IngestError(
                "upload_incomplete",
                f"The following files have not finished uploading: {', '.join(missing_uploads)}",
            )

        with self._commit_lock:
            connection = self.connect()
            moved: list[tuple[Path, Path]] = []
            try:
                prepared = [self._prepare_action(connection, session, candidate) for candidate in session.candidates]
                connection.execute("BEGIN IMMEDIATE")
                results: list[dict[str, Any]] = []
                affected = {
                    candidate.recording_id
                    for candidate, action in zip(session.candidates, prepared)
                    if action["action"] != "duplicate"
                }
                completed_at = utc_now()
                for index, (candidate, action) in enumerate(zip(session.candidates, prepared)):
                    if action["action"] != "duplicate" and not action["reuse_final"]:
                        final_path = action["final_path"]
                        final_path.parent.mkdir(parents=True, exist_ok=True)
                        os.replace(candidate.staged_path, final_path)
                        moved.append((candidate.staged_path, final_path))
                    asset_id = self._register_asset(connection, session, candidate, action)
                    self._register_stream_contract(connection, session, candidate, asset_id, action)
                    result = {
                        "recordingId": candidate.recording_id,
                        "role": candidate.role,
                        "filename": candidate.filename,
                        "action": action["action"],
                        "assetId": asset_id,
                        "byteSize": candidate.byte_size,
                        "checksumSha256": candidate.checksum_sha256,
                    }
                    results.append(result)
                    if self.fault_injector:
                        self.fault_injector("after_item", index)

                connection.execute(
                    """
                    INSERT INTO incremental_ingest_batches(
                        batch_id, dataset_id, started_at_utc, completed_at_utc,
                        source_kind, status, item_count, affected_recordings_json, metadata_json
                    ) VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?)
                    """,
                    (
                        session.session_id,
                        session.dataset_id,
                        session.created_at_utc,
                        completed_at,
                        session.source_kind,
                        len(results),
                        json.dumps(sorted(affected)),
                        json.dumps({"ignored": session.ignored}, sort_keys=True),
                    ),
                )
                for candidate, result in zip(session.candidates, results):
                    connection.execute(
                        """
                        INSERT INTO incremental_ingest_items(
                            batch_id, recording_id, data_asset_id, asset_role,
                            source_filename, source_relative_path, byte_size,
                            checksum_sha256, action, source_kind, metadata_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            session.session_id,
                            candidate.recording_id,
                            result["assetId"],
                            candidate.role,
                            candidate.filename,
                            candidate.relative_path,
                            candidate.byte_size,
                            candidate.checksum_sha256,
                            result["action"],
                            session.source_kind,
                            json.dumps(
                                {
                                    "dtype": candidate.dtype,
                                    "shape": list(candidate.shape) if candidate.shape is not None else None,
                                },
                                sort_keys=True,
                            ),
                        ),
                    )
                connection.execute(
                    "UPDATE datasets SET updated_at_utc = ? WHERE dataset_id = ?",
                    (completed_at, session.dataset_id),
                )
                if self.fault_injector:
                    self.fault_injector("before_commit", len(results))
                connection.commit()
            except Exception:
                connection.rollback()
                for staged_path, final_path in reversed(moved):
                    if final_path.exists():
                        staged_path.parent.mkdir(parents=True, exist_ok=True)
                        os.replace(final_path, staged_path)
                raise
            finally:
                connection.close()

        self._finish_session(session)
        if self.on_commit:
            self.on_commit(affected)
        return {
            "status": "committed",
            "batchId": session.session_id,
            "affectedRecordings": sorted(affected),
            "items": results,
            "ignored": session.ignored,
        }

    def abort(self, session_id: str) -> dict[str, Any]:
        session = self._session(session_id)
        self._finish_session(session)
        return {"status": "aborted", "sessionId": session_id}

    def _finish_session(self, session: IngestSession) -> None:
        with self._lock:
            self._sessions.pop(session.session_id, None)
        if session.staging_directory.is_dir():
            shutil.rmtree(session.staging_directory)

    def close(self) -> None:
        with self._lock:
            sessions = list(self._sessions.values())
        for session in sessions:
            self._finish_session(session)
