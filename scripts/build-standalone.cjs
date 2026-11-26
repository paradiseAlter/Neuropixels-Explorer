// SPDX-License-Identifier: MIT
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { gzipSync } = require('node:zlib');
const { minify_sync: minifyJavaScript } = require('terser');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n?/g, '\n');
const serializedWorkerModules = new Set([
  'scripts/behavior-discovery.js', 'scripts/behavior-patterns-core.js', 'scripts/event-analysis-core.js',
  'scripts/joint-recording.js', 'scripts/kilosort-core.js', 'scripts/population-dynamics-core.js',
  'scripts/video-features.js'
]);
const readableStandaloneModules = new Set(['scripts/region-core.js', 'scripts/unit-marks.js']);
const minify = (source, {compress = true, mangle = true} = {}) => minifyJavaScript(source, {
  compress: compress ? {passes: 2} : false,
  mangle,
  ecma: 2022,
  format: {comments: false}
}).code;
const inlineScript = (source, mangle = true) => '<script>' + minify(source, {mangle}).replace(/<\/script/gi, '<\\/script') + '</script>';
const readableScript = source => '<script>\n' + source.replace(/<\/script/gi, '<\\/script') + '\n</script>';
// These modules serialize worker factories with Function#toString. Keep their
// identifiers stable because some worker templates also name dependencies.
const script = file => readableStandaloneModules.has(file)
  ? readableScript(read(file))
  : inlineScript(read(file), !serializedWorkerModules.has(file));
function applyStandalonePolicy(html) {
  const hashes = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/gi), ([, source]) =>
    "'sha256-" + createHash('sha256').update(source.replace(/\r\n?/g, '\n')).digest('base64') + "'");
  const policy = ["default-src 'none'", "base-uri 'none'", "object-src 'none'", "form-action 'none'",
    "script-src " + hashes.join(' ') + " 'wasm-unsafe-eval'", "script-src-attr 'none'", "worker-src blob:",
    "connect-src 'self' blob: data:", "style-src 'unsafe-inline'", "img-src blob: data:", "media-src blob: data:"].join('; ');
  return html.replace(/<meta charset="utf-8">(?:\s*<meta http-equiv="Content-Security-Policy"[^>]*>)?/i,
    '<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="' + policy + '">');
}

function buildStandalone({emailSafe = false} = {}) {
  const worker = minify(read('vendor/h5wasm/h5wasm-0.10.3-hdf5-2.2.0.js'), {compress: false, mangle: false}) + '\n' + minify(read('scripts/browser-nwb-worker.js'));
  const packed = gzipSync(worker, {level: 9});
  const workerHash = createHash('sha256').update(packed).digest('hex');
  const adapters = ['vendor/hash-wasm/sha256-4.12.0.umd.min.js', 'scripts/browser-storage.js', 'scripts/browser-project-ui.js'];
  const licenses = ['LICENSE', 'vendor/h5wasm/LICENSE.txt', 'vendor/h5wasm/NATIVE-NOTICES.txt', 'vendor/hash-wasm/LICENSE.txt']
    .map(file => file + '\n' + read(file).replace(/[ \t]+$/gm, '')).join('\n\n').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = read('scripts/explorer-shell.html')
    .replace(/<link rel="stylesheet" href="\.\/([^"?]+)[^"]*">/g, (_, file) => '<style>\n' + read(file) + '\n</style>')
    .replace(/<script src="\.\/([^"?]+)[^"]*"(?: defer)?><\/script>/g, (_, file) =>
      file === 'scripts/app.js'
        ? `<template id="nwb-worker-gzip">${packed.toString('base64')}</template>\n` +
          [...adapters, file].map(script).join('\n').replace('__NWB_WORKER_SHA256__', workerHash)
        : script(file))
    .replace('</body>', () => `<template id="explorer-licenses"><pre>${licenses}</pre></template>\n</body>`)
    .replace('<meta name="viewport"', emailSafe ? '<meta name="neuropixels-build" content="mail-gateway-compatible; full-feature">\n  <meta name="viewport"' : '<meta name="viewport"');
  return applyStandalonePolicy(html);
}

if (require.main === module) {
  const args = process.argv.slice(2), emailSafe = args.includes('--email-safe'), promote = args.includes('--promote');
  const outputArgs = args.filter(arg => arg !== '--email-safe' && arg !== '--promote');
  if (outputArgs.length > 1) throw new Error('Expected at most one output path');
  const output = outputArgs[0];
  if (emailSafe && !output) throw new Error('--email-safe requires an explicit output path');
  if (promote && (emailSafe || output)) throw new Error('--promote cannot be combined with --email-safe or an output path');
  const html = buildStandalone({emailSafe});
  const outputs = promote
    ? [path.join(root, 'index.html'), path.join(root, 'dist', 'Neuropixels-Explorer.html')]
    : [output ? path.resolve(output) : path.join(root, 'dist', 'Neuropixels-Explorer.html')];
  for (const file of outputs) {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, html);
    console.log(file, Buffer.byteLength(html), 'bytes', createHash('sha256').update(html).digest('hex'));
  }
}

module.exports = {buildStandalone, applyStandalonePolicy};
