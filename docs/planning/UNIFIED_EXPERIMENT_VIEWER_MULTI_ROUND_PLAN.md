# Unified Experiment Viewer multi-round dialogue plan

> Staged implementation plan with historical progress. Its round gates remain scoped to the corresponding work; later separately authorized work is recorded in the [checkpoint archive](../archive/README.md). For current product organization, see [PRD](../PRD.md), [IA](../IA.md), and [parity](../PARITY_MATRIX.md). This reorganization authorizes no new implementation round.

## Authority and current boundary

This plan is derived from the complete Unified Experiment Viewer prompt. The
root [AGENTS.md](../../AGENTS.md) contains collaboration and documentation rules.
Product, visual, interaction and scientific specifications live in [PRD](../PRD.md),
[IA](../IA.md), [Data Contract](../DATA_CONTRACT.md) and [Architecture](../ARCHITECTURE.md).
Their newer confirmed standards take precedence over superseded specifications
in this plan. The protocol and gates below apply only when the corresponding
round is explicitly in scope; they are not a blanket requirement for every task.

The first implementation dialogue is deliberately limited to:

> Round 0 -> Round 1 -> Round 2 -> Checkpoint A -> STOP

Rounds 3-6 are documented now but must not be implemented until the user has
reviewed and approved the live Checkpoint A result. Behavior classification,
behavior segmentation, saliency/candidate ranking, and similar intelligent
recommendations are not part of Rounds 0-6 unless the user later defines a
separate round for them.

The purpose of Checkpoint A is to answer one question before backend complexity
grows:

> Can the user naturally understand the whole experiment through information
> organization and interaction, without intelligent recommendations?

After the Checkpoint A review, the authorized correction boundary is:

> Round 2.5 -> Checkpoint B -> STOP

Round 2.5 may improve overview readability, semantic compression, progressive
local focus, temporal detail, and video layout inside the existing in-memory
overview architecture. It does not authorize Round 3 storage, behavior
classification, ranking, saliency, or persistent disk caching.

## Dialogue protocol

At the beginning of an implementation dialogue executing this plan:

1. Read the root `AGENTS.md`, all applicable nested agent instructions, this
   plan, and the current implementation map.
2. Inspect the branch and dirty worktree and preserve unrelated changes.
3. Verify current paths, components, data semantics, tests, and screenshot
   workflow from the repository rather than from stale notes.
4. State the exact round being executed and do not broaden it silently.

At a meaningful implementation checkpoint within this plan:

1. Run the real application and the relevant automated and smoke tests.
2. Use representative real data when it is available and safe.
3. Capture the required screenshots from the running UI, not a mockup.
4. Update the affected current specification and parity documents. Update this
   plan's progress and the applicable evidence record only when the round status
   or important evidence changes; do not create a record for every conversation.
5. Report confirmed behavior, test evidence, performance observations, known
   limitations, and any specification deviations with their concrete repository
   constraint.
6. Stop at the named gate and wait for user review.

Do not mark a visual round complete because the new layout merely renders.

## Progress

| Dialogue | Source scope | State | Exit gate |
| --- | --- | --- | --- |
| 1 | Rounds 0-2 | Complete; stopped at Checkpoint A | Checkpoint A mandatory stop |
| 2 | Round 2.5 Checkpoint A corrections | Complete; stopped at Checkpoint B | Checkpoint B mandatory stop |
| 3 | Round 3 | Complete; stopped for backend and mapping review | Round 3 review |
| 4 | Round 4 | Blocked on explicit Round 3 approval | Progressive-focus and synchronization review |
| 5 | Round 5 | Blocked on Round 4 | Diagnostic parity and accessibility review |
| 6 | Round 6 | Blocked on Round 5 | Final validation and performance acceptance |

## Dialogue 1 - Rounds 0-2 and Checkpoint A

This is the only implementation scope authorized before the first visual
review. Complete all three rounds in one continuous invocation unless a genuine
technical blocker prevents safe progress.

### Round 0 - Repository reconnaissance and implementation map

Perform the mandatory preflight in `AGENTS.md`. Create or update one concise
implementation note using repository documentation conventions. Prefer
`docs/archive/checkpoints/UNIFIED_EXPERIMENT_VIEWER_IMPLEMENTATION_MAP.md` unless an existing note
already serves that role.

Record:

- current experiment-view component structure;
- current Unit, spike, anatomy, and video data flow;
- current synchronization and selection ownership;
- components to retain, relocate, replace, or retire;
- target shared view-state ownership;
- target overview-data boundary;
- likely technical risks;
- planned files/modules;
- test and screenshot strategy.

