# Changelog

## 4.14.0-beta.1

- Add optional data-only model input export and timestamped feature/keypoint import with local content-checked video identity, explicit missingness and named-anchor pose transforms.
- Group eligible samples in a bounded browser Worker without bridging missing intervals; preserve source features, parameters and unreviewed candidates through complete project reload. No pretrained model, external-code execution or scientific behavior claim is included.

## 4.13.1-beta.1

- Keep NWB invalid_times out of experimental event choices, preserve bounded raw validity metadata and warn that scope-specific masks have not been applied. Older cached assets containing these mistaken events require explicit reimport.
- Retain the same validity warning and provenance for annotation-derived responses and saved analyses; do not infer full acquisition coverage or globally mask different probe/stimulus scopes.

## 4.13.0-beta.1

- Add response-group heatmaps, equal-Unit mean curves and exact member selection without changing shared time or anatomical order.
- Add optional bounded split-half sensitivity diagnostics with persisted partitions, seeds and ARI summaries, explicitly separate from scientific validation.
- Restore subject/track-filtered annotation analyses with video and measured clock after a full page reload; reject malformed diagnostic summaries and keep member selections synchronized.

## 4.12.0-beta.1

- Save the latest event-response analysis per Recording in browser project packages and restore exact counts/rates only after source-content, event and mapping checks. Existing project packages remain compatible.
- Preserve source-reported NWB Unit observation intervals and intersect selected Units without filling gaps or inventing missing acquisition coverage.
- Reject corrupted or stale saved analyses without deleting the project; keep save transactions separate from annotation writes.

## 4.11.0-beta.1

- Add browser-native Event responses for experimental events and reviewed behavior annotations, with explicit acquisition coverage, exact half-open spike counts, optional reproducible response grouping, cancellation and source return.
- Preserve Allen NWB experimental event provenance in project assets; trial starts are not mistaken for image-change times.
- Export analysis/provenance separately. This preview does not yet restore analysis results from project packages or establish scientific cluster validity.

All notable Explorer changes are recorded here. Release source is preserved by
Git tags rather than duplicated version directories on `main`.

## [4.10.0-beta.1] - 2026-10-25

- Redesign the working application as an observation bench: local typography,
  cool white / instrument navy surfaces, consistent controls and a shared-time accent.
- Move Probe into a full-height dock with independent interval and template panels;
  hide or restore the dock without losing selections. Default to video above while
  preserving side-by-side layout, resizing, Inspector and pinned comparisons.
- Keep annotation/alignment actions in the video header; put custom speed and
  jump-to-time in Playback details, automatically opened by Custom speed.
- Adapt empty illustrations, project dialogs, three themes and narrow windows;
  preserve single-HTML delivery, local projects, scientific renderers and formats.

## [4.9.0-beta.1] - 2026-10-25

- Group New project, Open project and Add / Change video in the top toolbar;
  use consistent video control sizes and neutral colors, with New project accented.
- Explain the empty Probe, neural activity and video workspace with inline SVG
  illustrations and enlarge the video region before and after loading data.
- Add a Video above layout alongside Side by side. Preserve Unit, interval,
  video position and both Probe panels when switching; resize with pointer or
  keyboard while video tools scroll independently of the image.

## [4.8.0-beta.1] - 2026-10-23

- Build one standalone HTML with embedded scripts, styles and HDF5/WASM. Read
  Kilosort folders and Allen ecephys NWB physical probes entirely in the browser.
- Cache data, optional video, alignment and isolated annotation drafts in
  IndexedDB. Export/import complete `.neuroproject` packages for portable recovery;
  retain the service's reference-based JSON format.
- Calculate exact interval spike counts in the browser Worker; show both Probe
  distributions, with explicit missing-template results for Allen.
- Check an imported Allen clock against the neural session and video SHA-256.

## [4.7.0-beta.1] - 2026-10-22

- Open directly into the neural, Probe, video and annotation workspace. Empty
  regions explain their tools and inputs; create or open a project in place.
- Move recent projects into Open / add data. Returning to the workspace retains
  the current recording, and loading data replaces the empty regions.

## [4.6.0-beta.1] - 2026-10-22

- Create named neural-only or neural + video projects from local Kilosort results
  or Allen ecephys NWB. Show supported inputs and feature-specific check/cross
  results, including missing files, unavailable templates and optional video alignment.
