(() => {
  "use strict";

  const core = window.NeuropixelExplorerCore;
  const regionCore = window.NeuropixelRegionCore;
  const PlotManager = window.NeuropixelPlots.PlotManager;
  const setPlotTheme = window.NeuropixelPlots.setPlotTheme;
  const ProbeViewer = window.NeuropixelProbeView.ProbeViewer;
  const setProbeTheme = window.NeuropixelProbeView.setProbeTheme;
  const dataStatusApi = window.NeuropixelsDataStatus;
  const themeController = window.neuropixelsThemeController;
  const i18nApi = window.NeuropixelsI18n;
  const languageController = window.neuropixelsLanguageController;
  const helpContent = window.NeuropixelsHelpContent;
  const databaseClient = window.NeuropixelDatabaseClient;
  const WorkspaceLayout = window.NeuropixelsWorkspaceLayout.WorkspaceLayout;
  const VideoSyncController = window.NeuropixelsVideoSync.VideoSyncController;
  const ActivityAnatomyCanvas = window.NeuropixelsActivityOverview.ActivityAnatomyCanvas;
  let themeSnapshot = themeController.snapshot();
  let languageSnapshot = languageController.snapshot();
  const t = (key, values) => languageController.t(key, values);
  setPlotTheme(themeSnapshot.palette.canvas);
  setProbeTheme(themeSnapshot.palette.probe);

  const elements = {
    shell: document.getElementById("app-shell"),
    datasetTitle: document.getElementById("dataset-title"),
    openFolder: document.getElementById("open-folder-button"),
    emptyOpen: document.getElementById("empty-open-button"),
    folderInput: document.getElementById("folder-input"),
    supplementFileInput: document.getElementById("supplement-file-input"),
    supplementFolderInput: document.getElementById("supplement-folder-input"),
    emptyView: document.getElementById("empty-view"),
    dropZone: document.getElementById("drop-zone"),
    loadingView: document.getElementById("loading-view"),
    loadingProgress: document.getElementById("loading-progress"),
    loadingTitle: document.getElementById("loading-title"),
    loadingMessage: document.getElementById("loading-message"),
    explorerView: document.getElementById("explorer-view"),
    summaryNumbers: document.getElementById("summary-numbers"),
    capabilityRow: document.getElementById("capability-row"),
    dataStatusButton: document.getElementById("data-status-button"),
    dataStatusSummary: document.getElementById("data-status-summary"),
    dataStatusPopover: document.getElementById("data-status-popover"),
    dataStatusContext: document.getElementById("data-status-context"),
    dataStatusGroups: document.getElementById("data-status-groups"),
    closeDataStatus: document.getElementById("close-data-status"),
    themeSelect: document.getElementById("theme-select"),
    languageSelect: document.getElementById("language-select"),
    helpButton: document.getElementById("help-button"),
    helpDrawer: document.getElementById("help-drawer"),
    helpBackdrop: document.getElementById("help-backdrop"),
    closeHelp: document.getElementById("close-help-button"),
    helpContent: document.getElementById("help-content"),
    contextTooltip: document.getElementById("context-tooltip"),
    recordingStrip: document.getElementById("recording-strip"),
    recordingPrevious: document.getElementById("recording-scroll-previous"),
    recordingNext: document.getElementById("recording-scroll-next"),
    experimentWorkspace: document.getElementById("experiment-workspace"),
    experimentBody: document.querySelector(".experiment-body"),
    experimentRecordingName: document.getElementById("experiment-recording-name"),
    experimentFacts: document.getElementById("experiment-facts"),
    experimentTime: document.getElementById("experiment-time-readout"),
    activityStatus: document.getElementById("activity-status"),
    activityCanvas: document.getElementById("activity-anatomy-canvas"),
    activityTooltip: document.getElementById("activity-tooltip"),
    activityEmpty: document.getElementById("activity-empty"),
    videoHost: document.getElementById("experiment-video-region"),
    videoSplitter: document.getElementById("video-region-splitter"),
    findUnitButton: document.getElementById("find-unit-button"),
    findUnitPopover: document.getElementById("find-unit-popover"),
    findUnitInput: document.getElementById("find-unit-input"),
    findUnitResults: document.getElementById("find-unit-results"),
    inspectUnitButton: document.getElementById("inspect-unit-button"),
    closeUnitInspector: document.getElementById("close-unit-inspector"),
    reviewLayout: document.getElementById("review-layout"),
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
    primaryPlotCard: document.querySelector(".primary-plot-card"),
    unitPanelHelp: document.getElementById("unit-panel-help"),
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
    cursorMode: document.getElementById("cursor-mode-button"),
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
    probeGroup: document.getElementById("probe-group"),
    probeGroupMeta: document.getElementById("probe-group-meta"),
    probeLegend: document.getElementById("probe-legend"),
    probeUnit: document.getElementById("probe-unit"),
    probeRegion: document.getElementById("probe-region"),
    probePhysical: document.getElementById("probe-physical"),
    probeChannel: document.getElementById("probe-channel"),
    probeX: document.getElementById("probe-x"),
    probeDepth: document.getElementById("probe-depth"),
    probeSource: document.getElementById("probe-source"),
    probeNote: document.getElementById("probe-note"),
    nearbyContext: document.getElementById("nearby-context"),
    nearbyUnitList: document.getElementById("nearby-unit-list"),
    probeTooltip: document.getElementById("probe-tooltip"),
    probeStackMenu: document.getElementById("probe-stack-menu"),
    probeStackTitle: document.getElementById("probe-stack-title"),
    probeStackList: document.getElementById("probe-stack-list"),
    probeTrackStatus: document.getElementById("probe-track-status"),
    unitContextMenu: document.getElementById("unit-context-menu"),
    unitContextTitle: document.getElementById("unit-context-title"),
    videoPanel: document.getElementById("video-sync-panel"),
    videoSource: document.getElementById("video-source-label"),
    videoStatus: document.getElementById("video-sync-status"),
    videoBody: document.getElementById("video-sync-body"),
    video: document.getElementById("behavior-video"),
    videoCanvas: document.getElementById("synthetic-video-canvas"),
    videoEmpty: document.getElementById("video-empty"),
    videoError: document.getElementById("video-error"),
    videoGenerate: document.getElementById("generate-synthetic-video"),
    videoChoose: document.getElementById("choose-local-video"),
    videoFile: document.getElementById("video-file-input"),
    videoTransport: document.getElementById("video-transport"),
    videoMapping: document.getElementById("video-mapping"),
    videoPlay: document.getElementById("video-play-button"),
    videoPrevious: document.getElementById("video-previous-frame"),
    videoNext: document.getElementById("video-next-frame"),
    videoSeek: document.getElementById("video-seek"),
    videoSpeed: document.getElementById("video-speed-select"),
    videoFollow: document.getElementById("video-follow"),
    videoCurrent: document.getElementById("video-current-time"),
    videoDuration: document.getElementById("video-duration"),
    videoFrame: document.getElementById("video-frame-number"),
    videoNeural: document.getElementById("video-neural-time"),
    videoOffset: document.getElementById("video-offset"),
    videoCollapse: document.getElementById("video-collapse-button")
  };

  elements.videoHost?.append(elements.videoPanel);
  // The editor and time strip belong to the video, not a new workspace row.
  elements.videoTransport.after(document.getElementById("annotation-timeline"));
  elements.videoBody.append(document.getElementById("annotation-panel"));

  const state = {
    dataMode: "folder",
    databaseCatalog: null,
    files: [],
    rootName: "",
    recordings: [],
    errors: [],
    regionResult: null,
    activeRecording: null,
    quality: "all",
    search: "",
    datasetToken: 0,
    selectionToken: 0,
    worker: null,
    workerUrl: null,
    workerSequence: 0,
    pending: new Map(),
    dragDepth: 0,
    openUnits: new Map(),
    loadingUnits: new Set(),
    focusedUnit: null,
    contextUnit: null,
    timeLinked: true,
    syncingTime: false,
    interactionMode: "cursor",
    pendingSupplement: null,
    supplementBusy: false,
    playbackNeuralTime: null,
    overviewToken: 0,
    overviewAbortController: null,
    activityLevelAbortController: null,
    activityLevelToken: 0,
    activityLevelTimer: null,
    activityOverviewCache: new Map(),
    activeActivityOverview: null,
    activityLayoutSummary: null,
    videoSplitPercent: 35,
    pendingVideoCursorTime: null,
    experimentView: {
      visibleRange: { start: 0, end: 0 },
      cursorTime: 0,
      selectedInterval: null,
      selectedGroupKey: null,
      groupFocusPath: [],
      selectedUnitId: null,
      selectedShank: null,
      selectedRegion: null,
      expandedUnitId: null
    }
  };

  function videoIsEmphasized() { return Boolean(state.videoEnlarged || state.videoAnnotating); }

  function setVideoEmphasis(kind, enabled) {
    state[kind === "annotation" ? "videoAnnotating" : "videoEnlarged"] = Boolean(enabled);
    elements.experimentBody.classList.toggle("video-emphasis", videoIsEmphasized());
    const region = document.getElementById("experiment-video-region");
    region.classList.toggle("is-enlarged", Boolean(state.videoEnlarged));
    const expand = document.getElementById("expand-video");
    expand.setAttribute("aria-pressed", String(Boolean(state.videoEnlarged)));
    expand.hidden = Boolean(state.videoAnnotating);
    setVideoSplitPercent(videoIsEmphasized() ? state.videoFocusSplitPercent || 66 : state.videoSplitPercent || 35);
  }

  function setVideoSplitPercent(value) {
    const focused = videoIsEmphasized();
    const requested = Math.max(25, Math.min(focused ? 72 : 50, Number(value) || (focused ? 66 : 35)));
    state[focused ? "videoFocusSplitPercent" : "videoSplitPercent"] = requested;
    // Reserve a readable neural texture after its anatomy gutter and Probe.
    const width = Math.max(1, elements.experimentBody.clientWidth - 24);
    const contextWidth = document.querySelector(".mini-probe.probe-expanded") ? 844 : 620;
    const maximum = Math.min(focused ? 72 : 50, Math.max(25, (width - contextWidth - 20) / width * 100));
    const percentValue = Math.min(requested, maximum);
    elements.experimentBody?.style.setProperty("--video-region-width", `${percentValue}%`);
    elements.videoSplitter?.setAttribute("aria-valuenow", String(Math.round(percentValue)));
    elements.videoSplitter?.setAttribute("aria-valuemax", String(Math.round(maximum)));
  }

  function installVideoSplitter() {
    const splitter = elements.videoSplitter;
    const body = elements.experimentBody;
    if (!splitter || !body) return;
    splitter.setAttribute("aria-valuemin", "25");
    splitter.setAttribute("aria-valuemax", "50");
    splitter.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      splitter.classList.add("is-dragging");
      splitter.setPointerCapture?.(event.pointerId);
    });
    splitter.addEventListener("pointermove", (event) => {
      if (!splitter.hasPointerCapture?.(event.pointerId)) return;
      const rectangle = body.getBoundingClientRect();
      setVideoSplitPercent((rectangle.right - event.clientX) / Math.max(1, rectangle.width) * 100);
    });
    const finish = (event) => {
      if (splitter.hasPointerCapture?.(event.pointerId)) splitter.releasePointerCapture(event.pointerId);
      splitter.classList.remove("is-dragging");
    };
    splitter.addEventListener("pointerup", finish);
    splitter.addEventListener("pointercancel", finish);
    splitter.addEventListener("dblclick", () => setVideoSplitPercent(videoIsEmphasized() ? 66 : 35));
    splitter.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
      event.preventDefault();
      setVideoSplitPercent(event.key === "Home" ? (videoIsEmphasized() ? 66 : 35) : Number(splitter.getAttribute("aria-valuenow")) + (event.key === "ArrowLeft" ? 2 : -2));
    });
    setVideoSplitPercent(35);
    const resize = () => setVideoSplitPercent(videoIsEmphasized() ? state.videoFocusSplitPercent || 66 : state.videoSplitPercent || 35);
    new ResizeObserver(resize).observe(body);
    new MutationObserver(resize).observe(document.getElementById("mini-probe"), { attributes: true, attributeFilter: ["class"] });
  }

  installVideoSplitter();

  let helpReturnFocus = null;
  let activeHelpControl = null;

  const workspaceLayout = new WorkspaceLayout({
    layout: document.getElementById("review-layout"),
    unitPanel: document.getElementById("unit-panel"),
    probePanel: document.getElementById("spatial-panel"),
    unitSplitter: document.getElementById("unit-panel-splitter"),
    probeSplitter: document.getElementById("probe-panel-splitter"),
    probeHeightSplitter: document.getElementById("probe-height-splitter"),
    unitToggle: document.getElementById("unit-panel-toggle"),
    probeToggle: document.getElementById("probe-panel-toggle")
  });

  let videoController = null;
  let projectUI = null;
  let miniProbe = null;
  let annotationController = null;
  let pinnedComparison = null;

  const plots = new PlotManager({
    detail: document.getElementById("spike-detail-canvas"),
    overview: document.getElementById("spike-overview-canvas"),
    detailFrame: document.getElementById("spike-detail-frame"),
    selection: document.getElementById("zoom-selection"),
    selectionLabel: document.getElementById("zoom-selection-label"),
    cursor: document.getElementById("primary-plot-cursor"),
    cursorLabel: document.getElementById("primary-plot-cursor-label"),
    playhead: document.getElementById("primary-sync-playhead"),
    onCursorCommit: (time) => videoController?.seekNeural(time),
    traceColor: themeSnapshot.palette.units.primary.trace,
    rateColor: themeSnapshot.palette.units.primary.rate,
    rateFill: themeSnapshot.palette.units.primary.fill,
    detailEmpty: document.getElementById("spike-detail-empty")
  }, (view) => handlePlotWindow(primaryOpenUnit()?.key || "primary", view), (plotState) => handlePlotState(primaryOpenUnit()?.key || "primary", plotState));

  const detailPlots = new PlotManager({
    template: document.getElementById("template-canvas"),
    templateEmpty: document.getElementById("template-empty")
  });

  const probeViewer = new ProbeViewer({
    canvas: elements.probeCanvas,
    count: elements.probeCount,
    groupMeta: elements.probeGroupMeta,
    legend: elements.probeLegend,
    unit: elements.probeUnit,
    region: elements.probeRegion,
    physical: elements.probePhysical,
    channel: elements.probeChannel,
    x: elements.probeX,
    depth: elements.probeDepth,
    source: elements.probeSource,
    note: elements.probeNote,
    nearbyContext: elements.nearbyContext,
    nearbyList: elements.nearbyUnitList,
    tooltip: elements.probeTooltip,
    stackMenu: elements.probeStackMenu,
    stackTitle: elements.probeStackTitle,
    stackList: elements.probeStackList,
    trackStatus: elements.probeTrackStatus
  }, (interaction) => handleProbeUnitInteraction(interaction), ({ probeId, depth, segment }) => {
    showToast(t("toast.probePosition", { probe: 1, shank: Number(probeId) + 1, region: segment?.region || t("units.unmapped"), depth: depth.toFixed(0) }));
  });

  elements.probeGroup?.addEventListener("toggle", () => {
    if (elements.probeGroup.open) requestAnimationFrame(() => probeViewer.draw());
  });

  videoController = new VideoSyncController({
    panel: elements.videoPanel,
    source: elements.videoSource,
    status: elements.videoStatus,
    body: elements.videoBody,
    video: elements.video,
    canvas: elements.videoCanvas,
    empty: elements.videoEmpty,
    error: elements.videoError,
    synthetic: elements.videoGenerate,
    choose: elements.videoChoose,
    file: elements.videoFile,
    controls: elements.videoTransport,
    mapping: elements.videoMapping,
    play: elements.videoPlay,
    previous: elements.videoPrevious,
    next: elements.videoNext,
    seek: elements.videoSeek,
    seekSeconds: document.getElementById("video-seek-seconds"),
    speed: elements.videoSpeed,
    customSpeed: document.getElementById("video-custom-speed"),
    follow: elements.videoFollow,
    current: elements.videoCurrent,
    duration: elements.videoDuration,
    frame: elements.videoFrame,
    neural: elements.videoNeural,
    offset: elements.videoOffset,
    collapse: elements.videoCollapse
  }, {
    onNeuralTime: (time, context) => handleVideoNeuralTime(time, context),
    onStateChange: (snapshot) => {
      if (snapshot?.hasSource && state.pendingVideoCursorTime != null) {
        const desired = state.pendingVideoCursorTime;
        state.pendingVideoCursorTime = null;
        queueMicrotask(() => videoController?.seekNeural(desired));
      }
      renderExperimentHeader();
    },
    translator: t
  });

  [elements.videoGenerate, elements.videoChoose].forEach((control) => control?.addEventListener("click", () => {
    state.pendingVideoCursorTime = Number(state.experimentView.cursorTime || 0);
  }, { capture: true }));

  const activityCanvas = new ActivityAnatomyCanvas({
    canvas: elements.activityCanvas,
    behaviorStrip: document.getElementById("neural-behavior-strip"),
    tooltip: elements.activityTooltip,
    empty: elements.activityEmpty
  }, {
    onStateChange: (patch, snapshot) => handleExperimentViewChange(patch, snapshot),
    onCursorCommit: (time) => videoController?.seekNeural(time),
    onUnitSelect: (unitId) => selectActivityUnit(unitId),
    onAnnotationSelect: (id) => annotationController?.select(id, { openEditor: false }),
    onAggregateSelect: () => renderExperimentHeader(),
    onAnatomySelect: () => renderExperimentHeader(),
    onLayoutChange: (summary) => {
      state.activityLayoutSummary = summary;
      renderActivityStatus();
    }
  });

  pinnedComparison = new window.NeuropixelsPinnedComparison(document.getElementById("pinned-comparison"), {
    PlotManager, getView: () => state.experimentView, setView: setExperimentView,
    onChange: () => renderExperimentHeader(), t
  });

  annotationController = new window.NeuropixelsAnnotationUI.AnnotationController({
    panel: document.getElementById("annotation-panel"),
    strip: document.getElementById("annotation-timeline"),
    button: document.getElementById("annotation-toggle"),
    video: videoController,
    getRecording: () => state.activeRecording,
    getView: () => state.experimentView,
    setView: (patch, options) => setExperimentView(patch, options),
    onOpenChange: (opened) => setVideoEmphasis("annotation", opened),
    onAnnotations: (intervals) => {
      activityCanvas.setAnnotations(intervals);
      const legend = document.getElementById("annotation-color-legend");
      if (legend) {
        legend.replaceChildren();
        for (const [label, color] of new Map(intervals.filter(s => s.label).map(s => [s.label, s.color]))) {
          const item = document.createElement("span"); item.textContent = label; item.style.setProperty("--label-color", color); legend.append(item);
        }
      }
    },
    toast: (message) => showToast(message)
  });

  miniProbe = new window.NeuropixelsMiniProbe(document.getElementById("mini-probe"), selectActivityUnit, (region) => {
    setExperimentView({ selectedRegion: region, selectedShank: null, selectedUnitId: null, expandedUnitId: null, selectedGroupKey: null, groupFocusPath: [] });
  });
  projectUI = new window.NeuropixelsProjectUI({state, video:videoController, annotations:annotationController,
    onVideoExpand: (enabled = !state.videoEnlarged) => setVideoEmphasis("video", enabled),
    openCatalog:openDatabaseCatalog, home:()=>showOnly("empty"), resume:()=>showOnly("explorer"),
    toast:showToast, folderFallback:openPicker});

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  const number = (value) => Number(value || 0).toLocaleString();
  const percent = (value) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : "—";
  let comparisonColors = [...themeSnapshot.palette.units.comparisons];
  const MAX_OPEN_UNITS = 10;

  function paletteForEntry(entry) {
    if (!entry || Number(entry.paletteIndex) < 0) return themeSnapshot.palette.units.primary;
    return comparisonColors[Number(entry.paletteIndex) % comparisonColors.length] || themeSnapshot.palette.units.primary;
  }

  function applyThemeSnapshot(next) {
    themeSnapshot = next;
    comparisonColors = [...next.palette.units.comparisons];
    elements.themeSelect.value = next.preference;
    setPlotTheme(next.palette.canvas);
    pinnedComparison?.refresh(next.palette.units.primary);
    setProbeTheme(next.palette.probe);
    plotEntries().forEach((entry) => {
      const palette = paletteForEntry(entry);
      entry.traceColor = palette.trace;
      entry.manager.setColors(palette);
      entry.lane?.style.setProperty("--trace-color", palette.trace);
    });
    detailPlots.render();
    const focused = focusedEntry();
    elements.detailsContext.style.setProperty("--trace-color", focused?.traceColor || next.palette.probe.unopened);
    syncProbeView();
    activityCanvas.render();
  }

  function localizeHelpControls() {
    document.querySelectorAll(".context-help[data-help-key]").forEach((button) => {
      const topic = t(button.dataset.helpTopic || button.dataset.helpKey);
      button.setAttribute("aria-label", t("help.tipAria", { topic }));
    });
  }

  function renderHelpContent() {
    const content = helpContent?.[languageSnapshot.language] || helpContent?.en;
    elements.helpContent.innerHTML = content?.html || "";
    elements.helpContent.scrollTop = 0;
  }

  function openHelp() {
    helpReturnFocus = document.activeElement;
    renderHelpContent();
    elements.helpDrawer.hidden = false;
    elements.helpBackdrop.hidden = false;
    elements.helpButton.setAttribute("aria-expanded", "true");
    elements.closeHelp.focus({ preventScroll: true });
  }

  function closeHelp({ restoreFocus = true } = {}) {
    elements.helpDrawer.hidden = true;
    elements.helpBackdrop.hidden = true;
    elements.helpButton.setAttribute("aria-expanded", "false");
    if (restoreFocus && helpReturnFocus?.focus) helpReturnFocus.focus({ preventScroll: true });
    helpReturnFocus = null;
  }

  function positionContextTooltip(control) {
    const margin = 8;
    const gap = 7;
    const rectangle = control.getBoundingClientRect();
    const tooltip = elements.contextTooltip;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let left = rectangle.left + rectangle.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    let top = rectangle.bottom + gap;
    if (top + height > window.innerHeight - margin) top = rectangle.top - height - gap;
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function showContextHelp(control) {
    if (!control?.dataset.helpKey) return;
    if (activeHelpControl && activeHelpControl !== control) hideContextHelp(activeHelpControl);
    activeHelpControl = control;
    elements.contextTooltip.textContent = t(control.dataset.helpKey);
    elements.contextTooltip.hidden = false;
    control.setAttribute("aria-describedby", "context-tooltip");
    control.setAttribute("aria-expanded", "true");
    positionContextTooltip(control);
  }

  function hideContextHelp(control = activeHelpControl) {
    if (!control || control !== activeHelpControl) return;
    control.removeAttribute("aria-describedby");
    control.setAttribute("aria-expanded", "false");
    elements.contextTooltip.hidden = true;
    activeHelpControl = null;
  }

  function applyLanguageSnapshot(next) {
    languageSnapshot = next;
    pinnedComparison?.refresh();
    elements.languageSelect.value = next.language;
    i18nApi.translateDocument(document, next.language);
    localizeHelpControls();
    probeViewer.setTranslator?.(t);
    workspaceLayout.setTranslator?.(t);
    videoController?.setTranslator(t);
    annotationController?.render();
    if (!elements.helpDrawer.hidden) renderHelpContent();
    if (activeHelpControl) showContextHelp(activeHelpControl);
    if (state.recordings.length) {
      elements.datasetTitle.textContent = state.rootName;
      renderSummary();
      renderRecordings();
      renderUnitList();
      updateOpenUnitCount();
      refreshOpenUnitLabels();
      const focused = focusedEntry();
      if (focused) {
        renderFocusedDetails(focused);
        setReviewState(t(state.dataMode === "database" ? "review.database" : focused.result?.fallback ? "review.mainThread" : "review.ready"), "ready");
      }
      else clearFocusedDetails();
      renderDialog();
      renderExperimentHeader();
      renderFindUnitResults();
      renderActivityStatus();
    } else {
      elements.datasetTitle.textContent = t("app.noFolder");
      clearFocusedDetails();
      updateOpenUnitCount();
    }
    setTimeLinked(state.timeLinked);
    syncProbeView();
  }

  function refreshOpenUnitLabels() {
    const unitTerm = i18nApi.GLOSSARY.unit[languageSnapshot.language];
    const spikeTerm = i18nApi.GLOSSARY.spike[languageSnapshot.language];
    plotEntries().forEach((entry) => {
      const label = labelFor(entry.recording, entry.clusterId);
      const region = regionFor(entry.recording, entry.clusterId)?.region || t("review.regionShortUnmapped");
      const meta = [entry.recording.name, label.quality, region, `${number(entry.result.spikeCount)} ${spikeTerm}`].join(" · ");
      const title = entry.lane?.querySelector(".trace-identity strong");
      const description = entry.lane?.querySelector(".trace-identity span");
      const close = entry.lane?.querySelector(".trace-remove");
      const canvas = entry.lane?.querySelector(".detail-frame canvas");
      if (title) title.textContent = `${unitTerm} ${entry.clusterId}`;
      if (description) description.textContent = meta;
      if (close) {
        close.setAttribute("aria-label", t("review.closeUnitSignal", { id: entry.clusterId }));
        close.title = t("review.closeSignalTitle");
      }
      if (canvas) canvas.setAttribute("aria-label", `${unitTerm} ${entry.clusterId} · ${spikeTerm} · ${i18nApi.GLOSSARY.firingRate[languageSnapshot.language]}`);
    });
  }

  function viewKey(recording, clusterId) {
    return `${recording?.key || "recording"}::${Number(clusterId)}`;
  }

  function plotEntries() {
    return [...state.openUnits.values()].sort((left, right) => Number(right.manager === plots) - Number(left.manager === plots));
  }

  function primaryOpenUnit() {
    return plotEntries().find((entry) => entry.manager === plots) || null;
  }

  function focusedEntry() {
    return state.openUnits.get(state.focusedUnit) || plotEntries()[0] || null;
  }

  function formatTimeWindow({ start, end, span }) {
    const digits = span < .1 ? 4 : span < 1 ? 3 : 2;
    return `${start.toFixed(digits)}–${end.toFixed(digits)} s · ${span.toFixed(digits)} s`;
  }

  function updateOpenUnitCount() {
    const count = state.openUnits.size;
    elements.comparisonCount.textContent = count === 0
      ? t("review.noUnitsHint")
      : count === 1
        ? t("review.oneUnitHint")
        : t("review.manyUnitsHint", { count, linkState: t(state.timeLinked ? "review.linkedAxes" : "review.independentAxes") });
  }

  function handlePlotWindow(key, view) {
    const entry = plotEntries().find((item) => item.key === key);
    if (entry?.windowElement) entry.windowElement.textContent = formatTimeWindow(view);
    if (!state.timeLinked || state.syncingTime) return;
    state.syncingTime = true;
    try {
      plotEntries().forEach((item) => {
        if (item.key === key || !item.manager.data) return;
        if (entry?.manager.history.length > item.manager.history.length) {
          item.manager.pushHistory({ start: item.manager.start, span: item.manager.span });
        }
        item.manager.setWindow(view.start, view.span);
      });
    } finally {
      state.syncingTime = false;
    }
  }

  function handleVideoNeuralTime(time, context = {}) {
    state.playbackNeuralTime = Number.isFinite(Number(time)) ? Number(time) : null;
    plotEntries().forEach((entry) => entry.manager.setPlaybackTime(state.playbackNeuralTime));
    if (state.playbackNeuralTime != null) setExperimentView({ cursorTime: state.playbackNeuralTime });
    if (!context.follow || state.playbackNeuralTime == null) return;
    const source = focusedEntry() || primaryOpenUnit();
    if (!source?.manager.data) return;
    const viewStart = source.manager.start;
    const viewEnd = viewStart + source.manager.span;
    const margin = source.manager.span * .08;
    if (state.playbackNeuralTime >= viewStart + margin && state.playbackNeuralTime <= viewEnd - margin) return;
    const nextStart = state.playbackNeuralTime - source.manager.span * .22;
    state.syncingTime = true;
    try {
      if (state.timeLinked) plotEntries().forEach((entry) => entry.manager.setWindow(nextStart, entry.manager.span));
      else source.manager.setWindow(nextStart, source.manager.span);
    } finally {
      state.syncingTime = false;
    }
  }

  function backFocusedTime() {
    const source = focusedEntry();
    if (!source?.manager.data || !source.manager.history.length) return;
    if (!state.timeLinked) {
      source.manager.back();
      return;
    }
    const target = source.manager.history[source.manager.history.length - 1];
    plotEntries().forEach((item) => {
      if (item.manager.history.length) item.manager.history.pop();
      item.manager.notifyState();
    });
    source.manager.animateTo(target.start, target.span);
  }

  function handlePlotState(key, plotState) {
    if (key !== state.focusedUnit) return;
    const cursor = plotState.mode === "cursor";
    const zooming = plotState.mode === "zoom";
    const panning = plotState.mode === "pan";
    state.interactionMode = plotState.mode;
    elements.cursorMode.classList.toggle("active", cursor);
    elements.zoomMode.classList.toggle("active", zooming);
    elements.panMode.classList.toggle("active", panning);
    elements.cursorMode.setAttribute("aria-pressed", String(cursor));
    elements.zoomMode.setAttribute("aria-pressed", String(zooming));
    elements.panMode.setAttribute("aria-pressed", String(panning));
    elements.backTime.disabled = !plotState.canGoBack;
    elements.zoomOut.disabled = !plotState.hasData;
    elements.zoomIn.disabled = !plotState.hasData;
    elements.resetTime.disabled = !plotState.hasData;
  }

  function revealFocusedUnit(entry) {
    if (!entry?.recording) return;
    const recordingChanged = state.activeRecording !== entry.recording;
    state.activeRecording = entry.recording;
    state.search = "";
    state.quality = "all";
    elements.unitSearch.value = "";
    elements.qualityFilter.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.quality === "all"));
    if (recordingChanged) renderRecordings();
    if (recordingChanged) videoController?.setRecording(entry.recording, state.databaseCatalog?.videos || []);
    renderUnitList();
    requestAnimationFrame(() => {
      elements.unitList.querySelector(`[data-cluster-id="${Number(entry.clusterId)}"]`)?.scrollIntoView({ block: "nearest" });
    });
  }

  function setFocusedUnit(key, { reveal = true } = {}) {
    const next = state.openUnits.get(key) || null;
    state.focusedUnit = next?.key || null;
    plotEntries().forEach((entry) => entry.lane?.classList.toggle("active", entry.key === state.focusedUnit));
    if (!next) {
      clearFocusedDetails();
      syncProbeView();
      renderUnitList();
      return;
    }
    if (reveal) revealFocusedUnit(next);
    else renderUnitList();
    handlePlotState(next.key, {
      mode: next.manager.mode,
      canGoBack: next.manager.history.length > 0,
      hasData: Boolean(next.manager.data)
    });
    renderFocusedDetails(next);
  }

  function setInteractionMode(mode) {
    state.interactionMode = ["cursor", "zoom", "pan"].includes(mode) ? mode : "cursor";
    plotEntries().forEach((entry) => entry.manager.setMode(state.interactionMode));
  }

  function setTimeLinked(linked) {
    const wasLinked = state.timeLinked;
    state.timeLinked = Boolean(linked);
    elements.timeLink.classList.toggle("active", state.timeLinked);
    elements.timeLink.setAttribute("aria-pressed", String(state.timeLinked));
    elements.timeLink.textContent = t(state.timeLinked ? "controls.timeLinked" : "controls.timeIndependent");
    elements.timeLink.title = t(state.timeLinked ? "controls.linkedTitle" : "controls.independentTitle");
    if (state.timeLinked) {
      const source = focusedEntry();
      if (!wasLinked) {
        plotEntries().forEach((item) => {
          item.manager.history = [];
          item.manager.notifyState();
        });
      }
      if (source?.manager.data) handlePlotWindow(source.key, { start: source.manager.start, end: source.manager.start + source.manager.span, span: source.manager.span });
    }
    updateOpenUnitCount();
  }

  function clearOpenUnitViews({ render = true } = {}) {
    state.openUnits.forEach((item) => {
      if (item.manager !== plots) item.manager.destroy();
      if (item.lane !== elements.primaryTraceLane) item.lane.remove();
    });
    state.openUnits.clear();
    state.loadingUnits.clear();
    elements.comparisonTraces.replaceChildren();
    state.focusedUnit = null;
    plots.clear();
    elements.primaryTraceLane.hidden = true;
    elements.primaryTraceLane.dataset.viewKey = "";
    elements.primaryOverviewLabel.hidden = true;
    elements.primaryOverviewFrame.hidden = true;
    elements.manualReviewEmpty.hidden = false;
    elements.primaryTraceTitle.textContent = t("review.unitPlaceholder");
    elements.primaryTraceMeta.textContent = t("review.selectFromList");
    elements.timeWindow.textContent = "—";
    setReviewState(t("review.idle"));
    clearFocusedDetails();
    syncProbeView();
    updateOpenUnitCount();
    if (render) renderUnitList();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
  }

  function hideUnitContextMenu() {
    elements.unitContextMenu.hidden = true;
    state.contextUnit = null;
  }

  function openUnitContextMenu(recording, clusterId, clientX, clientY) {
    if (!recording || !Number.isFinite(Number(clusterId))) return;
    const key = viewKey(recording, clusterId);
    state.contextUnit = { recording, clusterId: Number(clusterId), key };
    elements.unitContextTitle.textContent = `${i18nApi.GLOSSARY.unit[languageSnapshot.language]} ${Number(clusterId)} · ${recording.name}`;
    const removeButton = elements.unitContextMenu.querySelector('[data-unit-action="remove"]');
    removeButton.disabled = !state.openUnits.has(key);
    elements.unitContextMenu.hidden = false;
    const width = elements.unitContextMenu.offsetWidth;
    const height = elements.unitContextMenu.offsetHeight;
    elements.unitContextMenu.style.left = `${Math.max(8, Math.min(Number(clientX) || 8, window.innerWidth - width - 8))}px`;
    elements.unitContextMenu.style.top = `${Math.max(8, Math.min(Number(clientY) || 8, window.innerHeight - height - 8))}px`;
    elements.unitContextMenu.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
  }

  async function locateUnitOnProbe(recording, clusterId) {
    const key = viewKey(recording, clusterId);
    if (!state.openUnits.has(key)) await openUnitOnly(recording, clusterId);
    else setFocusedUnit(key);
    if (!state.openUnits.has(key)) return;
    probeViewer.focusUnit(key);
    elements.probeCanvas.scrollIntoView({ block: "center", behavior: "smooth" });
    showToast(t("probe.locatedToast", { id: clusterId }));
  }

  async function runUnitContextAction(action) {
    const context = state.contextUnit;
    hideUnitContextMenu();
    if (!context) return;
    if (action === "open-only") await openUnitOnly(context.recording, context.clusterId);
    else if (action === "add") await addUnitToView(context.recording, context.clusterId);
    else if (action === "remove") removeUnitFromView(context.key);
    else if (action === "locate") await locateUnitOnProbe(context.recording, context.clusterId);
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
    return recording?.recordingIndex ?? regionCore.experimentNumber(recording?.name || recording?.key || "");
  }

  function regionFor(recording, clusterId) {
    const experiment = experimentNumber(recording);
    return experiment == null ? null : state.regionResult?.mapping?.get(`${experiment}::${Number(clusterId)}`) || null;
  }

  function probeTrackSegmentFor(recording, shankId, depthUm) {
    const shank = Number(shankId);
    const depth = Number(depthUm);
    if (!Number.isFinite(shank) || !Number.isFinite(depth)) return null;
    const experiment = experimentNumber(recording);
    const candidates = (state.regionResult?.probeTrack?.segments || []).filter((segment) => (
      Number(segment.probeId) === shank
      && depth >= Number(segment.startDepthUm)
      && depth < Number(segment.endDepthUm)
      && (segment.experiment == null || Number(segment.experiment) === experiment)
    ));
    return candidates.find((segment) => segment.experiment != null) || candidates[0] || null;
  }

  function normalizeActivityOverview(result, recording) {
    const ids = result?.unitIds || [];
    const catalogById = new Map((recording?.units || []).map((unit) => [Number(unit.cluster_id), unit]));
    const nullableNumber = (value) => value == null || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
    const units = Array.from(ids, (value, sourceIndex) => {
      const id = Number(value);
      const catalog = catalogById.get(id);
      const region = regionFor(recording, id);
      const rawDepth = nullableNumber(result.unitDepths?.[sourceIndex]);
      const catalogDepth = nullableNumber(catalog?.probe_depth_um);
      const rawShank = nullableNumber(result.unitShankIds?.[sourceIndex]);
      const catalogShank = nullableNumber(catalog?.shank_id);
      const depthUm = catalogDepth ?? rawDepth;
      const shankId = catalogShank ?? (rawShank != null && rawShank >= 0 ? rawShank : null);
      const trackSegment = probeTrackSegmentFor(recording, shankId, depthUm);
      const label = labelFor(recording, id);
      return {
        sourceIndex,
        id,
        count: Number(result.unitCounts?.[sourceIndex] || 0),
        rateHz: Number(result.unitRateHz?.[sourceIndex] || 0),
        x: nullableNumber(result.unitX?.[sourceIndex]),
        depthUm,
        shankId,
        region: region?.region || catalog?.brain_region || t("units.unmapped"),
        regionColor: region?.color || catalog?.atlas_color_hex || "",
        regionSource: region?.source || catalog?.region_annotation_status || "",
        trackRegion: trackSegment?.region || "",
        trackRegionColor: trackSegment?.color || "",
        trackStartDepthUm: nullableNumber(trackSegment?.startDepthUm),
        trackEndDepthUm: nullableNumber(trackSegment?.endDepthUm),
        trackAmbiguous: Number(trackSegment?.ambiguousDepths || 0) > 0,
        trackSource: trackSegment ? state.regionResult?.probeTrack?.source || "" : "",
        quality: label.quality || "unknown"
      };
    });
    return {
      ...result,
      duration: Number(result.duration || recording?.duration || 0),
      binCount: Number(result.binCount || 512),
      binSeconds: Number(result.binSeconds || (Number(result.duration || recording?.duration || 0) / Number(result.binCount || 512)) || 1),
      normalizedActivity: result.normalizedActivity instanceof Uint8Array ? result.normalizedActivity : Uint8Array.from(result.normalizedActivity || []),
      unusualActivity: result.unusualActivity instanceof Uint8Array ? result.unusualActivity : Uint8Array.from(result.unusualActivity || []),
      unusualThresholdCounts: result.unusualThresholdCounts instanceof Uint32Array ? result.unusualThresholdCounts : Uint32Array.from(result.unusualThresholdCounts || []),
      units
    };
  }

  function renderExperimentHeader() {
    const selectedReview = state.activeRecording && state.experimentView.selectedUnitId != null
      ? state.openUnits.get(viewKey(state.activeRecording, state.experimentView.selectedUnitId))?.result : null;
    miniProbe?.update(state.activeActivityOverview, state.experimentView, state.activeRecording, selectedReview);
    projectUI?.syncVideo();
    annotationController?.update();
    const recording = state.activeRecording;
    if (!recording) {
      elements.experimentRecordingName.textContent = "—";
      elements.experimentFacts.replaceChildren();
      elements.experimentTime.textContent = "0.000 s";
      return;
    }
    const overview = state.activeActivityOverview;
    const units = overview?.units || recordingUnits(recording);
    const mapped = overview?.units?.filter((unit) => unit.region && unit.region !== t("units.unmapped")).length || 0;
    const shanks = new Set((overview?.units || []).map((unit) => unit.shankId).filter((value) => value != null && Number.isFinite(Number(value))));
    const video = Boolean(videoController?.source);
    elements.experimentRecordingName.textContent = recording.name;
    const facts = [
      [t("summary.units"), number(units.length)],
      ["DURATION", `${Number(recording.duration || overview?.duration || 0).toFixed(1)} s`],
      ["ANATOMY", mapped ? `${mapped} mapped · ${shanks.size || "—"} shanks` : t("units.unmapped")],
      ["VIDEO", video ? t(videoController.mapping.verificationStatus === "verified" ? "video.verified" : "video.unverified") : "NOT ATTACHED"]
    ];
    elements.experimentFacts.innerHTML = facts.map(([label, value]) => `<span>${escapeHtml(label)}<strong>${escapeHtml(value)}</strong></span>`).join("");
    const interval = state.experimentView.selectedInterval;
    elements.experimentTime.textContent = interval
      ? `${Number(interval.start).toFixed(3)}–${Number(interval.end).toFixed(3)} s`
      : `${Number(state.experimentView.cursorTime || 0).toFixed(3)} s`;
    elements.inspectUnitButton.disabled = state.experimentView.selectedUnitId == null;
    const pinButton = document.getElementById("pin-unit-button");
    const selectedId = state.experimentView.selectedUnitId;
    const ready = selectedId != null && state.openUnits.get(viewKey(recording, selectedId))?.result?.spikeTimes;
    const pinned = selectedId != null && pinnedComparison?.has(selectedId);
    pinButton.disabled = !ready || pinned || pinnedComparison?.entries.size >= pinnedComparison?.limit;
    pinButton.textContent = t(pinned ? "workspace.unitPinned" : "workspace.pinUnit");
  }

  function renderActivityStatus() {
    const overview = state.activeActivityOverview;
    if (!overview) return;
    const layout = state.activityLayoutSummary;
    const rows = layout
      ? `${layout.aggregateRows} anatomical groups${layout.unitRows ? ` + ${layout.unitRows} Unit rows` : ""}`
      : "anatomical overview";
    const selected = state.experimentView.selectedUnitId == null ? "" : ` · Unit ${Number(state.experimentView.selectedUnitId)} expanded`;
    elements.activityStatus.textContent = `${number(overview.units.length)} Units · ${rows} · ${number(overview.binCount)} bins × ${Number(overview.binSeconds).toFixed(3)} s · group = fraction above own p90${selected}`;
  }

  function handleExperimentViewChange(patch, snapshot = null) {
    state.experimentView = { ...state.experimentView, ...(snapshot || patch || {}) };
    pinnedComparison?.syncView();
    if (Object.hasOwn(patch || {}, "expandedUnitId") || Object.hasOwn(patch || {}, "groupFocusPath")) renderActivityStatus();
    if (Object.prototype.hasOwnProperty.call(patch || {}, "cursorTime")) state.playbackNeuralTime = Number(patch.cursorTime);
    renderExperimentHeader();
    if (Object.prototype.hasOwnProperty.call(patch || {}, "visibleRange")) scheduleActivityLevelForRange(state.experimentView.visibleRange);
  }

  function activityLevelForRange(overview, range) {
    const available = overview?.pyramid?.availableBinCounts || [512];
    const duration = Math.max(.001, Number(overview?.duration || 0));
    const span = Math.max(.001, Number(range?.end || duration) - Number(range?.start || 0));
    const plotWidth = Math.max(1, Number(elements.activityCanvas?.clientWidth || 1200) - 276);
    const base = plotWidth < 560 ? 128 : plotWidth < 950 ? 256 : 512;
    const desired = base * duration / span;
    return available.find((level) => Number(level) >= desired) || Number(available[available.length - 1]);
  }

  function scheduleActivityLevelForRange(range) {
    const recording = state.activeRecording;
    const current = state.activeActivityOverview;
    if (!recording || !current?.pyramid?.availableBinCounts?.length) return;
    const target = activityLevelForRange(current, range);
    if (Number(current.binCount) === Number(target)) return;
    if (state.activityLevelTimer) clearTimeout(state.activityLevelTimer);
    const token = ++state.activityLevelToken;
    state.activityLevelAbortController?.abort();
    state.activityLevelAbortController = new AbortController();
    state.activityLevelTimer = setTimeout(async () => {
      try {
        const raw = await loadRecordingActivityOverview(recording, target, {
          signal: state.activityLevelAbortController.signal
        });
        if (token !== state.activityLevelToken || recording !== state.activeRecording) return;
        const overview = normalizeActivityOverview(raw, recording);
        state.activeActivityOverview = overview;
        activityCanvas.setData(overview, { preserveState: true });
        activityCanvas.setViewState(state.experimentView);
        const selectedId = state.experimentView.selectedUnitId;
        const selectedEntry = selectedId == null ? null : state.openUnits.get(viewKey(recording, selectedId));
        if (selectedEntry?.result) activityCanvas.setSelectedUnitData(selectedEntry.result);
        renderActivityStatus();
      } catch (error) {
        if (error?.name !== "AbortError") elements.activityStatus.textContent = `Activity resolution unavailable · ${error.message}`;
      }
    }, 140);
  }

  function setExperimentView(patch, { seekVideo = false } = {}) {
    state.experimentView = { ...state.experimentView, ...(patch || {}) };
    pinnedComparison?.syncView();
    activityCanvas.setViewState(state.experimentView);
    if (Object.prototype.hasOwnProperty.call(patch || {}, "visibleRange")) scheduleActivityLevelForRange(state.experimentView.visibleRange);
    if (seekVideo && Number.isFinite(Number(patch?.cursorTime))) videoController?.seekNeural(Number(patch.cursorTime));
    renderExperimentHeader();
  }

  function activityUnitMatches(unit, query) {
    if (!query) return true;
    const normalized = String(query).trim().toLowerCase();
    const shank = unit.shankId != null && Number.isFinite(Number(unit.shankId)) ? `shank ${Number(unit.shankId) + 1}` : "";
    return [unit.id, unit.region, unit.quality, shank].some((value) => String(value ?? "").toLowerCase().includes(normalized));
  }

  function renderFindUnitResults() {
    const units = state.activeActivityOverview?.units || [];
    const matches = units.filter((unit) => activityUnitMatches(unit, elements.findUnitInput.value)).slice(0, 30);
    elements.findUnitResults.innerHTML = matches.length
      ? matches.map((unit) => `<button class="find-unit-result" type="button" role="option" data-find-unit-id="${Number(unit.id)}"><span><strong>${escapeHtml(i18nApi.GLOSSARY.unit[languageSnapshot.language])} ${Number(unit.id)}</strong><small>${escapeHtml([unit.shankId != null && Number.isFinite(Number(unit.shankId)) ? `Shank ${Number(unit.shankId) + 1}` : "Shank —", unit.depthUm == null ? "depth —" : `${Math.round(unit.depthUm)} µm`, unit.region || t("units.unmapped"), unit.quality].join(" · "))}</small></span><b>${Number(unit.rateHz || 0).toFixed(Number(unit.rateHz || 0) < 10 ? 2 : 1)} Hz</b></button>`).join("")
      : `<div class="find-unit-empty">${escapeHtml(t("units.none"))}</div>`;
  }

  function setFindUnitOpen(open) {
    const next = Boolean(open);
    elements.findUnitPopover.hidden = !next;
    elements.findUnitButton.setAttribute("aria-expanded", String(next));
    if (next) {
      renderFindUnitResults();
      requestAnimationFrame(() => elements.findUnitInput.focus({ preventScroll: true }));
    }
  }

  async function selectActivityUnit(unitId) {
    const recording = state.activeRecording;
    const normalized = Number(unitId);
    if (!recording || !Number.isFinite(normalized)) return;
    const unit = state.activeActivityOverview?.units.find((item) => Number(item.id) === normalized);
    if (!unit) return;
    setFindUnitOpen(false);
    setExperimentView({
      selectedUnitId: normalized,
      expandedUnitId: normalized,
      selectedGroupKey: null,
      groupFocusPath: [],
      selectedShank: unit.shankId,
      selectedRegion: unit.region || t("units.unmapped")
    });
    elements.activityStatus.textContent = `${i18nApi.GLOSSARY.unit[languageSnapshot.language]} ${normalized} · reading exact spike times…`;
    try {
      await openUnitOnly(recording, normalized);
      if (recording !== state.activeRecording || Number(state.experimentView.selectedUnitId) !== normalized) return;
      const entry = state.openUnits.get(viewKey(recording, normalized));
      if (entry?.result) activityCanvas.setSelectedUnitData(entry.result);
      renderActivityStatus();
      renderExperimentHeader();
    } catch (error) {
      elements.activityStatus.textContent = `Unit ${normalized} · ${error.message}`;
    }
  }

  async function refreshExperimentWorkspace(recording) {
    pinnedComparison?.clear();
    const token = ++state.overviewToken;
    state.overviewAbortController?.abort();
    state.activityLevelAbortController?.abort();
    state.overviewAbortController = new AbortController();
    if (state.activityLevelTimer) clearTimeout(state.activityLevelTimer);
    state.activeActivityOverview = null;
    state.activityLayoutSummary = null;
    state.experimentView = {
      visibleRange: { start: 0, end: Number(recording?.duration || 0) },
      cursorTime: 0,
      selectedInterval: null,
      selectedGroupKey: null,
      groupFocusPath: [],
      selectedUnitId: null,
      selectedShank: null,
      selectedRegion: null,
      expandedUnitId: null
    };
    elements.inspectUnitButton.disabled = true;
    elements.activityStatus.textContent = t("workspace.activityLoading");
    activityCanvas.setData(null);
    renderExperimentHeader();
    const started = performance.now();
    try {
      const raw = await loadRecordingActivityOverview(recording, 512, {
        signal: state.overviewAbortController.signal,
        onProgress: ({ phase, progress }) => {
          if (token !== state.overviewToken || recording !== state.activeRecording) return;
          elements.activityStatus.textContent = `Preparing activity pyramid · ${String(phase || "working")} · ${Math.round(Number(progress || 0))}%`;
        }
      });
      if (token !== state.overviewToken || recording !== state.activeRecording) return;
      const overview = normalizeActivityOverview(raw, recording);
      overview.providerComputeMs = Number(raw.server?.computeMs);
      overview.totalLoadMs = performance.now() - started;
      state.activeActivityOverview = overview;
      state.experimentView.visibleRange = { start: 0, end: overview.duration };
      recording.unitSummaryMap = new Map(overview.units.map((unit) => [Number(unit.id), { id: Number(unit.id), count: unit.count, rateHz: unit.rateHz }]));
      activityCanvas.setData(overview);
      activityCanvas.setViewState(state.experimentView);
      renderActivityStatus();
      renderUnitList();
      renderExperimentHeader();
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (token !== state.overviewToken || recording !== state.activeRecording) return;
      elements.activityStatus.textContent = `Activity overview unavailable · ${error.message}`;
      elements.activityEmpty.hidden = false;
      renderExperimentHeader();
    }
  }

  function syncProbeView() {
    const items = plotEntries().filter((entry) => entry.result && entry.recording).map((entry) => ({
      key: entry.key,
      result: entry.result,
      recording: entry.recording,
      clusterId: Number(entry.clusterId),
      region: regionFor(entry.recording, entry.clusterId),
      color: entry.traceColor || themeSnapshot.palette.units.primary.trace,
      locationRegion: (clusterId) => regionFor(entry.recording, clusterId),
      locationLabel: (clusterId) => labelFor(entry.recording, clusterId)
    }));
    probeViewer.setUnits(items, state.focusedUnit, state.regionResult?.probeTrack);
  }

  async function handleProbeUnitInteraction({ recording, clusterId, additive = false, contextMenu = false, clientX = 0, clientY = 0 }) {
    if (!recording || !Number.isFinite(Number(clusterId))) return;
    if (contextMenu) {
      openUnitContextMenu(recording, clusterId, clientX, clientY);
      return;
    }
    if (state.activeRecording !== recording) {
      state.activeRecording = recording;
      state.search = "";
      elements.unitSearch.value = "";
      renderRecordings();
    }
    if (additive) await addUnitToView(recording, Number(clusterId));
    else await openUnitOnly(recording, Number(clusterId));
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
      if (response.type === "activity-overview-progress") {
        pending.onProgress?.({ phase: response.phase, progress: Number(response.progress || 0), status: "running" });
        return;
      }
      state.pending.delete(response.requestId);
      pending.cleanup?.();
      if (response.type === "worker-error") pending.reject(new Error(response.message));
      else pending.resolve(response);
    });
    state.worker.addEventListener("error", (event) => {
      state.pending.forEach((pending) => {
        pending.cleanup?.();
        pending.reject(new Error(event.message || "Background data reader failed"));
      });
      state.pending.clear();
      state.worker = null;
      if (state.workerUrl) URL.revokeObjectURL(state.workerUrl);
      state.workerUrl = null;
    });
    return state.worker;
  }

  function terminateWorker(reason = "Background data reader cancelled") {
    state.worker?.terminate();
    if (state.workerUrl) URL.revokeObjectURL(state.workerUrl);
    state.worker = null;
    state.workerUrl = null;
    const error = new DOMException(reason, "AbortError");
    state.pending.forEach((pending) => {
      pending.cleanup?.();
      pending.reject(error);
    });
    state.pending.clear();
  }

  async function requestWorker(message, { signal = null, onProgress = null } = {}) {
    if (signal?.aborted) throw new DOMException("Background data reader cancelled", "AbortError");
    const worker = ensureWorker();
    if (!worker) {
      if (message.type === "clear") return { type: "cleared" };
      const buffers = {};
      for (const [key, file] of Object.entries(message.files || {})) {
        if (file) buffers[key] = await file.arrayBuffer();
      }
      if (message.type === "activity-overview") {
        onProgress?.({ phase: "reading", progress: 18, status: "running" });
        const pyramid = core.buildActivityPyramidBuffers(buffers, message.sampleRate, message.sourceFingerprint);
        if (signal?.aborted) throw new DOMException("Background data reader cancelled", "AbortError");
        onProgress?.({ phase: "ready", progress: 100, status: "complete" });
        return {
          type: "activity-overview-result",
          ...core.selectActivityPyramidLevel(pyramid, message.binCount),
          fallback: true,
          residentExperiments: [],
          residentBytes: 0
        };
      }
      return { type: "unit-result", ...core.analyzeUnitBuffers(buffers, message.sampleRate, message.clusterId), fallback: true, residentExperiments: [], residentBytes: 0 };
    }
    const requestId = `review-${++state.workerSequence}`;
    return new Promise((resolve, reject) => {
      const abort = () => terminateWorker("Activity overview build cancelled");
      const cleanup = () => signal?.removeEventListener("abort", abort);
      signal?.addEventListener("abort", abort, { once: true });
      state.pending.set(requestId, { resolve, reject, onProgress, cleanup });
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
      templateIndices: names.get("templates_ind.npy") || null,
      channelMap: names.get("channel_map.npy") || null,
      channelPositions: names.get("channel_positions.npy") || null,
      channelShanks: names.get("channel_shanks.npy") || null
    };
  }

  async function inspectRecordingUnit(recording, clusterId) {
    if (state.dataMode === "database") return databaseClient.loadUnitReview(recording, clusterId);
    return requestWorker({
      type: "inspect-unit",
      experimentKey: `${state.datasetToken}:${recording.key}:${Number(recording.dataVersion || 0)}`,
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
      elements.unitList.innerHTML = `<div class="unit-list-empty">${escapeHtml(t("units.none"))}</div>`;
      return;
    }
    elements.unitList.innerHTML = units.map((unit) => {
      const region = regionFor(state.activeRecording, unit.id)?.region || t("units.unmapped");
      const rate = Number.isFinite(unit.rateHz) ? `${unit.rateHz.toFixed(unit.rateHz < 10 ? 2 : 1)} Hz` : "— Hz";
      const spikes = Number.isFinite(unit.count) ? number(unit.count) : "—";
      const key = viewKey(state.activeRecording, unit.id);
      const focused = state.focusedUnit === key;
      const open = state.openUnits.has(key);
      const loading = state.loadingUnits.has(key);
      return `<div class="unit-row ${focused ? "active" : ""} ${open ? "open" : ""}" role="option" aria-selected="${focused}">
        <button class="unit-row-select" type="button" data-cluster-id="${unit.id}" aria-label="${escapeHtml(loading ? t("units.loadingAria", { id: unit.id }) : t("units.rowAria", { id: unit.id }))}" ${loading ? "disabled" : ""}>
          <span class="unit-row-main">
            <span class="unit-row-title"><i class="quality-dot ${qualityTone(unit.quality)}"></i><strong>${escapeHtml(i18nApi.GLOSSARY.unit[languageSnapshot.language])} ${unit.id}</strong></span>
            <small>${escapeHtml(unit.quality)} · ${escapeHtml(region)}</small>
          </span>
          <span class="unit-row-metrics"><strong>${loading ? escapeHtml(t("units.loading")) : rate}</strong><span>${spikes} ${escapeHtml(i18nApi.GLOSSARY.spike[languageSnapshot.language])}${open ? ` · ${escapeHtml(t("units.open"))}` : ""}</span></span>
        </button>
      </div>`;
    }).join("");
  }

  function renderRecordings() {
    elements.recordingStrip.innerHTML = state.recordings.map((recording, index) => `<button class="recording-button ${recording === state.activeRecording ? "active" : ""}" type="button" data-recording-key="${escapeHtml(recording.key)}" title="${escapeHtml(t("units.countMeta", { count: number(recording.clusterLabels.length), duration: recording.duration.toFixed(1) }))}"><strong>${index + 1}</strong><span>${escapeHtml(recording.name)}</span></button>`).join("");
    requestAnimationFrame(() => {
      elements.recordingStrip.querySelector(".recording-button.active")?.scrollIntoView({ block: "nearest", inline: "center" });
      updateRecordingScrollControls();
    });
  }

  async function loadRecordingActivityOverview(recording, binCount = 512, options = {}) {
    const level = core.nearestActivityLevel(binCount);
    const cacheKey = `${state.datasetToken}:${recording.key}:${Number(recording.dataVersion || 0)}:${level}`;
    if (state.activityOverviewCache.has(cacheKey)) return state.activityOverviewCache.get(cacheKey);
    const pending = state.dataMode === "database"
      ? databaseClient.buildActivityOverview(recording, { binCount: level, ...options })
      : (() => {
          const files = workerFiles(recording);
          return requestWorker({
          type: "activity-overview",
          experimentKey: cacheKey,
          files,
          sampleRate: recording.sampleRate,
          binCount: level,
          sourceFingerprint: core.activityFileFingerprint(files, recording.sampleRate, recording.dataVersion)
          }, options);
        })();
    state.activityOverviewCache.set(cacheKey, pending);
    try {
      const result = await pending;
      state.activityOverviewCache.set(cacheKey, result);
      return result;
    } catch (error) {
      state.activityOverviewCache.delete(cacheKey);
      throw error;
    }
  }

  function updateRecordingScrollControls() {
    const maximum = Math.max(0, elements.recordingStrip.scrollWidth - elements.recordingStrip.clientWidth);
    elements.recordingPrevious.disabled = elements.recordingStrip.scrollLeft <= 1;
    elements.recordingNext.disabled = elements.recordingStrip.scrollLeft >= maximum - 1;
  }

  function scrollRecordings(direction) {
    elements.recordingStrip.scrollBy({ left: direction * Math.max(180, elements.recordingStrip.clientWidth * .78), behavior: "smooth" });
  }

  function dataStatusGroup(title, items, emptyText) {
    const rows = items.length
      ? items.map((item) => {
        const localized = localizeDataStatusItem(item);
        const supplementRows = item.state === "missing" && item.missingRecordings?.length
          ? `<div class="missing-file-list">${item.missingRecordings.flatMap((recording) => recording.files.map((file) => `
              <div class="missing-file-row">
                <div><strong>${escapeHtml(recording.recordingName)}</strong><span>${escapeHtml(file.filename)}</span></div>
                <div class="missing-file-actions">
                  <button type="button" data-supplement-kind="files" data-recording-key="${escapeHtml(recording.recordingKey)}" data-ingest-roles="${escapeHtml(file.roles.join(","))}" ${state.supplementBusy ? "disabled" : ""}>${escapeHtml(t("status.addFiles"))}</button>
                  <button type="button" data-supplement-kind="folder" data-recording-key="${escapeHtml(recording.recordingKey)}" data-ingest-roles="${escapeHtml(file.roles.join(","))}" ${state.supplementBusy ? "disabled" : ""}>${escapeHtml(t("status.addFolder"))}</button>
                </div>
              </div>`)).join("")}</div>`
          : "";
        return `<div class="data-status-item ${escapeHtml(item.state)}"><div><strong>${escapeHtml(localized.label)}</strong><span>${escapeHtml(localized.detail)}</span>${supplementRows}</div></div>`;
      }).join("")
      : `<p class="data-status-empty">${escapeHtml(emptyText)}</p>`;
    return `<section class="data-status-group"><header><span>${escapeHtml(title)}</span><b>${items.length}</b></header>${rows}</section>`;
  }

  function localizeDataStatusItem(item) {
    const coreKeys = { spikes: "spikeTiming", quality: "quality", amplitude: "amplitude", position: "position", template: "template", geometry: "geometry", probeGrouping: "probeGrouping" };
    const suffix = coreKeys[item.key];
    if (suffix) {
      const coverage = item.coverage || { available: 0, total: 0 };
      const filename = item.sourceDetail || item.detail?.split(" · ")[0] || "";
      const stateText = t(item.state === "available" ? "status.file.availableAcross" : "status.file.missingAcross");
      return { label: t(`status.file.${suffix}`), detail: `${filename} · ${coverage.available}/${coverage.total} · ${stateText}` };
    }
    if (item.key === "unitRegions") return { label: t("status.file.region"), detail: item.state === "available" ? t("status.file.regionAvailable", { count: number(item.count) }) : t("status.file.regionMissing") };
    if (item.key === "probeTrack") return { label: t("status.file.track"), detail: item.state === "available" ? t("status.file.trackAvailable", { count: number(item.count), probes: number(item.probes) }) : t("status.file.trackMissing") };
    if (item.key === "video") return { label: t("status.file.video"), detail: t(item.state === "detected" ? "status.file.videoDetected" : "status.file.videoDetail") };
    if (item.key === "rawVoltage") return { label: t("status.file.rawVoltage"), detail: t(item.state === "detected" ? "status.file.rawVoltageDetected" : "status.file.rawVoltageDetail") };
    return { label: t("status.file.invalid"), detail: item.detail };
  }

  function renderDataStatus() {
    const status = dataStatusApi.buildDataStatus(state.recordings, state.regionResult, state.errors);
    elements.dataStatusSummary.textContent = t("status.summaryCounts", status.counts) + (status.counts.invalid ? t("status.summaryInvalid", status.counts) : "");
    elements.dataStatusContext.textContent = t("status.recordingContext", { dataset: state.rootName || t("status.loadedDataset"), count: state.recordings.length });
    elements.dataStatusButton.classList.toggle("has-missing", status.counts.missing > 0);
    elements.dataStatusButton.classList.toggle("has-invalid", status.counts.invalid > 0);
    elements.dataStatusGroups.innerHTML = [
      dataStatusGroup(t("status.available"), status.available, t("status.noneAvailable")),
      dataStatusGroup(t("status.missing"), status.missing, t("status.noneMissing")),
      dataStatusGroup(t("status.invalid"), status.invalid, t("status.noneInvalid")),
      dataStatusGroup(t("status.optional"), status.optional, t("status.noneOptional")),
      dataStatusGroup(t("status.future"), status.future, t("status.noneFuture"))
    ].join("");
  }

  function setDataStatusOpen(open) {
    const next = Boolean(open);
    elements.dataStatusPopover.hidden = !next;
    elements.dataStatusButton.setAttribute("aria-expanded", String(next));
    if (next) elements.closeDataStatus.focus({ preventScroll: true });
  }

  function renderSummary() {
    const recordings = state.recordings;
    const totalUnits = recordings.reduce((total, item) => total + item.clusterLabels.length, 0);
    const totalSpikes = recordings.reduce((total, item) => total + item.spikeCount, 0);
    const totalBytes = recordings.reduce((total, item) => total + item.totalBytes, 0);
    elements.summaryNumbers.innerHTML = [
      [recordings.length, t("summary.recordings")],
      [number(totalUnits), t("summary.units")],
      [number(totalSpikes), t("summary.spikes")],
      [core.formatBytes(totalBytes), t("summary.indexed")]
    ].map(([value, label]) => `<div class="summary-stat"><strong>${value}</strong><span>${label}</span></div>`).join("");

    renderDataStatus();
  }

  function renderMetrics(result, recording, clusterId) {
    const ksAmplitude = recording.amplitudeByCluster.get(Number(clusterId));
    const contamination = recording.contaminationByCluster.get(Number(clusterId));
    const values = [
      ["metrics.spikes", number(result.spikeCount), "tips.metricSpikes"],
      ["metrics.meanRate", `${result.rateHz.toFixed(result.rateHz < 10 ? 3 : 2)} Hz`, "tips.metricRate"],
      ["metrics.isi", percent(result.isiViolationPercent), "tips.metricIsi"],
      ["metrics.presence", percent(result.presenceRatio * 100), "tips.metricPresence"],
      ["metrics.ksAmplitude", Number.isFinite(ksAmplitude) ? ksAmplitude.toFixed(1) : "—", "tips.metricAmplitude"],
      ["metrics.ksContam", Number.isFinite(contamination) ? `${contamination.toFixed(1)}%` : "—", "tips.metricContam"]
    ];
    elements.metricRow.innerHTML = values.map(([label, value, helpKey]) => `<div class="metric"><span class="heading-with-help"><span>${escapeHtml(t(label))}</span><button class="context-help" type="button" data-help-key="${helpKey}" data-help-topic="${label}" aria-label="${escapeHtml(t("help.tipAria", { topic: t(label) }))}">?</button></span><strong>${escapeHtml(value)}</strong></div>`).join("");
  }

  function clearFocusedDetails() {
    detailPlots.clear();
    probeViewer.clear();
    elements.detailsContext.style.setProperty("--trace-color", themeSnapshot.palette.probe.unopened);
    elements.detailsFocusLabel.textContent = t("review.noSelected");
    elements.reviewTitle.textContent = t("review.noOpen");
    elements.reviewSubtitle.textContent = t("review.selectSignal");
    elements.metricRow.replaceChildren();
    elements.templateLabel.textContent = t("review.templateDefault");
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
    const traceColor = entry.traceColor || themeSnapshot.palette.units.primary.trace;
    elements.detailsContext.style.setProperty("--trace-color", traceColor);
    elements.detailsFocusLabel.textContent = `${i18nApi.GLOSSARY.unit[languageSnapshot.language]} ${clusterId} · ${recording.name}`;
    elements.reviewTitle.textContent = `${i18nApi.GLOSSARY.unit[languageSnapshot.language]} ${clusterId}`;
    elements.reviewSubtitle.textContent = [recording.name, label.quality, region?.region || t("review.regionUnmapped"), t("review.recordingDuration", { duration: recording.duration.toFixed(2) })].join(" · ");
    renderMetrics(result, recording, clusterId);
    const channelText = result.peakChannel == null ? t("review.peakChannelUnavailable") : t("review.peakChannel", { channel: result.peakChannel });
    const depthText = result.peakChannelPosition?.y == null ? "" : ` · ${result.peakChannelPosition.y.toFixed(0)} µm`;
    elements.templateLabel.textContent = t("review.templateLabel", { template: result.templateId, channel: channelText, depth: depthText });
    detailPlots.setData({ ...result, sampleRate: recording.sampleRate });
    syncProbeView();
  }

  function createAdditionalView(recording, clusterId, result) {
    const key = viewKey(recording, clusterId);
    const usedPaletteIndexes = new Set(plotEntries().map((item) => item.paletteIndex).filter((index) => index >= 0));
    const paletteIndex = comparisonColors.findIndex((_, index) => !usedPaletteIndexes.has(index));
    const palette = comparisonColors[Math.max(0, paletteIndex)];
    const label = labelFor(recording, clusterId);
    const region = regionFor(recording, clusterId)?.region || t("review.regionShortUnmapped");
    const unitTerm = i18nApi.GLOSSARY.unit[languageSnapshot.language];
    const spikeTerm = i18nApi.GLOSSARY.spike[languageSnapshot.language];
    const lane = document.createElement("article");
    lane.className = "trace-lane";
    lane.dataset.viewKey = key;
    lane.style.setProperty("--trace-color", palette.trace);
    lane.innerHTML = `
      <header class="trace-lane-header">
        <div class="trace-identity"><i></i><strong>${escapeHtml(unitTerm)} ${Number(clusterId)}</strong><span>${escapeHtml(recording.name)} · ${escapeHtml(label.quality)} · ${escapeHtml(region)} · ${number(result.spikeCount)} ${escapeHtml(spikeTerm)}</span></div>
        <div class="trace-lane-actions"><span class="trace-window">—</span><button class="trace-remove" type="button" aria-label="${escapeHtml(t("review.closeUnitSignal", { id: Number(clusterId) }))}" title="${escapeHtml(t("review.closeSignalTitle"))}">×</button></div>
      </header>
      <div class="canvas-frame detail-frame" data-interaction-mode="${state.interactionMode}">
        <canvas tabindex="0" aria-label="${escapeHtml(unitTerm)} ${Number(clusterId)} · ${escapeHtml(i18nApi.GLOSSARY.spike[languageSnapshot.language])} · ${escapeHtml(i18nApi.GLOSSARY.firingRate[languageSnapshot.language])}"></canvas>
        <div class="zoom-selection" hidden><span></span></div>
        <div class="plot-cursor" hidden><span></span></div>
        <div class="sync-playhead" hidden><span>${escapeHtml(t("video.playhead"))}</span></div>
        <div class="canvas-empty">${escapeHtml(t("units.loadingAria", { id: Number(clusterId) }))}</div>
      </div>`;
    elements.comparisonTraces.append(lane);
    const frame = lane.querySelector(".detail-frame");
    const canvas = lane.querySelector("canvas");
    const selection = lane.querySelector(".zoom-selection");
    const cursor = lane.querySelector(".plot-cursor");
    const playhead = lane.querySelector(".sync-playhead");
    const windowElement = lane.querySelector(".trace-window");
    const manager = new PlotManager({
      detail: canvas,
      detailFrame: frame,
      selection,
      selectionLabel: selection.querySelector("span"),
      cursor,
      cursorLabel: cursor.querySelector("span"),
      playhead,
      onCursorCommit: (time) => videoController?.seekNeural(time),
      detailEmpty: lane.querySelector(".canvas-empty"),
      traceColor: palette.trace,
      rateColor: palette.rate,
      rateFill: palette.fill
    }, (view) => handlePlotWindow(key, view), (plotState) => handlePlotState(key, plotState));
    const item = { key, manager, lane, windowElement, recording, clusterId: Number(clusterId), result, paletteIndex, traceColor: palette.trace };
    state.openUnits.set(key, item);
    frame.addEventListener("pointerdown", () => setFocusedUnit(key), { capture: true });
    lane.querySelector(".trace-lane-header").addEventListener("click", (event) => {
      if (!event.target.closest(".trace-remove")) setFocusedUnit(key);
    });
    lane.querySelector(".trace-remove").addEventListener("click", (event) => {
      event.stopPropagation();
      removeUnitFromView(key);
    });

    const source = focusedEntry();
    state.syncingTime = true;
    try {
      manager.setData({ ...result, sampleRate: recording.sampleRate });
      manager.setPlaybackTime(state.playbackNeuralTime);
      manager.setMode(state.interactionMode);
      if (state.timeLinked && source?.manager.data) {
        manager.history = source.manager.history.map((view) => ({ ...view }));
        manager.setWindow(source.manager.start, source.manager.span);
      }
    } finally {
      state.syncingTime = false;
    }
    updateOpenUnitCount();
    setFocusedUnit(key);
    return item;
  }

  function removeUnitFromView(key) {
    const item = state.openUnits.get(key);
    if (!item) return;
    const removedFocused = state.focusedUnit === key;
    state.openUnits.delete(key);
    if (item.manager !== plots) {
      item.manager.destroy();
      item.lane.remove();
    } else {
      plots.clear();
      const promoted = plotEntries()[0] || null;
      if (promoted) {
        const initialWindow = { start: promoted.manager.start, span: promoted.manager.span };
        state.openUnits.delete(promoted.key);
        promoted.manager.destroy();
        promoted.lane.remove();
        renderPrimaryView(promoted.result, promoted.recording, promoted.clusterId, { initialWindow, focus: false });
      } else {
        elements.primaryTraceLane.hidden = true;
        elements.primaryTraceLane.dataset.viewKey = "";
        elements.primaryOverviewLabel.hidden = true;
        elements.primaryOverviewFrame.hidden = true;
        elements.manualReviewEmpty.hidden = false;
        elements.primaryTraceTitle.textContent = t("review.unitPlaceholder");
        elements.primaryTraceMeta.textContent = t("review.selectFromList");
        elements.timeWindow.textContent = "—";
      }
    }
    const next = removedFocused ? primaryOpenUnit() || plotEntries()[0] || null : focusedEntry();
    if (next) setFocusedUnit(next.key);
    else {
      state.focusedUnit = null;
      setReviewState(t("review.idle"));
      clearFocusedDetails();
      syncProbeView();
      renderUnitList();
    }
    updateOpenUnitCount();
    showToast(t("toast.removed", { id: item.clusterId }));
  }

  async function addUnitToView(recording, clusterId) {
    if (!recording) return;
    const key = viewKey(recording, clusterId);
    if (state.openUnits.has(key)) {
      setFocusedUnit(key);
      return;
    }
    if (state.loadingUnits.has(key)) return;
    if (!state.openUnits.size) {
      await openUnitOnly(recording, clusterId);
      return;
    }
    if (state.openUnits.size >= MAX_OPEN_UNITS) {
      showToast(t("toast.maxUnits", { count: MAX_OPEN_UNITS }));
      return;
    }
    const datasetToken = state.datasetToken;
    const selectionToken = state.selectionToken;
    state.loadingUnits.add(key);
    renderUnitList();
    try {
      const result = await inspectRecordingUnit(recording, clusterId);
      if (datasetToken !== state.datasetToken || selectionToken !== state.selectionToken || state.openUnits.has(key)) return;
      recording.unitSummaryMap = new Map(result.unitSummaries.map((item) => [item.id, item]));
      createAdditionalView(recording, clusterId, result);
      showToast(t("toast.added", { id: clusterId }));
    } catch (error) {
      showToast(t("toast.couldNotAdd", { id: clusterId, error: error.message }));
    } finally {
      state.loadingUnits.delete(key);
      renderUnitList();
    }
  }

  function renderPrimaryView(result, recording, clusterId, { initialWindow = null, focus = true } = {}) {
    const key = viewKey(recording, clusterId);
    const label = labelFor(recording, clusterId);
    const region = regionFor(recording, clusterId);
    const primaryPalette = themeSnapshot.palette.units.primary;
    plots.setColors(primaryPalette);
    elements.primaryTraceLane.style.setProperty("--trace-color", primaryPalette.trace);
    const item = { key, manager: plots, lane: elements.primaryTraceLane, windowElement: elements.timeWindow, recording, clusterId: Number(clusterId), result, paletteIndex: -1, traceColor: primaryPalette.trace };
    state.openUnits.set(key, item);
    elements.manualReviewEmpty.hidden = true;
    elements.primaryTraceLane.hidden = false;
    elements.primaryTraceLane.dataset.viewKey = key;
    elements.primaryOverviewLabel.hidden = false;
    elements.primaryOverviewFrame.hidden = false;
    elements.primaryTraceTitle.textContent = `${i18nApi.GLOSSARY.unit[languageSnapshot.language]} ${clusterId}`;
    elements.primaryTraceMeta.textContent = [recording.name, label.quality, region?.region || t("review.regionShortUnmapped"), `${number(result.spikeCount)} ${i18nApi.GLOSSARY.spike[languageSnapshot.language]}`].join(" · ");
    plots.setData({ ...result, sampleRate: recording.sampleRate });
    plots.setPlaybackTime(state.playbackNeuralTime);
    if (initialWindow) plots.setWindow(initialWindow.start, initialWindow.span);
    if (focus) setFocusedUnit(key);
    else syncProbeView();
    updateOpenUnitCount();
    setReviewState(t(state.dataMode === "database" ? "review.database" : result.fallback ? "review.mainThread" : "review.ready"), "ready");
    return item;
  }

  async function openUnitOnly(recording, clusterId, options = {}) {
    if (!recording || !Number.isFinite(Number(clusterId))) return;
    const key = viewKey(recording, clusterId);
    if (state.openUnits.size === 1 && state.openUnits.has(key)) {
      setFocusedUnit(key);
      return;
    }
    const localToken = ++state.selectionToken;
    clearOpenUnitViews({ render: false });
    state.activeRecording = recording;
    state.loadingUnits.add(key);
    renderRecordings();
    renderUnitList();
    elements.reviewTitle.textContent = `${i18nApi.GLOSSARY.unit[languageSnapshot.language]} ${clusterId}`;
    elements.reviewSubtitle.textContent = `${recording.name} · ${t("review.loading")}`;
    setReviewState(t("review.reading"), "loading");
    try {
      const result = await inspectRecordingUnit(recording, clusterId);
      if (localToken !== state.selectionToken || recording !== state.activeRecording) return;
      recording.unitSummaryMap = new Map(result.unitSummaries.map((item) => [item.id, item]));
      if (!recording.clusterLabels.length && result.unitSummaries.length) {
        recording.clusterLabels = result.unitSummaries.map((item) => ({ id: item.id, quality: "unknown" }));
        if (!recording.unitSummaryMap.has(Number(clusterId)) && !options.retry) {
          const fallbackClusterId = result.unitSummaries[0].id;
          state.loadingUnits.delete(key);
          renderRecordings();
          renderUnitList();
          await openUnitOnly(recording, fallbackClusterId, { retry: true });
          return;
        }
        renderSummary();
        renderRecordings();
      }
      state.loadingUnits.delete(key);
      renderUnitList();
      renderPrimaryView(result, recording, clusterId);
    } catch (error) {
      if (localToken !== state.selectionToken) return;
      setReviewState(t("review.error"), "error");
      elements.reviewSubtitle.textContent = error.message;
      state.loadingUnits.delete(key);
      clearOpenUnitViews();
      showToast(t("toast.couldNotRead", { id: clusterId, error: error.message }));
    }
  }

  function selectRecording(recording) {
    if (!recording) return;
    state.selectionToken += 1;
    clearOpenUnitViews({ render: false });
    state.activeRecording = recording;
    state.search = "";
    elements.unitSearch.value = "";
    elements.reviewLayout.hidden = true;
    renderRecordings();
    renderUnitList();
    videoController?.setRecording(recording, projectUI?.active ? [] : state.databaseCatalog?.videos || []);
    projectUI?.recordingChanged(recording);
    refreshExperimentWorkspace(recording);
  }

  function renderDialog() {
    const totalBytes = state.recordings.reduce((total, item) => total + item.totalBytes, 0);
    const usefulFiles = state.recordings.reduce((total, item) => total + item.usefulFileCount, 0)
      + (state.dataMode === "database" ? 0 : (state.regionResult?.files?.length || 0));
    const totalUnits = state.recordings.reduce((total, item) => total + item.clusterLabels.length, 0);
    const probeTrack = state.regionResult?.probeTrack;
    elements.dialogFolder.textContent = state.rootName;
    elements.dialogBody.innerHTML = `
      <section class="details-section">
        <h2>${escapeHtml(t(state.dataMode === "database" ? "dialog.databaseCatalog" : "dialog.folderSummary"))}</h2>
        <div class="details-grid">
          <div class="detail-item"><span>${escapeHtml(t("dialog.filesReceived"))}</span><strong>${number(state.files.length)}</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.filesUsed"))}</span><strong>${number(usefulFiles)}</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.kilosortSize"))}</span><strong>${core.formatBytes(totalBytes)}</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.validRecordings"))}</span><strong>${number(state.recordings.length)}</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.listedUnits"))}</span><strong>${number(totalUnits)}</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.regionMappings"))}</span><strong>${number(state.regionResult?.count || 0)}</strong></div>
        </div>
      </section>
      <section class="details-section">
        <h2>${escapeHtml(t("dialog.readableContent"))}</h2>
        <div class="details-grid">
          <div class="detail-item"><span>${escapeHtml(t("dialog.spikeTiming"))}</span><strong>spike_times.npy</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.unitAssignment"))}</span><strong>spike_clusters.npy</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.quality"))}</span><strong>cluster tables</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.amplitude"))}</span><strong>amplitudes.npy</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.spatialPosition"))}</span><strong>spike_positions.npy</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.waveform"))}</span><strong>templates.npy</strong></div>
        </div>
        <p class="details-note">${escapeHtml(t(state.dataMode === "database" ? "dialog.databaseNote" : "dialog.folderNote"))}</p>
      </section>
      <section class="details-section">
        <h2>${escapeHtml(t("dialog.brainMapping"))}</h2>
        <div class="details-grid">
          <div class="detail-item"><span>${escapeHtml(t("dialog.unitRegionRows"))}</span><strong>${number(state.regionResult?.count || 0)}</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.probeTrackRows"))}</span><strong>${number(probeTrack?.rowCount || 0)}</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.physicalProbes"))}</span><strong>${number(probeTrack?.probeCount || 0)}</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.trackSource"))}</span><strong>${escapeHtml(probeTrack?.source || t("dialog.notProvided"))}</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.requiredColumns"))}</span><strong>probe · depth_um · region</strong></div>
          <div class="detail-item"><span>${escapeHtml(t("dialog.recommendedJoin"))}</span><strong>electrode_index</strong></div>
        </div>
        <p class="details-note">${escapeHtml(t("dialog.mappingNote"))}</p>
      </section>
      <section class="details-section">
        <h2>${escapeHtml(t("dialog.recordings"))}</h2>
        <table class="file-table"><thead><tr><th>${escapeHtml(t("dialog.recording"))}</th><th>${escapeHtml(t("dialog.units"))}</th><th>${escapeHtml(t("dialog.spikes"))}</th><th>${escapeHtml(t("dialog.duration"))}</th><th>${escapeHtml(t("dialog.size"))}</th></tr></thead><tbody>
          ${state.recordings.map((recording) => `<tr><td>${escapeHtml(recording.name)}</td><td>${number(recording.clusterLabels.length)}</td><td>${number(recording.spikeCount)}</td><td>${recording.duration.toFixed(2)} s</td><td>${core.formatBytes(recording.totalBytes)}</td></tr>`).join("")}
        </tbody></table>
        ${state.errors.length ? `<p class="details-note">${escapeHtml(t("dialog.unreadable", { count: state.errors.length }))} ${escapeHtml(state.errors.join(" | "))}</p>` : ""}
      </section>
      <section class="details-section">
        <h2>${escapeHtml(t("dialog.rawVoltage"))}</h2>
        <p class="details-note">${escapeHtml(t("dialog.rawVoltageNote"))}</p>
      </section>`;
  }

  async function openFiles(files) {
    const selectedFiles = [...files].filter((file) => file && !String(file.name || "").startsWith("."));
    if (!selectedFiles.length) {
      showToast(t("toast.noReadableFiles"));
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
    clearOpenUnitViews({ render: false });
    elements.datasetTitle.textContent = state.rootName;
    showLoading(t("loading.inspectTitle"), t("loading.filesReceived", { count: number(selectedFiles.length) }), 16);
    await clearWorker();

    const groups = core.groupExperimentFiles(selectedFiles);
    if (!groups.length) {
      showOnly("empty");
      elements.dropZone.querySelector("p").textContent = t("loading.noRequiredFiles");
      showToast(t("toast.noRecordings"));
      return;
    }

    elements.loadingMessage.textContent = t("loading.checkCandidates", { count: groups.length });
    elements.loadingProgress.style.width = "34%";
    let completed = 0;
    const indexedPromise = Promise.allSettled(groups.map(async (group) => {
      try { return await core.indexExperiment(group); }
      finally {
        completed += 1;
        elements.loadingProgress.style.width = `${34 + completed / groups.length * 46}%`;
        elements.loadingMessage.textContent = t("loading.checkRecording", { current: completed, total: groups.length });
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
      elements.dropZone.querySelector("p").textContent = t("loading.nonePassed");
      showToast(t("toast.couldNotIndex"));
      return;
    }

    elements.loadingProgress.style.width = "100%";
    elements.loadingTitle.textContent = t("loading.folderReady");
    elements.loadingMessage.textContent = t("loading.recordingsDetected", { count: state.recordings.length });
    renderSummary();
    renderDialog();
    elements.dataDetails.disabled = false;
    showOnly("explorer");
    selectRecording(state.recordings[0]);
    showToast(t("toast.recordingsReady", { count: state.recordings.length }));
  }

  async function openDatabaseCatalog(recordingIds = null) {
    state.datasetToken += 1;
    state.selectionToken += 1;
    state.dataMode = "database";
    clearOpenUnitViews({ render: false });
    showLoading(t("loading.openingDatabase"), t("loading.databaseCatalog"), 18);
    const catalog = await databaseClient.loadCatalog();
    if (!catalog.recordings.length) throw new Error("The database does not contain a readable Recording");
    state.databaseCatalog = catalog;
    state.files = new Array(Number(catalog.summary?.asset_count || 0));
    state.rootName = recordingIds ? catalog.recordings.find(r => recordingIds.includes(r.databaseId))?.name || "Neuropixels" : catalog.dataset?.dataset_name || catalog.dataset?.dataset_id || "Neuropixels";
    state.recordings = recordingIds ? catalog.recordings.filter(r => recordingIds.includes(r.databaseId)) : catalog.recordings;
    if (!state.recordings.length) throw new Error("This project's linked recording is unavailable in the current local catalog");
    state.errors = [];
    state.regionResult = catalog.regionResult;
    elements.datasetTitle.textContent = state.rootName;
    elements.loadingProgress.style.width = "82%";
    elements.loadingMessage.textContent = t("loading.databaseIndexed", { recordings: state.recordings.length, units: number(state.recordings.reduce((sum, item) => sum + item.clusterLabels.length, 0)) });
    renderSummary();
    renderDialog();
    elements.dataDetails.disabled = false;
    showOnly("explorer");
    selectRecording(state.recordings[0]);
    showToast(t("toast.databaseReady", { time: catalog.serverTimingMs.toFixed(1) }));
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

  function recordingForSupplement(key) {
    return state.recordings.find((recording) => String(recording.databaseId || recording.key) === String(key)) || null;
  }

  function openSupplementPicker(button) {
    if (state.supplementBusy) return;
    const recording = recordingForSupplement(button.dataset.recordingKey);
    const roles = String(button.dataset.ingestRoles || "").split(",").filter(Boolean);
    if (!recording || !roles.length) {
      showToast(t("toast.supplementTargetMissing"));
      return;
    }
    const kind = button.dataset.supplementKind === "folder" ? "folder" : "files";
    state.pendingSupplement = { recordingKey: recording.databaseId || recording.key, roles, kind };
    const input = kind === "folder" ? elements.supplementFolderInput : elements.supplementFileInput;
    input.value = "";
    input.click();
  }

  function captureOpenUnitViews() {
    return new Map(plotEntries().map((entry) => [entry.key, {
      start: entry.manager.start,
      span: entry.manager.span,
      history: entry.manager.history.map((view) => ({ ...view }))
    }]));
  }

  async function refreshAffectedOpenUnits(affectedRecordingIds, viewSnapshots, focusedKey) {
    const affected = new Set(affectedRecordingIds.map(String));
    const entries = plotEntries().filter((entry) => affected.has(String(entry.recording.databaseId || entry.recording.key)));
    for (const entry of entries) {
      const result = await inspectRecordingUnit(entry.recording, entry.clusterId);
      entry.result = result;
      if (Array.isArray(result.unitSummaries) && result.unitSummaries.length) {
        entry.recording.unitSummaryMap = new Map(result.unitSummaries.map((item) => [item.id, item]));
      }
      const view = viewSnapshots.get(entry.key);
      state.syncingTime = true;
      try {
        entry.manager.setData({ ...result, sampleRate: entry.recording.sampleRate });
        if (view) {
          entry.manager.history = view.history;
          entry.manager.setWindow(view.start, view.span);
        }
        entry.manager.setMode(state.interactionMode);
      } finally {
        state.syncingTime = false;
      }
    }
    if (focusedKey && state.openUnits.has(focusedKey)) setFocusedUnit(focusedKey);
    else if (focusedEntry()) setFocusedUnit(focusedEntry().key);
    renderUnitList();
    updateOpenUnitCount();
  }

  async function supplementFolderRecording(recording, files, roles) {
    const expectedRoles = new Set(roles);
    const supported = [...files].filter((file) => expectedRoles.has(core.roleForFile(file)));
    if (!supported.length) throw new Error(t("toast.noMatchingSupplement"));
    const wrong = supported.map((file) => ({ file, owner: core.detectRecordingFromPath(state.recordings, file) }))
      .find(({ owner }) => owner && owner !== recording);
    if (wrong) {
      throw new Error(t("toast.wrongRecording", { file: wrong.file.name, recording: wrong.owner.name, expected: recording.name }));
    }
    const identities = new Set();
    for (const file of supported) {
      const identity = `${core.roleForFile(file)}::${core.fileNameOf(file)}`;
      if (identities.has(identity)) throw new Error(t("toast.duplicateSelection", { file: file.name }));
      identities.add(identity);
    }
    const merged = await core.mergeSupplementFiles(recording, supported);
    Object.assign(recording, merged.recording, { dataVersion: Number(recording.dataVersion || 0) + 1 });
    state.files.push(...merged.additions);
    return {
      affectedRecordings: [recording.databaseId || recording.key],
      items: merged.additions.map((file) => ({ filename: file.name, action: "inserted" })),
      duplicates: merged.duplicates
    };
  }

  async function applySupplement(files, pending) {
    const selected = [...files].filter((file) => file && !String(file.name || "").startsWith("."));
    if (!selected.length) return;
    const recording = recordingForSupplement(pending.recordingKey);
    if (!recording) throw new Error(t("toast.supplementTargetMissing"));
    const focusedKey = state.focusedUnit;
    const viewSnapshots = captureOpenUnitViews();
    let committed;
    if (state.dataMode === "database") {
      committed = await databaseClient.ingestFiles(selected, {
        expectedRecordingId: recording.databaseId,
        expectedRoles: pending.roles,
        sourceKind: pending.kind,
        onProgress: ({ phase, current, total, filename }) => {
          showToast(phase === "commit"
            ? t("toast.supplementCommit")
            : t("toast.supplementUpload", { current, total, file: filename }));
        }
      });
      for (const recordingId of committed.affectedRecordings || []) {
        const target = recordingForSupplement(recordingId);
        if (target) Object.assign(target, await databaseClient.loadRecording(recordingId));
      }
    } else {
      committed = await supplementFolderRecording(recording, selected, pending.roles);
    }
    await refreshAffectedOpenUnits(committed.affectedRecordings || [], viewSnapshots, focusedKey);
    renderSummary();
    renderRecordings();
    renderDialog();
    const added = (committed.items || []).filter((item) => item.action !== "duplicate").length;
    const duplicates = (committed.items || []).filter((item) => item.action === "duplicate").length + Number(committed.duplicates?.length || 0);
    showToast(t("toast.supplementReady", { added, duplicates }));
  }

  async function handleSupplementSelection(input) {
    const pending = state.pendingSupplement;
    if (!pending || state.supplementBusy || !input.files?.length) return;
    state.supplementBusy = true;
    renderDataStatus();
    try {
      await applySupplement(input.files, pending);
    } catch (error) {
      showToast(t("toast.supplementFailed", { error: error.message }));
    } finally {
      state.supplementBusy = false;
      state.pendingSupplement = null;
      input.value = "";
      renderDataStatus();
    }
  }

  function openPicker() {
    elements.folderInput.value = "";
    elements.folderInput.click();
  }

  elements.emptyOpen.addEventListener("click", openPicker);
  elements.themeSelect.value = themeSnapshot.preference;
  elements.themeSelect.addEventListener("change", () => themeController.setPreference(elements.themeSelect.value));
  themeController.onChange(applyThemeSnapshot, false);
  elements.languageSelect.value = languageSnapshot.language;
  elements.languageSelect.addEventListener("change", () => languageController.setLanguage(elements.languageSelect.value));
  languageController.onChange(applyLanguageSnapshot, false);
  elements.helpButton.setAttribute("aria-expanded", "false");
  elements.helpButton.addEventListener("click", openHelp);
  elements.closeHelp.addEventListener("click", () => closeHelp());
  elements.helpBackdrop.addEventListener("click", () => closeHelp());
  elements.dataStatusButton.addEventListener("click", () => setDataStatusOpen(elements.dataStatusPopover.hidden));
  elements.closeDataStatus.addEventListener("click", () => {
    setDataStatusOpen(false);
    elements.dataStatusButton.focus({ preventScroll: true });
  });
  elements.dropZone.addEventListener("click", (event) => { if (event.target === elements.dropZone || event.target.closest(".folder-mark")) openPicker(); });
  elements.dropZone.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); openPicker(); } });
  elements.folderInput.addEventListener("change", () => openFiles(elements.folderInput.files));
  elements.supplementFileInput.addEventListener("change", () => handleSupplementSelection(elements.supplementFileInput));
  elements.supplementFolderInput.addEventListener("change", () => handleSupplementSelection(elements.supplementFolderInput));
  elements.dataStatusGroups.addEventListener("click", (event) => {
    const button = event.target.closest("[data-supplement-kind]");
    if (button) openSupplementPicker(button);
  });

  elements.recordingStrip.addEventListener("click", (event) => {
    const button = event.target.closest("[data-recording-key]");
    const recording = state.recordings.find((item) => item.key === button?.dataset.recordingKey);
    if (recording && recording !== state.activeRecording) selectRecording(recording);
  });
  elements.recordingPrevious.addEventListener("click", () => scrollRecordings(-1));
  elements.recordingNext.addEventListener("click", () => scrollRecordings(1));
  elements.recordingStrip.addEventListener("scroll", updateRecordingScrollControls, { passive: true });
  window.addEventListener("resize", updateRecordingScrollControls, { passive: true });

  elements.findUnitButton.addEventListener("click", () => setFindUnitOpen(elements.findUnitPopover.hidden));
  elements.findUnitInput.addEventListener("input", renderFindUnitResults);
  elements.findUnitInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const first = elements.findUnitResults.querySelector("[data-find-unit-id]");
    if (first) {
      event.preventDefault();
      selectActivityUnit(Number(first.dataset.findUnitId));
    }
  });
  elements.findUnitResults.addEventListener("click", (event) => {
    const result = event.target.closest("[data-find-unit-id]");
    if (result) selectActivityUnit(Number(result.dataset.findUnitId));
  });
  document.getElementById("pin-unit-button").addEventListener("click", () => {
    const recording = state.activeRecording;
    const id = state.experimentView.selectedUnitId;
    if (!recording || id == null) return;
    const entry = state.openUnits.get(viewKey(recording, id));
    const unit = state.activeActivityOverview?.units.find(item => Number(item.id) === Number(id));
    if (pinnedComparison.add(recording, unit, entry?.result, themeSnapshot.palette.units.primary))
      showToast(t("workspace.pinNext"));
  });

  elements.inspectUnitButton.addEventListener("click", () => {
    if (state.experimentView.selectedUnitId == null) return;
    elements.reviewLayout.hidden = false;
    requestAnimationFrame(() => {
      plots.render();
      detailPlots.render();
      probeViewer.draw();
      elements.closeUnitInspector.focus({ preventScroll: true });
    });
  });
  elements.closeUnitInspector.addEventListener("click", () => {
    elements.reviewLayout.hidden = true;
    elements.inspectUnitButton.focus({ preventScroll: true });
  });

  elements.unitList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cluster-id]");
    if (!button) return;
    const clusterId = Number(button.dataset.clusterId);
    if (event.ctrlKey || event.metaKey) addUnitToView(state.activeRecording, clusterId);
    else openUnitOnly(state.activeRecording, clusterId);
  });
  elements.unitList.addEventListener("contextmenu", (event) => {
    const button = event.target.closest("[data-cluster-id]");
    if (!button || !state.activeRecording) return;
    event.preventDefault();
    openUnitContextMenu(state.activeRecording, Number(button.dataset.clusterId), event.clientX, event.clientY);
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
    const current = buttons.indexOf(document.activeElement);
    const next = clamp(current + (event.key === "ArrowDown" ? 1 : -1), 0, buttons.length - 1);
    if (buttons[next]) {
      event.preventDefault();
      buttons[next].focus();
    }
  });

  elements.primaryTraceLane.addEventListener("pointerdown", () => {
    const item = primaryOpenUnit();
    if (item) setFocusedUnit(item.key);
  }, { capture: true });
  elements.primaryTraceLane.querySelector(".trace-lane-header").addEventListener("click", () => {
    const item = primaryOpenUnit();
    if (item) setFocusedUnit(item.key);
  });
  elements.primaryTraceRemove.addEventListener("click", (event) => {
    event.stopPropagation();
    const item = primaryOpenUnit();
    if (item) removeUnitFromView(item.key);
  });
  document.getElementById("spike-overview-canvas").addEventListener("pointerdown", () => {
    const item = primaryOpenUnit();
    if (item) setFocusedUnit(item.key);
  }, { capture: true });
  elements.probeLegend.addEventListener("click", (event) => {
    const item = event.target.closest("[data-view-key]");
    if (item) setFocusedUnit(item.dataset.viewKey);
  });
  elements.probeLegend.addEventListener("contextmenu", (event) => {
    const row = event.target.closest("[data-view-key]");
    const item = row ? state.openUnits.get(row.dataset.viewKey) : null;
    if (!item) return;
    event.preventDefault();
    openUnitContextMenu(item.recording, item.clusterId, event.clientX, event.clientY);
  });
  elements.probeLegend.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const item = event.target.closest("[data-view-key]");
    if (item) {
      event.preventDefault();
      setFocusedUnit(item.dataset.viewKey);
    }
  });
  elements.timeLink.addEventListener("click", () => setTimeLinked(!state.timeLinked));
  elements.cursorMode.addEventListener("click", () => setInteractionMode("cursor"));
  elements.zoomMode.addEventListener("click", () => setInteractionMode("zoom"));
  elements.panMode.addEventListener("click", () => setInteractionMode("pan"));
  elements.backTime.addEventListener("click", backFocusedTime);
  elements.zoomOut.addEventListener("click", () => focusedEntry()?.manager.zoom(1.5));
  elements.zoomIn.addEventListener("click", () => focusedEntry()?.manager.zoom(.67));
  elements.resetTime.addEventListener("click", () => focusedEntry()?.manager.reset());
  elements.unitContextMenu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-unit-action]")?.dataset.unitAction;
    if (action) runUnitContextAction(action);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!elements.unitContextMenu.hidden && !event.target.closest("#unit-context-menu")) hideUnitContextMenu();
    if (!elements.dataStatusPopover.hidden && !event.target.closest("#capability-row")) setDataStatusOpen(false);
    if (!elements.findUnitPopover.hidden && !event.target.closest(".find-unit-control")) setFindUnitOpen(false);
  });
  document.addEventListener("pointerover", (event) => {
    const control = event.target.closest?.(".context-help[data-help-key]");
    if (control) showContextHelp(control);
  });
  document.addEventListener("pointerout", (event) => {
    const control = event.target.closest?.(".context-help[data-help-key]");
    if (control && !control.contains(event.relatedTarget) && document.activeElement !== control) hideContextHelp(control);
  });
  document.addEventListener("focusin", (event) => {
    const control = event.target.closest?.(".context-help[data-help-key]");
    if (control) showContextHelp(control);
  });
  document.addEventListener("focusout", (event) => {
    const control = event.target.closest?.(".context-help[data-help-key]");
    if (control && !control.matches(":hover")) hideContextHelp(control);
  });
  document.addEventListener("keydown", (event) => {
    if (!elements.helpDrawer.hidden && event.key === "Tab") {
      const controls = [...elements.helpDrawer.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter((item) => !item.hidden);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (event.key === "Escape" && !elements.helpDrawer.hidden) {
      event.preventDefault();
      closeHelp();
      return;
    }
    if (event.key === "Escape" && activeHelpControl) hideContextHelp(activeHelpControl);
    if (event.key === "Escape" && !elements.unitContextMenu.hidden) hideUnitContextMenu();
    if (event.key === "Escape" && !elements.dataStatusPopover.hidden) {
      setDataStatusOpen(false);
      elements.dataStatusButton.focus({ preventScroll: true });
    }
    if (event.key === "Escape" && !elements.findUnitPopover.hidden) {
      setFindUnitOpen(false);
      elements.findUnitButton.focus({ preventScroll: true });
    }
    if (event.key === "Escape" && !elements.reviewLayout.hidden) {
      elements.reviewLayout.hidden = true;
      elements.inspectUnitButton.focus({ preventScroll: true });
    }
  });
  document.addEventListener("scroll", hideUnitContextMenu, true);
  window.addEventListener("resize", () => { if (activeHelpControl) positionContextTooltip(activeHelpControl); });
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
    showLoading(t("loading.readingFolder"), t("loading.collectingFiles"), 8);
    try { await openFiles(await filesFromDrop(event.dataTransfer)); }
    catch (error) {
      showOnly("empty");
      showToast(t("toast.droppedError", { error: error.message }));
    }
  });

  window.addEventListener("beforeunload", () => {
    state.worker?.terminate();
    if (state.workerUrl) URL.revokeObjectURL(state.workerUrl);
    videoController?.destroy();
    activityCanvas.destroy();
  });

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  async function initialize() {
    const databaseRequested = new URLSearchParams(window.location.search).get("database") === "1";
    if (databaseRequested && ["http:", "https:"].includes(window.location.protocol)) {
      try {
        await openDatabaseCatalog();
        return;
      } catch (error) {
        showOnly("empty");
        showToast(t("toast.databaseUnavailable", { error: error.message }));
      }
    }
    showOnly("empty");
  }

  applyLanguageSnapshot(languageSnapshot);
  updateOpenUnitCount();
  setInteractionMode("cursor");
  initialize();
})();
