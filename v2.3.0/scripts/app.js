(() => {
  "use strict";

  const core = window.NeuropixelExplorerCore;
  const regionCore = window.NeuropixelRegionCore;
  const PlotManager = window.NeuropixelPlots.PlotManager;
  const ProbeViewer = window.NeuropixelProbeView.ProbeViewer;
  const databaseClient = window.NeuropixelDatabaseClient;

  const elements = {
    shell: document.getElementById("app-shell"),
    datasetTitle: document.getElementById("dataset-title"),
    openFolder: document.getElementById("open-folder-button"),
    emptyOpen: document.getElementById("empty-open-button"),
    folderInput: document.getElementById("folder-input"),
    emptyView: document.getElementById("empty-view"),
    dropZone: document.getElementById("drop-zone"),
    loadingView: document.getElementById("loading-view"),
    loadingProgress: document.getElementById("loading-progress"),
    loadingTitle: document.getElementById("loading-title"),
    loadingMessage: document.getElementById("loading-message"),
    explorerView: document.getElementById("explorer-view"),
    summaryNumbers: document.getElementById("summary-numbers"),
    capabilityRow: document.getElementById("capability-row"),
    recordingStrip: document.getElementById("recording-strip"),
    unitCount: document.getElementById("unit-count-label"),
    unitSearch: document.getElementById("unit-search"),
    qualityFilter: document.getElementById("quality-filter"),
    unitList: document.getElementById("unit-list"),
    reviewTitle: document.getElementById("review-title"),
    reviewSubtitle: document.getElementById("review-subtitle"),
    reviewState: document.getElementById("review-state"),
    metricRow: document.getElementById("metric-row"),
    timeWindow: document.getElementById("time-window-label"),
    comparisonCount: document.getElementById("comparison-count-label"),
    comparisonTraces: document.getElementById("comparison-traces"),
    manualReviewEmpty: document.getElementById("manual-review-empty"),
    primaryTraceLane: document.getElementById("primary-trace-lane"),
    primaryTraceRemove: document.getElementById("primary-trace-remove"),
    primaryOverviewLabel: document.getElementById("primary-overview-label"),
    primaryOverviewFrame: document.getElementById("primary-overview-frame"),
    primaryTraceTitle: document.getElementById("primary-trace-title"),
    primaryTraceMeta: document.getElementById("primary-trace-meta"),
    templateLabel: document.getElementById("template-label"),
    detailsContext: document.getElementById("details-context"),
    detailsFocusLabel: document.getElementById("details-focus-label"),
    timeLink: document.getElementById("time-link-button"),
    zoomMode: document.getElementById("zoom-mode-button"),
    panMode: document.getElementById("pan-mode-button"),
    backTime: document.getElementById("back-time-button"),
    zoomOut: document.getElementById("zoom-out-button"),
    zoomIn: document.getElementById("zoom-in-button"),
    resetTime: document.getElementById("reset-time-button"),
    dataDetails: document.getElementById("data-details-button"),
    dataDialog: document.getElementById("data-dialog"),
    dialogFolder: document.getElementById("dialog-folder-name"),
    dialogBody: document.getElementById("dialog-body"),
    closeDialog: document.getElementById("close-data-dialog"),
    dropOverlay: document.getElementById("drop-overlay"),
    toast: document.getElementById("toast"),
    probeCanvas: document.getElementById("probe-canvas"),
    probeCount: document.getElementById("probe-count"),
    probeLegend: document.getElementById("probe-legend"),
    probeUnit: document.getElementById("probe-unit"),
    probeRegion: document.getElementById("probe-region"),
    probeChannel: document.getElementById("probe-channel"),
    probeX: document.getElementById("probe-x"),
    probeDepth: document.getElementById("probe-depth"),
    probeSource: document.getElementById("probe-source"),
    probeNote: document.getElementById("probe-note")
  };

  const state = {
    dataMode: "folder",
    databaseCatalog: null,
    files: [],
    rootName: "",
    recordings: [],
    errors: [],
    regionResult: null,
    activeRecording: null,
    activeClusterId: null,
    quality: "all",
    search: "",
    datasetToken: 0,
    selectionToken: 0,
    worker: null,
    workerUrl: null,
    workerSequence: 0,
    pending: new Map(),
    dragDepth: 0,
    comparisonItems: new Map(),
    comparisonLoading: new Set(),
    primaryItem: null,
    activePlotKey: "primary",
    timeLinked: true,
    syncingTime: false,
    interactionMode: "zoom"
  };

  const plots = new PlotManager({
    detail: document.getElementById("spike-detail-canvas"),
    overview: document.getElementById("spike-overview-canvas"),
    detailFrame: document.getElementById("spike-detail-frame"),
    selection: document.getElementById("zoom-selection"),
    selectionLabel: document.getElementById("zoom-selection-label"),
    traceColor: "#9fc6f1",
    rateColor: "#86b8eb",
    rateFill: "rgba(87, 143, 197, .16)",
    detailEmpty: document.getElementById("spike-detail-empty")
  }, (view) => handlePlotWindow("primary", view), (plotState) => handlePlotState("primary", plotState));

  const detailPlots = new PlotManager({
    amplitude: document.getElementById("amplitude-canvas"),
    acg: document.getElementById("acg-canvas"),
    template: document.getElementById("template-canvas"),
    amplitudeEmpty: document.getElementById("amplitude-empty"),
    acgEmpty: document.getElementById("acg-empty"),
    templateEmpty: document.getElementById("template-empty")
  });

  const probeViewer = new ProbeViewer({
    canvas: elements.probeCanvas,
    count: elements.probeCount,
    legend: elements.probeLegend,
    unit: elements.probeUnit,
    region: elements.probeRegion,
    channel: elements.probeChannel,
    x: elements.probeX,
    depth: elements.probeDepth,
    source: elements.probeSource,
    note: elements.probeNote
  });

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  const number = (value) => Number(value || 0).toLocaleString();
  const percent = (value) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : "—";
  const comparisonColors = [
    { trace: "#e4b36f", rate: "#d69c51", fill: "rgba(214, 156, 81, .14)" },
    { trace: "#8fc7a7", rate: "#69ae88", fill: "rgba(105, 174, 136, .14)" },
    { trace: "#bea5df", rate: "#a78bd0", fill: "rgba(167, 139, 208, .14)" },
    { trace: "#e58c8c", rate: "#d36e6e", fill: "rgba(211, 110, 110, .14)" },
    { trace: "#75c6d8", rate: "#55aebf", fill: "rgba(85, 174, 191, .14)" },
    { trace: "#d889b4", rate: "#c46d9d", fill: "rgba(196, 109, 157, .14)" },
    { trace: "#b7c86f", rate: "#9daf51", fill: "rgba(157, 175, 81, .14)" },
    { trace: "#d08e67", rate: "#ba7149", fill: "rgba(186, 113, 73, .14)" },
    { trace: "#8ea9df", rate: "#718fc9", fill: "rgba(113, 143, 201, .14)" }
  ];
  const MAX_OPEN_UNITS = 10;

  function viewKey(recording, clusterId) {
    return `${recording?.key || "recording"}::${Number(clusterId)}`;
  }

  function plotEntries() {
    return [
      { key: "primary", manager: plots, lane: elements.primaryTraceLane, windowElement: elements.timeWindow, ...state.primaryItem },
      ...[...state.comparisonItems.entries()].map(([key, item]) => ({ key, ...item }))
    ];
  }

  function activePlotEntry() {
    return plotEntries().find((entry) => entry.key === state.activePlotKey) || plotEntries()[0];
  }

  function formatTimeWindow({ start, end, span }) {
    const digits = span < .1 ? 4 : span < 1 ? 3 : 2;
    return `${start.toFixed(digits)}–${end.toFixed(digits)} s · ${span.toFixed(digits)} s`;
  }

  function updateComparisonCount() {
    const count = (plots.data ? 1 : 0) + state.comparisonItems.size;
    elements.comparisonCount.textContent = count === 0
      ? "No Units open · select a Unit from the left"
      : count === 1
        ? "1 unit open · click + beside another Unit to compare"
        : `${count} units open · ${state.timeLinked ? "time axes linked" : "time axes independent"}`;
  }

  function handlePlotWindow(key, view) {
    const entry = plotEntries().find((item) => item.key === key);
    if (entry?.windowElement) entry.windowElement.textContent = formatTimeWindow(view);
    if (!state.timeLinked || state.syncingTime) return;
    state.syncingTime = true;
    try {
      plotEntries().forEach((item) => {
        if (item.key !== key && item.manager.data) item.manager.setWindow(view.start, view.span);
      });
    } finally {
      state.syncingTime = false;
    }
  }

  function handlePlotState(key, plotState) {
    if (key !== state.activePlotKey) return;
    const zooming = plotState.mode === "zoom";
    state.interactionMode = plotState.mode;
    elements.zoomMode.classList.toggle("active", zooming);
    elements.panMode.classList.toggle("active", !zooming);
    elements.zoomMode.setAttribute("aria-pressed", String(zooming));
    elements.panMode.setAttribute("aria-pressed", String(!zooming));
    elements.backTime.disabled = !plotState.canGoBack;
    elements.zoomOut.disabled = !plotState.hasData;
    elements.zoomIn.disabled = !plotState.hasData;
    elements.resetTime.disabled = !plotState.hasData;
  }

  function setActivePlot(key) {
    const next = plotEntries().find((entry) => entry.key === key) || plotEntries()[0];
    state.activePlotKey = next.key;
    plotEntries().forEach((entry) => entry.lane?.classList.toggle("active", entry.key === next.key));
    handlePlotState(next.key, {
      mode: next.manager.mode,
      canGoBack: next.manager.history.length > 0,
      hasData: Boolean(next.manager.data)
    });
    renderFocusedDetails(next);
  }

  function setInteractionMode(mode) {
    state.interactionMode = mode === "pan" ? "pan" : "zoom";
    plotEntries().forEach((entry) => entry.manager.setMode(state.interactionMode));
  }

  function setTimeLinked(linked) {
    state.timeLinked = Boolean(linked);
    elements.timeLink.classList.toggle("active", state.timeLinked);
    elements.timeLink.setAttribute("aria-pressed", String(state.timeLinked));
    elements.timeLink.textContent = state.timeLinked ? "TIME LINKED" : "TIME INDEPENDENT";
    elements.timeLink.title = state.timeLinked
      ? "Linked: zoom and pan every open Unit together"
      : "Independent: zoom and pan only the selected trace";
    if (state.timeLinked) {
      const source = activePlotEntry();
      if (source?.manager.data) handlePlotWindow(source.key, { start: source.manager.start, end: source.manager.start + source.manager.span, span: source.manager.span });
    }
    updateComparisonCount();
  }

  function clearComparisonViews() {
    state.comparisonItems.forEach((item) => item.manager.destroy());
    state.comparisonItems.clear();
    state.comparisonLoading.clear();
    elements.comparisonTraces.replaceChildren();
    state.activePlotKey = "primary";
    updateComparisonCount();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
  }

  function showOnly(target) {
    elements.emptyView.hidden = target !== "empty";
    elements.loadingView.hidden = target !== "loading";
    elements.explorerView.hidden = target !== "explorer";
  }

  function showLoading(title, message, progress = 12) {
    showOnly("loading");
    elements.loadingTitle.textContent = title;
    elements.loadingMessage.textContent = message;
    elements.loadingProgress.style.width = `${progress}%`;
  }

  function setReviewState(label, tone = "") {
    elements.reviewState.textContent = label;
    elements.reviewState.className = `review-state ${tone}`.trim();
  }

  function experimentNumber(recording) {
    return regionCore.experimentNumber(recording?.name || recording?.key || "");
  }

  function regionFor(recording, clusterId) {
    const experiment = experimentNumber(recording);
    return experiment == null ? null : state.regionResult?.mapping?.get(`${experiment}::${Number(clusterId)}`) || null;
  }

  function syncProbeView() {
    const items = plotEntries().filter((entry) => entry.result && entry.recording).map((entry) => ({
      key: entry.key,
      result: entry.result,
      recording: entry.recording,
      clusterId: Number(entry.clusterId),
      region: regionFor(entry.recording, entry.clusterId),
      color: entry.traceColor || "#9fc6f1"
    }));
    probeViewer.setUnits(items, state.activePlotKey);
  }

  function qualityTone(quality) {
    const normalized = String(quality || "unknown").toLowerCase();
    return ["good", "mua", "noise"].includes(normalized) ? normalized : "unknown";
  }

  function labelFor(recording, clusterId) {
    return recording.clusterLabels.find((item) => item.id === Number(clusterId)) || { id: Number(clusterId), quality: "unknown" };
  }

  function ensureWorker() {
    if (state.worker) return state.worker;
    if (!("Worker" in window)) return null;
    const blob = new Blob([core.createWorkerSource()], { type: "text/javascript" });
    state.workerUrl = URL.createObjectURL(blob);
    state.worker = new Worker(state.workerUrl);
    state.worker.addEventListener("message", (event) => {
      const response = event.data || {};
      const pending = state.pending.get(response.requestId);
      if (!pending) return;
      state.pending.delete(response.requestId);
      if (response.type === "worker-error") pending.reject(new Error(response.message));
      else pending.resolve(response);
    });
    state.worker.addEventListener("error", (event) => {
      state.pending.forEach((pending) => pending.reject(new Error(event.message || "Background data reader failed")));
      state.pending.clear();
    });
    return state.worker;
  }

  async function requestWorker(message) {
    const worker = ensureWorker();
    if (!worker) {
      if (message.type === "clear") return { type: "cleared" };
      const buffers = {};
      for (const [key, file] of Object.entries(message.files || {})) {
        if (file) buffers[key] = await file.arrayBuffer();
      }
      return { type: "unit-result", ...core.analyzeUnitBuffers(buffers, message.sampleRate, message.clusterId), fallback: true, residentExperiments: [], residentBytes: 0 };
    }
    const requestId = `review-${++state.workerSequence}`;
    return new Promise((resolve, reject) => {
      state.pending.set(requestId, { resolve, reject });
      worker.postMessage({ ...message, requestId });
    });
  }

  async function clearWorker() {
    if (!state.worker) return;
    try { await requestWorker({ type: "clear" }); } catch { /* The next dataset uses a new key even if clearing fails. */ }
  }

  function workerFiles(recording) {
    const names = recording.byName;
    return {
      spikeTimes: names.get("spike_times.npy"),
      spikeClusters: names.get("spike_clusters.npy"),
      amplitudes: names.get("amplitudes.npy") || null,
      spikePositions: names.get("spike_positions.npy") || null,
      spikeTemplates: names.get("spike_templates.npy") || null,
      templates: names.get("templates.npy") || null,
      channelPositions: names.get("channel_positions.npy") || null
    };
  }

  async function inspectRecordingUnit(recording, clusterId) {
    if (state.dataMode === "database") return databaseClient.loadUnitReview(recording, clusterId);
    return requestWorker({
      type: "inspect-unit",
      experimentKey: `${state.datasetToken}:${recording.key}`,
      files: workerFiles(recording),
      sampleRate: recording.sampleRate,
      clusterId: Number(clusterId)
    });
  }

  function recordingUnits(recording) {
    const labels = recording?.clusterLabels || [];
    const counts = recording?.unitSummaryMap || new Map();
    const source = labels.length
      ? labels
      : [...counts.values()].map((item) => ({ id: item.id, quality: "unknown" }));
    return source.map((item) => ({ ...item, ...(counts.get(item.id) || {}) }));
  }

  function filteredUnits() {
    const recording = state.activeRecording;
    if (!recording) return [];
    const query = state.search.trim().toLowerCase();
    return recordingUnits(recording).filter((unit) => {
      if (state.quality !== "all" && unit.quality !== state.quality) return false;
      if (!query) return true;
      const region = regionFor(recording, unit.id)?.region || "";
      return String(unit.id).includes(query) || region.toLowerCase().includes(query) || String(unit.quality).includes(query);
    });
  }

  function renderUnitList() {
    const units = filteredUnits();
    elements.unitCount.textContent = `${units.length}/${recordingUnits(state.activeRecording).length}`;
    if (!units.length) {
      elements.unitList.innerHTML = `<div class="unit-list-empty">No units match the current filter.</div>`;
      return;
    }
    elements.unitList.innerHTML = units.map((unit) => {
      const region = regionFor(state.activeRecording, unit.id)?.region || "Unmapped";
      const rate = Number.isFinite(unit.rateHz) ? `${unit.rateHz.toFixed(unit.rateHz < 10 ? 2 : 1)} Hz` : "— Hz";
      const spikes = Number.isFinite(unit.count) ? number(unit.count) : "—";
      const key = viewKey(state.activeRecording, unit.id);
      const primary = Number(unit.id) === Number(state.activeClusterId);
      const compared = state.comparisonItems.has(key);
      const loading = state.comparisonLoading.has(key);
      const compareLabel = primary || compared ? "×" : loading ? "…" : "+";
      const compareTitle = primary ? "Close this signal" : compared ? "Remove from comparison" : "Add this Unit to comparison";
      return `<div class="unit-row ${primary ? "active" : ""} ${compared ? "compared" : ""}" role="option" aria-selected="${primary}">
        <button class="unit-row-select" type="button" data-cluster-id="${unit.id}">
          <span class="unit-row-main">
            <span class="unit-row-title"><i class="quality-dot ${qualityTone(unit.quality)}"></i><strong>Unit ${unit.id}</strong></span>
            <small>${escapeHtml(unit.quality)} · ${escapeHtml(region)}</small>
          </span>
          <span class="unit-row-metrics"><strong>${rate}</strong><span>${spikes} spikes</span></span>
        </button>
        <button class="unit-row-compare ${primary || compared ? "added" : ""}" type="button" data-compare-cluster-id="${unit.id}" aria-label="${compareTitle}" title="${compareTitle}" ${loading ? "disabled" : ""}>${compareLabel}</button>
      </div>`;
    }).join("");
  }

  function renderRecordings() {
    elements.recordingStrip.innerHTML = state.recordings.map((recording) => `<button class="recording-button ${recording === state.activeRecording ? "active" : ""}" type="button" data-recording-key="${escapeHtml(recording.key)}">
      <strong>${escapeHtml(recording.name)}</strong>
      <span>${number(recording.clusterLabels.length)} units · ${recording.duration.toFixed(1)} s</span>
    </button>`).join("");
    elements.recordingStrip.querySelector(".recording-button.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function renderSummary() {
    const recordings = state.recordings;
    const totalUnits = recordings.reduce((total, item) => total + item.clusterLabels.length, 0);
    const totalSpikes = recordings.reduce((total, item) => total + item.spikeCount, 0);
    const totalBytes = recordings.reduce((total, item) => total + item.totalBytes, 0);
    elements.summaryNumbers.innerHTML = [
      [recordings.length, "RECORDINGS"],
      [number(totalUnits), "UNITS"],
      [number(totalSpikes), "SPIKES"],
      [core.formatBytes(totalBytes), "INDEXED"]
    ].map(([value, label]) => `<div class="summary-stat"><strong>${value}</strong><span>${label}</span></div>`).join("");

    const any = (key) => recordings.some((recording) => recording.capabilities[key]);
    const capabilities = [
      ["SPIKES", any("spikes")],
      ["QUALITY", any("quality")],
      ["AMPLITUDE", any("amplitude")],
      ["POSITION", any("position")],
      ["TEMPLATE", any("template")],
      ["GEOMETRY", any("geometry")],
      ["REGION", Boolean(state.regionResult?.valid)],
      ["RAW VOLTAGE", any("rawVoltage")]
    ];
    elements.capabilityRow.innerHTML = capabilities.map(([label, available]) => `<span class="capability ${available ? "available" : "missing"}">${label} ${available ? "READY" : "—"}</span>`).join("");
  }

  function renderMetrics(result, recording, clusterId) {
    const ksAmplitude = recording.amplitudeByCluster.get(Number(clusterId));
    const contamination = recording.contaminationByCluster.get(Number(clusterId));
    const values = [
      ["SPIKES", number(result.spikeCount)],
      ["MEAN RATE", `${result.rateHz.toFixed(result.rateHz < 10 ? 3 : 2)} Hz`],
      ["ISI < 2 MS", percent(result.isiViolationPercent)],
      ["PRESENCE", percent(result.presenceRatio * 100)],
      ["KS AMPLITUDE", Number.isFinite(ksAmplitude) ? ksAmplitude.toFixed(1) : "—"],
      ["KS CONTAM.", Number.isFinite(contamination) ? `${contamination.toFixed(1)}%` : "—"]
    ];
    elements.metricRow.innerHTML = values.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  }

  function clearFocusedDetails() {
    detailPlots.clear();
    probeViewer.clear();
    elements.detailsContext.style.setProperty("--trace-color", "#59616a");
    elements.detailsFocusLabel.textContent = "No Unit selected";
    elements.reviewTitle.textContent = "No Unit open";
    elements.reviewSubtitle.textContent = "Select a signal to inspect its unit-level details and physical position.";
    elements.metricRow.replaceChildren();
    elements.templateLabel.textContent = "Peak channel · arbitrary units";
  }

  function renderFocusedDetails(entry) {
    if (!entry?.result || !entry?.recording || !Number.isFinite(Number(entry.clusterId))) {
      clearFocusedDetails();
      return;
    }
    const { result, recording } = entry;
    const clusterId = Number(entry.clusterId);
    const label = labelFor(recording, clusterId);
    const region = regionFor(recording, clusterId);
    const traceColor = entry.traceColor || "#9fc6f1";
    elements.detailsContext.style.setProperty("--trace-color", traceColor);
    elements.detailsFocusLabel.textContent = `Unit ${clusterId} · ${recording.name}`;
    elements.reviewTitle.textContent = `Unit ${clusterId}`;
    elements.reviewSubtitle.textContent = [recording.name, label.quality, region?.region || "brain region unmapped", `${recording.duration.toFixed(2)} s recording`].join(" · ");
    renderMetrics(result, recording, clusterId);
    const channelText = result.peakChannel == null ? "peak channel unavailable" : `peak channel ${result.peakChannel}`;
    const depthText = result.peakChannelPosition?.y == null ? "" : ` · ${result.peakChannelPosition.y.toFixed(0)} µm`;
    elements.templateLabel.textContent = `Template ${result.templateId} · ${channelText}${depthText} · a.u.`;
    detailPlots.setData({ ...result, sampleRate: recording.sampleRate });
    syncProbeView();
  }

  function removeComparisonView(key, { render = true } = {}) {
    const item = state.comparisonItems.get(key);
    if (!item) return;
    item.manager.destroy();
    item.lane.remove();
    state.comparisonItems.delete(key);
    if (state.activePlotKey === key) setActivePlot("primary");
    else syncProbeView();
    updateComparisonCount();
    if (render) renderUnitList();
  }

  function clearPrimaryView() {
    state.activeClusterId = null;
    state.primaryItem = null;
    plots.clear();
    elements.primaryTraceLane.hidden = true;
    elements.primaryOverviewLabel.hidden = true;
    elements.primaryOverviewFrame.hidden = true;
    elements.manualReviewEmpty.hidden = false;
    elements.primaryTraceTitle.textContent = "Unit —";
    elements.primaryTraceMeta.textContent = "Select a Unit from the list";
    elements.timeWindow.textContent = "—";
    setReviewState("IDLE");
    setActivePlot("primary");
    renderUnitList();
    updateComparisonCount();
  }

  function closePrimaryView() {
    if (state.activeClusterId == null || !Number.isFinite(Number(state.activeClusterId))) return;
    state.selectionToken += 1;
    const promoted = state.comparisonItems.values().next().value;
    if (!promoted) {
      clearPrimaryView();
      showToast("Signal closed");
      return;
    }
    const promotedKey = viewKey(promoted.recording, promoted.clusterId);
    const { recording, clusterId, result } = promoted;
    removeComparisonView(promotedKey, { render: false });
    state.activeRecording = recording;
    state.activeClusterId = clusterId;
    state.search = "";
    elements.unitSearch.value = "";
    renderRecordings();
    renderUnitList();
    renderReview(result, recording, clusterId);
    showToast(`Unit ${clusterId} moved to the primary view`);
  }

  function createComparisonView(recording, clusterId, result) {
    const key = viewKey(recording, clusterId);
    const usedPaletteIndexes = new Set([...state.comparisonItems.values()].map((item) => item.paletteIndex));
    const paletteIndex = comparisonColors.findIndex((_, index) => !usedPaletteIndexes.has(index));
    const palette = comparisonColors[Math.max(0, paletteIndex)];
    const label = labelFor(recording, clusterId);
    const region = regionFor(recording, clusterId)?.region || "region unmapped";
    const lane = document.createElement("article");
    lane.className = "trace-lane";
    lane.dataset.viewKey = key;
    lane.style.setProperty("--trace-color", palette.trace);
    lane.innerHTML = `
      <header class="trace-lane-header">
        <div class="trace-identity"><i></i><strong>Unit ${Number(clusterId)}</strong><span>${escapeHtml(recording.name)} · ${escapeHtml(label.quality)} · ${escapeHtml(region)} · ${number(result.spikeCount)} spikes</span></div>
        <div class="trace-lane-actions"><span class="trace-window">—</span><button class="trace-remove" type="button" aria-label="Close Unit ${Number(clusterId)} signal" title="Close this signal">×</button></div>
      </header>
      <div class="canvas-frame detail-frame" data-interaction-mode="${state.interactionMode}">
        <canvas tabindex="0" aria-label="Unit ${Number(clusterId)} spike timing and firing rate"></canvas>
        <div class="zoom-selection" hidden><span></span></div>
        <div class="canvas-empty">Loading Unit ${Number(clusterId)}</div>
      </div>`;
    elements.comparisonTraces.append(lane);
    const frame = lane.querySelector(".detail-frame");
    const canvas = lane.querySelector("canvas");
    const selection = lane.querySelector(".zoom-selection");
    const windowElement = lane.querySelector(".trace-window");
    const manager = new PlotManager({
      detail: canvas,
      detailFrame: frame,
      selection,
      selectionLabel: selection.querySelector("span"),
      detailEmpty: lane.querySelector(".canvas-empty"),
      traceColor: palette.trace,
      rateColor: palette.rate,
      rateFill: palette.fill
    }, (view) => handlePlotWindow(key, view), (plotState) => handlePlotState(key, plotState));
    const item = { manager, lane, windowElement, recording, clusterId: Number(clusterId), result, paletteIndex, traceColor: palette.trace };
    state.comparisonItems.set(key, item);
    frame.addEventListener("pointerdown", () => setActivePlot(key), { capture: true });
    lane.querySelector(".trace-lane-header").addEventListener("click", (event) => {
      if (!event.target.closest(".trace-remove")) setActivePlot(key);
    });
    lane.querySelector(".trace-remove").addEventListener("click", () => removeComparisonView(key));

    const source = activePlotEntry();
    state.syncingTime = true;
    try {
      manager.setData({ ...result, sampleRate: recording.sampleRate });
      manager.setMode(state.interactionMode);
      if (state.timeLinked && source?.manager.data) manager.setWindow(source.manager.start, source.manager.span);
    } finally {
      state.syncingTime = false;
    }
    updateComparisonCount();
    setActivePlot(key);
  }

  async function addComparisonUnit(clusterId) {
    const recording = state.activeRecording;
    if (!recording) return;
    const key = viewKey(recording, clusterId);
    if (state.comparisonItems.has(key)) {
      removeComparisonView(key);
      return;
    }
    if (Number(clusterId) === Number(state.activeClusterId)) return;
    if (state.comparisonItems.size >= MAX_OPEN_UNITS - 1) {
      showToast(`${MAX_OPEN_UNITS} Units are already open. Remove one before adding another.`);
      return;
    }
    const datasetToken = state.datasetToken;
    state.comparisonLoading.add(key);
    renderUnitList();
    try {
      const result = await inspectRecordingUnit(recording, clusterId);
      if (datasetToken !== state.datasetToken || state.comparisonItems.has(key)) return;
      if (recording === state.activeRecording && Number(clusterId) === Number(state.activeClusterId)) return;
      createComparisonView(recording, clusterId, result);
      showToast(`Unit ${clusterId} added to comparison`);
    } catch (error) {
      showToast(`Could not compare Unit ${clusterId}: ${error.message}`);
    } finally {
      state.comparisonLoading.delete(key);
      renderUnitList();
    }
  }

  function renderReview(result, recording, clusterId) {
    const label = labelFor(recording, clusterId);
    const region = regionFor(recording, clusterId);
    state.primaryItem = { recording, clusterId: Number(clusterId), result, traceColor: "#9fc6f1" };
    elements.manualReviewEmpty.hidden = true;
    elements.primaryTraceLane.hidden = false;
    elements.primaryOverviewLabel.hidden = false;
    elements.primaryOverviewFrame.hidden = false;
    elements.primaryTraceTitle.textContent = `Unit ${clusterId}`;
    elements.primaryTraceMeta.textContent = [recording.name, label.quality, region?.region || "region unmapped", `${number(result.spikeCount)} spikes`].join(" · ");
    plots.setData({ ...result, sampleRate: recording.sampleRate });
    setActivePlot("primary");
    updateComparisonCount();
    setReviewState(state.dataMode === "database" ? "READY · DATABASE" : result.fallback ? "READY · MAIN THREAD" : "READY", "ready");
  }

  async function inspectUnit(clusterId, options = {}) {
    const recording = state.activeRecording;
    if (!recording || !Number.isFinite(Number(clusterId))) return;
    const localToken = ++state.selectionToken;
    state.activeClusterId = Number(clusterId);
    removeComparisonView(viewKey(recording, clusterId), { render: false });
    renderUnitList();
    elements.reviewTitle.textContent = `Unit ${clusterId}`;
    elements.reviewSubtitle.textContent = `${recording.name} · loading selected spike data`;
    setReviewState("READING", "loading");
    try {
      const result = await inspectRecordingUnit(recording, clusterId);
      if (localToken !== state.selectionToken || recording !== state.activeRecording) return;
      recording.unitSummaryMap = new Map(result.unitSummaries.map((item) => [item.id, item]));
      if (!recording.clusterLabels.length && result.unitSummaries.length) {
        recording.clusterLabels = result.unitSummaries.map((item) => ({ id: item.id, quality: "unknown" }));
        if (!recording.unitSummaryMap.has(Number(clusterId)) && !options.retry) {
          state.activeClusterId = result.unitSummaries[0].id;
          renderRecordings();
          renderUnitList();
          await inspectUnit(state.activeClusterId, { retry: true });
          return;
        }
        renderSummary();
        renderRecordings();
      }
      renderUnitList();
      renderReview(result, recording, clusterId);
    } catch (error) {
      if (localToken !== state.selectionToken) return;
      setReviewState("ERROR", "error");
      elements.reviewSubtitle.textContent = error.message;
      state.primaryItem = null;
      plots.clear();
      clearFocusedDetails();
      showToast(`Could not read Unit ${clusterId}: ${error.message}`);
    }
  }

  async function selectRecording(recording) {
    if (!recording) return;
    state.activeRecording = recording;
    const firstGood = recording.clusterLabels.find((item) => item.quality === "good");
    state.activeClusterId = firstGood?.id ?? recording.clusterLabels[0]?.id ?? 0;
    state.search = "";
    elements.unitSearch.value = "";
    renderRecordings();
    renderUnitList();
    await inspectUnit(state.activeClusterId);
  }

  function renderDialog() {
    const totalBytes = state.recordings.reduce((total, item) => total + item.totalBytes, 0);
    const usefulFiles = state.recordings.reduce((total, item) => total + item.usefulFileCount, 0)
      + (state.dataMode === "database" ? 0 : (state.regionResult?.files?.length || 0));
    const totalUnits = state.recordings.reduce((total, item) => total + item.clusterLabels.length, 0);
    elements.dialogFolder.textContent = state.rootName;
    elements.dialogBody.innerHTML = `
      <section class="details-section">
        <h2>${state.dataMode === "database" ? "DATABASE CATALOG" : "FOLDER SUMMARY"}</h2>
        <div class="details-grid">
          <div class="detail-item"><span>FILES RECEIVED</span><strong>${number(state.files.length)}</strong></div>
          <div class="detail-item"><span>FILES USED DIRECTLY</span><strong>${number(usefulFiles)}</strong></div>
          <div class="detail-item"><span>KILOSORT DATA SIZE</span><strong>${core.formatBytes(totalBytes)}</strong></div>
          <div class="detail-item"><span>VALID RECORDINGS</span><strong>${number(state.recordings.length)}</strong></div>
          <div class="detail-item"><span>LISTED UNITS</span><strong>${number(totalUnits)}</strong></div>
          <div class="detail-item"><span>REGION MAPPINGS</span><strong>${number(state.regionResult?.count || 0)}</strong></div>
        </div>
      </section>
      <section class="details-section">
        <h2>READABLE CONTENT</h2>
        <div class="details-grid">
          <div class="detail-item"><span>SPIKE TIMING</span><strong>spike_times.npy</strong></div>
          <div class="detail-item"><span>UNIT ASSIGNMENT</span><strong>spike_clusters.npy</strong></div>
          <div class="detail-item"><span>QUALITY</span><strong>cluster tables</strong></div>
          <div class="detail-item"><span>AMPLITUDE</span><strong>amplitudes.npy</strong></div>
          <div class="detail-item"><span>SPATIAL POSITION</span><strong>spike_positions.npy</strong></div>
          <div class="detail-item"><span>WAVEFORM SHAPE</span><strong>templates.npy</strong></div>
        </div>
        <p class="details-note">${state.dataMode === "database"
          ? "Recording, Unit, region, Probe, and asset metadata are queried from SQLite. Unit arrays are read by the local data service with a two-Recording cache; the browser receives only the selected Unit result."
          : "Large NPY payloads are read only for the active recording in a background worker. The complete folder is indexed, but all experiments are not held in memory at the same time."}</p>
      </section>
      <section class="details-section">
        <h2>RECORDINGS</h2>
        <table class="file-table"><thead><tr><th>Recording</th><th>Units</th><th>Spikes</th><th>Duration</th><th>Size</th></tr></thead><tbody>
          ${state.recordings.map((recording) => `<tr><td>${escapeHtml(recording.name)}</td><td>${number(recording.clusterLabels.length)}</td><td>${number(recording.spikeCount)}</td><td>${recording.duration.toFixed(2)} s</td><td>${core.formatBytes(recording.totalBytes)}</td></tr>`).join("")}
        </tbody></table>
        ${state.errors.length ? `<p class="details-note">${state.errors.length} candidate folders were not readable: ${escapeHtml(state.errors.join(" | "))}</p>` : ""}
      </section>
      <section class="details-section">
        <h2>RAW VOLTAGE</h2>
        <p class="details-note">The selected KiloSort folders contain spike-sorting outputs. Their params.py files refer to external continuous.dat paths, but the raw voltage files are not inside these folders. This interface therefore labels the primary plot as spike timing and does not present it as a raw voltage trace.</p>
      </section>`;
  }

  async function openFiles(files) {
    const selectedFiles = [...files].filter((file) => file && !String(file.name || "").startsWith("."));
    if (!selectedFiles.length) {
      showToast("The selected folder did not provide readable files");
      return;
    }
    state.datasetToken += 1;
    state.selectionToken += 1;
    state.dataMode = "folder";
    state.databaseCatalog = null;
    state.files = selectedFiles;
    state.rootName = core.rootName(selectedFiles);
    state.recordings = [];
    state.errors = [];
    state.regionResult = null;
    state.primaryItem = null;
    clearComparisonViews();
    plots.clear();
    clearFocusedDetails();
    elements.datasetTitle.textContent = state.rootName;
    showLoading("Inspecting folder", `${number(selectedFiles.length)} files received. Finding KiloSort recordings.`, 16);
    await clearWorker();

    const groups = core.groupExperimentFiles(selectedFiles);
    if (!groups.length) {
      showOnly("empty");
      elements.dropZone.querySelector("p").textContent = "No folder contains spike_times.npy, spike_clusters.npy, and params.py.";
      showToast("No KiloSort recording folders were found");
      return;
    }

    elements.loadingMessage.textContent = `Checking ${groups.length} candidate recordings without loading their large arrays.`;
    elements.loadingProgress.style.width = "34%";
    let completed = 0;
    const indexedPromise = Promise.allSettled(groups.map(async (group) => {
      try { return await core.indexExperiment(group); }
      finally {
        completed += 1;
        elements.loadingProgress.style.width = `${34 + completed / groups.length * 46}%`;
        elements.loadingMessage.textContent = `Checking recording ${completed}/${groups.length}.`;
      }
    }));
    const regionPromise = regionCore.scanFiles(selectedFiles).catch(() => ({ valid: false, mapping: new Map(), files: [], count: 0, regions: [] }));
    const [indexed, regionResult] = await Promise.all([indexedPromise, regionPromise]);
    indexed.forEach((result, index) => {
      if (result.status === "fulfilled") state.recordings.push(result.value);
      else state.errors.push(result.reason?.message || `${groups[index].name}: unreadable`);
    });
    state.recordings.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));
    state.regionResult = regionResult;

    if (!state.recordings.length) {
      showOnly("empty");
      elements.dropZone.querySelector("p").textContent = "KiloSort candidates were found, but none passed structural checks.";
      showToast("The KiloSort recordings could not be indexed");
      return;
    }

    elements.loadingProgress.style.width = "100%";
    elements.loadingTitle.textContent = "Folder ready";
    elements.loadingMessage.textContent = `${state.recordings.length} recordings detected. Opening the first good unit.`;
    renderSummary();
    renderDialog();
    elements.dataDetails.disabled = false;
    showOnly("explorer");
    await selectRecording(state.recordings[0]);
    showToast(`${state.recordings.length} recordings ready`);
  }

  async function openDatabaseCatalog() {
    state.datasetToken += 1;
    state.selectionToken += 1;
    state.dataMode = "database";
    state.primaryItem = null;
    clearComparisonViews();
    plots.clear();
    clearFocusedDetails();
    showLoading("Opening database", "Reading the local SQLite catalog and preparing the first Unit.", 18);
    const catalog = await databaseClient.loadCatalog();
    if (!catalog.recordings.length) throw new Error("The database does not contain a readable Recording");
    state.databaseCatalog = catalog;
    state.files = new Array(Number(catalog.summary?.asset_count || 0));
    state.rootName = catalog.dataset?.dataset_name || catalog.dataset?.dataset_id || "Neuropixels database";
    state.recordings = catalog.recordings;
    state.errors = [];
    state.regionResult = catalog.regionResult;
    elements.datasetTitle.textContent = `${state.rootName} · DATABASE`;
    elements.loadingProgress.style.width = "82%";
    elements.loadingMessage.textContent = `${state.recordings.length} recordings and ${number(state.recordings.reduce((sum, item) => sum + item.clusterLabels.length, 0))} Units indexed. Opening the first good Unit.`;
    renderSummary();
    renderDialog();
    elements.dataDetails.disabled = false;
    showOnly("explorer");
    await selectRecording(state.recordings[0]);
    showToast(`Database ready · ${catalog.serverTimingMs.toFixed(1)} ms catalog query`);
  }

  function attachRelativePath(file, path) {
    try { Object.defineProperty(file, "relativePath", { value: path, configurable: true }); }
    catch { file.relativePath = path; }
    return file;
  }

  function readDirectoryEntries(reader) {
    return new Promise((resolve, reject) => {
      const entries = [];
      const next = () => reader.readEntries((batch) => {
        if (!batch.length) { resolve(entries); return; }
        entries.push(...batch);
        next();
      }, reject);
      next();
    });
  }

  async function walkEntry(entry, parent = "") {
    const path = parent ? `${parent}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      return [attachRelativePath(file, path)];
    }
    if (!entry.isDirectory) return [];
    const children = await readDirectoryEntries(entry.createReader());
    const nested = await Promise.all(children.map((child) => walkEntry(child, path)));
    return nested.flat();
  }

  async function filesFromDrop(dataTransfer) {
    const entries = [...(dataTransfer.items || [])].map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
    if (entries.length) return (await Promise.all(entries.map((entry) => walkEntry(entry)))).flat();
    return [...(dataTransfer.files || [])];
  }

  function openPicker() {
    elements.folderInput.value = "";
    elements.folderInput.click();
  }

  elements.openFolder.addEventListener("click", openPicker);
  elements.emptyOpen.addEventListener("click", openPicker);
  elements.dropZone.addEventListener("click", (event) => { if (event.target === elements.dropZone || event.target.closest(".folder-mark")) openPicker(); });
  elements.dropZone.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); openPicker(); } });
  elements.folderInput.addEventListener("change", () => openFiles(elements.folderInput.files));

  elements.recordingStrip.addEventListener("click", (event) => {
    const button = event.target.closest("[data-recording-key]");
    const recording = state.recordings.find((item) => item.key === button?.dataset.recordingKey);
    if (recording && recording !== state.activeRecording) selectRecording(recording);
  });

  elements.unitList.addEventListener("click", (event) => {
    const compareButton = event.target.closest("[data-compare-cluster-id]");
    if (compareButton) {
      const clusterId = Number(compareButton.dataset.compareClusterId);
      if (clusterId === Number(state.activeClusterId)) closePrimaryView();
      else addComparisonUnit(clusterId);
      return;
    }
    const button = event.target.closest("[data-cluster-id]");
    if (!button) return;
    const clusterId = Number(button.dataset.clusterId);
    if (clusterId !== state.activeClusterId) inspectUnit(clusterId);
  });

  elements.unitSearch.addEventListener("input", (event) => {
    state.search = event.currentTarget.value;
    renderUnitList();
  });

  elements.qualityFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-quality]");
    if (!button) return;
    state.quality = button.dataset.quality;
    elements.qualityFilter.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    renderUnitList();
  });

  elements.unitList.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const buttons = [...elements.unitList.querySelectorAll("[data-cluster-id]")];
    const current = buttons.findIndex((button) => Number(button.dataset.clusterId) === state.activeClusterId);
    const next = clamp(current + (event.key === "ArrowDown" ? 1 : -1), 0, buttons.length - 1);
    if (buttons[next]) {
      event.preventDefault();
      buttons[next].focus();
      inspectUnit(Number(buttons[next].dataset.clusterId));
    }
  });

  elements.primaryTraceLane.addEventListener("pointerdown", () => setActivePlot("primary"), { capture: true });
  elements.primaryTraceLane.querySelector(".trace-lane-header").addEventListener("click", () => setActivePlot("primary"));
  elements.primaryTraceRemove.addEventListener("click", (event) => { event.stopPropagation(); closePrimaryView(); });
  document.getElementById("spike-overview-canvas").addEventListener("pointerdown", () => setActivePlot("primary"), { capture: true });
  elements.probeLegend.addEventListener("click", (event) => {
    const item = event.target.closest("[data-view-key]");
    if (item) setActivePlot(item.dataset.viewKey);
  });
  elements.probeLegend.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const item = event.target.closest("[data-view-key]");
    if (item) {
      event.preventDefault();
      setActivePlot(item.dataset.viewKey);
    }
  });
  elements.timeLink.addEventListener("click", () => setTimeLinked(!state.timeLinked));
  elements.zoomMode.addEventListener("click", () => setInteractionMode("zoom"));
  elements.panMode.addEventListener("click", () => setInteractionMode("pan"));
  elements.backTime.addEventListener("click", () => activePlotEntry()?.manager.back());
  elements.zoomOut.addEventListener("click", () => activePlotEntry()?.manager.zoom(1.5));
  elements.zoomIn.addEventListener("click", () => activePlotEntry()?.manager.zoom(.67));
  elements.resetTime.addEventListener("click", () => activePlotEntry()?.manager.reset());
  elements.dataDetails.addEventListener("click", () => { renderDialog(); elements.dataDialog.showModal(); });
  elements.closeDialog.addEventListener("click", () => elements.dataDialog.close());
  elements.dataDialog.addEventListener("click", (event) => {
    const rectangle = elements.dataDialog.getBoundingClientRect();
    if (event.clientX < rectangle.left || event.clientX > rectangle.right || event.clientY < rectangle.top || event.clientY > rectangle.bottom) elements.dataDialog.close();
  });

  document.addEventListener("dragenter", (event) => {
    event.preventDefault();
    state.dragDepth += 1;
    elements.dropOverlay.hidden = false;
    elements.dropZone.classList.add("is-dragging");
  });
  document.addEventListener("dragover", (event) => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"; });
  document.addEventListener("dragleave", (event) => {
    event.preventDefault();
    state.dragDepth = Math.max(0, state.dragDepth - 1);
    if (!state.dragDepth) {
      elements.dropOverlay.hidden = true;
      elements.dropZone.classList.remove("is-dragging");
    }
  });
  document.addEventListener("drop", async (event) => {
    event.preventDefault();
    state.dragDepth = 0;
    elements.dropOverlay.hidden = true;
    elements.dropZone.classList.remove("is-dragging");
    showLoading("Reading folder", "Collecting files from the dropped directory.", 8);
    try { await openFiles(await filesFromDrop(event.dataTransfer)); }
    catch (error) {
      showOnly("empty");
      showToast(`Could not read the dropped folder: ${error.message}`);
    }
  });

  window.addEventListener("beforeunload", () => {
    state.worker?.terminate();
    if (state.workerUrl) URL.revokeObjectURL(state.workerUrl);
  });

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  async function initialize() {
    if (["http:", "https:"].includes(window.location.protocol)) {
      try {
        await openDatabaseCatalog();
        return;
      } catch (error) {
        showOnly("empty");
        showToast(`Database service unavailable: ${error.message}`);
      }
    }
    showOnly("empty");
  }

  initialize();
})();
