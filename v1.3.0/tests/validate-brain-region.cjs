"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../scripts/brain-region-core.js");

const legacyRoot = path.resolve(__dirname, "../../../data/processed/legacy_tables");

class DiskFile {
  constructor(absolutePath) {
    this.absolutePath = absolutePath;
    this.name = path.basename(absolutePath);
    this.relativePath = `legacy_tables/${this.name}`;
    this.webkitRelativePath = this.relativePath;
    this.size = fs.statSync(absolutePath).size;
  }

  async text() {
    return fs.promises.readFile(this.absolutePath, "utf8");
  }

  slice(start, end) {
    return {
      text: async () => {
        const buffer = await fs.promises.readFile(this.absolutePath);
        return buffer.subarray(start, end).toString("utf8");
      }
    };
  }
}

async function main() {
  const files = fs.readdirSync(legacyRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => new DiskFile(path.join(legacyRoot, entry.name)));
  const result = await core.scanLegacyFolder(files);

  assert.equal(result.valid, true);
  assert.equal(result.fileCount, files.length);
  assert.equal(result.csvCount, files.filter((file) => file.name.toLowerCase().endsWith(".csv")).length);
  assert.equal(result.mappingCount, 1402);
  assert.equal(result.experimentCount, 18);
  assert.equal(result.regionCount, 25);
  assert.equal(result.coordinateCount, 5120);
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(result.selectedDirect.map((item) => item.name), [
    "unit_quality_all_sessions.csv",
    "all_good_units_with_regions.csv",
    "all_units_18exp.csv"
  ]);
  assert.equal(result.coordinateFiles[0].name, "pinpoint_parsed.csv");
  assert.deepEqual(
    ["1::7", "2::0", "3::0", "18::104"].map((key) => [key, result.mapping.get(key)?.region]),
    [["1::7", "MPN"], ["2::0", "MPN"], ["3::0", "act"], ["18::104", "LSr"]]
  );
  assert.equal(result.mapping.get("1::7").atlasColor, "#FF4C3E");

  console.log(JSON.stringify({
    status: "PASS",
    folder: legacyRoot,
    files: result.fileCount,
    mappings: result.mappingCount,
    experiments: result.experimentCount,
    regions: result.regionCount,
    coordinateRows: result.coordinateCount,
    conflicts: result.conflicts.length,
    examples: ["1::7=MPN", "2::0=MPN", "3::0=act", "18::104=LSr"]
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
