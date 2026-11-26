# Optional video feature exchange

This 4.15.0-beta.1 checkpoint adds a data-only boundary for external model
outputs. It does not ship, load or run a pretrained behavior model, arbitrary
JavaScript, Python, or a remote inference service. The existing manual annotation
and event-response paths do not depend on it.

## User workflow

Open a local video, a browser project containing its video, or a selected video
in the optional local service project. In **Annotate →
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
Cancel, native review-dialog dismissal, the annotation toggle, closing the editor
and changing video/recording discard obsolete work.

Browser project videos retain their existing local Blob for bounded fingerprint
reads, without fetching or copying a remote video. Selected local-service project
videos use the bounded metadata-only bridge below. Both paths support videos up
to 512 MiB and feature JSON up to 25 MB. Arbitrary remote URLs and generic indexed
streams that have not been selected into a local project remain unsupported.

## Selected local-service video identity

The service path does not fetch the whole video into the browser or create a
video Blob. `POST /api/local/video-fingerprint` accepts only `projectId`,
`recordingId`, and `videoStreamId`. Its JSON body is capped at 4096 bytes. Existing
loopback Host, same-origin and JSON checks apply. The endpoint accepts only the
video already selected into that exact project/recording and its existing opaque
file grant. It accepts no paths/URLs, creates no grants and changes no settings.
The browser verifies the current same-origin `/api/local/media/<token>` source.

The server requires a regular, nonempty video no larger than 512 MiB. It reads
fixed chunks of at most 1 MiB up to the initial size, plus one EOF-check byte,
and returns the identical `sha256-ordered-chunks/1` fingerprint. File descriptor,
path identity, size/timestamps and project binding are checked before/after the
read. Changed or truncated sources are rejected. The response is
`neuropixels-video-fingerprint/1` with echoed project/recording/video IDs,
`videoName`, `videoSize`, and `fingerprint`; it contains no path or media bytes.
Errors are sanitized. Only one hash can run per service instance; concurrent
requests receive 409 immediately. Identity is freshly computed for each operation,
not reused from a size/timestamp-only fingerprint cache.

The client validates the response and guards source object, descriptor/token,
URL and project identity, including same-name/same-size replacement. Cancel and
closing the editor abort the fetch; source/project changes also discard stale
results, but may not immediately abort it. A server read already underway may
finish its single bounded scan
before noticing the disconnected client; cancellation does not promise to stop
server disk I/O immediately. This is content identity at request time, not an
immutable-file guarantee or evidence of synchronization/behavior validity.

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
groups. Version `video-feature-kmeans/2` uses stable population moments and a
zero-only initialization distance stop, preserving small valid raw-unit differences.
Saved `/1` runs retain their original method and results; they are not silently
recomputed. Optional per-feature z-scores use the population mean/standard deviation
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
The timed-keypoint example is not a pretrained model or real-video pose estimate. The optional local frame-model adapter below adds source-integrated callbacks and frame delivery. Plugin loading, generic DLC/SLEAP file readers and a verified real pose/model dataset remain future extensions.

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
numeric agreement are software evidence only.

Additional checks on 2026-11-12 used an existing real-video motion/appearance
output from the public DeepLabCut open-field example. Of its 389 rows and 33
features, the all-zero initial row and final row without a subsequent endpoint
were omitted. The producer explicitly assigned coarse 5 Hz forward review bins;
these are not measured decoded-frame boundaries or neural acquisition coverage.
The unchanged standalone HTML, opened directly with `file://`, exported a model
request and accepted the real values through its native file input. It produced
8 groups / 32 unreviewed clips from 387 rows. The complete source, result and
review state survived project export, full page reload and package import. No
application HTTP requests were made. Generated export Blobs were captured by the
test harness; the operating-system download manager was not part of this check.
A deliberately unmatched synthetic neural scaffold was used only to open the
workspace. No paired neural analysis or model/behavior accuracy was inferred.

The optional indexed service also retained this complete feature payload through
HTTP draft save/read, service restart, linked-project save and reopening in a
fresh catalog. Its actual browser UI restored the source/results, saved a QA-only
group name, saved the project file and restored the exact document after reload.
All clips remained unreviewed and the video/neural clock remained unverified.
A wrong-recording write was rejected without replacing the existing document.
That earlier check covered result persistence only. The 4.15 selected-project
bridge additionally exported a model request and imported the same real feature
values without a video Blob, generating 8 groups / 32 new unreviewed clips while
preserving prior runs. Six measured fingerprint responses were 401 bytes each.
Malformed responses, cancel, same-name source replacement, project change and
dialog dismissal left annotations unchanged. Saving/reloading the project
restored the complete document. No external application requests were made.
Standalone binary packages and service linked-file JSON projects remain distinct
formats; the validation explicitly adapted recording context and source digest,
not an automatic package converter.

Focused bridge checks: `node tests/validate-streamed-video-features.cjs` covers
23 frontend binding, response and stale/abort cases. `python -m unittest discover
-s tests/python -p test_video_fingerprint.py -v` covers 10 server cases, including
independent browser-hash parity, multichunk/empty files, regular-file and size
checks, growth/truncation/replacement, binding, no-cache, busy/lock recovery,
origin/body limits and no persistent state writes. Empty files have a defined
hash for algorithm parity but are not accepted as videos.

## Optional local frame-model adapter

The standalone application now embeds `scripts/video-model-adapter.js`. The
existing JSON exchange remains data-only. The new optional adapter executes only
trusted model functions deliberately integrated into the application source; it
has no script-file loader, dynamic import, URL inference endpoint, package install,
or pretrained model. This is not a sandbox: integrated model code has ordinary
page privileges and must be reviewed before building/distributing that HTML.

