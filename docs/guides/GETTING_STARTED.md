# Getting started

[Documentation index](../../README.md)

Commands in this document run from the application repository root.

## Single HTML in the browser

Open [index.html](../../index.html) in desktop Chrome or Edge. You can rename it
and send it as a single file. JavaScript, CSS and the NWB HDF5 reader are embedded.
On first use the skippable walkthrough highlights the actual drop areas. Drop a file directly or use Next to visit the areas. Open Settings to replay the walkthrough. The Probe formats and the recording-specific event JSON example are available at their own inputs.

Drop a video on the video pane, or Kilosort results and NWB 2.x HDF5 files with sorted Units on the neural pane. The workspace highlights drop targets. If a pane cannot accept a file, a red message identifies the destination and the entire drop is declined. Use **Import files** or drop on the page header for mixed inputs. A video can be played and
annotated on its own. The activity pane shows available neural data and identifies
the files needed for each missing view. Add files as they become available.
Keep the folders around separate Kilosort recordings when their filenames repeat. The top-bar text size field accepts 14–24 px in 1 px steps and remembers your choice. Amber status text identifies a missing or limited function. A verified video clock appears in green.

A saved project can already include Unit regions from the NWB electrodes and the clock mapping for its video. To supplement missing anatomy, drop a matching CSV with shank, depth in micrometres and region in the Probe pane. Spike viewing also works without region labels.

A video and its labels use video time. To synchronize video with a neural recording,
drop the matching Allen frame-clock JSON onto the frame-clock prompt under the video title, or click it to choose the file. When verified, the box becomes a green status. Drop missing Kilosort files on the named slot in Neural activity or Probe. Drop recording event JSON on **Recording labels**. Recording events can also come from the NWB.
Click the **Video annotations** area to create an annotation for the current video. Click **＋ New label**, choose a name, color and event type, and save the label. Drop an existing annotation or behavior candidate JSON onto the same area to import it. A saved annotation file restores its draft. A candidate file adds its segments to the current draft. Either import can be undone. You can drop the JSON first and add its matching video later. When several recordings could match a file, choose
the recording for its neural inputs. A video is shared across all probes in the same acquisition. Drop another video into the video pane to add a camera tab. Each tab keeps its own annotations and alignment. Drop a camera's clock on its alignment area to replace a manual offset. The **Project** menu retains the grouped
file and folder import form.

The current tab holds the working project. **Save project** writes the
recordings, media, time mapping, and annotations to a portable `.neuroproject`
file. Drop that file or use **Open project** to restore it. Closing a modified
workspace asks for confirmation. Recent projects from older versions can still be
opened from the menu.

Desktop opens **Side by side** and remembers layout changes. Narrow windows stack vertically. The Probe button shows or hides the probe dock. **Stacked** puts the video above
the signals, and **Side by side** puts it beside them. Both keep the current Unit
and time selection. **Edit clips** and **Alignment** are in the video header.
Playback details contains custom speed and jump-to-time inputs.

These packages differ from the service's `.neuroproject.json` path-based files.
For an old service project, reselect its neural data/video in a browser project,
import its clock, and transfer existing labels through annotation JSON export/import.
For NWB imports, the exported project includes each selected probe’s derived arrays
and original Unit metadata. Keep the source NWB to add other probes later. Use × on a recording tab to remove it from the working project. The project menu can undo removal.

## Existing path-based service projects (legacy)

The workspace shows neural activity, Probe views, video and annotation regions
before data is loaded. Empty regions explain their inputs and available tools.
Use the top **New project**, **Open project** and **Add video / Change video**
controls together. **Project** contains recent projects and save/export actions;
recent projects resume local working drafts. **Workspace** returns to the current
recording without closing it. Empty Probe, neural and video regions include schematic
illustrations. **Side by side / Stacked** changes the arrangement while retaining
the selected Unit, time interval and video position. Drag the separator to resize;
use its arrow keys or Home to adjust or reset the split.

Choose **New project**, enter a name and select **Neural data only** or
**Neural data + video**. Then select the source:

| Source | What to select | Matched automatically |
| --- | --- | --- |
| Kilosort | Results folder containing `spike_times.npy` and `spike_clusters.npy` | Sampling rate in `params.py`, templates, spike/channel positions, channel IDs and quality labels. Enter the sampling rate if absent. |
| Allen Brain ecephys NWB | Session `.nwb` containing processed Units, peak channels and probe metadata; then select one or more physical probes | Unit spike times, original IDs, quality labels, peak-channel coordinates and regions |
| Behavior video | The corresponding video file, from any folder | Nearby videos are offered as choices; a matching `<video-stem>.clock.json` is checked automatically when attached |

