// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const labels={
    en:{settings:'Unit marks',interest:'Of interest',add:'Add mark',name:'Mark name',color:'Mark color',remove:'Remove mark',confirm:'Remove this mark from every Unit?',clear:'Remove from Unit',apply:'Mark Unit'},
    zh:{settings:'Unit 标记',interest:'感兴趣',add:'添加标记',name:'标记名称',color:'标记颜色',remove:'删除标记',confirm:'删除这个标记，并从所有 Unit 上移除？',clear:'取消标记',apply:'标记 Unit'},
    es:{settings:'Marcas de unidades',interest:'De interés',add:'Añadir marca',name:'Nombre',color:'Color',remove:'Eliminar marca',confirm:'¿Eliminar esta marca de todas las unidades?',clear:'Quitar marca',apply:'Marcar unidad'}
  };
  function words(){
    const language=document.documentElement.lang.slice(0,2);
    return labels[language]||labels.en;
  }
  const prefKey='neuropixels.unit-mark-types.v1';
  const defaultTypes=[{id:'interest',name:'',color:'#e9ae41'}];
  const nameOf=type=>type.name||words().interest;
  function validTypes(value) {
    if(!Array.isArray(value))return defaultTypes;
    const ids=new Set();
    return value.filter(t=>{
      if(!t || typeof t.id!=='string' || !/^[\w-]+$/.test(t.id) || ids.has(t.id) ||
        typeof t.name!=='string' || !/^#[0-9a-f]{6}$/i.test(t.color))return false;
      ids.add(t.id);return true;
    });
  }
  let preferred=defaultTypes;
  try {const value=localStorage.getItem(prefKey);if(value)preferred=validTypes(JSON.parse(value));}catch{}
  let api, style, lastState, lastPrefs, lastLang, lastProject;
  let current={types:preferred,byUnit:{}};
  const ref=(recording,id)=>{
    if(id==null || !Number.isSafeInteger(Number(id)))return '';
    const original=recording?.jointUnits?.get(Number(id));
    const key=original?.recordingKey??recording?.key??recording;
    if(typeof key!=='string' || !key)return '';
    return encodeURIComponent(JSON.stringify([key,original?.unitId??Number(id)])).replace(/'/g,'%27');
  };
  function read(raw){
    const types=validTypes(raw?.types??preferred);
    const byUnit={};
    const ids=new Set(types.map(t=>t.id));
    for(const [key,values] of Object.entries(raw?.byUnit||{})){
      if(!key.startsWith('%5B')||!Array.isArray(values))continue;
      const kept=[...new Set(values.filter(v=>ids.has(v)))];
      if(kept.length)byUnit[key]=kept;
    }
    return {types,byUnit};
  }
  const attrs=(rec,id)=>{const key=ref(rec,id);return key?'data-mark-ref="'+key+'"':'';};
  const bind=(node,rec,id)=>{const key=ref(rec,id);if(key)node.dataset.markRef=key;else delete node.dataset.markRef;};
  function sync(){
    if(!api)return;
    const project=api.project(),raw=project?.unitMarks,lang=document.documentElement.lang;
    if(raw===lastState && preferred===lastPrefs && lastLang===lang && lastProject===project?.id)return;
    lastState=raw;lastPrefs=preferred;lastLang=lang;lastProject=project?.id;
    current=read(raw);
    const rules=[];
    const byId=new Map(current.types.map(t=>[t.id,t]));
    for(const [key,ids] of Object.entries(current.byUnit)){
      const types=ids.map(id=>byId.get(id)),sel='[data-mark-ref="'+CSS.escape(key)+'"]';
      const stops=types.map((t,i)=>t.color+' '+(100*i/types.length)+'% '+(100*(i+1)/types.length)+'%');
      const names=types.map(t=>CSS.escape(nameOf(t))).join(', ');
      const halo=types.slice(1).map((t,i)=>'drop-shadow('+(i%2===0?'1.5':'-1.5')+'px '+(i%4<2?'1':'-1')+'px 0 '+t.color+')').join(' ');
      rules.push(sel+'::after{content:"'+'★'.repeat(types.length)+'" / "'+names+'";background-image:linear-gradient(to right,'+(stops.length===1?[stops[0],stops[0]].join(','):stops.join(','))+');}',
        'svg circle'+sel+'{stroke:'+types[0].color+';stroke-width:2px;paint-order:stroke fill;'+(halo?'filter:'+halo:'')+'}');
    }
    if(!style){style=document.createElement('style');document.head.append(style);}
    style.textContent=rules.join('\n');
    renderSettings();
    document.dispatchEvent(new Event('unitmarkschanged'));
  }
  async function update(edit,palette=false){
    const owner=api.project();
    try{
      if(owner){
        await api.save(owner.id,raw=>edit(read(raw)));
        if(api.project()?.id!==owner.id)return;
        if(palette)preferred=read(api.project().unitMarks).types;
      }else if(palette){preferred=edit(read(null)).types;}
      if(palette)try{localStorage.setItem(prefKey,JSON.stringify(preferred));}catch{}
      sync();
    }catch(error){api.failed(error);}
  }
  function button(text){
    const node=document.createElement('button');node.type='button';node.textContent=text;return node;
  }
  function renderSettings(){
    const box=document.getElementById('unit-mark-settings');
    if(!box)return;
    const w=words();
    box.querySelector('summary').textContent=w.settings;
    const host=box.querySelector('.unit-mark-fields');host.replaceChildren();
    for(const type of current.types){
      const row=document.createElement('div'),name=document.createElement('input'),color=document.createElement('input'),remove=button('×');
      row.className='unit-mark-editor';name.type='text';name.value=nameOf(type);name.maxLength=60;
      name.setAttribute('aria-label',w.name);color.type='color';color.value=type.color;color.setAttribute('aria-label',w.color+' · '+nameOf(type));
      remove.title=w.remove+' · '+nameOf(type);remove.setAttribute('aria-label',remove.title);
      const change=fields=>update(s=>({...s,types:s.types.map(t=>t.id===type.id?{...t,...fields}:t)}),true);
      name.onchange=()=>{const v=name.value.trim();if(v && v!==nameOf(type))change({name:v});else name.value=nameOf(type);};
      color.onchange=()=>change({color:color.value});
      remove.onclick=()=>{
        if(Object.values(current.byUnit).some(ids=>ids.includes(type.id)) && !window.confirm(w.confirm))return;
        update(s=>read({...s,types:s.types.filter(t=>t.id!==type.id)}),true);
      };
      row.append(color,name,remove);host.append(row);
    }
    const add=document.createElement('div'),name=document.createElement('input'),submit=button(w.add);
    add.className='unit-mark-editor';name.placeholder=w.name;name.maxLength=60;name.required=true;name.setAttribute('aria-label',w.name);
    name.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit.click();}};
    submit.onclick=e=>{
      e.preventDefault();const value=name.value.trim();if(!value)return;
      const type={id:crypto.randomUUID(),name:value,color:'#52a4b7'};
      update(s=>({...s,types:[...s.types,type]}),true);
    };
    add.append(name,submit);host.append(add);
  }
  function appendActions(menu,key,close){
    sync();if(!key||!api?.project())return;
    const owner=api.project().id,checked=current.byUnit[key]||[],w=words();
    for(const type of current.types){
      const active=checked.includes(type.id),node=button((active?w.clear:w.apply)+' · '+nameOf(type));
      node.dataset.markAction=type.id;node.style.setProperty('--mark-color',type.color);
      node.setAttribute('role','menuitemcheckbox');node.setAttribute('aria-checked',String(active));
      node.onclick=()=>{
        close();if(api.project()?.id!==owner)return;
        update(s=>{
          if(!s.types.some(t=>t.id===type.id))return s;
          const ids=new Set(s.byUnit[key]||[]);
          if(ids.has(type.id))ids.delete(type.id);else ids.add(type.id);
          if(ids.size)s.byUnit[key]=[...ids];else delete s.byUnit[key];
          return s;
        });
      };
      menu.append(node);
    }
  }
  function targetRef(target){
    return target.closest('[data-mark-ref]')?.dataset.markRef ||
      target.closest('.sw-unit,.ea-review-row,.bp-lane,.bp-comparison,[data-find-unit-id],[data-cluster-id]')?.querySelector('[data-mark-ref]')?.dataset.markRef;
  }
  function popup(event,key){
    if(!key||!current.types.length||!api.project())return false;
    event.preventDefault();
    document.querySelectorAll('.unit-mark-popup').forEach(el=>el.remove());
    const menu=document.createElement('div');
    menu.className='unit-mark-popup';menu.popover='auto';menu.setAttribute('role','menu');
    appendActions(menu,key,()=>menu.hidePopover());
    menu.onkeydown=e=>{
      const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
      if(e.key==='ArrowUp'||e.key==='ArrowDown'){
        e.preventDefault();buttons[(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
      }
    };
    (event.target.closest('dialog[open]')||document.body).append(menu);
    menu.addEventListener('toggle',e=>{if(e.newState==='closed')menu.remove();});
    menu.showPopover();const bounds=event.target.getBoundingClientRect();
    menu.style.left=Math.max(4,Math.min(event.clientX||bounds.left,innerWidth-menu.offsetWidth-4))+'px';
    menu.style.top=Math.max(4,Math.min(event.clientY||bounds.bottom,innerHeight-menu.offsetHeight-4))+'px';
    menu.querySelector('button')?.focus();return true;
  }
  function detach(project,key){
    if(!project.unitMarks)return;
    const s=read(project.unitMarks),removed={};
    const prefix=encodeURIComponent('['+JSON.stringify(key)+',').replace(/'/g,'%27');
    for(const [ref,marks] of Object.entries(s.byUnit))if(ref.startsWith(prefix)){removed[ref]=marks;delete s.byUnit[ref];}
    project.unitMarks=s;return removed;
  }
  function restore(project,entries){
    if(!entries||!project.unitMarks)return;
    project.unitMarks=read({...project.unitMarks,byUnit:{...project.unitMarks.byUnit,...entries}});
  }
  window.NeuropixelsUnitMarks={configure(options){api=options;sync();},sync,ref,attrs,bind,appendActions,targetRef,popup,detach,restore,
    colors(recording,id){return (current.byUnit[ref(recording,id)]||[]).map(key=>current.types.find(t=>t.id===key)?.color).filter(Boolean);}};
})();
