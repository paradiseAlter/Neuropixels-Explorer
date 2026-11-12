// SPDX-License-Identifier: MIT
"use strict";
const assert = require("node:assert/strict"), vm = require("node:vm"), F = require("../scripts/video-features.js"), A = require("../scripts/annotation-core.js");
const fp = { algorithm: "sha256-ordered-chunks/1", chunkBytes: 1048576, size: 42, digest: "a".repeat(64) };
const context = { key: "r/video", recordingKey: "r", videoName: "mouse.mp4", videoSize: 42, duration: 20, videoFingerprint: fp };
const base = { schema: F.SCHEMA, id: "synthetic-feature-fixture", timebase: "video_seconds", recordingKey: "r", video: { name: "mouse.mp4", size: 42, duration: 20, fingerprint: fp },
  kind: "features", subject: "mouse-1", track: "pose", model: { name: "synthetic-test", version: "1", source: "Synthetic contract fixture, not observed behavior" }, names: ["a", "b"], units: ["unitless", "unitless"],
  samples: Array.from({ length: 16 }, (_, i) => ({ id: `frame-${i}`, frame: i * 3, start: 1 + i * .5, time: 1 + i * .5, end: 1.5 + i * .5, values: [i < 8 ? 0 : 10, i < 8 ? 1 : 20] })) };
let checks = 0; const test = (name, fn) => { fn(); checks++; }, copy = x => JSON.parse(JSON.stringify(x));
test("valid data detached", () => { const a = F.validate(base, context); a.samples[0].values[0] = 99; assert.equal(base.samples[0].values[0], 0); });
for (const [name, mutate, match] of [
  ["schema", x => x.schema = "future/2", /Expected/], ["neural clock", x => x.timebase = "neural_seconds", /video_seconds/],
  ["recording", x => x.recordingKey = "other", /Recording/], ["name", x => x.video.name = "other.mp4", /identity/],
  ["bytes", x => x.video.size++, /identity/], ["duration", x => x.video.duration++, /duration/],
  ["same size changed content", x => x.video.fingerprint.digest = "b".repeat(64), /content/],
  ["unverified fingerprint", x => delete x.video.fingerprint, /fingerprint/], ["model version", x => delete x.model.version, /version/],
  ["model source", x => delete x.model.source, /source/], ["subject", x => x.subject = "", /subject/],
  ["units", x => delete x.units, /unit/], ["duplicate names", x => x.names[1] = "a", /Duplicate/],
  ["duplicate samples", x => x.samples[1].id = x.samples[0].id, /Duplicate/],
  ["overlapping support", x => x.samples[1].start = 1.2, /nonoverlapping/],
  ["invalid sample timestamp", x => x.samples[1].time = x.samples[1].end, /intervals/],
  ["out of video", x => x.samples[0].start = -1, /intervals/], ["missing explicit endpoint", x => delete x.samples[0].end, /end/],
  ["shape", x => x.samples[0].values.pop(), /shape/], ["nonfinite", x => x.samples[0].values[0] = Infinity, /value/],
  ["frame", x => x.samples[0].frame = .5, /frame/], ["unsafe name", x => x.names[0] = "__proto__", /name/],
]) test(name, () => { const x = copy(base); mutate(x); assert.throws(() => F.validate(x, context), match); });
test("fingerprint field order independent", () => { const x = copy(base); x.video.fingerprint = { digest: fp.digest, size: 42, chunkBytes: 1048576, algorithm: fp.algorithm }; F.validate(x, context); });
test("missing samples excluded with gaps", () => {
  const x = copy(base); x.samples[4].values[0] = null; const r = F.group(x, context, { count: 2 });
  assert.equal(r.excluded.length, 1); assert.equal(r.excluded[0].reason, "missing_value");
  assert(r.segments.every(s => s.end <= 3 || s.start >= 3.5)); assert.equal(r.segments[0].start, 1); assert.equal(r.segments.at(-1).end, 9);
});
test("explicit absent rows remain gaps", () => { const x = copy(base); x.samples.splice(4, 1); const r = F.group(x, context, { count: 2 }); assert(r.segments.every(s => s.end <= 3 || s.start >= 3.5)); });
test("deterministic seeded grouping", () => { const r = F.group(base, context, { count: 2 }); assert.deepEqual(r, F.group(base, context, { count: 2 })); assert.equal(r.groups, 2); assert.equal(r.segments.length, 2); assert(r.converged); assert.equal(r.segments[0].end, 5); });
test("no invented extra clusters", () => assert.equal(F.group(base, context, { count: 8 }).groups, 2));
test("constant columns excluded", () => { const x = copy(base); x.samples.forEach(s => s.values[1] = 1); assert.deepEqual(F.prepare(x, context).preprocessing.activeDimensions, [0]); });
test("all constant unavailable", () => { const x = copy(base); x.samples.forEach(s => s.values = [1, 1]); assert.throws(() => F.group(x, context), /constant/); });
test("small sample unavailable", () => { const x = copy(base); x.samples = x.samples.slice(0, 7); assert.throws(() => F.prepare(x, context), /eight/); });
test("bad parameters", () => { for (const options of [{ count: 1 }, { count: 33 }, { seed: -1 }, { seed: .5 }]) assert.throws(() => F.group(base, context, options)); for (const options of [{ minConfidence: 2 }, { normalization: "magic" }]) assert.throws(() => F.prepare(base, context, options)); });
const request = F.modelInput(context, A.create(context), { offset_s: 4, verification_status: "unverified" });
const poseOutput = { id: "synthetic-pose", subject: "mouse-1", track: "pose", model: base.model, names: ["center", "nose", "paw"], coordinateSpace: "image_pixels",
  poseNormalization: { mode: "body2d", center: "center", axis: ["center", "nose"], scale: true, rotate: true },
  samples: base.samples.map((s, i) => ({ ...copy(s), values: [[10, 20, 1], [10, 22, 1], [i < 8 ? 8 : 6, 20, 1]] })) };
