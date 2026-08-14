(() => {
  "use strict";

  const app = window.NeuropixelWorkflowV11;
  const registry = app.registry;
  const canvas = document.getElementById("canvas");
  const graphTransform = document.getElementById("graph-transform");
  const toast = document.getElementById("toast");
  const emptyState = document.getElementById("empty-state");
  const inspectorPanel = document.getElementById("inspector-panel");
  const inspectorTitle = document.getElementById("inspector-title");
  const inspectorBody = document.getElementById("inspector-body");
  const folderInput = document.getElementById("kilosort-folder-input");
  const logDrawer = document.getElementById("log-drawer");
  const logBody = document.getElementById("log-body");
  const logSummary = document.getElementById("log-summary");
  const threadState = document.getElementById("thread-state");
  let toastTimer = null;
  let folderTarget = null;
  let graph = null;
  let syncQueued = false;
  let logEntries = [];

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function timeStamp() {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
  }

  function renderLog() {
    const fragment = document.createDocumentFragment();
    logEntries.slice(-250).forEach((entry) => {
      const line = document.createElement("div");
      line.className = `log-line ${entry.level}`;
      const time = document.createElement("time");
      time.textContent = entry.time;
      const level = document.createElement("span");
      level.textContent = entry.level.toUpperCase();
      const message = document.createElement("p");
      message.textContent = entry.message;
      line.append(time, level, message);
      fragment.appendChild(line);
    });
    logBody.replaceChildren(fragment);
    logBody.scrollTop = logBody.scrollHeight;
  }

  function appendLog(level, message) {
    logEntries.push({ time: timeStamp(), level, message });
    if (logEntries.length > 1000) logEntries.splice(0, logEntries.length - 1000);
    renderLog();
  }

  function clearLog() {
    logEntries = [{ time: timeStamp(), level: "info", message: "Log cleared. Select a Kilosort folder to start a new structure check." }];
    logSummary.textContent = "STRUCTURE CHECK READY";
    renderLog();
  }

  function setLogOpen(open) {
    logDrawer.classList.toggle("open", open);
    document.getElementById("log-toggle").setAttribute("aria-expanded", String(open));
    document.getElementById("status-log-toggle").textContent = open ? "LOG OPEN" : "LOG CLOSED";
    document.getElementById("log-check").textContent = open ? "✓" : "";
    requestAnimationFrame(() => graph?.updateAllConnections());
  }

  function attachAdaptiveTooltips() {
    const tooltip = document.getElementById("tooltip");
    const margin = 8;
    const gap = 8;
    let active = null;
    let timer = null;

    function candidate(placement, targetRect, tipRect) {
      const centerX = targetRect.left + targetRect.width / 2;
      const centerY = targetRect.top + targetRect.height / 2;
      if (placement === "top") return { x: centerX - tipRect.width / 2, y: targetRect.top - tipRect.height - gap };
      if (placement === "left") return { x: targetRect.left - tipRect.width - gap, y: centerY - tipRect.height / 2 };
      if (placement === "right") return { x: targetRect.right + gap, y: centerY - tipRect.height / 2 };
      return { x: centerX - tipRect.width / 2, y: targetRect.bottom + gap };
    }

    function score(position, tipRect) {
      return Math.max(0, margin - position.x)
        + Math.max(0, position.x + tipRect.width - (window.innerWidth - margin))
        + Math.max(0, margin - position.y)
        + Math.max(0, position.y + tipRect.height - (window.innerHeight - margin));
    }

    function place(target) {
      const targetRect = target.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      const preferred = target.dataset.tooltipPlacement || "bottom";
      const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" };
      const placements = [...new Set([preferred, opposite[preferred], "right", "left", "bottom", "top"])]
        .map((placement) => ({ placement, ...candidate(placement, targetRect, tipRect) }))
        .map((position) => ({ ...position, score: score(position, tipRect) }))
        .sort((a, b) => a.score - b.score);
      const best = placements[0];
      tooltip.style.left = `${clamp(best.x, margin, Math.max(margin, window.innerWidth - tipRect.width - margin))}px`;
      tooltip.style.top = `${clamp(best.y, margin, Math.max(margin, window.innerHeight - tipRect.height - margin))}px`;
    }

    function hide() {
      window.clearTimeout(timer);
      active = null;
      tooltip.classList.remove("show");
    }

    document.querySelectorAll("[data-tooltip]").forEach((target) => {
      target.addEventListener("pointerenter", () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          active = target;
          tooltip.textContent = target.dataset.tooltip;
          tooltip.classList.add("show");
          requestAnimationFrame(() => place(target));
        }, 260);
      });
      target.addEventListener("pointerleave", hide);
      target.addEventListener("focus", () => {
        active = target;
        tooltip.textContent = target.dataset.tooltip;
        tooltip.classList.add("show");
        requestAnimationFrame(() => place(target));
      });
      target.addEventListener("blur", hide);
    });
    window.addEventListener("resize", () => active && place(active));
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function updateStatus(state) {
    const nodeTotal = state.nodes.length;
    const connectionTotal = state.connections.length;
    document.getElementById("node-count").textContent = `${nodeTotal} NODE${nodeTotal === 1 ? "" : "S"}`;
    document.getElementById("connection-count").textContent = `${connectionTotal} CONNECTION${connectionTotal === 1 ? "" : "S"}`;
    emptyState.hidden = nodeTotal > 0;
  }

  function inspectorPorts(title, ports) {
    if (!ports.length) return "";
    return `<section><h3>${title}</h3>${ports.map((item) => `
      <div><span>${registry.escapeHtml(item.label)}</span><code>${registry.escapeHtml(item.type)}</code></div>`).join("")}</section>`;
  }

  function renderInspector(selection, value) {
    if (!selection || !value) {
      inspectorTitle.textContent = "Nothing selected";
      inspectorBody.innerHTML = `<p>Select a node to inspect its typed contracts and display state.</p>`;
      return;
    }
    if (selection.kind === "connection") {
      const source = graph.getNode(value.sourceNode);
      const target = graph.getNode(value.targetNode);
      const output = source?.definition.outputs.find((port) => port.id === value.sourcePort);
      const input = target?.definition.inputs.find((port) => port.id === value.targetPort);
      inspectorTitle.textContent = value.mode === "exact" ? "Exact connection" : "Smart route";
      inspectorBody.innerHTML = `
        <p>${value.mode === "exact" ? "The output contract matches the selected input." : "A broad compatible input accepts this typed output."}</p>
        <section><h3>Route</h3><div><span>${registry.escapeHtml(source?.definition.title || value.sourceNode)} · ${registry.escapeHtml(output?.label || value.sourcePort)}</span><code>${registry.escapeHtml(output?.type || "?")}</code></div><div><span>${registry.escapeHtml(target?.definition.title || value.targetNode)} · ${registry.escapeHtml(input?.label || value.targetPort)}</span><code>${registry.escapeHtml(input?.type || "?")}</code></div></section>
        <span class="inspector-badge ${value.mode}">${value.mode.toUpperCase()}</span>`;
      return;
    }
    const definition = value.definition;
    inspectorTitle.textContent = definition.title;
    inspectorBody.innerHTML = `
      <p>${registry.escapeHtml(definition.description)}</p>
      <span class="inspector-badge">${value.detailed ? "DETAILED" : "COMPACT"}</span>
      ${inspectorPorts("Inputs", definition.inputs)}
      ${inspectorPorts("Outputs", definition.outputs)}
      <section><h3>Execution boundary</h3><div><span>UI interaction</span><code>available</code></div><div><span>Array parsing / workers</span><code>not connected</code></div></section>`;
  }

  const viewport = app.createViewport({
    canvas,
    graphTransform,
    zoomLabel: document.getElementById("zoom-value"),
    cursorLabel: document.getElementById("cursor-position"),
    onChange: () => graph?.updateAllConnections()
  });

  function resolveViewMode(outputs, sourcePort) {
    if (sourcePort === "geometry" || outputs.includes("ProbeGeometry") || outputs.includes("SpikePositions")) {
      if (!outputs.includes("SpikeEvents") || sourcePort === "geometry") return "Probe";
    }
    if (sourcePort === "entities" && outputs.includes("TemplateWaveforms") && !outputs.includes("SpikeEvents")) return "Waveform";
    if (outputs.includes("SpikeEvents")) return "Raster";
    if (outputs.includes("TemplateWaveforms")) return "Waveform";
    if (outputs.includes("ProbeGeometry")) return "Probe";
    return "Raster";
  }

  function syncViewerInputs() {
    syncQueued = false;
    const allConnections = graph.getConnections();
    graph.getNodes().filter((node) => node.type === "viewer").forEach((viewer) => {
      const incoming = allConnections.filter((connection) => connection.targetNode === viewer.id && ["primary", "compare"].includes(connection.targetPort));
      if (!incoming.length) {
        if (viewer.data.sourceSignature !== "demo") {
          graph.updateNodeData(viewer.id, { ...viewer.definition.defaultData, sourceSignature: "demo" }, { notify: false });
        }
        return;
      }

      const sources = incoming.map((connection) => ({ connection, node: graph.getNode(connection.sourceNode) })).filter((entry) => entry.node);
      const experimentSources = sources.filter((entry) => entry.node.type === "experiment");
      const entities = experimentSources.flatMap((entry) => entry.node.data.entities || []);
      const outputs = [...new Set(experimentSources.flatMap((entry) => entry.node.data.availableOutputs || []))];
      const labels = sources.map((entry) => entry.node.type === "experiment" ? entry.node.data.folderName : entry.node.definition.title);
      const sourceState = experimentSources.length
        ? (experimentSources.every((entry) => entry.node.data.loaded) ? "INDEXED" : "WAITING")
        : "ROUTED";
      const resolvedMode = resolveViewMode(outputs, incoming[0]?.sourcePort);
      const signature = JSON.stringify({
        sources: sources.map((entry) => [entry.node.id, entry.connection.sourcePort]),
        entities: entities.map((entity) => `${entity.kind}:${entity.label}`),
        outputs,
        sourceState,
        labels
      });
      if (signature === viewer.data.sourceSignature) return;

      graph.updateNodeData(viewer.id, {
        sourceSignature: signature,
        sourceLabel: labels.length === 1 ? labels[0] : `${labels.length} connected sources`,
        sourceState,
        sourceEntities: entities,
        availableOutputs: outputs,
        resolvedMode
      }, { notify: false });
    });
  }

  function queueViewerSync() {
    if (syncQueued) return;
    syncQueued = true;
    queueMicrotask(syncViewerInputs);
  }

  graph = app.createGraph({
    canvas,
    nodeLayer: document.getElementById("node-layer"),
    connectionGroup: document.getElementById("connection-group"),
    previewPath: document.getElementById("connection-preview"),
    registry,
    viewport,
    onChange: (state, meta) => {
      updateStatus(state);
      if (["connection", "data", "delete", "clear"].includes(meta?.reason)) queueViewerSync();
    },
    onSelect: renderInspector,
    onToast: showToast,
    onNodeRendered: (node) => {
      if (node.type === "viewer") app.viewerController.attach(node, (nodeId, patch, options) => graph.updateNodeData(nodeId, patch, options));
    },
    onNodeAction: (node, action, value) => {
      if (action === "choose-folder") {
        folderTarget = node.id;
        folderInput.value = "";
        folderInput.click();
        return;
      }
      if (action === "add-entity") {
        const counters = { ...(node.data.nextEntity || {}) };
        const next = counters[value] || 1;
        counters[value] = next + 1;
        graph.updateNodeData(node.id, {
          entities: [...(node.data.entities || []), { kind: value, label: `${value} ${next}` }],
          nextEntity: counters
        });
        showToast(`${value} ${next} added to this collection`);
        return;
      }
      if (action === "remove-entity") {
        const index = Number(value);
        graph.updateNodeData(node.id, { entities: (node.data.entities || []).filter((_, itemIndex) => itemIndex !== index) });
        return;
      }
      if (action === "set-view-mode") {
        graph.updateNodeData(node.id, { mode: value });
      }
    }
  });

  const palette = app.createPalette({
    panel: document.getElementById("node-palette"),
    list: document.getElementById("palette-list"),
    search: document.getElementById("node-search"),
    closeButton: document.getElementById("palette-close"),
    registry,
    canvas,
    viewport,
    onChoose: (type, point) => graph.addNode(type, point, {}, { detailed: type !== "analyze" })
  });

  folderInput.addEventListener("change", () => {
    const node = graph.getNode(folderTarget);
    const files = [...folderInput.files];
    if (!node || node.type !== "experiment" || !files.length) return;
    threadState.textContent = "INDEXING FILE NAMES";
    setLogOpen(true);
    appendLog("info", `Scanning ${files.length} file names from the selected folder. Array bytes are not being parsed.`);
    const result = app.kilosortQc.audit(files);
    result.auditFiles.forEach((item) => {
      const level = item.status === "pass" ? "pass" : item.status === "error" ? "error" : item.status === "warn" ? "warn" : "skip";
      appendLog(level, `${item.name}: ${item.note}${item.path && item.path !== item.name ? ` · ${item.path}` : ""}`);
    });
    appendLog(result.valid ? "pass" : "error", result.conclusion);
    if (result.availableOutputs.length) appendLog("info", `Available outputs: ${result.availableOutputs.join(", ")}.`);
    logSummary.textContent = result.valid
      ? `PASS · ${result.availableOutputs.length} OUTPUTS · ${result.ignoredCount} IGNORED`
      : `FAILED · ${result.errors.length} ERRORS`;
    graph.updateNodeData(node.id, {
      loaded: result.valid,
      folderName: result.folderName,
      folderPath: result.firstPath || result.folderName,
      fileCount: result.fileCount,
      audit: result.valid ? "QC PASSED" : "QC FAILED",
      auditTone: result.valid ? "ready" : "error",
      availableOutputs: result.availableOutputs,
      auditFiles: result.auditFiles,
      auditSummary: result.conclusion
    });
    threadState.textContent = "UI THREAD IDLE";
    showToast(result.valid ? "Kilosort structure check passed" : `Structure check found ${result.errors.length} error${result.errors.length === 1 ? "" : "s"}`);
  });

  document.querySelectorAll(".menu-trigger").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const target = document.getElementById(trigger.dataset.menu);
      const willOpen = !target.classList.contains("open");
      document.querySelectorAll(".menu.open").forEach((menu) => menu.classList.remove("open"));
      document.querySelectorAll(".menu-trigger").forEach((button) => button.setAttribute("aria-expanded", "false"));
      target.classList.toggle("open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".menu")) return;
    document.querySelectorAll(".menu.open").forEach((menu) => menu.classList.remove("open"));
    document.querySelectorAll(".menu-trigger").forEach((button) => button.setAttribute("aria-expanded", "false"));
  });

  document.querySelectorAll("[data-shell-action]").forEach((button) => button.addEventListener("click", () => showToast(`${button.dataset.shellAction} is reserved for a later version`)));
  document.getElementById("new-workflow").addEventListener("click", () => {
    graph.clear();
    appendLog("info", "Started an empty workflow. No disk data was changed.");
  });
  document.getElementById("delete-selection").addEventListener("click", () => graph.deleteSelection());
  document.getElementById("menu-add-data").addEventListener("click", () => graph.addNode("experiment", viewport.screenToWorld(180, 150), {}, { detailed: true }));
  document.getElementById("menu-add-viewer").addEventListener("click", () => graph.addNode("viewer", viewport.screenToWorld(520, 150), {}, { detailed: true }));

  document.getElementById("add-node-button").addEventListener("click", (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    palette.openAt(rect.right + 10, rect.top, viewport.screenToWorld(rect.right + 70, rect.top + 20));
  });
  canvas.addEventListener("dblclick", (event) => {
    if (event.target.closest(".workflow-node, [data-interactive]")) return;
    palette.openAt(event.clientX, event.clientY);
  });

  document.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => viewport.setTool(button.dataset.tool)));
  document.getElementById("zoom-in").addEventListener("click", viewport.zoomIn);
  document.getElementById("zoom-out").addEventListener("click", viewport.zoomOut);
  document.getElementById("reset-view").addEventListener("click", viewport.reset);
  document.getElementById("menu-reset-view").addEventListener("click", viewport.reset);
  const toggleGrid = () => {
    const visible = viewport.toggleGrid();
    document.getElementById("grid-check").textContent = visible ? "✓" : "";
    document.getElementById("toggle-grid").textContent = visible ? "GRID 22" : "GRID OFF";
  };
  document.getElementById("toggle-grid").addEventListener("click", toggleGrid);
  document.getElementById("menu-toggle-grid").addEventListener("click", toggleGrid);

  document.getElementById("inspector-tab").addEventListener("click", () => {
    const open = !inspectorPanel.classList.contains("open");
    inspectorPanel.classList.toggle("open", open);
    inspectorPanel.setAttribute("aria-hidden", String(!open));
  });
  document.getElementById("inspector-close").addEventListener("click", () => {
    inspectorPanel.classList.remove("open");
    inspectorPanel.setAttribute("aria-hidden", "true");
  });

  const toggleLog = () => setLogOpen(!logDrawer.classList.contains("open"));
  document.getElementById("log-toggle").addEventListener("click", toggleLog);
  document.getElementById("status-log-toggle").addEventListener("click", toggleLog);
  document.getElementById("menu-toggle-log").addEventListener("click", toggleLog);
  document.getElementById("clear-log").addEventListener("click", clearLog);
  document.getElementById("copy-log").addEventListener("click", async () => {
    const text = logEntries.map((entry) => `${entry.time} ${entry.level.toUpperCase()} ${entry.message}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast("Load log copied");
    } catch {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
      showToast("Load log copied");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea")) return;
    if (event.key === "Delete" || event.key === "Backspace") graph.deleteSelection();
    if (event.key.toLowerCase() === "f") viewport.reset();
    if (event.key.toLowerCase() === "g") toggleGrid();
    if (event.key.toLowerCase() === "l") toggleLog();
    if (event.key.toLowerCase() === "v") viewport.setTool("select");
    if (event.key.toLowerCase() === "h") viewport.setTool("pan");
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
      event.preventDefault();
      graph.clear();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      showToast("Workflow persistence is reserved for a later version");
    }
  });

  clearLog();
  attachAdaptiveTooltips();

  const dataNode = graph.addNode("experiment", { x: 92, y: 78 }, {
    entities: [
      { kind: "Unit", label: "Unit 14" },
      { kind: "Unit", label: "Unit 27" },
      { kind: "Unit", label: "Unit 41" },
      { kind: "Unit", label: "Unit 52" }
    ],
    nextEntity: { Unit: 53, Channel: 1, Template: 1 }
  }, { detailed: true });
  const viewerNode = graph.addNode("viewer", { x: 560, y: 62 }, {}, { detailed: true });
  const analyzeNode = graph.addNode("analyze", { x: 1248, y: 136 }, {}, { detailed: false });
  graph.addConnection(dataNode.id, "data", viewerNode.id, "primary", "smart");
  graph.addConnection(viewerNode.id, "context", analyzeNode.id, "context", "exact");
  queueViewerSync();
})();
