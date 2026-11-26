"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { distributionGeometry, MiniProbe } = require("../scripts/mini-probe.js");
const { ActivityAnatomyCanvas } = require("../scripts/activity-overview.js");
const regionCore = require("../scripts/region-core.js");
const emptyGuide = MiniProbe.regionInputs('zh-CN');
assert.match(emptyGuide,/先导入记录/);
assert.doesNotMatch(emptyGuide,/data-import-table=/);
const unitGuide = MiniProbe.regionInputs('zh-CN',{key:'Exp1'},true,false,['direct']);
assert.match(unitGuide,/data-import-table="direct" data-import-recording-key="Exp1" open/);
assert.doesNotMatch(unitGuide,/trackDirect/);
const trackGuide = MiniProbe.regionInputs('zh-CN',{key:'Exp1'},false,true);
assert.match(trackGuide,/data-import-table="trackDirect"/);
const snippets = [unitGuide,trackGuide].map((guide,i)=>new File([guide.replaceAll('<wbr>','').match(/<pre>([^<]*)<\/pre>/)[1]],i+'.csv'));
assert.equal(MiniProbe.regionInputs('en',{jointSources:['A','B']}),'');
const units = [
  { id: 1, depthUm: 0, rateHz: 0, spikeCount: 0 },
  { id: 2, depthUm: 100, rateHz: 8, spikeCount: 16 },
  { id: 3, depthUm: null, rateHz: 4, spikeCount: 8 }
];
const before = JSON.stringify(units), vertical = distributionGeometry(units), horizontal = distributionGeometry(units, true);
assert.equal(vertical.points.length, 2, "Missing positions must not be plotted at zero depth");
assert.equal(vertical.points[0].y, vertical.bottom);
assert.equal(vertical.points[1].y, vertical.top);
assert.equal(vertical.points[1].x, vertical.right);
assert.equal(horizontal.points[0].x, horizontal.left);
assert.equal(horizontal.points[1].x, horizontal.right);
assert.equal(horizontal.points[1].y, horizontal.top);
assert.deepEqual(horizontal.points.map(u=>[u.id,u.spikeCount,u.rateHz]),vertical.points.map(u=>[u.id,u.spikeCount,u.rateHz]));
assert.equal(JSON.stringify(units), before);
for (const input of [[],[{id:1,depthUm:20,rateHz:0}]]) {
  for(const orientation of [false,true]) {
    const g=distributionGeometry(input,orientation);
    assert(g.maxRate>0);
    assert(g.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  }
}
// Use the real mapped-clip selection, verifying that a neural selection does not
// open annotation mode or clear an expanded Unit or write the annotation document.
const sandbox={window:{},document:{documentElement:{lang:"en"}},console};
vm.runInNewContext(fs.readFileSync(require.resolve("../scripts/annotation-ui.js"),"utf8"),sandbox);
const ui=Object.create(sandbox.window.NeuropixelsAnnotationUI.AnnotationController.prototype);
ui.doc={segments:[{id:"walk",start:1,end:3,subject:"mouse",track:"behavior"}]};
const saved=JSON.stringify(ui.doc);let view={expandedUnitId:7};
ui.video={mapping:{videoToNeural:t=>t+2},pause(){}};
ui.getRecording=()=>({duration:100});ui.render=()=>{};ui.setView=p=>{view={...view,...p};};
ui.select("walk",{openEditor:false});
assert.equal(ui.opened,undefined);assert.equal(view.expandedUnitId,7);
assert.equal(view.selectedInterval.start,3);assert.equal(view.selectedInterval.end,5);
assert.equal(JSON.stringify(ui.doc),saved);
ui.select("walk");assert.equal(ui.opened,true,"Video clip selection keeps its existing editor behavior");
ui.getView=()=>view;
view.visibleRange={start:2.5,end:3.5};
ui.select("walk",{openEditor:false,preserveWindow:true});
assert.deepEqual(view.visibleRange,{start:2.5,end:3.5});
view.visibleRange={start:70,end:72};
ui.select("walk",{openEditor:false,preserveWindow:true});
assert.equal(view.visibleRange.start,2);assert.equal(view.visibleRange.end,4);
// Neural strip selects the exact clip ID, clips only its display extent, and
// does not rebuild focused controls on playback ticks.
const previous=global.document;
try {
  global.document={createElement:()=>({style:{setProperty(){}},setAttribute(k,v){this[k]=v;}})};
  const canvas=Object.create(ActivityAnatomyCanvas.prototype);let selected;
  const children=[];canvas.behaviorStrip={replaceChildren(){children.length=0;},append(c){children.push(c);}};
  canvas.annotations=[{id:"walk",label:"walk",start:3,end:5,color:"#123456"}];
  canvas.state={visibleRange:{start:4,end:8},selectedInterval:{start:3,end:5}};
  canvas.callbacks={onAnnotationSelect:id=>{selected=id;}};
  canvas._drawBehaviorStrip();assert.equal(children.length,1);
  assert.equal(children[0].style.left,"0%");assert.equal(children[0].style.width,"25%");
  assert.equal(children[0]["aria-pressed"],"true");children[0].onclick();assert.equal(selected,"walk");
  const button=children[0];canvas.state.cursorTime=7;canvas._drawBehaviorStrip();assert.equal(children[0],button);
} finally { if(previous===undefined)delete global.document;else global.document=previous; }
async function checkRequests() {
  const imported=await regionCore.scanFiles(snippets);
  assert.equal(imported.mapping.get('1::7').region,'CA1');
  assert.equal(imported.probeTrack.rowCount,2);
  const original={fetch:global.fetch,setTimeout:global.setTimeout,clearTimeout:global.clearTimeout};
  const timers=[], responses=[];let requests=0, renders=0;
  const status={dataset:{},removeAttribute(){}}, list={replaceChildren(){}}, distribution={}, toggle={setAttribute(){}};
  const panel={querySelector:s=>s==='[data-interval-status]'?status:s==='[data-rates]'?list:distribution};
  const probe=Object.create(MiniProbe.prototype);
  probe.host={querySelector:s=>s==='.probe-interval'?panel:s==='[data-probe-expand]'?toggle:null,querySelectorAll:()=>[]};
  probe.expanded=true;probe.recording={databaseId:'record-a'};probe.view={selectedInterval:{start:0,end:1}};
  probe.renderDistribution=()=>{renders++;};
  try {
    global.setTimeout=fn=>{timers.push(fn);return timers.length;};global.clearTimeout=()=>{};
    global.fetch=()=>{requests++;return new Promise(resolve=>responses.push(resolve));};
    probe.updateInterval();const first=timers.shift()();
    probe.view.selectedInterval={start:2,end:3};probe.updateInterval();const second=timers.shift()();
    responses.shift()({ok:true,json:async()=>({tag:'stale'})});await first;
    assert.equal(renders,0,'A stale response must never update the Probe');
    responses.shift()({ok:true,json:async()=>({tag:'current'})});await second;
    assert.equal(probe.result.tag,'current');assert.equal(renders,1);
    probe.intervalKey=null;probe.updateInterval();assert.equal(requests,2,'Unit/overview rebuild reuses exact results');
    assert.equal(renders,2);
    // Start a new request, then return to the last interval before it completes.
    probe.view.selectedInterval={start:4,end:5};probe.updateInterval();
    probe.view.selectedInterval={start:2,end:3};probe.updateInterval();
    assert.equal(probe.resultKey,null,'Cleared results must not leave an apparently valid cache key');
    assert.equal(status.textContent.startsWith('Calculating'),true);
  } finally { Object.assign(global,original); }
}
checkRequests().then(()=>console.log("PASS: chart axes and exact values; missing/zero depth; mapped selection and retained focus; strip identity; stale requests and cache reuse")).catch(error=>{console.error(error);process.exitCode=1;});
