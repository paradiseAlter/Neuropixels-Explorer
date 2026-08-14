((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelProbeView = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  function regionColor(value) {
    const text = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) return text;
    if (/^[0-9a-f]{6}$/i.test(text)) return `#${text}`;
    return "#9fc6f1";
  }

  function finite(value) {
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  class ProbeViewer {
    constructor(elements) {
      this.elements = elements;
      this.items = [];
      this.focusedKey = null;
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(elements.canvas);
      this.clear();
    }

    setUnits(items, focusedKey) {
      this.items = (items || [])
        .filter((item) => item?.result && item?.recording)
        .map((item) => ({ ...item, clusterId: Number(item.clusterId) }));
      this.focusedKey = focusedKey;
      const focused = this.items.find((item) => item.key === focusedKey) || this.items[0];
      this.elements.count.textContent = `${this.items.length} Unit${this.items.length === 1 ? "" : "s"} open`;
      this.renderLegend();
      if (!focused) {
        this.clearReadout();
        this.draw();
        return;
      }

      const { result, recording, clusterId, region } = focused;
      const position = result.peakChannelPosition || { x: finite(result.meanX), y: finite(result.meanDepth) };
      this.elements.unit.textContent = `Unit ${clusterId} · ${recording.name}`;
      this.elements.region.textContent = region?.region || "UNMAPPED";
      this.elements.region.style.setProperty("--region-color", regionColor(region?.color || focused.color));
      this.elements.channel.textContent = result.peakChannel == null ? "Unavailable" : String(result.peakChannel);
      this.elements.x.textContent = finite(position?.x) == null ? "Unavailable" : `${finite(position.x).toFixed(1)} µm`;
      this.elements.depth.textContent = finite(position?.y) == null ? "Unavailable" : `${finite(position.y).toFixed(1)} µm`;
      this.elements.source.textContent = region?.source || "No compatible region row";
      this.elements.note.textContent = region
        ? `${this.items.length} open Unit${this.items.length === 1 ? " is" : "s are"} shown. The focused marker is larger and brighter; its region comes from the loaded Legacy Table.`
        : `${this.items.length} open Unit${this.items.length === 1 ? " is" : "s are"} shown. The focused Unit has Probe coordinates but no matching brain-region row.`;
      this.draw();
    }

    setData(item) {
      this.setUnits([{ key: "focused", ...item }], "focused");
    }

    clearReadout() {
      this.elements.unit.textContent = "No Unit selected";
      this.elements.region.textContent = "UNMAPPED";
      this.elements.region.style.setProperty("--region-color", "#59616a");
      this.elements.channel.textContent = "—";
      this.elements.x.textContent = "—";
      this.elements.depth.textContent = "—";
      this.elements.source.textContent = "—";
      this.elements.note.textContent = "Select a signal to inspect its position on the Probe.";
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
        description.textContent = `${item.recording.name} · ${item.region?.region || "unmapped"}`;
        row.append(dot, title, description);
        return row;
      }));
    }

    clear() {
      this.items = [];
      this.focusedKey = null;
      this.elements.count.textContent = "0 Units open";
      this.elements.legend.replaceChildren();
      this.clearReadout();
      this.draw();
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
      context.font = '9px "Cascadia Mono", Consolas, monospace';

      const focused = this.items.find((item) => item.key === this.focusedKey) || this.items[0];
      const geometry = focused?.result?.channelGeometry || this.items.find((item) => item.result?.channelGeometry?.length)?.result.channelGeometry;
      if (!geometry?.length) {
        context.fillStyle = "#59616a";
        context.textAlign = "center";
        context.fillText(this.items.length ? "Probe geometry unavailable" : "Select a Unit", width / 2, height / 2);
        return;
      }

      let minimumX = Infinity;
      let maximumX = -Infinity;
      let minimumY = Infinity;
      let maximumY = -Infinity;
      for (let index = 0; index < geometry.length; index += 2) {
        minimumX = Math.min(minimumX, geometry[index]);
        maximumX = Math.max(maximumX, geometry[index]);
        minimumY = Math.min(minimumY, geometry[index + 1]);
        maximumY = Math.max(maximumY, geometry[index + 1]);
      }
      if (maximumX <= minimumX) maximumX = minimumX + 1;
      if (maximumY <= minimumY) maximumY = minimumY + 1;

      const left = 30;
      const right = 62;
      const top = 22;
      const bottom = 26;
      const plotWidth = Math.max(1, width - left - right);
      const plotHeight = Math.max(1, height - top - bottom);
      const xFor = (value) => left + (value - minimumX) / (maximumX - minimumX) * plotWidth;
      const yFor = (value) => top + (maximumY - value) / (maximumY - minimumY) * plotHeight;

      const xColumns = [...new Set(Array.from({ length: geometry.length / 2 }, (_, index) => geometry[index * 2]))];
      context.strokeStyle = "#23272c";
      context.lineWidth = 1;
      xColumns.forEach((x) => {
        context.beginPath();
        context.moveTo(Math.round(xFor(x)) + .5, top);
        context.lineTo(Math.round(xFor(x)) + .5, top + plotHeight);
        context.stroke();
      });

      context.fillStyle = "#67717c";
      for (let index = 0; index < geometry.length; index += 2) {
        context.fillRect(Math.round(xFor(geometry[index]) - 2), Math.round(yFor(geometry[index + 1]) - 1), 5, 2);
      }

      context.fillStyle = "#77818c";
      context.textAlign = "left";
      context.fillText(`${maximumY.toFixed(0)} µm`, 4, top + 3);
      context.fillText(`${minimumY.toFixed(0)} µm`, 4, top + plotHeight);
      context.textAlign = "center";
      context.fillText("PROBE COORDINATES", left + plotWidth / 2, height - 6);

      const ordered = [...this.items].sort((leftItem, rightItem) => Number(leftItem.key === this.focusedKey) - Number(rightItem.key === this.focusedKey));
      ordered.forEach((item) => {
        const selectedX = finite(item.result.peakChannelPosition?.x) ?? finite(item.result.meanX);
        const selectedY = finite(item.result.peakChannelPosition?.y) ?? finite(item.result.meanDepth);
        if (selectedX == null || selectedY == null) return;
        const markerX = xFor(clamp(selectedX, minimumX, maximumX));
        const markerY = yFor(clamp(selectedY, minimumY, maximumY));
        const color = regionColor(item.color);
        const isFocused = item.key === this.focusedKey;
        if (isFocused) {
          context.strokeStyle = color;
          context.globalAlpha = .72;
          context.beginPath();
          context.moveTo(left, Math.round(markerY) + .5);
          context.lineTo(left + plotWidth, Math.round(markerY) + .5);
          context.stroke();
        }
        context.globalAlpha = isFocused ? 1 : .68;
        context.fillStyle = color;
        context.beginPath();
        context.arc(markerX, markerY, isFocused ? 6 : 4, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = isFocused ? "#f3f7fb" : "#0b0d0f";
        context.lineWidth = isFocused ? 2 : 1;
        context.stroke();
        context.globalAlpha = 1;
      });

      if (!focused) return;
      const focusedY = finite(focused.result.peakChannelPosition?.y) ?? finite(focused.result.meanDepth);
      if (focusedY == null) return;
      const markerY = yFor(clamp(focusedY, minimumY, maximumY));
      const color = regionColor(focused.color);
      const label = focused.region?.region || `CH ${focused.result.peakChannel ?? "?"}`;
      context.font = '10px "Cascadia Mono", Consolas, monospace';
      const labelWidth = Math.min(right - 8, context.measureText(label).width + 10);
      const labelX = width - right + 7;
      const labelY = clamp(markerY - 10, top, top + plotHeight - 20);
      context.fillStyle = "#15191d";
      context.fillRect(labelX, labelY, labelWidth, 19);
      context.strokeStyle = color;
      context.strokeRect(labelX + .5, labelY + .5, labelWidth - 1, 18);
      context.fillStyle = color;
      context.textAlign = "left";
      context.fillText(label, labelX + 5, labelY + 13);
    }
  }

  return { ProbeViewer, regionColor };
});
