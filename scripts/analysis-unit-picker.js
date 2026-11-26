// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  function enableResizing(frame){
    const labels={
      en:['Resize width','Resize height','Resize width and height'],
      'zh-CN':['调整宽度','调整高度','调整宽度与高度'],
      es:['Ajustar el ancho','Ajustar la altura','Ajustar el ancho y la altura']
    }[document.documentElement.lang]||['Resize width','Resize height','Resize width and height'];
    for(const [index,axis] of ['x','y','xy'].entries()){
      const handle=document.createElement('div');
      handle.dataset.pickerResize=axis;handle.title=labels[index];
      frame.append(handle);
      const size=(width,height)=>{
        if(axis.includes('x'))frame.style.width=Math.max(0,Math.min(frame.parentElement.clientWidth,width))+'px';
        if(axis.includes('y'))frame.style.height=Math.max(0,height)+'px';
      };
      let drag=null;
      handle.onpointerdown=e=>{
        if(e.button!==0||!e.isPrimary||drag)return;
        e.preventDefault();
        const {width,height}=frame.getBoundingClientRect();
        drag={id:e.pointerId,x:e.clientX,y:e.clientY,width,height,previous:[frame.style.width,frame.style.height]};
        handle.setPointerCapture(e.pointerId);handle.focus({preventScroll:true});
      };
      handle.onpointermove=e=>{
        if(drag?.id===e.pointerId)size(drag.width+e.clientX-drag.x,drag.height+e.clientY-drag.y);
      };
      const finish=(cancel)=>{
        if(!drag)return;
        const {id,previous}=drag;drag=null;
        if(cancel)[frame.style.width,frame.style.height]=previous;
        if(handle.hasPointerCapture(id))handle.releasePointerCapture(id);
      };
      handle.onpointerup=e=>{if(e.pointerId===drag?.id)finish(false);};
      handle.onpointercancel=handle.onlostpointercapture=e=>{if(e.pointerId===drag?.id)finish(true);};
      handle.tabIndex=axis==='xy'?-1:0;
      if(axis!=='xy'){
        handle.setAttribute('role','separator');handle.setAttribute('aria-orientation',axis==='x'?'vertical':'horizontal');
        handle.setAttribute('aria-label',labels[index]);
      }
      handle.onkeydown=e=>{
        if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();finish(true);return;}
        const step={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];
        if(!step || (axis==='x'&&!step[0]) || (axis==='y'&&!step[1]))return;
        e.preventDefault();e.stopPropagation();
        const {width,height}=frame.getBoundingClientRect();size(width+step[0],height+step[1]);
      };
    }
  }
  class AnalysisUnitPicker {
    constructor(ui){
      this.ui=ui;this.panel=ui.dialog.querySelector('[data-ea-probe-select]');
      this.source=ui.dialog.querySelector('[data-ea-probe-source]');this.choice=ui.dialog.querySelector('[data-ea-unit-choice]');
      this.button=this.panel.querySelector('[data-ea-commit-units]');
      this.list=this.panel.querySelector('[data-ea-saved-units]');
      this.mapHost=this.panel.querySelector('[data-ea-picker]');
      this.spikeHost=this.panel.querySelector('[data-ea-spike-picker]');
      enableResizing(this.panel.querySelector('.ea-picker-viewport'));
      this.saved=new Map();this.drafts=new Map();this.version=0;this.units=[];
      this.mapHost.addEventListener('probe-selection-change',()=>this.draft(this.map.selectedRefs().filter(r=>r.recordingKey===this.recording.key).map(r=>r.unitId)));
      this.source.onchange=()=>{
        this.sourceChanged=true;
        ui.chooseUnits(this.choice.value);
      };
      this.button.onclick=()=>this.commit();
      this.list.onclick=async e=>{
        const remove=e.target.closest('[data-remove-unit]');
        if(!remove || this.saving || this.ui.worker || this.ui.ioAbort)return;
        const key=remove.dataset.probe,id=Number(remove.dataset.removeUnit);
        const next=new Map(this.saved),keep=new Set(next.get(key));keep.delete(id);
        if(keep.size)next.set(key,keep);else next.delete(key);
        if(await this.apply(next)){
          this.drafts.get(key)?.delete(id);if(key===this.recording.key && this.ready)this.paintDraft();
        }
      };
    }
    refs(values=this.saved){
      return Array.from(values,([recordingKey,unitIds])=>Array.from(unitIds,unitId=>({recordingKey,unitId}))).flat();
    }
    syncIds(){
      const ids=window.NeuropixelsJointRecording.analysisIds(this.ui.state.activeRecording,this.refs());
      const current=new Set(this.ui.input('unitIds').value.trim().split(/[\s,]+/).filter(Boolean).map(Number));
      if(ids.length===current.size && ids.every(id=>current.has(id)))return;
      this.ui.setIds(ids);
    }
    restore(ids,record){
      this.saved.clear();this.drafts.clear();
      for(const id of ids){
        const ref=record.jointUnits?.get(id)||{recordingKey:record.key,unitId:id};
        if(!this.saved.has(ref.recordingKey))this.saved.set(ref.recordingKey,new Set());
        this.saved.get(ref.recordingKey).add(ref.unitId);
      }
      for(const [key,values] of this.saved)this.drafts.set(key,new Set(values));
    }
    pending(){
      const key=this.recording.key;
      return [...(this.drafts.get(key)||[])].filter(id=>!this.saved.get(key)?.has(id));
    }
    draft(ids){
      this.drafts.set(this.recording.key,new Set(ids));this.refreshSave();
    }
    refreshSave(){
      const count=this.pending().length;
      this.button.disabled=!count||this.saving||!this.ready;
      this.button.textContent=this.ui.t('commitUnits')+(count?' ('+count+')':'');
    }
    paintDraft(){
      const ids=this.drafts.get(this.recording.key)||new Set();
      if(this.mode==='spikes'){this.spikes?.setPickedUnits([...ids]);}
      else {this.map.byProbe=new Map([[this.recording.key,new Set(ids)]]);this.map.styleSelection();}
      this.refreshSave();
    }
    renderSaved(){
      const names=new Map(this.ui.probes.map(p=>[p.key,p.name||p.key]));
      const opened=new Set([...this.list.querySelectorAll('details[open]')].map(d=>d.dataset.probe));
      const title=document.createElement('strong');title.textContent=this.ui.t('savedUnits')+' · '+this.refs().length;
      this.list.replaceChildren(title);
      for(const [key,ids] of this.saved){
        const group=document.createElement('details'),summary=document.createElement('summary'),items=document.createElement('div');
        group.dataset.probe=key;group.open=ids.size<=8 || opened.has(key);
        summary.textContent=(names.get(key)||key)+' · '+ids.size+' Units';
        for(const id of ids){
          const chip=document.createElement('span'),remove=document.createElement('button');
          const name=document.createElement('span');name.textContent='Unit '+id;
          window.NeuropixelsUnitMarks?.bind(name,key,id);
          chip.append(name,' ');remove.type='button';remove.dataset.probe=key;remove.dataset.removeUnit=id;
          remove.textContent='×';remove.title=this.ui.t('removeUnit')+' · '+(names.get(key)||key)+' · Unit '+id;
          remove.setAttribute('aria-label',remove.title);chip.append(remove);items.append(chip);
        }
        group.append(summary,items);this.list.append(group);
      }
      this.refreshSave();
    }
    async commit(){
      if(!this.ready||this.saving||this.ui.worker||this.ui.ioAbort)return;
      const record=this.recording,add=this.pending();if(!add.length)return;
      const next=new Map(this.saved);
      next.set(record.key,new Set([...(next.get(record.key)||[]),...add]));
      await this.apply(next);
    }
    async apply(next){
      const refs=this.refs(next);if(refs.length>4096){this.ui.status(this.ui.t('tooMany'),true);return;}
      this.saving=true;this.refreshSave();
      this.panel.inert=true;this.choice.disabled=this.source.disabled=true;
      try{
        if(await this.ui.commitProbeScope(this.ui.probes.filter(p=>next.has(p.key)),refs)){
          this.saved=next;this.renderSaved();return true;
        }
      }catch(error){this.ui.status(error.message,true);}
      finally{this.saving=false;this.panel.inert=false;this.choice.disabled=this.source.disabled=false;this.refreshSave();}
    }
    async singleScope(mode){
      const ui=this.ui,record=ui.probes.find(r=>r.key===this.source.value);
      if(!record || this.saving)return;
      this.saving=true;this.choice.disabled=this.source.disabled=true;
      try{
        const units=await ui.getProbeUnits(record);
        let ids=[];
        if(mode==='all')ids=units.map(u=>u.id);
        else if(mode.startsWith('region:'))ids=units.filter(u=>u.region===mode.slice(7)).map(u=>u.id);
        else if(mode==='selected'||mode==='marked'){
          const initial=mode==='selected'?ui.focusAtOpen:ui.state.experimentView.selectedInterval?.unitIds;
          const refs=(initial||[]).map(id=>ui.scopeAtOpen.jointUnits?.get(id)||{recordingKey:ui.scopeAtOpen.key,unitId:id});
          ids=refs.filter(r=>r.recordingKey===record.key).map(r=>r.unitId);
        }
        if(await ui.commitProbeScope([record],ids.map(unitId=>({recordingKey:record.key,unitId})))){
          this.updateRegions(units,mode);
        }
      }catch(error){ui.status(error.message,true);}
      finally{this.saving=false;this.choice.disabled=this.source.disabled=false;}
    }
    updateRegions(units,mode){
      let group=this.choice.querySelector('optgroup');
      if(!group){group=document.createElement('optgroup');group.label=this.ui.t('region');this.choice.querySelector('[value=probe]').before(group);}
      const regions=[...new Set(units.map(u=>u.region).filter(Boolean))].sort();
      group.replaceChildren(...regions.map(r=>new Option(r,'region:'+r)));
      if(mode.startsWith('region:')&&!regions.includes(mode.slice(7)))group.append(new Option(mode.slice(7)+' · 0 Units',mode));
      this.choice.value=mode;
    }
    async show(mode){
      const ui=this.ui,record=ui.probes.find(p=>p.key===this.source.value)||ui.probes[0];
      const first=this.panel.hidden;this.destroy();const version=this.version;
      this.mode=mode;this.recording=record;this.ready=false;this.units=[];
      this.panel.hidden=false;this.mapHost.hidden=mode!=='probe';this.spikeHost.hidden=mode!=='spikes';
      this.panel.querySelector('[data-ea-picker-title]').textContent=ui.t(mode==='spikes'?'spikes':'probe')+' · '+(record.name||record.key);
      const depth=this.panel.querySelector('[data-ea-depth-fields]');depth.hidden=true;
      this.mapHost.replaceChildren();this.spikeHost.replaceChildren();this.renderSaved();
      if(first){this.syncIds();if(!this.saved.size)ui.status('');}
      try{
        const units=ui.getProbeUnits?await ui.getProbeUnits(record):ui.getUnits();
        if(this.version!==version)return;
        this.units=units;
        if(mode==='spikes'){
          this.spikes=ui.createSpikePicker(this.spikeHost,{recording:record,units,selectedIds:[...(this.drafts.get(record.key)||[])],
            onChange:ids=>{if(this.version===version)this.draft(ids);}});
        }else{
          const depths=units.map(u=>u.depthUm).filter(Number.isFinite);
          if(!depths.length){this.mapHost.textContent=ui.t('noPositions');return;}
          this.map??=new window.NeuropixelsProbeMap(this.mapHost,()=>{});
          this.map.draw(record,units);
          depth.hidden=false;
          depth.querySelector('[data-ea-depth=min]').value=depths.reduce((a,b)=>Math.min(a,b),Infinity);
          depth.querySelector('[data-ea-depth=max]').value=depths.reduce((a,b)=>Math.max(a,b),-Infinity);
        }
        this.ready=true;this.paintDraft();
      }catch(error){if(this.version===version)ui.status(error.message,true);}
    }
    hide(){this.destroy();this.panel.hidden=true;}
    destroy(){++this.version;this.spikes?.destroy();this.spikes=null;this.ready=false;}
  }
  window.NeuropixelsAnalysisUnitPicker=AnalysisUnitPicker;
})();
