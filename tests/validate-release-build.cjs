// SPDX-License-Identifier: MIT
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const builder = path.join(root, 'scripts', 'build-standalone.cjs');
const index = path.join(root, 'index.html');
const dist = path.join(root, 'dist', 'Neuropixels-Explorer.html');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before = hash(index);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'neuropixels-release-build-'));

try {
  const candidate = path.join(temp, 'candidate.html');
  execFileSync(process.execPath, [builder, candidate]);
  assert.equal(hash(index), before, 'explicit candidate build changed index.html');
  execFileSync(process.execPath, [builder]);
  assert.equal(hash(index), before, 'default staging build changed index.html');
  assert.equal(hash(candidate), hash(dist), 'candidate and dist builds differ');
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}

console.log('PASS: candidate/default builds stay staged; promotion remains explicit');
