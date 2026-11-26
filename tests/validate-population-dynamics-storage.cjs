// SPDX-License-Identifier: MIT
// Synthetic persistence/identity QA only, not biological evidence.
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const C = require('../scripts/population-dynamics-core.js');
const P = require('../scripts/population-dynamics-storage.js');
const E = require('../scripts/event-analysis-storage.js');
const S = require('../scripts/browser-storage.js');
const clone = value => JSON.parse(JSON.stringify(value));
const FileClass = globalThis.File || require('node:buffer').File;
let checks = 0;
async function test(name, run) { await run(); checks++; console.log('PASS ' + name); }

// Minimal async transaction double: selected stores commit atomically, annotations are separate.
function databaseFixture(initial) {
  const stores = Object.fromEntries(Object.entries(initial).map(([name, values]) => [name, new Map(values)]));
  let closes = 0;
  const db = {
    close() { closes++; },
    transaction(names, mode) {
      names = Array.isArray(names) ? names : [names];
      const staged = Object.fromEntries(names.map(name => [name, new Map(stores[name])]));
      let stopped = false;
      const tx = {
        error: null,
        abort() { stopped = true; queueMicrotask(() => tx.onabort?.()); },
        objectStore(name) {
          assert.ok(names.includes(name), 'Transaction may only access declared stores');
          return {
            get(key) { const request = {}; queueMicrotask(() => { if (!stopped) { request.result = staged[name].get(key); request.onsuccess?.(); } }); return request; },
            put(value, key) { assert.equal(mode, 'readwrite'); staged[name].set(key, value); return {}; }
          };
        }
      };
      setImmediate(() => { if (!stopped) { for (const name of names) stores[name] = staged[name]; tx.oncomplete?.(); } });
      return tx;
    }
  };
  const store = new S.ProjectStore(); store.db = async () => db;
  return {store, get: (name, id) => stores[name].get(id), get closes() { return closes; }};
}

