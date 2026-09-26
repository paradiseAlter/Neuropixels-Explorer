# Behavior annotation beta

The beta adds a reviewable behavior layer to the existing shared video/neural
workspace. Labels, species, subjects and tracks are user-defined. It includes
manual editing, experimental browser grouping, and import of external model
results. It does not ship a universal behavior classifier or a standard ethogram.

## Use in Explorer

1. Open a recording, attach its video and choose **Annotate**. Video remains above
   the expandable timeline; neural activity and Probe stay beside it.
2. Hover the timeline for an independent frame preview. Wheel zooms around the
   pointer; Shift + wheel and the position slider pan. Drag an interval, select
   an existing label and **Save label**. **Manage labels** creates names/colors
   without creating intervals. Video overlays, timeline clips and neural masks
   share each label's persistent color. Review with **Play interval**, drag the
   selected boundaries, or set a boundary at the cursor. **Fine adjustment** uses
   seconds or zero-based frame numbers (exclusive end) at editable nominal FPS;
   use seconds for variable-frame-rate sources. This does not change TimeMapping.
   **Clip tools** contains new/split/remove. **Around playhead** and **Whole video**
   change the video timeline window; selecting a saved clip focuses neural time.
3. For automatic suggestions, open **Clips & grouping**, then **Experimental grouping** and choose the
   target group count and short-bout merge threshold. **Group this video** runs
   locally; **Cancel** stops decoding or the clustering worker.
4. Choose a review group. Watch typical, distant and temporally distributed
   samples. **Name group** maps it to a lab-defined label. Individual clip labels
   override that mapping. Only **Confirm selected** marks candidates reviewed.
5. To split a review group, select a subset and **Move selected to new group**.
   To combine groups, select clips across groups and use the same operation.
   Original algorithm group IDs remain in each segment and in the saved run.
6. Click a clip to focus the shared timeline and video. Change numeric boundaries
   or drag the selected timeline handles. **Split at cursor** divides it;
   **Merge adjacent clips** combines touching/overlapping intervals of the same
   subject and track. Gaps cannot be silently labeled by merging.
7. Create a second **Label scheme** for a different lab's taxonomy. Its group
   mappings, per-clip labels, curation groups and review states are independent.
   Physical video boundaries are shared; changing them invalidates review in
   all schemes. Undo/redo is available for editing and project import.
8. **Save project** exports a portable JSON containing every scheme, original
   run and edited interval. **Export CSV** exports the current scheme, video and
   mapped neural times, provenance and synchronization status. Browser IndexedDB
   saves drafts per recording/video. Storage failures are visible. Keep a JSON
   backup: browser drafts are specific to that browser/origin. Text beginning
   with a spreadsheet formula marker is apostrophe-prefixed in CSV; JSON keeps
   the exact label text.

For a long list, review 20 clips per page. The video time strip displays up to
1,000 visible intervals from the selected subject/track. A track selector appears
when multiple tracks exist; all intervals remain in batch review and exports.
Keyboard controls include Tab/Enter, Escape to close, and Ctrl/Cmd+S to save the
project while the editor has focus. Numeric boundaries provide a keyboard
alternative to dragging. The underlying source videos and neural arrays are
never modified.

## Time and provenance contract

Native projects use `neuropixels-annotations/1`; candidate files use
`neuropixels-behavior-candidates/1`. Intervals are half-open `[start, end)` in
**video-relative seconds**, including the final endpoint at video duration.
Optional `vocabulary` stores reusable label names (maximum 1,000 unique, non-empty
names of at most 200 characters); creating one does not create a segment.
`labelColors` includes unused/predefined names and persists across editing,
undo/redo and JSON round trips. Old version-1 projects still validate. Frame-based
editing converts to canonical video seconds; it does not certify measured frame
indices or synchronization. Hover decoding never mutates the shared playback cursor.

Different subjects/tracks may overlap. An uncovered range means unannotated,
not an inferred negative behavior.

Each segment keeps its immutable original run/group/boundaries. Each imported
run retains its original candidate rows, even after a user removes a clip.
Human curation is recorded separately. The browser and JSON/CSV exports use the same `TimeMapping`: affine mappings or
measured piecewise frame-clock anchors. Frame clocks preserve dropped-frame
corrections and never extrapolate beyond their measured range. A manual offset
or declared FPS does not establish alignment accuracy; changing the alignment
removes verified status. The original candidate boundaries remain available.

The candidate importer checks schema, video name, available byte size, duration,
interval ranges, unique run IDs and an explicit timebase before changing the
draft. A project for another recording/video is rejected. Native imports replace
the current draft as one undoable operation; candidate runs are appended.

Example candidate format:

```json
{
  "schema": "neuropixels-behavior-candidates/1",
  "timebase": "video_seconds",
  "video": {"name": "mouse.mp4", "size": 123456, "duration": 30.0},
  "run": {
    "id": "unique-model-run-id",
    "method": "external-model/version",
    "parameters": {"seed": 42},
    "source": {"sha256": "digest-of-input-results"}
  },
  "segments": [
    {"start": 0.0, "end": 1.2, "group_id": "7", "subject": "animal-1", "track": "behavior"}
  ]
}
```

