// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict'),{readInvalidTimes,readAllenEvents}=require('../scripts/browser-nwb-worker.js');
const E=require('../scripts/event-analysis-core.js'),P=require('../scripts/event-analysis-storage.js');
const group=values=>({keys:()=>Object.keys(values),get:key=>values[key]});
const col=value=>({shape:[value.length],value});
let checks=0;const test=(name,fn)=>{fn();checks++;};
const data={id:col([1,2,3,4]),start_time:col([2,4,6,8]),stop_time:col([3,5,7,9]),
  tags:col(['EcephysProbe','5','probeC','EcephysSession','42','stimulus','EcephysSession','42','all_probes','custom']),tags_index:col([3,6,9,10])};
const metadata=readInvalidTimes(group(data));
test('absence does not imply validity',()=>assert.equal(readInvalidTimes(null),null));
test('ragged labels and source scope preserved literally',()=>{assert.deepEqual(metadata.rows.map(r=>r.tags),[['EcephysProbe','5','probeC'],['EcephysSession','42','stimulus'],['EcephysSession','42','all_probes'],['custom']]);assert.equal(metadata.policy,'preserved-not-applied');assert.deepEqual(metadata.issues,[]);assert.equal(metadata.coverage,undefined);});
test('reserved table cannot become an experimental event',()=>{const events=readAllenEvents(group({intervals:group({invalid_times:group(data),trials:group({id:col([7]),start_time:col([10]),stop_time:col([11])})})}),'rec','s');assert.equal(events.events.length,1);assert.equal(events.events[0].sourceTable,'intervals/trials');assert.deepEqual(events.source.invalidTimes,metadata);assert.equal(events.coverage,null);});
test('legacy mistaken events require explicit reimport',()=>{const legacy={schema:E.SCHEMA,recordingId:'rec',timebase:'neural_seconds',events:[{id:'bad',sourceId:'1',sourceKind:'experiment',sourceTable:'intervals/invalid_times',type:'invalid_times',kind:'interval',start:2,end:3}]};assert.throws(()=>E.validateEventSet(legacy),/Reimport/);});
test('malformed tag index never yields invented scope',()=>{const m=readInvalidTimes(group({...data,tags_index:col([3,2,9,10])}));assert.equal(m.rows.length,4);assert(m.rows.every(r=>r.tags===null));assert.equal(m.issues[0].reason,'invalid_tags_index');});
test('unindexed one-tag-per-row stays literal',()=>{const m=readInvalidTimes(group({...data,tags:col(['probeA','probeB','stimulus','unknown']),tags_index:undefined}));assert.deepEqual(m.rows[1].tags,['probeB']);});
test('missing tags stay unknown',()=>{const m=readInvalidTimes(group({id:col([1]),start_time:col([1]),stop_time:col([2])}));assert.equal(m.rows[0].tags,null);});
test('oversized arrays are not read',()=>{let read=false;const m=readInvalidTimes(group({...data,start_time:{shape:[10001],get value(){read=true;throw Error('payload read');}}}));assert.equal(read,false);assert.equal(m.rows.length,0);assert.match(m.issues[0].reason,/oversized/);});
test('malformed intervals and oversized tags reported',()=>{const m=readInvalidTimes(group({...data,start_time:col([NaN,4,10,8]),tags:col(['x'.repeat(1001),'5','probeC','s','42','stimulus','s','42','all_probes','custom'])}));assert.deepEqual(m.rows.map(r=>r.sourceId),['2','4']);assert.equal(m.issues.length,3);assert(m.rows.every(r=>r.tags===null));});
test('pre-reference invalid times retained without clipping',()=>{const m=readInvalidTimes(group({id:col([1]),start_time:col([-2]),stop_time:col([-1]),timeseries:col(['unread-reference'])}));assert.equal(m.rows[0].start,-2);assert.equal(m.timeseriesReferences,'present-not-decoded');});
test('source validity does not silently mask spikes or events',()=>{const event={id:'a',sourceId:'a',sourceKind:'experiment',type:'stim',kind:'point',start:2};const events={schema:E.SCHEMA,recordingId:'rec',timebase:'neural_seconds',source:{invalidTimes:metadata},events:[event]};const response=E.computeResponses([{unitId:1,spikes:[2.2]},{unitId:2,spikes:[]}],events,{start:0,end:1,binWidth:1,coverage:[[0,10]]});assert.deepEqual(Array.from(response.counts),[1,0]);assert.deepEqual(response.unitIds,[1,2]);});
(async()=>{
 const events={schema:E.SCHEMA,recordingId:'rec',timebase:'neural_seconds',source:{invalidTimes:metadata},events:[{id:'a',sourceId:'a',sourceKind:'experiment',type:'stim',kind:'point',start:2}]};
 const response=E.computeResponses([{unitId:1,spikes:[2.2]}],events,{start:0,end:1,binWidth:1,coverage:[[0,10]]});
 const files=['spikeTimes','spikeClusters','sampleRate'].map(role=>({role,file:new Blob(['fixture'])}));
 const record={response,provenance:{recordingId:'rec',coverageOrigin:'user-declared-unverified',invalidTimes:metadata},input:{sourceKind:'experiment',sampleRate:1,eventDigest:await P.digestJSON(events),sourceFingerprints:await P.sourceFingerprints(files)}};
 const restored=await P.unpack(await P.pack(record));assert.deepEqual(restored.provenance.invalidTimes,metadata);checks++;
 assert.notEqual(await P.digestJSON(events),await P.digestJSON({...events,source:{}}));checks++;
 console.log(JSON.stringify({status:'PASS',checks,scope:'Reserved invalid_times exclusion, bounded literal metadata, unresolved scopes, legacy rejection, provenance persistence; no validity masks inferred'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
