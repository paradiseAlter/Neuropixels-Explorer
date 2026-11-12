((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelExplorerCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const REQUIRED = ["spike_times.npy", "spike_clusters.npy", "params.py"];
  const LABEL_FILES = ["cluster_group.tsv", "cluster_kslabel.tsv", "cluster_info.tsv"];
  const USEFUL_NAMES = new Set([
    ...REQUIRED,
    ...LABEL_FILES,
    "cluster_amplitude.tsv",
    "cluster_contampct.tsv",
    "amplitudes.npy",
    "spike_positions.npy",
    "spike_templates.npy",
    "templates.npy",
    "templates_ind.npy",
    "channel_positions.npy",
    "channel_geometry.csv",
    "channel_map.npy",
    "channel_shanks.npy",
    "explorer-events.json"
  ]);
  const ROLE_BY_NAME = Object.freeze({
    "spike_times.npy": "spike_times",
    "spike_clusters.npy": "spike_clusters",
    "amplitudes.npy": "spike_amplitudes",
    "spike_positions.npy": "spike_positions",
    "spike_templates.npy": "spike_templates",
    "templates.npy": "templates",
    "templates_ind.npy": "template_indices",
    "channel_map.npy": "channel_map",
    "channel_positions.npy": "channel_positions",
    "channel_shanks.npy": "channel_probe_groups",
    "channel_geometry.csv": "channel_geometry"
  });

  function pathOf(file) {
    return String(file?.webkitRelativePath || file?.relativePath || file?.name || "").replaceAll("\\", "/");
  }

  function fileNameOf(file) {
    const parts = pathOf(file).split("/").filter(Boolean);
    return (parts.at(-1) || String(file?.name || "")).toLowerCase();
  }

  function roleForFile(file) {
    const filename = fileNameOf(file);
    if (ROLE_BY_NAME[filename]) return ROLE_BY_NAME[filename];
    if (LABEL_FILES.includes(filename) || (filename.startsWith("cluster_") && filename.endsWith(".tsv"))) return "unit_metadata";
    return null;
  }

  function detectRecordingFromPath(recordings, file) {
    const parts = pathOf(file).split("/").filter(Boolean).slice(0, -1).map((part) => part.toLowerCase());
    const exact = recordings.filter((recording) => parts.includes(String(recording.name).toLowerCase()) || parts.includes(String(recording.key).toLowerCase()));
    if (exact.length === 1) return exact[0];
    const numbers = new Set(parts.map((part) => Number(part.match(/(?:ks\d*[_-]?)?exp(?:eriment)?[_-]?(\d+)/i)?.[1])).filter(Number.isFinite));
    const numbered = recordings.filter((recording) => numbers.has(Number(recording.recordingIndex || String(recording.name).match(/(\d+)/)?.[1])));
    return numbered.length === 1 ? numbered[0] : null;
  }

  function rootName(files) {
    const parts = pathOf(files[0]).split("/").filter(Boolean);
    return parts[0] || "selected-folder";
  }

  function formatBytes(value) {
    const size = Number(value) || 0;
    if (!size) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const order = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
    return `${(size / 1024 ** order).toFixed(order > 1 ? 2 : 0)} ${units[order]}`;
  }

  function groupExperimentFiles(files) {
    const groups = new Map();
    [...files].forEach((file) => {
      const parts = pathOf(file).split("/").filter(Boolean);
      const filename = (parts.pop() || String(file.name || "")).toLowerCase();
      const directory = parts.join("/") || ".";
      const group = groups.get(directory) || {
        key: directory,
        name: parts.at(-1) || "selected-folder",
        files: [],
        byName: new Map()
      };
      group.files.push(file);
      group.byName.set(filename, file);
      groups.set(directory, group);
    });
    return [...groups.values()]
      .filter((group) => REQUIRED.some((name) => group.byName.has(name)))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));
  }

  function parseNpyHeaderBuffer(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length < 10 || bytes[0] !== 0x93 || String.fromCharCode(...bytes.slice(1, 6)) !== "NUMPY") {
      throw new Error("Not a valid NPY file");
    }
    const major = bytes[6];
    const lengthBytes = major === 1 ? 2 : 4;
    if (bytes.length < 8 + lengthBytes) throw new Error("NPY header is truncated");
    const view = new DataView(arrayBuffer);
    const headerLength = lengthBytes === 2 ? view.getUint16(8, true) : view.getUint32(8, true);
    const headerStart = 8 + lengthBytes;
    const dataOffset = headerStart + headerLength;
    if (bytes.length < dataOffset) throw new Error("NPY header payload is truncated");
    const headerText = new TextDecoder("latin1").decode(bytes.slice(headerStart, dataOffset));
    const descrMatch = headerText.match(/["']descr["']\s*:\s*["']([^"']+)["']/);
    const fortranMatch = headerText.match(/["']fortran_order["']\s*:\s*(True|False)/);
    const shapeMatch = headerText.match(/["']shape["']\s*:\s*\(([^)]*)\)/);
    if (!descrMatch || !fortranMatch || !shapeMatch) throw new Error("NPY header fields are incomplete");
    const shape = shapeMatch[1].split(",").map((value) => value.trim()).filter(Boolean).map(Number);
    if (!shape.length || shape.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("NPY shape is invalid");
    const descr = descrMatch[1];
    const itemSize = Number(descr.match(/(\d+)$/)?.[1]);
    if (!itemSize) throw new Error(`Unsupported NPY dtype: ${descr}`);
    return {
      version: `${major}.${bytes[7]}`,
      descr,
      fortranOrder: fortranMatch[1] === "True",
      shape,
      count: shape.reduce((total, value) => total * value, 1),
      itemSize,
      headerLength,
      dataOffset
    };
  }

  async function readNpyHeader(file) {
    const prefix = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(prefix);
    if (bytes.length < 10 || bytes[0] !== 0x93 || String.fromCharCode(...bytes.slice(1, 6)) !== "NUMPY") {
      throw new Error(`${fileNameOf(file)} is not a valid NPY file`);
    }
    const lengthBytes = bytes[6] === 1 ? 2 : 4;
    const headerLength = lengthBytes === 2 ? new DataView(prefix).getUint16(8, true) : new DataView(prefix).getUint32(8, true);
    return parseNpyHeaderBuffer(await file.slice(0, 8 + lengthBytes + headerLength).arrayBuffer());
  }

  function scalarFromDataView(view, offset, descr) {
    const littleEndian = !descr.startsWith(">");
    const kind = descr.at(-2);
    const size = Number(descr.match(/(\d+)$/)?.[1]);
    if (kind === "i" && size === 8) return Number(view.getBigInt64(offset, littleEndian));
    if (kind === "u" && size === 8) return Number(view.getBigUint64(offset, littleEndian));
    if (kind === "i" && size === 4) return view.getInt32(offset, littleEndian);
    if (kind === "u" && size === 4) return view.getUint32(offset, littleEndian);
    if (kind === "i" && size === 2) return view.getInt16(offset, littleEndian);
    if (kind === "u" && size === 2) return view.getUint16(offset, littleEndian);
    if (kind === "i" && size === 1) return view.getInt8(offset);
    if (kind === "u" && size === 1) return view.getUint8(offset);
    if (kind === "f" && size === 8) return view.getFloat64(offset, littleEndian);
    if (kind === "f" && size === 4) return view.getFloat32(offset, littleEndian);
    throw new Error(`Unsupported NPY dtype: ${descr}`);
  }

  function typedData(arrayBuffer, header) {
    if (header.descr.startsWith(">")) return null;
    const kind = header.descr.at(-2);
    const size = header.itemSize;
    const offset = header.dataOffset;
    const count = header.count;
    if (kind === "i" && size === 8) return new BigInt64Array(arrayBuffer, offset, count);
    if (kind === "u" && size === 8) return new BigUint64Array(arrayBuffer, offset, count);
    if (kind === "i" && size === 4) return new Int32Array(arrayBuffer, offset, count);
    if (kind === "u" && size === 4) return new Uint32Array(arrayBuffer, offset, count);
    if (kind === "i" && size === 2) return new Int16Array(arrayBuffer, offset, count);
    if (kind === "u" && size === 2) return new Uint16Array(arrayBuffer, offset, count);
    if (kind === "i" && size === 1) return new Int8Array(arrayBuffer, offset, count);
    if (kind === "u" && size === 1) return new Uint8Array(arrayBuffer, offset, count);
    if (kind === "f" && size === 8) return new Float64Array(arrayBuffer, offset, count);
    if (kind === "f" && size === 4) return new Float32Array(arrayBuffer, offset, count);
    return null;
  }

  function parseNpyArrayBuffer(arrayBuffer) {
    const header = parseNpyHeaderBuffer(arrayBuffer);
    const expected = header.dataOffset + header.count * header.itemSize;
    if (arrayBuffer.byteLength < expected) throw new Error(`NPY payload is truncated: expected ${expected} bytes`);
    const typed = typedData(arrayBuffer, header);
    const view = typed ? null : new DataView(arrayBuffer);
    return {
      header,
      byteLength: arrayBuffer.byteLength,
      valueAt(index) {
        if (index < 0 || index >= header.count) return undefined;
        return typed ? Number(typed[index]) : scalarFromDataView(view, header.dataOffset + index * header.itemSize, header.descr);
      }
    };
  }

  async function readNpyLastValue(file, header) {
    if (!header.count) return 0;
    const start = header.dataOffset + (header.count - 1) * header.itemSize;
    const buffer = await file.slice(start, start + header.itemSize).arrayBuffer();
    return scalarFromDataView(new DataView(buffer), 0, header.descr);
  }

  function parseSampleRate(text) {
    const match = String(text).match(/^\s*sample_rate\s*=\s*([0-9.eE+\-]+)/m);
    const value = Number(match?.[1]);
    if (!Number.isFinite(value) || value <= 0) throw new Error("params.py does not define a valid sample_rate");
    return value;
  }

  function parseRows(text, separator = "\t") {
    const rows = String(text || "").replaceAll("\r", "").split("\n").filter((line) => line.trim()).map((line) => line.split(separator));
    if (!rows.length) return { headers: [], rows: [] };
    return { headers: rows[0].map((value) => value.trim().toLowerCase()), rows: rows.slice(1) };
  }

  function parseClusterLabels(text) {
    const table = parseRows(text);
    const idIndex = table.headers.findIndex((value) => ["cluster_id", "id", "cluster"].includes(value));
    const labelIndex = table.headers.findIndex((value) => ["kslabel", "group", "label", "quality"].includes(value));
    if (idIndex < 0) return [];
    return table.rows.map((row) => {
      const id = Number(row[idIndex]);
      if (!Number.isFinite(id)) return null;
      return { id, quality: String(row[labelIndex] || "unknown").trim().toLowerCase() || "unknown" };
    }).filter(Boolean).sort((left, right) => left.id - right.id);
  }

  function parseClusterMetric(text, preferredHeaders) {
    const table = parseRows(text);
    const idIndex = table.headers.findIndex((value) => ["cluster_id", "id", "cluster"].includes(value));
    const valueIndex = table.headers.findIndex((value) => preferredHeaders.includes(value));
    const result = new Map();
    if (idIndex < 0 || valueIndex < 0) return result;
    table.rows.forEach((row) => {
      const id = Number(row[idIndex]);
      const value = Number(row[valueIndex]);
      if (Number.isFinite(id) && Number.isFinite(value)) result.set(id, value);
    });
    return result;
  }

  function labelFile(group) {
    return LABEL_FILES.map((name) => group.byName.get(name)).find(Boolean) || null;
  }

  function capabilitiesFor(group) {
    const names = group.byName;
    return {
      spikes: names.has("spike_times.npy") && names.has("spike_clusters.npy"),
      quality: Boolean(labelFile(group)),
      amplitude: names.has("amplitudes.npy"),
      position: names.has("spike_positions.npy"),
      template: names.has("templates.npy") && names.has("spike_templates.npy"),
      geometry: names.has("channel_positions.npy") || names.has("channel_geometry.csv"),
      probeGrouping: names.has("channel_shanks.npy") || names.has("channel_geometry.csv"),
      video: group.files.some((file) => /\.(mp4|webm|mov|avi|mkv)$/i.test(fileNameOf(file))),
      events: names.has("explorer-events.json"),
      rawVoltage: names.has("continuous.dat")
    };
  }

  async function indexExperiment(group) {
    const missing = REQUIRED.filter((name) => !group.byName.has(name));
    if (missing.length) throw new Error(`${group.name}: missing ${missing.join(", ")}`);
    const spikeTimesFile = group.byName.get("spike_times.npy");
    const spikeClustersFile = group.byName.get("spike_clusters.npy");
    const paramsFile = group.byName.get("params.py");
    const labelsFile = labelFile(group);
    const amplitudeMetricFile = group.byName.get("cluster_amplitude.tsv");
    const contaminationFile = group.byName.get("cluster_contampct.tsv");
    const [timesHeader, clustersHeader, paramsText, labelsText, amplitudeText, contaminationText] = await Promise.all([
      readNpyHeader(spikeTimesFile),
      readNpyHeader(spikeClustersFile),
      paramsFile.text(),
      labelsFile ? labelsFile.text() : Promise.resolve(""),
      amplitudeMetricFile ? amplitudeMetricFile.text() : Promise.resolve(""),
      contaminationFile ? contaminationFile.text() : Promise.resolve("")
    ]);
    if (timesHeader.shape.length !== 1 || clustersHeader.shape.length !== 1) throw new Error(`${group.name}: spike arrays must be one-dimensional`);
    if (timesHeader.count !== clustersHeader.count) throw new Error(`${group.name}: spike array lengths differ`);
    const sampleRate = parseSampleRate(paramsText);
    const lastSample = await readNpyLastValue(spikeTimesFile, timesHeader);
    const clusterLabels = parseClusterLabels(labelsText);
    const usefulFiles = group.files.filter((file) => USEFUL_NAMES.has(fileNameOf(file)));
    const totalBytes = group.files.reduce((total, file) => total + Number(file.size || 0), 0);
    return {
      key: group.key,
      name: group.name,
      files: group.files,
      byName: group.byName,
      spikeTimesFile,
      spikeClustersFile,
      eventsFile: group.byName.get("explorer-events.json") || null,
      sampleRate,
      spikeCount: timesHeader.count,
      duration: Number(lastSample || 0) / sampleRate,
      clusterLabels,
      amplitudeByCluster: parseClusterMetric(amplitudeText, ["amplitude"]),
      contaminationByCluster: parseClusterMetric(contaminationText, ["contampct", "contamination", "contamination_pct"]),
      totalBytes,
      fileCount: group.files.length,
      usefulFileCount: usefulFiles.length,
      capabilities: capabilitiesFor(group),
      headers: { spikeTimes: timesHeader, spikeClusters: clustersHeader }
    };
  }

  async function validateSupplementFile(recording, file) {
    const role = roleForFile(file);
    if (!role) throw new Error(`${file.name}: unsupported supplement file`);
    if (!fileNameOf(file).endsWith(".npy")) return { role, shape: null, dtype: null };
    const header = await readNpyHeader(file);
    const shape = header.shape;
    const spikeCount = Number(recording.spikeCount);
    if (["spike_times", "spike_clusters"].includes(role) && shape.length !== 1) {
      throw new Error(`${file.name}: expected a one-dimensional spike array, found (${shape.join(", ")})`);
    }
    if (["spike_times", "spike_clusters", "spike_amplitudes", "spike_positions", "spike_templates"].includes(role) && shape[0] !== spikeCount) {
      throw new Error(`${file.name}: ${shape[0]} spike rows do not match ${recording.name} (${spikeCount})`);
    }
    if (role === "spike_positions" && (shape.length !== 2 || shape[1] < 2)) {
      throw new Error(`${file.name}: expected shape (spikes, >=2), found (${shape.join(", ")})`);
    }
    if (role === "templates" && (shape.length !== 3 || shape.some((value) => value <= 0))) {
      throw new Error(`${file.name}: expected shape (templates, samples, channels), found (${shape.join(", ")})`);
    }
    if (role === "channel_positions" && (shape.length !== 2 || shape[1] < 2)) {
      throw new Error(`${file.name}: expected shape (channels, >=2), found (${shape.join(", ")})`);
    }
    if (role === "channel_probe_groups" && shape.length !== 1) {
      throw new Error(`${file.name}: expected one Probe-group value per channel`);
    }
    let channelCount = null;
    const existingPositions = recording.byName.get("channel_positions.npy");
    if (existingPositions && existingPositions !== file) channelCount = (await readNpyHeader(existingPositions)).shape[0];
    if (role === "templates" && channelCount && shape[2] !== channelCount) {
      throw new Error(`${file.name}: ${shape[2]} channels do not match ${recording.name} (${channelCount})`);
    }
    if (["channel_positions", "channel_probe_groups"].includes(role) && channelCount && shape[0] !== channelCount) {
      throw new Error(`${file.name}: ${shape[0]} channels do not match ${recording.name} (${channelCount})`);
    }
    return { role, shape, dtype: header.descr };
  }

  async function mergeSupplementFiles(recording, files) {
    const additions = [];
    const duplicates = [];
    for (const file of files) {
      const filename = fileNameOf(file);
      const existing = recording.byName.get(filename);
      if (existing) {
        if (Number(existing.size) === Number(file.size) && Number(existing.lastModified || 0) === Number(file.lastModified || 0)) {
          duplicates.push(filename);
          continue;
        }
        throw new Error(`${recording.name} already has ${filename}; the different file was not overwritten`);
      }
      await validateSupplementFile(recording, file);
      additions.push(file);
    }
    if (!additions.length) return { recording, additions, duplicates };
    const group = {
      key: recording.key,
      name: recording.name,
      files: [...recording.files, ...additions],
      byName: new Map(recording.byName)
    };
    additions.forEach((file) => group.byName.set(fileNameOf(file), file));
    return { recording: await indexExperiment(group), additions, duplicates };
  }

  function mean(values) {
    if (!values.length) return null;
    let total = 0;
    for (let index = 0; index < values.length; index += 1) total += Number(values[index]);
    return total / values.length;
  }

  const ACTIVITY_PREPROCESSING_VERSION = "3.0.0";
  const ACTIVITY_LEVELS = Object.freeze([128, 256, 512, 1024, 2048]);

  function activityFileFingerprint(files, sampleRate, dataVersion = 0) {
    const metadata = Object.entries(files || {})
      .filter(([, file]) => Boolean(file))
      .map(([role, file]) => [role, file.name || "", Number(file.size || 0), Number(file.lastModified || 0)])
      .sort((left, right) => left[0].localeCompare(right[0]));
    const text = JSON.stringify({ version: ACTIVITY_PREPROCESSING_VERSION, sampleRate: Number(sampleRate), dataVersion: Number(dataVersion || 0), files: metadata });
    let first = 2166136261;
    let second = 2246822519;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      first = Math.imul(first ^ code, 16777619) >>> 0;
      second = Math.imul(second ^ code, 3266489917) >>> 0;
    }
    return `${ACTIVITY_PREPROCESSING_VERSION}:${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
  }

  function nearestActivityLevel(requestedBinCount = 512) {
    const requested = Number(requestedBinCount || 512);
    return ACTIVITY_LEVELS.reduce((best, level) => Math.abs(level - requested) < Math.abs(best - requested) ? level : best, ACTIVITY_LEVELS[0]);
  }

  function activityMatricesFromCounts(binnedCounts, unitCount, binCount) {
    const normalizedActivity = new Uint8Array(unitCount * binCount);
    const unusualActivity = new Uint8Array(unitCount * binCount);
    const unusualThresholdCounts = new Uint32Array(unitCount);
    for (let row = 0; row < unitCount; row += 1) {
      const positive = [];
      const offset = row * binCount;
      for (let bin = 0; bin < binCount; bin += 1) {
        const value = binnedCounts[offset + bin];
        if (value > 0) positive.push(value);
      }
      positive.sort((left, right) => left - right);
      const robustMaximum = positive.length ? positive[Math.min(positive.length - 1, Math.floor((positive.length - 1) * .95))] : 1;
      const recordingCounts = Array.from(binnedCounts.subarray(offset, offset + binCount)).sort((left, right) => left - right);
      const unusualThreshold = recordingCounts[Math.min(recordingCounts.length - 1, Math.ceil((recordingCounts.length - 1) * .90))] || 0;
      unusualThresholdCounts[row] = unusualThreshold;
      for (let bin = 0; bin < binCount; bin += 1) {
        normalizedActivity[offset + bin] = Math.round(Math.min(1, binnedCounts[offset + bin] / Math.max(1, robustMaximum)) * 255);
        unusualActivity[offset + bin] = binnedCounts[offset + bin] > unusualThreshold ? 255 : 0;
      }
    }
    return { normalizedActivity, unusualActivity, unusualThresholdCounts };
  }

  function buildActivityOverviewBuffers(buffers, sampleRate, requestedBinCount = 512, options = {}) {
    const times = parseNpyArrayBuffer(buffers.spikeTimes);
    const clusters = parseNpyArrayBuffer(buffers.spikeClusters);
    if (times.header.shape.length !== 1 || clusters.header.shape.length !== 1) throw new Error("Spike arrays must be one-dimensional");
    if (times.header.count !== clusters.header.count) throw new Error("Spike array lengths do not match");
    const positions = buffers.spikePositions ? parseNpyArrayBuffer(buffers.spikePositions) : null;
    const spikeTemplates = buffers.spikeTemplates ? parseNpyArrayBuffer(buffers.spikeTemplates) : null;
    const templates = buffers.templates ? parseNpyArrayBuffer(buffers.templates) : null;
    const channelPositions = buffers.channelPositions ? parseNpyArrayBuffer(buffers.channelPositions) : null;
    const channelShanks = buffers.channelShanks ? parseNpyArrayBuffer(buffers.channelShanks) : null;
    const duration = times.header.count ? Number(times.valueAt(times.header.count - 1)) / Number(sampleRate) : 0;
    const binCount = Math.max(64, Math.min(2048, Math.round(Number(requestedBinCount) || 512)));
    const binSeconds = duration > 0 ? duration / binCount : 1;
    const countsByUnit = new Map();
    const positionSums = new Map();
    const templatesByUnit = new Map();

    for (let index = 0; index < clusters.header.count; index += 1) {
      const id = Number(clusters.valueAt(index));
      countsByUnit.set(id, (countsByUnit.get(id) || 0) + 1);
      if (positions?.header.shape.length === 2 && positions.header.shape[0] === clusters.header.count && positions.header.shape[1] >= 2) {
        const columns = positions.header.shape[1];
        const location = positionSums.get(id) || { x: 0, y: 0, count: 0 };
        location.x += Number(positions.valueAt(index * columns));
        location.y += Number(positions.valueAt(index * columns + 1));
        location.count += 1;
        positionSums.set(id, location);
      }
      if (spikeTemplates?.header.count === clusters.header.count) {
        const templateId = Number(spikeTemplates.valueAt(index));
        const candidates = templatesByUnit.get(id) || new Map();
        candidates.set(templateId, (candidates.get(templateId) || 0) + 1);
        templatesByUnit.set(id, candidates);
      }
    }

    const sortedIds = [...countsByUnit.keys()].sort((left, right) => left - right);
    const unitIndex = new Map(sortedIds.map((id, index) => [id, index]));
    const unitIds = Int32Array.from(sortedIds);
    const unitCounts = new Uint32Array(unitIds.length);
    const unitRateHz = new Float32Array(unitIds.length);
    const unitX = new Float32Array(unitIds.length);
    const unitDepths = new Float32Array(unitIds.length);
    const unitShankIds = new Int16Array(unitIds.length);
    unitX.fill(Number.NaN);
    unitDepths.fill(Number.NaN);
    unitShankIds.fill(-1);
    const binnedCounts = new Uint32Array(unitIds.length * binCount);

    for (let index = 0; index < clusters.header.count; index += 1) {
      const row = unitIndex.get(Number(clusters.valueAt(index)));
      if (row == null) continue;
      const seconds = Number(times.valueAt(index)) / Number(sampleRate);
      const bin = Math.max(0, Math.min(binCount - 1, Math.floor(seconds / binSeconds)));
      binnedCounts[row * binCount + bin] += 1;
    }

    const peakChannelCache = new Map();
    const peakChannelForTemplate = (templateId) => {
      const normalized = Number(templateId);
      if (peakChannelCache.has(normalized)) return peakChannelCache.get(normalized);
      if (!(templates?.header.shape.length === 3) || normalized < 0 || normalized >= templates.header.shape[0]) return null;
      const timePoints = templates.header.shape[1];
      const channels = templates.header.shape[2];
      let bestChannel = null;
      let bestRange = -Infinity;
      for (let channel = 0; channel < channels; channel += 1) {
        let minimum = Infinity;
        let maximum = -Infinity;
        for (let time = 0; time < timePoints; time += 1) {
          const value = Number(templates.valueAt((normalized * timePoints + time) * channels + channel));
          minimum = Math.min(minimum, value);
          maximum = Math.max(maximum, value);
        }
        if (maximum - minimum > bestRange) {
          bestRange = maximum - minimum;
          bestChannel = channel;
        }
      }
      peakChannelCache.set(normalized, bestChannel);
      return bestChannel;
    };

    unitIds.forEach((id, row) => {
      const count = Number(countsByUnit.get(Number(id)) || 0);
      unitCounts[row] = count;
      unitRateHz[row] = duration > 0 ? count / duration : 0;
      const location = positionSums.get(Number(id));
      if (location?.count) {
        unitX[row] = location.x / location.count;
        unitDepths[row] = location.y / location.count;
      }
      const candidates = templatesByUnit.get(Number(id));
      const dominantTemplate = candidates?.size
        ? [...candidates.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0][0]
        : Number(id);
      const peakChannel = peakChannelForTemplate(dominantTemplate);
      if (peakChannel != null && channelShanks?.header.count > peakChannel) unitShankIds[row] = Number(channelShanks.valueAt(peakChannel));

    });

    const matrices = activityMatricesFromCounts(binnedCounts, unitIds.length, binCount);

    const result = {
      duration,
      binCount,
      binSeconds,
      totalSpikes: times.header.count,
      unitIds,
      unitCounts,
      unitRateHz,
      unitX,
      unitDepths,
      unitShankIds,
      ...matrices,
      semantics: {
        individual: "spike count per recording-wide bin divided by the Unit's non-empty-bin 95th percentile and clipped to [0, 1]",
        aggregate: "fraction of constituent Units whose bin count is strictly above that Unit's recording-wide 90th-percentile bin count at the selected pyramid level",
        unusualThreshold: "recording-wide 90th percentile across all bins at the selected pyramid level for each Unit; sparse Units with a zero threshold are unusual in bins containing at least one spike",
        rawFiringRate: false
      }
    };
    if (options.includeCounts) result.binnedCounts = binnedCounts;
    return result;
  }

  function buildActivityPyramidBuffers(buffers, sampleRate, sourceFingerprint = "") {
    const finest = buildActivityOverviewBuffers(buffers, sampleRate, ACTIVITY_LEVELS[ACTIVITY_LEVELS.length - 1], { includeCounts: true });
    const levels = [];
    for (const binCount of ACTIVITY_LEVELS) {
      let matrices;
      if (binCount === finest.binCount) {
        matrices = {
          normalizedActivity: finest.normalizedActivity,
          unusualActivity: finest.unusualActivity,
          unusualThresholdCounts: finest.unusualThresholdCounts
        };
      } else {
        const factor = finest.binCount / binCount;
        const counts = new Uint32Array(finest.unitIds.length * binCount);
        for (let row = 0; row < finest.unitIds.length; row += 1) {
          for (let bin = 0; bin < binCount; bin += 1) {
            let total = 0;
            const sourceOffset = row * finest.binCount + bin * factor;
            for (let part = 0; part < factor; part += 1) total += finest.binnedCounts[sourceOffset + part];
            counts[row * binCount + bin] = total;
          }
        }
        matrices = activityMatricesFromCounts(counts, finest.unitIds.length, binCount);
      }
      levels.push({ binCount, binSeconds: finest.duration > 0 ? finest.duration / binCount : 1, ...matrices });
    }
    delete finest.binnedCounts;
    delete finest.normalizedActivity;
    delete finest.unusualActivity;
    delete finest.unusualThresholdCounts;
    return {
      ...finest,
      pyramid: {
        cacheFormat: "neuropixels-display-activity-pyramid",
        preprocessingVersion: ACTIVITY_PREPROCESSING_VERSION,
        sourceFingerprint,
        cacheIdentity: `${ACTIVITY_PREPROCESSING_VERSION}:${sourceFingerprint}`,
        availableBinCounts: [...ACTIVITY_LEVELS],
        mapping: {
          rows: "row index maps to unitIds[row]",
          bins: "bin maps to the half-open interval [bin * binSeconds, (bin + 1) * binSeconds)"
        }
      },
      levels
    };
  }

  function selectActivityPyramidLevel(pyramid, requestedBinCount = 512) {
    const selectedBinCount = nearestActivityLevel(requestedBinCount);
    const level = pyramid.levels.find((item) => Number(item.binCount) === selectedBinCount) || pyramid.levels[0];
    return {
      ...pyramid,
      levels: undefined,
      binCount: level.binCount,
      binSeconds: level.binSeconds,
      normalizedActivity: level.normalizedActivity,
      unusualActivity: level.unusualActivity,
      unusualThresholdCounts: level.unusualThresholdCounts,
      pyramid: { ...pyramid.pyramid, selectedBinCount: level.binCount }
    };
  }

  function buildTemplateFootprint(buffers, sampleRate, clusterId) {
    const result = { status: "missing_templates", channels: [], amplitudeUnit: "stored", scope: "recording_template", source: "templates.npy", templateId: null };
    const fail = status => ({ ...result, status });
    if (!buffers.templates || !buffers.spikeTemplates) return result;
    const read = key => {
      if (!buffers[key]) return null;
      const array = parseNpyArrayBuffer(buffers[key]);
      if (!array.header.fortranOrder || array.header.shape.length < 2) return array;
      return { ...array, valueAt(index) {
        const shape = array.header.shape; let physical = 0, stride = 1;
        for (let axis = 0; axis < shape.length; axis++) {
          const trailing = shape.slice(axis+1).reduce((a,b) => a*b,1);
          physical += Math.floor(index/trailing)%shape[axis]*stride; stride *= shape[axis];
        }
        return array.valueAt(physical);
      }};
    };
    const templates = read("templates"), assignments = read("spikeTemplates"), clusters = read("spikeClusters");
    if (!clusters || assignments.header.count !== clusters.header.count) return fail("invalid_assignments");
    const counts = new Map(); let total = 0;
    for (let i = 0; i < clusters.header.count; i++) {
      if (clusters.valueAt(i) !== Number(clusterId)) continue;
      const id = assignments.valueAt(i);
      if (!Number.isInteger(id) || id < 0 || id >= templates.header.shape[0]) return fail("invalid_assignments");
      counts.set(id, (counts.get(id) || 0) + 1); total++;
    }
    if (!total) return fail("no_spikes");
    if (templates.header.shape.length !== 3) return fail("invalid_assignments");
    const [templateId, count] = [...counts].sort((a,b) => b[1]-a[1] || a[0]-b[0])[0];
    const [, samples, channelCount] = templates.header.shape;
    const positions = read("channelPositions"), indices = read("templateIndices"), map = read("channelMap"), shanks = read("channelShanks");
    if (!positions) return fail("missing_geometry");
    if (positions.header.shape.length !== 2 || positions.header.shape[0] !== channelCount || positions.header.shape[1] < 2 || samples < 2 || channelCount < 1 || samples * channelCount > 2000000) return fail("unsupported_layout");
    if (indices && (indices.header.shape.length !== 2 || indices.header.shape[0] !== templates.header.shape[0] || indices.header.shape[1] !== channelCount)) return fail("unsupported_layout");
    if (map && map.header.count !== channelCount) return fail("invalid_channel_map");
    if (!(Number.isFinite(sampleRate) && sampleRate > 0)) return fail("invalid_values");
    const channels = [], channelIds = new Set(); let peakChannelIndex = 0, peak = -1;
    const finite = n => Number.isFinite(n) ? n : null;
    for (let c = 0; c < channelCount; c++) {
      if (indices && indices.valueAt(templateId * channelCount + c) !== c) return fail("unsupported_layout");
      const channelId = map ? map.valueAt(c) : null;
      if (map && (!Number.isInteger(channelId) || channelId < 0 || channelIds.has(channelId))) return fail("invalid_channel_map");
      channelIds.add(channelId);
      const waveform = []; let min = Infinity, max = -Infinity;
      for (let s = 0; s < samples; s++) {
        const v = templates.valueAt((templateId * samples + s) * channelCount + c);
        if (!Number.isFinite(v)) return fail("invalid_values");
        waveform.push(v); min = Math.min(min, v); max = Math.max(max, v);
      }
      if (max-min > peak) { peak = max-min; peakChannelIndex = c; }
      const shank = shanks && c < shanks.header.count ? shanks.valueAt(c) : null;
      channels.push({ index: c, channelId, xUm: finite(positions.valueAt(c * positions.header.shape[1])), depthUm: finite(positions.valueAt(c * positions.header.shape[1]+1)), shankId: Number.isInteger(shank) && shank >= 0 ? shank : null, peakToPeak: max-min, waveform });
    }
    return { ...result, status: "available", templateId, templateCount: counts.size, templateSpikeCount: count, unitSpikeCount: total, sampleRate, sampleCount: samples, peakChannelIndex, channels };
  }

  function analyzeUnitBuffers(buffers, sampleRate, clusterId) {
    const times = parseNpyArrayBuffer(buffers.spikeTimes);
    const clusters = parseNpyArrayBuffer(buffers.spikeClusters);
    if (times.header.shape.length !== 1 || clusters.header.shape.length !== 1) throw new Error("Spike arrays must be one-dimensional");
    if (times.header.count !== clusters.header.count) throw new Error("Spike array lengths do not match");
    const amplitudes = buffers.amplitudes ? parseNpyArrayBuffer(buffers.amplitudes) : null;
    const positions = buffers.spikePositions ? parseNpyArrayBuffer(buffers.spikePositions) : null;
    const spikeTemplates = buffers.spikeTemplates ? parseNpyArrayBuffer(buffers.spikeTemplates) : null;
    const templates = buffers.templates ? parseNpyArrayBuffer(buffers.templates) : null;
    const channelPositions = buffers.channelPositions ? parseNpyArrayBuffer(buffers.channelPositions) : null;
    const channelShanks = buffers.channelShanks ? parseNpyArrayBuffer(buffers.channelShanks) : null;
    const target = Number(clusterId);
    const duration = times.header.count ? times.valueAt(times.header.count - 1) / sampleRate : 0;
    const counts = new Map();
    const selectedTimes = [];
    const selectedAmplitudes = [];
    const selectedDepths = [];
    const selectedXs = [];
    const templateCounts = new Map();
    const positionSums = new Map();
    const templateCountsByUnit = new Map();

    for (let index = 0; index < clusters.header.count; index += 1) {
      const id = clusters.valueAt(index);
      counts.set(id, (counts.get(id) || 0) + 1);
      if (positions?.header.shape.length === 2 && positions.header.shape[0] === clusters.header.count && positions.header.shape[1] >= 2) {
        const x = positions.valueAt(index * positions.header.shape[1]);
        const y = positions.valueAt(index * positions.header.shape[1] + 1);
        const position = positionSums.get(id) || { x: 0, y: 0, count: 0 };
        position.x += Number(x);
        position.y += Number(y);
        position.count += 1;
        positionSums.set(id, position);
        if (id === target) {
          selectedXs.push(x);
          selectedDepths.push(y);
        }
      }
      if (spikeTemplates && spikeTemplates.header.count === clusters.header.count) {
        const templateId = spikeTemplates.valueAt(index);
        const unitTemplates = templateCountsByUnit.get(id) || new Map();
        unitTemplates.set(templateId, (unitTemplates.get(templateId) || 0) + 1);
        templateCountsByUnit.set(id, unitTemplates);
        if (id === target) templateCounts.set(templateId, (templateCounts.get(templateId) || 0) + 1);
      }
      if (id !== target) continue;
      selectedTimes.push(times.valueAt(index) / sampleRate);
      if (amplitudes && amplitudes.header.count === clusters.header.count) selectedAmplitudes.push(amplitudes.valueAt(index));
    }

    const spikeTimes = Float64Array.from(selectedTimes);
    const rateHz = duration > 0 ? spikeTimes.length / duration : 0;
    const unitSummaries = [...counts.entries()].sort((left, right) => left[0] - right[0]).map(([id, count]) => ({ id, count, rateHz: duration > 0 ? count / duration : 0 }));

    let isiViolationCount = 0;
    for (let index = 1; index < spikeTimes.length; index += 1) {
      if (spikeTimes[index] - spikeTimes[index - 1] < 0.002) isiViolationCount += 1;
    }
    const isiViolationPercent = spikeTimes.length > 1 ? isiViolationCount / (spikeTimes.length - 1) * 100 : 0;

    const presenceBinSeconds = 10;
    const presenceBins = new Uint8Array(Math.max(1, Math.ceil(duration / presenceBinSeconds)));
    for (let index = 0; index < spikeTimes.length; index += 1) presenceBins[Math.min(presenceBins.length - 1, Math.floor(spikeTimes[index] / presenceBinSeconds))] = 1;
    let occupiedBins = 0;
    for (let index = 0; index < presenceBins.length; index += 1) occupiedBins += presenceBins[index];
    const presenceRatio = presenceBins.length ? occupiedBins / presenceBins.length : 0;

    const rateBins = new Float32Array(512);
    const rateBinSeconds = duration > 0 ? duration / rateBins.length : 1;
    for (let index = 0; index < spikeTimes.length; index += 1) {
      const bin = Math.min(rateBins.length - 1, Math.floor(spikeTimes[index] / rateBinSeconds));
      rateBins[bin] += 1 / rateBinSeconds;
    }

    const acg = new Uint32Array(101);
    const acgCenter = 50;
    const acgBinSeconds = 0.002;
    const acgLimitSeconds = 0.1;
    for (let left = 0; left < spikeTimes.length; left += 1) {
      for (let right = left + 1; right < spikeTimes.length; right += 1) {
        const lag = spikeTimes[right] - spikeTimes[left];
        if (lag > acgLimitSeconds) break;
        const bin = Math.min(49, Math.floor(lag / acgBinSeconds));
        acg[acgCenter + 1 + bin] += 1;
        acg[acgCenter - 1 - bin] += 1;
      }
    }

    const maximumAmplitudePoints = 5000;
    const amplitudeStride = selectedAmplitudes.length > maximumAmplitudePoints ? Math.ceil(selectedAmplitudes.length / maximumAmplitudePoints) : 1;
    const amplitudePointCount = selectedAmplitudes.length ? Math.ceil(selectedAmplitudes.length / amplitudeStride) : 0;
    const amplitudeTimes = new Float64Array(amplitudePointCount);
    const amplitudeValues = new Float32Array(amplitudePointCount);
    for (let source = 0, targetIndex = 0; source < selectedAmplitudes.length; source += amplitudeStride, targetIndex += 1) {
      amplitudeTimes[targetIndex] = selectedTimes[source];
      amplitudeValues[targetIndex] = selectedAmplitudes[source];
    }

    const templateId = templateCounts.size
      ? [...templateCounts.entries()].sort((left, right) => right[1] - left[1])[0][0]
      : target;
    let templateWaveform = new Float32Array(0);
    let peakChannel = null;
    let peakChannelPosition = null;
    let channelGeometry = new Float32Array(0);
    let channelProbeIds = new Int16Array(0);
    if (channelPositions?.header.shape.length === 2 && channelPositions.header.shape[1] >= 2) {
      const channelCount = channelPositions.header.shape[0];
      const sourceColumns = channelPositions.header.shape[1];
      channelGeometry = new Float32Array(channelCount * 2);
      for (let channel = 0; channel < channelCount; channel += 1) {
        channelGeometry[channel * 2] = channelPositions.valueAt(channel * sourceColumns);
        channelGeometry[channel * 2 + 1] = channelPositions.valueAt(channel * sourceColumns + 1);
      }
      channelProbeIds = new Int16Array(channelCount);
      channelProbeIds.fill(-1);
      if (channelShanks?.header.count >= channelCount) {
        for (let channel = 0; channel < channelCount; channel += 1) channelProbeIds[channel] = Number(channelShanks.valueAt(channel));
      }
    }
    const peakChannelCache = new Map();
    const peakChannelForTemplate = (candidateTemplateId) => {
      const normalized = Number(candidateTemplateId);
      if (peakChannelCache.has(normalized)) return peakChannelCache.get(normalized);
      if (!(templates?.header.shape.length === 3) || normalized < 0 || normalized >= templates.header.shape[0]) return null;
      const timePoints = templates.header.shape[1];
      const channels = templates.header.shape[2];
      let bestRange = -Infinity;
      let bestChannel = null;
      for (let channel = 0; channel < channels; channel += 1) {
        let minimum = Infinity;
        let maximum = -Infinity;
        for (let time = 0; time < timePoints; time += 1) {
          const value = templates.valueAt((normalized * timePoints + time) * channels + channel);
          minimum = Math.min(minimum, value);
          maximum = Math.max(maximum, value);
        }
        if (maximum - minimum > bestRange) {
          bestRange = maximum - minimum;
          bestChannel = channel;
        }
      }
      peakChannelCache.set(normalized, bestChannel);
      return bestChannel;
    };
    if (templates?.header.shape.length === 3 && templateId >= 0 && templateId < templates.header.shape[0]) {
      const timePoints = templates.header.shape[1];
      const channels = templates.header.shape[2];
      peakChannel = peakChannelForTemplate(templateId);
      if (peakChannel != null) {
        templateWaveform = new Float32Array(timePoints);
        for (let time = 0; time < timePoints; time += 1) templateWaveform[time] = templates.valueAt((templateId * timePoints + time) * channels + peakChannel);
        if (channelPositions?.header.shape.length === 2 && peakChannel < channelPositions.header.shape[0] && channelPositions.header.shape[1] >= 2) {
          peakChannelPosition = {
            x: channelPositions.valueAt(peakChannel * channelPositions.header.shape[1]),
            y: channelPositions.valueAt(peakChannel * channelPositions.header.shape[1] + 1)
          };
        }
      }
    }
    const unitLocations = unitSummaries.map((summary) => {
      const position = positionSums.get(summary.id);
      const candidates = templateCountsByUnit.get(summary.id);
      const dominantTemplate = candidates?.size
        ? [...candidates.entries()].sort((left, right) => right[1] - left[1])[0][0]
        : summary.id;
      const unitPeakChannel = peakChannelForTemplate(dominantTemplate);
      const shankId = unitPeakChannel != null && unitPeakChannel < channelProbeIds.length && channelProbeIds[unitPeakChannel] >= 0
        ? Number(channelProbeIds[unitPeakChannel])
        : null;
      return {
        id: Number(summary.id),
        x: position?.count ? position.x / position.count : null,
        y: position?.count ? position.y / position.count : null,
        peakChannel: unitPeakChannel,
        shankId,
        physicalProbeId: shankId
      };
    });
    const shankId = peakChannel != null && peakChannel < channelProbeIds.length && channelProbeIds[peakChannel] >= 0
      ? Number(channelProbeIds[peakChannel])
      : null;

    return {
      clusterId: target,
      spikeTimes,
      spikeCount: spikeTimes.length,
      totalSpikes: times.header.count,
      duration,
      rateHz,
      isiViolationCount,
      isiViolationPercent,
      presenceRatio,
      rateBins,
      unitSummaries,
      acg,
      amplitudeTimes,
      amplitudeValues,
      meanAmplitude: mean(selectedAmplitudes),
      meanDepth: mean(selectedDepths),
      meanX: mean(selectedXs),
      templateId,
      templateWaveform,
      templateFootprint: buildTemplateFootprint(buffers, sampleRate, clusterId),
      peakChannel,
      peakChannelPosition,
      shankId,
      physicalProbeId: shankId,
      unitLocations,
      channelGeometry,
      channelShankIds: channelProbeIds,
      channelProbeIds
    };
  }

  function intervalActivityBuffers(buffers, sampleRate, start, end, duration) {
    const times = parseNpyArrayBuffer(buffers.spikeTimes);
    const clusters = parseNpyArrayBuffer(buffers.spikeClusters);
    if (!(sampleRate > 0) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || times.header.count !== clusters.header.count) throw new Error("Invalid interval or spike arrays");
    const covered = { start: Math.max(0, start), end: Math.min(Number(duration), end) };
    const seconds = Math.max(0, covered.end - covered.start);
    if (!seconds) throw new Error("Selected interval is outside the recording");
    const counts = new Map();
    for (let i = 0; i < times.header.count; i++) {
      const id = clusters.valueAt(i), t = times.valueAt(i) / sampleRate;
      if (!counts.has(id)) counts.set(id, 0);
      if (t >= covered.start && t < covered.end) counts.set(id, counts.get(id) + 1);
    }
    return { covered, duration: seconds, units: [...counts].map(([id, spikeCount]) => ({ id, spikeCount, rateHz: spikeCount / seconds })) };
  }

  // Event analysis uses a separate, disposable Worker. Read paired NPY payloads
  // in bounded blocks instead of duplicating the activity Worker's full cache.
  async function readSelectedUnitTrains(files, sampleRate, unitIds, options = {}, progress = () => {}) {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !Array.isArray(unitIds) || !unitIds.length || unitIds.length > 4096 || unitIds.some(id => !Number.isSafeInteger(id)) || new Set(unitIds).size !== unitIds.length) throw new Error('Invalid sample rate or Unit selection');
    const maxSpikes = options.maxSelectedSpikes ?? 8000000, chunkRows = options.chunkRows ?? 262144;
    if (!Number.isSafeInteger(maxSpikes) || maxSpikes < 1 || maxSpikes > 32000000 || !Number.isSafeInteger(chunkRows) || chunkRows < 1 || chunkRows > 1048576) throw new Error('Invalid spike reading memory limit');
    async function header(file) {
      if (!file?.slice || !Number.isSafeInteger(file.size)) throw new Error('Missing spike array file');
      const prefix = await file.slice(0, 12).arrayBuffer(), bytes = new Uint8Array(prefix);
      if (bytes.length < 12 || bytes[0] !== 0x93 || String.fromCharCode(...bytes.slice(1, 6)) !== 'NUMPY' || ![1, 2, 3].includes(bytes[6])) throw new Error('Invalid NPY spike array');
      const lengthBytes = bytes[6] === 1 ? 2 : 4;
      const length = lengthBytes === 2 ? new DataView(prefix).getUint16(8, true) : new DataView(prefix).getUint32(8, true);
      if (length > 1048576) throw new Error('NPY header exceeds the supported limit');
      const h = parseNpyHeaderBuffer(await file.slice(0, 8 + lengthBytes + length).arrayBuffer());
      if (h.shape.length !== 1 || !Number.isSafeInteger(h.count) || h.count < 0 || !Number.isSafeInteger(h.dataOffset + h.count * h.itemSize) || h.dataOffset + h.count * h.itemSize !== file.size) throw new Error('Invalid shape or truncated NPY spike array');
      if (!/^[<>=|][iuf][1248]$/.test(h.descr)) throw new Error('Unsupported spike array dtype');
      return h;
    }
    const a = await header(files.spikeTimes), b = await header(files.spikeClusters);
    if (a.count !== b.count || !/[iu][1248]$/.test(b.descr)) throw new Error('Spike array lengths differ or Unit IDs are not integers');
    const arrays = new Map(unitIds.map(id => [id, []])); let total = 0, previous = -Infinity;
    for (let offset = 0; offset < a.count; offset += chunkRows) {
      const n = Math.min(chunkRows, a.count - offset);
      const [times, ids] = await Promise.all([[files.spikeTimes, a], [files.spikeClusters, b]].map(async ([file, h]) => {
        const buffer = await file.slice(h.dataOffset + offset * h.itemSize, h.dataOffset + (offset + n) * h.itemSize).arrayBuffer();
        if (buffer.byteLength !== n * h.itemSize) throw new Error('Spike array changed or was truncated during reading');
        return new DataView(buffer);
      }));
      for (let i = 0; i < n; i++) {
        const sample = scalarFromDataView(times, i * a.itemSize, a.descr);
        if (/[iu][1248]$/.test(a.descr) && !Number.isSafeInteger(sample)) throw new Error('Spike sample index exceeds exact integer precision');
        const time = sample / sampleRate;
        const id = scalarFromDataView(ids, i * b.itemSize, b.descr);
        if (!Number.isFinite(time) || time < 0 || time < previous || !Number.isSafeInteger(id)) throw new Error('Spike arrays must have sorted nonnegative times and safe integer Unit IDs');
        previous = time;
        const selected = arrays.get(id);
        if (selected) { if (++total > maxSpikes) throw new Error('Selected spike trains exceed the memory limit; select fewer Units'); selected.push(time); }
      }
      progress({ phase: 'reading-spikes', completed: offset + n, total: a.count });
    }
    return unitIds.map(unitId => ({ unitId, spikes: arrays.get(unitId) }));
  }

  function createEventWorkerSource(eventSource) {
    if (typeof eventSource !== 'string' || !eventSource) throw new Error('Event analysis source is required');
    return `"use strict";
      const parseNpyHeaderBuffer = ${parseNpyHeaderBuffer.toString()};
      const scalarFromDataView = ${scalarFromDataView.toString()};
      const readSelectedUnitTrains = ${readSelectedUnitTrains.toString()};
      ${eventSource}
      self.onmessage = async ({data}) => {
        try {
          EventAnalysis.validateEventSet(data.events, data.options.recordingId);
          const trains = await readSelectedUnitTrains(data.files, data.sampleRate, data.unitIds, data.limits, progress => self.postMessage({progress}));
          self.postMessage({progress:{phase:'computing-responses'}});
          const response = EventAnalysis.computeResponses(trains, data.events, data.options);
          const clusters = data.clusters ? EventAnalysis.clusterResponses(response, data.clusters) : null;
          self.postMessage({response,clusters}, [response.counts.buffer, response.rateHz.buffer]);
        } catch (error) { self.postMessage({error:error?.message || String(error)}); }
      };`;
  }

  function createWorkerSource() {
    return `
      "use strict";
      const parseNpyHeaderBuffer = ${parseNpyHeaderBuffer.toString()};
      const buildTemplateFootprint = ${buildTemplateFootprint.toString()};
      const scalarFromDataView = ${scalarFromDataView.toString()};
      const typedData = ${typedData.toString()};
      const parseNpyArrayBuffer = ${parseNpyArrayBuffer.toString()};
      const mean = ${mean.toString()};
      const ACTIVITY_PREPROCESSING_VERSION = ${JSON.stringify(ACTIVITY_PREPROCESSING_VERSION)};
      const ACTIVITY_LEVELS = ${JSON.stringify(ACTIVITY_LEVELS)};
      const nearestActivityLevel = ${nearestActivityLevel.toString()};
      const activityMatricesFromCounts = ${activityMatricesFromCounts.toString()};
      const buildActivityOverviewBuffers = ${buildActivityOverviewBuffers.toString()};
      const buildActivityPyramidBuffers = ${buildActivityPyramidBuffers.toString()};
      const selectActivityPyramidLevel = ${selectActivityPyramidLevel.toString()};
      const analyzeUnitBuffers = ${analyzeUnitBuffers.toString()};
      const intervalActivityBuffers = ${intervalActivityBuffers.toString()};
      const cache = new Map();
      const MAX_RESIDENT = 2;

      function openActivityCache() {
        return new Promise((resolve, reject) => {
          if (!self.indexedDB) { resolve(null); return; }
          const request = self.indexedDB.open("neuropixels-explorer-display-cache", 1);
          request.onupgradeneeded = () => request.result.createObjectStore("activity-pyramids");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      async function persistentActivityGet(key) {
        try {
          const database = await openActivityCache();
          if (!database) return null;
          return await new Promise((resolve, reject) => {
            const transaction = database.transaction("activity-pyramids", "readonly");
            const request = transaction.objectStore("activity-pyramids").get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => database.close();
          });
        } catch { return null; }
      }

      async function persistentActivityPut(key, value) {
        try {
          const database = await openActivityCache();
          if (!database) return false;
          await new Promise((resolve, reject) => {
            const transaction = database.transaction("activity-pyramids", "readwrite");
            transaction.objectStore("activity-pyramids").put(value, key);
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
          });
          database.close();
          return true;
        } catch { return false; }
      }

      async function loadEntry(message) {
        if (cache.has(message.experimentKey)) {
          const existing = cache.get(message.experimentKey);
          cache.delete(message.experimentKey);
          cache.set(message.experimentKey, existing);
          return existing;
        }
        const buffers = {};
        for (const [key, file] of Object.entries(message.files || {})) {
          if (file) buffers[key] = await file.arrayBuffer();
        }
        const entry = { buffers };
        cache.set(message.experimentKey, entry);
        while (cache.size > MAX_RESIDENT) cache.delete(cache.keys().next().value);
        return entry;
      }

      self.onmessage = async (event) => {
        const message = event.data || {};
        if (message.type === "clear") {
          cache.clear();
          self.postMessage({ type: "cleared", requestId: message.requestId });
          return;
        }
        try {
          if (message.type === "activity-overview") {
            const persistentKey = ACTIVITY_PREPROCESSING_VERSION + ":" + String(message.sourceFingerprint || message.experimentKey || "");
            self.postMessage({ type: "activity-overview-progress", requestId: message.requestId, phase: "persistent-cache", progress: 5 });
            let pyramid = await persistentActivityGet(persistentKey);
            const persistentCacheHit = Boolean(pyramid);
            if (!pyramid) {
              self.postMessage({ type: "activity-overview-progress", requestId: message.requestId, phase: "reading", progress: 18 });
              const entry = await loadEntry(message);
              self.postMessage({ type: "activity-overview-progress", requestId: message.requestId, phase: "building-pyramid", progress: 38 });
              pyramid = buildActivityPyramidBuffers(entry.buffers, Number(message.sampleRate), String(message.sourceFingerprint || ""));
              self.postMessage({ type: "activity-overview-progress", requestId: message.requestId, phase: "writing", progress: 88 });
              await persistentActivityPut(persistentKey, pyramid);
            }
            const result = selectActivityPyramidLevel(pyramid, Number(message.binCount || 512));
            const residentExperiments = [...cache.keys()];
            const residentBytes = [...cache.values()].reduce((total, item) => total + Object.values(item.buffers).reduce((sum, buffer) => sum + buffer.byteLength, 0), 0);
            const transfer = [result.unitIds.buffer, result.unitCounts.buffer, result.unitRateHz.buffer, result.unitX.buffer, result.unitDepths.buffer, result.unitShankIds.buffer, result.normalizedActivity.buffer, result.unusualActivity.buffer, result.unusualThresholdCounts.buffer];
            self.postMessage({ type: "activity-overview-result", requestId: message.requestId, ...result, persistentCacheHit, residentExperiments, residentBytes }, transfer);
            return;
          }
          const entry = await loadEntry(message);
          if (message.type === "interval-activity") {
            self.postMessage({ type: "interval-result", requestId: message.requestId, ...intervalActivityBuffers(entry.buffers, message.sampleRate, message.start, message.end, message.duration) });
            return;
          }
          if (message.type !== "inspect-unit") return;
          const result = analyzeUnitBuffers(entry.buffers, Number(message.sampleRate), Number(message.clusterId));
          const residentExperiments = [...cache.keys()];
          const residentBytes = [...cache.values()].reduce((total, item) => total + Object.values(item.buffers).reduce((sum, buffer) => sum + buffer.byteLength, 0), 0);
          const transfer = [result.spikeTimes.buffer, result.rateBins.buffer, result.acg.buffer, result.amplitudeTimes.buffer, result.amplitudeValues.buffer, result.templateWaveform.buffer, result.channelGeometry.buffer, result.channelProbeIds.buffer];
          self.postMessage({ type: "unit-result", requestId: message.requestId, ...result, residentExperiments, residentBytes }, transfer);
        } catch (error) {
          self.postMessage({ type: "worker-error", requestId: message.requestId, message: error?.message || String(error) });
        }
      };
    `;
  }

  return {
    REQUIRED,
    LABEL_FILES,
    USEFUL_NAMES,
    intervalActivityBuffers,
    pathOf,
    fileNameOf,
    roleForFile,
    detectRecordingFromPath,
    rootName,
    formatBytes,
    groupExperimentFiles,
    parseNpyHeaderBuffer,
    readNpyHeader,
    parseNpyArrayBuffer,
    readSelectedUnitTrains,
    createEventWorkerSource,
    parseSampleRate,
    parseClusterLabels,
    parseClusterMetric,
    capabilitiesFor,
    indexExperiment,
    validateSupplementFile,
    mergeSupplementFiles,
    ACTIVITY_PREPROCESSING_VERSION,
    ACTIVITY_LEVELS,
    activityFileFingerprint,
    nearestActivityLevel,
    activityMatricesFromCounts,
    buildActivityOverviewBuffers,
    buildActivityPyramidBuffers,
    selectActivityPyramidLevel,
    analyzeUnitBuffers,
    buildTemplateFootprint,
    createWorkerSource
  };
});