Candidate `distance` is optional distance from an assigned cluster centroid,
not a calibrated behavior probability. JSON does not carry executable code.
Projects are limited to 100,000 active segments, 100,000 original candidate rows
and 100 label schemes; file import is limited to 50 MB.

## External Keypoint-MoSeq results

Run Keypoint-MoSeq separately under its own license. This repository provides
only a format converter; it neither installs nor executes that package.

For a dense single-video CSV with a `syllable` column, use either explicit
constant FPS matching the frame count and duration:

```powershell
python scripts/behavior_candidates.py keypoint-moseq --csv results.csv --video mouse.mp4 --duration 30 --fps 30 --output mouse-candidates.json
```

or use `--boundaries video_frame_boundaries.npy` instead of `--fps`. Boundaries
must be an N+1 vector, starting at video time 0 and ending at its duration.
JSON arrays are also supported. Acquisition/neural timestamps must first be
mapped into video-relative time. Sparse frame exports and concatenated videos
are rejected. Existing output files are never overwritten. Import the resulting
JSON through **Import project / candidates**.

## Experimental algorithm and observed limits

The browser baseline samples decoded video at 5 Hz (less for very long videos,
capped at 60,000 samples), reduces frames to 64×48 grayscale, and measures 4×4
image-cell motion and appearance. It standardizes features, runs seeded k-means,
filters isolated assignments, and merges brief bouts toward adjacent centroids.
Clustering runs in a disposable worker; source changes cancel obsolete work.
An unsupported video seek is rejected rather than repeatedly analyzing frame 0.
No Python, network service, model download or GPU is required for this path.

These features are **position-sensitive**. The baseline is suitable for testing
the suggestion/review workflow; it has not established reliable grooming,
sniffing, fine-action recognition or performance across species. Group count and
merge threshold are modeling choices, not biological ground truth. Short-bout
merging is a bounded heuristic, not a guaranteed minimum duration. Boundaries
are limited by the sampling grid and need human adjustment.

An engineering trial on the official DeepLabCut open-field video
`m3v1mp4.mp4` (77.66589 s, 2,216,380 bytes) used 389 samples. One captured run
produced 6 occupied browser groups / 22 bouts after consolidation. On the same
saved feature matrix, separately installed scikit-learn 1.5.2 produced 8 groups /
24 bouts with KMeans and 8 groups / 27 bouts with Ward clustering, each using a
majority-of-three temporal filter. Their postprocessing differs from the browser
baseline, so bout counts are descriptive, not a ranking of algorithm quality.

Inspection of the sample filmstrip showed strong dependence on arena position
and orientation. No expert behavioral labels were available, so behavior
accuracy, cluster purity and reduced annotation labor were **not established**.
The full motion extraction/grouping run took approximately 19.3 s on the tested
local setup; browser decoding and hardware can change this. Sampling/decoding
can select nearby frames, so the deterministic clustering seed alone does not
guarantee byte-identical results across browsers.

Video SHA-256:
`e2394b4221821cdb7206910a6efcec9db338cb497d1f880bd5a0ef2fd087ce59`.
Upstream video blob: `81673030f9be64c487d77bc312fd85ccd41a7e8d`.
See [third-party notices](../THIRD_PARTY_NOTICES.md) for sources and licenses.
Evaluation data and screenshots stay outside the tracked product tree.

## Reproduce checks

```powershell
node tests/validate-annotations.cjs
python -m unittest discover -s tests/python -v
```

`tests/validate-annotations-browser.cjs` uses optional Playwright against a local
Explorer with a representative recording. Set `ANNOTATION_TEST_URL`,
`ANNOTATION_TEST_VIDEO` and optionally `ANNOTATION_TEST_OUTPUT` to local values.
For direct-file mode, set `ANNOTATION_TEST_URL` to the local `index.html` file
URL and `ANNOTATION_TEST_FOLDER` to a representative recording folder.
It exercises manual labels, independent schemes, numeric/drag boundary edits,
undo, split, merge, clip looping, JSON/CSV export, native import, cancellation,
automatic grouping, decoded group previews, reload persistence, Chinese UI and
desktop/ultrawide screenshots. It also checks that main video controls remain
visible with the annotation editor open. Both indexed-service
and direct-file folder modes passed this browser workflow for the beta. The
Python suite passed 21 tests; the existing video, activity, layout, ingestion,
language and real-data checks also passed.

`tests/evaluate-behavior-discovery.cjs` also needs
`ANNOTATION_TEST_VIDEO_URL`, pointing to the same local video served by the test
server. It loads the entire test video into a Blob for reliable seeking, saves
`motion-features.json`, and renders a group sample filmstrip. This avoids assuming
that the test server's static-file endpoint supports HTTP byte-range seeking.

Optional scikit-learn comparison:

```powershell
python -m pip install ".[behavior]"
python scripts/behavior_candidates.py features --input motion-features.json --method kmeans --groups 8 --output kmeans-candidates.json
python scripts/behavior_candidates.py features --input motion-features.json --method ward --groups 8 --output ward-candidates.json
```

UI acceptance used a copy of an existing neural catalog and the separate public
video solely to test navigation. They are not a matched biological recording;
the mapping remained visibly unverified. No synchronization or scientific
conclusion was inferred from that pairing.
