# Neuropixels Explorer

Neuropixels Explorer is a local-first browser interface for reviewing KiloSort
recordings, Units, signals, physical Probe positions, and optional brain-region
metadata. The default workflow runs directly in Chrome: selected files remain
on the local machine and no upload or localhost service is required.

## Quick start

1. Open [`index.html`](index.html) in Chrome.
2. Choose or drop a complete project/session folder containing the KiloSort
   outputs to inspect.

No Unit is selected automatically. Click a Unit to open it by itself,
Ctrl-click to add it to the current view, or right-click for open, add, remove,
and Probe-location actions. Clicking an open signal focuses the same Unit in
the list, Probe view, and Inspector.

Cursor, Zoom, and Pan are explicit plot modes. Zoom and Pan work across the
whole signal canvas. In Zoom, the wheel scales around the pointer; in Pan,
wheel-down moves toward later time and wheel-up toward earlier time. Wheel
events outside a signal, and all wheel events in Cursor mode, keep their normal
page-scrolling behavior. Linked time applies a navigation change to every open
Unit; Independent time limits it to the focused signal.

The Units and Probe Inspector boundaries are adjustable. Drag either divider,
use its Left/Right arrow keys for precise changes, or hold Shift for larger
keyboard steps. Double-click a divider (or press Home) to restore the default
layout. The small chevron collapses or expands its side panel. Layout choices
are saved on the current device and restored on the next visit.

The compact Data status control summarizes complete and missing core inputs.
Open it to inspect available, missing, invalid, optional, and future/video
interfaces. Dark, Light, High Contrast, and System themes share one palette
across the interface, signal canvases, Probe display, selections, and Unit
colors. The theme preference is saved on the current device.

The current release is **v3.1.0**. The `main` branch contains only the current
application tree; earlier releases are retained in Git history and release
tags instead of duplicated version directories.

## Repository layout

- `index.html` - current Explorer entry point.
- `scripts/` - KiloSort parsing, application state, data-status classification,
  shared themes, plots, Probe rendering, region metadata, and the optional
  database client.
- `styles/` - current application styling.
- `tests/` - portable code checks and the local real-data integration test.
- `docs/` - input contracts and interpretation boundaries.
- `ARCHITECTURE.md` - runtime and module boundaries.
- `CHANGELOG.md` - release-level changes.

The repository intentionally excludes raw or processed neuroscience data,
legacy analysis pipelines, analysis reports, generated figures/tables, SQLite
databases, and the local database-service implementation. No scientific
inference or biological result is shipped with this codebase.

## Validation

Portable checks do not require private data:

```powershell
node tests\validate-real-data.cjs --code-only
node tests\validate-workspace-layout.cjs
```

The full integration check uses KiloSort and brain-region fixtures from the
parent research workspace. Those inputs remain local and are not versioned:

```powershell
node tests\validate-real-data.cjs
```

Set `NEUROPIXEL_PROJECT_ROOT` when those fixtures are not in the default parent
workspace:

```powershell
$env:NEUROPIXEL_PROJECT_ROOT = "D:\path\to\research-workspace"
node tests\validate-real-data.cjs
```

See [the Probe-region mapping contract](docs/PROBE_REGION_MAPPING.md) for the
optional CSV schema and its interpretation boundary.
