# Neuropixel Workflow v1.2.0

This version keeps the v1.1.1 workflow UI and adds the first real Kilosort data path.

## Data boundary

- A selected parent folder may contain many Kilosort experiment folders.
- Catalog creation reads paths, sizes, `params.py`, cluster labels, and NPY headers only.
- `spike_times.npy` and `spike_clusters.npy` are parsed only when a Unit or Cluster is added to the Viewer.
- Parsing runs in a Web Worker. The worker retains at most three experiments with an LRU cache.
- The UI receives only the selected spike-time vectors and compact metadata.
- Large arrays such as `pc_features.npy` and `templates.npy` are not read by this version.

## Current real-data path

1. Open the detailed **Experiment Data** node.
2. Select a Kilosort parent folder (or one result folder).
3. Select an experiment.
4. Choose **Unit (KSLabel good)** or **Cluster (all)** and an ID.
5. Choose **Add to Viewer**. Multiple selections share one time axis in each connected Viewer.

The Viewer supports wheel zoom, box-drag zoom across all lanes, double-click reset, and webpage-only full-page mode.

## Scope

This is an engineering validation release. It reads Kilosort spike assignments and timing; raw voltage, templates, atlas mapping, video, and downstream analyses remain separate future paths.
