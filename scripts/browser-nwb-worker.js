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
function nwbBool(value) {
  if(value===true || value===1 || value===1n)return true;
  if(value===false || value===0 || value===0n)return false;
}

function nwbFrame(value) {
  if(typeof value!=='number' && typeof value!=='bigint')return null;
  const frame=Number(value);
  return Number.isSafeInteger(frame) && frame>=0 ? frame : null;
}

function vectorLength(dataset) {
  const shape=dataset?.shape;
  return shape?.length===1 && Number.isSafeInteger(shape[0]) && shape[0]>=0 ? shape[0] : -1;
}

// Keep the presentation's measured onset; attach only the trial identity for source navigation.
function linkAllenTrials(changes, trials) {
  const sourceTable='intervals/trials';
  const summary={sourceTable,join:'start_frame=change_frame',eligible:changes.length,matched:0,unresolved:{}};
  const frameColumn=trials?.get('change_frame'),idColumn=trials?.get('id'),rows=vectorLength(frameColumn);
  const issue=!frameColumn?'missing_change_frame':rows<0||rows>100000||idColumn&&vectorLength(idColumn)!==rows?'invalid_trial_columns':null;
  const trialRows=new Map(),duplicates=new Set(),seen=new Set();
  const ids=!issue && idColumn ? idColumn.value : null;
  if(!issue){
    const frames=frameColumn.value;
    for(let row=0;row<rows;row++){
      const frame=nwbFrame(frames[row]);
      if(frame!==null)trialRows.set(frame,trialRows.has(frame)?-1:row);
    }
  }
  for(const {frame} of changes){if(seen.has(frame))duplicates.add(frame);seen.add(frame);}
  for(const {event,frame} of changes) {
    const row=trialRows.get(frame);
    const reason=issue || (frame===null ? 'missing_start_frame' : duplicates.has(frame) ? 'duplicate_active_presentation_frame' : row===undefined ? 'no_matching_trial' : row<0 ? 'duplicate_trial_frame' : null);
    if(reason){summary.unresolved[reason]=(summary.unresolved[reason]||0)+1;continue;}
    event.trial={sourceTable,sourceId:String(ids?ids[row]:row),row,changeFrame:frame};
    summary.matched++;
  }
  return summary;
}

