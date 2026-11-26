// SPDX-License-Identifier: MIT
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const M = require("../scripts/video-model-adapter.js"), F = require("../scripts/video-features.js"), A = require("../scripts/annotation-core.js"), P = require("../scripts/event-analysis-storage.js");
const copy = x => JSON.parse(JSON.stringify(x));
let checks = 0;
const test = async (name, fn) => { await fn(); checks++; };
(async () => {
  const file = new File(["bounded video identity fixture"], "fixture.webm"), fingerprint = await P.fingerprint(file);
  const context = { recordingKey: "r", videoName: file.name, videoSize: file.size, duration: 10, videoFingerprint: fingerprint };
  const request = F.modelInput(context, A.create(context), { offset: 2, verification_status: "unverified" });
  const samples = Array.from({ length: 16 }, (_, i) => ({ id: `s${i}`, start: i * .5, end: (i + 1) * .5, time: i * .5 + .25 }));
  function fixture(extra = {}) {
    let closed = 0, reads = 0;
    const options = { request, file, model: M.pixelExample, samples, width: 2, height: 2, openDecoder: async () => ({ duration: 10, sourceWidth: 640, sourceHeight: 480,
      close() { closed++; }, async read(sample) { reads++; const color = sample.time < 4 ? [200, 0, 0, 255] : [0, 100, 0, 255]; return { rgba: new Uint8ClampedArray([...color, ...color, ...color, ...color]), width: 2, height: 2, requestedTime: sample.time, seekTime: sample.time }; } }), ...extra };
    return { options, get closed() { return closed; }, get reads() { return reads; } };
  }
  let asset;
  await test("real pixel callback produces values and preserves identities", async () => {
    const f = fixture(); asset = await M.run(f.options); assert.equal(f.reads, 16); assert.equal(f.closed, 1);
    assert.deepEqual(asset.samples[0].values, [200, 0, 0]); assert.deepEqual(asset.samples[15].values, [0, 100, 0]);
    assert.equal(asset.recordingKey, request.recordingKey); assert.equal(asset.video.fingerprint.digest, fingerprint.digest);
    assert.equal(asset.adapter.inputDigest, await P.digestJSON(request)); assert(!("frame" in asset.samples[0]));
  });
  await test("annotation and mapping input is detached and deeply read-only", async () => {
    let seen;
    const f = fixture({ model: { ...M.pixelExample, predict(frame, { input }) { seen = input; assert(Object.isFrozen(input.annotations.schemes[0])); assert.throws(() => { input.annotations.segments.push({}); }, TypeError); return [1, 2, 3]; } } });
    await M.run(f.options); assert.notEqual(seen.annotations, request.annotations); assert.deepEqual(seen, request);
    assert.equal(request.annotations.segments.length, 0);
  });
  await test("frames reach scalar grouping and unreviewed persisted candidate contract", async () => {
    const grouped = F.group(asset, context, { count: 2 }), doc = A.importCandidates(A.create(context), F.candidates(asset, grouped, "model-run", await P.digestJSON(asset)));
    assert.equal(grouped.groups, 2); assert.equal(doc.segments.length, 2); assert(doc.segments.every(s => !A.reviewed(doc, s)));
    assert.deepEqual(A.validate(copy(doc), context).runs[0].source.featureAsset, asset);
  });
  await test("model keypoints with missing values retain explicit gaps", async () => {
    const model = { ...M.pixelExample, kind: "keypoints2d", names: ["nose"], coordinateSpace: "image_pixels", predict({ sample }) { return [sample.id === "s4" ? null : [sample.time < 4 ? 1 : 10, 2, 1]]; } };
    const output = await M.run(fixture({ model }).options), grouped = F.group(output, context, { count: 2 });
    assert.equal(grouped.excluded.length, 1); assert.equal(grouped.excluded[0].id, "s4"); assert(grouped.segments.every(s => s.end <= 2 || s.start >= 2.5));
  });
  for (const [name, change, pattern] of [
    ["fingerprint mismatch", o => o.request.video.fingerprint.digest = "b".repeat(64), /content/],
    ["missing endpoints", o => delete o.samples[0].end, /end/],
    ["overlap", o => o.samples[1].start = .4, /nonoverlapping/],
    ["duplicate IDs", o => o.samples[1].id = "s0", /Duplicate/],
    ["time outside support", o => o.samples[0].time = .5, /intervals/],
    ["oversized frame", o => o.width = 999999, /bounded/],
    ["pixel work budget", o => { o.width = 640; o.height = 640; o.samples = Array.from({ length: 200 }, (_, i) => ({ id: String(i), start: i / 20, end: (i + 1) / 20, time: i / 20 })); }, /budget/],
    ["bad schema", o => o.request.schema = "other", /request/],
    ["no predictor", o => o.model = { ...M.pixelExample, predict: null }, /predict/],
    ["different file name", o => o.file = new File([file], "different.webm"), /name/]
  ]) await test(name, async () => {
    const f = fixture({ request: copy(request), samples: copy(samples) }); change(f.options); await assert.rejects(M.run(f.options), pattern); assert.equal(f.reads, 0);
  });
  for (const [name, predict, pattern] of [
    ["NaN is not silently converted to missing", () => [NaN, 1, 2], /value/],
    ["wrong output shape", () => [1], /shape/],
    ["model exception", () => { throw Error("model failed"); }, /model failed/]
  ]) await test(name, async () => { const f = fixture({ model: { ...M.pixelExample, predict } }); await assert.rejects(M.run(f.options), pattern); assert.equal(f.closed, 1); assert.equal(f.reads, 1); });
  await test("cancel before start opens nothing", async () => { const c = new AbortController(); c.abort(); const f = fixture({ signal: c.signal }); await assert.rejects(M.run(f.options), e => e.name === "AbortError"); assert.equal(f.closed, 0); assert.equal(f.reads, 0); });
  await test("cancel during awaiting predictor discards late output and releases decoder", async () => {
    const c = new AbortController(); let complete;
    const f = fixture({ signal: c.signal, model: { ...M.pixelExample, predict() { const p = new Promise(resolve => { complete = resolve; }); c.abort(); return p; } } });
    await assert.rejects(M.run(f.options), e => e.name === "AbortError"); assert.equal(f.closed, 1); complete([1, 2, 3]);
  });
  await test("stale context rejected after predictor", async () => {
    let current = true; const f = fixture({ ensureCurrent() { if (!current) throw new DOMException("changed", "AbortError"); }, model: { ...M.pixelExample, predict() { current = false; return [1, 2, 3]; } } });
    await assert.rejects(M.run(f.options), e => e.name === "AbortError"); assert.equal(f.closed, 1);
  });
  await test("decoder duration mismatch closes", async () => {
    let closed = 0; const f = fixture({ openDecoder: async () => ({ duration: 11, close() { closed++; } }) }); await assert.rejects(M.run(f.options), /duration/); assert.equal(closed, 1);
  });
  await test("application integration uses existing worker, review and stale guards", async () => {
    let mutation;
    const window = { NeuropixelsAnnotations: A, NeuropixelsVideoFeatures: F, NeuropixelsEventAnalysisStorage: P, NeuropixelsVideoModels: { async run(options) { mutation?.(); options.ensureCurrent(); return asset; } } };
    class Worker { postMessage(message) { queueMicrotask(() => this.onmessage({ data: { result: F.group(message.input, message.context, message.options) } })); } terminate() {} }
    vm.runInNewContext(fs.readFileSync(require.resolve("../scripts/annotation-ui.js"), "utf8"), { window, document: { documentElement: { lang: "en" } }, Blob, File, URL, crypto, TextEncoder, AbortController, DOMException, Worker });
    const proto = window.NeuropixelsAnnotationUI.AnnotationController.prototype;
    function controller() { const a = Object.create(proto); a.key = "k"; a.doc = A.create(context); a.video = { localFile: file, source: { kind: "file" }, elements: { video: { src: "blob:fixture" } }, mapping: { toJSON: () => request.timeMapping } }; a.render = () => {}; a.toast = () => {}; a.panel = { querySelector: () => null }; a.featureOptions = { count: 2 }; a.commit = next => { a.doc = next; }; return a; }
    const a = controller(); await a.runVideoModel(M.pixelExample, samples); assert.equal(a.doc.runs.length, 1); assert.equal(a.abort, null);
    const stale = controller(), original = stale.doc; mutation = () => { stale.doc = A.create(context); }; await stale.runVideoModel(M.pixelExample, samples); assert.equal(stale.doc.runs.length, 0); assert.equal(original.runs.length, 0); assert.match(stale.progressText, /cancel/i);
    mutation = null; const streamed = controller(); streamed.video.localFile = null; await assert.rejects(streamed.runVideoModel(M.pixelExample, samples), /local file/);
  });
  console.log(JSON.stringify({ status: "PASS", checks, scope: "Trusted local pixel/model adapter contract and main annotation integration; decoder pixels stubbed here, actual browser decoding requires the browser fixture" }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
