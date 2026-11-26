# Guía de uso de Neuropixels Explorer

## Primera importación

Abre el HTML de Explorer en Chrome o Edge. Para empezar, suelta **un archivo NWB o una carpeta de Kilosort** sobre **Actividad neural y anatomía**. También puedes pulsar **Importar archivos…**. Incorpora el vídeo, los eventos o la anatomía según lo que quieras revisar.

### 1. Ver los spikes

- **NWB.** Suelta un archivo NWB 2.x en HDF5 sobre el panel neural. Para ver los disparos se necesitan `id`, `spike_times` (segundos) y `spike_times_index` (índice final por unidad) en la tabla Units. Se lee primero /units o, si falta, una única tabla Units identificada en un módulo de procesamiento. Si se identifican varios grupos, elige los que deseas abrir. Los electrodos, las regiones y los eventos son opcionales. Si solo hay voltaje crudo o LFP, clasifica primero los disparos.
- **Kilosort.** Suelta la carpeta con `spike_times.npy` y `spike_clusters.npy`. Los dos vectores deben tener una entrada por spike en el mismo orden. El primero contiene índices de muestra y el segundo, el ID de la unidad. Añade `params.py` con la frecuencia real, por ejemplo `sample_rate = 30000` para 30 kHz, o introduce ese valor en Hz cuando se te indique.
- **Opcionales en Kilosort.** Para la posición estimada de los spikes usa `spike_positions.npy`. Para la distribución de la plantilla por canales conserva `templates.npy`, `spike_templates.npy` y `channel_positions.npy` de la misma exportación. Incluye `channel_shanks.npy` si la exportación identifica las ramas. La primera comprobación consiste en pulsar una unidad y verificar que el eje temporal y los spikes coincidan con un tramo conocido del registro.

### 2. Alinear la actividad a un estímulo o una conducta

Busca primero el evento en **Etiquetas del registro**. Si ya aparece en el NWB, selecciónalo en **Respuestas a eventos**. Para añadir tiempos experimentales externos, selecciona la grabación y suelta `explorer-events.json` sobre **Etiquetas del registro**. El formato usa segundos del reloj neural. Una lista suelta de tiempos en Excel, CSV o NPY requiere conversión previa.

Con un registro sin eventos, pulsa **Descargar JSON de ejemplo** junto a las etiquetas del registro. El archivo ya incluye el identificador del registro: sustituye los eventos de ejemplo por los tuyos y suéltalo en el mismo sitio. Para escribirlo a mano, copia el ejemplo de abajo en `explorer-events.json` y sustituye `Exp1` por el `recordingId` de **Detalles de datos**. Para marcas medidas en muestras con el mismo origen y reloj, divide por la frecuencia de adquisición en Hz. Alinea primero los tiempos de cualquier otro dispositivo.

`{"schema":"neuropixels-events/1","recordingId":"Exp1","timebase":"neural_seconds","events":[{"id":"cue-1","sourceId":"1","sourceKind":"experiment","type":"cue","kind":"point","start":12.4,"conditions":{"stimulus":"rock"}},{"id":"cue-2","sourceId":"2","sourceKind":"experiment","type":"cue","kind":"point","start":23.1,"conditions":{"stimulus":"tone"}}]}`

Cada `id` debe ser único. Para un evento con duración usa `"kind":"interval"` y añade `"end"` con el instante final en segundos, posterior a `"start"`. Las columnas de ensayo se incluyen en `conditions`; en el ejemplo, el campo `stimulus` permite comparar `rock` y `tone`. Para declarar una pausa de adquisición, abre los parámetros avanzados de **Respuestas a eventos** e introduce los tramos válidos, por ejemplo `[[0,30],[45,90]]`. Se excluyen los ensayos cuya ventana cruza la pausa. Si el NWB aporta los intervalos de observación de las unidades, puedes utilizar los del archivo.

### 3. Localizar las unidades en la sonda y en el cerebro

Los electrodos de un NWB Allen compatible ya aportan posición y región. Si tienes datos anatómicos externos, utiliza una de estas opciones con los ID reales de tu grabación. En un CSV, escribe las cabeceras en la primera línea y un dato por columna en cada línea posterior.

