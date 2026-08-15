from __future__ import annotations

import gzip
import json
import mimetypes
import re
import sqlite3
import statistics
import threading
import time
from collections import OrderedDict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

import numpy as np

from . import __version__
from .ingest import IncrementalIngestManager, IngestError
from .migrations import SCHEMA_VERSION, validate_schema
from .paths import RuntimePaths


SERVICE_VERSION = __version__
MAX_RECORDING_CACHE = 2
MAX_UNIT_CACHE = 64


def _row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def _finite_mean(values: np.ndarray) -> float | None:
    return float(np.mean(values)) if values.size else None


def _probe_track(rows: list[dict[str, Any]]) -> dict[str, Any]:
    contract = {
        "required": ["probe/shank", "depth_um", "region"],
        "recommended": ["electrode", "atlas_id", "color", "experiment/recording_id"],
        "join": "probe/shank + depth_um, or electrode_index when available",
    }
    if not rows:
        return {
            "valid": False, "source": "", "files": [], "rowCount": 0,
            "probeCount": 0, "probes": [], "profiles": [], "segments": [],
            "warnings": [], "contract": contract,
        }
    grouped: dict[int, dict[float, list[dict[str, Any]]]] = {}
    for row in rows:
        grouped.setdefault(int(row["probeId"]), {}).setdefault(float(row["depthUm"]), []).append(row)
    profiles: list[dict[str, Any]] = []
    segments: list[dict[str, Any]] = []
    ambiguous_depths = 0
    for probe_id, by_depth in sorted(grouped.items()):
        samples = []
        for depth, candidates in sorted(by_depth.items()):
            counts: dict[tuple[str, str | None, int | None], int] = {}
            for candidate in candidates:
                key = (candidate["region"], candidate.get("color"), candidate.get("atlasId"))
                counts[key] = counts.get(key, 0) + 1
            winner = sorted(counts, key=lambda key: (-counts[key], key[0]))[0]
            ambiguous = len(counts) > 1
            ambiguous_depths += int(ambiguous)
            samples.append({
                "depth": depth, "region": winner[0], "color": winner[1] or "",
                "atlasId": winner[2], "electrodeCount": len(candidates), "ambiguous": ambiguous,
            })
        positive_steps = [
            samples[index]["depth"] - samples[index - 1]["depth"]
            for index in range(1, len(samples))
            if samples[index]["depth"] > samples[index - 1]["depth"]
        ]
        step = float(statistics.median(positive_steps)) if positive_steps else 15.0
        current: dict[str, Any] | None = None
        for sample in samples:
            same_region = current is not None and all(
                current[key] == sample[key] for key in ("region", "color", "atlasId")
            )
            contiguous = current is not None and sample["depth"] - current["lastDepthUm"] <= step * 1.6
            if not same_region or not contiguous:
                if current is not None:
                    segments.append(current)
                current = {
                    "experiment": None, "probeId": probe_id, "region": sample["region"],
                    "color": sample["color"], "atlasId": sample["atlasId"],
                    "startDepthUm": sample["depth"] - step / 2,
                    "endDepthUm": sample["depth"] + step / 2,
                    "firstDepthUm": sample["depth"], "lastDepthUm": sample["depth"],
                    "sampleStepUm": step, "depthSamples": 1,
                    "electrodeCount": sample["electrodeCount"],
                    "ambiguousDepths": int(sample["ambiguous"]),
                }
            else:
                current["lastDepthUm"] = sample["depth"]
                current["endDepthUm"] = sample["depth"] + step / 2
                current["depthSamples"] += 1
                current["electrodeCount"] += sample["electrodeCount"]
                current["ambiguousDepths"] += int(sample["ambiguous"])
        if current is not None:
            segments.append(current)
        profiles.append({
            "experiment": None, "probeId": probe_id,
            "minimumDepthUm": samples[0]["depth"], "maximumDepthUm": samples[-1]["depth"],
            "sampleStepUm": step, "depthSamples": len(samples),
            "electrodeCount": sum(sample["electrodeCount"] for sample in samples),
            "ambiguousDepths": sum(int(sample["ambiguous"]) for sample in samples),
        })
    source_uri = str(rows[0].get("mappingSource") or "")
    source = source_uri.replace("\\", "/").rsplit("/", 1)[-1]
    warnings = []
    if ambiguous_depths:
        warnings.append(f"{ambiguous_depths} depth samples contain conflicting region labels.")
    return {
        "valid": bool(segments), "source": source, "files": [source] if source else [],
        "rowCount": len(rows), "probeCount": len(grouped), "probes": sorted(grouped),
        "experiments": [], "scopedByExperiment": False, "profiles": profiles,
        "segments": segments, "warnings": warnings, "contract": contract,
    }


