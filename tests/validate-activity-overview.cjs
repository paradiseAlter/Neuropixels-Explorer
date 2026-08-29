const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const activity = require(path.join(root, "scripts", "activity-overview.js"));
const kilosortCore = require(path.join(root, "scripts", "kilosort-core.js"));

const binCount = 4;
const units = Array.from({ length: 12 }, (_, index) => ({
  id: 100 + index,
  sourceIndex: index,
  shankId: index < 6 ? 0 : 1,
  depthUm: (index % 6) * 30 + 120,
  region: index % 3 === 0 ? "CA1" : "Unmapped",
  trackRegion: index < 6 ? "CA1" : "VISp",
  trackRegionColor: index < 6 ? "#6699cc" : "#cc9966",
  trackStartDepthUm: 90,
  trackEndDepthUm: 330,
  regionSource: index % 3 === 0 ? "fixture" : ""
}));
const normalized = new Uint8Array(units.length * binCount).fill(180);
const unusual = new Uint8Array(units.length * binCount);
units.forEach((unit, index) => {
  unusual[index * binCount] = index % 2 === 0 ? 255 : 0;
  unusual[index * binCount + 1] = index < 3 ? 255 : 0;
});

const shuffled = [units[8], units[3], units[11], units[0], ...units.filter((unit) => ![8, 3, 11, 0].includes(unit.sourceIndex))];
assert.deepEqual(activity.stableUnitOrder(shuffled).map((unit) => unit.id), units.map((unit) => unit.id), "Units must use stable shank/depth/ID order");

const rows = activity.buildDisplayRows(shuffled, normalized, binCount, 4, [], null, unusual);
assert.equal(rows.length, 4, "Anatomical partitions should split toward the height-derived overview target");
assert.deepEqual(rows.flatMap((row) => row.unitIds).sort((a, b) => a - b), units.map((unit) => unit.id), "Every Unit must contribute exactly once");
assert(rows.every((row) => row.kind === "aggregate" && row.count === 3), "Default overview rows must remain explicit groups");
assert(rows.every((row) => new Set(row.units.map((unit) => unit.shankId)).size === 1), "A group must never cross a shank boundary");
assert(rows.every((row) => new Set(row.units.map(activity.anatomyBoundaryKey)).size === 1), "A group must never cross a reliable anatomical boundary");

const first = rows[0];
const firstBinUnusual = first.units.filter((unit) => unusual[unit.sourceIndex * binCount] > 0).length;
assert.equal(first.activity[0], Math.round(firstBinUnusual / first.count * 255), "Aggregate intensity must be the fraction of Units above their own baseline threshold");

const focused = activity.buildDisplayRows(shuffled, normalized, binCount, 4, [first.key], null, unusual);
assert(focused.filter((row) => row.kind === "unit").length >= first.count, "Clicking a small group must reveal its constituent Unit rows in place");

const largeUnits = Array.from({ length: 20 }, (_, index) => ({
  id: index,
  sourceIndex: index,
  shankId: 0,
  depthUm: index * 15,
  region: "Unmapped",
  trackRegion: "MPO",
  trackStartDepthUm: -10,
  trackEndDepthUm: 400
}));
const largeMatrix = new Uint8Array(largeUnits.length * binCount);
const base = activity.buildDisplayRows(largeUnits, largeMatrix, binCount, 1, [], null, largeMatrix)[0];
const local = activity.buildDisplayRows(largeUnits, largeMatrix, binCount, 1, [base.key], null, largeMatrix);
assert(local.length >= 3 && local.every((row) => row.kind === "aggregate" && row.level === 1), "A large group must first reveal local subgroups");
const constituent = activity.buildDisplayRows(largeUnits, largeMatrix, binCount, 1, [base.key, local[0].key], null, largeMatrix);
assert(constituent.some((row) => row.kind === "unit"), "A local subgroup must then reveal real Units");

