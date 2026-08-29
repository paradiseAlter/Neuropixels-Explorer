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
    probeWidth: 352,
    probeHeight: 640,
    unitCollapsed: false,
    probeCollapsed: false
  });
  const LAYOUT_LIMITS = Object.freeze({
    unit: Object.freeze({ minimum: 200, maximum: 440 }),
    probeHeight: Object.freeze({ minimum: 420, maximum: 1200 }),
    centerMinimum: 620,
    splitterWidth: 8,
    keyboardStep: 12,
    heightKeyboardStep: 24
  });

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  function finiteWidth(value, fallback, limits) {
    const number = Number(value);
    return Math.round(clamp(Number.isFinite(number) ? number : fallback, limits.minimum, limits.maximum));
  }

  function normalizeLayout(value = {}) {
    return {
      unitWidth: finiteWidth(value.unitWidth, DEFAULT_LAYOUT.unitWidth, LAYOUT_LIMITS.unit),
      // The Probe Inspector has one deliberate width. More horizontal room does
      // not improve depth resolution, so old saved widths are intentionally ignored.
      probeWidth: DEFAULT_LAYOUT.probeWidth,
      probeHeight: finiteWidth(value.probeHeight, DEFAULT_LAYOUT.probeHeight, LAYOUT_LIMITS.probeHeight),
      unitCollapsed: Boolean(value.unitCollapsed),
      probeCollapsed: Boolean(value.probeCollapsed)
    };
  }

  function keyboardWidthDelta(side, key, step = LAYOUT_LIMITS.keyboardStep) {
    if (side !== 'unit' || !['ArrowLeft', 'ArrowRight'].includes(key)) return 0;
    return (key === 'ArrowRight' ? 1 : -1) * step;
  }

  class WorkspaceLayout {
    constructor(elements, options = {}) {
      this.elements = elements;
      this.window = options.windowRef || root;
      this.storage = options.storage === undefined ? this.safeStorage() : options.storage;
      this.drag = null;
      this.state = this.load();
      this.installSplitter('unit', elements.unitSplitter, elements.unitToggle);
      this.installProbeRail(elements.probeSplitter, elements.probeToggle);
      this.installProbeHeightSplitter(elements.probeHeightSplitter);
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
      return LAYOUT_LIMITS.unit;
    }

    availableMaximum(side) {
      const bounds = this.elements.layout?.getBoundingClientRect();
      if (!bounds?.width) return this.limits(side).maximum;
      const otherWidth = this.state.probeCollapsed ? 0 : DEFAULT_LAYOUT.probeWidth;
      const available = bounds.width - LAYOUT_LIMITS.centerMinimum - LAYOUT_LIMITS.splitterWidth * 2 - otherWidth;
      return clamp(available, this.limits(side).minimum, this.limits(side).maximum);
    }

    setWidth(side, value, persist = true) {
      if (side !== 'unit') return;
      const limits = this.limits(side);
      this.state[this.widthKey(side)] = Math.round(clamp(value, limits.minimum, this.availableMaximum(side)));
      this.state[this.collapsedKey(side)] = false;
      this.apply(persist);
    }

    setProbeHeight(value, persist = true) {
      const limits = LAYOUT_LIMITS.probeHeight;
      this.state.probeHeight = Math.round(clamp(value, limits.minimum, limits.maximum));
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

    installProbeRail(rail, toggle) {
      if (!rail) return;
      toggle?.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggle('probe');
        toggle.focus({ preventScroll: true });
      });
    }

    installProbeHeightSplitter(splitter) {
      if (!splitter) return;
      splitter.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        splitter.setPointerCapture(event.pointerId);
        this.drag = {
          side: 'probe-height',
          pointerId: event.pointerId,
          startY: event.clientY,
          startHeight: this.state.probeHeight
        };
        this.elements.layout?.classList.add('is-resizing-probe-height');
        splitter.classList.add('active');
      });
      splitter.addEventListener('pointermove', (event) => {
        if (!this.drag || this.drag.pointerId !== event.pointerId || this.drag.side !== 'probe-height') return;
        this.setProbeHeight(this.drag.startHeight + (event.clientY - this.drag.startY), false);
      });
      const finish = (event) => {
        if (!this.drag || this.drag.pointerId !== event.pointerId || this.drag.side !== 'probe-height') return;
        this.drag = null;
        this.elements.layout?.classList.remove('is-resizing-probe-height');
        splitter.classList.remove('active');
        this.save();
      };
      splitter.addEventListener('pointerup', finish);
      splitter.addEventListener('pointercancel', finish);
      splitter.addEventListener('dblclick', (event) => {
        event.preventDefault();
        this.setProbeHeight(DEFAULT_LAYOUT.probeHeight, true);
      });
      splitter.addEventListener('keydown', (event) => {
        if (event.key === 'Home') {
          event.preventDefault();
          this.setProbeHeight(DEFAULT_LAYOUT.probeHeight, true);
          return;
        }
        if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const step = event.shiftKey ? LAYOUT_LIMITS.heightKeyboardStep * 4 : LAYOUT_LIMITS.heightKeyboardStep;
        this.setProbeHeight(this.state.probeHeight + direction * step, true);
      });
    }

    apply(persist = true) {
      const layout = this.elements.layout;
      if (!layout) return;
      const unitWidth = this.state.unitCollapsed ? 0 : this.state.unitWidth;
      const probeWidth = this.state.probeCollapsed ? 0 : this.state.probeWidth;
      layout.style.setProperty('--unit-panel-width', `${unitWidth}px`);
      layout.style.setProperty('--probe-panel-width', `${probeWidth}px`);
      layout.style.setProperty('--probe-canvas-height', `${this.state.probeHeight}px`);
      layout.dataset.unitCollapsed = String(this.state.unitCollapsed);
      layout.dataset.probeCollapsed = String(this.state.probeCollapsed);
      this.updateControl('unit', this.elements.unitSplitter, this.elements.unitToggle, this.elements.unitPanel);
      this.updateProbeControl(this.elements.probeSplitter, this.elements.probeToggle, this.elements.probePanel);
      this.updateProbeHeightControl(this.elements.probeHeightSplitter);
      if (persist) this.save();
    }

    updateControl(side, splitter, toggle, panel) {
      const t = this.translate || ((key, values = {}) => ({
        'layout.collapsed': 'Collapsed', 'layout.pixels': `${values.width} pixels`,
        'layout.resizeTitle': 'Drag or use arrow keys to resize. Double-click or press Home to reset.',
        'layout.panelUnits': 'Units', 'layout.panelProbe': 'Probe Inspector', 'layout.expand': 'Expand', 'layout.collapse': 'Collapse'
      }[key] || key));
      const collapsed = this.state[this.collapsedKey(side)];
      const width = collapsed ? 0 : this.state[this.widthKey(side)];
      splitter?.setAttribute('aria-valuemin', '0');
      splitter?.setAttribute('aria-valuemax', String(Math.round(this.availableMaximum(side))));
      splitter?.setAttribute('aria-valuenow', String(width));
      splitter?.setAttribute('aria-valuetext', collapsed ? t('layout.collapsed') : t('layout.pixels', { width }));
      splitter?.setAttribute('title', t('layout.resizeTitle'));
      if (toggle) {
        const panelName = t(side === 'unit' ? 'layout.panelUnits' : 'layout.panelProbe');
        toggle.textContent = side === 'unit' ? (collapsed ? '›' : '‹') : (collapsed ? '‹' : '›');
        toggle.setAttribute('aria-expanded', String(!collapsed));
        const controlLabel = `${t(collapsed ? 'layout.expand' : 'layout.collapse')} ${panelName}`;
        toggle.setAttribute('aria-label', controlLabel);
        toggle.title = controlLabel;
      }
      panel?.setAttribute('aria-hidden', String(collapsed));
    }

    updateProbeControl(rail, toggle, panel) {
      const t = this.translate || ((key) => ({
        'layout.panelProbe': 'Probe Inspector panel', 'layout.expand': 'Expand', 'layout.collapse': 'Collapse',
        'layout.probeRailTitle': 'Collapse or expand the Probe Inspector.'
      }[key] || key));
      const collapsed = this.state.probeCollapsed;
      rail?.setAttribute('title', t('layout.probeRailTitle'));
      if (toggle) {
        const panelName = t('layout.panelProbe');
        toggle.textContent = collapsed ? '‹' : '›';
        toggle.setAttribute('aria-expanded', String(!collapsed));
        const controlLabel = `${t(collapsed ? 'layout.expand' : 'layout.collapse')} ${panelName}`;
        toggle.setAttribute('aria-label', controlLabel);
        toggle.title = controlLabel;
      }
      panel?.setAttribute('aria-hidden', String(collapsed));
    }

    updateProbeHeightControl(splitter) {
      if (!splitter) return;
      const t = this.translate || ((key, values = {}) => ({
        'layout.pixels': `${values.width} pixels`,
        'layout.probeHeightTitle': 'Drag vertically or use Up and Down arrows to adjust Probe height. Double-click or press Home to reset.'
      }[key] || key));
      splitter.setAttribute('aria-valuemin', String(LAYOUT_LIMITS.probeHeight.minimum));
      splitter.setAttribute('aria-valuemax', String(LAYOUT_LIMITS.probeHeight.maximum));
      splitter.setAttribute('aria-valuenow', String(this.state.probeHeight));
      splitter.setAttribute('aria-valuetext', t('layout.pixels', { width: this.state.probeHeight }));
      splitter.setAttribute('title', t('layout.probeHeightTitle'));
    }

    setTranslator(translator) {
      if (typeof translator === 'function') this.translate = translator;
      this.apply(false);
    }
  }

  return { WorkspaceLayout, normalizeLayout, keyboardWidthDelta, DEFAULT_LAYOUT, LAYOUT_LIMITS, STORAGE_KEY };
});
