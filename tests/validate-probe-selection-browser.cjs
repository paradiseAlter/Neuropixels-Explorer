// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),{npy}=require('../scripts/browser-nwb-worker'),{pack}=require('../scripts/browser-storage');
async function checkPickerSize(page,fields){
  const frame=fields.locator('.ea-picker-viewport');
  for(const [axis,dx,dy] of [['x',-57,0],['y',0,-39],['xy',31,23]]){
    const edge=frame.locator('[data-picker-resize="'+axis+'"]');
    await edge.scrollIntoViewIfNeeded();
    const before=await frame.boundingBox(),bounds=await edge.boundingBox();
    const x=bounds.x+(axis==='xy'?bounds.width-2:bounds.width/2);
    const y=bounds.y+(axis==='xy'?bounds.height-2:bounds.height/2);
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x+dx,y+dy,{steps:4});await page.mouse.up();
    const after=await frame.boundingBox();
    assert(Math.abs(after.width-before.width-dx)<2 && Math.abs(after.height-before.height-dy)<2,axis+' edge resize');
  }
}
async function checkSavedSelection(page,fields){
  const scope=page.locator('#experiment-recording-name'),original=await scope.innerText();
  const expected=await fields.locator('[data-remove-unit]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.probe,n.dataset.removeUnit]).sort());
  const method=fields.locator('[data-ea-method]');
  if(await method.count())await method.locator('summary').click();
  await fields.locator('[data-ea-action=save]').click();
  await fields.locator('[data-ea-status]').filter({hasText:/saved|已保存|guardad/i}).waitFor();
  await page.locator('#open-folder-button').click();
  await page.locator('[data-project-action=open-saved-clusters]').click();
  const restored=page.locator('#analysis-pages > section').last();
  await restored.locator('[data-ea-results] canvas').first().waitFor();
  await restored.locator('[data-ea-inputs] > summary').click();
  await restored.locator('[data-ea-unit-choice]').selectOption('spikes');
  const spike=restored.locator('.sw-unit-picker');
  await spike.locator('[data-sw-tool=zoom]').click();
  assert.equal(await spike.getAttribute('data-sw-mode'),'zoom');
  await spike.locator('[data-sw-tool=pan]').click();
  const originalView=await spike.locator('[data-sw-range]').innerText(),before=await spike.locator('.sw-viewport').boundingBox();
  await checkPickerSize(page,restored);
  const after=await spike.locator('.sw-viewport').boundingBox();
  assert(before.width>after.width+20 && before.height>after.height+10);
  assert.equal(await spike.locator('[data-sw-range]').innerText(),originalView);
  const row=spike.locator('.sw-unit-head').first(),viewport=spike.locator('.sw-viewport');
  await row.scrollIntoViewIfNeeded();
  const extent=await viewport.boundingBox(),scroll=await viewport.evaluate(el=>el.scrollTop);
  await row.click();
  assert.deepEqual(await viewport.boundingBox(),extent);
  assert.equal(await viewport.evaluate(el=>el.scrollTop),scroll);
  assert.equal(await spike.locator('[data-sw-range]').innerText(),originalView);
  const chips=restored.locator('[data-remove-unit]');
  await chips.first().waitFor();
  assert.deepEqual(await chips.evaluateAll(nodes=>nodes.map(n=>[n.dataset.probe,n.dataset.removeUnit]).sort()),expected);
  assert.equal(await scope.innerText(),original);
  await page.locator('[data-analysis-close]').last().click();
}
async function main(){
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1560,height:1000}});
    page.setDefaultTimeout(10000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.type()==='confirm'?d.accept():d.dismiss());
    await page.goto(pathToFileURL(path.resolve(process.argv[2]||'index.html')).href);
    const keys=['probeA','probeB'],assets=[],unitIds=[1,2,3,4,5];
    for(const key of keys){
      const add=(name,bytes)=>assets.push({path:key+'/'+name,name,blob:new Blob([bytes])});
      add('spike_times.npy',npy(new Int32Array([100,200,300,400,500]),'<i4'));
      add('spike_clusters.npy',npy(Int32Array.from(unitIds),'<i4'));add('params.py','sample_rate = 1000');
      const events=[1,2,3].map(i=>({id:'e'+i,sourceId:'e'+i,sourceKind:'experiment',type:'stim',kind:'point',start:.1*i}));
      if(key==='probeB')events.push({...events[0],id:'only-b',sourceId:'only-b',type:'stim-b'});
      add('explorer-events.json',JSON.stringify({schema:'neuropixels-events/1',recordingId:key,timebase:'neural_seconds',events}));
      add('explorer-units.json',JSON.stringify({units:unitIds.map((cluster_id,i)=>({cluster_id,probe_depth_um:[10,30,50,70,70][i],x_um:[20,40,60,80,80][i],shank_id:0,brain_region:'A'}))}));
    }
    const project={id:'probes',name:'Probe selection',recordingIds:keys,recordingSources:Object.fromEntries(keys.map(probe=>[probe,{session:'test',probe}]))};
    const open=page.waitForEvent('filechooser');await page.locator('[data-project-action=open-project]:visible').first().click();
    await (await open).setFiles({name:'selection.neuroproject',mimeType:'application/octet-stream',buffer:Buffer.from(await pack(project,assets,{}).arrayBuffer())});
    await page.locator('#mini-probe circle').first().waitFor();
    assert.equal(await page.locator('#mini-probe [data-probe-shape]').count(),0);
    await page.locator('#event-analysis-button').click();
    const fields=page.locator('.event-analysis-dialog:visible');
    await fields.locator('[name=eventType] option[value="stim"]').waitFor({state:'attached'});
    await fields.locator('[name=eventType]').selectOption('stim');
    await fields.locator('[data-ea-unit-choice]').selectOption('probe');
    const svg=fields.locator('.probe-position-map'),dot=id=>svg.locator('[data-probe-unit="'+id+'"]');
    const center=async id=>{const box=await dot(id).boundingBox();return{x:box.x+box.width/2,y:box.y+box.height/2};};
    const count=async n=>page.waitForFunction(n=>(document.querySelector('.probe-pick-count')?.textContent||'')===(n?'Selected · '+n+' Units':''),n);
    const drag=async(points,append=false)=>{
      if(append)await page.keyboard.down('Control');
      await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();
      for(const p of points.slice(1))await page.mouse.move(p.x,p.y,{steps:3});
      await page.mouse.up();if(append)await page.keyboard.up('Control');
    };
    const box=async(id,append)=>{const p=await center(id);await drag([{x:p.x-8,y:p.y-8},{x:p.x+8,y:p.y+8}],append);};
    await dot(1).waitFor();await svg.scrollIntoViewIfNeeded();
    await checkPickerSize(page,fields);
    await svg.scrollIntoViewIfNeeded();
    const p1=await center(1);await page.mouse.move(p1.x+5,p1.y);
    assert.match(await page.locator('.probe-map-tip').innerText(),/Unit 1/);
    const emptyMap=await svg.boundingBox();
    await page.mouse.click(p1.x+5,p1.y);await count(1);
    assert.deepEqual(await svg.boundingBox(),emptyMap,'selecting the first Unit keeps the map stationary');
    await box(2,true);await count(2);
    const r=await svg.boundingBox();await drag([{x:r.x+12,y:r.y+20},{x:r.x+25,y:r.y+50}]);await count(2);
    await page.locator('[data-probe-shape=lasso]').click();const p3=await center(3);
    assert.deepEqual(await svg.locator('[data-brush-outline]').evaluate(el=>[getComputedStyle(el).fillOpacity,getComputedStyle(el).strokeDasharray]),['0','none']);
    const outline=svg.locator('[data-brush-outline]');
    await page.mouse.move(p3.x-10,p3.y-10);await page.mouse.down();
    for(const [dx,dy] of [[12,-10],[12,12],[-10,12]])await page.mouse.move(p3.x+dx,p3.y+dy,{steps:3});
    assert(await outline.evaluate(el=>el.tagName==='polyline' && el.getTotalLength()<74 && el.getTotalLength()>60),
      'the mouse traced three open sides; the preview must not draw the fourth');
    await page.mouse.up();await count(1);
    assert.equal(await outline.getAttribute('visibility'),'hidden','no closing stroke flashes after release');
    assert.equal(await dot(3).getAttribute('aria-pressed'),'true');
    const p4=await center(4);await page.mouse.click(p4.x,p4.y);
    const overlap=page.locator('.probe-overlaps');await overlap.getByRole('button',{name:'Unit 5'}).click();await count(2);
    await page.mouse.move(p3.x,p3.y);await page.mouse.wheel(0,-160);
    await page.waitForFunction(()=>Number(document.querySelector('[data-probe-zoom]').value)>100);
    await page.locator('[data-probe-zoom]').fill('100');await page.locator('[data-probe-zoom]').press('Tab');
    await page.locator('[data-probe-shape=zoom]').click();
    const map=await svg.boundingBox(),mid={x:map.x+map.width/2,y:map.y+map.height/2};
    await drag([{x:mid.x-48,y:mid.y-35},{x:mid.x+48,y:mid.y+35}]);
    assert(Number(await fields.locator('[data-probe-zoom]').inputValue())>200);
    for(const shape of ['box','lasso']){
      await page.locator('[data-probe-shape='+shape+']').click();
      const x=parseFloat(await dot(3).getAttribute('cx'));
      await page.keyboard.down('Shift');await page.mouse.move(mid.x,mid.y);await page.mouse.down();
      await page.mouse.move(mid.x+12,mid.y+7,{steps:3});
      assert.equal(await outline.getAttribute('visibility'),'hidden');
      await page.mouse.up();await page.keyboard.up('Shift');
      assert(parseFloat(await dot(3).getAttribute('cx'))>x,shape+' Shift-drag pans');
      assert.equal(await dot(3).getAttribute('aria-pressed'),'true');
      assert.equal(await dot(5).getAttribute('aria-pressed'),'true');
      await count(2);
    }
    await page.locator('[data-probe-shape=pan]').click();
    const originalX=parseFloat(await dot(3).getAttribute('cx'));
    await drag([mid,{x:mid.x+24,y:mid.y+12}]);
    assert(parseFloat(await dot(3).getAttribute('cx'))>originalX);
    await svg.click({position:{x:10,y:20}});await count(2);
    await page.locator('[data-probe-zoom]').fill('100');
    await page.locator('[data-probe-shape=box]').click();
    const before=await svg.boundingBox();await page.locator('[data-probe-wide]').click();
    const expanded=await svg.boundingBox();assert(expanded.width>before.width+80 || expanded.height>before.height+80);
    await fields.locator('[data-ea-commit-units]').click();
    const chosen=await fields.locator('[name=unitIds]').inputValue();
    assert.equal(chosen.split(',').length,2);
    await page.locator('#recording-strip [data-recording-key=probeB]').click();
    assert(!await fields.isVisible());
    await page.locator('#recording-strip [data-analysis-tab]').click();
    assert.equal(await fields.locator('[name=unitIds]').inputValue(),chosen);
    await svg.click({position:{x:10,y:34}});await count(0);
    await fields.locator('[data-ea-probe-source]').selectOption('probeB');
    await dot(3).waitFor();await dot(3).click();
    await fields.locator('[data-ea-commit-units]').click();
    const saved=fields.locator('[data-ea-saved-units]');
    await saved.locator('[data-probe=probeB][data-remove-unit="3"]').waitFor();
    assert.equal(await saved.locator('[data-remove-unit]').count(),3);
    await saved.locator('[data-probe=probeA][data-remove-unit="5"]').click();
    assert.equal(await saved.locator('[data-remove-unit]').count(),2);
    const ids=(await fields.locator('[name=unitIds]').inputValue()).split(',').map(Number);
    assert.equal(new Set(ids).size,2,'Equal source Unit IDs have distinct analysis IDs');
    await fields.locator('[data-ea-run]').click();await fields.locator('[data-ea-results] canvas').first().waitFor();
    await checkSavedSelection(page,fields);
    await fields.locator('[data-ea-inputs]>summary').click();
    assert.equal(await fields.locator('[name=eventType] option[value="stim-b"]').count(),1);
    await saved.locator('[data-probe=probeB][data-remove-unit="3"]').click();
    await page.waitForFunction(()=>document.querySelector('[name=unitIds]').value==='3');
    assert.equal(await fields.locator('[name=eventType] option[value="stim-b"]').count(),0);
    await fields.locator('[data-ea-run]').click();
    await fields.locator('[name=resultUnit] option[value="3"]').waitFor({state:'attached'});
    await fields.locator('[data-ea-unit="3"]').click();
    await fields.locator('[data-ea-trial]').first().click();
    await page.locator('#recording-strip [data-analysis-signal][data-recording-key=probeA]').waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS Chrome: Probe and spike picker edge/corner resizing, solid unfilled lasso, box, additive selection, probe zoom and pan, spike navigation, cross-probe selection and restoration.');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
