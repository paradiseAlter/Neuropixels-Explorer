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
    unitToggle: fakeElement(0, true),
    probeToggle: fakeElement(0, true)
  };
}

const storage = fakeStorage();
const elements = fixture();
new WorkspaceLayout(elements, { storage, windowRef: { innerWidth: 1440 } });

assert.equal(elements.layout.style.getPropertyValue("--unit-panel-width"), `${DEFAULT_LAYOUT.unitWidth}px`);
assert.equal(elements.layout.style.getPropertyValue("--probe-panel-width"), `${DEFAULT_LAYOUT.probeWidth}px`);

elements.unitSplitter.emit("pointerdown", { clientX: 100 });
elements.unitSplitter.emit("pointermove", { clientX: 148 });
elements.unitSplitter.emit("pointerup", { clientX: 148 });
assert.equal(elements.layout.style.getPropertyValue("--unit-panel-width"), "320px", "Pointer drag should resize the Units panel");
assert(storage.getItem(STORAGE_KEY), "Pointer resize should persist the layout");

elements.probeSplitter.emit("keydown", { key: "ArrowLeft" });
assert.equal(elements.layout.style.getPropertyValue("--probe-panel-width"), "340px", "Probe ArrowLeft should widen the panel");
elements.probeSplitter.emit("keydown", { key: "ArrowRight", shiftKey: true });
assert.equal(elements.layout.style.getPropertyValue("--probe-panel-width"), "292px", "Shift plus ArrowRight should use the larger step");

elements.unitToggle.emit("click");
assert.equal(elements.layout.dataset.unitCollapsed, "true");
assert.equal(elements.layout.style.getPropertyValue("--unit-panel-width"), "0px");
assert.equal(elements.unitToggle.getAttribute("aria-expanded"), "false");

elements.unitSplitter.emit("keydown", { key: "ArrowRight" });
assert.equal(elements.layout.dataset.unitCollapsed, "false", "Keyboard resize should reopen a collapsed panel");

elements.unitSplitter.emit("dblclick");
assert.equal(elements.layout.style.getPropertyValue("--unit-panel-width"), `${DEFAULT_LAYOUT.unitWidth}px`);
assert.equal(elements.layout.style.getPropertyValue("--probe-panel-width"), `${DEFAULT_LAYOUT.probeWidth}px`);
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
