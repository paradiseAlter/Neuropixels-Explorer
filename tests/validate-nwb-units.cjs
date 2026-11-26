const assert=require('node:assert/strict');
const {readAllen}=require('../scripts/browser-nwb-worker.js');
const core=require('../scripts/kilosort-core.js');
const group=fields=>({get:name=>fields[name],keys:()=>Object.keys(fields)});
const column=value=>({value,shape:[value.length],slice:([[a,b]])=>value.slice(a,b)});
const wide=2**40+9, spikeTimes=[.125,.5,.25,1.5], ids=[1,2,wide,4];
const base={id:column(ids),spike_times:column(spikeTimes),spike_times_index:column([2,2,3,4])};
function file(unitFields,electrodeFields){
  const f=group({identifier:{value:'Lab/A:2'},units:group(unitFields),'general/extracellular_ephys/electrodes':electrodeFields&&group(electrodeFields)});
  f.dereference=ref=>({path:'/general/extracellular_ephys/P'+ref.ref_data[0]});return f;
}
const read=async(f,name)=>{
  const r=await readAllen(f,name),asset=key=>r.files.find(x=>x.name===key)?.data;
  return {r,units:JSON.parse(asset('explorer-units.json')).units,asset};
};
(async()=>{
  const bare=file(base),candidates=(await readAllen(bare)).candidates;
  assert.deepEqual(candidates,[{name:'Units',units:4,key:'nwb-Lab%2FA%3A2-Units'}]);
  const {r,units,asset}=await read(bare,'Units');
  assert.equal(r.kind,'NWB');assert.equal(r.spikeCount,4);
  assert.deepEqual(units.map(u=>[u.cluster_id,u.spike_count]),[[1,2],[2,0],[wide,1],[4,1]]);
  assert(!units.some(u=>'probe_depth_um' in u||'shank_id' in u||'brain_region' in u));assert(!asset('channel_positions.npy'));
  const buffers={spikeTimes:asset('spike_times.npy'),spikeClusters:asset('spike_clusters.npy')};
  const overview=core.buildActivityPyramidBuffers(buffers,1,'test',[2]);
  assert.deepEqual([...overview.unitIds],[1,2,4,wide]);assert.deepEqual([...overview.unitCounts],[2,0,1,1]);
  const trains=await core.readSelectedUnitTrains({spikeTimes:new Blob([buffers.spikeTimes]),spikeClusters:new Blob([buffers.spikeClusters])},1,[wide,2,1]);
  assert.deepEqual(trains.map(row=>row.spikes),[[.25],[],[.125,.5]]);
  const e={id:column([10,20,30]),group_name:column(['P1','P1','P2']),location:column(['A','B','B']),
    probe_horizontal_position:column([10,20,30]),probe_vertical_position:column([100,120,140]),z:column([900,910,920])};
  const multi=file({...base,electrodes:column([0,0,1,2,0,2]),electrodes_index:column([1,3,4,6])},e);
  assert.deepEqual((await readAllen(multi)).candidates.map(x=>[x.name,x.units]),[['P1',2],['P2',1],['Unassigned Units',1]]);
  const geom=(await read(multi,'P1')).units;assert.deepEqual([geom[0].brain_region,geom[0].probe_depth_um],['A',100]);
  assert.equal(geom[1].brain_region,undefined);assert.equal(geom[1].probe_depth_um,undefined);
  const unassigned=(await read(multi,'Unassigned Units')).units;assert.deepEqual(unassigned.map(u=>u.cluster_id),[4]);assert(!unassigned[0].brain_region);
  const refs=file({...base,electrode_group:column([1,2,2,1].map(n=>({ref_data:new Uint8Array([n])})))});
  assert.deepEqual((await readAllen(refs)).candidates.map(x=>[x.name,x.units]),[['P1',2],['P2',2]]);
  const tags=file({...base,probe_index:column([0,0,1,1]),region:column([50,50,362,362]),z:column([1000,1001,1002,1003])});
  const labeled=(await read(tags,'Probe 1')).units;assert.deepEqual(labeled.map(u=>u.brain_region),['Region ID 362','Region ID 362']);assert(labeled.every(u=>u.probe_depth_um===undefined));
  await assert.rejects(readAllen(file({...base,spike_times_index:column([2,2,3,5])})),/spike_times_index/);
  await assert.rejects(readAllen(file({...base,id:column([1,1,2,3])})),/unique/);
  await assert.rejects(readAllen(file({})),/spike_times/);
  const processed=Object.assign(group(base),{path:'/processing/sorting/reviewed',attrs:{neurodata_type:{value:'Units'}}});
  const alternate=Object.assign(group(base),{path:'/processing/sorting/alternate',attrs:{neurodata_type:{value:'Units'}}});
  const processing=group({sorting:group({reviewed:processed,alternate})});
  const header={identifier:{value:'lab'},processing};
  assert.deepEqual((await readAllen(group({...header,units:group(base)}))).candidates.map(c=>c.units),[4]);
  assert((await read(group({...header,processing:group({sorting:group({reviewed:processed})})}),'Units')).units.length===4);
  await assert.rejects(readAllen(group(header)),/reviewed.*alternate/);
  const sameColumns=group({identifier:{value:'lab'},units:group({...base,peak_channel_id:column([10,10,10,10])}),
    'general/extracellular_ephys/electrodes':group({...e,probe_id:column([1,1,2])}),
    'general/devices':group({Shank:{attrs:{probe_id:{value:1},sampling_rate:{value:20000}}}})});
  assert.equal((await read(sameColumns,'Shank')).r.kind,'NWB');
  const silent=await read(file({id:column([0]),spike_times:column([]),spike_times_index:column([0])}),'Units');
  assert.equal(silent.r.spikeCount,0);assert.equal(silent.units[0].spike_count,0);
  console.log('PASS NWB Units-only, ragged seconds, silent and 64-bit IDs, electrode rows/group references, mixed or missing anatomy, and invalid indexes');
})().catch(e=>{console.error(e);process.exitCode=1;});
