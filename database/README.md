# SQLite schema

`migrations/` is the canonical Neuropixels Explorer database schema. It is
versioned with the frontend and optional Python service. The wheel includes a
content-identical package copy under `server/neuropixels_explorer/schema/`; a
portable test prevents the two copies from drifting.

The generated catalog is runtime state and is intentionally ignored. Create or
migrate one with:

```powershell
neuropixels-explorer init-db --database <catalog.sqlite>
```

Migration rules:

1. use the next contiguous three-digit prefix;
2. never rewrite a migration included in a release tag;
3. update `SCHEMA_VERSION` in `server/neuropixels_explorer/migrations.py`;
4. add a portable migration/contract test;
5. keep neural and video payloads out of SQLite BLOB columns.

Migration `003_incremental_ingest.sql` adds audit-only batch/item tables for
supplements. Payload bytes are never stored in those tables. `data_assets`
continues to hold relative paths, sizes, checksum metadata, role, availability,
and provenance for external project files.
