(() => {
  "use strict";

  const scope = window.NeuropixelWorkflowV11 = window.NeuropixelWorkflowV11 || {};

  scope.createPalette = ({ panel, list, search, closeButton, registry, canvas, viewport, onChoose }) => {
    let insertPoint = { x: 100, y: 100 };

    function render() {
      const query = search.value.trim().toLowerCase();
      const matches = registry.definitions.filter((definition) => {
        const searchable = `${definition.title} ${definition.code} ${definition.description}`.toLowerCase();
        return !query || searchable.includes(query);
      });
      list.innerHTML = ["Core", "Next"].map((category) => {
        const items = matches.filter((definition) => definition.category === category);
        if (!items.length) return "";
        return `<section><h3>${category}</h3>${items.map((definition) => `
          <button type="button" data-node-type="${definition.type}">
            <i style="--node-accent:${definition.accent}">${definition.code}</i>
            <span><strong>${definition.title}</strong><small>${definition.description}</small></span>
          </button>`).join("")}</section>`;
      }).join("") || `<p class="no-results">No matching nodes.</p>`;

      list.querySelectorAll("[data-node-type]").forEach((button) => {
        button.addEventListener("click", () => {
          onChoose(button.dataset.nodeType, insertPoint);
          close();
        });
      });
    }

    function place(clientX, clientY) {
      panel.style.left = "0px";
      panel.style.top = "0px";
      panel.classList.add("open");
      const panelRect = panel.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const margin = 10;
      panel.style.left = `${Math.min(canvasRect.width - panelRect.width - margin, Math.max(margin, clientX - canvasRect.left))}px`;
      panel.style.top = `${Math.min(canvasRect.height - panelRect.height - margin, Math.max(margin, clientY - canvasRect.top))}px`;
    }

    function openAt(clientX, clientY, worldPoint) {
      insertPoint = worldPoint || viewport.screenToWorld(clientX, clientY);
      panel.setAttribute("aria-hidden", "false");
      search.value = "";
      render();
      place(clientX, clientY);
      requestAnimationFrame(() => search.focus());
    }

    function close() {
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
      search.blur();
    }

    search.addEventListener("input", render);
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
      if (event.key === "Enter") list.querySelector("[data-node-type]")?.click();
    });
    closeButton.addEventListener("click", close);
    render();
    return { openAt, close };
  };
})();
