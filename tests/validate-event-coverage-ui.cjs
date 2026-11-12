// SPDX-License-Identifier: MIT
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const E=require('../scripts/event-analysis-core.js'),copy=x=>JSON.parse(JSON.stringify(x));
const baseCoverage={schema:'neuropixels-recording-coverage/1',timebase:'neural_seconds',recordingId:'rec',source:{kind:'NWB.units.obs_intervals',status:'source-reported'},units:[{unitId:7,intervals:[[0,10]]}]};
let restored,verifyError,verifyMutate,dialog;
const P={unpack:async()=>copy(restored),verifySources:async()=>{verifyMutate?.();if(verifyError)throw Error(verifyError);}};
const sandbox={window:{NeuropixelsEventAnalysis:E,NeuropixelsEventAnalysisStorage:P,NeuropixelExplorerCore:{}},document:{documentElement:{lang:'en'},body:{append(){}},createElement:()=>dialog},AbortController,JSON,DOMException};
vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/event-analysis-ui.js'),'utf8'),sandbox);
const UI=sandbox.window.NeuropixelsEventAnalysisUI;
function fixture(){
 const fields=Object.fromEntries(['unitIds','coverage','source','activeOnly','subject','track','start','end','binWidth','eventType','k','seed','normalization','stability'].map(k=>[k,{value:'',checked:false,disabled:false,replaceChildren(){}}]));
 fields.unitIds.value='7';fields.source.value='experiment';fields.start.value='-1';fields.end.value='1';fields.binWidth.value='1';fields.eventType.value='stim';fields.k.value='0';
 const status={dataset:{},textContent:''},listeners={};dialog={open:false,addEventListener:(n,f)=>listeners[n]=f,querySelector:s=>s.startsWith('[name=')?fields[s.match(/name="([^"]+)"/)[1]]:s==='[data-ea-status]'?status:{disabled:false,hidden:false},querySelectorAll:()=>[],close(){this.open=false;}};
 const ui=new UI({state:{datasetToken:'token',activeRecording:{key:'rec',spikeTimesFile:{name:'times'},spikeClustersFile:{name:'ids'},byName:new Map()},experimentView:{selectedUnitId:9}},button:{},annotations:{doc:null},video:{mapping:{toJSON:()=>({})}},getUnits:()=>[{id:7},{id:9}]});
 ui.coverage=copy(baseCoverage);ui.resultPanel={replaceChildren(){}};ui.source=()=>({schema:E.SCHEMA,recordingId:'rec',timebase:'neural_seconds',events:[{id:'e',sourceId:'e',sourceKind:'experiment',kind:'point',type:'stim',start:2}]});
 return {ui,fields,status,change:name=>listeners.change({target:{name}})};
}
let checks=0;async function test(name,fn){await fn();checks++;}
(async()=>{
 await test('source proof stays source-reported when unchanged',()=>{const{ui}=fixture();ui.sourceCoverage();assert.deepEqual(ui.coverageIntervals([7]),[[0,10]]);assert.equal(ui.coverageProof.unitIds,'7');});
 await test('Unit change listener clears automatically populated coverage',async()=>{const{ui,fields,change}=fixture();ui.sourceCoverage();fields.unitIds.value='9';change('unitIds');assert.equal(fields.coverage.value,'');assert.equal(ui.coverageProof,null);await ui.run();assert(!ui.result&&!ui.worker);});
 for(const action of ['selected','all'])await test('Unit action clears source coverage: '+action,()=>{const{ui,fields}=fixture();ui.sourceCoverage();ui.action(action);assert.equal(fields.coverage.value,'');assert.equal(ui.coverageProof,null);});
 await test('failed source lookup clears prior text and results',async()=>{const{ui,fields}=fixture();ui.sourceCoverage();ui.result={old:true};fields.unitIds.value='9';ui.sourceCoverage();assert.equal(fields.coverage.value,'');assert.equal(ui.coverageProof,null);assert.equal(ui.result,null);await ui.run();assert(!ui.worker);});
 await test('direct Unit change cannot silently downgrade source proof',()=>{const{ui,fields}=fixture();ui.sourceCoverage();fields.unitIds.value='9';assert.throws(()=>ui.coverageIntervals([9]),/Unit 9/);assert.equal(fields.coverage.value,'');assert.equal(ui.coverageProof,null);});
 await test('changed source interval is checked again before running',()=>{const{ui,fields}=fixture();ui.sourceCoverage();ui.coverage.units[0].intervals=[[1,9]];assert.throws(()=>ui.coverageIntervals([7]),/changed/);assert.equal(fields.coverage.value,'');});
 await test('wrong Recording coverage is checked again',()=>{const{ui,fields}=fixture();ui.sourceCoverage();ui.coverage.recordingId='other';assert.throws(()=>ui.coverageIntervals([7]),/another recording/);assert.equal(fields.coverage.value,'');});
 await test('explicit manual edit remains manual and usable',()=>{const{ui,fields,change}=fixture();ui.sourceCoverage();fields.coverage.value='[[1,8]]';change('coverage');assert.equal(ui.coverageProof,null);fields.unitIds.value='9';change('unitIds');assert.deepEqual(ui.coverageIntervals([9]),[[1,8]]);ui.action('all');assert.equal(fields.coverage.value,'[[1,8]]');});
 await test('failed source lookup does not keep preceding manual input',()=>{const{ui,fields}=fixture();fields.unitIds.value='9';fields.coverage.value='[[0,20]]';ui.sourceCoverage();assert.equal(fields.coverage.value,'');});
 function setupRestore(ui,origin='source-reported-unit-intersection'){
  restored={response:{unitIds:[7],parameters:{coverage:[[0,10]],start:-1,end:1,binWidth:1,eventType:'stim',activeOnly:false}},provenance:{coverageOrigin:origin},input:{sourceKind:'experiment'},clusters:null};
  ui.getSavedAnalysis=async()=>new Blob(['test']);ui.populateFilters=()=>{};ui.populateTypes=()=>{};ui.renderResult=()=>{};verifyError=null;verifyMutate=null;
 }
 await test('failed source coverage restoration clears restored input',async()=>{const{ui,fields}=fixture();setupRestore(ui);ui.coverage.units=[];await ui.restore(ui.state.activeRecording,ui.epoch);assert.equal(fields.coverage.value,'');assert.equal(ui.coverageProof,null);assert(!ui.result);});
 await test('failed source verification clears restored coverage',async()=>{const{ui,fields}=fixture();setupRestore(ui);verifyError='Source content changed';await ui.restore(ui.state.activeRecording,ui.epoch);assert.equal(fields.coverage.value,'');assert.equal(ui.coverageProof,null);assert(!ui.result);});
 await test('failed manual-analysis restore needs fresh explicit coverage',async()=>{const{ui,fields}=fixture();setupRestore(ui,'user-declared-unverified');verifyError='Source content changed';await ui.restore(ui.state.activeRecording,ui.epoch);assert.equal(fields.coverage.value,'');assert(!ui.result);});
 await test('stale restore context clears coverage before returning',async()=>{const{ui,fields}=fixture();setupRestore(ui);verifyMutate=()=>ui.annotations.doc={changed:true};await ui.restore(ui.state.activeRecording,ui.epoch);assert.equal(fields.coverage.value,'');assert.equal(ui.coverageProof,null);assert(!ui.result);});
 await test('cancelled restore clears partially restored manual coverage',async()=>{const{ui,fields}=fixture();setupRestore(ui,'user-declared-unverified');verifyMutate=()=>{ui.cancel(false);throw new DOMException('Cancelled','AbortError');};await ui.restore(ui.state.activeRecording,ui.epoch);assert.equal(fields.coverage.value,'');assert(!ui.result);assert(!ui.restoring);});
 await test('older restore does not clear a later manual input',async()=>{const{ui,fields}=fixture();setupRestore(ui);verifyMutate=()=>{ui.cancel(false);fields.coverage.value='[[2,8]]';};await ui.restore(ui.state.activeRecording,ui.epoch);assert.equal(fields.coverage.value,'[[2,8]]');assert(!ui.result);});
 await test('successful source restore retains verified proof',async()=>{const{ui,fields}=fixture();setupRestore(ui);await ui.restore(ui.state.activeRecording,ui.epoch);assert(ui.result);assert.equal(fields.coverage.value,'[[0,10]]');assert.equal(ui.coverageProof.unitIds,'7');});
 console.log(JSON.stringify({status:'PASS',checks,scope:'Actual event UI listeners/actions, source/manual coverage origin, selection changes, failure and restore fail-closed guards'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
