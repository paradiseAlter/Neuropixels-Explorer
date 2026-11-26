// SPDX-License-Identifier: MIT
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {buildStandalone} = require('../scripts/build-standalone.cjs');

const full = buildStandalone();
const emailSafe = buildStandalone({emailSafe: true});
const region = fs.readFileSync(path.join(__dirname, '../scripts/region-core.js'), 'utf8').replace(/\r\n?/g, '\n');
const unitMarks = fs.readFileSync(path.join(__dirname, '../scripts/unit-marks.js'), 'utf8').replace(/\r\n?/g, '\n');
assert.ok(full.includes(`<script>\n${region}\n</script>`));
assert.ok(emailSafe.includes(`<script>\n${region}\n</script>`));
assert.ok(full.includes(`<script>\n${unitMarks}\n</script>`));
assert.ok(emailSafe.includes(`<script>\n${unitMarks}\n</script>`));
assert.match(full, /window\.NeuropixelsUnitMarks=/);
assert.doesNotMatch(full, /mail-gateway-compatible/);
assert.match(emailSafe, /name="neuropixels-build" content="mail-gateway-compatible; full-feature"/);
assert.match(emailSafe, /configure\(options\)/);
const scripts = [...emailSafe.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
for (const source of scripts) new vm.Script(source);
assert.equal(
  emailSafe.replace('  <meta name="neuropixels-build" content="mail-gateway-compatible; full-feature">\n', ''),
  full
);
console.log('PASS: normal and mail-gateway builds keep region-core and Unit marks readable; mail flavor retains every feature');
