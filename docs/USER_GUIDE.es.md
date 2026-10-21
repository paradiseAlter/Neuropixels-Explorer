# Guía de uso de Neuropixels Explorer

## 1. Objetivo y límites científicos

Neuropixels Explorer es una interfaz local para revisar salidas de KiloSort. Ayuda a estudiantes e investigadores a inspeccionar Unidades, tiempos de potenciales de acción, tasas de disparo, plantillas de KiloSort, posiciones físicas de Sondas y anotaciones cerebrales opcionales sin subir datos de investigación.

El Explorer es una herramienta de revisión, no un sistema automático de decisión biológica. Una etiqueta de calidad, una violación del ISI, una estimación de contaminación, una forma de onda o una etiqueta anatómica deben interpretarse con el protocolo de registro y otras evidencias. KiloSort aporta datos de potenciales y geometría; las regiones cerebrales proceden de una Legacy Table o un CSV de mapeo independiente y nunca se infieren cuando faltan.

## 2. Abrir datos

Seleccione **Abrir carpeta** o arrastre una carpeta completa de proyecto/sesión a la pantalla inicial. Puede contener varios directorios de registros KiloSort. La aplicación indexa todos los candidatos, pero los grandes arrays NPY solo se leen cuando se abre una Unidad.

Use **Estado de datos** después de cargar. Separa:

- **Disponible**: entradas principales detectadas.
- **Faltante**: entradas principales ausentes en uno o más registros.
- **No válido**: registros candidatos que no superaron las comprobaciones estructurales.
- **Opcional**: anotaciones cerebrales y trayectos Sonda-región.
- **Flujos / Extensiones**: disponibilidad del vídeo sincronizado y estado del futuro proveedor de Raw Voltage.

Para cada entrada principal faltante, **Estado de datos** identifica el Registro afectado y el nombre exacto del archivo esperado. Use **Añadir archivos** para uno o varios archivos individuales o **Añadir carpeta** para una carpeta de Registro. El Explorer rechaza archivos de otro Registro, reemplazos en conflicto, candidatos duplicados y arrays NPY con formas incompatibles. Si el suplemento falla, no deja un conjunto parcial ni en el catálogo ni en los archivos gestionados. Si termina correctamente, solo actualiza los Registros afectados y conserva las Unidades abiertas, la Unidad enfocada, las ventanas de tiempo, el historial de navegación y la disposición de tres columnas.

Los nombres de archivo y campos de KiloSort, como `spike_times.npy`, `channel_shanks.npy` y `depth_um`, no se traducen.

## 3. Seleccionar y comparar Unidades

Elija un Registro en la franja horizontal y use la lista de Unidades:

- **Clic**: abre solo esa Unidad y reemplaza las señales actuales.
- **Ctrl + clic**: añade la Unidad sin quitar las señales abiertas.
- **Clic derecho**: abre **Abrir solo**, **Añadir a la vista actual**, **Quitar de la vista** y **Localizar en la Sonda**.
- **Flecha arriba / abajo**: mueve el foco de teclado por la lista.

Haga clic en una señal abierta para enfocarla. La lista izquierda se desplaza hasta la Unidad y la resalta; el Inspector de Sonda y los gráficos inferiores siguen el mismo foco. Se pueden abrir hasta diez Unidades simultáneamente.

`Good`, `MUA` y otros valores son etiquetas de KiloSort o de curación. Por sí solos no establecen el tipo celular, la validez del registro ni la relevancia biológica.

## 4. Leer el área de señales

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
**Conectar vídeo local** para elegir otro archivo o **Generar vídeo de
validación** cuando no esté disponible el vídeo protegido del laboratorio. El
vídeo generado es determinista: muestra fotogramas exactos a 30 Hz y un pulso
visible de sincronización cada cinco segundos.

Puede reproducir, pausar, buscar, cambiar la velocidad o avanzar un fotograma.
**Seguir señal** mantiene el tiempo neural actual dentro de la ventana visible.
El cursor verde de Vídeo marca el mismo tiempo neural en todas las Unidades
abiertas. Un clic en un gráfico neural en modo Cursor realiza la operación
inversa y desplaza el vídeo a ese tiempo.

