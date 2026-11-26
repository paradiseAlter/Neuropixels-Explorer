# Information Architecture

视频旁的「视频标注」和「录制自带标签」切换神经时间轴上的标签来源。选择标签类型后，左右箭头可定位前后一次出现，联动视频和神经信号。录制来源的点事件保留原始时刻，视频标注可在原编辑器继续修改。

[文档索引](../README.md) · [PRD](PRD.md) · [功能对照](PARITY_MATRIX.md)

本文件描述当前工作区的主要入口、信息层级与共享状态；代码模块细节由 [Architecture](ARCHITECTURE.md) 维护。

## 信息层级

信号与分析共用同一标签栏。普通 Probe 图显示位置和活动。事件放电的 Unit 选择区内可框选或圈选，Ctrl/Cmd 追加，单击空白清空。圈选仅显示指针轨迹，松开按闭合区域选取。Shift 拖动可在框选或圈选模式下平移。分析页可以切换 Probe，并从 Probe 图或独立的 spike 视图保存候选 Unit。列表按来源区分 Unit，可逐个移除。每个分析标签保留自己的选择。记录、分析和视频标签共用选中样式与关闭按钮，× 位于标签内。

| 层级 | 内容 / 入口 | 作用与返回关系 |
| --- | --- | --- |
| 启动与全局外壳 | 单文件版顶部导入文件／打开项目／保存项目、项目菜单内分组导入、Probe 和视频标签、设置、帮助 | 启动即展示活动、Probe、视频和标注区域；可直接拖入文件或使用文件选择器；未载入时以 SVG 示意用途，依赖数据的操作置灰 |
| Recording 主工作区 | 逐 Unit 信号行、2D mini Probe、视频、共享时间窗和游标 | 切换左右／上下布局。底部秒刻度和全程条定位时间，右侧滚动条定位 Unit |
| 查看与对照 Unit | Unit 左侧卡片、Find Unit、Probe | 右键信号行可比较或深入检查目标 Unit。点卡片选中，Ctrl/Cmd + 点其他卡片加入对照，再点任一高亮卡片即可移除。各行直接显示同一时间窗内的 spike 与 Hz |
| 行为对齐与相似片段 | 标签的「同类事件放电」或信号选区的「找相似片段」 | 逐次检查所选 Unit 的放电，点事件时间回到原记录。横拖某一行可用指定片段搜索 |
| 深入检查 | Inspect unit 进入保留的检查界面 | waveform、raster、QC、完整 Probe 等；关闭恢复原有 Unit 和时间状态 |
| 视频标注 | 播放器旁的类型切换与标记／停止、标签设置、时刻与区间边界编辑 | 放大现有视频区域，神经上下文仍可见；Signals / Esc 返回 |
| 批量审阅 | Clips & grouping | scheme、review、分组合并/拆分、导入导出、实验性 grouping；不取代主时间轴 |
| 按需统计 | Interval distribution | 展开 Probe 区间活动统计；采用当前片段或神经区间，受运行模式限制 |
| 多通道模板 | Unit template distribution | 与区间统计独立展开；跟随选中 Unit；电极幅值图、通道选择、共尺度波形和全部通道列表 |

## 主要路径

单文件版首次打开时，用一条可跳过的导入指引依次标出神经活动、Probe、录制事件和视频的接收区。用户可以随时直接投放文件；在同一浏览器记住跳过或完成的选择。「设置 → 重看导入指引」可再次查看。输入格式和缺失提示也放在相应区域，独立于指引。

1. **导入与恢复**。将文件拖到对应区域。拖动时显示接收区域，松开时检查整批文件。错区会显示红色错误和正确的投放位置。多种类型可一起拖到页首，或使用「导入文件」。视频可单独播放与标注，神经活动区显示已具备的信号及当前缺项。缺文件时，工作区在实际接收位置显示文件名或格式。视频标题下方接收当前视频的帧时钟 JSON，「视频标注」区域接收标注 JSON，「录制自带标签」接收录制事件 JSON。神经活动、Probe 和文件清单中的补件位置列出所需文件，并按目标记录校验。Probe 和视频分列在各自的标签栏，当前视频与项目内的探针共用。工作区仅保留在当前标签页，通过「保存项目」保存完整 `.neuroproject`。拖入项目包或点「打开项目」可恢复。分组文件选择仍在项目菜单。本地服务通过系统选择器登记磁盘引用，以 `.neuroproject.json` 保存。
同一 NWB 的探针可多选或全选，每根探针有独立记录标签。点 × 移除该记录，右键其他记录或打开项目菜单可撤销。

