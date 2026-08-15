((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelProbeView = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const PROBE_COLORS = ["#66A6D9", "#E5A14F", "#60B98C", "#B98BD4", "#D46F7E", "#85A869"];
  const NON_NEURAL = new Set(["out", "void"]);
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

  function regionColor(value, fallback = "#9fc6f1") {
    const text = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) return text;
    if (/^[0-9a-f]{6}$/i.test(text)) return `#${text}`;
    return fallback;
  }

  function displayRegionColor(segment) {
    const raw = regionColor(segment?.color, "#65717c");
    if (raw.toLowerCase() === "#000000") return "#4b535b";
    if (raw.toLowerCase() === "#ffffff") return "#aab3bc";
    return raw;
  }

  function experimentOf(recording) {
    const direct = finite(recording?.experiment ?? recording?.experimentNumber ?? recording?.number);
    if (direct != null) return direct;
    const match = String(recording?.name || "").match(/exp(?:eriment)?[_\-\s]*(\d+)/i);
    return match ? Number(match[1]) : null;
  }

  class ProbeViewer {
    constructor(elements, onUnitSelect = null, onRegionSelect = null) {
      this.elements = elements;
      this.onUnitSelect = onUnitSelect;
      this.onRegionSelect = onRegionSelect;
      this.items = [];
      this.focusedKey = null;
      this.locations = [];
      this.recording = null;
      this.geometry = new Float32Array(0);
      this.channelProbeIds = new Int16Array(0);
      this.probeIds = [];
      this.regionTrack = null;
      this.visibleSegments = [];
      this.hitTargets = [];
      this.segmentHitTargets = [];
      this.hoveredSegment = null;
      this.selectedSegment = null;
      this.layout = null;
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(elements.canvas);
      elements.canvas.addEventListener("click", (event) => this.handleCanvasClick(event));
      elements.canvas.addEventListener("contextmenu", (event) => this.handleCanvasContextMenu(event));
      elements.canvas.addEventListener("pointermove", (event) => this.handleCanvasMove(event));
      elements.canvas.addEventListener("pointerleave", () => this.clearHover());
      elements.nearbyList?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-cluster-id]");
        if (button) this.selectUnit(Number(button.dataset.clusterId), "nearby", event);
      });
      elements.nearbyList?.addEventListener("contextmenu", (event) => {
        const button = event.target.closest("[data-cluster-id]");
        if (!button) return;
        event.preventDefault();
        this.selectUnit(Number(button.dataset.clusterId), "nearby", event);
      });
      this.clear();
    }

    setUnits(items, focusedKey, probeTrack = null) {
      this.items = (items || []).filter((item) => item?.result && item?.recording).map((item) => ({ ...item, clusterId: Number(item.clusterId) }));
      this.focusedKey = focusedKey;
      const focused = this.items.find((item) => item.key === focusedKey) || this.items[0];
      this.recording = focused?.recording || null;
      const recordingKey = this.recording?.key;
      this.items = this.items.filter((item) => item.recording?.key === recordingKey);
      this.geometry = focused?.result?.channelGeometry || new Float32Array(0);
      this.channelProbeIds = focused?.result?.channelProbeIds || new Int16Array(0);
      const probeIds = new Set();
      for (let index = 0; index < this.channelProbeIds.length; index += 1) {
        if (this.channelProbeIds[index] >= 0) probeIds.add(Number(this.channelProbeIds[index]));
      }
      this.probeIds = [...probeIds].sort((left, right) => left - right);
      if (!this.probeIds.length && this.geometry.length) this.probeIds = [0];
      const rawLocations = focused?.result?.unitLocations || [];
      this.locations = rawLocations.map((location) => ({
        ...location,
        id: Number(location.id),
        physicalProbeId: finite(location.physicalProbeId) ?? this.probeIds[0] ?? 0,
        region: focused.locationRegion?.(Number(location.id)) || null,
        label: focused.locationLabel?.(Number(location.id)) || null
      })).filter((location) => finite(location.y) != null);
      this.regionTrack = probeTrack?.valid ? probeTrack : null;
      const experiment = experimentOf(this.recording);
      this.visibleSegments = (this.regionTrack?.segments || []).filter((segment) => {
        const experimentMatches = segment.experiment == null || experiment == null || Number(segment.experiment) === Number(experiment);
        return experimentMatches && this.probeIds.includes(Number(segment.probeId));
      });
      this.selectedSegment = null;
      this.hoveredSegment = null;
      this.updateTrackStatus();
      this.elements.count.textContent = this.probeIds.length
        ? `${this.probeIds.length} physical Probe${this.probeIds.length === 1 ? "" : "s"} · ${this.visibleSegments.length ? "region track ready" : `${this.items.length} Unit${this.items.length === 1 ? "" : "s"} open`}`
        : "Probe grouping unavailable";
      this.renderLegend();
      this.renderNearby([], null, null);
      if (!focused) {
        this.clearReadout();
        this.draw();
        return;
      }
      this.renderReadout(focused);
      this.draw();
    }

    updateTrackStatus() {
      if (!this.elements.trackStatus) return;
      if (!this.regionTrack) {
        this.elements.trackStatus.className = "mapping-contract-state missing";
        this.elements.trackStatus.textContent = "No compatible Probe-region mapping";
        return;
      }
      this.elements.trackStatus.className = "mapping-contract-state ready";
      this.elements.trackStatus.textContent = `${this.regionTrack.source} · ${this.regionTrack.rowCount.toLocaleString()} electrode rows · ${this.regionTrack.probeCount} Probes`;
    }

    renderReadout(focused) {
      const { result, recording, clusterId, region } = focused;
      const position = result.peakChannelPosition || { x: finite(result.meanX), y: finite(result.meanDepth) };
      const physicalProbeId = finite(result.physicalProbeId);
      const trackRegion = physicalProbeId == null || finite(position?.y) == null ? null : this.regionAt(physicalProbeId, finite(position.y));
      const resolvedRegion = region?.region ? region : trackRegion ? { region: trackRegion.region, color: trackRegion.color, source: this.regionTrack?.source } : null;
      this.elements.unit.textContent = `Unit ${clusterId} · ${recording.name}`;
      this.elements.region.textContent = resolvedRegion?.region || "UNMAPPED";
      this.elements.region.style.setProperty("--region-color", regionColor(resolvedRegion?.color || focused.color, "#59616a"));
      this.elements.physical.textContent = physicalProbeId == null ? "Unavailable" : `Probe ${physicalProbeId + 1}`;
      this.elements.channel.textContent = result.peakChannel == null ? "Unavailable" : String(result.peakChannel);
      this.elements.x.textContent = finite(position?.x) == null ? "Unavailable" : `${finite(position.x).toFixed(1)} µm`;
      this.elements.depth.textContent = finite(position?.y) == null ? "Unavailable" : `${finite(position.y).toFixed(1)} µm`;
      this.elements.source.textContent = resolvedRegion?.source || "No compatible region row";
      this.elements.note.textContent = this.regionTrack
        ? `Atlas-colored bands come from ${this.regionTrack.source}. Unit markers keep the same color as their signal; the focused Unit has a white halo.`
        : `${this.probeIds.length || 0} physical Probe group${this.probeIds.length === 1 ? "" : "s"} detected. Add a compatible Probe-region CSV to draw anatomical bands.`;
    }

    clearReadout() {
      this.elements.unit.textContent = "No Unit selected";
      this.elements.region.textContent = "UNMAPPED";
      this.elements.region.style.setProperty("--region-color", "#59616a");
      this.elements.physical.textContent = "—";
      this.elements.channel.textContent = "—";
      this.elements.x.textContent = "—";
      this.elements.depth.textContent = "—";
      this.elements.source.textContent = "—";
      this.elements.note.textContent = "Select a Unit or click a Probe marker to inspect the linked signal.";
    }

    renderLegend() {
      if (typeof document === "undefined") return;
      this.elements.legend.replaceChildren(...this.items.map((item) => {
        const row = document.createElement("div");
        row.className = "probe-legend-item";
        row.dataset.viewKey = item.key;
        row.tabIndex = 0;
        row.classList.toggle("focused", item.key === this.focusedKey);
        row.style.setProperty("--unit-color", regionColor(item.color));
        const dot = document.createElement("i");
        const title = document.createElement("strong");
        const description = document.createElement("span");
        title.textContent = `Unit ${item.clusterId}`;
        description.textContent = `Probe ${Number(item.result.physicalProbeId ?? 0) + 1} · ${item.region?.region || "unmapped"}`;
        row.append(dot, title, description);
        return row;
      }));
    }

    renderNearby(locations, targetDepth, segment) {
      if (!this.elements.nearbyList) return;
      this.elements.nearbyContext.textContent = targetDepth == null
        ? "Click a Probe position"
        : `${segment?.region ? `${segment.region} · ` : ""}${targetDepth.toFixed(0)} µm`;
      if (!locations.length) {
        this.elements.nearbyList.innerHTML = '<p class="nearby-empty">No nearby Unit selected</p>';
        return;
      }
      this.elements.nearbyList.innerHTML = locations.map((location) => {
        const distance = Math.abs(Number(location.y) - Number(targetDepth));
        const quality = location.label?.quality || "unknown";
        const region = location.region?.region || this.regionAt(location.physicalProbeId, location.y)?.region || "unmapped";
        return `<button type="button" data-cluster-id="${location.id}"><span><strong>Unit ${location.id}</strong><em>${quality} · ${region}</em></span><b>${distance.toFixed(0)} µm</b></button>`;
      }).join("");
    }

    clear() {
      this.items = [];
      this.locations = [];
      this.focusedKey = null;
      this.recording = null;
      this.geometry = new Float32Array(0);
      this.channelProbeIds = new Int16Array(0);
      this.probeIds = [];
      this.regionTrack = null;
      this.visibleSegments = [];
      this.hitTargets = [];
      this.segmentHitTargets = [];
      this.selectedSegment = null;
      this.hoveredSegment = null;
      this.elements.count.textContent = "No Probe data";
      this.elements.legend.replaceChildren();
      this.updateTrackStatus();
      this.clearReadout();
      this.renderNearby([], null, null);
      this.hideTooltip();
      this.draw();
    }

    selectUnit(clusterId, source, event = null) {
      if (!this.recording || !Number.isFinite(Number(clusterId))) return;
      this.onUnitSelect?.({
        recording: this.recording,
        clusterId: Number(clusterId),
        source,
        additive: Boolean(event?.ctrlKey || event?.metaKey),
        contextMenu: event?.type === "contextmenu",
        clientX: Number(event?.clientX || 0),
        clientY: Number(event?.clientY || 0)
      });
    }

    focusUnit(key) {
      const focused = this.items.find((item) => item.key === key);
      if (!focused) return false;
      this.focusedKey = key;
      this.renderLegend();
      this.renderReadout(focused);
      this.draw();
      return true;
    }

    regionAt(probeId, depth) {
      return this.visibleSegments.find((segment) => Number(segment.probeId) === Number(probeId)
        && Number(depth) >= Number(segment.startDepthUm) && Number(depth) <= Number(segment.endDepthUm)) || null;
    }

    canvasPosition(event) {
      const rectangle = this.elements.canvas.getBoundingClientRect();
      return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
    }

    segmentAt(x, y) {
      return this.segmentHitTargets.find((target) => x >= target.left && x <= target.right && y >= target.top && y <= target.bottom) || null;
    }

    handleCanvasMove(event) {
      if (!this.layout) return;
      const { x, y } = this.canvasPosition(event);
      const segmentTarget = this.segmentAt(x, y);
      const next = segmentTarget?.segment || null;
      if (next !== this.hoveredSegment) {
        this.hoveredSegment = next;
        this.draw();
      }
      if (!next) {
        this.hideTooltip();
        return;
      }
      const panel = this.layout.panels.find((candidate) => Number(candidate.probeId) === Number(next.probeId));
      const ratio = clamp((y - this.layout.top) / Math.max(1, this.layout.bottom - this.layout.top), 0, 1);
      const depth = this.layout.maximumY - ratio * (this.layout.maximumY - this.layout.minimumY);
      this.showTooltip(x, y, `Probe ${Number(panel.probeId) + 1} · ${next.region} · ${depth.toFixed(0)} µm`);
    }

    clearHover() {
      if (this.hoveredSegment) {
        this.hoveredSegment = null;
        this.draw();
      }
      this.hideTooltip();
    }

    showTooltip(x, y, text) {
      if (!this.elements.tooltip) return;
      this.elements.tooltip.textContent = text;
      this.elements.tooltip.hidden = false;
      const canvas = this.elements.canvas;
      const maxLeft = Math.max(8, canvas.clientWidth - this.elements.tooltip.offsetWidth - 8);
      const maxTop = Math.max(8, canvas.clientHeight - this.elements.tooltip.offsetHeight - 8);
      this.elements.tooltip.style.left = `${clamp(x + 12, 8, maxLeft)}px`;
      this.elements.tooltip.style.top = `${clamp(y + 12, 8, maxTop)}px`;
    }

    hideTooltip() {
      if (this.elements.tooltip) this.elements.tooltip.hidden = true;
    }

    handleCanvasClick(event) {
      if (!this.layout || !this.probeIds.length) return;
      const { x, y } = this.canvasPosition(event);
      let closest = null;
      this.hitTargets.forEach((target) => {
        const distance = Math.hypot(target.x - x, target.y - y);
        if (distance <= 7 && (!closest || distance < closest.distance)) closest = { ...target, distance };
      });
      if (closest) {
        this.selectUnit(closest.clusterId, "marker", event);
        return;
      }
      const panel = this.layout.panels.find((candidate) => x >= candidate.left && x <= candidate.right && y >= this.layout.top && y <= this.layout.bottom);
      if (!panel) return;
      const ratio = clamp((y - this.layout.top) / Math.max(1, this.layout.bottom - this.layout.top), 0, 1);
      const depth = this.layout.maximumY - ratio * (this.layout.maximumY - this.layout.minimumY);
      const segment = this.regionAt(panel.probeId, depth);
      this.selectedSegment = segment;
      const nearby = this.locations.filter((location) => Number(location.physicalProbeId) === Number(panel.probeId))
        .sort((left, right) => Math.abs(left.y - depth) - Math.abs(right.y - depth)).slice(0, 5);
      this.renderNearby(nearby, depth, segment);
      this.onRegionSelect?.({ recording: this.recording, probeId: panel.probeId, depth, segment, source: "probe-position" });
      this.draw();
    }

    handleCanvasContextMenu(event) {
      if (!this.layout || !this.probeIds.length) return;
      const { x, y } = this.canvasPosition(event);
      let closest = null;
      this.hitTargets.forEach((target) => {
        const distance = Math.hypot(target.x - x, target.y - y);
        if (distance <= 7 && (!closest || distance < closest.distance)) closest = { ...target, distance };
      });
      if (!closest) return;
      event.preventDefault();
      this.selectUnit(closest.clusterId, "marker", event);
    }

    draw() {
      const canvas = this.elements.canvas;
      const rectangle = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rectangle.width));
      const height = Math.max(1, Math.round(rectangle.height));
      const ratio = Math.max(1, globalThis.devicePixelRatio || 1);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "#0d0f11";
      context.fillRect(0, 0, width, height);
      this.hitTargets = [];
      this.segmentHitTargets = [];
      if (!this.geometry.length || !this.probeIds.length) {
        context.fillStyle = "#68727d";
        context.font = '10px "Cascadia Mono", Consolas, monospace';
        context.textAlign = "center";
        context.fillText(this.items.length ? "Physical Probe grouping unavailable" : "Select a Unit", width / 2, height / 2);
        return;
      }

      let minimumY = Infinity;
      let maximumY = -Infinity;
      for (let index = 1; index < this.geometry.length; index += 2) {
        minimumY = Math.min(minimumY, this.geometry[index]);
        maximumY = Math.max(maximumY, this.geometry[index]);
      }
      if (maximumY <= minimumY) maximumY = minimumY + 1;
      const top = 38;
      const bottom = height - 24;
      const outer = 8;
      const gap = 7;
      const panelWidth = Math.max(20, (width - outer * 2 - gap * (this.probeIds.length - 1)) / this.probeIds.length);
      const panels = this.probeIds.map((probeId, index) => ({
        probeId,
        left: outer + index * (panelWidth + gap),
        right: outer + index * (panelWidth + gap) + panelWidth,
        accent: PROBE_COLORS[index % PROBE_COLORS.length]
      }));
      this.layout = { panels, top, bottom, minimumY, maximumY };
      const yFor = (value) => top + (maximumY - clamp(Number(value), minimumY, maximumY)) / (maximumY - minimumY) * (bottom - top);

      context.font = '10px "Cascadia Mono", Consolas, monospace';
      panels.forEach((panel) => {
        const channels = [];
        for (let channel = 0; channel < this.geometry.length / 2; channel += 1) {
          const probeId = this.channelProbeIds.length ? Number(this.channelProbeIds[channel]) : this.probeIds[0];
          if (probeId === panel.probeId) channels.push(channel);
        }
        const locationCount = this.locations.filter((location) => Number(location.physicalProbeId) === Number(panel.probeId)).length;
        context.fillStyle = panel.accent;
        context.fillRect(panel.left, 2, panel.right - panel.left, 2);
        context.fillStyle = "#b7c0ca";
        context.textAlign = "center";
        context.fillText(`PROBE ${Number(panel.probeId) + 1}`, (panel.left + panel.right) / 2, 16);
        context.fillStyle = "#63707c";
        context.font = '9px "Cascadia Mono", Consolas, monospace';
        context.fillText(`${locationCount} UNITS`, (panel.left + panel.right) / 2, 30);
        context.fillStyle = "#11161a";
        context.fillRect(panel.left, top, panel.right - panel.left, bottom - top);

        const panelSegments = this.visibleSegments.filter((segment) => Number(segment.probeId) === Number(panel.probeId)
          && Number(segment.endDepthUm) >= minimumY && Number(segment.startDepthUm) <= maximumY);
        panelSegments.forEach((segment) => {
          const segmentTop = yFor(segment.endDepthUm);
          const segmentBottom = yFor(segment.startDepthUm);
          const segmentHeight = Math.max(1, segmentBottom - segmentTop);
          const isHovered = segment === this.hoveredSegment;
          const isSelected = segment === this.selectedSegment;
          const color = displayRegionColor(segment);
          context.globalAlpha = NON_NEURAL.has(String(segment.region).toLowerCase()) ? .12 : isHovered || isSelected ? .38 : .24;
          context.fillStyle = color;
          context.fillRect(panel.left + 1, segmentTop, panel.right - panel.left - 2, segmentHeight);
          context.globalAlpha = 1;
          context.strokeStyle = isSelected ? "#f1f5f8" : isHovered ? color : "rgba(255,255,255,.08)";
          context.lineWidth = isSelected ? 1.5 : 1;
          context.beginPath();
          context.moveTo(panel.left + 1, Math.round(segmentTop) + .5);
          context.lineTo(panel.right - 1, Math.round(segmentTop) + .5);
          context.stroke();
          if (segmentHeight >= 13 && panelWidth >= 38 && !NON_NEURAL.has(String(segment.region).toLowerCase())) {
            context.fillStyle = "rgba(233,238,243,.78)";
            context.font = '8px "Cascadia Mono", Consolas, monospace';
            context.textAlign = "center";
            const label = String(segment.region).length > 8 ? `${String(segment.region).slice(0, 7)}…` : String(segment.region);
            context.fillText(label, (panel.left + panel.right) / 2, segmentTop + Math.min(segmentHeight - 3, 10));
          }
          this.segmentHitTargets.push({ left: panel.left, right: panel.right, top: segmentTop, bottom: segmentBottom, segment });
        });

        context.strokeStyle = panel.accent;
        context.globalAlpha = .46;
        context.strokeRect(panel.left + .5, top + .5, panel.right - panel.left - 1, bottom - top - 1);
        context.globalAlpha = 1;
        context.fillStyle = "#788590";
        channels.forEach((channel) => {
          const x = this.geometry[channel * 2];
          const channelX = panel.left + 6 + (Number(x) > 16 ? panelWidth - 12 : 0);
          context.fillRect(Math.round(channelX - 1), Math.round(yFor(this.geometry[channel * 2 + 1])), 3, 1);
        });
        context.font = '9px "Cascadia Mono", Consolas, monospace';
      });

      const openById = new Map(this.items.map((item) => [Number(item.clusterId), item]));
      const focused = this.items.find((item) => item.key === this.focusedKey) || this.items[0];
      this.locations.forEach((location) => {
        const panel = panels.find((candidate) => Number(candidate.probeId) === Number(location.physicalProbeId));
        if (!panel) return;
        const open = openById.get(Number(location.id));
        const isFocused = Boolean(focused && Number(focused.clusterId) === Number(location.id));
        const x = (panel.left + panel.right) / 2;
        const y = yFor(location.y);
        const trackRegion = this.regionAt(location.physicalProbeId, location.y);
        const color = regionColor(open?.color || location.region?.color || trackRegion?.color, "#89939d");
        context.globalAlpha = isFocused ? 1 : open ? .9 : .48;
        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, isFocused ? 6 : open ? 4 : 2.3, 0, Math.PI * 2);
        context.fill();
        if (isFocused) {
          context.strokeStyle = "#ffffff";
          context.lineWidth = 2;
          context.stroke();
          context.strokeStyle = color;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(panel.left, Math.round(y) + .5);
          context.lineTo(panel.right, Math.round(y) + .5);
          context.stroke();
        }
        context.globalAlpha = 1;
        this.hitTargets.push({ x, y, clusterId: Number(location.id) });
      });

      context.fillStyle = "#64717e";
      context.font = '9px "Cascadia Mono", Consolas, monospace';
      context.textAlign = "left";
      context.fillText(`${maximumY.toFixed(0)} µm`, outer, height - 7);
      context.textAlign = "right";
      context.fillText(`${minimumY.toFixed(0)} µm`, width - outer, height - 7);
    }
  }

  return { ProbeViewer, regionColor, displayRegionColor, PROBE_COLORS, experimentOf };
});
