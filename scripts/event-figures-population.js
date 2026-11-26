// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const copy = {
    en: {pair:'Choose two conditions that both contain trials.', all:'All Units', row:'Row', time:'Time from event onset (s)', baseline:'Within-condition change from pre-event mean (ΔHz)', rate:'Firing rate (Hz)', trial:'trials'},
    'zh-CN': {pair:'请选择两个均含试次的条件。', all:'全部 Unit', row:'行', time:'相对事件起点的时间（秒）', baseline:'相对各条件事件前均值的变化（ΔHz）', rate:'放电率（Hz）', trial:'次事件'},
    es: {pair:'Elige dos condiciones que tengan ensayos.', all:'Todas las unidades', row:'Fila', time:'Tiempo desde el evento (s)', baseline:'Cambio respecto a la media previa de cada condición (ΔHz)', rate:'Frecuencia de disparo (Hz)', trial:'ensayos'}
  };
  const words = () => copy[document.documentElement.lang] || copy.en;
  const num = value => String(Number(value.toPrecision(4))).replace('-', '−');
  const cols = (groups, width) => groups > 1 && width >= 650 ? 2 : 1;
  function height(panel, review, width=1072) {
    const view = review.views.get(review.ref) || review.views.values().next().value;
    if (!view) return 474;
    const {groups, unitOrder} = view.summary;
    return panel === 'J' ? Math.max(474, 106 + unitOrder.length, 112 + groups.length * 33)
      : Math.max(474, 58 + Math.ceil(groups.length / cols(groups.length, width)) * 193);
  }
  function text(ctx, value, x, y, size, color, align='left', weight=400, maxWidth=Infinity) {
    ctx.fillStyle=color; ctx.textAlign=align; ctx.font=weight+' '+size+'px system-ui,sans-serif';
    if(Number.isFinite(maxWidth))ctx.fillText(value,x,y,maxWidth);else ctx.fillText(value,x,y);
  }
  function line(ctx, x1, y1, x2, y2, color, weight=1, dash=[]) {
    ctx.strokeStyle=color; ctx.lineWidth=weight; ctx.setLineDash(dash); ctx.beginPath();
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]);
  }
  function stepAbove(value) {
    const power=10**Math.floor(Math.log10(value)), normalized=value/power;
    return ([1,2,5,10].find(step=>step>=normalized)||10)*power;
  }
  function timeAxis(surface, plot, params) {
    const {ctx, ink, muted, grid, palette}=surface, {x,y,w,h}=plot, {start,end}=params;
    const fraction=window.NeuropixelsEventAnalysis.onsetFraction(params);
    const zeroX=fraction==null?null:x+fraction*w;
    line(ctx,x,y+h,x+w,y+h,grid);
    if(zeroX!==null)line(ctx,zeroX,y,zeroX,y+h,palette.onset,1.3,[4,4]);
    const candidates=[start,end],step=stepAbove((end-start)/4);
    for(let i=Math.ceil(start/step);i*step<end;i++)candidates.push(i*step);
    const used=[];
    const tick=(t,primary)=>{
      const dx=(t-start)*w/(end-start),xx=x+dx;
      if(used.some(v=>Math.abs(v-xx)<48))return;
      used.push(xx);line(ctx,xx,y+h,xx,y+h+3,grid);
      text(ctx,num(t),xx,y+h+19,13,primary?ink:muted,dx<16?'left':w-dx<16?'right':'center',primary?650:400);
    };
    if(zeroX!==null)tick(0,true);
    for(const t of candidates)tick(t,false);
  }
  function groupName(review,g) {return review.result.clusters?review.groupName(g):words().all;}
  function groupColor(review,g,palette) {
    return review.result.clusters && g.cluster!=null ? palette.series[(g.cluster+2)%palette.series.length] : palette.unassigned;
  }
  function binAt(plot,x,bins) {return Math.max(0,Math.min(bins-1,Math.floor((x-plot.x)*bins/plot.w)));}
  function inPlot(plot,x,y) {return x>=plot.x && x<plot.x+plot.w && y>=plot.y && y<plot.y+plot.h;}
  function binLabel(v,b) {return '['+num(v.response.binEdges[b])+', '+num(v.response.binEdges[b+1])+') s';}
  function heatmaps(surface,review,views,names) {
    const {ctx,x,y,width,height,ink,muted,grid,palette}=surface, wds=words();
    const {unitOrder,groups}=views[0].summary, clustered=!!review.result.clusters;
    const gutter=clustered?160:145, gap=24, w=Math.floor((width-gutter-gap-10)/2);
    const plots=views.map((v,i)=>({x:x+gutter+i*(w+gap),y:y+37,w,h:height-107}));
    const top=plots[0].y, rh=plots[0].h/unitOrder.length;
    const byUnit=new Map(), groupsWithBounds=[];
    let row=0;
    for(const group of groups){
      groupsWithBounds.push({group,from:row,to:row+group.unitIds.length});
      for(const id of group.unitIds)byUnit.set(id,group);
      row+=group.unitIds.length;
    }
    for(const [i,plot] of plots.entries()){
      const v=views[i], r=v.response;
      text(ctx,names[i],plot.x,top-12,21,ink,'left',650,w);
      for(let j=0;j<unitOrder.length;j++){
        const index=review.lookup.get(unitOrder[j]),y1=Math.round(j*rh),y2=Math.round((j+1)*rh);
        window.NeuropixelsEventReview.heatRow(r,index,v.offsets[index],review.scale,palette,w,(col,n,rgb)=>{
          const from=Math.round(col*w/n),to=Math.round((col+1)*w/n);
          ctx.fillStyle='rgb('+rgb.join(',')+')';
          ctx.fillRect(plot.x+from,top+y1,to-from,y2-y1);
        });
      }
      for(const {group,from,to} of groupsWithBounds){
        if(!clustered)break;
        const y1=top+Math.round(from*rh),y2=top+Math.round(to*rh);
        ctx.fillStyle=groupColor(review,group,palette); ctx.fillRect(plot.x-5,y1,4,y2-y1);
        if(from)line(ctx,plot.x,y1,plot.x+w,y1,grid,1);
      }
      timeAxis(surface,plot,r.parameters);
    }
    // Place group names outside the heatmap so even one-row groups keep a legible label.
    if(clustered){
      const maxY=top+plots[0].h, pad=23;
      let previous=top-pad/2;
      for(const [i,{group,from,to}] of groupsWithBounds.entries()){
        const mid=top+(from+to)*rh/2;
        const yy=Math.min(maxY-(groups.length-i-1)*pad-9,Math.max(mid,previous+pad,top+8));
        previous=yy;
        const color=groupColor(review,group,palette);
        line(ctx,x+84,yy,x+92,mid,color);
        text(ctx,groupName(review,group),x+4,yy+4,14,ink,'left',600,75);
      }
    }
    text(ctx,clustered?wds.row:'Unit',x+gutter-13,top-12,14,muted,'right',550);
    const stride=Math.max(1,Math.ceil(35/rh));
    for(let j=0;j<unitOrder.length;j+=stride){
      const yy=top+(j+.5)*rh;
      text(ctx,clustered?String(j+1):review.ui.unitName(unitOrder[j]),x+gutter-12,Math.max(top+10,yy+4),12,muted,'right',400,gutter-17);
    }
    const bottom=top+plots[0].h;
    text(ctx,wds.time,x+gutter+(width-gutter)/2,bottom+40,14,muted,'center');
    const keyX=x+width-222,keyY=y+height-11,keyW=160;
    text(ctx,review.subtract?wds.baseline:wds.rate,keyX-42,keyY+5,14,muted,'right');
    const grad=ctx.createLinearGradient(keyX,0,keyX+keyW,0);
    grad.addColorStop(0,review.subtract?palette.negative:palette.neutral);
    if(review.subtract)grad.addColorStop(.5,palette.neutral);
    grad.addColorStop(1,palette.positive);
    ctx.fillStyle=grad; ctx.fillRect(keyX,keyY-6,keyW,10);
    text(ctx,review.subtract?'≤ −'+num(review.scale):'0',keyX-6,keyY+5,13,muted,'right');
    if(review.subtract)text(ctx,'0',keyX+keyW/2,keyY-10,12,muted,'center');
    text(ctx,'≥ '+num(review.scale),keyX+keyW+6,keyY+5,13,muted);
    return {hitTest(px,py){
      const plot=plots.find(p=>inPlot(p,px,py)); if(!plot)return '';
      const id=unitOrder[Math.floor((py-top)/rh)],u=review.lookup.get(id),b=binAt(plot,px,views[0].response.shape[2]);
      const values=views.map((v,i)=>{
        const hz=v.response.rateHz[u*v.response.shape[2]+b],delta=hz-v.offsets[u];
        return review.conditionName(review.comparison.values[i])+' '+num(hz)+' Hz'+(review.subtract?' ('+num(delta)+' ΔHz)':'');
      });
      return [review.ui.unitName(id),groupName(review,byUnit.get(id)),binLabel(views[0],b),...values].join(' · ');
    }};
  }
  function means(surface,review,views,names) {
    const {ctx,x,y,width,height,ink,muted,grid,palette}=surface,wds=words();
    const groups=views[0].summary.groups,other=new Map(views[1].summary.groups.map(g=>[g.cluster,g]));
    const ncol=cols(groups.length,width),nrow=Math.ceil(groups.length/ncol),gap=35;
    const cellWidth=(width-gap*(ncol-1))/ncol, cellHeight=(height-54)/nrow;
    let keyX=x+3;
    names.forEach((name,i)=>{
      line(ctx,keyX,y+12,keyX+35,y+12,palette.series[i],3,i?[8,4]:[]);
      text(ctx,name,keyX+46,y+17,16,ink,'left',550,width/2-57);
      keyX+=Math.min(width/2,ctx.measureText(name).width+76);
    });
    const tick=stepAbove(Math.max(1,review.maxGroupHz)/4),maxHz=Math.ceil(review.maxGroupHz/tick)*tick;
    const entries=groups.map((group,i)=>{
      const xx=x+(i%ncol)*(cellWidth+gap), yy=y+42+Math.floor(i/ncol)*cellHeight;
      const p={x:xx+44,y:yy+23,w:cellWidth-55,h:cellHeight-64};
      const curves=[group.meanRateHz,other.get(group.cluster).meanRateHz];
      ctx.fillStyle=groupColor(review,group,palette);ctx.fillRect(xx+4,yy+1,4,14);
      text(ctx,groupName(review,group)+'  ·  '+group.unitIds.length+' Units',xx+16,yy+14,16,ink,'left',650);
      text(ctx,'Hz',p.x+p.w,yy+15,12,muted,'right');
      for(let k=0;k<=Math.round(maxHz/tick);k++){
        const hz=k*tick,py=p.y+p.h*(1-hz/maxHz);
        line(ctx,p.x,py,p.x+p.w,py,grid);
        text(ctx,num(hz),p.x-8,py+4,12,muted,'right');
      }
      timeAxis(surface,p,views[0].response.parameters);
      curves.forEach((curve,side)=>{
        ctx.strokeStyle=palette.series[side]; ctx.fillStyle=palette.series[side]; ctx.lineWidth=2.5;
        ctx.setLineDash(side?[7,4]:[]); ctx.beginPath();
        curve.forEach((hz,b)=>{
          const px=p.x+(b+.5)*p.w/curve.length,py=p.y+p.h*(1-hz/maxHz);
          if(curve.length===1)ctx.fillRect(px-2,py-2,4,4);
          else if(b)ctx.lineTo(px,py);else ctx.moveTo(px,py);
        });
        ctx.stroke();ctx.setLineDash([]);
      });
      return {p,curves,group};
    });
    text(ctx,wds.time,x+width/2,y+height-1,14,muted,'center');
    return {hitTest(px,py){
      const entry=entries.find(({p})=>inPlot(p,px,py));if(!entry)return '';
      const b=binAt(entry.p,px,entry.curves[0].length);
      const c=review.comparison.values.map(value=>review.conditionName(value)), vals=entry.curves.map(curve=>curve[b]);
      return [groupName(review,entry.group),binLabel(views[0],b),...vals.map((hz,i)=>c[i]+' '+num(hz)+' Hz'),c[1]+' − '+c[0]+' = '+num(vals[1]-vals[0])+' Hz'].join(' · ');
    }};
  }
  function draw(panel,surface,review) {
    const views=review.comparison?.values.map(value=>review.views.get(value));
    if(views?.length!==2 || views.some(v=>!v))throw Error(words().pair);
    const names=views.map((v,i)=>review.conditionName(review.comparison.values[i])+'  ·  '+v.response.shape[1]+' '+words().trial);
    const s={ink:surface.light?'#24333b':'#e5e9ed',muted:surface.light?'#52616a':'#b3bdc4',grid:surface.light?'#c9d0d4':'#50595e',...surface};
    s.ctx.save();
    try {return panel==='J'?heatmaps(s,review,views,names):means(s,review,views,names);}
    finally {s.ctx.restore();}
  }
  window.NeuropixelsPopulationFigures={draw,height};
})();
