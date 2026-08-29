# Neuropixels Explorer agent rules

These instructions apply to the entire repository. Read this file before every
implementation or review round. If a nested `AGENTS.md` is added later, follow
both files for work in that nested directory, with the more specific rule taking
precedence.

## Working contract

- Work in the real Neuropixels Explorer application. Do not substitute a design
  document, SVG, wireframe, or image mockup for an implementation request.
- Before editing, inspect the current branch and worktree and preserve all
  unrelated changes. Never assume an existing change was made by the current
  agent.
- Read the current architecture and discover paths, schemas, component names,
  tests, and scientific semantics from the repository and real data. Do not
  guess them.
- Before changing the experiment workspace, identify the current entry point,
  rendering stack, state ownership, Unit list, selected-Unit metrics, behavior
  video, spike/time views, waveform/template, Probe view, metadata sources,
  spike-time source, video synchronization model, and screenshot/test workflow.
- Follow the existing plain-browser architecture, theme tokens, and styling
  patterns. Do not introduce a new GUI framework or rewrite the application.
- Run the application and proportionate tests after implementation. Visual work
  must be checked with screenshots captured from the running UI.
- Preserve keyboard and accessibility behavior when moving or reusing existing
  components.
- Treat any supplied screenshot as evidence of the current state, not as the
  desired architecture.
- Do not stop after reconnaissance unless a genuine technical blocker prevents
  safe progress within the current round.
- Do not push, merge, rebase, rewrite history, or modify unrelated files unless
  the user explicitly asks for that separate action.

## Product north star

Represent relationships first and analyses second:

> time <-> neural activity <-> Unit or Unit group <-> shank/depth <-> anatomical
> brain region <-> animal behavior

Build a simple, information-efficient experiment viewer that hides analytical
complexity while preserving scientific meaning. Optimize for maximum useful
information with minimum visual and interaction complexity.

Do not turn the product into a generic dashboard, a full Kilosort curation
application, a complete electrophysiology suite, or a grid of plots, cards,
tables, metrics, tabs, and filters. The default view must not require the user
to mentally cross-reference disconnected signal, Probe, Unit, and video panels.
Do not optimize appearance while leaving signal/anatomy/video relationships
disconnected.

## Scope and protected behavior

The redesign applies to the main workspace after an experiment is opened.

Preserve the global shell and existing capabilities, including data opening,
database access, experiment switching, language/theme/help controls, validated
Kilosort access, video attachment, and validation-video actions. The experiment
switcher may be visually de-emphasized, but this work must not expand into a
redesign of ingestion, export, database management, or the entire shell.

Never change source datasets, Kilosort output values, Unit labels, scientific
quality classifications, anatomical assignments, or validated analysis
algorithms as part of display work. Do not infer missing anatomy.

## Default experiment workspace

The default screen has two major content regions:

1. a dominant unified neural activity-anatomy canvas;
2. one synchronized behavior-video region when video is available.

A compact experiment header and one shared time axis/cursor support those
regions; they are not independent analysis panels. Avoid strong borders,
repeated controls, decorative framing, tiny labels, and a card grid. At wide
desktop sizes with video, the activity-anatomy canvas should generally receive
about 70-76 percent of the content width.

The compact header may show experiment identity, duration, Unit count, data
readiness, video/anatomy availability, current time or selected interval, and
one compact Find Unit action. Do not permanently expose detailed selected-Unit
QC metrics there.

Do not permanently show a Unit-list sidebar, full Probe inspector, waveform
template, duplicate full-recording Unit timeline, or detailed QC panel on the
default screen. Preserve useful legacy functionality by relocating or reusing
it; do not delete legacy components during the first visual checkpoint.

Do not replace those permanent panels with many analysis tabs. Do not rely on
color alone for selection or anatomical meaning, and do not hide aggregate
semantics behind hover-only explanations.

When video exists, show one synchronized viewer using the same cursor and time
range as the neural canvas. Preserve the existing video source and time-mapping
behavior, keep controls compact, and avoid an independent second timeline. If
multiple cameras are already supported, use a compact selector.

When video is unavailable, collapse the video area to a compact status/action
surface. Retain attach-video and validation-video actions and let the neural
canvas reclaim the space. A large empty no-video placeholder must not dominate
the workspace.

## Unified activity-anatomy canvas

- Time is the horizontal axis.
- Units or explicitly labeled local Unit groups are the vertical axis.
- Primary vertical order is stable and anatomical: shank, then depth, then a
  stable Unit identifier where needed. Do not reorder the primary view by
  activity clustering.
- Attach a narrow anatomy gutter directly to the activity rows. Treat the Probe
  as a coordinate system, not as a large illustrated object.
- The gutter must communicate shank grouping, relative depth, region labels and
  boundaries, selection position, and mapping uncertainty.
- Different shanks may traverse different regions at the same depth. Never use
  a global region band when it would imply false anatomical equivalence.
- Show `Unmapped` explicitly for missing anatomy rather than implying a mapping.

Show individual Units when they are legible. Otherwise aggregate contiguous
anatomical rows by shank, depth, region where available, and viewport
resolution. Every Unit must contribute to the overview. Every aggregate must be
visibly identified as an aggregate and expose its Unit count and
shank/depth/region range; it must never look like a single neuron.

