// SPDX-License-Identifier: MIT
// Deferred-promise tests of actual UI/project methods. Synthetic engineering QA only.
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const E = require('../scripts/event-analysis-core.js');
const P = require('../scripts/population-dynamics-storage.js');
const S = require('../scripts/browser-storage.js');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const copy = value => JSON.parse(JSON.stringify(value));
let checks = 0, failures = 0;
async function test(name, run) { try { await run(); checks++; console.log('PASS ' + name); } catch (error) { failures++; console.error('FAIL ' + name); console.error(error); } }
const coverage = {schema: 'neuropixels-recording-coverage/1', timebase: 'neural_seconds', recordingId: 'rec', source: {kind: 'NWB.units.obs_intervals', status: 'source-reported'}, units: [{unitId: 1, intervals: [[0, 40], [50, 100]]}, {unitId: 2, intervals: [[0, 100]]}]};
const saved = {schema: P.SCHEMA, recordingId: 'rec', sampleRate: 1, result: {recordingId: 'rec', unitIds: [1, 2], options: {start: 0, end: 100, binWidth: 1, coverage: null}, binTimes: [[0, 1]], pca: {unitIds: [1, 2]}}, coverageProvenance: {intervals: null, origin: 'unknown', missingUnitIds: [1, 2]}};

function fixture() {
  const fields = Object.fromEntries(['unitIds', 'start', 'end', 'binWidth'].map(name => [name, {name, value: {unitIds: '1,2', start: '0', end: '100', binWidth: '1'}[name], dataset: {}, disabled: false}]));
  const controls = {run: {dataset: {}, disabled: false}, cancel: {dataset: {pdAction: 'cancel'}, hidden: true}};
  const status = {dataset: {}, textContent: ''}, warnings = {textContent: ''}, panel = {clears: 0, replaceChildren() { this.clears++; }}, form = {}, listeners = {};
  const dialog = {
    open: false, addEventListener(name, fn) { listeners[name] = fn; }, setAttribute() {}, showModal() { this.open = true; },
    close() { if (this.open) { this.open = false; listeners.close?.({}); } },
    querySelector(selector) {
      if (selector.startsWith('[name=')) return fields[selector.match(/name="([^"]+)"/)[1]];
      return ({form, '[data-pd-results]': panel, '[data-pd-status]': status, '[data-pd-warnings]': warnings, '[data-pd-run]': controls.run, '[data-pd-action="cancel"]': controls.cancel})[selector] || null;
    },
    querySelectorAll: () => [...Object.values(fields), controls.run],
    fire(name, event) { listeners[name]?.(event); }
  };
  const recording = {key: 'rec', sampleRate: 1, spikeTimesFile: new Blob(['times']), spikeClustersFile: new Blob(['ids']), byName: new Map([['params.py', new Blob(['sample_rate=1'])]])};
  const state = {datasetToken: 1, activeRecording: recording, experimentView: {visibleRange: {start: 0, end: 100}}};
  const posted = [], workers = [], writes = [], calls = {hash: 0, unpack: 0, verify: 0, pack: 0, render: 0};
  const hooks = {hash: async () => [], unpack: async () => copy(saved), verify: async () => true, pack: async () => new Blob(['asset']), getSaved: async () => null};
  const storage = {
    SCHEMA: P.SCHEMA,
    unpack: (...args) => { calls.unpack++; return hooks.unpack(...args); },
    verifySources: (...args) => { calls.verify++; return hooks.verify(...args); },
    pack: (...args) => { calls.pack++; return hooks.pack(...args); }
  };
  const window = {NeuropixelsPopulationDynamics: {limits: {maxBins: 10000, maxCountCells: 2000000}, workerSource: () => ''}, NeuropixelsEventAnalysis: E,
    NeuropixelsEventAnalysisStorage: {sourceFingerprints: (...args) => { calls.hash++; return hooks.hash(...args); }}, NeuropixelsPopulationDynamicsStorage: storage,
    NeuropixelExplorerCore: {createPopulationDynamicsWorkerSource: () => ''}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/population-dynamics-ui.js'), 'utf8'), {
    window, document: {documentElement: {lang: 'en'}, createElement: () => dialog, body: {append() {}}}, AbortController, Blob, URL,
    Worker: class { constructor() { workers.push(this); } postMessage(message) { posted.push(message); } terminate() { this.terminated = true; } }
  });
  const ui = new window.NeuropixelsPopulationDynamicsUI({state, button: {}, getUnits: () => [{id: 1}, {id: 2}], video: {mapping: {toJSON: () => ({offset_s: 3})}}, toast() {},
    canSave: () => true, getSavedAnalysis: (...args) => hooks.getSaved(...args), saveAnalysis: async (...args) => { writes.push(args); }});
  ui.panel = panel; ui.metadataReady = true; ui.coverage = null; ui.invalidTimes = null; ui.eventsError = null;
  ui.renderResult = () => { calls.render++; }; dialog.open = true;
  return {ui, recording, state, fields, controls, status, panel, dialog, hooks, posted, workers, writes, calls};
}

