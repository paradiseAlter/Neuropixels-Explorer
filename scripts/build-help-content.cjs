"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SOURCES = {
  en: path.join(ROOT, "docs", "USER_GUIDE.en.md"),
  "zh-CN": path.join(ROOT, "docs", "USER_GUIDE.zh-CN.md"),
  es: path.join(ROOT, "docs", "USER_GUIDE.es.md")
};
const OUTPUT = path.join(__dirname, "help-content.js");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listOpen = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listOpen) return;
    html.push("</ul>");
    listOpen = false;
  };

  lines.forEach((line) => {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const listItem = line.match(/^[-*]\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (listItem) {
      flushParagraph();
      if (!listOpen) { html.push("<ul>"); listOpen = true; }
      html.push(`<li>${inlineMarkdown(listItem[1])}</li>`);
    } else if (!line.trim()) {
      flushParagraph();
      closeList();
    } else {
      paragraph.push(line.trim());
    }
  });
  flushParagraph();
  closeList();
  return html.join("\n");
}

function build() {
  const rendered = Object.fromEntries(Object.entries(SOURCES).map(([language, source]) => [language, {
    markdown: fs.readFileSync(source, "utf8"),
    html: renderMarkdown(fs.readFileSync(source, "utf8"))
  }]));
  return `(function (root, factory) {\n  const api = factory();\n  if (typeof module === "object" && module.exports) module.exports = api;\n  else root.NeuropixelsHelpContent = api;\n})(typeof globalThis !== "undefined" ? globalThis : this, function () {\n  "use strict";\n  return Object.freeze(${JSON.stringify(rendered, null, 2)});\n});\n`;
}

const generated = build();
if (process.argv.includes("--check")) {
  if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, "utf8") !== generated) {
    console.error("scripts/help-content.js is stale. Run: node scripts/build-help-content.cjs");
    process.exit(1);
  }
  console.log("Local Help content matches all three Markdown guides.");
} else {
  fs.writeFileSync(OUTPUT, generated, "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)} from ${Object.keys(SOURCES).length} Markdown guides.`);
}

module.exports = { renderMarkdown, build };
