# Unified Experiment Viewer implementation map

## Scope and status

Dialogue 1 implemented Round 0 through Round 2 and stopped at Checkpoint A.
The authorized Round 2.5 correction pass is complete and stopped at Checkpoint
B. Rounds 3-6, behavior interpretation, candidate ranking, saliency, and
persistent disk caching remain deferred pending explicit Checkpoint B approval.

## Verified current architecture

- `index.html` and `styles/app.css` define a plain-browser application. The
  opened-experiment screen is currently a five-column layout: permanent Unit
  list, selected-Unit signal workspace, and permanent Probe inspector.
- `scripts/app.js` owns dataset, recording, selected/open Unit, legacy plot
  interaction, and video coordination state. `scripts/plots.js` renders one
  selected Unit at a time. `scripts/probe-view.js` renders the separate Probe
  inspector.
- Folder data is indexed by `scripts/kilosort-core.js`. Its worker lazily keeps
  at most two recording buffer sets and currently derives Unit review data only
  after a Unit is selected.
- Indexed mode uses `scripts/database-client.js` and
  `server/neuropixels_explorer/service.py`. The service memory-maps recording
  arrays, bounds its recording/Unit caches, and exposes catalog and Unit-review
  endpoints.
- KiloSort supplies spike times, cluster assignments, positions, templates,
  channel geometry, and shank IDs. `scripts/region-core.js` or the catalog
  supplies optional anatomical labels. Missing labels remain `Unmapped`.
- `scripts/video-sync.js` owns one invertible neural/video time mapping. Plot
  clicks seek video and video playback updates plot playheads.
- Portable Node checks cover layout, real-data contracts, video sync, i18n,
  and ingest. Python checks cover service/API, migrations, ingestion, and the
  repository boundary. `tests/validate-real-data.cjs` is the established safe
  representative-data workflow.

## Retain, relocate, replace, retire

| Current capability | Round 1-2 decision |
| --- | --- |
| Recording carousel, data status, ingestion, theme/language/help | Retain |
| Unit list and filters | Relocate behind compact `Find unit`; preserve DOM for later inspection migration |
| Selected-Unit raster/rate and metrics | Preserve as the on-demand legacy inspector; selected spikes also feed in-place expansion |
| Probe inspector | Preserve as the on-demand legacy inspector; replace its default-screen role with a row-aligned anatomy gutter |
| Template waveform | Preserve in the on-demand legacy inspector |
| Video controller and time mapping | Retain and relocate beside the activity-anatomy canvas |
| Five-column default layout | Replace with one experiment workspace |
| Workspace splitter persistence | Preserve for the on-demand legacy inspector; no longer part of the default layout |

No legacy scientific or inspection component is deleted in Dialogue 1.

## Target ownership and data boundary

`scripts/app.js` owns one `experimentView` state containing the recording-wide
time range, cursor, selected interval, selected Unit or aggregate, selected
shank/region, and expanded Unit. The activity canvas receives immutable state
snapshots and emits direct-manipulation intents; video receives the same cursor.

`scripts/kilosort-core.js` (folder mode) and the local catalog service (indexed
mode) build one reusable in-memory activity overview per recording outside the
paint path. The provider returns:

- stable Unit identity and position metadata;
- a fixed recording-wide time-bin mapping;
- per-Unit binned spike counts converted to robust within-Unit display
  intensity;
- a per-Unit/bin unusual-activity flag defined by counts strictly above that
  Unit's recording-wide p90;
- an explicit Unit-row/bin to Unit-ID/time-interval mapping.

The Canvas derives viewport aggregates only when data or geometry changes.
Individual rows display their within-Unit normalized bin count. Aggregate rows
display the fraction of constituent Units strictly above their own p90 in a
bin. Neither value is raw firing rate.

## Planned modules and files

- `scripts/activity-overview.js`: stable ordering, viewport aggregation,
  direct interaction, anatomy gutter, cursor/interval, and in-place Unit
  expansion.
