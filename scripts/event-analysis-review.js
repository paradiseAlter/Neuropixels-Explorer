// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const E=window.NeuropixelsEventAnalysis;
  const core=window.NeuropixelExplorerCore;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const seriesColor=i=>'var(--ea-series-'+(i%6)+')';
  const mountedReviews=new WeakMap();
  const paletteCache=new Map();
  function plotPalette(paper=false) {
    const root=document.documentElement,key=paper?'paper':root.dataset.theme||'dark';
    if(paletteCache.has(key))return paletteCache.get(key);
    const source=paper?document.createElement('span'):root;
    if(paper){source.className='ea-paper-palette';source.hidden=true;document.body.append(source);}
    const css=getComputedStyle(source),color=name=>css.getPropertyValue('--ea-'+name).trim();
    const rgb=name=>color(name).slice(1).match(/../g).map(hex=>parseInt(hex,16));
    const lo=rgb('negative'),neutral=rgb('neutral'),hi=rgb('positive');
    const heat=Array.from({length:511},(_,i)=>{
      const target=i<255?lo:hi,t=Math.abs(i-255)/255;
      return neutral.map((v,c)=>Math.round(v+(target[c]-v)*t));
    });
    const palette={heat,neutral:color('neutral'),negative:color('negative'),positive:color('positive'),
      onset:color('onset'),unassigned:color('unassigned'),series:Array.from({length:6},(_,i)=>color('series-'+i))};
    if(paper)source.remove();
    paletteCache.set(key,palette);return palette;
  }
  new MutationObserver(()=>{
    document.querySelectorAll('[data-ea-cluster-review]').forEach(root=>{
      const review=mountedReviews.get(root);
      if(!review)return;
      review.ui.figures?.repaint();
      review.refreshUnits?.();
      if(review.selected.length&&review.selected.every(id=>review.times.has(id)))review.renderTrials();
    });
  }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const COPY={
    en:{responses:'Unit response heatmap',trials:'Events',group:'Group',ungrouped:'Ungrouped',reference:'Groups fitted on',mean:'Group means · Hz',individual:'Selected Units · Hz',prompt:'Select a Unit row to see its spikes.',hint:'Ctrl / ⌘ + click to compare Units. Click a highlighted row to remove it.',raw:'Spikes by event',waiting:'Reading spike timestamps…',video:'Video',outside:'Outside video',at:'relative to onset',delta:'ΔHz from pre-event mean',rate:'Firing rate (Hz)',omitted:'Excluded',method:'Analysis details',all:'All',excluded:'Excluded events',event:'Event',stability:'Split-half ARI'},
    'zh-CN':{responses:'Unit 响应热图',trials:'次事件',group:'组',ungrouped:'未分组',reference:'分组参照',mean:'各组平均放电率 · Hz',individual:'所选 Unit 放电率 · Hz',prompt:'点一行 Unit 查看逐次 spike。',hint:'Ctrl / ⌘＋点击加入对比，再点高亮行取消。',raw:'逐次 spike',waiting:'正在读取 spike 原始时刻…',video:'视频',outside:'视频未覆盖',at:'相对事件起点',delta:'相对事件前均值 · ΔHz',rate:'放电率 · Hz',omitted:'排除',method:'分析详情',all:'全部',excluded:'排除的事件',event:'事件',stability:'分半一致性 ARI'},
    es:{responses:'Mapa de respuestas por Unit',trials:'eventos',group:'Grupo',ungrouped:'Sin grupo',reference:'Grupos ajustados en',mean:'Media por grupo · Hz',individual:'Units seleccionados · Hz',prompt:'Selecciona una fila para ver sus spikes.',hint:'Ctrl / ⌘ + clic para comparar. Otro clic quita la selección.',raw:'Spikes por evento',waiting:'Leyendo tiempos de spikes…',video:'Vídeo',outside:'Fuera del vídeo',at:'desde el inicio',delta:'ΔHz frente a la media previa',rate:'Frecuencia (Hz)',omitted:'Excluidos',method:'Detalles del análisis',all:'Todos',excluded:'Eventos excluidos',event:'Evento',stability:'ARI entre mitades'}
  };
  Object.assign(COPY.en,{change:'Image change',jump:'Click an event to open its recording time and video.',figure:'View',heatView:'Unit rows',meanView:'Group means',sizeView:'Group sizes',rawView:'Spikes by event'});
  Object.assign(COPY['zh-CN'],{change:'换图',jump:'点一次事件，回到原始信号与视频。',figure:'视图',heatView:'Unit 列表',meanView:'组平均曲线',sizeView:'各组占比',rawView:'逐次 spike'});
  Object.assign(COPY.es,{change:'Cambio de imagen',jump:'Pulsa un evento para ver su registro y vídeo.',figure:'Vista',heatView:'Filas por unidad',meanView:'Medias por grupo',sizeView:'Tamaño de grupos',rawView:'Spikes por evento'});
  Object.assign(COPY.en,{
    shapeGroups:n=>'Response-shape clustering · '+n+' groups',rateGroups:n=>'Firing-rate clustering · '+n+' groups',
    focusGroup:'Locate group',allGroups:'All groups',groupTip:'Jump to the first Unit in this group and highlight its mean curve. Choose All groups to restore the full view.',
    conditionTip:'Show this condition using the reference groups and row order.',rowTip:'Click to see spikes for each event. Ctrl/⌘-click to add a Unit. Click a selected row to remove it.',
    detailsTip:'See fit settings, excluded events, stability and options to save or export.'
  });
  Object.assign(COPY['zh-CN'],{
    shapeGroups:n=>'按响应形状聚类 · '+n+' 组',rateGroups:n=>'按放电率聚类 · '+n+' 组',
    focusGroup:'定位分组',allGroups:'全部分组',groupTip:'跳到这一组的首个 Unit，同时突出该组的平均曲线。选“全部分组”恢复。',
    conditionTip:'显示此条件的放电，沿用参照条件的组员和行序。',rowTip:'点击看各次事件的 spike。Ctrl／⌘＋点击可追加 Unit，再点高亮行取消。',
    detailsTip:'查看聚类参数、排除的事件和分半结果，可在此保存或导出分析。'
  });
  Object.assign(COPY.es,{
    shapeGroups:n=>'Agrupación por forma · '+n+' grupos',rateGroups:n=>'Agrupación por frecuencia · '+n+' grupos',
    focusGroup:'Localizar grupo',allGroups:'Todos los grupos',groupTip:'Salta a la primera unidad del grupo y resalta su curva media. Elige Todos los grupos para restaurar la vista.',
    conditionTip:'Muestra esta condición con los grupos y el orden de la referencia.',rowTip:'Pulsa para ver los spikes de cada evento. Ctrl/⌘ y clic añade una unidad. Otro clic en una fila seleccionada la quita.',
    detailsTip:'Consulta el ajuste, las exclusiones, la estabilidad y las opciones de guardado.'
  });
  Object.assign(COPY.en,{groupShape:'Group by response shape',normalOrder:'Restore Unit order',groupShapeTip:'Group Units with similarly shaped firing-rate curves across the event.',normalOrderTip:'Return to the original Unit order and keep the current selection.',trialTime:'Trial · recording time',eventTime:'Time from event onset',firstUnit:'Select a heatmap row to see this Unit’s spike times for every event.'});
  Object.assign(COPY['zh-CN'],{groupShape:'按响应形状分组',normalOrder:'恢复 Unit 原序',groupShapeTip:'将事件前后放电率变化形状相似的 Unit 排到一起。',normalOrderTip:'恢复原来的行序，并保留当前选中的 Unit。',trialTime:'试次 · 记录时间',eventTime:'相对事件起点',firstUnit:'点热图中的一行，查看这个 Unit 在每次事件中的真实 spike。'});
  Object.assign(COPY.es,{groupShape:'Agrupar por forma',normalOrder:'Restaurar orden',groupShapeTip:'Agrupa unidades con curvas de respuesta de forma similar.',normalOrderTip:'Recupera el orden original y conserva la selección.',trialTime:'Ensayo · tiempo',eventTime:'Desde el inicio del evento',firstUnit:'Selecciona una fila para ver los spikes de esa unidad en cada evento.'});
  const rowHeight=32, plotWidth=400;
  Object.assign(COPY.en,{png:'Save PNG',pngTip:'Save the heatmap and selected trial spikes on white. Group means are included when grouping is on.'});
  Object.assign(COPY['zh-CN'],{png:'保存 PNG',pngTip:'将热图和所选 Unit 的逐次 spike 保存为白底图片。分组后附各组平均曲线。'});
  Object.assign(COPY.es,{png:'Guardar PNG',pngTip:'Guarda el mapa y los spikes seleccionados sobre fondo blanco. Al agrupar se incluyen las curvas medias.'});
  function heatRow(r,index,baseline,scale,palette,columns,paint) {
    const bins=r.shape[2],count=Math.min(bins,columns),offset=index*bins;
    for(let col=0;col<count;col++){
      const a=Math.floor(col*bins/count),b=Math.floor((col+1)*bins/count);
      let total=0;
      for(let i=a;i<b;i++)total+=r.rateHz[offset+i];
      const value=Math.max(-1,Math.min(1,(total/(b-a)-baseline)/scale));
      paint(col,count,palette.heat[255+Math.round(value*255)]);
    }
  }

  // Keep rows at a readable height, including results with thousands of Units or trials.
  function rowList(box, count, makeRow, height=rowHeight, navigate) {
    box.replaceChildren();
    const rail=document.createElement('div');
    rail.className='ea-row-rail';rail.style.height=count*height+'px';box.append(rail);
    let first=-1,last=-1;
    function paint(force=false){
      const low=Math.max(0,Math.floor(box.scrollTop/height)-4);
      const high=Math.min(count,Math.ceil((box.scrollTop+(box.clientHeight||240))/height)+4);
      if(!force&&first===low&&last===high)return;
      first=low;last=high;
      const focused=rail.contains(document.activeElement)?Number(document.activeElement.closest('button')?.dataset.index):-1;
      const fragment=document.createDocumentFragment();
      for(let i=low;i<high;i++){
        const row=makeRow(i);row.type='button';row.dataset.index=i;
        row.style.top=i*height+'px';row.style.height=height+'px';row.classList.add('ea-review-row');
        fragment.append(row);
      }
      rail.replaceChildren(fragment);
      if(focused>=low&&focused<high)rail.querySelector('[data-index="'+focused+'"]')?.focus({preventScroll:true});
    }
    box.onscroll=()=>paint();
    if(!box.eaResizeObserver){
      box.eaResizeObserver=new ResizeObserver(()=>box.onscroll?.());
      box.eaResizeObserver.observe(box);
    }
    box.onkeydown=e=>{
      const row=e.target.closest('[data-index]');if(!row)return;
      const i=Number(row.dataset.index);
      const target={ArrowDown:i+1,ArrowUp:i-1,Home:0,End:count-1}[e.key];
      if(target==null)return;
      e.preventDefault();e.stopPropagation();const next=Math.max(0,Math.min(count-1,target));
      if(next*height<box.scrollTop)box.scrollTop=next*height;
      if((next+1)*height>box.scrollTop+box.clientHeight)box.scrollTop=(next+1)*height-box.clientHeight;
      paint();rail.querySelector('[data-index="'+next+'"]')?.focus({preventScroll:true});
      if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey)navigate?.(next);
    };
    paint(true);
    return ()=>paint(true);
  }

  function strip(){
    const canvas=document.createElement('canvas');
    canvas.width=plotWidth;canvas.height=18;canvas.setAttribute('aria-hidden','true');return canvas;
  }
  function label(text){
    const el=document.createElement('span');el.textContent=text;return el;
  }
  function axis(r){
    const {start,end}=r.parameters;
    const fraction=E.onsetFraction(r.parameters);
    const middle=fraction>0&&fraction<1?'<span class="ea-axis-zero" style="left:'+100*fraction+'%">0 s</span>':'';
    const tick=time=>'<span'+(time===0?' class="ea-onset-tick"':'')+'>'+time+' s</span>';
    const nearEdge=middle&&(fraction<.2||fraction>.8);
    return '<div class="ea-relative-axis'+(nearEdge?' ea-offset-zero':'')+'">'+tick(start)+middle+tick(end)+'</div>';
  }
  function zero(ctx,r){
    const fraction=E.onsetFraction(r.parameters);
    if(fraction===null)return;
    const x=Math.min(plotWidth-1,Math.floor(fraction*plotWidth));
    ctx.fillStyle=plotPalette().onset;
    for(let y=0;y<18;y+=6)ctx.fillRect(x,y,1,3);
  }
  function repeatedOnsets(r,event){
    if(r.parameters.repeatPolicy!=='keep' || !r.sameLabelOnsets)return null;
    return E.otherOnsetRange(r.sameLabelOnsets,event.start,r.parameters.start,r.parameters.end);
  }
  function drawRepeated(ctx,r,event,range,x,y,width,size,color){
    if(!range?.count)return;
    const {start,end}=r.parameters,a=event.start+start,step=(end-start)/width,ts=r.sameLabelOnsets;
    ctx.fillStyle=color;
    for(let i=range.lo;i<range.hi;i++){
      if(i===range.skip)continue;
      const pixel=Math.floor((ts[i]-a)/step),cx=x+pixel;
      ctx.beginPath();ctx.moveTo(cx,y);ctx.lineTo(cx+size,y+size);ctx.lineTo(cx,y+size*2);ctx.lineTo(cx-size,y+size);ctx.closePath();ctx.fill();
      if(range.count>width*2)i=Math.max(i,E.lowerBound(ts,a+(pixel+1)*step)-1);
    }
  }
  function lines(r,series,max,compact=false) {
    const {start,end}=r.parameters;
    const width=compact?300:460,x0=36,x1=width-10,y0=compact?100:76,plotHeight=y0-15,high=Math.max(max,1),n=r.shape[2];
    const fraction=E.onsetFraction(r.parameters),zx=fraction===null?null:x0+(x1-x0)*fraction;
    const paths=series.map(({values,color})=>{
      const points=Array.from(values,(v,b)=>((x0+(x1-x0)*(b+.5)/n).toFixed(1))+','+((y0-plotHeight*v/high).toFixed(2))).join(' ');
      return '<polyline fill="none" stroke="'+color+'" stroke-width="1.9" points="'+points+'"/>';
    }).join('');
    const axisY=y0+18;
    return '<svg viewBox="0 0 '+width+' '+(axisY+6)+'" role="img" aria-label="Hz"><path class="event-axis" d="M36 12V'+y0+'H'+x1+'"/>'+
      (zx!==null?'<line class="event-zero" x1="'+zx+'" x2="'+zx+'" y1="12" y2="'+y0+'"/>':'')+
      paths+'<text x="2" y="20">'+high.toFixed(1)+'</text><text x="20" y="'+y0+'">0</text>'+
      (zx===null||zx-x0>32?'<text x="36" y="'+axisY+'">'+start+' s</text>':'')+
      (zx!==null?'<text class="ea-onset-tick" x="'+zx+'" y="'+axisY+'" text-anchor="'+(zx-x0<16?'start':x1-zx<16?'end':'middle')+'">0 s</text>':'')+
      (zx===null||x1-zx>32?'<text x="'+x1+'" y="'+axisY+'" text-anchor="end">'+end+' s</text>':'')+'</svg>';
  }

  class EventReview {
    constructor(ui,previous){
      this.ui=ui;this.result=ui.result;
      this.words=COPY[document.documentElement.lang]||COPY.en;
      const {response:r,clusters,view}=this.result;
      const previousReview=previous?.result.response===r?previous:null;
      this.comparison=E.comparisonOf(r.parameters);
      this.legacyOutcome=E.recordedOutcome(this.comparison?.field,this.comparison?.values);
      this.ref=this.comparison?.values[0];
      this.views=new Map();
      const preBins=r.binEdges.slice(1).filter(edge=>edge<=1e-9).length;
      this.subtract=preBins>0;
      this.lookup=new Map(r.unitIds.map((id,i)=>[id,i]));
      const samples=[];
      this.maxGroupHz=1;
      for(const key of this.comparison?.values||['all']){
        const v=previousReview?.views.get(key)?.response || (this.comparison?E.conditionResponse(r,key):r);
        if(!v)continue;
        const summary=E.responseSummary(v,clusters),bins=v.shape[2],offsets=new Float64Array(v.shape[0]);
        const stride=Math.max(1,Math.floor(v.rateHz.length/30000));
        for(let u=0;u<v.shape[0];u++){
          if(preBins)for(let b=0;b<preBins;b++)offsets[u]+=v.rateHz[u*bins+b]/preBins;
        }
        for(let i=0;i<v.rateHz.length;i+=stride)samples.push(Math.abs(v.rateHz[i]-offsets[Math.floor(i/bins)]));
        for(const g of summary.groups)for(const value of g.meanRateHz)this.maxGroupHz=Math.max(this.maxGroupHz,value);
        this.views.set(key,{response:v,summary,offsets});
      }
      samples.sort((a,b)=>a-b);
      this.scale=Math.max(1,Math.ceil(samples[Math.floor(.97*(samples.length-1))]||0));
      this.outcome=this.views.has(view?.outcome)?view.outcome:(this.views.has(this.ref)?this.ref:this.views.keys().next().value);
      this.selected=(view?.unitIds||[]).filter(id=>this.lookup.has(id));
      this.eventId=view?.eventId||null;
      this.times=previousReview?.times || new Map(ui.responseTrains?.get(r)||[]);
      this.group=null;
    }
    w(key){return this.words[key]??this.ui.t(key);}
    conditionField(){
      const p=this.result.response.parameters;
      if(this.legacyOutcome)return this.ui.t('savedOutcome')+' · '+this.comparison.field;
      return p.responseRule?this.ui.t('ruleKey')+' · '+p.eventType+' → '+p.responseRule.type+' ['+p.responseRule.start+', '+p.responseRule.end+') s':this.comparison?.field;
    }
    conditionName(value){
      if((this.legacyOutcome||this.result.response.parameters.responseRule) && ['hit','miss'].includes(value))return this.ui.t(value);
      return E.conditionText(value,this.comparison?.values);
    }
    get current(){return this.views.get(this.outcome).response;}
    remember(){
      this.result.view={outcome:this.outcome,unitIds:this.selected.slice(),eventId:this.eventId};
    }
    render(){
      const ui=this.ui, r=this.result.response;
      const action=(name,key)=>'<button type="button" data-ea-action="'+name+'" title="'+esc(ui.t(name+'Tip'))+'">'+esc(ui.t(key))+'</button>';
      this.panel=ui.resultPanel;
      const heading=r.parameters.eventType==='image_change'?this.w('change'):r.parameters.eventType||ui.t('event');
      ui.workspaceTab?.rename(r.parameters.eventType);
      const c=this.result.clusters,groups=ui.summary.groups;
      const legend=groups.map((g,i)=>'<span data-ea-group="'+(g.cluster??'none')+'" style="--group-color:'+this.groupColor(g,i)+'">'+this.groupName(g)+' · '+g.unitIds.length+'</span>').join('');
      const groupPicker=c&&groups.length>1?'<label class="ea-group-picker">'+this.w('focusGroup')+' <select data-ea-group-picker title="'+this.w('groupTip')+'"><option value="">'+this.w('allGroups')+'</option>'+
        groups.map(g=>'<option value="'+(g.cluster??'none')+'">'+this.groupName(g)+'</option>').join('')+'</select></label>':'';
      this.panel.innerHTML='<div data-ea-cluster-review><div class="ea-review-head"><div><strong title="'+esc(r.parameters.eventType)+'">'+esc(heading)+'</strong> <span data-ea-counts></span></div><div data-ea-conditions></div></div>'+
        '<p class="ea-origin-caption" data-ea-origin>'+esc(ui.originCaption(r.parameters))+'</p>'+
        '<div class="ea-review-layout"><section data-ea-pane="heat"><div class="ea-cluster-heading"><div class="ea-heat-title"><h3>'+this.w('responses')+'</h3><div data-ea-heat-key></div></div>'+
        '<button type="button" data-ea-action="shape-groups" '+(this.legacyOutcome?'disabled ':'')+'aria-pressed="'+Boolean(c)+'" title="'+esc(this.w(c?'normalOrderTip':'groupShapeTip'))+'">'+this.w(c?'normalOrder':'groupShape')+'</button></div>'+
        (c?'<div class="ea-group-bar"><strong>'+this.w(c.normalization==='shape'?'shapeGroups':'rateGroups')(c.k)+'</strong>'+groupPicker+'</div>':'')+
        '<div class="ea-plot-head" data-ea-scale><span>Unit</span>'+axis(r)+'</div><div class="ea-review-scroll" data-ea-units></div></section>'+
        '<section data-ea-pane="trials"><div class="ea-cluster-heading"><h3>'+this.w('raw')+'</h3><div data-ea-unit-keys aria-live="polite"></div></div>'+
        '<p class="ea-review-hint" data-ea-prompt></p><div data-ea-raster-content hidden><div class="ea-plot-head" data-ea-raster-axis><span title="'+esc(this.w('trialTime'))+'">'+this.w('trialTime')+'</span>'+axis(r)+'</div>'+
        '<div class="ea-review-scroll" data-ea-raw></div><p class="ea-review-hint">'+(r.events.some(e=>repeatedOnsets(r,e)?.count)?esc(ui.t('marker'))+' · ':'')+this.w('jump')+'</p></div></section></div>'+
        (c?'<details class="ea-curves" data-ea-group-details><summary>'+this.w('mean')+'</summary><div class="ea-legend">'+legend+'</div><div data-ea-means></div></details>':'')+
        '<details class="ea-curves" data-ea-unit-curve-details hidden><summary>'+this.w('individual')+'</summary><div data-ea-unit-lines></div></details>'+
        '<div class="ea-result-foot"><details data-ea-method><summary title="'+this.w('detailsTip')+'">'+this.w('method')+'</summary><p data-ea-method-coverage></p><p data-ea-method-text></p><div class="event-analysis-actions">'+
        action('export','export')+(ui.canSave?.()?action('save','save'):'')+'</div></details>'+
        '<button type="button" data-ea-png title="'+esc(this.w('pngTip'))+'">'+this.w('png')+'</button></div>'+
        '<div hidden><select name="resultUnit"></select><select name="populationUnit"></select><select name="resultEvent"></select></div></div>';
      this.get=name=>this.panel.querySelector('[data-ea-'+name+']');
      this.viewRoot=this.get('cluster-review');
      const maxDigits=r.unitIds.reduce((n,id)=>Math.max(n,String(this.ui.state.activeRecording?.jointUnits?.get(id)?.unitId??id).length),0);
      this.get('units').closest('section').style.setProperty('--ea-label-width','min(34%, '+Math.min(12,Math.max(6,maxDigits+1))+'ch)');
      this.viewRoot.onclick=e=>this.click(e);
      this.enablePlotExport();
      const diagnostic=this.result.diagnostics;
      const failures=new Map();
      for(const run of diagnostic?.runs||[])if(run.reason)failures.set(run.reason,(failures.get(run.reason)||0)+1);
      const diag=diagnostic?.successful?this.w('stability')+' '+diagnostic.meanARI.toFixed(2)+' ('+diagnostic.minARI.toFixed(2)+'–'+diagnostic.maxARI.toFixed(2)+', '+diagnostic.successful+'/'+diagnostic.parameters.repeats+')':diagnostic?this.w('stability')+' 0/'+diagnostic.parameters.repeats:'';
      this.get('method-text').textContent=[this.comparison?this.w('reference')+' · '+this.conditionField()+' = '+this.conditionName(this.ref):'',this.result.clusters?'k = '+this.result.clusters.k+' · '+this.result.clusters.normalization+' · seed '+this.result.clusters.seed:'',diag,diagnostic?.reason,...Array.from(failures,([reason,n])=>n+' × '+reason),this.w('excluded')+' '+r.excludedEvents.length].filter(Boolean).join('  ·  ');
      if(diagnostic && diagnostic.status!=='available')this.get('method').open=true;
      this.get('method-coverage').textContent=ui.coverageMessage(this.result.provenance);
      this.get('cluster-review').querySelector('[data-ea-method]').append(document.createTextNode(this.result.provenance.interpretation||''));
      if(this.comparison){
        this.get('conditions').innerHTML=this.comparison.values.map((key,i)=>'<button type="button" data-ea-condition="'+esc(key)+'" data-ea-condition-index="'+i+'" title="'+esc(this.w('conditionTip'))+'" '+(this.views.has(key)?'':'disabled')+'>'+esc(this.conditionName(key))+' · '+(this.views.get(key)?.response.shape[1]||0)+'</button>').join('');
      }
      this.showCondition();
      if(this.selected.length)this.scrollToUnit(this.selected.at(-1));
    }
    click(e){
      const button=e.target.closest('button');if(!button)return;
      const d=button.dataset;
      if(button.hasAttribute('data-ea-png')){
        this.saveFigure();
        return;
      }
      if(d.eaConditionIndex!=null){
        const value=this.comparison.values[Number(d.eaConditionIndex)];
        if(this.outcome===value||!this.views.has(value))return;
        this.outcome=value;this.eventId=null;this.remember();this.showCondition();return;
      }
      if(d.eaUnit!=null){
        const id=Number(d.eaUnit);
        if(this.selected.includes(id))this.selected=this.selected.filter(x=>x!==id);
        else if(e.ctrlKey||e.metaKey)this.selected.push(id);
        else this.selected=[id];
        this.unitChanged();return;
      }
      if(d.eaTrial!=null){
        const index=Number(d.eaTrial),event=this.current.events[index];
        this.eventId=event.id;this.remember();this.ui.input('resultEvent').value=String(index);
        const cell=e.target.closest('[data-spike-unit]');
        this.ui.jumpToEvent(cell?Number(cell.dataset.spikeUnit):this.selected[0],event);
      }
    }
    change(field){
      if(field.matches('[data-ea-group-picker]')){
        this.group=field.value||null;
        const summary=this.ui.summary;
        const first=summary.groups.find(g=>String(g.cluster??'none')===this.group)?.unitIds[0];
        this.get('units').scrollTop=first==null?0:summary.unitOrder.indexOf(first)*rowHeight;
        this.renderUnits();
      }else if(['populationUnit','resultUnit'].includes(field.name)){
        const id=Number(field.value);
        if(this.lookup.has(id)){this.selected=[id];this.ui.selectUnit?.(id);this.unitChanged();}
      }else if(field.name==='resultEvent'){
        this.eventId=this.current.events[Number(field.value)]?.id||null;this.remember();
      }
    }
    showCondition(){
      const v=this.views.get(this.outcome),r=v.response;
      this.ui.summary=v.summary;
      this.get('counts').textContent=(this.comparison?this.conditionField()+' · '+this.w('reference')+' '+this.conditionName(this.ref)+'　':'')+
        r.shape[0]+' Units · '+r.shape[1]+' '+this.w('trials')+' · '+(r.parameters.binWidth*1000).toLocaleString()+' ms';
      this.get('conditions').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(this.comparison.values[Number(b.dataset.eaConditionIndex)]===this.outcome)));
      const unitOptions=v.summary.unitOrder.map(id=>'<option value="'+id+'">'+id+'</option>').join('');
      this.ui.input('populationUnit').innerHTML=this.ui.input('resultUnit').innerHTML=unitOptions;
      this.ui.input('resultEvent').innerHTML=r.events.map((event,i)=>'<option value="'+i+'">'+esc(event.sourceId)+'</option>').join('');
      this.ui.input('resultEvent').value=String(Math.max(0,r.eventIds.indexOf(this.eventId)));
      this.get('heat-key').innerHTML='<div class="ea-heat-key">'+esc(this.subtract?this.w('delta'):this.w('rate'))+
        ' <span>'+(this.subtract?'−'+this.scale:'0')+'</span><span class="ea-swatches" '+(this.subtract?'':'data-sequential')+
        ' aria-hidden="true"></span><span>+'+this.scale+'</span></div>';
      const groups=v.summary.groups;
      if(this.result.clusters)this.get('means').innerHTML=lines(r,groups.map((g,i)=>({values:g.meanRateHz,color:this.groupColor(g,i)})),this.maxGroupHz,true);
      this.renderUnits();this.renderSelection();
      this.ui.status('',false);
    }
    groupColor(g,i){return g.cluster==null?'var(--ea-unassigned)':seriesColor(i);}
    groupName(g){return g.cluster==null?this.w('ungrouped'):this.w('group')+' '+(g.cluster+1);}
    enablePlotExport(){
      mountedReviews.set(this.viewRoot,this);
      this.viewRoot.addEventListener('contextmenu',event=>{
        if(!event.target.closest('.ea-review-row,canvas,svg'))return;
        const unitCell=event.target.closest('[data-spike-unit],[data-ea-unit]');
        const key=unitCell && window.NeuropixelsUnitMarks?.ref(this.ui.state.activeRecording,unitCell.dataset.spikeUnit??unitCell.dataset.eaUnit);
        EventReview.exportMenu(event,this.viewRoot,this.get('png'),()=>this.saveFigure(),key);
      });
    }
    static exportMenu(event,host,exportButton,onSave,unitKey){
      event.preventDefault();event.stopPropagation();host.querySelector('.ea-image-menu')?.remove();
      const menu=document.createElement('div'),save=document.createElement('button');
      menu.className='ea-image-menu';menu.popover='auto';
      save.type='button';save.textContent=exportButton.textContent;save.title=exportButton.title;save.disabled=exportButton.disabled;
      if(unitKey)window.NeuropixelsUnitMarks.appendActions(menu,unitKey,()=>menu.hidePopover());
      menu.append(save);host.append(menu);
      menu.addEventListener('toggle',e=>{if(e.newState==='closed')menu.remove();});
      save.onclick=()=>{menu.hidePopover();onSave();};
      menu.showPopover();
      const anchor=event.target.getBoundingClientRect();
      menu.style.left=Math.max(0,Math.min(event.clientX||anchor.left,innerWidth-menu.offsetWidth-4))+'px';
      menu.style.top=Math.max(0,Math.min(event.clientY||anchor.top,innerHeight-menu.offsetHeight-4))+'px';
      if(!save.disabled)save.focus();
    }
    figureReady(){return this.selected.every(id=>this.times.has(id));}
    syncFigureButton(){
      const button=this.get('png');
      if(button){button.disabled=!this.figureReady();button.title=this.w(button.disabled?'waiting':'pngTip');}
    }
    saveFigure(){
      if(!this.figureReady())return;
      const r=this.current,name=[this.result.recordingId||this.ui.state.activeRecording.key,r.parameters.eventType,this.outcome]
        .join('-').replace(/[<>:"/\\|?*]/g,'_');
      this.exportOverview(this.views.get(this.outcome)).toBlob(blob=>{
        if(!blob)return;
        const url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=name+(this.result.clusters?'-clusters':'-responses')+'.png';
        a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
      },'image/png');
    }
    exportOverview(v){
      const palette=plotPalette(true),r=v.response,{start,end,eventType,binWidth}=r.parameters;
      const {unitOrder,groups}=v.summary,selected=this.selected,clustered=!!this.result.clusters;
      const hasRaster=selected.length>0,hasSide=hasRaster||clustered;
      const width=hasSide?1320:800,left=143,top=116,heatWidth=hasSide?526:620,right=846,sideWidth=width-right-32;
      const heatHeight=Math.max(230,Math.min(7200,unitOrder.length*5));
      const rasterHeight=Math.max(230,Math.min(7200,r.events.length*selected.length*9));
      const legendRows=Math.ceil(selected.length/2),legendH=hasRaster?legendRows*19:0,rasterTop=top+legendH;
      const meanTop=hasRaster?rasterTop+rasterHeight+94:top,meanHeight=195;
      const legendGroupH=Math.ceil(groups.length/3)*20;
      const height=Math.ceil(Math.max(top+heatHeight+86,hasRaster?rasterTop+rasterHeight+56:0,
        clustered?meanTop+meanHeight+62+legendGroupH:0));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d',{alpha:false});
      const ink='#273139',muted='#485561',grid='#ccd3d7',bins=r.shape[2];
      const text=(s,x,y,size=14,color=ink,align='left',maxWidth=width,weight=400)=>{
        ctx.fillStyle=color;ctx.font=weight+' '+size+'px system-ui,sans-serif';ctx.textAlign=align;ctx.fillText(s,x,y,maxWidth);
      };
      const line=(x1,y1,x2,y2,color,weight=1,dash=[])=>{
        ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.setLineDash(dash);
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);
      };
      const axis=(x,y,w,h)=>{
        const f=E.onsetFraction(r.parameters),z=f===null?null:x+w*f;
        line(x,y+h,x+w,y+h,grid);
        if(z!==null){
          line(z,y,z,y+h,palette.onset,1,[4,4]);
          text('0 s',z,y+h+20,14,ink,(z-x<22?'left':x+w-z<22?'right':'center'));
        }
        if(z===null||z-x>45)text(start+' s',x,y+h+20,14,muted);
        if(z===null||x+w-z>45)text(end+' s',x+w,y+h+20,14,muted,'right');
      };
      const recording=this.ui.state.activeRecording,condition=this.comparison?this.conditionField()+' = '+this.conditionName(this.outcome):'';
      const meta=[recording.name||recording.key,condition,r.shape[0]+' Units',r.shape[1]+' '+this.w('trials'),
        +(binWidth*1000).toPrecision(6)+' ms/bin'].filter(Boolean).join(' · ');
      const origin=this.ui.originCaption(r.parameters);
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
      text(eventType,20,30,23,ink,'left',width-40,650);text(meta,20,55,15);
      text(origin,20,76,14,muted);canvas.setAttribute('aria-label',[eventType,meta,origin,...selected.map(id=>this.ui.unitName(id))].join(' · '));
      text(this.w('responses'),left,top-10,16,ink,'left',heatWidth,600);
      const stride=Math.max(1,Math.ceil(24*unitOrder.length/heatHeight)),chosen=new Set(selected);
      const selectedRows=unitOrder.map((id,i)=>chosen.has(id)?i:-1).filter(i=>i>=0);
      const pickIndex=new Map(selected.map((id,k)=>[id,k]));
      const groupColors=new Map(groups.map((g,i)=>[g,g.cluster==null?palette.unassigned:palette.series[i%6]]));
      const xEnd=left+heatWidth,yEnd=top+heatHeight;
      let offset=0;
      for(const g of groups){
        const h=heatHeight*g.unitIds.length/unitOrder.length;
        if(clustered){ctx.fillStyle=groupColors.get(g);ctx.fillRect(left-7,top+offset,5,h);}
        offset+=h;
      }
      for(let i=0;i<unitOrder.length;i++){
        const id=unitOrder[i],u=this.lookup.get(id),y=top+i*heatHeight/unitOrder.length;
        const h=heatHeight/unitOrder.length,middle=y+h/2;
        heatRow(r,u,v.offsets[u],this.scale,palette,heatWidth,(j,n,color)=>{
          const a=Math.round(j*heatWidth/n),b=Math.round((j+1)*heatWidth/n);
          ctx.fillStyle='rgb('+color.join(',')+')';ctx.fillRect(left+a,Math.floor(y),b-a,Math.ceil(y+h)-Math.floor(y));
        });
        const marks=window.NeuropixelsUnitMarks?.colors(this.ui.state.activeRecording,id)||[];
        marks.forEach((color,k)=>{ctx.fillStyle=color;ctx.fillRect(xEnd+8+k*3,y,3,Math.max(1,h));});
        if(chosen.has(id)){
          const k=pickIndex.get(id);ctx.fillStyle=palette.series[k%6];ctx.fillRect(xEnd+2,y,4,Math.max(h,2));
        }else if(i%stride===0&&!selectedRows.some(index=>Math.abs(i-index)<stride)){
          text(this.ui.unitName(id),left-12,Math.min(yEnd,Math.max(top+10,middle+4)),12,muted,'right',left-18);
        }
      }
      // Give nearby selected rows separate labels without moving their heatmap rows.
      let previous=top-10;
      for(const index of selectedRows){
        const id=unitOrder[index],mid=top+(index+.5)*heatHeight/unitOrder.length;
        const y=Math.max(previous+15,mid+4,top+10);previous=y;
        const color=palette.series[pickIndex.get(id)%6];
        line(left-11,y-4,left-2,mid,color);
        text(this.ui.unitName(id),left-15,y,12,color,'right',left-18,650);
      }
      axis(left,top,heatWidth,heatHeight);
      const keyY=yEnd+47,keyX=left+heatWidth-145;
      text(this.w(this.subtract?'delta':'rate'),left,keyY+4,14);
      const grad=ctx.createLinearGradient(keyX,0,keyX+120,0);
      grad.addColorStop(0,this.subtract?palette.negative:palette.neutral);
      if(this.subtract)grad.addColorStop(.5,palette.neutral);
      grad.addColorStop(1,palette.positive);ctx.fillStyle=grad;ctx.fillRect(keyX,keyY-7,120,10);
      text(this.subtract?'−'+this.scale:'0',keyX-5,keyY+4,13,muted,'right');text('+'+this.scale,keyX+124,keyY+4,13,muted);
      if(this.subtract)text('0',keyX+60,keyY+18,12,muted,'center');
      if(hasRaster){
        text(this.w('raw'),right,top-10,16,ink,'left',sideWidth,600);
        selected.forEach((uid,k)=>{
          const x=right+(k%2)*sideWidth/2,y=top+10+Math.floor(k/2)*19;
          ctx.fillStyle=palette.series[k%6];ctx.fillRect(x,y-6,14,3);
          text(this.ui.unitName(uid),x+20,y,13,ink,'left',sideWidth/2-24);
        });
        const trialH=rasterHeight/r.events.length,subH=trialH/selected.length;
        const tickHeight=Math.max(1,Math.min(14,subH*.74));
        const every=Math.max(1,Math.ceil(23/trialH));
        axis(right,rasterTop,sideWidth,rasterHeight);
        if(r.events.some(e=>repeatedOnsets(r,e)?.count))text(this.ui.t('marker'),right,rasterTop+rasterHeight+47,12,palette.positive);
        for(const [i,event] of r.events.entries()){
          const y=rasterTop+i*trialH,a=event.start+start,b=event.start+end;
          if(i%every===0||event.id===this.eventId){
            text('#'+(i+1)+'  '+event.start.toFixed(3)+' s',right-10,Math.max(rasterTop+10,y+Math.min(trialH,16)*.75),12,muted,'right',right-xEnd-18);
          }
          drawRepeated(ctx,r,event,repeatedOnsets(r,event),right,y,sideWidth,Math.min(2.6,trialH/2),palette.positive);
          selected.forEach((uid,k)=>{
            const train=this.times.get(uid),low=E.lowerBound(train,a),high=E.lowerBound(train,b);
            ctx.fillStyle=palette.series[k%6];
            for(let j=low;j<high;j++){
              const x=right+(train[j]-a)/(end-start)*sideWidth;
              ctx.fillRect(x,y+(k+.5)*subH-tickHeight/2,1.3,tickHeight);
            }
          });
        }
      }
      if(clustered){
        text(this.w('mean'),right,meanTop-10,16,ink,'left',sideWidth,600);
        line(right,meanTop,right,meanTop+meanHeight,grid);
        text(this.maxGroupHz.toFixed(1),right-7,meanTop+10,12,muted,'right');
        text('0',right-7,meanTop+meanHeight,12,muted,'right');
        groups.forEach((g,i)=>{
          ctx.strokeStyle=groupColors.get(g);ctx.lineWidth=1.8;ctx.beginPath();
          g.meanRateHz.forEach((hz,b)=>{
            const x=right+sideWidth*(b+.5)/bins,y=meanTop+meanHeight*(1-hz/this.maxGroupHz);
            if(b)ctx.lineTo(x,y);else ctx.moveTo(x,y);
          });
          ctx.stroke();
          const x=right+i%3*sideWidth/3,y=meanTop+meanHeight+46+20*Math.floor(i/3);
          ctx.fillStyle=groupColors.get(g);ctx.fillRect(x,y-7,12,3);
          text(this.groupName(g)+' · '+g.unitIds.length,x+17,y,13,ink,'left',sideWidth/3-24);
        });
        axis(right,meanTop,sideWidth,meanHeight);
      }
      return canvas;
    }
    renderUnits(){
      const v=this.views.get(this.outcome),r=v.response,rows=[],box=this.get('units');
      const groups=v.summary.groups;
      const picker=this.get('group-picker');if(picker)picker.value=this.group??'';
      this.get('means')?.querySelectorAll('polyline').forEach((line,i)=>{
        line.classList.toggle('ea-muted-mean',this.group!==null&&this.group!==String(groups[i].cluster??'none'));
      });
      for(const g of groups)g.unitIds.forEach((id,i)=>rows.push({id,g,first:i===0}));
      const top=box.scrollTop;
      this.refreshUnits=rowList(box,rows.length,index=>{
        const {id,g,first}=rows[index],u=this.lookup.get(id);
        const row=document.createElement('button');
        row.dataset.eaUnit=id;row.dataset.group=String(g.cluster??'none');
        row.setAttribute('aria-pressed',String(this.selected.includes(id)));
        const title=this.ui.unitName(id);
        row.setAttribute('aria-label',this.result.clusters?title+', '+this.groupName(g):title);
        row.title=title+' · '+this.w('rowTip');
        row.classList.toggle('ea-group-start',Boolean(this.result.clusters)&&first);
        row.classList.toggle('ea-dim',this.group!=null&&this.group!==row.dataset.group);
        const original=this.ui.state.activeRecording?.jointUnits?.get(id);
        const name=label(String(original?.unitId??id));
        window.NeuropixelsUnitMarks?.bind(name,this.ui.state.activeRecording,id);
        const detail=[original?.probeName,this.result.clusters?this.groupName(g):''].filter(Boolean).join(' · ');
        if(this.result.clusters){
          name.className='ea-member';
          name.style.setProperty('--group-color',this.groupColor(g,g.cluster));
        }
        if(detail)name.append(Object.assign(document.createElement('small'),{textContent:detail}));
        row.append(name);
        const canvas=strip(),ctx=canvas.getContext('2d');
        heatRow(r,u,v.offsets[u],this.scale,plotPalette(),plotWidth,(j,n,color)=>{
          ctx.fillStyle='rgb('+color.join(',')+')';
          ctx.fillRect(j*plotWidth/n,0,Math.ceil(plotWidth/n),18);
        });
        zero(ctx,r);row.append(canvas);return row;
      },rowHeight,index=>{this.selected=[rows[index].id];this.unitChanged();});
      box.scrollTop=top;this.refreshUnits();
    }
    unitChanged(){
      this.remember();
      this.get('units').querySelectorAll('[data-ea-unit]').forEach(row=>row.setAttribute('aria-pressed',String(this.selected.includes(Number(row.dataset.eaUnit)))));
      this.renderSelection();
    }
    scrollToUnit(id){
      const index=this.ui.summary.unitOrder.indexOf(id),box=this.get('units');
      if(index<0)return;
      if(index*rowHeight<box.scrollTop||(index+1)*rowHeight>box.scrollTop+box.clientHeight)
        box.scrollTop=Math.max(0,index*rowHeight-(box.clientHeight-rowHeight)/2);
      box.onscroll?.();
    }
    revealUnit(id){
      if(!this.lookup.has(id))return;
      if(this.group!==null){this.group=null;this.renderUnits();}
      this.selected=[id];this.scrollToUnit(id);this.unitChanged();
      this.get('units').querySelector('[data-ea-unit="'+id+'"]')?.focus({preventScroll:true});
    }
    renderSelection(){
      this.syncFigureButton();
      const r=this.current,ui=this.ui,bins=r.shape[2],id=this.selected.at(-1);
      if(id!=null){ui.input('resultUnit').value=String(id);ui.input('populationUnit').value=String(id);}
      this.get('raster-content').hidden=!this.selected.length;
      this.get('unit-curve-details').hidden=!this.selected.length;
      this.get('prompt').hidden=!!this.selected.length;
      this.get('prompt').textContent=this.w('firstUnit');
      this.get('unit-keys').replaceChildren();
      if(!this.selected.length){this.stop();this.get('raw').replaceChildren();return;}
      const keys=this.selected.map((uid,i)=>'<span '+(window.NeuropixelsUnitMarks?.attrs(this.ui.state.activeRecording,uid)||'')+' style="--group-color:'+seriesColor(i)+'">'+esc(this.ui.unitName(uid))+'</span>');
      this.get('unit-keys').innerHTML=keys.join('');
      let max=1;
      for(const {response} of this.views.values()){
        for(const uid of this.selected){
          const offset=this.lookup.get(uid)*bins;
          for(let b=0;b<bins;b++)max=Math.max(max,response.rateHz[offset+b]);
        }
      }
      this.get('unit-lines').innerHTML=lines(r,this.selected.map((uid,i)=>{
        const offset=this.lookup.get(uid)*bins;
        return {values:r.rateHz.subarray(offset,offset+bins),color:seriesColor(i)};
      }),max);
      this.loadSpikes();
    }
    stop(){
      this.reader?.abort();this.reader=null;this.loading='';
    }
    resume(rawTop){
      if(this.selected.length){
        this.loadSpikes();
        if(Number.isFinite(rawTop)){
          const box=this.get('raw');box.scrollTop=rawTop;box.onscroll?.();
        }
      }
      if(this.eventId)this.get('raw').querySelector('[data-ea-trial="'+this.current.eventIds.indexOf(this.eventId)+'"]')?.focus({preventScroll:true});
    }
    loadSpikes(){
      const missing=this.selected.filter(id=>!this.times.has(id));
      if(!missing.length){this.stop();this.renderTrials();return;}
      const signature=missing.join(',');if(this.loading===signature)return;
      this.stop();this.loading=signature;
      const box=this.get('raw');box.onscroll=null;box.replaceChildren(label(this.w('waiting')));
      const request=this.reader=new AbortController();
      this.readTrains(missing,request.signal).then(trains=>{
        if(request!==this.reader)return;
        this.stop();if(this.ui.result!==this.result||!(this.ui.panelOpen??this.ui.dialog.open))return;
        for(const t of trains)this.times.set(t.unitId,t.spikes);
        for(const uid of this.times.keys())if(this.times.size>Math.max(8,this.selected.length)&&!this.selected.includes(uid))this.times.delete(uid);
        this.renderTrials();
      }).catch(error=>{if(request===this.reader){this.stop();box.replaceChildren(label(error.message));}});
    }
    readTrains(ids,signal){
      const recording=this.ui.state.activeRecording,r=this.result.response;
      const timeWindows=E.eventWindows(r.events,r.binEdges[0],r.binEdges.at(-1));
      const url=URL.createObjectURL(new Blob([core.createEventWorkerSource(E.workerSource())],{type:'text/javascript'}));
      let worker,abort;
      return new Promise((resolve,reject)=>{
        abort=()=>reject(new DOMException('Cancelled','AbortError'));
        if(signal.aborted){abort();return;}
        worker=new Worker(url);
        signal.addEventListener('abort',abort,{once:true});
        worker.onerror=e=>reject(Error(e.message));
        worker.onmessage=({data})=>{if(data.error)reject(Error(data.error));else if(data.trains)resolve(data.trains);};
        worker.postMessage({operation:'trains',files:{spikeTimes:recording.spikeTimesFile,spikeClusters:recording.spikeClustersFile},
          sampleRate:recording.sampleRate,unitIds:ids,limits:{timeWindows}});
      }).finally(()=>{worker?.terminate();URL.revokeObjectURL(url);signal.removeEventListener('abort',abort);});
    }
    renderTrials(){
      this.syncFigureButton();
      const r=this.current, video=this.ui.video,box=this.get('raw');
      rowList(box,r.events.length,i=>{
        const event=r.events[i],row=document.createElement('button');
        row.dataset.eaTrial=i;row.dataset.eventId=event.id;row.dataset.neuralTime=event.start;
        const repeated=repeatedOnsets(r,event);
        let note='';
        if(video.source&&video.mapping){
          const vt=video.mapping.neuralToVideo(event.start);
          const covered=Number.isFinite(vt)&&vt>=0&&vt<=video.source.duration;
          row.dataset.videoCovered=String(covered);note=covered?this.w('video')+' '+vt.toFixed(2)+' s':this.w('outside');
        }
        const tag=label('#'+(i+1)+' · '+event.start.toFixed(3)+' s');
        if(note){const detail=document.createElement('small');detail.textContent=note;tag.append(detail);}
        const otherTimes=[];
        for(let j=repeated?.lo;j<repeated?.hi && otherTimes.length<6;j++){
          if(j!==repeated.skip)otherTimes.push(Number((r.sameLabelOnsets[j]-event.start).toFixed(4))+' s');
        }
        const others=otherTimes.length?this.ui.t('marker')+' × '+repeated.count+' · '+otherTimes.join(', ')+(repeated.count>otherTimes.length?' …':''):'';
        row.dataset.otherOnsets=String(repeated?.count||0);
        row.title=[event.sourceId,event.start.toFixed(3)+' s',note,others,this.w('jump')].filter(Boolean).join(' · ');row.append(tag);
        row.setAttribute('aria-label',[this.w('event')+' '+(i+1),this.ui.t('recordingTime')+' '+event.start.toFixed(3)+' s',note,others].filter(Boolean).join(', '));
        row.classList.toggle('ea-trial-current',event.id===this.eventId);
        const charts=document.createElement('span');charts.className='ea-raw-strips';
        this.selected.forEach((uid,k)=>{
          const s=this.times.get(uid),c=strip(),ctx=c.getContext('2d');c.dataset.spikeUnit=uid;
          zero(ctx,r);ctx.fillStyle=plotPalette().series[k%6];
          const a=event.start+r.parameters.start,b=event.start+r.parameters.end;
          const from=E.lowerBound(s,a),to=E.lowerBound(s,b);
          c.dataset.spikeCount=to-from;
          for(let j=from;j<to;j++)ctx.fillRect((s[j]-a)/(b-a)*plotWidth,1,1.45,16);
          drawRepeated(ctx,r,event,repeated,0,0,plotWidth,3.2,plotPalette().positive);
          charts.append(c);
        });row.append(charts);return row;
      },Math.max(rowHeight,4+20*this.selected.length));
    }
  }
  Object.assign(EventReview,{plotPalette,heatRow});
  window.NeuropixelsEventReview=EventReview;
})();
