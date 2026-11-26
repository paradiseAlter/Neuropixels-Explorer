# Data Contract

[文档索引](../README.md) · [Architecture](ARCHITECTURE.md) · [Parity matrix](PARITY_MATRIX.md)

本文件集中说明跨模块不变量；详细字段、完整示例和迁移以链接的专项契约与代码为准。文档整理不修改任何 schema 或数据。基线为 4.1.2-beta.1。

## 对象、身份与来源

浏览器单文件版导出 `.neuroproject`：8 字节 ASCII `NEUROPR1` + 4 字节
little-endian JSON 长度 + UTF-8 `neuropixels-browser-project/1` manifest +
按 manifest 顺序连接的 Blob payload。读取检查大小与边界。manifest 包含
项目、完整标注文档及资产路径/大小/类型；payload 包含已导入神经数组、Unit
元数据和视频。NWB 包含选定探针的派生输入。单文件版在标签页内保留工作副本和 Blob 引用，支持仅视频和部分神经输入。导出时写入现有输入与标注。打开项目包或旧 IndexedDB 项目时创建独立工作副本。
同一 NWB 可多选物理探针，每根探针对应独立 Recording。单文件版移除记录时，一并移除它专属的神经输入与分析。项目中的视频及其标注仍可独立使用。当前工作区保留最近八次移除供撤销。
批量导入的 Allen 会话和探针信息按 recording key 保存在 `project.recordingSources`。追加记录时一起提交新增数组、媒体和描述；已有记录的标注、视频与分析资产按原身份保留。读取早期单记录项目时可使用项目级 `session`，扩为多记录时把它移到原 Recording。
服务版 `.neuroproject.json` 保留路径引用契约，不作为浏览器媒体包读取。
单文件版将项目的视频保存在 `project.videoLibrary` 中。`activeVideoId` 指向选中的视频。每个视频有独立的标注文档、帧时钟和手工对齐。切换探针沿用当前视频及其对齐。通过 SHA-256 与采集会话校验的帧时钟可覆盖该视频的手工对齐。旧项目的探针视频绑定在打开时迁移，保留原标注文档身份。第一次同时加入多根探针和多个视频时，导入前需确认来自同一项目、同次采集。已知会话号不一致时不能共享视频。
重新加载或关闭标签页会结束当前工作区。便携包可以在另一浏览器恢复。

| 对象 | 约束 | 定义 / 实现 |
| --- | --- | --- |
| Recording / Unit | Unit ID 必须在 Recording 上下文中解释；不同 Recording 不能凭相同 ID 合并生物学身份 | [Kilosort reader](../scripts/kilosort-core.js)、[service](../server/neuropixels_explorer/service.py) |
| Kilosort arrays | 单文件版按记录目录保留已接收的文件。只有 `spike_times.npy` 时，逐行显示采样点；只有 `spike_clusters.npy` 时，保留行号、Unit ID 和该 Unit 的实际计数。两数组行数相同时可逐行配对。使用秒数、放电率或对齐前须从 `params.py` 读取或显式输入实际采样率。预览每次读取至多 128 行，可用滚动条定位其他行。 | [Getting started](guides/GETTING_STARTED.md)、[分批导入数值检查](../tests/validate-incremental-kilosort.cjs) |
| Standalone NWB reader | Units 表中的 id、spike_times（秒）、spike_times_index（逐 Unit 结束索引）是放电输入。优先 /units，或读取 /processing 中唯一的标准 Units 分选表；电极坐标、脑区、设备采样率和试次结果为可选元数据。可用事件来自记录或已对齐的外部标签。 | [Event responses](contracts/EVENT_RESPONSES.md) |
| Allen NWB adapter | 每份 Recording 对应选定的物理 probe；保留原始 ID、spike 秒、质量标签及 peak-channel anatomy；适配不是重新分选 | [Allen workflow](validation/ALLEN_VBN_VALIDATION.md) |
| Anatomy | Unit 映射和 probe-track 区域是不同来源；缺失为 Unmapped / unknown，不能用 track 标签冒充确认的 Unit 归属 | [Probe-region contract](contracts/PROBE_REGION_MAPPING.md) |
| Coordinate | depth 以匹配的坐标系解释，缺失不等于 0；shank ID 不自动等于跨 Recording 的同一物理 Probe | [Probe-region contract](contracts/PROBE_REGION_MAPPING.md)、[mini Probe](../scripts/mini-probe.js) |