La insignia distingue un reloj de fotogramas verificado de un desfase manual no
verificado. Cambiar **Desfase (s)** muestra **No verificado · Desfase manual**.
Un experimento real necesita marcas de fotograma, eventos TTL o un ajuste de
reloj documentado antes de declararse verificado.

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

Las reglas son iguales a las de la lista: clic abre solo, Ctrl+clic añade y clic derecho abre el menú común. Las Unidades cercanas se calculan respecto a la posición bloqueada; la proximidad espacial no implica por sí sola similitud funcional.

En la adquisición actual, `channel_shanks.npy` identifica cuatro shanks de una sola Sonda física. El Inspector muestra por ello un grupo expandible **Sonda 1** que contiene **Shank 1–4** y nunca los etiqueta como cuatro Sondas físicas. Un futuro conjunto con varias Sondas necesitará una identidad física explícita además de la identidad del shank.

## 7. Mapeo de regiones cerebrales

Las salidas KiloSort no contienen una identidad cerebral fiable. Las anotaciones deben proporcionarse aparte. Un mapeo de profundidad compatible necesita al menos:

- `probe` o `shank`
- `depth_um`
- `region`

Se recomiendan `electrode`, `atlas_id`, `color` y `recording_id` para trayectos específicos de sesión. Abreviaturas como `MPN` y campos de KiloSort se muestran sin traducir.

El mapeo actual es metadato a nivel de electrodo/profundidad. No constituye un trayecto tridimensional registrado en Allen CCF sin coordenadas completas y procedencia de registro.

## 8. Disposición, temas, idioma y teclado

Arrastre el separador izquierdo para cambiar el ancho de la lista y del área de señales. El Inspector de Sonda conserva un ancho fijo porque ensancharlo no mejora la resolución en profundidad. Arrastre el control horizontal bajo el diagrama para cambiar su altura; con foco de teclado, use Flecha arriba/abajo, Shift para cambios grandes y Home para restablecer. En pantallas estrechas, los botones de chevrón siguen plegando los paneles laterales.

Los temas son Oscuro, Claro, Alto contraste y Sistema. El tema afecta HTML, Canvas de señales, bandas de Sonda, cuadrículas, selecciones y colores de Unidades. El idioma y el tema se guardan en el dispositivo.

El Explorer admite English, 简体中文 y Español. Al cambiar idioma se actualizan la interfaz, las explicaciones y este panel de Ayuda. Nombres de archivo, abreviaturas cerebrales y campos KiloSort permanecen sin cambios.

Use **Tab** y **Shift + Tab** para moverse, **Enter** o**Espacio** para activar y **Esc** para cerrar Ayuda, menús, estado de datos o una selección bloqueada cuando corresponda.

## 9. Privacidad y rendimiento

En modo carpeta, los archivos permanecen en el equipo local. El navegador indexa la carpeta y, tras el procesamiento en segundo plano, la interfaz recibe solo el resultado de la Unidad elegida. El modo base de datos puede consultar un servicio local independiente, pero es opcional y no hace falta al abrir `index.html` mediante `file://`.

La Ayuda se conserva como Markdown y se precompila como contenido JavaScript local para la versión. No usa CDN, renderizador Markdown remoto ni solicitud de red.

## 10. Solución de problemas

- **No se encontraron registros**: confirme `spike_times.npy`, `spike_clusters.npy` y `params.py` en cada candidato.
- **Un gráfico no está disponible**: abra Estado de datos y compruebe el archivo fuente.
- **Región sin mapear**: confirme una Legacy Table o mapa de profundidad compatible y los identificadores correctos.
- **Voltaje sin procesar no disponible**: KiloSort suele referirse a un `continuous.dat` externo; el Explorer expone un puerto versionado de proveedor/lector, pero no registra una implementación de Raw Voltage ni presenta tiempos de potenciales como voltaje.
- **No hay vídeo del laboratorio**: use **Generar vídeo de validación** para comprobar reproducción y alineación exacta sin crear ni copiar datos protegidos.
- **La navegación cambia la señal equivocada**: compruebe Tiempo vinculado/independiente y qué señal está enfocada.


## 11. Anotación de conducta beta

Adjunta el vídeo y elige **Annotate**. El vídeo queda encima de una línea temporal
ampliable, con actividad neural y Probe al lado. Pasa el puntero para previsualizar
sin mover la reproducción; usa la rueda para ampliar y Mayús + rueda o el deslizador
para desplazarte. Arrastra un intervalo, elige una etiqueta y pulsa **Save label**.
**Manage labels** separa la creación de nombres y colores de su aplicación. El vídeo,
la línea temporal y las máscaras neurales comparten el mismo color de etiqueta.

