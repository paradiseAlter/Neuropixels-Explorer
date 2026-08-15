# Neuropixels Explorer

Neuropixels Explorer is a local-first browser interface for reviewing KiloSort
recordings, Units, signals, physical Probe positions, and optional brain-region
metadata. The default workflow runs directly in Chrome: selected files remain
on the local machine and no upload or localhost service is required.

## Current release

The current mainline is [v3.1.0](v3.1.0/README.md). The repository-level
[`index.html`](index.html) redirects to that version.

Open `index.html` or `v3.1.0/index.html` in Chrome, then choose or drop a
complete project/session folder containing the KiloSort outputs to inspect.

## Repository scope

This repository contains only Explorer product material:

- browser UI source, styles, and parsing/visualization code;
- the current v3.1.0 implementation and its versioned Explorer predecessors;
- Explorer architecture, input-contract documentation, and validation code.

It intentionally excludes raw or processed neuroscience data, legacy analysis
pipelines, analysis reports, generated figures/tables, SQLite databases, and
local database-service implementation. The optional database client remains in
the browser code, but the standalone folder workflow is the supported default.

No scientific inference or biological result is shipped with this codebase.

## Validation

Portable code checks do not require private data:

```powershell
node v3.1.0\tests\validate-real-data.cjs --code-only
```

The full integration check uses the local KiloSort and brain-region fixtures in
the parent research workspace; those inputs are deliberately not part of this
repository:

```powershell
node v3.1.0\tests\validate-real-data.cjs
```

See [v3.1.0/PROBE_REGION_MAPPING.md](v3.1.0/PROBE_REGION_MAPPING.md) for the
optional Probe-to-region CSV contract and its interpretation boundary.
