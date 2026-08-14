# Neuropixels Explorer v3.0.0

This version starts the Neuropixels Explorer product line. It keeps the validated v2.3 signal-review engine, but makes direct HTML5 folder access the default and treats the local database service as optional acceleration.

## Open

Open `index.html` in Chrome, then drop or choose a complete session folder. No localhost service is required.

Optional database mode remains available for the indexed project data:

```powershell
python scripts\run_data_server.py
```

Then open the printed URL with `?database=1`.

## Explorer contract

- The complete folder is indexed, but large NPY arrays are loaded lazily for the active Recording in a background Web Worker.
- KiloSort remains the spike and template source.
- Legacy Table CSV files remain the separate brain-region source.
- `channel_shanks.npy` and `channel_geometry.csv` source groups are interpreted as independent physical Probes, following the confirmed acquisition hardware meaning.
- A Recording with four source groups displays four independent Probe columns; a Recording with one source group displays one and does not invent three missing Probes.
- Selecting a Unit highlights its physical Probe position.
- Clicking a Probe Unit marker opens the linked signal.
- Clicking empty Probe space returns the nearest Unit candidates by depth on that Probe.
- Up to ten Unit signals can be compared with linked or independent time axes.

The viewer does not infer a continuous atlas trajectory from Unit-level Legacy Table labels. A full brain path still requires channel-to-atlas or Probe-trajectory registration.

## Future video boundary

The folder index recognizes common video extensions and exposes a VIDEO capability state. A future player must use an explicit neural-to-video `TimeMapping`; video playback is not yet presented as synchronized experimental data.

## Validation

From the project root:

```powershell
node neuropixel_workflow\v3.0.0\tests\validate-real-data.cjs
python -m unittest discover -s tests -v
```

Older versions remain unchanged under their versioned directories.
