# Event response preview

This is the reviewable 4.15.2-beta.1 event-analysis checkpoint, not completion of
the long-running behavior/dynamics project. The saved standalone HTML calculates
responses locally. Python is used only for an independent developer reference.

## Use

The workspace and response dialog expose separate recording and video label sources. Allen VBN lick sensor timestamps at `processing/licking/licks/timestamps` are recording point events with the original row index and neural time. New runs start with all eligible trials and comparison off. An explicit active-trial filter is available for event types carrying that flag. A new analysis opens with the workspace source and type; restoring a saved analysis restores its own inputs.

Open **Event responses** in the signal toolbar. Each new analysis opens with its inputs visible. Choose the event label and Units, using all Units, a brain region, a probe or spike view, explicit IDs, or highlighted signal rows. Filter onsets by the whole recording, the current signal interval, or custom recording times (start inclusive, end exclusive). Set the separate event-relative response window and bin width, then run. Reopen the settings above the results to revise these inputs. Advanced settings include grouping parameters. Automatic windows use the available observation intervals.

In the Probe and spike selection views, select a physical probe and save the highlighted Units to the analysis list. The list records each probe and its local Unit IDs. Removing an entry updates the input for the next run. Panning and zooming in the spike picker affect that view only.

**Combined probes** uses the imported spike arrays of the current session. Each source uses its own sampling rate to convert sample times to neural seconds. Equal local Unit IDs retain their separate source identities. The grouped heatmap, trial raster and saved results identify the probe and its original Unit ID. Selecting an occurrence opens that Unit on its physical probe and returns to the associated video. Kilosort inputs without session metadata require confirmation of a shared acquisition and time origin. Project exports store the source recordings and the analysis result. Reopening the combined scope rebuilds its spike index from those sources.
With an empty field, available NWB Unit observation intervals are applied automatically,
including known gaps. If only some selected Units have intervals, their intersection
is used and the missing Unit IDs are recorded. Without any supplied coverage, calculation
uses an explicit continuous-observation assumption, shown with the result and retained
in exports and saved projects. Last spikes and video duration never establish coverage.
Malformed supplied metadata remains an error; it is not silently treated as absent.
Explicitly entered intervals remain user-declared, not independently verified.

Named manual intervals are usable directly, including after boundary edits, without
changing their stored review status. Model candidates retain their source and are not
silently confirmed. Any user-defined label uses the same analysis path. No particular
behavior example or publication-level validation is a prerequisite for the feature;
there are no normal/advanced modes. Responses align to selected interval starts, which
need not be true behavior onsets.

The experimental selector uses only `sourceKind: experiment` rows. Historical
annotation rows in an event asset are retained as exclusions with reason
`annotation_requires_current_document`, not relabelled as experimental events.
Load the corresponding annotation document and video, then use **Video annotations**
to apply current labels, subject/track selection and the current shared TimeMapping.
If an asset has only annotation rows and a current annotation document is loaded,
the dialog selects that document. A separate event-metadata read error does not
prevent use of current manual annotations; the error remains visible outside the collapsible settings and is saved as
`provenance.sourceMetadataErrors` (role, message, unresolved status). Successfully read invalidity metadata also
retains its persistent warning even if another metadata asset cannot be read.
Metadata failures do not skip saved-analysis restoration. Invalid source coverage
can be replaced only by an explicit manual interval declaration, not an inferred
acquisition extent.

Annotation inputs can additionally select an exact subject and track; empty
selectors mean all subjects/tracks. Their saved values are restored before event
identity checks. Unreviewed or differently filtered intervals retain exclusion
reasons and are not treated as negative examples.

Responses start ungrouped. Choose **Group by response shape** to fit the displayed responses. Advanced controls include the cluster count, feature
normalization and seed. The separate Worker can be cancelled without cancelling
the shared activity Worker. Results show a selected Unit's mean rate and binned
trial raster. **Show Unit at event** returns to the existing shared neural-time
cursor and Unit, including the original annotation segment when applicable.
Selecting a group member or **Show Unit without changing time** changes the Unit
only. The shared time/interval and anatomical order of the main view are retained.
**Export analysis JSON** exports results and provenance separately. In a browser
project, **Save analysis in project** saves the latest result for this Recording.
Export the project package for a portable backup. Opening a saved event analysis from the project menu
restores its result after its exact source content, event selection,
annotations and time mapping pass validation. Computation alone does not replace
a previously saved result. Raw-folder inputs must first become a browser project
to use result persistence. Different Recordings retain separate saved results.

