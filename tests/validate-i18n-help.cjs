"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const i18n = require(path.join(ROOT, "scripts", "i18n.js"));
const help = require(path.join(ROOT, "scripts", "help-content.js"));
const pageSource = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(ROOT, "scripts", "app.js"), "utf8");
const probeSource = fs.readFileSync(path.join(ROOT, "scripts", "probe-view.js"), "utf8");
const styleSource = fs.readFileSync(path.join(ROOT, "styles", "app.css"), "utf8");

assert.deepEqual(i18n.LANGUAGES.map((item) => item.code), ["en", "zh-CN", "es"], "Supported languages changed");
assert.equal(i18n.GLOSSARY.unit.en, "Unit");
assert.equal(i18n.GLOSSARY.unit["zh-CN"], "神经元单元");
assert.equal(i18n.GLOSSARY.unit.es, "Unidad");
assert.equal(i18n.GLOSSARY.spike["zh-CN"], "放电事件");
assert.equal(i18n.GLOSSARY.spike.es, "Potencial de acción");
assert.equal(i18n.GLOSSARY.autocorrelogram.es, "Autocorrelograma");

const staticKeys = [...pageSource.matchAll(/data-i18n(?:-title|-aria-label|-placeholder)?="([^"]+)"/g)].map((match) => match[1]);
const dynamicKeys = [appSource, probeSource].flatMap((source) => [...source.matchAll(/\bt\("([^"]+)"/g)].map((match) => match[1]));
const keys = [...new Set([...staticKeys, ...dynamicKeys])];
const missingEnglish = keys.filter((key) => !(key in i18n.DICTIONARY.en));
assert.deepEqual(missingEnglish, [], `Missing English translation keys: ${missingEnglish.join(", ")}`);

for (const language of ["en", "zh-CN", "es"]) {
  const fileExplanation = i18n.translate(language, "status.file.spikeTimingDetail");
  assert(fileExplanation.includes("spike_times.npy") && fileExplanation.includes("spike_clusters.npy"), `${language} should preserve KiloSort filenames while translating their explanation`);
  assert(help[language]?.html.includes("<h1>"), `${language} precompiled Help is missing its title`);
  assert(help[language]?.html.length > 4000, `${language} Help is unexpectedly short`);
  assert(help[language]?.markdown.includes("spike_times.npy"), `${language} Markdown guide must preserve KiloSort filenames`);
  assert(help[language]?.markdown.includes("MPN"), `${language} Markdown guide must preserve brain-region abbreviations`);
}

for (const [key, patterns] of Object.entries({
  "tips.manualReview": [/What:/, /是什么：/, /Qué es:/],
  "tips.probe": [/How to read it:/, /怎么看：/, /Cómo interpretarlo:/],
  "tips.metricIsi": [/When to use it:/, /什么时候使用：/, /Cuándo usarlo:/]
})) {
  ["en", "zh-CN", "es"].forEach((language, index) => assert(patterns[index].test(i18n.translate(language, key)), `${language} ${key} lacks structured explanatory content`));
}

const persisted = new Map();
const root = { lang: "", dataset: {} };
const controller = new i18n.LanguageController({
  root,
  storage: { getItem: (key) => persisted.get(key), setItem: (key, value) => persisted.set(key, value) },
  navigatorLanguage: "en-US"
});
controller.setLanguage("zh");
assert.equal(root.lang, "zh-CN");
assert.equal(root.dataset.language, "zh-CN");
assert.equal(persisted.get(i18n.STORAGE_KEY), "zh-CN");
assert.equal(controller.t("controls.pan"), "平移");
controller.setLanguage("es-MX");
assert.equal(controller.t("controls.pan"), "PAN");

for (const file of ["USER_GUIDE.en.md", "USER_GUIDE.zh-CN.md", "USER_GUIDE.es.md"]) {
  const markdown = fs.readFileSync(path.join(ROOT, "docs", file), "utf8");
  assert(markdown.length > 3000, `${file} is unexpectedly short`);
  assert(!/https?:\/\//.test(markdown), `${file} should not require remote Help content`);
}

assert(pageSource.includes('id="language-select"') && pageSource.includes('id="help-drawer"') && pageSource.includes('id="context-tooltip"'), "Language, Help drawer, or shared tooltip surface is missing");
assert(/help-content\.js\?v=[0-9a-z.-]+/.test(pageSource) && !/(cdn|unpkg|jsdelivr|marked\.min)/i.test(pageSource), "Help must use the checked-in local precompiled asset without a CDN");
assert((pageSource.match(/class="context-help"/g) || []).length >= 12, "Too few contextual Help controls are present");
assert(/addEventListener\("pointerover"/.test(appSource) && /addEventListener\("focusin"/.test(appSource), "Question-mark Help must support hover and keyboard focus");
assert(/event\.key === "Escape" && !elements\.helpDrawer\.hidden/.test(appSource), "Help drawer must close with Escape");
assert(/event\.key === "Tab"/.test(appSource) && /helpDrawer\.querySelectorAll/.test(appSource), "Help drawer keyboard focus containment is missing");
assert(/\.context-tooltip/.test(styleSource) && /\.help-drawer/.test(styleSource), "Tooltip or Help drawer styling is missing");
assert(/positionContextTooltip/.test(appSource) && /window\.innerWidth - width/.test(appSource), "Tooltip viewport-edge adaptation is missing");

console.log(JSON.stringify({
  status: "PASS",
  languages: i18n.LANGUAGES.map((item) => item.code),
  glossaryTerms: Object.keys(i18n.GLOSSARY).length,
  translatedKeys: Object.keys(i18n.DICTIONARY.en).length,
  contextualHelpControls: (pageSource.match(/class="context-help"/g) || []).length,
  helpCharacters: Object.fromEntries(Object.entries(help).map(([language, content]) => [language, content.markdown.length]))
}, null, 2));
