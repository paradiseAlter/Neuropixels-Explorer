// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const E=window.NeuropixelsEventAnalysis, core=window.NeuropixelExplorerCore;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const COPY={
    en:{title:'Event responses',intro:'Align Unit spikes to event starts, then compare response profiles.',source:'Event source',experiment:'Experimental events',annotation:'Reviewed behavior annotations',type:'Event type / label',units:'Unit IDs, separated by commas',useSelected:'Use selected Unit',useAll:'Use all available Units',coverage:'Valid neural recording intervals (seconds, JSON)',coverageHelp:'Enter acquisition coverage, for example [[0,3600],[3610,7200]]. A last spike or video duration is not recording coverage. User-entered coverage remains unverified.',start:'Window start (s)',end:'Window end (s)',bin:'Bin width (s)',k:'Clusters (0 = response only)',normalization:'Cluster features',shape:'Within-Unit z-score',rate:'Unscaled rate (Hz)',seed:'Random seed',active:'Active experimental block only',run:'Compute responses',cancel:'Cancel computation',close:'Back to signals',ready:'Choose events and Units, then specify valid recording intervals.',loading:'Reading event metadata…',computing:'Computing in a separate worker…',cancelled:'Computation cancelled. Source data are unchanged.',empty:'No matching events. Import experimental events with the recording or review behavior labels first.',unavailable:'Open a local Recording with spike arrays first. Indexed-service event analysis is not available yet.',coverageNote:'Coverage is user-declared and unverified. Events with incomplete windows are excluded.',limit:'Exploratory response groups are not cell types or causal effects. No significance or cluster-stability claim is made.',stale:'Inputs changed. Recompute before exporting or returning to source.',export:'Export analysis JSON',return:'Show Unit at event',event:'Source event',selected:'Selected Unit',mean:'Mean response (Hz)',raster:'Trial raster (binned spike counts)',group:'Response group',excluded:'Excluded',invalid:'Enter comma-separated integer Unit IDs.',readError:'Could not read events: ',done:'Computed',trials:'events',bins:'bins',note:'This preview exports separately. Analysis results are not yet restored from a project package.'},
    'zh-CN':{title:'事件响应',intro:'按事件起点对齐 Unit spike，再比较响应形状。',source:'事件来源',experiment:'实验事件',annotation:'已复核行为标注',type:'事件类型 / 标签',units:'Unit ID，以逗号分隔',useSelected:'使用所选 Unit',useAll:'使用全部可用 Unit',coverage:'有效神经记录区间（秒，JSON）',coverageHelp:'填写采集有效区间，例如 [[0,3600],[3610,7200]]。最后一次 spike 或视频时长不是记录覆盖范围；手动填写仍标记为未验证。',start:'窗口起点（秒）',end:'窗口终点（秒）',bin:'分箱宽度（秒）',k:'聚类数（0 = 仅响应）',normalization:'聚类特征',shape:'Unit 内 z-score',rate:'原始发放率（Hz）',seed:'随机种子',active:'仅活跃实验区块',run:'计算响应',cancel:'取消计算',close:'返回信号',ready:'选择事件和 Unit，并填写有效记录区间。',loading:'正在读取事件元数据…',computing:'正在独立 Worker 中计算…',cancelled:'计算已取消，源数据未改变。',empty:'没有匹配事件。请随记录导入实验事件，或先复核行为标签。',unavailable:'请先打开包含 spike 数组的本地 Recording。暂不支持索引服务中的事件分析。',coverageNote:'覆盖范围由用户填写，尚未验证；窗口覆盖不完整的事件会被排除。',limit:'这些探索性分组不是细胞类型或因果效应，也不代表显著性或聚类稳定性已经验证。',stale:'输入已改变，请重新计算后再导出或回看来源。',export:'导出分析 JSON',return:'在事件处查看 Unit',event:'原始事件',selected:'所选 Unit',mean:'平均响应（Hz）',raster:'试次栅格（分箱 spike 数）',group:'响应分组',excluded:'已排除',invalid:'请填写以逗号分隔的整数 Unit ID。',readError:'无法读取事件：',done:'已计算',trials:'个事件',bins:'个分箱',note:'当前预览单独导出分析结果，项目包尚不恢复分析结果。'},
    es:{title:'Respuestas a eventos',intro:'Alinea los spikes al inicio de los eventos y compara los perfiles.',source:'Origen',experiment:'Eventos experimentales',annotation:'Anotaciones revisadas',type:'Tipo / etiqueta',units:'IDs de Unit separados por comas',useSelected:'Usar Unit seleccionado',useAll:'Usar todos los Units',coverage:'Intervalos válidos de registro neural (segundos, JSON)',coverageHelp:'Introduce la cobertura de adquisición, por ejemplo [[0,3600],[3610,7200]]. El último spike o la duración del vídeo no definen la cobertura. La entrada manual no está verificada.',start:'Inicio (s)',end:'Fin (s)',bin:'Ancho de intervalo (s)',k:'Grupos (0 = solo respuesta)',normalization:'Características',shape:'Z-score dentro de cada Unit',rate:'Tasa sin escalar (Hz)',seed:'Semilla',active:'Solo bloque experimental activo',run:'Calcular respuestas',cancel:'Cancelar cálculo',close:'Volver a señales',ready:'Elige eventos y Units e introduce la cobertura válida.',loading:'Leyendo eventos…',computing:'Calculando en un worker separado…',cancelled:'Cálculo cancelado. Los datos originales no cambiaron.',empty:'No hay eventos. Importa eventos o revisa las anotaciones.',unavailable:'Abre primero un Recording local con arrays de spikes. El servicio indexado aún no admite este análisis.',coverageNote:'Cobertura declarada por el usuario, sin verificar. Se excluyen ventanas incompletas.',limit:'Los grupos exploratorios no son tipos celulares ni efectos causales. No se ha validado significación ni estabilidad.',stale:'Las entradas cambiaron. Vuelve a calcular antes de exportar.',export:'Exportar análisis JSON',return:'Ver Unit en el evento',event:'Evento original',selected:'Unit seleccionado',mean:'Respuesta media (Hz)',raster:'Raster de ensayos (recuento por intervalo)',group:'Grupo de respuesta',excluded:'Excluidos',invalid:'Introduce IDs enteros separados por comas.',readError:'No se pueden leer eventos: ',done:'Calculado',trials:'eventos',bins:'intervalos',note:'Esta vista exporta por separado. El paquete de proyecto aún no restaura los resultados.'}
  };
  class EventAnalysisUI {
    constructor(options) {
      Object.assign(this,options);this.epoch=0;this.recordingKey=null;
      this.dialog=document.createElement('dialog');this.dialog.className='event-analysis-dialog';this.dialog.id='event-analysis-dialog';document.body.append(this.dialog);
      this.button.onclick=()=>this.open();
      this.dialog.addEventListener('close',()=>this.cancel(false));
      this.dialog.addEventListener('cancel',()=>this.cancel(false));
      this.dialog.addEventListener('click',e=>this.action(e.target.closest('[data-ea-action]')?.dataset.eaAction));
      this.dialog.addEventListener('change',e=>{
        if(e.target.name==='source'){this.result=null;this.populateTypes();}
        else if(e.target.name==='resultUnit'||e.target.name==='resultEvent')this.draw();
        else {this.result=null;this.resultPanel?.replaceChildren();}
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
      this.cancel(false);this.result=null;this.events=null;
      const field=(name,label,value,type='number')=>`<label>${esc(this.t(label))}<input name="${name}" type="${type}" ${type==='number'?'step="any"':''} value="${esc(value)}" required></label>`;
      this.dialog.innerHTML=`<header><div><h2>${esc(this.t('title'))}</h2><p>${esc(this.t('intro'))}</p></div><button type="button" data-ea-action="close">${esc(this.t('close'))}</button></header>
        <details data-ea-settings open><summary>${esc(this.t('source'))} / ${esc(this.t('units'))}</summary><form><div class="event-analysis-fields">
        <label>${esc(this.t('source'))}<select name="source"><option value="experiment">${esc(this.t('experiment'))}</option><option value="annotation">${esc(this.t('annotation'))}</option></select></label>
        <label>${esc(this.t('type'))}<select name="eventType"></select></label>
        <label class="event-wide">${esc(this.t('units'))}<input name="unitIds" type="text" required value="${esc(this.state.experimentView.selectedUnitId??'')}"><span class="event-inline"><button type="button" data-ea-action="selected">${esc(this.t('useSelected'))}</button><button type="button" data-ea-action="all">${esc(this.t('useAll'))}</button></span></label>
        <label class="event-wide">${esc(this.t('coverage'))}<input name="coverage" type="text" required placeholder="[[0,3600]]"><small>${esc(this.t('coverageHelp'))}</small></label>
        ${field('start','start',-1)}${field('end','end',1.5)}${field('binWidth','bin',.01)}${field('k','k',0)}
        <label>${esc(this.t('normalization'))}<select name="normalization"><option value="shape">${esc(this.t('shape'))}</option><option value="rate">${esc(this.t('rate'))}</option></select></label>${field('seed','seed',1)}
        <label class="event-check event-wide"><input name="activeOnly" type="checkbox" checked>${esc(this.t('active'))}</label>
        </div><div class="event-analysis-actions"><button class="primary-button" type="submit" data-ea-run>${esc(this.t('run'))}</button><button type="button" data-ea-action="cancel" hidden>${esc(this.t('cancel'))}</button></div></form></details>
        <p data-ea-status role="status" aria-live="polite"></p><section data-ea-results></section>`;
      this.dialog.setAttribute('aria-label',this.t('title'));this.dialog.querySelector('form').onsubmit=e=>{e.preventDefault();this.run();};
      this.resultPanel=this.dialog.querySelector('[data-ea-results]');this.dialog.showModal();this.status(this.t('loading'));
      const epoch=++this.epoch;
      try {if(r.eventsFile){if(r.eventsFile.size>32*1024*1024)throw Error('Event file exceeds 32 MiB');this.events=E.validateEventSet(JSON.parse(await r.eventsFile.text()),r.key);}
        if(epoch!==this.epoch)return;if(!this.events?.events.length&&this.annotations.doc)this.input('source').value='annotation';this.populateTypes();
      }catch(error){if(epoch===this.epoch)this.status(this.t('readError')+error.message,true);}
    }
    source(){
      if(this.input('source').value==='annotation'){
        const r=this.state.activeRecording;
        if(this.annotations.doc?.context?.recordingKey!==String(r.databaseId??r.key))throw Error('Annotations are not loaded for the current Recording');
        return E.fromAnnotations(this.annotations.doc,this.video.mapping,{recordingId:r.key,reviewedOnly:true});
      }
      return this.events||{schema:E.SCHEMA,recordingId:this.state.activeRecording.key,timebase:'neural_seconds',events:[]};
    }
    populateTypes(){
      try {const source=this.source(),types=[...new Set(source.events.map(e=>e.type))].sort();this.input('eventType').innerHTML=types.map(t=>`<option value="${esc(t)}">${esc(t)} (${source.events.filter(e=>e.type===t).length})</option>`).join('');
        if(types.includes('image_change'))this.input('eventType').value='image_change';
        this.input('activeOnly').disabled=this.input('source').value==='annotation';this.resultPanel.replaceChildren();this.status(this.t(types.length?'ready':'empty'));
      }catch(error){this.input('eventType').replaceChildren();this.status(error.message,true);}
    }
    action(action){
      if(!action)return;
      if(action==='close'){this.dialog.close();return;}
      if(action==='cancel'){this.cancel();return;}
      if(action==='selected'||action==='all'){
        const ids=action==='selected'?[this.state.experimentView.selectedUnitId].filter(v=>v!=null):(this.getUnits()||[]).map(u=>u.id);
        this.input('unitIds').value=ids.join(', ');this.result=null;this.resultPanel.replaceChildren();return;
      }
      if(!this.result)return;
      if(this.signature()!==this.result.signature){this.status(this.t('stale'),true);return;}
      if(action==='return'){
        const unitId=Number(this.input('resultUnit').value),event=this.result.response.events[Number(this.input('resultEvent').value)];
        this.dialog.close();this.returnToSource(unitId,event);return;
      }
      if(action==='export'){
        const {response,clusters,provenance}=this.result;
        const data={schema:'neuropixels-event-analysis/1',provenance,response:{...response,counts:Array.from(response.counts),rateHz:Array.from(response.rateHz)},clusters};
        const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='event-analysis.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
      }
    }
    cancel(show=true){this.epoch++;this.worker?.terminate();this.worker=null;if(this.workerUrl)URL.revokeObjectURL(this.workerUrl);this.workerUrl=null;this.busy(false);if(show)this.status(this.t('cancelled'));}
    busy(active){this.dialog.querySelectorAll('form input, form select, [data-ea-run], [data-ea-action="all"], [data-ea-action="selected"]').forEach(n=>n.disabled=active);const cancel=this.dialog.querySelector('[data-ea-action="cancel"]');if(cancel)cancel.hidden=!active;if(!active&&this.input('activeOnly'))this.input('activeOnly').disabled=this.input('source')?.value==='annotation';}
    async run(){
      this.cancel(false);this.result=null;this.resultPanel.replaceChildren();
      try {
        const raw=this.input('unitIds').value.trim().split(/[\s,]+/);if(!raw.length||raw.some(x=>!/^\d+$/.test(x)))throw Error(this.t('invalid'));
        const unitIds=raw.map(Number),available=new Set((this.getUnits()||[]).map(u=>u.id));if(unitIds.some(id=>!available.has(id)))throw Error('A selected Unit does not belong to this Recording');
        const events=this.source(),r=this.state.activeRecording;
        const options={recordingId:r.key,start:Number(this.input('start').value),end:Number(this.input('end').value),binWidth:Number(this.input('binWidth').value),coverage:JSON.parse(this.input('coverage').value),eventType:this.input('eventType').value,activeOnly:this.input('source').value==='experiment'&&this.input('activeOnly').checked};
        if(!options.eventType)throw Error(this.t('empty'));
        // Preflight coverage, selection and response allocation before reading spike files.
        E.computeResponses(unitIds.map(unitId=>({unitId,spikes:[]})),events,options);
        const k=Number(this.input('k').value);if(!Number.isSafeInteger(k)||k<0||k>32)throw Error('Cluster count must be an integer from 0 to 32');
        const clusters=k?{k,seed:Number(this.input('seed').value),normalization:this.input('normalization').value}:null;
        const signature=this.signature(),epoch=++this.epoch;
        const provenance={createdAt:new Date().toISOString(),recordingId:r.key,source:events.source||null,excludedSourceEvents:events.excluded||[],coverageOrigin:'user-declared-unverified',sourceFiles:[r.spikeTimesFile,r.spikeClustersFile].map(f=>({name:f.name,size:f.size,lastModified:f.lastModified})),interpretation:this.t('limit')};
        this.workerUrl=URL.createObjectURL(new Blob([core.createEventWorkerSource(E.workerSource())],{type:'text/javascript'}));this.worker=new Worker(this.workerUrl);this.busy(true);this.status(this.t('computing'));
        this.worker.onerror=e=>{if(epoch!==this.epoch)return;this.cancel(false);this.status(e.message,true);};
        this.worker.onmessage=({data})=>{
          if(epoch!==this.epoch)return;
          if(data.progress){const p=data.progress;this.status(this.t('computing')+(p.total?` ${Math.floor(100*p.completed/p.total)}%`:''));return;}
          this.cancel(false);
          if(data.error){this.status(data.error,true);return;}
          if(signature!==this.signature()){this.status(this.t('stale'),true);return;}
          this.result={response:data.response,clusters:data.clusters,signature,provenance};this.renderResult();
        };
        this.worker.postMessage({files:{spikeTimes:r.spikeTimesFile,spikeClusters:r.spikeClustersFile},sampleRate:r.sampleRate,unitIds,events,options,clusters});
      }catch(error){this.cancel(false);this.status(error.message,true);}
    }
    renderResult(){
      const {response:r,clusters:c}=this.result;
      this.dialog.querySelector('[data-ea-settings]').open=false;this.dialog.scrollTop=0;
      this.status(`${this.t('done')}: ${r.shape[0]} Units / ${r.shape[1]} ${this.t('trials')} / ${r.shape[2]} ${this.t('bins')}. ${this.t('excluded')}: ${r.excludedEvents.length}`);
      this.resultPanel.innerHTML=`<p class="event-warning">${esc(this.t('coverageNote'))}</p><div class="event-analysis-fields">
        <label>${esc(this.t('selected'))}<select name="resultUnit">${r.unitIds.map(id=>{const index=c?.unitIds.indexOf(id),label=index>=0?` / ${this.t('group')} ${c.labels[index]+1}`:'';return `<option value="${id}">Unit ${id}${esc(label)}</option>`;}).join('')}</select></label>
        <label>${esc(this.t('event'))}<select name="resultEvent">${r.events.map((e,i)=>`<option value="${i}">${esc(e.sourceId)} / ${e.start.toFixed(3)} s</option>`).join('')}</select></label></div>
        <figure><figcaption>${esc(this.t('mean'))}</figcaption><svg data-ea-curve viewBox="0 0 760 170" role="img" aria-label="${esc(this.t('mean'))}"></svg></figure>
        <figure><figcaption>${esc(this.t('raster'))}</figcaption><canvas data-ea-raster width="760" height="240" role="img" aria-label="${esc(this.t('raster'))}"></canvas></figure>
        <p data-ea-source></p><p>${esc(this.t('limit'))}</p><p>${esc(this.t('note'))}</p>
        <div class="event-analysis-actions"><button type="button" data-ea-action="return">${esc(this.t('return'))}</button><button type="button" data-ea-action="export">${esc(this.t('export'))}</button></div>`;
      this.draw();
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
