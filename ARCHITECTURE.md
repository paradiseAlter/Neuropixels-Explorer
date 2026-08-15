# Neuropixels Explorer architecture

## Runtime model

The supported default is a local browser workflow. `index.html` loads plain
JavaScript and CSS, and the user explicitly selects a folder through the
browser file API. KiloSort arrays are parsed locally and are not uploaded.

Large arrays are loaded lazily for the active Recording. Unit analysis runs in
a Web Worker when available and falls back to the main thread with an explicit
status indication.

An optional database client is present for a separately operated local service.
The service, its SQLite database, and research data are outside this repository
and are not required by the standalone folder workflow.

## Module map

- `index.html` defines the current v3.2.0 review interface.
- `scripts/app.js` owns application state, folder selection, review modes, and
  DOM coordination.
- `scripts/kilosort-core.js` indexes KiloSort files, parses NPY arrays, and
  computes Unit-level review data.
- `scripts/region-core.js` validates and joins Unit- and depth-level
  brain-region metadata without inferring missing anatomy.
- `scripts/data-status.js` classifies core, optional, invalid, and future data
  capabilities for the compact status surface.
- `scripts/theme.js` owns the persisted theme preference and the shared UI,
  signal-Canvas, Probe, and Unit color palettes.
- `scripts/i18n.js` owns the persisted language preference, the English,
  Simplified Chinese, and Spanish dictionaries, and the professional
  terminology glossary. File names, brain-region abbreviations, and KiloSort
  field names are deliberately outside translation.
- `docs/USER_GUIDE.*.md` are the editable Help sources.
  `scripts/build-help-content.cjs` precompiles them into the checked-in
  `scripts/help-content.js` asset, keeping the Help drawer compatible with
  direct `file://` use and independent of online Markdown services.
- `scripts/plots.js` renders signals and linked time-window interactions.
- `scripts/probe-view.js` renders physical Probe groups, Unit locations, and
  optional atlas-colored depth segments.
- `scripts/database-client.js` adapts the optional local-service API to the
  same Explorer state model.
- `styles/app.css` contains the current application layout and visual system.
- `tests/validate-real-data.cjs` provides portable code checks and an optional
  local real-data integration path.
- `tests/validate-i18n-help.cjs` validates dictionary coverage, glossary terms,
  local Help parity, contextual explanations, and keyboard-accessibility
  contracts.

## Data boundary

KiloSort is the source for spikes, amplitudes, templates, positions, and Probe
geometry. Brain-region labels are a separate optional input. Missing anatomy is
reported as unavailable rather than inferred. A depth-level mapping is not a
registered three-dimensional atlas trajectory.

## Versioning policy

`main` contains one current application tree. Releases are represented by Git
tags and release notes in `CHANGELOG.md`; full `vX.Y.Z/` snapshot directories
are not added to the current tree. Previous layouts remain recoverable from Git
history.
