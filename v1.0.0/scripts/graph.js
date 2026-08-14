(() => {
  "use strict";

  window.NeuropixelWorkflowV1 = window.NeuropixelWorkflowV1 || {};

  window.NeuropixelWorkflowV1.createGraph = ({
    canvas,
    nodeLayer,
    connectionGroup,
    previewPath,
    registry,
    viewport,
    onChange,
    onSelect,
    onToast,
    onNodeAction
  }) => {
    const nodes = new Map();
    const connections = new Map();
    let nextNodeId = 1;
    let nextConnectionId = 1;
    let selected = null;
    let dragFrame = null;

    function curve(start, end) {
      const distance = Math.abs(end.x - start.x);
      const bend = Math.max(54, Math.min(190, distance * 0.48));
      return `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`;
    }

    function setPosition(node, x, y) {
      node.x = x;
      node.y = y;
      node.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    function portPosition(node, portId, direction) {
      const socket = node.element.querySelector(`.node-port[data-port-id="${CSS.escape(portId)}"][data-direction="${direction}"]`);
      if (!socket) return { x: node.x, y: node.y };
      const rect = socket.getBoundingClientRect();
      return viewport.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    function updateConnection(connection) {
      const source = nodes.get(connection.sourceNode);
      const target = nodes.get(connection.targetNode);
      if (!source || !target) return;
      connection.path.setAttribute("d", curve(
        portPosition(source, connection.sourcePort, "output"),
        portPosition(target, connection.targetPort, "input")
      ));
    }

    function updateConnectionsFor(nodeId) {
      connections.forEach((connection) => {
        if (connection.sourceNode === nodeId || connection.targetNode === nodeId) updateConnection(connection);
      });
    }

    function updateAllConnections() {
      connections.forEach(updateConnection);
    }

    function railMarkup(ports, direction) {
      return `<div class="port-rail ${direction}">${ports.map((item) => `
        <button class="node-port" type="button"
          data-port-id="${registry.escapeHtml(item.id)}"
          data-direction="${direction}"
          aria-label="${registry.escapeHtml(item.label)} ${direction}"
          title="${registry.escapeHtml(item.label)} · ${registry.escapeHtml(item.type)}">
          <span>${registry.escapeHtml(item.label)}</span>
        </button>`).join("")}</div>`;
    }

    function densityLabel(density) {
      return density === "compact" ? "S" : density === "expanded" ? "L" : "M";
    }

    function renderNode(node) {
      const definition = node.definition;
      const width = definition.widths[node.density] || definition.widths.standard;
      node.element.style.setProperty("--node-accent", definition.accent);
      node.element.style.width = `${width}px`;
      node.element.className = `workflow-node density-${node.density}${node.collapsed ? " collapsed" : ""}${selected?.kind === "node" && selected.id === node.id ? " selected" : ""}`;
      node.element.innerHTML = `
        <div class="node-accent"></div>
        <header class="node-header">
          <span class="node-code">${registry.escapeHtml(definition.code)}</span>
          <div><h3>${registry.escapeHtml(definition.title)}</h3><small>${registry.escapeHtml(definition.category)}</small></div>
          <div class="node-header-actions">
            <button type="button" data-graph-action="cycle-density" title="Cycle node size">${densityLabel(node.density)}</button>
            <button type="button" data-graph-action="toggle-collapse" title="${node.collapsed ? "Expand" : "Collapse"}">${node.collapsed ? "▸" : "⌄"}</button>
          </div>
        </header>
        <div class="node-main">
          ${railMarkup(definition.inputs, "input")}
          <div class="node-body">${definition.render(node.data)}</div>
          ${railMarkup(definition.outputs, "output")}
        </div>`;

      node.element.querySelectorAll("[data-graph-action]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (button.dataset.graphAction === "toggle-collapse") {
            node.collapsed = !node.collapsed;
          } else {
            const order = ["compact", "standard", "expanded"];
            node.density = order[(order.indexOf(node.density) + 1) % order.length];
          }
          renderNode(node);
          setPosition(node, node.x, node.y);
          requestAnimationFrame(() => updateConnectionsFor(node.id));
          onChange?.(snapshot());
        });
      });

      node.element.querySelectorAll("[data-node-action]").forEach((control) => {
        control.addEventListener("click", (event) => {
          event.stopPropagation();
          onNodeAction?.(node, control.dataset.nodeAction, control.dataset.value);
        });
      });

      node.element.querySelectorAll('.node-port[data-direction="output"]').forEach((socket) => {
        socket.addEventListener("pointerdown", (event) => beginConnection(event, node, socket));
      });

      requestAnimationFrame(() => updateConnectionsFor(node.id));
    }

    function bindNodeSurface(node) {
      node.element.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        if (event.target.closest("button, input, select, textarea, .node-port")) return;
        event.preventDefault();
        event.stopPropagation();
        selectNode(node.id);

        const start = viewport.screenToWorld(event.clientX, event.clientY);
        const origin = { x: node.x, y: node.y };
        let pending = null;
        node.element.setPointerCapture(event.pointerId);
        node.element.classList.add("moving");

        const move = (moveEvent) => {
          const current = viewport.screenToWorld(moveEvent.clientX, moveEvent.clientY);
          pending = { x: origin.x + current.x - start.x, y: origin.y + current.y - start.y };
          if (dragFrame) return;
          dragFrame = requestAnimationFrame(() => {
            dragFrame = null;
            if (!pending) return;
            setPosition(node, pending.x, pending.y);
            updateConnectionsFor(node.id);
          });
        };

        const end = (endEvent) => {
          node.element.removeEventListener("pointermove", move);
          node.element.removeEventListener("pointerup", end);
          node.element.removeEventListener("pointercancel", end);
          if (node.element.hasPointerCapture(endEvent.pointerId)) node.element.releasePointerCapture(endEvent.pointerId);
          node.element.classList.remove("moving");
          onChange?.(snapshot());
        };

        node.element.addEventListener("pointermove", move);
        node.element.addEventListener("pointerup", end);
        node.element.addEventListener("pointercancel", end);
      });
    }

    function clearPortHints() {
      document.querySelectorAll('.node-port[data-direction="input"]').forEach((socket) => socket.classList.remove("exact-target", "smart-target", "blocked-target"));
    }

    function markPortHints(outputDefinition) {
      document.querySelectorAll('.node-port[data-direction="input"]').forEach((socket) => {
        const targetNode = nodes.get(socket.closest(".workflow-node")?.dataset.nodeId);
        const input = targetNode?.definition.inputs.find((item) => item.id === socket.dataset.portId);
        const mode = registry.classifyConnection(outputDefinition, input);
        socket.classList.add(mode === "exact" ? "exact-target" : mode === "smart" ? "smart-target" : "blocked-target");
      });
    }

    function incomingCount(nodeId, portId) {
      return [...connections.values()].filter((connection) => connection.targetNode === nodeId && connection.targetPort === portId).length;
    }

    function bestInputFor(node, outputDefinition) {
      return node.definition.inputs
        .map((input) => ({ input, mode: registry.classifyConnection(outputDefinition, input), count: incomingCount(node.id, input.id) }))
        .filter((candidate) => candidate.mode)
        .sort((a, b) => {
          if (a.mode !== b.mode) return a.mode === "exact" ? -1 : 1;
          return a.count - b.count;
        })[0] || null;
    }

    function beginConnection(event, sourceNode, socket) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const sourcePort = sourceNode.definition.outputs.find((item) => item.id === socket.dataset.portId);
      const start = portPosition(sourceNode, sourcePort.id, "output");
      markPortHints(sourcePort);
      previewPath.classList.add("active");

      const move = (moveEvent) => {
        previewPath.setAttribute("d", curve(start, viewport.screenToWorld(moveEvent.clientX, moveEvent.clientY)));
      };

      const end = (endEvent) => {
        document.removeEventListener("pointermove", move);
        previewPath.classList.remove("active");
        previewPath.setAttribute("d", "");
        clearPortHints();

        const target = document.elementFromPoint(endEvent.clientX, endEvent.clientY);
        const directSocket = target?.closest('.node-port[data-direction="input"]');
        let targetNode = directSocket ? nodes.get(directSocket.closest(".workflow-node")?.dataset.nodeId) : null;
        let candidate = null;

        if (targetNode && directSocket) {
          const input = targetNode.definition.inputs.find((item) => item.id === directSocket.dataset.portId);
          const mode = registry.classifyConnection(sourcePort, input);
          if (mode) candidate = { input, mode };
        } else {
          const targetNodeElement = target?.closest(".workflow-node");
          targetNode = nodes.get(targetNodeElement?.dataset.nodeId);
          if (targetNode) candidate = bestInputFor(targetNode, sourcePort);
        }

        if (targetNode && candidate) {
          addConnection(sourceNode.id, sourcePort.id, targetNode.id, candidate.input.id, candidate.mode);
          if (candidate.mode === "smart") onToast?.(`Smart adapter: ${sourcePort.type} → ${candidate.input.type}`);
        } else if (targetNode) {
          onToast?.("No compatible input was found on this node");
        }
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end, { once: true });
    }

    function addConnection(sourceNodeId, sourcePortId, targetNodeId, targetPortId, forcedMode) {
      if (sourceNodeId === targetNodeId) return null;
      const sourceNode = nodes.get(sourceNodeId);
      const targetNode = nodes.get(targetNodeId);
      if (!sourceNode || !targetNode) return null;
      const output = sourceNode.definition.outputs.find((item) => item.id === sourcePortId);
      const input = targetNode.definition.inputs.find((item) => item.id === targetPortId);
      const mode = forcedMode || registry.classifyConnection(output, input);
      if (!mode) return null;

      const duplicate = [...connections.values()].some((connection) => connection.sourceNode === sourceNodeId && connection.sourcePort === sourcePortId && connection.targetNode === targetNodeId && connection.targetPort === targetPortId);
      if (duplicate) return null;

      const id = `connection-${nextConnectionId++}`;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("connection-path", mode);
      path.dataset.connectionId = id;
      connectionGroup.appendChild(path);
      const connection = { id, sourceNode: sourceNodeId, sourcePort: sourcePortId, targetNode: targetNodeId, targetPort: targetPortId, mode, path };
      connections.set(id, connection);
      updateConnection(connection);
      path.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        selectConnection(id);
      });
      onChange?.(snapshot());
      return connection;
    }

    function addNode(type, position, data = {}, options = {}) {
      const definition = registry.get(type);
      if (!definition) throw new Error(`Unknown node type: ${type}`);
      const id = `node-${nextNodeId++}`;
      const element = document.createElement("article");
      element.dataset.nodeId = id;
      element.setAttribute("aria-label", `${definition.title} node`);
      nodeLayer.appendChild(element);
      const node = {
        id,
        type,
        definition,
        data: { ...definition.defaultData, ...data },
        density: options.density || "standard",
        collapsed: Boolean(options.collapsed),
        x: position.x,
        y: position.y,
        element
      };
      nodes.set(id, node);
      bindNodeSurface(node);
      renderNode(node);
      setPosition(node, node.x, node.y);
      selectNode(id);
      onChange?.(snapshot());
      return node;
    }

    function updateNodeData(nodeId, patch) {
      const node = nodes.get(nodeId);
      if (!node) return;
      node.data = { ...node.data, ...patch };
      renderNode(node);
      setPosition(node, node.x, node.y);
      requestAnimationFrame(() => updateConnectionsFor(node.id));
      if (selected?.kind === "node" && selected.id === node.id) onSelect?.(selected, node);
      onChange?.(snapshot());
    }

    function selectNode(id) {
      nodes.forEach((node) => node.element.classList.toggle("selected", node.id === id));
      connections.forEach((connection) => connection.path.classList.remove("selected"));
      selected = id ? { kind: "node", id } : null;
      onSelect?.(selected, id ? nodes.get(id) : null);
    }

    function selectConnection(id) {
      nodes.forEach((node) => node.element.classList.remove("selected"));
      connections.forEach((connection) => connection.path.classList.toggle("selected", connection.id === id));
      selected = id ? { kind: "connection", id } : null;
      onSelect?.(selected, id ? connections.get(id) : null);
    }

    function clearSelection() {
      nodes.forEach((node) => node.element.classList.remove("selected"));
      connections.forEach((connection) => connection.path.classList.remove("selected"));
      selected = null;
      onSelect?.(null, null);
    }

    function deleteSelection() {
      if (!selected) return false;
      if (selected.kind === "connection") {
        connections.get(selected.id)?.path.remove();
        connections.delete(selected.id);
      } else {
        const node = nodes.get(selected.id);
        if (node) {
          [...connections.values()].forEach((connection) => {
            if (connection.sourceNode === node.id || connection.targetNode === node.id) {
              connection.path.remove();
              connections.delete(connection.id);
            }
          });
          node.element.remove();
          nodes.delete(node.id);
        }
      }
      clearSelection();
      onChange?.(snapshot());
      return true;
    }

    function clear() {
      nodes.forEach((node) => node.element.remove());
      connections.forEach((connection) => connection.path.remove());
      nodes.clear();
      connections.clear();
      clearSelection();
      onChange?.(snapshot());
    }

    function snapshot() {
      return {
        nodes: [...nodes.values()].map(({ id, type, x, y, data, density, collapsed }) => ({ id, type, x, y, data: { ...data }, density, collapsed })),
        connections: [...connections.values()].map(({ id, sourceNode, sourcePort, targetNode, targetPort, mode }) => ({ id, sourceNode, sourcePort, targetNode, targetPort, mode }))
      };
    }

    canvas.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".workflow-node, .connection-path")) clearSelection();
    });
    window.addEventListener("resize", updateAllConnections);

    return { addConnection, addNode, clear, clearSelection, deleteSelection, snapshot, updateAllConnections, updateNodeData };
  };
})();
