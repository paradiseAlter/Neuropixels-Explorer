((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelPlots = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const DEFAULT_COLORS = {
    background: "#0f1012",
    grid: "#24272c",
    axis: "#5f6670",
    text: "#818892",
    spike: "#dbe9f7",
    rate: "#86b8eb",
    rateFill: "rgba(87, 143, 197, .16)",
    amplitude: "rgba(155, 199, 238, .58)",
    acg: "#759bc1",
    template: "#acd0f2",
    selection: "#9fc6f1",
    overview: "rgba(103, 145, 185, .28)",
    overviewSelection: "rgba(159, 198, 241, .08)",
    refractory: "rgba(199, 104, 104, .10)"
  };
  let COLORS = { ...DEFAULT_COLORS };
  const ACTIVE_MANAGERS = new Set();

  function setPlotTheme(theme = {}) {
    COLORS = { ...DEFAULT_COLORS, ...(theme || {}) };
    ACTIVE_MANAGERS.forEach((manager) => manager.render());
    return { ...COLORS };
  }

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const MIN_SPAN_SECONDS = .02;
  const DETAIL_MARGIN_LEFT = 47;
  const DETAIL_MARGIN_RIGHT = 13;

  function normalizeWindow(start, span, duration, minimumSpan = MIN_SPAN_SECONDS) {
    const safeDuration = Math.max(0, Number(duration) || 0);
    if (!safeDuration) return { start: 0, span: Math.max(minimumSpan, Number(span) || minimumSpan) };
    const floor = Math.min(minimumSpan, safeDuration);
    const safeSpan = clamp(Number(span) || floor, floor, safeDuration);
    return {
      start: clamp(Number(start) || 0, 0, Math.max(0, safeDuration - safeSpan)),
      span: safeSpan
    };
  }

  function wheelZoomFactor(deltaY) {
    return Math.exp(clamp(Number(deltaY) || 0, -120, 120) * .00235);
  }

  function wheelPixels(value, deltaMode = 0) {
    const scale = Number(deltaMode) === 1 ? 16 : Number(deltaMode) === 2 ? 120 : 1;
    return (Number(value) || 0) * scale;
  }

  function wheelNavigationDelta(deltaX, deltaY, deltaMode = 0) {
    const horizontal = wheelPixels(deltaX, deltaMode);
    const vertical = wheelPixels(deltaY, deltaMode);
    return Math.abs(horizontal) > Math.abs(vertical) ? horizontal : vertical;
  }

  function wheelPanOffset(deltaX, deltaY, deltaMode, span) {
    const delta = wheelNavigationDelta(deltaX, deltaY, deltaMode);
    return clamp(delta / 720, -.35, .35) * Math.max(0, Number(span) || 0);
  }

  function lowerBound(values, target) {
    let low = 0;
    let high = values.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (values[middle] < target) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function upperBound(values, target) {
    let low = 0;
    let high = values.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (values[middle] <= target) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function formatSeconds(value) {
    const number = Number(value) || 0;
    if (Math.abs(number) < 1) return `${(number * 1000).toFixed(0)} ms`;
    if (Math.abs(number) < 10) return `${number.toFixed(2)} s`;
    return `${number.toFixed(1)} s`;
  }

  function formatAxisTime(value, span) {
    if (span < .1) return `${value.toFixed(4)} s`;
    if (span < 1) return `${value.toFixed(3)} s`;
    if (span < 10) return `${value.toFixed(2)} s`;
    return `${value.toFixed(1)} s`;
  }

  function canvasContext(canvas) {
    const rectangle = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rectangle.width));
    const height = Math.max(1, Math.round(rectangle.height));
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = COLORS.background;
    context.fillRect(0, 0, width, height);
    context.lineCap = "butt";
    context.lineJoin = "miter";
    context.font = '0.75rem "Cascadia Mono", Consolas, monospace';
    return { context, width, height, ratio };
  }

  function crisp(value) {
    return Math.round(value) + .5;
  }

  function drawVerticalGrid(context, left, top, width, height, divisions = 5) {
    context.strokeStyle = COLORS.grid;
    context.lineWidth = 1;
    context.beginPath();
    for (let index = 0; index <= divisions; index += 1) {
      const x = crisp(left + width * index / divisions);
      context.moveTo(x, top);
      context.lineTo(x, top + height);
    }
    context.stroke();
  }

  class PlotManager {
    constructor(elements, onWindowChange, onStateChange) {
      this.elements = elements;
      this.onWindowChange = onWindowChange;
      this.onStateChange = onStateChange;
      this.traceColor = elements.traceColor || COLORS.spike;
      this.rateColor = elements.rateColor || COLORS.rate;
      this.rateFill = elements.rateFill || COLORS.rateFill;
      this.data = null;
      this.start = 0;
      this.span = 10;
      this.mode = "cursor";
      this.history = [];
      this.drag = null;
      this.animationFrame = null;
      this.wheelGestureActive = false;
      this.wheelEndTimer = null;
      this.playbackTime = null;
      this.resizeObserver = new ResizeObserver(() => this.render());
      Object.values(elements).filter((element) => element instanceof HTMLCanvasElement).forEach((canvas) => this.resizeObserver.observe(canvas));
      ACTIVE_MANAGERS.add(this);
      this.installInteractions();
      this.setMode("cursor");
    }

    installInteractions() {
      const detail = this.elements.detail;
      const overview = this.elements.overview;
      if (!detail) return;

      detail.addEventListener("contextmenu", (event) => {
        if (this.data && this.mode === "zoom") event.preventDefault();
      });
      detail.addEventListener("dblclick", (event) => {
        if (!this.data || !["zoom", "pan"].includes(this.mode)) return;
        event.preventDefault();
        this.reset();
      });
      detail.addEventListener("wheel", (event) => {
        if (!this.data) return;
        if (!["zoom", "pan"].includes(this.mode)) return;
        const delta = wheelNavigationDelta(event.deltaX, event.deltaY, event.deltaMode);
        if (!delta) return;
        const position = this.detailPosition(event);
        event.preventDefault();
        this.cancelAnimation();
        if (!this.wheelGestureActive) {
          this.pushHistory();
          this.wheelGestureActive = true;
        }
        clearTimeout(this.wheelEndTimer);
        this.wheelEndTimer = setTimeout(() => { this.wheelGestureActive = false; }, 180);
        if (this.mode === "pan") {
          const offset = wheelPanOffset(event.deltaX, event.deltaY, event.deltaMode, this.span);
          this.setWindow(this.start + offset, this.span);
        } else {
          const nextSpan = this.span * wheelZoomFactor(delta);
          const anchorTime = this.start + this.span * position.fraction;
          this.setWindow(anchorTime - nextSpan * position.fraction, nextSpan);
        }
      }, { passive: false });

      detail.addEventListener("pointerdown", (event) => {
        if (!this.data) return;
        const position = this.detailPosition(event);
        if (this.mode === "cursor") {
          const time = this.showCursor(position);
          this.elements.onCursorCommit?.(time);
          detail.focus({ preventScroll: true });
          return;
        }
        detail.focus({ preventScroll: true });
        this.cancelAnimation();
        if (this.mode === "zoom" && (event.button === 2 || (event.button === 0 && event.shiftKey))) {
          event.preventDefault();
          this.zoom(2, position.fraction);
          return;
        }
        if (event.button !== 0) return;
        event.preventDefault();
        detail.setPointerCapture(event.pointerId);
        if (this.mode === "pan") {
          this.drag = {
            kind: "detail-pan",
            x: event.clientX,
            start: this.start,
            span: this.span,
            historyPushed: false
          };
          this.elements.detailFrame?.classList.add("is-panning");
        } else {
          this.drag = {
            kind: "detail-zoom",
            startX: position.x,
            currentX: position.x,
            moved: false
          };
        }
      });

      detail.addEventListener("pointermove", (event) => {
        const hoverPosition = this.detailPosition(event);
        if (this.mode === "cursor" && this.data) this.showCursor(hoverPosition);
        if (!this.drag || !this.data) return;
        if (this.drag.kind === "detail-pan") {
          const rectangle = detail.getBoundingClientRect();
          const plotWidth = Math.max(1, rectangle.width - DETAIL_MARGIN_LEFT - DETAIL_MARGIN_RIGHT);
          const pixelDelta = event.clientX - this.drag.x;
          if (!this.drag.historyPushed && Math.abs(pixelDelta) > 2) {
            this.pushHistory({ start: this.drag.start, span: this.drag.span });
            this.drag.historyPushed = true;
          }
          if (this.drag.historyPushed) this.setWindow(this.drag.start - pixelDelta / plotWidth * this.drag.span, this.drag.span);
          return;
        }
        if (this.drag.kind === "detail-zoom") {
          const position = this.detailPosition(event);
          this.drag.currentX = position.x;
          this.drag.moved = Math.abs(this.drag.currentX - this.drag.startX) >= 5;
          this.showSelection(this.drag.startX, this.drag.currentX);
        }
      });
      detail.addEventListener("pointerleave", () => {
        this.hideCursor();
      });

      const finishDetailInteraction = (event, cancelled = false) => {
        if (!this.drag) return;
        const drag = this.drag;
        this.drag = null;
        this.elements.detailFrame?.classList.remove("is-panning");
        this.hideSelection();
        if (cancelled || drag.kind !== "detail-zoom" || !this.data) return;
        const endPosition = this.detailPosition(event);
        const endX = drag.moved ? endPosition.x : drag.startX;
        const rectangle = detail.getBoundingClientRect();
        const plotWidth = Math.max(1, rectangle.width - DETAIL_MARGIN_LEFT - DETAIL_MARGIN_RIGHT);
        if (Math.abs(endX - drag.startX) >= 5) {
          const firstFraction = clamp((Math.min(drag.startX, endX) - DETAIL_MARGIN_LEFT) / plotWidth, 0, 1);
          const secondFraction = clamp((Math.max(drag.startX, endX) - DETAIL_MARGIN_LEFT) / plotWidth, 0, 1);
          const nextStart = this.start + firstFraction * this.span;
          const nextSpan = (secondFraction - firstFraction) * this.span;
          this.animateTo(nextStart, nextSpan, { recordHistory: true });
        } else {
          this.zoom(.5, endPosition.fraction);
        }
      };
      detail.addEventListener("pointerup", (event) => finishDetailInteraction(event));
      detail.addEventListener("pointercancel", (event) => finishDetailInteraction(event, true));

      detail.addEventListener("keydown", (event) => {
        if (!this.data) return;
        if (event.key.toLowerCase() === "c") this.setMode("cursor");
        else if (event.key.toLowerCase() === "z") this.setMode("zoom");
        else if (event.key.toLowerCase() === "p") this.setMode("pan");
        else if (event.key === "Home") this.reset();
        else if (event.key === "Backspace") this.back();
        else if (event.key === "+" || event.key === "=") this.zoom(.67);
        else if (event.key === "-" || event.key === "_") this.zoom(1.5);
        else return;
        event.preventDefault();
      });

      if (!overview) return;
      const moveOverview = (event) => {
        if (!this.data) return;
        const rectangle = overview.getBoundingClientRect();
        const fraction = clamp((event.clientX - rectangle.left - 12) / Math.max(1, rectangle.width - 24), 0, 1);
        this.setWindow(fraction * this.data.duration - this.span / 2, this.span);
      };
      overview.addEventListener("pointerdown", (event) => {
        if (!this.data || event.button !== 0) return;
        event.preventDefault();
        this.cancelAnimation();
        overview.setPointerCapture(event.pointerId);
        this.pushHistory();
        this.drag = { kind: "overview" };
        moveOverview(event);
      });
      overview.addEventListener("pointermove", (event) => {
        if (this.drag?.kind === "overview") moveOverview(event);
      });
      overview.addEventListener("pointerup", () => { this.drag = null; });
      overview.addEventListener("pointercancel", () => { this.drag = null; });
    }

    detailPosition(event) {
      const rectangle = this.elements.detail.getBoundingClientRect();
      const plotWidth = Math.max(1, rectangle.width - DETAIL_MARGIN_LEFT - DETAIL_MARGIN_RIGHT);
      const x = clamp(event.clientX - rectangle.left, DETAIL_MARGIN_LEFT, DETAIL_MARGIN_LEFT + plotWidth);
      return {
        x,
        fraction: clamp((x - DETAIL_MARGIN_LEFT) / plotWidth, 0, 1)
      };
    }

    showSelection(firstX, secondX) {
      if (!this.elements.selection) return;
      const left = Math.min(firstX, secondX);
      const width = Math.max(1, Math.abs(secondX - firstX));
      const rectangle = this.elements.detail.getBoundingClientRect();
      const plotWidth = Math.max(1, rectangle.width - DETAIL_MARGIN_LEFT - DETAIL_MARGIN_RIGHT);
      const selectionSpan = width / plotWidth * this.span;
      this.elements.selection.hidden = width < 5;
      this.elements.selection.style.left = `${left}px`;
      this.elements.selection.style.width = `${width}px`;
      if (this.elements.selectionLabel) this.elements.selectionLabel.textContent = formatSeconds(selectionSpan);
    }

    hideSelection() {
      if (this.elements.selection) this.elements.selection.hidden = true;
    }

    showCursor(position) {
      if (!this.data || this.mode !== "cursor") return null;
      const rectangle = this.elements.detail.getBoundingClientRect();
      const time = this.start + this.span * position.fraction;
      if (this.elements.cursor) {
        this.elements.cursor.hidden = false;
        this.elements.cursor.style.left = `${position.x}px`;
        this.elements.cursor.classList.toggle("align-right", position.x > rectangle.width * .72);
      }
      if (this.elements.cursorLabel) this.elements.cursorLabel.textContent = formatAxisTime(time, this.span);
      return time;
    }

    hideCursor() {
      if (this.elements.cursor) this.elements.cursor.hidden = true;
    }

    setMode(mode) {
      this.mode = ["cursor", "zoom", "pan"].includes(mode) ? mode : "cursor";
      clearTimeout(this.wheelEndTimer);
      this.wheelGestureActive = false;
      if (this.elements.detailFrame) this.elements.detailFrame.dataset.interactionMode = this.mode;
      this.hideSelection();
      if (this.mode !== "cursor") this.hideCursor();
      this.notifyState();
    }

    setData(data) {
      this.cancelAnimation();
      clearTimeout(this.wheelEndTimer);
      this.wheelGestureActive = false;
      this.history = [];
      this.data = data;
      this.reset(false);
      this.setEmptyState();
      this.render();
      this.notifyState();
    }

    clear() {
      this.cancelAnimation();
      this.history = [];
      this.data = null;
      this.playbackTime = null;
      this.hideSelection();
      this.hideCursor();
      this.setEmptyState();
      this.render();
      this.notifyState();
    }

    setPlaybackTime(time) {
      this.playbackTime = Number.isFinite(Number(time)) ? Number(time) : null;
      this.updatePlaybackTime();
    }

    updatePlaybackTime() {
      const playhead = this.elements.playhead;
      if (!playhead || !this.data || this.playbackTime == null) {
        if (playhead) playhead.hidden = true;
        return;
      }
      const end = this.start + this.span;
      if (this.playbackTime < this.start || this.playbackTime > end) {
        playhead.hidden = true;
        return;
      }
      const rectangle = this.elements.detail.getBoundingClientRect();
      const plotWidth = Math.max(1, rectangle.width - DETAIL_MARGIN_LEFT - DETAIL_MARGIN_RIGHT);
      const fraction = clamp((this.playbackTime - this.start) / this.span, 0, 1);
      const x = DETAIL_MARGIN_LEFT + fraction * plotWidth;
      playhead.hidden = false;
      playhead.style.left = `${x}px`;
      playhead.classList.toggle("align-right", x > rectangle.width * .72);
    }

    destroy() {
      this.cancelAnimation();
      clearTimeout(this.wheelEndTimer);
      this.resizeObserver.disconnect();
      this.drag = null;
      this.data = null;
      ACTIVE_MANAGERS.delete(this);
    }

    setColors({ trace = COLORS.spike, rate = COLORS.rate, fill = COLORS.rateFill } = {}) {
      this.traceColor = trace;
      this.rateColor = rate;
      this.rateFill = fill;
      this.render();
    }

    initialWindow() {
      const duration = Math.max(0, Number(this.data?.duration) || 0);
      const span = Math.min(10, Math.max(MIN_SPAN_SECONDS, duration || 10));
      const firstSpike = Number(this.data?.spikeTimes?.[0] || 0);
      return normalizeWindow(firstSpike - span * .15, span, duration || span);
    }

    reset(render = true) {
      if (!this.data) return;
      const target = this.initialWindow();
      if (render) this.animateTo(target.start, target.span, { recordHistory: true });
      else {
        this.start = target.start;
        this.span = target.span;
      }
    }

    zoom(factor, anchor = .5) {
      if (!this.data || !(factor > 0)) return;
      const safeAnchor = clamp(anchor, 0, 1);
      const anchorTime = this.start + this.span * safeAnchor;
      const target = normalizeWindow(anchorTime - this.span * factor * safeAnchor, this.span * factor, this.data.duration);
      this.animateTo(target.start, target.span, { recordHistory: true });
    }

    setWindow(start, span) {
      if (!this.data) return;
      const target = normalizeWindow(start, span, this.data.duration);
      this.start = target.start;
      this.span = target.span;
      this.notifyWindow();
      this.drawDetail();
      this.drawOverview();
      this.updatePlaybackTime();
    }

    animateTo(start, span, { recordHistory = false, duration = 145 } = {}) {
      if (!this.data) return;
      const target = normalizeWindow(start, span, this.data.duration);
      if (Math.abs(target.start - this.start) < 1e-9 && Math.abs(target.span - this.span) < 1e-9) return;
      if (recordHistory) this.pushHistory();
      this.cancelAnimation();
      const fromStart = this.start;
      const fromSpan = this.span;
      if (typeof requestAnimationFrame !== "function" || duration <= 0) {
        this.setWindow(target.start, target.span);
        return;
      }
      const began = performance.now();
      const tick = (now) => {
        const progress = clamp((now - began) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.setWindow(fromStart + (target.start - fromStart) * eased, fromSpan + (target.span - fromSpan) * eased);
        if (progress < 1) this.animationFrame = requestAnimationFrame(tick);
        else this.animationFrame = null;
      };
      this.animationFrame = requestAnimationFrame(tick);
    }

    cancelAnimation() {
      if (this.animationFrame !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    pushHistory(view = { start: this.start, span: this.span }) {
      if (!this.data) return;
      const previous = this.history[this.history.length - 1];
      if (previous && Math.abs(previous.start - view.start) < 1e-9 && Math.abs(previous.span - view.span) < 1e-9) return;
      this.history.push({ start: view.start, span: view.span });
      if (this.history.length > 40) this.history.shift();
      this.notifyState();
    }

    back() {
      if (!this.data || !this.history.length) return;
      const target = this.history.pop();
      this.notifyState();
      this.animateTo(target.start, target.span);
    }

    notifyWindow() {
      this.onWindowChange?.({ start: this.start, end: this.start + this.span, span: this.span });
    }

    notifyState() {
      this.onStateChange?.({ mode: this.mode, canGoBack: this.history.length > 0, hasData: Boolean(this.data) });
    }

    setEmptyState() {
      const hasData = Boolean(this.data?.spikeTimes);
      if (this.elements.detailEmpty) this.elements.detailEmpty.hidden = hasData;
      if (this.elements.amplitudeEmpty) this.elements.amplitudeEmpty.hidden = Boolean(this.data?.amplitudeValues?.length);
      if (this.elements.acgEmpty) this.elements.acgEmpty.hidden = Boolean(this.data?.acg?.length);
      if (this.elements.templateEmpty) this.elements.templateEmpty.hidden = Boolean(this.data?.templateWaveform?.length);
    }

    render() {
      this.drawDetail();
      this.drawOverview();
      this.drawAmplitude();
      this.drawAcg();
      this.drawTemplate();
      this.updatePlaybackTime();
      if (this.data) this.notifyWindow();
    }

    drawDetail() {
      if (!this.elements.detail) return;
      const { context, width, height } = canvasContext(this.elements.detail);
      if (!this.data?.spikeTimes) return;
      const left = 47;
      const right = 13;
      const top = 14;
      const bottom = 25;
      const plotWidth = Math.max(1, width - left - right);
      const plotHeight = Math.max(1, height - top - bottom);
      const rasterOnly = Boolean(this.elements.rasterOnly);
      const rasterBottom = rasterOnly ? height - bottom - 5 : top + 62;
      const rateTop = rasterBottom + 22;
      const rateBottom = top + plotHeight;
      const windowEnd = this.start + this.span;
      drawVerticalGrid(context, left, top, plotWidth, plotHeight, 5);

      context.fillStyle = COLORS.text;
      context.textAlign = "right";
      context.fillText("SPIKES", left - 8, top + 7);
      if (!rasterOnly) context.fillText("RATE", left - 8, rateTop + 7);
      context.strokeStyle = COLORS.grid;
      context.beginPath();
      context.moveTo(left, crisp(rasterBottom + 9));
      context.lineTo(left + plotWidth, crisp(rasterBottom + 9));
      context.stroke();

      const first = lowerBound(this.data.spikeTimes, this.start);
      const last = rasterOnly ? lowerBound(this.data.spikeTimes, windowEnd) : upperBound(this.data.spikeTimes, windowEnd);
      const visibleCount = Math.max(0, last - first);
      if (visibleCount <= plotWidth * 2.5) {
        context.strokeStyle = this.traceColor;
        context.lineWidth = 1;
        context.globalAlpha = .9;
        context.beginPath();
        for (let index = first; index < last; index += 1) {
          const x = crisp(left + (this.data.spikeTimes[index] - this.start) / this.span * plotWidth);
          context.moveTo(x, top + 13);
          context.lineTo(x, rasterBottom);
        }
        context.stroke();
        context.globalAlpha = 1;
      } else {
        const pixelCounts = new Uint16Array(Math.max(1, Math.floor(plotWidth)));
        let maximum = 1;
        for (let index = first; index < last; index += 1) {
          const bin = Math.min(pixelCounts.length - 1, Math.floor((this.data.spikeTimes[index] - this.start) / this.span * pixelCounts.length));
          pixelCounts[bin] += 1;
          maximum = Math.max(maximum, pixelCounts[bin]);
        }
        context.strokeStyle = this.traceColor;
        context.globalAlpha = .78;
        context.beginPath();
        for (let index = 0; index < pixelCounts.length; index += 1) {
          if (!pixelCounts[index]) continue;
          const heightScale = 9 + Math.sqrt(pixelCounts[index] / maximum) * 39;
          const x = crisp(left + index);
          context.moveTo(x, rasterBottom);
          context.lineTo(x, rasterBottom - heightScale);
        }
        context.stroke();
        context.globalAlpha = 1;
      }

      if (rasterOnly) {
        context.fillStyle = COLORS.text;
        context.textAlign = "right";
        context.fillText(`${visibleCount} spikes${visibleCount > plotWidth * 2.5 ? " · density; zoom for individual spikes" : ""}`, width - right, 11);
      } else {
        const binCount = Math.max(24, Math.min(160, Math.floor(plotWidth / 5)));
        const rates = new Float32Array(binCount);
        const secondsPerBin = this.span / binCount;
        let maximumRate = 1;
        for (let index = first; index < last; index += 1) {
          const bin = Math.min(binCount - 1, Math.floor((this.data.spikeTimes[index] - this.start) / this.span * binCount));
          rates[bin] += 1 / secondsPerBin;
          maximumRate = Math.max(maximumRate, rates[bin]);
        }
        context.beginPath();
        rates.forEach((rate, index) => {
          const x = left + index / Math.max(1, rates.length - 1) * plotWidth;
          const y = rateBottom - rate / maximumRate * Math.max(1, rateBottom - rateTop - 8);
          if (!index) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.lineTo(left + plotWidth, rateBottom);
        context.lineTo(left, rateBottom);
        context.closePath();
        context.fillStyle = this.rateFill;
        context.fill();
        context.beginPath();
        rates.forEach((rate, index) => {
          const x = left + index / Math.max(1, rates.length - 1) * plotWidth;
          const y = rateBottom - rate / maximumRate * Math.max(1, rateBottom - rateTop - 8);
          if (!index) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.strokeStyle = this.rateColor;
        context.lineWidth = 1;
        context.stroke();
        context.fillStyle = COLORS.text;
        context.textAlign = "right";
        context.fillText(`${maximumRate.toFixed(maximumRate < 10 ? 1 : 0)} Hz`, left - 8, rateTop + 19);
      }

      context.textAlign = "center";
      for (let index = 0; index <= 5; index += 1) {
        const value = this.start + this.span * index / 5;
        context.fillText(formatAxisTime(value, this.span), left + plotWidth * index / 5, height - 8);
      }
    }

    drawOverview() {
      if (!this.elements.overview) return;
      const { context, width, height } = canvasContext(this.elements.overview);
      if (!this.data?.rateBins?.length || !this.data.duration) return;
      const left = 12;
      const right = 12;
      const top = 8;
      const bottom = 16;
      const plotWidth = Math.max(1, width - left - right);
      const plotHeight = Math.max(1, height - top - bottom);
      let maximum = 1;
      for (let index = 0; index < this.data.rateBins.length; index += 1) maximum = Math.max(maximum, this.data.rateBins[index]);
      context.beginPath();
      context.moveTo(left, top + plotHeight);
      for (let index = 0; index < this.data.rateBins.length; index += 1) {
        const x = left + index / Math.max(1, this.data.rateBins.length - 1) * plotWidth;
        const y = top + plotHeight - this.data.rateBins[index] / maximum * plotHeight;
        context.lineTo(x, y);
      }
      context.lineTo(left + plotWidth, top + plotHeight);
      context.closePath();
      context.fillStyle = COLORS.overview;
      context.fill();
      const selectionX = left + this.start / this.data.duration * plotWidth;
      const selectionWidth = Math.max(3, this.span / this.data.duration * plotWidth);
      context.fillStyle = COLORS.overviewSelection;
      context.fillRect(selectionX, top, selectionWidth, plotHeight);
      context.strokeStyle = COLORS.selection;
      context.lineWidth = 1;
      context.strokeRect(crisp(selectionX), crisp(top), Math.max(1, Math.round(selectionWidth)), Math.max(1, Math.round(plotHeight)));
      context.fillStyle = COLORS.text;
      context.textAlign = "left";
      context.fillText("0 s", left, height - 4);
      context.textAlign = "right";
      context.fillText(formatSeconds(this.data.duration), left + plotWidth, height - 4);
    }

    drawAmplitude() {
      if (!this.elements.amplitude) return;
      const { context, width, height } = canvasContext(this.elements.amplitude);
      const times = this.data?.amplitudeTimes;
      const values = this.data?.amplitudeValues;
      if (!times?.length || !values?.length) return;
      const left = 43;
      const right = 12;
      const top = 13;
      const bottom = 22;
      const plotWidth = Math.max(1, width - left - right);
      const plotHeight = Math.max(1, height - top - bottom);
      let minimum = Infinity;
      let maximum = -Infinity;
      for (let index = 0; index < values.length; index += 1) {
        minimum = Math.min(minimum, values[index]);
        maximum = Math.max(maximum, values[index]);
      }
      if (maximum <= minimum) { maximum = minimum + 1; }
      drawVerticalGrid(context, left, top, plotWidth, plotHeight, 4);
      context.fillStyle = COLORS.amplitude;
      for (let index = 0; index < values.length; index += 1) {
        const x = left + times[index] / Math.max(.001, this.data.duration) * plotWidth;
        const y = top + plotHeight - (values[index] - minimum) / (maximum - minimum) * plotHeight;
        context.fillRect(Math.round(x), Math.round(y), 1.5, 1.5);
      }
      context.fillStyle = COLORS.text;
      context.textAlign = "right";
      context.fillText(maximum.toFixed(2), left - 6, top + 4);
      context.fillText(minimum.toFixed(2), left - 6, top + plotHeight);
      context.textAlign = "left";
      context.fillText("0 s", left, height - 6);
      context.textAlign = "right";
      context.fillText(formatSeconds(this.data.duration), left + plotWidth, height - 6);
    }

    drawAcg() {
      if (!this.elements.acg) return;
      const { context, width, height } = canvasContext(this.elements.acg);
      const values = this.data?.acg;
      if (!values?.length) return;
      const left = 42;
      const right = 12;
      const top = 13;
      const bottom = 23;
      const plotWidth = Math.max(1, width - left - right);
      const plotHeight = Math.max(1, height - top - bottom);
      let maximum = 1;
      for (let index = 0; index < values.length; index += 1) maximum = Math.max(maximum, values[index]);
      drawVerticalGrid(context, left, top, plotWidth, plotHeight, 4);
      const center = left + plotWidth / 2;
      const refractoryWidth = plotWidth * .02;
      context.fillStyle = COLORS.refractory;
      context.fillRect(center - refractoryWidth, top, refractoryWidth * 2, plotHeight);
      const barWidth = plotWidth / values.length;
      context.fillStyle = COLORS.acg;
      for (let index = 0; index < values.length; index += 1) {
        const barHeight = values[index] / maximum * plotHeight;
        context.fillRect(left + index * barWidth, top + plotHeight - barHeight, Math.max(1, barWidth - .4), barHeight);
      }
      context.fillStyle = COLORS.text;
      context.textAlign = "right";
      context.fillText(String(maximum), left - 6, top + 4);
      context.textAlign = "center";
      context.fillText("−100 ms", left, height - 6);
      context.fillText("0", center, height - 6);
      context.fillText("100 ms", left + plotWidth, height - 6);
    }

    drawTemplate() {
      if (!this.elements.template) return;
      const { context, width, height } = canvasContext(this.elements.template);
      const values = this.data?.templateWaveform;
      if (!values?.length) return;
      const left = 38;
      const right = 12;
      const top = 13;
      const bottom = 23;
      const plotWidth = Math.max(1, width - left - right);
      const plotHeight = Math.max(1, height - top - bottom);
      let minimum = Infinity;
      let maximum = -Infinity;
      for (let index = 0; index < values.length; index += 1) {
        minimum = Math.min(minimum, values[index]);
        maximum = Math.max(maximum, values[index]);
      }
      if (maximum <= minimum) maximum = minimum + 1;
      drawVerticalGrid(context, left, top, plotWidth, plotHeight, 4);
      const zeroY = top + plotHeight - (0 - minimum) / (maximum - minimum) * plotHeight;
      context.strokeStyle = COLORS.grid;
      context.beginPath();
      context.moveTo(left, crisp(zeroY));
      context.lineTo(left + plotWidth, crisp(zeroY));
      context.stroke();
      context.beginPath();
      values.forEach((value, index) => {
        const x = left + index / Math.max(1, values.length - 1) * plotWidth;
        const y = top + plotHeight - (value - minimum) / (maximum - minimum) * plotHeight;
        if (!index) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = COLORS.template;
      context.lineWidth = 1.25;
      context.stroke();
      context.fillStyle = COLORS.text;
      context.textAlign = "right";
      context.fillText(maximum.toFixed(1), left - 6, top + 4);
      context.fillText(minimum.toFixed(1), left - 6, top + plotHeight);
      context.textAlign = "left";
      context.fillText("0 ms", left, height - 6);
      context.textAlign = "right";
      const milliseconds = values.length / Math.max(1, this.data.sampleRate || 30000) * 1000;
      context.fillText(`${milliseconds.toFixed(2)} ms`, left + plotWidth, height - 6);
    }
  }

  return {
    PlotManager,
    formatSeconds,
    formatAxisTime,
    normalizeWindow,
    wheelZoomFactor,
    wheelPixels,
    wheelNavigationDelta,
    wheelPanOffset,
    setPlotTheme,
    MIN_SPAN_SECONDS
  };
});
