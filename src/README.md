# 服务端代码

`server.mjs` 保留为服务入口；此轮只迁移原 `lib/`，不同时重写路由。

`store.mjs`：导入、题目状态与SQLite；`learning.mjs`：练习、判分与公布策略；`provider.mjs`：预生成样例适配器；`catalog.mjs`：内置样例；`sequence-policy.mjs`：排序发布门槛；`visual-pilot.mjs`：研究蓝图、来源和证据检查。

后续在职责增长时再按http/questions/learning/storage拆分，避免目录迁移和行为重构混在同一批修改中。
