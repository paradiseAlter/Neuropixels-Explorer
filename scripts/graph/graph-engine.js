(() => {
  "use strict";

  window.NeuropixelWorkflow = window.NeuropixelWorkflow || {};

  window.NeuropixelWorkflow.createGraph = ({
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
    let connectionDraft = null;

    function pathFor(start, end) {
      const distance = Math.abs(end.x - start.x);
      const bend = Math.max(58, Math.min(180, distance * 0.48));
      return `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`;
    }

    function nodePortPosition(node, portId, direction) {
      const port = node.element.querySelector(`.node-port[data-port-id="${CSS.escape(portId)}"][data-direction="${direction}"]`);
      if (!port) return { x: node.x, y: node.y };
      return {
        x: node.x + (direction === "output" ? node.element.offsetWidth : 0),
        y: node.y + port.offsetTop + port.offsetHeight / 2
      };
    }

    function updateConnection(connection) {
      const source = nodes.get(connection.sourceNode);
      const target = nodes.get(connection.targetNode);
      if (!source || !target) return;
      const start = nodePortPosition(source, connection.sourcePort, "output");
      const end = nodePortPosition(target, connection.targetPort, "input");
      connection.path.setAttribute("d", pathFor(start, end));
    }

    function updateConnectionsFor(nodeId) {
      connections.forEach((connection) => {
        if (connection.sourceNode === nodeId || connection.targetNode === nodeId) {
          updateConnection(connection);
        }
      });
    }

    function updateAllConnections() {
      connections.forEach(updateConnection);
    }

    function setNodePosition(node, x, y) {
      node.x = x;
      node.y = y;
      node.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    function portMarkup(port, direction) {
      return `
        <div class="node-port-row ${direction}" title="${registry.escapeHtml(port.type)}">
          ${direction === "input" ? `<button class="node-port" type="button" aria-label="${registry.escapeHtml(port.label)} input" data-port-id="${registry.escapeHtml(port.id)}" data-direction="input"></button>` : ""}
          <span>${registry.escapeHtml(port.label)}${port.optional ? " · optional" : ""}</span>
          ${direction === "output" ? `<button class="node-port" type="button" aria-label="${registry.escapeHtml(port.label)} output" data-port-id="${registry.escapeHtml(port.id)}" data-direction="output"></button>` : ""}
        </div>`;
    }

    function renderNodeElement(node) {
      const definition = node.definition;
      node.element.style.setProperty("--node-accent", definition.accent);
      node.element.style.width = `${definition.width}px`;
      node.element.innerHTML = `
        <div class="node-accent"></div>
        <header class="node-header">
          <span class="node-code">${registry.escapeHtml(definition.code)}</span>
          <h3>${registry.escapeHtml(definition.title)}</h3>
          <button class="node-menu-button" type="button" aria-label="Node options" data-node-action="options">•••</button>
        </header>
        <div class="node-port-list input-list">${definition.inputs.map((port) => portMarkup(port, "input")).join("")}</div>
        <div class="node-content">${definition.render(node.data)}</div>
        <div class="node-port-list output-list">${definition.outputs.map((port) => portMarkup(port, "output")).join("")}</div>`;

      node.element.querySelectorAll("button, input, select").forEach((control) => {
        if (!control.classList.contains("node-port") && !control.classList.contains("node-menu-button")) {
          control.addEventListener("pointerdown", (event) => event.stopPropagation());
        }
      });

      node.element.querySelectorAll("[data-node-action]").forEach((control) => {
        control.addEventListener("click", (event) => {
          event.stopPropagation();
          onNodeAction?.(node, control.dataset.nodeAction, control.dataset.value);
        });
      });

      attachNodeEvents(node);
      requestAnimationFrame(() => updateConnectionsFor(node.id));
    }

    function attachNodeEvents(node) {
      const header = node.element.querySelector(".node-header");
      header.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.target.closest("button")) return;
        event.preventDefault();
        event.stopPropagation();
        selectNode(node.id);
        const start = viewport.screenToWorld(event.clientX, event.clientY);
        const origin = { x: node.x, y: node.y };
        let pending = null;

        header.setPointerCapture(event.pointerId);
        node.element.classList.add("moving");

        const move = (moveEvent) => {
          const current = viewport.screenToWorld(moveEvent.clientX, moveEvent.clientY);
          pending = {
            x: origin.x + current.x - start.x,
            y: origin.y + current.y - start.y
          };
          if (dragFrame) return;
          dragFrame = requestAnimationFrame(() => {
            dragFrame = null;
            if (!pending) return;
            setNodePosition(node, pending.x, pending.y);
            updateConnectionsFor(node.id);
          });
        };

        const end = (endEvent) => {
          header.removeEventListener("pointermove", move);
          header.removeEventListener("pointerup", end);
          header.removeEventListener("pointercancel", end);
          if (header.hasPointerCapture(endEvent.pointerId)) header.releasePointerCapture(endEvent.pointerId);
          node.element.classList.remove("moving");
          onChange?.(getSnapshot());
        };

        header.addEventListener("pointermove", move);
        header.addEventListener("pointerup", end);
        header.addEventListener("pointercancel", end);
      });

      if (!node.element.dataset.selectionBound) {
        node.element.dataset.selectionBound = "true";
        node.element.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
          if (!event.target.closest(".node-port")) selectNode(node.id);
        });
      }

      node.element.querySelectorAll('.node-port[data-direction="output"]').forEach((portElement) => {
        portElement.addEventListener("pointerdown", (event) => beginConnection(event, node, portElement));
      });
    }

    function beginConnection(event, node, portElement) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const portId = portElement.dataset.portId;
      const portDefinition = node.definition.outputs.find((port) => port.id === portId);
      const start = nodePortPosition(node, portId, "output");
      connectionDraft = { node, portId, portDefinition, start };
      previewPath.classList.add("active");

      const move = (moveEvent) => {
        const end = viewport.screenToWorld(moveEvent.clientX, moveEvent.clientY);
        previewPath.setAttribute("d", pathFor(start, end));
      };

      const end = (endEvent) => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", end);
        previewPath.classList.remove("active");
        previewPath.setAttribute("d", "");

        const targetElement = document.elementFromPoint(endEvent.clientX, endEvent.clientY)?.closest('.node-port[data-direction="input"]');
        if (targetElement) {
          const targetNodeElement = targetElement.closest(".workflow-node");
          const targetNode = nodes.get(targetNodeElement?.dataset.nodeId);
          if (targetNode) {
            const targetPort = targetNode.definition.inputs.find((port) => port.id === targetElement.dataset.portId);
            if (registry.canConnect(portDefinition, targetPort)) {
              addConnection(node.id, portId, targetNode.id, targetPort.id);
            } else {
              onToast?.(`Incompatible ports: ${portDefinition.type} → ${targetPort?.type || "unknown"}`);
            }
          }
        }
        connectionDraft = null;
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end, { once: true });
    }

    function addNode(type, position, data = {}) {
      const definition = registry.get(type);
      if (!definition) throw new Error(`Unknown node type: ${type}`);
      const id = `node-${nextNodeId++}`;
      const element = document.createElement("article");
      element.className = "workflow-node";
      element.dataset.nodeId = id;
      element.setAttribute("aria-label", `${definition.title} node`);
      nodeLayer.appendChild(element);

      const node = {
        id,
        type,
        definition,
        data: { ...definition.defaultData, ...data },
        x: position.x,
        y: position.y,
        element
      };
      nodes.set(id, node);
      setNodePosition(node, position.x, position.y);
      renderNodeElement(node);
      selectNode(id);
      onChange?.(getSnapshot());
      return node;
    }

    function updateNodeData(nodeId, patch) {
      const node = nodes.get(nodeId);
      if (!node) return;
      node.data = { ...node.data, ...patch };
      renderNodeElement(node);
      setNodePosition(node, node.x, node.y);
      if (selected?.kind === "node" && selected.id === nodeId) onSelect?.(selected, node);
      onChange?.(getSnapshot());
    }

    function addConnection(sourceNode, sourcePort, targetNode, targetPort) {
      const duplicate = [...connections.values()].some((connection) =>
        connection.sourceNode === sourceNode &&
        connection.sourcePort === sourcePort &&
        connection.targetNode === targetNode &&
        connection.targetPort === targetPort
      );
      if (duplicate || sourceNode === targetNode) return;

      const id = `connection-${nextConnectionId++}`;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("connection-path");
      path.dataset.connectionId = id;
      connectionGroup.appendChild(path);
      const connection = { id, sourceNode, sourcePort, targetNode, targetPort, path };
      connections.set(id, connection);
      updateConnection(connection);

      path.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        selectConnection(id);
      });
      onChange?.(getSnapshot());
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
        const connection = connections.get(selected.id);
        connection?.path.remove();
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
      onChange?.(getSnapshot());
      return true;
    }

    function clear() {
      nodes.forEach((node) => node.element.remove());
      connections.forEach((connection) => connection.path.remove());
      nodes.clear();
      connections.clear();
      clearSelection();
      onChange?.(getSnapshot());
    }

    function getSnapshot() {
      return {
        nodes: [...nodes.values()].map(({ id, type, x, y, data }) => ({ id, type, x, y, data: { ...data } })),
        connections: [...connections.values()].map(({ id, sourceNode, sourcePort, targetNode, targetPort }) => ({
          id, sourceNode, sourcePort, targetNode, targetPort
        }))
      };
    }

    function getSelectedNode() {
      return selected?.kind === "node" ? nodes.get(selected.id) : null;
    }

    canvas.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".workflow-node, .connection-path")) clearSelection();
    });

    window.addEventListener("resize", updateAllConnections);

    return {
      addConnection,
      addNode,
      clear,
      clearSelection,
      deleteSelection,
      getSelectedNode,
      getSnapshot,
      selectNode,
      updateAllConnections,
      updateNodeData
    };
  };
})();
