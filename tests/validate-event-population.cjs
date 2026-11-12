// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('../scripts/event-analysis-core.js'),P=require('../scripts/event-analysis-storage.js');
let checks=0;const test=(name,fn)=>{fn();checks++;};
const events={schema:E.SCHEMA,timebase:'neural_seconds',recordingId:'population-fixture',events:Array.from({length:20},(_,i)=>({id:String(i),sourceId:String(i),sourceKind:'experiment',kind:'point',type:'stim',start:10+i*2}))};
let random=5;const next=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random;};
function response(noisy=false){
 const trains=Array.from({length:13},(_,u)=>{const spikes=[];for(const e of events.events)for(let b=0;b<4;b++){const count=u===12?0:noisy?next()%7:([3,1,0,0][u<6?b:3-b])*(1+u%3);for(let n=0;n<count;n++)spikes.push(e.start+b*.25+.001+n*.01);}return {unitId:100+u,spikes};});
 return E.computeResponses(trains,events,{recordingId:events.recordingId,start:0,end:1,binWidth:.25,coverage:[[0,60]],eventType:'stim'});
}
const r=response(),c=E.clusterResponses(r,{k:2,seed:42}),summary=E.responseSummary(r,c),diagnostics=E.splitHalfStability(r,c,{seed:42,repeats:4});
test('all Units and exclusions retain identities',()=>{assert.deepEqual([...summary.unitOrder].sort((a,b)=>a-b),r.unitIds);assert.deepEqual(summary.groups.find(g=>g.cluster===null).unitIds,[112]);assert.equal(new Set(summary.unitOrder).size,13);});
test('group means are equal-Unit raw Hz',()=>{for(const g of summary.groups)for(let b=0;b<4;b++){const expected=g.unitIds.reduce((sum,id)=>sum+r.rateHz[r.unitIds.indexOf(id)*4+b],0)/g.unitIds.length;assert(Math.abs(g.meanRateHz[b]-expected)<1e-12);}});
test('unclustered summary preserves original order',()=>assert.deepEqual(E.responseSummary(r).unitOrder,r.unitIds));
test('ARI is invariant to group names and detects crossing',()=>{assert.equal(E.adjustedRandIndex([0,0,1,1],[9,9,2,2]),1);assert(Math.abs(E.adjustedRandIndex([0,0,1,1],[0,1,0,1])+.5)<1e-12);assert.equal(E.adjustedRandIndex([0,1],[9,8]),1);});
test('invalid ARI inputs rejected',()=>{assert.throws(()=>E.adjustedRandIndex([0],[1]));assert.throws(()=>E.adjustedRandIndex([0,NaN],[1,1]));});
test('stable profiles and reproducible split-half',()=>{assert.equal(diagnostics.status,'available');assert.equal(diagnostics.successful,4);assert.equal(diagnostics.meanARI,1);assert.deepEqual(diagnostics,E.splitHalfStability(r,c,{seed:42,repeats:4}));});
test('split provenance, no event duplication, constant Units excluded',()=>{for(const run of diagnostics.runs){assert.equal(run.leftEventIndices.length,10);assert.equal(new Set(run.leftEventIndices).size,10);assert(run.leftEventIndices.every(i=>i>=0&&i<20));assert.equal(run.leftEvents+run.rightEvents,20);assert.deepEqual(run.excludedLeft,[{unitId:112,reason:'constant_response'}]);assert(!run.unitIds.includes(112));}});
test('too few trials, trivial k and excessive work stay explicit',()=>{assert.equal(E.splitHalfStability({...r,shape:[13,3,4]},c).status,'unavailable');assert.equal(E.splitHalfStability(r,null).status,'unavailable');assert.match(E.splitHalfStability({...r,shape:[4096,100000,5000]},c).reason,/limit/);assert.throws(()=>E.splitHalfStability(r,c,{repeats:21}));});
const noisy=response(true),noisyClusters=E.clusterResponses(noisy,{k:2,seed:42}),noise=E.splitHalfStability(noisy,noisyClusters,{seed:42,repeats:4});
test('noisy diagnostics remain bounded and do not imply significance',()=>{assert(noise.runs.every(run=>run.status!=='available'||(run.ari>=-1&&run.ari<=1)));assert.match(noise.interpretation,/not independent replication/);});
const annotations={schema:'neuropixels-annotations/1',activeSchemeId:'s',context:{key:'video'},segments:[{id:'a',start:1,end:2,subject:'mouse-a',track:'behavior'},{id:'b',start:3,end:4,subject:'mouse-b',track:'behavior'},{id:'c',start:5,end:6,subject:'mouse-a',track:'artifact'}],schemes:[{id:'s',labels:{a:'move',b:'move',c:'move'},reviewed:{a:true,b:true,c:true}}]};
test('annotation subject and track filters are explicit',()=>{const filtered=E.fromAnnotations(annotations,{videoToNeural:t=>t+10},{recordingId:'population-fixture',subject:'mouse-a',track:'behavior'});assert.deepEqual(filtered.events.map(e=>e.sourceId),['a']);assert.deepEqual(filtered.excluded.map(e=>e.reason),['different_subject','different_track']);});
(async()=>{
 const record={response:r,clusters:c,diagnostics,provenance:{recordingId:r.recordingId,coverageOrigin:'user-declared-unverified'},input:{sourceKind:'experiment',sampleRate:1,eventDigest:await P.digestJSON(events),sourceFingerprints:await P.sourceFingerprints(['spikeTimes','spikeClusters','sampleRate'].map(role=>({role,file:new Blob([role])})))}};
 assert.deepEqual((await P.unpack(await P.pack(record))).diagnostics,diagnostics);checks++;
 await assert.rejects(P.pack({...record,diagnostics:{...diagnostics,schema:'unknown/9'}}),/diagnostics/);checks++;
 await assert.rejects(P.pack({...record,diagnostics:{...diagnostics,meanARI:NaN}}),/disagrees/);await assert.rejects(P.pack({...record,diagnostics:{...diagnostics,successful:1}}),/status/);checks++;
 await assert.rejects(P.pack({...record,clusters:null,diagnostics:{...E.splitHalfStability(r,null),successful:4,meanARI:null}}),/Empty stability/);checks++;
 const ariCases=[{a:[0,0,1,1],b:[0,1,0,1]},{a:[0,0,0,1,1,2],b:[1,1,0,2,2,0]}];for(let i=0;i<30;i++)ariCases.push({a:Array.from({length:31},()=>next()%4),b:Array.from({length:31},()=>next()%5)});for(const item of ariCases)item.expected=E.adjustedRandIndex(item.a,item.b);
 if(process.env.EVENT_POPULATION_REFERENCE_OUT)fs.writeFileSync(process.env.EVENT_POPULATION_REFERENCE_OUT,JSON.stringify({ariCases,stable:diagnostics,noisy:noise},null,2));
 console.log(JSON.stringify({status:'PASS',checks,stableMeanARI:diagnostics.meanARI,noisyMeanARI:noise.meanARI,scope:'Exact summary means, Unit identity, seeded split-half sensitivity, ARI permutation invariance, bounds, annotation filters and persistence; no biological validity claim'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
