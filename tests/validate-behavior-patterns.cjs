// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const P=require('../scripts/behavior-patterns-core.js');
const {npy}=require('../scripts/browser-nwb-worker.js');

(async()=>{
  const stamps=[[1,.25,4],[1,.5,7],[1,.75,4],[4,.25,4],[4,.5,7],[4,.75,4],[7,.25,7],[7,.5,4],[7,.75,7],
    [9,.25,4],[9,.25,4],[9,.5,7],[9,.5,7],[9,.75,4],[9,.75,4],[12,0,4],[12,.25,4],[12,.5,4],[12,.75,4]];
  const file=(data,descr)=>new Blob([npy(data,descr)]);
  const m={times:file(Float64Array.from(stamps,r=>(r[0]+r[1])*1000),'<f8'),clusters:file(Int32Array.from(stamps,r=>r[2]),'<i4'),
    unitIds:[4,7,8],sampleRate:1000,duration:20,recordingId:'rec',coverage:null,
    events:[.1,1,1.125,4,7,9,12,15].map((start,i)=>({id:'e'+i,start})),otherEvents:[{id:'reward',start:9}],
    options:{bin:.25,before:1,after:1,boutGap:.3,boutsOnly:true}};
  const s=await P.compute(m),r=s.result;
  assert.deepEqual(r.events.map(e=>e.id),['e1','e3','e4','e5','e6','e7']);
  assert.equal(r.groups.earlyBouts,3);assert.equal(r.groups.lateBouts,3);
  assert.equal(r.groups.excluded[0].eventId,'e0');assert.equal(r.events[0].boutSize,2);
  assert.equal(r.coverage.origin,'unknown-continuous-assumption');
  for(const [u,unit] of r.unitIds.entries()){
    const independent=r.events.map(e=>Array.from({length:r.bins},(_,i)=>stamps.filter(([t,dx,id])=>
      id===unit && t+dx>=e.anchor-1+i*.25 && t+dx<e.anchor-1+(i+1)*.25).length));
    const mean=independent.reduce((a,row)=>a.map((n,i)=>n+row[i]),Array(r.bins).fill(0)).map(c=>c/(r.events.length*.25));
    const baseline=mean.slice(0,4).reduce((a,b)=>a+b)/4;
    assert.deepEqual([...r.meanHz.slice(u*r.bins,(u+1)*r.bins)],mean);
    assert.deepEqual([...r.deltaHz.slice(u*r.bins,(u+1)*r.bins)],mean.map(v=>v-baseline));
  }
  const detail=P.detail(s,{unitIds:[4,7],eventIds:['e1','e4']});
  assert.deepEqual([...detail.spikes[0].times],[.25,.75]);assert.deepEqual([...detail.spikes[2].times],[.5]);
  const q={eventId:'e1',unitIds:[4,7],start:0,end:1};
  const freq=P.recurrence(s,q);
  assert.deepEqual([...freq.hits],[1,4,2,4,0,1,3,1]);
  assert.equal(freq.total,6);assert.equal(freq.exemplar,'e1');
  const pair=P.preview(s,{unitIds:[4,7],reference:[1,2],candidate:[7,8]});
  assert.deepEqual([...pair.spikes[0][0]],[.25,.75]);assert.deepEqual([...pair.spikes[1][0]],[.5]);
  const query=P.query(s,q);
  assert.deepEqual(query.ranked.map(x=>[x.eventId,x.score]),[['e3',1],['e5',.8],['e4',0]]);
  assert.deepEqual(query.scoreSummaries.candidates,{n:3,median:.8,p90:1});
  assert.equal(query.eligible+Object.values(query.excluded).reduce((a,b)=>a+b),query.total);
  assert.equal(query.otherScores[0].score,.8);
  assert.equal(query.video,null);
  const visible=P.query(s,{...q,videoRange:[7,10]}).video;
  assert.deepEqual([visible.eligible,visible.total],[2,3]);
  assert.deepEqual(visible.similar.map(e=>e.eventId),['e5']);
  assert.deepEqual(visible.different.map(e=>e.eventId),['e4']);
  assert.deepEqual(visible.otherStats,{eligible:1,total:1});
  assert.equal(visible.otherScores[0].eventId,'reward');
  assert.deepEqual(visible.scoreSummaries.candidates,{n:2,median:.4,p90:.8});
  const cut=P.query(s,{...q,videoRange:[7.01,9.99]}).video;
  assert.equal(cut.eligible,0);assert.equal(cut.otherStats.eligible,0);
  assert(query.similar.length && query.different.length);
  assert(!query.ranked.some(e=>e.eventId===q.eventId));assert.equal(query.excluded.lowInformation,2);
  assert.throws(()=>P.query(s,{...q,unitIds:[8]}),/too little/);
  assert.throws(()=>P.query(s,{...q,eventId:'e6'}),/too little/);
  const scan=P.query(s,{unitIds:[4,7],absoluteStart:1,absoluteEnd:2,scope:'recording'});
  assert(scan.stride>0);assert(scan.similar.some(e=>e.score===1&&e.segmentStart===4));
  assert(scan.similar.every(c=>c.segmentEnd<=1||c.segmentStart>=2));
  const scanVideo=P.query(s,{unitIds:[4,7],absoluteStart:1,absoluteEnd:2,scope:'recording',videoRange:[8.5,10.5]}).video;
  assert(scanVideo.eligible>0 && scanVideo.total===scan.eligible);
  assert([...scanVideo.similar,...scanVideo.different,...scanVideo.otherScores,...scanVideo.backgroundScores]
    .every(e=>e.segmentStart>=8.5&&e.segmentEnd<=10.5));
  const unlabeled=await P.compute({...m,events:[]});
  assert.equal(unlabeled.result.groups.eligible,0);
  assert(Number.isNaN(unlabeled.result.meanHz[0]));
  assert(P.query(unlabeled,{unitIds:[4,7],absoluteStart:1,absoluteEnd:2,scope:'recording'}).similar.some(x=>x.score===1));
  const tracks=await P.compute({...m,events:[
    {id:'a',start:4,track:'left'}, {id:'b',start:4.1,track:'right'},
    {id:'c',start:4.2,track:'left'}, {id:'d',start:4.3,track:'right'}]});
  assert.deepEqual(tracks.result.events.map(e=>[e.id,e.boutSize]),[['a',2],['b',2]]);
  const sparse=P.recurrence(tracks,q);assert.equal(sparse.total,1);assert.equal(sparse.exemplar,null);
  const limited=await P.compute({...m,coverage:[[2,11]],options:{...m.options,boutsOnly:false}});
  assert(limited.result.events.every(e=>e.anchor-1>=2 && e.anchor+1<=11));
  await assert.rejects(P.compute({...m,coverage:{schema:'invalid'}}),/coverage/i);
  await assert.rejects(P.compute({...m,clusters:file(Int32Array.of(4),'<i4')}),/Unpaired/);
  await assert.rejects(P.compute({...m,times:file(Float64Array.from(stamps,(_,i)=>-i),'<f8')}),/Invalid or unsorted/);
  const replies=[],ctx={self:{postMessage:x=>replies.push(x)},TextDecoder,Uint8Array,DataView,Float64Array,Int32Array};
  vm.runInNewContext(P.workerSource(),ctx);
  await ctx.self.onmessage({data:{...m,action:'compute',requestId:42}});
  assert(!replies.at(-1).error,replies.at(-1).error);assert(replies.at(-1).result);assert.equal(replies.at(-1).requestId,42);
  await ctx.self.onmessage({data:{action:'query',requestId:43,...q}});
  assert.equal(replies.at(-1).query.ranked[0].score,1);
  console.log('PASS pattern Worker, true spike/Hz parity, bouts/coverage, chronology, held identities, energy-sensitive matching and independent full-recording scan.');
})().catch(e=>{console.error(e);process.exitCode=1;});
