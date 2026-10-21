from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "server"))
from neuropixels_explorer.template_footprint import template_footprint


class TemplateFootprintTests(unittest.TestCase):
    def fixture(self):
        return dict(spike_clusters=np.array([7, 7, 7, 7, 8]),
                    spike_templates=np.array([1, 0, 1, 0, 1]),
                    templates=np.array([[[0, 2], [-3, 4], [1, 0]], [[0, 1], [2, 0], [0, 3]]]),
                    channel_positions=np.array([[0., 0.], [20., 100.]]),
                    channel_map=np.array([31, 4]), template_indices=np.array([[0, 1], [0, 1]]),
                    channel_probe_groups=np.array([0, 1]))

    def test_identity_values_and_provenance(self):
        arrays = self.fixture()
        before = {k: a.copy() for k, a in arrays.items()}
        result = template_footprint(arrays, 7, 1000)
        self.assertEqual(result["status"], "available")
        self.assertEqual(result["templateId"], 0)  # lower ID wins tie
        self.assertEqual((result["templateSpikeCount"], result["unitSpikeCount"], result["templateCount"]), (2, 4, 2))
        self.assertEqual([c["peakToPeak"] for c in result["channels"]], [4, 4])
        self.assertEqual([c["channelId"] for c in result["channels"]], [31, 4])
        self.assertEqual(result["channels"][0]["depthUm"], 0)
        self.assertEqual(result["channels"][0]["waveform"], [0, -3, 1])
        self.assertEqual(result["amplitudeUnit"], "stored")
        for key, value in before.items():
            np.testing.assert_equal(arrays[key], value)

    def test_unavailable_and_invalid_inputs(self):
        for missing in ("templates", "spike_templates", "channel_positions"):
            arrays = self.fixture(); del arrays[missing]
            self.assertNotEqual(template_footprint(arrays, 7, 1000)["status"], "available")
        self.assertEqual(template_footprint(self.fixture(), 99, 1000)["status"], "no_spikes")
        for key, value, status in (
            ("spike_templates", np.array([0, 1]), "invalid_assignments"),
            ("spike_templates", np.array([0, -1, 0, 1, 0]), "invalid_assignments"),
            ("channel_map", np.array([4, 4]), "invalid_channel_map"),
            ("template_indices", np.array([[1, 0], [0, 1]]), "unsupported_layout"),
            ("channel_positions", np.array([[0, 1]]), "unsupported_layout"),
        ):
            arrays = self.fixture(); arrays[key] = value
            self.assertEqual(template_footprint(arrays, 7, 1000)["status"], status)
        arrays = self.fixture(); arrays["channel_positions"][1, 1] = np.nan
        self.assertIsNone(template_footprint(arrays, 7, 1000)["channels"][1]["depthUm"])


if __name__ == "__main__":
    unittest.main()
