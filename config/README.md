# 规格与维护来源

| 文件 | 维护来源 | 使用方 |
|---|---|---|
| `major-relevance.mjs` | 逐专业维护任务核验字段、受限字段和适用画面组；不按旧机房分类兜底 | 专业课程题编排、首页课程信息、专业适配检查 |
| `card-templates.json` | `scripts/build/build-template-research.py` 中模板定义与本地来源输入 | 模板研究与预览 |
| `visual-pilot.json` | `scripts/build/build-visual-pilot.py` 的人工设计；审核绑定需要真实检查凭据 | `src/visual-pilot.mjs` |
| `../web/template-data.js` | 从 `card-templates.json` 导出；不要手改 | 模板预览 |
| `../docs/research/template-catalog.md` | 同一模板构建脚本生成 | 人工阅读 |

模板修改先改构建来源，再更新机器规格、说明和浏览器导出。只需要同步浏览器导出时运行 `node scripts/build/export-template-data.mjs`，无需重新获取题库。不要分别维护多份模板。

视觉蓝图中的原题定位、源题型、源答案映射、改编条件、素材哈希、观察记录与审核指纹各有独立职责。更换题干或图像后须重新检查；重算指纹不是内容审查。

`docs/research/source-register.json`、`read-log.json`、`reviewed-examples.json` 分别记录来源、实际阅读、人工映射。历史生图清单保存原 `prototype/` 路径，当前文件在 `web/`；读取器兼容历史前缀，原始证明记录不改写。

生成规格与绑定审核会覆盖配置文件；先检查输入完整性并审阅Git差异。当前审核输入缺失，禁止把绑定脚本作为正常重建的必然成功步骤。
