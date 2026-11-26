// SPDX-License-Identifier: MIT
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const E = require('../scripts/event-analysis-core.js');
const core = require('../scripts/kilosort-core.js');
const {npy} = require('../scripts/browser-nwb-worker.js');

const ids = [30,51,15,73,64];
const outcomes = ['left','right','left','right','left','right','left','auto_rewarded'];
const events = {schema:E.SCHEMA,recordingId:'example',timebase:'neural_seconds',events:outcomes.map((outcome,i)=>({
  id:'event-'+i,sourceId:String(i),type:'image_change',sourceKind:'experiment',kind:'point',
  start:.5+2*i,conditions:{active:true,direction:outcome}
}))};
const options = {recordingId:'example',eventType:'image_change',comparison:{field:'direction',values:['left','right']},coverage:null,start:-.5,end:.5,binWidth:.25};
const spikes = [];
for (const event of events.events) {
  const ref = event.conditions.direction === 'left';
  const offsets = ref ? [[],[-.375,-.25],[-.5,0,.125,.5],[.125,.375],[.25,.375]]
    : [[-.25],[.375],[-.25],[0],[-.375,-.375]];
  offsets.forEach((times,u)=>times.forEach(t=>spikes.push([event.start+t,ids[u]])));
}
spikes.sort((a,b)=>a[0]-b[0]);
const files = {spikeTimes:new Blob([npy(Float64Array.from(spikes,s=>s[0]),'<f8')]),
  spikeClusters:new Blob([npy(Int32Array.from(spikes,s=>s[1]),'<i4')])};

async function run(extra) {
  const messages = [];
  const worker = {TextDecoder,self:{postMessage:m=>messages.push(structuredClone(m))}};
  vm.runInNewContext(core.createEventWorkerSource(E.workerSource()),worker);
  await worker.self.onmessage({data:{files,events,options,clusters:{k:2},stability:{repeats:2},
    unitIds:ids,sampleRate:1,traceProcess:true,...extra}});
  const result = messages.at(-1);
  assert(!result.error,result.error);
  return {frames:messages.map(m=>m.progress).filter(p=>p?.phase==='process'),result};
}

