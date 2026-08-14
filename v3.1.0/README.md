# Neuropixels Explorer v3.1.0

This version turns the validated v3.0.0 review surface into a more explicit two-mode Explorer and adds electrode-level brain-region bands to the physical Probe view.

## Open

Open `index.html` in Chrome, then drop or choose a complete project/session folder. No localhost service is required for the default HTML5 folder mode.

Optional database mode remains available through the project data service. It is an acceleration path, not a requirement for the standalone folder workflow.

## Review modes

- **Inspect** is the default. It keeps one primary Unit visually dominant and synchronizes its Unit list row, signal, Inspector plots, Probe marker, depth, and brain-region readout.
- **Compare** supports up to ten Unit signals. Adding a Unit with `+` enters Compare automatically. Time axes can remain linked or become independent.
- Comparison Units stay available when returning to Inspect, but they are hidden so the focused review remains uncluttered.

## Plot interactions

- **Cursor** is the default and reports time without modifying the window.
- **Zoom** and **Pan** operate only on the bottom time axis, so the signal body is not an oversized accidental interaction target.
- The wheel zooms around the pointer on the time axis.
- Double-clicking the time axis resets the active view.
- Back, zoom in/out, reset, overview navigation, and linked multi-Unit time windows remain available.

## Brain-region Probe tracks

The folder scanner now distinguishes two anatomical inputs:

1. a Unit-level table keyed by Recording/experiment and cluster ID;
2. an electrode- or depth-level Probe-region mapping used to draw continuous atlas-colored bands.

The current `pinpoint_parsed.csv` passed validation with:

- 5,120 electrode-to-atlas rows;
- four independent physical Probe IDs (`0`–`3`);
- Probe depths from 0 to 9,585 µm;
- 75 contiguous rendered region segments.

The Probe body remains neutral. Atlas colors are used only for anatomical segments; Unit dots retain the same color as their signal trace, and the focused Unit gets a white halo. `out` and `void` remain visibly muted.

See `PROBE_REGION_MAPPING.md` for the accepted file contract and the boundary between a depth-level mapping and a true 3D CCF trajectory.

## Data boundary

- KiloSort remains the spike, position, amplitude, and template source.
- Large NPY arrays are loaded lazily for the active Recording in a background Web Worker.
- `channel_shanks.npy` groups are interpreted as independent physical Probes for this acquisition.
- Brain-region metadata remains a separate dependency and is never inferred from KiloSort alone.
- A depth-level Probe-region table does not supply Allen CCF x/y/z coordinates. A future 3D view still requires registered trajectories or per-channel atlas coordinates.
- Future synchronized video still requires an explicit neural-to-video `TimeMapping`.

## Validation

From the project root:

```powershell
node neuropixel_workflow\v3.1.0\tests\validate-real-data.cjs
python -m unittest discover -s tests -v
```

Older versions remain unchanged under their versioned directories.
