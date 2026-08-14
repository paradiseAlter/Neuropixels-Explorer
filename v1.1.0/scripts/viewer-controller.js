(() => {
  "use strict";

  const scope = window.NeuropixelWorkflowV11 = window.NeuropixelWorkflowV11 || {};
  const COLORS = ["#79afe9", "#76cfa0", "#d5a36b", "#bc91c7", "#d17e77", "#8dc6c9"];
  const LABEL_WIDTH = 92;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function randomFactory(seed) {
    let value = seed || 1;
    return () => {
      value = Math.imul(1664525, value) + 1013904223 >>> 0;
      return value / 4294967296;
    };
  }

  function spikeTimes(entity, fullStart, fullEnd) {
    const random = randomFactory(hashString(`${entity.kind}:${entity.label}`));
    const count = 90 + Math.floor(random() * 90);
    const events = [];
    for (let index = 0; index < count; index += 1) {
      const base = fullStart + random() * (fullEnd - fullStart);
      events.push(base);
      if (random() > 0.86) events.push(clamp(base + (random() - 0.5) * 0.18, fullStart, fullEnd));
    }
    return events.sort((a, b) => a - b);
  }

  function visibleMode(data) {
    return data.mode === "Auto" ? (data.resolvedMode || "Raster") : data.mode;
  }

  function attach(node, onPatch) {
    node.viewerCleanup?.();
    const canvas = node.element.querySelector("[data-viewer-canvas]");
    const stage = node.element.querySelector("[data-viewer-stage]");
    if (!canvas || !stage) {
      node.viewerCleanup = null;
      return;
    }

    const context = canvas.getContext("2d");
    const listeners = [];
    let drag = null;
    let resizeObserver = null;
    let width = 0;
    let height = 0;

    const listen = (target, event, handler, options) => {
      target.addEventListener(event, handler, options);
      listeners.push(() => target.removeEventListener(event, handler, options));
    };

    function localPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (canvas.clientWidth / Math.max(1, rect.width)),
        y: (event.clientY - rect.top) * (canvas.clientHeight / Math.max(1, rect.height))
      };
    }

    function prepareCanvas() {
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function clear() {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#08090a";
      context.fillRect(0, 0, width, height);
    }

    function drawFrame(title, subtitle) {
      context.fillStyle = "#0d0e10";
      context.fillRect(0, 0, width, 25);
      context.strokeStyle = "#27292c";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, 25.5);
      context.lineTo(width, 25.5);
      context.stroke();
      context.font = "600 9px Segoe UI, sans-serif";
      context.fillStyle = "#b9bbc0";
      context.fillText(title.toUpperCase(), 10, 16);
      context.textAlign = "right";
      context.font = "8px Segoe UI, sans-serif";
      context.fillStyle = "#61646a";
      context.fillText(subtitle.toUpperCase(), width - 10, 16);
      context.textAlign = "left";
    }

    function drawTimeGrid(start, end, top, bottom) {
      const plotWidth = width - LABEL_WIDTH - 10;
      context.strokeStyle = "rgba(255,255,255,.055)";
      context.fillStyle = "#60636a";
      context.font = "8px Cascadia Mono, monospace";
      for (let index = 0; index <= 6; index += 1) {
        const x = LABEL_WIDTH + plotWidth * index / 6;
        context.beginPath();
        context.moveTo(x + 0.5, top);
        context.lineTo(x + 0.5, bottom);
        context.stroke();
        const time = start + (end - start) * index / 6;
        context.fillText(`${time.toFixed(end - start < 2 ? 2 : 1)}s`, x + 3, height - 7);
      }
      context.strokeStyle = "#292b2f";
      context.beginPath();
      context.moveTo(LABEL_WIDTH - 0.5, top);
      context.lineTo(LABEL_WIDTH - 0.5, bottom);
      context.stroke();
    }

    function drawRaster() {
      const data = node.data;
      const entities = (data.sourceEntities?.length ? data.sourceEntities : [{ kind: "Unit", label: "No unit selected" }]).slice(0, 10);
      const start = Number(data.viewStart);
      const end = Number(data.viewEnd);
      const fullStart = Number(data.fullStart);
      const fullEnd = Number(data.fullEnd);
      const top = 26;
      const bottom = height - 22;
      const plotWidth = width - LABEL_WIDTH - 10;
      const laneHeight = Math.max(22, (bottom - top) / entities.length);
      drawFrame("Shared spike raster", data.sourceState === "DEMO" ? "demo events" : "preview · arrays not parsed");
      drawTimeGrid(start, end, top, bottom);

      entities.forEach((entity, index) => {
        const laneTop = top + laneHeight * index;
        const laneBottom = Math.min(bottom, laneTop + laneHeight);
        const color = COLORS[index % COLORS.length];
        context.fillStyle = index % 2 ? "rgba(255,255,255,.012)" : "rgba(255,255,255,.025)";
        context.fillRect(0, laneTop, width, laneBottom - laneTop);
        context.strokeStyle = "rgba(255,255,255,.06)";
        context.beginPath();
        context.moveTo(0, laneBottom - 0.5);
        context.lineTo(width, laneBottom - 0.5);
        context.stroke();

        context.fillStyle = color;
        context.fillRect(9, laneTop + 8, 3, Math.max(8, laneHeight - 16));
        context.fillStyle = "#c4c5c8";
        context.font = "600 9px Segoe UI, sans-serif";
        context.fillText(entity.label.slice(0, 14), 18, laneTop + Math.min(17, laneHeight * 0.48));
        context.fillStyle = "#61646a";
        context.font = "7px Segoe UI, sans-serif";
        context.fillText(entity.kind.toUpperCase(), 18, laneTop + Math.min(29, laneHeight * 0.72));

        context.strokeStyle = color;
        context.globalAlpha = 0.82;
        context.lineWidth = 1;
        spikeTimes(entity, fullStart, fullEnd).forEach((time) => {
          if (time < start || time > end) return;
          const x = LABEL_WIDTH + (time - start) / (end - start) * plotWidth;
          context.beginPath();
          context.moveTo(x + 0.5, laneTop + 6);
          context.lineTo(x + 0.5, laneBottom - 6);
          context.stroke();
        });
        context.globalAlpha = 1;
      });

      if (drag) {
        const left = Math.min(drag.startX, drag.currentX);
        const right = Math.max(drag.startX, drag.currentX);
        context.fillStyle = "rgba(121,175,233,.14)";
        context.fillRect(left, top, right - left, bottom - top);
        context.strokeStyle = "rgba(121,175,233,.88)";
        context.setLineDash([3, 3]);
        context.strokeRect(left + 0.5, top + 0.5, right - left, bottom - top - 1);
        context.setLineDash([]);
      }
    }

    function drawWaveform() {
      const entities = (node.data.sourceEntities?.length ? node.data.sourceEntities : [{ kind: "Template", label: "No template selected" }]).slice(0, 8);
      const top = 26;
      const bottom = height - 22;
      const plotWidth = width - LABEL_WIDTH - 10;
      const laneHeight = Math.max(24, (bottom - top) / entities.length);
      drawFrame("Average waveform", "preview · template arrays not parsed");

      for (let grid = 0; grid <= 5; grid += 1) {
        const x = LABEL_WIDTH + plotWidth * grid / 5;
        context.strokeStyle = "rgba(255,255,255,.055)";
        context.beginPath();
        context.moveTo(x, top);
        context.lineTo(x, bottom);
        context.stroke();
        context.fillStyle = "#60636a";
        context.font = "8px Cascadia Mono, monospace";
        context.fillText(`${(grid * 0.4).toFixed(1)}ms`, x + 3, height - 7);
      }

      entities.forEach((entity, index) => {
        const laneTop = top + index * laneHeight;
        const center = laneTop + laneHeight / 2;
        const color = COLORS[index % COLORS.length];
        context.strokeStyle = "rgba(255,255,255,.055)";
        context.beginPath();
        context.moveTo(0, laneTop + laneHeight);
        context.lineTo(width, laneTop + laneHeight);
        context.stroke();
        context.fillStyle = color;
        context.fillRect(9, laneTop + 8, 3, Math.max(8, laneHeight - 16));
        context.fillStyle = "#c4c5c8";
        context.font = "600 9px Segoe UI, sans-serif";
        context.fillText(entity.label.slice(0, 14), 18, center + 3);

        const phase = (hashString(entity.label) % 9) / 15;
        context.strokeStyle = color;
        context.lineWidth = 1.4;
        context.beginPath();
        for (let point = 0; point <= 100; point += 1) {
          const t = point / 100;
          const positive = 0.36 * Math.exp(-Math.pow((t - 0.31 - phase * 0.08) / 0.075, 2));
          const trough = -1.1 * Math.exp(-Math.pow((t - 0.49 - phase * 0.04) / 0.065, 2));
          const rebound = 0.48 * Math.exp(-Math.pow((t - 0.64) / 0.11, 2));
          const x = LABEL_WIDTH + t * plotWidth;
          const y = center - (positive + trough + rebound) * laneHeight * 0.32;
          if (point === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.stroke();
      });
    }

    function drawProbe() {
      const entities = (node.data.sourceEntities?.length ? node.data.sourceEntities : [{ kind: "Unit", label: "No spatial entity" }]).slice(0, 16);
      drawFrame("Probe position", "preview · four shanks");
      const top = 42;
      const bottom = height - 18;
      const shankWidth = 32;
      const groupWidth = Math.min(width - 80, 310);
      const gap = (groupWidth - shankWidth * 4) / 3;
      const startX = (width - groupWidth) / 2;

      for (let shank = 0; shank < 4; shank += 1) {
        const x = startX + shank * (shankWidth + gap);
        context.fillStyle = "#111315";
        context.strokeStyle = "#34373c";
        context.lineWidth = 1;
        context.beginPath();
        context.roundRect(x, top, shankWidth, bottom - top, [2, 2, 8, 8]);
        context.fill();
        context.stroke();
        for (let row = 0; row < 18; row += 1) {
          const y = top + 8 + row * (bottom - top - 16) / 17;
          context.fillStyle = row % 2 ? "#31343a" : "#26292e";
          context.fillRect(x + 8, y, 3, 3);
          context.fillRect(x + 21, y, 3, 3);
        }
        context.fillStyle = "#62656b";
        context.font = "8px Cascadia Mono, monospace";
        context.textAlign = "center";
        context.fillText(`S${shank + 1}`, x + shankWidth / 2, height - 6);
      }

      entities.forEach((entity, index) => {
        const seed = hashString(`${entity.kind}:${entity.label}`);
        const shank = seed % 4;
        const depth = ((seed >>> 3) % 900) / 900;
        const x = startX + shank * (shankWidth + gap) + shankWidth / 2;
        const y = top + 10 + depth * (bottom - top - 20);
        const color = COLORS[index % COLORS.length];
        context.fillStyle = color;
        context.shadowColor = color;
        context.shadowBlur = 8;
        context.beginPath();
        context.arc(x, y, 4.2, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      });
      context.textAlign = "left";
      context.fillStyle = "#64676d";
      context.font = "8px Segoe UI, sans-serif";
      context.fillText(`${entities.length} selected entities`, 10, height - 7);
    }

    function draw() {
      prepareCanvas();
      clear();
      const mode = visibleMode(node.data);
      canvas.classList.toggle("time-interactive", mode === "Raster");
      if (mode === "Probe") drawProbe();
      else if (mode === "Waveform") drawWaveform();
      else drawRaster();
    }

    function commitRange(start, end) {
      const fullStart = Number(node.data.fullStart);
      const fullEnd = Number(node.data.fullEnd);
      const minimum = Math.max(0.02, (fullEnd - fullStart) / 5000);
      const nextStart = clamp(start, fullStart, fullEnd - minimum);
      const nextEnd = clamp(end, nextStart + minimum, fullEnd);
      onPatch(node.id, { viewStart: nextStart, viewEnd: nextEnd }, { render: false, notify: false });
      const rangeText = `${nextStart.toFixed(2)}–${nextEnd.toFixed(2)} s`;
      node.element.querySelectorAll("[data-viewer-range], [data-viewer-compact-range]").forEach((label) => {
        label.textContent = rangeText;
      });
      draw();
    }

    function zoom(factor, anchor = 0.5) {
      if (visibleMode(node.data) !== "Raster") return;
      const start = Number(node.data.viewStart);
      const end = Number(node.data.viewEnd);
      const span = end - start;
      const center = start + span * anchor;
      const nextSpan = span * factor;
      commitRange(center - nextSpan * anchor, center + nextSpan * (1 - anchor));
    }

    function reset() {
      if (visibleMode(node.data) !== "Raster") return;
      commitRange(Number(node.data.fullStart), Number(node.data.fullEnd));
    }

    listen(canvas, "wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (visibleMode(node.data) !== "Raster") return;
      const point = localPoint(event);
      const anchor = clamp((point.x - LABEL_WIDTH) / Math.max(1, width - LABEL_WIDTH - 10), 0, 1);
      zoom(event.deltaY > 0 ? 1.28 : 0.78, anchor);
    }, { passive: false });

    listen(canvas, "pointerdown", (event) => {
      if (event.button !== 0 || visibleMode(node.data) !== "Raster") return;
      const point = localPoint(event);
      if (point.x < LABEL_WIDTH) return;
      event.preventDefault();
      event.stopPropagation();
      drag = { startX: clamp(point.x, LABEL_WIDTH, width - 10), currentX: clamp(point.x, LABEL_WIDTH, width - 10) };
      canvas.setPointerCapture(event.pointerId);
      draw();
    });

    listen(canvas, "pointermove", (event) => {
      if (!drag) return;
      const point = localPoint(event);
      drag.currentX = clamp(point.x, LABEL_WIDTH, width - 10);
      draw();
    });

    const finishSelection = (event) => {
      if (!drag) return;
      const selection = { ...drag };
      drag = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      const left = Math.min(selection.startX, selection.currentX);
      const right = Math.max(selection.startX, selection.currentX);
      if (right - left < 8) {
        draw();
        return;
      }
      const start = Number(node.data.viewStart);
      const end = Number(node.data.viewEnd);
      const plotWidth = width - LABEL_WIDTH - 10;
      const selectedStart = start + (left - LABEL_WIDTH) / plotWidth * (end - start);
      const selectedEnd = start + (right - LABEL_WIDTH) / plotWidth * (end - start);
      commitRange(selectedStart, selectedEnd);
    };

    listen(canvas, "pointerup", finishSelection);
    listen(canvas, "pointercancel", finishSelection);
    listen(canvas, "dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      reset();
    });

    node.element.querySelectorAll("[data-viewer-action]").forEach((button) => {
      listen(button, "click", (event) => {
        event.stopPropagation();
        const action = button.dataset.viewerAction;
        if (action === "zoom-in") zoom(0.68);
        if (action === "zoom-out") zoom(1.45);
        if (action === "reset") reset();
      });
    });

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(draw);
      resizeObserver.observe(stage);
    } else {
      listen(window, "resize", draw);
    }
    requestAnimationFrame(draw);

    node.viewerCleanup = () => {
      listeners.forEach((remove) => remove());
      resizeObserver?.disconnect();
      node.viewerCleanup = null;
    };
  }

  scope.viewerController = { attach };
})();