Selecciona un clip y usa **Play interval**, arrastra sus límites o fija un límite en
el cursor. **Fine adjustment · time / frames** acepta segundos o fotogramas desde 0,
con final exclusivo. Los fotogramas usan FPS nominales; usa segundos para vídeo con
frecuencia variable. **Clip tools** contiene crear, dividir y quitar. Se conservan
I/O, Deshacer/Rehacer y **Clips & grouping**. Arrastra **Speed ×** horizontalmente
(0.01 por píxel; Mayús: 0.001), o pulsa y escribe. Pulsa otra fila de señales o un
espacio vacío dentro del lienzo de actividad para plegar el Unit sin modificar el
tiempo ni la selección. Los controles de vídeo, anotación e inspección mantienen
el Unit expandido.

Para comparar grupos, selecciona una unidad y pulsa **Fijar para comparar** cuando
se carguen sus spikes. Repite desde otro grupo o con Buscar unidad. Hasta seis filas
comparten la ventana temporal y el cursor del vídeo; plegar grupos no las elimina.
La primera fijación reduce ventanas mayores a 10 segundos alrededor del cursor.
Usa Cursor / Zoom / Pan (C/Z/P, +/-) o **10 s en el cursor**; × elimina una fila y
**Vaciar comparación** todas. Cambiar de registro o recargar elimina las fijaciones.
Amplía las vistas densas para distinguir spikes individuales.

Para las estadísticas del intervalo, selecciona un segmento guardado en la línea
de vídeo o la banda de comportamiento sobre las señales, o arrastra un intervalo
en las señales. Pulsa **Interval distribution** en Probe. El tamaño indica Hz;
la lista incluye Hz y número de potenciales de cada Unidad. El gráfico de
profundidad/tasa empieza vertical; **Horizontal view / Vertical view** intercambia
los ejes sin cambiar los resultados. Pasa el cursor por una marca para ver detalles.
Las Unidades sin profundidad siguen en la lista. El panel abierto sigue nuevas
selecciones; cerrarlo conserva la selección. Requiere un proyecto local y utiliza
los segundos neurales cubiertos y el intervalo semiabierto `[start, end)`.

**Agrupación experimental** propone grupos de movimiento y apariencia en el
equipo local. Es sensible a posición e iluminación y no es reconocimiento
conductual validado. Compara vídeos del grupo, nómbralo y confirma los clips.
Mueve selecciones a un nuevo grupo para refinar la agrupación. También puedes
importar candidatos JSON externos. Los grupos originales se conservan.

Cada **Esquema de etiquetas** mantiene etiquetas, agrupaciones y revisiones
independientes. Cambiar los límites compartidos exige volver a revisar en todos
los esquemas. **Guardar proyecto** exporta esquemas y resultados originales;
**Exportar CSV** incluye el esquema activo, tiempos y estado de sincronización.
El navegador guarda borradores locales; descarga el proyecto como respaldo
portátil. Los vídeos sin calibrar siguen indicándose como no verificados.
Los datos de origen no se modifican.

## Inspeccionar ambas distribuciones de Sonda

Selecciona un segmento conductual o un intervalo neural y abre **Interval distribution** para ver conteos y Hz. Selecciona una Unidad en la vista neural, Sonda o lista y abre **Distribución de plantilla / Unit template distribution**. Ambas secciones pueden permanecer abiertas; desplázate en la barra lateral.
Los círculos muestran posiciones de canales y su tamaño indica amplitud pico a pico almacenada. Elige un canal para ver su forma de onda con una escala de amplitud común. La lista completa conserva índices, identificadores de adquisición disponibles, coordenadas y amplitudes.
Es la plantilla dominante del registro completo, con la fracción de spikes asignados. No cambia con el intervalo ni representa una forma de onda medida en ese segmento. Los valores no están desblanqueados ni calibrados en µV.
Cambiar de Unidad conserva las estadísticas del intervalo. Si faltan plantillas o el mapa no es compatible, se indica el motivo. Los registros Allen sin plantillas multicanal conservan las estadísticas de actividad.
