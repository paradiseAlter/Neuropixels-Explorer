((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelsDataStatus = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const CORE_INPUTS = Object.freeze([
    { key: "spikes", label: "Spike times and clusters", detail: "spike_times.npy + spike_clusters.npy" },
    { key: "quality", label: "KiloSort quality labels", detail: "cluster labels or group table" },
    { key: "amplitude", label: "Spike amplitudes", detail: "amplitudes.npy" },
    { key: "position", label: "Spike positions", detail: "spike_positions.npy" },
    { key: "template", label: "KiloSort templates", detail: "templates.npy" },
    { key: "geometry", label: "Channel geometry", detail: "channel_positions.npy or geometry CSV" },
    { key: "probeGrouping", label: "Physical Probe grouping", detail: "channel_shanks.npy or geometry CSV" }
  ]);

  function capabilityCoverage(recordings, key) {
    const total = recordings.length;
    const available = recordings.filter((recording) => Boolean(recording?.capabilities?.[key])).length;
    return { available, total, complete: total > 0 && available === total };
  }

  function buildDataStatus(recordings = [], regionResult = null, errors = []) {
    const available = [];
    const missing = [];
    CORE_INPUTS.forEach((definition) => {
      const coverage = capabilityCoverage(recordings, definition.key);
      const item = {
        ...definition,
        state: coverage.complete ? "available" : "missing",
        coverage,
        sourceDetail: definition.detail,
        detail: coverage.complete
          ? `${definition.detail} · ${coverage.available}/${coverage.total} recordings`
          : `${definition.detail} · ${coverage.total - coverage.available}/${coverage.total} recordings missing`
      };
      (coverage.complete ? available : missing).push(item);
    });

    const optional = [
      {
        key: "unitRegions",
        label: "Unit brain-region mapping",
        state: regionResult?.valid ? "available" : "not-provided",
        count: Number(regionResult?.count || 0),
        detail: regionResult?.valid ? `${Number(regionResult.count || 0).toLocaleString()} Unit mappings` : "Optional Legacy Table not provided"
      },
      {
        key: "probeTrack",
        label: "Probe depth-to-region track",
        state: regionResult?.probeTrack?.valid ? "available" : "not-provided",
        count: Number(regionResult?.probeTrack?.rowCount || 0),
        probes: Number(regionResult?.probeTrack?.probeCount || 0),
        detail: regionResult?.probeTrack?.valid
          ? `${Number(regionResult.probeTrack.rowCount || 0).toLocaleString()} electrode rows`
          : "Optional Probe-region CSV not provided"
      }
    ];

    const future = [
      {
        key: "video",
        label: "Behavior video synchronization",
        state: recordings.some((recording) => recording?.capabilities?.video) ? "detected" : "future",
        detail: recordings.some((recording) => recording?.capabilities?.video) ? "Video files detected; synchronized viewing is reserved for a later stage" : "Future interface · no video detected"
      },
      {
        key: "rawVoltage",
        label: "Raw voltage viewer",
        state: recordings.some((recording) => recording?.capabilities?.rawVoltage) ? "detected" : "future",
        detail: recordings.some((recording) => recording?.capabilities?.rawVoltage) ? "Raw voltage detected; direct trace rendering is reserved for a later stage" : "Future interface · raw voltage not present"
      }
    ];

    const invalid = (errors || []).map((message, index) => ({
      key: `invalid-${index}`,
      label: "Unreadable candidate recording",
      state: "invalid",
      detail: String(message)
    }));

    return {
      available,
      missing,
      invalid,
      optional,
      future,
      counts: { available: available.length, missing: missing.length, invalid: invalid.length }
    };
  }

  function summaryText(status) {
    const counts = status?.counts || { available: 0, missing: 0, invalid: 0 };
    return `Data status · ${counts.available} available · ${counts.missing} missing${counts.invalid ? ` · ${counts.invalid} invalid` : ""}`;
  }

  return { CORE_INPUTS, capabilityCoverage, buildDataStatus, summaryText };
});
