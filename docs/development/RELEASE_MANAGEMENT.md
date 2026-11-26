# Release management and development lineage

[Documentation index](../../README.md) · [Development commands](DEVELOPMENT.md) · [Validation](../validation/VALIDATION.md)

本文定义 Neuropixels Explorer 的生产身份、构建提升流程和研发历史证据等级。产品源码、研究数据、运行时缓存、评审候选和正式发布不得互相冒充。

## 唯一权威链

正式发布必须能沿下列链条逐项核对：

```text
annotated Git tag -> commit -> VERSION -> build command/flavor
  -> artifact SHA-256 -> validation receipts -> release decision
```

- Git 提交和不可移动的 annotated tag 是源码历史权威；文件名和修改时间不是版本证据。
- `scripts/explorer-shell.html` 与被其引用的 JS、CSS、vendor 文件是独立版源码。
- `index.html` 是仓库中唯一受 Git 管理的普通版单文件产物，也是正常产品入口。
- `dist/Neuropixels-Explorer.html` 是可删除、可重建的本地暂存/兼容镜像，不是另一份发布历史。
- 工作区根目录的 HTML 只允许作为发布后的兼容副本；评审快照放在 `review_versions/`，不得命名成正式 release。
- `--email-safe` 是功能受限的独立 flavor：当前禁用 Unit marks。它必须单独登记 hash 和限制，不能冒充普通版。

## 2026-11-26 状态冻结

| 项目 | 已核实状态 | 结论 |
| --- | --- | --- |
| 最后正式本地标签 | `v4.15.2-beta.1` -> `00afc08bd856ccca8b2d69e6c8dec9769db9df7c` | 最后可由 Git 精确命名的产品 checkpoint |
| 当前声明版本 | `4.15.3-beta.1` / Python `4.15.3b1` | 仅为未提交工作线，不是 release |
| 当前 Git 身份 | `v4.15.2-beta.1-dirty` | 审计开始时有 87 个 tracked 路径变化和 96 个 untracked 文件 |
| 远端状态 | 本地 `main` 比 `origin/main` 超前 24、落后 0；远端 `main` 和 tags 只到 `v4.0.0-beta.3` | 本地后续标签不能表述成已发布到远端 |
| 普通版工作构建 | 3,381,405 bytes；SHA-256 `10681632EEAFFF7563432B1928050F9A0017740FABDC5C16B91F076B8BDDE5F5` | 可由当前工作树重建，但不能由最后 tag 重建 |
| email-safe 工作构建 | 3,371,962 bytes；SHA-256 `6E27C454A4EB354B1B25A015B14839C3765A2C69541A26245C3BC5470832D0F7` | 诊断候选；Unit marks disabled；不是普通生产版 |

产品仓库之外的本机 `product_artifacts/CURRENT.json` 指向最后正式本地 source release `v4.15.2-beta.1`。其 HTML 是 2026-11-26 从 clean local tag 隔离重建的 12,293,654-byte 产物（SHA-256 `82C54BAD4C38B912FBD60C4343FCAC43CCED957A993609EA3FE173C12D5A3854`），不是 2026-11-14 邮件留存件的原始字节；两份指纹均在本机 release manifest 中保留。该本机产物注册表不属于公开源码仓库。

`v4.15.2-beta.1` 标签中的 `index.html` 仍是 38,264-byte 的未打包入口，当时构建脚本只生成 `dist/Neuropixels-Explorer.html`。把共享 shell 移到 `scripts/explorer-shell.html`、并把打包后的 `index.html` 作为产品入口，是当前未提交的 4.15.3 工作线变化；不能倒写成 4.15.2 已有行为。

## 文件身份

| 路径 | 身份 | 可否直接修改 |
| --- | --- | --- |
| `scripts/explorer-shell.html`、`scripts/`、`styles/`、`vendor/` | 独立版源码输入 | 按功能修改并测试 |
| `index.html` | tracked normal artifact；只在提升步骤生成 | 不手工编辑 |
| `dist/Neuropixels-Explorer.html` | ignored staging mirror | 可重建，不作为历史依据 |
| `../Neuropixels-Explorer.html` | 工作区兼容副本 | 仅在正式提升后复制 |
| `../neuropixel_workflow.html` | legacy compatibility name | 不再作为新交付入口 |
| `../Neuropixels-Explorer-email-safe.html` | 功能受限候选 flavor | 仅用显式 `--email-safe` 构建 |
| `../review_versions/<date>/` | 人工审阅与投递证据 | 原件冻结，只补 manifest |
| `runtime/`、`../reports/`、`../paper_materials/` | 运行态或研究证据 | 不属于产品发布 |

