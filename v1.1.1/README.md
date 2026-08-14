# Neuropixel Workflow 1.1.1

Version 1.1.1 is a focused patch on top of the frozen `v1.1.0` interface. It adds a full-page Viewer mode and extends Data Selection with Cluster and Brain Region entity types.

## Full-page Viewer

- A `FULL PAGE` button is added to the Viewer toolbar only while the node is Detailed.
- It uses CSS webpage layout only. It never invokes the browser Fullscreen API.
- Browser tabs, browser controls, and the application window remain unchanged.
- The graph, menus, log, status bar, wires, and other nodes are hidden while the Viewer fills the webpage.
- The expanded view keeps Raster/Waveform/Probe switching, linked-time zoom, drag-box zoom, and reset controls.
- A right-side information panel shows the active representation, data source, visible lanes, shared time range, source state, and output contract.
- `Esc` or `EXIT FULL PAGE` returns to the workflow.

## Patch layout

- `index.html` — version 1.1.1 entry point; loads the frozen 1.1.0 base
- `styles/fullscreen-viewer.css` — webpage-only expanded and responsive layout
- `scripts/data-entity-types.js` — Cluster and Brain Region entity contracts and controls
- `scripts/fullscreen-viewer.js` — Viewer enhancement, full-page state, and cleanup

No data loading, Kilosort QC, Viewer rendering, node graph, or analysis behavior was changed in this patch.

## Data Selection additions

- `Cluster` is available separately from `Unit`. A cluster is the spike-assignment group from sorting/curation; a Unit is the analysis-level or curated interpretation of neural activity.
- `Brain Region` is available as a separate selection type.
- Data nodes expose `ClusterSet` and `BrainRegionSet` output contracts for future typed analysis nodes.
- Brain regions are currently manual selection metadata. Kilosort output alone does not establish anatomical region labels; automatic selection will require atlas, track, channel, or external metadata mapping.

The v1.1.1 patch adds `scripts/data-entity-types.js` to extend the frozen v1.1.0 Data node before the workflow is initialized.
