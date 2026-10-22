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
  const files = [
    ['spike_times.npy',npy(times,'<f8')], ['spike_clusters.npy',npy(clusters,'<i4')],
    ['channel_positions.npy',npy(new Float64Array(positions),'<f8',[positions.length/2,2])],
    ['params.py',`sample_rate = ${rate}\n`],
    ['cluster_group.tsv','cluster_id\tgroup\n'+chosen.map(i=>`${ids[i]}\t${quality[i]}`).join('\n')],
    ['explorer-units.json',JSON.stringify({session, probe:probeName, units:metadata, source:'Allen NWB peak-channel coordinates; no Kilosort templates'})]
  ].map(([name,data])=>({name,path:`${folder}/${name}`,data}));
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
if(typeof module==='object')module.exports={readAllen,npy};
