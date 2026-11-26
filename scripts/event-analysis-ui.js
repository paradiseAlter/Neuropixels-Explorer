// SPDX-License-Identifier: MIT
(() => {
  'use strict';
  const E=window.NeuropixelsEventAnalysis, P=window.NeuropixelsEventAnalysisStorage, core=window.NeuropixelExplorerCore;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const COPY={
    en:{title:'Event responses',intro:'Align Unit spikes to event starts, then compare response profiles.',source:'Event source',experiment:'Experimental events',annotation:'Video annotations',type:'Event type / label',units:'Unit IDs, separated by commas',useSelected:'Use selected Unit',useAll:'Use all available Units',coverage:'Valid neural recording intervals (seconds, JSON)',coverageHelp:'Leave blank to use source observation intervals. For manual entry use [[start,end], …] in neural seconds.',start:'Window start (s)',end:'Window end (s)',bin:'Bin width (s)',k:'Clusters (0 = response only)',normalization:'Cluster features',shape:'Within-Unit z-score',rate:'Unscaled rate (Hz)',seed:'Random seed',active:'Active experimental block only',run:'Compute responses',cancel:'Cancel computation',close:'Back to signals',ready:'Choose events and Units, then specify valid recording intervals.',loading:'Reading event metadata…',computing:'Computing in a separate worker…',cancelled:'Computation cancelled. Source data are unchanged.',empty:'No matching events. Choose an event type or save a named video annotation.',unavailable:'Open a local Recording with spike arrays first. Indexed-service event analysis is not available yet.',coverageNote:'Coverage is user-declared and unverified. Events with incomplete windows are excluded.',limit:'Grouping uses the selected response features.',stale:'Inputs changed. Recompute before exporting or returning to source.',export:'Export analysis JSON',return:'Show Unit at event',event:'Source event',selected:'Selected Unit',mean:'Mean response (Hz)',raster:'Trial raster (binned spike counts)',group:'Response group',excluded:'Excluded',invalid:'Enter comma-separated integer Unit IDs.',readError:'Could not read events: ',done:'Computed',trials:'events',bins:'bins',note:'This preview exports separately. Analysis results are not yet restored from a project package.'},
    'zh-CN':{title:'事件响应',intro:'按事件起点对齐 Unit spike，再比较响应形状。',source:'事件来源',experiment:'实验事件',annotation:'视频标注',type:'事件类型 / 标签',units:'Unit ID，以逗号分隔',useSelected:'使用所选 Unit',useAll:'使用全部可用 Unit',coverage:'有效神经记录区间（秒，JSON）',coverageHelp:'留空采用文件中的观测区间。手动输入格式为 [[起点,终点], …]，单位为神经时间秒。',start:'窗口起点（秒）',end:'窗口终点（秒）',bin:'分箱宽度（秒）',k:'聚类数（0 = 仅响应）',normalization:'聚类特征',shape:'Unit 内 z-score',rate:'原始发放率（Hz）',seed:'随机种子',active:'仅活跃实验区块',run:'计算响应',cancel:'取消计算',close:'返回信号',ready:'选择事件和 Unit，并填写有效记录区间。',loading:'正在读取事件元数据…',computing:'正在独立 Worker 中计算…',cancelled:'计算已取消，源数据未改变。',empty:'没有匹配事件。请选择事件类型，或命名并保存视频标注。',unavailable:'请先打开包含 spike 数组的本地 Recording。暂不支持索引服务中的事件分析。',coverageNote:'覆盖范围由用户填写，尚未验证；窗口覆盖不完整的事件会被排除。',limit:'分组依据是所选 Unit 的事件响应特征。',stale:'输入已改变，请重新计算后再导出或回看来源。',export:'导出分析 JSON',return:'在事件处查看 Unit',event:'原始事件',selected:'所选 Unit',mean:'平均响应（Hz）',raster:'试次栅格（分箱 spike 数）',group:'响应分组',excluded:'已排除',invalid:'请填写以逗号分隔的整数 Unit ID。',readError:'无法读取事件：',done:'已计算',trials:'个事件',bins:'个分箱',note:'当前预览单独导出分析结果，项目包尚不恢复分析结果。'},
    es:{title:'Respuestas a eventos',intro:'Alinea los spikes al inicio de los eventos y compara los perfiles.',source:'Origen',experiment:'Eventos experimentales',annotation:'Anotaciones de vídeo',type:'Tipo / etiqueta',units:'IDs de Unit separados por comas',useSelected:'Usar Unit seleccionado',useAll:'Usar todos los Units',coverage:'Intervalos válidos de registro neural (segundos, JSON)',coverageHelp:'Deja vacío para usar los intervalos del archivo. Para introducirlos usa [[inicio,fin], …] en segundos neuronales.',start:'Inicio (s)',end:'Fin (s)',bin:'Ancho de intervalo (s)',k:'Grupos (0 = solo respuesta)',normalization:'Características',shape:'Z-score dentro de cada Unit',rate:'Tasa sin escalar (Hz)',seed:'Semilla',active:'Solo bloque experimental activo',run:'Calcular respuestas',cancel:'Cancelar cálculo',close:'Volver a señales',ready:'Elige eventos y Units e introduce la cobertura válida.',loading:'Leyendo eventos…',computing:'Calculando en un worker separado…',cancelled:'Cálculo cancelado. Los datos originales no cambiaron.',empty:'No hay eventos. Elige un tipo o guarda una anotación con nombre.',unavailable:'Abre primero un Recording local con arrays de spikes. El servicio indexado aún no admite este análisis.',coverageNote:'Cobertura declarada por el usuario, sin verificar. Se excluyen ventanas incompletas.',limit:'Los grupos se basan en las respuestas seleccionadas.',stale:'Las entradas cambiaron. Vuelve a calcular antes de exportar.',export:'Exportar análisis JSON',return:'Ver Unit en el evento',event:'Evento original',selected:'Unit seleccionado',mean:'Respuesta media (Hz)',raster:'Raster de ensayos (recuento por intervalo)',group:'Grupo de respuesta',excluded:'Excluidos',invalid:'Introduce IDs enteros separados por comas.',readError:'No se pueden leer eventos: ',done:'Calculado',trials:'eventos',bins:'intervalos',note:'Esta vista exporta por separado. El paquete de proyecto aún no restaura los resultados.'}
  };
  const EXTRA={
    en:{save:'Save analysis in project',saved:'Analysis saved. Export the project package to retain a portable copy.',restored:'Restored saved analysis; source content verified.',checking:'Checking source content…',sourceCoverage:'Use source observation intervals',sourceCoverageNote:'Uses the overlap of the selected Units’ NWB observation intervals.',note:'Save analysis in project to restore the latest saved result for this Recording. Project export includes its counts, rates and provenance.',saveUnavailable:'Create or open a browser project before saving analysis.',restoreFailed:'Saved analysis was not restored: '},
    'zh-CN':{save:'将分析保存到项目',saved:'分析已保存。导出项目包可保留可迁移副本。',restored:'已恢复分析，来源内容核对通过。',checking:'正在核对来源内容…',sourceCoverage:'使用来源观测区间',sourceCoverageNote:'采用所选 Unit 的 NWB 观测区间交集。',note:'保存到项目后，可恢复此 Recording 最近一次保存的分析；项目导出包含计数、发放率与来源信息。',saveUnavailable:'请先创建或打开浏览器项目再保存分析。',restoreFailed:'未恢复已保存分析：'},
    es:{save:'Guardar análisis en el proyecto',saved:'Análisis guardado. Exporta el proyecto para conservar una copia portátil.',restored:'Análisis restaurado; contenido de origen verificado.',checking:'Verificando contenido de origen…',sourceCoverage:'Usar intervalos de observación de origen',sourceCoverageNote:'Se usa la intersección de los intervalos de observación NWB de las unidades seleccionadas.',note:'Guarda el análisis para restaurar el último resultado de este Recording. El proyecto exportado incluye recuentos, tasas y procedencia.',saveUnavailable:'Crea o abre un proyecto de navegador antes de guardar.',restoreFailed:'No se restauró el análisis guardado: '}
  };
  for(const [language,extra]of Object.entries(EXTRA))Object.assign(COPY[language],extra);
  const POPULATION_COPY={
    en:{population:'Population and response groups',allGroups:'All Units',ungrouped:'Ungrouped Units',members:'Group members',groupMean:'Equal-Unit mean response (Hz)',heatmap:'Within-Unit z-score heatmap',heatmapNote:'Display only: z-score across response bins, not a baseline change. Colors clip at ±3. Pixel blocks average adjacent Units/bins when needed; use the member list to select an exact Unit.',stability:'Check trial split-half sensitivity',repeats:'Number of splits',stabilityTitle:'Split-half sensitivity at fixed cluster count',stabilityNote:'ARI measures agreement between the two trial halves, allowing group numbers to change. Each split draws from the same events.',subject:'Annotation subject',track:'Annotation track',all:'All',showUnit:'Show Unit without changing time',stabilityNotRun:'Not requested',splits:'successful splits'},
    'zh-CN':{population:'群体与响应分组',allGroups:'全部 Unit',ungrouped:'未分组 Unit',members:'组内成员',groupMean:'各 Unit 等权平均响应（Hz）',heatmap:'Unit 内 z-score 热图',heatmapNote:'仅用于显示：沿响应时间 bins 计算 z-score，不是相对基线的变化。颜色截断于 ±3；像素不足时平均相邻 Unit / bins。请通过成员列表精确选择 Unit。',stability:'检查试次对半敏感性',repeats:'划分次数',stabilityTitle:'固定聚类数的对半敏感性',stabilityNote:'ARI 衡量两半试次的分组一致性，允许组号变化。各次划分使用同一批事件。',subject:'标注主体',track:'标注轨道',all:'全部',showUnit:'查看 Unit，保持时间不变',stabilityNotRun:'未请求',splits:'次有效划分'},
    es:{population:'Población y grupos de respuesta',allGroups:'Todos los Units',ungrouped:'Units sin grupo',members:'Miembros',groupMean:'Media con igual peso por Unit (Hz)',heatmap:'Mapa z-score dentro de cada Unit',heatmapNote:'Solo visualización: z-score entre intervalos, no cambio respecto a una línea base. Colores limitados a ±3. Los bloques promedian Units/intervalos adyacentes; elige el Unit exacto en la lista.',stability:'Comprobar sensibilidad entre mitades',repeats:'Número de divisiones',stabilityTitle:'Sensibilidad entre mitades con k fijo',stabilityNote:'ARI mide el acuerdo entre mitades permitiendo cambios en el número del grupo. Cada división usa los mismos eventos.',subject:'Sujeto de anotación',track:'Pista de anotación',all:'Todos',showUnit:'Ver Unit sin cambiar el tiempo',stabilityNotRun:'No solicitado',splits:'divisiones válidas'}
  };
  for(const [language,extra]of Object.entries(POPULATION_COPY))Object.assign(COPY[language],extra);
  COPY.en.invalidTimes='This NWB contains invalid_times metadata. Its scope has not been applied to events, spikes or observation coverage. Probe, stimulus and other tags are not interchangeable. Review the original validity information before interpreting these responses. Metadata and limitations are retained in analysis provenance.';
  COPY['zh-CN'].invalidTimes='此 NWB 包含 invalid_times 元数据，其作用范围尚未应用到事件、spike 或观察覆盖区间。探针、刺激及其他标签不能混用。解释响应前，请检查原始有效性信息。分析来源会保留该元数据和限制。';
  COPY.es.invalidTimes='Este NWB contiene metadatos invalid_times. Su ámbito no se ha aplicado a eventos, spikes ni cobertura. Las etiquetas de sonda, estímulo y otros ámbitos no son intercambiables. Revisa la validez original antes de interpretar las respuestas. Los metadatos y límites se conservan en la procedencia.';
  COPY.en.annotationHelp='Save a named manual annotation to use it directly. Unconfirmed model candidates stay separate. Responses align to the start; the interval end is retained, not used as the alignment point.';
  COPY['zh-CN'].annotationHelp='手动标注命名并保存后即可直接使用，无需重复确认。未确认的模型候选仍保持待确认。响应按起点对齐，保留终点但不按终点对齐。';
  COPY.es.annotationHelp='Guarda una anotación manual con nombre para usarla directamente. Los candidatos sin confirmar se mantienen separados. La respuesta se alinea al inicio; se conserva el final sin usarlo para la alineación.';
  COPY.en.annotationAssetNote='Annotation rows in the event file are not experimental events. Load their annotation document with the video and choose Video annotations to use the current labels and time mapping.';
  COPY['zh-CN'].annotationAssetNote='事件文件中的标注行不是实验事件。请加载对应视频和标注文档，再选择“视频标注”，使用当前标签与时间映射。';
  COPY.es.annotationAssetNote='Las filas de anotación del archivo no son eventos experimentales. Carga su documento con el vídeo y elige Anotaciones de vídeo para usar las etiquetas y la sincronización actuales.';
  COPY.en.metadataLimit='Source event or observation metadata could not be fully read. Current manual annotations can still be used; missing validity information remains unresolved and is saved with the analysis.';
  COPY['zh-CN'].metadataLimit='来源事件或观测元数据未能完整读取。当前手动标注仍可使用；缺失的有效性信息仍未解决，并随分析保存。';
  COPY.es.metadataLimit='No se pudieron leer todos los metadatos de eventos u observación. Las anotaciones manuales actuales siguen disponibles; la información de validez pendiente se conserva en el análisis.';
  const COVERAGE_COPY={
    en:{coverage:'Observation intervals (optional JSON)',coverageHelp:'Leave blank to use source observation intervals. For manual entry use [[start,end], …] in neural seconds.',ready:'Choose events, Units and a response window. Source observation intervals are used when available.',unknownCoverage:'Coverage unknown. Rates assume continuous observation within each response window.',partialCoverage:'Known source observation intervals are applied, including gaps. Coverage is missing for some selected Units, whose continuous observation remains an assumption.',annotationHelp:'Alignment uses the start of each named interval. Accept model candidates before including them.',invalidCoverage:'Invalid source intervals. Correct the file or enter intervals manually.'},
    'zh-CN':{coverage:'观测区间（可选 JSON）',coverageHelp:'留空采用文件中的观测区间。手动输入格式为 [[起点,终点], …]，单位为神经时间秒。',ready:'选择事件、Unit 和响应窗口。有来源观测区间时自动采用。',unknownCoverage:'观测范围未知，按每个响应窗内连续观测计算 Hz。',partialCoverage:'已应用来源已知的观测区间和间断；部分所选 Unit 缺少覆盖资料，其连续观测仍是假设。',annotationHelp:'按每个标签区间的起点对齐。模型候选经接受后纳入。',invalidCoverage:'来源观测区间格式有误，请修正文件或手动填写区间。'},
    es:{coverage:'Intervalos de observación (JSON opcional)',coverageHelp:'Deja vacío para usar los intervalos del archivo. Para introducirlos usa [[inicio,fin], …] en segundos neuronales.',ready:'Elige eventos, Units y ventana. Se usan los intervalos de origen cuando están disponibles.',unknownCoverage:'Cobertura desconocida. Las tasas suponen observación continua en cada ventana.',partialCoverage:'Se aplican intervalos y huecos conocidos del origen. Algunos Units no tienen cobertura documentada y su observación continua sigue siendo una suposición.',annotationHelp:'Se alinea al inicio de cada intervalo etiquetado. Acepta los candidatos del modelo para incluirlos.',invalidCoverage:'Revisa los intervalos de origen o introduce intervalos manuales.'}
  };
  for(const [language,extra]of Object.entries(COVERAGE_COPY))Object.assign(COPY[language],extra);
  const parameterHelp={
    en:{
      coverage:'Times when spikes could be recorded. An event is used if its whole response window fits inside one interval. Leave blank to use the file’s intervals, or enter [[start,end], …] in neural seconds. If the file has none, the window is treated as continuously observed.',
      start:'Where counting starts relative to each event’s onset (0 s). For example, −0.5 starts half a second before the event.',
      end:'Where counting stops relative to each event’s onset. With an end of 1 s, spikes are counted up to, but excluding, 1 second after onset.',
      bin:'Length of each time bin. For example, 0.05 s counts spikes every 50 ms and converts the trial average to Hz. Smaller bins show faster changes. Choose a width that divides the window evenly.',
      k:'How many groups to form from the Units’ response curves. For example, 3 looks for three response profiles. Set 0 to calculate firing rates only.',
      normalization:'Within-Unit z-score compares when each Unit’s rate rises or falls, after scaling its curve. Unscaled Hz also retains differences in firing rate between Units.',
      seed:'Sets the starting point for clustering and the random trial splits. Use the same seed with the same data and settings to repeat the grouping.',
      active:'Include only events with the recorded condition active = true. Leave this off to include all blocks.',
      stability:'Repeatedly split trials in half and check which Units stay together. With a condition comparison, this uses the reference trials.',
      repeats:'Random splits of the same trials (1–1000, default 50). The feasible count depends on the number of Units, events, groups and time bins.',
      subject:'Choose the subject whose video annotations supply the events. All includes every subject.',
      track:'Choose the annotation track that supplies the events. All includes every track.'
    },
    'zh-CN':{
      coverage:'填写能记录到 spike 的时段。只有整个响应窗口落在同一时段内的事件才纳入。留空时采用文件中的区间；也可按神经时间（秒）输入 [[起点,终点], …]。文件未提供区间时，按窗口内连续观测计算。',
      start:'从每次事件发生的哪个时刻开始统计 spike。事件起点是 0 秒，例如 −0.5 表示从事件前半秒开始。',
      end:'统计 spike 到相对事件起点的哪个时刻为止。例如填 1，统计到事件后 1 秒，恰好落在终点的 spike 除外。',
      bin:'把响应窗口切成等长的小段。例如 0.05 秒表示每 50 毫秒数一次 spike，再将各次事件的平均计数换算成 Hz。分箱越窄，能看的变化越快。分箱宽度需能整除窗口长度。',
      k:'把 Unit 的放电率曲线分成几组。例如填 3，会寻找三组相似的响应曲线；填 0 只计算放电率。',
      normalization:'选「Unit 内 z-score」会先把每个 Unit 的曲线标准化，再比较放电率何时升降。选「原始发放率（Hz）」还会保留 Unit 之间放电强弱的差异。',
      seed:'决定聚类从哪个 Unit 开始，以及试次怎样随机分半。同一数据和参数使用相同种子，可重现同一分组。',
      active:'仅纳入记录中条件 active = true 的事件。关闭时使用全部区块。',
      stability:'反复将试次分成两半，检查哪些 Unit 在两半中仍分在一起。比较两组条件时，使用参照组的试次。',
      repeats:'对同一批试次随机分半的次数，默认 50，可填 1–1000 的整数。能运行的次数取决于 Unit 数、事件数、分组数和分箱数。',
      subject:'选择使用哪个标注主体的视频事件。「全部」包含所有主体。',
      track:'选择从哪条视频标注轨道读取事件。「全部」包含所有轨道。'
    },
    es:{
      coverage:'Intervalos en que se podían registrar spikes. Se incluye un evento si toda su ventana cabe en un intervalo. Deja el campo vacío para usar los intervalos del archivo o introduce [[inicio,fin], …] en segundos neuronales. Sin intervalos se supone una observación continua en la ventana.',
      start:'Cuándo comenzar a contar spikes respecto al inicio de cada evento (0 s). Por ejemplo, −0,5 empieza medio segundo antes.',
      end:'Cuándo terminar el recuento respecto al inicio del evento. Con un valor de 1 s se cuentan los spikes hasta un segundo después del inicio, excluido el extremo final.',
      bin:'Duración de cada intervalo. Con 0,05 s se cuentan spikes cada 50 ms y se convierte la media de los ensayos a Hz. Los intervalos más cortos muestran cambios más rápidos. La ventana debe contener un número entero de intervalos.',
      k:'Número de grupos que se formarán con las curvas de respuesta de las unidades. Por ejemplo, 3 busca tres perfiles. Usa 0 para calcular solo las tasas de disparo.',
      normalization:'El z-score por unidad estandariza cada curva para comparar cuándo sube o baja la tasa. La tasa en Hz sin escalar también conserva las diferencias de intensidad entre unidades.',
      seed:'Fija el punto de partida de la agrupación y las divisiones aleatorias de los ensayos. La misma semilla, con los mismos datos y ajustes, reproduce la agrupación.',
      active:'Incluye solo los eventos con la condición active = true. Déjalo desactivado para usar todos los bloques.',
      stability:'Divide los ensayos al azar y comprueba qué unidades siguen juntas en ambas mitades. Al comparar condiciones usa los ensayos de referencia.',
      repeats:'Divisiones aleatorias de los mismos ensayos (1–1000, inicialmente 50). El máximo viable depende del número de unidades, eventos, grupos e intervalos.',
      subject:'Elige el sujeto cuyas anotaciones de vídeo aportan los eventos. Todos incluye a todos los sujetos.',
      track:'Elige de qué pista de anotación se extraen los eventos. Todas incluye todas las pistas.'
    }
  };
  const ruleText={
    en:{rule:'Match two labels (Hit / Miss)',responseLabel:'Response label',pickResponse:'Choose a response label',missingResponse:'Add a second event label or align labelled video.',ruleStart:'Label window start (s)',ruleEnd:'Label window end (s)',repeat:'Exclude trials with another onset of the same label',marker:'◆ Another onset of the same label',onlyRepeats:'Every trial contains another onset. Keep overlapping trials or shorten the response window.',labelEdge:'The label matching window falls outside the available recording. Shorten it or choose another event.',badLabelWindow:'Set the end of the label window later than the start.',ruleKey:'Matched labels'},
    'zh-CN':{rule:'用两个标签判定命中 / 漏报',responseLabel:'响应标签',pickResponse:'选择响应标签',missingResponse:'请导入第二个事件标签，或对齐带标注的视频。',ruleStart:'标签匹配窗口起点（秒）',ruleEnd:'标签匹配窗口终点（秒）',repeat:'排除窗口内再次出现同一标签的试次',marker:'◆ 同一标签的其他起点',onlyRepeats:'每个试次窗口中都出现了同一标签的其他起点。可缩短响应窗口，或保留重叠试次。',labelEdge:'标签匹配窗口超出可用记录时间。请缩短窗口或选择其他事件。',badLabelWindow:'标签匹配窗口的终点应晚于起点。',ruleKey:'双标签匹配'},
    es:{rule:'Cruzar dos etiquetas (acierto / fallo)',responseLabel:'Etiqueta de respuesta',pickResponse:'Elige una etiqueta de respuesta',missingResponse:'Añade otra etiqueta de evento o alinea el vídeo etiquetado.',ruleStart:'Inicio de coincidencia (s)',ruleEnd:'Fin de coincidencia (s)',repeat:'Excluir ensayos con otro inicio de la misma etiqueta',marker:'◆ Otro inicio de la misma etiqueta',onlyRepeats:'Todos los ensayos tienen otro inicio. Conserva los ensayos solapados o acorta la ventana.',labelEdge:'La ventana de coincidencia queda fuera del registro. Acórtala o selecciona otro evento.',badLabelWindow:'El fin debe ser posterior al inicio.',ruleKey:'Cruce de etiquetas'}
  };
  const ruleHelp={
    en:['Time relative to the selected event onset. A response starting exactly here counts as a Hit.','A response must start before this time. Trials without a matching onset are labelled Miss.','Checks every occurrence of the selected label, including events outside the chosen trial range. Kept onsets appear above each spike row.'],
    'zh-CN':['以所选事件起点为 0 秒。响应标签在这个时刻开始也算命中。','响应标签须在终点之前开始。匹配窗口内有响应记为命中，没有记为漏报。','检查该试次响应窗口内是否还有同一标签的起点，包括筛选时段之外的事件。保留时，逐次 spike 图会标出这些起点。'],
    es:['Tiempo desde el inicio del evento. Una respuesta que empiece justo aquí cuenta como acierto.','La respuesta debe empezar antes del fin. Sin un inicio coincidente, el ensayo se marca como fallo.','Comprueba todos los inicios de la etiqueta. Los inicios conservados se muestran sobre cada fila de spikes.']
  };
  for(const [lang,labels] of Object.entries(ruleText)){
    Object.assign(COPY[lang],labels,{
      savedOutcome:{en:'Saved trial-table outcome','zh-CN':'历史结果 · 原试次表条件',es:'Resultado guardado de la tabla de ensayos'}[lang],
      savedOutcomeNote:{en:'Viewing saved trial-table outcomes. Choose a response label before running again.','zh-CN':'当前显示历史试次表结果。重新运行前，请选择用于匹配的响应标签。',es:'Se muestran los resultados guardados de la tabla. Elige una etiqueta de respuesta antes de volver a ejecutar.'}[lang]
    });
    ['ruleStart','ruleEnd','repeat'].forEach((key,i)=>parameterHelp[lang][key]=ruleHelp[lang][i]);
  }
  const ruleWindowKey='neuropixels.eventResponse.labelWindow';
  function readRuleWindow(){
    try{
      const w=JSON.parse(localStorage.getItem(ruleWindowKey));
      if(Array.isArray(w)&&w.length===2&&w.every(Number.isFinite)&&w[1]>w[0])return w;
    }catch{}
    return [.15,.75];
  }
  const timeScales={fast:[-.1,.4,.005],behavior:[-2,3,.05],slow:[-120,120,1]};
  Object.assign(COPY.en,{scale:'Time scale',autoScale:'Automatic',fast:'Fast response · 5 ms bins',behavior:'Behavior · 50 ms bins',slow:'Slow changes · 1 s bins',custom:'Custom',binLimit:'bins available',splitCap:'estimated split limit',fitWidth:'Choose a bin width that divides the window evenly.',useBins:'Use wider bins or fewer Units or events.'});
  Object.assign(COPY['zh-CN'],{scale:'时间尺度',autoScale:'自动',fast:'快速响应 · 5 ms 分箱',behavior:'秒级行为 · 50 ms 分箱',slow:'分钟级变化 · 1 s 分箱',custom:'自定义',binLimit:'个可用分箱',splitCap:'预计最多可分半次数',fitWidth:'窗口长度必须是分箱宽度的整数倍。',useBins:'可加宽分箱，或减少 Unit 或事件数量。'});
  Object.assign(COPY.es,{scale:'Escala temporal',autoScale:'Automática',fast:'Respuesta rápida · 5 ms',behavior:'Conducta · 50 ms',slow:'Cambios lentos · 1 s',custom:'Personalizada',binLimit:'intervalos disponibles',splitCap:'límite estimado de divisiones',fitWidth:'Elige un ancho que divida la ventana en intervalos completos.',useBins:'Usa intervalos más anchos o selecciona menos unidades o eventos.'});
  parameterHelp.en.scale='Sets the start, end and bin width together. You can edit any value, or return to Automatic to fit the available events.';
  parameterHelp['zh-CN'].scale='同时设置事件前后的时间窗和分箱宽度。可以继续手改，也可以选择自动，按当前事件的观测区间设置。';
  parameterHelp.es.scale='Ajusta inicio, fin y ancho del intervalo. Puedes editar cada valor o elegir Automática para adaptarlos a los eventos disponibles.';
  Object.assign(COPY.en,{compareField:'Compare trials by',pooled:'All trials together',reference:'Reference group',contrast:'Comparison group',pickValue:'Choose a value',pickPair:'Choose two different values to compare.'});
  Object.assign(COPY['zh-CN'],{compareField:'按条件比较',pooled:'合并全部试次',reference:'参照组',contrast:'对照组',pickValue:'选择条件值',pickPair:'请选择两个不同的条件值。'});
  Object.assign(COPY.es,{compareField:'Comparar ensayos por',pooled:'Todos los ensayos juntos',reference:'Grupo de referencia',contrast:'Grupo de comparación',pickValue:'Elige un valor',pickPair:'Elige dos valores distintos para comparar.'});
  Object.assign(COPY.en,{rerun:'Run again',readingSpikes:'Reading spike timestamps',splitCheck:'Checking split-half consistency'});
  Object.assign(COPY['zh-CN'],{rerun:'重新运行',readingSpikes:'正在读取原始 spike 时刻',splitCheck:'正在比较两半试次的分组'});
  Object.assign(COPY.es,{rerun:'Volver a ejecutar',readingSpikes:'Leyendo tiempos de spikes',splitCheck:'Comparando los grupos entre mitades'});
  Object.assign(COPY['zh-CN'],{
    settings:'分析设置',entryTip:'按事件对齐各次放电，按响应曲线给 Unit 分组，并查看逐次 spike。',
    settingsTip:'更改事件来源、参照条件、Unit、时间窗和聚类参数。',runTip:'按当前设置从原始 spike 计算响应，展示对齐、分箱和分组过程。',
    cancelTip:'停止本次计算。用相同设置重跑时，可回到上次结果。',closeTip:'关闭事件响应，回到原始信号。',
    annotationTip:'使用视频中已命名的行为标注作为事件。',experimentTip:'使用录制文件中的换图、舔舐等事件。',
    selectedTip:'用主视图目前选中的 Unit 替换列表。',allTip:'把本条记录的全部 Unit 填入列表。',
    coverageTip:'从所选 Unit 的来源文件读取共同观测区间并填入。',saveTip:'在项目中保存这条记录的分析，再次打开时可恢复。',
    exportTip:'下载含计数、放电率、分组和来源参数的 JSON 文件。',unitTip:'在主视图定位所选 Unit，保留当前时间。',
    returnTip:'跳到该事件的原始记录时刻，并定位覆盖该时刻的视频。'
  });
  Object.assign(COPY.en,{
    settings:'Analysis settings',entryTip:'Align spikes to events, group Units by response and inspect each trial.',
    settingsTip:'Choose events, a reference condition, Units, time windows and clustering parameters.',runTip:'Compute responses from the original spikes and show how events, rates and groups are derived.',
    cancelTip:'Stop this calculation. A repeat run can return to the previous result for the same settings.',closeTip:'Close event responses and return to the original signals.',
    annotationTip:'Use named behavior annotations from the video as events.',experimentTip:'Use events in the recording such as image changes or licks.',
    selectedTip:'Replace the list with the Unit selected in the main view.',allTip:'Fill the list with all Units in this recording.',
    coverageTip:'Fill in the observation intervals shared by the selected Units from the source file.',saveTip:'Store the analysis for this recording in the project so it can be reopened.',
    exportTip:'Download counts, firing rates, groups and source parameters as JSON.',unitTip:'Go to the selected Unit in the main view and keep the current time.',
    returnTip:'Go to this event in the original recording and seek the video when it covers that time.'
  });
  Object.assign(COPY.es,{
    settings:'Ajustes del análisis',entryTip:'Alinea los spikes con eventos, agrupa unidades por respuesta y revisa cada ensayo.',
    settingsTip:'Elige eventos, condición de referencia, unidades, ventana temporal y parámetros de agrupación.',runTip:'Calcula las respuestas desde los spikes originales y muestra la alineación, las frecuencias y los grupos.',
    cancelTip:'Detén el cálculo. Si repites con los mismos ajustes puedes recuperar el resultado anterior.',closeTip:'Cierra las respuestas y vuelve a las señales originales.',
    annotationTip:'Usa los comportamientos con nombre del vídeo como eventos.',experimentTip:'Usa los eventos del registro, como cambios de imagen o lamidos.',
    selectedTip:'Sustituye la lista por la unidad elegida en la vista principal.',allTip:'Rellena la lista con todas las unidades del registro.',
    coverageTip:'Carga del archivo los intervalos de observación compartidos por las unidades.',saveTip:'Guarda el análisis de este registro en el proyecto para volver a abrirlo.',
    exportTip:'Descarga recuentos, frecuencias, grupos y parámetros de origen en JSON.',unitTip:'Ve a la unidad elegida en la vista principal conservando el tiempo.',
    returnTip:'Ve al instante original del evento y al vídeo si cubre ese instante.'
  });
  const selectionWords={
    en:['Event-response clustering','Align spikes to the selected label and group Units by their firing-rate profiles.','Unit selection','Highlighted in signals','All Units','Brain region','Probe selection','Enter Unit IDs','Choose a valid depth range','From depth','To depth','Use depth range','Event times','Whole recording','Signal selection','Advanced settings','Group responses','Select fewer Units (maximum 4096).','No Units in this selection.','Groups'],
    'zh-CN':['事件放电聚类','将放电对齐到当前标签的起点，按响应曲线给 Unit 分组。','分析哪些 Unit','信号区已高亮','全部 Unit','脑区','在 Probe 图上选择','手动输入 Unit ID','请选择有效的深度范围','最小深度','最大深度','应用深度范围','事件时间范围','整条记录','信号选区','高级参数','计算放电分组','请缩小选择范围（最多 4096 个 Unit）。','所选范围没有 Unit。','响应分组'],
    es:['Grupos de respuesta a eventos','Alinea los spikes con la etiqueta seleccionada y agrupa las unidades por su respuesta.','Unidades para analizar','Resaltadas en la señal','Todas las unidades','Región cerebral','Seleccionar en la sonda','Introducir IDs','Elige un intervalo de profundidad válido','Profundidad mínima','Profundidad máxima','Aplicar profundidad','Tiempo de eventos','Todo el registro','Selección en la señal','Parámetros avanzados','Agrupar respuestas','Selecciona menos unidades (máximo 4096).','La selección no contiene unidades.','Grupos']
  };
  for(const [lang,words] of Object.entries(selectionWords)){
    ['title','intro','unitChoice','highlighted','allUnits','region','probe','manual','brush','fromDepth','toDepth','useDepth','timeScope','whole','signalRange','settings','run','tooMany','noUnits','groups'].forEach((key,i)=>COPY[lang][key]=words[i]);
  }
  Object.assign(COPY.en,{spikes:'Select Units in spike view',commitUnits:'Save selected Units',savedUnits:'Units for analysis',removeUnit:'Remove',noPositions:'No probe coordinates. Select Units in spike view.'});
  Object.assign(COPY['zh-CN'],{spikes:'从 spike 视图选择 Unit',commitUnits:'保存选中 Unit',savedUnits:'本次分析的 Unit',removeUnit:'移除',noPositions:'此 Probe 缺少位置坐标，可从 spike 视图选择 Unit。'});
  Object.assign(COPY.es,{spikes:'Elegir unidades en la vista de spikes',commitUnits:'Guardar unidades seleccionadas',savedUnits:'Unidades del análisis',removeUnit:'Quitar',noPositions:'Sin coordenadas. Elige las unidades en la vista de spikes.'});
  Object.assign(COPY.en,{eventOrigin:'0 s = onset of {event}',bothSides:'Negative times are before onset, positive times after.',afterOnset:'This window is after onset.',beforeOnset:'This window is before onset.',recordingTime:'Recording time'});
  Object.assign(COPY['zh-CN'],{eventOrigin:'0 s =「{event}」开始',bothSides:'负值为事件前，正值为事件后。',afterOnset:'当前窗口在事件开始之后。',beforeOnset:'当前窗口在事件开始之前。',recordingTime:'原始记录时间'});
  Object.assign(COPY.es,{eventOrigin:'0 s = inicio de «{event}»',bothSides:'Los tiempos negativos preceden al evento y los positivos son posteriores.',afterOnset:'La ventana es posterior al inicio.',beforeOnset:'La ventana es anterior al inicio.',recordingTime:'Tiempo del registro'});
  Object.assign(COPY.en,{title:'Event responses',intro:'Choose events, Units and a time window, then run the analysis.',run:'Run analysis',filters:'Analysis settings · Units and time',timeScope:'Include events from',rangeChoice:'Custom recording interval',rangeStart:'Recording start (s)',rangeEnd:'Recording end (s)',badRange:'Enter a recording interval with 0 ≤ start < end.',responseWindow:'Response window relative to event onset (0 s)',pending:'Settings changed. Run again to update the displayed result.',pickEvent:'Choose an event',grouping:'Grouping response shapes…',noShapes:'The selected Units have no varying response shapes to group.'});
  Object.assign(COPY['zh-CN'],{title:'事件放电',intro:'选择事件、Unit 和时间窗口，再运行分析。',run:'运行分析',filters:'分析设置 · Unit 与时间范围',timeScope:'从记录的哪一段选取事件',rangeChoice:'自定义记录时段',rangeStart:'记录起点（秒）',rangeEnd:'记录终点（秒）',badRange:'请输入有效记录时段，起点须 ≥ 0 且小于终点。',responseWindow:'响应时间窗（以事件起点为 0 秒）',pending:'设置已修改，重新运行后更新下方结果。',pickEvent:'选择事件',grouping:'正在按响应形状分组…',noShapes:'所选 Unit 的响应曲线均为常数，无法按形状分组。'});
  Object.assign(COPY.es,{title:'Respuestas a eventos',intro:'Elige los eventos, las unidades y la ventana temporal y ejecuta el análisis.',run:'Ejecutar análisis',filters:'Ajustes del análisis · Unidades y tiempo',timeScope:'Intervalo del registro para los eventos',rangeChoice:'Intervalo personalizado',rangeStart:'Inicio del registro (s)',rangeEnd:'Fin del registro (s)',badRange:'Introduce un intervalo de registro con 0 ≤ inicio < fin.',responseWindow:'Ventana de respuesta respecto al inicio del evento (0 s)',pending:'Se han cambiado los ajustes. Vuelve a ejecutar el análisis para actualizar el resultado.',pickEvent:'Elegir evento',grouping:'Agrupando respuestas por forma…',noShapes:'Las respuestas seleccionadas son constantes y no se pueden agrupar por forma.'});
  class EventAnalysisUI {
    constructor(options) {
      Object.assign(this,options);this.responseTrains=new WeakMap();this.epoch=0;this.recordingKey=null;
      this.dialog=this.workspaceTab?.panel || document.createElement('dialog');
      this.dialog.className='event-analysis-dialog';
      if(!this.workspaceTab){this.dialog.id='event-analysis-dialog';document.body.append(this.dialog);}
      if(!this.workspaceTab)this.button.onclick=()=>this.open();
      this.dialog.addEventListener('close',()=>{if(!this.panelOpen){this.review?.stop();this.cancel(false);}});
      this.dialog.addEventListener('cancel',()=>this.cancel(false));
      this.dialog.addEventListener('ea-process-unit',e=>this.review?.revealUnit(e.detail.unitId));
      this.dialog.addEventListener('invalid',e=>{for(let d=e.target.closest('details');d;d=d.parentElement.closest('details'))d.open=true;},true);
      this.dialog.addEventListener('click',e=>{
        const source=e.target.closest('button[data-ea-label-source]')?.dataset.eaLabelSource;
        if(source && source!==this.input('source').value){
          this.input('source').value=source;
          this.input('source').dispatchEvent(new Event('change',{bubbles:true}));
        }
        this.action(e.target.closest('[data-ea-action]')?.dataset.eaAction);
      });
      this.dialog.addEventListener('change',e=>{
        if(e.target.closest?.('[data-ea-process],[data-ea-probe-select],[data-ea-source-probe],.event-figures'))return;
        if(this.review&&e.target.closest?.('[data-ea-cluster-review]')){this.review.change(e.target);return;}
        if(e.target.matches?.('[data-ea-unit-choice]')){this.chooseUnits(e.target.value);return;}
        if(e.target.matches?.('[data-ea-depth]'))return;
        if(e.target.name==='timeScale'){
          const values=timeScales[e.target.value];this.editedWindow=e.target.value!=='autoScale';
          if(values)['start','end','binWidth'].forEach((key,i)=>this.input(key).value=values[i]);
          else if(!this.editedWindow)this.chooseWindowDefaults();
        }
        if(e.target.name==='stability')this.syncStabilityField();
        if(e.target.name==='k')this.editedK=true;
        if(e.target.name==='conditionField')this.syncComparisonValues();
        if(['ruleStart','ruleEnd'].includes(e.target.name)){
          const w=['ruleStart','ruleEnd'].map(key=>this.input(key).valueAsNumber);
          if(w.every(Number.isFinite)&&w[1]>w[0]){try{localStorage.setItem(ruleWindowKey,JSON.stringify(w));}catch{}}
        }
        if(['referenceValue','comparisonValue'].includes(e.target.name))this.distinctComparisonValues(e.target);
        if(['start','end','binWidth'].includes(e.target.name)){this.editedWindow=true;this.input('timeScale').value='custom';}
        const eventChoice=['source','subject','track','eventType'].includes(e.target.name);
        if(eventChoice&&(this.ioAbort||this.worker))this.cancel(false);
        if(e.target.name==='timeScope')this.syncRange();
        if(e.target.name==='unitIds')this.invalidateSourceCoverage();
        if(e.target.name==='coverage')this.coverageProof=null;
        if(e.target.name==='eventType' || e.target.name==='source')this.input('activeOnly').checked=false;
        if(['source','subject','track'].includes(e.target.name)){
          if(e.target.name==='source')this.populateFilters();
          this.populateTypes(e.target.name==='source'?null:this.input('eventType').value);
        }
        if(eventChoice){
          if(!this.editedK)this.input('k').value='0';
          if(e.target.name==='eventType'){
            this.syncActiveFilter();this.syncComparison();this.chooseWindowDefaults();
          }
        }else if(['unitIds','activeOnly','timeScope','rangeStart','rangeEnd','conditionField','referenceValue','comparisonValue'].includes(e.target.name))this.chooseWindowDefaults();
        this.syncPlan();
        if(this.result)this.status(this.resultSettings!==this.settingsKey()?this.t('pending'):'');
      });
      this.update();
    }
    t(key){return (COPY[document.documentElement.lang]||COPY.en)[key]||COPY.en[key]||key;}
    originCaption({eventType,start,end}){
      return this.onsetLabel(eventType)+' · '+this.t(start>0?'afterOnset':end<0?'beforeOnset':'bothSides');
    }
    onsetLabel(eventType){return this.t('eventOrigin').replace('{event}',()=>eventType||this.t('event'));}
    get panelOpen(){return this.workspaceTab ? this.dialog.isConnected : this.dialog.open;}
    showPanel(){if(this.workspaceTab)this.workspaceTab.activate();else this.dialog.showModal();}
    backToSignals(){if(this.workspaceTab)this.workspaceTab.signals();else this.dialog.close();}
    identity(){const r=this.state.activeRecording;return r?`${this.state.datasetToken}:${r.key}:${r.dataVersion||0}`:null;}
    signature(){return JSON.stringify({identity:this.identity(),annotation:this.annotations.doc,mapping:this.video.mapping?.toJSON?.()});}
    update(){
      const key=this.identity();if(key!==this.recordingKey){this.cancel(false);this.suspended=null;this.onDiscardSource?.();this.result=null;this.recordingKey=key;if(!this.workspaceTab && this.panelOpen)this.dialog.close();}
      if(this.workspaceTab)return;this.button.textContent=this.t('title');this.button.title=this.t('entryTip');this.button.disabled=!key;
    }
    input(name){return this.dialog.querySelector(`[name="${name}"]`);}
    unitName(id){const u=this.state.activeRecording?.jointUnits?.get(id);return u?u.probeName+' · Unit '+u.unitId:'Unit '+id;}
    settingsKey(){
      const fields=this.dialog.querySelector('form')?.elements;
      return fields?JSON.stringify(Array.from(fields).filter(f=>f.name).map(f=>[f.name,f.type==='checkbox'?f.checked:f.value])):null;
    }
    clearResult(){
      this.figures?.destroy();this.figures=null;
      this.review?.stop();this.review=null;
      this.process?.destroy();this.process=null;
      this.result=null;this.resultPanel?.replaceChildren();
      const run=this.dialog.querySelector('[data-ea-run]');if(run)run.textContent=this.t('run');
    }
    status(text,error=false){const node=this.dialog.querySelector('[data-ea-status]');if(node){node.textContent=text;node.dataset.error=String(error);}}
    async open(){
      this.dispose();this.update();this.traceLog=[];const r=this.state.activeRecording;
      if(r?.missingInputs?.length){this.toast(this.t('unavailable')+' · '+r.missingInputs.join(', '));return;}
      if(!r?.spikeTimesFile||!r?.spikeClustersFile){this.toast(this.t('unavailable'));return;}
      this.suspended=null;this.onDiscardSource?.();this.editedK=false;this.editedWindow=false;
      this.cancel(false);this.clearResult();this.events=null;this.coverage=null;this.coverageProof=null;this.sourceError=null;this.coverageError=null;
      const help=(key)=>{
        const copy=parameterHelp[document.documentElement.lang]||parameterHelp.en;
        const topic=this.t(key);
        const name=window.neuropixelsLanguageController?.t('help.tipAria',{topic})||topic;
        return `<button type="button" class="context-help" aria-label="${esc(name)}" title="${esc(copy[key])}">?</button>`;
      };
      const field=(name,key,control,wide=false)=>{
        const id=`${this.dialog.id}-${name}`;
        return `<div class="ea-parameter${wide?' event-wide':''}"><div class="ea-parameter-caption"><label for="${id}">${esc(this.t(key))}</label>${help(key)}</div>${control(`id="${id}" name="${name}"`)}</div>`;
      };
      const numeric=(name,key,value,limits='step="any"')=>field(name,key,attrs=>`<input ${attrs} type="number" ${limits} value="${value}" required>`);
      const filter=key=>field(key,key,attrs=>`<select ${attrs}><option value="">${esc(this.t('all'))}</option></select>`);
      const check=(name,key,checked=false)=>`<div class="ea-parameter-caption ea-check event-wide"><label class="event-check"><input name="${name}" type="checkbox"${checked?' checked':''}><span>${esc(this.t(key))}</span></label>${help(key)}</div>`;
      this.focusAtOpen=null;this.scopeAtOpen=r;
      const units=this.getUnits?.()||[], focused=this.focusedIds();
      this.focusAtOpen=focused.slice();
      const marked=(this.state.experimentView?.selectedInterval?.unitIds||[]).filter(id=>units.some(u=>u.id===id));
      const initial=units.map(u=>u.id);
      const regions=[...new Set(units.map(u=>u.region).filter(Boolean))].sort();
      const interval=this.state.experimentView?.selectedInterval;
      this.eventRange=interval && Number.isFinite(interval.start) && interval.end>interval.start ? [interval.start,interval.end] : null;
      const sources=this.getProbeSources?.()||r.jointSourceRecords||[r];this.probes=sources.length?sources:[r];
      const tip=key=>esc(this.t(key+'Tip'));
      const ruleWindow=readRuleWindow();
      this.dialog.innerHTML=`<header><div><h2>${esc(this.t('title'))}</h2><p>${esc(this.t('intro'))}</p></div><button type="button" data-ea-action="close" title="${tip('close')}">${esc(this.t('close'))}</button></header>
        <form id="${this.dialog.id}-parameters">
        <details data-ea-inputs open><summary title="${tip('settings')}">${esc(this.t('filters'))}</summary><div class="event-analysis-fields">
        <div><span>${esc(this.t('source'))}</span><div class="label-source-switch" role="group" aria-label="${esc(this.t('source'))}">${['annotation','experiment'].map(s=>`<button type="button" data-ea-label-source="${s}" disabled title="${tip(s)}">${esc(this.sourceTitle?.(s)||this.t(s))}</button>`).join('')}</div><select name="source" hidden><option value="experiment"></option><option value="annotation"></option></select></div>
        <label>${esc(this.t('type'))}<select name="eventType" disabled></select></label>
        <label data-ea-reference hidden>${esc(this.t('compareField'))}<select name="conditionField"></select></label>
        <label data-ea-response-label hidden>${esc(this.t('responseLabel'))}<select name="responseLabel"></select></label>
        ${[['referenceValue','reference'],['comparisonValue','contrast']].map(([key,title])=>`<label data-ea-comparison-value hidden>${esc(this.t(title))}<select name="${key}"></select></label>`).join('')}
        <label>${esc(this.t('unitChoice'))}<select data-ea-unit-choice><option value="all">${esc(this.t('allUnits'))}</option>${focused.length?`<option value="selected">${esc(this.t('highlighted'))} (${focused.length})</option>`:''}${marked.length?`<option value="marked">${esc(this.t('signalRange'))} (${marked.length})</option>`:''}${regions.length?`<optgroup label="${esc(this.t('region'))}">${regions.map(region=>`<option value="region:${esc(region)}">${esc(region)}</option>`).join('')}</optgroup>`:''}<option value="probe">${esc(this.t('probe'))}</option>${this.createSpikePicker?`<option value="spikes">${esc(this.t('spikes'))}</option>`:''}<option value="manual">${esc(this.t('manual'))}</option></select></label>
        <label data-ea-time-scope>${esc(this.t('timeScope'))}<select name="timeScope"><option value="all">${esc(this.t('whole'))}</option>${this.eventRange?`<option value="selection">${esc(this.t('signalRange'))} · ${this.eventRange.map(t=>Number(t.toFixed(3))).join('–')} s</option>`:''}<option value="custom">${esc(this.t('rangeChoice'))}</option></select></label>
        <div class="event-wide event-analysis-fields" data-ea-range-fields hidden>${['rangeStart','rangeEnd'].map((name,i)=>`<label>${esc(this.t(name))}<input type="number" name="${name}" min="0" step="any" value="${this.eventRange?.[i]??(i?(Number.isFinite(r.duration) && r.duration>0?r.duration:''):0)}"></label>`).join('')}</div>
        <label data-ea-source-probe ${this.probes.length>1?'':'hidden'}>Probe<select data-ea-probe-source>${this.probes.map(p=>`<option value="${esc(p.key)}" ${r.key===p.key?'selected':''}>${esc(p.name||p.key)}</option>`).join('')}</select></label>
        <div class="event-wide" data-ea-probe-select hidden><strong data-ea-picker-title></strong><div class="ea-picker-viewport"><div data-ea-picker></div><div data-ea-spike-picker hidden></div></div>
          <div class="event-inline" data-ea-depth-fields><label>${esc(this.t('fromDepth'))}<input type="number" step="any" data-ea-depth="min"></label><label>${esc(this.t('toDepth'))}<input type="number" step="any" data-ea-depth="max"></label><button type="button" data-ea-action="depth" title="${esc(this.t('brush'))}">${esc(this.t('useDepth'))}</button></div>
          <button type="button" data-ea-commit-units disabled>${esc(this.t('commitUnits'))}</button><div data-ea-saved-units></div></div>
        <label class="event-wide" data-ea-manual hidden>${esc(this.t('units'))}<input name="unitIds" type="text" value="${initial.length<=4096?initial.join(', '):''}"></label>
        </div><fieldset class="event-analysis-fields ea-response-window"><legend>${esc(this.t('responseWindow'))}</legend>
        ${numeric('start','start',-0.5)}${numeric('end','end',1)}${numeric('binWidth','bin',.05)}
        </fieldset><p data-ea-plan></p>
        <details data-ea-settings><summary title="${tip('settings')}">${esc(this.t('settings'))}</summary><div class="event-analysis-fields">
        <p class="event-wide" data-ea-source-note></p>
        ${filter('subject')}${filter('track')}
        ${numeric('ruleStart','ruleStart',ruleWindow[0])}${numeric('ruleEnd','ruleEnd',ruleWindow[1])}
        ${check('excludeRepeated','repeat')}
        ${field('coverage','coverage',attrs=>`<input ${attrs} type="text" placeholder="[[0,3600]]"><span><button type="button" data-ea-action="source-coverage" title="${tip('coverage')}" hidden disabled>${esc(this.t('sourceCoverage'))}</button></span>`,true)}
        ${field('timeScale','scale',attrs=>`<select ${attrs}>${['autoScale',...Object.keys(timeScales),'custom'].map(key=>`<option value="${key}">${esc(this.t(key))}</option>`).join('')}</select>`,true)}
        ${numeric('k','k',0,'step="1" min="0" max="32"')}
        ${field('normalization','normalization',attrs=>`<select ${attrs}><option value="shape">${esc(this.t('shape'))}</option><option value="rate">${esc(this.t('rate'))}</option></select>`)}${numeric('seed','seed',1,'step="1" min="0" max="4294967295"')}
        <small class="event-wide" data-ea-capacity aria-live="polite" hidden></small>
        ${check('activeOnly','active')}${check('stability','stability')}${numeric('repeats','repeats',E.DEFAULT_SPLITS,`step="1" min="1" max="${E.MAX_SPLITS}"`)}
        </div></details><div class="event-analysis-actions"><button class="primary-button" type="submit" form="${this.dialog.id}-parameters" data-ea-run title="${tip('run')}" disabled>${esc(this.t('run'))}</button></div></details></form><div class="event-analysis-actions"><button type="button" data-ea-action="cancel" title="${tip('cancel')}" hidden>${esc(this.t('cancel'))}</button></div>
        <p class="event-warning" data-ea-invalid-times hidden></p><p class="event-warning" data-ea-metadata-error hidden></p><p data-ea-status role="status" aria-live="polite"></p><section data-ea-process-host></section><section data-ea-results></section>`;
      this.dialog.setAttribute('aria-label',this.t('title'));this.dialog.querySelector('form').onsubmit=e=>{e.preventDefault();this.run();};
      this.resultPanel=this.dialog.querySelector('[data-ea-results]');this.showPanel();this.status(this.t('loading'));
      this.syncRange();this.syncStabilityField();
      this.syncPlan();
      if(this.dialog.querySelector('[data-ea-probe-source]')?.addEventListener)this.unitPicker=new window.NeuropixelsAnalysisUnitPicker(this);
      const preferred=this.preferredLabels?.(),epoch=++this.epoch;
      try {
        const metadata=await this.readMetadata(r);if(epoch!==this.epoch)return;this.applyMetadata(metadata);
        const recorded=this.events?.events.some(e=>e.sourceKind==='experiment');
        const annotationAvailable=this.annotations.doc?.segments?.length && this.video.mapping;
        if((preferred?.source==='annotation' && annotationAvailable)||(!recorded && this.annotations.doc))this.input('source').value='annotation';
        this.input('eventType').disabled=false;
        this.dialog.querySelectorAll('[data-ea-label-source]').forEach(button=>button.disabled=false);
        this.populateFilters();this.populateTypes(preferred?.source===this.input('source').value?preferred.type:null);
        this.syncPlan();
        if(this.getSavedAnalysis)await this.restore(r,epoch);
        else if(initial.length>4096)this.status(this.t('tooMany'),true);
        else if(!initial.length)this.status(this.t('noUnits'),true);
        else if(this.input('eventType').value)this.status('');
      }catch(error){if(epoch===this.epoch){this.sourceError=error;this.sourceWarnings();this.status(this.t('readError')+error.message,true);}}
    }
    metadataIssues(){return [[this.sourceError,'events'],[this.coverageError,'coverage']].filter(([error])=>error).map(([error,role])=>({role,message:error.message,status:'unresolved'}));}
    sourceWarnings(){
      const validity=this.dialog.querySelector('[data-ea-invalid-times]'),error=this.dialog.querySelector('[data-ea-metadata-error]');
      validity.hidden=!this.events?.source?.invalidTimes;validity.textContent=validity.hidden?'':this.t('invalidTimes');
      const issues=this.metadataIssues();error.hidden=!issues.length;error.textContent=error.hidden?'':issues.map(issue=>`${issue.role}: ${issue.message}`).join('; ')+' '+this.t('metadataLimit');
    }
    viewIds(ids){
      const origin=this.scopeAtOpen,current=this.state.activeRecording;
      if(!origin||origin===current)return ids;
      return window.NeuropixelsJointRecording.analysisIds(current,ids.map(id=>origin.jointUnits?.get(id)||{recordingKey:origin.key,unitId:id}));
    }
    focusedIds(){return this.focusAtOpen?this.viewIds(this.focusAtOpen):this.highlightedUnits?.() || [this.state.experimentView?.selectedUnitId].filter(id=>id!=null);}
    syncRange(){
      const fields=this.dialog.querySelector('[data-ea-range-fields]');
      if(!fields?.querySelectorAll)return;
      const custom=this.input('timeScope').value==='custom';
      fields.hidden=!custom;
      fields.querySelectorAll('input').forEach(input=>{input.required=custom;input.disabled=!custom;});
    }
    selectedEventRange(){
      const scope=this.input('timeScope')?.value;
      if(scope==='selection')return this.eventRange;
      if(scope!=='custom')return null;
      const start=this.input('rangeStart').valueAsNumber,end=this.input('rangeEnd').valueAsNumber;
      if(!(Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start))throw Error(this.t('badRange'));
      return [start,end];
    }
    responseOptions(unitIds){
      const options={recordingId:this.state.activeRecording.key,start:Number(this.input('start').value||NaN),end:Number(this.input('end').value||NaN),binWidth:Number(this.input('binWidth').value||NaN),coverage:this.coverageIntervals(unitIds),eventType:this.input('eventType').value,activeOnly:this.input('source').value==='experiment'&&!this.input('activeOnly').disabled&&this.input('activeOnly').checked};
      const range=this.selectedEventRange();if(range)options.eventRange=range.slice();
      const comparison=this.chosenComparison();
      const ruleMode=this.input('conditionField')?.value===E.LABEL_FIELD;
      if(ruleMode){
        if(!this.input('responseLabel')?.value)throw Error(this.t('pickResponse'));
        const [sourceKind,type]=JSON.parse(this.input('responseLabel').value);
        const start=this.input('ruleStart').valueAsNumber,end=this.input('ruleEnd').valueAsNumber;
        if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error(this.t('badLabelWindow'));
        options.responseRule={sourceKind,type,start,end};
      }else if(this.input('conditionField')?.value && !comparison)throw Error(this.t('pickPair'));
      if(this.input('excludeRepeated'))options.repeatPolicy=this.input('excludeRepeated').checked?'exclude':'keep';
      if(comparison)options.comparison=comparison;
      return options;
    }
    syncPlan(){
      const line=this.dialog.querySelector('[data-ea-plan]');if(!line?.nodeType)return;
      const count=(this.input('unitIds').value.trim().match(/[^,\s]+/g)||[]).length;
      const eventType=this.input('eventType').value;
      const ruleMode=this.input('conditionField')?.value===E.LABEL_FIELD;
      const incomplete=ruleMode?!this.input('responseLabel')?.value:!!this.input('conditionField')?.value && !this.chosenComparison();
      this.dialog.querySelector('[data-ea-run]').disabled=!eventType||incomplete||!!this.worker||!!this.ioAbort;
      const groupButton=this.dialog.querySelector('[data-ea-action="shape-groups"]');
      if(groupButton)groupButton.disabled=!!this.review?.legacyOutcome||!!this.worker||!!this.ioAbort||this.resultSettings!==this.settingsKey();
      line.textContent=[count+' Units',eventType&&this.onsetLabel(eventType),this.input('start').value+' … '+this.input('end').value+' s',this.input('binWidth').value*1000+' ms/bin',Number(this.input('k').value)>0 && this.input('k').value+' '+this.t('groups')].filter(Boolean).join(' · ');
      const capacity=this.dialog.querySelector('[data-ea-capacity]');if(!capacity)return;
      capacity.hidden=true;
      if(incomplete){line.textContent+=' · '+this.t(ruleMode?'pickResponse':'pickPair');return;}
      if(!eventType || !count)return;
      try{
        const ids=this.selectedIds(),options=this.responseOptions(ids);
        const {events}=E.selectResponseEvents(this.source(),options),trials=events.length;
        const cmp=E.comparisonOf(options);
        const firstTrials=cmp?events.filter(e=>E.conditionValue(e,cmp.field)===cmp.values[0]).length:trials;
        const fitTrials=options.responseRule && !firstTrials?trials:firstTrials;
        line.textContent+=' · '+(cmp?cmp.values.map((v,i)=>(options.responseRule?this.t(v):E.conditionText(v,cmp.values))+' '+(i?trials-firstTrials:firstTrials)).join(' / '):trials)+' '+this.t('trials');
        const bins=(options.end-options.start)/options.binWidth;
        if(!(bins>0 && Number.isFinite(bins)))return;
        const maxBins=Math.min(E.MAX_BINS,Math.floor(E.MAX_CELLS/(ids.length*Math.max(1,trials))));
        const requested=Math.round(bins), invalidWidth=requested<1 || Math.abs(requested*options.binWidth-(options.end-options.start))>1e-10*Math.max(1,options.end-options.start);
        const parts=[trials+' '+this.t('trials'),invalidWidth?this.t('fitWidth'):requested+' / '+maxBins+' '+this.t('binLimit')];
        let warn=invalidWidth||!trials||requested>maxBins;
        if(requested>maxBins)parts.push(this.t('useBins'));
        if(this.input('stability').checked && !invalidWidth){
          const limit=E.splitLimit(ids.length,fitTrials,requested,Number(this.input('k').value));
          parts.push(this.t('splitCap')+' '+limit);warn ||= Number(this.input('repeats').value)>limit;
        }
        capacity.textContent=parts.join(' · ');capacity.classList.toggle('event-warning',warn);capacity.hidden=false;
      }catch{ /* Incomplete input is validated by the form on submit. */ }
    }
    setIds(ids){
      if(this.ioAbort||this.worker)return;
      this.input('unitIds').value=ids.length<=4096?ids.join(', '):'';
      this.chooseWindowDefaults();
      this.invalidateSourceCoverage();this.syncPlan();
      this.status(ids.length>4096?this.t('tooMany'):ids.length?(this.result?this.t('pending'):''):this.t('noUnits'),!ids.length||ids.length>4096);
    }
    chooseUnits(mode){
      const units=this.getUnits()||[];
      this.dialog.querySelector('[data-ea-manual]').hidden=mode!=='manual';
      if(mode==='probe'||mode==='spikes'){this.unitPicker.show(mode);return;}
      this.unitPicker?.hide();
      if(this.unitPicker?.sourceChanged && this.unitPicker.source.value!==this.state.activeRecording.key){
        this.unitPicker.singleScope(mode);return;
      }
      if(mode==='manual'){this.input('unitIds').focus();return;}
      this.setIds(mode==='marked'?this.viewIds(this.state.experimentView.selectedInterval.unitIds):mode==='selected'?this.focusedIds():(mode==='all'?units:units.filter(u=>u.region===mode.slice(7))).map(u=>u.id));
    }
    dispose(){this.unitPicker?.destroy();this.unitPicker=null;this.figures?.destroy();this.figures=null;this.figuresRequested=false;}
    openFigures(panel=this.figures?.panel||'J',focus=true){
      if(this.review?.comparison && this.review.views.size===2 && this.resultSettings===this.settingsKey() && this.result.signature===this.signature()){
        this.figuresRequested=false;
        this.figures.open(this.review,panel);
        if(focus){
          const current=this.figures.bar.querySelector('[aria-pressed=true]');
          current?.focus({preventScroll:true});current?.scrollIntoView({block:'nearest',inline:'nearest'});
        }
        return;
      }
      this.figuresRequested=panel;
      this.figures?.showReview();
      this.dialog.querySelector('[data-ea-inputs]').open=true;
      const field=this.input('conditionField');
      (field?.getClientRects().length?field:this.input('eventType'))?.focus();
      this.status(window.NeuropixelsEventFigures.word('choose'));
    }
    async readMetadata(record){
      const out={events:null,coverage:null,sourceError:null,coverageError:null};
      await Promise.all([['events',32,'sourceError'],['coverage',16,'coverageError']].map(async ([key,limit,errorKey])=>{
        const file=record[key+'File'];if(!file)return;
        try{
          if(file.size>limit*1024*1024)throw Error(key+' file exceeds '+limit+' MiB');
          const data=JSON.parse(await file.text());
          out[key]=key==='events'?E.validateEventSet(data,record.key):data;
        }catch(error){out[errorKey]=error;}
      }));
      return out;
    }
    applyMetadata(metadata){
      Object.assign(this,metadata);
      const button=this.dialog.querySelector('[data-ea-action="source-coverage"]');button.hidden=!this.coverage;button.disabled=!this.coverage;
      this.sourceWarnings();
    }
    async commitProbeScope(records,refs){
      const previous=this.state.activeRecording;
      let record=previous;
      const current=new Set(previous.jointSources||[previous.key]);
      if(records.length && (current.size!==records.length || records.some(r=>!current.has(r.key)))){
        record=await this.prepareProbeScope(records);
        if(!record || !this.panelOpen)return false;
        const [units,metadata]=await Promise.all([this.getProbeUnits(record),this.readMetadata(record)]);
        if(!this.panelOpen)return false;
        const type=this.input('eventType').value;
        this.state.activeRecording=record;this.getUnits=()=>units;this.recordingKey=this.identity();
        this.invalidateSourceCoverage();this.clearResult();
        const ruleChoice=this.input('conditionField')?.value===E.LABEL_FIELD?this.input('responseLabel')?.value:null;
        const comparison=ruleChoice?{field:E.LABEL_FIELD}:this.chosenComparison();
        this.applyMetadata(metadata);this.populateTypes(type);
        if(comparison && this.input('eventType').value===type){
          this.syncComparison(comparison);
          if(ruleChoice)this.input('responseLabel').value=ruleChoice;
        }
        if(this.workspaceTab)this.workspaceTab.recording=record;
      }
      const ids=window.NeuropixelsJointRecording.analysisIds(record,refs);
      if(ids.length!==refs.length)throw Error(this.t('invalid'));
      this.setIds(ids);return true;
    }
    selectedIds(){const raw=this.input('unitIds').value.trim().split(/[\s,]+/);if(raw.some(x=>!/^[-]?\d+$/.test(x)||!Number.isSafeInteger(Number(x))))throw Error(this.t('invalid'));return raw.map(Number);}
    sourceFiles(r){return [{role:'spikeTimes',file:r.spikeTimesFile},{role:'spikeClusters',file:r.spikeClustersFile},{role:'sampleRate',file:r.byName.get('params.py')},...(r.eventsFile?[{role:'events',file:r.eventsFile}]:[]),...(r.coverageFile?[{role:'coverage',file:r.coverageFile}]:[])];}
    clearCoverage(){this.input('coverage').value='';this.coverageProof=null;}
    invalidateSourceCoverage(){if(this.coverageProof)this.clearCoverage();}
    coverageIntervals(unitIds){
      const text=this.input('coverage').value;
      if(this.coverageProof&&text!==this.coverageProof.text)this.coverageProof=null;
      if(!text.trim()||this.coverageProof){
        if(this.coverageError){this.clearCoverage();throw Error(this.t('invalidCoverage')+' '+this.coverageError.message);}
        if(!this.coverage){if(this.coverageProof){this.clearCoverage();throw Error('Source observation intervals are no longer available');}return null;}
        try{
          const proof=E.commonCoverage(this.coverage,unitIds,this.state.activeRecording.key,{allowMissing:true});
          if(this.coverageProof&&this.coverageProof.unitIds!==unitIds.join(','))throw Error('Source observation selection changed to Unit '+unitIds.join(', '));
          if(text.trim()&&JSON.stringify(proof.intervals)!==text)throw Error('Source observation intervals changed; select coverage again');
          this.coverageProof=proof.intervals?{text,unitIds:unitIds.join(','),origin:proof.missingUnitIds.length?'source-reported-partial-unit-intersection':'source-reported-unit-intersection',source:{...proof.source,coveredUnitIds:proof.coveredUnitIds,missingUnitIds:proof.missingUnitIds,sourceExcluded:proof.sourceExcluded||[]}}:null;
          return proof.intervals;
        }catch(error){this.clearCoverage();throw error;}
      }
      return E.validateCoverage(JSON.parse(text));
    }
    coverageMessage(provenance){return this.t(provenance.coverageOrigin==='unknown-continuous-assumption'?'unknownCoverage':provenance.coverageOrigin==='source-reported-partial-unit-intersection'?'partialCoverage':provenance.coverageOrigin==='source-reported-unit-intersection'?'sourceCoverageNote':'coverageNote');}
    sourceCoverage(){
      this.clearCoverage();
      try {const unitIds=this.selectedIds(),proof=E.commonCoverage(this.coverage,unitIds,this.state.activeRecording.key);this.input('coverage').value=JSON.stringify(proof.intervals);this.coverageProof={text:this.input('coverage').value,unitIds:unitIds.join(','),source:proof.source};this.syncPlan();this.status(this.t('sourceCoverageNote'));}catch(error){this.clearResult();this.status(error.message,true);}
    }
    async restore(recording,epoch){
      try {
        const blob=await this.getSavedAnalysis?.(recording);if(!blob||epoch!==this.epoch)return;
        this.restoring=true;this.ioAbort=new AbortController();const signal=this.ioAbort.signal;this.busy(true);this.status(this.t('checking'));
        const saved=await P.unpack(blob);if(epoch!==this.epoch)return;
        const available=new Set((this.getUnits()||[]).map(u=>u.id));if(saved.response.unitIds.some(id=>!available.has(id)))throw Error('Saved Units are not available in this Recording');
        this.input('source').value=saved.input.sourceKind;this.populateFilters();for(const key of ['subject','track'])this.input(key).value=saved.input.annotationFilters?.[key]||'';this.populateTypes();
        const p=saved.response.parameters;for(const key of ['start','end','binWidth','eventType'])this.input(key).value=String(p[key]);
        this.editedWindow=true;if(this.input('timeScale'))this.input('timeScale').value='custom';
        if(this.input('timeScope')){
          if(p.eventRange){
            this.input('rangeStart').value=p.eventRange[0];this.input('rangeEnd').value=p.eventRange[1];
            const same=this.eventRange?.every((t,i)=>t===p.eventRange[i]);
            this.input('timeScope').value=same?'selection':'custom';
          }else this.input('timeScope').value='all';
          this.syncRange();
        }
        const comparison=E.comparisonOf(p);
        const legacy=E.recordedOutcome(comparison?.field,comparison?.values);
        this.syncActiveFilter();this.syncComparison(legacy?{field:E.LABEL_FIELD}:comparison);
        if(legacy)this.input('responseLabel').value='';
        if(this.input('excludeRepeated'))this.input('excludeRepeated').checked=p.repeatPolicy==='exclude';
        if(p.responseRule){
          this.input('responseLabel').value=JSON.stringify([p.responseRule.sourceKind,p.responseRule.type]);
          this.input('ruleStart').value=p.responseRule.start;this.input('ruleEnd').value=p.responseRule.end;
        }
        this.input('unitIds').value=saved.response.unitIds.join(', ');this.input('coverage').value=p.coverage===null?'':JSON.stringify(p.coverage);this.input('activeOnly').checked=p.activeOnly;
        const chooser=this.dialog.querySelector('[data-ea-unit-choice]');if(chooser?.options){
          const chosen=saved.response.unitIds,availableIds=(this.getUnits()||[]).map(u=>u.id);
          chooser.value=chosen.length===availableIds.length?'all':'manual';
          this.dialog.querySelector('[data-ea-manual]').hidden=chooser.value!=='manual';
        }
        this.input('k').value=String(saved.clusters?.k||0);this.editedK=true;this.input('seed').value=String(saved.clusters?.seed??saved.diagnostics?.parameters.seed??1);this.input('normalization').value=saved.clusters?.normalization||'shape';
        this.input('stability').checked=!!saved.diagnostics;
        if(saved.diagnostics)this.input('repeats').value=saved.diagnostics.parameters.repeats;
        this.syncStabilityField();
        if(['source-reported-unit-intersection','source-reported-partial-unit-intersection'].includes(saved.provenance.coverageOrigin)){
          const proof=E.commonCoverage(this.coverage,saved.response.unitIds,recording.key,{allowMissing:true});if(JSON.stringify(proof.intervals)!==JSON.stringify(p.coverage))throw Error('Source observation intervals changed');
          this.coverageProof={text:this.input('coverage').value,unitIds:saved.response.unitIds.join(','),origin:saved.provenance.coverageOrigin,source:{...proof.source,coveredUnitIds:proof.coveredUnitIds,missingUnitIds:proof.missingUnitIds,sourceExcluded:proof.sourceExcluded||[]}};
        }
        const signature=this.signature();await P.verifySources(saved,this.sourceFiles(recording),this.source(),recording.sampleRate,signal,()=>this.status(this.t('checking')));
        if(epoch!==this.epoch)return;if(signature!==this.signature()){this.clearCoverage();this.status(this.t('stale'),true);return;}
        this.unitPicker?.restore(saved.response.unitIds,recording);
        this.result={...saved,signature};this.renderResult();this.status(this.t(legacy?'savedOutcomeNote':'restored'));
      }catch(error){if(epoch===this.epoch&&error.name!=='AbortError'){this.clearCoverage();this.result=null;this.resultPanel?.replaceChildren();this.status(this.t('restoreFailed')+error.message,true);}}
      finally{if(epoch===this.epoch){this.ioAbort=null;this.restoring=false;this.busy(false);}}
    }
    async save(){
      if(this.saving)return;const result=this.result,r=this.state.activeRecording;
      try {
        if(!this.canSave?.())throw Error(this.t('saveUnavailable'));
        if(!result||result.signature!==this.signature())throw Error(this.t('stale'));
        this.saving=true;const blob=await P.pack(result);
        if(result!==this.result||result.signature!==this.signature())throw Error(this.t('stale'));
        await this.saveAnalysis(r,blob);if(result===this.result)this.status(this.t('saved'));
      }catch(error){this.status(error.message,true);}finally{this.saving=false;}
    }
    source(){
      const primary=this.sourceOf(this.input('source').value);
      if(this.input('conditionField')?.value!==E.LABEL_FIELD || !this.input('responseLabel')?.value)return primary;
      const [kind]=JSON.parse(this.input('responseLabel').value);
      const output={...primary};
      if(kind!==this.input('source').value)output.responseSource=this.sourceOf(kind);
      if(kind==='annotation'){
        const mapping=this.video.mapping,clock=mapping?.frameClock?.video_s;
        const duration=this.video.source?.duration;
        const lo=mapping?.videoToNeural?.(Math.max(0,clock?.[0]??0));
        const hi=mapping?.videoToNeural?.(Math.min(duration??Infinity,clock?.at(-1)??Infinity));
        if(Number.isFinite(lo)&&Number.isFinite(hi)&&hi>Math.max(0,lo))output.responseBounds=[Math.max(0,lo),hi];
      }
      return output;
    }
    sourceOf(kind){
      if(kind==='annotation'){
        const r=this.state.activeRecording;
        const owner=this.video.source?.descriptor?.annotationRecordingKey??r.databaseId??r.key;
        if(this.annotations.doc?.context?.recordingKey!==String(owner))throw Error('Annotations are not loaded for the current Recording');
        return E.fromAnnotations(this.annotations.doc,this.video.mapping,{recordingId:r.key,reviewedOnly:true,includeNamedManual:true,subject:this.input('source').value==='annotation'&&this.input('subject')?.value||undefined,track:this.input('source').value==='annotation'&&this.input('track')?.value||undefined});
      }
      if(this.sourceError)throw this.sourceError;
      return E.fromExperimentalEvents(this.events||{schema:E.SCHEMA,recordingId:this.state.activeRecording.key,timebase:'neural_seconds',events:[]},this.state.activeRecording.key);
    }
    populateFilters(){
      for(const tab of this.dialog.querySelectorAll('button[data-ea-label-source]'))tab.setAttribute('aria-pressed',String(tab.dataset.eaLabelSource===this.input('source').value));
      for(const key of ['subject','track']){const node=this.input(key),value=node.value,values=[...new Set((this.annotations.doc?.segments||[]).map(s=>s[key]))].sort();node.innerHTML=`<option value="">${esc(this.t('all'))}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');node.value=values.includes(value)?value:'';node.disabled=this.input('source').value!=='annotation';}
    }
    syncActiveFilter(){
      const type=this.input('eventType').value;
      const input=this.input('activeOnly');
      const available=this.input('source').value==='experiment' && this.events?.events.some(e=>e.type===type && e.conditions?.active===true);
      input.disabled=!available;
      const field=input.closest?.('.ea-check');if(field)field.hidden=!available;
    }
    chooseWindowDefaults(){
      if(this.editedWindow || this.restoring || !this.input('unitIds'))return;
      const type=this.input('eventType').value;
      if(!type)return;
      let source,ids,coverage,eventRange;
      try{source=this.source();ids=this.selectedIds();coverage=this.coverageIntervals(ids);eventRange=this.selectedEventRange();}catch{return;}
      const comparison=this.chosenComparison();
      const filter={eventType:type,coverage,activeOnly:!this.input('activeOnly').disabled && this.input('activeOnly').checked,
        comparison,eventRange};
      // Keep a pre-onset baseline for short epochs, in whole 50 ms bins.
      const windows=Array.from({length:11},(_,i)=>[(i-10)/20,1]).concat([[0,.5],[0,.25],[-.5,0],[-.25,0],[0,.05]]);
      let start=0,end=1,events=source.events;
      for(const [a,b] of windows){
        const candidates=E.selectResponseEvents(source,{...filter,start:a,end:b}).events;
        if(candidates.length && (!comparison||comparison.values.every(v=>candidates.some(e=>E.conditionValue(e,comparison.field)===v)))){
          start=a;end=b;events=candidates;break;
        }
      }
      const span=end-start,max=Math.min(Math.round(span/.05),Math.floor(E.MAX_CELLS/(Math.max(1,ids.length)*Math.max(1,events.length))));
      const bins=max>=Math.round(span/.05)?Math.round(span/.05):[30,20,15,12,10,6,5,4,3,2,1].find(n=>n<=max)||1;
      this.input('start').value=start;this.input('end').value=end;this.input('binWidth').value=span/bins;
    }
    chosenComparison(){
      const field=this.input('conditionField')?.value;
      if(!field||field===E.LABEL_FIELD)return null;
      const a=this.input('referenceValue').value,b=this.input('comparisonValue').value;
      return a && b && a!==b ? {field,values:[JSON.parse(a),JSON.parse(b)]} : null;
    }
    syncComparison(saved=null,events){
      const choice=this.input('conditionField');if(!choice)return;
      const type=this.input('eventType').value;
      this.conditionFields=E.conditionFields(type?(events||this.sourceOf(this.input('source').value).events).filter(e=>e.type===type):[]);
      const fields=[...this.conditionFields].filter(([,values])=>values.size>1).map(([field])=>field);
      this.responseChoices=new Map();
      const kind=this.input('source').value;
      for(const k of [kind,kind==='experiment'?'annotation':'experiment']){
        let rows;
        try{rows=k===kind && events?events:this.sourceOf(k).events;}catch{continue;}
        const types=[...new Set(rows.filter(e=>e.type!==type||k!==kind).map(e=>e.type))].sort();
        if(types.length)this.responseChoices.set(k,types);
      }
      choice.innerHTML='<option value="">'+esc(this.t('pooled'))+'</option>'+(type?'<option value="'+E.LABEL_FIELD+'">'+esc(this.t('rule'))+'</option>':'')+fields.map(field=>`<option value="${esc(field)}">${esc(field)}</option>`).join('');
      choice.value=(fields.includes(saved?.field)||saved?.field===E.LABEL_FIELD)?saved.field:'';
      choice.closest('label').hidden=!type;
      this.syncComparisonValues(saved?.values);
    }
    syncComparisonValues(saved){
      const mode=this.input('conditionField').value;
      const field=mode===E.LABEL_FIELD?'':mode,counts=this.conditionFields?.get(field);
      const picker=this.input('responseLabel');
      if(picker){
        const previous=picker.value;
        picker.innerHTML='<option value="">'+esc(this.t(this.responseChoices?.size?'pickResponse':'missingResponse'))+'</option>'+[...this.responseChoices||[]].map(([k,types])=>'<optgroup label="'+esc(this.sourceTitle?.(k)||this.t(k))+'">'+types.map(t=>'<option value="'+esc(JSON.stringify([k,t]))+'">'+esc(t)+'</option>').join('')+'</optgroup>').join('');
        picker.value=[...picker.options].some(o=>o.value===previous)?previous:'';
        picker.closest('label').hidden=mode!==E.LABEL_FIELD;
        for(const key of ['ruleStart','ruleEnd']){
          const input=this.input(key);input.closest('.ea-parameter').hidden=mode!==E.LABEL_FIELD;
          input.disabled=mode!==E.LABEL_FIELD;input.required=mode===E.LABEL_FIELD;
        }
      }
      const values=counts?[...counts.keys()]:[];
      const nonStrings=new Set(values.filter(v=>typeof v!=='string').map(String));
      const options='<option value="">'+esc(this.t('pickValue'))+'</option>'+values.map(v=>`<option value="${esc(JSON.stringify(v))}">${esc(E.conditionText(v,nonStrings))} (${counts.get(v)})</option>`).join('');
      for(const [i,key] of ['referenceValue','comparisonValue'].entries()){
        const choice=this.input(key);
        choice.closest('label').hidden=!field;choice.required=!!field;
        choice.innerHTML=options;
        const v=saved?.[i]??(values.length===2?values[i]:undefined);
        choice.value=counts?.has(v)?JSON.stringify(v):'';
      }
    }
    distinctComparisonValues(changed){
      const other=this.input(changed.name==='referenceValue'?'comparisonValue':'referenceValue');
      if(changed.value && changed.value===other.value){
        other.value=other.options.length===3?[...other.options].find(o=>o.value && o.value!==changed.value).value:'';
      }
    }
    syncStabilityField(){
      const input=this.input('repeats');if(!input)return;
      const enabled=this.input('stability').checked;
      input.closest('.ea-parameter').hidden=!enabled;input.disabled=!enabled||!!this.restoring;
    }
    populateTypes(preferred=null){
      try {const source=this.sourceOf(this.input('source').value),counts=new Map();
        for(const event of source.events)counts.set(event.type,(counts.get(event.type)||0)+1);
        const types=[...counts.keys()].sort();this.input('eventType').innerHTML=(types.length>1?`<option value="">${esc(this.t('pickEvent'))}</option>`:'')+types.map(t=>`<option value="${esc(t)}">${esc(t)} (${counts.get(t)})</option>`).join('');
        if(types.includes(preferred))this.input('eventType').value=preferred;
        const note=this.dialog.querySelector('[data-ea-source-note]');if(note)note.textContent=this.input('source').value==='annotation'?this.t('annotationHelp')+(this.sourceError?' '+this.t('readError')+this.sourceError.message:''):source.excluded?.some(e=>e.reason==='annotation_requires_current_document')?this.t('annotationAssetNote'):'';
        this.syncActiveFilter();this.syncComparison(null,source.events);this.chooseWindowDefaults();this.status(this.input('eventType').value?'':this.t(types.length?'pickEvent':'empty'));
      }catch(error){this.input('eventType').replaceChildren();this.status(error.message,true);}
    }
    action(action){
      if(!action)return;
      if(action==='close'){if(!this.workspaceTab)this.cancel(false);this.backToSignals();return;}
      if(action==='cancel'){this.cancel();return;}
      if(action==='source-coverage'){this.sourceCoverage();return;}
      if(action==='depth'){
        const fields=this.dialog.querySelectorAll('[data-ea-depth]');
        const lo=fields[0].valueAsNumber,hi=fields[1].valueAsNumber;
        if(Number.isFinite(lo)&&Number.isFinite(hi)&&lo<=hi){const ids=this.unitPicker.units.filter(u=>Number.isFinite(u.depthUm)&&u.depthUm>=lo&&u.depthUm<=hi).map(u=>u.id);this.unitPicker.map.pick(ids,{clear:!ids.length});}
        else this.status(this.t('brush'),true);
        return;
      }
      if(action==='save'){this.save();return;}
      if(action==='shape-groups'){this.toggleGrouping();return;}
      if(action==='selected'||action==='all'){
        const ids=action==='selected'?[this.state.experimentView.selectedUnitId].filter(v=>v!=null):(this.getUnits()||[]).map(u=>u.id);
        this.input('unitIds').value=ids.join(', ');this.invalidateSourceCoverage();this.clearResult();return;
      }
      if(!this.result)return;
      if(this.signature()!==this.result.signature){this.status(this.t('stale'),true);return;}
      if(action==='unit'){const id=Number(this.input('resultUnit').value);this.backToSignals();this.selectUnit?.(id);return;}
      if(action==='return'){
        const unitId=Number(this.input('resultUnit').value),event=(this.review?.current||this.result.response).events[Number(this.input('resultEvent').value)];
        this.jumpToEvent(unitId,event);return;
      }
      if(action==='export'){
        const {response,clusters,provenance}=this.result;
        const data={schema:'neuropixels-event-analysis/1',provenance,input:this.result.input,response:{...response,counts:Array.from(response.counts),rateHz:Array.from(response.rateHz)},clusters,diagnostics:this.result.diagnostics||null,...(this.result.view?{view:this.result.view}:{})};
        const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='event-analysis.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
      }
    }
    jumpToEvent(unitId,event){
      if(!event||!this.result)return;
      if(this.result.signature!==this.signature()){this.status(this.t('stale'),true);return;}
      if(this.workspaceTab){this.workspaceTab.signals();this.returnToSource(unitId,event);return;}
      this.suspended={result:this.result,top:this.dialog.scrollTop,rawTop:this.review?.get('raw')?.scrollTop};
      this.dialog.close();this.returnToSource(unitId,event);
    }
    returnFromSource(){
      const saved=this.suspended;
      if(!saved||!this.result||this.result!==saved.result||this.result.signature!==this.signature())return false;
      this.suspended=null;this.onResumeSource?.();
      if(!this.panelOpen)this.showPanel();
      this.dialog.scrollTop=saved.top;this.review?.resume(saved.rawTop);return true;
    }
    stopWork(){this.epoch++;this.previousResult=null;this.ioAbort?.abort();this.ioAbort=null;this.worker?.terminate();this.worker=null;if(this.workerUrl)URL.revokeObjectURL(this.workerUrl);this.workerUrl=null;if(this.resultPanel)this.resultPanel.hidden=false;this.busy(false);}
    cancel(show=true){
      if(this.restoring){this.clearCoverage();this.restoring=false;}
      const previous=this.previousResult;
      if(this.ioAbort||this.worker)this.process?.cancel();
      this.stopWork();
      if(show){
        if(previous&&previous.signature===this.signature())this.replayProcess(this.traceLog,previous);
        this.status(this.t('cancelled'));
      }
    }
    busy(active){this.dialog.querySelectorAll('form input, form select, [data-ea-label-source], [data-ea-action="depth"], [data-ea-action="shape-groups"], [data-ea-run], [data-ea-action="all"], [data-ea-action="selected"], [data-ea-action="source-coverage"]').forEach(n=>n.disabled=active);const group=this.figures?.get('[data-ef-group]');if(group)group.disabled=active||this.review?.legacyOutcome;const cancel=this.dialog.querySelector('[data-ea-action="cancel"]');if(cancel)cancel.hidden=!active;if(!active&&this.input('activeOnly')){this.syncActiveFilter();this.syncStabilityField();this.syncRange();for(const key of ['subject','track'])this.input(key).disabled=this.input('source')?.value!=='annotation';this.dialog.querySelector('[data-ea-action="source-coverage"]').disabled=!this.coverage;this.syncPlan();}}
    createWorker(){
      this.workerUrl=URL.createObjectURL(new Blob([core.createEventWorkerSource(E.workerSource())],{type:'text/javascript'}));
      this.worker=new Worker(this.workerUrl);
      return this.worker;
    }
    toggleGrouping(){
      const result=this.result,review=this.review;
      if(!result || !review || this.worker || this.ioAbort || review.legacyOutcome)return;
      if(this.resultSettings!==this.settingsKey()){this.status(this.t('pending'));return;}
      if(result.signature!==this.signature()){this.status(this.t('stale'),true);return;}
      const r=result.response,comparison=E.comparisonOf(r.parameters),ref=comparison?.values[0];
      const reference=comparison?review.views.get(ref).response:r;
      const base=(this.traceLog||[]).filter(p=>p.stage==='alignment'||p.stage==='rates');
      const tracked=base[0]?.unitId??review.selected.at(-1)??reference.unitIds[0];
      if(result.clusters){
        const log=base.slice();
        E.createProcessTrace(p=>log.push(p),tracked,{unitId:tracked,referenceOutcome:ref,conditionField:comparison?.field}).order(reference,null);
        this.applyGrouping(result,null,null,log);
        return;
      }
      const epoch=this.epoch;
      const {shape,parameters,condition,binEdges,unitIds,rateHz}=reference;
      const progress=base.slice();
      const fail=message=>{
        if(epoch!==this.epoch)return;
        this.stopWork();this.replayProcess(this.traceLog,result);this.status(message,true);
      };
      try{
        const worker=this.createWorker();this.previousResult=result;
        this.busy(true);this.status(this.t('grouping'));
        this.process?.start();base.forEach(p=>this.process?.update(p));
        worker.onerror=e=>fail(e.message);
        worker.onmessage=({data})=>{
          if(epoch!==this.epoch)return;
          if(result.signature!==this.signature()){fail(this.t('stale'));return;}
          if(data.progress){progress.push(data.progress);this.process?.update(data.progress);return;}
          if(data.error||!data.clusters){fail(data.error||this.t('noShapes'));return;}
          this.stopWork();
          this.applyGrouping(result,data.clusters,data.diagnostics,progress,!!this.process);
        };
        worker.postMessage({operation:'group',reference:{shape,parameters,condition,binEdges,unitIds,rateHz},
          clusters:{k:Math.min(3,unitIds.length),auto:true,seed:Number(this.input('seed').value),normalization:'shape'},traceUnitId:tracked});
      }catch(error){fail(error.message);}
    }
    replayProcess(log,result){
      if(!this.process && log?.length && window.EventAnalysisProcess)
        this.process=window.EventAnalysisProcess.create(this.dialog.querySelector('[data-ea-process-host]'),document.documentElement.lang,this.state.activeRecording);
      if(!this.process)return;
      if(!log?.length){this.process.cancel();return;}
      this.process.start();log.forEach(p=>this.process.update(p));this.process.finish(result);
    }
    applyGrouping(result,clusters,diagnostics,log,processIsRunning=false){
      const previous=this.review,panelTop=this.dialog.scrollTop,trialTop=previous.get('raw').scrollTop;
      previous.remember();
      this.result={...result,clusters,diagnostics};
      this.traceLog=log;
      this.input('k').value=String(clusters?.k||0);
      this.input('normalization').value='shape';
      this.input('stability').checked=!!diagnostics;
      this.syncStabilityField();
      this.renderResult(previous);
      const trials=this.review.get('raw');trials.scrollTop=trialTop;trials.onscroll?.();
      if(processIsRunning)this.process.finish(this.result);
      else this.replayProcess(log,this.result);
      this.dialog.scrollTop=panelTop;
    }
    async run(){
      if(this.unitPicker?.saving)return;
      const previous=this.result;
      const keepView=previous && this.resultSettings===this.settingsKey();
      const traceUnitId=this.review?.selected.at(-1)??this.state.experimentView?.selectedUnitId;
      this.cancel(false);
      const epoch=this.epoch,traceLog=[];
      try {
        const unitIds=this.selectedIds(),available=new Set((this.getUnits()||[]).map(u=>u.id));if(unitIds.some(id=>!available.has(id)))throw Error('A selected Unit does not belong to this Recording');
        const events=this.source(),r=this.state.activeRecording;
        const options=this.responseOptions(unitIds);
        if(!options.eventType)throw Error(this.t('empty'));
        // Preflight coverage, selection and response allocation before reading spike files.
        try{E.validateResponsePlan(unitIds,events,options);}catch(error){
          if(!/^No (events|eligible events)/.test(error.message))throw error;
          const excluded=E.selectResponseEvents(events,options).excluded;
          const key=excluded.length && excluded.every(e=>e.reason==='outside_selected_time')?'range':
            excluded.some(e=>e.reason==='incomplete_recording_coverage')?'coverage':
            excluded.some(e=>e.reason==='outside_nonnegative_neural_time')?'early':
            excluded.some(e=>e.reason==='repeated_event_in_window')?'onlyRepeats':
            excluded.some(e=>e.reason==='incomplete_label_window')?'labelEdge':'filter';
          if(key==='onlyRepeats'||key==='labelEdge')throw Error(this.t(key));
          const messages={
            range:['No matching events in this recording interval. Widen it or select Whole recording.','当前记录时段内没有对应事件。请扩大时段或选择「整条记录」。','No hay eventos en este intervalo. Amplíalo o selecciona todo el registro.'],
            coverage:['Shorten the response window to fit the selected Units’ observation intervals.','请缩短响应窗口，使它落在所选 Unit 的共同观测区间内。','Acorta la ventana para ajustarla a los intervalos de observación compartidos.'],
            early:['Set Window start to 0 s to include events near recording start.','把窗口起点改为 0 秒，可纳入记录开始处的事件。','Ajusta el inicio a 0 s para incluir eventos cercanos al comienzo del registro.'],
            filter:['Choose an event label or reference condition with matching trials.','请选择有对应试次的事件标签或参照条件。','Elige una etiqueta o condición de referencia con ensayos disponibles.']};
          throw Error(messages[key][{'zh-CN':1,es:2}[document.documentElement.lang]||0]);
        }
        const k=Number(this.input('k').value);if(!Number.isSafeInteger(k)||k<0||k>32)throw Error('Cluster count must be an integer from 0 to 32');
        const clusters=k?{k,auto:!this.editedK,seed:Number(this.input('seed').value),normalization:this.input('normalization').value}:null;
        const stability=this.input('stability').checked?{repeats:Number(this.input('repeats').value),seed:Number(this.input('seed').value)}:null;
        if(stability && (!Number.isInteger(stability.repeats)||stability.repeats<1||stability.repeats>E.MAX_SPLITS))throw Error(parameterHelp[document.documentElement.lang]?.repeats||parameterHelp.en.repeats);
        const signature=this.signature();
        this.previousResult=previous?.signature===signature?previous:null;
        const sourceCoverage=this.coverageProof?.text===this.input('coverage').value&&this.coverageProof.unitIds===unitIds.join(',');
        const provenance={createdAt:new Date().toISOString(),recordingId:r.key,source:events.source||null,invalidTimes:this.events?.source?.invalidTimes||null,...(this.metadataIssues().length?{sourceMetadataErrors:this.metadataIssues()}:{}),excludedSourceEvents:events.excluded||[],coverageOrigin:options.coverage===null?'unknown-continuous-assumption':sourceCoverage?(this.coverageProof.origin||'source-reported-unit-intersection'):'user-declared-unverified',coverageSource:sourceCoverage?this.coverageProof.source:null,sourceFiles:[r.spikeTimesFile,r.spikeClustersFile].map(f=>({name:f.name,size:f.size,lastModified:f.lastModified})),interpretation:this.t('limit')};
        this.ioAbort=new AbortController();const signal=this.ioAbort.signal;this.busy(true);this.status(this.t('checking'));
        this.resultPanel.hidden=true;
        if(window.EventAnalysisProcess){
          this.dialog.querySelector('[data-ea-inputs]').open=false;this.dialog.querySelector('[data-ea-settings]').open=false;
          this.process?.destroy();
          this.process=window.EventAnalysisProcess.create(this.dialog.querySelector('[data-ea-process-host]'),document.documentElement.lang,this.state.activeRecording);
          this.process.start();this.dialog.scrollTop=0;
        }
        if(r.jointSources)provenance.units=Object.fromEntries(unitIds.map(id=>[id,r.jointUnits.get(id)]));
        const input={sourceKind:this.input('source').value,annotationFilters:this.input('source').value==='annotation'?{subject:this.input('subject').value,track:this.input('track').value}:null,sampleRate:r.sampleRate,eventDigest:await P.digestJSON(events),sourceFingerprints:await P.sourceFingerprints(this.sourceFiles(r),signal)};
        if(epoch!==this.epoch)return;if(signature!==this.signature()){this.cancel(false);this.status(this.t('stale'),true);return;}
        this.createWorker();this.busy(true);this.status(this.t('computing'));
        this.worker.onerror=e=>{if(epoch!==this.epoch)return;this.stopWork();this.process?.fail();this.status(e.message,true);};
        this.worker.onmessage=({data})=>{
          if(epoch!==this.epoch)return;
          if(data.progress){
            const p=data.progress;
            if(p.phase==='process'){traceLog.push(p);this.process?.update(p);this.status('');return;}
            const key=p.phase==='reading-spikes'?'readingSpikes':p.phase==='split-half-stability'?'splitCheck':'computing';
            const progress=key==='splitCheck'?` ${p.completed}/${p.total}`:p.total?` ${Math.floor(100*p.completed/p.total)}%`:'';
            this.status(this.t(key)+progress);return;
          }
          if(data.error){this.stopWork();this.process?.fail();this.status(data.error,true);return;}
          if(signature!==this.signature()){this.cancel(false);this.status(this.t('stale'),true);return;}
          const view=keepView?this.previousResult?.view:null;
          this.stopWork();
          this.result={response:data.response,clusters:data.clusters,diagnostics:data.diagnostics,signature,provenance,input,...(view?{view}:{})};
          this.traceLog=traceLog;
          if(data.trains)this.responseTrains.set(data.response,data.trains);
          if(clusters?.auto && (data.clusters?.k||0)!==k)this.input('k').value=String(data.clusters?.k||0);
          this.renderResult();this.process?.finish(this.result);
        };
        this.worker.postMessage({files:{spikeTimes:r.spikeTimesFile,spikeClusters:r.spikeClustersFile},sampleRate:r.sampleRate,unitIds,events,options,clusters,stability,retainTrains:true,traceProcess:!!this.process,traceUnitId});
      }catch(error){if(epoch!==this.epoch || error.name==='AbortError')return;this.stopWork();this.process?.fail();this.status(error.message,true);}
    }
    renderResult(previous=null){
      const {response:r,clusters:c}=this.result;
      this.resultSettings=this.settingsKey();
      this.review?.stop();this.review=null;this.syncPlan();
      this.summary=E.responseSummary(r,c);
      this.dialog.querySelector('[data-ea-inputs]').open=false;this.dialog.querySelector('[data-ea-settings]').open=false;this.dialog.scrollTop=0;
      this.dialog.querySelector('[data-ea-run]').textContent=this.t('rerun');
      this.status(`${this.t('done')}: ${r.shape[0]} Units / ${r.shape[1]} ${this.t('trials')} / ${r.shape[2]} ${this.t('bins')}. ${this.t('excluded')}: ${r.excludedEvents.length}`);
      this.review=new window.NeuropixelsEventReview(this,previous);
      this.review.render();
      const figure=this.figuresRequested||(this.figures?.active && this.review.views.size===2 && this.figures.panel);
      this.figures??=new window.NeuropixelsEventFigures(this);
      this.figures.mount(this.review);
      if(figure)this.openFigures(figure,false);
    }
  }
  window.NeuropixelsEventAnalysisUI=EventAnalysisUI;
})();
