"""Reproduce the Allen VBN quickstart's active-change V1 PSTH from NWB.

This is a single-session positive control, not a reproduction of the complete
Cell paper's sensory-cohort and engagement-matched population statistics.
SPDX-License-Identifier: MIT
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import h5py
import numpy as np


def strings(values):
    return np.asarray([value.decode() if isinstance(value, bytes) else str(value) for value in values])


def psth(spikes, events, edges):
    """Mean spikes/s in half-open event-relative bins, using sorted spike times."""
    positions = np.searchsorted(spikes, events[:, None] + edges[None, :], side="left")
    return np.diff(positions, axis=1).sum(axis=0) / len(events) / np.diff(edges)


def reference_psth(spikes, events, edges):
    """Independent histogram implementation for validating the binned counts."""
    counts = np.zeros(len(edges) - 1, dtype=np.int64)
    relative_edges = edges - edges[0]
    for event in events:
        start, stop = event + edges[0], event + edges[-1]
        selected = spikes[np.searchsorted(spikes, start):np.searchsorted(spikes, stop)]
        counts += np.histogram(selected - start, bins=relative_edges)[0]
    return counts / len(events) / np.diff(edges)


def analyze(nwb, output: Path):
    output.mkdir(parents=True, exist_ok=True)
    with h5py.File(nwb, "r") as source:
        session_id = str(source["identifier"].asstr()[()])
        units, electrodes = source["units"], source["general/extracellular_ephys/electrodes"]
        channels = {int(channel): index for index, channel in enumerate(electrodes["id"][:])}
        peaks = np.asarray([channels[int(channel)] for channel in units["peak_channel_id"][:]])
        regions = strings(electrodes["location"][:])[peaks]
        depths = electrodes["probe_vertical_position"][:][peaks]
        selected = np.flatnonzero((regions == "VISp") & (units["snr"][:] > 1)
                                 & (units["isi_violations"][:] < 1) & (units["firing_rate"][:] > .1))
        selected = selected[np.argsort(-depths[selected], kind="stable")]
        presentations = [group for group in source["intervals"].values()
                         if "image_name" in group and "active" in group and "is_change" in group]
        if not presentations or not len(selected):
            raise ValueError("This session has no V1 units or active image-change table")
        events = np.sort(np.concatenate([g["start_time"][:][g["active"][:] & (g["is_change"][:] == 1)] for g in presentations]))
        if not len(events) or not np.all(np.isfinite(events)):
            raise ValueError("No valid active image-change timestamps")
        # Matches the official quickstart: [-1, 1.5) seconds, 10 ms bins.
        edges = np.arange(251, dtype=float) * .01 - 1
        stops = units["spike_times_index"][:].astype(np.int64)
        starts = np.r_[0, stops[:-1]]
        responses, checks = [], []
        for order, index in enumerate(selected):
            spikes = units["spike_times"][starts[index]:stops[index]]
            if not np.all(np.isfinite(spikes)) or np.any(np.diff(spikes) < 0):
                raise ValueError("NWB unit spike times must be finite and sorted")
            response = psth(spikes, events, edges)
            if order in {0, len(selected) // 2, len(selected) - 1}:
                error = float(np.max(np.abs(response - reference_psth(spikes, events, edges))))
                if error > 1e-8:
                    raise ValueError("Independent PSTH implementations disagree")
                checks.append({"unit_id": int(units["id"][index]), "max_abs_rate_error_hz": error})
            responses.append(response)
        responses = np.asarray(responses)
        unit_ids = units["id"][:][selected]
        np.savez(output / "v1-active-change-psth.npz", unit_ids=unit_ids, bin_edges_s=edges,
                 firing_rate_hz=responses, event_times_s=events, depth_um=depths[selected])
        np.savetxt(output / "v1-population-psth.csv", np.c_[edges[:-1], responses.mean(axis=0)],
                   delimiter=",", header="time_from_change_s,mean_unit_firing_rate_hz", comments="")
        result = {
            "analysis": "Allen VBN quickstart V1 active image-change PSTH", "session_id": session_id,
            "source": "https://allensdk.readthedocs.io/en/latest/_static/examples/nb/visual_behavior_neuropixels_quickstart.html",
            "unit_filter": "VISp; snr > 1; isi_violations < 1; firing_rate > 0.1; no additional quality filter",
            "unit_count": len(unit_ids), "active_change_count": len(events),
            "time_window_s": [-1, 1.5], "bin_size_s": .01, "bin_convention": "[start, end)",
            "independent_histogram_checks": checks,
            "baseline_mean_hz": float(responses[:, 95:100].mean()),
            "response_20_100ms_mean_hz": float(responses[:, 102:110].mean()),
            "first_active_change_s": float(events[0]),
            "scope": "Single-session tutorial reproduction; units are not independent animals; no inferential population claim.",
            "paper_replication_gaps": ["sensory cluster selection", "engagement and image matching", "running-speed controls", "multi-mouse statistics"]}
        (output / "analysis-summary.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.4), constrained_layout=True)
    image = axes[0].imshow(responses, aspect="auto", extent=(-1, 1.5, len(unit_ids), 0),
                           vmin=np.percentile(responses, .1), vmax=np.percentile(responses, 99.9), cmap="magma")
    fig.colorbar(image, ax=axes[0], label="Spikes/s")
    axes[0].set(ylabel="V1 unit, ordered by peak-channel depth", title=f"{len(unit_ids)} units; {len(events)} active changes")
    axes[1].plot(edges[:-1], responses.mean(axis=0), color="#126b80", linewidth=1.7)
    axes[1].set(ylabel="Mean unit firing rate (spikes/s)", title="Within-session population mean")
    for axis in axes:
        axis.axvline(0, color="#777777", linestyle="--", linewidth=1)
        axis.set_xlabel("Time from image change (s)")
    fig.suptitle(f"Allen VBN {session_id} | Official tutorial positive control")
    fig.savefig(output / "v1-active-change-psth.png", dpi=180)
    fig.savefig(output / "v1-active-change-psth.pdf")
    plt.close(fig)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--nwb", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(analyze(args.nwb, args.output), indent=2))


if __name__ == "__main__":
    main()
