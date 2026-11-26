// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict'), path=require('node:path');
const {chromium}=require('playwright');

async function run() {
  const entry=path.resolve(process.argv[2] || path.join(__dirname,'../index.html'));
  const media=path.resolve(process.argv[3] || path.join(__dirname,'fixtures/five-colors.webm'));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>Object.defineProperty(window,'NeuropixelsBrowserProjectUI',{configurable:true,set(UI){
      Object.defineProperty(window,'NeuropixelsBrowserProjectUI',{value:class extends UI {
        constructor(options){super(options);window.workspaceForTest=this;}
      }});
    }}));
    // Chromium exposes origin-private file handles to a localhost origin, including in headless runs.
    const url='http://localhost/annotation-editing/index.html';
    await page.route(url,route=>route.fulfill({path:entry,contentType:'text/html; charset=utf-8'}));await page.goto(url);
    const target=page.locator('#video-empty');await target.scrollIntoViewIfNeeded();
    const drop=await target.boundingBox(),cdp=await page.context().newCDPSession(page);
    for(const type of ['dragEnter','dragOver','drop'])await cdp.send('Input.dispatchDragEvent',{type,x:drop.x+drop.width*.5,y:drop.y+drop.height*.5,data:{items:[],files:[media],dragOperationsMask:1}});
    await cdp.detach();
    await page.waitForFunction(()=>window.workspaceForTest?.annotations?.doc);
    const entryButton=page.locator('#create-annotation');
    await page.waitForFunction(()=>document.querySelector('#behavior-labels').classList.contains('has-video'));
    assert.equal(await entryButton.locator('[data-entry-hint]').isVisible(),false);
    assert.equal(await entryButton.getAttribute('data-help-key'),'labels.clickOrDrop');
    const duration=await page.evaluate(()=>{
      const a=window.editorForTest=workspaceForTest.annotations,api=window.NeuropixelsAnnotations,d=a.doc.context.duration;
      let doc=a.doc;
      for(const [lo,hi,label] of [[.1,.2,'walk'],[.3,.4,'walk'],[.6,.75,'rest']])doc=api.add(doc,{start:lo*d,end:hi*d,label});
      a.commit(doc);return d;
    });
    const detail=page.locator('#video-event-detail'),strip=page.locator('#annotation-timeline');
    await detail.locator('summary').click();await strip.locator('[data-clip]').first().waitFor();
    assert.equal(await page.evaluate(()=>editorForTest.opened),false);
    const check=fn=>page.waitForFunction(fn), read=fn=>page.evaluate(fn);
    const drag=async (x1,x2,y=.65,cancel=false,modifier)=>{
      await strip.scrollIntoViewIfNeeded();
      const b=await strip.locator('svg').boundingBox();
      if(modifier)await page.keyboard.down(modifier);
      await page.mouse.move(b.x+x1*b.width,b.y+b.height*y);await page.mouse.down();
      await page.mouse.move(b.x+x2*b.width,b.y+b.height*y,{steps:8});
      if(cancel)await page.keyboard.press('Escape');await page.mouse.up();
      if(modifier)await page.keyboard.up(modifier);
    };
    const start=()=>read(()=>editorForTest.doc.segments[0].start);
    await drag(.15,.19);
    const moved=await start();
    const frame=1/await read(()=>editorForTest.fps());
    assert.ok(moved>duration*.1 && Math.abs(moved-duration*.14)<frame,'Body drag translates the clip ('+[moved,duration,frame]+')');
    const after=await read(()=>editorForTest.doc.segments[0]);assert.ok(Math.abs((after.end-moved)-duration*.1)<.0001);
    await page.keyboard.press('Control+z');assert.ok(Math.abs(await start()-duration*.1)<.0001);
    await page.keyboard.press('Control+y');assert.equal(await start(),moved);
    await strip.locator('[data-edge=end]').first().waitFor();
    const grip=await strip.locator('[data-edge=end]').first().boundingBox(),svg=await strip.locator('svg').boundingBox();
    await drag((grip.x+grip.width*.5-svg.x)/svg.width,.29);
    const end=await read(()=>editorForTest.doc.segments[0].end);
    assert.ok(end>after.end && Math.abs(end-duration*.29)<frame,'Edge drag changes the end only ('+[end,duration,frame]+')');
    await drag(.04,.49);
    assert.equal(await read(()=>editorForTest.selected.size),2);
    await page.keyboard.press('Delete');
    await check(()=>editorForTest.doc.segments.length===1);
    await detail.locator('[data-event-restore]').click();
    await check(()=>editorForTest.doc.segments.length===3);
    const cursor=await read(()=>editorForTest.video.currentVideoTime);
    await detail.locator('[data-event-zoom=in]').click();
    const range=()=>read(()=>editorForTest.eventTimeline.range());
    const initial=await range();await drag(.7,.35,.12);assert.ok((await range()).start>initial.start);
    const panned=await range();await drag(.65,.85,.12,true);assert.deepEqual(await range(),panned);
    assert.equal(await read(()=>editorForTest.video.currentVideoTime),cursor);
    await page.locator('#annotation-toggle').click();
    await read(()=>editorForTest.eventTimeline.resize({start:0,end:editorForTest.doc.context.duration/2}));
    await strip.locator('[data-clip]').first().waitFor();
    const clipState=()=>read(()=>({segments:editorForTest.doc.segments,selected:[...editorForTest.selected],draft:editorForTest.draft,time:editorForTest.video.currentVideoTime}));
    const original=await clipState();
    await drag(.45,.25,.65,false,'Shift');
    assert(Math.abs((await range()).start-duration*.1)<duration*.01);
    assert.deepEqual(await clipState(),original);
    const shifted=await range();
    await drag(.4,.05,.65,true,'Shift');assert.deepEqual(await range(),shifted);assert.deepEqual(await clipState(),original);
    await drag(.2,.95,.65,false,'Shift');assert.equal((await range()).start,0);
    await detail.locator('[data-event-zoom=all]').click();
    await drag(.45,.8,.65,false,'Alt');assert(await read(()=>editorForTest.draft?.start<editorForTest.draft?.end));
    await page.locator('#annotation-toggle').click();
    await page.locator('#annotation-settings').click();
    const dialog=page.locator('.annotation-label-dialog');
    await dialog.locator('[data-settings-select]').selectOption('walk');
    assert.equal(await dialog.locator('[data-delete-clip]').count(),2);
    await dialog.locator('[data-delete-clip]').first().click();assert.equal(await dialog.locator('[data-delete-clip]').count(),1);
    await dialog.locator('[data-action=undo]').click();assert.equal(await dialog.locator('[data-delete-clip]').count(),2);
    page.once('dialog',d=>d.accept());await dialog.locator('[data-label-remove]').click();
    assert.deepEqual(await read(()=>editorForTest.doc.segments.map(s=>NeuropixelsAnnotations.label(editorForTest.doc,s))),['rest']);
    await dialog.locator('[data-action=undo]').click();await check(()=>editorForTest.doc.segments.length===3);
    await dialog.locator('[data-label-close]').click();
    await page.locator('#video-stage').click({position:{x:8,y:8}});
    await page.keyboard.press('Control+y');await check(()=>editorForTest.doc.segments.length===1);
    await page.keyboard.press('Control+z');await check(()=>editorForTest.doc.segments.length===3);
    // Exercise real browser writable streams in private storage. The test chooses output handles in place of the OS dialog.
    await page.evaluate(async()=>{
      const dir=await navigator.storage.getDirectory();window.pickerCalls=[];
      window.showSaveFilePicker=async options=>{
        const handle=await dir.getFileHandle('annotation-'+pickerCalls.length+'.json',{create:true});
        pickerCalls.push({options,handle});return handle;
      };
      await editorForTest.saveAnnotations();await editorForTest.saveAnnotations();
      await editorForTest.saveAnnotations({saveAs:true});
    });
    const output=await read(async()=>{
      const [first,next]=pickerCalls;
      return {count:pickerCalls.length,source:first.options.startIn?.name,base:first.options.suggestedName,
        reuse:first.handle===next.options.startIn,
        clips:JSON.parse(await(await next.handle.getFile()).text()).segments.length};
    });
    assert.deepEqual(output,{count:2,source:path.basename(media),base:path.basename(media)+'.annotations.json',reuse:true,clips:3});
    await read(()=>{
      const a=editorForTest,t=.5*a.doc.context.duration;
      a.commit(NeuropixelsAnnotations.add(a.doc,{kind:'point',start:t,label:'tap'}));
      document.querySelector('#behavior-labels select').value='';
      document.querySelector('#behavior-labels select').dispatchEvent(new Event('change'));
      a.eventTimeline.resize({start:0,end:a.doc.context.duration});
    });
    const pin=strip.locator('[data-point]');await pin.waitFor();
    await pin.click();
    assert.equal(await pin.getAttribute('aria-pressed'),'true');
    assert.equal(await pin.locator('[data-edge]').count(),0);
    await drag(.5,.59);
    const t=await read(()=>editorForTest.doc.segments.at(-1).start);
    assert(t>duration*.5);
    assert.equal(await read(()=>editorForTest.doc.segments.at(-1).end),t);
    await page.locator('#annotation-toggle').click();
    assert.equal(await page.locator('[data-field=end]').count(),0);
    await page.locator('[data-action=preview-clip]').click();
    assert.equal(await read(()=>editorForTest.video.playing),false);
    assert(Math.abs(await read(()=>editorForTest.video.currentVideoTime)-t)<frame);
    const precision=page.locator('details.annotation-precision');
    await precision.locator('summary').click();
    await precision.locator('[data-field=start]').fill(String(t+.001));
    await page.locator('[data-action=quick-save]').click();
    assert.deepEqual(await read(()=>{const s=editorForTest.doc.segments.at(-1);return [s.kind,s.start,s.end];}),['point',t+.001,t+.001]);
    await page.locator('#annotation-toggle').click();
    await pin.click();await page.keyboard.press('Delete');await check(()=>!editorForTest.doc.segments.some(s=>s.kind==='point'));
    await detail.locator('[data-event-restore]').click();await pin.waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS Chrome: video drop, interval and point movement, interval edge resize, point precision editing and frame seek, box-select, Delete and undo, ruler pan and Esc, label-library deletion, native save and Save As.');
  } finally {await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
