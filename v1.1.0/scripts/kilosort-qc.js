(() => {
  "use strict";

  const scope = window.NeuropixelWorkflowV11 = window.NeuropixelWorkflowV11 || {};

  // File names documented by Kilosort 4's Phy export. Matching is case-insensitive.
  const OFFICIAL_OUTPUTS = new Set([
    "amplitudes.npy",
    "channel_map.npy",
    "channel_positions.npy",
    "channel_shanks.npy",
    "cluster_amplitude.tsv",
    "cluster_contampct.tsv",
    "cluster_kslabel.tsv",
    "cluster_group.tsv",
    "kept_spikes.npy",
    "ops.npy",
    "params.py",
    "pc_features.npy",
    "pc_feature_ind.npy",
    "similar_templates.npy",
    "spike_clusters.npy",
    "spike_positions.npy",
    "spike_templates.npy",
    "spike_times.npy",
    "templates.npy",
    "templates_ind.npy",
    "whitening_mat.npy",
    "whitening_mat_inv.npy",
    "whitening_mat_dat.npy"
  ]);

  // Common files produced by Phy, SpikeInterface, or earlier lab pipelines.
  // They are accepted as metadata but are not presented as official KS4 exports.
  const COMMON_METADATA = new Set([
    "cluster_info.tsv",
    "cluster_qsi.tsv",
    "cluster_si_unit_ids.tsv",
    "cluster_channel_group.tsv",
    "channel_map.py",
    "channel_geometry.csv",
    "rez.mat"
  ]);

  function audit(files) {
    const records = [...files].map((file) => {
      const path = file.webkitRelativePath || file.name;
      const parts = path.split("/");
      return { path, name: file.name, lower: file.name.toLowerCase(), size: file.size, root: parts[0] || "Selected folder" };
    });
    const byName = new Map();
    records.forEach((record) => {
      if (!byName.has(record.lower)) byName.set(record.lower, []);
      byName.get(record.lower).push(record);
    });

    const auditFiles = [];
    const errors = [];
    const warnings = [];
    const corePaths = new Set();
    let ignoredCount = 0;

    function checkCore(label, alternatives) {
      const groups = alternatives.map((name) => ({ name, matches: byName.get(name) || [] }));
      const present = groups.filter((group) => group.matches.length);
      if (!present.length) {
        const message = `Missing core contract: ${alternatives.join(" or ")}`;
        errors.push(message);
        auditFiles.push({ name: alternatives.join(" / "), status: "error", note: "Missing core file" });
        return false;
      }

      let usable = false;
      present.forEach((group) => {
        if (group.matches.length > 1) {
          errors.push(`Ambiguous core contract: ${group.name} appears ${group.matches.length} times in the selected tree.`);
          group.matches.forEach((record) => {
            corePaths.add(record.path);
            auditFiles.push({ ...record, status: "error", note: "Duplicate core file" });
          });
          return;
        }
        const record = group.matches[0];
        corePaths.add(record.path);
        if (record.size === 0) {
          errors.push(`Empty core file: ${record.path}`);
          auditFiles.push({ ...record, status: "error", note: "0 bytes" });
          return;
        }
        usable = true;
        auditFiles.push({ ...record, status: "pass", note: alternatives.length > 1 ? `${label} option` : "Core contract" });
      });
      return usable;
    }

    const spikeTimeReady = checkCore("spike times", ["spike_times.npy"]);
    const assignmentReady = checkCore("cluster assignments", ["spike_clusters.npy", "spike_templates.npy"]);
    const paramsReady = checkCore("sampling metadata", ["params.py"]);

    records.forEach((record) => {
      if (corePaths.has(record.path)) return;
      const official = OFFICIAL_OUTPUTS.has(record.lower);
      const knownMetadata = COMMON_METADATA.has(record.lower);
      if (!official && !knownMetadata) {
        ignoredCount += 1;
        if (ignoredCount <= 12) auditFiles.push({ ...record, status: "skip", note: "Unrecognized · ignored" });
        return;
      }
      if (record.size === 0) {
        errors.push(`Empty supported file: ${record.path}`);
        auditFiles.push({ ...record, status: "error", note: "0 bytes" });
        return;
      }
      const duplicates = byName.get(record.lower) || [];
      if (duplicates.length > 1) {
        const message = `Duplicate supported name: ${record.name}`;
        if (!errors.includes(message)) errors.push(message);
        auditFiles.push({ ...record, status: "error", note: "Duplicate name" });
        return;
      }
      auditFiles.push({ ...record, status: "pass", note: official ? "Kilosort output" : "Known metadata" });
    });

    if (ignoredCount > 12) {
      auditFiles.push({ name: `${ignoredCount - 12} additional files`, status: "skip", note: "Ignored · details suppressed" });
    }

    [
      ["templates.npy", "Template waveforms unavailable"],
      ["channel_positions.npy", "Probe geometry unavailable"],
      ["spike_positions.npy", "Per-spike positions unavailable"]
    ].forEach(([name, message]) => {
      if (!byName.has(name)) {
        warnings.push(message);
        auditFiles.push({ name, status: "warn", note: "Optional file absent" });
      }
    });

    const hasUsable = (name) => (byName.get(name) || []).length === 1 && byName.get(name)[0].size > 0;
    const availableOutputs = [];
    if (spikeTimeReady && assignmentReady && paramsReady) availableOutputs.push("SpikeEvents", "UnitSet", "TimeBase");
    if (hasUsable("templates.npy")) availableOutputs.push("TemplateWaveforms");
    if (hasUsable("channel_positions.npy") || hasUsable("channel_geometry.csv")) availableOutputs.push("ProbeGeometry");
    if (hasUsable("channel_shanks.npy")) availableOutputs.push("ShankMap");
    if (hasUsable("spike_positions.npy")) availableOutputs.push("SpikePositions");
    if (hasUsable("amplitudes.npy")) availableOutputs.push("Amplitudes");
    if (["cluster_group.tsv", "cluster_kslabel.tsv", "cluster_info.tsv", "cluster_contampct.tsv"].some(hasUsable)) availableOutputs.push("QualityTable");

    const valid = errors.length === 0 && spikeTimeReady && assignmentReady && paramsReady;
    const roots = [...new Set(records.map((record) => record.root))];
    const folderName = roots.length === 1 ? roots[0] : `${roots.length} roots selected`;
    const conclusion = valid
      ? `Core contract passed. ${availableOutputs.length} output capabilities can be indexed without loading array contents.`
      : `Core contract failed with ${errors.length} error${errors.length === 1 ? "" : "s"}. Optional files remain inspectable, but no valid spike DataHandle is available.`;

    return {
      auditFiles,
      availableOutputs,
      conclusion,
      errors,
      fileCount: records.length,
      firstPath: records[0]?.path || "",
      folderName,
      ignoredCount,
      valid,
      warnings
    };
  }

  scope.kilosortQc = { audit };
})();
