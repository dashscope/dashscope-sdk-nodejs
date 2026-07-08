# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/dashscope/dashscope-sdk-nodejs/compare/v1.25.5...HEAD)

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
