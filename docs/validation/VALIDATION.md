# Validation guide

## Standalone project import in Chrome

Current standalone NWB interoperability was checked in Chrome against two non-Allen recordings. For 188_20211202, 161 Units, 675 stim onsets and 3,101 timestamp_lick events gave 221 matches and 454 nonmatches in [0.15, 0.75) s. Independent h5py spike counting agreed on all 434,700 cells (0–200 ms in 50 ms bins). For the 00845-expa derived NWB with no electrode table, all 22 Unit IDs and 10 epoch trials were retained and all 880 count cells agreed. Its NWB trial onset is the epoch boundary on the constructed clock.

For the current Allen 1064644573 figure workflow, matching displayed image changes to the first lick in [0.15, 0.75) s produced 92 matched and 113 unmatched active presentations. The same 205 events entered both the 98-Unit probeC run and the 102-Unit probeB + probeC run. Independent timestamp counting matched all 602,700 and 627,300 response bins. For probeC the [0, 100) ms mean rates were 8.7544 and 9.5954 Hz. Repeating the label match with passive replay included produced 92 matched and 318 unmatched presentations.

The event figure tests are `validate-event-figures-browser.cjs` (standalone controls, four distinct white PNGs, changing event/condition/Units and source return), `validate-paired-population-figures.cjs` (heatmap pixels, row identity and group means), and `validate-event-unit-figures.cjs` (exact single-trial spikes, off-bin windows and per-Unit paired rates). Run with Node from the tests directory or prefix each script with `tests/` from the repository root.

A historical, read-only acceptance used the original trial-table outcomes. For session 1064644573, the historical 98 VISp Units on probeC and the recorded 79 hit / 123 miss go trials produced 593,880 matching count cells against an independent NWB timestamp calculation (−0.5 to +1 s, 50 ms bins). In [0, 100) ms the hit and miss totals were 6,726 and 11,608 spikes. The corresponding equal-Unit mean rates were 8.68768 and 9.63000 Hz. There were 67 higher, 30 lower and 1 equal miss rate when each Unit was paired with itself.

Adding four probeB VISpm Units to the same run yielded 618,120 matching count cells. Both runs also matched the selected trials’ raw spikes and every Unit’s [0, 100) ms response and [−100, 0) ms baseline. In Chrome, the hit and miss source buttons returned to NWB trials 31 and 59 at neural times 136.875446 and 234.473694 s, and side-video times 134.545287 and 232.146599 s, respectively.

Run `node tests/validate-recording-tabs.cjs` for tab compression, wheel navigation and close buttons in both tab strips. The context-actions check also clicks the inactive space beside a disclosure. Run `node tests/validate-unit-marks-browser.cjs` for marks across views, same-numbered Units on separate probes and reopening a saved project.

In Allen session 1064644573, probeC, testing all 410 `image_change` onsets against `lick` in [0.15, 0.75) seconds yielded 92 matched and 318 unmatched trials. Testing `lick` itself in [−0.5, 1) seconds retained 65 of 2,321 trials when same-label repeats were excluded. An independent count from the recorded timestamps agreed with both UI results.

After building the HTML, run `node tests/validate-context-actions.cjs` for recording, signal and video menus, independent Probe disclosures and keyboard operation. Run `node tests/validate-text-size.cjs` for numeric text size input, 1 px keyboard steps, reopened preferences, and English and Chinese layouts from 390 to 1440 pixels. Set `ALLEN_DATA_ROOT` to include real video controls. Run `node tests/validate-regional-import-browser.cjs`
with Playwright and Chrome. The test copies the HTML to an otherwise empty directory under a new name and opens that copy offline at a local file URL. It rejects requests for network resources or sibling files,
drops actual directory entries, fills missing neural inputs at their named slots, checks early event and annotation imports, drops a frame clock directly under its video, checks that an incompatible drop rejects the whole batch, checks explicit video assignment, and reopens
the project. Set `ALLEN_DATA_ROOT` to the local Allen VBN dataset to include
the original NWB, side video and frame clock. Session 1064644573, probeC passed
with a 2,993,930,309-byte NWB and a 2,387,348,809-byte video. The event JSON was
rejected on alignment, the measured mapping matched the clock, annotation
import could be undone, and appending a recording preserved the original video
and mapping. `node tests/validate-import-storage.cjs` separately checks
concurrent appends, cancellation, duplicate keys and old single-record projects.
Run `node tests/validate-workspace-export.cjs` for tab-only storage, cancelled navigation, failed or cancelled export, a native file write and reopening a partial recording.

