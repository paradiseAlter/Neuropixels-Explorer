# SPDX-License-Identifier: MIT
"""Write a tiny HDF5 adapter fixture, not a scientifically validated NWB file.

Developer-only fixture generation. Usage: python this_script.py output.nwb
Requires an existing h5py/numpy environment; the application needs neither.
"""
import sys
from pathlib import Path

import h5py
import numpy as np

output = Path(sys.argv[1])
with h5py.File(output, "w") as f:
    f["identifier"] = "synthetic-coverage-contract"
    electrodes = f.create_group("general/extracellular_ephys/electrodes")
    for key, value in {"id": [101, 102, 103], "probe_id": [5, 7, 5],
                       "probe_horizontal_position": [0., 10., 20.],
                       "probe_vertical_position": [100., 200., 300.]}.items():
        electrodes[key] = value
    electrodes["location"] = np.array(["VISp"] * 3, dtype=h5py.string_dtype())
    f["general/institution"] = "Allen Institute for Brain Science"
    for name, probe_id in [("probeC", 5), ("probeD", 7)]:
        device = f.create_group("general/devices/" + name)
        device.attrs["probe_id"] = probe_id
        device.attrs["sampling_rate"] = 30000.
    units = f.create_group("units")
    for key, value in {"id": [7, 9, 11], "peak_channel_id": [101, 102, 103],
                       "spike_times_index": [2, 4, 6],
                       "spike_times": [1., 4., 1.5, 3.5, 1.8, 4.3],
                       "obs_intervals": [[0., 2.], [3., 6.], [0., 10.], [1., 5.]],
                       "obs_intervals_index": [2, 3, 4]}.items():
        units[key] = value
    units["quality"] = np.array(["good"] * 3, dtype=h5py.string_dtype())
    invalid = f.create_group("intervals/invalid_times")
    invalid["id"] = [1, 2]
    invalid["start_time"] = [2., 4.]
    invalid["stop_time"] = [3., 4.5]
    invalid["tags"] = np.array(["EcephysProbe", "5", "probeC", "EcephysSession", "42", "stimulus"], dtype=h5py.string_dtype())
    invalid["tags_index"] = [3, 6]
print(f"{output}: {output.stat().st_size} bytes")
