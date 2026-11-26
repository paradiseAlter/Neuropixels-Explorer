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
- `--email-safe` 是功能受限的独立 mail-gateway flavor：当前禁用 Unit marks，并和普通版一样保留可读的 `region-core.js`。它必须单独登记 hash 和限制，不能冒充普通版。

## 2026-11-26 `v4.16.1-beta.1` 邮件网关兼容修复

| 项目 | 已核实状态 | 结论 |
| --- | --- | --- |
| 压缩 `region-core.js` | 单独置入已知可投递基线即被退信；同源可读脚本成功到达 | 两种正式构建均保留该模块可读表示，不改变运行逻辑 |
| Unit marks | 可读 `region-core.js` 下启用即被退信，禁用后成功到达 | 普通版保留完整功能；mail-gateway flavor 明确禁用这一可选功能 |
| 普通版产物 | 2,930,943 bytes；SHA-256 `0ECCE576E321491DAE7811A126795EC0AFCDF10DEC3062C1440750F66B877418` | 完整功能；不得作为已通过 UCI 邮件网关的附件 |
| 邮件版产物 | 2,924,426 bytes；SHA-256 `C9C46691707A6B52D0732586FD0DA0FA5F3DC482CB8202DC12ED64A6D5885304` | 只禁用 Unit marks；其余专项浏览器回归通过 |
| 最终方向 | `ziwenm3@uci.edu` -> `paradise.alter@gmail.com` | Gmail message `1a217761ae58a4f4` 到达 Inbox，下载附件与发送文件逐字节相同 |

Google 的退信只给出“附件包含病毒”，没有公开匹配规则。上述结论来自逐层替换同一邮件方向、同一发送账户和同一接收账户的对照试验；它证明字节表示与网关结果的可重复关系，不把源代码描述为病毒，也不外推到其他网关。

## 2026-11-26 `v4.16.0-beta.1` 发布记录

| 项目 | 已核实状态 | 结论 |
| --- | --- | --- |
| 上一正式标签 | `v4.15.2-beta.1` -> `00afc08bd856ccca8b2d69e6c8dec9769db9df7c` | 本轮发布的祖先 checkpoint |
| 功能提交 | `74443c68eff5352f30ff4a0352578ccc92563bf7` | 分析、标注、工作区和对应回归测试 |
| NWB / 构建提交 | `27b3c98191353cca4468b0e5089b346ba389c5c8` | 通用 NWB、HDF5 2.2.0、构建安全和体积优化 |
| 文档提交 | `abfaaaa82db15f95ab3f0baa7078ec0a0f0b8fa4` | 权威文档、历史归档和旧 launcher 退役 |
| 验收测试提交 | `a7db50d3bdf70ccb858fc08b6863484561a94123` | 本地服务验收跟随统一项目菜单并覆盖当前导入/恢复流程 |
| 发布身份 | `4.16.0-beta.1` / Python `4.16.0b1` / annotated tag `v4.16.0-beta.1` | tag target 唯一命名最终版本同步和普通版产物提交 |
| 普通版产物 | 2,923,642 bytes；SHA-256 `C8963ABB896C5C92F00B6F5498F4576D982BC55FFF20EBA689949A96B90D686C` | normal flavor；与 tracked `index.html` 和 staging mirror 字节一致 |
| 邮件网关诊断产物 | 2,917,125 bytes；SHA-256 `494142A19712BF5836ECD0AAC3F52B32051B5B6E6C85ACA45FFE4A22C740E12E` | Unit marks disabled；不得冒充普通版或视为误报根因证明 |

治理审计开始时，产品仓库之外的本机 `product_artifacts/CURRENT.json` 指向 `v4.15.2-beta.1`。其 HTML 是 2026-11-26 从 clean local tag 隔离重建的 12,293,654-byte 产物（SHA-256 `82C54BAD4C38B912FBD60C4343FCAC43CCED957A993609EA3FE173C12D5A3854`），不是 2026-11-14 邮件留存件的原始字节；两份指纹均在本机 release manifest 中保留。正式提升后可用本节的 tag 和 hash 更新本机 CURRENT；该注册表始终不属于公开源码仓库。

`v4.15.2-beta.1` 标签中的 `index.html` 仍是 38,264-byte 的未打包入口，当时构建脚本只生成 `dist/Neuropixels-Explorer.html`。共享 shell 和 tracked standalone 分别在本轮功能/构建提交中建立，并随 `v4.16.0-beta.1` 首次成为正式产品边界；不能倒写成 4.15.2 已有行为。

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
| 2026-11-26 | `v4.16.0-beta.1` | `74443c6` + `27b3c98` + `abfaaaa` + `a7db50d` + tag target | 收敛累计工作线：集成分析/标注、通用 NWB、可复现构建、权威文档、现行服务验收与 tracked standalone |
| 2026-11-26 | `v4.16.1-beta.1` | tag target | 修复 standalone 的邮件网关字节兼容性；普通版保留 Unit marks，邮件版明确禁用 |

版本顺序按祖先关系和目标提交日期排列，不按 tagger 时间排列。annotated tags 保持单一祖先链；不重写既有历史。4.15.2 之后没有根据文件时间伪造内部 tags，而是用上述功能、构建、文档、验收提交和一个新 release tag 收敛累计研发。

## 邮件交付证据旁支

邮件结果是“某一成品在某一时刻的网关行为”，不是产品版本本身。2026-11-26 的实测表明：

- `v4.8.0-beta.1`、`v4.10.0-beta.1` 和 2026-11-14 的 `v4.15.2-beta.1` 留存件以原字节到达 UCI Inbox。
- 2026-11-25 00:50 的工作快照到达 Spam；14:28 的工作快照到达 Inbox，但 UCI 网关改写许可证链接和换行。
- 22:30 Allen 四图快照和 2026-11-26 00:23 Kilosort 示例快照被退信；中间九份快照未逐一发送，所以只能证明测试分界，不能宣称首个被拦的提交或因果代码。
- 2026-11-26 的受控拆分测试进一步证明两个独立触发条件：压缩后的 `region-core.js`，以及 Unit marks 脚本。可读 `region-core.js` 加禁用 Unit marks 的可复现构建从 UCI 成功到达个人 Gmail；普通版仍会因 Unit marks 被拦。
- 完整邮件、hash 和下载核验保存在 `D:\Projects\Codex\neuropixels-attachment-review-20261126\history\historical-delivery.md`。

## 当前不能伪装成已完成的事项

- `v4.16.1-beta.1` 的邮件版通过 UCI 到个人 Gmail 的投递验收，不等于普通版可投递，也不等于科学有效性验证。
- 网关未公开恶意软件签名；只能报告对照试验中可重复的触发字节，不能声称发现了真实病毒或通用反病毒规则。
- 远端可见性、refs 和下载状态是实时外部事实，必须在 push 和 visibility 变更后无认证查询；不能仅凭本文宣称 GitHub 发布完成。
- `review_versions` 中旧文件缺 source commit 时必须写 `unknown`，不能根据内嵌版本号反推提交。
- runtime 浏览器 profile、IndexedDB、截图和 `.neuroproject` 只有登记成 validation receipt 后才是证据；目录存在本身不代表通过验证。
