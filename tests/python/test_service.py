from __future__ import annotations

import json
import sqlite3
import sys
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))

from neuropixels_explorer.migrations import initialize_database
from neuropixels_explorer.paths import RuntimePaths
from neuropixels_explorer.service import CatalogService, create_server


TEST_RUNTIME = ROOT / "runtime" / "tests"


def _temporary_directory() -> tempfile.TemporaryDirectory[str]:
    TEST_RUNTIME.mkdir(parents=True, exist_ok=True)
    return tempfile.TemporaryDirectory(dir=TEST_RUNTIME)


def _write_fixture(root: Path, *, missing_roles: set[str] | None = None) -> tuple[Path, Path]:
    missing_roles = missing_roles or set()
    data_root = root / "runtime-data"
    recording_root = data_root / "recordings" / "rec_01"
    recording_root.mkdir(parents=True)

    arrays = {
        "spike_times.npy": np.array([0, 10, 20, 30, 40], dtype=np.int64),
        "spike_clusters.npy": np.array([7, 7, 8, 7, 8], dtype=np.int32),
        "amplitudes.npy": np.array([1.0, 2.0, 3.0, 4.0, 5.0], dtype=np.float32),
        "spike_positions.npy": np.array(
            [[0, 100], [0, 110], [20, 200], [0, 120], [20, 210]], dtype=np.float32
        ),
        "spike_templates.npy": np.array([0, 0, 1, 0, 1], dtype=np.int32),
        "templates.npy": np.array(
            [
                [[0, 0], [4, 1], [0, 0]],
                [[0, 0], [1, 5], [0, 0]],
            ],
            dtype=np.float32,
        ),
        "channel_positions.npy": np.array([[0, 100], [20, 200]], dtype=np.float32),
    }
    roles = {
        "spike_times.npy": "spike_times",
        "spike_clusters.npy": "spike_clusters",
        "amplitudes.npy": "spike_amplitudes",
        "spike_positions.npy": "spike_positions",
        "spike_templates.npy": "spike_templates",
        "templates.npy": "templates",
        "channel_positions.npy": "channel_positions",
    }
    for filename, array in arrays.items():
        if roles[filename] not in missing_roles:
            np.save(recording_root / filename, array)
    video_path = recording_root / "synthetic-validation.mp4"
    video_path.write_bytes(bytes(range(256)) * 8)

    database = root / "runtime" / "catalog.sqlite"
    initialize_database(database)
    with sqlite3.connect(database) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute(
            """
            INSERT INTO datasets(
                dataset_id, dataset_name, source_data_origin, import_status,
                storage_policy, schema_version, created_at_utc, updated_at_utc
            ) VALUES ('fixture', 'Portable fixture', 'synthetic_test', 'ready',
                      'register_in_place', 3, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
            """
        )
        connection.execute(
            """
            INSERT INTO ingest_runs(
                ingest_run_id, dataset_id, started_at_utc, completed_at_utc, status,
                importer_version, source_root_uri, recording_count, unit_count, asset_count
            ) VALUES ('fixture:import', 'fixture', '2026-01-01T00:00:00Z',
                      '2026-01-01T00:00:00Z', 'completed', 'fixture', 'project://', 1, 2, 7)
            """
        )
        connection.execute(
            """
            INSERT INTO recordings(
                recording_id, dataset_id, recording_index, legacy_kilosort_folder,
                source_data_origin, source_processing_stage, student_modified_source_data,
                sample_rate_hz, recording_duration_s, spike_count, cluster_count,
                good_unit_count, independence_status
            ) VALUES ('rec_01', 'fixture', 1, 'rec_01', 'synthetic_test', 'kilosort_output',
                      0, 10.0, 4.0, 5, 2, 2, 'synthetic_test')
            """
        )
        connection.execute(
            """
            INSERT INTO probe_insertions(
                probe_insertion_id, recording_id, probe_name, shank_count,
                coordinate_system, trajectory_status, metadata_json
            ) VALUES ('rec_01:probe_1', 'rec_01', 'Probe 1', 1,
                      'kilosort_probe_um', 'probe_geometry_only', '{"source_group_id":0}')
            """
        )
        for channel, (x_value, y_value) in enumerate(((0, 100), (20, 200))):
            connection.execute(
                """
                INSERT INTO channels(
                    channel_id, probe_insertion_id, recording_channel, electrode_index,
                    shank_id, x_um, y_um
                ) VALUES (?, 'rec_01:probe_1', ?, ?, 0, ?, ?)
                """,
                (f"rec_01:channel_{channel}", channel, channel, x_value, y_value),
            )
        connection.execute(
            """
            INSERT INTO brain_regions(
                brain_region_id, atlas_name, atlas_version, acronym,
                display_name, color_hex, annotation_status
            ) VALUES ('fixture:VISp', 'Allen CCF', 'fixture', 'VISp',
                      'Primary visual area', '#08858C', 'manual')
            """
        )
        for cluster_id, spike_count, rate in ((7, 3, 0.75), (8, 2, 0.5)):
            unit_id = f"rec_01_unit_{cluster_id:04d}"
            connection.execute(
                """
                INSERT INTO units(
                    unit_id, recording_id, cluster_id, spike_count, recording_duration_s,
                    unit_firing_rate_hz, kilosort_label, is_good_unit, is_neural_brain_region
                ) VALUES (?, 'rec_01', ?, ?, 4.0, ?, 'good', 1, 1)
                """,
                (unit_id, cluster_id, spike_count, rate),
            )
            connection.execute(
                """
                INSERT INTO unit_locations(
                    unit_id, probe_insertion_id, peak_channel_id, brain_region_id,
                    probe_depth_um, shank_id, location_source, atlas_registration_status
                ) VALUES (?, 'rec_01:probe_1', ?, 'fixture:VISp', ?, 0,
                          'synthetic_fixture', 'atlas_registered')
                """,
                (
                    unit_id,
                    f"rec_01:channel_{0 if cluster_id == 7 else 1}",
                    110 if cluster_id == 7 else 205,
                ),
            )
        connection.execute(
            """
            INSERT INTO probe_atlas_sites(
                probe_atlas_site_id, dataset_id, source_group_id, electrode_index,
                depth_um, brain_region_id, coordinate_system, mapping_source
            ) VALUES ('fixture:site_0', 'fixture', 0, 0, 100, 'fixture:VISp',
                      'kilosort_probe_um', 'project://region-map.csv')
            """
        )
        for filename, role in roles.items():
            path = recording_root / filename
            is_missing = role in missing_roles
            relative = path.relative_to(data_root).as_posix()
            connection.execute(
                """
                INSERT INTO data_assets(
                    dataset_id, recording_id, asset_role, media_type, storage_backend,
                    storage_uri, relative_path, filename, extension, byte_size,
                    checksum_status, availability_status, source_data_origin,
                    processing_stage, is_original
                ) VALUES ('fixture', 'rec_01', ?, 'application/x-npy', 'project_file',
                          ?, ?, ?, '.npy', ?, 'not_computed', ?,
                          'synthetic_test', 'test_fixture', 1)
                """,
                (
                    role,
                    f"declared://rec_01/{filename}" if is_missing else f"project://{relative}",
                    None if is_missing else relative,
                    filename,
                    None if is_missing else path.stat().st_size,
                    "missing" if is_missing else "available",
                ),
            )
        video_relative = video_path.relative_to(data_root).as_posix()
        cursor = connection.execute(
            """
            INSERT INTO data_assets(
                dataset_id, recording_id, asset_role, media_type, storage_backend,
                storage_uri, relative_path, filename, extension, byte_size,
                checksum_status, availability_status, source_data_origin,
                processing_stage, is_original
            ) VALUES ('fixture', 'rec_01', 'video', 'video/mp4', 'project_file',
                      ?, ?, 'synthetic-validation.mp4', '.mp4', ?, 'not_computed',
                      'available', 'synthetic_test', 'test_fixture', 1)
            """,
            (f"project://{video_relative}", video_relative, video_path.stat().st_size),
        )
        video_asset_id = int(cursor.lastrowid)
        connection.execute(
            """
            INSERT INTO video_streams(
                video_stream_id, dataset_id, recording_id, source_asset_id,
                video_name, duration_s, frame_rate_hz, frame_count,
                width_px, height_px, codec, timestamp_source, availability_status,
                metadata_json
            ) VALUES ('rec_01:video:synthetic', 'fixture', 'rec_01', ?,
                      'Synthetic validation', 4.0, 30.0, 120, 640, 360,
                      'fixture-bytes', 'synthetic_frame_clock', 'available', '{}')
            """,
            (video_asset_id,),
        )
        connection.execute(
            """
            INSERT INTO time_mappings(
                time_mapping_id, dataset_id, source_type, source_id,
                target_type, target_id, mapping_method, offset_s, scale,
                drift_ppm, matched_event_count, residual_rms_ms,
                verification_status, provenance_json
            ) VALUES ('fixture:video-map', 'fixture', 'video_stream',
                      'rec_01:video:synthetic', 'event_stream', 'rec_01:neural-clock',
                      'frame_timestamps', 0, 1, 0, 120, 0,
                      'verified', '{"source":"synthetic_fixture"}')
            """
        )
        connection.commit()
    return data_root, database


class ServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = _temporary_directory()
        self.root = Path(self.temporary.name)
        data_root, database = _write_fixture(self.root)
        self.paths = RuntimePaths.from_arguments(
            data_root=data_root,
            database_path=database,
            static_root=ROOT,
        )
        self.service = CatalogService(self.paths)

    def tearDown(self) -> None:
        self.service.close()
        self.temporary.cleanup()

    def test_catalog_and_review_match_the_frontend_contract(self) -> None:
        catalog = self.service.catalog()
        self.assertEqual(catalog["dataset"]["dataset_id"], "fixture")
        self.assertEqual(len(catalog["recordings"]), 1)
        self.assertEqual(len(catalog["recordings"][0]["units"]), 2)
        self.assertTrue(catalog["probeTrack"]["valid"])
        self.assertEqual(len(catalog["videos"]), 1)
        self.assertEqual(catalog["videos"][0]["timeMapping"]["verification_status"], "verified")
        self.assertTrue(catalog["videos"][0]["mediaUrl"].endswith("/media"))

        review = self.service.unit_review("rec_01_unit_0007")
        self.assertEqual(review["spikeCount"], 3)
        self.assertEqual(review["peakChannel"], 0)
        self.assertEqual(review["shankId"], 0)
        self.assertEqual(review["physicalProbeId"], 0)
        self.assertEqual(review["channelShankIds"], review["channelProbeIds"])
        self.assertEqual(len(review["templateWaveform"]), 3)
        self.assertFalse(review["server"]["unitCacheHit"])
        self.assertTrue(self.service.unit_review("rec_01_unit_0007")["server"]["unitCacheHit"])

    def test_http_api_and_static_application_share_one_release(self) -> None:
        server = create_server(self.paths, port=0, quiet=True)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            with urllib.request.urlopen(f"{base}/api/health", timeout=10) as response:
                health = json.load(response)
            self.assertEqual(health["status"], "ok")
            self.assertEqual(health["dataset"]["schema_version"], 3)
            with urllib.request.urlopen(f"{base}/api/catalog", timeout=10) as response:
                self.assertEqual(json.load(response)["dataset"]["dataset_id"], "fixture")
            request = urllib.request.Request(
                f"{base}/api/videos/rec_01%3Avideo%3Asynthetic/media",
                headers={"Range": "bytes=10-19"},
            )
            with urllib.request.urlopen(request, timeout=10) as response:
                self.assertEqual(response.status, 206)
                self.assertEqual(response.headers["Content-Range"], "bytes 10-19/2048")
                self.assertEqual(response.read(), bytes(range(10, 20)))
            with urllib.request.urlopen(f"{base}/", timeout=10) as response:
                html = response.read().decode("utf-8")
            self.assertIn("Neuropixels Explorer", html)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)

    def test_registered_assets_cannot_escape_the_runtime_data_root(self) -> None:
        database = self.paths.database_path
        with sqlite3.connect(database) as connection:
            connection.execute(
                "UPDATE data_assets SET relative_path = '../outside.npy' WHERE asset_role = 'spike_times'"
            )
            connection.commit()
        fresh = CatalogService(self.paths)
        with self.assertRaisesRegex(ValueError, "escapes"):
            fresh.unit_review("rec_01_unit_0007")


if __name__ == "__main__":
    unittest.main()