Use a compact activity texture or matrix instead of hundreds of line charts.
For the initial implementation, use real data and an interpretable display
summary compatible with the existing architecture. Robust within-Unit
normalized binned activity is acceptable for individual rows. Fraction of
constituent Units active per bin is acceptable for aggregate rows. Whatever is
implemented must have documented semantics, clearly distinguish individual and
aggregate rows, prevent high-firing Units from dominating, and never label
normalized activity as raw firing rate.

## Shared interaction model

Use one source of truth for experiment-view interaction state. Adapt names to
the codebase, but keep these concepts coherent across all views:

- visible time range;
- cursor time;
- selected time interval;
- selected aggregate group and selected Unit;
- selected shank, depth range, and anatomical region;
- focus and expansion state.

Video, neural activity, anatomy, and Unit detail must not maintain conflicting
independent selections.

When an experiment opens, show the recording-wide overview rather than Unit 0,
the previous Unit, or a single-Unit dashboard. Place the shared cursor on the
overview and show the matching video frame when available.

Direct manipulation is primary: hover for context, click to move the cursor,
brush to select an interval, zoom into it, and reset to the overview. Keep only
a small discoverable control set. Time or interval selection must update video
synchronously.

At coarse scale, selecting an aggregate expands it in place enough to reveal
constituent Units or finer grouping while leaving unrelated rows visible but
subdued. At detailed scale, selecting an individual Unit acts directly. Avoid
tiny click targets.

Provide a compact Find Unit overlay or popover using fields that actually exist,
such as Unit ID, shank, region, or Kilosort label. Selecting a result focuses
the corresponding canvas row; it must not navigate to an unrelated page.

### Mandatory selected-Unit expansion

The first visual checkpoint must visibly support this flow:

> select -> expand -> interpret -> optionally inspect deeper -> collapse

Selecting a Unit expands its row in place in the neural canvas, preserves the
surrounding experiment context, shows higher-resolution spike timing for the
selected range, keeps neighbors visible but subdued, emphasizes the anatomy
gutter at the same vertical position, displays a concise identity line, and
synchronizes the video. Add a restrained firing-rate envelope only when it
materially improves interpretation.

Do not replace the workspace with a new Unit dashboard or route the user to a
separate signal page. Visual continuity is more important than elaborate
animation.

Anatomy selection is reciprocal. Selecting a shank, region, or depth segment
emphasizes the corresponding rows without changing the time range or opening a
separate Probe screen. Selecting a Unit simultaneously identifies its shank,
depth, region, and mapping confidence.

## Deep Unit inspection

Expose one explicit `Inspect unit` action that opens a focused drawer or
secondary surface. Reuse applicable existing views for waveform/template,
channel footprint, autocorrelogram, ISI information, drift/stability, QC,
anatomical metadata, tags, and existing export actions. Do not open all of this
automatically on selection.

Closing the inspector must restore the exact time range, cursor, selected Unit,
expanded row, and anatomical focus.

## Display-preprocessing boundary

Keep validated scientific data and metrics separate from display-oriented
derived summaries. Display preprocessing must:

- run outside paint and interaction hot paths;
- avoid O(number of spikes) work on every paint or interaction;
- avoid blocking the UI and be reusable for the active recording;
- document binning and normalization semantics;
- map every visual row/bin back to real Unit IDs and time intervals;
- preserve Unit-to-shank/depth/region mappings and anatomy confidence;
- leave room for a later persistent multiresolution cache without requiring it
  at the first checkpoint.

Never present an aggregate as a neuron, uncertain anatomy as definite, or
normalized values as raw firing rate. Never modify Kilosort/anatomy sources or
validated Unit labels. Keep raw and validated measurements available in deeper
inspection. Do not introduce an opaque saliency or importance score in the
first checkpoint.

## Deferred features

Before Checkpoint A approval, do not implement behavior classification or
segmentation, automatic candidate ranking, opaque saliency, complex activity
clustering, advanced multi-view comparison, the final persistent disk cache, or
every possible diagnostic plot. The first checkpoint tests whether information
organization and direct interaction alone make the experiment understandable.

Checkpoint A approval does not by itself authorize behavior annotation,
candidate-event generation, explainable ranking, or other new scientific
interpretation. Those require a separately scoped later round.

## Rounds, evidence, and stopping points

Use `docs/UNIFIED_EXPERIMENT_VIEWER_MULTI_ROUND_PLAN.md` to scope each dialogue.
The initial implementation dialogue must complete Rounds 0, 1, and 2, then stop
at Checkpoint A. Do not implement Rounds 3-6 or other backend-heavy/speculative
features before the running-UI visual and interaction review is approved.

After Checkpoint A, execute only the named approved round. Do not silently roll
multiple later rounds together.

During Round 0, create or update one concise implementation map using the
repository's documentation conventions. Record the current component structure,
data flow, synchronization state, retain/relocate/replace/retire decisions,
target shared-state owner, overview-data boundary, risks, planned files, and
test strategy. Do not create a collection of speculative design documents or
SVG wireframes.

At every visual checkpoint:

- run the real application with representative real data when available;
- exercise the interactions required by that checkpoint;
- run relevant portable tests and the real-data validation workflow when it is
  available and safe;
- capture screenshots from the running UI at useful viewport/state combinations;
- report confirmed behavior separately from known gaps and hypotheses;
- stop at the named review gate and wait for user feedback before proceeding to
  the next round.