## Observation bench 4.10.0-beta.1 (2026-10-25)

Reviewed the redesigned standalone UI at its normal 1280 × 720 viewport on
localhost using cached Allen 1064644573 / probeC with side-first120s.mp4 and
Kilosort ks4_exp1. Allen's existing 10–12 s annotation restored its
12.334–14.334 s neural selection. Both Probe panels, Find Unit, Inspector return,
pinned spike comparison, dock hide/show and side/stacked changes remained usable.
Opened label management, batch review, alignment and offline Help without changing
annotations or alignment. Custom speed automatically opens Playback details;
frame stepping and keyboard separator adjustment were checked. Kilosort Unit 19
retained its 384-channel template; Allen retained an explicit missing-template
message. Light, dark and high-contrast themes were viewed.

A 390 × 844 viewport override (375 px document width after scrollbar) showed no
horizontal document overflow in empty and loaded Kilosort views. The override was
reset. Screenshots are ignored local artifacts in runtime/design-review-4.10/.
The final captured browser console had no errors. Direct file:// interaction was
not automated; the same single-file build was served through static localhost.
This is engineering/UI review; visual preference and research usability await the
user's trial. No new scientific accuracy or behavior-recognition claim is made.

Portable checks passed: workspace-layout, mentor-workspace, video-sync, frame-clock,
annotations, template-footprint, pinned-comparison, activity-overview,
interval-distribution, annotation-interactions, browser-project and i18n-help.

## Workspace presentation 4.9.0-beta.1 (2026-10-25)

Checked the built standalone HTML on the local static preview using the existing
cached Allen 1064644573 / probeC project and side-first120s.mp4. Both Probe panels
remain open across side-by-side / video-above changes; Unit 1066256267, the
12.334–14.334 s neural interval, and 10.000 s video position remain selected.
Next-frame advances to 10.017 s and previous-frame returns to 10.000 s. Annotation
mode opens and closes with the same segment and video. Keyboard separator changes
were checked in both orientations; the viewport was also checked at 1280 × 800
and the temporary override reset. The final video buttons, including Save label,
all measured 34 px high with the same neutral background.

Checked the empty Probe/video/neural SVG illustrations, the New project dialog,
dark and light themes, and cached Kilosort ks4_exp1 Unit 19's real 384-channel
template. Allen reports missing multichannel templates. Screenshots are local
ignored artifacts in runtime/layout-review-4.9/. This is UI/engineering QA;
user preference between the two layouts is still to be assessed.

Portable checks passed: workspace-layout, mentor-workspace, annotation-interactions,
interval-distribution, browser-project and i18n-help. Direct file:// interaction
was not automated; the distributed artifact remains a single HTML file.


## Standalone browser 4.8.0-beta.1 (2026-10-23)

Verified the single HTML via a static localhost page without Python API requests.
The browser directly read the local Allen session 1064644573 NWB, selected probeC
(349 Units, 20,302,917 spikes), attached side-first120s.mp4 and checked its frame
clock against session ID and media SHA-256. Cached reopen and full 274,088,499-byte
.neuroproject export/import restored video, mapping and the explicitly named
“缓存恢复测试” 10–12 s annotation. Independent Python comparison against original
NWB verified three complete Unit spike trains to 1.82e-12 s and 178 spikes for
Unit 1066256267 in the mapped half-open interval. This is data/engineering QA.

Kilosort ks4_exp1 opened with 103 Units / 311,792 spikes; Unit 19's real dense
384-channel template and selected-interval distribution were both displayed.
Allen's missing Kilosort templates remained explicit. Browser console error
checks were empty. Escape closed annotation mode while preserving selection.
Screenshots and the data comparison result are local, ignored runtime artifacts.

Portable checks passed: browser-project, template-footprint, interval-distribution,
activity-overview, annotations, annotation-interactions, video-sync, frame-clock,
workspace-layout, mentor-workspace and i18n-help. The browser automation policy
blocks file:// navigation, so a direct local-file launch was not automated.
There is no service worker or guarantee of offline hosted-URL navigation; the
saved single HTML is the offline entry. User layout acceptance remains separate.

