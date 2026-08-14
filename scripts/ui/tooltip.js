(() => {
  "use strict";

  window.NeuropixelWorkflow = window.NeuropixelWorkflow || {};

  window.NeuropixelWorkflow.attachAdaptiveTooltips = (tooltip) => {
    const margin = 8;
    const gap = 8;
    let activeTarget = null;
    let timer = null;

    function candidatePosition(placement, targetRect, tipRect) {
      const centerX = targetRect.left + targetRect.width / 2;
      const centerY = targetRect.top + targetRect.height / 2;
      if (placement === "top") {
        return { x: centerX - tipRect.width / 2, y: targetRect.top - tipRect.height - gap };
      }
      if (placement === "left") {
        return { x: targetRect.left - tipRect.width - gap, y: centerY - tipRect.height / 2 };
      }
      if (placement === "right") {
        return { x: targetRect.right + gap, y: centerY - tipRect.height / 2 };
      }
      return { x: centerX - tipRect.width / 2, y: targetRect.bottom + gap };
    }

    function overflowScore(position, tipRect) {
      const right = position.x + tipRect.width;
      const bottom = position.y + tipRect.height;
      return (
        Math.max(0, margin - position.x) +
        Math.max(0, right - (window.innerWidth - margin)) +
        Math.max(0, margin - position.y) +
        Math.max(0, bottom - (window.innerHeight - margin))
      );
    }

    function place(target) {
      const targetRect = target.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      const preferred = target.dataset.tooltipPlacement || "bottom";
      const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" };
      const placements = [...new Set([preferred, opposite[preferred], "right", "left", "bottom", "top"])];
      let best = null;

      placements.forEach((placement) => {
        const position = candidatePosition(placement, targetRect, tipRect);
        const score = overflowScore(position, tipRect);
        if (!best || score < best.score) best = { ...position, placement, score };
      });

      const maxX = Math.max(margin, window.innerWidth - tipRect.width - margin);
      const maxY = Math.max(margin, window.innerHeight - tipRect.height - margin);
      tooltip.style.left = `${Math.min(maxX, Math.max(margin, best.x))}px`;
      tooltip.style.top = `${Math.min(maxY, Math.max(margin, best.y))}px`;
      tooltip.dataset.placement = best.placement;
    }

    function show(target) {
      activeTarget = target;
      tooltip.textContent = target.dataset.tooltip;
      tooltip.classList.add("show");
      requestAnimationFrame(() => place(target));
    }

    function schedule(target) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => show(target), 320);
    }

    function hide() {
      window.clearTimeout(timer);
      activeTarget = null;
      tooltip.classList.remove("show");
    }

    document.querySelectorAll("[data-tooltip]").forEach((target) => {
      target.addEventListener("pointerenter", () => schedule(target));
      target.addEventListener("pointerleave", hide);
      target.addEventListener("focus", () => show(target));
      target.addEventListener("blur", hide);
    });

    window.addEventListener("resize", () => {
      if (activeTarget) place(activeTarget);
    });

    return { hide };
  };
})();
