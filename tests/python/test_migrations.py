from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))

from neuropixels_explorer.migrations import (
    SCHEMA_VERSION,
    apply_migrations,
    default_migration_directory,
    initialize_database,
    validate_schema,
)


TEST_RUNTIME = ROOT / "runtime" / "tests"


def _temporary_directory() -> tempfile.TemporaryDirectory[str]:
    TEST_RUNTIME.mkdir(parents=True, exist_ok=True)
    return tempfile.TemporaryDirectory(dir=TEST_RUNTIME)


class MigrationTests(unittest.TestCase):
    def test_packaged_migrations_match_repository_source(self) -> None:
        repository_directory = ROOT / "database" / "migrations"
        packaged_directory = ROOT / "server" / "neuropixels_explorer" / "schema"
        repository_files = sorted(path.name for path in repository_directory.glob("*.sql"))
        packaged_files = sorted(path.name for path in packaged_directory.glob("*.sql"))
        self.assertEqual(packaged_files, repository_files)
        for filename in repository_files:
            self.assertEqual(
                (packaged_directory / filename).read_text(encoding="utf-8").rstrip(),
                (repository_directory / filename).read_text(encoding="utf-8").rstrip(),
            )
        self.assertEqual(default_migration_directory(), repository_directory)

    def test_fresh_database_reaches_the_release_schema(self) -> None:
        with _temporary_directory() as temporary_directory:
            database = Path(temporary_directory) / "catalog.sqlite"
            self.assertEqual(initialize_database(database), [1, 2])
            connection = sqlite3.connect(database)
            try:
                validate_schema(connection)
                rows = connection.execute(
                    "SELECT version, name FROM schema_migrations ORDER BY version"
                ).fetchall()
                self.assertEqual([row[0] for row in rows], [1, 2])
                self.assertEqual(connection.execute("PRAGMA user_version").fetchone()[0], SCHEMA_VERSION)
            finally:
                connection.close()

    def test_migrations_are_repeatable_without_reapplying(self) -> None:
        with _temporary_directory() as temporary_directory:
            database = Path(temporary_directory) / "catalog.sqlite"
            initialize_database(database)
            self.assertEqual(initialize_database(database), [])

    def test_a_failed_migration_rolls_back_only_that_version(self) -> None:
        with _temporary_directory() as temporary_directory:
            root = Path(temporary_directory)
            migrations = root / "migrations"
            migrations.mkdir()
            (migrations / "001_initial.sql").write_text(
                """
                CREATE TABLE schema_migrations(
                    version INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    applied_at_utc TEXT NOT NULL
                );
                PRAGMA user_version = 1;
                """,
                encoding="utf-8",
            )
            (migrations / "002_failure.sql").write_text(
                """
                CREATE TABLE must_roll_back(value INTEGER);
                CREATE TABLE must_roll_back(value INTEGER);
                PRAGMA user_version = 2;
                """,
                encoding="utf-8",
            )
            database = root / "catalog.sqlite"
            connection = sqlite3.connect(database)
            try:
                with self.assertRaises(sqlite3.OperationalError):
                    apply_migrations(connection, migrations)
            finally:
                connection.close()

            connection = sqlite3.connect(database)
            try:
                self.assertEqual(
                    connection.execute("SELECT version FROM schema_migrations").fetchall(),
                    [(1,)],
                )
                self.assertIsNone(
                    connection.execute(
                        "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='must_roll_back'"
                    ).fetchone()
                )
                self.assertEqual(connection.execute("PRAGMA user_version").fetchone()[0], 1)
            finally:
                connection.close()

    def test_schema_never_uses_sqlite_blobs_for_large_payloads(self) -> None:
        with _temporary_directory() as temporary_directory:
            database = Path(temporary_directory) / "catalog.sqlite"
            initialize_database(database)
            connection = sqlite3.connect(database)
            try:
                tables = [
                    row[0]
                    for row in connection.execute(
                        "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
                    )
                ]
                declared_types = {
                    column[2].upper()
                    for table in tables
                    for column in connection.execute(f"PRAGMA table_info('{table}')")
                }
            finally:
                connection.close()
            self.assertNotIn("BLOB", declared_types)


if __name__ == "__main__":
    unittest.main()
