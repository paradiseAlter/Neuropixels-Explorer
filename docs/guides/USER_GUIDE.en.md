# Neuropixels Explorer User Guide

## Open your first recording

Open the Explorer HTML in Chrome or Edge. Drop **one NWB file or one Kilosort export folder per probe** onto **Neural activity & anatomy**. You can also use **Import files**. Start with the recording you already have.

- **NWB.** Drop an HDF5-based NWB 2.x file on the neural pane. Spike viewing uses `id`, `spike_times` (seconds) and `spike_times_index` (end offset per Unit) in the NWB Units table. Explorer reads /units first, or a single typed Units table in a processing module when /units is absent. Choose the groups to open if the file identifies several. Electrodes, anatomy and events are optional for spikes. For raw voltage or LFP alone, sort the spikes first.
- **Kilosort.** Drop the folder containing `spike_times.npy` (sample indices), `spike_clusters.npy` (one Unit ID per spike) and `params.py` with the recording’s `sample_rate` in Hz. Both arrays must be one-dimensional and have the same length. If the parameter file is missing, enter the sampling rate shown by your acquisition software. A successful import shows Unit rows and a recording time axis. Zoom in on an active row to see individual spikes.
- **Optional Kilosort files.** Keep these with the same probe’s arrays. `cluster_group.tsv` or `cluster_KSLabel.tsv` supplies quality labels. Add `amplitudes.npy` for amplitudes or `spike_positions.npy` for spike locations. For template waveforms include `templates.npy` and `spike_templates.npy`. Include `channel_positions.npy` for channel coordinates and `channel_shanks.npy` for channel-to-shank assignments when available.

### Event times and trial conditions

Look in **Recording labels** first. Choose any events already read from the NWB. For a recording with no event list, click **Download example JSON** next to **Recording labels**. Explorer fills in the recording ID. Replace the sample events with your own and drop the JSON on **Recording labels**. Use seconds on the neural recording clock. Sample indices with the same time origin and clock can be divided by the acquisition rate in Hz. Align times recorded on a separate device first. To write the JSON yourself, copy `recordingId` from **Data details**. For a recording called `run01`, this example marks a cue at 12.5 seconds.

`{"schema":"neuropixels-events/1","timebase":"neural_seconds","recordingId":"run01","events":[{"id":"cue-1","sourceId":"1","sourceKind":"experiment","type":"cue","kind":"point","start":12.5,"conditions":{"direction":"left"}}]}`

Give each occurrence its own `id`. For an interval use `"kind":"interval"` and add an `end` greater than `start`. Include all trials in one event list for each recording. Spreadsheet or CSV event logs need conversion to this JSON. Open **Event responses**, choose the event, and check the trial count. Each heatmap row is a Unit. Click a row for the actual spikes in each trial. A condition field becomes available for comparison when the event has at least two distinct values.

If acquisition stopped and resumed, enter the observed ranges in **Event responses → Advanced parameters → Observation intervals**, for example `[[0,60],[65,120]]` in neural seconds. An NWB may already supply intervals for each Unit.

### Brain regions and probe positions

An Allen NWB can supply a region through the Unit’s peak electrode. For an external assignment, choose the recording and use the input that matches your anatomical measurements.

- **A region for each Unit.** Place `explorer-units.json` inside that probe’s Kilosort folder, for example `{"units":[{"cluster_id":7,"brain_region":"CA1"}]}`. Optional `x_um`, `probe_depth_um` and `shank_id` locate each Unit on the probe. Check a known Unit against your anatomical assignment.
- **An anatomy table.** Drop a CSV onto **Probe** or **Neural activity & anatomy**. Use `experiment,cluster_id,region` for per-Unit labels or `experiment,shank,depth_um,region` for depth samples along a shank. Depth is in micrometres. This CSV importer uses numeric experiment identifiers. Names such as `mouse-016-A` and `rat-016-B` can match the same experiment number. Prefer the per-probe JSON in this case. A photograph or atlas image alone needs a numeric Unit or depth mapping before Explorer can place the region labels.

### Video, alignment and behavioral annotations

