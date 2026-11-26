# Mentor workspace review — 4.1.0-beta.1

> Historical checkpoint record. Statements and test results below apply to the named round/version, not a fresh validation of the current checkout. See the [current documentation index](../../../README.md) and [parity matrix](../../PARITY_MATRIX.md).

## Context continuity correction — 4.1.2-beta.1

The 2026-09-26 review rejected the loss of visible context in full-workspace video
mode. The user explicitly prioritized keeping context over the earlier 60%
image-area target. Enlargement and annotation now resize the existing split;
activity, Probe, recording identity and neural time remain visible. The image is
still uncropped. Normal/focused proportions are independent and reversible.
Small screens reserve space for anatomy and the activity texture; expanding
Probe rates reserves additional space. Annotation controls scroll independently.

Running Chrome checks used the real Allen recording at native 2560 x 1271,
1280 x 800 and 1440 x 900: no page-wide horizontal overflow at tested sizes,
both regions visible, Unit/time/frame preserved on restore, keyboard resizing,
frame-step interval editing and on-demand Probe distribution exercised.
The annotation, video synchronization, workspace layout and mentor contract
suites pass. No test label was saved to the user's annotation project.

The earlier full-workspace measurements below document the superseded layout.
Discovery/comparison/AI workflows remain proposals, not implemented features.

## Original checkpoint

This checkpoint updates the application itself. The previous Penpot/local layout
candidate remains separate. New installations start in English; an explicit
saved language choice is retained. No fixed behavior taxonomy is introduced.

`app.js` continues to own shared selection and time. The annotation controller
projects the active subject/track through `TimeMapping`; the activity canvas
draws its colored bands. Optional `labelColors` metadata travels with project
JSON, old projects acquire a palette during validation, and undo/redo restore
the same document. Annotation mode temporarily covers the workspace without
replacing its recording, Unit, range, cursor, or anatomy state. The complete
video frame uses `object-fit: contain`; the narrow control rail can scroll.

Probe distribution expands only on request. Its server endpoint counts spikes
in half-open `[start, end)` intervals and divides by seconds overlapping the
neural recording. A bounded, one-recording index sorts spike times per Unit once;
subsequent queries use binary searches, outside browser rendering. Coordinates
and anatomical colors retain their original meaning. Requests are debounced,
aborted on selection changes, and protected against stale results. Direct
browser-folder mode asks users to open a local project for this server-backed
calculation. Multichannel waveform distribution remains a separate interpretation
of the mentor's feedback and is not synthesized from peak-channel data.

Validation on 2026-09-23:

- 34 Python tests pass, including randomized count equivalence, half-open bounds,
  partial coverage, missing Units and index reuse. Repository checks run with a
  process-local Git safe-directory setting, without changing global Git config.
- JS contract suites pass for annotations, video sync, i18n/help, workspace
  resizing and the new mentor features. The older standalone browser script
  could not run because its Playwright package is absent; running-UI checks used
  the connected Chrome browser instead.
- Real Allen 1064644573 / probeC, video frame 658×492: effective image area is
  83.59% at both 1280×800 and 1440×900, excluding letterboxing. Extreme source
  or viewport aspect ratios can impose a geometric limit on uncropped image area.
- Custom 0.037× playback advanced 1.24166 video seconds over 33.689 wall seconds
  (0.03686× observed). Native/custom speed controls, exact time entry and single
  frame start/end marking were exercised.
- Unit 1066256265: 2,665 spikes in [160.329, 192.328), 31.999 covered seconds,
  83.28385 Hz. The second query reuses the index. Source files remain unchanged.
- UI checks covered two distinct labels, matching neural bands, persisted reload,
  deletion/undo/redo, return to signals, and expandable Probe rates. Temporary
  UI test labels were removed. No browser console errors were reported.
- Running-UI screenshot: `runtime/mentor-review/annotation.jpg` (local artifact,
  intentionally excluded from Git). The local server requires no login.

This is a usable prerelease for layout/function review, not scientific validation
of behavior recognition or acceptance of the final layout.
