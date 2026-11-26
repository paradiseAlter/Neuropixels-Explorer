// SPDX-License-Identifier: MIT
// Optional isolated browser QA. node tests/serve-video-model-check.cjs <local-video>
// Open the printed URL in the browser. This never reads/writes a normal project origin.
"use strict";
const fs = require("node:fs"), path = require("node:path"), http = require("node:http");
const root = path.resolve(__dirname, ".."), videoPath = process.argv[2];
if (!videoPath) throw Error("Supply a local video fixture path");
const videoBytes = fs.readFileSync(videoPath), videoName = path.basename(videoPath);
if (!videoBytes.length || videoBytes.length > 512 * 1024 * 1024) throw Error("Video fixture exceeds adapter limits");
const out = path.join(root, "runtime", "video-model-validation"); fs.mkdirSync(out, { recursive: true });
const { npy } = require("../scripts/browser-nwb-worker.js");
const { buildStandalone, applyStandalonePolicy } = require("../scripts/build-standalone.cjs");
const files = { "spike_times.npy": Buffer.from(npy(Float64Array.from([1, 2, 3, 5, 7, 10, 20, 35]), "<f8")),
  "spike_clusters.npy": Buffer.from(npy(Int32Array.from([1, 1, 1, 1, 1, 1, 1, 1]), "<i4")), "params.py": Buffer.from("sample_rate = 1\n") };
