(() => {
  "use strict";

  window.NeuropixelWorkflow = window.NeuropixelWorkflow || {};

  window.NeuropixelWorkflow.createViewport = ({
    canvas,
    graphTransform,
    zoomLabel,
    cursorLabel,
    onViewChange
  }) => {
    const state = {
      zoom: 1,
      panX: 0,
      panY: 0,
      tool: "select",
      gridVisible: true,
      dragging: false,
      dragStartX: 0,
      dragStartY: 0,
      panStartX: 0,
      panStartY: 0,
      spaceHeld: false
    };

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function render() {
      canvas.style.setProperty("--grid-gap", `${22 * state.zoom}px`);
      canvas.style.setProperty("--grid-major", `${110 * state.zoom}px`);
      canvas.style.setProperty("--grid-x", `${state.panX}px`);
      canvas.style.setProperty("--grid-y", `${state.panY}px`);
      graphTransform.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.zoom})`;
      zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
      onViewChange?.({ ...state });
    }

    function screenToWorld(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - state.panX) / state.zoom,
        y: (clientY - rect.top - state.panY) / state.zoom
      };
    }

    function worldToScreen(x, y) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + state.panX + x * state.zoom,
        y: rect.top + state.panY + y * state.zoom
      };
    }

    function setZoom(nextZoom, clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const anchorX = clientX ?? rect.left + rect.width / 2;
      const anchorY = clientY ?? rect.top + rect.height / 2;
      const localX = anchorX - rect.left;
      const localY = anchorY - rect.top;
      const worldX = (localX - state.panX) / state.zoom;
      const worldY = (localY - state.panY) / state.zoom;

      state.zoom = clamp(nextZoom, 0.25, 2.5);
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
      document.querySelectorAll("[data-tool]").forEach((button) => {
        button.classList.toggle("active", button.dataset.tool === tool);
      });
      canvas.classList.toggle("pan-mode", tool === "pan" || state.spaceHeld);
    }

    function toggleGrid() {
      state.gridVisible = !state.gridVisible;
      canvas.classList.toggle("grid-hidden", !state.gridVisible);
      render();
      return state.gridVisible;
    }

    function updatePointer(event) {
      const position = screenToWorld(event.clientX, event.clientY);
      cursorLabel.innerHTML = `X ${Math.round(position.x)}&nbsp;&nbsp;Y ${Math.round(position.y)}`;
    }

    canvas.addEventListener("wheel", (event) => {
      if (event.target.closest(".node-palette, .inspector-panel")) return;
      event.preventDefault();
      setZoom(state.zoom * Math.exp(-event.deltaY * 0.0012), event.clientX, event.clientY);
    }, { passive: false });

    canvas.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".workflow-node, .node-palette, .inspector-panel")) return;
      const shouldPan = event.button === 1 || state.tool === "pan" || state.spaceHeld;
      if (!shouldPan) return;
      event.preventDefault();
      state.dragging = true;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      state.panStartX = state.panX;
      state.panStartY = state.panY;
      canvas.classList.add("panning");
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      updatePointer(event);
      if (!state.dragging) return;
      state.panX = state.panStartX + event.clientX - state.dragStartX;
      state.panY = state.panStartY + event.clientY - state.dragStartY;
      render();
    });

    function endPan(event) {
      if (!state.dragging) return;
      state.dragging = false;
      canvas.classList.remove("panning");
      if (event && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    }

    canvas.addEventListener("pointerup", endPan);
    canvas.addEventListener("pointercancel", endPan);

    document.addEventListener("keydown", (event) => {
      if (event.code !== "Space" || event.repeat || event.target.matches("input, select, textarea")) return;
      state.spaceHeld = true;
      canvas.classList.add("pan-mode");
      event.preventDefault();
    });

    document.addEventListener("keyup", (event) => {
      if (event.code !== "Space") return;
      state.spaceHeld = false;
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
      worldToScreen,
      zoomIn: () => setZoom(state.zoom * 1.15),
      zoomOut: () => setZoom(state.zoom / 1.15)
    };
  };
})();
