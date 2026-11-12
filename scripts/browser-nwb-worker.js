// SPDX-License-Identifier: MIT
// Runs after the bundled h5wasm IIFE; WORKERFS reads only requested HDF5 ranges.
function npy(array, descr, shape = [array.length]) {
  let header = `{'descr': '${descr}', 'fortran_order': False, 'shape': (${shape.join(', ')}${shape.length === 1 ? ',' : ''}), }`;
  header += ' '.repeat((64 - (10 + header.length + 1) % 64) % 64) + '\n';
  const out = new Uint8Array(10 + header.length + array.byteLength);
  out.set([147,78,85,77,80,89,1,0]); new DataView(out.buffer).setUint16(8, header.length, true);
  out.set(new TextEncoder().encode(header), 10); out.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), 10 + header.length);
  return out.buffer;
}
// Preserve validity metadata separately. NWB tags are user-defined; Allen's labels
// affect different data types, so they cannot be converted into a global spike mask.
function readInvalidTimes(table) {
  if (!table) return null;
  const result={schema:'neuropixels-nwb-invalid-times/1',sourceTable:'intervals/invalid_times',
    timebase:'neural_seconds',policy:'preserved-not-applied',rows:[],issues:[]};
  const problem=reason=>{result.issues.push({reason});};
  try {
    if(!table.keys){problem('invalid_table');return result;}
    const keys=new Set(table.keys());
    if(keys.has('timeseries'))result.timeseriesReferences='present-not-decoded';
    const bounded=(name,limit,required=true)=>{
      const dataset=table.get(name);if(!dataset){if(required)throw Error('missing_'+name);return null;}
      if(!Array.isArray(dataset.shape)||dataset.shape.length!==1||!Number.isSafeInteger(dataset.shape[0])||dataset.shape[0]<0||dataset.shape[0]>limit)throw Error('unsupported_or_oversized_'+name);
      const values=Array.from(dataset.value);if(values.length!==dataset.shape[0])throw Error('invalid_'+name+'_length');return values;
    };
    const starts=bounded('start_time',10000),stops=bounded('stop_time',10000),ids=bounded('id',10000,false);
    result.sourceRowCount=starts.length;
    if(stops.length!==starts.length||(ids&&ids.length!==starts.length))throw Error('column_length_mismatch');
    let tags=null,indices=null;
    try {
      tags=bounded('tags',50000,false);indices=bounded('tags_index',10000,false);
      if(indices&&(!tags||indices.length!==starts.length||indices.some((v,i)=>!Number.isSafeInteger(Number(v))||Number(v)<0||Number(v)>tags.length||(i&&Number(v)<Number(indices[i-1])))||Number(indices.at(-1)||0)!==tags.length))throw Error('invalid_tags_index');
      if(tags&&!indices&&tags.length!==starts.length)throw Error('unindexed_tags_length_mismatch');
      if(tags){let chars=0;tags=tags.map(v=>{if(typeof v!=='string'||v.length>1000||(chars+=v.length)>1000000)throw Error('unsupported_or_oversized_tags');return v;});}
    }catch(error){tags=null;indices=null;problem(error.message);}
    for(let i=0;i<starts.length;i++){
      const start=Number(starts[i]),end=Number(stops[i]),sourceId=String(ids?ids[i]:i);
      if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||sourceId.length>1000){result.issues.push({row:i,reason:'invalid_interval_or_id'});continue;}
      const row={sourceId,start,end,tags:tags?(indices?tags.slice(i?Number(indices[i-1]):0,Number(indices[i])):[tags[i]]):null};
      result.rows.push(row);
    }
  }catch(error){problem(error.message);}
  return result;
}
// Extract source events without inventing recording coverage or changing spike data.
function readAllenEvents(file, recordingId, session) {
  const intervals=file.get('intervals'), events=[], excluded=[],source={kind:'Allen NWB',session};
  if (!intervals?.keys) return {schema:'neuropixels-events/1',recordingId,timebase:'neural_seconds',source,events,excluded,coverage:null};
  const invalidTimes=readInvalidTimes(intervals.get('invalid_times'));
  if(invalidTimes)source.invalidTimes=invalidTimes;
  for (const tableName of intervals.keys()) {
    if(tableName==='invalid_times')continue;
    const table=intervals.get(tableName);
    if(!table?.keys)continue;
    const keys=new Set(table.keys());
    if(!keys.has('start_time'))continue;
    const starts=table.get('start_time').value, stops=keys.has('stop_time')?table.get('stop_time').value:null;
    const ids=keys.has('id')?table.get('id').value:null;
    const fields={};
    for(const name of ['active','is_change','omitted','image_name','stimulus_block','stimulus_name'])if(keys.has(name))fields[name]=table.get(name).value;
    if((stops&&stops.length!==starts.length)||(ids&&ids.length!==starts.length)||Object.values(fields).some(v=>v.length!==starts.length)){
      excluded.push({sourceTable:`intervals/${tableName}`,reason:'column_length_mismatch'});continue;
    }
    if(events.length+starts.length>100000){excluded.push({sourceTable:`intervals/${tableName}`,reason:'event_limit_exceeded'});continue;}
    for(let i=0;i<starts.length;i++) {
      const start=Number(starts[i]),end=stops?Number(stops[i]):null, sourceId=String(ids?ids[i]:i);
      if(!Number.isFinite(start)||start<0||(end!=null&&(!Number.isFinite(end)||end<start))){excluded.push({sourceTable:`intervals/${tableName}`,sourceId,reason:'invalid_interval'});continue;}
      const conditions={};
      for(const [name,values] of Object.entries(fields)) {
        const value=values[i];
        if(['active','is_change','omitted'].includes(name)) {
          if(value===true||value===1||value===1n)conditions[name]=true;
          else if(value===false||value===0||value===0n)conditions[name]=false;
        } else if(typeof value==='number') {if(Number.isFinite(value))conditions[name]=value;}
        else conditions[name]=String(value);
      }
      events.push({id:`${tableName}:${sourceId}:${i}`,sourceId,sourceTable:`intervals/${tableName}`,sourceKind:'experiment',
        type:fields.image_name && conditions.is_change===true?'image_change':fields.image_name && conditions.omitted===true?'omission':fields.image_name?'image_presentation':tableName,
        kind:end!=null&&end>start?'interval':'point',start,end,conditions});
    }
  }
  return {schema:'neuropixels-events/1',recordingId,timebase:'neural_seconds',source,events,excluded,coverage:null};
}

