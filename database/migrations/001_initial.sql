PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at_utc TEXT NOT NULL
) STRICT;

CREATE TABLE datasets (
    dataset_id TEXT PRIMARY KEY,
    dataset_name TEXT NOT NULL,
    description TEXT,
    source_data_origin TEXT NOT NULL,
    import_status TEXT NOT NULL CHECK (import_status IN ('importing', 'ready', 'ready_with_warnings', 'failed')),
    storage_policy TEXT NOT NULL CHECK (storage_policy IN ('register_in_place', 'managed_copy')),
    schema_version INTEGER NOT NULL,
    created_at_utc TEXT NOT NULL,
    updated_at_utc TEXT NOT NULL
) STRICT;

CREATE TABLE ingest_runs (
    ingest_run_id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
    started_at_utc TEXT NOT NULL,
    completed_at_utc TEXT,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'completed_with_warnings', 'failed')),
    importer_version TEXT NOT NULL,
    source_root_uri TEXT NOT NULL,
    recording_count INTEGER NOT NULL DEFAULT 0 CHECK (recording_count >= 0),
    unit_count INTEGER NOT NULL DEFAULT 0 CHECK (unit_count >= 0),
    asset_count INTEGER NOT NULL DEFAULT 0 CHECK (asset_count >= 0),
    warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
    error_message TEXT
) STRICT;

CREATE TABLE recordings (
    recording_id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
    recording_index INTEGER NOT NULL CHECK (recording_index > 0),
    legacy_kilosort_folder TEXT NOT NULL,
    source_data_origin TEXT NOT NULL,
    source_processing_stage TEXT NOT NULL,
    student_modified_source_data INTEGER NOT NULL CHECK (student_modified_source_data IN (0, 1)),
    source_acquisition_id TEXT,
    declared_source_dat_uri TEXT,
    sample_rate_hz REAL NOT NULL CHECK (sample_rate_hz > 0),
    recording_duration_s REAL CHECK (recording_duration_s >= 0),
    spike_count INTEGER NOT NULL CHECK (spike_count >= 0),
    cluster_count INTEGER NOT NULL CHECK (cluster_count >= 0),
    good_unit_count INTEGER NOT NULL CHECK (good_unit_count >= 0),
    subject_id TEXT,
    experimental_condition TEXT,
    event_data_status TEXT,
    independence_status TEXT NOT NULL,
    UNIQUE (dataset_id, recording_index),
    UNIQUE (dataset_id, legacy_kilosort_folder)
) STRICT;

CREATE TABLE brain_regions (
    brain_region_id TEXT PRIMARY KEY,
    atlas_name TEXT NOT NULL,
    atlas_version TEXT NOT NULL,
    acronym TEXT NOT NULL,
    display_name TEXT NOT NULL,
    color_hex TEXT,
    annotation_status TEXT NOT NULL CHECK (annotation_status IN ('legacy_unverified', 'atlas_registered', 'manual', 'unknown')),
    UNIQUE (atlas_name, atlas_version, acronym)
) STRICT;

CREATE TABLE units (
    unit_id TEXT PRIMARY KEY,
    recording_id TEXT NOT NULL REFERENCES recordings(recording_id) ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL,
    spike_count INTEGER NOT NULL CHECK (spike_count >= 0),
    recording_duration_s REAL CHECK (recording_duration_s >= 0),
    unit_firing_rate_hz REAL CHECK (unit_firing_rate_hz >= 0),
    kilosort_label TEXT,
    contamination_pct REAL,
    amplitude_arbitrary_unit REAL,
    is_good_unit INTEGER NOT NULL CHECK (is_good_unit IN (0, 1)),
    is_neural_brain_region INTEGER NOT NULL CHECK (is_neural_brain_region IN (0, 1)),
    UNIQUE (recording_id, cluster_id)
) STRICT;

CREATE TABLE data_assets (
    asset_id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id TEXT NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
    recording_id TEXT REFERENCES recordings(recording_id) ON DELETE CASCADE,
    asset_role TEXT NOT NULL,
    media_type TEXT NOT NULL,
    storage_backend TEXT NOT NULL CHECK (storage_backend IN ('project_file', 'local_file', 'object_store', 'zarr', 'external_reference')),
    storage_uri TEXT NOT NULL,
    relative_path TEXT,
    filename TEXT NOT NULL,
    extension TEXT,
    byte_size INTEGER CHECK (byte_size >= 0),
    modified_at_utc TEXT,
    checksum_algorithm TEXT,
    checksum TEXT,
    checksum_status TEXT NOT NULL CHECK (checksum_status IN ('not_computed', 'verified', 'mismatch', 'unavailable')),
    availability_status TEXT NOT NULL CHECK (availability_status IN ('available', 'declared_not_present', 'missing', 'invalid')),
    source_data_origin TEXT NOT NULL,
    processing_stage TEXT NOT NULL,
    is_original INTEGER NOT NULL CHECK (is_original IN (0, 1)),
    metadata_json TEXT NOT NULL DEFAULT '{}',
    UNIQUE (dataset_id, storage_uri)
) STRICT;

