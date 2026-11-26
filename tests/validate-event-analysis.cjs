// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict'), E=require('../scripts/event-analysis-core.js');
const A=require('../scripts/annotation-core.js'), {TimeMapping}=require('../scripts/video-sync.js');
const {readAllenEvents,readAllen}=require('../scripts/browser-nwb-worker.js');
const core=require('../scripts/kilosort-core.js'),{pack,unpack}=require('../scripts/browser-storage.js');
let checks=0;const test=(name,fn)=>{fn();checks++;};
const event=(id,start,extra={})=>({id,sourceId:id,sourceKind:'experiment',kind:'point',type:'change',start,end:null,...extra});
const set=events=>({schema:E.SCHEMA,recordingId:'rec',timebase:'neural_seconds',events});
const opts={recordingId:'rec',start:-1,end:1,binWidth:.5,coverage:[[0,5]]};
const trains=[{unitId:5,spikes:[0,.5,1,1.5,2,2.5,3,3.5,4]},{unitId:9,spikes:[.1,1.2,1.2,3.8]}];
const events=set([event('a',1),event('b',3)]);
test('source and identity validation',()=>{assert.equal(E.validateEventSet(events,'rec'),events);assert.throws(()=>E.validateEventSet(events,'other'),/different recording/);assert.throws(()=>E.validateEventSet(set([event('a',1),event('a',2)])),/Duplicate/);assert.throws(()=>E.validateEventSet({...events,timebase:'video_seconds'}),/timebase/);});
test('finite event and interval validation',()=>{for(const value of [NaN,Infinity,-1])assert.throws(()=>E.validateEventSet(set([event('x',value)])));assert.throws(()=>E.validateEventSet(set([event('x',1,{kind:'interval',end:1})])));});
const response=E.computeResponses(trains,events,opts);
test('exact half-open bins and independent reference',()=>{
  assert.deepEqual(response.shape,[2,2,4]);assert.deepEqual(Array.from(response.counts.slice(0,8)),Array(8).fill(1));
  for(let u=0;u<2;u++)for(let e=0;e<2;e++)for(let b=0;b<4;b++){
    const lo=events.events[e].start-1+b*.5,hi=lo+.5;
    assert.equal(response.counts[(u*2+e)*4+b],trains[u].spikes.filter(t=>t>=lo&&t<hi).length);
  }
  for(let u=0;u<2;u++)for(let b=0;b<4;b++)assert.equal(response.rateHz[u*4+b],response.counts[(u*2)*4+b]+response.counts[(u*2+1)*4+b]);
});
test('input immutability and provenance',()=>{const before=JSON.stringify({trains,events,opts});E.computeResponses(trains,events,opts);assert.equal(JSON.stringify({trains,events,opts}),before);assert.deepEqual(response.unitIds,[5,9]);assert.deepEqual(response.eventIds,['a','b']);});
test('missing coverage is not silence',()=>{assert.throws(()=>E.computeResponses(trains,events,{...opts,coverage:undefined}),/Explicit recording coverage/);const r=E.computeResponses(trains,events,{...opts,coverage:[[.5,5]]});assert.deepEqual(r.eventIds,['b']);assert.equal(r.excludedEvents[0].reason,'incomplete_recording_coverage');});
test('coverage gaps and validation',()=>{assert.throws(()=>E.computeResponses(trains,events,{...opts,coverage:[[0,1.5],[2.5,5]]}),/No events/);assert.throws(()=>E.computeResponses(trains,events,{...opts,coverage:[[0,4],[3,5]]}),/non-overlapping/);});
test('filters and empty selection',()=>{const tagged=set([event('a',1,{conditions:{active:true}}),event('b',3,{conditions:{active:false}})]);assert.deepEqual(E.computeResponses(trains,tagged,{...opts,activeOnly:true}).eventIds,['a']);assert.throws(()=>E.computeResponses(trains,events,{...opts,eventType:'absent'}),/No events/);});
test('invalid bin and memory requests',()=>{for(const binWidth of [0,-1,NaN,.3])assert.throws(()=>E.computeResponses(trains,events,{...opts,binWidth}));assert.throws(()=>E.computeResponses(trains,events,{...opts,maxCells:1}),/memory limit/);});
test('spike sorting and identity',()=>{assert.throws(()=>E.computeResponses([{unitId:5,spikes:[2,1]}],events,opts),/sorted/);assert.throws(()=>E.computeResponses([{unitId:5,spikes:[NaN]}],events,opts),/spike/);assert.throws(()=>E.computeResponses([trains[0],trains[0]],events,opts),/duplicate Unit/);});
test('timestamp precision cannot silently collapse bins',()=>{assert.throws(()=>E.computeResponses([{unitId:1,spikes:[]}],set([event('large',1e16)]),{...opts,coverage:[[0,2e16]]}),/timestamp resolution/);});
test('adjacent coverage intervals form a continuous domain',()=>{assert.equal(E.computeResponses(trains,events,{...opts,coverage:[[0,1],[1,5]]}).eventIds.length,2);});
test('zero-spike Unit retained',()=>{const r=E.computeResponses([{unitId:12,spikes:[]}],events,opts);assert.equal(r.counts.reduce((a,b)=>a+b,0),0);assert.deepEqual(r.unitIds,[12]);});
const doc=A.create({key:'rec/video',videoName:'mouse.mp4',videoSize:42,duration:10});
doc.segments=[{id:'a',start:1,end:2,subject:'mouse',track:'behavior',runId:null},{id:'b',start:4,end:5,subject:'mouse',track:'behavior',runId:null}];
doc.schemes[0].labels={a:'groom',b:'groom'};doc.schemes[0].reviewed={a:true,b:false};
const mapping=new TimeMapping({method:'manual_offset',offset_s:2,scale:1,verification_status:'unverified'});
const annotationOptions={recordingId:'rec',label:'groom'};
test('annotation identity labels review and mapping',()=>{const s=E.fromAnnotations(doc,mapping,annotationOptions);assert.equal(s.events.length,1);assert.equal(s.events[0].start,3);assert.equal(s.events[0].end,4);assert.equal(s.events[0].sourceId,'a');assert.equal(s.events[0].schemeId,'default');assert.equal(s.excluded[0].reason,'unreviewed');assert.equal(s.source.timeMapping.verification_status,'unverified');});
test('review opt-in and active scheme',()=>{assert.equal(E.fromAnnotations(doc,mapping,{...annotationOptions,reviewedOnly:false}).events.length,2);const copy=structuredClone(doc);copy.schemes.push({id:'second',name:'second',labels:{a:'rest'},mappings:{},reviewed:{a:true},groups:{}});copy.activeSchemeId='second';assert.equal(E.fromAnnotations(copy,mapping,annotationOptions).events.length,0);assert.equal(E.fromAnnotations(copy,mapping,{recordingId:'rec',label:'rest'}).events[0].schemeId,'second');});
test('frame clock does not extrapolate',()=>{const m=new TimeMapping({method:'frame_timestamps',offset_s:0,scale:1,verification_status:'verified',provenance:{frame_clock:{video_s:[1,2],neural_s:[10,12]}}});const s=E.fromAnnotations(doc,m,{...annotationOptions,reviewedOnly:false});assert.equal(s.events.length,1);assert.equal(s.events[0].start,10);assert.equal(s.excluded[0].reason,'outside_time_mapping');});
test('subject track filters',()=>{assert.equal(E.fromAnnotations(doc,mapping,{...annotationOptions,subject:'other'}).events.length,0);assert.equal(E.fromAnnotations(doc,mapping,{...annotationOptions,track:'other'}).events.length,0);});
const features={shape:[5,2,4],unitIds:[10,11,12,13,14],rateHz:new Float64Array([0,0,2,3,0,0,4,6,3,2,0,0,6,4,0,0,1,1,1,1])};
test('seeded shape clusters exclude constant curves',()=>{const a=E.clusterResponses(features,{k:2,seed:7}),b=E.clusterResponses(features,{k:2,seed:7});assert.deepEqual(a,b);assert.equal(a.labels[0],a.labels[1]);assert.equal(a.labels[2],a.labels[3]);assert.notEqual(a.labels[0],a.labels[2]);assert.deepEqual(a.excludedUnits,[{unitId:14,reason:'constant_response'}]);assert.equal(a.converged,true);});
test('cluster constraints',()=>{assert.throws(()=>E.clusterResponses(features,{k:3}),/distinct/);assert.throws(()=>E.clusterResponses(features,{k:0}),/Cluster count/);assert.throws(()=>E.clusterResponses(features,{k:2,seed:NaN}),/seed/);assert.throws(()=>E.clusterResponses(features,{k:2,normalization:'invalid'}),/normalization/);});
function group(values){return {get:name=>values[name],keys:()=>Object.keys(values)};}
function col(value){return {value,shape:[value.length]};}
const tables=group({images:group({id:col([70,71,72]),start_time:col([1,3,4]),stop_time:col([1.25,3.25,4.25]),active:col([true,false,true]),is_change:col([true,true,false]),omitted:col([false,false,true]),image_name:col(['a','b','omitted'])}),bad:group({id:col([1]),start_time:col([NaN])}),trials:group({id:col([90]),start_time:col([2]),stop_time:col([3]),is_change:col([true])})});
const mock=group({intervals:tables});
const imported=readAllenEvents(mock,'rec','session');
test('Allen lick sensor rows retain point times and identity without an intervals table',()=>{
  const path='processing/licking/licks/timestamps';
  const file=group({[path]:{shape:[3],value:[0,4.25,NaN]}});
  const set=readAllenEvents(file,'rec','session');
  E.validateEventSet(set,'rec');
  assert.deepEqual(set.events.map(e=>[e.type,e.kind,e.start,e.end,e.sourceId,e.sourceTable]),[
    ['lick','point',0,null,'0',path],['lick','point',4.25,null,'1',path]]);
  assert.equal(set.excluded[0].reason,'invalid_timestamp');
});
test('NWB source rows and conditions retained',()=>{E.validateEventSet(imported,'rec');assert.equal(imported.events.length,4);assert.equal(imported.events[0].id,'images:70:0');assert.equal(imported.events[0].conditions.active,true);assert.equal(imported.events[1].conditions.active,false);assert.equal(imported.events[2].type,'omission');assert.equal(imported.excluded[0].reason,'invalid_interval');assert.equal(imported.coverage,null);assert.equal(imported.events[3].type,'trials','Trial start must never masquerade as image-change time');});
test('NWB without events remains supported',()=>{assert.equal(readAllenEvents(group({}),'rec','session').events.length,0);});
(async()=>{
  const {npy}=require('../scripts/browser-nwb-worker.js'),vm=require('node:vm');
  const pair={spikeTimes:new Blob([npy(new Float64Array([0,1,1.5,2,3]),'<f8')]),spikeClusters:new Blob([npy(new Int32Array([5,5,9,5,9]),'<i4')])};
  const progress=[],selected=await core.readSelectedUnitTrains(pair,1,[9,5,12],{chunkRows:2},p=>progress.push(p));
  assert.deepEqual(selected,[{unitId:9,spikes:[1.5,3]},{unitId:5,spikes:[0,1,2]},{unitId:12,spikes:[]}]);assert.equal(progress.length,3);checks++;
  await assert.rejects(core.readSelectedUnitTrains(pair,1,[5,5]),/selection/);
  await assert.rejects(core.readSelectedUnitTrains(pair,1,[5],{maxSelectedSpikes:2}),/memory limit/);
  await assert.rejects(core.readSelectedUnitTrains({...pair,spikeTimes:pair.spikeTimes.slice(0,-1)},1,[5]),/truncated/);
  await assert.rejects(core.readSelectedUnitTrains({...pair,spikeTimes:new Blob([npy(new Float64Array([0,2,1,2,3]),'<f8')])},1,[5]),/sorted/);checks++;
  const messages=[],context={self:{postMessage:m=>messages.push(m)},TextDecoder,console};
  vm.runInNewContext(core.createEventWorkerSource(E.workerSource()),context);
  await context.self.onmessage({data:{files:pair,sampleRate:1,unitIds:[5,9],events,options:opts,retainTrains:true,limits:{chunkRows:2}}});
  assert(!messages.at(-1).error,messages.at(-1).error);assert.deepEqual(Array.from(messages.at(-1).response.counts),Array.from(E.computeResponses(selected.slice(0,2).reverse(),events,opts).counts));checks++;
  const cached=messages.at(-1),reference=cached.response;
  assert.deepEqual(Array.from(cached.trains,([id,times])=>[id,Array.from(times)]),[[5,[0,1,2]],[9,[1.5,3]]]);checks++;
  const fit={k:2,seed:7,normalization:'shape'};
  await context.self.onmessage({data:{operation:'group',reference:{shape:reference.shape,unitIds:reference.unitIds,rateHz:reference.rateHz,binEdges:reference.binEdges,parameters:reference.parameters},clusters:fit,traceUnitId:9}});
  assert.deepEqual(Array.from(messages.at(-1).clusters.labels),E.clusterResponses(reference,fit).labels);
  assert(messages.some(m=>m.progress?.stage==='cluster' && m.progress?.unitId===9));
  assert(!messages.at(-1).response);checks++;
  await context.self.onmessage({data:{files:pair,sampleRate:1,unitIds:[5,9],events,options:{...opts,coverage:undefined}}});assert.match(messages.at(-1).error,/Explicit recording coverage/);checks++;
  const electrodes=group({id:col([100]),probe_id:col([1]),probe_horizontal_position:col([0]),probe_vertical_position:col([20]),location:col(['VISp'])});
  const units=group({id:col([5,9]),spike_times_index:col([3,5]),peak_channel_id:col([100,100]),quality:col(['good','good']),spike_times:{shape:[5],slice:range=>new Float64Array([.1,1,2,1.5,4].slice(range[0][0],range[0][1]))}});
  const file=group({'general/institution':col('Allen Institute for Brain Science'),'general/extracellular_ephys/electrodes':electrodes,units,'general/devices':group({probeC:{attrs:{probe_id:col(1),sampling_rate:col(1000)}}}),identifier:col('session'),intervals:tables});
  const r=await readAllen(file,'probeC');const eventAsset=r.files.find(f=>f.name==='explorer-events.json');assert(eventAsset);E.validateEventSet(JSON.parse(eventAsset.data),'allen-session-probeC');checks++;
  const files=r.files.map(a=>{const f=new File([a.data],a.name);Object.defineProperty(f,'relativePath',{value:a.path});return f;});
  const groups=core.groupExperimentFiles(files),indexed=await core.indexExperiment(groups[0]);assert(indexed.eventsFile);assert.equal(indexed.capabilities.events,true);checks++;
  const assets=files.map(f=>({path:core.pathOf(f),name:f.name,blob:f}));const restored=await unpack(pack({id:'event-test',name:'Event fixture'},assets,{}));
  assert.equal(await restored.assets.find(a=>a.name==='explorer-events.json').blob.text(),eventAsset.data);checks++;
  console.log(JSON.stringify({status:'PASS',checks,scope:'event/annotation adapters, explicit coverage, half-open counts, deterministic response clustering, NWB import and event asset roundtrip'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