const pose = F.adaptTimedKeypoints(request, poseOutput);
test("adapter retains frames model and mapping input", () => { assert.equal(pose.kind, "keypoints2d"); assert.deepEqual(pose.model, base.model); assert.equal(request.timeMapping.offset_s, 4); assert.equal(request.annotations.segments.length, 0); });
test("body coordinates reference", () => { const p = F.prepare(pose, context, { normalization: "none" }); assert.deepEqual(p.matrix[0], [1]); assert.deepEqual(p.matrix.at(-1), [2]); assert.deepEqual(p.preprocessing.activeDimensions, [5]); });
test("translation rotation scale invariance", () => { const x = copy(pose); x.samples.forEach(s => s.values.forEach(v => { [v[0], v[1]] = [3 * v[1] + 10, -3 * v[0] - 12]; })); assert.deepEqual(F.prepare(x, context).matrix, F.prepare(pose, context).matrix); });
test("confidence is a filter not group probability", () => { const x = copy(pose); x.samples[0].values[0][2] = .79; x.samples[1].values[0][2] = .8; const r = F.group(x, context, { count: 2 }); assert.equal(r.excluded.length, 1); assert.equal(r.excluded[0].reason, "low_confidence"); assert.equal(r.sampleIds[0], "frame-1"); });
test("degenerate axis excluded", () => { const x = copy(pose); x.samples[0].values[1] = [...x.samples[0].values[0]]; assert.equal(F.prepare(x, context).excluded[0].reason, "degenerate_body_axis"); });
test("invalid pose declarations rejected", () => { for (const mutate of [x => delete x.coordinateSpace, x => x.poseNormalization.axis = ["nose", "nose"], x => x.samples[0].values[0][2] = 1.1, x => x.samples[0].values[0] = [1, 2], x => x.poseNormalization.rotate = "true"]) { const x = copy(pose); mutate(x); assert.throws(() => F.prepare(x, context)); } });
test("worker executes same core", () => { let result; vm.runInNewContext(F.workerSource() + ';onmessage({data:input})', { TextEncoder, input: { input: base, context, options: { count: 2 } }, postMessage: x => result = x }); assert.deepEqual(copy(result.result), F.group(base, context, { count: 2 })); });
test("worker rejects invalid source", () => { let result; vm.runInNewContext(F.workerSource() + ';onmessage({data:input})', { TextEncoder, input: { input: base, context: { ...context, recordingKey: "other" }, options: {} }, postMessage: x => result = x }); assert.match(result.error, /Recording/); });
test("candidate provenance curation and JSON restore", () => {
  const r = F.group(pose, context, { count: 2 }), candidate = F.candidates(pose, r, "pose-run", "b".repeat(64));
  let doc = A.importCandidates(A.create(context), candidate); assert(doc.segments.every(s => !A.reviewed(doc, s))); assert.equal(doc.runs[0].source.featureAsset.samples.length, 16);
  doc = A.nameGroup(doc, "pose-run/0", "QA group only"); assert(doc.segments.every(s => !A.reviewed(doc, s)));
  doc = A.edit(doc, doc.segments[0].id, { end: 4.5 }); assert.equal(doc.runs[0].originalSegments[0].end, 5);
  assert.deepEqual(A.validate(copy(doc), context), doc); assert.deepEqual(doc.runs[0].source.featureAsset, pose);
});
test("cell cap before heavy cloning", () => { const x = copy(base); x.names = Array.from({ length: 128 }, (_, i) => `f${i}`); x.samples = Array(10000).fill(x.samples[0]); assert.throws(() => F.validate(x, context), /cell limit/); });
test("operation budget", () => {
  const x = copy(base); x.video.duration = 3000; x.names = Array.from({ length: 64 }, (_, i) => `f${i}`); x.units = x.names.map(() => "unitless"); x.samples = Array.from({ length: 2000 }, (_, i) => ({ id: String(i), start: i, time: i, end: i + 1, values: x.names.map((_, j) => i + j) }));
  assert.throws(() => F.group(x, { ...context, duration: 3000 }, { count: 32 }), /work limit/);
});
console.log(JSON.stringify({ status: "PASS", checks, feature: "bounded video feature/model exchange, preprocessing, worker grouping and unreviewed provenance" }, null, 2));
