// SPDX-License-Identifier: MIT
// Video labels retain their native time even where the neural clock has no coverage.
window.NeuropixelsBehaviorLabels = class {
  constructor(root, {canvas, t, select, cursor, videoCursor, onSource, openPatterns, onChange, onLabelSelection, onRows}) {
    Object.assign(this, {root, canvas, t, select, cursor, videoCursor, onSource, onChange, onLabelSelection, onRows});
    this.launcher = document.getElementById('pattern-label');
    this.launcher.onclick = openPatterns;
    this.picker = root.querySelector('[data-label-type]');
    this.entry = root.querySelector('#create-annotation');
    this.eventExample = document.createElement('button');
    this.eventExample.type = 'button';
    this.eventExample.hidden = true;
    this.eventExample.dataset.eventExample = '';
    this.eventExample.onclick = () => this.downloadEventExample();
    root.querySelector('[data-label-source=experiment]').after(this.eventExample);
    this.source = 'annotation';
    this.recorded = [];
    this.video = [];
    this.videoCount = 0;
    this.rows = [];
    this.names = [];
    this.types = {annotation:'', experiment:''};
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button?.dataset.labelSource) this.switchTo(button.dataset.labelSource);
      if (button?.dataset.labelStep) this.step(Number(button.dataset.labelStep));
    });
    this.picker.onchange = () => {
      this.onChange(); this.types[this.source] = this.picker.value; this.pickedEvent=null;
      if(this.source==='annotation' && this.picker.value)this.lastVideoLabel=this.picker.value;
      this.onLabelSelection?.(this.picker.value,this.source); this.render();
    };
  }
  switchTo(source) {
    if (source === this.source) return;
    this.onChange();
    this.source = source;
    this.onSource(source);
    this.render();
  }
  downloadEventExample() {
    const recordingId = this.recording?.key;
    if (!recordingId || this.eventExample.hidden) return;
    const events = [
      {id:'cue-1', sourceId:'1', sourceKind:'experiment', type:'example_cue', kind:'point', start:1, conditions:{direction:'left'}},
      {id:'cue-2', sourceId:'2', sourceKind:'experiment', type:'example_cue', kind:'point', start:3, conditions:{direction:'right'}},
      {id:'stim-1', sourceId:'3', sourceKind:'experiment', type:'example_stimulus', kind:'interval', start:4, end:5}
    ];
    const example = {schema:window.NeuropixelsEventAnalysis.SCHEMA, timebase:'neural_seconds', recordingId, events};
    const link = document.createElement('a');
    link.download = 'explorer-events.example.json';
    link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(example, null, 2) + '\n');
    link.click();
  }
  async update(recording,hasVideo=false,eventOwner=recording) {
    const language = document.documentElement.lang;
    const mediaChanged=this.hasVideo!==hasVideo;
    this.hasVideo=hasVideo;
    if (this.recording === recording && this.file === eventOwner?.eventsFile) {
      if (this.language !== language || mediaChanged) { this.language = language; this.render(); }
      return;
    }
    this.language = language;
    const wasViewingEvents=this.source==='experiment',hadRecording=!!this.recording;
    this.recording = recording;
    this.pickedEvent = null;
    if(this.file!==eventOwner?.eventsFile)this.types.experiment='';
    const file = this.file = eventOwner?.eventsFile;
    this.readingEvents = Boolean(file);
    this.recorded = [];
    this.error = '';
    if(!file)this.source='annotation';
    else if(wasViewingEvents || !hadRecording && !this.names.length)this.source='experiment';
    this.render();
    if (!file) return;
    try {
      if (file.size > 32*1024*1024) throw Error('Event file exceeds 32 MiB');
      const input = JSON.parse(await file.text());
      if (this.file !== file || this.recording !== recording) return;
      const {events} = window.NeuropixelsEventAnalysis.fromExperimentalEvents(input, eventOwner.key);
      this.recorded = events.map(e => ({id:e.id, label:e.type, start:e.start, end:e.kind==='point'?e.start:e.end,
        point:e.kind==='point', sourceTable:e.sourceTable || e.sourceKind, sourceId:e.sourceId, color:'#459a98'})).sort((a,b)=>a.start-b.start);
      if (!this.recorded.length) this.source = 'annotation';
    } catch (error) {
      if (this.file !== file || this.recording !== recording) return;
      this.error = error.message;
    }
    this.readingEvents = false;
    this.render();
  }
  selectVideoLabel(name) {
    this.lastVideoLabel=name;
    if(this.source==='annotation' && this.types.annotation===name)return;
    this.types.annotation=name;
    if(this.source!=='annotation')this.switchTo('annotation');
    else {this.onChange();this.render();}
  }
  setVideo(rows,names=[],total=rows.length,ready=false) {
    const availabilityChanged=Boolean(total || names.length)!==Boolean(this.videoCount || this.names.length) || this.annotationReady!==ready;
    this.video = rows.slice().sort((a,b)=>(a.videoStart??a.start)-(b.videoStart??b.start));
    this.videoCount=total;
    this.annotationReady=ready;
    this.names=names;
    if(this.source==='annotation' || availabilityChanged)this.render();
  }
  render() {
    const standalone=Boolean(window.NeuropixelsBrowserProjectUI);
    this.root.hidden = !standalone && !this.recording && !this.hasVideo;
    const recorded = this.source==='experiment';
    const hasAnnotations=Boolean(this.videoCount || this.names.length);
    const noEvents = standalone && !this.readingEvents && !this.error && !this.recorded.length;
    this.eventExample.hidden = !noEvents || !this.recording?.key || Boolean(this.recording.jointSources);
    this.eventExample.textContent = this.t('labels.downloadExample');
    this.root.classList.toggle('has-video',Boolean(this.hasVideo || this.annotationReady));
    for (const button of this.root.querySelectorAll('[data-label-source]')) {
      button.hidden=button.dataset.labelSource==='annotation' && !hasAnnotations;
      button.setAttribute('aria-pressed', String(button.dataset.labelSource===this.source));
      const hint=button.querySelector('[data-label-file]');
      if(hint) {
        button.classList.toggle('file-drop-slot',noEvents);
        hint.hidden=!noEvents;
        hint.textContent=this.t('drop.eventFile');
      }
    }
    this.picker.parentElement.hidden=!recorded && !hasAnnotations;
    this.entry.querySelector('[data-entry-title]').textContent=this.t(hasAnnotations ? 'labels.create' : 'labels.video');
    const hintKey=this.annotationReady ? 'labels.clickOrDrop' : 'labels.dropBeforeVideo';
    this.entry.dataset.helpKey=hintKey;
    this.entry.querySelector('[data-entry-hint]').textContent=this.t(hintKey);
    const data = recorded ? this.recorded : this.video;
    const counts = new Map();
    for (const row of data) if (row.label) counts.set(row.label, (counts.get(row.label)||0)+1);
    if(!recorded)for(const name of this.names)if(!counts.has(name))counts.set(name,0);
    const options = [...counts].map(([type,count])=>{
      const key=!recorded && this.labelKey?.(type);
      return new Option(type+' ('+count+')'+(key?' · '+key:''),type);
    });
    if (recorded ? counts.size>1 : counts.size) options.unshift(new Option(this.t(recorded?'labels.allRecorded':'labels.all')+' ('+data.length+')',''));
    if (!options.length) options.push(new Option(recorded && this.error || this.t('labels.empty'),''));
    this.picker.replaceChildren(...options);
    this.picker.value = options.some(o=>o.value===this.types[this.source]) ? this.types[this.source] : options[0].value;
    if (counts.size) this.types[this.source] = this.picker.value;
    this.picker.disabled = !counts.size;
    this.rows = this.picker.value ? data.filter(row=>row.label===this.picker.value) : data;
    this.patternType = this.picker.value || (counts.has(this.lastVideoLabel) ? this.lastVideoLabel :
      [...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]);
    const mapped=row=>Number.isFinite(row.start) && Number.isFinite(row.end);
    const eligible=data.reduce((total,row)=>total+Number(row.label===this.patternType && mapped(row) && row.patternEligible!==false),0);
    this.launcher.hidden = !this.recording || !eligible;
    this.launcher.textContent = eligible ? this.t('patterns.align')+' · '+this.patternType+' ('+eligible+')' : '';
    this.launcher.title = this.t('patterns.alignHint');
    for (const b of this.root.querySelectorAll('[data-label-step]')) b.disabled = !this.rows.length;
    this.canvas.setAnnotations(recorded ? this.rows : this.rows.filter(mapped), recorded);
    this.onRows?.(this.rows,this.source);
  }
  step(direction) {
    if (!this.rows.length) return;
    const nativeVideo=this.source==='annotation' && this.videoCursor;
    const time=nativeVideo ? this.videoCursor() : this.cursor();
    const start=row=>nativeVideo ? row.videoStart??row.start : row.start;
    const entry = direction>0 ? this.rows.find(r=>start(r)>time+1e-7) || this.rows[0]
      : this.rows.findLast(r=>start(r)<time-1e-7) || this.rows.at(-1);
    this.select(entry, this.source);
  }
};
