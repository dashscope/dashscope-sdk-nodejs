<p align="center">
  <b>中文</b> · <a href="./README.md">English</a> · <a href="./CHANGELOG.md">Changelog</a>
</p>

# DashScope Node.js SDK

[阿里云百炼 / Model Studio（DashScope）](https://help.aliyun.com/zh/model-studio/) 的官方 Node.js 客户端。能力集尽可能与 [Python SDK](https://github.com/dashscope/dashscope-sdk-python) 对齐。

## 安装

```shell
npm install dashscope-sdk-official
```

克隆本仓库后本地开发：

```shell
npm install
npm run build
```

默认 `npm test` 使用 [nock](https://github.com/nock/nock) 模拟 HTTP，不访问真实服务。

若要用**真实** DashScope HTTP API 跑同一套用例（会创建真实任务/文件/任务并计费），请设置密钥后执行：

```shell
export DASHSCOPE_API_KEY='你的密钥'
npm run test:live
```

可将 [`.env.example`](.env.example) 复制为 `.env`，`test/nock-hooks.cjs` 会加载其中的 `DASHSCOPE_API_KEY`（供 `test:live` 使用）。

WebSocket 语音合成用例（`test/audio/tts.test.ts`）在未使用 `test:live` 时会 **跳过**；只有 `test:live` 会跑真实服务（可能计费）。

发布包同时提供 **CommonJS**（`lib/index.js`）与 **ESM**（`lib/index.mjs`），由 `package.json` 的 `exports` 按 `require` / `import` 解析。

## 快速开始

```js
const { Configuration, DashscopeApi } = require('dashscope-sdk-official');

const configuration = new Configuration({
  apiKey: process.env.DASHSCOPE_API_KEY || 'YOUR-DASHSCOPE-API-KEY',
});

const api = new DashscopeApi(configuration);

const result = await api.createGeneration({
  model: 'qwen-turbo',
  prompt: '今天天气好吗？',
  stream: true,
});

for await (const chunk of result) {
  console.log(chunk.output);
}
```

ESM（Node 18+）：

```js
import { Configuration, DashscopeApi } from 'dashscope-sdk-official';

const configuration = new Configuration({
  apiKey: process.env.DASHSCOPE_API_KEY || 'YOUR-DASHSCOPE-API-KEY',
});
const api = new DashscopeApi(configuration);
```

## API Key

申请与使用方式见：[Model Studio 文档](https://help.aliyun.com/zh/model-studio/)。

### 在代码中设置

```js
const { Configuration } = require('dashscope-sdk-official');

const configuration = new Configuration({
  apiKey: 'YOUR-DASHSCOPE-API-KEY',
});
```

若不传 `apiKey`，SDK 会读取环境变量 `DASHSCOPE_API_KEY`。

### 环境变量

```shell
export DASHSCOPE_API_KEY='YOUR-DASHSCOPE-API-KEY'
```

可选：

- `DASHSCOPE_HTTP_BASE_URL` — HTTP API 根地址（默认 `https://dashscope.aliyuncs.com/api/v1`）
- `DASHSCOPE_WEBSOCKET_BASE_URL` — 流式语音 / TTS 等 WebSocket 根地址

## 功能概览

| 模块 | 说明 |
|------|------|
| **Generation** | 单轮 / 多轮文本生成，支持流式 |
| **Chat Completions** | OpenAI 兼容的 `chat/completions` |
| **代码生成** | 灵码等场景 |
| **图像 / 视频合成** | 异步任务 + 轮询 |
| **多模态对话** | 文本 + 图片等 |
| **向量** | 文本、批量、多模态向量 |
| **理解与重排** | NLU、rerank |
| **文件 / 模型 / 部署 / 微调** | 资源与生命周期 API |
| **语音** | 异步转写、实时 ASR、翻译、TTS（WebSocket + Qwen HTTP） |
| **Assistants & Threads** | 线程、消息、Run 等 |

更多示例与字段说明见英文 [README.md](./README.md) 或源码与 `test/` 目录。

## 配置对象

```js
const config = new Configuration({
  apiKey: 'YOUR-DASHSCOPE-API-KEY',
  basePath: 'https://dashscope.aliyuncs.com/api/v1',
  workspace: '可选的工作空间 ID',
});
```

## 返回结构

常见字段与 HTTP 信封一致：

- `request_id` — 请求追踪 ID  
- `status_code` — 成功时一般为 `200`（以 SDK 归一化后的语义为准）  
- `code` / `message` — 错误时填充  
- `output` — 模型业务数据  
- `usage` — 用量（若接口返回）  

## 变更记录

见 [CHANGELOG.md](./CHANGELOG.md)。维护者发版流程（npm、打 tag、GitHub Release）见 [docs/RELEASING.md](./docs/RELEASING.md)。

## 参与贡献

欢迎 Issue 与 PR。修改行为后请在本地执行 `npm run lint`、`npm run typecheck`、`npm run build` 与 `npm test`。调整 HTTP 行为时，请在 `test/` 中同步更新对应的 nock 预期（模拟基址与辅助方法见 `test/helpers/mockConfig.ts`）。

## 许可证

Apache License 2.0，见 [LICENSE](LICENSE)。
