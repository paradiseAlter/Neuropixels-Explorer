# Event response preview

This is the reviewable 4.13.1-beta.1 event-analysis checkpoint, not completion of
the long-running behavior/dynamics project. The saved standalone HTML calculates
responses locally. Python is used only for an independent developer reference.

## Use

Open a local Recording, then **Event responses** in the observation toolbar.
Choose experimental events or reviewed behavior annotations, an event type,
Unit IDs, a response window and a bin width. Provide valid acquisition intervals
as a JSON array of `[start, end]` pairs in neural seconds. The application does
not replace unknown coverage with the last spike, the video duration or a trial
table's extent. User-entered coverage is explicitly unverified.
When the imported NWB actually supplies `units/obs_intervals`, **Use source
observation intervals** intersects the valid intervals of every selected Unit,
preserving gaps. Missing or malformed Unit coverage cannot be promoted to valid
coverage. This is a source-reported observation claim, not independent validation
of continuous acquisition. The checked Allen VBN sample has no such field.
Annotation inputs can additionally select an exact subject and track; empty
selectors mean all subjects/tracks. Their saved values are restored before event
identity checks. Unreviewed or differently filtered intervals retain exclusion
reasons and are not treated as negative examples.

Set clusters to zero for responses only, or select a cluster count, feature
normalization and seed. The separate Worker can be cancelled without cancelling
the shared activity Worker. Results show a selected Unit's mean rate and binned
trial raster. **Show Unit at event** returns to the existing shared neural-time
cursor and Unit, including the original annotation segment when applicable.
Selecting a group member or **Show Unit without changing time** changes the Unit
only. The shared time/interval and anatomical order of the main view are retained.
**Export analysis JSON** exports results and provenance separately. In a browser
project, **Save analysis in project** saves the latest result for this Recording.
Export the project package for a portable backup. Opening Event responses again
restores the saved result only after its exact source content, event selection,
annotations and time mapping pass validation. Computation alone does not replace
a previously saved result. Raw-folder inputs must first become a browser project
to use result persistence. Different Recordings retain separate saved results.

## Event contract

`explorer-events.json` uses schema `neuropixels-events/1`, `recordingId`,
`timebase: neural_seconds`, and `events`. Each event contains:

- Unique `id`, original `sourceId`, `sourceKind` (`experiment` or `annotation`),
  `type`, `kind` (`point` or `interval`), `start`, and optional `end`.
- Experimental rows retain `sourceTable` and available conditions (`active`,
  `is_change`, `omitted`, image and stimulus metadata).
- Annotation events retain scheme, review state, subject, track, original
  video-relative interval, source segment and candidate run identity. The
  active scheme and shared `TimeMapping` are used. Only reviewed, labelled,
  fully mapped intervals are included by default. Exclusions retain reasons.

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

Responses align to the event start. Endpoints remain available for future
offset/duration-aware analysis. Bins are half-open `[left, right)`. Only windows
fully contained in ordered, non-overlapping recording coverage are accepted;
adjacent coverage intervals are merged. Incomplete windows are excluded, not
zero-filled. Zero-spike Units remain present.

`neuropixels-event-response/1` retains Unit/event identities, events, excluded
events, bin edges, parameters, a `[Unit, event, bin]` uint32 count tensor and a
`[Unit, bin]` float64 mean rate in Hz. The default bound is 8,000,000 count cells.
The response API permits at most 4,096 Units, 5,000 bins and a configurable
ceiling of 32,000,000 count cells. Invalid or numerically collapsed bins fail.

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

Optional **Check trial split-half sensitivity** runs four balanced random event
splits at the selected fixed cluster count and normalization. Each half recomputes
its own mean rates from trial counts and fits separately with a recorded seed.
Adjusted Rand Index compares assignments on shared eligible Units, independent
of cluster label numbering. Each split requires at least four total events,
at least max(3, k+1) shared Units, nontrivial assignments and converged fits.
Failures retain reasons rather than being scored as zero. The result preserves
each left-half event index (in response event order), half sizes, fit seed,
eligible Units, exclusions and ARI, plus successful-count/mean/min/max summaries.
The API permits 1–20 repeats; a conservative 100-million-operation work estimate
limits extra computation. Closing/cancelling terminates the same disposable Worker.

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
Video bytes themselves are not part of this neural-response fingerprint. The
saved annotation identity, intervals, labels, review state and mapping are checked;
this does not independently authenticate the video or the annotator's judgments.

## Validation

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
