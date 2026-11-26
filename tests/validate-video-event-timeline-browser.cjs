// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'runtime','video-event-timeline-check');
fs.mkdirSync(dir,{recursive:true});
const url=f=>pathToFileURL(path.join(root,f)).href,page=path.join(dir,'index.html');
fs.writeFileSync(page,`<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<link rel="stylesheet" href="${url('styles/app.css')}"><link rel="stylesheet" href="${url('styles/workspace-presentation.css')}"><link rel="stylesheet" href="${url('styles/video-event-timeline.css')}">
<body><section id="video-sync-panel" style="width:600px"><div class="video-transport"><div id="video-event-overview"><canvas></canvas><input type="range" id="video-seek" class="video-seek"></div></div>
<details id="video-event-detail" open><summary></summary><div data-event-detail-body><div data-event-scale></div><div data-event-plot></div><div id="annotation-timeline"></div></div></details></section>
<script src="${url('scripts/video-sync.js')}"></script><script src="${url('scripts/video-event-timeline.js')}"></script><script>
const get=s=>document.querySelector(s),seek=get('#video-seek');
const state={cursorTime:0};
const video=new NeuropixelsVideoSync.VideoSyncController({seek},{onNeuralTime:t=>state.cursorTime=t});
video.recording={key:'test',duration:90};video.source={kind:'synthetic',duration:10,fps:30};
video.mapping=new NeuropixelsVideoSync.TimeMapping({provenance:{frame_clock:{video_s:[1,9],neural_s:[11,19]}}});
video._configureDuration(10);const historyLog=[];
const t=new NeuropixelsVideoEventTimeline({overview:get('#video-event-overview'),detail:get('#video-event-detail'),video,getView:()=>state,
  history:{beginGesture:()=>historyLog.push('begin'),endGesture:o=>historyLog.push(o?.cancel?'cancel':'end'),checkpoint:()=>historyLog.push('step')},
  seekNeural:n=>state.cursorTime=n,select:r=>{historyLog.push('selected');window.picked=r.id;}});
const rows=[{id:'before',start:3,point:true},{id:'lick',start:15,point:true,label:'lick'},{id:'after',start:41,point:true}];
t.setRows(rows,'experiment');</script></body></html>`);
const executable=process.env.BEHAVIOR_PATTERNS_CHROME||(process.platform==='win32'?path.join(process.env.ProgramFiles,'Google/Chrome/Application/chrome.exe'):'google-chrome');
const chrome=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+path.join(dir,'chrome'),pathToFileURL(page).href],{windowsHide:true,stdio:['ignore','ignore','pipe']});
const tick=ms=>new Promise(ok=>setTimeout(ok,ms));
(async()=>{
  let ws;
  try{
    const port=await new Promise((ok,no)=>{let s='';chrome.stderr.on('data',d=>{s+=d;const m=s.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m)ok(m[1]);});chrome.on('error',no);});
    const tab=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'&&t.url===pathToFileURL(page).href);
    ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(ok=>ws.onopen=ok);
    let id=0;const pending=new Map(),errors=[];
    ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const [ok,no]=pending.get(m.id);pending.delete(m.id);m.error?no(Error(m.error.message)):ok(m.result);}
      if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
    const call=(method,params={})=>new Promise((ok,no)=>{pending.set(++id,[ok,no]);ws.send(JSON.stringify({id,method,params}));});
    const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
    const ready=async expression=>{for(let i=0;i<100;i++){if(await ev(expression))return;await tick(30);}throw Error('Timed out '+expression);};
    const mouse=(type,x,y,buttons,modifiers=0)=>call('Input.dispatchMouseEvent',{type,x,y,buttons,modifiers,button:type==='mouseMoved'?'none':'left',clickCount:type==='mouseMoved'?0:1});
    const keyboard=async key=>{const code=key==='ArrowRight'?39:key==='ArrowLeft'?37:key==='End'?35:27;for(const type of ['rawKeyDown','keyUp'])await call('Input.dispatchKeyEvent',{type,key,code:key,windowsVirtualKeyCode:code});};
    await call('Runtime.enable');await ready('window.NeuropixelsVideoEventTimeline && t.summary.textContent.includes("视频内 1 / 全记录 3")');
    const pos=await ev('(()=>{const c=t.overviewPlot.getBoundingClientRect(),s=seek.getBoundingClientRect();return {x:c.x,w:c.width,top:c.y,bottom:c.bottom,track:s.y+s.height/2-2.5,sy:s.y+s.height/2+2}})()');
    assert.ok(Math.abs(pos.bottom-pos.track)<=1,'Event ticks must touch native track');
    await mouse('mousePressed',pos.x+pos.w*.5,pos.bottom-4,1);await mouse('mouseReleased',pos.x+pos.w*.5,pos.bottom-4,0);
    assert.equal(await ev('window.picked'),'lick');assert.ok(Math.abs(await ev('video.currentVideoTime')-5)<1e-4);
    assert.deepEqual(await ev('historyLog.splice(0)'),['selected']);
    await ev('t.setRows([],"experiment")');await ready('t.items.length===0');
    await mouse('mousePressed',pos.x+pos.w*.25,pos.bottom-4,1);await mouse('mouseReleased',pos.x+pos.w*.25,pos.bottom-4,0);
    assert.deepEqual(await ev('historyLog.splice(0)'),['step']);
    await mouse('mousePressed',pos.x+pos.w*.2,pos.bottom-4,1);await mouse('mouseMoved',pos.x+pos.w*.7,pos.bottom-4,1);await mouse('mouseReleased',pos.x+pos.w*.7,pos.bottom-4,0);
    const afterMarks=await ev('video.currentVideoTime');
    assert.ok(Math.abs(afterMarks-7)<.04,'No-label scrub through tick area: '+afterMarks);
    assert.deepEqual(await ev('historyLog.splice(0)'),['begin','end']);
    await mouse('mousePressed',pos.x+pos.w*.7,pos.sy,1);await mouse('mouseMoved',pos.x+pos.w*.4,pos.sy,1);await mouse('mouseReleased',pos.x+pos.w*.4,pos.sy,0);
    const before=await ev('video.currentVideoTime');assert.ok(Math.abs(before-4)<.08,'No-label native scrub '+before);
    assert.deepEqual(await ev('historyLog.splice(0)'),['begin','end']);
    for(const y of [pos.bottom-4,pos.sy]){
      await ev('video.seekVideo(4);video.play()');await ready('video.playing');
      await mouse('mousePressed',pos.x+pos.w*.4,y,1);await mouse('mouseMoved',pos.x+pos.w*.8,y,1);
      assert.equal(await ev('video.playing'),false);await keyboard('Escape');
      await mouse('mouseReleased',pos.x+pos.w*.8,y,0);
      assert.ok(await ev('video.playing && Math.abs(video.currentVideoTime-4)<.1'),'Escape restores original time and playing state');
      assert.deepEqual(await ev('historyLog.splice(0)'),['begin','cancel']);await ev('video.pause()');
    }
    await keyboard('ArrowRight');assert.ok(await ev('video.currentVideoTime')>before);
    await keyboard('End');assert.ok(await ev('video.currentVideoTime')>9.95);
    await ev('video.seekVideo(5);let spot=get("[data-event-plot]").getBoundingClientRect();t.setRows(rows,"experiment")');
    await ready('t.items.length===1');
    await ev('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))');
    const pt=await ev('(()=>{spot=t.plotCanvas.getBoundingClientRect();return {x:spot.x,y:spot.y+30,w:spot.width}})()');
    await mouse('mousePressed',pt.x+pt.w*.3,pt.y,1);await mouse('mouseMoved',pt.x+pt.w*.7,pt.y,1);await mouse('mouseReleased',pt.x+pt.w*.7,pt.y,0);
    await ready('t.recordSelected.has("lick") && !get("[data-record-selected]").hidden');
    assert.equal(await ev('video.currentVideoTime'),5);await keyboard('Escape');await ready('!t.recordSelected.size');
    await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:await ev('spot.x+spot.width*.5'),y:await ev('spot.y+26'),deltaX:0,deltaY:-100});
    await ready('t.range().end-t.range().start<10');assert.equal(await ev('video.currentVideoTime'),5);
    await ev('t.resize({start:3,end:7});t.recordSelected.add("lick")');
    const middle=pt.x+pt.w*.5;
    await mouse('mousePressed',middle,pt.y,1,8);await mouse('mouseMoved',pt.x+pt.w*.25,pt.y,1,8);await mouse('mouseReleased',pt.x+pt.w*.25,pt.y,0,8);
    assert(Math.abs(await ev('t.range().start')-4)<.02);
    assert.equal(await ev('t.range().end-t.range().start'),4);
    const savedRange=await ev('t.range()');
    await mouse('mousePressed',middle,pt.y,1,8);await mouse('mouseMoved',pt.x+pt.w*.75,pt.y,1,8);await keyboard('Escape');await mouse('mouseReleased',pt.x+pt.w*.75,pt.y,0,8);
    assert.deepEqual(await ev('t.range()'),savedRange);
    await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:middle,y:pt.y,deltaX:0,deltaY:100,modifiers:8});
    await ready('t.range().start>4.5');assert.equal(await ev('t.range().end-t.range().start'),4);
    assert.deepEqual(await ev('[video.currentVideoTime,...t.recordSelected]'),[5,'lick']);
    await ev('t.detail.open=false');await ready('!t.detail.open');assert.equal(await ev('get("#video-event-overview").hidden'),false);
    await ev('t.detail.open=true;video.source=null;t.setRows(rows,"experiment");t.update()');
    await ready('t.items.length===3&&t.summary.textContent.includes("全记录 3")');assert.equal(await ev('t.overview.hidden'),true);
    await ev('t.detail.open=false;video.source={kind:"synthetic",duration:10,fps:30};t.attachEditor({doc:{},opened:true,drawTimeline(){}});t.setRows([],"annotation")');
    await ready('t.detail.open && t.usesEditor()');await ev('t.detail.open=false;t.update()');await ready('!t.detail.open && !t.usesEditor()');
    assert.deepEqual(errors,[]);console.log('PASS Chrome: joined ticks, event seek, empty native/tick-band drag, native keyboard seek, independent zoom/fold, neural-only detail and source counts');
  }finally{ws?.close();chrome.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