- Save and reopen `.neuroproject.json` files with source references, catalog
  metadata, video mappings and complete annotations. Project drafts are isolated
  per project; opening a saved file can restore a fresh local catalog.
- Match adjacent video frame-clock exports, reuse existing Kilosort catalog
  anatomy, and retain annotation-only JSON export as a separate action.

## [4.5.0-beta.1] - 2026-10-21

- Keep interval activity and Unit template distribution independently open in the
  linked neural/video/Probe workspace. Dense Kilosort templates expose per-channel
  stored peak-to-peak amplitude, measured positions, channel IDs and selectable
  common-scale waveforms with dominant-template provenance and explicit missing states.
- Preserve interval selection and statistics across Unit/channel changes. Interval
  chart points select Units, while template channels remain local to the template view.
- Restore real recordings with integer-valued floating-point shank IDs; reject invalid
  IDs without modifying source files. Find Unit now correctly matches Unit 0.
- Templates remain whole-recording stored values, not interval waveforms or calibrated
  microvolts. Browser workflow checks use real spikes/templates and synthetic video;
  scientific interpretation and user layout acceptance remain separate.

## [4.4.0-beta.1] - 2026-09-26

- Select saved behavior intervals directly from the neural plot's aligned strip,
  preserving Unit focus and annotation editor state, or drag any neural interval.
- Probe interval statistics show measured positions with rate-sized points, a
  vertical depth/rate stem plot with horizontal toggle, and all Unit Hz/counts.
  Orientation reuses the exact interval result; missing positions stay in the list.

## [4.3.0-beta.1] - 2026-09-26

- Pin up to six Units from different groups in the current Recording for shared-time
  spike comparison above the activity overview. Pins survive group collapse and
  video operations; individual removal, clear-all and Recording isolation are explicit.
- Reuse exact spike data and inspector navigation in compact raster rows. The first
  pin opens a 10-second window when needed; dense views indicate when zoom is needed.

## [4.2.1-beta.1] - 2026-09-26

- Restore individual Unit expansion and detail access after opening anatomical
  groups by preserving the leaf Unit's group ancestry.
- Limit focus dismissal to other rows or blank space inside the activity canvas.
  Video, annotation and inspector controls preserve the expanded Unit.

## [4.2.0-beta.1] - 2026-09-26

- Rebuild manual annotation around video above an expandable timeline: independent
  hover frame previews, pointer-centered wheel zoom, panning, interval brushing,
  playback review and optional seconds/frame boundary editing.
- Separate reusable label creation/colors from interval labeling. Show the active
  label in the video corner with the same color as timeline clips and neural masks.
  The optional vocabulary field preserves version-1 project compatibility.
- Add horizontal playback-speed scrubbing (Shift for fine adjustment) and direct
  numeric entry. Clicking outside an expanded Unit/group restores the overview
  without changing shared time or annotation selection.
- Preserve source data, time mapping, candidate provenance and advanced review.
  Frame entry uses nominal FPS; variable-frame-rate sources should use seconds.

## [4.1.2-beta.1] - 2026-09-26

- Enlarge video and annotate inside the existing activity/video split instead of
  covering the workspace. Keep the recording header, neural activity, anatomical
  gutter, Probe and shared cursor visible throughout.
- Keep separate normal/focused split proportions, reserve readable neural space
  on smaller screens, and accommodate the expanded Probe distribution. Retain
  pointer and keyboard resizing; restoring the layout preserves time and Unit.
- Keep annotation tools beside the uncropped video, show the synchronization
  status, and use an explicit Done annotating action. Respect reduced motion.
- This fixes context loss; it adds no automated discovery or scientific scoring.

## [4.1.1-beta.1] - 2026-09-24

- Add a desktop shortcut installer and local project profile so opening Explorer
  starts the selected collection without depending on a running development task.
- Start the on-demand Windows process independently of the launcher's console/job
  and open the selected database only after version, catalog and health checks.
- Serialize repeated launches, preserve other applications on occupied ports,
  reject missing configured catalogs, and retain useful failure messages/logs.
- Validate cold/concurrent/repeated starts, parent-process exit, missing catalogs,
  wrong-project port conflicts and startup failures with temporary fixture data.
  The existing large-video annotation, custom speeds and label mapping are retained.

## [4.1.0-beta.1] - 2026-09-23

