// SPDX-License-Identifier: MIT
const fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..'), read=p=>fs.readFileSync(path.join(root,p),'utf8');
const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script');
let html=read('index.html');
html=html.replace(/<link rel="stylesheet" href="\.\/([^"?]+)[^"]*">/g,(_,p)=>`<style>\n${read(p)}\n</style>`);
html=html.replace(/<script src="\.\/([^"?]+)[^"]*"(?: defer)?><\/script>/g,(_,p)=>{
  let prefix='';
  if(p==='scripts/app.js') {
    const worker=read('vendor/h5wasm/h5wasm-0.10.3.js')+'\n'+read('scripts/browser-nwb-worker.js');
    prefix=`<script>window.NeuropixelsNwbWorkerSource=${JSON.stringify(worker).replace(/</g,'\\u003c')};</script>\n`;
    for(const file of ['scripts/browser-storage.js','scripts/browser-project-ui.js'])prefix+=`<script>\n${escapeScript(read(file))}\n</script>\n`;
  }
  return prefix+`<script>\n${escapeScript(read(p))}\n</script>`;
});
html=html.replace('</body>',`<!-- h5wasm 0.10.3 / HDF5 license: ${read('vendor/h5wasm/LICENSE.txt').replace(/--/g,'—')} -->\n</body>`);
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
const output=path.join(root,'dist','Neuropixels-Explorer.html');fs.writeFileSync(output,html);
console.log(output,fs.statSync(output).size,'bytes; standalone JS/CSS/WASM embedded');
