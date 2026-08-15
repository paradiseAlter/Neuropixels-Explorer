"use strict";

const fs = require("node:fs");
const path = require("node:path");
const core = require("../scripts/kilosort-core.js");
const regionCore = require("../scripts/region-core.js");
const plots = require("../scripts/plots.js");
const probeView = require("../scripts/probe-view.js");
const workspaceLayout = require("../scripts/workspace-layout.js");
const theme = require("../scripts/theme.js");
const dataStatus = require("../scripts/data-status.js");

const codeOnly = process.argv.includes("--code-only");
const repositoryRoot = path.resolve(__dirname, "..");
const projectRoot = process.env.NEUROPIXEL_PROJECT_ROOT
  ? path.resolve(process.env.NEUROPIXEL_PROJECT_ROOT)
  : path.resolve(repositoryRoot, "..");
const kilosortRoot = path.join(projectRoot, "data", "raw", "kilosort");
const legacyRoot = path.join(projectRoot, "data", "processed", "legacy_tables");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function exactArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function nodeFile(absolute, relativePath) {
  const stat = fs.statSync(absolute);
  return {
    name: path.basename(absolute),
    size: stat.size,
    relativePath: relativePath.replaceAll("\\", "/"),
    async text() { return fs.readFileSync(absolute, "utf8"); },
    async arrayBuffer() { return exactArrayBuffer(fs.readFileSync(absolute)); },
    slice(start = 0, end = stat.size) {
      return {
        async text() { return fs.readFileSync(absolute).subarray(start, end).toString("utf8"); },
        async arrayBuffer() { return exactArrayBuffer(fs.readFileSync(absolute).subarray(start, end)); }
      };
    }
  };
}

function folderFiles(root, prefix) {
  const result = [];
  const walk = (directory) => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) result.push(nodeFile(absolute, path.join(prefix, path.relative(root, absolute))));
    });
  };
  walk(root);
  return result;
}

function buffer(directory, name) {
  return exactArrayBuffer(fs.readFileSync(path.join(directory, name)));
}

