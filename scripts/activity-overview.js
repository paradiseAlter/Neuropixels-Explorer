((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NeuropixelsActivityOverview = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const GUTTER_WIDTH = 238;
  const HEADER_HEIGHT = 31;
  const AXIS_HEIGHT = 25;
  const MIN_ROW_HEIGHT = 18;
  const EXPANDED_ROW_HEIGHT = 92;

  function finiteOrNull(value) {
    if (value == null || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function stableUnitOrder(units) {
    return [...(units || [])].sort((left, right) => {
      const leftShank = finiteOrNull(left.shankId);
      const rightShank = finiteOrNull(right.shankId);
      if (leftShank == null && rightShank != null) return 1;
      if (leftShank != null && rightShank == null) return -1;
      if (leftShank != null && rightShank != null && leftShank !== rightShank) return leftShank - rightShank;
      const leftDepth = finiteOrNull(left.depthUm ?? left.depth);
      const rightDepth = finiteOrNull(right.depthUm ?? right.depth);
      if (leftDepth == null && rightDepth != null) return 1;
      if (leftDepth != null && rightDepth == null) return -1;
      if (leftDepth != null && rightDepth != null && leftDepth !== rightDepth) return leftDepth - rightDepth;
      return Number(left.id) - Number(right.id);
    });
  }

  function regionRange(units) {
    const regions = [...new Set(units.map((unit) => unit.region || "Unmapped"))];
    if (regions.length === 1) return regions[0];
    return `${regions[0]}–${regions[regions.length - 1]}`;
  }

  function aggregateActivity(units, matrix, binCount) {
    const activity = new Uint8Array(binCount);
    for (let bin = 0; bin < binCount; bin += 1) {
      let active = 0;
      units.forEach((unit) => {
        if (matrix[Number(unit.sourceIndex) * binCount + bin] > 0) active += 1;
      });
      activity[bin] = Math.round(active / Math.max(1, units.length) * 255);
    }
    return activity;
  }

  function individualRow(unit) {
    return {
      key: `unit:${Number(unit.id)}`,
      kind: "unit",
      unit,
      unitIds: [Number(unit.id)],
      sourceIndexes: [Number(unit.sourceIndex)]
    };
  }

  function aggregateRow(units, matrix, binCount) {
    const first = units[0];
    const last = units[units.length - 1];
    const shanks = [...new Set(units.map((unit) => finiteOrNull(unit.shankId)).filter((value) => value != null))];
    const depths = units.map((unit) => finiteOrNull(unit.depthUm ?? unit.depth)).filter((value) => value != null);
    const minimumDepth = depths.length ? Math.min(...depths) : null;
    const maximumDepth = depths.length ? Math.max(...depths) : null;
    const key = `group:${first.id}:${last.id}`;
    return {
      key,
      kind: "aggregate",
      unitIds: units.map((unit) => Number(unit.id)),
      sourceIndexes: units.map((unit) => Number(unit.sourceIndex)),
      units,
      activity: aggregateActivity(units, matrix, binCount),
      shankId: shanks.length === 1 ? shanks[0] : null,
      shankRange: shanks,
      minimumDepth,
      maximumDepth,
      region: regionRange(units),
      count: units.length
    };
  }

  function buildDisplayRows(units, matrix, binCount, maximumRows, expandedGroupKey = null, forceUnitId = null) {
    const ordered = stableUnitOrder(units);
    const safeMaximum = Math.max(1, Math.floor(Number(maximumRows) || 1));
    if (ordered.length <= safeMaximum) return ordered.map(individualRow);
    const targetSize = Math.max(2, Math.ceil(ordered.length / safeMaximum));
    const groups = [];
    let cursor = 0;
    while (cursor < ordered.length) {
      const start = cursor;
      const shank = finiteOrNull(ordered[start].shankId);
      cursor += 1;
      while (cursor < ordered.length && cursor - start < targetSize && finiteOrNull(ordered[cursor].shankId) === shank) cursor += 1;
      groups.push(ordered.slice(start, cursor));
    }
    while (groups.length > safeMaximum) {
      let bestIndex = 0;
      let bestSize = Infinity;
      for (let index = 0; index < groups.length - 1; index += 1) {
        const size = groups[index].length + groups[index + 1].length;
        if (size < bestSize) { bestSize = size; bestIndex = index; }
      }
      groups.splice(bestIndex, 2, [...groups[bestIndex], ...groups[bestIndex + 1]]);
    }
    const forceId = finiteOrNull(forceUnitId);
    return groups.flatMap((group) => {
      const aggregate = aggregateRow(group, matrix, binCount);
      if (aggregate.key === expandedGroupKey || (forceId != null && aggregate.unitIds.includes(forceId))) return group.map(individualRow);
      return [aggregate];
    });
  }

  function formatDepth(value) {
    const depth = finiteOrNull(value);
    return depth == null ? "depth —" : `${Math.round(depth)} µm`;
  }

  function formatIdentity(unit) {
    if (!unit) return "";
    const shank = finiteOrNull(unit.shankId);
    return `Unit ${Number(unit.id)} · ${shank == null ? "Shank —" : `Shank ${shank + 1}`} · ${formatDepth(unit.depthUm ?? unit.depth)} · ${unit.region || "Unmapped"}`;
  }

  function lowerBound(values, target) {
    let low = 0;
    let high = values?.length || 0;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (Number(values[middle]) < target) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function readCss(name, fallback) {
    if (typeof getComputedStyle !== "function" || typeof document === "undefined") return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  class ActivityAnatomyCanvas {
    constructor({ canvas, tooltip = null, empty = null }, callbacks = {}) {
      this.canvas = canvas;
      this.tooltip = tooltip;
      this.empty = empty;
      this.callbacks = callbacks;
      this.data = null;
      this.units = [];
      this.rows = [];
      this.rowGeometry = [];
      this.state = {
        visibleRange: { start: 0, end: 0 }, cursorTime: 0, selectedInterval: null,
        selectedUnitId: null, expandedUnitId: null, selectedGroupKey: null,
        selectedShank: null, selectedRegion: null
      };
      this.selectedSpikeTimes = new Float64Array(0);
      this.hover = null;
      this.drag = null;
      this.expandedGroupKey = null;
      this.resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => this._resize()) : null;
      this.resizeObserver?.observe(canvas);
      this._install();
      this._resize();
    }

    destroy() {
      this.resizeObserver?.disconnect();
    }

    setData(data) {
      this.data = data || null;
      this.units = stableUnitOrder((data?.units || []).map((unit, index) => ({ ...unit, sourceIndex: Number(unit.sourceIndex ?? index) })));
      const duration = Math.max(0, Number(data?.duration || 0));
      this.state = {
        ...this.state,
        visibleRange: { start: 0, end: duration },
        cursorTime: 0,
        selectedInterval: null,
        selectedUnitId: null,
        expandedUnitId: null,
        selectedGroupKey: null,
        selectedShank: null,
        selectedRegion: null
      };
      this.expandedGroupKey = null;
      this.selectedSpikeTimes = new Float64Array(0);
      if (this.empty) this.empty.hidden = Boolean(data?.units?.length);
      this._prepareRows();
      this.render();
    }

    setViewState(next) {
      this.state = { ...this.state, ...(next || {}) };
      if (this.state.selectedUnitId != null) this.expandedGroupKey = null;
      this._prepareRows();
      this.render();
    }

    setSelectedUnitData(result) {
      this.selectedSpikeTimes = result?.spikeTimes instanceof Float64Array
        ? result.spikeTimes
        : Float64Array.from(result?.spikeTimes || []);
      this.render();
    }

    focusUnit(unitId) {
      const normalized = finiteOrNull(unitId);
      if (normalized == null || !this.units.some((unit) => Number(unit.id) === normalized)) return false;
      this.state.selectedUnitId = normalized;
      this.state.expandedUnitId = normalized;
      this._prepareRows();
      this.render();
      return true;
    }

    _install() {
      this.canvas.addEventListener("pointerdown", (event) => this._pointerDown(event));
      this.canvas.addEventListener("pointermove", (event) => this._pointerMove(event));
      this.canvas.addEventListener("pointerup", (event) => this._pointerUp(event));
      this.canvas.addEventListener("pointercancel", () => { this.drag = null; });
      this.canvas.addEventListener("pointerleave", () => {
        if (!this.drag) { this.hover = null; if (this.tooltip) this.tooltip.hidden = true; this.render(); }
      });
      this.canvas.addEventListener("dblclick", (event) => {
        if (this._point(event).x < GUTTER_WIDTH || !this.data) return;
        const duration = Number(this.data.duration || 0);
        this._emitState({ visibleRange: { start: 0, end: duration }, selectedInterval: null });
      });
      this.canvas.addEventListener("wheel", (event) => this._wheel(event), { passive: false });
      this.canvas.addEventListener("keydown", (event) => this._keyDown(event));
    }

    _resize() {
      const rectangle = this.canvas.getBoundingClientRect();
      const width = Math.max(640, Math.round(rectangle.width || 1200));
      const height = Math.max(360, Math.round(rectangle.height || 620));
      const ratio = Math.max(1, Number(globalThis.devicePixelRatio || 1));
      if (this.canvas.width !== Math.round(width * ratio) || this.canvas.height !== Math.round(height * ratio)) {
        this.canvas.width = Math.round(width * ratio);
        this.canvas.height = Math.round(height * ratio);
      }
      this.width = width;
      this.height = height;
      this.ratio = ratio;
      this._prepareRows();
      this.render();
    }

    _prepareRows() {
      if (!this.data) { this.rows = []; this.rowGeometry = []; return; }
      const available = Math.max(1, (this.height || 620) - HEADER_HEIGHT - AXIS_HEIGHT);
      const maximumRows = Math.max(4, Math.floor(available / MIN_ROW_HEIGHT));
      this.rows = buildDisplayRows(
        this.units,
        this.data.normalizedActivity,
        Number(this.data.binCount),
        maximumRows,
        this.expandedGroupKey,
        this.state.selectedUnitId
      );
      const selected = finiteOrNull(this.state.expandedUnitId);
      const expandedCount = selected == null ? 0 : this.rows.filter((row) => row.kind === "unit" && Number(row.unit.id) === selected).length;
      const normalCount = Math.max(1, this.rows.length - expandedCount);
      const availableHeight = Math.max(MIN_ROW_HEIGHT, available - expandedCount * EXPANDED_ROW_HEIGHT);
      const normalHeight = Math.max(MIN_ROW_HEIGHT, Math.min(30, availableHeight / normalCount));
      let y = HEADER_HEIGHT;
      this.rowGeometry = this.rows.map((row) => {
        const expanded = row.kind === "unit" && Number(row.unit.id) === selected;
        const height = expanded ? EXPANDED_ROW_HEIGHT : normalHeight;
        const geometry = { row, y, height, expanded };
        y += height;
        return geometry;
      });
    }

    _rowActivity(row, bin) {
      if (row.kind === "aggregate") return row.activity[bin];
      return this.data.normalizedActivity[row.sourceIndexes[0] * this.data.binCount + bin];
    }

    _colors() {
      return {
        background: readCss("--surface-low", "#0a0b0d"),
        row: readCss("--surface-trace", "#0f1113"),
        rowAlt: readCss("--surface", "#0d0f11"),
        line: readCss("--line-soft", "#202328"),
        lineStrong: readCss("--line", "#292c31"),
        text: readCss("--text", "#e7e9ec"),
        soft: readCss("--text-soft", "#a4a9b1"),
        muted: readCss("--muted", "#707680"),
        accent: readCss("--accent", "#9fc6f1"),
        accentStrong: readCss("--accent-strong", "#c1ddfb"),
        selected: readCss("--surface-active", "#17212b"),
        good: readCss("--good", "#7ec89c"),
        warn: readCss("--warn", "#d1ad72")
      };
    }

    render() {
      if (!this.canvas || !this.width || !this.height) return;
      const context = this.canvas.getContext("2d");
      if (!context) return;
      const colors = this._colors();
      context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
      context.clearRect(0, 0, this.width, this.height);
      context.fillStyle = colors.background;
      context.fillRect(0, 0, this.width, this.height);
      this._drawHeader(context, colors);
      if (!this.data || !this.rows.length) return;
      this.rowGeometry.forEach((geometry, index) => this._drawRow(context, colors, geometry, index));
      this._drawSelection(context, colors);
      this._drawCursor(context, colors);
      this._drawAxis(context, colors);
    }

    _drawHeader(context, colors) {
      context.fillStyle = colors.background;
      context.fillRect(0, 0, this.width, HEADER_HEIGHT);
      context.strokeStyle = colors.lineStrong;
      context.beginPath();
      context.moveTo(0, HEADER_HEIGHT - .5);
      context.lineTo(this.width, HEADER_HEIGHT - .5);
      context.stroke();
      context.font = '600 9px "Cascadia Mono", Consolas, monospace';
      context.fillStyle = colors.muted;
      context.textBaseline = "middle";
      context.fillText("SHANK", 10, HEADER_HEIGHT / 2);
      context.fillText("DEPTH", 61, HEADER_HEIGHT / 2);
      context.fillText("REGION / UNIT", 118, HEADER_HEIGHT / 2);
      context.fillText("RECORDING-WIDE NORMALIZED ACTIVITY", GUTTER_WIDTH + 12, HEADER_HEIGHT / 2);
      context.textAlign = "right";
      context.fillText("time →", this.width - 10, HEADER_HEIGHT / 2);
      context.textAlign = "left";
    }

    _isSubdued(row) {
      const selectedUnit = finiteOrNull(this.state.selectedUnitId);
      const selectedShank = finiteOrNull(this.state.selectedShank);
      const selectedRegion = this.state.selectedRegion;
      if (selectedUnit != null) return !row.unitIds.includes(selectedUnit);
      if (selectedShank != null) {
        if (row.kind === "unit") return finiteOrNull(row.unit.shankId) !== selectedShank;
        return !row.shankRange.includes(selectedShank);
      }
      if (selectedRegion) {
        if (row.kind === "unit") return (row.unit.region || "Unmapped") !== selectedRegion;
        return !row.units.some((unit) => (unit.region || "Unmapped") === selectedRegion);
      }
      return false;
    }

    _drawRow(context, colors, geometry, index) {
      const { row, y, height, expanded } = geometry;
      const selected = row.kind === "unit" && Number(row.unit.id) === finiteOrNull(this.state.selectedUnitId);
      const hovered = this.hover?.row?.key === row.key;
      const subdued = this._isSubdued(row);
      context.save();
      context.globalAlpha = subdued ? .28 : 1;
      context.fillStyle = selected ? colors.selected : index % 2 ? colors.rowAlt : colors.row;
      context.fillRect(0, y, this.width, height);
      if (hovered && !selected) {
        context.fillStyle = "rgba(159,198,241,.055)";
        context.fillRect(0, y, this.width, height);
      }
      context.strokeStyle = selected ? colors.accent : colors.line;
      context.lineWidth = selected ? 1.5 : 1;
      context.beginPath();
      context.moveTo(0, y + height - .5);
      context.lineTo(this.width, y + height - .5);
      context.stroke();
      this._drawAnatomy(context, colors, geometry);
      this._drawActivity(context, colors, geometry);
      if (expanded) this._drawExpandedSpikes(context, colors, geometry);
      context.restore();
    }

    _drawAnatomy(context, colors, geometry) {
      const { row, y, height, expanded } = geometry;
      const middle = y + Math.min(height, expanded ? 31 : height) / 2;
      context.textBaseline = "middle";
      context.font = '600 9px "Cascadia Mono", Consolas, monospace';
      context.fillStyle = colors.soft;
      if (row.kind === "aggregate") {
        const shank = row.shankId == null ? "MIX" : String(row.shankId + 1);
        const depth = row.minimumDepth == null ? "—" : `${Math.round(row.minimumDepth)}–${Math.round(row.maximumDepth)}`;
        context.fillText(shank, 10, middle);
        context.fillText(depth, 61, middle);
        context.fillStyle = colors.warn;
        context.fillText(`GROUP · ${row.count} Units`, 118, middle - 5);
        context.fillStyle = colors.muted;
        context.font = '500 8px "Cascadia Mono", Consolas, monospace';
        context.fillText(row.region, 118, middle + 7);
      } else {
        const unit = row.unit;
        const shank = finiteOrNull(unit.shankId);
        context.fillText(shank == null ? "—" : String(shank + 1), 10, middle);
        context.fillText(finiteOrNull(unit.depthUm ?? unit.depth) == null ? "—" : String(Math.round(unit.depthUm ?? unit.depth)), 61, middle);
        context.fillStyle = unit.regionColor || colors.muted;
        context.fillRect(108, y + 4, 3, Math.max(4, Math.min(height - 8, expanded ? 21 : height - 8)));
        context.fillStyle = colors.soft;
        context.fillText(`Unit ${Number(unit.id)}`, 118, middle - (expanded ? 5 : 0));
        if (expanded) {
          context.fillStyle = colors.muted;
          context.font = '500 8px "Cascadia Mono", Consolas, monospace';
          context.fillText(unit.region || "Unmapped", 118, middle + 8);
        }
      }
      context.strokeStyle = colors.lineStrong;
      context.beginPath();
      context.moveTo(GUTTER_WIDTH - .5, y);
      context.lineTo(GUTTER_WIDTH - .5, y + height);
      context.stroke();
    }

    _drawActivity(context, colors, geometry) {
      const { row, y, height, expanded } = geometry;
      const plotLeft = GUTTER_WIDTH;
      const plotWidth = Math.max(1, this.width - plotLeft);
      const start = Number(this.state.visibleRange?.start || 0);
      const end = Number(this.state.visibleRange?.end ?? this.data.duration);
      const binStart = Math.max(0, Math.floor(start / this.data.binSeconds));
      const binEnd = Math.min(this.data.binCount, Math.ceil(end / this.data.binSeconds));
      const visibleBins = Math.max(1, binEnd - binStart);
      const textureHeight = expanded ? 24 : height;
      for (let bin = binStart; bin < binEnd; bin += 1) {
        const value = this._rowActivity(row, bin);
        if (!value) continue;
        const x0 = plotLeft + (bin - binStart) / visibleBins * plotWidth;
        const x1 = plotLeft + (bin - binStart + 1) / visibleBins * plotWidth;
        const alpha = row.kind === "aggregate" ? .12 + value / 255 * .72 : .08 + value / 255 * .82;
        context.fillStyle = row.kind === "aggregate"
          ? `rgba(209,173,114,${alpha.toFixed(3)})`
          : `rgba(159,198,241,${alpha.toFixed(3)})`;
        context.fillRect(x0, y + 2, Math.max(1, x1 - x0 + .2), Math.max(1, textureHeight - 4));
      }
      if (row.kind === "aggregate") {
        context.strokeStyle = "rgba(209,173,114,.42)";
        context.setLineDash([4, 4]);
        context.strokeRect(plotLeft + .5, y + 2.5, plotWidth - 1, Math.max(1, textureHeight - 5));
        context.setLineDash([]);
      }
    }

    _drawExpandedSpikes(context, colors, geometry) {
      const { row, y, height } = geometry;
      const unit = row.unit;
      const plotLeft = GUTTER_WIDTH;
      const plotWidth = Math.max(1, this.width - plotLeft);
      const selected = this.state.selectedInterval;
      const rangeStart = selected ? Number(selected.start) : Number(this.state.visibleRange.start);
      const rangeEnd = selected ? Number(selected.end) : Number(this.state.visibleRange.end);
      const span = Math.max(.000001, rangeEnd - rangeStart);
      const top = y + 31;
      context.fillStyle = "rgba(0,0,0,.2)";
      context.fillRect(plotLeft, top, plotWidth, height - 33);
      context.fillStyle = colors.accentStrong;
      context.font = '600 9px "Cascadia Mono", Consolas, monospace';
      context.fillText(`${formatIdentity(unit)} · spikes in ${rangeStart.toFixed(3)}–${rangeEnd.toFixed(3)} s`, plotLeft + 9, y + 15);
      const left = lowerBound(this.selectedSpikeTimes, rangeStart);
      const right = lowerBound(this.selectedSpikeTimes, rangeEnd + Number.EPSILON);
      const stride = Math.max(1, Math.ceil((right - left) / Math.max(1, plotWidth * 1.5)));
      context.strokeStyle = colors.accentStrong;
      context.globalAlpha *= .86;
      context.beginPath();
      for (let index = left; index < right; index += stride) {
        const x = plotLeft + (Number(this.selectedSpikeTimes[index]) - rangeStart) / span * plotWidth;
        context.moveTo(x, top + 8);
        context.lineTo(x, y + height - 9);
      }
      context.stroke();
      context.globalAlpha = 1;
      context.fillStyle = colors.muted;
      context.font = '500 8px "Cascadia Mono", Consolas, monospace';
      context.textAlign = "right";
      context.fillText(`${right - left} spikes${stride > 1 ? ` · display stride ${stride}` : ""}`, this.width - 9, y + height - 5);
      context.textAlign = "left";
    }

    _timeToX(time) {
      const start = Number(this.state.visibleRange?.start || 0);
      const end = Number(this.state.visibleRange?.end ?? this.data?.duration ?? 1);
      return GUTTER_WIDTH + (Number(time) - start) / Math.max(.000001, end - start) * (this.width - GUTTER_WIDTH);
    }

    _xToTime(x) {
      const start = Number(this.state.visibleRange?.start || 0);
      const end = Number(this.state.visibleRange?.end ?? this.data?.duration ?? 1);
      const fraction = Math.max(0, Math.min(1, (Number(x) - GUTTER_WIDTH) / Math.max(1, this.width - GUTTER_WIDTH)));
      return start + fraction * (end - start);
    }

    _drawSelection(context, colors) {
      const interval = this.drag?.preview || this.state.selectedInterval;
      if (!interval) return;
      const left = this._timeToX(Math.min(interval.start, interval.end));
      const right = this._timeToX(Math.max(interval.start, interval.end));
      context.fillStyle = "rgba(103,155,207,.13)";
      context.fillRect(left, HEADER_HEIGHT, Math.max(1, right - left), this.height - HEADER_HEIGHT - AXIS_HEIGHT);
      context.strokeStyle = colors.accent;
      context.setLineDash([3, 3]);
      context.strokeRect(left + .5, HEADER_HEIGHT + .5, Math.max(1, right - left - 1), this.height - HEADER_HEIGHT - AXIS_HEIGHT - 1);
      context.setLineDash([]);
    }

    _drawCursor(context, colors) {
      if (!this.data) return;
      const x = this._timeToX(Number(this.state.cursorTime || 0));
      if (x < GUTTER_WIDTH || x > this.width) return;
      context.strokeStyle = colors.good;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x + .5, HEADER_HEIGHT);
      context.lineTo(x + .5, this.height - AXIS_HEIGHT);
      context.stroke();
      context.fillStyle = colors.good;
      context.font = '600 8px "Cascadia Mono", Consolas, monospace';
      context.fillText(`${Number(this.state.cursorTime || 0).toFixed(3)} s`, Math.min(this.width - 64, x + 5), HEADER_HEIGHT + 10);
    }

    _drawAxis(context, colors) {
      const top = this.height - AXIS_HEIGHT;
      context.fillStyle = colors.background;
      context.fillRect(0, top, this.width, AXIS_HEIGHT);
      context.strokeStyle = colors.lineStrong;
      context.beginPath();
      context.moveTo(GUTTER_WIDTH, top + .5);
      context.lineTo(this.width, top + .5);
      context.stroke();
      const start = Number(this.state.visibleRange?.start || 0);
      const end = Number(this.state.visibleRange?.end ?? this.data?.duration ?? 0);
      context.fillStyle = colors.muted;
      context.font = '500 8px "Cascadia Mono", Consolas, monospace';
      context.textBaseline = "middle";
      for (let tick = 0; tick <= 5; tick += 1) {
        const fraction = tick / 5;
        const x = GUTTER_WIDTH + fraction * (this.width - GUTTER_WIDTH);
        const value = start + fraction * (end - start);
        context.textAlign = tick === 0 ? "left" : tick === 5 ? "right" : "center";
        context.fillText(`${value.toFixed(end - start < 10 ? 2 : 1)} s`, x, top + AXIS_HEIGHT / 2);
      }
      context.textAlign = "left";
    }

    _point(event) {
      const rectangle = this.canvas.getBoundingClientRect();
      return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
    }

    _rowAt(y) {
      return this.rowGeometry.find((geometry) => y >= geometry.y && y < geometry.y + geometry.height) || null;
    }

    _pointerDown(event) {
      if (!this.data) return;
      const point = this._point(event);
      const geometry = this._rowAt(point.y);
      this.drag = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        row: geometry?.row || null,
        startTime: point.x >= GUTTER_WIDTH ? this._xToTime(point.x) : null,
        preview: null
      };
      this.canvas.setPointerCapture?.(event.pointerId);
    }

    _pointerMove(event) {
      if (!this.data) return;
      const point = this._point(event);
      const geometry = this._rowAt(point.y);
      this.hover = geometry ? { row: geometry.row, time: point.x >= GUTTER_WIDTH ? this._xToTime(point.x) : null, x: point.x, y: point.y } : null;
      if (this.drag?.startTime != null && Math.abs(point.x - this.drag.startX) > 4) {
        this.drag.preview = { start: this.drag.startTime, end: this._xToTime(point.x) };
      }
      this._showTooltip(event, geometry?.row || null, this.hover?.time);
      this.render();
    }

    _pointerUp(event) {
      if (!this.drag || !this.data) return;
      const drag = this.drag;
      const point = this._point(event);
      const geometry = this._rowAt(point.y);
      this.drag = null;
      if (drag.preview) {
        const start = Math.min(drag.preview.start, drag.preview.end);
        const end = Math.max(drag.preview.start, drag.preview.end);
        this._emitState({ selectedInterval: { start, end }, cursorTime: end });
        this.callbacks.onCursorCommit?.(end);
        return;
      }
      const row = geometry?.row || drag.row;
      if (!row) return;
      if (point.x < GUTTER_WIDTH) {
        const shank = row.kind === "unit" ? finiteOrNull(row.unit.shankId) : row.shankId;
        const region = row.kind === "unit" ? (row.unit.region || "Unmapped") : (row.region || null);
        this._emitState({ selectedShank: shank, selectedRegion: region, selectedGroupKey: row.kind === "aggregate" ? row.key : null });
        this.callbacks.onAnatomySelect?.({ shankId: shank, region, row });
        return;
      }
      const time = this._xToTime(point.x);
      if (row.kind === "aggregate") {
        this.expandedGroupKey = row.key;
        this._emitState({ selectedGroupKey: row.key, selectedUnitId: null, expandedUnitId: null, selectedShank: row.shankId, selectedRegion: row.region, cursorTime: time });
        this.callbacks.onAggregateSelect?.(row);
        this._prepareRows();
        this.render();
        this.callbacks.onCursorCommit?.(time);
        return;
      }
      const id = Number(row.unit.id);
      this._emitState({ selectedUnitId: id, expandedUnitId: id, selectedGroupKey: null, selectedShank: finiteOrNull(row.unit.shankId), selectedRegion: row.unit.region || "Unmapped", cursorTime: time });
      this.callbacks.onUnitSelect?.(id, row.unit);
      this.callbacks.onCursorCommit?.(time);
    }

    _wheel(event) {
      if (!this.data) return;
      const point = this._point(event);
      if (point.x < GUTTER_WIDTH) return;
      event.preventDefault();
      const duration = Number(this.data.duration || 0);
      const range = this.state.visibleRange;
      const span = Math.max(.05, Number(range.end) - Number(range.start));
      const nextSpan = Math.max(.05, Math.min(duration || span, span * (event.deltaY > 0 ? 1.35 : .72)));
      const anchor = this._xToTime(point.x);
      const fraction = (point.x - GUTTER_WIDTH) / Math.max(1, this.width - GUTTER_WIDTH);
      const start = Math.max(0, Math.min(duration - nextSpan, anchor - nextSpan * fraction));
      this._emitState({ visibleRange: { start, end: start + nextSpan } });
    }

    _keyDown(event) {
      if (!this.data || !["ArrowLeft", "ArrowRight", "Home", "Escape"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home") {
        this._emitState({ visibleRange: { start: 0, end: Number(this.data.duration || 0) }, cursorTime: 0, selectedInterval: null });
        return;
      }
      if (event.key === "Escape") {
        this._emitState({ selectedInterval: null, selectedUnitId: null, expandedUnitId: null, selectedGroupKey: null, selectedShank: null, selectedRegion: null });
        return;
      }
      const span = Number(this.state.visibleRange.end) - Number(this.state.visibleRange.start);
      const delta = span / 100 * (event.key === "ArrowLeft" ? -1 : 1);
      const time = Math.max(0, Math.min(Number(this.data.duration || 0), Number(this.state.cursorTime || 0) + delta));
      this._emitState({ cursorTime: time });
      this.callbacks.onCursorCommit?.(time);
    }

    _showTooltip(event, row, time) {
      if (!this.tooltip || !row) { if (this.tooltip) this.tooltip.hidden = true; return; }
      const identity = row.kind === "unit"
        ? formatIdentity(row.unit)
        : `Aggregate · ${row.count} Units · ${row.shankId == null ? "mixed shanks" : `Shank ${row.shankId + 1}`} · ${row.minimumDepth == null ? "depth unavailable" : `${Math.round(row.minimumDepth)}–${Math.round(row.maximumDepth)} µm`} · ${row.region}`;
      this.tooltip.textContent = `${identity}${time == null ? "" : ` · ${time.toFixed(3)} s`}`;
      this.tooltip.hidden = false;
      const host = this.canvas.parentElement?.getBoundingClientRect();
      if (host) {
        this.tooltip.style.left = `${Math.min(host.width - 260, Math.max(8, event.clientX - host.left + 12))}px`;
        this.tooltip.style.top = `${Math.min(host.height - 42, Math.max(8, event.clientY - host.top + 12))}px`;
      }
    }

    _emitState(patch) {
      this.state = { ...this.state, ...patch };
      this._prepareRows();
      this.render();
      this.callbacks.onStateChange?.(patch, { ...this.state });
    }
  }

  return {
    GUTTER_WIDTH,
    stableUnitOrder,
    buildDisplayRows,
    formatIdentity,
    ActivityAnatomyCanvas
  };
});
