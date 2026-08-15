from __future__ import annotations

import argparse
import json
import sqlite3
import webbrowser
from pathlib import Path

from .migrations import SCHEMA_VERSION, initialize_database, validate_schema
from .paths import RuntimePaths, product_root
from .service import create_server


def _database_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--database",
        required=True,
        type=Path,
        help="Path to a generated SQLite catalog. The file is runtime state and is not versioned.",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="neuropixels-explorer",
        description="Manage the optional Neuropixels Explorer indexed data service.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    initialize = subparsers.add_parser(
        "init-db",
        help="Create a new empty catalog or apply pending schema migrations.",
    )
    _database_argument(initialize)

    validate = subparsers.add_parser(
        "validate-db",
        help="Check migration identity, SQLite integrity, and foreign keys.",
    )
    _database_argument(validate)

    serve = subparsers.add_parser(
        "serve",
        help="Serve the Explorer UI, indexed API, and transactional supplement endpoint.",
    )
    _database_argument(serve)
    serve.add_argument(
        "--data-root",
        required=True,
        type=Path,
        help="Runtime root used to resolve project-relative asset paths from the catalog.",
    )
    serve.add_argument(
        "--static-root",
        type=Path,
        default=product_root(),
        help="Explorer web root; defaults to this checkout.",
    )
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", default=8765, type=int)
    serve.add_argument("--open-browser", action="store_true")
    serve.add_argument("--quiet", action="store_true")
    return parser


def _validate_database(path: Path) -> dict[str, object]:
    database_path = path.expanduser().resolve()
    if not database_path.is_file():
        raise FileNotFoundError(f"Database does not exist: {database_path}")
    connection = sqlite3.connect(f"file:{database_path.as_posix()}?mode=ro", uri=True)
    try:
        validate_schema(connection)
        return {
            "database": str(database_path),
            "schemaVersion": SCHEMA_VERSION,
            "integrity": "ok",
            "foreignKeyViolations": 0,
        }
    finally:
        connection.close()


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "init-db":
        applied = initialize_database(args.database)
        print(json.dumps({"schemaVersion": SCHEMA_VERSION, "appliedMigrations": applied}, indent=2))
        return 0
    if args.command == "validate-db":
        print(json.dumps(_validate_database(args.database), indent=2))
        return 0

    paths = RuntimePaths.from_arguments(
        data_root=args.data_root,
        database_path=args.database,
        static_root=args.static_root,
    )
    server = create_server(paths, host=args.host, port=args.port, quiet=args.quiet)
    host_for_url = "127.0.0.1" if args.host in {"0.0.0.0", "::"} else args.host
    url = f"http://{host_for_url}:{server.server_port}/?database=1"
    print(f"Neuropixels Explorer: {url}")
    print("Press Ctrl+C to stop the local service.")
    if args.open_browser:
        webbrowser.open(url)
    try:
        server.serve_forever(poll_interval=0.2)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
