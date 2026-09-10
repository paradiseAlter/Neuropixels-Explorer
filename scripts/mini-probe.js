// SPDX-License-Identifier: MIT
// Measured unit coordinates, never an inferred atlas trajectory.
(() => {
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  class MiniProbe {
    constructor(host, onUnit, onRegion) {
      this.host = host;
      host.addEventListener("click", e => {
        const unit = e.target.closest("[data-probe-unit]"), region = e.target.closest("[data-probe-region]");
        if (unit) onUnit(Number(unit.dataset.probeUnit));
        if (region) onRegion(region.dataset.probeRegion);
      });
      host.addEventListener("keydown", e => {
        if (["Enter", " "].includes(e.key) && e.target.dataset.probeUnit) { e.preventDefault(); onUnit(Number(e.target.dataset.probeUnit)); }
      });
      host.addEventListener("pointermove", e => {
        const svg = e.target.closest("svg"); if (!svg || !this.overview) return;
        const rect = svg.getBoundingClientRect(), y = (e.clientY - rect.top) / rect.height * 500;
        const nearest = this.positions.map(p => ({...p, distance: Math.abs(p.y-y)})).sort((a,b) => a.distance-b.distance).slice(0,5);
        host.querySelector(".mini-probe-nearby").innerHTML = nearest.map(p => this.unitButton(p.unit)).join("");
      });
    }
    unitButton(u) { return `<button data-probe-unit="${u.id}">Unit ${u.id}<small>${esc(u.region)} · ${u.depthUm} µm</small></button>`; }
    update(overview, view) {
      if (!overview) { this.overview = null; this.host.innerHTML = ""; return; }
      const selected = view.selectedUnitId;
      if (this.overview !== overview || this.selected !== selected || this.lang !== document.documentElement.lang) {
        this.overview = overview; this.selected = selected; this.lang = document.documentElement.lang;
        const zh = this.lang === "zh-CN", es = this.lang === "es";
        const located = overview.units.filter(u => u.depthUm != null && Number.isFinite(u.depthUm));
        const shanks = [...new Set(located.map(u => u.shankId))].sort((a,b) => a-b);
        const min = Math.min(...located.map(u => u.depthUm)), max = Math.max(...located.map(u => u.depthUm));
        const regions = [...new Set(located.map(u => u.region))], colors = ["#71b7d3","#bd9bdd","#dbb579","#8ebd91","#d88d9e","#9cacc9"];
        const color = u => /^#?[a-f\d]{6}$/i.test(u.regionColor) ? "#"+u.regionColor.replace("#", "") : colors[regions.indexOf(u.region)%colors.length];
        const width = Math.max(144, shanks.length*48+60);
        const x = u => 58+shanks.indexOf(u.shankId)*48+(u.x == null ? 0 : (u.x%64)/8-4);
        const y = u => 460-(u.depthUm-min)/Math.max(1,max-min)*410;
        this.positions = located.map(unit => ({unit,y:y(unit)}));
        const focus = overview.units.find(u => u.id === selected);
        this.host.innerHTML = `<header><strong>2D PROBE</strong><span>${zh ? "位置与放电" : es ? "Posición y actividad" : "Position & activity"}</span></header>
          ${located.length ? `<svg viewBox="0 0 ${width} 500" role="group" aria-label="2D Probe">${shanks.map(s => `<path d="M${58+shanks.indexOf(s)*48} 40 V475" class="probe-shaft"/><text x="${58+shanks.indexOf(s)*48}" y="25" text-anchor="middle">S${s == null ? "?" : s+1}</text>`).join("")}<text x="2" y="51">${Math.round(max)}</text><text x="2" y="465">${Math.round(min)}</text><text x="2" y="489">µm</text>${located.map(u => `<circle cx="${x(u)}" cy="${y(u)}" r="${u.id===selected ? 6 : 2.3}" fill="${color(u)}" data-source="${u.sourceIndex}" data-probe-unit="${u.id}" tabindex="${u.id===selected ? 0 : -1}" role="button" aria-label="Unit ${u.id}, ${esc(u.region)}, ${u.depthUm} µm" class="${u.id===selected ? "selected" : ""}"><title>Unit ${u.id} · ${esc(u.region)} · ${u.depthUm} µm</title></circle>`).join("")}</svg>` : `<p>${zh ? "此记录没有可用的探针坐标" : es ? "Sin coordenadas disponibles" : "No probe coordinates available"}</p>`}
          <div class="mini-probe-selection" aria-live="polite">${focus ? `<strong>Unit ${focus.id}</strong><b>${esc(focus.region)}</b><span>${focus.depthUm==null ? "—" : focus.depthUm+" µm"}</span>` : `<span>${zh ? "点击神经元查看位置" : es ? "Selecciona una unidad" : "Select a Unit to locate it"}</span>`}</div>
          <div class="mini-probe-regions">${regions.map(r => `<button data-probe-region="${esc(r)}">${esc(r)}</button>`).join("")}</div>
          <small>${overview.units.length-located.length ? `${overview.units.length-located.length} ${zh ? "个位置未知" : "unlocated"}` : zh ? "原始 Unit 坐标" : "Original Unit coordinates"}</small>
          <details><summary>${zh ? "附近神经元" : es ? "Unidades cercanas" : "Nearby Units"}</summary><div class="mini-probe-nearby">${located.slice(0,5).map(u => this.unitButton(u)).join("")}</div></details>`;
      }
      const bin = Math.min(overview.binCount-1,Math.max(0,Math.floor(view.cursorTime/overview.binSeconds)));
      if (bin===this.bin && this.activity===overview) return;
      this.bin=bin; this.activity=overview;
      this.host.querySelectorAll("circle[data-source]").forEach(node => {
        const value=overview.normalizedActivity?.[Number(node.dataset.source)*overview.binCount+bin]||0;
        node.style.opacity=node.classList.contains("selected") ? "1" : String(.35+value/255*.65);
      });
    }
  }
  window.NeuropixelsMiniProbe=MiniProbe;
})();
