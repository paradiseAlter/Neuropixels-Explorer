// SPDX-License-Identifier: MIT
(() => {
  const words={
    en:['Box','Lasso','Fit','Enlarge','Reduce','Selected','Wheel to zoom. In Box or Lasso, Shift-drag to pan and Ctrl-drag to add Units.','Choose a Unit at this position','Select Units on the probe','Click empty space to clear','Pan','Zoom','Drag to move the zoomed map','Click to zoom in, Shift-click to zoom out, or drag a box to zoom into it'],
    'zh-CN':['框选','圈选','全图','放大图','收回','已选','滚轮缩放。框选或圈选时，Shift 拖动平移，Ctrl 拖动追加 Unit。','选择此位置的 Unit','在探针图上选择 Unit','单击图中空白处清空','平移','缩放','拖动平移放大后的探针图','单击放大，Shift 单击缩小，也可拖框放大到框内区域'],
    es:['Rectángulo','Lazo','Ajustar','Ampliar','Reducir','Selección','Rueda para ampliar. En Rectángulo o Lazo, Mayús y arrastrar para desplazar y Ctrl para añadir.','Elegir una unidad en esta posición','Seleccionar unidades en la sonda','Pulsa en el espacio vacío para borrar','Desplazar','Zoom','Arrastra para desplazar el mapa ampliado','Haz clic para acercar, Mayús-clic para alejar o arrastra un rectángulo para ampliarlo']
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  class ProbeMap {
    constructor(host,onUnit,onNearby){
      this.host=host;this.onUnit=onUnit;this.onNearby=onNearby;this.mode='box';this.byProbe=new Map();this.views=new Map();
    }
    get labels(){return words[document.documentElement.lang] || words.en;}
    setProject(id){
      if(this.project===id)return;
      this.project=id;this.byProbe.clear();this.views.clear();this.recording=null;
    }
    selectedRefs(){
      return Array.from(this.byProbe,([recordingKey,ids])=>Array.from(ids,unitId=>({recordingKey,unitId}))).flat();
    }
    ref(id){return this.recording?.jointUnits?.get(id) || {recordingKey:this.recording.key,unitId:id};}
    pick(ids,{append=false,point=false,clear=false}={}){
      if(!this.recording || (!ids.length&&!clear))return;
      if(clear)this.byProbe.clear();
      else {
        const refs=ids.map(id=>this.ref(id));
        if(!append&&!point){
          const visibleKeys=this.recording.jointUnits?new Set(Array.from(this.recording.jointUnits.values(),u=>u.recordingKey)):[this.recording.key];
          for(const key of visibleKeys)this.byProbe.delete(key);
        }
        for(const ref of refs){
          if(!this.byProbe.has(ref.recordingKey))this.byProbe.set(ref.recordingKey,new Set());
          this.byProbe.get(ref.recordingKey).add(ref.unitId);
        }
      }
      this.styleSelection();
      if(clear)this.onUnit(null);
      else if(point && ids.length===1)this.onUnit(ids[0]);
      this.host.dispatchEvent(new CustomEvent('probe-selection-change',{bubbles:true,detail:this.selectedRefs()}));
    }
    markup(){
      const t=this.labels;
      return '<div class="probe-map-tools"><div role="group" aria-label="'+t[8]+'">'+
        ['box','lasso'].map((v,i)=>'<button type="button" data-probe-shape="'+v+'" aria-pressed="'+(this.mode===v)+'">'+t[i]+'</button>').join('')+
        '</div><label class="probe-zoom-field"><input type="number" data-probe-zoom min="100" max="4800" step="10" value="100" aria-label="'+(['zh-CN','es'].includes(document.documentElement.lang)?(document.documentElement.lang==='es'?'Zoom de sonda':'探针图缩放'):'Probe zoom')+'">%</label><button type="button" data-probe-wide aria-pressed="'+!!this.wide+'">'+t[this.wide?4:3]+'</button>'+
        '<div class="probe-navigation">'+['pan','zoom'].map((v,i)=>'<button type="button" data-probe-shape="'+v+'" aria-pressed="'+(this.mode===v)+'" title="'+t[12+i]+'">'+t[10+i]+'</button>').join('')+'</div></div>'+
        '<div class="probe-map-frame"><svg class="probe-position-map" role="group" tabindex="0" aria-label="'+t[8]+'" aria-description="'+t[6]+' '+t[9]+'"></svg><output class="probe-map-tip" hidden></output><div class="probe-overlaps" hidden></div></div><output class="probe-pick-count" aria-live="polite"></output>';
    }
    draw(recording,units){
      const located=units.filter(u=>Number.isFinite(u.depthUm)),selected=null;
      this.host.innerHTML=this.markup();
      const map=this.host.querySelector('.probe-position-map');
        const shanks = [...new Set(located.map(u => u.shankId))].sort((a,b) => a-b);
        const min = Math.min(...located.map(u => u.depthUm)), max = Math.max(...located.map(u => u.depthUm));
        const regions = [...new Set(located.map(u => u.region))], colors = ["#71b7d3","#bd9bdd","#dbb579","#8ebd91","#d88d9e","#9cacc9"];
        const color = u => /^#?[a-f\d]{6}$/i.test(u.regionColor) ? "#"+u.regionColor.replace("#", "") : colors[regions.indexOf(u.region)%colors.length];
        const lanes=new Map(shanks.map((key,i)=>[key,{cx:.18+(i+.5)*.74/shanks.length,min:Infinity,max:-Infinity}]));
        for(const u of located)if(Number.isFinite(u.x)){
          const lane=lanes.get(u.shankId);lane.min=Math.min(lane.min,u.x);lane.max=Math.max(lane.max,u.x);
        }
        const positions=located.map(unit=>{
          const lane=lanes.get(unit.shankId);
          const dx=Number.isFinite(unit.x)&&lane.max>lane.min ? ((unit.x-lane.min)/(lane.max-lane.min)-.5)*.56/shanks.length : 0;
          return {unit,x:lane.cx+dx,y:max===min?.51:.90-(unit.depthUm-min)/(max-min)*.78};
        });
          const lanesMarkup=shanks.map(s=>{
            const cx=lanes.get(s).cx,first=located.find(u=>u.shankId===s),ref=recording?.jointUnits?.get(first.id);
            const label=ref?[(ref.probeName||ref.recordingKey),ref.shankId!=null?'S'+(ref.shankId+1):''].filter(Boolean).join(' '):'S'+(s==null?'?':s+1);
            return `<line data-shaft-x="${cx}" y1="7%" y2="95%" class="probe-shaft"/><text data-shaft-x="${cx}" y="2%" dominant-baseline="hanging" text-anchor="middle">${esc(label)}</text>`;
          }).join('');
          map.innerHTML=lanesMarkup+'<text x="3" y="12%" data-depth-tick=".12"></text><text x="3" y="90%" data-depth-tick=".9"></text><text x="3" y="98%">µm</text>'+
            located.map((u,i)=>`<circle r="3" fill="${color(u)}" data-source="${u.sourceIndex}" data-probe-unit="${u.id}" ${window.NeuropixelsUnitMarks?.attrs(recording,u.id)||''} tabindex="${u.id===selected||selected==null&&i===0?0:-1}" role="button" aria-label="${esc((recording.jointUnits?.get(u.id)?.probeName || '')+' Unit '+(recording.jointUnits?.get(u.id)?.unitId ?? u.id))}, ${esc(u.region)}, ${u.depthUm} µm" class="${u.id===selected?"selected":""}"><title>${esc((recording.jointUnits?.get(u.id)?.probeName || '')+' Unit '+(recording.jointUnits?.get(u.id)?.unitId ?? u.id))} · ${esc(u.region)} · ${u.depthUm} µm</title></circle>`).join('')+
            '<polyline data-brush-outline fill-rule="evenodd" visibility="hidden"/>';
      this.mount(recording,positions,{min,max});
      map.addEventListener('keydown',e=>{
        if(['Enter',' '].includes(e.key) && e.target.matches('[data-probe-unit]')){
          e.preventDefault();this.pick([Number(e.target.dataset.probeUnit)],{point:true});
        }
      });
    }
    mount(recording,positions,geometry){
      this.recording=recording;this.points=positions;this.limits=geometry;
      const svg=this.svg=this.host.querySelector('.probe-position-map');
      if(!svg)return;
      this.hovered=null;this.drag=null;this.tip=this.host.querySelector('.probe-map-tip');this.overlaps=this.host.querySelector('.probe-overlaps');
      if(!this.views.has(recording.key))this.views.set(recording.key,{scale:1,left:0,top:0});
      this.view=this.views.get(recording.key);this.pointNodes=new Map(Array.from(svg.querySelectorAll('circle'),c=>[Number(c.dataset.probeUnit),c]));
      this.shape=svg.querySelector('[data-brush-outline]');
      svg.dataset.mode=this.mode;
      const modes=this.host.querySelectorAll('[data-probe-shape]');
      modes.forEach(b=>b.onclick=()=>{
        this.mode=svg.dataset.mode=b.dataset.probeShape;
        for(const el of modes)el.setAttribute('aria-pressed',String(el===b));
      });
      const zoom=this.host.querySelector('[data-probe-zoom]');
      zoom.oninput=()=>{if(zoom.validity.rangeOverflow||zoom.validity.rangeUnderflow||!Number.isFinite(zoom.valueAsNumber))return;this.zoom(.5,.5,zoom.valueAsNumber/100/this.view.scale);};
      zoom.onchange=()=>{zoom.value=Math.round(100*this.view.scale);};
      this.host.querySelector('[data-probe-wide]').onclick=e=>{
        const frame=this.host.parentElement;
        if(!this.wide){this.previousSize=[frame.style.width,frame.style.height];frame.style.width='100%';frame.style.height='max(65vh,18rem)';}
        else [frame.style.width,frame.style.height]=this.previousSize;
        this.wide=!this.wide;
        e.currentTarget.setAttribute('aria-pressed',String(this.wide));e.currentTarget.textContent=this.labels[this.wide?4:3];
      };
      const pos=e=>{const r=svg.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top,w:r.width,h:r.height};};
      svg.oncontextmenu=e=>{
        const point=pos(e),hits=this.closest(point),marks=window.NeuropixelsUnitMarks;
        if(!marks || !hits.length)return;
        if(hits.length===1){
          if(marks.popup(e,marks.ref(this.recording,hits[0].unit.id)))e.stopPropagation();
        }else{
          e.preventDefault();e.stopPropagation();
          this.openOverlaps(hits,point,(click,id)=>marks.popup(click,marks.ref(this.recording,id)));
        }
      };
      svg.onwheel=e=>{
        e.preventDefault();if(this.drag)return;
        const p=pos(e);this.zoom(p.x/p.w,p.y/p.h,Math.exp(-clamp(e.deltaY,-240,240)*.006));
      };
      svg.onpointerdown=e=>{
        if((e.button!==0&&e.button!==1) || this.drag || !e.isPrimary)return;
        e.preventDefault();this.shape.setAttribute('visibility','hidden');this.overlaps.hidden=true;this.tip.hidden=true;svg.focus({preventScroll:true});
        const p=pos(e);
        const pan=this.mode==='pan'||e.altKey||e.button===1||(e.shiftKey && this.mode!=='zoom');
        this.drag={id:e.pointerId,a:p,path:[p],moved:false,pan,append:e.ctrlKey||e.metaKey,left:this.view.left,top:this.view.top};
        svg.toggleAttribute('data-panning',pan);
        svg.setPointerCapture(e.pointerId);
      };
      svg.onpointermove=e=>{
        const p=pos(e),d=this.drag;
        if(!d){this.hover(p);return;}
        if(e.pointerId!==d.id)return;
        if(!d.moved && Math.hypot(p.x-d.a.x,p.y-d.a.y)<4)return;
        d.moved=true;
        if(d.pan){
          this.view.left=d.left-(p.x-d.a.x)/p.w/this.view.scale;this.view.top=d.top-(p.y-d.a.y)/p.h/this.view.scale;this.layout();return;
        }
        if(this.mode==='lasso'){
          const samples=e.getCoalescedEvents?.()||[];
          if(samples.length)d.path.push(...samples.map(pos));
          d.path.push(p);
        }
        const outline=this.mode==='lasso'?d.path:[d.a,{x:p.x,y:d.a.y},p,{x:d.a.x,y:p.y},d.a];
        this.shape.setAttribute('points',outline.map(q=>q.x+','+q.y).join(' '));this.shape.removeAttribute('visibility');
      };
      svg.onpointerup=e=>{
        const d=this.drag;if(d?.id!==e.pointerId)return;const p=pos(e);
        this.endDrag(false);
        if(d.pan)return;
        if(this.mode==='zoom'){
          if(d.moved){
            const width=Math.max(1,Math.abs(p.x-d.a.x)),height=Math.max(1,Math.abs(p.y-d.a.y));
            this.zoom((p.x+d.a.x)/(2*p.w),(p.y+d.a.y)/(2*p.h),Math.min(p.w/width,p.h/height),.5,.5);
          }else this.zoom(p.x/p.w,p.y/p.h,e.shiftKey ? .5 : 2);
          return;
        }
        if(d.moved || Math.hypot(p.x-d.a.x,p.y-d.a.y)>=4){
          if(this.mode==='lasso'){
            // SVG fill hit-testing implicitly closes the open stroke.
            this.shape.setAttribute('points',[...d.path,p].map(q=>q.x+','+q.y).join(' '));
          }
          const pts=this.points.filter(u=>{
            const x=u.sx*p.w,y=u.sy*p.h;
            return this.mode==='lasso'?this.shape.isPointInFill(new DOMPoint(x,y)):
              x>=Math.min(d.a.x,p.x)&&x<=Math.max(d.a.x,p.x)&&y>=Math.min(d.a.y,p.y)&&y<=Math.max(d.a.y,p.y);
          });
          this.pick(pts.map(u=>u.unit.id),{append:d.append});return;
        }
        const hits=this.closest(p);
        if(hits.length>1){this.openOverlaps(hits,p);return;}
        if(hits.length)this.pick([hits[0].unit.id],{point:true});
        else this.pick([],{clear:true});
      };
      svg.onpointercancel=svg.onlostpointercapture=e=>{if(e.pointerId===this.drag?.id)this.endDrag(true);};
      svg.onpointerleave=()=>{if(!this.drag)this.clearHover();};
      svg.onkeydown=e=>{
        if(e.key==='Escape'&&(this.drag||!this.overlaps.hidden)){e.preventDefault();e.stopPropagation();this.endDrag(true);this.overlaps.hidden=true;}
      };
      this.overlaps.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.overlaps.hidden=true;svg.focus();}};
      this.layout();this.styleSelection();
    }
    endDrag(cancel){
      const d=this.drag;if(!d)return;
      this.drag=null;this.shape.setAttribute('visibility','hidden');
      this.svg.removeAttribute('data-panning');
      if(this.svg.hasPointerCapture(d.id))this.svg.releasePointerCapture(d.id);
      if(cancel&&d.pan){Object.assign(this.view,{left:d.left,top:d.top});this.layout();}
    }
    zoom(x,y,ratio,targetX=x,targetY=y){
      const v=this.view,newScale=clamp(v.scale*ratio,1,48);
      v.left+=x/v.scale-targetX/newScale;v.top+=y/v.scale-targetY/newScale;v.scale=newScale;
      this.layout();
    }
    layout(){
      const v=this.view,s=v.scale;v.left=clamp(v.left,0,1-1/s);v.top=clamp(v.top,0,1-1/s);
      this.clearHover();this.overlaps.hidden=true;
      for(const p of this.points){
        p.sx=(p.x-v.left)*s;p.sy=(p.y-v.top)*s;
        const c=this.pointNodes.get(p.unit.id);c.setAttribute('cx',100*p.sx+'%');c.setAttribute('cy',100*p.sy+'%');
      }
      for(const el of this.svg.querySelectorAll('[data-shaft-x]')){
        const x=100*(Number(el.dataset.shaftX)-v.left)*s+'%';
        if(el.tagName.toLowerCase()==='line'){el.setAttribute('x1',x);el.setAttribute('x2',x);}else el.setAttribute('x',x);
      }
      for(const label of this.svg.querySelectorAll('[data-depth-tick]')){
        const y=v.top+Number(label.dataset.depthTick)/s;
        const {min,max}=this.limits;label.textContent=Math.round(max-(y-.12)/.78*(max-min));
      }
      this.host.querySelector('[data-probe-zoom]').value=Math.round(s*100);
    }
    closest(p){
      let best=81,matches=[];
      for(const u of this.points){
        if(u.sx<0||u.sx>1||u.sy<0||u.sy>1)continue;
        const d=(u.sx*p.w-p.x)**2+(u.sy*p.h-p.y)**2;
        if(d<best-1e-5){best=d;matches=[u];}
        else if(matches.length&&Math.abs(d-best)<1e-5)matches.push(u);
      }
      return matches;
    }
    clearHover(){this.hovered?.classList.remove('probe-hovered');this.hovered=null;this.tip.hidden=true;}
    hover(p){
      if(!this.overlaps.hidden)return;
      const hits=this.closest(p),first=hits[0];
      if(!first){this.clearHover();return;}
      const u=first.unit,node=this.pointNodes.get(u.id),ref=this.ref(u.id);
      if(this.hovered!==node){
        this.clearHover();this.hovered=node;node.classList.add('probe-hovered');
        window.NeuropixelsUnitMarks?.bind(this.tip,this.recording,u.id);
        this.tip.textContent=(ref.probeName||this.recording.name||ref.recordingKey)+' · Unit '+ref.unitId+' · '+u.depthUm+' µm'+(hits.length>1?' (+'+(hits.length-1)+')':'');
        const distance=q=>(q.sx*p.w-p.x)**2+(q.sy*p.h-p.y)**2;
        this.onNearby?.([...this.points].sort((a,b)=>distance(a)-distance(b)).slice(0,5).map(q=>q.unit));
      }
      this.tip.hidden=false;this.popupPosition(this.tip,p);
    }
    popupPosition(el,p){
      el.style.left=clamp(p.x+10,2,Math.max(2,p.w-el.offsetWidth-2))+'px';
      el.style.top=(p.y+14+el.offsetHeight<p.h?p.y+14:Math.max(2,p.y-el.offsetHeight-8))+'px';
    }
    openOverlaps(hits,p,onPick){
      const box=this.overlaps;box.replaceChildren();this.clearHover();
      const title=document.createElement('strong');title.textContent=this.labels[7];box.append(title);
      for(const hit of hits){
        const ref=this.ref(hit.unit.id),b=document.createElement('button');
        window.NeuropixelsUnitMarks?.bind(b,this.recording,hit.unit.id);
        b.type='button';b.textContent='Unit '+ref.unitId;
        b.onclick=e=>{box.hidden=true;if(onPick)onPick(e,hit.unit.id);else this.pick([hit.unit.id],{point:true});};
        box.append(b);
      }
      box.hidden=false;this.popupPosition(box,p);box.querySelector('button').focus({preventScroll:true});
    }
    styleSelection(){
      if(!this.svg?.isConnected)return;
      let lastPicked;
      for(const [id,c] of this.pointNodes){
        const r=this.ref(id),picked=this.byProbe.get(r.recordingKey)?.has(r.unitId)||false;
        c.classList.toggle('probe-picked',picked);c.setAttribute('aria-pressed',String(picked));
        if(picked)lastPicked=c;
      }
      const n=this.selectedRefs().length;
      this.svg.classList.toggle('contains-picks',!!lastPicked);
      const count=this.host.querySelector('.probe-pick-count');
      count.textContent=n?this.labels[5]+' · '+n+' Units':'';
      count.title=this.labels[9];
    }
  }
  window.NeuropixelsProbeMap=ProbeMap;
})();
