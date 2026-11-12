// SPDX-License-Identifier: MIT
// Optional, data-only model exchange. Groups are suggestions, never behavior truth.
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelsVideoFeatures = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createVideoFeatures() {
  "use strict";
  const SCHEMA = "neuropixels-video-features/1", REQUEST = "neuropixels-model-input/1", VERSION = "video-feature-kmeans/1";
  const LIMITS = { samples: 20000, dimensions: 128, cells: 1000000, bytes: 25000000, operations: 60000000 };
  const clone = x => JSON.parse(JSON.stringify(x));
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const text = (v, name, max = 200) => { check(typeof v === "string" && v.trim() && v.length <= max && !["__proto__", "constructor", "prototype"].includes(v), `Invalid ${name}`); return v; };
  const number = (v, name) => { check(typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1e9, `Invalid ${name}`); return v; };
  function fingerprint(value) {
    check(value?.algorithm === "sha256-ordered-chunks/1" && value.chunkBytes === 1048576 && Number.isSafeInteger(value.size) && value.size > 0 && /^[a-f0-9]{64}$/.test(value.digest), "A verified chunk-content video fingerprint is required");
    return value;
  }
  function sameVideo(video, context) {
    check(video?.name === context.videoName && video.size === context.videoSize && Number.isSafeInteger(video.size) && video.size > 0, "Feature video identity does not match");
    check(Math.abs(number(video.duration, "video duration") - context.duration) < .001, "Feature video duration does not match");
    const actual = fingerprint(context.videoFingerprint), claimed = fingerprint(video.fingerprint);
    check(claimed.size === video.size && claimed.size === actual.size && claimed.digest === actual.digest, "Feature video content does not match");
  }
  function validate(input, context) {
    check(input?.schema === SCHEMA && input.timebase === "video_seconds", "Expected timestamped features in video_seconds");
    text(input.recordingKey, "Recording identity"); check(input.recordingKey === context.recordingKey, "Feature Recording does not match"); sameVideo(input.video, context);
    text(input.id, "feature asset ID"); text(input.subject, "subject"); text(input.track, "track");
    text(input.model?.name, "model name"); text(input.model?.version, "model version");
    text(input.model?.source, "model source", 2000);
    check(["features", "keypoints2d"].includes(input.kind), "Unsupported feature kind");
    check(Array.isArray(input.names) && input.names.length > 0 && input.names.length <= (input.kind === "features" ? 128 : 64), "Invalid feature names");
    input.names.forEach(n => text(n, "feature name")); check(new Set(input.names).size === input.names.length, "Duplicate feature name");
    check(Array.isArray(input.samples) && input.samples.length > 0 && input.samples.length <= LIMITS.samples, "Feature sample limit exceeded");
    const dimensions = input.names.length * (input.kind === "features" ? 1 : 2);
    check(input.samples.length * dimensions <= LIMITS.cells, "Feature cell limit exceeded");
    if (input.kind === "keypoints2d") check(["image_pixels", "image_relative"].includes(input.coordinateSpace), "Declare keypoint coordinate space");
    else check(Array.isArray(input.units) && input.units.length === dimensions && input.units.every(v => typeof v === "string" && v.length > 0 && v.length <= 80), "Declare each feature unit");
    const ids = new Set(); let previousEnd = -Infinity;
    input.samples.forEach(s => {
      text(s.id, "sample ID"); check(!ids.has(s.id), "Duplicate sample ID"); ids.add(s.id);
      number(s.start, "sample start"); number(s.end, "sample end"); number(s.time, "sample timestamp");
      check(s.start >= 0 && s.end > s.start && s.end <= context.duration && s.time >= s.start && s.time < s.end && s.start >= previousEnd, "Samples must be ordered, nonoverlapping, explicit video intervals"); previousEnd = s.end;
      if (s.frame != null) check(Number.isSafeInteger(s.frame) && s.frame >= 0, "Invalid source frame ID");
      check(Array.isArray(s.values) && s.values.length === input.names.length, "Feature row shape mismatch");
      for (const v of s.values) {
        if (v === null) continue;
        if (input.kind === "features") number(v, "feature value");
        else {
          check(Array.isArray(v) && v.length === 3, "Keypoints require x, y, confidence or null");
          number(v[0], "keypoint x"); number(v[1], "keypoint y"); number(v[2], "keypoint confidence");
          check(v[2] >= 0 && v[2] <= 1, "Confidence must be between zero and one");
        }
      }
    });
    check(new TextEncoder().encode(JSON.stringify(input)).length <= LIMITS.bytes, "Feature asset exceeds 25 MB text limit");
    return clone(input);
  }
  function prepare(input, context, options = {}) {
    const asset = validate(input, context), minConfidence = options.minConfidence ?? .8, normalization = options.normalization ?? "zscore";
    check(Number.isFinite(minConfidence) && minConfidence >= 0 && minConfidence <= 1, "Invalid confidence threshold");
    check(["zscore", "none"].includes(normalization), "Unsupported feature normalization");
    const pose = asset.poseNormalization || { mode: "none" };
    check(["none", "body2d"].includes(pose.mode), "Unsupported pose normalization");
    let center, axis;
    if (pose.mode === "body2d") {
      check(asset.kind === "keypoints2d" && asset.names.includes(pose.center) && Array.isArray(pose.axis) && pose.axis.length === 2 && pose.axis[0] !== pose.axis[1] && pose.axis.every(n => asset.names.includes(n)) && typeof pose.scale === "boolean" && typeof pose.rotate === "boolean", "Body normalization requires named center/axis and explicit scale/rotate choices");
      center = asset.names.indexOf(pose.center); axis = pose.axis.map(n => asset.names.indexOf(n));
    }
    const features = [], samples = [], excluded = [];
    for (const sample of asset.samples) {
      let reason = sample.values.some(v => v === null) ? "missing_value" : null;
      if (!reason && asset.kind === "keypoints2d" && sample.values.some(v => v[2] < minConfidence)) reason = "low_confidence";
      let row;
      if (!reason && asset.kind === "features") row = [...sample.values];
      if (!reason && asset.kind === "keypoints2d") {
        let ox = 0, oy = 0, scale = 1, cos = 1, sin = 0;
        if (pose.mode === "body2d") {
          [ox, oy] = sample.values[center];
          const dx = sample.values[axis[1]][0] - sample.values[axis[0]][0], dy = sample.values[axis[1]][1] - sample.values[axis[0]][1], length = Math.hypot(dx, dy);
          if (length < 1e-9 && (pose.scale || pose.rotate)) reason = "degenerate_body_axis";
          if (!reason) { if (pose.scale) scale = length; if (pose.rotate) { cos = dx / length; sin = dy / length; } }
        }
        if (!reason) row = sample.values.flatMap(v => { const x = v[0] - ox, y = v[1] - oy; return [(x * cos + y * sin) / scale, (-x * sin + y * cos) / scale]; });
      }
      if (reason) excluded.push({ id: sample.id, start: sample.start, end: sample.end, reason });
      else { features.push(row); samples.push({ id: sample.id, start: sample.start, end: sample.end, time: sample.time, frame: sample.frame ?? null }); }
    }
    check(features.length >= 8, "At least eight complete eligible feature samples are required");
    const n = features.length, d = features[0].length, mean = Array(d).fill(0), std = Array(d).fill(0);
    for (const row of features) row.forEach((v, j) => { mean[j] += v / n; });
    for (const row of features) row.forEach((v, j) => { std[j] += (v - mean[j]) ** 2 / n; });
    std.forEach((v, j) => { std[j] = Math.sqrt(v); });
    const active = std.map((v, i) => v > 1e-12 ? i : -1).filter(i => i >= 0);
    check(active.length > 0, "All eligible feature dimensions are constant");
    const matrix = features.map(row => active.map(j => normalization === "zscore" ? (row[j] - mean[j]) / std[j] : row[j]));
    return { asset, samples, matrix, excluded, preprocessing: { minConfidence, normalization, pose: clone(pose), mean, std, activeDimensions: active, missingPolicy: "exclude_entire_sample_no_gap_fill" } };
  }
  function group(input, context, options = {}) {
    const prepared = prepare(input, context, options), { matrix: x, samples } = prepared, n = x.length, d = x[0].length;
    const count = options.count ?? 8, seed = options.seed ?? 42;
    check(Number.isInteger(count) && count >= 2 && count <= 32 && count <= n, "Choose 2–32 groups, no more than eligible samples");
    check(Number.isSafeInteger(seed) && seed >= 0 && seed <= 4294967295, "Invalid grouping seed");
    check(n * d * count * 36 <= LIMITS.operations, "Grouping work limit exceeded; use fewer samples, dimensions or groups");
    const distance = (a, b) => a.reduce((v, z, i) => v + (z - b[i]) ** 2, 0);
    let rng = seed >>> 0; const random = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
    const centers = [[...x[Math.floor(random() * n)]]];
    while (centers.length < count) {
      const weights = x.map(row => Math.min(...centers.map(c => distance(row, c)))), total = weights.reduce((a, b) => a + b, 0);
      if (total < 1e-12) break;
      let value = random() * total, i = 0; while (i < n - 1 && (value -= weights[i]) > 0) i++;
      centers.push([...x[i]]);
    }
    let labels = Array(n).fill(-1), converged = false, iterations = 0;
    for (; iterations < 35; iterations++) {
      let changed = false; const sums = centers.map(() => Array(d).fill(0)), sizes = centers.map(() => 0);
      x.forEach((row, i) => {
        let best = 0, cost = Infinity;
        centers.forEach((c, j) => { const v = distance(row, c); if (v < cost) { best = j; cost = v; } });
        if (labels[i] !== best) changed = true;
        labels[i] = best; sizes[best]++; row.forEach((v, j) => { sums[best][j] += v; });
      });
      centers.forEach((c, j) => { if (sizes[j]) centers[j] = sums[j].map(v => v / sizes[j]); });
      if (!changed) { converged = true; iterations++; break; }
    }
    const segments = [];
    samples.forEach((s, i) => {
      const dist = Math.sqrt(distance(x[i], centers[labels[i]])), last = segments.at(-1);
      // Only explicitly touching valid intervals may merge. Never bridge missing rows/gaps.
      if (last && last.group_id === String(labels[i]) && last.end === s.start) { last.end = s.end; last.distanceSum += dist; last.sample_ids.push(s.id); }
      else segments.push({ start: s.start, end: s.end, group_id: String(labels[i]), subject: input.subject, track: input.track, distanceSum: dist, sample_ids: [s.id] });
    });
    for (const s of segments) { s.distance = s.distanceSum / s.sample_ids.length; delete s.distanceSum; }
    return { segments, labels, centers, sampleIds: samples.map(s => s.id), excluded: prepared.excluded, preprocessing: prepared.preprocessing, groups: new Set(labels).size, requestedGroups: count, seed, iterations, converged, method: VERSION };
  }
  function modelInput(context, annotations, mapping) {
    fingerprint(context.videoFingerprint);
    return { schema: REQUEST, recordingKey: context.recordingKey, video: { name: context.videoName, size: context.videoSize, duration: context.duration, fingerprint: clone(context.videoFingerprint) },
      annotations: clone(annotations), timeMapping: clone(mapping), outputSchema: SCHEMA,
      constraints: "Return data only in video_seconds with explicit sample intervals. No network request or external model execution is performed by this export. Annotation gaps are not negative labels." };
  }
  // Example adapter for a model that emits named, timed 2-D keypoint triples.
  function adaptTimedKeypoints(request, modelOutput) {
    check(request?.schema === REQUEST, "Expected model-input request");
    const result = { ...clone(modelOutput), schema: SCHEMA, kind: "keypoints2d", timebase: "video_seconds", recordingKey: request.recordingKey, video: clone(request.video) };
    return validate(result, { recordingKey: request.recordingKey, videoName: request.video.name, videoSize: request.video.size, duration: request.video.duration, videoFingerprint: request.video.fingerprint });
  }
  function candidates(asset, result, runId, assetDigest) {
    text(runId, "run ID"); check(/^[a-f0-9]{64}$/.test(assetDigest), "Missing feature asset digest");
    return { schema: "neuropixels-behavior-candidates/1", timebase: "video_seconds", video: clone(asset.video), segments: clone(result.segments),
      run: { id: runId, method: VERSION, createdAt: new Date().toISOString(),
        parameters: { count: result.requestedGroups, seed: result.seed, preprocessing: clone(result.preprocessing) },
        source: { schema: SCHEMA, digestAlgorithm: "sha256-json/1", digest: assetDigest, featureAsset: clone(asset) },
        result: { labels: result.labels, sampleIds: result.sampleIds, centers: result.centers, groups: result.groups, iterations: result.iterations, converged: result.converged, excluded: result.excluded },
        limitations: "Unsupervised feature groups, not semantic behavior labels or probabilities. Source model claims are retained, not independently certified. No temporal smoothing or missing-interval fill. All candidates require review." } };
  }
  const workerSource = () => `const F=(${createVideoFeatures.toString()})();onmessage=e=>{try{postMessage({result:F.group(e.data.input,e.data.context,e.data.options)});}catch(error){postMessage({error:error.message});}};`;
  return { SCHEMA, REQUEST, VERSION, LIMITS, validate, prepare, group, modelInput, adaptTimedKeypoints, candidates, workerSource };
});