- **Play video.** Drop an MP4 or WebM onto **Behavior video**. Check the camera name on its tab and play it. Each camera has its own clock and annotations.
- **Link video to spikes.** Drop that camera’s verified Allen `.clock.json` (`allen-video-clock/1`) on the frame-clock area below the video title. Check for the verified status. For other acquisitions, open **Alignment** and enter the video time and neural time of the same identifiable event. This establishes a fixed offset. Check it again at another shared event later in the recording to detect drift.
- **Label video.** Click **Video annotations** to create labels and mark a point or interval, or drop the matching video’s exported annotation JSON (`neuropixels-annotations/1`) there. Check that the mark appears on the event axis at the expected video time. To see spikes around it, align the video, open **Event responses**, then choose **Video annotations** and the label.

## Navigate the workspace

Signals and analyses share the top tab strip. Tabs shorten as the strip fills. Hover for the full name and use the wheel over a crowded strip to scroll. Right-click a Unit to toggle a mark. In Settings → Unit marks, name additional marks and choose their colors. Saving the project includes the marks assigned to each Unit. Click a Unit in the signal Probe map to locate it. In Event responses, choose Unit selection → Probe selection to draw a box or lasso. The lasso follows the pointer. Release to select Units inside the outline, or Shift-drag in Box or Lasso mode to pan the zoomed map. Ctrl-drag adds Units to the selection. In selection mode, click empty space to clear it. Use Pan to drag a zoomed map. In Zoom mode, click to zoom in, Shift-click to zoom out, or drag a box to enlarge that region. The wheel zooms at the pointer and 100% restores the full probe. Drag the right or bottom edge of either the probe or spike picker to resize it. Drag the bottom-right corner to change both dimensions. To add Units from another probe, use the Probe selector in this analysis.

Continue dropping probes and videos from the same acquisition on their respective panes. Switch camera tabs independently of probes. Each video retains its annotations and alignment. Drop its verified frame clock on the alignment area to replace a manual offset. Frame buttons step one frame, and the arrow keys in the video pane step five. The player uses a complete frame time table when available, otherwise the declared frame rate, or 30 fps when unknown.

New analyses pool trials by default. Hit and Miss use the labels and timing rule you choose. To derive Hit / Miss from two labels, choose an alignment event and select the matching rule and a response label under Compare trials by. Advanced settings initially match response onsets from 0.15 s after the event up to, but excluding, 0.75 s. Diamonds on each trial mark other onsets of the alignment label. To view isolated trials, enable the repeated-event exclusion and rerun.

After a two-condition run, select 5J–5M next to **Trial review** in the Event responses tab. J keeps the same Unit on each row in both heatmaps. K overlays both group means in Hz. L shows several Units in one selected trial per side. Click a trial to visit the recording and video, then select the same analysis tab to return to that trial pair. In M, enter a window in milliseconds to draw one pair of rates per Unit. A pre-event window adds baseline rates. **Trial review** returns to spikes by event. **Export PNG** saves the current figure on white.

Open **Event responses** and choose the label and Units. Use the whole recording, an existing signal selection, or enter recording times to select event onsets. The separate response window sets how much time to show around each onset. Run the analysis to show one heatmap row per selected Unit, with onset at 0 s. Reopen settings above the plot to adjust the analysis. Click a row to see that Unit’s original spike times beside it. Each raster row is one trial and each tick is a spike. Click a trial to jump to its original time and synchronized video when available. Click the analysis tab to return.

The heatmap, group means and trial spikes use seconds relative to each occurrence of the selected event. The vertical line marks its onset at 0 s. For example, −0.2 s is 200 ms before each onset. The time beside a trial is its time in the original recording. Click it to return there.

Choose **Group by response shape** to group similar profiles. By default all eligible trials of the chosen event are included. To compare two conditions, choose an available field (such as direction) and two values. The first group is the reference. Switching groups retains group membership and row order. Open the calculation steps to inspect alignment, binning and grouping.

Expand settings to restrict Units or trials. Select Units by region, probe, depth or ID. Advanced settings include the time window, bin width and split-half checks. Plots follow the display theme. PNG images use a white background.

## 1. Purpose and scientific boundary

Neuropixels Explorer opens sorted spikes from Kilosort exports and compatible NWB files locally in your browser. You can inspect Unit spike timing, firing rates, template waveforms, probe positions and anatomical labels when the recording supplies them.

