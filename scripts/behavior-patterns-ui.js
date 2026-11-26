// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const PAGE = 20;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const seconds = t => Number.isFinite(t) ? t.toFixed(3) : '—';
  const opt = (value, label, selected) => `<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`;
  const strings = {
    title:['Spikes across events','同类事件放电','Spikes entre eventos'],
    close:['Close','关闭','Cerrar'], settings:['Analysis settings','分析设置','Ajustes'],
    collapse:['Collapse panel','收起面板','Contraer panel'], expand:['Expand panel','展开面板','Expandir panel'],
    resize:['Resize panel','调整面板高度','Ajustar la altura del panel'],
    back:['Undo exploration step','撤销上一步探索','Deshacer el último paso'], forward:['Redo exploration step','重做探索操作','Rehacer el paso'],
    before:['Before (s)','事件前（秒）','Antes (s)'], after:['After (s)','事件后（秒）','Después (s)'],
    bin:['Bin (ms)','分箱（毫秒）','Bin (ms)'], gap:['Bout gap (s)','行为串间隔（秒）','Separación entre episodios (s)'],
    apply:['Apply','应用','Aplicar'], anchor:['Align to','零点对齐','Alinear a'],
    start:['Start','起点','Inicio'], end:['End','终点','Fin'],
    group:['Occurrences','取样','Repeticiones'], all:['Every occurrence','全部事件','Cada evento'],
    bouts:['First occurrence per bout','每串的首次事件','Primer evento de cada episodio'],
    comparator:['Comparison label','对照标签','Etiqueta de comparación'], none:['None','不选','Ninguna'],
    loading:['Reading spike trains','正在读取 spike','Leyendo spikes'], failed:['Unable to calculate','计算未完成','Error al calcular'],
    largeIndex:['Highlight fewer Unit rows in Signals and reopen this analysis.','请在信号页高亮较少的 Unit 行，再打开这项分析。','Selecciona menos filas de unidades en Señales y vuelve a abrir el análisis.'],
    local:['This recording has no local spike files.','此记录缺少可读的本地 spike 文件。','Este registro carece de archivos de spikes locales.'],
    empty:['No events for this label.','当前标签没有可对齐事件。','No hay eventos para esta etiqueta.'],
    noun:['events','个事件','eventos'], gn:['bouts','串','episodios'], kept:['eligible','纳入','incluidos'],
    exclusions:['Excluded windows','排除的窗口','Ventanas excluidas'], cov:['Observation coverage','神经观测覆盖','Cobertura'],
    unknown:['Unknown; rates assume continuous observation','未知；发放率按连续观测估算','Desconocida; las tasas suponen observación continua'],
    partial:['Partial unit coverage','部分 Unit 缺少观测区间','Cobertura parcial de unidades'],
    known:['Source intervals applied','已采用来源观测区间','Intervalos de origen aplicados'],
    population:['All Units · mean rate around the event','所有 Unit 的事件前后平均放电率','Todas las unidades · tasa media alrededor del evento'],
    full:['All events','全部事件','Todos'], early:['Earlier bouts','前段行为串','Episodios anteriores'], late:['Later bouts','后段行为串','Episodios posteriores'],
    heatHint:['Rows are Units. Click to inspect; Ctrl/Cmd-click adds or removes a Unit.','每行一个 Unit。点选查看，Ctrl/Cmd 点选可追加或移除。','Una fila por unidad. Clic para ver; Ctrl/Cmd-clic para añadir o quitar.'],
    heatScale:['Change from pre-event baseline (Hz)','相对事件前基线的发放率变化（Hz）','Cambio respecto a la línea base previa (Hz)'],
    raster:['Single-event spikes','逐事件 spike','Spikes por evento'], add:['Add Unit','添加 Unit','Añadir unidad'],
    order:['Row order','行排序','Orden'], chronological:['Recording time','原始时间顺序','Tiempo del registro'],
    tracking:['Each row is one event. Click its time to open the recording. Drag over spikes in one row to search for a pattern.','每行是同一标签的一次事件。点时间回看原记录，横拖某行的 spike 可搜索相似片段。','Cada fila es un evento de la misma etiqueta. Pulsa su tiempo para abrir el registro o arrastra sobre los spikes de una fila para buscar un patrón.'],
    event:['Event','事件','Evento'], reference:['Reference','参考','Referencia'], view:['Show in recording','返回原始记录','Ver en el registro'],
    unavailableVideo:['Outside mapped video','无对应视频','Sin vídeo alineado'], video:['Video','视频','Vídeo'],
    previous:['Previous page','上一页','Página anterior'], next:['Next page','下一页','Página siguiente'],
    match:['Find similar windows','查找相似片段','Buscar ventanas similares'],
    scope:['Search in','搜索范围','Buscar en'], aligned:['Other labeled events','其他同类事件','Otros eventos de la etiqueta'],
    recording:['Full recording','整段记录','Registro completo'],
    relStart:['From zero (s)','相对起点（秒）','Desde cero (s)'], relEnd:['To (s)','相对终点（秒）','Hasta (s)'],
    absoluteStart:['Start in recording (s)','神经起点（秒）','Inicio en registro (s)'], absoluteEnd:['End in recording (s)','神经终点（秒）','Fin en registro (s)'],
    similar:['Closest','最相似','Más parecidos'], different:['Least similar','差异最大','Menos parecidos'],
    neutral:['Background windows','背景时段','Ventanas de fondo'], other:['Comparison label','对照标签','Etiqueta de comparación'],
    score:['Similarity','相似度','Similitud'], support:['Scorable / considered','可评分 / 已考察','Puntuables / considerados'],
    noMatches:['No scorable windows','无可评分窗口','Sin ventanas puntuables'],
    allCandidates:['All candidates','全部候选','Todos los candidatos'],
    videoCandidates:['Only candidates on video','只看有视频的候选','Solo candidatos con vídeo'],
    exampleFilter:['Filter examples','筛选示例','Filtrar ejemplos'],
    videoSupport:['On video / scorable','可回看 / 可评分','Con vídeo / puntuables'],
    noVideoCandidates:['No candidate window falls entirely within the mapped video.','没有完整落在视频内的候选片段。','Ninguna ventana candidata cae por completo dentro del vídeo alineado.'],
    missingSplit:['Too few distinct bouts for both halves','行为串不足，无法比较前后两段','No hay episodios suficientes para ambas mitades'],
    progress:['Scoring candidate windows','正在评分候选窗口','Evaluando ventanas candidatas'],
    source:['Source','来源','Fuente'], annotation:['Video annotation','视频标注','Anotación de vídeo'], experiment:['Recording label','录制自带标签','Etiqueta del registro'],
    stale:['Recording changed','当前记录已切换','El registro ha cambiado'],
    pick:['Choose a Unit to align its spikes across occurrences of this label.','选一个 Unit，把它在同一标签各次出现时的放电对齐到 0 秒。','Elige una unidad para alinear sus spikes a cada aparición de la etiqueta.'],
    exampleMethod:['Real window whose active bins best match the other windows combined.','取一次真实事件，其放电时间格最接近其余窗口的出现频率。','Ventana real cuyos intervalos activos más se parecen a la frecuencia de las otras ventanas.'],
    missingCoverage:['Recording coverage unknown.','记录的有效观测区间未知。','Se desconoce la cobertura de observación.'],
    limits:['Use a finite time window with start before end.','请输入有限时间，且起点须早于终点。','Introduce tiempos finitos con inicio anterior al fin.'],
    mean:['Mean across events (Hz)','平均发放率（Hz）','Media sobre eventos (Hz)'],
    ongoing:['Loading visible events…','正在读取当前页事件…','Cargando eventos visibles…'],
    missing:['Missing','缺失','Faltante'], sourceWindow:['Selected recording window','已选原始时间窗','Ventana de registro seleccionada'],
    within:['Within-bout events can share spikes.','同串事件可能共享同一批 spike。','Los eventos de un episodio pueden compartir spikes.'],
    nearby:['Labels overlapping the matched segment','与匹配片段重叠的标签','Etiquetas en la ventana encontrada'],
    unlabelled:['No overlapping label','片段内无标签','Sin etiqueta superpuesta'],
    similarMetric:['1 means identical spike counts in every time bin for each Unit.','越接近 1，同一 Unit 在相同时间格里的 spike 数越接近。','Un 1 significa el mismo número de spikes de cada unidad en cada intervalo.'],
    choose:['Choose a Unit…','选择 Unit…','Elegir una unidad…'],
    using:['Compare Units','参与比较','Unidades para comparar'], referenceWindow:['Reference in recording','参考片段 · 神经时间','Referencia en el registro'],
    statistics:['Coverage and excluded events','观测覆盖与排除原因','Cobertura y eventos excluidos'],
    moreMatches:['More matching windows','更多相近片段','Más segmentos similares'],
    extraResults:['Differences and background','差异与背景对照','Diferencias y comparaciones de fondo'],
    inspect:['View candidate in recording','在原始记录查看候选','Ver candidato en el registro'],
    candidate:['Candidate','候选','Candidato'], elapsed:['Time from window start','距片段起点','Tiempo desde el inicio del segmento'],
    window:['Window','片段','Ventana'], refStart:['Reference starts','参考起点','Inicio de referencia'],
    matchStart:['Candidate starts','候选起点','Inicio del candidato'], zeroMark:['Dashed line: aligned event','虚线为事件零点','Línea discontinua: evento alineado'],
    repeat:['Where do spikes recur?','同类事件里，哪些时刻反复放电？','¿Cuándo se repiten los spikes?'],
    once:['At most one non-overlapping window per bout.','每串行为最多取一次，时间窗互不重叠。','Como máximo una ventana por episodio, sin solapamiento.'],
    repeats:['windows','个窗口','ventanas'], peaks:['Peak','最高','Máximo'], tied:['tied','并列','empate'],
    useTypical:['Compare using this occurrence','用这次典型放电查找相似片段','Buscar con este ejemplo real'],
    repeatFew:['Fewer than 3 windows with enough spikes.','有足够 spike 的窗口少于 3 个。','Menos de 3 ventanas con suficientes spikes.'],
    noRepeat:['No occupied bins repeat across windows.','没有找到可作参考的重复放电。','No hay disparos repetidos para una referencia.'],
    countHint:['Each bar shows how many windows had a spike in that bin.','柱高表示有多少个窗口在该时间格里出现过 spike。','Cada barra cuenta las ventanas con algún spike en ese intervalo.'],
    sparse:['This reference has too few spikes to compare. Widen the window or choose another row.','这段放电太少，无法比较。请拉宽参考片段或换一行。','Hay pocos spikes para comparar. Amplía la referencia o elige otra fila.'],
    median:['Median','中位数','Mediana'],stride:['Scan spacing','扫描步长','Paso del barrido'],
    neighbours:['Top ticks: nearby events of the same label; orange: alignment zero','行顶短线为邻近同类事件；橙线为对齐零点','Marcas superiores: otros eventos de la etiqueta; naranja: cero'],
    latency:['Offset','相对时间','Desfase'], baseline:['Pre-event baseline','事件前基线','Línea base previa'],
    tooFew:['No eligible analysis windows after coverage and boundary checks.','覆盖及时间边界筛选后无可用事件窗口。','No quedan ventanas tras comprobar cobertura y límites.']
  };
  const tips = {
    close:['Close this comparison and keep its settings for this recording.','收起比较，并保留这份记录的选择。','Cierra la comparación y conserva las selecciones de este registro.'],
    settings:['Change alignment, window size, bin size or comparison label.','调整事件零点、查看时长、分箱或对照标签。','Ajusta la alineación, la ventana, los intervalos o la etiqueta de comparación.'],
    before:['Seconds to show before the event zero.','每次事件零点之前显示的秒数。','Segundos antes del cero de cada evento.'],
    after:['Seconds to show after the event zero.','每次事件零点之后显示的秒数。','Segundos después del cero de cada evento.'],
    bin:['Count spikes in intervals of this many milliseconds.','按这个毫秒数划分时间格，统计每格的 spike。','Cuenta los spikes en intervalos de esta duración en milisegundos.'],
    gap:['Adjacent events separated by at most this many seconds belong to one bout.','相邻事件间隔在这个秒数内时，归到同一行为串。','Los eventos separados por esta distancia máxima en segundos forman un episodio.'],
    group:['Use every occurrence or only the first one in each bout for the raster.','逐次放电图可以显示全部事件，或每个行为串的第一次。','Muestra todos los eventos o solo el primero de cada episodio en el gráfico.'],
    anchor:['Choose which edge of an event sets time zero.','以事件的起点或终点为 0 秒。','Usa el inicio o el final del evento como tiempo cero.'],
    comparison:['Include events from a second label when searching for similar windows.','在查找相似片段时，加入另一种标签的事件作对照。','Incluye eventos de una segunda etiqueta al comparar ventanas.'],
    apply:['Recalculate using these settings.','按这些设置重新计算本页。','Recalcula esta vista con estos ajustes.'],
    addUnit:['Add a recorded Unit to the event-aligned raster.','把一个 Unit 加入逐次放电图。','Añade una unidad al gráfico de spikes por evento.'],
    removeUnit:['Remove this Unit from the comparison.','将这个 Unit 移出比较。','Quita esta unidad de la comparación.'],
    sourceTime:['Open this time in the original signals and aligned video. Press Space here to use this event as the search reference.','点击或按 Enter 回看这一刻的信号和对应视频。按空格可用这次事件作搜索参考。','Pulsa o usa Intro para abrir esta hora en las señales y el vídeo. Usa Espacio para tomar el evento como referencia.'],
    raster:['Click a row to use this Unit and event as the reference, or drag to select an exact interval.','点一行可用该 Unit 的这次事件作参考，横拖可指定更精确的时间段。','Pulsa una fila para usar su unidad y evento como referencia o arrastra para seleccionar un intervalo.'],
    prev:['Show the previous page of events for these Units.','显示这些 Unit 的上一页事件。','Muestra la página anterior de eventos para estas unidades.'],
    next:['Show the next page of events for these Units.','显示这些 Unit 的下一页事件。','Muestra la siguiente página de eventos para estas unidades.'],
    page:['Enter a page number to jump to those events.','输入页码可跳到那一页的事件。','Introduce una página para ir a esos eventos.'],
    order:['Sort trial rows by recording time or by their similarity to the reference.','按记录时间或与参考片段的相似度排列事件。','Ordena los eventos por hora o por similitud con la referencia.'],
    search:['Compare one reference interval against other windows using spike counts from the same Units.','将同一批 Unit 在参考片段和其他时间窗中的分箱 spike 数逐格比较。','Compara los recuentos por intervalo de las mismas unidades en la referencia y en otras ventanas.'],
    scope:['Search at matching event times or scan windows across the recording.','可比较同类事件的相同相对时间，也可扫描整段记录。','Compara el mismo intervalo relativo de otros eventos o busca a lo largo del registro.'],
    inspect:['Open the candidate in the original signals and its video when covered.','回到候选片段的原始信号和对应视频。','Abre el candidato en las señales originales y en el vídeo cuando esté disponible.'],
    candidate:['Preview this candidate beside the reference using the same time scale.','在相同的时间尺度上对照这段和参考片段的原始 spike。','Compara este candidato con la referencia en la misma escala temporal.'],
    filterVideo:['Toggle between all candidates and those fully covered by the video.','在全部候选与被视频完整覆盖的候选之间切换。','Alterna entre todos los candidatos y los cubiertos por completo por el vídeo.'],
    population:['See the mean response for each Unit, across all events and across early and late bouts.','查看各 Unit 的平均响应，并比较较早和较晚的行为串。','Consulta la respuesta media de las unidades y compara episodios tempranos y tardíos.'],
    statistics:['See how many events were retained and which recording intervals were observed.','查看纳入了几次事件，以及哪些记录区间有观测信息。','Consulta cuántos eventos se incluyeron y qué intervalos se observaron.'],
    exclusions:['Show how many windows were excluded for each reason.','查看不同原因分别排除了多少个窗口。','Consulta el número de ventanas excluidas por cada motivo.'],
    extraResults:['Inspect the least similar examples, background windows and optional comparison label.','查看差异较大的片段、背景时段和选定的对照标签。','Examina ejemplos distintos, ventanas de fondo y la etiqueta de comparación elegida.']
  };
  const getLabel = row => String(row.label ?? row.type ?? '');
  const canonical = row => ({id:String(row.id),start:Number(row.start),end:row.end == null ? null : Number(row.end),type:getLabel(row),
    subject:row.subject,track:row.track,schemeId:row.schemeId});
  const sourceOf = row => row.sourceKind || (row.sourceTable ? 'experiment':'annotation');

  class BehaviorPatternsUI {
    constructor(root, callbacks={}) {
      this.root=root; Object.assign(this,callbacks);
      this.root.classList.add('behavior-patterns');
      this.root.hidden=true;
      this.runId=0; this.serial=0; this.sessions=new WeakMap();
      this.root.tabIndex=-1;
      for(const type of ['click','change','submit','keydown']){
        this.root.addEventListener(type,e=>this.keepPanelFocus(()=>this[type](e)));
      }
      this.root.addEventListener('contextmenu',e=>{
        if(!this.result || !e.target.matches('[data-bp-map]'))return;
        const cell=this.mapLocation(e),marks=window.NeuropixelsUnitMarks;
        if(cell && marks?.popup(e,marks.ref(this.recordingObject,cell.id)))e.stopPropagation();
      });
      document.addEventListener('unitmarkschanged',()=>{if(this.result && this.el('map'))this.drawMap();});
      this.root.addEventListener('pointerdown',e=>this.pointerDown(e));
      this.root.addEventListener('pointermove',e=>this.pointerMove(e));
      this.root.addEventListener('pointerout',e=>{if(!this.drag && e.target.matches?.('[data-bp-raster]'))this.hover(null);});
      this.root.addEventListener('pointerup',e=>this.pointerUp(e));
      this.root.addEventListener('pointercancel',()=>this.cancelDrag());
    }
    t(key,source=strings){const lang=document.documentElement.lang;return source[key][lang.startsWith('zh')?1:lang.startsWith('es')?2:0];}
    tip(key){return esc(this.t(key,tips));}
    el(key){return this.root.querySelector('[data-bp-'+key+']');}
    ui(key,type,text){return `<button type="button" data-bp-action="${key}" ${tips[key]?'title="'+this.tip(key)+'"':''} ${type||''}>${esc(text)}</button>`;}
    keepPanelFocus(update){
      const previous=document.activeElement,inside=this.root.contains(previous);
      update();
      if(inside && !this.root.hidden && !previous.isConnected && document.activeElement===document.body)this.root.focus({preventScroll:true});
    }
    stopWorker(){if(this.worker)this.worker.terminate();this.worker=null;if(this.url)URL.revokeObjectURL(this.url);this.url=null;}
    view(){
      if(this.restoreAfterLoad)return this.restoreAfterLoad;
      return {options:{...this.options},comparison:this.comparison,units:[...this.selected],activeId:this.activeId,
        range:this.searchRange?{...this.searchRange}:null,page:this.afterQuery?.page??this.page,order:this.afterQuery?.order??this.order,
        scope:this.scope,videoOnly:this.videoOnly,candidate:this.previewIndex,searched:Boolean(this.query||this.queryBusy)};
    }
    historyButtons(){
      for(const [action,stack] of [['back',this.trail?.past],['forward',this.trail?.future]]){
        const b=this.root.querySelector(`[data-bp-action="${action}"]`);if(b){b.hidden=!stack?.length;b.disabled=b.hidden;}
      }
    }
    remember(){
      if(!this.input||!this.trail)return;
      const state=this.view(),past=this.trail.past;
      if(JSON.stringify(past.at(-1))!==JSON.stringify(state)){
        past.push(state);if(past.length>32)past.shift();
      }
      this.trail.future.length=0;this.historyButtons();
    }
    navigate(redo=false){
      const from=redo?this.trail.future:this.trail.past,to=redo?this.trail.past:this.trail.future;
      if(!from.length)return false;
      const target=from.pop();to.push(this.view());this.reviewTarget=null;
      const reload=!this.result||this.queryBusy||this.comparison!==target.comparison||JSON.stringify(this.options)!==JSON.stringify(target.options);
      if(reload){
        this.restoreAfterLoad=target;this.options={...target.options};this.comparison=target.comparison;this.syncSettings();this.compute();
      }else this.restoreView(target);
      this.historyButtons();return true;
    }
    syncSettings(){
      const f=this.el('config');if(!f)return;
      const o=this.options,values={before:o.before,after:o.after,bin:o.bin*1000,gap:o.boutGap,group:o.boutsOnly?'bouts':'all',anchor:o.anchor,comparison:this.comparison};
      for(const [k,v] of Object.entries(values))f.elements[k].value=v;
    }
    cancelDrag(){
      const d=this.drag;if(!d)return false;
      this.drag=null;if(d.c.hasPointerCapture(d.id))d.c.releasePointerCapture(d.id);
      this.hover(null);this.drawRaster();return true;
    }
    keydown(e){
      if(e.isComposing || e.defaultPrevented)return;
      const eventRow=e.target.closest('[data-bp-event]');
      if(e.key===' '&&eventRow&&!e.altKey&&!e.ctrlKey&&!e.metaKey){
        e.preventDefault();e.stopPropagation();
        this.setReference(eventRow.dataset.bpEvent);return;
      }
      const ctrl=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
      const undo=ctrl&&!e.altKey&&(key==='z'||key==='y');
      if(!undo && e.key!=='Escape')return;
      e.stopPropagation();
      if(e.key==='Escape' && this.cancelResize){e.preventDefault();this.cancelResize();return;}
      if(e.key==='Escape' && this.cancelDrag()){e.preventDefault();return;}
      if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
      e.preventDefault();
      if(undo){this.navigate(key==='y'||e.shiftKey);return;}
      const expanded=this.root.querySelector('details[open]:focus-within')||this.root.querySelector('.bp-config[open]');
      if(expanded){expanded.open=false;this.syncSettings();expanded.querySelector('summary')?.focus();return;}
      this.dismiss();
    }
    dismiss(){const button=this.launcher;this.close();button?.focus?.({preventScroll:true});}
    setCollapsed(collapsed){
      this.el('content').hidden=collapsed;
      this.root.classList.toggle('bp-collapsed',collapsed);
      const button=this.root.querySelector('[data-bp-action="collapse"]');
      button.setAttribute('aria-expanded',String(!collapsed));
      button.textContent=collapsed?'▴':'▾';
      button.title=button.ariaLabel=this.t(collapsed?'expand':'collapse');
      if(!collapsed)this.drawRaster();
    }
    bindSplitter(){
      const handle=this.el('splitter');
      const setHeight=value=>{
        const height=Math.round(Math.max(110,Math.min(innerHeight*.62,value)));
        this.root.style.setProperty('--bp-height',height+'px');
        handle.setAttribute('aria-valuenow',String(height));
      };
      handle.onpointerdown=e=>{
        if(e.button!==0)return;
        e.preventDefault();handle.focus({preventScroll:true});handle.setPointerCapture(e.pointerId);
        const startY=e.clientY,height=this.root.offsetHeight,previous=this.root.style.getPropertyValue('--bp-height');
        handle.onpointermove=event=>setHeight(height+startY-event.clientY);
        const finish=cancel=>{
          handle.onpointermove=handle.onpointerup=handle.onpointercancel=handle.onlostpointercapture=null;
          if(cancel)this.root.style.setProperty('--bp-height',previous);
          if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);
          this.cancelResize=null;
        };
        this.cancelResize=()=>finish(true);
        handle.onpointerup=()=>finish(false);handle.onpointercancel=handle.onlostpointercapture=this.cancelResize;
      };
      handle.onkeydown=e=>{
        if(!['ArrowUp','ArrowDown'].includes(e.key))return;
        e.preventDefault();e.stopPropagation();setHeight(this.root.offsetHeight+(e.key==='ArrowUp'?24:-24));
      };
    }
    returnFromReview(){
      if(!this.reviewTarget||this.root.hidden)return false;
      const target=this.root.querySelector(this.reviewTarget)||this.el('search')||this.root;
      for(let d=target.closest('details');d;d=d.parentElement.closest('details'))d.open=true;
      this.reviewTarget=null;target.scrollIntoView({block:'center'});target.focus?.({preventScroll:true});return true;
    }
    invalidate(recording=this.getRecording?.()){
      if(!recording || this.recordingObject===recording)this.close(false);
      if(recording)this.sessions.delete(recording);
      else this.sessions=new WeakMap();
    }
    close(save=true){
      this.cancelResize?.();
      if(save && this.input && this.sessionMap && (this.result || this.restoreAfterLoad || this.trail.past.length)){
        this.sessionMap.delete(this.sessionKey);
        this.sessionMap.set(this.sessionKey,{view:this.view(),trail:this.trail});
        if(this.sessionMap.size>16)this.sessionMap.delete(this.sessionMap.keys().next().value);
      }
      this.runId++;this.stopWorker();this.root.hidden=true;this.root.replaceChildren();
      this.result=null;this.detail=null;this.query=null;this.input=null;this.drag=null;this.activeEvents=null;
      this.restoreAfterLoad=null;this.afterQuery=null;this.queryBusy=false;this.reviewTarget=null;
      this.repeatData=null;this.repeatKey=null;this.repeatRequest=null;this.previewRequest=null;this.previewIndex=0;
      this.recordingObject=null;this.sessionMap=null;this.trail=null;this.events=[];this.pageEvents=[];this.rowById=null;this.candidates=[];
      this.launcher?.setAttribute('aria-expanded','false');
    }
    open(input){
      this.close();
      this.recordingObject=this.getRecording?.()||this;
      if(!this.sessions.has(this.recordingObject))this.sessions.set(this.recordingObject,new Map());
      this.sessionMap=this.sessions.get(this.recordingObject);
      this.sessionKey=JSON.stringify([input.recordingKey,input.cameraId,input.source,input.label]);
      let saved=this.sessionMap.get(this.sessionKey);
      const ids=input.unitIds||[];
      if(saved && (input.anchorId!=null && String(input.anchorId)!==String(saved.view.activeId) ||
        Array.isArray(input.unitIds) && JSON.stringify(ids.map(Number))!==JSON.stringify(saved.view.units)))saved=null;
      this.trail=saved?.trail||{past:[],future:[]};
      this.restoreAfterLoad=input.queryRange?null:saved?.view;
      if(input.queryRange && saved){
        this.trail.past.push(saved.view);if(this.trail.past.length>32)this.trail.past.shift();this.trail.future.length=0;
      }
      this.revealQuery=Boolean(input.queryRange);
      this.input=input;this.launcher=input.launcher||document.activeElement;
      this.options={before:1,after:1,bin:.05,boutGap:1,anchor:'start',boutsOnly:false,...input.options,...this.restoreAfterLoad?.options};
      this.selected=[...new Set(ids.map(Number).filter(Number.isSafeInteger))];
      this.unitInfo=new Map((this.getUnits?.()||[]).map(u=>[Number(u.id??u.unitId??u),u]));
      this.events=(input.events||[]).filter(e=>!input.label || !getLabel(e) || getLabel(e)===input.label).map(canonical).sort((a,b)=>a.start-b.start);
      this.rowById=new Map((input.events||[]).map(e=>[String(e.id),e]));
      this.comparators=new Map();
      for(const e of input.contextEvents||[]){
        const type=getLabel(e),source=sourceOf(e);
        if(!type || (type===input.label && source===input.source))continue;
        const key=this.t(source==='annotation'?'annotation':'experiment')+' · '+type;
        if(!this.comparators.has(key))this.comparators.set(key,[]);
        this.comparators.get(key).push(canonical(e));
      }
      this.comparison='';this.activeId=input.anchorId==null?null:String(input.anchorId);this.page=0;
      if(this.comparators.has(this.restoreAfterLoad?.comparison))this.comparison=this.restoreAfterLoad.comparison;
      this.order='time';this.scope=input.queryRange?'recording':'events';this.searchRange=null;this.query=null;this.videoOnly=false;this.root.hidden=false;
      this.launcher?.setAttribute('aria-expanded','true');
      const option=(value,k,selected)=>opt(value,this.t(k),selected);
      const num=(field,k,value,step,min)=>`<label>${this.t(k)}<input name="${field}" type="number" title="${this.tip(k)}" min="${min}" step="${step}" value="${value}" required></label>`;
      this.root.classList.remove('bp-collapsed');
      this.root.innerHTML=`<div class="bp-splitter" data-bp-splitter tabindex="0" role="separator" aria-orientation="horizontal" aria-label="${this.t('resize')}" title="${this.t('resize')}"></div><header class="bp-heading"><div><h3>${this.t('match')} <span>${esc(input.label)}</span></h3>
        <small>${this.t(input.source==='annotation'?'annotation':'experiment')} · ${esc(input.recordingKey??this.getRecording?.()?.key??'')}</small></div>
        <div class="bp-navigation">${this.ui('back',`title="${this.t('back')} (Ctrl/⌘+Z)" aria-label="${this.t('back')}" aria-keyshortcuts="Control+Z Meta+Z"`,'↶')}
        ${this.ui('forward',`title="${this.t('forward')} (Ctrl/⌘+Shift+Z)" aria-label="${this.t('forward')}" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"`,'↷')}
        ${this.ui('collapse',`title="${this.t('collapse')}" aria-label="${this.t('collapse')}" aria-expanded="true"`,'▾')}
        ${this.ui('close',`title="${this.t('close')}" aria-label="${this.t('close')}"`,'×')}</div></header>
        <div data-bp-content><details class="bp-config"><summary title="${this.tip('settings')}">${this.t('settings')}</summary><form data-bp-config>
        ${num('before','before',this.options.before,'any',.001)}${num('after','after',this.options.after,'any',.001)}
        ${num('bin','bin',this.options.bin*1000,'any',.1)}${num('gap','gap',this.options.boutGap,'any',0)}
        <label>${this.t('group')}<select name="group" title="${this.tip('group')}">${option('all','all',!this.options.boutsOnly)}${option('bouts','bouts',this.options.boutsOnly)}</select></label>
        <label>${this.t('anchor')}<select name="anchor" title="${this.tip('anchor')}">${option('start','start',this.options.anchor==='start')}${option('end','end',this.options.anchor==='end')}</select></label>
        <label ${this.comparators.size?'':'hidden'}>${this.t('comparator')}<select name="comparison" title="${this.tip('comparison')}">${option('','none',true)}${[...this.comparators].map(([label,list])=>opt(label,`${label} (${list.length})`)).join('')}</select></label>
        <button type="submit" title="${this.tip('apply')}">${this.t('apply')}</button></form></details>
        <div data-bp-status role="status" aria-live="polite"></div><section data-bp-body></section></div>`;
      this.bindSplitter();
      this.historyButtons();this.syncSettings();this.root.scrollIntoView({block:'nearest'});this.root.focus({preventScroll:true});
      this.compute();
    }
    status(message,error=false){const el=this.el('status');if(el){el.textContent=message;el.classList.toggle('bp-error',error);}}
    async compute(){
      this.stopWorker();const run=++this.runId, recording=this.getRecording?.();
      this.repeatData=null;this.repeatKey=null;this.repeatRequest=null;this.previewRequest=null;
      this.result=null;this.detail=null;this.query=null;this.drag=null;this.queryBusy=false;this.afterQuery=null;this.el('body').replaceChildren();this.status(this.t('loading'));
      try{
        const times=this.input.times??recording?.spikeTimesFile,clusters=this.input.clusters??recording?.spikeClustersFile;
        if(!times||!clusters)throw Error(this.t('local'));
        if(!this.events.length&&!this.input.queryRange&&!Number.isFinite(this.restoreAfterLoad?.range?.absoluteStart))throw Error(this.t('empty'));
        if(this.input.recordingKey && recording && this.input.recordingKey!==recording.key)throw Error(this.t('stale'));
        let coverage=this.input.coverage??null;
        if(recording?.coverageFile){
          if(recording.coverageFile.size>16*1024*1024)throw Error('Coverage file exceeds 16 MiB');
          coverage=JSON.parse(await recording.coverageFile.text());
        }
        if(run!==this.runId)return;
        const unitIds=window.NeuropixelsBehaviorPatterns.indexUnitIds([...this.unitInfo.keys()],this.input.unitIds||[],recording?.spikeCount,!!recording?.jointSources);
        if(!unitIds.length || unitIds.length>2048)throw Error(this.t('largeIndex'));
        this.url=URL.createObjectURL(new Blob([window.NeuropixelsBehaviorPatterns.workerSource()],{type:'text/javascript'}));
        this.worker=new Worker(this.url);
        this.worker.onerror=e=>{if(run===this.runId){this.stopWorker();this.status(this.t('failed')+' · '+e.message,true);}};
        this.worker.onmessage=({data})=>{if(run===this.runId)this.keepPanelFocus(()=>this.receive(data));};
        this.worker.postMessage({action:'compute',requestId:++this.serial,times,clusters,jointProbes:!!recording?.jointSources,recordingId:recording?.key??this.input.recordingKey,
          unitIds,sampleRate:this.input.sampleRate??recording?.sampleRate,duration:recording?.duration??this.input.duration,events:this.events,
          otherEvents:this.comparators.get(this.comparison)||[],options:this.options,coverage});
      }catch(error){if(run===this.runId)this.status(this.t('failed')+' · '+error.message,true);}
    }
    receive(data){
      if(data.error){
        if(data.requestId===this.repeatRequest){if(this.el('repeat'))this.el('repeat').textContent=data.error;return;}
        if(data.requestId===this.previewRequest){if(this.el('preview'))this.el('preview').textContent=data.error;return;}
        if(data.requestId===this.queryRequest){this.queryBusy=false;this.afterQuery=null;}
        else if(data.requestId===this.detailRequest)this.detail=null;
        else if(this.result)return;
        this.status(data.error.includes('too little temporal')?this.t('sparse'):this.t('failed')+' · '+data.error,true);return;
      }
      if(data.result){this.result=data.result;this.setupResult();return;}
      if(data.recurrence && data.requestId===this.repeatRequest){this.repeatData=data.recurrence;this.drawRepeat();return;}
      if(data.preview && data.requestId===this.previewRequest){this.drawPreview(data.preview);return;}
      if(data.detail && data.requestId===this.detailRequest){this.detail=data.detail;this.renderRaster();return;}
      if(data.query && data.requestId===this.queryRequest){
        this.el('trial-section').open=false;this.el('search-box').open=true;
        this.queryBusy=false;this.query=data.query;this.previewIndex=this.afterQuery?.candidate??0;this.status('');this.renderQuery();
        if(this.afterQuery){const {order,page}=this.afterQuery;this.afterQuery=null;this.order=order;this.page=page;this.requestPage();}
        if(this.revealQuery){this.revealQuery=false;this.el('search').scrollIntoView({block:'start'});}
        return;
      }
      if(data.progress!=null && (!this.result||data.requestId===this.queryRequest)){
        const p=typeof data.progress==='number'?data.progress:NaN;
        this.status(`${this.t(this.result?'progress':'loading')}${Number.isFinite(p)?' · '+Math.round(100*p)+'%':''}`);
      }
    }
    setupResult(){
      const r=this.result,g=r.groups;
      const saved=this.restoreAfterLoad;this.restoreAfterLoad=null;
      this.status('');
      this.selected=this.selected.filter(id=>r.unitIds.includes(id));
      this.activeEvents=new Map(r.events.map(e=>[String(e.id),e]));
      if(!this.activeEvents.has(this.activeId)){
        const time=this.rowById.get(this.activeId)?.start ?? this.getCursor?.() ?? 0;
        this.activeId=r.events.reduce((best,e)=>Math.abs(e.anchor-time)<Math.abs((best?.anchor??Infinity)-time)?e:best,null)?.id;
      }
      this.page=Math.floor(Math.max(0,r.events.findIndex(e=>e.id===this.activeId))/PAGE);
      const origin=r.coverage?.origin||'unknown';
      const cov=this.t(origin.includes('unknown')?'unknown':origin.includes('partial')?'partial':'known');
      const excluded=Array.isArray(g.excluded)?g.excluded:[];
      const counts=new Map();for(const e of excluded)counts.set(e.reason,(counts.get(e.reason)||0)+1);
      this.el('body').innerHTML=`<div data-bp-unit-picker class="bp-unit-bar"><label>${this.t('using')}<select data-bp-add-unit title="${this.tip('addUnit')}"><option value="">${this.t('choose')}</option>${r.unitIds.map(id=>opt(id,this.unitName(id))).join('')}</select></label><div data-bp-selected></div></div>
        <details data-bp-search-box class="bp-context" hidden ${this.revealQuery||saved?.searched?'open':''}><summary title="${this.tip('search')}">${this.t('match')}</summary><div data-bp-search></div></details>
        <details data-bp-trial-section class="bp-context" ${this.revealQuery||saved?.searched?'':'open'}><summary title="${this.tip('raster')}">${this.t('raster')}</summary><div data-bp-trials></div></details>
        <details data-bp-repeat-box class="bp-repeat" hidden><summary title="${esc(this.t('countHint'))}">${this.t('repeat')}</summary><div data-bp-repeat></div></details>
        <details class="bp-context"><summary title="${this.tip('population')}">${this.t('population')}</summary><div data-bp-pop></div></details>
        <details class="bp-exclusions"><summary title="${this.tip('statistics')}">${this.t('statistics')}</summary><div class="bp-facts"><strong>${g.raw} ${this.t('noun')} · ${g.bouts} ${this.t('gn')} · ${r.events.length} ${this.t('kept')}</strong>
        <small>${this.t('cov')} · ${esc(cov)}</small></div>
        ${excluded.length?`<details class="bp-exclusions"><summary title="${this.tip('exclusions')}">${this.t('exclusions')} (${excluded.length})</summary>${[...counts].map(([k,n])=>esc(k)+' × '+n).join(' · ')}</details>`:''}
        ${g.raw>g.bouts&&!this.options.boutsOnly?`<small>${this.t('within')}</small>`:''}
        </details>`;
      this.el('trial-section').ontoggle=()=>{if(this.el('trial-section')?.open&&this.el('raster'))this.drawRaster();};
      this.drawSelected();
      if(!r.events.length){
        this.el('trial-section').hidden=true;
        this.status(this.t('tooFew'));
        const span=Number.isFinite(saved?.range?.absoluteStart)?{start:saved.range.absoluteStart,end:saved.range.absoluteEnd}:this.input.queryRange;
        if(span && Number.isFinite(span.start)&&Number.isFinite(span.end)&&span.end>span.start){
          this.searchRange={absoluteStart:span.start,absoluteEnd:span.end};this.scope='recording';this.pageEvents=[];
          this.el('pop').parentElement.hidden=true;
          if(saved)this.restoreView(saved);
          else{this.drawSelected();this.renderSearch();if(this.selected.length)this.runQuery(this.el('query-form'),false);}
        }
        return;
      }
      this.renderPop();
      if(saved){this.restoreView(saved);return;}
      const base=this.activeEvents.get(this.activeId);
      this.searchRange={eventId:base.id,start:Math.max(-r.before,-.25),end:Math.min(r.after,.25)};
      const span=this.input.queryRange;
      if(span && Number.isFinite(span.start)&&Number.isFinite(span.end)&&span.end>span.start){
        const candidate=r.events.find(e=>e.id===base.id && span.start>=e.anchor-r.before && span.end<=e.anchor+r.after) ||
          r.events.find(e=>span.start>=e.anchor-r.before && span.end<=e.anchor+r.after);
        if(candidate){this.scope='events';this.activeId=candidate.id;this.page=Math.floor(r.events.indexOf(candidate)/PAGE);this.searchRange={eventId:candidate.id,start:span.start-candidate.anchor,end:span.end-candidate.anchor};}
        else this.searchRange={absoluteStart:span.start,absoluteEnd:span.end};
        this.input={...this.input,queryRange:null};
      }
      this.renderSearch();this.requestPage();
      if(span && this.selected.length)this.runQuery(this.el('query-form'),false);
    }
    restoreView(saved){
      const sameQuery=Boolean(this.query && saved.searched && JSON.stringify(this.selected)===JSON.stringify(saved.units)
        && this.scope===saved.scope && JSON.stringify(this.searchRange)===JSON.stringify(saved.range));
      if(!sameQuery)this.clearQuery();
      this.selected=saved.units.filter(id=>this.result.unitIds.includes(id));
      if(this.activeEvents.has(saved.activeId))this.activeId=saved.activeId;
      const range=saved.range,r=this.result;
      const valid=range && (Number.isFinite(range.absoluteStart) ?
        range.absoluteStart>=0 && range.absoluteEnd>range.absoluteStart :
        this.activeEvents.has(range.eventId) && range.start>=-r.before-1e-8 && range.end<=r.after+1e-8 && range.end>range.start);
      this.searchRange=valid?{...range}:this.activeEvents.has(this.activeId)?
        {eventId:this.activeId,start:Math.max(-r.before,-.25),end:Math.min(r.after,.25)}:null;
      this.scope=Number.isFinite(this.searchRange?.absoluteStart)?'recording':saved.scope;
      this.page=saved.page;this.order=sameQuery?saved.order:'time';this.videoOnly=saved.videoOnly;this.previewIndex=saved.candidate??0;
      this.status('');if(this.el('selected'))this.drawSelected();this.drawMap();this.renderSearch();this.requestPage();
      if(!sameQuery && valid && saved.searched && this.selected.length){
        this.runQuery(this.el('query-form'),false);this.afterQuery={page:saved.page,order:saved.order,candidate:saved.candidate};
      }
    }
    renderPop(){
      const r=this.result,groups=r.groups;
      this.el('pop').innerHTML=`<header class="bp-subhead">
        <span>${r.unitIds.length} Units · ${this.t('baseline')} [−${r.before}, 0) s · ${Math.round(r.binWidth*1000)} ms/bin</span></header>
        <div class="bp-map-head"><span>${this.t('full')}</span><span>${this.t('early')} (${groups.earlyBouts})</span><span>${this.t('late')} (${groups.lateBouts})</span></div>
        <div class="bp-map-scroll"><canvas data-bp-map role="img" aria-label="${this.t('heatScale')}"></canvas></div>
        <div class="bp-map-head">${this.timeAxis().repeat(3)}</div>
        <div class="bp-map-key"><span data-bp-color-scale></span><span data-bp-map-readout></span></div>
        <small>${this.t('heatHint')}</small>`;
      this.drawMap();
      this.drawSelected();
    }
    shortUnitName(id){const u=this.unitInfo.get(id);return u?.probeName?u.probeName+' · Unit '+u.sourceUnitId:'Unit '+id;}
    unitName(id){
      const u=this.unitInfo.get(id)||{}, depth=Number(u.depthUm??u.depth);
      return [this.shortUnitName(id),u.region||'',Number.isFinite(depth)?Math.round(depth)+' µm':''].filter(Boolean).join(' · ');
    }
    timeAxis(){
      const {before,after}=this.result;
      const zero=before/(before+after)*100;
      return `<div class="bp-times"><span>−${before} s</span><i style="left:${zero}%">0</i><span>+${after} s</span></div>`;
    }
    drawSelected(){
      this.el('selected').innerHTML=this.selected.map(id=>`<button ${window.NeuropixelsUnitMarks?.attrs(this.recordingObject,id)||''} type="button" data-bp-unit="${id}" title="${this.tip('removeUnit')} ${esc(this.unitName(id))}" aria-label="${esc(this.unitName(id))} · ${this.tip('removeUnit')}">${esc(this.shortUnitName(id))} <span aria-hidden="true">×</span></button>`).join('');
    }
    drawMap(){
      const r=this.result,c=this.el('map');if(!r||!c)return;
      const n=r.unitIds.length,bins=r.bins,cols=3;
      const h=Math.max(1,Math.min(7,Math.floor(4096/Math.max(1,n))));
      const w=Math.max(1,Math.min(3,Math.floor(2048/Math.max(1,bins))));
      this.mapCellWidth=w;
      const arrays=[r.deltaHz,r.earlyDeltaHz,r.lateDeltaHz];
      const marks=r.unitIds.map(id=>window.NeuropixelsUnitMarks?.colors(this.recordingObject,id)||[]);
      this.markMargin=marks.reduce((width,colors)=>Math.max(width,colors.length*w),0);
      c.width=this.markMargin+(w*bins+4)*cols-4;c.height=Math.max(1,n*h);c.style.height=Math.max(56,n*4)+'px';
      const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
      let scale=0;for(const arr of arrays)for(const x of arr||[])if(Number.isFinite(x))scale=Math.max(scale,Math.abs(x));
      const zero=Math.round(r.before/r.binWidth);
      for(let lane=0;lane<cols;lane++){
        const x0=this.markMargin+lane*(bins*w+4),vals=arrays[lane];
        for(let u=0;u<n;u++){
          for(let b=0;b<bins;b++){
            const v=vals?.[u*bins+b];
            if(!Number.isFinite(v)){ctx.fillStyle='#777e85';}
            else{
              const f=Math.min(1,Math.abs(v)/(scale||1)),dest=v<0?[34,97,157]:[179,76,40];
              ctx.fillStyle=`rgb(${dest.map(x=>Math.round(241+(x-241)*f)).join(',')})`;
            }
            ctx.fillRect(x0+b*w,u*h,w,h);
          }
          if(lane===0)marks[u].forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*w,u*h,w,h);});
          if(this.selected.includes(r.unitIds[u])){ctx.strokeStyle='#048586';ctx.lineWidth=1;ctx.strokeRect(x0+.5,u*h+.5,bins*w-1,h-1);}
        }
        ctx.fillStyle='rgba(40,44,50,.5)';ctx.fillRect(x0+zero*w,0,1,n*h);
      }
      this.el('color-scale').textContent=`${this.t('heatScale')}   −${scale.toFixed(1)}    0    +${scale.toFixed(1)}`;
      if(!r.groups.earlyBouts || !r.groups.lateBouts)this.el('map-readout').textContent=this.t('missingSplit');
    }
    mapLocation(event){
      const c=this.el('map'),r=this.result;
      const box=c.getBoundingClientRect(),x=(event.clientX-box.left)/box.width*c.width-this.markMargin;
      if(x<0)return null;
      const i=Math.floor((event.clientY-box.top)/box.height*r.unitIds.length);
      const w=this.mapCellWidth,lane=Math.floor(x/(r.bins*w+4)),bin=Math.floor((x-lane*(r.bins*w+4))/w);
      if(i<0||i>=r.unitIds.length||bin<0||bin>=r.bins||lane>2)return null;
      const arr=[r.deltaHz,r.earlyDeltaHz,r.lateDeltaHz][lane],v=arr?.[i*r.bins+bin];
      return {id:r.unitIds[i],bin,hz:v,time:-r.before+bin*r.binWidth};
    }
    setUnits(ids){
      const selected=Array.from(new Set(ids.map(Number))).filter(id=>this.result.unitIds.includes(id));
      if(JSON.stringify(selected)===JSON.stringify(this.selected))return;
      this.remember();this.selected=selected;if(this.searchRange)delete this.searchRange.unitIds;
      this.clearQuery();this.drawSelected();this.drawMap();this.renderSearch();this.requestPage();
    }
    clearQuery(){
      this.afterQuery=null;this.reviewTarget=null;this.previewRequest=null;this.previewIndex=0;
      if(this.order==='match' && this.result){
        const i=this.result.events.findIndex(e=>e.id===this.activeId);
        if(i>=0)this.page=Math.floor(i/PAGE);
      }
      this.queryRequest=++this.serial;this.queryBusy=false;this.query=null;this.order='time';
      const el=this.el('search-result');if(el)el.replaceChildren();
    }
    ordered(){
      if(this.order==='match' && this.query?.ranked?.length){
        const ids=new Set(this.query.ranked.map(row=>row.eventId));
        return [...this.query.ranked.map(row=>this.activeEvents.get(row.eventId)).filter(Boolean),
          ...this.result.events.filter(e=>!ids.has(e.id))];
      }
      return this.result.events;
    }
    requestPage(){
      const all=this.ordered();
      this.page=Math.max(0,Math.min(this.page,Math.ceil(all.length/PAGE)-1));
      this.pageEvents=all.slice(this.page*PAGE,(this.page+1)*PAGE);
      this.detail=null;this.renderRaster();
      this.detailRequest=++this.serial;
      if(!this.selected.length||!this.pageEvents.length)return;
      this.worker?.postMessage({action:'detail',requestId:this.detailRequest,unitIds:this.selected.slice(),eventIds:this.pageEvents.map(e=>e.id)});
    }
    mapped(time){
      if(!this.getVideoTime)return null;
      const v=this.getVideoTime(time);
      return Number.isFinite(v)&&v>=0?v:null;
    }
    renderRaster(){
      const el=this.el('trials');if(!el||!this.result?.events.length)return;
      const r=this.result,all=this.ordered(),rows=this.pageEvents||[],selected=this.selected,start=this.page*PAGE+1;
      const pages=Math.max(1,Math.ceil(all.length/PAGE));
      const canRank=this.query?.ranked?.some(e=>this.activeEvents.has(e.eventId));
      el.innerHTML=`<header class="bp-subhead"><h4>${this.t('raster')} · ${all.length} ${this.t('noun')}</h4><div class="bp-page" ${selected.length?'':'hidden'}>
        ${canRank?`<select data-bp-order aria-label="${this.t('order')}" title="${this.tip('order')}">${opt('time',this.t('chronological'),this.order==='time')}${opt('match',this.t('score'),this.order==='match')}</select>`:''}
        ${pages>1?this.ui('prev',`aria-label="${this.t('previous')}" ${this.page===0?'disabled':''}`,'‹')+
        `<label><input data-bp-page aria-label="${this.tip('page')}" title="${this.tip('page')}" type="number" min="1" max="${pages}" value="${this.page+1}"> / ${pages}</label>`+
        this.ui('next',`aria-label="${this.t('next')}" ${this.page+1===pages?'disabled':''}`,'›'):''}</div></header>
        ${!selected.length?`<p>${this.t('pick')}</p>`:`
        <p class="bp-hint">${this.t('tracking')}</p>
        <div class="bp-trial-scroll"><div class="bp-table" style="--bp-units:${selected.length};--bp-min:${116+selected.length*190}px">
          <div class="bp-row-labels"><strong>${this.t('event')} (s)</strong>
            ${rows.map((e,i)=>{const video=this.mapped(e.anchor);return `<button type="button" data-bp-event="${esc(e.id)}" ${e.id===this.activeId?'aria-current="true"':''} title="${this.tip('sourceTime')} ${video==null?this.t('unavailableVideo'):this.t('video')+' '+seconds(video)+' s'}">${start+i} · ${seconds(e.anchor)}</button>`;}).join('')}
          </div>${selected.map(id=>`<div class="bp-lane"><strong ${window.NeuropixelsUnitMarks?.attrs(this.recordingObject,id)||''}>${esc(this.unitName(id))}</strong>
            <div class="bp-raster-frame" style="height:${rows.length*18}px"><canvas data-bp-raster="${id}" role="img" aria-label="Unit ${id} ${this.t('raster')}" title="${this.tip('raster')}"></canvas><i data-bp-hover hidden></i></div>
            ${this.timeAxis()}
            <small class="bp-mean-label" data-bp-mean-label="${id}"></small>
            <canvas data-bp-mean="${id}" role="img" aria-label="Unit ${id} ${this.t('mean')}"></canvas></div>`).join('')}
        </div></div>`}
        <div class="bp-raster-foot"><span data-bp-readout>${this.detail?'':selected.length?this.t('ongoing'):''}</span></div>`;
      this.drawRaster();
    }
    drawRaster(){
      const r=this.result,d=this.detail;if(!r||!this.el('trials')||!this.pageEvents)return;
      const rows=this.pageEvents,lookup=new Map(rows.map((e,i)=>[String(e.id),i])), width=600,rh=18;
      const xpos=t=>(t+r.before)/(r.before+r.after)*width;
      const ink=getComputedStyle(this.root).getPropertyValue('--text').trim()||'#374d59';
      let peak=0;
      for(const id of this.selected){
        const ui=r.unitIds.indexOf(id);
        for(let b=0;b<r.bins;b++)peak=Math.max(peak,r.meanHz[ui*r.bins+b]||0);
      }
      for(const c of this.root.querySelectorAll('canvas[data-bp-raster]')){
        const id=Number(c.dataset.bpRaster);c.width=width;c.height=Math.max(1,rows.length*rh);
        const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
        for(let i=0;i<rows.length;i++){
          const e=rows[i];ctx.fillStyle=e.id===this.activeId && this.queryUnits().includes(id)?'rgba(34,145,154,.18)':i%2?'rgba(128,139,148,.08)':'rgba(128,139,148,.02)';
          ctx.fillRect(0,i*rh,width,rh);
          const lo=e.anchor-r.before,hi=e.anchor+r.after;
          let l=0,h=this.events.length;
          while(l<h){const m=(l+h)>>>1;if(this.events[m].start<lo)l=m+1;else h=m;}
          ctx.fillStyle='#278f91';
          for(let j=l;j<this.events.length && this.events[j].start<hi;j++){
            const neighbour=this.events[j];
            if(neighbour.id!==e.id)ctx.fillRect(xpos(neighbour.start-e.anchor),i*rh,1.6,3);
          }
          const s=this.drag ? this.drag.eventId===e.id && Number(this.drag.c.dataset.bpRaster)===id ? this.drag:null :
            this.searchRange?.eventId===e.id && this.queryUnits().includes(id)?this.searchRange:null;
          if(s){ctx.fillStyle='rgba(189,125,39,.25)';ctx.fillRect(xpos(Math.min(s.start,s.end)),i*rh,Math.abs(xpos(s.end)-xpos(s.start)),rh);}
        }
        ctx.fillStyle='#b87730';ctx.fillRect(xpos(0),0,1.3,c.height);
        if(d){
          ctx.fillStyle=ink;
          for(const entry of d.spikes||[]){
            if(entry.unitId!==id||!lookup.has(String(entry.eventId)))continue;
            const y=lookup.get(String(entry.eventId))*rh;
            for(const t of entry.times)ctx.fillRect(xpos(t),y+3,1.5,rh-6);
          }
        }
        this.root.querySelector(`[data-bp-mean-label="${id}"]`).textContent=this.t('mean')+' · 0–'+peak.toFixed(1);
        const curve=this.root.querySelector(`[data-bp-mean="${id}"]`),ui=r.unitIds.indexOf(id);
        const box=curve.getBoundingClientRect(),pixelRatio=window.devicePixelRatio||1;
        const curveWidth=Math.max(1,box.width),curveHeight=Math.max(1,box.height);
        curve.width=Math.ceil(curveWidth*pixelRatio);curve.height=Math.ceil(curveHeight*pixelRatio);
        const g=curve.getContext('2d');
        g.scale(curve.width/curveWidth,curve.height/curveHeight);g.strokeStyle='#28979d';g.lineWidth=1.5;g.beginPath();
        for(let i=0;i<r.bins;i++){
          const hz=r.meanHz[ui*r.bins+i],x=i/r.bins*curveWidth,y=curveHeight-2-(hz/(peak||1))*(curveHeight-4);
          if(!Number.isFinite(hz))continue;
          if(!i)g.moveTo(x,y);else g.lineTo(x,y);
          g.lineTo((i+1)/r.bins*curveWidth,y);
        }
        g.stroke();
      }
    }
    queryUnits(){return this.searchRange?.unitIds?.filter(id=>this.selected.includes(id))||this.selected;}
    renderSearch(){
      const el=this.el('search'),r=this.result,s=this.searchRange;
      if(!el||!r||!s)return;
      const absolute=Number.isFinite(s.absoluteStart);
      const event=this.activeEvents.get(s.eventId);
      if(absolute)this.scope='recording';
      const ids=this.queryUnits(),a=absolute?s.absoluteStart:event.anchor+s.start,b=absolute?s.absoluteEnd:event.anchor+s.end;
      this.el('search-box').hidden=!ids.length;
      this.el('repeat-box').hidden=absolute||!ids.length;
      el.innerHTML=`<header class="bp-subhead"><h4>${this.t('referenceWindow')} · ${seconds(a)}–${seconds(b)} s</h4>
        ${event?`<span>${this.t('event')} · ${seconds(event.anchor)} s</span>`:''}</header>
        <div class="bp-query-units" data-bp-reference-units>${ids.length?ids.map(id=>'<span '+(window.NeuropixelsUnitMarks?.attrs(this.recordingObject,id)||'')+'>'+esc(this.unitName(id))+'</span>').join(' / '):this.t('choose')}</div>
        <form data-bp-query-form><label>${this.t(absolute?'absoluteStart':'relStart')}<input type="number" name="start" step="any" value="${absolute?s.absoluteStart:s.start}" required></label>
        <label>${this.t(absolute?'absoluteEnd':'relEnd')}<input type="number" name="end" step="any" value="${absolute?s.absoluteEnd:s.end}" required></label>
        <label ${absolute?'hidden':''}>${this.t('scope')}<select data-bp-scope name="scope" title="${this.tip('scope')}">${absolute?'':opt('events',this.t('aligned'),this.scope==='events')}${opt('recording',this.t('recording'),this.scope==='recording')}</select></label>
        <button type="submit" title="${this.tip('search')}" ${ids.length?'':'disabled'}>${this.t('match')}</button></form><div data-bp-search-result></div>`;
      this.requestRepeat();
      if(this.query)this.renderQuery();
    }
    requestRepeat(){
      const target=this.el('repeat');
      if(!target||this.el('repeat-box').hidden){this.repeatRequest=null;this.repeatKey=null;this.repeatData=null;return;}
      const ids=this.queryUnits(),{start,end}=this.searchRange,key=JSON.stringify([ids,start,end,this.result.binWidth,this.result.before,this.result.after,this.options.boutGap,this.options.boutsOnly,this.options.anchor]);
      if(key===this.repeatKey){if(this.repeatData)this.drawRepeat();return;}
      this.repeatKey=key;this.repeatData=null;this.repeatRequest=++this.serial;
      this.worker?.postMessage({action:'recurrence',requestId:this.repeatRequest,unitIds:ids,start,end});
    }
    drawRepeat(){
      const el=this.el('repeat'),r=this.repeatData;if(!el||!r)return;
      const coverage=this.result.coverage.origin.includes('unknown')?this.t('missingCoverage'):'';
      el.innerHTML=`<p class="bp-hint">${r.total} ${this.t('repeats')} · ${this.t('once')} ${this.t('countHint')} ${coverage}</p>`+
        r.unitIds.map((id,u)=>{
          const counts=r.hits.subarray(u*r.bins,(u+1)*r.bins);
          let max=0,peak=0,ties=0;
          counts.forEach((n,b)=>{if(n>max){max=n;peak=b;ties=1;}else if(n===max)ties++;});
          const best=max&&ties===1?` · ${seconds(r.start+peak*r.width)}–${seconds(r.start+(peak+1)*r.width)} s`:max?` · ${this.t('tied')}`:'';
          return `<div class="bp-repeat-row"><span>${esc(this.shortUnitName(id))}</span><canvas data-bp-frequency="${id}" width="600" height="22" role="img" aria-label="${this.t('peaks')} ${max}/${r.total}${best}"></canvas><span>${this.t('peaks')} ${max}/${r.total}${best}</span></div>`;
        }).join('')+
        `<div class="bp-repeat-row"><div class="bp-repeat-axis"><span>${seconds(r.start)} s</span><span>${seconds(r.end)} s</span></div></div>`+
        (r.exemplar!=null?this.ui('typical',`title="${this.t('exampleMethod')}"`,this.t('useTypical')+' · '+seconds(this.activeEvents.get(r.exemplar)?.anchor)+' s'):
          `<small>${this.t(r.informativeEvents<3?'repeatFew':'noRepeat')}</small>`);
      for(const [u,c] of Array.from(el.querySelectorAll('canvas')).entries()){
        const g=c.getContext('2d');g.fillStyle=getComputedStyle(this.root).getPropertyValue('--accent').trim()||'#548bd9';
        const w=c.width/r.bins;
        for(let b=0;b<r.bins;b++){const h=c.height*r.hits[u*r.bins+b]/(r.total||1);g.fillRect(b*w,c.height-h,Math.max(1,w-1),h);}
      }
    }
    runQuery(form,track=true){
      if(!this.worker||!this.result||!this.selected.length)return;
      const start=Number(form.elements.start.value),end=Number(form.elements.end.value);
      if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start){this.status(this.t('limits'),true);return;}
      const absolute=Number.isFinite(this.searchRange.absoluteStart);
      if(!absolute&&(start< -this.result.before-1e-8 || end>this.result.after+1e-8)){
        this.status(`${this.t('limits')} [−${this.result.before}, +${this.result.after}] s`,true);return;
      }
      const range=absolute?{absoluteStart:start,absoluteEnd:end}:{eventId:this.searchRange.eventId,start,end};
      if(this.searchRange.unitIds)range.unitIds=this.searchRange.unitIds.slice();
      this.el('search-box').open=true;
      if(track && (!this.query || this.scope!==form.elements.scope.value || JSON.stringify(this.searchRange)!==JSON.stringify(range)))this.remember();
      this.clearQuery();this.scope=form.elements.scope.value;
      this.searchRange=range;
      this.renderSearch();this.drawRaster();
      this.queryRequest=++this.serial;this.queryBusy=true;
      this.status(this.t('progress'));
      const mappedRange=this.getVideoRange?.();
      const videoRange=Array.isArray(mappedRange) && mappedRange.length===2 && mappedRange.every(Number.isFinite) && mappedRange[1]>mappedRange[0]?mappedRange:null;
      this.worker.postMessage({action:'query',requestId:this.queryRequest,unitIds:this.queryUnits().slice(),...this.searchRange,scope:this.scope,videoRange});
    }
    renderQuery(updateRaster=true){
      const el=this.el('search-result'),q=this.query;if(!el||!q)return;
      const filtered=Boolean(q.video && this.videoOnly),rows=filtered?q.video:q;
      this.candidates=[];
      const list=(key,examples,stats,summary)=>{
        if(!examples?.length && !stats?.total)return '';
        const items=examples.slice(0,5).map(row=>{
          const n=this.candidates.push(row)-1,isEvent=row.category==='same'||row.category==='other',t=isEvent?row.anchor:row.segmentStart,v=this.mapped(t);
          const context=this.nearby(row.segmentStart,row.segmentEnd);
          return `<button type="button" data-bp-candidate="${n}" aria-pressed="false" title="${this.tip('candidate')} ${seconds(row.segmentStart)}–${seconds(row.segmentEnd)} s">
            <span>${this.t(isEvent?'event':'window')} ${seconds(t)} s</span><span>${this.t('score')} ${Number(row.score).toFixed(2)}</span>
            <small>${v==null?this.t('unavailableVideo'):this.t('video')+' '+seconds(v)+' s'}</small>
            ${row.category==='scan'||row.category==='background'?`<small title="${this.t('nearby')}">${esc(context)}</small>`:''}</button>`;
        });
        const visible=key==='similar'&&items.length>1?items[0]+`<details><summary title="${this.tip('candidate')}">${this.t('moreMatches')} (${items.length-1})</summary>${items.slice(1).join('')}</details>`:items.join('');
        return `<div><h5>${esc(this.t(key))}${key==='other'?' · '+esc(this.comparison):''}</h5>
          ${stats?`<small>${this.t(filtered?'videoSupport':'support')} · ${stats.eligible} / ${stats.total}${summary?.median!=null?' · '+this.t('median')+' '+summary.median.toFixed(2):''}</small>`:''}${visible}</div>`;
      };
      const omitted=Object.entries(q.excluded||{}).filter(([,v])=>Number(v)>0);
      el.innerHTML=`<div class="bp-match-summary"><strong>${this.t('support')} · ${q.eligible} / ${q.total}</strong>
        <span>${Number((q.queryBinWidth*1000).toFixed(2))} ms/bin · ${q.querySpikeCount} spikes</span></div>
        <small title="${esc(q.method||'')}">${this.t('similarMetric')}${q.stride?' · '+this.t('stride')+' '+seconds(q.stride)+' s':''}${q.scoreSummaries?.candidates?.median!=null?' · '+this.t('median')+' '+q.scoreSummaries.candidates.median.toFixed(2):''}</small>
        ${omitted.length?`<details class="bp-exclusions"><summary title="${this.tip('exclusions')}">${this.t('exclusions')}</summary>${omitted.map(([reason,n])=>esc(reason)+' × '+n).join(' · ')}</details>`:''}
        ${q.video?`<div class="bp-example-filter"><button type="button" data-bp-filter="video" title="${this.tip('filterVideo')}" aria-pressed="${filtered}">${this.t('videoCandidates')} · ${q.video.eligible}</button></div>`:''}
        ${!rows.eligible?`<p>${this.t(filtered?'noVideoCandidates':'noMatches')}</p>`:''}
        <div class="bp-match-list">${list('similar',rows.similar)}</div>
        <div data-bp-preview class="bp-preview" aria-live="polite"></div>
        <details class="bp-extra"><summary title="${this.tip('extraResults')}">${this.t('extraResults')}</summary><div class="bp-match-list">${list('different',rows.different)}${list('neutral',rows.backgroundScores,rows.backgroundStats,rows.scoreSummaries?.background)}${list('other',rows.otherScores,rows.otherStats,rows.scoreSummaries?.other)}</div></details>`;
      if(rows.similar.length)this.chooseCandidate(this.candidates[this.previewIndex]?this.previewIndex:0);
      if(updateRaster)this.renderRaster();
    }
    chooseCandidate(index){
      const row=this.candidates[index],q=this.query;if(!row||!q)return;
      this.previewIndex=index;this.previewRequest=++this.serial;
      for(const b of this.root.querySelectorAll('[data-bp-candidate]'))b.setAttribute('aria-pressed',Number(b.dataset.bpCandidate)===index);
      this.el('preview').textContent=this.t('loading');
      this.worker?.postMessage({action:'preview',requestId:this.previewRequest,unitIds:this.queryUnits(),
        reference:[q.queryStart,q.queryEnd],candidate:[row.segmentStart,row.segmentEnd]});
    }
    drawPreview(v){
      const el=this.el('preview'),q=this.query,row=this.candidates[this.previewIndex];if(!el||!q||!row)return;
      const names=[this.t('reference'),this.t('candidate')];
      const ref=this.activeEvents.get(this.searchRange.eventId),eventMatch=row.category==='same'||row.category==='other';
      const zeros=[ref?ref.anchor-q.queryStart:null,eventMatch?row.anchor-row.segmentStart:null].map(t=>t!=null && t>=0 && t<v.length?t:null);
      const ms=t=>Number((t*1000).toFixed(1))+' ms';
      const shared=zeros.every(t=>t!=null) && Math.abs(zeros[0]-zeros[1])<1e-8;
      const timing=shared?ms(zeros[0]):zeros.map((t,i)=>t==null?'':names[i]+' '+ms(t)).filter(Boolean).join(' / ');
      el.innerHTML=`<div class="bp-preview-title"><strong>${this.t('refStart')} ${seconds(q.queryStart)} s · ${this.t('matchStart')} ${seconds(row.segmentStart)} s</strong>${this.ui('inspect','',this.t('inspect'))}</div>`+
        v.unitIds.map((id,i)=>`<div class="bp-comparison"><strong ${window.NeuropixelsUnitMarks?.attrs(this.recordingObject,id)||''}>${esc(this.unitName(id))}</strong><div class="bp-plot-labels"><span>${names[0]}</span><span>${names[1]}</span></div>
          <canvas data-bp-pair="${i}" height="44" role="img" aria-label="${esc(this.unitName(id))} · ${names[0]} ${v.spikes[0][i].length} spikes · ${names[1]} ${v.spikes[1][i].length} spikes"></canvas></div>`).join('')+
        `<div class="bp-preview-axis"><span>0 ms</span><span data-bp-zero>${this.t('elapsed')}${timing?' · '+this.t('zeroMark')+' '+timing:''}</span><span>${ms(v.length)}</span></div>`;
      const style=getComputedStyle(this.root),colors=['--text','--accent'].map((prop,i)=>style.getPropertyValue(prop).trim()||['#888','#5689c3'][i]);
      for(const c of el.querySelectorAll('canvas')){
        const u=Number(c.dataset.bpPair),g=c.getContext('2d');
        c.width=Math.max(1,Math.ceil(c.getBoundingClientRect().width*(devicePixelRatio||1)));
        for(let k=0;k<2;k++){
          g.fillStyle=colors[k];
          for(const t of v.spikes[k][u])g.fillRect(t/v.length*c.width,22*k+3,Math.max(1,devicePixelRatio||1),16);
          if(zeros[k]!=null){
            const x=Math.min(c.width-1,Math.max(.5,zeros[k]/v.length*c.width));g.strokeStyle='#d38f49';
            g.lineWidth=Math.max(1,devicePixelRatio||1);g.setLineDash([3,2]);g.beginPath();
            g.moveTo(x,22*k);g.lineTo(x,22*(k+1));g.stroke();
          }
        }
      }
    }
    nearby(a,b){
      const types=new Set();
      for(const e of this.input.contextEvents||this.input.events||[]){
        if(e.start<b && ((e.end>e.start)?e.end>a:e.start>=a))types.add(getLabel(e));
      }
      const names=[...types].filter(Boolean);return names.length?names.join(' · '):this.t('unlabelled');
    }
    reviewTime(row){
      const t=['scan','background'].includes(row.category)?row.segmentStart:row.anchor??row.start;
      if(t<row.segmentStart || t>=row.segmentEnd)return row.segmentStart;
      if(this.query?.video && this.videoOnly && (t<this.query.video.range[0] || t>this.query.video.range[1]))return row.segmentStart;
      return t;
    }
    setReference(id,timeRange,unitIds){
      const e=this.activeEvents?.get(id);if(!e)return;
      this.el('search-box').open=true;
      const range={eventId:id,start:timeRange?.start??Math.max(-this.result.before,-.25),end:timeRange?.end??Math.min(this.result.after,.25)};
      if(unitIds)range.unitIds=unitIds;
      if(this.activeId===id && ((!timeRange && !unitIds && this.searchRange?.eventId===id) || JSON.stringify(range)===JSON.stringify(this.searchRange)))return;
      this.remember();this.activeId=id;this.clearQuery();this.searchRange=range;
      this.page=Math.floor(this.result.events.indexOf(e)/PAGE);
      this.renderSearch();this.requestPage();
    }
    review(time,id){
      if(!Number.isFinite(time))return;
      const raw=this.rowById.get(id) || this.activeEvents?.get(id);
      this.returnToEvent?.(raw||{id:id||'',start:time,end:time,point:true,label:''},time,this.queryUnits().slice());
    }
    click(e){
      const btn=e.target.closest('button'),action=btn?.dataset.bpAction;
      if(action==='collapse'){this.setCollapsed(!this.el('content').hidden);return;}
      if(action==='close'){this.dismiss();return;}
      if(action==='back'||action==='forward'){this.navigate(action==='forward');return;}
      if(!this.result)return;
      if(btn?.dataset.bpFilter && this.query?.video){
        this.remember();this.videoOnly=!this.videoOnly;this.previewIndex=0;this.renderQuery(false);
        this.el('filter')?.focus({preventScroll:true});return;
      }
      if(btn?.hasAttribute('data-bp-unit')){this.setUnits(this.selected.filter(id=>id!==Number(btn.dataset.bpUnit)));return;}
      if(btn?.hasAttribute('data-bp-event')){
        const row=this.activeEvents.get(btn.dataset.bpEvent);
        if(row){this.reviewTarget='[data-bp-event="'+CSS.escape(row.id)+'"]';this.review(row.anchor,row.id);}
        return;
      }
      if(btn?.hasAttribute('data-bp-candidate')){const index=Number(btn.dataset.bpCandidate);if(index!==this.previewIndex){this.remember();this.chooseCandidate(index);}return;}
      if(action==='inspect'){
        const row=this.candidates?.[this.previewIndex];if(row){
          this.reviewTarget=`[data-bp-candidate="${this.previewIndex}"]`;
          const source=this.rowById.get(row.eventId);
          this.returnToEvent?.({...source,id:row.eventId,start:row.segmentStart,end:row.segmentEnd,label:source?getLabel(source):row.type||''},this.reviewTime(row),this.queryUnits().slice());
        }
        return;
      }
      if(action==='typical' && this.repeatData?.exemplar!=null){
        const r=this.repeatData;
        this.setReference(r.exemplar,{start:r.start,end:r.end},this.searchRange.unitIds);
        this.el('scope').value='events';this.revealQuery=true;this.runQuery(this.el('query-form'));
        return;
      }
      if(e.target.matches('[data-bp-map]')){
        const loc=this.mapLocation(e);if(!loc)return;
        this.setUnits(e.ctrlKey||e.metaKey?(this.selected.includes(loc.id)?this.selected.filter(id=>id!==loc.id):[...this.selected,loc.id]):[loc.id]);
        return;
      }
      if(action==='prev'||action==='next'){this.remember();this.page+=action==='prev'?-1:1;this.requestPage();return;}
    }
    change(e){
      if(e.target.matches('[data-bp-add-unit]') && e.target.value!==''){
        this.setUnits([...this.selected,Number(e.target.value)]);e.target.value='';
      }else if(e.target.matches('[data-bp-order]') && this.order!==e.target.value){this.remember();this.order=e.target.value;this.page=0;this.requestPage();}
      else if(e.target.matches('[data-bp-page]')){
        const v=Number(e.target.value);
        if(Number.isInteger(v) && e.target.checkValidity() && this.page!==v-1){this.remember();this.page=v-1;this.requestPage();}
      }
    }
    submit(e){
      e.preventDefault();
      const f=e.target;
      if(f.matches('[data-bp-config]')){
        const options={before:Number(f.elements.before.value),after:Number(f.elements.after.value),bin:Number(f.elements.bin.value)/1000,boutGap:Number(f.elements.gap.value),
          anchor:f.elements.anchor.value,boutsOnly:f.elements.group.value==='bouts'};
        if(JSON.stringify(options)===JSON.stringify(this.options)&&this.comparison===f.elements.comparison.value)return;
        this.remember();const current=this.view();
        this.options=options;this.comparison=f.elements.comparison.value;
        this.restoreAfterLoad={...current,options,comparison:this.comparison};this.compute();
      }else if(f.matches('[data-bp-query-form]'))this.runQuery(f);
    }
    offsetAt(c,e){
      const rect=c.getBoundingClientRect(),k=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
      return {time:k*(this.result.after+this.result.before)-this.result.before,row:Math.floor((e.clientY-rect.top)/rect.height*this.pageEvents.length)};
    }
    pointerDown(e){
      const c=e.target.closest('canvas[data-bp-raster]');
      if(!c||!this.detail||e.button!==0)return;
      const p=this.offsetAt(c,e),row=this.pageEvents[p.row];if(!row)return;
      this.root.focus({preventScroll:true});
      this.drag={c,eventId:row.id,start:p.time,end:p.time,id:e.pointerId,x:e.clientX};
      c.setPointerCapture(e.pointerId);
    }
    pointerMove(e){
      if(!this.result)return;
      if(e.target.matches('[data-bp-map]')){
        const loc=this.mapLocation(e);if(loc)window.NeuropixelsUnitMarks?.bind(this.el('map-readout'),this.recordingObject,loc.id);
        if(loc)this.el('map-readout').textContent=`${this.unitName(loc.id)} · ${seconds(loc.time)} s · ${Number.isFinite(loc.hz)?loc.hz.toFixed(2)+' Hz':this.t('missing')}`;
        return;
      }
      const c=this.drag?.c || e.target.closest('canvas[data-bp-raster]');
      if(!c||!this.detail)return;
      const p=this.offsetAt(c,e),row=this.drag?this.activeEvents.get(this.drag.eventId):this.pageEvents[p.row];
      if(this.drag && this.drag.id===e.pointerId){this.drag.end=p.time;this.drawRaster();}
      this.hover(p.time);
      this.el('readout').textContent=`${this.t('latency')} ${seconds(p.time)} s${row?' · '+seconds(row.anchor+p.time)+' s':''}`;
    }
    pointerUp(e){
      const drag=this.drag;
      if(!drag||drag.id!==e.pointerId)return;
      this.drag=null;
      if(drag.c.hasPointerCapture(e.pointerId))drag.c.releasePointerCapture(e.pointerId);
      const units=[Number(drag.c.dataset.bpRaster)];
      if(Math.abs(e.clientX-drag.x)<5){this.setReference(drag.eventId,null,units);return;}
      const end=this.offsetAt(drag.c,e).time;
      this.setReference(drag.eventId,{start:Math.min(end,drag.start),end:Math.max(end,drag.start)},units);
      this.el('query-form')?.querySelector('button')?.focus({preventScroll:true});
    }
    hover(time){
      if(!this.result)return;
      for(const el of this.root.querySelectorAll('[data-bp-hover]')){
        el.hidden=time==null;if(time!=null)el.style.left=(100*(time+this.result.before)/(this.result.before+this.result.after))+'%';
      }
    }
  }
  window.NeuropixelsBehaviorPatternsUI=BehaviorPatternsUI;
})();
