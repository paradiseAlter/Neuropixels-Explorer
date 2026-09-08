"use strict";
// Optional integration check against the local Allen pilot catalog, never a mock video.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { TimeMapping } = require("../scripts/video-sync.js");

(async () => {
  const output = path.resolve(process.env.ALLEN_TEST_OUTPUT || "runtime/allen-validation/browser");
  fs.mkdirSync(output, { recursive: true });
  const clock = JSON.parse(fs.readFileSync(process.env.ALLEN_TEST_CLOCK, "utf8"));
  const mapping = new TimeMapping(clock.timeMapping);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(process.env.ALLEN_TEST_URL || "http://127.0.0.1:8791/?database=1");
    await page.locator("#explorer-view").waitFor({ state: "visible", timeout: 60000 });
    await page.waitForFunction(() => /Units.*bins/.test(document.querySelector("#activity-status")?.textContent), null, { timeout: 120000 });
    await page.waitForFunction(() => document.querySelector("#behavior-video")?.readyState >= 2);
    assert.match(await page.locator("#video-sync-status").getAttribute("data-status"), /verified/);
    await page.locator("#video-seek").evaluate((element) => { element.value = "30"; element.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.waitForFunction(() => !document.querySelector("#behavior-video").seeking);
    assert(Math.abs(parseFloat(await page.locator("#video-neural-time").innerText()) - mapping.videoToNeural(30)) < .001);
    assert.equal(await page.locator("#video-neural-time").innerText(), await page.locator("#experiment-time-readout").innerText());
    await page.locator("#annotation-toggle").click();
    await page.locator('[data-field="start"]').fill("30");
    await page.locator('[data-field="end"]').fill("32");
    await page.locator('[data-field="label"]').fill("QA review interval");
    await page.locator('[data-action="add"]').click();
    await page.locator("[data-select]").first().click();
    await page.locator('[data-action="confirm"]').click();
    await page.screenshot({ path: path.join(output, "01-real-annotation.png") });
    const csvPromise = page.waitForEvent("download");
    await page.locator('[data-action="csv"]').click();
    await (await csvPromise).saveAs(path.join(output, "annotations.csv"));
    const cells = fs.readFileSync(path.join(output, "annotations.csv"), "utf8").split(/\r?\n/)[1].slice(1, -1).split('","');
    assert(Math.abs(Number(cells[6]) - mapping.videoToNeural(30)) < 1e-10);
    assert(Math.abs(Number(cells[7]) - mapping.videoToNeural(32)) < 1e-10);
    assert.equal(cells[14], "verified");
    await page.locator(".annotation-algorithm summary").click();
    await page.locator('[data-clusters]').fill("5");
    await page.locator('[data-action="run"]').click();
    await page.waitForFunction(() => document.querySelector("[data-progress]")?.textContent.includes("samples"), null, { timeout: 240000 });
    const projectPromise = page.waitForEvent("download");
    await page.locator('[data-action="save"]').click();
    await (await projectPromise).saveAs(path.join(output, "annotation-project.json"));
    const project = JSON.parse(fs.readFileSync(path.join(output, "annotation-project.json"), "utf8"));
    assert.equal(project.runs.length, 1);
    const candidates = project.segments.filter((segment) => segment.runId);
    assert(candidates.length > 1);
    assert(candidates.every((segment) => !project.schemes[0].reviewed[segment.id]));
    await page.locator('[data-group]').selectOption({ index: 2 });
    await page.locator('[data-action="page-select"]').click();
    await page.screenshot({ path: path.join(output, "02-real-candidate-review.png") });
    await page.reload();
    await page.locator("#explorer-view").waitFor({ state: "visible", timeout: 60000 });
    await page.waitForFunction(() => document.querySelector("#behavior-video")?.readyState >= 2);
    await page.locator("#annotation-toggle").click();
    await page.waitForFunction(() => document.querySelector("[data-group]")?.options.length > 2);
    assert.deepEqual(errors, []);
    const summary = { status: "PASS", candidateSegments: candidates.length, groups: new Set(candidates.map(s => s.groupId)).size,
      decodedClockFrames: clock.video.frame_count, syncMaximumErrorMs: clock.timeMapping.provenance.maximum_anchor_error_ms,
      errors, scope: "Real media, neural canvas, synchronized seek, manual review, candidate generation, precise CSV, draft reload; no behavior-label accuracy claim" };
    fs.writeFileSync(path.join(output, "browser-summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(output, "failure.png") });
    console.error(JSON.stringify({ errors, activityStatus: await page.locator("#activity-status").textContent() }));
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
