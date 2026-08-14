(() => {
  "use strict";

  const v1 = window.NeuropixelWorkflowV1;
  const shared = window.NeuropixelWorkflow;
  const registry = v1.registry;
  const canvas = document.getElementById("canvas");
  const graphTransform = document.getElementById("graph-transform");
  const toast = document.getElementById("toast");
  const emptyState = document.getElementById("empty-state");
  const inspectorPanel = document.getElementById("inspector-panel");
  const inspectorTitle = document.getElementById("inspector-title");
  const inspectorBody = document.getElementById("inspector-body");
  const folderInput = document.getElementById("kilosort-folder-input");
  const tooltipController = shared.attachAdaptiveTooltips(document.getElementById("tooltip"));
  let toastTimer = null;
  let folderTarget = null;
  let graph = null;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2300);
  }

  const viewport = v1.createViewport({
    canvas,
    graphTransform,
    zoomLabel: document.getElementById("zoom-value"),
    cursorLabel: document.getElementById("cursor-position"),
    onChange: () => graph?.updateAllConnections()
  });

  function updateStatus(state) {
    const nodeTotal = state.nodes.length;
    const connectionTotal = state.connections.length;
    document.getElementById("node-count").textContent = `${nodeTotal} NODE${nodeTotal === 1 ? "" : "S"}`;
    document.getElementById("connection-count").textContent = `${connectionTotal} CONNECTION${connectionTotal === 1 ? "" : "S"}`;
    emptyState.hidden = nodeTotal > 0;
  }

  function inspectorPorts(title, ports) {
    if (!ports.length) return "";
    return `<section><h3>${title}</h3>${ports.map((item) => `<div><span>${registry.escapeHtml(item.label)}</span><code>${registry.escapeHtml(item.type)}</code></div>`).join("")}</section>`;
  }

  function renderInspector(selection, value) {
    if (!selection || !value) {
      inspectorTitle.textContent = "Nothing selected";
      inspectorBody.innerHTML = `<p>Select a node to inspect its ports and display state.</p>`;
      return;
    }
    if (selection.kind === "connection") {
      inspectorTitle.textContent = value.mode === "exact" ? "Exact connection" : "Smart adapter";
      inspectorBody.innerHTML = `
        <p>${value.mode === "exact" ? "The output type matches the target input." : "Version 1.0.0 selected a compatible target input and inserted an implicit adapter boundary."}</p>
        <section><h3>Route</h3><div><span>${registry.escapeHtml(value.sourcePort)}</span><code>${registry.escapeHtml(value.targetPort)}</code></div></section>
        <span class="inspector-badge ${value.mode}">${value.mode.toUpperCase()}</span>`;
      return;
    }
    const definition = value.definition;
    inspectorTitle.textContent = definition.title;
    inspectorBody.innerHTML = `
      <p>${registry.escapeHtml(definition.description)}</p>
      <span class="inspector-badge">${registry.escapeHtml(value.density.toUpperCase())}${value.collapsed ? " · COLLAPSED" : ""}</span>
      ${inspectorPorts("Inputs", definition.inputs)}
      ${inspectorPorts("Outputs", definition.outputs)}
      <section><h3>Execution boundary</h3><div><span>UI interaction</span><code>available</code></div><div><span>Worker executor</span><code>not connected</code></div></section>`;
  }

  function cycle(current, values) {
    const index = values.indexOf(current);
    return values[(index + 1) % values.length];
  }

  function handleNodeAction(node, action, value) {
    if (action === "choose-folder") {
      folderTarget = node.id;
      folderInput.value = "";
      folderInput.click();
      return;
    }
    if (action === "add-entity") {
      const next = node.data.nextEntity || 1;
      const entities = [...(node.data.entities || []), { kind: value, label: `${value} ${next}` }];
      graph.updateNodeData(node.id, { entities, nextEntity: next + 1 });
      return;
    }
    if (action === "remove-entity") {
      const entities = [...(node.data.entities || [])];
      entities.splice(Number(value), 1);
      graph.updateNodeData(node.id, { entities });
      return;
    }
    if (action === "set-mode") {
      graph.updateNodeData(node.id, { mode: value });
      return;
    }
    if (action === "cycle-analysis") {
      graph.updateNodeData(node.id, { method: cycle(node.data.method, ["Neural overview", "Unit quality", "Population structure", "Pairwise timing"]) });
      return;
    }
    if (action === "cycle-view") {
      graph.updateNodeData(node.id, { mode: cycle(node.data.mode, ["AUTO", "RASTER", "TRACES", "WAVEFORMS", "TABLE", "EMBEDDING"]) });
      return;
    }
    if (action === "cycle-space") {
      graph.updateNodeData(node.id, { mode: cycle(node.data.mode, ["PROBE", "SHANKS", "CHANNELS", "ATLAS · FUTURE"]) });
      return;
    }
    if (action === "cycle-link") {
      graph.updateNodeData(node.id, { link: cycle(node.data.link, ["LINK A", "LINK B", "LINK C", "UNLINKED"]) });
      return;
    }
    if (action === "cycle-population") {
      graph.updateNodeData(node.id, { method: cycle(node.data.method, ["PCA", "FA", "UMAP", "CLUSTERING"]) });
      return;
    }
    if (action === "cycle-relationship") {
      graph.updateNodeData(node.id, { method: cycle(node.data.method, ["Pairwise timing", "Correlation", "CCG", "Event triggered", "GLM"]) });
      return;
    }
    showToast(`${node.definition.title} configuration remains open for the next revision`);
  }

  graph = v1.createGraph({
    canvas,
    nodeLayer: document.getElementById("node-layer"),
    connectionGroup: document.getElementById("connection-group"),
    previewPath: document.getElementById("connection-preview"),
    registry,
    viewport,
    onChange: updateStatus,
    onSelect: renderInspector,
    onToast: showToast,
    onNodeAction: handleNodeAction
  });

  const palette = v1.createPalette({
    panel: document.getElementById("node-palette"),
    list: document.getElementById("palette-list"),
    search: document.getElementById("node-search"),
    closeButton: document.getElementById("palette-close"),
    registry,
    canvas,
    viewport,
    onChoose: (type, point) => {
      graph.addNode(type, { x: point.x - 30, y: point.y - 24 });
      showToast(`${registry.get(type).title} added`);
    }
  });

  function closeMenus(exceptId) {
    document.querySelectorAll(".menu").forEach((menu) => {
      if (menu.id !== exceptId) menu.classList.remove("open");
    });
    document.querySelectorAll(".menu-trigger").forEach((trigger) => {
      if (trigger.dataset.menu !== exceptId) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function placeMenu(trigger, menu) {
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(6, Math.min(window.innerWidth - menuRect.width - 6, triggerRect.left))}px`;
    menu.style.top = `${triggerRect.bottom + 5}px`;
  }

  document.querySelectorAll("[data-menu]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      tooltipController.hide();
      palette.close();
      const menu = document.getElementById(trigger.dataset.menu);
      const open = !menu.classList.contains("open");
      closeMenus(open ? menu.id : undefined);
      menu.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
      if (open) placeMenu(trigger, menu);
    });
  });
  document.querySelectorAll(".menu").forEach((menu) => menu.addEventListener("click", (event) => event.stopPropagation()));

  document.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => viewport.setTool(button.dataset.tool)));
  document.querySelectorAll("[data-shell-action]").forEach((button) => button.addEventListener("click", () => {
    showToast(`${button.dataset.shellAction} is reserved for workflow JSON history`);
    closeMenus();
  }));

  function resetView() {
    viewport.reset();
    graph.updateAllConnections();
    showToast("View reset to 100%");
    closeMenus();
  }

  function toggleGrid() {
    const visible = viewport.toggleGrid();
    document.getElementById("grid-check").textContent = visible ? "✓" : "";
    showToast(visible ? "Grid shown" : "Grid hidden");
    closeMenus();
  }

  function applyTheme(theme, persist = true) {
    const next = theme === "classic" ? "classic" : "graphite";
    document.body.dataset.theme = next;
    document.getElementById("theme-name").textContent = next === "graphite" ? "Graphite" : "Classic";
    if (persist) {
      try { localStorage.setItem("neuropixel-workflow-v1-theme", next); } catch { /* local file privacy mode */ }
    }
  }

  document.getElementById("add-node-button").addEventListener("click", () => {
    const buttonRect = document.getElementById("add-node-button").getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const center = viewport.screenToWorld(canvasRect.left + canvasRect.width / 2, canvasRect.top + canvasRect.height / 2);
    palette.openAt(buttonRect.right + 8, buttonRect.top, center);
  });
  document.getElementById("zoom-in").addEventListener("click", viewport.zoomIn);
  document.getElementById("zoom-out").addEventListener("click", viewport.zoomOut);
  document.getElementById("reset-view").addEventListener("click", resetView);
  document.getElementById("menu-reset-view").addEventListener("click", resetView);
  document.getElementById("menu-toggle-grid").addEventListener("click", toggleGrid);
  document.getElementById("toggle-grid").addEventListener("click", toggleGrid);
  document.getElementById("menu-toggle-theme").addEventListener("click", () => {
    applyTheme(document.body.dataset.theme === "graphite" ? "classic" : "graphite");
    closeMenus();
  });
  document.getElementById("delete-selection").addEventListener("click", () => {
    if (!graph.deleteSelection()) showToast("Nothing selected");
    closeMenus();
  });
  document.getElementById("inspector-tab").addEventListener("click", () => {
    inspectorPanel.classList.add("open");
    inspectorPanel.setAttribute("aria-hidden", "false");
  });
  document.getElementById("inspector-close").addEventListener("click", () => {
    inspectorPanel.classList.remove("open");
    inspectorPanel.setAttribute("aria-hidden", "true");
  });
  document.getElementById("menu-add-experiment").addEventListener("click", () => {
    const rect = canvas.getBoundingClientRect();
    const center = viewport.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    graph.addNode("experiment", { x: center.x - 130, y: center.y - 100 });
    closeMenus();
  });
  document.getElementById("new-workflow").addEventListener("click", () => {
    if (graph.snapshot().nodes.length && !window.confirm("Clear the version 1.0.0 workflow?")) return;
    graph.clear();
    closeMenus();
  });

  canvas.addEventListener("dblclick", (event) => {
    if (event.target.closest(".workflow-node, .node-palette, .side-panel")) return;
    palette.openAt(event.clientX, event.clientY, viewport.screenToWorld(event.clientX, event.clientY));
  });

  folderInput.addEventListener("change", () => {
    const files = [...folderInput.files];
    if (!files.length || !folderTarget) return;
    const folderName = (files[0].webkitRelativePath || files[0].name).split("/")[0];
    const names = new Set(files.map((file) => file.name.toLowerCase()));
    const missing = ["spike_times.npy", "spike_clusters.npy", "params.py"].filter((name) => !names.has(name));
    graph.updateNodeData(folderTarget, {
      folderName,
      fileCount: files.length,
      audit: missing.length ? `MISSING ${missing.length}` : "SCHEMA READY",
      auditTone: missing.length ? "warning" : "ready"
    });
    showToast(missing.length ? `Missing required files: ${missing.join(", ")}` : `${files.length} files indexed; required Kilosort files found`);
    folderTarget = null;
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea")) return;
    if (event.key.toLowerCase() === "v") viewport.setTool("select");
    if (event.key.toLowerCase() === "h") viewport.setTool("pan");
    if (event.key.toLowerCase() === "f") resetView();
    if (event.key.toLowerCase() === "g") toggleGrid();
    if ((event.key === "Delete" || event.key === "Backspace") && graph.deleteSelection()) event.preventDefault();
    if (event.key === "Escape") {
      closeMenus();
      palette.close();
      tooltipController.hide();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu, [data-menu]")) closeMenus();
  });

  let storedTheme = "graphite";
  try { storedTheme = localStorage.getItem("neuropixel-workflow-v1-theme") || "graphite"; } catch { storedTheme = "graphite"; }
  applyTheme(storedTheme, false);

  const source = graph.addNode("experiment", { x: 86, y: 112 });
  const analysis = graph.addNode("analyze", { x: 430, y: 102 }, {}, { density: "compact" });
  const viewer = graph.addNode("viewer", { x: 744, y: 58 }, {}, { density: "standard" });
  const spatial = graph.addNode("spatial-viewer", { x: 790, y: 390 }, {}, { density: "compact" });
  graph.addConnection(source.id, "data", viewer.id, "view-a");
  graph.addConnection(source.id, "data", analysis.id, "data");
  graph.addConnection(analysis.id, "result", viewer.id, "view-b");
  graph.addConnection(source.id, "geometry", spatial.id, "data");
  graph.clearSelection();
  updateStatus(graph.snapshot());
})();