2. **探索 Unit**。打开 Recording 后从全程视图找 Unit。点未高亮卡片聚焦，点已高亮卡片移除。移除主 Unit 后，最早加入且仍在对照的 Unit 接替主行。移除最后一个回到普通浏览，保留时间窗、游标、选区和视频位置。主行以实色底标出，参考行以双线边标出，各行保持等高。点击信号移动游标。收起分组后可从组头看到最近的 Unit。
3. **标注行为**。点击「视频标注」打开标签列表，点「＋ 新标签」后填写名称、选择颜色与默认事件类型。将已有标注或行为候选 JSON 拖到同一区域即可导入。单文件版也可先拖入 JSON，再添加匹配的视频。建立标签或导入片段后，可在导航中选择已有标签，也可从同一入口新建标签。选「时间点」时单击「标记」记录当前时刻。选「持续事件」时点「标记」开始，再点「停止」暂停并保存区间。后续点播放器旁的「标记」沿用已选标签，Esc 取消标记。「标签设置」管理名称和颜色。进入「编辑片段」可拖选、保存、播放及修整片段，按秒或帧精调边界。片段工具提供新建、拆分与移除，片段与分组提供批量审阅与导出。
4. **核对区间活动**：在视频时间轴或神经信号顶部的行为片段带选择已保存片段，也可在信号区任意拖选时间 → 左侧 Interval distribution。选区共用神经时间映射；从神经片段带选中片段时保留现有编辑器状态和 Unit 高亮。Probe 点大小按该区间 Hz 更新，旁边默认按深度竖向展示逐 Unit 的点线统计图；Horizontal view / Vertical view 交换深度与 Hz 坐标轴，保留同一选区和数值。下方可滚动列表列出全部 Unit 的 Hz、spike 数与位置，点击可查看该 Unit。无位置 Unit 只进入列表；这些连接零基线的短线不是跨 Unit 波形。点标题文字或箭头展开或收起区间分布、Unit 模板或附近神经元。各行独立，可同时查看。区间分布打开时随选区重算，收起后保留选区。
5. **跨组看 spike 和发放率**。点一个 Unit 卡片，再按 Ctrl/Cmd 点其他卡片。沿右侧滚动条浏览其他 Unit，滚出视口的高亮参考行显示在顶部。所有行采用相同的时间窗和 Hz 纵轴范围。横拖卡片可平移信号。单击底部局部秒刻度或全程条，用两秒窗查看该点，靠记录边界时以可用范围为准。
6. **按标签查看重复放电**。选录制标签或视频标注后打开「同类事件放电」。查看每个 Unit 在不同事件中的逐次 spike 及重复出现的时刻。点行首时间回看原记录和视频。若需搜索其他相似片段，横拖一行、在主信号行框选或使用代表事件。候选与参考共用时间尺度。搜索结果先展示最相似的一项。展开“更多相近片段”可看其他候选，逐事件 spike、群体热图和背景对照也可单独展开。

## 布局与上下文

Probe 使用独立的全高左侧观察栏，与右侧视频／神经活动组成实验观察台。两种分布分别在各自标题下展开，可同时打开；位置图、深度—Hz 图、逐 Unit 列表、电极模板图和通道波形均保留，在栏内滚动。顶部 Probe 按钮可暂时收起观察栏；重新展开保留选择与面板状态。
模板视图点击电极或选择通道只改变局部通道，不改变 Unit、游标、时间窗或标注。改变时间段只刷新区间统计；
切换 Unit 更新主导模板并保留时间段与统计。切换 Recording 清除旧模板和参考行。
区间统计图上的 Unit 点和列表均可联动选中 Unit。模板缺失时显示具体原因，继续保留其它浏览功能。

左右布局的 video split 从约 44% 开始，按可用宽度保留神经区域。上下布局的上半区默认约 50%：视频画面居左，播放、时间轴与标注工具居右，神经信号占满下半区。分隔条支持拖动、方向键和 Home 复位；上下布局使用上下方向键，左右布局使用左右方向键。两种布局及普通／聚焦比例独立，切换只调整呈现，不清除 Unit、选区、视频时间或 Probe 展开状态。视频完整显示，不裁剪，工具区域独立滚动。桌面默认左右布局。顶部开关记住手动选择，也可用 `?layout=stacked` 或 `?layout=side` 指定布局。视频标题栏提供编辑片段与对齐；桌面版右键画面可放大或更换视频，触屏设备保留按钮；完整视频进度条常驻，播放细调保留自定义速度与按秒跳转，选择 Custom 自动展开输入。窄窗口改为纵向页面滚动，依次呈现视频、神经活动和 Probe；深入检查保留可横向滚动的完整工具区。

