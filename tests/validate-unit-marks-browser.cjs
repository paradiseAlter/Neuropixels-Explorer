// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {npy}=require('../scripts/browser-nwb-worker');
const {pack,unpack}=require('../scripts/browser-storage');

async function fixture(id){
  const keys=['probeA','probeB'],assets=[];
  for(const key of keys){
    const add=(name,bytes)=>assets.push({name,path:key+'/'+name,blob:new Blob([bytes])});
    add('spike_times.npy',npy(new Int32Array([100,500,900,1100,2050,2140,3900,4200]),'<i4'));
    add('spike_clusters.npy',npy(new Int32Array([1,2,1,2,1,2,1,2]),'<i4'));
    add('params.py','sample_rate = 1000');
    add('explorer-units.json',JSON.stringify({units:[1,2].map(id=>({cluster_id:id,shank_id:0,probe_depth_um:20,x_um:20,brain_region:'A'}))}));
    add('explorer-events.json',JSON.stringify({schema:'neuropixels-events/1',recordingId:key,timebase:'neural_seconds',events:[1,2].map(i=>({
      id:'event'+i,sourceId:'event'+i,sourceKind:'experiment',type:'stim',kind:'point',start:i
    }))}));
  }
  const p={id,name:id,recordingIds:keys,recordingSources:Object.fromEntries(keys.map(probe=>[probe,{session:id,probe}]))};
  return Buffer.from(await pack(p,assets,{}).arrayBuffer());
}
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1536,height:1000},acceptDownloads:true});
    page.setDefaultTimeout(9000);
    await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined}));
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.type()==='confirm'?d.accept():d.dismiss());
    await page.goto(pathToFileURL(path.resolve(process.argv[2]||'index.html')).href);
    async function load(bytes){
      const open=page.waitForEvent('filechooser');
      await page.locator('[data-project-action=open-project]:visible').first().click();
      await (await open).setFiles({name:'test.neuroproject',mimeType:'application/octet-stream',buffer:bytes});
      await page.locator('#signal-workspace .sw-unit-title').first().waitFor();
    }
    const tab=key=>page.locator('#recording-strip [data-recording-key="'+key+'"]');
    const name=id=>page.locator('#signal-workspace [data-unit="'+id+'"] .sw-unit-title').first();
    async function waitStars(el,n){
      const deadline=Date.now()+7000;
      while(Date.now()<deadline){
        const count=await el.evaluate(node=>(getComputedStyle(node,'::after').content.match(/★/g)||[]).length);
        if(count===n)return;
        await new Promise(resolve=>setTimeout(resolve,40));
      }
      assert.fail('Expected '+n+' stars on '+await el.evaluate(node=>node.outerHTML));
    }
    const first=await fixture('marks-study');
    await load(first);await tab('probeA').click();
    await name(1).click({button:'right'});await page.locator('#unit-context-menu [data-mark-action=interest]').click();
    await waitStars(name(1),1);await waitStars(name(2),0);
    await page.locator('#settings-button').click();const box=page.locator('#unit-mark-settings');await box.locator('summary').press('Enter');
    await box.locator('input[type=color]').fill('#ad459f');await box.locator('input[required]').fill('Repeat');
    await box.locator('input[required]').press('Enter');await box.locator('input[type=color]').nth(1).waitFor();
    await page.locator('#workspace-settings form[method=dialog] button').click();
    await name(1).click({button:'right'});await page.locator('#unit-context-menu [data-mark-action]').filter({hasText:'Repeat'}).click();
    await waitStars(name(1),2);
    await tab('probeB').click();await waitStars(name(1),0);
    await tab('probeA').click();await waitStars(name(1),2);
    await page.locator('#event-analysis-button').click();
    const fields=page.locator('.event-analysis-dialog:visible');
    await fields.locator('[name=eventType] option[value=stim]').waitFor({state:'attached'});
    await fields.locator('[name=eventType]').selectOption('stim');
    const choice=fields.locator('[data-ea-unit-choice]');
    await choice.selectOption('probe');
    const map=fields.locator('.probe-position-map');
    await map.locator('[data-probe-unit="1"]').click({button:'right',force:true});
    await fields.locator('.probe-overlaps').getByRole('button',{name:'Unit 2'}).click();
    assert.equal(await page.locator('.unit-mark-popup [data-mark-action=interest]').getAttribute('aria-checked'),'false');
    await page.keyboard.press('Escape');
    await choice.selectOption('all');
    await fields.locator('[data-ea-run]').click();
    const heat=fields.locator('[data-ea-unit="1"]');
    await waitStars(heat.locator('[data-mark-ref]'),2);await heat.click();
    await waitStars(fields.locator('[data-ea-unit-keys] [data-mark-ref]'),2);
    await fields.locator('[data-spike-unit="1"]').first().click({button:'right'});
    assert.equal(await fields.locator('.ea-image-menu [data-mark-action=interest]').getAttribute('aria-checked'),'true');
    await fields.locator('.ea-image-menu [data-mark-action=interest]').click();
    await waitStars(heat.locator('[data-mark-ref]'),1);
    await tab('probeA').click();
    await page.locator('[data-joint-recording]').click();
    await waitStars(page.locator('#signal-workspace .sw-unit-title').filter({hasText:'probeA · Unit 1'}).first(),1);
    await waitStars(page.locator('#signal-workspace .sw-unit-title').filter({hasText:'probeB · Unit 1'}).first(),0);
    await tab('probeA').click();await waitStars(name(1),1);
    const pending=page.waitForEvent('download');
    await page.locator('#save-project-button').click();await page.locator('[data-confirm-export]').click();
    const saved=await fs.readFile(await (await pending).path());
    const manifest=(await unpack(new Blob([saved]))).project;
    assert.equal(manifest.unitMarks.types.find(t=>t.id==='interest').color,'#ad459f');
    assert.equal(Object.keys(manifest.unitMarks.byUnit).length,1);
    await load(await fixture('other-study'));
    await page.waitForFunction(()=>document.querySelector('#save-project-button')?.disabled===false);
    await waitStars(name(1),0);
    await load(saved);await waitStars(name(1),1);
    await tab('probeA').click({button:'right'});
    await page.locator('[data-workspace-action=close-recording]').click();
    await tab('probeA').waitFor({state:'detached'});await waitStars(name(1),0);
    await tab('probeB').click({button:'right'});
    await page.locator('[data-workspace-action=restore-recording]').click();
    await tab('probeA').click();await waitStars(name(1),1);
    assert.deepEqual(errors,[]);
    console.log('Unit marks passed: multi-color marks, source identities, event raster / heatmap, joint probes, save/reopen and independent projects.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
