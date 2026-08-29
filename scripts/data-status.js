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
    { key: "probeGrouping", label: "Shank grouping", detail: "channel_shanks.npy or geometry CSV" }
  ]);

  const LABEL_FILES = ["cluster_info.tsv", "cluster_group.tsv", "cluster_kslabel.tsv"];

  function nameAvailable(recording, filename) {
    return Boolean(recording?.byName?.has?.(filename.toLowerCase()));
  }

  function roleAvailable(recording, role) {
    return Boolean(recording?.assets?.some?.((asset) => asset.role === role && asset.status === "available"));
  }

  function fileAvailable(recording, filename, role) {
    return nameAvailable(recording, filename) || roleAvailable(recording, role);
  }

  function missingFilesFor(recording, key) {
    const missing = [];
    const exact = (filename, role) => {
      if (!fileAvailable(recording, filename, role)) missing.push({ filename, roles: [role] });
    };
    if (key === "spikes") {
      exact("spike_times.npy", "spike_times");
      exact("spike_clusters.npy", "spike_clusters");
    } else if (key === "quality" && !recording?.capabilities?.quality) {
      missing.push({ filename: LABEL_FILES.join(" / "), roles: ["unit_metadata"] });
    } else if (key === "amplitude") {
      exact("amplitudes.npy", "spike_amplitudes");
    } else if (key === "position") {
      exact("spike_positions.npy", "spike_positions");
    } else if (key === "template") {
      exact("templates.npy", "templates");
      exact("spike_templates.npy", "spike_templates");
    } else if (key === "geometry" && !recording?.capabilities?.geometry) {
      missing.push({ filename: "channel_positions.npy / channel_geometry.csv", roles: ["channel_positions", "channel_geometry"] });
    } else if (key === "probeGrouping" && !recording?.capabilities?.probeGrouping) {
      missing.push({ filename: "channel_shanks.npy / channel_geometry.csv", roles: ["channel_probe_groups", "channel_geometry"] });
    }
    return missing;
  }

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
        missingRecordings: recordings.map((recording) => ({
          recordingKey: recording.databaseId || recording.key,
          recordingName: recording.name,
          files: missingFilesFor(recording, definition.key)
        })).filter((recording) => recording.files.length),
        detail: coverage.complete
          ? `${definition.detail} · ${coverage.available}/${coverage.total} recordings`
          : `${definition.detail} · ${coverage.total - coverage.available}/${coverage.total} recordings missing`
      };
      item.missingFileCount = item.missingRecordings.reduce((total, recording) => total + recording.files.length, 0);
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
        detail: recordings.some((recording) => recording?.capabilities?.video) ? "Video detected; synchronized viewing is available" : "Synchronized viewer ready · deterministic validation video available"
      },
      {
        key: "rawVoltage",
        label: "Raw voltage viewer",
        state: recordings.some((recording) => recording?.capabilities?.rawVoltage) ? "detected" : "future",
        detail: recordings.some((recording) => recording?.capabilities?.rawVoltage) ? "Raw voltage detected; no reader provider is registered" : "Extension contract ready · no raw-voltage provider registered"
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

  return { CORE_INPUTS, capabilityCoverage, missingFilesFor, buildDataStatus, summaryText };
});
