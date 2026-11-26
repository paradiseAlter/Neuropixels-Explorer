// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict');
module.exports=async function checkFigure(page){
  const theme=await page.evaluate(()=>document.documentElement.dataset.theme);
  const heat=page.locator('[data-ea-unit] canvas').first();
  async function sample(name){
    await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},name);
    return heat.evaluate(async canvas=>{
      await new Promise(requestAnimationFrame);
      const ctx=canvas.getContext('2d');
      return Array.from(ctx.getImageData(0,2,canvas.width,1).data);
    });
  }
  async function download(source) {
    const ready=page.waitForEvent('download');await source();
    const result=await ready,parts=[];
    for await(const chunk of await result.createReadStream())parts.push(chunk);
    return Buffer.concat(parts);
  }
  const dark=await sample('dark'),light=await sample('light'),contrast=await sample('contrast');
  assert.notDeepEqual(dark,light);assert.notDeepEqual(dark,contrast);
  await sample('dark');
  const direct=await download(()=>page.locator('[data-ea-png]').click());
  await heat.click({button:'right'});
  const context=await download(()=>page.locator('.ea-image-menu button').click());
  assert.deepEqual(context,direct,'The context action must save the same figure.');
  await sample('light');
  assert.deepEqual(await download(()=>page.locator('[data-ea-png]').click()),direct,'PNG pixels must be independent of the screen theme.');
  const summary=await page.evaluate(async encoded=>{
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const img=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
    const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    const paper=Array.from(ctx.getImageData(0,0,1,1).data);
    const view=ui.review,r=view.current,uid=view.selected[0],train=view.times.get(uid);
    // Inspect one true spike at its event-relative position in the exported raster.
    const slot=r.events.findIndex(e=>{
      const l=NeuropixelsEventAnalysis.lowerBound(train,e.start+r.parameters.start);
      return l<train.length&&train[l]<e.start+r.parameters.end;
    });
    const e=r.events[slot],a=e.start+r.parameters.start,spike=train[NeuropixelsEventAnalysis.lowerBound(train,a)];
    const x=846+(spike-a)/(r.parameters.end-r.parameters.start)*(canvas.width-846-32);
    const h=Math.max(230,Math.min(7200,r.events.length*view.selected.length*9))/r.events.length;
    const y=116+Math.ceil(view.selected.length/2)*19+h*(slot+.5/view.selected.length);
    const data=ctx.getImageData(Math.floor(x),Math.floor(y),2,1).data;
    return {paper,ink:[data[0],data[1],data[2]],inkNext:[data[4],data[5],data[6]]};
  },direct.toString('base64'));
  assert.deepEqual(summary.paper,[255,255,255,255]);
  assert([summary.ink,summary.inkNext].some(rgb=>rgb[0]<rgb[1]&&rgb[0]<rgb[2]),'The exact spike must have the selected Unit ink at its relative time.');
  await page.evaluate(theme=>{if(theme)document.documentElement.dataset.theme=theme;else delete document.documentElement.dataset.theme;},theme);
};
