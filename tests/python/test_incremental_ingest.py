from __future__ import annotations

import io
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))

from neuropixels_explorer.ingest import IncrementalIngestManager, IngestError
from neuropixels_explorer.paths import RuntimePaths
from neuropixels_explorer.service import CatalogService
from test_service import TEST_RUNTIME, _write_fixture


def _temporary_directory() -> tempfile.TemporaryDirectory[str]:
    TEST_RUNTIME.mkdir(parents=True, exist_ok=True)
    return tempfile.TemporaryDirectory(dir=TEST_RUNTIME)


def _npy_bytes(array: np.ndarray) -> bytes:
    stream = io.BytesIO()
    np.save(stream, array)
    return stream.getvalue()


TEMPLATES = np.array(
    [
        [[0, 0], [4, 1], [0, 0]],
        [[0, 0], [1, 5], [0, 0]],
    ],
    dtype=np.float32,
)


class IncrementalIngestTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = _temporary_directory()
        self.root = Path(self.temporary.name)
        data_root, database = _write_fixture(self.root, missing_roles={"templates"})
        self.paths = RuntimePaths.from_arguments(
            data_root=data_root,
            database_path=database,
            static_root=ROOT,
        )
        self.service = CatalogService(self.paths)

    def tearDown(self) -> None:
        self.service.close()
        self.temporary.cleanup()

    def _session(
        self,
        filename: str,
        payload: bytes,
        *,
        relative_path: str | None = None,
        role: str = "templates",
    ) -> str:
        created = self.service.incremental_ingest.create_session(
            {
                "sourceKind": "files",
                "expectedRecordingId": "rec_01",
                "expectedRoles": [role],
                "files": [
                    {
                        "name": filename,
                        "relativePath": relative_path or f"rec_01/{filename}",
                        "size": len(payload),
                        "lastModified": 0,
                    }
                ],
            }
        )
        session_id = created["sessionId"]
        self.service.incremental_ingest.upload_file(session_id, 0, io.BytesIO(payload), len(payload))
        return session_id

    def test_missing_template_can_be_added_without_losing_basic_spike_review(self) -> None:
        before = self.service.unit_review("rec_01_unit_0007")
        self.assertEqual(before["spikeCount"], 3)
        self.assertEqual(before["templateWaveform"], [])
        catalog = self.service.catalog()
        self.assertNotIn("templates", catalog["recordings"][0]["assetRoles"])

        payload = _npy_bytes(TEMPLATES)
        session_id = self._session("templates.npy", payload)
        committed = self.service.incremental_ingest.commit(session_id)

        self.assertEqual(committed["affectedRecordings"], ["rec_01"])
        self.assertEqual(committed["items"][0]["action"], "completed_missing")
        snapshot = self.service.recording_snapshot("rec_01")
        self.assertIn("templates", snapshot["recording"]["assetRoles"])
        after = self.service.unit_review("rec_01_unit_0007")
        self.assertEqual(len(after["templateWaveform"]), 3)
        self.assertFalse(after["server"]["unitCacheHit"])

        with sqlite3.connect(self.paths.database_path) as connection:
            asset = connection.execute(
                """
                SELECT relative_path, byte_size, checksum_algorithm, checksum,
                       checksum_status, availability_status, source_data_origin
                FROM data_assets
                WHERE recording_id = 'rec_01' AND asset_role = 'templates'
                """
            ).fetchone()
        self.assertEqual(asset[1], len(payload))
        self.assertEqual(asset[2], "sha256")
        self.assertEqual(len(asset[3]), 64)
        self.assertEqual(asset[4:7], ("verified", "available", "user_incremental"))
        self.assertTrue((self.paths.data_root / asset[0]).is_file())

    def test_duplicate_is_registered_once_and_conflict_is_not_overwritten(self) -> None:
        payload = _npy_bytes(TEMPLATES)
        first = self._session("templates.npy", payload)
        self.service.incremental_ingest.commit(first)
        with sqlite3.connect(self.paths.database_path) as connection:
            initial_count = connection.execute(
                "SELECT COUNT(*) FROM data_assets WHERE recording_id = 'rec_01' AND asset_role = 'templates'"
            ).fetchone()[0]
            initial_checksum = connection.execute(
                "SELECT checksum FROM data_assets WHERE recording_id = 'rec_01' AND asset_role = 'templates'"
            ).fetchone()[0]

        duplicate = self._session("templates.npy", payload)
        result = self.service.incremental_ingest.commit(duplicate)
        self.assertEqual(result["items"][0]["action"], "duplicate")
        self.assertEqual(result["affectedRecordings"], [])
        with sqlite3.connect(self.paths.database_path) as connection:
            self.assertEqual(
                connection.execute(
                    "SELECT COUNT(*) FROM data_assets WHERE recording_id = 'rec_01' AND asset_role = 'templates'"
                ).fetchone()[0],
                initial_count,
            )

        conflicting_payload = _npy_bytes(TEMPLATES + 1)
        conflict = self._session("templates.npy", conflicting_payload)
        with self.assertRaisesRegex(IngestError, "not overwritten"):
            self.service.incremental_ingest.commit(conflict)
        self.service.incremental_ingest.abort(conflict)
        with sqlite3.connect(self.paths.database_path) as connection:
            self.assertEqual(
                connection.execute(
                    "SELECT checksum FROM data_assets WHERE recording_id = 'rec_01' AND asset_role = 'templates'"
                ).fetchone()[0],
                initial_checksum,
            )

    def test_wrong_recording_and_shape_mismatch_are_explained(self) -> None:
        with sqlite3.connect(self.paths.database_path) as connection:
            connection.execute(
                """
                INSERT INTO recordings(
                    recording_id, dataset_id, recording_index, legacy_kilosort_folder,
                    source_data_origin, source_processing_stage, student_modified_source_data,
                    sample_rate_hz, recording_duration_s, spike_count, cluster_count,
                    good_unit_count, independence_status
                ) VALUES ('rec_02', 'fixture', 2, 'ks4_exp2', 'synthetic_test',
                          'kilosort_output', 0, 10.0, 4.0, 5, 0, 0, 'synthetic_test')
                """
            )
            connection.commit()
        payload = _npy_bytes(TEMPLATES)
        with self.assertRaises(IngestError) as wrong:
            self.service.incremental_ingest.create_session(
                {
                    "sourceKind": "folder",
                    "expectedRecordingId": "rec_01",
                    "expectedRoles": ["templates"],
                    "files": [
                        {
                            "name": "templates.npy",
                            "relativePath": "ks4_exp2/templates.npy",
                            "size": len(payload),
                        }
                    ],
                }
            )
        self.assertEqual(wrong.exception.code, "selection_rejected")
        self.assertIn("not rec_01", wrong.exception.details[0]["message"])

        invalid = _npy_bytes(np.zeros((2, 3, 3), dtype=np.float32))
        created = self.service.incremental_ingest.create_session(
            {
                "sourceKind": "files",
                "expectedRecordingId": "rec_01",
                "expectedRoles": ["templates"],
                "files": [
                    {
                        "name": "templates.npy",
                        "relativePath": "rec_01/templates.npy",
                        "size": len(invalid),
                    }
                ],
            }
        )
        with self.assertRaises(IngestError) as mismatch:
            self.service.incremental_ingest.upload_file(
                created["sessionId"], 0, io.BytesIO(invalid), len(invalid)
            )
        self.assertEqual(mismatch.exception.code, "shape_mismatch")
        self.assertIn("3 channels", str(mismatch.exception))
        self.service.incremental_ingest.abort(created["sessionId"])

    def test_fault_rolls_back_database_and_every_moved_file(self) -> None:
        self.service.close()
        data_root, database = _write_fixture(
            self.root / "rollback",
            missing_roles={"templates", "spike_positions"},
        )
        paths = RuntimePaths.from_arguments(data_root=data_root, database_path=database, static_root=ROOT)

        def fail_after_first_item(stage: str, index: int) -> None:
            if stage == "after_item" and index == 0:
                raise RuntimeError("injected transaction failure")

        manager = IncrementalIngestManager(paths, fault_injector=fail_after_first_item)
        templates = _npy_bytes(TEMPLATES)
        positions = _npy_bytes(
            np.array([[0, 100], [0, 110], [20, 200], [0, 120], [20, 210]], dtype=np.float32)
        )
        created = manager.create_session(
            {
                "sourceKind": "folder",
                "expectedRecordingId": "rec_01",
                "expectedRoles": ["templates", "spike_positions"],
                "files": [
                    {"name": "templates.npy", "relativePath": "rec_01/templates.npy", "size": len(templates)},
                    {"name": "spike_positions.npy", "relativePath": "rec_01/spike_positions.npy", "size": len(positions)},
                ],
            }
        )
        manager.upload_file(created["sessionId"], 0, io.BytesIO(templates), len(templates))
        manager.upload_file(created["sessionId"], 1, io.BytesIO(positions), len(positions))
        with self.assertRaisesRegex(RuntimeError, "injected"):
            manager.commit(created["sessionId"])

        with sqlite3.connect(database) as connection:
            statuses = dict(
                connection.execute(
                    "SELECT asset_role, availability_status FROM data_assets WHERE asset_role IN ('templates', 'spike_positions')"
                )
            )
            batch_count = connection.execute("SELECT COUNT(*) FROM incremental_ingest_batches").fetchone()[0]
        self.assertEqual(statuses, {"templates": "missing", "spike_positions": "missing"})
        self.assertEqual(batch_count, 0)
        self.assertFalse(any((data_root / "managed-assets").rglob("*.*")))
        manager.abort(created["sessionId"])
        manager.close()

        # tearDown may call close again; replace it with a fresh harmless service.
        self.service = CatalogService(self.paths)


if __name__ == "__main__":
    unittest.main()
