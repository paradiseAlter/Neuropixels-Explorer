# Capability Parity Matrix

[文档索引](../README.md) · [PRD](PRD.md) · [IA](IA.md) · [Data contract](DATA_CONTRACT.md)

用途：记录旧能力的新入口，以及 browser-folder / local-service 两种模式的差异。基线为 4.1.2-beta.1 的现有代码和版本记录。下表的“保留 / 已实现”表示存在对应代码与入口；检查列列出可执行验证或历史依据，**不是本次全部重跑、用户验收或科学验证声明**。

| 能力 / PRD | 当前入口与迁移 | Standalone browser / folder | Local service | 状态与依据 |
| --- | --- | --- | --- | --- |
| 项目创建 / 保存 / 打开 / R11 | 导入、打开项目、保存项目 | 空白页拖入或选择 Kilosort / Allen NWB、视频、帧时钟及标签。可逐步补齐文件，当前工作区通过导出完整 .neuroproject 包保存 | 通过系统选择器登记磁盘引用，支持神经数据 + 视频及项目恢复 | [浏览器项目](../scripts/browser-project-ui.js)、[service roundtrip](../tests/python/test_project_files.py) |
| Kilosort 打开 / R1 | 文件夹选择；本地 Open recording folder | 浏览器选择 / 拖入 | 原地注册与持久来源链接 | 保留；[code / real-data check](../tests/validate-real-data.cjs)、[local import browser](../tests/validate-local-import-browser.cjs) |
| Allen NWB / R1 | Open Allen NWB → physical probe | 单文件版内嵌 h5wasm / WORKERFS，可一次选择多根物理探针，每根探针对应一条记录 | 适配后进入同一 Recording 工作区 | 4.8.0 新增浏览器适配；[Beta 3](archive/checkpoints/beta3-workspace.md) |
| Recording / Data Status / R1 | 全局切换和状态入口 | 已选文件可用性检查 | catalog、增量补充与事务回滚 | 保留；[ingest check](../tests/validate-incremental-ingest.cjs) |
| 全程定位与解剖 / R2 | 逐 Unit 信号、底部全程拖动条、解剖分组、mini Probe | 来源 spike 和导入时的元数据 | 当前记录的 spike 和 catalog | [信号工作区检查](../tests/validate-signal-workspace.cjs)、[活动元数据检查](../tests/validate-activity-overview.cjs) |
| Unit 查找 / R3 | 常驻列表的主要查找操作迁入 Find Unit | 可用 | 可用 | 迁移而非删除；[layout check](../tests/validate-workspace-layout.cjs)、[viewer checkpoints](archive/checkpoints/UNIFIED_EXPERIMENT_VIEWER_IMPLEMENTATION_MAP.md) |
| 跨组查看 Unit / R3 | 整张 Unit 卡片可点击或横拖，Ctrl/Cmd + 单击追加高亮参考，共享 spike 和发放率时间轴 | 读取本地 spike 文件 | 当前记录提供的 Unit review 数据 | [交互检查](../tests/validate-signal-workspace.cjs)，每个 Recording 独立保留本次页面会话的高亮参考行 |
| 标签对齐与片段检索 / R14 | 「同类事件放电」显示所选 Unit 的逐次 spike，点事件时间回看原记录，横拖一行可找相似片段。候选与参考同尺度显示 | 读取本地配对 spike 数组，支持 Allen 浏览器项目 | 依赖浏览器可读的 spike 文件 | [计算及覆盖检查](../tests/validate-behavior-patterns.cjs)，相似度供人工审阅 |
| Unit raster、waveform、QC、完整 Probe / R3 | 主信号区逐行显示 spike 与 Hz，Inspect unit 提供波形和 QC 等深入检查组件 | 按输入可用性 | 按 catalog / 资产可用性 | 保留；不是已完成所有旧控件逐项人工 parity 验收；[real-data check](../tests/validate-real-data.cjs) |
| Video / validation video / R4 | 主工作区视频区与添加视频动作 | browser-local media | 注册媒体 HTTP range streaming | 保留；[sync check](../tests/validate-video-sync.cjs) |
| Alignment / frame clock / R4 | 视频对齐与匹配 clock 导入 | 共享映射逻辑 | 共享映射及持久来源元数据 | 已实现；[frame-clock check](../tests/validate-frame-clock.cjs)；手工对齐仍未验证 |
| 人工片段 / R5 | 播放器旁的单击时间点与标记／停止持续事件、标签设置、视频全程进度条及独立可缩放事件条、片段悬停预览与秒／帧边界编辑 | 可用 | 可用 | 已实现；[annotation check](../tests/validate-annotations.cjs)、[interaction checks](../tests/validate-annotation-interactions.cjs)、[browser workflow](../tests/validate-annotations-browser.cjs) |
| Scheme / review / undo / export / R5 | Clips & grouping、JSON / CSV | 单文件版按项目隔离的 browser-origin 草稿 | project/recording/video 草稿；完整项目文件同时保存 source links、映射和标注 | 已实现；[annotation contract](contracts/BEHAVIOR_ANNOTATION.md)；JSON 才是完整便携备份 |
| 候选导入与 motion grouping / R6 | 批量审阅中的导入和 Experimental grouping | 本地运行 / 人工审阅 | 同一浏览器候选工作流 | 实验性，不是准确率验证；[methods and limits](contracts/BEHAVIOR_ANNOTATION.md) |
| 放大与返回 / R7 | Edit clips / enlarge → 调整 split → Signals / Esc | 同一前端路径 | 同一前端路径 | 4.1.2 恢复上下文连续性；[mentor check](../tests/validate-mentor-workspace.cjs)、[dated UI evidence](archive/checkpoints/mentor-workspace-4.1.md) |
| 区间 Probe 分布 / R8 | Video/neural saved clip or signal drag -> Interval distribution; vertical/horizontal chart and Unit list | Worker spike count / covered seconds | server-backed spike count / covered seconds | 两种模式已实现；半开边界由契约测试检查；[interval service](../server/neuropixels_explorer/interval_activity.py)、[4.1 evidence](archive/checkpoints/mentor-workspace-4.1.md) |
| Theme / language / Help / R9 | 全局控件、离线 Help、context help | 可用 | 可用 | 保留；[i18n / Help check](../tests/validate-i18n-help.cjs) |
| 本地打开与恢复项目 / R9 | 浏览器打开独立 HTML，拖入已保存项目 | 当前标签页的工作区、完整项目包，可读取旧版 IndexedDB 项目 | 旧目录通过开发维护工具访问 | [Getting started](guides/GETTING_STARTED.md) |
| Raw AP/LFP | provider contract | 未注册可用 provider | 未注册可用 provider | 仅扩展契约，未实现读取 / 渲染；[stream contract](../scripts/stream-contracts.js) |
| 多通道模板分布 / R10 | Probe → Unit template distribution，可与区间统计同时打开 | Worker 读取 dense 模板 | Unit review 返回 templateFootprint | [契约检查](../tests/validate-template-footprint.cjs)、[Python 检查](../tests/python/test_template_footprint.py)；无模板的 Allen 适配记录显示缺失，不推断 |
| 3D / AI 工作流 | 尚无确认交付入口 | 不宣称具备 | 不宣称具备 | 提案或非目标；[PRD](PRD.md) |
| 入口与布局 / R13 | 顶部文件和项目入口；全高 Probe 观察栏可收起；桌面默认左右布局，可切换上下布局；视频全程进度条常驻，事件条默认收起，进入「编辑片段」自动展开；播放细调单独折叠；验证视频在 Project 菜单 | 同一前端，SVG 空白示意 | 同一前端 | 4.10 在单文件浏览器中检查 Allen 视频、标注工具、区间、Unit 检查往返、固定对比、布局和 Probe 收起；Kilosort 模板、三主题与窄屏；见 [Validation](validation/VALIDATION.md) |

