// SPDX-License-Identifier: MIT
((root,factory)=>{
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.NeuropixelsVideoEventTimeline=api.VideoEventTimeline;
})(globalThis,()=>{
  'use strict';
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const words={
    events:['Event markers','事件标记','Marcas de eventos'],video:['Video','视频','Vídeo'],recording:['Recording','录制','Registro'],
    zoomIn:['Zoom in','放大事件条','Ampliar'],zoomOut:['Zoom out','缩小事件条','Reducir'],
    all:['Full duration','全程','Duración completa'],hint:['Wheel to zoom · hold Shift and scroll or drag with the left button to pan','滚轮缩放 · 按住 Shift 滚动或按住左键拖动可平移','Rueda para ampliar · mantén Mayús y usa la rueda o arrastra con el botón izquierdo para desplazar'],
    inVideo:['In video','视频内','En el vídeo'],inRecording:['In recording','全记录','En el registro'],
    empty:['No matching events','没有对应事件','Sin eventos coincidentes'],
    remove:['Delete selected events','删除所选事件','Eliminar eventos seleccionados'],undoDelete:['Undo deletion','撤销删除','Deshacer eliminación'],
    pan:['Drag the ruler or Shift+left-drag the event lane to pan','拖动秒刻度，或在事件上按住 Shift＋左键拖动平移','Arrastra la regla o usa Mayús y arrastra con el botón izquierdo en la pista para desplazar'],
    recordedSelection:['Selected recording events','选中的录制事件','Eventos del registro seleccionados'],
    markFirst:['Use Mark to add an event','点「标记」添加事件','Usa Marcar para añadir un evento'],
    alignEvents:['Align the video to see recording events here','对齐视频后可在这里查看录制事件','Alinea el vídeo para ver los eventos del registro']
  };
  function mediaCoverage(video,duration){
    if(!video.source || !video.recording || !(duration>0))return null;
    const anchors=video.mapping.frameClock?.video_s;
    const start=Math.max(0,anchors?.[0]??0),end=Math.min(duration,anchors?.at(-1)??duration);
    if(!(end>start))return null;
    const neuralStart=Math.max(0,video.mapping.videoToNeural(start));
    const neuralEnd=Math.min(video.recording?.duration>0?video.recording.duration:Infinity,video.mapping.videoToNeural(end));
    return neuralEnd>neuralStart?{start:video.mapping.neuralToVideo(neuralStart),end:video.mapping.neuralToVideo(neuralEnd),neuralStart,neuralEnd}:null;
  }
  function projectRows(rows,duration,video){
    const result=[],media=Boolean(video.source),cov=mediaCoverage(video,duration);
    if(!(duration>0))return result;
    for(const row of rows){
      if(media && Number.isFinite(row.videoStart) && Number.isFinite(row.videoEnd)){
        const start=Math.max(0,row.videoStart),end=Math.min(duration,row.videoEnd);
        if(row.point ? start===row.videoStart && end===start : end>start)result.push({row,point:!!row.point,start,end});
        continue;
      }
      if(!Number.isFinite(row.start)||media&&!cov)continue;
      const point=Boolean(row.point)||!Number.isFinite(row.end)||row.end<=row.start;
      const low=media?cov.neuralStart:0,high=media?cov.neuralEnd:duration;
      const start=Math.max(low,row.start),end=point?start:Math.min(high,row.end);
      if(point?(row.start<low||row.start>high):end<=start)continue;
      const a=media?video.mapping.neuralToVideo(start):start,b=media?video.mapping.neuralToVideo(end):end;
      if(Number.isFinite(a)&&Number.isFinite(b))result.push({row,point,start:clamp(a,0,duration),end:clamp(b,0,duration)});
    }
    return result.sort((a,b)=>a.start-b.start||a.end-b.end);
  }
  function near(items,time,tolerance){
    let best=null,distance=Infinity,point=null,pointDistance=Infinity;
    for(const item of items){
      if(item.start>time+tolerance)break;
      const d=Math.max(item.start-time,time-item.end,0);
      if(item.point && d<=tolerance && d<pointDistance){point=item;pointDistance=d;}
      if(d<=tolerance&&(d<distance||d===distance&&(item.end-item.start)<(best.end-best.start))){best=item;distance=d;}
    }
    return point||best;
  }
  function zoomed(range,center,factor,total,minSpan){
    const old=range.end-range.start,size=clamp(old*factor,Math.min(minSpan,total),total);
    const fraction=old>0?clamp((center-range.start)/old,0,1):.5;
    const start=clamp(center-size*fraction,0,total-size);return {start,end:start+size};
  }
  class VideoEventTimeline {
    constructor({overview,detail,video,getView,select,seekNeural,history}){
      Object.assign(this,{overview,detail,video,getView,select,seekNeural,history});
      this.source='annotation';this.rows=[];this.allowed=new Set();this.items=[];this.recordSelected=new Set();
      this.overviewPlot=overview.querySelector('canvas');this.plot=detail.querySelector('[data-event-plot]');
      this.editorStrip=detail.querySelector('#annotation-timeline');this.scale=detail.querySelector('[data-event-scale]');
      this.plot.innerHTML='<canvas tabindex="0" role="slider"></canvas><i aria-hidden="true"></i>';
      this.scale.innerHTML='<span data-event-limits></span><button type="button" data-event-zoom="out" data-help-key="hint.zoomEventsOut">−</button><button type="button" data-event-zoom="in" data-help-key="hint.zoomEventsIn">+</button><button type="button" data-event-zoom="all" data-help-key="hint.allEvents"></button>';
      this.scale.insertAdjacentHTML('beforeend','<button type="button" data-event-delete hidden></button><button type="button" data-event-restore hidden></button><span data-record-selected hidden></span>');
      this.plotCanvas=this.plot.querySelector('canvas');this.line=this.plot.querySelector('i');
      this.summary=detail.querySelector('summary');this.limits=this.scale.querySelector('[data-event-limits]');
      this.dirty=true;this.redraw=true;this.editorDirty=true;this.video.eventTimeline=this;
      detail.addEventListener('toggle',()=>{this.redraw=true;this.editorDirty=true;this.update();});
      detail.addEventListener('click',e=>{
        if(e.target.closest('[data-event-delete]')){this.editor.deleteClips(this.editor.axisSelection());this.editor.strip.focus();return;}
        if(e.target.closest('[data-event-restore]')){this.editor.restoreEdit(false);this.editor.strip.focus();return;}
        const action=e.target.closest('[data-event-zoom]')?.dataset.eventZoom;if(!action)return;
        const r=this.range(),cursor=this.cursor(),center=cursor>=r.start&&cursor<=r.end?cursor:(r.start+r.end)/2;
        this.resize(action==='all'?{start:0,end:this.duration}:zoomed(r,center,action==='in'?.5:2,this.duration,this.minSpan()));
      });
      detail.addEventListener('wheel',e=>{
        const target=e.target.closest('[data-event-plot],.annotation-track-plot');
        if(!target||!this.duration || !e.deltaY&&!e.deltaX)return;
        e.preventDefault();
        const r=this.range(),span=r.end-r.start;
        if(e.shiftKey || Math.abs(e.deltaX)>Math.abs(e.deltaY)){
          const x=clamp(r.start+Math.sign(e.deltaY||e.deltaX)*span*.15,0,this.duration-span);this.resize({start:x,end:x+span});
        }else this.resize(zoomed(r,this.position(e,target,r),Math.exp(Math.sign(e.deltaY)*.22),this.duration,this.minSpan()));
      },{passive:false});
      for(const c of [this.overviewPlot,this.plotCanvas]){
        const axis=()=>c===this.overviewPlot?{start:0,end:this.duration}:this.range();
        c.addEventListener('click',e=>{
          if(c===this.overviewPlot && this.ignoreClick){this.ignoreClick=false;return;}
          if(this.duration)this.pick(e,c,axis());
        });
        c.addEventListener('pointermove',e=>{
          const r=axis(),time=this.position(e,c,r),hit=near(this.items,time,this.tolerance(c,r));
          c.title=hit?this.describe(hit):this.t(c===this.overviewPlot?'video':'hint');
        });
      }
      const marks=this.overviewPlot;
      marks.addEventListener('pointerdown',e=>{
        if(e.button!==0||!this.video.source||!this.duration)return;
        e.preventDefault();
        this.scrub={id:e.pointerId,source:this.video.source,x:e.clientX,time:this.video.currentVideoTime,playing:this.video.playing};
        this.ignoreClick=false;this.video.pause();marks.setPointerCapture(e.pointerId);
        this.overview.querySelector('input')?.focus({preventScroll:true});
      });
      detail.addEventListener('pointerdown',e=>{
        const canvasRuler=e.target===this.plotCanvas && e.clientY-e.target.getBoundingClientRect().top<20;
        const shiftPan=e.shiftKey && Boolean(e.target.closest('[data-event-plot],.annotation-track-plot'));
        const brush=!shiftPan && this.source==='experiment' && e.target===this.plotCanvas && !canvasRuler;
        this.ignoreRulerClick=false;
        if(e.button!==0 || e.isPrimary===false || this.pan || !this.duration || !(shiftPan || brush || canvasRuler || e.target.closest('[data-event-limits],[data-ruler]')))return;
        const axis=this.usesEditor()?this.editorStrip.querySelector('svg'):this.plotCanvas;
        const width=axis?.getBoundingClientRect().width;if(!width)return;
        const surface=brush?this.plotCanvas:detail;
        const range=this.range();
        this.pan={id:e.pointerId,x:e.clientX,range,width,surface,brush,shiftPan,anchor:this.position(e,axis,range),add:e.ctrlKey||e.metaKey};
        detail.toggleAttribute('data-panning',!brush);
        if(shiftPan)e.stopPropagation();
        surface.setPointerCapture(e.pointerId);if(brush)surface.focus({preventScroll:true});e.preventDefault();
      },true);
      detail.addEventListener('click',e=>{
        if(this.ignoreRulerClick && e.detail && e.target.closest('[data-event-plot],.annotation-track-plot')){
          this.ignoreRulerClick=false;e.stopPropagation();
        }
      },true);
      detail.addEventListener('pointermove',e=>{
        const p=this.pan;if(!p || p.id!==e.pointerId)return;
        const span=p.range.end-p.range.start,dx=e.clientX-p.x;
        if(Math.abs(dx)<3 && !p.moved)return;
        p.moved=true;
        if(p.brush){p.to=this.position(e,this.plotCanvas,p.range);this.redraw=true;this.update();return;}
        const start=clamp(p.range.start-dx*span/p.width,0,this.duration-span);
        this.resize({start,end:start+span});
      });
      const finishPan=(cancel)=>{
        const p=this.pan;if(!p)return;
        this.pan=null;this.ignoreRulerClick=p.moved || cancel || p.shiftPan;
        detail.removeAttribute('data-panning');
        if(p.surface.hasPointerCapture(p.id))p.surface.releasePointerCapture(p.id);
        if(p.brush){
          if(p.moved && !cancel){
            const low=Math.min(p.anchor,p.to),high=Math.max(p.anchor,p.to);
            if(!p.add)this.recordSelected.clear();
            for(const item of this.items)if(item.start<=high && item.end>=low)this.recordSelected.add(item.row.id);
          }
          this.redraw=true;this.update();
        }else if(cancel)this.resize(p.range);
      };
      detail.addEventListener('pointerup',e=>{if(e.pointerId===this.pan?.id)finishPan(false);});
      for(const type of ['pointercancel','lostpointercapture'])detail.addEventListener(type,e=>{if(e.pointerId===this.pan?.id)finishPan(true);});
      this.cancelPan=e=>{if(e.key==='Escape'&&this.pan){e.preventDefault();e.stopPropagation();finishPan(true);}};
      document.addEventListener('keydown',this.cancelPan,true);
      marks.addEventListener('pointermove',e=>{
        const s=this.scrub;if(!s||e.pointerId!==s.id||s.source!==this.video.source)return;
        if(!s.moved && Math.abs(e.clientX-s.x)>3){this.history?.beginGesture();s.moved=true;}
        if(s.moved)this.video.seekVideo(this.position(e,marks,{start:0,end:this.duration}));
      });
      marks.addEventListener('pointerup',e=>{
        const s=this.scrub;if(!s||e.pointerId!==s.id)return;
        this.scrub=null;this.ignoreClick=Boolean(s.moved);
        if(s.moved&&s.source===this.video.source){this.video.seekVideo(this.position(e,marks,{start:0,end:this.duration}));this.history?.endGesture();}
        if(marks.hasPointerCapture(s.id))marks.releasePointerCapture(s.id);
      });
      const cancel=()=>{
        const s=this.scrub;if(!s)return;
        this.scrub=null;this.ignoreClick=true;
        if(marks.hasPointerCapture(s.id))marks.releasePointerCapture(s.id);
        if(s.source===this.video.source){if(s.moved)this.history?.endGesture({cancel:true});this.video.seekVideo(s.time,{preserveView:true});if(s.playing)this.video.play();}
      };
      marks.addEventListener('pointercancel',cancel);marks.addEventListener('lostpointercapture',cancel);
      overview.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.scrub){e.preventDefault();e.stopPropagation();cancel();}});
      this.plotCanvas.addEventListener('keydown',e=>this.key(e));
      this.observer=new ResizeObserver(()=>{this.redraw=true;this.update();});this.observer.observe(overview);this.observer.observe(this.plot);
      this.update();
    }
    t(key){const lang=document.documentElement.lang;return words[key][lang.startsWith('zh')?1:lang.startsWith('es')?2:0];}
    annotationRows(track=null){
      const doc=this.editor?.doc;if(!doc)return [];
      const mapping=this.video.mapping,coverage=mediaCoverage(this.video,this.video.source?.duration);
      const api=window.NeuropixelsAnnotations,rows=[];
      for(const s of doc.segments){
        if(track && JSON.stringify([s.subject,s.track])!==track)continue;
        const a=coverage?Math.max(s.start,coverage.start):NaN,b=coverage?Math.min(s.end,coverage.end):NaN;
        const label=api.label(doc,s),point=s.kind==='point',mapped=point?a===b:b>a;
        rows.push({id:s.id,label,color:api.color(doc,label),subject:s.subject,track:s.track,point,videoStart:s.start,videoEnd:s.end,
          patternEligible:Boolean(label && mapped && a===s.start && b===s.end && (!s.runId||api.reviewed(doc,s))),
          start:mapped?mapping.videoToNeural(a):null,end:mapped?mapping.videoToNeural(b):null});
      }
      return rows;
    }
    setRows(rows,source){
      // The editor may publish freshly allocated equivalent projections during its own repaint.
      const equal=source===this.source&&this.rowsRecording===this.video.recording&&this.rowsMedia===this.video.source&&rows.length===this.rows.length&&rows.every((r,i)=>{
        const p=this.rows[i];return r===p||r.id===p.id&&r.start===p.start&&r.end===p.end&&r.videoStart===p.videoStart&&r.videoEnd===p.videoEnd&&r.label===p.label&&r.color===p.color&&r.point===p.point;
      });
      if(equal){if(this.editingRequested!==this.editing())this.update();return;}
      if(this.source!==source || this.rowsRecording!==this.video.recording || this.rowsMedia!==this.video.source)this.recordSelected.clear();
      this.rows=rows;this.source=source;this.rowsRecording=this.video.recording;this.rowsMedia=this.video.source;
      this.allowed=new Set(rows.map(r=>r.id));this.dirty=true;this.update();
      for(const id of this.recordSelected)if(!this.allowed.has(id))this.recordSelected.delete(id);
    }
    attachEditor(editor){this.editor=editor;this.editorDirty=true;this.update();}
    allowsClip(id){return this.allowed.has(id);}
    editing(){return Boolean(this.source==='annotation'&&this.video.source&&this.editor?.doc&&this.editor.opened);}
    usesEditor(){return Boolean(this.detail.open && this.source==='annotation' && this.video.source && this.editor?.doc);}
    range(){return this.window||{start:0,end:this.duration||1};}
    cursor(){return this.video.source?(this.video.outsideClock?NaN:this.video.currentVideoTime):this.getView?.()?.cursorTime;}
    minSpan(){return this.video.source?1/Math.max(1,this.video.source.fps||30):.001;}
    resize(range){if(!(this.duration>0))return;this.window=range;this.redraw=true;this.editorDirty=true;this.update();}
    describe(item){return item.row.label+' · '+item.start.toFixed(3)+(item.point?'':'–'+item.end.toFixed(3))+' s';}
    position(e,target,r){const box=target.getBoundingClientRect();return r.start+clamp((e.clientX-box.left)/Math.max(1,box.width),0,1)*(r.end-r.start);}
    tolerance(c,r){return (r.end-r.start)*6/Math.max(1,c.getBoundingClientRect().width);}
    seek(time){
      this.history?.checkpoint();
      if(this.video.source){this.video.pause();this.video.seekVideo(time);}
      else this.seekNeural?.(time);
      this.update();
    }
    pick(e,c,r){
      const time=this.position(e,c,r),item=near(this.items,time,this.tolerance(c,r));
      if(c===this.plotCanvas && this.source==='experiment'){
        if(!e.ctrlKey && !e.metaKey)this.recordSelected.clear();
        if(item)this.recordSelected.add(item.row.id);this.redraw=true;
      }
      if(!item){this.seek(time);return;}
      this.video.pause();this.select?.(item.row,this.source);
      // A recorded interval may start before the clip. Enter at its first visible sample.
      if(this.video.source && (this.video.outsideClock||Math.abs(this.video.currentVideoTime-item.start)>1e-6))this.video.seekVideo(item.start);
      this.update();
    }
    key(e){
      if(!this.duration)return;
      if(e.key==='Escape'&&this.recordSelected.size){
        this.recordSelected.clear();this.redraw=true;this.update();e.preventDefault();e.stopPropagation();return;
      }
      const r=this.range(),cursor=clamp(Number.isFinite(this.cursor())?this.cursor():r.start,r.start,r.end);
      const step=this.minSpan()*(e.shiftKey?10:1);
      if(['+','=','-'].includes(e.key))this.resize(zoomed(r,cursor,e.key==='-'?2:.5,this.duration,this.minSpan()));
      else if(e.key==='Home')this.seek(r.start);
      else if(e.key==='End')this.seek(r.end);
      else if(e.key==='ArrowLeft'||e.key==='ArrowRight')this.seek(clamp(cursor+(e.key==='ArrowRight'?step:-step),r.start,r.end));
      else return;
      e.preventDefault();e.stopPropagation();
    }
    update(){
      if(!this.pending)this.pending=requestAnimationFrame(()=>{this.pending=null;this.render();});
    }
    render(){
      const media=this.video.source,recording=this.video.recording,duration=Number(media?media.duration:recording?.duration)||0;
      if(this.media!==media||this.recording!==recording||this.duration!==duration){
        this.pan=null;
        this.detail.removeAttribute('data-panning');
        this.media=media;this.recording=recording;this.duration=duration;this.window=null;this.dirty=true;this.lastCursor=NaN;
      }
      if(this.mapping!==this.video.mapping){this.mapping=this.video.mapping;this.dirty=true;}
      if(this.dirty){
        const sameSource=this.rowsRecording===recording && (this.source==='experiment'||media&&this.rowsMedia===media);
        this.items=sameSource?projectRows(this.rows,duration,this.video):[];this.dirty=false;this.redraw=true;this.editorDirty=true;
      }
      this.detail.hidden=!(duration>0)&&(this.rows.length===0||!recording);
      this.overview.hidden=!media||!(duration>0);
      const editing=this.editing();
      if(editing&&!this.editingRequested)this.detail.open=true;
      this.editingRequested=editing;
      const edit=this.usesEditor();
      this.updateSelectionActions();
      if(this.edit!==edit||this.language!==document.documentElement.lang){this.edit=edit;this.redraw=true;this.editorDirty=true;}
      this.language=document.documentElement.lang;
      this.plot.hidden=edit;
      if(this.editorStrip)this.editorStrip.hidden=!edit;
      if(!(duration>0))return;
      const cursor=this.cursor();
      let r=this.range();const span=r.end-r.start;
      const follow=!this.video.playing||this.lastCursor>=r.start&&this.lastCursor<=r.end;
      if(!this.pan && follow&&Number.isFinite(cursor)&&Number.isFinite(this.lastCursor)&&Math.abs(cursor-this.lastCursor)>1e-8 && (cursor<r.start||cursor>r.end) && span<duration){
        const start=clamp(cursor-span/2,0,duration-span);this.window=r={start,end:start+span};this.redraw=true;this.editorDirty=true;
      }
      this.lastCursor=cursor;
      if(this.redraw){
        this.redraw=false;
        const total=media&&this.source==='experiment'&&this.items.length!==this.rows.length?' / '+this.t('inRecording')+' '+this.rows.length:'';
        const missing=media && this.source==='experiment' && this.rows.length && this.video.mapping.method==='unmapped' ? 'alignEvents'
          : !this.rows.length && media && this.source==='annotation' ? (this.editor?.doc?.segments?.length ? 'empty':'markFirst') : null;
        this.summary.textContent=this.t('events')+' · '+(missing?this.t(missing):this.t(media?'inVideo':'inRecording')+' '+this.items.length+total);
        this.limits.textContent=this.t(media?'video':'recording')+' '+r.start.toFixed(2)+'–'+r.end.toFixed(2)+' s';
        this.limits.title=this.t('pan');
        this.scale.querySelector('[data-event-zoom="in"]').setAttribute('aria-label',this.t('zoomIn'));
        this.scale.querySelector('[data-event-zoom="out"]').setAttribute('aria-label',this.t('zoomOut'));
        const reset=this.scale.querySelector('[data-event-zoom="all"]');reset.textContent=this.t('all');
        reset.disabled=r.start===0&&r.end===duration;
        this.plotCanvas.setAttribute('aria-label',this.t('events')+' · '+this.t('hint'));
        this.plotCanvas.setAttribute('aria-valuemin',r.start);this.plotCanvas.setAttribute('aria-valuemax',r.end);
        if(media)this.draw(this.overviewPlot,{start:0,end:duration},true);
        if(this.detail.open&&!edit)this.draw(this.plotCanvas,r,false);
      }
      if(this.editorDirty){this.editorDirty=false;if(edit)this.editor.drawTimeline(true);}
      this.line.hidden=!Number.isFinite(cursor)||cursor<r.start||cursor>r.end;
      if(!this.line.hidden)this.line.style.left=(100*(cursor-r.start)/(r.end-r.start))+'%';
      if(Number.isFinite(cursor)){this.plotCanvas.setAttribute('aria-valuenow',String(clamp(cursor,r.start,r.end)));this.plotCanvas.setAttribute('aria-valuetext',cursor.toFixed(3)+' s');}
      else{this.plotCanvas.removeAttribute('aria-valuenow');this.plotCanvas.setAttribute('aria-valuetext','—');}
    }
    draw(canvas,range,overview){
      const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
      const dpr=window.devicePixelRatio||1,w=box.width,h=box.height;
      canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);
      const ctx=canvas.getContext('2d');ctx.scale(canvas.width/w,canvas.height/h);
      const x=t=>(t-range.start)/(range.end-range.start)*w;
      const css=getComputedStyle(this.detail),soft=css.getPropertyValue('--text-soft').trim()||'#9b9b9b';
      if(!overview){
        ctx.font='0.8125rem system-ui';ctx.fillStyle=soft;ctx.strokeStyle=css.getPropertyValue('--line').trim()||'#555';
        const textHeight=parseFloat(ctx.font),ticks=Math.max(1,Math.floor(w/(textHeight*7)));
        for(let i=0;i<=ticks;i++){
          const time=range.start+(range.end-range.start)*i/ticks,offset=clamp(i/ticks*w,.5,w-.5);
          ctx.textAlign=i===0?'left':i===ticks?'right':'center';ctx.fillText(time.toFixed(range.end-range.start<2?3:1),offset,textHeight+1);
          ctx.beginPath();ctx.moveTo(offset,textHeight+3);ctx.lineTo(offset,h);ctx.stroke();
        }
      }
      let count=0;
      for(const item of this.items){
        if(item.start>range.end)break;
        if(item.end<range.start)continue;
        const left=clamp(x(item.start),0,w-1),right=clamp(x(item.end),0,w);
        ctx.fillStyle=item.row.color||'#5aaca3';
        if(item.point){
          const tip=overview?1:18;
          ctx.beginPath();ctx.moveTo(left-3,tip);ctx.lineTo(left+3,tip);ctx.lineTo(left,tip+5);ctx.fill();
          ctx.fillRect(left-1,tip+4,2,h-(overview?0:7)-tip-4);
        } else ctx.fillRect(left,overview?4:22,Math.max(overview?2:3,right-left),overview?h-4:h-29);
        count++;
        if(!overview&&this.recordSelected.has(item.row.id)){
          ctx.strokeStyle=css.getPropertyValue('--text').trim()||'#eee';ctx.lineWidth=2;
          ctx.strokeRect(left,22,Math.max(3,right-left),h-29);
        }
      }
      if(!overview && this.pan?.brush && this.pan.moved){
        ctx.fillStyle='rgba(108,167,244,.25)';const a=x(this.pan.anchor),b=x(this.pan.to);
        ctx.fillRect(Math.min(a,b),20,Math.abs(a-b),h-20);
      }
      if(!overview&&!count){ctx.fillStyle=soft;ctx.textAlign='center';ctx.fillText(this.t('empty'),w/2,h-8);}
    }
    updateSelectionActions(){
      const edit=this.usesEditor();
      const remove=this.scale.querySelector('[data-event-delete]'),undo=this.scale.querySelector('[data-event-restore]');
      const count=edit?this.editor.axisSelection?.().length || 0:0;
      remove.hidden=!count;undo.hidden=!edit || !this.editor.canUndoDelete?.();
      if(count)remove.textContent=this.t('remove')+' ('+count+')';
      if(!undo.hidden)undo.textContent=this.t('undoDelete');
      const status=this.scale.querySelector('[data-record-selected]');status.hidden=this.source!=='experiment'||!this.recordSelected.size;
      if(!status.hidden)status.textContent=this.t('recordedSelection')+' · '+this.recordSelected.size;
    }
    destroy(){this.observer.disconnect();document.removeEventListener('keydown',this.cancelPan,true);if(this.pending)cancelAnimationFrame(this.pending);if(this.video.eventTimeline===this)this.video.eventTimeline=null;}
  }
  return {VideoEventTimeline,projectRows,zoomed,near};
});
