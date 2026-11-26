// SPDX-License-Identifier: MIT
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'runtime','behavior-patterns-interaction-check');
fs.mkdirSync(dir,{recursive:true});
const {npy}=require(root+'/scripts/browser-nwb-worker');
const p=dir+'/test.html';
const scripts=['kilosort-core','event-analysis-core','behavior-patterns-core','behavior-patterns-ui'].map(f=>'<script src="'+pathToFileURL(path.join(root,'scripts',f+'.js')).href+'"></script>').join('');
const times=[],ids=[];
for(let e=0;e<30;e++){const base=2+4*e;for(const offset of [-.25,-.12,.04,.15,.24]){times.push(Math.round((base+offset)*1000));ids.push(offset<0?2:1);}}
const file=(a,d)=>Buffer.from(npy(a,d)).toString('base64');
const css=pathToFileURL(path.join(root,'styles','behavior-patterns.css')).href;
fs.writeFileSync(p,'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><link rel="stylesheet" href="'+css+'"><body><button id="launcher">Open</button><section id="p"></section>'+scripts+'<script>'+
"const blob=(s)=>new Blob([Uint8Array.from(atob(s),ch=>ch.charCodeAt(0))]);"+
"const rec={key:'rec',duration:125,sampleRate:1000,spikeTimesFile:blob('"+file(new Float64Array(times),'<f8')+"'),spikeClustersFile:blob('"+file(new Int32Array(ids),'<i4')+"')};"+
"const events=Array.from({length:30},(_,i)=>({id:'e'+i,start:2+4*i,end:null,label:'lick',sourceKind:'experiment'}));"+
"window.ui=new NeuropixelsBehaviorPatternsUI(document.getElementById('p'),{getRecording:()=>rec,getUnits:()=>[{id:1},{id:2}],getVideoRange:()=>[80,95],getVideoTime:s=>s>=80&&s<=95?s-80:null,returnToEvent:(e,t)=>window.returned={e,t},getCursor:()=>2});"+
"window.args={source:'experiment',recordingKey:'rec',unitIds:[1,2],events,launcher:document.getElementById('launcher'),contextEvents:[...events,{id:'r1',label:'reward',sourceKind:'experiment',start:40,end:null}],label:'lick'};ui.open(args);</script></body></html>");
const executable=process.env.BEHAVIOR_PATTERNS_CHROME || (process.platform==='win32'?path.join(process.env.ProgramFiles,'Google/Chrome/Application/chrome.exe'):'google-chrome');
const chrome=spawn(executable,['--headless=new','--disable-gpu','--remote-debugging-port=0','--no-first-run','--no-default-browser-check','--user-data-dir='+dir+'/chrome',pathToFileURL(p).href],{windowsHide:true,stdio:['ignore','ignore','pipe']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 let ws;
 try{
 const port=await new Promise((r,j)=>{let t='';chrome.stderr.on('data',s=>{t+=s;const m=t.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m)r(m[1])});chrome.on('error',j);});
 const tabs=await(await fetch('http://localhost:'+port+'/json/list')).json();const tab=tabs.find(x=>x.type==='page'&&x.url.includes('test.html'));
 ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let i=0;const ids=new Map(),error=[];
 ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id)ids.get(d.id)(d);if(d.method==='Runtime.exceptionThrown')error.push(d.params.exceptionDetails.exception?.description||d.params.exceptionDetails.text);};
 const call=(method,params={})=>new Promise((r,j)=>{ids.set(++i,v=>v.error?j(Error(v.error.message)):r(v.result));ws.send(JSON.stringify({id:i,method,params}));});
 const ev=async expression=>{const v=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(v.exceptionDetails)throw Error(v.exceptionDetails.exception?.description);return v.result.value;};
 const wait=async e=>{for(let i=0;i<100;i++){if(await ev(e))return;await sleep(75);}throw Error('Timed out '+e+' '+await ev('document.body.innerText.slice(-1500)'));};
 const click=selector=>ev(`ui.root.querySelector(${JSON.stringify(selector)}).click()`);
 const key=(key,modifiers=0)=>call('Input.dispatchKeyEvent',{type:'keyDown',key,modifiers});
 const step=direction=>click('[data-bp-action='+direction+']');
 await call('Runtime.enable');await wait('window.ui?.detail?.events.length===20');
 for(const [width,deviceScaleFactor,textSize] of [[1920,1,16],[800,2,19]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor,mobile:false});
   await ev(`document.documentElement.style.fontSize="${textSize}px"`);
   assert.equal(await ev(`ui.renderRaster();Array.from(ui.root.querySelectorAll("[data-bp-mean-label]")).every(el=>{const curve=el.nextElementSibling,box=curve.getBoundingClientRect();return el.textContent.startsWith("平均发放率（Hz） · 0–") && Number.parseFloat(getComputedStyle(el).fontSize)===${textSize * .875} && Math.abs(curve.width-box.width*devicePixelRatio)<=1 && el.scrollWidth<=el.clientWidth+1;})`),true);
 }
 assert.equal(await ev('ui.result.groups.raw'),30);assert.equal(await ev('ui.el("map").getAttribute("role")'),'img');
 assert.equal(await ev('!ui.el("search-box").open && !ui.el("order") && ui.root.querySelector("[data-bp-action=back]").hidden'),true);
 assert.equal(await ev('Array.from(ui.root.querySelectorAll("button,summary")).every(el=>el.title.length>3)'),true);
 await ev('ui.el("query-form").requestSubmit()');await wait('!!ui.query');assert.equal(await ev('!ui.el("trial-section").open && !ui.el("repeat-box").open && ui.el("search-box").open'),true);assert.equal(await ev('ui.query.similar[0].score'),1);
 assert.equal(await ev('ui.query.similar.slice(0,5).every(x=>x.anchor<80)'),true);
 await ev('ui.root.querySelector("[data-bp-filter=video]").click()');
 assert.equal(await ev('ui.query.video.eligible===4 && ui.candidates.length>0 && ui.candidates.every(x=>x.segmentStart>=80 && x.segmentEnd<=95)'),true);
 await ev('ui.root.querySelector("[data-bp-candidate]").click()');await wait('ui.root.querySelectorAll("[data-bp-pair]").length===2');assert.equal(await ev('typeof returned'), 'undefined');
 assert.equal(await ev('ui.el("zero").textContent.includes("虚线为事件零点 250 ms") && ui.el("candidate").textContent.includes("事件")'),true);
 await click('[data-bp-action=inspect]');assert.equal(await ev('Number.isFinite(returned.t)'),true);
 assert.equal(await ev('returned.t>=80 && returned.t<=95'),true);
 assert.equal(await ev('ui.returnFromReview() && document.activeElement.hasAttribute("data-bp-candidate") && !ui.returnFromReview()'),true);
 await click('[data-bp-event=e1]');assert.equal(await ev('returned.t===6 && !!ui.query && ui.returnFromReview()'),true);
 await key(' ');await wait('ui.detail && ui.activeId==="e1" && !ui.query && ui.el("search-box").open');
 await key('z',2);await wait('ui.query && ui.activeId==="e0" && ui.videoOnly');
 await step('forward');await wait('ui.detail && ui.activeId==="e1" && !ui.query');
 await step('back');await wait('ui.query && ui.activeId==="e0"');
 await ev('const qForm=ui.el("query-form");qForm.elements.start.value="-.200125";qForm.elements.end.value=".240125";qForm.elements.scope.value="recording";qForm.requestSubmit()');
 await wait('ui.query?.scope==="recording" && ui.searchRange.start===-.200125');
 await step('back');await wait('ui.query?.scope==="events" && ui.searchRange.start===-.25 && ui.videoOnly');
 await step('forward');await wait('ui.query?.scope==="recording" && ui.searchRange.start===-.200125');
 await step('back');await wait('ui.query?.scope==="events" && ui.searchRange.start===-.25');
 // Unit selection and native form editing have independent undo scopes.
 await click('[data-bp-unit="2"]');await wait('ui.selected.length===1 && !ui.query');
 await ev('ui.el("query-form").elements.start.focus()');await key('z',2);assert.equal(await ev('ui.selected.length'),1);
 await key('Escape');assert.equal(await ev('ui.root.hidden'),false);
 await ev('ui.root.focus()');await key('z',2);await wait('ui.selected.length===2 && !!ui.query');
 await step('forward');await wait('ui.selected.length===1');await step('back');await wait('ui.selected.length===2 && !!ui.query');
 // Real pointer capture cancellation must leave the previous reference and query intact.
 await ev('ui.el("trial-section").open=true;ui.renderRaster()');
 const pos=await ev('ui.el("raster").scrollIntoView({block:"center"});const rect=ui.el("raster").getBoundingClientRect();({x:rect.left+rect.width*.3,y:rect.top+24})');
 await call('Input.dispatchMouseEvent',{type:'mousePressed',...pos,button:'left',buttons:1,clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:pos.x+40,y:pos.y,buttons:1});
 assert.equal(await ev('!!ui.drag'),true);await key('Escape');
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:pos.x+40,y:pos.y,button:'left',buttons:0});
 assert.equal(await ev('!ui.drag && ui.activeId==="e0" && !!ui.query'),true);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',...pos,button:'left',buttons:1,clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:pos.x+40,y:pos.y,buttons:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:pos.x+40,y:pos.y,button:'left',buttons:0});
 await wait('ui.activeId==="e1" && !ui.query && ui.searchRange.end>ui.searchRange.start');
 assert.deepEqual(await ev('ui.queryUnits()'),[1]);assert(!await ev('ui.el("reference-units").textContent.includes("Unit 2")'));
 await step('back');await wait('ui.query?.scope==="events" && ui.activeId==="e0"');
 // Analysis settings restore the old bin width, query and selected units.
 await ev('const cfg=ui.el("config");cfg.parentElement.open=true;cfg.elements.bin.value=100;cfg.requestSubmit()');
 await wait('ui.result?.binWidth===.1 && !!ui.query');await step('back');await wait('ui.result?.binWidth===.05 && !!ui.query');
 assert.equal(await ev('ui.el("config").elements.bin.value'), '50');
 await ev('ui.el("config").parentElement.querySelector("summary").focus()');await key('Escape');
 assert.equal(await ev('!ui.el("config").parentElement.open && !ui.root.hidden'),true);
 await ev('ui.root.querySelector("[data-bp-filter=video]").click()');assert.equal(await ev('ui.candidates.some(x=>x.anchor<80)'),true);
 await ev('const ord=ui.el("order");ord.value="match";ord.dispatchEvent(new Event("change",{bubbles:true}));');await wait('ui.detail && ui.order==="match"');
 await ev('ui.root.querySelector("[data-bp-action=next]").click()');await wait('ui.detail?.events.length===10');
 await step('back');await wait('ui.page===0 && ui.order==="match"');await step('forward');await wait('ui.page===1 && ui.order==="match"');
 await ev('ui.root.focus()');await key('Escape');assert.equal(await ev('ui.root.hidden && ui.worker===null && document.activeElement===args.launcher'),true);
 await ev('ui.open(args)');await wait('ui.query && ui.detail?.events.length===10 && ui.page===1 && ui.order==="match"');
 assert.equal(await ev('ui.activeId==="e0" && ui.selected.length===2 && ui.scope==="events"'),true);
 await ev('ui.open({...args,anchorId:"e18",unitIds:[2]})');await wait('ui.detail && ui.activeId==="e18" && !ui.query');assert.deepEqual(await ev('ui.selected'),[2]);
 await ev('ui.open({...args,events:[],label:"",queryRange:{start:1.75,end:2.25}})');await wait('ui.el("scope")?.value==="recording"');await ev('ui.el("query-form").requestSubmit()');await wait('ui.query?.scope==="recording"');
 await wait('ui.el("pair")');assert.equal(await ev('ui.el("zero").textContent.includes("事件零点")'),false);
 await ev('ui.root.querySelector("[data-bp-filter=video]").click()');assert.equal(await ev('ui.query.video.eligible>0 && ui.candidates.length>0 && ui.candidates.every(x=>x.segmentStart>=80 && x.segmentEnd<=95)'),true);
 await ev('ui.getVideoRange=()=>null;ui.el("query-form").requestSubmit()');await wait('!!ui.query');assert.equal(await ev('!ui.query.video && !ui.root.querySelector("[data-bp-filter]") && ui.candidates.length>0'),true);
 await ev('ui.root.querySelector("[data-bp-action=close]").click()');assert.equal(await ev('ui.root.hidden && ui.worker===null'),true);assert.deepEqual(error,[]);
 await ev('ui.invalidate(rec);ui.open(args);window.staleWorker=ui.worker.onmessage;ui.root.focus()');await key('Escape');
 assert.equal(await ev('ui.root.hidden && !ui.worker'),true);
 await ev('ui.open({...args,anchorId:"e3",unitIds:[2]});staleWorker({data:{result:{}}})');
 await wait('ui.detail && ui.activeId==="e3" && ui.selected.length===1');assert.equal(await ev('!!ui.query'),false);assert.deepEqual(error,[]);
 await ev('ui.invalidate(rec);ui.open({...args,unitIds:[]})');await wait('!!ui.el("add-unit")');assert.equal(await ev('ui.selected.length'),0);
 assert.equal(await ev('ui.el("search-box").hidden && ui.el("repeat-box").hidden'),true);
 await ev('const select=ui.el("add-unit");select.value="1";select.dispatchEvent(new Event("change",{bubbles:true}))');await wait('ui.repeatData?.exemplar!=null && ui.detail');
 assert.equal(await ev('!ui.el("pop").parentElement.open && ui.repeatData.total===30'),true);await click('[data-bp-action=typical]');await wait('ui.query && ui.el("pair")');
 await ev('ui.open({...args,events:events.slice(0,2)})');await wait('ui.result?.events.length===2 && ui.detail');
 assert.equal(await ev('!ui.el("page") && !ui.el("order")'),true);
 await ev('rec.spikeCount=80000000;rec.jointSources=["A","B"];ui.invalidate(rec);ui.open({...args,unitIds:[2]})');
 await wait('ui.detail && ui.result');assert.deepEqual(await ev('ui.result.unitIds'),[2]);
 await ev('ui.open({...args,unitIds:[]})');await wait('ui.el("status").textContent.includes(ui.t("largeIndex"))');
 assert.equal(await ev('ui.worker'),null);
 console.log('PASS: real Chrome/Worker undo/redo, source invalidation and late replies, native field editing, pointer cancellation, settings, units, ranked pagination, session resume, candidate return, video filtering, HiDPI');
 }finally{ws?.close();chrome.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