function readAllenCoverage(units, chosen, ids, recordingId, session, probe) {
  const data=units.get('obs_intervals');if(!data)return null;
  const shape=data.shape;
  const result={schema:'neuropixels-recording-coverage/1',recordingId,timebase:'neural_seconds',source:{kind:'NWB.units.obs_intervals',session,probe,status:'source-reported'},units:[],excluded:[]};
  // NWB stores ragged observation intervals as N x 2, indexed by Unit row.
  if(!Array.isArray(shape)||shape.length!==2||shape[1]!==2||!Number.isSafeInteger(shape[0])||shape[0]>200000){result.excluded.push({reason:'unsupported_observation_interval_shape'});return result;}
  const values=Array.from(data.value),raw=Array.isArray(values[0])?values.flat():values;
  const index=units.get('obs_intervals_index'),stops=index?Array.from(index.value,Number):null;
  if(raw.length!==shape[0]*2||(stops&&(stops.length!==ids.length||stops.some((n,i)=>!Number.isSafeInteger(n)||n<0||n>(shape[0])||(i>0&&n<stops[i-1]))||stops.at(-1)!==shape[0]))||(!stops&&shape[0]!==ids.length)){
    result.excluded.push({reason:'invalid_observation_interval_index'});return result;
  }
  for(const i of chosen){
    const first=stops?(i?stops[i-1]:0):i,last=stops?stops[i]:i+1,intervals=[];let previous=-Infinity,valid=last>first;
    for(let row=first;row<last;row++){const start=Number(raw[row*2]),end=Number(raw[row*2+1]);if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||start<previous){valid=false;break;}intervals.push([start,end]);previous=end;}
    if(valid)result.units.push({unitId:ids[i],intervals});else result.excluded.push({unitId:ids[i],reason:'invalid_observation_intervals'});
  }
  return result;
}