Interpret quality labels, ISI violations, contamination estimates, waveforms and anatomical labels in the context of the recording protocol. Brain-region labels can come from the NWB electrode table, a recording-specific Unit metadata file or an external anatomy CSV.

## 2. Open data

Close a video with the × on its tab. Project → Undo close video restores the camera, clock and labels. Switching probes keeps the current video labels. Drag the horizontal handle next to the step arrows to adjust a number, click the arrows to step, or type in the field. The player shows current shortcuts on its buttons. In Label settings, New label creates a name, Save writes your edits, and Use label returns to the player. Double-click an existing label to use it immediately.

The app opens directly into the full workspace. Empty activity, Probe, video and annotation regions explain their tools and required inputs. Use **Open / add data** for new, saved and recent projects. **Workspace** returns to the current recording.

Drop files on the highlighted pane. A red error identifies the correct destination if a file does not match, and the entire drop is declined. Use **Import files** or the page header to import different file types together. In Settings, enter a text size from 14 to 24 px or use the arrow keys to adjust it by 1 px. Drop the matching frame-clock JSON onto the frame-clock prompt under the video title or click it to choose the file. The status turns green after verification. Drop missing Kilosort files on their names in the neural pane or Probe. Drop recording event JSON on Recording labels. Click the Video annotations area to create an annotation for the open video. Click **＋ New label** to choose its name, color and event type. To import an existing annotation or behavior candidate JSON, drop it on the same area. You can drop the JSON first and add its matching video later. Desktop starts side by side and remembers your layout choice. A video alone opens the player and label editor. Add Kilosort files in stages. The signal area identifies missing inputs. Keep each recording in its own folder when filenames repeat. The project menu retains grouped import.

Drop the current recording’s MP4 or WebM on the video area. Drop its optional Allen frame-clock JSON on video alignment to map video seconds to neural seconds. Recorded events come from the NWB. **Save project** exports a portable `.neuroproject` in the standalone HTML. The local service uses native pickers and saves disk references in `.neuroproject.json`. See [Getting started](GETTING_STARTED.md).

In an Allen NWB, select individual probes or use **Select all**, then import. Each probe gets a recording tab. The × removes that recording from the working project. Use the project menu to undo removal.

Right-click a signal row to compare or inspect that Unit. A selected interval can be zoomed or cleared. Right-click the video to mark behavior, enlarge it, or add a video. Shift+F10 opens the same menu on a focused tab, Unit name, or video. Esc returns to it.

## 3. Browse Units in the recording

The signal workspace opens on the full recording. Each Unit row shows the source spikes above its firing rate. Read the absolute start/end, window width (Δ), rate scale and bin width alongside the signal. Scroll on the right to browse Units in anatomical order. The bottom track shows the window within the whole recording.

- Click anywhere on the left Unit card to select it. Ctrl/Cmd-click another card to add a reference. Click a highlighted card to remove it. The solid fill identifies the primary Unit and the double edge identifies a reference. Selected Units stay at the top when you scroll past them. Removing the last Unit keeps the time window, cursor, interval and video position. Open **Inspect unit** for waveform and QC.
- Drag the card left to reveal later activity. Drag the bottom scroll thumb to pan at the current scale. Click the bottom seconds ruler or full-recording track to center a two-second window on that time, within recording limits.
- Click the signal to place the shared cursor. Drag across the signal to measure a range. The selection offers **Zoom to selection** or **Find similar**. Ctrl/Cmd + wheel zooms around the pointer. Dense spike marks can cover several spikes in a pixel.

Use the axes toolbar to switch between measuring, panning and box zoom. Press Esc during a drag to cancel it. Hover over a spike for its original time or over the rate trace for the bin interval, count and Hz. In Zoom mode the wheel zooms around the pointer. Home restores the full recording. Back and Forward navigate time windows. Click the signal to pan with the arrow keys, or the video to step five frames. Space toggles playback and M marks a time point or starts or ends an interval. Settings beside Help contains shortcuts, font size, language and theme. Right-click to save the project or save the active video annotations as JSON.