class CatalogService:
    def __init__(self, paths: RuntimePaths) -> None:
        paths.validate()
        self.paths = paths
        self.database_path = paths.database_path
        self._recording_cache: OrderedDict[str, dict[str, np.ndarray]] = OrderedDict()
        self._unit_cache: OrderedDict[str, dict[str, Any]] = OrderedDict()
        self._cache_lock = threading.RLock()
        with self.connect() as connection:
            validate_schema(connection)
            dataset_versions = {
                int(row[0])
                for row in connection.execute("SELECT DISTINCT schema_version FROM datasets")
            }
            if dataset_versions.difference({SCHEMA_VERSION}):
                raise RuntimeError(
                    f"Catalog dataset schema versions {sorted(dataset_versions)} do not match {SCHEMA_VERSION}"
                )
        self.incremental_ingest = IncrementalIngestManager(
            paths,
            on_commit=self.invalidate_recordings,
        )

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(
            f"file:{self.database_path.as_posix()}?mode=ro",
            uri=True,
            timeout=10,
        )
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA query_only = ON")
        return connection

    def health(self) -> dict[str, Any]:
        with self.connect() as connection:
            integrity = connection.execute("PRAGMA quick_check").fetchone()[0]
            dataset = _row_dict(
                connection.execute(
                    "SELECT dataset_id, import_status, schema_version FROM datasets LIMIT 1"
                ).fetchone()
            )
        return {
            "status": "ok" if integrity == "ok" else "error",
            "serviceVersion": SERVICE_VERSION,
            "databaseIntegrity": integrity,
            "dataset": dataset,
            "cache": self.cache_status(),
        }

    def cache_status(self) -> dict[str, Any]:
        with self._cache_lock:
            return {
                "recordingLimit": MAX_RECORDING_CACHE,
                "recordings": list(self._recording_cache.keys()),
                "unitLimit": MAX_UNIT_CACHE,
                "unitCount": len(self._unit_cache),
            }

    def catalog(self) -> dict[str, Any]:
        started = time.perf_counter()
        with self.connect() as connection:
            dataset = _row_dict(connection.execute("SELECT * FROM datasets LIMIT 1").fetchone())
            ingest = _row_dict(
                connection.execute(
                    "SELECT * FROM ingest_runs ORDER BY started_at_utc DESC LIMIT 1"
                ).fetchone()
            )
            recording_rows = connection.execute(
                """
                SELECT rc.*, r.sample_rate_hz, r.source_processing_stage,
                       r.event_data_status, r.independence_status,
                       EXISTS(
                           SELECT 1 FROM signal_streams ss
                           WHERE ss.recording_id = r.recording_id
                             AND ss.availability_status = 'available'
                       ) AS has_raw_signal
                FROM recording_catalog rc
                JOIN recordings r USING (recording_id)
                ORDER BY r.recording_index
                """
            ).fetchall()
            unit_rows = connection.execute(
                """
                SELECT uc.*, u.contamination_pct, u.amplitude_arbitrary_unit,
                       br.annotation_status AS region_annotation_status
                FROM unit_catalog uc
                JOIN units u USING (unit_id)
                LEFT JOIN unit_locations ul USING (unit_id)
                LEFT JOIN brain_regions br USING (brain_region_id)
                ORDER BY u.recording_id, u.cluster_id
                """
            ).fetchall()
            roles = connection.execute(
                """
                SELECT recording_id, asset_role, COUNT(*) AS item_count
                FROM data_assets
                WHERE availability_status = 'available'
                GROUP BY recording_id, asset_role
                """
            ).fetchall()
            asset_rows = connection.execute(
                """
                SELECT asset_id, recording_id, asset_role, filename, byte_size,
                       checksum_status, availability_status, source_data_origin,
                       processing_stage
                FROM data_assets
                WHERE recording_id IS NOT NULL
                ORDER BY recording_id, asset_role, filename
                """
            ).fetchall()
            summary = _row_dict(
                connection.execute(
                    """
                    SELECT COUNT(*) AS asset_count, COALESCE(SUM(byte_size), 0) AS indexed_bytes
                    FROM data_assets
                    WHERE availability_status = 'available'
                    """
                ).fetchone()
            )
            region_summary = _row_dict(
                connection.execute(
                    "SELECT COUNT(*) AS mapping_count, COUNT(DISTINCT brain_region_id) AS region_count FROM unit_locations WHERE brain_region_id IS NOT NULL"
                ).fetchone()
            )
            videos = connection.execute(
                "SELECT video_stream_id, recording_id, video_name, availability_status FROM video_streams ORDER BY video_stream_id"
            ).fetchall()
            probe_track_rows = connection.execute(
                """
                SELECT pas.source_group_id AS probeId, pas.depth_um AS depthUm,
                       br.acronym AS region, br.color_hex AS color,
                       pas.atlas_structure_id AS atlasId, pas.mapping_source AS mappingSource
                FROM probe_atlas_sites pas
                JOIN brain_regions br USING (brain_region_id)
                ORDER BY pas.source_group_id, pas.depth_um, pas.electrode_index
                """
            ).fetchall()

        units_by_recording: dict[str, list[dict[str, Any]]] = {}
        for row in unit_rows:
            unit = dict(row)
            units_by_recording.setdefault(unit["recording_id"], []).append(unit)
        roles_by_recording: dict[str, set[str]] = {}
        for row in roles:
            roles_by_recording.setdefault(row["recording_id"], set()).add(row["asset_role"])
        assets_by_recording: dict[str, list[dict[str, Any]]] = {}
        for row in asset_rows:
            asset = dict(row)
            assets_by_recording.setdefault(asset["recording_id"], []).append(asset)
        recordings = []
        for row in recording_rows:
            recording = dict(row)
            recording["units"] = units_by_recording.get(recording["recording_id"], [])
            recording["assetRoles"] = sorted(roles_by_recording.get(recording["recording_id"], set()))
            recording["assets"] = assets_by_recording.get(recording["recording_id"], [])
            recordings.append(recording)
        return {
            "dataset": dataset,
            "ingest": ingest,
            "summary": {**(summary or {}), **(region_summary or {})},
            "recordings": recordings,
            "probeTrack": _probe_track([dict(row) for row in probe_track_rows]),
            "videos": [dict(row) for row in videos],
            "serverTimingMs": round((time.perf_counter() - started) * 1000, 3),
        }

    def videos(self) -> dict[str, Any]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT vs.*, source.storage_uri AS source_uri, proxy.storage_uri AS proxy_uri
                FROM video_streams vs
                LEFT JOIN data_assets source ON source.asset_id = vs.source_asset_id
                LEFT JOIN data_assets proxy ON proxy.asset_id = vs.proxy_asset_id
                ORDER BY vs.video_stream_id
                """
            ).fetchall()
        return {"videos": [dict(row) for row in rows]}

    def recording_snapshot(self, recording_id: str) -> dict[str, Any]:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT rc.*, r.sample_rate_hz, r.source_processing_stage,
                       r.event_data_status, r.independence_status,
                       EXISTS(
                           SELECT 1 FROM signal_streams ss
                           WHERE ss.recording_id = r.recording_id
                             AND ss.availability_status = 'available'
                       ) AS has_raw_signal
                FROM recording_catalog rc
                JOIN recordings r USING (recording_id)
                WHERE r.recording_id = ?
                """,
                (recording_id,),
            ).fetchone()
            if row is None:
                raise KeyError(f"Unknown Recording: {recording_id}")
            units = connection.execute(
                """
                SELECT uc.*, u.contamination_pct, u.amplitude_arbitrary_unit,
                       br.annotation_status AS region_annotation_status
                FROM unit_catalog uc
                JOIN units u USING (unit_id)
                LEFT JOIN unit_locations ul USING (unit_id)
                LEFT JOIN brain_regions br USING (brain_region_id)
                WHERE u.recording_id = ?
                ORDER BY u.cluster_id
                """,
                (recording_id,),
            ).fetchall()
            assets = connection.execute(
                """
                SELECT asset_id, recording_id, asset_role, filename, byte_size,
                       checksum_status, availability_status, source_data_origin,
                       processing_stage
                FROM data_assets
                WHERE recording_id = ?
                ORDER BY asset_role, filename
                """,
                (recording_id,),
            ).fetchall()
        recording = dict(row)
        recording["units"] = [dict(unit) for unit in units]
        recording["assets"] = [dict(asset) for asset in assets]
        recording["assetRoles"] = sorted(
            {
                asset["asset_role"]
                for asset in recording["assets"]
                if asset["availability_status"] == "available"
            }
        )
        return {"recording": recording}

    def _asset_paths(self, recording_id: str) -> dict[str, Path]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT asset_role, relative_path
                FROM data_assets
                WHERE recording_id = ? AND availability_status = 'available'
                """,
                (recording_id,),
            ).fetchall()
        paths: dict[str, Path] = {}
        for row in rows:
            if row["asset_role"] not in paths and row["relative_path"]:
                paths[row["asset_role"]] = self.paths.resolve_asset(row["relative_path"])
        return paths

    def _recording_arrays(self, recording_id: str) -> tuple[dict[str, np.ndarray], bool]:
        with self._cache_lock:
            if recording_id in self._recording_cache:
                arrays = self._recording_cache.pop(recording_id)
                self._recording_cache[recording_id] = arrays
                return arrays, True
        asset_paths = self._asset_paths(recording_id)
        required = {"spike_times", "spike_clusters"}
        missing = required.difference(asset_paths)
        if missing:
            raise FileNotFoundError(f"{recording_id} is missing required assets: {sorted(missing)}")
        arrays: dict[str, np.ndarray] = {}
        for role in (
            "spike_times", "spike_clusters", "spike_amplitudes", "spike_positions",
            "spike_templates", "templates", "channel_positions",
        ):
            path = asset_paths.get(role)
            if path:
                arrays[role] = np.load(path, mmap_mode="r", allow_pickle=False)
        with self._cache_lock:
            self._recording_cache[recording_id] = arrays
            while len(self._recording_cache) > MAX_RECORDING_CACHE:
                self._recording_cache.popitem(last=False)
        return arrays, False

    def _unit_row(self, unit_id: str) -> sqlite3.Row:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT u.*, r.sample_rate_hz, r.recording_duration_s,
                       r.legacy_kilosort_folder, uc.brain_region, uc.atlas_color_hex,
                       uc.probe_depth_um, uc.shank_id, uc.atlas_registration_status
                FROM units u
                JOIN recordings r USING (recording_id)
                LEFT JOIN unit_catalog uc USING (unit_id)
                WHERE u.unit_id = ?
                """,
                (unit_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown Unit: {unit_id}")
        return row

    def _unit_summaries(self, recording_id: str) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT cluster_id AS id, spike_count AS count, unit_firing_rate_hz AS rateHz
                FROM units WHERE recording_id = ? ORDER BY cluster_id
                """,
                (recording_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def _channel_probe_ids(self, recording_id: str, channel_count: int) -> np.ndarray:
        result = np.full(max(0, channel_count), -1, dtype=np.int16)
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT c.recording_channel, pi.metadata_json
                FROM channels c
                JOIN probe_insertions pi USING (probe_insertion_id)
                WHERE pi.recording_id = ?
                ORDER BY c.recording_channel
                """,
                (recording_id,),
            ).fetchall()
        for row in rows:
            channel = int(row["recording_channel"])
            if not 0 <= channel < result.size:
                continue
            try:
                metadata = json.loads(row["metadata_json"] or "{}")
                result[channel] = int(metadata.get("source_group_id", 0))
            except (TypeError, ValueError, json.JSONDecodeError):
                result[channel] = 0
        return result

    @staticmethod
    def _unit_locations(
        clusters: np.ndarray,
        positions: np.ndarray | None,
        spike_templates: np.ndarray | None,
        templates: np.ndarray | None,
        channel_probe_ids: np.ndarray,
    ) -> list[dict[str, Any]]:
        cluster_values = np.asarray(clusters, dtype=np.int64).reshape(-1)
        cluster_ids, inverse = np.unique(cluster_values, return_inverse=True)
        counts = np.bincount(inverse)
        mean_x = np.full(cluster_ids.size, np.nan)
        mean_y = np.full(cluster_ids.size, np.nan)
        if positions is not None and positions.ndim == 2 and positions.shape[0] == cluster_values.size and positions.shape[1] >= 2:
            mean_x = np.bincount(inverse, weights=np.asarray(positions[:, 0], dtype=np.float64), minlength=cluster_ids.size) / counts
            mean_y = np.bincount(inverse, weights=np.asarray(positions[:, 1], dtype=np.float64), minlength=cluster_ids.size) / counts

        dominant_templates: dict[int, int] = {}
        template_values = None
        if spike_templates is not None and spike_templates.size == cluster_values.size:
            template_values = np.asarray(spike_templates, dtype=np.int64).reshape(-1)
            template_base = int(template_values.max(initial=0)) + 1
            pair_codes = cluster_values * template_base + template_values
            unique_pairs, pair_counts = np.unique(pair_codes, return_counts=True)
            for code, pair_count in zip(unique_pairs, pair_counts):
                cluster_id = int(code // template_base)
                template_id = int(code % template_base)
                current = dominant_templates.get(cluster_id)
                if current is None:
                    dominant_templates[cluster_id] = template_id
                    continue
                current_count = pair_counts[np.searchsorted(unique_pairs, cluster_id * template_base + current)]
                if pair_count > current_count:
                    dominant_templates[cluster_id] = template_id

        peak_by_template: dict[int, int] = {}
        if templates is not None and templates.ndim == 3:
            needed = sorted({template_id for template_id in dominant_templates.values() if 0 <= template_id < templates.shape[0]})
            if needed:
                selected = np.asarray(templates[needed])
                peaks = np.argmax(np.ptp(selected, axis=1), axis=1)
                peak_by_template = {template_id: int(peak) for template_id, peak in zip(needed, peaks)}

        rows = []
        for index, cluster_id in enumerate(cluster_ids):
            template_id = dominant_templates.get(int(cluster_id), int(cluster_id))
            peak_channel = peak_by_template.get(template_id)
            physical_probe_id = int(channel_probe_ids[peak_channel]) if peak_channel is not None and 0 <= peak_channel < channel_probe_ids.size and channel_probe_ids[peak_channel] >= 0 else None
            rows.append(
                {
                    "id": int(cluster_id),
                    "x": float(mean_x[index]) if np.isfinite(mean_x[index]) else None,
                    "y": float(mean_y[index]) if np.isfinite(mean_y[index]) else None,
                    "peakChannel": peak_channel,
                    "physicalProbeId": physical_probe_id,
                }
            )
        return rows

    def unit_review(self, unit_id: str) -> dict[str, Any]:
        started = time.perf_counter()
        with self._cache_lock:
            cached = self._unit_cache.get(unit_id)
            if cached is not None:
                self._unit_cache.move_to_end(unit_id)
                return {
                    **cached,
                    "server": {
                        "unitCacheHit": True,
                        "recordingCacheHit": True,
                        "computeMs": round((time.perf_counter() - started) * 1000, 3),
                    },
                }

        unit = self._unit_row(unit_id)
        arrays, recording_cache_hit = self._recording_arrays(unit["recording_id"])
        sample_rate = float(unit["sample_rate_hz"])
        cluster_id = int(unit["cluster_id"])
        times = np.asarray(arrays["spike_times"]).reshape(-1)
        clusters = np.asarray(arrays["spike_clusters"]).reshape(-1)
        if times.size != clusters.size:
            raise ValueError("Spike-time and cluster arrays have different lengths")
        mask = clusters == cluster_id
        selected_indices = np.flatnonzero(mask)
        spike_times = np.asarray(times[mask], dtype=np.float64) / sample_rate
        duration = float(times[-1] / sample_rate) if times.size else 0.0

        isi_count = int(np.count_nonzero(np.diff(spike_times) < .002)) if spike_times.size > 1 else 0
        presence_bins = np.zeros(max(1, int(np.ceil(duration / 10))), dtype=np.uint8)
        if spike_times.size:
            presence_indices = np.minimum(presence_bins.size - 1, np.floor(spike_times / 10).astype(np.int64))
            presence_bins[presence_indices] = 1

        rate_bins = np.zeros(512, dtype=np.float32)
        rate_bin_seconds = duration / rate_bins.size if duration > 0 else 1.0
        if spike_times.size:
            rate_indices = np.minimum(rate_bins.size - 1, np.floor(spike_times / rate_bin_seconds).astype(np.int64))
            np.add.at(rate_bins, rate_indices, 1 / rate_bin_seconds)

        acg_positive = np.zeros(50, dtype=np.uint32)
        for left, value in enumerate(spike_times):
            right = int(np.searchsorted(spike_times, value + .1, side="right"))
            if right <= left + 1:
                continue
            lags = spike_times[left + 1:right] - value
            bins = np.minimum(49, np.floor(lags / .002).astype(np.int64))
            acg_positive += np.bincount(bins, minlength=50).astype(np.uint32)
        acg = np.zeros(101, dtype=np.uint32)
        acg[51:101] = acg_positive
        acg[0:50] = acg_positive[::-1]

        amplitudes = arrays.get("spike_amplitudes")
        selected_amplitudes = np.asarray(amplitudes).reshape(-1)[mask] if amplitudes is not None and amplitudes.size == clusters.size else np.array([], dtype=np.float32)
        stride = max(1, int(np.ceil(selected_amplitudes.size / 5000))) if selected_amplitudes.size else 1
        amplitude_times = spike_times[::stride] if selected_amplitudes.size else np.array([], dtype=np.float64)
        amplitude_values = selected_amplitudes[::stride] if selected_amplitudes.size else np.array([], dtype=np.float32)

        positions = arrays.get("spike_positions")
        selected_positions = np.asarray(positions)[mask] if positions is not None and positions.shape[0] == clusters.size else np.empty((0, 2), dtype=np.float32)
        mean_x = _finite_mean(selected_positions[:, 0]) if selected_positions.ndim == 2 and selected_positions.shape[1] >= 2 else None
        mean_depth = _finite_mean(selected_positions[:, 1]) if selected_positions.ndim == 2 and selected_positions.shape[1] >= 2 else None

        spike_templates = arrays.get("spike_templates")
        if spike_templates is not None and spike_templates.size == clusters.size and selected_indices.size:
            template_ids, template_counts = np.unique(np.asarray(spike_templates).reshape(-1)[mask], return_counts=True)
            template_id = int(template_ids[int(np.argmax(template_counts))])
        else:
            template_id = cluster_id
        template_waveform = np.array([], dtype=np.float32)
        peak_channel: int | None = None
        peak_position: dict[str, float] | None = None
        templates = arrays.get("templates")
        channel_positions = arrays.get("channel_positions")
        if templates is not None and templates.ndim == 3 and 0 <= template_id < templates.shape[0]:
            template = np.asarray(templates[template_id])
            peak_channel = int(np.argmax(np.ptp(template, axis=0)))
            template_waveform = np.asarray(template[:, peak_channel], dtype=np.float32)
            if channel_positions is not None and channel_positions.ndim == 2 and peak_channel < channel_positions.shape[0]:
                peak_position = {
                    "x": float(channel_positions[peak_channel, 0]),
                    "y": float(channel_positions[peak_channel, 1]),
                }
        geometry = np.asarray(channel_positions[:, :2], dtype=np.float32).reshape(-1) if channel_positions is not None and channel_positions.ndim == 2 else np.array([], dtype=np.float32)
        channel_probe_ids = self._channel_probe_ids(unit["recording_id"], int(channel_positions.shape[0]) if channel_positions is not None and channel_positions.ndim == 2 else 0)
        unit_locations = self._unit_locations(clusters, positions, spike_templates, templates, channel_probe_ids)
        physical_probe_id = int(channel_probe_ids[peak_channel]) if peak_channel is not None and peak_channel < channel_probe_ids.size and channel_probe_ids[peak_channel] >= 0 else None

        result = {
            "unitId": unit_id,
            "recordingId": unit["recording_id"],
            "clusterId": cluster_id,
            "spikeTimes": spike_times.tolist(),
            "spikeCount": int(spike_times.size),
            "totalSpikes": int(times.size),
            "duration": duration,
            "rateHz": float(spike_times.size / duration) if duration else 0.0,
            "isiViolationCount": isi_count,
            "isiViolationPercent": float(isi_count / (spike_times.size - 1) * 100) if spike_times.size > 1 else 0.0,
            "presenceRatio": float(np.mean(presence_bins)),
            "rateBins": rate_bins.tolist(),
            "unitSummaries": self._unit_summaries(unit["recording_id"]),
            "acg": acg.tolist(),
            "amplitudeTimes": amplitude_times.tolist(),
            "amplitudeValues": amplitude_values.astype(float).tolist(),
            "meanAmplitude": _finite_mean(selected_amplitudes),
            "meanDepth": mean_depth,
            "meanX": mean_x,
            "templateId": template_id,
            "templateWaveform": template_waveform.astype(float).tolist(),
            "peakChannel": peak_channel,
            "peakChannelPosition": peak_position,
            "physicalProbeId": physical_probe_id,
            "unitLocations": unit_locations,
            "channelGeometry": geometry.astype(float).tolist(),
            "channelProbeIds": channel_probe_ids.astype(int).tolist(),
        }
        with self._cache_lock:
            self._unit_cache[unit_id] = result
            while len(self._unit_cache) > MAX_UNIT_CACHE:
                self._unit_cache.popitem(last=False)
        return {
            **result,
            "server": {
                "unitCacheHit": False,
                "recordingCacheHit": recording_cache_hit,
                "computeMs": round((time.perf_counter() - started) * 1000, 3),
            },
        }

    def invalidate_recordings(self, recording_ids: set[str]) -> None:
        affected = {str(recording_id) for recording_id in recording_ids}
        with self._cache_lock:
            for recording_id in affected:
                arrays = self._recording_cache.pop(recording_id, None)
                if arrays:
                    for array in arrays.values():
                        memory_map = getattr(array, "_mmap", None)
                        if memory_map is not None:
                            memory_map.close()
            for unit_id, result in list(self._unit_cache.items()):
                if str(result.get("recordingId")) in affected:
                    self._unit_cache.pop(unit_id, None)

    def close(self) -> None:
        """Release memory-mapped arrays so runtime roots can be moved or removed on Windows."""
        self.incremental_ingest.close()
        with self._cache_lock:
            for arrays in self._recording_cache.values():
                for array in arrays.values():
                    memory_map = getattr(array, "_mmap", None)
                    if memory_map is not None:
                        memory_map.close()
            self._recording_cache.clear()
            self._unit_cache.clear()


class NeuropixelHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], service: CatalogService, static_root: Path, quiet: bool = False) -> None:
        super().__init__(address, NeuropixelRequestHandler)
        self.service = service
        self.static_root = static_root.resolve()
        self.quiet = quiet

    def server_close(self) -> None:
        self.service.close()
        super().server_close()


