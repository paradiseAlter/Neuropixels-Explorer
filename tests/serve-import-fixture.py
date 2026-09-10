"""Browser acceptance harness: native picker seam, real import/media service.

The seam lives only in this test process. Production exposes no path picker API.
Optional ALLEN_IMPORT_TEST_NWB / ALLEN_IMPORT_TEST_VIDEO point to public local data.
"""
from pathlib import Path
import os
import sys
import tempfile
import json
ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "server"), str(ROOT / "tests/python")]
from test_local_projects import write_nwb, write_kilosort
from neuropixels_explorer.migrations import initialize_database
from neuropixels_explorer.paths import RuntimePaths
from neuropixels_explorer.service import create_server

root = ROOT / "runtime" / "beta3-import"
root.mkdir(parents=True, exist_ok=True)
source = root / "source.nwb"
if not source.exists(): write_nwb(source)
folder = root / "Kilosort results"
if not folder.exists(): write_kilosort(folder)
data = root / "managed"
data.mkdir(exist_ok=True)
database = data / "catalog.sqlite"
initialize_database(database)
paths = RuntimePaths.from_arguments(data_root=data, database_path=database, static_root=ROOT, cache_root=data / "cache")
server = create_server(paths, host="127.0.0.1", port=8793, quiet=True)
selected = {"nwb": Path(os.environ.get("ALLEN_IMPORT_TEST_NWB", str(source))), "folder": folder,
            "video": Path(os.environ["ALLEN_IMPORT_TEST_VIDEO"]),
            "clock": Path(os.environ["ALLEN_IMPORT_TEST_CLOCK"]) if os.environ.get("ALLEN_IMPORT_TEST_CLOCK") else None}
server.service.local_projects.picker = lambda kind: selected[kind]
print(json.dumps({"port":server.server_port,"source":str(selected["nwb"])}), flush=True)
server.serve_forever()
