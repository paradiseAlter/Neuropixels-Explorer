from pathlib import Path
from contextlib import closing
import importlib.util
import hashlib
import json
import sqlite3
import sys
import tempfile
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
HAS_H5PY = importlib.util.find_spec("h5py") is not None


@unittest.skipUnless(HAS_H5PY, "Install the optional allen dependencies")
class AllenAdapterTests(unittest.TestCase):
    def test_physical_probe_and_original_spike_identity(self):
        import h5py
        from import_allen_probe import import_probe
        with tempfile.TemporaryDirectory(dir=ROOT / "runtime") as temporary:
            root = Path(temporary)
            nwb = root / "source.nwb"
            with h5py.File(nwb, "w") as f:
                f["identifier"] = "1234567890"
                f["session_description"] = "Synthetic adapter fixture"
                f["general/subject/subject_id"] = "fixture-mouse"
                device = f.create_group("general/devices/probeC")
                device.attrs["probe_id"] = 300
                device.attrs["sampling_rate"] = 30000.125
                e = f.create_group("general/extracellular_ephys/electrodes")
                for key, values in {"id": [40, 41, 42], "probe_id": [300, 300, 301],
                                    "probe_channel_number": [0, 1, 0], "location": [b"VISp", b"root", b"CA1"],
                                    "probe_horizontal_position": [0, 20, 0], "probe_vertical_position": [20, 40, 10]}.items():
                    e[key] = values
                units = f.create_group("units")
                for key, values in {"id": [1000000001, 1000000002, 1000000003], "peak_channel_id": [40, 41, 42],
                                    "quality": [b"good", b"noise", b"good"], "firing_rate": [1., 2., 1.],
                                    "spike_times_index": [2, 4, 5], "spike_times": [.123456789, 2.000003, .5, 1.5, .7]}.items():
                    units[key] = values
            source_bytes = nwb.read_bytes()
            database = root / "catalog.sqlite"
            video = root / "side.mp4"
            video.write_bytes(b"Synthetic media identity fixture; not a decoded video")
            clock = root / "side.clock.json"
            clock.write_text(json.dumps({"session_id": "1234567890",
                "video": {"sha256": hashlib.sha256(video.read_bytes()).hexdigest(), "duration_s": 3,
                          "fps": 60, "frame_count": 180, "width": 32, "height": 32},
                "timeMapping": {"offset_s": .1, "scale": 1, "matched_event_count": 179, "residual_rms_ms": 0,
                                "provenance": {"prefix_remux": False}}}))
            result = import_probe(nwb, root, database, "probeC", video, clock)
            self.assertEqual(nwb.read_bytes(), source_bytes)
            self.assertEqual((result["unit_count"], result["spike_count"]), (2, 4))
            folder = root / "derived/1234567890/probeC"
            np.testing.assert_allclose(np.load(folder / "spike_times.npy") / result["sample_rate_hz"],
                                       [.123456789, .5, 1.5, 2.000003], atol=1e-14, rtol=0)
            np.testing.assert_array_equal(np.load(folder / "spike_clusters.npy"), [1000000001, 1000000002, 1000000002, 1000000001])
            with closing(sqlite3.connect(database)) as c:
                self.assertEqual(c.execute("SELECT shank_count FROM probe_insertions").fetchone(), (1,))
                self.assertEqual(c.execute("SELECT COUNT(*) FROM channels").fetchone(), (2,))
                self.assertEqual(c.execute("SELECT kilosort_label FROM units ORDER BY cluster_id").fetchall(), [("good",), ("noise",)])
                self.assertEqual(c.execute("SELECT COUNT(*) FROM unit_locations WHERE brain_region_id IS NULL").fetchone(), (1,))
                self.assertEqual(c.execute("PRAGMA foreign_key_check").fetchall(), [])
                self.assertEqual(c.execute("SELECT is_original,byte_size FROM data_assets WHERE asset_role='video'").fetchone(),
                                 (1, video.stat().st_size))
                self.assertEqual(c.execute("SELECT availability_status FROM signal_streams").fetchone(), ("declared_not_present",))

    def test_clock_compression_preserves_a_dropped_frame(self):
        from build_allen_video_clock import compress_clock
        video = np.arange(1000) / 60
        neural = 2 + video * .9999
        neural[12:] += 2 / 60
        neural += np.sin(video) * .00002
        x, y = compress_clock(video, neural, .0001)
        self.assertLessEqual(np.max(np.abs(np.interp(video, x, y) - neural)), .0001)
        self.assertGreaterEqual(len(x), 4)


if __name__ == "__main__":
    unittest.main()