**Run pixel adapter example (first 30 s)** in the same Model features / keypoints
section reads actual video pixels and returns RGB-channel means. This transparent
engineering example has no weights and does not identify behaviors. It samples
explicit half-second support bins (the final bin is clipped to video duration),
seeks their centers, resizes to 160 x 120, then uses the existing grouping controls.
Its output is unreviewed and can be named, edited, undone and saved normally. Short
or constant videos may have insufficient eligible data for grouping. The button
requires a local video File or browser-project Blob; service URL video remains on
the prior data-only exchange path. No second operating mode is introduced.

A developer can call the existing annotation controller's method from trusted
application integration code, then build the single HTML in the normal way:

```javascript
await annotationController.runVideoModel({
  model: { name: "my-local-model", version: "1", source: "model provenance" },
  kind: "features", names: ["feature_a", "feature_b"],
  units: ["unitless", "unitless"], subject: "animal-1", track: "model-features",
  async predict({ rgba, width, height, sample }, { input, signal }) {
    // rgba is Uint8ClampedArray in RGBA order, with width * height * 4 entries.
    // input.annotations includes schemes, review states and prior feature runs.
    // input.timeMapping is the unchanged video/neural mapping snapshot.
    // Return one finite number or null for each declared feature name.
    return myModel(rgba, width, height, input.annotations, signal);
  }
}, explicitlyTimedSamples, { width: 160, height: 120 });
```

`kind: "keypoints2d"` instead declares `coordinateSpace`, named keypoints and
optional `poseNormalization`, returning ordered `[x,y,confidence]` triples or null.
Pixel coordinates describe the resized input image, whose source and target sizes
are saved; the adapter does not silently map coordinates to the original image.
Every requested sample supplies `id`, `start`, `end`, and `time`; optional `frame`
is only producer-supplied provenance. A callback cannot change these identities.
There is no FPS-derived interval construction in the general API.

`NeuropixelsVideoModels.run({request, file, model, samples, width, height, signal})`
also returns a validated feature asset without committing it. The application
controller uses this same API and the established feature Worker, review, undo,
and project persistence paths. The general API accepts one immutable local Blob,
checks its ordered-chunk content fingerprint before decoding, and verifies decoded
duration. It never accepts an arbitrary media URL or filesystem path. Source,
Recording, annotation document and mapping changes discard pending controller
results. Cancel/close aborts waiting and releases the independent decoder; late
model promises are ignored. Trusted synchronous or noncooperative model code cannot
be forcibly interrupted by this API and must implement bounded work/cooperative
cancellation. No untrusted-code isolation or remote privacy guarantee is implied.

Decoding uses a separate video/canvas, never the main playback element. RGBA is
read one sample at a time. Limits are 512 MiB per source, 20,000 samples, 640 x 640
pixels per frame by area, and 60 million output pixels per run. Feature dimensions,
cells and final JSON still obey the existing limits. Metadata plus annotation and
mapping input is a detached deeply frozen snapshot, not mutable application state.
The exact input snapshot and its `sha256-json/1` digest are retained under
`featureAsset.adapter`, alongside dimensions and `local-video-model-adapter/1`.
Repeated runs can increase document size because input provenance includes prior
runs; the existing 25 MB feature and 50 MB combined-document limits still apply.
Original source videos and neural files are never modified.

A seek time is a requested browser sampling time, not a measured decoded-frame PTS
or acquisition clock. Browser frame quantization, resizing, and camera position
can affect model features; no neural coverage or biological truth follows from a
successful decode. Unannotated intervals are not negative labels. Missing outputs
remain explicit nulls/gaps, and candidates are never automatically reviewed.

Portable check: `node tests/validate-video-model-adapter.cjs`. The optional
`node tests/serve-video-model-check.cjs <local-video>` builds an isolated in-memory
standalone page without replacing the distributed HTML. Open its printed localhost
URL to exercise actual decoding, annotation snapshot access, main-product example
button, cancellation, source replacement and a full project export/reload/import.
Its QA neural scaffold and label are explicitly synthetic and unmatched to video.
It does not validate a trained model, DLC/SLEAP integration or behavioral accuracy.

### Local frame-adapter engineering verification (2026-11-15)

The working-tree standalone build from the 4.15.2 base passed 22 focused adapter
checks, the existing video-feature/annotation/event-response and portable UI suites,
code-only validation and three-language Help consistency. Actual Chrome decoded the
30,384,542-byte `side-first120s.mp4` into 16 callback samples, supplied its annotation
snapshot, and preserved the shared video position. The main pixel-example button
produced 60 samples. Cancellation and same-name source replacement left annotations
unchanged. Full project export, page reload and package import restored exact feature,
annotation, input-snapshot and digest content; all model candidates remained unreviewed.
A 480 x 900 viewport had no document or review-dialog horizontal overflow. Evidence
is in ignored `runtime/video-model-validation/browser-report.json`; the harness above
is reproducible with an explicitly supplied local video. This validates engineering,
not behavioral labels or trained-model accuracy; the neural scaffold was synthetic.

The Python suite used the installed Anaconda interpreter and a simple runtime temp
path: 55 of 57 passed. Two Windows launcher checks remained blocked by the executor's
CIM access restriction. The original default temp path also contains URI-special
characters that prevented 22 SQLite tests from opening; changing only the test
process temp directory removed those errors. No service or security setting was
changed. The standalone adapter does not depend on the optional Python launcher.