function bindProject(fixture, flush) {
  const win = {NeuropixelsBrowserStorage: S, NeuropixelExplorerCore: {}, NeuropixelsProjectUI: class {}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/browser-project-ui.js'), 'utf8'), {window: win, Blob});
  const project = Object.create(win.NeuropixelsBrowserProjectUI.prototype), committed = [];
  Object.assign(project, {active: {id: 'p', name: 'Lifecycle QA', recordingIds: ['rec']}, assets: [], state: fixture.state, annotations: {flush},
    store: {saveAnalysis: async (id, key, asset) => { committed.push({id, key, asset}); return {project: project.active, assets: [asset]}; }}});
  // Match the application's callback contract, forwarding lifecycle guard options.
  fixture.ui.saveAnalysis = (recording, blob, options) => project.savePopulationDynamics(recording, blob, options);
  return {project, committed};
}

function bindDeferredDatabase(fixture) {
  const {project} = bindProject(fixture, async () => {}), databaseOpen = deferred(), enteredOpen = deferred(), enteredReads = deferred();
  const stats = {opens: 0, transactions: 0, aborts: 0, closes: 0, writes: [], rejections: []}, requests = new Map();
  const storedProject = project.active, storedAssets = [{role: 'event-analysis', recordingId: 'rec', path: 'event.neuroanalysis', blob: new Blob(['event'])}];
  const db = {
    close() { stats.closes++; },
    transaction(names, mode) {
      assert.deepEqual(names, ['projects', 'assets']); assert.equal(mode, 'readwrite'); stats.transactions++;
      let aborted = false;
      const tx = {
        error: null,
        abort() { aborted = true; stats.aborts++; queueMicrotask(() => tx.onabort?.()); },
        objectStore(name) { return {
          get(key) { assert.equal(key, 'p'); const request = {}; requests.set(name, request); if (requests.size === 2) enteredReads.resolve(); return request; },
          put(value, key) { stats.writes.push({name, key, value}); if (stats.writes.length === 2) setImmediate(() => { if (!aborted) tx.oncomplete?.(); }); return {}; }
        }; }
      };
      return tx;
    }
  };
  const store = new S.ProjectStore(); store.db = () => { stats.opens++; enteredOpen.resolve(); return databaseOpen.promise; }; project.store = store;
  const save = store.saveAnalysis.bind(store);
  store.saveAnalysis = async (...args) => { try { return await save(...args); } catch (error) { stats.rejections.push(error); throw error; } };
  const release = name => { const request = requests.get(name); assert.ok(request, 'Expected pending ' + name + ' get'); request.result = name === 'projects' ? storedProject : storedAssets; request.onsuccess(); };
  return {project, store, stats, enteredOpen, enteredReads, open: () => databaseOpen.resolve(db), release};
}

(async () => {
  await test('cancelled coverage metadata cannot become unknown-coverage computation', async () => {
    const f = fixture(), read = deferred(); f.recording.coverageFile = {size: 100, text: () => read.promise};
    const opening = f.ui.open(); assert.equal(f.ui.metadataReady, false); f.ui.cancel();
    assert.equal(f.controls.run.disabled, true); await f.ui.run(); assert.equal(f.calls.hash, 0); assert.equal(f.posted.length, 0);
    assert.match(f.status.textContent, /reopen|open again/i);
    read.resolve(JSON.stringify(coverage)); await opening; assert.equal(f.ui.metadataReady, false); assert.equal(f.ui.coverage, null);
  });
  await test('cancelled event metadata also requires reopening before computation', async () => {
    const f = fixture(), read = deferred(); f.recording.eventsFile = {size: 100, text: () => read.promise};
    const opening = f.ui.open(); f.ui.cancel(); await f.ui.run(); assert.equal(f.posted.length, 0); assert.equal(f.controls.run.disabled, true);
    read.resolve(JSON.stringify({schema: E.SCHEMA, recordingId: 'rec', timebase: 'neural_seconds', events: []})); await opening;
    assert.equal(f.ui.metadataReady, false);
  });
  await test('reopen completes source coverage and excludes known gaps in computation', async () => {
    const f = fixture(), oldRead = deferred(); f.recording.coverageFile = {size: 100, text: () => oldRead.promise};
    const first = f.ui.open(); f.ui.dialog.close(); f.recording.coverageFile.text = async () => JSON.stringify(coverage);
    await f.ui.open(); assert.equal(f.ui.metadataReady, true); assert.equal(f.controls.run.disabled, false);
    await f.ui.run(); assert.deepEqual(copy(f.posted.at(-1).options.coverage), [[0, 40], [50, 100]]);
    oldRead.resolve('{}'); await first; assert.equal(f.ui.coverage.schema, coverage.schema);
    f.ui.cancel(false);
  });
  for (const change of ['cancel', 'close', 'dataset']) await test('source hashing cannot launch stale Worker after ' + change, async () => {
    const f = fixture(), hash = deferred(); f.hooks.hash = () => hash.promise;
    const running = f.ui.run(); await tick();
    if (change === 'cancel') f.ui.cancel(); else if (change === 'close') f.dialog.close(); else f.state.datasetToken++;
    hash.resolve([]); await running; assert.equal(f.workers.length, 0); assert.equal(f.ui.result, null);
  });
  await test('late Worker result is ignored after cancellation', async () => {
    const f = fixture(); await f.ui.run(); const worker = f.workers[0]; assert.ok(worker); f.ui.cancel();
    worker.onmessage({data: {result: copy(saved.result)}}); assert.equal(f.ui.result, null); assert.equal(f.calls.render, 0); assert.equal(worker.terminated, true);
  });
  await test('close action cancels hashing synchronously before a delayed DOM close event', async () => {
    const f = fixture(), hash = deferred(); f.hooks.hash = () => hash.promise;
    // HTMLDialogElement.close() removes open now; its close event is a later task.
    f.dialog.close = function () { this.open = false; };
    const running = f.ui.run(), epoch = f.ui.epoch;
    const closing = f.ui.action('close'); assert.ok(f.ui.epoch > epoch); assert.equal(f.dialog.open, false);
    hash.resolve([]); await running; await closing;
    assert.equal(f.workers.length, 0); assert.equal(f.ui.worker, null); assert.equal(f.ui.result, null); assert.equal(f.calls.render, 0);
    f.dialog.fire('close', {});
  });
  await test('closed dialog blocks hash completion even before any close event fires', async () => {
    const f = fixture(), hash = deferred(); f.hooks.hash = () => hash.promise;
    f.dialog.close = function () { this.open = false; };
    const running = f.ui.run(), epoch = f.ui.epoch; f.dialog.close(); assert.equal(f.ui.epoch, epoch);
    hash.resolve([]); await running;
    assert.equal(f.workers.length, 0); assert.equal(f.ui.worker, null); assert.equal(f.ui.result, null); assert.equal(f.calls.render, 0);
  });
  await test('late Worker result cannot restore a closed dialog before its close event', async () => {
    const f = fixture(); await f.ui.run(); const worker = f.workers[0], epoch = f.ui.epoch;
    f.dialog.close = function () { this.open = false; }; f.dialog.close(); assert.equal(f.ui.epoch, epoch);
    worker.onmessage({data: {result: copy(saved.result)}});
    assert.equal(f.ui.result, null); assert.equal(f.calls.render, 0); assert.equal(f.ui.worker, null); assert.equal(worker.terminated, true);
  });
  await test('delayed old close event does not cancel a reopened dialog computation', async () => {
    const f = fixture(); f.dialog.close = function () { this.open = false; }; await f.ui.action('close');
    await f.ui.open(); await f.ui.run(); const worker = f.workers[0], epoch = f.ui.epoch;
    assert.equal(f.dialog.open, true); f.dialog.fire('close', {});
    assert.equal(f.ui.epoch, epoch); assert.equal(f.ui.worker, worker); assert.notEqual(worker.terminated, true);
    f.ui.cancel(false);
  });
  for (const stage of ['getSaved', 'unpack', 'verify']) for (const change of ['cancel', 'dataset', 'recording', 'delayed-close']) {
    await test('restore rejects ' + change + ' during ' + stage, async () => {
      const f = fixture(), wait = deferred(); f.hooks.getSaved = async () => new Blob(['asset']);
      f.hooks[stage] = () => wait.promise;
      const restoring = f.ui.restore(f.recording, f.ui.epoch); await tick();
      if (change === 'cancel') f.ui.cancel(); else if (change === 'dataset') f.state.datasetToken++;
      else if (change === 'delayed-close') { f.dialog.close = function () { this.open = false; }; f.dialog.close(); }
      else f.state.activeRecording = {...f.recording};
      wait.resolve(stage === 'getSaved' ? new Blob(['asset']) : stage === 'unpack' ? copy(saved) : true);
      await restoring; assert.equal(f.ui.result, null); assert.equal(f.calls.render, 0); assert.equal(f.fields.unitIds.value, '1,2');
    });
  }
  await test('successful restore retains original identity and does not require matching video mapping', async () => {
    const f = fixture(); f.hooks.getSaved = async () => new Blob(['asset']); const identity = f.ui.identity();
    await f.ui.restore(f.recording, f.ui.epoch); assert.deepEqual(copy(f.ui.result), saved); assert.equal(f.ui.resultIdentity, identity); assert.equal(f.calls.render, 1);
  });
  for (const change of ['cancel', 'close', 'dataset', 'recording', 'delayed-close']) await test('save does not write after ' + change + ' during packing', async () => {
    const f = fixture(), packing = deferred(); f.hooks.pack = () => packing.promise; f.ui.result = copy(saved); f.ui.resultIdentity = f.ui.identity();
    const saving = f.ui.save(); await tick();
    if (change === 'cancel') f.ui.cancel(); else if (change === 'close') f.dialog.close(); else if (change === 'dataset') f.state.datasetToken++;
    else if (change === 'delayed-close') { f.dialog.close = function () { this.open = false; }; f.dialog.close(); }
    else f.state.activeRecording = {...f.recording};
    packing.resolve(new Blob(['asset'])); await saving; assert.equal(f.writes.length, 0); assert.equal(f.ui.saving, false);
  });
  await test('repeated Save clicks share a single pending operation', async () => {
    const f = fixture(), packing = deferred(); f.hooks.pack = () => packing.promise; f.ui.result = copy(saved); f.ui.resultIdentity = f.ui.identity();
    const first = f.ui.save(); await f.ui.save(); assert.equal(f.calls.pack, 1); packing.resolve(new Blob(['asset'])); await first; assert.equal(f.writes.length, 1);
  });
  for (const change of ['cancel', 'close', 'dataset', 'recording', 'project', 'delayed-close']) await test('pre-transaction annotation flush respects ' + change, async () => {
    const f = fixture(), flushing = deferred(), entered = deferred();
    const {project, committed} = bindProject(f, () => { entered.resolve(); return flushing.promise; });
    f.ui.result = copy(saved); f.ui.resultIdentity = f.ui.identity(); const saving = f.ui.save(); await entered.promise;
    if (change === 'cancel') f.ui.cancel(); else if (change === 'close') f.dialog.close(); else if (change === 'dataset') f.state.datasetToken++;
    else if (change === 'recording') f.state.activeRecording = {...f.recording};
    else if (change === 'delayed-close') { f.dialog.close = function () { this.open = false; }; f.dialog.close(); }
    else project.active = {...project.active, id: 'other'};
    flushing.resolve(); await saving; assert.equal(committed.length, 0); assert.equal(f.ui.saving, false);
  });
  await test('unchanged context saves after annotation flush without changing role', async () => {
    const f = fixture(), {committed} = bindProject(f, async () => {}); f.ui.result = copy(saved); f.ui.resultIdentity = f.ui.identity();
    await f.ui.save(); assert.equal(committed.length, 1); assert.equal(committed[0].asset.role, 'population-dynamics'); assert.equal(committed[0].key, 'rec');
  });
  await test('project helper checks lifecycle before starting annotation flush', async () => {
    const f = fixture(); let flushed = false; const {project, committed} = bindProject(f, async () => { flushed = true; });
    await assert.rejects(project.savePopulationDynamics(f.recording, new Blob(['asset']), {isCurrent: () => false}), /cancelled or changed/);
    assert.equal(flushed, false); assert.equal(committed.length, 0);
  });
  await test('main application forwards save lifecycle options to the project helper', () => {
    const app = fs.readFileSync(require.resolve('../scripts/app.js'), 'utf8');
    assert.match(app, /saveAnalysis:\s*\(r,blob,options\)\s*=>\s*projectUI\.savePopulationDynamics\(r,blob,options\)/);
  });
  for (const stage of ['database-open', 'transaction-get']) for (const change of ['cancel', 'close', 'delayed-close', 'dataset', 'data-version', 'recording', 'project']) {
    await test('actual ProjectStore rejects ' + change + ' during ' + stage + ' without writes', async () => {
      const f = fixture(), db = bindDeferredDatabase(f); f.ui.result = copy(saved); f.ui.resultIdentity = f.ui.identity();
      const saving = f.ui.save(); await db.enteredOpen.promise;
      if (stage === 'transaction-get') { db.open(); await db.enteredReads.promise; db.release('projects'); assert.equal(db.stats.writes.length, 0); }
      if (change === 'cancel') f.ui.cancel(); else if (change === 'close') f.dialog.close();
      else if (change === 'delayed-close') { f.dialog.close = function () { this.open = false; }; f.dialog.close(); }
      else if (change === 'dataset') f.state.datasetToken++;
      else if (change === 'data-version') f.recording.dataVersion = 1;
      else if (change === 'recording') f.state.activeRecording = {...f.recording};
      else db.project.active = {...db.project.active, id: 'other'};
      if (stage === 'database-open') db.open(); else db.release('assets');
      await saving;
      assert.equal(db.stats.writes.length, 0); assert.equal(db.stats.closes, 1); assert.equal(f.ui.saving, false);
      assert.equal(db.stats.transactions, stage === 'database-open' ? 0 : 1); assert.equal(db.stats.aborts, stage === 'database-open' ? 0 : 1);
      assert.equal(db.stats.rejections.length, 1); assert.match(db.stats.rejections[0].message, /cancelled or changed/);
    });
  }
  await test('ProjectStore rejects an already-invalid guard before opening its database', async () => {
    const f = fixture(), db = bindDeferredDatabase(f);
    await assert.rejects(db.store.saveAnalysis('p', 'rec', {role: 'population-dynamics', recordingId: 'rec', path: 'analysis.neuroanalysis', blob: new Blob(['asset'])}, {isCurrent: () => false}), /cancelled or changed/);
    assert.equal(db.stats.opens, 0); assert.equal(db.stats.writes.length, 0);
  });
  await test('unchanged context commits through real ProjectStore after both delayed reads', async () => {
    const f = fixture(), db = bindDeferredDatabase(f); f.ui.result = copy(saved); f.ui.resultIdentity = f.ui.identity();
    const saving = f.ui.save(); await db.enteredOpen.promise; db.open(); await db.enteredReads.promise;
    db.release('assets'); assert.equal(db.stats.writes.length, 0); db.release('projects'); await saving;
    assert.equal(db.stats.writes.length, 2); assert.equal(db.stats.aborts, 0); assert.equal(db.stats.closes, 1);
    assert.deepEqual(db.stats.writes.find(w => w.name === 'assets').value.map(a => a.role), ['event-analysis', 'population-dynamics']);
  });
  await test('legacy event ProjectStore save accepts omitted lifecycle options', async () => {
    const f = fixture(), db = bindDeferredDatabase(f);
    const saving = db.store.saveAnalysis('p', 'rec', {role: 'event-analysis', recordingId: 'rec', path: 'event.neuroanalysis', blob: new Blob(['new event'])});
    await db.enteredOpen.promise; db.open(); await db.enteredReads.promise; db.release('projects'); db.release('assets');
    const result = await saving; assert.equal(result.assets.length, 1); assert.equal(await result.assets[0].blob.text(), 'new event'); assert.equal(db.stats.closes, 1);
  });
  console.log(JSON.stringify({status: failures ? 'FAIL' : 'PASS', checks, failures, scope: 'Actual deferred UI/project lifecycle methods; cancellation during metadata/hash/restore/packing/annotation flush, Recording/project identity, role preservation. Not full browser QA.'}));
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
