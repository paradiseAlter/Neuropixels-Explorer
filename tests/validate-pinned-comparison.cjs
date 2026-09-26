"use strict";
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
class Element {
  constructor() { this.children = new Map(); this.dataset = {}; this.hidden = true; }
  querySelector(key) { if (!this.children.has(key)) this.children.set(key, new Element()); return this.children.get(key); }
  querySelectorAll() { return []; }
  addEventListener() {}
  setAttribute() {}
  append() {}
  remove() { this.removed = true; }
}
class Manager {
  constructor(elements, onWindow, onState) { Object.assign(this, { elements, onWindow, onState, start: 0, span: 10 }); }
  setData(data) { this.data = data; this.setWindow(0, 10); }
  setMode(mode) { this.mode = mode; this.onState?.({ mode }); }
  setWindow(start, span) { Object.assign(this, { start, span }); this.onWindow({ start, end: start + span }); }
  setPlaybackTime(time) { this.time = time; }
  setColors() {}
  destroy() { this.destroyed = true; }
}
const sandbox = { window: {}, document: { createElement: () => new Element() } };
vm.runInNewContext(fs.readFileSync(require.resolve("../scripts/pinned-comparison.js"), "utf8"), sandbox);
const root = new Element();
let view = { visibleRange: { start: 0, end: 100 }, cursorTime: 24, selectedUnitId: 1 };
let updates = 0;
const panel = new sandbox.window.NeuropixelsPinnedComparison(root, {
  PlotManager: Manager, getView: () => view, t: key => key, onChange() {},
  setView(patch) { assert(++updates < 20, "Window feedback must not recurse"); view = { ...view, ...patch }; panel.syncView(); }
});
const recording = { duration: 100, sampleRate: 30000 };
const result = { spikeTimes: Float64Array.from([20, 21, 24, 26]) };
const add = id => panel.add(recording, { id, region: id < 2 ? "MB" : "VISp" }, result, { trace: "#abc" });
assert(add(1)); assert.equal(view.visibleRange.start, 19); assert.equal(view.visibleRange.end, 29);
assert(!add(1), "No duplicate pins"); assert(add(2));
const first = panel.entries.get(1).manager, second = panel.entries.get(2).manager;
assert.equal(first.data.spikeTimes, result.spikeTimes, "Pin the exact source times, never display bins");
view.selectedUnitId = null; panel.syncView();
assert.equal(panel.entries.size, 2, "Collapsing temporary focus preserves pins");
first.setWindow(21, 1);
assert.equal(second.start, 21); assert.equal(second.span, 1);
assert.equal(view.visibleRange.end, 22);
first.setMode("zoom"); assert.equal(second.mode, "zoom", "Keyboard mode changes remain shared");
for (let id = 3; id <= 6; id++) assert(add(id));
assert(!add(7), "Bound retained Unit data");
panel.remove(1); assert(first.destroyed); assert.equal(panel.entries.size, 5);
assert(!second.destroyed);
panel.add({ duration: 50 }, { id: 2 }, result, { trace: "#abc" });
assert(second.destroyed, "Recording changes destroy old plots even for matching Unit IDs");
assert.equal(panel.entries.size, 1);
panel.clear(); assert.equal(panel.entries.size, 0); assert(root.hidden);
// Exercise the real raster renderer at the boundary, not only the view model.
const { PlotManager } = require("../scripts/plots.js");
const texts = [];
const context = { setTransform(){}, fillRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, fillText(text){ texts.push(text); } };
const raster = Object.create(PlotManager.prototype);
raster.elements = { rasterOnly: true, detail: { getBoundingClientRect: () => ({width:500,height:90}), getContext: () => context } };
raster.data = { spikeTimes: Float64Array.from([.5, 1, 1.5, 2, 2.5]) };
raster.start = 1; raster.span = 1;
const previousWindow = global.window;
try {
  global.window = { devicePixelRatio: 1 };
  raster.drawDetail();
  assert(texts.includes("2 spikes"), "Pinned raster includes start and excludes end of [1,2)");
  assert(!texts.includes("RATE"), "Compact comparison does not imply a shared rate scale");
  texts.length = 0;
  raster.data.spikeTimes = Float64Array.from({length:2000}, (_, i) => 1 + i / 2000);
  raster.drawDetail();
  assert(texts.some(text => text.includes("density; zoom")), "Dense views disclose aggregation");
} finally { if (previousWindow === undefined) delete global.window; else global.window = previousWindow; }
console.log("PASS: exact data, cross-group pins, shared windows/modes, no feedback loop, duplicates, limits, removal and recording isolation");