The event-aligned panel has its own history for reference events, Units and searches. Undo in the annotation editor restores annotation edits. In the standalone browser app, the Project menu can undo and redo the last eight video changes and alignments per recording while the project is open.

### Inside the detailed Unit inspector

Choose a Recording from the horizontal strip, then use the Unit list:

- **Click**: open only that Unit and replace the current signals.
- **Ctrl + click**: add the Unit without removing open signals.
- **Right-click**: open a menu with **Open only**, **Add to current view**, **Remove from view**, and **Locate on Probe**.
- **Arrow Up / Arrow Down**: move keyboard focus through the Unit list.

Click any open signal to make it the focused Unit. The left list scrolls to and highlights it; the Probe Inspector and lower detail plots follow the same focus. Up to ten Units can be open at once.

`Good`, `MUA`, and other values in the list are KiloSort or curation labels.

## 4. Read the detailed Unit inspector

Each open Unit has two aligned views:

- The upper raster marks individual spike times.
- The lower curve shows binned firing rate through time.

The compressed Overview represents the complete recording. Its outlined window is the interval shown in detail. Click or drag in the Overview to move the detailed window.

### Cursor mode

Move over a signal to read time without changing the view. Page scrolling remains normal.

### Zoom mode

Drag across any part of a signal to select a time interval, or use the wheel to zoom around the pointer. Wheel events are captured only while the pointer is inside a signal; the rest of the page still scrolls normally.

### Pan mode

Drag horizontally to move the time window. With the pointer inside a signal, wheel down moves to later time and wheel up moves to earlier time. Trackpad horizontal or vertical motion uses the dominant axis.

### Linked and independent time

**Time linked** applies Zoom, Pan, Back, and Reset to every open Unit. **Time independent** changes only the focused Unit. Use linked time for direct temporal comparison and independent time when one signal needs another scale.

### Synchronized behavior video

The compact video track sits directly above the neural signals. If the selected
Recording contains a supported video file, the Explorer opens it locally. Use
**Attach local video** to choose another file. If the experiment video is not
available, **Generate validation video** creates a deterministic mouse-arena
stream with exact 30 Hz frame numbers and a visible sync pulse every five seconds.

Play, pause, seek, change speed, or step one frame at a time. **Follow signal**
keeps the current neural time inside the visible Unit window. The green Video
playhead is drawn at the same neural time on every open Unit. Clicking a neural
plot in Cursor mode performs the reverse operation and seeks the video.

Use **Offset (s)** for a quick manual alignment. For frame-accurate experiment
alignment, load frame timestamps, TTL events, or a documented clock fit.

## 5. Interpret Unit details

- **Spikes**: number of detected spike events assigned to the Unit.
- **Mean firing rate**: spikes per second averaged over the full recording.
- **ISI < 2 ms**: percentage of adjacent spikes separated by less than 2 ms; use as one quality indicator, not a standalone rejection rule.
- **Presence ratio**: fraction of recording intervals in which the Unit is detected.
- **KS amplitude**: KiloSort amplitude summary in dataset-specific units.
- **KS contamination**: KiloSort contamination estimate when available.
- **Amplitude stability**: relative spike amplitude through recording time.
- **Autocorrelogram**: distribution of time differences between spikes from the same Unit.
- **KiloSort template**: the most frequently assigned template waveform and peak channel.

Question-mark controls beside these features explain what each value is, how to read it, and when to use it. Hover with a mouse or move keyboard focus to the question mark.

## 6. Use the Probe Inspector

The right panel separates four visual layers:

- Brain-region bands are continuous colored depth intervals from the optional mapping source.
- Faint channel ticks show electrode sampling positions and are not the primary interaction target.
- Gray circles are Units that are available but not open.
- Colored circles are open Units and use the same colors as their signals.

The focused Unit has a white outer ring, a horizontal depth line, and a fixed label. Hover a Unit marker to see Unit ID, physical Probe, shank, depth, region, and channel. Click to lock the marker and its depth; click empty Shank space or press **Esc** to clear the lock. If several Units overlap at a similar depth, the Explorer opens a small list instead of requiring you to guess which marker is which.

Probe interactions use the same selection rules as the left list: click opens only, Ctrl-click adds, and right-click opens the shared Unit menu. Nearby Units are listed relative to the locked Probe position. Distances are shown in micrometres.

