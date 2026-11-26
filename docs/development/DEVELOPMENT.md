# Development and local service

[Documentation index](../../README.md)

Commands in this document run from the application repository root.

## Repository layout

- `index.html` - portable release. Edit the shared markup in `scripts/explorer-shell.html`.
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
- `docs/ARCHITECTURE.md` - runtime and module boundaries.
- `CHANGELOG.md` - release-level changes.

The repository intentionally excludes raw or processed neuroscience data,
legacy analysis pipelines, analysis reports, generated figures/tables, SQLite
database files, SQLite sidecars, and machine-specific configuration. It does
include the reusable service implementation, schema migrations, and synthetic
contract tests. No scientific inference or biological result is shipped with
this codebase.

## Standalone build

Install the pinned build dependencies once with `npm install --ignore-scripts`.
The lockfile pins Terser and the Playwright client used by the Chrome checks.
The standalone build never mangles property names, and it keeps identifier names
stable in modules whose Worker factories are serialized with
`Function.prototype.toString()`. Other modules use ordinary local-identifier
minification; their exported globals remain unchanged. Source modules remain
readable and independently testable.

Run `node scripts/build-standalone.cjs <candidate-path>` to build an isolated review candidate, or run it without an output path to refresh only the ignored staging mirror, `dist/Neuropixels-Explorer.html`. After validation, `node scripts/build-standalone.cjs --promote` refreshes the tracked `index.html` and the byte-identical staging mirror. `index.html` is the normal production entry; do not edit it by hand. See [release management](RELEASE_MANAGEMENT.md) for the candidate, validation, promotion and manifest boundary.
The checked-in NWB reader in `vendor/h5wasm/` uses the h5wasm 0.10.3 JavaScript API and the HDF5 2.2.0 native library. `node tests/validate-browser-project.cjs` checks the embedded native version, interval Worker semantics, project roundtrip and bundle syntax.

To rebuild the reader, compile HDF5 with Emscripten 4.0.23 using the NIST `libhdf5-wasm` recipe at `2069e0a2ab8073a1b7f08a10adae0ce6d73905fe`. Set `HDF5_VERSION=2.2.0`, set `SRC_HASH_2.2.0` to `1a1ab8209b35586fbc1aa279ba76d102130b95badcb20ca329587219112d8c16`, and set `HDF5_BUILD_TOOLS=OFF`. Install the library with the recipe's DEFLATE and SZIP filters. In the h5wasm checkout at `a0673f6bbe980c268e335ae79c9b5838763b1c95`, point `FETCHCONTENT_SOURCE_DIR_LIBHDF5-WASM` at that installation and build the `hdf5_util` target. Place its `hdf5_util.js` beside `hdf5_hl.js` and `file_handlers.js` from the 0.10.3 npm release. Bundle `hdf5_hl.js` with esbuild 0.25.0, `--bundle --format=iife --global-name=h5wasm`. Distribute the library notices with the reader.

Recordings are provided separately by the user.

## Indexed service commands

To serve an existing catalog directly, install this checkout and provide its
runtime paths explicitly:

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
HTTP byte-range requests; media URLs contain opaque file IDs; source paths are only displayed as local
project context.
Data Status can supplement a missing file or Recording folder. The local
service stages and validates the selection, records it in one transaction, and
rolls back database rows and managed-file moves together on failure. Existing
assets are not overwritten; duplicates remain one `data_assets` row.

## Release versioning

`VERSION` is the human release version. After updating it, run
`node scripts/sync-version.cjs` to update the source page title, visible badges,
asset cache keys and Python package version. This command does not build or promote
an HTML artifact. Build an isolated candidate and promote it only after validation,
as defined in [release management](RELEASE_MANAGEMENT.md). Beta tags use `v4.0.0-beta.N`; the Python
package uses the equivalent PEP 440 spelling `4.0.0bN`. Commit and create an
annotated tag for each reviewable release; never move an existing tag.

For implementation changes that establish a new usable or reviewable checkpoint,
commit the scoped changes and create a unique annotated version tag before the
next implementation round. Determine the version baseline from the highest
reachable version tag without resetting or discarding ongoing work. Increment
MAJOR for breaking product/data contracts, MINOR for compatible features or review
checkpoints, and PATCH for compatible fixes; retain the applicable prerelease suffix.
Record the checkpoint meaning in the tag annotation. Never reuse or move tags.
Local commit/tag authorization does not authorize pushing; publish only when the
user explicitly requests it. Do not include unrelated working-tree changes.

## Documentation and change records

Before work, use the [README index](../../README.md) to read the documents relevant
to the task. Product and technical standards live in their respective documents;
newer confirmed standards applicable to the scope supersede older AGENTS copies,
plans and checkpoints. A proposal or file modification timestamp alone does not
establish a newer accepted standard.

Maintain affected PRD, IA, Data Contract, Parity Matrix, Architecture and guides
in place as behavior or decisions change. Fix references and the README index
when documents move. AGENTS contains the workflow and reading map, not design specs.

CHANGELOG is a curated record of important changes, not a conversation diary.
Record significant features, key fixes, compatibility/data-contract changes, and
formal releases or important review milestones, grouping related work around its
user-visible impact. Routine discussion, diagnosis, formatting and wording changes
need no entry. Updating a specification does not itself create a product release.
Do not create a new report, handoff or checkpoint file for every conversation.
