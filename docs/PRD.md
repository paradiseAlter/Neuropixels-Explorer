# Product Requirements Document

[文档索引](../README.md) · [信息架构](IA.md) · [功能对照](PARITY_MATRIX.md)

本文整理已确认产品方向。2026-10-21 用户确认优先完善联动工作区，并同时提供区间活动分布和多通道模板分布；2026-10-22 用户确认以项目创建、保存和重新打开组织导入，并要求启动直接展示完整工作区；新版以独立 HTML 和浏览器本地缓存交付；2026-10-25 用户授权在现有功能完整保留的前提下重做视觉、布局和交互。实现依据见 [Architecture](ARCHITECTURE.md)。

## 目标与使用者

帮助研究者在一份 Recording 内理解时间、神经活动、Unit / Unit group、shank / depth、原始脑区标签和动物行为的对应关系，并在同一上下文中检查 Unit、观看视频、编辑行为区间。优先让关系清楚、操作连贯，再按需展开分析细节。

产品应是信息清晰的实验浏览器，不扩展为通用 dashboard、完整电生理套件或堆叠图表、卡片和筛选器的界面。视觉优化应帮助用户理解信号、解剖和视频的关系，而不是增加需要自行交叉对照的面板。

工作区显示调整的默认范围是打开 Recording 后的实验工作区。保留数据打开、数据库访问、Recording 切换、语言/主题/Help、Kilosort 读取、视频添加和验证视频等能力；除非任务明确包含这些内容，不顺带重做全局外壳、导入、导出或数据库管理。

## 需求与验收关注点

| ID | 需求 | 验收关注点 |
| --- | --- | --- |
| R1 | 打开处理后的 Kilosort Recording，或在独立 HTML 打开含已分选 Unit 的 NWB 2.x HDF5；旧本地服务适配 Allen NWB | 原始 Unit ID、spike timing、质量标签和来源保留；不重新 spike sorting |
| R2 | 进入 Recording 即可看逐 Unit 放电及其全程位置 | 实际信号从两秒窗开始。每行同时显示 spike 和 Hz，共享绝对秒刻度。底部全程条显示当前位置，右侧滚动可查看按解剖位置排序的各 Unit |
| R3 | 在同一时间窗中找 Unit、对照多行并按需深入检查 | 单击左侧整张卡片选中或移除 Unit，Ctrl/Cmd + 单击可追加参考行。横拖卡片平移信号。各行等高，跨组滚动时高亮行可固定在顶部。深入检查提供 waveform、raster、QC 和 Probe |
| R4 | 使用共享时间状态浏览视频与神经活动 | Linked 不等于已同步；手工对齐明确未验证，实测 frame clock 保留有效范围 |
| R5 | 在播放中标记命名行为，使用独立事件条复核 | 时间点单击记录并保持播放状态，持续事件用「标记／停止」记录起止。标签通过「＋ 新标签」设置名称、颜色与默认事件类型。全程视频条常驻，事件条默认收起，进入「编辑片段」自动展开，可独立缩放和平移。原始事件在映射覆盖内显示。编辑支持悬停预览、秒／帧精调、标签颜色、scheme、review、撤销与重做、JSON/CSV 和草稿 |
| R6 | 导入外部候选或运行实验性分组后人工审阅 | 原始 run 与人工修改分离；候选不自动变成确认行为 |
| R7 | 放大视频或进入标注时保留神经上下文 | 使用可调整的上下／左右 split；记录身份、神经时间、活动与 Probe 继续可见，返回保留状态 |
| R8 | 从视频或神经行为片段带选择已保存片段，或在信号区拖选时间，按需查看 Probe 活动分布 | 统计为真实 spike count / 实际覆盖秒数；点大小、逐 Unit 列表和可切换横竖方向的深度—Hz 图共用结果；默认竖向；浏览器 Worker 与服务分别计算相同半开区间统计 |
| R9 | 保留语言、主题、Help、键盘和本地数据能力 | 三语 Help 离线可用；运行路径、源数据和用户标注不写入产品源码 |
| R10 | 选择 Unit 后按需查看多通道模板分布，与 R8 可同时展开 | 按真实电极坐标显示各通道存储模板的峰峰值；选通道查看同尺度波形；显示主导模板及其 spike 占比；缺失数据不推断。改变时间选区不改变全记录模板，切换 Unit 保留选区统计 |
| R11 | 创建神经数据项目或神经数据 + 视频项目，保存后重新打开 | 单文件版支持按区域拖放，区域与文件类型不符时拒绝整次拖放并提示正确位置。通用导入支持混合文件。可只打开视频、部分 Kilosort 文件或 NWB，再补入所需数据。缺项在所属功能直接显示文件名或格式，并可就地拖入。多组记录、视频与时钟按归属关联。导出项目包可保存此次工作。关闭有未导出修改的页面时提醒 |
| R12 | 启动即展示完整工作区，之后在工作区创建或打开项目 | 无独立开始页面；活动、两类 Probe、视频和标注的空白区域说明用途与前置输入；最近项目在顶部菜单；载入后原区域显示真实数据 |
| R13 | 项目入口统一、空白模型示意及可比较的视频布局 | 单文件版顶部提供导入文件、打开与导出项目，分组导入在项目菜单；视频按钮统一尺寸与中性色；空白 Probe 显示标明用途的虚拟模型；左右及上下布局保留同一 Unit、选区与播放时间 |
| R14 | 从同标签的重复事件寻找常见放电时序，也可从一段原始信号反查整条记录 | 显示参考事件、Unit 和时间范围，按分开的行为串报告逐时间箱的出现次数和分母。以真实事件或用户选区作参考，同尺度比较候选 spike。保留群体响应、逐次事件、视频回查与覆盖说明 |