- Default new language preferences to English; retain explicitly saved choices.
- Open a reversible, full-workspace annotation mode with an uncropped video and
  a compact control rail. Add video-time entry and Space / I / O shortcuts.
- Default playback to 0.25×, add 0.01× / 0.05× / 0.1× presets and custom
  0.01–4× speed. Very slow playback advances frames against elapsed time.
- Persist distinct label colors in annotation projects and project the active
  subject/track onto neural activity using the existing video clock mapping.
- Expand Probe interval distribution on demand. Exact counts use a reusable
  per-Unit time index and divide by covered recording seconds, including partial
  coverage. This spatial activity view does not imply multichannel waveforms.
- Validate the running application with real Allen video/spikes, portable tests,
  and 1280×800 / 1440×900 annotation layouts. See the [review note](docs/mentor-workspace-4.1.md).

## [4.0.0-beta.3] - 2026-09-11

- Made opening data a persistent top-left action and added a start screen with
  recent projects. The local picker opens Kilosort folders and Allen NWB files;
  physical probes are selectable, with source identities and data preserved.
- Added separately located video attachments, nearby-video suggestions and
  persistent source links. Manual alignment and verified frame-clock import
  explicitly distinguish linked video from validated synchronization.
- Embedded annotation in the video time strip. Drag to select a behavior or mark
  its start/end during playback, then name it. Batch grouping and label schemes
  open separately. The neural canvas and video keep their height when editing.
- Set the initial neural/video allocation to 65/35, retained resizing, and added
  temporary video enlargement. Restored a visible 2D Probe beside activity.
- Fixed Allen catalog/Probe joins and source-coordinate handling, including zero
  versus unknown depth. Added template-coordinate fallback for Kilosort. The
  server display-cache preprocessing version is 3.1.0; database schema remains 3.
- Added a restartable Windows launcher, local file-grant boundaries, direct-import
  contract tests and browser acceptance with real Allen NWB/video. Head-fixed
  validation does not establish behavior-classifier accuracy or final human UX
  acceptance.

## [4.0.0-beta.2] - 2026-09-09

- Added a bounded, resumable Allen VBN download manifest and source integrity
  receipts, plus a matched-video/NWB physical-probe adapter that preserves
  original unit identities and source data.
- Added measured piecewise frame clocks for dropped camera frames. Playback,
  interval selection and CSV export share the mapping; unmapped boundary
  frames are explicit and manual offsets remove verified status.
- Added reproducible official V1 PSTH and published ripple-table filtering
  examples, with documented source-format problems and limits on inference.
- Prepared and verified eight matched Allen sessions (60.19 GB externally),
  including full side-camera clocks and browser recording switches.
- Verified the real Allen pilot in Chrome, including neural activity, Unit
  expansion, video seek, manual annotation, anonymous candidate grouping,
  exact CSV time conversion and draft persistence. No new behavior-accuracy
  or whole-paper replication claim is made. Database schema remains 3.

## [4.0.0-beta.1] - 2026-09-09

- Added a behavior annotation editor and tracks tied to the existing shared
  neural/video cursor, with interval editing, split/merge, loop review, undo/redo,
  subjects/tracks, and explicit human review status.
- Added independent laboratory label schemes, batch group naming/regrouping,
  multi-clip video previews, local draft persistence and portable JSON/CSV.
- Preserved original candidate runs independently from human edits; validated
  recording/video identity, interval bounds and timebases on import.
- Added optional local motion grouping and a separate Keypoint-MoSeq CSV adapter.
  Compared optional scikit-learn KMeans/Ward methods on a public mouse video;
  these trials do not establish semantic behavior accuracy.
- Added MIT licensing, third-party notices, a central VERSION file and a version
  synchronization script for UI/cache/package labels. This user-requested major
  product milestone is a prerelease; existing KiloSort and catalog contracts are
  retained. Earlier v3.x tags remain unchanged.
- Corrected the experiment header to show unverified video synchronization when
  only a manual/default mapping is available.

## Earlier synchronized-video work

The following work was present before the annotation beta; its prior history
is preserved in the v3.x Git tags.


- Added a compact behavior-video track directly above the aligned Unit signals,
  with play/pause, seek, frame-step, speed, follow, collapse, and manual-offset
  controls on one shared neural-time playhead.
- Added a deterministic synthetic mouse-arena video with exact frame numbers
  and five-second sync pulses so video alignment can be accepted without access
  to protected laboratory video.
