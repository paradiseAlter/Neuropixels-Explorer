// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {npy}=require('../scripts/browser-nwb-worker');
const root=path.resolve(__dirname,'..');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage();
    await page.goto(pathToFileURL(path.join(root,'README.md')).href);
    await page.setContent('<html lang="en"><body></body></html>');
    await page.addStyleTag({path:path.join(root,'styles','event-analysis.css')});
    for(const name of ['kilosort-core','event-analysis-core','event-analysis-storage','joint-recording',
      'analysis-unit-picker','event-analysis-review','event-figures','event-analysis-process','event-analysis-ui']){
      await page.addScriptTag({path:path.join(root,'scripts',name+'.js')});
    }
    const packed=rows=>Array.from(new Uint8Array(npy(Int32Array.from(rows),'<i4')));
    const merged=await page.evaluate(async([a,b,clusters])=>{
      const J=NeuropixelsJointRecording,E=NeuropixelsEventAnalysis,core=NeuropixelExplorerCore;
      const spikeFile=(name,data)=>new File([Uint8Array.from(data)],name);
      const file=(name,obj)=>new File([JSON.stringify(obj)],name);
      const shared={id:'shared',sourceId:'trial-1',sourceKind:'experiment',type:'image_change',kind:'point',start:.1};
      const make=(key,ticks,rate,quiet,end)=>({
        recording:{key,name:key,sampleRate:rate,spikeTimesFile:spikeFile('spike_times.npy',ticks),
          spikeClustersFile:spikeFile('spike_clusters.npy',clusters),
          eventsFile:file('explorer-events.json',{schema:E.SCHEMA,timebase:'neural_seconds',recordingId:key,events:[shared]}),
          coverageFile:file('explorer-coverage.json',{schema:'neuropixels-recording-coverage/1',recordingId:key,timebase:'neural_seconds',
            source:{kind:'NWB.units.obs_intervals',status:'source-reported'},units:[7,quiet].map(unitId=>({unitId,intervals:[[0,end]]}))})},
        probeName:key,units:[{id:7,depthUm:10},{id:quiet,depthUm:20}]});
      const rec=window.rec=await J.makeRecording([make('B',b,4,42,8),make('A',a,2,99,10)],'joint',null,()=>{});
      const refs=['A','B'].map(recordingKey=>({recordingKey,unitId:7})),ids=J.analysisIds(rec,refs);
      const trains=await core.readSelectedUnitTrains({spikeTimes:rec.spikeTimesFile,spikeClusters:rec.spikeClustersFile},1,ids);
      const events=E.validateEventSet(JSON.parse(await rec.eventsFile.text()),rec.key);
      const coverage=E.commonCoverage(JSON.parse(await rec.coverageFile.text()),ids,rec.key);
      const longKey=await J.scopeKey(['a'.repeat(250),'b'.repeat(250)]);
      return {ids,trains:trains.map(t=>Array.from(t.spikes)),origins:ids.map(id=>J.originalUnit(rec,id).unitId),
        spikeCount:rec.spikeCount,events:events.events.length,coverage:coverage.intervals,
        sourceOrder:rec.jointSources,longKey,rounded:await J.scopeKey(['b'.repeat(250),'a'.repeat(250)])};
    },[packed([1,2,4]),packed([1,2,6]),packed([7,7,7])]);
    assert.deepEqual(merged.sourceOrder,['A','B']);
    assert.equal(merged.spikeCount,6);assert.equal(merged.events,1);
    assert.deepEqual(merged.coverage,[[0,8]]);
    assert(merged.ids.every(id=>id<0));assert.equal(new Set(merged.ids).size,2);
    assert.deepEqual(merged.origins,[7,7]);assert.deepEqual(merged.trains,[[.5,1,2],[.25,.5,1.5]]);
    assert.equal(merged.longKey,merged.rounded);assert(merged.longKey.length<200);
    await page.evaluate(async()=>{
      const owner='video:side',scheme='manual',segment='first';
      const doc={schema:'neuropixels-annotations/1',activeSchemeId:scheme,context:{recordingKey:owner},
        schemes:[{id:scheme,labels:{[segment]:'start'}}],
        segments:[{id:segment,start:.1,end:.2,subject:'mouse',track:'behavior'}]};
      const ui=window.ui=new NeuropixelsEventAnalysisUI({state:{activeRecording:rec,datasetToken:1,
        experimentView:{selectedUnitId:rec.units[0].cluster_id,selectedInterval:{start:12,end:15,unitIds:[rec.units[0].cluster_id]}}},button:document.createElement('button'),
        video:{source:{descriptor:{annotationRecordingKey:owner}},mapping:{videoToNeural:t=>t,neuralToVideo:t=>t,toJSON:()=>({})}},
        annotations:{doc},preferredLabels:()=>({source:'annotation',type:'start'}),getUnits:()=>rec.units.map(u=>({id:u.cluster_id})),
        canSave:()=>false,returnToSource:()=>{}});
      await ui.open();
      window.planned={start:ui.input('start').value,end:ui.input('end').value,time:ui.input('timeScope').value,k:ui.input('k').value};
    });
    await page.locator('[data-ea-run]').click();
    await page.waitForFunction(()=>ui.result || ui.dialog.querySelector('[data-ea-status]').dataset.error==='true');
    const early=await page.evaluate(()=>({planned,status:ui.dialog.querySelector('[data-ea-status]').textContent,
      shape:ui.result?.response.shape,start:ui.result?.response.events[0].start,k:ui.result?.clusters?.k??0,scope:ui.dialog.querySelector('[data-ea-unit-choice]').value}));
    assert.deepEqual(early.planned,{start:'-0.1',end:'1',time:'all',k:'0'});
    assert.deepEqual(early.shape,[4,1,22],early.status);assert.equal(early.start,.1);assert.equal(early.k,0);assert.equal(early.scope,'all');
    const unit=merged.ids[1];
    await page.locator('[data-ea-unit="'+unit+'"]').click();
    await page.evaluate(id=>{
      const response=ui.result.response;
      ui.review.eventId=response.eventIds[0];ui.review.remember();
      window.original=response;
      window.originalView=JSON.stringify(ui.result.view);
      window.originalOrder=ui.summary.unitOrder.slice();
      if(!ui.responseTrains.get(response).some(([u,s])=>u===id&&s instanceof Float64Array))throw Error('Raw trains missing');
    },unit);
    await page.locator('[data-ea-action="shape-groups"]').click();
    await page.waitForFunction(()=>ui.result?.clusters);
    assert(await page.evaluate(()=>ui.result.response===original && JSON.stringify(ui.result.view)===originalView));
    await page.locator('[data-ea-action="shape-groups"]').click();
    assert(await page.evaluate(()=>!ui.result.clusters && ui.result.response===original && JSON.stringify(ui.summary.unitOrder)===JSON.stringify(originalOrder) && JSON.stringify(ui.result.view)===originalView));
    // Selection while the optional fit is running must win over its launch state.
    await page.evaluate(id=>{
      ui.toggleGrouping();
      if(!ui.worker)throw Error('Grouping did not start');
      ui.review.revealUnit(id);
      ui.review.eventId=ui.result.response.eventIds[0];ui.review.remember();
    },merged.ids[0]);
    await page.waitForFunction(()=>ui.result?.clusters);
    assert.deepEqual(await page.evaluate(()=>ui.result.view.unitIds),[merged.ids[0]]);
    assert.equal(await page.evaluate(()=>ui.result.view.eventId===ui.result.response.eventIds[0]),true);
    // A late fingerprint failure from the previous label must never cancel the new label.
    await page.evaluate(async()=>{
      const store=NeuropixelsEventAnalysisStorage,fingerprint=store.sourceFingerprints;
      ui.events.events.push({...ui.events.events[0],id:'second',type:'second'});
      const waiting=new Promise(resolve=>{
        store.sourceFingerprints=(...args)=>{
          store.sourceFingerprints=fingerprint;resolve();
          return new Promise((_,reject)=>window.failFirst=()=>reject(Error('old label read failed')));
        };
      });
      ui.input('source').value='experiment';ui.input('source').dispatchEvent(new Event('change',{bubbles:true}));
      ui.input('eventType').value=ui.events.events[0].type;ui.input('eventType').dispatchEvent(new Event('change',{bubbles:true}));
      const firstRun=ui.run();
      await waiting;
      ui.input('eventType').value='second';ui.input('eventType').dispatchEvent(new Event('change',{bubbles:true}));
      const secondRun=ui.run();
      window.failFirst();
      await Promise.all([firstRun,secondRun]);
    });
    await page.waitForFunction(()=>ui.result?.response.parameters.eventType==='second');
    assert.deepEqual(await page.evaluate(()=>({units:ui.result.response.unitIds.length,k:ui.result.clusters?.k??0,selected:ui.result.view?.unitIds||[]})),{units:4,k:0,selected:[]});
    await page.evaluate(async()=>{ui.input('timeScope').value='selection';await ui.run();});
    assert.match(await page.locator('[data-ea-status]').innerText(),/No matching events in this recording interval/);
    assert.equal(await page.evaluate(()=>ui.result.response.parameters.eventType),'second');
    console.log('PASS joint spike times, duplicate Unit identities, event deduplication, coverage and near-zero video annotation defaults');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
