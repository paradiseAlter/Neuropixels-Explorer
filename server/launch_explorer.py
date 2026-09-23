"""On-demand Windows bootstrap, independent of a terminal environment."""
from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import traceback
from datetime import datetime, timezone


def main(config_path: str) -> int:
    config = json.loads(Path(config_path).read_text(encoding="utf-8-sig"))
    # WMI does not inherit the launcher's PYTHONPATH or console pipes.
    sys.stdout = open(config["stdout"], "a", encoding="utf-8", buffering=1)
    sys.stderr = open(config["stderr"], "a", encoding="utf-8", buffering=1)
    try:
        print(f"Explorer process {os.getpid()} started {datetime.now(timezone.utc).isoformat()}")
        app_root = Path(config["staticRoot"]).resolve()
        sys.path.insert(0, str(app_root / "runtime" / "allen-dependencies"))
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from neuropixels_explorer.cli import main as serve
        return serve([
            "serve", "--database", config["database"], "--data-root", config["dataRoot"],
            "--static-root", str(app_root), "--cache-root", config["cacheRoot"],
            "--host", "127.0.0.1", "--port", str(config["port"]), "--quiet",
        ])
    except Exception:
        traceback.print_exc()
        return 1
    finally:
        print(f"Explorer process {os.getpid()} stopped {datetime.now(timezone.utc).isoformat()}")
        sys.stdout.flush()
        sys.stderr.flush()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1]))
