# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/dashscope/dashscope-sdk-nodejs/compare/v1.26.0...HEAD)

## [1.26.0](https://github.com/dashscope/dashscope-sdk-nodejs/releases/tag/v1.26.0) - 2026-07-08

### Added

- **GenerateOptions**: Added `thinking_budget`, `logprobs`, `top_logprobs`, `search_options`, `parallel_tool_calls`, `response_format`, `output_format` parameters for thinking budget control, log probabilities, web search configuration, parallel tool calls, JSON mode, and deep-research output format.
- **MultiModalConversationOptions**: Added `ocr_options`, `logprobs`, `top_logprobs` parameters for OCR model support and log probabilities.
- **ImageSynthesisOptions**: Added explicit `seed`, `style`, `ref_strength`, `ref_mode`, `prompt_extend`, `watermark`, `bbox_list`, `enable_sequential`, `thinking_mode`, `color_palette` parameters (previously only via `kwargs`).
- **VideoSynthesisOptions**: Added `shot_type` and `audio_setting` parameters for video shot type and audio configuration.

### Fixed

- **CodeGeneration**: Removed `services/` prefix from API path (`aigc/code-generation/generation`), aligning with Python `is_service=False` fix in v1.26.
- **Understanding**: Removed `services/` prefix from API path (`nlp/nlu/understanding`), aligning with Python `is_service=False` fix in v1.26.
- **Models.get()**: Rewritten to use query-parameter filtering (`?model={name}&page_no=1&page_size=1`) instead of path-based lookup, returning 404 when model is not found. Aligned with Python `Models.get()` rewrite in v1.26.
- **WebSocket duplex**: Added `readyState` check before `ws.send()` in `runWebSocketDuplexTask` to prevent errors when the connection closes mid-stream. Aligned with Python WebSocket connection-check fix in v1.26.
- **UTF-8 encoding**: Updated `Accept` and `Content-Type` headers to include `charset=utf-8`, ensuring non-ASCII characters (e.g. Chinese) are transmitted correctly. Aligned with Python `ensure_ascii=False` fix in v1.26.

### Changed

- **Models.get()** (**Breaking**): Return shape changed from raw response body to `{ ...response, output: model }` on success, or `{ status_code: 404, message, output: null }` when the model is not found. Previously returned the raw response body from path-based lookup (`GET /models/{name}`). Callers that accessed `result.output` directly will still work; callers that accessed other top-level fields should use the new spread-based return shape.

Synced from [dashscope-sdk-python](https://github.com/dashscope/dashscope-sdk-python) **v1.26.2** (tag `v1.26.2`).

## [1.25.5](https://github.com/dashscope/dashscope-sdk-nodejs/releases/tag/v1.25.5) - 2026-07-08

### Added

- **ImageGeneration** (`src/aigc/imageGeneration/`): New module for wan2.6-image / wan2.6-t2i image generation, based on a `messages` interface. Supports synchronous (streaming / non-streaming) and asynchronous task modes. Includes `call()`, `asyncCall()`, `fetch()`, `wait()` methods, with `incremental_to_full` streaming merge and `wait_timeout` support. Exported as `ImageGeneration` and `ImageGenerationModels` from the package entry.
- **Async task `wait_timeout`**: Added optional `wait_timeout` parameter (in seconds) to `ImageSynthesis`, `VideoSynthesis`, `Transcription`, and `BatchTextEmbedding` `call()` methods. When set to a value > 0, the method returns a timeout response (`code: 'WaitTaskTimeout'`, `status_code: 408`) instead of waiting indefinitely. Aligned with Python `BaseAsyncApi.wait(wait_timeout)`.
- **MultiModalConversation incremental merge**: Added `incremental_to_full` streaming logic to `MultiModalConversation` — when `incremental_output` is `false` and the model supports it, the SDK transparently requests incremental output and merges deltas into a full response, matching `Generation` behavior.

### Fixed

- **Generation `User-Agent` header**: The `incremental_to_full` User-Agent flag now includes the SDK version (`dashscope-sdk-nodejs/x.y.z; incremental_to_full/N`) instead of overriding the entire User-Agent string. Previously the SDK version was lost during streaming requests.

Synced from [dashscope-sdk-python](https://github.com/dashscope/dashscope-sdk-python) **v1.25.24** (tag `v1.25.24`).

## [1.25.4](https://github.com/dashscope/dashscope-sdk-nodejs/releases/tag/v1.25.4) - 2026-06-09

### Added

- **GenerateOptions**: Added explicit `presence_penalty`, `tools`, `tool_choice`, `enable_thinking`, `n` parameters for function calling and reasoning mode support.
- **MultiModalConversationOptions**: Added explicit `temperature`, `top_p`, `top_k`, `max_tokens`, `seed`, `stop`, `repetition_penalty`, `presence_penalty`, `result_format`, `incremental_output`, `enable_search`, `tools`, `tool_choice`, `enable_thinking`, `n` parameters.
- **VideoSynthesisOptions**: Added explicit `seed`, `prompt_extend`, `watermark`, `resolution`, `ratio` parameters.
- **TextEmbeddingOptions**: Added `dimension`, `output_type`, `instruct` parameters for v3/v4 models.
- **MultiModalEmbeddingOptions**: Added `dimension`, `output_type`, `fps`, `instruct`, `enable_fusion`, `res_level`, `max_video_frames` parameters for qwen3-vl-embedding and snapshot models.
- **TextReRankOptions**: Added `instruct` parameter for custom ranking instructions.

Synced from [dashscope-sdk-python](https://github.com/dashscope/dashscope-sdk-python) **v1.25.21** (tag `v1.25.21`).

## [1.25.3](https://github.com/dashscope/dashscope-sdk-nodejs/releases/tag/v1.25.3) - 2026-04-24

### Added

- **HTTP TTS** (`HttpSpeechSynthesizer`): New HTTP-based text-to-speech interface for CosyVoice, supporting both streaming (SSE) and non-streaming modes. Synced from [dashscope-sdk-python](https://github.com/dashscope/dashscope-sdk-python) **v1.25.17** (tag `v1.25.17`).
  - Non-streaming: Returns audio URL, audio ID, and expiration timestamp.
  - Streaming: Yields audio data chunks with sentence-level timestamps.
  - Added `HttpSpeechSynthesisResult` class with getters for `audioData`, `audioUrl`, `audioId`, `expiresAt`, `sentences`, and `response`.

## [1.25.2](https://github.com/dashscope/dashscope-sdk-nodejs/releases/tag/v1.25.2) - 2026-04-07

Re-export result types and classes from the package entry for migration from legacy deep imports and typing: `BaseResult`, `GenerationResult`, `EmbeddingResult`, `MultiModalEmbeddingResult`, `AsyncTaskResult`, `RecognitionResult`.

## [1.25.1](https://github.com/dashscope/dashscope-sdk-nodejs/releases/tag/v1.25.1) - 2026-04-03

First open-source release on GitHub and npm as **`dashscope-sdk-official`**, migrated from the internal **`@ali/dashscope-sdk`** package. Aligned with [dashscope-sdk-python](https://github.com/dashscope/dashscope-sdk-python) **v1.25.15** (tag `v1.25.15`).
