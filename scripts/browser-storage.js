// SPDX-License-Identifier: MIT
((root) => {
  "use strict";
  const SCHEMA = "neuropixels-browser-project/1";
  class ProjectStore {
    async db() {
      return new Promise((resolve, reject) => {
        const r = indexedDB.open("neuropixels-browser-projects", 1);
        r.onupgradeneeded = () => { for (const name of ["projects", "assets", "annotations"]) r.result.createObjectStore(name); };
        r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
      });
    }
    async request(store, key, value) {
      const db = await this.db();
      try { return await new Promise((resolve, reject) => {
        const tx = db.transaction(store, value === undefined ? "readonly" : "readwrite");
        const s = tx.objectStore(store), r = value === undefined ? (key === undefined ? s.getAll() : s.get(key)) : s.put(value, key);
        tx.oncomplete = () => resolve(value === undefined ? r.result : value);
        tx.onerror = tx.onabort = () => reject(tx.error || r.error || new Error("Browser storage failed"));
      }); } finally { db.close(); }
    }
    async create(project, assets, annotations = {}) {
      const estimate = await navigator.storage?.estimate?.();
      const bytes = assets.reduce((sum, a) => sum + a.blob.size, 0);
      if (estimate?.quota && bytes > estimate.quota - estimate.usage) throw new Error("浏览器空间不足；请选择较短视频，或释放此网站的存储空间后重试。");
      const db = await this.db();
      try { await new Promise((resolve, reject) => {
        const tx = db.transaction(["projects", "assets", "annotations"], "readwrite");
        tx.objectStore("projects").put(project, project.id);
        tx.objectStore("assets").put(assets, project.id);
        tx.objectStore("annotations").put(annotations, project.id);
        tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error || new Error("Project cache failed"));
      }); } finally { db.close(); }
    }
    async saveAnalysis(projectId, recordingId, asset) {
      const db=await this.db();
      try { return await new Promise((resolve,reject)=>{
        const tx=db.transaction(['projects','assets'],'readwrite'),p=tx.objectStore('projects').get(projectId),a=tx.objectStore('assets').get(projectId);let completed=0,result;
        const save=()=>{if(++completed!==2)return;
          if(!p.result||!Array.isArray(a.result)||!p.result.recordingIds?.includes(recordingId)){tx.abort();return;}
          const project={...p.result,updated:Date.now()},assets=a.result.filter(item=>!(item.role==='event-analysis'&&item.recordingId===recordingId));assets.push(asset);
          tx.objectStore('projects').put(project,projectId);tx.objectStore('assets').put(assets,projectId);result={project,assets};
        };
        p.onsuccess=a.onsuccess=save;
        tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||p.error||a.error||new Error('Project changed before analysis save'));
      }); } finally { db.close(); }
    }
  }
  function pack(project, assets, annotations) {
    const manifest = { schema: SCHEMA, project, annotations, assets: assets.map(({ blob, ...a }) => ({ ...a, size: blob.size })) };
    const json = new TextEncoder().encode(JSON.stringify(manifest));
    const prefix = new Uint8Array(12); prefix.set(new TextEncoder().encode("NEUROPR1")); new DataView(prefix.buffer).setUint32(8, json.length, true);
    return new Blob([prefix, json, ...assets.map(a => a.blob)], { type: "application/octet-stream" });
  }
  async function unpack(blob) {
    const prefix = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    if (new TextDecoder().decode(prefix.slice(0, 8)) !== "NEUROPR1") throw new Error("请选择浏览器版导出的 .neuroproject 项目包。旧版 JSON 记录的是磁盘路径，请新建项目重新选择其神经数据和视频。");
    const length = new DataView(prefix.buffer).getUint32(8, true);
    if (length > 32 * 1024 * 1024 || 12 + length > blob.size) throw new Error("Invalid project manifest size");
    const m = JSON.parse(await blob.slice(12, 12 + length).text());
    if (m.schema !== SCHEMA || !Array.isArray(m.assets) || !m.project?.name || !m.annotations || typeof m.annotations !== "object") throw new Error("Invalid project manifest");
    let offset = 12 + length;
    const assets = m.assets.map(a => {
      if (!Number.isSafeInteger(a.size) || a.size < 0 || offset + a.size > blob.size || typeof a.path !== "string") throw new Error("Truncated project asset");
      const item = { ...a, blob: blob.slice(offset, offset + a.size, a.type || "") }; offset += a.size; return item;
    });
    if (offset !== blob.size) throw new Error("Project size does not match its manifest");
    return { project: m.project, assets, annotations: m.annotations };
  }
  const api = { ProjectStore, pack, unpack, SCHEMA };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NeuropixelsBrowserStorage = api;
})(typeof globalThis === "object" ? globalThis : window);
