# DashScope Node.js SDK — technical design

This document describes how the SDK is structured and how to extend it safely.

## Principles

| Principle | Meaning |
|-----------|---------|
| **Python parity** | Request/response shapes and field names follow the Python SDK unless the Node API intentionally adapts them. |
| **Stable architecture** | `Configuration` + `BaseApi` + feature modules; new features subclass `BaseApi` instead of introducing parallel stacks. |
| **Reuse** | Async polling, SSE parsing, and WebSocket helpers are shared across modules. |
| **Backward compatibility** | Avoid breaking public method signatures; new options are optional. |
| **Deprecated surface** | Items marked deprecated in Python are not reintroduced here. |
| **TypeScript norms** | Implementation style matches common TS practice while keeping wire formats stable. |

## Architecture

```
Configuration → BaseApi (HTTP) → feature modules (Generation, File, …)
              → websocketClient (streaming ASR/TTS)
              → asyncTask (poll until task terminal state)
```

- **Configuration** — API key, base URLs, workspace, env fallbacks.  
- **BaseApi** — `request()`, timeouts, workspace header, error normalization.  
- **Feature modules** — Set `protected service` (path) and call `request` / shared helpers.

## Module map

| Category | Modules |
|----------|---------|
| Config | `Configuration` |
| Core | `BaseApi`, `asyncTask`, `websocketClient` |
| AIGC | Generation, ChatCompletion, ImageSynthesis, VideoSynthesis, MultiModalConversation, CodeGeneration |
| Audio | Transcription, Recognition, TranslationRecognizer, Vocabulary, AsrPhraseManager, SpeechSynthesizer, QwenTtsSynthesizer |
| NLP / vectors | TextEmbedding, BatchTextEmbedding, MultiModalEmbedding, Understanding, TextReRank |
| Resources | File, Models, Deployments, FineTune |
| Agents | Assistants, Threads, Messages, Runs |

## Patterns

### HTTP sync vs stream

- Sync: parse `data.output` (and sometimes flatten to the module’s return type).  
- Stream: `responseType: 'stream'`, incremental SSE parsing, `async` generators.

### Async tasks

Submit → read `output.task_id` → poll `GET /tasks/{id}` until status ∈ {`SUCCEEDED`,`FAILED`,`CANCELED`,`UNKNOWN`}. Implemented in `common/asyncTask.ts`.

### WebSocket

`runWebSocketStreamTask` (server → client) and `runWebSocketDuplexTask` (bidirectional audio). Used by TTS and streaming ASR.

### Response flattening

Many DashScope responses nest under `output`. Modules may hoist fields to the top level for ergonomics (`job_id`, `status`, etc.).

## Dependencies

- **axios** — HTTP.  
- **ws** — WebSocket client.  
- Prefer Node built-ins where possible.

When adding a capability, verify paths and payloads against the Python source, extend `BaseApi`, and reuse polling / SSE / WebSocket utilities. Add or update tests that exercise the new path.

## Engineering guidelines

### Types

- Avoid `any`; prefer `Record<string, unknown>` and narrow at boundaries.  
- Use `===` / `!==`.  
- Use runtime checks (`Buffer.isBuffer`, `typeof`) before casts.

### Errors and timeouts

- Propagate failures; do not swallow network or API errors.  
- Long polls must honor `maxWait`.  
- Validate required parameters before calling the network.

### Structure

- Keep streaming and non-streaming code paths separate when complexity differs.  
- Factor shared logic into small pure helpers.  
- Keep return types consistent within a family of APIs (e.g. all return `*Result` classes where applicable).

### Testing

- HTTP is mocked with **nock**; `Configuration` uses `test/helpers/mockConfig.ts` (`testDashscopeConfig()` → `http://127.0.0.1:4010/api/v1` unless `DASHSCOPE_LIVE_API=1`). Mocha root hooks in `test/nock-hooks.cjs` call `nock.disableNetConnect()` and `nock.cleanAll()` after each test when not in live mode.
- **Live API**: `npm run test:live` — requires `DASHSCOPE_API_KEY`; same specs hit real endpoints (use sparingly).
- **TTS (WebSocket)**: skipped unless `DASHSCOPE_LIVE_API=1` (`test:live`); requires a real key.

### Build & publish layout

- **tsup** bundles `src/index.ts` to `lib/index.js` (CJS) and `lib/index.mjs` (ESM), with types `lib/index.d.ts` / `lib/index.d.mts`. Dependencies **axios** and **ws** stay external. The ESM bundle prepends a small banner so `__dirname` resolves for `getSdkVersion()`.

### Documentation

- Public methods should have concise JSDoc.  
- Comment only non-obvious invariants or protocol details.
