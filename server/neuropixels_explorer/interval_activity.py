"""Exact half-open interval counts, with a reusable per-Unit time index."""
from __future__ import annotations

import numpy as np


class IntervalActivityIndex:
    def __init__(self, samples: np.ndarray, clusters: np.ndarray, sample_rate: float) -> None:
        times = np.asarray(samples).reshape(-1)
        ids = np.asarray(clusters).reshape(-1)
        if times.size != ids.size or not np.isfinite(sample_rate) or sample_rate <= 0:
            raise ValueError("Invalid spike arrays or sample rate")
        if not np.all(np.isfinite(times)) or np.any(times < 0):
            raise ValueError("Spike times must be finite and nonnegative")
        # One preprocessing pass, outside browser rendering. Queries then use
        # two binary searches per Unit, independent of the number of spikes.
        order = np.lexsort((times, ids))
        grouped_ids = ids[order]
        seconds = times[order].astype(np.float64) / sample_rate
        seconds.flags.writeable = False
        unique, starts, counts = np.unique(grouped_ids, return_index=True, return_counts=True)
        self.times = {int(unit): seconds[start:start + count] for unit, start, count in zip(unique, starts, counts)}

    def counts(self, start: float, end: float, unit_ids: list[int]) -> list[dict]:
        if not np.isfinite(start) or not np.isfinite(end) or end <= start:
            raise ValueError("Expected finite start < end")
        result = []
        for unit in unit_ids:
            times = self.times.get(int(unit))
            count = 0 if times is None else int(np.searchsorted(times, end, side="left") - np.searchsorted(times, start, side="left"))
            result.append({"id": int(unit), "spikeCount": count, "rateHz": count / (end - start)})
        return result
