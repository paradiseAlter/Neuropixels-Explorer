// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage(),root=path.resolve(__dirname,'..');
    await page.setContent('<html lang="en"><body><canvas width="1120" height="650"></canvas></body></html>');
    await page.addStyleTag({path:path.join(root,'styles/event-analysis.css')});
    for(const name of ['event-analysis-core','event-analysis-review','event-figures-population']){
      await page.addScriptTag({path:path.join(root,'scripts',name+'.js')});
    }
    const checked=await page.evaluate(()=>{
      const E=NeuropixelsEventAnalysis,F=NeuropixelsPopulationFigures;
      const events={schema:E.SCHEMA,timebase:'neural_seconds',recordingId:'rec',events:[2,4,6,2.3,4.3].map((t,i)=>({
        id:'e'+i,sourceId:String(i),sourceKind:'experiment',kind:'point',type:i<3?'flash':'lick',start:t
      }))};
      const trains=[{unitId:29,spikes:[2.25,4.25,6.25,6.3]},{unitId:9,spikes:[1.6,2.1,2.2,3.6,4.1,4.2,5.6,6.1]},{unitId:55,spikes:[]}];
      const response=E.computeResponses(trains,events,{recordingId:'rec',start:-.5,end:.5,binWidth:.5,eventType:'flash',coverage:null,
        responseRule:{sourceKind:'experiment',type:'lick',start:.15,end:.75}});
      const review=new NeuropixelsEventReview({result:{response,clusters:{unitIds:[29,9,55],k:2,labels:[1,0,1]}},
        unitName:id=>'probeB · Unit '+id,t:key=>key},null);
      const ctx=document.querySelector('canvas').getContext('2d'),palette=NeuropixelsEventReview.plotPalette(true);
      const s={ctx,palette,x:24,y:114,width:1072,height:474,light:true};
      const j=F.draw('J',s,review);
      // First row is Unit 9 after ordering by the reference groups. Both conditions are queried at +0.25 s.
      const left=j.hitTest(510,182),right=j.hitTest(975,182),idx=review.lookup.get(9);
      const pixel=(x)=>Array.from(ctx.getImageData(x,182,1,1).data).slice(0,3);
      const expected=review.comparison.values.map(c=>{
        const view=review.views.get(c);
        const delta=view.response.rateHz[idx*2+1]-view.offsets[idx];
        return palette.heat[255+Math.round(Math.max(-1,Math.min(1,delta/review.scale))*255)];
      });
      const pixels=[pixel(510),pixel(975)];
      const k=F.draw('K',s,review),mean=k.hitTest(450,310);
      const ungrouped=new NeuropixelsEventReview({...review.ui,result:{response,clusters:null}},null);
      const all=F.draw('K',s,ungrouped).hitTest(870,310);
      return {left,right,pixels,expected,mean,all,order:review.views.get('hit').summary.unitOrder,other:review.views.get('miss').summary.unitOrder};
    });
    assert.deepEqual(checked.order,[9,29,55]);assert.deepEqual(checked.other,checked.order);
    assert.equal(checked.left,checked.right);assert.match(checked.left,/probeB · Unit 9.*hit 4 Hz \(2 ΔHz\).*miss 2 Hz \(0 ΔHz\)/);
    assert.deepEqual(checked.pixels,checked.expected);
    assert.match(checked.mean,/Group 1.*hit 4 Hz.*miss 2 Hz.*miss − hit = −2 Hz/);
    assert.match(checked.all,/All Units.*hit 2 Hz.*miss 2 Hz/);
    console.log('PASS paired J/K canvas pixels, fixed Unit order, per-condition baseline, group and ungrouped mean Hz, per-bin inspection.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
