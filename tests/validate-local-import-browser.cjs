"use strict";
const {setExplorerPreference}=require('./workspace-preferences.cjs');
const {chromium}=require("playwright");
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
(async()=>{
  const out=path.resolve("runtime/beta3-import/screenshots");fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({channel:"chrome",headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const ready=()=>page.locator('#signal-workspace .sw-space [data-unit] canvas[aria-label$=" Hz"]').first().waitFor({state:"visible",timeout:180000});
  const seek=async time=>page.locator("#video-seek").evaluate((e,time)=>{e.value=time;e.dispatchEvent(new Event("input",{bubbles:true}));},String(time));
  try {
    await page.goto("http://127.0.0.1:8793");await setExplorerPreference(page,"#language-select","zh-CN");
    await page.waitForFunction(()=>document.querySelector(".start-note").textContent.includes("原位置"));
    await page.locator('.start-actions [data-project-action="nwb"]').click();
    await page.locator("[data-candidate]").filter({hasText:"probeC"}).waitFor({timeout:30000});
    await page.screenshot({path:path.join(out,"01-nwb-probes.png")});
    await page.locator("[data-candidate]").filter({hasText:"probeC"}).click();await ready();
    const name=await page.locator("#experiment-recording-name").textContent();
    if(await page.locator("[data-video-token]").count()) {
      await page.screenshot({path:path.join(out,"02a-nearby-video-suggestion.png")});
      await page.locator("#project-dialog [data-close-project]").last().click();
    }
    await page.screenshot({path:path.join(out,"02-neural-only.png")});
    await page.locator(await page.locator("#replace-video").isVisible()?"#replace-video":"#choose-local-video").click();
    await page.locator("#project-dialog").waitFor({state:"hidden",timeout:30000});
    await page.waitForFunction(()=>document.querySelector("#behavior-video").readyState>=2,{},{timeout:30000});
    assert.match(await page.locator("#video-clock-row[data-import-drop=clock]").innerText(),/缺少.*帧时钟 JSON/s);
    await seek(10);await page.locator("#video-alignment").click();
    await page.locator("[data-video-at]").fill("10");await page.locator("[data-neural-at]").fill("12");
    await page.locator("[data-apply-alignment]").click();
    await page.locator("#project-dialog").waitFor({state:"hidden",timeout:30000});
    await page.waitForFunction(()=>document.querySelector("#behavior-video").readyState>=2);
    await seek(10);await page.locator("#annotation-mark").click();
    await page.locator('[data-label-new]').click();
    await page.locator('[data-label-name]').fill("实验室自定义动作");
    await page.locator('.annotation-name-form [type=submit]').click();
    await page.locator('[data-label-use]').click();
    await page.waitForFunction(()=>document.getElementById("annotation-mark").getAttribute("aria-pressed")==="true");
    await seek(12);await page.locator("#annotation-mark").click();
    await page.waitForFunction(()=>document.querySelector('[data-label-type]')?.selectedOptions[0]?.textContent.includes("实验室自定义动作 (1)"));
    assert.equal(await page.locator("#annotation-color-legend").count(),0);
    if (!await page.locator("#video-event-detail").evaluate(detail=>detail.open)) await page.locator("#video-event-detail summary").click();
    for (const layout of ["side","stacked"]) {
      await page.locator('[data-workspace-layout="'+layout+'"]').click();
      await page.waitForFunction(()=>{
        const rect=id=>document.getElementById(id).getBoundingClientRect();
        return rect("video-event-detail").height>60 && rect("video-seek").width>0 &&
          rect("behavior-labels").bottom<=rect("video-event-detail").top+1 &&
          rect("video-event-detail").bottom<=rect("video-event-overview").top+1 &&
          rect("video-event-overview").bottom<=rect("video-play-button").top+1;
      });
    }
    await page.screenshot({path:path.join(out,"03-separate-video-annotation.png")});
    await page.reload();await page.waitForFunction(()=>document.querySelector('[data-project-action="recent"]'));
    await page.locator('.recent-projects [data-project-action="recent"]').filter({hasText:name.split(" / ")[0]}).first().click();
    await ready();await page.waitForFunction(()=>document.querySelector("#behavior-video").readyState>=2);
    await seek(10);
    await page.waitForFunction(()=>Math.abs(parseFloat(document.querySelector("#video-neural-time").textContent)-12)<.01);
    await page.locator('[data-label-source=annotation]').click();
    await page.waitForFunction(()=>Array.from(document.querySelector('[data-label-type]').options).some(option=>option.textContent==="实验室自定义动作 (1)"));
    if(process.env.ALLEN_IMPORT_TEST_CLOCK) {
      await page.locator("#video-alignment").click();await page.locator("[data-clock]").click();
      await page.locator("#project-dialog").waitFor({state:"hidden",timeout:30000});
      await page.waitForFunction(()=>document.querySelector("#video-link-note").textContent.includes("帧时间已验证"));
    }
    await page.locator("#open-folder-button").click();
    await page.locator('#open-menu [data-project-action="folder"]').click();
    await page.locator("[data-candidate]").click();
    await page.waitForFunction(()=>document.querySelector("#experiment-recording-name").textContent.includes("Kilosort"),{},{timeout:30000});
    await ready();
    assert((await page.locator("#experiment-recording-name").textContent()).includes("Kilosort"));
    await page.locator("#mini-probe [data-probe-unit='0']").first().click();
    await page.waitForFunction(()=>document.querySelector(".mini-probe-selection").textContent.includes("0 µm"));
    await page.screenshot({path:path.join(out,"04-kilosort.png")});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,"result.json"),JSON.stringify({passed:true,name,errors,selection:"Native picker substituted only; actual files imported by production service."},null,2));
    console.log(JSON.stringify({passed:true,name,errors}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
