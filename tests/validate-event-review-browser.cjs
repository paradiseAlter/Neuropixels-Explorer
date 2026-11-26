// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {npy}=require('../scripts/browser-nwb-worker.js');
const root=path.resolve(__dirname,'..');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root,'README.md')).href);
    await page.setContent('<html lang="en" style="--line: #77818a"><body></body></html>');
    for(const name of ['kilosort-core','joint-recording','probe-map','analysis-unit-picker','event-analysis-core','event-analysis-storage','event-analysis-review','event-figures','event-analysis-process','event-analysis-ui'])
      await page.addScriptTag({path:path.join(root,'scripts',name+'.js')});
    await page.addStyleTag({path:path.join(root,'styles/event-analysis.css')});
    await page.addStyleTag({path:path.join(root,'styles/event-analysis-process.css')});
    const conditions=['hit','miss','hit','miss','hit','miss','hit','auto_rewarded'];
    const stamps=conditions.flatMap((_,i)=>[[2+i-.11,11],[2+i+.061,22],[2+i+.084,22],[2+i+.155,33]]);
    const payload={conditions,times:[...new Uint8Array(npy(Float64Array.from(stamps,row=>row[0]),'<f8'))],
      ids:[...new Uint8Array(npy(Int32Array.from(stamps,row=>row[1]),'<i4'))]};
    await page.evaluate(async({conditions,times,ids})=>{
      const file=(name,bytes)=>new File([Uint8Array.from(bytes)],name);
      const recording={key:'rec',sampleRate:1,spikeTimesFile:file('spike_times.npy',times),spikeClustersFile:file('spike_clusters.npy',ids),
        byName:new Map([['params.py',new File(['sample_rate=1'],'params.py')]])};
      const events=conditions.map((trial_outcome,i)=>({id:'id'+i,sourceId:String(i),sourceKind:'experiment',
        sourceTable:'presentations',type:'image_change',kind:'point',start:2+i,conditions:{active:i<7,trial_outcome,stim_code:i===7?2:i%2?'0':0}}));
      events.push({...events[0],type:'other',id:'other'});
      recording.eventsFile=new File([JSON.stringify({recordingId:'rec',schema:'neuropixels-events/1',timebase:'neural_seconds',events})],'events.json');
      const ui=window.ui=new NeuropixelsEventAnalysisUI({state:{activeRecording:recording,datasetToken:'test',experimentView:{selectedUnitId:11}},
        video:{source:{duration:4},mapping:{neuralToVideo:t=>t,toJSON:()=>({})}},annotations:{doc:null},button:document.createElement('button'),
        highlightedUnits:()=>[11,33],getUnits:()=>[11,22,33].map((id,i)=>({id,depthUm:i*150,x:i,region:i===1?"B":"A"})),returnToSource:(unit,event)=>{window.lastSource={unit,id:event.id,time:event.start};}});
      ui.state.experimentView.selectedInterval={start:2,end:10};await ui.open();
    },payload);
    const heat=page.locator('[data-ea-units]');
    const raw=page.locator('[data-ea-raw]');
    const unit=id=>heat.locator('[data-ea-unit="'+id+'"]');
    const trial=index=>raw.locator('[data-ea-trial="'+index+'"]');
    const order=()=>heat.locator('[data-ea-unit]').evaluateAll(rows=>rows.map(r=>r.dataset.eaUnit));
    const group=page.locator('[data-ea-action="shape-groups"]');
    const controls=page.locator('[data-ea-inputs]');
    assert(await controls.evaluate(el=>el.open));
    assert.equal(await heat.count(),0);
    assert.equal(await page.locator('[name=eventType]').inputValue(),'');
    assert(await page.locator('[data-ea-run]').isDisabled());
    await page.locator('[name=eventType]').selectOption('image_change');
    const field=page.locator('[name=conditionField]');
    assert.equal(await field.locator('option[value=trial_outcome]').count(),0);
    assert.equal(await field.inputValue(),'');
    assert(!await page.locator('[name=activeOnly]').isChecked());
    await page.locator('[data-ea-run]').click();
    await heat.waitFor();
    assert.equal(await page.evaluate(()=>ui.result.response.events.length),8);
    assert.equal(await page.locator('[data-ea-condition]').count(),0);
    assert.deepEqual(await order(),['11','22','33']);
    assert.equal(await page.locator('[data-ea-unit-choice]').inputValue(),'all');
    assert.equal(await controls.evaluate(d=>d.open),false);
    assert.equal(await group.getAttribute('aria-pressed'),'false');
    assert(await page.locator('[data-ea-prompt]').isVisible());
    assert.equal(await page.locator('[data-ea-figure]').count(),0);
    assert.match(await page.locator('[data-ea-origin]').innerText(),/0 s = onset of image_change/);
    const panes=page.locator('[data-ea-pane]');
    const [left,right]=await panes.evaluateAll(nodes=>nodes.map(n=>({x:n.offsetLeft,y:n.offsetTop})));
    assert(right.x>left.x&&Math.abs(right.y-left.y)<8,'Heatmap and raster share the top row');

    // Optional source, subset and interval controls keep their original meaning.
    await controls.locator(':scope>summary').click();
    await field.selectOption('stim_code');
    assert(await page.locator('[data-ea-run]').isDisabled());
    await page.locator('[name=referenceValue]').selectOption('0');
    await page.locator('[name=comparisonValue]').selectOption('"0"');
    assert.deepEqual(await page.evaluate(()=>ui.chosenComparison()),{field:'stim_code',values:[0,'0']});
    assert.match(await page.locator('[data-ea-plan]').innerText(),/0 4 \/ "0" 3/);
    const choice=page.locator('[data-ea-unit-choice]');
    await choice.selectOption('selected');
    assert.equal(await page.locator('[name=unitIds]').inputValue(),'11, 33');
    await choice.selectOption('region:B');
    assert.equal(await page.locator('[name=unitIds]').inputValue(),'22');
    await page.locator('[name=timeScope]').selectOption('custom');
    await page.locator('[name=rangeStart]').fill('3');
    await page.locator('[name=rangeEnd]').fill('6');
    await page.locator('[data-ea-run]').click();
    await page.waitForFunction(()=>ui.result?.response.unitIds.length===1);
    const subset=await page.evaluate(()=>({ids:ui.result.response.unitIds,range:ui.result.response.parameters.eventRange,onsets:ui.result.response.events.map(e=>e.start)}));
    assert.deepEqual(subset,{ids:[22],range:[3,6],onsets:[3,4,5]});
    await controls.locator(':scope>summary').click();
    assert.equal(await page.locator('[name=rangeStart]').inputValue(),'3');
    await choice.selectOption('probe');
    await page.evaluate(()=>ui.unitPicker.map.pick([22]));
    await page.locator('[data-ea-commit-units]').click();
    assert.equal(await page.locator('[name=unitIds]').inputValue(),'22');
    await choice.selectOption('all');
    assert.equal(await page.locator('[name=timeScope]').inputValue(),'custom');
    await page.locator('[name=timeScope]').selectOption('selection');
    await page.evaluate(async()=>{
      ui.input('start').value='-0.2';ui.input('end').value='0.2';ui.input('binWidth').value='0.1';
      await ui.run();
    });
    await heat.waitFor();
    assert.deepEqual(await page.evaluate(()=>ui.result.response.parameters.eventRange),[2,10]);

    await unit(11).click();
    await unit(11).press('ArrowDown');
    await trial(0).locator('canvas[data-spike-unit="22"][data-spike-count="2"]').waitFor();
    assert(await unit(22).evaluate(el=>el===document.activeElement));
    const checkAxes=async()=>{
      for(const [paneName,axisSelector] of [['heat','[data-ea-scale]'],['trials','[data-ea-raster-axis]']]){
        const pane=page.locator('[data-ea-pane="'+paneName+'"]');
        const axis=pane.locator(axisSelector+' .ea-relative-axis');
        const plot=await pane.locator('.ea-review-row canvas').first().boundingBox();
        const scale=await axis.boundingBox();
        assert(scale.y+scale.height<=plot.y,'Time ticks remain above the first data row');
        assert(Math.abs(scale.x-plot.x)<2&&Math.abs(scale.width-plot.width)<2,JSON.stringify({paneName,scale,plot}));
        assert(plot.width>.5*(await pane.boundingBox()).width,'Most of each pane shows data');
        assert.match(await axis.innerText(),/0 s/);
      }
    };
    await checkAxes();
    await page.locator('#event-analysis-dialog').evaluate(el=>el.style.width='650px');
    await checkAxes();
    await page.locator('#event-analysis-dialog').evaluate(el=>el.style.removeProperty('width'));
    await unit(11).click({modifiers:['Control']});
    assert.equal(await trial(0).locator('canvas').count(),2);
    await group.click();
    await page.waitForFunction(()=>ui.result?.clusters);
    assert.equal(await group.getAttribute('aria-pressed'),'true');
    assert.deepEqual(await page.evaluate(()=>ui.review.selected),[22,11]);
    const grouped=await order();
    await require('./event-figure-checks.cjs')(page);
    await page.locator('[data-ea-group-details]>summary').click();
    assert((await page.locator('[data-ea-means] polyline:visible').count())>=2);
    await page.locator('[data-ea-group-picker]').selectOption('1');
    assert((await page.locator('[data-ea-means] polyline.ea-muted-mean').count())>=1);
    const second=page.locator('[data-ea-condition-index="1"]');
    await second.click();
    assert.equal(await page.locator('[data-ea-group-picker]').inputValue(),'1');
    assert.deepEqual(await order(),grouped);
    assert.deepEqual(await page.evaluate(()=>ui.result.view.unitIds),[22,11]);
    const row=trial(1);
    assert.equal(await row.getAttribute('data-event-id'),'id3');
    assert.match(await row.getAttribute('aria-label'),/Recording time 5\.000 s/);
    assert.equal(await row.getAttribute('data-video-covered'),'false');
    await row.focus();await row.press('Enter');
    assert.deepEqual(await page.evaluate(()=>window.lastSource),{unit:22,id:'id3',time:5});
    assert(await page.evaluate(()=>ui.returnFromSource()));
    assert.equal(await second.getAttribute('aria-pressed'),'true');
    const saved=page.waitForEvent('download');await page.locator('[data-ea-png]').click();
    assert.match((await saved).suggestedFilename(),/\.png$/);
    await group.click();
    await page.waitForFunction(()=>ui.result && !ui.result.clusters);
    assert.deepEqual(await order(),['11','22','33']);
    assert.deepEqual(await page.evaluate(()=>ui.review.selected),[22,11]);
    await unit(22).click();await unit(11).click();
    assert.deepEqual(await page.evaluate(()=>ui.result.view.unitIds),[]);
    assert(await page.locator('[data-ea-prompt]').isVisible());
    assert.equal(await page.locator('[data-ea-raster-content]').isVisible(),false);
    // Point and duration events without a two-condition reference use the same exact-spike view.
    for(const [start,end,onset] of [[0,.2,true],[-.2,0,true],[.05,.25,false],[-.25,-.05,false]]){
      await page.evaluate(async({start,end})=>{
        ui.input('conditionField').value='';ui.input('conditionField').dispatchEvent(new Event('change',{bubbles:true}));
        ui.input('start').value=start;ui.input('end').value=end;
        await ui.run();
      },{start,end});
      await heat.waitFor();
      assert.equal(await page.locator('[data-ea-scale] .ea-onset-tick').count(),Number(onset));
      await unit(11).click();
      await trial(0).waitFor();
      assert.equal(await page.locator('[data-ea-raster-axis] .ea-onset-tick').count(),Number(onset));
      assert.deepEqual(await page.evaluate(()=>ui.result.view.unitIds),[11]);
    }
    await controls.locator(':scope>summary').click();
    await page.evaluate(()=>{
      ui.video.mapping.videoToNeural=t=>t;
      ui.annotations.doc={schema:'neuropixels-annotations/1',activeSchemeId:'labels',context:{recordingKey:'rec'},
        schemes:[{id:'labels',labels:{a:'contact',b:'contact'}}],segments:[
          {id:'a',kind:'point',start:2,end:2,subject:'mouse1',track:'camera'},
          {id:'b',kind:'point',start:3,end:3,subject:'mouse2',track:'camera'}]};
    });
    await page.locator('[data-ea-label-source=annotation]').click();
    assert.equal(await page.locator('[name=eventType]').inputValue(),'contact');
    assert.equal(await field.inputValue(),'');
    assert.equal(await field.locator('option[value=track]').count(),0);
    await field.selectOption('subject');
    await page.locator('[data-ea-run]').click();await page.waitForFunction(()=>ui.result?.response.parameters.comparison?.field==='subject');
    assert.equal(await page.locator('[data-ea-condition-index]').count(),2);
    // Cross a video cue with a recording label in neural seconds. The raster uses all
    // same-label onsets, even when the other occurrence belongs to another condition.
    await controls.locator(':scope>summary').click();
    await field.selectOption('@response-label');
    assert(await page.locator('[data-ea-run]').isDisabled());
    await page.locator('[name=responseLabel]').selectOption(JSON.stringify(['experiment','other']));
    assert.equal(await page.locator('[name=ruleStart]').inputValue(),'0.15');
    const advanced=page.locator('[data-ea-settings]');await advanced.locator(':scope>summary').click();
    await page.locator('[name=ruleStart]').fill('0');
    assert.equal(await page.locator('[name=ruleEnd]').inputValue(),'0.75');
    await page.locator('[name=start]').fill('-0.25');await page.locator('[name=end]').fill('1.25');
    await page.locator('[name=binWidth]').fill('0.05');
    await page.locator('[data-ea-run]').click();
    await page.waitForFunction(()=>ui.result?.response.parameters.responseRule?.type==='other');
    assert.deepEqual(await page.evaluate(()=>ui.result.response.events.map(e=>e.matchedResponseId)),['other',null]);
    await unit(11).click();await trial(0).waitFor();
    assert.equal(await trial(0).getAttribute('data-other-onsets'),'1');
    assert.match(await trial(0).getAttribute('title'),/1 s/);
    const marks=await trial(0).locator('canvas').first().evaluate(c=>{
      const color=getComputedStyle(document.documentElement).getPropertyValue('--ea-positive').trim();
      const x=Math.floor(c.width*1.25/1.5),ref=document.createElement('canvas').getContext('2d');
      ref.fillStyle=color;ref.fillRect(0,0,1,1);
      return [...c.getContext('2d').getImageData(x,3,1,1).data].join() === [...ref.getImageData(0,0,1,1).data].join();
    });
    assert(marks,'A second event is drawn at +1 s on the actual trial canvas');
    await controls.locator(':scope>summary').click();await advanced.locator(':scope>summary').click();
    await page.locator('[name=excludeRepeated]').check();await page.locator('[data-ea-run]').click();
    await page.waitForFunction(()=>ui.result?.response.parameters.repeatPolicy==='exclude');
    assert.deepEqual(await page.evaluate(()=>ui.result.response.events.map(e=>e.start)),[3]);
    assert.equal(await page.evaluate(()=>ui.review.outcome),'miss');
    await page.evaluate(async()=>{
      ui.canSave=()=>true;ui.saveAnalysis=async(_,blob)=>{window.testSaved=blob;};
      await ui.save();if(!window.testSaved)throw Error(ui.dialog.querySelector('[data-ea-status]').textContent);
      ui.getSavedAnalysis=()=>window.testSaved;
      await ui.open();
      if(!ui.result)throw Error(ui.dialog.querySelector('[data-ea-status]').textContent);
    });
    assert.equal(await field.inputValue(),'@response-label');
    assert.equal(await page.locator('[name=responseLabel]').inputValue(),JSON.stringify(['experiment','other']));
    assert.equal(await page.locator('[name=ruleStart]').inputValue(),'0');
    assert(await page.locator('[name=excludeRepeated]').isChecked());
    // Restore an old table-based result without treating those stored outcomes as a new matching rule.
    await page.evaluate(async()=>{
      const E=NeuropixelsEventAnalysis,P=NeuropixelsEventAnalysisStorage,recording=ui.state.activeRecording;
      const events=ui.sourceOf('experiment');
      const response=E.computeResponses([{unitId:11,spikes:[]}],events,{recordingId:'rec',eventType:'image_change',
        start:-.5,end:1,binWidth:.05,coverage:null,activeOnly:true,comparison:{field:'stim_code',values:[0,'0']}});
      response.parameters.comparison={field:'trial_outcome',values:['hit','miss']};
      const saved=await P.pack({response,clusters:null,diagnostics:null,provenance:{recordingId:'rec',coverageOrigin:'unknown-continuous-assumption'},
        input:{sourceKind:'experiment',sampleRate:1,eventDigest:await P.digestJSON(events),sourceFingerprints:await P.sourceFingerprints(ui.sourceFiles(recording))}});
      ui.getSavedAnalysis=()=>saved;await ui.open();
      if(!ui.result)throw Error(ui.dialog.querySelector('[data-ea-status]').textContent);
    });
    assert.match(await page.locator('[data-ea-status]').innerText(),/saved trial-table outcomes/i);
    assert.match(await page.locator('[data-ea-counts]').innerText(),/Saved trial-table outcome/);
    assert.equal(await field.inputValue(),'@response-label');
    assert.equal(await page.locator('[name=responseLabel]').inputValue(),'');
    assert(await page.locator('[data-ea-run]').isDisabled());
    assert(await group.isDisabled());
    assert.deepEqual(errors,[]);
    console.log('PASS reference fit, fixed IDs/order, Ctrl toggle, exact trial spike counts, video coverage, keyboard source return and resume.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