(async () => {
  const minimumView = plots.normalizeWindow(-10, .001, 12);
  const rightEdgeView = plots.normalizeWindow(11.9, 1, 12);
  assert(minimumView.start === 0 && minimumView.span === .02, "Detail view should clamp to the 20 ms minimum");
  assert(rightEdgeView.start === 11 && rightEdgeView.span === 1, "Detail view should stay inside the recording");
  assert(plots.wheelZoomFactor(-100) < 1 && plots.wheelZoomFactor(100) > 1, "Wheel zoom direction changed");
  assert(plots.wheelNavigationDelta(80, 10, 0) === 80, "Trackpad horizontal navigation should use the dominant axis");
  assert(plots.wheelNavigationDelta(10, -80, 0) === -80, "Trackpad vertical navigation should use the dominant axis");
  assert(plots.wheelNavigationDelta(0, 5, 1) === 80, "Line-mode wheel deltas should be normalized");
  assert(plots.wheelPanOffset(0, 100, 0, 10) > 0, "Wheel down should pan toward later time");
  assert(plots.wheelPanOffset(0, -100, 0, 10) < 0, "Wheel up should pan toward earlier time");
  assert(plots.wheelPanOffset(100, 5, 0, 10) > 0, "Horizontal trackpad motion should pan toward later time");
  assert(plots.formatAxisTime(12.34567, .05) === "12.3457 s", "Fine time-axis precision changed");
  assert(probeView.regionColor("12abEF") === "#12abEF", "Region color normalization changed");
  assert(probeView.PROBE_COLORS.length >= 4, "Physical Probe identity palette is incomplete");
  assert(probeView.experimentOf({ name: "ks4_exp12" }) === 12, "Recording experiment lookup changed");
  const groupedProbeMarkers = probeView.groupUnitMarkers([
    { probeId: 0, x: 20, y: 40, location: { id: 7 } },
    { probeId: 0, x: 20, y: 46, location: { id: 19 } },
    { probeId: 0, x: 20, y: 70, location: { id: 29 } },
    { probeId: 1, x: 60, y: 42, location: { id: 32 } }
  ]);
  assert(groupedProbeMarkers.length === 3 && groupedProbeMarkers[0].markers.length === 2, "Nearby Probe markers should form an explicit overlap group");
  assert(probeView.nearestUnitTarget(groupedProbeMarkers, 20, 43)?.markers.length === 2, "Overlap groups should be directly hit-testable");
  assert(probeView.unitInteraction(7, "marker", { type: "click", ctrlKey: true }).additive, "Probe Ctrl-click should add a Unit");
  assert(probeView.unitInteraction(7, "marker", { type: "contextmenu" }).contextMenu, "Probe right-click should open the shared Unit menu");
  assert(theme.normalizePreference("HIGH-CONTRAST") === "contrast", "High Contrast aliases should normalize to the contrast theme");
  assert(theme.normalizePreference("unknown") === "system", "Unknown theme preferences should safely use System");
  assert(theme.resolveTheme("system", false) === "light" && theme.resolveTheme("system", true) === "dark", "System theme resolution changed");
  assert(theme.resolveTheme("contrast", false) === "contrast", "High Contrast should not follow the system color scheme");
  assert(theme.PALETTES.dark.canvas.background !== theme.PALETTES.light.canvas.background, "Canvas backgrounds should respond to the theme");
  assert(theme.PALETTES.contrast.units.primary.trace !== theme.PALETTES.dark.units.primary.trace, "High Contrast Unit colors should use a dedicated palette");
  const storedTheme = new Map();
  const themeRoot = { dataset: {}, style: {} };
  const themeController = new theme.ThemeController({
    root: themeRoot,
    storage: { getItem: (key) => storedTheme.get(key), setItem: (key, value) => storedTheme.set(key, value) },
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  });
  themeController.setPreference("light");
  assert(storedTheme.get(theme.STORAGE_KEY) === "light" && themeRoot.dataset.theme === "light", "Theme choice should persist and update the document state");
  themeController.destroy();
  const completeStatus = dataStatus.buildDataStatus([{ capabilities: { spikes: true, quality: true, amplitude: true, position: true, template: true, geometry: true, probeGrouping: true } }], { valid: false, probeTrack: { valid: false } }, []);
  assert(completeStatus.counts.available === 7 && completeStatus.counts.missing === 0, "Complete KiloSort inputs should collapse to seven available core capabilities");
  assert(completeStatus.optional.length === 2 && completeStatus.future.length === 2, "Optional and future data status groups are incomplete");
  const partialStatus = dataStatus.buildDataStatus([{ capabilities: { spikes: true } }], null, ["candidate unreadable"]);
  assert(partialStatus.counts.missing === 6 && partialStatus.counts.invalid === 1, "Missing and invalid data status counts changed");
  const normalizedLayout = workspaceLayout.normalizeLayout({ unitWidth: 9999, probeWidth: 1, unitCollapsed: true });
  assert(normalizedLayout.unitWidth === workspaceLayout.LAYOUT_LIMITS.unit.maximum, "Units panel width should clamp to its maximum");
  assert(normalizedLayout.probeWidth === workspaceLayout.LAYOUT_LIMITS.probe.minimum, "Probe panel width should clamp to its minimum");
  assert(normalizedLayout.unitCollapsed && !normalizedLayout.probeCollapsed, "Panel collapse state normalization changed");
  assert(workspaceLayout.keyboardWidthDelta("unit", "ArrowRight") > 0, "Right arrow should widen the Units panel");
  assert(workspaceLayout.keyboardWidthDelta("probe", "ArrowLeft") > 0, "Left arrow should widen the Probe panel");
  const appSource = fs.readFileSync(path.resolve(__dirname, "..", "scripts", "app.js"), "utf8");
  assert(/const MAX_OPEN_UNITS = 10;/.test(appSource), "The multi-Unit display limit should remain 10");
  assert(/openUnits: new Map\(\)/.test(appSource) && /focusedUnit: null/.test(appSource), "Unit selection should use openUnits plus focusedUnit");
  assert(!/reviewMode:|comparisonItems:|activeClusterId:/.test(appSource), "Legacy Inspect/Compare selection state should not return");
  assert(/event\.ctrlKey \|\| event\.metaKey/.test(appSource), "Ctrl-click additive Unit selection is missing");
  assert(/function openUnitContextMenu/.test(appSource) && /function runUnitContextAction/.test(appSource), "The shared Unit context menu is missing");
  assert(/function backFocusedTime\(\)/.test(appSource) && /entry\?\.manager\.history\.length > item\.manager\.history\.length/.test(appSource), "Linked plots should share Back history across Unit focus changes");
  assert(/function selectRecording\(recording\)/.test(appSource) && !/firstGood/.test(appSource), "Selecting a Recording should not auto-open a Unit");
  assert(/interactionMode: "cursor"/.test(appSource), "Cursor mode should remain the default plot interaction");
  const plotSource = fs.readFileSync(path.resolve(__dirname, "..", "scripts", "plots.js"), "utf8");
  assert(/if \(!\["zoom", "pan"\]\.includes\(this\.mode\)\) return;[\s\S]{0,220}event\.preventDefault\(\)/.test(plotSource), "Plot wheel handling should preserve normal scrolling outside Zoom and Pan");
  assert(!/inTimeAxis|TIME_AXIS_HIT_ZONE/.test(plotSource), "Plot navigation should not be restricted to a hidden time-axis hit zone");
  const pageSource = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
  assert(/Neuropixels Explorer 3\.2\.0/.test(pageSource), "The v3.2.0 page title is missing");
  const pageIds = new Set([...pageSource.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const missingAppIds = [...appSource.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]).filter((id) => !pageIds.has(id));
  assert(!missingAppIds.length, `app.js references missing page IDs: ${missingAppIds.join(", ")}`);
  assert(!/inspect-review-mode|compare-review-mode/.test(pageSource), "Explicit Inspect/Compare mode controls should be removed");
  assert(!/operate only on the bottom time axis/i.test(pageSource), "Plot instructions still describe the removed time-axis restriction");
  for (const id of ["review-layout", "unit-panel-splitter", "probe-panel-splitter", "unit-panel-toggle", "probe-panel-toggle"]) {
    assert(pageIds.has(id), `Resizable workspace control ${id} is missing`);
  }
  for (const id of ["probe-stack-menu", "probe-stack-title", "probe-stack-list"]) {
    assert(pageIds.has(id), `Probe overlap control ${id} is missing`);
  }
  for (const id of ["theme-select", "data-status-button", "data-status-summary", "data-status-popover", "data-status-groups"]) {
    assert(pageIds.has(id), `Status or theme control ${id} is missing`);
  }
  assert(/role="separator"[^>]+aria-orientation="vertical"/.test(pageSource), "Workspace splitters should expose vertical separator semantics");
  assert(/workspace-layout\.js\?v=3\.2\.0/.test(pageSource), "Workspace layout module is not loaded");
  assert(/theme\.js\?v=3\.2\.0/.test(pageSource) && /data-status\.js\?v=3\.2\.0/.test(pageSource), "Theme or data-status module is not loaded");
  const styleSource = fs.readFileSync(path.resolve(__dirname, "..", "styles", "app.css"), "utf8");
  assert(/--unit-panel-width: 272px/.test(styleSource) && /--probe-panel-width: 328px/.test(styleSource), "Default workspace widths are missing");
  assert(/grid-template-columns: var\(--unit-panel-width\)[^;]+var\(--probe-panel-width\)/.test(styleSource), "The resizable five-column workspace grid is missing");
  assert(/\.probe-layer-key/.test(styleSource) && /\.probe-stack-menu/.test(styleSource), "Probe layer key or overlap list styling is missing");
  assert(/:root\[data-theme="light"\]/.test(styleSource) && /:root\[data-theme="contrast"\]/.test(styleSource), "Light or High Contrast theme tokens are missing");
  assert(/\.data-status-popover/.test(styleSource), "Expandable data status styling is missing");
  assert(/setPlotTheme/.test(plotSource), "Signal canvases are not connected to the shared theme");
  const probeSource = fs.readFileSync(path.resolve(__dirname, "..", "scripts", "probe-view.js"), "utf8");
  assert(/function setProbeTheme/.test(probeSource) && /PROBE_THEME\.background/.test(probeSource), "Probe Canvas is not connected to the shared theme");
  for (const action of ["open-only", "add", "remove", "locate"]) {
    assert(pageSource.includes(`data-unit-action="${action}"`), `Unit context action ${action} is missing`);
  }

  if (codeOnly) {
    console.log(JSON.stringify({ status: "PASS", mode: "code-only", version: "3.2.0" }, null, 2));
    return;
  }

  const kilosortFiles = folderFiles(kilosortRoot, "kilosort");
  const groups = core.groupExperimentFiles(kilosortFiles);
  assert(groups.length === 18, `Expected 18 recordings, found ${groups.length}`);
  const recordings = await Promise.all(groups.map(core.indexExperiment));
  const totalBytes = recordings.reduce((total, item) => total + item.totalBytes, 0);
  const totalUnits = recordings.reduce((total, item) => total + item.clusterLabels.length, 0);
  const totalSpikes = recordings.reduce((total, item) => total + item.spikeCount, 0);
  assert(totalBytes === 1603487329, `Indexed bytes changed: ${totalBytes}`);
  assert(totalUnits === 2387, `Expected 2,387 listed units, found ${totalUnits}`);
  assert(totalSpikes === 4450319, `Expected 4,450,319 spikes, found ${totalSpikes}`);
  assert(recordings.every((item) => item.capabilities.spikes && item.capabilities.quality && item.capabilities.amplitude && item.capabilities.position && item.capabilities.template && item.capabilities.geometry), "One or more recordings lost expected capabilities");
  assert(recordings.every((item) => !item.capabilities.rawVoltage), "Raw voltage should not be reported inside the KiloSort folders");

  const expected = {
    ks4_exp1: { clusterId: 7, spikes: 368, waveform: 61 },
    ks4_exp2: { clusterId: 0, spikes: 9238, waveform: 61 },
    ks4_exp3: { clusterId: 0, spikes: 502, waveform: 61 }
  };
  const reviewed = [];
  for (const [name, item] of Object.entries(expected)) {
    const directory = path.join(kilosortRoot, name);
    const result = core.analyzeUnitBuffers({
      spikeTimes: buffer(directory, "spike_times.npy"),
      spikeClusters: buffer(directory, "spike_clusters.npy"),
      amplitudes: buffer(directory, "amplitudes.npy"),
      spikePositions: buffer(directory, "spike_positions.npy"),
      spikeTemplates: buffer(directory, "spike_templates.npy"),
      templates: buffer(directory, "templates.npy"),
      channelPositions: buffer(directory, "channel_positions.npy"),
      channelShanks: buffer(directory, "channel_shanks.npy")
    }, 30000, item.clusterId);
    assert(result.spikeCount === item.spikes, `${name} Unit ${item.clusterId} spike count mismatch`);
    assert(result.templateWaveform.length === item.waveform, `${name} template waveform length mismatch`);
    assert(result.acg.length === 101, `${name} ACG shape mismatch`);
    assert(result.channelGeometry.length > 0 && result.channelGeometry.length % 2 === 0, `${name} probe geometry was not returned`);
    assert(result.peakChannelPosition && Number.isFinite(result.peakChannelPosition.x) && Number.isFinite(result.peakChannelPosition.y), `${name} peak-channel position is unavailable`);
    assert(result.channelProbeIds.length === result.channelGeometry.length / 2, `${name} physical Probe mapping is unavailable`);
    assert(result.unitLocations.length === recordings.find((recording) => recording.name === name).clusterLabels.length, `${name} Unit location catalog mismatch`);
    assert(result.unitSummaries.length === recordings.find((recording) => recording.name === name).clusterLabels.length, `${name} Unit summary count mismatch`);
    reviewed.push({ recording: name, unit: item.clusterId, spikes: result.spikeCount, rateHz: result.rateHz, isiUnder2msPercent: result.isiViolationPercent, presence: result.presenceRatio, peakChannel: result.peakChannel });
  }
  const exp1ProbeIds = new Set(core.analyzeUnitBuffers({
    spikeTimes: buffer(path.join(kilosortRoot, "ks4_exp1"), "spike_times.npy"),
    spikeClusters: buffer(path.join(kilosortRoot, "ks4_exp1"), "spike_clusters.npy"),
    spikePositions: buffer(path.join(kilosortRoot, "ks4_exp1"), "spike_positions.npy"),
    spikeTemplates: buffer(path.join(kilosortRoot, "ks4_exp1"), "spike_templates.npy"),
    templates: buffer(path.join(kilosortRoot, "ks4_exp1"), "templates.npy"),
    channelPositions: buffer(path.join(kilosortRoot, "ks4_exp1"), "channel_positions.npy"),
    channelShanks: buffer(path.join(kilosortRoot, "ks4_exp1"), "channel_shanks.npy")
  }, 30000, 7).channelProbeIds);
  assert(exp1ProbeIds.size === 4, `Expected four independent physical Probe groups in ks4_exp1, found ${exp1ProbeIds.size}`);

  const regionResult = await regionCore.scanFiles(folderFiles(legacyRoot, "legacy_tables"));
  assert(regionResult.valid, "Brain-region tables were not detected");
  assert(regionResult.count === 1402, `Expected 1,402 region mappings, found ${regionResult.count}`);
  assert(regionResult.regions.length === 25, `Expected 25 regions, found ${regionResult.regions.length}`);
  assert(regionResult.mapping.get("1::7")?.region === "MPN", "exp1 Unit 7 region mismatch");
  assert(regionResult.mapping.get("3::0")?.region === "act", "exp3 Unit 0 region mismatch");
  assert(regionResult.probeTrack.valid, "The electrode-level Probe-region mapping was not detected");
  assert(regionResult.probeTrack.source === "pinpoint_parsed.csv", `Unexpected Probe-region source: ${regionResult.probeTrack.source}`);
  assert(regionResult.probeTrack.rowCount === 5120, `Expected 5,120 electrode-region rows, found ${regionResult.probeTrack.rowCount}`);
  assert(regionResult.probeTrack.probeCount === 4, `Expected four physical Probe tracks, found ${regionResult.probeTrack.probeCount}`);
  assert(regionResult.probeTrack.profiles.length === 4, `Expected four Probe track profiles, found ${regionResult.probeTrack.profiles.length}`);
  const realDataStatus = dataStatus.buildDataStatus(recordings, regionResult, []);
  assert(realDataStatus.counts.available === 7 && realDataStatus.counts.missing === 0, `Expected all seven core data capabilities, found ${dataStatus.summaryText(realDataStatus)}`);
  assert(realDataStatus.optional.every((item) => item.state === "available"), "Real Unit- and Probe-region inputs should appear as available optional data");
  const exp1Unit7Track = regionResult.probeTrack.segments.find((segment) => segment.probeId === 0 && segment.startDepthUm <= 240 && segment.endDepthUm >= 240);
  assert(exp1Unit7Track?.region === "MPN", `Probe 1 at 240 µm should map to MPN, found ${exp1Unit7Track?.region}`);

  console.log(JSON.stringify({
    status: "PASS",
    recordings: recordings.length,
    files: kilosortFiles.length,
    totalBytes,
    totalUnits,
    totalSpikes,
    regionMappings: regionResult.count,
    regions: regionResult.regions.length,
    probeRegionRows: regionResult.probeTrack.rowCount,
    physicalProbeTracks: regionResult.probeTrack.probeCount,
    trackSegments: regionResult.probeTrack.segments.length,
    dataStatus: dataStatus.summaryText(realDataStatus),
    reviewed
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
