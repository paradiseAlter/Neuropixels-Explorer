// SPDX-License-Identifier: MIT
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const workspaceProject = require('./fixtures/workspace-project.cjs');

// Compare actual glyph bounds with Chrome's editable viewport. The host input's
// width includes its grip and stepper and misses the clipped-text regression.
async function checkNativeFields(page, session, context) {
  const fields = await page.locator('[data-number-case]').count();
  await page.evaluate(() => document.body.offsetWidth);
  const {root} = await session.send('DOM.getDocument', {depth:-1, pierce:true});
  const matches = [];
  function visit(node, name) {
    const attrs = node.attributes || [];
    if (attrs.includes('data-number-case')) name = attrs[attrs.indexOf('data-number-case') + 1];
    if (name && attrs.includes('editing-view-port')) matches.push([name,node.backendNodeId]);
    for (const child of [...node.children || [], ...node.shadowRoots || []]) visit(child,name);
  }
  visit(root);
  assert.equal(matches.length,fields,context + ' rendered native editors');
  for (const [name,id] of matches) {
    const {object} = await session.send('DOM.resolveNode',{backendNodeId:id,objectGroup:'numeric-layout'});
    const {result} = await session.send('Runtime.callFunctionOn',{
      objectId:object.objectId, returnByValue:true,
      functionDeclaration:`function () {
        const r = document.createRange(); r.selectNodeContents(this.firstElementChild);
        const text = r.getBoundingClientRect(), editor = this.getBoundingClientRect();
        const arrow = this.nextElementSibling.getBoundingClientRect();
        const input=this.getRootNode().host, host=input.getBoundingClientRect();
        let left=0, right=innerWidth;
        for(let p=input.parentElement;p;p=p.parentElement){
          if(getComputedStyle(p).overflowX!=='visible'){
            const box=p.getBoundingClientRect();
            left=Math.max(left,box.left); right=Math.min(right,box.right);
          }
        }
        return {value:r.toString(), glyphs:text.width, available:editor.width, grip:arrow.left-editor.right,
          clipped:Math.max(0,left-host.left,host.right-right)};
      }`
    });
    const bounds = result.value;
    assert(bounds.value && bounds.available >= bounds.glyphs - .1 && bounds.grip >= 19.5 && bounds.clipped <= 1,
      context + ' ' + name + ' ' + JSON.stringify(bounds));
  }
  await session.send('Runtime.releaseObjectGroup',{objectGroup:'numeric-layout'});
  return fields;
}

// Exercise the screenshot control through the normal project and analysis UI.
async function checkProbe(page, session) {
  const choose = page.waitForEvent('filechooser');
  await page.locator('[data-project-action=open-project]:visible').first().click();
  const units=[11,22,33].map((cluster_id,i)=>({cluster_id,probe_depth_um:i*200,x_um:i*20,shank_id:0}));
  await (await choose).setFiles(await workspaceProject({units}));
  await page.waitForFunction(()=>document.querySelector('#behavior-video').readyState>=2);
  await page.locator('.playback-options > summary').click();
  const speed=page.locator('#video-custom-speed');
  await speed.fill('3.875');
  await speed.press('Tab');
  assert.equal(await page.locator('#video-speed-select').inputValue(),'custom');
  await speed.evaluate(el=>el.dataset.numberCase='speed');
  await checkNativeFields(page,session,'Video 3.875×');
  await speed.evaluate(el=>delete el.dataset.numberCase);
  await page.locator('.playback-options > summary').click();
  await page.locator('#event-analysis-button').click();
  const dialog = page.locator('.event-analysis-dialog:visible');
  await dialog.locator('[data-ea-unit-choice]').selectOption('probe');
  const zoom = dialog.locator('[data-probe-zoom]');
  await zoom.waitFor();
  await zoom.evaluate(el => el.dataset.numberCase='zoom');
  await checkNativeFields(page,session,'Probe 100%');
  await zoom.fill('4800');
  await checkNativeFields(page,session,'Probe 4800%');
  await zoom.press('ArrowDown');
  assert.equal(await zoom.inputValue(),'4790');
  await zoom.scrollIntoViewIfNeeded();
  const handle = await zoom.evaluate(el => {
    const b=el.getBoundingClientRect(), style=getComputedStyle(el);
    return {x:b.right-parseFloat(style.borderRightWidth)-parseFloat(style.paddingRight)-26, y:b.top+b.height/2};
  });
  await page.mouse.move(handle.x,handle.y);
  await page.mouse.down(); await page.mouse.move(handle.x-12,handle.y); await page.mouse.up();
  assert.equal(await zoom.inputValue(),'4770');
  await dialog.locator('[data-ea-settings] > summary').click();
  await dialog.locator('[name=stability]').check();
  const settings={start:'-12.125',end:'100.125',binWidth:'0.001',k:'32',seed:'4294967295',repeats:'1000'};
  await dialog.evaluate((root,values)=>{
    for(const [name,value] of Object.entries(values)){
      const field=root.querySelector('input[name="'+name+'"]');
      field.value=value;field.dataset.numberCase=name;
    }
  },settings);
  for(const width of [390,820,1440]){
    await page.setViewportSize({width,height:900});
    for(const size of [14,16,24]){
      await page.evaluate(px=>document.documentElement.style.fontSize=px+'px',size);
      await checkNativeFields(page,session,'Analysis pane '+width+'px / '+size+'px');
    }
  }
}