async function readAllen(file, probeName, progress = () => {}) {
  const e = file.get('general/extracellular_ephys/electrodes'), u = file.get('units');
  if (!e || !u?.get('spike_times_index') || !u.get('peak_channel_id')) throw new Error('需要 Allen ecephys NWB Units、peak_channel_id 和电极表；当前文件缺少这些数据。');
  const value = (g, key) => g.get(key).value;
  const ids = Array.from(value(u,'id'), Number), stops = Array.from(value(u,'spike_times_index'), Number);
  const electrodeIds = Array.from(value(e,'id'), Number), lookup = new Map(electrodeIds.map((id,i)=>[id,i]));
  const peaks = Array.from(value(u,'peak_channel_id'), v => lookup.get(Number(v))), probeIds = value(e,'probe_id');
  const devices = file.get('general/devices');
  const candidates = devices.keys().filter(k => devices.get(k).attrs.probe_id).map(name => {
    const id = Number(devices.get(name).attrs.probe_id.value);
    return { name, id, units: peaks.filter(p => p != null && Number(probeIds[p]) === id).length };
  }).filter(c => c.units);
  if (!probeName) return { candidates };
  const device = devices.get(probeName), rate = Number(device?.attrs.sampling_rate?.value), pid = Number(device?.attrs.probe_id?.value);
  if (!(rate > 0)) throw new Error('NWB 探针缺少有效 sampling_rate');
  const chosen = ids.map((_,i)=>i).filter(i=>peaks[i] != null && Number(probeIds[peaks[i]])===pid);
  if (!chosen.length) throw new Error('This probe has no Units');
  const x = value(e,'probe_horizontal_position'), y = value(e,'probe_vertical_position'), regions = value(e,'location');
  const quality = value(u,'quality'), spikes = u.get('spike_times');
  const arrays = [], metadata = [], cursor = new Uint32Array(chosen.length);
  let total = 0;
  for (const [j,i] of chosen.entries()) {
    const array = spikes.slice([[i ? stops[i-1] : 0, stops[i]]]);
    for(let k=0;k<array.length;k++) if(!Number.isFinite(array[k]) || array[k]<0 || (k && array[k]<array[k-1])) throw new Error('NWB spike times must be finite, nonnegative and sorted');
    arrays.push(array); total += array.length;
    if (!Number.isSafeInteger(ids[i]) || ids[i] > 2147483647) throw new Error('Unit ID exceeds current browser int32 support');
    metadata.push({cluster_id:ids[i], x_um:Number(x[peaks[i]]), probe_depth_um:Number(y[peaks[i]]), shank_id:0, brain_region:String(regions[peaks[i]]), region_annotation_status:'Original Allen NWB peak channel'});
    progress(`读取 ${probeName}: ${j+1}/${chosen.length} Units`);
  }
  if (!total) throw new Error('This probe has no spikes');
  // Merge sorted Unit trains without rounding the original NWB seconds.
  const heap = arrays.map((a,i)=>i).filter(i=>arrays[i].length), less=(a,b)=>arrays[a][cursor[a]]<arrays[b][cursor[b]];
  function down(index) { for(;;) {let c=index*2+1;if(c>=heap.length)return;if(c+1<heap.length&&less(heap[c+1],heap[c]))c++;if(!less(heap[c],heap[index]))return;[heap[index],heap[c]]=[heap[c],heap[index]];index=c;} }
  for(let i=(heap.length>>1)-1;i>=0;i--)down(i);
  const times = new Float64Array(total), clusters = new Int32Array(total);
  for(let n=0;n<total;n++) {const j=heap[0];times[n]=arrays[j][cursor[j]++]*rate;clusters[n]=ids[chosen[j]];if(cursor[j]===arrays[j].length){heap[0]=heap.at(-1);heap.pop();}if(heap.length)down(0);}
  const positions = []; for(let i=0;i<electrodeIds.length;i++)if(Number(probeIds[i])===pid)positions.push(Number(x[i]),Number(y[i]));
  const session = String(file.get('identifier').value);
  const folder = `allen-${session}-${probeName}`;
  const coverage=readAllenCoverage(u,chosen,ids,folder,session,probeName);
  const files = [
    ['spike_times.npy',npy(times,'<f8')], ['spike_clusters.npy',npy(clusters,'<i4')],
    ['channel_positions.npy',npy(new Float64Array(positions),'<f8',[positions.length/2,2])],
    ['params.py',`sample_rate = ${rate}\n`],
    ['explorer-events.json',JSON.stringify(readAllenEvents(file,folder,session))],
    ['cluster_group.tsv','cluster_id\tgroup\n'+chosen.map(i=>`${ids[i]}\t${quality[i]}`).join('\n')],
    ['explorer-units.json',JSON.stringify({session, probe:probeName, units:metadata, source:'Allen NWB peak-channel coordinates; no Kilosort templates'})]
  ].concat(coverage?[['explorer-coverage.json',JSON.stringify(coverage)]]:[]).map(([name,data])=>({name,path:`${folder}/${name}`,data}));
  return { files, session, probe:probeName, spikeCount:total, unitCount:chosen.length };
}
if (typeof self !== 'undefined' && typeof h5wasm !== 'undefined') self.onmessage = async ({data}) => {
  let file, FS;
  try {
    ({FS} = await h5wasm.ready); FS.mkdir('/work'); FS.mount(FS.filesystems.WORKERFS,{files:[data.file]},'/work');
    file = new h5wasm.File(`/work/${data.file.name}`,'r');
    const result = await readAllen(file,data.probe,message=>self.postMessage({progress:message}));
    self.postMessage(result,result.files?.filter(f=>f.data instanceof ArrayBuffer).map(f=>f.data)||[]);
  } catch(e) { self.postMessage({error:e.message}); }
  finally {file?.close();if(FS){try{FS.unmount('/work');FS.rmdir('/work');}catch{}}}
};
if(typeof module==='object')module.exports={readAllen,readAllenEvents,readAllenCoverage,readInvalidTimes,npy};