## 时间与同步

帧时钟 JSON 的 `video.frame_times_s` 可包含每帧的媒体呈现时间，长度应等于 `video.frame_count`。逐帧及五帧步进索引这张表。若 `provenance.frame_clock.video_s` 本身覆盖声明帧数的每一帧，也可作完整帧表。压缩的对齐锚点只用于时间映射。缺少完整帧表时按视频描述符或时钟声明的 FPS 定位，未知则按 30 fps 估算。

神经时间和视频时间通过同一 `TimeMapping` 联系。映射可以是 affine，也可以是实测 frame-clock 的分段映射。实测 anchors 保留丢帧修正，不向覆盖范围之外外推。视频已链接不代表已对齐；手工修改 alignment 不能保留 verified 声明。frame-clock 导入检查视频身份和单调性。

行为片段使用 **video-relative seconds** 和半开区间 `[start, end)`。未标注区间不是负行为；不同 subject / track 可以重叠。神经区间统计同样遵守半开边界，并只以记录实际覆盖时长为分母。

来源：[video-sync](../scripts/video-sync.js)、[annotation contract](contracts/BEHAVIOR_ANNOTATION.md)、[interval activity](../server/neuropixels_explorer/interval_activity.py)。

## 显示摘要与真实统计

| 数据 | 科学 / 显示含义 | 不得表述为 |
| --- | --- | --- |
| 显示 pyramid 的单 Unit 活动纹理 | bin spike count 按该 Unit 非空 bins 的 p95 归一化、裁剪为显示强度 | 不同 Unit 之间可直接比较的原始 Hz |
| 显示 pyramid 的聚合行活动纹理 | constituent Units 中 count 严格高于各自全记录 bins p90 的比例 | 单个神经元，或原始 firing rate |
| Interval distribution | 每 Unit 在 `[start, end)` 的 spike 数 / 与神经记录重叠的秒数；点大小、列表和深度—Hz 图使用同一结果；横竖切换只交换轴；无位置 Unit 保留在列表，无覆盖时报错而非返回零 | waveform footprint、细胞三维定位、跨 Unit 连续波形 |
| Template waveform | 现有峰值通道代表模板，单位按真实来源解释 | 所选片段的实测多通道波形，或未标定的微伏 |
| Unit template distribution | 当前 Unit 的主导模板在各电极上的存储波形与峰峰值；全记录来源，与时间选区独立；波形切换共用幅值尺度 | 所选片段的实测波形、反白化幅值、已标定 µV、神经元真实空间定位 |

多通道模板的完整字段、dense 通道映射、主导模板归属及失败状态见 [Template footprint contract](contracts/TEMPLATE_FOOTPRINT.md)。

显示 pyramid 格式为 `neuropixels-display-activity-pyramid`，preprocessing version `3.0.0`，levels 为 128、256、512、1024、2048 bins。每行可追溯到 `unitIds[row]`，每 bin 可追溯到半开时间区间。缓存是派生显示数据，source fingerprint / preprocessing 变化需要失效重建；不能写回 Kilosort 来源。

当前定义依据 [Kilosort core](../scripts/kilosort-core.js)、[activity renderer](../scripts/activity-overview.js) 和 [activity checks](../tests/validate-activity-overview.cjs)。早期 checkpoint 的 fraction-active 与单层 512 bins 是历史定义，不应覆盖当前定义。

主信号行读取当前 Recording 的原始 spike 时间和 Unit ID。可见计数遵守共享视窗的半开区间 `[start,end)`。同一时间窗显示 raster 和分箱 Hz。多次放电落入同一像素时，用该像素的计数浓度绘制。发放率分箱对齐神经时间轴，分母为有效分箱时长。有来源观测区间时，分箱须完全覆盖，缺口留空。覆盖未知时按连续观测估算。参考行与行高属于本次 Recording 的浏览状态。见[信号实现](../scripts/signal-workspace.js)与[交互检查](../tests/validate-signal-workspace.cjs)。

