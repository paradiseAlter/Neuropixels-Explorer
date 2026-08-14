(() => {
  "use strict";

  const app = window.NeuropixelWorkflowV11;
  const core = app?.BrainRegionCore;
  const baseCreateGraph = app?.createGraph;
  if (!core || !baseCreateGraph || app.BrainRegionRuntime) return;

  const sources = new Map();
  let graph = null;
  let activeNodeId = null;
  let applyQueued = false;

  const runtime = app.BrainRegionRuntime = {
    sources,
    get graph() { return graph; },
    diagnostics
  };

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
    const element = document.getElementById("log-summary");
    if (element) element.textContent = message;
  }

  function setThreadState(message) {
    const element = document.getElementById("thread-state");
    if (element) element.textContent = message;
  }

  function showToast(message) {
    const element = document.getElementById("toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    window.setTimeout(() => element.classList.remove("show"), 2400);
  }

  function experimentNumber(item) {
    return core.experimentNumber(item?.name || item?.experimentName || item?.experimentKey || item?.key || "");
  }

  function coverageFor(nodeId, result) {
    const catalog = app.RealDataRuntime?.catalogs.get(nodeId);
    if (!catalog?.size) return { total: 0, good: 0, mapped: 0, mappedGood: 0, allPercent: null, goodPercent: null };
    let total = 0;
    let good = 0;
    let mapped = 0;
    let mappedGood = 0;
    catalog.forEach((experiment) => {
      const exp = experimentNumber(experiment);
      (experiment.clusterLabels || []).forEach((cluster) => {
        total += 1;
        const isGood = String(cluster.quality || "").toLowerCase() === "good";
        if (isGood) good += 1;
        const hasRegion = exp != null && result.mapping.has(`${exp}::${cluster.id}`);
        if (hasRegion) mapped += 1;
        if (hasRegion && isGood) mappedGood += 1;
      });
    });
    return {
      total,
      good,
      mapped,
      mappedGood,
      allPercent: total ? mapped / total * 100 : null,
      goodPercent: good ? mappedGood / good * 100 : null
    };
  }

  function outputContracts(outputs, result) {
    const next = new Set(outputs || []);
    next.add("BrainRegionSet");
    if (result.coordinateCount) next.add("AtlasCoordinates");
    return [...next];
  }

  function loadedSummaries(nodeId) {
    return [...(app.RealDataRuntime?.loadedByNode.get(nodeId)?.values() || [])].map((item) => ({
      key: item.key,
      kind: item.kind,
      label: item.label,
      quality: item.quality,
      spikeCount: item.spikeCount,
      rateHz: item.rateHz,
      duration: item.duration,
      brainRegion: item.brainRegion || null,
      atlasColor: item.atlasColor || null,
      depthUm: item.depthUm ?? null,
      shankId: item.shankId ?? null
    }));
  }

  function invalidateConnectedViewers(nodeId) {
    if (!graph) return;
    const viewerIds = new Set(graph.getConnections()
      .filter((connection) => connection.sourceNode === nodeId)
      .map((connection) => connection.targetNode));
    viewerIds.forEach((viewerId) => {
      const viewer = graph.getNode(viewerId);
      if (viewer?.type === "viewer") graph.updateNodeData(viewerId, { realSignature: "" }, { notify: false });
    });
  }

  function annotationSignature(node, result, coverage, loaded) {
    const outputReady = (node.data.availableOutputs || []).includes("BrainRegionSet");
    return JSON.stringify({
      source: result.primarySource,
      mapping: result.mappingCount,
      catalog: [coverage.total, coverage.good, coverage.mapped, coverage.mappedGood],
      outputs: outputReady,
      lanes: [...loaded.values()].map((item) => [item.key, item.spikeCount, item.brainRegion || ""])
    });
  }

  function applyAnnotations(node, options = {}) {
    const result = sources.get(node.id);
    if (!result || !graph?.getNode(node.id)) return;
    const loaded = app.RealDataRuntime?.loadedByNode.get(node.id) || new Map();
    loaded.forEach((item) => {
      if (!Object.prototype.hasOwnProperty.call(item, "baseLabel")) item.baseLabel = item.label;
      const exp = experimentNumber(item);
      const record = exp == null ? null : result.mapping.get(`${exp}::${item.clusterId}`);
      if (record) {
        item.brainRegion = record.region;
        item.atlasColor = record.atlasColor;
        item.depthUm = record.depthUm;
        item.shankId = record.shankId;
        item.regionSourceFile = record.sourceFile;
        item.label = `${item.baseLabel} · ${record.region}`;
      } else {
        item.label = item.baseLabel;
        delete item.brainRegion;
        delete item.atlasColor;
        delete item.depthUm;
        delete item.shankId;
        delete item.regionSourceFile;
      }
    });

    const coverage = coverageFor(node.id, result);
    const signature = annotationSignature(node, result, coverage, loaded);
    if (!options.force && node.data.regionAppliedSignature === signature) return;
    const goodCoverageText = coverage.goodPercent == null
      ? "no good-unit labels"
      : `${coverage.mappedGood.toLocaleString()}/${coverage.good.toLocaleString()} good units (${coverage.goodPercent.toFixed(1)}%)`;
    const coverageText = coverage.total
      ? `${coverage.mapped.toLocaleString()}/${coverage.total.toLocaleString()} all clusters (${coverage.allPercent.toFixed(1)}%); ${goodCoverageText}.`
      : "KiloSort catalog not loaded yet; region schema is ready and will annotate units after indexing.";
    invalidateConnectedViewers(node.id);
    graph.updateNodeData(node.id, {
      regionState: "READY",
      regionSummary: `${result.conclusion} ${coverageText}`,
      regionGoodCoverage: coverage.goodPercent,
      regionAllCoverage: coverage.allPercent,
      loadedUnitSummaries: loadedSummaries(node.id),
      availableOutputs: outputContracts(node.data.availableOutputs, result),
      regionAppliedSignature: signature
    });
  }

  function clearAnnotations(node) {
    const loaded = app.RealDataRuntime?.loadedByNode.get(node.id) || new Map();
    loaded.forEach((item) => {
      if (item.baseLabel) item.label = item.baseLabel;
      delete item.baseLabel;
      delete item.brainRegion;
      delete item.atlasColor;
      delete item.depthUm;
      delete item.shankId;
      delete item.regionSourceFile;
    });
    sources.delete(node.id);
    invalidateConnectedViewers(node.id);
    graph.updateNodeData(node.id, {
      regionState: "EMPTY",
      regionFolderName: "No Legacy Table selected",
      regionFolderPath: "",
      regionSummary: "Select the Process / Legacy Table folder to discover unit-to-region CSV annotations.",
      regionFileCount: 0,
      regionCsvCount: 0,
      regionMappingCount: 0,
      regionExperimentCount: 0,
      regionCount: 0,
      regionCoordinateCount: 0,
      regionSourceFiles: [],
      regionCoordinateFiles: [],
      regionConflictCount: 0,
      regionGoodCoverage: null,
      regionAllCoverage: null,
      regionAppliedSignature: "",
      loadedUnitSummaries: loadedSummaries(node.id),
      availableOutputs: (node.data.availableOutputs || []).filter((item) => !["BrainRegionSet", "AtlasCoordinates"].includes(item))
    });
    appendLog("info", `Cleared the Brain Region configuration from ${node.data.folderName || "Experiment Data"}. Spike arrays and KiloSort catalog were retained.`);
    setLogSummary("BRAIN REGION CONFIG CLEARED");
    showToast("Brain Region map cleared; KiloSort data retained");
  }

  async function loadRegionFolder(node, files) {
    if (!node || node.type !== "experiment" || !files.length) return;
    node.element.dataset.regionLoading = "true";
    graph.updateNodeData(node.id, {
      regionState: "SCANNING",
      regionFolderName: core.pathOf(files[0]).split("/").filter(Boolean)[0] || "Legacy Table",
      regionFolderPath: core.pathOf(files[0]),
      regionSummary: `Inspecting ${files.length} files for compatible CSV schemas.`,
      regionFileCount: files.length,
      regionCsvCount: files.filter((file) => core.fileNameOf(file).toLowerCase().endsWith(".csv")).length,
      regionAppliedSignature: ""
    });
    setThreadState("SCANNING LEGACY TABLE CSV");
    appendLog("info", `Brain Region config: inspecting ${files.length} files from the selected Legacy Table folder.`);

    try {
      const result = await core.scanLegacyFolder(files);
      if (!result.valid) {
        sources.delete(node.id);
        graph.updateNodeData(node.id, {
          regionState: "ERROR",
          regionFolderName: result.folderName,
          regionSummary: result.conclusion,
          regionFileCount: result.fileCount,
          regionCsvCount: result.csvCount,
          regionSourceFiles: [],
          regionCoordinateFiles: (result.coordinateFiles || []).map((item) => typeof item === "string"
            ? { name: item, rows: 0, mappedRows: 0 }
            : item),
          regionMappingCount: 0,
          regionExperimentCount: 0,
          regionCount: 0,
          regionCoordinateCount: 0,
          regionConflictCount: 0
        });
        appendLog("error", result.conclusion);
        setLogSummary("BRAIN REGION CONFIG FAILED");
        showToast("No compatible unit-to-region CSV was found");
        return;
      }

      sources.set(node.id, result);
      graph.updateNodeData(node.id, {
        regionState: "READY",
        regionFolderName: result.folderName,
        regionFolderPath: core.pathOf(files[0]),
        regionSummary: result.conclusion,
        regionFileCount: result.fileCount,
        regionCsvCount: result.csvCount,
        regionMappingCount: result.mappingCount,
        regionExperimentCount: result.experimentCount,
        regionCount: result.regionCount,
        regionCoordinateCount: result.coordinateCount,
        regionSourceFiles: result.selectedDirect,
        regionCoordinateFiles: result.coordinateFiles,
        regionConflictCount: result.conflicts.length,
        regionAppliedSignature: ""
      }, { notify: false });
      applyAnnotations(graph.getNode(node.id), { force: true });
      result.selectedDirect.forEach((table, index) => appendLog("pass", `${index ? "Supporting" : "Primary"} region table ${table.name}: ${table.annotatedRows.toLocaleString()} annotated rows.`));
      if (result.coordinateFiles.length) appendLog("pass", `Coordinate reference ${result.coordinateFiles[0].name}: ${result.coordinateCount.toLocaleString()} electrode-region rows reserved for spatial viewing.`);
      result.ignoredCompatible.forEach((name) => appendLog("info", `Ignored lower-priority compatible table ${name}.`));
      result.conflicts.slice(0, 10).forEach((conflict) => appendLog("warn", `${conflict.key}: kept ${conflict.kept} from ${conflict.keptSource}; ignored ${conflict.ignored} from ${conflict.ignoredSource}.`));
      appendLog(result.conflicts.length ? "warn" : "pass", result.conclusion);
      setLogSummary(`REGION READY · ${result.mappingCount.toLocaleString()} UNITS · ${result.regionCount} REGIONS`);
      showToast(`${result.mappingCount.toLocaleString()} unit-region annotations loaded`);
    } catch (error) {
      sources.delete(node.id);
      graph.updateNodeData(node.id, { regionState: "ERROR", regionSummary: error.message, regionAppliedSignature: "" });
      appendLog("error", `Brain Region config failed: ${error.stack || error.message}`);
      setLogSummary("BRAIN REGION CONFIG FAILED");
      showToast(`Brain Region load failed: ${error.message}`);
    } finally {
      node.element.dataset.regionLoading = "false";
      setThreadState("UI THREAD IDLE");
    }
  }

  function queueApply() {
    if (applyQueued || !graph) return;
    applyQueued = true;
    queueMicrotask(() => {
      applyQueued = false;
      const liveNodes = graph.getNodes();
      const liveIds = new Set(liveNodes.map((node) => node.id));
      [...sources.keys()].forEach((nodeId) => {
        if (!liveIds.has(nodeId)) sources.delete(nodeId);
      });
      liveNodes.filter((node) => node.type === "experiment" && sources.has(node.id)).forEach((node) => applyAnnotations(node));
    });
  }

  app.createGraph = (options) => {
    const originalChange = options.onChange;
    const originalAction = options.onNodeAction;
    const originalRendered = options.onNodeRendered;
    const graphReference = baseCreateGraph({
      ...options,
      onChange: (state, meta) => {
        originalChange?.(state, meta);
        if (["connection", "data", "delete", "clear", "node"].includes(meta?.reason)) queueApply();
      },
      onNodeAction: (node, action, value) => {
        if (action === "choose-region-folder") {
          activeNodeId = node.id;
          const input = document.getElementById("brain-region-folder-input");
          if (input) {
            input.value = "";
            input.click();
          }
          return;
        }
        if (action === "clear-region-folder") {
          clearAnnotations(node);
          return;
        }
        originalAction?.(node, action, value);
      },
      onNodeRendered: (node) => {
        originalRendered?.(node);
        node.element.dataset.nodeType = node.type;
        if (node.type === "experiment") node.element.dataset.regionLoading = String(node.data.regionState === "SCANNING");
      }
    });
    graph = graphReference;
    runtime.graphReference = graphReference;
    return graphReference;
  };

  const folderInput = document.getElementById("brain-region-folder-input");
  folderInput?.addEventListener("change", (event) => {
    const files = [...folderInput.files];
    const node = graph?.getNode(activeNodeId);
    if (!node || node.type !== "experiment" || !files.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    loadRegionFolder(node, files);
  }, true);

  function diagnostics() {
    return {
      configuredNodes: sources.size,
      sources: [...sources.entries()].map(([nodeId, result]) => ({
        nodeId,
        folderName: result.folderName,
        mappingCount: result.mappingCount,
        experimentCount: result.experimentCount,
        regionCount: result.regionCount,
        coordinateCount: result.coordinateCount,
        conflicts: result.conflicts.length,
        primarySource: result.primarySource
      }))
    };
  }
})();
