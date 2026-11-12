// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const S = window.NeuropixelsBrowserStorage, core = window.NeuropixelExplorerCore;
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fileFrom = a => {const f=new File([a.blob],a.name,{type:a.type||'',lastModified:a.lastModified||0});Object.defineProperty(f,'relativePath',{value:a.path});return f;};
  const assetFrom = f => ({name:f.name,path:core.pathOf(f),type:f.type,lastModified:f.lastModified,blob:f});
  class BrowserProjectUI extends window.NeuropixelsProjectUI {
    constructor(options) {
      super(options); this.openFiles=options.openFiles; this.browserLocal=true;
      this.store ||= new S.ProjectStore();
      // All entry points, including drag/drop, pass through project import.
      const folder = document.getElementById('folder-input');
      folder?.addEventListener('change',e=>{e.stopImmediatePropagation();this.importFolder([...folder.files]).catch(e=>this.failure(e));},true);
    }
    async refresh() {
      this.store ||= new S.ProjectStore();
      try {this.projects=(await this.store.request('projects')).sort((a,b)=>b.updated-a.updated);this.available=true;}catch(e){this.available=false;this.toast('浏览器缓存不可用：'+e.message);}
      this.render();
    }
    selectFiles({directory=false,accept=''}={}) {
      return new Promise(resolve=>{
        const input=document.createElement('input');input.type='file';input.accept=accept;
        if(directory){input.webkitdirectory=true;input.multiple=true;}
        input.style.display='none';document.body.append(input);
        input.onchange=()=>{const files=[...input.files];input.remove();resolve(files);};
        input.oncancel=()=>{input.remove();resolve([]);}; input.click();
      });
    }
    async activate(project) {
      await this.annotations.flush(); this.video.setRecording(null,[]);
      if(this.videoUrl){URL.revokeObjectURL(this.videoUrl);this.videoUrl=null;}
      this.active=project;this.loadedVideoKey=null;
      const id=project.id;
      this.documents=await this.store.request('annotations',id)||{};
      const documents=this.documents;
      await this.annotations.useStore({request:async(key,doc)=>{
        if(doc!==undefined){documents[key]=doc;await this.store.request('annotations',id,documents);}
        return documents[key]||null;
      }});
    }
    async openCached(project) {
      const assets=await this.store.request('assets',project.id);
      if(!assets?.length)throw new Error('此项目的缓存文件已被清理，请打开导出的 .neuroproject 项目包。');
      await this.activate(project);this.assets=assets;
      await this.openFiles(assets.filter(a=>a.role!=='video'&&a.role!=='event-analysis').map(fileFrom));
      this.dialog.close();this.render();
    }
    async create(files,source={}) {
      const groups=core.groupExperimentFiles(files);
      if(!groups.length)throw new Error('未找到 spike_times.npy 和 spike_clusters.npy，请选择 Kilosort 结果文件夹。');
      await Promise.all(groups.map(g=>core.indexExperiment(g)));
      const id=crypto.randomUUID(), project={id,name:this.creation?.projectName||groups[0].name,mode:this.creation?.mode||'neural',recordingIds:groups.map(g=>g.key),videos:{},source:source.label||'浏览器本地项目',...source,updated:Date.now()};
      const assets=files.map(assetFrom);
      this.show('<h2>正在缓存项目…</h2><p>完成后可从“最近打开”恢复数据、视频和标注。</p>');
      await this.store.create(project,assets);
      await navigator.storage?.persist?.().catch(()=>false);
      this.creation=null;await this.openCached(project);await this.refresh();await this.inspect();
    }
    async importFolder(files) {
      files=files.filter(f=>core.USEFUL_NAMES.has(core.fileNameOf(f)) || /\.(csv|tsv)$/i.test(f.name) || f.name==='explorer-units.json');
      const groups=core.groupExperimentFiles(files), missing=groups.filter(g=>!g.byName.has('params.py'));
      if(missing.length){
        this.show('<h2>填写原始采样率</h2><p>未找到 params.py；请填写采集系统的采样率。</p><form data-rate-form><input name="rate" type="number" min="1" required placeholder="Hz"><button>继续导入</button></form>');
        this.dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const rate=Number(e.target.elements.rate.value);for(const g of missing){const f=new File([`sample_rate = ${rate}\n`],'params.py');Object.defineProperty(f,'relativePath',{value:`${g.key}/params.py`});files.push(f);}this.create(files).catch(e=>this.failure(e));};return;
      }
      await this.create(files);
    }
    async readNwb(file,probe) {
      this.show('<h2>读取 Allen NWB</h2><p data-nwb-progress>正在读取电极表与 Unit 信息…</p>');
      const url=URL.createObjectURL(new Blob([window.NeuropixelsNwbWorkerSource],{type:'text/javascript'}));
      const worker=new Worker(url);
      try {return await new Promise((resolve,reject)=>{
        worker.onmessage=({data})=>{if(data.progress){const p=this.dialog.querySelector('[data-nwb-progress]');if(p)p.textContent=data.progress;}else if(data.error)reject(new Error(data.error));else resolve(data);};
        worker.onerror=e=>reject(new Error(e.message));worker.postMessage({file,probe});
      });}finally{worker.terminate();URL.revokeObjectURL(url);}
    }
    async importNwb(file,probe) {
      const result=await this.readNwb(file,probe);
      if(result.candidates){this.show(`<h2>选择物理探针</h2><p>${esc(file.name)}</p><div class="source-candidates">${result.candidates.map(c=>`<button data-browser-probe="${esc(c.name)}">${esc(c.name)} · ${c.units} Units</button>`).join('')}</div>`);
        this.dialog.querySelectorAll('[data-browser-probe]').forEach(b=>b.onclick=()=>this.importNwb(file,b.dataset.browserProbe).catch(e=>this.failure(e)));return;}
      const files=result.files.map(a=>{const f=new File([a.data],a.name,{lastModified:file.lastModified});Object.defineProperty(f,'relativePath',{value:a.path});return f;});
      await this.create(files,{label:`Allen ${result.session} · ${result.probe}`,session:result.session,sourceNwb:{name:file.name,size:file.size,lastModified:file.lastModified},probe:result.probe});
    }
    async ensureProject() {if(!this.active)throw new Error('请先新建或打开项目。');}
    async inspect() {
      await this.ensureProject();const r=this.state.activeRecording;if(!r)return;
      const has=name=>r.byName.has(name), v=this.active.videos[r.key];
      const checks=[
        ['神经活动 / 点阵 / 发放率',has('spike_times.npy')&&has('spike_clusters.npy'),'spike_times.npy + spike_clusters.npy + 采样率'],
        ['所选区间的空间活动分布',!!r.units?.length||has('spike_positions.npy')||(has('templates.npy')&&has('spike_templates.npy')&&has('channel_positions.npy')),'Unit 电极坐标、spike_positions.npy 或模板与通道坐标'],
        ['Unit 模板与通道分布',has('templates.npy')&&has('spike_templates.npy')&&has('channel_positions.npy'),this.active.session?'Allen Units 与电极信息中没有 Kilosort 多通道模板。':'templates.npy + spike_templates.npy + channel_positions.npy；具体布局在选中 Unit 后检查'],
        ['脑区分组',!!r.units?.some(u=>u.brain_region)||!!this.state.regionResult?.count,'Allen 电极脑区，或 Unit 脑区表'],
        ['视频 / 行为标注',!!v,'为当前记录选择对应的 MP4 / WebM 视频'],
        ['时间对齐',!!v?.timeMapping,'导入匹配的 Allen 帧时钟，或手动对齐一个共同事件']
      ];
      const persisted=await navigator.storage?.persisted?.();
      this.show(`<h2>${esc(this.active.name)}</h2><p>已按功能自动匹配文件。</p><table class="project-checks"><tbody>${checks.map(([name,ok,detail])=>`<tr><td class="check-symbol" data-ready="${ok}">${ok?'✓':'×'}</td><td><strong>${name}</strong><small>${esc(detail)}</small></td></tr>`).join('')}</tbody></table><p>项目已缓存于此浏览器${persisted?'（已获得持久存储）':''}。保存项目可导出包含数据、视频、对齐和标注的项目包；清理网站数据后可用它恢复。</p><div class="project-footer"><button data-project-action="video">添加视频</button><button data-project-action="save-project">导出项目包</button><button data-close-project class="project-primary">进入工作区</button></div>`);
    }
    async action(action,node) {
      try {
        if(action==='recent'){const p=this.projects.find(p=>p.id===node.dataset.id);if(p)await this.openCached(p);return;}
        if(action==='save-project'||action==='save-as'){await this.exportProject();return;}
        return await super.action(action,node);
      }catch(e){this.failure(e);}
    }
    async pick(kind) {
      try {
        if(kind==='folder'){const files=await this.selectFiles({directory:true});if(files.length)await this.importFolder(files);}
        if(kind==='nwb'){const [f]=await this.selectFiles({accept:'.nwb'});if(f)await this.importNwb(f);}
        if(kind==='video'){
          const [f]=await this.selectFiles({accept:'.mp4,.webm,.mov,.avi,.mkv'});if(!f)return;
          await this.annotations.flush();const r=this.state.activeRecording;
          const key=`video:${r.key}`, assets=this.assets.filter(a=>a.path!==key);
          assets.push({...assetFrom(f),path:key,role:'video'});
          const project=structuredClone(this.active);project.videos[r.key]={asset:key,video_name:f.name,byte_size:f.size};project.updated=Date.now();
          await this.store.create(project,assets,this.documents);this.assets=assets;this.active=project;this.loadedVideoKey=null;this.recordingChanged(r);this.dialog.close();await this.refresh();
        }
        if(kind==='open-project'){
          const [file]=await this.selectFiles({accept:'.neuroproject'});if(!file)return;
          this.show('<h2>正在打开项目包…</h2>');const unpacked=await S.unpack(file);
          // Imported copies get a new identity; existing cached projects are preserved.
          unpacked.project.id=crypto.randomUUID();unpacked.project.updated=Date.now();
          await this.store.create(unpacked.project,unpacked.assets,unpacked.annotations);await this.openCached(unpacked.project);await this.refresh();
        }
      }catch(e){this.failure(e);}
    }
    recordingChanged(recording) {
      const descriptor=this.active?.videos[recording?.key], key=descriptor?`${this.active.id}:${descriptor.asset}`:null;
      if(key && this.loadedVideoKey!==key){
        const asset=this.assets?.find(a=>a.path===descriptor.asset);if(asset){
          if(this.videoUrl)URL.revokeObjectURL(this.videoUrl);this.videoUrl=URL.createObjectURL(asset.blob);this.loadedVideoKey=key;
          this.video.loadUrl(this.videoUrl,descriptor,{localFile:asset.blob});
        }
      }else if(!descriptor)this.loadedVideoKey=null;
      if(this.active)document.getElementById('dataset-title').textContent=this.active.name;
      this.render();
    }
    async exportProject() {
      await this.ensureProject();await this.annotations.flush();
      const blob=S.pack(this.active,this.assets,this.documents),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=this.active.name.replace(/[<>:"/\\|?*]/g,'_')+'.neuroproject';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
      this.toast('已导出项目包 · 包含神经数据、视频、对齐与标注');
    }
    getEventAnalysis(recording) {
      if(!this.active||!recording)return null;
      const matches=(this.assets||[]).filter(a=>a.role==='event-analysis'&&a.recordingId===recording.key);
      if(matches.length>1)throw new Error('Project contains ambiguous saved analyses for this Recording');
      return matches[0]?.blob||null;
    }
    async saveEventAnalysis(recording,blob) {
      await this.ensureProject();const id=this.active.id,key=recording.key;
      if(this.state.activeRecording!==recording)throw new Error('Recording changed before analysis save');
      await this.annotations.flush();
      if(this.active?.id!==id||this.state.activeRecording!==recording)throw new Error('Project changed before analysis save');
      const asset={path:`analyses/event-response/${encodeURIComponent(key)}.neuroanalysis`,name:'event-response.neuroanalysis',role:'event-analysis',recordingId:key,type:'application/octet-stream',blob};
      const {project,assets}=await this.store.saveAnalysis(id,key,asset);
      if(this.active?.id===id){this.active=project;this.assets=assets;}
    }
    alignment() {
      if(!this.video.source)return;
      this.show(`<h2>神经与视频时间对齐</h2><p>填写同一个事件在两边的时间，或导入对应视频的 Allen 帧时钟。</p><form data-align><label>视频秒<input name="video" type="number" step="any" required value="${this.video.currentVideoTime}"></label><label>神经秒<input name="neural" type="number" step="any" required value="${this.state.experimentView.cursorTime||0}"></label><button>应用对齐</button></form><button data-clock>导入 Allen 帧时钟 JSON</button>`);
      const save=async(mapping,extra={})=>{
        new window.NeuropixelsVideoSync.TimeMapping(mapping);
        const descriptor=this.active.videos[this.state.activeRecording.key];Object.assign(descriptor,{timeMapping:mapping},extra);
        await this.store.request('projects',this.active.id,this.active);const at=this.video.currentVideoTime;this.loadedVideoKey=null;this.recordingChanged(this.state.activeRecording);this.video.elements.video.addEventListener('loadedmetadata',()=>this.video.seekVideo(at),{once:true});this.dialog.close();
      };
      this.dialog.querySelector('form').onsubmit=e=>{e.preventDefault();save({method:'manual_offset',offset_s:Number(e.target.elements.neural.value)-Number(e.target.elements.video.value),scale:1,verification_status:'unverified'}).catch(e=>this.failure(e));};
      this.dialog.querySelector('[data-clock]').onclick=async()=>{try{
        const [f]=await this.selectFiles({accept:'.json'});if(!f)return;const clock=JSON.parse(await f.text());
        const d=this.active.videos[this.state.activeRecording.key],asset=this.assets.find(a=>a.path===d.asset);
        if(clock.schema!=='allen-video-clock/1'||!this.active.session||String(clock.session_id)!==this.active.session)throw new Error('帧时钟的 Allen session 与此神经记录不一致。');
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await asset.blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
        if(hash!==clock.video?.sha256)throw new Error('帧时钟的 SHA-256 与当前视频不匹配。');
        await save(clock.timeMapping,{frame_rate_hz:clock.video.fps,duration_s:clock.video.duration_s});
      }catch(e){this.failure(e);}};
    }
  }
  window.NeuropixelsBrowserProjectUI=BrowserProjectUI;
})();