async function main() {
  const {frames,result} = await run({traceUnitId:15});
  assert.deepEqual((await run({traceProcess:false})).result,result);
  const [alignment,rates] = frames, fits = frames.filter(f=>f.stage==='cluster'), order = frames.at(-1);
  assert.equal(alignment.stage,'alignment');
  assert.equal(rates.stage,'rates');
  assert.equal(order.stage,'order');
  assert(frames.every(f=>f.unitId===15 && f.referenceOutcome==='left'));
  assert.equal(alignment.trialCount,4);
  assert.deepEqual(alignment.events.map(e=>e.id),['event-0','event-2','event-4']);
  for (const e of alignment.events) {
    assert.deepEqual(e.spikes,[e.start-.5,e.start,e.start+.125]);
    assert.equal(e.spikeCount,3);
  }
  assert.equal(alignment.events[0].spikes[0],0);
  assert.equal(rates.binCount,4);
  assert.deepEqual(rates.bins.map(b=>b.count),[4,0,8,0]);
  assert.deepEqual(rates.example,{index:2,start:0,end:.25,count:8,hz:8});
  assert.deepEqual(rates.exampleTrialCounts,alignment.events.map(e=>({id:e.id,start:e.start,count:2})));
  const reference = E.conditionResponse(result.response,'left'), row = ids.indexOf(15);
  assert.deepEqual(rates.bins.map(b=>b.hz),Array.from(reference.rateHz.subarray(row*4,(row+1)*4)));
  const {clusters} = result;
  assert.equal(fits.length,clusters.iterations); // no extra preview from split-half fits
  const profiles = clusters.unitIds.map(id=>{
    const r = ids.indexOf(id), values = reference.rateHz.slice(r*4,(r+1)*4);
    const mean = values.reduce((a,b)=>a+b,0)/4, sd = Math.sqrt(values.reduce((s,b)=>s+(b-mean)**2,0)/4);
    return Array.from(values,v=>(v-mean)/sd);
  });
  let previous = profiles.map(()=>null), expectedCenters = null;
  for (const [i,fit] of fits.entries()) {
    const centers = fit.centers.map(c=>c.values);
    if (expectedCenters) assert.deepEqual(centers,expectedCenters);
    const labels = profiles.map(curve=>{
      const distances = centers.map(c=>c.reduce((s,v,b)=>s+(v-curve[b])**2,0));
      return distances.indexOf(Math.min(...distances));
    });
    const tracked = clusters.unitIds.indexOf(15);
    assert.deepEqual(fit.points.map(p=>p.value),profiles[tracked]);
    assert.equal(fit.iteration,i+1);
    assert.equal(fit.group,labels[tracked]);
    assert.equal(fit.previousGroup,previous[tracked]);
    assert.equal(fit.changed,labels.filter((c,j)=>c!==previous[j]).length);
    assert.deepEqual(fit.sizes,centers.map((_,j)=>labels.filter(c=>c===j).length));
    expectedCenters = centers.map((_,j)=>profiles[0].map((_,b)=>
      profiles.reduce((s,curve,u)=>s+(labels[u]===j ? curve[b] : 0),0)/fit.sizes[j]));
    previous = labels;
  }
  assert(fits.at(-1).converged);
  assert.deepEqual(previous,clusters.labels);
  const after = E.responseSummary(reference,clusters).unitOrder;
  assert.deepEqual(after,E.responseSummary(E.conditionResponse(result.response,'right'),clusters).unitOrder);
  assert.deepEqual(order.groups.map(g=>[g.firstRow,g.size]),E.responseSummary(reference,clusters).groups.map(g=>[after.indexOf(g.unitIds[0])+1,g.unitIds.length]));
  for (const a of order.after) assert.equal(a.unitId,after[a.row-1]);
  for (const a of order.before) assert.equal(a.unitId,ids[a.row-1]);
  assert.equal(order.afterRow,after.indexOf(15)+1);
  assert.equal(order.beforeRow,ids.indexOf(15)+1);

  const silent = (await run({traceUnitId:30})).frames;
  assert(silent[0].events.every(e=>e.spikeCount===0 && !e.spikes.length));
  assert(silent[1].bins.every(b=>b.hz===0 && b.count===0));
  assert(silent.filter(f=>f.stage==='cluster').every(f=>f.group===null && f.points.every(p=>p.value===null)));
  assert.equal(silent.at(-1).afterRow,ids.length);
  const ordinary = (await run({options:{...options,comparison:null},clusters:null,stability:null})).frames;
  assert.deepEqual(ordinary.map(f=>f.stage),['alignment','rates','order']);
  assert.equal(ordinary[1].trialCount,events.events.length);
  assert.equal(ordinary[1].referenceOutcome,null);
  assert.equal(ordinary.at(-1).beforeRow,ordinary.at(-1).afterRow);
  assert.deepEqual(ordinary.at(-1).groups,[{group:null,size:ids.length,firstRow:1}]);
  assert.equal((await run({traceUnitId:-999})).frames[0].unitId,51); // informative fallback
  const miss = (await run({options:{...options,comparison:{field:'direction',values:['right','left']}},traceUnitId:30,clusters:null,stability:null})).frames;
  assert.equal(miss[1].trialCount,3);
  assert.equal(miss[1].example.count,3);
  assert.equal(miss[1].example.hz,4);

  const longWindow = {...options,comparison:null,start:0,end:1,binWidth:1/256};
  const packed = Array.from({length:1024},(_,i)=>.5+i/1024);
  const bounded = [];
  const trace = E.createProcessTrace(p=>bounded.push(p),15);
  const dense = E.computeResponses([{unitId:15,spikes:packed}],events,longWindow,trace);
  E.clusterResponses(dense,{k:1,normalization:'rate'},trace);
  assert.equal(bounded[0].events[0].spikes.length,48);
  assert.equal(bounded[0].events[0].spikeCount,1024);
  assert.equal(bounded[0].events[0].spikes.at(-1),packed.at(-1));
  assert(bounded[1].bins.length<=64 && bounded[1].bins.some(b=>b.index===bounded[1].example.index));
  assert.equal(bounded[2].points.length,48);
  assert.equal(bounded[2].centers[0].values.length,48);
  assert.equal(E.validateResponsePlan(ids,events,options).cells,result.response.counts.length);
  assert.throws(()=>E.validateResponsePlan(ids,events,{...options,maxCells:4}),/memory limit/);
  assert.throws(()=>E.validateResponsePlan(ids,{...events,events:[{...events.events[0],start:2**51}]},
    {...options,start:0,end:1,binWidth:.25}),/timestamp resolution/);
  console.log('PASS: actual Worker alignment, reference counts/rates, k-means assignment centers and fixed rows; bounded, silent, unpaired and unchanged numeric outputs.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
