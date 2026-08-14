((root, factory) => {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  const app = root.NeuropixelWorkflowV11 = root.NeuropixelWorkflowV11 || {};
  app.BrainRegionCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const DIRECT_CANONICAL = [
    "unit_quality_all_sessions.csv",
    "all_good_units_with_regions.csv",
    "all_units_18exp.csv"
  ];

  const ALIASES = {
    experiment: ["exp", "experiment", "experiment_id", "recording_index", "recording_id"],
    cluster: ["cluster", "cluster_id"],
    region: ["region", "brain_region", "region_acronym", "acronym"],
    color: ["atlas_color", "atlas_color_hex", "color"],
    depth: ["depth_um", "probe_depth_um"],
    shank: ["shank", "shank_id"],
    electrode: ["electrode", "electrode_index", "channel", "channel_id"],
    atlasId: ["atlas_id", "structure_id"]
  };

  function pathOf(file) {
    return String(file.webkitRelativePath || file.relativePath || file.name || "").replaceAll("\\", "/");
  }

  function fileNameOf(file) {
    return pathOf(file).split("/").filter(Boolean).at(-1) || String(file.name || "");
  }

  function parseCsv(text) {
    const source = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else if (character === '"') quoted = false;
        else field += character;
      } else if (character === '"') quoted = true;
      else if (character === ",") {
        row.push(field);
        field = "";
      } else if (character === "\n") {
        row.push(field.replace(/\r$/, ""));
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        field = "";
      } else field += character;
    }
    if (field || row.length) {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
    }
    return rows;
  }

  function normalizedHeaders(values) {
    return values.map((value) => String(value || "").trim().toLowerCase());
  }

  function findColumn(headers, aliases) {
    return aliases.map((alias) => headers.indexOf(alias)).find((index) => index >= 0) ?? -1;
  }

  function detectSchema(headerValues) {
    const headers = normalizedHeaders(headerValues);
    const columns = Object.fromEntries(Object.entries(ALIASES).map(([key, aliases]) => [key, findColumn(headers, aliases)]));
    return {
      headers,
      columns,
      direct: columns.experiment >= 0 && columns.cluster >= 0 && columns.region >= 0,
      coordinate: columns.electrode >= 0 && columns.region >= 0 && (columns.depth >= 0 || columns.shank >= 0)
    };
  }

  function experimentNumber(value) {
    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric > 0) return numeric;
    const match = String(value || "").match(/(?:exp|rec(?:ording)?)[_\s-]*0*(\d+)/i) || String(value || "").match(/(\d+)/);
    const parsed = Number(match?.[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  function integer(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  function numeric(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function color(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    const prefixed = text.startsWith("#") ? text : `#${text}`;
    return /^#[0-9a-f]{6}$/i.test(prefixed) ? prefixed.toUpperCase() : null;
  }

  function rootName(files) {
    const first = pathOf(files[0]).split("/").filter(Boolean);
    return first[0] || "Legacy Table";
  }

  async function describeCsv(file) {
    const sample = await file.slice(0, Math.min(Number(file.size || 0), 16384)).text();
    const firstLineEnd = sample.search(/\r?\n/);
    const headerText = firstLineEnd >= 0 ? sample.slice(0, firstLineEnd) : sample;
    const header = parseCsv(headerText)[0] || [];
    return {
      file,
      name: fileNameOf(file),
      size: Number(file.size || 0),
      schema: detectSchema(header)
    };
  }

  function directPriority(name) {
    const index = DIRECT_CANONICAL.indexOf(String(name).toLowerCase());
    return index >= 0 ? index : 100;
  }

  async function readDirectTable(descriptor) {
    const rows = parseCsv(await descriptor.file.text());
    if (!rows.length) return { descriptor, records: [], rows: 0, eligibleRows: 0, annotatedRows: 0 };
    const schema = detectSchema(rows[0]);
    const records = [];
    let eligibleRows = 0;
    let annotatedRows = 0;
    rows.slice(1).forEach((row) => {
      const experiment = experimentNumber(row[schema.columns.experiment]);
      const clusterId = integer(row[schema.columns.cluster]);
      if (experiment == null || clusterId == null) return;
      eligibleRows += 1;
      const region = String(row[schema.columns.region] || "").trim();
      if (!region) return;
      annotatedRows += 1;
      records.push({
        experiment,
        clusterId,
        region,
        atlasColor: schema.columns.color >= 0 ? color(row[schema.columns.color]) : null,
        depthUm: schema.columns.depth >= 0 ? numeric(row[schema.columns.depth]) : null,
        shankId: schema.columns.shank >= 0 ? integer(row[schema.columns.shank]) : null,
        sourceFile: descriptor.name
      });
    });
    return { descriptor, records, rows: Math.max(0, rows.length - 1), eligibleRows, annotatedRows };
  }

  async function readCoordinateTable(descriptor) {
    const rows = parseCsv(await descriptor.file.text());
    if (!rows.length) return { descriptor, records: [], rows: 0 };
    const schema = detectSchema(rows[0]);
    const records = rows.slice(1).map((row) => {
      const electrode = integer(row[schema.columns.electrode]);
      const region = String(row[schema.columns.region] || "").trim();
      if (electrode == null || !region) return null;
      return {
        electrode,
        region,
        atlasId: schema.columns.atlasId >= 0 ? integer(row[schema.columns.atlasId]) : null,
        atlasColor: schema.columns.color >= 0 ? color(row[schema.columns.color]) : null,
        depthUm: schema.columns.depth >= 0 ? numeric(row[schema.columns.depth]) : null,
        shankId: schema.columns.shank >= 0 ? integer(row[schema.columns.shank]) : null,
        sourceFile: descriptor.name
      };
    }).filter(Boolean);
    return { descriptor, records, rows: Math.max(0, rows.length - 1) };
  }

  async function scanLegacyFolder(files) {
    const allFiles = [...files];
    const csvFiles = allFiles.filter((file) => fileNameOf(file).toLowerCase().endsWith(".csv"));
    const descriptors = await Promise.all(csvFiles.map(describeCsv));
    const compatibleDirect = descriptors.filter((item) => item.schema.direct);
    const canonicalDirect = compatibleDirect.filter((item) => DIRECT_CANONICAL.includes(item.name.toLowerCase()));
    const selectedDirect = (canonicalDirect.length ? canonicalDirect : compatibleDirect)
      .sort((left, right) => directPriority(left.name) - directPriority(right.name) || left.name.localeCompare(right.name));
    const coordinateCandidates = descriptors.filter((item) => item.schema.coordinate)
      .sort((left, right) => (left.name.toLowerCase() === "pinpoint_parsed.csv" ? -1 : 0) - (right.name.toLowerCase() === "pinpoint_parsed.csv" ? -1 : 0) || left.name.localeCompare(right.name));

    if (!selectedDirect.length) {
      return {
        valid: false,
        folderName: rootName(allFiles),
        fileCount: allFiles.length,
        csvCount: csvFiles.length,
        compatibleDirect: [],
        coordinateFiles: coordinateCandidates.map((item) => item.name),
        conclusion: "No CSV contains compatible experiment, cluster, and region columns."
      };
    }

    const directTables = await Promise.all(selectedDirect.map(readDirectTable));
    const coordinateTables = await Promise.all(coordinateCandidates.slice(0, 1).map(readCoordinateTable));
    const mapping = new Map();
    const conflicts = [];
    directTables.forEach((table) => {
      table.records.forEach((record) => {
        const key = `${record.experiment}::${record.clusterId}`;
        const existing = mapping.get(key);
        if (!existing) {
          mapping.set(key, record);
          return;
        }
        if (existing.region !== record.region) {
          conflicts.push({ key, kept: existing.region, ignored: record.region, keptSource: existing.sourceFile, ignoredSource: record.sourceFile });
          return;
        }
        if (!existing.atlasColor && record.atlasColor) existing.atlasColor = record.atlasColor;
        if (existing.depthUm == null && record.depthUm != null) existing.depthUm = record.depthUm;
        if (existing.shankId == null && record.shankId != null) existing.shankId = record.shankId;
      });
    });

    const coordinateRecords = coordinateTables.flatMap((table) => table.records);
    const regions = [...new Set([...mapping.values()].map((record) => record.region))].sort();
    const experiments = [...new Set([...mapping.values()].map((record) => record.experiment))].sort((a, b) => a - b);
    const sourceRows = directTables.reduce((total, table) => total + table.rows, 0);
    const eligibleRows = directTables.reduce((total, table) => total + table.eligibleRows, 0);
    const annotatedRows = directTables.reduce((total, table) => total + table.annotatedRows, 0);
    const ignoredCompatible = compatibleDirect.filter((item) => !selectedDirect.includes(item)).map((item) => item.name);
    const primary = directTables[0]?.descriptor.name || selectedDirect[0].name;
    const conclusion = `${mapping.size.toLocaleString()} unique unit-region annotations across ${experiments.length} experiments and ${regions.length} regions. ${conflicts.length} conflicting rows.`;

    return {
      valid: mapping.size > 0,
      folderName: rootName(allFiles),
      fileCount: allFiles.length,
      csvCount: csvFiles.length,
      compatibleDirect: compatibleDirect.map((item) => item.name),
      selectedDirect: directTables.map((table) => ({
        name: table.descriptor.name,
        rows: table.rows,
        eligibleRows: table.eligibleRows,
        annotatedRows: table.annotatedRows
      })),
      ignoredCompatible,
      coordinateFiles: coordinateTables.map((table) => ({ name: table.descriptor.name, rows: table.rows, mappedRows: table.records.length })),
      primarySource: primary,
      sourceRows,
      eligibleRows,
      annotatedRows,
      mapping,
      coordinateRecords,
      mappingCount: mapping.size,
      coordinateCount: coordinateRecords.length,
      experimentCount: experiments.length,
      experiments,
      regionCount: regions.length,
      regions,
      conflicts,
      conclusion
    };
  }

  return {
    DIRECT_CANONICAL,
    ALIASES,
    pathOf,
    fileNameOf,
    parseCsv,
    detectSchema,
    experimentNumber,
    scanLegacyFolder
  };
});
