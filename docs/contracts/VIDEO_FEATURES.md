# Optional video feature exchange

This 4.14.0-beta.1 checkpoint adds a data-only boundary for external model
outputs. It does not ship, load or run a pretrained behavior model, arbitrary
JavaScript, Python, or a remote inference service. The existing manual annotation
and event-response paths do not depend on it.

## User workflow

Open a local video or a browser project containing its video. In **Annotate →
Clips & grouping → Model features / keypoints**, export **model-input.json**.
It contains the current recording/video identity, a bounded-memory content
fingerprint, annotation document and video/neural mapping snapshot. It does not
include video bytes, decoded frames, or neural arrays. The model owner must
provide the original video to their model through their own authorized workflow.

Return a `neuropixels-video-features/1` JSON file and choose **Import features
and group**. Group count, confidence threshold and per-feature scaling are
explicit controls. The disposable Worker computes feature groups locally.
Suggested clips enter the existing naming, review, edit and undo workflow.
No candidate is automatically confirmed. Import rejects a different recording,
video name/size/duration or video-content fingerprint before changing annotations.
Cancel, closing the editor and changing video/recording discard obsolete work.

Browser project videos retain their existing local Blob for bounded fingerprint
reads, without fetching or copying a remote video. The first checkpoint supports
local videos up to 512 MiB and feature JSON up to 25 MB. Remote/indexed video
URLs without an accessible local Blob are not supported by this exchange path.

## Shared data contract

The schema is `neuropixels-video-features/1`, and `timebase` must be
`video_seconds`. Required metadata:

- `id`, `recordingKey`, `subject`, `track`.
- `video`: `name`, `size`, `duration`, `fingerprint` copied from the model request.
- `model`: nonempty `name`, `version`, `source`. These are retained source claims,
  not independent certifications of model provenance or accuracy.
- `kind`: `features` or `keypoints2d`.
- `names`: ordered, unique feature/keypoint names.
- For scalar features, `units` contains one unit name per dimension.
- For keypoints, `coordinateSpace` is `image_pixels` or `image_relative`.
- `samples`: ordered, nonoverlapping rows with unique `id`, explicit
  `start`, `end`, `time`, optional nonnegative integer `frame`, and `values`.

Each row supports the half-open video interval `[start,end)` and must contain its
timestamp (`start <= time < end`). Sample support is supplied by the producer;
the importer does not invent a last interval, fill the start of the video,
infer timing from FPS, or promote this support to neural acquisition coverage.
An optional frame number is identity/provenance, not a measured clock.
Nonadjacent intervals and omitted rows remain gaps.

Scalar values are finite numbers or JSON `null`. A keypoint value is
`[x,y,confidence]` with confidence in `[0,1]`, or `null`. Nonfinite numbers,
duplicate names/IDs, inconsistent shapes and overlapping intervals are rejected.
Any missing coordinate/feature, low-confidence keypoint or degenerate required
body axis excludes the entire sample. Exclusion IDs, intervals and reasons are
saved. No imputation or missing-as-zero conversion occurs.

Fingerprints use the existing `sha256-ordered-chunks/1` algorithm: 1 MiB chunks,
SHA-256 of each chunk, then SHA-256 of the ordered JSON descriptor with domain
`neuropixels-source/1`, chunk size, total size and chunk hashes. This is not the
ordinary whole-file SHA-256. It checks byte identity, not clock calibration,
model validity, scientific truth or authenticity of a manually edited project.

## Pose preprocessing and clustering

`poseNormalization` defaults to `{ "mode": "none" }`. Raw image coordinates can
group camera position/orientation instead of behavior, so select transformations
for the scientific task rather than interpreting clusters as actions.

Optional body coordinates require all choices explicitly:

```json
{
  "mode": "body2d",
  "center": "body",
  "axis": ["tail", "nose"],
  "scale": true,
  "rotate": true
}
```

Subtract the named center, optionally rotate the named first-to-second axis onto
+x, and optionally divide by its Euclidean length. Missing/low-confidence
anchors are excluded. Confidence itself is not a clustering dimension.
These transformations may remove scientifically interesting position or heading;
the source coordinates and exact options remain saved.

