# Neuropixel Workflow UI architecture

This folder is the development source for the workflow editor. The current
milestone is a neural-only interaction prototype: semantic nodes can be added,
dragged, connected, selected, and inspected, but no analysis executor is
connected yet.

## Delivery model

- Development source is split into small HTML, CSS, and JavaScript modules so
  the interface can be maintained without one continuously growing source file.
- A later build step will bundle the production release into one standalone
  HTML file, preserving the mentor-facing delivery requirement.
- Splitting source files improves maintainability, not runtime performance by
  itself.

## Performance boundary

The interactive canvas must remain responsive even when analysis inputs are
large. Future implementation should keep these boundaries:

- UI thread: pointer interaction, node layout, selection, lightweight drawing,
  and display state only.
- Worker layer: Kilosort parsing, binning, PCA, clustering, transforms, and
  other CPU-heavy analysis.
- Data layer: typed arrays, low-copy transfer, explicit cache ownership, and
  invalidation by node input/version.
- Rendering layer: viewport culling, level-of-detail limits, and drawing only
  visible samples or aggregates.
- Node registry: lazy-load node definitions and heavy code only when a workflow
  uses them.

## Two-layer graph

The visible canvas is a semantic graph. It intentionally uses a small set of
nodes such as Experiment Data, Auto Analysis, Neural Viewer, and Population
Analysis. Fine-grained steps such as individual NPY reads, spike extraction,
filters, array transfer, and cache operations belong to a separate internal
execution graph.

This avoids making the user wire every mechanical operation while preserving
inspectable execution and plugin boundaries. A future Auto Analysis node should
be expandable into the internal plan rather than becoming an opaque black box.

The current Experiment Data node performs only a lightweight folder/file-name
audit for `spike_times.npy`, `spike_clusters.npy`, and `params.py`. It does not
parse arrays or calculate neural results. Workers, node execution, and real
analysis remain future milestones.

## Extension contract

New node definitions belong in `scripts/nodes/registry.js`. Each definition
declares a stable type, version-ready inputs and outputs, category, renderer,
and future executor boundary. Video and behavior nodes are deliberately absent
from this prototype; they can be registered later without changing the graph
engine.

## Current modules

- `index.html`: semantic workbench structure.
- `styles/tokens.css`: Graphite and Classic theme tokens.
- `styles/workbench.css`: workbench layout and component styling.
- `styles/nodes.css`: node, connection, palette, and inspector styling.
- `scripts/core/viewport.js`: pan, zoom, coordinates, and grid state.
- `scripts/graph/graph-engine.js`: node layout, dragging, selection, and typed
  connections.
- `scripts/nodes/registry.js`: readable semantic node definitions.
- `scripts/ui/tooltip.js`: viewport-aware tooltip placement.
- `scripts/ui/node-palette.js`: searchable neural-node library.
- `scripts/app.js`: application wiring, prototype Kilosort folder audit, menus,
  shortcuts, theme preference, and the initial example workflow.
