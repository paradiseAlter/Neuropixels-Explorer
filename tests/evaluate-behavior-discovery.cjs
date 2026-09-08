"use strict";
// Reproducible engineering evaluation, not a labeled biological benchmark.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
(async () => {
  const url = process.env.ANNOTATION_TEST_URL || "http://127.0.0.1:8790/";
  const localVideo = process.env.ANNOTATION_TEST_VIDEO;
  const videoUrl = process.env.ANNOTATION_TEST_VIDEO_URL;
  if (!localVideo || !videoUrl) throw new Error("Set ANNOTATION_TEST_VIDEO and ANNOTATION_TEST_VIDEO_URL to the same video");
  const output = path.resolve(process.env.ANNOTATION_TEST_OUTPUT || "runtime/annotation-beta");
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 980 } }); await page.goto(url);
    await page.waitForFunction(() => Boolean(window.NeuropixelsBehaviorDiscovery));
    const data = await page.evaluate(async (source) => {
      const response = await fetch(source); if (!response.ok) throw new Error("Cannot load evaluation video");
      const blob = await response.blob(); const v = document.createElement("video"); v.muted = true; v.src = URL.createObjectURL(blob);
      await new Promise((resolve, reject) => { v.onloadeddata = resolve; v.onerror = () => reject(new Error("Cannot decode video")); });
      const duration = v.duration, canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 48;
      const ctx = canvas.getContext("2d", { willReadFrequently: true }), features = [], times = []; let previous;
      const started = performance.now();
      for (let t = 0; t < duration - .001; t += .2) {
        if (Math.abs(v.currentTime - t) > 1e-6) await new Promise((resolve) => { v.onseeked = resolve; v.currentTime = t; });
        if (Math.abs(v.currentTime - t) > .03) throw new Error("Evaluation video seek failed");
        ctx.drawImage(v, 0, 0, 64, 48); const rgba = ctx.getImageData(0, 0, 64, 48).data, gray = new Uint8Array(64 * 48);
        for (let i = 0; i < gray.length; i++) gray[i] = .299 * rgba[i * 4] + .587 * rgba[i * 4 + 1] + .114 * rgba[i * 4 + 2];
        features.push(window.NeuropixelsBehaviorDiscovery.frameFeatures(previous || gray, gray, 64, 48)); times.push(t); previous = gray;
      }
      const grouping = window.NeuropixelsBehaviorDiscovery.cluster({ features, times, duration, count: 8, minimumDuration: .4 });
      const extractionMs = performance.now() - started;
      const groups = [...new Set(grouping.segments.map((s) => s.group_id))], frames = [];
      canvas.width = 320; canvas.height = 240;
      for (const group of groups) {
        const clips = grouping.segments.filter((s) => s.group_id === group).sort((a, b) => a.distance - b.distance);
        for (const clip of [clips[0], clips.at(-1)]) {
          const t = (clip.start + clip.end) / 2;
          if (Math.abs(v.currentTime - t) > 1e-6) await new Promise((resolve) => { v.onseeked = resolve; v.currentTime = t; });
          ctx.drawImage(v, 0, 0, 320, 240); frames.push({ group, time: t, start: clip.start, end: clip.end, image: canvas.toDataURL("image/jpeg", .85) });
        }
      }
      return { features, times, grouping, frames, duration, extractionMs, width: v.videoWidth, height: v.videoHeight };
    }, videoUrl);
    const video = { name: path.basename(localVideo), size: fs.statSync(localVideo).size, duration: data.duration, sha256: crypto.createHash("sha256").update(fs.readFileSync(localVideo)).digest("hex") };
    fs.writeFileSync(path.join(output, "motion-features.json"), JSON.stringify({ features: data.features, times: data.times, video, feature_method: "Explorer 4x4 motion and appearance, 64x48 frames, 5 Hz" }));
    fs.writeFileSync(path.join(output, "browser-evaluation.json"), JSON.stringify({ video, duration: data.duration, sampleCount: data.times.length, extractionMs: data.extractionMs, grouping: data.grouping }, null, 2));
    await page.setContent(`<html><head><style>body{margin:20px;background:#101316;color:#eee;font:14px Arial}h1{font-size:22px}p{color:#aab}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0}img{width:100%}figcaption{padding:6px}small{color:#acb}</style></head><body><h1>Public mouse video · experimental motion groups</h1><p>Two samples per group: nearest and farthest from its centroid. These images do not establish behavior-label accuracy.</p><main>${data.frames.map((f) => `<figure><img src="${f.image}"><figcaption>Group ${f.group} · ${f.time.toFixed(2)} s <small>(${f.start.toFixed(2)}–${f.end.toFixed(2)})</small></figcaption></figure>`).join("")}</main></body></html>`);
    await page.screenshot({ path: path.join(output, "06-motion-group-samples.png"), fullPage: true });
    console.log(JSON.stringify({ status: "COMPLETE", video, groups: data.grouping.groups, segments: data.grouping.segments.length, samples: data.times.length, extractionMs: data.extractionMs }, null, 2));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