CREATE TABLE probe_insertions (
    probe_insertion_id TEXT PRIMARY KEY,
    recording_id TEXT NOT NULL REFERENCES recordings(recording_id) ON DELETE CASCADE,
    probe_name TEXT NOT NULL,
    probe_model TEXT,
    shank_count INTEGER CHECK (shank_count > 0),
    coordinate_system TEXT NOT NULL,
    atlas_name TEXT,
    atlas_version TEXT,
    trajectory_status TEXT NOT NULL CHECK (trajectory_status IN ('probe_geometry_only', 'atlas_registered', 'planned', 'unavailable')),
    source_asset_id INTEGER REFERENCES data_assets(asset_id) ON DELETE SET NULL,
    entry_x_um REAL,
    entry_y_um REAL,
    entry_z_um REAL,
    tip_x_um REAL,
    tip_y_um REAL,
    tip_z_um REAL,
    metadata_json TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE TABLE channels (
    channel_id TEXT PRIMARY KEY,
    probe_insertion_id TEXT NOT NULL REFERENCES probe_insertions(probe_insertion_id) ON DELETE CASCADE,
    recording_channel INTEGER NOT NULL,
    electrode_index INTEGER,
    shank_id INTEGER,
    local_index INTEGER,
    row_index INTEGER,
    column_index INTEGER,
    x_um REAL,
    y_um REAL,
    z_um REAL,
    UNIQUE (probe_insertion_id, recording_channel)
) STRICT;

CREATE TABLE unit_locations (
    unit_id TEXT PRIMARY KEY REFERENCES units(unit_id) ON DELETE CASCADE,
    probe_insertion_id TEXT REFERENCES probe_insertions(probe_insertion_id) ON DELETE SET NULL,
    peak_channel_id TEXT REFERENCES channels(channel_id) ON DELETE SET NULL,
    brain_region_id TEXT REFERENCES brain_regions(brain_region_id) ON DELETE SET NULL,
    probe_depth_um REAL,
    x_um REAL,
    y_um REAL,
    z_um REAL,
    shank_id INTEGER,
    location_source TEXT NOT NULL,
    atlas_registration_status TEXT NOT NULL CHECK (atlas_registration_status IN ('legacy_label_only', 'atlas_registered', 'probe_coordinates_only', 'unmapped'))
) STRICT;

CREATE TABLE signal_streams (
    signal_stream_id TEXT PRIMARY KEY,
    recording_id TEXT NOT NULL REFERENCES recordings(recording_id) ON DELETE CASCADE,
    source_asset_id INTEGER REFERENCES data_assets(asset_id) ON DELETE SET NULL,
    stream_name TEXT NOT NULL,
    stream_kind TEXT NOT NULL CHECK (stream_kind IN ('raw_voltage', 'lfp', 'ap', 'digital_events', 'other')),
    sample_rate_hz REAL CHECK (sample_rate_hz > 0),
    channel_count INTEGER CHECK (channel_count > 0),
    sample_dtype TEXT,
    data_layout TEXT,
    byte_offset INTEGER CHECK (byte_offset >= 0),
    duration_s REAL CHECK (duration_s >= 0),
    chunk_duration_s REAL CHECK (chunk_duration_s > 0),
    storage_format TEXT,
    compression TEXT,
    declared_source_uri TEXT,
    availability_status TEXT NOT NULL CHECK (availability_status IN ('available', 'declared_not_present', 'planned', 'invalid')),
    metadata_json TEXT NOT NULL DEFAULT '{}',
    UNIQUE (recording_id, stream_name)
) STRICT;

CREATE TABLE video_streams (
    video_stream_id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
    recording_id TEXT REFERENCES recordings(recording_id) ON DELETE SET NULL,
    source_asset_id INTEGER REFERENCES data_assets(asset_id) ON DELETE SET NULL,
    proxy_asset_id INTEGER REFERENCES data_assets(asset_id) ON DELETE SET NULL,
    video_name TEXT NOT NULL,
    camera_id TEXT,
    duration_s REAL CHECK (duration_s >= 0),
    frame_rate_hz REAL CHECK (frame_rate_hz > 0),
    frame_count INTEGER CHECK (frame_count >= 0),
    width_px INTEGER CHECK (width_px > 0),
    height_px INTEGER CHECK (height_px > 0),
    codec TEXT,
    timestamp_source TEXT,
    availability_status TEXT NOT NULL CHECK (availability_status IN ('available', 'planned', 'invalid')),
    metadata_json TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE TABLE time_mappings (
    time_mapping_id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('signal_stream', 'video_stream', 'event_stream')),
    source_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('signal_stream', 'video_stream', 'event_stream')),
    target_id TEXT NOT NULL,
    mapping_method TEXT NOT NULL CHECK (mapping_method IN ('ttl', 'frame_timestamps', 'manual_offset', 'linear_clock_fit', 'unknown')),
    offset_s REAL NOT NULL DEFAULT 0,
    scale REAL NOT NULL DEFAULT 1 CHECK (scale > 0),
    drift_ppm REAL,
    matched_event_count INTEGER CHECK (matched_event_count >= 0),
    residual_rms_ms REAL CHECK (residual_rms_ms >= 0),
    verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
    provenance_json TEXT NOT NULL DEFAULT '{}',
    UNIQUE (source_type, source_id, target_type, target_id)
) STRICT;

