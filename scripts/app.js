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
  let themeSnapshot = themeController.snapshot();
  let languageSnapshot = languageController.snapshot();
  const t = (key, values) => languageController.t(key, values);
  setPlotTheme(themeSnapshot.palette.canvas);
  setProbeTheme(themeSnapshot.palette.probe);

  const elements = {
    shell: document.getElementById("app-shell"),
    datasetTitle: document.getElementById("dataset-title"),
    openFolder: document.getElementById("open-folder-button"),
    folderInput: document.getElementById("folder-input"),
    supplementFileInput: document.getElementById("supplement-file-input"),
    supplementFolderInput: document.getElementById("supplement-folder-input"),
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
    textSize: document.getElementById("text-size"),
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
  document.getElementById("probe-dock").append(document.getElementById("mini-probe"));
  document.getElementById("toggle-probe-dock").addEventListener("click", (event) => {
    const dock = document.getElementById("mini-probe");
    dock.hidden = !dock.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!dock.hidden));
    document.querySelector(".observation-bench").classList.toggle("probe-hidden", dock.hidden);
  });
  // The editor and time strip belong to the video, not a new workspace row.
  elements.videoBody.append(document.getElementById("annotation-panel"));
  // Keep the player and its tools in separate panes when video sits above neural activity.
  const videoControls = document.createElement("div");
  videoControls.className = "video-control-workbench";
  for (const child of [...elements.videoBody.children]) {
    if (!child.classList.contains("video-stage")) videoControls.append(child);
  }
  elements.videoBody.append(videoControls);
  const playbackOptions = document.createElement("details");
  playbackOptions.className = "playback-options";
  playbackOptions.innerHTML = '<summary data-design-copy="playbackOptions">Playback details</summary><div></div>';
  playbackOptions.querySelector("div").append(elements.videoTransport.querySelector(".video-custom-rate"), elements.videoTransport.querySelector(".video-jump"));
  elements.videoTransport.after(playbackOptions);
  elements.videoSpeed.addEventListener("change", () => {
    if (elements.videoSpeed.value === "custom") playbackOptions.open = true;
  });

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
    activityOverviewCache: new Map(),
    activeActivityOverview: null,
    videoSplitPercent: 44,
    videoStackedPercent: 50,
    workspacePresentation: "side",
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
    restoreVideoSplit();
  }

  function videoSplitKey() {
    if (state.workspacePresentation !== "stacked" && !videoIsEmphasized() &&
        !document.getElementById("analysis-pages").hidden && !elements.videoPanel.classList.contains("has-source"))
      return "analysisEmptyVideoPercent";
    return state.workspacePresentation === "stacked"
      ? (videoIsEmphasized() ? "videoStackedFocusPercent" : "videoStackedPercent")
      : (videoIsEmphasized() ? "videoFocusSplitPercent" : "videoSplitPercent");
  }
  function defaultVideoSplit() {
    if (videoSplitKey() === "analysisEmptyVideoPercent") return 25;
    return videoIsEmphasized() ? 60 : state.workspacePresentation === "stacked" ? 50 : 44;
  }
  function restoreVideoSplit() { setVideoSplitPercent(state[videoSplitKey()] || defaultVideoSplit()); }
  function setVideoSplitPercent(value) {
    const focused = videoIsEmphasized();
    const stacked = state.workspacePresentation === "stacked";
    const requested = Math.max(25, Math.min(focused ? 70 : 60, Number(value) || defaultVideoSplit()));
    state[videoSplitKey()] = requested;
    const bodyStyle = getComputedStyle(elements.experimentBody);
    const width = Math.max(1, elements.experimentBody.clientWidth - parseFloat(bodyStyle.paddingLeft) - parseFloat(bodyStyle.paddingRight));
    const height = Math.max(1, elements.experimentBody.clientHeight - parseFloat(bodyStyle.paddingTop) - parseFloat(bodyStyle.paddingBottom));
    // The lower neural pane needs 230 px plus the separator and gaps, including in annotation mode.
    const maximum = stacked ? Math.max(25, Math.min(65, (height - 250) / height * 100))
      : Math.min(focused ? 70 : 55, Math.max(25, (width - 420) / width * 100));
    const minimum = stacked ? Math.min(maximum, 210 / height * 100) : 25;
    const percentValue = Math.max(minimum, Math.min(requested, maximum));
    elements.experimentBody?.style.setProperty(stacked ? "--video-region-height" : "--video-region-width", `${percentValue}%`);
    elements.videoSplitter?.setAttribute("aria-valuenow", String(Math.round(percentValue)));
    elements.videoSplitter?.setAttribute("aria-valuemin", String(Math.round(minimum)));
    elements.videoSplitter?.setAttribute("aria-valuemax", String(Math.round(maximum)));
  }

  function setWorkspacePresentation(layout) {
    state.workspacePresentation = layout === "stacked" ? "stacked" : "side";
    const stacked = state.workspacePresentation === "stacked";
    elements.experimentBody.classList.toggle("video-above", stacked);
    // DOM order follows the visual order for keyboard and screen-reader navigation.
    if (stacked) elements.experimentBody.prepend(elements.videoHost, elements.videoSplitter);
    else elements.experimentBody.append(elements.videoSplitter, elements.videoHost);
    elements.videoSplitter.setAttribute("aria-orientation", stacked ? "horizontal" : "vertical");
    for (const button of document.querySelectorAll("[data-workspace-layout]")) {
      button.setAttribute("aria-pressed", String(button.dataset.workspaceLayout === state.workspacePresentation));
    }
    restoreVideoSplit();
  }

  function installVideoSplitter() {
    const splitter = elements.videoSplitter;
    const body = elements.experimentBody;
    if (!splitter || !body) return;
    let drag=null;
    splitter.setAttribute("aria-valuemin", "25");
    splitter.setAttribute("aria-valuemax", "50");
    splitter.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      drag={id:event.pointerId,percent:state[videoSplitKey()] ?? defaultVideoSplit()};
      splitter.focus({preventScroll:true});
      splitter.classList.add("is-dragging");
      splitter.setPointerCapture?.(event.pointerId);
    });
    splitter.addEventListener("pointermove", (event) => {
      if (!splitter.hasPointerCapture?.(event.pointerId)) return;
      const rectangle = body.getBoundingClientRect();
      setVideoSplitPercent(state.workspacePresentation === "stacked"
        ? (event.clientY - rectangle.top) / Math.max(1, rectangle.height) * 100
        : (rectangle.right - event.clientX) / Math.max(1, rectangle.width) * 100);
    });
    const finish = (event,cancelled=false) => {
      if (!drag || (event.pointerId!=null && drag.id!==event.pointerId)) return;
      const {id,percent}=drag;drag=null;
      if (cancelled) setVideoSplitPercent(percent);
      if (splitter.hasPointerCapture?.(id)) splitter.releasePointerCapture(id);
      splitter.classList.remove("is-dragging");
    };
    splitter.addEventListener("pointerup", finish);
    splitter.addEventListener("pointercancel", event=>finish(event,true));
    splitter.addEventListener("lostpointercapture", event=>finish(event,true));
    splitter.addEventListener("dblclick", () => setVideoSplitPercent(defaultVideoSplit()));
    splitter.addEventListener("keydown", (event) => {
      if (event.key==="Escape" && drag) {event.preventDefault();event.stopPropagation();finish(event,true);return;}
      const stacked = state.workspacePresentation === "stacked";
      if (!(stacked ? ["ArrowUp", "ArrowDown", "Home"] : ["ArrowLeft", "ArrowRight", "Home"]).includes(event.key)) return;
      event.preventDefault();
      setVideoSplitPercent(event.key === "Home" ? defaultVideoSplit() : Number(splitter.getAttribute("aria-valuenow")) + (["ArrowLeft", "ArrowDown"].includes(event.key) ? 2 : -2));
    });
    const compact = matchMedia("(max-width:900px), (max-height:640px)");
    const preferenceKey = "neuropixels-explorer-presentation";
    let preferred;
    try { preferred = localStorage.getItem(preferenceKey); } catch { /* Storage is optional. */ }
    const requested = new URLSearchParams(location.search).get("layout");
    if (requested === "side" || requested === "stacked") preferred = requested;
    const applyPresentation = () => setWorkspacePresentation(compact.matches ? "stacked" : preferred);
    for (const button of document.querySelectorAll("[data-workspace-layout]")) button.addEventListener("click", () => {
      preferred = button.dataset.workspaceLayout;
      try { localStorage.setItem(preferenceKey, preferred); } catch { /* Keep the choice in this tab. */ }
      applyPresentation();
    });
    compact.addEventListener("change", applyPresentation);
    applyPresentation();
    const resize = restoreVideoSplit;
    new ResizeObserver(resize).observe(body);
    const paneChanges = new MutationObserver(resize);
    paneChanges.observe(document.getElementById("mini-probe"), { attributeFilter: ["class"] });
    paneChanges.observe(elements.videoPanel, { attributeFilter: ["class"] });
    paneChanges.observe(document.getElementById("analysis-pages"), { attributeFilter: ["hidden"] });
  }

  installVideoSplitter();

  let helpReturnFocus = null;
  let activeHelpControl = null;
  let pendingHelpControl = null, helpTimer = 0, originalHelpTitle = null, temporaryHelpName = false;

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
  let videoEvents = null;
  let projectUI = null;
  let miniProbe = null;
  let annotationController = null;
  let behaviorLabels = null;
  let analysisTabs = null;
  let patterns = null;
  let eventAnalysis = null;
  let populationDynamics = null;

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
    onUnmappedVideoTime: () => annotationController?.update(),
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

  const signalWorkspace = new window.NeuropixelsSignalWorkspace(document.getElementById('signal-workspace'), {
    getRecording:()=>state.activeRecording, getView:()=>state.experimentView, setView:setExperimentView, selectUnit:selectActivityUnit,
    captureContext:()=>({
      source:behaviorLabels.source, types:{...behaviorLabels.types}, lastVideoLabel:behaviorLabels.lastVideoLabel||'',
      clipKey:annotationController.key, clips:[...annotationController.selected], track:annotationController.activeTrack,
      editorOpen:annotationController.opened
    }),
    restoreContext:context=>{
      if (!context) return;
      if (context.clipKey===annotationController.key) {
        behaviorLabels.source=context.source;
        behaviorLabels.types={...context.types};
        behaviorLabels.lastVideoLabel=context.lastVideoLabel;
        const ids=new Set(annotationController.doc?.segments?.map(row=>row.id)||[]);
        annotationController.selected=new Set(context.clips.filter(id=>ids.has(id)));
        annotationController.activeTrack=context.track;
        annotationController.opened=context.editorOpen;
        annotationController.render();
      }
      behaviorLabels.render();
    },
    loadWindow:loadSignalWindow, localSpikeWindows:()=>state.dataMode!=='database', selectLabel:selectBehaviorLabel, t,
    onPatternQuery:(range,unitIds)=>openBehaviorPatterns(range,unitIds)
  });
  for (const button of [elements.videoPrevious,elements.videoNext,elements.videoPlay]) {
    button?.addEventListener('click',()=>signalWorkspace.checkpoint(),true);
  }
  const videoJump=document.getElementById('video-seek-seconds');
  videoJump?.addEventListener('change',()=>signalWorkspace.checkpoint(),true);
  videoJump?.addEventListener('keydown',e=>{if(e.key==='Enter')signalWorkspace.checkpoint();},true);
  const annotationStrip=document.getElementById('annotation-timeline');
  const beforeClip=e=>{if(e.target.closest('[data-clip]'))signalWorkspace.checkpoint();};
  annotationStrip.addEventListener('click',beforeClip,true);
  annotationStrip.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')beforeClip(e);},true);
  function revealNeuralTime(time, interval=null, showWholeInterval=false) {
    const current=state.experimentView.visibleRange, duration=state.activeRecording?.duration;
    if (!Number.isFinite(time) || !duration) return;
    const left=showWholeInterval && interval ? Math.min(time,interval.start) : time;
    const right=showWholeInterval && interval ? Math.max(time,interval.end) : time;
    const span=Math.min(duration,Math.max(current.end-current.start || 2,right-left));
    const start=Math.max(0,Math.min(duration-span,(left+right-span)/2));
    videoController.pause();
    setExperimentView({cursorTime:time, selectedInterval:interval,
      visibleRange:left>=current.start && right<=current.end && time<current.end ? current : {start,end:start+span}}, {seekVideo:true});
  }
  function selectBehaviorLabel(row, source) {
    signalWorkspace.checkpoint();
    behaviorLabels.pickedEvent={recording:state.activeRecording,source,id:row.id,label:row.label};
    if (source==='annotation') {
      behaviorLabels.lastVideoLabel=row.label;
      annotationController?.select(row.id, {openEditor:false,preserveWindow:true});
    }
    else revealNeuralTime(row.start, row.end>row.start ? {start:row.start,end:row.end} : null);
  }
  function analysisProject(){return projectUI?.active?.id ?? state.datasetToken;}
  async function returnToAnalysisSource(recording,id,cameraId){
    if(cameraId && !projectUI?.active?.videoLibrary?.some(v=>v.id===cameraId)){
      showToast(t('joint.restoreVideo'),'error');return false;
    }
    if(!await revealAnalysisUnit(recording,id))return false;
    if(cameraId && projectUI.activeVideo?.id!==cameraId)await projectUI.selectVideo(cameraId);
    if(cameraId && projectUI.activeVideo?.id!==cameraId){showToast(t('joint.restoreVideo'),'error');return false;}
    const media=videoController.elements.video;
    if(cameraId && media.readyState<1){
      if(media.error){showToast(t('joint.videoLoad'),'error');return false;}
      const listeners=new AbortController();
      const loaded=await new Promise(resolve=>{
        const done=ok=>{clearTimeout(timer);listeners.abort();resolve(ok);};
        const timer=setTimeout(()=>done(false),15000);
        media.addEventListener('loadedmetadata',()=>done(true),{signal:listeners.signal});
        media.addEventListener('error',()=>done(false),{signal:listeners.signal});
      });
      if(!loaded || projectUI.activeVideo?.id!==cameraId){showToast(t('joint.videoLoad'),'error');return false;}
    }
    return true;
  }
  async function openBehaviorPatterns(queryRange=null, unitIds) {
    const queryRecording=state.activeRecording;
    const queryRefs=unitIds?.map(id=>queryRecording?.jointUnits?.get(id)||{recordingKey:queryRecording?.key,unitId:id});
    if(!await prepareProbeAnalysis(queryRefs?.length?queryRefs:undefined))return;
    const recording=state.activeRecording;
    if (!recording || !state.activeActivityOverview) return;
    const selected=window.NeuropixelsJointRecording.analysisIds(recording,queryRefs?.length?queryRefs:[]);
    unitIds=selected.length?selected:signalWorkspace.selectedUnits();
    const source=behaviorLabels.source, launcher=behaviorLabels.launcher;
    const doc=annotationController.doc, mapping=videoController.mapping, cursor=state.experimentView.cursorTime;
    const annotations=doc ? window.NeuropixelsEventAnalysis.fromAnnotations(doc,mapping,
      {recordingId:recording.key,reviewedOnly:true,includeNamedManual:true}).events : [];
    const available=source==='experiment' ? behaviorLabels.recorded : annotations;
    const label=behaviorLabels.patternType || '';
    const events=available.filter(row=>(row.label||row.type)===label);
    const picked=behaviorLabels.pickedEvent;
    const distance=row=>Math.max(row.start-cursor,0,cursor-(row.end??row.start));
    const explicit=picked?.recording===recording && picked.source===source && events.find(row=>
      (row.id===picked.id || row.sourceId===picked.id) && distance(row)<0.001);
    const anchor=explicit || events.reduce((best,row)=>!best || distance(row)<distance(best)?row:best,null);
    if (!patterns) {
      const panel=document.createElement('section');
      panel.id='behavior-patterns';
      document.getElementById('experiment-workspace').append(panel);
      patterns=new window.NeuropixelsBehaviorPatternsUI(panel);
    }
    const cameraId=projectUI?.activeVideo?.id;
    const previous=patterns.input;
    const contextEvents=[...behaviorLabels.recorded,...annotations];
    const sameEvents=previous?.contextEvents.length===contextEvents.length&&contextEvents.every((e,i)=>{
      const old=previous.contextEvents[i];return old.id===e.id && old.start===e.start && old.end===e.end && old.label===e.label && old.type===e.type;
    });
    if(!queryRange && previous && !previous.queryRange && patterns.recordingObject===recording && previous.cameraId===cameraId &&
        patterns.timeMapping===mapping && previous.source===source && previous.label===label && sameEvents &&
        (!unitIds.length || unitIds.join()===previous.unitIds?.join())){
      patterns.setCollapsed(false);patterns.root.focus({preventScroll:true});return;
    }
    Object.assign(patterns,patternContext(recording,cameraId));
    patterns.project=analysisProject();patterns.timeMapping=mapping;
    patterns.open({source,label,events,unitIds:unitIds.length?unitIds:undefined,queryRange,cameraId,anchorId:anchor?.id,recordingKey:recording.key,
      contextEvents,launcher});
  }
  videoEvents = new window.NeuropixelsVideoEventTimeline({
    overview:document.getElementById('video-event-overview'), detail:document.getElementById('video-event-detail'),
    video:videoController, getView:()=>state.experimentView, select:selectBehaviorLabel,
    seekNeural:revealNeuralTime, history:signalWorkspace
  });
  behaviorLabels = new window.NeuropixelsBehaviorLabels(document.getElementById('behavior-labels'), {
    onRows:(rows,source)=>{
      const kind = source === "experiment" ? "events" : "annotation";
      document.getElementById("behavior-labels").dataset.importDrop = kind;
      document.getElementById("video-event-detail").dataset.importDrop = kind;
      videoEvents.setRows(rows,source);
    },
    videoCursor:()=>videoController.currentVideoTime,
    onLabelSelection:(name,source)=>annotationController?.setMarkLabel(name,source),
    canvas:signalWorkspace, t, openPatterns:()=>openBehaviorPatterns(), onChange:()=>signalWorkspace.checkpoint(), select:selectBehaviorLabel, cursor:()=>state.experimentView.cursorTime || 0,
    onSource:source=>{ if(source==='experiment' && annotationController?.opened) annotationController.button.click(); }
  });
  annotationController = new window.NeuropixelsAnnotationUI.AnnotationController({
    panel: document.getElementById("annotation-panel"),
    strip: document.getElementById("annotation-timeline"),
    button: document.getElementById("annotation-toggle"),
    eventTimeline:videoEvents,
    labelControls:{settings:document.getElementById('annotation-settings'), mark:document.getElementById('annotation-mark'), kind:document.getElementById('annotation-mark-kind'),
      selectLabel:name=>behaviorLabels.selectVideoLabel(name)},
    video: videoController,
    getRecording: () => state.activeRecording,
    getView: () => state.experimentView,
    setView: (patch, options) => setExperimentView(patch, options),
    onOpenChange: (opened) => { if(opened) behaviorLabels.switchTo('annotation'); setVideoEmphasis("annotation", opened); },
    onAnnotations: () => {
      const rows=videoEvents.annotationRows(annotationController?.opened ? annotationController.activeTrack : null);
      const doc=annotationController?.doc;
      behaviorLabels.setVideo(rows,Object.keys(doc?.labelColors||{}),doc?.segments.length || 0,!!doc);
    },
    toast: showToast
  });

  function patternContext(recording,cameraId){
    const units=state.activeActivityOverview?.units||[];
    const media=videoController.source,mapping=videoController.mapping,cursor=state.experimentView.cursorTime;
    return {
    getRecording:()=>recording,getUnits:()=>units,
    getCursor:()=>cursor,
    getVideoRange:()=>{
      const duration=media?.duration;
      if (!(duration>0)) return null;
      const clock=mapping.frameClock?.video_s;
      const start=mapping.videoToNeural(Math.max(0,clock?.[0] ?? 0));
      const end=mapping.videoToNeural(Math.min(duration,clock?.at(-1) ?? duration));
      return Number.isFinite(start) && Number.isFinite(end) && end>Math.max(0,start) ? [Math.max(0,start),end] : null;
    },
    getVideoTime:time=>{
      const v=mapping.neuralToVideo(time);
      return media && Number.isFinite(v) && v>=0 && v<media.duration ? v : null;
    },
    returnToEvent:async(row,time,unitIds=[])=>{
      if(!await returnToAnalysisSource(recording,unitIds[0],cameraId))return;
      analysisTabs.signals({focus:false});
      signalWorkspace.checkpoint();
      revealNeuralTime(Number.isFinite(time)?time:row.start, row.end>row.start?{start:row.start,end:row.end,unitIds:signalWorkspace.selectedUnits()}:null,true);
      signalWorkspace.viewport.focus({preventScroll:true});
    }
  };
  }

  miniProbe = new window.NeuropixelsMiniProbe(document.getElementById("mini-probe"), selectActivityUnit, (region) => {
    signalWorkspace.checkpoint();
    const first=state.activeActivityOverview?.units.find(unit=>unit.region===region);
    if (first) signalWorkspace.locateUnit(first.id);
    setExperimentView({selectedRegion:region});
  });
  miniProbe.intervalReader = (recording, range, signal) => requestWorker({ type: "interval-activity", experimentKey: `${state.datasetToken}:${recording.key}:${Number(recording.dataVersion || 0)}`, files: workerFiles(recording), sampleRate: recording.sampleRate, duration: recording.duration, ...range }, { signal });
  miniProbe.readTemplate = async (recording,unit) => (await inspectRecordingUnit(recording,unit)).templateFootprint;
  projectUI = new (window.NeuropixelsBrowserProjectUI || window.NeuropixelsProjectUI)({state, video:videoController, annotations:annotationController, openFiles, selectRecording, clearNeuralWorkspace, updateRecordingTabs, queueWorkspaceEdit,
    onVideoExpand: (enabled = !state.videoEnlarged) => setVideoEmphasis("video", enabled),
    openCatalog:openDatabaseCatalog, home:()=>showOnly("explorer"), resume:()=>showOnly("explorer"),
    toast:showToast, folderFallback:openPicker});
  const unitMarks=window.NeuropixelsUnitMarks;
  unitMarks.configure({project:()=>projectUI.browserLocal?projectUI.active:null,failed:error=>showToast(error.message,'error'),
    save:(id,edit)=>queueWorkspaceEdit(async()=>{
      if(projectUI.active?.id!==id)return;
      const result=await projectUI.store.changeAssets(id,(project,assets)=>({
        project:{...project,unitMarks:edit(project.unitMarks),updated:Date.now()},assets
      }));
      if(projectUI.active?.id===id){
        projectUI.active={...projectUI.active,unitMarks:result.project.unitMarks};
        projectUI.markChanged();
      }
    })});
  const eventButton = document.getElementById('event-analysis-button');
  const figuresButton = document.getElementById('event-figures-button');
  figuresButton.onclick=async()=>{
    const owned=tab=>tab?.kind==='clusters' && tab.project===analysisProject();
    const tab=owned(analysisTabs.active)?analysisTabs.active:[...analysisTabs.tabs].reverse().find(t=>owned(t) &&
      (t.ui?.state.activeRecording.key===state.activeRecording?.key || t.ui?.state.activeRecording.jointSources?.includes(state.activeRecording?.key)));
    if(tab){tab.activate();tab.ui.openFigures();}
    else {const ui=await eventAnalysis.open();ui?.openFigures();}
  };
  async function prepareProbeAnalysis(refs=[]){
    const r=state.activeRecording, joint=window.NeuropixelsJointRecording;
    if(!refs.length || joint.analysisIds(r,refs).length===refs.length)return true;
    const keys=new Set(refs.map(ref=>ref.recordingKey));
    try{
      if(keys.size>1){
        const available=new Set(jointInputs().map(record=>record.key));
        if([...keys].some(key=>!available.has(key)))throw Error(t('joint.sessions'));
        const combined=await activateJointRecording();
        return !!combined && joint.analysisIds(combined,refs).length===refs.length;
      }
      const source=state.recordings.find(record=>keys.has(record.key));
      if(!source)return false;
      await selectRecording(source);return state.activeRecording===source;
    }catch(error){showToast(error.message,'error');return false;}
  }
  analysisTabs=new window.NeuropixelsAnalysisTabs(kind=>{
    (kind==='clusters'?eventAnalysis:populationDynamics).open();
  });
  function bindWorkspaceAnalysis(kind,Type,button,optionsFor){
    const api={
      update(){
        if(button){button.textContent=Type.prototype.t('title');button.disabled=!state.activeRecording;}
        if(kind==='clusters'){figuresButton.textContent=window.NeuropixelsEventFigures.word('entry');figuresButton.disabled=!state.activeRecording;}
      },
      async open({saved=false,source=null}={}){
        if(!await prepareProbeAnalysis())return;
        const recording=source||state.activeRecording;
        if(!recording?.spikeTimesFile || !recording?.spikeClustersFile || recording.missingInputs?.length){
          showToast(Type.prototype.t('unavailable'));return;
        }
        const project=analysisProject();
        const restore=saved || (kind==='dynamics' && !analysisTabs.tabs.some(t=>t.kind===kind&&t.recording.key===recording.key));
        const options=optionsFor(recording,projectUI?.activeVideo?.id);
        const units=source && source!==state.activeRecording?await options.getProbeUnits(source):options.getUnits();
        if(project!==analysisProject())return;
        const video={source:videoController.source,mapping:videoController.mapping};
        const tab=analysisTabs.create(kind,project,recording,recording.name);
        const ui=new Type({...options,workspaceTab:tab,video,annotations:{doc:annotationController.doc},button,
          toast:showToast,state:{activeRecording:recording,datasetToken:state.datasetToken,experimentView:{...state.experimentView}},
          getUnits:()=>units,getSavedAnalysis:restore?options.getSavedAnalysis:null});
        tab.ui=ui;tab.launcher=button||analysisTabs.picker;
        tab.dispose=()=>{ui.cancel(false);ui.review?.stop();ui.process?.destroy();ui.dispose?.();};
        tab.onShow=()=>{ui.review?.refreshUnits?.();};
        try{await ui.open();return ui;}catch(error){analysisTabs.remove(tab);showToast(error.message,'error');}
      }
    };
    if(button)button.onclick=()=>api.open();api.update();return api;
  }
  eventAnalysis = bindWorkspaceAnalysis('clusters',window.NeuropixelsEventAnalysisUI,eventButton,(recording,cameraId)=>({
    getProbeSources:()=>jointInputs(recording),
    getProbeUnits:probeAnalysisUnits,
    prepareProbeScope:async(records)=>{
      if(!records.length || records.some(r=>!state.recordings.includes(r)))throw Error(t('joint.restoreProbe'));
      return records.length===1?records[0]:getJointRecording(records);
    },
    createSpikePicker:(host,options)=>window.NeuropixelsSignalWorkspace.forUnitSelection(host,{
      ...options,loadWindow:range=>loadSignalWindow(range,options.recording),
      initialView:options.recording===state.activeRecording?state.experimentView:null,
      initialScroll:options.recording===state.activeRecording?signalWorkspace.viewport.scrollTop:0
    }),
    sourceTitle:s=>t(s==='experiment'?'labels.recorded':'labels.video'),
    preferredLabels:()=>{
      const {source,picker,pickedEvent}=behaviorLabels;
      const picked=pickedEvent && pickedEvent.recording===state.activeRecording && pickedEvent.source===source ? pickedEvent.label : '';
      return {source,type:picker.value || picked};
    },
    highlightedUnits:()=>signalWorkspace.selectedUnits(),
    button:eventButton,
    getUnits:recordingAnalysisUnits,
    canSave:()=>!!projectUI?.browserLocal&&!!projectUI.active,
    getSavedAnalysis:r=>projectUI?.getEventAnalysis?.(r)||null,
    saveAnalysis:(r,blob)=>projectUI.saveEventAnalysis(r,blob),
    selectUnit(unitId){return revealAnalysisUnit(this.state.activeRecording,unitId);},
    async returnToSource(unitId,event){
      if(!await returnToAnalysisSource(this.state.activeRecording,unitId,cameraId))return;
      signalWorkspace.checkpoint();
      const doc=annotationController.doc;
      if(event.sourceKind==='annotation' && String(doc?.context?.recordingKey)===String(projectUI?.activeVideo?.annotationRecordingKey)
          && doc?.segments.some(segment=>segment.id===event.sourceId)){
        annotationController.select(event.sourceId,{openEditor:false,preserveWindow:true});
      }else{
        revealNeuralTime(event.start,event.end>event.start?{start:event.start,end:event.end}:null);
        if(event.sourceKind==='annotation' && Number.isFinite(event.videoStart))videoController.seekVideo(event.videoStart,{preserveView:true});
      }
    }
  }));
  projectUI.openSavedEventAnalysis=async asset=>{
    const project=analysisProject();
    const keys=asset.sourceRecordings||[asset.recordingId];
    const records=keys.map(key=>state.recordings.find(r=>r.key===key));
    if(records.some(r=>!r))throw Error(t('joint.restoreProbe'));
    const source=records.length===1?records[0]:await getJointRecording(records);
    if(source && project===analysisProject())await eventAnalysis.open({saved:true,source});
  };
  populationDynamics = bindWorkspaceAnalysis('dynamics',window.NeuropixelsPopulationDynamicsUI,null,(recording,cameraId)=>({
    getUnits:recordingAnalysisUnits,
    getProbeSelection:()=>signalWorkspace.selectedUnits(),
    canSave:()=>!!projectUI?.browserLocal&&!!projectUI.active,
    getSavedAnalysis:r=>projectUI?.getPopulationDynamics?.(r)||null,
    saveAnalysis:(r,blob,options)=>projectUI.savePopulationDynamics(r,blob,options),
    returnToSource:async([start,end])=>{
      if(!await returnToAnalysisSource(recording,null,cameraId))return;
      signalWorkspace.checkpoint();
      setExperimentView({cursorTime:start,visibleRange:{start:Math.max(0,start-1),end:end+1},selectedInterval:{start,end}}, {seekVideo:true});
    }
  }));
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
    signalWorkspace.render();
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

  const tourPanel = document.getElementById("import-walkthrough");
  const tourSteps = [
    ["neural", "#workspace-empty-intro, .activity-workspace"],
    ["anatomy", "#mini-probe, #toggle-probe-dock"],
    ["events", "[data-label-source=experiment], #experiment-video-region"],
    ["video", "#video-empty, #video-alignment, #experiment-video-region"]
  ];
  const tourStorageKey = "neuropixels.importWalkthrough.dismissed";
  let tourStep = 0, tourAutomatic = false;

  function renderImportTour(reveal = false) {
    if (tourPanel.hidden) return;
    const [key, selectors] = tourSteps[tourStep];
    document.getElementById("tour-count").textContent = `${tourStep + 1} / ${tourSteps.length}`;
    document.getElementById("tour-heading").textContent = t("tour." + key);
    document.getElementById("tour-instruction").textContent = t("tour." + key + "Hint");
    document.getElementById("tour-back").hidden = tourStep === 0;
    document.getElementById("tour-next").textContent = t(tourStep + 1 === tourSteps.length ? "tour.done" : "tour.next");
    document.querySelector(".import-tour-target")?.classList.remove("import-tour-target");
    const target = selectors.split(", ").map(s => document.querySelector(s)).find(el => el?.getClientRects().length);
    target?.classList.add("import-tour-target");
    if (reveal && target && window.matchMedia("(max-width:900px)").matches)
      target.scrollIntoView({block:"center",behavior:"instant"});
  }
  function closeImportTour() {
    const restoreFocus = tourPanel.contains(document.activeElement);
    tourPanel.hidden = true;
    tourAutomatic = false;
    document.querySelector(".import-tour-target")?.classList.remove("import-tour-target");
    try { window.localStorage.setItem(tourStorageKey, "1"); } catch {}
    if (restoreFocus) document.getElementById("open-folder-button").focus({preventScroll:true});
  }
  function startImportTour(automatic) {
    if (automatic) {
      try { if (window.localStorage.getItem(tourStorageKey)) return; } catch {}
      if (!projectUI?.browserLocal || projectUI.active) return;
    }
    tourStep = 0; tourAutomatic = automatic; tourPanel.hidden = false;
    renderImportTour();
    if (!automatic) document.getElementById("tour-next").focus();
  }
  document.getElementById("tour-next").addEventListener("click", () => {
    if (tourStep + 1 === tourSteps.length) return closeImportTour();
    tourStep++; renderImportTour(true);
  });
  document.getElementById("tour-back").addEventListener("click", () => {
    if (tourStep > 0) { tourStep--; renderImportTour(true); }
    if (!tourStep) document.getElementById("tour-next").focus({preventScroll:true});
  });
  document.getElementById("tour-skip").addEventListener("click", closeImportTour);
  tourPanel.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.stopPropagation(); closeImportTour(); }
  });
  document.getElementById("tour-replay").addEventListener("click", () => {
    document.getElementById("workspace-settings").close();
    analysisTabs?.signals({focus:false});
    startImportTour(false);
  });

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
    let top = rectangle.top - height - gap;
    if (top < margin) top = rectangle.bottom + gap;
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  const helpTargets = 'button, summary, select[title], input[title], [data-help-key], [role="button"][title]';
  function hideContextHelp() {
    clearTimeout(helpTimer);
    const control = pendingHelpControl;
    if (!control) return;
    if (originalHelpTitle !== null && control.getAttribute("title") === "") control.title = originalHelpTitle;
    if (temporaryHelpName && control.getAttribute("aria-label") === originalHelpTitle) control.removeAttribute("aria-label");
    temporaryHelpName = false;
    const ids = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(id => id && id !== "context-tooltip");
    if (ids.length) control.setAttribute("aria-describedby", ids.join(" "));
    else control.removeAttribute("aria-describedby");
    elements.contextTooltip.hidden = true;
    // A dialog can replace its contents (and the tooltip) on the next render.
    if (elements.contextTooltip.parentElement !== document.body) document.body.append(elements.contextTooltip);
    activeHelpControl = pendingHelpControl = null;
    originalHelpTitle = null;
  }

  function showContextHelp(control, delay) {
    if (pendingHelpControl === control && (activeHelpControl || delay)) return;
    hideContextHelp();
    if (!control) return;
    const nativeTitle = control.getAttribute("title");
    const hint = control.dataset.helpKey ? t(control.dataset.helpKey) : nativeTitle || control.getAttribute("aria-label");
    if (!hint) return;
    pendingHelpControl = control;
    originalHelpTitle = nativeTitle;
    if (nativeTitle) {
      temporaryHelpName = !control.textContent.trim() && !control.hasAttribute("aria-label") && !control.hasAttribute("aria-labelledby");
      if (temporaryHelpName) control.setAttribute("aria-label", nativeTitle);
      control.title = "";
    }
    const show = () => {
      if (!control.isConnected || !control.getClientRects().length) {hideContextHelp();return;}
      activeHelpControl = control;
      const tip = elements.contextTooltip;
      (control.closest("dialog[open]") || document.body).append(tip);
      tip.textContent = hint;
      tip.hidden = false;
      const ids = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
      control.setAttribute("aria-describedby", [...new Set([...ids, tip.id])].join(" "));
      positionContextTooltip(control);
    };
    if (delay) helpTimer = setTimeout(show, delay);
    else show();
  }

  function applyLanguageSnapshot(next) {
    languageSnapshot = next;
    signalWorkspace.render();
    elements.languageSelect.value = next.language;
    i18nApi.translateDocument(document, next.language);
    renderImportTour();
    workspaceSettings.render();unitMarks.sync();analysisTabs?.language();
    localizeHelpControls();
    probeViewer.setTranslator?.(t);
    workspaceLayout.setTranslator?.(t);
    videoController?.setTranslator(t);
    annotationController?.render();
    eventAnalysis?.update();
    populationDynamics?.update();
    if (!elements.helpDrawer.hidden) renderHelpContent();
    hideContextHelp();
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
    if (context.preserveView) { annotationController?.update();return; }
    state.playbackNeuralTime = Number.isFinite(time) ? time : null;
    plotEntries().forEach((entry) => entry.manager.setPlaybackTime(state.playbackNeuralTime));
    if (state.playbackNeuralTime != null) {
      const current=state.experimentView.visibleRange, span=current.end-current.start, patch={cursorTime:time};
      if (context.follow && state.activeActivityOverview && span>0 && (time<current.start || time>=current.end)) {
        const start=Math.max(0,Math.min(state.activeActivityOverview.duration-span,time-span*.25));
        patch.visibleRange={start,end:start+span};
      }
      state.experimentView={...state.experimentView,...patch};
      signalWorkspace.setViewState(state.experimentView);
      elements.experimentTime.textContent=time.toFixed(3)+' s';
      annotationController?.update();
    }
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
    if(recordingChanged){
      if(projectUI?.browserLocal && projectUI.active)projectUI.recordingChanged(entry.recording);
      else videoController?.setRecording(entry.recording,state.databaseCatalog?.videos||[]);
    }
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

  function showToast(message, severity = "neutral") {
    const modal = document.querySelector("dialog[open]");
    const previous = document.querySelector(".dialog-toast");
    previous?.remove();
    const toast = elements.toast;
    const targets = [toast];
    if (modal) {
      const feedback = document.createElement("div");
      feedback.className = "toast dialog-toast";
      modal.append(feedback);
      targets.push(feedback);
    }
    for (const target of targets) {
      target.dataset.severity = severity;
      target.setAttribute("role", severity === "error" ? "alert" : "status");
      target.setAttribute("aria-live", severity === "error" ? "assertive" : "polite");
      target.textContent = message;
      target.classList.add("show");
    }
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove("show");
      document.querySelector(".dialog-toast")?.remove();
    }, severity === "error" ? 6500 : 3200);
  }

  let menuOrigin=null;
  function hideUnitContextMenu(restoreFocus=false) {
    if(elements.unitContextMenu.hidden)return;
    elements.unitContextMenu.hidden = true;
    state.contextUnit = null;
    if(restoreFocus===true && menuOrigin?.isConnected)menuOrigin.focus({preventScroll:true});
    menuOrigin=null;
    elements.unitContextMenu.querySelectorAll('[data-workspace-action],[data-mark-action]').forEach(button=>button.remove());
    delete elements.unitContextMenu.dataset.workspace;
  }

  function openUnitContextMenu(recording, clusterId, clientX, clientY) {
    if (!recording || !Number.isFinite(Number(clusterId))) return;
    hideUnitContextMenu();
    const key = viewKey(recording, clusterId);
    state.contextUnit = { recording, clusterId: Number(clusterId), key };
    elements.unitContextTitle.textContent = `${i18nApi.GLOSSARY.unit[languageSnapshot.language]} ${Number(clusterId)} · ${recording.name}`;
    const removeButton = elements.unitContextMenu.querySelector('[data-unit-action="remove"]');
    removeButton.disabled = !state.openUnits.has(key);
    unitMarks.appendActions(elements.unitContextMenu,unitMarks.ref(recording,clusterId),()=>hideUnitContextMenu(true));
    showContextAt(document.activeElement,clientX,clientY);
  }

  function showContextAt(origin,clientX,clientY) {
    menuOrigin=origin;
    elements.unitContextMenu.hidden = false;
    const width = elements.unitContextMenu.offsetWidth;
    const height = elements.unitContextMenu.offsetHeight;
    elements.unitContextMenu.style.left = `${Math.max(8, Math.min(Number(clientX) || 8, window.innerWidth - width - 8))}px`;
    elements.unitContextMenu.style.top = `${Math.max(8, Math.min(Number(clientY) || 8, window.innerHeight - height - 8))}px`;
    const first=[...elements.unitContextMenu.querySelectorAll("button:not(:disabled)")].find(button=>button.offsetWidth);
    first?.focus({preventScroll:true});
    hideContextHelp();
  }

  function openWorkspaceMenu(event, keyboard=false) {
    const target=event.target;
    if(event.defaultPrevented || target.closest('input,textarea,select,[contenteditable="true"]'))return;
    const markedUnit=unitMarks.targetRef(target);
    if(target.closest('dialog') || (markedUnit && !target.closest('#signal-workspace'))){
      if(markedUnit)unitMarks.popup(event,markedUnit);
      return;
    }
    const tab=target.closest('.recording-tab')?.querySelector('[data-recording-key]') || target.closest('[data-recording-key]');
    const row=target.closest('#signal-workspace [data-unit]');
    const signal=target.closest('#signal-workspace');
    const video=target.closest('#experiment-video-region,#video-sync-panel');
    let title,origin;
    const actions=[];
    const add=(key,label,run)=>actions.push({key,label,run});
    const fromControl=(id,key=id)=>{
      const control=document.getElementById(id);
      if(control && !control.hidden && !control.disabled)
        add(key,control.textContent.trim()||control.title,()=>control.click());
    };
    if(tab && projectUI.closeRecording) {
      const key=tab.dataset.recordingKey, record=state.recordings.find(r=>r.key===key);
      if(!record)return;
      title=record.name;origin=tab;
      add('close-recording',projectUI.importText('closeRecording'),()=>projectUI.closeRecording(key));
      if(projectUI.lastClosedRecording)add('restore-recording',projectUI.importText('restoreRecording')+' · '+projectUI.lastClosedRecording.name,()=>projectUI.undoCloseRecording());
    }else if(signal && signalWorkspace.data) {
      const unitId=row?Number(row.dataset.unit):null;
      origin=row?.querySelector('.sw-name')||signalWorkspace.viewport;
      title=row?'Unit '+unitId:t('workspace.activityTitle');
      if(row){
        const selected=signalWorkspace.selectedUnits().includes(unitId);
        add('compare',t(selected?'context.unselect':'context.compare'),()=>signalWorkspace.run(()=>signalWorkspace.choose(unitId,true)));
        add('inspect',t('workspace.inspectUnit'),()=>inspectUnit(unitId,origin));
      }
      if(state.experimentView.selectedInterval){
        const fit=signal.querySelector('[data-sw-fit]'), clear=signal.querySelector('[data-sw-clear]');
        add('fit',fit.textContent,()=>fit.click());
        add('clear',clear.getAttribute('aria-label'),()=>clear.click());
      }
      const home=signal.querySelector('[data-sw-tool="home"]');
      add('home',home.title,()=>home.click());
    }else if(video){
      origin=target.closest('#video-stage')||video;title=projectUI.importText('videoShort');
      if(videoController.source){
        fromControl('annotation-mark');fromControl('video-alignment');
        fromControl('expand-video');fromControl('replace-video');
      }else if(projectUI.browserLocal){
        add('add-video',projectUI.importText('addVideo'),()=>projectUI.action('video'));
      }
    }
    if(!actions.length){title=t('prefs.title');origin=target.closest('button,[tabindex]')||document.getElementById('settings-button');}
    if(annotationController.doc){
      add('save-annotations',t('prefs.saveLabels'),()=>annotationController.saveAnnotations({saveAs:false}));
      add('save-annotations-as',t('prefs.saveLabelsAs'),()=>annotationController.saveAnnotations({saveAs:true}));
    }
    if(projectUI.active)add('save-project',t('prefs.save'),()=>projectUI.action('save-project'));
    add('settings',t('prefs.title'),()=>workspaceSettings.open());
    event.preventDefault();hideUnitContextMenu();
    const menu=elements.unitContextMenu;
    const projectId=projectUI.active?.id,source=videoController.source;
    menu.dataset.workspace='true';
    elements.unitContextTitle.textContent=title;
    for(const {key,label,run} of actions){
      const button=document.createElement('button');
      button.type='button';button.setAttribute('role','menuitem');
      button.dataset.workspaceAction=key;button.textContent=label;
      button.onclick=async()=>{
        hideUnitContextMenu(true);
        if(projectUI.active?.id!==projectId || (video && videoController.source!==source))return;
        try{await run();}catch(error){showToast(error.message, "error");}
      };
      menu.append(button);
    }
    if(markedUnit)unitMarks.appendActions(menu,markedUnit,()=>hideUnitContextMenu(true));
    const bounds=origin.getBoundingClientRect();
    const atOrigin=keyboard || (!event.clientX&&!event.clientY);
    showContextAt(origin,atOrigin?bounds.left+8:event.clientX,atOrigin?bounds.bottom:event.clientY);
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
    elements.loadingView.hidden = target !== "loading";
    elements.explorerView.hidden = target === "loading";
    if (target === "explorer" && projectUI?.active && tourAutomatic) closeImportTour();
    projectUI?.renderEmptyWorkspace();
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
        ...(recording?.jointUnits?.has(id)?{probeName:catalog.probeName,sourceUnitId:catalog.unitId,sourceRecordingKey:catalog.recordingKey}:{}),
        count: Number(result.unitCounts?.[sourceIndex] || 0),
        rateHz: Number(result.unitRateHz?.[sourceIndex] || 0),
        x: nullableNumber(catalog?.x_um) ?? nullableNumber(result.unitX?.[sourceIndex]),
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
    analysisTabs?.prune(analysisProject());
    if(patterns?.input && patterns.project!==analysisProject())patterns.invalidate(null);
    const r=state.activeRecording, sources=projectUI?.active?.recordingSources;
    const session=r && sources?.[r.key]?.session;
    const eventOwner=r?.eventsFile || !session ? r : state.recordings.find(other=>other.eventsFile && sources[other.key]?.session===session) || r;
    behaviorLabels?.update(r, Boolean(videoController?.source),eventOwner);
    eventAnalysis?.update();
    populationDynamics?.update();
    const selectedReview = state.activeRecording && state.experimentView.selectedUnitId != null
      ? state.openUnits.get(viewKey(state.activeRecording, state.experimentView.selectedUnitId))?.result : null;
    miniProbe?.update(state.activeActivityOverview, state.experimentView, state.activeRecording, selectedReview,projectUI?.active?.id??state.datasetToken,state.regionResult?.probeTrack);
    projectUI?.syncVideo();
    annotationController?.update();
    videoEvents?.update();
    const recording = state.activeRecording;
    if (!recording) {
      elements.experimentRecordingName.textContent = "—";
      elements.experimentFacts.replaceChildren();
      elements.experimentTime.textContent = "0.000 s";
      projectUI?.renderEmptyWorkspace();
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
      ["DURATION", `${(recording.duration ?? overview?.duration)?.toFixed(1) ?? "—"} s`],
      ["ANATOMY", mapped ? `${mapped} mapped · ${shanks.size || "—"} shanks` : t("units.unmapped")],
      ["VIDEO", video ? t(`video.method.${videoController.mapping.method === "unmapped" ? "unknown" : videoController.mapping.method}`) : "NOT ATTACHED"]
    ];
    elements.experimentFacts.innerHTML = facts.map(([label, value]) => `<span>${escapeHtml(label)}<strong>${escapeHtml(value)}</strong></span>`).join("");
    elements.experimentTime.textContent = `${Number(state.experimentView.cursorTime || 0).toFixed(3)} s`;
    elements.inspectUnitButton.disabled = state.experimentView.selectedUnitId == null;
  }

  function renderActivityStatus() {
    if(state.activeRecording?.missingInputs?.length){renderPartialRecording(state.activeRecording);return;}
    const overview = state.activeActivityOverview;
    if (overview) elements.activityStatus.textContent = overview.units.length + ' Units';
  }

  function renderPartialRecording(recording) {
    const missing=recording.missingInputs;
    elements.activityStatus.textContent=t("partial.status",{n:recording.fileCount});
    elements.activityEmpty.hidden=true;
    const plot=document.getElementById("signal-workspace");
    let panel=document.getElementById("partial-signal-preview");
    if(!panel){
      panel=document.createElement("section");panel.id="partial-signal-preview";panel.className="partial-signal-preview";
      plot.after(panel);
    }
    const fileRoles={"spike_times.npy":"partial.times","spike_clusters.npy":"partial.units","params.py":"partial.rate"};
    const hints=missing.map(name=>`<li><code>${escapeHtml(name)}</code> · ${escapeHtml(t(fileRoles[name]))}</li>`).join("");
    const labels=recording.clusterLabels.filter(unit=>unit.quality!=="unknown");
    const sampleRate=recording.sampleRate && !recording.timesInSeconds ? ` · ${number(recording.sampleRate)} Hz` : "";
    const knownHeader=recording.spikeCount==null?recording.name:t("partial.rowCount",{n:number(recording.spikeCount)});
    const extraFiles=recording.files.filter(file=>!core.REQUIRED.includes(core.fileNameOf(file)));
    const previewLength=128, lastStart=Math.max(0,(recording.spikeCount||0)-previewLength);
    panel.innerHTML=`<header><strong>${escapeHtml(knownHeader+sampleRate)}</strong></header>
      <div class="file-drop-slot" data-import-drop="neural" data-import-files="${escapeHtml(missing.join(" "))}" data-import-recording-key="${escapeHtml(recording.key)}" data-severity="warning"><strong>${escapeHtml(t("drop.neuralMissing"))}</strong><ul>${hints}</ul></div>
      ${missing.includes("params.py")?`<form><label>${escapeHtml(t("partial.enterRate"))} <input type="number" min="0.000001" step="any" required></label> <button type="submit">${escapeHtml(t("partial.apply"))}</button></form>`:""}
      <div data-partial-rows></div>${lastStart?`<label class="partial-row-picker"><span>${escapeHtml(t("partial.browse"))}</span><input data-first-row type="number" min="1" max="${lastStart+1}" value="1" step="1"><input type="range" min="0" max="${lastStart}" value="0" aria-label="${escapeHtml(t("partial.browse"))}"></label>`:""}
      ${labels.length?`<p>${escapeHtml(t("partial.labels",{n:number(labels.length)}))} · ${escapeHtml(labels.slice(0,8).map(u=>'Unit '+u.id+' ('+u.quality+')').join(', '))}</p>`:""}
      ${extraFiles.map((f,i)=>`<details data-preview-file="${i}" ${i===0&&recording.spikeCount==null?'open':''}><summary>${escapeHtml(f.name)}</summary><pre></pre></details>`).join("")}`;
    const rowsNode=panel.querySelector("[data-partial-rows]"), slider=panel.querySelector('input[type="range"]');
    for(const item of panel.querySelectorAll('[data-preview-file]'))item.ontoggle=async()=>{
      const pre=item.querySelector('pre');
      if(!item.open||pre.textContent)return;
      try{pre.textContent=await core.previewKilosortFile(extraFiles[Number(item.dataset.previewFile)]);}
      catch(error){pre.textContent=error.message;}
    };
    let drawToken=0;
    async function draw() {
      const token=++drawToken,start=Number(slider?.value||0);
      try {
        const {samples,ids,count}=await core.readSpikeRows(recording,start,previewLength);
        if(!rowsNode.isConnected||token!==drawToken||!count)return;
        const xs=samples||Array.from({length:count},(_,i)=>start+i+1);
        const min=Math.min(...xs),max=Math.max(...xs),unitIds=ids?[...new Set(ids)].sort((a,b)=>a-b):[null];
        const rowById=new Map(unitIds.map((id,i)=>[id,i]));
        const baseline=i=>16+16*i, width=640, left=95, height=25+16*unitIds.length;
        const marks=xs.map((x,i)=>{
          const px=left+(max===min?0:(x-min)/(max-min))*(width-left-8),y=baseline(rowById.get(ids?ids[i]:null));
          return 'M'+px.toFixed(2)+' '+(y-7)+'v9';
        }).join(" ");
        const axis=!samples?t("partial.ordinal"):recording.sampleRate?"s":t("partial.sample");
        const format=x=>samples&&recording.sampleRate?(x/recording.sampleRate).toFixed(4):number(x);
        rowsNode.innerHTML=`<p>${escapeHtml(t("partial.rows",{a:number(start+1),b:number(start+count)}))} · ${escapeHtml(format(min))}–${escapeHtml(format(max))} ${escapeHtml(axis)}</p>
          <div class="partial-raster"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(t("partial.rows",{a:number(start+1),b:number(start+count)}))}">${unitIds.map((id,i)=>`<text x="0" y="${baseline(i)}">${id==null?'Spikes':'Unit '+Number(id)}</text>`).join("")}<path d="${marks}"/></svg></div>`;
      }catch(error){if(rowsNode.isConnected&&token===drawToken)rowsNode.textContent=error.message;}
    }
    if(recording.spikeCount)draw();
    if(slider){
      const firstRow=panel.querySelector('[data-first-row]');
      slider.oninput=()=>{firstRow.value=String(Number(slider.value)+1);draw();};
      firstRow.onchange=()=>{
        if(!firstRow.value || !firstRow.validity.valid){firstRow.value=String(Number(slider.value)+1);return;}
        slider.value=String(firstRow.valueAsNumber-1);draw();
      };
    }
    const form=panel.querySelector("form");
    if(form)form.onsubmit=async event=>{
      event.preventDefault();
      const rate=form.querySelector("input").valueAsNumber;
      if(!Number.isFinite(rate)||rate<=0)return;
      const file=new File(["# Sampling rate entered in Explorer (Hz)\nsample_rate = "+rate+"\n"],"params.py");
      if(recording.key!==".")Object.defineProperty(file,"relativePath",{value:recording.key+"/params.py"});
      try{await projectUI.importNeuralFiles([file]);}catch(error){showToast(error.message, "error");}
    };
  }

  function setExperimentView(patch, { seekVideo = false, historyRestore = false } = {}) {
    if (historyRestore) videoController?.pause();
    state.experimentView = { ...state.experimentView, ...(patch || {}) };
    signalWorkspace.setViewState(state.experimentView);
    if (seekVideo && Number.isFinite(patch?.cursorTime)) videoController?.seekNeural(patch.cursorTime,{preserveView:historyRestore});
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
      ? matches.map((unit) => `<button class="find-unit-result" type="button" role="option" data-find-unit-id="${Number(unit.id)}"><span><strong ${unitMarks.attrs(state.activeRecording,unit.id)}>${escapeHtml(i18nApi.GLOSSARY.unit[languageSnapshot.language])} ${Number(unit.id)}</strong><small>${escapeHtml([unit.shankId != null && Number.isFinite(Number(unit.shankId)) ? `Shank ${Number(unit.shankId) + 1}` : "Shank —", unit.depthUm == null ? "depth —" : `${Math.round(unit.depthUm)} µm`, unit.region || t("units.unmapped"), unit.quality].join(" · "))}</small></span><b>${Number(unit.rateHz || 0).toFixed(Number(unit.rateHz || 0) < 10 ? 2 : 1)} Hz</b></button>`).join("")
      : `<div class="find-unit-empty">${escapeHtml(t("units.none"))}</div>`;
  }

  function setFindUnitOpen(open) {
    if(open && state.activeRecording?.missingInputs?.length){
      showToast(projectUI.importText("missingFiles")+state.activeRecording.missingInputs.join(", "), "warning");
      return;
    }
    const next = Boolean(open);
    elements.findUnitPopover.hidden = !next;
    elements.findUnitButton.setAttribute("aria-expanded", String(next));
    if (next) {
      renderFindUnitResults();
      requestAnimationFrame(() => elements.findUnitInput.focus({ preventScroll: true }));
    }
  }

  function selectActivityUnit(unitId, {reveal = true} = {}) {
    if (!state.activeRecording) return;
    const units = state.activeActivityOverview?.units;
    if (unitId === null) {
      const view = state.experimentView;
      const previous = units?.find(unit => Number(unit.id) === view.selectedUnitId);
      signalWorkspace.checkpoint();
      setExperimentView({selectedUnitId:null, expandedUnitId:null,
        selectedShank:previous && view.selectedShank === previous.shankId ? null : view.selectedShank,
        selectedRegion:previous && view.selectedRegion === (previous.region || t("units.unmapped")) ? null : view.selectedRegion});
      return;
    }
    const normalized = Number(unitId);
    const unit = units?.find(item => Number(item.id) === normalized);
    if (!unit) return;
    signalWorkspace.checkpoint();
    setFindUnitOpen(false);
    if (reveal) signalWorkspace.focusUnit(normalized);
    setExperimentView({
      selectedUnitId: normalized,
      expandedUnitId: null,
      selectedGroupKey: null,
      groupFocusPath: [],
      selectedShank: unit.shankId,
      selectedRegion: unit.region || t("units.unmapped")
    });
  }

  async function refreshExperimentWorkspace(recording) {
    const token = ++state.overviewToken;
    state.overviewAbortController?.abort();
    state.overviewAbortController = new AbortController();
    state.activeActivityOverview = null;
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
    signalWorkspace.setData(null);
    elements.activityEmpty.hidden = false;
    renderExperimentHeader();
    document.getElementById("partial-signal-preview")?.remove();
    if(recording?.missingInputs?.length){
      renderPartialRecording(recording);
      return;
    }
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
      elements.activityEmpty.hidden = Boolean(overview.units.length);
      const recordingKey=JSON.stringify([projectUI?.active?.id ?? state.datasetToken,recording.key,recording.dataVersion||0]);
      if (!signalWorkspace.setData(overview,{recordingKey})) signalWorkspace.setViewState(state.experimentView);
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
      signal?.throwIfAborted();
      if (message.type==="signal-window") return {rows:core.signalWindow(core.signalIndex(buffers), message.sampleRate, message.unitIds, message.start, message.end)};
      if (message.type === "interval-activity") return core.intervalActivityBuffers(buffers, message.sampleRate, message.start, message.end, message.duration);
      if (message.type === "activity-overview") {
        onProgress?.({ phase: "reading", progress: 18, status: "running" });
        const pyramid = core.buildActivityPyramidBuffers(buffers, message.sampleRate, message.sourceFingerprint, message.silentUnitIds);
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
      const abort = () => {
        if (message.type!=="signal-window") { terminateWorker(); return; }
        state.pending.delete(requestId);
        reject(new DOMException("Signal window changed","AbortError"));
      };
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

  const signalCoverage = new WeakMap();
  const databaseTrains = new WeakMap();
  async function loadSignalWindow({unitIds,start,end,signal},recording=state.activeRecording) {
    let rows;
    if (state.dataMode==='database') {
      if (!databaseTrains.has(recording)) databaseTrains.set(recording,new Map());
      const cache=databaseTrains.get(recording), lower=window.NeuropixelsEventAnalysis.lowerBound;
      rows=await Promise.all(unitIds.map(async id=>{
        if (!cache.has(id)) cache.set(id,databaseClient.loadUnitReview(recording,id).then(review=>review.spikeTimes)
          .catch(error=>{cache.delete(id);throw error;}));
        const train=await cache.get(id);
        return [id,train.subarray(lower(train,start),lower(train,end))];
      }));
    } else {
      const result=await requestWorker({type:'signal-window',
        experimentKey:`${state.datasetToken}:${recording.key}:${Number(recording.dataVersion||0)}`,
        files:{spikeTimes:recording.spikeTimesFile,spikeClusters:recording.spikeClustersFile},
        sampleRate:recording.sampleRate,unitIds,start,end},{signal});
      rows=result.rows;
    }
    signal?.throwIfAborted();
    const result=new Map(rows), file=recording.coverageFile;
    if (file) {
      if (!signalCoverage.has(file)) signalCoverage.set(file,file.text().then(text=>JSON.parse(text)));
      const coverage=await signalCoverage.get(file);
      result.coverage=new Map();
      for (const id of unitIds) {
        const {intervals}=window.NeuropixelsEventAnalysis.commonCoverage(coverage,[id],recording.key,{allowMissing:true});
        if (intervals) result.coverage.set(id,intervals);
      }
    }
    return result;
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

  function recordingAnalysisUnits() {
    // A source-declared Unit with no spikes is still an analysis column. The
    // activity overview may omit it, so never use activity as the Unit catalog.
    const byId = new Map(recordingUnits(state.activeRecording).map(unit => [unit.id, unit]));
    for (const unit of state.activeActivityOverview?.units || []) {
      byId.set(unit.id, { ...byId.get(unit.id), ...unit });
    }
    return [...byId.values()];
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
            <span class="unit-row-title"><i class="quality-dot ${qualityTone(unit.quality)}"></i><strong ${unitMarks.attrs(state.activeRecording,unit.id)}>${escapeHtml(i18nApi.GLOSSARY.unit[languageSnapshot.language])} ${unit.id}</strong></span>
            <small>${escapeHtml(unit.quality)} · ${escapeHtml(region)}</small>
          </span>
          <span class="unit-row-metrics"><strong>${loading ? escapeHtml(t("units.loading")) : rate}</strong><span>${spikes} ${escapeHtml(i18nApi.GLOSSARY.spike[languageSnapshot.language])}${open ? ` · ${escapeHtml(t("units.open"))}` : ""}</span></span>
        </button>
      </div>`;
    }).join("");
  }

  function renderRecordings() {
    const closeable = Boolean(projectUI?.browserLocal && projectUI.active);
    const strip=elements.recordingStrip,restoreFocus=strip.contains(document.activeElement);
    strip.replaceChildren(...state.recordings.map((recording,index)=>{
      const active=recording===state.activeRecording;
      const {wrapper,button,close}=window.NeuropixelsWorkspaceTabs.create({
        active,title:recording.name+" · "+t("units.countMeta",{count:number(recording.clusterLabels.length),duration:recording.duration?.toFixed(1)??"—"}),
        onSelect:()=>{if(analysisTabs.active)analysisTabs.signals({focus:false});if(recording!==state.activeRecording)selectRecording(recording);},
        closeLabel:closeable?projectUI.importText('closeRecording')+' · '+recording.name:'',
        onClose:closeable?()=>projectUI.closeRecording(recording.key).catch(error=>projectUI.failure(error)):null
      });
      button.dataset.recordingKey=recording.key;if(active)button.dataset.analysisSignal='';
      if(close)close.dataset.closeRecording=recording.key;
      const order=document.createElement('strong'),name=document.createElement('span');order.textContent=index+1;name.textContent=recording.name;
      button.replaceChildren(order,name);return wrapper;
    }));
    if(jointInputs().length>1){
      const current=Boolean(state.activeRecording?.jointSources);
      const {wrapper,button}=window.NeuropixelsWorkspaceTabs.create({label:t('joint.title'),title:t('joint.hint'),active:current,
        onSelect:()=>{if(analysisTabs.active)analysisTabs.signals({focus:false});activateJointRecording().catch(e=>showToast(e.message,'error'));}});
      button.dataset.jointRecording='';if(current)button.dataset.analysisSignal='';strip.append(wrapper);
    }
    analysisTabs?.sync();
    if(restoreFocus)strip.querySelector('.recording-button.active')?.focus({preventScroll:true});
    requestAnimationFrame(() => {
      updateRecordingScrollControls();
      window.NeuropixelsWorkspaceTabs.reveal(strip.querySelector(".recording-button.active"));
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
          const silentUnitIds = (recording.units || []).filter(u => u.spike_count === 0).map(u => u.cluster_id);
          return requestWorker({
          type: "activity-overview",
          experimentKey: cacheKey,
          files,
          sampleRate: recording.sampleRate,
          binCount: level,
          silentUnitIds,
          sourceFingerprint: core.activityFileFingerprint(files, recording.sampleRate, recording.dataVersion) + (silentUnitIds.length ? ":" + silentUnitIds.join(",") : "")
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
    const carousel=elements.recordingStrip.parentElement;
    // Measure the space available *without* the two scroll buttons.
    const overflow=elements.recordingStrip.scrollWidth>carousel.clientWidth+1;
    carousel.classList.toggle('fits',!overflow);
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
          ? `<div class="missing-file-list">${item.missingRecordings.flatMap((recording) => recording.files.map((file) => {
              const nwb = recordingForSupplement(recording.recordingKey)?.fromNwb;
              if (nwb && ["quality","amplitude","position","template","probeGrouping"].includes(item.key)) return "";
              return `<div class="missing-file-row file-drop-slot" data-import-drop="neural" data-import-recording-key="${escapeHtml(recording.recordingKey)}" data-import-files="${escapeHtml(file.filename.split(" / ").join(" "))}">
                <div><strong>${escapeHtml(recording.recordingName)}</strong><span>${escapeHtml(t("drop.filesHere",{files:file.filename}))}</span></div>
                <div class="missing-file-actions">
                  <button type="button" data-supplement-kind="files" data-recording-key="${escapeHtml(recording.recordingKey)}" data-ingest-roles="${escapeHtml(file.roles.join(","))}" ${state.supplementBusy ? "disabled" : ""}>${escapeHtml(t("status.addFiles"))}</button>
                  <button type="button" data-supplement-kind="folder" data-recording-key="${escapeHtml(recording.recordingKey)}" data-ingest-roles="${escapeHtml(file.roles.join(","))}" ${state.supplementBusy ? "disabled" : ""}>${escapeHtml(t("status.addFolder"))}</button>
                </div>
              </div>`;})).join("")}</div>`
          : "";
        const table={probeTrack:"trackDirect",unitRegions:"direct"}[item.key];
        const tableSlot=table && item.state==="not-provided" && projectUI?.browserLocal && state.recordings.length
          ? `<span class="file-drop-slot" data-import-drop="neural" data-import-table="${table}">${escapeHtml(t("drop.filesHere",{files:t("drop."+table)}))}</span>` : "";
        return `<div class="data-status-item ${escapeHtml(item.state)}"><div><strong>${escapeHtml(localized.label)}</strong><span>${escapeHtml(localized.detail)}</span>${supplementRows}${tableSlot}</div></div>`;
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
    document.getElementById("probe-track-drop").hidden=!(projectUI?.browserLocal && state.recordings.length && !state.regionResult?.probeTrack?.valid);
    elements.dataStatusSummary.textContent = t("status.summaryCounts", status.counts) + (status.counts.invalid ? t("status.summaryInvalid", status.counts) : "");
    elements.dataStatusContext.textContent = t("status.recordingContext", { dataset: state.rootName || t("status.loadedDataset"), count: state.recordings.length });
    elements.dataStatusButton.classList.toggle("is-ready", state.recordings.length > 0 && !status.counts.missing && !status.counts.invalid);
    elements.dataStatusButton.classList.toggle("has-missing", state.recordings.length > 0 && status.counts.missing > 0);
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
    for(const el of [elements.detailsFocusLabel,elements.reviewTitle])delete el.dataset.markRef;
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
    unitMarks.bind(elements.detailsFocusLabel,recording,clusterId);
    elements.detailsFocusLabel.textContent = `${i18nApi.GLOSSARY.unit[languageSnapshot.language]} ${clusterId} · ${recording.name}`;
    unitMarks.bind(elements.reviewTitle,recording,clusterId);
    elements.reviewTitle.textContent = `${i18nApi.GLOSSARY.unit[languageSnapshot.language]} ${clusterId}`;
    elements.reviewSubtitle.textContent = [recording.name, label.quality, region?.region || t("review.regionUnmapped"), t("review.recordingDuration", { duration: (recording.duration?.toFixed(2) ?? "—") })].join(" · ");
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
        <div class="trace-identity"><i></i><strong ${unitMarks.attrs(recording,clusterId)}>${escapeHtml(unitTerm)} ${Number(clusterId)}</strong><span>${escapeHtml(recording.name)} · ${escapeHtml(label.quality)} · ${escapeHtml(region)} · ${number(result.spikeCount)} ${escapeHtml(spikeTerm)}</span></div>
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
    if(recording?.missingInputs?.length)return showToast(projectUI.importText("missingFiles")+recording.missingInputs.join(", "), "warning");
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
      showToast(t("toast.couldNotAdd", { id: clusterId, error: error.message }), "error");
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
    unitMarks.bind(elements.primaryTraceTitle,recording,clusterId);
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
    if(recording?.missingInputs?.length)return showToast(projectUI.importText("missingFiles")+recording.missingInputs.join(", "), "warning");
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
    unitMarks.bind(elements.reviewTitle,recording,clusterId);
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
      showToast(t("toast.couldNotRead", { id: clusterId, error: error.message }), "error");
    }
  }

  function selectRecording(recording) {
    if (!recording) return;
    hideUnitContextMenu();
    if (state.activeActivityOverview) signalWorkspace.setData(null);
    state.selectionToken += 1;
    clearOpenUnitViews({ render: false });
    state.activeRecording = recording;
    state.search = "";
    elements.unitSearch.value = "";
    elements.reviewLayout.hidden = true;
    renderRecordings();
    renderUnitList();
    if(!projectUI?.browserLocal || !projectUI.active)videoController?.setRecording(recording, projectUI?.active ? [] : state.databaseCatalog?.videos || []);
    projectUI?.recordingChanged(recording);
    return refreshExperimentWorkspace(recording);
  }

  function jointInputs(anchor=state.activeRecording){
    if(state.dataMode==='database')return [];
    const available=state.recordings.filter(r=>r.spikeTimesFile && r.spikeClustersFile && r.sampleRate>0);
    const current=anchor?.sourceSession;
    return available.filter(r=>!current || !r.sourceSession || String(r.sourceSession)===String(current));
  }
  async function revealAnalysisUnit(recording,id){
    if(!recording)return false;
    const ref=id==null?null:window.NeuropixelsJointRecording.originalUnit(recording,id);
    const byKey=key=>state.recordings.find(r=>r.key===key);
    const target=ref?byKey(ref.recordingKey):recording.jointSources?
      (recording.jointSources.every(byKey)?recording:null):byKey(recording.key);
    if(!target){showToast(t('joint.restoreProbe'),'error');return false;}
    if(target!==state.activeRecording)await selectRecording(target);
    if(target!==state.activeRecording)return false;
    if(id!=null)selectActivityUnit(ref?ref.unitId:id);
    return true;
  }
  function releaseJointRecording(){
    state.jointCache?.stop.abort();
    state.jointCache=null;
  }
  async function activateJointRecording(){
    const r=await getJointRecording(jointInputs());
    if(r && state.activeRecording!==r)await selectRecording(r);
    return r;
  }
  async function probeAnalysisUnits(r,signal){
    const raw=await loadRecordingActivityOverview(r,512,{signal});
    const catalog=new Map((r.units||[]).map(row=>[Number(row.cluster_id),row]));
    const units=normalizeActivityOverview(raw,r).units, present=new Set(units.map(u=>u.id));
    for(const u of recordingUnits(r))if(!present.has(u.id)){
      const row=catalog.get(u.id);
      units.push({...u,x:row?.x_um,depthUm:row?.probe_depth_um,region:row?.brain_region,
        regionColor:row?.atlas_color_hex,shankId:row?.shank_id});
    }
    return units;
  }
  async function getJointRecording(inputs){
    const joint=window.NeuropixelsJointRecording,token=state.datasetToken;
    if(inputs.length<2)return null;
    const versions=inputs.map(r=>Number(r.dataVersion||0)),cached=state.jointCache;
    if(cached && cached.token===token && cached.inputs.length===inputs.length && inputs.every((r,i)=>r===cached.inputs[i] && versions[i]===cached.versions[i])){
      return cached.ready;
    }
    const sessions=inputs.map(r=>r.sourceSession),known=new Set(sessions.filter(Boolean).map(String));
    if(known.size>1)throw Error(t('joint.sessions'));
    if(sessions.some(s=>!s) && !window.confirm(t('joint.confirm')+'\n'+inputs.map(r=>r.name).join(', ')))return null;
    const stop=new AbortController(),dialog=document.createElement('dialog');dialog.className='project-dialog';
    const heading=document.createElement('h2'),status=document.createElement('p'),cancel=document.createElement('button');
    heading.textContent=t('joint.title');status.textContent=inputs.map(r=>r.name).join(' + ');status.setAttribute('role','status');
    cancel.textContent=t('joint.cancel');cancel.type='button';cancel.onclick=()=>dialog.close();dialog.append(heading,status,cancel);
    dialog.addEventListener('close',()=>stop.abort(),{once:true});document.body.append(dialog);dialog.showModal();
    const ready=(async()=>{
      const sources=[];
      for(const r of inputs){
        const units=await probeAnalysisUnits(r,stop.signal);
        const name=projectUI?.active?.recordingSources?.[r.key]?.probe||r.name;
        sources.push({recording:r,units,probeName:name});
      }
      const r=await joint.makeRecording(sources,t('joint.title'),stop.signal,(n,total)=>{status.textContent=t('joint.sort')+' '+Math.round(100*n/total)+'%';});
      if(stop.signal.aborted || token!==state.datasetToken || !inputs.every(item=>state.recordings.includes(item)))throw new DOMException('Cancelled','AbortError');
      r.sourceSession=known.size===1?[...known][0]:null;
      return r;
    })();
    state.jointCache={token,inputs,versions,ready,stop};
    try {return await ready;}catch(e){if(state.jointCache?.ready===ready)state.jointCache=null;if(e.name!=='AbortError')throw e;return null;}
    finally{dialog.close();dialog.remove();}
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
          ${state.activeRecording && !state.activeRecording.jointSources ? `<div class="detail-item"><span>recordingId</span><strong class="recording-id-value">${escapeHtml(state.activeRecording.key)}</strong></div>` : ""}
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
          ${state.recordings.map((recording) => `<tr><td>${escapeHtml(recording.name)}</td><td>${number(recording.clusterLabels.length)}</td><td>${number(recording.spikeCount)}</td><td>${(recording.duration?.toFixed(2) ?? "—")} s</td><td>${core.formatBytes(recording.totalBytes)}</td></tr>`).join("")}
        </tbody></table>
        ${state.errors.length ? `<p class="details-note">${escapeHtml(t("dialog.unreadable", { count: state.errors.length }))} ${escapeHtml(state.errors.join(" | "))}</p>` : ""}
      </section>
      <section class="details-section">
        <h2>${escapeHtml(t("dialog.rawVoltage"))}</h2>
        <p class="details-note">${escapeHtml(t("dialog.rawVoltageNote"))}</p>
      </section>`;
  }

  async function updateRecordingTabs(records,files,focusKey) {
    if(state.jointCache?.inputs.some(r=>!records.includes(r)))releaseJointRecording();
    if(!records.length){
      await clearNeuralWorkspace();
      projectUI.recordingChanged(null);
    }else{
      const previous=state.files;
      state.files=files;
      state.recordings=records;
      const regionFiles=list=>list.filter(f=>/\.csv$/i.test(f.name)).map(core.pathOf).sort();
      if(JSON.stringify(regionFiles(previous))!==JSON.stringify(regionFiles(files)))
        state.regionResult=await regionCore.scanFiles(files);
      const next=records.find(r=>r.key===focusKey)||records[0];
      if(next!==state.activeRecording)selectRecording(next);
      else renderRecordings();
      elements.dataDetails.disabled=false;
      renderSummary();
      renderDialog();
      projectUI.render();
    }
    // Replacing the strip removes the activated × from the DOM.
    if(document.activeElement===document.body)
      (elements.recordingStrip.querySelector(".active") || document.getElementById("open-folder-button")).focus({preventScroll:true});
  }

  async function clearNeuralWorkspace() {
    hideUnitContextMenu();
    document.getElementById("partial-signal-preview")?.remove();
    releaseJointRecording();
    state.datasetToken += 1;
    state.selectionToken += 1;
    state.overviewToken += 1;
    state.overviewAbortController?.abort();
    Object.assign(state,{dataMode:"folder",databaseCatalog:null,files:[],recordings:[],errors:[],regionResult:null,
      activeRecording:null,activeActivityOverview:null,pendingVideoCursorTime:null,playbackNeuralTime:null});
    clearOpenUnitViews({render:false});
    signalWorkspace.setData(null);
    renderSummary();
    renderRecordings();
    renderUnitList();
    elements.dataDetails.disabled=true;
    showOnly("explorer");
    renderExperimentHeader();
    await clearWorker();
  }

  async function openFiles(files, {partial=false,recordingKeys,focusKey,indexedRecordings}={}) {
    const selectedFiles = [...files].filter((file) => file && !String(file.name || "").startsWith("."));
    if (!selectedFiles.length) {
      showToast(t("toast.noReadableFiles"), "error");
      return;
    }
    releaseJointRecording();
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

    const groups = core.groupExperimentFiles(selectedFiles,{partial}).filter(g=>!recordingKeys||recordingKeys.includes(g.key));
    if (!groups.length) {
      showOnly("explorer");
      showToast(t("loading.noRequiredFiles"), "error");
      return;
    }

    elements.loadingMessage.textContent = t("loading.checkCandidates", { count: groups.length });
    elements.loadingProgress.style.width = "34%";
    let completed = 0;
    const indexedPromise = Promise.allSettled(groups.map(async (group) => {
      try {
        const recording = indexedRecordings?.get(group.key) || await core.indexExperiment(group,{partial});
        if(partial && group.key==='.')recording.name="Kilosort";
        const project=projectUI?.active;
        const source=project?.recordingSources?.[group.key] ?? (project?.recordingIds?.length===1 ? project : null);
        recording.fromNwb=!!source?.sourceNwb;
        const metadata = group.byName.get("explorer-units.json");
        if (metadata) {
          const info = JSON.parse(await metadata.text());
          recording.units = info.units; recording.sourceSession = info.session;
          if(/^(?:Allen )?NWB\b/.test(info.source || "")){
            recording.fromNwb=true;
            recording.timesInSeconds=info.timestampUnit==="seconds";
            if(info.source==="NWB")recording.name=[info.session,info.probe].filter(Boolean).join(" · ");
            if(!recording.clusterLabels.length)recording.clusterLabels=(info.units||[]).map(u=>({id:u.cluster_id,quality:"unknown"}));
          }
        }
        return recording;
      }
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
      showOnly("explorer");
      showToast(t("loading.nonePassed"), "error");
      return;
    }

    elements.loadingProgress.style.width = "100%";
    elements.loadingTitle.textContent = t("loading.folderReady");
    elements.loadingMessage.textContent = t("loading.recordingsDetected", { count: state.recordings.length });
    renderSummary();
    renderDialog();
    elements.dataDetails.disabled = false;
    showOnly("explorer");
    selectRecording(state.recordings.find(r=>r.key===focusKey)||state.recordings[0]);
    showToast(t("toast.recordingsReady", { count: state.recordings.length }));
  }

  async function openDatabaseCatalog(recordingIds = null) {
    releaseJointRecording();
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

  async function walkDroppedItem(item, parent = "") {
    const path = parent ? `${parent}/${item.name}` : item.name;
    if (item.kind === "file" || item.isFile) {
      const file = item.getFile ? await item.getFile() : await new Promise((resolve, reject) => item.file(resolve, reject));
      if(item.getFile && window.NeuropixelsVideoSync.VIDEO_EXTENSIONS.test(file.name))Object.defineProperty(file,"sourceHandle",{value:item});
      return [attachRelativePath(file, path)];
    }
    const children = item.createReader ? await readDirectoryEntries(item.createReader()) : [];
    if (item.kind === "directory") for await (const child of item.values()) children.push(child);
    return (await Promise.all(children.map(child => walkDroppedItem(child,path)))).flat();
  }

  async function filesFromDrop(dataTransfer) {
    // Chromium revokes drag-store access after this event returns. Capture every
    // entry or File now, including plain files mixed with directory entries.
    const items = [...(dataTransfer.items || [])].filter(item => item.kind === "file");
    if (!items.length) return [...dataTransfer.files];
    const lists = items.map(async item => {
      const handlePromise = item.getAsFileSystemHandle?.();
      const entry = item.webkitGetAsEntry?.();
      const file = item.getAsFile();
      // file:// Chromium cannot read some legacy directory-entry URLs. Native
      // handles preserve the dropped directory's name on both file: and https:.
      const handle = await handlePromise?.catch(() => null);
      if (handle || entry?.isDirectory) return walkDroppedItem(handle || entry);
      if (file) return [file];
      if (entry) return walkDroppedItem(entry);
      throw new Error(t("drop.unreadable"));
    });
    return (await Promise.all(lists)).flat();
  }

  function recordingForSupplement(key) {
    return state.recordings.find((recording) => String(recording.databaseId || recording.key) === String(key)) || null;
  }

  function openSupplementPicker(button) {
    if (state.supplementBusy) return;
    const recording = recordingForSupplement(button.dataset.recordingKey);
    const roles = String(button.dataset.ingestRoles || "").split(",").filter(Boolean);
    if (!recording || !roles.length) {
      showToast(t("toast.supplementTargetMissing"), "warning");
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
    if (projectUI.browserLocal) {
      const matching = selected.filter(file => pending.roles.includes(core.roleForFile(file)));
      if (!matching.length || (pending.kind !== "folder" && matching.length !== selected.length)) throw new Error(t("toast.noMatchingSupplement"));
      return projectUI.importNeuralFiles(matching, recording.key);
    }
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
      showToast(t("toast.supplementFailed", { error: error.message }), "error");
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

  elements.themeSelect.value = themeSnapshot.preference;
  const workspaceSettings=window.installExplorerSettings({t,
    videoLabels:()=>({key:annotationController.key,names:Object.keys(annotationController.doc?.labelColors||{})}),
    ready:scope=>scope==='signal'?Boolean(signalWorkspace.data):scope==='video'?Boolean(videoController.source):Boolean(projectUI.active),
    actions:{signalLeft:()=>signalWorkspace.panByFraction(-.1),signalRight:()=>signalWorkspace.panByFraction(.1),
      videoBack:()=>videoController.stepFrames(-5),videoForward:()=>videoController.stepFrames(5),
      frameBack:()=>videoController.stepFrames(-1),frameForward:()=>videoController.stepFrames(1),
      markLabel:name=>{
        const active=annotationController.quickMark?.label;
        if(active && active!==name){showToast(t('prefs.markActive',{label:active}));return;}
        annotationController.setMarkLabel(name,'annotation');annotationController.toggleMark();
      },
      play:()=>videoController.togglePlayback(),mark:()=>annotationController.toggleMark(),save:()=>projectUI.action('save-project')}
  });
  const sizeField = elements.textSize;
  annotationController.labelKey=name=>workspaceSettings.labelKey(name);
  behaviorLabels.labelKey=annotationController.labelKey;
  const browserFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  let preferredSize = browserFontSize;
  try {
    const stored = localStorage.getItem("neuropixels.text-size");
    const legacyScale = {standard:1, large:1.125, largest:1.25};
    if (stored) preferredSize = legacyScale[stored] * browserFontSize || Number(stored);
  } catch { /* The control also works without local storage. */ }
  sizeField.value = Math.min(Number(sizeField.max), Math.max(Number(sizeField.min), Math.round(preferredSize || browserFontSize)));
  document.documentElement.style.fontSize = sizeField.value + "px";
  sizeField.addEventListener("input", () => {
    if (!sizeField.validity.valid) return;
    document.documentElement.style.fontSize = sizeField.value + "px";
    try { localStorage.setItem("neuropixels.text-size", sizeField.value); } catch { /* Session-only preference. */ }
    signalWorkspace.applyTextSize();
    detailPlots.render();
    plotEntries().forEach(entry => entry.manager.render());
    syncProbeView();
    videoEvents.redraw = true;
    videoEvents.update();
  });
  sizeField.addEventListener("change", () => {
    if (!sizeField.validity.valid) sizeField.value = parseFloat(document.documentElement.style.fontSize);
  });
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
  elements.folderInput.addEventListener("change", () => openFiles(elements.folderInput.files));
  elements.supplementFileInput.addEventListener("change", () => handleSupplementSelection(elements.supplementFileInput));
  elements.supplementFolderInput.addEventListener("change", () => handleSupplementSelection(elements.supplementFolderInput));
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-supplement-kind]");
    if (button) openSupplementPicker(button);
  });

  elements.recordingPrevious.addEventListener("click", () => scrollRecordings(-1));
  elements.recordingNext.addEventListener("click", () => scrollRecordings(1));
  elements.recordingStrip.addEventListener("scroll", updateRecordingScrollControls, { passive: true });
  new ResizeObserver(updateRecordingScrollControls).observe(elements.recordingStrip.parentElement);

  elements.findUnitButton.addEventListener("click", () => setFindUnitOpen(elements.findUnitPopover.hidden));
  elements.findUnitInput.addEventListener("input", renderFindUnitResults);
  elements.findUnitInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const first = elements.findUnitResults.querySelector("[data-find-unit-id]");
    if (first) {
      event.preventDefault();
      setFindUnitOpen(false);
      signalWorkspace.checkpoint();
      signalWorkspace.locateUnit(Number(first.dataset.findUnitId));
    }
  });
  elements.findUnitResults.addEventListener("click", (event) => {
    const result = event.target.closest("[data-find-unit-id]");
    if (result) { signalWorkspace.checkpoint();setFindUnitOpen(false); signalWorkspace.locateUnit(Number(result.dataset.findUnitId)); }
  });
  let inspectorOrigin=null;
  async function inspectUnit(id, origin=elements.inspectUnitButton) {
    if (id == null || !state.activeRecording) return;
    const ref=window.NeuropixelsJointRecording.originalUnit(state.activeRecording,id);
    if(ref){if(!await revealAnalysisUnit(state.activeRecording,id))return;id=ref.unitId;}
    inspectorOrigin=origin;
    elements.reviewLayout.hidden = false;
    try { await openUnitOnly(state.activeRecording,id); }
    catch (error) { showToast(error.message, "error"); }
    requestAnimationFrame(() => {
      plots.render();
      detailPlots.render();
      probeViewer.draw();
      elements.closeUnitInspector.focus({ preventScroll: true });
    });
  }
  elements.inspectUnitButton.addEventListener("click",()=>inspectUnit(state.experimentView.selectedUnitId));
  elements.closeUnitInspector.addEventListener("click", () => {
    elements.reviewLayout.hidden = true;
    (inspectorOrigin?.isConnected?inspectorOrigin:elements.inspectUnitButton).focus({ preventScroll: true });
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
  document.addEventListener("contextmenu", openWorkspaceMenu);
  document.addEventListener("keydown",event=>{
    if(event.key==="ContextMenu" || (event.shiftKey&&event.key==="F10"))openWorkspaceMenu(event,true);
  });
  elements.unitContextMenu.addEventListener("keydown",event=>{
    const buttons=[...elements.unitContextMenu.querySelectorAll('button:not(:disabled)')].filter(button=>button.offsetWidth);
    const i=buttons.indexOf(document.activeElement);
    if(event.key==='Escape' || event.key==='Tab'){
      hideUnitContextMenu(true);
      if(event.key==='Escape')event.preventDefault();
    }else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();
      const j=event.key==='Home'?0:event.key==='End'?buttons.length-1:i+(event.key==='ArrowDown'?1:-1);
      buttons[(j+buttons.length)%buttons.length]?.focus();
    }else return;
    event.stopPropagation();
  });
  if(projectUI.browserLocal)document.body.classList.add('workspace-context-actions');
  window.addEventListener("blur",hideUnitContextMenu);
  document.addEventListener("pointerdown", (event) => {
    if (!elements.unitContextMenu.hidden && !event.target.closest("#unit-context-menu")) hideUnitContextMenu();
    if (!elements.dataStatusPopover.hidden && !event.target.closest("#capability-row")) setDataStatusOpen(false);
    if (!elements.findUnitPopover.hidden && !event.target.closest(".find-unit-control")) setFindUnitOpen(false);
  });
  document.addEventListener("pointerover", (event) => {
    const control = event.target.closest?.(helpTargets);
    if (!control && pendingHelpControl?.matches(":focus-visible")) return;
    if (event.pointerType !== "touch") showContextHelp(control, control?.matches(".context-help") ? 600 : 550);
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("button.context-help");
    if (button) {
      event.preventDefault();
      event.stopPropagation();
      showContextHelp(button, 0);
    }
  }, true);
  document.addEventListener("pointerout", (event) => {
    if (pendingHelpControl?.contains(event.target) && !pendingHelpControl.contains(event.relatedTarget) &&
      !pendingHelpControl.matches(":focus-visible")) hideContextHelp();
  });
  document.addEventListener("focusin", (event) => {
    if (event.target.matches?.(":focus-visible")) showContextHelp(event.target.closest?.(helpTargets), 0);
  });
  document.addEventListener("focusout", (event) => {
    if (event.target === pendingHelpControl) hideContextHelp();
  });
  document.addEventListener("pointerdown", hideContextHelp, true);
  document.addEventListener("scroll", () => {
    const control = pendingHelpControl;
    if (!control) return;
    const rect = control.getBoundingClientRect();
    const visible = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (!control.matches(":hover, :focus-visible") || !control.contains(visible)) hideContextHelp();
    else if (activeHelpControl) positionContextTooltip(control);
  }, true);
  document.addEventListener("close", hideContextHelp, true);
  window.addEventListener("blur", hideContextHelp);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeHelpControl) {
      event.preventDefault();event.stopPropagation();hideContextHelp();
    }
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    const undoKey=(event.ctrlKey||event.metaKey) && !event.altKey && ['z','y'].includes(event.key.toLowerCase());
    if(undoKey && workspaceSettings.scope==='video' && annotationController.doc &&
        !event.target.closest('input,textarea,[contenteditable="true"]') && !document.querySelector('dialog[open]') && elements.helpDrawer.hidden){
      event.preventDefault();
      annotationController.restoreEdit(event.shiftKey || event.key.toLowerCase()==='y');return;
    }
    if (undoKey &&
        event.target.closest('.experiment-workspace') && !event.target.closest('#signal-workspace,#analysis-pages,#behavior-patterns,#annotation-panel,#annotation-timeline,input,textarea,select,[contenteditable="true"]') &&
        !document.querySelector('dialog[open]') && elements.reviewLayout.hidden && elements.helpDrawer.hidden) {
      const redo=event.shiftKey||event.key.toLowerCase()==='y';
      if(redo?signalWorkspace.redo():signalWorkspace.undo())event.preventDefault();
      return;
    }
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
    if (event.key === "Escape" && !elements.unitContextMenu.hidden) {hideUnitContextMenu(true);return;}
    if (event.key === "Escape" && !elements.dataStatusPopover.hidden) {
      setDataStatusOpen(false);
      elements.dataStatusButton.focus({ preventScroll: true });
      return;
    }
    if (event.key === "Escape" && !elements.findUnitPopover.hidden) {
      setFindUnitOpen(false);
      elements.findUnitButton.focus({ preventScroll: true });
      return;
    }
    if (event.key === "Escape" && !elements.reviewLayout.hidden) {
      elements.closeUnitInspector.click();
      return;
    }
    if (event.key === "Escape" && event.target === document.body && !tourPanel.hidden && !document.querySelector("dialog[open]")) {
      closeImportTour(); return;
    }
    if(event.key==="Escape" && !document.querySelector("dialog[open]") && !event.target.closest("input,textarea,select,[contenteditable=true]")){
      if(signalWorkspace.drag || workspaceSettings.scope==="signal")signalWorkspace.key(event);
      else if(workspaceSettings.scope==="video" && videoController.playing){event.preventDefault();videoController.pause();}
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

  const dragsFiles = event => Array.from(event.dataTransfer?.types || []).includes("Files");
  const dropSelectors = {
    neural: ".activity-workspace",
    video: "#experiment-video-region",
    annotation: "#create-annotation, .workspace-annotation-empty, #annotation-panel",
    events: "[data-label-source=experiment]",
    clock: "#video-alignment, #video-event-overview",
    project: "[data-project-action=open-project]"
  };
  const highlightedDrops = new Set();
  const dropHint = document.getElementById("file-drop-hint");
  let importQueue = Promise.resolve();

  function namedDropKind(name) {
    if (window.NeuropixelsVideoSync.VIDEO_EXTENSIONS.test(name)) return "video";
    if (/\.neuroproject$/i.test(name)) return "project";
    if (name === "explorer-events.json") return "events";
    if (name === "annotations.project.json" || name.endsWith(".annotations.json")) return "annotation";
    if (/\.clock\.json$/i.test(name)) return "clock";
    if (core.USEFUL_NAMES.has(name) || core.roleForFile({name}) || name === "explorer-units.json" || name.endsWith(".nwb")) return "neural";
    return null;
  }
  function visibleDropArea(kind, fileName) {
    if(kind==="neural" && fileName){
      const key=state.activeRecording?.key;
      const matching=[...document.querySelectorAll('[data-import-drop=neural][data-import-files]')].find(el=>
        el.getClientRects().length && (!el.dataset.importRecordingKey || el.dataset.importRecordingKey===key) && el.dataset.importFiles.split(/\s+/).includes(fileName));
      if(matching)return matching;
    }
    const slots = {video:"#video-empty", clock:"#video-clock-row", annotation:"#create-annotation", events:"[data-label-source=experiment]"};
    const slot = slots[kind] && document.querySelector(slots[kind]);
    if (slot?.dataset.importDrop === kind && slot.getClientRects().length) return slot;
    return [...document.querySelectorAll(dropSelectors[kind])].find(el => el.getClientRects().length);
  }
  function showDropAreas(areas, message = "", modal = null, invalidArea = null) {
    const next = new Set(areas.filter(Boolean));
    for (const el of highlightedDrops) if (!next.has(el)) { el.classList.remove("file-drop-active","file-drop-invalid"); highlightedDrops.delete(el); }
    for (const el of next) {
      el.classList.add("file-drop-active");
      el.classList.toggle("file-drop-invalid", el === invalidArea);
      highlightedDrops.add(el);
    }
    if (message && dropHint.parentNode !== (modal || document.body)) (modal || document.body).append(dropHint);
    if (dropHint.textContent !== message) dropHint.textContent = message;
    dropHint.classList.toggle("file-drop-invalid", !!invalidArea);
    dropHint.hidden = !message;
  }
  const dropTarget = event => event.target.closest?.("[data-import-drop], [data-project-action=open-project]");
  const areaKind = target => target?.dataset.importDrop || (target ? "project" : null);
  function wrongAreaMessage(expectedKind, kind, name = "") {
    if (!kind) return t("drop.unsupported", {name});
    const panelTitle = document.querySelector(`dialog[open] [data-project-import] [data-import-drop="${kind}"]:not([hidden]) h3`);
    const titleKey = {neural:"workspace.activityTitle", video:"labels.videoPlayer", annotation:"labels.video", events:"labels.recorded", clock:"drop.clockTarget"};
    const clockRow=document.querySelector("#video-clock-row[data-import-drop=clock]");
    const target = panelTitle?.textContent || (kind === "project" ? projectUI.importText("openProject") : kind==="clock" && !clockRow ? projectUI.importText("align") : t(titleKey[kind]));
    const received = (name ? name + " · " : "") + t("drop.type." + kind);
    return t("drop.wrongArea", {expected:t("drop.type." + expectedKind), received, target});
  }
  function updateDrop(event) {
    if (!dragsFiles(event)) return;
    event.preventDefault();
    const modal = document.querySelector("dialog[open]");
    const target = dropTarget(event);
    const targetKind = areaKind(target);
    if (modal && (!target || !modal.contains(target))) {
      showDropAreas([], "", modal);
      event.dataTransfer.dropEffect = "none";
      return;
    }
    // Chrome can hide names and JSON content until release.
    const kinds = new Set();
    const names=Array.from(event.dataTransfer.files,core.fileNameOf);
    for (const name of names) kinds.add(namedDropKind(name));
    for (const item of event.dataTransfer.items) {
      if (item.kind !== "file") continue;
      if (item.type.startsWith("video/")) kinds.add("video");
      if (item.type === "application/x-nwb") kinds.add("neural");
    }
    kinds.delete(null);
    if (targetKind) {
      const acceptedNames=target.dataset.importFiles?.split(/\s+/);
      const expected = acceptedNames?.join(" / ") || t("drop.type." + targetKind);
      const wrongName=acceptedNames && names.find(name=>!acceptedNames.includes(name));
      const wrong = [...kinds].find(kind => kind !== targetKind && !(targetKind === "neural" && kind === "events" && kinds.has("neural")));
      const message = wrong ? wrongAreaMessage(targetKind,wrong) : wrongName ? t("drop.fileExpected",{name:wrongName,files:expected}) :
        t(kinds.size ? "drop.release" : "drop.destination", {types:expected});
      const areas = [target];
      if (wrong) {
        const destination = modal ? modal.querySelector(`[data-import-drop="${wrong}"]:not([hidden])`) : visibleDropArea(wrong);
        areas.push(destination);
      }
      showDropAreas(areas, message, modal, wrong || wrongName ? target : null);
    } else if (kinds.size) {
      showDropAreas([...kinds].map(kind=>visibleDropArea(kind,names.find(name=>namedDropKind(name)===kind))), t("drop.release", {types:[...kinds].map(kind=>t("drop.type."+kind)).join(" / ")}));
    } else {
      showDropAreas([], t("drop.detect"));
    }
    event.dataTransfer.dropEffect = "copy";
  }
  function resetDrop() { state.dragDepth = 0; showDropAreas([]); }
  document.addEventListener("dragenter", event => {
    if (!dragsFiles(event)) return;
    if (!state.dragDepth) document.querySelectorAll(".file-drop-received").forEach(el=>el.classList.remove("file-drop-received"));
    state.dragDepth++;
    updateDrop(event);
  });
  document.addEventListener("dragover", updateDrop);
  document.addEventListener("dragleave", event => {
    if (dragsFiles(event) && --state.dragDepth <= 0) resetDrop();
  });
  window.addEventListener("blur", resetDrop);
  document.addEventListener("dragend", resetDrop);

  function noteDrop(kind) {
    if (!dropHint.hidden) return;
    const el = visibleDropArea(kind);
    if (!el) return;
    el.classList.add("file-drop-received");
    clearTimeout(el.dropFeedbackTimer);
    el.dropFeedbackTimer = setTimeout(() => el.classList.remove("file-drop-received"), 1500);
  }
  async function classifyDrop(file) {
    const name = core.fileNameOf(file);
    const kind = namedDropKind(name);
    if (!kind && name.endsWith(".csv")) {
      const table = await regionCore.inspect(file);
      return {kind: table.direct || table.trackDirect ? "neural" : null, file, table};
    }
    if (!name.endsWith(".json")) return {kind, file};
    let input;
    try { input = JSON.parse(await file.text()); } catch { return {kind: null, file}; }
    if (input?.schema === "allen-video-clock/1") return {kind: "clock", file};
    if (input?.schema === window.NeuropixelsAnnotations.SCHEMA) return {kind: "annotation", file};
    if (input?.schema === window.NeuropixelsAnnotations.CANDIDATE_SCHEMA) return {kind: "annotation", additive:true, file};
    if (input?.schema === window.NeuropixelsEventAnalysis.SCHEMA) {
      if (name === "explorer-events.json") return {kind: "events", file};
      const canonical = new File([file], "explorer-events.json", {type:file.type, lastModified:file.lastModified});
      return {kind: "events", originalName:file.name, file: attachRelativePath(canonical, core.pathOf(file).replace(/[^/]+$/, canonical.name))};
    }
    const metadata = name === "explorer-units.json" && Array.isArray(input?.units);
    const coverage = name === "explorer-coverage.json" && input?.schema === "neuropixels-recording-coverage/1";
    return {kind: metadata || coverage ? "neural" : null, file};
  }

  async function classifyImport(files, targetKind) {
    const items = await Promise.all(files.map(classifyDrop));
    if (!targetKind) return items;
    // Directory companions may live above the actual sorting folder. Loose files
    // have no directory root and must meet the target's own format requirements.
    const dropRoot = file => core.pathOf(file).split("/").slice(0,-1)[0];
    const roots = new Set(items.filter(item => item.kind === targetKind).map(item => dropRoot(item.file)).filter(Boolean));
    const directory = file => core.pathOf(file).split("/").slice(0,-1).join("/");
    const neuralDirs = new Set(items.filter(item => item.kind === "neural").map(({file}) => directory(file)));
    const wrong = items.find(({kind,file}) => {
      if (kind === targetKind) return false;
      if (targetKind !== "neural") return true;
      if (kind === "events" && neuralDirs.has(directory(file))) return false;
      if (!kind && roots.has(dropRoot(file))) return false;
      return true;
    });
    if (wrong) throw new Error(wrongAreaMessage(targetKind,wrong.kind,wrong.originalName || wrong.file.name));
    return items;
  }

  async function importWorkspaceFiles(files, targetKind, slot) {
    if (!files.length) throw new Error(t("drop.unreadable"));
    const originalProject = projectUI.active?.id, originalRecord = state.activeRecording;
    const items = await classifyImport(files, targetKind);
    if (projectUI.active?.id !== originalProject || state.activeRecording !== originalRecord) throw new Error(t("drop.changed"));
    if (slot) {
      if (slot.project !== originalProject || slot.activeKey !== originalRecord?.key) throw new Error(t("drop.changed"));
      if (slot.folder) {
        const groups = core.groupExperimentFiles(files,{partial:true}).filter(group=>group.files.some(file=>core.USEFUL_NAMES.has(core.fileNameOf(file))));
        if (!groups.length || groups.some(group=>group.key==="." || state.recordings.some(r=>r.key===group.key) || !["spike_times.npy","spike_clusters.npy"].every(name=>group.byName.has(name))) || items.some(item=>/\.nwb$/i.test(item.file.name))) throw new Error(t("drop.newSortingFolder"));
      }
      if (slot.files || slot.table) {
        const names=slot.files?.split(/\s+/);
        const invalid=items.find(item=>slot.table ? !item.table?.[slot.table] : !names.includes(core.fileNameOf(item.file)));
        if (invalid) throw new Error(t("drop.fileExpected",{name:invalid.file.name,files:slot.table?t("drop."+slot.table):names.join(" / ")}));
        const record=recordingForSupplement(slot.recordingKey);
        if (!record) throw new Error(t("toast.supplementTargetMissing"));
        if (projectUI.browserLocal) await projectUI.importNeuralFiles(files,record.key);
        else await applySupplement(files,{recordingKey:slot.recordingKey,roles:files.map(core.roleForFile),kind:"files"});
        noteDrop("neural");
        return;
      }
    }
    const unsupported = items.filter(item => !item.kind);
    const accepted = items.filter(item => item.kind);
    if (!accepted.length) throw new Error(t("drop.unsupported", {name: unsupported[0].file.name}));
    const packages = accepted.filter(item => item.kind === "project");
    if (packages.length) {
      if (files.length !== 1) throw new Error(t("drop.packageAlone"));
      if (!projectUI.browserLocal) throw new Error(t("drop.native"));
      await projectUI.openPackage(packages[0].file); noteDrop("project");
      return;
    }
    const neural = accepted.filter(item => ["neural","events"].includes(item.kind));
    const media = accepted.filter(item => ["video","clock","annotation"].includes(item.kind));
    const videos=media.filter(item=>item.kind==='video').map(item=>item.file);
    const batch={matchCamera:!targetKind || videos.length>0};
    if(videos.length && neural.length && projectUI.browserLocal)batch.videos=await projectUI.prepareVideoFiles(videos);
    if(projectUI.active?.id!==originalProject || state.activeRecording!==originalRecord)throw Error(t("drop.changed"));
    const errors = [];
    if (neural.length) {
      const sources = neural.map(item => item.file);
      try {
        if (projectUI.browserLocal) await projectUI.acceptWorkspaceDrop("neural",sources,batch);
        else if (state.dataMode !== "database" && !sources.some(f => /\.nwb$/i.test(f.name))) await openFiles(sources);
        else throw new Error(t("drop.native"));
        for (const kind of new Set(neural.map(item => item.kind))) noteDrop(kind);
      } catch (error) {
        if (error.name === "AbortError" || originalProject || state.activeRecording || !media.length) throw error;
        errors.push(error);
      }
    }
    if (media.length) {
      if(videos.length){
        if(!projectUI.browserLocal)throw Error(t("drop.native"));
        await projectUI.acceptWorkspaceDrop('video',videos,batch);
        noteDrop('video');
      }
      for(const item of media.filter(i=>i.kind!=='video')){
        try{
          if(projectUI.browserLocal)await projectUI.acceptWorkspaceDrop(item.kind,[item.file],batch);
          else if(item.kind==='clock')await projectUI.acceptClockFile(item.file);
          else await annotationController.importFile(item.file);
          noteDrop(item.kind);
        }catch(error){
          if(error.name==='AbortError')throw error;
          errors.push(Object.assign(new Error(item.file.name+' · '+error.message),{severity:error.severity}));
        }
      }
    }
    if (errors.length) {
      const error = new Error(errors.map(e => e.message).join("\n"));
      if (errors.every(e => e.severity === "warning")) error.severity = "warning";
      throw error;
    }
    const unsupportedLoose = unsupported.find(item => core.pathOf(item.file) === item.file.name);
    if (unsupportedLoose) showToast(t("drop.unsupported", {name: unsupportedLoose.file.name}), "warning");
  }

  // Capture directory handles in the drop event, then serialize whole batches.
  // The second drop can complete a first partial recording even while it is indexing.
  function queueWorkspaceEdit(task) {
    const result=importQueue.then(task);
    importQueue=result.catch(()=>{});
    return result;
  }
  function queueImport(files, targetKind, slot) {
    const ready = Promise.resolve(files).then(value => ({value}), error => ({error}));
    return queueWorkspaceEdit(async () => {
      const result = await ready;
      if (result.error) throw result.error;
      await importWorkspaceFiles(result.value, targetKind,slot);
      if (slot?.inspector?.isConnected && projectUI.dialog.open) projectUI.dialog.close();
    }).catch(error => { if (error.name !== "AbortError") showToast(error.message, error.severity || "error"); });
  }
  projectUI.importWorkspaceFiles = queueImport;
  projectUI.filesForImportArea = async (files, kind) => (await classifyImport(files,kind)).filter(item => item.kind).map(item => item.file);
  document.addEventListener("drop", async event => {
    if (!dragsFiles(event)) return;
    event.preventDefault(); resetDrop();
    const modal = document.querySelector("dialog[open]");
    const target = dropTarget(event);
    const inspector=target?.closest("[data-project-inputs]");
    if (!modal || (inspector && modal.contains(inspector))) {
      const data=target?.dataset;
      const slot=target?.closest(".file-drop-slot") ? {
        files:data.importFiles, folder:data.importFolder, table:data.importTable, recordingKey:data.importRecordingKey ?? state.activeRecording?.databaseId ?? state.activeRecording?.key,
        project:projectUI.active?.id, activeKey:state.activeRecording?.key, inspector
      } : null;
      queueImport(filesFromDrop(event.dataTransfer), areaKind(target),slot);
      return;
    }
    if (!target || !modal.contains(target) || !projectUI.browserLocal) return;
    try {
      const files = await filesFromDrop(event.dataTransfer);
      if (!files.length || !modal.open || !target.isConnected) return;
      if (target.closest("[data-project-import]")) await projectUI.stageWizardFiles(target.dataset.importDrop,files);
      else if (target.dataset.importDrop === "clock") {
        const clocks = await projectUI.filesForImportArea(files, "clock");
        if (modal.open && target.isConnected) await projectUI.acceptWorkspaceDrop("clock",clocks);
      }
    } catch (error) { if (error.name !== "AbortError") showToast(error.message, error.severity || "error"); }
  });

  window.addEventListener("pagehide", event => {
    if(event.persisted)return;
    state.worker?.terminate();
    if (state.workerUrl) URL.revokeObjectURL(state.workerUrl);
    videoEvents?.destroy();
    videoController?.destroy();
    patterns?.close(false);signalWorkspace.destroy();analysisTabs?.prune(Symbol());
  });

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  async function initialize() {
    const databaseRequested = new URLSearchParams(window.location.search).get("database") === "1";
    if (!window.NeuropixelsBrowserProjectUI && databaseRequested && ["http:", "https:"].includes(window.location.protocol)) {
      try {
        await openDatabaseCatalog();
        return;
      } catch (error) {
        showOnly("explorer");
        showToast(t("toast.databaseUnavailable", { error: error.message }));
      }
    }
    showOnly("explorer");
  }

  applyLanguageSnapshot(languageSnapshot);
  updateOpenUnitCount();
  setInteractionMode("cursor");
  initialize().then(() => startImportTour(true));
})();
