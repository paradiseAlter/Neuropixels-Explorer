(() => {
  "use strict";

  const app = window.NeuropixelWorkflow;
  const registry = app.nodeRegistry;
  const canvas = document.getElementById("canvas");
  const workspace = document.getElementById("workspace");
  const graphTransform = document.getElementById("graph-transform");
  const tooltipElement = document.getElementById("tooltip");
  const toast = document.getElementById("toast");
  const gridButton = document.getElementById("toggle-grid");
  const gridCheck = document.getElementById("grid-check");
  const themeName = document.getElementById("theme-name");
  const emptyState = document.getElementById("empty-state");
  const nodeCount = document.getElementById("node-count");
  const connectionCount = document.getElementById("connection-count");
  const inspectorPanel = document.getElementById("inspector-panel");
  const inspectorTitle = document.getElementById("inspector-title");
  const inspectorBody = document.getElementById("inspector-body");
  const folderInput = document.getElementById("kilosort-folder-input");
  let toastTimer = null;
  let folderTargetNodeId = null;

  const tooltips = app.attachAdaptiveTooltips(tooltipElement);
  const viewport = app.createViewport({
    canvas,
    graphTransform,
    zoomLabel: document.getElementById("zoom-value"),
    cursorLabel: document.getElementById("cursor-position")
  });

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function updateStatus(snapshot) {
    const nodes = snapshot.nodes.length;
    const connections = snapshot.connections.length;
    nodeCount.textContent = `${nodes} NODE${nodes === 1 ? "" : "S"}`;
    connectionCount.textContent = `${connections} CONNECTION${connections === 1 ? "" : "S"}`;
    emptyState.hidden = nodes > 0;
  }

  function portInspectorMarkup(label, ports) {
    if (!ports.length) return "";
    return `
      <section class="inspector-section">
        <h3>${label}</h3>
        ${ports.map((port) => `
          <div class="inspector-port">
            <span>${registry.escapeHtml(port.label)}</span>
            <code>${registry.escapeHtml(port.type)}</code>
          </div>`).join("")}
      </section>`;
  }

  function renderInspector(selection, value) {
    if (!selection || !value) {
      inspectorTitle.textContent = "Nothing selected";
      inspectorBody.innerHTML = `<p class="inspector-empty">Select a node to inspect its purpose, ports, and prototype status.</p>`;
      return;
    }

    if (selection.kind === "connection") {
      inspectorTitle.textContent = "Connection";
      inspectorBody.innerHTML = `
        <p class="inspector-description">A typed data connection in the visible semantic graph.</p>
        <section class="inspector-section">
          <h3>Route</h3>
          <div class="inspector-port"><span>${registry.escapeHtml(value.sourcePort)}</span><code>${registry.escapeHtml(value.targetPort)}</code></div>
        </section>
        <section class="inspector-section">
          <h3>Prototype status</h3>
          <span class="inspector-badge">UI CONNECTION ONLY</span>
        </section>`;
      return;
    }

    const definition = value.definition;
    inspectorTitle.textContent = definition.title;
    inspectorBody.innerHTML = `
      <p class="inspector-description">${registry.escapeHtml(definition.description)}</p>
      <span class="inspector-badge">${registry.escapeHtml(definition.category.toUpperCase())} · ${registry.escapeHtml(definition.code)}</span>
      ${portInspectorMarkup("Inputs", definition.inputs)}
      ${portInspectorMarkup("Outputs", definition.outputs)}
      <section class="inspector-section">
        <h3>Execution</h3>
        <div class="inspector-port"><span>UI renderer</span><code>available</code></div>
        <div class="inspector-port"><span>Worker executor</span><code>not connected</code></div>
        <div class="inspector-port"><span>Schema version</span><code>prototype.1</code></div>
      </section>`;
  }

  function handleNodeAction(node, action, value) {
    if (action === "choose-folder") {
      folderTargetNodeId = node.id;
      folderInput.value = "";
      folderInput.click();
      return;
    }

    if (action === "set-mode") {
      graph.updateNodeData(node.id, { mode: value });
      showToast(`Auto Analysis mode: ${value}`);
      return;
    }

    if (action === "cycle-view") {
      const modes = ["AUTO VIEW", "SPIKE RASTER", "RATE TRACES", "WAVEFORMS", "HEATMAP"];
      const index = modes.indexOf(node.data.viewMode);
      graph.updateNodeData(node.id, { viewMode: modes[(index + 1) % modes.length] });
      return;
    }

    if (action === "cycle-space") {
      const modes = ["PROBE", "SHANKS", "CHANNELS", "ATLAS · FUTURE"];
      const index = modes.indexOf(node.data.mode);
      graph.updateNodeData(node.id, { mode: modes[(index + 1) % modes.length] });
      return;
    }

    if (action === "cycle-link") {
      const groups = ["LINK A", "LINK B", "LINK C", "UNLINKED"];
      const index = groups.indexOf(node.data.linkGroup);
      graph.updateNodeData(node.id, { linkGroup: groups[(index + 1) % groups.length] });
      return;
    }

    const messages = {
      "configure-selection": "Selection groups will become functional with Kilosort parsing",
      "configure": `${node.definition.title} settings are intentionally open for the next design revision`,
      "options": "Node rename, duplicate, collapse, and advanced ports are reserved for the next revision"
    };
    showToast(messages[action] || `${node.definition.title}: ${action}`);
  }

  const graph = app.createGraph({
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

  const palette = app.createNodePalette({
    panel: document.getElementById("node-palette"),
    list: document.getElementById("palette-list"),
    search: document.getElementById("node-search"),
    closeButton: document.getElementById("palette-close"),
    registry,
    canvas,
    viewport,
    onChoose: (type, position) => {
      graph.addNode(type, { x: position.x - 20, y: position.y - 20 });
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
    const margin = 6;
    const left = Math.min(window.innerWidth - menuRect.width - margin, Math.max(margin, triggerRect.left));
    const below = triggerRect.bottom + 5;
    const top = below + menuRect.height <= window.innerHeight - margin
      ? below
      : Math.max(margin, triggerRect.top - menuRect.height - 5);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  document.querySelectorAll("[data-menu]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      tooltips.hide();
      palette.close();
      const menu = document.getElementById(trigger.dataset.menu);
      const willOpen = !menu.classList.contains("open");
      closeMenus(willOpen ? menu.id : undefined);
      menu.classList.toggle("open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) placeMenu(trigger, menu);
    });
  });

  document.querySelectorAll(".menu").forEach((menu) => {
    menu.addEventListener("click", (event) => event.stopPropagation());
  });

  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => viewport.setTool(button.dataset.tool));
  });

  document.querySelectorAll("[data-shell-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.shellAction;
      const messages = {
        "Open workflow": "Workflow JSON import is reserved for the execution-model stage",
        "Save workflow": "Workflow JSON export is reserved for the execution-model stage",
        "Undo": "Undo history is not connected in this interaction prototype",
        "Redo": "Redo history is not connected in this interaction prototype",
        "Select all": "Multi-selection is reserved for the next canvas revision",
        "Frame tool": "Frames are reserved for the next canvas revision"
      };
      showToast(messages[action] || `${action} is not available in this prototype`);
      closeMenus();
    });
  });

  function resetView() {
    viewport.reset();
    graph.updateAllConnections();
    showToast("View reset to 100%");
    closeMenus();
  }

  function toggleGrid() {
    const visible = viewport.toggleGrid();
    gridButton.classList.toggle("active", visible);
    gridButton.setAttribute("aria-pressed", String(visible));
    gridCheck.textContent = visible ? "✓" : "";
    showToast(visible ? "Dot grid shown" : "Dot grid hidden");
    closeMenus();
  }

  function applyTheme(theme, persist = true) {
    const next = theme === "classic" ? "classic" : "graphite";
    document.body.dataset.theme = next;
    themeName.textContent = next === "graphite" ? "Graphite" : "Classic";
    if (!persist) return;
    try {
      localStorage.setItem("neuropixel-workflow-theme", next);
    } catch {
      // File URLs can disable storage in privacy-focused browser modes.
    }
  }

  function toggleTheme() {
    const next = document.body.dataset.theme === "graphite" ? "classic" : "graphite";
    applyTheme(next);
    showToast(next === "graphite" ? "Graphite canvas active" : "Classic canvas active");
    closeMenus();
  }

  function openPaletteFromButton() {
    const buttonRect = document.getElementById("add-node-button").getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const center = viewport.screenToWorld(
      canvasRect.left + canvasRect.width / 2,
      canvasRect.top + canvasRect.height / 2
    );
    palette.openAt(buttonRect.right + 9, buttonRect.top, center);
  }

  function openInspector() {
    inspectorPanel.classList.add("open");
    inspectorPanel.setAttribute("aria-hidden", "false");
  }

  document.getElementById("add-node-button").addEventListener("click", openPaletteFromButton);
  document.getElementById("inspector-tab").addEventListener("click", openInspector);
  document.getElementById("inspector-close").addEventListener("click", () => {
    inspectorPanel.classList.remove("open");
    inspectorPanel.setAttribute("aria-hidden", "true");
  });
  document.getElementById("zoom-in").addEventListener("click", viewport.zoomIn);
  document.getElementById("zoom-out").addEventListener("click", viewport.zoomOut);
  document.getElementById("reset-view").addEventListener("click", resetView);
  document.getElementById("menu-reset-view").addEventListener("click", resetView);
  document.getElementById("menu-toggle-grid").addEventListener("click", toggleGrid);
  document.getElementById("menu-toggle-theme").addEventListener("click", toggleTheme);
  gridButton.addEventListener("click", toggleGrid);
  document.getElementById("delete-selection").addEventListener("click", () => {
    if (!graph.deleteSelection()) showToast("Nothing selected");
    closeMenus();
  });

  document.getElementById("menu-add-experiment").addEventListener("click", () => {
    const rect = canvas.getBoundingClientRect();
    const center = viewport.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    graph.addNode("experiment-data", { x: center.x - 140, y: center.y - 110 });
    closeMenus();
  });

  document.getElementById("new-workflow").addEventListener("click", () => {
    if (graph.getSnapshot().nodes.length && !window.confirm("Clear this prototype workflow?")) return;
    graph.clear();
    closeMenus();
    showToast("New empty workflow");
  });

  canvas.addEventListener("dblclick", (event) => {
    if (event.target.closest(".workflow-node, .node-palette, .inspector-panel")) return;
    const world = viewport.screenToWorld(event.clientX, event.clientY);
    palette.openAt(event.clientX, event.clientY, world);
  });

  folderInput.addEventListener("change", () => {
    const files = [...folderInput.files];
    if (!files.length || !folderTargetNodeId) return;
    const relativePath = files[0].webkitRelativePath || files[0].name;
    const folderName = relativePath.split("/")[0] || "Selected folder";
    const names = new Set(files.map((file) => file.name.toLowerCase()));
    const required = ["spike_times.npy", "spike_clusters.npy", "params.py"];
    const missing = required.filter((name) => !names.has(name));

    graph.updateNodeData(folderTargetNodeId, {
      folderName,
      fileCount: files.length,
      auditState: missing.length ? `MISSING ${missing.length} REQUIRED` : "SCHEMA READY",
      auditTone: missing.length ? "warning" : "ready",
      scope: "Units · ready to enumerate"
    });
    showToast(missing.length
      ? `Folder indexed; missing ${missing.join(", ")}`
      : `Folder indexed: ${files.length} files; required Kilosort files found`);
    folderTargetNodeId = null;
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea")) return;
    const key = event.key.toLowerCase();
    if (key === "v") viewport.setTool("select");
    if (key === "h") viewport.setTool("pan");
    if (key === "f") resetView();
    if (key === "g") toggleGrid();
    if ((event.key === "Delete" || event.key === "Backspace") && graph.deleteSelection()) {
      event.preventDefault();
    }
    if (event.key === "Escape") {
      closeMenus();
      palette.close();
      tooltips.hide();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu, [data-menu]")) closeMenus();
  });
  window.addEventListener("resize", closeMenus);

  let storedTheme = "graphite";
  try {
    storedTheme = localStorage.getItem("neuropixel-workflow-theme") || "graphite";
  } catch {
    storedTheme = "graphite";
  }
  applyTheme(storedTheme, false);

  const source = graph.addNode("experiment-data", { x: 92, y: 118 });
  const analysis = graph.addNode("auto-analysis", { x: 425, y: 118 });
  const neuralView = graph.addNode("neural-viewer", { x: 755, y: 44 });
  const spatialView = graph.addNode("spatial-viewer", { x: 785, y: 365 });
  graph.addConnection(source.id, "bundle", analysis.id, "data");
  graph.addConnection(analysis.id, "analysis", neuralView.id, "data");
  graph.addConnection(analysis.id, "analysis", spatialView.id, "data");
  graph.clearSelection();
  updateStatus(graph.getSnapshot());
})();
