# Neuropixels Explorer architecture

## Runtime model

The supported default is a local browser workflow. `index.html` loads plain
JavaScript and CSS, and the user explicitly selects a folder through the
browser file API. KiloSort arrays are parsed locally and are not uploaded.

Large arrays are loaded lazily for the active Recording. Unit analysis runs in
a Web Worker when available and falls back to the main thread with an explicit
status indication.

An optional indexed mode uses the reusable local service in `server/`. The
service implementation and schema migrations are release source. Its generated
SQLite database, research data, analysis outputs, logs, and runtime paths stay
outside the repository and are not required by the standalone folder workflow.

## Module map

- `Start-Explorer.ps1` resolves the optional local project profile, serializes
  starts per port, verifies the service identity and opens the browser after
  readiness. Windows WMI creates `server/launch_explorer.py` outside the calling
  terminal's job tree. The bootstrap establishes its own imports/log streams;
  neither the service nor its output pipes depend on the launcher staying open.
- `scripts/Install-ExplorerShortcut.ps1` creates a desktop entry and ignored
  `config/local.launcher.json`; it does not register a startup service/task.
- `index.html` defines the current Explorer interface; `VERSION` controls its release label.
- `scripts/app.js` owns application state, folder selection, review modes, and
  DOM coordination.
- `scripts/kilosort-core.js` indexes KiloSort files, parses NPY arrays, and
  computes Unit-level review data.
- `scripts/region-core.js` validates and joins Unit- and depth-level
  brain-region metadata without inferring missing anatomy.
- `scripts/data-status.js` classifies core, optional, invalid, and future data
  capabilities for the compact status surface.
- `scripts/theme.js` owns the persisted theme preference and the shared UI,
  signal-Canvas, Probe, and Unit color palettes.
- `scripts/i18n.js` owns the persisted language preference, the English,
  Simplified Chinese, and Spanish dictionaries, and the professional
  terminology glossary. File names, brain-region abbreviations, and KiloSort
  field names are deliberately outside translation.
- `docs/USER_GUIDE.*.md` are the editable Help sources.
  `scripts/build-help-content.cjs` precompiles them into the checked-in
  `scripts/help-content.js` asset, keeping the Help drawer compatible with
  direct `file://` use and independent of online Markdown services.
- `scripts/plots.js` renders signals and linked time-window interactions.
- `scripts/video-sync.js` owns `VideoStream` playback, invertible `TimeMapping`,
  deterministic validation frames, transport controls, and the shared neural
  playhead. A local video file and a generated synthetic source use the same
  controller. Optional measured frame-clock anchors are stored under
  `TimeMapping.provenance.frame_clock`; both playback and CSV export use the
  same piecewise mapping and reject extrapolation beyond measured coverage.
- `scripts/stream-contracts.js` exposes the versioned Raw Voltage provider
  registry. A future provider must advertise supported `raw_voltage`, `ap`, or
  `lfp` streams and return a reader with `readWindow(request)` and `close()`;
  this release intentionally registers no provider.
- `scripts/probe-view.js` renders physical Probe groups, Unit locations, and
  optional atlas-colored depth segments.
- `scripts/database-client.js` adapts the optional local-service API to the
  same Explorer state model.
- `server/neuropixels_explorer/` provides the catalog API, transactional
  incremental ingest, lazy NPY access, bounded in-memory caches, safe runtime
  path resolution, migration validation, and the CLI.
- `database/migrations/` is the canonical ordered SQLite schema history.
- `styles/app.css` contains the current application layout and visual system.
- `tests/validate-real-data.cjs` provides portable code checks and an optional
  local real-data integration path.
- `tests/validate-i18n-help.cjs` validates dictionary coverage, glossary terms,
  local Help parity, contextual explanations, and keyboard-accessibility
  contracts.
- `tests/validate-video-sync.cjs` validates time-mapping round trips,
  deterministic frames, shared-view wiring, and the Raw Voltage extension
  contract.
- `tests/python/` validates migrations, the frontend/API response contract,
  lazy file access, path containment, and repository exclusions using only
  generated synthetic fixtures.

## Data boundary

KiloSort is the source for spikes, amplitudes, templates, positions, and Probe
geometry. Brain-region labels are a separate optional input. Missing anatomy is
reported as unavailable rather than inferred. A depth-level mapping is not a
registered three-dimensional atlas trajectory.

SQLite is a metadata catalog, not a large-payload store. Asset rows use paths
relative to a runtime `--data-root`. The service resolves and contains each
path under that root, memory-maps active NPY arrays, and keeps only bounded
Recording and Unit caches. Video remains an external asset with explicit
stream and synchronization metadata; the local service exposes it through
path-contained HTTP range requests. Raw voltage remains an external future
asset behind the provider contract and is not read or rendered in this release.

