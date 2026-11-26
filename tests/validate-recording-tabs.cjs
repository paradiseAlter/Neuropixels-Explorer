// SPDX-License-Identifier: MIT
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const {npy} = require('../scripts/browser-nwb-worker');
const {pack} = require('../scripts/browser-storage');
const annotations = require('../scripts/annotation-core');

(async()=>{
  const root=path.resolve(__dirname,'..'), html=process.argv[2]||path.join(root,'dist/Neuropixels-Explorer.html');
  const assets=[],documents={},ids=['probeA','probeB','probeC'];
  const add=(assetPath,bytes,meta={})=>assets.push({path:assetPath,name:path.basename(assetPath),blob:new Blob([bytes]),...meta});
  for(const key of ids){
    add(key+'/spike_times.npy',npy(new Int32Array([1,1000,8000]),'<i4'));
    add(key+'/spike_clusters.npy',npy(new Int32Array([17,17,17]),'<i4'));
    add(key+'/params.py','sample_rate = 1000');
  }
  const project={id:'fixture',name:'Three probes',mode:'combined',recordingIds:ids,videos:{},
    recordingSources:Object.fromEntries(ids.map(probe=>[probe,{session:'fixture',probe}]))};
  const video=process.env.RECORDING_TAB_VIDEO, bytes=video?await fs.readFile(video):Buffer.from('camera');
  add('camera',bytes,{role:'video',type:'video/mp4'});
  for(const key of ids)project.videos[key]={asset:'camera',video_name:'side.mp4',byte_size:bytes.length,annotationSourceId:'camera'};
  add('results B','opaque result',{role:'event-analysis',recordingId:'probeB'});
  add('unmatched.json','{}',{role:'annotation',recordingId:null});
  const docKey=JSON.stringify(['probeB','url','side.mp4',bytes.length,'camera']);
  documents[docKey]=annotations.addLabel(annotations.create({key:docKey,recordingKey:'probeB',videoName:'side.mp4',videoSize:bytes.length,duration:120}),'turn');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1400,height:900}});
    page.setDefaultTimeout(10000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(html).href);
    await page.evaluate(()=>{
      window.showSaveFilePicker=async()=>({createWritable:async()=>({
        write:async blob=>{window.tabExport=await NeuropixelsBrowserStorage.unpack(blob);},close:async()=>{}
      })});
    });
    const open=page.waitForEvent('filechooser');
    await page.locator('[data-project-action=open-project]:visible').first().click();
    await (await open).setFiles({name:'fixture.neuroproject',mimeType:'application/octet-stream',
      buffer:Buffer.from(await pack(project,assets,documents).arrayBuffer())});
    const active=()=>page.locator('#recording-strip .recording-button.active').getAttribute('data-recording-key');
    const close=async key=>{
      await page.locator(`[data-close-recording="${key}"]`).click();
      await page.locator(`[data-recording-key="${key}"]`).waitFor({state:'detached'});
    };
    const undo=async key=>{
      await page.locator('#open-folder-button').click();
      await page.locator('[data-project-action=undo-close-recording]').click();
      await page.locator(`[data-close-recording="${key}"]`).waitFor();
    };
    const exported=async()=>{
      await page.evaluate(()=>{window.tabExport=null;});
      await page.locator('#save-project-button').click();
      await page.locator('[data-confirm-export]').click();
      await page.waitForFunction(()=>window.tabExport);
      return page.evaluate(()=>({project:tabExport.project, paths:tabExport.assets.map(a=>a.path), docs:tabExport.annotations}));
    };
    await page.locator('[data-close-recording=probeC]').waitFor();
    assert.equal(await active(),'probeA');
    await page.setViewportSize({width:2560,height:1100});
    await page.waitForFunction(()=>{
      const header=document.querySelector('.experiment-orientation').getBoundingClientRect();
      const summary=document.querySelector('.dataset-summary').getBoundingClientRect();
      const strip=document.querySelector('#recording-strip');
      return Math.abs(header.top-summary.top)<1 && strip.clientWidth>430 &&
        [...strip.children].every(tab=>tab.getBoundingClientRect().right<=strip.getBoundingClientRect().right+1);
    });
    await page.setViewportSize({width:1400,height:900});
    const tabStyle=el=>{
      const tab=el.parentElement,close=el.nextElementSibling;
      const b=tab.getBoundingClientRect(),c=close.getBoundingClientRect();
      return {color:getComputedStyle(tab).backgroundColor,closeClass:close.className,inside:c.right<=b.right+.5 && c.left>=b.left};
    };
    const recordingStyle=await page.locator('#recording-strip [data-recording-key=probeA]').evaluate(tabStyle);
    const camera=page.locator('#project-video-tabs [data-video-id]');
    assert.deepEqual(await camera.evaluate(tabStyle),recordingStyle);
    assert(recordingStyle.inside && recordingStyle.color!=='rgba(0, 0, 0, 0)');
    for(const selector of ['#recording-strip','#project-video-tabs']){
      const strip=page.locator(selector);
      const measure=()=>strip.evaluate(el=>el.lastElementChild.getBoundingClientRect().width);
      const append=n=>strip.evaluate((el,n)=>{
        for(let i=0;i<n;i++){
          const tab=NeuropixelsWorkspaceTabs.create({label:'A long descriptive tab title for this session '+i,onClose:()=>tab.wrapper.remove()});
          tab.wrapper.dataset.overflowTest='';el.append(tab.wrapper);
        }
      },n);
      await append(1);const normal=await measure();
      await append(5);assert((await measure())<normal,'tabs shrink before scrolling');
      await append(24);
      await strip.evaluate(el=>el.scrollTo({left:0,behavior:'instant'}));
      await strip.hover();await page.mouse.wheel(0,160);
      await page.waitForFunction(s=>document.querySelector(s).scrollLeft>0,selector);
      assert(await strip.locator('[data-overflow-test] .recording-close').last().evaluate(el=>{
        NeuropixelsWorkspaceTabs.reveal(el);
        return el.getBoundingClientRect().right<=el.closest('nav, .recording-strip').getBoundingClientRect().right+1;
      }));
      await strip.locator('[data-overflow-test] .recording-close').last().click();
      assert.equal(await strip.locator('[data-overflow-test]').count(),29);
      await strip.evaluate(el=>el.querySelectorAll('[data-overflow-test]').forEach(tab=>tab.remove()));
    }
    await camera.press('Delete');
    await page.locator('#project-video-tabs [data-video-id]').waitFor({state:'detached'});
    const closedVideo=await exported();
    assert.equal(closedVideo.project.videoLibrary.length,0);
    assert(!closedVideo.paths.includes('camera') && !closedVideo.docs[docKey]);
    await page.locator('#open-folder-button').click();
    await page.locator('[data-project-action=undo-media]').click();
    await page.locator('#project-video-tabs [data-video-id]').waitFor();
    assert((await exported()).docs[docKey].labelColors.turn);
    if(video){
      await page.waitForFunction(()=>document.querySelector('#behavior-video').readyState>=2);
      await page.locator('.playback-options > summary').click();
      const speed=page.locator('#video-custom-speed');
      await speed.scrollIntoViewIfNeeded();
      const originalRate=Number(await speed.inputValue());
      const box=await speed.boundingBox(),y=box.y+box.height/2;
      const grip=await speed.evaluate(el=>el.getBoundingClientRect().right-parseFloat(getComputedStyle(el).paddingRight)-27);
      const drag=async(x,dx)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y);};
      await drag(box.x+3,12);await page.mouse.up();assert.equal(Number(await speed.inputValue()),originalRate);
      await drag(grip,10);assert.equal(Number(await speed.inputValue()),originalRate+.1);
      await page.keyboard.press('Escape');await page.mouse.up();assert.equal(Number(await speed.inputValue()),originalRate);
      await page.keyboard.down('Shift');await drag(grip,10);await page.mouse.up();await page.keyboard.up('Shift');
      assert.equal(Number(await speed.inputValue()),originalRate+.01);
      await page.locator('.playback-options > summary').click();
      await page.locator('[data-label-source=annotation]').click();
      await page.locator('[data-label-type]').selectOption('turn');
      for(const key of ['probeB','probeA']){
        await page.locator('.recording-button[data-recording-key='+key+']').click();
        await page.waitForFunction(()=>document.querySelector('[data-label-type]').value==='turn');
      }
      await page.locator('#behavior-video').evaluate(v=>{v.currentTime=4.5;});
      await page.waitForFunction(()=>!document.querySelector('#behavior-video').seeking);
    }
    await close('probeB');
    assert.equal(await active(),'probeA');
    if(video)assert.equal(await page.locator('#behavior-video').evaluate(v=>v.currentTime),4.5);
    let saved=await exported();
    assert.deepEqual(saved.project.recordingIds,['probeA','probeC']);
    assert(!saved.project.recordingSources.probeB && saved.project.videoLibrary.length===1 && saved.docs[docKey].labelColors.turn);
    assert(!saved.paths.some(p=>p.startsWith('probeB/')||p==='results B'));
    assert(saved.paths.includes('camera') && saved.paths.includes('unmatched.json'));
    await close('probeA');assert.equal(await active(),'probeC');
    await undo('probeA');assert.equal(await active(),'probeA');
    if(video)await page.waitForFunction(()=>document.querySelector('#behavior-video').currentTime===4.5);
    await undo('probeB');assert.equal(await active(),'probeA');
    saved=await exported();
    assert.deepEqual(saved.project.recordingIds,ids);
    assert.equal(saved.project.recordingSources.probeB.probe,'probeB');
    assert(saved.docs[docKey].labelColors.turn && saved.paths.includes('results B'));
    assert.equal(saved.paths.filter(p=>p==='camera').length,1);
    for(const key of ids)await close(key);
    saved=await exported();
    assert.deepEqual(saved.project.recordingIds,[]);
    assert.deepEqual(saved.paths,['camera','unmatched.json']);
    await undo('probeC');assert.equal(await active(),'probeC');
    // A fresh import of a removed key supersedes its undo entry. Older entries still work.
    await close('probeC');
    const fixtureDir=path.join(root,'runtime','recording-tab-check','probeC');
    await fs.mkdir(fixtureDir,{recursive:true});
    for(const asset of assets.filter(a=>a.path.startsWith('probeC/')))
      await fs.writeFile(path.join(fixtureDir,asset.name),Buffer.from(await asset.blob.arrayBuffer()));
    const native=await page.context().newCDPSession(page);
    for(const type of ['dragEnter','dragOver','drop'])await native.send('Input.dispatchDragEvent',{
      type,x:40,y:14,data:{items:[],files:[fixtureDir],dragOperationsMask:1}
    });
    await native.detach();
    await page.locator('[data-close-recording=probeC]').waitFor();
    await undo('probeB');
    assert.equal(await page.locator('#recording-strip [data-recording-key]').count(),2);
    // An entirely empty project remains exportable and restorable as a blank workspace.
    const blank=pack({id:'empty',name:'Clean',recordingIds:['probeA'],videos:{}},assets.filter(a=>a.path.startsWith('probeA/')),{});
    page.once('dialog',dialog=>dialog.accept());
    const newFile=page.waitForEvent('filechooser');
    await page.locator('[data-project-action=open-project]:visible').first().click();
    await (await newFile).setFiles({name:'one.neuroproject',mimeType:'application/octet-stream',buffer:Buffer.from(await blank.arrayBuffer())});
    await close('probeA');
    saved=await exported();assert.deepEqual(saved.paths,[]);assert.deepEqual(saved.project.recordingIds,[]);
    const copy=pack(saved.project,[],saved.docs);
    const reopen=page.waitForEvent('filechooser');
    await page.locator('[data-project-action=open-project]:visible').first().click();
    await (await reopen).setFiles({name:'empty.neuroproject',mimeType:'application/octet-stream',buffer:Buffer.from(await copy.arrayBuffer())});
    await page.waitForFunction(()=>!document.querySelector('dialog[open]') && !document.querySelector('[data-project-action=undo-close-recording]'));
    assert.equal(await page.locator('#recording-strip [data-recording-key]').count(),0);
    assert(await page.locator('#workspace-empty-intro').isVisible());
    assert.deepEqual(errors,[]);
    console.log('PASS tab removal, background focus, adjacent selection, undo, shared media, scoped labels/analyses and last-record export'+(video?', including real video position.':'.'));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