空白 Probe 显示探针杆、触点、Unit 位置与波形示意，并标明尚未载入数据；神经区与视频区也使用图示解释用途。实际数据载入后替换示意模型。较早的 65/35、70–76% neural 或全工作区视频比例属于历史阶段。

本文件中的当前布局标准取代旧 AGENTS 和早期计划中的布局比例要求；历史参数只用于理解当时的决策，不与当前标准并行执行。

视频进度条覆盖全片，条上缘显示当前来源和类型的事件，拖动暂停定位。进度条上方的「事件标记」默认收起，进入「编辑片段」自动展开，＋／− 和指针滚轮缩放，按住 Shift 滚动滚轮或用左键左右拖动可平移事件轴，「全程」复位。缩放仅改变事件条窗口，主视频位置和神经窗口保留。有视频时按视频秒投影录制事件，只显示视频及已测帧时钟覆盖内的点或区间交集；无视频时以神经秒显示。标注编辑器保留悬停预览与边界手柄。视频角落文字标签、时间轴和神经 mask 共用颜色。Speed × 的右侧手柄支持横向拖拽（0.01/像素，Shift 为 0.001）和直接输入。

每次点「事件放电」都会在信号标签栏新建分析。标签较多时会自动缩短标题，悬停可看全名，滚轮可左右翻动信号、分析和视频标签栏。切换信号区标签只替换神经区域，视频可以继续播放或标注。已有分析点原标签继续，保存过的结果从「项目 → 打开已保存的事件放电分析」读取。切换条件沿用参照条件的组员、行序与色标。点 Unit 查看逐次 spike，再点试次回到原始记录和对应视频。「查找相似片段」展开工作台底部面板，拖动分隔线可改高度，折叠后再展开保留选择。

## 状态归属

| 状态 | 归属 | 约束 |
| --- | --- | --- |
| Recording、Unit、group、时间范围、游标、选中区间、解剖焦点 | `scripts/app.js` 的共享实验状态 | Canvas、Probe、视频和深入检查不能各自维护冲突选择 |
| 视频播放和 neural / video 映射 | `scripts/video-sync.js` | 所有跳转与导出使用同一 TimeMapping；遵守实测覆盖范围 |
| 标注 document、scheme、review、undo、草稿 | `annotation-core.js` / `annotation-ui.js` | 视频相对秒通过映射接入共享时间；服务项目草稿按 project/recording/video 隔离；浏览器单文件项目按 project/recording/video/origin 隔离 |
| 局部 focus、放大请求与 split 比例 | `app.js`，标注 UI 报告打开状态 | 布局变化不得改写科学选择、数据或同步映射 |
| 本地来源链接与 recent projects | `project-ui.js` / 本地服务 | 服务保存完整项目；文件包含来源引用、目录元数据、视频映射与标注；缺失或变化的来源在功能清单说明 |

## 保留能力的可发现性

原有 Unit list/filter 由 Find Unit 承接主要查找路径；完整 legacy 检查组件继续按需使用。主画面减少常驻面板不能被当作删除旧能力的许可。所有保留、迁移和缺口由 [Parity matrix](PARITY_MATRIX.md) 跟踪。

## 展示与交互规范

顶栏以纯文字显示 Neuropixels Explorer。空工作区的投放提示只包住操作文字，示意图放在框外。平时使用细实线，拖文件时高亮整个接收区域；错误投放显示红色。

主信号图的轴工具提供测量、手形平移、框选时间轴放大、恢复全程与前一个／后一个时间窗。Esc 取消进行中的拖动。轴上的前进和后退只更新该记录的时间窗，编辑撤销保留相应操作的状态，连续手势只占一步。行为对齐面板与标注编辑器各自处理本面板的撤销。刷新页面会清空内存中的操作历史。