// Include the CSS contexts of conditional screens (partial imports, optional
// annotation tools and similar-segment search), even when a session hides them.
function panelCases() {
  function field(attrs,value) {
    return '<input type="number" '+attrs+' data-number-case="'+attrs.replaceAll('"','')+'" value="'+value+'">';
  }
  const pair = (attr,values) => values.map(([key,value])=>'<label>'+field(attr+'="'+key+'"',value)+'</label>').join('');
  const event = pair('name',[['start',-120.125],['end',600.001],['binWidth',.0001],['k',128],['seed',4294967295],['repeats',1000]]);
  const pop = pair('name',[['start',9999.123456],['end',10000.123456],['binWidth',.0001]]);
  const depth = pair('data-ea-depth',[['min',-1000.5],['max',10000.5]]);
  const times = pair('data-field',[['start',12345.123456],['end',23456.123456]]);
  const frames = pair('data-frame',[['start',12345678],['end',23456789]]);
  const hz = 30000.12345;
  return [
    '<div id="workspace-settings"><label class="preference-picker text-size-picker">'+field('id="text-size"',24)+' px</label></div>',
    '<label class="video-custom-rate">'+field('id="video-custom-speed"',3.875)+'</label><label class="video-jump">'+field('id="video-seek-seconds"',12345.678)+'</label><div class="video-mapping">'+field('id="video-offset"',-12345.678)+'</div>',
    '<section class="event-analysis-dialog"><div class="event-analysis-fields">'+event+'<div class="event-inline event-wide">'+depth+'</div><div class="probe-map-tools event-wide"><label class="probe-zoom-field">'+field('data-probe-zoom',4800)+'%</label></div></div></section>',
    '<section class="event-analysis-dialog"><div class="event-analysis-fields">'+pop+'</div></section>',
    '<section class="behavior-patterns"><form class="bp-config">'+pair('name',[['before',12.125],['after',120.025],['bin',1000.25],['gap',.0001]])+'</form><div class="bp-page"><label>'+field('data-bp-page',12345)+'</label></div><form data-bp-query-form>'+pair('name',[['start',-123.123456],['end',12345.123456]])+'</form></section>',
    '<section class="annotation-panel"><div class="annotation-fields">'+times+'</div><div class="annotation-precision annotation-precision-fields">'+times+frames+field('data-frame-rate',119.88012)+'</div><div class="annotation-auto-controls">'+field('data-clusters',32)+field('data-minimum',9.8)+field('data-feature-option="count"',32)+field('data-feature-option="minConfidence"',.95)+'</div></section>',
    '<section class="project-dialog"><form data-align>'+pair('name',[['video',12345.123456],['neural',12345.123456]])+'</form>'+field('data-import-rate',hz)+field('data-rate',hz)+field('data-video-at',12345.123)+field('data-neural-at',12345.123)+'</section>',
    '<section class="partial-signal-preview"><form>'+field('required',hz)+'</form><label class="partial-row-picker">'+field('data-first-row',20302917)+'</label></section>'
  ].join('');
}

async function main() {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const app = await browser.newPage({viewport:{width:1280,height:900}});
    await app.goto(pathToFileURL(path.resolve(process.argv[2] || 'index.html')).href);
    const session = await app.context().newCDPSession(app);
    await checkProbe(app,session);
    const css = await app.locator('style').allTextContents();
    const samples = await browser.newPage();
    const sampleSession = await samples.context().newCDPSession(samples);
    await samples.setContent('<!doctype html><style>'+css.join('\n')+'</style>'+panelCases());
    let total=0;
    for (const width of [390,820,1440]) {
      await samples.setViewportSize({width,height:900});
      for (let size=14;size<=24;size++) {
        await samples.evaluate(px=>document.documentElement.style.fontSize=px+'px',size);
        total+=await checkNativeFields(samples,sampleSession,width+'px / '+size+'px');
      }
    }
    console.log('Probe mouse, keyboard and typing passed. '+total+' numeric field layouts passed.');
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
