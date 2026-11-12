// SPDX-License-Identifier: MIT
((root,factory)=>{const api=factory(root.NeuropixelsEventAnalysis||(typeof require==='function'?require('./event-analysis-core.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;root.NeuropixelsEventAnalysisStorage=api;})(globalThis,(E)=>{
  'use strict';
  const SCHEMA='neuropixels-event-analysis-binary/1', MAGIC='NEUROEA1', CHUNK=1048576, MAX_META=16*1024*1024, MAX_BYTES=256*1024*1024;
  const LITTLE_ENDIAN=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  const digest=async bytes=>hex(await crypto.subtle.digest('SHA-256',bytes));
  const digestJSON=value=>digest(new TextEncoder().encode(JSON.stringify(value)));
  const abort=signal=>{if(signal?.aborted)throw new DOMException('Analysis operation cancelled','AbortError');};
  async function fingerprint(file,signal,progress=()=>{}){
    check(file?.slice&&Number.isSafeInteger(file.size)&&file.size>=0,'Missing analysis source file');
    const hashes=[];for(let offset=0;offset<file.size;offset+=CHUNK){abort(signal);hashes.push(await digest(await file.slice(offset,offset+CHUNK).arrayBuffer()));progress(Math.min(file.size,offset+CHUNK),file.size);}
    abort(signal);return {algorithm:'sha256-ordered-chunks/1',chunkBytes:CHUNK,size:file.size,digest:await digestJSON({domain:'neuropixels-source/1',chunkBytes:CHUNK,size:file.size,hashes})};
  }
  async function sourceFingerprints(sources,signal,progress=()=>{}){
    const out=[],roles=new Set();for(const {role,file}of sources){check(typeof role==='string'&&!roles.has(role),'Invalid or duplicate source role');roles.add(role);out.push({role,...await fingerprint(file,signal,(done,total)=>progress({role,done,total}))});}return out;
  }
  function validate(record){
    const r=record?.response,p=r?.parameters,shape=r?.shape;
    check(r?.schema==='neuropixels-event-response/1'&&r.version===E.VERSION,'Unsupported saved response version');
    check(Array.isArray(shape)&&shape.length===3&&shape.every(n=>Number.isSafeInteger(n)&&n>0),'Invalid saved response shape');
    const [u,t,b]=shape,cells=u*t*b;check(u<=4096&&t<=100000&&b<=5000&&Number.isSafeInteger(cells)&&cells<=32000000,'Saved response exceeds supported limits');
    check(Array.isArray(r.unitIds)&&r.unitIds.length===u&&r.unitIds.every(Number.isSafeInteger)&&new Set(r.unitIds).size===u,'Invalid saved Unit identities');
    E.validateEventSet({schema:E.SCHEMA,timebase:'neural_seconds',recordingId:r.recordingId,events:r.events});
    check(r.events.length===t&&Array.isArray(r.eventIds)&&r.eventIds.length===t&&r.eventIds.every((id,i)=>id===r.events[i].id),'Invalid saved event identities');
    check(r.counts instanceof Uint32Array&&r.counts.length===cells&&r.rateHz instanceof Float64Array&&r.rateHz.length===u*b,'Invalid saved response tensors');
    check(p&&p.alignment==='start'&&[p.start,p.end,p.binWidth].every(Number.isFinite)&&p.binWidth>0&&p.end>p.start,'Invalid saved response parameters');
    check(Array.isArray(r.binEdges)&&r.binEdges.length===b+1&&r.binEdges.every((v,i)=>Number.isFinite(v)&&Math.abs(v-(p.start+i*p.binWidth))<=1e-10*Math.max(1,Math.abs(v)))&&Math.abs(r.binEdges[b]-p.end)<=1e-10*Math.max(1,Math.abs(p.end)),'Invalid saved bin edges');
    E.validateCoverage(p.coverage);
    for(let unit=0;unit<u;unit++)for(let bin=0;bin<b;bin++){
      let sum=0;for(let trial=0;trial<t;trial++)sum+=r.counts[(unit*t+trial)*b+bin];
      const value=r.rateHz[unit*b+bin],expected=sum/(t*p.binWidth);
      check(Number.isFinite(value)&&value>=0&&Math.abs(value-expected)<=1e-10*Math.max(1,expected),'Saved rate disagrees with its spike counts');
    }
    const c=record.clusters;
    if(c){
      check(c.schema==='neuropixels-response-clusters/1'&&c.method==='kmeans-farthest-initialization/1'&&['shape','rate'].includes(c.normalization)&&Number.isSafeInteger(c.k)&&c.k>0&&c.k<=32,'Unsupported saved clusters');
      check(Array.isArray(c.unitIds)&&c.unitIds.length>0&&new Set(c.unitIds).size===c.unitIds.length&&c.unitIds.every(id=>r.unitIds.includes(id))&&Array.isArray(c.labels)&&c.labels.length===c.unitIds.length&&c.labels.every(n=>Number.isInteger(n)&&n>=0&&n<c.k),'Invalid saved cluster identities');
      check(Array.isArray(c.centroids)&&c.centroids.length===c.k&&c.centroids.every(row=>Array.isArray(row)&&row.length===b&&row.every(Number.isFinite)),'Invalid saved centroids');
      check(Number.isSafeInteger(c.seed)&&c.seed>=0&&c.seed<=4294967295&&Number.isSafeInteger(c.iterations)&&c.iterations>0&&c.iterations<=100&&typeof c.converged==='boolean'&&Number.isFinite(c.inertia)&&c.inertia>=0,'Invalid saved cluster provenance');
      check(Array.isArray(c.excludedUnits)&&c.excludedUnits.every(x=>r.unitIds.includes(x.unitId)&&x.reason==='constant_response')&&new Set([...c.unitIds,...c.excludedUnits.map(x=>x.unitId)]).size===u&&c.unitIds.length+c.excludedUnits.length===u&&new Set(c.labels).size===c.k,'Invalid saved cluster exclusions');
    }
    check(record.input?.sourceKind==='experiment'||record.input?.sourceKind==='annotation','Missing saved event source');
    check(Number.isFinite(record.input.sampleRate)&&record.input.sampleRate>0,'Invalid saved sample rate');
    const fingerprints=record.input.sourceFingerprints;
    check(/^[a-f0-9]{64}$/.test(record.input.eventDigest)&&Array.isArray(fingerprints)&&fingerprints.length>=3&&fingerprints.every(f=>['spikeTimes','spikeClusters','sampleRate','events','coverage'].includes(f.role)&&/^[a-f0-9]{64}$/.test(f.digest)&&f.algorithm==='sha256-ordered-chunks/1'&&f.chunkBytes===CHUNK&&Number.isSafeInteger(f.size)&&f.size>=0)&&new Set(fingerprints.map(f=>f.role)).size===fingerprints.length&&['spikeTimes','spikeClusters','sampleRate'].every(role=>fingerprints.some(f=>f.role===role)),'Missing saved source fingerprints');
    check(record.provenance?.recordingId===r.recordingId&&['user-declared-unverified','source-reported-unit-intersection'].includes(record.provenance.coverageOrigin),'Missing saved coverage provenance');
    if(record.diagnostics)validateDiagnostics(record.diagnostics,r,record.clusters);
    return record;
  }
  function validateDiagnostics(d,response,clusters){
    const p=d.parameters,t=response.shape[1],uint=n=>Number.isSafeInteger(n)&&n>=0&&n<=4294967295;
    check(d.schema==='neuropixels-response-stability/1'&&['available','partial','unavailable'].includes(d.status)&&d.trialOrder==='response.eventIds'&&Array.isArray(d.runs)&&p?.split==='seeded-balanced-random-event-halves/1'&&p.comparison==='adjusted-rand-index/1','Unsupported saved stability diagnostics');
    check(Number.isSafeInteger(p.repeats)&&p.repeats>=1&&p.repeats<=20&&uint(p.seed)&&p.k===(clusters?.k??0)&&p.normalization===(clusters?.normalization??'shape'),'Invalid saved stability parameters');
    if(!d.runs.length){check(d.status==='unavailable'&&typeof d.reason==='string'&&d.reason.length>0,'Missing stability unavailability reason');check((d.successful==null||d.successful===0)&&['meanARI','minARI','maxARI'].every(key=>d[key]==null),'Empty stability runs cannot have a summary');return;}
    check(d.runs.length===p.repeats,'Incomplete saved stability runs');const values=[];
    for(const [i,run]of d.runs.entries()){
      check(run.repeat===i&&uint(run.fitSeed)&&Array.isArray(run.leftEventIndices)&&run.leftEventIndices.length===Math.floor(t/2)&&run.leftEvents===run.leftEventIndices.length&&run.rightEvents===t-run.leftEvents&&new Set(run.leftEventIndices).size===run.leftEventIndices.length&&run.leftEventIndices.every(n=>Number.isInteger(n)&&n>=0&&n<t),'Invalid saved stability split');
      if(run.status==='available'){
        check(Number.isFinite(run.ari)&&run.ari>=-1&&run.ari<=1&&Array.isArray(run.unitIds)&&run.unitIds.length>=Math.max(3,p.k+1)&&new Set(run.unitIds).size===run.unitIds.length&&run.unitIds.every(id=>response.unitIds.includes(id)),'Invalid saved stability comparison');values.push(run.ari);
      }else check(run.status==='unavailable'&&typeof run.reason==='string'&&run.reason.length>0,'Missing split failure reason');
    }
    check(d.successful===values.length&&d.status===(values.length===p.repeats?'available':values.length?'partial':'unavailable'),'Invalid saved stability status');
    const expected=values.length?[values.reduce((a,b)=>a+b,0)/values.length,Math.min(...values),Math.max(...values)]:[null,null,null];
    for(const [i,key]of ['meanARI','minARI','maxARI'].entries())check(expected[i]===null?d[key]===null:Number.isFinite(d[key])&&Math.abs(d[key]-expected[i])<1e-12,'Saved stability summary disagrees with its runs');
  }
  function tensorBytes(array,kind){
    if(LITTLE_ENDIAN)return new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
    const bytes=new Uint8Array(array.length*(kind==='counts'?4:8)),view=new DataView(bytes.buffer);
    for(let i=0;i<array.length;i++)if(kind==='counts')view.setUint32(i*4,array[i],true);else view.setFloat64(i*8,array[i],true);return bytes;
  }
  async function pack(record){
    validate(record);const {counts,rateHz,...response}=record.response;
    check(12+counts.byteLength+rateHz.byteLength<=MAX_BYTES,'Analysis asset exceeds storage limits');
    const tensors=[tensorBytes(counts,'counts'),tensorBytes(rateHz,'rate')];
    const payload={record:{response,clusters:record.clusters||null,diagnostics:record.diagnostics||null,provenance:record.provenance,input:record.input},countsLength:counts.length,rateLength:rateHz.length,countsSHA256:await digest(tensors[0]),rateSHA256:await digest(tensors[1])};
    const manifest={schema:SCHEMA,...payload,metadataSHA256:await digestJSON(payload)};
    const json=new TextEncoder().encode(JSON.stringify(manifest));check(json.length<=MAX_META&&12+json.length+tensors[0].length+tensors[1].length<=MAX_BYTES,'Analysis asset exceeds storage limits');
    const prefix=new Uint8Array(12);prefix.set(new TextEncoder().encode(MAGIC));new DataView(prefix.buffer).setUint32(8,json.length,true);
    return new Blob([prefix,json,...tensors],{type:'application/octet-stream'});
  }
  async function unpack(blob){
    check(blob?.size>=12&&blob.size<=MAX_BYTES,'Invalid saved analysis size');
    const prefix=new Uint8Array(await blob.slice(0,12).arrayBuffer());check(new TextDecoder().decode(prefix.slice(0,8))===MAGIC,'Unsupported saved analysis format');
    const length=new DataView(prefix.buffer).getUint32(8,true);check(length<=MAX_META&&12+length<=blob.size,'Invalid saved analysis metadata');
    const m=JSON.parse(await blob.slice(12,12+length).text());check(m.schema===SCHEMA,'Unsupported saved analysis schema');
    const {schema,metadataSHA256,...payload}=m;check(await digestJSON(payload)===metadataSHA256,'Saved analysis metadata checksum mismatch');
    check(Number.isSafeInteger(m.countsLength)&&m.countsLength>0&&m.countsLength<=32000000&&Number.isSafeInteger(m.rateLength)&&m.rateLength>0&&m.rateLength<=20480000,'Invalid saved tensor size');
    const start=12+length,middle=start+4*m.countsLength;check(middle+8*m.rateLength===blob.size,'Truncated or oversized saved analysis');
    const countsBuffer=await blob.slice(start,middle).arrayBuffer(),rateBuffer=await blob.slice(middle).arrayBuffer();
    check(await digest(countsBuffer)===m.countsSHA256&&await digest(rateBuffer)===m.rateSHA256,'Saved analysis checksum mismatch');
    const counts=LITTLE_ENDIAN?new Uint32Array(countsBuffer):new Uint32Array(m.countsLength),rateHz=LITTLE_ENDIAN?new Float64Array(rateBuffer):new Float64Array(m.rateLength);
    if(!LITTLE_ENDIAN){const c=new DataView(countsBuffer),r=new DataView(rateBuffer);for(let i=0;i<counts.length;i++)counts[i]=c.getUint32(i*4,true);for(let i=0;i<rateHz.length;i++)rateHz[i]=r.getFloat64(i*8,true);}
    return validate({...m.record,response:{...m.record.response,counts,rateHz}});
  }
  async function verifySources(record,sources,eventSet,sampleRate,signal,progress){
    check(record.response.recordingId===eventSet.recordingId&&record.input.sampleRate===sampleRate,'Saved analysis belongs to different recording parameters');
    check(await digestJSON(eventSet)===record.input.eventDigest,'Events, annotations or time mapping changed; recompute this analysis');
    const p=record.response.parameters,coverage=E.validateCoverage(p.coverage),selected=eventSet.events.filter(e=>(!p.eventType||e.type===p.eventType)&&(!p.activeOnly||e.conditions?.active===true)),included=[],excluded=[];
    for(const e of selected)if(coverage.some(c=>e.start+p.start>=c[0]&&e.start+p.end<=c[1]))included.push(e);else excluded.push({id:e.id,reason:'incomplete_recording_coverage'});
    check(JSON.stringify(included)===JSON.stringify(record.response.events)&&JSON.stringify(excluded)===JSON.stringify(record.response.excludedEvents),'Saved event selection disagrees with its source and parameters');
    check(JSON.stringify(await sourceFingerprints(sources,signal,progress))===JSON.stringify(record.input.sourceFingerprints),'Source file content changed; recompute this analysis');
    abort(signal);return true;
  }
  return {SCHEMA,validate,pack,unpack,fingerprint,sourceFingerprints,digestJSON,verifySources};
});