- `scripts/kilosort-core.js`: folder-mode overview computation in the existing
  worker cache.
- `server/neuropixels_explorer/service.py` and
  `scripts/database-client.js`: bounded indexed-mode overview endpoint/adapter.
- `index.html`, `styles/app.css`, `scripts/app.js`, and `scripts/i18n.js`: new
  default workspace, shared state, compact Find Unit, video relocation, and
  on-demand legacy inspector.
- `tests/validate-activity-overview.cjs` plus focused service assertions:
  semantics, mappings, aggregation labels, stable order, and endpoint shape.

## Risks and mitigations

- Large recordings: the first overview scan is O(spikes) but runs once in the
  worker/service and is reused; painting reads only the prepared matrix.
- Dense Unit counts: contiguous anatomical Units are grouped to viewport-sized,
  explicitly labeled aggregate rows; every Unit contributes exactly once.
- Missing position/anatomy: stable Unit ID is the fallback order and the gutter
  says `Unmapped`; no anatomy is inferred.
- Video absence: keep attach/validation actions in a compact strip so the neural
  canvas reclaims the workspace.
- Legacy regression: keep the original components and wiring intact behind an
  explicit `Inspect unit` action, then run the existing portable suite.

## Checkpoint A evidence strategy

Run the real local service and representative recording, verify overview,
Unit selection/expansion, shank/region emphasis, and video/no-video states.
Capture live 1920x1080 and 3840x1080 screenshots. Run the focused Node test,
the existing portable JavaScript and Python suites, and the safe real-data
validation. Record measured overview build time, payload size, row/bin counts,
limitations, and specification deviations before stopping at Checkpoint A.

## Verified implementation result

Dialogue 1 is complete and stopped at Checkpoint A. It has not started or
approved Round 3.

### Confirmed behavior

- Opening a recording now shows the recording-wide activity/anatomy workspace;
  it does not auto-open Unit 0 or a selected-Unit dashboard.
- The default view has no permanent Unit list, Probe inspector, waveform, or QC
  panel. `Find unit` focuses a real row; `Inspect unit` opens the preserved
  legacy diagnostics on demand and closing it restores the selected row.
- Real Units are ordered by shank, depth, and Unit ID. `ks4_exp1` visibly
  retains all four shanks and explicitly labels missing regions `Unmapped`.
- Viewport-limited rows are visibly labeled `GROUP · N Units`. Selecting a
  group unfolds its real constituent rows. Unit 7 was selected through Find
  Unit and expanded at its existing anatomical position while neighbors stayed
  visible and subdued.
- The expanded row displays exact Unit spike times for the selected interval,
  a concise `Unit · Shank · depth · region` identity, and a spike count. A
  71.414-131.092 s brush selection and 113.250 s shared video cursor were
  verified in the running application.
- Clicking the anatomy gutter emphasizes the matching shank/region without
  changing the recording time range. Shank 1 emphasis was verified live.
- With no behavior video, the video surface collapses to one compact action
  strip. The deterministic validation video expands into the synchronized
  video region and uses the same neural cursor.

### Exact display-summary semantics

- A recording is divided into 512 equal-duration bins in Dialogue 1.
- For an individual Unit, each bin is its spike count divided by that Unit's
  nearest 95th percentile among non-empty bins, clipped to `[0, 1]`, and stored
  as an 8-bit display intensity. It is labeled within-Unit normalized activity,
  never firing rate.
- For an aggregate row, each bin is the fraction of constituent Units with at
  least one spike in that bin. It is labeled as a group and includes its Unit
  count, shank/depth range, region range, and real Unit-ID membership.
- Every matrix cell maps to one real Unit ID and the half-open recording
  interval `[bin * binSeconds, (bin + 1) * binSeconds)`. Viewport aggregates
  retain the complete Unit-ID/source-row list.
- The O(spikes) scan and robust normalization run once in the existing folder
  worker or bounded service overview cache. Canvas paint reads the prepared
  arrays and never scans the full spike arrays.

