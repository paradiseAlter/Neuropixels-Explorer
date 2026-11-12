# Neuropixels Explorer

A local application for exploring processed neural spikes alongside behavior
video. The main workspace links time, neural activity, individual Units, 2D Probe
positions, original brain-region labels, and laboratory-defined behavior labels.

The current prerelease is **v4.8.0-beta.1**. Previous releases remain available as
Git tags. The source uses the [MIT license](LICENSE); datasets, videos, and model
weights retain their own licenses and are not included in this repository.

In this version, **Annotate** opens the large-video workspace; **Signals / Esc**
returns to the neural view. Playback starts at **0.25×**; enter a custom speed or
video time and press Enter. **Interval distribution** expands the Probe view for
the selected clip or neural interval. [Changes and validation](docs/mentor-workspace-4.1.md).

## Standalone browser edition (4.8.0-beta.1)

Build with `node scripts/build-standalone.cjs` and open the generated
`dist/Neuropixels-Explorer.html` in a desktop browser. Scripts, styles and the
Allen NWB reader are embedded; no Python API or CDN is required. Create a
project from a Kilosort folder or Allen ecephys NWB physical probe, then link
matching video and its frame clock. Projects, data and annotations are cached
in IndexedDB. Save project exports a complete `.neuroproject` package for
recovery or another browser. Keep this package before clearing browser data.
The local HTML is the offline entry; a hosted URL has no service worker.
The local service and its reference-based `.neuroproject.json` files remain
available. The following service instructions concern that optional mode.

## Start on Windows

Install the checkout once with `python -m pip install -e ".[allen]"`, then
double-click **[Start-Explorer.cmd](Start-Explorer.cmd)**. The launcher starts the
local service, opens the start screen, and reuses a healthy matching instance.
It restarts an older Explorer serving the same catalog. The background process
survives closing the launcher or development terminal. After a reboot, use the
same launcher or desktop shortcut; a browser bookmark alone cannot start it.

For an existing collection, run `scripts/Install-ExplorerShortcut.ps1` with
`-DataRoot`, `-Database`, `-Python`, and optionally `-Name` / `-Port`. This creates
a desktop shortcut and an ignored `config/local.launcher.json` profile. Both the
shortcut and the checkout's `Start-Explorer.cmd` then open that collection at
`/?database=1` after its health check passes. If its drive/catalog is missing,
the launcher reports the problem instead of creating an empty replacement.
Explicit data-path arguments bypass the profile. No login task or Windows
service is installed; the application runs only when opened.

By default, project metadata and derived caches live under the current user's
local application-data directory. Existing collections can supply `-DataRoot`,
`-Database`, `-Python`, and `-Port` to `Start-Explorer.ps1`. `-NoBrowser` checks or
starts the service without opening a browser window.

Failed starts keep the command window open with a retry instruction and, when
available, a log excerpt. Startup logs and `latest-process.json` live beside the
catalog in `logs/`. Simultaneous launches are serialized; an occupied port owned
by another project or application is left untouched.

## Open your recording

Use **Open / add data** at the top left or either button on the start screen:

- **Open recording folder** detects Kilosort results, including nested recording
  folders. `spike_times.npy` and `spike_clusters.npy` are required. The original
  sampling rate is read from `params.py`; if missing, the picker asks for it.
  Templates, spike positions, channel positions and shank IDs are optional.
- **Open Allen NWB** reads processed units and lets you select a physical probe.
  The supported Allen ecephys schema includes unit spike times, peak channels and
  device metadata. Original IDs, spike timing, quality labels and peak-channel
  anatomy are preserved. Adapted arrays are written into the managed data root;
  the NWB source stays unchanged.

In the video region, choose **Add video to this recording** from any folder.
Nearby videos are suggested when found; **Change video** remains available.
There is no required common parent folder for neural data and video. Linked
sources and recent projects are saved automatically on this computer. Changed
source files are detected; an existing grant cannot silently point at new data.

**Linked** does not mean synchronized. Use **Alignment** to match a known event,
or import an Allen frame-clock JSON with the matching video's SHA-256 identity.
Manual alignment remains unverified. Verified clocks retain dropped-frame
corrections; times outside their measured range are not extrapolated.

## Explore and annotate

The neural workspace starts with about 65% of the content width and video with
35%. Drag their divider to resize them. The 2D Probe stays beside neural activity;
select a Unit or Probe marker to follow its position and original region. Missing
coordinates remain unknown. Unit details retain the waveform, raster and legacy
Probe inspector. The video can be enlarged temporarily.

Choose **Annotate** underneath the video. Drag an interval on its time strip, or
use **Mark start** and **Mark end** during playback. Name the behavior and choose
**Save label**. Clicking an existing clip reveals its boundaries and editing
controls. Annotation does not reduce the neural canvas or video height.

**Clips & grouping** opens batch review, independent laboratory label schemes,
undo/redo, import/export, and experimental motion grouping. Candidate groups
require human review; the motion baseline is not a validated behavior classifier.
JSON exports preserve every scheme, source run and interval; CSV exports the
current scheme and exact neural/video time mapping. Annotation drafts are saved
in the current browser/origin, separately from local source links. Export JSON
for a portable annotation backup.

See [annotation contracts and methods](docs/BEHAVIOR_ANNOTATION.md),
[Beta 3 implementation and acceptance](docs/beta3-workspace.md), and
[third-party notices](THIRD_PARTY_NOTICES.md). No fixed ethogram is imposed.

## Allen public data

[Allen VBN download, import and validation](docs/ALLEN_VBN_VALIDATION.md) documents
a bounded 60.19 GB corpus, matched full-video clocks, an official V1 PSTH positive
control and a published ripple-table reuse example. These are head-fixed task
recordings, not validation of freely moving behavior recognition.

## Browser-only alternative

Opening `index.html` in Chrome still supports selecting or dropping Kilosort
folders and attaching browser-local videos. NWB adaptation and persistent source
links require the local launcher. Dark, Light, High Contrast and System themes,
English/Simplified Chinese/Spanish, contextual help, and Unit detail controls
remain available. The raw-voltage extension contract is retained for future
AP/LFP providers.

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

## Event response preview (4.13.1-beta.1)

The standalone HTML now computes start-aligned responses from experimental events
or reviewed behavior annotations. See [Event responses](docs/contracts/EVENT_RESPONSES.md)
for usage, population/group views, split-half sensitivity, source coverage, project
restoration and remaining interpretation limits.

可选视频特征与模型数据交换：[Video feature contract](docs/contracts/VIDEO_FEATURES.md)。
