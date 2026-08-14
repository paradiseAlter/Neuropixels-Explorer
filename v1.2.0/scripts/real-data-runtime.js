(() => {
  "use strict";

  const app = window.NeuropixelWorkflowV11;
  const core = app.KilosortCore;
  const baseCreateGraph = app.createGraph;
  const baseViewerAttach = app.viewerController.attach.bind(app.viewerController);
  const COLORS = ["#79afe9", "#76cfa0", "#d5a36b", "#bc91c7", "#d17e77", "#8dc6c9"];
  const LABEL_WIDTH = 118;
  const MAX_VIEWER_LANES = 12;

  const catalogs = new Map();
  const loadedByNode = new Map();
  const viewerSeries = new Map();
  const pendingRequests = new Map();
  let activeFolderNodeId = null;
  let graph = null;
  let worker = null;
  let workerUrl = null;
  let requestSequence = 0;
  let viewerSyncQueued = false;

  const runtime = app.RealDataRuntime = {
    catalogs,
    loadedByNode,
    viewerSeries,
    get graph() { return graph; },
    diagnostics
  };

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  function timeStamp() {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
  }

  function appendLog(level, message) {
    const body = document.getElementById("log-body");
    if (!body) return;
    const line = document.createElement("div");
    line.className = `log-line ${level}`;
    const time = document.createElement("time");
    time.textContent = timeStamp();
    const label = document.createElement("span");
    label.textContent = level.toUpperCase();
    const content = document.createElement("p");
    content.textContent = message;
    line.append(time, label, content);
    body.appendChild(line);
    while (body.children.length > 250) body.firstElementChild?.remove();
    body.scrollTop = body.scrollHeight;
  }

  function setLogSummary(message) {
    const target = document.getElementById("log-summary");
    if (target) target.textContent = message;
  }

  function setThreadState(message) {
    const target = document.getElementById("thread-state");
    if (target) target.textContent = message;
  }

  function showToast(message) {
    const target = document.getElementById("toast");
    if (!target) return;
    target.textContent = message;
    target.classList.add("show");
    window.setTimeout(() => target.classList.remove("show"), 2400);
  }

  function bytes(value) {
    const size = Number(value) || 0;
    if (!size) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const order = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
    return `${(size / 1024 ** order).toFixed(order > 1 ? 2 : 0)} ${units[order]}`;
  }

  function rootLabel(files, groups) {
    const firstPath = core.pathOf(files[0]);
    const firstPart = firstPath.split("/").filter(Boolean)[0];
    if (groups.length === 1) return groups[0].name;
    return firstPart || `${groups.length} experiments`;
  }

  function clusterFile(group) {
    return group.byName.get("cluster_group.tsv")
      || group.byName.get("cluster_kslabel.tsv")
      || group.byName.get("cluster_info.tsv")
      || null;
  }

  function outputCapabilities(group) {
    const names = group.byName;
    const outputs = ["SpikeEvents", "UnitSet", "ClusterSet", "TimeBase"];
    if (names.has("templates.npy")) outputs.push("TemplateWaveforms");
    if (names.has("channel_positions.npy") || names.has("channel_geometry.csv")) outputs.push("ProbeGeometry");
    if (names.has("channel_shanks.npy")) outputs.push("ShankMap");
    if (names.has("spike_positions.npy")) outputs.push("SpikePositions");
    if (names.has("amplitudes.npy")) outputs.push("Amplitudes");
    if (clusterFile(group)) outputs.push("QualityTable");
    return outputs;
  }

  async function indexExperiment(group) {
    const missing = core.REQUIRED.filter((name) => !group.byName.has(name));
    if (missing.length) throw new Error(`${group.name}: missing ${missing.join(", ")}`);
    const spikeTimesFile = group.byName.get("spike_times.npy");
    const spikeClustersFile = group.byName.get("spike_clusters.npy");
    const paramsFile = group.byName.get("params.py");
    const labelsFile = clusterFile(group);
    const [timesHeader, clustersHeader, paramsText, labelsText] = await Promise.all([
      core.readNpyHeader(spikeTimesFile),
      core.readNpyHeader(spikeClustersFile),
      paramsFile.text(),
      labelsFile ? labelsFile.text() : Promise.resolve("")
    ]);
    if (timesHeader.shape.length !== 1 || clustersHeader.shape.length !== 1) throw new Error(`${group.name}: spike arrays must be one-dimensional`);
    if (timesHeader.count !== clustersHeader.count) throw new Error(`${group.name}: spike_times and spike_clusters lengths differ`);
    const sampleRate = core.parseSampleRate(paramsText);
    const lastSample = await core.readNpyLastValue(spikeTimesFile, timesHeader);
    const clusterLabels = core.parseClusterLabels(labelsText);
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
      totalBytes,
      fileCount: group.files.length,
      outputs: outputCapabilities(group),
      headers: { spikeTimes: timesHeader, spikeClusters: clustersHeader }
    };
  }

  function unitOptions(experiment, selectionType) {
    if (!experiment) return [];
    const source = selectionType === "unit"
      ? experiment.clusterLabels.filter((item) => item.quality === "good")
      : experiment.clusterLabels;
    return source.map((item) => ({
      id: String(item.id),
      label: selectionType === "unit" ? `Unit ${item.id} · good` : `Cluster ${item.id} · ${item.quality}`,
      quality: item.quality
    }));
  }

  function catalogSummaries(items) {
    return items.map((item) => ({
      id: item.key,
      label: `${item.name} · ${item.clusterLabels.filter((cluster) => cluster.quality === "good").length} good / ${item.clusterLabels.length} clusters`,
      name: item.name,
      bytes: item.totalBytes,
      spikeCount: item.spikeCount,
      duration: item.duration
    }));
  }

  async function clearWorkerCache() {
    if (!worker) return;
    try {
      await requestWorker({ type: "clear-cache" });
    } catch {
      // A stale worker cache is harmless because request keys also contain the Data node id.
    }
  }

  async function indexFolder(node, files) {
    if (!node || node.type !== "experiment" || !files.length) return;
    const groups = core.groupExperimentFiles(files);
    loadedByNode.set(node.id, new Map());
    catalogs.delete(node.id);
    node.element.dataset.realLoading = "true";
    graph.updateNodeData(node.id, {
      loaded: false,
      entities: [],
      catalogState: "INDEXING",
      catalogSummary: `Inspecting ${groups.length || 0} candidate experiment folders without loading array payloads.`,
      catalogCount: 0,
      catalogBytes: 0,
      catalogItems: [],
      unitOptions: [],
      loadedUnitSummaries: [],
      workerState: "INDEXING"
    });
    setThreadState("INDEXING KILOSORT CATALOG");
    appendLog("info", `Received ${files.length} files and found ${groups.length} Kilosort experiment candidates.`);

    if (!groups.length) {
      graph.updateNodeData(node.id, {
        catalogState: "ERROR",
        catalogSummary: "No folder contains the required Kilosort filenames.",
        audit: "QC FAILED",
        auditTone: "error",
        workerState: "IDLE"
      });
      node.element.dataset.realLoading = "false";
      setLogSummary("FAILED · NO KILOSORT EXPERIMENTS");
      setThreadState("UI THREAD IDLE");
      appendLog("error", "Expected spike_times.npy, spike_clusters.npy, and params.py in each experiment folder.");
      return;
    }

    const results = await Promise.allSettled(groups.map(indexExperiment));
    const valid = [];
    const errors = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") valid.push(result.value);
      else errors.push(result.reason?.message || `${groups[index].name}: unknown indexing error`);
    });
    valid.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));

    if (!valid.length) {
      graph.updateNodeData(node.id, {
        folderName: rootLabel(files, groups),
        folderPath: core.pathOf(files[0]),
        fileCount: files.length,
        catalogState: "ERROR",
        catalogSummary: `${errors.length} experiment candidates failed structural validation.`,
        audit: "QC FAILED",
        auditTone: "error",
        workerState: "IDLE"
      });
      node.element.dataset.realLoading = "false";
      errors.forEach((message) => appendLog("error", message));
      setLogSummary(`FAILED · ${errors.length} INVALID EXPERIMENTS`);
      setThreadState("UI THREAD IDLE");
      return;
    }

    const catalog = new Map(valid.map((item) => [item.key, item]));
    catalogs.set(node.id, catalog);
    await clearWorkerCache();
    const first = valid[0];
    const initialType = first.clusterLabels.some((item) => item.quality === "good") ? "unit" : "cluster";
    const initialOptions = unitOptions(first, initialType);
    const totalBytes = valid.reduce((total, item) => total + item.totalBytes, 0);
    const outputs = [...new Set(valid.flatMap((item) => item.outputs))];
    const catalogName = rootLabel(files, groups);
    const summary = `${valid.length}/${groups.length} experiments passed. ${files.length} files and ${bytes(totalBytes)} are indexed; NPY payloads remain unloaded.`;

    graph.updateNodeData(node.id, {
      loaded: true,
      folderName: catalogName,
      folderPath: core.pathOf(files[0]),
      fileCount: files.length,
      audit: errors.length ? "QC PASSED WITH WARNINGS" : "QC PASSED",
      auditTone: errors.length ? "warn" : "ready",
      availableOutputs: outputs,
      auditFiles: valid.map((item) => ({ status: "pass", name: item.name, path: item.key, note: `${item.spikeCount.toLocaleString()} spikes · ${item.clusterLabels.length} clusters` })),
      auditSummary: summary,
      catalogState: "READY",
      catalogSummary: summary,
      catalogCount: valid.length,
      catalogBytes: totalBytes,
      catalogItems: catalogSummaries(valid),
      selectedExperiment: first.key,
      selectionType: initialType,
      selectedCluster: initialOptions[0]?.id || "",
      unitOptions: initialOptions,
      residentExperiments: [],
      residentBytes: 0,
      loadedUnitSummaries: [],
      workerState: "IDLE"
    });
    node.element.dataset.realLoading = "false";
    valid.forEach((item) => appendLog("pass", `${item.name}: ${item.spikeCount.toLocaleString()} spikes, ${item.clusterLabels.length} clusters, ${item.duration.toFixed(2)} s, ${bytes(item.totalBytes)} indexed.`));
    errors.forEach((message) => appendLog("warn", message));
    appendLog("pass", summary);
    setLogSummary(`READY · ${valid.length} EXPERIMENTS · 0 ARRAYS RESIDENT`);
    setThreadState("UI THREAD IDLE");
    showToast(`${valid.length} Kilosort experiments indexed lazily`);
    queueViewerSync();
  }

  function ensureWorker() {
    if (worker) return worker;
    if (!("Worker" in window)) return null;
    const blob = new Blob([core.createWorkerSource()], { type: "text/javascript" });
    workerUrl = URL.createObjectURL(blob);
    worker = new Worker(workerUrl);
    worker.addEventListener("message", (event) => {
      const response = event.data || {};
      const pending = pendingRequests.get(response.requestId);
      if (!pending) return;
      pendingRequests.delete(response.requestId);
      if (response.type === "worker-error") pending.reject(new Error(response.message));
      else pending.resolve(response);
    });
    worker.addEventListener("error", (event) => {
      pendingRequests.forEach((pending) => pending.reject(new Error(event.message || "Kilosort worker failed")));
      pendingRequests.clear();
    });
    return worker;
  }

  async function requestWorker(message) {
    const activeWorker = ensureWorker();
    if (!activeWorker) {
      if (message.type === "clear-cache") return { type: "cache-cleared" };
      const [spikeTimesBuffer, spikeClustersBuffer] = await Promise.all([
        message.files.spikeTimes.arrayBuffer(),
        message.files.spikeClusters.arrayBuffer()
      ]);
      return {
        type: "unit-loaded",
        ...core.selectUnitSpikes(spikeTimesBuffer, spikeClustersBuffer, Number(message.sampleRate), Number(message.clusterId)),
        residentExperiments: [],
        residentBytes: 0,
        fallback: true
      };
    }
    const requestId = `real-${++requestSequence}`;
    return new Promise((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject });
      activeWorker.postMessage({ ...message, requestId });
    });
  }

  function selectionValues(node) {
    return {
      experimentKey: node.element.querySelector('[data-real-control="experiment"]')?.value || node.data.selectedExperiment,
      selectionType: node.element.querySelector('[data-real-control="selection-type"]')?.value || node.data.selectionType,
      clusterId: node.element.querySelector('[data-real-control="cluster"]')?.value || node.data.selectedCluster
    };
  }

  function summariesFor(nodeId) {
    return [...(loadedByNode.get(nodeId)?.values() || [])].map((item) => ({
      key: item.key,
      kind: item.kind,
      label: item.label,
      quality: item.quality,
      spikeCount: item.spikeCount,
      rateHz: item.rateHz,
      duration: item.duration
    }));
  }

  async function addSelectedUnit(node) {
    if (node.data.workerState === "LOADING") return;
    const catalog = catalogs.get(node.id);
    const values = selectionValues(node);
    const experiment = catalog?.get(values.experimentKey);
    const clusterId = Number(values.clusterId);
    if (!experiment || !Number.isFinite(clusterId)) {
      showToast("Select a valid experiment and Unit or Cluster first");
      return;
    }
    const kind = values.selectionType === "unit" ? "Unit" : "Cluster";
    const key = `${experiment.key}::${clusterId}`;
    const loaded = loadedByNode.get(node.id) || new Map();
    loadedByNode.set(node.id, loaded);
    if (loaded.has(key)) {
      showToast(`${kind} ${clusterId} is already in the Viewer collection`);
      return;
    }

    node.element.dataset.realLoading = "true";
    graph.updateNodeData(node.id, { workerState: "LOADING", selectedExperiment: values.experimentKey, selectionType: values.selectionType, selectedCluster: String(clusterId) });
    setThreadState(`WORKER · ${experiment.name.toUpperCase()} · ${kind.toUpperCase()} ${clusterId}`);
    appendLog("info", `${experiment.name}: loading spike_times.npy and spike_clusters.npy in the background worker for ${kind} ${clusterId}.`);
    const started = performance.now();

    try {
      const result = await requestWorker({
        type: "load-unit",
        experimentKey: `${node.id}:${experiment.key}`,
        files: { spikeTimes: experiment.spikeTimesFile, spikeClusters: experiment.spikeClustersFile },
        sampleRate: experiment.sampleRate,
        clusterId
      });
      const quality = experiment.clusterLabels.find((item) => item.id === clusterId)?.quality || "unknown";
      const label = `${experiment.name} · ${kind} ${clusterId}`;
      loaded.set(key, {
        key,
        nodeId: node.id,
        experimentKey: experiment.key,
        experimentName: experiment.name,
        clusterId,
        kind,
        label,
        quality,
        spikeTimes: result.spikeTimes,
        spikeCount: result.spikeCount,
        totalSpikes: result.totalSpikes,
        duration: result.duration,
        rateHz: result.rateHz,
        sampleRate: experiment.sampleRate
      });
      const elapsed = performance.now() - started;
      graph.updateNodeData(node.id, {
        loadedUnitSummaries: summariesFor(node.id),
        residentExperiments: result.residentExperiments || [],
        residentBytes: result.residentBytes || 0,
        workerState: "READY"
      });
      appendLog("pass", `${label}: ${result.spikeCount.toLocaleString()} spikes at ${result.rateHz.toFixed(3)} Hz over ${result.duration.toFixed(3)} s. Loaded in ${elapsed.toFixed(0)} ms.`);
      if (result.fallback) appendLog("warn", "Web Worker was unavailable; this selection used the main-thread fallback.");
      setLogSummary(`REAL DATA · ${summariesFor(node.id).length} LANES · ${result.residentExperiments?.length || 0}/3 RESIDENT`);
      showToast(`${label} loaded into connected Viewer`);
      queueViewerSync();
    } catch (error) {
      graph.updateNodeData(node.id, { workerState: "ERROR" });
      appendLog("error", `${experiment.name} ${kind} ${clusterId}: ${error.message}`);
      setLogSummary("REAL DATA LOAD FAILED");
      showToast(`Unit load failed: ${error.message}`);
    } finally {
      node.element.dataset.realLoading = "false";
      setThreadState("UI THREAD IDLE");
    }
  }

  function removeLoadedUnit(node, key) {
    const loaded = loadedByNode.get(node.id);
    const item = loaded?.get(key);
    if (!item) return;
    loaded.delete(key);
    graph.updateNodeData(node.id, { loadedUnitSummaries: summariesFor(node.id), workerState: "IDLE" });
    appendLog("info", `${item.label} was removed from Viewer lanes. Cached experiment arrays may remain resident.`);
    queueViewerSync();
  }

  function clearLoadedUnits(node) {
    loadedByNode.get(node.id)?.clear();
    graph.updateNodeData(node.id, { loadedUnitSummaries: [], workerState: "IDLE" });
    appendLog("info", `Cleared real Viewer lanes from ${node.data.folderName}. Catalog and worker cache remain available.`);
    queueViewerSync();
  }

  function handleNodeAction(node, action, value) {
    if (action === "real-add-unit") {
      addSelectedUnit(node);
      return true;
    }
    if (action === "real-clear-units") {
      clearLoadedUnits(node);
      return true;
    }
    if (action === "real-remove-unit") {
      removeLoadedUnit(node, value);
      return true;
    }
    return false;
  }

  function attachRealControls(node) {
    if (node.type !== "experiment") return;
    const experimentControl = node.element.querySelector('[data-real-control="experiment"]');
    const typeControl = node.element.querySelector('[data-real-control="selection-type"]');
    const clusterControl = node.element.querySelector('[data-real-control="cluster"]');
    experimentControl?.addEventListener("change", () => {
      const catalog = catalogs.get(node.id);
      const experiment = catalog?.get(experimentControl.value);
      const selectionType = typeControl?.value || node.data.selectionType;
      const options = unitOptions(experiment, selectionType);
      graph.updateNodeData(node.id, {
        selectedExperiment: experimentControl.value,
        selectionType,
        selectedCluster: options[0]?.id || "",
        unitOptions: options
      });
    });
    typeControl?.addEventListener("change", () => {
      const catalog = catalogs.get(node.id);
      const experiment = catalog?.get(experimentControl?.value || node.data.selectedExperiment);
      const options = unitOptions(experiment, typeControl.value);
      graph.updateNodeData(node.id, {
        selectionType: typeControl.value,
        selectedCluster: options[0]?.id || "",
        unitOptions: options
      });
    });
    clusterControl?.addEventListener("change", () => {
      graph.updateNodeData(node.id, { selectedCluster: clusterControl.value }, { render: false, notify: false });
    });
  }

  function queueViewerSync() {
    if (viewerSyncQueued || !graph) return;
    viewerSyncQueued = true;
    queueMicrotask(() => {
      viewerSyncQueued = false;
      syncViewers();
    });
  }

  function syncViewers() {
    if (!graph) return;
    const liveNodes = graph.getNodes();
    const liveIds = new Set(liveNodes.map((node) => node.id));
    let removedCatalog = false;
    [...catalogs.keys()].forEach((nodeId) => {
      if (liveIds.has(nodeId)) return;
      catalogs.delete(nodeId);
      loadedByNode.delete(nodeId);
      removedCatalog = true;
    });
    [...viewerSeries.keys()].forEach((nodeId) => {
      if (!liveIds.has(nodeId)) viewerSeries.delete(nodeId);
    });
    if (removedCatalog) clearWorkerCache();
    const connections = graph.getConnections();
    liveNodes.filter((node) => node.type === "viewer").forEach((viewer) => {
      const incoming = connections.filter((connection) => connection.targetNode === viewer.id && ["primary", "compare"].includes(connection.targetPort));
      const series = incoming.flatMap((connection) => {
        const source = graph.getNode(connection.sourceNode);
        if (source?.type !== "experiment") return [];
        return [...(loadedByNode.get(source.id)?.values() || [])];
      }).slice(0, MAX_VIEWER_LANES);

      if (!series.length) {
        viewerSeries.delete(viewer.id);
        if (viewer.data.realSignature) graph.updateNodeData(viewer.id, { realSignature: "", realData: false }, { notify: false });
        return;
      }

      const signature = series.map((item) => `${item.nodeId}:${item.key}:${item.spikeCount}`).join("|");
      viewerSeries.set(viewer.id, series);
      if (viewer.data.realSignature === signature) return;
      const fullEnd = Math.max(...series.map((item) => item.duration), 0.02);
      const priorReal = Boolean(viewer.data.realSignature);
      const priorStart = Number(viewer.data.viewStart);
      const priorEnd = Number(viewer.data.viewEnd);
      const viewStart = priorReal ? clamp(priorStart, 0, Math.max(0, fullEnd - 0.02)) : 0;
      const viewEnd = priorReal ? clamp(priorEnd, viewStart + 0.02, fullEnd) : Math.min(fullEnd, 12);
      graph.updateNodeData(viewer.id, {
        realData: true,
        realSignature: signature,
        sourceLabel: series.length === 1 ? series[0].label : `${series.length} real Kilosort lanes`,
        sourceState: "REAL",
        sourceEntities: series.map((item) => ({ kind: item.kind, label: item.label })),
        availableOutputs: ["SpikeEvents", "UnitSet", "ClusterSet", "TimeBase"],
        resolvedMode: "Raster",
        fullStart: 0,
        fullEnd,
        viewStart,
        viewEnd
      }, { notify: false });
    });
  }

  function lowerBound(values, target) {
    let low = 0;
    let high = values.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (values[middle] < target) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function attachRealViewer(node, onPatch, series) {
    node.viewerCleanup?.();
    const canvas = node.element.querySelector("[data-viewer-canvas]");
    const stage = node.element.querySelector("[data-viewer-stage]");
    if (!canvas || !stage) {
      node.viewerCleanup = null;
      return;
    }
    canvas.dataset.realRaster = "true";
    const context = canvas.getContext("2d");
    const listeners = [];
    let resizeObserver = null;
    let drag = null;
    let width = 0;
    let height = 0;

    const listen = (target, event, handler, options) => {
      target.addEventListener(event, handler, options);
      listeners.push(() => target.removeEventListener(event, handler, options));
    };

    function localPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (canvas.clientWidth / Math.max(1, rect.width)),
        y: (event.clientY - rect.top) * (canvas.clientHeight / Math.max(1, rect.height))
      };
    }

    function prepareCanvas() {
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function drawFrame(title, subtitle) {
      context.fillStyle = "#08090a";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#0d0e10";
      context.fillRect(0, 0, width, 25);
      context.strokeStyle = "#27292c";
      context.beginPath();
      context.moveTo(0, 25.5);
      context.lineTo(width, 25.5);
      context.stroke();
      context.textAlign = "left";
      context.font = "600 9px Segoe UI, sans-serif";
      context.fillStyle = "#b9bbc0";
      context.fillText(title.toUpperCase(), 10, 16);
      context.textAlign = "right";
      context.font = "8px Segoe UI, sans-serif";
      context.fillStyle = "#6a6d73";
      context.fillText(subtitle.toUpperCase(), width - 10, 16);
      context.textAlign = "left";
    }

    function drawTimeGrid(start, end, top, bottom) {
      const plotWidth = Math.max(1, width - LABEL_WIDTH - 10);
      context.strokeStyle = "rgba(255,255,255,.055)";
      context.fillStyle = "#60636a";
      context.font = "8px Cascadia Mono, monospace";
      for (let index = 0; index <= 6; index += 1) {
        const x = LABEL_WIDTH + plotWidth * index / 6;
        context.beginPath();
        context.moveTo(x + 0.5, top);
        context.lineTo(x + 0.5, bottom);
        context.stroke();
        const time = start + (end - start) * index / 6;
        context.fillText(`${time.toFixed(end - start < 2 ? 3 : end - start < 20 ? 2 : 1)}s`, x + 3, height - 7);
      }
      context.strokeStyle = "#292b2f";
      context.beginPath();
      context.moveTo(LABEL_WIDTH - 0.5, top);
      context.lineTo(LABEL_WIDTH - 0.5, bottom);
      context.stroke();
    }

    function drawSpikes(values, first, last, start, end, laneTop, laneBottom, color) {
      const plotWidth = Math.max(1, width - LABEL_WIDTH - 10);
      const visibleCount = last - first;
      context.fillStyle = color;
      context.globalAlpha = 0.84;
      if (visibleCount > plotWidth * 2) {
        const pixels = new Uint8Array(Math.ceil(plotWidth) + 1);
        for (let index = first; index < last; index += 1) {
          const pixel = clamp(Math.floor((values[index] - start) / (end - start) * plotWidth), 0, pixels.length - 1);
          pixels[pixel] = 1;
        }
        for (let pixel = 0; pixel < pixels.length; pixel += 1) {
          if (pixels[pixel]) context.fillRect(LABEL_WIDTH + pixel, laneTop + 6, 1, Math.max(1, laneBottom - laneTop - 12));
        }
      } else {
        for (let index = first; index < last; index += 1) {
          const x = LABEL_WIDTH + (values[index] - start) / (end - start) * plotWidth;
          context.fillRect(Math.floor(x), laneTop + 6, 1, Math.max(1, laneBottom - laneTop - 12));
        }
      }
      context.globalAlpha = 1;
    }

    function draw() {
      prepareCanvas();
      const start = Number(node.data.viewStart);
      const end = Number(node.data.viewEnd);
      const top = 26;
      const bottom = height - 22;
      const lanes = series.slice(0, MAX_VIEWER_LANES);
      const laneHeight = Math.max(24, (bottom - top) / Math.max(1, lanes.length));
      let visibleTotal = 0;
      const ranges = lanes.map((item) => {
        const first = lowerBound(item.spikeTimes, start);
        const last = lowerBound(item.spikeTimes, end + Number.EPSILON);
        visibleTotal += last - first;
        return { first, last };
      });
      drawFrame("Real Kilosort spike raster", `${lanes.length} lane${lanes.length === 1 ? "" : "s"} · ${visibleTotal.toLocaleString()} visible spikes`);
      drawTimeGrid(start, end, top, bottom);

      lanes.forEach((item, index) => {
        const laneTop = top + laneHeight * index;
        const laneBottom = Math.min(bottom, laneTop + laneHeight);
        const color = COLORS[index % COLORS.length];
        context.fillStyle = index % 2 ? "rgba(255,255,255,.012)" : "rgba(255,255,255,.025)";
        context.fillRect(0, laneTop, width, laneBottom - laneTop);
        context.strokeStyle = "rgba(255,255,255,.06)";
        context.beginPath();
        context.moveTo(0, laneBottom - 0.5);
        context.lineTo(width, laneBottom - 0.5);
        context.stroke();
        context.fillStyle = color;
        context.fillRect(8, laneTop + 7, 3, Math.max(9, laneHeight - 14));
        context.fillStyle = "#c4c5c8";
        context.font = "600 9px Segoe UI, sans-serif";
        context.fillText(item.label.slice(0, 20), 17, laneTop + Math.min(16, laneHeight * 0.45));
        context.fillStyle = "#666a71";
        context.font = "7px Cascadia Mono, monospace";
        context.fillText(`${item.quality.toUpperCase()} · ${item.rateHz.toFixed(2)} HZ`, 17, laneTop + Math.min(28, laneHeight * 0.72));
        drawSpikes(item.spikeTimes, ranges[index].first, ranges[index].last, start, end, laneTop, laneBottom, color);
      });

      if (drag) {
        const left = Math.min(drag.startX, drag.currentX);
        const right = Math.max(drag.startX, drag.currentX);
        context.fillStyle = "rgba(121,175,233,.14)";
        context.fillRect(left, top, right - left, bottom - top);
        context.strokeStyle = "rgba(121,175,233,.88)";
        context.setLineDash([3, 3]);
        context.strokeRect(left + 0.5, top + 0.5, right - left, bottom - top - 1);
        context.setLineDash([]);
      }
    }

    function commitRange(start, end) {
      const fullStart = Number(node.data.fullStart);
      const fullEnd = Number(node.data.fullEnd);
      const minimum = Math.max(0.002, (fullEnd - fullStart) / 20000);
      const nextStart = clamp(start, fullStart, Math.max(fullStart, fullEnd - minimum));
      const nextEnd = clamp(end, nextStart + minimum, fullEnd);
      onPatch(node.id, { viewStart: nextStart, viewEnd: nextEnd }, { render: false, notify: false });
      const rangeText = `${nextStart.toFixed(3)}–${nextEnd.toFixed(3)} s`;
      node.element.querySelectorAll("[data-viewer-range], [data-viewer-compact-range]").forEach((label) => { label.textContent = rangeText; });
      draw();
    }

    function zoom(factor, anchor = 0.5) {
      const start = Number(node.data.viewStart);
      const end = Number(node.data.viewEnd);
      const center = start + (end - start) * anchor;
      const nextSpan = (end - start) * factor;
      commitRange(center - nextSpan * anchor, center + nextSpan * (1 - anchor));
    }

    function reset() {
      commitRange(Number(node.data.fullStart), Number(node.data.fullEnd));
    }

    listen(canvas, "wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const point = localPoint(event);
      const anchor = clamp((point.x - LABEL_WIDTH) / Math.max(1, width - LABEL_WIDTH - 10), 0, 1);
      zoom(event.deltaY > 0 ? 1.28 : 0.78, anchor);
    }, { passive: false });

    listen(canvas, "pointerdown", (event) => {
      if (event.button !== 0) return;
      const point = localPoint(event);
      if (point.x < LABEL_WIDTH) return;
      event.preventDefault();
      event.stopPropagation();
      drag = { startX: clamp(point.x, LABEL_WIDTH, width - 10), currentX: clamp(point.x, LABEL_WIDTH, width - 10) };
      canvas.setPointerCapture(event.pointerId);
      draw();
    });

    listen(canvas, "pointermove", (event) => {
      if (!drag) return;
      drag.currentX = clamp(localPoint(event).x, LABEL_WIDTH, width - 10);
      draw();
    });

    const finishSelection = (event) => {
      if (!drag) return;
      const selection = { ...drag };
      drag = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      const left = Math.min(selection.startX, selection.currentX);
      const right = Math.max(selection.startX, selection.currentX);
      if (right - left < 8) {
        draw();
        return;
      }
      const start = Number(node.data.viewStart);
      const end = Number(node.data.viewEnd);
      const plotWidth = Math.max(1, width - LABEL_WIDTH - 10);
      commitRange(
        start + (left - LABEL_WIDTH) / plotWidth * (end - start),
        start + (right - LABEL_WIDTH) / plotWidth * (end - start)
      );
    };

    listen(canvas, "pointerup", finishSelection);
    listen(canvas, "pointercancel", finishSelection);
    listen(canvas, "dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      reset();
    });
    node.element.querySelectorAll("[data-viewer-action]").forEach((button) => {
      listen(button, "click", (event) => {
        event.stopPropagation();
        if (button.dataset.viewerAction === "zoom-in") zoom(0.68);
        if (button.dataset.viewerAction === "zoom-out") zoom(1.45);
        if (button.dataset.viewerAction === "reset") reset();
      });
    });
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(draw);
      resizeObserver.observe(stage);
    } else {
      listen(window, "resize", draw);
    }
    requestAnimationFrame(draw);
    node.viewerCleanup = () => {
      listeners.forEach((remove) => remove());
      resizeObserver?.disconnect();
      node.viewerCleanup = null;
    };
  }

  app.viewerController.attach = (node, onPatch) => {
    const series = viewerSeries.get(node.id);
    const visibleMode = node.data.mode === "Auto" ? node.data.resolvedMode : node.data.mode;
    if (series?.length && visibleMode === "Raster") attachRealViewer(node, onPatch, series);
    else baseViewerAttach(node, onPatch);
  };

  app.createGraph = (options) => {
    const originalChange = options.onChange;
    const originalAction = options.onNodeAction;
    const originalRendered = options.onNodeRendered;
    let graphReference = null;
    graphReference = baseCreateGraph({
      ...options,
      onChange: (state, meta) => {
        originalChange?.(state, meta);
        if (["connection", "data", "delete", "clear"].includes(meta?.reason)) queueViewerSync();
      },
      onNodeAction: (node, action, value) => {
        if (action === "choose-folder") activeFolderNodeId = node.id;
        if (handleNodeAction(node, action, value)) return;
        originalAction?.(node, action, value);
      },
      onNodeRendered: (node) => {
        originalRendered?.(node);
        attachRealControls(node);
        if (node.type === "experiment") node.element.dataset.realLoading = String(node.data.workerState === "LOADING" || node.data.catalogState === "INDEXING");
      }
    });
    graph = graphReference;
    return graphReference;
  };

  const folderInput = document.getElementById("kilosort-folder-input");
  folderInput?.addEventListener("change", (event) => {
    const files = [...folderInput.files];
    const node = graph?.getNode(activeFolderNodeId);
    if (!node || node.type !== "experiment" || !files.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    indexFolder(node, files).catch((error) => {
      node.element.dataset.realLoading = "false";
      graph.updateNodeData(node.id, { catalogState: "ERROR", catalogSummary: error.message, workerState: "ERROR" });
      appendLog("error", error.stack || error.message);
      setLogSummary("CATALOG INDEX FAILED");
      setThreadState("UI THREAD IDLE");
    });
  }, true);

  document.addEventListener("click", async (event) => {
    if (!event.target.closest("#copy-log")) return;
    const text = [...document.querySelectorAll("#log-body .log-line")].map((line) => line.innerText.trim()).join("\n");
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
      showToast("Load log copied");
    } catch {
      showToast("Clipboard permission was unavailable");
    }
  }, true);

  window.addEventListener("beforeunload", () => {
    worker?.terminate();
    if (workerUrl) URL.revokeObjectURL(workerUrl);
  });

  function diagnostics() {
    return {
      catalogNodes: catalogs.size,
      indexedExperiments: [...catalogs.values()].reduce((total, catalog) => total + catalog.size, 0),
      loadedLanes: [...loadedByNode.values()].reduce((total, loaded) => total + loaded.size, 0),
      viewerSeries: [...viewerSeries.entries()].map(([viewerId, series]) => ({ viewerId, lanes: series.length, keys: series.map((item) => item.key) })),
      workerPending: pendingRequests.size
    };
  }
})();
