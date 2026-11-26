// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict');
const {readAllenEvents}=require('../scripts/browser-nwb-worker.js');

const group=children=>({get:key=>children[key],keys:()=>Object.keys(children)});
const table=columns=>group(Object.fromEntries(Object.entries(columns).map(([k,value])=>[k,{value,shape:[value.length]}])));
const frames=[40,24,19,33,63,40,96,96,70,88,81];
const presentations={
  id:frames.map((_,i)=>i+1), start_time:frames.map((_,i)=>10+i),
  start_frame:frames, image_name:frames.map(()=> 'im'),
  active:[1,1,1,1,1,0,1,1,1,1,1], is_change:frames.map(()=>1)
};
const trials={
  id:[820,821,822,823,824,825,826,827,828], start_time:[2,1,4,5,9,15,16,17,18],
  change_frame:[24n,33n,40n,96n,70n,70n,88n,81n,-99n],
  go:[1,0,1,1,1,1,1,1,0], hit:[0,0,1,1,1,1,1,1,0],
  miss:[1,0,0,0,0,0,1,0,0], auto_rewarded:[0,1,0,0,0,0,0,NaN,0]
};
function extract(trialColumns,imageColumns=presentations){
  return readAllenEvents(group({intervals:group({trials:table(trialColumns),images:table(imageColumns)})}),'rec','fixture');
}
const extractChanges=result=>result.events.filter(e=>e.type==='image_change');
const result=extract(trials), changes=extractChanges(result);
assert.ok(changes.every(e=>!('trial_outcome' in e.conditions)));
assert.ok(result.events.every(e=>!('hit' in e.conditions) && !('miss' in e.conditions)));
assert.equal(changes[0].start,10);
assert.equal(changes[0].id,'images:1:0');
assert.deepEqual(changes[0].trial,{sourceTable:'intervals/trials',sourceId:'822',row:2,changeFrame:40});
assert.equal(result.source.trialLinks.eligible,10);
assert.equal(result.source.trialLinks.matched,5);
assert.deepEqual(result.source.trialLinks.unresolved,{no_matching_trial:2,duplicate_active_presentation_frame:2,duplicate_trial_frame:1});
const onlyFrames={id:trials.id,start_time:trials.start_time,change_frame:trials.change_frame};
assert.deepEqual(extractChanges(extract(onlyFrames)).map(e=>e.trial),changes.map(e=>e.trial));
assert.equal(extractChanges(extract({id:[1],start_time:[1]})).length,frames.length);
assert.ok(extractChanges(extract(trials,{...presentations,start_frame:[]})).every(e=>!e.trial));
const skipped={shape:[2,64],get value(){throw Error('matrix data must not be read');}};
const ragged={shape:[2],get value(){throw Error('ragged data must not be read');}};
const tasks=group({start_time:{shape:[2],value:[1,2]},direction:{shape:[2],value:['L','R']},
  dose:{shape:[2],value:[1,2]},group_code:{shape:[2],value:['1','2']},batch_index:{shape:[2],value:[91n,92n]},
  illuminated:{shape:[2],metadata:{enum_type:{members:{FALSE:0,TRUE:1}}},value:[0,1]},
  multidimensional:skipped,lick_times:ragged,lick_times_index:ragged,missing:{shape:[2],value:[NaN,NaN]}});
const custom=readAllenEvents(group({intervals:group({task:tasks,oversized:group({start_time:{shape:[100001],get value(){throw Error('oversized table must not be read');}}})})}),'rec','fixture');
assert.deepEqual(custom.events.map(e=>({...e.conditions})),[
  {direction:'L',dose:1,group_code:'1',batch_index:91,illuminated:false},
  {direction:'R',dose:2,group_code:'2',batch_index:92,illuminated:true}]);
assert.equal(custom.excluded.at(-1).reason,'event_limit_exceeded');
const col=value=>({shape:[value.length],value});
const typed=(type,children)=>({...group(children),attrs:{neurodata_type:{value:type}}});
const poisonous=()=>({shape:[10000],get value(){throw Error('continuous samples must not be read as events');}});
const containers={
  acquisition:group({notes:typed('AnnotationSeries',{timestamps:col([1,2,3]),data:col(['open','close','open'])}),
    voltage:typed('ElectricalSeries',{timestamps:poisonous(),data:poisonous()})}),
  processing:group({behavior:group({
    triggers:typed('BehavioralEvents',{port:typed('TimeSeries',{timestamps:col([1.1,5.3]),data:col([1,0])})}),
    running:typed('BehavioralTimeSeries',{speed:typed('TimeSeries',{timestamps:poisonous()})})})}),
  intervals:group({trials:table({start_time:[.1],stop_time:[.9],image_name:['scene'],is_change:[1],trial_outcome:['turned left']}),
    movements:table({start_time:[.4],stop_time:[.45],label:['turn']})}),
  events:group({scored:table({id:[7,8,9],timestamp:[.3,.5,.8],duration:[NaN,.25,-.1],annotation:['lift','hold','bad'],confidence:[.7,.9,0]})})
};
const standard=readAllenEvents(group(containers),'rec','fixture','NWB');
assert.equal(standard.source.kind,'NWB');
assert.equal(standard.events.find(e=>e.type==='trials').conditions.trial_outcome,'turned left');
require('../scripts/event-analysis-core.js').validateEventSet(standard,'rec');
assert.deepEqual(standard.events.map(e=>e.type),['trials','turn','lift','hold','open','close','open','port','port']);
assert.deepEqual(standard.events.filter(e=>e.sourceTable==='events/scored').map(e=>[e.sourceId,e.kind,e.start,e.end,e.conditions.confidence]),[['7','point',.3,null,.7],['8','interval',.5,.75,.9]]);
assert.deepEqual(standard.events.filter(e=>e.type==='port').map(e=>e.start),[1.1,5.3]);
assert.deepEqual(standard.excluded,[{sourceTable:'events/scored',sourceId:'9',reason:'invalid_interval'}]);
console.log('PASS: Allen frame-only trial identity, generic interval and event tables, typed annotation/behavior series and continuous-data exclusion');
