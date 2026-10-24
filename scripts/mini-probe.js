// SPDX-License-Identifier: MIT
// Measured unit coordinates, never an inferred atlas trajectory.
(() => {
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const probeText = (key, lang) => {
    const copy = {
      interval: ["Interval distribution", "区间活动分布", "Actividad del intervalo"],
      horizontal: ["Horizontal view", "横向显示", "Vista horizontal"],
      vertical: ["Vertical view", "纵向显示", "Vista vertical"],
      choose: ["Select a labeled clip or drag a time interval on the signals.", "选择行为片段，或在神经信号上拖出时间区间。", "Selecciona un segmento o un intervalo en las señales."],
      loading: ["Calculating interval rates… First use prepares a reusable time index.", "正在统计区间放电。首次使用需建立时间索引。", "Calculando tasas; el primer uso prepara el índice temporal."],
      semantics: ["Circle size: interval firing rate. Color: brain region. This is Unit activity at measured positions, not a multichannel waveform.", "点的大小表示区间发放率，颜色表示脑区；坐标来自原始数据。多通道波形见 Unit 模板。", "Tamaño: tasa del intervalo. Color: región cerebral. Posiciones medidas; las ondas multicanal están en la plantilla Unit."],
      units: ["Units · Hz / spike count", "各 Unit 发放率与放电数", "Units: tasa y número de disparos"]
    };
    return copy[key][lang === "zh-CN" ? 1 : lang === "es" ? 2 : 0];
  };
  // One stem per measured Unit: never join unrelated Units into a waveform.
  function distributionGeometry(units, horizontal = false) {
    const located = units.filter(u => Number.isFinite(u.depthUm) && Number.isFinite(u.rateHz));
    const maxRate = Math.max(1, ...units.map(u => Number.isFinite(u.rateHz) ? u.rateHz : 0));
    const minDepth = located.length ? Math.min(...located.map(u => u.depthUm)) : 0;
    const maxDepth = located.length ? Math.max(...located.map(u => u.depthUm)) : 0;
    const width = horizontal ? 360 : 280, height = horizontal ? 230 : 320;
    const left = 48, right = width - 18, top = 24, bottom = height - 42;
    const depthFraction = u => maxDepth === minDepth ? .5 : (u.depthUm - minDepth) / (maxDepth - minDepth);
    const points = located.map(u => ({ ...u,
      x: horizontal ? left + depthFraction(u) * (right - left) : left + u.rateHz / maxRate * (right - left),
      y: horizontal ? bottom - u.rateHz / maxRate * (bottom - top) : bottom - depthFraction(u) * (bottom - top)
    }));
    return { width, height, left, right, top, bottom, maxRate, minDepth, maxDepth, points };
  }
  class MiniProbe {
    constructor(host, onUnit, onRegion) {
      this.host = host;
      this.horizontal = false;
      host.addEventListener("click", e => {
        if (e.target.closest("[data-template-expand]")) {
          this.templateExpanded = !this.templateExpanded;
          this.templateRenderKey = null; this.updateTemplate();
        }
        const channel = e.target.closest("[data-template-channel]");
        if (channel) this.selectTemplateChannel(Number(channel.dataset.templateChannel));
        if (e.target.closest("[data-probe-expand]")) {
          this.expanded = !this.expanded; this.syncExpanded();
          this.intervalKey = null; this.updateInterval();
        }
        if (e.target.closest("[data-distribution-orientation]")) {
          this.horizontal = !this.horizontal;
          this.renderDistribution();
        }
        const unit = e.target.closest("[data-probe-unit]"), region = e.target.closest("[data-probe-region]");
        if (unit) onUnit(Number(unit.dataset.probeUnit));
        if (region) onRegion(region.dataset.probeRegion);
      });
      host.addEventListener("keydown", e => {
        if (["Enter", " "].includes(e.key) && e.target.matches("circle[data-probe-unit]")) { e.preventDefault(); onUnit(Number(e.target.dataset.probeUnit)); }
        if (["Enter", " "].includes(e.key) && e.target.matches("circle[data-template-channel]")) { e.preventDefault(); this.selectTemplateChannel(Number(e.target.dataset.templateChannel)); }
      });
      host.addEventListener("change", e => {
        if (e.target.matches("[data-template-channel-select]")) this.selectTemplateChannel(Number(e.target.value));
      });
      host.addEventListener("pointermove", e => {
        const svg = e.target.closest("svg.probe-position-map"); if (!svg || !this.overview) return;
        const rect = svg.getBoundingClientRect(), y = (e.clientY - rect.top) / rect.height * 500;
        const x = (e.clientX - rect.left) / rect.width * svg.viewBox.baseVal.width;
        const nearest = this.positions.map(p => ({...p, distance: Math.hypot(p.y-y,p.x-x)})).sort((a,b) => a.distance-b.distance).slice(0,5);
        host.querySelector(".mini-probe-nearby").innerHTML = nearest.map(p => this.unitButton(p.unit)).join("");
      });
    }
    unitButton(u) { return `<button data-probe-unit="${u.id}">Unit ${u.id}<small>${esc(u.region)} · ${u.depthUm} µm</small></button>`; }
    syncExpanded() { this.host.classList.toggle("probe-expanded", !!(this.expanded || this.templateExpanded)); }
    selectTemplateChannel(index) {
      this.templateChannel = index; this.templateRenderKey = null; this.updateTemplate();
      this.host.querySelector("[data-template-channel-select]")?.focus({preventScroll:true});
    }
    updateTemplate() {
      const panel = this.host.querySelector("[data-template-panel]"), button = this.host.querySelector("[data-template-expand]");
      if (!panel || !button) return;
      this.syncExpanded();
      panel.hidden = !this.templateExpanded; button.setAttribute("aria-expanded", String(!!this.templateExpanded));
      if (!this.templateExpanded) return;
      const key = [this.selected, this.review, this.templateChannel, this.lang];
      if (this.templateRenderKey?.every((v,i) => v === key[i])) return;
      this.templateRenderKey = key;
      const api = window.NeuropixelsTemplateFootprint;
      panel.innerHTML = this.selected == null ? `<p>${api.words(this.lang).select}</p>`
        : api.render(this.review?.templateFootprint ? {...this.review.templateFootprint, clusterId:this.selected} : null, this.templateChannel, this.lang);
    }
    update(overview, view, recording, review = null) {
      if (this.recording !== recording || this.selected !== view.selectedUnitId) {
        this.templateChannel = null; this.templateRenderKey = null;
      }
      this.review = review?.clusterId === view.selectedUnitId ? review : null;
      this.view = view; this.recording = recording;
      if (!overview) { this.result = null; this.resultKey = null; this.overview = null; this.intervalKey = null; clearTimeout(this.intervalTimer); this.intervalAbort?.abort(); this.host.innerHTML = ""; return; }
      const selected = view.selectedUnitId;
      if (this.overview !== overview || this.selected !== selected || this.lang !== document.documentElement.lang) {
        this.intervalKey = null; this.overview = overview; this.selected = selected; this.lang = document.documentElement.lang;
        const zh = this.lang === "zh-CN", es = this.lang === "es";
        const located = overview.units.filter(u => u.depthUm != null && Number.isFinite(u.depthUm));
        const shanks = [...new Set(located.map(u => u.shankId))].sort((a,b) => a-b);
        const min = Math.min(...located.map(u => u.depthUm)), max = Math.max(...located.map(u => u.depthUm));
        const regions = [...new Set(located.map(u => u.region))], colors = ["#71b7d3","#bd9bdd","#dbb579","#8ebd91","#d88d9e","#9cacc9"];
        const color = u => /^#?[a-f\d]{6}$/i.test(u.regionColor) ? "#"+u.regionColor.replace("#", "") : colors[regions.indexOf(u.region)%colors.length];
        const width = Math.max(144, shanks.length*48+60);
        const xRanges = new Map(shanks.map(shank => {
          const xs = located.filter(p => p.shankId === shank && Number.isFinite(p.x)).map(p => p.x);
          const minX = Math.min(...xs), spanX = Math.max(...xs)-minX;
          return [shank,{minX,spanX}];
        }));
        const x = u => {
          const {minX,spanX} = xRanges.get(u.shankId);
          return 58+shanks.indexOf(u.shankId)*48+(Number.isFinite(u.x) && spanX > 0 ? (u.x-minX)/spanX*24-12 : 0);
        };
        const y = u => 460-(u.depthUm-min)/Math.max(1,max-min)*410;
        this.positions = located.map(unit => ({unit,x:x(unit),y:y(unit)}));
        const focus = overview.units.find(u => u.id === selected);
        this.host.innerHTML = `<header><strong>Probe</strong><span>${zh ? "位置与放电" : es ? "Posición y actividad" : "Position & activity"}</span></header><button class="probe-interval-toggle" data-probe-expand aria-expanded="${!!this.expanded}">${probeText("interval", this.lang)}</button><section class="probe-interval" ${this.expanded ? "" : "hidden"}><p data-interval-status role="status"></p><div data-distribution hidden><button data-distribution-orientation aria-pressed="false">Horizontal view</button><div class="probe-plot-pair"><div data-distribution-chart></div></div><small data-distribution-note></small></div><h4>${probeText("units", this.lang)}</h4><div data-rates></div><small>${probeText("semantics", this.lang)}</small></section>
          ${located.length ? `<svg class="probe-position-map" viewBox="0 0 ${width} 500" role="group" aria-label="2D Probe">${shanks.map(s => `<path d="M${58+shanks.indexOf(s)*48} 40 V475" class="probe-shaft"/><text x="${58+shanks.indexOf(s)*48}" y="25" text-anchor="middle">S${s == null ? "?" : s+1}</text>`).join("")}<text x="2" y="51">${Math.round(max)}</text><text x="2" y="465">${Math.round(min)}</text><text x="2" y="489">µm</text>${located.map(u => `<circle cx="${x(u)}" cy="${y(u)}" r="${u.id===selected ? 6 : 2.3}" fill="${color(u)}" data-source="${u.sourceIndex}" data-probe-unit="${u.id}" tabindex="${u.id===selected ? 0 : -1}" role="button" aria-label="Unit ${u.id}, ${esc(u.region)}, ${u.depthUm} µm" class="${u.id===selected ? "selected" : ""}"><title>Unit ${u.id} · ${esc(u.region)} · ${u.depthUm} µm</title></circle>`).join("")}</svg>` : `<p>${zh ? "此记录没有可用的探针坐标" : es ? "Sin coordenadas disponibles" : "No probe coordinates available"}</p>`}
          <div class="mini-probe-selection" aria-live="polite">${focus ? `<strong>Unit ${focus.id}</strong><b>${esc(focus.region)}</b><span>${focus.depthUm==null ? "—" : focus.depthUm+" µm"}</span>` : `<span>${zh ? "点击神经元查看位置" : es ? "Selecciona una unidad" : "Select a Unit to locate it"}</span>`}</div>
          <div class="mini-probe-regions">${regions.map(r => `<button data-probe-region="${esc(r)}">${esc(r)}</button>`).join("")}</div>
          <small>${overview.units.length-located.length ? `${overview.units.length-located.length} ${zh ? "个位置未知" : "unlocated"}` : zh ? "原始 Unit 坐标" : "Original Unit coordinates"}</small>
          <details><summary>${zh ? "附近神经元" : es ? "Unidades cercanas" : "Nearby Units"}</summary><div class="mini-probe-nearby">${located.slice(0,5).map(u => this.unitButton(u)).join("")}</div></details>`;
      }
      if (!this.host.querySelector("[data-template-expand]")) {
        const w = window.NeuropixelsTemplateFootprint.words(this.lang);
        const toggle = document.createElement("button"); toggle.className = "probe-template-toggle";
        toggle.dataset.templateExpand = ""; toggle.setAttribute("aria-expanded",String(!!this.templateExpanded));
        toggle.textContent = w.title;
        const panel = document.createElement("section"); panel.className = "probe-template"; panel.dataset.templatePanel = "";
        panel.hidden = !this.templateExpanded;
        const interval = this.host.querySelector(".probe-interval"); interval.before(toggle); interval.after(panel);
        this.templateRenderKey = null;
      }
      this.updateTemplate();
      this.updateInterval();
      if (this.expanded) return;
      const bin = Math.min(overview.binCount-1,Math.max(0,Math.floor(view.cursorTime/overview.binSeconds)));
      if (bin===this.bin && this.activity===overview) return;
      this.bin=bin; this.activity=overview;
      this.host.querySelectorAll("circle[data-source]").forEach(node => {
        const value=overview.normalizedActivity?.[Number(node.dataset.source)*overview.binCount+bin]||0;
        node.style.opacity=node.classList.contains("selected") ? "1" : String(.35+value/255*.65);
      });
    }

    renderDistribution() {
      const result = this.result;
      if (!result || !this.expanded) return;
      const panel = this.host.querySelector(".probe-interval");
      const map = this.host.querySelector(".probe-position-map");
      if (map) panel.querySelector(".probe-plot-pair").prepend(map);
      const metadata = new Map(this.overview.units.map(u => [u.id, u]));
      const units = result.units.map(rate => ({ ...metadata.get(rate.id), ...rate }));
      const horizontal = this.horizontal;
      const g = distributionGeometry(units, horizontal);
      panel.querySelector("[data-interval-status]").textContent = `Neural ${result.covered.start.toFixed(3)}–${result.covered.end.toFixed(3)} s · ${result.duration.toFixed(3)} s covered · [start, end)`;
      const rates = new Map(units.map(u => [u.id, u]));
      const describe = u => `Unit ${u.id} · ${u.region || "Unknown"} · Shank ${u.shankId == null ? "?" : u.shankId + 1} · ${u.depthUm ?? "?"} µm · ${u.rateHz.toFixed(3)} Hz · ${u.spikeCount} spikes`;
      this.host.querySelectorAll(".probe-position-map circle[data-probe-unit]").forEach(node => {
        const value = rates.get(Number(node.dataset.probeUnit));
        node.setAttribute("r", value ? 2 + 5 * Math.sqrt(value.rateHz / g.maxRate) : 2);
        node.style.opacity = value ? "1" : ".3";
        node.querySelector("title").textContent = value ? describe(value) : `Unit ${node.dataset.probeUnit} · unavailable`;
      });
      panel.querySelector("[data-distribution]").hidden = false;
      const toggle = panel.querySelector("[data-distribution-orientation]");
      toggle.textContent = probeText(horizontal ? "vertical" : "horizontal", this.lang);
      toggle.setAttribute("aria-pressed", String(horizontal));
      const fmt = n => Number(n.toFixed(2)).toLocaleString("en-US");
      const chart = panel.querySelector("[data-distribution-chart]");
      const colors = new Map([...this.host.querySelectorAll(".probe-position-map circle[data-probe-unit]")].map(n => [Number(n.dataset.probeUnit), n.getAttribute("fill")]));
      chart.innerHTML = `<svg class="interval-distribution-chart" viewBox="0 0 ${g.width} ${g.height}" role="group" aria-label="${horizontal ? "Horizontal" : "Vertical"} interval distribution: firing rate in Hz by measured depth in micrometers">
        <path class="distribution-axis" d="M${g.left},${g.top} V${g.bottom} H${g.right}"/>
        ${[0,.5,1].map(f => {
          const x = g.left + f * (g.right-g.left), y = g.bottom - f * (g.bottom-g.top);
          return `<path class="distribution-grid" d="M${g.left},${y} H${g.right}"/><text x="${g.left-5}" y="${y+3}" text-anchor="end">${fmt(horizontal ? f*g.maxRate : g.minDepth+f*(g.maxDepth-g.minDepth))}</text><text x="${x}" y="${g.bottom+17}" text-anchor="middle">${fmt(horizontal ? g.minDepth+f*(g.maxDepth-g.minDepth) : f*g.maxRate)}</text>`;
        }).join("")}
        <text x="${g.left}" y="12">${horizontal ? "Rate (Hz)" : "Depth (µm)"}</text><text x="${(g.left+g.right)/2}" y="${g.height-4}" text-anchor="middle">${horizontal ? "Depth (µm)" : "Rate (Hz)"}</text>
        ${g.points.map(u => `<g><title>${esc(describe(u))}</title><path class="distribution-stem" style="stroke:${colors.get(u.id) || "var(--accent)"}" d="M${horizontal ? u.x : g.left},${horizontal ? g.bottom : u.y} L${u.x},${u.y}"/><circle cx="${u.x}" cy="${u.y}" r="${u.id === this.selected ? 4 : 2.5}" fill="${colors.get(u.id) || "var(--accent)"}" data-probe-unit="${u.id}" role="button" tabindex="${u.id === this.selected ? 0 : -1}" aria-label="${esc(describe(u))}" class="${u.id === this.selected ? "selected" : ""}"/></g>`).join("")}</svg>`;
      panel.querySelector("[data-distribution-note]").textContent = `${g.points.length} positioned / ${units.length} Units · one mark per Unit; hover for details. ${units.length-g.points.length ? "Unknown positions appear in the list only." : ""}`;
      panel.querySelector("[data-rates]").innerHTML = units.sort((a,b) => (b.depthUm ?? -Infinity) - (a.depthUm ?? -Infinity) || a.id-b.id).map(u => `<button data-probe-unit="${u.id}" aria-pressed="${u.id === this.selected}" title="${esc(describe(u))}">Unit ${u.id} · <strong>${u.rateHz.toFixed(2)} Hz</strong><br><small>${esc(u.region || "Unknown")} · ${u.depthUm ?? "?"} µm · ${u.spikeCount} spikes</small><i class="probe-rate-bar" style="width:${u.rateHz/g.maxRate*100}%"></i></button>`).join("");
    }

    updateInterval() {
      const panel = this.host.querySelector(".probe-interval"), button = this.host.querySelector("[data-probe-expand]");
      if (!panel) return;
      panel.hidden = !this.expanded; button.setAttribute("aria-expanded", String(!!this.expanded));
      button.textContent = probeText("interval", this.lang);
      const range = this.view?.selectedInterval;
      const dataKey = JSON.stringify([this.recording?.databaseId || this.recording?.key, this.recording?.dataVersion, range?.start, range?.end]);
      const key = JSON.stringify([dataKey, this.expanded]);
      if (key === this.intervalKey) return;
      const map = this.host.querySelector(".probe-position-map");
      if (map) this.host.insertBefore(map, this.host.querySelector(".mini-probe-selection"));
      this.intervalKey = key; clearTimeout(this.intervalTimer); this.intervalAbort?.abort();
      this.host.querySelectorAll(".probe-position-map circle[data-probe-unit]").forEach(node => {
        node.setAttribute("r", node.classList.contains("selected") ? 6 : 2.3); node.style.opacity = "1";
      });
      this.bin = null;
      if (!this.expanded) return;
      const status = panel.querySelector("[data-interval-status]"), list = panel.querySelector("[data-rates]");
      list.replaceChildren();
      panel.querySelector("[data-distribution]").hidden = true;
      if (!range) { status.textContent = probeText("choose", this.lang); return; }
      if (!this.recording?.databaseId && !this.intervalReader) { status.textContent = "Load a recording to calculate interval rates."; return; }
      if (this.result && this.resultKey === dataKey) { this.renderDistribution(); return; }
      this.result = null; this.resultKey = null;
      status.textContent = probeText("loading", this.lang);
      this.intervalTimer = setTimeout(async () => {
        const abort = new AbortController(); this.intervalAbort = abort;
        try {
          let result;
          if (!this.recording.databaseId && this.intervalReader) result = await this.intervalReader(this.recording, range, abort.signal);
          else {
            const response = await fetch(`/api/recordings/${encodeURIComponent(this.recording.databaseId)}/interval-activity?start=${range.start}&end=${range.end}`, { signal: abort.signal });
            result = await response.json();
            if (!response.ok) throw new Error(result.message || result.error || "Interval calculation failed");
          }
          if (key !== this.intervalKey) return;
          this.result = result; this.resultKey = dataKey;
          this.renderDistribution();
        } catch (error) { if (key === this.intervalKey && error.name !== "AbortError") status.textContent = error.message; }
      }, 250);
    }
  }
  if (typeof module === "object" && module.exports) module.exports = { distributionGeometry, MiniProbe };
  else window.NeuropixelsMiniProbe=MiniProbe;
})();