治理前，`index.html`、工作区根目录的 `Neuropixels-Explorer.html` 和 `neuropixel_workflow.html` 是同一个 NTFS 文件的三个硬链接，修改任何名称都会修改仓库产物。2026-11-26 的治理步骤在先记录 hash 后解除根目录两个硬链接，使构建工作树与兼容副本不再互相覆盖；旧文件名暂时保留，避免破坏外部引用。

## 候选、验证与提升

以下命令从产品仓库根目录运行。候选和临时产物放在 OneDrive 之外的 `D:\Projects\Codex`。

1. 更新 `VERSION`，只同步源码中的版本表面：

   ```powershell
   node scripts\sync-version.cjs
   ```

2. 构建隔离候选，不修改 `index.html`：

   ```powershell
   $candidate = 'D:\Projects\Codex\neuropixels-release-candidate\Neuropixels-Explorer.html'
   node scripts\build-standalone.cjs $candidate
   ```

   无参数构建只刷新 ignored 的 `dist/Neuropixels-Explorer.html`。email-safe 必须给出独立输出路径：

   ```powershell
   node scripts\build-standalone.cjs --email-safe 'D:\Projects\Codex\neuropixels-release-candidate\Neuropixels-Explorer-email-safe.html'
   ```

3. 对候选运行与变更相称的检查。最低生产边界为：

   ```powershell
   node tests\validate-release-build.cjs
   node tests\validate-browser-project.cjs
   python -m unittest discover -s tests\python
   git status --short
   ```

   正式提升前，所有 standalone 内容输入必须受 Git 管理，工作树必须能解释且最好为 clean。浏览器、真实数据和专项功能检查按 [Validation](../validation/VALIDATION.md) 增加；测试通过不自动等于用户验收或科学验证。

4. 只在候选被接受后显式提升 normal build：

   ```powershell
   node scripts\build-standalone.cjs --promote
   if ((Get-FileHash index.html).Hash -ne (Get-FileHash dist\Neuropixels-Explorer.html).Hash) { throw 'artifact drift' }
   ```

5. 提交同一范围的源码、测试、文档和 `index.html`，创建唯一 annotated tag；不要移动或复用 tag。发布到远端仍需要用户明确授权。

6. 在产品仓库之外的 `../product_artifacts/` 保存不可变 candidate/release 副本和 manifest。dirty source 只能进入 `candidates/`；clean tagged source 才能进入 `releases/`。manifest 至少记录：

   ```text
   product_version, tag, source_commit, source_dirty=false,
   build_flavor, build_command, node_version, artifact_bytes, sha256,
   validation_receipts, delivery_test, decision, superseded_by
   ```

## 研发历史主线

下表来自 annotated tags 指向的提交；同一版本链均为前一版本的后代。里程碑文字是 tag annotation、提交主题和 CHANGELOG 的压缩，不把当时验证结论外推到当前工作树。

