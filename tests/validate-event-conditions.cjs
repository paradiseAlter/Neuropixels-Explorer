// SPDX-License-Identifier: MIT
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const E = require('../scripts/event-analysis-core.js');
const P = require('../scripts/event-analysis-storage.js');
const core = require('../scripts/kilosort-core.js');
const {npy} = require('../scripts/browser-nwb-worker.js');

const ids = [51, 15, 73, 30];
const outcomes = ['hit','miss','hit','miss','hit','hit','auto_rewarded',null,'hit','miss'];
const events = {schema:E.SCHEMA,timebase:'neural_seconds',recordingId:'rec',events:outcomes.map((outcome,i)=>({
  id:'event-'+i,sourceId:String(i),sourceKind:'experiment',kind:'point',type:'image_change',
  start:2*(i+1),conditions:{active:true,...(outcome?{trial_outcome:outcome,stimulus:outcome==='hit'?'left':outcome==='miss'?'right':'neutral'}:{})}
}))};
const options = {recordingId:'rec',start:0,end:1,binWidth:.25,eventType:'image_change',coverage:[[0,17]],comparison:{field:'stimulus',values:['left','right']}};
// Unit 30 has no spikes in the hit trials but is active on misses.
const spikes = [];
for (const e of events.events) {
  const active = e.conditions.trial_outcome === 'hit' ? [[51,.125],[15,.875],[73,.875]] : [[51,.875],[15,.125],[73,.125],[30,.375]];
  for (const [unit, offset] of active) spikes.push({unit,t:e.start+offset});
}
spikes.sort((a,b)=>a.t-b.t);
const files = {spikeTimes:new Blob([npy(Float64Array.from(spikes,s=>s.t),'<f8')]),
               spikeClusters:new Blob([npy(Int32Array.from(spikes,s=>s.unit),'<i4')])};