行为对齐与片段检索使用浏览器可读的配对 `spike_times.npy`、`spike_clusters.npy` 和采样率。录制事件使用来源的绝对神经秒，入选视频标注按当前 TimeMapping 换算成神经秒。未审候选不参与。零点可选起点或终点，相对时间窗及分箱宽度可调。相同标签、subject、track、scheme 下相邻事件按指定间隔归为一串，可保留每次事件或每串一行。群体热图显示各 Unit 的平均分箱 Hz 减去其事件前整个窗口的平均 Hz。早、晚两部分按串的时间顺序切分，再分别计算基线。逐次 spike 保留相对于零点的原始时间。纳入的完整窗必须满足记录时间域和已知共同覆盖区间，覆盖未知或部分缺失的假设单列。

从事件行选择相对区间，或从信号区选择绝对区间，检索相同 Unit 的活动。比较向量按 Unit ID 对齐并按时间分箱，计数相似度为 `2 × dot(x,y) / (sum(x²) + sum(y²))`。每段至少含两个时间箱、三次 spike、两个非零单元格，以及至少一个随时间变化的 Unit。比较同类事件时排除参考行为串及与参考重叠的事件窗。整段检索在绝对时间网格上滑动同长度窗口，显示实际步长。结果提供样本数、排除原因和排序。可另与一个标签及远离目标和对照标签的背景窗口比较。给定可映射的视频神经时间范围时，在全部已评分结果内筛选起止均可播放的完整片段，再从中选取不重复样本。每组显示可视频核对数及已评分总数。高分说明所选 Unit 在本分箱宽度下的放电计数和时序接近。见[匹配实现](../scripts/behavior-patterns-core.js)与[计算检查](../tests/validate-behavior-patterns.cjs)。

重复放电条单独计算每个 Unit、每个相对时间箱至少出现一次 spike 的窗口数。按记录顺序，每个行为串最多保留一个合格窗口，且已计数的绝对时间不再使用。分母包括合格的无放电窗口。至少三个窗口达到上述 spike 信息量要求后，用各次事件的二值占用向量与其余窗口的合计占用向量计算余弦相似度，取正相似度最高的一次真实事件作为代表。该次数统计与用于查找候选片段的计数相似度各有自己的定义。它描述选定 Unit 在这次记录中的重复时序，未校正基础放电率，也不估计成对连接或群体动力学。

显示摘要必须与已验证的原始测量和科学指标分离，真实测量仍可在深入检查中访问。每个 group 保留完整 Unit 成员和时间映射，不能跨越不兼容的解剖边界或抹去映射来源/可信度；缺失解剖明确标为 `Unmapped`。归一化与聚合必须避免由高放电 Unit 单独主导，并明确解释计算含义。不得为显示效果修改来源数组、Unit 标签、质量分类或解剖归属。

## 标注和交换格式

| 格式 | 版本 | 契约 |
| --- | --- | --- |
| 标注 JSON | `neuropixels-annotations/1` | 保存全部方案、原始 runs、人工修改与区间；原生导入作为一次可撤销的替换 |
| Candidate JSON | `neuropixels-behavior-candidates/1` | 显式 `video_seconds`，校验视频、范围与唯一 run ID；候选 run 追加，不修改 neural catalog |
| CSV | 当前 scheme 的表格导出 | 包含视频 / 神经时间、同步状态与 provenance；不能代替完整多方案 JSON 备份 |

原始候选、人工可编辑边界、方案映射和 review 状态分离；修改物理边界使所有方案相关 review 失效。候选 `distance` 不是行为概率。可选 `vocabulary` 保存最多 1,000 个唯一非空标签名（每个至多 200 字符），创建名称不生成片段。帧号输入按标称 FPS 换算为视频秒，不能充当实测帧时钟；变帧率视频使用秒数。可选 `labelColors` 随 project JSON 保存，旧 project 在校验时取得 palette；不因此更换 schema 名称。

完整 JSON 示例、限制及转换命令见 [Behavior annotation](contracts/BEHAVIOR_ANNOTATION.md)，可执行定义见 [annotation-core](../scripts/annotation-core.js)。

## 持久化与路径

