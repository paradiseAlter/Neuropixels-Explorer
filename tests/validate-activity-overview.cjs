const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const activity = require(path.join(root, "scripts", "activity-overview.js"));

const units = [
  { id: 9, sourceIndex: 0, shankId: 1, depthUm: 220, region: "VISp" },
  { id: 2, sourceIndex: 1, shankId: 0, depthUm: 180, region: "CA1" },
  { id: 7, sourceIndex: 2, shankId: 0, depthUm: 120, region: "CA1" },
  { id: 11, sourceIndex: 3, shankId: null, depthUm: null, region: "Unmapped" },
  { id: 3, sourceIndex: 4, shankId: 1, depthUm: 160, region: "VISp" },
  { id: 5, sourceIndex: 5, shankId: 1, depthUm: 190, region: "VISp" }
];
const binCount = 4;
const matrix = Uint8Array.from([
  0, 255, 0, 0,
  255, 0, 0, 0,
  255, 255, 0, 0,
  0, 0, 0, 255,
  0, 255, 255, 0,
  0, 255, 0, 255
]);

assert.deepEqual(activity.stableUnitOrder(units).map((unit) => unit.id), [7, 2, 3, 5, 9, 11], "Units must use stable shank/depth/ID order");

const rows = activity.buildDisplayRows(units, matrix, binCount, 3);
assert(rows.length <= 3, "Viewport aggregation must honor the row budget");
assert.deepEqual(rows.flatMap((row) => row.unitIds).sort((a, b) => a - b), [2, 3, 5, 7, 9, 11], "Every Unit must contribute exactly once");
assert(rows.every((row) => row.kind === "aggregate" && row.count >= 2), "Aggregates must be explicit rows with Unit counts");

const first = rows[0];
const firstBinActive = first.units.filter((unit) => matrix[unit.sourceIndex * binCount] > 0).length;
assert.equal(first.activity[0], Math.round(firstBinActive / first.count * 255), "Aggregate intensity must be the fraction of constituent Units active");

const forced = activity.buildDisplayRows(units, matrix, binCount, 3, null, 5);
assert(forced.some((row) => row.kind === "unit" && row.unit.id === 5), "Find Unit must unfold the containing aggregate to a real Unit row");
assert.match(activity.formatIdentity(units[4]), /Unit 3 · Shank 2 · 160 µm · VISp/, "Expanded identity must expose Unit, shank, depth, and region");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "scripts", "app.js"), "utf8");
const core = fs.readFileSync(path.join(root, "scripts", "kilosort-core.js"), "utf8");
assert(html.includes('id="activity-anatomy-canvas"') && html.includes('id="experiment-video-region"'), "The real application must expose the unified workspace");
assert(/id="review-layout"[^>]+hidden/.test(html), "The legacy Unit/Probe dashboard must not be permanently visible");
assert(app.includes("experimentView") && app.includes("loadRecordingActivityOverview"), "App state must own the shared experiment selection and reusable provider");
assert(core.includes("buildActivityOverviewBuffers") && core.includes('message.type === "activity-overview"'), "Folder overview preprocessing must run through the worker path");

console.log(JSON.stringify({
  feature: "activity-anatomy-canvas-v1",
  stableOrder: activity.stableUnitOrder(units).map((unit) => unit.id),
  aggregateRows: rows.map((row) => ({ count: row.count, unitIds: row.unitIds })),
  semantics: {
    individual: "within-Unit binned spike count normalized by the non-empty-bin 95th percentile",
    aggregate: "fraction of constituent Units with at least one spike in the bin"
  }
}, null, 2));
