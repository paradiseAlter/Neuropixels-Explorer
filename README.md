# Neuropixels Explorer

本地神经活动与行为视频浏览、同步和标注应用，连接时间、Unit、探针位置、原始脑区标签和实验室自定义行为标签。

代码版本见 [VERSION](VERSION)，变化见 [CHANGELOG](CHANGELOG.md)。代码采用 [MIT License](LICENSE)；数据、视频和模型权重遵循各自许可，不随产品仓库分发。

## 快速开始

用 Chrome 或 Edge 打开 [独立版 index.html](index.html) 即可开始。把这一个文件发给别人，对方也可以离线使用。
将 Kilosort 文件夹或含已分选 Unit 的 NWB 2.x（HDF5）拖到神经活动区，将视频拖到视频区。点击「视频标注」区域可以新建标注，把已有标注 JSON 拖到同一处即可导入。拖动时会高亮接收区域，错投时会指出正确位置。补文件可以直接拖到写有文件名的位置，例如视频标题下方的帧时钟 JSON 提示。多种类型一起导入可使用「导入文件」。
工作区保存在当前标签页。点击「保存项目」可写出包含记录、视频和标注的 `.neuroproject`。勾选复制输入文件后，选择目标目录，工具会将可用的输入文件另存到项目包旁的 `inputs` 子目录。
下次使用时可以把项目包拖回页面恢复工作区。
分享工具只需发送这一个 HTML。已有数据和标注的工作区可另附项目包。

## 文档索引

| 职责 | 文档 | 维护内容 |
| --- | --- | --- |
| 产品需求 | [PRD](docs/PRD.md) | 目标、范围、需求、非目标和验收边界 |
| 信息架构 | [IA](docs/IA.md) | 页面、入口、层级、操作流程和状态归属 |
| 数据契约 | [Data contract](docs/DATA_CONTRACT.md) | 身份、时间、坐标、统计含义、存储和交换格式 |
| 功能保留与差异 | [Parity matrix](docs/PARITY_MATRIX.md) | 旧能力的新入口、运行模式差异、实现与验证依据 |
| 技术架构 | [Architecture](docs/ARCHITECTURE.md) | 模块、服务、渲染、缓存和运行边界 |
| 使用说明 | [Getting started](docs/guides/GETTING_STARTED.md)；[中文](docs/guides/USER_GUIDE.zh-CN.md) / [English](docs/guides/USER_GUIDE.en.md) / [Español](docs/guides/USER_GUIDE.es.md) | 安装与操作；三语说明同时是应用内 Help 源文件 |
| 专项契约 | [行为标注](docs/contracts/BEHAVIOR_ANNOTATION.md)；[探针脑区映射](docs/contracts/PROBE_REGION_MAPPING.md) | 完整格式、字段、示例与解释限制 |
| 开发与发布 | [Development](docs/development/DEVELOPMENT.md)；[Release management and lineage](docs/development/RELEASE_MANAGEMENT.md)；[仓库边界](docs/development/PRODUCT_REPOSITORY_BOUNDARY.md)；[SQLite schema](database/README.md)；[AGENTS](AGENTS.md) | 服务命令、候选提升、研发历史、迁移及协作约束 |
| 验证 | [Validation](docs/validation/VALIDATION.md)；[Allen VBN](docs/validation/ALLEN_VBN_VALIDATION.md) | 检查入口、公开数据流程、证据适用范围 |
| 分阶段计划 | [Viewer multi-round plan](docs/planning/UNIFIED_EXPERIMENT_VIEWER_MULTI_ROUND_PLAN.md) | 原有轮次、评审门槛和历史进度；不自动授权后续开发 |
| 待讨论反馈 | [导师反馈 2026-09-13](docs/MENTOR_FEEDBACK_2026-09-13.md) | 原始问题和候选解释，不直接等同于确认需求 |
| 历史证据 | [Checkpoint archive](docs/archive/README.md)；[CHANGELOG](CHANGELOG.md) | 各版本实现、测试、偏差和评审记录 |
| 许可与引用 | [Third-party notices](THIRD_PARTY_NOTICES.md) | 第三方方法、数据来源和许可边界 |

## 如何维护

README 只保留简介、启动入口和索引。需求写入 PRD，界面组织写入 IA，字段和科学含义写入 Data contract，功能迁移与模式差异写入 Parity matrix，模块实现写入 Architecture。专项文档保存详细格式和方法，主文档链接到它们，避免复制多份定义。

工作前按任务阅读对应文档，完成后同步维护受影响正文。对应文档中较新、已确认且适用的标准优先于旧 AGENTS、计划和 checkpoint；候选反馈不自动成为确认规格。[AGENTS](AGENTS.md) 只维护协作和文档使用规则。

CHANGELOG 仅记录重要功能、关键修复、兼容性/契约变化及正式版本或重要评审节点，不按对话生成条目。普通检查在任务回复中报告，重要验证证据保留在适用记录中。旧记录中的 current / PASS 只适用于当时版本；提案、实现、测试、用户验收和科学验证分开表述。

## Event response preview (4.13.1-beta.1)

The standalone HTML now computes start-aligned responses from experimental events
or named manual annotations and accepted candidates. See [Event responses](docs/contracts/EVENT_RESPONSES.md)
for usage, population/group views, split-half sensitivity, source coverage, project
restoration and remaining interpretation limits.

连续神经时间分析：[Population dynamics contract](docs/contracts/POPULATION_DYNAMICS.md)。

可选视频特征与模型数据交换：[Video feature contract](docs/contracts/VIDEO_FEATURES.md)。
