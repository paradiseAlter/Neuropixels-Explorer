"use strict";
// Keep file:// UI, optional Python service and release tags human-readable.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const version = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
if (!/^\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?$/.test(version)) throw new Error("Invalid release version");
const pythonVersion = version.replace(/-alpha\./, "a").replace(/-beta\./, "b").replace(/-rc\./, "rc");
function update(file, fn) { const p = path.join(root, file); fs.writeFileSync(p, fn(fs.readFileSync(p, "utf8"))); }
update("scripts/explorer-shell.html", (s) => s.replace(/<title>Neuropixels Explorer [^<]+<\/title>/, `<title>Neuropixels Explorer ${version}</title>`)
  .replace(/id="version-label">[^<]+/, `id="version-label">${version}`)
  .replace(/\?v=[^" ]+/g, `?v=${version}`));
update("scripts/annotation-ui.js", (s) => s.replace(/<span>\d+\.\d+\.\d+(?:-[^<]+)?<\/span>/, `<span>${version}</span>`)
  .replace(/version: "\d+\.\d+\.\d+(?:-[^"]+)?"/, `version: "${version}"`));
update("pyproject.toml", (s) => s.replace(/^version = "[^"]+"/m, `version = "${pythonVersion}"`));
update("server/neuropixels_explorer/__init__.py", (s) => s.replace(/__version__ = "[^"]+"/, `__version__ = "${pythonVersion}"`));
console.log(JSON.stringify({ version, pythonVersion }));
