# Product repository boundary

This document defines what a Neuropixels Explorer release tag represents. The
rule begins with the v3.3 development line.

## Included release source

- the HTML, CSS, and JavaScript Explorer;
- the browser database adapter and public API response contract;
- the reusable Python data service and CLI;
- every ordered SQLite migration;
- portable synthetic tests and repository-boundary checks;
- user, data-contract, architecture, and release documentation.

These files are reviewed and versioned together. A v3.3.0 tag therefore names
one compatible frontend, service implementation, and database schema.

## Excluded runtime and research state

- private KiloSort, raw voltage, behavior, image, and video data;
- generated `.sqlite`, `.sqlite3`, `.db`, WAL, SHM, and journal files;
- analysis reports, figures, tables, caches, and other artifacts;
- logs, secrets, local environment files, and machine-specific configuration;
- absolute paths that identify a user account, workstation, or protected data
  location.

Exclusion is both a privacy rule and a reproducibility rule. Generated state
must be reproducible from a tagged schema plus explicitly supplied data; a tag
must not silently depend on one workstation.

## Storage and path contract

SQLite stores searchable metadata, provenance, relative asset locations, and
future signal/video synchronization contracts. It does not store large neural
or media payloads as BLOBs. An asset registered as
`project://recordings/session/spike_times.npy` is resolved relative to the
runtime `--data-root` supplied when the service starts.

The runtime root is validated, and each resolved asset must remain beneath it.
Paths are arguments, not source-code constants or committed local config. A
portable deployment can move the data tree and supply a different root without
rewriting the database or frontend.

## Migration contract

Migration files use contiguous three-digit prefixes and are append-only after a
release. `PRAGMA user_version`, the `schema_migrations` table, and the service
constant must agree. The service refuses a catalog whose migration identity is
missing, renamed, behind, or ahead of the checked-out release.

Never edit an already released migration. Add the next migration and tests.
Data-source-specific importers may remain in protected research workspaces, but
they must initialize their catalog from these migrations and pass:

```powershell
neuropixels-explorer validate-db --database <catalog.sqlite>
```

## Release boundary check

Before merging or tagging:

```powershell
python -m unittest discover -s tests\python
git status --short
```

The test suite checks migration identity and repeatability, schema integrity,
the frontend/API contract, runtime path containment, the absence of database
BLOB columns, the absence of generated/private payloads in the tracked tree,
and `.gitignore` behavior for representative runtime files.
