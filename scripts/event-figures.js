// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const language=()=>document.documentElement.lang;
  const copy={
    en:{entry:'Event response figures',choose:'Choose an event and two conditions with eligible trials, then run the analysis.',J:'Paired Unit heatmaps',K:'Group firing rates',L:'Single-trial spikes',M:'Paired Unit rates',close:'Back to event responses',settings:'Change analysis settings',png:'Export PNG',unit:'Choose Units',select:'Ctrl / Shift to select multiple Units',sample:'Show in recording',baseline:'Pre-event baseline',range:'Response window (ms)',baseRange:'Baseline window (ms)',loading:'Reading spike timestamps…',meta:'Recorded condition',video:'Video annotation',display:'0 s = displayed image onset (presentation start_time)',zero:'0 s = onset of',paper:'Panel reference',fig:'Figure',ref:'Reference',scope:'Unit population',more:'Next rows',prev:'Previous rows',window:'Analysis window',fit:'Fit groups on',unfit:'Restore Unit order',reading:'Computing reference groups…',common:'Units retain the same row across conditions.',Knote:'Each Unit contributes equally within its group.',Lnote:'One trial per condition. Each tick is one recorded spike.',Mnote:'One line joins the two rates of the same Unit.',invalid:'Choose a valid time window.',events:'events',time:'Recording time',trials:'Trials',gid:'Original trial',n:'Units',nosel:'Choose at least one Unit.',failed:'Image export failed.',page:'Rows',refonly:'Groups fitted on',pooled:'Original Unit order'},
    'zh-CN':{entry:'事件响应出图',choose:'选择事件和两个有试次的条件，然后运行分析。',J:'同一批 Unit 的双条件热图',K:'各组的双条件放电率',L:'单次事件的多 Unit 原始 spike',M:'同一 Unit 的配对放电率',close:'返回事件响应',settings:'修改分析设置',png:'导出 PNG',unit:'选择 Unit',select:'按 Ctrl 追加，按 Shift 连选',sample:'回到原始记录',baseline:'事件前基线',range:'响应窗（毫秒）',baseRange:'基线窗（毫秒）',loading:'正在读取原始 spike 时刻…',meta:'记录条件',video:'视频标注',display:'0 秒 = 图像实际显示时刻（展示表 start_time）',zero:'0 秒 = 事件起点',paper:'对应论文',fig:'图',ref:'参照条件',scope:'分析范围',more:'后续行',prev:'前面行',window:'分析窗',fit:'按参照条件分组',unfit:'恢复 Unit 原序',reading:'正在参照条件中聚类…',common:'两侧同一行对应同一个 Unit。',Knote:'每组内各 Unit 等权平均。',Lnote:'两侧各一次真实事件。每条短竖线是一颗 spike。',Mnote:'每条线连接同一个 Unit 在两种条件下的放电率。',invalid:'请填写有效时间窗。',events:'次事件',time:'记录时间',trials:'试次',gid:'原始试次',n:'个 Unit',nosel:'请至少选择一个 Unit。',failed:'图像导出失败。',page:'行',refonly:'聚类参照',pooled:'Unit 原序'},
    es:{entry:'Figuras de respuestas a eventos',choose:'Selecciona un evento y dos condiciones con ensayos y ejecuta el análisis.',J:'Mapas de las mismas unidades',K:'Tasas por grupo',L:'Spikes de un ensayo',M:'Tasas pareadas por unidad',close:'Volver a las respuestas',settings:'Cambiar el análisis',png:'Exportar PNG',unit:'Elegir unidades',select:'Ctrl / Mayús para elegir varias',sample:'Ver en el registro',baseline:'Línea basal previa',range:'Ventana de respuesta (ms)',baseRange:'Ventana basal (ms)',loading:'Leyendo los spikes…',meta:'Condición del registro',video:'Anotación de vídeo',display:'0 s = aparición de la imagen (start_time de presentación)',zero:'0 s = inicio de',paper:'Figura de referencia',fig:'Fig.',ref:'Referencia',scope:'Unidades',more:'Siguientes',prev:'Anteriores',window:'Ventana',fit:'Agrupar por la referencia',unfit:'Restablecer orden',reading:'Agrupando la referencia…',common:'La misma fila corresponde a la misma unidad.',Knote:'Las unidades tienen igual peso en el grupo.',Lnote:'Un ensayo por condición. Cada trazo vertical indica un spike.',Mnote:'Cada línea conecta las tasas de una misma unidad.',invalid:'Elige una ventana válida.',events:'ensayos',time:'Tiempo del registro',trials:'Ensayos',gid:'Ensayo original',n:'unidades',nosel:'Selecciona al menos una unidad.',failed:'Error al exportar la imagen.',page:'Filas',refonly:'Agrupación de referencia',pooled:'Orden original'}
  };
  const word=k=>(copy[language()]||copy.en)[k];
  const txt=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
  const paper='Sun, Zhang et al. · Science 2025';
  const panels=['J','K','L','M'],pageSize=36;
  const viewNames={
    en:['Trial review','Heatmaps','Group rates','Single-trial spikes','Paired rates'],
    'zh-CN':['逐次查看','双条件热图','组平均放电率','单次事件 spike','配对放电率'],
    es:['Ver ensayos','Mapas de calor','Tasas por grupo','Spikes por ensayo','Tasas pareadas']
  };
  const rounded=s=>Number(s.toFixed(5));
  function provenance(review){
    const {events,parameters:p}=review.result.response;
    const recorded=events.every(e=>e.sourceKind==='experiment');
    const source=review.result.provenance?.source;
    const allen=source?.kind==='Allen NWB' || (source?.kind==='joint-probes' && source.probes?.length>0 && source.probes.every(p=>p.source?.kind==='Allen NWB'));
    const displayed=allen && recorded && ['image_change','image_presentation'].includes(p.eventType) &&
      events.every(e=>e.sourceTable?.endsWith('_presentations') && e.conditions?.omitted!==true);
    return {
      condition:p.responseRule||review.legacyOutcome?review.conditionField():(recorded?word('meta'):word('video'))+' · '+review.conditionField(),
      onset:displayed?word('display'):word('zero')+' · '+p.eventType
    };
  }
  class EventFigures {
    static word=word;
    constructor(ui){
      this.ui=ui;
      this.bar=document.createElement('div');
      this.bar.className='ea-result-views';this.bar.setAttribute('role','group');
      this.bar.setAttribute('aria-label',ui.t('title'));
      this.section=document.createElement('section');
      this.section.className='event-figures';this.section.hidden=true;
      this.section.setAttribute('aria-label',word('entry'));
      this.bar.addEventListener('click',e=>{
        const button=e.target.closest('button');
        if(!button)return;
        if(button.dataset.efPanel==='review')this.showReview();
        else this.ui.openFigures(button.dataset.efPanel);
      });
      this.section.addEventListener('click',e=>this.click(e));
      this.section.addEventListener('change',e=>this.change(e));
      for(const host of [this.bar,this.section])host.addEventListener('keydown',e=>{
        if(e.key==='Escape'&&!e.defaultPrevented&&!e.isComposing&&this.active){
          e.preventDefault();e.stopPropagation();this.showReview(true);
        }
      });
      this.shell();
      this.resize=new ResizeObserver(()=>{
        const width=this.get('.ef-scroll').clientWidth;
        if(width && Math.max(560,width)!==this.width)this.repaint();
      });
      this.resize.observe(this.get('.ef-scroll'));
    }
    get active(){return !this.section.hidden;}
    get(s){return this.section.querySelector(s);}
    mount(review){
      this.ui.resultPanel.prepend(this.bar);
      this.ui.resultPanel.append(this.section);
      this.bar.replaceChildren();
      const names=viewNames[language()]||viewNames.en;
      if(review.views.size===2){
        ['review',...panels].forEach((key,i)=>{
          const b=txt('button',i?'5'+key+' · '+names[i]:names[0]);b.type='button';
          b.dataset.efPanel=key;b.title=i?word(key):names[0];this.bar.append(b);
        });
      }else{
        const b=txt('button',word('entry'));b.type='button';b.title=word('choose');this.bar.append(b);
      }
      this.showReview();
    }
    selectView(key){
      for(const b of this.bar.querySelectorAll('[data-ef-panel]'))
        b.setAttribute('aria-pressed',String(b.dataset.efPanel===key));
    }
    showReview(focus=false){
      this.pending?.abort();
      this.trains?.clear();this.exportData=null;this.hits=null;
      this.section.hidden=true;this.selectView('review');
      if(this.ui.review){
        this.ui.review.viewRoot.hidden=false;
        this.ui.review.refreshUnits?.();
      }
      if(focus)this.bar.querySelector('[data-ef-panel=review]')?.focus({preventScroll:true});
    }
    open(review,panel){
      this.panel=panel;
      if(this.active&&this.review===review){this.update();return;}
      const same=this.review?.result.response===review.result.response;
      const previous=this.model,rec=this.ui.state.activeRecording;
      const newSelection=review.selected.length && review.selected.join(',')!==this.fromHeatmap;
      this.review=review;
      const r=review.result.response, {start,end}=r.parameters;
      const groups=review.comparison.values.map(key=>({label:review.conditionName(key),events:review.views.get(key).response.events}));
      this.model={lang:language(),unitIds:r.unitIds,unitName:id=>this.ui.unitName(id),start,end,sides:groups};
      if(!same){
        this.trains=new Map();this.page=0;
        const oldTrials=this.trials||[];
        this.trials=groups.map(s=>s.events.find(e=>oldTrials.includes(e.id))?.id||s.events[0].id);
        if(!(this.msStart>=start*1000 && this.msEnd<=end*1000 && this.msEnd>this.msStart)){
          this.msStart=1000*(Math.max(0,start)<end?Math.max(0,start):start);
          this.msEnd=Math.min(1000*end,this.msStart+100);
        }
        if(!(this.baseStart>=start*1000 && this.baseEnd<=Math.min(end,0)*1000 && this.baseEnd>this.baseStart)){
          this.baseStart=Math.max(start,-.1)*1000;this.baseEnd=Math.min(end,0)*1000;this.baseline=false;
          if(this.baseEnd<=this.baseStart)this.baseStart=start*1000;
        }
        if(previous){
          const refs=this.units.map(id=>this.sourceRecording.jointUnits?.get(id)||{recordingKey:this.sourceRecording.key,unitId:id});
          const keep=new Set(window.NeuropixelsJointRecording.analysisIds(rec,refs));
          this.units=r.unitIds.filter(id=>keep.has(id));
        }
      }
      if(!previous||newSelection||(!same&&!this.units.length)){
        this.units=review.selected.length?review.selected.slice():r.unitIds.slice(0,4);this.page=0;
        this.fromHeatmap=review.selected.join(',');
      }
      this.sourceRecording=rec;
      this.source=provenance(review);
      const unitsById=new Map((this.ui.getUnits?.()||[]).map(u=>[u.id,u]));
      const region=[...new Set(r.unitIds.map(id=>unitsById.get(id)?.region).filter(Boolean))];
      const probes=rec.jointUnits && [...new Set(r.unitIds.map(id=>rec.jointUnits.get(id)?.probeName).filter(Boolean))];
      this.scope=probes?.length?probes.join(' + '):rec.name||rec.key;
      if(probes?.length){
        const sessions=new Set((review.result.provenance?.source?.probes||[]).map(p=>p.source?.session).filter(Boolean));
        if(sessions.size===1)this.scope=[...sessions][0]+' · '+this.scope;
      }
      if(region.length && region.length<=4)this.scope+=' · '+region.join(' / ');
      review.viewRoot.hidden=true;this.section.hidden=false;
      this.update();
    }
    shell(){
      this.section.innerHTML='<div class="ef-bar"><div class="ef-options"></div><button type="button" data-ef-export></button></div><div class="ef-context"><span data-ef-scope></span><span data-ef-origin></span></div><p class="ef-status" role="status" hidden></p><div class="ef-scroll"><canvas data-ef-canvas role="img"></canvas></div><div class="ef-caption"><span data-ef-info></span><small data-ef-reference></small></div>';
      this.get('[data-ef-export]').textContent=word('png');
      this.get('canvas').onpointermove=e=>this.pointer(e,false);
      this.get('canvas').onpointerleave=()=>this.readout();
      this.get('canvas').oncontextmenu=e=>{
        const save=this.get('[data-ef-export]');
        window.NeuropixelsEventReview.exportMenu(e,this.section,save,()=>save.click());
      };
    }
    controls(){
      const host=this.get('.ef-options');host.replaceChildren();
      const button=(text,attr,val='')=>{const b=txt('button',text);b.setAttribute(attr,val);return b;};
      const {review,model}=this;
      if(this.panel==='J'||this.panel==='K'){
        const b=button(word(review.result.clusters?'unfit':'fit'),'data-ef-group');
        b.disabled=review.legacyOutcome;
        b.setAttribute('aria-pressed',String(!!review.result.clusters));host.append(b);
        host.append(txt('span',word('ref')+' · '+model.sides[0].label));
      }else if(this.panel==='L'){
        const details=document.createElement('details'),summary=txt('summary',word('unit')+' ('+this.units.length+')');
        details.className='ef-picker';
        const list=document.createElement('select');list.multiple=true;list.size=8;list.dataset.efUnits='';list.setAttribute('aria-label',word('unit'));
        const chosen=new Set(this.units);
        for(const id of model.unitIds)list.append(new Option(model.unitName(id),String(id),false,chosen.has(id)));
        const body=document.createElement('div');body.append(txt('small',word('select')),list);details.append(summary,body);host.append(details);
        model.sides.forEach((side,i)=>{
          const select=document.createElement('select');select.dataset.efTrial=i;
          side.events.forEach((e,k)=>select.append(new Option('#'+(k+1)+' · '+e.start.toFixed(3)+' s'+(e.trial?.sourceId!=null?' · '+word('gid')+' '+e.trial.sourceId:''),e.id,false,this.trials[i]===e.id)));
          const label=txt('label',side.label+' ');label.append(select);host.append(label);
          const jump=button(word('sample'),'data-ef-jump',i);
          jump.title=side.label+' · '+word('sample');host.append(jump);
        });
        if(this.units.length>pageSize){
          const prev=button('‹','data-ef-page','-1'),next=button('›','data-ef-page','1');
          prev.title=word('prev');next.title=word('more');prev.disabled=this.page===0;next.disabled=(this.page+1)*pageSize>=this.units.length;
          host.append(prev,txt('span',this.page+1+' / '+Math.ceil(this.units.length/pageSize)),next);
        }
      }else{
        const fields=(label,start,end,names)=>{
          const group=txt('span',label);group.className='ef-numbers';
          for(const [i,value] of [start,end].entries()){
            const input=document.createElement('input');input.type='number';input.step='any';input.name=names[i];input.value=rounded(value);
            input.setAttribute('aria-label',label+' · '+this.ui.t(i?'end':'start').replace(/\s*[（(].*?[）)]/g,''));input.min=rounded(model.start*1000);input.max=rounded(model.end*1000);
            if(i)group.append(' – ');group.append(input);
          }
          host.append(group);
        };
        fields(word('range'),this.msStart,this.msEnd,['efStartMs','efEndMs']);
        const label=document.createElement('label'),check=document.createElement('input');
        check.type='checkbox';check.name='efBaseline';check.checked=this.baseline;check.disabled=model.start>=0;
        label.append(check,' '+word('baseline'));host.append(label);
        if(this.baseline)fields(word('baseRange'),this.baseStart,this.baseEnd,['efBaseStartMs','efBaseEndMs']);
      }
    }
    update(controls=true){
      this.selectView(this.panel);
      this.get('[data-ef-scope]').textContent=this.heading();
      this.get('[data-ef-origin]').textContent=this.source.condition+' · '+this.source.onset;
      this.get('[data-ef-reference]').textContent=paper+' · Fig. 5'+this.panel;
      if(controls)this.controls();
      this.refresh();
    }
    async refresh(){
      this.pending?.abort();const controller=this.pending=new AbortController();
      const key=this.panel,review=this.review,model=this.model;
      const status=this.get('.ef-status'),canvas=this.get('canvas'),save=this.get('[data-ef-export]');
      canvas.hidden=true;save.disabled=true;this.exportData=null;this.hits=null;status.hidden=true;
      try{
        const ids=key==='M'?model.unitIds:key==='L'?this.units.slice(this.page*pageSize,(this.page+1)*pageSize):[];
        if(key==='L'&&!ids.length)throw Error(word('nosel'));
        const missing=ids.filter(id=>!this.trains.has(id)&&!review.times.has(id));
        if(missing.length){
          status.textContent=word('loading');status.hidden=false;
          const data=await review.readTrains(missing,controller.signal);
          if(controller.signal.aborted)return;
          for(const t of data)this.trains.set(t.unitId,t.spikes);
        }
        for(const id of ids)if(!this.trains.has(id))this.trains.set(id,review.times.get(id));
        const units=window.NeuropixelsEventUnitFigures;
        this.exportData=key==='L'?units.trialRaster(model,{unitIds:ids,eventIds:this.trials},this.trains):key==='M'?units.pairedRates(model,{start:this.msStart/1000,end:this.msEnd/1000,baseline:this.baseline?{start:this.baseStart/1000,end:this.baseEnd/1000}:null},this.trains):{};
        this.paint(canvas,false);
        canvas.hidden=false;save.disabled=false;status.hidden=true;this.readout();
      }catch(error){
        if(controller.signal.aborted)return;
        this.exportData=null;status.textContent=error.message;status.hidden=false;this.readout();
      }
    }
    hint(){return word(({J:'common',K:'Knote',L:'Lnote',M:'Mnote'})[this.panel]);}
    repaint(){if(this.active && this.exportData && this.section.getClientRects().length)this.paint(this.get('canvas'),false);}
    heading(){return [this.scope,this.model.unitIds.length+' Units',this.review.result.response.parameters.eventType,this.model.sides.map(s=>s.label+' '+s.events.length).join(' / ')].join(' · ');}
    readout(value){this.get('[data-ef-info]').textContent=value||this.hint();}
    paint(canvas,print){
      const key=this.panel,model=this.model,review=this.review,data=this.exportData,pop=window.NeuropixelsPopulationFigures;
      const width=print?1120:Math.max(560,Math.round(canvas.parentElement.clientWidth));
      const margin=print?24:8,plotWidth=width-2*margin;
      const h=key==='L'?Math.max(474,118+24*data.rows.length):'JK'.includes(key)?Math.max(474,pop.height(key,review,plotWidth)):474;
      const rect={x:margin,y:print?114:8,width:plotWidth,height:h},height=print?h+175:h+16;
      const dpr=print?2:Math.min(2,Math.max(1,devicePixelRatio));
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
      const light=print||document.documentElement.dataset.theme==='light',palette=window.NeuropixelsEventReview.plotPalette(print);
      const theme={light,palette};
      if(print){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);}
      const ink=light?'#162c39':'#e5eaed',sub=light?'#415764':'#c1cdd2';
      const line=(s,x,y,size,weight,color,max=1072)=>{ctx.fillStyle=color;ctx.font=weight+' '+size+'px "Segoe UI","Microsoft YaHei",sans-serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText(s,x,y,max);};
      const heading=this.heading();
      if(print){
        line('5'+key+'   '+word(key),24,36,26,650,ink);
        line(paper+'   ·   Fig. 5'+key,735,35,15,550,sub,360);
        line(heading,24,65,17,550,ink);
        line(this.source.condition+'    |    '+this.source.onset,24,91,15,400,sub);
        ctx.strokeStyle='#d6dfe1';ctx.beginPath();ctx.moveTo(24,103);ctx.lineTo(width-24,103);ctx.stroke();
      }
      ctx.save();
      let hit;
      if('JK'.includes(key))hit=pop.draw(key,{ctx,...rect,...theme},review);
      else if(key==='L')hit=window.NeuropixelsEventUnitFigures.drawL(ctx,rect,data,theme);
      else hit=window.NeuropixelsEventUnitFigures.drawM(ctx,rect,data,theme);
      ctx.restore();
      const notes=[this.hint()];
      if('JK'.includes(key))notes.push(review.result.clusters?word('refonly')+' · '+model.sides[0].label:word('pooled'));
      if(key==='L'&&this.units.length>pageSize)notes.push(word('page')+' '+(this.page*pageSize+1)+'–'+(this.page*pageSize+data.rows.length)+' / '+this.units.length);
      if(key==='M')notes.push('['+rounded(this.msStart)+', '+rounded(this.msEnd)+') ms'+(this.baseline?'  ·  '+word('baseRange')+' ['+rounded(this.baseStart)+', '+rounded(this.baseEnd)+') ms':''));
      if(print)line(notes.join('    ·    '),24,height-19,14,400,sub);
      if(!print){
        this.hits=hit;this.width=width;this.height=height;canvas.setAttribute('aria-label',['5'+key,word(key),heading,this.source.condition,this.source.onset,...notes].join(' · '));
      }
    }
    pointer(e,click){
      if(!this.hits)return;
      const canvas=this.get('canvas'),b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)*this.width/b.width,y=(e.clientY-b.top)*this.height/b.height;
      if(this.panel==='L'){
        const hit=this.hits.find(h=>x>=h.x&&x<=h.x+h.width&&y>=h.y&&y<=h.y+h.height);
        canvas.style.cursor=hit?'pointer':'default';
        if(hit){this.readout(word('sample')+' · '+this.model.sides[hit.side].label+' · '+hit.event.start.toFixed(5)+' s');if(click)this.jump(hit.side);}else this.readout();
      }else if(this.panel==='M'){
        let best,distance=7;
        for(const line of this.hits){
          const f=(x-line.x0)/(line.x1-line.x0);if(f<-.015||f>1.015)continue;
          const delta=Math.abs(line.y0+f*(line.y1-line.y0)-y);
          if(delta<distance){best=line;distance=delta;}
        }
        this.readout(best?best.name+' · '+best.values.map((v,i)=>this.model.sides[i].label+' '+v.toFixed(2)+' Hz').join(' / '):'');
      }else this.readout(this.hits?.hitTest?.(x,y));
    }
    change(e){
      const target=e.target;
      if(target.hasAttribute('data-ef-units')){
        this.units=[...target.selectedOptions].map(o=>Number(o.value));this.page=0;
        const picker=this.get('.ef-picker');picker.querySelector('summary').textContent=word('unit')+' ('+this.units.length+')';
        if(this.units.length>pageSize||this.get('[data-ef-page]')){this.controls();this.get('.ef-picker').open=true;this.get('[data-ef-units]').focus();}
        this.refresh();return;
      }
      if(target.hasAttribute('data-ef-trial'))this.trials[Number(target.dataset.efTrial)]=target.value;
      const key={efStartMs:'msStart',efEndMs:'msEnd',efBaseStartMs:'baseStart',efBaseEndMs:'baseEnd'}[target.name];
      if(key)this[key]=target.valueAsNumber;
      if(target.name==='efBaseline'){this.baseline=target.checked;this.controls();}
      this.refresh();
    }
    jump(side){
      const e=this.model.sides[side].events.find(e=>e.id===this.trials[side]);
      this.ui.jumpToEvent(this.units[this.page*pageSize]??this.model.unitIds[0],e);
    }
    click(e){
      if(e.target.matches('canvas')){this.pointer(e,true);return;}
      const b=e.target.closest('button');if(!b)return;
      if(b.hasAttribute('data-ef-jump'))this.jump(Number(b.dataset.efJump));
      else if(b.hasAttribute('data-ef-page')){this.page+=Number(b.dataset.efPage);this.update();}
      else if(b.hasAttribute('data-ef-group')){
        this.ui.toggleGrouping();
      }else if(b.hasAttribute('data-ef-export')&&this.exportData){
        const out=document.createElement('canvas');this.paint(out,true);
        const filename=(this.review.result.response.parameters.eventType+'-5'+this.panel+'.png').replace(/[<>:"/\\|?*]/g,'_');
        out.toBlob(blob=>{
          if(!blob){this.ui.status(word('failed'),true);return;}
          const url=URL.createObjectURL(blob),a=document.createElement('a');
          a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
        },'image/png');
      }
    }
    destroy(){this.pending?.abort();this.resize.disconnect();this.section.remove();this.bar.remove();this.trains?.clear();}
  }
  window.NeuropixelsEventFigures=EventFigures;
})();
