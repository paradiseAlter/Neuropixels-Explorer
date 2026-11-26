// SPDX-License-Identifier: MIT
"use strict";
// node tests/validate-signal-workspace.cjs [--browser]
const assert=require("node:assert/strict"), fs=require("node:fs"), path=require("node:path");
const {timeWindow,binSize,ratesFor}=require("../scripts/signal-workspace.js");
assert.deepEqual(timeWindow(37,2,1000),{start:36,end:38});
assert.deepEqual(timeWindow(.1,2,1000),{start:0,end:2});
assert.deepEqual(timeWindow(999.9,2,1000),{start:998,end:1000});
assert.equal(binSize(2,700),.1);
const r=ratesFor([1,1.15,1.26,1.3],{start:1.06,end:1.3},.1,50,[[1,1.2],[1.25,1.4]]);
assert.equal(r.count,2);
assert(Math.abs(r.rates[0]-10)<1e-8);
assert.equal(r.rates[2],null);
const partial=ratesFor([1.15],{start:1,end:1.3},.1,50,null,{start:1.1,end:1.2});
assert.equal(partial.count,null);
assert.deepEqual(partial.rates.map(n=>n==null?n:Math.round(n)),[undefined,10,undefined]);
if(!process.argv.includes("--browser")){console.log("PASS signal navigation, half-open counts and Hz bins");return;}

