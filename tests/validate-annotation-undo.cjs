// SPDX-License-Identifier: MIT
// Real keyboard and pointer events in an isolated Chrome profile. No project files are opened.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const shell = fs.readFileSync(path.join(__dirname,"../scripts/explorer-shell.html"),"utf8");
const labelSection = shell.match(/<section id="behavior-labels"[^>]*>[\s\S]*?<\/section>/)[0];
const fixture = `<!doctype html><style>svg{display:block;width:100%}.annotation-hover-preview,.annotation-video-labels{pointer-events:none}#strip{width:700px}dialog:not([open]){display:none}</style>
<body><button id="toggle">Annotate</button><div id="strip"></div><div><div id="panel"></div></div>
${labelSection}<button id="pattern-label"></button><button id="mark"></button>
<script src="/annotation-core.js"></script><script src="/behavior-labels.js"></script><script src="/annotation-ui.js"></script><script>
const $=s=>document.querySelector(s), el=id=>document.getElementById(id);
window.rec={key:'one',duration:60}; const docs=new Map();
window.view={visibleRange:{start:0,end:10},cursorTime:3};
const video={source:{kind:'synthetic',name:'test',size:1,duration:60,fps:30},elements:{video:document.createElement('video')},
  mapping:{verificationStatus:'verified',videoToNeural:t=>t,neuralToVideo:t=>t},currentVideoTime:3,
  rateChosen:true,playing:false,playCount:0,async play(){this.playCount++;return this.playing=!this.rejectPlay},pause(){this.playing=false},seekVideo(t){this.currentVideoTime=t},_renderSyntheticFrame(){},t:t=>t};
const notices=[];
const labels=new NeuropixelsBehaviorLabels(el('behavior-labels'),{canvas:{setAnnotations(r){window.mappedRows=r}},t:s=>s,select:r=>{window.pickedRow=r},
  cursor:()=>view.cursorTime,videoCursor:()=>video.currentVideoTime,onSource(){},onChange(){},openPatterns(){},onRows:r=>{window.allRows=r},onLabelSelection:(name,source)=>a.setMarkLabel(name,source)});
window.a=new NeuropixelsAnnotationUI.AnnotationController({panel:el('panel'),strip:el('strip'),button:el('toggle'),video,getRecording:()=>rec,getView:()=>view,
  setView:p=>Object.assign(view,p),toast:m=>notices.push(m),labelControls:{settings:el('annotation-settings'),mark:el('mark'),selectLabel:name=>labels.selectVideoLabel(name)},
  onAnnotations:rows=>labels.setVideo(rows,Object.keys(window.a?.doc?.labelColors||{}))});
a.store={request:async(k,v)=>{if(v)docs.set(k,v);return docs.get(k)}};
window.ready=(async()=>{await labels.update(rec);await a.update();el('toggle').click();
  a.commit(NeuropixelsAnnotations.add(a.doc,{start:2,end:4,label:'walk'}));a.select(a.doc.segments[0].id);})();
</script>`;
async function main() {
  const server=http.createServer((req,res)=>{
    if(req.url==="/"){res.setHeader("Content-Type","text/html; charset=utf-8");res.end(fixture);return;}
    if(!["/behavior-labels.js","/annotation-core.js","/annotation-ui.js"].includes(req.url)){res.writeHead(404).end();return;}
    res.setHeader("Content-Type","text/javascript");res.end(fs.readFileSync(path.join(__dirname,"../scripts",req.url)));
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"neuro-annotation-test-"));
  const executable=process.env.EVENT_ANALYSIS_CHROME||path.join(process.env.ProgramFiles||"C:/Program Files","Google/Chrome/Application/chrome.exe");
  const browser=spawn(executable,["--headless=new","--disable-gpu","--no-first-run","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{windowsHide:true,stdio:["ignore","ignore","pipe"]});
  let ws;
  try {
    const port=await new Promise((resolve,reject)=>{let logs="";const timer=setTimeout(()=>reject(Error("Chrome startup timed out")),15000);
      browser.once("error",reject);browser.stderr.on("data",buf=>{logs+=buf;const m=logs.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
    const target=(await(await fetch("http://127.0.0.1:"+port+"/json/list")).json()).find(t=>t.type==="page");
    ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    const pending=new Map(),errors=[];let seq=0;
    ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const [resolve,reject]=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(m.error.message)):resolve(m.result);}
      if(m.method==="Runtime.exceptionThrown")errors.push(m.params.exceptionDetails.exception?.description);};
    const call=(method,params={})=>new Promise((r,j)=>{pending.set(++seq,[r,j]);ws.send(JSON.stringify({id:seq,method,params}));});
    const read=async expression=>{const r=await call("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
    const key=async(k,code,modifiers=0)=>{for(const type of ["keyDown","keyUp"])await call("Input.dispatchKeyEvent",{type,key:k,windowsVirtualKeyCode:code,modifiers});};
    const mouse=(type,p)=>call("Input.dispatchMouseEvent",{type,...p,button:"left",buttons:type==="mouseReleased"?0:1,clickCount:1});
    const box=selector=>read(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    await call("Runtime.enable");await call("Page.navigate",{url:"http://127.0.0.1:"+server.address().port});
    for(let i=0;i<80 && !await read("Boolean(window.ready)");i++)await delay(50);
    assert.deepEqual(errors,[],'annotation fixture initialization');
    await read("ready");
    const click=action=>read(`document.querySelector('[data-action="${action}"]').click()`);
    const editState=()=>read("[a.doc.segments.length,[...a.selected],view.selectedInterval]");
    const before=await editState(), id=before[1][0];
    await click("remove");assert.deepEqual(await editState(),[0,[],null]);
    await key("z",90,2);assert.deepEqual(await editState(),[1,[id],{start:2,end:4}]);
    await key("Z",90,10);assert.deepEqual(await editState(),[0,[],null]);
    await click("undo");
    const start=await box('[data-edge="start"]'),moved={x:start.x+40,y:start.y};
    await mouse("mousePressed",start);await mouse("mouseMoved",moved);assert(await read("a.drag?.value>2"));
    await key("Escape",27);await mouse("mouseReleased",moved);
    assert(await read("a.opened && a.doc.segments[0].start===2 && !a.gesture && Number(a.input('start').value)===2"));
    const area=await box("#strip svg");area.x=35;
    await mouse("mousePressed",area);await mouse("mouseMoved",{...area,x:65});
    assert(await read("!!a.brush && !!a.draft"));await key("Escape",27);await mouse("mouseReleased",area);
    assert.deepEqual(await editState(),before);
    await read("a.selected.clear();a.draft={start:1,end:1.5};a.render()");
    await mouse("mousePressed",area);await mouse("mouseMoved",{...area,x:80});
    await read("a.strip.dispatchEvent(new PointerEvent('pointercancel',{pointerId:a.gesture.pointerId,bubbles:true}))");
    await mouse("mouseReleased",area);assert.deepEqual(await read("a.draft"),{start:1,end:1.5});
    await read("a.select(a.doc.segments[0].id)");
    await click("review");await read("a.input('label').focus();a.input('label').select()");
    await call("Input.insertText",{text:"typed only"});await key("z",90,2);
    assert(await read("a.input('label').value==='walk' && a.doc.segments.length===1"));
    await read("rec={key:'two',duration:60};a.update()");
    assert(await read("a.doc.segments.length===0 && a.history.length===0 && a.future.length===0 && !a.gesture"));
    await read("rec={key:'one',duration:60};a.update()");assert.equal(await read("a.doc.segments[0].id"),id);
    const legacyKey=await read("a.key");assert.deepEqual(JSON.parse(legacyKey),["one","synthetic","test",1]);
    await read("a.video.source.descriptor={annotationSourceId:'fixture-B'};a.update()");
    assert.deepEqual(await read("[a.doc.segments.length,a.history.length]"),[0,0]);
    await read("a.commit(NeuropixelsAnnotations.add(a.doc,{start:5,end:6,label:'video B'}));a.video.source.descriptor={annotationSourceId:'fixture-B',timeMapping:{offset_s:12}};a.update()");
    assert.equal(await read("a.doc.segments[0].start"),5);
    await read("a.video.source.descriptor={annotationSourceId:'fixture-C'};a.update()");
    assert.deepEqual(await read("[a.doc.segments.length,a.history.length]"),[0,0]);
    await read("a.video.source.descriptor={annotationSourceId:'fixture-B'};a.update()");
    assert.equal(await read("a.doc.segments[0].start"),5);
    await read("a.video.source.descriptor={};a.update()");
    assert.equal(await read("a.key"),legacyKey);assert.equal(await read("a.doc.segments[0].id"),id);
    assert.deepEqual(await read("notices"),[]);
    await read("if(a.opened)el('toggle').click();labels.recorded=[{id:'lick-1',label:'lick',start:2,end:2}];labels.switchTo('experiment');video.seekVideo(5.125);el('mark').click()");
    assert(await read("a.labelDialog.open && !a.quickMark && !a.markLabel && !video.playing"));
    await read("$('[data-label-new]').click();$('[data-label-name]').value='rear';$('.annotation-name-form').requestSubmit();$('[data-label-use]').click()");
    assert.deepEqual(await read("[a.quickMark.start,a.quickMark.label,video.playCount,labels.source,labels.picker.value]"),[5.125,"rear",1,"annotation","rear"]);
    await read("video.seekVideo(7.3);el('mark').click();el('mark').focus()");
    assert.deepEqual(await read("[a.doc.segments.at(-1).start,a.doc.segments.at(-1).end,NeuropixelsAnnotations.label(a.doc,a.doc.segments.at(-1)),video.playing,video.currentVideoTime]"),[5.125,7.3,"rear",false,7.3]);
    await key("z",90,2);assert.equal(await read("a.doc.segments.length"),1);
    await key("Z",90,10);assert.equal(await read("a.doc.segments.length"),2);
    await read("labels.switchTo('experiment');video.playing=true;video.seekVideo(8);el('mark').click()");
    assert.deepEqual(await read("[a.quickMark.label,labels.source,video.playCount]"),["rear","annotation",1]);
    await read("video.seekVideo(9);el('mark').click()");
    assert.deepEqual(await read("[video.playing,a.doc.segments.length]"),[false,3]);
    await read("video.seekVideo(12);el('mark').click()");
    await key("Escape",27);
    assert(await read("!a.quickMark && !video.playing && a.doc.segments.length===3"));
    await read("video.rejectPlay=true;el('mark').click();Promise.resolve()");
    assert(await read("!a.quickMark && !video.playing && a.doc.segments.length===3 && notices.length===1"));
    await read("video.rejectPlay=false;video.seekVideo(59);el('mark').click();video.seekVideo(60);video.elements.video.dispatchEvent(new Event('ended'))");
    assert(await read("!video.playing && !a.quickMark && a.doc.segments.at(-1).end===60 && el('mark').disabled"));
    await read("(async()=>{video.seekVideo(12);await a.update();el('mark').click();a.video.source.descriptor={annotationSourceId:'fixture-D'};await a.update()})()");
    assert(await read("!a.quickMark && !a.markLabel && !a.doc.segments.length && !a.history.length"));
    await read("(async()=>{a.video.source.descriptor={};await a.update();labels.switchTo('annotation');labels.setVideo([{id:'n',label:'unmapped',start:null,end:null,videoStart:14,videoEnd:16},{id:'m',label:'walk',start:97,end:98,videoStart:9,videoEnd:10}]);labels.types.annotation='';labels.render();video.seekVideo(12);labels.step(1)})()");
    assert.deepEqual(await read("[pickedRow.id,allRows.map(r=>r.id),mappedRows.map(r=>r.id)]"),["n",["m","n"],["m"]]);
    await read("labels.picker.value='unmapped';labels.picker.dispatchEvent(new Event('change'))");
    assert(await read("el('pattern-label').hidden && !mappedRows.length && allRows.length===1"));
    await read("video.seekVideo(20);video.playing=true;a.markLabel='';el('mark').click()");
    assert(await read("a.markPrompt.start===20 && a.labelDialog.open && !video.playing"));
    await read("a.labelDialog.close();new Promise(r=>setTimeout(r,30))");
    assert(await read("video.playing && !a.quickMark && !a.markPrompt"));
    await read("video.seekVideo(21);el('mark').click();$('[data-settings-select]').value='walk';$('[data-settings-select]').dispatchEvent(new Event('change',{bubbles:true}));$('[data-label-use]').click()");
    assert(await read("a.quickMark.start===21 && a.quickMark.label==='walk' && video.playing"));
    await read("video.seekVideo(22);el('mark').click()");
    await read("const api=NeuropixelsAnnotations;const imported=api.importCandidates(a.doc,{schema:api.CANDIDATE_SCHEMA,timebase:'video_seconds',video:{name:'test',size:1,duration:60},run:{id:'run-test',method:'fixture',parameters:{}},segments:[{start:34,end:40,group_id:'0'}]});a.commit(api.nameGroup(imported,'run-test/0','walk'));a.commit(api.addScheme(a.doc,'other'));a.commit(api.nameGroup(a.doc,'run-test/0','walk'));a.commit(api.assign(a.doc,['run-test:0'],null,true));");
    const identity=await read("JSON.stringify([a.doc.segments,a.doc.runs,a.doc.schemes.map(s=>s.reviewed)])");
    const chooseName=name=>read(`$('[data-settings-select]').value=${JSON.stringify(name)};$('[data-settings-select]').dispatchEvent(new Event('change',{bubbles:true}))`);
    const saveName=name=>read(`$('[data-label-name]').value=${JSON.stringify(name)};$('[data-label-name]').dispatchEvent(new Event('input',{bubbles:true}));$('.annotation-name-form').requestSubmit()`);
    await read("el('annotation-settings').click()");await chooseName("walk");await saveName("rear");
    assert(await read("a.labelDialog.open && !$('[data-label-name]').validity.valid"));
    await saveName("walking");await read("$('[data-label-use]').click()");
    assert(await read("a.markLabel==='walking' && !a.labelDialog.open && a.doc.schemes.every(s=>s.mappings['run-test/0']==='walking') && a.doc.schemes[0].labels[a.doc.segments[0].id]==='walking'"));
    assert.equal(await read("JSON.stringify([a.doc.segments,a.doc.runs,a.doc.schemes.map(s=>s.reviewed)])"),identity);
    await read("el('annotation-settings').click();$('[data-label-close]').focus()");await key("z",90,2);
    assert(await read("a.doc.schemes.every(s=>s.mappings['run-test/0']==='walk')"));
    await read("$('[data-label-close]').focus()");await key("y",89,2);await chooseName("walking");
    assert(await read("!!$('[data-label-remove]')"));
    await read("$('[data-label-new]').click()");await saveName("unused");
    assert(await read("a.labelDialog.open && a.markLabel!=='unused'"));
    await read("$('[data-label-use]').click()");
    await read("el('annotation-settings').click();$('[data-label-remove]').click()");
    assert(await read("!Object.hasOwn(a.doc.labelColors,'unused') && !a.markLabel"));
    await read("$('.annotation-label-dialog [data-action=undo]').click()");
    assert(await read("Object.hasOwn(a.doc.labelColors,'unused')"));
    await read("a.labelDialog.close();const originalCursor=view.cursorTime,originalRange=JSON.stringify(view.visibleRange);video.mapping={videoToNeural:t=>t+80,neuralToVideo:t=>t-80};a.select(a.doc.segments[0].id,{openEditor:false})");
    assert(await read("video.currentVideoTime===2 && view.selectedInterval===null && view.cursorTime===originalCursor && JSON.stringify(view.visibleRange)===originalRange"));
    await read("video.mapping={frameClock:{video_s:[3,9]},videoToNeural:t=>t<3||t>9?NaN:t+1,neuralToVideo:t=>t-1};a.select(a.doc.segments[0].id,{openEditor:false})");
    assert.deepEqual(await read("view.selectedInterval"),{start:4,end:5});
    assert.deepEqual(errors,[]);
    console.log("PASS annotation undo/redo, cross-scheme naming with preserved import provenance, quick mark/stop, playback failure, EOF, cancellation, and partial/absent neural coverage in Chrome.");
  } finally {
    ws?.close();browser.kill();server.close();await delay(400);
    try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:120});}catch{/* Chrome can briefly retain the profile lock. */}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
