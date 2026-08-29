(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NeuropixelsI18n = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STORAGE_KEY = "neuropixels-explorer-language";
  const DEFAULT_LANGUAGE = "en";
  const LANGUAGES = Object.freeze([
    { code: "en", label: "English", shortLabel: "EN" },
    { code: "zh-CN", label: "简体中文", shortLabel: "中文" },
    { code: "es", label: "Español", shortLabel: "ES" }
  ]);

  const GLOSSARY = Object.freeze({
    unit: Object.freeze({ en: "Unit", "zh-CN": "神经元单元", es: "Unidad" }),
    spike: Object.freeze({ en: "Spike", "zh-CN": "放电事件", es: "Potencial de acción" }),
    firingRate: Object.freeze({ en: "Firing rate", "zh-CN": "放电频率", es: "Tasa de disparo" }),
    probe: Object.freeze({ en: "Probe", "zh-CN": "探针", es: "Sonda" }),
    autocorrelogram: Object.freeze({ en: "Autocorrelogram", "zh-CN": "自相关图", es: "Autocorrelograma" }),
    recording: Object.freeze({ en: "Recording", "zh-CN": "记录", es: "Registro" }),
    channel: Object.freeze({ en: "Channel", "zh-CN": "通道", es: "Canal" }),
    template: Object.freeze({ en: "Template", "zh-CN": "模板", es: "Plantilla" }),
    brainRegion: Object.freeze({ en: "Brain region", "zh-CN": "脑区", es: "Región cerebral" }),
    amplitude: Object.freeze({ en: "Amplitude", "zh-CN": "幅度", es: "Amplitud" }),
    rasterPlot: Object.freeze({ en: "Raster plot", "zh-CN": "放电栅格图", es: "Diagrama de raster" }),
    presenceRatio: Object.freeze({ en: "Presence ratio", "zh-CN": "时间覆盖率", es: "Proporción de presencia" }),
    isiViolation: Object.freeze({ en: "ISI violation", "zh-CN": "不应期违规率", es: "Violación del ISI" }),
    rawVoltage: Object.freeze({ en: "Raw voltage", "zh-CN": "原始电压", es: "Voltaje sin procesar" })
  });

  const EN = {
    "app.title": "NEUROPIXELS EXPLORER",
    "app.noFolder": "No folder loaded",
    "app.theme": "THEME",
    "app.language": "LANGUAGE",
    "app.languageAria": "Explorer language",
    "app.themeAria": "Explorer theme",
    "app.help": "HELP",
    "app.dataDetails": "DATA DETAILS",
    "app.openFolder": "OPEN FOLDER",
    "theme.dark": "Dark",
    "theme.light": "Light",
    "theme.contrast": "High Contrast",
    "theme.system": "System",
    "empty.drop": "DROP SESSION FOLDER",
    "empty.description": "KiloSort recordings and physical Probe groups are detected automatically.",
    "empty.choose": "CHOOSE FOLDER",
    "empty.aria": "Drop or choose a Neuropixels data folder",
    "loading.inspectTitle": "Inspecting folder",
    "loading.inspectMessage": "Finding KiloSort recordings and readable metadata.",
    "summary.aria": "Loaded data summary",
    "summary.recordings": "RECORDINGS",
    "summary.units": "UNITS",
    "summary.spikes": "SPIKES",
    "summary.indexed": "INDEXED",
    "status.summary": "Data status",
    "status.title": "DATA STATUS",
    "status.loadedDataset": "Loaded dataset",
    "status.close": "Close data status",
    "status.detailAria": "Detailed data status",
    "status.available": "AVAILABLE",
    "status.missing": "MISSING",
    "status.invalid": "INVALID",
    "status.optional": "OPTIONAL",
    "status.future": "STREAMS / EXTENSIONS",
    "status.noneAvailable": "No core inputs are currently available.",
    "status.noneMissing": "No missing core inputs.",
    "status.noneInvalid": "No invalid candidate recordings.",
    "status.noneOptional": "No optional inputs are defined.",
    "status.noneFuture": "No future interfaces are defined.",
    "status.summaryCounts": "Data status · {available} available · {missing} missing",
    "status.summaryInvalid": " · {invalid} invalid",
    "status.recordingContext": "{dataset} · {count} recording(s)",
    "status.file.spikeTiming": "Spike timing",
    "status.file.spikeTimingDetail": "spike_times.npy and spike_clusters.npy detected",
    "status.file.quality": "KiloSort quality labels",
    "status.file.qualityDetail": "cluster table labels detected",
    "status.file.amplitude": "Spike amplitudes",
    "status.file.amplitudeDetail": "amplitudes.npy detected",
    "status.file.position": "Unit positions",
    "status.file.positionDetail": "spike_positions.npy detected",
    "status.file.template": "KiloSort templates",
    "status.file.templateDetail": "templates.npy and spike_templates.npy detected",
    "status.file.geometry": "Channel geometry",
    "status.file.geometryDetail": "channel_positions.npy detected",
    "status.file.probeGrouping": "Physical Probe grouping",
    "status.file.probeGroupingDetail": "channel_shanks.npy detected",
    "status.file.region": "Unit brain-region mapping",
    "status.file.regionAvailable": "{count} Unit mappings",
    "status.file.regionMissing": "Optional Legacy Table not provided",
    "status.file.track": "Probe brain-region track",
    "status.file.trackAvailable": "{count} rows across {probes} physical Probe(s)",
    "status.file.trackMissing": "Optional depth-to-region CSV not provided",
    "status.file.video": "Synchronized behavior video",
    "status.file.videoDetail": "Synchronized viewer ready · deterministic validation video available",
    "status.file.videoDetected": "Video detected · synchronized viewing available",
    "status.file.rawVoltage": "Raw continuous voltage",
    "status.file.rawVoltageDetail": "Extension contract ready · no raw-voltage provider registered",
    "status.file.rawVoltageDetected": "Raw voltage detected · no reader provider registered",
    "status.file.invalid": "Unreadable candidate",
    "status.file.missingAcross": "Missing from one or more recordings",
    "status.file.availableAcross": "Available across loaded recordings",
    "status.addFiles": "ADD FILES",
    "status.addFolder": "ADD FOLDER",
    "recordings.aria": "Detected recordings",
    "recordings.previous": "Previous recordings",
    "recordings.next": "Next recordings",
    "units.title": "UNITS",
    "units.aria": "Units",
    "units.availableAria": "Available Units",
    "units.searchLabel": "Search Units",
    "units.searchPlaceholder": "Search ID or region",
    "units.filterAria": "Filter Units by KiloSort label",
    "units.filterCaption": "KiloSort label",
    "units.all": "ALL",
    "units.good": "GOOD",
    "units.mua": "MUA",
    "units.help": "CLICK open only · CTRL+CLICK add · RIGHT CLICK options",
    "units.none": "No Units match the current filter.",
    "units.unmapped": "Unmapped",
    "units.loading": "READING",
    "units.open": "open",
    "units.rowAria": "Open Unit {id}. Ctrl plus click adds it to the current view.",
    "units.loadingAria": "Loading Unit {id}",
    "units.countMeta": "{count} Units · {duration} s",
    "layout.unitSplitter": "Resize Units and signal workspace",
    "layout.probeSplitter": "Resize signal workspace and Probe Inspector",
    "layout.collapsed": "Collapsed",
    "layout.pixels": "{width} pixels",
    "layout.resizeTitle": "Drag or use arrow keys to resize. Double-click or press Home to reset.",
    "layout.panelUnits": "Units panel",
    "layout.panelProbe": "Probe Inspector panel",
    "layout.expand": "Expand",
    "layout.collapse": "Collapse",
    "review.aria": "Selected Unit review",
    "review.focused": "FOCUSED UNIT",
    "review.select": "Select a Unit to inspect its spike data.",
    "review.idle": "IDLE",
    "review.noOpen": "No Unit open",
    "review.noSelected": "No Unit selected",
    "review.selectSignal": "Select a signal to inspect its Unit-level details and physical position.",
    "review.loading": "loading selected spike data",
    "review.reading": "READING",
    "review.ready": "READY",
    "review.mainThread": "READY · MAIN THREAD",
    "review.database": "READY · DATABASE",
    "review.error": "ERROR",
    "review.manual": "BEHAVIOR + NEURAL REVIEW",
    "review.noUnitsHint": "No Unit open · select a Unit from the left",
    "review.oneUnitHint": "1 Unit open · click another Unit to replace it · Ctrl+click to add",
    "review.manyUnitsHint": "{count} Units open · {linkState}",
    "review.linkedAxes": "time axes linked",
    "review.independentAxes": "time axes independent",
    "review.empty": "Select a Unit from the left to open its signal.",
    "review.unitPlaceholder": "Unit —",
    "review.selectFromList": "Select a Unit from the list",
    "review.selectUnit": "Select a Unit",
    "review.regionUnmapped": "brain region unmapped",
    "review.regionShortUnmapped": "region unmapped",
    "review.recordingDuration": "{duration} s recording",
    "review.peakChannelUnavailable": "peak channel unavailable",
    "review.peakChannel": "peak channel {channel}",
    "review.templateLabel": "Template {template} · {channel}{depth} · a.u.",
    "review.templateDefault": "Peak channel · arbitrary units",
    "review.closePrimarySignal": "Close primary signal",
    "review.closeSignalTitle": "Close this signal",
    "review.closeUnitSignal": "Close Unit {id} signal",
    "review.detailsFor": "DETAILS FOR",
    "review.fullRecording": "PRIMARY UNIT · FULL RECORDING",
    "review.overviewHint": "Click or drag to move its detail window",
    "review.interactionHint": "CURSOR inspect time · ZOOM drag or wheel anywhere in a signal · PAN drag or wheel through time · DOUBLE CLICK reset",
    "controls.timeLinked": "TIME LINKED",
    "controls.timeIndependent": "TIME INDEPENDENT",
    "controls.cursor": "CURSOR",
    "controls.zoom": "ZOOM",
    "controls.pan": "PAN",
    "controls.back": "BACK",
    "controls.reset": "RESET",
    "controls.zoomOut": "Zoom out",
    "controls.zoomIn": "Zoom in",
    "controls.linkedTitle": "Linked: zoom and pan every open Unit together",
    "controls.independentTitle": "Independent: zoom and pan only the focused trace",
    "controls.cursorTitle": "Cursor mode: inspect time without changing the view",
    "controls.zoomTitle": "Zoom mode: drag anywhere in a signal or use the wheel at the pointer",
    "controls.panTitle": "Pan mode: drag anywhere in a signal or use the wheel to move through time",
    "controls.backTitle": "Return to the previous time view",
    "video.aria": "Synchronized behavior video",
    "video.kicker": "BEHAVIOR VIDEO · SHARED NEURAL TIME",
    "video.sourcePrompt": "No video source attached",
    "video.noSource": "NO SOURCE",
    "video.collapse": "Collapse video",
    "video.expand": "Expand video",
    "video.syntheticAria": "Deterministic synthetic mouse behavior video",
    "video.emptyTitle": "NO BEHAVIOR VIDEO AVAILABLE",
    "video.emptyDescription": "Generate a deterministic validation stream or attach a local video. No laboratory video is required.",
    "video.generate": "GENERATE VALIDATION VIDEO",
    "video.choose": "ATTACH LOCAL VIDEO",
    "video.previousFrame": "Previous frame",
    "video.nextFrame": "Next frame",
    "video.play": "Play",
    "video.pause": "Pause",
    "video.seekAria": "Video time",
    "video.speed": "SPEED",
    "video.speedAria": "Playback speed",
    "video.follow": "FOLLOW SIGNAL",
    "video.frame": "FRAME",
    "video.neuralTime": "NEURAL TIME",
    "video.offset": "OFFSET (S)",
    "video.offsetAria": "Video to neural time offset in seconds",
    "video.playhead": "VIDEO",
    "video.verified": "VERIFIED",
    "video.unverified": "UNVERIFIED",
    "video.syntheticClock": "SYNTHETIC CLOCK",
    "video.method.ttl": "TTL",
    "video.method.frame_timestamps": "FRAME TIMESTAMPS",
    "video.method.manual_offset": "MANUAL OFFSET",
    "video.method.linear_clock_fit": "LINEAR CLOCK FIT",
    "video.method.unknown": "UNKNOWN MAPPING",
    "video.localFile": "LOCAL VIDEO",
    "video.databaseVideo": "DATABASE VIDEO",
    "video.loadError": "The video could not be decoded",
    "video.playBlocked": "Playback was blocked by the browser",
    "video.behavior": "BEHAVIOR",
    "raw.port": "RAW VOLTAGE PORT",
    "raw.notAttached": "EXTENSION READY · NO PROVIDER",
    "plots.amplitude": "AMPLITUDE STABILITY",
    "plots.amplitudeSubtitle": "Relative amplitude across the recording",
    "plots.acg": "AUTOCORRELOGRAM",
    "plots.acgSubtitle": "±100 ms · 2 ms bins",
    "plots.template": "KILOSORT TEMPLATE",
    "plots.notAvailable": "Not available",
    "plots.detailAria": "Detailed spike raster and firing rate",
    "plots.overviewAria": "Full recording spike density overview",
    "plots.amplitudeAria": "Spike amplitude over time",
    "plots.acgAria": "Unit autocorrelogram",
    "plots.templateAria": "KiloSort template waveform",
    "metrics.spikes": "SPIKES",
    "metrics.meanRate": "MEAN RATE",
    "metrics.isi": "ISI < 2 MS",
    "metrics.presence": "PRESENCE",
    "metrics.ksAmplitude": "KS AMPLITUDE",
    "metrics.ksContam": "KS CONTAM.",
    "probe.panelAria": "Physical Probes and brain-region location",
    "probe.title": "PHYSICAL PROBES",
    "probe.noData": "No Probe data",
    "probe.unmapped": "UNMAPPED",
    "probe.canvasAria": "Physical Probe overview, brain-region track, and Unit positions",
    "probe.overlapAria": "Overlapping Units at this Probe depth",
    "probe.unitsAtDepth": "UNITS AT THIS DEPTH",
    "probe.overlapHint": "Click to open · Ctrl-click to add",
    "probe.regions": "BRAIN REGIONS",
    "probe.channels": "CHANNEL TICKS",
    "probe.units": "UNITS",
    "probe.layersAria": "Probe display layers",
    "probe.legendAria": "Units shown on the Probe",
    "probe.physical": "PHYSICAL PROBE",
    "probe.peakChannel": "PEAK CHANNEL",
    "probe.xPosition": "X POSITION",
    "probe.depth": "DEPTH",
    "probe.regionSource": "REGION SOURCE",
    "probe.selectNote": "Select a Unit or click a Probe marker to inspect the linked signal.",
    "probe.nearby": "NEARBY UNITS",
    "probe.nearbyAria": "Nearby Units",
    "probe.clickPosition": "Click a Probe position",
    "probe.positionContract": "POSITION CONTRACT",
    "probe.ready": "READY",
    "probe.track": "TRACK",
    "probe.groupSource": "Physical Probe groups from",
    "probe.regionSourceLegacy": "Unit region from the loaded Legacy Table",
    "probe.noTrack": "No compatible Probe-region mapping",
    "probe.requiredColumns": "Required CSV columns:",
    "probe.recommendedColumns": "Recommended:",
    "probe.sessionTracks": "for session-specific tracks.",
    "probe.channelUnavailable": "channel unavailable",
    "probe.unavailable": "Unavailable",
    "probe.singular": "Probe",
    "probe.groupingUnavailable": "Probe grouping unavailable",
    "probe.noRegionRow": "No compatible region row",
    "probe.addTrackNote": "{count} physical Probe group(s) detected. Add a compatible Probe-region CSV to draw anatomical bands.",
    "probe.trackStatus": "{source} · {rows} electrode rows · {probes} Probes",
    "probe.unitLabel": "Unit {id}",
    "probe.overlapDescription": "{count} overlapping Units · Probe {probe} · {minimum}–{maximum} µm · click to choose",
    "probe.stackTitle": "{count} UNITS · PROBE {probe}",
    "probe.focused": "focused",
    "probe.count": "{count} physical Probe(s) · {status}",
    "probe.trackReady": "region track ready",
    "probe.openUnits": "{count} Unit(s) open",
    "probe.selected": "Unit {id} · {recording}",
    "probe.bandSource": "Brain-region bands come from {source}. Faint ticks are channels; circles are selectable Units.",
    "probe.noNearby": "No nearby Unit selected",
    "probe.nearbyMeta": "{quality} · {region}",
    "probe.locatedToast": "Unit {id} located on the Probe",
    "context.title": "Unit actions",
    "context.aria": "Unit actions",
    "context.openOnly": "Open only",
    "context.add": "Add to current view",
    "context.remove": "Remove from view",
    "context.locate": "Locate on Probe",
    "dialog.title": "DATA DETAILS",
    "dialog.close": "Close",
    "dialog.databaseCatalog": "DATABASE CATALOG",
    "dialog.folderSummary": "FOLDER SUMMARY",
    "dialog.filesReceived": "FILES RECEIVED",
    "dialog.filesUsed": "FILES USED DIRECTLY",
    "dialog.kilosortSize": "KILOSORT DATA SIZE",
    "dialog.validRecordings": "VALID RECORDINGS",
    "dialog.listedUnits": "LISTED UNITS",
    "dialog.regionMappings": "REGION MAPPINGS",
    "dialog.readableContent": "READABLE CONTENT",
    "dialog.spikeTiming": "SPIKE TIMING",
    "dialog.unitAssignment": "UNIT ASSIGNMENT",
    "dialog.quality": "QUALITY",
    "dialog.amplitude": "AMPLITUDE",
    "dialog.spatialPosition": "SPATIAL POSITION",
    "dialog.waveform": "WAVEFORM SHAPE",
    "dialog.databaseNote": "Recording, Unit, region, Probe, and asset metadata are queried from SQLite. Unit arrays are read by the local data service with a two-Recording cache; the browser receives only the selected Unit result.",
    "dialog.folderNote": "Large NPY payloads are read only for the active Recording in a background worker. The complete folder is indexed, but all experiments are not held in memory at the same time.",
    "dialog.brainMapping": "BRAIN-REGION MAPPING",
    "dialog.unitRegionRows": "UNIT-REGION ROWS",
    "dialog.probeTrackRows": "PROBE-TRACK ROWS",
    "dialog.physicalProbes": "PHYSICAL PROBES",
    "dialog.trackSource": "TRACK SOURCE",
    "dialog.requiredColumns": "REQUIRED COLUMNS",
    "dialog.recommendedJoin": "RECOMMENDED JOIN",
    "dialog.notProvided": "Not provided",
    "dialog.mappingNote": "A compatible track CSV maps electrode or Probe depth to an atlas region and optional atlas color. The current pinpoint_parsed.csv provides this electrode-level mapping. It does not provide full Allen CCF x/y/z coordinates; a future 3D brain view still needs a registered trajectory or channel coordinates in atlas space.",
    "dialog.recordings": "RECORDINGS",
    "dialog.recording": "Recording",
    "dialog.units": "Units",
    "dialog.spikes": "Spikes",
    "dialog.duration": "Duration",
    "dialog.size": "Size",
    "dialog.unreadable": "{count} candidate folder(s) were not readable:",
    "dialog.rawVoltage": "RAW VOLTAGE",
    "dialog.rawVoltageNote": "The selected KiloSort folders contain spike-sorting outputs. Their params.py files refer to external continuous.dat paths, but the raw voltage files are not inside these folders. This interface therefore labels the primary plot as spike timing and does not present it as a raw voltage trace.",
    "drop.open": "DROP TO OPEN FOLDER",
    "help.title": "USER GUIDE",
    "help.close": "Close user guide",
    "help.drawerAria": "Neuropixels Explorer user guide",
    "help.currentLanguage": "Guide language follows the Explorer language.",
    "help.tipAria": "Explain {topic}",
    "tooltip.what": "What",
    "tooltip.read": "How to read it",
    "tooltip.use": "When to use it",
    "tips.dataStatus": "What: a compact audit of files and interfaces detected in the current dataset. How to read it: open the panel to separate available, missing, invalid, optional, and future inputs. When to use it: after loading data and before interpreting a missing plot.",
    "tips.unitList": "What: the Units reported by the selected KiloSort recording. How to read it: each row shows quality label, mapped brain region, firing rate, and spike count when available. When to use it: click to replace the view, Ctrl-click to add a comparison, or right-click for more actions.",
    "tips.qualityFilter": "What: a filter based on the KiloSort cluster label. How to read it: Good, MUA, and other labels describe sorter or curator categories, not a biological conclusion. When to use it: reduce a long Unit list without deleting data.",
    "tips.manualReview": "What: behavior video above synchronized raster and binned firing-rate views. How to read it: the green Video playhead marks one shared neural time; clicking a signal seeks the video. When to use it: align visible behavior with firing patterns and compare several Units at the same moment.",
    "tips.timeLink": "What: controls whether navigation is shared across open Units. How to read it: Linked applies Zoom, Pan, Back, and Reset to every trace; Independent changes only the focused trace. When to use it: link for direct time comparison and unlink to inspect one trace at another scale.",
    "tips.cursor": "What: a read-only time cursor. How to read it: move over a signal to inspect time without changing the visible range. When to use it: identify an event time after the desired window is already visible.",
    "tips.zoom": "What: changes the visible time span. How to read it: drag a rectangle or use the wheel around the pointer; a smaller span reveals finer temporal structure. When to use it: inspect dense spikes or align brief events.",
    "tips.pan": "What: moves the visible time window without changing its span. How to read it: drag horizontally, scroll down for later time, and scroll up for earlier time while the pointer is over a signal. When to use it: scan adjacent periods at a fixed scale.",
    "tips.overview": "What: a compressed view of the entire recording. How to read it: the outlined window is the interval shown in detail above. When to use it: jump to another recording period or understand the current window in context.",
    "tips.amplitude": "What: relative spike amplitude across recording time. How to read it: sustained shifts or dropouts can indicate waveform or detection instability, but are not automatic rejection criteria. When to use it: check whether a Unit remains consistently detected.",
    "tips.autocorrelogram": "What: a histogram of time differences between spikes from the same Unit. How to read it: the center and short-lag shape help assess refractory-period structure and rhythmicity. When to use it: review isolation quality and firing dynamics alongside other evidence.",
    "tips.template": "What: the KiloSort template waveform assigned most often to the Unit. How to read it: shape and peak channel summarize the spatial-temporal waveform in arbitrary units. When to use it: compare waveform morphology and verify the channel localization.",
    "tips.probe": "What: the physical Probe layout, optional brain-region depth bands, channel ticks, and Unit markers. How to read it: open Units share colors with their signals; the focused Unit has a white ring, depth line, and fixed label. When to use it: connect signal properties to depth, channel, physical Probe, and mapped brain region.",
    "tips.nearbyUnits": "What: Units nearest the locked Probe position. How to read it: distance is shown in micrometres and does not itself imply functional similarity. When to use it: open nearby Units for a spatially informed comparison.",
    "tips.positionContract": "What: the provenance and minimum columns required for anatomical mapping. How to read it: KiloSort supplies signal and geometry data, while the Legacy Table supplies optional brain-region annotations. When to use it: diagnose unmapped Units or prepare a compatible CSV.",
    "tips.metricSpikes": "What: the number of detected spikes assigned to the Unit. How to read it: interpret it with recording duration and firing rate. When to use it: check sample size before trusting a sparse plot.",
    "tips.metricRate": "What: mean firing rate over the complete recording. How to read it: it averages temporal variation and should be inspected with the time-resolved trace. When to use it: compare overall activity levels between Units.",
    "tips.metricIsi": "What: the percentage of adjacent spikes separated by less than 2 ms. How to read it: higher values may suggest contamination or a nonstandard physiology, but thresholds depend on context. When to use it: as one quality-control indicator, not a standalone verdict.",
    "tips.metricPresence": "What: the fraction of recording intervals in which the Unit is detected. How to read it: a high value suggests temporal coverage; a low value can reflect silence, drift, or loss of detection. When to use it: assess recording-wide stability.",
    "tips.metricAmplitude": "What: the KiloSort amplitude summary for the Unit. How to read it: values are dataset-specific and should not be compared across differently scaled recordings without calibration. When to use it: inspect relative signal strength within a recording.",
    "tips.metricContam": "What: the contamination estimate reported by KiloSort when available. How to read it: lower is generally cleaner, but the estimate depends on sorting assumptions. When to use it: combine with ISI, waveform, amplitude, and manual review.",
    "toast.removed": "Unit {id} removed from the current view",
    "toast.added": "Unit {id} added to the current view",
    "toast.maxUnits": "{count} Units are already open. Remove one before adding another.",
    "toast.recordingsReady": "{count} recordings ready"
    ,"toast.probePosition": "Probe {probe} · {region} · {depth} µm · nearby Units shown"
    ,"toast.couldNotAdd": "Could not add Unit {id}: {error}"
    ,"toast.couldNotRead": "Could not read Unit {id}: {error}"
    ,"toast.noReadableFiles": "The selected folder did not provide readable files"
    ,"toast.noRecordings": "No KiloSort Recording folders were found"
    ,"toast.couldNotIndex": "The KiloSort Recordings could not be indexed"
    ,"toast.droppedError": "Could not read the dropped folder: {error}"
    ,"toast.databaseUnavailable": "Database service unavailable: {error}"
    ,"loading.filesReceived": "{count} files received. Finding KiloSort Recordings."
    ,"loading.noRequiredFiles": "No folder contains spike_times.npy, spike_clusters.npy, and params.py."
    ,"loading.checkCandidates": "Checking {count} candidate Recordings without loading their large arrays."
    ,"loading.checkRecording": "Checking Recording {current}/{total}."
    ,"loading.nonePassed": "KiloSort candidates were found, but none passed structural checks."
    ,"loading.folderReady": "Folder ready"
    ,"loading.recordingsDetected": "{count} Recordings detected. Select a Unit to begin."
    ,"loading.openingDatabase": "Opening database"
    ,"loading.databaseCatalog": "Reading the local SQLite catalog and preparing the Unit list."
    ,"loading.databaseIndexed": "{recordings} Recordings and {units} Units indexed. Select a Unit to begin."
    ,"loading.readingFolder": "Reading folder"
    ,"loading.collectingFiles": "Collecting files from the dropped directory."
    ,"toast.databaseReady": "Database ready · {time} ms catalog query"
    ,"toast.supplementTargetMissing": "The target Recording is no longer available"
    ,"toast.noMatchingSupplement": "The selection does not contain the requested missing file type"
    ,"toast.wrongRecording": "{file} belongs to {recording}, not {expected}"
    ,"toast.duplicateSelection": "The selection contains more than one copy of {file}"
    ,"toast.supplementUpload": "Uploading {current}/{total} · {file}"
    ,"toast.supplementCommit": "Validating and committing supplement"
    ,"toast.supplementReady": "Supplement complete · {added} added · {duplicates} duplicate(s) ignored"
    ,"toast.supplementFailed": "Supplement rejected: {error}"
  };

  const ZH = {
    "app.noFolder": "尚未加载文件夹", "app.theme": "主题", "app.language": "语言", "app.languageAria": "Explorer 语言", "app.themeAria": "Explorer 主题", "app.help": "帮助", "app.dataDetails": "数据详情", "app.openFolder": "打开文件夹",
    "theme.dark": "深色", "theme.light": "浅色", "theme.contrast": "高对比度", "theme.system": "跟随系统",
    "empty.drop": "拖入实验文件夹", "empty.description": "程序会自动识别 KiloSort 记录与物理探针分组。", "empty.choose": "选择文件夹", "empty.aria": "拖入或选择 Neuropixels 数据文件夹",
    "loading.inspectTitle": "正在检查文件夹", "loading.inspectMessage": "正在查找 KiloSort 记录和可读取的元数据。",
    "summary.aria": "已加载数据概览", "summary.recordings": "记录", "summary.units": "神经元单元", "summary.spikes": "放电事件", "summary.indexed": "已索引",
    "status.summary": "数据状态", "status.title": "数据状态", "status.loadedDataset": "已加载数据集", "status.close": "关闭数据状态", "status.detailAria": "详细数据状态", "status.available": "可用", "status.missing": "缺失", "status.invalid": "无效", "status.optional": "可选", "status.future": "数据流 / 扩展接口",
    "status.noneAvailable": "当前没有可用的核心输入。", "status.noneMissing": "核心输入没有缺失。", "status.noneInvalid": "没有无效的候选记录。", "status.noneOptional": "没有定义可选输入。", "status.noneFuture": "没有定义未来接口。",
    "status.summaryCounts": "数据状态 · {available} 项可用 · {missing} 项缺失", "status.summaryInvalid": " · {invalid} 项无效", "status.recordingContext": "{dataset} · {count} 条记录", "status.addFiles": "添加文件", "status.addFolder": "添加文件夹",
    "status.file.spikeTiming": "放电时间", "status.file.spikeTimingDetail": "已检测到 spike_times.npy 和 spike_clusters.npy", "status.file.quality": "KiloSort 质量标签", "status.file.qualityDetail": "已检测到 cluster 表中的标签", "status.file.amplitude": "放电幅度", "status.file.amplitudeDetail": "已检测到 amplitudes.npy", "status.file.position": "神经元单元位置", "status.file.positionDetail": "已检测到 spike_positions.npy", "status.file.template": "KiloSort 模板", "status.file.templateDetail": "已检测到 templates.npy 和 spike_templates.npy", "status.file.geometry": "通道几何信息", "status.file.geometryDetail": "已检测到 channel_positions.npy", "status.file.probeGrouping": "物理探针分组", "status.file.probeGroupingDetail": "已检测到 channel_shanks.npy", "status.file.region": "神经元单元脑区映射", "status.file.regionAvailable": "{count} 条神经元单元映射", "status.file.regionMissing": "未提供可选的 Legacy Table", "status.file.track": "探针脑区轨迹", "status.file.trackAvailable": "{probes} 根物理探针，共 {count} 行", "status.file.trackMissing": "未提供可选的深度—脑区 CSV", "status.file.video": "同步行为视频", "status.file.videoDetail": "同步查看器已就绪 · 可生成确定性验证视频", "status.file.videoDetected": "已检测到视频 · 可进行同步查看", "status.file.rawVoltage": "原始连续电压", "status.file.rawVoltageDetail": "扩展契约已就绪 · 尚未注册 Raw Voltage 读取器", "status.file.rawVoltageDetected": "已检测到原始电压 · 尚未注册读取器", "status.file.invalid": "无法读取的候选项", "status.file.missingAcross": "至少一条记录中缺失", "status.file.availableAcross": "所有已加载记录均可用",
    "recordings.aria": "检测到的记录", "recordings.previous": "向前浏览记录", "recordings.next": "向后浏览记录", "units.title": "神经元单元", "units.aria": "神经元单元", "units.availableAria": "可用神经元单元", "units.searchLabel": "搜索神经元单元", "units.searchPlaceholder": "搜索 ID 或脑区", "units.filterAria": "按 KiloSort 标签筛选神经元单元", "units.filterCaption": "KiloSort 标签", "units.all": "全部", "units.good": "GOOD", "units.mua": "MUA", "units.help": "单击：单独打开 · Ctrl+单击：追加 · 右键：更多操作", "units.none": "当前筛选条件下没有神经元单元。", "units.unmapped": "未映射", "units.loading": "读取中", "units.open": "已打开", "units.rowAria": "打开神经元单元 {id}。按住 Ctrl 单击可追加到当前视图。", "units.loadingAria": "正在加载神经元单元 {id}", "units.countMeta": "{count} 个神经元单元 · {duration} 秒",
    "layout.unitSplitter": "调整神经元单元列表与信号工作区宽度", "layout.probeSplitter": "调整信号工作区与探针检查器宽度", "layout.collapsed": "已折叠", "layout.pixels": "{width} 像素", "layout.resizeTitle": "拖动或用方向键调整大小；双击或按 Home 恢复默认值。", "layout.panelUnits": "神经元单元面板", "layout.panelProbe": "探针检查器面板", "layout.expand": "展开", "layout.collapse": "折叠",
    "review.aria": "所选神经元单元检查", "review.focused": "当前神经元单元", "review.select": "选择一个神经元单元以检查其放电数据。", "review.idle": "空闲", "review.noOpen": "尚未打开神经元单元", "review.noSelected": "尚未选择神经元单元", "review.selectSignal": "选择一个信号以查看该神经元单元的详细信息与物理位置。", "review.loading": "正在加载所选放电数据", "review.reading": "读取中", "review.ready": "就绪", "review.mainThread": "就绪 · 主线程", "review.database": "就绪 · 数据库", "review.error": "错误", "review.manual": "人工放电检查", "review.noUnitsHint": "尚未打开神经元单元 · 请从左侧选择", "review.oneUnitHint": "已打开 1 个神经元单元 · 单击其他单元可替换 · Ctrl+单击可追加", "review.manyUnitsHint": "已打开 {count} 个神经元单元 · {linkState}", "review.linkedAxes": "时间轴联动", "review.independentAxes": "时间轴独立", "review.empty": "请从左侧选择神经元单元以打开其信号。", "review.unitPlaceholder": "神经元单元 —", "review.selectFromList": "从列表中选择神经元单元", "review.selectUnit": "选择神经元单元", "review.regionUnmapped": "脑区未映射", "review.regionShortUnmapped": "脑区未映射", "review.recordingDuration": "记录时长 {duration} 秒", "review.peakChannelUnavailable": "峰值通道不可用", "review.peakChannel": "峰值通道 {channel}", "review.templateLabel": "模板 {template} · {channel}{depth} · a.u.", "review.templateDefault": "峰值通道 · 任意单位", "review.closePrimarySignal": "关闭主信号", "review.closeSignalTitle": "关闭此信号", "review.closeUnitSignal": "关闭神经元单元 {id} 的信号", "review.detailsFor": "详细信息", "review.fullRecording": "主神经元单元 · 完整记录", "review.overviewHint": "单击或拖动以移动详细时间窗", "review.interactionHint": "光标：查看时间 · 缩放：在信号区拖动或滚轮 · 平移：拖动或滚轮浏览时间 · 双击：重置",
    "controls.timeLinked": "时间联动", "controls.timeIndependent": "时间独立", "controls.cursor": "光标", "controls.zoom": "缩放", "controls.pan": "平移", "controls.back": "返回", "controls.reset": "重置", "controls.zoomOut": "缩小", "controls.zoomIn": "放大", "controls.linkedTitle": "联动：同时缩放和平移所有已打开的神经元单元", "controls.independentTitle": "独立：只缩放和平移当前聚焦的信号", "controls.cursorTitle": "光标模式：查看时间而不改变视图", "controls.zoomTitle": "缩放模式：在信号区域框选，或以鼠标位置为中心滚轮缩放", "controls.panTitle": "平移模式：在信号区域拖动，或滚轮沿时间移动", "controls.backTitle": "返回上一个时间视图",
    "plots.amplitude": "幅度稳定性", "plots.amplitudeSubtitle": "记录全程的相对幅度", "plots.acg": "自相关图", "plots.acgSubtitle": "±100 毫秒 · 2 毫秒分箱", "plots.template": "KILOSORT 模板", "plots.notAvailable": "不可用", "plots.detailAria": "详细放电栅格图与放电频率", "plots.overviewAria": "完整记录的放电密度概览", "plots.amplitudeAria": "放电幅度随时间变化", "plots.acgAria": "神经元单元自相关图", "plots.templateAria": "KiloSort 模板波形",
    "metrics.spikes": "放电事件", "metrics.meanRate": "平均放电频率", "metrics.isi": "ISI < 2 毫秒", "metrics.presence": "时间覆盖率", "metrics.ksAmplitude": "KS 幅度", "metrics.ksContam": "KS 污染率",
    "probe.panelAria": "物理探针与脑区位置", "probe.title": "物理探针", "probe.noData": "无探针数据", "probe.unmapped": "未映射", "probe.canvasAria": "物理探针、脑区轨迹与神经元单元位置概览", "probe.overlapAria": "该探针深度处重叠的神经元单元", "probe.unitsAtDepth": "此深度的神经元单元", "probe.overlapHint": "单击打开 · Ctrl+单击追加", "probe.regions": "脑区", "probe.channels": "通道刻度", "probe.units": "神经元单元", "probe.layersAria": "探针显示图层", "probe.legendAria": "探针上显示的神经元单元", "probe.physical": "物理探针", "probe.peakChannel": "峰值通道", "probe.xPosition": "X 位置", "probe.depth": "深度", "probe.regionSource": "脑区来源", "probe.selectNote": "选择神经元单元或单击探针标记以检查关联信号。", "probe.nearby": "附近神经元单元", "probe.nearbyAria": "附近神经元单元", "probe.clickPosition": "单击探针位置", "probe.positionContract": "位置数据约定", "probe.ready": "就绪", "probe.track": "轨迹", "probe.groupSource": "物理探针分组来源：", "probe.regionSourceLegacy": "神经元单元脑区来自已加载的 Legacy Table", "probe.noTrack": "没有兼容的探针—脑区映射", "probe.requiredColumns": "CSV 必需列：", "probe.recommendedColumns": "建议列：", "probe.sessionTracks": "，用于记录特异的轨迹。", "probe.channelUnavailable": "通道不可用", "probe.unavailable": "不可用", "probe.singular": "探针", "probe.groupingUnavailable": "探针分组不可用", "probe.noRegionRow": "没有兼容的脑区记录", "probe.addTrackNote": "检测到 {count} 个物理探针分组。添加兼容的探针—脑区 CSV 后可绘制解剖色带。", "probe.trackStatus": "{source} · {rows} 行电极数据 · {probes} 根探针", "probe.unitLabel": "神经元单元 {id}", "probe.overlapDescription": "{count} 个重叠神经元单元 · 探针 {probe} · {minimum}–{maximum} µm · 单击选择", "probe.stackTitle": "{count} 个神经元单元 · 探针 {probe}", "probe.focused": "当前聚焦", "probe.count": "{count} 根物理探针 · {status}", "probe.trackReady": "脑区轨迹就绪", "probe.openUnits": "已打开 {count} 个神经元单元", "probe.selected": "神经元单元 {id} · {recording}", "probe.bandSource": "脑区色带来自 {source}。浅色刻度表示通道，圆形标记表示可选择的神经元单元。", "probe.noNearby": "尚未选择附近的神经元单元", "probe.nearbyMeta": "{quality} · {region}", "probe.locatedToast": "已在探针上定位神经元单元 {id}",
    "context.title": "神经元单元操作", "context.aria": "神经元单元操作", "context.openOnly": "仅打开此单元", "context.add": "添加到当前视图", "context.remove": "从视图移除", "context.locate": "在探针上定位",
    "dialog.title": "数据详情", "dialog.close": "关闭", "dialog.databaseCatalog": "数据库目录", "dialog.folderSummary": "文件夹概览", "dialog.filesReceived": "接收文件数", "dialog.filesUsed": "直接使用文件数", "dialog.kilosortSize": "KILOSORT 数据大小", "dialog.validRecordings": "有效记录", "dialog.listedUnits": "列出的神经元单元", "dialog.regionMappings": "脑区映射", "dialog.readableContent": "可读取内容", "dialog.spikeTiming": "放电时间", "dialog.unitAssignment": "神经元单元分配", "dialog.quality": "质量", "dialog.amplitude": "幅度", "dialog.spatialPosition": "空间位置", "dialog.waveform": "波形形状", "dialog.databaseNote": "记录、神经元单元、脑区、探针和资源元数据从 SQLite 查询。本地数据服务使用两条记录缓存读取神经元单元数组，浏览器只接收所选单元的结果。", "dialog.folderNote": "大型 NPY 数据只会在后台线程中为当前记录读取。程序会索引完整文件夹，但不会同时把所有实验保存在内存中。", "dialog.brainMapping": "脑区映射", "dialog.unitRegionRows": "神经元单元—脑区行数", "dialog.probeTrackRows": "探针轨迹行数", "dialog.physicalProbes": "物理探针", "dialog.trackSource": "轨迹来源", "dialog.requiredColumns": "必需列", "dialog.recommendedJoin": "建议连接字段", "dialog.notProvided": "未提供", "dialog.mappingNote": "兼容的轨迹 CSV 会把电极或探针深度映射到图谱脑区及可选颜色。当前 pinpoint_parsed.csv 提供的是电极级映射，不包含完整 Allen CCF x/y/z 坐标；未来三维大脑视图仍需要已配准轨迹或图谱空间中的通道坐标。", "dialog.recordings": "记录", "dialog.recording": "记录", "dialog.units": "神经元单元", "dialog.spikes": "放电事件", "dialog.duration": "时长", "dialog.size": "大小", "dialog.unreadable": "有 {count} 个候选文件夹无法读取：", "dialog.rawVoltage": "原始电压", "dialog.rawVoltageNote": "所选 KiloSort 文件夹包含 spike sorting 输出。params.py 指向外部 continuous.dat，但原始电压文件不在这些文件夹中。因此主图明确显示放电时间，不会把它描述成原始电压轨迹。", "drop.open": "拖放以打开文件夹", "help.title": "用户说明", "help.close": "关闭用户说明", "help.drawerAria": "Neuropixels Explorer 用户说明", "help.currentLanguage": "说明书语言随 Explorer 语言切换。", "help.tipAria": "解释：{topic}", "tooltip.what": "是什么", "tooltip.read": "怎么看", "tooltip.use": "什么时候使用",
    "tips.dataStatus": "是什么：当前数据集中已检测文件和接口的紧凑检查结果。怎么看：展开后分别查看可用、缺失、无效、可选和未来输入。什么时候使用：加载数据后，以及某个图缺失而需要排查原因时。", "tips.unitList": "是什么：当前所选 KiloSort 记录中的神经元单元。怎么看：每行显示质量标签、已映射脑区、放电频率和放电事件数（如可用）。什么时候使用：单击替换视图，Ctrl+单击追加对比，或右键查看更多操作。", "tips.qualityFilter": "是什么：依据 KiloSort cluster 标签的筛选器。怎么看：Good、MUA 等是排序器或人工整理类别，并非生物学结论。什么时候使用：在不删除数据的前提下缩短较长列表。", "tips.manualReview": "是什么：已打开神经元单元的同步放电栅格图和分箱放电频率。怎么看：竖线是放电时间，下方曲线是随时间变化的频率；相同时间窗便于直接对比。什么时候使用：人工检查放电模式、稳定性和时间协同活动。", "tips.timeLink": "是什么：决定所有已打开神经元单元是否共享时间导航。怎么看：联动会把缩放、平移、返回和重置应用到所有信号；独立只操作当前聚焦信号。什么时候使用：直接对比时联动，需要不同尺度时改为独立。", "tips.cursor": "是什么：只读的时间光标。怎么看：在信号上移动即可查看时间，不会改变可见范围。什么时候使用：时间窗已经合适，需要确定事件时刻时。", "tips.zoom": "是什么：改变可见的时间跨度。怎么看：拖框或以鼠标位置为中心滚轮缩放；跨度越小，时间细节越清晰。什么时候使用：检查密集放电或对齐短暂事件。", "tips.pan": "是什么：在不改变跨度的情况下移动时间窗。怎么看：水平拖动；鼠标位于信号上时向下滚动看更晚时间，向上看更早时间。什么时候使用：以固定尺度连续检查相邻时段。", "tips.overview": "是什么：完整记录的压缩概览。怎么看：描边框表示上方详细图当前显示的时间段。什么时候使用：跳到记录的其他时段，或理解当前时间窗所在位置。", "tips.amplitude": "是什么：记录全程中的相对放电幅度。怎么看：持续漂移或缺失可能提示波形或检测不稳定，但不能自动判定为淘汰。什么时候使用：检查神经元单元是否被稳定检测。", "tips.autocorrelogram": "是什么：同一神经元单元不同放电事件之间时间差的直方图。怎么看：中心和短延迟形状有助于检查不应期结构与节律性。什么时候使用：结合其他证据审查分离质量和放电动力学。", "tips.template": "是什么：该神经元单元最常对应的 KiloSort 模板波形。怎么看：波形和峰值通道以任意单位概括时空形态。什么时候使用：比较波形形态并核对通道定位。", "tips.probe": "是什么：物理探针、可选脑区深度色带、通道刻度和神经元单元标记。怎么看：已打开单元与中央信号同色；聚焦单元有白色外环、深度线和固定标签。什么时候使用：把信号特征对应到深度、通道、物理探针和已映射脑区。", "tips.nearbyUnits": "是什么：距离锁定探针位置最近的神经元单元。怎么看：距离以微米显示，但距离接近本身不代表功能相似。什么时候使用：按空间邻近关系打开其他单元进行对比。", "tips.positionContract": "是什么：解剖映射的数据来源和最低字段要求。怎么看：KiloSort 提供信号与几何信息，Legacy Table 提供可选脑区注释。什么时候使用：排查未映射单元或准备兼容 CSV。", "tips.metricSpikes": "是什么：分配给该神经元单元的放电事件总数。怎么看：需要结合记录时长和放电频率解释。什么时候使用：在判断稀疏图形前检查样本量。", "tips.metricRate": "是什么：完整记录上的平均放电频率。怎么看：它会平均掉时间变化，因此应同时查看时间曲线。什么时候使用：比较神经元单元总体活动水平。", "tips.metricIsi": "是什么：相邻放电间隔小于 2 毫秒的百分比。怎么看：较高值可能提示污染或特殊生理状态，但阈值依赖具体情境。什么时候使用：作为质量控制指标之一，而不是单独结论。", "tips.metricPresence": "是什么：能检测到该神经元单元的记录时间段占比。怎么看：高值提示覆盖较完整；低值可能来自沉默、漂移或检测丢失。什么时候使用：评估记录全程稳定性。", "tips.metricAmplitude": "是什么：KiloSort 给出的神经元单元幅度摘要。怎么看：数值依赖数据尺度，未校准时不宜跨不同记录直接比较。什么时候使用：检查同一记录内的相对信号强度。", "tips.metricContam": "是什么：KiloSort 提供的污染估计（如可用）。怎么看：通常越低越干净，但估计依赖排序假设。什么时候使用：结合 ISI、波形、幅度和人工检查共同判断。",
    "toast.removed": "已从当前视图移除神经元单元 {id}", "toast.added": "已将神经元单元 {id} 添加到当前视图", "toast.maxUnits": "当前已打开 {count} 个神经元单元。请先移除一个再添加。", "toast.recordingsReady": "{count} 条记录已就绪", "toast.probePosition": "探针 {probe} · {region} · {depth} µm · 已显示附近神经元单元", "toast.couldNotAdd": "无法添加神经元单元 {id}：{error}", "toast.couldNotRead": "无法读取神经元单元 {id}：{error}", "toast.noReadableFiles": "所选文件夹没有提供可读取文件", "toast.noRecordings": "未找到 KiloSort 记录文件夹", "toast.couldNotIndex": "无法索引 KiloSort 记录", "toast.droppedError": "无法读取拖入的文件夹：{error}", "toast.databaseUnavailable": "数据库服务不可用：{error}", "loading.filesReceived": "已接收 {count} 个文件，正在查找 KiloSort 记录。", "loading.noRequiredFiles": "没有文件夹同时包含 spike_times.npy、spike_clusters.npy 和 params.py。", "loading.checkCandidates": "正在检查 {count} 条候选记录，不加载其大型数组。", "loading.checkRecording": "正在检查记录 {current}/{total}。", "loading.nonePassed": "发现了 KiloSort 候选目录，但没有一个通过结构检查。", "loading.folderReady": "文件夹已就绪", "loading.recordingsDetected": "检测到 {count} 条记录。请选择一个神经元单元开始。", "loading.openingDatabase": "正在打开数据库", "loading.databaseCatalog": "正在读取本地 SQLite 目录并准备神经元单元列表。", "loading.databaseIndexed": "已索引 {recordings} 条记录和 {units} 个神经元单元。请选择一个开始。", "loading.readingFolder": "正在读取文件夹", "loading.collectingFiles": "正在收集拖入目录中的文件。", "toast.databaseReady": "数据库已就绪 · 目录查询 {time} 毫秒", "toast.supplementTargetMissing": "目标记录已不可用", "toast.noMatchingSupplement": "所选内容不包含当前缺失的数据类型", "toast.wrongRecording": "{file} 属于 {recording}，而不是 {expected}", "toast.duplicateSelection": "所选内容包含多个 {file}", "toast.supplementUpload": "正在上传 {current}/{total} · {file}", "toast.supplementCommit": "正在校验并提交补充数据", "toast.supplementReady": "补充完成 · 新增 {added} 项 · 忽略 {duplicates} 个重复项", "toast.supplementFailed": "补充数据被拒绝：{error}"
    ,"review.manual": "行为与神经同步检查"
    ,"video.aria": "同步行为视频"
    ,"video.kicker": "行为视频 · 共用神经时间"
    ,"video.sourcePrompt": "尚未连接视频源"
    ,"video.noSource": "无视频源"
    ,"video.collapse": "折叠视频"
    ,"video.expand": "展开视频"
    ,"video.syntheticAria": "确定性小鼠行为验证视频"
    ,"video.emptyTitle": "没有可用的行为视频"
    ,"video.emptyDescription": "可生成确定性验证视频或连接本地视频，无需实验室原始视频。"
    ,"video.generate": "生成验证视频"
    ,"video.choose": "连接本地视频"
    ,"video.previousFrame": "上一帧"
    ,"video.nextFrame": "下一帧"
    ,"video.play": "播放"
    ,"video.pause": "暂停"
    ,"video.seekAria": "视频时间"
    ,"video.speed": "速度"
    ,"video.speedAria": "播放速度"
    ,"video.follow": "跟随信号"
    ,"video.frame": "帧"
    ,"video.neuralTime": "神经时间"
    ,"video.offset": "偏移（秒）"
    ,"video.offsetAria": "视频到神经时间的秒偏移"
    ,"video.playhead": "视频"
    ,"video.verified": "已验证"
    ,"video.unverified": "未验证"
    ,"video.syntheticClock": "合成时钟"
    ,"video.method.ttl": "TTL"
    ,"video.method.frame_timestamps": "逐帧时间戳"
    ,"video.method.manual_offset": "手动偏移"
    ,"video.method.linear_clock_fit": "线性时钟拟合"
    ,"video.method.unknown": "未知映射"
    ,"video.localFile": "本地视频"
    ,"video.databaseVideo": "数据库视频"
    ,"video.loadError": "浏览器无法解码此视频"
    ,"video.playBlocked": "浏览器阻止了视频播放"
    ,"video.behavior": "行为"
    ,"raw.port": "RAW VOLTAGE 扩展端口"
    ,"raw.notAttached": "接口就绪 · 无读取器"
    ,"tips.manualReview": "是什么：行为视频与已打开神经元单元的放电栅格图、分箱放电频率共用时间。怎么看：绿色视频游标标出同一个神经时间；单击信号可反向定位视频。什么时候使用：把可见行为与放电模式对齐，并比较多个神经元单元在同一时刻的活动。"
  };

  const ES = {
    "app.noFolder": "Ninguna carpeta cargada", "app.theme": "TEMA", "app.language": "IDIOMA", "app.languageAria": "Idioma del Explorer", "app.themeAria": "Tema del Explorer", "app.help": "AYUDA", "app.dataDetails": "DETALLES DE DATOS", "app.openFolder": "ABRIR CARPETA",
    "theme.dark": "Oscuro", "theme.light": "Claro", "theme.contrast": "Alto contraste", "theme.system": "Sistema",
    "empty.drop": "ARRASTRE LA CARPETA DE SESIÓN", "empty.description": "Los registros de KiloSort y los grupos de Sondas físicas se detectan automáticamente.", "empty.choose": "ELEGIR CARPETA", "empty.aria": "Arrastrar o elegir una carpeta de datos Neuropixels",
    "loading.inspectTitle": "Inspeccionando carpeta", "loading.inspectMessage": "Buscando registros de KiloSort y metadatos legibles.",
    "summary.aria": "Resumen de datos cargados", "summary.recordings": "REGISTROS", "summary.units": "UNIDADES", "summary.spikes": "POTENCIALES", "summary.indexed": "INDEXADO",
    "status.summary": "Estado de datos", "status.title": "ESTADO DE DATOS", "status.loadedDataset": "Conjunto de datos cargado", "status.close": "Cerrar estado de datos", "status.detailAria": "Estado detallado de datos", "status.available": "DISPONIBLE", "status.missing": "FALTANTE", "status.invalid": "NO VÁLIDO", "status.optional": "OPCIONAL", "status.future": "FUTURO / VÍDEO",
    "status.noneAvailable": "No hay entradas principales disponibles.", "status.noneMissing": "No faltan entradas principales.", "status.noneInvalid": "No hay registros candidatos no válidos.", "status.noneOptional": "No se han definido entradas opcionales.", "status.noneFuture": "No se han definido interfaces futuras.",
    "status.summaryCounts": "Estado de datos · {available} disponibles · {missing} faltantes", "status.summaryInvalid": " · {invalid} no válidos", "status.recordingContext": "{dataset} · {count} registro(s)", "status.addFiles": "AÑADIR ARCHIVOS", "status.addFolder": "AÑADIR CARPETA",
    "status.file.spikeTiming": "Tiempos de potenciales", "status.file.spikeTimingDetail": "spike_times.npy y spike_clusters.npy detectados", "status.file.quality": "Etiquetas de calidad de KiloSort", "status.file.qualityDetail": "Etiquetas detectadas en tablas cluster", "status.file.amplitude": "Amplitudes de potenciales", "status.file.amplitudeDetail": "amplitudes.npy detectado", "status.file.position": "Posiciones de Unidades", "status.file.positionDetail": "spike_positions.npy detectado", "status.file.template": "Plantillas de KiloSort", "status.file.templateDetail": "templates.npy y spike_templates.npy detectados", "status.file.geometry": "Geometría de canales", "status.file.geometryDetail": "channel_positions.npy detectado", "status.file.probeGrouping": "Agrupación de Sondas físicas", "status.file.probeGroupingDetail": "channel_shanks.npy detectado", "status.file.region": "Mapeo cerebral de Unidades", "status.file.regionAvailable": "{count} mapeos de Unidades", "status.file.regionMissing": "Legacy Table opcional no proporcionada", "status.file.track": "Trayecto cerebral de la Sonda", "status.file.trackAvailable": "{count} filas en {probes} Sonda(s) física(s)", "status.file.trackMissing": "CSV opcional profundidad-región no proporcionado", "status.file.video": "Vídeo conductual sincronizado", "status.file.videoDetail": "Interfaz reservada; no se ha cargado vídeo", "status.file.rawVoltage": "Voltaje continuo sin procesar", "status.file.rawVoltageDetail": "Interfaz reservada; continuous.dat es externo a las salidas de KiloSort", "status.file.invalid": "Candidato ilegible", "status.file.missingAcross": "Falta en uno o más registros", "status.file.availableAcross": "Disponible en todos los registros cargados",
    "recordings.aria": "Registros detectados", "recordings.previous": "Registros anteriores", "recordings.next": "Registros siguientes", "units.title": "UNIDADES", "units.aria": "Unidades", "units.availableAria": "Unidades disponibles", "units.searchLabel": "Buscar Unidades", "units.searchPlaceholder": "Buscar ID o región", "units.filterAria": "Filtrar Unidades por etiqueta de KiloSort", "units.filterCaption": "Etiqueta de KiloSort", "units.all": "TODAS", "units.good": "GOOD", "units.mua": "MUA", "units.help": "CLIC abrir solo · CTRL+CLIC añadir · CLIC DERECHO opciones", "units.none": "Ninguna Unidad coincide con el filtro actual.", "units.unmapped": "Sin mapear", "units.loading": "LEYENDO", "units.open": "abierta", "units.rowAria": "Abrir Unidad {id}. Ctrl más clic la añade a la vista actual.", "units.loadingAria": "Cargando Unidad {id}", "units.countMeta": "{count} Unidades · {duration} s",
    "layout.unitSplitter": "Cambiar el ancho de Unidades y el área de señales", "layout.probeSplitter": "Cambiar el ancho del área de señales y el Inspector de Sonda", "layout.collapsed": "Plegado", "layout.pixels": "{width} píxeles", "layout.resizeTitle": "Arrastre o use las flechas para cambiar el tamaño; doble clic o Home restablece.", "layout.panelUnits": "panel de Unidades", "layout.panelProbe": "panel del Inspector de Sonda", "layout.expand": "Expandir", "layout.collapse": "Plegar",
    "review.aria": "Revisión de la Unidad seleccionada", "review.focused": "UNIDAD EN FOCO", "review.select": "Seleccione una Unidad para inspeccionar sus potenciales de acción.", "review.idle": "INACTIVO", "review.noOpen": "Ninguna Unidad abierta", "review.noSelected": "Ninguna Unidad seleccionada", "review.selectSignal": "Seleccione una señal para inspeccionar sus detalles y posición física.", "review.loading": "cargando los potenciales seleccionados", "review.reading": "LEYENDO", "review.ready": "LISTO", "review.mainThread": "LISTO · HILO PRINCIPAL", "review.database": "LISTO · BASE DE DATOS", "review.error": "ERROR", "review.manual": "REVISIÓN MANUAL DE POTENCIALES", "review.noUnitsHint": "Ninguna Unidad abierta · seleccione una a la izquierda", "review.oneUnitHint": "1 Unidad abierta · haga clic en otra para reemplazar · Ctrl+clic para añadir", "review.manyUnitsHint": "{count} Unidades abiertas · {linkState}", "review.linkedAxes": "ejes temporales vinculados", "review.independentAxes": "ejes temporales independientes", "review.empty": "Seleccione una Unidad a la izquierda para abrir su señal.", "review.unitPlaceholder": "Unidad —", "review.selectFromList": "Seleccione una Unidad de la lista", "review.selectUnit": "Seleccione una Unidad", "review.regionUnmapped": "región cerebral sin mapear", "review.regionShortUnmapped": "región sin mapear", "review.recordingDuration": "registro de {duration} s", "review.peakChannelUnavailable": "canal de pico no disponible", "review.peakChannel": "canal de pico {channel}", "review.templateLabel": "Plantilla {template} · {channel}{depth} · u.a.", "review.templateDefault": "Canal de pico · unidades arbitrarias", "review.closePrimarySignal": "Cerrar señal principal", "review.closeSignalTitle": "Cerrar esta señal", "review.closeUnitSignal": "Cerrar señal de la Unidad {id}", "review.detailsFor": "DETALLES DE", "review.fullRecording": "UNIDAD PRINCIPAL · REGISTRO COMPLETO", "review.overviewHint": "Haga clic o arrastre para mover la ventana detallada", "review.interactionHint": "CURSOR inspeccionar tiempo · ZOOM arrastrar o rueda en la señal · PAN arrastrar o rueda en el tiempo · DOBLE CLIC restablecer",
    "controls.timeLinked": "TIEMPO VINCULADO", "controls.timeIndependent": "TIEMPO INDEPENDIENTE", "controls.cursor": "CURSOR", "controls.zoom": "ZOOM", "controls.pan": "PAN", "controls.back": "ATRÁS", "controls.reset": "RESTABLECER", "controls.zoomOut": "Alejar", "controls.zoomIn": "Acercar", "controls.linkedTitle": "Vinculado: ampliar y desplazar juntas todas las Unidades abiertas", "controls.independentTitle": "Independiente: ampliar y desplazar solo la señal enfocada", "controls.cursorTitle": "Modo Cursor: inspeccionar el tiempo sin cambiar la vista", "controls.zoomTitle": "Modo Zoom: arrastrar en la señal o usar la rueda alrededor del puntero", "controls.panTitle": "Modo Pan: arrastrar en la señal o usar la rueda para recorrer el tiempo", "controls.backTitle": "Volver a la vista temporal anterior",
    "plots.amplitude": "ESTABILIDAD DE AMPLITUD", "plots.amplitudeSubtitle": "Amplitud relativa durante el registro", "plots.acg": "AUTOCORRELOGRAMA", "plots.acgSubtitle": "±100 ms · bins de 2 ms", "plots.template": "PLANTILLA KILOSORT", "plots.notAvailable": "No disponible", "plots.detailAria": "Raster detallado y tasa de disparo", "plots.overviewAria": "Vista general de densidad de potenciales del registro", "plots.amplitudeAria": "Amplitud de potenciales en el tiempo", "plots.acgAria": "Autocorrelograma de la Unidad", "plots.templateAria": "Forma de onda de plantilla KiloSort",
    "metrics.spikes": "POTENCIALES", "metrics.meanRate": "TASA MEDIA", "metrics.isi": "ISI < 2 MS", "metrics.presence": "PRESENCIA", "metrics.ksAmplitude": "AMPLITUD KS", "metrics.ksContam": "CONTAM. KS",
    "probe.panelAria": "Sondas físicas y ubicación cerebral", "probe.title": "SONDAS FÍSICAS", "probe.noData": "Sin datos de Sonda", "probe.unmapped": "SIN MAPEAR", "probe.canvasAria": "Vista de Sondas físicas, trayecto cerebral y posiciones de Unidades", "probe.overlapAria": "Unidades superpuestas a esta profundidad de Sonda", "probe.unitsAtDepth": "UNIDADES A ESTA PROFUNDIDAD", "probe.overlapHint": "Clic para abrir · Ctrl+clic para añadir", "probe.regions": "REGIONES CEREBRALES", "probe.channels": "MARCAS DE CANAL", "probe.units": "UNIDADES", "probe.layersAria": "Capas de visualización de Sonda", "probe.legendAria": "Unidades mostradas en la Sonda", "probe.physical": "SONDA FÍSICA", "probe.peakChannel": "CANAL DE PICO", "probe.xPosition": "POSICIÓN X", "probe.depth": "PROFUNDIDAD", "probe.regionSource": "FUENTE DE REGIÓN", "probe.selectNote": "Seleccione una Unidad o un marcador de Sonda para inspeccionar la señal vinculada.", "probe.nearby": "UNIDADES CERCANAS", "probe.nearbyAria": "Unidades cercanas", "probe.clickPosition": "Haga clic en una posición de Sonda", "probe.positionContract": "CONTRATO DE POSICIÓN", "probe.ready": "LISTO", "probe.track": "TRAYECTO", "probe.groupSource": "Grupos de Sondas físicas de", "probe.regionSourceLegacy": "Región de la Unidad de la Legacy Table cargada", "probe.noTrack": "Sin mapeo Sonda-región compatible", "probe.requiredColumns": "Columnas CSV requeridas:", "probe.recommendedColumns": "Recomendadas:", "probe.sessionTracks": "para trayectos específicos de sesión.", "probe.channelUnavailable": "canal no disponible", "probe.unavailable": "No disponible", "probe.singular": "Sonda", "probe.groupingUnavailable": "Agrupación de Sondas no disponible", "probe.noRegionRow": "Sin fila de región compatible", "probe.addTrackNote": "Se detectaron {count} grupos de Sondas físicas. Añada un CSV Sonda-región compatible para dibujar bandas anatómicas.", "probe.trackStatus": "{source} · {rows} filas de electrodos · {probes} Sondas", "probe.unitLabel": "Unidad {id}", "probe.overlapDescription": "{count} Unidades superpuestas · Sonda {probe} · {minimum}–{maximum} µm · clic para elegir", "probe.stackTitle": "{count} UNIDADES · SONDA {probe}", "probe.focused": "en foco", "probe.count": "{count} Sonda(s) física(s) · {status}", "probe.trackReady": "trayecto regional disponible", "probe.openUnits": "{count} Unidad(es) abierta(s)", "probe.selected": "Unidad {id} · {recording}", "probe.bandSource": "Las bandas cerebrales proceden de {source}. Las marcas tenues son canales y los círculos son Unidades seleccionables.", "probe.noNearby": "Ninguna Unidad cercana seleccionada", "probe.nearbyMeta": "{quality} · {region}", "probe.locatedToast": "Unidad {id} localizada en la Sonda",
    "context.title": "Acciones de Unidad", "context.aria": "Acciones de Unidad", "context.openOnly": "Abrir solo", "context.add": "Añadir a la vista actual", "context.remove": "Quitar de la vista", "context.locate": "Localizar en la Sonda",
    "dialog.title": "DETALLES DE DATOS", "dialog.close": "Cerrar", "dialog.databaseCatalog": "CATÁLOGO DE BASE DE DATOS", "dialog.folderSummary": "RESUMEN DE CARPETA", "dialog.filesReceived": "ARCHIVOS RECIBIDOS", "dialog.filesUsed": "ARCHIVOS USADOS DIRECTAMENTE", "dialog.kilosortSize": "TAMAÑO DE DATOS KILOSORT", "dialog.validRecordings": "REGISTROS VÁLIDOS", "dialog.listedUnits": "UNIDADES LISTADAS", "dialog.regionMappings": "MAPEOS DE REGIÓN", "dialog.readableContent": "CONTENIDO LEGIBLE", "dialog.spikeTiming": "TIEMPOS DE POTENCIALES", "dialog.unitAssignment": "ASIGNACIÓN DE UNIDAD", "dialog.quality": "CALIDAD", "dialog.amplitude": "AMPLITUD", "dialog.spatialPosition": "POSICIÓN ESPACIAL", "dialog.waveform": "FORMA DE ONDA", "dialog.databaseNote": "Los metadatos de Registro, Unidad, región, Sonda y recursos se consultan en SQLite. El servicio local lee arrays con una caché de dos Registros y el navegador recibe solo el resultado de la Unidad seleccionada.", "dialog.folderNote": "Las cargas NPY grandes solo se leen para el Registro activo en segundo plano. Se indexa la carpeta completa, pero no se mantienen todos los experimentos simultáneamente en memoria.", "dialog.brainMapping": "MAPEO DE REGIÓN CEREBRAL", "dialog.unitRegionRows": "FILAS UNIDAD-REGIÓN", "dialog.probeTrackRows": "FILAS DE TRAYECTO", "dialog.physicalProbes": "SONDAS FÍSICAS", "dialog.trackSource": "FUENTE DEL TRAYECTO", "dialog.requiredColumns": "COLUMNAS REQUERIDAS", "dialog.recommendedJoin": "UNIÓN RECOMENDADA", "dialog.notProvided": "No proporcionado", "dialog.mappingNote": "Un CSV compatible mapea el electrodo o la profundidad de Sonda a una región y un color opcional. pinpoint_parsed.csv aporta este mapeo a nivel de electrodo, pero no coordenadas Allen CCF x/y/z completas; una vista cerebral 3D futura necesita un trayecto registrado o coordenadas de canales en el atlas.", "dialog.recordings": "REGISTROS", "dialog.recording": "Registro", "dialog.units": "Unidades", "dialog.spikes": "Potenciales", "dialog.duration": "Duración", "dialog.size": "Tamaño", "dialog.unreadable": "{count} carpeta(s) candidata(s) no eran legibles:", "dialog.rawVoltage": "VOLTAJE SIN PROCESAR", "dialog.rawVoltageNote": "Las carpetas KiloSort contienen salidas de clasificación. Sus params.py remiten a rutas continuous.dat externas, pero el voltaje sin procesar no está dentro. Por tanto, el gráfico principal se etiqueta como tiempos de potenciales y no como señal de voltaje bruto.", "drop.open": "SUELTE PARA ABRIR LA CARPETA", "help.title": "GUÍA DE USO", "help.close": "Cerrar guía de uso", "help.drawerAria": "Guía de uso de Neuropixels Explorer", "help.currentLanguage": "El idioma de la guía sigue el idioma del Explorer.", "help.tipAria": "Explicar {topic}", "tooltip.what": "Qué es", "tooltip.read": "Cómo interpretarlo", "tooltip.use": "Cuándo usarlo",
    "tips.dataStatus": "Qué es: una auditoría compacta de archivos e interfaces detectados en el conjunto actual. Cómo interpretarlo: abra el panel para separar entradas disponibles, faltantes, no válidas, opcionales y futuras. Cuándo usarlo: después de cargar datos o antes de interpretar un gráfico ausente.", "tips.unitList": "Qué es: las Unidades del registro KiloSort seleccionado. Cómo interpretarlo: cada fila muestra calidad, región mapeada, tasa de disparo y número de potenciales cuando están disponibles. Cuándo usarlo: clic para reemplazar, Ctrl+clic para comparar o clic derecho para más acciones.", "tips.qualityFilter": "Qué es: un filtro basado en la etiqueta cluster de KiloSort. Cómo interpretarlo: Good, MUA y otras etiquetas son categorías del clasificador o curador, no conclusiones biológicas. Cuándo usarlo: para reducir una lista larga sin borrar datos.", "tips.manualReview": "Qué es: vistas sincronizadas de raster y tasa de disparo agrupada para las Unidades abiertas. Cómo interpretarlo: las marcas verticales son tiempos de potenciales y la curva inferior es la tasa; ventanas iguales permiten comparar. Cuándo usarlo: para revisar patrones, estabilidad y coactividad temporal.", "tips.timeLink": "Qué es: controla si la navegación se comparte entre Unidades abiertas. Cómo interpretarlo: Vinculado aplica Zoom, Pan, Atrás y Restablecer a todas; Independiente solo a la señal enfocada. Cuándo usarlo: vincule para comparar directamente y desvincule para usar otra escala.", "tips.cursor": "Qué es: un cursor temporal de solo lectura. Cómo interpretarlo: muévalo sobre una señal para ver el tiempo sin cambiar el rango. Cuándo usarlo: para identificar un evento cuando la ventana ya es adecuada.", "tips.zoom": "Qué es: cambia el intervalo temporal visible. Cómo interpretarlo: arrastre un rectángulo o use la rueda alrededor del puntero; un intervalo menor revela más detalle. Cuándo usarlo: para revisar potenciales densos o eventos breves.", "tips.pan": "Qué es: desplaza la ventana temporal sin cambiar su tamaño. Cómo interpretarlo: arrastre horizontalmente; sobre una señal, rueda abajo avanza y rueda arriba retrocede. Cuándo usarlo: para recorrer periodos adyacentes con escala fija.", "tips.overview": "Qué es: una vista comprimida del registro completo. Cómo interpretarlo: el marco indica el intervalo mostrado arriba. Cuándo usarlo: para saltar a otra parte del registro o situar la ventana actual.", "tips.amplitude": "Qué es: la amplitud relativa de los potenciales durante el registro. Cómo interpretarlo: cambios persistentes o pérdidas pueden indicar inestabilidad, pero no son un criterio automático de rechazo. Cuándo usarlo: para revisar la consistencia de detección.", "tips.autocorrelogram": "Qué es: un histograma de diferencias temporales entre potenciales de la misma Unidad. Cómo interpretarlo: el centro y los retardos cortos ayudan a revisar el periodo refractario y la ritmicidad. Cuándo usarlo: para revisar aislamiento y dinámica junto con otras evidencias.", "tips.template": "Qué es: la plantilla KiloSort asignada con mayor frecuencia a la Unidad. Cómo interpretarlo: la forma y el canal de pico resumen la onda espaciotemporal en unidades arbitrarias. Cuándo usarlo: para comparar morfología y comprobar localización.", "tips.probe": "Qué es: la disposición física de Sondas, bandas cerebrales opcionales, canales y marcadores de Unidades. Cómo interpretarlo: las Unidades abiertas comparten color con las señales y la enfocada tiene anillo blanco, línea de profundidad y etiqueta fija. Cuándo usarlo: para relacionar la señal con profundidad, canal, Sonda y región mapeada.", "tips.nearbyUnits": "Qué es: las Unidades más próximas a la posición bloqueada de Sonda. Cómo interpretarlo: la distancia en micrómetros no implica por sí sola similitud funcional. Cuándo usarlo: para abrir comparaciones con contexto espacial.", "tips.positionContract": "Qué es: la procedencia y columnas mínimas del mapeo anatómico. Cómo interpretarlo: KiloSort aporta señal y geometría; Legacy Table aporta anotaciones cerebrales opcionales. Cuándo usarlo: para diagnosticar Unidades sin mapear o preparar un CSV compatible.", "tips.metricSpikes": "Qué es: el número de potenciales asignados a la Unidad. Cómo interpretarlo: considérelo con la duración y la tasa de disparo. Cuándo usarlo: para comprobar el tamaño de muestra antes de confiar en un gráfico disperso.", "tips.metricRate": "Qué es: la tasa media de disparo del registro completo. Cómo interpretarlo: promedia variaciones temporales y debe verse con la curva temporal. Cuándo usarlo: para comparar actividad global entre Unidades.", "tips.metricIsi": "Qué es: el porcentaje de potenciales adyacentes separados por menos de 2 ms. Cómo interpretarlo: valores altos pueden sugerir contaminación o fisiología no estándar, según el contexto. Cuándo usarlo: como un indicador de calidad, no un veredicto único.", "tips.metricPresence": "Qué es: la fracción de intervalos del registro en que se detecta la Unidad. Cómo interpretarlo: alta presencia sugiere cobertura; baja puede reflejar silencio, deriva o pérdida de detección. Cuándo usarlo: para evaluar estabilidad temporal.", "tips.metricAmplitude": "Qué es: el resumen de amplitud de KiloSort para la Unidad. Cómo interpretarlo: depende de la escala del conjunto y requiere calibración para comparar registros. Cuándo usarlo: para revisar fuerza relativa dentro de un registro.", "tips.metricContam": "Qué es: la estimación de contaminación de KiloSort cuando existe. Cómo interpretarlo: menor suele ser más limpio, pero depende de supuestos del clasificador. Cuándo usarlo: junto con ISI, forma de onda, amplitud y revisión manual.",
    "toast.removed": "Unidad {id} eliminada de la vista actual", "toast.added": "Unidad {id} añadida a la vista actual", "toast.maxUnits": "Ya hay {count} Unidades abiertas. Quite una antes de añadir otra.", "toast.recordingsReady": "{count} registros listos", "toast.probePosition": "Sonda {probe} · {region} · {depth} µm · Unidades cercanas mostradas", "toast.couldNotAdd": "No se pudo añadir la Unidad {id}: {error}", "toast.couldNotRead": "No se pudo leer la Unidad {id}: {error}", "toast.noReadableFiles": "La carpeta elegida no proporcionó archivos legibles", "toast.noRecordings": "No se encontraron carpetas de Registro KiloSort", "toast.couldNotIndex": "No se pudieron indexar los Registros KiloSort", "toast.droppedError": "No se pudo leer la carpeta arrastrada: {error}", "toast.databaseUnavailable": "Servicio de base de datos no disponible: {error}", "loading.filesReceived": "{count} archivos recibidos. Buscando Registros KiloSort.", "loading.noRequiredFiles": "Ninguna carpeta contiene spike_times.npy, spike_clusters.npy y params.py.", "loading.checkCandidates": "Comprobando {count} Registros candidatos sin cargar sus arrays grandes.", "loading.checkRecording": "Comprobando Registro {current}/{total}.", "loading.nonePassed": "Se encontraron candidatos KiloSort, pero ninguno superó las comprobaciones estructurales.", "loading.folderReady": "Carpeta lista", "loading.recordingsDetected": "{count} Registros detectados. Seleccione una Unidad para comenzar.", "loading.openingDatabase": "Abriendo base de datos", "loading.databaseCatalog": "Leyendo el catálogo SQLite local y preparando la lista de Unidades.", "loading.databaseIndexed": "{recordings} Registros y {units} Unidades indexados. Seleccione una Unidad para comenzar.", "loading.readingFolder": "Leyendo carpeta", "loading.collectingFiles": "Recopilando archivos del directorio arrastrado.", "toast.databaseReady": "Base de datos lista · consulta de catálogo {time} ms", "toast.supplementTargetMissing": "El Registro de destino ya no está disponible", "toast.noMatchingSupplement": "La selección no contiene el tipo de archivo faltante solicitado", "toast.wrongRecording": "{file} pertenece a {recording}, no a {expected}", "toast.duplicateSelection": "La selección contiene más de una copia de {file}", "toast.supplementUpload": "Subiendo {current}/{total} · {file}", "toast.supplementCommit": "Validando y confirmando el suplemento", "toast.supplementReady": "Suplemento completo · {added} añadido(s) · {duplicates} duplicado(s) ignorado(s)", "toast.supplementFailed": "Suplemento rechazado: {error}"
    ,"status.future": "FLUJOS / EXTENSIONES"
    ,"status.file.videoDetail": "Visor sincronizado listo · vídeo de validación determinista disponible"
    ,"status.file.videoDetected": "Vídeo detectado · visualización sincronizada disponible"
    ,"status.file.rawVoltageDetail": "Contrato de extensión listo · sin proveedor de voltaje bruto"
    ,"status.file.rawVoltageDetected": "Voltaje bruto detectado · sin proveedor de lectura"
    ,"review.manual": "REVISIÓN SINCRONIZADA DE CONDUCTA Y ACTIVIDAD NEURAL"
    ,"video.aria": "Vídeo de conducta sincronizado"
    ,"video.kicker": "VÍDEO DE CONDUCTA · TIEMPO NEURAL COMPARTIDO"
    ,"video.sourcePrompt": "Sin fuente de vídeo conectada"
    ,"video.noSource": "SIN FUENTE"
    ,"video.collapse": "Contraer vídeo"
    ,"video.expand": "Expandir vídeo"
    ,"video.syntheticAria": "Vídeo sintético determinista de conducta de ratón"
    ,"video.emptyTitle": "NO HAY VÍDEO DE CONDUCTA"
    ,"video.emptyDescription": "Genere un vídeo determinista de validación o conecte un vídeo local. No se requiere vídeo del laboratorio."
    ,"video.generate": "GENERAR VÍDEO DE VALIDACIÓN"
    ,"video.choose": "CONECTAR VÍDEO LOCAL"
    ,"video.previousFrame": "Fotograma anterior"
    ,"video.nextFrame": "Fotograma siguiente"
    ,"video.play": "Reproducir"
    ,"video.pause": "Pausar"
    ,"video.seekAria": "Tiempo del vídeo"
    ,"video.speed": "VELOCIDAD"
    ,"video.speedAria": "Velocidad de reproducción"
    ,"video.follow": "SEGUIR SEÑAL"
    ,"video.frame": "FOTOGRAMA"
    ,"video.neuralTime": "TIEMPO NEURAL"
    ,"video.offset": "DESFASE (S)"
    ,"video.offsetAria": "Desfase entre vídeo y tiempo neural en segundos"
    ,"video.playhead": "VÍDEO"
    ,"video.verified": "VERIFICADO"
    ,"video.unverified": "NO VERIFICADO"
    ,"video.syntheticClock": "RELOJ SINTÉTICO"
    ,"video.method.ttl": "TTL"
    ,"video.method.frame_timestamps": "MARCAS DE FOTOGRAMA"
    ,"video.method.manual_offset": "DESFASE MANUAL"
    ,"video.method.linear_clock_fit": "AJUSTE LINEAL DE RELOJ"
    ,"video.method.unknown": "MAPEO DESCONOCIDO"
    ,"video.localFile": "VÍDEO LOCAL"
    ,"video.databaseVideo": "VÍDEO DE BASE DE DATOS"
    ,"video.loadError": "El navegador no pudo decodificar el vídeo"
    ,"video.playBlocked": "El navegador bloqueó la reproducción"
    ,"video.behavior": "CONDUCTA"
    ,"raw.port": "PUERTO RAW VOLTAGE"
    ,"raw.notAttached": "EXTENSIÓN LISTA · SIN PROVEEDOR"
    ,"tips.manualReview": "Qué es: vídeo de conducta sobre vistas sincronizadas de raster y tasa de disparo. Cómo interpretarlo: el cursor verde de Vídeo marca un único tiempo neural y un clic en la señal desplaza el vídeo. Cuándo usarlo: para alinear conducta visible con disparos y comparar varias Unidades en el mismo instante."
  };

  const PROBE_LAYOUT_COPY = {
    en: {
      "empty.description": "KiloSort recordings and shank geometry are detected automatically.",
      "status.file.probeGrouping": "Shank grouping",
      "status.file.track": "Shank brain-region tracks",
      "status.file.trackAvailable": "{count} rows across {probes} shank track(s)",
      "status.file.trackMissing": "Optional shank depth-to-region CSV not provided",
      "layout.probeSplitter": "Collapse or expand the Probe Inspector",
      "layout.probeRailTitle": "Collapse or expand the Probe Inspector.",
      "layout.probeHeightSplitter": "Adjust Probe diagram height",
      "layout.probeHeightHandle": "DRAG TO ADJUST HEIGHT",
      "layout.probeHeightTitle": "Drag vertically or use Up and Down arrows to adjust Probe height. Double-click or press Home to reset.",
      "probe.panelAria": "One physical Probe, its shanks, and brain-region location",
      "probe.title": "PROBE INSPECTOR",
      "probe.canvasAria": "One physical Probe with four shanks, brain-region tracks, and Unit positions",
      "probe.physical": "PROBE / SHANK",
      "probe.groupSource": "Shank groups from",
      "probe.probeOne": "PROBE 1",
      "probe.groupUnavailable": "Shank data unavailable",
      "probe.groupSummary": "{shanks} shanks · {units} Units",
      "probe.probeShank": "Probe {probe} · Shank {shank}",
      "probe.shankShort": "SHANK {shank}",
      "probe.unitCountShort": "{count} UNITS",
      "probe.groupingUnavailable": "Shank grouping unavailable",
      "probe.noTrack": "No compatible shank-region mapping",
      "probe.selectNote": "Select a Unit or click a Shank marker to inspect the linked signal.",
      "probe.clickPosition": "Click a Shank position",
      "probe.positionContract": "POSITION MAPPING",
      "probe.addTrackNote": "{count} shank group(s) detected on Probe 1. Add a compatible shank-region CSV to draw anatomical bands.",
      "probe.trackStatus": "{source} · {rows} electrode rows · {probes} shank tracks",
      "probe.overlapDescription": "{count} overlapping Units · Shank {shank} · {minimum}–{maximum} µm · click to choose",
      "probe.stackTitle": "{count} UNITS · SHANK {shank}",
      "probe.count": "1 physical Probe · {shanks} shanks · {status}",
      "toast.probePosition": "Probe {probe} · Shank {shank} · {region} · {depth} µm · nearby Units shown",
      "tips.probe": "What it is: one physical Probe containing four shanks, with optional brain bands, channel ticks, and Unit markers. How to read it: open Units share signal colors; the focused Unit has a white ring and depth line. When to use it: relate a signal to its shank, depth, channel, and mapped region."
    },
    "zh-CN": {
      "empty.description": "自动检测 KiloSort 记录与 shank 几何信息。",
      "status.file.probeGrouping": "Shank 分组",
      "status.file.track": "Shank 脑区轨迹",
      "status.file.trackAvailable": "{probes} 条 shank 轨迹，共 {count} 行",
      "status.file.trackMissing": "未提供可选的 shank 深度—脑区 CSV",
      "layout.probeSplitter": "折叠或展开探针检查器",
      "layout.probeRailTitle": "折叠或展开探针检查器。",
      "layout.probeHeightSplitter": "调整探针图高度",
      "layout.probeHeightHandle": "拖动以调整高度",
      "layout.probeHeightTitle": "上下拖动或使用上/下方向键调整探针图高度；双击或按 Home 恢复默认值。",
      "probe.panelAria": "单根物理探针、其 shank 与脑区位置",
      "probe.title": "探针检查器",
      "probe.canvasAria": "单根物理探针上的四个 shank、脑区轨迹与神经元单元位置",
      "probe.physical": "探针 / SHANK",
      "probe.groupSource": "Shank 分组来源：",
      "probe.probeOne": "探针 1",
      "probe.groupUnavailable": "Shank 数据不可用",
      "probe.groupSummary": "{shanks} 个 shank · {units} 个神经元单元",
      "probe.probeShank": "探针 {probe} · Shank {shank}",
      "probe.shankShort": "SHANK {shank}",
      "probe.unitCountShort": "{count} UNITS",
      "probe.groupingUnavailable": "Shank 分组不可用",
      "probe.noTrack": "没有兼容的 shank—脑区映射",
      "probe.selectNote": "选择神经元单元或单击 shank 标记以检查关联信号。",
      "probe.clickPosition": "单击 shank 位置",
      "probe.positionContract": "位置映射",
      "probe.addTrackNote": "探针 1 检测到 {count} 个 shank 分组。添加兼容的 shank—脑区 CSV 后可绘制解剖色带。",
      "probe.trackStatus": "{source} · {rows} 行电极数据 · {probes} 条 shank 轨迹",
      "probe.overlapDescription": "{count} 个重叠神经元单元 · Shank {shank} · {minimum}–{maximum} µm · 单击选择",
      "probe.stackTitle": "{count} 个神经元单元 · SHANK {shank}",
      "probe.count": "1 根物理探针 · {shanks} 个 shank · {status}",
      "toast.probePosition": "探针 {probe} · Shank {shank} · {region} · {depth} µm · 已显示附近神经元单元",
      "tips.probe": "是什么：一根物理探针包含四个 shank，并叠加可选脑区色带、通道刻度和神经元单元标记。怎么看：已打开单元与信号同色，聚焦单元带白色外环和深度线。什么时候用：把信号对应到具体 shank、深度、通道和脑区。"
    },
    es: {
      "empty.description": "Los registros KiloSort y la geometría de shanks se detectan automáticamente.",
      "status.file.probeGrouping": "Agrupación de shanks",
      "status.file.track": "Trayectos shank-región cerebral",
      "status.file.trackAvailable": "{count} filas en {probes} trayecto(s) de shank",
      "status.file.trackMissing": "No se proporcionó el CSV opcional de profundidad-región del shank",
      "layout.probeSplitter": "Plegar o expandir el Inspector de Sonda",
      "layout.probeRailTitle": "Pliegue o expanda el Inspector de Sonda.",
      "layout.probeHeightSplitter": "Ajustar la altura del diagrama de Sonda",
      "layout.probeHeightHandle": "ARRASTRE PARA AJUSTAR LA ALTURA",
      "layout.probeHeightTitle": "Arrastre verticalmente o use las flechas arriba/abajo para ajustar la altura. Doble clic o Home restablece.",
      "probe.panelAria": "Una Sonda física, sus shanks y la ubicación cerebral",
      "probe.title": "INSPECTOR DE SONDA",
      "probe.canvasAria": "Una Sonda física con cuatro shanks, trayectos cerebrales y posiciones de Unidades",
      "probe.physical": "SONDA / SHANK",
      "probe.groupSource": "Grupos de shanks de",
      "probe.probeOne": "SONDA 1",
      "probe.groupUnavailable": "Datos de shank no disponibles",
      "probe.groupSummary": "{shanks} shanks · {units} Unidades",
      "probe.probeShank": "Sonda {probe} · Shank {shank}",
      "probe.shankShort": "SHANK {shank}",
      "probe.unitCountShort": "{count} UNIDADES",
      "probe.groupingUnavailable": "Agrupación de shanks no disponible",
      "probe.noTrack": "Sin mapeo shank-región compatible",
      "probe.selectNote": "Seleccione una Unidad o un marcador de shank para inspeccionar la señal vinculada.",
      "probe.clickPosition": "Haga clic en una posición de shank",
      "probe.positionContract": "MAPEO DE POSICIÓN",
      "probe.addTrackNote": "Se detectaron {count} grupos de shanks en la Sonda 1. Añada un CSV shank-región compatible para dibujar bandas anatómicas.",
      "probe.trackStatus": "{source} · {rows} filas de electrodos · {probes} trayectos de shank",
      "probe.overlapDescription": "{count} Unidades superpuestas · Shank {shank} · {minimum}–{maximum} µm · clic para elegir",
      "probe.stackTitle": "{count} UNIDADES · SHANK {shank}",
      "probe.count": "1 Sonda física · {shanks} shanks · {status}",
      "toast.probePosition": "Sonda {probe} · Shank {shank} · {region} · {depth} µm · Unidades cercanas mostradas",
      "tips.probe": "Qué es: una Sonda física con cuatro shanks, bandas cerebrales opcionales, canales y marcadores de Unidades. Cómo interpretarlo: las Unidades abiertas comparten color con las señales y la enfocada tiene anillo blanco y línea de profundidad. Cuándo usarlo: para relacionar la señal con shank, profundidad, canal y región."
    }
  };

  const EXPERIMENT_WORKSPACE_COPY = {
    en: {
      "workspace.aria": "Experiment activity, anatomy, and behavior workspace",
      "workspace.kicker": "EXPERIMENT OVERVIEW",
      "workspace.findUnit": "FIND UNIT",
      "workspace.findUnitAria": "Find a Unit in this experiment",
      "workspace.findUnitLabel": "UNIT ID, SHANK, REGION, OR KILOSORT LABEL",
      "workspace.findUnitPlaceholder": "e.g. 7, Shank 1, VISp, good",
      "workspace.findUnitResults": "Matching Units",
      "workspace.inspectUnit": "INSPECT UNIT",
      "workspace.closeInspector": "Close Unit inspector",
      "workspace.activityAria": "Recording-wide neural activity aligned with anatomy",
      "workspace.activityTitle": "ACTIVITY × ANATOMY",
      "workspace.activityLoading": "Preparing recording overview…",
      "workspace.legendAria": "Activity display semantics",
      "workspace.unitTexture": "Unit · within-Unit normalized",
      "workspace.aggregateTexture": "Group · fraction active",
      "workspace.canvasAria": "Recording-wide Unit activity with aligned shank, depth, and brain region",
      "workspace.activityEmpty": "No activity overview is available.",
      "workspace.hint": "CLICK a Unit to expand · CLICK anatomy to emphasize · DRAG time to select · WHEEL to zoom · DOUBLE CLICK to reset",
      "workspace.videoRegionAria": "Synchronized behavior region"
    },
    "zh-CN": {
      "workspace.aria": "实验活动、解剖与行为工作区",
      "workspace.kicker": "实验总览",
      "workspace.findUnit": "查找单元",
      "workspace.findUnitAria": "在本实验中查找神经元单元",
      "workspace.findUnitLabel": "单元 ID、SHANK、脑区或 KILOSORT 标签",
      "workspace.findUnitPlaceholder": "例如 7、Shank 1、VISp、good",
      "workspace.findUnitResults": "匹配的神经元单元",
      "workspace.inspectUnit": "深入检查单元",
      "workspace.closeInspector": "关闭神经元单元检查器",
      "workspace.activityAria": "与解剖位置对齐的全记录神经活动",
      "workspace.activityTitle": "神经活动 × 解剖位置",
      "workspace.activityLoading": "正在准备记录总览…",
      "workspace.legendAria": "活动显示语义",
      "workspace.unitTexture": "单元 · 单元内归一化",
      "workspace.aggregateTexture": "分组 · 活跃单元比例",
      "workspace.canvasAria": "与 shank、深度及脑区对齐的全记录单元活动",
      "workspace.activityEmpty": "没有可用的活动总览。",
      "workspace.hint": "单击单元展开 · 单击解剖信息强调 · 拖动选择时间 · 滚轮缩放 · 双击复位",
      "workspace.videoRegionAria": "同步行为视频区域"
    },
    es: {
      "workspace.aria": "Área de actividad, anatomía y conducta del experimento",
      "workspace.kicker": "VISTA GENERAL DEL EXPERIMENTO",
      "workspace.findUnit": "BUSCAR UNIDAD",
      "workspace.findUnitAria": "Buscar una Unidad en este experimento",
      "workspace.findUnitLabel": "ID, SHANK, REGIÓN O ETIQUETA KILOSORT",
      "workspace.findUnitPlaceholder": "p. ej. 7, Shank 1, VISp, good",
      "workspace.findUnitResults": "Unidades coincidentes",
      "workspace.inspectUnit": "INSPECCIONAR UNIDAD",
      "workspace.closeInspector": "Cerrar inspector de Unidad",
      "workspace.activityAria": "Actividad neural del registro alineada con la anatomía",
      "workspace.activityTitle": "ACTIVIDAD × ANATOMÍA",
      "workspace.activityLoading": "Preparando la vista general…",
      "workspace.legendAria": "Semántica de actividad mostrada",
      "workspace.unitTexture": "Unidad · normalizada dentro de la Unidad",
      "workspace.aggregateTexture": "Grupo · fracción activa",
      "workspace.canvasAria": "Actividad de Unidades alineada con shank, profundidad y región cerebral",
      "workspace.activityEmpty": "No hay una vista general de actividad disponible.",
      "workspace.hint": "CLIC en Unidad para expandir · CLIC en anatomía para resaltar · ARRASTRAR para intervalo · RUEDA para zoom · DOBLE CLIC para restablecer",
      "workspace.videoRegionAria": "Región de vídeo conductual sincronizado"
    }
  };

  const DICTIONARY = Object.freeze({
    en: Object.freeze({ ...EN, ...PROBE_LAYOUT_COPY.en, ...EXPERIMENT_WORKSPACE_COPY.en }),
    "zh-CN": Object.freeze({ ...EN, ...ZH, ...PROBE_LAYOUT_COPY["zh-CN"], ...EXPERIMENT_WORKSPACE_COPY["zh-CN"] }),
    es: Object.freeze({ ...EN, ...ES, ...PROBE_LAYOUT_COPY.es, ...EXPERIMENT_WORKSPACE_COPY.es })
  });

  function normalizeLanguage(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "zh" || normalized.startsWith("zh-")) return "zh-CN";
    if (normalized === "es" || normalized.startsWith("es-")) return "es";
    return "en";
  }

  function interpolate(template, values) {
    return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => Object.prototype.hasOwnProperty.call(values || {}, key) ? String(values[key]) : match);
  }

  function translate(language, key, values) {
    const code = normalizeLanguage(language);
    const value = DICTIONARY[code]?.[key] ?? DICTIONARY.en[key] ?? key;
    return interpolate(value, values);
  }

  function translateDocument(root, language) {
    const scope = root?.querySelectorAll ? root : null;
    if (!scope) return;
    scope.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = translate(language, element.dataset.i18n); });
    [["data-i18n-title", "title"], ["data-i18n-aria-label", "aria-label"], ["data-i18n-placeholder", "placeholder"]].forEach(([source, target]) => {
      scope.querySelectorAll(`[${source}]`).forEach((element) => element.setAttribute(target, translate(language, element.getAttribute(source))));
    });
  }

  class LanguageController {
    constructor({ root, storage, navigatorLanguage } = {}) {
      this.root = root || (typeof document !== "undefined" ? document.documentElement : null);
      this.storage = storage || null;
      this.listeners = new Set();
      let saved = null;
      try { saved = this.storage?.getItem?.(STORAGE_KEY); } catch { saved = null; }
      this.language = normalizeLanguage(saved || navigatorLanguage || "en");
      this.apply();
    }

    apply() {
      if (this.root) {
        this.root.lang = this.language;
        if (this.root.dataset) this.root.dataset.language = this.language;
      }
      return this.snapshot();
    }

    snapshot() { return { language: this.language, t: (key, values) => translate(this.language, key, values) }; }

    t(key, values) { return translate(this.language, key, values); }

    setLanguage(language) {
      const next = normalizeLanguage(language);
      if (next === this.language) return this.snapshot();
      this.language = next;
      try { this.storage?.setItem?.(STORAGE_KEY, next); } catch { /* Private browsing may block storage. */ }
      const snapshot = this.apply();
      this.listeners.forEach((listener) => listener(snapshot));
      return snapshot;
    }

    onChange(listener, immediate = true) {
      this.listeners.add(listener);
      if (immediate) listener(this.snapshot());
      return () => this.listeners.delete(listener);
    }
  }

  return { STORAGE_KEY, DEFAULT_LANGUAGE, LANGUAGES, GLOSSARY, DICTIONARY, normalizeLanguage, interpolate, translate, translateDocument, LanguageController };
});
