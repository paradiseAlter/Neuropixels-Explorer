// SPDX-License-Identifier: MIT
((root) => {
  'use strict';
  const core=root.NeuropixelExplorerCore || (typeof require==='function' && require('./kilosort-core'));
  async function scopeKey(keys){
    const encoded=JSON.stringify(keys.slice().sort()),prefix='@probes:';
    if(encoded.length+prefix.length<=200)return prefix+encoded;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(encoded));
    return prefix+Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  }
  function originalUnit(recording,id){return recording?.jointUnits?.get(Number(id)) || null;}
  function analysisIds(recording,refs){
    const requested=new Set(refs.map(ref=>JSON.stringify([ref.recordingKey,ref.unitId])));
    const ids=new Set(refs.filter(ref=>ref.recordingKey===recording?.key).map(ref=>ref.unitId));
    for(const [id,ref] of recording?.jointUnits || [])if(requested.has(JSON.stringify([ref.recordingKey,ref.unitId])))ids.add(id);
    return [...ids];
  }
  function unitPlan(sources){
    const counts=new Map();
    for(const source of sources)for(const u of source.units)counts.set(u.id,(counts.get(u.id)||0)+1);
    const aliases=new Map(),rows=[],shanks=new Map();let alias=-1;
    for(const {recording,probeName,units} of sources){
      const ids=new Map();
      for(const u of units){
        let id=u.id;
        if(!Number.isSafeInteger(id) || ids.has(id))throw Error('Invalid source Unit ID');
        if(counts.get(id)>1 || id>2147483647 || id< -2147483648){
          while(counts.has(alias))alias--;
          id=alias--;
        }
        ids.set(u.id,id);
        const shank=JSON.stringify([recording.key,u.shankId??0]);
        if(!shanks.has(shank))shanks.set(shank,shanks.size);
        rows.push({cluster_id:id,x_um:u.x,probe_depth_um:u.depthUm,brain_region:u.region,atlas_color_hex:u.regionColor,
          shank_id:shanks.get(shank),shankId:u.shankId??0,recordingKey:recording.key,unitId:u.id,probeName,quality:u.quality||'unknown'});
      }
      aliases.set(recording.key,ids);
    }
    return {rows,aliases};
  }
  // Output chunks become immutable Blobs. Only one input block per probe is resident in the Worker.
  async function mergeSpikeFiles(parts,progress){
    const block=131072;
    async function input(file){
      const h=await readNpyHeader(file);
      if(!Number.isSafeInteger(h.count)||h.shape.length!==1 || h.dataOffset+h.itemSize*h.count!==file.size)throw Error('Invalid spike array size');
      async function read(start,n){
        const offset=h.dataOffset+start*h.itemSize,buf=await file.slice(offset,offset+n*h.itemSize).arrayBuffer();
        const values=typedData(buf,{...h,count:n,dataOffset:0});
        if(values)return values;
        const view=new DataView(buf);
        return Array.from({length:n},(_,i)=>scalarFromDataView(view,i*h.itemSize,h.descr));
      }
      return {h,read};
    }
    const tracks=await Promise.all(parts.map(async part=>{
      const [t,c]=await Promise.all([input(part.times),input(part.clusters)]);
      if(t.h.count!==c.h.count || !/[iu][1248]$/.test(c.h.descr) || !(part.rate>0) || !Number.isFinite(part.rate))throw Error('Invalid spike pair or sample rate');
      return {t,c,rate:part.rate,ids:new Map(part.ids),next:0,index:0,at:Infinity,prior:-1};
    }));
    async function refill(s){
      const n=Math.min(block,s.t.h.count-s.next);s.index=0;
      if(!n){s.at=Infinity;return;}
      [s.times,s.clusters]=await Promise.all([s.t.read(s.next,n),s.c.read(s.next,n)]);s.next+=n;
      advance(s);
    }
    function advance(s){
      const value=Number(s.times[s.index]);
      if(!Number.isFinite(value)||value<s.prior || value<0 || ((typeof s.times[s.index]==='bigint')&&!Number.isSafeInteger(value)))throw Error('Invalid or unordered spike time');
      s.prior=value;s.at=value/s.rate;
    }
    await Promise.all(tracks.map(refill));
    const total=tracks.reduce((n,s)=>n+s.t.h.count,0);
    function header(dtype){
      let h="{'descr': '"+dtype+"', 'fortran_order': False, 'shape': ("+String(total)+",), }";
      h+=' '.repeat((64-(10+h.length+1)%64)%64)+'\n';
      const out=new Uint8Array(10+h.length);out.set([147,78,85,77,80,89,1,0,h.length&255,h.length>>8]);out.set(new TextEncoder().encode(h),10);return out;
    }
    const times=[header('<f8')],clusters=[header('<i4')];
    for(let done=0;done<total;){
      const n=Math.min(block,total-done),t=new Float64Array(n),c=new Int32Array(n);
      for(let j=0;j<n;j++){
        let s=tracks[0];for(let i=1;i<tracks.length;i++)if(tracks[i].at<s.at)s=tracks[i];
        const id=s.ids.get(Number(s.clusters[s.index]));
        if(id===undefined)throw Error('Missing source Unit metadata');
        t[j]=s.at;c[j]=id;
        if(++s.index>=s.times.length)await refill(s);else advance(s);
      }
      times.push(new Blob([t]));clusters.push(new Blob([c]));done+=n;progress(done,total);
    }
    return {times:new Blob(times),clusters:new Blob(clusters)};
  }
  function mergedBlobs(parts,signal,onProgress){
    const source=[core.parseNpyHeaderBuffer,core.readNpyHeader,core.typedData,core.scalarFromDataView,mergeSpikeFiles].map(f=>f.toString()).join('\n')+
      "\nconst fileNameOf=f=>f.name;self.onmessage=async({data})=>{try{self.postMessage({result:await mergeSpikeFiles(data,(done,total)=>self.postMessage({done,total}))});}catch(e){self.postMessage({error:e.message});}}";
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'})),worker=new Worker(url);
    let abort;
    return new Promise((resolve,reject)=>{
      abort=()=>reject(new DOMException('Cancelled','AbortError'));
      signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
      worker.onerror=e=>reject(Error(e.message));
      worker.onmessage=({data})=>data.result?resolve(data.result):data.error?reject(Error(data.error)):onProgress(data.done,data.total);
      worker.postMessage(parts);
    }).finally(()=>{worker.terminate();URL.revokeObjectURL(url);signal?.removeEventListener('abort',abort);});
  }
  async function makeRecording(sources,name,signal,onProgress){
    sources=sources.slice().sort((a,b)=>a.recording.key<b.recording.key?-1:1);
    const sourceKeys=sources.map(s=>s.recording.key),key=await scopeKey(sourceKeys);
    const {rows,aliases}=unitPlan(sources),files=[];
    function add(name,data){files.push(new File([data],name,{lastModified:0}));}
    const events=new Map(),eventSources=[],excluded=[],observations=[],coverageIssues=[];
    let hasCoverage=false;
    for(const {recording:r} of sources){
      if(r.eventsFile){
        const set=root.NeuropixelsEventAnalysis.validateEventSet(JSON.parse(await r.eventsFile.text()),r.key);
        eventSources.push({recordingKey:r.key,source:set.source});excluded.push(...(set.excluded||[]));
        for(const e of set.events){
          const saved=events.get(e.id);
          if(saved && JSON.stringify(saved)!==JSON.stringify(e)){
            const id=JSON.stringify([r.key,e.id]);events.set(id,{...e,id});
          }else events.set(e.id,e);
        }
      }
      if(r.coverageFile){
        const c=JSON.parse(await r.coverageFile.text());
        if(c.recordingId!==r.key || c.timebase!=='neural_seconds' || c.schema!=='neuropixels-recording-coverage/1' ||
            c.source?.kind!=='NWB.units.obs_intervals'||c.source?.status!=='source-reported' || !Array.isArray(c.units))throw Error('Invalid observation metadata · '+r.name);
        const ids=aliases.get(r.key);
        for(const u of c.units){
          const id=ids.get(u.unitId);if(id!==undefined)observations.push({unitId:id,intervals:root.NeuropixelsEventAnalysis.validateCoverage(u.intervals)});
        }
        for(const item of c.excluded||[]){
          if(item.unitId===undefined)coverageIssues.push({...item,recordingKey:r.key});
          else if(ids.has(item.unitId))coverageIssues.push({...item,unitId:ids.get(item.unitId),recordingKey:r.key});
        }
        hasCoverage=true;
      }
    }
    const parts=sources.map(({recording:r})=>({times:r.spikeTimesFile,clusters:r.spikeClustersFile,rate:r.sampleRate,ids:[...aliases.get(r.key)]}));
    const blobs=await mergedBlobs(parts,signal,onProgress);
    add('spike_times.npy',blobs.times);add('spike_clusters.npy',blobs.clusters);add('params.py','sample_rate = 1\n# Probe / Unit IDs: '+JSON.stringify(rows.map(r=>[r.cluster_id,r.recordingKey,r.unitId]))+'\n');
    add('cluster_group.tsv','cluster_id\tgroup\n'+rows.map(u=>u.cluster_id+'\t'+u.quality).join('\n'));
    const metadata=JSON.stringify({sourceRecordings:sourceKeys,units:rows});
    add('explorer-units.json',metadata);
    if(events.size){
      const invalid=eventSources.map(s=>s.source?.invalidTimes).filter(Boolean);
      add('explorer-events.json',JSON.stringify({schema:root.NeuropixelsEventAnalysis.SCHEMA,recordingId:key,timebase:'neural_seconds',
        source:{kind:'joint-probes',probes:eventSources,...(invalid.length?{invalidTimes:invalid[0]}:{})},events:[...events.values()],excluded}));
    }
    if(hasCoverage)add('explorer-coverage.json',JSON.stringify({schema:'neuropixels-recording-coverage/1',recordingId:key,timebase:'neural_seconds',
      source:{kind:'NWB.units.obs_intervals',status:'source-reported',sourceRecordings:sourceKeys},units:observations,excluded:coverageIssues}));
    const rec=await core.indexExperiment({key,name,files,byName:new Map(files.map(f=>[f.name,f]))});
    rec.units=rows;rec.jointSources=sourceKeys;rec.jointUnits=new Map(rows.map(row=>[row.cluster_id,row]));
    rec.jointSourceRecords=sources.map(s=>s.recording);
    return rec;
  }
  const api={scopeKey,originalUnit,analysisIds,unitPlan,makeRecording};
  root.NeuropixelsJointRecording=api;if(typeof module==='object')module.exports=api;
})(globalThis);