SQLite 保存元数据、provenance 和外部资产引用，不存大型 neural/video BLOB。catalog 相对路径受 runtime data root containment 约束。通过本地选择器显式授权的外部来源由 grants 管理；浏览器不能自行指定任意源路径。NWB 派生文件、本机链接和 cache 是运行时状态，源文件保持不变。

Indexed 模式使用服务的派生 cache；folder 模式使用 Worker / IndexedDB。本地服务项目草稿存入运行目录 `.explorer-local.json`，按项目 ID 与 recording/video context 隔离；独立 HTML 使用上述页内工作副本。保存项目写入 `.neuroproject.json`（`neuropixels-explorer-project/1`），包含单条 Recording 的目录元数据、源文件位置及大小/修改时间指纹、视频引用、完整 TimeMapping 和全部标注文档。标注内部 schema 保持不变。打开项目可在新的服务目录恢复目录行和关联；源数组、Allen 派生数组与视频通过引用读取，不复制进 JSON。文件缺失或变化时保留项目并列出受影响功能。项目文件使用临时文件替换保存；保存失败保留上次文件。本机草稿与手动保存的项目文件分别保留，打开文件以文件快照为准。

SQLite 的权威 schema 是 [ordered migrations](../database/migrations/)；[database README](../database/README.md) 维护迁移规则，[repository boundary](development/PRODUCT_REPOSITORY_BOUNDARY.md) 维护发布边界。已发布 migration 不改写，新契约通过追加迁移和对应检查引入。

## Event response preview

[Event response contract](contracts/EVENT_RESPONSES.md) defines the unified experimental/annotation event asset, explicit acquisition coverage, half-open response tensor, clustering provenance and separate JSON export introduced in 4.11.0-beta.1. 4.12 adds an optional checksummed binary analysis asset to the existing browser project/1 format, versioned chunk-content fingerprints and source-reported per-Unit observation coverage. 4.13 retains subject/track filters and optional versioned split-half diagnostics with checked summary consistency. Heatmap z-scores and equal-Unit group means are derived displays, not new measurement types. Unknown recording coverage is not inferred from the final spike. The 4.13.1 importer preserves bounded NWB invalid_times metadata separately from events and marks its scope unapplied. Per-probe, stimulus and unknown tags are not globally converted into neural coverage masks; older mistakenly imported invalidity events require reimport.

Optional `neuropixels-video-features/1` and `neuropixels-model-input/1` contracts preserve video-content identity, explicit sample intervals, keypoint confidence/missingness and declared transformations. Complete source features and unreviewed grouping results remain in annotation runs. These intervals are not neural acquisition coverage. See [Video features](contracts/VIDEO_FEATURES.md).

The 4.15 selected-project bridge adds `neuropixels-video-fingerprint/1`: project/recording/video IDs, video name/size and the existing ordered-chunk fingerprint only. Its request accepts no filesystem path or arbitrary URL. A fingerprint checks selected file content, not acquisition coverage or scientific validity. See the [bounded service contract](contracts/VIDEO_FEATURES.md).

Source-derived observation coverage is selection-bound: Unit changes, failed source lookup and failed analysis restore clear its input. Computation rechecks the current Unit intersection; old automatically filled intervals cannot silently become a manual coverage declaration. Explicit manual edits remain unverified. See [event responses](contracts/EVENT_RESPONSES.md).

The optional `local-video-model-adapter/1` provenance retains exact model-input snapshots and their JSON digest, resize dimensions and explicit seek-time sampling. Callback outputs retain original requested sample intervals; seek time is not measured frame PTS or neural coverage. Local-model candidates remain unreviewed. See [Video features](contracts/VIDEO_FEATURES.md).

## Continuous population dynamics

[Population dynamics](contracts/POPULATION_DYNAMICS.md) defines continuous neural-time counts, training-only PCA, chronological prediction splits, explicit unknown/partial observation coverage and model-comparison interpretation. Its optional per-Recording project asset preserves all bins, Unit identities, models and source content fingerprints; it does not alter event or annotation schemas.

Event responses retain original review state when named manual intervals are selected. Unknown observation coverage is stored as null with an explicit assumption, never inferred from last spikes or video length. Known source gaps remain applied. Response /1 snapshots retain their original semantics; /2 supports the additional null-coverage case. See [Event responses](contracts/EVENT_RESPONSES.md).