## 后续 parity 检查

涉及入口搬迁时，更新对应行，记录原入口、新入口、模式差异、键盘操作和往返状态。涉及 layout 的变化需在真实运行 UI 中检查，不能仅靠静态断言宣称完成。完整旧 inspector 控件、所有键盘路径和所有 viewport 的逐项人工复核尚未由这张矩阵建立；本表也不代表旧 multi-round plan 的后续 gate 已批准。

执行命令与可选本地数据 / 浏览器环境见 [Validation](validation/VALIDATION.md)。影响功能状态的重要验证结果维护在适用记录中，注明日期、版本、输入和未覆盖项；普通检查在任务回复中报告，不按对话追加版本记录。

## Event response preview (4.11.0-beta.1)

Local standalone and local folder inputs support experimental-event/annotation response calculation, cancellation, source return and separate JSON export. 4.12 adds saved-result restoration in browser projects, with source verification and optional NWB Unit observation coverage. Indexed-service event analysis is not implemented. Old packages without saved analysis remain compatible. 4.13 adds group heatmaps/means, member-only selection, subject/track filters and descriptive split-half diagnostics; actual video-plus-analysis packages survive a full page reload. These checks do not constitute a reviewed scientific behavior case. See [scope and validation](contracts/EVENT_RESPONSES.md).

4.15 optional video-feature exchange supports local file/browser-project Blobs and selected local-service project streams through bounded metadata-only content hashing, with data-only model-input export, timed scalar/keypoint JSON, bounded grouping and complete source/result restoration. Arbitrary remote/indexed URLs outside the selected-project path, arbitrary external-code loading and real-model accuracy remain unsupported/unvalidated. Existing manual annotation remains independent. See [Video feature contract](contracts/VIDEO_FEATURES.md).

The optional source-integrated local frame-model adapter and pixel example now run inside the standalone HTML for File/browser-project Blobs. They share annotations read-only and use the existing feature grouping, undo/review and complete project persistence. Service URL streams retain data-only exchange. No generic script loader, trained-model accuracy or DLC/SLEAP reader is claimed. See [Video feature contract](contracts/VIDEO_FEATURES.md) and [adapter checks](../tests/validate-video-model-adapter.cjs).

## Continuous population dynamics

Local standalone/browser-project Recordings provide bounded continuous spike-count analysis, training-only PCA, affine/constrained-line/baseline comparison, trajectory-to-source return and separately saved project results. Indexed-service dynamics is not implemented. Old project packages remain compatible. Known coverage gaps are respected; unknown or partial coverage stays explicit and does not require behavior labels. See [contract and checks](contracts/POPULATION_DYNAMICS.md). Numerical parity is not scientific validation.