功能入口、运行模式差异和相关检查逐项维护在 [Parity matrix](PARITY_MATRIX.md)，不在这里重复维护完成勾选。

## 范围与非目标

现有产品包含本地 Recording 打开、活动概览、Unit 深入检查、视频同步、行为区间标注和可审阅的候选导入。浏览器文件夹模式与本地服务模式的能力不完全相同。

以下不能从当前文档推定已实现或已确认：通用行为识别器、自动科学结论、完整 Kilosort curation、原始 AP/LFP 渲染、注册后的三维脑图，以及通用 discovery、跨 Recording 统计对比和 AI 新工作流。同一 Recording 内的多 Unit 同窗浏览属于 R3，分箱相似度用于 R14 的人工样本核查。多通道模板分布属于 R10，不代表所选时间段的实测波形、反白化或微伏标定。原始电压目前仅保留扩展契约；实验性 motion grouping 尚无行为准确率或节省人工的验证。

导师对“分布”的两种解释保留在[原始反馈](MENTOR_FEEDBACK_2026-09-13.md)。2026-10-21 用户明确确认二者不冲突、应同时存在。两个面板独立展开，共用 Recording/Unit 上下文，分别说明时间区间活动与全记录代表模板的含义。

## 不变量

- 不修改来源 Kilosort / NWB / 视频、已验证算法、原始质量标签或解剖归属。
- 聚合行不是单个神经元；归一化活动不是 Hz；探针坐标不是细胞真实三维位置。
- 不猜测缺失解剖，不以手工 offset 或声明 FPS 证明同步精度。
- 测试、截图和工程演示只支持对应检查；用户布局验收和科学有效性单独记录。

## 需求变更

新反馈先保留来源、未决问题和候选解释。确认范围后更新此文档；入口变化同步更新 IA，格式或统计含义变化同步更新 Data contract，迁移与检查状态同步更新 Parity matrix。原有轮次门槛见 [multi-round plan](planning/UNIFIED_EXPERIMENT_VIEWER_MULTI_ROUND_PLAN.md)。

## Event-response implementation checkpoint

4.11.0-beta.1 adds a browser-native preview for experimental events and reviewed annotation events through one start-aligned response pipeline, optional seeded response clustering and source return. This is a review checkpoint, not completion of the long task. 4.12.0-beta.1 adds explicit per-Recording result saving/restoration in browser project packages and source-reported Unit observation coverage when available. 4.13 adds population/group views, subject/track selection, descriptive split-half sensitivity and complete video-package reload checks. A repeated genuinely observed behavior case, trained-model accuracy and scientific validation remain open. Continuous population dynamics now has a browser-native implementation described in [its contract](contracts/POPULATION_DYNAMICS.md); implementation and numerical parity do not constitute biological validation. 4.14 adds optional data-only feature/keypoint exchange and browser grouping; 4.15 extends it to already selected local-service project videos using bounded server-side content hashing and metadata-only responses. The later optional source-integrated local frame adapter is described below; arbitrary external-code loading remains unimplemented. See [Event responses](contracts/EVENT_RESPONSES.md).

The optional local frame-model adapter now gives trusted source-integrated JavaScript models decoded video pixels and a read-only annotation/mapping snapshot, then returns their scalar/keypoint output to the existing unsupervised grouping and review pipeline. The bundled pixel-statistics example is an interface demonstration, not a supplied behavior model. Arbitrary plugin loading, remote inference, trained-model accuracy and generic DLC/SLEAP support remain outside this checkpoint. The standard single-HTML workflow does not require this optional model path or a Python environment.
