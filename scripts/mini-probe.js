// SPDX-License-Identifier: MIT
// Measured unit coordinates, never an inferred atlas trajectory.
(() => {
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const probeText = (key, lang) => {
    const copy = {
      interval: ["Interval distribution", "区间活动分布", "Actividad del intervalo"],
      unitRegions: ["Unit regions · CSV", "Unit 脑区归属 · CSV", "Regiones por Unit · CSV"],
      trackRegions: ["Regions by depth · CSV", "按深度标脑区 · CSV", "Regiones por profundidad · CSV"],
      dropTable: ["Drop the CSV here.", "将 CSV 拖到这里。", "Suelta el CSV aquí."],
      firstRecording: ["Load the recording, then drop its CSV here.", "先导入记录，再把对应的 CSV 拖到这里。", "Carga el registro y después suelta aquí su CSV."],
      unitExample: ["One row per Unit. Replace the example with your recording, Unit and region.", "每行一个 Unit。示例中的记录、Unit 和脑区要换成实际值。", "Una fila por Unit. Usa tu registro, Unit y región reales."],
      trackExample: ["One row per measured depth in µm. Use the recording’s numeric shank IDs (S1 on the plot is 0). Convert a brain map image into this depth-to-region table first.", "每行一个实测深度（µm）。使用记录中的数字柄号（图上 S1 对应 0）。若手里是脑区图片，先按实验定位整理出深度与脑区的对应表。", "Una fila por profundidad medida en µm. Usa el ID numérico de la sonda (S1 en la gráfica es 0). Convierte la imagen anatómica en una tabla de profundidad y región."],
      idRule: ["CSV matching uses the experiment number in the recording name (e.g. Exp1). Use a unique number per recording.", "CSV 按记录名中的实验数字匹配（如 Exp1）。每条记录需有独立编号。", "El CSV se vincula por el número del nombre del registro (p. ej., Exp1). Usa un número único por registro."],
      jsonAlternative: ["For other names or repeated recording numbers, place the following file in each Kilosort folder. Replace 7 and CA1 with its Unit ID and region.", "若记录名没有可匹配的实验数字或多条记录同号，可在各自 Kilosort 文件夹内放下列文件。将 7 和 CA1 换为该记录的 Unit ID 和脑区。", "Para otros nombres o números repetidos, coloca este archivo en cada carpeta Kilosort. Sustituye 7 y CA1 por la Unit y su región."],
      horizontal: ["Horizontal view", "横向显示", "Vista horizontal"],
      unitPosition: ["Locate Units", "定位 Unit", "Localizar unidades"],
      or: [" or ", " 或 ", " o "],
      unitDepths: ["explorer-units.json with probe_depth_um", "含 probe_depth_um 的 explorer-units.json", "explorer-units.json con probe_depth_um"],
      noCoordinates: ["No probe coordinates available", "此记录没有可用的探针坐标", "Sin coordenadas disponibles"],
      missingInputs: ["Missing", "缺少", "Falta"],
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
    static regionInputs(lang, recording=null, needsUnits=true, needsTrack=true, openTables=[]) {
      if (recording?.jointSources || !needsUnits && !needsTrack) return "";
      const row=(table,title,example,note,extra="")=>{
        const target=recording ? `data-import-drop="neural" data-import-table="${table}" data-import-recording-key="${esc(recording.key)}"` : "";
        return `<details class="probe-region-import" data-region-format="${table}" ${target} ${openTables.includes(table)?"open":""}>
          <summary>${esc(probeText(title,lang))}</summary>
          <div><p>${esc(probeText(recording?"dropTable":"firstRecording",lang))} ${esc(probeText(note,lang))}</p>
          <pre>${esc(example).replaceAll(",",",<wbr>")}</pre><p>${esc(probeText("idRule",lang))}</p></div>${extra}</details>`;
      };
      const jsonTarget=recording && !recording.byName?.has("explorer-units.json") ? `data-import-drop="neural" data-import-files="explorer-units.json" data-import-recording-key="${esc(recording.key)}"` : "";
      const unitJson=recording?.fromNwb?"":`<div ${jsonTarget}><p>${esc(probeText("jsonAlternative",lang))}</p><code>explorer-units.json</code><pre>{"units": [{\n  "cluster_id": 7,\n  "brain_region": "CA1"\n}]}</pre></div>`;
      return (needsUnits?row("direct","unitRegions","experiment,cluster_id,region\nExp1,7,CA1","unitExample",unitJson):"")
        +(needsTrack?row("trackDirect","trackRegions","experiment,shank,depth_um,region\nExp1,0,320,CA1\nExp1,0,340,CA1","trackExample"):"");
    }
    constructor(host, onUnit, onRegion) {
      this.host = host;
      this.horizontal = false;
      host.addEventListener("toggle", e => {
        if(!e.target.matches("details.probe-distribution"))return;
        if(e.target.firstElementChild.hasAttribute("data-template-expand")){
          if(Boolean(this.templateExpanded)===e.target.open)return;
          this.templateExpanded=e.target.open;
          if(this.templateLoad?.error)this.templateLoad=null;
          this.templateRenderKey=null; this.updateTemplate();
        }else{
          if(Boolean(this.expanded)===e.target.open)return;
          this.expanded=e.target.open; this.syncExpanded();
          this.intervalKey=null; this.updateInterval();
        }
      },true);
      host.addEventListener("click", e => {
        const channel = e.target.closest("[data-template-channel]");
        if (channel) this.selectTemplateChannel(Number(channel.dataset.templateChannel));
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
    }
    unitName(id){const ref=this.recording?.jointUnits?.get(Number(id));return ref?(ref.probeName||ref.recordingKey)+' · Unit '+ref.unitId:'Unit '+id;}
    unitButton(u) { return `<button data-help-key="hint.probeUnit" data-probe-unit="${u.id}" ${window.NeuropixelsUnitMarks?.attrs(this.recording,u.id)||''}>${esc(this.unitName(u.id))}<small>${esc(u.region)} · ${u.depthUm} µm</small></button>`; }
    syncExpanded() { this.host.classList.toggle("probe-expanded", !!(this.expanded || this.templateExpanded)); }
    selectTemplateChannel(index) {
      this.templateChannel = index; this.templateRenderKey = null; this.updateTemplate();
      this.host.querySelector("[data-template-channel-select]")?.focus({preventScroll:true});
    }
    fileSlot(recording,lang,names,description) {
      const browser=!!window.NeuropixelsBrowserProjectUI;
      const title=browser?window.NeuropixelsI18n.translate(lang,"drop.neuralMissing"):probeText("missingInputs",lang);
      const target=browser?`class="file-drop-slot" data-import-drop="neural" data-import-files="${esc(names.join(" "))}" data-import-recording-key="${esc(recording.key)}"`:"";
      return `<p role="status" data-severity="warning" ${target}>${esc(title)}<br>${esc(description || names.join(", "))}</p>`;
    }
    templateInputHint(recording,lang) {
      if(!recording?.byName?.has)return "";
      const missing=["templates.npy","spike_templates.npy","channel_positions.npy"].filter(f=>!recording.byName.has(f));
      if(recording.fromNwb && window.NeuropixelsBrowserProjectUI){
        return `<p role="status" data-severity="warning" class="file-drop-slot" data-import-drop="neural" data-import-folder="kilosort">${esc(window.NeuropixelsI18n.translate(lang,"drop.allenSorting"))}</p>`;
      }
      const needed=[...(recording.missingInputs || []),...missing];
      return needed.length?this.fileSlot(recording,lang,needed):"";
    }
    positionInputHint(recording,lang) {
      const empty=`<p data-severity="warning">${esc(probeText("noCoordinates",lang))}</p>`;
      if(!recording?.byName || recording.fromNwb)return empty;
      const inputs=recording.missingInputs || [];
      const hasPosition=recording.byName.has("spike_positions.npy") || recording.units?.some(u=>u.probe_depth_um!=null);
      if(inputs.length && hasPosition)return this.fileSlot(recording,lang,inputs);
      const options=["spike_positions.npy","explorer-units.json"].filter(name=>!recording.byName.has(name));
      if(!options.length)return inputs.length?this.fileSlot(recording,lang,inputs):empty;
      const choices=options.map(name=>name==="explorer-units.json"?probeText("unitDepths",lang):name).join(probeText("or",lang));
      return this.fileSlot(recording,lang,[...inputs,...options],[...inputs,inputs.length && options.length>1 ? `(${choices})` : choices].join(" + "));
    }
    updateTemplate() {
      const panel = this.host.querySelector("[data-template-panel]");
      if (!panel) return;
      this.syncExpanded();
      panel.hidden = !this.templateExpanded;
      if (!this.templateExpanded) return;
      const key = [this.selected, this.review, this.templateChannel, this.lang];
      if (this.templateRenderKey?.every((v,i) => v === key[i])) return;
      this.templateRenderKey = key;
      const api = window.NeuropixelsTemplateFootprint;
      const hint=this.templateInputHint(this.recording,this.lang);
      if(hint || this.selected==null){
        panel.innerHTML=hint || `<p role="status">${api.words(this.lang).select}</p>`;
        return;
      }
      if(!this.review?.templateFootprint && !this.templateLoad){
        const load=this.templateLoad={};
        this.readTemplate(this.recording,this.selected)
          .then(data=>{load.data=data || {status:"missing_templates"};},error=>{load.error=error.message;})
          .finally(()=>{
            if(this.templateLoad!==load)return;
            this.templateRenderKey=null;
            this.updateTemplate();
          });
      }
      const data=this.review?.templateFootprint || this.templateLoad?.data;
      panel.innerHTML=this.templateLoad?.error && !data ? `<p role="status" data-severity="error">${esc(this.templateLoad.error)}</p>`
        : api.render(data ? {...data,clusterId:this.selected} : null,this.templateChannel,this.lang);
    }
    update(overview, view, recording, review = null, projectKey, probeTrack) {
      if (this.recording !== recording || this.selected !== view.selectedUnitId) {
        this.templateChannel = null; this.templateRenderKey = null; this.templateLoad = null;
      }
      this.review = review?.clusterId === view.selectedUnitId ? review : null;
      this.view = view; this.recording = recording;
      const lang=document.documentElement.lang;
      const anatomy=()=>{
        if(!window.NeuropixelsBrowserProjectUI || !recording || recording.databaseId || recording.jointSources)return "";
        const regions=recording.units?.some(u=>u.brain_region) || overview?.units.some(u=>u.regionSource);
        const exp=recording.recordingIndex ?? window.NeuropixelRegionCore.experimentNumber(recording.name || recording.key);
        const hasTrack=probeTrack?.profiles?.some(p=>p.experiment==null || p.experiment===exp);
        const openTables=[...this.host.querySelectorAll("[data-region-format][open]")].map(el=>el.dataset.regionFormat);
        return MiniProbe.regionInputs(lang,recording,!regions,!hasTrack,openTables);
      };
      if (!overview) {
        this.result = null; this.resultKey = null; this.overview = null; this.intervalKey = null; clearTimeout(this.intervalTimer); this.intervalAbort?.abort();
        if(!recording?.missingInputs?.length){this.host.innerHTML="";return;}
        const key=JSON.stringify([recording.key,recording.files.map(f=>f.name),probeTrack?.files,lang]);
        if(this.host.firstElementChild?.dataset.partialProbe===key)return;
        this.host.innerHTML=`<header data-partial-probe="${esc(key)}"><strong>Probe</strong></header>
          ${anatomy()}<details><summary>${esc(probeText("unitPosition",lang))}</summary>${this.positionInputHint(recording,lang)}</details>
          <details><summary>${esc(window.NeuropixelsTemplateFootprint.words(lang).title)}</summary>${this.templateInputHint(recording,lang)}</details>`;
        return;
      }
      const selected = view.selectedUnitId;
      if (this.overview !== overview || this.selected !== selected || this.lang !== lang || this.probeTrack !== probeTrack) {
        this.probeTrack=probeTrack;
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
        const nearbyOpen = this.host.querySelector(".mini-probe-nearby")?.parentElement.open;
        this.templateRenderKey = null;
        this.host.innerHTML = `<header><strong>Probe</strong><span>${zh ? "位置与放电" : es ? "Posición y actividad" : "Position & activity"}</span></header>
          ${anatomy()}
          <details class="probe-distribution" ${this.expanded ? "open" : ""}>
          <summary data-help-key="hint.distribution" class="probe-interval-toggle" data-probe-expand aria-controls="probe-interval-panel">${probeText("interval", this.lang)}</summary>
          <section id="probe-interval-panel" class="probe-interval" ${this.expanded ? "" : "hidden"}><p data-interval-status role="status"></p><div data-distribution hidden><button data-distribution-orientation>Horizontal view</button><div class="probe-plot-pair"><div data-distribution-chart></div></div><small data-distribution-note></small><h4>${probeText("units", this.lang)}</h4><div data-rates></div><small>${probeText("semantics", this.lang)}</small></div></section></details>
          <details class="probe-distribution" ${this.templateExpanded ? "open" : ""}>
          <summary data-help-key="hint.template" class="probe-template-toggle" data-template-expand aria-controls="probe-template-panel">${esc(window.NeuropixelsTemplateFootprint.words(this.lang).title)}</summary>
          <section id="probe-template-panel" class="probe-template" data-template-panel ${this.templateExpanded ? "" : "hidden"}></section></details>
          ${located.length ? `<svg class="probe-position-map" viewBox="0 0 ${width} 500" role="group" aria-label="2D Probe">${shanks.map(s => `<path d="M${58+shanks.indexOf(s)*48} 40 V475" class="probe-shaft"/><text x="${58+shanks.indexOf(s)*48}" y="25" text-anchor="middle">S${s == null ? "?" : s+1}</text>`).join("")}<text x="2" y="51">${Math.round(max)}</text><text x="2" y="465">${Math.round(min)}</text><text x="2" y="489">µm</text>${located.map(u => `<circle cx="${x(u)}" cy="${y(u)}" r="${u.id===selected ? 6 : 2.3}" fill="${color(u)}" data-source="${u.sourceIndex}" data-probe-unit="${u.id}" ${window.NeuropixelsUnitMarks?.attrs(this.recording,u.id)||''} tabindex="${u.id===selected ? 0 : -1}" role="button" aria-label="${esc(this.unitName(u.id))}, ${esc(u.region)}, ${u.depthUm} µm" class="${u.id===selected ? "selected" : ""}"><title>${esc(this.unitName(u.id))} · ${esc(u.region)} · ${u.depthUm} µm</title></circle>`).join("")}</svg>` : this.positionInputHint(recording,this.lang)}
          <div class="mini-probe-selection" aria-live="polite">${focus ? `<strong ${window.NeuropixelsUnitMarks?.attrs(recording,focus.id)||''}>${esc(this.unitName(focus.id))}</strong><b>${esc(focus.region)}</b><span>${focus.depthUm==null ? "—" : focus.depthUm+" µm"}</span>` : `<span>${zh ? "点击神经元查看位置" : es ? "Selecciona una unidad" : "Select a Unit to locate it"}</span>`}</div>
          <div class="mini-probe-regions">${regions.map(r => `<button data-help-key="hint.probeRegion" data-probe-region="${esc(r)}">${esc(r)}</button>`).join("")}</div>
          <small>${overview.units.length-located.length ? `${overview.units.length-located.length} ${zh ? "个位置未知" : "unlocated"}` : zh ? "原始 Unit 坐标" : "Original Unit coordinates"}</small>
          <details ${nearbyOpen ? "open" : ""}><summary>${zh ? "附近神经元" : es ? "Unidades cercanas" : "Nearby Units"}</summary><div class="mini-probe-nearby">${located.slice(0,5).map(u => this.unitButton(u)).join("")}</div></details>`;
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
      const metadata = new Map(this.overview.units.map(u => [u.id, u]));
      const units = result.units.map(rate => ({ ...metadata.get(rate.id), ...rate }));
      const horizontal = this.horizontal;
      const g = distributionGeometry(units, horizontal);
      panel.querySelector("[data-interval-status]").textContent = `Neural ${result.covered.start.toFixed(3)}–${result.covered.end.toFixed(3)} s · ${result.duration.toFixed(3)} s covered · [start, end)`;
      const rates = new Map(units.map(u => [u.id, u]));
      const describe = u => {
        const shank=this.recording?.jointUnits?.get(u.id)?.shankId ?? u.shankId;
        return `${this.unitName(u.id)} · ${u.region || "Unknown"} · Shank ${shank==null ? "?" : shank+1} · ${u.depthUm ?? "?"} µm · ${u.rateHz.toFixed(3)} Hz · ${u.spikeCount} spikes`;
      };
      this.host.querySelectorAll(".probe-position-map circle[data-probe-unit]").forEach(node => {
        const value = rates.get(Number(node.dataset.probeUnit));
        node.setAttribute("r", value ? 2 + 5 * Math.sqrt(value.rateHz / g.maxRate) : 2);
        node.style.opacity = value ? "1" : ".3";
        node.querySelector("title").textContent = value ? describe(value) : `${this.unitName(node.dataset.probeUnit)} · unavailable`;
      });
      panel.querySelector("[data-distribution]").hidden = false;
      const toggle = panel.querySelector("[data-distribution-orientation]");
      toggle.textContent = probeText(horizontal ? "vertical" : "horizontal", this.lang);
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
        ${g.points.map(u => `<g><title>${esc(describe(u))}</title><path class="distribution-stem" style="stroke:${colors.get(u.id) || "var(--accent)"}" d="M${horizontal ? u.x : g.left},${horizontal ? g.bottom : u.y} L${u.x},${u.y}"/><circle cx="${u.x}" cy="${u.y}" r="${u.id === this.selected ? 4 : 2.5}" fill="${colors.get(u.id) || "var(--accent)"}" data-probe-unit="${u.id}" ${window.NeuropixelsUnitMarks?.attrs(this.recording,u.id)||''} role="button" tabindex="${u.id === this.selected ? 0 : -1}" aria-label="${esc(describe(u))}" class="${u.id === this.selected ? "selected" : ""}"/></g>`).join("")}</svg>`;
      panel.querySelector("[data-distribution-note]").textContent = `${g.points.length} positioned / ${units.length} Units · one mark per Unit; hover for details. ${units.length-g.points.length ? "Unknown positions appear in the list only." : ""}`;
      panel.querySelector("[data-rates]").innerHTML = units.sort((a,b) => (b.depthUm ?? -Infinity) - (a.depthUm ?? -Infinity) || a.id-b.id).map(u => `<button data-probe-unit="${u.id}" ${window.NeuropixelsUnitMarks?.attrs(this.recording,u.id)||''} aria-pressed="${u.id === this.selected}" title="${esc(describe(u))}">${esc(this.unitName(u.id))} · <strong>${u.rateHz.toFixed(2)} Hz</strong><br><small>${esc(u.region || "Unknown")} · ${u.depthUm ?? "?"} µm · ${u.spikeCount} spikes</small><i class="probe-rate-bar" style="width:${u.rateHz/g.maxRate*100}%"></i></button>`).join("");
    }

    updateInterval() {
      const panel = this.host.querySelector(".probe-interval"), button = this.host.querySelector("[data-probe-expand]");
      if (!panel) return;
      panel.hidden = !this.expanded;
      button.textContent = probeText("interval", this.lang);
      const range = this.view?.selectedInterval;
      const dataKey = JSON.stringify([this.recording?.databaseId || this.recording?.key, this.recording?.dataVersion, range?.start, range?.end]);
      const key = JSON.stringify([dataKey, this.expanded]);
      if (key === this.intervalKey) return;
      this.intervalKey = key; clearTimeout(this.intervalTimer); this.intervalAbort?.abort();
      this.host.querySelectorAll(".probe-position-map circle[data-probe-unit]").forEach(node => {
        node.setAttribute("r", node.classList.contains("selected") ? 6 : 2.3); node.style.opacity = "1";
      });
      this.bin = null;
      if (!this.expanded) return;
      const status = panel.querySelector("[data-interval-status]"), list = panel.querySelector("[data-rates]");
      status.removeAttribute("data-severity");
      list.replaceChildren();
      panel.querySelector("[data-distribution]").hidden = true;
      if (!range) { status.textContent = probeText("choose", this.lang); return; }
      if (!this.recording?.databaseId && !this.intervalReader) { status.dataset.severity = "warning"; status.textContent = "Load a recording to calculate interval rates."; return; }
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
        } catch (error) {
          if (key !== this.intervalKey || error.name === "AbortError") return;
          status.dataset.severity = "error";
          status.textContent = error.message;
        }
      }, 250);
    }
  }
  if (typeof module === "object" && module.exports) module.exports = { distributionGeometry, MiniProbe };
  else window.NeuropixelsMiniProbe=MiniProbe;
})();
