(() => {
  "use strict";

  window.NeuropixelWorkflowV1 = window.NeuropixelWorkflowV1 || {};

  window.NeuropixelWorkflowV1.createViewport = ({ canvas, graphTransform, zoomLabel, cursorLabel, onChange }) => {
    const state = { zoom: 1, panX: 0, panY: 0, tool: "select", grid: true, panning: false, space: false };
    let start = null;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function render() {
      canvas.style.setProperty("--grid-gap", `${22 * state.zoom}px`);
      canvas.style.setProperty("--grid-major", `${110 * state.zoom}px`);
      canvas.style.setProperty("--grid-x", `${state.panX}px`);
      canvas.style.setProperty("--grid-y", `${state.panY}px`);
      graphTransform.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.zoom})`;
      zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
      onChange?.({ ...state });
    }

    function screenToWorld(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - state.panX) / state.zoom,
        y: (clientY - rect.top - state.panY) / state.zoom
      };
    }

    function setZoom(value, clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const anchorX = clientX ?? rect.left + rect.width / 2;
      const anchorY = clientY ?? rect.top + rect.height / 2;
      const localX = anchorX - rect.left;
      const localY = anchorY - rect.top;
      const worldX = (localX - state.panX) / state.zoom;
      const worldY = (localY - state.panY) / state.zoom;
      state.zoom = clamp(value, 0.25, 2.5);
      state.panX = localX - worldX * state.zoom;
      state.panY = localY - worldY * state.zoom;
      render();
    }

    function reset() {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
      render();
    }

    function setTool(tool) {
      state.tool = tool;
      document.querySelectorAll("[data-tool]").forEach((button) => button.classList.toggle("active", button.dataset.tool === tool));
      canvas.classList.toggle("pan-mode", tool === "pan" || state.space);
    }

    function toggleGrid() {
      state.grid = !state.grid;
      canvas.classList.toggle("grid-hidden", !state.grid);
      return state.grid;
    }

    canvas.addEventListener("wheel", (event) => {
      if (event.target.closest(".node-palette, .side-panel, .entity-list")) return;
      event.preventDefault();
      setZoom(state.zoom * Math.exp(-event.deltaY * 0.0012), event.clientX, event.clientY);
    }, { passive: false });

    canvas.addEventListener("pointermove", (event) => {
      const point = screenToWorld(event.clientX, event.clientY);
      cursorLabel.innerHTML = `X ${Math.round(point.x)}&nbsp;&nbsp;Y ${Math.round(point.y)}`;
      if (!state.panning || !start) return;
      state.panX = start.panX + event.clientX - start.x;
      state.panY = start.panY + event.clientY - start.y;
      render();
    });

    canvas.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".workflow-node, .node-palette, .side-panel")) return;
      const shouldPan = event.button === 1 || state.tool === "pan" || state.space;
      if (!shouldPan) return;
      event.preventDefault();
      state.panning = true;
      start = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY };
      canvas.classList.add("panning");
      canvas.setPointerCapture(event.pointerId);
    });

    function endPan(event) {
      if (!state.panning) return;
      state.panning = false;
      start = null;
      canvas.classList.remove("panning");
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    }

    canvas.addEventListener("pointerup", endPan);
    canvas.addEventListener("pointercancel", endPan);

    document.addEventListener("keydown", (event) => {
      if (event.code !== "Space" || event.repeat || event.target.matches("input, select, textarea")) return;
      state.space = true;
      canvas.classList.add("pan-mode");
      event.preventDefault();
    });

    document.addEventListener("keyup", (event) => {
      if (event.code !== "Space") return;
      state.space = false;
      canvas.classList.toggle("pan-mode", state.tool === "pan");
    });

    render();
    return {
      getState: () => ({ ...state }),
      reset,
      screenToWorld,
      setTool,
      setZoom,
      toggleGrid,
      zoomIn: () => setZoom(state.zoom * 1.15),
      zoomOut: () => setZoom(state.zoom / 1.15)
    };
  };
})();

