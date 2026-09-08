"use strict";
const assert = require("node:assert/strict");
const A = require("../scripts/annotation-core.js");
const D = require("../scripts/behavior-discovery.js");
const context = { key: "recording/video", videoName: "mouse.mp4", videoSize: 42, duration: 10 };
let doc = A.create(context);
const candidates = { schema: A.CANDIDATE_SCHEMA, timebase: "video_seconds", video: { name: "mouse.mp4", size: 42, duration: 10 },
  run: { id: "run-a", method: "test", parameters: { seed: 42 } }, segments: [
    { start: 0, end: 2, group_id: "0", distance: 0.1 }, { start: 2, end: 5, group_id: "1", distance: 0.3 },
    { start: 5, end: 10, group_id: "0", distance: 0.5 }
  ] };
doc = A.importCandidates(doc, candidates);
assert.equal(doc.segments.length, 3);
assert(doc.segments.every((s) => !A.reviewed(doc, s) && !A.label(doc, s)));
assert.throws(() => A.importCandidates(doc, candidates), /already imported/);
assert.throws(() => A.importCandidates(A.create(context), { ...candidates, timebase: "neural_seconds" }), /video_seconds/);
assert.throws(() => A.importCandidates(A.create(context), { ...candidates, video: { ...candidates.video, name: "wrong.mp4" } }), /name/);
assert.throws(() => A.importCandidates(A.create(context), { ...candidates, video: { ...candidates.video, size: 99 } }), /size/);
assert.throws(() => A.importCandidates(A.create(context), { ...candidates, segments: [{ start: 1, end: 11, group_id: 0 }] }), /inside/);
assert.throws(() => A.importCandidates(A.create(context), { ...candidates, segments: [{ start: 1, end: 2 }] }), /group ID/);
const original = JSON.stringify(doc);
assert.throws(() => A.edit(doc, "run-a:0", { end: -1 }), /inside/);
assert.equal(JSON.stringify(doc), original, "Rejected edits must be atomic");
doc = A.nameGroup(doc, "run-a/0", "grooming");
doc = A.assign(doc, ["run-a:0"], null, true);
assert(A.reviewed(doc, doc.segments[0]));
doc = A.addScheme(doc, "Fine-grained lab");
assert.equal(A.label(doc, doc.segments[0]), "");
assert(!A.reviewed(doc, doc.segments[0]));
doc = A.nameGroup(doc, "run-a/0", "forepaw grooming");
doc = A.regroup(doc, ["run-a:2"]);
assert.equal(doc.segments[2].groupId, "0", "Original algorithm identity survives curation");
assert.notEqual(A.groupKey(doc, doc.segments[0]), A.groupKey(doc, doc.segments[2]));
doc = A.change(doc, (d) => { d.activeSchemeId = "default"; });
assert.equal(A.label(doc, doc.segments[2]), "grooming", "Lab schemes are independent");
doc = A.split(doc, "run-a:0", 1);
assert.equal(doc.segments.length, 4);
assert.equal(doc.segments[0].origin.end, 2);
assert(!A.reviewed(doc, doc.segments[0]), "Changed boundaries need review");
doc = A.add(doc, { start: 0.5, end: 1.5, subject: "animal-2", track: "forelimb", label: "reaching" });
assert.equal(doc.segments.length, 5, "Concurrent subjects and tracks are allowed");
doc = A.remove(doc, ["run-a:0"]);
assert.equal(doc.segments.length, 4);
assert(!Object.hasOwn(A.scheme(doc).reviewed, "run-a:0"));
assert.throws(() => A.validate(doc, { ...context, key: "another/video" }), /different/);
assert.deepEqual(A.validate(JSON.parse(JSON.stringify(doc)), context), doc, "Portable round trip");
const csv = A.toCSV(doc, { offset_s: 4, scale: 2, verification_status: "unverified" });
assert(csv.includes('"4"') && csv.includes('"24"') && csv.includes('"unverified"'));
assert(csv.includes('"original_group_id"'));
const times = Array.from({ length: 100 }, (_, i) => i / 10);
const features = times.map((t, i) => t < 5 ? [Math.sin(i) * .01, 0] : [10 + Math.sin(i) * .01, 10]);
const input = { features, times, duration: 10, count: 2, minimumDuration: .4 };
const result = D.cluster(input);
assert.deepEqual(result, D.cluster(input), "Grouping must be reproducible");
assert.equal(result.groups, 2);
assert.equal(result.segments.length, 2);
assert.equal(result.segments[0].start, 0);
assert.equal(result.segments[0].end, 5);
assert.equal(result.segments[1].end, 10);
assert.equal(D.cluster({ ...input, features: times.map(() => [0, 0]) }).groups, 1, "Do not invent groups in a constant video");
assert.throws(() => D.cluster({ ...input, times: times.map(() => 0) }), /time series/);
assert.throws(() => D.cluster({ ...input, count: NaN }), /parameters/);
assert.throws(() => D.cluster({ ...input, features: [[NaN]] }), /samples/);
console.log(JSON.stringify({ status: "PASS", feature: "behavior annotation contracts and motion grouping", checks: "atomic edits, provenance, independent schemes, imports, overlapping tracks, CSV mapping, temporal grouping" }, null, 2));

const fs = require("node:fs"), path = require("node:path");
const version = fs.readFileSync(path.join(__dirname, "../VERSION"), "utf8").trim();
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
assert(html.includes(`id="version-label">${version}`));
assert([...html.matchAll(/\?v=([^" ]+)/g)].every((m) => m[1] === version), "All cached UI assets use the current release version");
let merged = A.merge(A.importCandidates(A.create(context), candidates), ["run-a:0", "run-a:1"]);
assert.equal(merged.segments.length, 2);
assert.equal(merged.segments.at(-1).end, 5);
assert.equal(merged.segments.at(-1).origin.sources.length, 2);
assert.equal(merged.runs[0].originalSegments.length, 3);
assert.throws(() => A.merge(A.importCandidates(A.create(context), candidates), ["run-a:0", "run-a:2"]), /gaps/);
let reviewDoc = A.importCandidates(A.create(context), candidates);
reviewDoc = A.nameGroup(reviewDoc, "run-a/0", "grooming");
reviewDoc = A.assign(reviewDoc, ["run-a:0"], null, true);
reviewDoc = A.addScheme(reviewDoc, "Another lab");
reviewDoc = A.edit(reviewDoc, "run-a:0", { end: 1.9 });
assert.equal(reviewDoc.schemes[0].reviewed["run-a:0"], false, "Boundary changes invalidate all lab reviews");

// Exercise the controller's actual focus logic with video intervals outside neural coverage.
const vm = require("node:vm");
const uiContext = { window: { NeuropixelsAnnotations: A, NeuropixelsBehaviorDiscovery: D } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../scripts/annotation-ui.js"), "utf8"), uiContext);
for (const offset of [-20, 0, 20]) {
  let view;
  const controller = {
    doc: { segments: [{ id: "clip", start: 2, end: 5 }] },
    video: { mapping: { videoToNeural: (t) => t + offset }, pause() {} },
    getRecording: () => ({ duration: 10 }),
    setView(patch) { view = patch; }, render() {}
  };
  uiContext.window.NeuropixelsAnnotationUI.AnnotationController.prototype.select.call(controller, "clip");
  assert(view.visibleRange.start >= 0 && view.visibleRange.end <= 10);
  assert(view.visibleRange.start < view.visibleRange.end, "Off-recording clips must keep a valid neural viewport");
  assert.equal(view.selectedInterval.start, 2 + offset, "Do not invent aligned interval boundaries");
}
