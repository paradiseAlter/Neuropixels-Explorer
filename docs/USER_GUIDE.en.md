# Neuropixels Explorer User Guide

## 1. Purpose and scientific boundary

Neuropixels Explorer is a local-first review interface for KiloSort outputs. It helps students and researchers inspect Units, spike timing, firing-rate patterns, KiloSort templates, physical Probe positions, and optional brain-region annotations without uploading research data.

The Explorer is a review tool, not an automatic biological decision system. A quality label, ISI violation, contamination estimate, waveform, or anatomical label should be interpreted with the recording protocol and other evidence. KiloSort supplies spike and geometry data; brain-region labels come from a separate Legacy Table or compatible mapping CSV and are never inferred when absent.

## 2. Open data

Select **Open Folder** or drag a complete project/session folder onto the start screen. The folder may contain several KiloSort recording directories. The application indexes all candidate recordings, but large NPY arrays are read only when a Unit is opened.

Use **Data status** after loading. It separates:

- **Available**: core inputs detected in the loaded recordings.
- **Missing**: core inputs absent from at least one recording.
- **Invalid**: candidate recordings that failed structural checks.
- **Optional**: brain-region annotations and Probe-region tracks.
- **Streams / Extensions**: synchronized video availability and the future Raw Voltage provider state.

For every missing core input, Data status names the affected Recording and the
exact expected filename. Choose **Add files** for one or more individual files,
or **Add folder** for a Recording folder. The Explorer rejects files from a
different Recording, conflicting replacements, duplicate candidates, and NPY
arrays with incompatible shapes. A failed supplement changes neither the
catalog nor its managed files. A successful supplement refreshes only affected
Recordings and preserves open Units, the focused Unit, time windows, navigation
history, and the three-column layout.

File names and KiloSort field names, such as `spike_times.npy`, `channel_shanks.npy`, and `depth_um`, remain unchanged in every interface language.

## 3. Select and compare Units

Choose a Recording from the horizontal strip, then use the Unit list:

- **Click**: open only that Unit and replace the current signals.
- **Ctrl + click**: add the Unit without removing open signals.
- **Right-click**: open a menu with **Open only**, **Add to current view**, **Remove from view**, and **Locate on Probe**.
- **Arrow Up / Arrow Down**: move keyboard focus through the Unit list.

Click any open signal to make it the focused Unit. The left list scrolls to and highlights it; the Probe Inspector and lower detail plots follow the same focus. Up to ten Units can be open at once.

`Good`, `MUA`, and other values in the list are KiloSort or curation labels. They do not by themselves establish cell type, recording validity, or biological significance.

## 4. Read the signal workspace

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
**Attach local video** to choose another file, or **Generate validation video**
when protected laboratory video is unavailable. The generated mouse-arena
stream is deterministic: it exposes exact 30 Hz frame numbers and a visible
sync pulse every five seconds.

Play, pause, seek, change speed, or step one frame at a time. **Follow signal**
keeps the current neural time inside the visible Unit window. The green Video
playhead is drawn at the same neural time on every open Unit. Clicking a neural
plot in Cursor mode performs the reverse operation and seeks the video.

The mapping badge distinguishes a verified frame clock from an unverified
manual offset. Changing **Offset (s)** intentionally changes the badge to
**Unverified · Manual offset**. A real experiment should use frame timestamps,
TTL events, or a documented clock fit before the mapping is called verified.

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

Probe interactions use the same selection rules as the left list: click opens only, Ctrl-click adds, and right-click opens the shared Unit menu. Nearby Units are listed relative to the locked Probe position; spatial distance does not itself imply functional similarity.

For the current acquisition, `channel_shanks.npy` identifies four shanks on one physical Probe. The Inspector therefore shows one expandable **Probe 1** group containing **Shank 1–4**; it never labels those shanks as four separate physical Probes. A future multi-Probe dataset will require an explicit physical-Probe identity in addition to its shank identity.

## 7. Brain-region mapping

KiloSort output does not contain a reliable brain-region identity. Optional anatomical annotations must be supplied separately. A compatible depth mapping uses at least:

- `probe` or `shank`
- `depth_um`
- `region`

Recommended fields include `electrode`, `atlas_id`, `color`, and `recording_id` for session-specific tracks. Brain-region abbreviations such as `MPN` and KiloSort field names are shown exactly as provided and are not translated.

The current mapping is electrode/depth-level metadata. It is not a registered three-dimensional Allen CCF trajectory unless full atlas coordinates and registration provenance are supplied.

## 8. Layout, themes, language, and keyboard use

Drag the left splitter to resize the Unit list and signal workspace. The Probe Inspector keeps a deliberate fixed width because horizontal expansion does not improve depth resolution. Drag the horizontal handle below the Probe diagram to change its height; with keyboard focus, use Up/Down arrows, Shift + Up/Down for larger changes, and Home to reset. On a narrow screen, side panels can still be collapsed with the chevron buttons.

Themes include Dark, Light, High Contrast, and System. The theme affects the HTML interface, signal Canvas, Probe bands, grids, selections, and Unit colors. Language and theme choices are saved on the current device.

The Explorer supports English, Simplified Chinese, and Spanish. Changing language updates the interface, question-mark explanations, and this Help drawer. File names, brain-region abbreviations, and KiloSort field names remain unchanged.

Use **Tab** and **Shift + Tab** to move through controls. Press **Enter** or **Space** to activate buttons. Press **Esc** to close Help, menus, data status, or a locked Probe selection when applicable.

## 9. Privacy and performance

In folder mode, selected files stay on the local computer. The browser indexes the folder and sends only the selected Unit result to the interface after background processing. A database mode can query a separately operated local service, but that service is optional and is not needed for direct `file://` use.

The Help documentation is stored as Markdown in this repository and precompiled into a local JavaScript asset for release. The Help drawer does not use a CDN, remote Markdown renderer, or network request, so it also works when `index.html` is opened directly.

## 10. Troubleshooting

- **No recordings found**: confirm each candidate contains `spike_times.npy`, `spike_clusters.npy`, and `params.py`.
- **A plot is unavailable**: open Data status and check whether its source file is missing.
- **Brain region is unmapped**: confirm a compatible Legacy Table or depth mapping was included and uses the correct Recording/Unit identifiers.
- **Raw voltage is unavailable**: KiloSort output folders often reference an external `continuous.dat`; the Explorer exposes a versioned provider/reader extension port but registers no Raw Voltage implementation and never labels spike timing as voltage.
- **No laboratory video is available**: use **Generate validation video** to test playback and exact alignment without creating or copying protected data.
- **Navigation changes the wrong trace**: check whether time is Linked or Independent and which signal is focused.