For the current acquisition, `channel_shanks.npy` identifies four shanks on one physical Probe. The Inspector therefore shows one expandable **Probe 1** group containing **Shank 1–4**. Multi-Probe data must also provide a physical-Probe identity.

## 7. Brain-region mapping

KiloSort output does not contain a reliable brain-region identity. Optional anatomical annotations must be supplied separately. A compatible depth mapping uses at least:

- `probe` or `shank`
- `depth_um`
- `region`

Recommended fields include `electrode`, `atlas_id`, `color`, and `recording_id` for session-specific tracks. Brain-region abbreviations such as `MPN` and KiloSort field names are shown exactly as provided and are not translated.

Treat the current mapping as electrode/depth metadata. A registered three-dimensional Allen CCF trajectory also requires full atlas coordinates and registration provenance.

## 8. Layout, themes, language, and keyboard use

Drag the left splitter to resize the Unit list and signal workspace. The Probe Inspector keeps a deliberate fixed width because horizontal expansion does not improve depth resolution. Drag the horizontal handle below the Probe diagram to change its height; with keyboard focus, use Up/Down arrows, Shift + Up/Down for larger changes, and Home to reset. On a narrow screen, side panels can still be collapsed with the chevron buttons.

Themes include Dark, Light, High Contrast, and System. The theme affects the HTML interface, signal Canvas, Probe bands, grids, selections, and Unit colors. Language and theme choices are saved on the current device.

The Explorer supports English, Simplified Chinese, and Spanish. Changing language updates the interface, question-mark explanations, and this Help drawer. File names, brain-region abbreviations, and KiloSort field names remain unchanged.

Use **Tab** and **Shift + Tab** to move through controls. Press **Enter** or **Space** to activate buttons. Press **Esc** to close Help, menus, data status, or a locked Probe selection when applicable.

## 9. Privacy and performance

In folder mode, selected files stay on the local computer. The browser indexes the folder and sends only the selected Unit result to the interface after background processing. Database mode can query a separately operated local service; direct `file://` use works on its own.

Help is bundled with the standalone HTML and remains available when `index.html` is opened directly.

## 10. Troubleshooting

- **No recordings found**: confirm each candidate contains `spike_times.npy`, `spike_clusters.npy`, and `params.py`.
- **A plot is unavailable**: open Data status and check whether its source file is missing.
- **Brain region is unmapped**: confirm a compatible Legacy Table or depth mapping was included and uses the correct Recording/Unit identifiers.
- **Open raw voltage**: connect a compatible raw-voltage reader to the recording’s continuous data.
- **No experiment video is available**: use **Generate validation video** to check playback and alignment.
- **Navigation changes the wrong trace**: check whether time is Linked or Independent and which signal is focused.


## 11. Behavior annotation beta

The player’s progress bar always spans the whole video. Drag it to pause and seek. The marks along its upper edge show the current label source and type. Click a mark to go to its event. **Event markers** sits above the progress bar and starts collapsed. Expand it for a closer look, or open **Edit clips** to expand it automatically. Use + or −, or wheel around the pointer to zoom. Once zoomed in, hold Shift and drag with the left button anywhere on the event strip, or use Shift + wheel, to pan. **Full duration** resets the detail view. Zooming the event strip keeps the video position and neural window.

With video attached, both bars use video seconds. A recording event appears where its original neural time maps into the video. A point outside coverage is omitted and an interval crossing the boundary is drawn only over the overlap. Its original recording times are preserved. Without video, the event strip uses neural seconds.

In **Label settings**, click **＋ New label**, enter its name, choose its color and event type, and **Save**. Double-click a saved label to use it. Beside **Mark**, choose **Time point** for an instant such as first contact. One press records the current video time and preserves playback or pause. For a behavior such as grooming, choose **Interval**. Press **Mark** to start playback, then **Stop** to pause and save both times. Esc cancels an unfinished interval. Changing the event type sets the default for future marks with that label. Existing events keep their original type.

