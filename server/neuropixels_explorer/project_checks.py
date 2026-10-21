"""Feature-oriented checks for local processed recordings."""
import numpy as np


def inspect_files(paths, rate, *, anatomy=False, locations=False, allen=False, video=None, issues=None):
    arrays, invalid = {}, dict(issues or {})
    for role in ("spike_times", "spike_clusters", "spike_positions", "templates", "spike_templates", "channel_positions", "template_indices"):
        if role in paths:
            try:
                arrays[role] = np.load(paths[role], mmap_mode="r", allow_pickle=False)
            except (OSError, ValueError) as error:
                invalid[role] = str(error)
    rows = []
    def add(key, ready, needs, detail=None):
        rows.append({"key": key, "ready": bool(ready), "files": needs, "detail": detail,
                     "missingFiles": [r + ".npy" for r in needs if r not in paths and r in {"spike_times", "spike_clusters", "templates", "spike_templates", "channel_positions", "spike_positions"}] if not ready else [],
                     "issues": {r: invalid[r] for r in invalid if r in needs}})
    times, clusters = arrays.get("spike_times"), arrays.get("spike_clusters")
    core = times is not None and clusters is not None and times.size == clusters.size and times.size > 0 and rate
    add("activity", core, ["spike_times", "spike_clusters", "sample_rate"], "allen_units" if allen else None)
    templates, assignments, positions = arrays.get("templates"), arrays.get("spike_templates"), arrays.get("channel_positions")
    dense = (templates is not None and templates.ndim == 3 and positions is not None and positions.ndim == 2
             and positions.shape[0] == templates.shape[2] and positions.shape[1] >= 2
             and assignments is not None and clusters is not None and assignments.size == clusters.size)
    if dense:
        dense = bool(np.isfinite(assignments).all() and np.all(assignments == np.floor(assignments))
                     and np.all(assignments >= 0) and np.all(assignments < templates.shape[0]))
        indices = arrays.get("template_indices")
        if indices is not None:
            dense = dense and indices.shape == (templates.shape[0], templates.shape[2]) and bool(np.all(indices == np.arange(templates.shape[2])))
    spike_positions = arrays.get("spike_positions")
    spatial = locations or (spike_positions is not None and clusters is not None and spike_positions.ndim == 2
                            and spike_positions.shape[0] == clusters.size and spike_positions.shape[1] >= 2) or dense
    add("spatial", core and spatial, ["spike_positions", "templates", "spike_templates", "channel_positions"], "allen_electrodes" if locations else None)
    add("template", core and dense, ["templates", "spike_templates", "channel_positions"], "allen_no_templates" if allen else "template_layout" if not dense and templates is not None and assignments is not None and positions is not None else None)
    add("anatomy", anatomy, ["unit_locations"], "allen_regions" if anatomy and allen else None)
    add("video", video, ["video"], "linked_video" if video else None)
    mapping = video.get("timeMapping") or {} if video else {}
    add("alignment", video and (mapping.get("verification_status") == "verified" or mapping.get("matched_event_count", 0) > 0), ["frame_clock"], "verified_clock" if mapping.get("verification_status") == "verified" else "manual_alignment" if mapping.get("matched_event_count", 0) else None)
    return rows
