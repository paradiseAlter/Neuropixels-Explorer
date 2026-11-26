// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../scripts/event-analysis-core.js'),A=require('../scripts/annotation-core.js'),P=require('../scripts/event-analysis-storage.js');
const {TimeMapping}=require('../scripts/video-sync.js');
const copy=x=>JSON.parse(JSON.stringify(x));
let checks=0;async function test(name,fn){await fn();checks++;}
const context={key:'rec/video',recordingKey:'rec',videoName:'fixture.mp4',duration:20};
const mapping=offset=>new TimeMapping({method:'manual_offset',offset_s:offset,scale:1,verification_status:'unverified'});
const fresh=A.add(A.create(context),{start:2,end:3,label:'walking'});
const annotation=E.fromAnnotations(fresh,mapping(2),{recordingId:'rec'}).events[0];
const experiment={id:'stim-1',sourceId:'stim-1',sourceKind:'experiment',kind:'point',type:'stim',start:4};
const set=events=>({schema:E.SCHEMA,recordingId:'rec',timebase:'neural_seconds',events,source:{kind:'fixture'}});
const mixed=set([experiment,{...annotation,start:90,end:91,reviewed:false}]);
const sandbox={window:{NeuropixelsEventAnalysis:E,NeuropixelsEventAnalysisStorage:P,NeuropixelExplorerCore:{},NeuropixelsAnnotations:A},document:{documentElement:{lang:'en'}},console};
vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/event-analysis-ui.js'),'utf8'),sandbox);
vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/annotation-ui.js'),'utf8'),sandbox);
function fixture(){
 const ui=Object.create(sandbox.window.NeuropixelsEventAnalysisUI.prototype),fields={source:{value:'experiment'},subject:{value:''},track:{value:''}};
 ui.dialog={querySelector:()=>null};
 ui.input=k=>fields[k];ui.state={activeRecording:{key:'rec'}};ui.events=mixed;ui.annotations={doc:fresh};ui.video={mapping:mapping(2)};
 return {ui,fields};
}
(async()=>{
 await test('experimental input never includes imported annotation rows',()=>{const before=JSON.stringify(mixed),result=E.fromExperimentalEvents(mixed,'rec');assert.deepEqual(result.events,[experiment]);assert.equal(result.excluded[0].reason,'annotation_requires_current_document');assert.equal(JSON.stringify(mixed),before);});
 await test('both reviewed and unreviewed imported annotations use the same route',()=>{for(const reviewed of [false,true])assert.equal(E.fromExperimentalEvents(set([{...annotation,reviewed}]),'rec').events.length,0);});
 await test('pure experimental asset and legacy digest remain unchanged',async()=>{const original=set([experiment]);assert.equal(E.fromExperimentalEvents(original,'rec'),original);assert.equal(await P.digestJSON(original),await P.digestJSON(E.fromExperimentalEvents(original,'rec')));});
 await test('existing exclusions and validity metadata survive',()=>{const input={...mixed,excluded:[{id:'old',reason:'invalid_interval'}],source:{invalidTimes:{policy:'preserved-not-applied'}}};const result=E.fromExperimentalEvents(input,'rec');assert.equal(result.excluded[0],input.excluded[0]);assert.equal(result.source,input.source);});
 await test('recording identity remains checked',()=>assert.throws(()=>E.fromExperimentalEvents(mixed,'wrong'),/different recording/));
 await test('actual experimental UI source filters rather than relabels',()=>{const{ui}=fixture();assert.deepEqual(ui.source().events,[experiment]);});
 await test('actual annotation UI source uses live document and current clock',()=>{const{ui,fields}=fixture();fields.source.value='annotation';assert.equal(ui.source().events[0].start,4);ui.video.mapping=mapping(7);assert.equal(ui.source().events[0].start,9);assert.notEqual(ui.source().events[0].start,mixed.events[1].start);});
 await test('unrelated experimental metadata error does not block manual labels',()=>{const{ui,fields}=fixture();ui.sourceError=Error('Bad experimental asset');assert.throws(()=>ui.source(),/Bad experimental/);fields.source.value='annotation';assert.equal(ui.source().events.length,1);});
 await test('metadata failure and available invalidity warnings remain outside collapsed settings',()=>{const{ui}=fixture();ui.events={...mixed,source:{invalidTimes:{policy:'preserved-not-applied'}}};ui.sourceError=Error('Invalid coverage JSON');const validity={},error={};ui.dialog={querySelector:s=>s==='[data-ea-invalid-times]'?validity:error};ui.sourceWarnings();assert.equal(validity.hidden,false);assert.equal(error.hidden,false);assert.match(error.textContent,/Invalid coverage JSON/);assert.match(error.textContent,/saved with the analysis/);});
 for(const role of ['events','coverage'])await test(role+' metadata read failure still attempts saved annotation restoration',async()=>{
  const{ui,fields}=fixture(),nodes={validity:{},error:{},status:{dataset:{}}};ui.epoch=0;ui.cancel=()=>{ui.epoch++;};ui.update=()=>{};ui.state.experimentView={selectedUnitId:1};ui.populateFilters=()=>{};ui.populateTypes=()=>{};let restored=false;ui.restore=async()=>{restored=true;};
  fields.eventType={value:''};ui.dialog={setAttribute(){},showModal(){},querySelectorAll:()=>[],querySelector:q=>q==='[data-ea-invalid-times]'?nodes.validity:q==='[data-ea-metadata-error]'?nodes.error:q==='[data-ea-status]'?nodes.status:q==='[data-ea-results]'?{replaceChildren(){}}:{}};
  const events={...mixed,source:{invalidTimes:{policy:'preserved-not-applied'}}};ui.state.activeRecording.eventsFile=new Blob([role==='events'?'not JSON':JSON.stringify(events)]);ui.state.activeRecording.coverageFile=new Blob([role==='coverage'?'not JSON':'{}']);ui.state.activeRecording.spikeTimesFile={};ui.state.activeRecording.spikeClustersFile={};
  await ui.open();assert.equal(restored,false);
  ui.getSavedAnalysis=async()=>({});await ui.open();assert.equal(restored,true);assert.equal(nodes.error.hidden,false);assert.equal(ui.metadataIssues()[0].role,role);if(role==='coverage')assert.equal(nodes.validity.hidden,false);
  fields.source.value='annotation';assert.equal(ui.source().events.length,1);if(role==='coverage'){fields.source.value='experiment';assert.equal(ui.source().events.length,1);}
 });
 await test('metadata read errors survive actual run and binary result persistence',async()=>{
  const{ui,fields}=fixture();fields.source.value='annotation';for(const [key,value]of Object.entries({start:'-1',end:'1',binWidth:'.5',eventType:'walking',k:'0',seed:'1',normalization:'shape',coverage:'[[0,20]]'}))fields[key]={value};fields.stability={checked:false};fields.activeOnly={checked:false};
  Object.assign(sandbox,{Blob,AbortController,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Worker:class{terminate(){}postMessage(input){this.onmessage({data:{response:E.computeResponses([{unitId:1,spikes:[]}],input.events,input.options),clusters:null,diagnostics:null}});}}});
  sandbox.window.NeuropixelExplorerCore.createEventWorkerSource=()=>'';ui.epoch=0;ui.coverageError=Error('Invalid observation JSON');ui.getUnits=()=>[{id:1}];ui.selectedIds=()=>[1];ui.coverageIntervals=()=>[[0,20]];ui.signature=()=> 'same';ui.resultPanel={replaceChildren(){}};ui.busy=()=>{};ui.status=message=>{ui.lastStatus=message;};ui.renderResult=()=>{};
  const r=ui.state.activeRecording;r.sampleRate=1;r.spikeTimesFile=new File(['times'],'spike_times.npy');r.spikeClustersFile=new File(['ids'],'spike_clusters.npy');r.byName=new Map([['params.py',new File(['sample_rate=1'],'params.py')]]);
  await ui.run();assert(ui.result,ui.lastStatus);assert.deepEqual(copy(ui.result.provenance.sourceMetadataErrors),[{role:'coverage',message:'Invalid observation JSON',status:'unresolved'}]);const restored=await P.unpack(await P.pack(ui.result));assert.deepEqual(restored.provenance.sourceMetadataErrors,copy(ui.result.provenance.sourceMetadataErrors));
 });
 await test('wrong annotation context remains rejected',()=>{const{ui,fields}=fixture();fields.source.value='annotation';ui.annotations.doc={...fresh,context:{...context,recordingKey:'other'}};assert.throws(()=>ui.source(),/current Recording/);});
 await test('manual label creation needs no separate confirmation',()=>{assert.equal(annotation.reviewed,true);assert.equal(annotation.type,'walking');assert.equal(E.fromAnnotations(A.add(A.create(context),{start:2,end:3,label:''}),mapping(2),{recordingId:'rec'}).events.length,0);});
 await test('candidate naming does not silently certify a model result',()=>{let doc=A.importCandidates(A.create(context),{schema:'neuropixels-behavior-candidates/1',timebase:'video_seconds',video:{name:context.videoName,duration:20},run:{id:'run',method:'fixture'},segments:[{start:2,end:3,group_id:'0'}]});doc=A.nameGroup(doc,'run/0','walking');const events=E.fromAnnotations(doc,mapping(2),{recordingId:'rec'});assert.equal(events.events.length,0);assert.equal(events.excluded[0].reason,'unreviewed');});
 const opts={recordingId:'rec',start:-1,end:1,binWidth:.5,coverage:[[0,20]]},trains=[{unitId:1,spikes:[3,3.5,4,4.5,5]},{unitId:2,spikes:[]}];
 await test('a video point survives a project round trip and aligns real spikes to its exact timestamp',async()=>{
  const storage=require('../scripts/browser-storage.js');
  const doc=A.add(A.addLabel(fresh,'contact','point'),{label:'contact',start:2});
  const saved=await storage.unpack(storage.pack({name:'Fixture',recordingIds:['rec']},[],{[context.key]:doc}));
  const restored=A.validate(saved.annotations[context.key],context);
  assert.deepEqual(restored,doc);
  const selection={recordingId:'rec',label:'contact'};
  const events=E.fromAnnotations(restored,mapping(2),selection), e=events.events[0];
  assert.deepEqual([e.kind,e.sourceId,e.videoStart,e.videoEnd,e.start,e.end],['point',doc.segments[1].id,2,null,4,null]);
  assert.equal(events.events.length,1);
  assert.deepEqual(E.computeResponses(trains,events,opts).counts,E.computeResponses(trains,set([experiment]),opts).counts);
  assert.throws(()=>E.validateEventSet(set([{...e,end:5}])),/one timestamp/);
  const clock=new TimeMapping({provenance:{frame_clock:{video_s:[1,2],neural_s:[3,4]}}});
  assert.equal(E.fromAnnotations(restored,clock,selection).events[0].start,4);
  const moved=A.edit(restored,doc.segments[1].id,{start:2.01});
  assert.equal(E.fromAnnotations(moved,clock,{...selection,includeNamedManual:true}).excluded.at(-1).reason,'outside_time_mapping');
 });
 await test('point event and manual interval share exact onset-aligned counts',()=>{const a=E.computeResponses(trains,set([experiment]),opts),b=E.computeResponses(trains,E.fromAnnotations(fresh,mapping(2),{recordingId:'rec'}),opts);assert.deepEqual(a.counts,b.counts);assert.deepEqual(a.rateHz,b.rateHz);});
 await test('changing only end keeps onset response counts and provenance endpoint',()=>{const changed=copy(fresh);changed.segments[0].end=10;const a=E.computeResponses(trains,E.fromAnnotations(fresh,mapping(2),{recordingId:'rec'}),opts),b=E.computeResponses(trains,E.fromAnnotations(changed,mapping(2),{recordingId:'rec'}),opts);assert.deepEqual(a.counts,b.counts);assert.deepEqual(a.rateHz,b.rateHz);assert.equal(b.events[0].videoEnd,10);assert.equal(b.events[0].end,12);});
 await test('missing coverage and mapped-time bounds remain explicit',()=>{assert.throws(()=>E.computeResponses(trains,set([experiment]),{...opts,coverage:undefined}),/coverage/);const clock=new TimeMapping({method:'frame_timestamps',offset_s:0,scale:1,verification_status:'verified',provenance:{frame_clock:{video_s:[0,1],neural_s:[0,1]}}});assert.equal(E.fromAnnotations(fresh,clock,{recordingId:'rec'}).excluded[0].reason,'outside_time_mapping');});
 await test('actual Save label action creates and edits directly analyzable manual events',async()=>{
  const a=Object.create(sandbox.window.NeuropixelsAnnotationUI.AnnotationController.prototype);a.doc=A.create(context);a.selected=new Set();a.values=()=>({start:2,end:3,label:'walking',subject:'animal-1',track:'behavior'});a.commit=doc=>a.doc=doc;a.select=()=>{};a.toast=message=>{throw Error(message);};
  a.getView=()=>({selectedInterval:null});a.video={mapping:mapping(2)};
  const event={target:{closest:selector=>selector==='[data-action]'?{dataset:{action:'quick-save'}}:null}};
  await a.action(event);assert.equal(E.fromAnnotations(a.doc,mapping(2),{recordingId:'rec'}).events.length,1);const id=a.doc.segments[0].id;
  a.values=()=>({start:2,end:4,label:'walking',subject:'animal-1',track:'behavior'});await a.action(event);const result=E.fromAnnotations(a.doc,mapping(2),{recordingId:'rec'});assert.equal(result.events.length,1);assert.equal(result.events[0].sourceId,id);assert.equal(result.events[0].videoEnd,4);assert.equal(result.events[0].reviewed,true);
 });
 await test('edited manual intervals retain review provenance without blocking analysis',()=>{
  const {ui,fields}=fixture();fields.source.value='annotation';ui.annotations.doc=copy(fresh);const id=ui.annotations.doc.segments[0].id;ui.annotations.doc.schemes[0].reviewed[id]=false;ui.annotations.doc.segments[0].end=4;
  const before=JSON.stringify(ui.annotations.doc),result=ui.source();assert.equal(result.events.length,1);assert.equal(result.events[0].reviewed,false);assert.equal(JSON.stringify(ui.annotations.doc),before);
  ui.annotations.doc.segments[0].runId='model';assert.equal(ui.source().events.length,0);
 });
 await test('blank coverage applies known gaps and marks missing Unit coverage',()=>{
  const {ui,fields}=fixture();fields.coverage={value:''};assert.equal(ui.coverageIntervals([1]),null);
  ui.coverage={schema:'neuropixels-recording-coverage/1',recordingId:'rec',timebase:'neural_seconds',source:{kind:'NWB.units.obs_intervals',status:'source-reported'},units:[{unitId:1,intervals:[[0,3],[5,10]]}]};
  assert.deepEqual(copy(ui.coverageIntervals([1,2])),[[0,3],[5,10]]);assert.equal(ui.coverageProof.origin,'source-reported-partial-unit-intersection');assert.deepEqual(copy(ui.coverageProof.source.missingUnitIds),[2]);
  ui.coverage=null;assert.throws(()=>ui.coverageIntervals([1,2]),/no longer available/);
  ui.coverageError=Error('broken JSON');assert.throws(()=>ui.coverageIntervals([1]),/invalid/i);fields.coverage.value='[[0,8]]';assert.deepEqual(copy(ui.coverageIntervals([1])),[[0,8]]);
 });
 await test('malformed selected coverage is not absent coverage',()=>{
  const source={schema:'neuropixels-recording-coverage/1',recordingId:'rec',timebase:'neural_seconds',source:{kind:'NWB.units.obs_intervals',status:'source-reported'},units:[],excluded:[{unitId:1,reason:'invalid_intervals'}]};
  assert.throws(()=>E.commonCoverage(source,[1],'rec',{allowMissing:true}),/Invalid source/);
 });
 await test('unknown coverage roundtrips and old responses keep their version',async()=>{
  const es=set([{...experiment,start:.2,id:'too-early'},experiment]),response=E.computeResponses(trains,es,{...opts,coverage:null});assert.equal(response.parameters.coverage,null);assert.equal(response.excludedEvents[0].reason,'outside_nonnegative_neural_time');
  const sources=[{role:'spikeTimes',file:new Blob(['times'])},{role:'spikeClusters',file:new Blob(['ids'])},{role:'sampleRate',file:new Blob(['1'])}];
  const record={response,provenance:{recordingId:'rec',coverageOrigin:'unknown-continuous-assumption'},input:{sourceKind:'experiment',sampleRate:1,eventDigest:await P.digestJSON(es),sourceFingerprints:await P.sourceFingerprints(sources)}};
  const restored=await P.unpack(await P.pack(record));assert.deepEqual(restored.response,response);await P.verifySources(restored,sources,es,1);
  await assert.rejects(P.pack({...record,provenance:{...record.provenance,coverageOrigin:'user-declared-unverified'}}),/assumption/);
  const legacy={...record,response:{...E.computeResponses(trains,es,opts),version:'event-response/1'},provenance:{recordingId:'rec',coverageOrigin:'user-declared-unverified'}};
  const old=await P.unpack(await P.pack(legacy));assert.equal(old.response.version,'event-response/1');await P.verifySources(old,sources,es,1);
 });
 console.log(JSON.stringify({status:'PASS',checks,scope:'Unified inputs, editable manual intervals, unknown/partial coverage, source gaps, persistence and legacy compatibility'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
