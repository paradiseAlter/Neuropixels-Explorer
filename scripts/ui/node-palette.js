(() => {
  "use strict";

  window.NeuropixelWorkflow = window.NeuropixelWorkflow || {};

  window.NeuropixelWorkflow.createNodePalette = ({
    panel,
    list,
    search,
    closeButton,
    registry,
    canvas,
    viewport,
    onChoose
  }) => {
    let insertionPoint = { x: 120, y: 120 };

    function render(query = "") {
      const normalized = query.trim().toLowerCase();
      const matches = registry.definitions.filter((definition) =>
        !normalized ||
        definition.title.toLowerCase().includes(normalized) ||
        definition.code.toLowerCase().includes(normalized) ||
        definition.description.toLowerCase().includes(normalized)
      );

      const categories = ["Essential", "Advanced"];
      list.innerHTML = categories.map((category) => {
        const items = matches.filter((definition) => definition.category === category);
        if (!items.length) return "";
        return `
          <section class="palette-group">
            <h3>${category}</h3>
            ${items.map((definition) => `
              <button class="palette-item" type="button" data-node-type="${definition.type}">
                <span class="palette-code" style="--item-accent:${definition.accent}">${definition.code}</span>
                <span><strong>${definition.title}</strong><small>${definition.description}</small></span>
              </button>`).join("")}
          </section>`;
      }).join("") || `<p class="palette-no-results">No matching neural nodes.</p>`;

      list.querySelectorAll("[data-node-type]").forEach((button) => {
        button.addEventListener("click", () => {
          onChoose(button.dataset.nodeType, insertionPoint);
          close();
        });
      });
    }

    function placePanel(clientX, clientY) {
      panel.style.left = "0px";
      panel.style.top = "0px";
      panel.classList.add("open");
      const rect = panel.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const margin = 10;
      const left = Math.min(
        canvasRect.width - rect.width - margin,
        Math.max(margin, clientX - canvasRect.left)
      );
      const top = Math.min(
        canvasRect.height - rect.height - margin,
        Math.max(margin, clientY - canvasRect.top)
      );
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    }

    function openAt(clientX, clientY, worldPoint) {
      insertionPoint = worldPoint || viewport.screenToWorld(clientX, clientY);
      panel.setAttribute("aria-hidden", "false");
      search.value = "";
      render();
      placePanel(clientX, clientY);
      requestAnimationFrame(() => search.focus());
    }

    function close() {
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
      search.blur();
    }

    search.addEventListener("input", () => render(search.value));
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
      if (event.key === "Enter") list.querySelector("[data-node-type]")?.click();
    });
    closeButton.addEventListener("click", close);

    render();
    return { close, openAt };
  };
})();
