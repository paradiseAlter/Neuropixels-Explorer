// SPDX-License-Identifier: MIT
'use strict';
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    const page = await browser.newPage();
    await page.route('http://localhost/**', route => route.fulfill({contentType:'text/html',body:'<!doctype html><title>Storage test</title>'}));
    await page.goto('http://localhost/');
    await page.addScriptTag({path:path.resolve(__dirname,'../scripts/browser-storage.js')});
    const result = await page.evaluate(async () => {
      const Store = window.NeuropixelsBrowserStorage.ProjectStore;
      const store = new Store(), id = 'append-fixture';
      const file = path => ({path, name:path.split('/').pop(), blob:new Blob([path])});
      const batch = key => ({recordingIds:[key], videos:{}, mode:'neural',
        recordingSources:{[key]:{session:key,probe:'probeB'}}});
      const old = {id, name:'Original project', recordingIds:['old'], mode:'combined',
        session:'101', probe:'probeA', videos:{old:{asset:'video/old',timeMapping:{offset_s:2}}}};
      const docs = {original:{segments:[{label:'walk'}]}};
      await store.create(old,[file('old/spikes'),file('video/old'),file('analysis/old')],docs);
      const add = (key,asset) => store.appendRecordings(id,batch(key),[file(asset || key+'/spikes')],()=>true);
      await Promise.all([add('102'), add('103')]);
      const races = await Promise.allSettled([add('104'),add('104')]);
      const collision = await Promise.allSettled([add('105','old/spikes')]);
      // Abort while requests are pending, after the browser has opened the write transaction.
      const cancelled = new Store(), controller = new AbortController();
      cancelled.db = async () => {
        const db = await store.db(), transaction = db.transaction.bind(db);
        db.transaction = (...args) => { const tx=transaction(...args); queueMicrotask(()=>controller.abort()); return tx; };
        return db;
      };
      const stopped = await Promise.allSettled([cancelled.appendRecordings(id,batch('106'),[file('106/spikes')],()=>true,controller.signal)]);
      const create = await Promise.allSettled([store.create({...old,id:'cancelled'},[],{},()=>true,controller.signal)]);
      const project = await store.request('projects',id);
      return {races:races.map(x=>x.status).sort(), collision:collision[0].status, aborted:[stopped[0].reason?.name,create[0].reason?.name],
        created:!!await store.request('projects','cancelled'), ids:project.recordingIds.sort(), sources:project.recordingSources,
        globalSession:project.session??null, name:project.name, mode:project.mode, videos:project.videos,
        files:(await store.request('assets',id)).map(a=>a.path).sort(), docs:await store.request('annotations',id)};
    });
    assert.deepEqual(result.races,['fulfilled','rejected']);
    assert.equal(result.collision,'rejected'); assert.deepEqual(result.aborted,['AbortError','AbortError']);
    assert.equal(result.created,false); assert.deepEqual(result.ids,['102','103','104','old']);
    assert.equal(result.sources.old.session,'101'); assert.equal(result.sources['102'].probe,'probeB'); assert.equal(result.globalSession,null);
    assert.equal(result.name,'Original project'); assert.equal(result.mode,'combined'); assert.equal(result.videos.old.timeMapping.offset_s,2);
    assert.equal(result.docs.original.segments[0].label,'walk');
    assert.deepEqual(result.files,['102/spikes','103/spikes','104/spikes','analysis/old','old/spikes','video/old']);
    console.log('PASS: atomic recording append, concurrent edits, duplicate rejection, cancel and legacy video/session/annotation preservation.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
