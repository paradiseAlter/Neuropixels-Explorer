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
    "channel_shanks.npy"
  ]);

  function pathOf(file) {
    return String(file?.webkitRelativePath || file?.relativePath || file?.name || "").replaceAll("\\", "/");
  }

  function fileNameOf(file) {
    const parts = pathOf(file).split("/").filter(Boolean);
    return (parts.at(-1) || String(file?.name || "")).toLowerCase();
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
      template: names.has("templates.npy"),
      geometry: names.has("channel_positions.npy") || names.has("channel_geometry.csv"),
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

  function mean(values) {
    if (!values.length) return null;
    let total = 0;
    for (let index = 0; index < values.length; index += 1) total += Number(values[index]);
    return total / values.length;
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
    const target = Number(clusterId);
    const duration = times.header.count ? times.valueAt(times.header.count - 1) / sampleRate : 0;
    const counts = new Map();
    const selectedTimes = [];
    const selectedAmplitudes = [];
    const selectedDepths = [];
    const selectedXs = [];
    const templateCounts = new Map();

    for (let index = 0; index < clusters.header.count; index += 1) {
      const id = clusters.valueAt(index);
      counts.set(id, (counts.get(id) || 0) + 1);
      if (id !== target) continue;
      selectedTimes.push(times.valueAt(index) / sampleRate);
      if (amplitudes && amplitudes.header.count === clusters.header.count) selectedAmplitudes.push(amplitudes.valueAt(index));
      if (positions?.header.shape.length === 2 && positions.header.shape[0] === clusters.header.count && positions.header.shape[1] >= 2) {
        selectedXs.push(positions.valueAt(index * positions.header.shape[1]));
        selectedDepths.push(positions.valueAt(index * positions.header.shape[1] + 1));
      }
      if (spikeTemplates && spikeTemplates.header.count === clusters.header.count) {
        const templateId = spikeTemplates.valueAt(index);
        templateCounts.set(templateId, (templateCounts.get(templateId) || 0) + 1);
      }
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
    if (channelPositions?.header.shape.length === 2 && channelPositions.header.shape[1] >= 2) {
      const channelCount = channelPositions.header.shape[0];
      const sourceColumns = channelPositions.header.shape[1];
      channelGeometry = new Float32Array(channelCount * 2);
      for (let channel = 0; channel < channelCount; channel += 1) {
        channelGeometry[channel * 2] = channelPositions.valueAt(channel * sourceColumns);
        channelGeometry[channel * 2 + 1] = channelPositions.valueAt(channel * sourceColumns + 1);
      }
    }
    if (templates?.header.shape.length === 3 && templateId >= 0 && templateId < templates.header.shape[0]) {
      const timePoints = templates.header.shape[1];
      const channels = templates.header.shape[2];
      let bestRange = -Infinity;
      for (let channel = 0; channel < channels; channel += 1) {
        let minimum = Infinity;
        let maximum = -Infinity;
        for (let time = 0; time < timePoints; time += 1) {
          const value = templates.valueAt((templateId * timePoints + time) * channels + channel);
          minimum = Math.min(minimum, value);
          maximum = Math.max(maximum, value);
        }
        if (maximum - minimum > bestRange) {
          bestRange = maximum - minimum;
          peakChannel = channel;
        }
      }
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
      peakChannel,
      peakChannelPosition,
      channelGeometry
    };
  }

  function createWorkerSource() {
    return `
      "use strict";
      const parseNpyHeaderBuffer = ${parseNpyHeaderBuffer.toString()};
      const scalarFromDataView = ${scalarFromDataView.toString()};
      const typedData = ${typedData.toString()};
      const parseNpyArrayBuffer = ${parseNpyArrayBuffer.toString()};
      const mean = ${mean.toString()};
      const analyzeUnitBuffers = ${analyzeUnitBuffers.toString()};
      const cache = new Map();
      const MAX_RESIDENT = 2;

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
        if (message.type !== "inspect-unit") return;
        try {
          const entry = await loadEntry(message);
          const result = analyzeUnitBuffers(entry.buffers, Number(message.sampleRate), Number(message.clusterId));
          const residentExperiments = [...cache.keys()];
          const residentBytes = [...cache.values()].reduce((total, item) => total + Object.values(item.buffers).reduce((sum, buffer) => sum + buffer.byteLength, 0), 0);
          const transfer = [result.spikeTimes.buffer, result.rateBins.buffer, result.acg.buffer, result.amplitudeTimes.buffer, result.amplitudeValues.buffer, result.templateWaveform.buffer, result.channelGeometry.buffer];
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
    pathOf,
    fileNameOf,
    rootName,
    formatBytes,
    groupExperimentFiles,
    parseNpyHeaderBuffer,
    readNpyHeader,
    parseNpyArrayBuffer,
    parseSampleRate,
    parseClusterLabels,
    parseClusterMetric,
    capabilitiesFor,
    indexExperiment,
    analyzeUnitBuffers,
    createWorkerSource
  };
});
