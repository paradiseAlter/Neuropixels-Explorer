// SPDX-License-Identifier: MIT
((root) => {
  "use strict";
  const SCHEMA = "neuropixels-browser-project/1";
  // Old packages kept the camera under its recording. Pin that original annotation
  // owner when moving it into the project so saved interval keys still resolve.
  function withVideoLibrary(project, documents={}) {
    if(Array.isArray(project.videoLibrary))return project;
    const {videos,standaloneVideo,...rest}=project, videoLibrary=[];
    const owners=new Set(Object.values(documents).map(doc=>doc?.context?.key));
    const hasDoc=d=>owners.has(JSON.stringify([d.annotationRecordingKey,'url',d.video_name,d.byte_size??null,...(d.annotationSourceId?[d.annotationSourceId]:[])]));
    for(const [owner,value] of [...Object.entries(videos||{}),[null,standaloneVideo]]){
      if(!value?.asset)continue;
      const camera={...value,annotationRecordingKey:value.annotationRecordingKey??owner??value.asset};
      const other=videoLibrary.find(d=>d.asset===camera.asset && JSON.stringify(d.timeMapping)===JSON.stringify(camera.timeMapping));
      if(other && (!hasDoc(camera)||!hasDoc(other))){
        if(hasDoc(camera))other.annotationRecordingKey=camera.annotationRecordingKey;
        continue;
      }
      camera.id=videoLibrary.some(d=>d.asset===camera.asset)?JSON.stringify([camera.asset,owner]):camera.asset;
      videoLibrary.push(camera);
    }
    return {...rest,videoLibrary,activeVideoId:videoLibrary[0]?.id??null};
  }
  async function checkSpace(assets) {
    const estimate = await navigator.storage?.estimate?.();
    const bytes = assets.reduce((sum, a) => sum + a.blob.size, 0);
    if (estimate?.quota && bytes > estimate.quota - estimate.usage) throw new Error("浏览器空间不足；请选择较短视频，或释放此网站的存储空间后重试。");
  }
  function checkImport(isCurrent, signal) {
    if (signal?.aborted || (isCurrent && !isCurrent())) throw new DOMException("Import cancelled", "AbortError");
  }
  function watchCancel(tx, signal) {
    if (!signal) return;
    const cancel = () => { try { tx.abort(); } catch (error) { if (error.name !== "InvalidStateError") throw error; } };
    signal.addEventListener("abort", cancel, { once: true });
    const finish = () => signal.removeEventListener("abort", cancel);
    tx.addEventListener("complete", finish, { once: true });
    tx.addEventListener("abort", finish, { once: true });
  }
  class ProjectStore {
    constructor({working = false} = {}) {
      // File-backed Blobs stay in this tab until explicitly exported.
      this.sessions = working ? new Map() : null;
    }
    async db() {
      return new Promise((resolve, reject) => {
        const r = indexedDB.open("neuropixels-browser-projects", 1);
        r.onupgradeneeded = () => { for (const name of ["projects", "assets", "annotations"]) r.result.createObjectStore(name); };
        r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
      });
    }
    async request(store, key, value) {
      if (this.sessions && key !== undefined) {
        const session = this.sessions.get(key);
        if (session) {
          if (value !== undefined) session[store] = value;
          return session[store];
        }
        if (value !== undefined) throw new Error("Workspace is no longer open");
      }
      const db = await this.db();
      try { return await new Promise((resolve, reject) => {
        const tx = db.transaction(store, value === undefined ? "readonly" : "readwrite");
        const s = tx.objectStore(store), r = value === undefined ? (key === undefined ? s.getAll() : s.get(key)) : s.put(value, key);
        tx.oncomplete = () => resolve(value === undefined ? r.result : value);
        tx.onerror = tx.onabort = () => reject(tx.error || r.error || new Error("Browser storage failed"));
      }); } finally { db.close(); }
    }
    async create(project, assets, annotations = {}, isCurrent, signal = isCurrent?.signal) {
      if (this.sessions) {
        checkImport(isCurrent, signal);
        this.sessions.set(project.id, {projects: project, assets, annotations});
        return;
      }
      await checkSpace(assets);
      const db = await this.db();
      try { await new Promise((resolve, reject) => {
        checkImport(isCurrent, signal);
        const tx = db.transaction(["projects", "assets", "annotations"], "readwrite");
        watchCancel(tx, signal);
        tx.objectStore("projects").put(project, project.id);
        tx.objectStore("assets").put(assets, project.id);
        tx.objectStore("annotations").put(annotations, project.id);
        tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(signal?.aborted ? new DOMException("Import cancelled", "AbortError") : tx.error || new Error("Project cache failed"));
      }); } finally { db.close(); }
    }
    async changeAssets(id, edit, signal) {
      if (this.sessions) {
        const session = this.sessions.get(id);
        const result = edit(session?.projects, session?.assets);
        session.projects = result.project;
        session.assets = result.assets;
        return result;
      }
      const db = await this.db();
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(["projects", "assets"], "readwrite");
          watchCancel(tx, signal);
          const projects = tx.objectStore("projects"), files = tx.objectStore("assets");
          const p = projects.get(id), a = files.get(id);
          let ready = 0, result, failure;
          p.onsuccess = a.onsuccess = () => {
            if (++ready < 2) return;
            try {
              result = edit(p.result, a.result);
              projects.put(result.project, id);
              files.put(result.assets, id);
            } catch (error) { failure = error; tx.abort(); }
          };
          tx.oncomplete = () => resolve(result);
          tx.onerror = tx.onabort = () => reject(failure || (signal?.aborted ?
            new DOMException("Import cancelled", "AbortError") : tx.error || new Error("Project update failed")));
        });
      } finally { db.close(); }
    }
    async appendRecordings(projectId, addition, newAssets, isCurrent, signal = isCurrent?.signal) {
      if (!this.sessions) await checkSpace(newAssets);
      checkImport(isCurrent, signal);
      const result = await this.changeAssets(projectId, (existing, oldFiles) => {
        checkImport(isCurrent, signal);
        if (!existing || !Array.isArray(oldFiles)) throw new Error("找不到正在添加记录的项目。");
        const ids = [...existing.recordingIds, ...addition.recordingIds];
        const paths = new Set(oldFiles.map(f => f.path));
        if (new Set(ids).size !== ids.length) throw new Error("项目中已有同名记录。请按记录分别拖入名称不同的结果文件夹，或新建项目。");
        for (const file of newAssets) {
          if (paths.has(file.path)) throw new Error("导入文件与已有路径重复：" + file.path);
          paths.add(file.path);
        }
        const sources = {...existing.recordingSources, ...addition.recordingSources};
        if (existing.session && existing.recordingIds.length === 1 && !Object.hasOwn(sources, existing.recordingIds[0])) {
          sources[existing.recordingIds[0]] = {session:existing.session, probe:existing.probe, nwbKind:existing.nwbKind, sourceNwb:existing.sourceNwb, label:existing.label};
        }
        const merged = {...existing, recordingIds:ids, recordingSources:sources,
          mode:existing.mode === "combined" || addition.mode === "combined" ? "combined" : "neural",
          videos:{...existing.videos, ...addition.videos}, updated:Date.now()};
        if(existing.videoLibrary || addition.videoLibrary){
          merged.videoLibrary=[...withVideoLibrary(existing).videoLibrary,...withVideoLibrary(addition).videoLibrary];
          merged.activeVideoId=existing.activeVideoId || merged.videoLibrary[0]?.id || null;
          delete merged.videos;delete merged.standaloneVideo;
        }
        for (const key of ["session","probe","nwbKind","sourceNwb","label"]) delete merged[key];
        return {project:merged, assets:oldFiles.concat(newAssets)};
      }, signal);
      return result.project;
    }
    async updateVideo(projectId,recordingId,expected,next,asset,isCurrent) {
      return this.changeAssets(projectId, (project, assets) => {
        if(!isCurrent() || !project?.recordingIds?.includes(recordingId) || !Array.isArray(assets) ||
            JSON.stringify(project.videos?.[recordingId]??null)!==JSON.stringify(expected))
          throw Error('项目或视频已变化，请重新打开该操作。');
        project = {...project, videos:{...project.videos}};
        if(next)project.videos[recordingId]=next;else delete project.videos[recordingId];
        project.updated=Date.now();
        let updated=assets;
        if(asset!==undefined) {
          const shared=Object.entries(project.videos).some(([key,d])=>key!==recordingId && d.asset===expected?.asset);
          updated=assets.filter(item=>item.role!=='video' || ((shared || item.path!==expected?.asset) && item.path!==asset?.path));
          if(asset)updated.push(asset);
        }
        return {project, assets:updated};
      });
    }
    async saveAnalysis(projectId, recordingId, asset, options = {}) {
      if (!asset || !['event-analysis','population-dynamics'].includes(asset.role) || asset.recordingId !== recordingId ||
          typeof asset.path !== 'string' || !asset.path || !(asset.blob instanceof Blob)) throw new Error('Invalid analysis role or Recording identity');
      const keys=asset.sourceRecordings;
      const scope=Array.isArray(keys) && keys.length>1 && new Set(keys).size===keys.length
        ? await globalThis.NeuropixelsJointRecording.scopeKey(keys) : null;
      return this.changeAssets(projectId, (project, files) => {
        if (options.isCurrent && !options.isCurrent()) throw new Error('Analysis cancelled or changed before project save');
        const joined=scope===recordingId && keys.every(key=>project?.recordingIds?.includes(key));
        if (!project || !Array.isArray(files) || (!project.recordingIds?.includes(recordingId)&&!joined)) throw new Error('Project changed before analysis save');
        const assets=files.filter(item=>!(item.role===asset.role && item.recordingId===recordingId));
        return {project:{...project,updated:Date.now()}, assets:[...assets,asset]};
      });
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
    if (m.schema !== SCHEMA || !Array.isArray(m.assets) || typeof m.project?.name !== "string" || !m.project.name ||
        (m.project.recordingIds !== undefined && (!Array.isArray(m.project.recordingIds) || m.project.recordingIds.some(key => typeof key !== "string"))) ||
        !m.annotations || typeof m.annotations !== "object" || Array.isArray(m.annotations)) throw new Error("Invalid project manifest");
    let offset = 12 + length;
    const assets = m.assets.map(a => {
      if (!Number.isSafeInteger(a.size) || a.size < 0 || offset + a.size > blob.size || typeof a.path !== "string") throw new Error("Truncated project asset");
      const item = { ...a, blob: blob.slice(offset, offset + a.size, a.type || "") }; offset += a.size; return item;
    });
    if (offset !== blob.size) throw new Error("Project size does not match its manifest");
    return { project: m.project, assets, annotations: m.annotations };
  }
  const api = { ProjectStore, pack, unpack, SCHEMA, withVideoLibrary };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NeuropixelsBrowserStorage = api;
})(typeof globalThis === "object" ? globalThis : window);
