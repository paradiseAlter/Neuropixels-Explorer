const assert = require("node:assert/strict");
const { TimeMapping } = require("../scripts/video-sync.js");
const A = require("../scripts/annotation-core.js");

// One artificial missing camera exposure creates a non-affine clock step.
const clock = { video_s: [1 / 60, 2 / 60, 3 / 60, 4 / 60], neural_s: [2, 2.02, 2.08, 2.10] };
const mapping = new TimeMapping({ method: "frame_timestamps", offset_s: 2, scale: 1,
  verification_status: "verified", provenance: { frame_clock: clock } });
for (let t = 1 / 60; t < 4 / 60; t += .0007) {
  assert(Math.abs(mapping.neuralToVideo(mapping.videoToNeural(t)) - t) < 1e-12);
}
assert.equal(mapping.videoToNeural(3 / 60), 2.08);
assert(Number.isNaN(mapping.videoToNeural(0)), "No timestamp may be invented for a metadata frame");
assert(Number.isNaN(mapping.neuralToVideo(3)), "Do not extrapolate past measured coverage");
assert(Number.isNaN(mapping.videoToNeural(Infinity)));
assert.throws(() => new TimeMapping({ scale: Infinity }), /scale/);
const restored = new TimeMapping(JSON.parse(JSON.stringify(mapping)));
assert.equal(restored.videoToNeural(3 / 60), 2.08);
const shifted = mapping.withOffset(3);
assert.equal(shifted.verificationStatus, "unverified");
assert.equal(shifted.videoToNeural(3 / 60), 3.08);
assert.equal(mapping.videoToNeural(3 / 60), 2.08, "Manual adjustment preserves the original mapping");
clock.neural_s[2] = 99;
assert.equal(mapping.videoToNeural(3 / 60), 2.08, "External arrays cannot mutate the clock");
for (const invalid of [
  { video_s: [0, 0], neural_s: [1, 2] },
  { video_s: [0, 1], neural_s: [2, 1] },
  { video_s: [0, 1], neural_s: [1, null] },
  { video_s: [0, 1], neural_s: [1] }
]) assert.throws(() => new TimeMapping({ provenance: { frame_clock: invalid } }), /strictly increasing/);

let doc = A.create({ videoName: "public-camera.mp4", duration: 1 });
doc = A.add(doc, { start: 2 / 60, end: 3 / 60, subject: "mouse", track: "behavior" });
const csv = A.toCSV(doc, mapping);
assert(csv.includes('"frame_timestamps","frame_clock"'));
assert(csv.includes('"2.02","2.08"'), "CSV must use the measured clock, not its summary affine fit");
assert.throws(() => A.toCSV(doc, mapping.toJSON()), /TimeMapping instance/);
doc = A.add(doc, { start: 0, end: 1 / 60, subject: "mouse", track: "other" });
assert(A.toCSV(doc, mapping).includes('"unmapped"'));
console.log(JSON.stringify({ status: "PASS", feature: "frame-clock-and-annotation-export" }));