// Extract source events without inventing recording coverage or changing spike data.
function readAllenEvents(file, recordingId, session, kind='Allen NWB') {
  const intervals=file.get('intervals'), events=[], excluded=[], changes=[], source={kind,session};
  const allen=kind==='Allen NWB';
  const presentationFields=allen?['active','is_change','omitted','image_name','stimulus_block','stimulus_name']:[];
  let conditionBytes=0;
  const readPaths=new Set();
  function addTimestamps(timestamps,sourceTable,type,idPrefix,annotations){
    if(readPaths.has(sourceTable))return;
    readPaths.add(sourceTable);
    const rows=vectorLength(timestamps);
    if(rows<0 || events.length+rows>100000){excluded.push({sourceTable,reason:'unsupported_or_oversized_timestamps'});return;}
    if(annotations && vectorLength(annotations)!==rows){excluded.push({sourceTable,reason:'column_length_mismatch'});return;}
    const labels=annotations?.value;
    for(const [row,start] of timestamps.value.entries()){
      const sourceId=String(row);
      if(!Number.isFinite(start)||start<0){excluded.push({sourceTable,sourceId,reason:'invalid_timestamp'});continue;}
      const label=labels?.[row];
      events.push({id:`${idPrefix}:${row}`,sourceTable,sourceId,sourceKind:'experiment',type:typeof label==='string' && label.trim() && label.length<=1000?label:type,kind:'point',start,end:null,conditions:{}});
    }
  }
  if(allen)for(const [type,path] of [['lick','processing/licking/licks/timestamps'],['reward','processing/rewards/volume/timestamps']]){
    const stamps=file.get(path);
    if(stamps)addTimestamps(stamps,path,type,type);
  }
  const invalidTimes=readInvalidTimes(intervals?.get('invalid_times'));
  if(invalidTimes)source.invalidTimes=invalidTimes;
  // NWB TimeIntervals and EventsTable share DynamicTable columns and row identity.
  const tables=[];
  for(const [base,container] of [['intervals',intervals],['events',file.get('events')]]){
    for(const tableName of container?.keys?.() || [])if(base!=='intervals' || tableName!=='invalid_times')tables.push({base,container,tableName});
  }
  for (const {base,container,tableName} of tables) {
    const table=container.get(tableName),sourceTable=base+'/'+tableName,isEventTable=base==='events';
    if(!table?.keys)continue;
    const keys=new Set(table.keys());
    const timeKey=isEventTable?'timestamp':'start_time';
    if(!keys.has(timeKey))continue;
    const rows=vectorLength(table.get(timeKey)),endKey=isEventTable?'duration':'stop_time';
    if(rows<0||events.length+rows>100000){excluded.push({sourceTable,reason:'event_limit_exceeded'});continue;}
    if(['id',endKey].some(k=>keys.has(k)&&vectorLength(table.get(k))!==rows)){
      excluded.push({sourceTable,reason:'column_length_mismatch'});continue;
    }
    const starts=table.get(timeKey).value, stops=keys.has(endKey)?table.get(endKey).value:null;
    const ids=keys.has('id')?table.get('id').value:null;
    const fields=new Map(), reserved=new Set(['id',timeKey,endKey,'start_frame','end_frame','timeseries']);
    if(allen)for(const name of ['hit','miss','trial_outcome'])reserved.add(name);
    for(const name of new Set([...presentationFields,...keys])){
      if(!keys.has(name)||reserved.has(name)||name.endsWith('_index')&&keys.has(name.slice(0,-6))||keys.has(name+'_index'))continue;
      const column=table.get(name);
      if(!rows||vectorLength(column)!==rows)continue;
      const enumMembers=column.metadata?.enum_type?.members;
      const bool=(enumMembers?.FALSE===0 && enumMembers?.TRUE===1 && Object.keys(enumMembers).length===2) || allen && ['active','omitted','is_change'].includes(name);
      // Skip compound records, references and variable-length arrays before reading their payloads.
      const dtype=column.dtype;
      if(dtype!==undefined && !enumMembers && !(typeof dtype==='string' && /^(?:[<>][bBhHiIqQefd]|[AS]\d*)$/.test(dtype)))continue;
      let bytes=(name.length+4)*rows;
      const baseline=presentationFields.includes(name),used=baseline?0:conditionBytes;
      const limit=12*1024*1024;
      if(column.metadata?.size*rows>limit || used+bytes>limit){
        (source.skippedConditionColumns||=[]).push({table:tableName,column:name,reason:'condition_size_limit'});continue;
      }
      const values=[];
      // Read variable-length text by slices so a large column need not be materialized in full.
      for(let offset=0;offset<rows && used+bytes<=limit;){
        const size=column.metadata?.vlen && column.slice ? Math.min(256,rows-offset) : rows;
        const batch=size===rows ? column.value : column.slice([[offset,offset+size]]);
        for(const raw of batch){
          let v=raw;
          if(bool && nwbBool(raw)!==undefined)v=nwbBool(raw);
          else if(typeof raw==='bigint')v=Number.isSafeInteger(Number(raw))?Number(raw):undefined;
          if(!(typeof v==='boolean'||Number.isFinite(v)||typeof v==='string' && v.length<=1000))v=undefined;
          bytes+=typeof v==='string'?2*v.length+2:12;
          values.push(v);
        }
        offset+=size;
      }
      if(used+bytes>limit){(source.skippedConditionColumns||=[]).push({table:tableName,column:name,reason:'condition_size_limit'});continue;}
      if(!baseline)conditionBytes+=bytes;
      fields.set(name,values);
    }
    const presentation=allen && base==='intervals' && tableName!=='trials' && fields.has('image_name');
    const frames=presentation && vectorLength(table.get('start_frame'))===rows && rows ? table.get('start_frame').value : null;
    for(let i=0;i<starts.length;i++) {
      const start=Number(starts[i]),sourceId=String(ids?ids[i]:i);
      let end=stops?Number(stops[i]):null;
      if(isEventTable && end!==null)end=Number.isNaN(end)?null:start+end;
      if(!Number.isFinite(start)||start<0||(end!=null&&(!Number.isFinite(end)||end<start))){excluded.push({sourceTable,sourceId,reason:'invalid_interval'});continue;}
      const conditions=Object.create(null);
      for(const [name,values] of fields)if(values[i]!==undefined)conditions[name]=values[i];
      const label=isEventTable?conditions.annotation:tableName!=='trials' && (conditions.event_type??conditions.label);
      const event={id:`${isEventTable?sourceTable:tableName}:${sourceId}:${i}`,sourceId,sourceTable,sourceKind:'experiment',
        type:presentation?(conditions.is_change===true?'image_change':conditions.omitted===true?'omission':'image_presentation'):typeof label==='string' && label.trim()?label:tableName,
        kind:end!=null&&end>start?'interval':'point',start,end,conditions};
      events.push(event);
      if(presentation && event.type==='image_change' && conditions.active===true)changes.push({event,frame:nwbFrame(frames?.[i])});
    }
  }
  if(changes.length)source.trialLinks=linkAllenTrials(changes,intervals.get('trials'));
  // Only explicitly discrete interfaces declare that each timestamp denotes an event.
  // ElectricalSeries, video frames and other sampled signals can have identical timestamp layouts.
  function scanSeries(container,path,behavioral=false){
    for(const name of container?.keys?.() || []){
      const node=container.get(name);
      if(!node?.keys)continue;
      const type=node.attrs?.neurodata_type?.value, childPath=path+'/'+name;
      if(type==='BehavioralEvents' && !behavioral){scanSeries(node,childPath,true);continue;}
      if(type!=='AnnotationSeries' && !(behavioral && type==='TimeSeries'))continue;
      addTimestamps(node.get('timestamps'),childPath+'/timestamps',name,childPath,type==='AnnotationSeries'?node.get('data'):null);
    }
  }
  scanSeries(file.get('acquisition'),'acquisition');
  scanSeries(file.get('stimulus/presentation'),'stimulus/presentation');
  const processing=file.get('processing');
  for(const name of processing?.keys?.() || [])scanSeries(processing.get(name),'processing/'+name);
  return {schema:'neuropixels-events/1',recordingId,timebase:'neural_seconds',source,events,excluded,coverage:null};
}