### Test and performance evidence

- Focused activity semantics/order/mapping test: PASS.
- Existing i18n/help, video sync, workspace layout, and incremental-ingest Node
  checks: PASS.
- Safe real-data validation: PASS for 18 recordings, 2,387 Units, 4,450,319
  spikes, 1,402 Unit-region mappings, 5,120 Probe-region rows, and four shank
  tracks.
- Python suite: 15/15 PASS, including service endpoint/cache behavior,
  migrations, ingestion rollback, path containment, and repository boundary.
- Direct real-data `ks4_exp1` overview build: 103 Units x 512 bins in 57.335 ms.
  Running local-service cold builds observed in the UI were 67.5 ms for
  `ks4_exp1` and 67.7 ms for the 136-Unit `ks4_exp2`; the cached `ks4_exp1`
  reload reported 0.0 ms provider time. These are one-machine observations, not
  general performance guarantees.
- Browser console after the final reload contained no warnings or errors.

### Checkpoint A screenshots

- `desktop-overview-1920x1080.png`: real `ks4_exp1` overview and compact
  no-video strip.
- `desktop-unit7-expanded-interval-1920x1080.png`: selected/expanded Unit 7 and
  brushed interval.
- `desktop-shank1-emphasis-1920x1080.png`: reciprocal Shank 1 emphasis.
- `ultrawide-unit7-video-synced-3840x1080.png`: ultrawide layout with the same
  selected Unit, interval, cursor, and deterministic synchronized video.

The files are stored outside the repository in the Checkpoint A evidence
directory supplied by the Codex desktop session.

### Known limitations and deviations

- The overview uses one 512-bin level. Persistent/multi-resolution storage,
  cancellation, and progress UI are intentionally deferred to Round 3.
- Viewport aggregation is deterministic and anatomically contiguous but is a
  first-pass row budget, not the semantic zoom/group-unfolding system deferred
  to Round 4.
- The current real catalog has anatomical labels for 1,402 of 2,387 Units.
  Missing Unit labels remain `Unmapped`; no anatomy was inferred.
- The representative recordings did not contain an attached behavior video.
  The required no-video state was verified with real data, and the existing
  deterministic validation video was used to verify the video-present layout
  and shared cursor. No laboratory video was fabricated or attached.
- The preserved diagnostics open in the existing full inspection surface
  rather than the final drawer. Drawer migration and parity cleanup are
  explicitly deferred to Round 5.
- The initial brush selects an interval without automatically zooming into it;
  wheel zoom and double-click reset remain separate direct actions. Smooth
  semantic zoom is deferred to Round 4.

## Round 2.5 verified implementation result - Checkpoint B

Round 2.5 is complete and stopped at Checkpoint B. Round 3 has not started.

### Semantic compression and visual hierarchy

- Default row count is based on available Canvas height only and is clamped to
  10-18 target rows. At 1920x1080, real `ks4_exp1` renders 17 anatomical
  groups; changing to the 3840x1080 requested viewport does not add rows.
- Groups never cross a shank or a reliable contiguous probe-track segment.
  Where Unit anatomy is absent, ordering and fallback boundaries remain based
  on real Unit-map/`Unmapped` continuity; probe-track labels are shown as track
  context and are not presented as inferred Unit identity.
- A group row is explicitly marked with a diamond and Unit count. Selecting a
  large group replaces it in place with three or four smaller contiguous local
  groups; continued focus reaches real Unit rows without unfolding the whole
  recording.
- Selecting Unit 7 shows only that Unit and at most two depth neighbors per
  side inside its anatomical group. The remaining members stay aggregated and
  all four shanks remain visible. Selection uses an outline and gutter marker,
  not color alone.
- Ordinary aggregate activity is recessed. The warm aggregate texture is the
  fraction of constituent Units whose bin count is strictly above that Unit's
  own recording-wide p90. Each Unit's threshold is computed across all 512
  recording bins; a zero threshold therefore marks only non-zero bins. The
  individual row remains robust p95-normalized display intensity.
