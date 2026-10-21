// SPDX-License-Identifier: MIT
(() => {
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const copy = {
    newProject:["New project","新建项目","Nuevo proyecto"], openProject:["Open project","打开项目","Abrir proyecto"],
    newHelp:["Neural data, with optional behavior video","神经数据，或神经数据与行为视频","Datos neurales, con vídeo opcional"],
    openHelp:["Restore linked data, alignment and annotations","恢复数据关联、时间对齐和标注","Restaurar datos, alineación y anotaciones"],
    projectName:["Project name","项目名称","Nombre del proyecto"], neural:["Neural data only","只导入神经数据","Solo datos neurales"],
    combined:["Neural data + video","神经数据 + 视频","Datos neurales + vídeo"],
    formats:["Supported inputs","支持的输入格式","Formatos compatibles"],
    kiloFormat:["Kilosort: select the results folder containing spike_times.npy and spike_clusters.npy. Sampling rate comes from params.py; enter it if missing.","Kilosort：选择包含 spike_times.npy 和 spike_clusters.npy 的结果文件夹。采样率自动读取 params.py，缺少时填写。","Kilosort: selecciona la carpeta con spike_times.npy y spike_clusters.npy. La frecuencia se lee de params.py o se introduce."],
    nwbFormat:["Allen Brain ecephys NWB: select a .nwb session file with sorted Units and electrode metadata, then choose a probe.","Allen Brain 电生理 NWB：选择含已分选 Units 和电极信息的会话 .nwb 文件，再选择探针。","Allen Brain ecephys NWB: selecciona un .nwb con Units y electrodos; después elige una sonda."],
    videoFormat:["Video: MP4 / WebM recommended; MOV / AVI / MKV depend on the browser codec. Select the video itself; align its time after linking.","视频：建议 MP4 / WebM；MOV / AVI / MKV 取决于浏览器能否解码。选择视频文件本身，关联后设置时间对齐。","Vídeo: MP4 / WebM recomendados; MOV / AVI / MKV dependen del códec del navegador. Selecciona el vídeo y alinea el tiempo."],
    processed:["This workspace reads sorted spikes; raw acquisition files need spike sorting first.","本界面读取已分选放电结果；原始采集文件需先完成 spike sorting。","Este espacio lee disparos clasificados; los archivos crudos necesitan spike sorting."],
    inspect:["Project files & features","项目文件与功能","Archivos y funciones"], saveProject:["Save project","保存项目","Guardar proyecto"],
    saveAs:["Save project as…","项目另存为…","Guardar proyecto como…"], savedProject:["Project saved","项目已保存","Proyecto guardado"],
    enter:["Continue to workspace","进入工作区","Ir al espacio de trabajo"], ready:["Available","可用","Disponible"], missing:["Not available yet","尚未配置","Aún no disponible"],
    reviewHelp:["Files are matched to the views below. You can start with the available features and add video later.","已按下列功能匹配文件。可以先使用已具备的功能，之后再添加视频。","Los archivos se vinculan a estas funciones. Puedes empezar y añadir vídeo después."],
    saveHelp:["The project file contains links, alignment and annotations. Keep the source data and video in their current locations.","项目文件保存数据引用、时间对齐和标注。原始数据和视频继续保留在当前存储位置。","El proyecto guarda enlaces, alineación y anotaciones. Conserva los datos y vídeos en sus ubicaciones."],
    activity:["Activity / raster / firing rate","活动图 / 放电点阵 / 发放率","Actividad / raster / tasa"],
    spatial:["Interval activity distribution","所选区间的空间活动分布","Distribución espacial del intervalo"],
    template:["Unit template & channel distribution","Unit 模板波形与通道分布","Plantilla y distribución de canales"],
    anatomy:["Brain regions / anatomical grouping","脑区显示 / 解剖分组","Regiones / grupos anatómicos"],
    video:["Video playback / behavior annotation","视频播放 / 行为标注","Vídeo / anotación conductual"],
    alignment:["Neural–video time alignment","神经与视频时间对齐","Alineación neural–vídeo"],
    activityHelp:["spike_times.npy + spike_clusters.npy + sampling rate","spike_times.npy + spike_clusters.npy + 采样率","spike_times.npy + spike_clusters.npy + frecuencia"],
    spatialHelp:["spike_positions.npy, or templates + spike_templates + channel_positions","spike_positions.npy，或 templates + spike_templates + channel_positions","spike_positions.npy, o templates + spike_templates + channel_positions"],
    templateHelp:["Dense templates.npy + spike_templates.npy + channel_positions.npy","稠密 templates.npy + spike_templates.npy + channel_positions.npy","templates.npy denso + spike_templates.npy + channel_positions.npy"],
    anatomyHelp:["Needs Unit region metadata in the catalog / NWB electrodes; channel positions alone do not name brain regions.","需要目录中的 Unit 脑区元数据或 NWB 电极脑区；channel_positions.npy 只提供探针坐标。","Requiere regiones de Units en el catálogo o electrodos NWB; las posiciones solas no identifican regiones."],
    videoHelp:["Add the behavior video corresponding to this recording.","添加与本条神经记录对应的行为视频。","Añade el vídeo correspondiente al registro."],
    alignmentHelpShort:["Import a frame-clock JSON, or align a shared event manually.","导入帧时钟 JSON，或手动对齐两边的同一个事件。","Importa un reloj JSON o alinea un evento común."],
    allen_units:["Matched NWB Units spike times and probe sampling rate","已匹配 NWB Units 放电时间及探针采样率","Tiempos de Units y frecuencia NWB vinculados"],
    allen_electrodes:["Matched NWB peak channels and electrode coordinates","已匹配 NWB 峰值通道与电极坐标","Canales pico y coordenadas NWB vinculados"],
    allen_no_templates:["This Allen import provides spikes and electrode positions, without Kilosort multichannel templates.","这类 Allen 导入提供放电与电极位置，不含 Kilosort 多通道模板。","Esta importación Allen contiene disparos y posiciones, sin plantillas multicanal Kilosort."],
    allen_regions:["Matched NWB electrode region metadata","已匹配 NWB 电极脑区信息","Regiones de electrodos NWB vinculadas"],
    manual_alignment:["A shared event is aligned manually","已手动对齐一个共同事件","Evento común alineado manualmente"],
    verified_clock:["Matched verified frame timestamps","已匹配验证过的逐帧时间","Marcas de fotograma verificadas"],
    linked_video:["Video linked; playback depends on its codec","视频已关联，可播放性取决于编码","Vídeo vinculado; reproducción según códec"],
    missingFiles:["Files not found: ","未找到文件：","Archivos no encontrados: "],
    template_layout:["Template dimensions or channel indexing do not match the supported dense layout.","模板维度或通道索引不符合当前支持的稠密布局。","Las dimensiones o índices no coinciden con la estructura densa compatible."],
    open:["Open / add data","打开 / 添加数据","Abrir / añadir datos"], folder:["Open recording folder","打开记录文件夹","Abrir carpeta"],
    folderHelp:["Kilosort results or a folder containing NWB","Kilosort 结果，或包含 NWB 的文件夹","Resultados Kilosort o carpeta con NWB"],
    nwb:["Open Allen NWB","打开 Allen NWB 文件","Abrir Allen NWB"], nwbHelp:["Choose processed neural spikes directly","直接选择已处理的神经放电数据","Seleccionar disparos neuronales procesados"],
    title:["Open your experiment as a project","以项目组织你的实验","Organiza tu experimento en un proyecto"],
    intro:["Keep neural recordings, behavior video and annotations together.","把神经记录、行为视频和标注放在同一个项目中管理。","Gestiona registros neurales, vídeo y anotaciones juntos."],
    sourceNote:["Your files stay where they are. Project links are saved on this computer.","文件保留在原位置，关联关系会自动保存在这台电脑上。","Los archivos permanecen en su ubicación. Los enlaces se guardan en este equipo."],
    recent:["Recent projects","最近打开","Proyectos recientes"], catalog:["Open available recordings","打开已有记录","Abrir registros disponibles"],
    addVideo:["Add video to this recording","为当前记录添加视频","Añadir vídeo a este registro"], changeVideo:["Change video","更换视频","Cambiar vídeo"],
    videoHint:["Choose a video from any folder","从任意文件夹选择对应视频","Elige un vídeo de cualquier carpeta"],
    align:["Alignment","时间对齐","Alineación"], linked:["Linked · alignment unverified","已关联 · 尚未验证同步","Vinculado · sincronización sin verificar"],
    synced:["Linked · frame clock verified","已关联 · 帧时间已验证","Vinculado · reloj verificado"],
    choose:["Choose a recording","选择要打开的记录","Elige un registro"], physical:["Each physical probe opens as a separate recording.","每支物理探针作为一条独立记录打开。","Cada sonda física se abre como un registro independiente."],
    sampling:["Original sampling rate (Hz)","原始采样率（Hz）","Frecuencia de muestreo original (Hz)"],
    working:["Reading your recording… Large files can take a few minutes.","正在读取记录…大文件可能需要几分钟。","Leyendo el registro… Los archivos grandes pueden tardar unos minutos."],
    picking:["Choose a file in the system window","请在系统窗口中选择文件","Elige un archivo en la ventana del sistema"],
    close:["Close","关闭","Cerrar"], cancel:["Cancel","取消","Cancelar"],
    launch:["For NWB and saved projects, start the app with Start-Explorer.cmd.","请双击 Start-Explorer.cmd 启动，以使用 NWB 导入和项目自动保存。","Inicia con Start-Explorer.cmd para importar NWB y guardar proyectos."],
    nearby:["Video found nearby","发现同目录视频","Vídeo encontrado"], later:["Add video later","稍后添加视频","Añadir vídeo después"],
    nearbyHelp:["Choose the matching view. You can align its time after linking it.","选择与这条记录对应的视频，关联后可对齐时间。","Elige el vídeo correspondiente. Puedes alinear su tiempo después."],
    home:["Start screen","开始界面","Inicio"], return:["Return to recording","返回当前记录","Volver al registro"],
    enlarge:["Enlarge video","放大视频","Ampliar vídeo"],
    restore:["Restore layout","还原布局","Restaurar diseño"],
    manual:["Match a known event","对齐一个已知事件","Alinear un evento conocido"],
    follow:["Follow video with the neural cursor","神经光标跟随视频","Seguir el vídeo con el cursor neural"],
    alignmentHelp:["Use the same visible event in the video and neural recording. A manual match does not verify clock drift.","找出视频和神经记录中同一个事件，填写两边的时间。手动对齐不会验证时钟漂移。","Indica el mismo evento en vídeo y registro neural. El ajuste manual no verifica la deriva."],
    videoTime:["Video time (s)","视频时间（秒）","Tiempo del vídeo (s)"], neuralTime:["Neural time (s)","神经记录时间（秒）","Tiempo neural (s)"],
    apply:["Apply alignment","应用对齐","Aplicar alineación"], clock:["Import verified frame clock","导入已验证的帧时间文件","Importar reloj de fotogramas verificado"],
    clockHelp:["Allen clock JSON with video SHA-256 identity","包含视频 SHA-256 校验的 Allen 时钟 JSON","JSON Allen con identidad SHA-256 del vídeo"],
    error:["Could not open","未能打开","No se pudo abrir"],
  };
  const tr = key => copy[key]?.[document.documentElement.lang==="zh-CN"?1:document.documentElement.lang==="es"?2:0] || key;
  class ProjectUI {
    constructor({state,video,annotations,openCatalog,home,resume,toast,folderFallback,onVideoExpand}) {
      Object.assign(this,{state,video,annotations,openCatalog,home,resume,toast,folderFallback,onVideoExpand});
      this.browserStore=annotations.store;
      annotations.onSaveProject=()=>this.action("save-project");
      this.projects=[]; this.available=false;
      this.dialog=document.createElement("dialog"); this.dialog.className="project-dialog"; this.dialog.id="project-dialog";
      document.body.append(this.dialog);
      this.dialog.addEventListener("click",e=>{ if(e.target.closest("[data-close-project]")) this.dialog.close(); });
      this.menu=document.getElementById("open-menu");
      this.saveButton=document.createElement("button");this.saveButton.type="button";this.saveButton.id="save-project-button";this.saveButton.dataset.projectAction="save-project";
      document.querySelector(".open-control").after(this.saveButton);
      document.getElementById("open-folder-button").addEventListener("click",()=>this.toggleMenu());
      document.getElementById("home-button").addEventListener("click",()=>{video.pause();home();this.render();});
      document.addEventListener("click",e=>{
        const action=e.target.closest("[data-project-action]")?.dataset.projectAction;
        if(action) { this.toggleMenu(false); this.action(action,e.target.closest("[data-project-action]")); }
        if(!e.target.closest(".open-control")) this.toggleMenu(false);
      });
      document.addEventListener("keydown",e=>{if(e.key==="Escape")this.toggleMenu(false);});
      for(const id of ["replace-video","choose-local-video"]) {
        document.getElementById(id).addEventListener("click",e=>{
          if(this.available && state.dataMode==="database") { e.stopImmediatePropagation(); this.action("video"); }
          else if(id==="replace-video") document.getElementById("video-file-input").click();
        },true);
      }
      document.getElementById("video-alignment").addEventListener("click",()=>this.alignment());
      document.getElementById("data-status-button").addEventListener("click",e=>{
        if(this.active){e.stopImmediatePropagation();this.action("inspect");}
      },true);
      document.getElementById("expand-video").addEventListener("click",()=>{ this.onVideoExpand(); this.renderVideoExpand(); });
      document.addEventListener("keydown",e=>{
        if(e.key==="Escape" && !e.defaultPrevented && !document.querySelector("dialog[open]")) { this.onVideoExpand(false); this.renderVideoExpand(); }
      });
      new MutationObserver(()=>this.render()).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
      this.render(); this.refresh(true);
    }
    async request(path,body) {
      const r=await fetch(path,body ? {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)} : {cache:"no-store"});
      const value=await r.json(); if(!r.ok) throw new Error(value.message||value.error||r.statusText); return value;
    }
    async refresh(restore=false) {
      if(!["http:","https:"].includes(location.protocol)) return;
      try { this.projects=(await this.request("/api/local/projects")).projects; this.available=true;
        const c=await this.request("/api/catalog"); this.catalogCount=c.recordings?.length||0;
      } catch { this.available=false; }
      this.render();
      if(restore&&this.state.activeRecording)this.recordingChanged(this.state.activeRecording);
    }
    toggleMenu(value=this.menu.hidden) { this.menu.hidden=!value; document.getElementById("open-folder-button").setAttribute("aria-expanded",String(value)); if(value)this.menu.querySelector("button")?.focus(); }
    render() {
      const button=(key,action,sub="")=>`<button type="button" data-project-action="${action}"><strong>${esc(tr(key))}</strong>${sub?`<span>${esc(tr(sub))}</span>`:""}</button>`;
      document.getElementById("open-folder-button").textContent=tr("open");
      this.saveButton.textContent=tr("saveProject");this.saveButton.hidden=!this.state.activeRecording;
      const status=document.getElementById("data-status-summary");
      if(this.active){status.removeAttribute("data-i18n");status.textContent=tr("inspect");}
      document.getElementById("home-button").title=tr("home");
      this.menu.innerHTML=button("newProject","new")+button("openProject","open-project")+button("home","home")+(this.state.activeRecording?button("inspect","inspect")+button("addVideo","video")+button("saveProject","save-project")+button("saveAs","save-as"):"");
      document.getElementById("start-content").innerHTML=`<div class="start-kicker">NEUROPIXELS EXPLORER</div><h1>${esc(tr("title"))}</h1><p>${esc(tr("intro"))}</p><div class="start-actions">${button("newProject","new","newHelp")}${button("openProject","open-project","openHelp")}</div><p class="start-note">${esc(tr(this.available?"saveHelp":"launch"))}</p><div class="recent-projects"><h2>${esc(tr("recent"))}</h2>${this.state.activeRecording?button("return","return"):""}${this.projects.slice(0,6).map(p=>`<button data-project-action="recent" data-id="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>${Object.keys(p.videos).length ? "◉ " : ""}${esc(p.file||p.source||p.recordingIds.join(", "))}</span></button>`).join("")}${this.catalogCount?button("catalog","catalog"):""}</div>`;
      for(const [id,key] of [["replace-video","changeVideo"],["choose-local-video","addVideo"],["video-alignment","align"]]) {
        const node=document.getElementById(id); node.removeAttribute("data-i18n"); node.textContent=tr(key);
      }
      const empty=document.getElementById("video-empty");
      empty.querySelector("strong").removeAttribute("data-i18n"); empty.querySelector("strong").textContent=tr("addVideo");
      empty.querySelector("p").removeAttribute("data-i18n"); empty.querySelector("p").textContent=tr("videoHint");
      this.renderVideoExpand();
      this.syncVideo();
    }
    renderVideoExpand() {
      const button = document.getElementById("expand-video");
      button.textContent = tr(this.state.videoEnlarged ? "restore" : "enlarge");
      button.title = button.textContent;
    }
    syncVideo() {
      document.getElementById("video-link-note").textContent=this.video.source ? tr(this.video.mapping.verificationStatus==="verified"?"synced":"linked") : "";
      document.getElementById("replace-video").hidden=!this.video.source;
      document.getElementById("video-alignment").hidden=!this.video.source;
      document.getElementById("annotation-toggle").disabled=!this.video.source;
    }
    show(html) { this.dialog.innerHTML=`<button type="button" class="dialog-close" data-close-project aria-label="${esc(tr("close"))}">×</button>${html}`; if(!this.dialog.open)this.dialog.showModal(); }
    newProject() {
      this.creation=null;
      this.show(`<h2>${esc(tr("newProject"))}</h2><form class="project-create"><label class="project-name">${esc(tr("projectName"))}<input name="projectName" required maxlength="200" placeholder="Experiment 01" autocomplete="off"></label><fieldset class="project-modes"><legend>${esc(tr("newHelp"))}</legend><label><input type="radio" name="mode" value="neural" checked>${esc(tr("neural"))}</label><label><input type="radio" name="mode" value="combined">${esc(tr("combined"))}</label></fieldset><h3>${esc(tr("formats"))}</h3><div class="project-format"><strong>Kilosort</strong><p>${esc(tr("kiloFormat"))}</p><button type="submit" value="folder">${esc(tr("folder"))}</button></div><div class="project-format"><strong>Allen Brain · NWB</strong><p>${esc(tr("nwbFormat"))}</p><button type="submit" value="nwb">${esc(tr("nwb"))}</button></div><p>${esc(tr("videoFormat"))}</p><small>${esc(tr("processed"))}</small></form>`);
      const form=this.dialog.querySelector("form");
      form.onsubmit=e=>{e.preventDefault();this.creation={projectName:form.elements.projectName.value.trim(),mode:form.elements.mode.value};if(this.creation.projectName)this.pick(e.submitter.value);};
    }
    async activate(project) {
      await this.annotations.flush();
      this.video.pause();
      // Clear the old source before switching draft stores, including same-recording projects.
      this.video.setRecording(null,[]);
      this.active=project;
      const id=project?.id;
      await this.annotations.useStore(id ? {request:async(key,document)=>{
        const result=await this.request("/api/local/annotations",{projectId:id,key,...(document?{document}:{})});
        if(document&&this.active?.id===id)this.active.dirty=true;
        return result.document;
      }} : this.browserStore);
    }
    async ensureProject() {
      const rid=this.state.activeRecording?.databaseId;
      if(!rid)throw new Error(tr("launch"));
      if(this.active?.recordingIds.includes(rid))return;
      const result=await this.request("/api/local/adopt",{recordingId:rid});
      // Preserve a pre-existing browser draft when adopting a catalog recording.
      const draft=this.annotations.doc;
      await this.activate(result.project);
      if(draft)await this.request("/api/local/annotations",{projectId:this.active.id,key:draft.context.key,document:draft});
      await this.openCatalog([rid]);
      await this.refresh();
    }
    async inspect(nearby=[]) {
      await this.ensureProject();
      const result=await this.request("/api/local/checks",{projectId:this.active.id,recordingId:this.state.activeRecording.databaseId});
      const help={activity:"activityHelp",spatial:"spatialHelp",template:"templateHelp",anatomy:"anatomyHelp",video:"videoHelp",alignment:"alignmentHelpShort"};
      this.show(`<h2>${esc(this.active.name)}</h2><p>${esc(tr("reviewHelp"))}</p><table class="project-checks"><caption>${esc(tr("inspect"))}</caption><tbody>${result.checks.map(c=>`<tr><td class="check-symbol" data-ready="${c.ready}" aria-label="${esc(tr(c.ready?"ready":"missing"))}">${c.ready?"✓":"×"}</td><td><strong>${esc(tr(c.key))}</strong><small>${esc(tr(c.detail||help[c.key]))}</small>${!c.ready&&c.missingFiles?.length?`<small>${esc(tr("missingFiles")+c.missingFiles.join(", "))}</small>`:""}${Object.keys(c.issues).length?`<small class="project-link-issue">${esc(Object.values(c.issues).join(" · "))}</small>`:""}</td></tr>`).join("")}</tbody></table>${nearby.length?`<details open><summary>${esc(tr("nearby"))}</summary><div class="source-candidates">${nearby.map(v=>`<button data-video-token="${esc(v.token)}">${esc(v.name)}</button>`).join("")}</div></details>`:""}<details><summary>${esc(tr("formats"))}</summary><p>${esc(tr("kiloFormat"))}</p><p>${esc(tr("nwbFormat"))}</p><p>${esc(tr("videoFormat"))}</p><p class="matched-files">${esc(Object.values(result.matched).join(" · "))}</p></details><p>${esc(tr("saveHelp"))}</p><div class="project-footer"><button data-project-action="video">${esc(tr("addVideo"))}</button><button data-project-action="save-project">${esc(tr("saveProject"))}</button><button class="project-primary" data-close-project>${esc(tr("enter"))}</button></div>`);
      this.dialog.querySelectorAll("[data-video-token]").forEach(b=>b.onclick=async()=>{
        try{const r=await this.request("/api/local/attach",{projectId:this.active.id,recordingId:this.state.activeRecording.databaseId,token:b.dataset.videoToken});this.active=r.project;await this.refresh();this.video.loadUrl(r.video.media_url,r.video);await this.inspect();}catch(e){this.failure(e);}
      });
    }
    async action(action,node) {
      try {
        if(action==="new")return this.newProject();
        if(action==="open-project"){await this.annotations.flush();return await this.pick(action);}
        if(action==="inspect")return await this.inspect();
        if(action==="save-project"||action==="save-as") {
          await this.ensureProject();await this.annotations.flush();
          return await this.pick("save-project",{projectId:this.active.id,saveAs:action==="save-as"});
        }
        if(["folder","nwb"].includes(action)) return await this.pick(action);
        if(action==="home") {this.video.pause();this.home();this.render();}
        if(action==="return")this.resume();
        if(action==="catalog"){await this.activate(null);await this.openCatalog();}
        if(action==="recent") {const p=this.projects.find(p=>p.id===node.dataset.id);if(p){await this.activate(p);await this.openCatalog(p.recordingIds);await this.inspect();}}
        if(action==="video"){await this.ensureProject();await this.annotations.flush();await this.pick("video",{projectId:this.active.id,recordingId:this.state.activeRecording?.databaseId});}
      }catch(e){this.failure(e);}
    }
    failure(error) { this.show(`<h2>${esc(tr("error"))}</h2><p role="alert">${esc(error.message)}</p>`); }
    async pick(kind,payload={}) {
      if(!this.available) {
        if(kind==="folder")this.folderFallback();
        else this.show(`<p>${esc(tr("launch"))}</p>`);
        return;
      }
      if(this.busy)return;
      this.busy=true;
      try {
        this.show(`<h2>${esc(tr(["import","mapping"].includes(kind)?"working":"picking"))}</h2><div class="project-progress" role="progressbar"></div>`);
        let job=await this.request("/api/local/actions",{kind,...payload});
        while(job.status==="working") {await new Promise(r=>setTimeout(r,500));job=await this.request("/api/local/jobs/"+job.id);}
        if(job.status==="error")throw new Error(job.message);
        this.dialog.close();
        if(job.status==="cancelled")return;
        const result=job.result;
        if(result.candidates) {this.candidates(result);return;}
        if(result.saved){this.active=result.project;await this.refresh();this.toast(tr("savedProject")+" · "+result.project.file);return;}
        if(result.opened){this.annotations.doc=null;this.annotations.key=null;}
        if(result.project)this.active=result.project;
        await this.refresh();
        if(result.video) {
          const at=this.video.currentVideoTime;
          this.video.loadUrl(result.video.media_url,result.video);
          if(["clock","mapping"].includes(kind)) this.video.elements.video.addEventListener("loadedmetadata",()=>this.video.seekVideo(at),{once:true});
          if(kind==="video")await this.inspect();
          return;
        }
        if(result.recordingId) {
          await this.activate(result.project);
          await this.openCatalog([result.recordingId]);
          await this.inspect(result.project.mode==="combined"?result.nearbyVideos||[]:[]);
        }
      }catch(error){this.failure(error);}finally{this.busy=false;}
    }
    candidates(result) {
      this.show(`<h2>${esc(tr("choose"))}</h2><p>${esc(result.sourceName)} · ${esc(tr("physical"))}</p><div class="source-candidates">${result.candidates.map(c=>`<div><button data-candidate="${esc(c.candidateId)}"><strong>${esc(c.name)}</strong><span>${esc(c.kind.toUpperCase())}${c.units?` · ${c.units} Units`:""}</span></button>${c.kind==="kilosort"&&!c.sampleRate?`<label>${esc(tr("sampling"))}<input type="number" min="1" data-rate="${esc(c.candidateId)}" placeholder="Hz" required></label>`:""}</div>`).join("")}</div>`);
      this.dialog.querySelectorAll("[data-candidate]").forEach(b=>b.addEventListener("click",()=>{
        const field=this.dialog.querySelector(`[data-rate="${b.dataset.candidate}"]`);
        if(field&&!field.reportValidity())return;
        this.pick("import",{candidateId:b.dataset.candidate,sampleRate:field?.value,...this.creation});
      }));
    }
    recordingChanged(recording) {
      const id=recording?.databaseId;
      const descriptor=this.active?.recordingIds.includes(id)?this.active.videos[id]:null;
      if(descriptor) this.video.loadUrl(descriptor.media_url,descriptor);
      this.render();
      if(this.active?.recordingIds.includes(id))document.getElementById("dataset-title").textContent=this.active.name;
      this.saveButton.hidden=!recording;
      this.syncVideo();
    }
    alignment() {
      const local=Boolean(this.active?.videos[this.state.activeRecording?.databaseId]);
      this.show(`<h2>${esc(tr("align"))}</h2><p>${esc(tr(this.video.mapping.verificationStatus==="verified"?"synced":"alignmentHelp"))}</p><div class="alignment-fields"><label>${esc(tr("videoTime"))}<input data-video-at type="number" step="0.001" value="${this.video.currentVideoTime.toFixed(3)}"></label><label>${esc(tr("neuralTime"))}<input data-neural-at type="number" step="0.001" value="${Number(this.state.experimentView.cursorTime||0).toFixed(3)}"></label></div><button data-apply-alignment>${esc(tr("apply"))}</button>${local?`<hr><button data-clock>${esc(tr("clock"))}</button><p>${esc(tr("clockHelp"))}</p>`:""}`);
      this.dialog.querySelector("[data-apply-alignment]").addEventListener("click",()=>{
        const videoAt=Number(this.dialog.querySelector("[data-video-at]").value), neuralAt=Number(this.dialog.querySelector("[data-neural-at]").value);
        const offset=neuralAt-videoAt;
        if(!Number.isFinite(offset))return;
        if(local)this.pick("mapping",{projectId:this.active.id,recordingId:this.state.activeRecording.databaseId,offset,videoAt,neuralAt});
        else {const field=this.video.elements.offset;field.value=offset;field.dispatchEvent(new Event("change",{bubbles:true}));this.dialog.close();}
      });
      this.dialog.querySelector("[data-clock]")?.addEventListener("click",()=>this.pick("clock",{projectId:this.active.id,recordingId:this.state.activeRecording.databaseId}));
      this.dialog.insertAdjacentHTML("beforeend",`<label class="alignment-follow"><input type="checkbox" data-alignment-follow ${this.video.elements.follow.checked?"checked":""}>${esc(tr("follow"))}</label>`);
      this.dialog.querySelector("[data-alignment-follow]").onchange=e=>{this.video.elements.follow.checked=e.target.checked;this.video.elements.follow.dispatchEvent(new Event("change",{bubbles:true}));};
    }
  }
  window.NeuropixelsProjectUI=ProjectUI;
})();
