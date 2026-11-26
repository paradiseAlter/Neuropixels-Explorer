// SPDX-License-Identifier: MIT
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NeuropixelsEventAnalysis = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createEventAnalysis() {
  'use strict';
  const SCHEMA = 'neuropixels-events/1', VERSION = 'event-response/2', CONDITION_VERSION = 'event-response/3';
  const COMPARISON_VERSION = 'event-response/4', RULE_VERSION='event-response/5', LABEL_FIELD='@response-label';
  const MAX_CELLS=32000000, MAX_BINS=5000, MAX_SPLITS=1000, DEFAULT_SPLITS=50;
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const finite = (v, name) => { check(typeof v === 'number' && Number.isFinite(v), `Invalid ${name}`); return v; };
  const text = (v, name) => { check(typeof v === 'string' && v.length > 0 && v.length <= 1000, `Invalid ${name}`); return v; };
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
  const scalarCondition = value => typeof value === 'boolean' || Number.isFinite(value) || (typeof value === 'string' && value.trim() !== '');
  function conditionText(value, possibleValues=[]) {
    if(typeof value!=='string')return String(value);
    const ambiguous=possibleValues.has ? possibleValues.has(value) : possibleValues.some(v=>v!==value && String(v)===value);
    return ambiguous ? JSON.stringify(value) : value;
  }
  function conditionValue(event, field) {
    if(field===LABEL_FIELD && own(event,'matchedResponseId'))return event.matchedResponseId===null?'miss':'hit';
    if (event.conditions && typeof event.conditions==='object' && !Array.isArray(event.conditions) && own(event.conditions,field)) return event.conditions[field];
    if (event.sourceKind === 'annotation' && (field === 'subject' || field === 'track')) return event[field];
  }
  function recordedOutcome(field, values=[]) {
    if(!field || field===LABEL_FIELD)return false;
    const normalize=s=>String(s).trim().toLowerCase().replace(/[\s_/-]/g,'');
    if(/^(?:(?:trial|is|was|trialis)?(?:hit|miss)(?:flag|trial)?|hitmiss|命中|漏报|未命中)$/.test(normalize(field)))return true;
    for(const value of values){
      if(typeof value!=='string')continue;
      const label=normalize(value);
      if(['hit','miss','命中','漏报','未命中'].includes(label))return true;
    }
    return false;
  }
  function conditionFields(events) {
    const fields = new Map();
    for (const event of events) {
      const keys = event.conditions && typeof event.conditions==='object' && !Array.isArray(event.conditions) ? Object.keys(event.conditions) : [];
      if (event.sourceKind === 'annotation') for (const key of ['subject','track']) if (!keys.includes(key)) keys.push(key);
      for (const key of keys) {
        const value = conditionValue(event,key);
        if (!key || key.length > 1000 || !scalarCondition(value)) continue;
        if (!fields.has(key)) fields.set(key,new Map());
        const counts = fields.get(key);
        counts.set(value,(counts.get(value) || 0)+1);
      }
    }
    for(const [key,counts] of fields)if(key===LABEL_FIELD||recordedOutcome(key,counts.keys()))fields.delete(key);
    return fields;
  }
  function comparisonOf(options) {
    if(options?.responseRule){
      const rule=options.responseRule;
      text(rule.type,'response label');
      check(options.eventType && ['annotation','experiment'].includes(rule.sourceKind) &&
        !options.comparison && options.referenceOutcome==null,'Invalid label comparison');
      check(Number.isFinite(rule.start)&&Number.isFinite(rule.end)&&rule.end>rule.start,'Invalid label matching window');
      check(rule.reference==null||['hit','miss'].includes(rule.reference),'Invalid label reference');
      return {field:LABEL_FIELD,values:rule.reference==='miss'?['miss','hit']:['hit','miss']};
    }
    if (options?.comparison != null) {
      const {field,values} = options.comparison;
      text(field,'comparison field');
      check(options.referenceOutcome == null && Array.isArray(values) && values.length === 2 &&
        values.every(scalarCondition) && values[0] !== values[1], 'Select two distinct condition values');
      return {field,values};
    }
    if (options?.referenceOutcome == null) return null;
    const ref = options.referenceOutcome;
    check(['hit','miss'].includes(ref) && options.eventType === 'image_change','A reference condition requires hit or miss from image-change trials');
    return {field:'trial_outcome',values:[ref,ref === 'hit' ? 'miss' : 'hit']};
  }
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
      check(e.sourceKind!=='experiment'||!/^\/?intervals\/invalid_times\/?$/.test(e.sourceTable||''), 'NWB invalid_times is validity metadata, not an experimental event. Reimport the NWB with the current importer.');
      finite(e.start, 'event start'); check(e.start >= 0, 'Event start must be nonnegative');
      if (e.end != null) check(finite(e.end, 'event end') >= e.start, 'Event end precedes start');
      check(e.kind === 'point' || (e.kind === 'interval' && e.end > e.start), 'Invalid event kind or interval');
      if (e.sourceKind === 'annotation') {
        check(typeof e.reviewed === 'boolean', 'Annotation review status is required');
        text(e.schemeId, 'label scheme'); text(e.subject, 'subject'); text(e.track, 'track');
        check(e.originalTimebase === 'video_seconds', 'Annotation source timebase is required');
        finite(e.videoStart, 'source video start');
        check(e.videoStart >= 0, 'Invalid source video time');
        if (e.kind === 'point') {
          check(e.end == null && e.videoEnd == null, 'A point annotation has only one timestamp');
        } else {
          check(finite(e.videoEnd, 'source video end') > e.videoStart, 'Invalid source video interval');
        }
      }
    }
    return input;
  }
  function fromExperimentalEvents(input, recordingId) {
    validateEventSet(input, recordingId);
    const annotations = input.events.filter(e => e.sourceKind === 'annotation');
    // Preserve the exact legacy digest for event assets containing experiments only.
    if (!annotations.length) return input;
    return { ...input, events: input.events.filter(e => e.sourceKind === 'experiment'),
      excluded: [...(input.excluded || []), ...annotations.map(e => ({ id: e.id,
        reason: 'annotation_requires_current_document' }))] };
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
      const namedManual = options.includeNamedManual === true && seg.runId == null && typeof label === 'string' && label.trim().length > 0;
      let reason = !label ? 'unlabeled' : options.label && label !== options.label ? 'different_label' :
        options.subject && seg.subject !== options.subject ? 'different_subject' :
        options.track && seg.track !== options.track ? 'different_track' :
        options.reviewedOnly !== false && !reviewed && !namedManual ? 'unreviewed' : null;
      finite(seg.start, 'video start'); finite(seg.end, 'video end');
      const kind = own(seg, 'kind') ? seg.kind : 'interval', point = kind === 'point';
      check(kind === 'interval' || point, 'Invalid annotation event kind');
      check(seg.start >= 0 && (point ? seg.end === seg.start : seg.end > seg.start), 'Invalid annotation times');
      const start = mapping.videoToNeural(seg.start), end = point ? null : mapping.videoToNeural(seg.end);
      if (!Number.isFinite(start) || start < 0 || (!point && (!Number.isFinite(end) || end <= start))) reason ||= 'outside_time_mapping';
      if (reason) { excluded.push({ id: seg.id, reason }); continue; }
      events.push({ id: `${s.id}:${seg.id}`, sourceId: seg.id, sourceKind: 'annotation', type: label, kind,
        start, end, originalTimebase: 'video_seconds', videoStart: seg.start, videoEnd: point ? null : seg.end,
        schemeId: s.id, reviewed, subject: seg.subject, track: seg.track, runId: seg.runId || null,
        ...(seg.conditions && typeof seg.conditions==='object' && !Array.isArray(seg.conditions) ? {conditions:seg.conditions} : {}) });
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
  // Only explicit null opts into unknown acquisition coverage. Missing/malformed
  // metadata must not become an implicit continuous-observation claim.
  function responseCoverage(coverage) {
    return coverage === null ? null : validateCoverage(coverage);
  }
  function eventOnsets(events,type){
    return events.filter(e=>e.type===type).map(e=>e.start).sort((a,b)=>a-b);
  }
  // Subtract precisely the anchor itself. Distinct simultaneous events remain visible.
  function otherOnsetRange(times,anchor,start,end){
    const lo=lowerBound(times,anchor+start),hi=lowerBound(times,anchor+end);
    const zero=lowerBound(times,anchor);
    const skip=zero>=lo && zero<hi && times[zero]===anchor?zero:-1;
    return {lo,hi,skip,count:hi-lo-(skip>=0?1:0)};
  }
  function selectResponseEvents(eventSet, options, verifyingSaved=false) {
    const coverage = responseCoverage(options.coverage);
    const start = finite(options.start, 'window start'), end = finite(options.end, 'window end');
    check(end > start, 'Invalid response window');
    const comparison = comparisonOf(options), legacy = options.referenceOutcome != null;
    if(comparison && !options.responseRule && !verifyingSaved)
      check(comparison.field!==LABEL_FIELD && !recordedOutcome(comparison.field,comparison.values),'Choose two event labels to determine hits and misses');
    const rule=options.responseRule, repeatPolicy=options.repeatPolicy;
    check(repeatPolicy==null || (options.eventType && ['keep','exclude'].includes(repeatPolicy)),'Invalid repeated-event policy');
    const onsets=repeatPolicy?eventOnsets(eventSet.events,options.eventType):null;
    let responses,responseTimes,responseBounds;
    if(rule){
      const source=eventSet.responseSource||eventSet;
      if(source!==eventSet)validateEventSet(source,eventSet.recordingId);
      check(!eventSet.events.some(e=>e.type===options.eventType && e.sourceKind===rule.sourceKind && e.type===rule.type),'Select a different response label');
      responses=source.events.filter(e=>e.sourceKind===rule.sourceKind && e.type===rule.type).sort((a,b)=>a.start-b.start);
      check(responses.length,'Response label has no events on the neural clock');
      responseTimes=responses.map(e=>e.start);
      responseBounds=eventSet.responseBounds;
      if(responseBounds!=null)validateCoverage([responseBounds]);
    }
    const range=options.eventRange;
    if(range!=null)check(Array.isArray(range)&&range.length===2&&range.every(Number.isFinite)&&range[0]>=0&&range[1]>range[0],'Invalid event time selection');
    const selected = eventSet.events.filter(e => (!options.eventType || e.type === options.eventType) &&
      (!(options.activeOnly || legacy) || e.conditions?.active === true));
    const events = [], excluded = [];
    for (let e of selected) {
      if(range && (e.start<range[0] || e.start>=range[1])){excluded.push({id:e.id,reason:'outside_selected_time'});continue;}
      if(repeatPolicy==='exclude' && otherOnsetRange(onsets,e.start,start,end).count){
        excluded.push({id:e.id,reason:'repeated_event_in_window'});continue;
      }
      if(rule){
        const a=e.start+rule.start,b=e.start+rule.end;
        if(a<0 || !Number.isFinite(a)||!Number.isFinite(b)||b<=a ||
          (responseBounds && (a<responseBounds[0] || b>responseBounds[1]))){
          excluded.push({id:e.id,reason:'incomplete_label_window'});continue;
        }
        const i=lowerBound(responseTimes,a);
        e={...e,matchedResponseId:i<responses.length && responseTimes[i]<b ? responses[i].id : null};
      }
      const outcome = comparison && conditionValue(e,comparison.field);
      if (comparison && (!comparison.values.includes(outcome) || (legacy && e.sourceKind !== 'experiment'))) {
        const reason = legacy ? (outcome === 'auto_rewarded' ? 'auto_rewarded' : 'unmatched_trial_outcome')
          : scalarCondition(outcome) ? 'other_condition_value' : 'missing_condition_value';
        excluded.push({id:e.id,reason,...(!legacy && scalarCondition(outcome) ? {outcome} : {})});
        continue;
      }
      const a=e.start+start,b=e.start+end;
      check(Number.isFinite(a)&&Number.isFinite(b)&&b>a,'Response window exceeds timestamp resolution');
      const valid=a>=0;
      if (valid && (coverage === null || coverage.some(c => a>=c[0] && b<=c[1]))) events.push(e);
      else excluded.push({id:e.id,reason:coverage === null ? 'outside_nonnegative_neural_time' : 'incomplete_recording_coverage',...(comparison?{outcome}:{})});
    }
    return {events,excluded,onsets};
  }
  function validateResponsePlan(unitIds, eventSet, options) {
    validateEventSet(eventSet, options.recordingId);
    const start = finite(options.start, 'window start'), end = finite(options.end, 'window end'), width = finite(options.binWidth, 'bin width');
    check(end > start && width > 0, 'Invalid response window');
    const n = Math.round((end-start)/width);
    check(n > 0 && n <= MAX_BINS && Math.abs(n*width-(end-start)) <= 1e-10*Math.max(1,Math.abs(end-start)), 'Window must contain an integer number of bins (at most 5000)');
    check(Array.isArray(unitIds) && unitIds.length > 0 && unitIds.length <= 4096, 'Invalid Unit list');
    check(unitIds.every(Number.isSafeInteger) && new Set(unitIds).size === unitIds.length, 'Invalid or duplicate Unit ID');
    const {events,excluded,onsets}=selectResponseEvents(eventSet,options);
    const comparison = comparisonOf(options);
    if (comparison && !options.responseRule) check(events.some(e => conditionValue(e,comparison.field) === comparison.values[0]),
      'No eligible events in the reference condition');
    check(events.length > 0, options.coverage === null ? 'No events have a valid nonnegative neural-time response window' : 'No events have complete recording coverage');
    const cells = unitIds.length*events.length*n, maxCells = options.maxCells ?? MAX_CELLS;
    check(Number.isSafeInteger(maxCells) && maxCells > 0 && maxCells <= MAX_CELLS, 'Invalid response memory limit');
    check(Number.isSafeInteger(cells) && cells <= maxCells, 'Response matrix exceeds memory limit; select fewer Units/events or wider bins');
    const edges = Array.from({length:n+1},(_,i)=>start+i*width);
    let minGap = Infinity;
    for (let i=1; i<edges.length; i++) minGap = Math.min(minGap,edges[i]-edges[i-1]);
    for (const {start:base} of events) {
      const magnitude = Math.max(Math.abs(base+edges[0]),Math.abs(base+edges[n]));
      // A bin wider than the largest possible floating-point spacing here
      // retains distinct edges after adding the event time. Resolve close
      // cases exactly, once per event for all Units.
      if (minGap > Math.max(Number.MIN_VALUE,magnitude*Number.EPSILON)) continue;
      for (let i=1; i<edges.length; i++) check(base+edges[i]>base+edges[i-1], 'Bin width is below the timestamp resolution');
    }
    return {start,end,width,n,events,excluded,cells,edges,onsets};
  }
  // Merge intervals for bounded spike reads. Overlapping trials still count separately in computeResponses.
  function onsetFraction({start,end}){
    return start<=0 && end>=0 && end>start ? -start/(end-start) : null;
  }
  function eventWindows(events, start, end) {
    const windows = [];
    for (const anchor of events.map(e=>e.start).sort((a,b)=>a-b)) {
      const lo = Math.max(0, anchor + start), hi = anchor + end, last = windows[windows.length-1];
      if (last && lo <= last[1]) last[1] = Math.max(last[1], hi);
      else windows.push([lo,hi]);
    }
    return windows;
  }
  function computeResponses(trains, eventSet, options, trace) {
    check(Array.isArray(trains) && trains.length > 0 && trains.length <= 4096, 'Invalid Unit list');
    const unitIds = trains.map(train=>train?.unitId);
    const {start,end,width,n,events,excluded,cells,edges,onsets} = validateResponsePlan(unitIds,eventSet,options);
    if(options.responseRule){
      const reference=events.some(e=>e.matchedResponseId!==null)?'hit':'miss';
      options={...options,responseRule:{...options.responseRule,reference}};
    }
    for (const train of trains) {
      check(Array.isArray(train.spikes) || ArrayBuffer.isView(train.spikes), 'Missing spike times');
      let previous = -Infinity;
      for (const value of train.spikes) { finite(value, 'spike time'); check(value >= 0 && value >= previous, 'Spike times must be nonnegative and sorted'); previous=value; }
    }
    const counts = new Uint32Array(cells), rates = new Float64Array(trains.length*n);
    const observeRow = trace?.observeBinning(trains, events, edges, options);
    for (let u=0;u<trains.length;u++) {
      const spikes=trains[u].spikes;
      for (let t=0;t<events.length;t++) {
        const base=events[t].start;
        let left=lowerBound(spikes,base+edges[0]);
        for(let b=0;b<n;b++) {
          const right=lowerBound(spikes,base+edges[b+1]), count=right-left;
          check(count <= 4294967295, 'Spike count exceeds uint32 capacity');
          counts[(u*events.length+t)*n+b]=count; rates[u*n+b]+=count; left=right;
        }
      }
      for(let b=0;b<n;b++) { rates[u*n+b]/=events.length*width; finite(rates[u*n+b], 'response rate'); }
      observeRow?.(u, counts);
    }
    return {schema:'neuropixels-event-response/1',version:options.responseRule||onsets ? RULE_VERSION : options.comparison ? COMPARISON_VERSION : options.referenceOutcome == null ? VERSION : CONDITION_VERSION,recordingId:eventSet.recordingId,
      ...(onsets?{sameLabelOnsets:onsets}:{}),
      unitIds,eventIds:events.map(e=>e.id),events,excludedEvents:excluded,binEdges:edges,counts,rateHz:rates,
      shape:[trains.length,events.length,n],parameters:{start,end,binWidth:width,alignment:'start',eventType:options.eventType||null,activeOnly:!!options.activeOnly||options.referenceOutcome!=null,coverage:options.coverage === null ? null : options.coverage.map(c=>c.slice()),...(options.repeatPolicy?{repeatPolicy:options.repeatPolicy}:{}),...(options.responseRule?{responseRule:options.responseRule}:{}),...(options.eventRange?{eventRange:options.eventRange.slice()}:{}),...(options.referenceOutcome!=null?{referenceOutcome:options.referenceOutcome}:{}),...(options.comparison?{comparison:{field:options.comparison.field,values:options.comparison.values.slice()}}:{})}};
  }
  // A condition is a view of one stored tensor. Both views retain the Unit and bin order.
  function conditionResponse(response, outcome) {
    const comparison = comparisonOf(response.parameters);
    check(comparison?.values.includes(outcome), 'Invalid response condition');
    const indices = [];
    response.events.forEach((event, index) => { if (conditionValue(event,comparison.field) === outcome) indices.push(index); });
    if (!indices.length) return null;
    const [units, trials, bins] = response.shape;
    const counts = new Uint32Array(units * indices.length * bins);
    const rateHz = new Float64Array(units * bins);
    for (let u=0; u<units; u++) {
      for (let t=0; t<indices.length; t++) {
        const start = (u * trials + indices[t]) * bins;
        const row = response.counts.subarray(start, start + bins);
        counts.set(row, (u * indices.length + t) * bins);
        for (let b=0; b<bins; b++) rateHz[u*bins+b] += row[b];
      }
      for (let b=0; b<bins; b++) rateHz[u*bins+b] /= indices.length * response.parameters.binWidth;
    }
    const events = indices.map(index => response.events[index]);
    return {...response, condition:outcome, shape:[units,indices.length,bins], counts, rateHz, events,
      eventIds:events.map(event => event.id), excludedEvents:response.excludedEvents.filter(e => e.outcome === outcome)};
  }
  function commonCoverage(input,unitIds,recordingId,options={}){
    check(input?.schema==='neuropixels-recording-coverage/1'&&input.timebase==='neural_seconds'&&input.recordingId===recordingId,'Coverage belongs to another recording or uses an unsupported format');
    check(input.source?.kind==='NWB.units.obs_intervals'&&input.source.status==='source-reported','Unsupported acquisition coverage source');
    check(Array.isArray(input.units)&&input.units.length<=100000&&Array.isArray(unitIds)&&unitIds.length>0&&unitIds.every(Number.isSafeInteger)&&new Set(unitIds).size===unitIds.length,'Invalid coverage Unit selection');
    const lookup=new Map();for(const unit of input.units){check(Number.isSafeInteger(unit?.unitId)&&!lookup.has(unit.unitId),'Invalid or duplicate coverage Unit');lookup.set(unit.unitId,validateCoverage(unit.intervals));}
    const sourceExcluded=input.excluded??[];
    check(Array.isArray(sourceExcluded)&&sourceExcluded.length<=100000,'Invalid source coverage exclusions');
    const excludedIds=new Set();
    for(const item of sourceExcluded){
      check(item&&typeof item.reason==='string'&&item.reason.length>0&&(!own(item,'unitId')||Number.isSafeInteger(item.unitId)),'Invalid source coverage exclusion');
      if(own(item,'unitId')){check(!excludedIds.has(item.unitId)&&!lookup.has(item.unitId),'Duplicate or conflicting coverage exclusion');excludedIds.add(item.unitId);}
    }
    // Legacy strict callers still report a missing Unit. Automatic selection must
    // distinguish genuinely absent rows from malformed source metadata.
    if(options.allowMissing === true)check(sourceExcluded.every(item=>own(item,'unitId')&&!unitIds.includes(item.unitId)),'Invalid source observation coverage metadata for selected Units');
    let common=null;const coveredUnitIds=[],missingUnitIds=[];
    for(const id of unitIds){
      if(!lookup.has(id)){check(options.allowMissing === true,`No source observation coverage for Unit ${id}`);missingUnitIds.push(id);continue;}
      coveredUnitIds.push(id);const intervals=lookup.get(id);
      if(common==null){common=intervals;continue;}
      const next=[];let a=0,b=0;
      while(a<common.length&&b<intervals.length){const start=Math.max(common[a][0],intervals[b][0]),end=Math.min(common[a][1],intervals[b][1]);if(end>start)next.push([start,end]);if(common[a][1]<intervals[b][1])a++;else b++;}
      common=next;
    }
    check(common === null && options.allowMissing === true || common?.length,'Selected Units have no common observation coverage');
    return {intervals:common,source:input.source,unitIds:unitIds.slice(),...(options.allowMissing === true?{coveredUnitIds,missingUnitIds,sourceExcluded}: {})};
  }
  function clusterResponses(response, options={}, trace) {
    const comparison=comparisonOf(response.parameters);
    if(comparison)check(response.condition===comparison.values[0],'Fit clusters on the reference condition');
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
    const tracked = trace ? unitIds.indexOf(trace.unitId) : -1;
    let labels=new Int32Array(matrix.length).fill(-1),iterations=0,converged=false;
    for(;iterations<100;iterations++){
      let changed=0;
      const previousGroup = tracked < 0 || labels[tracked] < 0 ? null : labels[tracked];
      const sums=Array.from({length:k},()=>Array(cols).fill(0)),sizes=Array(k).fill(0);
      matrix.forEach((x,i)=>{
        let group=0,d=distance(x,centers[0]);
        for(let c=1;c<k;c++){const nd=distance(x,centers[c]);if(nd<d){d=nd;group=c;}}
        if(labels[i]!==group)changed++;
        labels[i]=group;sizes[group]++;
        for(let b=0;b<cols;b++)sums[group][b]+=x[b];
      });
      check(sizes.every(v=>v>0),'Empty cluster; reduce cluster count or change the seed');
      trace?.assignment(response, mode, iterations+1, changed, sizes, previousGroup,
        tracked < 0 ? null : labels[tracked], matrix[tracked], centers);
      for(let c=0;c<k;c++)for(let b=0;b<cols;b++)centers[c][b]=sums[c][b]/sizes[c];
      if(!changed){iterations++;converged=true;break;}
    }
    return {schema:'neuropixels-response-clusters/1',method:'kmeans-farthest-initialization/1',normalization:mode,seed,k,
      ...(response.condition!=null?{referenceOutcome:response.condition}:{}),
      unitIds,labels:Array.from(labels),centroids:centers,excludedUnits,iterations,converged,
      inertia:matrix.reduce((sum,x,i)=>sum+distance(x,centers[labels[i]]),0),
      interpretation:'Groups summarize the selected event-response features.'};
  }
  function groupedRows(response,clusters){
    const assignment=new Map(clusters?.unitIds.map((id,i)=>[id,clusters.labels[i]])||[]);
    const keys=clusters?[...Array(clusters.k).keys(),null]:[null];
    const byGroup=new Map(keys.map(key=>[key,[]]));
    response.unitIds.forEach((id,row)=>byGroup.get(assignment.get(id)??null)?.push({id,row}));
    return Array.from(byGroup).filter(([,rows])=>rows.length);
  }
  function responseSummary(response,clusters=null){
    const [units,,bins]=response.shape, groups=[];
    check(units===response.unitIds.length&&response.rateHz.length===units*bins,'Invalid response summary input');
    for(const [key,rows] of groupedRows(response,clusters)){
      const meanRateHz=Array(bins).fill(0);
      for(const {row}of rows)for(let bin=0;bin<bins;bin++)meanRateHz[bin]+=response.rateHz[row*bins+bin]/rows.length;
      groups.push({cluster:key,unitIds:rows.map(x=>x.id),meanRateHz});
    }
    return {schema:'neuropixels-response-summary/1',groups,unitOrder:groups.flatMap(g=>g.unitIds),meaning:'Equal-Unit mean of trial-averaged rates in Hz; not a confidence interval or a pooled spike rate.'};
  }
  // Samples are indices into existing data. Always keep the endpoints, and keep
  // a specified example (e.g. the peak count bin) when thinning a long curve.
  function previewIndices(length, limit, include) {
    if (length <= limit) return Array.from({length}, (_, i) => i);
    const steps = include == null ? limit : limit - 1;
    const indices = new Set(Array.from({length:steps}, (_, i) => Math.round(i*(length-1)/(steps-1))));
    if (include != null) indices.add(include);
    return [...indices].sort((a,b) => a-b);
  }
  function createProcessTrace(publish, preferredUnitId, context={}) {
    let unitId = context.unitId??null, referenceOutcome = context.referenceOutcome??null, conditionField=context.conditionField??null;
    const emit = (stage, fields) => publish({phase:'process',stage,unitId,referenceOutcome,conditionField,...fields});
    function observeBinning(trains, events, edges, options) {
      const comparison = comparisonOf(options);
      referenceOutcome = comparison?.values[0] ?? null;
      conditionField = comparison?.field ?? null;
      const trials = [];
      events.forEach((e,t) => {
        if (!comparison || conditionValue(e,conditionField) === referenceOutcome) trials.push(t);
      });
      const binCount = edges.length - 1, trialCount = trials.length;
      const start = edges[0], end = edges[binCount], binWidth = options.binWidth;
      const shownTrials = trials.slice(0,3);
      let chosen = trains.findIndex(train => train.unitId === preferredUnitId);
      let firstVariable = -1, firstActive = -1, finished = false;
      function align(u) {
        const train = trains[u];
        unitId = train.unitId;
        const rows = shownTrials.map(t => {
          const e = events[t], left = lowerBound(train.spikes, e.start + start);
          const spikeCount = lowerBound(train.spikes, e.start + end) - left;
          return {id:e.id, start:e.start, outcome:comparison ? conditionValue(e,conditionField) : null, spikeCount,
            spikes:previewIndices(spikeCount,48).map(i=>train.spikes[left+i])};
        });
        emit('alignment',{eventType:options.eventType ?? null,start,end,trialCount,events:rows});
      }
      if (chosen >= 0) align(chosen);
      function binCounts(u, counts) {
        const totals = new Float64Array(binCount);
        for (const t of trials) {
          const base = (u * events.length + t) * binCount;
          for (let b=0; b<binCount; b++) totals[b] += counts[base+b];
        }
        return totals;
      }
      return (u, counts) => {
        if (finished || (chosen >= 0 && u !== chosen)) return;
        let totals = binCounts(u, counts);
        if (chosen < 0) {
          const total = totals.reduce((a,b)=>a+b,0);
          if (total > 0 && firstActive < 0) firstActive = u;
          // Prefer a Unit eligible for shape clustering with at least one
          // visible spike in the fixed (unselected) sample of reference trials.
          const exposure = trialCount * binWidth;
          const meanHz = totals.reduce((sum,count)=>sum+count/exposure,0) / binCount;
          const variance = totals.reduce((sum,count)=>sum+(count/exposure-meanHz)**2,0) / binCount;
          if (variance > 1e-12) {
            if (firstVariable < 0) firstVariable = u;
            const spikes = trains[u].spikes;
            if (shownTrials.some(t=>lowerBound(spikes,events[t].start+end)>lowerBound(spikes,events[t].start+start))) chosen = u;
          }
          if (chosen < 0 && u === trains.length-1) chosen = firstVariable >= 0 ? firstVariable : Math.max(0,firstActive);
          if (chosen < 0) return;
          if (u !== chosen) totals = binCounts(chosen, counts);
          align(chosen);
        }
        let peak = 0;
        for (let b=1; b<binCount; b++) if (totals[b] > totals[peak]) peak = b;
        const bin = i => ({index:i,start:edges[i],end:edges[i+1],count:totals[i],hz:totals[i]/(trialCount*binWidth)});
        const exampleTrialCounts = shownTrials.map(t => ({id:events[t].id,start:events[t].start,
          count:counts[(chosen*events.length+t)*binCount+peak]}));
        emit('rates',{start,end,binWidth,trialCount,binCount,bins:previewIndices(binCount,64,peak).map(bin),
          example:bin(peak),exampleTrialCounts});
        finished = true;
      };
    }
    function assignment(response, normalization, iteration, changed, sizes, previousGroup, group, features, centers) {
      const edges = response.binEdges, sample = previewIndices(edges.length-1,48);
      const shown = new Set(centers.slice(0,group != null && group >= 4 ? 3 : 4).map((_,i)=>i));
      if (group != null) shown.add(group);
      emit('cluster',{normalization,iteration,changed,sizes:sizes.slice(),previousGroup,group,converged:changed===0,
        points:sample.map(i=>({index:i,time:(edges[i]+edges[i+1])/2,value:features?.[i] ?? null})),
        centers:[...shown].map(c=>({group:c,values:sample.map(i=>centers[c][i])}))});
    }
    function order(response, clusters) {
      const grouped = groupedRows(response, clusters), before = [], after = [], groups = [];
      let beforeRow, afterRow, trackedGroup;
      for (const [group,rows] of grouped) {
        groups.push({group,size:rows.length,firstRow:after.length+1});
        for (const {id,row} of rows) {
          before[row] = {unitId:id,row:row+1,group};
          after.push({unitId:id,row:after.length+1,group});
          if (id === unitId) { beforeRow = row+1; afterRow = after.length; trackedGroup = group; }
        }
      }
      const sampleRows = (rows,selected) => rows.filter((_,i)=>i<4 || Math.abs(i+1-selected)<=1);
      emit('order',{unitCount:before.length,beforeRow,afterRow,group:trackedGroup,
        before:sampleRows(before,beforeRow),after:sampleRows(after,afterRow),groups});
    }
    return {get unitId(){return unitId;},observeBinning,assignment,order};
  }
  function adjustedRandIndex(a,b){
    check(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.length>=2,'ARI requires matched partitions with at least two members');
    const cells=new Map(),rows=new Map(),cols=new Map(),choose=n=>n*(n-1)/2;
    for(let i=0;i<a.length;i++){check(Number.isSafeInteger(a[i])&&Number.isSafeInteger(b[i]),'ARI labels must be integers');const key=`${a[i]}:${b[i]}`;cells.set(key,(cells.get(key)||0)+1);rows.set(a[i],(rows.get(a[i])||0)+1);cols.set(b[i],(cols.get(b[i])||0)+1);}
    const sum=m=>[...m.values()].reduce((s,n)=>s+choose(n),0),x=sum(cells),r=sum(rows),c=sum(cols),expected=r*c/choose(a.length),max=(r+c)/2;
    return Math.abs(max-expected)<1e-15?1:(x-expected)/(max-expected);
  }
  function splitLimit(units,trials,bins,k,iterations=5){
    if(trials<4 || k<2 || units<=k || !(bins>0))return 0;
    // Budget both half fits and the retained trial/Unit identities for each split.
    const work=units*bins*(trials+k*(k+2*Math.max(5,iterations)));
    return Math.min(MAX_SPLITS,Math.floor(1e9/work),Math.floor(250000/(units+Math.floor(trials/2))));
  }
  function splitHalfStability(response,clusters,options={},progress=()=>{}){
    const repeats=options.repeats??DEFAULT_SPLITS,seed=options.seed??1;
    check(Number.isSafeInteger(repeats)&&repeats>=1&&repeats<=MAX_SPLITS&&Number.isSafeInteger(seed)&&seed>=0&&seed<=4294967295,'Invalid stability repeats or seed');
    const parameters={repeats,seed,k:clusters?.k??0,normalization:clusters?.normalization??'shape',split:'seeded-balanced-random-event-halves/1',comparison:'adjusted-rand-index/1'},[units,trials,bins]=response.shape;
    const base={schema:'neuropixels-response-stability/1',parameters,
      trialOrder:response.condition!=null?'conditionResponse.eventIds':'response.eventIds',...(response.condition!=null?{referenceOutcome:response.condition}:{}),
      interpretation:'Descriptive event split-half sensitivity at fixed k. Each split draws from the same set of events.'};
    const unavailable=reason=>({...base,status:'unavailable',reason,runs:[]});
    if(!clusters||clusters.k<2)return unavailable('At least two response groups are required');
    if(trials<4)return unavailable('At least four accepted events are required');
    if(units<=clusters.k)return unavailable('Split-half comparison requires more Units than groups');
    const maxSplits=splitLimit(units,trials,bins,clusters.k,clusters.iterations);
    if(repeats>maxSplits)return unavailable(`Split-half work limit: this selection supports up to ${maxSplits} splits. Use fewer Units or events, fewer groups, or wider bins.`);
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
        const x=a.labels.filter((_,i)=>lookup.has(a.unitIds[i])),y=shared.map(id=>lookup.get(id));
        check(new Set(x).size>1&&new Set(y).size>1,'Shared Units form a trivial partition');
        run.ari=adjustedRandIndex(x,y);run.status='available';
      }catch(error){run.reason=error.message;}
      runs.push(run);progress({phase:'split-half-stability',completed:repeat+1,total:repeats});
    }
    const values=runs.filter(r=>r.status==='available').map(r=>r.ari);
    return {...base,status:values.length===repeats?'available':values.length?'partial':'unavailable',runs,successful:values.length,meanARI:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,minARI:values.length?Math.min(...values):null,maxARI:values.length?Math.max(...values):null};
  }
  const workerSource = () => `const EventAnalysis = (${createEventAnalysis.toString()})();`;
  return {SCHEMA,VERSION,CONDITION_VERSION,COMPARISON_VERSION,RULE_VERSION,LABEL_FIELD,eventOnsets,otherOnsetRange,MAX_CELLS,MAX_BINS,MAX_SPLITS,DEFAULT_SPLITS,recordedOutcome,validateEventSet,fromExperimentalEvents,fromAnnotations,lowerBound,validateCoverage,responseCoverage,comparisonOf,conditionValue,conditionFields,conditionText,selectResponseEvents,validateResponsePlan,eventWindows,onsetFraction,commonCoverage,computeResponses,conditionResponse,clusterResponses,responseSummary,createProcessTrace,adjustedRandIndex,splitLimit,splitHalfStability,workerSource};
});
