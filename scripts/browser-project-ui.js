// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const S = window.NeuropixelsBrowserStorage, core = window.NeuropixelExplorerCore;
  const dropText = (key, values) => window.NeuropixelsI18n.translate(document.documentElement.lang, 'drop.' + key, values);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fileFrom = a => {const f=new File([a.blob],a.name,{type:a.type||'',lastModified:a.lastModified||0});Object.defineProperty(f,'relativePath',{value:a.path});return f;};
  const assetFrom = f => ({name:f.name,path:core.pathOf(f),type:f.type,lastModified:f.lastModified,blob:f});
  const mediaInput = (file,role,owner) => ({...assetFrom(file),path:role+':'+crypto.randomUUID(),role,appliedTo:owner});
  const documentStore = (documents,closedKey) => ({request:async(key,doc)=>{
    if(key===closedKey)return null;
    if(doc!==undefined)documents[key]=doc;
    return documents[key]||null;
  }});
  async function sameSourceAsset(a,b) {
    if(a.blob===b.blob)return true;
    if(a.blob.size!==b.blob.size||a.lastModified!==b.lastModified)return false;
    const chunk=1048576;
    for(let start=0;start<a.blob.size;start+=chunk){
      const [left,right]=await Promise.all([a,b].map(async item=>new Uint8Array(await item.blob.slice(start,start+chunk).arrayBuffer())));
      if(!left.every((value,i)=>value===right[i]))return false;
    }
    return true;
  }
  async function attachNwbEvents(existing,incoming) {
    const read=async asset=>window.NeuropixelsEventAnalysis.validateEventSet(JSON.parse(await asset.blob.text()));
    const [a,b]=await Promise.all([read(existing),read(incoming)]);
    if(a.recordingId!==b.recordingId)return null;
    const empty=set=>!set.events.length && ['NWB','Allen NWB'].includes(set.source?.kind);
    const nwb=empty(a)?a:empty(b)?b:null;
    if(!nwb)return null;
    const labels=nwb===a?b:a,asset=nwb===a?incoming:existing;
    if(!labels.events.length)return nwb===a?existing:incoming;
    const {invalidTimes,...recordingSource}=nwb.source;
    const source={...labels.source,recordingSource};
    if(invalidTimes){
      if(source.invalidTimes)source.eventFileInvalidTimes=source.invalidTimes;
      source.invalidTimes=invalidTimes;
    }
    const merged={...labels,source,excluded:[...(nwb.excluded||[]),...(labels.excluded||[])],coverage:labels.coverage??nwb.coverage??null};
    return {...asset,blob:new Blob([JSON.stringify(merged)],{type:'application/json'})};
  }
  const neuralInput = f => core.USEFUL_NAMES.has(core.fileNameOf(f)) || /\.(csv|tsv)$/i.test(f.name) || f.name==='explorer-units.json';
  const diskName = value => {
    const cleaned=String(value||'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,140) || 'input';
    return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned)?'_'+cleaned:cleaned;
  };
  const nwbIdentity=f=>JSON.stringify([f.name,f.size,f.lastModified]);
  async function writeBlob(handle,blob){
    const writer=await handle.createWritable();
    try{await writer.write(blob);await writer.close();}catch(error){await writer.abort().catch(()=>{});throw error;}
  }
  class BrowserProjectUI extends window.NeuropixelsProjectUI {
    constructor(options) {
      super(options); this.openFiles=options.openFiles; this.selectRecording=options.selectRecording; this.browserLocal=true;
      this.clearNeuralWorkspace=options.clearNeuralWorkspace;
      this.updateRecordingTabs=options.updateRecordingTabs;
      this.queueWorkspaceEdit=options.queueWorkspaceEdit;
      this.closedRecordings=[];
      this.sourceNwbFiles=new Map();
      this.videoTabs=document.getElementById('project-video-tabs');
      window.NeuropixelsWorkspaceTabs.install(this.videoTabs);
      this.annotations.onDocumentReady=()=>this.importPendingAnnotations().catch(error=>this.failure(error));
      this.store ||= new S.ProjectStore({working:true});
      // The traditional folder picker and workspace drops share the same incremental reader.
      this.revision=0;
      this.warnBeforeClose=event=>{event.preventDefault();event.returnValue=true;};
      this.annotations.onDocumentEdit=()=>this.markChanged();
      const folder = document.getElementById('folder-input');
      folder?.addEventListener('change',e=>{e.stopImmediatePropagation();this.importNeuralFiles([...folder.files]).catch(e=>this.failure(e));folder.value='';},true);
      this.dialog.addEventListener('close',()=>{if(!this.dialog.open){this.draft?.abort.abort();this.draft=null;}});
    }
    async refresh() {
      this.store ||= new S.ProjectStore({working:true});
      this.available=true;
      try {this.projects=(await this.store.request('projects')).sort((a,b)=>b.updated-a.updated);}catch{this.projects=[];}
      this.render();
    }
    markChanged() {
      this.revision++;
      this.setDirty(true);
    }
    setDirty(value) {
      this.dirty=value;
      if(value)window.addEventListener('beforeunload',this.warnBeforeClose);
      else window.removeEventListener('beforeunload',this.warnBeforeClose);
      this.renderExport();
    }
    confirmReplace() {
      return !this.dirty || window.confirm(this.importText('discardWorking'));
    }
    renderExport() {
      this.saveButton.textContent=window.NeuropixelsI18n.translate(document.documentElement.lang,'prefs.save')+(this.dirty?' •':'');
      this.saveButton.disabled=!this.active;
      this.saveButton.title=this.dirty?this.importText('unexported'):window.NeuropixelsI18n.translate(document.documentElement.lang,'prefs.save');
    }
    async activate(project) {
      if(this.active?.id!==project?.id){this.mediaHistory={past:[],future:[]};this.closedRecordings=[];}
      else this.closedRecordings=this.closedRecordings.filter(edit=>!project.recordingIds.includes(edit.record.key));
      await this.annotations.flush(); this.video.setRecording(null,[]);
      if(this.videoUrl){URL.revokeObjectURL(this.videoUrl);this.videoUrl=null;}
      this.active=project;this.loadedVideoKey=null;
      const id=project.id;
      this.documents=await this.store.request('annotations',id)||{};
      this.active=S.withVideoLibrary(project,this.documents);
      await this.annotations.useStore(documentStore(this.documents));
    }
    async openCached(project,focusKey,indexedRecordings) {
      const assets=await this.store.request('assets',project.id);
      if(!assets)throw new Error('此项目的缓存文件已被清理，请打开导出的 .neuroproject 项目包。');
      const previous=this.active?.id===project.id && this.video.source?.descriptor;
      const mediaId=previous && (previous.annotationSourceId||previous.asset);
      const at=this.video.currentVideoTime,playing=!!mediaId && !this.video.elements.video.paused;
      await this.activate(project);this.assets=assets;
      if(project.recordingIds.length){
        await this.openFiles(assets.filter(a=>!a.role).map(fileFrom),{partial:true,recordingKeys:project.recordingIds,focusKey,indexedRecordings});
      }else{
        await this.clearNeuralWorkspace();
        this.recordingChanged(null);
      }
      const source=this.video.source,descriptor=source?.descriptor;
      if(mediaId && mediaId===(descriptor?.annotationSourceId||descriptor?.asset)){
        const restore=()=>{
          if(this.video.source!==source)return;
          this.video.seekVideo(at,{preserveView:true});
          if(playing)this.video.play();
        };
        if(this.video.elements.video.readyState>=1)restore();
        else this.video.elements.video.addEventListener('loadedmetadata',restore,{once:true});
      }
      for(const id of this.store.sessions?.keys()||[])if(id!==project.id)this.store.sessions.delete(id);
      this.dialog.close();this.render();
    }
    async create(files,source={},media=[],draft=null) {
      const groups=core.groupExperimentFiles(files);
      if(!groups.length)throw new Error('未找到 spike_times.npy 和 spike_clusters.npy，请选择 Kilosort 结果文件夹。');
      await Promise.all(groups.map(g=>core.indexExperiment(g)));
      const current=()=>!draft||this.draft===draft&&this.dialog.open&&(!draft.destinationId||this.active?.id===draft.destinationId);
      if(!current())throw new DOMException('Import cancelled','AbortError');
      const creation=draft||this.creation;
      const id=crypto.randomUUID(), project={id,name:creation?.projectName||groups[0].name,mode:creation?.mode||'neural',recordingIds:groups.map(g=>g.key),videoLibrary:[],source:source.label||'浏览器本地项目',...source,updated:Date.now()};
      const assets=files.map(assetFrom);
      for(const {file,clock,clockFile} of media){
        const path=`video:${crypto.randomUUID()}`;
        project.videoLibrary.push({id:path,asset:path,annotationSourceId:path,annotationRecordingKey:path,video_name:file.name,byte_size:file.size,...clock});
        assets.push({...assetFrom(file),path,role:'video'});
        if(clockFile)assets.push(mediaInput(clockFile,'clock',path));
      }
      project.activeVideoId=project.videoLibrary[0]?.id??null;
      const existing=draft?.destinationId?this.active:null;
      this.checkProjectMedia([...Object.values(existing?.recordingSources||{}),...Object.values(project.recordingSources||{})],
        (existing?.recordingIds.length||0)+groups.length,(existing?.videoLibrary.length||0)+project.videoLibrary.length,existing);
      if(!draft?.destinationId&&!this.confirmReplace())return;
      this.show('<h2>'+esc(this.importText('working'))+'</h2>');
      const progress=this.dialog.querySelector('h2');
      let saved=project;
      if(draft?.destinationId){
        await this.annotations.flush();
        saved=await this.store.appendRecordings(draft.destinationId,project,assets,current,draft.abort.signal);
      }else await this.store.create(project,assets,{},current,draft?.abort.signal);
      this.markChanged();
      if(!this.dialog.open || !progress.isConnected){await this.refresh();return;}
      this.creation=null;this.draft=null;
      await this.openCached(saved,draft?.destinationId?project.recordingIds[0]:null);
      await this.refresh();this.toast(this.importText('importedRecords').replace('{count}',project.recordingIds.length));
    }
    newProject(mode='neural',destination=null) {
      this.creation=null;
      this.draft?.abort.abort();
      this.draft={projectName:destination?.name||'',destinationId:destination?.id,mode,records:[],supplements:[],video:[],clock:[],abort:new AbortController()};
      this.renderImport();
    }
    workspaceProject(name) {
      if(this.active)return structuredClone(this.active);
      return {id:crypto.randomUUID(),name,temporary:true,mode:'neural',recordingIds:[],videoLibrary:[],activeVideoId:null,recordingSources:{},updated:Date.now()};
    }
    get lastClosedRecording() {
      return this.closedRecordings?.at(-1)?.record || null;
    }
    closeRecording(key) {
      const id=this.active?.id;
      return this.queueWorkspaceEdit(()=>this.editRecordingTabs(id,key,false));
    }
    undoCloseRecording() {
      const id=this.active?.id;
      return this.queueWorkspaceEdit(()=>this.editRecordingTabs(id,null,true));
    }
    async editRecordingTabs(id,key,undo) {
      await this.annotations.flush();
      if(!id || this.active?.id!==id)return;
      const records=this.state.recordings.slice(), selected=this.state.activeRecording;
      let edit=undo?this.closedRecordings.at(-1):null;
      const record=undo?edit?.record:records.find(r=>r.key===key);
      if(!record || undo && this.active.recordingIds.includes(record.key))return;
      key=record.key;
      const project={...this.active,recordingIds:[...this.active.recordingIds],
        recordingSources:{...this.active.recordingSources},updated:Date.now()};
      const documents={...this.documents};
      let assets=this.assets,focusKey=selected?.key;
      if(undo){
        project.recordingIds.splice(edit.idIndex,0,key);
        records.splice(edit.tabIndex,0,record);
        if(edit.source)project.recordingSources[key]=edit.source;
        window.NeuropixelsUnitMarks?.restore(project,edit.marks);
        const paths=new Set(assets.map(a=>a.path));
        assets=assets.concat(edit.assets.filter(a=>!paths.has(a.path)));
        if(!selected || edit.wasActive && selected.key===edit.neighbor)focusKey=key;
      }else{
        const tabIndex=records.indexOf(record), idIndex=project.recordingIds.indexOf(key);
        if(idIndex<0)return;
        const source=project.recordingSources[key] || (project.session && project.recordingIds.length===1 ?
          {session:project.session,probe:project.probe,nwbKind:project.nwbKind,sourceNwb:project.sourceNwb,label:project.label}:null);
        records.splice(tabIndex,1);project.recordingIds.splice(idIndex,1);
        delete project.recordingSources[key];
        if(!records.length)for(const field of ['session','probe','nwbKind','sourceNwb','label'])delete project[field];
        const filePaths=new Set(record.files.map(core.pathOf));
        const removed=assets.filter(a=>a.role==='event-analysis' || a.role==='population-dynamics' ? a.recordingId===key || a.sourceRecordings?.includes(key) : !a.role && filePaths.has(a.path));
        const discard=new Set(removed);assets=assets.filter(a=>!discard.has(a));
        const neighbor=records[Math.min(tabIndex,records.length-1)]?.key;
        const wasActive=selected===record;
        if(wasActive)focusKey=neighbor;
        edit={record,tabIndex,idIndex,source,assets:removed,wasActive,neighbor,marks:window.NeuropixelsUnitMarks?.detach(project,key)};
      }
      await this.store.create(project,assets,documents);
      this.active=project;this.assets=assets;this.documents=documents;
      this.annotations.store=documentStore(documents);
      if(undo){
        this.closedRecordings.pop();
      }else{
        this.closedRecordings.push(edit);
        if(this.closedRecordings.length>8)this.closedRecordings.shift();
      }
      this.markChanged();
      await this.updateRecordingTabs(records,assets.filter(a=>!a.role).map(fileFrom),focusKey);
    }
    checkProjectMedia(sources,recordCount,videoCount,previous=this.active,batch={}) {
      const sessions=new Set(sources.map(s=>s?.session).filter(Boolean).map(String));
      if(videoCount && sessions.size>1)throw Error(this.importText('differentSessions'));
      if(batch.confirmed || recordCount<2 || videoCount<2 || previous?.recordingIds.length>1 && previous.videoLibrary.length>1)return;
      if(!window.confirm(this.importText('confirmSharedProject').replace('{probes}',recordCount).replace('{videos}',videoCount)))
        throw new DOMException('Import cancelled','AbortError');
      batch.confirmed=true;
    }
    get activeVideo(){
      const p=this.active;
      return p?.videoLibrary?.find(d=>d.id===p.activeVideoId) || p?.videoLibrary?.[0] || null;
    }
    async importNeuralFiles(files, targetKey, batch={}) {
      try { await this.readWorkspaceNeuralFiles(files, targetKey, batch); }
      catch(error){
        if(this.dialog.querySelector('[data-nwb-progress],[data-browser-probe]'))this.dialog.close();
        throw error;
      }
    }
    async readWorkspaceNeuralFiles(files, targetKey, batch) {
      if(!files.length)return;
      const startProject=this.active?.id;
      const current=()=>this.active?.id===startProject;
      const selectedKey=this.state.activeRecording?.key;
      const target=targetKey===undefined ? null : this.state.recordings.find(record=>record.key===targetKey);
      if(targetKey!==undefined && !target)throw Error(dropText('changed'));
      if(target) {
        for(const file of files){
          const owner=core.detectRecordingFromPath(this.state.recordings,file);
          if(owner && owner!==target)throw Error(window.NeuropixelsI18n.translate(document.documentElement.lang,'toast.wrongRecording',{file:file.name,recording:owner.name,expected:target.name}));
          if(!target.missingInputs?.length && core.roleForFile(file))await core.validateSupplementFile(target,file);
        }
      }
      const nwb=files.filter(f=>/\.nwb$/i.test(f.name));
      const kilo=files.filter(neuralInput);
      if(!nwb.length&&!kilo.length)throw Error(this.neuralFormats());
      const firstPath=core.pathOf(nwb[0]||kilo[0]).split('/');
      const name=nwb[0]?.name.replace(/\.nwb$/i,'') || firstPath.at(-2) || 'Kilosort';
      const pending=this.workspaceProject(name), extra=[];
      pending.recordingSources ||= {};
      const incomingKeys=new Set();
      const eventsOnly=new Set(this.state.recordings.filter(r=>r.eventsFile && r.files.every(f=>core.fileNameOf(f)==='explorer-events.json')).map(r=>r.key));
      for(const record of await this.selectNwbRecords(nwb,pending.recordingIds.filter(key=>!eventsOnly.has(key)))){
        const {input,source}=await this.readNwbRecord(record);
        incomingKeys.add(record.key);
        pending.recordingSources[record.key]=source;
        extra.push(...input.map(assetFrom));
      }
      const groups=core.groupExperimentFiles(kilo,{partial:true});
      const hasKnown=g=>g.files.some(f=>core.USEFUL_NAMES.has(core.fileNameOf(f))||core.fileNameOf(f)==='explorer-units.json');
      const known=groups.some(hasKnown);
      for(const group of groups){
        let key=targetKey ?? group.key;
        if(targetKey===undefined && key==='.' && selectedKey && groups.length===1 && !nwb.length)key=selectedKey;
        const events=group.byName.get('explorer-events.json');
        if(events){
          const data=JSON.parse(await events.text());
          if(group.key==='.' && !target && (incomingKeys.has(data.recordingId) || !selectedKey && !nwb.length))key=data.recordingId;
          window.NeuropixelsEventAnalysis.validateEventSet(data,key);
          if(typeof key!=='string' || (key!=='.' && (/[\\:]/.test(key) || key.split('/').some(part=>!part || ['.','..','__proto__','constructor','prototype'].includes(part)))))throw Error(this.importText('invalidRecordingId'));
        }
        if(hasKnown(group)||(!known&&!nwb.length))incomingKeys.add(key);
        const used=new Set();
        const nwbRecord=this.state.recordings.find(r=>r.key===key && r.fromNwb);
        for(const file of group.files){
          const basename=core.fileNameOf(file);
          if(nwbRecord && basename.endsWith('.npy') && !nwbRecord.byName.has(basename))throw Error(dropText('allenSortingFile',{file:file.name}));
          if(used.has(basename))throw Error(this.importText('duplicateFiles'));
          used.add(basename);
          const asset=assetFrom(file);
          if(key!==group.key)asset.path=key==='.'?file.name:key+'/'+file.name;
          extra.push(asset);
        }
      }
      if(!current())throw new DOMException('Import cancelled','AbortError');
      const previousAssets=this.assets||[], additions=new Map(), paths=new Map(previousAssets.filter(a=>!a.role).map(a=>[a.path.toLowerCase(),a]));
      for(const item of extra){
        const path=item.path.toLowerCase(), existing=paths.get(path);
        let addition=item;
        if(existing){
          if(await sameSourceAsset(existing,item))continue;
          if(item.name.toLowerCase()==='explorer-events.json'){
            addition=await attachNwbEvents(existing,item);
            if(!addition)throw Error(this.importText('eventsOccupied'));
            if(addition===existing)continue;
          }else throw Error(`${item.path} · ${this.importText('duplicateFiles')}`);
        }
        paths.set(path,addition);additions.set(path,addition);
      }
      if(!additions.size){this.dialog.close();return;}
      // Check both new and previously accepted rows before replacing the working copy.
      const combined=core.groupExperimentFiles([...paths.values()].map(fileFrom),{partial:true});
      const indexed=await Promise.all(combined.filter(g=>incomingKeys.has(g.key)).map(g=>core.indexExperiment(g,{partial:true})));
      if(!current())throw new DOMException('Import cancelled','AbortError');
      await this.annotations.flush();
      // Preserve media and analysis edits made while the source files were being read.
      const project=this.active?{...this.active}:pending;
      project.recordingSources={...project.recordingSources,...Object.fromEntries([...incomingKeys].filter(k=>Object.hasOwn(pending.recordingSources,k)).map(k=>[k,pending.recordingSources[k]]))};
      const previousKey=project.recordingIds.length===1?project.recordingIds[0]:null;
      if(previousKey && project.session && !Object.hasOwn(project.recordingSources,previousKey)){
        project.recordingSources[previousKey]={session:project.session,probe:project.probe,nwbKind:project.nwbKind,sourceNwb:project.sourceNwb,label:project.label};
      }
      project.recordingIds=[...new Set([...project.recordingIds,...incomingKeys])];
      if(project.recordingIds.length>1)for(const field of ['session','probe','nwbKind','sourceNwb','label'])delete project[field];
      project.updated=Date.now();
      const documents=structuredClone(this.documents||{});
      const mergedAssets=[...(this.assets||[]).filter(a=>a.role || !additions.has(a.path.toLowerCase())),...additions.values()];
      this.checkProjectMedia(Object.values(project.recordingSources),project.recordingIds.length,project.videoLibrary.length+(batch.videos?.added.length||0),this.active,batch);
      if(mergedAssets.some(a=>a.role==='clock' && !a.appliedTo)){
        project.videoLibrary=project.videoLibrary.map(camera=>({...camera}));
        for(const camera of project.videoLibrary){
          if(!camera.timeMapping)await this.matchPendingClock(project,mergedAssets,(target ? selectedKey : null) || [...incomingKeys][0] || selectedKey,camera);
        }
      }
      if(!current())throw new DOMException('Import cancelled','AbortError');
      await this.store.create(project,mergedAssets,documents,current);
      this.markChanged();
      await this.openCached(project,(target ? selectedKey : null) || [...incomingKeys][0] || selectedKey,new Map(indexed.map(record=>[record.key,record])));
    }
    renderImport(error='') {
      const d=this.draft,t=k=>esc(this.importText(k));
      if(!d)return;
      const formatsOpen=this.dialog.querySelector('[data-neural-formats]')?.open;
      const button=(kind,title)=>`<button type="button" data-import-pick="${kind}">${t(title)}</button>`;
      const mediaLabel=(kind,i)=>{
        const file=d[kind][i].file,path=core.pathOf(file);
        if(!d[kind].some((other,j)=>j!==i&&core.pathOf(other.file)===path))return path;
        return `${path} · ${file.size.toLocaleString(document.documentElement.lang)} B · #${i+1}`;
      };
      const remove=(kind,i)=>`<button type="button" data-import-remove="${kind}" data-index="${i}" aria-label="${t('removeInput')} ${esc(kind==='neural'?d.records[i].label:mediaLabel(kind,i))}">×</button>`;
      const records=d.records.map((r,i)=>`<li><span>${esc(r.label)}${r.missing?.length?`<small>${t('missingFiles')}${esc(r.missing.join(', '))}</small>`:''}</span>${r.needsRate?`<label>${t('folderRate')} <input type="number" required step="any" min="0.000001" data-import-rate="${i}" value="${esc(r.rate||'')}"></label>`:''}${remove('neural',i)}</li>`).join('');
      const acceptsClock=!d.records.length || d.records.every(r=>r.nwbKind==='Allen NWB');
      const media=(kind,title,hint)=>`<section data-wizard-media="${kind}" ${kind!=='clock'||acceptsClock?'data-import-drop="'+kind+'"':''} ${d.mode==='combined'?'':'hidden'}><h3>${t(title)}</h3><p>${t(kind==='clock'&&!acceptsClock?'manualOnly':hint)}</p>${kind!=='clock'||acceptsClock?button(kind,'recordFiles'):''}<ul>${d[kind].map((entry,i)=>`<li><span>${esc(mediaLabel(kind,i))}</span>${kind==='clock' && d.video.length>1?`<select aria-label="${esc(entry.file.name)}" data-clock-video="${i}"><option value="">${t('chooseClockVideo')}</option>${d.video.map((video,j)=>`<option value="${j}" ${entry.camera===video?'selected':''}>${esc(mediaLabel('video',j))}</option>`).join('')}</select>`:''}${remove(kind,i)}</li>`).join('')}</ul></section>`;
      this.show(`<h2>${d.destinationId?t('appendTitle')+' · '+esc(d.projectName):t('newProject')}</h2><form class="project-create" data-project-import>
        ${d.destinationId?'':`<label class="project-name">${t('projectName')}<input name="projectName" maxlength="200" autocomplete="off" value="${esc(d.projectName)}" placeholder="Experiment 01"></label>`}
        <fieldset class="project-modes"><legend>${t('importMode')}</legend>${['neural','combined'].map(mode=>`<label><input type="radio" name="mode" value="${mode}" ${mode===d.mode?'checked':''}>${t(mode)}</label>`).join('')}</fieldset>
        <section data-import-drop="neural"><h3>${t('neuralInput')}</h3>${this.neuralInputs(formatsOpen)}${button('neural','recordFiles')} ${button('folder','recordFolder')}<ul>${records}</ul></section>
        ${media('video','videoInput','dropVideo')}${media('clock','clockInput','clockFormats')}
        <p data-import-error role="alert" ${error?'':'hidden'}>${esc(error)}</p><div class="project-footer"><button type="submit" class="project-primary" data-import-submit>${t(d.destinationId?'appendRecords':'createImport')}</button></div></form>`);
      const form=this.dialog.querySelector('form');
      form.oninput=e=>{
        const n=e.target;
        form.querySelector('[data-import-error]').hidden=true;
        if(n.name==='projectName')d.projectName=n.value;
        if(n.hasAttribute('data-import-rate'))d.records[Number(n.dataset.importRate)].rate=n.value;
        if(n.name==='mode'){
          d.mode=n.value;
          for(const kind of ['video','clock'])form.querySelector(`[data-wizard-media="${kind}"]`).hidden=d.mode!=='combined';
        }
        if(n.hasAttribute('data-clock-video'))d.clock[Number(n.dataset.clockVideo)].camera=d.video[n.value]||null;
      };
      form.onclick=async e=>{
        const n=e.target.closest('button');if(!n)return;
        const kind=n.dataset.importPick,del=n.dataset.importRemove;
        if(del){
          const array=del==='neural'?d.records:d[del], [removed]=array.splice(Number(n.dataset.index),1);
          if(del==='neural'){
            if(!d.records.length)d.supplements=[];
          }
          if(del==='video')for(const c of d.clock)if(c.camera===removed)c.camera=null;
          this.renderImport();return;
        }
        if(!kind)return;
        try{
          const accept={neural:'.nwb,.npy,.py,.tsv,.csv,.json',video:'.mp4,.webm,.mov,.avi,.mkv',clock:'.json'}[kind]||'';
          const files=await this.selectFiles({directory:kind==='folder',multiple:true,accept});
          if(files.length&&this.draft===d&&form.isConnected)await this.stageWizardFiles(kind==='folder'?'neural':kind,files);
        }catch(err){if(this.draft===d)this.renderImport(err.message);}
      };
      form.onsubmit=async e=>{
        e.preventDefault();if(d.busy)return;
        d.busy=true;
        try{await this.commitImport(d);}catch(err){if(this.draft===d&&this.dialog.open)this.renderImport(err.name==='AbortError'?'':err.message);}
        finally{d.busy=false;}
      };
    }
    async stageWizardFiles(kind,files) {
      if(!this.draft)this.newProject(kind==='neural'?'neural':'combined');
      const d=this.draft;
      if(d.busy||!files.length)return;
      d.busy=true;
      try{
        files=await this.filesForImportArea(files,kind);
        if(this.draft!==d||!this.dialog.open)return;
        if(kind==='neural'){
          const nwb=files.filter(f=>/\.nwb$/i.test(f.name));
          const kilo=files.filter(neuralInput);
          // Browser file pickers hide parent paths. Never join two files with the same relative name.
          const allKilo=[...d.supplements,...d.records.flatMap(r=>r.files||[]),...kilo];
          const paths=allKilo.map(f=>core.pathOf(f).toLowerCase());
          if(new Set(paths).size!==paths.length)throw Error(this.importText('duplicateFiles'));
          const groups=core.groupExperimentFiles(allKilo);
          if((!kilo.length&&!nwb.length)||(!groups.length&&!nwb.length))throw Error(this.neuralFormats());
          const newNwb=await this.selectNwbRecords(nwb,[
            ...d.records.map(r=>r.key),...(d.destinationId?this.active.recordingIds:[])
          ]);
          if(this.draft!==d||!this.dialog.open)return;
          const keys=[...d.records.filter(r=>r.file).map(r=>r.key),...newNwb.map(r=>r.key),...groups.map(g=>g.key)];
          if(new Set(keys).size!==keys.length)throw Error(this.importText('duplicateFiles'));
          const used=new Set(groups.flatMap(g=>g.files));
          d.supplements=allKilo.filter(f=>!used.has(f));
          d.records.push(...newNwb);
          for(const g of groups){
            let record=d.records.find(r=>!r.file&&r.key===g.key);
            if(!record){record={key:g.key,label:g.key==='.'?'Kilosort':g.key};d.records.push(record);}
            record.files=g.files;
            record.missing=['spike_times.npy','spike_clusters.npy'].filter(name=>!g.byName.has(name));
            record.needsRate=!g.byName.has('params.py');
          }
          const first=d.records[0];
          if(!d.projectName)d.projectName=(first.file?first.file.name.replace(/\.nwb$/i,''):first.label.split('/').at(-1)).slice(0,200);
        }else{
          if(kind==='clock' && d.records.some(r=>r.nwbKind!=='Allen NWB'))throw Error(this.importText('manualOnly'));
          const valid=kind==='video'?BrowserProjectUI.isVideoFile:f=>/\.json$/i.test(f.name);
          if(!['clock','video'].includes(kind)||!files.every(valid))throw Error(this.importText(kind==='video'?'videoFormats':'clockFormats'));
          d.mode='combined';
          d[kind].push(...files.map(file=>({file})));
        }
        this.renderImport();
      }catch(err){if(this.draft===d && this.dialog.open)this.renderImport(err.name==='AbortError'?'':err.message);}
      finally{d.busy=false;}
    }
    async commitImport(d) {
      const ensureCurrent=()=>{if(!this.dialog.open||this.draft!==d)throw new DOMException('Import cancelled','AbortError');};
      if(!d.records.length)throw Error(this.importText('noSignals'));
      const incomplete=d.records.find(r=>r.missing?.length);
      if(incomplete)throw Error(`${incomplete.label} · ${this.importText('missingFiles')}${incomplete.missing.join(', ')}`);
      d.projectName=d.projectName.trim();
      const media=[];
      if(d.mode==='combined'){
        if(d.clock.length && d.records.some(r=>r.nwbKind!=='Allen NWB'))throw Error(this.importText('manualOnly'));
        if(!d.video.length)throw Error(this.importText('noVideo'));
        for(const clock of d.clock){
          if(d.video.length===1)clock.camera=d.video[0];
          if(!d.video.includes(clock.camera))throw Error(this.importText('chooseClockVideo'));
        }
        if(new Set(d.clock.map(c=>c.camera)).size!==d.clock.length)throw Error(this.importText('clockDuplicate'));
      }
      const files=[...d.supplements],recordingSources=Object.create(null),keys=new Set();
      this.show(`<h2>${esc(this.importText('working'))}</h2>`);
      for(const record of d.records){
        let input,key,source;
        if(record.file){
          ({input,source}=await this.readNwbRecord(record));ensureCurrent();
          key=record.key;
          recordingSources[key]=source;
        }else{
          input=record.files.slice();key=record.key;
          if(record.needsRate){
            const rate=Number(record.rate);
            if(!Number.isFinite(rate)||rate<=0)throw Error(`${record.label} · ${this.importText('folderRate')}`);
            input.push(fileFrom({blob:`sample_rate = ${rate}\n`,name:'params.py',path:key==='.'?'params.py':`${key}/params.py`}));
          }
        }
        if(keys.has(key)||d.destinationId&&this.active?.recordingIds.includes(key)){
          throw Error(`${key} · ${this.importText('alreadyPresent')}`);
        }
        keys.add(key);for(const f of input)files.push(f);
      }
      const session=BrowserProjectUI.allenClockSession({recordingSources},[...keys]);
      for(const video of d.mode==='combined'?d.video:[]){
        const entry=d.clock.find(c=>c.camera===video);
        let clock;
        if(entry){
          this.show(`<h2>${esc(this.importText('clockInput'))}</h2><p>${esc(entry.file.name)} · <span data-clock-progress>0%</span></p>`);
          const status=this.dialog.querySelector('[data-clock-progress]');
          clock=await BrowserProjectUI.clockDetails(entry.file,video.file,session,(done,total)=>{ensureCurrent();status.textContent=Math.floor(100*done/total)+'%';});
        }
        media.push({file:video.file,clock,clockFile:entry?.file});
      }
      ensureCurrent();
      const legacy=d.records.length===1?Object.values(recordingSources)[0]:null;
      await this.create(files,{...legacy,recordingSources},media,d);
    }
    async readNwb(file,probe) {
      this.show('<h2>NWB</h2><p data-nwb-progress>读取 /units…</p>');
      const progress=this.dialog.querySelector('[data-nwb-progress]');
      if(!this.nwbWorkerBlob){
        const encoded=document.getElementById('nwb-worker-gzip')?.content.textContent;
        let compressed;
        try { compressed=Uint8Array.from(atob(encoded||''),byte=>byte.charCodeAt(0)); }
        catch { throw Error(dropText('nwbIntegrity')); }
        if(await window.hashwasm.sha256(compressed)!=='__NWB_WORKER_SHA256__')throw Error(dropText('nwbIntegrity'));
        const source=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
        this.nwbWorkerBlob=await new Response(source,{headers:{'Content-Type':'text/javascript'}}).blob();
      }
      if(!this.dialog.open || !progress.isConnected)throw new DOMException('Import cancelled','AbortError');
      const url=URL.createObjectURL(this.nwbWorkerBlob);
      const worker=new Worker(url);
      let cancel;
      try {return await new Promise((resolve,reject)=>{
        cancel=()=>{if(!this.dialog.open || !progress.isConnected)reject(new DOMException('Import cancelled','AbortError'));};
        this.dialog.addEventListener('close',cancel);
        worker.onmessage=({data})=>{if(!this.dialog.open || !progress.isConnected){cancel();return;}if(data.progress)progress.textContent=data.progress;else if(data.error)reject(new Error(data.error));else resolve(data);};
        worker.onerror=e=>reject(new Error(e.message));worker.postMessage({file,probe});
      });}finally{this.dialog.removeEventListener('close',cancel);worker.terminate();URL.revokeObjectURL(url);}
    }
    async selectNwbRecords(files,existingKeys) {
      const used=new Set(existingKeys),records=[];
      for(const file of files){
        const {candidates,kind}=await this.readNwb(file);
        if(!candidates?.length)throw Error(`${file.name} · 0 Units`);
        if(candidates.every(c=>used.has(c.key)))throw Error(file.name+' · '+this.importText('allProbesOpen'));
        const selected=candidates.length===1?candidates:await this.chooseProbes(file.name,candidates,used);
        for(const {name:probe,key} of selected){
          used.add(key);
          records.push({file,key,probe,nwbKind:kind,label:core.pathOf(file)+' · '+probe});
        }
      }
      return records;
    }
    async readNwbRecord({file,probe}) {
      const {files,session,kind}=await this.readNwb(file,probe);
      this.sourceNwbFiles.set(nwbIdentity(file),file);
      const input=files.map(a=>fileFrom({blob:a.data,name:a.name,path:a.path,lastModified:file.lastModified}));
      const source={session,probe,nwbKind:kind,sourceNwb:{name:file.name,size:file.size,lastModified:file.lastModified},label:`${kind==='Allen NWB'?'Allen':'NWB'} ${session} · ${probe}`};
      return {input,source};
    }
    chooseProbes(label,candidates,used) {
      const t=key=>this.importText(key);
      this.show(`<h2>${esc(t('probePick'))}</h2><p>${esc(label)}</p>
        <form class="probe-picker"><button type="button" data-all-probes>${esc(t('allProbes'))}</button>
        <div class="source-candidates" role="group" aria-label="${esc(t('probePick'))}">${candidates.map(c=>
          `<button type="button" data-browser-probe="${esc(c.name)}" aria-pressed="false" ${used.has(c.key)?'disabled':''}>
          <strong>${esc(c.name)}</strong><span>${esc(c.units)} Units${used.has(c.key)?' · '+esc(t('probeAlreadyAdded')):''}</span></button>`).join('')}</div>
        <div class="project-footer"><button type="button" data-cancel-probes>${esc(t('cancel'))}</button>
        <button type="submit" class="project-primary" data-confirm-probes disabled></button></div></form>`);
      const form=this.dialog.querySelector('.probe-picker'),all=form.querySelector('[data-all-probes]'),submit=form.querySelector('[type=submit]');
      const buttons=[...form.querySelectorAll('[data-browser-probe]:enabled')];
      const selected=()=>buttons.filter(b=>b.getAttribute('aria-pressed')==='true');
      const update=()=>{
        const count=selected().length;
        submit.disabled=count===0;
        submit.textContent=t('importProbes').replace('{count}',String(count));
        all.textContent=t(count===buttons.length?'clearProbes':'allProbes');
      };
      for(const b of buttons)b.onclick=()=>{b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));update();};
      all.onclick=()=>{const value=selected().length!==buttons.length;for(const b of buttons)b.setAttribute('aria-pressed',String(value));update();};
      update();
      buttons[0].focus();
      return new Promise((resolve,reject)=>{
        const events=new AbortController();
        const cancel=()=>{events.abort();reject(new DOMException('Import cancelled','AbortError'));};
        this.dialog.addEventListener('close',()=>{if(!this.dialog.open)cancel();},{signal:events.signal});
        this.dialog.addEventListener('cancel',event=>{event.preventDefault();cancel();},{signal:events.signal});
        form.querySelector('[data-cancel-probes]').onclick=cancel;
        form.onsubmit=event=>{
          event.preventDefault();
          const names=new Set(selected().map(b=>b.dataset.browserProbe));
          if(!names.size)return;
          events.abort();
          resolve(candidates.filter(c=>names.has(c.name)));
        };
      });
    }
    chooseImportTarget(title,label,options) {
      this.show(`<h2>${esc(this.importText(title))}</h2><p>${esc(label)}</p><div class="source-candidates">${options.map(c=>`<button data-browser-probe="${esc(c.key)}">${esc(c.label)}</button>`).join('')}</div>`);
      return new Promise((resolve,reject)=>{
        const cancel=()=>{if(!this.dialog.open){this.dialog.removeEventListener('close',cancel);reject(new DOMException('Import cancelled','AbortError'));}};
        this.dialog.addEventListener('close',cancel);
        this.dialog.querySelectorAll('[data-browser-probe]').forEach(b=>b.onclick=()=>{this.dialog.removeEventListener('close',cancel);resolve(b.dataset.browserProbe);});
      });
    }
    neuralFormats(){return [this.importText('nwbFormat'),this.importText('kiloFormat')].join('\n');}
    neuralInputs(expanded=false){
      const text=key=>esc(this.importText(key));
      return `<p><strong>NWB</strong> · ${text('nwbBrief')}</p><p><strong>Kilosort</strong> · ${text('kiloBrief')}</p><details data-neural-formats${expanded?' open':''}><summary>${text('neuralFields')}</summary><p>${text('nwbFormat')}</p><p>${text('kiloFormat')}</p></details>`;
    }
    async ensureProject() {if(!this.active)throw new Error(this.importText('importNowHelp'));}
    static isVideoFile(file) { return window.NeuropixelsVideoSync.VIDEO_EXTENSIONS.test(file?.name || ''); }
    renderEmptyWorkspace() {
      const formatsOpen=document.querySelector('#workspace-empty-intro [data-neural-formats]')?.open;
      const openTables=[...document.querySelectorAll('#mini-probe [data-region-format][open]')].map(el=>el.dataset.regionFormat);
      super.renderEmptyWorkspace();
      this.annotationEmpty.hidden=true;
      if (!this.state.activeRecording) {
        const session=this.assets?.find(a=>a.role==='clock' && a.recordingId==null)?.sessionId;
        document.querySelector('#workspace-empty-intro p').outerHTML=`<div class="file-drop-slot" data-import-drop="neural">${session?`<p>${esc(dropText('neuralSession',{session}))}</p>`:''}${this.neuralInputs(formatsOpen)}</div>`;
        const probe=document.querySelector('#mini-probe .workspace-probe-empty');
        const slot=probe.querySelector('p');
        slot.textContent=dropText('probeCoordinates');slot.classList.add('file-drop-slot');slot.dataset.importDrop='neural';
        probe.insertAdjacentHTML('beforeend',window.NeuropixelsMiniProbe.regionInputs(document.documentElement.lang,null,true,true,openTables));
      }
      const pending=this.assets?.find(a=>a.role==='annotation' && !a.appliedTo);
      const row=document.getElementById('pending-annotation-note');
      row.hidden=!pending;
      const needsOtherVideo=Boolean(pending?.error && this.video.source && pending.expectedVideoName && pending.expectedVideoName!==this.video.source.name);
      row.classList.toggle('file-drop-slot',needsOtherVideo);
      if(needsOtherVideo)row.dataset.importDrop='video';
      else delete row.dataset.importDrop;
      if(pending){
        row.textContent=needsOtherVideo ? pending.name+' · '+dropText('expectedVideo',{file:pending.expectedVideoName})
          : pending.error || dropText('pendingLabels',{file:pending.name});
        row.dataset.severity=pending.error?'error':'warning';
      }
      if(!this.video.source){
        const landing=document.getElementById('video-empty');
        landing.dataset.importDrop='video';
        const hint=landing.querySelector('p');
        hint.classList.add('file-drop-slot');
        const expectedVideo=pending?.expectedVideoName || this.assets?.find(a=>a.role==='clock' && !a.appliedTo)?.expectedVideoName;
        hint.textContent=expectedVideo ? dropText('expectedVideo',{file:expectedVideo}) : this.importText('dropVideo');
      }
    }
    async acceptWorkspaceDrop(kind,files,batch={}) {
      if (kind === 'neural') return this.importNeuralFiles(files,undefined,batch);
      if (!files.length) return;
      if(batch.matchCamera && this.active?.videoLibrary.length>1 && ['clock','annotation'].includes(kind)){
        const data=kind==='clock'?await BrowserProjectUI.readClock(files[0]):await this.readAnnotation(files[0]);
        const name=data.video?.name||data.context?.videoName;
        const matches=this.active.videoLibrary.filter(c=>c.video_name===name);
        if(matches.length===1)await this.selectVideo(matches[0].id);
        else if(matches.length>1){
          const id=await this.chooseImportTarget('chooseInputVideo',files[0].name,matches.map((c,i)=>({key:c.id,label:(i+1)+' · '+c.video_name})));
          await this.selectVideo(id);this.dialog.close();
        }
      }
      if (kind==='annotation') {
        for(const file of files) {
          if(this.annotations.doc && this.annotations.doc.context.videoName===this.video.source?.name){
            const project=this.active,owner=this.annotations.key;
            await this.annotations.importFile(file);
            if(project===this.active && owner===this.annotations.key){
              const prior=this.assets.find(a=>a.role==='annotation' && a.appliedTo===owner && a.name===file.name && a.lastModified===file.lastModified && a.blob.size===file.size);
              if(!prior || !await sameSourceAsset(prior,assetFrom(file))){
                this.assets=[...this.assets,mediaInput(file,'annotation',owner)];
                await this.store.request('assets',project.id,this.assets);
              }
            }
          }else await this.stageMediaInput('annotation',file);
        }
        return;
      }
      if (kind === 'video' && !files.every(BrowserProjectUI.isVideoFile)) throw new Error(dropText('video'));
      if (kind === 'clock' && !files.every(f=>/\.json$/i.test(f.name))) throw new Error(dropText('clockFormat'));
      if(kind==='video')return this.attachVideoFiles(files,batch);
      if (files.length !== 1) throw new Error(dropText('one'));
      const file = files[0];
      if (!this.state.activeRecording || !this.activeVideo) return this.stageMediaInput('clock',file);
      return this.alignment(file);
    }
    async prepareVideoFiles(files){
      const known=(this.assets||[]).filter(a=>a.role==='video'),added=[];
      let selected;
      for(const file of files){
        if(!BrowserProjectUI.isVideoFile(file))throw Error(dropText('video'));
        const input=assetFrom(file);
        let match;
        for(const prior of known){
          if(prior.name===file.name && await sameSourceAsset(prior,input)){match=prior;break;}
        }
        if(!match){
          match={...input,path:'video:'+crypto.randomUUID(),role:'video'};
          known.push(match);added.push(match);
        }
        selected=match.path;
      }
      return {added,selected};
    }
    async attachVideoFiles(files,batch={}) {
      if(!files.length)return;
      const before=this.active,project=before?{...before,videoLibrary:[...before.videoLibrary]}:this.workspaceProject(files[0].name);
      const filesBefore=this.assets||[],{added,selected}=batch.videos||await this.prepareVideoFiles(files);
      const assets=[...filesBefore,...added];
      for(const asset of added){
        const id=asset.path;
        const camera={id,asset:id,annotationSourceId:id,annotationRecordingKey:id,video_name:asset.name,byte_size:asset.blob.size};
        await this.matchPendingClock(project,assets,this.state.activeRecording?.key,camera);
        project.videoLibrary.push(camera);
      }
      project.activeVideoId=this.activeVideo?.asset===selected?this.activeVideo.id:project.videoLibrary.find(d=>d.asset===selected).id;
      this.checkProjectMedia(Object.values(project.recordingSources||{}),project.recordingIds.length,project.videoLibrary.length,before,batch);
      if(this.active!==before)throw Error(dropText('changed'));
      if(!added.length)return this.selectVideo(project.activeVideoId);
      await this.annotations.flush();
      await this.store.create(project,assets,this.documents||{},()=>this.active===before);
      this.mediaHistory||={past:[],future:[]};
      const previous=before?.activeVideoId;
      if(!before)await this.openCached(project);
      else {this.active=project;this.assets=assets;this.recordingChanged(this.state.activeRecording);}
      if(before)this.rememberMedia({kind:'video',added,cameras:project.videoLibrary.slice(before.videoLibrary.length),
        changed:filesBefore.flatMap((a,i)=>a===assets[i]?[]:[{before:a,after:assets[i]}]),previous,selected:project.activeVideoId});
      this.markChanged();
    }
    async closeVideo(id){
      if(this.activeVideo?.id===id && this.annotations.quickMark)this.annotations.finishMark(this.annotations.markTime());
      await this.annotations.flush();
      const old=this.active,index=old?.videoLibrary.findIndex(c=>c.id===id);
      if(index==null || index<0)return;
      const camera=old.videoLibrary[index],remaining=old.videoLibrary.filter(c=>c.id!==id);
      const current=old.activeVideoId===id;
      const next=current ? remaining[Math.min(index,remaining.length-1)]?.id??null : old.activeVideoId;
      const keyFor=c=>JSON.stringify([c.annotationRecordingKey,'url',c.video_name,c.byte_size??null,...(c.annotationSourceId?[c.annotationSourceId]:[])]);
      const key=remaining.some(c=>keyFor(c)===keyFor(camera))?null:keyFor(camera);
      const doc=key && this.documents[key],documents={...this.documents};if(key)delete documents[key];
      const removed=this.assets.filter(a=>a.appliedTo===id || a.path===camera.asset && !remaining.some(c=>c.asset===camera.asset));
      const assets=this.assets.filter(a=>!removed.includes(a));
      const project={...old,videoLibrary:remaining,activeVideoId:next};
      await this.store.create(project,assets,documents,()=>this.active===old);
      const positions=removed.map(a=>this.assets.indexOf(a)),time=current?this.video.currentVideoTime:null;
      this.active=project;this.assets=assets;this.documents=documents;this.annotations.store=documentStore(documents,key);
      this.rememberMedia({kind:'close-video',camera,index,key,doc,added:removed,positions,time,previous:old.activeVideoId,selected:next});
      this.recordingChanged(this.state.activeRecording);this.markChanged();
    }
    async selectVideo(id) {
      const before=this.active,camera=before?.videoLibrary.find(d=>d.id===id);
      if(!camera || this.activeVideo?.id===id)return;
      await this.annotations.flush();
      if(before!==this.active)return;
      const project={...before,activeVideoId:id};
      await this.store.request('projects',project.id,project);
      this.active=project;this.recordingChanged(this.state.activeRecording);
    }
    async stageMediaInput(role,file) {
      const key=this.state.activeRecording?.key ?? null;
      const input=role==='clock' ? await BrowserProjectUI.readClock(file) : await this.readAnnotation(file);
      const project=this.workspaceProject(file.name), assets=(this.assets||[]).slice();
      const session=this.clockSession(key);
      if(role==='clock' && key && !session)throw Error(this.importText('manualOnly'));
      if(role==='clock' && session && String(session)!==String(input.session_id))throw Error(dropText('sessionMismatch'));
      if(role==='clock'){
        const existing=assets.findIndex(a=>a.role==='clock' && a.expectedVideoName===input.video?.name && !a.appliedTo);
        if(existing>=0)assets.splice(existing,1);
      }
      const asset={...assetFrom(file),role,recordingId:key,path:`${role}:${crypto.randomUUID()}`};
      asset.expectedVideoName=input.video?.name || input.context?.videoName;
      if(role==='clock')asset.sessionId=String(input.session_id);
      assets.push(asset);
      await this.annotations.flush();
      await this.store.create(project,assets,this.documents||{});
      if(!this.active)await this.openCached(project);
      else {this.active=project;this.assets=assets;this.render();}
      this.markChanged();
      if(role==='annotation' && this.annotations.doc)await this.importPendingAnnotations();
    }
    async readAnnotation(file) {
      if(file.size>50000000)throw Error(dropText('annotationFormat'));
      let data;
      try{data=JSON.parse(await file.text());}catch{throw Error(dropText('annotationFormat'));}
      const A=window.NeuropixelsAnnotations;
      if(data?.schema===A.SCHEMA)A.validate(data,data.context);
      else if(data?.schema!==A.CANDIDATE_SCHEMA || !data.video || !Array.isArray(data.segments))throw Error(dropText('annotationFormat'));
      return data;
    }
    async importPendingAnnotations() {
      const context=this.annotations.key,project=this.active;
      if(!this.annotations.doc || !project || this.importingAnnotations===context)return;
      this.importingAnnotations=context;
      try {
        for(const asset of this.assets||[]){
          if(asset.role!=='annotation' || asset.appliedTo || asset.lastAttempt===context)continue;
          asset.lastAttempt=context;
          try {
            await this.annotations.importFile(fileFrom(asset));
            if(this.annotations.key!==context || this.active?.id!==project.id)return;
            asset.appliedTo=context;delete asset.error;
          }catch(error){asset.error=error.message;}
          await this.store.request('assets',project.id,this.assets);
        }
        this.syncVideo();
      }finally{if(this.importingAnnotations===context)this.importingAnnotations=null;}
    }
    async matchPendingClock(project,assets,key,descriptor) {
      const clock=assets.find(a=>a.role==='clock' && !a.appliedTo && (!a.expectedVideoName || a.expectedVideoName===descriptor.video_name));
      const session=BrowserProjectUI.allenClockSession(project,[key]);
      if(!clock || !session)return;
      const video=assets.find(a=>a.path===descriptor.asset);
      try{
        Object.assign(descriptor,await BrowserProjectUI.clockDetails(fileFrom(clock),video.blob,session));
        assets[assets.indexOf(clock)]={...clock,appliedTo:descriptor.id};
        delete descriptor.clockError;
      }catch(error){descriptor.clockError=error.message;}
    }
    failure(error){if(error?.name!=='AbortError')super.failure(error);}
    async inspect() {
      await this.ensureProject();const r=this.state.activeRecording;if(!r)return;
      const has=name=>r.byName.has(name), v=this.activeVideo;
      const mediaError=this.video.elements.panel.classList.contains('has-error');
      const alignment=this.videoNote();
      const checks=[
        ['神经活动 / 点阵 / 发放率',has('spike_times.npy')&&has('spike_clusters.npy')&&!!r.sampleRate,'spike_times.npy + spike_clusters.npy + 采样率'],
        ['所选区间的空间活动分布',!!r.units?.some(u=>Number.isFinite(u.probe_depth_um))||has('spike_positions.npy')||(has('templates.npy')&&has('spike_templates.npy')&&has('channel_positions.npy')),'Unit 电极坐标、spike_positions.npy 或模板与通道坐标'],
        ['Unit 模板与通道分布',has('templates.npy')&&has('spike_templates.npy')&&has('channel_positions.npy'),r.fromNwb?'原始 Kilosort 文件夹中的 templates.npy、spike_templates.npy 与 channel_positions.npy':'templates.npy + spike_templates.npy + channel_positions.npy；具体布局在选中 Unit 后检查'],
        ['脑区分组',!!r.units?.some(u=>u.brain_region)||!!this.state.regionResult?.count,'NWB 自带的脑区，或 Unit 脑区表'],
        ['视频 / 行为标注',!!v && !mediaError,mediaError?this.video.elements.error.textContent:this.importText('projectVideoHelp'),mediaError?'error':undefined],
        ['时间对齐',alignment.severity==='success',alignment.text || (this.clockSession(r.key)?'导入匹配的 Allen 帧时钟，或手动对齐一个共同事件':this.importText('manualOnly')),alignment.severity==='neutral'?'warning':alignment.severity]
      ];
      const slots=[...document.querySelectorAll('#data-status-groups .file-drop-slot')].map(el=>el.outerHTML).join('');
      const mediaSlot=(name,ok)=>!ok && (name==='视频 / 行为标注'?'video':name==='时间对齐' && alignment.clockAction?'clock':'');
      this.show(`<h2>${esc(this.active.name)}</h2><table class="project-checks" data-project-inputs><tbody>${checks.map(([name,ok,detail,severity=ok?'success':'warning'])=>{
        const kind=mediaSlot(name,ok);
        return `<tr>${this.checkSymbol(severity)}<td ${kind?`class="file-drop-slot" data-import-drop="${kind}"`:''}><strong>${esc(name)}</strong><small>${esc(kind==='video'?dropText('video'):detail)}</small>${kind==='clock'?`<small>${esc(dropText('filesHere',{files:dropText('type.clock')}))}</small>`:''}</td></tr>`;
      }).join('')}</tbody></table>${slots?`<details data-project-inputs><summary>${esc(this.importText('addMissing'))}</summary><div class="missing-file-list">${slots}</div></details>`:''}<p>当前工作区仅在此页面中。导出项目可保存已导入的文件、对齐和标注。</p><div class="project-footer"><button data-project-action="video">添加视频</button><button data-project-action="save-project">导出项目包</button><button data-close-project class="project-primary">进入工作区</button></div>`);
    }
    toggleMenu(value=this.menu.hidden){
      if(value){
        this.menu.querySelectorAll('[data-project-action="open-saved-clusters"]').forEach(entry=>entry.remove());
        const key=this.state.activeRecording?.key;
        for(const asset of this.assets||[]){
          if(asset.role!=='event-analysis'||(asset.recordingId!==key&&!asset.sourceRecordings?.includes(key)))continue;
          const entry=document.createElement('button');
          entry.type='button';
          entry.dataset.projectAction='open-saved-clusters';
          entry.dataset.recording=asset.recordingId;
          entry.textContent=({'zh-CN':'打开已保存的事件放电分析',es:'Abrir análisis de eventos guardado'})[document.documentElement.lang]||'Open saved event analysis';
          if(asset.sourceRecordings?.length)entry.textContent+=' · '+asset.sourceRecordings.map(k=>this.active?.recordingSources?.[k]?.probe||k).join(' + ');
          this.menu.append(entry);
        }
      }
      super.toggleMenu(value);
    }
    async action(action,node) {
      try {
        if(action==='open-saved-clusters'){
          const asset=this.assets?.find(a=>a.role==='event-analysis'&&a.recordingId===node?.dataset.recording);
          if(asset)return await this.openSavedEventAnalysis(asset);
          return;
        }
        if(action==='import-clock')return await this.pickWorkspaceJson('clock');
        if(action==='undo-close-recording')return await this.undoCloseRecording();
        if(action==='video')return this.pick('video');
        if(action==='import-files'){
          const files=await this.selectFiles({multiple:true,accept:'.npy,.py,.tsv,.csv,.json,.nwb,.mp4,.webm,.mov,.avi,.mkv,.neuroproject'});
          if(files.length)await this.importWorkspaceFiles(files);
          return;
        }
        if(action==='append-recordings')return this.newProject('neural',this.active);
        if(action==='undo-media'||action==='redo-media'){
          await this.replayMedia(action==='undo-media');return;
        }
        if(action==='recent'){const p=this.projects.find(p=>p.id===node.dataset.id);if(p && this.confirmReplace()){
          const [assets,annotations]=await Promise.all([this.store.request('assets',p.id),this.store.request('annotations',p.id)]);
          if(!assets)throw Error(this.importText('openHelp'));
          await this.restoreSnapshot({project:p,assets,annotations:annotations||{}});
        }return;}
        if(action==='save-project'||action==='save-as'){this.chooseExport();return;}
        return await super.action(action,node);
      }catch(e){this.failure(e);}
    }
    async pick(kind) {
      try {
        if(kind==='folder'||kind==='nwb'){
          const files=await this.selectFiles({directory:kind==='folder',multiple:true,accept:kind==='nwb'?'.nwb':''});
          if(files.length)await this.importNeuralFiles(files);
        }
        if(kind==='video'){
          const r=this.state.activeRecording,id=this.active?.id;
          const files=await this.selectFiles({multiple:true,accept:'.mp4,.webm,.mov,.avi,.mkv'});if(!files.length)return;
          if(this.active?.id!==id || r!==this.state.activeRecording)return;
          await this.queueWorkspaceEdit(()=>this.attachVideoFiles(files));
        }
        if(kind==='open-project'){
          const [file]=await this.selectFiles({accept:'.neuroproject'});if(!file)return;
          await this.openPackage(file);
        }
      }catch(e){this.failure(e);}
    }
    async openPackage(file) {
      const snapshot=await S.unpack(file);
      if(!this.confirmReplace())return;
      await this.restoreSnapshot(snapshot);
    }
    async restoreSnapshot({project,assets,annotations}) {
      const copy=S.withVideoLibrary({...project,id:crypto.randomUUID()},annotations);
      for(const camera of copy.videoLibrary)if(!camera?.id || !assets.some(a=>a.role==='video' && a.path===camera.asset))throw Error(this.importText('missingFiles')+camera?.video_name);
      this.show('<h2>'+esc(this.importText('readingPackage'))+'</h2>');
      const progress=this.dialog.querySelector('h2');
      try {
        // Validate before replacing the recording currently on screen.
        const files=assets.filter(asset=>!asset.role).map(fileFrom);
        const groups=core.groupExperimentFiles(files,{partial:true});
        copy.recordingIds??=groups.map(group=>group.key);
        const byKey=new Map(groups.map(group=>[group.key,group]));
        const records=await Promise.all(copy.recordingIds.map(async key=>{
          const group=byKey.get(key);
          if(!group)throw Error(this.importText('missingFiles')+key);
          return core.indexExperiment(group,{partial:true});
        }));
        if(!this.dialog.open || !progress.isConnected)return;
        await this.store.create(copy,assets,annotations);
        await this.openCached(copy,null,new Map(records.map(record=>[record.key,record])));
        this.setDirty(false);
      }finally{if(this.dialog.open && progress.isConnected)this.dialog.close();}
    }
    recordingChanged(recording) {
      this.video.recording=recording||null;
      const descriptor=this.descriptorForRecording(this.activeVideo,recording);
      if(descriptor && (this.video.source?.descriptor?.id!==descriptor.id || this.loadedVideoKey!==descriptor.id)){
        const asset=this.assets?.find(a=>a.role==='video'&&a.path===descriptor.asset);
        if(asset){
          if(this.videoUrl)URL.revokeObjectURL(this.videoUrl);
          this.videoUrl=URL.createObjectURL(asset.blob);this.loadedVideoKey=descriptor.id;
          this.video.loadUrl(this.videoUrl,descriptor,{localFile:asset.blob});
        }
      }else if(descriptor && this.video.source?.descriptor?.timeMapping!==descriptor.timeMapping){
        this.reloadAlignment(this.video.currentVideoTime);
      }else if(!descriptor){
        this.video.setRecording(recording,[]);
        if(this.videoUrl){URL.revokeObjectURL(this.videoUrl);this.videoUrl=null;}
        this.loadedVideoKey=null;
      }
      if(this.active)document.getElementById('dataset-title').textContent=this.assets?.length ? this.active.name :
        window.NeuropixelsI18n.translate(document.documentElement.lang,'app.noFolder');
      this.render();
    }
    sourceNwbs(){
      const unique=new Map();
      for(const recording of [this.active,...Object.values(this.active?.recordingSources||{})]){
        const nwb=recording?.sourceNwb;
        if(nwb?.name)unique.set(nwbIdentity(nwb),{name:nwb.name,file:this.sourceNwbFiles.get(nwbIdentity(nwb))});
      }
      return [...unique.values()];
    }
    chooseExport(){
      if(!this.active || this.exporting)return;
      const t=key=>window.NeuropixelsI18n.translate(document.documentElement.lang,'prefs.'+key);
      this.show(`<h2>${esc(t('save'))}</h2><form class="project-export-form"><label><input type="checkbox" name="copy" ${window.showDirectoryPicker?'':'disabled'}> ${esc(t('copyFiles'))}</label><p>${esc(t(window.showDirectoryPicker?'copyHint':'copyUnavailable'))}</p><div class="project-footer"><button type="submit" data-confirm-export class="project-primary">${esc(t('save'))}</button></div></form>`);
      const form=this.dialog.querySelector('form');
      const missing=this.sourceNwbs().filter(nwb=>!nwb.file);
      if(missing.length){
        const note=document.createElement('p');note.hidden=true;
        note.textContent=t('missingRaw')+' '+missing.map(nwb=>nwb.name).join(', ');
        form.elements.copy.onchange=()=>{note.hidden=!form.elements.copy.checked;};
        form.querySelector('.project-footer').before(note);
      }
      form.onsubmit=e=>{
        e.preventDefault();const copy=form.elements.copy.checked;
        this.dialog.close();this.exportProject(copy).catch(error=>{if(error.name!=='AbortError')this.failure(error);});
      };
    }
    async exportProject(copyFiles=false) {
      if(!this.active || this.exporting)return;
      const id=this.active.id;
      const name=diskName(this.active.name)+'.neuroproject';
      this.exporting=true;
      try {
        let handle,parent;
        if(copyFiles)parent=await window.showDirectoryPicker({id:'neuropixels-project-folder',mode:'readwrite'});
        else if(window.showSaveFilePicker){
          try {
            handle=await window.showSaveFilePicker({suggestedName:name,
              types:[{description:'Explorer project',accept:{'application/octet-stream':['.neuroproject']}}]});
          }catch(error){if(error.name!=='SecurityError')throw error;}
        }
        await this.annotations.flush();
        if(this.active?.id!==id)return;
        const revision=this.revision, blob=S.pack(this.active,this.assets,this.documents);
        let folderName;
        if(parent){
          const raw=this.sourceNwbs().map(nwb=>nwb.file).filter(Boolean);
          const files=[...this.assets,...raw.map(f=>({...assetFrom(f),role:'NWB'}))];
          folderName=diskName(this.active.name)+'-'+crypto.randomUUID().slice(0,8);
          const folder=await parent.getDirectoryHandle(folderName,{create:true});
          const inputs=await folder.getDirectoryHandle('inputs',{create:true});
          const groups=new Map();
          for(const asset of files){
            const parts=asset.path.split('/');
            const source=asset.role || parts.slice(0,-1).join('/') || 'recording';
            if(!groups.has(source)){
              const dir=await inputs.getDirectoryHandle(String(groups.size+1)+'-'+diskName(source),{create:true});
              groups.set(source,{dir,names:new Set()});
            }
            const {dir,names}=groups.get(source);
            const base=diskName(asset.name);let leaf=base, n=1;
            while(names.has(leaf.toLowerCase()))leaf=String(++n)+'-'+base;
            names.add(leaf.toLowerCase());
            await writeBlob(await dir.getFileHandle(leaf,{create:true}),asset.blob);
          }
          const packageFile=await folder.getFileHandle(name,{create:true});
          try{await writeBlob(packageFile,blob);}catch(error){await folder.removeEntry(name).catch(()=>{});throw error;}
        }else if(handle){
          await writeBlob(handle,blob);
        }else{
          const url=URL.createObjectURL(blob),a=document.createElement('a');
          a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
          if(!window.confirm(this.importText('downloadCheck')))return;
        }
        if(this.active?.id===id && this.revision===revision)this.setDirty(false);
        this.toast(folderName?window.NeuropixelsI18n.translate(document.documentElement.lang,'prefs.savedIn',{folder:folderName}):this.importText('downloaded'));
      }finally{this.exporting=false;}
    }
    getEventAnalysis(recording) {
      return this.getAnalysis(recording,'event-analysis');
    }
    getPopulationDynamics(recording) {
      return this.getAnalysis(recording,'population-dynamics');
    }
    getAnalysis(recording,role) {
      if(!this.active||!recording)return null;
      if(!['event-analysis','population-dynamics'].includes(role))throw new Error('Unsupported saved analysis role');
      const matches=(this.assets||[]).filter(a=>a.role===role&&a.recordingId===recording.key);
      if(matches.length>1)throw new Error('Project contains ambiguous saved analyses for this Recording');
      return matches[0]?.blob||null;
    }
    async saveEventAnalysis(recording,blob) {
      return this.saveAnalysis(recording,blob,'event-analysis','event-response');
    }
    async savePopulationDynamics(recording,blob,options={}) {
      return this.saveAnalysis(recording,blob,'population-dynamics','population-dynamics',options);
    }
    async saveAnalysis(recording,blob,role,directory,options={}) {
      if(!['event-analysis','population-dynamics'].includes(role))throw new Error('Unsupported saved analysis role');
      await this.ensureProject();const id=this.active.id,key=recording.key;
      const sources=recording.jointSourceRecords||[recording];
      const belongs=()=>this.state.activeRecording===recording || sources.every(r=>r && this.state.recordings?.includes(r));
      if(!belongs())throw new Error('Recording changed before analysis save');
      if(options.isCurrent&&!options.isCurrent())throw new Error('Analysis cancelled or changed before project save');
      await this.annotations.flush();
      if(this.active?.id!==id||!belongs())throw new Error('Project changed before analysis save');
      if(options.isCurrent&&!options.isCurrent())throw new Error('Analysis cancelled or changed before project save');
      const asset={path:`analyses/${directory}/${encodeURIComponent(key)}.neuroanalysis`,name:`${directory}.neuroanalysis`,role,recordingId:key,type:'application/octet-stream',blob};
      if(recording.jointSources)asset.sourceRecordings=recording.jointSources.slice();
      const isCurrent=()=>this.active?.id===id&&belongs()&&(!options.isCurrent||options.isCurrent());
      const {project,assets}=await this.store.saveAnalysis(id,key,asset,{...options,isCurrent});
      if(this.active?.id===id){this.active=project;this.assets=assets;this.markChanged();}
    }
    render() {
      super.render();
      window.NeuropixelsUnitMarks?.sync();
      if(this.browserLocal){
        const videoPick=this.projectActions.querySelector('[data-project-action="video"]');
        if(videoPick){videoPick.disabled=false;videoPick.dataset.importDrop='video';}
        for(const control of [videoPick,document.getElementById('replace-video'),document.getElementById('choose-local-video'),this.menu.querySelector('[data-project-action="video"]')]){
          if(!control)continue;
          (control.querySelector('strong')||control).textContent=this.importText('addVideo');
          control.title=this.importText('projectVideoHelp');
        }
        const pick=this.projectActions.querySelector('[data-project-action="new"]');
        pick.dataset.projectAction='import-files';pick.removeAttribute('data-help-key');
        pick.textContent=this.importText('importFilesNow');pick.title=this.importText('importNowHelp')+'\n'+this.neuralFormats();
        this.menu.querySelector('[data-project-action="save-as"]')?.remove();
        const save=this.menu.querySelector('[data-project-action="save-project"] strong');
        if(save)save.textContent=window.NeuropixelsI18n.translate(document.documentElement.lang,'prefs.save');
        this.renderExport();
      }
      if(this.active&&this.browserLocal){
        const add=document.createElement('button');add.type='button';add.dataset.projectAction='append-recordings';add.textContent=this.importText('appendRecords');
        this.menu.querySelector('[data-project-action="inspect"]')?.before(add);
        if(this.lastClosedRecording){
          const undo=document.createElement('button');undo.type='button';undo.dataset.projectAction='undo-close-recording';
          undo.textContent=this.importText('restoreRecording')+' · '+this.lastClosedRecording.name;
          this.menu.prepend(undo);
        }
      }
      if(this.videoTabs){
        const cameras=this.active?.videoLibrary||[],signature=JSON.stringify([document.documentElement.lang,cameras.map(c=>[c.id,c.video_name]),this.activeVideo?.id]);
        if(signature!==this.videoTabSignature){
          this.videoTabSignature=signature;this.videoTabs.hidden=!cameras.length;
          const close=this.importText('closeVideo');
          const restoreFocus=this.videoTabs.contains(document.activeElement);
          this.videoTabs.replaceChildren(...cameras.map((c,i)=>{
            const tab=window.NeuropixelsWorkspaceTabs.create({
              label:(i+1)+' · '+c.video_name,title:c.video_name,active:c.id===this.activeVideo?.id,closeLabel:close+' · '+c.video_name,
              onSelect:()=>this.queueWorkspaceEdit(()=>this.selectVideo(c.id)).catch(e=>this.failure(e)),
              onClose:()=>this.queueWorkspaceEdit(()=>this.closeVideo(c.id)).catch(e=>this.failure(e))
            });
            tab.wrapper.classList.add('video-tab');tab.button.dataset.videoId=c.id;tab.close.dataset.closeVideo=c.id;return tab.wrapper;
          }));
          const tab=this.videoTabs.querySelector('[aria-pressed=true]');
          if(restoreFocus)tab?.focus({preventScroll:true});
          window.NeuropixelsWorkspaceTabs.reveal(tab);
        }
      }
      const history=this.mediaHistory;
      if(!history)return;
      for(const [stack,action] of [[history.past,'undo'],[history.future,'redo']]){
        const edit=stack.at(-1);if(!edit)continue;
        const lang=document.documentElement.lang;
        const verb=lang.startsWith('zh')?(action==='undo'?'撤销':'重做'):lang.startsWith('es')?(action==='undo'?'Deshacer':'Rehacer'):(action==='undo'?'Undo':'Redo');
        const noun=edit.kind==='close-video'?this.importText('closeVideo'):edit.kind==='video'?(lang.startsWith('zh')?'添加视频':lang.startsWith('es')?'añadir vídeo':'add video'):(lang.startsWith('zh')?'时间对齐':lang.startsWith('es')?'alineación':'alignment');
        const button=document.createElement('button');button.type='button';button.dataset.projectAction=action+'-media';button.textContent=verb+' '+noun;this.menu.prepend(button);
      }
    }
    static allenClockSession(project,keys){
      if(!keys?.length)return null;
      const sessions=keys.map(key=>{
        const source=project?.recordingSources?.[key] || (project?.recordingIds?.length===1 && project.recordingIds[0]===key ? project : null);
        // Earlier standalone versions named Allen recordings allen-<session>-<probe>.
        const legacy=source?.session && source.probe && key==='allen-'+source.session+'-'+source.probe;
        return source?.session!=null && (source.nwbKind==='Allen NWB'||(!source.nwbKind && legacy)) ? String(source.session) : null;
      });
      return sessions.every(value=>value===sessions[0]) ? sessions[0] : null;
    }
    clockSession(key){
      const r=this.state.activeRecording;
      return BrowserProjectUI.allenClockSession(this.active,r?.key===key && r.jointSources ? r.jointSources : [key]);
    }
    descriptorForRecording(camera,recording){
      if(!camera || !recording || camera.timeMapping?.method!=='frame_timestamps')return camera;
      const selected=BrowserProjectUI.allenClockSession(this.active,recording.jointSources||[recording.key]);
      const bound=camera.clockSessionId ?? BrowserProjectUI.allenClockSession(this.active,this.active?.recordingIds);
      return selected && selected===bound ? camera : {...camera,timeMapping:null};
    }
    videoNote() {
      const key=this.state.activeRecording?.key??null, media=this.video.source, descriptor=media?.descriptor;
      const session=this.clockSession(key);
      if(this.clockCheck?.source===media && media)return {text:dropText('checking',{percent:this.clockCheck.percent}),severity:'neutral'};
      const clockAction=dropText('clockDrop');
      if(this.clockFailure?.source===media && media && session)return {...this.clockFailure,clockAction:session && clockAction};
      if(descriptor?.clockError && session)return {text:descriptor.clockError,severity:session?'error':'warning',clockAction:session && clockAction};
      const pendingClock=this.assets?.find(a=>a.role==='clock' && !a.appliedTo && (!media || !a.expectedVideoName || a.expectedVideoName===media.name));
      if(pendingClock && (!media || key==null))return {text:dropText(key==null && !media?'clockNeedsBoth':!media?'clockNeedsVideo':'clockNeedsSignal',{file:pendingClock.name}),severity:'warning'};
      if(!media || key==null)return {text:media?this.importText('videoReady'):'',severity:media?'warning':'neutral',clockAction:(!key || session) && clockAction};
      if(descriptor?.asset && this.video.mapping.method==='unmapped')
        return session ? {text:dropText('needAlignment',{file:media.name}),severity:'warning',clockAction}
          : {text:this.importText('manualOnly'),severity:'warning'};
      if(this.video.mapping.method==='manual_offset')return {text:this.importText('manual_alignment'),severity:'warning',clockAction:session && clockAction};
      if(session && descriptor?.asset && this.video.mapping.verificationStatus!=='verified')return {...super.videoNote(),clockAction};
      return super.videoNote();
    }
    syncVideo() {
      super.syncVideo();
      const key=this.state.activeRecording?.key??null, media=this.video.source;
      const follow=this.video.elements.follow;
      if(follow)follow.disabled=!media || key==null || this.video.mapping.method==='unmapped';
      if(this.video.elements.offset)this.video.elements.offset.disabled=key==null;
      document.getElementById('video-alignment').hidden=!media || key==null;
    }
    rememberMedia(edit){
      const history=this.mediaHistory;
      history.past.push(edit);if(history.past.length>8)history.past.shift();history.future=[];
      this.render();
    }
    async editMedia(r,next,asset,kind) {
      const old=this.active, before=this.activeVideo;
      if(!before || kind!=='alignment')return;
      const project={...old,videoLibrary:old.videoLibrary.map(c=>c===before?next:c)};
      const at=this.video.currentVideoTime;
      const assets=asset?[...this.assets,asset]:this.assets;
      await this.store.create(project,assets,this.documents,()=>this.active===old && this.activeVideo===before);
      this.active=project;this.assets=assets;this.rememberMedia({kind,before,after:next,added:asset?[asset]:[]});
      this.reloadAlignment(at);this.dialog.close();this.markChanged();
    }
    reloadAlignment(at){
      const camera=this.descriptorForRecording(this.activeVideo,this.state.activeRecording);
      if(camera && this.video.source?.descriptor?.id===camera.id){
        this.video.source.descriptor=camera;
        this.video.mapping=new window.NeuropixelsVideoSync.TimeMapping(camera.timeMapping||{method:'unmapped'});
        Object.assign(this.video.source,window.NeuropixelsVideoSync.frameTiming(camera,this.video.mapping));
        this.video._configureDuration(this.video.source.duration);
        this.video.seekVideo(at,{preserveView:true});this.video._renderStatus();this.video._emitState();
      }
      this.render();
    }
    async replayMedia(undo) {
      const old=this.active, history=this.mediaHistory;
      if(!old || !history)return;
      const stack=undo?history.past:history.future,edit=stack.at(-1);if(!edit)return;
      await this.annotations.flush();
      let cameras=old.videoLibrary, assets=this.assets,selected=old.activeVideoId;
      let documents=this.documents;
      if(edit.kind==='close-video'){
        cameras=cameras.filter(c=>c.id!==edit.camera.id);
        if(undo)cameras.splice(Math.min(edit.index,cameras.length),0,edit.camera);
        if(undo && selected===edit.selected)selected=edit.previous;
        if(!undo && selected===edit.camera.id)selected=edit.selected;
        documents={...this.documents};
        if(edit.key){
          if(undo && edit.doc)documents[edit.key]=edit.doc;
          if(!undo){edit.doc=documents[edit.key];delete documents[edit.key];}
        }
      }else if(edit.kind==='video'){
        const ids=new Set(edit.cameras.map(c=>c.id));
        cameras=undo?cameras.filter(c=>!ids.has(c.id)):[...cameras,...edit.cameras];
        selected=undo?edit.previous:edit.selected;
      }else{
        const camera=undo?edit.before:edit.after;
        if(!cameras.some(c=>c.id===camera.id))return;
        cameras=cameras.map(c=>c.id===camera.id?camera:c);
      }
      const paths=new Set(edit.added.map(a=>a.path));
      if(edit.kind==='close-video' && undo){
        assets=assets.slice();
        edit.added.forEach((a,i)=>assets.splice(edit.positions[i],0,a));
      }else assets=edit.kind==='close-video' || undo?assets.filter(a=>!paths.has(a.path)):[...assets,...edit.added];
      for(const change of edit.changed||[])assets=assets.map(a=>a.path===change.before.path?(undo?change.before:change.after):a);
      const project={...old,videoLibrary:cameras,activeVideoId:selected};
      await this.store.create(project,assets,documents,()=>this.active===old);
      stack.pop();(undo?history.future:history.past).push(edit);
      this.active=project;this.assets=assets;
      if(edit.kind==='close-video'){this.documents=documents;this.annotations.store=documentStore(documents,undo?null:edit.key);}
      if(edit.kind==='alignment')this.reloadAlignment(this.video.currentVideoTime);
      else {
        this.recordingChanged(this.state.activeRecording);
        if(undo && edit.kind==='close-video' && edit.time!=null && selected===edit.camera.id){
          const video=this.video.elements.video;
          const seek=()=>{if(this.activeVideo?.id===selected)this.video.seekVideo(edit.time,{preserveView:true});};
          if(video.readyState>=1)seek();else video.addEventListener('loadedmetadata',seek,{once:true});
        }
      }
      this.markChanged();
    }
    static async verifyClockVideo(blob, expected, onProgress) {
      if (!blob || !/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('缺少视频文件或有效的帧时钟 SHA-256。');
      const hash = await window.hashwasm.createSHA256();
      const chunkBytes = 1024 * 1024;
      for (let start = 0; start < blob.size; start += chunkBytes) {
        const end = Math.min(start + chunkBytes, blob.size);
        hash.update(new Uint8Array(await blob.slice(start, end).arrayBuffer()));
        onProgress?.(end, blob.size);
      }
      if (hash.digest('hex') !== expected) throw new Error('帧时钟的 SHA-256 与当前视频不匹配。');
    }
    static async readClock(file) {
      let clock;
      try { clock=JSON.parse(await file.text()); }
      catch { throw new Error(dropText('clockFormat')); }
      if (clock?.schema!=='allen-video-clock/1' || !clock.session_id) throw new Error(dropText('clockFormat'));
      const m=clock.timeMapping, v=clock.video;
      if (!/^[a-f0-9]{64}$/.test(v?.sha256||'') || !m?.provenance?.frame_clock || m.verification_status!=='verified' ||
          !Number.isFinite(m.offset_s) || !Number.isFinite(m.scale) || m.scale<=0 ||
          !Number.isFinite(v?.fps) || v.fps<=0 || !Number.isFinite(v.duration_s) || v.duration_s<=0) throw new Error(dropText('clockFormat'));
      const mapping=new window.NeuropixelsVideoSync.TimeMapping(m);
      window.NeuropixelsVideoSync.frameTiming(v,mapping);
      return clock;
    }
    static async clockDetails(file,videoBlob,session,onProgress) {
      const clock=await BrowserProjectUI.readClock(file);
      if (!session) throw Object.assign(new Error(dropText('needAllenSession')),{severity:'warning'});
      if (String(clock.session_id)!==String(session)) throw new Error(dropText('sessionMismatch'));
      const m=clock.timeMapping,v=clock.video;
      await BrowserProjectUI.verifyClockVideo(videoBlob,v.sha256,onProgress);
      const details={clockSessionId:String(clock.session_id),timeMapping:m,frame_rate_hz:v.fps,duration_s:v.duration_s};
      if(v.frame_count)details.frame_count=v.frame_count;
      if(v.frame_times_s)details.frame_times_s=v.frame_times_s;
      return details;
    }
    alignment(droppedClock) {
      if(!this.video.source)return;
      const r=this.state.activeRecording,descriptor=this.activeVideo,source=this.video.source;
      if (!descriptor || source.descriptor?.asset!==descriptor.asset) {
        if (droppedClock) throw new Error(dropText('needVideo'));
        return super.alignment();
      }
      const id=this.active.id;
      const session=this.clockSession(r?.key);
      const ownsSource=()=>this.active?.id===id && this.state.activeRecording===r && this.video.source===source && this.activeVideo===descriptor;
      const applyClock=async(file,current,status)=>{
        const asset=this.assets.find(a=>a.path===descriptor.asset);
        let percent=-1;
        const details=await BrowserProjectUI.clockDetails(file,asset?.blob,session,(done,total)=>{
          if(!current())throw new DOMException('Clock import cancelled','AbortError');
          const next=Math.floor(100*done/total);
          if(next!==percent){percent=next;status(percent);}
        });
        if(current()){
          const next={...descriptor,...details};
          delete next.clockError;
          await this.editMedia(r,next,mediaInput(file,'clock',descriptor.id),'alignment');
        }
      };
      if(droppedClock){
        if(!session)throw Error(this.importText('manualOnly'));
        const button=this.dialog.open ? this.dialog.querySelector('[data-clock]') : null;
        const current=()=>ownsSource() && (!button || this.dialog.open && button.isConnected);
        const check=this.clockCheck={source,percent:0};
        this.clockFailure=null;
        this.renderVideoNote();
        return applyClock(droppedClock,current,percent=>{
          check.percent=percent;
          const text=dropText('checking',{percent});
          this.renderVideoNote();
          if(button)button.textContent=text;
        }).catch(error=>{
          if(current() && this.clockCheck===check && error.name!=='AbortError' && this.video.mapping.method==='unmapped')
            this.clockFailure={source,text:error.message,severity:error.severity || 'error'};
          throw error;
        }).finally(()=>{
          if(this.clockCheck===check)this.clockCheck=null;
          if(button?.isConnected)button.textContent=this.importText('clock');
          this.syncVideo();
        });
      }
      const t=key=>esc(this.importText(key));
      this.show(`<h2>${t('align')}</h2>${session?`<section data-import-drop="clock"><p>${t('clockFormats')}</p><button type="button" data-clock>${t('clock')}</button></section>`:''}
        <form data-align><h3>${t('manual')}</h3><label>${t('videoTime')}<input name="video" type="number" step="any" required value="${this.video.currentVideoTime}"></label>
        <label>${t('neuralTime')}<input name="neural" type="number" step="any" required value="${this.state.experimentView.cursorTime||0}"></label><button>${t('apply')}</button></form>`);
      const save=async(mapping,extra={})=>{
        if(this.active?.id!==id || this.state.activeRecording!==r || this.activeVideo!==descriptor || !this.dialog.open)return;
        new window.NeuropixelsVideoSync.TimeMapping(mapping);
        const next={...descriptor,timeMapping:mapping,...extra};
        delete next.clockError;
        await this.editMedia(r,next,undefined,'alignment');
      };
      this.dialog.querySelector('form').onsubmit=e=>{e.preventDefault();save({method:'manual_offset',offset_s:Number(e.target.elements.neural.value)-Number(e.target.elements.video.value),scale:1,verification_status:'unverified'}).catch(e=>this.failure(e));};
      const clockButton=this.dialog.querySelector('[data-clock]');
      if(!clockButton)return;
      const label=clockButton.textContent;
      const current=()=>clockButton.isConnected && this.dialog.open && ownsSource();
      clockButton.onclick=async()=>{try{
        clockButton.disabled=true;
        const [file]=await this.selectFiles({accept:'.json'});if(!file||!current())return;
        await this.alignment(file);
      }catch(e){if(current())this.failure(e);}finally{clockButton.disabled=false;clockButton.textContent=label;}};
    }
  }
  window.NeuropixelsBrowserProjectUI=BrowserProjectUI;
})();