Label verified facts and hypotheses separately. Do not create multiple
speculative design documents or SVG wireframes. Do not stop after the audit if
implementation can safely continue.

### Round 1 - Workspace architecture and shared state

Implement the new experiment-workspace structure with real application
components and data wiring, not a static mock screen.

Required outcomes:

- compact experiment orientation header;
- dominant activity-anatomy workspace;
- synchronized video region;
- compact no-video state;
- no permanent left Unit-list sidebar in the default layout;
- no permanent large Probe inspector in the default layout;
- no permanently visible waveform panel in the default layout;
- one shared selection/time state;
- compact `Find unit` entry point;
- placeholder or initial row-aligned anatomy gutter driven by real metadata.

Preserve legacy inspection components so they can later be moved into an
on-demand inspection surface. Do not delete them during this round.

### Round 2 - Real-data Activity-Anatomy Canvas v1

Implement the first operational canvas using real recording data.

Required outcomes:

- stable shank/depth ordering;
- individual Unit rows when readable;
- clearly marked aggregate rows when required by Unit count and viewport;
- anatomy gutter aligned with the activity rows;
- recording-wide activity overview;
- shared time cursor;
- hover context;
- time click/selection;
- basic reciprocal anatomy emphasis;
- Unit selection;
- mandatory in-place selected-Unit expansion;
- concise selected-Unit identity;
- synchronized video seek when video exists;
- compact no-video behavior when video does not exist;
- no full-spike recomputation during each paint.

Use a real-data, in-memory overview provider if appropriate to the existing
architecture. It must run outside the paint path, be reusable for the current
recording, have explicit display semantics, and map visual rows/bins back to
real Unit IDs and time intervals.

The selected Unit must expand at its existing canvas position, show
higher-resolution spike timing for the selected interval, retain surrounding
rows in a subdued state, align with its anatomical locator, and synchronize the
video. It must not open a separate Unit dashboard.

Round 2 does not need and must not expand into:

- behavior classification or segmentation;
- automatic candidate ranking;
- opaque saliency or unexplained scores;
- complex activity clustering;
- advanced multi-view comparison;
- the final persistent disk cache;
- every possible diagnostic plot.

The goal is to validate the central relationship and interaction architecture
with real data.

### Checkpoint A - Mandatory evidence

After Round 2:

1. Run the application with a representative real recording. Prefer the same
   recording shown in the current-interface screenshot when it is available.
2. Verify at least:
   - one recording without behavior video;
   - mapped or Unmapped anatomy, according to available real data;
   - selection of one real Unit;
   - selection or emphasis of one shank or region;
   - in-place expansion of the selected-Unit row.
3. Capture live screenshots at approximately:
   - 1920 x 1080;
   - the current ultrawide layout or 3840 x 1080.
4. Include screenshots that demonstrate:
   - the experiment overview;
   - one selected and expanded Unit;
   - the anatomy gutter;
   - a video-present state when available, or the compact no-video state.
5. Run relevant automated tests and smoke tests.
6. Report:
   - files changed;
   - architectural changes;
   - exact activity-summary semantics;
   - test results;
   - performance observations;
   - known limitations;
   - every specification deviation and the concrete repository constraint that
     caused it.

Then stop. Do not continue into Rounds 3-6.

### Checkpoint A acceptance checklist

Checkpoint A is acceptable only when all items are demonstrated:

- [x] Opening an experiment produces an experiment-level overview rather than a
      selected-Unit dashboard.
- [x] The default workspace has no permanent left Unit list.
- [x] The default workspace has no permanent tall Probe inspector.
- [x] The default workspace has no permanently visible waveform/template panel.
- [x] Neural activity and anatomy appear in one aligned canvas.
- [x] Time is horizontal and anatomical ordering is stable.
- [x] Shank, depth, and region are visually attached to their activity rows.
- [x] Aggregate rows are clearly distinguishable from individual Units.
- [x] A real Unit can be selected from the canvas or Find Unit action.
- [x] The selected Unit expands in place.
- [x] Selection makes the Unit's shank, depth, and region immediately
      understandable.
- [x] Video shares the same cursor or selected interval.
- [x] Missing video produces a compact state rather than a large empty panel.
- [x] Existing deep diagnostics remain reachable or preserved for later drawer
      migration.
