from __future__ import annotations

import hashlib
import json
import os
import shutil
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

import numpy as np


ACTIVITY_CACHE_FORMAT = "neuropixels-display-activity-pyramid"
ACTIVITY_PREPROCESSING_VERSION = "3.1.0"
ACTIVITY_LEVELS = (128, 256, 512, 1024, 2048)


class ActivityBuildCancelled(RuntimeError):
    """Raised when a display-summary build is cancelled by the caller."""


def default_activity_cache_root() -> Path:
    local = os.environ.get("LOCALAPPDATA")
    base = Path(local) if local else Path.home() / ".cache"
    return (base / "NeuropixelsExplorer" / "activity-overviews").resolve()


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def activity_source_fingerprint(
    recording_id: str,
    sample_rate: float,
    asset_paths: dict[str, Path],
    unit_rows: Iterable[dict[str, Any]],
) -> str:
    assets = []
    for role, path in sorted(asset_paths.items()):
        if role not in {
            "spike_times", "spike_clusters", "spike_positions", "spike_templates",
            "templates", "channel_positions", "channel_shanks",
            "channel_probe_groups", "catalog_database",
        }:
            continue
        stat = path.stat()
        assets.append({
            "role": role,
            "name": path.name,
            "bytes": int(stat.st_size),
            "modifiedNs": int(stat.st_mtime_ns),
        })
    units = [
        {
            "clusterId": int(row["cluster_id"]),
            "spikeCount": int(row.get("spike_count") or 0),
            "rateHz": float(row.get("unit_firing_rate_hz") or 0),
            "depthUm": None if row.get("probe_depth_um") is None else float(row["probe_depth_um"]),
            "shankId": None if row.get("shank_id") is None else int(row["shank_id"]),
        }
        for row in unit_rows
    ]
    payload = {
        "recordingId": str(recording_id),
        "sampleRate": float(sample_rate),
        "assets": assets,
        "units": units,
    }
    return hashlib.sha256(_canonical_json(payload).encode("utf-8")).hexdigest()


def activity_cache_identity(source_fingerprint: str) -> str:
    material = f"{ACTIVITY_CACHE_FORMAT}:{ACTIVITY_PREPROCESSING_VERSION}:{source_fingerprint}"
    return hashlib.sha256(material.encode("ascii")).hexdigest()


def normalize_level(bin_count: int | None) -> int:
    requested = int(bin_count or 512)
    return min(ACTIVITY_LEVELS, key=lambda level: (abs(level - requested), level))


def _check_cancelled(is_cancelled: Callable[[], bool] | None) -> None:
    if is_cancelled and is_cancelled():
        raise ActivityBuildCancelled("Activity overview build cancelled")


def build_count_pyramid(
    times: np.ndarray,
    clusters: np.ndarray,
    unit_ids: np.ndarray,
    sample_rate: float,
    *,
    on_progress: Callable[[str, float], None] | None = None,
    is_cancelled: Callable[[], bool] | None = None,
) -> tuple[float, dict[int, np.ndarray]]:
    flat_times = np.asarray(times).reshape(-1)
    flat_clusters = np.asarray(clusters, dtype=np.int64).reshape(-1)
    if flat_times.size != flat_clusters.size:
        raise ValueError("Spike-time and cluster arrays have different lengths")
    duration = float(flat_times[-1] / sample_rate) if flat_times.size else 0.0
    finest = ACTIVITY_LEVELS[-1]
    bin_seconds = duration / finest if duration > 0 else 1.0
    counts = np.zeros((unit_ids.size, finest), dtype=np.uint32)
    on_progress and on_progress("counting", 12.0)
    if flat_clusters.size and unit_ids.size:
        chunk_size = 250_000
        for start in range(0, flat_clusters.size, chunk_size):
            _check_cancelled(is_cancelled)
            end = min(flat_clusters.size, start + chunk_size)
            cluster_chunk = flat_clusters[start:end]
            row_indices = np.searchsorted(unit_ids, cluster_chunk)
            valid = row_indices < unit_ids.size
            valid &= unit_ids[np.minimum(row_indices, max(0, unit_ids.size - 1))] == cluster_chunk
            time_chunk = np.asarray(flat_times[start:end], dtype=np.float64)
            time_bins = np.minimum(
                finest - 1,
                np.maximum(0, np.floor(time_chunk / sample_rate / bin_seconds).astype(np.int64)),
            )
            np.add.at(counts, (row_indices[valid], time_bins[valid]), 1)
            fraction = end / max(1, flat_clusters.size)
            on_progress and on_progress("counting", 12.0 + fraction * 43.0)
    levels: dict[int, np.ndarray] = {finest: counts}
    for index, level in enumerate(reversed(ACTIVITY_LEVELS[:-1]), start=1):
        _check_cancelled(is_cancelled)
        factor = finest // level
        levels[level] = counts.reshape(unit_ids.size, level, factor).sum(axis=2, dtype=np.uint32)
        on_progress and on_progress("pyramid", 55.0 + index / (len(ACTIVITY_LEVELS) - 1) * 15.0)
    return duration, levels


