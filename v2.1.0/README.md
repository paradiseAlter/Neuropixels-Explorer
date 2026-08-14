# Neuropixel Data Review v2.1.0

This version extends the direct folder-to-unit review interface with a simple multi-Unit manual comparison view. Older workflow versions remain unchanged.

## Use

Open `index.html` in Chrome, then drag a parent data folder onto the page or choose it with **Open Folder**. The folder may contain one KiloSort recording, multiple KiloSort experiment folders, and optional Legacy Table CSV files anywhere below the selected root.

The application automatically:

- finds folders containing `spike_times.npy`, `spike_clusters.npy`, and `params.py`;
- indexes all recordings without loading every NPY payload;
- reads KiloSort labels, cluster amplitude, contamination, spike position, template, and channel geometry when available;
- detects compatible unit-to-brain-region CSV tables when included in the selected parent folder;
- opens the first good Unit automatically;
- keeps at most two active recordings resident in a background Web Worker.

## Compare Units

- Click a Unit row to open it as the primary Unit.
- Click the **+** button beside another Unit to add it below the primary trace.
- Up to four Units can be open at the same time, including Units from different recordings.
- **TIME LINKED** applies zoom and pan to every open trace for direct comparison.
- Click **TIME LINKED** to switch to **TIME INDEPENDENT**, then each trace keeps its own time window.
- Click a trace to make the shared toolbar control that trace. The colored left edge identifies the active trace.
- Click the **×** at the far right of any open trace to close it. The same action is available at the right edge of the Unit list.
- If the primary trace is closed while comparison traces remain, the first comparison trace becomes the new primary trace automatically.

## Signal display

The primary plot is explicitly a spike-time view, not raw voltage. It opens at a 10-second detail level so individual spike ticks remain clear.

The time-axis interaction follows a MATLAB-style figure model:

- **ZOOM**: drag a rectangle over a time range, or click once to zoom in around the pointer;
- Shift-click or right-click to zoom out around the pointer;
- use the wheel for smooth, small-step cursor-centred zoom down to a 20 ms window;
- **PAN**: drag the current view horizontally;
- **BACK** returns to the previous time view and **RESET** restores the initial 10-second view;
- the full-recording overview remains available for large jumps.

The lower panels show amplitude stability, a ±100 ms autocorrelogram, and the peak-channel KiloSort template.

The KiloSort folders in this project do not contain `continuous.dat`; `params.py` only records an external path. The interface therefore does not claim to show raw voltage.

## Validation

From the project root:

`node neuropixel_workflow/v2.1.0/tests/validate-real-data.cjs`