- On real `ks4_exp1`, the former fraction-active aggregate had median 0.592233,
  p95 0.815534, and 37 of 512 bins at or above 0.8. The selected p90-exceedance
  metric has median 0.038835, p95 0.330097, and zero bins at or above 0.8. This
  preserves temporal contrast without the former saturation.

### Spatial, temporal, and video behavior

- The spatial gutter labels each shank once, shows meaningful depth boundaries
  and contiguous probe-track region bands once, hatches `Unmapped`, and labels
  ambiguity only when it exists.
- Expanded Unit identity is explicit. The representative mapped case is
  `Unit 7 · Shank 1 · 240 um · MPN · SQLite · legacy_unverified`; the MPN
  probe-track band remains contextual rather than a substitute for mapping
  provenance.
- Expanded rows use recording density at the full range, a normalized rate
  envelope at medium scale, and individual spike marks only at short scale.
  Exact spikes are therefore not painted across the full recording.
- The selected interval is a secondary translucent overlay with boundary
  lines. The verified real-data interval is 95.894-185.477 s.
- The video split defaults to 26%, is keyboard- and pointer-resizable from
  20-42%, and keeps one shared cursor. Attaching the deterministic validation
  video at the current neural cursor preserved 185.477 s (video slider
  185.4667 s within the frame mapping).

### Checkpoint B tests and performance

- Activity overview semantics, anatomy boundaries, stable membership,
  progressive focus, selected-Unit neighborhood, temporal detail, HTML wiring,
  i18n/help, video synchronization, workspace layout, incremental ingest, and
  safe real-data Node checks: PASS.
- Python suite: 15/15 PASS.
- Safe real-data validation: 18 recordings, 504 files, 1,603,487,329 bytes,
  2,387 Units, 4,450,319 spikes, 1,402 mappings, 25 regions, 5,120 probe-region
  rows, and four shank tracks.
- Direct `ks4_exp1` overview builds with both 103 x 512 matrices were 63.709 ms
  in the final validation and 73.259 ms in the earlier audit. After a fresh
  service start the cold build was 70.642 ms and the hot cache lookup was
  0.005 ms. The JSON response was 273,844 bytes. These are one-machine
  observations, not general performance guarantees.
- Browser smoke testing covered default, local group focus, mapped selected
  Unit, interval, video, separator keyboard control, and ultrawide states. The
  final browser console contained no warnings or errors.

### Checkpoint B screenshots

- `desktop-default-overview-no-video-1920x1080.jpg`
- `desktop-group-focus-local-unfold-1920x1080.jpg`
- `desktop-unit7-expanded-mapped-anatomy-1920x1080.jpg`
- `desktop-unit7-expanded-mapped-interval-1920x1080.jpg`
- `desktop-video-synced-resizable-1920x1080.jpg`
- `ultrawide-video-unit7-synced-3840x1080.jpg`
- `short-range-individual-spikes-video-ultrawide.jpg`

The files are stored outside the repository in the Codex desktop Checkpoint B
evidence directory.

### Checkpoint B limitations and deviations

- The provider still exposes one 512-bin in-memory level. Persistent and
  multi-resolution storage, cancellation, and progress UI remain Round 3 work.
- The real recordings do not include an attached laboratory behavior video;
  video-present and shared-cursor behavior was verified with the existing
  deterministic validation video only.
- The app requested a 3840x1080 CSS viewport and retained the same row
  structure. The Codex desktop capture surface was 3332x1080 after its sidebar
  reservation, so the stored ultrawide bitmap is 3332x1080 even though the
  browser layout viewport was requested at 3840x1080.
- Mapping provenance remains `legacy_unverified` where that is what the catalog
  reports. Round 2.5 does not promote probe-track context into confirmed Unit
  anatomy.
- Focused groups may temporarily exceed the default 10-18 target because local
  replacement preserves the rest of the experiment while exposing detail.