def activity_level_matrices(
    counts: np.ndarray,
    *,
    is_cancelled: Callable[[], bool] | None = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    normalized = np.zeros(counts.shape, dtype=np.uint8)
    unusual = np.zeros(counts.shape, dtype=np.uint8)
    thresholds = np.zeros(counts.shape[0], dtype=np.uint32)
    for row_index in range(counts.shape[0]):
        if row_index % 32 == 0:
            _check_cancelled(is_cancelled)
        row = counts[row_index]
        positive = row[row > 0]
        robust_maximum = float(np.quantile(positive, .95, method="nearest")) if positive.size else 1.0
        normalized[row_index] = np.rint(
            np.minimum(1.0, row / max(1.0, robust_maximum)) * 255
        ).astype(np.uint8)
        threshold = int(np.quantile(row, .90, method="higher"))
        thresholds[row_index] = threshold
        unusual[row_index] = np.where(row > threshold, 255, 0).astype(np.uint8)
    return normalized, unusual, thresholds


class ActivityPyramidStore:
    def __init__(self, root: Path) -> None:
        self.root = root.expanduser().resolve()
        self._lock = threading.RLock()

    def _recording_directory(self, recording_id: str) -> Path:
        key = hashlib.sha256(str(recording_id).encode("utf-8")).hexdigest()[:20]
        return self.root / key

    def _paths(self, recording_id: str, identity: str) -> tuple[Path, Path]:
        directory = self._recording_directory(recording_id)
        return directory / f"{identity}.json", directory / f"{identity}.npz"

    def load(self, recording_id: str, identity: str) -> dict[str, Any] | None:
        metadata_path, arrays_path = self._paths(recording_id, identity)
        with self._lock:
            if not metadata_path.is_file() or not arrays_path.is_file():
                return None
            try:
                metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
                if metadata.get("cacheIdentity") != identity:
                    return None
                if metadata.get("preprocessingVersion") != ACTIVITY_PREPROCESSING_VERSION:
                    return None
                with np.load(arrays_path, allow_pickle=False) as archive:
                    arrays = {key: archive[key].copy() for key in archive.files}
                return {"metadata": metadata, "arrays": arrays}
            except (OSError, ValueError, KeyError, json.JSONDecodeError):
                return None

    def write(
        self,
        recording_id: str,
        identity: str,
        metadata: dict[str, Any],
        arrays: dict[str, np.ndarray],
    ) -> tuple[Path, int]:
        metadata_path, arrays_path = self._paths(recording_id, identity)
        directory = metadata_path.parent
        with self._lock:
            directory.mkdir(parents=True, exist_ok=True)
            temporary_metadata = directory / f".{identity}.json.tmp"
            temporary_arrays = directory / f".{identity}.npz.tmp"
            with temporary_arrays.open("wb") as handle:
                np.savez_compressed(handle, **arrays)
            temporary_metadata.write_text(
                json.dumps(metadata, indent=2, sort_keys=True),
                encoding="utf-8",
            )
            temporary_arrays.replace(arrays_path)
            temporary_metadata.replace(metadata_path)
            for path in directory.iterdir():
                if path in {metadata_path, arrays_path} or path.name.startswith("."):
                    continue
                if path.suffix in {".json", ".npz"}:
                    path.unlink(missing_ok=True)
            return arrays_path, arrays_path.stat().st_size + metadata_path.stat().st_size

    def invalidate(self, recording_ids: Iterable[str]) -> None:
        with self._lock:
            for recording_id in recording_ids:
                directory = self._recording_directory(str(recording_id))
                if directory.is_dir() and directory.is_relative_to(self.root):
                    shutil.rmtree(directory)

    def status(self) -> dict[str, Any]:
        with self._lock:
            files = list(self.root.rglob("*.npz")) if self.root.is_dir() else []
            return {
                "format": ACTIVITY_CACHE_FORMAT,
                "preprocessingVersion": ACTIVITY_PREPROCESSING_VERSION,
                "levels": list(ACTIVITY_LEVELS),
                "entries": len(files),
                "bytes": sum(path.stat().st_size for path in files),
            }


def pyramid_metadata(
    recording_id: str,
    source_fingerprint: str,
    cache_identity: str,
    duration: float,
    total_spikes: int,
) -> dict[str, Any]:
    return {
        "cacheFormat": ACTIVITY_CACHE_FORMAT,
        "preprocessingVersion": ACTIVITY_PREPROCESSING_VERSION,
        "sourceFingerprint": source_fingerprint,
        "cacheIdentity": cache_identity,
        "recordingId": str(recording_id),
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "duration": float(duration),
        "totalSpikes": int(total_spikes),
        "availableBinCounts": list(ACTIVITY_LEVELS),
        "mapping": {
            "rows": "row index maps to unitIds[row]",
            "bins": "bin maps to the half-open interval [bin * binSeconds, (bin + 1) * binSeconds)",
        },
        "semantics": {
            "individual": "spike count per recording-wide bin divided by the Unit's non-empty-bin 95th percentile and clipped to [0, 1]",
            "aggregate": "fraction of constituent Units whose bin count is strictly above that Unit's recording-wide 90th-percentile bin count at the selected pyramid level",
            "unusualThreshold": "recording-wide 90th percentile across all bins at the selected pyramid level for each Unit; sparse Units with a zero threshold are unusual in bins containing at least one spike",
            "rawFiringRate": False,
        },
    }
