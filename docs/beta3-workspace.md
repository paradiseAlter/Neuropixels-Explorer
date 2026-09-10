# 4.0.0-beta.3 implementation map

The neural recording remains the main workspace. Video and its annotation tools
share one adjacent region; opening the annotation editor must not reduce the
height of the neural canvas or the video. Start with a 65/35 horizontal split,
allow resizing and temporary video enlargement. Keep a compact, interactive 2D
Probe visible beside activity. Three-dimensional anatomy is outside this round.

The top-left Open action and the start screen accept processed Kilosort folders
and Allen NWB files. The local service uses an explicit native picker, registers
selected sources in place, and adapts NWB spikes into a managed cache. Video can
be selected separately. Saved local projects retain these associations. The
source data, quality labels, and anatomical assignments must not be changed.
Attached video without an exposure clock remains visibly unverified.

Implementation boundaries:
- `local_projects.py`: selected-file grants, import jobs and persistent links.
- `service.py` / `paths.py`: local API and consistent catalog unit coordinates.
- `project-ui.js`: start screen, open menu and attach/reopen interactions.
- `app.js`: shared recording, range, cursor and Unit selection.
- `mini-probe.js`: main-workspace 2D coordinates and selection, no atlas inference.
- `annotation-ui.js` / `annotations.css`: compact video editing, explicit batch
  review and advanced settings, existing annotation schema and undo retained.

Acceptance: direct NWB and Kilosort opening; separately stored video; project
reopening; drag-range annotation and undo/export; verified frame-clock playback;
Allen VISp Unit 1066256490 at 3440 micrometres; missing coordinates stay unknown;
screenshots at desktop and laptop sizes; restartable double-click launcher.

## Validation recorded for this beta

- Thirty Python tests passed, including direct NWB import, original spike-time
  preservation, Kilosort registration outside the managed directory, zero versus
  unknown coordinates, persistent video links, changed-source rejection, clock
  identity/monotonicity, manual shifts and the local HTTP selection boundary.
- Existing JavaScript checks passed for annotations/provenance, piecewise frame
  clocks, video sync, activity aggregation, layout, translations and code-only
  repository validation.
- A fresh local catalog imported the original Allen session 1064644573 probeC:
  349 Units and 20,302,917 spikes. Browser checks covered the NWB probe chooser,
  nearby-video suggestions, separately selected real video, manual alignment,
  clock import, annotation, recent-project reopening and Kilosort geometry.
  Only the native OS picker was substituted by a test seam; the production
  importer and actual files were used. Manual OS-dialog usability remains part
  of the user's first review.
- All eight prepared Allen recordings passed switching and full-video seeks to
  1200 seconds, with matching shared neural times and no browser script errors.
- The annotation browser regression passed manual edits, alternate schemes,
  split/merge, loop, undo, JSON/CSV, cancellation, generation of 113 candidate
  intervals from a real 120-second clip, group naming, previews and draft reload.
  This tests candidate workflow, not behavior-label accuracy.
- At 1440 by 900, the neural canvas remained 652 pixels high and the video
  493.59 by 308.48 pixels when annotation opened. Screenshots were checked at
  1280 by 800, 1440 by 900 and 1920 by 1080, plus light/dark preview captures.
- The Windows launcher passed fresh empty-catalog startup, older-service restart
  and reuse of the running current version. Source datasets were not rewritten.

Acceptance artifacts are local runtime outputs, excluded from Git:
`runtime/beta3-qa/`, `runtime/beta3-import/screenshots/`. The UI preview labels are
explicit examples. Final layout preferences and ease of use await human review.
