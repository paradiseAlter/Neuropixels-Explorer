// SPDX-License-Identifier: MIT
(() => {
  'use strict';

  // These figures use the worker's small, read-only excerpts of the current run.
  const stages = ['alignment', 'rates', 'cluster', 'order'];
  const centerColor=group=>'var(--ea-series-'+(group%6)+')';
  const words = {
    'zh-CN': {
      title:'计算过程', running:'正在计算', done:'计算完成', failed:'计算中断', replay:'重看过程', pause:'暂停演示', waiting:'正在读取本次分析的 spike…',
      alignment:'对齐事件', rates:'换算放电率', cluster:'曲线分组', order:'热图行序', hit:'命中', miss:'漏报', change:'换图', onset:'事件开始',
      time:'相对时间（秒）', neural:'神经记录时间', spikes:'逐次 spike', rate:'放电率（Hz）', counts:'各次事件的 spike 总数', events:'次事件',
      align:(e,n,total)=>`每次${e}都对齐到 0 秒。下图展示 ${total} 次中的 ${n} 次，每条短线是这个 Unit 的一次放电。`,
      delta:(s,e,d)=>`图中一个 spike：${s} s − ${e} s ≈ ${d} s。`,
      clipped:(shown,total)=>`图中共画出 ${shown} / ${total} 个 spike。`,
      rateIntro:(ms,n)=>`每 ${ms} ms 数一次 spike，把 ${n} 次事件在同一时间箱里的计数相加。`,
      chosenBin:(a,b)=>`高亮时间箱 [${a}, ${b}) 秒`,
      formula:(n,trials,width,hz)=>`${n} 个 spike ÷ ${trials} 次事件 ÷ ${width} 秒 ≈ ${hz} Hz`,
      samples:(n,total)=>`图中显示 ${total} 个时间箱中的 ${n} 个。`,
      group:'组', ungrouped:'未分组', round:'迭代', center:'本轮用于分组的中心曲线', selected:'示例 Unit', z:'Unit 内 z 分数', hz:'放电率（Hz）',
      shape:'先对每个 Unit 的曲线减去自身均值，再除以自身标准差。把整条曲线分给距离最近的中心，再用组内均值更新中心。',
      raw:'按 Hz 比较每个 Unit 的整条曲线，分给距离最近的中心，再用组内均值更新中心。',
      first:n=>`首次为 ${n} 个 Unit 分组。`, changed:n=>`本轮有 ${n} 个 Unit 换组。`, stable:'本轮有 0 个 Unit 换组，分组已收敛。',
      stays:g=>`示例 Unit 属于${g}。`, moves:(a,b)=>`示例 Unit 从${a}移到${b}。`, excluded:'示例 Unit 的曲线恒定，未参与形状聚类。',
      subset:(n,k)=>`图中显示 ${k} 个组中的 ${n} 个中心。`,
      before:'输入行序', after:'热图行序', row:'行', frozen:g=>`在「${g}」条件分组，切换条件时沿用这份行序。`,
      sorted:'按组排列 Unit，同组内沿用输入顺序。', inputOrder:'本次按输入顺序显示 Unit。', position:(a,b)=>`示例 Unit 从第 ${a} 行排到第 ${b} 行。`,
      noMove:a=>`示例 Unit 保持在第 ${a} 行。`, noCluster:'本次未运行聚类。', rows:n=>`共 ${n} 行`,
      replaying:'正在回放', calcRef:'示例条件', locate:'在热图中查看这个 Unit', play:'继续演示',
      rowCounts:(counts,n,rest,total)=>`图中各次的计数（${counts}）${n ? '＋其余 '+n+' 次的 '+rest : ''} ＝ ${total} 个 spike`
    },
    en: {
      title:'How the analysis ran', running:'Computing', done:'Complete', failed:'Computation stopped', replay:'Replay steps', pause:'Pause walkthrough', waiting:'Reading spikes for this analysis…',
      alignment:'Align events', rates:'Calculate rates', cluster:'Group curves', order:'Order rows', hit:'Hit', miss:'Miss', change:'image change', onset:'event onset',
      time:'Time from onset (s)', neural:'Neural recording time', spikes:'Spikes by event', rate:'Firing rate (Hz)', counts:'Spikes across events', events:'events',
      align:(e,n,total)=>`Each ${e} sets time zero. Each tick is one spike from this Unit. Showing ${n} of ${total} events.`,
      delta:(s,e,d)=>`One spike in this plot: ${s} s − ${e} s ≈ ${d} s.`, clipped:(s,t)=>`Showing ${s} of ${t} spikes in these rows.`,
      rateIntro:(ms,n)=>`Count spikes in ${ms} ms bins, then add the counts from all ${n} events in each bin.`,
      chosenBin:(a,b)=>`Highlighted bin [${a}, ${b}) s`, formula:(n,t,w,h)=>`${n} spikes ÷ ${t} events ÷ ${w} s ≈ ${h} Hz`,
      samples:(n,t)=>`Showing ${n} of ${t} bins.`, group:'Group', ungrouped:'Ungrouped', round:'Iteration', center:'Centers used for this assignment', selected:'Example Unit',
      z:'Within-Unit z-score', hz:'Firing rate (Hz)', shape:'Subtract each Unit’s mean rate and divide by its standard deviation. Assign the curve to the nearest center, then update the center with its group mean.',
      raw:'Compare the full curves in Hz, assign each Unit to its nearest center, then update the center with its group mean.',
      first:n=>`Assigned ${n} Units for the first time.`, changed:n=>`${n} Units changed groups.`, stable:'0 Units changed groups. The fit converged.',
      stays:g=>`The example Unit belongs to ${g}.`, moves:(a,b)=>`The example Unit moved from ${a} to ${b}.`, excluded:'The example Unit’s constant curve was excluded from shape clustering.',
      subset:(n,k)=>`Showing ${n} of ${k} centers.`, before:'Input order', after:'Heatmap order', row:'Row',
      frozen:g=>`Groups were fitted on ${g}. Both conditions use the same row order.`, sorted:'Order Units by group, keeping input order within each group.',
      inputOrder:'Units retain their input order.', position:(a,b)=>`The example Unit moved from row ${a} to row ${b}.`, noMove:a=>`The example Unit stayed in row ${a}.`,
      noCluster:'Clustering was off for this run.', rows:n=>`${n} rows in total`, replaying:'Replaying', calcRef:'Example condition', locate:'Show this Unit in the heatmap', play:'Resume walkthrough',
      rowCounts:(counts,n,rest,total)=>`Shown events (${counts})${n ? ' + '+rest+' from the other '+n+' events' : ''} = ${total} spikes`
    },
    es: {
      title:'Proceso de cálculo', running:'Calculando', done:'Cálculo completado', failed:'Cálculo interrumpido', replay:'Volver a ver', pause:'Pausar recorrido', waiting:'Leyendo los spikes de este análisis…',
      alignment:'Alinear eventos', rates:'Calcular frecuencia', cluster:'Agrupar curvas', order:'Ordenar filas', hit:'Acierto', miss:'Fallo', change:'cambio de imagen', onset:'inicio del evento',
      time:'Tiempo desde el inicio (s)', neural:'Tiempo del registro neural', spikes:'Spikes por evento', rate:'Frecuencia (Hz)', counts:'Spikes de todos los eventos', events:'eventos',
      align:(e,n,t)=>`Cada ${e} marca el tiempo cero. Cada raya es un spike de esta Unit. Se muestran ${n} de ${t} eventos.`,
      delta:(s,e,d)=>`Un spike de la gráfica: ${s} s − ${e} s ≈ ${d} s.`, clipped:(s,t)=>`Se muestran ${s} de ${t} spikes en estas filas.`,
      rateIntro:(ms,n)=>`Cuenta los spikes en intervalos de ${ms} ms y suma en cada intervalo los conteos de los ${n} eventos.`,
      chosenBin:(a,b)=>`Intervalo resaltado [${a}, ${b}) s`, formula:(n,t,w,h)=>`${n} spikes ÷ ${t} eventos ÷ ${w} s ≈ ${h} Hz`,
      samples:(n,t)=>`Se muestran ${n} de ${t} intervalos.`, group:'Grupo', ungrouped:'Sin grupo', round:'Iteración', center:'Centros usados en esta asignación', selected:'Unit de ejemplo',
      z:'Puntuación z por Unit', hz:'Frecuencia (Hz)', shape:'Resta la media de cada Unit y divide por su desviación estándar. Asigna la curva al centro más cercano y actualiza el centro con la media del grupo.',
      raw:'Compara las curvas en Hz, asigna cada Unit al centro más cercano y actualiza el centro con la media del grupo.',
      first:n=>`Primera asignación de ${n} Units.`, changed:n=>`${n} Units cambiaron de grupo.`, stable:'0 Units cambiaron de grupo. El ajuste convergió.',
      stays:g=>`La Unit de ejemplo pertenece al ${g}.`, moves:(a,b)=>`La Unit de ejemplo pasó del ${a} al ${b}.`, excluded:'La curva constante de la Unit de ejemplo quedó fuera de la agrupación por forma.',
      subset:(n,k)=>`Se muestran ${n} de ${k} centros.`, before:'Orden de entrada', after:'Orden del mapa', row:'Fila', frozen:g=>`Se usó ${g} para agrupar. Ambas condiciones comparten el mismo orden.`,
      sorted:'Ordena las Units por grupo y conserva el orden de entrada dentro de cada grupo.', inputOrder:'Las Units conservan su orden de entrada.',
      position:(a,b)=>`La Unit de ejemplo pasó de la fila ${a} a la ${b}.`, noMove:a=>`La Unit de ejemplo sigue en la fila ${a}.`,
      noCluster:'No se solicitó la agrupación.', rows:n=>`${n} filas en total`, replaying:'Reproduciendo', calcRef:'Condición mostrada', locate:'Ver esta Unit en el mapa', play:'Reanudar recorrido',
      rowCounts:(counts,n,rest,total)=>`Eventos mostrados (${counts})${n ? ' + '+rest+' de los otros '+n+' eventos' : ''} = ${total} spikes`
    }
  };

  const help = {
    'zh-CN':{
      summary:'展开或收起本次运行的计算过程。',alignment:'对照原始神经时刻和相对时间，查看每次事件如何移到 0 秒。',
      rates:'查看同一时间箱里各次事件的 spike 数，以及它们如何换算成 Hz。',cluster:'比较示例 Unit 与各组中心的曲线，可按轮查看换组情况。',
      order:'比较分组前后的行号，找到示例 Unit 在热图里的位置。',round:'选择一次真实迭代，查看当轮使用的组中心和换组数。',
      replay:'从对齐步骤回放刚才的结果，无需重新计算。',pause:'停在当前步骤，计算会继续。',play:'从当前步骤继续自动展示已经算出的结果。',locate:'滚动到示例 Unit 所在的热图行，并显示其逐次 spike。'
    },
    en:{
      summary:'Open or close the steps from this run.',alignment:'Compare recording time and relative time to see how each event moves to zero.',
      rates:'Inspect spike counts in the same bin across trials and how they become Hz.',cluster:'Compare the example Unit with the cluster centers and inspect reassignments by iteration.',
      order:'Compare input and grouped row numbers to locate the example Unit in the heatmap.',round:'Inspect the centers and reassignments from this iteration of the fit.',
      replay:'Replay the calculated steps from alignment.',pause:'Hold this step while the calculation continues.',play:'Continue showing the results of this run.',locate:'Scroll to the example Unit in the heatmap and open its spikes by event.'
    },
    es:{
      summary:'Abre o cierra los pasos de este cálculo.',alignment:'Compara el tiempo del registro y el relativo para ver cómo cada evento se alinea a cero.',
      rates:'Revisa los spikes de cada ensayo en el mismo intervalo y su conversión a Hz.',cluster:'Compara la unidad de ejemplo con los centros e inspecciona los cambios de grupo de cada iteración.',
      order:'Compara las filas antes y después de agrupar para localizar la unidad de ejemplo.',round:'Inspecciona los centros y cambios de grupo de la iteración elegida.',
      replay:'Reproduce los pasos calculados desde la alineación.',pause:'Mantén este paso en pantalla mientras continúa el cálculo.',play:'Continúa mostrando los resultados de esta ejecución.',locate:'Localiza la fila de esta unidad y abre sus spikes por evento.'
    }
  };
  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }
  function svgPart(parent, tag, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    parent.append(node);
    return node;
  }
  const W = 600, H = 82;
  function plot(parent, label, start, end) {
    const box = element('div', 'ea-process-plot');
    parent.append(box);
    const svg = svgPart(box, 'svg', {viewBox:`0 0 ${W} ${H}`, preserveAspectRatio:'none', role:'img', 'aria-label':label});
    const x = t => W * (t - start) / (end - start);
    const add = (tag, attrs) => svgPart(svg, tag, attrs);
    return {box, x, add, zero() {
      if (start <= 0 && end >= 0) add('line', {class:'ea-process-zero', x1:x(0), x2:x(0), y1:0, y2:H});
    }};
  }
  function timeAxis(parent, start, end, w, num) {
    const axis = element('div', 'ea-process-axis');
    axis.append(element('span', '', num(start) + ' s'), element('span', '', num(end) + ' s'));
    const percent = -100 * start / (end - start);
    if (percent > 0 && percent < 100) {
      if (percent < 14) axis.firstElementChild.style.visibility='hidden';
      if (percent > 86) axis.lastElementChild.style.visibility='hidden';
      const zero = element('span', 'ea-process-axis-zero', '0 s');
      zero.style.left = 'clamp(.65em,' + percent + '%,calc(100% - .65em))';
      axis.append(zero);
    }
    axis.setAttribute('aria-label', w.time);
    parent.append(axis);
  }
  function trace(graph, points, vertical, attrs, sparse = false) {
    const valid = points.filter(p => Number.isFinite(p.value));
    if (!valid.length) return;
    let d = '';
    valid.forEach((p, i) => {
      // Gaps between sampled bins represent unplotted values.
      const move = !i || p.index !== valid[i-1].index + 1;
      d += `${move?'M':'L'}${graph.x(p.time).toFixed(3)} ${vertical(p.value).toFixed(3)} `;
      if (sparse || valid.length === 1) {
        const x = graph.x(p.time), y = vertical(p.value);
        graph.add('line', {...attrs, x1:x-1, x2:x+1, y1:y, y2:y, 'stroke-linecap':'round'});
      }
    });
    graph.add('path', {...attrs, d, fill:'none'});
  }
  function figure(parent, caption) {
    const el = element('figure', 'ea-process-figure');
    el.append(element('figcaption', '', caption));
    parent.append(el);
    return el;
  }
  function yScale(parent, high, low, num) {
    const scale = element('div', 'ea-process-y');
    scale.append(element('span', '', num(high)), element('span', '', num(low)));
    parent.append(scale);
  }
  function note(parent, text) { parent.append(element('p', 'ea-process-note', text)); }
  function groupLabel(w, group) { return group == null ? w.ungrouped : w.group + ' ' + (group + 1); }

  function highlightBin(g, bin) {
    g.add('rect', {class:'ea-process-highlight-bin', x:g.x(bin.start), y:0,
      width:Math.max(1, g.x(bin.end) - g.x(bin.start)), height:H});
  }
  const markers = ['①','②','③'];
  function originalTimeline(parent, events, w, num) {
    const first = Math.min(...events.map(e => e.start)), last = Math.max(...events.map(e => e.start));
    const raw = figure(parent, w.neural);
    raw.classList.add('ea-process-absolute');
    const axis = element('div', 'ea-process-original-axis');
    raw.append(axis);
    const byTime = new Map();
    events.forEach((e, i) => byTime.set(e.start, (byTime.get(e.start) || '') + markers[i]));
    const ends = [];
    for (const [time, ids] of [...byTime].sort((a,b) => a[0] - b[0])) {
      const x = first === last ? 50 : 100 * (time - first) / (last - first);
      // Separate labels at nearby times without moving any event on the axis.
      let lane = ends.findIndex(end => x - end >= 12);
      if (lane < 0) lane = ends.length;
      ends[lane] = x;
      const marker = element('span', 'ea-process-original-marker', ids);
      marker.style.left = x + '%';
      marker.style.bottom = (4 + lane * 16) + 'px';
      marker.style.setProperty('--ea-process-stem', (3 + lane * 16) + 'px');
      marker.title = ids + '  ' + num(time, 6) + ' s';
      axis.append(marker);
    }
    axis.style.height = (8 + ends.length * 16) + 'px';
    const scale = element('div', 'ea-process-axis');
    scale.append(element('span', '', num(first, 6) + ' s'));
    if (last !== first) scale.append(element('span', '', num(last, 6) + ' s'));
    else scale.classList.add('ea-process-one-time');
    raw.append(scale);
  }
  function showAlignment(parent, s, rates, w, num) {
    const event = s.eventType === 'image_change' ? w.change : (s.eventType || w.onset);
    note(parent, w.align(event, s.events.length, s.trialCount));
    originalTimeline(parent, s.events, w, num);
    const layout = element('div', 'ea-process-raster');
    parent.append(layout);
    layout.append(element('div', 'ea-process-caption', w.neural), element('div', 'ea-process-caption', w.time));
    let shown = 0, total = 0, example = null;
    for (const [i, entry] of s.events.entries()) {
      const id = element('span', 'ea-process-onset', markers[i] + '  ' + num(entry.start, 6) + ' s');
      id.title = String(entry.id);
      layout.append(id);
      const g = plot(layout, w.spikes + ' · ' + id.textContent, s.start, s.end);
      g.box.classList.add('ea-process-spike-row');
      if (rates) highlightBin(g, rates.example);
      g.zero();
      const d = entry.spikes.map(t => `M${g.x(t-entry.start).toFixed(3)} 15v52`).join(' ');
      if (d) g.add('path', {d, class:'ea-process-spikes'});
      shown += entry.spikes.length;
      total += entry.spikeCount;
      if (!example && entry.spikes.length) example = {spike:entry.spikes[0], onset:entry.start};
    }
    layout.append(element('span'));
    timeAxis(layout, s.start, s.end, w, num);
    if (rates) parent.append(element('div', 'ea-process-bin-key', w.chosenBin(num(rates.example.start), num(rates.example.end))));
    if (example) note(parent, w.delta(num(example.spike, 6), num(example.onset, 6), num(example.spike - example.onset, 6)));
    if (shown < total) note(parent, w.clipped(shown, total));
  }

  function showRates(parent, s, w, num) {
    note(parent, w.rateIntro(num(s.binWidth * 1000), s.trialCount));
    const grid = element('div', 'ea-process-charts');
    parent.append(grid);
    const example = s.example;
    for (const type of ['count', 'hz']) {
      const label = type === 'count' ? w.counts : w.rate;
      const f = figure(grid, label);
      const g = plot(f, label, s.start, s.end);
      const high = Math.max(1, ...s.bins.map(b => b[type]), example[type]);
      const y = v => H - 3 - (H - 6) * v / high;
      highlightBin(g, example);
      g.zero();
      if (type === 'count') {
        for (const b of s.bins) {
          const available = g.x(b.end) - g.x(b.start);
          g.add('rect', {class:'ea-process-count', x:g.x(b.start)+available*.08, y:y(b.count), width:Math.max(.6,available*.84), height:y(0)-y(b.count)});
        }
      } else {
        const points = s.bins.map(b => ({index:b.index,time:(b.start+b.end)/2,value:b.hz}));
        trace(g, points, y, {class:'ea-process-rate'}, s.binCount > points.length);
      }
      yScale(g.box, high, 0, num);
      timeAxis(f, s.start, s.end, w, num);
    }
    const formula = element('div', 'ea-process-formula');
    formula.append(element('span', '', w.chosenBin(num(example.start), num(example.end))));
    if (s.exampleTrialCounts?.length) {
      const counts = s.exampleTrialCounts.map(t => t.count);
      const rest = example.count - counts.reduce((sum, count) => sum + count, 0);
      formula.append(element('span', '', w.rowCounts(counts.join(' + '), s.trialCount - counts.length, rest, example.count)));
    }
    formula.append(element('strong', '', w.formula(example.count, s.trialCount, num(s.binWidth), num(example.hz))));
    parent.append(formula);
    if (s.binCount > s.bins.length) note(parent, w.samples(s.bins.length, s.binCount));
  }

  function showCluster(parent, s, rates, w, num, recording) {
    note(parent, s.normalization === 'shape' ? w.shape : w.raw);
    const label = s.normalization === 'shape' ? w.z : w.hz;
    const f = figure(parent, label);
    const g = plot(f, label, rates.start, rates.end);
    const values = [...s.points.map(p=>p.value), ...s.centers.flatMap(c=>c.values)].filter(Number.isFinite);
    const high = Math.max(1, ...values), low = Math.min(0, ...values);
    const y = v => H - 3 - (H - 6) * (v - low) / (high - low);
    if (low < 0 && high > 0) g.add('line', {class:'ea-process-baseline', x1:0, x2:W, y1:y(0), y2:y(0)});
    g.zero();
    const sparse = rates.binCount > s.points.length;
    for (const center of s.centers) {
      const points = s.points.map((p,i)=>({...p, value:center.values[i]}));
      trace(g, points, y, {class:'ea-process-center', stroke:centerColor(center.group)}, sparse);
    }
    if (s.group != null) trace(g, s.points, y, {class:'ea-process-unit-trace'}, sparse);
    yScale(g.box, high, low, num);
    timeAxis(f, rates.start, rates.end, w, num);
    const legend = element('div', 'ea-process-legend');
    if (s.group != null) {
      const unit=element('span','ea-process-unit-key',w.selected+' '+s.unitId);
      window.NeuropixelsUnitMarks?.bind(unit,recording,s.unitId);legend.append(unit);
    }
    legend.append(element('span', '', w.center));
    for (const center of s.centers) {
      const key = element('span', 'ea-process-center-key', groupLabel(w, center.group) + ' · ' + s.sizes[center.group] + ' Units');
      key.style.setProperty('--ea-process-color', centerColor(center.group));
      legend.append(key);
    }
    parent.append(legend);
    const summary = s.iteration === 1 ? w.first(s.changed) : (s.converged ? w.stable : w.changed(s.changed));
    const member = s.group == null ? w.excluded : (s.previousGroup != null && s.previousGroup !== s.group
      ? w.moves(groupLabel(w, s.previousGroup), groupLabel(w, s.group)) : w.stays(groupLabel(w, s.group)));
    note(parent, summary + ' ' + member);
    if (s.centers.length < s.sizes.length) note(parent, w.subset(s.centers.length, s.sizes.length));
    if (sparse) note(parent, w.samples(s.points.length, rates.binCount));
  }

  function referenceName(s,w) {
    if((s.conditionField==='trial_outcome'||s.conditionField===window.NeuropixelsEventAnalysis?.LABEL_FIELD) && ['hit','miss'].includes(s.referenceOutcome))return w[s.referenceOutcome];
    return (s.conditionField ? s.conditionField+' = ' : '')+JSON.stringify(s.referenceOutcome);
  }
  function showOrder(parent, s, w, recording) {
    const grouped = s.groups.some(g => g.group != null);
    note(parent, grouped ? w.sorted + (s.referenceOutcome!=null ? ' ' + w.frozen(referenceName(s,w)) : '') : w.noCluster + ' ' + w.inputOrder);
    const grid = element('div', 'ea-process-orders');
    parent.append(grid);
    for (const phase of ['before', 'after']) {
      const table = element('table', 'ea-process-order');
      table.append(element('caption', '', w[phase]));
      const header = table.createTHead().insertRow();
      for (const title of [w.row, 'Unit', ...(grouped ? [w.group] : [])]) {
        const th = element('th', '', title);
        th.scope = 'col';
        header.append(th);
      }
      const body = table.createTBody();
      for (const r of s[phase]) {
        const row = body.insertRow();
        if (r.unitId === s.unitId) row.className = 'ea-process-tracked';
        row.insertCell().textContent = r.row;
        const unit=row.insertCell();unit.textContent = r.unitId;
        window.NeuropixelsUnitMarks?.bind(unit,recording,r.unitId);
        if (grouped) row.insertCell().textContent = r.group == null ? w.ungrouped : r.group + 1;
      }
      grid.append(table);
    }
    note(parent, (s.beforeRow === s.afterRow ? w.noMove(s.afterRow) : w.position(s.beforeRow, s.afterRow)) + ' ' + w.rows(s.unitCount));
  }

  function button(label) {
    const node = element('button', '', label);
    node.type = 'button';
    return node;
  }

  function create(host, language = document.documentElement.lang, recording) {
    const locale = Object.hasOwn(words, language) ? language : 'en';
    const w = words[locale];
    const format = new Map();
    function number(value, digits = 4) {
      if (!format.has(digits)) format.set(digits, new Intl.NumberFormat(locale, {
        minimumFractionDigits:0, maximumFractionDigits:digits, useGrouping:false
      }));
      // Preserve very narrow user-selected bins instead of labelling them zero.
      if (value !== 0 && Math.abs(value) < 0.5 * 10 ** -digits) return value.toExponential(2);
      return format.get(digits).format(value === 0 ? 0 : value);
    }
    const root = element('details', 'ea-process');
    root.dataset.eaProcess = '';
    const summary = element('summary', 'ea-process-summary');
    const tips = help[locale];
    summary.title = tips.summary;
    const status = element('span', 'ea-process-status');
    status.setAttribute('role', 'status');
    summary.append(element('strong', '', w.title), status);
    const top = element('div', 'ea-process-nav');
    const controls = element('div', 'ea-process-stages');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', w.title);
    const demo = button(w.pause);
    demo.dataset.eaProcessPlayback = '';
    top.append(controls, demo);
    const labels = element('div', 'ea-process-context');
    const unitLabel = element('strong');
    const condition = element('span');
    const roundControl = element('label', 'ea-process-round');
    const rounds = element('select');
    rounds.title = tips.round;
    rounds.dataset.eaProcessIteration = '';
    roundControl.append(element('span', '', w.round), rounds);
    labels.append(unitLabel, condition, roundControl);
    const view = element('div', 'ea-process-view');
    const locate = button(w.locate);
    locate.title = tips.locate;
    locate.dataset.eaProcessLocate = '';
    root.append(summary, top, labels, view, locate);
    root.hidden = true;
    host.replaceChildren(root);

    const buttons = new Map();
    const snapshots = new Map();
    const iterations = new Map();
    let active = null, iteration = 0, running = false, finished = false, failed = false, follow = false, canLocate = false;
    let timer = null, shownAt = 0;
    function stopTimer() { clearTimeout(timer); timer = null; }
    function hasNext() {
      if (active === 'cluster' && snapshots.get('cluster').iteration !== iteration) return true;
      return stages.slice(stages.indexOf(active) + 1).some(s => snapshots.has(s));
    }
    function chrome() {
      const replaying = root.open && follow && finished && hasNext();
      const statusText = failed ? w.failed : (finished ? w.done + (replaying ? ' · ' + w.replaying : '') : w.running);
      if (status.textContent !== statusText) status.textContent = statusText;
      for (const [key, item] of buttons) {
        item.disabled = !snapshots.has(key);
        item.hidden = key === 'cluster' && snapshots.has('order') && !snapshots.has(key);
        item.setAttribute('aria-pressed', String(active === key));
      }
      const end = finished && !hasNext();
      demo.disabled = !snapshots.size;
      demo.hidden = failed;
      demo.textContent = end ? w.replay : (follow ? w.pause : w.play);
      demo.title = end ? tips.replay : (follow ? tips.pause : tips.play);
      locate.hidden = !(active === 'order' && canLocate);
    }
    function paint() {
      const s = active === 'cluster' ? iterations.get(iteration) : snapshots.get(active);
      view.replaceChildren();
      view.dataset.eaProcessStage = active || '';
      labels.hidden = !s;
      roundControl.hidden = active !== 'cluster';
      if (!s) {
        note(view, w.waiting);
        chrome();
        return;
      }
      unitLabel.textContent = w.selected + ' ' + s.unitId;
      window.NeuropixelsUnitMarks?.bind(unitLabel,recording,s.unitId);
      condition.textContent = s.referenceOutcome!=null ? w.calcRef + ' · ' + referenceName(s,w) : '';
      if (active === 'alignment') showAlignment(view, s, snapshots.get('rates'), w, number);
      if (active === 'rates') showRates(view, s, w, number);
      if (active === 'cluster') {
        rounds.value = String(s.iteration);
        showCluster(view, s, snapshots.get('rates'), w, number, recording);
      }
      if (active === 'order') showOrder(view, s, w, recording);
      chrome();
    }
    function show(stage, round = 0) {
      active = stage;
      iteration = stage === 'cluster' ? round : 0;
      shownAt = performance.now();
      paint();
    }
    function showNext() {
      if (active === 'cluster' && iteration !== snapshots.get(active).iteration) {
        const second = Array.from(iterations.keys())[1];
        show('cluster', second && iteration < second ? second : snapshots.get(active).iteration);
      } else {
        const next = stages.slice(stages.indexOf(active)+1).find(key=>snapshots.has(key));
        if (!next) return;
        show(next, next === 'cluster' ? iterations.keys().next().value : 0);
      }
    }
    // Only pace the display of snapshots that the worker has already emitted.
    // Numerical work and the final result never wait on this walkthrough.
    function schedule() {
      stopTimer();
      chrome();
      if (!follow || !root.open || !hasNext()) return;
      const remaining = Math.max(0, 3600 - (performance.now() - shownAt));
      timer = setTimeout(() => { showNext(); schedule(); }, remaining);
    }
    for (const key of stages) {
      const item = button(w[key]);
      item.title = tips[key];
      item.dataset.eaProcessStep = key;
      item.onclick = () => {
        stopTimer(); follow = false;
        show(key, key === 'cluster' ? snapshots.get(key).iteration : 0);
      };
      controls.append(item);
      buttons.set(key, item);
    }
    rounds.onchange = () => {
      stopTimer(); follow = false;
      show('cluster', Number(rounds.value));
    };
    demo.onclick = () => {
      if (finished && !hasNext()) {
        const first = stages.find(key=>snapshots.has(key));
        if (!first) return;
        follow = true;
        show(first);
      } else {
        follow = !follow;
        shownAt = performance.now();
      }
      schedule();
    };
    locate.onclick = () => {
      const order = snapshots.get('order');
      if (canLocate && order) host.dispatchEvent(new CustomEvent('ea-process-unit', {bubbles:true, detail:{unitId:order.unitId}}));
    };
    root.ontoggle = () => { if (!root.hidden) schedule(); };
    function clear() {
      stopTimer();
      snapshots.clear(); iterations.clear(); rounds.replaceChildren();
      active = null; iteration = 0; finished = false; failed = false; running = false; follow = false; canLocate = false;
      root.hidden = true;
    }
    return {
      start() {
        clear();
        running = true;
        follow = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        root.open = true;
        root.hidden = false;
        paint();
      },
      update(s) {
        if (!running || s?.phase !== 'process' || !stages.includes(s.stage)) return;
        snapshots.set(s.stage, s);
        if (s.stage === 'cluster') {
          if (!iterations.has(s.iteration)) {
            const option = element('option', '', s.iteration);
            option.value = String(s.iteration);
            rounds.append(option);
          }
          iterations.set(s.iteration, s);
        }
        if (!active) show(s.stage, s.iteration);
        else if (active === 'alignment' && s.stage === 'rates') paint();
        schedule();
      },
      finish(result) {
        if (!running) return;
        running = false;
        finished = true;
        canLocate = !!result?.response;
        if (!snapshots.size) { clear(); return; }
        if (!root.matches(':focus-within')) root.open = false;
        schedule();
      },
      fail() {
        if (!running) return;
        if (!snapshots.size) { clear(); return; }
        running = false;
        failed = true;
        stopTimer();
        if (follow) {
          const last = Array.from(snapshots.keys()).pop();
          show(last, snapshots.get(last).iteration);
        }
        follow = false;
        chrome();
      },
      cancel:clear,
      destroy() { clear(); root.ontoggle = null; root.remove(); }
    };
  }
  window.EventAnalysisProcess = {create};
})();
