"""Bounded content identity for already selected local videos. No media transfer."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat

CHUNK_BYTES = 1024 * 1024
MAX_VIDEO_BYTES = 512 * 1024 * 1024


def _identity(value):
    return (value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_ctime_ns)


def fingerprint_path(path: Path) -> dict:
    """Match the browser's ordered-chunk algorithm with bounded local reads.

    Empty files have a defined fingerprint for parity, but are not valid videos.
    A disconnected client may leave this one bounded read finishing server-side.
    """
    try:
        before = path.stat()
        if not stat.S_ISREG(before.st_mode):
            raise ValueError("Selected video must be a regular file")
        if before.st_size > MAX_VIDEO_BYTES:
            raise ValueError("Feature exchange supports selected videos up to 512 MiB")
        hashes = []
        with path.open("rb") as handle:
            if _identity(os.fstat(handle.fileno())) != _identity(before):
                raise ValueError("Selected video changed before fingerprinting")
            remaining = before.st_size
            while remaining:
                expected = min(CHUNK_BYTES, remaining)
                chunk = handle.read(expected)
                if len(chunk) != expected:
                    raise ValueError("Selected video was truncated during fingerprinting")
                hashes.append(hashlib.sha256(chunk).hexdigest())
                remaining -= len(chunk)
            if handle.read(1) or _identity(os.fstat(handle.fileno())) != _identity(before):
                raise ValueError("Selected video changed during fingerprinting")
        if _identity(path.stat()) != _identity(before):
            raise ValueError("Selected video changed during fingerprinting")
        descriptor = {"domain": "neuropixels-source/1", "chunkBytes": CHUNK_BYTES,
                      "size": before.st_size, "hashes": hashes}
        digest = hashlib.sha256(json.dumps(descriptor, separators=(",", ":")).encode("utf-8")).hexdigest()
        return {"algorithm": "sha256-ordered-chunks/1", "chunkBytes": CHUNK_BYTES,
                "size": before.st_size, "digest": digest}
    except OSError as error:
        raise ValueError("Selected video is unavailable; select it again") from error