[Documentation index](../../README.md)

Commands in this document run from the application repository root.

## Scope of evidence

Commands below are reproducible check entry points, not a claim that every check
has just run. Dated results belong to the [checkpoint archive](../archive/README.md).
UI acceptance, synchronization accuracy and behavior recognition validity are
separate claims. Optional browser tests require their documented local fixtures
and Playwright setup; do not run them against an unsaved user annotation project.

For implementation, run the application and checks proportionate to the change.
Visual changes require screenshots of the running UI at representative viewport
sizes and states, with safe representative real data when available. Exercise
the affected flow, keyboard/accessibility behavior, and return-state preservation;
a rendered page alone is not acceptance. Report confirmed behavior, known gaps,
hypotheses and specification deviations separately. Stop at any review gate that
actually applies to the currently authorized scope.

Ordinary check results belong in the task response. Persist evidence when it
supports an important change, release, contract decision or review milestone,
with version, inputs, checks, limitations and local artifact references. Prefer
updating the applicable record; do not append a checkpoint or changelog for each
conversation. Keep historical evidence intact without treating it as a current test.

## Focused checks

| Change | Check |
| --- | --- |
| Help sources or their paths | `node scripts/build-help-content.cjs --check` and `node tests/validate-i18n-help.cjs` |
| Activity display semantics | `node tests/validate-activity-overview.cjs` |
| Annotation and provenance | `node tests/validate-annotations.cjs` |
| Measured video frame clocks | `node tests/validate-frame-clock.cjs` |
| Mentor workspace controls and shared context | `node tests/validate-mentor-workspace.cjs` |
| Dense template identity, values and missing states | `node tests/validate-template-footprint.cjs`; `python -m unittest discover -s tests/python -p test_template_footprint.py` |
| Service / schema / interval statistics | `python -m unittest discover -s tests/python` |

Use the [parity matrix](../PARITY_MATRIX.md) to select additional interaction checks.
The guide Markdown files now live under `docs/guides/`; the Help builder and its
existing validation read that directory. Generated `scripts/help-content.js`
remains the application asset; changing only source paths must not change its content.

## Validation

Portable checks do not require private data:

```powershell
node tests\validate-real-data.cjs --code-only
node tests\validate-incremental-ingest.cjs
node tests\validate-workspace-layout.cjs
node tests\validate-video-sync.cjs
node tests\validate-i18n-help.cjs
node scripts\build-help-content.cjs --check
python -m unittest discover -s tests\python
```

The full integration check uses KiloSort and brain-region fixtures from the
parent research workspace. Those inputs remain local and are not versioned:

```powershell
node tests\validate-real-data.cjs
```

Set `NEUROPIXEL_PROJECT_ROOT` when those fixtures are outside the default parent
workspace. This value is runtime-only and must not be committed:

```powershell
$env:NEUROPIXEL_PROJECT_ROOT = "<research-workspace>"
node tests\validate-real-data.cjs
```

See [the Probe-region mapping contract](../contracts/PROBE_REGION_MAPPING.md) for the
optional CSV schema and its interpretation boundary. See
[the product repository boundary](../development/PRODUCT_REPOSITORY_BOUNDARY.md) for the
release, data, and generated-file rules.

## 4.6.0-beta.1 validation — 2026-10-22

- All 47 Python tests passed. Seven project-file tests cover fresh-catalog
  restoration, complete annotation documents, Allen identities/coordinates,
  missing optional links, project isolation, invalid-document rollback and
  adjacent clock/video/session matching.
- Annotation, frame-clock, video-sync, template, activity, workspace layout,
  incremental ingest, mentor workspace, code-only and three-language Help checks passed.
- Real UI flow used Kilosort `ks4_exp1` (103 Units, 311,792 spikes) and Allen
  session 1064644573 probeC (349 Units, 20,302,917 spikes), with the real
  `side-first120s.mp4` and its frame-clock JSON. Source arrays and videos were read
  in place; runtime catalogs and annotations were isolated from existing work.
- A 10–12 s annotation named “保存恢复测试” was saved in a project. A second
  service with an empty catalog and a different browser origin opened the file:
  video, verified mapping, label and interval were restored; the neural strip
  showed the corresponding 12.334–14.334 s interval. This label is a software
  roundtrip fixture, not a behavioral classification.
