import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))


@unittest.skipUnless(importlib.util.find_spec("requests"), "Install optional allen dependencies")
class AllenDownloadTests(unittest.TestCase):
    def test_partial_range_resume_and_primary_hash(self):
        from download_allen_dataset import download_file
        import requests
        content = bytes(range(256)) * 100
        calls = []

        class Response:
            status_code = 206

            def __init__(self, start, end):
                self.data = content[start:end + 1]
                self.drop_after_complete = start == 2000
                self.headers = {"Content-Range": f"bytes {start}-{end}/{len(content)}"}

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def raise_for_status(self):
                pass

            def iter_content(self, _):
                yield self.data
                if self.drop_after_complete:
                    raise requests.ConnectionError("Stream closed after the full range arrived")

        class Session:
            def get(self, url, headers, **kwargs):
                start, end = map(int, headers["Range"].split("=")[1].split("-"))
                calls.append((start, end, headers.get("If-Match")))
                return Response(start, end)

        with tempfile.TemporaryDirectory(dir=ROOT / "runtime") as temporary:
            root = Path(temporary).resolve()
            item = {"url": "https://allen-brain-observatory.s3.amazonaws.com/test.bin", "path": "sample.bin",
                    "size": len(content), "etag": '"' + hashlib.md5(content).hexdigest() + '"',
                    "blake2b": hashlib.blake2b(content).hexdigest()}
            staging = root / "sample.bin.parts"
            staging.mkdir()
            (staging / "source.json").write_text(json.dumps({"identity": {key: item.get(key) for key in ("url", "size", "etag", "blake2b")}, "chunk_size": 8192}))
            (staging / "000000.part").write_bytes(content[:2000])
            with patch("download_allen_dataset.requests.Session", Session):
                result = download_file(item, root, 2, 8192)
            self.assertEqual((root / "sample.bin").read_bytes(), content)
            self.assertTrue(result["upstream_blake2b_verified"])
            self.assertTrue(result["upstream_etag_md5_verified"])
            self.assertIn((2000, 8191, item["etag"]), calls)
            self.assertFalse(staging.exists())
            self.assertEqual(download_file(item, root, 2, 8192)["status"], "previously_verified")

    def test_source_paths_and_object_versions_are_not_silently_reused(self):
        from download_allen_dataset import contained, download_file
        with tempfile.TemporaryDirectory(dir=ROOT / "runtime") as temporary:
            root = Path(temporary).resolve()
            with self.assertRaisesRegex(ValueError, "escapes"):
                contained(root, "../elsewhere.bin")
            staging = root / "sample.bin.parts"
            staging.mkdir()
            (staging / "source.json").write_text('{}')
            with self.assertRaisesRegex(ValueError, "another object version"):
                download_file({"url": "https://allen-brain-observatory.s3.amazonaws.com/test.bin", "path": "sample.bin", "size": 10}, root, 1, 8192)


if __name__ == "__main__":
    unittest.main()
