// SPDX-License-Identifier: MIT
// Trusted source-integrated models only. This is not a sandbox or a script loader.
((root, factory) => {
  const api = factory(root.NeuropixelsVideoFeatures || (typeof require === "function" ? require("./video-features.js") : null),
    root.NeuropixelsEventAnalysisStorage || (typeof require === "function" ? require("./event-analysis-storage.js") : null));
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelsVideoModels = api;
})(globalThis, (F, P) => {
  "use strict";
  const VERSION = "local-video-model-adapter/1";
  const LIMITS = Object.freeze({ videoBytes: 512 * 1024 * 1024, frames: 20000, pixelsPerFrame: 640 * 640, totalPixels: 60000000 });
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const clone = value => JSON.parse(JSON.stringify(value));
  const stop = signal => { if (signal?.aborted) throw new DOMException("Model operation cancelled", "AbortError"); };
  function freeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
  function contextOf(request) {
    check(request?.schema === F.REQUEST && request.outputSchema === F.SCHEMA, "Expected model-input request");
    return { recordingKey: request.recordingKey, videoName: request.video?.name, videoSize: request.video?.size,
      duration: request.video?.duration, videoFingerprint: request.video?.fingerprint };
  }
  function plan(request, model, samples, dimensions) {
    const context = contextOf(request), width = dimensions?.width, height = dimensions?.height;
    check(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0 && width * height <= LIMITS.pixelsPerFrame, "Choose bounded positive integer frame dimensions");
    check(Array.isArray(samples) && samples.length > 0 && samples.length <= LIMITS.frames && samples.length * width * height <= LIMITS.totalPixels, "Model frame/pixel budget exceeded");
    check(typeof model?.predict === "function", "Model requires predict(frame, context)");
    const prototype = { schema: F.SCHEMA, id: "model-adapter-validation", timebase: "video_seconds", recordingKey: request.recordingKey,
      video: clone(request.video), model: clone(model.model), kind: model.kind, names: clone(model.names), subject: model.subject, track: model.track,
      ...(model.kind === "keypoints2d" ? { coordinateSpace: model.coordinateSpace, ...(model.poseNormalization ? { poseNormalization: clone(model.poseNormalization) } : {}) } : { units: clone(model.units) }),
      samples: samples.map(s => ({ id: s.id, start: s.start, end: s.end, time: s.time, ...(s.frame == null ? {} : { frame: s.frame }), values: model.names.map(() => null) })) };
    // Reuse the production contract; no inferred frame IDs, FPS or sample endpoints.
    F.validate(prototype, context);
    return { context, prototype, width, height };
  }
  function abortable(operation, signal) {
    stop(signal);
    return new Promise((resolve, reject) => {
      const cancel = () => reject(new DOMException("Model operation cancelled", "AbortError"));
      signal?.addEventListener("abort", cancel, { once: true });
      Promise.resolve(operation).then(resolve, reject).finally(() => signal?.removeEventListener("abort", cancel));
    });
  }
  // A separate decoder never seeks the shared workspace video.
  async function openVideo(file, { width, height, signal }) {
    check(typeof document !== "undefined" && file instanceof Blob, "A local video Blob and browser decoder are required");
    const video = document.createElement("video"), canvas = document.createElement("canvas"), url = URL.createObjectURL(file);
    video.muted = true; video.preload = "auto"; canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); let closed = false;
    const close = () => { if (closed) return; closed = true; video.pause(); video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); canvas.width = canvas.height = 0; };
    const wait = (name, operation) => new Promise((resolve, reject) => {
      const finish = error => { clearTimeout(timer); video.removeEventListener(name, ready); video.removeEventListener("error", fail); signal?.removeEventListener("abort", cancel); error ? reject(error) : resolve(); };
      const ready = () => finish(), fail = () => finish(Error("Video could not be decoded")), cancel = () => finish(new DOMException("Model operation cancelled", "AbortError"));
      const timer = setTimeout(() => finish(Error("Video decoding timed out")), 15000);
      video.addEventListener(name, ready, { once: true }); video.addEventListener("error", fail, { once: true }); signal?.addEventListener("abort", cancel, { once: true });
      try { stop(signal); operation(); } catch (error) { finish(error); }
    });
    try {
      check(ctx, "Canvas pixel reading is unavailable");
      await wait("loadeddata", () => { video.src = url; video.load(); }); stop(signal);
      check(Number.isFinite(video.duration) && video.duration > 0 && video.videoWidth > 0 && video.videoHeight > 0, "Video metadata is unavailable");
      return { duration: video.duration, sourceWidth: video.videoWidth, sourceHeight: video.videoHeight, close,
        async read(sample) {
          stop(signal); check(!closed, "Video decoder is closed");
          if (Math.abs(video.currentTime - sample.time) > 1e-7) await wait("seeked", () => { video.currentTime = sample.time; });
          stop(signal); check(video.readyState >= 2 && Math.abs(video.currentTime - sample.time) < .001, "Video cannot seek to the requested sample time");
          ctx.drawImage(video, 0, 0, width, height);
          return { rgba: ctx.getImageData(0, 0, width, height).data, width, height, requestedTime: sample.time,
            seekTime: video.currentTime, sourceWidth: video.videoWidth, sourceHeight: video.videoHeight };
        }
      };
    } catch (error) { close(); throw error; }
  }
  async function run({ request, file, model, samples, width = 160, height = 120, signal, onProgress = () => {}, ensureCurrent = () => {}, openDecoder = openVideo }) {
    // Validate and snapshot before the first await, including all model metadata.
    const { context, prototype } = plan(request, model, samples, { width, height });
    check(new TextEncoder().encode(JSON.stringify(request)).length <= F.LIMITS.bytes, "Model input snapshot exceeds 25 MB");
    const input = freeze(clone(request)), rows = prototype.samples.map(({ values, ...s }) => freeze(s)), predict = model.predict.bind(model);
    check(file instanceof Blob && file.size > 0 && file.size <= LIMITS.videoBytes && file.size === context.videoSize, "Model needs the matching local video Blob (up to 512 MiB)");
    if (typeof file.name === "string") check(file.name === context.videoName, "Model video name does not match");
    const ensure = () => { stop(signal); ensureCurrent(); };
    ensure(); const actual = await P.fingerprint(file, signal); ensure();
    check(actual.digest === context.videoFingerprint.digest && actual.size === context.videoFingerprint.size, "Model video content does not match request");
    let decoder;
    try {
      decoder = await openDecoder(file, { width, height, signal }); ensure();
      check(Math.abs(decoder.duration - context.duration) < .001, "Decoded video duration does not match request");
      const output = { ...prototype, id: `model-${globalThis.crypto.randomUUID()}`, samples: [] };
      for (const [index, sample] of rows.entries()) {
        ensure(); const frame = await decoder.read(sample); ensure();
        check(frame?.rgba instanceof Uint8ClampedArray && frame.width === width && frame.height === height && frame.rgba.length === width * height * 4, "Decoder returned invalid RGBA pixels");
        // Annotated and unannotated intervals are supplied verbatim, not converted to class labels.
        const values = await abortable(predict({ ...frame, sample }, { input, signal }), signal); ensure();
        const row = { ...sample, values };
        F.validate({ ...output, samples: [row] }, context); // reject invalid/nonfinite model values immediately
        output.samples.push(clone(row)); onProgress({ completed: index + 1, total: rows.length });
      }
      ensure();
      output.adapter = { version: VERSION, width, height, sourceWidth: decoder.sourceWidth, sourceHeight: decoder.sourceHeight,
        sampling: "explicit-video-time-seek", resize: "stretch-to-declared-dimensions", timing: "Requested seek times, not measured decoded-frame presentation timestamps or neural coverage",
        annotationInput: "Snapshot only; gaps are not negative labels", inputDigest: await P.digestJSON(input), inputSnapshot: input };
      ensure(); return F.validate(output, context);
    } finally { decoder?.close(); }
  }
  // Small, transparent developer example. These are image statistics, not behavior classes.
  const pixelExample = Object.freeze({ model: Object.freeze({ name: "rgba-channel-mean-example", version: "1", source: "Bundled pixel-statistics adapter example; no pretrained weights or behavior inference" }),
    kind: "features", names: Object.freeze(["red_mean", "green_mean", "blue_mean"]), units: Object.freeze(["byte", "byte", "byte"]), subject: "animal-1", track: "image-statistics",
    predict({ rgba }) { const sums = [0, 0, 0]; for (let i = 0; i < rgba.length; i += 4) for (let c = 0; c < 3; c++) sums[c] += rgba[i + c]; return sums.map(v => v / (rgba.length / 4)); }
  });
  return { VERSION, LIMITS, plan, openVideo, run, pixelExample };
});