- Screenshots at 1280×720 were checked in Dark and Light themes. Escape, recent
  project restoration, project menu reopening and the feature-check button were
  exercised. The picker seam supplied known local paths during the UI test;
  import, matching, persistence, media streaming and annotation code were the
  production implementations. Native OS chooser interaction was not part of
  this browser check.

Local evidence: `runtime/project-review/01-new-project.png`,
`02-kilosort-checks.png`, `04-checks-light.png`, `05-restored-annotation.png`,
`06-final-checklist.png`, and `experiment.neuroproject.json`.

## 4.5.0-beta.1 validation — 2026-10-21

This run checked the linked workspace and the two independent Probe distributions.
The local preview used a SQLite backup of the research catalog and an isolated
activity cache; source Kilosort arrays were read in place. `ks4_exp1` has 103 Units
and 384 channels. The video in these interaction checks is explicitly synthetic.

- All 40 Python tests passed, including service response, interval counts, template
  selection/geometry, and integer-valued float shank IDs with invalid-ID rejection.
- Template, interval-distribution, pinned comparison, video-sync, measured frame-clock,
  mentor workspace, layout, i18n/Help and code-only checks passed.
- Independent NumPy comparisons matched every channel waveform, peak-to-peak value,
  acquisition channel ID and coordinate returned by HTTP for Units 0, 1 and 40.
- Chrome checked both panels open, interval/template independence, Unit changes,
  horizontal/vertical statistics, two pinned Units, inspector return, keyboard
  toggles, annotation context, and Recording reset, without page errors.
- Folder mode used the actual Worker on `ks4_exp1`: 384 channels, Unit 0, 3,525
  assigned spikes, and its peak channel amplitude matched the source arrays.
- Screenshots at 1920×1080 and 1280×900 were inspected. Both expanded sections scroll
  within the Probe sidebar; the neural canvas and video remain visible. The template
  channel selector also provides a keyboard route to densely spaced electrodes.

Local evidence (ignored runtime files): `runtime/probe-review/flow.cjs`,
`folder.cjs`, `dual-1920.png`, `template-1920.png`, `template-1280.png`,
`annotation-1280.png`, `folder-1920.png`. These checks do not establish scientific
validity, synchronization precision on real lab video, or user layout acceptance.
Dense stored templates are supported; sparse/non-identity layouts, unwhitening,
physical amplitude calibration and within-interval waveform extraction remain outside
this implementation. Allen records with no templates show an unavailable state.

## Event response 4.11.0-beta.1 (2026-11-12)

The [event-response contract](../contracts/EVENT_RESPONSES.md) records the 27 focused checks, independent real-data comparison and isolated headless-browser validation. All 153,750 count cells from three Allen Units and 205 active events matched, as did mean rates. Export, stale-input guards, reviewed annotations, source return, cancellation and narrow-screen layout passed. Coverage is a numerical test domain, not independently verified acquisition coverage. Existing portable regression checks also passed; see the contract for commands and remaining scientific/product gaps.

## Event response persistence 4.12.0-beta.1 (2026-11-12)

The contract adds 20 focused storage/coverage checks and actual standalone browser save/export/import/restore checks. Real-data counts survive the package roundtrip exactly. Same-size source changes, corrupt tensors and changed annotation mappings are rejected; an older package without analysis still opens. A tiny synthetic HDF5 fixture exercises actual bundled WASM reading of ragged Unit observation intervals. This does not supply missing acquisition metadata for the real Allen VBN sample. See the [contract](../contracts/EVENT_RESPONSES.md) for commands and remaining end-to-end/scientific gaps.

## Population views and video reload 4.13.0-beta.1 (2026-11-12)

Fourteen focused checks cover exact group means, Unit identity, deterministic split-half ARI, resource limits, filters and saved diagnostic validation. Thirty-two ARI cases agree with scikit-learn to 5.6e-17. Actual Chrome verifies member selection without moving shared time or reordering anatomy, source coverage, diagnostic restoration, and complete video/annotation/analysis package import after a full page reload. A 120-second Allen video, measured clock, five QA intervals and subject/track filters reproduce three selected events and exact counts/rates. These are explicit QA labels, not a repeated observed behavior example. The three-Unit real fixture has mean split-half ARI 0.25, not a biological robustness result. Independent review found and closed member-selection synchronization and malformed diagnostic-summary defects. See the [contract](../contracts/EVENT_RESPONSES.md) for commands and limits.

