"use strict";
// Optional real-data acceptance: run prepare_allen_demo.py first.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { TimeMapping } = require("../scripts/video-sync.js");

(async () => {
  assert(process.env.ALLEN_DATA_ROOT, "Set ALLEN_DATA_ROOT to the prepared external corpus");
  const root = path.resolve(process.env.ALLEN_DATA_ROOT);
  const preparation = JSON.parse(fs.readFileSync(path.join(root, "derived/demo-preparation.json"), "utf8"));
  assert.equal(preparation.pending_sessions.length, 0, "Finish preparing the selected corpus first");
  const output = path.resolve(process.env.ALLEN_TEST_OUTPUT || "runtime/allen-validation/corpus-browser");
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [], results = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(process.env.ALLEN_TEST_URL || "http://127.0.0.1:8791/?database=1");
    await page.locator("#explorer-view").waitFor({ state: "visible", timeout: 60000 });
    for (const entry of preparation.prepared) {
      const clock = JSON.parse(fs.readFileSync(path.join(root, "derived", entry.session_id, "side-full.clock.json"), "utf8"));
      const mapping = new TimeMapping(clock.timeMapping);
      await page.locator("#recording-strip button").filter({ hasText: `${entry.session_id} / ${entry.probe}` }).click();
      await page.waitForFunction(({ sid, count }) =>
        document.querySelector("#experiment-recording-name")?.textContent.includes(sid)
        && document.querySelector("#activity-status")?.textContent === `${count} Units`
        && document.querySelector('#signal-workspace:not([hidden]) .sw-space [data-unit] canvas[aria-label$=" Hz"]')
        && document.querySelector("#behavior-video")?.readyState >= 2,
      { sid: entry.session_id, count: entry.units }, { timeout: 180000 });
      assert.equal(await page.locator("#video-sync-status").getAttribute("data-status"), "verified");
      const videoSeconds = 1200;
      await page.locator("#video-seek").evaluate((element, seconds) => {
        element.value = String(seconds); element.dispatchEvent(new Event("input", { bubbles: true }));
      }, videoSeconds);
      await page.waitForFunction(seconds => {
        const video = document.querySelector("#behavior-video");
        return !video.seeking && Math.abs(video.currentTime - seconds) < .05;
      }, videoSeconds);
      const neuralSeconds = parseFloat(await page.locator("#video-neural-time").innerText());
      assert(Math.abs(neuralSeconds - mapping.videoToNeural(videoSeconds)) < .001);
      assert.equal(await page.locator("#video-neural-time").innerText(), await page.locator("#experiment-time-readout").innerText());
      const duration = await page.locator("#behavior-video").evaluate(video => video.duration);
      assert(Math.abs(duration - clock.video.duration_s) < .001);
      await page.screenshot({ path: path.join(output, `${entry.session_id}.png`) });
      results.push({ session_id: entry.session_id, probe: entry.probe, units: entry.units, video_duration_s: duration,
        seek_video_s: videoSeconds, displayed_neural_s: neuralSeconds, status: "PASS" });
    }
    assert.deepEqual(errors, []);
    const summary = { status: "PASS", sessions: results, errors,
      scope: "Real catalog switching, neural overview, full video seek and measured shared clock. No behavior accuracy claim." };
    fs.writeFileSync(path.join(output, "summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(output, "failure.png") });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