Incremental ingest uses a two-phase boundary. Selected files first stream to a
session-specific staging directory while role, Recording identity, checksum,
NPY shape, and conflict rules are validated. Commit then uses one SQLite
transaction and atomic file moves into `managed-assets/`; an exception rolls
back the database and moves every file back to staging. Only changed
Recordings have their bounded array and Unit caches invalidated. The browser
refreshes those Recording snapshots in place so open Units, time windows,
history, and panel layout remain unchanged.

## Repository boundary

The release source includes the UI, reusable service, migrations, API adapter,
documentation, and portable tests. It excludes private experiment data,
generated SQLite files and sidecars, analysis reports and artifacts, logs,
secrets, and machine-specific absolute paths. `.gitignore` prevents ordinary
accidental additions, while `tests/python/test_repository_boundary.py` checks
the tracked tree and expected ignore behavior.

Research-specific import adapters may remain next to protected source data.
They may not redefine the product schema: a populated catalog must be created
from the checked-in migrations and pass `validate-db` before the Explorer opens
it. This keeps acquisition-specific knowledge outside the product without
allowing the frontend and database contract to drift.

## Versioning policy

`main` contains one current application tree. Releases are represented by Git
tags and release notes in `CHANGELOG.md`; full `vX.Y.Z/` snapshot directories
are not added to the current tree. Previous layouts remain recoverable from Git
history. Starting with v3.3, a product tag also identifies the Python service
version and the highest checked-in SQLite migration.


## Behavior annotation beta

The separately authorized annotation round adds `scripts/annotation-core.js`
(immutable project operations and validation), `scripts/annotation-ui.js`
(IndexedDB drafts, group/clip review, local video sampling and shared-state
integration), and `scripts/behavior-discovery.js` (an experimental motion
baseline executed in a worker). The app still owns the only neural cursor and
visible time range. Video-relative annotation boundaries are projected through
its existing time mapping. Annotation imports do not modify the neural catalog.

Raw candidate runs, editable intervals, laboratory schemes and review states
are distinct. Exported project JSON includes all schemes and original runs;
CSV uses the current scheme and records the current synchronization mapping.
External algorithms use a versioned candidate-file contract rather than adding
their training stacks to the browser. See `docs/BEHAVIOR_ANNOTATION.md` for exact
semantics, limits, reproducible trials and source/license boundaries.

## Allen adapter boundary

The optional scripts in `scripts/*allen*.py` download an explicit public file
manifest, validate camera clocks, adapt one physical NWB probe per Recording,
and run bounded analysis examples. They write generated arrays/catalogs and
provenance beside external source data; schema version 3 is unchanged. Original
Allen unit IDs, labels, probe identities, spike seconds and peak-channel anatomy
are retained. The derived float64 sample-equivalent arrays serve the existing
KiloSort reader contract and do not represent another spike-sorting run.
See `docs/ALLEN_VBN_VALIDATION.md` for acquisition-specific limits and commands.

## Local projects and compact annotation (Beta 3)

`project-ui.js` owns the start screen, top-left open menu and local project
actions. `local_projects.py` opens a native picker in a separate process and
returns opaque candidate/file IDs. A browser request cannot nominate an arbitrary
source path. The service registers selected Kilosort/video files in place using
fingerprinted grants; NWB imports reuse the Allen physical-probe adapter and
write derived arrays under `.explorer-imports`. Source grants and recent project
links live in `.explorer-local.json` under the configured runtime data root.
These machine-local files, original data and generated arrays stay outside Git.
The local mutation endpoints reject foreign origins and non-loopback hosts.

`mini-probe.js` renders available Unit coordinates and links Unit/region selection
to the existing experiment state. It depicts measured positions, not an inferred
atlas trajectory. Missing depth is not zero. Activity and unit-review responses
use original catalog peak-channel coordinates when present and available
Kilosort geometry otherwise. The server display-cache version is incremented so
older cached coordinates cannot silently survive the adapter fix.

Interval distribution reuses exact half-open counts from `interval_activity.py`.
`mini-probe.js` shares one result between point radii, a depth/rate stem plot and
the complete Unit list. Orientation and Unit selection reuse the current result;
new Recording/interval requests abort and discard stale responses. The activity
canvas's accessible behavior strip uses the annotation controller's existing
mapped selection with `openEditor: false`; it does not save or relabel segments.

The annotation panel now lives in the video body. The time strip supports direct
interval selection; batch review moves the same controller into a native dialog.
Video enlargement and annotation use the existing experiment split. `app.js`
owns the two emphasis requests and normal/focused proportions; its size clamp
reserves the neural texture and anatomy gutter even when Probe rates expand.
Annotation UI owns editor visibility and reports it through `onOpenChange`.
Layout changes do not mutate scientific selection, time mapping or datasets.
Annotation JSON schemas and candidate provenance are unchanged. Browser drafts
remain scoped to the recording/video and origin. Local project links persist
independently of annotation drafts. `Start-Explorer.cmd` starts or reuses the
correct local service and opens the start screen after process restarts.
