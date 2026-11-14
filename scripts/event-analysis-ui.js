// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const E=window.NeuropixelsEventAnalysis, P=window.NeuropixelsEventAnalysisStorage, core=window.NeuropixelExplorerCore;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const COPY={
    en:{title:'Event responses',intro:'Align Unit spikes to event starts, then compare response profiles.',source:'Event source',experiment:'Experimental events',annotation:'Video annotations',type:'Event type / label',units:'Unit IDs, separated by commas',useSelected:'Use selected Unit',useAll:'Use all available Units',coverage:'Valid neural recording intervals (seconds, JSON)',coverageHelp:'Enter acquisition coverage, for example [[0,3600],[3610,7200]]. A last spike or video duration is not recording coverage. User-entered coverage remains unverified.',start:'Window start (s)',end:'Window end (s)',bin:'Bin width (s)',k:'Clusters (0 = response only)',normalization:'Cluster features',shape:'Within-Unit z-score',rate:'Unscaled rate (Hz)',seed:'Random seed',active:'Active experimental block only',run:'Compute responses',cancel:'Cancel computation',close:'Back to signals',ready:'Choose events and Units, then specify valid recording intervals.',loading:'Reading event metadata…',computing:'Computing in a separate worker…',cancelled:'Computation cancelled. Source data are unchanged.',empty:'No matching events. Choose an event type or save a named video annotation.',unavailable:'Open a local Recording with spike arrays first. Indexed-service event analysis is not available yet.',coverageNote:'Coverage is user-declared and unverified. Events with incomplete windows are excluded.',limit:'Exploratory response groups are not cell types or causal effects. No significance or cluster-stability claim is made.',stale:'Inputs changed. Recompute before exporting or returning to source.',export:'Export analysis JSON',return:'Show Unit at event',event:'Source event',selected:'Selected Unit',mean:'Mean response (Hz)',raster:'Trial raster (binned spike counts)',group:'Response group',excluded:'Excluded',invalid:'Enter comma-separated integer Unit IDs.',readError:'Could not read events: ',done:'Computed',trials:'events',bins:'bins',note:'This preview exports separately. Analysis results are not yet restored from a project package.'},
    'zh-CN':{title:'事件响应',intro:'按事件起点对齐 Unit spike，再比较响应形状。',source:'事件来源',experiment:'实验事件',annotation:'视频标注',type:'事件类型 / 标签',units:'Unit ID，以逗号分隔',useSelected:'使用所选 Unit',useAll:'使用全部可用 Unit',coverage:'有效神经记录区间（秒，JSON）',coverageHelp:'填写采集有效区间，例如 [[0,3600],[3610,7200]]。最后一次 spike 或视频时长不是记录覆盖范围；手动填写仍标记为未验证。',start:'窗口起点（秒）',end:'窗口终点（秒）',bin:'分箱宽度（秒）',k:'聚类数（0 = 仅响应）',normalization:'聚类特征',shape:'Unit 内 z-score',rate:'原始发放率（Hz）',seed:'随机种子',active:'仅活跃实验区块',run:'计算响应',cancel:'取消计算',close:'返回信号',ready:'选择事件和 Unit，并填写有效记录区间。',loading:'正在读取事件元数据…',computing:'正在独立 Worker 中计算…',cancelled:'计算已取消，源数据未改变。',empty:'没有匹配事件。请选择事件类型，或命名并保存视频标注。',unavailable:'请先打开包含 spike 数组的本地 Recording。暂不支持索引服务中的事件分析。',coverageNote:'覆盖范围由用户填写，尚未验证；窗口覆盖不完整的事件会被排除。',limit:'这些探索性分组不是细胞类型或因果效应，也不代表显著性或聚类稳定性已经验证。',stale:'输入已改变，请重新计算后再导出或回看来源。',export:'导出分析 JSON',return:'在事件处查看 Unit',event:'原始事件',selected:'所选 Unit',mean:'平均响应（Hz）',raster:'试次栅格（分箱 spike 数）',group:'响应分组',excluded:'已排除',invalid:'请填写以逗号分隔的整数 Unit ID。',readError:'无法读取事件：',done:'已计算',trials:'个事件',bins:'个分箱',note:'当前预览单独导出分析结果，项目包尚不恢复分析结果。'},
    es:{title:'Respuestas a eventos',intro:'Alinea los spikes al inicio de los eventos y compara los perfiles.',source:'Origen',experiment:'Eventos experimentales',annotation:'Anotaciones de vídeo',type:'Tipo / etiqueta',units:'IDs de Unit separados por comas',useSelected:'Usar Unit seleccionado',useAll:'Usar todos los Units',coverage:'Intervalos válidos de registro neural (segundos, JSON)',coverageHelp:'Introduce la cobertura de adquisición, por ejemplo [[0,3600],[3610,7200]]. El último spike o la duración del vídeo no definen la cobertura. La entrada manual no está verificada.',start:'Inicio (s)',end:'Fin (s)',bin:'Ancho de intervalo (s)',k:'Grupos (0 = solo respuesta)',normalization:'Características',shape:'Z-score dentro de cada Unit',rate:'Tasa sin escalar (Hz)',seed:'Semilla',active:'Solo bloque experimental activo',run:'Calcular respuestas',cancel:'Cancelar cálculo',close:'Volver a señales',ready:'Elige eventos y Units e introduce la cobertura válida.',loading:'Leyendo eventos…',computing:'Calculando en un worker separado…',cancelled:'Cálculo cancelado. Los datos originales no cambiaron.',empty:'No hay eventos. Elige un tipo o guarda una anotación con nombre.',unavailable:'Abre primero un Recording local con arrays de spikes. El servicio indexado aún no admite este análisis.',coverageNote:'Cobertura declarada por el usuario, sin verificar. Se excluyen ventanas incompletas.',limit:'Los grupos exploratorios no son tipos celulares ni efectos causales. No se ha validado significación ni estabilidad.',stale:'Las entradas cambiaron. Vuelve a calcular antes de exportar.',export:'Exportar análisis JSON',return:'Ver Unit en el evento',event:'Evento original',selected:'Unit seleccionado',mean:'Respuesta media (Hz)',raster:'Raster de ensayos (recuento por intervalo)',group:'Grupo de respuesta',excluded:'Excluidos',invalid:'Introduce IDs enteros separados por comas.',readError:'No se pueden leer eventos: ',done:'Calculado',trials:'eventos',bins:'intervalos',note:'Esta vista exporta por separado. El paquete de proyecto aún no restaura los resultados.'}
  };
  const EXTRA={
    en:{save:'Save analysis in project',saved:'Analysis saved. Export the project package to retain a portable copy.',restored:'Restored saved analysis; source content verified.',checking:'Checking source content…',sourceCoverage:'Use source observation intervals',sourceCoverageNote:'Coverage comes from NWB observation intervals common to all selected Units. This preserves the source claim; it is not independent acquisition validation.',note:'Save analysis in project to restore the latest saved result for this Recording. Project export includes its counts, rates and provenance.',saveUnavailable:'Create or open a browser project before saving analysis.',restoreFailed:'Saved analysis was not restored: '},
    'zh-CN':{save:'将分析保存到项目',saved:'分析已保存。导出项目包可保留可迁移副本。',restored:'已恢复分析，来源内容核对通过。',checking:'正在核对来源内容…',sourceCoverage:'使用来源观测区间',sourceCoverageNote:'采用 NWB 中所有所选 Unit 的共同观测区间。这保留来源声明，不等于独立验证了采集覆盖。',note:'保存到项目后，可恢复此 Recording 最近一次保存的分析；项目导出包含计数、发放率与来源信息。',saveUnavailable:'请先创建或打开浏览器项目再保存分析。',restoreFailed:'未恢复已保存分析：'},
    es:{save:'Guardar análisis en el proyecto',saved:'Análisis guardado. Exporta el proyecto para conservar una copia portátil.',restored:'Análisis restaurado; contenido de origen verificado.',checking:'Verificando contenido de origen…',sourceCoverage:'Usar intervalos de observación de origen',sourceCoverageNote:'Cobertura común a todos los Units seleccionados según NWB. Conserva la declaración del origen, sin validación independiente de adquisición.',note:'Guarda el análisis para restaurar el último resultado de este Recording. El proyecto exportado incluye recuentos, tasas y procedencia.',saveUnavailable:'Crea o abre un proyecto de navegador antes de guardar.',restoreFailed:'No se restauró el análisis guardado: '}
  };
  for(const [language,extra]of Object.entries(EXTRA))Object.assign(COPY[language],extra);
  const POPULATION_COPY={
    en:{population:'Population and response groups',allGroups:'All Units',ungrouped:'Ungrouped Units',members:'Group members',groupMean:'Equal-Unit mean response (Hz)',heatmap:'Within-Unit z-score heatmap',heatmapNote:'Display only: z-score across response bins, not a baseline change. Colors clip at ±3. Pixel blocks average adjacent Units/bins when needed; use the member list to select an exact Unit.',stability:'Check trial split-half sensitivity (4 splits)',stabilityTitle:'Split-half sensitivity at fixed cluster count',stabilityNote:'ARI compares group assignments between event halves, allowing label permutations. Repeats reuse events. This is not an independent replication, confidence interval, significance test or evidence of cell types.',subject:'Annotation subject',track:'Annotation track',all:'All',showUnit:'Show Unit without changing time',stabilityNotRun:'Not requested',splits:'successful splits'},
    'zh-CN':{population:'群体与响应分组',allGroups:'全部 Unit',ungrouped:'未分组 Unit',members:'组内成员',groupMean:'各 Unit 等权平均响应（Hz）',heatmap:'Unit 内 z-score 热图',heatmapNote:'仅用于显示：沿响应时间 bins 计算 z-score，不是相对基线的变化。颜色截断于 ±3；像素不足时平均相邻 Unit / bins。请通过成员列表精确选择 Unit。',stability:'检查试次对半敏感性（4 次划分）',stabilityTitle:'固定聚类数的对半敏感性',stabilityNote:'ARI 比较两半事件的分组，允许组编号置换。各次划分重复使用事件，不是独立复现、置信区间、显著性检验或细胞类型证据。',subject:'标注主体',track:'标注轨道',all:'全部',showUnit:'查看 Unit，保持时间不变',stabilityNotRun:'未请求',splits:'次有效划分'},
    es:{population:'Población y grupos de respuesta',allGroups:'Todos los Units',ungrouped:'Units sin grupo',members:'Miembros',groupMean:'Media con igual peso por Unit (Hz)',heatmap:'Mapa z-score dentro de cada Unit',heatmapNote:'Solo visualización: z-score entre intervalos, no cambio respecto a una línea base. Colores limitados a ±3. Los bloques promedian Units/intervalos adyacentes; elige el Unit exacto en la lista.',stability:'Comprobar sensibilidad entre mitades (4 divisiones)',stabilityTitle:'Sensibilidad entre mitades con k fijo',stabilityNote:'ARI compara asignaciones entre mitades permitiendo permutar etiquetas. Las divisiones reutilizan eventos. No es replicación independiente, intervalo de confianza, prueba de significación ni evidencia de tipos celulares.',subject:'Sujeto de anotación',track:'Pista de anotación',all:'Todos',showUnit:'Ver Unit sin cambiar el tiempo',stabilityNotRun:'No solicitado',splits:'divisiones válidas'}
  };
  for(const [language,extra]of Object.entries(POPULATION_COPY))Object.assign(COPY[language],extra);
  COPY.en.invalidTimes='This NWB contains invalid_times metadata. Its scope has not been applied to events, spikes or observation coverage. Probe, stimulus and other tags are not interchangeable. Review the original validity information before interpreting these responses. Metadata and limitations are retained in analysis provenance.';
  COPY['zh-CN'].invalidTimes='此 NWB 包含 invalid_times 元数据，其作用范围尚未应用到事件、spike 或观察覆盖区间。探针、刺激及其他标签不能混用。解释响应前，请检查原始有效性信息。分析来源会保留该元数据和限制。';
  COPY.es.invalidTimes='Este NWB contiene metadatos invalid_times. Su ámbito no se ha aplicado a eventos, spikes ni cobertura. Las etiquetas de sonda, estímulo y otros ámbitos no son intercambiables. Revisa la validez original antes de interpretar las respuestas. Los metadatos y límites se conservan en la procedencia.';
  COPY.en.annotationHelp='Save a named manual annotation to use it directly. Unconfirmed model candidates stay separate. Responses align to the start; the interval end is retained, not used as the alignment point.';
  COPY['zh-CN'].annotationHelp='手动标注命名并保存后即可直接使用，无需重复确认。未确认的模型候选仍保持待确认。响应按起点对齐，保留终点但不按终点对齐。';
  COPY.es.annotationHelp='Guarda una anotación manual con nombre para usarla directamente. Los candidatos sin confirmar se mantienen separados. La respuesta se alinea al inicio; se conserva el final sin usarlo para la alineación.';
  COPY.en.annotationAssetNote='Annotation rows in the event file are not experimental events. Load their annotation document with the video and choose Video annotations to use the current labels and time mapping.';
  COPY['zh-CN'].annotationAssetNote='事件文件中的标注行不是实验事件。请加载对应视频和标注文档，再选择“视频标注”，使用当前标签与时间映射。';
  COPY.es.annotationAssetNote='Las filas de anotación del archivo no son eventos experimentales. Carga su documento con el vídeo y elige Anotaciones de vídeo para usar las etiquetas y la sincronización actuales.';
  COPY.en.metadataLimit='Source event or observation metadata could not be fully read. Current manual annotations can still be used; missing validity information remains unresolved and is saved with the analysis.';
  COPY['zh-CN'].metadataLimit='来源事件或观测元数据未能完整读取。当前手动标注仍可使用；缺失的有效性信息仍未解决，并随分析保存。';
  COPY.es.metadataLimit='No se pudieron leer todos los metadatos de eventos u observación. Las anotaciones manuales actuales siguen disponibles; la información de validez pendiente se conserva en el análisis.';
  class EventAnalysisUI {
    constructor(options) {
      Object.assign(this,options);this.epoch=0;this.recordingKey=null;
      this.dialog=document.createElement('dialog');this.dialog.className='event-analysis-dialog';this.dialog.id='event-analysis-dialog';document.body.append(this.dialog);
      this.button.onclick=()=>this.open();
      this.dialog.addEventListener('close',()=>{if(!this.dialog.open)this.cancel(false);});
      this.dialog.addEventListener('cancel',()=>this.cancel(false));
      this.dialog.addEventListener('click',e=>this.action(e.target.closest('[data-ea-action]')?.dataset.eaAction));
      this.dialog.addEventListener('change',e=>{
        if(['source','subject','track'].includes(e.target.name)){this.result=null;this.resultPanel?.replaceChildren();if(e.target.name==='source')this.populateFilters();this.populateTypes();}
        else if(e.target.name==='populationGroup')this.drawPopulation();
        else if(e.target.name==='populationUnit'){this.input('resultUnit').value=e.target.value;this.selectUnit?.(Number(e.target.value));this.draw();}
        else if(e.target.name==='resultUnit'||e.target.name==='resultEvent'){if(e.target.name==='resultUnit'){this.selectUnit?.(Number(e.target.value));const members=this.input('populationUnit');if([...members.options].some(o=>o.value===e.target.value))members.value=e.target.value;else members.selectedIndex=-1;}this.draw();}
        else {this.result=null;this.resultPanel?.replaceChildren();if(e.target.name==='unitIds')this.invalidateSourceCoverage();else if(e.target.name==='coverage')this.coverageProof=null;}
      });
      this.update();
    }
    t(key){return (COPY[document.documentElement.lang]||COPY.en)[key]||COPY.en[key]||key;}
    identity(){const r=this.state.activeRecording;return r?`${this.state.datasetToken}:${r.key}:${r.dataVersion||0}`:null;}
    signature(){return JSON.stringify({identity:this.identity(),annotation:this.annotations.doc,mapping:this.video.mapping?.toJSON?.()});}
    update(){
      const key=this.identity();if(key!==this.recordingKey){this.cancel(false);this.result=null;this.recordingKey=key;if(this.dialog.open)this.dialog.close();}
      this.button.textContent=this.t('title');this.button.disabled=!key;
    }
    input(name){return this.dialog.querySelector(`[name="${name}"]`);}
    status(text,error=false){const node=this.dialog.querySelector('[data-ea-status]');if(node){node.textContent=text;node.dataset.error=String(error);}}
    async open(){
      this.update();const r=this.state.activeRecording;if(!r?.spikeTimesFile||!r?.spikeClustersFile){this.toast(this.t('unavailable'));return;}
      this.cancel(false);this.result=null;this.events=null;this.coverage=null;this.coverageProof=null;this.sourceError=null;this.coverageError=null;
      const field=(name,label,value,type='number')=>`<label>${esc(this.t(label))}<input name="${name}" type="${type}" ${type==='number'?'step="any"':''} value="${esc(value)}" required></label>`;
      this.dialog.innerHTML=`<header><div><h2>${esc(this.t('title'))}</h2><p>${esc(this.t('intro'))}</p></div><button type="button" data-ea-action="close">${esc(this.t('close'))}</button></header>
        <details data-ea-settings open><summary>${esc(this.t('source'))} / ${esc(this.t('units'))}</summary><form><div class="event-analysis-fields">
        <label>${esc(this.t('source'))}<select name="source"><option value="experiment">${esc(this.t('experiment'))}</option><option value="annotation">${esc(this.t('annotation'))}</option></select></label>
        <label>${esc(this.t('type'))}<select name="eventType"></select></label>
        <p class="event-wide" data-ea-source-note></p>
        <label>${esc(this.t('subject'))}<select name="subject"><option value="">${esc(this.t('all'))}</option></select></label><label>${esc(this.t('track'))}<select name="track"><option value="">${esc(this.t('all'))}</option></select></label>
        <label class="event-wide">${esc(this.t('units'))}<input name="unitIds" type="text" required value="${esc(this.state.experimentView.selectedUnitId??'')}"><span class="event-inline"><button type="button" data-ea-action="selected">${esc(this.t('useSelected'))}</button><button type="button" data-ea-action="all">${esc(this.t('useAll'))}</button></span></label>
        <label class="event-wide">${esc(this.t('coverage'))}<input name="coverage" type="text" required placeholder="[[0,3600]]"><small>${esc(this.t('coverageHelp'))}</small><span><button type="button" data-ea-action="source-coverage" disabled>${esc(this.t('sourceCoverage'))}</button></span></label>
        ${field('start','start',-1)}${field('end','end',1.5)}${field('binWidth','bin',.01)}${field('k','k',0)}
        <label>${esc(this.t('normalization'))}<select name="normalization"><option value="shape">${esc(this.t('shape'))}</option><option value="rate">${esc(this.t('rate'))}</option></select></label>${field('seed','seed',1)}
        <label class="event-check event-wide"><input name="activeOnly" type="checkbox" checked>${esc(this.t('active'))}</label>
        <label class="event-check event-wide"><input name="stability" type="checkbox">${esc(this.t('stability'))}</label>
        </div><div class="event-analysis-actions"><button class="primary-button" type="submit" data-ea-run>${esc(this.t('run'))}</button><button type="button" data-ea-action="cancel" hidden>${esc(this.t('cancel'))}</button></div></form></details>
        <p class="event-warning" data-ea-invalid-times hidden></p><p class="event-warning" data-ea-metadata-error hidden></p><p data-ea-status role="status" aria-live="polite"></p><section data-ea-results></section>`;
      this.dialog.setAttribute('aria-label',this.t('title'));this.dialog.querySelector('form').onsubmit=e=>{e.preventDefault();this.run();};
      this.resultPanel=this.dialog.querySelector('[data-ea-results]');this.dialog.showModal();this.status(this.t('loading'));
      const epoch=++this.epoch;
      try {
        if(r.eventsFile)try{if(r.eventsFile.size>32*1024*1024)throw Error('Event file exceeds 32 MiB');const events=E.validateEventSet(JSON.parse(await r.eventsFile.text()),r.key);if(epoch!==this.epoch)return;this.events=events;}catch(error){if(epoch!==this.epoch)return;this.sourceError=error;}
        if(r.coverageFile)try{if(r.coverageFile.size>16*1024*1024)throw Error('Coverage file exceeds 16 MiB');const coverage=JSON.parse(await r.coverageFile.text());if(epoch!==this.epoch)return;this.coverage=coverage;this.dialog.querySelector('[data-ea-action="source-coverage"]').disabled=false;}catch(error){if(epoch!==this.epoch)return;this.coverageError=error;}
        if(epoch!==this.epoch)return;this.sourceWarnings();if(!this.events?.events.some(e=>e.sourceKind==='experiment')&&this.annotations.doc)this.input('source').value='annotation';this.populateFilters();this.populateTypes();
        await this.restore(r,epoch);
      }catch(error){if(epoch===this.epoch){this.sourceError=error;this.sourceWarnings();this.status(this.t('readError')+error.message,true);}}
    }
    metadataIssues(){return [[this.sourceError,'events'],[this.coverageError,'coverage']].filter(([error])=>error).map(([error,role])=>({role,message:error.message,status:'unresolved'}));}
    sourceWarnings(){
      const validity=this.dialog.querySelector('[data-ea-invalid-times]'),error=this.dialog.querySelector('[data-ea-metadata-error]');
      validity.hidden=!this.events?.source?.invalidTimes;validity.textContent=validity.hidden?'':this.t('invalidTimes');
      const issues=this.metadataIssues();error.hidden=!issues.length;error.textContent=error.hidden?'':issues.map(issue=>`${issue.role}: ${issue.message}`).join('; ')+' '+this.t('metadataLimit');
    }
    selectedIds(){const raw=this.input('unitIds').value.trim().split(/[\s,]+/);if(!raw.length||raw.some(x=>!/^\d+$/.test(x)))throw Error(this.t('invalid'));return raw.map(Number);}
    sourceFiles(r){return [{role:'spikeTimes',file:r.spikeTimesFile},{role:'spikeClusters',file:r.spikeClustersFile},{role:'sampleRate',file:r.byName.get('params.py')},...(r.eventsFile?[{role:'events',file:r.eventsFile}]:[]),...(r.coverageFile?[{role:'coverage',file:r.coverageFile}]:[])];}
    clearCoverage(){this.input('coverage').value='';this.coverageProof=null;}
    invalidateSourceCoverage(){if(this.coverageProof)this.clearCoverage();}
    coverageIntervals(unitIds){
      const text=this.input('coverage').value;
      if(this.coverageProof){
        if(text!==this.coverageProof.text)this.coverageProof=null;
        else try {
          const proof=E.commonCoverage(this.coverage,unitIds,this.state.activeRecording.key);
          if(this.coverageProof.unitIds!==unitIds.join(',')||JSON.stringify(proof.intervals)!==text)throw Error('Source observation intervals changed; select coverage again');
          this.coverageProof.source=proof.source;
        }catch(error){this.clearCoverage();throw error;}
      }
      if(!text.trim())throw Error(this.t('coverageHelp'));
      return JSON.parse(text);
    }
    sourceCoverage(){
      this.clearCoverage();this.result=null;this.resultPanel.replaceChildren();
      try {const unitIds=this.selectedIds(),proof=E.commonCoverage(this.coverage,unitIds,this.state.activeRecording.key);this.input('coverage').value=JSON.stringify(proof.intervals);this.coverageProof={text:this.input('coverage').value,unitIds:unitIds.join(','),source:proof.source};this.result=null;this.resultPanel.replaceChildren();this.status(this.t('sourceCoverageNote'));}catch(error){this.status(error.message,true);}
    }
    async restore(recording,epoch){
      try {
        const blob=await this.getSavedAnalysis?.(recording);if(!blob||epoch!==this.epoch)return;
        this.restoring=true;this.ioAbort=new AbortController();const signal=this.ioAbort.signal;this.busy(true);this.status(this.t('checking'));
        const saved=await P.unpack(blob);if(epoch!==this.epoch)return;
        const available=new Set((this.getUnits()||[]).map(u=>u.id));if(saved.response.unitIds.some(id=>!available.has(id)))throw Error('Saved Units are not available in this Recording');
        this.input('source').value=saved.input.sourceKind;this.populateFilters();for(const key of ['subject','track'])this.input(key).value=saved.input.annotationFilters?.[key]||'';this.populateTypes();
        const p=saved.response.parameters;for(const key of ['start','end','binWidth','eventType'])this.input(key).value=String(p[key]);
        this.input('unitIds').value=saved.response.unitIds.join(', ');this.input('coverage').value=JSON.stringify(p.coverage);this.input('activeOnly').checked=p.activeOnly;
        this.input('k').value=String(saved.clusters?.k||0);this.input('seed').value=String(saved.clusters?.seed??1);this.input('normalization').value=saved.clusters?.normalization||'shape';
        this.input('stability').checked=!!saved.diagnostics;
        if(saved.provenance.coverageOrigin==='source-reported-unit-intersection'){
          const proof=E.commonCoverage(this.coverage,saved.response.unitIds,recording.key);if(JSON.stringify(proof.intervals)!==JSON.stringify(p.coverage))throw Error('Source observation intervals changed');
          this.coverageProof={text:this.input('coverage').value,unitIds:saved.response.unitIds.join(','),source:proof.source};
        }
        const signature=this.signature();await P.verifySources(saved,this.sourceFiles(recording),this.source(),recording.sampleRate,signal,()=>this.status(this.t('checking')));
        if(epoch!==this.epoch)return;if(signature!==this.signature()){this.clearCoverage();this.status(this.t('stale'),true);return;}
        this.result={...saved,signature};this.renderResult();this.status(this.t('restored'));
      }catch(error){if(epoch===this.epoch&&error.name!=='AbortError'){this.clearCoverage();this.result=null;this.resultPanel?.replaceChildren();this.status(this.t('restoreFailed')+error.message,true);}}
      finally{if(epoch===this.epoch){this.restoring=false;this.busy(false);}}
    }
    async save(){
      if(this.saving)return;const result=this.result,r=this.state.activeRecording;
      try {
        if(!this.canSave?.())throw Error(this.t('saveUnavailable'));
        if(!result||result.signature!==this.signature())throw Error(this.t('stale'));
        this.saving=true;const blob=await P.pack(result);
        if(result!==this.result||result.signature!==this.signature())throw Error(this.t('stale'));
        await this.saveAnalysis(r,blob);if(result===this.result)this.status(this.t('saved'));
      }catch(error){this.status(error.message,true);}finally{this.saving=false;}
    }
    source(){
      if(this.input('source').value==='annotation'){
        const r=this.state.activeRecording;
        if(this.annotations.doc?.context?.recordingKey!==String(r.databaseId??r.key))throw Error('Annotations are not loaded for the current Recording');
        return E.fromAnnotations(this.annotations.doc,this.video.mapping,{recordingId:r.key,reviewedOnly:true,subject:this.input('subject')?.value||undefined,track:this.input('track')?.value||undefined});
      }
      if(this.sourceError)throw this.sourceError;
      return E.fromExperimentalEvents(this.events||{schema:E.SCHEMA,recordingId:this.state.activeRecording.key,timebase:'neural_seconds',events:[]},this.state.activeRecording.key);
    }
    populateFilters(){
      for(const key of ['subject','track']){const node=this.input(key),value=node.value,values=[...new Set((this.annotations.doc?.segments||[]).map(s=>s[key]))].sort();node.innerHTML=`<option value="">${esc(this.t('all'))}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');node.value=values.includes(value)?value:'';node.disabled=this.input('source').value!=='annotation';}
    }
    populateTypes(){
      try {const source=this.source(),types=[...new Set(source.events.map(e=>e.type))].sort();this.input('eventType').innerHTML=types.map(t=>`<option value="${esc(t)}">${esc(t)} (${source.events.filter(e=>e.type===t).length})</option>`).join('');
        if(types.includes('image_change'))this.input('eventType').value='image_change';
        const note=this.dialog.querySelector('[data-ea-source-note]');if(note)note.textContent=this.input('source').value==='annotation'?this.t('annotationHelp')+(this.sourceError?' '+this.t('readError')+this.sourceError.message:''):source.excluded?.some(e=>e.reason==='annotation_requires_current_document')?this.t('annotationAssetNote'):'';
        this.input('activeOnly').disabled=this.input('source').value==='annotation';this.resultPanel.replaceChildren();this.status(this.t(types.length?'ready':'empty'));
      }catch(error){this.input('eventType').replaceChildren();this.status(error.message,true);}
    }
    action(action){
      if(!action)return;
      if(action==='close'){this.dialog.close();return;}
      if(action==='cancel'){this.cancel();return;}
      if(action==='source-coverage'){this.sourceCoverage();return;}
      if(action==='save'){this.save();return;}
      if(action==='selected'||action==='all'){
        const ids=action==='selected'?[this.state.experimentView.selectedUnitId].filter(v=>v!=null):(this.getUnits()||[]).map(u=>u.id);
        this.input('unitIds').value=ids.join(', ');this.invalidateSourceCoverage();this.result=null;this.resultPanel.replaceChildren();return;
      }
      if(!this.result)return;
      if(this.signature()!==this.result.signature){this.status(this.t('stale'),true);return;}
      if(action==='unit'){const id=Number(this.input('resultUnit').value);this.dialog.close();this.selectUnit?.(id);return;}
      if(action==='return'){
        const unitId=Number(this.input('resultUnit').value),event=this.result.response.events[Number(this.input('resultEvent').value)];
        this.dialog.close();this.returnToSource(unitId,event);return;
      }
      if(action==='export'){
        const {response,clusters,provenance}=this.result;
        const data={schema:'neuropixels-event-analysis/1',provenance,input:this.result.input,response:{...response,counts:Array.from(response.counts),rateHz:Array.from(response.rateHz)},clusters,diagnostics:this.result.diagnostics||null};
        const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='event-analysis.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
      }
    }
    cancel(show=true){if(this.restoring){this.clearCoverage();this.restoring=false;}this.epoch++;this.ioAbort?.abort();this.ioAbort=null;this.worker?.terminate();this.worker=null;if(this.workerUrl)URL.revokeObjectURL(this.workerUrl);this.workerUrl=null;this.busy(false);if(show)this.status(this.t('cancelled'));}
    busy(active){this.dialog.querySelectorAll('form input, form select, [data-ea-run], [data-ea-action="all"], [data-ea-action="selected"], [data-ea-action="source-coverage"]').forEach(n=>n.disabled=active);const cancel=this.dialog.querySelector('[data-ea-action="cancel"]');if(cancel)cancel.hidden=!active;if(!active&&this.input('activeOnly')){this.input('activeOnly').disabled=this.input('source')?.value==='annotation';for(const key of ['subject','track'])this.input(key).disabled=this.input('source')?.value!=='annotation';this.dialog.querySelector('[data-ea-action="source-coverage"]').disabled=!this.coverage;}}
    async run(){
      this.cancel(false);this.result=null;this.resultPanel.replaceChildren();
      try {
        const unitIds=this.selectedIds(),available=new Set((this.getUnits()||[]).map(u=>u.id));if(unitIds.some(id=>!available.has(id)))throw Error('A selected Unit does not belong to this Recording');
        const events=this.source(),r=this.state.activeRecording;
        const options={recordingId:r.key,start:Number(this.input('start').value),end:Number(this.input('end').value),binWidth:Number(this.input('binWidth').value),coverage:this.coverageIntervals(unitIds),eventType:this.input('eventType').value,activeOnly:this.input('source').value==='experiment'&&this.input('activeOnly').checked};
        if(!options.eventType)throw Error(this.t('empty'));
        // Preflight coverage, selection and response allocation before reading spike files.
        E.computeResponses(unitIds.map(unitId=>({unitId,spikes:[]})),events,options);
        const k=Number(this.input('k').value);if(!Number.isSafeInteger(k)||k<0||k>32)throw Error('Cluster count must be an integer from 0 to 32');
        const clusters=k?{k,seed:Number(this.input('seed').value),normalization:this.input('normalization').value}:null;
        const stability=this.input('stability').checked?{repeats:4,seed:Number(this.input('seed').value)}:null;
        const signature=this.signature(),epoch=++this.epoch;
        const sourceCoverage=this.coverageProof?.text===this.input('coverage').value&&this.coverageProof.unitIds===unitIds.join(',');
        const provenance={createdAt:new Date().toISOString(),recordingId:r.key,source:events.source||null,invalidTimes:this.events?.source?.invalidTimes||null,...(this.metadataIssues().length?{sourceMetadataErrors:this.metadataIssues()}:{}),excludedSourceEvents:events.excluded||[],coverageOrigin:sourceCoverage?'source-reported-unit-intersection':'user-declared-unverified',coverageSource:sourceCoverage?this.coverageProof.source:null,sourceFiles:[r.spikeTimesFile,r.spikeClustersFile].map(f=>({name:f.name,size:f.size,lastModified:f.lastModified})),interpretation:this.t('limit')};
        this.ioAbort=new AbortController();const signal=this.ioAbort.signal;this.busy(true);this.status(this.t('checking'));
        const input={sourceKind:this.input('source').value,annotationFilters:this.input('source').value==='annotation'?{subject:this.input('subject').value,track:this.input('track').value}:null,sampleRate:r.sampleRate,eventDigest:await P.digestJSON(events),sourceFingerprints:await P.sourceFingerprints(this.sourceFiles(r),signal)};
        if(epoch!==this.epoch)return;if(signature!==this.signature()){this.cancel(false);this.status(this.t('stale'),true);return;}
        this.workerUrl=URL.createObjectURL(new Blob([core.createEventWorkerSource(E.workerSource())],{type:'text/javascript'}));this.worker=new Worker(this.workerUrl);this.busy(true);this.status(this.t('computing'));
        this.worker.onerror=e=>{if(epoch!==this.epoch)return;this.cancel(false);this.status(e.message,true);};
        this.worker.onmessage=({data})=>{
          if(epoch!==this.epoch)return;
          if(data.progress){const p=data.progress;this.status(this.t('computing')+(p.total?` ${Math.floor(100*p.completed/p.total)}%`:''));return;}
          this.cancel(false);
          if(data.error){this.status(data.error,true);return;}
          if(signature!==this.signature()){this.status(this.t('stale'),true);return;}
          this.result={response:data.response,clusters:data.clusters,diagnostics:data.diagnostics,signature,provenance,input};this.renderResult();
        };
        this.worker.postMessage({files:{spikeTimes:r.spikeTimesFile,spikeClusters:r.spikeClustersFile},sampleRate:r.sampleRate,unitIds,events,options,clusters,stability});
      }catch(error){if(error.name==='AbortError')return;this.cancel(false);this.status(error.message,true);}
    }
    renderResult(){
      const {response:r,clusters:c}=this.result;
      this.summary=E.responseSummary(r,c);
      this.dialog.querySelector('[data-ea-settings]').open=false;this.dialog.scrollTop=0;
      this.status(`${this.t('done')}: ${r.shape[0]} Units / ${r.shape[1]} ${this.t('trials')} / ${r.shape[2]} ${this.t('bins')}. ${this.t('excluded')}: ${r.excludedEvents.length}`);
      this.resultPanel.innerHTML=`<p class="event-warning">${esc(this.t(this.result.provenance.coverageOrigin==='source-reported-unit-intersection'?'sourceCoverageNote':'coverageNote'))}</p><div class="event-analysis-fields">
        <label>${esc(this.t('selected'))}<select name="resultUnit">${r.unitIds.map(id=>{const index=c?.unitIds.indexOf(id),label=index>=0?` / ${this.t('group')} ${c.labels[index]+1}`:'';return `<option value="${id}">Unit ${id}${esc(label)}</option>`;}).join('')}</select></label>
        <label>${esc(this.t('event'))}<select name="resultEvent">${r.events.map((e,i)=>`<option value="${i}">${esc(e.sourceId)} / ${e.start.toFixed(3)} s</option>`).join('')}</select></label></div>
        <details data-ea-population ${c?'open':''}><summary>${esc(this.t('population'))}</summary><div class="event-analysis-fields"><label>${esc(this.t('group'))}<select name="populationGroup"><option value="all">${esc(this.t('allGroups'))} (${r.unitIds.length})</option>${c?this.summary.groups.map(g=>`<option value="${g.cluster??'none'}">${g.cluster==null?esc(this.t('ungrouped')):esc(this.t('group'))+' '+(g.cluster+1)} (${g.unitIds.length})</option>`).join(''):''}</select></label><label>${esc(this.t('members'))}<select name="populationUnit" size="4"></select></label></div><figure><figcaption>${esc(this.t('heatmap'))}</figcaption><canvas data-ea-heatmap width="760" height="180" role="img" aria-label="${esc(this.t('heatmap'))}"></canvas><div class="event-heatmap-key"><span><i style="background:rgb(43,104,155)"></i> −3 z</span><span><i style="background:rgb(241,243,245)"></i> 0</span><span><i style="background:rgb(194,104,40)"></i> +3 z</span></div></figure><p>${esc(this.t('heatmapNote'))}</p><figure><figcaption>${esc(this.t('groupMean'))}</figcaption><svg data-ea-group-curve viewBox="0 0 760 170" role="img" aria-label="${esc(this.t('groupMean'))}"></svg></figure></details>
        <figure><figcaption>${esc(this.t('mean'))}</figcaption><svg data-ea-curve viewBox="0 0 760 170" role="img" aria-label="${esc(this.t('mean'))}"></svg></figure>
        <figure><figcaption>${esc(this.t('raster'))}</figcaption><canvas data-ea-raster width="760" height="240" role="img" aria-label="${esc(this.t('raster'))}"></canvas></figure>
        <p data-ea-source></p><details data-ea-stability><summary>${esc(this.t('stabilityTitle'))}</summary><p data-ea-stability-value></p><p>${esc(this.t('stabilityNote'))}</p></details><p>${esc(this.t('limit'))}</p><p>${esc(this.t('note'))}</p>
        <div class="event-analysis-actions"><button type="button" data-ea-action="unit">${esc(this.t('showUnit'))}</button><button type="button" data-ea-action="return">${esc(this.t('return'))}</button><button type="button" data-ea-action="export">${esc(this.t('export'))}</button><button type="button" data-ea-action="save" ${this.canSave?.()?'':'disabled'}>${esc(this.t('save'))}</button></div>`;
      const d=this.result.diagnostics;this.dialog.querySelector('[data-ea-stability-value]').textContent=!d?this.t('stabilityNotRun'):d.successful?`${d.successful}/${d.parameters.repeats} ${this.t('splits')}; mean ARI ${d.meanARI.toFixed(3)}; range [${d.minARI.toFixed(3)}, ${d.maxARI.toFixed(3)}]`:[d.reason,...d.runs.map(r=>r.reason)].filter(Boolean).join('; ');
      this.drawPopulation();this.draw();
    }
    drawPopulation(){
      if(!this.result)return;const r=this.result.response,bins=r.shape[2],selection=this.input('populationGroup').value,groups=selection==='all'?this.summary.groups:this.summary.groups.filter(g=>String(g.cluster??'none')===selection),ids=groups.flatMap(g=>g.unitIds),lookup=new Map(r.unitIds.map((id,i)=>[id,i])),rows=ids.map(id=>lookup.get(id));
      const members=this.input('populationUnit'),selected=this.input('resultUnit').value;members.innerHTML=ids.map(id=>`<option value="${id}">Unit ${id}</option>`).join('');if(ids.includes(Number(selected)))members.value=selected;else members.selectedIndex=-1;
      const means=rows.map(row=>{const values=r.rateHz.subarray(row*bins,(row+1)*bins),mean=values.reduce((a,b)=>a+b,0)/bins,variance=values.reduce((sum,v)=>sum+(v-mean)**2,0)/bins;return {mean,std:variance>1e-12?Math.sqrt(variance):0};});
      const canvas=this.dialog.querySelector('[data-ea-heatmap]'),ctx=canvas.getContext('2d'),nr=Math.min(128,rows.length),nc=Math.min(360,bins);canvas.height=Math.max(110,Math.min(520,rows.length*10+34));const height=canvas.height-34;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let y=0;y<nr;y++)for(let x=0;x<nc;x++){const y0=Math.floor(y*rows.length/nr),y1=Math.floor((y+1)*rows.length/nr),x0=Math.floor(x*bins/nc),x1=Math.floor((x+1)*bins/nc);let sum=0;for(let row=y0;row<y1;row++)for(let bin=x0;bin<x1;bin++)sum+=means[row].std?(r.rateHz[rows[row]*bins+bin]-means[row].mean)/means[row].std:0;const z=Math.max(-3,Math.min(3,sum/((y1-y0)*(x1-x0)))),t=Math.abs(z)/3,color=z>=0?[194,104,40]:[43,104,155];ctx.fillStyle=`rgb(${color.map((v,i)=>Math.round([241,243,245][i]*(1-t)+v*t)).join(',')})`;ctx.fillRect(48+x*688/nc,10+y*height/nr,Math.ceil(688/nc),Math.ceil(height/nr));}
      const eventX=48+688*(0-r.parameters.start)/(r.parameters.end-r.parameters.start);if(eventX>=48&&eventX<=736){ctx.strokeStyle='rgb(65,70,76)';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(eventX,10);ctx.lineTo(eventX,10+height);ctx.stroke();ctx.setLineDash([]);}
      ctx.fillStyle=getComputedStyle(this.dialog).getPropertyValue('--text');ctx.font='12px system-ui';ctx.fillText('1',12,20);ctx.fillText(String(rows.length),8,10+height);ctx.fillText(`${r.parameters.start} s`,48,canvas.height-5);ctx.fillText(`${r.parameters.end} s`,688,canvas.height-5);
      const mean=Array(bins).fill(0);for(const g of groups)for(let b=0;b<bins;b++)mean[b]+=g.meanRateHz[b]*g.unitIds.length/ids.length;
      const max=Math.max(1,...mean),points=mean.map((v,b)=>`${48+688*(b+.5)/bins},${140-115*v/max}`).join(' '),zero=48+688*(0-r.parameters.start)/(r.parameters.end-r.parameters.start);
      this.dialog.querySelector('[data-ea-group-curve]').innerHTML=`<path d="M48 20V140H736" class="event-axis"/><line x1="${zero}" x2="${zero}" y1="20" y2="140" class="event-zero"/><polyline points="${points}" class="event-trace"/><text x="4" y="28">${max.toFixed(1)}</text><text x="24" y="144">0</text><text x="48" y="163">${r.parameters.start} s</text><text x="688" y="163">${r.parameters.end} s</text>`;
    }
    draw(){
      if(!this.result)return;const {response:r,clusters:c}=this.result,n=r.shape[2],u=r.unitIds.indexOf(Number(this.input('resultUnit').value)),values=r.rateHz.slice(u*n,(u+1)*n),max=Math.max(1,...values),x=b=>48+688*b/n,y=v=>140-115*v/max;
      const points=Array.from(values,(v,b)=>`${x(b+.5).toFixed(2)},${y(v).toFixed(2)}`).join(' '),zero=x((0-r.parameters.start)/r.parameters.binWidth);
      this.dialog.querySelector('[data-ea-curve]').innerHTML=`<path d="M48 20V140H736" class="event-axis"/><line x1="${zero}" x2="${zero}" y1="20" y2="140" class="event-zero"/><polyline points="${points}" class="event-trace"/><text x="4" y="28">${max.toFixed(1)}</text><text x="24" y="144">0</text><text x="48" y="163">${r.parameters.start} s</text><text x="688" y="163">${r.parameters.end} s</text>`;
      const canvas=this.dialog.querySelector('[data-ea-raster]'),ctx=canvas.getContext('2d'),style=getComputedStyle(this.dialog);ctx.clearRect(0,0,760,240);ctx.fillStyle=style.getPropertyValue('--field');ctx.fillRect(0,0,760,240);
      const trials=r.shape[1],height=200/trials;ctx.fillStyle=style.getPropertyValue('--accent');
      for(let t=0;t<trials;t++)for(let b=0;b<n;b++){const count=r.counts[(u*trials+t)*n+b];if(count){ctx.globalAlpha=Math.min(1,.35+.2*count);ctx.fillRect(x(b),12+t*height,Math.max(.6,688/n),Math.max(.5,height));}}
      ctx.globalAlpha=1;ctx.strokeStyle=style.getPropertyValue('--text-soft');ctx.beginPath();ctx.moveTo(zero,12);ctx.lineTo(zero,212);ctx.stroke();ctx.fillStyle=style.getPropertyValue('--text');ctx.font='12px system-ui';ctx.fillText('1',12,22);ctx.fillText(String(trials),5,212);ctx.fillText(`${r.parameters.start} s`,48,232);ctx.fillText(`${r.parameters.end} s`,688,232);
      const e=r.events[Number(this.input('resultEvent').value)],index=c?.unitIds.indexOf(r.unitIds[u]);
      this.dialog.querySelector('[data-ea-source]').textContent=`${e.sourceKind}: ${e.sourceTable||e.schemeId||''} / ${e.sourceId}; ${e.start.toFixed(6)}${e.end!=null?' – '+e.end.toFixed(6):''} s${index>=0?`; ${this.t('group')} ${c.labels[index]+1}; ${c.normalization}; seed ${c.seed}`:''}`;
    }
  }
  window.NeuropixelsEventAnalysisUI=EventAnalysisUI;
})();