- **Región asignada a cada unidad.** Suelta el CSV sobre **Actividad neural y anatomía**. Cabecera `experiment,cluster_id,region`. Ejemplo de fila `Exp1,7,CA1`.
- **Región a lo largo de la sonda.** Suelta el CSV en el panel de la sonda. Cabecera `experiment,shank,depth_um,region`. Ejemplo de fila `Exp1,0,420,CA1`. Usa el número de rama del registro y el mismo origen de profundidad, en micrómetros. El programa asocia la trayectoria con las unidades que tienen rama y profundidad.
- **Metadatos de una única carpeta Kilosort.** Puedes guardar `explorer-units.json` junto a los dos NPY antes de soltar la carpeta. Ejemplo completo para la unidad 7: `{"units":[{"cluster_id":7,"x_um":20,"probe_depth_um":420,"shank_id":0,"brain_region":"CA1"}]}`. Así queda explícita la grabación a la que pertenecen las coordenadas y la región.

El cruce de las tablas CSV usa el número de experimento. Dos registros como `mouse-016-A` y `rat-016-B` pueden coincidir por el número 16. Para esos nombres, usa los metadatos dentro de cada carpeta y comprueba una unidad cuya región conozcas. Si solo tienes una imagen histológica o un mapa en PNG, primero exporta de tu herramienta anatómica la correspondencia entre unidad y región, o entre rama, profundidad y región.

### 4. Añadir vídeo, etiquetas y sincronización

- **Reproducir o anotar.** Suelta el vídeo en **Vídeo conductual**. Se recomiendan MP4 o WebM. En la pestaña de la cámara, pulsa la entrada de **Anotaciones de vídeo** para crear una etiqueta, o suelta allí un `annotations.project.json` exportado por Explorer para ese vídeo. El vídeo basta para empezar a marcar.
- **Vincular vídeo y registro.** Con ambos abiertos, elige la pestaña de la cámara y pulsa **Alineación → Alinear un evento conocido**. Introduce el instante del mismo suceso en ambos relojes, por ejemplo 10,0 segundos en el vídeo y 12,4 en el registro. Pulsa **Aplicar alineación**. Esta opción, disponible también con Kilosort, aplica un desplazamiento constante de 2,4 segundos. Comprueba otro suceso al final para detectar deriva.
- **Reloj de cámara Allen.** Si dispones del JSON verificado de formato `allen-video-clock/1`, suéltalo en la franja del reloj bajo el título del vídeo correspondiente. Se comprueban la sesión y la huella SHA-256 del vídeo. Una columna de pulsos TTL, una hoja de tiempos o el archivo Allen `*_timestamps.npy` requieren preparación previa para el ajuste automático.

Para comprobar el recorrido completo, elige un tipo de evento, ejecuta **Respuestas a eventos** y pulsa una fila del mapa de calor. Verás los spikes de esa unidad ensayo por ensayo. Pulsa un ensayo conocido y comprueba el instante que se abre en el registro y, si has alineado una cámara, en el vídeo.

Las señales y los análisis comparten la barra de pestañas. Las pestañas se acortan al llenarse la barra. Sitúa el puntero encima para leer el nombre completo y usa la rueda para recorrerlas. Haz clic derecho en una unidad para añadir o quitar una marca. En Ajustes puedes crear marcas y cambiar sus colores. Al guardar el proyecto se conservan las marcas de cada unidad. Pulsa una unidad en la sonda de señales para localizarla. En Respuestas a eventos, elige la selección de unidades en la sonda para dibujar un rectángulo o lazo. El lazo sigue al puntero. Suelta para seleccionar las unidades del contorno. En Rectángulo o Lazo, mantén Mayús y arrastra para desplazar el mapa ampliado. Mantén Ctrl mientras dibujas para añadir unidades. En el modo de selección, pulsa en un espacio vacío para limpiar la selección. Usa Desplazar para mover el mapa ampliado. En Zoom, pulsa para ampliar, usa Mayús y un clic para reducir o dibuja un rectángulo para ampliar esa zona. La rueda centra el zoom en el puntero y 100 % recupera la sonda completa. En los selectores de sonda y spikes, arrastra el borde derecho o inferior para cambiar el ancho o el alto. La esquina inferior derecha permite ajustar ambos.

