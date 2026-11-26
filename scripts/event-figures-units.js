// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const {lowerBound}=globalThis.NeuropixelsEventAnalysis;
  const words={
    en:{trial:'Trial',time:'Time from event onset (s)',rate:'Mean firing rate (Hz)',response:'Response',baseline:'Pre-event baseline',higher:'higher',lower:'lower',equal:'equal',missing:'Read the original spike times for the selected Units.',bounds:'Choose a window within the analyzed response interval.',pre:'The baseline must end at or before 0 s.',choose:'Choose one trial per condition and at least one Unit.'},
    'zh-CN':{trial:'试次',time:'距事件起点时间（秒）',rate:'平均放电率（Hz）',response:'响应窗',baseline:'事件前基线',higher:'更高',lower:'更低',equal:'相同',missing:'请读取所选 Unit 的原始 spike 时刻。',bounds:'请选择分析响应区间内的时间窗。',pre:'基线窗口终点应在 0 秒或之前。',choose:'请每个条件各选一次事件，并选择至少一个 Unit。'},
    es:{trial:'Ensayo',time:'Tiempo desde el inicio del evento (s)',rate:'Frecuencia media (Hz)',response:'Respuesta',baseline:'Línea basal previa',higher:'mayor',lower:'menor',equal:'igual',missing:'Lee los tiempos de spike de las unidades elegidas.',bounds:'Elige una ventana dentro del intervalo analizado.',pre:'La línea basal debe terminar en 0 s o antes.',choose:'Elige un ensayo por condición y al menos una unidad.'}
  };
  const copy=lang=>words[lang]||words.en;
  const compact=v=>Number(v.toPrecision(5)).toString();
  function trainFor(trains,id,lang){
    const train=trains.get(id);
    if(!train)throw Error(copy(lang).missing);
    return train;
  }
  function trialRaster(model,{unitIds,eventIds},trains){
    const {lang,start,end}=model;
    if(!unitIds.length||eventIds.length!==2||model.sides.length!==2)throw Error(copy(lang).choose);
    const sides=model.sides.map(({label,events},i)=>{
      const index=events.findIndex(event=>event.id===eventIds[i]);
      if(index<0)throw Error(copy(lang).choose);
      return {label,event:events[index],trialNumber:index+1};
    });
    const rows=Array.from(unitIds,unitId=>{
      const train=trainFor(trains,unitId,lang);
      const spikes=sides.map(({event})=>{
        const from=lowerBound(train,event.start+start),to=lowerBound(train,event.start+end);
        return Array.from(train.subarray?train.subarray(from,to):train.slice(from,to),t=>t-event.start);
      });
      return {unitId,name:model.unitName(unitId),spikes};
    });
    return {lang,start,end,sides,rows};
  }
  function pairedRates(model,{start,end,baseline=null},trains){
    const {lang}=model;
    for(const window of baseline?[{start,end},baseline]:[{start,end}]){
      if(!Number.isFinite(window.start)||!Number.isFinite(window.end)||!(window.start<window.end)
        ||window.start<model.start||window.end>model.end)throw Error(copy(lang).bounds);
    }
    if(baseline && baseline.end>0)throw Error(copy(lang).pre);
    if(!model.unitIds.length || model.sides.length!==2 || model.sides.some(s=>!s.events.length))throw Error(copy(lang).choose);
    const change={higher:0,lower:0,equal:0};
    const sides=model.sides.map(s=>({label:s.label,n:s.events.length}));
    const rows=Array.from(model.unitIds,unitId=>{
      const train=trainFor(trains,unitId,lang);
      const rates=(a,b)=>model.sides.map(({events})=>{
        let count=0;
        for(const event of events)count+=lowerBound(train,event.start+b)-lowerBound(train,event.start+a);
        return count/events.length/(b-a);
      });
      const rateHz=rates(start,end);
      change[rateHz[1]>rateHz[0]?'higher':rateHz[1]<rateHz[0]?'lower':'equal']++;
      return {unitId,name:model.unitName(unitId),rateHz,baselineHz:baseline?rates(baseline.start,baseline.end):null};
    });
    return {lang,start,end,baseline,sides,rows,change};
  }
  const font='"Segoe UI", "Microsoft YaHei", sans-serif';
  function text(ctx,value,x,y,color,size=15,align='left',weight=400,maxWidth){
    ctx.fillStyle=color;ctx.font=weight+' '+size+'px '+font;ctx.textAlign=align;ctx.textBaseline='middle';
    if(maxWidth)ctx.fillText(value,x,y,maxWidth);else ctx.fillText(value,x,y);
  }
  function line(ctx,x1,y1,x2,y2,color,width=1){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  function ink(theme){
    return theme.light?{text:'#222e37',sub:'#53616a',grid:'#d9e0e4',pair:'#6e7884'}:
      {text:'#e6e9eb',sub:'#bac2c6',grid:'#434a50',pair:'#a2a9b2'};
  }
  function drawL(ctx,rect,result,theme){
    const {sides,rows,start,end,lang}=result, w=copy(lang),p=ink(theme),colors=theme.palette.series;
    ctx.save();
    ctx.font='14px '+font;
    const nameWidth=rows.reduce((width,row)=>Math.max(width,ctx.measureText(row.name).width),0);
    const labelWidth=Math.max(70,Math.min(rect.width*.24,nameWidth+18));
    const gap=26,panel=(rect.width-labelWidth-gap-8)/2,left=rect.x+labelWidth;
    const top=rect.y+65,bottom=rect.y+rect.height-59,rowHeight=(bottom-top)/rows.length;
    const stride=Math.max(1,Math.ceil(16/rowHeight));
    text(ctx,'Unit',left-11,top-16,p.sub,14,'right',600);
    rows.forEach((row,i)=>{
      if(i%stride===0)text(ctx,row.name,left-11,top+(i+.5)*rowHeight,p.text,14,'right',400,labelWidth-12);
    });
    const targets=sides.map((side,k)=>{
      const x=left+k*(panel+gap),scale=t=>x+(t-start)/(end-start)*panel;
      text(ctx,side.label,x,rect.y+13,colors[k],20,'left',600,panel);
      const trial=side.event.trial, sourceId=trial?.sourceTable==='intervals/trials' && trial.sourceId!=null?'  ·  NWB trial ID '+trial.sourceId:'';
      text(ctx,w.trial+' '+side.trialNumber+'  ·  '+side.event.start.toFixed(3)+' s'+sourceId,x,rect.y+39,p.sub,14,'left',400,panel);
      line(ctx,x,top,x+panel,top,p.grid);
      rows.forEach((row,i)=>{
        const y=top+(i+.5)*rowHeight,h=Math.min(12,rowHeight*.37);
        if(rowHeight>=10)line(ctx,x,top+(i+1)*rowHeight,x+panel,top+(i+1)*rowHeight,p.grid,.7);
        ctx.fillStyle=colors[k];
        for(const t of row.spikes[k])ctx.fillRect(Math.min(x+panel-1,Math.max(x,scale(t)-.55)),y-h,1.12,2*h);
      });
      if(start<=0 && end>=0){
        ctx.setLineDash([3,4]);line(ctx,scale(0),top-2,scale(0),bottom,theme.palette.onset);ctx.setLineDash([]);
      }
      line(ctx,x,bottom,x+panel,bottom,p.sub);
      const ticks=[start,end];if(start<0 && end>0)ticks.push(0);
      for(const t of ticks){
        const at=scale(t);
        line(ctx,at,bottom,at,bottom+5,p.sub);
        if(t!==0 && start<0 && end>0 && Math.abs(at-scale(0))<32)continue;
        text(ctx,compact(t),at,bottom+17,t===0?p.text:p.sub,14,t===start?'left':t===end?'right':'center',t===0?650:400);
      }
      return {x,y:rect.y,width:panel,height:bottom-rect.y,event:side.event,side:k};
    });
    text(ctx,w.time,left+(2*panel+gap)/2,bottom+43,p.sub,15,'center');
    ctx.restore();return targets;
  }
  function drawM(ctx,rect,result,theme){
    const {rows,sides,change,lang}=result,p=ink(theme),w=copy(lang),colors=theme.palette.series;
    const windows=[{name:w.response,start:result.start,end:result.end,field:'rateHz'}];
    if(result.baseline)windows.push({name:w.baseline,...result.baseline,field:'baselineHz'});
    const xmax=rows.reduce((maximum,row)=>Math.max(maximum,...row.rateHz,...(row.baselineHz||[])),1);
    const power=10**Math.floor(Math.log10(xmax/5)),raw=xmax/5/power;
    const step=(raw<=1?1:raw<=2?2:raw<=5?5:10)*power,levels=Math.ceil(xmax/step),ymax=levels*step;
    const top=rect.y+69,bottom=rect.y+rect.height-87,yp=v=>bottom-(bottom-top)*v/ymax;
    const left=rect.x+52,gap=52,panel=(rect.width-72-(windows.length-1)*gap)/windows.length;
    const hits=[];
    ctx.save();
    text(ctx,w.rate,rect.x+5,rect.y+13,p.sub,15);
    windows.forEach((window,k)=>{
      const x=left+k*(panel+gap),x0=x+panel*.18,x1=x+panel*.82;
      text(ctx,window.name+'  ·  '+compact(window.start*1000)+' … '+compact(window.end*1000)+' ms',x+panel/2,rect.y+39,p.text,18,'center',600,panel);
      for(let t=0;t<=levels;t++){
        const y=yp(t*step);line(ctx,x,y,x+panel,y,p.grid,.9);
        text(ctx,compact(t*step),x-8,y,p.sub,13,'right');
      }
      const links=rows.map((row,i)=>{
        const values=row[window.field],offset=rows.length===1?0:(((i*.61803398875+.5)%1)-.5)*Math.min(16,panel*.05);
        return {unitId:row.unitId,name:row.name,values,baseline:k>0,x0:x0+offset,x1:x1+offset,y0:yp(values[0]),y1:yp(values[1])};
      });
      ctx.globalAlpha=rows.length>15?.25:.6;
      for(const link of links)line(ctx,link.x0,link.y0,link.x1,link.y1,p.pair,1);
      ctx.globalAlpha=rows.length>15?.72:1;
      for(const link of links){
        for(let side=0;side<2;side++){
          ctx.fillStyle=colors[side];ctx.beginPath();ctx.arc(side?link.x1:link.x0,side?link.y1:link.y0,rows.length>30?2.45:3.25,0,Math.PI*2);ctx.fill();
        }
        hits.push(link);
      }
      ctx.globalAlpha=1;
      sides.forEach((side,i)=>{
        const center=i?x1:x0;
        text(ctx,side.label,center,bottom+22,colors[i],17,'center',600,panel*.45);
        text(ctx,'n = '+side.n,center,bottom+42,p.sub,14,'center');
      });
    });
    const delta=sides[1].label+' − '+sides[0].label;
    text(ctx,delta+'    ↑ '+change.higher+' '+w.higher+'     ↓ '+change.lower+' '+w.lower+'     = '+change.equal+' '+w.equal,
      rect.x+rect.width/2,rect.y+rect.height-11,p.text,15,'center',500,rect.width-12);
    ctx.restore();return hits;
  }
  globalThis.NeuropixelsEventUnitFigures={trialRaster,pairedRates,drawL,drawM};
})();
