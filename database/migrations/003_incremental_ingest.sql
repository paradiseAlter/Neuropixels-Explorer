PRAGMA foreign_keys = ON;

CREATE TABLE incremental_ingest_batches (
    batch_id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
    started_at_utc TEXT NOT NULL,
    completed_at_utc TEXT NOT NULL,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('files', 'folder', 'api')),
    status TEXT NOT NULL CHECK (status = 'completed'),
    item_count INTEGER NOT NULL CHECK (item_count >= 0),
    affected_recordings_json TEXT NOT NULL DEFAULT '[]',
    metadata_json TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE TABLE incremental_ingest_items (
    incremental_ingest_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL REFERENCES incremental_ingest_batches(batch_id) ON DELETE CASCADE,
    recording_id TEXT NOT NULL REFERENCES recordings(recording_id) ON DELETE CASCADE,
    data_asset_id INTEGER NOT NULL REFERENCES data_assets(asset_id) ON DELETE RESTRICT,
    asset_role TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    source_relative_path TEXT,
    byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
    checksum_sha256 TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('inserted', 'completed_missing', 'duplicate')),
    source_kind TEXT NOT NULL CHECK (source_kind IN ('files', 'folder', 'api')),
    metadata_json TEXT NOT NULL DEFAULT '{}',
    UNIQUE (batch_id, recording_id, asset_role, source_filename)
) STRICT;

CREATE INDEX idx_incremental_ingest_batches_dataset
ON incremental_ingest_batches(dataset_id, completed_at_utc);

CREATE INDEX idx_incremental_ingest_items_recording_role
ON incremental_ingest_items(recording_id, asset_role, batch_id);

UPDATE datasets SET schema_version = 3;

PRAGMA user_version = 3;