Al iniciar un análisis se agrupan todos los ensayos. Aciertos y fallos se determinan con las etiquetas y el intervalo elegidos. Para derivar aciertos y fallos de dos etiquetas, elige el evento de referencia y activa la regla de dos etiquetas en la comparación de ensayos. Selecciona la etiqueta de respuesta. La ventana inicial en los ajustes avanzados incluye desde 0,15 s hasta antes de 0,75 s. Los rombos del raster indican otros inicios de la misma etiqueta. Para ver los ensayos aislados, activa la exclusión de repeticiones y repite el análisis.

Después de comparar dos condiciones, selecciona 5J–5M junto a **Ver ensayos** en la pestaña de respuestas. J mantiene la misma unidad en cada fila de ambos mapas. K superpone las dos curvas medias de cada grupo en Hz. En L puedes elegir varias unidades y un ensayo por condición. Pulsa un ensayo para ver el registro y el vídeo. La pestaña del análisis conserva el par de ensayos elegido. En M indica el intervalo en milisegundos y añade la línea basal si la necesitas. **Ver ensayos** vuelve a los spikes por evento. **Exportar PNG** guarda la figura actual con fondo blanco.

Abre **Respuestas a eventos** y elige la etiqueta y las unidades. Incluye todo el registro, usa la selección de la señal o introduce los segundos del registro para filtrar los eventos. La ventana de respuesta fija cuánto tiempo ver antes y después de cada inicio. Ejecuta el análisis para ver una fila por unidad, alineada al inicio en 0 s. Puedes volver a abrir los ajustes encima del mapa. Pulsa una fila para ver al lado los spikes originales de esa unidad. Cada fila del raster es un ensayo y cada marca es un spike. Pulsa un ensayo para volver a su instante en el registro y en el vídeo sincronizado si está disponible. La pestaña del análisis te devuelve al mapa.

El mapa de calor, las medias de los grupos y los spikes de cada ensayo usan el tiempo relativo al inicio de cada evento. La línea vertical marca ese inicio en 0 s. Por ejemplo, −0,2 s corresponde a 200 ms antes de cada inicio. El tiempo junto a cada ensayo indica su posición en el registro original. Pulsa la fila para volver a ese punto.

Agrupa por forma de respuesta cuando quieras comparar perfiles similares. Por defecto se incluyen todos los ensayos válidos del evento elegido. Para comparar dos condiciones, elige un campo disponible (por ejemplo, la dirección) y dos valores. El primer grupo sirve de referencia. Al cambiar de grupo se conservan los miembros y el orden de las filas. Puedes revisar la alineación, los intervalos y el agrupamiento en los pasos del cálculo.

Abre los ajustes para limitar unidades o ensayos. Puedes elegir unidades por región, sonda, profundidad o ID. Los ajustes avanzados incluyen la ventana temporal, el ancho de los intervalos y la prueba por mitades. Las figuras usan los colores del tema y los PNG se guardan con fondo blanco.

## 1. Objetivo y límites científicos

Neuropixels Explorer permite revisar localmente datos ya clasificados de Kilosort o de un archivo NWB compatible. Puedes inspeccionar los tiempos de disparo de las unidades y sus tasas, además de las plantillas de Kilosort, las posiciones en la sonda y las anotaciones anatómicas cuando estén disponibles.

Interpreta las etiquetas de calidad, las violaciones del intervalo entre spikes, la contaminación estimada y las formas de onda junto con el protocolo del experimento. La región de una unidad puede proceder de los electrodos del propio NWB, de los metadatos de su carpeta de registro o de una tabla anatómica externa.

## 2. Abrir datos

Cierra un vídeo con la × de su pestaña. Proyecto → Deshacer cierre recupera la cámara, el reloj y sus etiquetas. Al cambiar de sonda se conservan las etiquetas del vídeo. Arrastra el tirador horizontal junto a las flechas para ajustar un valor, pulsa las flechas para cambiarlo por pasos o escríbelo en el campo. El reproductor muestra los atajos en los botones. En Ajustes de etiquetas, Nueva etiqueta crea un nombre, Guardar registra los cambios y Usar etiqueta vuelve al reproductor. Un doble clic selecciona la etiqueta y vuelve al vídeo.

Puedes añadir sondas y vídeos de la misma adquisición soltándolos en sus paneles. Cambia la pestaña del vídeo con cualquier sonda. Cada vídeo conserva sus anotaciones y alineación. Suelta su reloj verificado sobre la zona de alineación para reemplazar el ajuste manual. Los botones desplazan un fotograma y las flechas del teclado en el panel de vídeo desplazan cinco. Se usan los tiempos de presentación de cada fotograma si están disponibles, la frecuencia declarada en su defecto y 30 fps cuando se desconoce.

