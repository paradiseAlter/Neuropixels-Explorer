// SPDX-License-Identifier: MIT
(() => {
  "use strict";
  const A = window.NeuropixelsAnnotations;
  const D = window.NeuropixelsBehaviorDiscovery;
  const F = window.NeuropixelsVideoFeatures;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COPY = {
    settings:["Video label settings","视频标签设置","Ajustes de etiquetas de vídeo"],
    deleteLabel:["Delete label","删除标签","Eliminar etiqueta"],
    deleteEvents:["Delete events","删除事件","Eliminar eventos"],
    removeEvent:["Delete event","删除事件","Eliminar evento"],
    files:["Annotation files","标注文件","Archivos de anotaciones"],
    saveAs:["Save annotations as…","标注另存为…","Guardar anotaciones como…"],
    savedFile:["Annotations saved","标注已保存","Anotaciones guardadas"],
    changedDuringSave:["Annotations changed. Save the current version again.","标注已变化，请重新保存当前版本。","Las anotaciones han cambiado. Guarda de nuevo la versión actual."],
    undoDelete:["Undo deletion","撤销删除","Deshacer eliminación"],
    linkedEvents:["Events with this label","使用此标签的事件","Eventos con esta etiqueta"],
    acrossSchemes:["Events in any label scheme will be deleted.","将删除所有标签方案中使用此名称的事件。","Se eliminarán los eventos con este nombre en cualquier esquema."],
    editAxis:["Drag a marker to move it or its edge to resize. Drag across the event lane to select. Drag the time ruler to pan.","拖片段移动，拖边缘调整时长。在事件行空白处拖动框选，拖上方秒刻度平移。","Arrastra un evento para moverlo o su borde para ajustar su duración. Arrastra en la pista para seleccionar y en la regla para desplazar."],
    newAnnotation:["New video annotation","新建视频标注","Nueva anotación de vídeo"],
    settingsShort:["Label settings","标签设置","Ajustes de etiquetas"],
    mark:["Mark","标记","Marcar"], stopMark:["Stop","停止","Detener"],
    stopTitle:["Stop marking","停止标记","Detener la marca"],
    markKindTitle:["Event type for the next mark","下一次标记的事件类型","Tipo de evento de la próxima marca"],
    markPointTitle:["Mark the current video time","标记当前视频时刻","Marcar el instante actual del vídeo"],
    pickToMark:["Choose a video label to start marking","选择视频标签后开始标记","Elige una etiqueta de vídeo para empezar"],
    pickLabel:["Video label","视频标签","Etiqueta de vídeo"], newName:["＋ New label","＋ 新标签","＋ Nueva etiqueta"],
    color:["Color","颜色","Color"], name:["Name","名称","Nombre"],
    useName:["Use label","选用标签","Usar etiqueta"], saveName:["Save","保存","Guardar"],
    startNamed:["Start marking","开始标记","Empezar a marcar"],
    defaultMarkKind:["Default event type","默认标记类型","Tipo de evento predeterminado"],
    intervalLabel:["Interval","持续事件","Intervalo"],
    pointLabel:["Time point","时间点","Instante"],
    markPointNow:["Mark time point","标记时间点","Marcar instante"],
    renameNotice:["Renaming updates this name in every label scheme.","改名后，所有标签方案中使用此名称的标注将同步更新。","Cambiar el nombre actualizará su uso en todos los esquemas."],
    inUse:["That name already exists.","该名称已存在。","Ese nombre ya existe."],
    unused:["Remove unused name","移除未用名称","Eliminar nombre sin usar"],
    shortMark:["The end must be later than the start.","结束时间须晚于开始时间。","El final debe ser posterior al inicio."],
    playFailed:["Playback could not start. No interval was saved.","视频未能播放，未生成标注。","No se pudo reproducir el vídeo. No se guardó el intervalo."],
    open: ["Edit clips", "编辑片段", "Editar segmentos"],
    done: ["Done annotating · Esc", "结束标注 · Esc", "Terminar anotación · Esc"],
    dragHint: ["Drag on the video strip to select a behavior, or mark its start and end while watching.", "在视频时间条上拖出一段行为，或播放时标记起点和终点。", "Arrastra en la barra del vídeo o marca inicio y fin mientras lo ves."],
    compactStart: ["Mark start", "标记起点", "Marcar inicio"], compactEnd: ["Mark end", "标记终点", "Marcar fin"],
    more: ["Clips & grouping…", "片段与分组…", "Clips y grupos…"],
    labelHint: ["Enter a label name…", "输入标签名称…", "Escribe el nombre de la etiqueta…"],
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
    inTab:["In this tab · Export project to keep edits","当前页面 · 导出项目可保存标注","En esta pestaña · Exporta el proyecto para guardar"],
    saved: ["Draft saved · Save the project to update its file", "草稿已保存 · 点击保存项目写入项目文件", "Borrador guardado · Guarda el proyecto para actualizar su archivo"],
    saving: ["Saving draft…", "正在保存草稿…", "Guardando borrador…"],
    storageError: ["Browser storage unavailable. Save project before closing.", "浏览器存储不可用，请在关闭前保存项目。", "Almacenamiento no disponible. Guarda el proyecto antes de cerrar."],
    error: ["Annotation", "行为标注", "Anotación"],
    importVideoFirst: ["Attach the matching video before importing annotations.", "请先添加这些标注对应的视频。", "Añade el vídeo correspondiente antes de importar las anotaciones."],
    importLimit: ["Annotation files must be 50 MB or smaller.", "标注文件最大为 50 MB。", "El archivo de anotaciones debe tener 50 MB o menos."],
    importClock: ["Drop the frame clock on Video alignment.", "请把帧时钟拖到视频的「时间对齐」区域。", "Suelta el reloj de fotogramas en Alineación de vídeo."],
    importFormat: ["Select an Explorer video annotation or behavior candidate JSON.", "请选择 Explorer 视频标注或行为候选片段 JSON 文件。", "Selecciona un JSON de anotaciones de vídeo o de candidatos conductuales de Explorer."],
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
    chooseLabel: ["Choose a label…", "选择标签…", "Elige una etiqueta…"],
    precision: ["Fine adjustment · time / frames", "精细调整 · 时间 / 帧", "Ajuste fino · tiempo / fotogramas"],
    expandTimeline: ["Expand timeline", "展开时间轴", "Ampliar línea temporal"],
    collapseTimeline: ["Compact timeline", "收起时间轴", "Compactar línea temporal"],
    timelineHelp: ["Drag to select · hover to preview · wheel to zoom · Shift + wheel to pan", "拖动选区 · 悬浮预览 · 滚轮缩放 · Shift + 滚轮平移", "Arrastra para seleccionar · pasa para previsualizar · rueda para ampliar · Mayús + rueda para desplazar"],
    selection: ["Selected interval", "当前片段", "Intervalo seleccionado"],
    reviewClip: ["Play interval", "播放片段", "Reproducir intervalo"],
    selectedPoint: ["Selected time point", "当前时间点", "Instante seleccionado"],
    eventTime: ["Event time (s)", "事件时间（秒）", "Tiempo del evento (s)"],
    eventFrame: ["Event frame", "事件帧", "Fotograma del evento"],
    seekPoint: ["Go to event frame", "定位事件帧", "Ir al fotograma del evento"],
    useCurrentTime: ["Use current video time", "移到当前视频时间", "Usar el tiempo actual del vídeo"],
    frameStart: ["Start frame", "起始帧", "Fotograma inicial"],
    frameEnd: ["End frame (exclusive)", "结束帧（不含）", "Fotograma final (exclusivo)"],
    frameHelp: ["0-based frame numbers use nominal FPS; for variable-frame-rate video use seconds.", "帧号从 0 开始，按标称帧率换算；变帧率视频请使用秒数。", "Fotogramas desde 0, según FPS nominales; usa segundos para frecuencia variable."],
    seconds: ["video seconds", "视频秒", "segundos de vídeo"],
    featureTitle: ["Model features / keypoints", "模型特征 / 关键点", "Características / puntos del modelo"],
    featureHelp: ["Export a data-only model request, then import timed feature or 2-D keypoint JSON. Imported files contain data only; no imported code is executed. Missing samples remain gaps and all groups need review. Local files or selected local-service videos up to 512 MiB; feature files up to 25 MB. The service returns a content fingerprint, not video bytes.", "导出模型输入数据，再导入带时间的特征或二维关键点 JSON。导入文件仅包含数据，不执行导入的代码。缺失样本保留为空隙，所有分组均待确认。支持不超过 512 MiB 的本地文件或本地服务项目视频，以及 25 MB 的特征文件。服务只返回内容指纹，不搬运视频。", "Exporta datos para tu modelo e importa JSON con tiempos. Los archivos importados son solo datos; no se ejecuta código importado. Se conservan los huecos y todos los grupos requieren revisión. Archivo local o vídeo del proyecto local hasta 512 MiB; JSON hasta 25 MB. El servicio devuelve una huella, no el vídeo."],
    featureExport: ["Export model input", "导出模型输入", "Exportar entrada del modelo"],
    featureModelExample: ["Run pixel adapter example (first 30 s)", "运行像素适配器示例（前 30 秒）", "Ejecutar ejemplo de píxeles (primeros 30 s)"],
    featureModelHelp: ["This local frame adapter reads the actual video and shares a read-only annotation snapshot with source-integrated model code. The bundled RGB-mean example has no pretrained weights and does not recognize behavior. Only local video Blobs are supported; no scripts or remote models are loaded.", "本地帧适配器读取真实视频，并向源码集成的模型提供只读标注快照。自带 RGB 均值示例没有预训练权重，不识别行为。仅支持本地视频 Blob，不加载脚本或远程模型。", "El adaptador local entrega fotogramas reales y una copia de anotaciones al código integrado. El ejemplo RGB no tiene pesos ni reconoce conductas. Solo admite vídeos locales, sin cargar scripts ni modelos remotos."],
    featureImport: ["Import features and group", "导入特征并分组", "Importar y agrupar"],
    featureConfidence: ["Minimum keypoint confidence", "关键点置信度下限", "Confianza mínima del punto"],
    featureScale: ["Feature scaling", "特征标准化", "Escala de características"],
    featureZ: ["Per-feature z-score", "逐特征 z-score", "Z-score por característica"],
    featureNone: ["Keep feature units", "保留特征单位", "Conservar unidades"],
    featurePose: ["Pose centering, rotation and scale follow the file's declared named anchors. No temporal smoothing or short-bout merging is applied.", "姿态平移、旋转与尺度处理按文件声明的具名锚点执行。不平滑时间，也不合并短片段。", "La postura usa los anclajes declarados en el archivo. No se suaviza el tiempo ni se unen episodios breves."],
    featureWorking: ["Checking video identity and grouping features…", "正在核对视频身份并处理特征…", "Verificando vídeo y agrupando…"]
  };
  const tr = (key) => COPY[key]?.[document.documentElement.lang === "zh-CN" ? 1 : document.documentElement.lang === "es" ? 2 : 0] || key;
  const clipTime = (clip, digits = 3) => clip.start.toFixed(digits) + (clip.kind === "point" ? "" : "–" + clip.end.toFixed(digits)) + " s";
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
    constructor({ panel, strip, button, video, getRecording, getView, setView, toast, onAnnotations = () => {}, onOpenChange = () => {}, labelControls=null, eventTimeline=null }) {
      Object.assign(this, { panel, strip, button, video, getRecording, getView, setView, toast, onAnnotations, onOpenChange, labelControls, eventTimeline });
      this.store = new DraftStore(); this.doc = null; this.key = null; this.history = []; this.future = [];
      this.contextVersion = 0;
      this.selected = new Set(); this.group = ""; this.page = 0; this.opened = false; this.loop = null;
      this.saveQueue = Promise.resolve(); this.storageStatus = "saved";
      this.home = panel.parentElement;
      this.installPreview();
      this.labelDialog = document.createElement("dialog");
      this.labelDialog.className = "annotation-label-dialog annotation-panel";
      this.labelDialog.setAttribute("aria-label", tr("settings"));
      document.body.append(this.labelDialog);
      this.labelDialog.addEventListener("close", () => {
        if(this.labelDialog.open)return;
        const prompt=this.markPrompt;
        this.markPrompt=null;this.markAfterSettings=false;
        if(prompt?.wasPlaying && this.markIsCurrent(prompt) && !this.video.playing)this.video.play();
      });
      this.labelDialog.addEventListener("click", event => {
        if(event.target.closest('[data-label-new]')){
          this.creatingLabel=true;this.settingsName="";this.libraryPage=0;
          this.renderLabelLibrary();this.labelDialog.querySelector('[data-label-name]').focus();
        }
        if(event.target.closest('[data-label-use]'))this.useSavedLabel();
        if (event.target.closest("[data-label-close]")) this.labelDialog.close();
        if (event.target.closest("[data-label-remove]")) this.removeLabel();
        const remove=event.target.closest("[data-delete-clip]");
        if(remove)this.deleteClips([remove.dataset.deleteClip]);
        const seek=event.target.closest("[data-label-event]");
        if(seek){this.video.pause();this.video.seekVideo(Number(seek.dataset.labelEvent));}
        const page=event.target.closest("[data-library-page]");
        if(page){this.libraryPage+=Number(page.dataset.libraryPage);this.renderLabelLibrary();}
        const action=event.target.closest("[data-action]")?.dataset.action;
        if(action==="undo" || action==="redo")this.restoreEdit(action==="redo");
      });
      this.labelDialog.addEventListener("submit",event=>{event.preventDefault();this.saveLabelSettings();});
      this.labelDialog.addEventListener("dblclick",e=>{
        const list=e.target.closest('[data-settings-select]');if(!list)return;
        this.settingsName=e.target.closest('option')?.value || list.value;
        this.useSavedLabel();
      });
      this.labelDialog.addEventListener("keydown",e=>{if(e.key==='Enter' && e.target.matches('[data-settings-select]')){e.preventDefault();this.useSavedLabel();}});
      this.labelDialog.addEventListener("input",e=>{
        this.labelDialog.querySelector("[data-label-name]")?.setCustomValidity("");
        const use=this.labelDialog.querySelector('[data-label-use]');
        if(use && e.target.matches('[data-label-name],[data-label-color],[data-label-kind]'))use.disabled=true;
      });
      this.labelDialog.addEventListener("change", event => {
        if(event.target.matches("[data-settings-select]")){this.creatingLabel=false;this.settingsName=event.target.value;this.libraryPage=0;this.renderLabelLibrary(true);}
        if(event.target.matches("[data-label-color]"))event.target.dataset.edited="true";
      });
      labelControls?.settings.addEventListener("click",()=>this.openLabelSettings(false));
      labelControls?.mark.addEventListener("click",()=>this.toggleMark());
      labelControls?.kind?.addEventListener("change",({target})=>{
        if(!this.doc || this.quickMark)return;
        if(this.markLabel && Object.hasOwn(this.doc.labelColors||{},this.markLabel)){
          this.commit(A.addLabel(this.doc,this.markLabel,target.value));
        } else {
          this.unassignedMarkKind=target.value;
          this.refreshMarkControls();
        }
      });
      labelControls?.mark.addEventListener("keydown",e=>{if(e.repeat && ["Enter"," "].includes(e.key))e.preventDefault();});
      this.video.elements.video?.addEventListener("ended",()=>{if(this.quickMark)this.finishMark(this.doc?.context.duration);});
      this.video.elements.video?.addEventListener("error",()=>{if(this.quickMark)this.cancelMark(true);});
      this.reviewDialog = document.createElement("dialog"); this.reviewDialog.className = "annotation-review-dialog";
      document.body.append(this.reviewDialog);
      this.reviewDialog.addEventListener("cancel", e => { e.preventDefault(); this.abort?.abort(); this.reviewMode = false; this.render(); });
      this.stripObserver=new ResizeObserver(()=>this.drawTimeline(true));this.stripObserver.observe(strip);
      button.addEventListener("click", () => { this.cancelGesture(); this.opened = !this.opened; if (!this.opened) this.abort?.abort(); this.render(); });
      document.addEventListener("keydown", e => this.editShortcut(e), true);
      document.addEventListener("keydown", e => {
        if (!e.defaultPrevented && e.key === "Escape" && this.opened && !this.reviewMode && !document.querySelector("dialog[open]")) { e.preventDefault(); this.abort?.abort(); this.opened = false; this.render(); button.focus(); }
        if (document.querySelector("#workspace-settings") || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !this.opened || this.reviewMode || this.labelDialog.open || e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        if (e.code === "Space" && !e.target.closest("button,a,[role=button]")) { e.preventDefault(); this.video.togglePlayback(); }
        if(e.repeat)return;
        const key=e.key.toLowerCase();
        if(this.labelControls){
          if(key==="i" && !this.quickMark)this.toggleMark();
          if(key==="o" && this.quickMark)this.finishMark(this.markTime());
        } else {
          if(key==="i")this.panel.querySelector('[data-action="quick-start"]')?.click();
          if(key==="o")this.panel.querySelector('[data-action="quick-end"]:not(:disabled)')?.click();
        }
      });
      panel.addEventListener("click", (e) => this.action(e));
      panel.addEventListener("change", (e) => this.onChange(e));
      panel.addEventListener("input", e => {
        if(e.target.dataset.field) e.target.dataset.edited="true";
        if ((e.target.dataset.frame || ["start","end"].includes(e.target.dataset.field)) && e.target.value!=="" && e.target.validity.valid) this.onChange(e);
      });
      strip.tabIndex=0;
      strip.addEventListener("click", e => {
        const clip=e.target.closest("[data-clip]");
        if(clip && !this.dragged)this.select(clip.dataset.clip,{openEditor:this.opened,preserveWindow:true});
        this.dragged=false;
      });
      strip.addEventListener("keydown", e => {
        if (["Enter", " "].includes(e.key) && e.target.dataset.clip) {e.preventDefault();this.select(e.target.dataset.clip,{openEditor:this.opened,preserveWindow:true});strip.focus();}
      });
      strip.addEventListener("pointerdown", (e) => this.dragStart(e));
      strip.addEventListener("pointermove", (e) => { this.dragMove(e); this.previewAt(e); });
      strip.addEventListener("pointerleave", () => { if (!this.brush && !this.drag) this.preview.hidden = true; });
      strip.addEventListener("wheel", e => {if(!this.eventTimeline)this.zoomTimeline(e);}, { passive: false });
      strip.addEventListener("pointerup", (e) => this.dragEnd(e));
      for (const type of ["pointercancel","lostpointercapture"]) strip.addEventListener(type, e => {
        if (this.gesture?.pointerId === e.pointerId) this.cancelGesture();
      });
      panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { e.preventDefault(); this.abort?.abort(); if (this.reviewMode) this.reviewMode = false; else this.opened = false; this.render(); button.focus(); }
        if (e.key === "Enter" && e.target.dataset.field === "label") { e.preventDefault(); this.panel.querySelector('[data-action="quick-save"]')?.click(); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); this.onSaveProject ? this.onSaveProject() : this.saveAnnotations(); }
      });
      this.eventTimeline?.attachEditor(this);
      this.render();
    }
    buttonHTML(action, key, extra = "") {
      if (action === "undo" || action === "redo") {
        const shortcut = action === "undo" ? "Ctrl+Z / ⌘Z" : "Ctrl+Y / ⇧⌘Z";
        const keys = action === "undo" ? "Control+Z Meta+Z" : "Control+Shift+Z Meta+Shift+Z Control+Y";
        extra += ` title="${esc(tr(key))} · ${shortcut}" aria-keyshortcuts="${keys}"`;
      }
      return `<button type="button" data-action="${action}" ${extra}>${esc(tr(key))}</button>`;
    }
    editShortcut(e) {
      if (e.defaultPrevented || !this.doc) return;
      if(e.key==="Escape" && this.quickMark){e.preventDefault();e.stopPropagation();this.cancelMark(true);return;}
      if (e.key === "Escape" && this.gesture) {
        e.preventDefault(); e.stopPropagation(); this.cancelGesture(); return;
      }
      const node=e.target;
      const atAxis=(!this.eventTimeline || this.eventTimeline.usesEditor()) && (this.strip.contains(node)||this.eventTimeline?.scale.contains(node));
      if(atAxis && !this.gesture && e.key==="Delete" && this.selected.size && !node.closest("select,input,textarea")){
        e.preventDefault();e.stopPropagation();this.deleteClips(this.axisSelection());this.strip.focus({preventScroll:true});return;
      }
      if(atAxis && e.key==="Escape" && this.selected.size){e.preventDefault();e.stopPropagation();this.selected.clear();this.draft=null;this.syncSelectedClip();this.render();return;}
      const atMark=node===this.labelControls?.mark || node===this.labelControls?.settings;
      if (!(this.opened || atAxis || atMark || this.labelDialog.open) || e.altKey || !(e.ctrlKey || e.metaKey) || e.isComposing || this.gesture) return;
      if (node.isContentEditable || /^(INPUT|TEXTAREA)$/.test(node.tagName)) return;
      const dialog=document.querySelector("dialog[open]");
      if (dialog && !this.reviewDialog.open && !this.labelDialog.open) return;
      if (!(this.panel.contains(node) || this.strip.contains(node) || this.labelDialog.contains(node) ||
          this.reviewDialog.contains(node) || node === this.button || node === document.body || atMark || atAxis)) return;
      const key=e.key.toLowerCase();
      if (key !== "z" && !(key==="y" && e.ctrlKey && !e.shiftKey)) return;
      e.preventDefault(); e.stopPropagation();
      this.restoreEdit(key==="y" || e.shiftKey);
    }
    async update() {
      const recording = this.getRecording(), source = this.video?.source;
      if (this.featureFingerprintCache?.file !== this.video?.localFile) this.featureFingerprintCache = null;
      const duration = Number(source?.duration || 0);
      // New project videos have a persistent media identity. Older project documents retain their original four-field key.
      const videoId=source?.descriptor?.annotationSourceId;
      // A video opened on its own keeps this identity when a recording is added later.
      const owner=source?.descriptor?.annotationRecordingKey ?? recording?.databaseId ?? recording?.key;
      const context = owner != null && source && duration > 0 ? {
        key: JSON.stringify([owner, source.kind, source.name, source.size ?? null,
          ...(typeof videoId==="string" && videoId.length ? [videoId] : [])]),
        recordingKey: String(owner), videoName: source.name,
        videoSize: source.size ?? null, duration
      } : null;
      if ((context?.key || null) !== this.key) {
        this.cancelMark(false); this.markLabel="";this.unassignedMarkKind="interval";this.markPrompt=null;this.markAfterSettings=false;
        this.cancelGesture(); this.abort?.abort(); this.persist();
        const version = ++this.contextVersion;
        this.progressText = "";
        this.key = context?.key || null; this.doc = null; this.history = []; this.future = []; this.selected.clear(); this.group = ""; this.page = 0; this.loop = null; this.draft = null; this.reviewMode = false; this.window = null; this.activeTrack = null; this.pendingLabel = ""; this.manualWindow=false;this.frameRate=null;this.previewEnd=null;this.preview.hidden=true;this.previewTime=null;this.previewUrl=null;this.previewVideo.removeAttribute("src");this.previewVideo.load();this.labelDialog.close();
        this.render();
        if (context) {
          const token = this.key;
          try {
            await this.saveQueue;
            const saved = await this.store.request(context.key);
            if (this.key !== token || version !== this.contextVersion) return;
            this.doc = saved ? A.validate(saved, context) : A.create(context); this.storageStatus = "saved";
          } catch (e) {
            if (this.key !== token || version !== this.contextVersion) return;
            this.doc = A.create(context); this.storageStatus = "storageError"; this.toast(`${tr("error")}: ${e.message}`);
          }
          this.render();
          this.onDocumentReady?.(this.key);
        }
      } else {
        if(this.quickMark && !this.markIsCurrent(this.quickMark))this.cancelMark(true);
        if(this.markPrompt && !this.markIsCurrent(this.markPrompt)){
          this.markPrompt=null;this.markAfterSettings=false;this.labelDialog.close();
        }
        if(this.quickMark && this.video.currentVideoTime>=duration && duration>0)this.finishMark(duration);
        this.refreshMarkControls();
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
      this.cancelMark(false);this.markLabel="";this.markPrompt=null;this.markAfterSettings=false;
      await this.flush();
      this.cancelGesture(); this.abort?.abort(); this.contextVersion++; this.history=[]; this.future=[];
      this.doc = null; this.key = null;
      this.store = store;
      await this.update();
    }
    renderStorage() { const node = this.panel.querySelector("[data-storage]"); if (node) { node.textContent = tr(this.storageStatus==="saved" && this.onDocumentEdit ? "inTab" : this.storageStatus); node.dataset.failed = String(this.storageStatus === "storageError"); } }
    editSnapshot() {
      const interval=this.getView().selectedInterval;
      return {doc:this.doc, selection:[...this.selected], draft:this.draft && {...this.draft}, mapping:this.video.mapping,
        interval:interval && {...interval},
        group:this.group, page:this.page, track:this.activeTrack, pendingLabel:this.pendingLabel, markLabel:this.markLabel};
    }
    neuralInterval(videoStart,videoEnd,point=false) {
      if(!this.getRecording() || !Number.isFinite(videoStart) || !Number.isFinite(videoEnd))return null;
      const mapping=this.video.mapping,anchors=mapping.frameClock?.video_s;
      const left=Math.max(videoStart,anchors?.[0]??0),right=Math.min(videoEnd,anchors?.at(-1)??videoEnd);
      if(point ? right!==left : right<=left)return null;
      const duration=this.getRecording()?.duration;
      const a=mapping.videoToNeural(left),b=mapping.videoToNeural(right);
      if(!Number.isFinite(a) || !Number.isFinite(b))return null;
      const start=Math.max(0,a),end=Math.min(duration>0?duration:Infinity,b);
      return (point ? end===start : end>start) ? {start,end} : null;
    }
    syncSelectedClip(fallback=null) {
      const clip=this.selected.size===1 ? this.doc.segments.find(s=>this.selected.has(s.id)) : this.draft;
      this.setView({selectedInterval:clip ? this.neuralInterval(clip.start,clip.end) : fallback});
    }
    restoreEdit(redo) {
      this.cancelMark(true);
      this.cancelGesture();
      const from=redo ? this.future : this.history, to=redo ? this.history : this.future;
      if (!from.length) return;
      this.onDocumentEdit?.();
      const state=from.pop();to.push({...this.editSnapshot(),operation:state.operation});
      this.doc=state.doc; this.selected=new Set(state.selection); this.draft=state.draft;
      this.group=state.group; this.page=state.page; this.activeTrack=state.track; this.pendingLabel=state.pendingLabel;
      this.markLabel=state.markLabel;
      this.loop=null; this.previewEnd=null; this.syncSelectedClip(state.mapping===this.video.mapping?state.interval:null); this.persist(); this.render();
      if(this.labelDialog.open)this.renderLabelLibrary();
    }
    commit(next, before) {
      if(this.quickMark && (next.activeSchemeId!==this.quickMark.scheme ||
          !Object.hasOwn(next.labelColors||{},this.quickMark.label)))this.cancelMark(true);
      this.cancelGesture();
      this.history.push(before || this.editSnapshot()); if (this.history.length > 30) this.history.shift();
      this.onDocumentEdit?.();
      this.future = []; this.doc = next; this.loop = null;
      const hadSelection=this.selected.size>0;
      this.selected = new Set([...this.selected].filter((id) => next.segments.some((s) => s.id === id)));
      if (this.selected.size === 1 || hadSelection && !this.selected.size) this.syncSelectedClip();
      this.persist(); this.render();
    }
    render() {
      this.refreshMarkControls();
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
      if (!this.eventTimeline) this.strip.hidden = !this.doc || (!this.opened && !this.doc.segments.length);
      if (!this.opened || !this.doc) { this.panel.innerHTML = this.doc ? "" : `<p>${esc(tr("empty"))}</p>`; this.drawTimeline(true); return; }
      const B = (a,k,x) => this.buttonHTML(a,k,x);
      const active = this.selected.size === 1 ? this.doc.segments.find(s => this.selected.has(s.id)) : null;
      const clip = active || this.draft, complete = clip?.end != null, point = clip?.kind === "point";
      const activeTrack = this.activeTrack ? JSON.parse(this.activeTrack) : ["animal-1", "behavior"];
      const labels = Object.keys(this.doc.labelColors || {});
      const currentLabel = active ? A.label(this.doc, active) : this.pendingLabel || "";
      const field = (key,value) => `<label>${esc(tr(point ? "eventTime" : key))}<input data-field="${key}" type="number" min="0" step="0.001" value="${value}"></label>`;
      this.panel.innerHTML = `<div class="annotation-workbar">
        <strong>${complete ? `${esc(tr(point ? "selectedPoint" : "selection"))} · ${clipTime(clip)}` : esc(tr("dragHint"))}</strong>
        <div class="annotation-context-actions">${this.canUndoDelete()?B("undo","undoDelete"):""}${B("review","more")}</div></div>
        ${complete ? `<div class="annotation-apply-row"><label>${esc(tr("label"))}<select data-field="label"><option value="">${esc(tr("chooseLabel"))}</option>${labels.map(l=>`<option value="${esc(l)}" ${l===currentLabel?"selected":""}>${esc(l)}</option>`).join("")}</select></label>
          ${B("quick-save","saveClip",'class="annotation-primary"')}${B("preview-clip",point?"seekPoint":"reviewClip")}${B("cursor-start",point?"useCurrentTime":"markStart")}${point?"":B("cursor-end","markEnd")}<details class="annotation-clip-tools"><summary>${esc(tr("clipTools"))}</summary><div>${B("quick-new",active?"newClip":"clear")}${active?(point?"":B("split","split"))+B("remove","remove"):""}</div></details></div>
          <input data-field="subject" type="hidden" value="${esc(clip.subject||activeTrack[0])}"><input data-field="track" type="hidden" value="${esc(clip.track||activeTrack[1])}">
          <details class="annotation-precision"><summary>${esc(tr("precision"))}</summary><div class="annotation-precision-fields">${field("start",clip.start.toFixed(6))}${point?"":field("end",clip.end.toFixed(6))}
          <label>${esc(tr(point?"eventFrame":"frameStart"))}<input data-frame="start" type="number" min="0" step="1" value="${Math.round(clip.start*this.fps())}"></label>
          ${point?"":`<label>${esc(tr("frameEnd"))}<input data-frame="end" type="number" min="1" step="1" value="${Math.round(clip.end*this.fps())}"></label>`}
          <label>Nominal FPS<input data-frame-rate type="number" min="1" max="1000" step="any" value="${this.fps()}"></label></div><small>${esc(tr("frameHelp"))}</small></details>` :
          `<div class="annotation-quick-actions">${this.labelControls?"":B("quick-start","compactStart")+B("quick-end","compactEnd",this.draft?.start==null?"disabled":"")}${B("range","useRange",this.getView().selectedInterval?"":"disabled")}<span>${this.draft ? `${this.draft.start.toFixed(3)} s → …` : `${this.doc.segments.length} ${esc(tr("clipCount"))}`}</span></div>`}
          <div class="annotation-statusline"><small data-storage>${esc(tr(this.storageStatus==="saved" && this.onDocumentEdit ? "inTab" : this.storageStatus))}</small><small data-sync-note>${esc(tr(this.video.mapping.verificationStatus === "verified" ? "verified" : "unverified"))}</small></div>`;
      this.drawTimeline(true);
    }
    renderFull() {
      this.button.textContent = tr("open"); this.button.setAttribute("aria-expanded", String(this.opened));
      this.panel.hidden = !this.opened; if (!this.eventTimeline) this.strip.hidden = !this.doc;
      this.panel.querySelectorAll("video").forEach((v) => { v.pause(); v.removeAttribute("src"); v.load(); });
      if (!this.opened) { this.panel.innerHTML = ""; this.drawTimeline(); return; }
      const autoOpen = this.panel.querySelector(".annotation-algorithm")?.open || Boolean(this.abort);
      this.autoCount = this.panel.querySelector("[data-clusters]")?.value || this.autoCount || "8";
      this.autoMinimum = this.panel.querySelector("[data-minimum]")?.value || this.autoMinimum || "0.4";
      const B = (a, k, x) => this.buttonHTML(a, k, x);
      const header = `<header class="annotation-heading"><div><strong>${esc(tr("title"))}</strong><span>4.16.1-beta.1</span></div>${B("close", "close")}</header>`;
      if (!this.doc) { this.panel.innerHTML = header + `<p>${esc(tr("empty"))}</p>`; return; }
      const doc = this.doc, groups = A.groups(doc), s = A.scheme(doc);
      if (this.group && !groups.some((g) => g.key === this.group)) this.group = "";
      const clips = (this.group ? groups.find((g) => g.key === this.group)?.segments : [...doc.segments].sort((a, b) => a.start - b.start)) || [];
      this.page = Math.max(0, Math.min(this.page, Math.ceil(clips.length / 20) - 1));
      const visible = clips.slice(this.page * 20, this.page * 20 + 20);
      const checked = [...this.selected].map((id) => doc.segments.find((a) => a.id === id)).filter(Boolean);
      const active = checked.length === 1 ? checked[0] : null;
      const point = active?.kind === "point", hasPoint = checked.some(clip => clip.kind === "point");
      const range = this.getView().selectedInterval;
      const fromNeural = (t) => Math.max(0, Math.min(doc.context.duration, this.video.mapping.neuralToVideo(t)));
      const start = active?.start ?? (range ? fromNeural(range.start) : fromNeural(this.getView().cursorTime || 0));
      const end = active?.end ?? (range ? fromNeural(range.end) : Math.min(doc.context.duration, start + 1));
      const field = (key, value, type = "text") => `<label>${esc(tr(point && key==="start"?"eventTime":key))}<input data-field="${key}" type="${type}" ${type === "number" ? 'min="0" step="0.001"' : 'maxlength="200"'} value="${esc(value)}"></label>`;
      this.panel.innerHTML = `${header}<div class="annotation-toolbar">
        <label>${esc(tr("scheme"))}<select data-scheme>${doc.schemes.map((v) => `<option value="${esc(v.id)}" ${v.id === s.id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>
        <input data-new-scheme aria-label="${esc(tr("schemeName"))}" placeholder="${esc(tr("schemeName"))}" maxlength="200">${B("scheme", "newScheme")}
        <details><summary>${esc(tr("files"))}</summary>${B("import","import",`title="${esc(tr("importedWarning"))}"`)}${B("save","saveAs")}${B("csv","csv")}</details>
        ${B("undo", "undo", this.history.length ? "" : "disabled")}${B("redo", "redo", this.future.length ? "" : "disabled")}
        <input type="file" data-import accept=".json,application/json" hidden></div>
        <p class="annotation-note" data-sync-note>${esc(tr(this.video.mapping.verificationStatus === "verified" ? "verified" : "unverified"))}</p>
        <div class="annotation-content"><section class="annotation-clips"><div class="annotation-group-tools">
        <label>${esc(tr("group"))}<select data-group><option value="">${esc(tr("all"))} · ${doc.segments.length}</option>${groups.map((g) => `<option value="${esc(g.key)}" ${g.key === this.group ? "selected" : ""}>${esc(g.name || this.shortGroup(g.key))} · ${g.segments.length}</option>`).join("")}</select></label>
        <input data-group-name aria-label="${esc(tr("groupName"))}" placeholder="${esc(tr("groupName"))}" value="${esc(s.mappings[this.group] || "")}" maxlength="200">${B("name", "nameGroup")}</div>
        <div class="annotation-list" role="region" aria-label="${esc(tr("table"))}">${visible.length ? visible.map((a) => `<div class="annotation-row ${this.selected.has(a.id) ? "is-selected" : ""}">
          <input type="checkbox" data-check="${esc(a.id)}" aria-label="${esc(clipTime(a))}" ${this.selected.has(a.id) ? "checked" : ""}>
          <button type="button" data-select="${esc(a.id)}"><strong>${clipTime(a)}</strong><span>${esc(A.label(doc, a) || this.shortGroup(A.groupKey(doc, a)))}</span></button>
          <span class="annotation-review ${A.reviewed(doc, a) ? "is-reviewed" : ""}">${esc(tr(A.reviewed(doc, a) ? "reviewed" : "suggested"))}</span></div>`).join("") : `<p>${esc(tr("noClips"))}</p>`}</div>
        <div class="annotation-pagination">${B("page-select", "selectPage")}${B("clear", "clear")}<span>${this.selected.size} ${esc(tr("selected"))} · ${clips.length ? this.page * 20 + 1 : 0}–${Math.min((this.page + 1) * 20, clips.length)} / ${clips.length}</span>${B("previous", "prev", this.page ? "" : "disabled")}${B("next", "next", (this.page + 1) * 20 < clips.length ? "" : "disabled")}</div></section>
        <section class="annotation-edit"><strong>${esc(tr("detail"))}</strong><div class="annotation-fields">${field("start", start.toFixed(3), "number")}${point?"":field("end", end.toFixed(3), "number")}${field("label", active ? A.label(doc, active) : "")}${field("subject", active?.subject || "animal-1")}${field("track", active?.track || "behavior")}</div>
        <div class="annotation-edit-actions">${B("start", point?"useCurrentTime":"markStart")}${point?"":B("end", "markEnd")+B("range", "useRange")}${B("add", "add")}${B("edit", "edit")}${point?"":B("split", "split")}${hasPoint?"":B("merge", "merge")}${point?"":B("loop", "loop", `aria-pressed="${Boolean(this.loop)}"`)}${B("label", "apply")}${B("confirm", "confirm")}${B("regroup", "regroup")}${B("remove", "remove")}</div>
        <details class="annotation-algorithm" ${autoOpen ? "open" : ""}><summary>${esc(tr("auto"))}</summary><p>${esc(tr("autoHelp"))}</p><div class="annotation-auto-controls"><label>${esc(tr("count"))}<input data-clusters type="number" min="2" max="32" value="${esc(this.autoCount)}"></label><label>${esc(tr("minimum"))}<input data-minimum type="number" min="0.2" max="10" step="0.2" value="${esc(this.autoMinimum)}"></label>${B("run", "run", this.abort ? "disabled" : "")}${B("cancel", "cancel", this.abort ? "" : "disabled")}</div></details>
        <details class="annotation-features" ${this.featureOpen ? "open" : ""}><summary>${esc(tr("featureTitle"))}</summary><p>${esc(tr("featureHelp"))}</p><p>${esc(tr("featurePose"))}</p><div class="annotation-auto-controls">
        <label>${esc(tr("count"))}<input data-feature-option="count" type="number" min="2" max="32" value="${esc(this.featureOptions?.count ?? 8)}"></label>
        <label>${esc(tr("featureConfidence"))}<input data-feature-option="minConfidence" type="number" min="0" max="1" step="0.05" value="${esc(this.featureOptions?.minConfidence ?? .8)}"></label>
        <label>${esc(tr("featureScale"))}<select data-feature-option="normalization"><option value="zscore" ${this.featureOptions?.normalization !== "none" ? "selected" : ""}>${esc(tr("featureZ"))}</option><option value="none" ${this.featureOptions?.normalization === "none" ? "selected" : ""}>${esc(tr("featureNone"))}</option></select></label>
        ${B("feature-export", "featureExport", this.abort ? "disabled" : "")}${B("feature-import", "featureImport", this.abort ? "disabled" : "")}${B("cancel", "cancel", this.abort ? "" : "disabled")}
        <input data-feature-file type="file" accept=".json,application/json" hidden></div><p>${esc(tr("featureModelHelp"))}</p>${B("feature-model-example", "featureModelExample", this.abort || !(this.video.localFile instanceof Blob) ? "disabled" : "")}</details>
        <p data-progress role="status">${esc(this.progressText || "")}</p></section></div>
        ${this.group ? `<section class="annotation-samples"><strong>${esc(tr("samples"))}</strong><div data-samples></div></section>` : ""}
        <footer class="annotation-footer" data-storage>${esc(tr(this.storageStatus==="saved" && this.onDocumentEdit ? "inTab" : this.storageStatus))}</footer>`;
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
        b.textContent = `${index + 1} · ${clipTime(clip,2)}`; b.title = tr("preview");
        if (url && this.video.source.kind !== "synthetic") {
          const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.controls = true; v.preload = "auto";
          v.setAttribute("aria-label", `${tr("samples")} ${index + 1}`); v.src = url;
          v.addEventListener("loadedmetadata", () => { v.currentTime = clip.start; });
          if(clip.kind==="point")v.controls=false;
          else {
            v.addEventListener("timeupdate", () => { if (v.currentTime >= clip.end || v.currentTime < clip.start - .005) v.currentTime = clip.start; });
            v.addEventListener("ended", () => { v.currentTime = clip.start; v.play().catch(() => {}); });
          }
          div.append(v);
        }
        div.append(b); target.append(div);
      }
    }
    fps() { return Number(this.frameRate || this.video.source?.fps || 30); }
    setMarkLabel(name,source) {
      if(source==="annotation" && name && Object.hasOwn(this.doc?.labelColors||{},name))this.markLabel=name;
      this.refreshMarkControls();
    }
    currentMarkKind() {
      return this.markLabel && Object.hasOwn(this.doc?.labelColors||{},this.markLabel)
        ? A.labelKind(this.doc,this.markLabel) : this.unassignedMarkKind || "interval";
    }
    refreshMarkControls() {
      if(!this.labelControls)return;
      const {settings,mark,kind}=this.labelControls, label=this.quickMark?.label || this.markLabel;
      const mode=this.currentMarkKind();
      const disabled=!this.doc || !this.video.source || (!this.quickMark &&
        Boolean(this.video.outsideClock || this.video.elements.video?.error || (mode==="interval" && this.markTime()>=this.doc.context.duration)));
      const signature=JSON.stringify([document.documentElement.lang,label,mode,!!this.quickMark,!!this.doc,disabled]);
      if(signature===this.controlsSignature)return;
      this.controlsSignature=signature;
      settings.textContent=tr("settingsShort"); settings.title=tr("settings");
      settings.setAttribute("aria-label",settings.title);
      settings.disabled=!this.doc || !!this.quickMark;
      if(kind){
        kind.disabled=settings.disabled;
        kind.title=tr("markKindTitle");kind.setAttribute("aria-label",kind.title);
        kind.options[0].textContent=tr("intervalLabel");kind.options[1].textContent=tr("pointLabel");
        kind.value=mode;
      }
      mark.textContent=tr(this.quickMark?"stopMark":"mark");
      mark.title=label?tr(this.quickMark?"stopTitle":mode==="point"?"markPointTitle":"startNamed")+" · "+label:tr("pickToMark");
      mark.setAttribute("aria-label",mark.title);
      mark.setAttribute("aria-pressed",String(!!this.quickMark));
      mark.disabled=disabled;
    }
    markTime() {
      const media=this.video.elements.video;
      return ["file","url"].includes(this.video.source?.kind) && media?.readyState>=1 && !this.video.manualPlayback
        ? media.currentTime : this.video.currentVideoTime;
    }
    markIsCurrent(mark) {
      return !this.video.outsideClock && !this.video.elements.video?.error && mark.version===this.contextVersion &&
        mark.source===this.video.source && mark.sourceId===this.video.source?.descriptor?.annotationSourceId && mark.mapping===this.video.mapping &&
        mark.scheme===this.doc?.activeSchemeId && mark.documentKey===this.key;
    }
    markContext() {
      return {start:this.markTime(),scheme:this.doc.activeSchemeId,source:this.video.source,
        documentKey:this.key,sourceId:this.video.source?.descriptor?.annotationSourceId,mapping:this.video.mapping,version:this.contextVersion,wasPlaying:this.video.playing};
    }
    async toggleMark(prompt=null) {
      if(this.quickMark){this.finishMark(this.markTime());return;}
      if(!this.doc || !this.video.source || this.video.outsideClock || this.video.elements.video?.error)return;
      if(!this.markLabel || !Object.hasOwn(this.doc.labelColors||{},this.markLabel)){this.openLabelSettings(true);return;}
      const context=prompt || this.markContext();
      const kind=this.currentMarkKind();
      if(!Number.isFinite(context.start) || context.start<0 || context.start>this.doc.context.duration ||
          (kind==="interval" && context.start===this.doc.context.duration) || !this.markIsCurrent(context))return;
      const [subject,track]=this.activeTrack?JSON.parse(this.activeTrack):["animal-1","behavior"];
      const mark={...context,label:this.markLabel,subject,track};
      this.labelControls?.selectLabel(mark.label);
      if(kind==="point"){
        this.saveMark(mark,mark.start,kind);
        if(prompt?.wasPlaying && !this.video.playing)await this.video.play();
        return;
      }
      this.quickMark=mark;this.loop=null;this.previewEnd=null;
      this.refreshMarkControls();
      if(this.video.playing)return;
      try {
        mark.starting=true;
        const played=await this.video.play();mark.starting=false;
        if(played===false && this.quickMark===mark){this.cancelMark(false);this.toast(tr("playFailed"));}
      } catch {
        if(this.quickMark===mark){this.cancelMark(false);this.toast(tr("playFailed"));}
      }
    }
    finishMark(at) {
      const mark=this.quickMark;
      if(!mark)return;
      if(mark.starting && !this.video.playing){this.cancelMark(true);return;}
      this.quickMark=null;
      if(!this.markIsCurrent(mark)){this.refreshMarkControls();return;}
      this.video.pause();
      const end=Math.min(at,this.doc.context.duration);
      if(!Number.isFinite(end)||end<=mark.start){this.refreshMarkControls();this.toast(tr("shortMark"));return;}
      if(Math.abs(end-this.video.currentVideoTime)>1e-6)this.video.seekVideo(end,{preserveView:true});
      this.saveMark(mark,end,"interval");
    }
    saveMark(mark,end,kind) {
      try {
        const next=A.add(this.doc,{start:mark.start,end,kind,label:mark.label,subject:mark.subject,track:mark.track});
        const before=this.editSnapshot();this.selected=new Set([next.segments.at(-1).id]);this.draft=null;
        this.pendingLabel=mark.label;this.commit(next,before);
      } catch(error){this.refreshMarkControls();this.toast(error.message);}
    }
    cancelMark(restorePlayback) {
      const mark=this.quickMark;if(!mark)return;
      this.quickMark=null;
      if(restorePlayback && !mark.wasPlaying && mark.source===this.video.source)this.video.pause();
      this.refreshMarkControls();
    }
    openLabelSettings(startAfter, {newAnnotation=false}={}) {
      if(!this.doc || this.quickMark)return;
      if(startAfter){
        const prompt=this.markPrompt=this.markContext();
        if(prompt.wasPlaying){
          this.video.pause();
          if(!this.markIsCurrent(prompt))return;
          this.video.seekVideo(prompt.start,{preserveView:true});
        }
      }
      this.creatingLabel=false;this.libraryPage=0;
      this.markAfterSettings=startAfter;this.settingsName=newAnnotation ? "" : this.markLabel || Object.keys(this.doc.labelColors||{})[0] || "";
      this.renderLabelLibrary();this.labelDialog.showModal();
      this.labelDialog.querySelector(this.settingsName?"[data-settings-select]":"[data-label-new]").focus();
    }
    nameInUse(name) {
      return this.doc.schemes.some(s=>Object.values(s.labels).includes(name)||Object.values(s.mappings).includes(name));
    }
    eventsForLabel(name) {
      return this.doc.segments.filter(seg=>this.doc.schemes.some(s=>A.label(this.doc,seg,s)===name)).sort((a,b)=>a.start-b.start||a.end-b.end);
    }
    canUndoDelete(){return this.history.at(-1)?.operation==="delete";}
    axisSelection(){return [...this.selected].filter(id=>!this.eventTimeline || this.eventTimeline.allowsClip(id));}
    deleteClips(ids,name) {
      if(!ids.length && !name)return;
      this.commit(A.remove(this.doc,ids,name),{...this.editSnapshot(),operation:"delete"});
      if(name===this.markLabel)this.markLabel="";
      if(name===this.pendingLabel)this.pendingLabel="";
      if(this.labelDialog.open)this.renderLabelLibrary();
      this.refreshMarkControls();
    }
    removeLabel() {
      const name=this.settingsName;if(!name)return;
      const ids=this.eventsForLabel(name).map(s=>s.id);
      if(ids.length && !window.confirm(`${tr("deleteLabel")} “${name}” (${ids.length})?\n${tr("acrossSchemes")}`))return;
      this.settingsName="";this.libraryPage=0;this.deleteClips(ids,name);
    }
    renderLabelLibrary(keepPicker=false) {
      const labels=Object.keys(this.doc?.labelColors||{});
      const name=labels.includes(this.settingsName)?this.settingsName:"";
      this.settingsName=name;
      const title=tr(this.markAfterSettings ? "newAnnotation" : "settings");
      const manage=!this.markAfterSettings;
      const events=manage && name ? this.eventsForLabel(name) : [];
      const pages=Math.ceil(events.length/25);
      this.libraryPage=Math.max(0,Math.min(this.libraryPage || 0,pages-1));
      const offset=this.libraryPage*25;
      this.labelDialog.setAttribute("aria-label",title);
      if(!keepPicker){
        this.labelDialog.innerHTML=`<div class="annotation-heading"><strong>${esc(title)}</strong>
        ${manage && this.canUndoDelete()?this.buttonHTML("undo","undoDelete"):""}
        <button data-label-close type="button" aria-label="${esc(tr("closeLibrary"))}">×</button></div>
        <div class="label-library-bar"><span>${esc(tr("pickLabel"))}</span><button type="button" data-label-new>${esc(tr("newName"))}</button></div>
        <select data-settings-select aria-label="${esc(tr("pickLabel"))}" size="${Math.min(7,Math.max(2,labels.length))}" ${labels.length?'':'hidden'}>
          ${labels.map(l=>`<option value="${esc(l)}">${esc(l)}${this.labelKey?.(l)?' · '+esc(this.labelKey(l)):''}</option>`).join("")}</select><div data-library-editor></div>`;
        this.labelDialog.querySelector('[data-settings-select]').value=name;
      }
      const editor=this.labelDialog.querySelector('[data-library-editor]');
      if(!name && !this.creatingLabel){editor.replaceChildren();return;}
      let color=name?A.color(this.doc,name):A.nextLabelColor(this.doc);
      if(color.startsWith("hsl")){
        const ctx=document.createElement("canvas").getContext("2d");
        ctx.fillStyle=color;color=ctx.fillStyle;
      }
      const kind=name?A.labelKind(this.doc,name):this.unassignedMarkKind||"interval";
      editor.innerHTML=`<form class="annotation-name-form">
          <label>${esc(tr("name"))}<input data-label-name value="${esc(name)}" maxlength="200" required placeholder="${esc(tr("labelHint"))}"></label>
          <div class="annotation-color-field"><span>${esc(tr("color"))}</span><input type="color" aria-label="${esc(tr("color"))}" data-label-color value="${esc(color)}"></div>
          <label>${esc(tr("defaultMarkKind"))}<select data-label-kind><option value="interval" ${kind==="interval"?"selected":""}>${esc(tr("intervalLabel"))}</option><option value="point" ${kind==="point"?"selected":""}>${esc(tr("pointLabel"))}</option></select></label>
          ${name && this.nameInUse(name)?`<small>${esc(tr("renameNotice"))}</small>`:""}
          <div class="annotation-settings-actions">${manage && name?`<button data-label-remove type="button">${esc(tr("deleteLabel"))}</button>`:""}
            <button type="submit" data-label-save>${esc(tr("saveName"))}</button>
            ${name?`<button type="button" data-label-use class="annotation-primary">${esc(tr(this.markAfterSettings?(kind==="point"?"markPointNow":"startNamed"):"useName"))}</button>`:""}</div></form>
          ${manage && name?`<section class="annotation-library-events"><strong>${esc(tr("linkedEvents"))} (${events.length})</strong>
            ${events.slice(offset,offset+25).map(s=>`<div><button type="button" data-label-event="${s.start}">${s.start.toFixed(3)}${s.kind==="point"?"":"–"+s.end.toFixed(3)} s · ${esc(s.subject)} / ${esc(s.track)}</button><button type="button" data-delete-clip="${esc(s.id)}" aria-label="${esc(tr("removeEvent"))} ${s.start.toFixed(3)} s">${esc(tr("removeEvent"))}</button></div>`).join("")}
            ${pages>1?`<div><button type="button" data-library-page="-1" ${offset?"":"disabled"}>‹</button><span>${this.libraryPage+1} / ${pages}</span><button type="button" data-library-page="1" ${this.libraryPage+1<pages?"":"disabled"}>›</button></div>`:""}</section>`:""}`;
    }
    saveLabelSettings() {
      const input=this.labelDialog.querySelector("[data-label-name]"), name=input.value.trim(), old=this.settingsName;
      const color=this.labelDialog.querySelector("[data-label-color]"),kind=this.labelDialog.querySelector("[data-label-kind]").value;
      input.setCustomValidity("");
      try {
        if(!name || ["__proto__","constructor","prototype"].includes(name))throw Error(tr("labelHint"));
        if(old!==name && Object.hasOwn(this.doc.labelColors||{},name)){
          throw Error(tr("inUse"));
        } else if(!old)this.commit(A.addLabel(this.doc,name,kind,color.dataset.edited ? color.value : undefined));
        else if(old!==name || color.dataset.edited || kind!==A.labelKind(this.doc,old)){
          const next=A.change(this.doc,d=>{
            if(old!==name){
              d.vocabulary=(d.vocabulary||[]).map(label=>label===old?name:label);
              for(const s of d.schemes)for(const field of ["labels","mappings"])for(const id of Object.keys(s[field])){
                if(s[field][id]===old)s[field][id]=name;
              }
              d.labelColors[name]=d.labelColors[old];delete d.labelColors[old];
              if(d.labelKinds)delete d.labelKinds[old];
            }
            (d.labelKinds||={})[name]=kind;
            if(color.dataset.edited)d.labelColors[name]=color.value;
          });
          this.commit(next);
        }
        if(old && this.markLabel===old){this.markLabel=name;this.labelControls?.selectLabel(name);}
        this.creatingLabel=false;this.settingsName=name;this.renderLabelLibrary();
        this.labelDialog.querySelector('[data-label-use]').focus();
      } catch(error){input.setCustomValidity(error.message);input.reportValidity();}
    }
    useSavedLabel(){
      const name=this.settingsName;
      if(!Object.hasOwn(this.doc?.labelColors||{},name) || this.labelDialog.querySelector('[data-label-use]')?.disabled)return;
      const startAfter=this.markAfterSettings,prompt=this.markPrompt;
      this.markPrompt=null;this.markAfterSettings=false;this.markLabel=name;this.pendingLabel=name;
      this.labelDialog.close();this.labelControls?.selectLabel(name);this.refreshMarkControls();
      if(startAfter)this.toggleMark(prompt);
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
      const fps=this.fps(),frame=Math.floor(time*fps+1e-7);
      const labels = [...new Set((this.doc?.segments || []).filter(s=>(s.kind==="point" ? frame===Math.floor(s.start*fps+1e-7) : time>=s.start && time<s.end) && (!this.activeTrack||JSON.stringify([s.subject,s.track])===this.activeTrack)).map(s=>A.label(this.doc,s)).filter(Boolean))];
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
      if(this.eventTimeline?.usesEditor())return this.eventTimeline.range();
      const total = this.doc?.context.duration || 1;
      if (this.window) return this.window;
      if (!this.getRecording()) return {start:0,end:total};
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
      if (force || this.projectedDoc !== this.doc || this.projectedMapping !== this.video.mapping || this.projectedTrack !== this.activeTrack || this.projectedOpened !== this.opened) {
        this.projectedDoc = this.doc; this.projectedMapping = this.video.mapping; this.projectedTrack = this.activeTrack; this.projectedOpened = this.opened;
        const mapped=A.project(this.doc, this.video.mapping);
        this.onAnnotations(this.activeTrack ? mapped.filter(s=>JSON.stringify([s.subject,s.track])===this.activeTrack) : mapped, mapped);
      }
      this.updateOverlay();
      if(this.eventTimeline && !this.eventTimeline.usesEditor())return;
      if (!this.opened) this.preview.hidden = true;
      if (!this.doc) { this.strip.innerHTML=""; return; }
      this.strip.title=tr(this.doc.segments.length>1000?"limited":"editAxis");
      this.eventTimeline?.updateSelectionActions?.();
      if (!this.eventTimeline) this.strip.hidden = !this.opened && !this.doc.segments.length;
      const range=this.videoRange(), span=Math.max(.001,range.end-range.start);
      const width=Math.max(1,this.strip.clientWidth-24);
      const signature=JSON.stringify([this.activeTrack,width,range,this.doc.updatedAt,this.doc.activeSchemeId,[...this.selected],this.opened,this.timelineExpanded,this.drag?.value]);
      const x=t=>(t-range.start)/span*width;
      if(force||this.timelineSignature!==signature) {
        this.timelineSignature=signature;
        const tracks=availableTracks;
        const clips=this.doc.segments.filter(s=>(!this.activeTrack||JSON.stringify([s.subject,s.track])===this.activeTrack)&&
          (!this.eventTimeline || this.eventTimeline.allowsClip(s.id)) && s.end>=range.start&&s.start<=range.end).slice(0,1000);
        this.visibleClips=clips;
        const height=this.timelineExpanded?126:76;
        const tickCount=Math.max(2,Math.floor(width/100));
        this.strip.classList.toggle("is-expanded",Boolean(this.timelineExpanded));
        this.strip.innerHTML=`${tracks.length>1?`<label class="annotation-track-picker">${esc(tr("subject"))} / ${esc(tr("track"))}<select data-video-track>${tracks.map(t=>`<option value="${esc(t)}" ${t===this.activeTrack?"selected":""}>${esc(JSON.parse(t).join(" / "))}</option>`).join("")}</select></label>`:""}
          ${this.eventTimeline ? "" : `<div class="annotation-video-scale"><strong>${range.start.toFixed(2)}–${range.end.toFixed(2)} s</strong><span>${span.toFixed(2)} s visible</span><button data-range-around>${esc(tr("around"))}</button><button data-range-whole>${esc(tr("whole"))}</button><button data-timeline-expand aria-expanded="${Boolean(this.timelineExpanded)}">${esc(tr(this.timelineExpanded?"collapseTimeline":"expandTimeline"))}</button></div>`}
          <div class="annotation-track-plot"><svg viewBox="0 0 ${width} ${height}" style="height:${height}px" preserveAspectRatio="none" role="group" aria-label="${esc(tr("table"))}">
          <rect class="annotation-track-background" x="0" y="0" width="${width}" height="${height}"/>
          ${Array.from({length:tickCount+1},(_,i)=>`<line class="annotation-tick" x1="${width*i/tickCount}" x2="${width*i/tickCount}" y1="22" y2="${height}"/><text class="annotation-tick-label" x="${Math.max(3,width*i/tickCount-3)}" y="15" text-anchor="${i===0?'start':i===tickCount?'end':'middle'}">${(range.start+span*i/tickCount).toFixed(span<2?3:1)}</text>`).join("")}
          ${this.eventTimeline?`<rect class="annotation-ruler" data-ruler x="0" y="0" width="${width}" height="22"/>`:""}
          ${clips.sort((a,b)=>Number(a.kind==="point")-Number(b.kind==="point")).map(s=>{
            const drag=this.drag?.id===s.id?this.drag:null;
            const start=drag?.values?.start??s.start,end=drag?.values?.end??s.end;
            const left=Math.max(0,x(start)),right=Math.min(width,x(end)),label=A.label(this.doc,s)||this.shortGroup(A.groupKey(this.doc,s));
            const selected=this.selected.has(s.id),handleWidth=Math.min(9,(right-left)/3);
            const handle=(edge,px)=>`<rect data-edge="${edge}" class="annotation-edge" x="${px}" y="27" width="${handleWidth}" height="${height-33}"/>`;
            if(s.kind==="point")return `<g data-point style="--clip-color:${A.color(this.doc,A.label(this.doc,s))}" data-clip="${esc(s.id)}" tabindex="0" role="button" aria-pressed="${selected}" aria-label="${esc(label)} · ${clipTime(s)}" class="${selected?"is-selected":""}" transform="translate(${x(start)} 0)"><path class="annotation-point-hit" d="M0 25V${height-5}"/><path class="annotation-point-pin" d="M0 27l5 5-5 5-5-5z M0 37V${height-7}"/></g>`;
            return `<g style="--clip-color:${A.color(this.doc,A.label(this.doc,s))}" data-clip="${esc(s.id)}" tabindex="0" role="button" aria-pressed="${selected}" aria-label="${esc(label)} ${s.start.toFixed(3)}–${s.end.toFixed(3)}" class="${selected?"is-selected":""} ${A.reviewed(this.doc,s)?"is-reviewed":""}"><rect x="${left}" y="30" width="${Math.max(2,right-left)}" height="${height-39}" rx="3"/>${right-left>70?`<text x="${left+5}" y="${height/2+14}">${esc(label.slice(0,Math.floor((right-left)/8)))}</text>`:""}${selected && start>=range.start?handle("start",left):""}${selected && end<=range.end?handle("end",right-handleWidth):""}</g>`;
          }).join("")}
          <rect data-draft class="annotation-draft" x="0" y="25" width="0" height="${height-29}"/><line data-playhead y1="20" y2="${height}"/></svg></div>
          ${this.eventTimeline ? "" : `<div class="annotation-timeline-footer"><small>${esc(tr("timelineHelp"))}</small><input data-timeline-pan type="range" aria-label="Timeline position" min="0" max="${Math.max(0,this.doc.context.duration-span)}" step="${1/this.fps()}" value="${range.start}" ${span>=this.doc.context.duration?'disabled':''}></div>`}`;
        const picker=this.strip.querySelector("[data-video-track]");if(picker)picker.onchange=()=>{this.activeTrack=picker.value;this.drawTimeline(true);};
        if(!this.eventTimeline){
          this.strip.querySelector("[data-range-around]").onclick=()=>{const at=this.video.currentVideoTime;this.manualWindow=false;this.window={start:Math.max(0,at-5),end:Math.min(this.doc.context.duration,at+5)};this.drawTimeline(true);};
        this.strip.querySelector("[data-range-whole]").onclick=()=>{this.manualWindow=true;this.window={start:0,end:this.doc.context.duration};this.drawTimeline(true);};
        this.strip.querySelector("[data-timeline-expand]").onclick=()=>{this.timelineExpanded=!this.timelineExpanded;this.drawTimeline(true);};
          this.strip.querySelector("[data-timeline-pan]").oninput=e=>{this.manualWindow=true;const start=Number(e.target.value);this.window={start,end:start+span};const pan=e.target;this.drawTimeline();this.strip.querySelector("[data-timeline-pan]").replaceWith(pan);};
        }
      }
      const head=this.strip.querySelector("[data-playhead]"), pos=x(this.video.currentVideoTime);
      head?.setAttribute("x1",pos);head?.setAttribute("x2",pos);
      const draft=this.strip.querySelector("[data-draft]");
      if(draft){const left=x(this.draft?.start??0),right=x(this.draft?.end??this.video.currentVideoTime);draft.setAttribute("x",Math.min(left,right));draft.setAttribute("width",this.draft?Math.abs(right-left):0);}
    }
    focusVideoRange(range) {
      this.window=range;
      const visibleRange=this.neuralInterval(range.start,range.end);
      if(visibleRange)this.setView({visibleRange});
      this.drawTimeline(true);
    }
    select(id, { openEditor = true, preserveWindow = false } = {}) {
      const s = this.doc?.segments.find((v) => v.id === id); if (!s) return;
      this.activeTrack=JSON.stringify([s.subject,s.track]);
      this.selected = new Set([id]); if (openEditor) this.opened = true; this.loop = null; this.draft = null;
      const point=s.kind==="point",interval=this.neuralInterval(s.start,s.end,point);
      const cursor=this.video.mapping.videoToNeural(s.start);
      this.video.pause();
      if (!interval || !Number.isFinite(cursor) || cursor<interval.start) {
        this.setView({selectedInterval:interval});
        this.video.seekVideo(s.start,{preserveView:true});
        if(this.getRecording() && this.video.mapping.method!=="unmapped")this.toast(this.video.t("video.outsideClock"));
        this.render();
        return;
      }
      const {start,end}=interval,padding=Math.max(.5,(end-start)*.2);
      const total = Math.max(.001, Number(this.getRecording().duration || end + padding));
      const minimumSpan = Math.min(.5, total);
      const viewEnd = Math.max(minimumSpan, Math.min(total, end + padding));
      const viewStart = Math.max(0, Math.min(start - padding, viewEnd - minimumSpan));
      let visibleRange={start:viewStart,end:viewEnd};
      if (preserveWindow) {
        const current=this.getView().visibleRange, span=current.end-current.start;
        if (span>0) {
          const left=Math.max(0,Math.min(total-span,start-span/2));
          visibleRange=start>=current.start && start<current.end ? current : {start:left,end:Math.min(total,left+span)};
        }
      }
      this.setView({selectedInterval:point?null:{start,end},cursorTime:start,visibleRange}, {seekVideo:true});
      this.render();
    }
    one() { if (this.selected.size !== 1) throw new Error(tr("selectOne")); return [...this.selected][0]; }
    ids() { if (!this.selected.size) throw new Error(tr("chooseClips")); return [...this.selected]; }
    input(key) { return this.panel.querySelector(`[data-field="${key}"]`); }
    values() {
      const clip=this.selected.size===1?this.doc.segments.find(s=>this.selected.has(s.id)):this.draft;
      const time=key=>!this.reviewMode&&clip?.[key]!=null&&!this.input(key).dataset.edited ? clip[key] : Number(this.input(key).value);
      const start=time("start"),point=clip?.kind==="point";
      return { ...(point?{kind:"point"}:{}),start,end:point?start:time("end"),label:this.input("label").value.trim(),subject:this.input("subject").value.trim(),track:this.input("track").value.trim() };
    }
    async importFile(file) {
      if (!this.doc) throw new Error(tr("importVideoFirst"));
      if (file.size > 50000000) throw new Error(tr("importLimit"));
      const version = this.contextVersion;
      const content = await file.text();
      if (version !== this.contextVersion) return;
      let input;
      try { input = JSON.parse(content); } catch { throw new Error(tr("importFormat")); }
      if (input?.schema === "allen-video-clock/1") throw new Error(tr("importClock"));
      if (input?.schema !== A.SCHEMA && input?.schema !== A.CANDIDATE_SCHEMA) throw new Error(tr("importFormat"));
      const native = input.schema === A.SCHEMA;
      // An explicitly imported label file can follow the same video into a fresh workspace.
      if(native && input.context?.key!==this.key && input.videoFingerprint && this.video.localFile instanceof Blob) {
        const fingerprint=await this.localVideoFingerprint();
        if(version!==this.contextVersion)return;
        if(fingerprint && input.videoFingerprint.algorithm===fingerprint.algorithm && input.videoFingerprint.size===fingerprint.size &&
            input.videoFingerprint.digest===fingerprint.digest) {
          A.validate(input,input.context);
          input.context={...this.doc.context,duration:input.context.duration};
        }
      }
      this.commit(native ? A.validate(input, this.doc.context) : A.importCandidates(this.doc, input));
      this.toast(tr(native ? "loaded" : "imported"));
    }
    async onChange(e) {
      try {
        if (e.target.dataset.featureOption) { this.abort?.abort(); this.featureOptions ||= {}; this.featureOptions[e.target.dataset.featureOption] = e.target.dataset.featureOption === "normalization" ? e.target.value : Number(e.target.value); this.featureOpen = true; }
        if (e.target.hasAttribute("data-feature-file") && e.target.files[0]) await this.processFeatures(e.target.files[0]);
        if (e.target.matches("[data-field=label]") && !this.reviewMode) this.pendingLabel=e.target.value;
        if (e.target.hasAttribute("data-frame-rate")) {
          const fps=Number(e.target.value);if(!Number.isFinite(fps)||fps<1||fps>1000)throw new Error("FPS must be between 1 and 1000");
          this.frameRate=fps; for(const field of this.panel.querySelectorAll("[data-frame]")) field.value=Math.round(Number(this.input(field.dataset.frame).value)*fps);
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
          await this.importFile(e.target.files[0]);
        }
      } catch (error) { this.toast(`${tr("error")}: ${error.message}`); }
    }
    async action(e) {
      const selected = e.target.closest("[data-select]"); if (selected) { this.select(selected.dataset.select); return; }
      const action = e.target.closest("[data-action]")?.dataset.action; if (!action) return;
      try {
        if (action === "close") { this.cancelGesture(); this.abort?.abort(); if (this.reviewMode) this.reviewMode=false; else this.opened = false; this.render(); this.button.focus(); return; }
        if (!this.doc) return;
        if (action === "preview-clip") {
          const clip=this.values(),point=clip.kind==="point";
          if(!Number.isFinite(clip.start)||!Number.isFinite(clip.end)||clip.start<0||(!point&&clip.end<=clip.start)||clip.end>this.doc.context.duration)throw new Error("Choose a valid time inside the video");
          this.previewEnd=point?null:clip.end;
          if(point)this.video.pause();
          this.video.seekVideo(clip.start);
          if(!point)this.video.play();
          return;
        }
        if (action === "cursor-start" || action === "cursor-end") {
          const key=action==='cursor-start'?'start':'end', time=this.video.currentVideoTime;
          if(this.selected.size===1) {
            const id=this.one(),clip=this.doc.segments.find(s=>s.id===id);
            this.commit(A.edit(this.doc,id,clip.kind==="point"?{start:time,end:time}:{[key]:time}));
          }
          else { const draft={...this.draft,[key]:time}; if(draft.end<=draft.start)throw new Error("End must follow start");this.draft=draft;this.syncDraft();this.render(); } return;
        }
        if (action === "review") { this.reviewMode=true; this.render(); return; }
        if (action === "quick-start") { this.selected.clear(); this.draft={start:this.video.currentVideoTime,end:null}; this.render(); return; }
        if (action === "quick-end") { const end=this.video.currentVideoTime; if(!this.draft || end<=this.draft.start)throw new Error("End must follow start"); this.draft={...this.draft,end}; this.video.pause(); this.syncDraft(); this.render(); this.input("label")?.focus(); return; }
        if (action === "quick-new") { this.selected.clear(); this.draft=null; this.previewEnd=null;this.setView({selectedInterval:null});this.render();return; }
        if (action === "quick-save") { const values=this.values(); if(!values.label) {this.input("label").focus();this.toast(tr("chooseLabel"));return;} this.pendingLabel=values.label;
          let next;
          if(this.selected.size===1) {
            const id=this.one(),clip=this.doc.segments.find(s=>s.id===id);
            const delta=Object.fromEntries(Object.entries(values).filter(([key,value])=>key==="label"||clip[key]!==value));
            next=A.assign(A.edit(this.doc,id,delta),[id],values.label,true);
          } else next=A.add(this.doc,values);
          const id=this.selected.size===1?this.one():next.segments.at(-1).id;
          const before=this.editSnapshot();
          this.draft=null;this.selected=new Set([id]);this.commit(next,before);this.select(id);return; }
        if (action === "save") await this.saveAnnotations({saveAs:true});
        if (action === "csv") this.download(A.toCSV(this.doc, this.video.mapping), "annotations.csv", "text/csv");
        if (action === "import") this.panel.querySelector("[data-import]").click();
        if (action === "feature-import") { this.featureOpen = true; this.panel.querySelector("[data-feature-file]").click(); }
        if (action === "feature-export") await this.processFeatures(null);
        if (action === "feature-model-example") {
          const end = Math.min(30, this.doc.context.duration), samples = [];
          for (let start = 0; start < end; start += .5) { const stop = Math.min(end, start + .5); samples.push({ id: `pixel-${samples.length}`, start, end: stop, time: (start + stop) / 2 }); }
          await this.runVideoModel(window.NeuropixelsVideoModels.pixelExample, samples);
        }
        if (action === "undo" || action === "redo") { this.restoreEdit(action==="redo"); return; }
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
        if (action === "remove") this.deleteClips(this.ids());
        if (action === "clear") { this.selected.clear(); this.render(); }
        if (action === "previous" || action === "next") { this.page += action === "next" ? 1 : -1; this.render(); }
        if (action === "page-select") { this.panel.querySelectorAll("[data-check]").forEach((v) => this.selected.add(v.dataset.check)); this.render(); }
        if (action === "loop") { const s = this.doc.segments.find((v) => v.id === this.one()); this.loop = this.loop ? null : { start: s.start, end: s.end }; if (this.loop) { this.video.seekVideo(s.start); this.video.play(); } this.render(); }
        if (action === "run") await this.analyze();
        if (action === "cancel") this.abort?.abort();
      } catch (error) { this.toast(`${tr("error")}: ${error.message}`); }
    }
    async localVideoFingerprint() {
      const file=this.video.localFile,reader=window.NeuropixelsEventAnalysisStorage;
      if(!(file instanceof Blob) || !reader)return null;
      if(this.featureFingerprintCache?.file===file)return this.featureFingerprintCache.value;
      const value=await reader.fingerprint(file);
      if(this.video.localFile!==file)return null;
      this.featureFingerprintCache={file,value};return value;
    }
    async saveAnnotations({saveAs=false}={}) {
      const doc=this.doc,key=this.key;
      if(!doc || this.savingAnnotationFile)return;
      this.savingAnnotationFile=true;
      try {
        this.annotationSaveHandles ||= new Map();
        let handle=this.annotationSaveHandles.get(key);
        const name=doc.context.videoName+".annotations.json";
        if(typeof window.showSaveFilePicker==="function" && (saveAs || !handle)){
          const startIn=handle || this.video.localFile?.sourceHandle;
          handle=await window.showSaveFilePicker({id:"video-annotations",suggestedName:name,...(startIn?{startIn}:{}),
            types:[{description:tr("files"),accept:{"application/json":[".json"]}}]});
        }
        const videoFingerprint=await this.localVideoFingerprint();
        if(this.key!==key || this.doc!==doc)throw new Error(tr("changedDuringSave"));
        const json=JSON.stringify({...doc,...(videoFingerprint?{videoFingerprint}:{}),exportMapping:this.video.mapping.toJSON()},null,2);
        if(!handle){this.download(json,name,"application/json");return;}
        const stream=await handle.createWritable();
        try {await stream.write(json);await stream.close();} catch(error){await stream.abort().catch(()=>{});throw error;}
        this.annotationSaveHandles.set(key,handle);
        this.toast(tr("savedFile")+" · "+handle.name);
      } catch(error){if(error.name!=="AbortError")this.toast(error.message,"error");}
      finally{this.savingAnnotationFile=false;}
    }
    download(content, filename, type) {
      const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    dragStart(e) {
      if(!this.doc || this.gesture || e.button!==0 || e.isPrimary===false || !e.target.closest("svg") || e.target.closest("[data-ruler]"))return;
      this.dragged = false;
      const edge=e.target.closest("[data-edge]")?.dataset.edge;
      const clip=e.target.closest("[data-clip]"),anchor=this.pointerTime(e),field=edge && this.input(edge);
      this.gesture={pointerId:e.pointerId,selection:[...this.selected],draft:this.draft,field,value:field?.value,x:e.clientX,
        source:this.video.source,playing:this.video.playing};
      e.preventDefault();this.video.pause();this.previewEnd=null;
      this.strip.focus({preventScroll:true});this.strip.setPointerCapture(e.pointerId);
      if(clip){this.drag={id:clip.dataset.clip,edge,anchor};return;}
      this.brush={anchor,add:e.ctrlKey||e.metaKey,create:this.opened && (this.eventTimeline ? e.altKey : e.shiftKey)};
      this.draft={start:anchor,end:anchor};
    }
    cancelGesture() {
      const before=this.gesture; if(!before)return;
      this.gesture=null; this.brush=null; this.drag=null; this.dragged=true;
      this.selected=new Set(before.selection); this.draft=before.draft;
      if(before.field)before.field.value=before.value;
      this.preview.hidden=true;
      if(this.strip.hasPointerCapture(before.pointerId))this.strip.releasePointerCapture(before.pointerId);
      if(before.playing && before.source===this.video.source)this.video.play();
      this.drawTimeline(true);
    }
    dragMove(e) {
      if(this.gesture?.pointerId !== e.pointerId || !this.gesture)return;
      if(!this.dragged && Math.abs(e.clientX-this.gesture.x)<3)return;
      if(this.brush) {const t=this.pointerTime(e);this.draft={start:Math.min(t,this.brush.anchor),end:Math.max(t,this.brush.anchor)};this.dragged=true;this.drawTimeline();return;}
      if (!this.drag) return; this.dragged = true;
      const s = this.doc.segments.find((v) => v.id === this.drag.id);
      const time = this.pointerTime(e);
      const d=this.drag,delta=Math.max(-s.start,Math.min(this.doc.context.duration-s.end,time-d.anchor));
      d.values=d.edge==="start"?{start:Math.max(0,Math.min(s.end-.001,time))}:d.edge==="end"?{end:Math.min(this.doc.context.duration,Math.max(s.start+.001,time))}:{start:s.start+delta,end:s.end+delta};
      d.value=time;
      if(d.edge && this.gesture.field)this.gesture.field.value=d.values[d.edge].toFixed(3);
      this.drawTimeline();
    }
    dragEnd(e) {
      if(this.gesture?.pointerId !== e.pointerId || !this.gesture)return;
      const before=this.gesture,brush=this.brush,d=this.drag,moved=this.dragged;
      this.gesture=null;this.brush=null;this.drag=null;this.dragged=true;
      if (this.strip.hasPointerCapture(e.pointerId)) this.strip.releasePointerCapture(e.pointerId);
      if(d){
        if(!moved){this.select(d.id,{openEditor:this.opened,preserveWindow:true});return;}
        const prev=this.editSnapshot();this.selected=new Set([d.id]);this.draft=null;
        try {this.commit(A.edit(this.doc,d.id,d.values),prev);}catch(error){this.toast(error.message);}
        return;
      }
      if(!brush)return;
      const range=this.draft;
      this.selected=new Set(brush.add?before.selection:[]);
      if(moved && !brush.create)for(const seg of this.visibleClips || []){
        if(seg.kind==="point" ? seg.start>=range.start && seg.start<=range.end : seg.start<range.end && seg.end>range.start)this.selected.add(seg.id);
      }
      if(!moved || this.selected.size || !this.opened)this.draft=null;
      if(!moved)this.video.seekVideo(brush.anchor);
      if(this.draft)this.syncDraft();else this.syncSelectedClip();
      this.render();
    }
    pointerTime(e) {const rect=this.strip.querySelector("svg").getBoundingClientRect(),r=this.videoRange();return Math.max(0,Math.min(this.doc.context.duration,Math.round((r.start+Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*(r.end-r.start))*this.fps())/this.fps()));}
    syncDraft() {this.setView({selectedInterval:this.neuralInterval(this.draft.start,this.draft.end)});this.video.seekVideo(this.draft.start);}
    async runVideoModel(model, samples, options = {}) {
      return this.processFeatures(null, { model, samples, options });
    }
    async processFeatures(file, modelRun = null) {
      if (this.abort) return;
      const localFile = this.video.localFile, source = this.video.source, descriptor = source?.descriptor, streamId = descriptor?.video_stream_id, sourceUrl = this.video.elements.video.src, key = this.key;
      const hasBlob = localFile instanceof Blob;
      if (modelRun && !hasBlob) throw new Error("Direct model frames currently require a local file or browser-project video Blob");
      const modelDocument = this.doc, modelMapping = modelRun ? JSON.stringify(this.video.mapping.toJSON()) : null;
      if (!this.doc || !["file", "url"].includes(source?.kind) || (!hasBlob && (source.kind !== "url" || !this.linkedVideoFingerprint))) throw new Error("Attach a local video file or open a selected service-project video before exchanging model features");
      if ((hasBlob ? localFile.size : this.doc.context.videoSize) > 512 * 1024 * 1024) throw new Error("Feature exchange currently supports local videos up to 512 MiB");
      if (file && file.size > F.LIMITS.bytes) throw new Error("Feature file exceeds 25 MB");
      const context = A.clone(this.doc.context), options = { count: 8, minConfidence: .8, normalization: "zscore", seed: 42, ...this.featureOptions };
      const abort = new AbortController(); this.abort = abort; this.featureOpen = true; this.progressText = tr("featureWorking"); this.render();
      const ensure = () => { if (abort.signal.aborted || key !== this.key || localFile !== this.video.localFile || source !== this.video.source || descriptor !== source.descriptor || streamId !== source.descriptor?.video_stream_id || sourceUrl !== this.video.elements.video.src) throw new DOMException("Cancelled", "AbortError"); };
      const ensureModel = () => { ensure(); if (modelRun && (this.doc !== modelDocument || modelMapping !== JSON.stringify(this.video.mapping.toJSON()))) throw new DOMException("Annotations or mapping changed", "AbortError"); };
      let worker, workerUrl;
      try {
        ensure();
        const P = window.NeuropixelsEventAnalysisStorage;
        if (hasBlob) {
          if (this.featureFingerprintCache?.file !== localFile) {
            const value = await P.fingerprint(localFile, abort.signal); ensure();
            this.featureFingerprintCache = { file: localFile, value };
          }
          context.videoFingerprint = this.featureFingerprintCache.value;
        } else {
          context.videoFingerprint = await this.linkedVideoFingerprint(source, context, abort.signal); ensure();
        }
        if (!file && !modelRun) {
          ensure(); const request = F.modelInput(context, this.doc, this.video.mapping.toJSON());
          this.download(JSON.stringify(request, null, 2), "model-input.json", "application/json");
          this.progressText = tr("featureExport"); return;
        }
        const input = modelRun ? await window.NeuropixelsVideoModels.run({
          request: F.modelInput(context, modelDocument, this.video.mapping.toJSON()), file: localFile, model: modelRun.model, samples: modelRun.samples,
          width: modelRun.options.width ?? 160, height: modelRun.options.height ?? 120, signal: abort.signal, ensureCurrent: ensureModel,
          onProgress: ({ completed, total }) => { this.progressText = `${tr("featureWorking")} ${completed}/${total}`; const el = this.panel.querySelector("[data-progress]"); if (el) el.textContent = this.progressText; }
        }) : JSON.parse(await file.text()); ensureModel();
        const asset = F.validate(input, context), assetDigest = await P.digestJSON(asset); ensure();
        workerUrl = URL.createObjectURL(new Blob([F.workerSource()], { type: "text/javascript" })); worker = new Worker(workerUrl);
        const result = await new Promise((resolve, reject) => {
          const stop = () => { worker.terminate(); reject(new DOMException("Cancelled", "AbortError")); };
          abort.signal.addEventListener("abort", stop, { once: true });
          worker.onmessage = event => { abort.signal.removeEventListener("abort", stop); event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result); };
          worker.onerror = error => { abort.signal.removeEventListener("abort", stop); reject(new Error(error.message)); };
          worker.postMessage({ input: asset, context, options });
        });
        ensure();
        ensureModel();
        const runId = crypto.randomUUID?.() || `features-${Date.now()}`;
        const next = A.importCandidates(this.doc, F.candidates(asset, result, runId, assetDigest));
        if (new TextEncoder().encode(JSON.stringify(next)).length > 50000000) throw new Error("Combined annotation sources exceed 50 MB; use a smaller feature asset");
        this.commit(next);
        this.progressText = `${result.groups}/${result.requestedGroups} groups · ${result.segments.length} clips · ${result.sampleIds.length} samples · ${result.excluded.length} excluded · ${result.converged ? "converged" : "iteration limit"} · ${asset.model.name}/${asset.model.version} · ${result.preprocessing.pose.mode} · ${tr("suggested")}`;
        this.toast(tr("imported"));
      } catch (error) {
        if (key === this.key) this.progressText = error.name === "AbortError" ? tr("cancelled") : error.message;
      } finally {
        worker?.terminate(); if (workerUrl) URL.revokeObjectURL(workerUrl);
        if (this.abort === abort) this.abort = null; this.render();
      }
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
          run: { id: runId, method: D.VERSION, version: "4.16.1-beta.1", parameters: { count, minimumDuration, sampleStepSeconds: step, seed: 42 },
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
