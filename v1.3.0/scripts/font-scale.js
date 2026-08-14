(() => {
  "use strict";

  const app = window.NeuropixelWorkflowV11 = window.NeuropixelWorkflowV11 || {};
  const STORAGE_KEY = "neuropixel-workflow-v1.3-font-step";
  const MINIMUM = 0;
  const MAXIMUM = 6;
  const DEFAULT = 3;
  const baseCreateGraph = app.createGraph;
  let graph = null;

  function clamp(value) {
    return Math.min(MAXIMUM, Math.max(MINIMUM, Math.round(Number(value) || 0)));
  }

  function savedValue() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored == null ? DEFAULT : clamp(stored);
    } catch {
      return DEFAULT;
    }
  }

  const runtime = app.FontScaleRuntime = {
    value: savedValue(),
    get graph() { return graph; },
    set: applyValue
  };

  function nodeWidth(node) {
    const base = Number(node.definition.widths[node.detailed ? "detailed" : "compact"]) || 320;
    const perStep = node.type === "viewer" ? 18 : node.type === "experiment" ? 14 : 10;
    return base + runtime.value * perStep;
  }

  function applyNodeScale(node) {
    node.element.dataset.nodeType = node.type;
    node.element.style.width = `${nodeWidth(node)}px`;
  }

  function rerenderNodes() {
    if (!graph) return;
    graph.getNodes().forEach((node) => graph.updateNodeData(node.id, {}, { notify: false }));
    graph.updateAllConnections();
  }

  function applyValue(value, options = {}) {
    const next = clamp(value);
    runtime.value = next;
    document.documentElement.style.setProperty("--font-offset", `${next}px`);
    const slider = document.getElementById("font-scale");
    const output = document.getElementById("font-scale-readout");
    if (slider && slider.value !== String(next)) slider.value = String(next);
    if (output) output.textContent = `${next} · +${next} PX`;
    if (options.persist !== false) {
      try { window.localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* Local persistence is optional. */ }
    }
    if (options.render !== false) rerenderNodes();
    return next;
  }

  function installCanvasFontOffset() {
    const prototype = window.CanvasRenderingContext2D?.prototype;
    const descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, "font");
    if (!descriptor?.get || !descriptor?.set || prototype.__neuropixelFontOffsetInstalled) return;
    Object.defineProperty(prototype, "font", {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get() { return descriptor.get.call(this); },
      set(value) {
        const adjusted = String(value).replace(/(\d+(?:\.\d+)?)px/i, (_, size) => `${Number(size) + runtime.value}px`);
        descriptor.set.call(this, adjusted);
      }
    });
    Object.defineProperty(prototype, "__neuropixelFontOffsetInstalled", { value: true });
  }

  function snap(value) {
    const ratio = window.devicePixelRatio || 1;
    return Math.round(Number(value) * ratio) / ratio;
  }

  function makeTransformCrisp(element) {
    const source = element?.style?.transform || "";
    const match = source.match(/translate3d\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*,\s*0(?:px)?\s*\)/i)
      || source.match(/translate\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/i);
    if (!match) return;
    const replacement = `translate(${snap(match[1])}px, ${snap(match[2])}px)`;
    const next = source.replace(match[0], replacement);
    if (next !== source) element.style.transform = next;
  }

  function installCrispTransformObserver() {
    const transform = document.getElementById("graph-transform");
    if (!transform) return;
    const observer = new MutationObserver((records) => {
      records.forEach((record) => makeTransformCrisp(record.target));
    });
    observer.observe(transform, { attributes: true, attributeFilter: ["style"], subtree: true });
    makeTransformCrisp(transform);
  }

  if (baseCreateGraph) {
    app.createGraph = (options) => {
      const originalRendered = options.onNodeRendered;
      const graphReference = baseCreateGraph({
        ...options,
        onNodeRendered: (node) => {
          originalRendered?.(node);
          applyNodeScale(node);
        }
      });
      graph = graphReference;
      return graphReference;
    };
  }

  installCanvasFontOffset();
  applyValue(runtime.value, { persist: false, render: false });
  document.getElementById("font-scale")?.addEventListener("input", (event) => applyValue(event.currentTarget.value));
  installCrispTransformObserver();
})();
