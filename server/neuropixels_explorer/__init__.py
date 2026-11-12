"""Optional indexed data service for Neuropixels Explorer."""

from .migrations import SCHEMA_VERSION, apply_migrations, validate_schema

__all__ = [
    "CatalogService",
    "SCHEMA_VERSION",
    "apply_migrations",
    "create_server",
    "validate_schema",
]

__version__ = "4.15.1b1"


def __getattr__(name: str):
    """Keep migration tooling usable before the optional NumPy runtime is installed."""
    if name in {"CatalogService", "create_server"}:
        from .service import CatalogService, create_server

        return {"CatalogService": CatalogService, "create_server": create_server}[name]
    raise AttributeError(name)
