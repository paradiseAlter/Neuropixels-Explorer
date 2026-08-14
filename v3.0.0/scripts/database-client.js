((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelDatabaseClient = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  async function request(path) {
    const response = await fetch(path, { headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || `Data service returned ${response.status}`);
    return payload;
  }

  function capabilities(roles, hasRawSignal) {
    const available = new Set(roles || []);
    return {
      spikes: available.has("spike_times") && available.has("spike_clusters"),
      quality: available.has("unit_metadata"),
      amplitude: available.has("spike_amplitudes"),
      position: available.has("spike_positions"),
      template: available.has("templates"),
      geometry: available.has("channel_positions") || available.has("channel_geometry"),
      probeGrouping: available.has("channel_probe_groups") || available.has("channel_geometry"),
      video: available.has("video"),
      rawVoltage: Boolean(hasRawSignal)
    };
  }

  function normalizeCatalog(payload) {
    const regionMapping = new Map();
    const regionNames = new Set();
    const recordings = (payload.recordings || []).map((item) => {
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
        headers: {},
        units
      };
    });
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
        conflicts: 0
      },
      videos: payload.videos || [],
      serverTimingMs: Number(payload.serverTimingMs || 0)
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
      channelProbeIds: Int16Array.from(payload.channelProbeIds || [])
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

  return { request, normalizeCatalog, normalizeUnitReview, loadCatalog, loadUnitReview };
});
