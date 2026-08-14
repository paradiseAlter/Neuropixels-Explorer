# Neuropixel Workflow 1.0.0

This folder is a separate interaction version. The earlier prototype remains at
`../index.html` and is not modified by this version.

## Interaction changes

- A node can be dragged from any non-interactive part of its surface.
- Nodes have collapsed, compact, standard, and expanded display states.
- Experiment Data grows as Unit, Channel, and Template selections are added,
  then constrains the list with internal scrolling.
- Each node exposes multiple typed ports on left and right port rails.
- Connections are classified as exact or smart-adapted. A wire may be dropped
  on a compatible input socket or on the target node body.
- Universal Viewer accepts raw experiment data, processed data, analysis
  results, tables, selections, and other renderable packets.

## Current boundary

This remains an interface prototype. Kilosort folder selection only audits the
presence of `spike_times.npy`, `spike_clusters.npy`, and `params.py`. It does not
parse NPY arrays or execute analysis. Video and behavior nodes are not included.

## Extension points

- `scripts/registry.js`: node definitions, ports, rendering, and compatibility.
- `scripts/graph.js`: dragging, density states, connections, and graph state.
- `scripts/app.js`: Kilosort audit, node actions, shell interactions, and demo.
- `styles/v1.css`: workbench and node presentation.