const {spawn}=require("node:child_process"), http=require("node:http"), os=require("node:os");
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fixture=`<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/styles/app.css"><link rel="stylesheet" href="/styles/workspace-presentation.css"><link rel="stylesheet" href="/styles/signal-workspace.css"><style>
body { margin:0; }
main { position:relative;width:min(900px,98vw);height:430px; }
</style></head><body><main><div id="sw"></div></main><script src="/scripts/activity-overview.js"></script><script src="/scripts/signal-workspace.js"></script><script>
window.v={visibleRange:{start:30,end:40},cursorTime:31,selectedInterval:null,selectedUnitId:null,expandedUnitId:null};
window.context={source:'recorded'};window.mediaCommands=0;
window.reads=0;
const apply=(p,options)=>{v={...v,...p};sw.setViewState(v);if(options?.historyRestore)window.lastRestore=options;if(options?.seekVideo||options?.historyRestore)mediaCommands++;};
window.sw=new NeuropixelsSignalWorkspace(document.querySelector('#sw'),{
 getView:()=>v,setView:apply,selectUnit:(id,{reveal=true,expandedUnitId=null}={})=>{
   sw.checkpoint();if(reveal&&id!=null)sw.focusUnit(id);const u=sw.unitById.get(id);
   apply({selectedUnitId:id,expandedUnitId,selectedRegion:u?.region??null,selectedShank:u?.shankId??null});},
 captureContext:()=>context,restoreContext:value=>{context=value;},
 onPatternQuery:(range,ids)=>window.pattern={range,ids},
 localSpikeWindows:()=>true,
 loadWindow:async({unitIds,start,end})=>{window.reads++;await new Promise(r=>setTimeout(r,window.readDelay||15));return new Map(unitIds.map(id=>[id,Float64Array.of(31.47,35.08,35.96,55.25).filter(t=>t>=start&&t<end)]));}
});
window.session={duration:1000,units:Array.from({length:100},(_,i)=>({id:i+1,shankId:0,depthUm:i*5,region:'R'+Math.floor(i/20)}))};
sw.setData(session,{recordingKey:'A'});
sw.setViewState(v);
</script></body></html>`;
async function main(){
  const server=http.createServer((req,res)=>{
    if(req.url==="/"){res.setHeader("Content-Type","text/html");res.end(fixture);return;}
    if(!["/scripts/activity-overview.js","/scripts/signal-workspace.js","/styles/signal-workspace.css","/styles/app.css","/styles/workspace-presentation.css"].includes(req.url)){res.writeHead(404).end();return;}
    res.setHeader("Content-Type",req.url.endsWith("css")?"text/css":"text/javascript");
    res.end(fs.readFileSync(path.join(__dirname,"..",req.url)));
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"neuro-signal-check-"));
  const executable=process.env.EVENT_ANALYSIS_CHROME||path.join(process.env.ProgramFiles||"C:/Program Files","Google/Chrome/Application/chrome.exe");
  const chrome=spawn(executable,["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{stdio:["ignore","ignore","pipe"],windowsHide:true});
  let ws;
  try {
    const port=await new Promise((resolve,reject)=>{let buffer="";const t=setTimeout(()=>reject(Error("Chrome startup")),20000);chrome.once("error",reject);chrome.stderr.on("data",b=>{buffer+=b;const match=buffer.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(t);resolve(match[1]);}});});
    const tab=(await(await fetch("http://127.0.0.1:"+port+"/json/list")).json()).find(t=>t.type==="page");
    ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    let seq=0;const jobs=new Map(),errors=[];
    ws.onmessage=e=>{const v=JSON.parse(e.data);if(v.id){const [resolve,reject]=jobs.get(v.id);jobs.delete(v.id);if(v.error)reject(Error(v.error.message));else resolve(v.result);}else if(v.method==="Runtime.exceptionThrown")errors.push(v.params.exceptionDetails.exception?.description);};
    const call=(method,params={})=>new Promise((r,j)=>{jobs.set(++seq,[r,j]);ws.send(JSON.stringify({id:seq,method,params}));});
    const ev=async expression=>{const v=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(v.exceptionDetails)throw Error(v.exceptionDetails.exception?.description);return v.result.value;};
    const wait=async expr=>{for(let i=0;i<120;i++){if(await ev(expr))return;await delay(30);}throw Error("Timed out "+expr);};
    const pos=(selector,frac,yFrac=.5)=>ev(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error(${JSON.stringify(selector)});const r=n.getBoundingClientRect();return {x:r.left+r.width*${frac},y:r.top+r.height*${yFrac}};})()`);
    const mouse=(type,p,mods=0)=>call("Input.dispatchMouseEvent",{type,...p,modifiers:mods,button:type==="mouseMoved"?"none":"left",buttons:type==="mouseReleased"?0:1,clickCount:type==="mouseMoved"?0:1});
    const click=async(s,frac=.5,mods=0)=>{const p=await pos(s,frac);await mouse("mousePressed",p,mods);await mouse("mouseReleased",p,mods);await delay(55);};
    const drag=async(s,frac,dx)=>{const p=await pos(s,frac),end={x:p.x+dx,y:p.y};await mouse("mousePressed",p);await mouse("mouseMoved",end);await delay(45);await mouse("mouseReleased",end);await delay(70);};
    const key=async(k,code,modifiers=0)=>{await call("Input.dispatchKeyEvent",{type:"keyDown",key:k,windowsVirtualKeyCode:code,modifiers});await call("Input.dispatchKeyEvent",{type:"keyUp",key:k,windowsVirtualKeyCode:code,modifiers});await delay(40);};
    await call("Runtime.enable");await call("Page.navigate",{url:"http://127.0.0.1:"+server.address().port});
    await wait("window.sw?.nodes?.get('u1')?.querySelector('canvas')?.getAttribute('aria-label')?.endsWith(' Hz')");
    const unit1='[data-unit="1"] canvas';
    const frame=()=>ev("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))");
    const paintsSpike=async(time)=>ev(`(()=>{const top=sw.viewport.scrollTop,h=sw.viewport.clientHeight,range=sw.range;
      const rows=sw.rows.filter(r=>r.id && r.top>=top && r.top+r.height<=top+h);
      return rows.length>0 && rows.every(row=>{const c=sw.nodes.get(row.key)?.querySelector('canvas');
        if(!c || !c.getAttribute('aria-label')?.endsWith(' Hz'))return false;
        const x=Math.round(Math.floor((${time}-range.start)*sw.markerArea.clientWidth/(range.end-range.start))*devicePixelRatio);
        const ctx=c.getContext('2d'),rate=ctx.getImageData(x,Math.round(28*devicePixelRatio),1,Math.round(24*devicePixelRatio)).data;
        return ctx.getImageData(x,Math.round(8*devicePixelRatio),1,1).data[3]>0 && rate.some((alpha,i)=>i%4===3 && alpha>0);});})()`);
    await ev("window.readDelay=300;apply({visibleRange:{start:47,end:57}});sw.tool('pan')");
    await frame();assert(await paintsSpike(55.25),"Keep exact spike marks while the neighboring window is being read");
    const hold=await pos(unit1,.6);await mouse("mousePressed",hold);
    for(const dx of [12,28,40,55]){
      await mouse("mouseMoved",{x:hold.x-dx,y:hold.y});await frame();
      assert(await paintsSpike(55.25),"Moving the time window must not clear the visible raster");
    }
    await key("Escape",27);await mouse("mouseReleased",hold);
    const probes=await ev("reads");
    for(const deltaY of [550,820,1250,540]){
      await call("Input.dispatchMouseEvent",{type:"mouseWheel",...await pos(".sw-viewport",.65),deltaX:0,deltaY});
      await frame();assert(await paintsSpike(55.25),"Fast vertical scrolling should already have exact spike times for newly exposed rows");
    }
    assert.equal(await ev("reads"),probes,"Scrolling through a cached probe window should not reread the same interval");
    await ev("window.readDelay=15;sw.viewport.scrollTop=0;apply({visibleRange:{start:30,end:40}});sw.tool('measure')");
    await wait("sw.nodes.has('u1')");await frame();
    const ink=(id,frac,yFrac=.2)=>ev(`(()=>{const c=sw.nodes.get('u'+${id}).querySelector('canvas');return c.getContext('2d').getImageData(Math.floor(c.width*${frac}),Math.floor(c.height*${yFrac}),1,1).data[3]})()`);
    const hover=async(frac,y)=>{await call("Input.dispatchMouseEvent",{type:"mouseMoved",...await pos(unit1,frac,y)});await delay(30);};
    await hover(.147,.2);
    assert.match(await ev("sw.tip.hidden?'':sw.tip.textContent"),/Unit 1.*31\.47 s/);
    await hover(.146,.75);
    assert.match(await ev("sw.tip.hidden?'':sw.tip.textContent"),/\[31\.4, 31\.5\) s.*1 spike.*10 Hz/);
    await ev("window.readDelay=180;apply({visibleRange:{start:30.1,end:40.1}})");
    await hover(.136,.75);
    await wait("!sw.tip.hidden && sw.tip.textContent.includes('31.4, 31.5')");
    await ev("window.readDelay=15;apply({visibleRange:{start:30,end:40}})");
    await wait("!sw.tip.hidden && sw.tip.textContent.includes('31.3, 31.4')");
    await ev("sw.viewport.focus()");await key("Escape",27);assert(await ev("sw.tip.hidden"));
    assert(await ev("sw.viewport.scrollHeight > sw.viewport.clientHeight*4"));
    await drag('[data-unit="1"] canvas',.2,80);
    assert(await ev("!!v.selectedInterval && v.cursorTime===31 && v.selectedUnitId===null"));
    await click("[data-sw-pattern]");
    assert.deepEqual(await ev("pattern.ids"),[1]);
    await click("[data-sw-clear]");
    await ev('sw.undo()');
    assert(await ev("v.selectedInterval.unitIds.join()=== '1' && lastRestore.seekVideo"));
    await ev('sw.redo()');
    assert(await ev("v.selectedInterval===null"));
    await click('[data-unit="1"] .sw-name');await click('[data-unit="2"] .sw-name',.5,2);
    assert.deepEqual((await ev("sw.selectedUnits()")).sort(),[1,2]);
    await ev("sw.locateUnit(85)");await wait("!sw.sticky.hidden && sw.sticky.querySelectorAll('[data-unit]').length===2");
    await wait("!!sw.nodes.get('u85')");
    assert(await ev("!sw.nodes.has('u1') && sw.viewport.scrollTop>0"));
    const initial=await ev("v.visibleRange.start");
    await drag('.sw-space [data-unit="85"] .sw-name',.65,-44);
    assert((await ev("v.visibleRange.start"))>initial);
    assert.deepEqual((await ev("sw.selectedUnits()")).sort(),[1,2]);
    const preserved=await ev("v.cursorTime");
    await drag('.sw-space [data-unit="85"] canvas',.26,60);
    assert(await ev("!!v.selectedInterval"));assert.equal(await ev("v.cursorTime"),preserved);
    await click("[data-sw-pattern]");assert.deepEqual(await ev("pattern.ids"),[85]);
    assert(await ev("sw.measure.querySelector('span').textContent.includes('Unit 85')"));
    assert(await ink(85,.30)>0 && await ink(86,.30)===0,"Only the source Unit row should show a brush");
    await drag('.sw-sticky [data-unit="1"] canvas',.26,60);
    await click("[data-sw-pattern]");assert.deepEqual(await ev("pattern.ids"),[1,2]);
    await ev("apply({selectedInterval:{start:32,end:33,unitIds:[84]}})");
    await click("[data-sw-pattern]");assert.deepEqual(await ev("pattern.ids"),[84]);
    assert(await ev("sw.measure.querySelector('span').textContent.includes('Unit 84')"));
    await ev("sw.viewport.focus()");await key("Escape",27);
    assert(await ev("v.selectedInterval===null && sw.selectedUnits().length===2"));
    await click(".sw-axis",.7);assert(Math.abs(await ev("v.visibleRange.end-v.visibleRange.start")-2)<1e-7);
    assert(await ev('sw.root.querySelector("[data-sw-legend]").textContent.includes("Firing rate") && sw.scaleText.textContent.includes("0.1 s/bin")'));
    const activeTop=await ev("sw.viewport.scrollTop");
    const wheel=async(s,dy)=>{await call("Input.dispatchMouseEvent",{type:"mouseWheel",...await pos(s,.5),deltaX:0,deltaY:dy});await delay(180);};
    await wheel(".sw-axis",-32);
    assert((await ev("v.visibleRange.end-v.visibleRange.start"))<2);
    assert.equal(await ev("sw.viewport.scrollTop"),activeTop);
    const zoomed=await ev("v.visibleRange.end-v.visibleRange.start");
    await wheel('.sw-space [data-unit="85"] canvas',85);
    assert((await ev("sw.viewport.scrollTop"))>activeTop);
    assert.equal(await ev("v.visibleRange.end-v.visibleRange.start"),zoomed);
    const scrolledTop=await ev("sw.viewport.scrollTop");
    await ev('sw.undo()');assert.equal(await ev("sw.viewport.scrollTop"),activeTop);
    await ev('sw.redo()');assert.equal(await ev("sw.viewport.scrollTop"),scrolledTop);
    await click(".sw-track",.5);assert(Math.abs(await ev("v.cursorTime")-500)<2);
    const beforeThumb=await ev("v.visibleRange.start");await drag(".sw-thumb",.5,70);
    assert((await ev("v.visibleRange.start"))>beforeThumb+10);
    assert(await ev("sw.sticky.querySelectorAll('button').length===2 && v.selectedUnitId===1"));
    await ev("sw.locateUnit(1)");await wait("sw.nodes.has('g0')");
    await click('[data-sw-group="g0"]');
    assert(await ev('sw.nodes.get("g0").textContent.includes("Last")'));
    const saved=await ev("sw.snapshot()");
    assert(saved.collapsed.includes("g0"));
    await ev("sw.setData(null); sw.setData(null); sw.setData(session,{recordingKey:'B'});apply({visibleRange:{start:30,end:40},cursorTime:35,selectedInterval:null,selectedUnitId:null,expandedUnitId:null})");
    assert(await ev("!sw.canUndo() && !sw.canRedo()"));await wait("sw.trains.has(1)");
    const name=await pos('[data-unit="1"] .sw-name',.4),nameDrag={x:name.x+9,y:name.y};
    await mouse("mousePressed",name);await mouse("mouseMoved",nameDrag);await key("Escape",27);
    await delay(320);await mouse("mouseReleased",nameDrag);
    assert(await ev("v.selectedUnitId===null && !sw.canUndo()"),"A late release after Escape must not select or expand the Unit");
    const tool=action=>click('[data-sw-tool="'+action+'"]');
    await tool("pan");await drag(unit1,.4,-65);
    assert(await ev("v.visibleRange.start>30 && !v.selectedInterval && v.cursorTime===35"));
    assert.equal(await ev("sw.history.index"),1);
    const p=await pos(unit1,.4), end={x:p.x+90,y:p.y},original=await ev("v.visibleRange");
    await mouse("mousePressed",p);await mouse("mouseMoved",end);
    assert.notDeepEqual(await ev("v.visibleRange"),original);
    await key("Escape",27);await mouse("mouseReleased",end);
    assert.deepEqual(await ev("v.visibleRange"),original);
    assert.equal(await ev("sw.history.index"),1);
    await tool("zoom");await drag(unit1,.4,100);
    assert(await ev("v.visibleRange.end-v.visibleRange.start<4 && !v.selectedInterval"));
    const zoomRange=await ev("v.visibleRange");
    await tool("home");assert.deepEqual(await ev("v.visibleRange"),{start:0,end:1000});
    await tool("undo");assert.deepEqual(await ev("v.visibleRange"),zoomRange);
    await tool("redo");assert.deepEqual(await ev("v.visibleRange"),{start:0,end:1000});
    await ev("sw.viewport.focus()");await key("z",90,2);
    assert.deepEqual(await ev("v.visibleRange"),zoomRange);
    await key("Z",90,2|8);assert.deepEqual(await ev("v.visibleRange"),{start:0,end:1000});
    await ev("sw.undo()");await tool("measure");await drag(unit1,.4,65);
    assert(await ev("!sw.canRedo() && sw.canUndo()"));
    const entries=await ev("sw.history.index");
    await wheel(".sw-axis",-12);await wheel(".sw-axis",-12);await wheel(".sw-axis",-12);
    assert.equal(await ev("sw.history.index"),entries+1);
    await ev("sw.axis.focus()");
    await call("Input.dispatchKeyEvent",{type:"keyDown",key:"ArrowRight",windowsVirtualKeyCode:39});
    await delay(550);
    for(let i=0;i<3;i++)await call("Input.dispatchKeyEvent",{type:"keyDown",key:"ArrowRight",windowsVirtualKeyCode:39,autoRepeat:true});
    await call("Input.dispatchKeyEvent",{type:"keyUp",key:"ArrowRight",windowsVirtualKeyCode:39});
    assert.equal(await ev("sw.history.index"),entries+2);
    await ev("for(let i=0;i<20;i++)apply({cursorTime:35+i})");
    assert.equal(await ev("sw.history.index"),entries+2);
    await ev("sw.checkpoint();context.source='video';sw.locateUnit(80)");
    await wait("sw.history.index==="+(entries+3));
    const foundTop=await ev("sw.viewport.scrollTop");
    await ev("sw.undo()");assert.equal(await ev("context.source"),"recorded");
    assert((await ev("sw.viewport.scrollTop"))<foundTop);
    await ev("sw.redo()");assert.equal(await ev("context.source"),"video");
    assert.equal(await ev("sw.viewport.scrollTop"),foundTop);
    await ev("sw.beginGesture();apply({cursorTime:2});apply({cursorTime:5});sw.endGesture({cancel:true})");
    assert.equal(await ev("v.cursorTime"),54);
    assert.equal(await ev("sw.history.index"),entries+3);
    const savedB=await ev("sw.snapshot()");
    const undoPosition=await pos('[data-sw-tool="undo"]',.5);
    assert(await ev("sw.setData(null);sw.setData(session,{recordingKey:'A'})"));
    assert.deepEqual(await ev("sw.snapshot()"),{...saved,context:savedB.context});
    const wholeA=await ev("sw.history.index");
    assert(await ev("!sw.history.entries[sw.history.index-1].before.collapsed.includes('g0')"),"A's latest entry must be the group collapse");
    await ev("sw.undo()");assert(await ev("!sw.collapsed.has('g0')"));
    assert.deepEqual(await pos('[data-sw-tool="undo"]',.5),undoPosition,"Updating selection text must leave the figure tools in place");
    await ev("sw.redo()");assert.equal(await ev("sw.history.index"),wholeA);
    assert(await ev("sw.setData(session,{recordingKey:'B'})"));
    assert.deepEqual(await ev("sw.snapshot()"),{...savedB,context:await ev("context")});
    await ev("sw.setData(session,{recordingKey:'C'});apply({visibleRange:{start:30,end:40},cursorTime:35,selectedInterval:{start:31,end:32},selectedUnitId:null,expandedUnitId:null})");
    await wait("sw.trains.has(1)");
    const rowButton=(id,target,mods=0,host='.sw-space',frac=.5)=>click(host+' [data-unit="'+id+'"] .sw-'+target,frac,mods);
    const pressed=sel=>ev("Array.from(document.querySelectorAll("+JSON.stringify(sel+" .sw-name[aria-pressed=true]")+")).map(n=>Number(n.closest('[data-unit]').dataset.unit))");
    const mediaBefore=await ev("mediaCommands");
    await rowButton(1,"meta",2);await rowButton(2,"count",2);await rowButton(3,"name",4,'.sw-space',.015);
    assert.deepEqual(await ev("sw.selectedUnits()"),[1,2,3]);assert.deepEqual(await pressed(".sw-space"),[1,2,3]);
    assert(await ev("!sw.root.querySelector('.sw-fold') && [...sw.nodes.values()].filter(n=>n.dataset.unit).every(n=>n.offsetHeight===60 && n.querySelectorAll('button').length===1)"));
    for(const theme of ["dark","light"]){
      const colors=await ev(`(()=>{document.documentElement.dataset.theme='${theme}';sw.render();
        return [1,2].map(id=>{const btn=sw.nodes.get('u'+id).querySelector('.sw-name'),s=getComputedStyle(btn);
          return {bg:s.backgroundColor,fg:s.color,rule:s.borderInlineStartStyle,role:btn.getAttribute('aria-description')};});})()`);
      const luminance=color=>color.match(/\d+(?:\.\d+)?/g).slice(0,3).map(n=>Number(n)/255)
        .map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);
      for(const card of colors){const [light,dark]=[luminance(card.fg),luminance(card.bg)].sort((a,b)=>b-a);assert((light+.05)/(dark+.05)>=4.5);}
      assert.notEqual(colors[0].bg,colors[1].bg);assert.equal(colors[0].rule,"solid");assert.equal(colors[1].rule,"double");
      assert.match(colors[0].role,/Primary Unit/);assert.match(colors[1].role,/Reference Unit/);
    }
    const cardRange=await ev("v.visibleRange");await drag('.sw-space [data-unit="2"] .sw-meta',.4,20);
    assert.deepEqual(await ev("sw.selectedUnits()"),[1,2,3]);assert.notDeepEqual(await ev("v.visibleRange"),cardRange);await tool("undo");
    assert.deepEqual(await ev("v.visibleRange"),cardRange);
    await ev("sw.locateUnit(83)");await wait("sw.stickyNodes.size===3");
    const pinnedTop=await ev("sw.viewport.scrollTop");
    const mediaAfterPan=await ev("mediaCommands");assert.equal(mediaAfterPan,mediaBefore);
    await rowButton(1,"count",0,".sw-sticky");
    assert(await ev("v.selectedUnitId===2 && v.expandedUnitId===null && sw.viewport.scrollTop==="+pinnedTop));
    assert.deepEqual(await pressed(".sw-sticky"),[2,3]);
    await ev("apply({cursorTime:37})");
    await ev("sw.undo()");await frame();assert(await ev("v.selectedUnitId===1 && v.cursorTime===37"));
    assert.deepEqual(await pressed(".sw-sticky"),[1,2,3]);
    await ev("sw.redo()");assert(await ev("v.selectedUnitId===2 && v.cursorTime===37"));
    await rowButton(3,"unit-title",0,".sw-sticky");assert(await ev("v.expandedUnitId===null && v.selectedUnitId===2"));
    await rowButton(2,"meta",2,".sw-sticky");
    assert(await ev("!sw.selectedUnits().length && sw.sticky.hidden && v.selectedUnitId===null && v.expandedUnitId===null && v.selectedRegion===null && v.selectedShank===null"));
    assert(await ev("document.activeElement===sw.viewport"),"Removing the last pinned Unit must keep keyboard focus in the viewer");
    assert.equal(await ev("sw.viewport.scrollTop"),pinnedTop);
    assert.deepEqual(await ev("v.selectedInterval"),{start:31,end:32});assert.deepEqual(await ev("v.visibleRange"),{start:30,end:40});
    assert.equal(await ev("mediaCommands"),mediaAfterPan);
    await ev("sw.locateUnit(1)");await wait("sw.nodes.has('u1')");
    await rowButton(1,"name");await rowButton(2,"name",4);await rowButton(2,"name",4);
    assert.deepEqual(await ev("sw.selectedUnits()"),[1]);
    await rowButton(2,"name",2);await rowButton(3,"name");
    assert.deepEqual(await ev("sw.selectedUnits()"),[3,2]);
    await ev("sw.options.selectUnit(2)");await wait("v.selectedUnitId===2 && !sw.extra.has(2) && !sw.root.classList.contains('sw-transition')");
    await ev("sw.nodes.get('u2').querySelector('.sw-name').focus()");
    await call("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",text:"\r",windowsVirtualKeyCode:13});
    await call("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
    assert.deepEqual(await ev("sw.selectedUnits()"),[]);
    const mainView=await ev("JSON.stringify(v)"),mediaBeforePicker=await ev("mediaCommands");
    await ev(`const host=document.createElement('main');document.body.prepend(host);
      window.picker=NeuropixelsSignalWorkspace.forUnitSelection(host,{recording:session,units:session.units,
        selectedIds:[3],initialView:v,loadWindow:sw.options.loadWindow,onChange:ids=>window.chosen=ids});`);
    await wait("picker.nodes.has('u1') && picker.trains.has(1)");
    await ev("picker.nodes.get('u1').querySelector('.sw-name').click()");
    assert.deepEqual(await ev("chosen"),[3,1]);
    await ev("picker.nodes.get('u3').querySelector('.sw-name').click();picker.panByFraction(.25)");
    assert.deepEqual(await ev("chosen"),[1]);
    assert.notDeepEqual(await ev("picker.view.visibleRange"),await ev("v.visibleRange"));
    await ev("picker.setPickedUnits([2]);picker.destroy()");
    assert(await ev("!picker.root.isConnected"));
    assert.equal(await ev("JSON.stringify(v)"),mainView);assert.equal(await ev("mediaCommands"),mediaBeforePicker);
    assert.deepEqual(errors,[]);console.log("PASS Chrome: spikes and rates, reversible signal navigation, and independent analysis Unit selection");
  }finally{ws?.close();chrome.kill();server.close();await delay(450);try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:4,retryDelay:150});}catch{/* Chrome may retain a process lock briefly. */}}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
