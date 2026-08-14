((root, factory) => {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  const app = root.NeuropixelWorkflowV11 = root.NeuropixelWorkflowV11 || {};
  app.KilosortCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const REQUIRED = ["spike_times.npy", "spike_clusters.npy", "params.py"];

  function pathOf(file) {
    return String(file.webkitRelativePath || file.relativePath || file.name || "").replaceAll("\\", "/");
  }

  function fileNameOf(file) {
    const parts = pathOf(file).split("/").filter(Boolean);
    return parts.at(-1) || String(file.name || "");
  }

  function groupExperimentFiles(files) {
    const groups = new Map();
    [...files].forEach((file) => {
      const parts = pathOf(file).split("/").filter(Boolean);
      const name = parts.pop() || String(file.name || "");
      const directory = parts.join("/") || ".";
      const group = groups.get(directory) || { key: directory, name: parts.at(-1) || "selected-folder", files: [], byName: new Map() };
      group.files.push(file);
      group.byName.set(name.toLowerCase(), file);
      groups.set(directory, group);
    });

    const candidates = [...groups.values()].filter((group) => REQUIRED.some((name) => group.byName.has(name)));
    candidates.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));
    return candidates;
  }

  function parseNpyHeaderBuffer(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length < 10 || bytes[0] !== 0x93 || String.fromCharCode(...bytes.slice(1, 6)) !== "NUMPY") {
      throw new Error("Not a valid NPY file (magic header missing)");
    }
    const major = bytes[6];
    const minor = bytes[7];
    const lengthBytes = major === 1 ? 2 : 4;
    if (bytes.length < 8 + lengthBytes) throw new Error("NPY header is truncated");
    const view = new DataView(arrayBuffer);
    const headerLength = lengthBytes === 2 ? view.getUint16(8, true) : view.getUint32(8, true);
    const headerStart = 8 + lengthBytes;
    const dataOffset = headerStart + headerLength;
    if (bytes.length < dataOffset) throw new Error(`NPY header requires ${dataOffset} bytes but only ${bytes.length} were provided`);
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
    const count = shape.reduce((total, value) => total * value, 1);
    return {
      version: `${major}.${minor}`,
      descr,
      fortranOrder: fortranMatch[1] === "True",
      shape,
      count,
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
    const major = bytes[6];
    const view = new DataView(prefix);
    const lengthBytes = major === 1 ? 2 : 4;
    const headerLength = lengthBytes === 2 ? view.getUint16(8, true) : view.getUint32(8, true);
    const total = 8 + lengthBytes + headerLength;
    return parseNpyHeaderBuffer(await file.slice(0, total).arrayBuffer());
  }

  function scalarFromDataView(view, offset, descr) {
    const endian = !descr.startsWith(">");
    const kind = descr.at(-2);
    const size = Number(descr.match(/(\d+)$/)?.[1]);
    if (kind === "i" && size === 8) return Number(view.getBigInt64(offset, endian));
    if (kind === "u" && size === 8) return Number(view.getBigUint64(offset, endian));
    if (kind === "i" && size === 4) return view.getInt32(offset, endian);
    if (kind === "u" && size === 4) return view.getUint32(offset, endian);
    if (kind === "i" && size === 2) return view.getInt16(offset, endian);
    if (kind === "u" && size === 2) return view.getUint16(offset, endian);
    if (kind === "i" && size === 1) return view.getInt8(offset);
    if (kind === "u" && size === 1) return view.getUint8(offset);
    if (kind === "f" && size === 8) return view.getFloat64(offset, endian);
    if (kind === "f" && size === 4) return view.getFloat32(offset, endian);
    throw new Error(`Unsupported NPY dtype: ${descr}`);
  }

  async function readNpyLastValue(file, header) {
    if (!header.count) return null;
    const start = header.dataOffset + (header.count - 1) * header.itemSize;
    const buffer = await file.slice(start, start + header.itemSize).arrayBuffer();
    if (buffer.byteLength !== header.itemSize) throw new Error(`${fileNameOf(file)} data is truncated`);
    return scalarFromDataView(new DataView(buffer), 0, header.descr);
  }

  function parseSampleRate(text) {
    const match = String(text).match(/^\s*sample_rate\s*=\s*([0-9.eE+\-]+)/m);
    const value = Number(match?.[1]);
    if (!Number.isFinite(value) || value <= 0) throw new Error("params.py does not define a valid sample_rate");
    return value;
  }

  function parseClusterLabels(text) {
    const lines = String(text).replaceAll("\r", "").split("\n").filter((line) => line.trim());
    if (!lines.length) return [];
    const headers = lines[0].split("\t").map((value) => value.trim().toLowerCase());
    const idIndex = headers.findIndex((value) => ["cluster_id", "id", "cluster"].includes(value));
    const labelIndex = headers.findIndex((value) => ["kslabel", "group", "label", "quality"].includes(value));
    if (idIndex < 0) return [];
    return lines.slice(1).map((line) => {
      const cells = line.split("\t");
      const id = Number(cells[idIndex]);
      if (!Number.isFinite(id)) return null;
      return { id, quality: String(cells[labelIndex] || "unknown").trim().toLowerCase() || "unknown" };
    }).filter(Boolean).sort((left, right) => left.id - right.id);
  }

  function typedData(arrayBuffer, header) {
    const offset = header.dataOffset;
    const count = header.count;
    const descr = header.descr;
    const kind = descr.at(-2);
    const size = header.itemSize;
    const nativeEndian = !descr.startsWith(">");
    if (!nativeEndian) return null;
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

  function selectUnitSpikes(spikeTimesBuffer, spikeClustersBuffer, sampleRate, clusterId) {
    const times = parseNpyArrayBuffer(spikeTimesBuffer);
    const clusters = parseNpyArrayBuffer(spikeClustersBuffer);
    if (times.header.fortranOrder || clusters.header.fortranOrder) throw new Error("Fortran-order spike arrays are not supported");
    if (times.header.shape.length !== 1 || clusters.header.shape.length !== 1) throw new Error("Spike arrays must be one-dimensional");
    if (times.header.count !== clusters.header.count) throw new Error("spike_times and spike_clusters lengths do not match");
    const target = Number(clusterId);
    const selected = [];
    for (let index = 0; index < times.header.count; index += 1) {
      if (clusters.valueAt(index) === target) selected.push(times.valueAt(index) / sampleRate);
    }
    const duration = times.header.count ? times.valueAt(times.header.count - 1) / sampleRate : 0;
    return {
      spikeTimes: Float64Array.from(selected),
      spikeCount: selected.length,
      totalSpikes: times.header.count,
      duration,
      rateHz: duration > 0 ? selected.length / duration : 0,
      cacheBytes: times.byteLength + clusters.byteLength
    };
  }

  function createWorkerSource() {
    return `
      "use strict";
      const parseNpyHeaderBuffer = ${parseNpyHeaderBuffer.toString()};
      const scalarFromDataView = ${scalarFromDataView.toString()};
      const typedData = ${typedData.toString()};
      const parseNpyArrayBuffer = ${parseNpyArrayBuffer.toString()};
      const selectUnitSpikes = ${selectUnitSpikes.toString()};
      const cache = new Map();
      const MAX_RESIDENT = 3;

      async function loadExperiment(message) {
        const key = message.experimentKey;
        if (cache.has(key)) {
          const existing = cache.get(key);
          cache.delete(key);
          cache.set(key, existing);
          return existing;
        }
        const [spikeTimesBuffer, spikeClustersBuffer] = await Promise.all([
          message.files.spikeTimes.arrayBuffer(),
          message.files.spikeClusters.arrayBuffer()
        ]);
        const entry = { spikeTimesBuffer, spikeClustersBuffer };
        cache.set(key, entry);
        while (cache.size > MAX_RESIDENT) cache.delete(cache.keys().next().value);
        return entry;
      }

      self.onmessage = async (event) => {
        const message = event.data || {};
        if (message.type === "clear-cache") {
          cache.clear();
          self.postMessage({ type: "cache-cleared", requestId: message.requestId });
          return;
        }
        if (message.type !== "load-unit") return;
        try {
          const entry = await loadExperiment(message);
          const result = selectUnitSpikes(
            entry.spikeTimesBuffer,
            entry.spikeClustersBuffer,
            Number(message.sampleRate),
            Number(message.clusterId)
          );
          const residentExperiments = [...cache.keys()];
          const residentBytes = [...cache.values()].reduce((total, item) => total + item.spikeTimesBuffer.byteLength + item.spikeClustersBuffer.byteLength, 0);
          self.postMessage({
            type: "unit-loaded",
            requestId: message.requestId,
            spikeTimes: result.spikeTimes,
            spikeCount: result.spikeCount,
            totalSpikes: result.totalSpikes,
            duration: result.duration,
            rateHz: result.rateHz,
            residentExperiments,
            residentBytes
          }, [result.spikeTimes.buffer]);
        } catch (error) {
          self.postMessage({ type: "worker-error", requestId: message.requestId, message: error?.message || String(error) });
        }
      };
    `;
  }

  return {
    REQUIRED,
    pathOf,
    fileNameOf,
    groupExperimentFiles,
    parseNpyHeaderBuffer,
    readNpyHeader,
    readNpyLastValue,
    parseSampleRate,
    parseClusterLabels,
    parseNpyArrayBuffer,
    selectUnitSpikes,
    createWorkerSource
  };
});
