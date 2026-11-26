((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelRegionCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const UNIT_CANONICAL = ["unit_quality_all_sessions.csv", "all_good_units_with_regions.csv", "all_units_18exp.csv"];
  const TRACK_CANONICAL = ["pinpoint_parsed.csv", "probe_region_mapping.csv", "channel_atlas_mapping.csv"];
  const CANONICAL = UNIT_CANONICAL;
  const ALIASES = {
    experiment: ["exp", "experiment", "experiment_id", "experiment_number", "recording", "recording_id", "session", "session_id"],
    cluster: ["cluster_id", "cluster", "unit_id", "unit"],
    region: ["brain_region", "region", "region_acronym", "atlas_region", "structure", "area"],
    color: ["atlas_color", "color", "hex", "region_color"],
    probe: ["physical_probe_id", "physical_probe", "probe_id", "probe", "shank", "shaft"],
    depth: ["depth_um", "probe_depth_um", "depth", "y_um", "probe_y_um"],
    electrode: ["electrode", "electrode_id", "electrode_index", "channel", "channel_id"],
    atlasId: ["atlas_id", "structure_id", "ccf_structure_id"],
    local: ["local", "local_index", "probe_local_index"],
    row: ["row", "channel_row"]
  };

  function pathOf(file) {
    return String(file?.webkitRelativePath || file?.relativePath || file?.name || "").replaceAll("\\", "/");
  }

  function fileNameOf(file) {
    return pathOf(file).split("/").filter(Boolean).at(-1) || String(file?.name || "");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const source = String(text || "").replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (character === '"') quoted = false;
        else cell += character;
      } else if (character === '"') quoted = true;
      else if (character === ",") {
        row.push(cell);
        cell = "";
      } else if (character === "\n") {
        row.push(cell.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        cell = "";
      } else cell += character;
    }
    if (cell.length || row.length) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
    }
    return rows.filter((item) => item.some((value) => String(value).trim()));
  }

  function normalized(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s\-]+/g, "_");
  }

  function columnIndex(headers, aliases) {
    const normalizedHeaders = headers.map(normalized);
    return aliases.map((alias) => normalizedHeaders.indexOf(alias)).find((index) => index >= 0) ?? -1;
  }

  function unitSchema(headers) {
    return {
      experiment: columnIndex(headers, ALIASES.experiment),
      cluster: columnIndex(headers, ALIASES.cluster),
      region: columnIndex(headers, ALIASES.region),
      color: columnIndex(headers, ALIASES.color)
    };
  }

  function probeTrackSchema(headers) {
    return {
      experiment: columnIndex(headers, ALIASES.experiment),
      probe: columnIndex(headers, ALIASES.probe),
      depth: columnIndex(headers, ALIASES.depth),
      region: columnIndex(headers, ALIASES.region),
      color: columnIndex(headers, ALIASES.color),
      electrode: columnIndex(headers, ALIASES.electrode),
      atlasId: columnIndex(headers, ALIASES.atlasId),
      local: columnIndex(headers, ALIASES.local),
      row: columnIndex(headers, ALIASES.row)
    };
  }

  function schema(headers) {
    return unitSchema(headers);
  }

  function experimentNumber(value) {
    const text = String(value || "").trim();
    const explicit = text.match(/(?:ks\d*[_\-\s]*)?exp(?:eriment)?[_\-\s]*(\d+)/i);
    const fallback = text.match(/\b(\d{1,3})\b/);
    const parsed = Number(explicit?.[1] || fallback?.[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  function integer(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  function clusterNumber(value) {
    return integer(value);
  }

  function finite(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function colorValue(value) {
    const text = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) return text.toUpperCase();
    if (/^[0-9a-f]{6}$/i.test(text)) return `#${text.toUpperCase()}`;
    return "";
  }

  function priority(name, canonical) {
    const index = canonical.indexOf(String(name).toLowerCase());
    return index < 0 ? 100 : index;
  }

  async function inspect(file) {
    const sample = await file.slice(0, Math.min(Number(file.size || 0), 16384)).text();
    const firstLine = sample.split(/\r?\n/, 1)[0];
    const headers = parseCsv(firstLine)[0] || [];
    const unitDetected = unitSchema(headers);
    const trackDetected = probeTrackSchema(headers);
    return {
      file,
      name: fileNameOf(file),
      headers,
      detected: unitDetected,
      unitDetected,
      trackDetected,
      direct: unitDetected.experiment >= 0 && unitDetected.cluster >= 0 && unitDetected.region >= 0,
      trackDirect: trackDetected.probe >= 0 && trackDetected.depth >= 0 && trackDetected.region >= 0
    };
  }

  async function readUnitTable(descriptor) {
    const rows = parseCsv(await descriptor.file.text());
    if (rows.length < 2) return [];
    const detected = unitSchema(rows[0]);
    return rows.slice(1).map((row) => {
      const experiment = experimentNumber(row[detected.experiment]);
      const clusterId = clusterNumber(row[detected.cluster]);
      const region = String(row[detected.region] || "").trim();
      if (experiment == null || clusterId == null || !region) return null;
      const color = detected.color >= 0 ? colorValue(row[detected.color]) : "";
      return { experiment, clusterId, region, color, source: descriptor.name };
    }).filter(Boolean);
  }

  function median(values) {
    const sorted = [...values].filter(Number.isFinite).sort((left, right) => left - right);
    if (!sorted.length) return 15;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function collapseDepthRows(records) {
    const byDepth = new Map();
    records.forEach((record) => {
      if (!byDepth.has(record.depthUm)) byDepth.set(record.depthUm, []);
      byDepth.get(record.depthUm).push(record);
    });
    return [...byDepth.entries()].sort((left, right) => left[0] - right[0]).map(([depthUm, candidates]) => {
      const counts = new Map();
      candidates.forEach((candidate) => {
        const key = `${candidate.region}::${candidate.color}::${candidate.atlasId ?? ""}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      const winnerKey = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
      const winner = candidates.find((candidate) => `${candidate.region}::${candidate.color}::${candidate.atlasId ?? ""}` === winnerKey);
      return { ...winner, depthUm, ambiguous: counts.size > 1, electrodeCount: candidates.length };
    });
  }

  function buildSegments(records) {
    const grouped = new Map();
    records.forEach((record) => {
      const key = `${record.experiment ?? "all"}::${record.probeId}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(record);
    });
    const profiles = [];
    const segments = [];
    grouped.forEach((items) => {
      const depths = collapseDepthRows(items);
      if (!depths.length) return;
      const positiveSteps = depths.slice(1).map((item, index) => item.depthUm - depths[index].depthUm).filter((step) => step > 0);
      const sampleStepUm = Math.max(.001, median(positiveSteps));
      let current = null;
      depths.forEach((item) => {
        const sameRegion = current && current.region === item.region && current.color === item.color && current.atlasId === item.atlasId;
        const contiguous = current && item.depthUm - current.lastDepthUm <= sampleStepUm * 1.6;
        if (!sameRegion || !contiguous) {
          if (current) segments.push(current);
          current = {
            experiment: item.experiment,
            probeId: item.probeId,
            region: item.region,
            color: item.color,
            atlasId: item.atlasId,
            startDepthUm: item.depthUm - sampleStepUm / 2,
            endDepthUm: item.depthUm + sampleStepUm / 2,
            firstDepthUm: item.depthUm,
            lastDepthUm: item.depthUm,
            sampleStepUm,
            depthSamples: 1,
            electrodeCount: item.electrodeCount,
            ambiguousDepths: item.ambiguous ? 1 : 0
          };
        } else {
          current.lastDepthUm = item.depthUm;
          current.endDepthUm = item.depthUm + sampleStepUm / 2;
          current.depthSamples += 1;
          current.electrodeCount += item.electrodeCount;
          current.ambiguousDepths += item.ambiguous ? 1 : 0;
        }
      });
      if (current) segments.push(current);
      profiles.push({
        experiment: depths[0].experiment,
        probeId: depths[0].probeId,
        minimumDepthUm: depths[0].depthUm,
        maximumDepthUm: depths.at(-1).depthUm,
        sampleStepUm,
        depthSamples: depths.length,
        electrodeCount: depths.reduce((sum, item) => sum + item.electrodeCount, 0),
        ambiguousDepths: depths.filter((item) => item.ambiguous).length
      });
    });
    return { profiles, segments: segments.sort((left, right) => (left.experiment ?? 0) - (right.experiment ?? 0) || left.probeId - right.probeId || left.startDepthUm - right.startDepthUm) };
  }

  async function readProbeTrack(descriptors) {
    const records = [];
    const warnings = [];
    for (const descriptor of descriptors) {
      const rows = parseCsv(await descriptor.file.text());
      if (rows.length < 2) continue;
      const detected = probeTrackSchema(rows[0]);
      rows.slice(1).forEach((row, rowIndex) => {
        const probeId = integer(row[detected.probe]);
        const depthUm = finite(row[detected.depth]);
        const region = String(row[detected.region] || "").trim();
        if (probeId == null || depthUm == null || !region) return;
        records.push({
          experiment: detected.experiment >= 0 ? experimentNumber(row[detected.experiment]) : null,
          probeId,
          depthUm,
          region,
          color: detected.color >= 0 ? colorValue(row[detected.color]) : "",
          electrodeId: detected.electrode >= 0 ? integer(row[detected.electrode]) : null,
          atlasId: detected.atlasId >= 0 ? integer(row[detected.atlasId]) : null,
          localIndex: detected.local >= 0 ? integer(row[detected.local]) : null,
          row: detected.row >= 0 ? integer(row[detected.row]) : null,
          source: descriptor.name,
          sourceRow: rowIndex + 2
        });
      });
    }
    const { profiles, segments } = buildSegments(records);
    const probes = [...new Set(records.map((record) => record.probeId))].sort((left, right) => left - right);
    const experiments = [...new Set(records.map((record) => record.experiment).filter((value) => value != null))].sort((left, right) => left - right);
    const missingColors = records.filter((record) => !record.color).length;
    const ambiguousDepths = profiles.reduce((sum, profile) => sum + profile.ambiguousDepths, 0);
    if (missingColors) warnings.push(`${missingColors} rows do not provide a valid six-digit region color.`);
    if (ambiguousDepths) warnings.push(`${ambiguousDepths} depth samples contain conflicting region labels across electrode columns.`);
    return {
      valid: records.length > 0 && segments.length > 0,
      source: descriptors.map((descriptor) => descriptor.name).join(", "),
      files: descriptors.map((descriptor) => descriptor.name),
      rowCount: records.length,
      probeCount: probes.length,
      probes,
      experiments,
      scopedByExperiment: experiments.length > 0,
      profiles,
      segments,
      warnings,
      contract: {
        required: ["probe/shank", "depth_um", "region"],
        recommended: ["electrode", "atlas_id", "color", "experiment/recording_id"],
        join: "probe/shank + depth_um, or electrode_index when available"
      }
    };
  }

  async function scanFiles(files) {
    const csvFiles = [...files].filter((file) => fileNameOf(file).toLowerCase().endsWith(".csv"));
    const emptyTrack = { valid: false, source: "", files: [], rowCount: 0, probeCount: 0, probes: [], experiments: [], scopedByExperiment: false, profiles: [], segments: [], warnings: [], contract: { required: ["probe/shank", "depth_um", "region"], recommended: ["electrode", "atlas_id", "color", "experiment/recording_id"], join: "probe/shank + depth_um, or electrode_index when available" } };
    if (!csvFiles.length) return { valid: false, mapping: new Map(), files: [], count: 0, regions: [], probeTrack: emptyTrack };
    const inspected = await Promise.all(csvFiles.map(inspect));

    const unitCompatible = inspected.filter((item) => item.direct);
    const unitCanonical = unitCompatible.filter((item) => UNIT_CANONICAL.includes(item.name.toLowerCase()));
    const selectedUnits = (unitCanonical.length ? unitCanonical : unitCompatible)
      .sort((left, right) => priority(left.name, UNIT_CANONICAL) - priority(right.name, UNIT_CANONICAL) || left.name.localeCompare(right.name));
    const unitTables = await Promise.all(selectedUnits.map(readUnitTable));
    const mapping = new Map();
    let conflicts = 0;
    unitTables.forEach((records) => records.forEach((record) => {
      const key = `${record.experiment}::${record.clusterId}`;
      const existing = mapping.get(key);
      if (!existing) mapping.set(key, record);
      else if (existing.region !== record.region) conflicts += 1;
    }));

    const trackCompatible = inspected.filter((item) => item.trackDirect);
    const trackCanonical = trackCompatible.filter((item) => TRACK_CANONICAL.includes(item.name.toLowerCase()));
    const selectedTracks = (trackCanonical.length ? trackCanonical : trackCompatible)
      .sort((left, right) => priority(left.name, TRACK_CANONICAL) - priority(right.name, TRACK_CANONICAL) || left.name.localeCompare(right.name));
    const probeTrack = selectedTracks.length ? await readProbeTrack(selectedTracks.slice(0, 1)) : emptyTrack;
    const selectedFiles = [...new Set([...selectedUnits.map((item) => item.name), ...probeTrack.files])];
    return {
      valid: mapping.size > 0,
      mapping,
      files: selectedFiles,
      unitFiles: selectedUnits.map((item) => item.name),
      count: mapping.size,
      regions: [...new Set([...mapping.values()].map((item) => item.region))].sort(),
      experiments: [...new Set([...mapping.values()].map((item) => item.experiment))].sort((left, right) => left - right),
      conflicts,
      probeTrack
    };
  }

  return {
    CANONICAL,
    UNIT_CANONICAL,
    TRACK_CANONICAL,
    ALIASES,
    pathOf,
    fileNameOf,
    parseCsv,
    schema,
    unitSchema,
    probeTrackSchema,
    experimentNumber,
    inspect,
    scanFiles,
    readProbeTrack,
    buildSegments
  };
});
