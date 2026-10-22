# 历史 README（目录整理前）

仅供追溯；命令、路径、数量和审核结果不代表当前状态。

# 知安校园安全学习
工作目录：`D:/project/aixuexiaozhili`。已从旧目录整体迁入；远程仓库名仍为 aixuexiaoanquanzhili。

当前优先任务已切换为真实题库研究与模板准备。2026-10-09 精读651条来源题目记录（含跨库重复），产出14类模板规格。见 [研究报告](docs/research/question-bank-study.md)、[模板规格](docs/research/template-catalog.md) 和 [模板预览](http://127.0.0.1:4185/templates.html)。

已完成一轮真实题视觉试验：15道首批设计、3道补充适配、6道疑题，覆盖单选、多选、判断、填空、简答；实际执行7次生图/编辑，并测试共同底图合成。教师可打开 [研究试答](http://127.0.0.1:4185/visual-pilot.html)，查看 [评估报告](docs/research/visual-pilot-evaluation.md)。本批仅作研究预览，没有导入正式教学库；任意输入在线生成与独立自动视觉审查仍未接入。

排序已改为鼠标/触屏拖动并支持键盘；此前自编事故时间线转待审核。现有样例为5道发布、2道待审核。模板规格不等于已实现在线自动改题。下面的v0.2功能说明保留作历史基线；排序内容现按研究门槛启用。

版本 0.2。教师端与学生端分离，六类视觉卡片，教师可配置答案公布方式和学校形象。

## 运行
需要 Node.js 22.13+，无第三方运行依赖。
```powershell
node server.mjs
```
入口 http://127.0.0.1:4185 。教师端 /teacher，学生端 /student。

| 身份 | 账号 | 演示密码 |
|---|---|---|
| 教师 | 固定 teacher | teacher-demo |
| 学生 | student01 至 student05 | 123456 |

可用服务端环境变量 TEACHER_PIN、STUDENT_PIN 改密码。当前默认绑定本机；这是独立登录和角色接口隔离的开发演示，尚未接入学校统一认证。

## 演示
1. 教师端查看题库，或“导入 → 填入案例样例 → 导入并生成”。
2. 学习设置选择整组揭晓/逐题揭晓，以及每组题数。默认整组 5 题；选 6 题可一次体验全部题型。
3. 形象库预览正面、侧面、背面；切换小平小安/原创小狐；查看图层替换和局部重绘对照，设为学校形象。
4. 学生端开始练习。整组模式中可以回改，提交后才出现答案与依据；逐题模式确认后显示解析并锁定。
5. 学生可以继续未完成练习、查看历史结果和重练错题。教师查看学习数据。

## 数据升级
首次可运行 `node scripts/maintenance/upgrade-v2.mjs`。本机已执行：旧版内置演示题归档，新版 7 道原题中 6 道发布、1 道疑题。保留旧作答与原文，不覆盖用户自定义原题。数据在 data/demo.sqlite。

## 能力边界
- 实际功能：登录隔离、导入去重、任务进度、疑题审核、发布撤回、练习持久化、服务端判分、公布策略、六类交互、学校形象设置、参考图上传。
- 实际生成素材：透明形象多视图、实验室背景、双手持箱角色和角色替换后的编辑结果。
- 应用内 AI 仍为样例适配器：已生成素材直接复用，没有在线模型、生图费用或动态生成任意输入。
- 参考图上传可保存；任意新形象的视图生成、任意新场景重绘待接入提供方。已生成的两套角色可直接替换。
- 未实现 Word/PDF 解析、正式账号管理、多人部署加固、自动视觉质检、完整复习算法。

## 文档
- [项目全链路与当前进度](docs/项目链路.md)
- [需求文档](docs/需求文档.md)
- [技术设计](docs/技术设计.md)
- [后端接口](docs/后端接口.md)
- [案例与素材来源](docs/素材来源.md)
- [验证记录](docs/验证记录.md)

## 验证
`node --test test/core.test.mjs`。浏览器验证：`node scripts/verify/verify-browser.mjs`；需要 Playwright，可通过 PLAYWRIGHT_MODULE 指定已有模块入口。测试使用临时数据库。

真实题试验检查：`node --test test/visual-pilot.test.mjs`；浏览器检查：`node scripts/verify/verify-visual-pilot-browser.mjs`（需 Playwright）；报告重算：`node scripts/verify/evaluate-visual-pilot.mjs`。完整原题档案留在本地 `research/visual-pilot/`，不公开整套题库。蓝图重建先运行 `python -X utf8 scripts/build/build-visual-pilot.py`，再运行 `python -X utf8 scripts/build/attach-visual-pilot-audit.py`；后一脚本只绑定本轮已实际检查的素材记录，不执行自动看图，也不能用于给新图片自动盖章。
