// SPDX-License-Identifier: MIT
// Experimental motion grouping. Cluster IDs are not semantic behavior labels.
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelsBehaviorDiscovery = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";
  function cluster(input) {
    const { features, times, duration, count = 8, minimumDuration = .4 } = input;
    if (!Array.isArray(features) || features.length < 8 || features.length !== times.length) throw new Error("At least eight timed motion samples are required");
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(minimumDuration) || minimumDuration < 0 || !Number.isInteger(count) || count < 2 || count > 32) throw new Error("Invalid grouping parameters");
    const n = features.length, d = features[0].length;
    if (!d || d > 256 || n > 60000) throw new Error("Motion feature limit exceeded");
    features.forEach((row, i) => {
      if (row.length !== d || row.some((x) => !Number.isFinite(x)) || !Number.isFinite(times[i]) || times[i] < 0 || times[i] >= duration || (i && times[i] <= times[i - 1])) throw new Error("Invalid feature time series");
    });
    const mean = Array(d).fill(0), std = Array(d).fill(0);
    features.forEach((row) => row.forEach((v, j) => { mean[j] += v / n; }));
    features.forEach((row) => row.forEach((v, j) => { std[j] += (v - mean[j]) ** 2 / n; }));
    const x = features.map((row) => row.map((v, j) => (v - mean[j]) / Math.max(.0001, Math.sqrt(std[j]))));
    const dist = (a, b) => a.reduce((s, v, j) => s + (v - b[j]) ** 2, 0);
    let seed = 42;
    const random = () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
    const k = Math.min(count, n), centers = [[...x[Math.floor(random() * n)]]];
    while (centers.length < k) {
      const weights = x.map((row) => Math.min(...centers.map((c) => dist(row, c))));
      const total = weights.reduce((a, b) => a + b, 0);
      if (total < 1e-10) break;
      let threshold = random() * total, index = n - 1;
      for (let i = 0; i < n; i++) { threshold -= weights[i]; if (threshold <= 0) { index = i; break; } }
      centers.push([...x[index]]);
    }
    let labels = new Array(n).fill(-1);
    for (let iteration = 0; iteration < 35; iteration++) {
      let changed = false;
      const sums = centers.map(() => Array(d).fill(0)), sizes = centers.map(() => 0);
      x.forEach((row, i) => {
        let best = 0, cost = Infinity;
        centers.forEach((c, j) => { const value = dist(row, c); if (value < cost) { best = j; cost = value; } });
        if (labels[i] !== best) changed = true;
        labels[i] = best; sizes[best]++;
        row.forEach((v, j) => { sums[best][j] += v; });
      });
      centers.forEach((c, j) => { if (sizes[j]) centers[j] = sums[j].map((v) => v / sizes[j]); });
      if (!changed) break;
    }
    // Majority-of-three filtering removes isolated assignments, not real frame precision.
    labels = labels.map((v, i, all) => i > 0 && i < n - 1 && all[i - 1] === all[i + 1] ? all[i - 1] : v);
    const runs = () => {
      const rows = [];
      for (let i = 0; i < n; i++) {
        if (!i || labels[i] !== labels[i - 1]) rows.push({ first: i, last: i + 1, group: labels[i] });
        else rows[rows.length - 1].last = i + 1;
      }
      return rows;
    };
    // Merge brief runs toward the adjacent centroid that best explains their features.
    for (let pass = 0; pass < 8; pass++) {
      const rows = runs(); let changed = false;
      rows.forEach((r, i) => {
        const start = r.first ? times[r.first] : 0, end = r.last < n ? times[r.last] : duration;
        if (end - start >= minimumDuration || rows.length === 1) return;
        const adjacent = [rows[i - 1]?.group, rows[i + 1]?.group].filter((v) => v != null);
        const score = (group) => x.slice(r.first, r.last).reduce((s, row) => s + dist(row, centers[group]), 0);
        adjacent.sort((a, b) => score(a) - score(b));
        for (let j = r.first; j < r.last; j++) labels[j] = adjacent[0];
        changed = true;
      });
      if (!changed) break;
    }
    const segments = runs().map((r) => ({ start: r.first ? times[r.first] : 0,
      end: r.last < n ? times[r.last] : duration, group_id: String(r.group),
      distance: x.slice(r.first, r.last).reduce((s, row) => s + Math.sqrt(dist(row, centers[r.group])), 0) / (r.last - r.first) }));
    return { segments, groups: new Set(labels).size, sampleCount: n };
  }
  function workerSource() {
    return `const cluster = ${cluster.toString()}; onmessage = (event) => { try { postMessage({ result: cluster(event.data) }); } catch (error) { postMessage({ error: error.message }); } };`;
  }
  // Position-sensitive baseline, deliberately documented as motion grouping only.
  function frameFeatures(previous, current, width, height) {
    const cells = 4, energy = Array(cells * cells).fill(0), appearance = Array(cells * cells).fill(0);
    let total = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x, cell = Math.floor(y * cells / height) * cells + Math.floor(x * cells / width);
      const motion = Math.abs(current[i] - previous[i]); energy[cell] += motion; appearance[cell] += current[i]; total += motion;
    }
    const pixels = width * height / (cells * cells);
    return [...energy.map((v) => Math.log1p(v / pixels)), ...appearance.map((v) => v / pixels / 255), Math.log1p(total / (width * height))];
  }
  return { cluster, workerSource, frameFeatures, VERSION: "motion-kmeans/1" };
});
