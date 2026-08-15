# Changelog

All notable Explorer changes are recorded here. Release source is preserved by
Git tags rather than duplicated version directories on `main`.

## [Unreleased]

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
