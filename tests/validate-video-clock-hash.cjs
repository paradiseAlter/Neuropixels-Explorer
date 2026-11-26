// SPDX-License-Identifier: MIT
'use strict';
const assert = require('node:assert/strict');
const {createHash, randomBytes} = require('node:crypto');
global.document = {documentElement:{lang:'en'}};
global.window = {NeuropixelsProjectUI:class {}, NeuropixelsI18n:require('../scripts/i18n.js'),
  NeuropixelsVideoSync:require('../scripts/video-sync.js'),hashwasm:require('../vendor/hash-wasm/sha256-4.12.0.umd.min.js')};
require('../scripts/browser-project-ui.js');
const verify = window.NeuropixelsBrowserProjectUI.verifyClockVideo;
const chunk = 1024 * 1024;
(async () => {
  for (const size of [0, 63, 64, 65, chunk-1, chunk, chunk+1, 3*chunk+55]) {
    const bytes = randomBytes(size), file = new Blob([bytes]);
    const whole = createHash('sha256').update(bytes).digest('hex');
    const source = {size, slice(start,end){ assert(end-start <= chunk); return file.slice(start,end); }};
    let read = 0;
    await verify(source, whole, done=>{assert(done>read);read=done;});
    assert.equal(read,size);
    await assert.rejects(verify(source, '0'.repeat(64)), /SHA-256/);
  }
  const video = new Blob(['source video']);
  const videoInfo = {sha256:createHash('sha256').update('source video').digest('hex'),fps:60,duration_s:1};
  const mapping = {method:'frame_timestamps',offset_s:3,scale:1,verification_status:'verified',
    provenance:{frame_clock:{video_s:[0,1],neural_s:[3,4]}}};
  const file = (session,timeMapping) => new Blob([JSON.stringify({schema:'allen-video-clock/1',session_id:session,video:videoInfo,timeMapping})]);
  const details = window.NeuropixelsBrowserProjectUI.clockDetails;
  assert.deepEqual(await details(file('42',mapping),video,42),{clockSessionId:'42',timeMapping:mapping,frame_rate_hz:60,duration_s:1});
  const UI=window.NeuropixelsBrowserProjectUI;
  const A='allen-42-A',B='allen-42-B',G='nwb-42-G';
  const project={recordingIds:[A,B,G],recordingSources:{
    [A]:{session:'42',probe:'A'},[B]:{session:'42',probe:'B',nwbKind:'Allen NWB'},[G]:{session:'42',probe:'G',nwbKind:'NWB'}}};
  const clockSession=keys=>UI.allenClockSession(project,keys);
  assert.equal(clockSession([A,B]),'42');
  assert.equal(clockSession([G]),null);assert.equal(clockSession([A,G]),null);assert.equal(clockSession(['unknown']),null);
  const camera={timeMapping:mapping,clockSessionId:'42'};
  const scoped=r=>UI.prototype.descriptorForRecording.call({active:project},camera,r);
  assert.equal(scoped({key:A}),camera);assert.equal(scoped({key:B}),camera);
  assert.equal(scoped({key:G}).timeMapping,null);assert.equal(scoped({jointSources:[A,G]}).timeMapping,null);
  await assert.rejects(details(file('43',mapping),video,42),/different Allen session/);
  await assert.rejects(details(file('42',{}),video,42),/time mapping/);
  await assert.rejects(details(new Blob(['{}']),video,42),/frame-clock JSON/);
  await assert.rejects(details(file('42',mapping),video,undefined),/Allen session ID/);
  console.log('PASS full-file SHA-256, bounded reads, clock identity, verified mapping and annotation-file rejection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
