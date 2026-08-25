const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const videoSync = require(path.join(root, "scripts", "video-sync.js"));
const streams = require(path.join(root, "scripts", "stream-contracts.js"));

const mapping = new videoSync.TimeMapping({
  method: "linear_clock_fit",
  offset_s: 1.25,
  scale: 1.0002,
  verification_status: "verified"
});
const neuralTime = mapping.videoToNeural(10);
assert(Math.abs(neuralTime - 11.252) < 1e-12, "Video-to-neural mapping should apply scale and offset");
assert(Math.abs(mapping.neuralToVideo(neuralTime) - 10) < 1e-12, "Time mapping should be invertible");

const first = videoSync.syntheticBehaviorAt(5, 30);
const repeated = videoSync.syntheticBehaviorAt(5, 30);
assert.deepStrictEqual(first, repeated, "Synthetic behavior must be deterministic");
assert.strictEqual(first.frameIndex, 150, "Synthetic frame number should be exact at 30 fps");
assert.strictEqual(first.syncPulse, true, "Five-second boundaries should expose a validation sync pulse");
assert.strictEqual(videoSync.formatClock(65.125), "00:01:05.125");

const fakeVideo = { name: "behavior.mp4" };
assert.deepStrictEqual(videoSync.videoFilesForRecording({ files: [{ name: "spike_times.npy" }, fakeVideo] }), [fakeVideo]);

const registry = new streams.RawVoltageExtensionRegistry();
const provider = {
  id: "fixture-provider",
  streamKinds: ["ap", "lfp"],
  canOpen: (stream) => stream.storageFormat === "fixture",
  open: async () => ({ readWindow: async () => new Float32Array([1, 2]), close: () => {} })
};
const unregister = registry.register(provider);
assert.strictEqual(registry.contractVersion, "1.0");
assert.strictEqual(registry.resolve({ streamKind: "ap", storageFormat: "fixture" }).id, provider.id);
assert.strictEqual(registry.resolve({ streamKind: "raw_voltage", storageFormat: "fixture" }), null);
assert.throws(() => registry.register(provider), /already registered/);
unregister();
assert.strictEqual(registry.providers().length, 0);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles", "app.css"), "utf8");
const app = fs.readFileSync(path.join(root, "scripts", "app.js"), "utf8");
const service = fs.readFileSync(path.join(root, "server", "neuropixels_explorer", "service.py"), "utf8");

[
  "video-sync-panel",
  "generate-synthetic-video",
  "video-seek",
  "video-neural-time",
  "video-offset",
  "primary-sync-playhead",
  "RAW VOLTAGE PORT",
  "scripts/video-sync.js",
  "scripts/stream-contracts.js"
].forEach((needle) => assert(html.includes(needle), `index.html should include ${needle}`));
assert(css.includes(".video-sync-panel") && css.includes(".sync-playhead"), "Video and shared-playhead styles should exist");
assert(app.includes("handleVideoNeuralTime") && app.includes("setPlaybackTime"), "App should connect video time to neural plots");
assert(service.includes("def video_media") && service.includes("Accept-Ranges"), "Database video should support browser range requests");

console.log(JSON.stringify({
  status: "PASS",
  feature: "behavior-neural-video-sync",
  syntheticFrame: first.frameIndex,
  rawVoltageContract: registry.contractVersion,
  timeMappingRoundTrip: mapping.neuralToVideo(neuralTime)
}, null, 2));
