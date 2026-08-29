((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NeuropixelsActivityOverview = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const GUTTER_WIDTH = 276;
  const HEADER_HEIGHT = 31;
  const AXIS_HEIGHT = 25;
  const MIN_ROW_HEIGHT = 17;
  const EXPANDED_ROW_HEIGHT = 98;
  const MIN_OVERVIEW_ROWS = 10;
  const MAX_OVERVIEW_ROWS = 18;

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

  function unitRegion(unit) {
    return unit?.region || "Unmapped";
  }

  function spatialRegion(unit) {
    return unit?.trackRegion || unitRegion(unit);
  }

  function spatialRegionColor(unit) {
    return unit?.trackRegionColor || unit?.regionColor || "";
  }

  function anatomyBoundaryKey(unit) {
    const shank = finiteOrNull(unit?.shankId);
    const trackStart = finiteOrNull(unit?.trackStartDepthUm);
    const trackEnd = finiteOrNull(unit?.trackEndDepthUm);
    if (unit?.trackRegion && trackStart != null && trackEnd != null) {
      return `${shank ?? "none"}|track|${trackStart}|${trackEnd}|${unit.trackRegion}`;
    }
    const mapped = unitRegion(unit);
    return `${shank ?? "none"}|unit|${mapped}`;
  }

  function aggregateActivity(units, matrix, binCount) {
    const activity = new Uint8Array(binCount);
    for (let bin = 0; bin < binCount; bin += 1) {
      let unusual = 0;
      units.forEach((unit) => {
        if (matrix[Number(unit.sourceIndex) * binCount + bin] > 0) unusual += 1;
      });
      activity[bin] = Math.round(unusual / Math.max(1, units.length) * 255);
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

  function aggregateRow(units, matrix, binCount, level = 0, ancestors = []) {
    const first = units[0];
    const last = units[units.length - 1];
    const shanks = [...new Set(units.map((unit) => finiteOrNull(unit.shankId)).filter((value) => value != null))];
    const depths = units.map((unit) => finiteOrNull(unit.depthUm ?? unit.depth)).filter((value) => value != null);
    const minimumDepth = depths.length ? Math.min(...depths) : null;
    const maximumDepth = depths.length ? Math.max(...depths) : null;
    const key = `group:${level}:${first.id}:${last.id}`;
    const mappedCount = units.filter((unit) => unitRegion(unit) !== "Unmapped").length;
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
      region: spatialRegion(first),
      regionColor: spatialRegionColor(first),
      regionSource: first.trackRegion ? "probe-track" : first.regionSource || "unit-map",
      regionUncertain: Boolean(first.trackAmbiguous) || !first.trackRegion,
      mappedCount,
      count: units.length,
      level,
      ancestors: [...ancestors]
    };
  }

  function overviewRowTarget(canvasHeight) {
    const available = Math.max(1, Number(canvasHeight || 620) - HEADER_HEIGHT - AXIS_HEIGHT);
    return Math.max(MIN_OVERVIEW_ROWS, Math.min(MAX_OVERVIEW_ROWS, Math.round(available / 46)));
  }

  function splitContiguous(groups, targetRows) {
    const result = groups.map((group) => [...group]);
    while (result.length < targetRows) {
      let bestIndex = -1;
      let bestLength = 1;
      result.forEach((group, index) => {
        if (group.length > bestLength) { bestLength = group.length; bestIndex = index; }
      });
      if (bestIndex < 0) break;
      const group = result[bestIndex];
      const middle = Math.ceil(group.length / 2);
      result.splice(bestIndex, 1, group.slice(0, middle), group.slice(middle));
    }
    return result;
  }

  function anatomicalGroups(units, targetRows) {
    const ordered = stableUnitOrder(units);
    if (!ordered.length) return [];
    const partitions = [];
    let current = [];
    let currentKey = null;
    ordered.forEach((unit) => {
      const key = anatomyBoundaryKey(unit);
      if (current.length && key !== currentKey) {
        partitions.push(current);
        current = [];
      }
      currentKey = key;
      current.push(unit);
    });
    if (current.length) partitions.push(current);
    return splitContiguous(partitions, Math.max(partitions.length, Math.min(ordered.length, Math.floor(Number(targetRows) || 1))));
  }

  function localGroups(units) {
    const requested = Math.max(2, Math.min(4, Math.ceil(units.length / 6)));
    return splitContiguous([units], requested);
  }

  function selectedNeighborhoodRows(group, matrix, binCount, selectedId, level, ancestors) {
    const selectedIndex = group.findIndex((unit) => Number(unit.id) === Number(selectedId));
    if (selectedIndex < 0) return [];
    const start = Math.max(0, selectedIndex - 2);
    const end = Math.min(group.length, selectedIndex + 3);
    const rows = [];
    if (start > 0) rows.push(aggregateRow(group.slice(0, start), matrix, binCount, level + 1, ancestors));
    rows.push(...group.slice(start, end).map(individualRow));
    if (end < group.length) rows.push(aggregateRow(group.slice(end), matrix, binCount, level + 1, ancestors));
    return rows;
  }

  function buildDisplayRows(units, matrix, binCount, targetRows, groupFocusPath = [], forceUnitId = null, unusualMatrix = null) {
    const ordered = stableUnitOrder(units);
    const safeTarget = Math.max(1, Math.floor(Number(targetRows) || 1));
    if (ordered.length <= safeTarget) return ordered.map(individualRow);
    const groups = anatomicalGroups(ordered, safeTarget);
    const focusPath = Array.isArray(groupFocusPath) ? groupFocusPath : groupFocusPath ? [groupFocusPath] : [];
    const forceId = finiteOrNull(forceUnitId);
    const aggregateMatrix = unusualMatrix?.length === matrix?.length ? unusualMatrix : matrix;
    const renderGroup = (group, level = 0, ancestors = []) => {
      const aggregate = aggregateRow(group, aggregateMatrix, binCount, level, ancestors);
      if (forceId != null && aggregate.unitIds.includes(forceId)) {
        return selectedNeighborhoodRows(group, aggregateMatrix, binCount, forceId, level, [...ancestors, aggregate.key]);
      }
      if (focusPath[level] !== aggregate.key) return [aggregate];
      if (group.length <= 8) return group.map(individualRow);
      return localGroups(group).flatMap((child) => renderGroup(child, level + 1, [...ancestors, aggregate.key]));
    };
    return groups.flatMap((group) => renderGroup(group));
  }

  function formatDepth(value) {
    const depth = finiteOrNull(value);
    return depth == null ? "depth —" : `${Math.round(depth)} µm`;
  }

  function formatIdentity(unit) {
    if (!unit) return "";
    const shank = finiteOrNull(unit.shankId);
    const mapped = unitRegion(unit);
    const source = mapped === "Unmapped"
      ? (unit.trackRegion ? `Unmapped · track context ${unit.trackRegion}` : "Unmapped")
      : `${mapped}${unit.regionSource ? ` · ${unit.regionSource}` : ""}`;
    return `Unit ${Number(unit.id)} · ${shank == null ? "Shank —" : `Shank ${shank + 1}`} · ${formatDepth(unit.depthUm ?? unit.depth)} · ${source}`;
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

  function temporalDetailMode(spanSeconds, plotWidth, visibleSpikeCount) {
    const width = Math.max(1, Number(plotWidth) || 1);
    const secondsPerPixel = Math.max(0, Number(spanSeconds) || 0) / width;
    if (secondsPerPixel <= .05 && Number(visibleSpikeCount || 0) <= width * .7) return "individual spikes";
    if (secondsPerPixel <= .14) return "normalized rate envelope";
    return "recording density";
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
        selectedUnitId: null, expandedUnitId: null, selectedGroupKey: null, groupFocusPath: [],
        selectedShank: null, selectedRegion: null
      };
      this.selectedSpikeTimes = new Float64Array(0);
      this.selectedRateBins = new Float32Array(0);
      this.selectedDuration = 0;
      this.hover = null;
      this.drag = null;
      this.layoutSignature = "";
      this.resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => this._resize()) : null;
      this.resizeObserver?.observe(canvas);
      this._install();
      this._resize();
    }

    destroy() {
      this.resizeObserver?.disconnect();
    }

    setData(data, { preserveState = false } = {}) {
      this.data = data || null;
      this.units = stableUnitOrder((data?.units || []).map((unit, index) => ({ ...unit, sourceIndex: Number(unit.sourceIndex ?? index) })));
      const duration = Math.max(0, Number(data?.duration || 0));
      if (!preserveState) {
        this.state = {
          ...this.state,
          visibleRange: { start: 0, end: duration },
          cursorTime: 0,
          selectedInterval: null,
          selectedUnitId: null,
          expandedUnitId: null,
          selectedGroupKey: null,
          groupFocusPath: [],
          selectedShank: null,
          selectedRegion: null
        };
        this.selectedSpikeTimes = new Float64Array(0);
        this.selectedRateBins = new Float32Array(0);
        this.selectedDuration = 0;
      }
      if (this.empty) this.empty.hidden = Boolean(data?.units?.length);
      this._prepareRows();
      this.render();
    }

    setViewState(next) {
      this.state = { ...this.state, ...(next || {}) };
      this._prepareRows();
      this.render();
    }

    setSelectedUnitData(result) {
      this.selectedSpikeTimes = result?.spikeTimes instanceof Float64Array
        ? result.spikeTimes
        : Float64Array.from(result?.spikeTimes || []);
      this.selectedRateBins = result?.rateBins instanceof Float32Array
        ? result.rateBins
        : Float32Array.from(result?.rateBins || []);
      this.selectedDuration = Number(result?.duration || this.data?.duration || 0);
      this.render();
    }

    focusUnit(unitId) {
      const normalized = finiteOrNull(unitId);
      if (normalized == null || !this.units.some((unit) => Number(unit.id) === normalized)) return false;
      this.state.selectedUnitId = normalized;
      this.state.expandedUnitId = normalized;
      this.state.groupFocusPath = [];
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
      const targetRows = overviewRowTarget(this.height || 620);
      this.rows = buildDisplayRows(
        this.units,
        this.data.normalizedActivity,
        Number(this.data.binCount),
        targetRows,
        this.state.groupFocusPath,
        this.state.selectedUnitId,
        this.data.unusualActivity
      );
      const selected = finiteOrNull(this.state.expandedUnitId);
      const expandedCount = selected == null ? 0 : this.rows.filter((row) => row.kind === "unit" && Number(row.unit.id) === selected).length;
      const normalCount = Math.max(1, this.rows.length - expandedCount);
      const availableHeight = Math.max(MIN_ROW_HEIGHT, available - expandedCount * EXPANDED_ROW_HEIGHT);
      const normalHeight = Math.max(MIN_ROW_HEIGHT, Math.min(48, availableHeight / normalCount));
      let y = HEADER_HEIGHT;
      this.rowGeometry = this.rows.map((row) => {
        const expanded = row.kind === "unit" && Number(row.unit.id) === selected;
        const height = expanded ? EXPANDED_ROW_HEIGHT : normalHeight;
        const geometry = { row, y, height, expanded };
        y += height;
        return geometry;
      });
      const aggregateCount = this.rows.filter((row) => row.kind === "aggregate").length;
      const unitCount = this.rows.length - aggregateCount;
      const summary = {
        targetRows,
        displayRows: this.rows.length,
        aggregateRows: aggregateCount,
        unitRows: unitCount,
        shanks: new Set(this.rows.flatMap((row) => row.kind === "unit" ? [finiteOrNull(row.unit.shankId)] : row.shankRange).filter((value) => value != null)).size,
        binCount: Number(this.data.binCount || 0),
        binSeconds: Number(this.data.binSeconds || 0)
      };
      const signature = JSON.stringify(summary);
      if (signature !== this.layoutSignature) {
        this.layoutSignature = signature;
        this.callbacks.onLayoutChange?.(summary);
      }
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
      this._drawSpatialIndex(context, colors);
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
      context.font = '650 9px "Cascadia Mono", Consolas, monospace';
      context.fillStyle = colors.muted;
      context.textBaseline = "middle";
      context.fillText("SHANK", 10, HEADER_HEIGHT / 2);
      context.fillText("DEPTH", 52, HEADER_HEIGHT / 2);
      context.fillText("REGION TRACK", 101, HEADER_HEIGHT / 2);
      context.fillText("ROW", 190, HEADER_HEIGHT / 2);
      context.fillText("RELATIVE ACTIVITY · GROUPS = FRACTION ABOVE OWN P90", GUTTER_WIDTH + 12, HEADER_HEIGHT / 2);
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
        return row.region !== selectedRegion && !row.units.some((unit) => (unit.region || "Unmapped") === selectedRegion);
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
      if (selected) {
        context.strokeStyle = colors.accentStrong;
        context.lineWidth = 1.5;
        context.strokeRect(.75, y + .75, this.width - 1.5, height - 1.5);
      }
      this._drawActivity(context, colors, geometry);
      if (expanded) this._drawExpandedSpikes(context, colors, geometry);
      context.restore();
    }

    _rowShank(row) {
      return row.kind === "unit" ? finiteOrNull(row.unit.shankId) : row.shankId;
    }

    _rowRegion(row) {
      return row.kind === "unit" ? spatialRegion(row.unit) : row.region;
    }

    _rowRegionKey(row) {
      if (row.kind === "unit") return anatomyBoundaryKey(row.unit);
      return anatomyBoundaryKey(row.units[0]);
    }

    _sections(keyFor) {
      const sections = [];
      this.rowGeometry.forEach((geometry) => {
        const key = keyFor(geometry.row);
        const previous = sections[sections.length - 1];
        if (previous && previous.key === key) {
          previous.height = geometry.y + geometry.height - previous.y;
          previous.rows.push(geometry.row);
        } else {
          sections.push({ key, y: geometry.y, height: geometry.height, rows: [geometry.row] });
        }
      });
      return sections;
    }

    _drawUnmappedHatch(context, x, y, width, height, colors) {
      context.save();
      context.beginPath();
      context.rect(x, y, width, height);
      context.clip();
      context.strokeStyle = colors.lineStrong;
      context.globalAlpha = .38;
      for (let offset = -height; offset < width + height; offset += 9) {
        context.beginPath();
        context.moveTo(x + offset, y + height);
        context.lineTo(x + offset + height, y);
        context.stroke();
      }
      context.restore();
    }

    _drawSpatialIndex(context, colors) {
      const bodyTop = HEADER_HEIGHT;
      const bodyBottom = this.height - AXIS_HEIGHT;
      context.save();
      context.fillStyle = colors.background;
      context.fillRect(0, bodyTop, GUTTER_WIDTH, bodyBottom - bodyTop);

      const shankSections = this._sections((row) => String(this._rowShank(row)));
      shankSections.forEach((section, index) => {
        context.fillStyle = index % 2 ? colors.rowAlt : colors.row;
        context.fillRect(0, section.y, 43, section.height);
        context.fillStyle = colors.soft;
        context.font = '700 11px "Cascadia Mono", Consolas, monospace';
        context.textBaseline = "middle";
        const shank = this._rowShank(section.rows[0]);
        context.fillText(shank == null ? "S—" : `S${shank + 1}`, 11, section.y + section.height / 2);
        context.strokeStyle = colors.lineStrong;
        context.globalAlpha = .8;
        context.beginPath();
        context.moveTo(0, section.y + .5);
        context.lineTo(this.width, section.y + .5);
        context.stroke();
        context.globalAlpha = 1;
      });

      const regionSections = this._sections((row) => this._rowRegionKey(row));
      regionSections.forEach((section) => {
        const first = section.rows[0];
        const unit = first.kind === "unit" ? first.unit : first.units[0];
        const region = this._rowRegion(first) || "Unmapped";
        const color = first.kind === "unit" ? spatialRegionColor(unit) : first.regionColor;
        if (color) {
          context.save();
          context.globalAlpha = .12;
          context.fillStyle = color;
          context.fillRect(94, section.y, 86, section.height);
          context.restore();
          context.fillStyle = color;
          context.fillRect(94, section.y, 2.5, section.height);
        }
        if (region === "Unmapped") this._drawUnmappedHatch(context, 94, section.y, 86, section.height, colors);
        context.fillStyle = colors.soft;
        context.font = '650 9px "Cascadia Mono", Consolas, monospace';
        context.textBaseline = "middle";
        context.fillText(region.length > 13 ? `${region.slice(0, 12)}…` : region, 101, section.y + section.height / 2 - (section.height >= 29 && unit?.trackAmbiguous ? 5 : 0));
        if (section.height >= 29 && unit?.trackAmbiguous) {
          context.fillStyle = colors.muted;
          context.font = '550 7px "Cascadia Mono", Consolas, monospace';
          context.fillText("TRACK · UNCERTAIN", 101, section.y + section.height / 2 + 7);
        }
        const depths = section.rows.flatMap((row) => row.kind === "unit"
          ? [finiteOrNull(row.unit.depthUm ?? row.unit.depth)]
          : [row.minimumDepth, row.maximumDepth]).filter((value) => value != null);
        if (depths.length) {
          context.fillStyle = colors.muted;
          context.font = '550 8px "Cascadia Mono", Consolas, monospace';
          context.textBaseline = "top";
          context.fillText(String(Math.round(Math.min(...depths))), 51, section.y + 3);
          if (section.height >= 28) {
            context.textBaseline = "bottom";
            context.fillText(String(Math.round(Math.max(...depths))), 51, section.y + section.height - 3);
          }
        }
        context.strokeStyle = colors.line;
        context.beginPath();
        context.moveTo(43, section.y + .5);
        context.lineTo(GUTTER_WIDTH, section.y + .5);
        context.stroke();
      });

      this.rowGeometry.forEach(({ row, y, height, expanded }) => {
        const middle = y + Math.min(height, expanded ? 31 : height) / 2;
        const selected = row.kind === "unit" && Number(row.unit.id) === finiteOrNull(this.state.selectedUnitId);
        const groupSelected = row.kind === "aggregate" && row.key === this.state.selectedGroupKey;
        context.textBaseline = "middle";
        context.fillStyle = selected ? colors.accentStrong : row.kind === "aggregate" ? colors.warn : colors.soft;
        context.font = `${selected ? 700 : 620} ${selected ? 10 : 9}px "Cascadia Mono", Consolas, monospace`;
        if (row.kind === "aggregate") {
          context.fillText(`◇ ${row.count} ${row.count === 1 ? "Unit" : "Units"}`, 190, middle - (height >= 30 ? 5 : 0));
          if (height >= 30) {
            context.fillStyle = colors.muted;
            context.font = '550 7px "Cascadia Mono", Consolas, monospace';
            const depth = row.minimumDepth == null ? "depth —" : `${Math.round(row.minimumDepth)}–${Math.round(row.maximumDepth)} µm`;
            context.fillText(depth, 190, middle + 7);
          }
        } else {
          context.fillText(`Unit ${Number(row.unit.id)}`, 190, middle - (expanded ? 5 : 0));
          if (expanded) {
            context.fillStyle = colors.muted;
            context.font = '550 8px "Cascadia Mono", Consolas, monospace';
            context.fillText(unitRegion(row.unit), 190, middle + 8);
          } else if (unitRegion(row.unit) === "Unmapped") {
            context.strokeStyle = colors.muted;
            context.strokeRect(181.5, middle - 2.5, 4, 4);
          }
        }
        if (selected || groupSelected) {
          context.strokeStyle = colors.accentStrong;
          context.lineWidth = 1.5;
          context.strokeRect(1, y + 1, GUTTER_WIDTH - 2, height - 2);
          context.fillStyle = colors.accentStrong;
          context.beginPath();
          context.moveTo(44, middle);
          context.lineTo(50, middle - 4);
          context.lineTo(50, middle + 4);
          context.closePath();
          context.fill();
        }
      });

      context.strokeStyle = colors.lineStrong;
      [43.5, 93.5, 180.5, GUTTER_WIDTH - .5].forEach((x) => {
        context.beginPath();
        context.moveTo(x, bodyTop);
        context.lineTo(x, bodyBottom);
        context.stroke();
      });
      context.restore();
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
        const scaled = Math.pow(value / 255, row.kind === "aggregate" ? .72 : .88);
        const alpha = row.kind === "aggregate" ? .025 + scaled * .76 : .02 + scaled * .62;
        context.fillStyle = row.kind === "aggregate"
          ? `rgba(209,173,114,${alpha.toFixed(3)})`
          : `rgba(159,198,241,${alpha.toFixed(3)})`;
        context.fillRect(x0, y + 2, Math.max(1, x1 - x0 + .2), Math.max(1, textureHeight - 4));
      }
      if (row.kind === "aggregate") {
        context.strokeStyle = "rgba(209,173,114,.18)";
        context.setLineDash([2, 5]);
        context.beginPath();
        context.moveTo(plotLeft, y + textureHeight - 2.5);
        context.lineTo(this.width, y + textureHeight - 2.5);
        context.stroke();
        context.setLineDash([]);
      }
    }

    _drawExpandedSpikes(context, colors, geometry) {
      const { row, y, height } = geometry;
      const unit = row.unit;
      const plotLeft = GUTTER_WIDTH;
      const plotWidth = Math.max(1, this.width - plotLeft);
      const rangeStart = Number(this.state.visibleRange.start);
      const rangeEnd = Number(this.state.visibleRange.end);
      const span = Math.max(.000001, rangeEnd - rangeStart);
      const top = y + 31;
      context.fillStyle = "rgba(0,0,0,.16)";
      context.fillRect(plotLeft, top, plotWidth, height - 33);
      context.fillStyle = colors.accentStrong;
      context.font = '650 10px "Cascadia Mono", Consolas, monospace';
      context.fillText(formatIdentity(unit), plotLeft + 9, y + 15);
      const left = lowerBound(this.selectedSpikeTimes, rangeStart);
      const right = lowerBound(this.selectedSpikeTimes, rangeEnd + Number.EPSILON);
      const visibleSpikes = right - left;
      const mode = temporalDetailMode(span, plotWidth, visibleSpikes);

      if (mode === "individual spikes") {
        context.strokeStyle = colors.accentStrong;
        context.globalAlpha *= .84;
        context.beginPath();
        for (let index = left; index < right; index += 1) {
          const x = plotLeft + (Number(this.selectedSpikeTimes[index]) - rangeStart) / span * plotWidth;
          context.moveTo(x, top + 8);
          context.lineTo(x, y + height - 10);
        }
        context.stroke();
        context.globalAlpha = 1;
      } else if (this.selectedRateBins.length) {
        const rateDuration = Math.max(.000001, this.selectedDuration || this.data.duration);
        const values = [];
        for (let index = 0; index < this.selectedRateBins.length; index += 1) {
          const time = index / this.selectedRateBins.length * rateDuration;
          if (time >= rangeStart && time <= rangeEnd) values.push(Number(this.selectedRateBins[index] || 0));
        }
        const positive = values.filter((value) => value > 0).sort((a, b) => a - b);
        const robustMaximum = positive.length ? positive[Math.floor((positive.length - 1) * .95)] : 1;
        context.beginPath();
        context.moveTo(plotLeft, y + height - 9);
        let points = 0;
        for (let index = 0; index < this.selectedRateBins.length; index += 1) {
          const time = index / this.selectedRateBins.length * rateDuration;
          if (time < rangeStart || time > rangeEnd) continue;
          const x = plotLeft + (time - rangeStart) / span * plotWidth;
          const normalized = Math.min(1, Number(this.selectedRateBins[index] || 0) / Math.max(1, robustMaximum));
          const lineHeight = normalized * (height - 51);
          context.lineTo(x, y + height - 9 - lineHeight);
          points += 1;
        }
        if (points) {
          context.lineTo(this.width, y + height - 9);
          context.closePath();
          context.fillStyle = mode === "recording density" ? "rgba(159,198,241,.18)" : "rgba(159,198,241,.24)";
          context.fill();
          context.strokeStyle = "rgba(193,221,251,.66)";
          context.stroke();
        }
      }
      context.fillStyle = colors.muted;
      context.font = '550 8px "Cascadia Mono", Consolas, monospace';
      context.textAlign = "right";
      context.fillText(`${visibleSpikes} spikes · ${mode}`, this.width - 9, y + height - 5);
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
      context.fillStyle = "rgba(103,155,207,.07)";
      context.fillRect(left, HEADER_HEIGHT, Math.max(1, right - left), this.height - HEADER_HEIGHT - AXIS_HEIGHT);
      context.strokeStyle = "rgba(159,198,241,.58)";
      context.beginPath();
      context.moveTo(left + .5, HEADER_HEIGHT);
      context.lineTo(left + .5, this.height - AXIS_HEIGHT);
      context.moveTo(right + .5, HEADER_HEIGHT);
      context.lineTo(right + .5, this.height - AXIS_HEIGHT);
      context.stroke();
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
        const groupFocusPath = [...(row.ancestors || []), row.key];
        this._emitState({ selectedGroupKey: row.key, groupFocusPath, selectedUnitId: null, expandedUnitId: null, selectedShank: row.shankId, selectedRegion: row.region, cursorTime: time });
        this.callbacks.onAggregateSelect?.(row);
        this.callbacks.onCursorCommit?.(time);
        return;
      }
      const id = Number(row.unit.id);
      this._emitState({ selectedUnitId: id, expandedUnitId: id, selectedGroupKey: null, groupFocusPath: [], selectedShank: finiteOrNull(row.unit.shankId), selectedRegion: row.unit.region || "Unmapped", cursorTime: time });
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
        this._emitState({ selectedInterval: null, selectedUnitId: null, expandedUnitId: null, selectedGroupKey: null, groupFocusPath: [], selectedShank: null, selectedRegion: null });
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
        : `Anatomical group · ${row.count} Units · ${row.shankId == null ? "Shank —" : `Shank ${row.shankId + 1}`} · ${row.minimumDepth == null ? "depth unavailable" : `${Math.round(row.minimumDepth)}–${Math.round(row.maximumDepth)} µm`} · ${row.region} ${row.regionSource === "probe-track" ? "probe track" : "unit mapping"} · activity = fraction above each Unit's own p90`;
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
    overviewRowTarget,
    anatomicalGroups,
    anatomyBoundaryKey,
    temporalDetailMode,
    buildDisplayRows,
    formatIdentity,
    ActivityAnatomyCanvas
  };
});
