// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const defaults={signalLeft:'ArrowLeft', signalRight:'ArrowRight', videoBack:'ArrowLeft', videoForward:'ArrowRight',frameBack:',',frameForward:'.',play:'Space',mark:'M'};
  const signalActions=new Set(['signalLeft','signalRight']);
  const storeKey='neuropixels.keyboard.v1';
  const isText=el=>el?.closest('input,textarea,select,[contenteditable=true]');
  function chord(e){
    if(['Shift','Control','Alt','Meta','Dead','Unidentified','Process'].includes(e.key) || e.isComposing)return '';
    const parts=[];
    if(e.ctrlKey)parts.push('Ctrl');
    if(e.metaKey)parts.push('Meta');
    if(e.altKey)parts.push('Alt');
    if(e.shiftKey)parts.push('Shift');
    parts.push(e.key===' '?'Space':e.key.length===1?e.key.toUpperCase():e.key);
    return parts.join('+');
  }
  window.installExplorerSettings=function({t,actions,ready,videoLabels}){
    const dialog=document.querySelector('#workspace-settings'),grid=document.querySelector('#shortcut-grid');
    const feedback=document.querySelector('#shortcut-message'),button=document.querySelector('#settings-button');
    let bindings={...defaults},listening=null,scope='',pointer=false;
    try{
      const saved=JSON.parse(localStorage.getItem(storeKey));
      for(const key of Object.keys(defaults))if(typeof saved?.[key]==='string')bindings[key]=saved[key];
    }catch{ /* Browser preferences are optional. */ }
    function persist(){try{localStorage.setItem(storeKey,JSON.stringify(bindings));}catch{}}
    let labelKey=null, labelBindings=new Map(), listed='';
    function currentLabels(){
      const {key,names}=videoLabels?.() || {key:null,names:[]};
      if(key!==labelKey){
        labelKey=key;labelBindings=new Map();
        if(key)try{
          const pairs=JSON.parse(localStorage.getItem(storeKey+'.labels.'+key))||[];
          labelBindings=new Map(pairs.filter(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(v=>typeof v==='string')));
        }catch{ /* No saved bindings for this video. */ }
      }
      return names;
    }
    function persistLabels(){
      if(!labelKey)return;
      try{
        const key=storeKey+'.labels.'+labelKey;
        if(labelBindings.size)localStorage.setItem(key,JSON.stringify([...labelBindings]));
        else localStorage.removeItem(key);
      }catch{}
    }
    function row(id,tag){
      const div=document.createElement('div'),name=document.createElement('span'),key=document.createElement('button');
      key.type='button';
      if(tag)key.dataset.labelBinding=id;else key.dataset.binding=id;
      div.append(name,key);grid.append(div);
    }
    function render(){
      for(const [id,action] of Object.entries({'video-previous-frame':'frameBack','video-next-frame':'frameForward','video-play-button':'play','annotation-mark':'mark'})){
        const control=document.getElementById(id);if(!control)continue;
        const key=bindings[action];
        control.dataset.keycap=key.replace('ArrowLeft','←').replace('ArrowRight','→').replace('Space',document.documentElement.lang==='zh-CN'?'空格':'Space');
        control.setAttribute('aria-keyshortcuts',key.replace('Ctrl+','Control+'));
      }
      const names=currentLabels(),signature=JSON.stringify([labelKey,names]);
      if(signature!==listed){
        for(const b of grid.querySelectorAll('[data-label-binding]'))b.parentElement.remove();
        for(const name of names)row(name,true);
        listed=signature;
      }
      for(const b of grid.querySelectorAll('button')){
        const name=b.dataset.labelBinding,tag=name!==undefined;
        const label=tag?t('prefs.labelKey',{label:name}):t('prefs.'+b.dataset.binding);
        const key=tag?labelBindings.get(name):bindings[b.dataset.binding];
        b.parentElement.firstElementChild.textContent=label;
        b.textContent=b===listening?t('prefs.press'):key||t('prefs.unbound');
        if(tag)b.title=t('prefs.clearKey');
        b.setAttribute('aria-label',label+' · '+b.textContent);
      }
    }
    for(const action of Object.keys(defaults))row(action,false);
    grid.addEventListener('click',e=>{
      const key=e.target.closest('[data-binding],[data-label-binding]');
      if(key){listening=key;feedback.textContent=key.hasAttribute('data-label-binding')?t('prefs.clearKey'):'';render();}
    });
    button.onclick=()=>{render();if(!dialog.open)dialog.showModal();};
    dialog.addEventListener('close',()=>{listening=null;feedback.textContent='';});
    document.querySelector('#reset-shortcuts').onclick=()=>{
      currentLabels();labelBindings.clear();persistLabels();
      bindings={...defaults};listening=null;feedback.textContent='';persist();render();
    };
    function track(target){scope=target.closest('#analysis-pages,#behavior-patterns')?'':target.closest('#experiment-video-region,#video-sync-panel,#annotation-panel')?'video':
      target.closest('.activity-workspace,#probe-dock')?'signal':'';}
    document.addEventListener('pointerdown',e=>{pointer=true;track(e.target);},true);
    document.addEventListener('focusin',e=>{track(e.target);},true);
    document.addEventListener('keydown',e=>{
      if(e.key==='Tab')pointer=false;
      if(dialog.open && listening){
        if(e.key==='Tab'){listening=null;render();return;}
        e.preventDefault();e.stopImmediatePropagation();
        if(e.key==='Escape'){listening=null;feedback.textContent='';render();return;}
        const value=chord(e);
        if(!value)return;
        const action=listening.dataset.binding,name=listening.dataset.labelBinding,tag=name!==undefined;
        if(tag&&['Delete','Backspace'].includes(value)){
          labelBindings.delete(name);persistLabels();listening=null;feedback.textContent='';render();return;
        }
        const names=currentLabels();
        if(tag&&!names.includes(name)){listening=null;render();return;}
        if(['Enter','Delete','Backspace','ContextMenu','Ctrl+Z','Ctrl+Shift+Z','Ctrl+Y','Ctrl+S','Meta+Z','Meta+Shift+Z','Meta+S'].includes(value) ||
          Object.keys(bindings).some(k=>k!==action && signalActions.has(k)===signalActions.has(action) && bindings[k]===value) ||
          (!signalActions.has(action) && names.some(n=>n!==name && labelBindings.get(n)===value))){
          feedback.textContent=t('prefs.conflict');return;
        }
        if(tag){labelBindings.set(name,value);persistLabels();}
        else {bindings[action]=value;persist();}
        listening=null;feedback.textContent='';render();return;
      }
      if(e.defaultPrevented || e.isComposing || (isText(e.target) && !(pointer && e.target.id==='video-seek')) || document.querySelector('dialog[open]') ||
        e.target.closest('[role=menu],#help-drawer,#behavior-patterns,#project-video-tabs,#recording-strip,summary,[role=separator]'))return;
      if((e.ctrlKey||e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase()==='s' && ready('save')){
        e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)actions.save();return;
      }
      if(!scope || !ready(scope))return;
      if(e.key==='Escape')return; // Native dialogs and active gestures cancel closest-first.
      const key=chord(e),action=Object.keys(defaults).find(name=>bindings[name]===key && signalActions.has(name)===(scope==='signal'));
      if(e.key===' ' && !pointer && e.target.closest('button,a,[role=button]'))return;
      if(!action && scope==='video'){
        const name=currentLabels().find(label=>labelBindings.get(label)===key);
        if(name!==undefined){
          e.preventDefault();e.stopImmediatePropagation();
          if(!e.repeat)actions.markLabel(name);
          return;
        }
      }
      if(!action){
        if(Object.keys(defaults).some(k=>defaults[k]===key && signalActions.has(k)===(scope==='signal'))){
          e.preventDefault();e.stopImmediatePropagation();
        }
        return;
      }
      e.preventDefault();e.stopImmediatePropagation();
      if(e.repeat && (action==='mark'||action==='play'))return;
      actions[action]();
    },true);
    return {open:()=>button.click(),render,labelKey:name=>{currentLabels();return labelBindings.get(name)||'';},get scope(){return scope;}};
  };
})();
