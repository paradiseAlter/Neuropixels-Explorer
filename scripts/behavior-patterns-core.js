// SPDX-License-Identifier: MIT
(function (root, factory) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const npy = node ? require('./kilosort-core.js') : root.NeuropixelExplorerCore;
  const events = node ? require('./event-analysis-core.js') : root.NeuropixelsEventAnalysis;
  const api = factory(npy.parseNpyHeaderBuffer, events);
  api.workerSource = () => events.workerSource() +
    '\nconst patterns=(' + factory.toString() + ')(' + npy.parseNpyHeaderBuffer.toString() + ',EventAnalysis);' +
    '\nlet session; self.onmessage=async({data:m})=>{const send=x=>self.postMessage({...x,action:m.action,requestId:m.requestId});' +
    'try{if(m.action==="compute"){session=null;session=await patterns.compute(m,p=>send({progress:p}));send({result:session.result});}' +
    'else if(m.action==="detail")send({detail:patterns.detail(session,m)});' +
    'else if(m.action==="query")send({query:patterns.query(session,m)});' +
    'else if(m.action==="recurrence")send({recurrence:patterns.recurrence(session,m)});' +
    'else if(m.action==="preview")send({preview:patterns.preview(session,m)});' +
    'else throw Error("Unknown pattern action");}catch(e){send({error:e.message});}};';
  if (node) module.exports = api;
  else root.NeuropixelsBehaviorPatterns = api;
})(globalThis, function buildPatterns(parseNpyHeaderBuffer, EA) {
  'use strict';
  const blockSize = 4096;
  const indexBudget=joint=>(joint?512:256)*1024*1024;
  function indexUnitIds(catalog,selected,spikeCount,joint){
    const fits=catalog.length<=2048 && !(8*(spikeCount+catalog.length*(blockSize-1))>indexBudget(joint));
    if(fits)return catalog;
    const picked=new Set(selected);
    return catalog.filter(id=>picked.has(id));
  }
  const check = (condition, message) => { if (!condition) throw Error(message); };
  const positive = value => Number.isFinite(value) && value > 0;
  const overlaps = (a, b, c, d) => a < d && c < b;
  const sum = a => a.reduce((v, x) => v + x, 0);

  async function header(file) {
    check(file && typeof file.slice === 'function' && file.size >= 10, 'Missing or truncated spike file');
    const prefix = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    check([1,2,3].includes(prefix[6]), 'Unsupported NPY version');
    const view = new DataView(prefix.buffer);
    const len = prefix[6] === 1 ? view.getUint16(8,true) : view.getUint32(8,true);
    check(len <= 1048576, 'NPY header exceeds limit');
    const h = parseNpyHeaderBuffer(await file.slice(0, (prefix[6]===1?10:12)+len).arrayBuffer());
    check((h.shape.length===1 || (h.shape.length===2 && h.shape[1]===1)) && Number.isSafeInteger(h.count) &&
      h.dataOffset+h.count*h.itemSize===file.size, 'Invalid spike vector shape or length');
    return h;
  }
  // Keep sorted times in typed blocks per Unit. A single pass indexes the files;
  // subsequent event queries never retain the all-Unit × all-trial tensor.
  async function spikeIndex(m, progress) {
    check(positive(m.sampleRate), 'Invalid sample rate');
    const unitIds = m.unitIds;
    check(Array.isArray(unitIds) && unitIds.length && unitIds.length<=2048 &&
      unitIds.every(Number.isSafeInteger) && new Set(unitIds).size===unitIds.length, 'Invalid or duplicate Units');
    const headers = await Promise.all([header(m.times),header(m.clusters)]);
    const [a,b] = headers;
    check(a.count===b.count && /[iu][1248]$/.test(b.descr), 'Unpaired spike times and Unit IDs');
    const arrays = {i1:Int8Array,u1:Uint8Array,i2:Int16Array,u2:Uint16Array,i4:Int32Array,u4:Uint32Array,
      i8:BigInt64Array,u8:BigUint64Array,f4:Float32Array,f8:Float64Array};
    async function chunk(file,h,start,end) {
      const type=h.descr.slice(1), ctor=arrays[type];
      check(ctor && ['<','>','=','|'].includes(h.descr[0]), 'Unsupported spike dtype');
      const raw=await file.slice(h.dataOffset+start*h.itemSize,h.dataOffset+end*h.itemSize).arrayBuffer();
      check(raw.byteLength===(end-start)*h.itemSize,'Truncated spike data');
      if(h.descr[0]==='>' && h.itemSize>1) {
        const bytes=new Uint8Array(raw);
        for(let i=0;i<bytes.length;i+=h.itemSize) bytes.subarray(i,i+h.itemSize).reverse();
      }
      return new ctor(raw);
    }
    const trains=new Map(unitIds.map(id=>[id,{count:0,blocks:[]}]));
    const integerTime=a.descr[1]!=='f';
    let blocks=0, previous=-Infinity;
    const budget=indexBudget(m.jointProbes);
    for(let off=0;off<a.count;off+=262144){
      const end=Math.min(a.count,off+262144);
      const [ticks,ids]=await Promise.all([chunk(m.times,a,off,end),chunk(m.clusters,b,off,end)]);
      for(let i=0;i<ticks.length;i++){
        const sample=Number(ticks[i]), id=Number(ids[i]);
        const time=sample/m.sampleRate;
        check((!integerTime || Number.isSafeInteger(sample)) && Number.isFinite(time) && time>=0 && time>=previous &&
          Number.isSafeInteger(id),'Invalid or unsorted spike samples/Unit IDs');
        previous=time;
        const tr=trains.get(id);
        if(!tr) continue;
        if(tr.count%blockSize===0){
          check(++blocks*blockSize*8<=budget,'Spike index memory is full. Select fewer Units.');
          tr.blocks.push(new Float64Array(blockSize));
        }
        tr.blocks[tr.blocks.length-1][tr.count++%blockSize]=time;
      }
      progress(.62*end/a.count);
    }
    return {trains,lastSpike:previous};
  }
  const at=(tr,i)=>tr.blocks[Math.floor(i/blockSize)][i%blockSize];
  function lower(tr,t) {
    let lo=0,hi=tr.count;
    while(lo<hi){const mid=(lo+hi)>>>1;if(at(tr,mid)<t)lo=mid+1;else hi=mid;}
    return lo;
  }
  function countBins(tr, anchor, first, width, bins, output, offset=0) {
    const origin=anchor+first, end=anchor+(first+bins*width);
    check(end>origin && origin+width>origin,'Time precision is insufficient for the bin width');
    let i=lower(tr,origin);
    for(;i<tr.count;i++){
      const time=at(tr,i);
      if(time>=end)break;
      let b=Math.max(0,Math.min(bins-1,Math.floor((time-origin)/width)));
      if(b>0 && time<anchor+(first+b*width)) b--;
      else if(b+1<bins && time>=anchor+(first+(b+1)*width)) b++;
      output[offset+b]++;
    }
  }
  function coverageInfo(m) {
    if(m.coverage===null)return {origin:'unknown-continuous-assumption',intervals:null,missingUnitIds:m.unitIds.slice()};
    if(Array.isArray(m.coverage))return {origin:'user-declared',intervals:EA.validateCoverage(m.coverage),missingUnitIds:[]};
    const proof=EA.commonCoverage(m.coverage,m.unitIds,m.recordingId,{allowMissing:true});
    return {origin:proof.intervals?(proof.missingUnitIds.length?'partial-source':'source-reported'):'unknown-continuous-assumption',
      intervals:proof.intervals,missingUnitIds:proof.missingUnitIds};
  }
  function inDomain(s,a,b) {
    if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||a<0||b>s.duration)return false;
    const intervals=s.coverage.intervals;
    if(intervals===null)return true;
    let lo=0,hi=intervals.length;
    while(lo<hi){const mid=(lo+hi)>>>1;if(intervals[mid][1]<=a)lo=mid+1;else hi=mid;}
    return lo<intervals.length && intervals[lo][0]<=a && b<=intervals[lo][1];
  }
  function groupEvents(input,o) {
    check(Array.isArray(input) && input.length<=100000,'Invalid or oversized event input');
    const seen=new Set();
    const ordered=input.map(e=>{
      check(typeof e?.id==='string' && e.id.length && !seen.has(e.id),'Missing or duplicate event ID');
      seen.add(e.id);
      check(Number.isFinite(e.start)&&e.start>=0&&(e.end==null||(Number.isFinite(e.end)&&e.end>=e.start)),'Invalid event time');
      return {...e};
    }).sort((a,b)=>a.start-b.start);
    const bouts=[],lastByTrack=new Map();
    for(const e of ordered) {
      const track=JSON.stringify([e.subject??null,e.track??null,e.schemeId??null,e.type??null]);
      let bout=lastByTrack.get(track);
      if(!bout || e.start-bout.end>o.boutGap){
        bout={id:bouts.length,start:e.start,end:e.start,events:[]};bouts.push(bout);
        lastByTrack.set(track,bout);
      }
      bout.end=Math.max(bout.end,e.end??e.start);bout.events.push(e);
    }
    const rows=[];
    for(const bout of bouts){
      let reps=bout.events;
      if(o.boutsOnly){
        const last=bout.events.reduce((a,b)=>(b.end??b.start)>=(a.end??a.start)?b:a);
        reps=[o.anchor==='end'?last:bout.events[0]];
      }
      for(const e of reps){
        const anchor=o.anchor==='end'?(o.boutsOnly?bout.end:(e.end??e.start)):
          o.anchor==='center'?(o.boutsOnly?(bout.start+bout.end)/2:(e.start+(e.end??e.start))/2):e.start;
        rows.push({...e,anchor,boutId:bout.id,boutStart:bout.start,boutEnd:bout.end,boutSize:bout.events.length});
      }
    }
    return {rows:rows.sort((a,b)=>a.anchor-b.anchor),bouts};
  }
  async function compute(m,progress=()=>{}) {
    const o={before:1,after:1,bin:.05,boutGap:1,boutsOnly:true,anchor:'start',...m.options};
    check(positive(o.before)&&positive(o.after)&&positive(o.bin)&&Number.isFinite(o.boutGap)&&o.boutGap>=0,'Invalid response window or bout gap');
    check(['start','end','center'].includes(o.anchor),'Unsupported alignment');
    const bins=Math.round((o.before+o.after)/o.bin), pre=Math.round(o.before/o.bin);
    check(bins>=2&&bins<=2000&&pre>0&&pre<bins&&Math.abs(pre*o.bin-o.before)<1e-8*o.bin &&
      Math.abs(bins*o.bin-o.before-o.after)<1e-8*o.bin,'Pre/post windows must contain whole bins');
    const coverage=coverageInfo(m);
    const labels=groupEvents(m.events,o), others=groupEvents(m.otherEvents||[],o);
    const index=await spikeIndex(m,progress);
    const duration=m.duration??Math.max(0,index.lastSpike);
    check(positive(duration),'A finite neural time domain is required');
    const s={...index,duration,coverage,o,labels,other:others.rows};
    const groups={raw:m.events.length,bouts:labels.bouts.length,eligible:0,excluded:[]};
    const events=labels.rows.filter(e=>{
      if(inDomain(s,e.anchor-o.before,e.anchor+o.after))return true;
      groups.excluded.push({eventId:e.id,reason:'outside time domain or known coverage'});return false;
    });
    check(m.unitIds.length*events.length<=5000000,'Too many Units × event windows; select fewer Units or group events into bouts');
    groups.eligible=events.length;
    // Keep every event from a given bout in the same chronological partition.
    const eligibleBouts=[...new Set(events.map(e=>e.boutId))].sort((a,b)=>a-b);
    const split=Math.ceil(eligibleBouts.length/2), early=new Set(eligibleBouts.slice(0,split));
    groups.earlyBouts=split; groups.lateBouts=eligibleBouts.length-split;
    groups.earlyEvents=events.reduce((n,e)=>n+early.has(e.boutId),0);groups.lateEvents=events.length-groups.earlyEvents;
    const cells=m.unitIds.length*bins;
    const meanHz=new Float64Array(cells), earlyDeltaHz=new Float64Array(cells),lateDeltaHz=new Float64Array(cells),deltaHz=new Float64Array(cells);
    const countsByUnit=new Float64Array(m.unitIds.length), baselineHz=new Float64Array(m.unitIds.length);
    function center(vector,offset,n) {
      const scale=n*o.bin;
      let baseline=0;
      for(let b=0;b<pre;b++) baseline+=vector[offset+b];
      baseline/=n*o.before;
      for(let b=0;b<bins;b++)vector[offset+b]=n?vector[offset+b]/scale-baseline:NaN;
      return baseline;
    }
    for(let u=0;u<m.unitIds.length;u++){
      const train=s.trains.get(m.unitIds[u]), at=u*bins;
      for(const e of events)countBins(train,e.anchor,-o.before,o.bin,bins,early.has(e.boutId)?earlyDeltaHz:lateDeltaHz,at);
      for(let b=0;b<bins;b++){
        const count=earlyDeltaHz[at+b]+lateDeltaHz[at+b];countsByUnit[u]+=count;
        deltaHz[at+b]=count; meanHz[at+b]=count/(events.length*o.bin);
      }
      baselineHz[u]=center(deltaHz,at,events.length);
      center(earlyDeltaHz,at,groups.earlyEvents);center(lateDeltaHz,at,groups.lateEvents);
      if(u%8===0)progress(.62+.38*(u+1)/m.unitIds.length);
    }
    s.byId=new Map(events.map(e=>[e.id,e]));
    s.result={unitIds:m.unitIds,events,bins,binWidth:o.bin,before:o.before,after:o.after,meanHz,deltaHz,earlyDeltaHz,lateDeltaHz,
      countsByUnit,baselineHz,groups,coverage,duration};
    progress(1);
    return s;
  }
  function selected(s,m) {
    check(s?.result,'Compute the event overview first');
    check(Array.isArray(m.unitIds)&&m.unitIds.length>0&&new Set(m.unitIds).size===m.unitIds.length&&m.unitIds.every(id=>s.trains.has(id)),'Select available unique Units');
    return m.unitIds.map(id=>s.trains.get(id));
  }
  function detail(s,m) {
    const trains=selected(s,m),r=s.result;
    check(Array.isArray(m.eventIds)&&new Set(m.eventIds).size===m.eventIds.length&&m.eventIds.length*m.unitIds.length<=10000,'Select a smaller raster page');
    const rows=m.eventIds.map(id=>{const e=s.byId.get(id);check(e,'Unknown event ID');return e;});
    const spikes=[],meanHz=new Float64Array(trains.length*r.bins);
    let total=0;
    for(let u=0;u<trains.length;u++){
      const tr=trains[u], id=m.unitIds[u], row=r.unitIds.indexOf(id);
      meanHz.set(r.meanHz.subarray(row*r.bins,(row+1)*r.bins),u*r.bins);
      for(const e of rows) {
        const lo=lower(tr,e.anchor-r.before),hi=lower(tr,e.anchor+r.after);
        check((total+=hi-lo)<=1000000,'Raster exceeds one million spike marks; select fewer rows');
        const times=new Float64Array(hi-lo);
        for(let i=lo;i<hi;i++)times[i-lo]=at(tr,i)-e.anchor;
        spikes.push({unitId:id,eventId:e.id,times});
      }
    }
    return {unitIds:m.unitIds,events:rows,bins:r.bins,binWidth:r.binWidth,before:r.before,after:r.after,meanHz,spikes};
  }
  function preview(s,m) {
    const trains=selected(s,m), windows=[m.reference,m.candidate];
    let spikeCount=0;
    const spikes=windows.map(([start,end])=>{
      check(inDomain(s,start,end),'Preview outside recording or known coverage');
      return trains.map(tr=>{
        const lo=lower(tr,start),hi=lower(tr,end);
        check((spikeCount+=hi-lo)<=1000000,'Preview exceeds one million spikes');
        return Float64Array.from({length:hi-lo},(_,i)=>at(tr,lo+i)-start);
      });
    });
    return {spikes,unitIds:m.unitIds,length:m.reference[1]-m.reference[0]};
  }
  function informative(v,bins) {
    let spikes=0,cells=0,uneven=false;
    for(let i=0;i<v.length;i++){
      spikes+=v[i];if(v[i])cells++;
      if(i%bins && v[i]!==v[i-i%bins])uneven=true;
    }
    return spikes>=3 && cells>=2 && uneven;
  }
  function recurrence(s,m) {
    const trains=selected(s,m), {start,end}=m;
    check(Number.isFinite(start)&&Number.isFinite(end)&&start>=-s.o.before-1e-9&&end<=s.o.after+1e-9&&end>start,'Invalid event template window');
    const bins=Math.max(1,Math.ceil((end-start)/s.o.bin-1e-9)),width=(end-start)/bins,dim=bins*trains.length;
    const rows=[],used=new Set();
    let lastEnd=-Infinity;
    // Count each bout once and never count any of the same neural time twice.
    for(const row of s.result.events){
      if(used.has(row.boutId)||row.anchor+start<lastEnd)continue;
      used.add(row.boutId);lastEnd=row.anchor+end;rows.push(row);
    }
    check(dim<=100000 && dim*rows.length<=25000000,'Template exceeds work limit; select fewer Units or a shorter window');
    const hits=new Uint32Array(dim),work=new Float64Array(dim);
    function count(event){
      work.fill(0);
      trains.forEach((tr,u)=>countBins(tr,event.anchor,start,width,bins,work,u*bins));
    }
    let informativeEvents=0;
    for(const row of rows){
      count(row);if(informative(work,bins))informativeEvents++;
      for(let i=0;i<dim;i++)if(work[i])hits[i]++;
    }
    // Pick a real exemplar by its binary cosine to the OTHER bouts' occupancy profile.
    let exemplar=null,best=0;
    if(informativeEvents>=3){
      for(const row of rows){
        count(row);if(!informative(work,bins))continue;
        let dot=0,energy=0,cells=0;
        for(let i=0;i<dim;i++){
          const on=work[i]>0,other=hits[i]-Number(on);
          energy+=other*other;
          if(on){cells++;dot+=other;}
        }
        const score=dot/(Math.sqrt(cells*energy)||1);
        if(score>best){best=score;exemplar=row.id;}
      }
    }
    return {unitIds:m.unitIds,start,end,bins,width,hits,total:rows.length,informativeEvents,exemplar};
  }
  function query(s,m) {
    const trains=selected(s,m), o=s.o;
    const scope=m.scope??'events';
    check(scope==='events'||scope==='recording','Unsupported pattern search scope');
    const videoRange=m.videoRange;
    if(videoRange!=null)check(Array.isArray(videoRange) && videoRange.length===2 && videoRange.every(Number.isFinite) &&
      videoRange[0]<videoRange[1],'Invalid video coverage range in neural seconds');
    const absolute=m.absoluteStart!=null||m.absoluteEnd!=null;
    const ref=absolute?null:s.byId.get(m.eventId);
    check(absolute||ref,'Choose an eligible reference event or a neural-time selection');
    const qStart=absolute?m.absoluteStart:ref.anchor+m.start, qEnd=absolute?m.absoluteEnd:ref.anchor+m.end;
    check(inDomain(s,qStart,qEnd),'Reference exceeds known neural time or observation coverage');
    if(!absolute)check(m.start>=-o.before-1e-9&&m.end<=o.after+1e-9,'Reference segment must lie in the event display window');
    const length=qEnd-qStart, first=absolute?0:m.start;
    const bins=Math.max(1,Math.ceil(length/o.bin-1e-9)),width=length/bins,dim=trains.length*bins;
    check(bins>=2,'Select a reference containing at least two time bins');
    check(dim<=100000,'Pattern template is too large');
    const template=new Float64Array(dim),work=new Float64Array(dim);
    function vector(a,out){
      out.fill(0);
      for(let j=0;j<trains.length;j++)countBins(trains[j],a,0,width,bins,out,j*bins);
    }
    vector(qStart,template);
    const minSpikes=3;
    check(informative(template,bins),
      'Reference has too little temporal information: select a longer segment or additional Units (3 spikes, 2 occupied cells and nonconstant time bins required)');
    let refEnergy=0;
    for(const v of template)refEnergy+=v*v;
    function score(start){
      vector(start,work);
      let dot=0,energy=0;
      for(let i=0;i<dim;i++)if(work[i]){
        energy+=work[i]*work[i];dot+=work[i]*template[i];
      }
      // Squared-norm Sørensen agreement retains timing, Unit identity AND amplitude.
      return informative(work,bins) ? 2*dot/(energy+refEnergy) : null;
    }
    const referenceStart=ref?Math.min(ref.anchor-o.before,ref.boutStart):qStart;
    const referenceEnd=ref?Math.max(ref.anchor+o.after,ref.boutEnd):qEnd;
    const eventCandidates=s.result.events;
    const makeStats=()=>({total:0,eligible:0,excluded:{referenceBout:0,overlap:0,coverage:0,lowInformation:0,labelWindow:0}});
    function evaluate(event,category,stats,rows) {
      stats.total++;
      const a=event.anchor+first,b=a+length;
      if(category==='same' && ref && event.boutId===ref.boutId){stats.excluded.referenceBout++;return;}
      // Match-event windows must be disjoint in the whole displayed interval.
      const left=category==='same'||category==='other'?event.anchor-o.before:a;
      const right=category==='same'||category==='other'?event.anchor+o.after:b;
      if(overlaps(left,right,referenceStart,referenceEnd)){stats.excluded.overlap++;return;}
      if(!inDomain(s,left,right)){stats.excluded.coverage++;return;}
      const value=score(a);
      if(value===null){stats.excluded.lowInformation++;return;}
      stats.eligible++;
      rows.push({eventId:event.id,start:event.start,anchor:event.anchor,end:event.end??null,score:value,
        segmentStart:a,segmentEnd:b,boutId:event.boutId??null,type:event.type??null,category});
    }
    const stats=makeStats(),otherStats=makeStats(),backgroundStats=makeStats();
    const ranked=[], otherScores=[], backgroundScores=[];
    const sort=(a,b)=>b.score-a.score||a.anchor-b.anchor;
    let stride=null;
    if(scope==='events'){
      check(eventCandidates.length*dim <= 110000000,'Event matching exceeds the work limit; select fewer Units or a shorter segment');
      for(const e of eventCandidates)evaluate(e,'same',stats,ranked);
    } else {
      // Automatic stride preserves whole-recording coverage while bounding time
      // and memory. Expose the exact grid spacing and number evaluated.
      stride=Math.max(o.bin,Math.ceil(Math.max(s.duration/200000,s.duration*dim/50000000)/o.bin)*o.bin);
      for(let j=0;j*stride+length<=s.duration;j++){
        const start=j*stride,anchor=start-first;
        evaluate({id:'scan:'+j,start:anchor,anchor},'scan',stats,ranked);
      }
    }
    check(s.other.length*dim<=110000000,'Comparator exceeds the work limit; select fewer Units or a shorter segment');
    for(const e of s.other)evaluate(e,'other',otherStats,otherScores);
    // Clock-spaced comparison windows outside the named bouts. Unlabelled time
    // is an exploratory background sample and carries no negative behavior claim.
    const mask=[];
    const intervals=s.labels.bouts.map(b=>[b.start-o.before,b.end+o.after])
      .concat(s.other.map(e=>[e.boutStart-o.before,e.boutEnd+o.after])).sort((a,b)=>a[0]-b[0]);
    for(const i of intervals){
      if(mask.length && i[0]<=mask.at(-1)[1])mask.at(-1)[1]=Math.max(mask.at(-1)[1],i[1]);
      else mask.push(i);
    }
    const bgStride=Math.max(length,s.duration/256),nBackground=Math.floor((s.duration-length)/bgStride)+1;
    let cursor=0;
    for(let j=0;j<nBackground;j++){
      const a=j*bgStride,b=a+length;
      while(cursor<mask.length&&mask[cursor][1]<=a)cursor++;
      if(cursor<mask.length&&mask[cursor][0]<b){backgroundStats.total++;backgroundStats.excluded.labelWindow++;continue;}
      const anchor=a-first;
      evaluate({id:'background:'+j,start:anchor,anchor},'background',backgroundStats,backgroundScores);
    }
    ranked.sort(sort);otherScores.sort(sort);backgroundScores.sort(sort);
    function examples(candidates,fromBottom,previous=[]) {
      const chosen=[];
      for(let j=0;j<candidates.length&&chosen.length<8;j++){
        const row=candidates[fromBottom?candidates.length-j-1:j];
        if(previous.concat(chosen).some(r=>(row.boutId!==null&&row.boutId===r.boutId)||
            overlaps(row.segmentStart,row.segmentEnd,r.segmentStart,r.segmentEnd)))continue;
        chosen.push(row);
      }
      return chosen;
    }
    function extremes(rows) {
      // Leave room for distinct worst examples even for very small candidate sets.
      const similar=examples(rows,false).slice(0,Math.min(8,Math.ceil(rows.length/2)));
      return {similar,different:examples(rows,true,similar)};
    }
    function summary(rows){
      const n=rows.length;
      // Nearest-rank percentiles; rows are in descending score order.
      return {n,median:n?(rows[(n-1)>>1].score+rows[n>>1].score)/2:null,p90:n?rows[n-Math.ceil(.9*n)].score:null};
    }
    const {similar,different}=extremes(ranked);
    let video=null;
    if(videoRange){
      // Filter the whole score distribution, including recording-wide scan rows discarded from the main payload.
      const covered=row=>row.segmentStart>=videoRange[0] && row.segmentEnd<=videoRange[1];
      const candidates=ranked.filter(covered), other=otherScores.filter(covered), background=backgroundScores.filter(covered);
      const available=(subset,all)=>({eligible:subset.length,total:all.length});
      video={range:videoRange,...extremes(candidates),...available(candidates,ranked),
        otherScores:examples(other,false),otherStats:available(other,otherScores),
        backgroundScores:examples(background,false),backgroundStats:available(background,backgroundScores),
        scoreSummaries:{candidates:summary(candidates),other:summary(other),background:summary(background)}};
    }
    return {scope,ranked:scope==='events'?ranked:similar,similar,different,video,eligible:stats.eligible,total:stats.total,excluded:stats.excluded,
      otherScores,backgroundScores,otherStats,backgroundStats,backgroundStride:bgStride,stride,method:'2*dot/(norm2_ref+norm2_candidate)',
      scoreSummaries:{candidates:summary(ranked),other:summary(otherScores),background:summary(backgroundScores)},
      queryStart:qStart,queryEnd:qEnd,queryBinWidth:width,minSpikes,minimumOccupiedCells:2,querySpikeCount:sum(template)};
  }
  return {compute,detail,query,recurrence,preview,indexUnitIds};
});
