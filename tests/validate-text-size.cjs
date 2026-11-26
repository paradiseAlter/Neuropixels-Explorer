// SPDX-License-Identifier: MIT
'use strict';
const {setExplorerPreference}=require('./workspace-preferences.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const {npy} = require('../scripts/browser-nwb-worker');

function fixture() {
  const array = (name, data) => ({name, mimeType:'application/octet-stream', buffer:Buffer.from(npy(new Int32Array(data), '<i4'))});
  const units = [1066256495,1066256496];
  return [array('spike_times.npy', [30,900,2000,3900]), array('spike_clusters.npy', [...units,...units]),
    {name:'params.py', mimeType:'text/plain', buffer:Buffer.from('sample_rate = 1000')},
    {name:'explorer-units.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify({
      units:units.map((cluster_id,i)=>({cluster_id,probe_depth_um:140+i*1200, x_um:10,shank_id:0,brain_region:'MB'}))
    }))}];
}

async function check(page, width, language) {
  await page.setViewportSize({width, height:780});
  await page.goto(pathToFileURL(path.resolve(process.argv[2] || 'index.html')).href);
  const size = page.locator('#text-size');
  await setExplorerPreference(page,'#language-select',language);
  assert.equal(await size.inputValue(),'16');
  const picker = page.waitForEvent('filechooser');
  await page.locator('[data-project-action=import-files]').click();
  await (await picker).setFiles(fixture());
  const first = page.locator('.sw-unit[data-unit="1066256495"] .sw-name').first();
  await first.click();
  const range = await page.locator('[data-sw-range]').innerText();
  assert(range);
  const title = first.locator('.sw-unit-title');
  const font = el => parseFloat(getComputedStyle(el).fontSize);
  const original = await title.evaluate(font);
  assert(original >= 14);
  await page.locator('#settings-button').click();
  const startDrag=async(onGrip,dx)=>{
    const {x,y}=await size.evaluate((el,grip)=>{
      const b=el.getBoundingClientRect(),s=getComputedStyle(el);
      return {x:grip?b.right-parseFloat(s.borderRightWidth)-parseFloat(s.paddingRight)-26:b.left+8,y:b.top+b.height/2};
    },onGrip);
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y);
  };
  await startDrag(false,18);await page.mouse.up();assert.equal(await size.inputValue(),'16');
  await startDrag(true,18);await page.mouse.up();
  assert.equal(await size.inputValue(),'19');
  await startDrag(true,12);
  await page.keyboard.press('Escape');await page.mouse.up();
  assert.equal(await size.inputValue(),'19');
  for (const value of [14,17,18,21,24]) {
    if (value === 18) await size.press('ArrowUp');
    else await size.fill(String(value));
    assert.equal(await size.inputValue(),String(value));
    assert.equal(await title.evaluate(font), original * value / 16);
    assert.equal(await first.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-sw-range]').innerText(), range);
    const layout = await page.evaluate(() => {
      const bar = document.querySelector('#workspace-settings').getBoundingClientRect();
      const prefs = [...document.querySelectorAll('#workspace-settings .preference-picker')].map(s=>s.getBoundingClientRect());
      const unit = document.querySelector('.sw-unit .sw-name'), lines = [...unit.children].map(el=>el.getBoundingClientRect());
      const head = unit.getBoundingClientRect();
      const ticks = [...document.querySelectorAll('.sw-axis span')].map(el=>el.getBoundingClientRect());
      const probeLabel = document.querySelector('.probe-position-map text');
      const labelSize = parseFloat(getComputedStyle(probeLabel).fontSize)*probeLabel.getScreenCTM().a;
      const depth = document.querySelector('.mini-probe-selection span').getBoundingClientRect();
      const regions = document.querySelector('.mini-probe-regions').getBoundingClientRect();
      return {width:document.documentElement.scrollWidth,
        prefsFit:prefs.every(r=>r.left>=0 && r.right<=innerWidth+1 && r.width>0 && r.left>=bar.left && r.right<=bar.right+1),
        rowsFit:lines.every(r=>r.top>=head.top && r.bottom<=head.bottom),
        ticksFit:ticks.every((r,i)=>!i || r.left>=ticks[i-1].right-1),
        probeReadable:labelSize>=11 && depth.bottom<=regions.top, idFits:unit.firstElementChild.scrollWidth <=unit.firstElementChild.clientWidth+1};
    });
    assert.deepEqual(layout,{width,prefsFit:true,rowsFit:true,ticksFit:true,probeReadable:true,idFits:true},language+' '+width+' '+value+' '+JSON.stringify(layout));
  }
  await size.fill('99');
  await size.press('Tab');
  assert.equal(await size.inputValue(),'24');
  await size.fill('');
  await size.press('Tab');
  assert.equal(await size.inputValue(),'24');
  await page.locator('#workspace-settings form[method=dialog] button').click();
  await page.locator('#help-button').click();
  assert((await page.locator('#help-content p').first().evaluate(font))>=16);
  await page.locator('#close-help-button').click();
  await page.reload();
  assert.equal(await size.inputValue(),'24');
  await page.evaluate(()=>localStorage.setItem('neuropixels.text-size','largest'));
  await page.reload();
  assert.equal(await size.inputValue(),'20');
  assert.equal(await page.locator('html').evaluate(font),20);
}

(async()=>{
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const width of [1440,1280,1024,390]) for (const language of ['en','zh-CN']) {
      const page = await browser.newPage();
      const errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await check(page,width,language);
      assert.deepEqual(errors,[]);
      await page.close();
      console.log('PASS',width,language);
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
