# Neuropixels Explorer

Neuropixels Explorer is a local-first browser interface for reviewing KiloSort
recordings, Units, signals, physical Probe positions, and optional brain-region
metadata. The default workflow runs directly in Chrome: selected files remain
on the local machine and no upload or localhost service is required.

## Quick start

1. Open [`index.html`](index.html) in Chrome.
2. Choose or drop a complete project/session folder containing the KiloSort
   outputs to inspect.

The current release is **v3.1.0**. The `main` branch contains only the current
application tree; earlier releases are retained in Git history and release
tags instead of duplicated version directories.

## Repository layout

- `index.html` - current Explorer entry point.
- `scripts/` - KiloSort parsing, application state, plots, Probe rendering,
  region metadata, and the optional database client.
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