MP4 / WebM are recommended. MOV / AVI / MKV playback depends on the browser's
codec support. Raw acquisition files need spike sorting before using this workspace.

**Project files & features** shows a compact check/cross list for activity,
interval spatial distribution, Unit templates, anatomy, video annotation and
alignment. Missing optional inputs leave the other views available. Allen electrode
positions support spatial activity; they do not supply Kilosort multichannel templates.
Existing catalog anatomy is reused when selecting the same Kilosort folder.

Choose **Alignment** to match a shared event or import a frame-clock JSON.
A manual match is shown separately from a verified frame clock. Verified clocks
retain dropped-frame corrections and their measured time range.

**Save project** writes an `.neuroproject.json` file with source references,
video association, alignment, labels, schemes, reviewed state and annotation intervals.
**Open project** restores that snapshot, including in a fresh local catalog.
**Recent projects** resumes the local working draft. Use **Save project as…** for
another file. Keep source arrays, generated Allen arrays and video in place; the
project references these files rather than packaging large recordings into JSON.

## Explore and annotate

The signal workspace starts with the full recording. Each Unit shows spikes and firing rate on the same time axis. Scroll on the right to browse Units. Drag the left Unit card to pan the signals, or click the bottom ruler or whole-recording track to center a two-second window on a time point. Click anywhere on a Unit card to select it. Ctrl/Cmd-click another card to add a reference. Click any highlighted card to remove it. Removing the last Unit keeps the time window, cursor and video position. The Probe uses the original anatomical data where available. Unit details retain the waveform, raster and legacy Probe inspector.

To compare repeated behavior, choose a recording or video label and click **Compare event spikes**. Choose a Unit, then inspect the time bins where it fired across separate bouts. Use an observed event as a reference or drag across a signal row to choose your own window. Click a candidate to see its spikes alongside the reference.

The player’s progress bar covers the full video. Its upper edge shows events of the selected source and type. **Event markers** starts collapsed. Expand it for an independent detail window, or open **Edit clips** to expand it automatically. Use the wheel to zoom at the pointer. Hold Shift and drag with the left button anywhere on the event strip, or use Shift + wheel, to pan. Select **Full duration** to reset. Recorded events retain their neural times. With video attached, only the overlap with the mapped video is drawn. Without video, the event strip uses neural seconds.

Choose the event type beside **Mark**. **Time point** records the current video time in one click, during playback or while paused. **Interval** starts with **Mark** and finishes with **Stop**, which pauses playback and saves both times. The next mark uses the most recently selected video label. Esc cancels the mark in progress. Use **Label settings** to see the events for each label, rename it, or delete an event or the entire label. Expand **Event markers** to move a video annotation, resize its selected edges, or brush the event lane and press Delete. Drag the ruler to pan. **Undo deletion** or Ctrl+Z restores removed events. In **Edit clips**, hold Alt and drag across an empty part of the event lane to draw a new interval.

**Clips & grouping** opens batch review, independent laboratory label schemes,
undo/redo, import/export, and experimental motion grouping. Candidate groups
require human review; the motion baseline is not a validated behavior classifier.
JSON exports preserve every scheme, source run and interval; CSV exports the
current scheme and exact neural/video time mapping. Service-project drafts are saved locally as you edit. Use **Save project** to
update the project file; right-click and choose **Save annotations** for a separate
annotation JSON. Browser-only drafts remain in that browser/origin.

See [annotation contracts and methods](../contracts/BEHAVIOR_ANNOTATION.md),
[Beta 3 implementation and acceptance](../archive/checkpoints/beta3-workspace.md), and
[third-party notices](../../THIRD_PARTY_NOTICES.md). No fixed ethogram is imposed.

## Portable HTML

Open the standalone `Neuropixels-Explorer.html` in Chrome to import a Kilosort folder or an NWB with sorted Units, add a local video, and save a portable `.neuroproject`. Dark, Light, High Contrast and System themes,
English/Simplified Chinese/Spanish, contextual help, and Unit detail controls
remain available. The raw-voltage extension contract is retained for future
AP/LFP providers.
