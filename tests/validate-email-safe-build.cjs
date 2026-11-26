// SPDX-License-Identifier: MIT
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {buildStandalone} = require('../scripts/build-standalone.cjs');

const full = buildStandalone();
const emailSafe = buildStandalone({emailSafe: true});
assert.match(full, /window\.NeuropixelsUnitMarks=/);
assert.doesNotMatch(full, /mail-gateway-diagnostic/);
assert.doesNotMatch(emailSafe, /configure\(options\)/);
assert.match(emailSafe, /name="neuropixels-build" content="mail-gateway-diagnostic; unit-marks-disabled"/);
const scripts = [...emailSafe.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
for (const source of scripts) new vm.Script(source);
const removed = [], context = {window: {}, document: {getElementById: id => ({remove: () => removed.push(id)})}};
vm.runInNewContext(scripts.find(source => source.includes('unit-mark-settings')), context);
const marks = context.window.NeuropixelsUnitMarks;
marks.configure();
assert.deepEqual(removed, ['unit-mark-settings']);
assert.equal(marks.ref(), ''); assert.equal(marks.attrs(), ''); assert.equal(marks.targetRef(), '');
assert.equal(marks.popup(), false); assert.deepEqual([...marks.colors()], []);
console.log('PASS: mail-gateway diagnostic standalone disables only Unit marks and keeps every inline script syntactically valid');
