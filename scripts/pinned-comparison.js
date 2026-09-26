/* Pinned data is scoped to one Recording and independent of temporary focus. */
(() => {
  "use strict";
  class PinnedComparison {
    constructor(root, { PlotManager, getView, setView, onChange, t }) {
      Object.assign(this, { root, PlotManager, getView, setView, onChange, t });
      this.entries = new Map();
      this.limit = 6;
      this.syncing = false;
      this.mode = "cursor";
      root.querySelectorAll("[data-compare-mode]").forEach(button => button.addEventListener("click", () => {
        this.setMode(button.dataset.compareMode);
      }));
      root.querySelector("[data-compare-clear]").addEventListener("click", () => this.clear());
      root.querySelector("[data-compare-near]").addEventListener("click", () => this.nearCursor());
    }
    has(id) { return this.entries.has(Number(id)); }
    setMode(mode) {
      this.mode = mode;
      this.entries.forEach(entry => entry.manager.setMode(mode));
      this.root.querySelectorAll("[data-compare-mode]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.compareMode === mode)));
    }
    refresh(palette) {
      this.entries.forEach(({ manager, lane, unit }) => {
        if (palette) manager.setColors(palette);
        lane.querySelector("button").setAttribute("aria-label", this.t("workspace.unpin", { id: unit.id }));
      });
    }
    add(recording, unit, result, palette) {
      if (!result?.spikeTimes || !recording || !unit) return false;
      if (this.recording && this.recording !== recording) this.clear();
      if (this.has(unit.id) || this.entries.size >= this.limit) return false;
      this.recording = recording;
      const first = this.entries.size === 0;
      const lane = document.createElement("article");
      lane.className = "pinned-lane";
      lane.dataset.unitId = String(unit.id);
      lane.innerHTML = '<header><strong></strong><span></span><button type="button">×</button></header><div class="pinned-raster"><canvas tabindex="0"></canvas><div class="plot-cursor" hidden><span></span></div><div class="sync-playhead" hidden></div><div class="zoom-selection" hidden><span></span></div></div>';
      lane.querySelector("strong").textContent = `Unit ${unit.id}`;
      lane.querySelector("header span").textContent = `${unit.region || "Unmapped"} · Shank ${unit.shankId == null ? "—" : Number(unit.shankId) + 1} · ${unit.depthUm == null ? "—" : Math.round(unit.depthUm)} µm`;
      const remove = lane.querySelector("button");
      remove.setAttribute("aria-label", this.t("workspace.unpin", { id: unit.id }));
      remove.addEventListener("click", () => this.remove(unit.id));
      const canvas = lane.querySelector("canvas");
      canvas.setAttribute("aria-label", `Unit ${unit.id} · pinned spike comparison`);
      this.root.querySelector(".pinned-lanes").append(lane);
      this.root.hidden = false;
      this.syncing = true;
      const manager = new this.PlotManager({
        detail: canvas, detailFrame: lane.querySelector(".pinned-raster"), rasterOnly: true,
        cursor: lane.querySelector(".plot-cursor"), cursorLabel: lane.querySelector(".plot-cursor span"),
        playhead: lane.querySelector(".sync-playhead"), selection: lane.querySelector(".zoom-selection"),
        selectionLabel: lane.querySelector(".zoom-selection span"),
        traceColor: palette.trace,
        onCursorCommit: time => this.setView({ cursorTime: time }, { seekVideo: true })
      }, view => {
        if (this.syncing) return;
        const current = this.getView().visibleRange;
        if (Math.abs(view.start - current.start) + Math.abs(view.end - current.end) < 1e-6) return;
        this.setView({ visibleRange: { start: view.start, end: view.end } });
      }, status => {
        if (!this.syncing && status.mode !== this.mode) this.setMode(status.mode);
      });
      this.entries.set(Number(unit.id), { manager, lane, unit });
      this.syncing = true;
      try {
        manager.setData({ ...result, duration: recording.duration, sampleRate: recording.sampleRate });
        manager.setMode(this.mode);
      } finally { this.syncing = false; }
      if (first && this.getView().visibleRange.end - this.getView().visibleRange.start > 10) this.nearCursor();
      this.syncView();
      this.onChange();
      return true;
    }
    nearCursor() {
      if (!this.recording) return;
      const span = Math.min(10, this.recording.duration);
      const start = Math.max(0, Math.min(this.recording.duration - span, this.getView().cursorTime - span / 2));
      this.setView({ visibleRange: { start, end: start + span } });
    }
    syncView() {
      const view = this.getView();
      this.syncing = true;
      try {
        this.entries.forEach(({ manager }) => {
          if (Math.abs(manager.start - view.visibleRange.start) + Math.abs(manager.start + manager.span - view.visibleRange.end) > 1e-6)
            manager.setWindow(view.visibleRange.start, view.visibleRange.end - view.visibleRange.start);
          manager.setPlaybackTime(view.cursorTime);
        });
      } finally { this.syncing = false; }
      this.root.querySelector("[data-compare-window]").textContent = `${view.visibleRange.start.toFixed(3)}–${view.visibleRange.end.toFixed(3)} s`;
    }
    remove(id) {
      const entry = this.entries.get(Number(id));
      if (!entry) return;
      entry.manager.destroy();
      entry.lane.remove();
      this.entries.delete(Number(id));
      this.root.hidden = !this.entries.size;
      if (!this.entries.size) this.recording = null;
      this.onChange();
    }
    clear() { [...this.entries.keys()].forEach(id => this.remove(id)); }
  }
  window.NeuropixelsPinnedComparison = PinnedComparison;
})();
