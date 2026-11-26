// SPDX-License-Identifier: MIT
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

async function stationaryClicks(page, selector) {
  const button = page.locator(selector);
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  let count = 0;
  return async () => {
    // Chrome includes the click count in each click of a multi-click gesture.
    const options = {clickCount: ++count};
    await page.mouse.down(options);
    await page.mouse.up(options);
  };
}

(async () => {
  const html = path.resolve(process.argv[2] || path.join(__dirname, '../index.html'));
  const video = path.resolve(process.argv[3] || path.join(__dirname, 'fixtures/five-colors.webm'));
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    const page = await browser.newPage({offline:true, viewport:{width:1460, height:940}});
    await page.addInitScript(()=>{window.showSaveFilePicker=undefined;});
    await page.goto(pathToFileURL(html).href);
    const choose = page.waitForEvent('filechooser');
    await page.locator('.project-main-actions [data-project-action="video"]').click();
    await (await choose).setFiles(video);
    await page.waitForFunction(() => document.querySelector('#behavior-video').readyState >= 2 && !document.querySelector('#annotation-mark-kind').disabled);
    const media = page.locator('#behavior-video');
    const play = await stationaryClicks(page, '#video-play-button');
    await play();
    await page.waitForFunction(() => !document.querySelector('#behavior-video').paused);
    await play();
    assert(await media.evaluate(v => v.paused), 'second click should pause playback');
    assert(await page.locator('#video-play-button').evaluate(button => {
      button.click();
      button.click();
      return document.querySelector('#behavior-video').paused;
    }), 'pause should also work before the first native play event is delivered');
    for (const [button, direction] of [['#video-next-frame', 1], ['#video-previous-frame', -1]]) {
      const step = await stationaryClicks(page, button);
      for (let i = 0; i < 2; i++) {
        const before = await media.evaluate(v => v.currentTime);
        await step();
        assert((await media.evaluate(v => v.currentTime) - before) * direction > .001);
      }
    }

    await page.locator('#create-annotation').click();
    assert.equal(await page.locator('[data-label-name]').count(),0);
    await page.locator('[data-label-new]').click();
    const swatch=page.locator('[data-label-color]');
    await swatch.evaluate(input=>input.addEventListener('click',e=>{
      e.preventDefault();input.dataset.clicks=String(1+Number(input.dataset.clicks||0));
    }));
    const colorBox=await swatch.boundingBox(),colorRow=await swatch.locator('..').boundingBox();
    assert(colorRow.width>colorBox.width+25);
    await page.mouse.click(colorRow.x+colorRow.width-10,colorBox.y+colorBox.height/2);
    assert.equal(await swatch.getAttribute('data-clicks'),null,'blank color row is inert');
    await swatch.click();
    assert.equal(await swatch.getAttribute('data-clicks'),'1','only the swatch opens the color picker');
    await page.locator('[data-label-name]').fill('reaching');
    await page.locator('dialog[open] form button[type=submit]').click();
    await page.locator('[data-label-use]').click();
    const mark = page.locator('#annotation-mark');
    if (await mark.getAttribute('aria-pressed') === 'true') await page.keyboard.press('Escape');
    const press = await stationaryClicks(page, '#annotation-mark');
    for (let i = 1; i <= 3; i++) {
      if (i === 3) await media.evaluate(v => v.play());
      const start = await media.evaluate(v => v.currentTime);
      await press();
      assert.equal(await mark.getAttribute('aria-pressed'), 'true');
      assert(await page.locator('#annotation-mark-kind').isDisabled());
      await page.waitForFunction(start => document.querySelector('#behavior-video').currentTime > start + .02, start);
      await press();
      assert.equal(await mark.getAttribute('aria-pressed'), 'false', 'a stationary second click should finish the mark');
      assert(await media.evaluate(v => v.paused));
      assert.match(await page.locator('[data-label-type] option:checked').innerText(), new RegExp('reaching.*\\(' + i + '\\)'));
    }
    const kind=page.locator('#annotation-mark-kind');
    await kind.selectOption('point');
    const pausedTime=await media.evaluate(v=>v.currentTime);
    await mark.click();
    assert(await media.evaluate(v=>v.paused && !v.ended));
    assert.equal(await media.evaluate(v=>v.currentTime),pausedTime);
    assert.equal(await mark.getAttribute('aria-pressed'),'false');
    await media.evaluate(v=>v.play());
    await page.waitForFunction(t=>document.querySelector('#behavior-video').currentTime>t+.02,pausedTime);
    await mark.click();
    assert.equal(await media.evaluate(v=>v.paused),false);
    await media.evaluate(v=>v.pause());
    assert.match(await page.locator('[data-label-type] option:checked').innerText(),/reaching.*\(5\)/);
    await page.locator('#video-stage').click({button:'right'});
    const downloading=page.waitForEvent('download');
    await page.locator('[data-workspace-action="save-annotations-as"]').click();
    const saved=JSON.parse(await fs.readFile(await (await downloading).path(),'utf8'));
    assert.equal(saved.labelKinds.reaching,'point');
    assert(saved.segments.slice(0,3).every(s=>s.end>s.start));
    assert.deepEqual(saved.segments.slice(3).map(s=>s.kind),['point','point']);
    assert(saved.segments.slice(3).every(s=>s.end===s.start));
    assert(Math.abs(saved.segments[3].start-pausedTime)<1e-6);
    assert(saved.segments[4].start>pausedTime);
    console.log('PASS offline controls, interval Mark/Stop, one-click points paused and playing, mixed annotation export:', path.basename(video));
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
