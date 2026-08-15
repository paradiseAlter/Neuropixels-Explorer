from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


def product_root() -> Path:
    """Return the checked-out product root without relying on the current directory."""
    return Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class RuntimePaths:
    """Runtime-only paths; none of these values are persisted in the repository."""

    data_root: Path
    database_path: Path
    static_root: Path

    @classmethod
    def from_arguments(
        cls,
        *,
        data_root: Path,
        database_path: Path,
        static_root: Path | None = None,
    ) -> "RuntimePaths":
        return cls(
            data_root=data_root.expanduser().resolve(),
            database_path=database_path.expanduser().resolve(),
            static_root=(static_root or product_root()).expanduser().resolve(),
        )

    def validate(self) -> None:
        if not self.data_root.is_dir():
            raise FileNotFoundError(f"Data root does not exist: {self.data_root}")
        if not self.database_path.is_file():
            raise FileNotFoundError(f"Database does not exist: {self.database_path}")
        if not self.static_root.is_dir() or not (self.static_root / "index.html").is_file():
            raise FileNotFoundError(f"Explorer static root is invalid: {self.static_root}")

    def resolve_asset(self, relative_path: str) -> Path:
        candidate = (self.data_root / Path(relative_path)).resolve()
        if not candidate.is_relative_to(self.data_root):
            raise ValueError(f"Asset path escapes the configured data root: {relative_path}")
        return candidate
