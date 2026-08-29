((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelDatabaseClient = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { Accept: "application/json", ...(options.headers || {}) },
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = Array.isArray(payload.details) && payload.details.length
        ? ` · ${payload.details.map((item) => item.message || item.reason || item.filename).filter(Boolean).join(" | ")}`
        : "";
      const error = new Error(`${payload.message || `Data service returned ${response.status}`}${details}`);
      error.code = payload.error || "request_failed";
      error.details = payload.details || [];
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function capabilities(roles, hasRawSignal) {
    const available = new Set(roles || []);
    return {
      spikes: available.has("spike_times") && available.has("spike_clusters"),
      quality: available.has("unit_metadata"),
      amplitude: available.has("spike_amplitudes"),
      position: available.has("spike_positions"),
      template: available.has("templates") && available.has("spike_templates"),
      geometry: available.has("channel_positions") || available.has("channel_geometry"),
      probeGrouping: available.has("channel_probe_groups") || available.has("channel_geometry"),
      video: available.has("video"),
      rawVoltage: Boolean(hasRawSignal)
    };
  }

  function emptyProbeTrack() {
    return {
      valid: false,
      source: "",
      files: [],
      rowCount: 0,
      probeCount: 0,
      probes: [],
      profiles: [],
      segments: [],
      warnings: [],
      contract: {
        required: ["probe/shank", "depth_um", "region"],
        recommended: ["electrode", "atlas_id", "color", "experiment/recording_id"],
        join: "probe/shank + depth_um, or electrode_index when available"
      }
    };
  }

  function normalizeCatalog(payload) {
    const regionMapping = new Map();
    const regionNames = new Set();
    const recordings = (payload.recordings || []).map((item) => normalizeRecording(item, regionMapping, regionNames));
    return {
      dataset: payload.dataset,
      ingest: payload.ingest,
      summary: payload.summary,
      recordings,
      regionResult: {
        valid: regionMapping.size > 0,
        mapping: regionMapping,
        files: ["neuropixel_catalog.sqlite"],
        count: regionMapping.size,
        regions: [...regionNames].sort(),
        conflicts: 0,
        probeTrack: payload.probeTrack?.valid ? payload.probeTrack : emptyProbeTrack()
      },
      videos: payload.videos || [],
      serverTimingMs: Number(payload.serverTimingMs || 0)
    };
  }

  function normalizeRecording(item, regionMapping = new Map(), regionNames = new Set()) {
      const units = item.units || [];
      const clusterLabels = units.map((unit) => ({ id: Number(unit.cluster_id), quality: unit.kilosort_label || "unknown" }));
      const unitSummaryMap = new Map(units.map((unit) => [Number(unit.cluster_id), {
        id: Number(unit.cluster_id),
        count: Number(unit.spike_count || 0),
        rateHz: Number(unit.unit_firing_rate_hz || 0)
      }]));
      const amplitudeByCluster = new Map(units.filter((unit) => Number.isFinite(Number(unit.amplitude_arbitrary_unit))).map((unit) => [Number(unit.cluster_id), Number(unit.amplitude_arbitrary_unit)]));
      const contaminationByCluster = new Map(units.filter((unit) => Number.isFinite(Number(unit.contamination_pct))).map((unit) => [Number(unit.cluster_id), Number(unit.contamination_pct)]));
      units.forEach((unit) => {
        if (!unit.brain_region) return;
        regionNames.add(unit.brain_region);
        regionMapping.set(`${Number(item.recording_index)}::${Number(unit.cluster_id)}`, {
          region: unit.brain_region,
          color: unit.atlas_color_hex || "",
          source: `SQLite · ${unit.region_annotation_status || "legacy_unverified"}`
        });
      });
      const assets = (item.assets || []).map((asset) => ({
        assetId: Number(asset.asset_id),
        role: asset.asset_role,
        filename: asset.filename,
        byteSize: Number(asset.byte_size || 0),
        checksumStatus: asset.checksum_status,
        status: asset.availability_status,
        source: asset.source_data_origin,
        processingStage: asset.processing_stage
      }));
      return {
        key: item.recording_id,
        databaseId: item.recording_id,
        recordingIndex: Number(item.recording_index),
        name: item.legacy_kilosort_folder,
        sampleRate: Number(item.sample_rate_hz),
        duration: Number(item.recording_duration_s || 0),
        spikeCount: Number(item.spike_count || 0),
        clusterLabels,
        unitSummaryMap,
        amplitudeByCluster,
        contaminationByCluster,
        totalBytes: Number(item.indexed_byte_size || 0),
        fileCount: Number(item.asset_count || 0),
        usefulFileCount: Number(item.asset_count || 0),
        capabilities: capabilities(item.assetRoles, item.has_raw_signal),
        assets,
        headers: {},
        units
      };
  }

  function normalizeUnitReview(payload) {
    return {
      ...payload,
      spikeTimes: Float64Array.from(payload.spikeTimes || []),
      rateBins: Float32Array.from(payload.rateBins || []),
      acg: Uint32Array.from(payload.acg || []),
      amplitudeTimes: Float64Array.from(payload.amplitudeTimes || []),
      amplitudeValues: Float32Array.from(payload.amplitudeValues || []),
      templateWaveform: Float32Array.from(payload.templateWaveform || []),
      channelGeometry: Float32Array.from(payload.channelGeometry || []),
      channelShankIds: Int16Array.from(payload.channelShankIds || payload.channelProbeIds || []),
      channelProbeIds: Int16Array.from(payload.channelShankIds || payload.channelProbeIds || [])
    };
  }

  async function loadCatalog() {
    return normalizeCatalog(await request("/api/catalog"));
  }

  async function loadUnitReview(recording, clusterId) {
    const unit = recording.units?.find((item) => Number(item.cluster_id) === Number(clusterId));
    if (!unit?.unit_id) throw new Error(`Unit ${clusterId} is not registered in ${recording.name}`);
    return normalizeUnitReview(await request(`/api/units/${encodeURIComponent(unit.unit_id)}/review`));
  }

  async function loadRecording(recordingId) {
    const payload = await request(`/api/recordings/${encodeURIComponent(recordingId)}`);
    return normalizeRecording(payload.recording);
  }

  function fileMetadata(file) {
    return {
      name: file.name,
      relativePath: file.webkitRelativePath || file.relativePath || file.name,
      size: Number(file.size || 0),
      lastModified: Number(file.lastModified || 0)
    };
  }

  async function ingestFiles(files, {
    expectedRecordingId = null,
    expectedRoles = [],
    sourceKind = "files",
    onProgress = null
  } = {}) {
    const selected = [...files];
    let session = null;
    try {
      session = await request("/api/ingest/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceKind,
          expectedRecordingId,
          expectedRoles,
          files: selected.map(fileMetadata)
        })
      });
      const accepted = session.files || [];
      for (let position = 0; position < accepted.length; position += 1) {
        const item = accepted[position];
        const file = selected[Number(item.clientIndex)];
        if (!file) throw new Error(`The selected file at index ${item.clientIndex} is no longer available`);
        onProgress?.({ phase: "upload", current: position + 1, total: accepted.length, filename: file.name });
        await request(`/api/ingest/sessions/${session.sessionId}/files/${item.clientIndex}`, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: file
        });
      }
      onProgress?.({ phase: "commit", current: accepted.length, total: accepted.length });
      return await request(`/api/ingest/sessions/${session.sessionId}/commit`, { method: "POST" });
    } catch (error) {
      if (session?.sessionId) {
        await request(`/api/ingest/sessions/${session.sessionId}`, { method: "DELETE" }).catch(() => {});
      }
      throw error;
    }
  }

  return {
    request,
    emptyProbeTrack,
    normalizeCatalog,
    normalizeRecording,
    normalizeUnitReview,
    loadCatalog,
    loadRecording,
    loadUnitReview,
    ingestFiles
  };
});
