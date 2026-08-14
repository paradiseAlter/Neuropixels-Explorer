(() => {
  "use strict";

  const nodeLayer = document.getElementById("node-layer");
  let activeNodeId = null;
  let enhancementFrame = null;

  function isDetailedViewer(node) {
    return node?.classList.contains("workflow-node")
      && node.classList.contains("is-detailed")
      && Boolean(node.querySelector(".viewer-detail"));
  }

  function summaryValues(node) {
    const values = new Map();
    node.querySelectorAll(".compact-summary > div").forEach((row) => {
      const key = row.querySelector("span")?.textContent.trim();
      const value = row.querySelector("strong")?.textContent.trim();
      if (key && value) values.set(key, value);
    });
    return values;
  }

  function metadataValues(node) {
    const summary = summaryValues(node);
    return {
      representation: summary.get("REPRESENTATION") || "Auto",
      source: summary.get("SOURCE") || "No source",
      lanes: summary.get("LANES") || "0",
      range: summary.get("RANGE") || "—",
      state: node.querySelector(".viewer-status > span")?.textContent.trim() || "Unknown",
      contract: node.querySelector(".context-note strong")?.textContent.trim() || "ViewContext"
    };
  }

  function createMetadata() {
    const panel = document.createElement("aside");
    panel.className = "fullscreen-metadata";
    panel.setAttribute("aria-label", "Active viewer information");
    panel.innerHTML = `
      <header><span>ACTIVE VIEW</span><strong data-fullscreen-meta="representation">AUTO</strong></header>
      <div class="fullscreen-meta-row"><span>DATA SOURCE</span><strong data-fullscreen-meta="source">—</strong></div>
      <div class="fullscreen-meta-row"><span>VISIBLE LANES</span><strong data-fullscreen-meta="lanes">—</strong></div>
      <div class="fullscreen-meta-row"><span>SHARED TIME RANGE</span><strong data-fullscreen-meta="range">—</strong></div>
      <div class="fullscreen-meta-row"><span>SOURCE STATE</span><strong data-fullscreen-meta="state">—</strong></div>
      <div class="fullscreen-meta-row"><span>OUTPUT CONTRACT</span><strong data-fullscreen-meta="contract">ViewContext</strong></div>
      <p class="fullscreen-meta-note">The enlarged canvas keeps the same linked-time interaction: wheel to zoom at the pointer, or drag a time box across all lanes.</p>`;
    return panel;
  }

  function updateMetadata(node) {
    const panel = node.querySelector(".fullscreen-metadata");
    if (!panel) return;
    const values = metadataValues(node);
    Object.entries(values).forEach(([key, value]) => {
      const target = panel.querySelector(`[data-fullscreen-meta="${key}"]`);
      if (target && target.textContent !== value) target.textContent = value;
    });
  }

  function updateButton(node) {
    const button = node.querySelector("[data-viewer-fullpage]");
    if (!button) return;
    const active = node.dataset.nodeId === activeNodeId;
    button.textContent = active ? "EXIT FULL PAGE" : "FULL PAGE";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "Exit full-page Viewer" : "Expand Viewer to fill this webpage");
    button.title = active ? "Return to workflow · Esc" : "Fill this webpage with the Viewer without entering browser fullscreen";
  }

  function activateInterface(node) {
    if (!node) return;
    activeNodeId = node.dataset.nodeId;
    document.body.classList.add("viewer-focus-mode");
    document.querySelectorAll(".workflow-node.viewer-fullpage").forEach((item) => {
      item.classList.toggle("viewer-fullpage", item === node);
    });
    node.classList.add("viewer-fullpage");
    updateButton(node);
    updateMetadata(node);
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }

  function deactivateInterface() {
    document.body.classList.remove("viewer-focus-mode");
    document.querySelectorAll(".workflow-node.viewer-fullpage").forEach((node) => node.classList.remove("viewer-fullpage"));
    activeNodeId = null;
    document.querySelectorAll("[data-viewer-fullpage]").forEach((button) => {
      button.textContent = "FULL PAGE";
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "Expand Viewer to fill this webpage");
      button.title = "Fill this webpage with the Viewer without entering browser fullscreen";
    });
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }

  function enterFullPage(node) {
    activateInterface(node);
  }

  function exitFullPage() {
    deactivateInterface();
  }

  function toggleFullPage(node) {
    if (node.dataset.nodeId === activeNodeId) exitFullPage();
    else enterFullPage(node);
  }

  function enhanceViewer(node) {
    if (!isDetailedViewer(node)) return;
    const tools = node.querySelector(".viewer-tools");
    if (!tools) return;

    if (!node.querySelector("[data-viewer-fullpage]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "viewer-fullpage-button";
      button.dataset.viewerFullpage = "";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFullPage(node);
      });
      tools.appendChild(button);
    }

    if (!node.querySelector(".fullscreen-metadata")) {
      node.querySelector(".viewer-detail")?.appendChild(createMetadata());
    }

    if (node.dataset.nodeId === activeNodeId) {
      node.classList.add("viewer-fullpage");
      document.body.classList.add("viewer-focus-mode");
    }
    updateButton(node);
    updateMetadata(node);
  }

  function enhanceAll() {
    enhancementFrame = null;
    const viewers = [...nodeLayer.querySelectorAll(".workflow-node")].filter((node) => node.querySelector(".viewer-detail"));
    viewers.forEach(enhanceViewer);
    if (activeNodeId && !viewers.some((node) => node.dataset.nodeId === activeNodeId)) deactivateInterface();
  }

  function scheduleEnhancement() {
    if (enhancementFrame) return;
    enhancementFrame = requestAnimationFrame(enhanceAll);
  }

  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(nodeLayer, { childList: true, subtree: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeNodeId) {
      event.preventDefault();
      exitFullPage();
    }
  });

  enhanceAll();
})();