## Optional condition comparison

**Event response figures** uses the two conditions and included Units of the current analysis. J shows separate trial means for each condition with identical Unit rows, time bins and colour scale. The displayed baseline is each Unit's pre-event mean within its condition when pre-event bins are present. Clustering fits once on the reference, including across probes. K overlays the two trial-averaged curves in Hz, giving each Unit equal weight within its group. L uses one selected real trial per condition and raw spike timestamps for a subset of the analysis Units. M uses the complete analysis Unit set. For each Unit and condition it divides the raw spike count in the chosen half-open time window by the number of trials and the window duration. An optional pre-event window shows absolute baseline rates separately. Hovering reads the plotted values. Exports use the same data, an opaque white background, and 2× resolution.

For Allen image changes, the plots use the presentation start time. Hit and Miss in new analyses come from matching two selected labels within an explicit time window. The plot records both labels and the window. An original trial ID can identify the source row independently of this assignment. The panel references refer to the display questions in [Sun, Zhang et al., Fig. 5J–M](https://guangweizhang.com/publications/Sun%20Zhang%202025%20Science.pdf#page=8). J extends the paper's single clustered heatmap to a matched pair; L and M use the selected Units and events of the loaded recording.

Choose a scalar event field with at least two observed values, then choose a reference and a second value. The values retain their source types, so the number 1 and the string "1" are distinct. Missing and other values are omitted only for the selected two-group comparison. Video annotations also expose their subject and track when varied. A fresh analysis uses an explicitly chosen event or the only available event. With multiple types and no prior choice, select one before running. Historical saved comparisons retain their original provenance. New analyses offer ordinary metadata such as stimulus or block and the explicit two-label rule.

### Matching two event labels

Choose the alignment label, then **Compare trials by → Match two labels (Hit / Miss)** and select a response label. The labels can come from the recording or from video annotations mapped to the same neural clock. Each trial uses the alignment-label onset as zero. The first response-label onset in `[trial onset + start, trial onset + end)` is a Hit. With no matching onset the trial is a Miss. Multiple responses still count as one Hit. The same response may match overlapping trials. A video response window extending outside known mapped video coverage is excluded. A Miss describes the supplied labels, so interpretation depends on which behavior was annotated and how completely.

Advanced settings initially use **0.15 to 0.75 seconds**. Changing these values sets the local default for new analyses. A saved analysis retains its own window and label sources. Imported trial outcome flags are excluded from new condition comparisons. When all trials are Miss, that available group is displayed.

### Repeated events in a response window

By default, raw spike rasters mark other onsets of the alignment label with diamonds. Hovering over a row shows their count and relative times. The exported raster includes the same markers. The test uses the spike response window (left inclusive, right exclusive), independently of the label-matching window. It checks all occurrences in the selected event source and subject/track, including those outside the trial selection or in a different condition. An interval label contributes its onset. Distinct simultaneous occurrences count separately. **Exclude trials with another onset of the same label** removes each affected trial before computing rates, grouping or splitting trials. Saved results retain the selected policy, source onsets and matched response identities.

### Allen presentation and trial identity

An active image change keeps the measured presentation onset. When presentation `start_frame` uniquely matches trial `change_frame`, the event also keeps the original trial ID for tracing the source. This association only uses frame identity. Matching a response label uses its time on the neural clock and works with or without a trials table.

For a paired comparison, the chosen reference condition supplies the fitting
trials. The other condition uses the same Unit IDs, group assignment and row
order. A constant reference profile excluded by shape normalization remains
unassigned. Both conditions use the same colour scale and the same time bins.
Selecting a trial in the raw spike raster seeks to its source time. Video
positioning uses the recording's current mapping and media coverage.

During a run, the process view follows one Unit from absolute spike times through
event-relative spikes, pooled bin counts, firing rate and heatmap row. It uses the
most recently highlighted Unit when included in the input. The raster previews a
few trials. Each bin's rate uses the count from **all** included reference trials
divided by their number and the bin duration in seconds. The clustering step
shows actual iterations of the main fit. Its row preview uses the same ordering
as the result heatmap. Process views can be revisited until the inputs change.
Opening a saved result exposes **Run again** to generate a fresh process trace.

Each row of the screening heatmap is one Unit. The heatmap shows change in Hz from the pre-event mean when a baseline is available, or absolute Hz otherwise. Selecting a row loads exact event-relative spike times for that Unit beside the heatmap. Grouping orders the same Units by response shape in the reference condition. PNG export uses a white plot background for both display themes.

## Event contract

`explorer-events.json` uses schema `neuropixels-events/1`, `recordingId`,
`timebase: neural_seconds`, and `events`. Each event contains:

- Unique `id`, original `sourceId`, `sourceKind` (`experiment` or `annotation`),
  `type`, `kind` (`point` or `interval`), `start`, and optional `end`.
- Experimental rows retain `sourceTable` and available scalar conditions, including numeric, Boolean and text values.
- Annotation events retain scheme, review state, subject, track, original
  video time, source segment and candidate run identity. Point annotations
  carry `videoStart` and mapped `start`, with `videoEnd` and `end` set to null.
  Duration annotations carry both endpoints in each timebase. The adapter
  applies the active scheme and shared `TimeMapping`. By default it includes
  reviewed, labelled events within the mapping. Exclusions retain reasons.

The Allen HDF5 NWB importer reads `intervals` tables and creates this asset for
the selected probe Recording. Only image-presentation tables with `image_name`
can yield `image_change` or `omission` event types. A trial's `is_change` flag
does not make its trial start the stimulus change time. Missing event tables
do not prevent importing the Recording. Invalid rows, inconsistent columns and
the 100,000-event bound are reported as exclusions. Existing cached projects
without the new event asset must be reimported or supplied with a compatible
event asset; they are not silently upgraded by inventing events.

## NWB invalidity metadata

The reserved `/intervals/invalid_times` table is validity metadata, never an
experimental event source. Its optional `source.invalidTimes` record uses
`neuropixels-nwb-invalid-times/1`, preserves original IDs, start/stop seconds and
literal tags (including ragged tags/index), and states `preserved-not-applied`.
At most 10,000 rows, 50,000 tags, 1,000 characters per tag and 1,000,000 total tag
characters are retained. Unsupported shapes, malformed rows/indexes or excess
bounds retain explicit issues; timeseries references are flagged but not decoded.
This is a bounded metadata copy, not a validated exposure mask. Negative times
relative to the NWB reference are retained, not clipped.

A persistent warning is shown for both experimental and annotation analyses.
The metadata is included in analysis provenance and source fingerprints, even
when events come from annotations. No invalidity mask is automatically applied
to spikes, events or observation intervals. Allen stimulus, probe and all-probe
labels have different meanings, and user-defined NWB tags cannot safely become
a global neural missing-data mask. Observation coverage and analysis validity
are separate. A user-declared interval does not resolve these source issues.

Older cached event assets that mistakenly contain an invalid_times event are
rejected with an explicit reimport instruction; saved results are not silently
reinterpreted or deleted. Other event/project schema versions are unchanged.

The checked real VBN file 1064644573 contains neither `units/obs_intervals` nor
`intervals/invalid_times`; its session start and timestamps reference both equal
2020-11-19T23:18:01+00:00. This absence does not establish continuous acquisition
or prove that no upstream exclusions occurred. A small synthetic HDF5 fixture
checks the adapter and warnings, not the real file's biological validity.

Source semantics: [NWB invalid_times](https://nwb-schema.readthedocs.io/en/latest/format.html#groups-intervals-invalid-times),
[NWB Units](https://nwb-schema.readthedocs.io/en/latest/format.html#units),
and [Allen EcephysSession implementation](https://allensdk.readthedocs.io/en/latest/_modules/allensdk/brain_observatory/ecephys/ecephys_session.html).
The Visual Coding EcephysSession behavior must not be assumed to describe
VBN BehaviorEcephysSession or every historical source asset.

## Numerical meaning and limits

Responses align to the marked timestamp for a point and to the onset for an
interval. Video points require a mapping at one timestamp. Video intervals
require a mapping at both endpoints and retain their end for duration-aware
analysis. With a fixed onset, changing a valid endpoint leaves the response
counts and rates unchanged. Bins are half-open `[left, right)`. Only windows
fully contained in ordered, non-overlapping recording coverage are accepted;
adjacent coverage intervals are merged. Incomplete windows are excluded, not
zero-filled. Zero-spike Units remain present.

`neuropixels-event-response/1` retains Unit/event identities, events, excluded
events, bin edges, parameters, a `[Unit, event, bin]` uint32 count tensor and a
`[Unit, bin]` float64 mean rate in Hz. The response API permits at most 4,096 Units, 5,000 bins per window and 32,000,000 count cells (128 MB of uint32 counts). Callers can set a lower count-cell ceiling. Presets in seconds are −0.1 to +0.4 with 0.005 bins, −2 to +3 with 0.05 bins and −120 to +120 with 1-second bins. The manual fields accept other windows and widths. Invalid or numerically collapsed bins fail.

The dedicated Worker reads paired NPY payloads in blocks of 262,144 rows, verifies
lengths/dtypes and sorted nonnegative times, and retains only selected Units.
The default selected-train limit is 8,000,000 spikes. It does not duplicate the
activity Worker's entire dataset cache. Closing, cancelling or changing the
Recording terminates this Worker. An input/context change prevents stale result
export and source return.

Clustering uses seeded first-center selection, farthest-point subsequent
initialization and Lloyd iterations (maximum 100). `shape` z-scores each Unit's
mean response across bins and excludes constant curves. `rate` uses unscaled Hz.
The output retains normalization, seed, assignments, centroids, excluded Units,
iterations, convergence and inertia. Too few distinct profiles or empty clusters
fail explicitly. These groups are not cell types, causal effects or evidence
of significant/stable clusters. Independent cross-validation, biological
robustness and a scientific choice of cluster count remain outstanding.

## Population views and sensitivity diagnostics

The response-group view sorts Units only within the analysis view, never the
anatomical observation bench. It retains a separate ungrouped entry for excluded
Units. Group means are equal-Unit averages of the trial-averaged rates in Hz,
not pooled spike rates, cell counts or confidence intervals. The member selector
uses exact Unit identities and stays synchronized with the individual-Unit view.

The heatmap is display-only within-Unit z-score across response bins, regardless
of the clustering feature mode. It is not baseline subtraction. Constant curves
display as zero; colors clip at ±3 with a signed key. At most 128 row blocks and
360 column blocks are painted, averaging adjacent source rows/bins rather than
dropping data. The exact members remain selectable and their unaggregated rates
remain available. A pixel block is not necessarily one Unit or one response bin.

Optional **Check trial split-half sensitivity** runs a user-selected number of balanced random event
splits (default 50) at the selected fixed cluster count and normalization. Each half recomputes
its own mean rates from trial counts and fits separately with a recorded seed.
Adjusted Rand Index compares assignments on shared eligible Units, independent
of cluster label numbering. Each split requires at least four total events,
at least max(3, k+1) shared Units, nontrivial assignments and converged fits.
Failures retain reasons rather than being scored as zero. The result preserves
each left-half event index (in response event order), half sizes, fit seed,
eligible Units, exclusions and ARI, plus successful-count/mean/min/max summaries.
The UI and API accept 1–1000 repeats. A per-selection estimate uses the trial tensor size, group count and observed full-fit iterations. The form previews the maximum based on initial fit cost and the run refines it with the observed iteration count. A separate bound limits retained split provenance. When the request exceeds the budget, the result reports the feasible repeat count. Closing/cancelling terminates the same disposable Worker.

These are descriptive sensitivity checks, not independent replications,
confidence intervals, statistical significance or biological validation.
Repeated splits reuse the same events; temporal correlation and overlapping
windows can invalidate an independence assumption. This is not a replacement
for chronological held-out evaluation, control conditions or choosing k on an
independent dataset. The checked three-Unit real-data fixture produced ARIs
[-0.5, -0.5, 1, 1] (mean 0.25), so even this small illustrative grouping is not
presented as robust biological structure.

`neuropixels-event-analysis/1` export contains the response, optional clusters,
input content fingerprints and provenance: creation time, source file
names/sizes/mtime, source event metadata, exclusions and `coverageOrigin`.
That origin is `user-declared-unverified` or
`source-reported-unit-intersection`; the latter retains NWB source details.
Names and modification times are contextual provenance, not proof of identity.

## Project persistence and compatibility

The optional `event-analysis` asset has Recording identity and path
`analyses/event-response/<encoded-recording-id>.neuroanalysis`. The existing
`neuropixels-browser-project/1` package and IndexedDB version 1 are unchanged.
Old packages without analysis still open. Analysis bytes are not passed to
Kilosort ingestion. Saving atomically replaces only the same Recording's prior
analysis; other assets and the current stored project metadata are preserved.
Annotation writes are flushed first, not overwritten by the analysis transaction.
Failed saves preserve the preceding stored result. Imported packages retain the
existing behavior of receiving a new project ID without changing the original.
The optional `diagnostics` field uses `neuropixels-response-stability/1` and is
covered by the same metadata checksum. Split indices, parameter identities and
summary consistency are validated before rendering. Older saved analyses without
diagnostics or annotation filters restore as no diagnostic and all subjects/tracks.

Analysis assets start with `NEUROEA1`, a uint32 little-endian JSON byte length,
then UTF-8 metadata, uint32 little-endian counts and float64 little-endian rates.
Schema `neuropixels-event-analysis-binary/1` records exact array lengths and
SHA-256 checksums of metadata and tensors. Metadata is limited to 16 MiB and the full asset to 256 MiB.
Unsupported schema/response versions, malformed dimensions, invalid identities,
truncation, tensor corruption or rate/count disagreement are rejected. A failed
restore leaves the source project usable and reports the reason; it does not
silently recompute or delete the saved asset. Checksums detect corruption, not
authenticity or biological validity of a third-party package.

`sha256-ordered-chunks/1` fingerprints read immutable source Blobs in 1 MiB
chunks. The final SHA-256 covers an ordered JSON object with domain
`neuropixels-source/1`, `chunkBytes`, `size` and the individual chunk hashes.
This is deliberately a versioned chunk-tree digest, not a conventional whole-file
SHA-256. Required roles are spike times, spike clusters and the sample-rate file;
event and coverage assets are included when present. Restoration also compares
the exact event-set digest, sample rate, selected event identities and coverage
provenance. A same-size source change, review/label change or changed TimeMapping
therefore requires recomputation. Hashing is cancellable and bounded in memory,
but scans the relevant source files before computation/restoration. No source
files are uploaded and no external preprocessing is required.
Pure experimental assets and the live annotation adapter keep their prior event
digest unchanged. An old analysis that used a mixed event asset as experimental
input must be recomputed after source separation. Its saved bytes and source
project are preserved; old annotation timestamps are not silently reinterpreted.

Video bytes themselves are not part of this neural-response fingerprint. The
saved annotation identity, intervals, labels, review state and mapping are checked;
this does not independently authenticate the video or the annotator's judgments.

## Validation

- `node tests/validate-event-inputs.cjs`: source-kind routing, current mapping,
  manual Save without repeated confirmation, onset-only counts, unchanged pure
  experimental digests and retained provenance.
- `node tests/validate-event-analysis.cjs`: event/annotation contracts, exact
  half-open counts, coverage gaps and precision guards, deterministic grouping,
  bounded NPY reading, Worker protocol, Allen event adaptation and event asset
  project roundtrip.
- `node tests/validate-event-persistence.cjs`: 20 focused checks for source
  coverage, gap-preserving intersections, exact binary arrays, corruption and
  incompatible source rejection, cancellation and old package compatibility.
- `node tests/validate-invalid-times.cjs`: 13 checks for reserved-table exclusion,
  bounded literal scope metadata, malformed input, old-asset rejection, no inferred
  masks and exact provenance persistence. The browser fixture also verifies ragged
  tags through real WASM, persistent Chinese warning at 480 px, annotation-analysis
  save/reopen, and legacy event rejection without starting a worker.
- `node tests/validate-event-population.cjs`: 14 checks for equal-Unit means,
  identity/order, ARI, deterministic split provenance, constant exclusions,
  resource bounds, subject/track filters and diagnostic persistence/corruption.
  An independent developer comparison against scikit-learn's adjusted Rand score
  matched 32 partition pairs to floating-point tolerance (max error 5.6e-17).
- `node scripts/build-standalone.cjs` and
  `node tests/validate-browser-project.cjs`: standalone bundle syntax and existing
  binary project compatibility.
- Optional real-data/browser check: set `EVENT_ANALYSIS_FIXTURE` to an independent
  reference JSON and `EVENT_ANALYSIS_OUTPUT` to an artifact directory, then run
  `node tests/validate-event-analysis-browser.cjs`. It uses an installed Chrome
  executable (`EVENT_ANALYSIS_CHROME` can override the standard Windows location),
  an isolated headless profile and a loopback-only server. It neither uses the
  user's browser profile nor downloads packages. The fixture includes paired
  trains, original interval tables, event IDs, independently computed counts and
  an explicit numerical test coverage domain.
- Optional actual HDF5/WASM coverage adaptation: generate a tiny developer fixture
  with `python tests/prepare-event-coverage-fixture.py <output.nwb>` using an
  existing h5py/numpy environment, then set `EVENT_ANALYSIS_COVERAGE_NWB` when
  running the browser check. It tests the adapter's HDF5 layout and selected-Unit
  identity through the actual bundled Worker. It is a synthetic schema-contract
  fixture, not a certified NWB dataset or observed acquisition coverage.
- Set `EVENT_ANALYSIS_VIDEO` and `EVENT_ANALYSIS_VIDEO_CLOCK` to an existing short
  video and its matching Allen clock JSON to include the full page-reload test.
  Test media stays on a loopback-only server. The browser adds video through the
  normal project flow, verifies the clock hash, creates explicitly named QA
  intervals, computes filtered annotation responses, saves/exports, fully reloads
  the page and imports the package with a fresh project identity.

On 2026-11-12, Allen session 1064644573/probeC yielded the expected 98 VISp Units
under the established reference filter. Three sampled Units and 205 active image
changes were checked at 10 ms over [-1, 1.5) s: all 153,750 count cells and mean
rates exactly matched independent Python comparisons. The actual standalone
application reproduced these counts in headless Chrome. Export, stale-result
guard, reviewed-annotation mapping, source return, cancellation and a 480 px
Chinese viewport passed without uncaught errors. Desktop and narrow screenshots
were inspected. The 4.12 browser check also saves, exports and imports an 8.1 MB
project containing the real-data response, restores all 153,750 counts exactly,
preserves the original project, rejects same-size changed source content and a
corrupt tensor, and opens an old package with no analysis. Atomic-save rollback
and preservation of newer stored project metadata are checked. Reviewed
annotation restoration, rejection after TimeMapping changes and source-coverage
restoration are checked in the same project. The 4.13 test adds group-member
selection without time/order changes, exact equal-Unit means and diagnostic
restoration. An existing 120-second Allen video plus measured frame clock was
included in a 37.8 MB package and restored after a full page reload. Five QA
annotations and subject/track filters produced three accepted events. Video,
mapping, annotation document and exact count/rate arrays survived; a separate
direct spike comparison had zero mismatches. These QA labels are not evidence
of repeated observed behavior, annotation accuracy or neural-behavior effects.
The coverage supplied for the real-data comparison is a numerical test
domain, not independently verified acquisition coverage. This does not validate
the whole 349-Unit probe, biological clusters, end alignment or a dynamics model.

## Remaining stages

Scope-specific invalidity adaptation, independent acquisition coverage validation, broader browser/real-data scaling,
a repeated genuinely observed behavior case, held-out scientific robustness and
scientific choice of k remain to be implemented or validated. Optional video
features and continuous dynamics remain separate work. Dynamics must use true
continuous activity, not concatenated event means. No line-attractor conclusion
or universal NWB-Zarr support is claimed by this checkpoint.
