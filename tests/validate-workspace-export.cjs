// SPDX-License-Identifier: MIT
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require('playwright');
const {npy} = require('../scripts/browser-nwb-worker');

async function choose(page, files) {
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-project-action=import-files]').click();
  await (await chooser).setFiles(files);
}

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(10000);
    await page.route('http://localhost/explorer',route=>route.fulfill({path:path.join(__dirname,'../dist/Neuropixels-Explorer.html'),contentType:'text/html'}));
    await page.goto('http://localhost/explorer');
    const save = page.locator('#save-project-button');
    assert(await save.isDisabled());
    const times = {name:'spike_times.npy', mimeType:'application/octet-stream',
      buffer:Buffer.from(npy(new Int32Array([4,10,23]),'<i4'))};
    await choose(page,times);
    await page.locator('#partial-signal-preview svg').waitFor();
    assert((await save.textContent()).includes('•'));
    assert.equal(await page.evaluate(async ()=>(await new NeuropixelsBrowserStorage.ProjectStore().request('projects')).length),0);

    // Cancel the actual navigation prompt and continue with the same active viewer.
    await page.locator('#dataset-title').click();
    const retained=page.waitForEvent('dialog',{timeout:7000});
    await page.evaluate(()=>setTimeout(()=>location.reload(),0));
    const dialog=await retained;
    assert.equal(dialog.type(),'beforeunload');
    await dialog.dismiss();
    assert(await page.locator('#partial-signal-preview svg').isVisible());
    await page.evaluate(()=>{
      window.showSaveFilePicker=async()=>{throw new DOMException('Cancelled','AbortError');};
    });
    await save.click();
    await page.locator('[data-confirm-export]').click();
    assert((await save.textContent()).includes('•'));
    await page.evaluate(()=>{
      window.showSaveFilePicker=async()=>({createWritable:async()=>({
        write:async()=>{throw new Error('Export test: write failed');},abort:async()=>{}
      })});
    });
    await save.click();
    await page.locator('[data-confirm-export]').click();
    await page.getByRole('alert').filter({hasText:'write failed'}).waitFor();
    await page.keyboard.press('Escape');
    assert((await save.textContent()).includes('•'));
    // Drive a real browser FileSystemWritableFileStream without automating the OS dialog.
    await page.evaluate(()=>{
      window.showSaveFilePicker=async()=> (await navigator.storage.getDirectory()).getFileHandle('review.neuroproject',{create:true});
    });
    await save.click();
    await page.locator('[data-confirm-export]').click();
    await page.waitForFunction(()=>!document.querySelector('#save-project-button').textContent.includes('•'));
    const bytes=Buffer.from(await page.evaluate(async()=>{
      const file=await (await (await navigator.storage.getDirectory()).getFileHandle('review.neuroproject')).getFile();
      return Array.from(new Uint8Array(await file.arrayBuffer()));
    }));
    const {unpack}=require('../scripts/browser-storage');
    const {assets}=await unpack(new Blob([bytes]));
    assert.equal(assets[0].name,times.name);
    assert.deepEqual(Buffer.from(await assets[0].blob.arrayBuffer()),times.buffer);
    await page.evaluate(()=>{window.showDirectoryPicker=()=>navigator.storage.getDirectory();});
    await save.click();
    await page.locator('#project-dialog input[name=copy]').check();
    await page.locator('[data-confirm-export]').click();
    await page.waitForFunction(async()=>{
      const root=await navigator.storage.getDirectory();
      for await(const sub of root.values())if(sub.kind==='directory'){
        for await(const file of sub.values())if(file.name.endsWith('.neuroproject') && (await file.getFile()).size)return true;
      }
    });
    const copied=await page.evaluate(async()=>{
      const root=await navigator.storage.getDirectory();
      for await(const sub of root.values())if(sub.kind==='directory'){
        const inputs=await sub.getDirectoryHandle('inputs');
        for await(const source of inputs.values()){
          const f=await (await source.getFileHandle('spike_times.npy')).getFile();
          return Array.from(new Uint8Array(await f.arrayBuffer()));
        }
      }
    });
    assert.deepEqual(Buffer.from(copied),times.buffer);
    await page.reload();
    await page.locator('[data-project-action=import-files]').waitFor();
    assert(await save.isDisabled());
    const pkg={name:'review.neuroproject',mimeType:'application/octet-stream',buffer:bytes};
    await choose(page,pkg);
    await page.locator('#partial-signal-preview svg').waitFor();
    assert(!(await save.textContent()).includes('•'));
    await choose(page,{name:'spike_clusters.npy',mimeType:'application/octet-stream',
      buffer:Buffer.from(npy(new Int32Array([7,7,9]),'<i4'))});
    await page.waitForFunction(()=>document.querySelector('#save-project-button').textContent.includes('•'));
    const decline = new Promise(resolve=>page.once('dialog',async d=>{
      assert.equal(d.type(),'confirm');await d.dismiss();resolve();
    }));
    await choose(page,pkg);await decline;
    assert((await save.textContent()).includes('•'));
    assert.deepEqual(errors,[]);
    console.log('PASS tab-only import, native close cancellation, cancelled/failed export, native file write, clean reload, package round trip and discarded replacement prompt.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