class NeuropixelRequestHandler(BaseHTTPRequestHandler):
    server: NeuropixelHTTPServer

    def log_message(self, format: str, *args: Any) -> None:
        if not self.server.quiet:
            print(f"[{self.log_date_time_string()}] {format % args}")

    def _json(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        use_gzip = "gzip" in self.headers.get("Accept-Encoding", "").lower() and len(body) > 1024
        if use_gzip:
            body = gzip.compress(body, compresslevel=5)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if use_gzip:
            self.send_header("Content-Encoding", "gzip")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self, maximum_bytes: int = 2 * 1024 * 1024) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise IngestError("content_length_invalid", "Invalid Content-Length", status=400) from error
        if length <= 0:
            raise IngestError("json_body_required", "A JSON request body is required", status=400)
        if length > maximum_bytes:
            raise IngestError("json_body_too_large", "The request metadata is too large", status=413)
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise IngestError("json_invalid", "The request body is not valid JSON", status=400) from error
        if not isinstance(payload, dict):
            raise IngestError("json_object_required", "The request body must be a JSON object", status=400)
        return payload

    def _ingest_error(self, error: Exception) -> None:
        if isinstance(error, IngestError):
            self._json(error.payload(), error.status)
        elif isinstance(error, KeyError):
            self._json({"error": "not_found", "message": str(error)}, HTTPStatus.NOT_FOUND)
        elif isinstance(error, (FileNotFoundError, ValueError)):
            self._json({"error": "invalid_data", "message": str(error)}, HTTPStatus.UNPROCESSABLE_ENTITY)
        else:
            self._json({"error": "internal_error", "message": str(error)}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def _static(self, requested_path: str) -> None:
        relative = "index.html" if requested_path in {"", "/"} else unquote(requested_path.lstrip("/"))
        candidate = (self.server.static_root / relative).resolve()
        if not candidate.is_relative_to(self.server.static_root) or not candidate.is_file():
            self._json({"error": "not_found"}, HTTPStatus.NOT_FOUND)
            return
        body = candidate.read_bytes()
        content_type = {
            ".js": "application/javascript",
            ".css": "text/css",
            ".html": "text/html",
            ".json": "application/json",
        }.get(candidate.suffix.lower()) or mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8" if content_type.startswith(("text/", "application/javascript")) else content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/health":
                self._json(self.server.service.health())
            elif parsed.path == "/api/catalog":
                self._json(self.server.service.catalog())
            elif parsed.path == "/api/cache":
                self._json(self.server.service.cache_status())
            elif parsed.path == "/api/videos":
                self._json(self.server.service.videos())
            elif parsed.path.startswith("/api/recordings/"):
                recording_id = unquote(parsed.path[len("/api/recordings/"):]).strip("/")
                self._json(self.server.service.recording_snapshot(recording_id))
            elif parsed.path.startswith("/api/units/") and parsed.path.endswith("/review"):
                unit_id = unquote(parsed.path[len("/api/units/"):-len("/review")]).strip("/")
                self._json(self.server.service.unit_review(unit_id))
            elif parsed.path.startswith("/api/"):
                self._json({"error": "not_found"}, HTTPStatus.NOT_FOUND)
            else:
                self._static(parsed.path)
        except Exception as error:
            self._ingest_error(error)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/ingest/sessions":
                self._json(
                    self.server.service.incremental_ingest.create_session(self._read_json()),
                    HTTPStatus.CREATED,
                )
                return
            match = re.fullmatch(r"/api/ingest/sessions/([0-9a-f]+)/commit", parsed.path)
            if match:
                self._json(self.server.service.incremental_ingest.commit(match.group(1)))
                return
            self._json({"error": "not_found"}, HTTPStatus.NOT_FOUND)
        except Exception as error:
            self._ingest_error(error)

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        try:
            match = re.fullmatch(r"/api/ingest/sessions/([0-9a-f]+)/files/(\d+)", parsed.path)
            if not match:
                self._json({"error": "not_found"}, HTTPStatus.NOT_FOUND)
                return
            try:
                content_length = int(self.headers["Content-Length"]) if self.headers.get("Content-Length") else None
            except ValueError as error:
                raise IngestError("content_length_invalid", "Invalid Content-Length", status=400) from error
            result = self.server.service.incremental_ingest.upload_file(
                match.group(1),
                int(match.group(2)),
                self.rfile,
                content_length,
            )
            self._json(result)
        except Exception as error:
            self._ingest_error(error)

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        try:
            match = re.fullmatch(r"/api/ingest/sessions/([0-9a-f]+)", parsed.path)
            if not match:
                self._json({"error": "not_found"}, HTTPStatus.NOT_FOUND)
                return
            self._json(self.server.service.incremental_ingest.abort(match.group(1)))
        except Exception as error:
            self._ingest_error(error)


def create_server(
    paths: RuntimePaths,
    host: str = "127.0.0.1",
    port: int = 8765,
    quiet: bool = False,
) -> NeuropixelHTTPServer:
    service = CatalogService(paths)
    return NeuropixelHTTPServer((host, port), service, paths.static_root, quiet=quiet)
