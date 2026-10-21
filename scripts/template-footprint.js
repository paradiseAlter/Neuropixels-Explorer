// SPDX-License-Identifier: MIT
// Display stored template evidence independently of the selected time interval.
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NeuropixelsTemplateFootprint = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dictionary = {
    en: { title:"Unit template distribution", select:"Select a Unit in the neural view or Probe.", loading:"Reading Unit template…", missing_templates:"No multichannel templates or spike-to-template assignments in this recording.", missing_geometry:"Channel positions are missing. A spatial template map cannot be shown.", invalid:"Template data or channel mapping is unsupported or invalid. No spatial distribution is inferred.", no_spikes:"This Unit has no assigned spikes.", note:"Whole-recording representative template; independent of the selected interval. Stored amplitudes, without unwhitening or µV calibration.", summary:"dominant template", spikes:"assigned spikes", templates:"templates in Unit", channels:"channels", amplitude:"Peak-to-peak (stored units)", wave:"Channel waveform", coordinates:"Channel positions (µm)", unlocated:"channels without coordinates", choose:"Choose channel", index:"Row", channel:"Channel", shank:"Shank", sample:"Time from template start (ms)", all:"All channels and amplitudes", shared:"Waveform amplitude uses one common scale across channels." },
    "zh-CN": { title:"Unit 模板分布", select:"在神经视图或 Probe 中选择一个 Unit。", loading:"正在读取 Unit 模板…", missing_templates:"此记录没有多通道模板或 spike—模板对应数据。", missing_geometry:"缺少电极坐标，无法显示模板空间分布。", invalid:"模板数据或通道映射不支持或无效，不推测空间分布。", no_spikes:"此 Unit 没有对应的 spike。", note:"全记录代表模板，与所选时间段独立。显示存储幅值，未反白化，也未标定为 µV。", summary:"主导模板", spikes:"对应 spike", templates:"个模板属于此 Unit", channels:"个通道", amplitude:"峰峰值（存储单位）", wave:"通道波形", coordinates:"电极坐标（µm）", unlocated:"个通道缺少坐标", choose:"选择通道", index:"行", channel:"通道", shank:"Shank", sample:"距模板起点的时间（ms）", all:"全部通道及幅值", shared:"各通道波形使用同一幅值尺度。" },
    es: { title:"Distribución de plantilla", select:"Selecciona una Unidad en la vista neural o Sonda.", loading:"Leyendo plantilla…", missing_templates:"Este registro no contiene plantillas multicanal o asignaciones de spikes a plantillas.", missing_geometry:"Faltan las posiciones de los canales.", invalid:"Datos o mapa de canales no válidos o no compatibles. No se infiere una distribución.", no_spikes:"La Unidad no tiene spikes asignados.", note:"Plantilla representativa del registro completo, independiente del intervalo. Amplitud almacenada, sin desblanqueo ni calibración en µV.", summary:"plantilla dominante", spikes:"spikes asignados", templates:"plantillas en la Unidad", channels:"canales", amplitude:"Pico a pico (unidades almacenadas)", wave:"Forma de onda del canal", coordinates:"Posiciones de canales (µm)", unlocated:"canales sin coordenadas", choose:"Elegir canal", index:"Fila", channel:"Canal", shank:"Shank", sample:"Tiempo desde inicio de plantilla (ms)", all:"Todos los canales y amplitudes", shared:"Escala de amplitud común entre canales." }
  };
  const words = lang => dictionary[lang] || dictionary.en;
  const number = n => Number(n.toFixed(3)).toLocaleString("en-US");
  function geometry(channels) {
    const positioned = channels.filter(c => Number.isFinite(c.xUm) && Number.isFinite(c.depthUm));
    const xs = positioned.map(c => c.xUm), ys = positioned.map(c => c.depthUm);
    const minX = xs.length ? Math.min(...xs) : 0, maxX = xs.length ? Math.max(...xs) : 0;
    const minY = ys.length ? Math.min(...ys) : 0, maxY = ys.length ? Math.max(...ys) : 0;
    const maxAmplitude = Math.max(0, ...channels.map(c => c.peakToPeak));
    return {minX,maxX,minY,maxY,maxAmplitude,points:positioned.map(c => ({...c,
      x: maxX === minX ? 160 : 44 + (c.xUm-minX)/(maxX-minX)*232,
      y: maxY === minY ? 130 : 232 - (c.depthUm-minY)/(maxY-minY)*202,
      radius: 2 + 5*Math.sqrt(c.peakToPeak/(maxAmplitude || 1))}))};
  }
  function render(data, selectedIndex, lang = "en") {
    const w = words(lang);
    if (!data || data.status !== "available") return `<p role="status">${escape(data ? w[data.status] || w.invalid : w.loading)}</p>`;
    const channels = data.channels, chosen = channels.find(c => c.index === selectedIndex) || channels.find(c => c.index === data.peakChannelIndex) || channels[0];
    const g = geometry(channels);
    const label = c => `${w.index} ${c.index}${c.channelId == null ? "" : ` / ${w.channel} ${c.channelId}`}`;
    const describe = c => `${label(c)} · ${w.shank} ${c.shankId ?? "?"} · x ${c.xUm ?? "?"}, y ${c.depthUm ?? "?"} µm · ${number(c.peakToPeak)}`;
    const amplitude = Math.max(1e-12, ...channels.map(c => c.waveform.reduce((m,v) => Math.max(m, Math.abs(v)), 0)));
    const path = chosen.waveform.map((v,i) => `${i ? "L" : "M"}${(44+i/Math.max(1,data.sampleCount-1)*232).toFixed(2)},${(72-v/amplitude*44).toFixed(2)}`).join(" ");
    const duration = (data.sampleCount-1)/data.sampleRate*1000;
    return `<p class="template-source"><strong>Unit ${data.clusterId ?? ""} · ${w.summary} ${data.templateId}</strong><br>${data.templateSpikeCount}/${data.unitSpikeCount} ${w.spikes} · ${data.templateCount} ${w.templates}</p>
      <p class="template-note">${w.note}</p>
      <svg class="template-position-map" viewBox="0 0 320 270" role="group" aria-label="${w.coordinates}">
        <path class="distribution-axis" d="M36,24 V240 H284"/>
        <text x="36" y="15">y (µm)</text><text x="160" y="267" text-anchor="middle">x (µm)</text>
        <text x="32" y="34" text-anchor="end">${number(g.maxY)}</text><text x="32" y="236" text-anchor="end">${number(g.minY)}</text>
        <text x="44" y="253">${number(g.minX)}</text><text x="276" y="253" text-anchor="end">${number(g.maxX)}</text>
        ${g.points.map(c => `<circle cx="${c.x}" cy="${c.y}" r="${c.radius}" data-template-channel="${c.index}" tabindex="${c.index === chosen.index ? 0 : -1}" role="button" aria-label="${escape(describe(c))}" aria-pressed="${c.index === chosen.index}" class="${c.index === chosen.index ? "selected" : ""}"><title>${escape(describe(c))}</title></circle>`).join("")}
      </svg><small>${w.amplitude}: 0–${number(g.maxAmplitude)} · ${channels.length} ${w.channels}${g.points.length < channels.length ? ` · ${channels.length-g.points.length} ${w.unlocated}` : ""}</small>
      <label class="template-channel-label">${w.choose}<select data-template-channel-select>${channels.map(c => `<option value="${c.index}" ${c.index === chosen.index ? "selected" : ""}>${label(c)} · ${number(c.peakToPeak)}</option>`).join("")}</select></label>
      <strong>${w.wave} · ${label(chosen)}</strong>
      <svg class="template-waveform" viewBox="0 0 320 154" role="img" aria-label="${escape(`${w.wave}, ${label(chosen)}, ${w.amplitude}`)}">
        <path class="distribution-grid" d="M44,72 H276"/><path class="distribution-axis" d="M44,24 V120 H276"/>
        <text x="40" y="31" text-anchor="end">${number(amplitude)}</text><text x="40" y="118" text-anchor="end">${number(-amplitude)}</text>
        <path class="template-trace" d="${path}"/><text x="44" y="134">0</text><text x="276" y="134" text-anchor="end">${number(duration)}</text><text x="160" y="150" text-anchor="middle">${w.sample}</text>
      </svg><small>${w.shared}</small>
      <details class="template-channel-list"><summary>${w.all}</summary><div>${channels.map(c => `<button data-template-channel="${c.index}" aria-pressed="${c.index === chosen.index}">${escape(describe(c))}</button>`).join("")}</div></details>`;
  }
  return { words, geometry, render };
});