After pose processing, dimensions constant to a standard deviation of `1e-12`
are excluded. All-constant inputs are unavailable rather than assigned invented
groups. Optional per-feature z-scores use the population mean/standard deviation
of eligible samples only. Alternatively retain feature units. Samples have equal
weight, not duration weight. Source measurements are not overwritten.

The baseline is seeded k-means++/Lloyd, seed 42 in the UI, at most 35 iterations.
Requested count is 2–32 and no greater than eligible samples. Fewer distinct
points may produce fewer occupied groups. Convergence/iteration limit is
reported. Centroids, labels, sample IDs, preprocessing statistics and exclusions
are preserved. There is no temporal smoothing or short-bout merging. Only
explicitly touching valid intervals with the same group become one clip.
Centroid distance is not a behavior probability.

Limits: 20,000 samples, 128 scalar dimensions or 64 two-dimensional keypoints,
1,000,000 scalar cells, and a conservative `samples × dimensions × groups × 36`
work estimate capped at 60 million. At least eight complete eligible samples are
required. These are engineering limits, not scientific adequacy criteria.

## Runnable example adapter

The browser global `NeuropixelsVideoFeatures` and CommonJS module
`scripts/video-features.js` expose `modelInput`, `adaptTimedKeypoints`, `validate`,
`prepare`, `group`, `candidates` and `workerSource`. The timed-keypoint adapter
takes a model-input request plus producer output, fills the shared recording,
video and timebase metadata, and validates the result. It accepts data only.

```javascript
const features = NeuropixelsVideoFeatures.adaptTimedKeypoints(request, {
  id: "my-model-run",
  subject: "animal-1",
  track: "pose",
  model: { name: "my-model", version: "1", source: "my model provenance" },
  names: ["body", "nose", "tail"],
  coordinateSpace: "image_pixels",
  poseNormalization: {
    mode: "body2d", center: "body", axis: ["tail", "nose"],
    scale: true, rotate: true
  },
  samples: timedModelRows
});
// Each timedModelRows item contains id, start, end, time, optional frame,
// and ordered values such as [[100,100,0.99],[120,100,0.95],[80,100,0.98]].
// Serialize features to JSON and import it in the current HTML.
```

`tests/validate-video-features.cjs` contains a complete executable synthetic
adapter example with timing, confidence, missingness and transformed coordinates.
The browser regression repeats that adapter through the actual HTML import UI.
The example is not a pretrained model or real-video pose estimate. Direct model
execution, plugin loading, generic DLC/SLEAP file readers, frame delivery to a
model, and a verified real pose/model dataset remain future extensions.

## Persistence and compatibility

Each candidate run retains the canonical feature asset, its `sha256-json/1`
digest, result, parameters and original segment/sample identities. Human edits
remain separate in `neuropixels-annotations/1`; schema names for existing
annotations and browser project/1 do not change. Old packages remain supported.
The combined annotation document is capped at 50 MB for this import path.
Saving/exporting the browser project retains the complete feature run, and a
full page reload/import restores it without rerunning a model or grouping.
Annotation JSON export retains the same provenance. Hashes are provenance
checks, not digital signatures or a promise that manually modified JSON is
authentic. No automatic reanalysis of imported annotation runs occurs.

## Verification and open scientific scope

Run `node tests/validate-video-features.cjs` for the focused contract checks.
`tests/validate-event-analysis-browser.cjs` additionally exercises real local
video identity, model-request export, adapter input, missing/confidence gaps,
same-size content mismatch, cancellation, source change, editor close, narrow
Chinese layout and full project reload. Its video/clock inputs remain opt-in.
Existing event-response/annotation suites must still pass after integration.

This checkpoint does not resolve the real Allen sample's acquisition coverage,
confirm any real behavior, validate an external model, establish cluster purity,
or complete continuous dynamics/line-attractor analysis. Synthetic adapter and
numeric agreement are software evidence only. Service-mode persistence of this
new feature payload has not received the browser-project end-to-end check.
