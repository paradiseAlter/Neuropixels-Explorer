// SPDX-License-Identifier: MIT
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const core=require('../scripts/kilosort-core.js');
const {npy,readAllen}=require('../scripts/browser-nwb-worker.js');
const {pack,unpack}=require('../scripts/browser-storage.js');
(async()=>{
  const buffers={spikeTimes:npy(new Float64Array([0,1,1.5,2,3]),'<f8'),spikeClusters:npy(new Int32Array([7,7,8,7,8]),'<i4')};
  const result=core.intervalActivityBuffers(buffers,1,1,2,3);
  assert.deepEqual(result.units,[{id:7,spikeCount:1,rateHz:1},{id:8,spikeCount:1,rateHz:1}]);
  assert.equal(core.intervalActivityBuffers(buffers,1,-2,1,3).duration,1);
  assert.throws(()=>core.intervalActivityBuffers(buffers,1,4,5,3));
  const messages=[],context={self:{postMessage:m=>messages.push(m)},Map,Set,ArrayBuffer,DataView,Uint8Array,Float32Array,Float64Array,Int32Array,Uint32Array,Int16Array,Uint16Array,BigInt64Array,BigUint64Array,TextDecoder,console};
  vm.runInNewContext(core.createWorkerSource(),context);
  await context.self.onmessage({data:{type:'interval-activity',requestId:1,experimentKey:'test',files:Object.fromEntries(Object.entries(buffers).map(([k,b])=>[k,new Blob([b])])),sampleRate:1,start:1,end:2,duration:3}});
  assert.equal(messages.at(-1).units[0].spikeCount,1);
  const project={id:'test',name:'真实引用',recordingIds:['ks4'],videos:{ks4:{timeMapping:{offset_s:2.3}}}},assets=[{path:'ks4/spike_times.npy',name:'spike_times.npy',blob:new Blob([buffers.spikeTimes])},{path:'video:ks4',name:'a.mp4',role:'video',blob:new Blob(['video-fixture'])}],annotations={key:{segments:[{label:'测试',start:1,end:2}],schemes:[{name:'original'}]}};
  const blob=pack(project,assets,annotations),restored=await unpack(blob);
  assert.deepEqual(restored.project,project);assert.deepEqual(restored.annotations,annotations);
  assert.deepEqual(Buffer.from(await restored.assets[0].blob.arrayBuffer()),Buffer.from(buffers.spikeTimes));
  await assert.rejects(unpack(blob.slice(0,blob.size-1)),/Truncated/);
  await assert.rejects(unpack(new Blob(['not project'])),/neuroproject/);
  const html=fs.readFileSync(require('path').join(__dirname,'../dist/Neuropixels-Explorer.html'),'utf8');
  assert(!/<script[^>]+src=|<link[^>]+stylesheet[^>]+href=/.test(html));
  for(const [,script] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script);
  console.log('PASS: exact half-open interval + Worker, project binary/data/video/mapping/annotation roundtrip, truncation rejection, self-contained HTML syntax');
})();
