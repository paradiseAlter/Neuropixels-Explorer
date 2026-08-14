# Neuropixel Workflow 1.1.0

This is an isolated UI prototype for the `Experiment Data → Viewer` path. It preserves `v1.0.0` unchanged.

## What changed

- Nodes now have exactly two presentation states: **Compact** and **Detailed**.
- `Experiment Data` audits a browser-selected Kilosort results folder by file name, file size, duplicates, and a small core contract.
- The bottom `Load Log` distinguishes core errors, recognized files, missing optional files, and ignored unknown files.
- The old Universal Viewer and Spatial Viewer are one `Viewer` with `Auto`, `Raster`, `Waveform`, and `Probe` representations.
- Raster lanes share one `TimeRange`: wheel zooms at the pointer and box-drag zooms every lane together.
- Viewer output is a lightweight `ViewContext` contract: original `DataHandle` + selected entities + `TimeRange` + view state. It does not copy neural arrays.

## Kilosort folder contract in this prototype

The structure check requires:

1. `spike_times.npy`
2. either `spike_clusters.npy` or `spike_templates.npy`
3. `params.py`

Additional recognized Kilosort files unlock capability labels such as `TemplateWaveforms`, `ProbeGeometry`, `SpikePositions`, `Amplitudes`, and `QualityTable`.

Unknown files are marked **SKIP**, not invalid. A zero-byte or duplicated recognized file is an error because the current single-folder contract would be ambiguous or unusable.

## Deliberate limits

- No `.npy`, `.tsv`, or `params.py` contents are parsed yet.
- The Viewer draws deterministic preview data so interaction can be tested; it does not claim to show the selected folder's real spikes or waveforms.
- `Analyze` is only a typed routing placeholder in this version.
- Video is outside the 1.1.0 scope.
- Nothing is uploaded and nothing is written back to the selected folder.

## Files

- `index.html` — application shell and bottom log drawer
- `styles/app.css` — complete 1.1.0 visual system
- `scripts/registry.js` — node definitions and typed port contracts
- `scripts/viewport.js` — canvas pan/zoom
- `scripts/graph.js` — nodes, whole-node drag, compact/detail state, and connections
- `scripts/viewer-controller.js` — raster/waveform/probe rendering and shared-time interactions
- `scripts/palette.js` — node library
- `scripts/kilosort-qc.js` — bounded, content-free Kilosort folder structure audit
- `scripts/app.js` — Kilosort structure QC, logging, graph synchronization, and application wiring
