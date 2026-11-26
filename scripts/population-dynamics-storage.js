// SPDX-License-Identifier: MIT
((root, factory) => {
  const api = factory(
    root.NeuropixelsPopulationDynamics || (typeof require === 'function' ? require('./population-dynamics-core.js') : null),
    root.NeuropixelsEventAnalysisStorage || (typeof require === 'function' ? require('./event-analysis-storage.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NeuropixelsPopulationDynamicsStorage = api;
})(globalThis, (core, shared) => {
  'use strict';
  // Checksums detect corruption and changed source content, not authenticity or biological validity.
  const SCHEMA = 'neuropixels-population-dynamics-storage/1', MAGIC = 'NEUROPD1';
  const MAX_BYTES = 64 * 1024 * 1024, CHUNK = 1048576;
  const ROLES = ['spikeTimes', 'spikeClusters', 'sampleRate', 'coverage', 'events'];
  const REQUIRED_ROLES = ROLES.slice(0, 3);
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const abort = signal => { if (signal?.aborted) throw new DOMException('Analysis operation cancelled', 'AbortError'); };
  const digestJSON = value => shared.digestJSON(value);
  const order = (a, b) => a.role < b.role ? -1 : a.role > b.role ? 1 : 0;
  const sourceIdentity = files => files.map(({role, algorithm, chunkBytes, size, digest}) => ({role, algorithm, chunkBytes, size, digest})).sort(order);

  function plainJSON(value) {
    const active = new Set(); let visited = 0, textLength = 0;
    function scan(v, depth) {
      check(depth <= 24 && ++visited <= 6000000, 'Saved population analysis structure exceeds limits');
      if (v === null || typeof v === 'boolean') return;
      if (typeof v === 'number') { check(Number.isFinite(v), 'Saved population analysis contains a nonfinite number'); return; }
      if (typeof v === 'string') { textLength += v.length; check(textLength <= MAX_BYTES, 'Saved population analysis text exceeds limits'); return; }
      check(typeof v === 'object' && !active.has(v), 'Saved population analysis must contain plain JSON without cycles');
      const isArray = Array.isArray(v), prototype = Object.getPrototypeOf(v);
      check(isArray || prototype === null || (Object.prototype.toString.call(v) === '[object Object]' && Object.getPrototypeOf(prototype) === null), 'Saved population analysis must contain plain JSON arrays and objects');
      check(Object.getOwnPropertySymbols(v).length === 0, 'Saved population analysis cannot contain symbol properties');
      active.add(v);
      const keys = Object.keys(v);
      if (isArray) check(keys.length === v.length && keys.every((key, i) => key === String(i)), 'Saved population analysis arrays must be dense and have no extra properties');
      for (const key of keys) { textLength += key.length; scan(v[key], depth + 1); }
      active.delete(v);
    }
    scan(value, 0);
  }

  function validate(record) {
    plainJSON(record);
    check(record?.schema === SCHEMA, 'Unsupported saved population analysis schema');
    check(core && typeof core.validateResult === 'function', 'Population analysis validation is unavailable');
    const validation = core.validateResult(record.result);
    check(validation.valid, 'Invalid saved population result: ' + validation.errors.join('; '));
    check(record.recordingId === record.result.recordingId, 'Saved population analysis belongs to a different Recording');
    check(Number.isFinite(record.sampleRate) && record.sampleRate > 0, 'Invalid saved population sample rate');
    const files = record.sourceFiles;
    check(Array.isArray(files) && files.length >= REQUIRED_ROLES.length && files.length <= ROLES.length &&
      files.every(f => f && ROLES.includes(f.role) && f.algorithm === 'sha256-ordered-chunks/1' && f.chunkBytes === CHUNK &&
        Number.isSafeInteger(f.size) && f.size >= 0 && /^[a-f0-9]{64}$/.test(f.digest)) &&
      new Set(files.map(f => f.role)).size === files.length && REQUIRED_ROLES.every(role => files.some(f => f.role === role)),
    'Missing or invalid saved neural source fingerprints');
    const provenance = record.coverageProvenance, origin = provenance?.origin;
    check(['unknown', 'user-declared-unverified', 'source-reported-unit-intersection', 'source-reported-partial-unit-intersection'].includes(origin), 'Missing saved population coverage provenance');
    check((origin === 'unknown') === (record.result.options.coverage === null), 'Saved population coverage provenance disagrees with result coverage');
    if (origin.startsWith('source-reported-')) check(files.some(f => f.role === 'coverage'), 'Source-reported coverage requires its source fingerprint');
    if (origin === 'source-reported-partial-unit-intersection') check(Array.isArray(provenance.missingUnitIds) && provenance.missingUnitIds.length > 0 &&
      provenance.missingUnitIds.length < record.result.unitIds.length && new Set(provenance.missingUnitIds).size === provenance.missingUnitIds.length &&
      provenance.missingUnitIds.every(id => record.result.unitIds.includes(id)), 'Partial source coverage must retain missing selected Unit identities');
    if (record.provenance !== undefined) check(record.provenance !== null && typeof record.provenance === 'object' && !Array.isArray(record.provenance), 'Invalid saved population provenance');
    if (provenance.recordingId !== undefined) check(provenance.recordingId === record.recordingId, 'Coverage provenance belongs to a different Recording');
    return record;
  }

  async function sourceFingerprints(sources, signal, progress) {
    abort(signal);
    check(Array.isArray(sources) && sources.length <= ROLES.length && sources.every(s => s && ROLES.includes(s.role)), 'Invalid neural source roles');
    const result = await shared.sourceFingerprints(sources, signal, progress);
    abort(signal); return result.sort(order);
  }

  async function pack(record) {
    validate(record);
    const serialized = JSON.stringify(record);
    check(serialized.length <= MAX_BYTES, 'Population analysis asset exceeds storage limits');
    // Snapshot before hashing; mutation while crypto yields cannot change the stored record.
    const snapshot = JSON.parse(serialized);
    const json = new TextEncoder().encode(JSON.stringify({schema: SCHEMA, record: snapshot, recordSHA256: await digestJSON(snapshot)}));
    check(12 + json.length <= MAX_BYTES, 'Population analysis asset exceeds storage limits');
    const prefix = new Uint8Array(12); prefix.set(new TextEncoder().encode(MAGIC));
    new DataView(prefix.buffer).setUint32(8, json.length, true);
    return new Blob([prefix, json], {type: 'application/octet-stream'});
  }

  async function unpack(blob) {
    check(blob && Number.isSafeInteger(blob.size) && blob.size >= 12 && blob.size <= MAX_BYTES, 'Invalid saved population analysis size');
    const prefix = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    check(new TextDecoder().decode(prefix.subarray(0, 8)) === MAGIC, 'Unsupported saved population analysis format');
    const length = new DataView(prefix.buffer).getUint32(8, true);
    check(length > 0 && 12 + length === blob.size, 'Truncated or oversized saved population analysis');
    const bytes = await blob.slice(12).arrayBuffer();
    let envelope;
    try { envelope = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)); }
    catch (_) { throw new Error('Invalid saved population analysis JSON'); }
    check(envelope?.schema === SCHEMA, 'Unsupported saved population analysis schema');
    plainJSON(envelope);
    check(/^[a-f0-9]{64}$/.test(envelope.recordSHA256) && await digestJSON(envelope.record) === envelope.recordSHA256, 'Saved population analysis checksum mismatch');
    return validate(envelope.record);
  }

  async function verifySources(record, sources, recordingId, sampleRate, signal, progress) {
    abort(signal); validate(record);
    check(record.recordingId === recordingId && record.sampleRate === sampleRate, 'Saved population analysis belongs to different recording parameters');
    const current = await sourceFingerprints(sources, signal, progress);
    check(JSON.stringify(sourceIdentity(current)) === JSON.stringify(sourceIdentity(record.sourceFiles)), 'Neural source file content changed; recompute this population analysis');
    // Video identity/alignment is optional provenance, not an input to neural-time computation.
    abort(signal); return true;
  }
  return {SCHEMA, MAX_BYTES, validate, pack, unpack, sourceFingerprints, digestJSON, verifySources};
});
