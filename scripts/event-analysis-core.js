// SPDX-License-Identifier: MIT
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NeuropixelsEventAnalysis = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createEventAnalysis() {
  'use strict';
  const SCHEMA = 'neuropixels-events/1', VERSION = 'event-response/1';
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const finite = (v, name) => { check(typeof v === 'number' && Number.isFinite(v), `Invalid ${name}`); return v; };
  const text = (v, name) => { check(typeof v === 'string' && v.length > 0 && v.length <= 1000, `Invalid ${name}`); return v; };
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
  function validateEventSet(input, recordingId) {
    check(input?.schema === SCHEMA && input.timebase === 'neural_seconds', 'Unsupported event schema or timebase');
    text(input.recordingId, 'recording ID');
    if (recordingId != null) check(input.recordingId === recordingId, 'Events belong to a different recording');
    check(Array.isArray(input.events) && input.events.length <= 100000, 'Invalid or oversized event list');
    const ids = new Set();
    for (const e of input.events) {
      text(e.id, 'event ID'); check(!ids.has(e.id), 'Duplicate event ID'); ids.add(e.id);
      text(e.type, 'event type'); text(e.sourceId, 'source ID');
      check(['experiment', 'annotation'].includes(e.sourceKind), 'Invalid event source kind');
      finite(e.start, 'event start'); check(e.start >= 0, 'Event start must be nonnegative');
      if (e.end != null) check(finite(e.end, 'event end') >= e.start, 'Event end precedes start');
      check(e.kind === 'point' || (e.kind === 'interval' && e.end > e.start), 'Invalid event kind or interval');
      if (e.sourceKind === 'annotation') {
        check(e.kind === 'interval', 'Annotations must retain their interval');
        check(typeof e.reviewed === 'boolean', 'Annotation review status is required');
        text(e.schemeId, 'label scheme'); text(e.subject, 'subject'); text(e.track, 'track');
        check(e.originalTimebase === 'video_seconds', 'Annotation source timebase is required');
        finite(e.videoStart, 'source video start'); finite(e.videoEnd, 'source video end');
        check(e.videoStart >= 0 && e.videoEnd > e.videoStart, 'Invalid source video interval');
      }
    }
    return input;
  }
  function fromAnnotations(doc, mapping, options) {
    check(doc?.schema === 'neuropixels-annotations/1', 'Unsupported annotation document');
    check(typeof mapping?.videoToNeural === 'function', 'An explicit video-to-neural mapping is required');
    const s = doc.schemes?.find(x => x.id === doc.activeSchemeId);
    check(s && Array.isArray(doc.segments), 'Missing active annotation scheme');
    const events = [], excluded = [], ids = new Set();
    for (const seg of doc.segments) {
      text(seg.id, 'segment ID'); check(!ids.has(seg.id), 'Duplicate segment ID'); ids.add(seg.id);
      const key = s.groups?.[seg.id] || (seg.runId ? `${seg.runId}/${seg.groupId}` : 'manual');
      const label = own(s.labels, seg.id) ? s.labels[seg.id] : s.mappings?.[key] || '';
      const reviewed = s.reviewed?.[seg.id] === true;
      let reason = !label ? 'unlabeled' : options.label && label !== options.label ? 'different_label' :
        options.subject && seg.subject !== options.subject ? 'different_subject' :
        options.track && seg.track !== options.track ? 'different_track' :
        options.reviewedOnly !== false && !reviewed ? 'unreviewed' : null;
      finite(seg.start, 'video start'); finite(seg.end, 'video end');
      check(seg.start >= 0 && seg.end > seg.start, 'Invalid annotation interval');
      const start = mapping.videoToNeural(seg.start), end = mapping.videoToNeural(seg.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || start < 0) reason ||= 'outside_time_mapping';
      if (reason) { excluded.push({ id: seg.id, reason }); continue; }
      events.push({ id: `${s.id}:${seg.id}`, sourceId: seg.id, sourceKind: 'annotation', type: label, kind: 'interval',
        start, end, originalTimebase: 'video_seconds', videoStart: seg.start, videoEnd: seg.end,
        schemeId: s.id, reviewed, subject: seg.subject, track: seg.track, runId: seg.runId || null });
    }
    const result = { schema: SCHEMA, timebase: 'neural_seconds', recordingId: options.recordingId,
      source: { kind: 'annotation', contextKey: doc.context?.key, updatedAt: doc.updatedAt,
        schemeId: s.id, timeMapping: JSON.parse(JSON.stringify(mapping)) }, events, excluded };
    validateEventSet(result);
    return result;
  }
  function lowerBound(array, target) {
    let lo = 0, hi = array.length;
    while (lo < hi) { const mid = lo + Math.floor((hi-lo)/2); if (array[mid] < target) lo=mid+1; else hi=mid; }
    return lo;
  }
  function validateCoverage(coverage) {
    check(Array.isArray(coverage) && coverage.length > 0, 'Explicit recording coverage is required; last spike is not recording duration');
    let previous = -Infinity; const merged = [];
    for (const c of coverage) {
      check(Array.isArray(c) && c.length === 2, 'Invalid recording coverage');
      finite(c[0], 'coverage start'); finite(c[1], 'coverage end');
      check(c[0] >= 0 && c[1] > c[0] && c[0] >= previous, 'Coverage must be ordered and non-overlapping');
      if (merged.length && c[0] === previous) merged[merged.length-1][1] = c[1]; else merged.push(c.slice());
      previous = c[1];
    }
    return merged;
  }
  function computeResponses(trains, eventSet, options) {
    validateEventSet(eventSet, options.recordingId); const coverage = validateCoverage(options.coverage);
    const start = finite(options.start, 'window start'), end = finite(options.end, 'window end'), width = finite(options.binWidth, 'bin width');
    check(end > start && width > 0, 'Invalid response window');
    const n = Math.round((end-start)/width);
    check(n > 0 && n <= 5000 && Math.abs(n*width-(end-start)) <= 1e-10*Math.max(1,Math.abs(end-start)), 'Window must contain an integer number of bins (at most 5000)');
    check(Array.isArray(trains) && trains.length > 0 && trains.length <= 4096, 'Invalid Unit list');
    const unitIds = [], seen = new Set();
    for (const train of trains) {
      check(Number.isSafeInteger(train.unitId) && !seen.has(train.unitId), 'Invalid or duplicate Unit ID'); seen.add(train.unitId); unitIds.push(train.unitId);
      check(Array.isArray(train.spikes) || ArrayBuffer.isView(train.spikes), 'Missing spike times');
      let previous = -Infinity;
      for (const value of train.spikes) { finite(value, 'spike time'); check(value >= 0 && value >= previous, 'Spike times must be nonnegative and sorted'); previous=value; }
    }
    const selected = eventSet.events.filter(e => (!options.eventType || e.type === options.eventType) &&
      (!options.activeOnly || e.conditions?.active === true));
    const events = [], excluded = [];
    for (const e of selected) {
      const a=e.start+start,b=e.start+end;
      if (coverage.some(c => a>=c[0] && b<=c[1])) events.push(e);
      else excluded.push({id:e.id,reason:'incomplete_recording_coverage'});
    }
    check(events.length > 0, 'No events have complete recording coverage');
    const cells = trains.length*events.length*n, maxCells = options.maxCells ?? 8000000;
    check(Number.isSafeInteger(maxCells) && maxCells > 0 && maxCells <= 32000000, 'Invalid response memory limit');
    check(Number.isSafeInteger(cells) && cells <= maxCells, 'Response matrix exceeds memory limit; select fewer Units/events or wider bins');
    const counts = new Uint32Array(cells), rates = new Float64Array(trains.length*n), edges = Array.from({length:n+1},(_,i)=>start+i*width);
    for (let u=0;u<trains.length;u++) {
      const spikes=trains[u].spikes;
      for (let t=0;t<events.length;t++) {
        const base=events[t].start;
        let left=lowerBound(spikes,base+edges[0]);
        for(let b=0;b<n;b++) {
          check(base+edges[b+1]>base+edges[b], 'Bin width is below the timestamp resolution');
          const right=lowerBound(spikes,base+edges[b+1]), count=right-left;
          check(count <= 4294967295, 'Spike count exceeds uint32 capacity');
          counts[(u*events.length+t)*n+b]=count; rates[u*n+b]+=count; left=right;
        }
      }
      for(let b=0;b<n;b++) { rates[u*n+b]/=events.length*width; finite(rates[u*n+b], 'response rate'); }
    }
    return {schema:'neuropixels-event-response/1',version:VERSION,recordingId:eventSet.recordingId,
      unitIds,eventIds:events.map(e=>e.id),events,excludedEvents:excluded,binEdges:edges,counts,rateHz:rates,
      shape:[trains.length,events.length,n],parameters:{start,end,binWidth:width,alignment:'start',eventType:options.eventType||null,activeOnly:!!options.activeOnly,coverage:options.coverage.map(c=>c.slice())}};
  }
  function commonCoverage(input,unitIds,recordingId){
    check(input?.schema==='neuropixels-recording-coverage/1'&&input.timebase==='neural_seconds'&&input.recordingId===recordingId,'Coverage belongs to another recording or uses an unsupported format');
    check(input.source?.kind==='NWB.units.obs_intervals'&&input.source.status==='source-reported','Unsupported acquisition coverage source');
    check(Array.isArray(input.units)&&input.units.length<=100000&&Array.isArray(unitIds)&&unitIds.length>0&&new Set(unitIds).size===unitIds.length,'Invalid coverage Unit selection');
    const lookup=new Map();for(const unit of input.units){check(Number.isSafeInteger(unit.unitId)&&!lookup.has(unit.unitId),'Invalid or duplicate coverage Unit');lookup.set(unit.unitId,unit.intervals);}
    let common=null;
    for(const id of unitIds){
      check(lookup.has(id),`No source observation coverage for Unit ${id}`);const intervals=validateCoverage(lookup.get(id));
      if(common==null){common=intervals;continue;}
      const next=[];let a=0,b=0;
      while(a<common.length&&b<intervals.length){const start=Math.max(common[a][0],intervals[b][0]),end=Math.min(common[a][1],intervals[b][1]);if(end>start)next.push([start,end]);if(common[a][1]<intervals[b][1])a++;else b++;}
      common=next;
    }
    check(common?.length,'Selected Units have no common observation coverage');return {intervals:common,source:input.source,unitIds:unitIds.slice()};
  }
  function clusterResponses(response, options={}) {
    const [rows,,cols]=response.shape, k=options.k ?? 3, mode=options.normalization ?? 'shape';
    check(Number.isSafeInteger(k) && k>=1 && k<=32, 'Cluster count must be 1 to 32');
    check(['shape','rate'].includes(mode), 'Unknown feature normalization');
    check(Number.isSafeInteger(rows) && rows>0 && rows<=4096 && rows===response.unitIds.length && Number.isSafeInteger(cols) && cols>0 && cols<=5000 && response.rateHz.length===rows*cols, 'Invalid response matrix');
    const matrix=[],unitIds=[],excludedUnits=[];
    for(let r=0;r<rows;r++) {
      const x=Array.from(response.rateHz.slice(r*cols,(r+1)*cols)); x.forEach(v=>finite(v,'response rate'));
      const mean=x.reduce((a,b)=>a+b,0)/cols, variance=x.reduce((sum,v)=>sum+(v-mean)**2,0)/cols;
      if(mode==='shape' && variance<=1e-12){excludedUnits.push({unitId:response.unitIds[r],reason:'constant_response'});continue;}
      matrix.push(mode==='shape'?x.map(v=>(v-mean)/Math.sqrt(variance)):x); unitIds.push(response.unitIds[r]);
    }
    check(matrix.length>=k, 'Not enough eligible Units for this cluster count');
    const distance=(a,b)=>a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);
    const seed=options.seed ?? 1; check(Number.isSafeInteger(seed) && seed>=0 && seed<=4294967295,'Invalid random seed');
    let rng=seed>>>0; const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
    const centers=[matrix[Math.floor(random()*matrix.length)].slice()];
    while(centers.length<k){let best=-1,bestDistance=-1;matrix.forEach((x,i)=>{const d=Math.min(...centers.map(c=>distance(x,c)));if(d>bestDistance){bestDistance=d;best=i;}});check(bestDistance>1e-20,'Fewer distinct response profiles than clusters');centers.push(matrix[best].slice());}
    let labels=new Int32Array(matrix.length).fill(-1),iterations=0,converged=false;
    for(;iterations<100;iterations++){
      let changed=false;const sums=Array.from({length:k},()=>Array(cols).fill(0)),sizes=Array(k).fill(0);
      matrix.forEach((x,i)=>{let group=0,d=distance(x,centers[0]);for(let c=1;c<k;c++){const nd=distance(x,centers[c]);if(nd<d){d=nd;group=c;}}if(labels[i]!==group)changed=true;labels[i]=group;sizes[group]++;for(let b=0;b<cols;b++)sums[group][b]+=x[b];});
      check(sizes.every(v=>v>0),'Empty cluster; reduce cluster count or change the seed');
      for(let c=0;c<k;c++)for(let b=0;b<cols;b++)centers[c][b]=sums[c][b]/sizes[c];
      if(!changed){iterations++;converged=true;break;}
    }
    return {schema:'neuropixels-response-clusters/1',method:'kmeans-farthest-initialization/1',normalization:mode,seed,k,
      unitIds,labels:Array.from(labels),centroids:centers,excludedUnits,iterations,converged,
      inertia:matrix.reduce((sum,x,i)=>sum+distance(x,centers[labels[i]]),0),
      interpretation:'Groups describe selected event-response features, not cell types or causal effects.'};
  }
  function responseSummary(response,clusters=null){
    const [units,,bins]=response.shape;
    check(units===response.unitIds.length&&response.rateHz.length===units*bins,'Invalid response summary input');
    const assignment=new Map(clusters?.unitIds.map((id,i)=>[id,clusters.labels[i]])||[]),groups=[];
    const keys=clusters?[...Array(clusters.k).keys(),null]:[null];
    for(const key of keys){
      const rows=response.unitIds.map((id,row)=>({id,row})).filter(x=>(assignment.get(x.id)??null)===key);if(!rows.length)continue;
      const meanRateHz=Array(bins).fill(0);
      for(const {row}of rows)for(let bin=0;bin<bins;bin++)meanRateHz[bin]+=response.rateHz[row*bins+bin]/rows.length;
      groups.push({cluster:key,unitIds:rows.map(x=>x.id),meanRateHz});
    }
    return {schema:'neuropixels-response-summary/1',groups,unitOrder:groups.flatMap(g=>g.unitIds),meaning:'Equal-Unit mean of trial-averaged rates in Hz; not a confidence interval or a pooled spike rate.'};
  }
  function adjustedRandIndex(a,b){
    check(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.length>=2,'ARI requires matched partitions with at least two members');
    const cells=new Map(),rows=new Map(),cols=new Map(),choose=n=>n*(n-1)/2;
    for(let i=0;i<a.length;i++){check(Number.isSafeInteger(a[i])&&Number.isSafeInteger(b[i]),'ARI labels must be integers');const key=`${a[i]}:${b[i]}`;cells.set(key,(cells.get(key)||0)+1);rows.set(a[i],(rows.get(a[i])||0)+1);cols.set(b[i],(cols.get(b[i])||0)+1);}
    const sum=m=>[...m.values()].reduce((s,n)=>s+choose(n),0),x=sum(cells),r=sum(rows),c=sum(cols),expected=r*c/choose(a.length),max=(r+c)/2;
    return Math.abs(max-expected)<1e-15?1:(x-expected)/(max-expected);
  }
  function splitHalfStability(response,clusters,options={},progress=()=>{}){
    const repeats=options.repeats??4,seed=options.seed??1;
    check(Number.isSafeInteger(repeats)&&repeats>=1&&repeats<=20&&Number.isSafeInteger(seed)&&seed>=0&&seed<=4294967295,'Invalid stability repeats or seed');
    const parameters={repeats,seed,k:clusters?.k??0,normalization:clusters?.normalization??'shape',split:'seeded-balanced-random-event-halves/1',comparison:'adjusted-rand-index/1'},[units,trials,bins]=response.shape;
    const base={schema:'neuropixels-response-stability/1',parameters,trialOrder:'response.eventIds',interpretation:'Descriptive event split-half sensitivity at fixed k. Repeats reuse events; this is not independent replication, a confidence interval, a significance test or evidence of cell types.'};
    const unavailable=reason=>({...base,status:'unavailable',reason,runs:[]});
    if(!clusters||clusters.k<2)return unavailable('At least two response groups are required');
    if(trials<4)return unavailable('At least four accepted events are required');
    if(units*bins*repeats*(trials+200*clusters.k)>100000000)return unavailable('Stability work limit exceeded; use fewer Units/events, wider bins or fewer groups');
    const runs=[];let rng=seed>>>0;const next=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng;};
    for(let repeat=0;repeat<repeats;repeat++){
      const order=Array.from({length:trials},(_,i)=>i);for(let i=trials-1;i>0;i--){const j=Math.floor(next()/4294967296*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      const split=Math.floor(trials/2),left=order.slice(0,split),right=order.slice(split),fitSeed=next();
      const run={repeat,leftEventIndices:left,leftEvents:left.length,rightEvents:right.length,fitSeed,status:'unavailable'};
      try{
        const fit=indices=>{const rateHz=new Float64Array(units*bins);for(let u=0;u<units;u++)for(const t of indices)for(let b=0;b<bins;b++)rateHz[u*bins+b]+=response.counts[(u*trials+t)*bins+b];for(let i=0;i<rateHz.length;i++)rateHz[i]/=indices.length*response.parameters.binWidth;return clusterResponses({...response,shape:[units,indices.length,bins],rateHz},{k:clusters.k,seed:fitSeed,normalization:clusters.normalization});};
        const a=fit(left),b=fit(right),lookup=new Map(b.unitIds.map((id,i)=>[id,b.labels[i]])),shared=a.unitIds.filter(id=>lookup.has(id));
        run.unitIds=shared;run.excludedLeft=a.excludedUnits;run.excludedRight=b.excludedUnits;
        check(a.converged&&b.converged,'A split-half clustering did not converge');
        check(shared.length>=Math.max(3,clusters.k+1),'Too few eligible Units shared by both halves');
        const x=shared.map(id=>a.labels[a.unitIds.indexOf(id)]),y=shared.map(id=>lookup.get(id));
        check(new Set(x).size>1&&new Set(y).size>1,'Shared Units form a trivial partition');
        run.ari=adjustedRandIndex(x,y);run.status='available';
      }catch(error){run.reason=error.message;}
      runs.push(run);progress({phase:'split-half-stability',completed:repeat+1,total:repeats});
    }
    const values=runs.filter(r=>r.status==='available').map(r=>r.ari);
    return {...base,status:values.length===repeats?'available':values.length?'partial':'unavailable',runs,successful:values.length,meanARI:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,minARI:values.length?Math.min(...values):null,maxARI:values.length?Math.max(...values):null};
  }
  const workerSource = () => `const EventAnalysis = (${createEventAnalysis.toString()})();`;
  return {SCHEMA,VERSION,validateEventSet,fromAnnotations,lowerBound,validateCoverage,commonCoverage,computeResponses,clusterResponses,responseSummary,adjustedRandIndex,splitHalfStability,workerSource};
});
