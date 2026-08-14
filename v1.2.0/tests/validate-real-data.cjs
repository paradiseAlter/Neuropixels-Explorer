"use strict";

const fs = require("node:fs");
const path = require("node:path");
const core = require("../scripts/kilosort-core.js");

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const dataRoot = path.join(projectRoot, "data", "raw", "kilosort");
const expectedSpikes = [311792, 321365, 226549, 332349, 330519, 260446, 249067, 248548, 18380, 4757, 5636, 1011, 507413, 562632, 244756, 470471, 189441, 165187];
const expectedClusters = [103, 136, 123, 158, 227, 191, 202, 211, 30, 10, 13, 9, 167, 243, 133, 218, 106, 107];
const expectedSelected = {
  ks4_exp1: { clusterId: 7, spikeCount: 368, duration: 329.42066666666665, first: 1.5909333333333333, last: 328.9558 },
  ks4_exp2: { clusterId: 0, spikeCount: 9238, duration: 300.19376666666665, first: 0.013866666666666666, last: 300.1727 },
  ks4_exp3: { clusterId: 0, spikeCount: 502, duration: 314.45546666666667, first: 0.12596666666666667, last: 313.5541666666667 }
};

function exactArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function close(actual, expected, tolerance = 1e-10) {
  return Math.abs(actual - expected) <= tolerance;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fileObjects() {
  const files = [];
  for (let number = 1; number <= 18; number += 1) {
    const directory = path.join(dataRoot, `ks4_exp${number}`);
    fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile()).forEach((entry) => {
      const absolute = path.join(directory, entry.name);
      files.push({
        name: entry.name,
        size: fs.statSync(absolute).size,
        webkitRelativePath: `kilosort/ks4_exp${number}/${entry.name}`
      });
    });
  }
  return files;
}

const groups = core.groupExperimentFiles(fileObjects());
assert(groups.length === 18, `Expected 18 grouped experiments, found ${groups.length}`);

const catalog = [];
let totalBytes = 0;
for (let number = 1; number <= 18; number += 1) {
  const name = `ks4_exp${number}`;
  const directory = path.join(dataRoot, name);
  const timesBuffer = fs.readFileSync(path.join(directory, "spike_times.npy"));
  const clustersBuffer = fs.readFileSync(path.join(directory, "spike_clusters.npy"));
  const times = core.parseNpyArrayBuffer(exactArrayBuffer(timesBuffer));
  const clusters = core.parseNpyArrayBuffer(exactArrayBuffer(clustersBuffer));
  assert(times.header.shape.length === 1, `${name}: spike_times must be one-dimensional`);
  assert(clusters.header.shape.length === 1, `${name}: spike_clusters must be one-dimensional`);
  assert(times.header.count === clusters.header.count, `${name}: spike array lengths differ`);
  assert(times.header.count === expectedSpikes[number - 1], `${name}: spike count mismatch`);
  const unique = new Set();
  for (let index = 0; index < clusters.header.count; index += 1) unique.add(clusters.valueAt(index));
  assert(unique.size === expectedClusters[number - 1], `${name}: cluster count mismatch`);
  const sampleRate = core.parseSampleRate(fs.readFileSync(path.join(directory, "params.py"), "utf8"));
  assert(sampleRate === 30000, `${name}: unexpected sample rate ${sampleRate}`);
  const experimentBytes = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .reduce((sum, entry) => sum + fs.statSync(path.join(directory, entry.name)).size, 0);
  totalBytes += experimentBytes;
  catalog.push({ experiment: name, spikes: times.header.count, clusters: unique.size, bytes: experimentBytes });

  if (expectedSelected[name]) {
    const labels = core.parseClusterLabels(fs.readFileSync(path.join(directory, "cluster_group.tsv"), "utf8"));
    const firstGood = labels.find((item) => item.quality === "good");
    const expected = expectedSelected[name];
    assert(firstGood?.id === expected.clusterId, `${name}: first good cluster changed`);
    const selected = core.selectUnitSpikes(exactArrayBuffer(timesBuffer), exactArrayBuffer(clustersBuffer), sampleRate, firstGood.id);
    assert(selected.spikeCount === expected.spikeCount, `${name}: selected Unit spike count mismatch`);
    assert(close(selected.duration, expected.duration), `${name}: duration mismatch`);
    assert(close(selected.spikeTimes[0], expected.first), `${name}: first selected spike mismatch`);
    assert(close(selected.spikeTimes.at(-1), expected.last), `${name}: last selected spike mismatch`);
  }
}

assert(totalBytes === 1603487329, `Total indexed size changed: ${totalBytes}`);

console.log(JSON.stringify({
  status: "PASS",
  groupedExperiments: groups.length,
  totalBytes,
  catalog,
  selectedUnits: Object.entries(expectedSelected).map(([experiment, expected]) => ({ experiment, ...expected }))
}, null, 2));
