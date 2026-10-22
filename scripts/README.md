# 脚本输入、输出与副作用

所有路径以仓库根目录为基准；从项目根目录执行。维护脚本直接修改 `data/demo.sqlite`，其余脚本不写教学数据库。构建脚本会覆盖指定版本化文件。

| 脚本 | 输入/前置条件 | 输出/副作用 |
|---|---|---|
| verify/audit-professional-bank.mjs（转至audit-diverse-bank.mjs） | 专业清单、多主题题池配置与本地图片 | 全量检查题池、知识点去重、每轮题型与单一任务比例；输出artifacts/professional-relevance-audit.json和专业题目适配核查.md；只读数据库，不调用API；不等同专家审定 |
| build/polish-product.py | 现有web/v2.js、index.html、business-review.html | 更新登录页、学生首页、教师题库概览与主题样式引用；不修改题库或API配置 |
| maintenance/prepare-offline-product.mjs | 专业清单、专业与多考点配置、本地图片 | 先备份data/demo.sqlite，写入原库与补充情境组成的多考点题池，每轮10题；保留旧版本与记录；写入专业清单和web/task-rules.json；不调用API；停止服务后运行 |
| verify/verify-offline-browser.mjs | Playwright、现有本地题包、可启动的Edge或Chrome | 使用临时数据库验证10题、无答案提示表、图内对话、封面居中、提交、错题、记录与教师复核，截图写入artifacts/offline-product-screenshots；可从任意目录执行；不调用API |
| `build/submission.mjs` | 源码、本地题库、已发布版本；仅在内存读取.env做密钥排查 | `artifacts/submission-日期/`及ZIP；排除密钥、日志、学生记录和未审题；发现疑似密钥停止；不调用API，不改原题库 |
| `research/research-banks.py` | 网络、公开来源URL；Python requests、PyMuPDF | `research/question-banks/` 原文件、提取文件、manifest；可能覆盖下载 |
| `research/index-banks.py` | CPU工作表及各来源提取文本 | 本地 `questions.json`、`index-summary.json` |
| `research/read-bank-samples.py` | 本地 `questions.json` | `cpu-selected.json`；打印阅读样本，不自动证明精读 |
| `research/annotate-template-examples.py` | 本地索引及脚本人工映射 | `docs/research/reviewed-examples.json` |
| `build/build-template-research.py` | manifest、CPU抽样、LZU.pdf及脚本模板定义 | 来源登记、阅读记录、模板JSON/Markdown和浏览器导出 |
| `build/export-template-data.mjs` | `config/card-templates.json` | `web/template-data.js`；仅同步展示数据 |
| `build/build-visual-pilot.py` | 索引、来源登记、原始题库、依据摘录 | `config/visual-pilot.json`、本地原题快照；覆盖蓝图，不完成视觉审核 |
| `build/attach-visual-pilot-audit.py` | 蓝图、历史生图清单、真实图片、`visual-pilot-observations-v2.json` | 绑定历史观察与哈希；当前缺输入，停止而不伪造凭据 |
| `maintenance/seed-demo.mjs` | 数据库、内置样例 | 修改演示题与发布状态 |
| `maintenance/upgrade-v2.mjs` | 数据库、旧版样例 | 归档旧题、导入新版；保留历史 |
| `maintenance/hold-unverified-order.mjs` | 数据库、顺序证据策略 | 撤回无充分顺序依据的已发布题 |
| `verify/verify-browser.mjs` | Playwright、浏览器 | 临时数据库；`artifacts/screenshots-v2/` |
| `verify/verify-visual-pilot-browser.mjs` | Playwright、浏览器、视觉配置与图片 | 临时数据库；`artifacts/visual-pilot/` 截图及检查JSON |
| `verify/evaluate-visual-pilot.mjs` | 蓝图、原题快照、生图清单、图片差异记录；浏览器记录可选 | `artifacts/visual-pilot/current-evaluation.json`；不覆盖历史报告 |

常规验证使用根README的npm命令。维护脚本不属于测试步骤。缺少原始输入时先恢复并核对哈希；不要直接执行覆盖性构建来修复测试。
`verify/verify-offline-browser.mjs` 另验证正式题不会出现在待审核列表；八类样题作为独立参考页另行检查，不再嵌入审核发布。
`verify/verify-browser.mjs` 会先核验“导入并生成”自动进入审核发布，再转到题库继续原有交互回归。