La aplicación abre directamente el espacio completo. Las zonas vacías de actividad, sonda, vídeo y anotación explican sus herramientas y datos necesarios. **Abrir / añadir datos** ofrece proyectos nuevos, guardados y recientes. **Espacio de trabajo** vuelve al registro actual.

Suelta los archivos sobre el panel correspondiente. Si alguno no es compatible, se rechaza el lote y un mensaje rojo indica el destino correcto. Para combinar tipos, usa **Importar archivos** o la cabecera de la página. En Ajustes, escribe un tamaño de texto de 14 a 24 px o usa las flechas para ajustarlo de 1 en 1. Suelta el JSON del reloj en el recuadro bajo el título del vídeo o haz clic para elegirlo. La confirmación aparece en verde. Suelta los archivos Kilosort en el recuadro que indica sus nombres en la vista neural o en la sonda. Suelta el JSON de eventos en la pestaña de etiquetas del registro. Haz clic en el área de anotaciones del vídeo para crear una anotación. Pulsa **＋ Nueva etiqueta** para elegir el nombre, el color y el tipo de evento. Para importar un JSON de anotaciones o conductas candidatas, suéltalo en esa misma área. Puedes arrastrar el JSON antes de añadir el vídeo correspondiente. En escritorio los paneles se abren lado a lado y se recuerda tu elección. Un vídeo basta para reproducir y etiquetar. Añade los archivos Kilosort por etapas. La vista indica qué archivos faltan. Conserva las carpetas de cada registro cuando se repitan los nombres. El menú de proyecto permite importar por grupos.

Arrastra el MP4 o WebM del registro al área de vídeo y, si lo tienes, su reloj de fotogramas de Allen (JSON) al área de alineación. El reloj relaciona el tiempo del vídeo con el del registro neural. Los eventos del experimento se leen del NWB. **Guardar proyecto** exporta un `.neuroproject` portátil. El servicio local usa selectores del sistema y guarda referencias en `.neuroproject.json`.

En un NWB de Allen, selecciona varias sondas o elige **Seleccionar todas** e importa. Cada sonda tiene su propia pestaña. La × quita ese registro del proyecto actual. Puedes deshacerlo desde el menú del proyecto.

Haz clic derecho en una fila de señal para comparar o inspeccionar esa unidad. Si hay un intervalo seleccionado, puedes ampliarlo o borrar la selección. Haz clic derecho en el vídeo para marcar una conducta, ampliarlo o añadir otro vídeo. Mayús+F10 abre el menú en la pestaña, unidad o vídeo con el foco. Esc devuelve el foco.

## 3. Explorar las unidades de un registro

La vista de señales se abre con el registro completo. Cada fila muestra los spikes originales de una unidad y, debajo, su tasa de disparo. El panel indica los tiempos absolutos, la anchura de ventana (Δ), la escala en Hz y el ancho de bin. La barra derecha recorre las unidades en orden anatómico. La barra inferior sitúa la ventana dentro del registro completo.

- Haz clic en cualquier parte de la tarjeta izquierda de una unidad para seleccionarla. Con Ctrl/Cmd + clic en otra tarjeta añades una referencia. Haz clic en una tarjeta resaltada para quitarla. El fondo sólido identifica la unidad principal y el borde doble indica una referencia. Las filas seleccionadas se mantienen arriba al desplazarte. Al quitar la última unidad se conservan la ventana, el cursor, el intervalo y la posición del vídeo. Abre el inspector de la unidad para consultar la forma de onda y el control de calidad.
- Arrastra la tarjeta hacia la izquierda para ver actividad posterior. Arrastra el control inferior para conservar la escala o pulsa en la regla de segundos o la barra del registro para centrar una ventana de dos segundos dentro de sus límites.
- Pulsa en la señal para situar el cursor. Arrastra en la señal para medir un intervalo. Puedes ampliar la selección o buscar segmentos similares. Ctrl/Cmd + rueda amplía alrededor del puntero. Cuando la actividad es densa, un píxel puede representar varios spikes.

