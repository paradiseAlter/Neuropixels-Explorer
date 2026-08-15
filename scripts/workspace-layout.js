((root, factory) => {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelsWorkspaceLayout = api;
})(typeof globalThis !== "undefined" ? globalThis : window, (root) => {
  "use strict";

  const STORAGE_KEY = "neuropixelsExplorer.workspaceLayout.v1";
  const DEFAULT_LAYOUT = Object.freeze({
    unitWidth: 272,
    probeWidth: 328,
    unitCollapsed: false,
    probeCollapsed: false
  });
  const LAYOUT_LIMITS = Object.freeze({
    unit: Object.freeze({ minimum: 200, maximum: 440 }),
    probe: Object.freeze({ minimum: 260, maximum: 520 }),
    centerMinimum: 620,
    splitterWidth: 8,
    keyboardStep: 12
  });

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  function finiteWidth(value, fallback, limits) {
    const number = Number(value);
    return Math.round(clamp(Number.isFinite(number) ? number : fallback, limits.minimum, limits.maximum));
  }

  function normalizeLayout(value = {}) {
    return {
      unitWidth: finiteWidth(value.unitWidth, DEFAULT_LAYOUT.unitWidth, LAYOUT_LIMITS.unit),
      probeWidth: finiteWidth(value.probeWidth, DEFAULT_LAYOUT.probeWidth, LAYOUT_LIMITS.probe),
      unitCollapsed: Boolean(value.unitCollapsed),
      probeCollapsed: Boolean(value.probeCollapsed)
    };
  }

  function keyboardWidthDelta(side, key, step = LAYOUT_LIMITS.keyboardStep) {
    if (!['ArrowLeft', 'ArrowRight'].includes(key)) return 0;
    const physicalDirection = key === 'ArrowRight' ? 1 : -1;
    return side === 'probe' ? -physicalDirection * step : physicalDirection * step;
  }

  class WorkspaceLayout {
    constructor(elements, options = {}) {
      this.elements = elements;
      this.window = options.windowRef || root;
      this.storage = options.storage === undefined ? this.safeStorage() : options.storage;
      this.drag = null;
      this.state = this.load();
      this.installSplitter('unit', elements.unitSplitter, elements.unitToggle);
      this.installSplitter('probe', elements.probeSplitter, elements.probeToggle);
      this.apply(false);
    }

    safeStorage() {
      try { return this.window.localStorage || null; }
      catch (_) { return null; }
    }

    load() {
      try {
        const saved = this.storage?.getItem(STORAGE_KEY);
        if (saved) return normalizeLayout(JSON.parse(saved));
      } catch (_) {
        // Invalid or unavailable browser storage falls back to a safe layout.
      }
      const compact = Number(this.window.innerWidth) <= 1240;
      const narrow = Number(this.window.innerWidth) < 860;
      return normalizeLayout({
        ...DEFAULT_LAYOUT,
        probeCollapsed: compact,
        unitCollapsed: narrow
      });
    }

    save() {
      try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state)); }
      catch (_) { /* Layout persistence is optional. */ }
    }

    widthKey(side) {
      return side === 'probe' ? 'probeWidth' : 'unitWidth';
    }

    collapsedKey(side) {
      return side === 'probe' ? 'probeCollapsed' : 'unitCollapsed';
    }

    limits(side) {
      return side === 'probe' ? LAYOUT_LIMITS.probe : LAYOUT_LIMITS.unit;
    }

    availableMaximum(side) {
      const bounds = this.elements.layout?.getBoundingClientRect();
      if (!bounds?.width) return this.limits(side).maximum;
      const otherSide = side === 'probe' ? 'unit' : 'probe';
      const otherWidth = this.state[this.collapsedKey(otherSide)] ? 0 : this.state[this.widthKey(otherSide)];
      const available = bounds.width - LAYOUT_LIMITS.centerMinimum - LAYOUT_LIMITS.splitterWidth * 2 - otherWidth;
      return clamp(available, this.limits(side).minimum, this.limits(side).maximum);
    }

    setWidth(side, value, persist = true) {
      const limits = this.limits(side);
      this.state[this.widthKey(side)] = Math.round(clamp(value, limits.minimum, this.availableMaximum(side)));
      this.state[this.collapsedKey(side)] = false;
      this.apply(persist);
    }

    toggle(side) {
      const collapsedKey = this.collapsedKey(side);
      this.state[collapsedKey] = !this.state[collapsedKey];
      this.apply(true);
    }

    reset() {
      this.state = { ...DEFAULT_LAYOUT };
      this.apply(true);
    }

    installSplitter(side, splitter, toggle) {
      if (!splitter) return;
      splitter.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || event.target.closest('button') || this.state[this.collapsedKey(side)]) return;
        event.preventDefault();
        splitter.setPointerCapture(event.pointerId);
        this.drag = {
          side,
          pointerId: event.pointerId,
          startX: event.clientX,
          startWidth: this.state[this.widthKey(side)]
        };
        this.elements.layout?.classList.add('is-resizing');
        splitter.classList.add('active');
      });
      splitter.addEventListener('pointermove', (event) => {
        if (!this.drag || this.drag.pointerId !== event.pointerId || this.drag.side !== side) return;
        const direction = side === 'probe' ? -1 : 1;
        this.setWidth(side, this.drag.startWidth + (event.clientX - this.drag.startX) * direction, false);
      });
      const finish = (event) => {
        if (!this.drag || this.drag.pointerId !== event.pointerId || this.drag.side !== side) return;
        this.drag = null;
        this.elements.layout?.classList.remove('is-resizing');
        splitter.classList.remove('active');
        this.save();
      };
      splitter.addEventListener('pointerup', finish);
      splitter.addEventListener('pointercancel', finish);
      splitter.addEventListener('dblclick', (event) => {
        if (event.target.closest('button')) return;
        event.preventDefault();
        this.reset();
      });
      splitter.addEventListener('keydown', (event) => {
        if (event.target.closest('button')) return;
        if (event.key === 'Home') {
          event.preventDefault();
          this.reset();
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.toggle(side);
          return;
        }
        const step = event.shiftKey ? LAYOUT_LIMITS.keyboardStep * 4 : LAYOUT_LIMITS.keyboardStep;
        const delta = keyboardWidthDelta(side, event.key, step);
        if (!delta) return;
        event.preventDefault();
        const width = this.state[this.widthKey(side)];
        this.setWidth(side, width + delta, true);
      });
      toggle?.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggle(side);
        splitter.focus({ preventScroll: true });
      });
    }

    apply(persist = true) {
      const layout = this.elements.layout;
      if (!layout) return;
      const unitWidth = this.state.unitCollapsed ? 0 : this.state.unitWidth;
      const probeWidth = this.state.probeCollapsed ? 0 : this.state.probeWidth;
      layout.style.setProperty('--unit-panel-width', `${unitWidth}px`);
      layout.style.setProperty('--probe-panel-width', `${probeWidth}px`);
      layout.dataset.unitCollapsed = String(this.state.unitCollapsed);
      layout.dataset.probeCollapsed = String(this.state.probeCollapsed);
      this.updateControl('unit', this.elements.unitSplitter, this.elements.unitToggle, this.elements.unitPanel);
      this.updateControl('probe', this.elements.probeSplitter, this.elements.probeToggle, this.elements.probePanel);
      if (persist) this.save();
    }

    updateControl(side, splitter, toggle, panel) {
      const collapsed = this.state[this.collapsedKey(side)];
      const width = collapsed ? 0 : this.state[this.widthKey(side)];
      splitter?.setAttribute('aria-valuemin', '0');
      splitter?.setAttribute('aria-valuemax', String(Math.round(this.availableMaximum(side))));
      splitter?.setAttribute('aria-valuenow', String(width));
      splitter?.setAttribute('aria-valuetext', collapsed ? 'Collapsed' : `${width} pixels`);
      splitter?.setAttribute('title', 'Drag or use arrow keys to resize. Double-click or press Home to reset.');
      if (toggle) {
        const panelName = side === 'unit' ? 'Units' : 'Probe Inspector';
        toggle.textContent = side === 'unit' ? (collapsed ? '›' : '‹') : (collapsed ? '‹' : '›');
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} ${panelName} panel`);
        toggle.title = `${collapsed ? 'Expand' : 'Collapse'} ${panelName} panel`;
      }
      panel?.setAttribute('aria-hidden', String(collapsed));
    }
  }

  return { WorkspaceLayout, normalizeLayout, keyboardWidthDelta, DEFAULT_LAYOUT, LAYOUT_LIMITS, STORAGE_KEY };
});
