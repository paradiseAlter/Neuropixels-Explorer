# Neuropixel Workflow v1.3.0

This release preserves the v1.2.0 lazy Kilosort path and adds two independent configuration layers.

## Brain-region configuration

Select `data/processed/legacy_tables` from the Experiment Data node. The browser:

- scans CSV headers before reading table contents;
- accepts direct unit maps with experiment, cluster, and region fields;
- prioritizes `unit_quality_all_sessions.csv`, then the two historical region tables;
- detects `pinpoint_parsed.csv` as the electrode-to-atlas coordinate reference;
- reports mapping coverage, missing annotations, conflicts, experiments, and region count;
- joins annotations by `experiment number + Kilosort cluster id`.

Kilosort remains the source of spike timing and assignments. The Legacy Table folder is a separate annotation dependency.

## Type-size control

The top bar contains a numbered **TYPE 0–6** slider. Index 0 preserves the earlier font sizes and index 3 is the v1.3.0 default. The preference is stored locally in the browser. DOM text and Viewer-canvas text redraw together.

## Validation

Run:

`node tests/validate-brain-region.cjs`

The existing v1.2.0 real-data regression remains available at `../v1.2.0/tests/validate-real-data.cjs`.
