// SPDX-License-Identifier: MIT
(() => {
  "use strict";
  const A = window.NeuropixelsAnnotations;
  const D = window.NeuropixelsBehaviorDiscovery;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COPY = {
    open: ["Annotate", "标注行为", "Anotar"],
    done: ["Done annotating · Esc", "结束标注 · Esc", "Terminar anotación · Esc"],
    dragHint: ["Drag on the video strip to select a behavior, or mark its start and end while watching.", "在视频时间条上拖出一段行为，或播放时标记起点和终点。", "Arrastra en la barra del vídeo o marca inicio y fin mientras lo ves."],
    compactStart: ["Mark start", "标记起点", "Marcar inicio"], compactEnd: ["Mark end", "标记终点", "Marcar fin"],
    more: ["Clips & grouping…", "片段与分组…", "Clips y grupos…"],
    labelHint: ["Name this behavior…", "给这段行为命名…", "Nombra esta conducta…"],
    saveClip: ["Save label", "保存标注", "Guardar etiqueta"],
    newClip: ["New interval", "标注下一段", "Nuevo intervalo"],
    around: ["Around playhead · 10 s", "光标附近 · 10 秒", "Cerca del cursor · 10 s"],
    whole: ["Whole video", "整个视频", "Vídeo completo"],
    clipCount: ["clips", "段标注", "clips"],
    title: ["Behavior annotation", "行为标注", "Anotación de conducta"],
    close: ["Close annotation editor", "关闭标注编辑器", "Cerrar editor"],
    empty: ["Attach a video to annotate intervals on the shared neural timeline.", "请先关联视频，再在共享神经时间轴上标注区间。", "Adjunta un vídeo para anotar intervalos en el eje neural compartido."],
    scheme: ["Label scheme", "标签方案", "Esquema de etiquetas"],
    schemeName: ["New scheme name", "新方案名称", "Nombre del esquema"],
    newScheme: ["New scheme", "新建方案", "Nuevo esquema"],
    import: ["Import annotations / candidates", "导入标注 / 候选", "Importar anotaciones / candidatos"],
    save: ["Export annotations", "导出标注", "Exportar anotaciones"],
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
    saved: ["Draft saved · Save the project to update its file", "草稿已保存 · 点击保存项目写入项目文件", "Borrador guardado · Guarda el proyecto para actualizar su archivo"],
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
    clipTools: ["Clip tools", "片段工具", "Herramientas de clip"],
    closeLibrary: ["Done", "完成", "Listo"],
    manageLabels: ["Manage labels", "管理标签", "Gestionar etiquetas"],
    labelLibrary: ["Label library", "标签库", "Biblioteca de etiquetas"],
    labelHelp: ["Create reusable labels here. Apply them to a selected interval in the timeline.", "在这里创建可复用标签；在时间轴选中片段后再应用。", "Crea etiquetas reutilizables; aplícalas a un intervalo en la línea temporal."],
    createLabel: ["Create label", "创建标签", "Crear etiqueta"],
    chooseLabel: ["Choose a label…", "选择标签…", "Elige una etiqueta…"],
    precision: ["Fine adjustment · time / frames", "精细调整 · 时间 / 帧", "Ajuste fino · tiempo / fotogramas"],
    expandTimeline: ["Expand timeline", "展开时间轴", "Ampliar línea temporal"],
    collapseTimeline: ["Compact timeline", "收起时间轴", "Compactar línea temporal"],
    timelineHelp: ["Drag to select · hover to preview · wheel to zoom · Shift + wheel to pan", "拖动选区 · 悬浮预览 · 滚轮缩放 · Shift + 滚轮平移", "Arrastra para seleccionar · pasa para previsualizar · rueda para ampliar · Mayús + rueda para desplazar"],
    selection: ["Selected interval", "当前片段", "Intervalo seleccionado"],
    reviewClip: ["Play interval", "播放片段", "Reproducir intervalo"],
    frameStart: ["Start frame", "起始帧", "Fotograma inicial"],
    frameEnd: ["End frame (exclusive)", "结束帧（不含）", "Fotograma final (exclusivo)"],
    frameHelp: ["0-based frame numbers use nominal FPS; for variable-frame-rate video use seconds.", "帧号从 0 开始，按标称帧率换算；变帧率视频请使用秒数。", "Fotogramas desde 0, según FPS nominales; usa segundos para frecuencia variable."],
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
    constructor({ panel, strip, button, video, getRecording, getView, setView, toast, onAnnotations = () => {}, onOpenChange = () => {} }) {
      Object.assign(this, { panel, strip, button, video, getRecording, getView, setView, toast, onAnnotations, onOpenChange });
      this.store = new DraftStore(); this.doc = null; this.key = null; this.history = []; this.future = [];
      this.selected = new Set(); this.group = ""; this.page = 0; this.opened = false; this.loop = null;
      this.saveQueue = Promise.resolve(); this.storageStatus = "saved";
      this.home = panel.parentElement;
      this.installPreview();
      this.labelDialog = document.createElement("dialog");
      this.labelDialog.className = "annotation-label-dialog annotation-panel";
      this.labelDialog.setAttribute("aria-label", tr("labelLibrary"));
      document.body.append(this.labelDialog);
      this.labelDialog.addEventListener("close", () => {
        if(!this.libraryForm) return;
        for(const key of ["start","end"]) {
          const input=this.input(key); if(input) { input.value=String(this.libraryForm[key]);input.dataset.edited="true"; }
          const frame=this.panel.querySelector(`[data-frame="${key}"]`);if(frame)frame.value=Math.round(this.libraryForm[key]*this.fps());
        }
        const label=this.input("label");if(label)label.value=this.pendingLabel||this.libraryForm.label;
        this.libraryForm=null;
      });
      this.labelDialog.addEventListener("click", event => {
        if (event.target.closest("[data-label-close]")) this.labelDialog.close();
        if (event.target.closest("[data-label-add]")) this.createLabel();
      });
      this.labelDialog.addEventListener("keydown", event => {
        if (event.key === "Enter" && event.target.matches("[data-label-name]")) { event.preventDefault(); this.createLabel(); }
      });
      this.labelDialog.addEventListener("change", event => {
        if (!event.target.matches("[data-label-color]")) return;
        try { this.commit(A.change(this.doc, d => { d.labelColors[event.target.dataset.labelColor] = event.target.value; })); }
        catch (error) { this.toast(error.message); }
        this.renderLabelLibrary();
      });
      this.reviewDialog = document.createElement("dialog"); this.reviewDialog.className = "annotation-review-dialog";
      document.body.append(this.reviewDialog);
      this.reviewDialog.addEventListener("cancel", e => { e.preventDefault(); this.reviewMode = false; this.render(); });
      this.stripObserver=new ResizeObserver(()=>this.drawTimeline(true));this.stripObserver.observe(strip);
      button.addEventListener("click", () => { this.opened = !this.opened; this.render(); });
      document.addEventListener("keydown", e => {
        if (!e.defaultPrevented && e.key === "Escape" && this.opened && !this.reviewMode && !document.querySelector("dialog[open]")) { e.preventDefault(); this.opened = false; this.render(); button.focus(); }
        if (e.defaultPrevented || !this.opened || this.reviewMode || this.labelDialog.open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        if (e.code === "Space") { e.preventDefault(); this.video.togglePlayback(); }
        if (e.key.toLowerCase() === "i") this.panel.querySelector('[data-action="quick-start"]')?.click();
        if (e.key.toLowerCase() === "o") this.panel.querySelector('[data-action="quick-end"]:not(:disabled)')?.click();
      });
      panel.addEventListener("click", (e) => this.action(e));
      panel.addEventListener("change", (e) => this.onChange(e));
      panel.addEventListener("input", e => {
        if(e.target.dataset.field) e.target.dataset.edited="true";
        if ((e.target.dataset.frame || ["start","end"].includes(e.target.dataset.field)) && e.target.value!=="" && e.target.validity.valid) this.onChange(e);
      });
      strip.addEventListener("click", (e) => { const node = e.target.closest("[data-clip]"); if (node && !this.dragged) this.select(node.dataset.clip); this.dragged = false; });
      strip.addEventListener("keydown", (e) => { if (["Enter", " "].includes(e.key) && e.target.dataset.clip) { e.preventDefault(); this.select(e.target.dataset.clip); } });
      strip.addEventListener("pointerdown", (e) => this.dragStart(e));
      strip.addEventListener("pointermove", (e) => { this.dragMove(e); this.previewAt(e); });
      strip.addEventListener("pointerleave", () => { if (!this.brush && !this.drag) this.preview.hidden = true; });
      strip.addEventListener("wheel", e => this.zoomTimeline(e), { passive: false });
      strip.addEventListener("pointerup", (e) => this.dragEnd(e));
      strip.addEventListener("pointercancel", () => { this.drag = null; this.brush = null; this.draft = null; this.preview.hidden = true; this.render(); });
      panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { e.preventDefault(); if (this.reviewMode) this.reviewMode = false; else this.opened = false; this.render(); button.focus(); }
        if (e.key === "Enter" && e.target.dataset.field === "label") { e.preventDefault(); this.panel.querySelector('[data-action="quick-save"]')?.click(); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); this.onSaveProject ? this.onSaveProject() : this.downloadProject(); }
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
        this.key = context?.key || null; this.doc = null; this.history = []; this.future = []; this.selected.clear(); this.group = ""; this.page = 0; this.loop = null; this.draft = null; this.reviewMode = false; this.window = null; this.activeTrack = null; this.pendingLabel = ""; this.manualWindow=false;this.frameRate=null;this.previewEnd=null;this.preview.hidden=true;this.previewTime=null;this.previewUrl=null;this.previewVideo.removeAttribute("src");this.previewVideo.load();this.libraryForm=null;this.labelDialog.close();
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
        const at = this.video.currentVideoTime;
        if (this.video.playing && this.opened && this.window && !this.selected.size && !this.manualWindow && (at < this.window.start || at > this.window.end)) {
          this.window = { start: Math.max(0, Math.min(this.draft?.start ?? at, at) - 5), end: Math.min(duration, at + 5) };
        }
        this.drawTimeline();
        const sync = this.panel.querySelector("[data-sync-note]"); if (sync) sync.textContent = tr(this.video.mapping.verificationStatus === "verified" ? "verified" : "unverified");
      }
      this.checkPreviewEnd();
      if (this.loop && (this.video.elements.video.ended || (this.video.playing && this.video.currentVideoTime >= this.loop.end))) {
        const ended = this.video.elements.video.ended;
        this.video.seekVideo(this.loop.start); if (ended) this.video.play();
      }
    }
    persist() {
      if (!this.doc) return;
      const doc = A.clone(this.doc), key = this.key, store = this.store;
      this.storageStatus = "saving";
      this.saveQueue = this.saveQueue.catch(() => {}).then(() => store.request(key, doc)).then(() => {
        if (this.key === key) this.storageStatus = "saved"; this.renderStorage();
      }, () => { if (this.key === key) this.storageStatus = "storageError"; this.renderStorage(); });
    }
    async flush() {
      this.persist();
      await this.saveQueue;
      if (this.storageStatus === "storageError") throw new Error(tr("storageError"));
    }
    async useStore(store) {
      await this.flush();
      this.doc = null; this.key = null;
      this.store = store;
      await this.update();
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
      const focus = Boolean(this.opened && this.doc);
      document.getElementById("experiment-video-region")?.classList.toggle("annotation-focus", focus);
      this.onOpenChange(focus);
      const entered = focus && !this.wasFocused; this.wasFocused = focus;
      if (entered && !this.window && !this.selected.size) {
        const at = this.video.currentVideoTime;
        this.window = {start: Math.max(0, at - 5), end: Math.min(this.doc.context.duration, at + 5)};
      }
      if (entered && !this.video.rateChosen) this.video.setPlaybackRate(.25, { user: false });
      if (this.reviewMode && this.opened) {
        this.reviewDialog.append(this.panel); this.panel.classList.remove("is-compact");
        if (!this.reviewDialog.open) this.reviewDialog.showModal();
        this.renderFull(); return;
      }
      if(this.reviewDialog.open) this.panel.querySelectorAll("video").forEach(v=>{v.pause();v.removeAttribute("src");v.load();});
      this.reviewDialog.close(); this.home.append(this.panel); this.panel.classList.add("is-compact");
      this.button.textContent = this.opened ? tr("done") : tr("open"); this.button.setAttribute("aria-expanded", String(this.opened));
      this.panel.hidden = !this.opened;
      this.strip.hidden = !this.doc || (!this.opened && !this.doc.segments.length);
      if (!this.opened || !this.doc) { this.panel.innerHTML = this.doc ? "" : `<p>${esc(tr("empty"))}</p>`; this.drawTimeline(true); return; }
      const B = (a,k,x) => this.buttonHTML(a,k,x);
      const active = this.selected.size === 1 ? this.doc.segments.find(s => this.selected.has(s.id)) : null;
      const clip = active || this.draft, complete = clip?.end != null;
      const activeTrack = this.activeTrack ? JSON.parse(this.activeTrack) : ["animal-1", "behavior"];
      const labels = Object.keys(this.doc.labelColors || {});
      const currentLabel = active ? A.label(this.doc, active) : this.pendingLabel || "";
      const field = (key,value) => `<label>${esc(tr(key))}<input data-field="${key}" type="number" min="0" step="0.001" value="${value}"></label>`;
      this.panel.innerHTML = `<div class="annotation-workbar">
        <strong>${complete ? `${esc(tr("selection"))} · ${clip.start.toFixed(3)}–${clip.end.toFixed(3)} s` : esc(tr("dragHint"))}</strong>
        <div class="annotation-context-actions">${B("labels","manageLabels")}${B("undo","undo",this.history.length?"":"disabled")}${B("redo","redo",this.future.length?"":"disabled")}${B("save","save")}${B("review","more")}</div></div>
        ${complete ? `<div class="annotation-apply-row"><label>${esc(tr("label"))}<select data-field="label"><option value="">${esc(tr("chooseLabel"))}</option>${labels.map(l=>`<option value="${esc(l)}" ${l===currentLabel?"selected":""}>${esc(l)}</option>`).join("")}</select></label>
          ${B("quick-save","saveClip",'class="annotation-primary"')}${B("preview-clip","reviewClip")}${B("cursor-start","markStart")}${B("cursor-end","markEnd")}<details class="annotation-clip-tools"><summary>${esc(tr("clipTools"))}</summary><div>${B("quick-new",active?"newClip":"clear")}${active?B("split","split")+B("remove","remove"):""}</div></details></div>
          <input data-field="subject" type="hidden" value="${esc(clip.subject||activeTrack[0])}"><input data-field="track" type="hidden" value="${esc(clip.track||activeTrack[1])}">
          <details class="annotation-precision"><summary>${esc(tr("precision"))}</summary><div class="annotation-precision-fields">${field("start",clip.start.toFixed(6))}${field("end",clip.end.toFixed(6))}
          <label>${esc(tr("frameStart"))}<input data-frame="start" type="number" min="0" step="1" value="${Math.round(clip.start*this.fps())}"></label>
          <label>${esc(tr("frameEnd"))}<input data-frame="end" type="number" min="1" step="1" value="${Math.round(clip.end*this.fps())}"></label>
          <label>Nominal FPS<input data-frame-rate type="number" min="1" max="1000" step="any" value="${this.fps()}"></label></div><small>${esc(tr("frameHelp"))}</small></details>` :
          `<div class="annotation-quick-actions">${B("quick-start","compactStart")}${B("quick-end","compactEnd",this.draft?.start==null?"disabled":"")}${B("range","useRange",this.getView().selectedInterval?"":"disabled")}<span>${this.draft ? `${this.draft.start.toFixed(3)} s → …` : `${this.doc.segments.length} ${esc(tr("clipCount"))}`}</span></div>`}
          <div class="annotation-statusline"><small>Space · play / pause &nbsp; I / O · mark interval</small><small data-storage>${esc(tr(this.storageStatus))}</small><small data-sync-note>${esc(tr(this.video.mapping.verificationStatus === "verified" ? "verified" : "unverified"))}</small></div>`;
      this.drawTimeline(true);
    }
    renderFull() {
      this.button.textContent = tr("open"); this.button.setAttribute("aria-expanded", String(this.opened));
      this.panel.hidden = !this.opened; this.strip.hidden = !this.doc;
      this.panel.querySelectorAll("video").forEach((v) => { v.pause(); v.removeAttribute("src"); v.load(); });
      if (!this.opened) { this.panel.innerHTML = ""; this.drawTimeline(); return; }
      const autoOpen = this.panel.querySelector(".annotation-algorithm")?.open || Boolean(this.abort);
      this.autoCount = this.panel.querySelector("[data-clusters]")?.value || this.autoCount || "8";
      this.autoMinimum = this.panel.querySelector("[data-minimum]")?.value || this.autoMinimum || "0.4";
      const B = (a, k, x) => this.buttonHTML(a, k, x);
      const header = `<header class="annotation-heading"><div><strong>${esc(tr("title"))}</strong><span>4.8.0-beta.1</span></div>${B("close", "close")}</header>`;
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
    fps() { return Number(this.frameRate || this.video.source?.fps || 30); }
    renderLabelLibrary() {
      const labels = Object.keys(this.doc?.labelColors || {});
      this.labelDialog.innerHTML = `<div class="annotation-heading"><strong>${esc(tr("labelLibrary"))}</strong><button data-label-close type="button">${esc(tr("closeLibrary"))} ×</button></div>
        <p>${esc(tr("labelHelp"))}</p><div class="annotation-label-list">${labels.map(label => `<label><i style="background:${A.color(this.doc,label)}"></i><span>${esc(label)}</span><input type="color" data-label-color="${esc(label)}" aria-label="Color: ${esc(label)}" value="${A.color(this.doc,label).startsWith("#")?A.color(this.doc,label):"#86929f"}"></label>`).join("")}</div>
        <div class="annotation-label-create"><input data-label-name aria-label="${esc(tr("label"))}" placeholder="${esc(tr("labelHint"))}" maxlength="200"><button data-label-add type="button">${esc(tr("createLabel"))}</button></div>`;
    }
    createLabel() {
      try {
        const input = this.labelDialog.querySelector("[data-label-name]");
        const next = A.addLabel(this.doc, input.value);
        this.pendingLabel = input.value.trim(); this.commit(next); this.renderLabelLibrary();
        this.labelDialog.querySelector("[data-label-name]").focus();
      } catch (error) { this.toast(error.message); }
    }
    installPreview() {
      this.preview = document.createElement("div"); this.preview.className = "annotation-hover-preview"; this.preview.hidden = true;
      this.preview.innerHTML = '<video muted playsinline preload="auto"></video><canvas hidden></canvas><div data-preview-caption></div>';
      document.body.append(this.preview);
      this.previewVideo = this.preview.querySelector("video"); this.previewVideo.muted = true;
      this.previewCanvas = this.preview.querySelector("canvas");
      this.previewCaption = this.preview.querySelector("[data-preview-caption]");
      this.previewVideo.addEventListener("loadeddata", () => this.seekPreview());
      this.previewVideo.addEventListener("seeked", () => {
        this.previewCaption.textContent = `${this.previewVideo.currentTime.toFixed(3)} s · Frame ≈ ${Math.round(this.previewVideo.currentTime*this.fps())}`;
        this.previewVideo.style.visibility = "visible"; this.seekPreview();
      });
      this.previewVideo.addEventListener("error", () => { this.previewCaption.textContent = "Preview unavailable for this video"; });
      this.overlay = document.createElement("div"); this.overlay.className = "annotation-video-labels";
      this.video.elements.video?.parentElement?.append(this.overlay);
      this.video.elements.video?.addEventListener("timeupdate", () => { this.checkPreviewEnd(); this.updateOverlay(); });
    }
    checkPreviewEnd() {
      if (this.previewEnd != null && this.video.playing && this.video.currentVideoTime >= this.previewEnd) {
        const end=this.previewEnd;this.previewEnd=null;this.video.pause();this.video.seekVideo(end);
      }
    }
    seekPreview() {
      const v = this.previewVideo;
      if (this.preview.hidden || v.readyState < 2 || v.seeking || !Number.isFinite(this.previewTime)) return;
      if (Math.abs(v.currentTime-this.previewTime) > .0001) { v.currentTime = this.previewTime; }
      else { v.style.visibility = "visible"; this.previewCaption.textContent = `${v.currentTime.toFixed(3)} s · Frame ≈ ${Math.round(v.currentTime*this.fps())}`; }
    }
    previewAt(e) {
      if (!this.opened || !this.doc || !e.target.closest("svg")&&!this.brush&&!this.drag) { if(!this.brush&&!this.drag)this.preview.hidden=true; return; }
      this.preview.hidden = false;
      this.preview.style.left = `${Math.max(8,Math.min(window.innerWidth-392,e.clientX-192))}px`;
      const rect = this.strip.getBoundingClientRect();
      this.preview.style.top = `${Math.max(8,rect.top-268)}px`;
      this.previewTime = Math.min(Math.max(0,this.doc.context.duration-1/this.fps()),Math.max(0,Math.round(this.pointerTime(e)*this.fps())/this.fps()));
      const synthetic = this.video.source?.kind === "synthetic";
      this.previewVideo.hidden = synthetic; this.previewCanvas.hidden = !synthetic;
      if (synthetic) { this.video._renderSyntheticFrame(this.previewCanvas,this.previewTime); this.previewCaption.textContent=`${this.previewTime.toFixed(3)} s · Frame ${Math.round(this.previewTime*this.fps())} · SYNTHETIC`; return; }
      const url = this.video.elements.video.currentSrc || this.video.elements.video.src;
      if (url !== this.previewUrl) {
        this.previewUrl = url; this.previewVideo.style.visibility="hidden"; this.previewCaption.textContent="Loading preview…"; this.previewVideo.src=url;
      }
      if (!this.previewRequest) this.previewRequest=requestAnimationFrame(()=>{this.previewRequest=null;this.seekPreview();});
    }
    updateOverlay() {
      const time=this.video.currentVideoTime;
      const stage=this.overlay.parentElement, media=this.video.source?.kind==='synthetic'?this.video.elements.canvas:this.video.elements.video;
      if(stage&&media) {
        const width=media.videoWidth||media.width, height=media.videoHeight||media.height;
        if(width&&height) {
          const scale=Math.min(stage.clientWidth/width,stage.clientHeight/height);
          this.overlay.style.left=`${Math.max(12,(stage.clientWidth-width*scale)/2+12)}px`;
          this.overlay.style.top=`${Math.max(12,(stage.clientHeight-height*scale)/2+12)}px`;
        }
      }
      const labels = [...new Set((this.doc?.segments || []).filter(s=>time>=s.start&&time<s.end&&(!this.activeTrack||JSON.stringify([s.subject,s.track])===this.activeTrack)).map(s=>A.label(this.doc,s)).filter(Boolean))];
      const signature=JSON.stringify([labels,labels.map(l=>A.color(this.doc,l))]);
      if(signature!==this.overlaySignature) { this.overlaySignature=signature;this.overlay.innerHTML=labels.map(l=>`<span style="--label-color:${A.color(this.doc,l)}">${esc(l)}</span>`).join(""); }
    }
    zoomTimeline(e) {
      if (!this.doc || !e.target.closest("svg")) return;
      e.preventDefault(); this.preview.hidden=true; this.manualWindow=true;
      const range=this.videoRange(), span=range.end-range.start;
      if(e.shiftKey) {
        const start=Math.max(0,Math.min(this.doc.context.duration-span,range.start+Math.sign(e.deltaY||e.deltaX)*span*.15));
        this.window={start,end:start+span};
      } else this.window=A.zoomRange(range,this.pointerTime(e),Math.exp(Math.sign(e.deltaY)*.22),this.doc.context.duration,this.fps());
      this.drawTimeline(true);
    }
    videoRange() {
      const total = this.doc?.context.duration || 1;
      if (this.window) return this.window;
      const range = this.getView().visibleRange;
      const start = this.video.mapping.neuralToVideo(range.start), end = this.video.mapping.neuralToVideo(range.end);
      return Number.isFinite(start) && Number.isFinite(end) && end > start
        ? { start: Math.max(0,start), end: Math.min(total,end) } : {start:0,end:total};
    }
    drawTimeline(force = false) {
      if (this.tracksDoc !== this.doc) {
        this.tracksDoc = this.doc;
        this.availableTracks = [...new Set((this.doc?.segments || []).map(s => JSON.stringify([s.subject,s.track])))];
      }
      const availableTracks = this.availableTracks || [];
      if (!availableTracks.includes(this.activeTrack)) this.activeTrack = availableTracks[0] || null;
      if (force || this.projectedDoc !== this.doc || this.projectedMapping !== this.video.mapping || this.projectedTrack !== this.activeTrack) {
        this.projectedDoc = this.doc; this.projectedMapping = this.video.mapping; this.projectedTrack = this.activeTrack;
        this.onAnnotations(A.project(this.doc, this.video.mapping, this.activeTrack));
      }
      this.updateOverlay();
      if (!this.opened) this.preview.hidden = true;
      if (!this.doc) { this.strip.innerHTML=""; return; }
      this.strip.title=tr(this.doc.segments.length>1000?"limited":this.video.mapping.verificationStatus==="verified"?"verified":"unverified");
      this.strip.hidden = !this.opened && !this.doc.segments.length;
      const range=this.videoRange(), span=Math.max(.001,range.end-range.start);
      const width=Math.max(1,this.strip.clientWidth-24);
      const signature=JSON.stringify([this.activeTrack,width,range,this.doc.updatedAt,this.doc.activeSchemeId,[...this.selected],this.opened,this.timelineExpanded,this.drag?.value]);
      const x=t=>(t-range.start)/span*width;
      if(force||this.timelineSignature!==signature) {
        this.timelineSignature=signature;
        const tracks=[...new Set(this.doc.segments.map(s=>JSON.stringify([s.subject,s.track])))];
        if(!tracks.includes(this.activeTrack))this.activeTrack=tracks[0];
        const clips=this.doc.segments.filter(s=>(!this.activeTrack||JSON.stringify([s.subject,s.track])===this.activeTrack)&&s.end>=range.start&&s.start<=range.end).slice(0,1000);
        const height=this.timelineExpanded?126:76;
        const tickCount=Math.max(2,Math.floor(width/100));
        this.strip.classList.toggle("is-expanded",Boolean(this.timelineExpanded));
        this.strip.innerHTML=`${tracks.length>1?`<label class="annotation-track-picker">${esc(tr("subject"))} / ${esc(tr("track"))}<select data-video-track>${tracks.map(t=>`<option value="${esc(t)}" ${t===this.activeTrack?"selected":""}>${esc(JSON.parse(t).join(" / "))}</option>`).join("")}</select></label>`:""}
          <div class="annotation-video-scale"><strong>${range.start.toFixed(2)}–${range.end.toFixed(2)} s</strong><span>${span.toFixed(2)} s visible</span><button data-range-around>${esc(tr("around"))}</button><button data-range-whole>${esc(tr("whole"))}</button><button data-timeline-expand aria-expanded="${Boolean(this.timelineExpanded)}">${esc(tr(this.timelineExpanded?"collapseTimeline":"expandTimeline"))}</button></div>
          <div class="annotation-track-plot"><svg viewBox="0 0 ${width} ${height}" style="height:${height}px" preserveAspectRatio="none" role="group" aria-label="${esc(tr("table"))}">
          <rect class="annotation-track-background" x="0" y="0" width="${width}" height="${height}"/>
          ${Array.from({length:tickCount+1},(_,i)=>`<line class="annotation-tick" x1="${width*i/tickCount}" x2="${width*i/tickCount}" y1="22" y2="${height}"/><text class="annotation-tick-label" x="${Math.max(3,width*i/tickCount-3)}" y="15" text-anchor="${i===0?'start':i===tickCount?'end':'middle'}">${(range.start+span*i/tickCount).toFixed(span<2?3:1)}</text>`).join("")}
          ${clips.map(s=>{const start=this.drag?.id===s.id&&this.drag.edge==='start'?this.drag.value:s.start,end=this.drag?.id===s.id&&this.drag.edge==='end'?this.drag.value:s.end,left=Math.max(0,x(start)),right=Math.min(width,x(end)),label=A.label(this.doc,s)||this.shortGroup(A.groupKey(this.doc,s));return `<g style="--clip-color:${A.color(this.doc,A.label(this.doc,s))}" data-clip="${esc(s.id)}" tabindex="0" role="button" aria-label="${esc(label)} ${s.start.toFixed(3)}–${s.end.toFixed(3)}" class="${this.selected.has(s.id)?"is-selected":""} ${A.reviewed(this.doc,s)?"is-reviewed":""}"><rect x="${left}" y="30" width="${Math.max(2,right-left)}" height="${height-39}" rx="3"/>${right-left>70?`<text x="${left+5}" y="${height/2+14}">${esc(label.slice(0,Math.floor((right-left)/8)))}</text>`:""}${this.selected.has(s.id)?`<rect data-edge="start" data-id="${s.id}" class="annotation-edge" x="${left}" y="27" width="10" height="${height-33}"/><rect data-edge="end" data-id="${s.id}" class="annotation-edge" x="${Math.max(left,right-10)}" y="27" width="10" height="${height-33}"/>`:""}</g>`;}).join("")}
          <rect data-draft class="annotation-draft" x="0" y="25" width="0" height="${height-29}"/><line data-playhead y1="20" y2="${height}"/></svg></div>
          <div class="annotation-timeline-footer"><small>${esc(tr("timelineHelp"))}</small><input data-timeline-pan type="range" aria-label="Timeline position" min="0" max="${Math.max(0,this.doc.context.duration-span)}" step="${1/this.fps()}" value="${range.start}" ${span>=this.doc.context.duration?'disabled':''}></div>`;
        const picker=this.strip.querySelector("[data-video-track]");if(picker)picker.onchange=()=>{this.activeTrack=picker.value;this.drawTimeline(true);};
        this.strip.querySelector("[data-range-around]").onclick=()=>{const at=this.video.currentVideoTime;this.manualWindow=false;this.window={start:Math.max(0,at-5),end:Math.min(this.doc.context.duration,at+5)};this.drawTimeline(true);};
        this.strip.querySelector("[data-range-whole]").onclick=()=>{this.manualWindow=true;this.window={start:0,end:this.doc.context.duration};this.drawTimeline(true);};
        this.strip.querySelector("[data-timeline-expand]").onclick=()=>{this.timelineExpanded=!this.timelineExpanded;this.drawTimeline(true);};
        this.strip.querySelector("[data-timeline-pan]").oninput=e=>{this.manualWindow=true;const start=Number(e.target.value);this.window={start,end:start+span};const pan=e.target;this.drawTimeline();this.strip.querySelector("[data-timeline-pan]").replaceWith(pan);};
      }
      const head=this.strip.querySelector("[data-playhead]"), pos=x(this.video.currentVideoTime);
      head?.setAttribute("x1",pos);head?.setAttribute("x2",pos);
      const draft=this.strip.querySelector("[data-draft]");
      if(draft&&this.draft) { const left=x(this.draft.start),right=x(this.draft.end??this.video.currentVideoTime);draft.setAttribute("x",Math.min(left,right));draft.setAttribute("width",Math.abs(right-left)); }
    }
    focusVideoRange(range) {
      this.window=range;
      const start=this.video.mapping.videoToNeural(range.start),end=this.video.mapping.videoToNeural(range.end);
      if(Number.isFinite(start)&&Number.isFinite(end)&&end>start)this.setView({visibleRange:{start:Math.max(0,start),end:Math.min(this.getRecording().duration,end)}});
      this.drawTimeline(true);
    }
    select(id, { openEditor = true } = {}) {
      const s = this.doc?.segments.find((v) => v.id === id); if (!s) return;
      this.activeTrack=JSON.stringify([s.subject,s.track]);
      this.selected = new Set([id]); if (openEditor) this.opened = true; this.loop = null; this.draft = null;
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
    values() {
      const clip=this.selected.size===1?this.doc.segments.find(s=>this.selected.has(s.id)):this.draft;
      const time=key=>!this.reviewMode&&clip?.[key]!=null&&!this.input(key).dataset.edited ? clip[key] : Number(this.input(key).value);
      return { start:time("start"),end:time("end"),label:this.input("label").value.trim(),subject:this.input("subject").value.trim(),track:this.input("track").value.trim() };
    }
    async onChange(e) {
      try {
        if (e.target.matches("[data-field=label]") && !this.reviewMode) this.pendingLabel=e.target.value;
        if (e.target.hasAttribute("data-frame-rate")) {
          const fps=Number(e.target.value);if(!Number.isFinite(fps)||fps<1||fps>1000)throw new Error("FPS must be between 1 and 1000");
          this.frameRate=fps; for(const key of ["start","end"]) this.panel.querySelector(`[data-frame="${key}"]`).value=Math.round(Number(this.input(key).value)*fps);
        }
        if (e.target.dataset.frame) {
          const frame=Number(e.target.value);if(!Number.isInteger(frame)||frame<0)throw new Error("Enter a non-negative whole frame number");
          const input=this.input(e.target.dataset.frame);input.value=String(frame/this.fps());input.dataset.edited="true";
        }
        if (["start","end"].includes(e.target.dataset.field) && !this.reviewMode) this.panel.querySelector(`[data-frame="${e.target.dataset.field}"]`).value=Math.round(Number(e.target.value)*this.fps());
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
        if (action === "close") { if (this.reviewMode) this.reviewMode=false; else this.opened = false; this.render(); this.button.focus(); return; }
        if (!this.doc) return;
        if (action === "labels") { this.libraryForm=this.input("start")?this.values():null;this.pendingLabel=this.libraryForm?.label||this.pendingLabel;this.renderLabelLibrary(); this.labelDialog.showModal(); this.labelDialog.querySelector("[data-label-name]").focus(); return; }
        if (action === "preview-clip") { const clip=this.values(); if(!Number.isFinite(clip.start)||!Number.isFinite(clip.end)||clip.start<0||clip.end<=clip.start||clip.end>this.doc.context.duration)throw new Error("Choose a valid interval inside the video"); this.video.seekVideo(clip.start); this.previewEnd=clip.end; this.video.play(); return; }
        if (action === "cursor-start" || action === "cursor-end") {
          const key=action==='cursor-start'?'start':'end', time=this.video.currentVideoTime;
          if(this.selected.size===1) this.commit(A.edit(this.doc,this.one(),{[key]:time}));
          else { const draft={...this.draft,[key]:time}; if(draft.end<=draft.start)throw new Error("End must follow start");this.draft=draft;this.syncDraft();this.render(); } return;
        }
        if (action === "review") { this.reviewMode=true; this.render(); return; }
        if (action === "quick-start") { this.selected.clear(); this.draft={start:this.video.currentVideoTime,end:null}; this.render(); return; }
        if (action === "quick-end") { this.draft.end=this.video.currentVideoTime; if(this.draft.end<=this.draft.start)throw new Error("End must follow start"); this.video.pause(); this.syncDraft(); this.render(); this.input("label")?.focus(); return; }
        if (action === "quick-new") { this.selected.clear(); this.draft=null; this.previewEnd=null;this.setView({selectedInterval:null});this.render();return; }
        if (action === "quick-save") { const values=this.values(); if(!values.label) {this.input("label").focus();this.toast(tr("chooseLabel"));return;} this.pendingLabel=values.label;
          let next;
          if(this.selected.size===1) {
            const id=this.one(),clip=this.doc.segments.find(s=>s.id===id);
            const delta=Object.fromEntries(Object.entries(values).filter(([key,value])=>key==="label"||clip[key]!==value));
            next=A.assign(A.edit(this.doc,id,delta),[id],values.label,true);
          } else next=A.add(this.doc,values);
          const id=this.selected.size===1?this.one():next.segments.at(-1).id;
          this.draft=null;this.selected=new Set([id]);this.commit(next);this.select(id);return; }
        if (action === "save") this.downloadProject();
        if (action === "csv") this.download(A.toCSV(this.doc, this.video.mapping), "annotations.csv", "text/csv");
        if (action === "import") this.panel.querySelector("[data-import]").click();
        if (action === "undo" && this.history.length) { this.future.push(this.doc); this.doc = this.history.pop(); this.loop = null; this.selected.clear(); this.persist(); this.render(); }
        if (action === "redo" && this.future.length) { this.history.push(this.doc); this.doc = this.future.pop(); this.loop = null; this.selected.clear(); this.persist(); this.render(); }
        if (action === "scheme") this.commit(A.addScheme(this.doc, this.panel.querySelector("[data-new-scheme]").value));
        if (["start", "end"].includes(action)) this.input(action).value = this.video.currentVideoTime.toFixed(3);
        if (action === "range") { const r = this.getView().selectedInterval; if (!r) throw new Error(tr("useRange")); const start = this.video.mapping.neuralToVideo(r.start), end = this.video.mapping.neuralToVideo(r.end); if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error(this.video.t("video.outsideClock"));
          if(!this.reviewMode) {this.selected.clear();this.draft={start:Math.max(0,start),end:Math.min(this.doc.context.duration,end)};this.render();this.input("label")?.focus();}
          else {this.input("start").value=Math.max(0,start).toFixed(3);this.input("end").value=Math.min(this.doc.context.duration,end).toFixed(3);} }
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
      this.dragged = false; this.previewEnd=null;
      if(e.button!==0)return;
      const edge = e.target.closest("[data-edge]");
      if (!edge) {
        if(!this.opened||!e.target.closest("svg")||e.target.closest("[data-clip]"))return;
        e.preventDefault(); this.video.pause(); this.selected.clear(); this.brush={anchor:this.pointerTime(e)};
        this.draft={start:this.brush.anchor,end:this.brush.anchor};this.strip.setPointerCapture(e.pointerId);return;
      }
      e.preventDefault(); e.stopPropagation(); this.dragged = false;
      const s = this.doc.segments.find((v) => v.id === edge.dataset.id);
      this.drag = { id: s.id, edge: edge.dataset.edge, value: s[edge.dataset.edge] }; this.strip.setPointerCapture(e.pointerId);
    }
    dragMove(e) {
      if(this.brush) {const t=this.pointerTime(e);this.draft={start:Math.min(t,this.brush.anchor),end:Math.max(t,this.brush.anchor)};this.dragged=true;this.drawTimeline();return;}
      if (!this.drag) return; this.dragged = true;
      const s = this.doc.segments.find((v) => v.id === this.drag.id);
      const time = this.pointerTime(e);
      this.drag.value = this.drag.edge === "start" ? Math.max(0, Math.min(s.end - .001, time)) : Math.min(this.doc.context.duration, Math.max(s.start + .001, time));
      const input = this.input(this.drag.edge); if (input) input.value = this.drag.value.toFixed(3);
      this.drawTimeline();
    }
    dragEnd(e) {
      if(this.brush) {this.brush=null;if(this.strip.hasPointerCapture(e.pointerId))this.strip.releasePointerCapture(e.pointerId);
        if(this.draft.end-this.draft.start<.001){this.video.seekVideo(this.draft.start);this.draft=null;}else this.syncDraft();
        this.render();this.input("label")?.focus();return;}
      if (!this.drag) return;
      const d = this.drag; this.drag = null;
      if (this.strip.hasPointerCapture(e.pointerId)) this.strip.releasePointerCapture(e.pointerId);
      try { this.commit(A.edit(this.doc, d.id, { [d.edge]: d.value })); } catch (error) { this.toast(error.message); }
    }
    pointerTime(e) {const rect=this.strip.querySelector("svg").getBoundingClientRect(),r=this.videoRange();return Math.max(0,Math.min(this.doc.context.duration,Math.round((r.start+Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*(r.end-r.start))*this.fps())/this.fps()));}
    syncDraft() {const start=this.video.mapping.videoToNeural(this.draft.start),end=this.video.mapping.videoToNeural(this.draft.end);this.setView({selectedInterval:Number.isFinite(start)&&Number.isFinite(end)?{start,end}:null});this.video.seekVideo(this.draft.start);}
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
          run: { id: runId, method: D.VERSION, version: "4.8.0-beta.1", parameters: { count, minimumDuration, sampleStepSeconds: step, seed: 42 },
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
