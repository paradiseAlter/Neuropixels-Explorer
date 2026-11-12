# Event response preview

This is the reviewable 4.11.0-beta.1 event-analysis checkpoint, not completion of
the long-running behavior/dynamics project. The saved standalone HTML calculates
responses locally. Python is used only for an independent developer reference.

## Use

Open a local Recording, then **Event responses** in the observation toolbar.
Choose experimental events or reviewed behavior annotations, an event type,
Unit IDs, a response window and a bin width. Provide valid acquisition intervals
as a JSON array of `[start, end]` pairs in neural seconds. The application does
not replace unknown coverage with the last spike, the video duration or a trial
table's extent. User-entered coverage is explicitly unverified.

Set clusters to zero for responses only, or select a cluster count, feature
normalization and seed. The separate Worker can be cancelled without cancelling
the shared activity Worker. Results show a selected Unit's mean rate and binned
trial raster. **Show Unit at event** returns to the existing shared neural-time
cursor and Unit, including the original annotation segment when applicable.
**Export analysis JSON** exports results and provenance separately. Results are
not yet restored from a `.neuroproject` package or after closing/reopening the
analysis dialog. Recompute from the retained source data and configuration.

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
of significant/stable clusters. Cross-validation, stability analyses and a
scientific choice of cluster count remain outstanding.

`neuropixels-event-analysis/1` export contains the response, optional clusters
and provenance: creation time, source file names/sizes/mtime, source event
metadata, exclusions and `coverageOrigin: user-declared-unverified`. File
metadata is contextual provenance, not a cryptographic content guarantee.

## Validation

- `node tests/validate-event-analysis.cjs`: event/annotation contracts, exact
  half-open counts, coverage gaps and precision guards, deterministic grouping,
  bounded NPY reading, Worker protocol, Allen event adaptation and event asset
  project roundtrip.
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

On 2026-11-12, Allen session 1064644573/probeC yielded the expected 98 VISp Units
under the established reference filter. Three sampled Units and 205 active image
changes were checked at 10 ms over [-1, 1.5) s: all 153,750 count cells and mean
rates exactly matched independent Python comparisons. The actual standalone
application reproduced these counts in headless Chrome. Export, stale-result
guard, reviewed-annotation mapping, source return, cancellation and a 480 px
Chinese viewport passed without uncaught errors. Desktop and narrow screenshots
were inspected. The coverage supplied for this comparison is a numerical test
domain, not independently verified acquisition coverage. This does not validate
the whole 349-Unit probe, biological clusters, end alignment or a dynamics model.

## Remaining stages

Project-bound result persistence, richer population/cluster summaries, acquisition
coverage provenance, source-data fingerprints, broader browser/real-data scaling
and scientific robustness remain to be implemented or validated. Optional video
features and continuous dynamics remain separate work. Dynamics must use true
continuous activity, not concatenated event means. No line-attractor conclusion
or universal NWB-Zarr support is claimed by this checkpoint.
