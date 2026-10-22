# 目录迁移与复现基线

检查日期：2026-10-12。迁移前仓库没有提交，78个项目文件未被版本管理；已建立自动化快照提交 `8d8c037`。远程仓库未变更，未推送。本轮没有运行写演示数据库的维护脚本。

## 当前可复现范围

| 检查 | 迁移前 | 迁移后 |
|---|---|---|
| 核心测试 | 5项通过 | 三批迁移各5项通过 |
| 视觉试验测试 | 3项通过、2项失败 | 同样3项通过、2项失败；未跳过或修改审核断言 |
| 教师/学生/模板浏览器检查 | 本轮迁移前未执行 | 通过角色隔离、答案公布、鼠标/触屏/键盘拖动、移动宽度检查 |
| 视觉试答浏览器检查 | 本轮迁移前未执行 | 图片缺失导致失败；已增加浏览器启动前的具体缺失路径检查 |
| Python脚本语法 | — | 分组迁移后通过解析 |

本机Node 24.15.0、Playwright 1.58.2；浏览器检查使用已安装的Edge/Chrome优先，否则使用Playwright Chromium。截图在 `artifacts/screenshots-v2/`。本轮状态报告在 `artifacts/visual-pilot/current-evaluation.json`，不覆盖历史报告。

## 真实缺口

`config/visual-pilot.json` 的18条非阻断蓝图没有完成素材哈希、观察记录、审核指纹绑定。当前规则结果：首批15条待审，补充3条待审，已知疑题6条待审，预览通过0条，正式发布0条。两个既有测试失败分别为期待18条通过但实际0条，以及测试尝试修改不存在的素材凭据。

审核绑定输入 `docs/research/visual-pilot-observations-v2.json` 缺失。原题快照 `research/visual-pilot/source-snapshots.json` 在本机存在，但被Git忽略，干净克隆无法直接取得。

蓝图引用而当前文件不存在的图片如下，均应位于 `web/assets/visual-pilot/`：

- `lab-ebike-v2.png`
- `socket-clutter-v2.png`
- `corridor-clutter-v2.png`
- `exit-clutter-v2.png`
- `lab-preparation-v2.png`
- `lab-conduct-v2.png`
- `damaged-label-v2.png`
- `lab-doorplate-v2.png`
- `reagent-label-v2.png`
- `shopping-transfer-v2.png`
- `phishing-mail-v2.png`
- `suspicious-sms-v2.png`
- `machine-guard-v2.png`
- `machine-permission-v2.png`
- `waste-management-v2.png`

只读检索迁移备份未找到所查缺失凭据和代表图片，未在备份目录开发或启动服务。历史生成清单、评估报告保留作追溯；不能证明当前缺失版本已经审核。

恢复完整视觉审核需要找回相应真实素材及原始观察凭据，核对版本和哈希，再由内容/视觉检查确认并绑定凭据。若重新生成图片，应按新版本重新审查，不能继续沿用旧记录。本轮不伪造输入，不降低发布门槛。

## 路径与维护来源

| 旧路径 | 当前路径 |
|---|---|
| `lib/` | `src/` |
| `prototype/` | `web/`；浏览器URL保持兼容 |
| `scripts/research-banks.py` 等获取/索引脚本 | `scripts/research/` |
| 模板/视觉构建与审核绑定脚本 | `scripts/build/` |
| 演示初始化、升级、顺序撤回脚本 | `scripts/maintenance/` |
| 浏览器检查、评估脚本 | `scripts/verify/` |

脚本根目录定位已从父目录调整到祖父目录，Node导入同步更新。历史JSON生图清单中的原 `prototype/` 路径保留，读取器兼容历史前缀；迁移没有改变审核蓝图或原始证据。

模板维护源是 `scripts/build/build-template-research.py` 的规格定义与真实来源输入；JSON、说明和浏览器导出为配套产物。单独同步浏览器导出用 `npm run templates:export`。完整输入/输出见 [脚本清单](../../scripts/README.md)，规格职责见 [config说明](../../config/README.md)。

根README统一应用版本0.2.0，模板版本0.3独立；7道演示样例的5发布/2待审口径来自临时数据库的实际测试，已有运行数据库须通过教师界面查看。目录职责分别记录在各目录README，局部AGENTS只补充特定执行约束。
