((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelProbeView = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const DEFAULT_PROBE_THEME = {
    background: "#0d0f11",
    emptyText: "#68727d",
    headerText: "#b7c0ca",
    mutedText: "#63707c",
    panel: "#11161a",
    bandText: "rgba(233,238,243,.78)",
    bandBoundary: "rgba(255,255,255,.07)",
    channel: "#d5dde5",
    unopened: "#7e8790",
    focus: "#ffffff",
    focusLine: "rgba(255,255,255,.72)",
    lockedLine: "rgba(255,255,255,.38)",
    hoverRing: "#bdc7d0",
    lockedRing: "#e9eef3",
    badgeBackground: "rgba(8,10,12,.94)",
    badgeBorder: "#78838d",
    badgeText: "#e0e5ea",
    labelBackground: "rgba(9,11,13,.94)",
    labelBorder: "rgba(255,255,255,.72)",
    labelText: "#f1f4f7",
    depthText: "#64717e",
    bandAlpha: .28,
    bandActiveAlpha: .42,
    nonNeuralAlpha: .12,
    probes: ["#66A6D9", "#E5A14F", "#60B98C", "#B98BD4", "#D46F7E", "#85A869"]
  };
  const PROBE_COLORS = [...DEFAULT_PROBE_THEME.probes];
  let PROBE_THEME = { ...DEFAULT_PROBE_THEME, probes: PROBE_COLORS };
  const ACTIVE_VIEWERS = new Set();
  const NON_NEURAL = new Set(["out", "void"]);
  const UNIT_HIT_RADIUS = 10;
  const UNIT_GROUP_DISTANCE = 9;
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const finite = (value) => value == null || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const shankIdOf = (value) => finite(value?.shankId ?? value?.physicalProbeId);

  function setProbeTheme(theme = {}) {
    const probes = Array.isArray(theme?.probes) && theme.probes.length ? [...theme.probes] : [...DEFAULT_PROBE_THEME.probes];
    PROBE_COLORS.splice(0, PROBE_COLORS.length, ...probes);
    PROBE_THEME = { ...DEFAULT_PROBE_THEME, ...(theme || {}), probes: PROBE_COLORS };
    ACTIVE_VIEWERS.forEach((viewer) => viewer.draw());
    return { ...PROBE_THEME, probes: [...PROBE_COLORS] };
  }

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

  function recordingIdentity(recording) {
    return String(recording?.key || recording?.name || "");
  }

  function groupUnitMarkers(markers, threshold = UNIT_GROUP_DISTANCE) {
    const groups = [];
    const sorted = [...(markers || [])].sort((left, right) => Number(left.probeId) - Number(right.probeId) || Number(left.y) - Number(right.y) || Number(left.location?.id) - Number(right.location?.id));
    sorted.forEach((marker) => {
      const current = groups.at(-1);
      if (current && Number(current.probeId) === Number(marker.probeId) && Math.abs(Number(marker.y) - Number(current.y)) <= threshold) {
        current.markers.push(marker);
        current.x = current.markers.reduce((sum, item) => sum + Number(item.x), 0) / current.markers.length;
        current.y = current.markers.reduce((sum, item) => sum + Number(item.y), 0) / current.markers.length;
      } else {
        groups.push({ probeId: Number(marker.probeId), x: Number(marker.x), y: Number(marker.y), markers: [marker] });
      }
    });
    return groups;
  }

  function nearestUnitTarget(targets, x, y, radius = UNIT_HIT_RADIUS) {
    let closest = null;
    (targets || []).forEach((target) => {
      const distance = Math.hypot(Number(target.x) - Number(x), Number(target.y) - Number(y));
      if (distance <= radius && (!closest || distance < closest.distance)) closest = { ...target, distance };
    });
    return closest;
  }

  function unitInteraction(clusterId, source, event = null) {
    return {
      clusterId: Number(clusterId),
      source,
      additive: Boolean(event?.ctrlKey || event?.metaKey),
      contextMenu: event?.type === "contextmenu",
      clientX: Number(event?.clientX || 0),
      clientY: Number(event?.clientY || 0)
    };
  }

  class ProbeViewer {
    constructor(elements, onUnitSelect = null, onRegionSelect = null) {
      this.elements = elements;
      this.t = (key, values = {}) => ({
        "probe.noData": "No Probe data", "probe.noTrack": "No compatible Probe-region mapping", "review.noSelected": "No Unit selected",
        "probe.unmapped": "UNMAPPED", "probe.selectNote": "Select a Unit or click a Probe marker to inspect the linked signal.",
        "probe.clickPosition": "Click a Probe position", "probe.noNearby": "No nearby Unit selected", "units.unmapped": "unmapped",
        "probe.groupUnavailable": "Shank data unavailable", "probe.probeShank": `Probe ${values.probe} · Shank ${values.shank}`,
        "probe.shankShort": `SHANK ${values.shank}`, "probe.unitCountShort": `${values.count} UNITS`
      }[key] || String(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ""));
      this.onUnitSelect = onUnitSelect;
      this.onRegionSelect = onRegionSelect;
      this.items = [];
      this.focusedKey = null;
      this.locations = [];
      this.recording = null;
      this.geometry = new Float32Array(0);
      this.channelShankIds = new Int16Array(0);
      this.shankIds = [];
      this.regionTrack = null;
      this.visibleSegments = [];
      this.hitTargets = [];
      this.segmentHitTargets = [];
      this.hoveredTargetKey = null;
      this.hoveredSegment = null;
      this.selectedSegment = null;
      this.lockedUnitId = null;
      this.lockedRecordingKey = null;
      this.layout = null;
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(elements.canvas);
      ACTIVE_VIEWERS.add(this);
      elements.canvas.addEventListener("click", (event) => this.handleCanvasClick(event));
      elements.canvas.addEventListener("contextmenu", (event) => this.handleCanvasContextMenu(event));
      elements.canvas.addEventListener("pointermove", (event) => this.handleCanvasMove(event));
      elements.canvas.addEventListener("pointerleave", () => this.clearHover());
      elements.canvas.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        this.clearLockedSelection();
      });
      elements.nearbyList?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-cluster-id]");
        if (!button) return;
        this.lockUnit(Number(button.dataset.clusterId));
        this.selectUnit(Number(button.dataset.clusterId), "nearby", event);
      });
      elements.nearbyList?.addEventListener("contextmenu", (event) => {
        const button = event.target.closest("[data-cluster-id]");
        if (!button) return;
        event.preventDefault();
        this.lockUnit(Number(button.dataset.clusterId));
        this.selectUnit(Number(button.dataset.clusterId), "nearby", event);
      });
      elements.stackList?.addEventListener("click", (event) => this.handleStackSelection(event));
      elements.stackList?.addEventListener("contextmenu", (event) => this.handleStackSelection(event));
      elements.stackMenu?.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        this.clearLockedSelection();
        elements.canvas.focus({ preventScroll: true });
      });
      if (typeof document !== "undefined") document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && (this.lockedUnitId != null || !this.elements.stackMenu?.hidden)) this.clearLockedSelection();
      });
      this.clear();
    }

    destroy() {
      this.resizeObserver.disconnect();
      ACTIVE_VIEWERS.delete(this);
    }

    setTranslator(translator) {
      if (typeof translator === "function") this.t = translator;
    }

    setUnits(items, focusedKey, probeTrack = null) {
      this.items = (items || []).filter((item) => item?.result && item?.recording).map((item) => ({ ...item, clusterId: Number(item.clusterId) }));
      this.focusedKey = focusedKey;
      const focused = this.items.find((item) => item.key === focusedKey) || this.items[0];
      this.recording = focused?.recording || null;
      const recordingKey = recordingIdentity(this.recording);
      this.items = this.items.filter((item) => recordingIdentity(item.recording) === recordingKey);
      this.geometry = focused?.result?.channelGeometry || new Float32Array(0);
      this.channelShankIds = focused?.result?.channelShankIds || focused?.result?.channelProbeIds || new Int16Array(0);
      const shankIds = new Set();
      for (let index = 0; index < this.channelShankIds.length; index += 1) {
        if (this.channelShankIds[index] >= 0) shankIds.add(Number(this.channelShankIds[index]));
      }
      this.shankIds = [...shankIds].sort((left, right) => left - right);
      if (!this.shankIds.length && this.geometry.length) this.shankIds = [0];
      const rawLocations = focused?.result?.unitLocations || [];
      this.locations = rawLocations.map((location) => ({
        ...location,
        id: Number(location.id),
        shankId: shankIdOf(location) ?? this.shankIds[0] ?? 0,
        region: focused.locationRegion?.(Number(location.id)) || null,
        label: focused.locationLabel?.(Number(location.id)) || null
      })).filter((location) => finite(location.y) != null);
      this.regionTrack = probeTrack?.valid ? probeTrack : null;
      const experiment = experimentOf(this.recording);
      this.visibleSegments = (this.regionTrack?.segments || []).filter((segment) => {
        const experimentMatches = segment.experiment == null || experiment == null || Number(segment.experiment) === Number(experiment);
        return experimentMatches && this.shankIds.includes(Number(segment.probeId));
      });
      if (this.recording && this.lockedRecordingKey && this.lockedRecordingKey !== recordingIdentity(this.recording)) this.clearLockedSelection({ draw: false });
      if (this.recording && this.lockedUnitId != null && !this.locations.some((location) => Number(location.id) === Number(this.lockedUnitId))) this.clearLockedSelection({ draw: false });
      this.selectedSegment = null;
      this.hoveredSegment = null;
      this.hoveredTargetKey = null;
      this.hideStackMenu();
      this.updateTrackStatus();
      this.elements.count.textContent = this.shankIds.length
        ? this.t("probe.count", { shanks: this.shankIds.length, status: this.visibleSegments.length ? this.t("probe.trackReady") : this.t("probe.openUnits", { count: this.items.length }) })
        : this.t("probe.groupingUnavailable");
      if (this.elements.groupMeta) this.elements.groupMeta.textContent = this.shankIds.length
        ? this.t("probe.groupSummary", { shanks: this.shankIds.length, units: this.locations.length })
        : this.t("probe.groupUnavailable");
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
        this.elements.trackStatus.textContent = this.t("probe.noTrack");
        return;
      }
      this.elements.trackStatus.className = "mapping-contract-state ready";
      this.elements.trackStatus.textContent = this.t("probe.trackStatus", { source: this.regionTrack.source, rows: this.regionTrack.rowCount.toLocaleString(), probes: this.regionTrack.probeCount });
    }

    renderReadout(focused) {
      const { result, recording, clusterId, region } = focused;
      const position = result.peakChannelPosition || { x: finite(result.meanX), y: finite(result.meanDepth) };
      const shankId = shankIdOf(result);
      const trackRegion = shankId == null || finite(position?.y) == null ? null : this.regionAt(shankId, finite(position.y));
      const resolvedRegion = region?.region ? region : trackRegion ? { region: trackRegion.region, color: trackRegion.color, source: this.regionTrack?.source } : null;
      this.elements.unit.textContent = this.t("probe.selected", { id: clusterId, recording: recording.name });
      this.elements.region.textContent = resolvedRegion?.region || this.t("probe.unmapped");
      this.elements.region.style.setProperty("--region-color", regionColor(resolvedRegion?.color || focused.color, "#59616a"));
      this.elements.physical.textContent = shankId == null ? this.t("probe.unavailable") : this.t("probe.probeShank", { probe: 1, shank: shankId + 1 });
      this.elements.channel.textContent = result.peakChannel == null ? this.t("probe.unavailable") : String(result.peakChannel);
      this.elements.x.textContent = finite(position?.x) == null ? this.t("probe.unavailable") : `${finite(position.x).toFixed(1)} \u00b5m`;
      this.elements.depth.textContent = finite(position?.y) == null ? this.t("probe.unavailable") : `${finite(position.y).toFixed(1)} \u00b5m`;
      this.elements.source.textContent = resolvedRegion?.source || this.t("probe.noRegionRow");
      this.elements.note.textContent = this.regionTrack
        ? this.t("probe.bandSource", { source: this.regionTrack.source })
        : this.t("probe.addTrackNote", { count: this.shankIds.length || 0 });
    }

    clearReadout() {
      this.elements.unit.textContent = this.t("review.noSelected");
      this.elements.region.textContent = this.t("probe.unmapped");
      this.elements.region.style.setProperty("--region-color", "#59616a");
      this.elements.physical.textContent = "—";
      this.elements.channel.textContent = "—";
      this.elements.x.textContent = "—";
      this.elements.depth.textContent = "—";
      this.elements.source.textContent = "—";
      this.elements.note.textContent = this.t("probe.selectNote");
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
        window.NeuropixelsUnitMarks?.bind(title,item.recording,item.clusterId);
        title.textContent = this.t("probe.unitLabel", { id: item.clusterId });
        description.textContent = `${this.t("probe.probeShank", { probe: 1, shank: (shankIdOf(item.result) ?? 0) + 1 })} · ${item.region?.region || this.t("units.unmapped")}`;
        row.append(dot, title, description);
        return row;
      }));
    }

    renderNearby(locations, targetDepth, segment) {
      if (!this.elements.nearbyList) return;
      this.elements.nearbyContext.textContent = targetDepth == null
        ? this.t("probe.clickPosition")
        : `${segment?.region ? `${segment.region} · ` : ""}${targetDepth.toFixed(0)} \u00b5m`;
      if (!locations.length) {
        this.elements.nearbyList.innerHTML = `<p class="nearby-empty">${this.t("probe.noNearby")}</p>`;
        return;
      }
      this.elements.nearbyList.innerHTML = locations.map((location) => {
        const distance = Math.abs(Number(location.y) - Number(targetDepth));
        const quality = location.label?.quality || "unknown";
        const region = this.regionForLocation(location)?.region || this.t("units.unmapped");
        return `<button type="button" data-cluster-id="${location.id}"><span><strong ${window.NeuropixelsUnitMarks?.attrs(this.recording,location.id)||''}>${this.t("probe.unitLabel", { id: location.id })}</strong><em>${quality} · ${region}</em></span><b>${distance.toFixed(0)} \u00b5m</b></button>`;
      }).join("");
    }

    clear() {
      this.items = [];
      this.locations = [];
      this.focusedKey = null;
      this.recording = null;
      this.geometry = new Float32Array(0);
      this.channelShankIds = new Int16Array(0);
      this.shankIds = [];
      this.regionTrack = null;
      this.visibleSegments = [];
      this.hitTargets = [];
      this.segmentHitTargets = [];
      this.selectedSegment = null;
      this.hoveredSegment = null;
      this.hoveredTargetKey = null;
      this.lockedUnitId = null;
      this.lockedRecordingKey = null;
      this.elements.count.textContent = this.t("probe.noData");
      if (this.elements.groupMeta) this.elements.groupMeta.textContent = this.t("probe.groupUnavailable");
      this.elements.legend.replaceChildren();
      this.updateTrackStatus();
      this.clearReadout();
      this.renderNearby([], null, null);
      this.hideStackMenu();
      this.hideTooltip();
      this.draw();
    }

    selectUnit(clusterId, source, event = null) {
      if (!this.recording || !Number.isFinite(Number(clusterId))) return;
      this.onUnitSelect?.({ recording: this.recording, ...unitInteraction(clusterId, source, event) });
    }

    focusUnit(key) {
      const focused = this.items.find((item) => item.key === key);
      if (!focused) return false;
      this.focusedKey = key;
      this.lockUnit(focused.clusterId, { draw: false });
      this.renderLegend();
      this.renderReadout(focused);
      this.draw();
      return true;
    }

    lockUnit(clusterId, { draw = true } = {}) {
      const location = this.locations.find((candidate) => Number(candidate.id) === Number(clusterId));
      if (!location) return false;
      this.lockedUnitId = Number(clusterId);
      this.lockedRecordingKey = recordingIdentity(this.recording) || null;
      this.selectedSegment = null;
      if (draw) this.draw();
      return true;
    }

    clearLockedSelection({ draw = true } = {}) {
      this.lockedUnitId = null;
      this.lockedRecordingKey = null;
      this.hoveredTargetKey = null;
      this.selectedSegment = null;
      this.hideStackMenu();
      this.hideTooltip();
      if (draw) this.draw();
    }

    regionAt(probeId, depth) {
      return this.visibleSegments.find((segment) => Number(segment.probeId) === Number(probeId)
        && Number(depth) >= Number(segment.startDepthUm) && Number(depth) <= Number(segment.endDepthUm)) || null;
    }

    regionForLocation(location) {
      return location?.region?.region ? location.region : this.regionAt(location?.shankId, location?.y);
    }

    focusedItem() {
      return this.items.find((item) => item.key === this.focusedKey) || this.items[0] || null;
    }

    targetKey(target) {
      return (target?.markers || []).map((marker) => Number(marker.location.id)).sort((left, right) => left - right).join(":");
    }

    canvasPosition(event) {
      const rectangle = this.elements.canvas.getBoundingClientRect();
      return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
    }

    segmentAt(x, y) {
      return this.segmentHitTargets.find((target) => x >= target.left && x <= target.right && y >= target.top && y <= target.bottom) || null;
    }

    targetAt(x, y) {
      return nearestUnitTarget(this.hitTargets, x, y);
    }

    unitDescription(location) {
      const region = this.regionForLocation(location)?.region || this.t("units.unmapped");
      const channel = finite(location?.peakChannel);
      return `${this.t("probe.unitLabel", { id: Number(location.id) })} · ${this.t("probe.probeShank", { probe: 1, shank: Number(location.shankId) + 1 })} · ${Number(location.y).toFixed(0)} \u00b5m · ${region} · ${channel == null ? this.t("probe.channelUnavailable") : `ch ${channel}`}`;
    }

    targetDescription(target) {
      if (!target?.markers?.length) return "";
      if (target.markers.length === 1) return this.unitDescription(target.markers[0].location);
      const depths = target.markers.map((marker) => Number(marker.location.y));
      const minimum = Math.min(...depths).toFixed(0);
      const maximum = Math.max(...depths).toFixed(0);
      return this.t("probe.overlapDescription", { count: target.markers.length, shank: Number(target.probeId) + 1, minimum, maximum });
    }

    handleCanvasMove(event) {
      if (!this.layout) return;
      const { x, y } = this.canvasPosition(event);
      const target = this.targetAt(x, y);
      const nextTargetKey = target ? this.targetKey(target) : null;
      const segmentTarget = target ? null : this.segmentAt(x, y);
      const nextSegment = segmentTarget?.segment || null;
      const changed = nextTargetKey !== this.hoveredTargetKey || nextSegment !== this.hoveredSegment;
      this.hoveredTargetKey = nextTargetKey;
      this.hoveredSegment = nextSegment;
      this.elements.canvas.style.cursor = target ? "pointer" : "default";
      if (changed) this.draw();
      else this.refreshTooltip(x, y);
    }

    clearHover() {
      const changed = Boolean(this.hoveredTargetKey || this.hoveredSegment);
      this.hoveredTargetKey = null;
      this.hoveredSegment = null;
      this.elements.canvas.style.cursor = "default";
      if (changed) this.draw();
      else this.refreshTooltip();
    }

    refreshTooltip(pointerX = null, pointerY = null) {
      const hovered = this.hitTargets.find((target) => this.targetKey(target) === this.hoveredTargetKey);
      if (hovered) {
        this.showTooltip(pointerX ?? hovered.x, pointerY ?? hovered.y, this.targetDescription(hovered), false);
        return;
      }
      if (this.hoveredSegment && pointerX != null && pointerY != null) {
        const panel = this.layout?.panels.find((candidate) => Number(candidate.probeId) === Number(this.hoveredSegment.probeId));
        if (panel) {
          const ratio = clamp((pointerY - this.layout.top) / Math.max(1, this.layout.bottom - this.layout.top), 0, 1);
          const depth = this.layout.maximumY - ratio * (this.layout.maximumY - this.layout.minimumY);
          this.showTooltip(pointerX, pointerY, `${this.t("probe.probeShank", { probe: 1, shank: Number(panel.probeId) + 1 })} · ${this.hoveredSegment.region} · ${depth.toFixed(0)} \u00b5m`, false);
          return;
        }
      }
      const lockedTarget = this.hitTargets.find((target) => target.markers.some((marker) => Number(marker.location.id) === Number(this.lockedUnitId)));
      const lockedMarker = lockedTarget?.markers.find((marker) => Number(marker.location.id) === Number(this.lockedUnitId));
      if (lockedTarget && lockedMarker) {
        this.showTooltip(lockedTarget.x, lockedTarget.y, this.unitDescription(lockedMarker.location), true);
        return;
      }
      this.hideTooltip();
    }

    showTooltip(x, y, text, locked = false) {
      if (!this.elements.tooltip) return;
      this.elements.tooltip.textContent = text;
      this.elements.tooltip.hidden = false;
      this.elements.tooltip.classList.toggle("locked", locked);
      const canvas = this.elements.canvas;
      const maxLeft = Math.max(8, canvas.clientWidth - this.elements.tooltip.offsetWidth - 8);
      const maxTop = Math.max(8, canvas.clientHeight - this.elements.tooltip.offsetHeight - 8);
      this.elements.tooltip.style.left = `${clamp(Number(x) + 12, 8, maxLeft)}px`;
      this.elements.tooltip.style.top = `${clamp(Number(y) + 12, 8, maxTop)}px`;
    }

    hideTooltip() {
      if (!this.elements.tooltip) return;
      this.elements.tooltip.hidden = true;
      this.elements.tooltip.classList.remove("locked");
    }

    showStackMenu(target) {
      const menu = this.elements.stackMenu;
      const list = this.elements.stackList;
      if (!menu || !list || !target?.markers?.length) return;
      const sorted = [...target.markers].sort((left, right) => {
        const leftFocused = left.isFocused ? 1 : 0;
        const rightFocused = right.isFocused ? 1 : 0;
        const leftOpen = left.open ? 1 : 0;
        const rightOpen = right.open ? 1 : 0;
        return rightFocused - leftFocused || rightOpen - leftOpen || Number(left.location.id) - Number(right.location.id);
      });
      if (this.elements.stackTitle) this.elements.stackTitle.textContent = this.t("probe.stackTitle", { count: sorted.length, shank: Number(target.probeId) + 1 });
      list.replaceChildren(...sorted.map((marker) => {
        const button = document.createElement("button");
        button.type = "button";
        button.role = "menuitem";
        button.dataset.clusterId = String(marker.location.id);
        button.classList.toggle("focused", marker.isFocused);
        button.style.setProperty("--unit-color", marker.open ? marker.color : PROBE_THEME.unopened);
        const body = document.createElement("span");
        const title = document.createElement("strong");
        const meta = document.createElement("em");
        const depth = document.createElement("b");
        const region = this.regionForLocation(marker.location)?.region || this.t("units.unmapped");
        window.NeuropixelsUnitMarks?.bind(title,this.recording,marker.location.id);
        title.textContent = `${this.t("probe.unitLabel", { id: marker.location.id })}${marker.isFocused ? ` · ${this.t("probe.focused")}` : marker.open ? ` · ${this.t("units.open")}` : ""}`;
        meta.textContent = `${marker.location.label?.quality || "unknown"} · ${region} · ch ${finite(marker.location.peakChannel) ?? "—"}`;
        depth.textContent = `${Number(marker.location.y).toFixed(0)} \u00b5m`;
        body.append(title, meta);
        button.append(body, depth);
        return button;
      }));
      menu.hidden = false;
      const width = menu.offsetWidth || 240;
      const height = menu.offsetHeight || 160;
      const canvas = this.elements.canvas;
      menu.style.left = `${clamp(target.x + 10, 8, Math.max(8, canvas.clientWidth - width - 8))}px`;
      menu.style.top = `${clamp(target.y + 10, 8, Math.max(8, canvas.clientHeight - height - 8))}px`;
      list.querySelector("button")?.focus({ preventScroll: true });
    }

    hideStackMenu() {
      if (this.elements.stackMenu) this.elements.stackMenu.hidden = true;
    }

    handleStackSelection(event) {
      const button = event.target.closest("[data-cluster-id]");
      if (!button) return;
      if (event.type === "contextmenu") event.preventDefault();
      const clusterId = Number(button.dataset.clusterId);
      this.lockUnit(clusterId, { draw: false });
      this.hideStackMenu();
      this.draw();
      this.selectUnit(clusterId, "overlap-list", event);
    }

    handleCanvasClick(event) {
      if (!this.layout || !this.shankIds.length) return;
      this.elements.canvas.focus({ preventScroll: true });
      const { x, y } = this.canvasPosition(event);
      const target = this.targetAt(x, y);
      if (target) {
        if (target.markers.length > 1) {
          this.showStackMenu(target);
          return;
        }
        const clusterId = Number(target.markers[0].location.id);
        this.hideStackMenu();
        this.lockUnit(clusterId);
        this.selectUnit(clusterId, "marker", event);
        return;
      }
      this.clearLockedSelection({ draw: false });
      const panel = this.layout.panels.find((candidate) => x >= candidate.left && x <= candidate.right && y >= this.layout.top && y <= this.layout.bottom);
      if (!panel) {
        this.renderNearby([], null, null);
        this.draw();
        return;
      }
      const ratio = clamp((y - this.layout.top) / Math.max(1, this.layout.bottom - this.layout.top), 0, 1);
      const depth = this.layout.maximumY - ratio * (this.layout.maximumY - this.layout.minimumY);
      const segment = this.regionAt(panel.probeId, depth);
      this.selectedSegment = segment;
      const nearby = this.locations.filter((location) => Number(location.shankId) === Number(panel.probeId))
        .sort((left, right) => Math.abs(left.y - depth) - Math.abs(right.y - depth)).slice(0, 5);
      this.renderNearby(nearby, depth, segment);
      this.onRegionSelect?.({ recording: this.recording, probeId: panel.probeId, shankId: panel.probeId, depth, segment, source: "probe-position" });
      this.draw();
    }

    handleCanvasContextMenu(event) {
      if (!this.layout || !this.shankIds.length) return;
      const { x, y } = this.canvasPosition(event);
      const target = this.targetAt(x, y);
      if (!target) return;
      event.preventDefault();
      if (target.markers.length > 1) {
        this.showStackMenu(target);
        return;
      }
      const clusterId = Number(target.markers[0].location.id);
      this.lockUnit(clusterId);
      this.selectUnit(clusterId, "marker", event);
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
      context.fillStyle = PROBE_THEME.background;
      context.fillRect(0, 0, width, height);
      this.hitTargets = [];
      this.segmentHitTargets = [];
      if (!this.geometry.length || !this.shankIds.length) {
        context.fillStyle = PROBE_THEME.emptyText;
        context.font = '0.75rem "Cascadia Mono", Consolas, monospace';
        context.textAlign = "center";
        context.fillText(this.items.length ? this.t("probe.groupingUnavailable") : this.t("review.selectUnit"), width / 2, height / 2);
        this.hideTooltip();
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
      const panelWidth = Math.max(20, (width - outer * 2 - gap * (this.shankIds.length - 1)) / this.shankIds.length);
      const panels = this.shankIds.map((probeId, index) => ({
        probeId,
        left: outer + index * (panelWidth + gap),
        right: outer + index * (panelWidth + gap) + panelWidth,
        accent: PROBE_COLORS[index % PROBE_COLORS.length]
      }));
      this.layout = { panels, top, bottom, minimumY, maximumY };
      const yFor = (value) => top + (maximumY - clamp(Number(value), minimumY, maximumY)) / (maximumY - minimumY) * (bottom - top);

      context.font = '0.75rem "Cascadia Mono", Consolas, monospace';
      panels.forEach((panel) => {
        const channels = [];
        for (let channel = 0; channel < this.geometry.length / 2; channel += 1) {
          const probeId = this.channelShankIds.length ? Number(this.channelShankIds[channel]) : this.shankIds[0];
          if (probeId === panel.probeId) channels.push(channel);
        }
        const locationCount = this.locations.filter((location) => Number(location.shankId) === Number(panel.probeId)).length;
        context.fillStyle = panel.accent;
        context.fillRect(panel.left, 2, panel.right - panel.left, 2);
        context.fillStyle = PROBE_THEME.headerText;
        context.textAlign = "center";
        context.fillText(this.t("probe.shankShort", { shank: Number(panel.probeId) + 1 }), (panel.left + panel.right) / 2, 16);
        context.fillStyle = PROBE_THEME.mutedText;
        context.font = '0.75rem "Cascadia Mono", Consolas, monospace';
        context.fillText(this.t("probe.unitCountShort", { count: locationCount }), (panel.left + panel.right) / 2, 30);
        context.fillStyle = PROBE_THEME.panel;
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
          context.globalAlpha = NON_NEURAL.has(String(segment.region).toLowerCase()) ? PROBE_THEME.nonNeuralAlpha : isHovered || isSelected ? PROBE_THEME.bandActiveAlpha : PROBE_THEME.bandAlpha;
          context.fillStyle = color;
          context.fillRect(panel.left + 1, segmentTop, panel.right - panel.left - 2, segmentHeight);
          context.globalAlpha = 1;
          context.strokeStyle = isSelected ? PROBE_THEME.focus : isHovered ? color : PROBE_THEME.bandBoundary;
          context.lineWidth = isSelected ? 1.5 : 1;
          context.beginPath();
          context.moveTo(panel.left + 1, Math.round(segmentTop) + .5);
          context.lineTo(panel.right - 1, Math.round(segmentTop) + .5);
          context.stroke();
          if (segmentHeight >= 13 && panelWidth >= 38 && !NON_NEURAL.has(String(segment.region).toLowerCase())) {
            context.fillStyle = PROBE_THEME.bandText;
            context.font = '0.6875rem "Cascadia Mono", Consolas, monospace';
            context.textAlign = "center";
            const label = String(segment.region).length > 8 ? `${String(segment.region).slice(0, 7)}...` : String(segment.region);
            context.fillText(label, (panel.left + panel.right) / 2, segmentTop + Math.min(segmentHeight - 3, 10));
          }
          this.segmentHitTargets.push({ left: panel.left, right: panel.right, top: segmentTop, bottom: segmentBottom, segment });
        });

        context.strokeStyle = panel.accent;
        context.globalAlpha = .42;
        context.strokeRect(panel.left + .5, top + .5, panel.right - panel.left - 1, bottom - top - 1);
        context.globalAlpha = .16;
        context.strokeStyle = PROBE_THEME.channel;
        context.lineWidth = 1;
        channels.forEach((channel) => {
          const x = Number(this.geometry[channel * 2]);
          const onRight = x > 16;
          const channelX = onRight ? panel.right - 5 : panel.left + 5;
          const channelY = Math.round(yFor(this.geometry[channel * 2 + 1])) + .5;
          context.beginPath();
          context.moveTo(channelX + (onRight ? -3 : 0), channelY);
          context.lineTo(channelX + (onRight ? 0 : 3), channelY);
          context.stroke();
        });
        context.globalAlpha = 1;
        context.font = '0.75rem "Cascadia Mono", Consolas, monospace';
      });

      const openById = new Map(this.items.map((item) => [Number(item.clusterId), item]));
      const focused = this.focusedItem();
      const markers = this.locations.map((location) => {
        const panel = panels.find((candidate) => Number(candidate.probeId) === Number(location.shankId));
        if (!panel) return null;
        const open = openById.get(Number(location.id)) || null;
        return {
          probeId: Number(location.shankId),
          x: (panel.left + panel.right) / 2,
          y: yFor(location.y),
          panel,
          location,
          open,
          isFocused: Boolean(focused && Number(focused.clusterId) === Number(location.id)),
          color: regionColor(open?.color, PROBE_THEME.unopened)
        };
      }).filter(Boolean);

      const groups = groupUnitMarkers(markers);
      groups.forEach((group) => {
        const focusedMarker = group.markers.find((marker) => marker.isFocused) || null;
        const openMarkers = group.markers.filter((marker) => marker.open);
        const primary = focusedMarker || openMarkers.at(-1) || group.markers[0];
        const isHovered = this.targetKey(group) === this.hoveredTargetKey;
        const isLocked = group.markers.some((marker) => Number(marker.location.id) === Number(this.lockedUnitId));
        const radius = focusedMarker ? 5.5 : openMarkers.length ? 4.4 : group.markers.length > 1 ? 4 : 2.8;

        if (focusedMarker) {
          context.strokeStyle = PROBE_THEME.focusLine;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(focusedMarker.panel.left + 1, Math.round(group.y) + .5);
          context.lineTo(focusedMarker.panel.right - 1, Math.round(group.y) + .5);
          context.stroke();
        } else if (isLocked) {
          context.save();
          context.setLineDash([3, 3]);
          context.strokeStyle = PROBE_THEME.lockedLine;
          context.beginPath();
          context.moveTo(primary.panel.left + 1, Math.round(group.y) + .5);
          context.lineTo(primary.panel.right - 1, Math.round(group.y) + .5);
          context.stroke();
          context.restore();
        }

        context.globalAlpha = focusedMarker ? 1 : openMarkers.length ? .95 : .72;
        context.fillStyle = primary.color;
        context.beginPath();
        context.arc(group.x, group.y, radius, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
        if (focusedMarker) {
          context.strokeStyle = PROBE_THEME.focus;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(group.x, group.y, radius + 2.5, 0, Math.PI * 2);
          context.stroke();
        } else if (isHovered || isLocked) {
          context.strokeStyle = isLocked ? PROBE_THEME.lockedRing : PROBE_THEME.hoverRing;
          context.lineWidth = 1.5;
          context.beginPath();
          context.arc(group.x, group.y, radius + 2, 0, Math.PI * 2);
          context.stroke();
        }

        if (group.markers.length > 1) {
          const count = String(group.markers.length);
          context.font = '700 0.6875rem "Cascadia Mono", Consolas, monospace';
          const badgeWidth = Math.max(13, context.measureText(count).width + 7);
          const badgeX = clamp(group.x + 6, primary.panel.left + 2, primary.panel.right - badgeWidth - 2);
          const badgeY = clamp(group.y - 8, top + 1, bottom - 12);
          context.fillStyle = PROBE_THEME.badgeBackground;
          context.fillRect(badgeX, badgeY, badgeWidth, 12);
          context.strokeStyle = PROBE_THEME.badgeBorder;
          context.strokeRect(badgeX + .5, badgeY + .5, badgeWidth - 1, 11);
          context.fillStyle = PROBE_THEME.badgeText;
          context.textAlign = "center";
          context.fillText(count, badgeX + badgeWidth / 2, badgeY + 9);
        }

        this.hitTargets.push({ ...group, radius: UNIT_HIT_RADIUS });
      });

      const focusedMarker = markers.find((marker) => marker.isFocused);
      if (focusedMarker) {
        const text = `UNIT ${focusedMarker.location.id} · ${Number(focusedMarker.location.y).toFixed(0)} \u00b5m`;
        context.font = '700 0.6875rem "Cascadia Mono", Consolas, monospace';
        const labelWidth = context.measureText(text).width + 10;
        const labelX = clamp(focusedMarker.x + 10, 8, Math.max(8, width - labelWidth - 8));
        const labelY = clamp(focusedMarker.y - 20, top + 2, bottom - 15);
        context.fillStyle = PROBE_THEME.labelBackground;
        context.fillRect(labelX, labelY, labelWidth, 14);
        context.strokeStyle = PROBE_THEME.labelBorder;
        context.strokeRect(labelX + .5, labelY + .5, labelWidth - 1, 13);
        context.fillStyle = PROBE_THEME.labelText;
        context.textAlign = "left";
        context.fillText(text, labelX + 5, labelY + 10);
      }

      context.fillStyle = PROBE_THEME.depthText;
      context.font = '0.75rem "Cascadia Mono", Consolas, monospace';
      context.textAlign = "left";
      context.fillText(`${maximumY.toFixed(0)} \u00b5m`, outer, height - 7);
      context.textAlign = "right";
      context.fillText(`${minimumY.toFixed(0)} \u00b5m`, width - outer, height - 7);
      this.refreshTooltip();
    }
  }

  return {
    ProbeViewer,
    regionColor,
    displayRegionColor,
    PROBE_COLORS,
    experimentOf,
    groupUnitMarkers,
    nearestUnitTarget,
    unitInteraction,
    recordingIdentity,
    setProbeTheme
  };
});