En la barra del gráfico puedes elegir medición, desplazamiento o zoom por selección. Pulsa Esc mientras arrastras para cancelar. Sitúa el puntero sobre un spike para leer su tiempo o sobre la tasa para ver el intervalo, el recuento y los Hz. En modo zoom, la rueda amplía alrededor del puntero. Inicio restaura el registro completo. Atrás y Adelante recorren las ventanas temporales. Tras pulsar en la señal, las flechas desplazan la ventana. En el vídeo avanzan o retroceden cinco fotogramas. Espacio reproduce o pausa y M marca un instante o inicia y termina un intervalo. Ajustes, junto a Ayuda, permite cambiar los atajos, el tamaño de texto, el idioma y los colores.

El panel de eventos tiene su propio historial de referencias, unidades y búsquedas. Deshacer en el editor recupera las anotaciones. En la aplicación de archivo único, el menú Proyecto permite deshacer y rehacer los últimos ocho cambios de vídeo y alineación por registro mientras el proyecto está abierto.

### Lista del inspector detallado de unidades

Elija un Registro en la franja horizontal y use la lista de Unidades:

- **Clic**: abre solo esa Unidad y reemplaza las señales actuales.
- **Ctrl + clic**: añade la Unidad sin quitar las señales abiertas.
- **Clic derecho**: abre **Abrir solo**, **Añadir a la vista actual**, **Quitar de la vista** y **Localizar en la Sonda**.
- **Flecha arriba / abajo**: mueve el foco de teclado por la lista.

Haga clic en una señal abierta para enfocarla. La lista izquierda se desplaza hasta la Unidad y la resalta; el Inspector de Sonda y los gráficos inferiores siguen el mismo foco. Se pueden abrir hasta diez Unidades simultáneamente.

`Good`, `MUA` y otros valores son etiquetas de KiloSort o de curación.

## 4. Leer las señales del inspector detallado

Cada Unidad abierta tiene dos vistas alineadas:

- El raster superior marca los tiempos individuales de potenciales de acción.
- La curva inferior muestra la tasa de disparo agrupada a través del tiempo.

La Vista general comprimida representa el registro completo. Su marco indica el intervalo mostrado en detalle. Haga clic o arrastre en la Vista general para mover la ventana detallada.

### Modo Cursor

Mueva el puntero sobre una señal para leer el tiempo sin cambiar la vista. El desplazamiento de página permanece normal.

### Modo Zoom

Arrastre sobre cualquier parte de una señal para seleccionar un intervalo, o use la rueda para ampliar alrededor del puntero. La rueda solo se captura dentro de una señal; el resto de la página se desplaza normalmente.

### Modo Pan

Arrastre horizontalmente para mover la ventana. Con el puntero dentro de una señal, rueda abajo avanza y rueda arriba retrocede. En un trackpad se usa el eje dominante.

### Tiempo vinculado e independiente

**Tiempo vinculado** aplica Zoom, Pan, Atrás y Restablecer a todas las Unidades abiertas. **Tiempo independiente** modifica solo la Unidad enfocada. Vincule para comparar directamente y desvincule cuando una señal necesite otra escala.

### Vídeo de conducta sincronizado

La pista compacta de vídeo está justo encima de las señales neurales. Si el
Registro contiene un vídeo compatible, el Explorer lo abre localmente. Use
**Conectar vídeo local** para elegir otro archivo. Si no dispone del vídeo del
experimento, **Generar vídeo de validación** crea un vídeo determinista con
fotogramas exactos a 30 Hz y un pulso visible cada cinco segundos.

Puede reproducir, pausar, buscar, cambiar la velocidad o avanzar un fotograma.
**Seguir señal** mantiene el tiempo neural actual dentro de la ventana visible.
El cursor verde de Vídeo marca el mismo tiempo neural en todas las Unidades
abiertas. Un clic en un gráfico neural en modo Cursor realiza la operación
inversa y desplaza el vídeo a ese tiempo.

Use **Desfase (s)** para una alineación manual rápida. Para alinear el experimento
fotograma a fotograma, cargue marcas de tiempo, eventos TTL o un ajuste de reloj documentado.

## 5. Interpretar los detalles de la Unidad

