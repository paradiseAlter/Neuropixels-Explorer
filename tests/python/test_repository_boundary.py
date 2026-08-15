from __future__ import annotations

import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _git(*arguments: str) -> str:
    return subprocess.run(
        ["git", *arguments],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    ).stdout


class RepositoryBoundaryTests(unittest.TestCase):
    def test_tracked_tree_contains_no_generated_or_private_payloads(self) -> None:
        tracked = [Path(line) for line in _git("ls-files").splitlines() if line]
        forbidden_suffixes = {
            ".sqlite", ".sqlite3", ".db", ".db-wal", ".db-shm", ".db-journal"
        }
        forbidden_roots = {"data", "datasets", "recordings", "private", "reports", "artifacts"}
        offenders = [
            path.as_posix()
            for path in tracked
            if path.suffix.lower() in forbidden_suffixes or path.parts[0].lower() in forbidden_roots
        ]
        self.assertEqual(offenders, [])

    def test_tracked_text_contains_no_known_machine_specific_roots(self) -> None:
        private_root = re.compile(r"(?i)(?:C:\\Users\\[A-Za-z0-9._-]+|D:\\Projects\\neuropixel)")
        offenders: list[str] = []
        for relative in _git("ls-files").splitlines():
            path = ROOT / relative
            if not path.is_file() or path.stat().st_size > 2_000_000:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            if private_root.search(text):
                offenders.append(relative)
        self.assertEqual(offenders, [])

    def test_runtime_outputs_are_ignored(self) -> None:
        candidates = [
            "data/private-session/spike_times.npy",
            "datasets/session-01/recording.bin",
            "recordings/session-01/video.mp4",
            "reports/analysis.html",
            "artifacts/figure.png",
            "runtime/catalog.sqlite",
            "runtime/catalog.sqlite-wal",
            "config/local.json",
            ".env",
        ]
        not_ignored = []
        for candidate in candidates:
            result = subprocess.run(
                ["git", "check-ignore", "--quiet", "--no-index", candidate],
                cwd=ROOT,
                capture_output=True,
                check=False,
            )
            if result.returncode != 0:
                not_ignored.append(candidate)
        self.assertEqual(not_ignored, [])


if __name__ == "__main__":
    unittest.main()
