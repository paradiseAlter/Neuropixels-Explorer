from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

import h5py
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))
from neuropixels_explorer.migrations import initialize_database
from neuropixels_explorer.paths import RuntimePaths
from neuropixels_explorer.service import CatalogService, create_server


def write_nwb(path):
    with h5py.File(path, "w") as f:
        f["identifier"] = "1234567890"
        f["session_description"] = "Adapter test fixture, not scientific data"
        f["general/subject/subject_id"] = "fixture"
        device = f.create_group("general/devices/probeC")
        device.attrs["probe_id"] = 300
        device.attrs["sampling_rate"] = 30000.125
        for key, values in {"id": [40, 41], "probe_id": [300, 300], "probe_channel_number": [0, 1],
                            "location": [b"VISp", b"root"], "probe_horizontal_position": [0, 20],
                            "probe_vertical_position": [0, 40]}.items():
            f["general/extracellular_ephys/electrodes/" + key] = values
        for key, values in {"id": [1000000001, 1000000002], "peak_channel_id": [40, 41],
                            "quality": [b"good", b"noise"], "firing_rate": [1., 2.],
                            "spike_times_index": [2, 4], "spike_times": [.123456789, 20.000003, .5, 11.5]}.items():
            f["units/" + key] = values


def write_kilosort(folder):
    folder.mkdir()
    for name, values in {"spike_times": np.array([0, 1000, 5000, 8000, 15000], dtype=np.int64),
                         "spike_clusters": np.array([0, 1, 0, 1, 0], dtype=np.int32),
                         "spike_templates": np.array([0, 1, 0, 1, 0], dtype=np.int32),
                         "templates": np.array([[[0, 0], [4, 1], [0, 0]], [[0, 0], [1, 5], [0, 0]]], dtype=np.float32),
                         "channel_positions": np.array([[0, 0], [20, 200]], dtype=np.float32),
                         "channel_shanks": np.array([0, 1], dtype=np.int32)}.items():
        np.save(folder / (name + ".npy"), values)
    (folder / "params.py").write_text("sample_rate = 1000\n", encoding="utf-8")
    (folder / "cluster_group.tsv").write_text("cluster_id\tgroup\n0\tgood\n1\tmua\n", encoding="utf-8")


class LocalProjectTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        data = self.root / "managed"
        data.mkdir()
        db = data / "catalog.sqlite"
        initialize_database(db)
        self.paths = RuntimePaths.from_arguments(data_root=data, database_path=db, static_root=ROOT, cache_root=data / "activity-cache")
        self.service = CatalogService(self.paths)

    def tearDown(self):
        self.service.close()
        self.temp.cleanup()

    def test_direct_nwb_import_preserves_original_identity_zero_coordinates_and_spikes(self):
        nwb = self.root / "test.nwb"
        write_nwb(nwb)
        original = nwb.read_bytes()
        candidates = self.service.local_projects.select_path("nwb", nwb)["candidates"]
        result = self.service.local_projects.import_candidate(candidates[0]["candidateId"])
        recording = result["recordingId"]
        self.assertEqual(nwb.read_bytes(), original)
        review = self.service.unit_review(recording + ":unit:1000000001")
        self.assertEqual(review["peakChannelPosition"], {"x": 0., "y": 0.})
        self.assertEqual(review["physicalProbeId"], 0)
        np.testing.assert_allclose(review["spikeTimes"], [.123456789, 20.000003], atol=1e-14, rtol=0)
        overview = self.service.activity_overview(recording, 128)
        self.assertEqual(overview["unitDepths"], [0., 40.])
        self.assertEqual(overview["unitX"], [0., 20.])
        self.assertEqual(self.service.catalog()["recordings"][0]["units"][0]["brain_region"], "VISp")
        repeated = self.service.local_projects.import_candidate(candidates[0]["candidateId"])
        self.assertEqual(repeated["recordingId"], recording)
        with h5py.File(nwb, "r+") as f:
            f["units/spike_times"][0] = .2
        with self.assertRaisesRegex(ValueError, "differs from the source"):
            self.service.local_projects.import_candidate(candidates[0]["candidateId"])

    def test_kilosort_registers_in_place_and_reopens_separate_video(self):
        folder = self.root / "Kilosort outside project"
        write_kilosort(folder)
        original = ((folder / "spike_times.npy").resolve()).read_bytes()
        candidates = self.service.local_projects.select_path("folder", folder)["candidates"]
        result = self.service.local_projects.import_candidate(candidates[0]["candidateId"])
        recording = result["recordingId"]
        overview = self.service.activity_overview(recording, 128)
        self.assertEqual(overview["unitDepths"], [0., 200.])
        self.assertEqual(overview["unitShankIds"], [0, 1])
        self.assertEqual(((folder / "spike_times.npy").resolve()).read_bytes(), original)
        self.assertEqual(self.service._asset_paths(recording)["spike_times"], (folder / "spike_times.npy").resolve())
        video = self.root / "separately-stored.webm"
        video.write_bytes(b"File-grant fixture; browser decoding is tested separately")
        attached = self.service.local_projects.attach_video(recording, video)
        token = attached["video"]["video_stream_id"]
        self.assertEqual(self.paths.resolve_asset("@local/" + token), video.resolve())
        self.assertEqual(attached["video"]["timeMapping"]["verification_status"], "unverified")
        reloaded = CatalogService(self.paths)
        try:
            recent = reloaded.local_projects.recent()["projects"][0]
            self.assertEqual(recent["videos"][recording]["video_stream_id"], token)
            reloaded.local_projects.update_mapping({"recordingId": recording, "offset": 2.5})
            self.assertEqual(reloaded.local_projects.recent()["projects"][0]["videos"][recording]["timeMapping"]["offset_s"], 2.5)
        finally:
            reloaded.close()
        video.write_bytes(b"Changed media")
        with self.assertRaisesRegex(ValueError, "source has changed"):
            self.paths.resolve_asset("@local/" + token)
        with self.assertRaises(ValueError):
            self.paths.resolve_asset("@local/../../test.nwb")

    def test_unknown_location_does_not_become_zero(self):
        folder = self.root / "minimal"
        folder.mkdir()
        np.save(folder / "spike_times.npy", np.array([100, 1000]))
        np.save(folder / "spike_clusters.npy", np.array([7, 7]))
        candidate = self.service.local_projects.select_path("folder", folder)["candidates"][0]
        self.assertIsNone(candidate["sampleRate"])
        with self.assertRaisesRegex(ValueError, "Sampling rate"):
            self.service.local_projects.import_candidate(candidate["candidateId"])
        recording = self.service.local_projects.import_candidate(candidate["candidateId"], 1000)["recordingId"]
        review = self.service.unit_review(recording + ":unit:7")
        self.assertIsNone(review["peakChannelPosition"])
        self.assertIsNone(review["unitLocations"][0]["y"])
        self.assertEqual(self.service.activity_overview(recording, 128)["unitDepths"], [None])

    def test_clock_identity_and_monotonicity_are_validated_before_save(self):
        folder = self.root / "kilo"
        write_kilosort(folder)
        candidate = self.service.local_projects.select_path("folder", folder)["candidates"][0]
        recording = self.service.local_projects.import_candidate(candidate["candidateId"])["recordingId"]
        video = self.root / "sample.webm"
        video.write_bytes(b"clock identity fixture")
        self.service.local_projects.attach_video(recording, video)
        mapping = {"method": "frame_timestamps", "offset_s": 2, "scale": 1, "verification_status": "verified",
                   "provenance": {"frame_clock": {"video_s": [0, 1], "neural_s": [2, 3]}}}
        clock = {"video": {"sha256": hashlib.sha256(video.read_bytes()).hexdigest(), "fps": 60}, "timeMapping": mapping}
        result = self.service.local_projects.update_mapping({"recordingId": recording, "clock": clock})
        self.assertEqual(result["video"]["timeMapping"]["verification_status"], "verified")
        clock = json.loads(json.dumps(clock))
        clock["timeMapping"]["provenance"]["frame_clock"]["neural_s"] = [2, 1]
        with self.assertRaisesRegex(ValueError, "strictly increasing"):
            self.service.local_projects.update_mapping({"recordingId": recording, "clock": clock})
        self.assertEqual(self.service.local_projects.recent()["projects"][0]["videos"][recording]["timeMapping"]["provenance"]["frame_clock"]["neural_s"], [2, 3])
        shifted = self.service.local_projects.update_mapping({"recordingId": recording, "offset": 4, "videoAt": .5, "neuralAt": 4.5})
        self.assertEqual(shifted["video"]["timeMapping"]["provenance"]["frame_clock"]["neural_s"], [4., 5.])
        self.assertEqual(shifted["video"]["timeMapping"]["verification_status"], "unverified")

    def test_native_picker_boundary_rejects_foreign_origin(self):
        server = create_server(self.paths, host="127.0.0.1", port=0, quiet=True)
        server.service.local_projects.picker = lambda kind: None
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            request = urllib.request.Request(base + "/api/local/actions", data=b'{"kind":"nwb"}', headers={"Content-Type": "application/json", "Origin": "https://unrelated.example"})
            with self.assertRaises(urllib.error.HTTPError) as rejected:
                urllib.request.urlopen(request)
            self.assertEqual(rejected.exception.code, 403)
            request = urllib.request.Request(base + "/api/local/actions", data=b'{"kind":"nwb","path":"ignored-path.nwb"}', headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(request) as response:
                job = json.load(response)
            self.assertIn(job["status"], {"working", "cancelled"})
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
