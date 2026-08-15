# Neuropixels Explorer

Neuropixels Explorer is a local-first browser interface for reviewing KiloSort
recordings, Units, signals, physical Probe positions, and optional brain-region
metadata. The default workflow runs directly in Chrome: selected files remain
on the local machine and no upload or localhost service is required. An
optional indexed service is included in the same product repository for larger
managed collections.

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

English, Simplified Chinese, and Spanish share one checked-in translation
dictionary and professional terminology glossary. Subtle question-mark
controls explain what a feature is, how to interpret it, and when to use it;
they work with both pointer hover and keyboard focus. The Help drawer follows
the active language. Its three Markdown sources are precompiled into a local
asset, so Help remains available when the Explorer is opened through
`file://` without a CDN or online Markdown service.

The current release is **v3.2.0**. The `main` branch contains only the current
application tree; earlier releases are retained in Git history and release
tags instead of duplicated version directories.

## Repository layout

- `index.html` - current Explorer entry point.
- `scripts/` - KiloSort parsing, application state, data-status classification,
  shared themes, language dictionaries, precompiled Help, plots, Probe
  rendering, region metadata, and the optional database client.
- `styles/` - current application styling.
- `server/` - reusable read-only SQLite/API service and command-line entry
  point; no experiment-specific path or payload is embedded here.
- `database/migrations/` - ordered SQLite schema migrations represented by the
  same Git release as the Explorer UI.
- `tests/` - portable browser checks, synthetic database/service tests, the
  repository-boundary guard, and the opt-in local real-data integration test.
- `docs/` - input contracts and interpretation boundaries.
- `pyproject.toml` - Python package and service entry-point metadata.
- `ARCHITECTURE.md` - runtime and module boundaries.
- `CHANGELOG.md` - release-level changes.

The repository intentionally excludes raw or processed neuroscience data,
legacy analysis pipelines, analysis reports, generated figures/tables, SQLite
database files, SQLite sidecars, and machine-specific configuration. It does
include the reusable service implementation, schema migrations, and synthetic
contract tests. No scientific inference or biological result is shipped with
this codebase.

## Optional indexed service

The browser-only path remains the default. To use an existing catalog for a
larger local collection, install this checkout and provide every runtime path
explicitly:

```powershell
python -m pip install -e .
neuropixels-explorer validate-db --database <catalog.sqlite>
neuropixels-explorer serve --database <catalog.sqlite> --data-root <data-root>
```

`--data-root` resolves the project-relative asset paths registered in the
catalog. It is never written to a tracked configuration file. `init-db`
creates or migrates an empty catalog for import adapters:

```powershell
neuropixels-explorer init-db --database <new-catalog.sqlite>
```

SQLite stores metadata and relative references only. KiloSort arrays, future
raw voltage, and video payloads stay outside SQLite and outside Git. A
data-source-specific importer may live with the research data, but its output
must pass the migrations and validation shipped by this repository.

## Validation

Portable checks do not require private data:

```powershell
node tests\validate-real-data.cjs --code-only
node tests\validate-workspace-layout.cjs
node tests\validate-i18n-help.cjs
node scripts\build-help-content.cjs --check
python -m unittest discover -s tests\python
```

The full integration check uses KiloSort and brain-region fixtures from the
parent research workspace. Those inputs remain local and are not versioned:

```powershell
node tests\validate-real-data.cjs
```

Set `NEUROPIXEL_PROJECT_ROOT` when those fixtures are outside the default parent
workspace. This value is runtime-only and must not be committed:

```powershell
$env:NEUROPIXEL_PROJECT_ROOT = "<research-workspace>"
node tests\validate-real-data.cjs
```

See [the Probe-region mapping contract](docs/PROBE_REGION_MAPPING.md) for the
optional CSV schema and its interpretation boundary. See
[the product repository boundary](docs/PRODUCT_REPOSITORY_BOUNDARY.md) for the
release, data, and generated-file rules.
