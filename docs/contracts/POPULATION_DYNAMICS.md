# Continuous population dynamics

[Documentation index](../../README.md) · [Data contract](../DATA_CONTRACT.md)

## Input and workflow

The on-demand **Population dynamics** dialog uses the current local Recording's
original spike arrays and sampling rate. Select original Unit IDs and a continuous
neural-time range, then compute. It does not concatenate event means, require
behavior labels, or create a second normal/advanced analysis mode. The indexed
service does not yet provide this analysis input path.

The initial range comes from the selected neural interval. With no selection it
uses up to 30 seconds of the visible range around the cursor. The left probe map
can supply Units across simultaneously recorded probes. With no selection the
dialog initially uses all available Units up to 512. For larger inputs it displays
the 64 evenly spaced Unit IDs selected from the catalog and the original total.
The editable list controls the actual analysis. Results retain the physical probe
and original Unit ID for each member of a combined recording. Counts use `[start,end)` bins. A final
partial-width bin is excluded so all count features have equal exposure duration
under the declared observation assumption.

NWB Unit observation intervals are intersected for selected Units with source rows.
Known gaps exclude any bin not fully contained in that intersection. If some Units
lack rows, their IDs and the partial coverage limitation are retained. Missing all
coverage remains `null`, permits calculation, and displays the continuous-observation
assumption. Last spikes and video duration never create coverage. Malformed supplied
observation metadata is not silently replaced by unknown coverage. Every supplied
Unit row is validated before treating selected rows as missing. Explicit importer
errors for the selected Units or global interval shape/index fail rather than
become unknown; unrelated excluded rows remain in source provenance. Source
`invalid_times` metadata is retained but not globally applied: probe, stimulus and
other scopes require separate interpretation.

## Numerical definition

- Rows are retained continuous bins; columns are original selected Unit IDs.
- Chronological retained rows are partitioned 70% training, 15% validation and the
  remainder test. Transition pairs must be adjacent original bins within a single
  partition. No pair crosses known gaps or split boundaries.
- Each Unit is standardized using training mean and sample standard deviation
  (`n-1`). Training-constant Units remain in counts but are excluded from PCA with
  explicit IDs. Two nonconstant, independent PCA directions are required.
- Two PCA axes are fitted only on training bins. Validation/test scores use those
  same means, scales and loadings. Deterministic power iteration uses orthogonal
  deflation; sign convention and convergence checks are explicit in the core.
- The affine predictor is `x_next = A x + b`. Ridge minimizes mean-pair squared
  Euclidean error plus `ridge * ||A||_F^2`; the intercept is unpenalized. Validation
  chooses from `1e-8, 1e-6, 1e-4, 1e-3, 1e-2`. Test does not select or fit parameters.
- The constrained line predictor imposes a unit eigenvalue, fits its perpendicular
  contraction and intercept, and chooses among 720 orientations on `[0,pi)` using
  training error. The transverse coefficient is constrained to `[0,0.999999]`.
  The imposed eigenvalue is not evidence for a biological line attractor.
- Persistence and training-mean predictions are reported on the same held-out pairs.
  Overall MSE averages squared error over pairs and both PC dimensions. It is half
  the mean squared Euclidean error. Split pair counts and per-dimension errors are
  retained, along with model spectrum and fixed-point diagnostics.

No significance, unbiased prospective accuracy, model-selection completeness or
biological discovery is established. A small numerical fixture is not population-wide
scientific validation. No trained rSLDS checkpoint or paper figure reproduction is
claimed. Existing independent calcium-data numerical research is not substituted
for these current Recording inputs.

## Time and source return

The trajectory connects only adjacent bins in the same partition. Select a point
with the plot or the keyboard-accessible bin selector, then use **Show this bin in
signals / video**. This restores the shared neural cursor, visible range and selected
interval, preserving selected Unit identity. Video seeking uses the current shared
time mapping; absent video, out-of-range mappings and unverified manual offsets do
not become validated by the analysis.

## Execution, limits and cancellation

A disposable Worker reads paired NPY arrays in bounded chunks, retaining only
selected Units in the requested range. The entire source remains checked for
sorted finite timestamps, safe IDs and array integrity. Default selected-spike read
limit is 8 million. Numerical limits are 512 Units, 10000 bins, 2 million count cells,
250 million covariance operations and 250 million PCA operations, with 5000 PCA
iterations per axis. Exceeded limits fail with an actionable message, not hidden
subsampling. Close, Cancel or Recording changes terminate the Worker; results from
stale operations do not overwrite the current view. The activity Worker is separate.

## Persistence

**Save analysis in project** stores one optional `population-dynamics` asset per
Recording, separate from `event-analysis`, video and annotations. Exporting the
existing `.neuroproject` includes it; old packages without it remain compatible.
No IndexedDB schema migration is required. A later save replaces only the same
analysis role and Recording.

`neuropixels-population-dynamics/1` identifies the numerical result. The storage
envelope is `neuropixels-population-dynamics-storage/1`, framed by `NEUROPD1`, a
little-endian uint32 JSON byte length, and checksummed UTF-8 JSON. The maximum asset
size is 64 MiB. The envelope preserves original Unit/bin identities, counts, PCA,
partitions, all fitted/baseline models, metrics, assumptions, coverage provenance,
source fingerprints and optional time-mapping provenance.

Restoration validates the numerical structure, checksum, Recording, sampling rate,
Unit availability and exact source content. Required source roles are spikeTimes,
spikeClusters and sampleRate; coverage and events are fingerprinted when present.
Fingerprints use ordered SHA-256 hashes of 1 MiB chunks. They establish integrity,
not authenticity or scientific validity. A changed video mapping does not invalidate
neural computation; source return intentionally uses the current mapping.

## Reproducible checks

- `node tests/validate-population-dynamics.cjs`: independent Jacobi PCA reference,
  bin/gap boundaries, train-only fitting, fixed points, models, limits and Worker QA.
- `node tests/validate-population-dynamics-integration.cjs`: bounded paired reader,
  unchanged event-reader default, Worker result parity, coverage source handling and
  main-app integration.
- `node tests/validate-population-dynamics-storage.cjs`: corrupt/truncated assets,
  source mismatch, project roundtrip and role-isolated atomic save semantics.

Actual browser, source-return and complete project reload evidence must correspond
to the built HTML being reviewed. Node/VM tests alone are not browser acceptance.