Expand **Event markers** to drag a video annotation or resize its selected edge. Drag across the empty event lane and press Delete to remove several events. Drag the time ruler to pan. **Label settings** lists individual events and can delete a label with its linked events across schemes. **Undo deletion** or Ctrl+Z restores the events. Ctrl+Y reapplies the edit. In **Edit clips**, hold Alt and drag from an empty part of the event lane to draw a new interval for **Save label**. Hover for a frame preview, review a saved clip with **Play interval**, then drag its handles or set a boundary at the cursor. **Fine adjustment** accepts seconds or zero-based frames with an exclusive end. Frames use nominal FPS, so use seconds for variable-frame-rate video. Video overlays, clips and neural masks share label colors. **Clip tools** provides new/split/remove. Undo/Redo and **Clips & grouping** remain available. Drag the horizontal handle on **Speed ×** to change the speed by 0.01 per pixel, hold Shift for 0.001, or click and type.

### Find repeated activity around a label

Choose a recording or video label, open **Spikes across events**, and choose a Unit. Each row shows one occurrence, with its onset at zero by default. Click a row's time to open its original signals and aligned video. The recurrence strip counts windows with at least one spike in each time bin, using at most one event per bout and skipping overlapping windows.

To search, drag across one Unit's row to mark a reference interval or use the observed representative event below the recurrence strip. The search compares spike counts in corresponding time bins for the same Units. Click a candidate to place both sets of original spikes on the same time scale. You can also start a search from a selection in the continuous signal view. Starting on a highlighted comparison row uses the selected Units.

For interval statistics, select a saved clip on the video timeline or the colored
behavior strip above the neural signals, or drag any time interval on the signals.
Click **Interval distribution** on the left Probe. Point size shows interval Hz;
the list contains every Unit's Hz and spike count. The depth/rate chart starts
vertically; **Horizontal view / Vertical view** swaps its axes without changing
the results. Hover a mark for details. Units without depth remain in the list.
An open panel follows new selections; closing it keeps the selection. Statistics
require a local project and use actual covered neural seconds and `[start, end)`.

**Experimental grouping** proposes local motion/appearance groups. Choose a
group, compare its sample videos, name it and confirm the clips.
Move selected clips into a new group to refine the grouping. Import external
algorithm candidates through JSON. Original algorithm groups remain preserved.

Each **Label scheme** has independent labels, group mappings and review states.
Changing shared video boundaries makes affected clips need review in all schemes.
Right-click and choose **Save annotations** to save all schemes and original runs for the current video. The first save starts beside a dragged video when its native handle is available. **Save as** chooses another file. **Export CSV** exports
the current scheme, mapped times and synchronization status. Service drafts are
saved locally; **Save project** adds the edits to the current project. In the standalone HTML, export the project package to keep them.

## Inspect both Probe distributions

Select a behavior clip or drag a neural interval, then open **Interval distribution** for exact counts and Hz. Select a Unit in the neural view, Probe or rate list and open **Unit template distribution**. Both sections can stay open; scroll within the Probe sidebar.
Template markers show channel positions, sized by stored peak-to-peak amplitude. Click a channel or use the channel selector to inspect its waveform on a common amplitude scale. The full channel list retains row indices, available acquisition channel IDs, coordinates and amplitudes.
The plot shows the whole-recording dominant template and its spike count/fraction, independent of the selected interval. Amplitudes use the stored units unless unwhitening or calibration in µV is supplied.
Changing Units preserves interval statistics. Missing templates or unsupported channel layouts show a reason. Allen recordings without multichannel templates still support interval activity.


## Optional model features and local frame example

In **Edit clips → Clips & grouping → Model features / keypoints**, export model-input JSON and import timestamped feature/keypoint JSON to group and review. **Run pixel adapter example (first 30 s)** uses video RGB means to demonstrate the source-integrated model interface. It uses the current grouping settings and requires a local File or browser-project video Blob. Review the proposed groups before confirming them. Save project retains source features, model/input provenance and human edits; cancelling, closing the editor or changing source discards pending output.

## Population dynamics

Open New analysis → Population dynamics. Choose original Unit IDs, a continuous neural start/end and bin width. Compute runs in a cancellable Worker; it fits PCA and prediction models on training bins and compares validation/test error. Select a trajectory point or bin, then Show this bin in signals / video to return to the shared time view. Save analysis in project before exporting a portable project package.