| 日期 | 标签 | 提交 | 可追溯里程碑 |
| --- | --- | --- | --- |
| 2026-08-14 | `v3.0.0` | `0c0f9f3` | 初始 Explorer：KiloSort、Unit 图和物理 Probe |
| 2026-08-15 | `v3.1.0` | `b37b7a3` | Inspect/Compare 与产品仓库收敛 |
| 2026-08-15 | `v3.2.0` | `e13c82d` | Unit 选择、信号导航、可调布局、主题和三语 Help |
| 2026-08-15 | `v3.3.0` | `3651265` | 产品/数据库边界、SQLite 服务、迁移和增量 ingest |
| 2026-08-29 | `v3.4.0` | `03bdbe7` | 恢复并精简评审工作区 |
| 2026-08-29 | `v3.5.0` | `c0c2eef` | 统一 activity-anatomy checkpoint |
| 2026-08-29 | `v3.6.0` | `caee19c` | Round 2.5 overview 可读性 |
| 2026-08-29 | `v3.7.0` | `6da87a1` | Round 3 persistent activity pyramid |
| 2026-09-09 | `v4.0.0-beta.1` | `b729a68` | 行为标注 beta 与 provenance-preserving exchange |
| 2026-09-09 | `v4.0.0-beta.2` | `0ea121a` | Allen VBN、measured frame clocks 与复现检查 |
| 2026-09-11 | `v4.0.0-beta.3` | `464d0cd` | processed-data import、紧凑标注、2D Probe；当前远端终点 |
| 2026-09-23 | `v4.1.0-beta.1` | `2e4479d` | 大视频标注与 interval Probe review |
| 2026-09-24 | `v4.1.1-beta.1` | `60fe132` | Windows 独立启动可靠性 |
| 2026-09-26 | `v4.1.2-beta.1` | `ce20d48` | 放大/标注时保留 neural context |
| 2026-09-26 | `v4.2.0-beta.1` | `cabf2d7` | 可缩放时间线式人工标注 |
| 2026-09-26 | `v4.2.1-beta.1` | `cb167f0` | 恢复 Unit 展开并保持 focus |
| 2026-09-26 | `v4.2.2-beta.1` | `39301cc` | group region 与 signal row 结构修正 |
| 2026-09-26 | `v4.3.0-beta.1` | `4d4e70e` | 跨组 Unit 固定对比 |
| 2026-09-26 | `v4.4.0-beta.1` | `c6069ac` | 保存区间与可切换方向的 Probe 统计 |
| 2026-10-21 | `v4.5.0-beta.1` | `e852f69` | 多通道模板分布与 linked review |
| 2026-10-22 | `v4.6.0-beta.1` | `8dd0adc` | neural/video 项目保存与恢复 |
| 2026-10-22 | `v4.7.0-beta.1` | `4269f91` | 直接进入完整 experiment workspace |
| 2026-10-23 | `v4.8.0-beta.1` | `95eb854` | 首个带 standalone 构建脚本的标签；NWB reader 与便携项目包 |
| 2026-10-25 | `v4.9.0-beta.1` | `7b3cfc8` | 统一项目控制与 video-above 布局 |
| 2026-10-25 | `v4.10.0-beta.1` | `6edec2d` | observation bench 重设计 |
| 2026-11-12 | `v4.11.0-beta.1` | `5005fd1` | browser-native event response preview |
| 2026-11-12 | `v4.12.0-beta.1` | `e5b18ad` | event analysis 持久化与 coverage 来源 |
| 2026-11-12 | `v4.13.0-beta.1` | `07b1f75` | population views 与 split-half diagnostics |
| 2026-11-12 | `v4.13.1-beta.1` | `2ec6237` | invalid_times 元数据与 provenance 修正 |
| 2026-11-12 | `v4.14.0-beta.1` | `8f81f34` | bounded video feature exchange |
| 2026-11-12 | `v4.14.1-beta.1` | `a8a584d` | feature grouping 数值边界与取消修正 |
| 2026-11-12 | `v4.15.0-beta.1` | `3b42261` | selected service video feature exchange |
| 2026-11-12 | `v4.15.1-beta.1` | `ff8a98c` | coverage origin 跨 UI transition 保留 |
| 2026-11-14 | `v4.15.2-beta.1` | `00afc08` | 统一 event sources 并保留可恢复 metadata errors |
| 2026-11-15 至 2026-11-26 | `4.15.3-beta.1` working line | 未提交 | 多轮功能累计在 dirty tree；必须拆分审查后才能形成 tag |

版本顺序按祖先关系和目标提交日期排列，不按 tagger 时间排列。34 个本地 annotated tags 是单一祖先链；不重写既有历史。4.15.2 之后缺失的内部阶段诚实记录为累计未提交研发，不根据文件时间伪造 tags。

## 邮件交付证据旁支

邮件结果是“某一成品在某一时刻的网关行为”，不是产品版本本身。2026-11-26 的实测表明：

- `v4.8.0-beta.1`、`v4.10.0-beta.1` 和 2026-11-14 的 `v4.15.2-beta.1` 留存件以原字节到达 UCI Inbox。
- 2026-11-25 00:50 的工作快照到达 Spam；14:28 的工作快照到达 Inbox，但 UCI 网关改写许可证链接和换行。
- 22:30 Allen 四图快照和 2026-11-26 00:23 Kilosort 示例快照被退信；中间九份快照未逐一发送，所以只能证明测试分界，不能宣称首个被拦的提交或因果代码。
- 完整邮件、hash 和下载核验保存在 `D:\Projects\Codex\neuropixels-attachment-review-20261126\history\historical-delivery.md`。

## 当前不能伪装成已完成的事项

- 4.15.3 尚无可审查 commit/tag；当前 normal/email-safe HTML 都只能称 working build。
- 本地 v4.0.0-beta.3 之后的 24 个提交和标签未出现在远端；除非显式发布，不称为 GitHub release。
- `review_versions` 中旧文件缺 source commit 时必须写 `unknown`，不能根据内嵌版本号反推提交。
- runtime 浏览器 profile、IndexedDB、截图和 `.neuroproject` 只有登记成 validation receipt 后才是证据；目录存在本身不代表通过验证。
