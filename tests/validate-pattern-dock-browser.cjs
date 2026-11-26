// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const workspaceProject=require('./fixtures/workspace-project.cjs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1480,height:930}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
    await page.goto(pathToFileURL(path.resolve(process.argv[2]||'index.html')).href);
    const chooser=page.waitForEvent('filechooser');
    await page.locator('[data-project-action=open-project]:visible').first().click();
    await (await chooser).setFiles(await workspaceProject());
    await page.locator('.sw-space [data-unit]').first().waitFor();
    const open=page.locator('#pattern-label'),pane=page.locator('#behavior-patterns');
    await open.click();await pane.locator('[data-bp-add-unit]').selectOption('11');
    await pane.locator('canvas[data-bp-raster]').waitFor();
    assert.equal(await page.locator('[data-analysis-tab]').count(),0);
    const signal=page.locator('.observation-bench'),bounds=await pane.boundingBox(),main=await signal.boundingBox();
    assert(main.y+main.height<=bounds.y+2 && main.height>200);
    assert(bounds.height>150 && bounds.y+bounds.height<=932);
    const resize=pane.locator('[data-bp-splitter]'),pos=await resize.boundingBox();
    await page.mouse.move(pos.x+30,pos.y+3);await page.mouse.down();
    await page.mouse.move(pos.x+30,pos.y-40);await page.keyboard.press('Escape');await page.mouse.up();
    assert(Math.abs((await pane.boundingBox()).height-bounds.height)<=1);
    await resize.focus();await page.keyboard.press('ArrowUp');assert((await pane.boundingBox()).height>bounds.height+20);
    await pane.locator('[data-bp-action=collapse]').click();assert((await pane.boundingBox()).height<80);
    await open.click();assert((await pane.boundingBox()).height>150);
    assert.equal(await pane.locator('[data-bp-unit="11"]').count(),1);
    await page.locator('#event-analysis-button').click();
    await page.locator('#analysis-pages [data-ea-run]:visible').waitFor();
    assert(await pane.isVisible());
    await pane.locator('[data-bp-event]').first().click();
    assert(await pane.isVisible());await page.locator('#signal-workspace:visible').waitFor();
    await pane.locator('[data-bp-action=close]').click();await pane.waitFor({state:'hidden'});
    await open.click();await pane.locator('canvas[data-bp-raster]').waitFor();
    assert.equal(await pane.locator('[data-bp-unit="11"]').count(),1);
    await page.setViewportSize({width:650,height:720});await pane.scrollIntoViewIfNeeded();
    assert(await pane.isVisible());assert((await pane.boundingBox()).width<=650);
    assert.deepEqual(errors,[]);console.log('PASS bottom panel, split resize/cancel, collapse/expand, tab coexistence, source return, close/reopen and narrow screen.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
