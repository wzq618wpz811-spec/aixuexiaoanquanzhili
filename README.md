# 知安 · 校园安全学习

支持教师导入题库、AI生图、审核发布，以及学生按专业练习、查看解析和错题重练。

## 下载与启动

1. 点击 **Code → Download ZIP**，下载并解压。
2. 安装 Node.js 22.13 或更新版本。
3. Windows 用户双击 **启动演示.cmd**；其他系统在项目目录运行 `npm start`。

启动窗口保持打开，再访问：

| 入口 | 地址 | 登录信息 |
| --- | --- | --- |
| 教师端 | http://127.0.0.1:4186/teacher | 密码：`123456` |
| 学生端 | http://127.0.0.1:4186/student | 账号：`student01` 至 `student05`；密码：`123456`，登录时选择专业 |

每个专业只练习已发布题目：满10道时每次抽10道，不满10道时有几道做几道。教师审核通过发布时，处理说明可不填。

## 开启在线生图

现有题目和图片可直接使用。生成新图片需配置API：

1. 复制 `.env.example`，重命名为 `.env`。
2. 填写 `DASHSCOPE_API_KEY`、`DASHSCOPE_IMAGE_URL` 和 `DEEPSEEK_API_KEY`。
3. 将 `ENABLE_LIVE_GENERATION=0` 改为 `ENABLE_LIVE_GENERATION=1`。
4. 保存后重启程序，在教师端点击“导入并生成”。

配置文件中的端口为 `PORT=4186`，教师密码为 `TEACHER_PIN=123456`。旧版本用户将已有 `.env` 中这两项改成相同值后重启即可；保留原有API密钥。

也可双击 **配置API.cmd** 填写接口信息；该工具保持在线生成关闭，填写完成后仍需按第3步开启。

密钥仅保存在本机 `.env`，不要提交到GitHub。共用密钥的调用费用计入密钥所属账户，各电脑的题库修改和学习记录独立保存。

## 团队开发

```sh
git clone https://github.com/wzq618wpz811-spec/aixuexiaoanquanzhili.git
cd aixuexiaoanquanzhili
git switch -c your-feature
npm start
```

功能修改通过 Pull Request 合并。`src/` 为后端，`web/` 为页面和图片，`config/` 为题型与场景配置。

运行 `npm test` 验证核心流程。浏览器检查命令为 `npm run verify:browser`，需另行配置Playwright和浏览器。
