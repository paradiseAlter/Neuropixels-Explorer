((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelRegionCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const CANONICAL = ["unit_quality_all_sessions.csv", "all_good_units_with_regions.csv", "all_units_18exp.csv"];
  const ALIASES = {
    experiment: ["exp", "experiment", "experiment_id", "experiment_number", "recording", "recording_id", "session", "session_id"],
    cluster: ["cluster_id", "cluster", "unit_id", "unit"],
    region: ["brain_region", "region", "region_acronym", "atlas_region", "structure", "area"],
    color: ["atlas_color", "color", "hex", "region_color"]
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

  function schema(headers) {
    return {
      experiment: columnIndex(headers, ALIASES.experiment),
      cluster: columnIndex(headers, ALIASES.cluster),
      region: columnIndex(headers, ALIASES.region),
      color: columnIndex(headers, ALIASES.color)
    };
  }

  function experimentNumber(value) {
    const text = String(value || "").trim();
    const explicit = text.match(/(?:ks\d*[_\-\s]*)?exp(?:eriment)?[_\-\s]*(\d+)/i);
    const fallback = text.match(/\b(\d{1,3})\b/);
    const parsed = Number(explicit?.[1] || fallback?.[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  function clusterNumber(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  function priority(name) {
    const index = CANONICAL.indexOf(String(name).toLowerCase());
    return index < 0 ? 100 : index;
  }

  async function inspect(file) {
    const sample = await file.slice(0, Math.min(Number(file.size || 0), 16384)).text();
    const firstLine = sample.split(/\r?\n/, 1)[0];
    const headers = parseCsv(firstLine)[0] || [];
    const detected = schema(headers);
    return { file, name: fileNameOf(file), detected, direct: detected.experiment >= 0 && detected.cluster >= 0 && detected.region >= 0 };
  }

  async function readTable(descriptor) {
    const rows = parseCsv(await descriptor.file.text());
    if (rows.length < 2) return [];
    const detected = schema(rows[0]);
    return rows.slice(1).map((row) => {
      const experiment = experimentNumber(row[detected.experiment]);
      const clusterId = clusterNumber(row[detected.cluster]);
      const region = String(row[detected.region] || "").trim();
      if (experiment == null || clusterId == null || !region) return null;
      const color = detected.color >= 0 ? String(row[detected.color] || "").trim() : "";
      return { experiment, clusterId, region, color, source: descriptor.name };
    }).filter(Boolean);
  }

  async function scanFiles(files) {
    const csvFiles = [...files].filter((file) => fileNameOf(file).toLowerCase().endsWith(".csv"));
    if (!csvFiles.length) return { valid: false, mapping: new Map(), files: [], count: 0, regions: [] };
    const inspected = await Promise.all(csvFiles.map(inspect));
    const compatible = inspected.filter((item) => item.direct);
    const canonical = compatible.filter((item) => CANONICAL.includes(item.name.toLowerCase()));
    const selected = (canonical.length ? canonical : compatible).sort((left, right) => priority(left.name) - priority(right.name) || left.name.localeCompare(right.name));
    if (!selected.length) return { valid: false, mapping: new Map(), files: [], count: 0, regions: [] };
    const tables = await Promise.all(selected.map(readTable));
    const mapping = new Map();
    let conflicts = 0;
    tables.forEach((records) => records.forEach((record) => {
      const key = `${record.experiment}::${record.clusterId}`;
      const existing = mapping.get(key);
      if (!existing) mapping.set(key, record);
      else if (existing.region !== record.region) conflicts += 1;
    }));
    return {
      valid: mapping.size > 0,
      mapping,
      files: selected.map((item) => item.name),
      count: mapping.size,
      regions: [...new Set([...mapping.values()].map((item) => item.region))].sort(),
      experiments: [...new Set([...mapping.values()].map((item) => item.experiment))].sort((a, b) => a - b),
      conflicts
    };
  }

  return { CANONICAL, ALIASES, pathOf, fileNameOf, parseCsv, experimentNumber, scanFiles };
});