- [x] The UI uses real data rather than a static mockup.
- [x] The application runs and relevant tests pass.
- [x] Live screenshots demonstrate normal desktop and ultrawide layouts.
- [x] The implementation visibly supports `Represent relationships first and
      analyses second.`

### Visual intent for the review

With no video, the default view should read as one experiment workspace: compact
orientation header, row-attached anatomy index, dominant recording-wide activity
over time, one shared time axis, and a compact video-status/action strip. With
video, the layout should become a large activity canvas plus one synchronized
video region rather than reserving a large empty video area in both states.

After a Unit is clicked, its existing row should expand in place and expose
spikes, an optional restrained rate envelope, the selected interval, and a
concise identity such as `Unit 3 · Shank 1 · 120 µm · Unmapped`. Neighboring
rows remain visible. Waveform, ISI, contamination, and template amplitude stay
preserved but are not permanently visible.

### Ready-to-send prompt for Dialogue 1

> Read the root `AGENTS.md` and
> `docs/planning/UNIFIED_EXPERIMENT_VIEWER_MULTI_ROUND_PLAN.md`. Execute Dialogue 1 only:
> complete Round 0, Round 1, and Round 2 in the real Neuropixels Explorer, then
> produce every Checkpoint A screenshot, test result, activity-summary
> definition, performance observation, limitation, and deviation report. Stop
> at Checkpoint A. Do not implement Rounds 3-6, behavior classification,
> candidate ranking, saliency, or a final persistent disk cache. Preserve all
> unrelated worktree changes and do not push.

## Dialogue 2 - Checkpoint A visual and interaction review

This is a decision dialogue, not permission to start Round 3 automatically.

Review these artifacts together:

- normal desktop and ultrawide screenshots;
- overview and selected/expanded-Unit states;
- anatomy gutter and video/no-video states;
- exact activity-summary and aggregate-row semantics;
- test and smoke-test results;
- performance notes, limitations, and deviations.

Judge:

- whether the page is experiment-centered rather than Unit-centered;
- whether the activity/anatomy/video relationship is understandable without
  cross-referencing separate panels;
- whether information density is useful without becoming a new dashboard;
- whether aggregate semantics, anatomy uncertainty, and selection are clear
  without relying on color alone;
- whether selected-Unit expansion preserves spatial and temporal context;
- whether normal and ultrawide layouts preserve the intended hierarchy.

Possible outcomes:

- **Corrections required:** turn the feedback into a concrete Checkpoint A
  acceptance list, modify only Rounds 0-2 scope, rerun the same evidence matrix,
  and stop again at Checkpoint A.
- **Checkpoint A approved:** record the approval in the implementation map and
  progress table. Only then may a later dialogue begin Round 3.

### Ready-to-send prompt for Checkpoint A corrections

> Apply my Checkpoint A feedback only within the Round 0-2 scope. Reproduce the
> same real-data, normal-desktop, ultrawide, overview, expanded-Unit,
> anatomy-focus, and video/no-video states; implement the corrections; rerun the
> relevant tests; and stop again at Checkpoint A. Do not start Round 3.

### Round 2.5 correction result and Checkpoint B

The Checkpoint A correction pass is complete. It replaces viewport-width-driven
row budgeting with height-aware anatomical grouping, keeps shanks and reliable
probe-track segments separate, uses the fraction of constituent Units above
their own recording-wide p90 as the aggregate signal, and adds progressive
local group focus plus bounded selected-Unit neighborhoods. Expanded Units now
move from recording density to a normalized rate envelope and then exact spike
marks as the visible time span narrows. The video region starts at 26% width,
is resizable from 20-42%, and preserves the shared neural cursor when a source
is attached.

Checkpoint B repeats the real-data desktop, ultrawide, overview, progressive
focus, mapped-anatomy, expanded-Unit, interval, video/no-video, semantics,
performance, and automated-test evidence. Round 3 remains blocked until the
user explicitly approves Checkpoint B.

## Dialogue 3 - Round 3: Persistent multi-resolution overview backend

This dialogue requires explicit Checkpoint B approval.

Implement:

- a versioned activity-summary cache or pyramid;
- multiple temporal resolutions;
- viewport-dependent anatomical aggregation;
- computation outside the UI thread;
- cancellation and progress state;
- invalidation based on recording/data fingerprint and preprocessing version;
- navigation without O(number of spikes) work;
- tests for row-to-Unit and bin-to-time mappings.

Keep this pipeline explicitly display-oriented. It must not silently become a
scientific-analysis or ranking pipeline. Preserve the approved Checkpoint A
visual and interaction semantics.

