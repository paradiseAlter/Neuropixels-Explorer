// SPDX-License-Identifier: MIT
(() => {
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const copy = {
    importFilesNow:["Import files…","导入文件…","Importar archivos…"],
    importNowHelp:["Choose neural data, video or labels.","选择神经数据、视频或标签。","Elige datos neurales, vídeo o etiquetas."],
    exportBundle:["Export project","导出项目","Exportar proyecto"],
    closeVideo:["Close video","关闭视频","Cerrar vídeo"],
    unexported:["Changes in this tab. Export to keep them.","当前更改仅在此页面，导出项目即可保存。","Cambios en esta pestaña. Exporta para guardarlos."],
    discardWorking:["Replace this workspace and discard its unexported changes?","替换当前工作区并放弃尚未导出的更改？","¿Reemplazar este espacio y descartar sus cambios sin exportar?"],
    downloadCheck:["Once the download finishes, confirm that you have the project file. Cancel to keep the unsaved-changes reminder.","请在下载完成、确认已取得项目文件后选择「确定」。选择「取消」会保留关闭前的提醒。","Cuando termine la descarga, confirma que tienes el archivo. Cancela para mantener el aviso de cambios."],
    downloaded:["Project exported","项目已导出","Proyecto exportado"],
    readingPackage:["Opening project…","正在打开项目…","Abriendo proyecto…"],
    closeRecording:["Remove recording from this project","从项目移除记录","Quitar registro del proyecto"],
    restoreRecording:["Undo recording removal","撤销移除记录","Deshacer la eliminación del registro"],
    newProject:["New project","新建项目","Nuevo proyecto"], openProject:["Open project","打开项目","Abrir proyecto"],
    newHelp:["Neural data, with optional behavior video","神经数据，或神经数据与行为视频","Datos neurales, con vídeo opcional"],
    openHelp:["Restore linked data, alignment and annotations","恢复数据关联、时间对齐和标注","Restaurar datos, alineación y anotaciones"],
    projectName:["Project name","项目名称","Nombre del proyecto"], neural:["Neural data only","只导入神经数据","Solo datos neurales"],
    combined:["Neural data + video","神经数据 + 视频","Datos neurales + vídeo"],
    formats:["Supported inputs","支持的输入格式","Formatos compatibles"],
    kiloFormat:["Kilosort: spike_times.npy holds sample indices and spike_clusters.npy holds Unit IDs. Both are one-dimensional arrays in the same spike order. Use the actual sampling rate in Hz from params.py (sample_rate) or enter it manually.","Kilosort 的 spike_times.npy 存采样点序号，spike_clusters.npy 存 Unit ID。两者为等长的一维数组，按同一 spike 顺序排列。采样率取自 params.py 的 sample_rate，或手填实际 Hz。","En Kilosort, spike_times.npy contiene índices de muestra y spike_clusters.npy contiene ID de unidad. Ambos son vectores del mismo tamaño y orden. Usa la frecuencia real en Hz de params.py (sample_rate) o introdúcela a mano."],
    nwbBrief:["Drop an NWB 2.x HDF5 .nwb file with sorted Units.","拖入含已分选 Unit 的 NWB 2.x 文件（.nwb，HDF5）。","Suelta un .nwb HDF5 de NWB 2.x con unidades clasificadas."],
    kiloBrief:["Drop the folder with spike_times.npy and spike_clusters.npy. Supply Hz in params.py or enter it here.","拖入含 spike_times.npy 和 spike_clusters.npy 的文件夹。采样率用 params.py 提供，也可手填 Hz。","Suelta la carpeta con spike_times.npy y spike_clusters.npy. Indica los Hz en params.py o introdúcelos aquí."],
    neuralFields:["Required fields and array formats","查看字段与数组格式","Ver campos y formato de los vectores"],
    nwbFormat:["In the NWB Units table: id, spike_times (seconds), spike_times_index (end offset per Unit). Probe assignments, anatomy and events are optional.","NWB 的 Units 表需要 id、spike_times（秒）和 spike_times_index（每个 Unit 在时间数组中的结束索引）。探针、脑区和事件按文件内容显示。","En la tabla Units se necesitan id, spike_times (segundos) y spike_times_index (índice final de cada unidad). Se usan las sondas, regiones y eventos disponibles."],
    videoFormat:["Video: MP4 / WebM recommended; MOV / AVI / MKV depend on the browser codec. Select the video itself; align its time after linking.","视频：建议 MP4 / WebM；MOV / AVI / MKV 取决于浏览器能否解码。选择视频文件本身，关联后设置时间对齐。","Vídeo: MP4 / WebM recomendados; MOV / AVI / MKV dependen del códec del navegador. Selecciona el vídeo y alinea el tiempo."],
    processed:["This workspace reads sorted spikes; raw acquisition files need spike sorting first.","本界面读取已分选放电结果；原始采集文件需先完成 spike sorting。","Este espacio lee disparos clasificados; los archivos crudos necesitan spike sorting."],
    inspect:["Project files & features","项目文件与功能","Archivos y funciones"], saveProject:["Save project","保存项目","Guardar proyecto"],
    saveAs:["Save project as…","项目另存为…","Guardar proyecto como…"], savedProject:["Project saved","项目已保存","Proyecto guardado"],
    enter:["Continue to workspace","进入工作区","Ir al espacio de trabajo"], ready:["Available","可用","Disponible"], missing:["Not available yet","尚未配置","Aún no disponible"],
    reviewHelp:["Files are matched to the views below. You can start with the available features and add video later.","已按下列功能匹配文件。可以先使用已具备的功能，之后再添加视频。","Los archivos se vinculan a estas funciones. Puedes empezar y añadir vídeo después."],
    attention:["Needs attention","需留意","Requiere atención"],
    saveHelp:["The project file contains links, alignment and annotations. Keep the source data and video in their current locations.","项目文件保存数据引用、时间对齐和标注。原始数据和视频继续保留在当前存储位置。","El proyecto guarda enlaces, alineación y anotaciones. Conserva los datos y vídeos en sus ubicaciones."],
    activity:["Activity / raster / firing rate","活动图 / 放电点阵 / 发放率","Actividad / raster / tasa"],
    spatial:["Interval activity distribution","所选区间的空间活动分布","Distribución espacial del intervalo"],
    template:["Unit template & channel distribution","Unit 模板波形与通道分布","Plantilla y distribución de canales"],
    anatomy:["Brain regions / anatomical grouping","脑区显示 / 解剖分组","Regiones / grupos anatómicos"],
    video:["Video playback / behavior annotation","视频播放 / 行为标注","Vídeo / anotación conductual"],
    alignment:["Neural–video time alignment","神经与视频时间对齐","Alineación neural–vídeo"],
    activityHelp:["spike_times.npy + spike_clusters.npy + sampling rate","spike_times.npy + spike_clusters.npy + 采样率","spike_times.npy + spike_clusters.npy + frecuencia"],
    spatialHelp:["spike_positions.npy, or templates + spike_templates + channel_positions","spike_positions.npy，或 templates + spike_templates + channel_positions","spike_positions.npy, o templates + spike_templates + channel_positions"],
    templateHelp:["Dense templates.npy + spike_templates.npy + channel_positions.npy","稠密 templates.npy + spike_templates.npy + channel_positions.npy","templates.npy denso + spike_templates.npy + channel_positions.npy"],
    anatomyHelp:["Needs Unit region metadata in the catalog / NWB electrodes; channel positions alone do not name brain regions.","需要目录中的 Unit 脑区元数据或 NWB 电极脑区；channel_positions.npy 只提供探针坐标。","Requiere regiones de Units en el catálogo o electrodos NWB; las posiciones solas no identifican regiones."],
    videoHelp:["Choose a behavior video from this acquisition.","选择同次采集的行为视频。","Elige un vídeo de conducta de esta adquisición."],
    projectVideoHelp:["Add a video to this project. All probes in the project can share it.","添加到项目，项目内的 Probe 可共用这个视频。","Añade un vídeo al proyecto para compartirlo entre sus sondas."],
    alignmentHelpShort:["Import a frame-clock JSON, or align a shared event manually.","导入帧时钟 JSON，或手动对齐两边的同一个事件。","Importa un reloj JSON o alinea un evento común."],
    allen_units:["Matched NWB Units spike times and probe sampling rate","已匹配 NWB Units 放电时间及探针采样率","Tiempos de Units y frecuencia NWB vinculados"],
    allen_electrodes:["Matched NWB peak channels and electrode coordinates","已匹配 NWB 峰值通道与电极坐标","Canales pico y coordenadas NWB vinculados"],
    allen_no_templates:["This Allen import provides spikes and electrode positions, without Kilosort multichannel templates.","这类 Allen 导入提供放电与电极位置，不含 Kilosort 多通道模板。","Esta importación Allen contiene disparos y posiciones, sin plantillas multicanal Kilosort."],
    allen_regions:["Matched NWB electrode region metadata","已匹配 NWB 电极脑区信息","Regiones de electrodos NWB vinculadas"],
    manual_alignment:["A shared event is aligned manually","已手动对齐一个共同事件","Evento común alineado manualmente"],
    verified_clock:["Matched verified frame timestamps","已匹配验证过的逐帧时间","Marcas de fotograma verificadas"],
    linked_video:["Video linked; playback depends on its codec","视频已关联，可播放性取决于编码","Vídeo vinculado; reproducción según códec"],
    missingFiles:["Files not found: ","未找到文件：","Archivos no encontrados: "],
    addMissing:["Missing files by recording","按记录补充缺失文件","Archivos pendientes por registro"],
    invalidRecordingId:["Invalid recording ID in the event file.","录制事件文件中的记录 ID 无效。","El ID de registro del archivo de eventos no es válido."],
    template_layout:["Template dimensions or channel indexing do not match the supported dense layout.","模板维度或通道索引不符合当前支持的稠密布局。","Las dimensiones o índices no coinciden con la estructura densa compatible."],
    open:["Open / add data","打开 / 添加数据","Abrir / añadir datos"], folder:["Select Kilosort folder","选择 Kilosort 文件夹","Seleccionar carpeta Kilosort"],
    folderHelp:["Kilosort results or a folder containing NWB","Kilosort 结果，或包含 NWB 的文件夹","Resultados Kilosort o carpeta con NWB"],
    nwb:["Select NWB file","选择 NWB 文件","Seleccionar archivo NWB"], nwbHelp:["Choose processed neural spikes directly","直接选择已处理的神经放电数据","Seleccionar disparos neuronales procesados"],
    importMode:["Project contents","项目内容","Contenido del proyecto"],
    neuralInput:["Neural recordings","神经数据","Registros neuronales"],
    recordFiles:["Select files","选择文件","Seleccionar archivos"], recordFolder:["Select folder","选择文件夹","Seleccionar carpeta"],
    videoInput:["Behavior video","行为视频","Vídeo conductual"], clockInput:["Video time alignment (optional)","视频时间对齐（可选）","Sincronización de vídeo (opcional)"],
    videoFormats:["MP4 or WebM recommended. MOV, AVI and MKV depend on your browser's codecs.","推荐 MP4、WebM。MOV、AVI、MKV 需浏览器支持相应编码。","Se recomienda MP4 o WebM. MOV, AVI y MKV dependen de los códecs del navegador."],
    dropVideo:["Drop an MP4 or WebM here to play and annotate it. MOV, AVI and MKV depend on the browser codec.","拖入 MP4 或 WebM 就能播放和标注。MOV、AVI、MKV 取决于浏览器编码支持。","Suelta aquí un MP4 o WebM para reproducirlo y anotarlo. MOV, AVI y MKV dependen de los códecs del navegador."],
    clockFormats:["Drop the matching Allen .clock.json here to map video seconds to neural seconds. For a manual match, open Alignment after adding the recording and video.","拖入与该视频匹配的 Allen .clock.json，把视频秒数换算为神经记录秒数。也可添加信号和视频后点「时间对齐」，用共同事件手动对齐。","Suelta aquí el .clock.json de Allen de este vídeo para convertir segundos de vídeo a segundos del registro. También puedes abrir Alineación tras añadir el registro y el vídeo y usar un evento común."],
    manualOnly:["Open Alignment and enter the video time and neural time of the same event (seconds).","点「时间对齐」，填写同一事件的视频时间和神经记录时间（秒）。","Abre Alineación e introduce el tiempo del mismo evento en el vídeo y en el registro, en segundos."],
    videoReady:["Ready to play and annotate. To link neural time, also drop the recording on Neural activity & anatomy.","可以播放和标注。要与神经时间同步，将对应记录拖到「神经活动与解剖」。","Ya puedes reproducir y anotar. Para sincronizar los relojes, suelta la grabación en Actividad neural y anatomía."],
    selectRecording:["Choose recording","选择对应记录","Seleccionar registro"], removeInput:["Remove","移除","Quitar"], createImport:["Create project","创建项目","Crear proyecto"],
    appendTitle:["Add recordings to","添加记录到","Añadir registros a"], appendRecords:["Add recordings","添加记录","Añadir registros"],
    confirmSharedProject:["Share these {videos} videos across all {probes} recordings? Continue only if they belong to the same experiment and acquisition timebase.","将这 {videos} 段视频与全部 {probes} 条记录共享？请确认它们属于同一项目、同一次采集并使用相同的神经时间基准。","¿Compartir estos {videos} vídeos con los {probes} registros? Confirma que pertenecen al mismo experimento y base temporal de adquisición."],
    differentSessions:["These recordings have different acquisition session IDs. Open a separate project for the other session.","这些记录的采集会话 ID 不同，请在另一项目中打开不同会话。","Los registros pertenecen a sesiones diferentes. Abre la otra sesión en otro proyecto."],
    chooseClockVideo:["Choose the video for this frame clock","选择此帧时钟对应的视频","Elige el vídeo de este reloj"],
    chooseInputVideo:["Choose the matching video","选择对应的视频","Elige el vídeo correspondiente"],
    clockDuplicate:["Select only one clock per video.","每个视频只需选择一份帧时钟。","Selecciona un reloj por vídeo."],
    importedRecords:["Imported recordings: {count}","已导入 {count} 条记录","Registros importados: {count}"],
    noSignals:["Add neural data first.","请添加神经数据。","Añade datos neuronales."],
    noVideo:["Add a video or choose neural data only.","请添加行为视频，或选择只导入神经数据。","Añade un vídeo o selecciona solo datos neuronales."],
    duplicateFiles:["Repeated file paths. Put each recording in a separate folder and select their parent folder.","文件路径重复。请把每组记录放在单独的文件夹中，再选择它们的上级文件夹。","Hay rutas repetidas. Coloca cada registro en su propia carpeta y selecciona la carpeta superior."],
    eventsOccupied:["This recording already has an event list. Both lists have been kept in their original files.","此记录已有事件列表。请使用原文件核对两份列表后再导入。","Este registro ya tiene una lista de eventos. Revisa ambas listas en sus archivos de origen antes de importar."],
    alreadyPresent:["This recording is already in the project. For NWB, select a different probe. For Kilosort, use distinct folder paths.","项目中已有该记录。NWB 可重新选择其他探针；不同的 Kilosort 记录请使用可区分的文件夹路径。","Este registro ya existe. Para NWB elige otra sonda. Para Kilosort usa rutas de carpeta distintas."],
    folderRate:["Sampling rate (Hz) · params.py missing","采样率（Hz）· 缺少 params.py","Frecuencia (Hz) · falta params.py"],
    probePick:["Select one or more probes","选择探针（可多选）","Elige una o varias sondas"],
    allProbes:["Select all","全选","Seleccionar todas"], clearProbes:["Clear selection","清空选择","Borrar selección"],
    importProbes:["Use selected probes ({count})","使用所选探针（{count}）","Usar sondas seleccionadas ({count})"],
    probeAlreadyAdded:["Already added","已添加","Ya añadida"],
    allProbesOpen:["All probes from this file have already been added.","这份文件中的探针都已添加。","Todas las sondas de este archivo ya se han añadido."],
    combinedNext:["After selecting the neural recording, choose its behavior video.","选择神经记录后，继续选择对应的行为视频。","Tras seleccionar el registro, elige su vídeo."],
    later:["Add later","稍后添加","Añadir después"],
    title:["Open your experiment as a project","以项目组织你的实验","Organiza tu experimento en un proyecto"],
    intro:["Keep neural recordings, behavior video and annotations together.","把神经记录、行为视频和标注放在同一个项目中管理。","Gestiona registros neurales, vídeo y anotaciones juntos."],
    sourceNote:["Your files stay where they are. Project links are saved on this computer.","文件保留在原位置，关联关系会自动保存在这台电脑上。","Los archivos permanecen en su ubicación. Los enlaces se guardan en este equipo."],
    recent:["Recent projects","最近打开","Proyectos recientes"], catalog:["Open available recordings","打开已有记录","Abrir registros disponibles"],
    addVideo:["Add video","添加视频","Añadir vídeo"], changeVideo:["Change video","更换视频","Cambiar vídeo"],
    videoHint:["Add the matching video using the project controls above. Play, align and annotate it here.","从顶部项目操作栏添加对应视频，在这里播放、对齐和标注。","Añade el vídeo desde los controles del proyecto. Reproduce, alinea y anota aquí."],
    projectMenu:["Project ▾","项目 ▾","Proyecto ▾"],
    videoShort:["Add video","添加视频","Añadir vídeo"],
    schematic:["Schematic · no data loaded","示意模型 · 尚未载入数据","Esquema · sin datos"],
    sideLayout:["Side by side","左右布局","Lado a lado"],
    stackedLayout:["Stacked","上下布局","En vertical"],
    layoutLabel:["Workspace layout","工作区布局","Diseño del espacio"],
    sharedTime:["Neural time","共享神经时间","Tiempo neural"],
    probeDock:["Probe workspace","Probe 观察栏","Espacio de la sonda"],
    playbackOptions:["Playback details","播放细调","Ajustes de reproducción"],
    emptyWorkspace:["Experiment workspace","实验观察台","Espacio del experimento"],
    validationVideo:["Generate validation video","生成验证视频","Generar vídeo de validación"],
    align:["Alignment","时间对齐","Alineación"], linked:["Linked · alignment unverified","已关联 · 尚未验证同步","Vinculado · sincronización sin verificar"],
    synced:["Linked · frame clock verified","已关联 · 帧时间已验证","Vinculado · reloj verificado"],
    choose:["Choose a recording","选择要打开的记录","Elige un registro"], physical:["Each physical probe opens as a separate recording.","每支物理探针作为一条独立记录打开。","Cada sonda física se abre como un registro independiente."],
    sampling:["Original sampling rate (Hz)","原始采样率（Hz）","Frecuencia de muestreo original (Hz)"],
    working:["Reading your recording… Large files can take a few minutes.","正在读取记录…大文件可能需要几分钟。","Leyendo el registro… Los archivos grandes pueden tardar unos minutos."],
    picking:["Choose a file in the system window","请在系统窗口中选择文件","Elige un archivo en la ventana del sistema"],
    close:["Close","关闭","Cerrar"], cancel:["Cancel","取消","Cancelar"],
    openHtml:["Open the standalone Explorer HTML to import local files and save a project.","请在浏览器打开独立版 Explorer HTML，导入本地文件或保存项目。","Abre el HTML independiente de Explorer para importar archivos locales y guardar el proyecto."],
    nearby:["Video found nearby","发现同目录视频","Vídeo encontrado"], later:["Add video later","稍后添加视频","Añadir vídeo después"],
    nearbyHelp:["Choose the matching view. You can align its time after linking it.","选择与这条记录对应的视频，关联后可对齐时间。","Elige el vídeo correspondiente. Puedes alinear su tiempo después."],
    home:["Workspace","工作区","Espacio de trabajo"], return:["Return to recording","返回当前记录","Volver al registro"],
    emptyTitle:["Neural activity workspace","神经活动工作区","Espacio de actividad neural"],
    emptyHint:["Create or open a project to explore a recording here.","新建或打开项目，在这里浏览神经记录。","Crea o abre un proyecto para explorar un registro aquí."],
    emptyActivity:["Spike times and firing rates by Unit","各 Unit 的放电时刻与发放率","Tiempos y tasas de disparo por Unit"],
    emptyProbe:["Probe positions and regions","探针位置与脑区","Posiciones y regiones de la sonda"],
    emptyInterval:["Interval distribution · firing rate (Hz)","区间分布 · 发放率（Hz）","Distribución del intervalo · tasa (Hz)"],
    emptyTemplate:["Unit template · channel amplitude","Unit 模板 · 各通道振幅","Plantilla Unit · amplitud por canal"],
    emptyProbeHint:["Load neural data to match coordinates and templates.","导入神经数据后匹配坐标与模板。","Importa datos para vincular coordenadas y plantillas."],
    emptyAnnotation:["Behavior annotation","行为标注","Anotación conductual"],
    emptyAnnotationHint:["Mark a behavior during playback or import video labels (JSON).","播放时可以标记行为片段，也可导入已有的视频标注 JSON。","Marca intervalos durante la reproducción o importa etiquetas de vídeo (JSON)."],
    emptyUnit:["Unit inspection & comparison","Unit 检查与比较","Inspección y comparación de Units"],
    emptyUnitHint:["Select a Unit for raster, rate and template views; pin Units to compare on a shared time axis.","选择 Unit 查看点阵、发放率和模板；固定多个 Unit，在共同时间轴上比较。","Selecciona una Unit para ver raster, tasa y plantilla; fija Units para compararlas."],
    emptyVideo:["Behavior video · optional","行为视频 · 可选","Vídeo conductual · opcional"],
    enlarge:["Enlarge video","放大视频","Ampliar vídeo"],
    restore:["Restore layout","还原布局","Restaurar diseño"],
    manual:["Match a known event","对齐一个已知事件","Alinear un evento conocido"],
    follow:["Follow video with the neural cursor","神经光标跟随视频","Seguir el vídeo con el cursor neural"],
    alignmentHelp:["Use the same visible event in the video and neural recording. A manual match does not verify clock drift.","找出视频和神经记录中同一个事件，填写两边的时间。手动对齐不会验证时钟漂移。","Indica el mismo evento en vídeo y registro neural. El ajuste manual no verifica la deriva."],
    videoTime:["Video time (s)","视频时间（秒）","Tiempo del vídeo (s)"], neuralTime:["Neural time (s)","神经记录时间（秒）","Tiempo neural (s)"],
    apply:["Apply alignment","应用对齐","Aplicar alineación"], clock:["Import verified frame clock","导入已验证的帧时间文件","Importar reloj de fotogramas verificado"],
    clockHelp:["Allen frame-clock JSON with video SHA-256 identity (up to 50 MB)","含视频 SHA-256 校验的 Allen 帧时钟 JSON（最多 50 MB）","Reloj de fotogramas JSON de Allen con SHA-256 del vídeo (hasta 50 MB)"],
    error:["Could not open","未能打开","No se pudo abrir"],
  };
  const tr = key => copy[key]?.[document.documentElement.lang==="zh-CN"?1:document.documentElement.lang==="es"?2:0] || key;
  // Illustrations explain the empty workspace; they are never used as recording data.
  const illustration = (kind) => {
    const shapes = kind === "probe"
      ? `<path class="diagram-shaft" d="M42 18h26v168l-13 24-13-24z M102 18h26v168l-13 24-13-24z"/>${Array.from({length:10},(_,i)=>`<rect class="diagram-channel" x="${i%2?57:47}" y="${30+i*15}" width="6" height="6"/><rect class="diagram-channel" x="${i%2?117:107}" y="${30+i*15}" width="6" height="6"/>`).join("")}<g class="diagram-unit"><circle cx="55" cy="66" r="7"/><circle cx="115" cy="126" r="7"/><circle cx="55" cy="151" r="5"/></g><path class="diagram-guide" d="M63 66h85M123 126h25"/><path class="diagram-signal" d="M148 66h8l4-12 6 28 5-16h20M148 126h8l4-8 6 19 5-11h20"/><text x="148" y="46">Unit</text><text x="40" y="232">x · depth</text>`
      : kind === "video"
        ? `<rect class="diagram-shaft" x="14" y="18" width="192" height="122" rx="8"/><path class="diagram-guide" d="M26 43V30h20m128 0h20v13M26 113v15h20m128 0h20v-15"/><path class="diagram-signal" d="M100 60l28 20-28 20z"/><path class="diagram-guide" d="M16 164h188"/><rect class="diagram-channel" x="42" y="154" width="44" height="20" rx="3"/><rect class="diagram-channel" x="130" y="154" width="54" height="20" rx="3"/><path class="diagram-signal" d="M110 148v34"/>`
        : `<path class="diagram-guide" d="M12 48h196M12 91h196M12 134h196"/><path class="diagram-signal" d="M25 38v20m12-20v20m36-20v20m9-20v20m62-20v20m34-20v20M46 81v20m10-20v20m28-20v20m58-20v20m12-20v20m26-20v20M26 124v20m43-20v20m17-20v20m36-20v20m36-20v20m22-20v20"/><rect class="diagram-window" x="61" y="20" width="45" height="138"/>`;
    return `<svg class="workspace-illustration illustration-${kind}" viewBox="0 0 220 ${kind==="probe"?245:190}" role="img" aria-label="${esc(tr("schematic"))}"><title>${esc(tr("schematic"))}</title>${shapes}</svg>`;
  };
  class ProjectUI {
    constructor({state,video,annotations,openCatalog,home,resume,toast,folderFallback,onVideoExpand}) {
      Object.assign(this,{state,video,annotations,openCatalog,home,resume,toast,folderFallback,onVideoExpand});
      this.browserStore=annotations.store;
      annotations.linkedVideoFingerprint=(source,context,signal)=>this.linkedVideoFingerprint(source,context,signal);
      annotations.onSaveProject=()=>this.action("save-project");
      this.projects=[]; this.available=false;
      this.dialog=document.createElement("dialog"); this.dialog.className="project-dialog"; this.dialog.id="project-dialog";
      document.body.append(this.dialog);
      this.annotationEmpty=document.createElement("section");this.annotationEmpty.className="workspace-annotation-empty";this.annotationEmpty.dataset.importDrop="annotation";
      document.querySelector(".video-control-workbench").append(this.annotationEmpty);
      this.dialog.addEventListener("click",e=>{ if(e.target.closest("[data-close-project]")) this.dialog.close(); });
      this.menu=document.getElementById("open-menu");
      this.projectActions=document.createElement("div");this.projectActions.className="project-main-actions";
      document.querySelector(".open-control").before(this.projectActions);
      this.saveButton=document.createElement("button");this.saveButton.type="button";this.saveButton.id="save-project-button";this.saveButton.dataset.projectAction="save-project";this.saveButton.dataset.helpKey="hint.saveProject";
      document.querySelector(".open-control").after(this.saveButton);
      document.getElementById("open-folder-button").addEventListener("click",()=>this.toggleMenu());
      document.getElementById("home-button").addEventListener("click",()=>{video.pause();home();this.render();});
      document.addEventListener("click",e=>{
        const action=e.target.closest("[data-project-action]")?.dataset.projectAction;
        if(action) { this.toggleMenu(false); this.action(action,e.target.closest("[data-project-action]")); }
        if(!e.target.closest(".open-control")) this.toggleMenu(false);
      });
      document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!this.menu.hidden){this.toggleMenu(false);document.getElementById("open-folder-button").focus();}});
      for(const id of ["replace-video","choose-local-video"]) {
        document.getElementById(id).addEventListener("click",e=>{
          if(this.browserLocal) { e.stopImmediatePropagation(); this.action("video"); }
          else if(!state.activeRecording) { e.stopImmediatePropagation(); this.newProject("combined"); }
          else if(this.available && (state.dataMode==="database" || this.browserLocal)) { e.stopImmediatePropagation(); this.action("video"); }
          else if(id==="replace-video") document.getElementById("video-file-input").click();
        },true);
      }
      document.getElementById("video-alignment").addEventListener("click",()=>this.alignment());
      document.getElementById("data-status-button").addEventListener("click",e=>{
        if(this.active){e.stopImmediatePropagation();this.action("inspect");}
      },true);
      document.getElementById("expand-video").addEventListener("click",()=>{ this.onVideoExpand(); this.renderVideoExpand(); });
      document.addEventListener("keydown",e=>{
        if(e.key==="Escape" && !e.defaultPrevented && !document.querySelector("dialog[open]")) { this.onVideoExpand(false); this.renderVideoExpand(); }
      });
      new MutationObserver(()=>this.render()).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
      this.render(); this.refresh(true);
    }
    async request(path,body,signal) {
      const r=await fetch(path,{...(body ? {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)} : {cache:"no-store"}),signal});
      const value=await r.json(); if(!r.ok) throw new Error(value.message||value.error||r.statusText); return value;
    }
    async linkedVideoFingerprint(source,context,signal) {
      const projectId=this.active?.id, recordingId=context.recordingKey, descriptor=source?.descriptor;
      const videoStreamId=descriptor?.video_stream_id, url=this.video.elements.video.src;
      const selected=this.active?.videos?.[recordingId];
      if(!this.available || source?.kind!=="url" || !["http:","https:"].includes(location.protocol) ||
        !projectId || !this.active.recordingIds?.includes(recordingId) || !/^[0-9a-f]{32}$/.test(videoStreamId||"") ||
        descriptor?.recording_id!==recordingId || selected?.video_stream_id!==videoStreamId) {
        throw new Error("Open a selected local-project video before exchanging model features");
      }
      const media=new URL(url,location.href);
      if(media.origin!==location.origin || media.pathname!==`/api/local/media/${videoStreamId}` || media.search || media.hash) {
        throw new Error("Feature exchange requires the selected project's same-origin video stream");
      }
      const result=await this.request("/api/local/video-fingerprint",{projectId,recordingId,videoStreamId},signal);
      if(signal?.aborted || this.active?.id!==projectId || this.video.source!==source || source.descriptor!==descriptor ||
        descriptor.video_stream_id!==videoStreamId || this.video.elements.video.src!==url ||
        this.active?.videos?.[recordingId]?.video_stream_id!==videoStreamId) throw new DOMException("Cancelled","AbortError");
      const f=result.fingerprint;
      if(result.schema!=="neuropixels-video-fingerprint/1" || result.projectId!==projectId || result.recordingId!==recordingId ||
        result.videoStreamId!==videoStreamId || result.videoName!==context.videoName || result.videoSize!==context.videoSize ||
        f?.algorithm!=="sha256-ordered-chunks/1" || f.chunkBytes!==1048576 || f.size!==context.videoSize ||
        !Number.isSafeInteger(f.size) || f.size<=0 || f.size>512*1024*1024 || !/^[a-f0-9]{64}$/.test(f.digest)) {
        throw new Error("Invalid selected-video content fingerprint response");
      }
      return f;
    }
    async refresh(restore=false) {
      if(!["http:","https:"].includes(location.protocol)) return;
      try { this.projects=(await this.request("/api/local/projects")).projects; this.available=true;
        const c=await this.request("/api/catalog"); this.catalogCount=c.recordings?.length||0;
      } catch { this.available=false; }
      this.render();
      if(restore&&this.state.activeRecording)this.recordingChanged(this.state.activeRecording);
    }
    toggleMenu(value=this.menu.hidden) { this.menu.hidden=!value; document.getElementById("open-folder-button").setAttribute("aria-expanded",String(value)); if(value)this.menu.querySelector("button")?.focus(); }
    render() {
      const button=(key,action,sub="")=>`<button type="button" data-project-action="${action}"><strong>${esc(tr(key))}</strong>${sub?`<span>${esc(tr(sub))}</span>`:""}</button>`;
      document.getElementById("open-folder-button").textContent=tr("projectMenu");
      this.projectActions.innerHTML=`<button type="button" class="primary-button" data-project-action="new" data-help-key="hint.newProject">${esc(tr("newProject"))}</button><button type="button" data-project-action="open-project" data-help-key="hint.openProject">${esc(tr("openProject"))}</button><button type="button" data-project-action="video" ${this.state.activeRecording?"":"disabled"} title="${esc(tr(this.state.activeRecording?"videoHelp":"emptyHint"))}">${esc(tr(this.video.source?"changeVideo":"videoShort"))}</button>`;
      document.querySelector(".workspace-layout-choice").setAttribute("aria-label",tr("layoutLabel"));
      document.querySelector('[data-workspace-layout="side"] [data-layout-label]').textContent=tr("sideLayout");
      document.querySelector('[data-workspace-layout="stacked"] [data-layout-label]').textContent=tr("stackedLayout");
      document.querySelector('[data-design-copy="sharedTime"]').textContent=tr("sharedTime");
      document.querySelector('[data-design-copy="playbackOptions"]').textContent=tr("playbackOptions");
      document.getElementById("probe-dock").setAttribute("aria-label",tr("probeDock"));
      document.getElementById("toggle-probe-dock").title=tr("probeDock");
      this.saveButton.textContent=tr("saveProject");this.saveButton.disabled=!this.state.activeRecording;
      const status=document.getElementById("data-status-summary");
      if(this.active){status.removeAttribute("data-i18n");status.textContent=tr("inspect");}
      document.getElementById("home-button").title=tr("home");
      document.getElementById("home-button").setAttribute("aria-label",tr("home"));
      this.menu.innerHTML=button("newProject","new")+button("openProject","open-project")+(this.state.activeRecording?button("inspect","inspect")+button("addVideo","video")+button("saveProject","save-project")+button("saveAs","save-as"):"")+(this.catalogCount?button("catalog","catalog"):"")+(this.projects.length?`<div class="project-menu-heading">${esc(tr("recent"))}</div>`:"")+this.projects.slice(0,6).map(p=>`<button data-project-action="recent" data-id="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>${esc(p.file||p.source||p.recordingIds.join(", "))}</span></button>`).join("");
      if(this.state.activeRecording) this.menu.insertAdjacentHTML("beforeend",`<details class="project-validation"><summary>${esc(tr("validationVideo"))}</summary>${button("validationVideo","validation-video")}</details>`);
      for(const [id,key] of [["replace-video","changeVideo"],["choose-local-video","addVideo"],["video-alignment","align"]]) {
        const node=document.getElementById(id); node.removeAttribute("data-i18n"); node.textContent=tr(key);
      }
      const empty=document.getElementById("video-empty");
      empty.querySelector("strong").removeAttribute("data-i18n"); empty.querySelector("strong").textContent=tr("emptyVideo");
      empty.querySelector("p").removeAttribute("data-i18n"); empty.querySelector("p").textContent=tr("videoHint");
      empty.querySelector(".video-empty-mark").innerHTML=illustration("video");
      this.renderVideoExpand();
      this.syncVideo();
    }
    renderVideoExpand() {
      const button = document.getElementById("expand-video");
      button.textContent = tr(this.state.videoEnlarged ? "restore" : "enlarge");
      button.title = button.textContent;
    }
    serviceClockTarget() {
      const recordingId=this.state.activeRecording?.databaseId, stream=this.video.source?.descriptor?.video_stream_id;
      if(this.browserLocal || !this.available || !recordingId?.startsWith("allen-") || !stream ||
          this.active?.videos?.[recordingId]?.video_stream_id!==stream)return null;
      return {projectId:this.active.id,recordingId};
    }
    async acceptClockFile(file) {
      const target=this.serviceClockTarget(), source=this.video.source;
      const message=key=>window.NeuropixelsI18n.translate(document.documentElement.lang,"drop."+key);
      if(!target)throw Error(message("native"));
      if(file.size>50_000_000)throw Error(tr("clockHelp"));
      let clock;
      try { clock=JSON.parse(await file.text()); } catch { throw Error(message("clockFormat")); }
      if(clock?.schema!=="allen-video-clock/1" || !clock.session_id)throw Error(message("clockFormat"));
      const current=this.serviceClockTarget();
      if(this.video.source!==source || current?.projectId!==target.projectId || current?.recordingId!==target.recordingId)throw Error(message("changed"));
      await this.pick("mapping",{...target,clock});
    }
    videoNote() {
      const {source,mapping}=this.video;
      if (!source) return {text:"",severity:"neutral"};
      const verified=mapping.verificationStatus==="verified" && mapping.method!=="unmapped";
      const drop=key=>window.NeuropixelsI18n.translate(document.documentElement.lang,"drop."+key,{file:source.name});
      const clockAction=!verified && this.serviceClockTarget() ? drop("clockDrop") : null;
      if (source.descriptor?.clockIssue) return {text:source.descriptor.clockIssue,severity:"error",clockAction};
      return {text:clockAction && !source.descriptor?.timeMapping?.matched_event_count ? drop("needAlignment") : tr(verified?"synced":"linked"),
        severity:verified?"success":"warning",clockAction};
    }
    renderVideoNote() {
      const note=document.getElementById("video-link-note");
      const {text,severity,clockAction}=this.video.source && this.video.elements.panel?.classList.contains("has-error")
        ? {text:this.video.elements.error.textContent,severity:"error"} : this.videoNote();
      if(note.textContent!==text)note.textContent=text;
      if(note.dataset.severity!==severity)note.dataset.severity=severity;
      const row=note.parentElement, button=document.getElementById("choose-clock-file");
      row.hidden=!text && !clockAction;
      row.classList.toggle("file-drop-slot",!!clockAction);
      if(row.dataset.severity!==severity)row.dataset.severity=severity;
      if(clockAction)row.dataset.importDrop="clock";
      else row.removeAttribute("data-import-drop");
      button.hidden=!clockAction;
      if(clockAction && button.textContent!==clockAction)button.textContent=clockAction;
      if(clockAction && !this.browserLocal)button.title=tr("clockHelp");
    }
    syncVideo() {
      this.renderVideoNote();
      document.getElementById("replace-video").hidden=!this.video.source;
      document.getElementById("video-alignment").hidden=!this.video.source;
      document.getElementById("annotation-toggle").disabled=!this.video.source;
      this.renderEmptyWorkspace();
    }
    renderEmptyWorkspace() {
      const empty=!this.state.activeRecording;
      document.getElementById("app-shell").classList.toggle("workspace-unloaded",empty);
      document.getElementById("find-unit-button").disabled=empty;
      document.getElementById("data-status-button").disabled=empty;
      const intro=document.getElementById("workspace-empty-intro");intro.hidden=!empty;
      this.annotationEmpty.hidden=!!this.video.source;
      this.annotationEmpty.innerHTML=`<div class="annotation-schematic" aria-hidden="true"><i></i><i></i><i></i><b></b></div><strong>${esc(tr("emptyAnnotation"))}</strong><p>${esc(tr("emptyAnnotationHint"))}</p>`;
      if(!empty)return;
      document.getElementById("experiment-recording-name").textContent=tr("emptyWorkspace");
      document.getElementById("experiment-time-readout").textContent="— s";
      document.getElementById("activity-status").textContent=tr("emptyActivity");
      intro.innerHTML=`<div>${illustration("activity")}<h2>${esc(tr("emptyTitle"))}</h2><p>${esc(tr("emptyHint"))}</p>${this.browserLocal?"":"<small>Kilosort · Allen Brain ecephys NWB</small>"}</div><div class="workspace-unit-empty"><strong>${esc(tr("emptyUnit"))}</strong><p>${esc(tr("emptyUnitHint"))}</p></div>`;
      document.getElementById("mini-probe").innerHTML=`<header><strong>Probe</strong><span>${esc(tr("emptyProbe"))}</span></header><div class="workspace-probe-empty">${illustration("probe")}<small>${esc(tr("schematic"))}</small><strong>${esc(tr("emptyInterval"))}</strong><strong>${esc(tr("emptyTemplate"))}</strong><p>${esc(tr("emptyProbeHint"))}</p></div>`;
    }
    show(html) { this.dialog.innerHTML=`<button type="button" class="dialog-close" data-close-project aria-label="${esc(tr("close"))}">×</button>${html}`; if(!this.dialog.open)this.dialog.showModal(); }
    importText(key) { return tr(key); }
    newProject(mode="neural") {
      this.creation=null;
      this.show(`<h2>${esc(tr("newProject"))}</h2><form class="project-create"><label class="project-name">${esc(tr("projectName"))}<input name="projectName" required maxlength="200" placeholder="Experiment 01" autocomplete="off"></label><fieldset class="project-modes"><legend>${esc(tr("newHelp"))}</legend><label><input type="radio" name="mode" value="neural" checked>${esc(tr("neural"))}</label><label><input type="radio" name="mode" value="combined">${esc(tr("combined"))}</label></fieldset><h3>${esc(tr("formats"))}</h3><div class="project-format"><strong>Kilosort</strong><p>${esc(tr("kiloFormat"))}</p><button type="submit" value="folder">${esc(tr("folder"))}</button></div><div class="project-format"><strong>Allen Brain · NWB</strong><p>${esc(tr("nwbFormat"))}</p><button type="submit" value="nwb">${esc(tr("nwb"))}</button></div><p>${esc(tr("videoFormat"))}</p><small>${esc(tr("processed"))}</small></form>`);
      const form=this.dialog.querySelector("form");
      form.elements.mode.value=mode;
      const videoInfo=form.querySelector(".project-format:last-of-type + p");
      const update=()=>{videoInfo.hidden=form.elements.mode.value!=="combined";videoInfo.textContent=tr("combinedNext")+" "+tr("videoFormats");};
      form.elements.mode.forEach(input=>input.addEventListener("change",update));update();
      form.onsubmit=e=>{e.preventDefault();this.creation={projectName:form.elements.projectName.value.trim(),mode:form.elements.mode.value};if(this.creation.projectName)this.pick(e.submitter.value);};
    }
    async activate(project) {
      await this.annotations.flush();
      this.video.pause();
      // Clear the old source before switching draft stores, including same-recording projects.
      this.video.setRecording(null,[]);
      this.active=project;
      const id=project?.id;
      await this.annotations.useStore(id ? {request:async(key,document)=>{
        const result=await this.request("/api/local/annotations",{projectId:id,key,...(document?{document}:{})});
        if(document&&this.active?.id===id)this.active.dirty=true;
        return result.document;
      }} : this.browserStore);
    }
    async ensureProject() {
      const rid=this.state.activeRecording?.databaseId;
      if(!rid)throw new Error(tr("openHtml"));
      if(this.active?.recordingIds.includes(rid))return;
      const result=await this.request("/api/local/adopt",{recordingId:rid});
      // Preserve a pre-existing browser draft when adopting a catalog recording.
      const draft=this.annotations.doc;
      await this.activate(result.project);
      if(draft)await this.request("/api/local/annotations",{projectId:this.active.id,key:draft.context.key,document:draft});
      await this.openCatalog([rid]);
      await this.refresh();
    }
    checkSymbol(severity) {
      const icon=severity==="success"?"✓":severity==="warning"?"!":"×";
      const label=severity==="success"?"ready":severity==="warning"?"attention":"error";
      return `<td class="check-symbol" data-severity="${severity}"><span role="img" aria-label="${esc(tr(label))}">${icon}</span></td>`;
    }
    async inspect(nearby=[],addingVideo=false) {
      await this.ensureProject();
      const result=await this.request("/api/local/checks",{projectId:this.active.id,recordingId:this.state.activeRecording.databaseId});
      const help={activity:"activityHelp",spatial:"spatialHelp",template:"templateHelp",anatomy:"anatomyHelp",video:"videoHelp",alignment:"alignmentHelpShort"};
      if(addingVideo){
        this.show(`<h2>${esc(tr("videoInput"))}</h2><p>${esc(this.active.name)} · ${esc(tr("videoFormats"))}</p>${nearby.length?`<div class="source-candidates">${nearby.map(v=>`<button data-video-token="${esc(v.token)}">${esc(v.name)}</button>`).join('')}</div>`:''}<div class="project-footer"><button type="button" data-close-project>${esc(tr("later"))}</button><button type="button" class="project-primary" data-project-action="video">${esc(tr("recordFiles"))}</button></div>`);
      }else
      this.show(`<h2>${esc(this.active.name)}</h2><p>${esc(tr("reviewHelp"))}</p><table class="project-checks"><caption>${esc(tr("inspect"))}</caption><tbody>${result.checks.map(c=>`<tr>${this.checkSymbol(Object.keys(c.issues).length?"error":c.ready&&c.detail!=="manual_alignment"?"success":"warning")}<td><strong>${esc(tr(c.key))}</strong><small>${esc(tr(c.detail||help[c.key]))}</small>${!c.ready&&c.missingFiles?.length?`<small>${esc(tr("missingFiles")+c.missingFiles.join(", "))}</small>`:""}${Object.keys(c.issues).length?`<small class="project-link-issue">${esc(Object.values(c.issues).join(" · "))}</small>`:""}</td></tr>`).join("")}</tbody></table>${nearby.length?`<details open><summary>${esc(tr("nearby"))}</summary><div class="source-candidates">${nearby.map(v=>`<button data-video-token="${esc(v.token)}">${esc(v.name)}</button>`).join("")}</div></details>`:""}<details><summary>${esc(tr("formats"))}</summary><p>${esc(tr("kiloFormat"))}</p><p>${esc(tr("nwbFormat"))}</p><p>${esc(tr("videoFormat"))}</p><p class="matched-files">${esc(Object.values(result.matched).join(" · "))}</p></details><p>${esc(tr("saveHelp"))}</p><div class="project-footer"><button data-project-action="video">${esc(tr("addVideo"))}</button><button data-project-action="save-project">${esc(tr("saveProject"))}</button><button class="project-primary" data-close-project>${esc(tr("enter"))}</button></div>`);
      this.dialog.querySelectorAll("[data-video-token]").forEach(b=>b.onclick=async()=>{
        try{const r=await this.request("/api/local/attach",{projectId:this.active.id,recordingId:this.state.activeRecording.databaseId,token:b.dataset.videoToken});this.active=r.project;await this.refresh();this.video.loadUrl(r.video.media_url,r.video);await this.inspect();}catch(e){this.failure(e);}
      });
    }
    selectFiles({directory=false,multiple=false,accept=''}={}) {
      return new Promise(resolve=>{
        const input=document.createElement('input');input.type='file';input.accept=accept;input.multiple=multiple;
        if(directory){input.webkitdirectory=true;input.multiple=true;}
        input.style.display='none';document.body.append(input);
        input.onchange=()=>{const files=[...input.files];input.remove();resolve(files);};
        input.oncancel=()=>{input.remove();resolve([]);}; input.click();
      });
    }
    async pickWorkspaceJson(kind) {
      const project=this.active, recording=this.state.activeRecording, source=this.video.source;
      const [file]=await this.selectFiles({accept:'.json'});
      if(file && project===this.active && recording===this.state.activeRecording && source===this.video.source)
        await this.importWorkspaceFiles([file],kind);
    }
    async action(action,node) {
      try {
        if(action==="create-annotation"){
          if(!this.annotations.doc || this.annotations.quickMark){
            const hint=this.annotations.quickMark ? "labels.stopBeforeNew" : "labels.dropBeforeVideo";
            return this.toast(window.NeuropixelsI18n.translate(document.documentElement.lang,hint),"warning");
          }
          return this.annotations.openLabelSettings(true,{newAnnotation:true});
        }
        if(action==="import-clock"){
          const target=this.serviceClockTarget();
          if(target)await this.pick("clock",target);
          return;
        }
        if(action==="validation-video")return document.getElementById("generate-synthetic-video").click();
        if(action==="new")return this.newProject();
        if(action==="open-project"){await this.annotations.flush();return await this.pick(action);}
        if(action==="inspect")return await this.inspect();
        if(action==="save-project"||action==="save-as") {
          await this.ensureProject();await this.annotations.flush();
          return await this.pick("save-project",{projectId:this.active.id,saveAs:action==="save-as"});
        }
        if(["folder","nwb"].includes(action)) return await this.pick(action);
        if(action==="home") {this.video.pause();this.home();this.render();}
        if(action==="return")this.resume();
        if(action==="catalog"){await this.activate(null);await this.openCatalog();}
        if(action==="recent") {const p=this.projects.find(p=>p.id===node.dataset.id);if(p){await this.activate(p);await this.openCatalog(p.recordingIds);await this.inspect();}}
        if(action==="video"){await this.ensureProject();await this.annotations.flush();await this.pick("video",{projectId:this.active.id,recordingId:this.state.activeRecording?.databaseId});}
      }catch(e){this.failure(e);}
    }
    failure(error) {
      const warning=error.severity==="warning";
      this.show(`<h2>${esc(tr(warning?"attention":"error"))}</h2><p role="alert" data-severity="${warning?"warning":"error"}">${esc(error.message)}</p>`);
    }
    async pick(kind,payload={}) {
      if(!this.available) {
        if(kind==="folder")this.folderFallback();
        else this.show(`<p>${esc(tr("openHtml"))}</p>`);
        return;
      }
      if(this.busy){if(payload.clock)throw Error(tr("working"));return;}
      this.busy=true;
      try {
        this.show(`<h2>${esc(tr(["import","mapping"].includes(kind)?"working":"picking"))}</h2><div class="project-progress" role="progressbar"></div>`);
        let job=await this.request("/api/local/actions",{kind,...payload});
        while(job.status==="working") {await new Promise(r=>setTimeout(r,500));job=await this.request("/api/local/jobs/"+job.id);}
        if(job.status==="error")throw new Error(job.message);
        this.dialog.close();
        if(job.status==="cancelled"){this.creation=null;return;}
        const result=job.result;
        if(result.candidates) {this.candidates(result);return;}
        if(result.saved){this.active=result.project;await this.refresh();this.toast(tr("savedProject")+" · "+result.project.file);return;}
        if(result.opened){this.annotations.doc=null;this.annotations.key=null;}
        if(result.project)this.active=result.project;
        await this.refresh();
        if(result.video) {
          const at=this.video.currentVideoTime;
          this.video.loadUrl(result.video.media_url,result.video);
          if(["clock","mapping"].includes(kind)) this.video.elements.video.addEventListener("loadedmetadata",()=>this.video.seekVideo(at),{once:true});
          if(kind==="video")await this.inspect();
          return;
        }
        if(result.recordingId) {
          await this.activate(result.project);
          await this.openCatalog([result.recordingId]);
          const combined=this.creation?.mode==="combined"&&kind==="import";
          this.creation=null;
          await this.inspect(result.project.mode==="combined"?result.nearbyVideos||[]:[],combined);
        }
      }catch(error){
        if(payload.clock){this.dialog.close();throw error;}
        this.failure(error);
      }finally{this.busy=false;}
    }
    candidates(result) {
      this.show(`<h2>${esc(tr("choose"))}</h2><p>${esc(result.sourceName)} · ${esc(tr("physical"))}</p><div class="source-candidates">${result.candidates.map(c=>`<div><button data-candidate="${esc(c.candidateId)}"><strong>${esc(c.name)}</strong><span>${esc(c.kind.toUpperCase())}${c.units?` · ${c.units} Units`:""}</span></button>${c.kind==="kilosort"&&!c.sampleRate?`<label>${esc(tr("sampling"))}<input type="number" min="1" data-rate="${esc(c.candidateId)}" placeholder="Hz" required></label>`:""}</div>`).join("")}</div>`);
      this.dialog.querySelectorAll("[data-candidate]").forEach(b=>b.addEventListener("click",()=>{
        const field=this.dialog.querySelector(`[data-rate="${b.dataset.candidate}"]`);
        if(field&&!field.reportValidity())return;
        this.pick("import",{candidateId:b.dataset.candidate,sampleRate:field?.value,...this.creation});
      }));
    }
    recordingChanged(recording) {
      const id=recording?.databaseId;
      const descriptor=this.active?.recordingIds.includes(id)?this.active.videos[id]:null;
      if(descriptor) this.video.loadUrl(descriptor.media_url,descriptor);
      this.render();
      if(this.active?.recordingIds.includes(id))document.getElementById("dataset-title").textContent=this.active.name;
      this.saveButton.hidden=!recording;
      this.syncVideo();
    }
    alignment() {
      const local=Boolean(this.active?.videos[this.state.activeRecording?.databaseId]);
      this.show(`<h2>${esc(tr("align"))}</h2><p>${esc(tr(this.video.mapping.verificationStatus==="verified"?"synced":"alignmentHelp"))}</p><div class="alignment-fields"><label>${esc(tr("videoTime"))}<input data-video-at type="number" step="0.001" value="${this.video.currentVideoTime.toFixed(3)}"></label><label>${esc(tr("neuralTime"))}<input data-neural-at type="number" step="0.001" value="${Number(this.state.experimentView.cursorTime||0).toFixed(3)}"></label></div><button data-apply-alignment>${esc(tr("apply"))}</button>${local?`<hr><button data-clock>${esc(tr("clock"))}</button><p>${esc(tr("clockHelp"))}</p>`:""}`);
      this.dialog.querySelector("[data-apply-alignment]").addEventListener("click",()=>{
        const videoAt=Number(this.dialog.querySelector("[data-video-at]").value), neuralAt=Number(this.dialog.querySelector("[data-neural-at]").value);
        const offset=neuralAt-videoAt;
        if(!Number.isFinite(offset))return;
        if(local)this.pick("mapping",{projectId:this.active.id,recordingId:this.state.activeRecording.databaseId,offset,videoAt,neuralAt});
        else {const field=this.video.elements.offset;field.value=offset;field.dispatchEvent(new Event("change",{bubbles:true}));this.dialog.close();}
      });
      this.dialog.querySelector("[data-clock]")?.addEventListener("click",()=>this.pick("clock",{projectId:this.active.id,recordingId:this.state.activeRecording.databaseId}));
      this.dialog.insertAdjacentHTML("beforeend",`<label class="alignment-follow"><input type="checkbox" data-alignment-follow ${this.video.elements.follow.checked?"checked":""}>${esc(tr("follow"))}</label>`);
      this.dialog.querySelector("[data-alignment-follow]").onchange=e=>{this.video.elements.follow.checked=e.target.checked;this.video.elements.follow.dispatchEvent(new Event("change",{bubbles:true}));};
    }
  }
  window.NeuropixelsProjectUI=ProjectUI;
})();
