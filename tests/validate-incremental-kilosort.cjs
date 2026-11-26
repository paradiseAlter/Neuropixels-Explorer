// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict');
const core=require('../scripts/kilosort-core.js');
const {npy}=require('../scripts/browser-nwb-worker.js');

function source(name, data, folder='one') {
  const file=new File([data],name);
  Object.defineProperty(file,'relativePath',{value:folder+'/'+name});
  return file;
}
async function index(files) {
  const [group]=core.groupExperimentFiles(files,{partial:true});
  return core.indexExperiment(group,{partial:true});
}

(async()=>{
  const times=source('spike_times.npy',npy(new Int32Array([20,75,100]),'<i4'));
  const ids=source('spike_clusters.npy',npy(new Int32Array([3,7,3]),'<i4'));
  const params=source('params.py','sample_rate = 1000\n');
  const partial=await index([times]);
  assert.deepEqual(partial.missingInputs,['spike_clusters.npy','params.py']);
  assert.equal(partial.duration,null);
  assert.deepEqual(await core.readSpikeRows(partial,1),{samples:[75,100],ids:null,start:1,count:2});
  const assignments=await index([ids]);
  assert.deepEqual(assignments.clusterLabels.map(u=>u.id),[3,7]);
  assert.equal(assignments.unitSummaryMap.get(3).count,2);
  assert.equal(assignments.sampleRate,null);
  assert.deepEqual(await core.readSpikeRows(assignments),{samples:null,ids:[3,7,3],start:0,count:3});
  const paired=await index([ids,times]);
  assert.deepEqual(await core.readSpikeRows(paired,1,1),{samples:[75],ids:[7],start:1,count:1});
  const timed=await index([params,times]);
  assert.equal(timed.duration,0.1);
  assert.deepEqual(timed.missingInputs,['spike_clusters.npy']);
  const complete=await index([params,times,ids]);
  assert.deepEqual(complete.missingInputs,[]);
  assert.equal(complete.sampleRate,1000);
  const bad=source('spike_clusters.npy',npy(new Int32Array([1]),'<i4'));
  await assert.rejects(()=>index([times,bad]),/lengths differ/);
  await assert.rejects(()=>index([source('spike_times.npy',(npy(new Int32Array([1]),'<i4')).slice(0,-1))]),/NPY size/);
  const geometry=source('channel_positions.npy',npy(new Float32Array([0,2,4,6]),'<f4',[2,2]),'two');
  assert.equal((await index([geometry])).spikeCount,null);
  assert.match(await core.previewKilosortFile(geometry),/2 × 2.*\n0, 2, 4, 6/);
  assert.deepEqual(core.groupExperimentFiles([times,geometry],{partial:true}).map(g=>g.key),['one','two']);
  console.log('Incremental Kilosort previews, units, rates, shape checks and directory identities passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
