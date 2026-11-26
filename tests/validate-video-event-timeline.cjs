// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {VideoEventTimeline,projectRows,zoomed,near}=require('../scripts/video-event-timeline');
const {TimeMapping,VideoSyncController}=require('../scripts/video-sync');

const mapping=new TimeMapping({provenance:{frame_clock:{video_s:[1,6,9],neural_s:[11,16,22]}}});
const video={source:{duration:10},recording:{duration:90},mapping};
const interval=(id,start,end)=>({id,label:id,start,end});
const point=(id,start)=>({...interval(id,start,start),point:true});

test('recording points and overlapping intervals are projected through the frame clock',()=>{
  const rows=[point('before',10.9),interval('cross',10,22.5),point('lick',20),point('after',22.01)];
  const markers=projectRows(rows,10,video);
  assert.deepEqual(markers.map(x=>[x.row.id,x.start,x.end]),[['cross',1,9],['lick',8,8]]);
  assert.equal(near(markers,8,.02).row.id,'lick');
  assert.equal(near(markers,.8,.02),null);
  assert.equal(markers[0].row.start,10);
  const neuralOnly=projectRows(rows,90,{source:null,recording:video.recording});
  assert.deepEqual(neuralOnly.map(x=>x.start),[10,10.9,20,22.01]);
});

test('media-local clips remain editable beyond both ends of the frame clock',()=>{
  const doc={segments:[{id:'before',start:0,end:.8,subject:'a',track:'side'},{id:'cross',start:7,end:9.4,subject:'a',track:'side'},
    {id:'after',start:9.8,end:9.98,subject:'b',track:'top'}]};
  const editor={doc},api={label:(_,s)=>s.id,color:()=>'#eee'},ctx={video,editor};
  const previous=global.window;
  try{
    global.window={NeuropixelsAnnotations:api};
    const rows=VideoEventTimeline.prototype.annotationRows.call(ctx);
    assert.deepEqual(rows.map(r=>[r.start,r.end]),[[null,null],[18,22],[null,null]]);
    assert.deepEqual(projectRows(rows,10,video).map(m=>[m.start,m.end]),[[0,.8],[7,9.4],[9.8,9.98]]);
    assert.deepEqual(VideoEventTimeline.prototype.annotationRows.call(ctx,JSON.stringify(['b','top'])).map(r=>r.id),['after']);
  }finally{global.window=previous;}
});

test('detail zoom is pointer-centered, bounded at one frame and decoupled from seek',()=>{
  const range={start:0,end:10};
  assert.deepEqual(zoomed(range,2,.5,10,1/30),{start:1,end:6});
  const nearStart=zoomed(range,0,.0001,10,1/30);
  assert.equal(nearStart.start,0);assert.equal(nearStart.end,1/30);
  assert.deepEqual(zoomed({start:4,end:6},5,20,10,1/30),range);
  assert.deepEqual(range,{start:0,end:10});
});

test('manual points retain their video times, including clock boundaries, and remain hittable within intervals',()=>{
  const doc={segments:[0,1,8,9,10].map(t=>({id:'p'+t,start:t,end:t,kind:'point'}))};
  const previous=global.window;
  try{
    global.window={NeuropixelsAnnotations:{label:(_,s)=>s.id,color:()=>'#a4c'}};
    const rows=VideoEventTimeline.prototype.annotationRows.call({editor:{doc},video});
    assert.deepEqual(rows.map(r=>[r.start,r.end,r.patternEligible]),[[null,null,false],[11,11,true],[20,20,true],[22,22,true],[null,null,false]]);
    const markers=projectRows([...rows,{id:'long',videoStart:1,videoEnd:9}],10,video);
    assert.deepEqual(markers.filter(m=>m.point).map(m=>[m.start,m.end]),[[0,0],[1,1],[8,8],[9,9],[10,10]]);
    assert.equal(near(markers,8.01,.02).row.id,'p8');
    assert.equal(near(markers,7.95,.02).row.id,'long');
  }finally{global.window=previous;}
});

test('rejected or superseded real-video playback reports failure only for the owning request',async()=>{
  let reject,resolve,errors=0;
  const media={paused:false,play:()=>new Promise((a,b)=>{resolve=a;reject=b;})};
  const ctx={source:{duration:10,kind:'file'},currentVideoTime:3,playbackRate:1,playRevision:0,elements:{video:media},t:s=>s,_renderError:()=>errors++};
  const play=()=>VideoSyncController.prototype.play.call(ctx);
  const old=play();ctx.playRevision++;ctx.source={duration:10,kind:'file'};reject(Error('old media'));
  assert.equal(await old,false);assert.equal(errors,0);
  const blocked=play();reject(Error('permission'));assert.equal(await blocked,false);assert.equal(errors,1);
  const next=play();resolve();assert.equal(await next,true);
  ctx.source=null;assert.equal(await play(),false);
});
