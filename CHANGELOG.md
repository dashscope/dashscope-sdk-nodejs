# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/dashscope/dashscope-sdk-nodejs/compare/v1.25.4...HEAD)

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