- 主画面以逐 Unit 的信号行、解剖参照和同步视频为核心。头部显示记录身份、时长、Unit 数、可用数据、共享时间和 Find Unit。waveform、QC 和完整 Probe 检查器按需打开。
- 主信号行按 shank、深度和原始 Unit ID 稳定排序。组头和行名提供所属解剖位置，Probe 保留来源映射及缺失信息。
- 工作区给每个 Unit 分配可纵向滚动的行，按解剖边界分组。组头显示 Unit 数，可收起和展开。真实 spike 密集到像素重叠时按像素密度显示，同一行保留 Hz 曲线。
- 打开 Recording 时显示全程。单击信号设游标，横拖信号选区间，横拖左侧 Unit 卡片或底部秒刻度平移。放大模式下直接用滚轮缩放，其他模式按住 Ctrl/Cmd 滚轮围绕指针缩放。全程条标明当前窗口在记录中的位置，面板显示绝对区间、窗宽、Hz 范围和分箱秒数。
- 单击解剖分组标题可展开或收起整组。最近选中 Unit 和短过渡帮助定位。其余行保留各自的 spike 与 Hz，右侧滚动可继续查找其他 Unit。
- Find Unit 使用真实存在的字段查找并聚焦对应行；解剖选择反向突出相关行而不改变时间范围。选中 Unit 同时标识其位置、脑区与映射可信度。
- Inspect unit 按需复用已有 waveform/template、ACG/ISI、漂移稳定性、QC、解剖元数据、标签和导出等可用能力。channel footprint 等细节以实际能力和 Parity Matrix 为准，不能因规范提及就宣称具备。关闭恢复范围、游标、所选 Unit 和解剖焦点。
- 无视频时保留足够大的用途示意区；添加视频位于顶部项目操作，验证视频位于项目菜单。移动控件时保留键盘和可访问性行为。
- 浅色采用冷白背景、深蓝文字和钴蓝操作色，深色与高对比度保留。共享神经时间使用琥珀色标识；图表中的脑区、标注和科学量不随装饰色重新编码。字体使用本机系统字体，单文件无需外部字体或图片服务。

## Event responses preview

Event responses opens a new signal-pane tab with settings expanded. Choose the event, Units, recording time range and event-relative response window, then run. All Units and the whole recording are the initial scope. Comparison is off until the user chooses a field and two values. A new analysis uses an explicit event choice or the only available type. Reopen settings above the results to adjust the analysis. The heatmap and selected Unit’s trial raster share an event-relative time axis. Clicking a trial returns to its original recording time and synchronized video where covered. Grouping by response shape is optional. Condition switches retain group membership and row order. Input and advanced settings expose Unit, trial, window and bin controls. See [usage and limits](contracts/EVENT_RESPONSES.md).

The calculation details show event alignment and firing-rate computation, and the grouping steps after fitting. Screen plots follow the theme. PNG exports use a white background.

Grouping results label each row with its group number and the same colour used for that group's mean curve. One group selector locates and highlights its members. Workspace and analysis controls show a short action description after a 550 ms pointer pause or on keyboard focus. Escape dismisses the description.

可选模型数据入口位于 Edit clips → Clips & grouping → Model features / keypoints。导出模型输入、导入特征并分组、组数、置信度和标准化控件复用现有审核面板；不增加常驻主工作区，不加载外部代码。详见[视频特征契约](contracts/VIDEO_FEATURES.md)。

本地服务中已选入当前项目的视频也可使用同一模型数据入口，不增加主工作区控件。服务仅返回视频内容指纹，分组继续在浏览器运行；取消或关闭会丢弃过期结果，但已开始的有界服务端读取可能完成。

The same Model features / keypoints section includes an optional clearly labeled pixel-adapter example for local File/browser-project video. It reads the first 30 seconds in explicit half-second bins and uses the existing grouping/review controls. This is not a behavior recognizer or a separate advanced mode. The trusted source-integrated model callback is described in [Video features](contracts/VIDEO_FEATURES.md).

## Population dynamics entry

The **Event responses** tab opens in Trial review. After comparing two conditions, the result selector switches between Trial review and figures 5J–5M in the same neural pane. The recording header’s **Event response figures** shortcut selects a figure in that tab. All views share the analysis settings. Jumping from 5L to the signal or video leaves the figure and its selected trials in the analysis tab. Escape within a figure returns to Trial review.

**New analysis → Population dynamics** opens the continuous population-dynamics tab beside signals. Range and Unit inputs belong to that tab. Its trajectory/bin selector returns to the neural cursor and current video mapping. Close and Cancel stop its independent computation. See [contract](contracts/POPULATION_DYNAMICS.md).
