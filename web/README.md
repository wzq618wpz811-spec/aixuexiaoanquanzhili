# 浏览器资源

由原 `prototype/` 整体迁入，服务URL保持兼容。`index.html` 使用 `v2.js`、`style.css`、`v2.css`，教师与学生入口由服务端路由和登录角色区分。

`templates.html` 为模板预览，`visual-pilot.html` 为研究试答；拖动组件由 `drag-sort.js` 提供。`app.js` 是未被当前首页加载的历史实现，保留作追溯，不作为当前行为依据。

本目录由服务静态提供，只放可公开内容。`assets/uploads/` 为运行时上传目录，已忽略；原题完整档案、答案凭据和数据库不得放入此目录。模板导出 `template-data.js` 不手工编辑。