CREATE TABLE analysis_runs (
    analysis_run_id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
    analysis_name TEXT NOT NULL,
    analysis_version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    parameters_json TEXT NOT NULL,
    input_fingerprint TEXT NOT NULL,
    code_version TEXT,
    started_at_utc TEXT,
    completed_at_utc TEXT,
    warning_json TEXT NOT NULL DEFAULT '[]',
    error_message TEXT,
    UNIQUE (analysis_name, analysis_version, input_fingerprint, parameters_json)
) STRICT;

CREATE TABLE analysis_artifacts (
    analysis_artifact_id TEXT PRIMARY KEY,
    analysis_run_id TEXT NOT NULL REFERENCES analysis_runs(analysis_run_id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES data_assets(asset_id) ON DELETE RESTRICT,
    artifact_role TEXT NOT NULL,
    output_contract TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    UNIQUE (analysis_run_id, artifact_role)
) STRICT;

CREATE TABLE ingest_issues (
    ingest_issue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingest_run_id TEXT NOT NULL REFERENCES ingest_runs(ingest_run_id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
    issue_code TEXT NOT NULL,
    recording_id TEXT REFERENCES recordings(recording_id) ON DELETE CASCADE,
    asset_id INTEGER REFERENCES data_assets(asset_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE INDEX idx_recordings_dataset ON recordings(dataset_id, recording_index);
CREATE INDEX idx_units_recording_cluster ON units(recording_id, cluster_id);
CREATE INDEX idx_units_quality ON units(recording_id, is_good_unit, kilosort_label);
CREATE INDEX idx_unit_locations_region ON unit_locations(brain_region_id, unit_id);
CREATE INDEX idx_assets_recording_role ON data_assets(recording_id, asset_role);
CREATE INDEX idx_assets_media ON data_assets(media_type, availability_status);
CREATE INDEX idx_channels_probe_depth ON channels(probe_insertion_id, y_um);
CREATE INDEX idx_signal_streams_recording ON signal_streams(recording_id, stream_kind);
CREATE INDEX idx_videos_recording ON video_streams(recording_id);
CREATE INDEX idx_analysis_runs_dataset_status ON analysis_runs(dataset_id, status);

CREATE VIEW recording_catalog AS
SELECT
    r.recording_id,
    r.dataset_id,
    r.recording_index,
    r.legacy_kilosort_folder,
    r.sample_rate_hz,
    r.recording_duration_s,
    r.spike_count,
    (SELECT COUNT(*) FROM units u WHERE u.recording_id = r.recording_id) AS unit_count,
    (SELECT COUNT(*) FROM units u WHERE u.recording_id = r.recording_id AND u.is_good_unit = 1) AS good_unit_count,
    (
        SELECT COUNT(*)
        FROM unit_locations ul
        JOIN units u ON u.unit_id = ul.unit_id
        WHERE u.recording_id = r.recording_id AND ul.brain_region_id IS NOT NULL
    ) AS region_mapped_unit_count,
    (SELECT COUNT(*) FROM data_assets a WHERE a.recording_id = r.recording_id) AS asset_count,
    COALESCE((SELECT SUM(a.byte_size) FROM data_assets a WHERE a.recording_id = r.recording_id), 0) AS indexed_byte_size
FROM recordings r;

CREATE VIEW unit_catalog AS
SELECT
    u.unit_id,
    u.recording_id,
    u.cluster_id,
    u.spike_count,
    u.unit_firing_rate_hz,
    u.kilosort_label,
    u.is_good_unit,
    br.acronym AS brain_region,
    br.color_hex AS atlas_color_hex,
    ul.probe_depth_um,
    ul.shank_id,
    ul.atlas_registration_status
FROM units u
LEFT JOIN unit_locations ul ON ul.unit_id = u.unit_id
LEFT JOIN brain_regions br ON br.brain_region_id = ul.brain_region_id;

PRAGMA user_version = 1;
