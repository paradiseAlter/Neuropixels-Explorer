"""Native selection for the loopback desktop service (no source paths in URLs)."""
from __future__ import annotations

import json
import sys


def main() -> None:
    import tkinter as tk
    from tkinter import filedialog
    kind = sys.argv[1]
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    try:
        if kind == "folder":
            path = filedialog.askdirectory(parent=root, title="Neuropixels Explorer — Select Kilosort results folder")
        elif kind == "save-project":
            path = filedialog.asksaveasfilename(parent=root, title="Neuropixels Explorer — Save project", defaultextension=".neuroproject.json", initialfile="Experiment.neuroproject.json", filetypes=[("Explorer project", "*.neuroproject.json")])
        else:
            title, types = {
                "open-project": ("Open project", [("Explorer project", "*.neuroproject.json")]),
                "nwb": ("Select Allen ecephys NWB", [("Allen ecephys NWB", "*.nwb")]),
                "video": ("Select behavior video", [("Behavior video", "*.mp4 *.webm *.mov *.avi *.mkv")]),
                "clock": ("Select video frame clock", [("Allen video frame clock", "*.json")]),
            }[kind]
            path = filedialog.askopenfilename(parent=root, title="Neuropixels Explorer — " + title, filetypes=types)
        print(json.dumps({"path": path}, ensure_ascii=True))
    finally:
        root.destroy()


if __name__ == "__main__":
    main()
