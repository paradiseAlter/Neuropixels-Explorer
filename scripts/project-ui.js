// SPDX-License-Identifier: MIT
(() => {
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const copy = {
    open:["Open / add data","打开 / 添加数据","Abrir / añadir datos"], folder:["Open recording folder","打开记录文件夹","Abrir carpeta"],
    folderHelp:["Kilosort results or a folder containing NWB","Kilosort 结果，或包含 NWB 的文件夹","Resultados Kilosort o carpeta con NWB"],
    nwb:["Open Allen NWB","打开 Allen NWB 文件","Abrir Allen NWB"], nwbHelp:["Choose processed neural spikes directly","直接选择已处理的神经放电数据","Seleccionar disparos neuronales procesados"],
    title:["Start with your neural recording","从神经记录开始","Empieza con tu registro neural"],
    intro:["Open your results. Add the matching video wherever it is stored.","打开放电结果，再关联视频。它们可以存放在不同的文件夹。","Abre los resultados y añade el vídeo, esté donde esté."],
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
    enlarge:["Enlarge / restore video","放大 / 还原视频","Ampliar / restaurar vídeo"],
    manual:["Match a known event","对齐一个已知事件","Alinear un evento conocido"],
    follow:["Follow video with the neural cursor","神经光标跟随视频","Seguir el vídeo con el cursor neural"],
    alignmentHelp:["Use the same visible event in the video and neural recording. A manual match does not verify clock drift.","找出视频和神经记录中同一个事件，填写两边的时间。手动对齐不会验证时钟漂移。","Indica el mismo evento en vídeo y registro neural. El ajuste manual no verifica la deriva."],
    videoTime:["Video time (s)","视频时间（秒）","Tiempo del vídeo (s)"], neuralTime:["Neural time (s)","神经记录时间（秒）","Tiempo neural (s)"],
    apply:["Apply alignment","应用对齐","Aplicar alineación"], clock:["Import verified frame clock","导入已验证的帧时间文件","Importar reloj de fotogramas verificado"],
    clockHelp:["Allen clock JSON with video SHA-256 identity","包含视频 SHA-256 校验的 Allen 时钟 JSON","JSON Allen con identidad SHA-256 del vídeo"],
    export:["Export project links","导出项目关联","Exportar enlaces del proyecto"],
    error:["Could not open","未能打开","No se pudo abrir"],
  };
  const tr = key => copy[key]?.[document.documentElement.lang==="zh-CN"?1:document.documentElement.lang==="es"?2:0] || key;
  class ProjectUI {
    constructor({state,video,openCatalog,home,resume,toast,folderFallback}) {
      Object.assign(this,{state,video,openCatalog,home,resume,toast,folderFallback});
      this.projects=[]; this.available=false;
      this.dialog=document.createElement("dialog"); this.dialog.className="project-dialog"; this.dialog.id="project-dialog";
      document.body.append(this.dialog);
      this.dialog.addEventListener("click",e=>{ if(e.target.closest("[data-close-project]")) this.dialog.close(); });
      this.menu=document.getElementById("open-menu");
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
          if(this.available && state.dataMode==="database") { e.stopImmediatePropagation(); this.pick("video",{recordingId:state.activeRecording.databaseId}); }
          else if(id==="replace-video") document.getElementById("video-file-input").click();
        },true);
      }
      document.getElementById("video-alignment").addEventListener("click",()=>this.alignment());
      document.getElementById("expand-video").addEventListener("click",()=>{
        const panel=document.getElementById("experiment-video-region"); panel.classList.toggle("is-enlarged");
        document.getElementById("expand-video").setAttribute("aria-pressed",String(panel.classList.contains("is-enlarged")));
      });
      document.addEventListener("keydown",e=>{if(e.key==="Escape") {document.getElementById("experiment-video-region").classList.remove("is-enlarged");document.getElementById("expand-video").setAttribute("aria-pressed","false");}});
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
      document.getElementById("home-button").title=tr("home");
      this.menu.innerHTML=button("folder","folder")+button("nwb","nwb")+button("home","home")+(this.state.activeRecording?button("addVideo","video")+button("export","export"):"");
      document.getElementById("start-content").innerHTML=`<div class="start-kicker">NEUROPIXELS EXPLORER</div><h1>${esc(tr("title"))}</h1><p>${esc(tr("intro"))}</p><div class="start-actions">${button("folder","folder","folderHelp")}${button("nwb","nwb","nwbHelp")}</div><p class="start-note">${esc(tr(this.available?"sourceNote":"launch"))}</p><div class="recent-projects"><h2>${esc(tr("recent"))}</h2>${this.state.activeRecording?button("return","return"):""}${this.projects.slice(0,6).map(p=>`<button data-project-action="recent" data-id="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>${Object.keys(p.videos).length ? "◉ " : ""}${esc(p.source||p.recordingIds.join(", "))}</span></button>`).join("")}${this.catalogCount?button("catalog","catalog"):""}</div>`;
      for(const [id,key] of [["replace-video","changeVideo"],["choose-local-video","addVideo"],["video-alignment","align"]]) {
        const node=document.getElementById(id); node.removeAttribute("data-i18n"); node.textContent=tr(key);
      }
      const empty=document.getElementById("video-empty");
      empty.querySelector("strong").removeAttribute("data-i18n"); empty.querySelector("strong").textContent=tr("addVideo");
      empty.querySelector("p").removeAttribute("data-i18n"); empty.querySelector("p").textContent=tr("videoHint");
      document.getElementById("expand-video").title=tr("enlarge");
      this.syncVideo();
    }
    syncVideo() {
      document.getElementById("video-link-note").textContent=this.video.source ? tr(this.video.mapping.verificationStatus==="verified"?"synced":"linked") : "";
      document.getElementById("replace-video").hidden=!this.video.source;
      document.getElementById("video-alignment").hidden=!this.video.source;
      document.getElementById("annotation-toggle").disabled=!this.video.source;
    }
    show(html) { this.dialog.innerHTML=`<button type="button" class="dialog-close" data-close-project aria-label="${esc(tr("close"))}">×</button>${html}`; if(!this.dialog.open)this.dialog.showModal(); }
    async action(action,node) {
      try {
        if(["folder","nwb"].includes(action)) return await this.pick(action);
        if(action==="home") {this.video.pause();this.home();this.render();}
        if(action==="return")this.resume();
        if(action==="catalog")await this.openCatalog();
        if(action==="recent") {const p=this.projects.find(p=>p.id===node.dataset.id);if(p)await this.openCatalog(p.recordingIds);}
        if(action==="video")await this.pick("video",{recordingId:this.state.activeRecording?.databaseId});
        if(action==="export") {
          const p=this.projects.find(p=>p.recordingIds.includes(this.state.activeRecording?.databaseId));
          const value={schema:"neuropixels-local-project-links/1",project:p||{recordingIds:[this.state.activeRecording?.databaseId]},note:"Source paths are local to this computer; annotations export separately from the video editor."};
          const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));a.download="recording.links.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
        }
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
        await this.refresh();
        if(result.video) {
          const at=this.video.currentVideoTime;
          this.video.loadUrl(result.video.media_url,result.video);
          if(["clock","mapping"].includes(kind)) this.video.elements.video.addEventListener("loadedmetadata",()=>this.video.seekVideo(at),{once:true});
          return;
        }
        if(result.recordingId) {
          await this.openCatalog([result.recordingId]);
          if(result.nearbyVideos?.length && !this.video.source) this.nearby(result);
        }
      }catch(error){this.failure(error);}finally{this.busy=false;}
    }
    candidates(result) {
      this.show(`<h2>${esc(tr("choose"))}</h2><p>${esc(result.sourceName)} · ${esc(tr("physical"))}</p><div class="source-candidates">${result.candidates.map(c=>`<div><button data-candidate="${esc(c.candidateId)}"><strong>${esc(c.name)}</strong><span>${esc(c.kind.toUpperCase())}${c.units?` · ${c.units} Units`:""}</span></button>${c.kind==="kilosort"&&!c.sampleRate?`<label>${esc(tr("sampling"))}<input type="number" min="1" data-rate="${esc(c.candidateId)}" placeholder="Hz" required></label>`:""}</div>`).join("")}</div>`);
      this.dialog.querySelectorAll("[data-candidate]").forEach(b=>b.addEventListener("click",()=>{
        const field=this.dialog.querySelector(`[data-rate="${b.dataset.candidate}"]`);
        if(field&&!field.reportValidity())return;
        this.pick("import",{candidateId:b.dataset.candidate,sampleRate:field?.value});
      }));
    }
    nearby(result) {
      this.show(`<h2>${esc(tr("nearby"))}</h2><p>${esc(tr("nearbyHelp"))}</p><div class="source-candidates">${result.nearbyVideos.map(v=>`<button data-video-token="${v.token}">${esc(v.name)}</button>`).join("")}</div><button data-close-project>${esc(tr("later"))}</button>`);
      this.dialog.querySelectorAll("[data-video-token]").forEach(b=>b.addEventListener("click",async()=>{
        try{const r=await this.request("/api/local/attach",{recordingId:result.recordingId,token:b.dataset.videoToken});await this.refresh();this.video.loadUrl(r.video.media_url,r.video);this.dialog.close();}catch(e){this.failure(e);}
      }));
    }
    recordingChanged(recording) {
      const id=recording?.databaseId;
      const descriptor=this.projects.find(p=>p.videos[id])?.videos[id];
      if(descriptor) this.video.loadUrl(descriptor.media_url,descriptor);
      this.syncVideo();
    }
    alignment() {
      const local=this.projects.some(p=>p.videos[this.state.activeRecording?.databaseId]);
      this.show(`<h2>${esc(tr("align"))}</h2><p>${esc(tr(this.video.mapping.verificationStatus==="verified"?"synced":"alignmentHelp"))}</p><div class="alignment-fields"><label>${esc(tr("videoTime"))}<input data-video-at type="number" step="0.001" value="${this.video.currentVideoTime.toFixed(3)}"></label><label>${esc(tr("neuralTime"))}<input data-neural-at type="number" step="0.001" value="${Number(this.state.experimentView.cursorTime||0).toFixed(3)}"></label></div><button data-apply-alignment>${esc(tr("apply"))}</button>${local?`<hr><button data-clock>${esc(tr("clock"))}</button><p>${esc(tr("clockHelp"))}</p>`:""}`);
      this.dialog.querySelector("[data-apply-alignment]").addEventListener("click",()=>{
        const videoAt=Number(this.dialog.querySelector("[data-video-at]").value), neuralAt=Number(this.dialog.querySelector("[data-neural-at]").value);
        const offset=neuralAt-videoAt;
        if(!Number.isFinite(offset))return;
        if(local)this.pick("mapping",{recordingId:this.state.activeRecording.databaseId,offset,videoAt,neuralAt});
        else {const field=this.video.elements.offset;field.value=offset;field.dispatchEvent(new Event("change",{bubbles:true}));this.dialog.close();}
      });
      this.dialog.querySelector("[data-clock]")?.addEventListener("click",()=>this.pick("clock",{recordingId:this.state.activeRecording.databaseId}));
      this.dialog.insertAdjacentHTML("beforeend",`<label class="alignment-follow"><input type="checkbox" data-alignment-follow ${this.video.elements.follow.checked?"checked":""}>${esc(tr("follow"))}</label>`);
      this.dialog.querySelector("[data-alignment-follow]").onchange=e=>{this.video.elements.follow.checked=e.target.checked;this.video.elements.follow.dispatchEvent(new Event("change",{bubbles:true}));};
    }
  }
  window.NeuropixelsProjectUI=ProjectUI;
})();
