"""Read-only dense Kilosort template evidence, in stored (not calibrated) units."""
from __future__ import annotations

import numpy as np


def template_footprint(arrays, cluster_id, sample_rate):
    result = {"status": "missing_templates", "channels": [], "amplitudeUnit": "stored",
              "scope": "recording_template", "source": "templates.npy", "templateId": None}
    templates = arrays.get("templates")
    assignments = arrays.get("spike_templates")
    clusters = arrays.get("spike_clusters")
    if templates is None or assignments is None:
        return result
    if clusters is None or assignments.size != clusters.size:
        return {**result, "status": "invalid_assignments"}
    assigned = np.asarray(assignments).reshape(-1)[np.asarray(clusters).reshape(-1) == cluster_id]
    if not assigned.size:
        return {**result, "status": "no_spikes"}
    if not np.all(np.isfinite(assigned)) or not np.all(assigned == np.floor(assigned)):
        return {**result, "status": "invalid_assignments"}
    ids, counts = np.unique(assigned, return_counts=True)
    template_id = int(ids[np.argmax(counts)])  # stable lower-ID tie break
    if templates.ndim != 3 or np.any(ids < 0) or np.any(ids >= templates.shape[0]):
        return {**result, "status": "invalid_assignments"}
    samples, channels = templates.shape[1:]
    positions = arrays.get("channel_positions")
    if positions is None:
        return {**result, "status": "missing_geometry"}
    if (positions.ndim != 2 or positions.shape[0] != channels or positions.shape[1] < 2
            or samples < 2 or channels < 1 or samples * channels > 2_000_000):
        return {**result, "status": "unsupported_layout"}
    indices = arrays.get("template_indices")
    # Kilosort's plural templates_ind is a dense identity layout, not Phy's
    # singular sparse template_ind. Never silently reinterpret a sparse export.
    if indices is not None and (indices.shape != (templates.shape[0], channels)
                               or not np.array_equal(indices[template_id], np.arange(channels))):
        return {**result, "status": "unsupported_layout"}
    channel_map = arrays.get("channel_map")
    if channel_map is not None:
        channel_map = np.asarray(channel_map).reshape(-1)
        if (channel_map.size != channels or not np.all(np.isfinite(channel_map))
                or not np.all(channel_map == np.floor(channel_map)) or np.any(channel_map < 0)
                or np.unique(channel_map).size != channels):
            return {**result, "status": "invalid_channel_map"}
    template = np.asarray(templates[template_id], dtype=float)
    if not np.all(np.isfinite(template)) or not np.isfinite(sample_rate) or sample_rate <= 0:
        return {**result, "status": "invalid_values"}
    shanks = arrays.get("channel_probe_groups")
    shanks = np.asarray(shanks).reshape(-1) if shanks is not None else np.array([])
    finite = lambda v: float(v) if np.isfinite(v) else None
    return {**result, "status": "available", "templateId": template_id,
            "templateCount": int(ids.size), "templateSpikeCount": int(counts.max()),
            "unitSpikeCount": int(assigned.size), "sampleRate": float(sample_rate),
            "sampleCount": samples, "peakChannelIndex": int(np.argmax(np.ptp(template, axis=0))),
            "channels": [{"index": c, "channelId": int(channel_map[c]) if channel_map is not None else None,
                          "xUm": finite(positions[c, 0]), "depthUm": finite(positions[c, 1]),
                          "shankId": int(shanks[c]) if c < shanks.size and np.isfinite(shanks[c]) and shanks[c] >= 0 else None,
                          "peakToPeak": float(np.ptp(template[:, c])), "waveform": template[:, c].tolist()}
                         for c in range(channels)]}
