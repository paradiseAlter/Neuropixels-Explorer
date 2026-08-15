from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from .paths import product_root


SCHEMA_VERSION = 3


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def default_migration_directory() -> Path:
    checkout_directory = product_root() / "database" / "migrations"
    if checkout_directory.is_dir():
        return checkout_directory
    return Path(__file__).with_name("schema")


def migration_files(migration_directory: Path | None = None) -> list[tuple[int, Path]]:
    directory = (migration_directory or default_migration_directory()).resolve()
    files: list[tuple[int, Path]] = []
    for path in sorted(directory.glob("[0-9][0-9][0-9]_*.sql")):
        files.append((int(path.name.split("_", 1)[0]), path))
    if not files:
        raise FileNotFoundError(f"No database migrations found in {directory}")
    versions = [version for version, _ in files]
    if versions != list(range(1, max(versions) + 1)):
        raise RuntimeError(f"Migration versions must be contiguous from 1: {versions}")
    if versions[-1] != SCHEMA_VERSION:
        raise RuntimeError(
            f"Code expects schema {SCHEMA_VERSION}, but migration files end at {versions[-1]}"
        )
    return files


def _applied_versions(connection: sqlite3.Connection) -> dict[int, str]:
    table = connection.execute(
        "SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'schema_migrations'"
    ).fetchone()
    if table is None:
        return {}
    return {
        int(row[0]): str(row[1])
        for row in connection.execute("SELECT version, name FROM schema_migrations ORDER BY version")
    }


def apply_migrations(
    connection: sqlite3.Connection,
    migration_directory: Path | None = None,
) -> list[int]:
    """Apply pending schema migrations and return the versions applied this call."""
    connection.execute("PRAGMA foreign_keys = ON")
    files = migration_files(migration_directory)
    applied = _applied_versions(connection)
    unknown = sorted(set(applied).difference(version for version, _ in files))
    if unknown:
        raise RuntimeError(f"Database contains migrations unknown to this release: {unknown}")

    applied_now: list[int] = []
    for version, path in files:
        if version in applied:
            if applied[version] != path.name:
                raise RuntimeError(
                    f"Migration {version} name mismatch: database={applied[version]!r}, code={path.name!r}"
                )
            continue
        migration_name = path.name.replace("'", "''")
        applied_at = _utc_now().replace("'", "''")
        script = (
            "BEGIN IMMEDIATE;\n"
            f"{path.read_text(encoding='utf-8')}\n"
            "INSERT INTO schema_migrations(version, name, applied_at_utc) "
            f"VALUES ({version}, '{migration_name}', '{applied_at}');\n"
            "COMMIT;\n"
        )
        try:
            connection.executescript(script)
        except Exception:
            if connection.in_transaction:
                connection.rollback()
            raise
        applied_now.append(version)

    validate_schema(connection, migration_directory)
    return applied_now


def validate_schema(
    connection: sqlite3.Connection,
    migration_directory: Path | None = None,
) -> None:
    files = migration_files(migration_directory)
    expected = {version: path.name for version, path in files}
    applied = _applied_versions(connection)
    if applied != expected:
        raise RuntimeError(f"Schema migration mismatch: expected {expected}, found {applied}")
    user_version = int(connection.execute("PRAGMA user_version").fetchone()[0])
    if user_version != SCHEMA_VERSION:
        raise RuntimeError(
            f"SQLite user_version is {user_version}; Explorer requires {SCHEMA_VERSION}"
        )
    integrity = str(connection.execute("PRAGMA quick_check").fetchone()[0])
    if integrity != "ok":
        raise RuntimeError(f"SQLite quick_check failed: {integrity}")
    violations = connection.execute("PRAGMA foreign_key_check").fetchall()
    if violations:
        raise RuntimeError(f"SQLite foreign-key check failed: {violations[:5]}")


def initialize_database(path: Path, migration_directory: Path | None = None) -> list[int]:
    destination = path.expanduser().resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(destination)
    try:
        return apply_migrations(connection, migration_directory)
    finally:
        connection.close()
