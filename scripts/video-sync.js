((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelsVideoSync = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv)$/i;
  const DEFAULT_FPS = 30;

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  class TimeMapping {
    constructor({
      method = "unknown",
      offsetSeconds = 0,
      offset_s,
      scale = 1,
      driftPpm = null,
      drift_ppm,
      verificationStatus = "unverified",
      verification_status,
      matchedEventCount = null,
      matched_event_count,
      residualRmsMs = null,
      residual_rms_ms,
      provenance = null
    } = {}) {
      const normalizedScale = Number(scale);
      if (!(normalizedScale > 0)) throw new RangeError("TimeMapping scale must be greater than zero");
      this.method = String(method || "unknown");
      this.offsetSeconds = Number(offset_s ?? offsetSeconds) || 0;
      this.scale = normalizedScale;
      this.driftPpm = Number.isFinite(Number(drift_ppm ?? driftPpm)) ? Number(drift_ppm ?? driftPpm) : null;
      this.verificationStatus = String(verification_status ?? verificationStatus ?? "unverified");
      this.matchedEventCount = Number.isFinite(Number(matched_event_count ?? matchedEventCount)) ? Number(matched_event_count ?? matchedEventCount) : null;
      this.residualRmsMs = Number.isFinite(Number(residual_rms_ms ?? residualRmsMs)) ? Number(residual_rms_ms ?? residualRmsMs) : null;
      this.provenance = provenance || null;
    }

    videoToNeural(videoSeconds) {
      return this.offsetSeconds + Number(videoSeconds || 0) * this.scale;
    }

    neuralToVideo(neuralSeconds) {
      return (Number(neuralSeconds || 0) - this.offsetSeconds) / this.scale;
    }

    withOffset(offsetSeconds, { verificationStatus = "unverified", method = "manual_offset" } = {}) {
      return new TimeMapping({ ...this, offsetSeconds, method, verificationStatus });
    }

    toJSON() {
      return {
        method: this.method,
        offset_s: this.offsetSeconds,
        scale: this.scale,
        drift_ppm: this.driftPpm,
        verification_status: this.verificationStatus,
        matched_event_count: this.matchedEventCount,
        residual_rms_ms: this.residualRmsMs,
        provenance: this.provenance
      };
    }
  }

  function syntheticBehaviorAt(videoSeconds, fps = DEFAULT_FPS) {
    const time = Math.max(0, Number(videoSeconds) || 0);
    const frameIndex = Math.floor(time * fps + 1e-7);
    const phase = time * .72;
    const x = .5 + .34 * Math.sin(phase) * Math.cos(phase * .23);
    const y = .5 + .29 * Math.sin(phase * .61 + .8);
    const nextPhase = phase + .001;
    const nextX = .5 + .34 * Math.sin(nextPhase) * Math.cos(nextPhase * .23);
    const nextY = .5 + .29 * Math.sin(nextPhase * .61 + .8);
    const heading = Math.atan2(nextY - y, nextX - x);
    const cycle = time % 12;
    const behavior = cycle < 1.5 ? "PAUSE" : cycle < 5 ? "RUN" : cycle < 7.5 ? "TURN" : cycle < 10.5 ? "EXPLORE" : "GROOM";
    const syncPulse = frameIndex % Math.round(fps * 5) < 3;
    return { time, frameIndex, x, y, heading, behavior, syncPulse };
  }

  function formatClock(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor(value % 3600 / 60);
    const remaining = value % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${remaining.toFixed(3).padStart(6, "0")}`;
  }

  function videoFilesForRecording(recording) {
    return [...(recording?.files || [])].filter((file) => VIDEO_EXTENSIONS.test(String(file?.name || "")));
  }

  class VideoSyncController {
    constructor(elements, { onNeuralTime = null, onStateChange = null, translator = (key) => key } = {}) {
      this.elements = elements;
      this.onNeuralTime = onNeuralTime;
      this.onStateChange = onStateChange;
      this.t = translator;
      this.recording = null;
      this.source = null;
      this.mapping = new TimeMapping();
      this.currentVideoTime = 0;
      this.playing = false;
      this.follow = true;
      this.playbackRate = 1;
      this.animationFrame = null;
      this.syntheticStartedAt = null;
      this.syntheticStartedTime = 0;
      this.objectUrl = null;
      this.collapsed = false;
      this._install();
      this._renderEmpty();
    }

    _install() {
      const e = this.elements;
      e.synthetic?.addEventListener("click", () => this.loadSynthetic());
      e.choose?.addEventListener("click", () => { if (e.file) { e.file.value = ""; e.file.click(); } });
      e.file?.addEventListener("change", () => { const file = e.file.files?.[0]; if (file) this.loadFile(file); });
      e.play?.addEventListener("click", () => this.togglePlayback());
      e.previous?.addEventListener("click", () => this.stepFrames(-1));
      e.next?.addEventListener("click", () => this.stepFrames(1));
      e.speed?.addEventListener("change", () => this.setPlaybackRate(Number(e.speed.value)));
      e.follow?.addEventListener("change", () => { this.follow = Boolean(e.follow.checked); this._emitState(); });
      e.seek?.addEventListener("input", () => this.seekVideo(Number(e.seek.value)));
      const applyOffset = () => {
        const value = Number(e.offset.value);
        if (!Number.isFinite(value)) return;
        const synthetic = this.source?.kind === "synthetic" && Math.abs(value) < 1e-12;
        this.mapping = this.mapping.withOffset(value, synthetic
          ? { method: "frame_timestamps", verificationStatus: "verified" }
          : { method: "manual_offset", verificationStatus: "unverified" });
        this._renderStatus();
        this._renderTime();
        this._emitTime();
      };
      e.offset?.addEventListener("input", applyOffset);
      e.offset?.addEventListener("change", applyOffset);
      e.collapse?.addEventListener("click", () => this.setCollapsed(!this.collapsed));
      e.video?.addEventListener("loadedmetadata", () => this._finishRealVideoLoad());
      e.video?.addEventListener("timeupdate", () => this._syncFromRealVideo());
      e.video?.addEventListener("play", () => { this.playing = true; this._updatePlayButton(); this._realVideoFrame(); });
      e.video?.addEventListener("pause", () => { this.playing = false; this._updatePlayButton(); this._emitState(); });
      e.video?.addEventListener("ended", () => { this.playing = false; this._updatePlayButton(); this._emitState(); });
      e.video?.addEventListener("error", () => this._renderError(e.video.error?.message || this.t("video.loadError")));
    }

    setTranslator(translator) {
      this.t = translator || ((key) => key);
      this._renderStatus();
      this._updatePlayButton();
      this._renderTime();
      this._renderSourceLabel();
      this._renderSyntheticFrame();
    }

    setRecording(recording, databaseVideos = []) {
      this.pause();
      this._releaseObjectUrl();
      this.recording = recording || null;
      this.source = null;
      this.currentVideoTime = 0;
      this.mapping = new TimeMapping();
      const localVideo = videoFilesForRecording(recording)[0];
      const databaseVideo = [...(databaseVideos || [])].find((video) => String(video.recording_id || video.recordingId) === String(recording?.databaseId || recording?.key));
      if (localVideo) this.loadFile(localVideo, { automatic: true });
      else if (databaseVideo?.mediaUrl || databaseVideo?.media_url) this.loadUrl(databaseVideo.mediaUrl || databaseVideo.media_url, databaseVideo);
      else this._renderEmpty();
    }

    loadSynthetic() {
      if (!this.recording) return;
      this.pause();
      this._releaseObjectUrl();
      const duration = Math.max(1, Number(this.recording.duration) || 120);
      this.source = { kind: "synthetic", name: "SYNTHETIC BEHAVIOR · CAM 01", duration, fps: DEFAULT_FPS };
      this.mapping = new TimeMapping({ method: "frame_timestamps", verificationStatus: "verified", provenance: { kind: "deterministic_synthetic_validation" } });
      this.currentVideoTime = 0;
      this._showSource("synthetic");
      this._configureDuration(duration);
      this._renderSyntheticFrame();
      this._renderStatus();
      this._renderSourceLabel();
      this._emitTime();
      this._emitState();
    }

    loadFile(file, { automatic = false } = {}) {
      if (!file) return;
      this.pause();
      this._releaseObjectUrl();
      this.objectUrl = URL.createObjectURL(file);
      this.source = { kind: "file", name: file.name || this.t("video.localFile"), duration: 0, fps: DEFAULT_FPS, automatic };
      this.mapping = new TimeMapping({ method: "manual_offset", verificationStatus: "unverified" });
      this.currentVideoTime = 0;
      this._showSource("video");
      this.elements.video.src = this.objectUrl;
      this.elements.video.load();
      this._renderSourceLabel();
      this._renderStatus();
      this._emitState();
    }

    loadUrl(url, descriptor = {}) {
      this.pause();
      this._releaseObjectUrl();
      this.source = {
        kind: "url",
        name: descriptor.video_name || descriptor.videoName || this.t("video.databaseVideo"),
        duration: Number(descriptor.duration_s || descriptor.duration || 0),
        fps: Number(descriptor.frame_rate_hz || descriptor.frameRate || DEFAULT_FPS),
        descriptor
      };
      this.mapping = new TimeMapping(descriptor.timeMapping || descriptor.time_mapping || {});
      this._showSource("video");
      this.elements.video.src = url;
      this.elements.video.load();
      this._renderSourceLabel();
      this._renderStatus();
    }

    _finishRealVideoLoad() {
      if (!this.source || !["file", "url"].includes(this.source.kind)) return;
      const duration = Number.isFinite(this.elements.video.duration) ? this.elements.video.duration : Number(this.source.duration || 0);
      this.source.duration = Math.max(0, duration);
      this.source.fps = Number(this.source.fps || DEFAULT_FPS);
      this._configureDuration(this.source.duration);
      this._syncFromRealVideo();
      this._renderStatus();
      this._emitState();
    }

    _configureDuration(duration) {
      const safe = Math.max(0, Number(duration) || 0);
      if (this.elements.seek) {
        this.elements.seek.min = "0";
        this.elements.seek.max = String(safe || 1);
        this.elements.seek.step = String(1 / Number(this.source?.fps || DEFAULT_FPS));
      }
      if (this.elements.duration) this.elements.duration.textContent = formatClock(safe);
      this._renderTime();
    }

    togglePlayback() {
      if (!this.source) return;
      if (this.playing) this.pause();
      else this.play();
    }

    play() {
      if (!this.source) return;
      if (this.currentVideoTime >= this.source.duration) this.seekVideo(0);
      if (["file", "url"].includes(this.source.kind)) {
        this.elements.video.playbackRate = this.playbackRate;
        const result = this.elements.video.play();
        result?.catch?.(() => this._renderError(this.t("video.playBlocked")));
        return;
      }
      this.playing = true;
      this.syntheticStartedAt = performance.now();
      this.syntheticStartedTime = this.currentVideoTime;
      this._updatePlayButton();
      this._syntheticFrame();
      this._emitState();
    }

    pause() {
      if (["file", "url"].includes(this.source?.kind)) this.elements.video.pause();
      this.playing = false;
      if (this.animationFrame != null) cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      this.syntheticStartedAt = null;
      this._updatePlayButton();
      this._emitState();
    }

    setPlaybackRate(rate) {
      this.playbackRate = [0.25, 0.5, 1, 2, 4].includes(Number(rate)) ? Number(rate) : 1;
      if (this.elements.speed) this.elements.speed.value = String(this.playbackRate);
      if (this.elements.video) this.elements.video.playbackRate = this.playbackRate;
      if (this.playing && this.source?.kind === "synthetic") {
        this.syntheticStartedAt = performance.now();
        this.syntheticStartedTime = this.currentVideoTime;
      }
      this._emitState();
    }

    stepFrames(delta) {
      if (!this.source) return;
      this.pause();
      const fps = Math.max(1, Number(this.source.fps || DEFAULT_FPS));
      this.seekVideo(this.currentVideoTime + Number(delta || 0) / fps);
    }

    seekVideo(videoSeconds) {
      if (!this.source) return;
      const next = clamp(Number(videoSeconds) || 0, 0, Number(this.source.duration || 0));
      this.currentVideoTime = next;
      if (["file", "url"].includes(this.source.kind)) this.elements.video.currentTime = next;
      else this._renderSyntheticFrame();
      if (this.playing && this.source.kind === "synthetic") {
        this.syntheticStartedAt = performance.now();
        this.syntheticStartedTime = next;
      }
      this._renderTime();
      this._emitTime();
    }

    seekNeural(neuralSeconds) {
      if (!this.source) return;
      this.seekVideo(this.mapping.neuralToVideo(neuralSeconds));
    }

    setCollapsed(collapsed) {
      this.collapsed = Boolean(collapsed);
      this.elements.panel?.classList.toggle("is-collapsed", this.collapsed);
      if (this.elements.collapse) {
        this.elements.collapse.setAttribute("aria-expanded", String(!this.collapsed));
        this.elements.collapse.textContent = this.collapsed ? "＋" : "−";
        this.elements.collapse.title = this.t(this.collapsed ? "video.expand" : "video.collapse");
      }
      if (!this.collapsed) this._renderSyntheticFrame();
    }

    _syntheticFrame() {
      if (!this.playing || this.source?.kind !== "synthetic") return;
      const elapsed = (performance.now() - this.syntheticStartedAt) / 1000 * this.playbackRate;
      this.currentVideoTime = clamp(this.syntheticStartedTime + elapsed, 0, this.source.duration);
      this._renderSyntheticFrame();
      this._renderTime();
      this._emitTime();
      if (this.currentVideoTime >= this.source.duration) {
        this.pause();
        return;
      }
      this.animationFrame = requestAnimationFrame(() => this._syntheticFrame());
    }

    _realVideoFrame() {
      if (!this.playing || !["file", "url"].includes(this.source?.kind)) return;
      this._syncFromRealVideo();
      if (typeof this.elements.video.requestVideoFrameCallback === "function") {
        this.elements.video.requestVideoFrameCallback(() => this._realVideoFrame());
      } else {
        this.animationFrame = requestAnimationFrame(() => this._realVideoFrame());
      }
    }

    _syncFromRealVideo() {
      if (!this.source || !["file", "url"].includes(this.source.kind)) return;
      this.currentVideoTime = Number(this.elements.video.currentTime || 0);
      this._renderTime();
      this._emitTime();
    }

    _renderSyntheticFrame() {
      if (this.source?.kind !== "synthetic" || this.collapsed || !this.elements.canvas) return;
      const canvas = this.elements.canvas;
      const rectangle = canvas.getBoundingClientRect();
      const width = Math.max(640, Math.round(rectangle.width || 960));
      const height = Math.max(360, Math.round(rectangle.height || width * 9 / 16));
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      const context = canvas.getContext("2d");
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const frame = syntheticBehaviorAt(this.currentVideoTime, this.source.fps);
      const arena = { left: width * .08, top: height * .11, width: width * .84, height: height * .78 };
      context.fillStyle = "#080b0d";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#141a1d";
      context.fillRect(arena.left, arena.top, arena.width, arena.height);
      context.strokeStyle = "#2c363b";
      context.lineWidth = 1;
      for (let index = 1; index < 8; index += 1) {
        context.beginPath();
        context.moveTo(arena.left + arena.width * index / 8, arena.top);
        context.lineTo(arena.left + arena.width * index / 8, arena.top + arena.height);
        context.stroke();
      }
      for (let index = 1; index < 5; index += 1) {
        context.beginPath();
        context.moveTo(arena.left, arena.top + arena.height * index / 5);
        context.lineTo(arena.left + arena.width, arena.top + arena.height * index / 5);
        context.stroke();
      }
      context.strokeStyle = "#60727a";
      context.lineWidth = 3;
      context.strokeRect(arena.left, arena.top, arena.width, arena.height);

      const x = arena.left + frame.x * arena.width;
      const y = arena.top + frame.y * arena.height;
      context.save();
      context.translate(x, y);
      context.rotate(frame.heading);
      context.strokeStyle = "#8a989e";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(-22, 0);
      context.quadraticCurveTo(-39, 10, -48, 3);
      context.stroke();
      context.fillStyle = "#c3ccd0";
      context.beginPath();
      context.ellipse(0, 0, 24, 14, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#dce3e6";
      context.beginPath();
      context.arc(19, 0, 10, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#161a1c";
      context.beginPath();
      context.arc(24, -3, 2, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.fillStyle = frame.syncPulse ? "#7df0a7" : "#23302a";
      context.beginPath();
      context.arc(width - 42, 34, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#aab7bd";
      context.font = '600 14px "Cascadia Mono", Consolas, monospace';
      context.textAlign = "left";
      context.fillText("SYNTHETIC VALIDATION · CAM 01", 20, 30);
      context.fillStyle = "#8f9da4";
      context.font = '12px "Cascadia Mono", Consolas, monospace';
      context.fillText(`${formatClock(frame.time)} · FRAME ${String(frame.frameIndex).padStart(7, "0")}`, 20, height - 21);
      context.textAlign = "right";
      context.fillStyle = "#d8e3e8";
      context.fillText(`${this.t("video.behavior")}: ${frame.behavior}`, width - 20, height - 21);
      if (frame.syncPulse) {
        context.fillStyle = "#7df0a7";
        context.fillText("SYNC PULSE", width - 60, 39);
      }
    }

    _showSource(kind) {
      if (this.elements.empty) this.elements.empty.hidden = true;
      if (this.elements.error) this.elements.error.hidden = true;
      if (this.elements.video) this.elements.video.hidden = kind !== "video";
      if (this.elements.canvas) this.elements.canvas.hidden = kind !== "synthetic";
      if (this.elements.controls) this.elements.controls.hidden = false;
      if (this.elements.mapping) this.elements.mapping.hidden = false;
      this.elements.panel?.classList.add("has-source");
      this.elements.panel?.classList.remove("has-error");
    }

    _renderEmpty() {
      this.pause();
      this.source = null;
      if (this.elements.empty) this.elements.empty.hidden = false;
      if (this.elements.video) { this.elements.video.hidden = true; this.elements.video.removeAttribute("src"); }
      if (this.elements.canvas) this.elements.canvas.hidden = true;
      if (this.elements.controls) this.elements.controls.hidden = true;
      if (this.elements.mapping) this.elements.mapping.hidden = true;
      this.elements.panel?.classList.remove("has-source", "has-error");
      this._renderSourceLabel();
      this._renderStatus();
      this._emitState();
    }

    _renderError(message) {
      this.pause();
      this.elements.panel?.classList.add("has-error");
      if (this.elements.error) {
        this.elements.error.hidden = false;
        this.elements.error.textContent = message;
      }
    }

    _renderTime() {
      const duration = Number(this.source?.duration || 0);
      if (this.elements.seek) this.elements.seek.value = String(clamp(this.currentVideoTime, 0, duration || 1));
      if (this.elements.current) this.elements.current.textContent = formatClock(this.currentVideoTime);
      if (this.elements.neural) this.elements.neural.textContent = `${this.mapping.videoToNeural(this.currentVideoTime).toFixed(3)} s`;
      if (this.elements.frame) this.elements.frame.textContent = String(Math.floor(this.currentVideoTime * Number(this.source?.fps || DEFAULT_FPS))).padStart(7, "0");
    }

    _renderStatus() {
      if (!this.elements.status) return;
      const verification = this.mapping.verificationStatus === "verified" ? this.t("video.verified") : this.t("video.unverified");
      const method = this.source?.kind === "synthetic" && this.mapping.method === "frame_timestamps"
        ? this.t("video.syntheticClock")
        : this.t(`video.method.${this.mapping.method}`);
      this.elements.status.textContent = this.source ? `${verification} · ${method}` : this.t("video.noSource");
      this.elements.status.dataset.status = this.source ? this.mapping.verificationStatus : "empty";
      if (this.elements.offset) this.elements.offset.value = String(this.mapping.offsetSeconds);
    }

    _renderSourceLabel() {
      if (this.elements.source) this.elements.source.textContent = this.source?.name || this.t("video.sourcePrompt");
    }

    _updatePlayButton() {
      if (!this.elements.play) return;
      this.elements.play.textContent = this.playing ? "❚❚" : "▶";
      this.elements.play.setAttribute("aria-label", this.t(this.playing ? "video.pause" : "video.play"));
      this.elements.play.title = this.t(this.playing ? "video.pause" : "video.play");
    }

    _emitTime() {
      if (!this.source) return;
      this.onNeuralTime?.(this.mapping.videoToNeural(this.currentVideoTime), {
        videoTime: this.currentVideoTime,
        playing: this.playing,
        follow: this.follow,
        source: this.source,
        mapping: this.mapping
      });
    }

    _emitState() {
      this.onStateChange?.({
        hasSource: Boolean(this.source),
        playing: this.playing,
        follow: this.follow,
        source: this.source,
        mapping: this.mapping,
        rawVoltageContractVersion: "1.0"
      });
    }

    _releaseObjectUrl() {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    destroy() {
      this.pause();
      this._releaseObjectUrl();
    }
  }

  return {
    DEFAULT_FPS,
    VIDEO_EXTENSIONS,
    TimeMapping,
    VideoSyncController,
    syntheticBehaviorAt,
    formatClock,
    videoFilesForRecording
  };
});
