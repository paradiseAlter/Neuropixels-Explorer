// SPDX-License-Identifier: MIT
// Synthetic integration QA, not scientific evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../scripts/kilosort-core.js'),D=require('../scripts/population-dynamics-core.js'),E=require('../scripts/event-analysis-core.js'),{npy}=require('../scripts/browser-nwb-worker.js');
const series=[];for(let bin=0;bin<100;bin++)for(let unit=0;unit<3;unit++)for(let j=0;j<(bin*(unit+1)+unit*3)%7;j++)series.push([bin+.05+.1*j,unit+1]);series.sort((a,b)=>a[0]-b[0]);
const files={spikeTimes:new Blob([npy(Float64Array.from(series,x=>x[0]),'<f8')]),spikeClusters:new Blob([npy(Int32Array.from(series,x=>x[1]),'<i4')])};
(async()=>{
  const range=[20,80],ids=[1,2,3],trains=await core.readSelectedUnitTrains(files,1,ids,{timeRange:range,chunkRows:37});
  assert.deepEqual(trains,ids.map(unitId=>({unitId,spikes:series.filter(([t,id])=>id===unitId&&t>=20&&t<80).map(x=>x[0])})));
  const unbounded=await core.readSelectedUnitTrains(files,1,ids);assert.equal(unbounded.reduce((n,t)=>n+t.spikes.length,0),series.length);
  await assert.rejects(core.readSelectedUnitTrains(files,1,ids,{timeRange:[1,1]}),/range/);
  await assert.rejects(core.readSelectedUnitTrains(files,1,ids,{timeRange:[-1,1]}),/range/);
  const broken={...files,spikeTimes:new Blob([npy(Float64Array.from([...series.slice(0,-1).map(x=>x[0]),-1]),'<f8')])};
  await assert.rejects(core.readSelectedUnitTrains(broken,1,ids,{timeRange:range}),/sorted/,'Out-of-window source corruption must not be skipped');
  const options={recordingId:'fixture',start:20,end:80,binWidth:1,coverage:null};
  const messages=[],context={self:{postMessage:m=>messages.push(m)},TextDecoder,console};vm.runInNewContext(core.createPopulationDynamicsWorkerSource(D.workerSource()),context);
  await context.self.onmessage({data:{files,sampleRate:1,unitIds:ids,options,limits:{chunkRows:37}}});
  assert(!messages.at(-1).error,messages.at(-1).error);assert.deepEqual(JSON.parse(JSON.stringify(messages.at(-1).result)),D.run(trains,options));assert(messages.some(m=>m.progress?.phase==='reading-spikes'));assert(messages.some(m=>m.progress?.stage==='fit_line'));
  await context.self.onmessage({data:{files,sampleRate:1,unitIds:[1],options}});assert.match(messages.at(-1).error,/2 and 512/);
  const win={NeuropixelsPopulationDynamics:D,NeuropixelsEventAnalysis:E,NeuropixelsEventAnalysisStorage:{},NeuropixelExplorerCore:core};vm.runInNewContext(fs.readFileSync('scripts/population-dynamics-ui.js','utf8'),{window:win});
  const proto=win.NeuropixelsPopulationDynamicsUI.prototype,ui={state:{activeRecording:{key:'fixture'}},t:x=>x,coverage:null};
  assert.equal(proto.coverageFor.call(ui,ids).origin,'unknown');
  ui.coverage={schema:'neuropixels-recording-coverage/1',timebase:'neural_seconds',recordingId:'fixture',source:{kind:'NWB.units.obs_intervals',status:'source-reported'},units:[{unitId:1,intervals:[[0,40],[50,100]]},{unitId:2,intervals:[[10,90]]}]};
  const partial=proto.coverageFor.call(ui,ids);assert.equal(partial.origin,'source-reported-partial-unit-intersection');assert.deepEqual(JSON.parse(JSON.stringify(partial.intervals)),[[10,40],[50,90]]);assert.deepEqual(Array.from(partial.missingUnitIds),[3]);
  assert.equal(proto.coverageFor.call(ui,[1,2]).origin,'source-reported-unit-intersection');
  const good=structuredClone(ui.coverage);
  for(const units of [[],[{unitId:99,intervals:[[0,1]]}]]){ui.coverage={...good,units};assert.equal(proto.coverageFor.call(ui,ids).origin,'unknown');}
  for(const bad of [{unitId:'1',intervals:'invalid'},{unitId:99,intervals:'invalid'},{unitId:99,intervals:[]},{unitId:99,intervals:[[2,1]]},{unitId:99,intervals:[[0,2],[1,3]]},{unitId:99,intervals:[[NaN,3]]},null]){
    for(const units of [[bad],[...good.units,bad]]){ui.coverage={...good,units};assert.throws(()=>proto.coverageFor.call(ui,ids));}
  }
  ui.coverage={...good,units:[...good.units,good.units[0]]};assert.throws(()=>proto.coverageFor.call(ui,ids),/duplicate/);
  for(const excluded of [[{reason:'unsupported_observation_interval_shape'}],[{reason:'invalid_observation_interval_index'}],[{unitId:3,reason:'invalid_observation_intervals'}]]){ui.coverage={...good,units:[],excluded};assert.throws(()=>proto.coverageFor.call(ui,ids),/invalid observation metadata/);}
  for(const excluded of [[{reason:'invalid_observation_intervals',unitId:'1'}],[{reason:'invalid_observation_intervals'}],[{reason:'other',unitId:null}],[{reason:'other',unitId:1.5}]]){ui.coverage={...good,units:[],excluded};assert.throws(()=>proto.coverageFor.call(ui,ids),/Invalid coverage exclusions/);}
  ui.coverage={...good,excluded:[{unitId:99,reason:'invalid_observation_intervals'}]};assert.equal(proto.coverageFor.call(ui,ids).sourceExcluded[0].unitId,99);
  ui.coverage={...good};
  const warning={textContent:''};const warningUI={...ui,dialog:{querySelector:()=>warning},ids:()=>ids,coverageFor:()=>{throw Error('Invalid or duplicate coverage Unit');},t:x=>x};
  proto.warnings.call(warningUI);assert.match(warning.textContent,/errorCoverage.*Invalid or duplicate/);assert.notEqual(warning.textContent,'unknown');
  ui.coverage.recordingId='wrong';assert.throws(()=>proto.coverageFor.call(ui,ids),/errorCoverage/);
  const app=fs.readFileSync('scripts/app.js','utf8'),index=fs.readFileSync('scripts/explorer-shell.html','utf8');
  const binding=app.match(/populationDynamics = (bindWorkspaceAnalysis\('dynamics',[\s\S]*?\n  \}\)\));/);
  assert(binding,'The app must register a population dynamics workspace');
  const sourceCalls=[],recording={key:'recording-A'};
  const harness={window:{NeuropixelsPopulationDynamicsUI:proto.constructor},
    bindWorkspaceAnalysis:(kind,Type,target,options)=>({kind,Type,target,options}),recordingAnalysisUnits:()=>[],
    returnToAnalysisSource:async(...args)=>{sourceCalls.push(args);return true;},signalWorkspace:{checkpoint:()=>sourceCalls.push('checkpoint')},
    setExperimentView:(view,options)=>sourceCalls.push([view,options])};
  const wired=vm.runInNewContext(binding[1],harness);
  assert.equal(wired.Type,proto.constructor);assert.equal(wired.target,null);
  await wired.options(recording,'camera-B').returnToSource([20,21]);
  assert.deepEqual(JSON.parse(JSON.stringify(sourceCalls)),[[recording,null,'camera-B'],'checkpoint',[{cursorTime:20,visibleRange:{start:19,end:22},selectedInterval:{start:20,end:21}},{seekVideo:true}]]);
  sourceCalls.length=0;harness.returnToAnalysisSource=async()=>false;
  await wired.options(recording,'closed-camera').returnToSource([20,21]);assert.deepEqual(sourceCalls,[]);
  assert(index.includes('id="event-figures-button"'));assert(!index.includes('id="population-dynamics-button"'));
  assert(fs.readFileSync('scripts/analysis-tabs.js','utf8').includes("'dynamics'"));
  for(const p of ['core','storage','ui'])assert(index.includes(`scripts/population-dynamics-${p}.js`));
  const collect=app.match(/  function recordingAnalysisUnits\(\) \{([\s\S]*?)\n  \}/);assert(collect);
  const catalog=[{id:0,quality:'good'},{id:1,quality:'good'},{id:2,quality:'unknown'}],state={activeRecording:{},activeActivityOverview:{units:[{id:1,count:4},{id:3,count:2}]}};
  const collectContext={state,recordingUnits:()=>catalog};vm.runInNewContext('collect=function(){'+collect[1]+'};',collectContext);
  assert.deepEqual(JSON.parse(JSON.stringify(collectContext.collect())),[{id:0,quality:'good'},{id:1,quality:'good',count:4},{id:2,quality:'unknown'},{id:3,count:2}]);
  assert(app.includes('getUnits:recordingAnalysisUnits,'));
  const silent=await core.readSelectedUnitTrains(files,1,[1,2,3,0],{timeRange:range});assert.deepEqual(silent[3],{unitId:0,spikes:[]});const withSilent=D.run(silent,options);assert(withSilent.counts.every(row=>row[3]===0));assert(withSilent.excludedUnits.some(u=>u.unitId===0&&u.reason==='constant_in_training'));
  console.log(JSON.stringify({status:'PASS',checks:26,scope:'bounded reader, unchanged event reading, full-source validation, real Worker serialization, partial/unknown source coverage, main-app wiring'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