### Evidence and gate

Report cache identity/versioning/invalidation, build and cancellation behavior,
mapping tests, representative build/navigation measurements, and proof that the
approved UI semantics are unchanged. Stop for backend and mapping review before
Round 4.

### Ready-to-send prompt for Dialogue 3

> Checkpoint B is approved. Execute Round 3 only: implement the versioned,
> cancellable, multi-resolution display-summary backend with explicit
> fingerprint invalidation, off-UI-thread computation, and row/bin mapping
> tests. Preserve the approved UI and scientific boundaries. Report measured
> behavior and stop before Round 4.

## Dialogue 4 - Round 4: Complete progressive focus and synchronization

Implement:

- smooth semantic zoom;
- group unfolding;
- exact Unit-level focus;
- selected-interval behavior linkage;
- reciprocal shank/region/depth selection;
- improved video synchronization;
- missing-frame and synchronization warnings;
- selection preservation across zoom and inspection-drawer operations.

### Evidence and gate

Demonstrate overview-to-group-to-Unit focus, reciprocal anatomy focus, interval
linkage to video, missing-frame/warning behavior, and selection preservation.
Use deterministic interaction tests where the existing test stack permits.
Stop for progressive-focus and synchronization review before Round 5.

### Ready-to-send prompt for Dialogue 4

> Execute Round 4 only on the approved multi-resolution backend. Complete
> semantic zoom, group unfolding, exact Unit focus, interval/video linkage,
> reciprocal anatomy selection, synchronization warnings, and selection
> preservation. Demonstrate and test the full state sequence, then stop before
> Round 5.

## Dialogue 5 - Round 5: Deep inspection migration

Implement:

- migration of waveform, QC, Probe details, and existing selected-Unit
  diagnostics into one on-demand inspection surface;
- retention of all validated values;
- removal of duplicated legacy primary-screen components only after parity is
  verified;
- preservation of keyboard and accessibility behavior;
- exact restoration of time range, cursor, selected Unit, expanded row, and
  anatomy focus when the inspection surface closes.

### Evidence and gate

Provide a diagnostic-parity inventory, inspector open/close state sequence,
keyboard/accessibility checks, and regression results for preserved capabilities.
Stop for migration review before Round 6.

### Ready-to-send prompt for Dialogue 5

> Execute Round 5 only. Move the preserved Unit diagnostics into one on-demand
> inspection surface, verify every validated value and capability before
> removing duplicated primary-screen components, preserve keyboard and
> accessibility behavior, and prove exact context restoration. Stop before
> Round 6.

## Dialogue 6 - Round 6: Validation and performance

Test representative cases:

- no behavior video;
- attached behavior video;
- Unmapped anatomy;
- uncertain region boundaries;
- one shank and multiple shanks;
- approximately 100 Units;
- substantially larger Unit counts;
- sparse and high-rate Units;
- incomplete metadata;
- experiment switching;
- narrow desktop and ultrawide layouts.

Verify:

- an aggregate is never presented as a Unit;
- selections remain synchronized;
- anatomical ordering remains stable;
- no important current capability is silently lost;
- no expensive spike processing occurs in paint handlers;
- UI interaction remains responsive on representative recordings;
- normalized display summaries are not labeled as raw firing rate;
- uncertain anatomy remains uncertain and source data/validated labels are
  unchanged.

### Final evidence and gate

Run the full relevant portable suite and the established safe real-data
workflow. Report the final screenshot matrix, exact data/display semantics,
measured performance, test results, retained-capability audit, known limitations,
and unresolved deviations.

Final acceptance is a user decision. Commit, push, tag, publish, behavior
annotation, candidate-event generation, and explainable ranking remain separate
actions unless explicitly requested.

### Ready-to-send prompt for Dialogue 6

> Execute Round 6 only. Validate the complete representative-case matrix,
> scientific/display boundaries, synchronized selection, stable anatomy order,
> retained capabilities, paint-path performance, responsiveness, and normal plus
> ultrawide layouts. Run the full relevant portable and safe real-data checks,
> present final screenshots and measured evidence, and stop for final acceptance.
> Do not push, tag, publish, or add behavior/ranking features.

## Separate annotation beta round

On 2026-09-08 the user explicitly authorized the behavior annotation beta,
license/algorithm trials, version tags, and GitHub push. This feature is scoped
separately from the still-deferred general viewer Rounds 4-6. See the current
implementation map and `BEHAVIOR_ANNOTATION.md`.