- **Potenciales**: número de eventos detectados y asignados a la Unidad.
- **Tasa media de disparo**: potenciales por segundo promediados sobre todo el registro.
- **ISI < 2 ms**: porcentaje de potenciales adyacentes separados por menos de 2 ms; es un indicador, no una regla automática de rechazo.
- **Proporción de presencia**: fracción de intervalos en que se detecta la Unidad.
- **Amplitud KS**: resumen de amplitud de KiloSort en unidades propias del conjunto.
- **Contaminación KS**: estimación de contaminación de KiloSort cuando existe.
- **Estabilidad de amplitud**: amplitud relativa durante el registro.
- **Autocorrelograma**: distribución de diferencias temporales entre potenciales de la misma Unidad.
- **Plantilla KiloSort**: plantilla asignada con más frecuencia y canal de pico.

Los botones de interrogación explican qué es cada valor, cómo interpretarlo y cuándo usarlo. Funcionan tanto con el ratón como con el foco del teclado.

## 6. Usar el Inspector de Sonda

El panel derecho separa cuatro capas:

- Las bandas cerebrales son intervalos continuos de profundidad de una fuente opcional.
- Las marcas tenues indican posiciones de canales y no son el objetivo principal de interacción.
- Los círculos grises son Unidades disponibles pero no abiertas.
- Los círculos de color son Unidades abiertas y comparten color con sus señales.

La Unidad enfocada tiene anillo blanco, línea horizontal de profundidad y etiqueta fija. Pase sobre un marcador para ver ID, Sonda física, shank, profundidad, región y canal. Haga clic para bloquear la posición; haga clic en espacio vacío del shank o pulse **Esc** para desbloquear. Si varias Unidades se superponen, aparece una lista pequeña.

Las reglas son iguales a las de la lista: clic abre solo, Ctrl+clic añade y clic derecho abre el menú común. Las Unidades cercanas se calculan respecto a la posición bloqueada.

En la adquisición actual, `channel_shanks.npy` identifica cuatro shanks de una sola Sonda física. El Inspector muestra por ello un grupo expandible **Sonda 1** que contiene **Shank 1–4**. Los datos con varias Sondas también deben indicar la identidad de cada Sonda física.

## 7. Mapeo de regiones cerebrales

Las salidas KiloSort no contienen una identidad cerebral fiable. Las anotaciones deben proporcionarse aparte. Un mapeo de profundidad compatible necesita al menos:

- `probe` o `shank`
- `depth_um`
- `region`

Se recomiendan `electrode`, `atlas_id`, `color` y `recording_id` para trayectos específicos de sesión. Abreviaturas como `MPN` y campos de KiloSort se muestran sin traducir.

Interprete el mapeo actual como metadatos de electrodo/profundidad. Un trayecto tridimensional registrado en Allen CCF también necesita coordenadas completas y procedencia del registro.

## 8. Disposición, temas, idioma y teclado

Arrastre el separador izquierdo para cambiar el ancho de la lista y del área de señales. El Inspector de Sonda conserva un ancho fijo porque ensancharlo no mejora la resolución en profundidad. Arrastre el control horizontal bajo el diagrama para cambiar su altura; con foco de teclado, use Flecha arriba/abajo, Shift para cambios grandes y Home para restablecer. En pantallas estrechas, los botones de chevrón siguen plegando los paneles laterales.

Los temas son Oscuro, Claro, Alto contraste y Sistema. El tema afecta HTML, Canvas de señales, bandas de Sonda, cuadrículas, selecciones y colores de Unidades. El idioma y el tema se guardan en el dispositivo.

El Explorer admite English, 简体中文 y Español. Al cambiar idioma se actualizan la interfaz, las explicaciones y este panel de Ayuda. Nombres de archivo, abreviaturas cerebrales y campos KiloSort permanecen sin cambios.

Use **Tab** y **Shift + Tab** para moverse, **Enter** o**Espacio** para activar y **Esc** para cerrar Ayuda, menús, estado de datos o una selección bloqueada cuando corresponda.

## 9. Privacidad y rendimiento

En modo carpeta, los archivos permanecen en el equipo local. El navegador indexa la carpeta y, tras el procesamiento en segundo plano, la interfaz recibe solo el resultado de la Unidad elegida. El modo base de datos puede consultar un servicio local independiente; `index.html` también funciona directamente mediante `file://`.

La Ayuda está incluida en el HTML y funciona al abrir `index.html` directamente.

## 10. Solución de problemas

