// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const labels={
    en:['Signals','New analysis…','Event responses','Population dynamics','Close tab'],
    'zh-CN':['信号','新分析…','事件放电','群体动力学','关闭标签页'],
    es:['Señales','Nuevo análisis…','Respuestas a eventos','Dinámica poblacional','Cerrar pestaña']
  };
  const kinds=['clusters','dynamics'];
  function selectTab(button,active){
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  }
  function createTab({label='',title=label,active=false,closeLabel='',onSelect,onClose}={}){
    const wrapper=document.createElement('span'),button=document.createElement('button');
    wrapper.className='recording-tab';button.className='recording-button';button.type='button';
    button.textContent=label;button.title=title;if(onSelect)button.onclick=onSelect;
    selectTab(button,active);wrapper.append(button);
    let close=null;
    if(onClose){
      close=document.createElement('button');close.className='recording-close';close.type='button';close.textContent='×';
      close.setAttribute('aria-keyshortcuts','Delete');close.setAttribute('aria-label',closeLabel);close.title=closeLabel+' (Del)';
      close.onclick=onClose;wrapper.append(close);
    }
    return {wrapper,button,close};
  }
  function revealTab(tab){
    const wrapper=tab?.closest('.recording-tab');
    if(!wrapper)return;
    const strip=wrapper.parentElement,view=strip.getBoundingClientRect(),item=wrapper.getBoundingClientRect();
    const left=item.left<view.left?item.left-view.left:Math.max(0,item.right-view.right);
    if(left)strip.scrollBy({left,behavior:'instant'});
  }
  function installTabStrip(strip){
    strip.addEventListener('wheel',e=>{
      if(e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||!e.deltaY)return;
      const end=strip.scrollWidth-strip.clientWidth;
      if(e.deltaY<0?strip.scrollLeft<=0:strip.scrollLeft>=end-1)return;
      e.preventDefault();
      const scale=e.deltaMode===1?16:e.deltaMode===2?strip.clientWidth:1;
      strip.scrollBy({left:e.deltaY*scale,behavior:'instant'});
    },{passive:false});
    strip.addEventListener('keydown',e=>{
      if(e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || !e.target.matches('.recording-button'))return;
      if(e.key==='Delete'){
        const close=e.target.nextElementSibling;
        if(close?.matches('.recording-close')){e.preventDefault();close.click();}return;
      }
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      const list=[...strip.querySelectorAll('.recording-button')],i=list.indexOf(e.target);
      const dest=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;
      e.preventDefault();list[dest].focus({preventScroll:true});revealTab(list[dest]);list[dest].click();
    });
  }
  window.NeuropixelsWorkspaceTabs={create:createTab,install:installTabStrip,reveal:revealTab};
  class AnalysisTabs {
    constructor(launch){
      this.launch=launch;this.tabs=[];this.active=null;this.next=0;
      this.bar=document.getElementById('analysis-tabs');this.host=document.getElementById('analysis-pages');
      this.strip=document.getElementById('recording-strip');
      this.picker=this.bar.querySelector('select');
      this.picker.onchange=()=>{const kind=this.picker.value;this.picker.value='';if(kind)this.launch(kind);};
      installTabStrip(this.strip);
      this.strip.addEventListener('keydown',e=>{if(e.key==='Escape')this.signals();});
      this.host.addEventListener('keydown',e=>{
        if(e.key==='Escape'&&!e.defaultPrevented&&!e.isComposing){e.preventDefault();this.signals();}
      });
      this.language();
    }
    language(){
      this.words=labels[document.documentElement.lang]||labels.en;
      this.picker.setAttribute('aria-label',this.words[1]);
      this.picker.replaceChildren(new Option(this.words[1],''),...kinds.map((k,i)=>new Option(this.words[2+i],k)));
      this.tabs.forEach(tab=>this.name(tab));
    }
    name(tab){
      const title=this.words[2+kinds.indexOf(tab.kind)]+' '+tab.number+(tab.detail?' · '+tab.detail:'');
      tab.button.textContent=title;tab.button.title=title;
      const closeLabel=this.words[4]+' · '+title;
      tab.close.title=closeLabel+' (Del)';tab.close.setAttribute('aria-label',closeLabel);
    }
    create(kind,project,recording,detail){
      const number=++this.next,id='analysis-'+number,panel=document.createElement('section');
      const {wrapper,button,close}=createTab({onSelect:()=>this.select(tab),onClose:()=>this.remove(tab)});
      wrapper.classList.add('analysis-tab');button.dataset.analysisTab=id;button.id=id+'-tab';
      button.setAttribute('aria-controls',id);
      panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.id=id;panel.tabIndex=-1;
      close.dataset.analysisClose=id;this.strip.append(wrapper);this.host.append(panel);
      const tab={kind,project,recording,number,id,detail,wrapper,button,close,panel,signals:()=>this.signals(),
        activate:()=>this.select(tab),rename:detail=>{tab.detail=detail;this.name(tab);}};
      this.tabs.push(tab);this.name(tab);this.bar.hidden=false;this.select(tab);return tab;
    }
    sync(){
      const current=this.strip.querySelector('[data-analysis-signal]');
      if(current)selectTab(current,!this.active);
      for(const item of this.tabs){
        if(item.wrapper.parentNode!==this.strip)this.strip.append(item.wrapper);
        selectTab(item.button,item===this.active);
      }
    }
    select(tab,{focus=true}={}){
      this.active=tab;
      for(const item of this.tabs){
        const active=item===tab;item.panel.hidden=!active;item.button.tabIndex=active?0:-1;
      }
      this.sync();
      this.host.hidden=!tab;
      const target=tab?.button||this.strip.querySelector('[data-analysis-signal]');
      if(focus){target?.focus({preventScroll:true});revealTab(target);}
      this.strip.dispatchEvent(new Event('scroll'));
      tab?.onShow?.();
    }
    signals(options){this.select(null,options);}
    remove(tab){
      if(!this.tabs.includes(tab))return;
      const wasActive=tab===this.active,index=this.tabs.indexOf(tab);
      this.tabs.splice(index,1);tab.dispose?.();tab.panel.remove();tab.button.parentElement.remove();
      if(wasActive)this.select(this.tabs[Math.min(index,this.tabs.length-1)]||null);
      else this.strip.dispatchEvent(new Event('scroll'));
      this.bar.hidden=!this.tabs.length;
      if(!this.tabs.length && wasActive)tab.launcher?.focus?.({preventScroll:true});
    }
    prune(project){for(const tab of [...this.tabs])if(tab.project!==project)this.remove(tab);}
  }
  window.NeuropixelsAnalysisTabs=AnalysisTabs;
})();