const forced = activity.buildDisplayRows(shuffled, normalized, binCount, 4, [], 105, unusual);
assert(forced.some((row) => row.kind === "unit" && row.unit.id === 105), "Find Unit must unfold the containing anatomical group");
assert.match(activity.formatIdentity({ ...units[1], id: 7 }), /Unit 7 · Shank 1 · 150 µm · Unmapped · track context CA1/, "Expanded identity must distinguish an unmapped Unit from Probe-track context");
assert(activity.overviewRowTarget(760) >= 10 && activity.overviewRowTarget(760) <= 18, "Default overview density must remain between ten and eighteen rows at desktop height");
assert.equal(activity.temporalDetailMode(330, 1500, 400), "recording density", "A full recording should use normalized density at ordinary desktop resolution");
assert.equal(activity.temporalDetailMode(120, 1500, 400), "normalized rate envelope", "A medium span should use the normalized envelope");
assert.equal(activity.temporalDetailMode(12, 1500, 80), "individual spikes", "A short sparse span should expose individual spikes");

assert.deepEqual(kilosortCore.ACTIVITY_LEVELS, [128, 256, 512, 1024, 2048], "Round 3 must expose the versioned temporal pyramid");
const countFixture = Uint32Array.from([0, 1, 2, 8, 0, 0, 1, 1]);
const matrices = kilosortCore.activityMatricesFromCounts(countFixture, 2, 4);
assert.equal(matrices.normalizedActivity.length, 8, "Every fixture row/bin must map to one normalized display cell");
assert.equal(matrices.unusualThresholdCounts.length, 2, "Every fixture Unit must retain its selected-level p90 threshold");
const fingerprintA = kilosortCore.activityFileFingerprint({ spikeTimes: { name: "spike_times.npy", size: 10, lastModified: 1 } }, 30000, 0);
const fingerprintB = kilosortCore.activityFileFingerprint({ spikeTimes: { name: "spike_times.npy", size: 11, lastModified: 1 } }, 30000, 0);
assert.notEqual(fingerprintA, fingerprintB, "Changing source metadata must invalidate the folder cache identity");
assert.equal(kilosortCore.nearestActivityLevel(900), 1024, "Viewport requests must resolve to a stored pyramid level");
assert.doesNotThrow(() => new Function(kilosortCore.createWorkerSource()), "The generated background-worker cache implementation must remain valid JavaScript");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "scripts", "app.js"), "utf8");
const core = fs.readFileSync(path.join(root, "scripts", "kilosort-core.js"), "utf8");
assert(html.includes('id="activity-anatomy-canvas"') && html.includes('id="experiment-video-region"'), "The real application must expose the unified workspace");
assert(html.includes('id="video-region-splitter"'), "The behavior region must have one accessible resize separator");
assert(/id="review-layout"[^>]+hidden/.test(html), "The legacy Unit/Probe dashboard must not be permanently visible");
assert(app.includes("groupFocusPath") && app.includes("probeTrackSegmentFor"), "Shared app state must own progressive focus and Probe-track context");
assert(app.includes("scheduleActivityLevelForRange") && app.includes("overviewAbortController"), "Navigation must select cached pyramid levels and expose cancellation state");
assert(core.includes("unusualThresholdCounts") && core.includes("strictly above that Unit's recording-wide 90th-percentile"), "Folder preprocessing must expose the selected relative-activity semantics");
assert(core.includes("persistentActivityGet") && core.includes("activity-overview-progress"), "Folder preprocessing must persist pyramids and report background progress");

console.log(JSON.stringify({
  feature: "activity-anatomy-canvas-round-3",
  stableOrder: activity.stableUnitOrder(shuffled).map((unit) => unit.id),
  overviewRows: rows.map((row) => ({ count: row.count, shankId: row.shankId, region: row.region, unitIds: row.unitIds })),
  progressiveFocus: { baseRows: 1, localRows: local.length, constituentRows: constituent.length },
  pyramid: { version: kilosortCore.ACTIVITY_PREPROCESSING_VERSION, levels: kilosortCore.ACTIVITY_LEVELS, invalidationVerified: fingerprintA !== fingerprintB },
  semantics: {
    individual: "within-Unit binned spike count normalized by the non-empty-bin 95th percentile",
    aggregate: "fraction of constituent Units whose bin count is strictly above their own recording-wide p90"
  }
}, null, 2));