- **No se encontraron registros**: confirme `spike_times.npy`, `spike_clusters.npy` y `params.py` en cada candidato.
- **Un gráfico no está disponible**: abra Estado de datos y compruebe el archivo fuente.
- **Región sin mapear**: confirme una Legacy Table o mapa de profundidad compatible y los identificadores correctos.
- **Abrir voltaje sin procesar**: conecte un lector compatible a los datos continuos del registro.
- **No hay vídeo del experimento**: use **Generar vídeo de validación** para comprobar reproducción y alineación.
- **La navegación cambia la señal equivocada**: compruebe Tiempo vinculado/independiente y qué señal está enfocada.


## 11. Anotación de conducta beta

La barra de reproducción siempre abarca todo el vídeo. Al arrastrarla se pausa la reproducción y puedes buscar un instante. Las marcas del borde superior corresponden al origen y al tipo de etiqueta elegidos. Pulsa una marca para ir al evento. La franja **Marcas de eventos** aparece plegada encima de la barra de reproducción. Despliégala para ver el detalle o abre **Editar segmentos** para que se despliegue automáticamente. Usa + o − o la rueda para ampliar alrededor del puntero. Después de ampliar, mantén pulsada Mayús y arrastra con el botón izquierdo desde cualquier punto de la franja, o usa Mayús + rueda, para desplazar la ventana. **Duración completa** recupera toda la escala. El zoom de esta franja conserva la posición del vídeo y la ventana neural.

Con vídeo, ambas barras muestran segundos de vídeo. Un evento del registro aparece donde se puede convertir su tiempo neural original a tiempo de vídeo. Los puntos fuera de cobertura quedan ocultos. De los intervalos que cruzan el límite solo se muestra la parte cubierta. Se conservan los tiempos originales del registro. Sin vídeo, la franja muestra segundos del registro neural.

En **Ajustes de etiquetas**, pulsa **＋ Nueva etiqueta**, escribe el nombre, elige el color y el tipo de evento y pulsa **Guardar**. Haz doble clic en la etiqueta guardada para usarla. Junto a **Marcar**, selecciona **Instante** para registrar, por ejemplo, el primer contacto. Una pulsación guarda el tiempo actual y conserva la reproducción o la pausa. Para el acicalamiento, elige **Intervalo**. Pulsa **Marcar** para iniciar la reproducción y **Detener** para pausar y guardar ambos extremos. Esc cancela el intervalo en curso. El tipo elegido será el predeterminado para las próximas marcas de esa etiqueta. Los eventos existentes conservan su tipo.

Abre **Marcas de eventos**. Arrastra una anotación para moverla o selecciona un extremo para cambiar la duración. Arrastra en la pista vacía para seleccionar eventos y pulsa Supr para borrarlos. Arrastra la regla para desplazar el tiempo. Los ajustes de etiquetas muestran los eventos de cada nombre. Puedes borrar un evento o borrar la etiqueta y sus eventos en todos los esquemas. **Deshacer eliminación** o Ctrl+Z los recupera. Ctrl+Y repite la edición. En **Editar segmentos**, mantén pulsada Alt y arrastra desde un espacio vacío de la pista para dibujar un intervalo que puedes guardar con **Guardar etiqueta**. Pasa el puntero para previsualizar un fotograma. Revisa un clip guardado con **Reproducir intervalo**, arrastra sus extremos o fija un límite en el cursor. El ajuste fino acepta segundos o números de fotograma desde 0, con final exclusivo. Usa segundos con vídeo de frecuencia variable, ya que los fotogramas se calculan con los FPS nominales. El vídeo, los clips y las máscaras neurales comparten el color de etiqueta. Las herramientas de clips permiten crear, dividir y quitar intervalos. Se conservan Deshacer/Rehacer y **Clips y grupos**. Arrastra el tirador de **Speed ×** para cambiar la velocidad en 0,01 por píxel o en 0,001 con Mayús. También puedes pulsar e introducir un valor.

### Buscar actividad repetida junto a una etiqueta

Elige una etiqueta del registro o del vídeo, abre **Spikes entre eventos** y selecciona una unidad. Cada fila muestra una aparición de la etiqueta, alineada por defecto a su inicio. Pulsa la hora de la fila para ver las señales originales y el vídeo correspondiente. La franja de recurrencia cuenta cuántas ventanas contienen al menos un spike en cada intervalo temporal. Incluye como máximo un evento por episodio y omite ventanas superpuestas.