async function main(){
  const messages=[];
  const worker={self:{postMessage:m=>messages.push(structuredClone(m))},TextDecoder};
  vm.runInNewContext(core.createEventWorkerSource(E.workerSource()),worker);
  const run=async data=>{
    await worker.self.onmessage({data:{files,sampleRate:1,unitIds:ids,...data}});
    const result=messages.at(-1);
    assert(!result.error,result.error);
    return result;
  };
  const {response,clusters,diagnostics}=await run({events,options,clusters:{k:2},stability:{repeats:3}});
  const scoped=await run({events,options:{...options,eventRange:[2,7]},limits:{maxSelectedSpikes:10}});
  assert.deepEqual(scoped.response.eventIds,['event-0','event-1','event-2']);
  const scopedRecord={response:scoped.response,clusters:null,diagnostics:null,provenance:{recordingId:'rec',coverageOrigin:'user-declared-unverified'},
    input:{sourceKind:'experiment',sampleRate:1,eventDigest:await P.digestJSON(events),sourceFingerprints:[]}};
  assert.deepEqual(scoped.response.excludedEvents.filter(e=>e.reason==='outside_selected_time').map(e=>e.id),events.events.slice(3).map(e=>e.id));
  assert.deepEqual(scoped.response.counts,E.computeResponses(ids.map(unitId=>({unitId,spikes:spikes.filter(s=>s.unit===unitId).map(s=>s.t)})),events,{...options,eventRange:[2,7]}).counts);
  assert.equal(response.version,E.COMPARISON_VERSION);
  assert.deepEqual(response.eventIds,['event-0','event-1','event-2','event-3','event-4','event-5']);
  assert.deepEqual(response.excludedEvents.map(e=>e.reason),['other_condition_value','missing_condition_value','incomplete_recording_coverage','incomplete_recording_coverage']);
  const hit=E.conditionResponse(response,'left'),miss=E.conditionResponse(response,'right');
  assert.deepEqual(hit.eventIds,['event-0','event-2','event-4','event-5']);
  assert.deepEqual(miss.eventIds,['event-1','event-3']);
  assert.deepEqual(miss.excludedEvents,[{id:'event-9',reason:'incomplete_recording_coverage',outcome:'right'}]);
  assert.equal(clusters.referenceOutcome,'left');
  assert.deepEqual(clusters.excludedUnits,[{unitId:30,reason:'constant_response'}]);
  assert.deepEqual(E.responseSummary(hit,clusters).unitOrder,E.responseSummary(miss,clusters).unitOrder);
  assert.deepEqual(Array.from(miss.rateHz.slice(12,16)),[0,4,0,0]);
  assert.deepEqual(Array.from(hit.rateHz.slice(12,16)),[0,0,0,0]);
  assert.throws(()=>E.clusterResponses(miss,{k:2}),/reference condition/);
  assert.throws(()=>E.clusterResponses(response,{k:2}),/reference condition/);
  assert.equal(diagnostics.trialOrder,'conditionResponse.eventIds');
  assert(diagnostics.runs.every(r=>r.leftEvents+r.rightEvents===4));
  const onlyHit=E.computeResponses([{unitId:5,spikes:[]}],{...events,events:[events.events[0]]},options);
  assert.equal(E.conditionResponse(onlyHit,'right'),null);
  assert.throws(()=>E.computeResponses([{unitId:5,spikes:[]}],{...events,events:[events.events[0]]},
    {...options,comparison:{field:'stimulus',values:['right','left']}}),/reference condition/);

  const {trains}=await run({operation:'trains',unitIds:[30],limits:{timeRange:[2,7]}});
  assert(trains[0].spikes instanceof Float64Array);
  assert.deepEqual(Array.from(trains[0].spikes),[4.375]);
  const bigEndian=(values,descr,Ctor,setter)=>{
    const buffer=npy(new Ctor(values.length),descr);
    const header=core.parseNpyHeaderBuffer(buffer),view=new DataView(buffer);
    values.forEach((v,i)=>view[setter](header.dataOffset+i*header.itemSize,v,false));
    return new Blob([buffer]);
  };
  const beFiles={spikeTimes:bigEndian([2.25,3.75],'>f8',Float64Array,'setFloat64'),
                 spikeClusters:bigEndian([51,30],'>i4',Int32Array,'setInt32')};
  const big=await run({operation:'trains',files:beFiles,limits:{chunkRows:1}});
  assert.deepEqual(Array.from(big.trains[0].spikes),[2.25]);
  assert.deepEqual(Array.from(big.trains[3].spikes),[3.75]);
  for(const spikeTimes of [new Blob([npy(new BigUint64Array([2n**53n+1n]),'<u8')]),
      bigEndian([2n**53n+1n],'>u8',BigUint64Array,'setBigUint64')]){
    await worker.self.onmessage({data:{operation:'trains',unitIds:[51],sampleRate:1,
      files:{spikeTimes,spikeClusters:new Blob([npy(new Int32Array([51]),'<i4')])}}});
    assert.match(messages.at(-1).error,/exact integer precision/);
  }
  const sources=[...Object.entries(files).map(([role,file])=>({role,file})),{role:'sampleRate',file:new Blob(['1'])}];
  const view={outcome:'right',unitIds:[51,30],eventId:'event-3'};
  const record={response,clusters,diagnostics,view,provenance:{recordingId:'rec',coverageOrigin:'user-declared-unverified'},
    input:{sourceKind:'experiment',sampleRate:1,eventDigest:await P.digestJSON(events),sourceFingerprints:await P.sourceFingerprints(sources)}};
  scopedRecord.input.sourceFingerprints=record.input.sourceFingerprints;
  const restoredScope=await P.unpack(await P.pack(scopedRecord));
  assert(await P.verifySources(restoredScope,sources,events,1));
  const restored=await P.unpack(await P.pack(record));
  assert.deepEqual(restored,record);
  assert(await P.verifySources(restored,sources,events,1));
  // Older analyses can still be verified against their recorded outcomes, but cannot reuse them in a new fit.
  const {comparison:unused,...baseOptions}=options;
  const legacyParams={...baseOptions,referenceOutcome:'hit',activeOnly:true};
  const legacy={...record,view:null,clusters:null,diagnostics:null,response:{...response,version:E.CONDITION_VERSION,
    parameters:{...legacyParams,alignment:'start'},excludedEvents:E.selectResponseEvents(events,legacyParams,true).excluded}};
  assert(await P.verifySources(await P.unpack(await P.pack(legacy)),sources,events,1));
  for(const cmp of [{field:'trial_outcome',values:['hit','miss']},{field:'wasHit',values:[true,false]},
    {field:'miss',values:[true,false]},{field:'classification',values:['hit','miss']},{field:E.LABEL_FIELD,values:['hit','miss']}]){
    assert.throws(()=>E.validateResponsePlan(ids,events,{...baseOptions,comparison:cmp}),/two event labels/);
  }
  assert.throws(()=>E.validateResponsePlan(ids,events,legacyParams),/two event labels/);
  const aliases=[true,false].map((hit,i)=>({conditions:{hit,miss:!hit,is_hit:hit,trial_outcome:outcomes[i],
    classification:outcomes[i],intensity:i,hit_time:i}}));
  assert.deepEqual([...E.conditionFields(aliases).keys()],['intensity','hit_time']);
  assert(E.conditionFields(['left','right'].map(trial_outcome=>({conditions:{trial_outcome}}))).has('trial_outcome'));
  assert(E.recordedOutcome('outcome',['hit','auto_rewarded']));
  const key='stimulus/code';
  const custom={...events,events:events.events.map((e,i)=>({...e,type:'stimulus',conditions:{
    active:false,...(i!==7?{[key]:outcomes[i]==='hit'?0:outcomes[i]==='miss'?'0':'other'}:{})}}))};
  const comparison={field:key,values:[0,'0']};
  const genericOptions={...options,eventType:'stimulus',comparison};
  const generic=await run({events:custom,options:genericOptions,clusters:{k:2},stability:{repeats:3},traceProcess:true});
  const r=generic.response;
  assert.equal(r.version,E.COMPARISON_VERSION);
  assert.deepEqual(r.parameters.comparison,comparison);
  assert.equal(r.parameters.activeOnly,false);
  assert.deepEqual(r.eventIds,response.eventIds);
  assert.deepEqual(E.conditionResponse(r,0).counts,hit.counts);
  assert.deepEqual(E.conditionResponse(r,'0').counts,miss.counts);
  assert.deepEqual(generic.clusters.labels,clusters.labels);
  assert.equal(generic.clusters.referenceOutcome,0);
  assert.equal(generic.diagnostics.referenceOutcome,0);
  assert.deepEqual(r.excludedEvents.map(e=>e.reason),['other_condition_value','missing_condition_value','incomplete_recording_coverage','incomplete_recording_coverage']);
  const alignment=messages.find(m=>m.progress?.stage==='alignment'&&m.progress.conditionField===key).progress;
  assert.equal(alignment.referenceOutcome,0);assert.equal(alignment.trialCount,hit.shape[1]);
  assert(alignment.events.every(e=>e.outcome===0));
  const genericRecord={...record,response:r,clusters:generic.clusters,diagnostics:generic.diagnostics,
    view:{...view,outcome:'0'},input:{...record.input,eventDigest:await P.digestJSON(custom)}};
  assert.deepEqual(await P.unpack(await P.pack(genericRecord)),genericRecord);
  assert.deepEqual([...E.conditionFields(custom.events).get(key)],[[0,5],['0',3],['other',1]]);
  assert.equal(E.conditionText('0',[0,'0']),'"0"');
  assert.throws(()=>E.comparisonOf({comparison:{field:key,values:[0,0]}}),/distinct/);
  const annotation={...custom,events:custom.events.map((e,i)=>({...e,sourceKind:'annotation',originalTimebase:'video_seconds',
    subject:i%2?'left':'right',track:'behavior',schemeId:'scheme',reviewed:true,videoStart:e.start,videoEnd:null}))};
  assert.deepEqual([...E.conditionFields(annotation.events).get('subject')],[['right',5],['left',5]]);
  assert.equal(E.computeResponses([{unitId:1,spikes:[]}],annotation,{...genericOptions,comparison:{field:'subject',values:['left','right']}}).shape[1],8);
  const point=(type,start,i)=>({type,start,id:type+i,sourceId:type+i,sourceKind:'experiment',kind:'point'});
  const cues=[2,2.5,3,6,8,12].map((t,i)=>point('cue',t,i));
  const replies=[2.25,3,6.75].map((t,i)=>point('reply',t,i));
  const labelled={...events,events:[...cues,...replies],responseBounds:[0,9]};
  const pooled={...genericOptions,eventType:'cue',comparison:null,coverage:null,repeatPolicy:'keep'};
  const rule={sourceKind:'experiment',type:'reply',start:.25,end:.75};
  const byLabel={...pooled,responseRule:rule};
  const result=await run({events:labelled,options:byLabel});
  assert.deepEqual(result.response.events.map(e=>e.matchedResponseId),['reply0','reply1',null,null,null]);
  assert.deepEqual(result.response.excludedEvents,[{id:'cue5',reason:'incomplete_label_window'}]);
  assert.equal(result.response.version,E.RULE_VERSION);
  assert.deepEqual(result.response.sameLabelOnsets,[2,2.5,3,6,8,12]);
  assert.equal(E.comparisonOf((await run({events:labelled,options:pooled})).response.parameters),null);
  assert.equal(E.conditionResponse(result.response,'hit').shape[1],2);
  assert.equal(E.conditionResponse(result.response,'miss').shape[1],3);
  assert(!cues.some(e=>'matchedResponseId' in e));
  assert.deepEqual(E.selectResponseEvents(labelled,{...byLabel,repeatPolicy:'exclude',eventRange:[2,2.25]}).excluded[0],{id:'cue0',reason:'repeated_event_in_window'});
  assert.deepEqual(E.otherOnsetRange([2,2,2.5,3],2,0,1),{lo:0,hi:3,skip:0,count:2});
  assert.equal(E.otherOnsetRange([1,2,3],2,-1,0).count,1);
  const allMiss=await run({events:labelled,options:{...byLabel,eventRange:[6,7]}});
  assert.deepEqual(E.comparisonOf(allMiss.response.parameters).values,['miss','hit']);
  assert.equal(E.conditionResponse(allMiss.response,'hit'),null);
  const savedRule={...scopedRecord,response:result.response,
    provenance:{...scopedRecord.provenance,coverageOrigin:'unknown-continuous-assumption'},
    input:{...record.input,eventDigest:await P.digestJSON(labelled)}};
  const opened=await P.unpack(await P.pack(savedRule));
  assert(await P.verifySources(opened,sources,labelled,1));
  opened.response.sameLabelOnsets.pop();
  await assert.rejects(P.verifySources(opened,sources,labelled,1),/repeated events/);
  const other={...events,events:cues,responseSource:{...annotation,events:replies.map(e=>({...annotation.events[0],...e,sourceKind:'annotation',videoStart:e.start}))}};
  assert.deepEqual(E.selectResponseEvents(other,{...byLabel,responseRule:{...rule,sourceKind:'annotation'}}).events.slice(0,5).map(e=>e.matchedResponseId),['reply0','reply1',null,null,null]);
  const unusual=[{conditions:JSON.parse('{"__proto__":false,"constructor":true}')},{conditions:{}}];
  assert.deepEqual([...E.conditionFields(unusual).get('__proto__')],[[false,1]]);
  assert.equal(E.conditionValue(unusual[1],'constructor'),undefined);
  const doc={schema:'neuropixels-annotations/1',activeSchemeId:'s',schemes:[{id:'s',labels:{clip:'reach'}}],
    context:{key:'camera'},segments:[{id:'clip',kind:'point',start:4,end:4,subject:'animal',track:'camera'}]};
  const toEvents=()=>E.fromAnnotations(doc,{videoToNeural:t=>t},{recordingId:'rec',includeNamedManual:true});
  const oldSet=toEvents(),legacyAnnotation={response:E.computeResponses([{unitId:1,spikes:[]}],oldSet,{...genericOptions,eventType:'reach',comparison:null}),
    input:{...record.input,sourceKind:'annotation',eventDigest:await P.digestJSON(oldSet)}};
  doc.segments[0].conditions={light:false};
  const withMetadata=toEvents();assert.equal(E.conditionValue(withMetadata.events[0],'light'),false);
  assert(await P.verifySources(legacyAnnotation,sources,withMetadata,1));
  await assert.rejects(P.pack({...record,response:hit}),/comparison parameters/);
  await assert.rejects(P.pack({...record,clusters:{...clusters,referenceOutcome:'right'}}),/reference condition/);
  await assert.rejects(P.pack({...record,view:{...view,eventId:'event-0'}}),/does not belong/);
  const updated=structuredClone(events);
  updated.events[0].conditions.trial_outcome='miss';
  await assert.rejects(P.verifySources(restored,sources,updated,1),/Events.*changed/);
  console.log('PASS: reference-only clusters, fixed rows, exact spike times, condition-specific exclusions, diagnostics and source-verified saved selection.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