function uiFixture(assets, store) {
  const context = {
    window: {NeuropixelsBrowserStorage: S, NeuropixelExplorerCore: {}, NeuropixelsProjectUI: class {}},
    File: FileClass, Blob, URL, document: {getElementById: () => null}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/browser-project-ui.js'), 'utf8'), context);
  const ui = Object.create(context.window.NeuropixelsBrowserProjectUI.prototype);
  const recording = {key: 'rec'};
  Object.assign(ui, {active: {id: 'p', name: 'Synthetic', recordingIds: ['rec', 'other']}, assets, store,
    state: {activeRecording: recording}, video:{source:null,currentVideoTime:0}, annotations: {flush: async () => {}}, dialog: {close() {}}, render() {}, markChanged() {this.dirty=true;}});
  return {ui, recording};
}

async function rewrite(blob, change, checksum = false) {
  const m = JSON.parse(await blob.slice(12).text()); change(m);
  if (checksum) m.recordSHA256 = await P.digestJSON(m.record);
  const bytes = new TextEncoder().encode(JSON.stringify(m));
  const prefix = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  new DataView(prefix.buffer).setUint32(8, bytes.length, true);
  return new Blob([prefix, bytes]);
}

(async () => {
  const counts = Array.from({length: 100}, (_, i) => [2 + (i * 7 % 5), 1 + (i * 11 % 7), (i * i + 3 * i) % 11]);
  const trains = counts[0].map((_, j) => ({unitId: 100 + j, spikes: counts.flatMap((row, i) => Array.from({length: row[j]}, (_, k) => i + (k + 1) / (row[j] + 1)))}));
  const result = C.run(trains, {recordingId: 'rec', start: 0, end: 100, binWidth: 1, coverage: null});
  const sources = [{role: 'spikeTimes', file: new Blob(['times'])}, {role: 'spikeClusters', file: new Blob(['units'])}, {role: 'sampleRate', file: new Blob(['sample_rate = 30000'])}];
  const record = {schema: P.SCHEMA, recordingId: 'rec', sampleRate: 30000, sourceFiles: await P.sourceFingerprints(sources), result, coverageProvenance: {origin: 'unknown'}, timeMapping: {offset_s: 5}};
  let blob, restored;
  await test('plain-array result and complete provenance roundtrip exactly', async () => {
    blob = await P.pack(record); restored = await P.unpack(blob);
    assert.deepEqual(restored, record); assert.ok(Array.isArray(restored.result.counts[0])); assert.equal(P.validate(restored), restored);
    assert.equal(new TextDecoder().decode(await blob.slice(0, 8).arrayBuffer()), 'NEUROPD1');
  });
  await test('source identity uses the existing ordered-chunk algorithm', async () => {
    assert.deepEqual(record.sourceFiles, (await E.sourceFingerprints(sources)).sort((a, b) => a.role < b.role ? -1 : 1));
    const large = new Blob([new Uint8Array(1048576).fill(1), 'tail']);
    assert.deepEqual((await P.sourceFingerprints([{role: 'spikeTimes', file: large}]))[0], {role: 'spikeTimes', ...await E.fingerprint(large)});
  });
  await test('current sources match regardless of enumeration order', async () => {
    assert.equal(await P.verifySources(restored, sources.slice().reverse(), 'rec', 30000), true);
  });
  await test('same-size neural source replacement is rejected', async () => {
    await assert.rejects(P.verifySources(restored, [{role: 'spikeTimes', file: new Blob(['other'])}, ...sources.slice(1)], 'rec', 30000), /content changed/);
  });
  await test('Recording and sample-rate identity are exact', async () => {
    await assert.rejects(P.verifySources(restored, sources, 'other', 30000), /recording parameters/);
    await assert.rejects(P.verifySources(restored, sources, 'rec', 30001), /recording parameters/);
    await assert.rejects(P.pack({...record, recordingId: 'other'}), /different Recording/);
    await assert.rejects(P.pack({...record, sampleRate: 0}), /sample rate/);
  });
  await test('missing, extra, unknown and duplicate source roles fail closed', async () => {
    await assert.rejects(P.pack({...record, sourceFiles: record.sourceFiles.slice(1)}), /fingerprints/);
    await assert.rejects(P.pack({...record, sourceFiles: [...record.sourceFiles, record.sourceFiles[0]]}), /fingerprints/);
    await assert.rejects(P.verifySources(restored, sources.slice(1), 'rec', 30000), /content changed/);
    await assert.rejects(P.verifySources(restored, [...sources, {role: 'coverage', file: new Blob(['new'])}], 'rec', 30000), /content changed/);
    await assert.rejects(P.sourceFingerprints([...sources, {role: 'video', file: new Blob(['video'])}]), /roles/);
    await assert.rejects(P.sourceFingerprints([sources[0], sources[0]]), /duplicate/);
  });
  await test('changed fingerprint algorithm, size and digest are rejected', async () => {
    for (const change of [f => f.algorithm = 'sha256/other', f => f.chunkBytes = 1, f => f.size = -1, f => f.digest = 'bad']) {
      const r = clone(record); change(r.sourceFiles[0]); await assert.rejects(P.pack(r), /fingerprints/);
    }
  });
  await test('unknown/manual/source-reported coverage stays explicit', async () => {
    await assert.rejects(P.pack({...record, coverageProvenance: {origin: 'user-declared-unverified'}}), /disagrees/);
    const covered = {...record, result: C.run(trains, {...result.options, recordingId: 'rec', coverage: [[0, 100]]}), coverageProvenance: {origin: 'user-declared-unverified'}};
    assert.equal((await P.unpack(await P.pack(covered))).coverageProvenance.origin, 'user-declared-unverified');
    covered.coverageProvenance = {origin: 'source-reported-unit-intersection', recordingId: 'rec'};
    await assert.rejects(P.pack(covered), /source fingerprint/);
    const coveredSources = [...sources, {role: 'coverage', file: new Blob(['source coverage'])}];
    covered.sourceFiles = await P.sourceFingerprints(coveredSources);
    assert.equal(await P.verifySources(await P.unpack(await P.pack(covered)), coveredSources, 'rec', 30000), true);
    await assert.rejects(P.pack({...covered, coverageProvenance: {...covered.coverageProvenance, recordingId: 'other'}}), /different Recording/);
  });
  await test('video mapping is optional provenance, never a neural invalidation input', async () => {
    const r = clone(record); delete r.timeMapping;
    assert.equal(await P.verifySources(await P.unpack(await P.pack(r)), sources, 'rec', 30000), true);
    r.timeMapping = {offset_s: 999, scale: 0.7};
    assert.equal(await P.verifySources(r, sources, 'rec', 30000), true);
  });
  await test('partial source coverage retains explicitly missing selected Units', async () => {
    const r = {...record, result: C.run(trains, {...result.options, recordingId: 'rec', coverage: [[0, 100]]}),
      sourceFiles: await P.sourceFingerprints([...sources, {role: 'coverage', file: new Blob(['partial coverage'])}]),
      coverageProvenance: {origin: 'source-reported-partial-unit-intersection', missingUnitIds: [102]}};
    assert.deepEqual((await P.unpack(await P.pack(r))).coverageProvenance.missingUnitIds, [102]);
    for (const missingUnitIds of [[], [999], [102, 102], r.result.unitIds, null]) {
      await assert.rejects(P.pack({...r, coverageProvenance: {...r.coverageProvenance, missingUnitIds}}), /missing selected Unit identities/);
    }
  });
  await test('optional event-source invalidity metadata is preserved and source-bound', async () => {
    const withEvents = [...sources, {role: 'events', file: new Blob(['invalidity source'])}];
    const r = {...record, sourceFiles: await P.sourceFingerprints(withEvents), provenance: {createdAt: '2026-01-01T00:00:00.000Z', invalidTimes: {status: 'preserved-not-applied'}, metadataErrors: [], interpretation: 'Not biological evidence'}};
    const loaded = await P.unpack(await P.pack(r)); assert.deepEqual(loaded.provenance, r.provenance);
    assert.equal(await P.verifySources(loaded, withEvents, 'rec', 30000), true);
    await assert.rejects(P.verifySources(loaded, [...sources, {role: 'events', file: new Blob(['different source'])}], 'rec', 30000), /content changed/);
    await assert.rejects(P.pack({...record, provenance: []}), /provenance/);
  });
  await test('truncated prefix, payload, extra bytes and forged length are rejected', async () => {
    await assert.rejects(P.unpack(blob.slice(0, 11)), /size/);
    await assert.rejects(P.unpack(blob.slice(0, blob.size - 1)), /Truncated/);
    await assert.rejects(P.unpack(new Blob([blob, 'extra'])), /oversized/);
    const prefix = new Uint8Array(await blob.slice(0, 12).arrayBuffer()); new DataView(prefix.buffer).setUint32(8, 0xffffffff, true);
    await assert.rejects(P.unpack(new Blob([prefix, blob.slice(12)])), /oversized/);
  });
  await test('wrong magic, schema, malformed JSON and invalid UTF-8 are rejected', async () => {
    await assert.rejects(P.unpack(new Blob(['WRONGPD1', blob.slice(8)])), /format/);
    await assert.rejects(P.unpack(await rewrite(blob, m => m.schema = 'future/2')), /schema/);
    const prefix = new Uint8Array(await blob.slice(0, 12).arrayBuffer()); new DataView(prefix.buffer).setUint32(8, 1, true);
    await assert.rejects(P.unpack(new Blob([prefix, '{'])), /JSON/);
    await assert.rejects(P.unpack(new Blob([prefix, new Uint8Array([255])])), /JSON/);
  });
  await test('checksum covers counts and provenance metadata', async () => {
    for (const change of [m => m.record.result.counts[0][0]++, m => m.record.sampleRate++, m => m.record.timeMapping.offset_s++, m => m.recordSHA256 = '0'.repeat(64)]) {
      await assert.rejects(P.unpack(await rewrite(blob, change)), /checksum/);
    }
  });
  await test('valid checksum cannot bypass core structural/numerical validation', async () => {
    await assert.rejects(P.unpack(await rewrite(blob, m => m.record.result.counts[0][0] = -1, true)), /Invalid saved population result/);
    await assert.rejects(P.pack({...record, result: {...result, schema: 'future/2'}}), /Invalid saved population result/);
  });
  await test('typed arrays, sparse arrays, cycles and lossy JSON values are rejected', async () => {
    for (const value of [new Float64Array([1, 2]), [, 1], NaN, Infinity, undefined, 1n, new Date(), () => {}]) {
      await assert.rejects(P.pack({...record, extra: value}), /plain JSON|dense|nonfinite/);
    }
    const cyclic = {...record}; cyclic.extra = cyclic; await assert.rejects(P.pack(cyclic), /cycles/);
  });
  await test('oversized/deep structures are bounded before reading or serialization', async () => {
    await assert.rejects(P.unpack({size: P.MAX_BYTES + 1, slice() { throw Error('must not read'); }}), /size/);
    const r = clone(record); let at = r; for (let i = 0; i < 25; i++) { at.extra = {}; at = at.extra; }
    await assert.rejects(P.pack(r), /structure exceeds/);
  });
  await test('source hashing honors cancellation and reports progress', async () => {
    const controller = new AbortController(); controller.abort();
    await assert.rejects(P.verifySources(record, sources, 'rec', 30000, controller.signal), e => e.name === 'AbortError');
    await assert.rejects(P.sourceFingerprints(sources, controller.signal), e => e.name === 'AbortError');
    const progress = []; await P.sourceFingerprints(sources, null, p => progress.push(p));
    assert.equal(progress.length, 3); assert.ok(progress.every(p => p.done === p.total));
  });
  const project = {id: 'p', name: 'Synthetic storage QA', recordingIds: ['rec', 'other'], videos: {rec: {timeMapping: {offset_s: 5}}}};
  const annotations = {key: {segments: [{label: 'QA only', start: 1, end: 2}], schemes: [{name: 'original'}]}};
  const asset = (role, recordingId = 'rec', contents = 'saved') => ({path: `analyses/${role}/${recordingId}.neuroanalysis`, name: `${role}.neuroanalysis`, role, recordingId, blob: new Blob([contents])});
  const oldAssets = [{path: 'rec/spike_times.npy', name: 'spike_times.npy', blob: new Blob(['raw'])}, {path: 'video:rec', name: 'video.mp4', role: 'video', blob: new Blob(['video'])}, asset('event-analysis'), asset('population-dynamics'), asset('event-analysis', 'other'), asset('population-dynamics', 'other')];
  const saved = {...asset('population-dynamics'), blob};
  await test('saving each analysis role preserves other roles, recordings, annotations and raw assets', async () => {
    const db = databaseFixture({projects: [['p', project]], assets: [['p', oldAssets]], annotations: [['p', annotations]]});
    let updated = await db.store.saveAnalysis('p', 'rec', saved);
    assert.equal(updated.assets.length, oldAssets.length); assert.equal(updated.assets.at(-1), saved);
    for (const original of oldAssets.filter(a => a.role !== 'population-dynamics' || a.recordingId !== 'rec')) assert.ok(updated.assets.includes(original));
    const event = asset('event-analysis', 'rec', 'new event'); updated = await db.store.saveAnalysis('p', 'rec', event);
    assert.ok(updated.assets.includes(saved)); assert.equal(updated.assets.at(-1), event);
    assert.equal(db.get('annotations', 'p'), annotations); assert.equal(db.get('projects', 'p').videos, project.videos); assert.equal(db.closes, 2);
  });
  await test('analysis save rejects unsupported role and mismatched Recording before writing', async () => {
    const db = databaseFixture({projects: [['p', project]], assets: [['p', oldAssets]], annotations: [['p', annotations]]});
    for (const bad of [asset('video'), asset('population-dynamics', 'other'), {...saved, blob: null}]) await assert.rejects(db.store.saveAnalysis('p', 'rec', bad), /role or Recording/);
    assert.equal(db.get('assets', 'p'), oldAssets); assert.equal(db.closes, 0);
  });
  await test('deleted project or removed Recording aborts without partial writes', async () => {
    for (const p of [null, {...project, recordingIds: ['other']}]) {
      const db = databaseFixture({projects: p ? [['p', p]] : [], assets: [['p', oldAssets]], annotations: [['p', annotations]]});
      await assert.rejects(db.store.saveAnalysis('p', 'rec', saved), /Project changed/);
      assert.equal(db.get('assets', 'p'), oldAssets); assert.equal(db.get('annotations', 'p'), annotations);
    }
  });
  await test('project/1 package preserves both analysis roles, annotations, video and exact result', async () => {
    const assets = [...oldAssets.filter(a => a.role !== 'population-dynamics' || a.recordingId !== 'rec'), saved];
    const packed = S.pack(project, assets, annotations), roundtrip = await S.unpack(packed);
    assert.equal(S.SCHEMA, 'neuropixels-browser-project/1'); assert.deepEqual(roundtrip.project, project); assert.deepEqual(roundtrip.annotations, annotations);
    assert.deepEqual(roundtrip.assets.map(({blob, ...metadata}) => metadata.role), assets.map(a => a.role));
    assert.deepEqual(await P.unpack(roundtrip.assets.find(a => a.role === 'population-dynamics' && a.recordingId === 'rec').blob), record);
    assert.equal(await roundtrip.assets.find(a => a.role === 'event-analysis').blob.text(), 'saved');
    await assert.rejects(S.unpack(packed.slice(0, packed.size - 1)), /Truncated/);
  });
  await test('older project packages without analysis remain compatible', async () => {
    const older = await S.unpack(S.pack(project, oldAssets.slice(0, 2), annotations));
    assert.equal(older.assets.length, 2); assert.deepEqual(older.annotations, annotations);
  });
  await test('browser project getters separate roles and reject ambiguous duplicates', () => {
    const {ui, recording} = uiFixture(oldAssets);
    assert.equal(ui.getEventAnalysis(recording), oldAssets[2].blob); assert.equal(ui.getPopulationDynamics(recording), oldAssets[3].blob);
    assert.equal(ui.getPopulationDynamics({key: 'missing'}), null);
    ui.assets = [...oldAssets, asset('population-dynamics')]; assert.throws(() => ui.getPopulationDynamics(recording), /ambiguous/);
    assert.equal(ui.getEventAnalysis(recording), oldAssets[2].blob);
  });
  await test('browser project reopens neural inputs without ingesting saved analyses', async () => {
    const {ui} = uiFixture(oldAssets, {request: async () => oldAssets}); let files;
    ui.activate = async () => {}; ui.openFiles = async f => { files = f; };
    await ui.openCached(project);
    assert.deepEqual(files.map(f => f.name), ['spike_times.npy']); assert.equal(files[0].relativePath, 'rec/spike_times.npy');
  });
  await test('browser save methods isolate paths/roles and flush annotations', async () => {
    const calls = [], {ui, recording} = uiFixture(oldAssets, {saveAnalysis: async (id, key, a) => { calls.push({id, key, a}); return {project, assets: [a]}; }});
    let flushes = 0; ui.annotations.flush = async () => { flushes++; };
    await ui.savePopulationDynamics(recording, blob); await ui.saveEventAnalysis(recording, blob);
    assert.deepEqual(calls.map(c => c.a.role), ['population-dynamics', 'event-analysis']);
    assert.equal(calls[0].a.path, 'analyses/population-dynamics/rec.neuroanalysis'); assert.equal(calls[1].a.path, 'analyses/event-response/rec.neuroanalysis'); assert.equal(flushes, 2);
  });
  await test('browser save rechecks Recording/project after annotation flush', async () => {
    const {ui, recording} = uiFixture(oldAssets, {saveAnalysis: async () => { throw Error('must not write'); }});
    await assert.rejects(ui.savePopulationDynamics({key: 'other'}, blob), /Recording changed/);
    ui.annotations.flush = async () => { ui.state.activeRecording = {key: 'other'}; };
    await assert.rejects(ui.savePopulationDynamics(recording, blob), /Project changed/);
    ui.state.activeRecording = recording; ui.annotations.flush = async () => { ui.active = {id: 'another'}; };
    await assert.rejects(ui.savePopulationDynamics(recording, blob), /Project changed/);
  });
  console.log(JSON.stringify({status: 'PASS', checks, scope: 'Synthetic population persistence, neural source/Recording identity, integrity/limits, isolated analysis roles and project/1 roundtrip; no biological inference'}));
})().catch(error => { console.error(error); process.exitCode = 1; });
