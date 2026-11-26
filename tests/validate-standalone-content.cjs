// SPDX-License-Identifier: MIT
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const vm = require('node:vm');
const {buildStandalone} = require('../scripts/build-standalone.cjs');

const html = buildStandalone();
const region = fs.readFileSync(path.join(__dirname, '../scripts/region-core.js'), 'utf8').replace(/\r\n?/g, '\n');
const unitMarks = fs.readFileSync(path.join(__dirname, '../scripts/unit-marks.js'), 'utf8').replace(/\r\n?/g, '\n');
assert.ok(html.includes(`<script>\n${region}\n</script>`));
assert.ok(html.includes(`<script>\n${unitMarks}\n</script>`));
assert.match(html, /window\.NeuropixelsUnitMarks=/);
assert.match(html, /configure\(options\)/);
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
for (const source of scripts) new vm.Script(source);
const unknown = spawnSync(process.execPath, [path.join(__dirname, '../scripts/build-standalone.cjs'), '--unknown'], {encoding: 'utf8'});
assert.notEqual(unknown.status, 0);
assert.match(unknown.stderr, /Unknown option/);
console.log('PASS: standalone keeps region-core and Unit marks readable and every inline script parses');
