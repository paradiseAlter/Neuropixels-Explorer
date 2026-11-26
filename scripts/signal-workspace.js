// SPDX-License-Identifier: MIT
((root, factory) => {
  const api = factory(typeof module === "object" && module.exports ? require("./activity-overview.js") : root.NeuropixelsActivityOverview);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NeuropixelsSignalWorkspace = api.SignalWorkspace;
})(typeof globalThis === "object" ? globalThis : window, overview => {
  "use strict";
  const DEFAULT_SPAN = 2;
  const UNIT_HEIGHT = 60, GROUP = 29;
  const clamp = (n, min, max) => Math.max(min, Math.min(n, max));
  const copy = {
    pickHint:["Click a Unit to add or remove it from this selection.","点击此 Unit 加入或移出本次选择。","Pulsa una unidad para añadirla o quitarla de la selección."],
    picked:["Selected","已选","Seleccionada"],
    units: ["Units", "神经元", "Unidades"], labels: ["Labels", "标签", "Etiquetas"],
    range: ["Time window", "时间窗口", "Ventana temporal"], whole: ["Full recording", "全程", "Registro completo"],
    selection: ["Selection", "选区", "Selección"], similar: ["Find similar", "找相似片段", "Buscar similares"],
    fit: ["Zoom to selection", "放大到选区", "Ampliar selección"], clear: ["Clear selection", "清除选区", "Borrar selección"],
    fitHint: ["Fit the selected interval to the width of the signal view.", "让所选时间段占满当前信号图宽度。", "Ajusta el ancho de las señales al intervalo seleccionado."],
    similarHint: ["Compare spike counts from these Units and this interval with other windows.", "用这个时间段内所选 Unit 的放电，寻找其他相似时段。", "Compara los spikes de estas unidades e intervalo con otras ventanas."],
    clearHint: ["Remove the highlighted interval and keep the time window.", "取消高亮的时间段，保留当前时间窗。", "Quita la selección y conserva la ventana de tiempo."],
    last: ["Last", "上次", "Última"], loading: ["Reading…", "读取中…", "Leyendo…"],
    direct: ["Click to center at 2 s. Drag to pan.", "单击居中到 2 秒窗，拖动平移。", "Clic para centrar en 2 s. Arrastra para desplazar."],
    primary: ["Primary Unit", "主 Unit", "Unidad principal"],reference: ["Reference Unit", "参考 Unit", "Unidad de referencia"],
    unitHint: ["Click to select or remove. Ctrl/Cmd-click to add a reference. Drag horizontally to pan.", "点击选中或取消，Ctrl/Cmd＋点追加参考行，横拖平移。", "Clic para seleccionar o quitar. Ctrl/Cmd-clic para añadir una referencia. Arrastra para desplazar."],
    bins: ["bin", "分箱", "intervalo"], count: ["spikes", "spike", "spikes"],
    rate: ["Firing rate", "放电率", "Tasa de disparo"],
    estimate: ["Hz uses nominal bin duration where observation intervals are unknown.", "观测区间未知时，Hz 按分箱时长估算。", "Si se desconoce la cobertura, los Hz usan la duración nominal."],
    gap: ["No observation", "无观测", "Sin observación"],
    tools: ["Figure tools", "图形工具", "Herramientas de figura"],
    measure: ["Measure interval", "测量时间区间", "Medir intervalo"],
    pan: ["Pan time", "平移时间轴", "Desplazar el tiempo"],
    zoom: ["Zoom at pointer with wheel or drag a time interval", "滚轮围绕指针缩放，或框选时间区间放大", "Usa la rueda para ampliar o arrastra un intervalo"],
    home: ["Restore full recording view", "恢复完整记录时间轴", "Restaurar la vista del registro completo"],
    undo: ["Previous view", "上一视图", "Vista anterior"],
    redo: ["Next view", "下一视图", "Vista siguiente"]
  };
  const toolPaths = {
    measure:"M3 6v12m18-12v12M3 12h18m-14-3-3 3 3 3m10-6 3 3-3 3",
    pan:"M5 13V9a1.5 1.5 0 0 1 3 0v3-7a1.5 1.5 0 0 1 3 0v7-8a1.5 1.5 0 0 1 3 0v8-7a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-2 7-6 7h-2c-2 0-3-1-4-2l-5-6c-1-2 1-3 2-2l3 3",
    zoom:"M3 8V4h4m6 0h4v4m0 4v4h-4m-6 0H3v-4m14 4 5 5M7 10h6m-3-3v6",
    home:"m2 11 10-8 10 8M5 9v12h14V9m-10 12v-7h6v7",
    undo:"m13 5-7 7 7 7m-7-7h15", redo:"m11 5 7 7-7 7m7-7H3"
  };
  const modes=["measure","pan","zoom"];
  const changed=(a,b)=>JSON.stringify(a)!==JSON.stringify(b);
  function unitNavigation(before,after) {
    return before.view.cursorTime===after.view.cursorTime && !changed(before.view.visibleRange,after.view.visibleRange)
      && !changed(before.view.selectedInterval,after.view.selectedInterval)
      && !changed(before.context,after.context);
  }
  function label(key) {
    const lang = document.documentElement.lang || "en";
    return copy[key][lang.startsWith("zh") ? 1 : lang.startsWith("es") ? 2 : 0];
  }
  function timeWindow(center, span, duration) {
    span = clamp(span, Math.min(.01, duration), duration);
    const start = clamp(center - span / 2, 0, duration - span);
    return {start, end:start + span};
  }
  function lower(a, value) {
    let i = 0, j = a.length;
    while (i < j) {
      const m = i + Math.floor((j-i)/2);
      if (a[m] < value) i = m+1; else j = m;
    }
    return i;
  }
  function binSize(span, width) {
    const min = Math.max(.1, span / Math.max(2,width/2));
    const power = 10 ** Math.floor(Math.log10(min));
    return [1,2,5,10].find(n => n*power >= min) * power;
  }
  // Display bins are whole deciseconds. Dividing integer edges once keeps 1.2
  // on the boundary shared by the rate bins and stored observation intervals.
  const edge=(i,width)=>i*Math.round(10*width)/10;
  // Half-open bins are fixed to the recording clock, including during a pan.
  function ratesFor(spikes, range, width, duration, coverage, loaded) {
    const first = Math.floor(range.start/width), last = Math.ceil(range.end/width);
    const rates = [];
    for (let n=first; n<last; n++) {
      const left=edge(n,width), right=Math.min(edge(n+1,width),duration);
      if (loaded && (left<loaded.start || right>loaded.end)) { rates.push(undefined); continue; }
      if (coverage && !coverage.some(pair=>pair[0]<=left && pair[1]>=right)) { rates.push(null); continue; }
      rates.push((lower(spikes,right)-lower(spikes,left))/(right-left));
    }
    const complete=!loaded || (range.start>=loaded.start && range.end<=loaded.end);
    return {first, rates, count:complete?lower(spikes,range.end)-lower(spikes,range.start):null};
  }
  const element = (name, cls, text) => {
    const node = document.createElement(name);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const seconds = n => Math.abs(n)<.0005 ? "0" : Number(n.toFixed(3)).toString();
  function button(cls, text) {
    const node=element("button",cls,text); node.type="button"; return node;
  }

  class SignalWorkspace {
    static forUnitSelection(host,{recording,units,selectedIds,onChange,loadWindow,initialView,initialScroll}) {
      const root=element('div','sw-unit-picker');
      host.replaceChildren(root);
      const picker=new SignalWorkspace(root,{
        getRecording:()=>recording,loadWindow,localSpikeWindows:()=>Boolean(recording.spikeTimesFile),
        setView:patch=>picker.setViewState(patch),onPickUnits:onChange
      });
      picker.setData({duration:recording.duration,units});
      picker.setPickedUnits(selectedIds);
      if(initialView?.visibleRange?.end>initialView?.visibleRange?.start){
        const {visibleRange,cursorTime}=initialView;
        picker.setViewState({visibleRange:{...visibleRange},cursorTime});
        picker.viewport.scrollTop=initialScroll||0;
      }
      picker.tool('pan');
      return picker;
    }
    setPickedUnits(ids) {
      this.extra=new Set(ids.filter(id=>this.unitById.has(id)));
      this.render();
    }
    constructor(root, options) {
      this.root=root; this.options=options;
      root.classList.add("signal-workspace");
      root.innerHTML=`<div class="sw-status"><div class="sw-readouts"><strong data-sw-range></strong><span class="sw-legend" data-sw-legend></span><span data-sw-scale></span><div class="sw-measure" hidden><span></span><button type="button" data-sw-fit></button><button type="button" data-sw-pattern></button><button type="button" data-sw-clear>×</button></div></div></div>
        <div class="sw-label-line"><span></span><div class="sw-marker-area"></div></div>
        <div class="sw-body"><div class="sw-viewport" tabindex="0" role="region"><div class="sw-space"></div></div><div class="sw-sticky" hidden></div></div>
        <div class="sw-axis-line"><span data-sw-total></span><div class="sw-axis" tabindex="0" role="slider"></div></div>
        <div class="sw-track" tabindex="0" role="slider"><div class="sw-thumb"></div></div>`;
      const get = s => root.querySelector(s);
      this.viewport=get(".sw-viewport"); this.space=get(".sw-space"); this.sticky=get(".sw-sticky");
      this.axis=get(".sw-axis"); this.track=get(".sw-track"); this.thumb=get(".sw-thumb");
      this.markerArea=get(".sw-marker-area"); this.measure=get(".sw-measure");
      this.rangeText=get("[data-sw-range]"); this.scaleText=get("[data-sw-scale]"); this.totalText=get("[data-sw-total]");
      this.toolbar=element("div","sw-tools");this.toolbar.setAttribute("role","group");
      for(const [action,path] of Object.entries(toolPaths)){
        const control=button("sw-tool");control.dataset.swTool=action;
        control.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';
        this.toolbar.append(control);
      }
      get(".sw-status").append(this.toolbar);
      this.tip=element("div","sw-tip");this.tip.hidden=true;this.tip.setAttribute("role","tooltip");root.append(this.tip);
      this.histories=new Map();this.mode="measure";this.root.dataset.swMode=this.mode;
      this.collapsed=new Set(); this.extra=new Set(); this.lastUnit=new Map(); this.groups=[]; this.rows=[];
      this.unitRows=new Map(); this.nodes=new Map(); this.stickyNodes=new Map(); this.trains=new Map(); this.coverage=new Map();
      this.labels=[]; this.labelRevision=0; this.view={visibleRange:{start:0,end:0},cursorTime:0};
      this.viewport.addEventListener("scroll",()=>this.onScroll(),{passive:true});
      root.addEventListener("pointerdown", e=>this.pointerDown(e));
      root.addEventListener("pointermove", e=>this.pointerMove(e));
      root.addEventListener("pointerup", e=>this.pointerUp(e));
      root.addEventListener("pointercancel",()=>this.cancelDrag());
      root.addEventListener("pointerleave",()=>{this.hover=null;this.tip.hidden=true;});
      root.addEventListener("click", e=>this.click(e));
      root.addEventListener("keydown",e=>this.key(e));
      root.addEventListener("wheel",e=>this.wheel(e),{passive:false});
      this.observer=new ResizeObserver(()=>this.render()); this.observer.observe(this.viewport);
    }
    snapshot() {
      const v=this.view;
      return structuredClone({view:{visibleRange:v.visibleRange,cursorTime:v.cursorTime,
        selectedInterval:v.selectedInterval??null,selectedUnitId:v.selectedUnitId??null,expandedUnitId:v.expandedUnitId??null,
        selectedGroupKey:v.selectedGroupKey??null,groupFocusPath:v.groupFocusPath??[],selectedShank:v.selectedShank??null,selectedRegion:v.selectedRegion??null},
        extra:[...this.extra],collapsed:[...this.collapsed],last:[...this.lastUnit],
        top:this.viewport.scrollTop,context:this.options.captureContext?.()??null});
    }
    checkpoint() {
      if(!this.history||this.busy||this.drag||this.externalGesture||this.pendingBefore)return;
      this.pendingBefore=this.snapshot();
      this.merge=null;
      // External callbacks can update both app labels and the local plot in the same event.
      this.commitTimer=setTimeout(()=>this.finishCheckpoint(),0);
    }
    finishCheckpoint() {
      clearTimeout(this.commitTimer);
      const before=this.pendingBefore;
      this.pendingBefore=null;
      if(before)this.record(before);
    }
    beginGesture() {
      if(!this.history||this.busy||this.externalGesture)return;
      this.finishCheckpoint();this.externalGesture=this.snapshot();this.merge=null;
    }
    endGesture({cancel=false}={}) {
      const before=this.externalGesture;this.externalGesture=null;
      if(!before)return;
      if(cancel)this.restore(before);else this.record(before);
    }
    record(before,mergeKey=null) {
      if(!this.history||this.busy)return;
      const after=this.snapshot();
      this.knownTop=after.top;
      if(!changed(before,after))return;
      const h=this.history, now=performance.now();
      const sameGesture=mergeKey && this.merge?.key===mergeKey && (mergeKey.startsWith("key-") || now-this.merge.time<450);
      const from=before.view.visibleRange,to=after.view.visibleRange;
      if(changed(from,to)){
        const ranges=h.ranges;
        ranges.splice(h.position+1);
        if(changed(ranges.at(-1),from))ranges.push({...from});
        if(sameGesture && h.position>0 && !changed(ranges.at(-1),from))ranges.pop();
        ranges.push({...to});
        if(ranges.length>101)ranges.splice(0,ranges.length-101);
        h.position=ranges.length-1;
      }
      if(sameGesture && h.index===h.entries.length && h.index){
        h.entries[h.index-1].after=after;
      }else{
        h.entries.splice(h.index);
        h.entries.push({before,after});
        if(h.entries.length>100)h.entries.shift();
        h.index=h.entries.length;
      }
      this.merge=mergeKey?{key:mergeKey,time:now}:null;
      this.historyChanged();
    }
    run(action,mergeKey=null) {
      if(!this.history||this.busy){action();return;}
      this.finishCheckpoint();
      const before=this.snapshot();
      this.busy=true;
      try{action();}finally{this.busy=false;this.record(before,mergeKey);}
    }
    canUndo(){return Boolean(this.history?.index);}
    canRedo(){return Boolean(this.history && this.history.index<this.history.entries.length);}
    undo(){return this.stepHistory(-1);}
    redo(){return this.stepHistory(1);}
    stepHistory(direction) {
      this.finishCheckpoint();
      if(this.drag)this.cancelDrag();
      if(direction<0?!this.canUndo():!this.canRedo())return false;
      const h=this.history;
      const entry=direction<0?h.entries[--h.index]:h.entries[h.index++];
      this.restore(direction<0?entry.before:entry.after,unitNavigation(entry.before,entry.after));
      this.historyChanged();
      return true;
    }
    restore(snapshot,unitsOnly=false,switchingProbe=false) {
      const state=structuredClone(snapshot);
      this.busy=true;this.merge=null;
      try{
        this.extra=new Set(state.extra);this.collapsed=new Set(state.collapsed);
        if(unitsOnly){
          const {visibleRange,cursorTime,selectedInterval,...unitView}=state.view;
          this.options.setView(unitView);
        }else{
          if(!switchingProbe)this.options.restoreContext?.(state.context);
          this.options.setView(state.view,{seekVideo:!switchingProbe,historyRestore:!switchingProbe});
        }
        this.lastUnit=new Map(state.last);
        this.layout();this.viewport.scrollTop=state.top;this.knownTop=this.viewport.scrollTop;
        this.tip.hidden=true;this.render();
        if(this.options.onPickUnits)this.options.onPickUnits(this.selectedUnits());
      }finally{this.busy=false;}
    }
    historyChanged() {
      this.toolbar.querySelector('[data-sw-tool="undo"]').disabled=!(this.history?.position>0);
      this.toolbar.querySelector('[data-sw-tool="redo"]').disabled=!(this.history && this.history.position<this.history.ranges.length-1);
      this.options.onHistoryChange?.();
      this.render();
    }
    onScroll() {
      const top=this.viewport.scrollTop;
      if(this.knownTop!=null && this.knownTop!==top && this.history && !this.busy && !this.drag && !this.pendingBefore){
        const before=this.snapshot();before.top=this.knownTop;this.record(before,"vertical");
      }
      this.knownTop=top;this.hover=null;this.tip.hidden=true;this.render();
    }
    selectedUnits() {
      const ids=new Set(), active=this.view.selectedUnitId;
      if(active!=null)ids.add(Number(active));
      for(const id of this.extra)ids.add(id);
      return [...ids].filter(id=>this.unitById?.has(id));
    }
    setData(data,{preserveState=false,recordingKey}={}) {
      if (preserveState && data && this.data) { this.data=data; this.render(); return false; }
      if(!this.data&&!data){this.root.hidden=true;return false;}
      if(this.drag)this.cancelDrag();
      this.endGesture();
      this.finishCheckpoint();
      if(this.history)this.history.saved=this.snapshot();
      this.merge=null;this.hover=null;this.blockedClickNode=null;this.tip.hidden=true;this.history=null;
      this.abortRead(); this.trains.clear(); this.coverage.clear(); this.problem=null;this.failed=null;this.warmLimitHit=false;
      this.extra.clear();this.collapsed.clear();this.lastUnit.clear();this.groups=[];
      this.nodes.clear();this.stickyNodes.clear();this.space.replaceChildren();this.sticky.replaceChildren();
      this.range=null;this.markerKey=null;this.axisKey=null;this.sticky.hidden=true;
      this.unitById=new Map();this.unitGroups=new Map();this.data=data;this.drag=null;this.preview=null;
      if(!data){this.labels=[];this.labelRevision++;}
      this.view={visibleRange:{start:0,end:data?.duration||0},cursorTime:0};
      this.viewport.scrollTop=0;this.knownTop=0;
      if (data) {
        const key=recordingKey??data;
        if(!this.histories.has(key))this.histories.set(key,{entries:[],index:0,saved:null,ranges:[{...this.view.visibleRange}],position:0});
        this.history=this.histories.get(key);
        let lastKey=null;
        for (const unit of overview.stableUnitOrder(data.units)) {
          const key=overview.anatomyBoundaryKey(unit);
          if (key!==lastKey) {
            this.groups.push({key:"g"+this.groups.length,region:unit.trackRegion||unit.region||"—",shank:unit.shankId,units:[]});
            lastKey=key;
          }
          const id=Number(unit.id),group=this.groups.at(-1);
          this.unitById.set(id,unit); this.unitGroups.set(id,group);group.units.push(id);
        }
      }
      this.layout();
      const saved=this.history?.saved;
      if(saved){this.root.hidden=false;this.restore(saved,false,true);}
      this.historyChanged();
      return Boolean(saved);
    }
    setViewState(view) {
      if (!view) return;
      if(view.visibleRange && (view.visibleRange.start!==this.view.visibleRange.start || view.visibleRange.end!==this.view.visibleRange.end)){
        this.tip.hidden=true;this.refreshTip=true;
      }
      this.view={...this.view,...view};
      if (this.view.selectedUnitId!=null) {
        const active=Number(this.view.selectedUnitId),group=this.unitGroups?.get(active);
        this.extra.delete(active);
        if(group)this.lastUnit.set(group.key,active);
      }
      this.render();
    }
    setAnnotations(rows,recorded=false) {
      this.labels=rows||[];this.recorded=recorded;this.labelRevision++;this.render();
    }
    applyTextSize() {
      const first = Math.min(lower(this.ends || [], this.viewport.scrollTop), this.rows.length - 1);
      const old = this.rows[first];
      const fraction = old ? (this.viewport.scrollTop - old.top) / old.height : 0;
      this.layout();
      if (old) this.viewport.scrollTop = this.rows[first].top + fraction * this.rows[first].height;
      this.axisKey = null;
      this.render();
    }
    layout() {
      const scale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
      const groupHeight = Math.ceil(GROUP * scale), unitHeight = Math.ceil(UNIT_HEIGHT * scale);
      let offset=0;
      this.rows=[];this.ends=[];this.unitRows=new Map();
      const add=row=>{row.top=offset;offset+=row.height;this.rows.push(row);this.ends.push(offset);};
      for(const group of this.groups){
        add({key:group.key, group, height:groupHeight});
        if(this.collapsed.has(group.key))continue;
        for(const id of group.units){
          const row={key:"u"+id,id,group,height:unitHeight};
          this.unitRows.set(id,row);add(row);
        }
      }
      this.space.style.height=offset+"px";
    }
    motion() {
      clearTimeout(this.motionTimer);this.root.classList.add("sw-transition");
      this.motionTimer=setTimeout(()=>this.root.classList.remove("sw-transition"),205);
    }
    locateUnit(id) {
      id=Number(id);const group=this.unitGroups?.get(id);if(!group)return;
      if(this.collapsed.delete(group.key))this.layout();
      const row=this.unitRows.get(id), h=this.viewport.clientHeight;
      const centerTop=row.top-(h-row.height)/2;
      const pinnedHeight=this.selectedUnits().reduce((total,unit)=>{
        const pin=this.unitRows.get(unit);
        return total+(pin && (pin.top+pin.height<=centerTop || pin.top>=centerTop+h)?pin.height:0);
      },0);
      this.viewport.scrollTop=centerTop-Math.min(pinnedHeight,h*.46)/2;
      this.knownTop=this.viewport.scrollTop;
      this.render();
    }
    focusUnit(id) {
      const row=this.unitRows.get(Number(id)), y=this.viewport.scrollTop;
      if(!row || row.top<y+(this.sticky.hidden?0:this.sticky.offsetHeight) || row.top+row.height>y+this.viewport.clientHeight)this.locateUnit(id);
    }
    toggleGroup(key) {
      const row=this.rows.find(r=>r.key===key);
      if(!row)return;
      const offset=row.top-this.viewport.scrollTop;
      if(this.collapsed.has(key))this.collapsed.delete(key);else this.collapsed.add(key);
      this.motion(); this.layout();
      this.viewport.scrollTop=this.rows.find(r=>r.key===key).top-offset;
      this.render();
    }
    choose(id, extra=false) {
      if(this.options.onPickUnits){
        if(!this.extra.delete(id))this.extra.add(id);
        this.options.onPickUnits(this.selectedUnits());
        this.render();return;
      }
      const active=this.view.selectedUnitId;
      if(active===id){
        const next=this.extra.values().next().value??null;
        this.options.selectUnit(next,{reveal:false,expandedUnitId:null});
      }else if(this.extra.delete(id)){
        this.render();
      }else if(extra && active!=null){
        this.extra.add(id);
        const group=this.unitGroups.get(id);
        if(group)this.lastUnit.set(group.key,id);
        this.render();
      }else this.options.selectUnit(id,{expandedUnitId:null});
    }
    render() {
      if(this.frame==null)this.frame=requestAnimationFrame(()=>{this.frame=null;this.paint();});
    }
    localize() {
      if (this.language===document.documentElement.lang) return;
      this.language=document.documentElement.lang;
      this.viewport.setAttribute("aria-label",label("units"));
      for(const [node,key] of [[this.axis,"range"],[this.track,"whole"]]){
        node.setAttribute("aria-label",label(key));node.title=label("direct");
      }
      this.root.querySelector(".sw-label-line > span").textContent=label("labels");
      this.root.querySelector("[data-sw-fit]").textContent=label("fit");
      this.root.querySelector("[data-sw-pattern]").textContent=label("similar");
      this.root.querySelector("[data-sw-clear]").setAttribute("aria-label",label("clear"));
      for(const [button,key] of [["fit","fitHint"],["pattern","similarHint"],["clear","clearHint"]])
        this.root.querySelector("[data-sw-"+button+"]").title=label(key);
      this.scaleText.title=label("estimate");
      this.root.querySelector("[data-sw-legend]").textContent="│ spike　━ "+label("rate");
      this.toolbar.setAttribute("aria-label",label("tools"));
      for(const tool of this.toolbar.children){
        const action=tool.dataset.swTool;
        tool.title=label(action);tool.setAttribute("aria-label",tool.title);
        if(modes.includes(action))tool.setAttribute("aria-pressed",String(action===this.mode));
      }
      this.axisKey=null;this.markerKey=null;
    }
    paint() {
      this.localize();
      const duration=this.data?.duration, raw=this.view.visibleRange;
      if (!duration || !raw || raw.end<=raw.start) {
        this.root.hidden=true;
        return;
      }
      this.root.hidden=false;
      const range=this.range={start:clamp(raw.start,0,duration),end:clamp(raw.end,0,duration)};
      const span=range.end-range.start;
      if(span<=0)return;
      this.colors=null;
      this.root.style.setProperty("--sw-gutter",this.viewport.offsetWidth-this.viewport.clientWidth+"px");
      const h=this.viewport.clientHeight, top=this.viewport.scrollTop, width=this.markerArea.clientWidth;
      if(!width||!h)return;
      const from=Math.max(0,lower(this.ends,top-h));
      const visible=this.rows.slice(from,lower(this.ends,top+2*h)+1);
      const pins=this.options.onPickUnits?[]:this.selectedUnits().map(id=>this.unitRows.get(id)).filter(row=>row&&(row.top+row.height<=top || row.top>=top+h));
      const stickyFocus=this.sticky.contains(document.activeElement)?document.activeElement:null;
      this.sticky.hidden=!pins.length;
      const ids=[...new Set([...pins,...visible].filter(r=>r.id!=null).map(r=>r.id))];
      const bin=binSize(span,width);
      this.needData(range,bin,ids);
      const summary=new Map();
      const displayed=new Set([...pins,...visible.filter(row=>row.top+row.height>top && row.top<top+h)].map(row=>row.id));
      let max=0;
      for (const id of ids) {
        const entry=this.trains.get(id);
        if (!entry || entry.start>=range.end || entry.end<=range.start)continue;
        const metrics=ratesFor(entry.spikes,range,bin,duration,this.coverage.get(id),entry);
        if(displayed.has(id))for(const value of metrics.rates)if(value!=null)max=Math.max(max,value);
        summary.set(id,metrics);
      }
      const ymax=Math.max(1,Math.ceil(max));
      this.paintRows(this.space,this.nodes,visible,false,summary,bin,ymax,width);
      this.paintRows(this.sticky,this.stickyNodes,pins,true,summary,bin,ymax,width);
      if(stickyFocus && !stickyFocus.isConnected && document.activeElement===document.body){
        (this.sticky.querySelector(".sw-name")||this.viewport).focus({preventScroll:true});
      }
      this.sticky.style.right=this.viewport.offsetWidth-this.viewport.clientWidth+"px";
      this.paintAxis(range,bin,summary.size?ymax:null);
      this.paintLabels(range);
      if(this.refreshTip){
        this.refreshTip=false;
        const h=this.hover;
        if(h && !this.drag && document.elementFromPoint(h.clientX,h.clientY)===h.target)this.showTip(h);
      }
    }
    paintRows(host, cache, rows, pinned, summary, bin, ymax, width) {
      const seen=new Set();
      for(const [index,row] of rows.entries()){
        seen.add(row.key);
        let node=cache.get(row.key);
        if(!node){
          if(row.id==null){
            node=button("sw-group disclosure-trigger");node.dataset.swGroup=row.key;
          }else{
            node=element("div","sw-unit");node.dataset.unit=String(row.id);
            const unit=this.unitById.get(row.id);
            const head=button("sw-unit-head sw-name"),name=element("strong","sw-unit-title",unit.probeName?unit.probeName+" · Unit "+unit.sourceUnitId:"Unit "+row.id);
            window.NeuropixelsUnitMarks?.bind(name,this.options.getRecording?.(),row.id);
            const meta=element("small","sw-meta"),counts=element("small","sw-count");
            head.setAttribute("aria-label",name.textContent);
            meta.textContent=[unit.region,unit.depthUm!=null?Math.round(unit.depthUm)+" µm":null].filter(Boolean).join(" · ");
            head.append(name,meta,counts);
            const plot=element("canvas","sw-plot");plot.setAttribute("role","img");
            node.append(head,plot);
          }
          cache.set(row.key,node);host.append(node);
        }
        if(pinned && host.children[index]!==node)host.insertBefore(node,host.children[index]||null);
        node.style.height=row.height+"px";
        if(!pinned)node.style.transform="translateY("+row.top+"px)";
        if(row.id==null){
          const closed=this.collapsed.has(row.key), last=this.lastUnit.get(row.key);
          node.setAttribute("aria-expanded",String(!closed));
          node.textContent=(row.group.shank==null?"":"S"+(Number(row.group.shank)+1)+"  ·  ")+row.group.region+"   "+row.group.units.length+" Units"+(closed&&last!=null?"   ·   "+label("last")+" "+last:"");
          continue;
        }
        const active=this.view.selectedUnitId===row.id, isExtra=this.extra.has(row.id);
        node.classList.toggle("sw-active",active);node.classList.toggle("sw-extra",isExtra);
        const name=node.querySelector(".sw-name"),role=active?label("primary"):isExtra?label(this.options.onPickUnits?"picked":"reference"):"";
        name.setAttribute("aria-pressed",String(active||isExtra));name.title=[role,label(this.options.onPickUnits?"pickHint":"unitHint")].filter(Boolean).join(" · ");
        const m=summary.get(row.id),count=node.querySelector(".sw-count"),selected=this.view.selectedInterval;
        count.textContent=m?.count!=null?m.count+" "+label("count"):this.problem?"⚠":label("loading");
        count.title=this.problem||"";
        if(m?.count!=null && selected && (!selected.unitIds || selected.unitIds.includes(row.id)) && selected.start>=this.range.start && selected.end<=this.range.end){
          const a=this.trains.get(row.id).spikes;
          count.textContent+=" · "+label("selection")+" "+(lower(a,selected.end)-lower(a,selected.start));
        }
        name.setAttribute("aria-description",[role,name.querySelector(".sw-meta").textContent,count.textContent].filter(Boolean).join(" · "));
        this.draw(node.querySelector("canvas"),row,bin,ymax,width,m);
      }
      for(const [key,node] of cache)if(!seen.has(key)){node.remove();cache.delete(key);}
    }
    abortRead() {
      this.request?.abort();this.request=null;
    }
    async needData(range,bin,visibleIds) {
      if(this.request || !visibleIds.length)return;
      const duration=this.data.duration;
      const span=range.end-range.start, pad=Math.min(20,Math.max(1,2*span));
      const left=margin=>Math.max(0,edge(Math.floor((range.start-margin)/bin),bin));
      const right=margin=>Math.min(duration,edge(Math.ceil((range.end+margin)/bin),bin));
      const guardStart=left(pad/3),guardEnd=right(pad/3);
      // Local files are time-sorted. A short read can supply every Unit in one pass.
      // Database mode loads a separate whole train per Unit, so only warm adjacent rows.
      const wholeProbe=!this.warmLimitHit && this.options.localSpikeWindows?.() && span<=20 && this.unitById.size<=1024;
      const ids=wholeProbe?this.unitById.keys():visibleIds;
      const missing=[];
      for(const id of ids){
        const entry=this.trains.get(id);
        if(!entry || entry.start>guardStart || entry.end<guardEnd)missing.push(id);
      }
      if(!missing.length)return;
      const start=left(pad),end=right(pad),signature=start+"/"+end+"/"+missing.join(",");
      if(this.failed===signature)return;
      const req=this.request=new AbortController();
      this.problem=null;
      try {
        const result=await this.options.loadWindow({unitIds:missing,start,end,signal:req.signal});
        if(req.signal.aborted)return;
        for(const id of missing){
          const spikes=result.get(id);
          if(!spikes)throw Error("Missing Unit "+id);
          this.trains.delete(id);
          this.trains.set(id,{start,end,spikes});
          if(result.coverage?.has(id))this.coverage.set(id,result.coverage.get(id));
        }
        let bytes=0;
        for(const entry of this.trains.values())bytes+=entry.spikes.length*8;
        if(wholeProbe && bytes>64*1024*1024)this.warmLimitHit=true;
        const keep=new Set(visibleIds);
        for(const [id,entry] of this.trains){
          if(bytes<=64*1024*1024)break;
          if(!keep.has(id)){bytes-=entry.spikes.length*8;this.trains.delete(id);}
        }
        this.failed=null;this.refreshTip=true;
      }catch(error){if(!req.signal.aborted){this.problem=error.message;this.failed=signature;}}
      finally{if(!req.signal.aborted){this.request=null;this.render();}}
    }
    draw(canvas,row,bin,ymax,width,metrics) {
      const height=row.height-1,dpr=window.devicePixelRatio||1,w=Math.round(width*dpr),h=Math.round(height*dpr);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,width,height);
      const range=this.range,span=range.end-range.start;
      const x=t=>(t-range.start)*width/span;
      const selection=this.preview||this.view.selectedInterval;
      if(selection && (!selection.unitIds || selection.unitIds.includes(row.id))){
        const left=x(selection.start),width=x(selection.end)-left;
        ctx.fillStyle="rgba(144,117,208,.19)";ctx.fillRect(left,0,width,height);
        if(this.preview && this.drag?.mode==="zoom"){
          ctx.strokeStyle=this.palette.active;ctx.setLineDash([3,3]);ctx.strokeRect(left,.5,width,height-1);ctx.setLineDash([]);
        }
      }
      const cursor=x(this.view.cursorTime);
      ctx.fillStyle="rgb(210,142,60)";if(cursor>=0&&cursor<=width)ctx.fillRect(Math.floor(cursor),0,1,height);
      if(!metrics){canvas.setAttribute("aria-label","Unit "+row.id+" · "+(this.problem||label("loading")));return;}
      const color=canvas.closest(".sw-active")?this.palette.active:canvas.closest(".sw-extra")?this.palette.reference:this.palette.trace;
      const top=4,rasterBottom=Math.round(height*.4),bottom=height-5,graphTop=rasterBottom+5;
      const spikes=this.trains.get(row.id).spikes, first=lower(spikes,range.start),last=lower(spikes,range.end);
      ctx.fillStyle=color;
      if(last-first<=width*.8){
        for(let j=first;j<last;j++)ctx.fillRect(Math.floor(x(spikes[j])),top,1,rasterBottom-top);
      }else{
        const pixels=new Uint32Array(Math.max(1,Math.ceil(width)));
        let high=1;
        for(let i=first;i<last;i++){const p=clamp(Math.floor(x(spikes[i])),0,pixels.length-1);high=Math.max(high,++pixels[p]);}
        for(let p=0;p<pixels.length;p++)if(pixels[p]){ctx.globalAlpha=.25+.75*Math.sqrt(pixels[p]/high);ctx.fillRect(p,top,1,rasterBottom-top);}
        ctx.globalAlpha=1;
      }
      ctx.fillStyle=this.palette.grid;ctx.fillRect(0,rasterBottom+1,width,1);
      ctx.strokeStyle=color;ctx.lineWidth=1.35;ctx.beginPath();
      let previous=null;
      for(let j=0;j<metrics.rates.length;j++){
        const value=metrics.rates[j],l=x(edge(metrics.first+j,bin)),r=x(edge(metrics.first+j+1,bin));
        if(value==null){
          if(value===null){ctx.fillStyle=this.palette.grid;ctx.fillRect(l,graphTop,r-l,bottom-graphTop);}
          previous=null;continue;
        }
        const y=bottom-(bottom-graphTop)*value/ymax;
        if(previous==null)ctx.moveTo(l,y);else ctx.lineTo(l,y);
        ctx.lineTo(r,y);previous=value;
      }
      ctx.stroke();
      canvas.setAttribute("aria-label","Unit "+row.id+" · "+(metrics.count==null?label("loading"):metrics.count+" spikes")+" · 0–"+ymax+" Hz");
    }
    paintAxis(range,bin,ymax) {
      const span=range.end-range.start,duration=this.data.duration;
      this.rangeText.textContent=seconds(range.start)+"–"+seconds(range.end)+" s";
      this.scaleText.textContent="Δ "+seconds(span)+" s"+(ymax!=null?"  ·  0–"+ymax+" Hz":"")+"  ·  "+seconds(bin)+" s/"+label("bins");
      this.totalText.textContent=label("whole")+" "+seconds(duration)+" s";
      this.measure.hidden=!this.view.selectedInterval;
      const selection=(this.drag?.mode==="zoom"?null:this.preview)||this.view.selectedInterval;
      if(selection){
        this.measure.hidden=false;
        const text=this.measure.querySelector("span"),ids=selection.unitIds;
        const scope=ids?.length?"Unit "+ids.join(", ")+" · ":label("selection")+" ";
        text.textContent=scope+seconds(selection.start)+"–"+seconds(selection.end)+" s";text.title=text.textContent;
      }
      this.root.querySelector("[data-sw-pattern]").hidden=!this.options.onPatternQuery;
      for(const control of [this.axis,this.track]){
        control.setAttribute("aria-valuemin","0");control.setAttribute("aria-valuemax",String(duration));
        control.setAttribute("aria-valuenow",String((range.start+range.end)/2));control.setAttribute("aria-valuetext",this.rangeText.textContent);
      }
      const width=this.track.clientWidth;
      const thumbWidth=Math.min(width,Math.max(24,width*span/duration));
      this.thumb.style.width=thumbWidth+"px";
      const frac=duration>span?range.start/(duration-span):0;
      this.thumb.style.left=(frac*(width-thumbWidth))+"px";
      const key=range.start+"/"+range.end+"/"+this.axis.clientWidth;
      if(this.axisKey!==key){
        this.axisKey=key;this.axis.replaceChildren();
        const textSize = parseFloat(getComputedStyle(this.axis).fontSize);
        const n=clamp(Math.floor(this.axis.clientWidth/(textSize*8)),1,8);
        for(let i=0;i<=n;i++)this.axis.append(element("span","",seconds(range.start+span*i/n)));
      }
    }
    paintLabels(range) {
      const width=this.markerArea.clientWidth,key=[this.labelRevision,range.start,range.end,width].join("/");
      if(this.markerKey===key)return;
      this.markerKey=key;this.markerArea.replaceChildren();
      const span=range.end-range.start, seen=new Set();
      for(const item of this.labels){
        if(item.start>=range.end||(item.point?item.start<range.start:item.end<=range.start))continue;
        const left=clamp((item.start-range.start)/span,0,1);
        const pixel=Math.floor(left*width);
        if(this.recorded&&seen.has(pixel))continue;
        seen.add(pixel);
        const b=button("sw-marker",item.point?"":item.label);b.style.left=(left*100)+"%";
        const right=clamp((item.end-range.start)/span,0,1);
        b.style.width=item.point?"3px":(right-left)*100+"%";
        b.style.setProperty("--marker",item.color||"var(--accent)");
        b.title=(item.label||"—")+" · "+seconds(item.start)+" s"+(item.sourceTable?" · "+item.sourceTable+" #"+item.sourceId:"");
        b.setAttribute("aria-label",b.title);b.onclick=()=>this.options.selectLabel?.(item,this.recorded?"experiment":"annotation");
        this.markerArea.append(b);
      }
    }
    get palette() {
      if(!this.colors){
        const style=getComputedStyle(this.root);
        this.colors={active:style.getPropertyValue("--accent").trim()||"#9bc4ee",reference:style.getPropertyValue("--text").trim()||"#cbd3da",trace:style.getPropertyValue("--text-soft").trim()||"#6fa9b4",grid:style.getPropertyValue("--line-soft").trim()||"#506071"};
      }
      return this.colors;
    }
    updateWindow(center,span) {this.options.setView({visibleRange:timeWindow(center,span,this.data.duration)});}
    xTime(x,node,range) {
      const rect=node.getBoundingClientRect();
      return range.start+clamp((x-rect.left)/Math.max(1,rect.width),0,1)*(range.end-range.start);
    }
    showTip(e) {
      const canvas=e.target.closest(".sw-plot");
      this.tip.hidden=true;
      this.hover=canvas && e.pointerType!=="touch"?{target:canvas,clientX:e.clientX,clientY:e.clientY,pointerType:e.pointerType}:null;
      if(!canvas || e.pointerType==="touch" || !this.data || !this.range)return;
      const range=this.view.visibleRange;
      if(range.start!==this.range.start || range.end!==this.range.end)return;
      const id=Number(canvas.closest("[data-unit]").dataset.unit),entry=this.trains.get(id);
      if(!entry)return;
      const train=entry.spikes;
      const rect=canvas.getBoundingClientRect(),time=this.xTime(e.clientX,canvas,range);
      if(time<entry.start||time>=entry.end)return;
      let detail;
      if(e.clientY-rect.top<=rect.height*.4+1){
        const index=lower(train,time);
        const closest=[train[index-1],train[index]].filter(t=>t>=range.start && t<range.end)
          .sort((a,b)=>Math.abs(time-a)-Math.abs(time-b))[0];
        if(closest==null || Math.abs(time-closest)>7*(range.end-range.start)/Math.max(1,rect.width))return;
        detail="spike  "+closest+" s";
      }else{
        const bin=binSize(range.end-range.start,this.markerArea.clientWidth);
        let index=Math.floor(time/bin);
        if(time>=edge(index+1,bin))index++;
        const left=edge(index,bin),right=Math.min(this.data.duration,edge(index+1,bin));
        if(left>=right||left<entry.start||right>entry.end)return;
        const coverage=this.coverage.get(id),observed=!coverage||coverage.some(pair=>pair[0]<=left&&pair[1]>=right);
        const count=lower(train,right)-lower(train,left);
        const spikeLabel=count===1?"spike":label("count");
        detail="["+left+", "+right+") s  ·  "+(observed?count+" "+spikeLabel+"  ·  "+Number((count/(right-left)).toPrecision(8))+" Hz":label("gap"));
      }
      const tip=this.tip,box=this.root.getBoundingClientRect();
      tip.textContent="Unit "+id+"  ·  "+detail;tip.hidden=false;
      tip.style.left=clamp(e.clientX-box.left+12,0,Math.max(0,box.width-tip.offsetWidth))+"px";
      const y=e.clientY-box.top;
      tip.style.top=(y+12+tip.offsetHeight<box.height?y+12:Math.max(0,y-tip.offsetHeight-10))+"px";
    }
    tool(action) {
      if(modes.includes(action)){
        this.mode=action;this.root.dataset.swMode=action;
        for(const btn of this.toolbar.querySelectorAll("[aria-pressed]"))btn.setAttribute("aria-pressed",String(btn.dataset.swTool===action));
      }else if(action==="home"){
        if(this.data)this.run(()=>this.updateWindow(this.data.duration/2,this.data.duration));
      }else if((action==="undo" || action==="redo") && this.history){
        this.finishCheckpoint();
        const h=this.history, next=h.position+(action==="undo"?-1:1);
        if(!h.ranges[next])return;
        this.merge=null; h.position=next;
        this.options.setView({visibleRange:{...h.ranges[next]}});
        this.historyChanged();
      }
    }
    panByFraction(fraction){
      if(!this.data || !this.range)return;
      const {start,end}=this.view.visibleRange,span=end-start;
      this.run(()=>this.updateWindow((start+end)/2+span*fraction,span),"key-pan-"+Math.sign(fraction));
    }
    pointerDown(e) {
      if(e.button!==0||!e.isPrimary)return;
      this.blockedClickNode=null;
      if(!this.data||!this.range)return;
      const node=e.target.closest(".sw-name,.sw-plot,.sw-axis,.sw-track");
      if(!node)return;
      const kind=node===this.track?"global":node===this.axis?"axis":node.matches(".sw-plot")?"plot":"name";
      if(kind==="plot")this.viewport.focus({preventScroll:true});
      const range={...this.range},span=range.end-range.start;
      this.finishCheckpoint();this.hover=null;this.tip.hidden=true;
      this.drag={kind,mode:this.mode,before:this.snapshot(),node,startX:e.clientX,startY:e.clientY,range,span,id:e.pointerId,thumb:e.target===this.thumb,
        startT:this.xTime(e.clientX,node,kind==="global"?{start:0,end:this.data.duration}:range),moved:false,extra:e.ctrlKey||e.metaKey};
      if(kind==="plot" && this.mode==="measure"){
        const id=Number(node.closest("[data-unit]").dataset.unit),selected=this.selectedUnits();
        this.drag.unitIds=selected.includes(id)?selected:[id];
      }
      if(e.pointerType==="mouse")node.setPointerCapture(e.pointerId);
    }
    pointerMove(e) {
      const d=this.drag;if(!d){this.showTip(e);return;}if(d.id!==e.pointerId||d.vertical)return;
      const dx=e.clientX-d.startX,dy=e.clientY-d.startY;
      if(!d.moved&&Math.abs(dy)>6&&Math.abs(dy)>Math.abs(dx)){d.vertical=true;return;}
      if(!d.moved && Math.abs(dx)<5)return;
      d.moved=true;
      if(!d.node.hasPointerCapture(e.pointerId))d.node.setPointerCapture(e.pointerId);
      if(d.kind==="plot" && d.mode!=="pan"){
        const t=this.xTime(e.clientX,d.node,d.range);
        this.preview={start:Math.min(d.startT,t),end:Math.max(d.startT,t),unitIds:d.unitIds};this.render();return;
      }
      const width=Math.max(1,this.markerArea.clientWidth);
      const center=(d.range.start+d.range.end)/2;
      if(d.kind==="global"){
        const travel=Math.max(1,this.track.clientWidth-this.thumb.offsetWidth);
        const t=d.thumb?center+dx*(this.data.duration-d.span)/travel:this.xTime(e.clientX,this.track,{start:0,end:this.data.duration});
        this.updateWindow(t,d.span);
      }else this.updateWindow(center-dx*d.span/width,d.span);
    }
    pointerUp(e) {
      const d=this.drag;if(!d || d.id!==e.pointerId)return;
      this.drag=null;
      if(d.vertical){this.blockedClickNode=d.node;return;}
      if(d.moved){
        this.blockedClickNode=d.node;
        if(d.kind==="plot"&&this.preview){
          const range=this.preview;this.preview=null;
          if(range.end>range.start && d.mode==="zoom"){
            this.updateWindow((range.start+range.end)/2,range.end-range.start);
          }else if(range.end>range.start){
            this.options.setView({selectedInterval:range});
          }
          this.render();
        }
        this.record(d.before);return;
      }
      if(d.kind==="axis"||d.kind==="global"){
        const range=timeWindow(d.startT,DEFAULT_SPAN,this.data.duration);
        this.options.setView({visibleRange:range,cursorTime:d.startT},{seekVideo:true});
      }else if(d.kind==="plot"){
        if(this.options.onPickUnits)this.choose(Number(d.node.closest('[data-unit]').dataset.unit));
        else this.options.setView({cursorTime:d.startT},{seekVideo:true});
      }
      if(d.kind!=="name")this.record(d.before);
    }
    cancelDrag() {
      const d=this.drag;
      this.drag=null;this.preview=null;
      if(d?.node.hasPointerCapture(d.id))d.node.releasePointerCapture(d.id);
      if(d?.moved && (d.kind!=="plot" || d.mode==="pan"))this.options.setView({visibleRange:d.range});
      if(d)this.blockedClickNode=d.node;
      this.render();
    }
    click(e) {
      if(e.detail>0 && this.blockedClickNode?.contains(e.target)){this.blockedClickNode=null;return;}
      const b=e.target.closest("button");
      if(!b)return;
      if(b.dataset.swTool){this.tool(b.dataset.swTool);return;}
      if(b.dataset.swGroup!=null){this.run(()=>this.toggleGroup(b.dataset.swGroup));return;}
      const id=Number(b.closest("[data-unit]")?.dataset.unit);
      if(b.matches(".sw-name"))this.run(()=>this.choose(id,e.ctrlKey||e.metaKey));
      else if(b.hasAttribute("data-sw-clear"))this.run(()=>this.options.setView({selectedInterval:null}));
      else if(b.hasAttribute("data-sw-fit")&&this.view.selectedInterval){const s=this.view.selectedInterval;this.run(()=>this.updateWindow((s.start+s.end)/2,s.end-s.start));}
      else if(b.hasAttribute("data-sw-pattern")&&this.view.selectedInterval){
        const {start,end,unitIds}=this.view.selectedInterval;
        this.options.onPatternQuery?.({start,end},unitIds||this.selectedUnits());
      }
    }
    wheel(e) {
      if(!this.data||!this.range)return;
      const r=this.view.visibleRange,span=r.end-r.start;
      const overRuler=this.axis.contains(e.target);
      if(e.ctrlKey||e.metaKey || ((this.mode==="zoom" || overRuler) && !e.shiftKey && Math.abs(e.deltaY)>Math.abs(e.deltaX))){
        e.preventDefault();const target=e.target.closest(".sw-plot,.sw-axis")||this.markerArea;
        const t=this.xTime(e.clientX,target,r),frac=(t-r.start)/span;
        const next=clamp(span*Math.exp(clamp(e.deltaY*.012,-1,1)),Math.min(.01,this.data.duration),this.data.duration);
        this.run(()=>this.updateWindow(t+(.5-frac)*next,next),"wheel-zoom");
      }else if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)){
        e.preventDefault();const delta=e.deltaX||e.deltaY;
        this.run(()=>this.updateWindow((r.start+r.end)/2+delta*span/Math.max(1,this.markerArea.clientWidth),span),"wheel-pan");
      }
    }
    key(e) {
      if(!this.range||!this.data)return;
      if(!e.repeat)this.merge=null;
      const r=this.view.visibleRange,span=r.end-r.start,mid=(r.start+r.end)/2;
      if((e.ctrlKey||e.metaKey) && !e.altKey && ["z","y"].includes(e.key.toLowerCase())){
        if(e.key.toLowerCase()==="y"||e.shiftKey)this.redo();else this.undo();
      }else if(e.key==="Escape"){
        if(this.drag)this.cancelDrag();
        else if(!this.tip.hidden){this.hover=null;this.tip.hidden=true;}
        else if(this.mode!==(this.options.onPickUnits?"pan":"measure"))this.tool(this.options.onPickUnits?"pan":"measure");
        else if(this.view.selectedInterval)this.run(()=>this.options.setView({selectedInterval:null}));
        else if(this.selectedUnits().length)this.run(()=>this.choose(this.selectedUnits().at(-1),true));else return;
      }else if(["+","=","-"].includes(e.key))this.run(()=>this.updateWindow(mid,span*(e.key==="-"?2:.5)),"key-"+e.key);
      else if(e.target===this.axis||e.target===this.track){
        if(e.key==="Home")this.run(()=>this.updateWindow(0,span));
        else if(e.key==="End")this.run(()=>this.updateWindow(this.data.duration,span));
        else if(["ArrowLeft","ArrowRight","PageUp","PageDown"].includes(e.key))this.run(()=>this.updateWindow(mid+span*({ArrowLeft:-.1,ArrowRight:.1,PageUp:-1,PageDown:1})[e.key],span),"key-"+e.key);
        else return;
      }else return;
      e.preventDefault();e.stopPropagation();
    }
    destroy() {
      this.abortRead();this.observer.disconnect();clearTimeout(this.motionTimer);clearTimeout(this.commitTimer);
      if(this.frame!=null)cancelAnimationFrame(this.frame);
      if(this.options.onPickUnits)this.root.remove();
    }
  }
  return {SignalWorkspace,timeWindow,binSize,ratesFor};
});
