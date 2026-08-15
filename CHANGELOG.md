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
