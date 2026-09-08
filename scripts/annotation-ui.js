// SPDX-License-Identifier: MIT
(() => {
  "use strict";
  const A = window.NeuropixelsAnnotations;
  const D = window.NeuropixelsBehaviorDiscovery;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COPY = {
    open: ["ANNOTATE · BETA", "行为标注 · BETA", "ANOTAR · BETA"],
    title: ["Behavior annotation", "行为标注", "Anotación de conducta"],
    close: ["Close annotation editor", "关闭标注编辑器", "Cerrar editor"],
    empty: ["Attach a video to annotate intervals on the shared neural timeline.", "请先关联视频，再在共享神经时间轴上标注区间。", "Adjunta un vídeo para anotar intervalos en el eje neural compartido."],
    scheme: ["Label scheme", "标签方案", "Esquema de etiquetas"],
    schemeName: ["New scheme name", "新方案名称", "Nombre del esquema"],
    newScheme: ["New scheme", "新建方案", "Nuevo esquema"],
    import: ["Import project / candidates", "导入项目 / 候选", "Importar proyecto / candidatos"],
    save: ["Save project", "保存项目", "Guardar proyecto"],
    csv: ["Export CSV", "导出 CSV", "Exportar CSV"],
    undo: ["Undo", "撤销", "Deshacer"], redo: ["Redo", "重做", "Rehacer"],
    group: ["Review group", "检查分组", "Revisar grupo"], all: ["All clips", "全部片段", "Todos los clips"],
    groupName: ["Behavior name for this group", "这一组的行为名称", "Nombre de conducta del grupo"],
    nameGroup: ["Name group", "命名分组", "Nombrar grupo"],
    samples: ["Group samples · typical, distant and distributed in time", "分组样本 · 典型、差异较大与不同时段", "Muestras · típicas, distantes y de distintos tiempos"],
    selected: ["selected", "已选择", "seleccionados"], reviewed: ["Reviewed", "已确认", "Revisado"], suggested: ["Needs review", "待确认", "Por revisar"],
    noClips: ["Select an interval on the neural canvas, or run/import candidate grouping. Behavior names are yours to define.", "在神经画布上框选区间，或运行 / 导入候选分组。行为名称由你定义。", "Selecciona un intervalo en el lienzo neural, o genera/importa grupos. Tú defines las conductas."],
    start: ["Start · video s", "起点 · 视频秒", "Inicio · s de vídeo"], end: ["End · video s", "终点 · 视频秒", "Fin · s de vídeo"],
    markStart: ["Set start at cursor", "光标设为起点", "Inicio en cursor"], markEnd: ["Set end at cursor", "光标设为终点", "Fin en cursor"],
    useRange: ["Use shared selection", "使用时间轴选区", "Usar intervalo compartido"],
    label: ["Behavior label", "行为标签", "Etiqueta de conducta"], subject: ["Subject", "动物 / 个体", "Individuo"], track: ["Track", "轨道", "Pista"],
    add: ["Add interval", "添加区间", "Añadir intervalo"], edit: ["Update selected clip", "修改所选片段", "Actualizar clip"],
    confirm: ["Confirm selected", "确认所选", "Confirmar selección"],
    apply: ["Label selected", "标记所选", "Etiquetar selección"], regroup: ["Move selected to new group", "将所选移入新组", "Mover selección a nuevo grupo"],
    merge: ["Merge adjacent clips", "合并相邻片段", "Unir clips adyacentes"],
    split: ["Split at cursor", "在光标处拆分", "Dividir en cursor"], remove: ["Remove selected", "移除所选", "Eliminar selección"],
    loop: ["Loop selected clip", "循环所选片段", "Repetir clip seleccionado"],
    prev: ["Previous", "上一页", "Anterior"], next: ["Next", "下一页", "Siguiente"],
    selectPage: ["Select this page", "选择本页", "Seleccionar página"], clear: ["Clear selection", "清空选择", "Limpiar selección"],
    auto: ["Experimental grouping", "实验性自动分组", "Agrupación experimental"],
    autoHelp: ["Motion + appearance grouping; may separate position or lighting rather than behaviors. All output needs review. For pose-based methods, import candidates instead.", "按运动和画面特征分组，可能受位置或光照影响；所有结果均需复核。基于关键点的方法可通过候选文件导入。", "Agrupa movimiento y apariencia; puede reflejar posición o iluminación. Revisa todos los resultados. Importa candidatos para métodos de pose."],
    count: ["Target groups", "目标组数", "Grupos objetivo"], minimum: ["Minimum bout · s", "短片段合并阈值 · 秒", "Umbral de duración · s"],
    run: ["Group this video", "为此视频分组", "Agrupar este vídeo"], cancel: ["Cancel", "取消", "Cancelar"],
    progress: ["Analyzing locally", "正在本地分析", "Analizando localmente"], clustering: ["Clustering motion samples…", "正在聚类运动样本…", "Agrupando muestras…"],
    cancelled: ["Analysis cancelled", "分析已取消", "Análisis cancelado"],
    autoVideo: ["Attach a real video file for experimental grouping.", "请关联真实视频文件以试验自动分组。", "Adjunta un vídeo real para probar la agrupación."],
    saved: ["Draft saved on this browser · Save project for a portable backup", "草稿已保存在此浏览器 · 保存项目可获得可迁移备份", "Borrador guardado en este navegador · Guarda el proyecto como respaldo"],
    saving: ["Saving draft…", "正在保存草稿…", "Guardando borrador…"],
    storageError: ["Browser storage unavailable. Save project before closing.", "浏览器存储不可用，请在关闭前保存项目。", "Almacenamiento no disponible. Guarda el proyecto antes de cerrar."],
    error: ["Annotation", "行为标注", "Anotación"],
    selectOne: ["Select exactly one clip", "请只选择一个片段", "Selecciona exactamente un clip"],
    chooseClips: ["Select clips first", "请先选择片段", "Selecciona clips primero"],
    chooseGroup: ["Choose one review group", "请选择一个分组", "Elige un grupo"],
    unverified: ["Video ↔ neural synchronization is unverified. Video boundaries remain the source of truth.", "视频与神经时间的同步尚未验证。标注以原视频边界为准。", "Sincronización vídeo ↔ neural sin verificar. Se conservan los límites del vídeo."],
    verified: ["Video boundaries are mapped to the shared neural timeline.", "视频区间已映射到共享神经时间轴。", "Los intervalos se muestran en el eje neural compartido."],
    table: ["Annotation clips", "标注片段", "Clips anotados"],
    detail: ["Review and edit", "检查与编辑", "Revisar y editar"],
    preview: ["Play in shared video", "在同步视频中播放", "Reproducir en vídeo compartido"],
    limited: ["Timeline shows up to 1,000 visible clips; zoom or use the list for dense regions.", "时间轨道最多显示 1,000 个可见片段；密集区域请缩放或使用列表。", "Se muestran hasta 1.000 clips; amplía o usa la lista para zonas densas."],
    loaded: ["Project loaded", "项目已载入", "Proyecto cargado"],
    imported: ["Candidates imported; labels require review", "候选已导入；标签需要人工确认", "Candidatos importados; requieren revisión"],
    importedWarning: ["Loading a project replaces this draft (Undo restores it).", "载入项目会替换当前草稿，可用撤销恢复。", "Cargar reemplaza el borrador (Deshacer lo restaura)."],
    seconds: ["video seconds", "视频秒", "segundos de vídeo"]
  };
  const tr = (key) => COPY[key]?.[document.documentElement.lang === "zh-CN" ? 1 : document.documentElement.lang === "es" ? 2 : 0] || key;
  class DraftStore {
    constructor() { this.db = null; }
    async open() {
      if (!this.db) this.db = new Promise((resolve, reject) => {
        const request = indexedDB.open("neuropixels-behavior-annotations", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("projects");
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      return this.db;
    }
    async request(key, value) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("projects", value == null ? "readonly" : "readwrite");
        const request = value == null ? tx.objectStore("projects").get(key) : tx.objectStore("projects").put(value, key);
        let result; request.onsuccess = () => { result = request.result; };
        tx.oncomplete = () => resolve(result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });
    }
  }
  class AnnotationController {
    constructor({ panel, strip, button, video, getRecording, getView, setView, toast }) {
      Object.assign(this, { panel, strip, button, video, getRecording, getView, setView, toast });
      this.store = new DraftStore(); this.doc = null; this.key = null; this.history = []; this.future = [];
      this.selected = new Set(); this.group = ""; this.page = 0; this.opened = false; this.loop = null;
      this.saveQueue = Promise.resolve(); this.storageStatus = "saved";
      button.addEventListener("click", () => { this.opened = !this.opened; this.render(); if (this.opened) panel.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
      panel.addEventListener("click", (e) => this.action(e));
      panel.addEventListener("change", (e) => this.onChange(e));
      strip.addEventListener("click", (e) => { const node = e.target.closest("[data-clip]"); if (node && !this.dragged) this.select(node.dataset.clip); this.dragged = false; });
      strip.addEventListener("keydown", (e) => { if (["Enter", " "].includes(e.key) && e.target.dataset.clip) { e.preventDefault(); this.select(e.target.dataset.clip); } });
      strip.addEventListener("pointerdown", (e) => this.dragStart(e));
      strip.addEventListener("pointermove", (e) => this.dragMove(e));
      strip.addEventListener("pointerup", (e) => this.dragEnd(e));
      strip.addEventListener("pointercancel", () => { this.drag = null; this.drawTimeline(); });
      panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { this.opened = false; this.render(); button.focus(); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); this.downloadProject(); }
      });
      this.render();
    }
    buttonHTML(action, key, extra = "") { return `<button type="button" data-action="${action}" ${extra}>${esc(tr(key))}</button>`; }
    async update() {
      const recording = this.getRecording(), source = this.video?.source;
      const duration = Number(source?.duration || 0);
      const context = recording && source && duration > 0 ? {
        key: JSON.stringify([recording.databaseId ?? recording.key, source.kind, source.name, source.size ?? null]),
        recordingKey: String(recording.databaseId ?? recording.key), videoName: source.name,
        videoSize: source.size ?? null, duration
      } : null;
      if ((context?.key || null) !== this.key) {
        this.abort?.abort(); this.persist();
        this.key = context?.key || null; this.doc = null; this.history = []; this.future = []; this.selected.clear(); this.group = ""; this.page = 0; this.loop = null;
        this.render();
        if (context) {
          const token = this.key;
          try {
            await this.saveQueue;
            const saved = await this.store.request(context.key);
            if (this.key !== token) return;
            this.doc = saved ? A.validate(saved, context) : A.create(context); this.storageStatus = "saved";
          } catch (e) {
            if (this.key !== token) return;
            this.doc = A.create(context); this.storageStatus = "storageError"; this.toast(`${tr("error")}: ${e.message}`);
          }
          this.render();
        }
      } else {
        if (this.doc && Math.abs(this.doc.context.duration - duration) > .05) { this.doc.context.duration = duration; }
        this.drawTimeline();
        const sync = this.panel.querySelector("[data-sync-note]"); if (sync) sync.textContent = tr(this.video.mapping.verificationStatus === "verified" ? "verified" : "unverified");
      }
      if (this.loop && (this.video.elements.video.ended || (this.video.playing && this.video.currentVideoTime >= this.loop.end))) {
        const ended = this.video.elements.video.ended;
        this.video.seekVideo(this.loop.start); if (ended) this.video.play();
      }
    }
    persist() {
      if (!this.doc) return;
      const doc = A.clone(this.doc), key = this.key;
      this.storageStatus = "saving";
      this.saveQueue = this.saveQueue.catch(() => {}).then(() => this.store.request(key, doc)).then(() => {
        if (this.key === key) this.storageStatus = "saved"; this.renderStorage();
      }, () => { if (this.key === key) this.storageStatus = "storageError"; this.renderStorage(); });
    }
    renderStorage() { const node = this.panel.querySelector("[data-storage]"); if (node) { node.textContent = tr(this.storageStatus); node.dataset.failed = String(this.storageStatus === "storageError"); } }
    commit(next) {
      this.history.push(this.doc); if (this.history.length > 30) this.history.shift();
      this.future = []; this.doc = next; this.loop = null;
      this.selected = new Set([...this.selected].filter((id) => next.segments.some((s) => s.id === id)));
      if (this.selected.size === 1) {
        const clip = next.segments.find((s) => this.selected.has(s.id));
        const start = this.video.mapping.videoToNeural(clip.start), end = this.video.mapping.videoToNeural(clip.end);
        this.setView({ selectedInterval: Number.isFinite(start) && Number.isFinite(end) ? { start, end } : null });
      }
      this.persist(); this.render();
    }
    render() {
      this.button.textContent = tr("open"); this.button.setAttribute("aria-expanded", String(this.opened));
      this.panel.hidden = !this.opened; this.strip.hidden = !this.doc;
      this.panel.querySelectorAll("video").forEach((v) => { v.pause(); v.removeAttribute("src"); v.load(); });
      if (!this.opened) { this.panel.innerHTML = ""; this.drawTimeline(); return; }
      const autoOpen = this.panel.querySelector(".annotation-algorithm")?.open || Boolean(this.abort);
      this.autoCount = this.panel.querySelector("[data-clusters]")?.value || this.autoCount || "8";
      this.autoMinimum = this.panel.querySelector("[data-minimum]")?.value || this.autoMinimum || "0.4";
      const B = (a, k, x) => this.buttonHTML(a, k, x);
      const header = `<header class="annotation-heading"><div><strong>${esc(tr("title"))}</strong><span>4.0.0-beta.2</span></div>${B("close", "close")}</header>`;
      if (!this.doc) { this.panel.innerHTML = header + `<p>${esc(tr("empty"))}</p>`; return; }
      const doc = this.doc, groups = A.groups(doc), s = A.scheme(doc);
      if (this.group && !groups.some((g) => g.key === this.group)) this.group = "";
      const clips = (this.group ? groups.find((g) => g.key === this.group)?.segments : [...doc.segments].sort((a, b) => a.start - b.start)) || [];
      this.page = Math.max(0, Math.min(this.page, Math.ceil(clips.length / 20) - 1));
      const visible = clips.slice(this.page * 20, this.page * 20 + 20);
      const checked = [...this.selected].map((id) => doc.segments.find((a) => a.id === id)).filter(Boolean);
      const active = checked.length === 1 ? checked[0] : null;
      const range = this.getView().selectedInterval;
      const fromNeural = (t) => Math.max(0, Math.min(doc.context.duration, this.video.mapping.neuralToVideo(t)));
      const start = active?.start ?? (range ? fromNeural(range.start) : fromNeural(this.getView().cursorTime || 0));
      const end = active?.end ?? (range ? fromNeural(range.end) : Math.min(doc.context.duration, start + 1));
      const field = (key, value, type = "text") => `<label>${esc(tr(key))}<input data-field="${key}" type="${type}" ${type === "number" ? 'min="0" step="0.001"' : 'maxlength="200"'} value="${esc(value)}"></label>`;
      this.panel.innerHTML = `${header}<div class="annotation-toolbar">
        <label>${esc(tr("scheme"))}<select data-scheme>${doc.schemes.map((v) => `<option value="${esc(v.id)}" ${v.id === s.id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>
        <input data-new-scheme aria-label="${esc(tr("schemeName"))}" placeholder="${esc(tr("schemeName"))}" maxlength="200">${B("scheme", "newScheme")}
        ${B("import", "import", `title="${esc(tr("importedWarning"))}"`)}${B("save", "save")}${B("csv", "csv")}
        ${B("undo", "undo", this.history.length ? "" : "disabled")}${B("redo", "redo", this.future.length ? "" : "disabled")}
        <input type="file" data-import accept=".json,application/json" hidden></div>
        <p class="annotation-note" data-sync-note>${esc(tr(this.video.mapping.verificationStatus === "verified" ? "verified" : "unverified"))}</p>
        <div class="annotation-content"><section class="annotation-clips"><div class="annotation-group-tools">
        <label>${esc(tr("group"))}<select data-group><option value="">${esc(tr("all"))} · ${doc.segments.length}</option>${groups.map((g) => `<option value="${esc(g.key)}" ${g.key === this.group ? "selected" : ""}>${esc(g.name || this.shortGroup(g.key))} · ${g.segments.length}</option>`).join("")}</select></label>
        <input data-group-name aria-label="${esc(tr("groupName"))}" placeholder="${esc(tr("groupName"))}" value="${esc(s.mappings[this.group] || "")}" maxlength="200">${B("name", "nameGroup")}</div>
        <div class="annotation-list" role="region" aria-label="${esc(tr("table"))}">${visible.length ? visible.map((a) => `<div class="annotation-row ${this.selected.has(a.id) ? "is-selected" : ""}">
          <input type="checkbox" data-check="${esc(a.id)}" aria-label="${esc(a.start.toFixed(3) + '–' + a.end.toFixed(3))}" ${this.selected.has(a.id) ? "checked" : ""}>
          <button type="button" data-select="${esc(a.id)}"><strong>${a.start.toFixed(3)}–${a.end.toFixed(3)} s</strong><span>${esc(A.label(doc, a) || this.shortGroup(A.groupKey(doc, a)))}</span></button>
          <span class="annotation-review ${A.reviewed(doc, a) ? "is-reviewed" : ""}">${esc(tr(A.reviewed(doc, a) ? "reviewed" : "suggested"))}</span></div>`).join("") : `<p>${esc(tr("noClips"))}</p>`}</div>
        <div class="annotation-pagination">${B("page-select", "selectPage")}${B("clear", "clear")}<span>${this.selected.size} ${esc(tr("selected"))} · ${clips.length ? this.page * 20 + 1 : 0}–${Math.min((this.page + 1) * 20, clips.length)} / ${clips.length}</span>${B("previous", "prev", this.page ? "" : "disabled")}${B("next", "next", (this.page + 1) * 20 < clips.length ? "" : "disabled")}</div></section>
        <section class="annotation-edit"><strong>${esc(tr("detail"))}</strong><div class="annotation-fields">${field("start", start.toFixed(3), "number")}${field("end", end.toFixed(3), "number")}${field("label", active ? A.label(doc, active) : "")}${field("subject", active?.subject || "animal-1")}${field("track", active?.track || "behavior")}</div>
        <div class="annotation-edit-actions">${B("start", "markStart")}${B("end", "markEnd")}${B("range", "useRange")}${B("add", "add")}${B("edit", "edit")}${B("split", "split")}${B("merge", "merge")}${B("loop", "loop", `aria-pressed="${Boolean(this.loop)}"`)}${B("label", "apply")}${B("confirm", "confirm")}${B("regroup", "regroup")}${B("remove", "remove")}</div>
        <details class="annotation-algorithm" ${autoOpen ? "open" : ""}><summary>${esc(tr("auto"))}</summary><p>${esc(tr("autoHelp"))}</p><div class="annotation-auto-controls"><label>${esc(tr("count"))}<input data-clusters type="number" min="2" max="32" value="${esc(this.autoCount)}"></label><label>${esc(tr("minimum"))}<input data-minimum type="number" min="0.2" max="10" step="0.2" value="${esc(this.autoMinimum)}"></label>${B("run", "run", this.abort ? "disabled" : "")}${B("cancel", "cancel", this.abort ? "" : "disabled")}</div></details>
        <p data-progress role="status">${esc(this.progressText || "")}</p></section></div>
        ${this.group ? `<section class="annotation-samples"><strong>${esc(tr("samples"))}</strong><div data-samples></div></section>` : ""}
        <footer class="annotation-footer" data-storage>${esc(tr(this.storageStatus))}</footer>`;
      if (this.group) this.renderSamples(clips);
      this.drawTimeline(true);
    }
    shortGroup(key) { return key === "manual" ? "Manual" : key.startsWith("curated:") ? `Group ${key.slice(-6)}` : `Group ${key.split("/").at(-1)} · ${key.split("/")[0].slice(-5)}`; }
    renderSamples(clips) {
      const target = this.panel.querySelector("[data-samples]"); if (!target) return;
      const url = this.video.elements.video.currentSrc || this.video.elements.video.src;
      for (const [index, clip] of A.samples(clips).entries()) {
        const div = document.createElement("div"); div.className = "annotation-sample";
        const b = document.createElement("button"); b.type = "button"; b.dataset.select = clip.id;
        b.textContent = `${index + 1} · ${clip.start.toFixed(2)}–${clip.end.toFixed(2)} s`; b.title = tr("preview");
        if (url && this.video.source.kind !== "synthetic") {
          const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.controls = true; v.preload = "auto";
          v.setAttribute("aria-label", `${tr("samples")} ${index + 1}`); v.src = url;
          v.addEventListener("loadedmetadata", () => { v.currentTime = clip.start; });
          v.addEventListener("timeupdate", () => { if (v.currentTime >= clip.end || v.currentTime < clip.start - .005) v.currentTime = clip.start; });
          v.addEventListener("ended", () => { v.currentTime = clip.start; v.play().catch(() => {}); });
          div.append(v);
        }
        div.append(b); target.append(div);
      }
    }
    drawTimeline(force = false) {
      if (!this.doc) { this.strip.innerHTML = ""; return; }
      const view = this.getView(), range = view.visibleRange, duration = Math.max(.001, range.end - range.start);
      const mapping = this.video.mapping;
      const signature = JSON.stringify([range, this.doc.updatedAt, this.doc.activeSchemeId, [...this.selected]]);
      const x = (videoTime) => (mapping.videoToNeural(videoTime) - range.start) / duration * 1000;
      if (force || signature !== this.timelineSignature || mapping !== this.timelineMapping) {
        this.timelineSignature = signature;
        this.timelineMapping = mapping;
        const visible = this.doc.segments.filter((s) => x(s.end) >= 0 && x(s.start) <= 1000);
        const tracks = [...new Set(visible.map((s) => `${s.subject} / ${s.track}`))].slice(0, 5);
        const height = Math.max(32, tracks.length * 30);
        this.strip.innerHTML = `<div class="annotation-track-label">${esc(tr("title"))}<small>${esc(tr("seconds"))}</small></div><div class="annotation-track-plot"><svg style="height:${height}px" viewBox="0 0 1000 ${height}" preserveAspectRatio="none" role="group" aria-label="${esc(tr("table"))}">${visible.slice(0, 1000).map((s) => {
          const row = tracks.indexOf(`${s.subject} / ${s.track}`); if (row < 0) return "";
          const left = Math.max(0, x(s.start)), right = Math.min(1000, x(s.end)), selected = this.selected.has(s.id);
          const name = A.label(this.doc, s) || this.shortGroup(A.groupKey(this.doc, s));
          return `<g data-clip="${esc(s.id)}" tabindex="0" role="button" aria-label="${esc(`${name}: ${s.start.toFixed(3)}–${s.end.toFixed(3)}`)}" class="${selected ? "is-selected" : ""} ${A.reviewed(this.doc, s) ? "is-reviewed" : ""}"><title>${esc(`${s.subject} / ${s.track} · ${name} · ${tr(A.reviewed(this.doc, s) ? "reviewed" : "suggested")}`)}</title><rect x="${left}" y="${row * 30 + 3}" width="${Math.max(1, right - left)}" height="23" rx="2"/>${right - left > 55 ? `<text x="${left + 4}" y="${row * 30 + 19}">${esc(name.slice(0, Math.floor((right - left) / 7)))}</text>` : ""}${selected ? `<rect data-edge="start" data-id="${esc(s.id)}" class="annotation-edge" x="${left}" y="${row * 30 + 3}" width="7" height="23"/><rect data-edge="end" data-id="${esc(s.id)}" class="annotation-edge" x="${Math.max(left, right - 7)}" y="${row * 30 + 3}" width="7" height="23"/>` : ""}</g>`;
        }).join("")}<line data-playhead y1="0" y2="${height}"/></svg></div>`;
        this.strip.title = visible.length > 1000 ? tr("limited") : tr(mapping.verificationStatus === "verified" ? "verified" : "unverified");
      }
      const playhead = this.strip.querySelector("[data-playhead]");
      if (playhead) { const pos = (view.cursorTime - range.start) / duration * 1000; playhead.setAttribute("x1", pos); playhead.setAttribute("x2", pos); }
    }
    select(id) {
      const s = this.doc?.segments.find((v) => v.id === id); if (!s) return;
      this.selected = new Set([id]); this.opened = true; this.loop = null;
      const mapping = this.video.mapping;
      const start = mapping.videoToNeural(s.start), end = mapping.videoToNeural(s.end);
      this.video.pause();
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        this.setView({ selectedInterval: null });
        this.video.seekVideo(s.start);
        this.toast(this.video.t("video.outsideClock"));
        this.render();
        return;
      }
      const padding = Math.max(.5, (end - start) * .2);
      // The video can extend beyond the neural recording. Keep its real interval
      // and cursor while focusing a valid range inside the available neural data.
      const total = Math.max(.001, Number(this.getRecording().duration || end + padding));
      const minimumSpan = Math.min(.5, total);
      const viewEnd = Math.max(minimumSpan, Math.min(total, end + padding));
      const viewStart = Math.max(0, Math.min(start - padding, viewEnd - minimumSpan));
      this.setView({ selectedInterval: { start, end }, cursorTime: start,
        visibleRange: { start: viewStart, end: viewEnd }
      }, { seekVideo: true });
      this.render();
    }
    one() { if (this.selected.size !== 1) throw new Error(tr("selectOne")); return [...this.selected][0]; }
    ids() { if (!this.selected.size) throw new Error(tr("chooseClips")); return [...this.selected]; }
    input(key) { return this.panel.querySelector(`[data-field="${key}"]`); }
    values() { return { start: Number(this.input("start").value), end: Number(this.input("end").value), label: this.input("label").value.trim(), subject: this.input("subject").value.trim(), track: this.input("track").value.trim() }; }
    async onChange(e) {
      try {
        if (e.target.hasAttribute("data-scheme")) { this.commit(A.change(this.doc, (d) => { d.activeSchemeId = e.target.value; })); this.selected.clear(); this.group = ""; this.render(); }
        if (e.target.hasAttribute("data-group")) { this.group = e.target.value; this.page = 0; this.render(); }
        if (e.target.dataset.check) { const id = e.target.dataset.check; if (e.target.checked) this.selected.add(id); else this.selected.delete(id); this.render(); }
        if (e.target.hasAttribute("data-import") && e.target.files[0]) {
          const file = e.target.files[0], key = this.key; if (file.size > 50000000) throw new Error("Project file exceeds 50 MB");
          const input = JSON.parse(await file.text()); if (key !== this.key) return;
          this.commit(input.schema === A.SCHEMA ? A.validate(input, this.doc.context) : A.importCandidates(this.doc, input));
          this.toast(tr(input.schema === A.SCHEMA ? "loaded" : "imported"));
        }
      } catch (error) { this.toast(`${tr("error")}: ${error.message}`); }
    }
    async action(e) {
      const selected = e.target.closest("[data-select]"); if (selected) { this.select(selected.dataset.select); return; }
      const action = e.target.closest("[data-action]")?.dataset.action; if (!action) return;
      try {
        if (action === "close") { this.opened = false; this.render(); this.button.focus(); return; }
        if (!this.doc) return;
        if (action === "save") this.downloadProject();
        if (action === "csv") this.download(A.toCSV(this.doc, this.video.mapping), "annotations.csv", "text/csv");
        if (action === "import") this.panel.querySelector("[data-import]").click();
        if (action === "undo" && this.history.length) { this.future.push(this.doc); this.doc = this.history.pop(); this.loop = null; this.selected.clear(); this.persist(); this.render(); }
        if (action === "redo" && this.future.length) { this.history.push(this.doc); this.doc = this.future.pop(); this.loop = null; this.selected.clear(); this.persist(); this.render(); }
        if (action === "scheme") this.commit(A.addScheme(this.doc, this.panel.querySelector("[data-new-scheme]").value));
        if (["start", "end"].includes(action)) this.input(action).value = this.video.currentVideoTime.toFixed(3);
        if (action === "range") { const r = this.getView().selectedInterval; if (!r) throw new Error(tr("useRange")); const start = this.video.mapping.neuralToVideo(r.start), end = this.video.mapping.neuralToVideo(r.end); if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error(this.video.t("video.outsideClock")); this.input("start").value = Math.max(0, start).toFixed(3); this.input("end").value = Math.min(this.doc.context.duration, end).toFixed(3); }
        if (action === "add") this.commit(A.add(this.doc, this.values()));
        if (action === "edit") this.commit(A.edit(this.doc, this.one(), this.values()));
        if (action === "split") this.commit(A.split(this.doc, this.one(), this.video.currentVideoTime));
        if (action === "merge") this.commit(A.merge(this.doc, this.ids()));
        if (action === "label") this.commit(A.assign(this.doc, this.ids(), this.input("label").value));
        if (action === "confirm") this.commit(A.assign(this.doc, this.ids(), null, true));
        if (action === "name") { if (!this.group) throw new Error(tr("chooseGroup")); this.commit(A.nameGroup(this.doc, this.group, this.panel.querySelector("[data-group-name]").value)); }
        if (action === "regroup") { this.commit(A.regroup(this.doc, this.ids())); this.group = A.groupKey(this.doc, this.doc.segments.find((v) => this.selected.has(v.id))); this.page = 0; this.render(); }
        if (action === "remove") { this.commit(A.remove(this.doc, this.ids())); this.loop = null; }
        if (action === "clear") { this.selected.clear(); this.render(); }
        if (action === "previous" || action === "next") { this.page += action === "next" ? 1 : -1; this.render(); }
        if (action === "page-select") { this.panel.querySelectorAll("[data-check]").forEach((v) => this.selected.add(v.dataset.check)); this.render(); }
        if (action === "loop") { const s = this.doc.segments.find((v) => v.id === this.one()); this.loop = this.loop ? null : { start: s.start, end: s.end }; if (this.loop) { this.video.seekVideo(s.start); this.video.play(); } this.render(); }
        if (action === "run") await this.analyze();
        if (action === "cancel") this.abort?.abort();
      } catch (error) { this.toast(`${tr("error")}: ${error.message}`); }
    }
    downloadProject() { if (this.doc) this.download(JSON.stringify({ ...this.doc, exportMapping: this.video.mapping.toJSON() }, null, 2), "annotations.project.json", "application/json"); }
    download(content, filename, type) {
      const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    dragStart(e) {
      const edge = e.target.closest("[data-edge]"); if (!edge) return;
      e.preventDefault(); e.stopPropagation(); this.dragged = false;
      const s = this.doc.segments.find((v) => v.id === edge.dataset.id);
      this.drag = { id: s.id, edge: edge.dataset.edge, value: s[edge.dataset.edge] }; this.strip.setPointerCapture(e.pointerId);
    }
    dragMove(e) {
      if (!this.drag) return; this.dragged = true;
      const rect = this.strip.querySelector("svg").getBoundingClientRect(), r = this.getView().visibleRange;
      const neural = r.start + Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (r.end - r.start);
      const s = this.doc.segments.find((v) => v.id === this.drag.id);
      const time = this.video.mapping.neuralToVideo(neural);
      this.drag.value = this.drag.edge === "start" ? Math.max(0, Math.min(s.end - .001, time)) : Math.min(this.doc.context.duration, Math.max(s.start + .001, time));
      const input = this.input(this.drag.edge); if (input) input.value = this.drag.value.toFixed(3);
    }
    dragEnd(e) {
      if (!this.drag) return;
      const d = this.drag; this.drag = null;
      if (this.strip.hasPointerCapture(e.pointerId)) this.strip.releasePointerCapture(e.pointerId);
      try { this.commit(A.edit(this.doc, d.id, { [d.edge]: d.value })); } catch (error) { this.toast(error.message); }
    }
    async analyze() {
      if (this.abort) return;
      if (this.video.source?.kind === "synthetic") throw new Error(tr("autoVideo"));
      const count = Number(this.panel.querySelector("[data-clusters]").value), minimumDuration = Number(this.panel.querySelector("[data-minimum]").value);
      if (!Number.isInteger(count) || count < 2 || count > 32 || !Number.isFinite(minimumDuration) || minimumDuration < .2 || minimumDuration > 10) throw new Error("Choose 2–32 groups and a 0.2–10 s merge threshold");
      const key = this.key, context = A.clone(this.doc.context), source = this.video.elements.video.currentSrc || this.video.elements.video.src;
      const abort = new AbortController(); this.abort = abort; this.progressText = tr("progress"); this.render();
      const v = document.createElement("video"); v.muted = true; v.preload = "auto"; v.src = source;
      const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 48;
      const ctx = canvas.getContext("2d", { willReadFrequently: true }); let worker, workerUrl;
      const ensure = () => { if (abort.signal.aborted || key !== this.key) throw new DOMException("Cancelled", "AbortError"); };
      const wait = (event, operation) => new Promise((resolve, reject) => {
        const finish = (error) => { clearTimeout(timer); v.removeEventListener(event, ok); v.removeEventListener("error", fail); abort.signal.removeEventListener("abort", stop); error ? reject(error) : resolve(); };
        const ok = () => finish(), fail = () => finish(new Error("Video could not be decoded")), stop = () => finish(new DOMException("Cancelled", "AbortError"));
        const timer = setTimeout(() => finish(new Error("Video decoding timed out")), 15000);
        v.addEventListener(event, ok, { once: true }); v.addEventListener("error", fail, { once: true }); abort.signal.addEventListener("abort", stop, { once: true }); operation?.();
      });
      const status = (text) => { this.progressText = text; const el = this.panel.querySelector("[data-progress]"); if (el) el.textContent = text; };
      try {
        if (v.readyState < 2) await wait("loadeddata", () => v.load()); ensure();
        // Uniform 5 Hz samples, lowered for long videos to cap work at 60,000 frames.
        const step = Math.max(.2, context.duration / 59999), times = [], features = []; let previous;
        for (let time = 0; time < context.duration - .001; time += step) {
          ensure(); if (Math.abs(v.currentTime - time) > .00001) await wait("seeked", () => { v.currentTime = time; });
          if (Math.abs(v.currentTime - time) > .03) throw new Error("Video source cannot seek reliably. Attach a local video file for grouping.");
          ctx.drawImage(v, 0, 0, 64, 48); const rgba = ctx.getImageData(0, 0, 64, 48).data;
          const gray = new Uint8Array(64 * 48); for (let i = 0; i < gray.length; i++) gray[i] = .299 * rgba[i * 4] + .587 * rgba[i * 4 + 1] + .114 * rgba[i * 4 + 2];
          features.push(D.frameFeatures(previous || gray, gray, 64, 48)); times.push(time); previous = gray;
          if (times.length % 10 === 0) status(`${tr("progress")} · ${Math.floor(time / context.duration * 90)}% · ${times.length}`);
        }
        ensure(); status(tr("clustering"));
        workerUrl = URL.createObjectURL(new Blob([D.workerSource()], { type: "text/javascript" })); worker = new Worker(workerUrl);
        const result = await new Promise((resolve, reject) => {
          const stop = () => { worker.terminate(); reject(new DOMException("Cancelled", "AbortError")); };
          abort.signal.addEventListener("abort", stop, { once: true });
          worker.onmessage = (event) => { abort.signal.removeEventListener("abort", stop); event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result); };
          worker.onerror = (e) => { abort.signal.removeEventListener("abort", stop); reject(new Error(e.message)); };
          worker.postMessage({ features, times, duration: context.duration, count, minimumDuration });
        });
        ensure();
        const runId = crypto.randomUUID?.() || `motion-${Date.now()}`;
        const candidates = { schema: A.CANDIDATE_SCHEMA, timebase: "video_seconds", video: { name: context.videoName, size: context.videoSize, duration: context.duration },
          run: { id: runId, method: D.VERSION, version: "4.0.0-beta.2", parameters: { count, minimumDuration, sampleStepSeconds: step, seed: 42 },
            license: "MIT", createdAt: new Date().toISOString(), limitations: "Position-sensitive image-motion baseline; not validated behavior recognition; sample-grid boundaries." }, segments: result.segments };
        this.commit(A.importCandidates(this.doc, candidates));
        status(`${result.groups} groups · ${result.segments.length} clips · ${result.sampleCount} samples · ${tr("suggested")}`);
        this.toast(tr("imported"));
      } catch (error) {
        if (key === this.key) status(error.name === "AbortError" ? tr("cancelled") : error.message);
      } finally {
        worker?.terminate(); if (workerUrl) URL.revokeObjectURL(workerUrl); v.pause(); v.removeAttribute("src"); v.load();
        if (this.abort === abort) this.abort = null; this.render();
      }
    }
  }
  window.NeuropixelsAnnotationUI = { AnnotationController, COPY };
})();
