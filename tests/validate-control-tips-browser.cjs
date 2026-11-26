// SPDX-License-Identifier: MIT
'use strict';
const {setExplorerPreference}=require('./workspace-preferences.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:800,height:600}});
    await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/Neuropixels-Explorer.html')).href);
    await setExplorerPreference(page,'#language-select','zh-CN');
    const help=page.locator('#help-button'),tip=page.locator('#context-tooltip');
    await help.hover();assert.equal(await tip.isVisible(),false);
    await tip.waitFor();assert.match(await tip.innerText(),/操作指南/);
    await page.keyboard.press('Escape');
    assert.equal(await tip.isVisible(),false);
    await page.evaluate(()=>{
      const d=document.createElement('dialog');
      d.innerHTML='<button type="button">A</button><button type="button" title="Open the selected event in the recording" aria-describedby="context">B</button><span id="context">Event 3</span>';
      document.body.append(d);d.showModal();d.querySelector('button').focus();
    });
    await page.keyboard.press('Tab');
    const b=page.locator('dialog[open] button').last();
    await tip.waitFor();
    assert.equal(await tip.innerText(),'Open the selected event in the recording');
    assert.equal(await tip.evaluate(t=>!!t.closest('dialog[open]')),true);
    assert.equal(await b.getAttribute('aria-describedby'),'context context-tooltip');
    await page.keyboard.press('Escape');
    assert.equal(await tip.isVisible(),false);
    assert.equal(await b.getAttribute('aria-describedby'),'context');
    assert.equal(await b.getAttribute('title'),'Open the selected event in the recording');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(),0);
    console.log('PASS delayed action hints, keyboard focus, modal placement, Escape and restored accessible descriptions.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