- Added two-way navigation: video playback updates every open Unit playhead,
  while a Cursor-mode click in a neural plot seeks the video to that time.
- Added invertible `TimeMapping` support and visible verified/unverified mapping
  provenance. Indexed video assets now support contained HTTP byte-range reads.
- Added a versioned Raw Voltage provider/reader extension contract and an honest
  no-provider UI state; continuous AP/LFP reading remains unimplemented.

## [3.3.0] - 2026-08-15

- Moved the reusable indexed data service, SQLite migrations, and synthetic
  contract tests into the Explorer product repository.
- Added one portable CLI for schema initialization, validation, and local
  Explorer/API serving with explicit runtime database and data-root paths.
- Kept SQLite as a metadata catalog with project-relative asset references;
  large neural arrays, future raw voltage, and video remain external payloads.
- Added Git ignore rules and an automated repository-boundary test for private
  data, generated databases and sidecars, analysis outputs, local config, and
  known machine-specific absolute paths.
- Added exact per-Recording missing-file details and `Add files` / `Add folder`
  actions to Data Status.
- Added automatic Recording and asset-role detection with rejection of wrong
  experiments, duplicate candidates, conflicting assets, invalid NPY payloads,
  and incompatible spike/channel dimensions.
- Added transactional incremental-ingest audit tables and atomic managed-file
  registration. Failed batches roll back both SQLite changes and file moves;
  existing assets are never silently overwritten.
- Kept large NPY, raw-voltage, and video payloads outside SQLite while storing
  their relative paths, sizes, SHA-256 checksums, type, status, and provenance.
- Invalidated and recomputed only changed Recordings. Open Units, focused Unit,
  time windows, navigation history, panel sizes, and the current layout remain
  stable after a successful supplement.
- Added portable rollback, duplicate, conflict, wrong-Recording, shape, missing
  template, and live browser supplement acceptance tests.

## [3.2.0] - 2026-08-15

- Replaced Primary/Comparison/Review-mode state with `openUnits` and one
  `focusedUnit`.
- Made plain click open one Unit, Ctrl-click add a Unit, and right-click expose
  shared Unit actions in the list and Probe views.
- Removed automatic Unit selection when a Recording is opened.
- Linked signal focus back to the corresponding Recording, Unit-list row,
  Probe marker, and Inspector details.
- Extended Zoom and Pan interactions from the time-axis strip to the complete
  signal canvas.
- Made Zoom-wheel motion pointer-anchored and Pan-wheel motion move through
  time, including dominant-axis handling for touchpads.
- Preserved normal page scrolling outside signal canvases and in Cursor mode.
- Synchronized linked-view history so Back also restores Overview and plot
  navigation after focus moves to another Unit.
- Added keyboard-accessible splitters for resizing the Units, signal, and Probe
  Inspector columns, with double-click reset and device-local persistence.
- Added collapsible side panels and compact-screen defaults that preserve the
  central signal workspace.
- Replaced the row of READY badges with one expandable data-status entry that
  separates available, missing, invalid, optional, and future/video inputs.
- Added persisted Dark, Light, High Contrast, and System themes shared by the
  interface, signal plots, Overview selections, Probe rendering, and Unit
  palettes.
- Added one persisted translation system for English, Simplified Chinese, and
  Spanish, including a professional neuroscience terminology glossary while
  preserving KiloSort fields, file names, and brain-region abbreviations.
- Added low-emphasis question-mark explanations with viewport-aware placement,
  pointer hover, and keyboard-focus support. Explanations cover what a feature
  is, how to read it, and when to use it.
- Added three Markdown user guides and a language-aware Help drawer. Release
  Help is precompiled into a checked-in local asset for direct `file://` use
  without a CDN or online Markdown dependency.

## [3.1.0] - 2026-08-15

- Added explicit Inspect and Compare review modes with linked multi-Unit plots.
- Added electrode-level Probe-to-region bands with documented interpretation
  boundaries.
- Kept folder mode standalone and local-first, with database mode optional.
- Promoted the current application to the repository root and moved historical
  snapshots out of the current `main` tree.
- Added a portable `--code-only` validation mode.

## [3.0.0] - 2026-08-14

- Established the initial Neuropixels Explorer review surface.
- Added local KiloSort parsing, Unit review plots, physical Probe rendering,
  and the versioned browser implementation history.
