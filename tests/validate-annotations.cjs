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
{
  const initial = A.create(context), cueColor = A.nextLabelColor(initial);
  const labels = A.addLabel(initial, "cue", "point", cueColor);
  assert.equal(A.color(labels, "cue"), cueColor);
  assert.equal(A.labelKind(labels, "cue"), "point");
  assert.equal(A.labelKind(initial, "walking"), "interval");
  assert.throws(() => A.addLabel(initial, "cue", "span"), /event kind/);
  const mixed = A.add(A.add(labels, { start: 0, label: "cue" }), { start: 0, end: 2, label: "walking" });
  const [point, span] = mixed.segments;
  assert.deepEqual([point.kind, point.start, point.end], ["point", 0, 0]);
  assert.equal(A.validate(JSON.parse(JSON.stringify(mixed)), context).segments[0].kind, "point");
  const moved = A.edit(mixed, point.id, { start: context.duration });
  assert.deepEqual([moved.segments[0].start, moved.segments[0].end], [10, 10]);
  assert.equal(moved.segments[0].origin.start, 0);
  for (const start of [-1, 11]) assert.throws(() => A.add(labels, { start, kind: "point" }), /inside/);
  assert.throws(() => A.add(labels, { start: 2, end: 3, kind: "point" }), /one timestamp/);
  assert.throws(() => A.add(labels, { start: 2, end: 2 }), /start < end/);
  assert.throws(() => A.split(mixed, point.id, .001), /inside/);
  assert.throws(() => A.merge(mixed, [point.id, span.id]), /duration/);
  const projected = A.project(mixed, { videoToNeural: t => 4 + t });
  assert.deepEqual([projected[0].kind, projected[0].start, projected[0].end], ["point", 4, 4]);
  const fields = A.toCSV(mixed, { offset_s: 4, scale: 1 }).split("\r\n").map(row=>row.slice(1,-1).split('","'));
  const col = name => fields[0].indexOf(name);
  assert.deepEqual(["video_start_s","video_end_s","neural_start_s","neural_end_s","event_kind"].map(name=>fields[1][col(name)]), ["0","","4","","point"]);
  assert.equal(fields[2][col("event_kind")], "interval");
  const deleted = A.remove(mixed, [point.id], "cue");
  assert(!Object.hasOwn(deleted.labelKinds, "cue"));
  assert.deepEqual(deleted.segments, [span]);
}
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
const html = fs.readFileSync(path.join(__dirname, "../scripts/explorer-shell.html"), "utf8");
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
const linked=reviewDoc.segments.filter(segment=>reviewDoc.schemes.some(s=>A.label(reviewDoc,segment,s)==="grooming"));
const afterDeletion=A.remove(reviewDoc,linked.map(s=>s.id),"grooming");
assert.deepEqual(afterDeletion.segments.map(s=>s.id),["run-a:1"]);
assert.ok(afterDeletion.schemes.every(s=>!Object.values(s.mappings).includes("grooming")));
assert.ok(!Object.hasOwn(afterDeletion.labelColors,"grooming"));
assert.deepEqual(afterDeletion.runs,reviewDoc.runs,"Deleting a linked label preserves the imported run and its original boundaries");
A.validate(afterDeletion,context);

// Exercise the controller's actual focus logic with video intervals outside neural coverage.
const vm = require("node:vm");
const uiContext = { window: { NeuropixelsAnnotations: A, NeuropixelsBehaviorDiscovery: D } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../scripts/annotation-ui.js"), "utf8"), uiContext);
for (const offset of [-20, -3, 0, 8, 20]) {
  let view={visibleRange:{start:1,end:6},cursorTime:3}, videoTime=null;
  const controller=Object.assign(Object.create(uiContext.window.NeuropixelsAnnotationUI.AnnotationController.prototype),{
    doc: { segments: [{ id: "clip", start: 2, end: 5 }] },
    video: { mapping: { videoToNeural: (t) => t + offset }, pause() {}, seekVideo:t=>{videoTime=t},t:k=>k },
    getRecording: () => ({ duration: 10 }),
    setView(patch) { Object.assign(view,patch); }, render() {}, toast() {}
  });
  controller.select("clip");
  assert(view.visibleRange.start >= 0 && view.visibleRange.end <= 10);
  const start=Math.max(0,2+offset),end=Math.min(10,5+offset);
  if(end>start)assert.deepEqual([view.selectedInterval.start,view.selectedInterval.end],[start,end]);
  else assert.equal(view.selectedInterval,null);
  if(offset!==0){
    assert.equal(videoTime,2);
    assert.equal(view.cursorTime,3);
    assert.deepEqual(view.visibleRange,{start:1,end:6});
  }
}
