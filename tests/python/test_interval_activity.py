import unittest
import numpy as np
from neuropixels_explorer.interval_activity import IntervalActivityIndex


class IntervalActivityTests(unittest.TestCase):
    def test_unsorted_samples_half_open_bounds_and_empty_units(self):
        samples = np.array([40, 10, 20, 0, 30, 20])
        clusters = np.array([8, 7, 8, 7, 7, 7])
        original = samples.copy()
        index = IntervalActivityIndex(samples, clusters, 10)
        result = index.counts(1, 3, [7, 8, 9])
        self.assertEqual([u['spikeCount'] for u in result], [2, 1, 0])
        self.assertEqual([u['rateHz'] for u in result], [1, .5, 0])
        np.testing.assert_array_equal(samples, original)
        self.assertEqual(index.counts(0, 4, [7])[0]['spikeCount'], 4)

    def test_reject_invalid_intervals(self):
        index = IntervalActivityIndex(np.array([]), np.array([]), 10)
        for start, end in [(1, 1), (2, 1), (float('nan'), 2), (0, float('inf'))]:
            with self.assertRaises(ValueError):
                index.counts(start, end, [7])

    def test_matches_brute_force_for_many_queries(self):
        rng = np.random.default_rng(42)
        samples = rng.integers(0, 10000, size=20000)
        clusters = rng.integers(0, 20, size=20000)
        index = IntervalActivityIndex(samples, clusters, 1000)
        for start, end in [(0, 10), (.0105, .0456), (4.3, 9.2), (5, 5.001)]:
            for unit in index.counts(start, end, list(range(21))):
                expected = int(np.count_nonzero((clusters == unit['id']) & (samples/1000 >= start) & (samples/1000 < end)))
                self.assertEqual(unit['spikeCount'], expected)
