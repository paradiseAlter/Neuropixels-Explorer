"use strict";

const fs = require("node:fs");
const path = require("node:path");
const core = require("../scripts/kilosort-core.js");
const regionCore = require("../scripts/region-core.js");
const plots = require("../scripts/plots.js");
const probeView = require("../scripts/probe-view.js");

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
  assert(plots.formatAxisTime(12.34567, .05) === "12.3457 s", "Fine time-axis precision changed");
  assert(plots.TIME_AXIS_HIT_ZONE === 34, "Time-axis interaction zone changed unexpectedly");
  assert(probeView.regionColor("12abEF") === "#12abEF", "Region color normalization changed");
  assert(probeView.PROBE_COLORS.length >= 4, "Physical Probe identity palette is incomplete");
  assert(probeView.experimentOf({ name: "ks4_exp12" }) === 12, "Recording experiment lookup changed");
  const appSource = fs.readFileSync(path.resolve(__dirname, "..", "scripts", "app.js"), "utf8");
  assert(/const MAX_OPEN_UNITS = 10;/.test(appSource), "The multi-Unit display limit should remain 10");
  assert(/openUnits: new Map\(\)/.test(appSource) && /focusedUnit: null/.test(appSource), "Unit selection should use openUnits plus focusedUnit");
  assert(!/reviewMode:|comparisonItems:|activeClusterId:/.test(appSource), "Legacy Inspect/Compare selection state should not return");
  assert(/event\.ctrlKey \|\| event\.metaKey/.test(appSource), "Ctrl-click additive Unit selection is missing");
  assert(/function openUnitContextMenu/.test(appSource) && /function runUnitContextAction/.test(appSource), "The shared Unit context menu is missing");
  assert(/function selectRecording\(recording\)/.test(appSource) && !/firstGood/.test(appSource), "Selecting a Recording should not auto-open a Unit");
  assert(/interactionMode: "cursor"/.test(appSource), "Cursor mode should remain the default plot interaction");
  const pageSource = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
  assert(/Neuropixels Explorer 3\.1\.0/.test(pageSource), "The v3.1.0 page title is missing");
  const pageIds = new Set([...pageSource.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const missingAppIds = [...appSource.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]).filter((id) => !pageIds.has(id));
  assert(!missingAppIds.length, `app.js references missing page IDs: ${missingAppIds.join(", ")}`);
  assert(!/inspect-review-mode|compare-review-mode/.test(pageSource), "Explicit Inspect/Compare mode controls should be removed");
  for (const action of ["open-only", "add", "remove", "locate"]) {
    assert(pageSource.includes(`data-unit-action="${action}"`), `Unit context action ${action} is missing`);
  }

  if (codeOnly) {
    console.log(JSON.stringify({ status: "PASS", mode: "code-only", version: "3.1.0" }, null, 2));
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
    reviewed
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
