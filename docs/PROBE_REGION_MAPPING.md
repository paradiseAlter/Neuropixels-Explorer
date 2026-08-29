# Probe-region mapping contract

Neuropixels Explorer accepts a CSV that maps a shank's depth positions to brain-region labels. The file is detected automatically when it is included anywhere inside the selected folder.

## Minimum usable schema

| Meaning | Accepted column names | Rule |
| --- | --- | --- |
| Shank / track group | `shank`, `shaft`, `probe`, `probe_id`, `physical_probe_id` | Integer ID; `0`–`3` are Shank 1–4 on one physical Probe in the current acquisition. The Probe-named aliases are retained for legacy CSV compatibility. |
| Probe depth | `depth_um`, `probe_depth_um`, `depth`, `y_um`, `probe_y_um` | Numeric micrometers in the same coordinate frame as KiloSort channel positions |
| Brain region | `region`, `brain_region`, `region_acronym`, `atlas_region`, `structure`, `area` | Non-empty acronym or name |

With these three fields the Explorer groups samples by shank, sorts them by depth, and compresses consecutive identical labels into colored track segments.

## Recommended fields

| Meaning | Accepted column names | Why it matters |
| --- | --- | --- |
| Electrode identity | `electrode`, `electrode_id`, `electrode_index`, `channel`, `channel_id` | Provides the strongest join to `channel_geometry.csv` and catches depth-coordinate mistakes |
| Atlas structure ID | `atlas_id`, `structure_id`, `ccf_structure_id` | Preserves an unambiguous atlas identity beyond a text acronym |
| Atlas color | `color`, `atlas_color`, `region_color`, `hex` | Six-digit RGB with or without `#`; avoids arbitrary UI colors |
| Recording scope | `experiment`, `recording_id`, `session_id` and accepted aliases | Required when the same Probe/depth has a different anatomical registration across sessions |
| Local geometry | `local`, `local_index`, `row`, `channel_row` | Useful for validation and reconstruction of the recorded channel window |

## Current validated example

`data/processed/legacy_tables/pinpoint_parsed.csv` has this header:

```text
electrode,atlas_id,region,color,shank,local,row,depth_um
```

It contains 5,120 unique electrode rows across four shanks on one physical Probe. Its absolute `depth_um` values align with the absolute channel depths in each KiloSort experiment's `channel_geometry.csv`, so the active Recording can display only the portion of each shank track covered by its channels.

## Validation rules

- Shank/track ID, depth, and region must parse on every usable row.
- Rows are ordered by shank and depth; CSV file order is not relied upon.
- Duplicate electrode IDs should be rejected by the data producer.
- Multiple labels at the same Probe/depth are reported as ambiguous.
- Missing or invalid colors use a neutral fallback; they do not invalidate the region label.
- `out` and `void` are kept as explicit non-neural intervals rather than silently removed.
- If a mapping is session-specific, include a Recording/experiment column. Never reuse a track across sessions merely because shank numbers match.

## What to request with future data

For another dataset, request:

1. all KiloSort output folders, including `channel_positions.npy`, `channel_shanks.npy`, and preferably `channel_geometry.csv`;
2. one shank-region CSV following the schema above;
3. the atlas name/version and coordinate convention;
4. separate physical-Probe and shank identities when more than one physical Probe is present;
5. for a 3D brain view, each Probe trajectory or per-channel Allen CCF coordinates plus registration provenance;
6. for video, frame timestamps and neural/video synchronization events or a documented time mapping.

The current depth-level CSV supports two-dimensional review of one physical Probe with multiple shanks in v3.3.0. It is not equivalent to a registered 3D trajectory, and its legacy single ID column is not sufficient to distinguish multiple physical Probes that reuse the same shank numbers.
