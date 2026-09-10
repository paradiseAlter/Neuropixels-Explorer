from __future__ import annotations

from dataclasses import dataclass
import json
import re
from pathlib import Path

from .activity_cache import default_activity_cache_root


def product_root() -> Path:
    """Return the checked-out product root without relying on the current directory."""
    return Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class RuntimePaths:
    """Runtime-only paths; none of these values are persisted in the repository."""

    data_root: Path
    database_path: Path
    static_root: Path
    cache_root: Path

    @classmethod
    def from_arguments(
        cls,
        *,
        data_root: Path,
        database_path: Path,
        static_root: Path | None = None,
        cache_root: Path | None = None,
    ) -> "RuntimePaths":
        return cls(
            data_root=data_root.expanduser().resolve(),
            database_path=database_path.expanduser().resolve(),
            static_root=(static_root or product_root()).expanduser().resolve(),
            cache_root=(cache_root or default_activity_cache_root()).expanduser().resolve(),
        )

    def validate(self) -> None:
        if not self.data_root.is_dir():
            raise FileNotFoundError(f"Data root does not exist: {self.data_root}")
        if not self.database_path.is_file():
            raise FileNotFoundError(f"Database does not exist: {self.database_path}")
        if not self.static_root.is_dir() or not (self.static_root / "index.html").is_file():
            raise FileNotFoundError(f"Explorer static root is invalid: {self.static_root}")

    def resolve_asset(self, relative_path: str) -> Path:
        if relative_path.startswith("@local/"):
            token = relative_path.removeprefix("@local/")
            if not re.fullmatch(r"[0-9a-f]{32}", token):
                raise ValueError("Invalid selected-file token")
            registry = json.loads((self.data_root / ".explorer-local.json").read_text(encoding="utf-8"))
            grant = registry["assets"].get(token)
            if not grant:
                raise ValueError("File was not selected in this project")
            path = Path(grant["path"]).resolve(strict=True)
            stat = path.stat()
            if stat.st_size != grant["size"] or stat.st_mtime_ns != grant["mtime_ns"]:
                raise ValueError("A linked source has changed. Open it again to review the new version: " + path.name)
            return path
        candidate = (self.data_root / Path(relative_path)).resolve()
        if not candidate.is_relative_to(self.data_root):
            raise ValueError(f"Asset path escapes the configured data root: {relative_path}")
        return candidate
