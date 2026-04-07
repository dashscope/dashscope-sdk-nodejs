<p align="center">
  <b>English</b> · <a href="./README.zh-CN.md">中文</a> · <a href="./CHANGELOG.md">Changelog</a>
</p>

# DashScope Node.js SDK

Official Node.js client for [Alibaba Cloud Model Studio](https://www.alibabacloud.com/help/en/model-studio/) (DashScope). Feature set is kept in sync with the [Python SDK](https://github.com/dashscope/dashscope-sdk-python) where possible.

## Installation

```shell
npm install dashscope-sdk-official
```

From a clone of this repository:

```shell
npm install
npm run build
```

Tests use [nock](https://github.com/nock/nock) and do not call the real API (default: `npm test`).

To run the **same** specs against the **real** DashScope HTTP API (creates real tasks/files/jobs and consumes quota), set a key and use the live script:

```shell
export DASHSCOPE_API_KEY='your-key'
npm run test:live
```

Optional: copy [`.env.example`](.env.example) to `.env` so `test:live` can pick up `DASHSCOPE_API_KEY` (loaded in `test/nock-hooks.cjs`).

The WebSocket TTS case (`test/audio/tts.test.ts`) is **skipped** unless you use `test:live` (real service, billable).

The published package ships **CommonJS** (`lib/index.js`) and **ESM** (`lib/index.mjs`); `package.json` `exports` selects the right entry for `require` vs `import`.

## Quick start

```js
const { Configuration, DashscopeApi } = require('dashscope-sdk-official');

const configuration = new Configuration({
  apiKey: process.env.DASHSCOPE_API_KEY || 'YOUR-DASHSCOPE-API-KEY',
});

const api = new DashscopeApi(configuration);

const result = await api.createGeneration({
  model: 'qwen-turbo',
  prompt: 'Is the weather good today?',
  stream: true,
});

for await (const chunk of result) {
  console.log(chunk.output);
}
```

ESM (Node 18+):

```js
import { Configuration, DashscopeApi } from 'dashscope-sdk-official';

const configuration = new Configuration({
  apiKey: process.env.DASHSCOPE_API_KEY || 'YOUR-DASHSCOPE-API-KEY',
});
const api = new DashscopeApi(configuration);
```

## API key

See the [Model Studio documentation](https://www.alibabacloud.com/help/en/model-studio/) for how to create an API key.

### In code

```js
const { Configuration } = require('dashscope-sdk-official');

const configuration = new Configuration({
  apiKey: 'YOUR-DASHSCOPE-API-KEY',
});
```

If you omit `apiKey`, the SDK reads `process.env.DASHSCOPE_API_KEY`.

### Environment variables

```shell
export DASHSCOPE_API_KEY='YOUR-DASHSCOPE-API-KEY'
```

Optional:

- `DASHSCOPE_HTTP_BASE_URL` — HTTP API base (default `https://dashscope.aliyuncs.com/api/v1`)
- `DASHSCOPE_WEBSOCKET_BASE_URL` — WebSocket base for streaming audio/TTS

## Features (overview)

| Area | Description |
|------|-------------|
| **Generation** | Single- and multi-turn text; streaming supported |
| **Chat Completions** | OpenAI-compatible `/compatible-mode/v1/chat/completions` |
| **Code generation** | Tongyi Lingma–style code scenes |
| **Image / video synthesis** | Async task pattern with polling |
| **Multimodal chat** | Text + image inputs |
| **Embeddings** | Text, batch, and multimodal embeddings |
| **Understanding / rerank** | NLU and reranking endpoints |
| **Files / models / deployments / fine-tunes** | Resource and lifecycle APIs |
| **Speech** | Transcription (async), streaming ASR, translation, TTS (WebSocket + Qwen HTTP) |
| **Assistants & threads** | Agent-style threads, messages, runs |

### Generation (sync and stream)

```js
// Single turn
const r = await api.createGeneration({ model: 'qwen-turbo', prompt: 'Hello!' });

// Multi-turn
const r2 = await api.createGeneration({
  model: 'qwen-turbo',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'How do I braise beef with tomatoes?' },
  ],
});

// Stream
for await (const chunk of api.createGeneration({
  model: 'qwen-turbo',
  prompt: 'Outline a short essay on ocean plastic pollution.',
  stream: true,
})) {
  console.log(chunk.output);
}
```

### Chat completions

```js
const r = await api.createChatCompletion({
  model: 'qwen-turbo',
  messages: [{ role: 'user', content: 'Reply with one word.' }],
});
// Pass stream: true and use for await for streaming mode
```

### Image synthesis (async)

```js
const r = await api.createImageSynthesis({
  model: 'wanx-v1',
  prompt: 'A cute cat sitting on a windowsill',
});
```

### Text embedding

```js
const r = await api.createEmbedding({
  model: 'text-embedding-v1',
  input: 'hello world',
  text_type: 'query',
});
```

### TTS (WebSocket)

```js
const { SpeechSynthesizer, Configuration } = require('dashscope-sdk-official');
const synth = new SpeechSynthesizer(new Configuration({ apiKey: process.env.DASHSCOPE_API_KEY }));
const result = await synth.call({ model: 'cosyvoice-v1', text: 'Hello from DashScope', format: 'wav' });
const audio = result.getAudioData();
```

## Configuration object

```js
const config = new Configuration({
  apiKey: 'YOUR-DASHSCOPE-API-KEY',
  basePath: 'https://dashscope.aliyuncs.com/api/v1',
  workspace: 'optional-workspace-id',
});
```

## Output shape

Typical fields on result objects mirror the HTTP envelope:

- `request_id` — tracing id  
- `status_code` — `200` means success in the SDK’s normalized sense  
- `code` / `message` — populated on errors  
- `output` — model payload  
- `usage` — token usage when returned by the API  

## Contributing

Issues and pull requests are welcome. Please run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` locally when you change behavior. When adding or adjusting HTTP behavior, extend the corresponding **nock** expectations in `test/` (mock origin and helpers live under `test/helpers/mockConfig.ts`).

## Changelog

See [CHANGELOG.md](CHANGELOG.md). Maintainer release steps (npm + Git tag + GitHub Release): [docs/RELEASING.md](docs/RELEASING.md).

## License

This project is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
