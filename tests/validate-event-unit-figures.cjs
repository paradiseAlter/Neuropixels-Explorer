// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict');
require('../scripts/event-analysis-core');
require('../scripts/event-figures-units');
const figures=globalThis.NeuropixelsEventUnitFigures;
const model={lang:'en',unitIds:[14,8,31],unitName:id=>'Probe · Unit '+id,start:-.5,end:1,sides:[
  {label:'A',events:[{id:'a1',start:10},{id:'a2',start:20,trial:{sourceTable:'intervals/trials',sourceId:'822'}}]},
  {label:'B',events:[{id:'b1',start:30}]}]};
const trains=new Map([[14,Float64Array.from([9.625,10,10.0625,10.125,10.5,19.875,20.0625,30,30.125,31])],
  [8,new Float64Array()],[31,Float64Array.from([29.5,29.875,30.0625])]]);
const raster=figures.trialRaster(model,{unitIds:[31,14],eventIds:['a2','b1']},trains);
assert.deepEqual(raster.sides.map(s=>[s.event.id,s.trialNumber]),[['a2',2],['b1',1]]);
assert.deepEqual(raster.rows.map(r=>[r.unitId,r.spikes]),[
  [31,[[],[-.5,-.125,.0625]]],[14,[[-.125,.0625],[0,.125]]]]);
const captions=[];
const ctx=new Proxy({fillText:s=>captions.push(s),measureText:()=>({width:70})},{get:(obj,key)=>obj[key]??(()=>{})});
const hit=figures.drawL(ctx,{x:24,y:114,width:1072,height:474},raster,{light:true,palette:{series:['#52798c','#a05e36'],onset:'#333'}});
assert(captions.includes('Trial 2  ·  20.000 s  ·  NWB trial ID 822'));
assert(captions.includes('Trial 1  ·  30.000 s'));
assert.deepEqual(hit.map(h=>h.event.id),['a2','b1']);
// A window ending between two 125-ms bin edges must use raw timestamps.
const measure=figures.pairedRates(model,{start:0,end:.1,baseline:{start:-.5,end:0}},trains);
assert.deepEqual(measure.rows.map(r=>[r.rateHz,r.baselineHz]),[
  [[15,10],[2,0]],[[0,0],[0,0]],[[0,10],[0,4]]]);
assert.deepEqual(measure.change,{higher:1,lower:1,equal:1});
assert.equal(figures.pairedRates(model,{start:0,end:.125},trains).rows[0].rateHz[1],8);
assert.throws(()=>figures.trialRaster(model,{unitIds:[14],eventIds:['b1','a1']},trains),/trial/);
assert.throws(()=>figures.pairedRates(model,{start:-2,end:.1},trains),/interval/);
assert.throws(()=>figures.pairedRates(model,{start:0,end:.1,baseline:{start:-.25,end:.1}},trains),/baseline/);
assert.throws(()=>figures.pairedRates(model,{start:0,end:.1},new Map()),/spike times/);
console.log('PASS 5L fixed trials, ordered Units, half-open exact spikes; 5M unequal trial counts, off-bin rate windows, pre-event baselines, silent Units and paired changes.');