## Invalidity metadata correction 4.13.1-beta.1 (2026-11-12)

Thirteen focused checks verify reserved-table exclusion, bounded literal tags, malformed metadata, old-asset rejection and saved provenance. A 21 KB synthetic HDF5 fixture exercises actual WASM import of ragged tags from distinct probe/stimulus scopes. The standalone browser retains the warning in annotation analyses and after saving/reopening, with no 480 px overflow, and refuses legacy invalidity events before starting a worker. Existing real-data exact counts, complete video package reload and portable regressions remain passing. This correction does not apply scope-specific masks or resolve the real VBN asset's unknown acquisition coverage.

## Video feature exchange 4.14.0-beta.1

The [feature contract](../contracts/VIDEO_FEATURES.md) defines the focused test and browser checks. Forty-three portable cases cover identity, timing, missingness, confidence, named-anchor normalization, resource limits, grouping and source/curation separation. Independent NumPy transforms on 48 synthetic samples agree within 1.6e-15; the separated synthetic partition agrees with scikit-learn (ARI 1). Actual standalone Chrome checks model export/import, missing gaps, identity rejection, cancellation/source change/close, 480 px Chinese controls and full project reload with all candidates unreviewed. These are synthetic model-interface checks using a real video only for identity and persistence, not real behavior/model accuracy or acquisition-valid exposure.

## Selected service video bridge 4.15.0-beta.1

23 frontend and 10 server boundary checks cover source/project/token binding,
malformed replies, stale/abort behavior, browser/Python hash parity, bounded reads,
file mutation, regular-file/size rejection, no-cache, busy/lock cleanup and API
origin/body limits. Actual service Chrome exported a model request and imported
387 rows of existing real-video scalar features without a Blob, producing 8 groups
and 32 unreviewed clips. Prior runs stayed unchanged; complete save/reload matched
exactly. Fingerprint replies were 401 bytes each, with no video transfer by the
feature path and no external requests. Same-name source replacement, project
change, malformed response, cancel and close preserved annotations. These remain
coarse-grid engineering features with an unmatched synthetic neural scaffold,
not model/behavior accuracy, acquisition coverage or a scientific paired case.

## Coverage origin guard 4.15.1-beta.1

`node tests/validate-event-coverage-ui.cjs` checks actual UI listeners/actions for
source-derived versus explicit manual coverage, Unit changes, failed source lookup,
changed source metadata and failed/successful restoration. The browser regression
repeats these transitions in the real interface. The fixture deliberately gives
one selectable Unit no observation coverage; it must not inherit another Unit's
automatic intervals or silently produce zero counts. This is software validation,
not new coverage evidence for the real Allen recording.


## Continuous population dynamics checks

Run `node tests/validate-population-dynamics.cjs`,
`node tests/validate-population-dynamics-integration.cjs`,
`node tests/validate-population-dynamics-storage.cjs` and
`node tests/validate-population-dynamics-lifecycle.cjs` alongside the existing event,
video and project checks. The lifecycle suite models delayed DOM close events as
well as cancellation during metadata, hashing, computation, restore, packing and
annotation flushing. A real browser must additionally check these async flows and
complete project export/import/reload; VM tests do not establish browser acceptance.

The 2026-11-15 bounded real-data check uses Allen session 1064644573 / probeC
1064735073, [30,120) neural seconds, 100 ms bins and the existing 98-VISp-Unit
selection. Peak-channel metadata verifies the original Unit/probe/region mapping.
An independent NumPy implementation matches all counts, edges and split identities,
with maximum numerical difference 1.72e-11 across 86 comparisons; 87 training-varying
Units enter PCA and 11 constant Units are explicitly excluded. Local reproducible
fixtures, extraction provenance, full numerical outputs and reports are outside
Git under `runtime/population-dynamics-work/`. They are not embedded in the HTML.

This is bounded numerical implementation validation with unknown acquisition
coverage, not a paper reproduction or biological line-attractor result. Model
comparisons and source-return/browser checks have separate evidence and must not
be promoted to scientific validation. See [numerical and storage contract](../contracts/POPULATION_DYNAMICS.md).
