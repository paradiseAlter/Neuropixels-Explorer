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
            path = filedialog.askdirectory(parent=root, title="Neuropixels Explorer — Open recording folder")
        else:
            types = {
                "nwb": [("Allen NWB", "*.nwb")],
                "video": [("Behavior video", "*.mp4 *.webm *.mov *.avi *.mkv")],
                "clock": [("Video time mapping", "*.json")],
            }[kind]
            path = filedialog.askopenfilename(parent=root, title="Neuropixels Explorer — " + kind, filetypes=types)
        print(json.dumps({"path": path}, ensure_ascii=True))
    finally:
        root.destroy()


if __name__ == "__main__":
    main()
