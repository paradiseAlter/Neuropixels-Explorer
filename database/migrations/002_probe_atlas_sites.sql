PRAGMA foreign_keys = ON;

CREATE TABLE probe_atlas_sites (
    probe_atlas_site_id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
    source_group_id INTEGER NOT NULL CHECK (source_group_id >= 0),
    electrode_index INTEGER NOT NULL CHECK (electrode_index >= 0),
    local_index INTEGER,
    row_index INTEGER,
    depth_um REAL NOT NULL CHECK (depth_um >= 0),
    brain_region_id TEXT NOT NULL REFERENCES brain_regions(brain_region_id) ON DELETE RESTRICT,
    atlas_structure_id INTEGER,
    coordinate_system TEXT NOT NULL,
    mapping_source TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    UNIQUE (dataset_id, electrode_index)
) STRICT;

CREATE INDEX idx_probe_atlas_sites_probe_depth
ON probe_atlas_sites(dataset_id, source_group_id, depth_um);

CREATE INDEX idx_probe_atlas_sites_region
ON probe_atlas_sites(brain_region_id, dataset_id);

PRAGMA user_version = 2;
