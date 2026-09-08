# Changelog

All notable Explorer changes are recorded here. Release source is preserved by
Git tags rather than duplicated version directories on `main`.

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
