# Neuropixels Explorer

Neuropixels Explorer is a local-first browser interface for reviewing KiloSort
recordings, Units, signals, physical Probe positions, and optional brain-region
metadata. The default workflow runs directly in Chrome: selected files remain
on the local machine and no upload or localhost service is required. An
optional indexed service is included in the same product repository for larger
managed collections.

## Annotation beta

Open a recording, attach its behavior video, and choose **Annotate · Beta**.
Create/edit intervals on the shared neural timeline, review motion groups,
name them using independent laboratory label schemes, and save portable JSON
or CSV. Automatic results remain suggestions until reviewed. Browser drafts
are saved locally. The built-in motion grouping is experimental and is not a
validated grooming/sniffing classifier.

See [behavior annotation usage and results](docs/BEHAVIOR_ANNOTATION.md) and
[third-party method notices](THIRD_PARTY_NOTICES.md). The project uses the
[MIT license](LICENSE). Videos, datasets and model weights are not distributed.

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

The center workspace places behavior video directly above the aligned Unit
signals. A detected local video can be opened directly, or **Generate validation
video** creates a deterministic mouse-arena stream whose frame clock exactly
matches neural time. Play, seek, frame-step, playback speed, signal-follow, and
manual offset controls all drive one shared neural-time playhead. Clicking a
signal in Cursor mode seeks the video back to that neural time.

The Units and Probe Inspector boundaries are adjustable. Drag either divider,
use its Left/Right arrow keys for precise changes, or hold Shift for larger
keyboard steps. Double-click a divider (or press Home) to restore the default
layout. The small chevron collapses or expands its side panel. Layout choices
are saved on the current device and restored on the next visit.

The compact Data status control summarizes complete and missing core inputs.
Open it to inspect available, missing, invalid, optional, and stream/extension
interfaces. Raw voltage is deliberately not rendered: a versioned provider and
window-reader contract is exposed for a future AP/LFP implementation, while the
current UI reports that no provider is registered. Dark, Light, High Contrast,
and System themes share one palette
across the interface, signal canvases, Probe display, selections, and Unit
colors. The theme preference is saved on the current device.

English, Simplified Chinese, and Spanish share one checked-in translation
dictionary and professional terminology glossary. Subtle question-mark
controls explain what a feature is, how to interpret it, and when to use it;
they work with both pointer hover and keyboard focus. The Help drawer follows
the active language. Its three Markdown sources are precompiled into a local
asset, so Help remains available when the Explorer is opened through
`file://` without a CDN or online Markdown service.

The current prerelease is **v4.0.0-beta.1** (behavior annotation). Earlier v3.x
states remain available through their Git tags. The `main` branch contains only the current
application tree; earlier releases are retained in Git history and release
tags instead of duplicated version directories.

## Repository layout

- `index.html` - current Explorer entry point.
- `scripts/` - KiloSort parsing, application state, video/time synchronization,
  raw-voltage extension contracts, data-status classification, shared themes,
  language dictionaries, precompiled Help, plots, Probe rendering, region
  metadata, and the optional database client.
- `styles/` - current application styling.
- `server/` - reusable SQLite/API service, transactional supplement endpoint,
  and command-line entry point; no experiment-specific path is embedded here.
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
neuropixels-explorer init-db --database <catalog.sqlite>
neuropixels-explorer validate-db --database <catalog.sqlite>
neuropixels-explorer serve --database <catalog.sqlite> --data-root <data-root>
```

`--data-root` resolves the project-relative asset paths registered in the
catalog. It is never written to a tracked configuration file. Run `init-db`
before serving a catalog after an upgrade; it creates a new schema or applies
pending migrations to an existing catalog:

```powershell
neuropixels-explorer init-db --database <new-catalog.sqlite>
```

SQLite stores metadata and relative references only. KiloSort arrays, raw
voltage, and video payloads stay outside SQLite and outside Git. In database
mode, video media is streamed from its registered runtime asset using bounded
HTTP byte-range requests; the browser never receives a machine-specific path.
Data Status can supplement a missing file or Recording folder. The local
service stages and validates the selection, records it in one transaction, and
rolls back database rows and managed-file moves together on failure. Existing
assets are not overwritten; duplicates remain one `data_assets` row.

## Validation

Portable checks do not require private data:

```powershell
node tests\validate-real-data.cjs --code-only
node tests\validate-incremental-ingest.cjs
node tests\validate-workspace-layout.cjs
node tests\validate-video-sync.cjs
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

## Release versioning

`VERSION` is the human release version. After updating it, run
`node scripts/sync-version.cjs` to update the page title, visible badges, asset
cache keys and Python package version. Beta tags use `v4.0.0-beta.N`; the Python
package uses the equivalent PEP 440 spelling `4.0.0bN`. Commit and create an
annotated tag for each reviewable release; never move an existing tag.
