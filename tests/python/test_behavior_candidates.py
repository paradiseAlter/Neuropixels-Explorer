from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("behavior_candidates", Path(__file__).resolve().parents[2] / "scripts" / "behavior_candidates.py")
adapter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(adapter)


class BehaviorCandidateTests(unittest.TestCase):
    def test_half_open_bouts_keep_exact_boundaries(self):
        result = adapter.bouts(["a", "a", "b"], [0, .04, .09, .13])
        self.assertEqual(result, [{"start": 0, "end": .09, "group_id": "a"}, {"start": .09, "end": .13, "group_id": "b"}])

    def test_rejects_missing_frame_boundaries(self):
        with self.assertRaises(ValueError):
            adapter.bouts(["a", "b"], [0, .04])
        with self.assertRaises(ValueError):
            adapter.bouts(["a", "b"], [0, .04, .04])

    def test_external_syllables_need_explicit_clock(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "syllables.csv"
            path.write_text("frame,syllable\n0,1\n1,1\n2,2\n", encoding="utf-8")
            result, timing = adapter.keypoint_csv(path, .3, fps=10)
            self.assertEqual(len(result), 2)
            self.assertEqual(timing["verification_status"], "unverified")
            with self.assertRaises(ValueError):
                adapter.keypoint_csv(path, .3)
            with self.assertRaises(ValueError):
                adapter.keypoint_csv(path, .5, fps=10)
            boundary = Path(folder) / "clock.json"
            boundary.write_text(json.dumps([0, .08, .21, .3]))
            result, _ = adapter.keypoint_csv(path, .3, boundary_path=boundary)
            self.assertEqual(result[0]["end"], .21)
            boundary.write_text(json.dumps([100, 100.08, 100.21, 100.3]))
            with self.assertRaises(ValueError):
                adapter.keypoint_csv(path, .3, boundary_path=boundary)

    def test_sparse_syllable_files_are_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "syllables.csv"
            path.write_text("frame,syllable\n0,1\n2,2\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                adapter.keypoint_csv(path, .2, fps=10)


if __name__ == "__main__":
    unittest.main()