Para buscar, arrastra sobre la fila de una unidad para marcar un intervalo de referencia o elige el evento representativo observado. La búsqueda compara los recuentos de spikes de las mismas unidades en intervalos correspondientes. Pulsa un candidato para ver ambos conjuntos de spikes originales en la misma escala de tiempo. También puedes buscar a partir de una selección en las señales continuas. Si empiezas en una fila resaltada, se usan las unidades seleccionadas.

Para las estadísticas del intervalo, selecciona un segmento guardado en la línea
de vídeo o la banda de comportamiento sobre las señales, o arrastra un intervalo
en las señales. Pulsa **Interval distribution** en Probe. El tamaño indica Hz;
la lista incluye Hz y número de potenciales de cada Unidad. El gráfico de
profundidad/tasa empieza vertical; **Horizontal view / Vertical view** intercambia
los ejes sin cambiar los resultados. Pasa el cursor por una marca para ver detalles.
Las Unidades sin profundidad siguen en la lista. El panel abierto sigue nuevas
selecciones; cerrarlo conserva la selección. Requiere un proyecto local y utiliza
los segundos neurales cubiertos y el intervalo semiabierto `[start, end)`.

**Agrupación experimental** propone grupos locales de movimiento y apariencia.
Compare vídeos del grupo, asígnele un nombre y confirme los clips.
Mueve selecciones a un nuevo grupo para refinar la agrupación. También puedes
importar candidatos JSON externos. Los grupos originales se conservan.

Cada **Esquema de etiquetas** mantiene etiquetas, agrupaciones y revisiones
independientes. Cambiar los límites compartidos exige volver a revisar en todos
los esquemas. Haz clic derecho y elige **Guardar anotaciones** para guardar todos los esquemas y resultados originales del vídeo. El primer guardado comienza junto al vídeo arrastrado si Chrome proporciona acceso. **Guardar como** permite elegir otro archivo.
**Exportar CSV** incluye el esquema activo, tiempos y estado de sincronización.
El servicio guarda borradores locales; **Guardar proyecto** añade las ediciones al proyecto actual.
En el HTML independiente, exporta el paquete de proyecto para conservarlas.

## Inspeccionar ambas distribuciones de Sonda

Selecciona un segmento conductual o un intervalo neural y abre **Interval distribution** para ver conteos y Hz. Selecciona una Unidad en la vista neural, Sonda o lista y abre **Distribución de plantilla / Unit template distribution**. Ambas secciones pueden permanecer abiertas; desplázate en la barra lateral.
Los círculos muestran posiciones de canales y su tamaño indica amplitud pico a pico almacenada. Elige un canal para ver su forma de onda con una escala de amplitud común. La lista completa conserva índices, identificadores de adquisición disponibles, coordenadas y amplitudes.
El gráfico muestra la plantilla dominante del registro completo y la fracción de spikes asignados, independientemente del intervalo elegido. Las amplitudes usan las unidades almacenadas salvo que se proporcione desblanqueo o calibración en µV.
Cambiar de Unidad conserva las estadísticas del intervalo. Si faltan plantillas o el mapa no es compatible, se indica el motivo. Los registros Allen sin plantillas multicanal conservan las estadísticas de actividad.


## Características opcionales y ejemplo de fotogramas

En **Editar segmentos → Clips y grupos → Características / puntos del modelo**, exporta la entrada JSON e importa características o puntos con tiempos para agrupar y revisar. **Ejecutar ejemplo de píxeles (primeros 30 s)** usa medias RGB del vídeo para demostrar la interfaz del modelo. Requiere un archivo local o un Blob de proyecto y usa los ajustes actuales. Revise los grupos propuestos antes de confirmarlos. Guardar proyecto conserva características, procedencia y cambios humanos; cancelar, cerrar o cambiar la fuente descarta resultados pendientes.

## Dinámica poblacional

Abre Nuevo análisis → Dinámica poblacional. Elige IDs originales de Unit, un intervalo neural continuo y ancho de bin. El Worker cancelable ajusta PCA y modelos en entrenamiento y compara errores de validación/prueba. Selecciona un punto o intervalo y pulsa Ver intervalo en señales / vídeo para volver al tiempo compartido. Guarda el análisis antes de exportar el proyecto portátil.
