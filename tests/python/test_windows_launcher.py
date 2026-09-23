"""Windows launch acceptance: temporary catalogs only, no browser or startup tasks."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import unittest
import urllib.request

from test_service import ROOT, _write_fixture


@unittest.skipUnless(sys.platform == "win32", "Windows desktop launcher")
class WindowsLauncherTests(unittest.TestCase):
    def setUp(self):
        (ROOT / "runtime" / "tests").mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix="launcher space-", dir=ROOT / "runtime" / "tests")
        self.root = Path(self.temp.name)
        self.data, self.database = _write_fixture(self.root)
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            self.port = sock.getsockname()[1]
        self.command = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                        str(ROOT / "Start-Explorer.ps1"), "-DataRoot", str(self.data),
                        "-Database", str(self.database), "-Python", sys.executable,
                        "-Port", str(self.port), "-OpenDatabase", "-RequireExistingCatalog", "-NoBrowser"]
        self.environment = {**os.environ, "PYTHONIOENCODING": "utf-8"}

    def run_launcher(self, command=None):
        return subprocess.run(command or self.command, capture_output=True, text=True,
                              encoding="utf-8", errors="replace", timeout=75, env=self.environment)

    def health(self):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/api/health", timeout=5) as response:
            return json.load(response)

    def tearDown(self):
        record = self.database.parent / "logs" / "latest-process.json"
        if record.exists():
            process = json.loads(record.read_text(encoding="utf-8-sig"))
            # Only terminate a process whose command includes this fixture's exact config.
            safe_config = process["config"].replace("'", "''")
            script = (f"$p = Get-CimInstance Win32_Process -Filter 'ProcessId={int(process['pid'])}'; "
                      f"if ($p -and $p.CommandLine.Contains('{safe_config}')) {{ Stop-Process -Id $p.ProcessId }}")
            subprocess.run(["powershell.exe", "-NoProfile", "-Command", script], capture_output=True, timeout=15)
        self.temp.cleanup()

    def test_concurrent_cold_starts_reuse_after_both_parents_exit(self):
        first = subprocess.Popen(self.command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=self.environment)
        second = subprocess.Popen(self.command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=self.environment)
        one, two = first.communicate(timeout=75), second.communicate(timeout=75)
        self.assertEqual(first.returncode, 0, one)
        self.assertEqual(second.returncode, 0, two)
        self.assertEqual(self.health()["dataset"]["dataset_id"], "fixture")
        log_dir = self.database.parent / "logs"
        self.assertEqual(len(list(log_dir.glob("launch-*.json"))), 1)
        before = json.loads((log_dir / "latest-process.json").read_text(encoding="utf-8-sig"))
        again = self.run_launcher()
        self.assertEqual(again.returncode, 0, again.stdout + again.stderr)
        self.assertIn("reusing this project", again.stdout)
        self.assertIn("/?database=1", again.stdout)
        self.assertEqual(before, json.loads((log_dir / "latest-process.json").read_text(encoding="utf-8-sig")))
        self.assertTrue(before["ready"])
        # A different existing catalog on the same port must not replace this process.
        other_data, other_db = _write_fixture(self.root / "other")
        wrong = [str(other_db) if arg == str(self.database) else str(other_data) if arg == str(self.data) else arg for arg in self.command]
        failed = self.run_launcher(wrong)
        self.assertNotEqual(failed.returncode, 0)
        self.assertIn("left running", failed.stdout)
        self.assertEqual(self.health()["status"], "ok")

    def test_missing_catalog_does_not_create_replacement(self):
        missing = self.root / "disconnected drive" / "catalog.sqlite"
        command = [str(missing) if arg == str(self.database) else arg for arg in self.command]
        result = self.run_launcher(command)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("No empty replacement", result.stdout)
        self.assertFalse(missing.parent.exists())

    def test_boot_failure_reports_log_and_retry_instruction(self):
        self.database.write_bytes(b"invalid catalog for startup failure test")
        result = self.run_launcher()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Startup log:", result.stdout)
        self.assertIn("same Explorer shortcut", result.stdout)
        logs = list((self.database.parent / "logs").glob("*.stderr.log"))
        self.assertEqual(len(logs), 1)
        self.assertIn("Traceback", logs[0].read_text(encoding="utf-8"))
