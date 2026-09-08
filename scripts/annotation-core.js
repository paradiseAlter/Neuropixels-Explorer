// SPDX-License-Identifier: MIT
((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelsAnnotations = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const SCHEMA = "neuropixels-annotations/1";
  const CANDIDATE_SCHEMA = "neuropixels-behavior-candidates/1";
  const LIMIT = 100000;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
  const uid = () => globalThis.crypto?.randomUUID?.() || `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  function check(condition, message) { if (!condition) throw new Error(message); }
  function finite(value, name) { check(typeof value === "number" && Number.isFinite(value), `Invalid ${name}`); return value; }
  function text(value, name, max = 200) {
    check(typeof value === "string" && value.length > 0 && value.length <= max, `Invalid ${name}`);
    check(!["__proto__", "constructor", "prototype"].includes(value), `Invalid ${name}`);
    return value;
  }
  function interval(start, end, duration) {
    finite(start, "start"); finite(end, "end");
    check(start >= 0 && end > start && end <= duration + 1e-6, "Interval must be inside the video, with start < end");
  }
  function create(context) {
    return { schema: SCHEMA, context: clone(context), runs: [], segments: [], schemes: [
      { id: "default", name: "Default", mappings: {}, labels: {}, reviewed: {}, groups: {} }
    ], activeSchemeId: "default", updatedAt: new Date().toISOString() };
  }
  function scheme(doc) { return doc.schemes.find((s) => s.id === doc.activeSchemeId); }
  function groupKey(doc, segment) { return scheme(doc).groups[segment.id] || (segment.runId ? `${segment.runId}/${segment.groupId}` : "manual"); }
  function label(doc, segment) {
    const s = scheme(doc);
    return own(s.labels, segment.id) ? s.labels[segment.id] : s.mappings[groupKey(doc, segment)] || "";
  }
  function reviewed(doc, segment) { return scheme(doc).reviewed[segment.id] === true; }
  function validate(doc, context) {
    check(doc?.schema === SCHEMA, "Unsupported annotation project version");
    check(doc.context?.key === context.key, "This project belongs to a different recording or video");
    check(Math.abs(finite(doc.context.duration, "duration") - context.duration) < .05, "Video duration has changed");
    check(Array.isArray(doc.runs) && Array.isArray(doc.segments) && doc.segments.length <= LIMIT, "Invalid project arrays");
    check(Array.isArray(doc.schemes) && doc.schemes.length > 0 && doc.schemes.length <= 100, "Invalid label schemes");
    check(doc.runs.length <= 10000 && doc.runs.reduce((n, r) => n + (Array.isArray(r.originalSegments) ? r.originalSegments.length : 0), 0) <= LIMIT, "Original candidate limit exceeded");
    const runs = new Set();
    doc.runs.forEach((r) => { text(r.id, "run ID"); check(!runs.has(r.id), "Duplicate run ID"); runs.add(r.id); });
    const ids = new Set();
    doc.segments.forEach((s) => {
      text(s.id, "segment ID"); check(!ids.has(s.id), "Duplicate segment ID"); ids.add(s.id);
      interval(s.start, s.end, context.duration);
      text(s.subject, "subject"); text(s.track, "track");
      check(s.runId == null || runs.has(s.runId), "Unknown algorithm run");
      if (s.runId != null) text(s.groupId, "group ID");
    });
    const schemes = new Set();
    doc.schemes.forEach((s) => {
      text(s.id, "scheme ID"); text(s.name, "scheme name");
      check(!schemes.has(s.id), "Duplicate scheme ID"); schemes.add(s.id);
      for (const field of ["mappings", "labels", "reviewed", "groups"]) {
        check(s[field] && typeof s[field] === "object" && !Array.isArray(s[field]), `Invalid ${field}`);
        for (const [key, value] of Object.entries(s[field])) {
          text(key, "mapping key", 500);
          if (field !== "mappings") check(ids.has(key), "Unknown segment in label scheme");
          if (field === "reviewed") check(typeof value === "boolean", "Invalid review status");
          else check(typeof value === "string" && value.length <= 500, `Invalid ${field} value`);
        }
      }
    });
    check(schemes.has(doc.activeSchemeId), "Unknown active label scheme");
    return clone(doc);
  }
  function change(doc, fn) {
    const next = clone(doc);
    fn(next, scheme(next));
    next.updatedAt = new Date().toISOString();
    return validate(next, doc.context);
  }
  function importCandidates(doc, input) {
    check(input?.schema === CANDIDATE_SCHEMA && input.timebase === "video_seconds", "Expected behavior candidates in video_seconds");
    check(input.video?.name === doc.context.videoName, "Candidate video name does not match the attached video");
    if (input.video.size != null && doc.context.videoSize != null) check(input.video.size === doc.context.videoSize, "Candidate video size does not match");
    check(Math.abs(finite(input.video.duration, "video duration") - doc.context.duration) < .1, "Candidate video duration does not match");
    check(Array.isArray(input.segments) && input.segments.length > 0 && input.segments.length + doc.segments.length <= LIMIT, "Invalid candidate count");
    const run = clone(input.run);
    text(run?.id, "run ID"); text(run.method, "method");
    check(!doc.runs.some((r) => r.id === run.id), "This algorithm run is already imported");
    check(doc.runs.reduce((n, r) => n + (r.originalSegments?.length || 0), 0) + input.segments.length <= LIMIT, "Original candidate limit exceeded");
    run.originalSegments = clone(input.segments);
    return change(doc, (next) => {
      next.runs.push(run);
      input.segments.forEach((s, i) => {
        const start = finite(s.start, "start"), end = finite(s.end, "end");
        const groupId = text(String(s.group_id), "group ID");
        check(s.group_id != null, "Missing group ID");
        interval(start, end, doc.context.duration);
        const distance = s.distance == null ? null : finite(s.distance, "distance");
        next.segments.push({ id: `${run.id}:${i}`, start, end, groupId, runId: run.id,
          subject: s.subject || "animal-1", track: s.track || "behavior", distance,
          origin: { runId: run.id, groupId, start, end } });
      });
    });
  }
  function add(doc, { start, end, label: value = "", subject = "animal-1", track = "behavior" }) {
    return change(doc, (next, s) => {
      const id = uid();
      next.segments.push({ id, start, end, subject, track, runId: null, groupId: null,
        origin: { method: "manual", start, end } });
      s.labels[id] = value.trim(); s.reviewed[id] = Boolean(value.trim());
    });
  }
  function edit(doc, id, values) {
    return change(doc, (next, s) => {
      const segment = next.segments.find((a) => a.id === id);
      check(segment, "Select a segment first");
      for (const key of ["start", "end", "subject", "track"]) if (own(values, key)) segment[key] = values[key];
      if (own(values, "label")) s.labels[id] = String(values.label).trim();
      if (["start", "end", "subject", "track"].some((key) => own(values, key))) next.schemes.forEach((other) => { other.reviewed[id] = false; });
      s.reviewed[id] = false;
    });
  }
  function remove(doc, ids) {
    return change(doc, (next) => {
      const removeIds = new Set(ids);
      next.segments = next.segments.filter((s) => !removeIds.has(s.id));
      next.schemes.forEach((s) => ids.forEach((id) => ["labels", "reviewed", "groups"].forEach((f) => delete s[f][id])));
    });
  }
  function split(doc, id, time) {
    return change(doc, (next) => {
      const a = next.segments.find((s) => s.id === id);
      check(a && time > a.start && time < a.end, "Place the cursor inside the selected segment");
      const b = { ...clone(a), id: uid(), start: time }; a.end = time;
      next.segments.push(b);
      next.schemes.forEach((s) => {
        for (const f of ["labels", "groups"]) if (own(s[f], id)) s[f][b.id] = s[f][id];
        s.reviewed[id] = false; s.reviewed[b.id] = false;
      });
    });
  }
  function merge(doc, ids) {
    check(ids.length >= 2, "Select at least two adjacent clips");
    const parts = ids.map((id) => doc.segments.find((s) => s.id === id)).sort((a, b) => (a?.start || 0) - (b?.start || 0));
    check(parts.every(Boolean), "Unknown segment");
    check(parts.every((s) => s.subject === parts[0].subject && s.track === parts[0].track), "Merged clips must use the same subject and track");
    let end = parts[0].end;
    parts.slice(1).forEach((s) => { check(s.start <= end + 1e-6, "Clips must overlap or touch; gaps cannot be filled silently"); end = Math.max(end, s.end); });
    return change(doc, (next) => {
      const id = uid(), removed = new Set(ids);
      const segment = { id, start: parts[0].start, end, subject: parts[0].subject, track: parts[0].track,
        runId: null, groupId: null, origin: { method: "manual-merge", sources: parts.map((s) => ({ id: s.id, origin: clone(s.origin), start: s.start, end: s.end })) } };
      next.schemes.forEach((s) => {
        const sourceDoc = { ...doc, activeSchemeId: s.id };
        const values = parts.map((a) => label(sourceDoc, a));
        s.labels[id] = values.every((v) => v === values[0]) ? values[0] : ""; s.reviewed[id] = false;
        const keys = parts.map((a) => groupKey(sourceDoc, a));
        if (keys.every((key) => key === keys[0])) s.groups[id] = keys[0];
        ids.forEach((old) => ["labels", "reviewed", "groups"].forEach((f) => delete s[f][old]));
      });
      next.segments = next.segments.filter((s) => !removed.has(s.id)); next.segments.push(segment);
    });
  }
  function assign(doc, ids, value, confirm = false) {
    return change(doc, (next, s) => {
      ids.forEach((id) => {
        const segment = next.segments.find((a) => a.id === id); check(segment, "Unknown segment");
        if (value != null) s.labels[id] = value.trim();
        check(!confirm || label(next, segment), "Name the behavior before confirming");
        s.reviewed[id] = confirm;
      });
    });
  }
  function nameGroup(doc, key, value) {
    return change(doc, (next, s) => { text(key, "group", 500); s.mappings[key] = value.trim();
      next.segments.filter((a) => groupKey(next, a) === key && !own(s.labels, a.id)).forEach((a) => { s.reviewed[a.id] = false; });
    });
  }
  function regroup(doc, ids) {
    return change(doc, (next, s) => {
      check(ids.length > 0, "Select clips to regroup");
      const key = `curated:${uid()}`;
      ids.forEach((id) => { check(next.segments.some((a) => a.id === id), "Unknown segment"); s.groups[id] = key; s.reviewed[id] = false; });
    });
  }
  function addScheme(doc, name) {
    return change(doc, (next) => { const id = uid(); next.schemes.push({ id, name: name.trim(), mappings: {}, labels: {}, reviewed: {}, groups: {} }); next.activeSchemeId = id; });
  }
  function groups(doc) {
    const result = new Map();
    for (const segment of doc.segments) { const key = groupKey(doc, segment); if (!result.has(key)) result.set(key, []); result.get(key).push(segment); }
    return [...result].map(([key, segments]) => ({ key, segments: segments.sort((a, b) => a.start - b.start), name: scheme(doc).mappings[key] || "" }));
  }
  function samples(segments, limit = 4) {
    if (segments.length <= limit) return [...segments];
    const sorted = [...segments].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    const chosen = [sorted[0], sorted[sorted.length - 1], segments[Math.floor(segments.length / 3)], segments[Math.floor(segments.length * 2 / 3)]];
    return [...new Map([...chosen, ...segments].map((s) => [s.id, s])).values()].slice(0, limit);
  }
  function toCSV(doc, mapping) {
    const cell = (value) => {
      let formatted = String(value ?? "");
      if (typeof value === "string" && /^\s*[=+@-]/.test(value)) formatted = "'" + formatted;
      return `"${formatted.replaceAll('"', '""')}"`;
    };
    const metadata = typeof mapping.toJSON === "function" ? mapping.toJSON() : mapping;
    if (metadata.provenance?.frame_clock && typeof mapping.videoToNeural !== "function") {
      throw new TypeError("Frame-clock export requires a TimeMapping instance");
    }
    const mapTime = (time) => typeof mapping.videoToNeural === "function"
      ? mapping.videoToNeural(time) : metadata.offset_s + time * metadata.scale;
    const rows = [["segment_id", "video", "subject", "track", "video_start_s", "video_end_s", "neural_start_s", "neural_end_s", "label_scheme", "label", "status", "review_group", "run_id", "original_group_id", "sync_status", "sync_offset_s", "sync_scale", "sync_method", "sync_model"]];
    for (const s of [...doc.segments].sort((a, b) => a.start - b.start)) {
      const start = mapTime(s.start), end = mapTime(s.end), mapped = Number.isFinite(start) && Number.isFinite(end);
      rows.push([
      s.id, doc.context.videoName, s.subject, s.track, s.start, s.end,
      mapped ? start : "", mapped ? end : "",
      scheme(doc).name, label(doc, s), reviewed(doc, s) ? "reviewed" : "suggested", groupKey(doc, s), s.runId, s.groupId,
      mapped ? metadata.verification_status : "unmapped", metadata.offset_s, metadata.scale,
      metadata.method || "unknown", metadata.provenance?.frame_clock ? "frame_clock" : "affine"
    ]);
    }
    return rows.map((row) => row.map(cell).join(",")).join("\r\n");
  }
  return { SCHEMA, CANDIDATE_SCHEMA, create, validate, change, clone, scheme, groupKey, label, reviewed,
    importCandidates, add, edit, remove, split, merge, assign, nameGroup, regroup, addScheme, groups, samples, toCSV };
});