let html = buildStandalone();
html = html.replace("window.NeuropixelsBrowserProjectUI=BrowserProjectUI;", "window.NeuropixelsBrowserProjectUI=class extends BrowserProjectUI {constructor(o){super(o);window.__modelProject=this;}};");
const bootstrap = async function () {
  const box = document.createElement("pre"); box.id = "model-qa-result"; box.style = "position:fixed;bottom:0;right:0;max-width:48vw;max-height:30vh;overflow:auto;background:#fff;color:#111;z-index:99999;border:2px solid #1565c0;padding:8px"; document.body.append(box);
  const status = text => { box.textContent = text; }, check = (ok, message) => { if (!ok) throw Error(message); };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async test => { for (let i = 0; i < 600; i++) { if (test()) return; await sleep(100); } throw Error("App readiness timeout"); };
  try {
    status("RUNNING: isolated model adapter browser checks");
    await wait(() => window.__modelProject); const p = window.__modelProject, a = p.annotations, P = NeuropixelsEventAnalysisStorage, M = NeuropixelsVideoModels, A = NeuropixelsAnnotations;
    const meta = await (await fetch("/fixture-meta.json")).json();
    if (location.hash === "#restore") {
      const original = p.selectFiles; try { p.selectFiles = async () => [new File([await (await fetch("/saved.neuroproject")).blob()], "model-qa.neuroproject")]; await p.pick("open-project"); } finally { p.selectFiles = original; }
      await wait(() => a.doc && p.video.elements.video.readyState >= 2);
      const expected = JSON.parse(sessionStorage.getItem("model-qa-expected")), run = a.doc.runs.at(-1);
      check(await P.digestJSON(a.doc) === expected.documentDigest, "Full reload did not restore exact annotation document");
      check(await P.digestJSON(run.source.featureAsset) === expected.featureDigest, "Feature provenance changed after reload");
      check(await P.digestJSON(run.source.featureAsset.adapter.inputSnapshot) === run.source.featureAsset.adapter.inputDigest, "Exact model input snapshot did not restore");
      check(a.doc.segments.filter(s => s.runId === run.id).every(s => !A.reviewed(a.doc, s)), "Restored model candidates became reviewed");
      a.opened = true; a.reviewMode = true; a.featureOpen = true; a.render();
      const report = { ...expected, status: "PASS", fullPageReload: true, exactModelInputSnapshotRestored: true, restoredProjectId: p.active.id, allModelClipsUnreviewed: true,
        limitations: "Real video pixels with a transparent RGB-mean example; synthetic unmatched neural scaffold and QA label. No behavior, pose, neural association or pretrained-model accuracy claim. Native file chooser/download manager not tested." };
      await fetch("/report.json", { method: "POST", body: JSON.stringify(report) }); status(JSON.stringify(report, null, 2)); return;
    }
    const neuralFiles = await Promise.all(meta.files.map(async name => { const f = new File([await (await fetch("/fixture/" + name)).arrayBuffer()], name); Object.defineProperty(f, "relativePath", { value: "isolated-model-qa/" + name }); return f; }));
    p.creation = { projectName: "Isolated pixel-model QA, not neuroscience data" }; await p.create(neuralFiles); p.dialog.close();
    const original = p.selectFiles; try { p.selectFiles = async () => [new File([await (await fetch("/video")).blob()], meta.videoName, { type: "video/mp4" })]; await p.pick("video"); } finally { p.selectFiles = original; }
    await wait(() => a.doc && p.video.elements.video.readyState >= 2);
    a.commit(A.add(a.doc, { start: 1, end: 2, subject: "QA-only", track: "QA", label: "Software fixture, not observed behavior" }));
    a.opened = true; a.reviewMode = true; a.featureOpen = true; a.featureOptions = { count: 2 }; a.render();
    p.video.seekVideo(3); await sleep(200); const sharedTime = p.video.elements.video.currentTime, sourceDocument = a.doc;
    let snapshotChecked = false;
    const model = { ...M.pixelExample, predict(frame, { input }) { check(frame.rgba.length === frame.width * frame.height * 4, "Missing actual frame pixels"); check(input.annotations.segments.length === 1 && Object.isFrozen(input.annotations), "Annotation snapshot not available"); snapshotChecked = true; return M.pixelExample.predict(frame); } };
    const end = Math.min(8, a.doc.context.duration), samples = Array.from({ length: 16 }, (_, i) => ({ id: "real-frame-" + i, start: i * end / 16, end: (i + 1) * end / 16, time: (i + .5) * end / 16 }));
    status("RUNNING: actual local video decoding and model callback"); await a.runVideoModel(model, samples, { width: 80, height: 60 });
    check(a.doc.runs.length === 1, "No model run: " + a.progressText); check(snapshotChecked, "Model did not receive annotations");
    check(p.video.elements.video.currentTime === sharedTime, "Model decoder moved shared video time"); check(sourceDocument.runs.length === 0, "Model changed original annotation snapshot");
    const run = a.doc.runs[0], asset = run.source.featureAsset; check(asset.samples.length === 16 && asset.samples.some(s => s.values.some(v => v > 0)), "No nonzero decoded image features");
    const before = await P.digestJSON(a.doc), pending = a.runVideoModel(model, samples); a.abort.abort(); await pending; check(await P.digestJSON(a.doc) === before, "Cancel changed annotations");
    const pending2 = a.runVideoModel(model, samples); a.video.localFile = new File([a.video.localFile], meta.videoName); await pending2; check(await P.digestJSON(a.doc) === before, "Source replacement committed a stale model result");
    a.render(); const button = a.panel.querySelector('[data-action="feature-model-example"]'); check(button && !button.disabled, "Main application model example is not available");
    status("RUNNING: real main-application example button"); await a.action({ target: button }); check(a.doc.runs.length === 2, "Example button did not commit: " + a.progressText);
    const latest = a.doc.runs.at(-1); check(latest.source.featureAsset.adapter.version === M.VERSION, "Adapter provenance missing");
    await a.flush();
    const expected = { snapshotChecked, originalSharedTime: sharedTime, firstModelSamples: asset.samples.length, firstPixelValues: asset.samples[0].values,
      sourceVideoName: meta.videoName, sourceVideoBytes: meta.videoBytes, exampleButtonSamples: latest.source.featureAsset.samples.length,
      cancellationPreservedDocument: true, sourceReplacementPreservedDocument: true, documentDigest: await P.digestJSON(a.doc), featureDigest: await P.digestJSON(latest.source.featureAsset), originalProjectId: p.active.id };
    const originalPicker = window.showSaveFilePicker;
    let exported;
    try {
      window.showSaveFilePicker = async () => ({
        createWritable: async () => ({ write: async blob => { exported = blob; }, close: async () => {} })
      });
      await p.exportProject();
    } finally { window.showSaveFilePicker = originalPicker; }
    check(exported instanceof Blob, "Project export did not produce a package"); const saved = await fetch("/saved.neuroproject", { method: "POST", body: exported }); check(saved.ok, "Could not capture QA package");
    sessionStorage.setItem("model-qa-expected", JSON.stringify(expected)); location.hash = "restore"; location.reload();
  } catch (error) { const report = { status: "FAIL", error: error.stack || error.message }; await fetch("/report.json", { method: "POST", body: JSON.stringify(report) }).catch(() => {}); status(JSON.stringify(report, null, 2)); }
};
html = applyStandalonePolicy(html.replace("</body>", `<script>addEventListener('DOMContentLoaded', ${bootstrap.toString()});</script></body>`));
let saved;
const server = http.createServer((req, res) => {
  if (req.method === "POST" && ["/report.json", "/saved.neuroproject"].includes(req.url)) {
    const parts = []; let bytes = 0; req.on("data", data => { bytes += data.length; if (bytes > 64 * 1024 * 1024) req.destroy(); else parts.push(data); });
    req.on("end", () => { const body = Buffer.concat(parts); if (req.url === "/saved.neuroproject") saved = body; else { fs.writeFileSync(path.join(out, "browser-report.json"), body); console.log(body.toString()); } res.end("ok"); }); return;
  }
  if (req.url === "/") { res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.end(html); }
  if (req.url === "/fixture-meta.json") { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ videoName, videoBytes: videoBytes.length, files: Object.keys(files) })); }
  if (req.url === "/video") { res.setHeader("Content-Type", "video/mp4"); return res.end(videoBytes); }
  if (req.url === "/saved.neuroproject" && saved) return res.end(saved);
  if (req.url.startsWith("/fixture/") && files[req.url.slice(9)]) return res.end(files[req.url.slice(9)]);
  res.statusCode = 404; res.end();
});
server.listen(0, "127.0.0.1", () => console.log(`Open isolated browser check: http://127.0.0.1:${server.address().port}/`));
