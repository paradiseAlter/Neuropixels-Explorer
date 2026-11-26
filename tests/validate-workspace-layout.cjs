"use strict";

const assert = require("node:assert/strict");
const {
  WorkspaceLayout,
  DEFAULT_LAYOUT,
  STORAGE_KEY
} = require("../scripts/workspace-layout.js");

function fakeElement(width = 1440, isButton = false) {
  const listeners = new Map();
  const attributes = new Map();
  const classes = new Set();
  const properties = new Map();
  const element = {
    dataset: {},
    textContent: "",
    style: {
      setProperty(name, value) { properties.set(name, value); },
      getPropertyValue(name) { return properties.get(name) || ""; }
    },
    classList: {
      add(...names) { names.forEach((name) => classes.add(name)); },
      remove(...names) { names.forEach((name) => classes.delete(name)); },
      contains(name) { return classes.has(name); }
    },
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    emit(name, overrides = {}) {
      const event = {
        button: 0,
        clientX: 0,
        clientY: 0,
        pointerId: 1,
        key: "",
        shiftKey: false,
        target: element,
        preventDefault() { event.defaultPrevented = true; },
        stopPropagation() { event.propagationStopped = true; },
        ...overrides
      };
      (listeners.get(name) || []).forEach((listener) => listener(event));
      return event;
    },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    getBoundingClientRect() { return { width }; },
    setPointerCapture() {},
    focus() { element.focused = true; },
    closest(selector) { return isButton && selector === "button" ? element : null; }
  };
  return element;
}

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

function fixture(width = 1440) {
  return {
    layout: fakeElement(width),
    unitPanel: fakeElement(),
    probePanel: fakeElement(),
    unitSplitter: fakeElement(),
    probeSplitter: fakeElement(),
    probeHeightSplitter: fakeElement(),
    unitToggle: fakeElement(0, true),
    probeToggle: fakeElement(0, true)
  };
}

const storage = fakeStorage();
const elements = fixture();
new WorkspaceLayout(elements, { storage, windowRef: { innerWidth: 1440 } });

assert.equal(elements.layout.style.getPropertyValue("--unit-panel-width"), `${DEFAULT_LAYOUT.unitWidth}px`);
assert.equal(elements.layout.style.getPropertyValue("--probe-panel-width"), `${DEFAULT_LAYOUT.probeWidth}px`);
assert.equal(elements.layout.style.getPropertyValue("--probe-canvas-height"), `${DEFAULT_LAYOUT.probeHeight}px`);

elements.unitSplitter.emit("pointerdown", { clientX: 100 });
elements.unitSplitter.emit("pointermove", { clientX: 148 });
elements.unitSplitter.emit("pointerup", { clientX: 148 });
assert.equal(elements.layout.style.getPropertyValue("--unit-panel-width"), "320px", "Pointer drag should resize the Units panel");
assert(storage.getItem(STORAGE_KEY), "Pointer resize should persist the layout");
for (const type of ["pointercancel","keydown"]) {
  elements.unitSplitter.emit("pointerdown",{clientX:100});
  elements.unitSplitter.emit("pointermove",{clientX:154});
  elements.unitSplitter.emit(type,{key:"Escape"});
  assert.equal(elements.layout.style.getPropertyValue("--unit-panel-width"),"320px");
}

elements.probeSplitter.emit("pointerdown", { clientX: 100 });
elements.probeSplitter.emit("pointermove", { clientX: 160 });
elements.probeSplitter.emit("pointerup", { clientX: 160 });
assert.equal(elements.layout.style.getPropertyValue("--probe-panel-width"), `${DEFAULT_LAYOUT.probeWidth}px`, "The Probe panel should keep a fixed width");

elements.probeHeightSplitter.emit("keydown", { key: "ArrowDown" });
assert.equal(elements.layout.style.getPropertyValue("--probe-canvas-height"), "664px", "ArrowDown should make the Probe diagram taller");
elements.probeHeightSplitter.emit("keydown", { key: "ArrowUp", shiftKey: true });
assert.equal(elements.layout.style.getPropertyValue("--probe-canvas-height"), "568px", "Shift plus ArrowUp should use the larger vertical step");
elements.probeHeightSplitter.emit("pointerdown", { clientY: 100 });
elements.probeHeightSplitter.emit("pointermove", { clientY: 172 });
elements.probeHeightSplitter.emit("pointerup", { clientY: 172 });
assert.equal(elements.layout.style.getPropertyValue("--probe-canvas-height"), "640px", "Vertical pointer drag should resize the Probe diagram");

elements.unitToggle.emit("click");
assert.equal(elements.layout.dataset.unitCollapsed, "true");
assert.equal(elements.layout.style.getPropertyValue("--unit-panel-width"), "0px");
assert.equal(elements.unitToggle.getAttribute("aria-expanded"), "false");

elements.unitSplitter.emit("keydown", { key: "ArrowRight" });
assert.equal(elements.layout.dataset.unitCollapsed, "false", "Keyboard resize should reopen a collapsed panel");

elements.unitSplitter.emit("dblclick");
assert.equal(elements.layout.style.getPropertyValue("--unit-panel-width"), `${DEFAULT_LAYOUT.unitWidth}px`);
assert.equal(elements.layout.style.getPropertyValue("--probe-panel-width"), `${DEFAULT_LAYOUT.probeWidth}px`);
assert.equal(elements.layout.style.getPropertyValue("--probe-canvas-height"), `${DEFAULT_LAYOUT.probeHeight}px`);
assert.equal(elements.layout.dataset.unitCollapsed, "false");
assert.equal(elements.layout.dataset.probeCollapsed, "false");

elements.unitSplitter.emit("keydown", { key: "ArrowRight" });
const restoredElements = fixture();
new WorkspaceLayout(restoredElements, { storage, windowRef: { innerWidth: 1440 } });
assert.equal(restoredElements.layout.style.getPropertyValue("--unit-panel-width"), "284px", "Saved width should survive a new page instance");

const compactElements = fixture(800);
new WorkspaceLayout(compactElements, { storage: fakeStorage(), windowRef: { innerWidth: 800 } });
assert.equal(compactElements.layout.dataset.unitCollapsed, "true", "Narrow screens should initially collapse the Units panel");
assert.equal(compactElements.layout.dataset.probeCollapsed, "true", "Narrow screens should initially collapse the Probe panel");

const laptopElements = fixture(1200);
new WorkspaceLayout(laptopElements, { storage: fakeStorage(), windowRef: { innerWidth: 1200 } });
assert.equal(laptopElements.layout.dataset.unitCollapsed, "false", "Laptop layouts should keep the Units panel available");
assert.equal(laptopElements.layout.dataset.probeCollapsed, "true", "Laptop layouts should protect the signal workspace by collapsing the Probe panel");

console.log(JSON.stringify({ status: "PASS", feature: "resizable-workspace" }, null, 2));
