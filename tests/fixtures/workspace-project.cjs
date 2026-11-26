// SPDX-License-Identifier: MIT
'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {pack}=require('../../scripts/browser-storage'),{npy}=require('../../scripts/browser-nwb-worker');
module.exports=async function workspaceProject({units}={}){
  const key='probeA',assets=[];
  const add=(name,bytes)=>assets.push({name,path:key+'/'+name,blob:new Blob([bytes])});
  const events=Array.from({length:12},(_,i)=>({id:'e'+i,sourceId:String(i),sourceKind:'experiment',sourceTable:'trials',type:'image_change',kind:'point',start:2+i,conditions:{active:true,side:i%2?'left':'right',trial_outcome:i%2?'miss':'hit'}}));
  const times=events.flatMap((e,i)=>[[e.start-.1,11],[e.start+.1,22],[e.start+.13,22],[e.start+.35,33],[e.start+.39,33]]);
  add('spike_times.npy',npy(Float64Array.from(times,r=>r[0]),'<f8'));add('spike_clusters.npy',npy(Int32Array.from(times,r=>r[1]),'<i4'));add('params.py','sample_rate = 1');
  add('cluster_group.tsv','cluster_id\tgroup\n11\tgood\n22\tgood\n33\tgood');
  if(units)add('explorer-units.json',JSON.stringify({units}));
  add('explorer-events.json',JSON.stringify({schema:'neuropixels-events/1',recordingId:key,timebase:'neural_seconds',events}));
  const movie=await fs.readFile(path.join(__dirname,'five-colors.webm'));
  const camera={id:'side',asset:'side.webm',video_name:'side.webm',byte_size:movie.length};
  assets.push({name:'side.webm',path:camera.asset,type:'video/webm',role:'video',blob:new Blob([movie])});
  return {name:'workspace.neuroproject',mimeType:'application/octet-stream',buffer:Buffer.from(await pack({id:'tabs-test',name:'Tab navigation',recordingIds:[key],videoLibrary:[camera],activeVideoId:camera.id},assets,{}).arrayBuffer())};
};
