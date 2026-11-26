// SPDX-License-Identifier: MIT
'use strict';
const {setExplorerPreference}=require('./workspace-preferences.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const {npy} = require('../scripts/browser-nwb-worker.js');

const root = path.resolve(__dirname, '..');
const entry = path.resolve(process.argv[2] || path.join(root, 'index.html'));
const out = path.resolve(process.env.IMPORT_QA_OUTPUT || path.join(root, 'runtime/regional-import'));
fs.mkdirSync(out, {recursive:true});
const dataRoot = process.env.ALLEN_DATA_ROOT;
const recipient = fs.mkdtempSync(path.join(out,'received-'));
const html = path.join(recipient,'renamed explorer.html');
const entryUrl = pathToFileURL(html).href;
const external = new Set();

async function drop(page, target, files, checkHover) {
  await target.scrollIntoViewIfNeeded();
  // Deliver OS paths (including real directory entries) through Chrome's native drag pipeline.
  const point = await target.evaluate(el => {
    const r = el.getBoundingClientRect();
    const left = Math.max(0,r.left), right = Math.min(innerWidth,r.right);
    const top = Math.max(0,r.top), bottom = Math.min(innerHeight,r.bottom);
    for (const y of [.45,.2,.7,.1,.9]) for (const x of [.55,.2,.8]) {
      const px = left+(right-left)*x, py = top+(bottom-top)*y;
      const hit = document.elementFromPoint(px,py);
      if (hit?.closest('[data-import-drop]') === el) return {x:px,y:py};
    }
    throw Error('No reachable drop surface: '+el.outerHTML.slice(0,150));
  });
  await nativeDrop(page,point,files,checkHover);
}
async function nativeDrop(page,point,files,checkHover) {
  const channel = await page.context().newCDPSession(page);
  try {
    const data = {items:[],files:files.map(f=>path.resolve(f)),dragOperationsMask:1};
    for (const type of ['dragEnter','dragOver']) await channel.send('Input.dispatchDragEvent',{type,...point,data});
    if (checkHover) await checkHover(channel,data);
    await channel.send('Input.dispatchDragEvent',{type:'drop',...point,data});
  } finally { await channel.detach(); }
}

async function pick(page, target, files) {
  const chooser = page.waitForEvent('filechooser');
  await target.click();
  await (await chooser).setFiles(files);
}

async function openOfflineExplorer(browser, viewport={width:1460,height:940}) {
  const page = await browser.newPage({offline:true,viewport});
  page.context().on('request',request=>{
    const url=request.url();
    if(url!==entryUrl && !/^(blob:|data:)/.test(url))external.add(url);
  });
  // Inspect this tab's real working project. Import no longer writes data to IndexedDB.
  await page.addInitScript(()=>Object.defineProperty(window,'NeuropixelsBrowserProjectUI',{
    configurable:true,
    set(UI){Object.defineProperty(window,'NeuropixelsBrowserProjectUI',{value:class extends UI {
      constructor(options){super(options);window.testWorkspace=this;}
    }});}
  }));
  await page.goto(entryUrl);
  await page.waitForFunction(()=>window.testWorkspace?.browserLocal);
  assert.equal(await page.evaluate(()=>navigator.onLine),false);
  return page;
}
const projects = page => page.evaluate(() => testWorkspace.active ? [testWorkspace.active] : []);
const wizard = page => page.locator('[data-project-import]');
const area = (page,role) => page.locator('[data-import-drop="'+role+'"]:visible').first();
const annotationEntry = page => page.locator('#create-annotation[data-import-drop=annotation]');
async function openOrganizer(page) {
  await page.locator('#open-folder-button').click();
  await page.locator('#open-menu [data-project-action=new]').click();
}
async function ready(page) {
  await page.locator('#project-dialog').waitFor({state:'hidden'});
  await page.locator('#recording-strip [data-recording-key]').first().waitFor();
}
async function verifyNwbEventSupplement(browser,nwb) {
  // Supply a sorted NWB with one probe and zero experimental events.
  const slot=p=>p.locator('[data-label-source=experiment]');
  const data=p=>p.evaluate(async()=>JSON.parse(await testWorkspace.state.activeRecording.eventsFile.text()));
  const first=await openOfflineExplorer(browser);
  await drop(first,first.locator('.activity-workspace'),[nwb]);
  await ready(first);
  await first.waitForFunction(()=>testWorkspace.state.activeRecording?.spikeCount>0 && !document.querySelector('[data-label-file]').hidden);
  assert(await slot(first).evaluate(e=>e.classList.contains('file-drop-slot')));
  const empty=await data(first);
  assert.deepEqual(empty.events,[]);
  const labels={schema:empty.schema,timebase:empty.timebase,recordingId:empty.recordingId,source:{kind:'lab log'},
    events:[{id:'cue-1',sourceId:'1',sourceKind:'experiment',type:'cue',kind:'point',start:.25}]};
  const eventPath=path.join(out,'lab-events.json');
  fs.writeFileSync(eventPath,JSON.stringify(labels));
  async function checkFilled(p){
    await p.waitForFunction(()=>[...document.querySelector('[data-label-type]').options].some(o=>o.value==='cue') && !document.querySelector('#project-dialog').open);
    const stored=await data(p);
    assert.deepEqual(stored.events,labels.events);
    assert.equal(stored.source.kind,'lab log');
    assert.equal(stored.source.recordingSource.kind,empty.source.kind);
    assert.deepEqual(stored.source.invalidTimes,empty.source.invalidTimes);
    assert.equal(await p.evaluate(()=>testWorkspace.state.recordings.length),1);
    return stored;
  }
  await drop(first,slot(first),[eventPath]);await slot(first).click();
  const merged=await checkFilled(first);
  const occupied=path.join(out,'other-events.json');
  fs.writeFileSync(occupied,JSON.stringify({...labels,events:[{...labels.events[0],type:'other'}]}));
  await drop(first,slot(first),[occupied]);
  await first.waitForFunction(()=>document.querySelector('#toast').textContent.includes('already has an event list'));
  assert.deepEqual(await data(first),merged);await first.close();
  for(const order of ['events first','together']){
    const page=await openOfflineExplorer(browser);
    if(order==='events first'){
      await drop(page,slot(page),[eventPath]);await ready(page);
    }
    await drop(page,page.locator('.activity-workspace'),order==='together'?[nwb,eventPath]:[nwb]);
    await page.waitForFunction(()=>testWorkspace.state.activeRecording?.spikeCount>0 && !document.querySelector('#project-dialog').open);
    await slot(page).click();
    assert.deepEqual(await checkFilled(page),merged);
    await page.close();
  }
  console.log('PASS: NWB and external events in either order or together, recording validity retained and nonempty labels protected.');
}
async function verifyImportWalkthrough(browser,folder) {
  const page=await openOfflineExplorer(browser);
  const tour=page.locator('#import-walkthrough'), next=page.locator('#tour-next');
  await tour.waitFor();
  const active=page.locator('.import-tour-target');
  assert(await active.isVisible());
  await page.screenshot({path:path.join(out,'first-import-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  await next.click();
  assert.equal(await active.getAttribute('id'),'mini-probe');
  await next.click();
  assert.equal(await active.getAttribute('data-label-source'),'experiment');
  const controls=await next.boundingBox();
  assert(controls && controls.y>=0 && controls.y+controls.height<=844,'Tour controls stay visible when the highlighted input scrolls into view');
  await page.screenshot({path:path.join(out,'first-import-narrow.png')});
  assert.equal(await page.locator('#tour-count').innerText(),'3 / 4');
  await page.locator('#tour-back').click();
  assert.equal(await page.locator('#tour-count').innerText(),'2 / 4');
  await page.locator('#tour-skip').click();
  await page.reload();
  assert(!(await tour.isVisible()));
  await page.locator('#settings-button').click();
  await page.locator('#tour-replay').click();
  await tour.waitFor();
  for(let i=0;i<4;i++) await next.click();
  assert(!(await tour.isVisible()));
  assert.equal(await active.count(),0);
  await page.close();
  const importing=await openOfflineExplorer(browser);
  await importing.locator('#import-walkthrough').waitFor();
  await drop(importing,importing.locator('.activity-workspace'),[folder]);
  await ready(importing);
  await importing.locator('#import-walkthrough').waitFor({state:'hidden'});
  await importing.locator('#data-details-button').click();
  assert.equal(await importing.locator('.recording-id-value').innerText(),path.basename(folder));
  await importing.close();
}

async function run() {
  fs.copyFileSync(entry,html);
  const fixtures = path.join(out,'groups');
  for (const [dir,id] of [['first',11],['second',42]]) {
    const dirPath=path.join(fixtures,dir); fs.mkdirSync(dirPath,{recursive:true});
    const write=(name,contents)=>fs.writeFileSync(path.join(dirPath,name),contents);
    write('spike_times.npy',Buffer.from(npy(new Float64Array([0,100,200,1000]),'<f8')));
    write('spike_clusters.npy',Buffer.from(npy(new Int32Array(4).fill(id),'<i4')));
    write('params.py','sample_rate = 1000\n');
    write('README.txt','Kilosort run notes');
  }
  fs.writeFileSync(path.join(fixtures,'README.txt'),'Notes for both recordings');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const damaged=await openOfflineExplorer(browser);
    try {
      const error=await damaged.evaluate(async()=>{
        const payload=document.getElementById('nwb-worker-gzip').content;
        payload.textContent=payload.textContent.slice(0,-4)+'AAAA';
        try { await testWorkspace.readNwb(new File([],'empty.nwb')); }
        catch(e) { return e.message; }
      });
      assert.equal(error,await damaged.evaluate(()=>NeuropixelsI18n.translate(document.documentElement.lang,'drop.nwbIntegrity')));
      assert.equal(await damaged.evaluate(()=>Boolean(testWorkspace.nwbWorkerBlob)),false);
    } finally { await damaged.close(); }
    if(process.env.NWB_EMPTY_EVENT_FIXTURE)await verifyNwbEventSupplement(browser,path.resolve(process.env.NWB_EMPTY_EVENT_FIXTURE));
    await verifyImportWalkthrough(browser,path.join(fixtures,'first'));
    await neuralFileSlots(browser,path.join(fixtures,'first'));
    const page=await openOfflineExplorer(browser);
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    page.setDefaultTimeout(30000);
    await setExplorerPreference(page,'#language-select','zh-CN');
    const presentation=page.locator('[data-workspace-layout][aria-pressed=true]');
    assert.equal(await presentation.getAttribute('data-workspace-layout'),'side');
    await page.locator('[data-workspace-layout=stacked]').click();
    await page.reload();
    assert.equal(await presentation.getAttribute('data-workspace-layout'),'stacked');
    await page.locator('[data-workspace-layout=side]').click();
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('.experiment-body').classList.contains('video-above'));
    assert(!(await page.locator('.workspace-layout-choice').isVisible()));
    await page.setViewportSize({width:1460,height:940});
    await page.waitForFunction(()=>!document.querySelector('.experiment-body').classList.contains('video-above'));
    const video=path.join(out,'side-a.webm'), secondVideo=path.join(out,'side-b.webm');
    // Fixed five-color VP8 clip. Headless MediaRecorder can emit only the WebM header.
    fs.copyFileSync(path.join(__dirname,'fixtures','five-colors.webm'),video);
    fs.copyFileSync(video,secondVideo);
    // A real OS drag over the header still identifies the video destination.
    const player=await openOfflineExplorer(browser);
    await setExplorerPreference(player,'#language-select','zh-CN');
    await setExplorerPreference(player,'#theme-select','dark');
    assert.equal(await player.locator('.app-title h1').innerText(),'Neuropixels Explorer');
    assert.equal(await player.locator('.app-title :is(img,svg), .file-drop-slot .workspace-illustration').count(),0);
    for(const theme of ['light','dark']){
      await setExplorerPreference(player,'#theme-select',theme);
      const borders=await player.locator('#video-empty p, #workspace-empty-intro .file-drop-slot, #mini-probe .file-drop-slot, #video-clock-row').evaluateAll(
        els=>els.map(el=>getComputedStyle(el).borderTop));
      assert.equal(borders.length,4);
      assert.match(borders[0],/^1px solid /);
      assert.equal(new Set(borders).size,1);
    }
    const rejectFile = (tab, name) => tab.waitForFunction(name => {
      const toast = document.querySelector('#toast');
      return toast.dataset.severity === 'error' && toast.textContent.includes(name);
    }, name);
    await drop(player,player.locator('.activity-workspace'),[path.join(fixtures,'first'),video],async()=>{
      assert(await player.locator('.activity-workspace.file-drop-invalid').isVisible());
      assert(await player.locator('#video-empty.file-drop-active:not(.file-drop-invalid)').isVisible());
      assert.match(await player.locator('#file-drop-hint').innerText(),/Kilosort.*视频/);
      await player.screenshot({path:path.join(out,'wrong-area-hover.png')});
    });
    await rejectFile(player,'side-a.webm');
    assert.deepEqual(await projects(player),[]);
    assert.equal(await player.locator('#behavior-video').evaluate(v=>v.currentSrc),'');
    await drop(player,player.locator('.project-main-actions [data-project-action=video]'),[path.join(fixtures,'first','spike_times.npy')]);
    await rejectFile(player,'spike_times.npy');
    assert.deepEqual(await projects(player),[]);
    await nativeDrop(player,{x:8,y:7},[video],async()=>{
      assert.deepEqual(await player.locator('.file-drop-active').evaluateAll(els=>els.map(el=>el.id)),['video-empty']);
      assert.match(await player.locator('#file-drop-hint').innerText(),/MP4/);
    });
    await player.waitForFunction(()=>document.querySelector('#behavior-video').readyState>=2);
    assert.equal(await player.locator('#video-link-note').getAttribute('data-severity'),'warning');
    assert.equal(await player.locator('dialog[open]').count(),0);
    const unknown=path.join(out,'unrecognized-input.json');
    fs.writeFileSync(unknown,'{"notes":"unrelated JSON"}');
    await nativeDrop(player,{x:8,y:7},[unknown],async(channel,data)=>{
      assert.equal(await player.locator('.file-drop-active').count(),0);
      assert.match(await player.locator('#file-drop-hint').innerText(),/自动识别/);
      for(const [selector,kind] of [['.activity-workspace','neural'],['#behavior-video','video'],['#create-annotation','annotation']]){
        const at=await player.locator(selector).boundingBox();assert(at && at.width>0 && at.height>0);
        await channel.send('Input.dispatchDragEvent',{type:'dragOver',x:at.x+at.width/2,y:at.y+at.height/2,data});
        assert.deepEqual(await player.locator('.file-drop-active').evaluateAll(els=>els.map(el=>el.dataset.importDrop)),[kind]);
      }
    });
    await player.waitForFunction(()=>document.querySelector('#toast').textContent.includes('unrecognized-input.json'));
    assert.equal(await player.locator('dialog[open]').count(),0);
    await player.waitForFunction(()=>testWorkspace.annotations.doc);
    assert.equal(await player.evaluate(()=>testWorkspace.state.activeRecording),null);
    const annotationKey=await player.evaluate(()=>testWorkspace.annotations.key);
    const createAnnotation=annotationEntry(player);
    assert.equal(await player.locator('#behavior-labels [data-import-drop=annotation]:visible').count(),1);
    assert.equal(await player.locator('[data-label-source=annotation]').isVisible(),false);
    assert.equal(await player.locator('[data-project-action=import-annotation]').count(),0);
    await createAnnotation.click();
    assert.equal(await player.locator('.annotation-name-form').count(),0);
    await player.locator('[data-label-new]').click();
    await player.locator('[data-label-name]').fill('discarded');
    await player.locator('[data-label-kind]').selectOption('point');
    await player.keyboard.press('Escape');
    assert.deepEqual(await player.evaluate(()=>Object.keys(testWorkspace.annotations.doc.labelColors||{})),[]);
    await createAnnotation.press('Enter');
    assert.equal(await player.locator('.annotation-name-form').count(),0);
    await player.locator('[data-label-new]').click();
    await player.locator('[data-label-name]').fill('reaching');
    assert.equal(await player.locator('[data-label-kind]').inputValue(),'interval');
    await player.locator('[data-label-color]').fill('#526ca0');
    await player.locator('dialog[open] form button[type=submit]').click();
    assert.equal(await player.locator('[data-label-color]').inputValue(),'#526ca0');

    await player.locator('[data-label-use]').click();
    await player.waitForFunction(()=>testWorkspace.video.playing && testWorkspace.video.currentVideoTime>.035);
    await player.locator('#annotation-mark').click();
    await player.waitForFunction(()=>testWorkspace.annotations.doc.segments.length===1 && !testWorkspace.video.playing);
    await player.locator('#annotation-mark').focus();await player.keyboard.press('Control+z');
    await player.waitForFunction(()=>!testWorkspace.annotations.doc.segments.length);
    await player.keyboard.press('Control+Shift+z');
    await player.waitForFunction(()=>testWorkspace.annotations.doc.segments.length===1);
    const savedAnnotations=path.join(out,'annotations.project.json');
    fs.writeFileSync(savedAnnotations,await player.evaluate(()=>JSON.stringify(testWorkspace.annotations.doc)));
    await player.keyboard.press('Control+z');
    await player.keyboard.press('Control+z');
    await player.waitForFunction(()=>!Object.keys(testWorkspace.annotations.doc.labelColors||{}).length);
    await drop(player,createAnnotation,[savedAnnotations],async()=>{
      assert(await createAnnotation.evaluate(el=>el.classList.contains('file-drop-active')));
    });
    await player.waitForFunction(()=>testWorkspace.annotations.doc.segments.length===1);
    assert.equal(await player.locator('dialog[open]').count(),0,'dropping JSON should import without opening the new-label dialog');
    assert.equal(await player.locator('[data-label-type] option[value=reaching]').count(),1);
    const existingClip=await player.evaluate(()=>testWorkspace.annotations.doc.segments[0]);
    await player.locator('#annotation-mark').focus();await player.keyboard.press('Control+z');
    await player.waitForFunction(()=>testWorkspace.annotations.doc.segments.length===0);
    await player.keyboard.press('Control+Shift+z');
    await player.waitForFunction(()=>testWorkspace.annotations.doc.segments.length===1);
    await createAnnotation.click();
    assert.equal(await player.locator('.annotation-name-form').count(),0);
    await player.locator('[data-label-new]').click();
    assert.equal(await player.locator('[data-label-name]').inputValue(),'');
    await player.locator('[data-label-name]').fill('second behavior');
    await player.locator('dialog[open] form button[type=submit]').click();

    await player.locator('[data-label-use]').click();
    await player.keyboard.press('Escape');
    assert.deepEqual(await player.evaluate(()=>testWorkspace.annotations.doc.segments),[existingClip]);
    assert.equal(await player.locator('[data-label-type] option[value=reaching]').count(),1);
    assert.equal(await player.locator('[data-label-type] option[value="second behavior"]').count(),1);
    const stagedLabels=path.join(out,'candidate-first.json');
    const videoDuration=await player.locator('#behavior-video').evaluate(v=>v.duration);
    fs.writeFileSync(stagedLabels,JSON.stringify({schema:'neuropixels-behavior-candidates/1',timebase:'video_seconds',
      video:{name:path.basename(video),size:fs.statSync(video).size,duration:videoDuration},
      run:{id:'early',method:'fixture'},segments:[{start:0,end:.03,group_id:'movement'}]}));
    await drop(player,createAnnotation,[stagedLabels]);
    await player.waitForFunction(()=>testWorkspace.annotations.doc.segments.some(s=>s.runId==='early'));
    assert.deepEqual(await player.evaluate(()=>testWorkspace.annotations.doc.segments.filter(s=>s.runId!=='early')),[existingClip]);
    assert.equal(await player.locator('dialog[open]').count(),0);
    await player.locator('#annotation-mark').focus();await player.keyboard.press('Control+z');
    await player.waitForFunction(()=>testWorkspace.annotations.doc.segments.length===1);
    const activeNeural=player.locator('.activity-workspace');
    const videoOnly=(await projects(player))[0];
    await drop(player,createAnnotation,[path.join(fixtures,'first','spike_times.npy')]);
    await rejectFile(player,'spike_times.npy');
    assert.deepEqual(await player.evaluate(()=>testWorkspace.annotations.doc.segments),[existingClip]);
    assert.equal(await player.locator('dialog[open]').count(),0);
    assert.deepEqual((await projects(player))[0],videoOnly);
    await drop(player,activeNeural,[path.join(fixtures,'first'),unknown]);
    await rejectFile(player,'unrecognized-input.json');
    assert.deepEqual((await projects(player))[0],videoOnly);
    await drop(player,activeNeural,[path.join(fixtures,'first')],async()=>{
      assert.deepEqual(await player.locator('.file-drop-active').evaluateAll(els=>els.map(el=>el.dataset.importDrop)),['neural']);
      assert.equal(await player.locator('.file-drop-received').count(),0);
      assert.match(await player.locator('#file-drop-hint').innerText(),/Kilosort/);
      assert.equal(await activeNeural.evaluate(el=>getComputedStyle(el,'::after').borderTopWidth),'3px');
      await player.screenshot({path:path.join(out,'neural-folder-hover.png')});
    });
    await player.waitForFunction(()=>testWorkspace.state.activeRecording && testWorkspace.annotations.doc?.segments.length===1);
    assert.equal(await player.evaluate(()=>testWorkspace.annotations.key),annotationKey);
    const recordingEvents=path.join(out,'recorded-behavior.json');
    const recordingKey=await player.evaluate(()=>testWorkspace.state.activeRecording.key);
    const exampleButton=player.locator('[data-event-example]');
    const viewport=player.viewportSize();
    await player.setViewportSize({width:390,height:844});
    for(const [language,label] of [['en','Download example JSON'],['es','Descargar JSON de ejemplo'],['zh-CN','下载示例 JSON']]){
      await setExplorerPreference(player,'#language-select',language);
      assert.equal(await exampleButton.innerText(),label);
      const bounds=await exampleButton.boundingBox();
      assert(bounds && bounds.x>=0 && bounds.x+bounds.width<=390,'Event example button fits the mobile viewport');
    }
    await player.setViewportSize(viewport);
    const downloadReady=player.waitForEvent('download');
    await exampleButton.focus();
    await exampleButton.press('Enter');
    const example=await downloadReady;
    assert.equal(example.suggestedFilename(),'explorer-events.example.json');
    await example.saveAs(recordingEvents);
    const sample=JSON.parse(fs.readFileSync(recordingEvents,'utf8'));
    assert.equal(sample.recordingId,recordingKey);
    assert.equal(sample.timebase,'neural_seconds');
    const cues=sample.events.filter(event=>event.kind==='point');
    assert.equal(cues.length,2);
    assert.equal(cues[0].type,cues[1].type);
    assert.notEqual(cues[0].conditions.direction,cues[1].conditions.direction);
    assert(sample.events.some(event=>event.kind==='interval' && event.end>event.start));
    assert.equal(await player.evaluate(()=>!!testWorkspace.state.activeRecording.eventsFile),false);
    await drop(player,createAnnotation,[recordingEvents]);
    await rejectFile(player,'recorded-behavior.json');
    assert.match(await player.locator('#toast').innerText(),/视频标注.*录制事件.*录制自带标签/);
    assert.equal(await player.evaluate(()=>!!testWorkspace.state.activeRecording.eventsFile),false);
    await drop(player,player.locator('[data-label-source=experiment]'),[recordingEvents]);
    await player.waitForFunction(()=>testWorkspace.state.activeRecording?.eventsFile && testWorkspace.annotations.doc?.segments.length===1);
    await exampleButton.waitFor({state:'hidden'});
    assert.equal(await player.evaluate(()=>testWorkspace.state.activeRecording.key),recordingKey);
    assert.equal(await player.evaluate(()=>testWorkspace.annotations.key),annotationKey);
    await player.locator('#annotation-settings').click();
    await player.locator('[data-settings-select]').selectOption('reaching');
    await player.locator('[data-label-name]').fill('contact');
    await player.locator('[data-label-kind]').selectOption('point');
    await player.locator('[data-label-save]').click();
    assert.equal(await player.locator('[data-label-color]').inputValue(),'#526ca0');
    assert.equal(await player.locator('[data-label-kind]').inputValue(),'point');
    assert.equal(await player.evaluate(()=>testWorkspace.annotations.doc.labelKinds.contact),'point');
    assert.equal(await player.evaluate(()=>Object.hasOwn(testWorkspace.annotations.doc.labelKinds,'reaching')),false);
    assert.deepEqual(await player.evaluate(()=>testWorkspace.annotations.doc.segments),[existingClip]);
    await player.locator('[data-settings-select] option[value=contact]').dblclick();
    assert.equal(await player.locator('.annotation-label-dialog').isVisible(),false);
    await player.close();
    console.log('PASS one annotation entry for click/keyboard creation and native file drops, additive candidates, undo and label retention.');
    const labelsFirst=await openOfflineExplorer(browser,{width:390,height:844});
    await setExplorerPreference(labelsFirst,'#language-select','zh-CN');
    const eventSlot=labelsFirst.locator('[data-label-source=experiment]');
    const labelSlot=annotationEntry(labelsFirst);
    await labelSlot.click();
    await labelsFirst.waitForFunction(()=>document.querySelector('#toast').textContent.includes('视频'));
    assert.equal(await labelsFirst.locator('dialog[open]').count(),0);
    assert.deepEqual(await projects(labelsFirst),[]);
    assert.match(await labelSlot.innerText(),/JSON/);
    assert.match(await eventSlot.innerText(),/JSON/i);
    assert.match(await eventSlot.innerText(),/神经.*秒/);
    assert.equal(await labelsFirst.locator('[data-event-example]').isVisible(),false);
    await drop(labelsFirst,labelSlot,[stagedLabels]);
    const videoSlot=labelsFirst.locator('#video-empty[data-import-drop=video]');
    await labelsFirst.waitForFunction(()=>document.querySelector('#video-empty p').textContent.includes('side-a.webm'));
    await drop(labelsFirst,videoSlot,[secondVideo]);
    const replacement=labelsFirst.locator('#pending-annotation-note[data-import-drop=video]');
    await replacement.waitFor();
    assert.match(await replacement.innerText(),/side-a\.webm/);
    await drop(labelsFirst,replacement,[video]);
    await labelsFirst.waitForFunction(()=>testWorkspace.annotations.doc?.segments.length===1);
    assert(await labelSlot.isVisible());
    assert.equal(await labelsFirst.locator('dialog[open]').count(),0);
    const earlyEvents=path.join(out,'event-first.json');
    fs.writeFileSync(earlyEvents,JSON.stringify({schema:'neuropixels-events/1',timebase:'neural_seconds',recordingId:'first',
      events:[{id:'lick-1',type:'lick',kind:'point',start:.02,sourceKind:'experiment',sourceId:'1'}]}));
    await drop(labelsFirst,eventSlot,[earlyEvents]);
    await labelsFirst.waitForFunction(()=>testWorkspace.state.activeRecording?.key==='first');
    await eventSlot.click();
    await labelsFirst.waitForFunction(()=>document.querySelector('[data-label-type]').value==='lick');
    assert(!(await eventSlot.locator('[data-label-file]').isVisible()));
    const source=labelsFirst.locator('[data-label-source=annotation]');
    assert.equal(await source.getAttribute('data-import-drop'),null);
    await source.click();
    assert.equal(await source.getAttribute('aria-pressed'),'true');
    assert.equal(await labelsFirst.locator('dialog[open]').count(),0);
    await eventSlot.click();
    await drop(labelsFirst,labelsFirst.locator('.activity-workspace'),[path.join(fixtures,'first')]);
    await labelsFirst.waitForFunction(()=>testWorkspace.state.activeRecording?.spikeCount===4);
    assert.deepEqual((await projects(labelsFirst))[0].recordingIds,['first']);
    assert.equal(await labelsFirst.locator('[data-label-type]').inputValue(),'lick');
    assert.match(await labelsFirst.locator('#video-source-label').innerText(),/side-a.webm/);
    const cameraId=await labelsFirst.evaluate(()=>testWorkspace.activeVideo.id);
    const neuralPane=labelsFirst.locator('.activity-workspace');
    for(const accept of [false,true]){
      const prompt=labelsFirst.waitForEvent('dialog');
      const dropped=drop(labelsFirst,neuralPane,[path.join(fixtures,'second')]);
      const notice=await prompt;
      assert.match(notice.message(),/同一项目/);
      if(accept)await notice.accept();else await notice.dismiss();
      await dropped;
      if(accept)await labelsFirst.locator('[data-close-recording=second]').waitFor();
      const [project]=await projects(labelsFirst);
      assert.equal(project.recordingIds.length,accept?2:1);
      assert.equal(project.activeVideoId,cameraId);
    }
    const cameraTabs=labelsFirst.locator('#project-video-tabs [data-video-id]');
    await cameraTabs.first().click();
    await labelsFirst.waitForFunction(()=>testWorkspace.video.source?.name==='side-b.webm' && testWorkspace.annotations.doc?.context.videoName==='side-b.webm');
    assert.equal(await labelsFirst.evaluate(()=>testWorkspace.annotations.doc.segments.length),0);
    await cameraTabs.nth(1).click();
    await labelsFirst.waitForFunction(()=>testWorkspace.video.source?.name==='side-a.webm' && testWorkspace.annotations.doc?.segments.length===1);
    assert.equal(await cameraTabs.count(),2);
    await labelSlot.click();
    await labelsFirst.locator('[data-label-new]').click();
    await labelsFirst.locator('[data-label-name]').fill('reaching');
    await labelsFirst.locator('[data-label-save]').click();
    await labelsFirst.locator('[data-label-use]').click();
    if(await labelsFirst.locator('#annotation-mark').getAttribute('aria-pressed')==='true')
      await labelsFirst.keyboard.press('Escape');
    await source.click();
    const visibleLabels=labelsFirst.locator('[data-label-type]');
    await visibleLabels.selectOption('reaching');
    const segmentIds=await labelsFirst.evaluate(()=>testWorkspace.annotations.doc.segments.map(s=>s.id));
    for(const probe of ['first','second','first']){
      await labelsFirst.locator('.recording-button[data-recording-key='+probe+']').click();
      await labelsFirst.waitForFunction(probe=>testWorkspace.state.activeRecording.key===probe &&
        document.querySelector('[data-label-type]').value==='reaching' &&
        document.querySelector('[data-label-source=annotation]').getAttribute('aria-pressed')==='true',probe);
      assert.deepEqual(await labelsFirst.evaluate(()=>testWorkspace.annotations.doc.segments.map(s=>s.id)),segmentIds);
    }
    await labelsFirst.close();
    const mixed=await openOfflineExplorer(browser);
    await nativeDrop(mixed,{x:8,y:7},[fixtures,video]);
    await mixed.waitForFunction(()=>document.querySelector('#behavior-video').readyState>=2);
    const [paired]=await projects(mixed);
    assert.equal(paired.recordingIds.length,2);
    assert.equal(paired.videoLibrary.length,1);
    const originalProbe=await mixed.evaluate(()=>testWorkspace.state.activeRecording.key);
    const firstKey=paired.recordingIds[0];
    await mixed.locator('#data-status-button').click();
    await mixed.locator('#project-dialog details[data-project-inputs] summary').click();
    const amplitudeSlot=mixed.locator('#project-dialog .missing-file-row[data-import-files="amplitudes.npy"][data-import-recording-key="'+firstKey+'"]');
    await drop(mixed,amplitudeSlot,[path.join(fixtures,'second','params.py')]);
    await mixed.waitForFunction(()=>document.querySelector('#toast[data-severity=error]')?.textContent.includes('amplitudes.npy'));
    const amplitudes=path.join(out,'amplitudes.npy');
    fs.writeFileSync(amplitudes,Buffer.from(npy(new Float64Array([1,2,3,4]),'<f8')));
    await drop(mixed,amplitudeSlot,[amplitudes]);
    await mixed.waitForFunction(key=>testWorkspace.assets.some(a=>a.path===key+'/amplitudes.npy') && testWorkspace.state.recordings.find(r=>r.key===key)?.byName.has('amplitudes.npy'),firstKey);
    assert.equal(await mixed.evaluate(()=>testWorkspace.state.activeRecording.key),originalProbe);
    await mixed.close();
    console.log('PASS one mixed drop opened two recordings with one shared video.');
    await openOrganizer(page);
    const initial=wizard(page);
    await initial.locator('[name=mode][value=combined]').check();
    const cameras=path.join(out,'cameras');
    for(const name of ['camA','camB']){
      const directory=path.join(cameras,name);fs.mkdirSync(directory,{recursive:true});
      fs.copyFileSync(video,path.join(directory,'side.webm'));
    }
    await drop(page,initial.locator('[data-import-drop=video]'),[cameras]);
    await initial.locator('[data-import-remove=video]').nth(1).waitFor();
    const cameraRow=name=>initial.locator('[data-import-drop=video] li').filter({hasText:name+'/side.webm'});
    const clockFile=path.join(out,'second.clock.json');
    fs.writeFileSync(clockFile,JSON.stringify({schema:'allen-video-clock/1',session_id:'second',video:{sha256:'0'.repeat(64),fps:30,duration_s:1},
      timeMapping:{method:'manual_offset',offset_s:0,scale:1,verification_status:'verified',provenance:{frame_clock:'test'}}}));
    await drop(page,initial.locator('[data-import-drop=clock]'),[clockFile,unknown]);
    await initial.locator('[data-import-error]').waitFor();
    assert.match(await initial.locator('[data-import-error]').innerText(),/无法识别文件格式.*unrecognized-input/);
    assert.equal(await initial.locator('[data-import-remove=clock]').count(),0);
    await pick(page,initial.locator('[data-import-pick=clock]'),[clockFile]);
    await initial.locator('[data-clock-video]').selectOption('1');
    await drop(page,initial.locator('[data-import-drop=neural]'),[fixtures]);
    await initial.locator('[data-import-remove=neural]').nth(1).waitFor();
    assert.equal(await initial.locator('[data-import-drop=clock], [data-import-pick=clock]').count(),0);
    assert.match(await initial.locator('[data-wizard-media=clock]').innerText(),/同一事件/);
    await initial.locator('[data-import-remove=neural]').nth(1).click();
    assert.equal(await initial.locator('[data-import-remove=clock]').count(),1);
    assert.equal(await cameraRow('camB').count(),1);
    assert.equal(await cameraRow('camA').count(),1);
    await page.keyboard.press('Escape');
    await page.locator('#project-dialog').waitFor({state:'hidden'});
    assert.equal((await projects(page)).length,0);
    await openOrganizer(page);
    const form=wizard(page);
    await form.locator('[name=projectName]').fill('Two recordings');
    assert.equal(await form.locator('[data-import-drop=video]').isVisible(),false);
    await form.locator('[name=mode][value=combined]').check();
    const description=await form.innerText();
    for(const format of ['.nwb','.npy','MP4','JSON']) assert(description.toLowerCase().includes(format.toLowerCase()),format);
    await drop(page,form.locator('[data-import-drop=neural]'),[fixtures,video]);
    await form.locator('[data-import-error]').waitFor();
    assert.equal(await form.locator('[data-import-remove=neural]').count(),0);
    await drop(page,form.locator('[data-import-drop=neural]'),[fixtures]);
    await form.locator('[data-import-remove=neural]').nth(1).waitFor({timeout:8000}).catch(async err=>{
      throw Error(err.message+'\n'+await form.innerText()+'\n'+await page.locator('#toast').textContent());
    });
    await pick(page,form.locator('[data-import-pick=video]'),[video]);
    await page.screenshot({path:path.join(out,'combined-wizard.png')});
    await form.locator('[data-import-submit]').click();
    await ready(page);
    let [project]=await projects(page);
    assert.equal(project.name,'Two recordings');
    assert.equal(project.recordingIds.length,2);
    const targetKey=project.recordingIds.find(key=>key.endsWith('second'));
    assert.equal(project.videoLibrary.length,1);
    assert.equal(project.videoLibrary[0].video_name,'side-a.webm');
    const strip=page.locator('#recording-strip [data-recording-key]');
    await strip.filter({hasText:'second'}).click();
    await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
    const currentPosition=await page.locator('#behavior-video').evaluate(v=>v.currentTime);
    await strip.first().click();
    assert.equal(await page.locator('#behavior-video').evaluate(v=>v.currentTime),currentPosition);
    const refused=page.waitForEvent('dialog');
    const firstAttempt=drop(page,area(page,'video'),[secondVideo]);
    const notice=await refused;
    assert.match(notice.message(),/同一项目/);
    await notice.dismiss();await firstAttempt;
    assert.equal((await projects(page))[0].videoLibrary.length,1);
    const confirm=page.waitForEvent('dialog');
    const secondAttempt=drop(page,area(page,'video'),[secondVideo]);
    await (await confirm).accept();await secondAttempt;
    await page.locator('#project-video-tabs button').nth(1).waitFor();
    await page.waitForFunction(()=>document.querySelector('#video-source-label').textContent.includes('side-b.webm'));
    await page.locator('#project-video-tabs button').first().click();
    await page.waitForFunction(()=>document.querySelector('#video-source-label').textContent.includes('side-a.webm'));
    const pkg=path.join(out,'external.neuroproject');
    await page.evaluate(()=>{window.showSaveFilePicker=undefined;});
    page.once('dialog',dialog=>dialog.accept());
    const download=page.waitForEvent('download');
    await page.locator('#save-project-button').click();
    await page.locator('[data-confirm-export]').click();
    await (await download).saveAs(pkg);
    await page.reload();
    assert.equal((await projects(page)).length,0);
    await nativeDrop(page,{x:8,y:7},[pkg]);
    await ready(page);
    assert.deepEqual((await projects(page))[0].videoLibrary.map(v=>v.video_name),['side-a.webm','side-b.webm']);
    assert.equal(await page.locator('#project-video-tabs button[aria-pressed=true]').innerText(),'1 · side-a.webm');
    await strip.nth(1).waitFor();
    assert.equal(await strip.count(),2);
    assert.deepEqual(errors,[]);
    console.log('PASS two Kilosort recordings via native directory drop, conventional video picker, many-to-many project confirmation and cancellation and restored project.');
    if (dataRoot) await realAllen(browser);
    assert.deepEqual([...external],[], 'The standalone application requested a sibling file or a network resource');
    console.log('PASS renamed HTML in an otherwise empty folder, Chrome offline, zero external application requests.');
  } finally { await browser.close(); }
}

async function neuralFileSlots(browser,folder) {
  const page=await openOfflineExplorer(browser);
  try {
    await setExplorerPreference(page,'#language-select','zh-CN');
    const files=names=>names.map(name=>path.join(folder,name));
    await drop(page,page.locator('#workspace-empty-intro .file-drop-slot'),files(['spike_times.npy']));
    const missing=page.locator('#partial-signal-preview [data-import-files]');
    await missing.waitFor();
    assert.equal(await missing.getAttribute('data-import-files'),'spike_clusters.npy params.py');
    await drop(page,missing,files(['params.py']));
    await page.waitForFunction(()=>document.querySelector('#partial-signal-preview [data-import-files]')?.dataset.importFiles==='spike_clusters.npy');
    await drop(page,missing,files(['spike_clusters.npy']));
    const position=page.locator('#mini-probe > [data-import-files~="explorer-units.json"]');
    const coords=path.join(out,'explorer-units.json');
    fs.writeFileSync(coords,JSON.stringify({units:[{cluster_id:11,probe_depth_um:350}]}));
    await drop(page,position,[coords]);
    await page.locator('.probe-position-map [data-probe-unit="11"]').waitFor();
    await page.locator('[data-template-expand]').click();
    const template=page.locator('#probe-template-panel [data-import-files]');
    const shape=[[1,3,1],[4],[1,2]],values=[[0,2,-1],[0,0,0,0],[10,350]];
    const parts=['templates.npy','spike_templates.npy','channel_positions.npy'].map((name,i)=>{
      const p=path.join(out,name);fs.writeFileSync(p,Buffer.from(npy(new Float64Array(values[i]),'<f8',shape[i])));return p;
    });
    await drop(page,template,parts);
    await page.waitForFunction(()=>testWorkspace.state.activeRecording.byName.has('templates.npy'));
    await page.locator('.sw-unit[data-unit="11"] .sw-name').first().click();
    await page.locator('#probe-template-panel .template-waveform').waitFor();
    assert.equal((await projects(page))[0].recordingIds.length,1);
    console.log('PASS partial spike, rate, position and template files dropped on their own visible slots.');
  } finally { await page.close(); }
}

async function realAllen(browser) {
  const id='1064644573', source=path.join(dataRoot,'sources/v0.5.0',id);
  const nwb=path.join(source,'ecephys_session_'+id+'.nwb');
  const video=path.join(source,'behavior_videos/side.mp4');
  const clock=path.join(dataRoot,'derived',id,'side-full.clock.json');
  const wrong=path.join(out,'behavior-events.json');
  fs.writeFileSync(wrong,JSON.stringify({schema:'unrecognized/1'}));
  const page=await openOfflineExplorer(browser);
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);
  await setExplorerPreference(page,'#language-select','zh-CN');
  await nativeDrop(page,{x:8,y:7},[nwb,video]);
  const confirmProbes=page.locator('[data-confirm-probes]');
  await confirmProbes.waitFor();
  assert(await confirmProbes.isDisabled());
  const allProbes=page.locator('[data-all-probes]');
  await allProbes.click();
  assert.equal(await page.locator('[data-browser-probe][aria-pressed=false]:enabled').count(),0);
  await allProbes.click();
  assert(await confirmProbes.isDisabled());
  await page.locator('[data-browser-probe="probeB"]').click();
  await page.locator('[data-browser-probe="probeC"]').click();
  await confirmProbes.click();
  const key='allen-'+id+'-probeC';
  await ready(page);
  await page.waitForFunction(()=>document.querySelector('#behavior-video')?.duration>9500,undefined,{timeout:180000});
  const sources=await page.evaluate(()=>testWorkspace.state.recordings.map(r=>({
    probe:testWorkspace.active.recordingSources[r.key].probe, ids:r.units.map(u=>u.cluster_id)
  })));
  assert.deepEqual(sources.map(s=>s.probe).sort(),['probeB','probeC']);
  assert.equal(sources.find(s=>s.probe==='probeC').ids.length,349);
  const unitIds=sources.flatMap(s=>s.ids);
  assert.equal(new Set(unitIds).size,unitIds.length);
  // Reopening the NWB offers the remaining probes. Cancelling leaves the current data intact.
  await drop(page,area(page,'neural'),[nwb]);
  await confirmProbes.waitFor();
  assert(await page.locator('[data-browser-probe="probeB"]').isDisabled());
  assert(await page.locator('[data-browser-probe="probeC"]').isDisabled());
  await page.locator('[data-cancel-probes]').click();
  await ready(page);
  assert.equal((await projects(page))[0].recordingIds.length,2);
  await page.locator('#recording-strip [data-recording-key="'+key+'"]').click();
  const initial=(await projects(page))[0];
  assert.equal(initial.videoLibrary.length,1);
  assert.equal(initial.videoLibrary[0].video_name,'side.mp4');
  const clockLanding=page.locator('#video-clock-row[data-import-drop=clock]');
  assert.match(await clockLanding.innerText(),/side\.mp4.*帧时钟 JSON/s);
  assert.match(await clockLanding.innerText(),/拖到这里/);
  await drop(page,clockLanding,[wrong]);
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('behavior-events.json'));
  assert.deepEqual((await projects(page))[0].videoLibrary[0],initial.videoLibrary[0]);
  await page.locator('#video-alignment').click();
  const manual=page.locator('form[data-align]');
  await manual.locator('[name=video]').fill('0');await manual.locator('[name=neural]').fill('3');
  await manual.locator('button').click();
  await page.waitForFunction(()=>testWorkspace.activeVideo.timeMapping?.method==='manual_offset');
  await drop(page,clockLanding,[clock]);
  await page.waitForFunction(()=>document.querySelector('#video-link-note')?.textContent.includes('帧时间已验证'),undefined,{timeout:180000});
  assert.equal(await page.locator('#video-link-note').getAttribute('data-severity'),'success');
  assert.equal(await clockLanding.count(),0);
  const project=(await projects(page))[0], mapping=project.videoLibrary[0].timeMapping;
  assert.deepEqual(mapping,JSON.parse(fs.readFileSync(clock)).timeMapping);
  assert.equal(await page.locator('.project-main-actions [data-project-action=video]').innerText(),'添加视频');
  assert.equal(await page.locator('#replace-video').innerText(),'添加视频');
  assert.match(await page.locator('#replace-video').getAttribute('title'),/项目内的 Probe 可共用/);
  assert(await page.evaluate(()=>testWorkspace.assets.some(a=>a.role==='clock' && a.appliedTo===testWorkspace.activeVideo.id && a.name==='side-full.clock.json')));
  await page.evaluate(()=>testWorkspace.video.seekVideo(2));
  await page.locator('#behavior-video').click({button:'right'});
  await page.keyboard.press('Escape');
  await page.locator('#behavior-video').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>Math.abs(testWorkspace.video.currentVideoTime-(2+5/60))<.00001);
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(()=>Math.abs(testWorkspace.video.currentVideoTime-2)<.00001);
  await page.screenshot({path:path.join(out,'allen-linked.png')});
  const labels = annotationEntry(page);
  await labels.waitFor();
  const hasCandidate = async () => page.evaluate(() => {
    const docs = testWorkspace.documents;
    return Object.values(docs || {}).some(doc => doc.segments.some(seg => seg.runId === 'drop-check'));
  });
  assert.equal(await hasCandidate(),false);
  const candidate=path.join(out,'video-candidate.json');
  fs.writeFileSync(candidate,JSON.stringify({schema:'neuropixels-behavior-candidates/1',timebase:'video_seconds',
    video:{name:'side.mp4',size:fs.statSync(video).size,duration:await page.locator('#behavior-video').evaluate(v=>v.duration)},
    run:{id:'drop-check',method:'fixture',parameters:{}},segments:[{start:2,end:3,group_id:'demo'}]}));
  await drop(page,area(page,'neural'),[candidate]);
  await page.waitForFunction(()=>document.querySelector('#toast[data-severity=error]')?.textContent.includes('video-candidate.json'));
  assert.equal(await hasCandidate(),false);
  assert.deepEqual((await projects(page))[0].videoLibrary[0].timeMapping,mapping);
  await drop(page,labels,[candidate]);
  await page.waitForFunction(() => {
    const docs=testWorkspace.documents;
    return Object.values(docs||{}).some(doc=>doc.runs.some(run=>run.id==='drop-check'));
  });
  await page.locator('#annotation-toggle').click();
  await page.locator('#annotation-mark').focus();await page.keyboard.press('Control+z');
  await page.waitForFunction(() => {
    const docs=testWorkspace.documents;
    return Object.values(docs||{}).every(doc=>doc.runs.every(run=>run.id!=='drop-check'));
  });
  assert.equal(await hasCandidate(),false);
  assert.deepEqual((await projects(page))[0].videoLibrary[0].timeMapping,mapping);
  await page.locator('#annotation-toggle').click();
  // Adding another recording must keep the verified video/clock bound to the original.
  await page.locator('[data-template-expand]').click();
  const sortingFolder=page.locator('#probe-template-panel [data-import-folder="kilosort"]');
  await drop(page,area(page,'neural'),[path.join(out,'templates.npy')]);
  await page.waitForFunction(()=>document.querySelector('#toast[data-severity=error]')?.textContent.includes('templates.npy'));
  assert.equal(await page.evaluate(()=>testWorkspace.state.activeRecording.byName.has('templates.npy')),false);
  await drop(page,sortingFolder,[path.join(out,'groups','first')]);
  await page.locator('#recording-strip [data-recording-key]').nth(2).waitFor();
  await ready(page);
  const all = await projects(page);
  assert.equal(all.length,1);
  assert.equal(all[0].id,project.id);
  assert.equal(all[0].recordingIds.length,3);
  assert.deepEqual(all[0].videoLibrary,project.videoLibrary);
  assert.deepEqual(errors,[]);
  const summary = {session:id,recording:key,nwbBytes:fs.statSync(nwb).size,
    videoBytes:fs.statSync(video).size,addedRecordings:all[0].recordingIds,
    frameClockMethod:mapping.method,verified:project.videoLibrary[0].timeMapping.verification_status,
    originalBindingPreserved:true,pageErrors:errors};
  fs.writeFileSync(path.join(out,'allen-verified.json'),JSON.stringify(summary,null,2)+'\n');
  console.log('PASS full original Allen NWB, two independent probes, duplicate/cancel protection, >2 GB side video, verified frame clock and annotation import.',sources.map(s=>[s.probe,s.ids.length]));
}
run().finally(()=>{
  fs.rmSync(html,{force:true});
  fs.rmdirSync(recipient);
}).catch(error=>{console.error(error);process.exitCode=1;});