function readAllenCoverage(units, chosen, ids, recordingId, session, probe) {
  const data=units.get('obs_intervals');if(!data)return null;
  const shape=data.shape;
  const result={schema:'neuropixels-recording-coverage/1',recordingId,timebase:'neural_seconds',source:{kind:'NWB.units.obs_intervals',sourceTable:(units.path||'/units')+'/obs_intervals',session,probe,status:'source-reported'},units:[],excluded:[]};
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

function nwbRows(file,u,ids){
  const table=file.get('general/extracellular_ephys/electrodes'),devices=file.get('general/devices');
  const values=(group,key,n)=>{const d=group?.get(key);return d && vectorLength(d)===n ? d.value : null;};
  const electrodeIds=table?.get('id')?.value||[], count=electrodeIds.length;
  const peaks=values(u,'peak_channel_id',ids.length), probeIds=values(table,'probe_id',count);
  const deviceNames=new Map();
  for(const name of devices?.keys?.()||[]){
    const pid=devices.get(name)?.attrs?.probe_id?.value;
    if(pid!=null)deviceNames.set(String(pid),name);
  }
  // Standard Units.electrodes entries are electrode TABLE ROWS. Allen peak_channel_id entries are electrode IDs.
  const lookup=new Map(Array.from(electrodeIds,(id,i)=>[String(id),i]));
  const institute=file.get('general/institution')?.value;
  const allen=/\bAllen Institute\b/i.test(String(institute||'')) || [...deviceNames.values()].some(name=>devices.get(name).attrs?.namespace?.value==='ndx-aibs-ecephys');
  const groupNames=values(table,'group_name',count), groupRefs=groupNames?null:values(table,'group',count);
  const unitGroups=values(u,'electrode_group',ids.length);
  const unitProbes=values(u,'probe_name',ids.length)||values(u,'probe_id',ids.length)||values(u,'probe_index',ids.length);
  const referenceNames=new Map();
  function groupName(ref){
    if(typeof ref==='string')return ref.trim()||null;
    if(!ref?.ref_data)return null;
    const key=String(ref.ref_data);
    if(!referenceNames.has(key)){
      let name=null;
      try{name=file.dereference(ref)?.path?.split('/').pop()||null;}catch{/* An unresolved reference leaves the group unknown. */}
      referenceNames.set(key,name);
    }
    return referenceNames.get(key);
  }
  const electrodeGroups=Array.from(electrodeIds,(_,i)=>deviceNames.get(String(probeIds?.[i])) || groupName(groupNames?.[i]||groupRefs?.[i]));
  const links=u.get('electrodes'),indices=values(u,'electrodes_index',ids.length);
  const length=vectorLength(links);
  const validIndex=indices && Array.from(indices,Number).every((n,i)=>Number.isSafeInteger(n)&&n>=(i?Number(indices[i-1]):0)&&n<=length) && Number(indices[ids.length-1]??0)===length;
  const linkedRows=links && (validIndex || (!u.get('electrodes_index') && length===ids.length)) ? links.value : null;
  const x=values(table,'probe_horizontal_position',count), y=values(table,'probe_vertical_position',count);
  const regions=values(table,'location',count);
  const unitRegions=values(u,'brain_region',ids.length)||values(u,'location',ids.length)||values(u,'region',ids.length);
  const text=value=>typeof value==='string' && value.trim() && !['unknown','none','nan'].includes(value.trim().toLowerCase())?value.trim():null;
  const unanimous=items=>items.length && items.every(item=>item===items[0]) ? items[0] : null;
  const rows=ids.map((id,i)=>{
    const peak=peaks ? lookup.get(String(peaks[i])) : undefined;
    let channels=[];
    if(peak!=null)channels=[peak];
    else if(linkedRows){
      const start=validIndex?(i?Number(indices[i-1]):0):i, end=validIndex?Number(indices[i]):i+1;
      channels=Array.from(linkedRows.slice(start,end),Number);
      if(channels.some(n=>!Number.isInteger(n)||n<0||n>=count))channels=[];
    }
    const probe=unitProbes?.[i],regionValue=unitRegions?.[i];
    const numericProbe=(typeof probe==='number'&&Number.isSafeInteger(probe))||typeof probe==='bigint';
    const directProbe=text(probe) || (numericProbe ? 'Probe '+probe : null);
    const group=groupName(unitGroups?.[i])||unanimous(channels.map(j=>electrodeGroups[j]))||directProbe;
    const region=text(regionValue) || (typeof regionValue==='number' && Number.isSafeInteger(regionValue) || typeof regionValue==='bigint' ? 'Region ID '+regionValue : null);
    const electrodeRegion=unanimous(channels.map(j=>text(regions?.[j])));
    const unit={cluster_id:id};
    if(region||electrodeRegion){unit.brain_region=region||electrodeRegion;unit.region_annotation_status=region?'NWB Units':peak!=null?'NWB peak channel':'NWB linked electrodes';}
    // A multichannel Unit has no unique position. Absolute atlas x/y/z are not probe depth.
    if(channels.length===1){
      const j=channels[0];
      if(Number.isFinite(x?.[j]))unit.x_um=x[j];
      if(Number.isFinite(y?.[j]))unit.probe_depth_um=y[j];
      if(allen && peak!=null)unit.shank_id=0;
    }
    return {group:group||null,unit};
  });
  const groups=new Set(rows.map(row=>row.group).filter(Boolean));
  let unknown=groups.size?'Unassigned Units':'Units';
  while(groups.has(unknown))unknown+=' (unassigned)';
  for(const row of rows)row.group??=unknown;
  return {rows,allen,electrodeGroups,x,y,devices};
}

async function readAllen(file, probeName, progress = () => {}) {
  let u=file.get('units');
  if(!u){
    const processing=file.get('processing'),tables=[];
    for(const moduleName of processing?.keys?.()||[]){
      const module=processing.get(moduleName);
      for(const name of module?.keys?.()||[]){
        const candidate=module.get(name);
        if(candidate?.keys && candidate.attrs?.neurodata_type?.value==='Units')tables.push(candidate);
      }
    }
    if(tables.length>1)throw Error('NWB 包含多个已分选 Units 表：'+tables.map(t=>t.path).join(', ')+'。请将要查看的分选结果导出到 /units。');
    u=tables[0];
  }
  const spikes=u?.get('spike_times');
  if(!u?.get('id') || !spikes || !u.get('spike_times_index'))throw Error('NWB 需要已分选的放电记录：Units 表中的 id、spike_times、spike_times_index（/units 或 /processing 下的一个 Units 表）。仅有原始电压的文件需先完成 spike sorting。');
  const ids=Array.from(u.get('id').value,Number),stops=Array.from(u.get('spike_times_index').value,Number);
  if(!ids.length)throw Error('NWB /units has no Unit rows');
  if(vectorLength(u.get('id'))!==ids.length || !ids.every(Number.isSafeInteger) || new Set(ids).size!==ids.length)throw Error('NWB /units/id must contain unique, exactly representable integer IDs');
  if(vectorLength(u.get('spike_times_index'))!==ids.length || stops.length!==ids.length || stops.some((n,i)=>!Number.isSafeInteger(n)||n<(i?stops[i-1]:0)) || vectorLength(spikes)!==stops.at(-1))throw Error('Invalid NWB /units/spike_times_index: expected one cumulative end per Unit and a final end equal to the number of spike times');
  const session=file.get('identifier')?.value;
  if(typeof session!=='string'||!session.trim())throw Error('NWB /identifier is missing');
  const {rows,allen,electrodeGroups,x,y,devices}=nwbRows(file,u,ids);
  const kind=allen?'Allen NWB':'NWB';
  const recordingKey=probe=>`${allen?'allen':'nwb'}-${encodeURIComponent(session)}-${encodeURIComponent(probe)}`;
  const counts=new Map();
  rows.forEach(({group})=>counts.set(group,(counts.get(group)||0)+1));
  if(!probeName)return {kind,candidates:[...counts].map(([name,units])=>({name,key:recordingKey(name),units})).sort((a,b)=>a.name.localeCompare(b.name))};
  if(!counts.has(probeName))throw Error('This NWB group has no Units');
  const chosen=ids.map((_,i)=>i).filter(i=>rows[i].group===probeName);
  const deviceRate=Number(devices?.get(probeName)?.attrs?.sampling_rate?.value);
  const rate=Number.isFinite(deviceRate)&&deviceRate>0?deviceRate:1;
  const quality=u.get('quality')?.value;
  const arrays=[],metadata=[],cursor=new Uint32Array(chosen.length);
  let total=0;
  for(const [j,i] of chosen.entries()){
    const start=i?stops[i-1]:0, end=stops[i];
    const array=end>start?spikes.slice([[start,end]]):[];
    if(array?.length!==end-start)throw Error('Incomplete NWB spike train for Unit '+ids[i]);
    for(let k=0;k<array.length;k++)if(!Number.isFinite(array[k])||array[k]<0||(k&&array[k]<array[k-1]))throw Error('NWB spike times must be finite, nonnegative and sorted');
    arrays.push(array);total+=array.length;
    metadata.push({...rows[i].unit,spike_count:array.length});
    if(j%25===0 || j===chosen.length-1)progress(`读取 ${probeName}: ${j+1}/${chosen.length} Units`);
  }
  // Merge sorted Unit trains without rounding the original NWB seconds.
  const heap = arrays.map((a,i)=>i).filter(i=>arrays[i].length), less=(a,b)=>arrays[a][cursor[a]]<arrays[b][cursor[b]];
  function down(index) { for(;;) {let c=index*2+1;if(c>=heap.length)return;if(c+1<heap.length&&less(heap[c+1],heap[c]))c++;if(!less(heap[c],heap[index]))return;[heap[index],heap[c]]=[heap[c],heap[index]];index=c;} }
  for(let i=(heap.length>>1)-1;i>=0;i--)down(i);
  const wideIds=chosen.some(i=>ids[i]<-2147483648 || ids[i]>2147483647);
  const times=new Float64Array(total), clusters=wideIds?new BigInt64Array(total):new Int32Array(total);
  for(let n=0;n<total;n++) {const j=heap[0];times[n]=arrays[j][cursor[j]++]*rate;clusters[n]=wideIds?BigInt(ids[chosen[j]]):ids[chosen[j]];if(cursor[j]===arrays[j].length){heap[0]=heap.at(-1);heap.pop();}if(heap.length)down(0);}
  const positions=[];
  for(let i=0;i<electrodeGroups.length;i++)if(electrodeGroups[i]===probeName && Number.isFinite(x?.[i]) && Number.isFinite(y?.[i]))positions.push(x[i],y[i]);
  const folder=recordingKey(probeName),coverage=readAllenCoverage(u,chosen,ids,folder,session,probeName);
  const unitInfo={session,probe:probeName,units:metadata,source:kind,sourceTable:u.path||'/units',timestampUnit:rate===1?'seconds':'samples'};
  const files=[
    ['spike_times.npy',npy(times,'<f8')],['spike_clusters.npy',npy(clusters,wideIds?'<i8':'<i4')],
    ...(positions.length?[['channel_positions.npy',npy(new Float64Array(positions),'<f8',[positions.length/2,2])]]:[]),
    ['params.py',`${rate===1?'# NWB spike timestamps are already in seconds.\n':''}sample_rate = ${rate}\n`],
    ['explorer-events.json',JSON.stringify(readAllenEvents(file,folder,session,kind))],
    ...(quality?[['cluster_group.tsv','cluster_id\tgroup\n'+chosen.map(i=>`${ids[i]}\t${String(quality[i]??'').replace(/[\t\r\n]/g,' ')}`).join('\n')]]:[]),
    ['explorer-units.json',JSON.stringify(unitInfo)]
  ].concat(coverage?[['explorer-coverage.json',JSON.stringify(coverage)]]:[]).map(([name,data])=>({name,path:`${folder}/${name}`,data}));
  return {files,session,kind,probe:probeName,spikeCount:total,unitCount:chosen.length};
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
