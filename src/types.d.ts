export interface ConfigurationOptions {

  /**
   * API key for authentication. If omitted, read from the `DASHSCOPE_API_KEY` environment variable.
   */
  apiKey?: string;

  /**
   * HTTP API base URL. If omitted, read from `DASHSCOPE_HTTP_BASE_URL`, default `https://dashscope.aliyuncs.com/api/v1`.
   */
  basePath?: string;

  /**
   * DashScope workspace ID, sent as the `X-DashScope-WorkSpace` header.
   */
  workspace?: string;

  /**
   * WebSocket base URL. If omitted, read from `DASHSCOPE_WEBSOCKET_BASE_URL`.
   */
  webSocketBasePath?: string;
}

export interface HistoryItem {

  /**
   * User input in a legacy history turn.
   */
  user: string;

  /**
   * Model output in a legacy history turn.
   */
  bot: string;
}

export interface MessageItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateOptions {

  /**
   * Model name (aligned with Python `Generation.Models` where applicable).
   */
  model: 'qwen-turbo' | 'qwen-plus' | 'qwen-max' | string;

  /**
   * Input prompt text.
   */
  prompt?: string;

  /**
   * @deprecated Prefer `messages`.
   * Legacy multi-turn history: each item is `{"user":"...","bot":"..."}` in chronological order.
   */
  history?: HistoryItem[];

  /**
   * Conversation history as OpenAI-style messages: `{"role","content"}` per turn.
   * Roles: `system`, `user`, `assistant` (extensible in the future).
   */
  messages?: MessageItem[];

  /**
   * When true, the API returns a stream of partial results.
   */
  stream?: boolean;

  /**
   * `text`: legacy text output shape. `message`: OpenAI-compatible message shape.
   * @default 'text'
   */
  result_format?: 'text' | 'message';

  /**
   * Random seed for reproducibility. Unsigned 64-bit integer; default 1234 in API docs.
   */
  seed?: number;

  /**
   * Upper bound on generated tokens (not a guarantee of exact count).
   * Model-specific defaults and maxima apply (e.g. 1500 vs 2048 for different Qwen variants).
   */
  max_tokens?: number;

  /**
   * Nucleus sampling threshold in (0, 1). Higher values increase randomness. Default ~0.8; must be < 1.
   */
  top_p?: number;

  /**
   * Top-k sampling: only the top-k tokens by score are candidates. If empty or k > 100, top-k is disabled and only top_p applies.
   */
  top_k?: number;

  /**
   * Repetition penalty; 1.0 disables. Default ~1.1.
   */
  repetition_penalty?: number;

  /**
   * Sampling temperature in [0, 2). Higher = more diverse; lower = more deterministic. Default 1.0.
   */
  temperature?: number;

  /**
   * Stop sequences: generation stops before emitting the stop string or token id(s).
   * List form must not mix strings and numeric token ids in one array.
   */
  stop?: string | string[] | number[] | number[][];

  /**
   * Whether to use web search augmentation when supported. Does not force search usage.
   */
  enable_search?: boolean;

  /**
   * Streaming increment mode. When false, each chunk may repeat prior text; when true, chunks are deltas only (you must concatenate).
   * Only applies with `stream: true`.
   */
  incremental_output?: boolean;

  /**
   * Presence penalty for controlling content repetition. Range [-2.0, 2.0].
   */
  presence_penalty?: number;

  /**
   * Tool definitions for function calling.
   */
  tools?: Record<string, unknown>[];

  /**
   * Tool selection strategy. `"auto"`, `"none"`, `"required"`, or an object specifying a particular tool.
   */
  tool_choice?: string | Record<string, unknown>;

  /**
   * Enable thinking/reasoning mode (model-dependent).
   */
  enable_thinking?: boolean;

  /**
   * Number of responses to generate (1-4).
   */
  n?: number;

  /**
   * Maximum token budget for thinking mode. Controls the maximum length of thinking process.
   */
  thinking_budget?: number;

  /**
   * Whether to return log probabilities of the output tokens.
   */
  logprobs?: boolean;

  /**
   * Number of most likely tokens to return at each token position when `logprobs` is enabled.
   */
  top_logprobs?: number;

  /**
   * Configuration options for web search feature.
   */
  search_options?: Record<string, unknown>;

  /**
   * Enable parallel tool calls for function calling.
   */
  parallel_tool_calls?: boolean;

  /**
   * Format constraint for response, e.g. `{ "type": "json_object" }` for JSON mode.
   */
  response_format?: Record<string, unknown>;

  /**
   * Output format for qwen-deep-research model. Options: `"model_detailed_report"` (default), `"model_summary_report"`.
   */
  output_format?: string;

  /**
   * Plugin configuration (e.g. extended search options).
   */
  plugins?: string | Record<string, unknown>;

  /**
   * Enterprise / Bailian customized model id when required.
   */
  customized_model_id?: string;

  /**
   * Escape hatch for forward-compatible parameters. Prefer narrowing with type guards at call sites.
   */
  [key: string]: unknown;
}

export interface ListOptions {

  /** Page number (1-based where applicable). */
  page_no?: number;

  /** Page size. */
  page_size?: number;
}

/** Options for listing thread messages. */
export interface MessageListOptions {
  limit?: number;
  order?: string;
}

export interface FileUploadOptions {

  /** Local filesystem path to the file. */
  file_path: string;

  /**
   * Upload purpose; drives validation. `fine_tune` expects JSONL; `assistants` has no format restriction.
   */
  purpose: 'fine_tune' | 'assistants',

  /** Optional file description. */
  description?: string,
}

export interface FineTuneOptions {

  model: string;

  /** Training file IDs. */
  training_file_ids: string[];

  validation_file_ids?: string[];

  hyper_parameters?: Record<string, unknown>;

  /** Training mode: `sft` or `efficient_sft`. */
  mode?: 'sft' | 'efficient_sft';

  finetuned_output?: string;
}

export interface TranscriptionOptions {

  model: 'paraformer-v1' | 'paraformer-8k-v1' | 'paraformer-mtl-v1';

  /** URLs of audio/video to transcribe. */
  file_urls: string[];

  /** Track indices for multi-track media. */
  channel_id?: number[];

  /**
   * Maximum seconds to wait for the async transcription task to complete.
   * Default is -1 (no timeout). When > 0, returns a timeout response on expiry.
   */
  wait_timeout?: number;
}

export interface TextEmbeddingOptions {

  /** Model id (aligned with Python `TextEmbedding.Models`). */
  model: 'text-embedding-v1' | 'text-embedding-v2' | 'text-embedding-v3' | 'text-embedding-v4' | string;

  /** Single string or batch of strings. */
  input: string | string[];

  /** `query` or `document` for dual-tower models. */
  text_type?: 'query' | 'document';

  /** Output vector dimension. Options: 2048, 1536 (v4), 1024 (default), 768, 512, 256, 128, 64. Only for v3/v4. */
  dimension?: number;

  /** Output format: `"dense"` (default), `"sparse"`, or `"dense&sparse"`. Only for v3/v4. */
  output_type?: 'dense' | 'sparse' | 'dense&sparse';

  /** Custom task instruction to guide model understanding of query intent. */
  instruct?: string;

  /** Additional parameters. */
  [key: string]: unknown;
}

/** OpenAI-compatible chat completion request shape. */
export interface ChatCompletionOptions {
  model: string;
  messages: MessageItem[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop?: string | string[];
  max_tokens?: number;
  repetition_penalty?: number;
  /** Extra JSON fields merged into the request body. */
  extra_body?: Record<string, unknown>;
  /** Extra HTTP headers. */
  extra_headers?: Record<string, string>;
}

/** Models list parameters (Python `ListMixin` alignment). */
export interface ModelsListOptions {
  page_no?: number;
  page_size?: number;
}

/** Image synthesis parameters. */
export interface ImageSynthesisOptions {
  model: string;
  prompt: string;
  negative_prompt?: string;
  images?: string[];
  sketch_image_url?: string;
  ref_img?: string;
  mask_image_url?: string;
  base_image_url?: string;
  extra_input?: Record<string, unknown>;
  task?: string;
  function?: string;
  n?: number;
  size?: string;

  /** Random seed for image generation. */
  seed?: number;

  /** Output image style. Supported: `<auto>`, `<photography>`, `<portrait>`, `<3d cartoon>`, `<anime>`, `<oil painting>`, `<watercolor>`, `<sketch>`, `<chinese painting>`, `<flat illustration>`. */
  style?: string;

  /** Control similarity between output and reference image. Range [0.0, 1.0]. Higher = more similar. */
  ref_strength?: number;

  /** Mode for generating image based on reference image. `"repaint"` (default, based on content) or `"refonly"` (based on style). */
  ref_mode?: string;

  /** Whether to extend prompt automatically for better results. */
  prompt_extend?: boolean;

  /** Whether to add watermark. */
  watermark?: boolean;

  /** List of bounding boxes for region-specific editing. */
  bbox_list?: Record<string, unknown>[];

  /** Enable sequential generation mode. */
  enable_sequential?: boolean;

  /** Thinking mode for generation. Supported: `"fast"`, `"balanced"`, `"quality"`. */
  thinking_mode?: string;

  /** Color palette specification for consistent styling. */
  color_palette?: string;

  /**
   * Maximum seconds to wait for the async image task to complete.
   * Default is -1 (no timeout). When > 0, returns a timeout response on expiry.
   */
  wait_timeout?: number;

  [key: string]: unknown;
}

/** One entry in video synthesis `media` (multimodal refs); shape follows Python `VideoSynthesis.call` `media`. */
export interface VideoSynthesisMediaItem {
  url?: string;
  reference_voice?: string;
  [key: string]: unknown;
}

/** Video synthesis parameters. */
export interface VideoSynthesisOptions {
  model: string;
  prompt?: string;
  negative_prompt?: string;
  img_url?: string;
  audio_url?: string;
  reference_video_urls?: string[];
  /** Reference file URLs (Python `reference_urls`). */
  reference_urls?: string[];
  /** Single reference file URL (Python `reference_url`). */
  reference_url?: string;
  reference_video_description?: string[];
  extend_prompt?: boolean;
  template?: string;
  extra_input?: Record<string, unknown>;
  task?: string;
  head_frame?: string;
  tail_frame?: string;
  first_frame_url?: string;
  last_frame_url?: string;
  /** Multimodal media list (Python `media`). */
  media?: VideoSynthesisMediaItem[];
  duration?: number;
  size?: string;

  /** Random seed for video generation. */
  seed?: number;

  /** Whether to extend prompt. */
  prompt_extend?: boolean;

  /** Whether to add watermark. */
  watermark?: boolean;

  /** Output resolution. */
  resolution?: string;

  /** Aspect ratio, e.g. "16:9". */
  ratio?: string;

  /** Shot type for video generation. */
  shot_type?: string;

  /** Audio setting for video: `"auto"` or `"origin"`. */
  audio_setting?: string;

  /**
   * Maximum seconds to wait for the async video task to complete.
   * Default is -1 (no timeout). When > 0, returns a timeout response on expiry.
   */
  wait_timeout?: number;

  [key: string]: unknown;
}

/** One multimodal segment (text and/or image). */
export interface MultiModalContentItem {
  text?: string;
  image?: string;
}

/** Multimodal message: `content` may be text or an array of multimodal items. */
export interface MultiModalMessageItem {
  role: 'user' | 'assistant' | 'system';
  content: string | MultiModalContentItem[];
}

/** Multimodal conversation parameters. */
export interface MultiModalConversationOptions {
  model: string;
  messages: MultiModalMessageItem[];
  stream?: boolean;
  text?: string;
  voice?: string;
  language_type?: string;

  /** Sampling temperature in [0, 2). Higher = more diverse. */
  temperature?: number;

  /** Nucleus sampling threshold in (0, 1]. */
  top_p?: number;

  /** Top-k sampling: only the top-k tokens by score are candidates. */
  top_k?: number;

  /** Maximum output token count. */
  max_tokens?: number;

  /** Random seed for reproducibility. */
  seed?: number;

  /** Stop sequences. */
  stop?: string | string[];

  /** Repetition penalty; 1.0 disables. */
  repetition_penalty?: number;

  /** Presence penalty for controlling content repetition. Range [-2.0, 2.0]. */
  presence_penalty?: number;

  /** `"message"` or `"text"` result format. */
  result_format?: string;

  /** In streaming mode, output only new tokens (true) vs. cumulative output (false). */
  incremental_output?: boolean;

  /** Enable web search. */
  enable_search?: boolean;

  /** Tool definitions for function calling. */
  tools?: Record<string, unknown>[];

  /** Tool selection strategy. */
  tool_choice?: string | Record<string, unknown>;

  /** Enable thinking/reasoning mode (model-dependent). */
  enable_thinking?: boolean;

  /** Number of responses to generate (1-4). */
  n?: number;

  /** OCR task options for qwen-ocr models. */
  ocr_options?: Record<string, unknown>;

  /** Whether to return log probabilities of the output tokens. */
  logprobs?: boolean;

  /** Number of most likely tokens to return at each token position when `logprobs` is enabled. */
  top_logprobs?: number;

  [key: string]: unknown;
}

/** Image generation parameters (wan2.6-image / wan2.6-t2i, messages-based interface). */
export interface ImageGenerationOptions {
  /** Model id, e.g. `wan2.6-image` or `wan2.6-t2i`. */
  model: string;

  /** Chat-style messages with role and content (text/image items). */
  messages: MultiModalMessageItem[];

  /** Enable streaming output. */
  stream?: boolean;

  /** In streaming mode, output only new tokens (true) vs. cumulative output (false). */
  incremental_output?: boolean;

  /** Number of responses to generate. */
  n?: number;

  /** When true, creates an async task instead of a synchronous call. */
  is_async?: boolean;

  /**
   * Maximum seconds to wait for the async task to complete.
   * Default is -1 (no timeout). Only used when `is_async` is true.
   */
  wait_timeout?: number;

  /** Additional parameters (seed, size, etc.). */
  [key: string]: unknown;
}

/** Code generation parameters. */
export interface CodeGenerationOptions {
  model: string;
  message: MessageItem[];
  scene: string;
  stream?: boolean;
  n?: number;
  [key: string]: unknown;
}

/** Batch text embedding parameters. */
export interface BatchTextEmbeddingOptions {
  model: string;
  url: string;
  text_type?: 'query' | 'document';

  /**
   * Maximum seconds to wait for the async embedding task to complete.
   * Default is -1 (no timeout). When > 0, returns a timeout response on expiry.
   */
  wait_timeout?: number;
}

/** Multimodal embedding parameters. */
export interface MultiModalEmbeddingOptions {
  model: string;
  input: MultiModalContentItem[];

  /** Output vector dimensions. Model-specific supported values. */
  dimension?: number;

  /** Output vector format, currently only `"dense"` is supported. */
  output_type?: string;

  /** Video frame extraction ratio in range [0,1]. Default: 1.0. */
  fps?: number;

  /** Custom task instruction to guide model understanding of query intent. */
  instruct?: string;

  /** Only for qwen3-vl-embedding. When true, fuses all contents into 1 vector. */
  enable_fusion?: boolean;

  /** Resolution tier: 0/1/2/3. Only for snapshot models. */
  res_level?: number;

  /** Max video sampling frames, up to 64. Only for snapshot models. */
  max_video_frames?: number;

  /** Additional parameters. */
  [key: string]: unknown;
}

/** NLU / understanding parameters. */
export interface UnderstandingOptions {
  model: string;
  sentence: string;
  labels: string;
  task?: 'extraction' | 'classification';
}

/** Text rerank parameters. */
export interface TextReRankOptions {
  model: string;
  query: string;
  documents: string[];
  top_n?: number;
  return_documents?: boolean;

  /** Custom task instruction to guide ranking strategy. English recommended. */
  instruct?: string;

  /** Additional parameters. */
  [key: string]: unknown;
}

/** Model deployment create parameters. */
export interface DeploymentOptions {
  model: string;
  capacity: number;
  version?: string;
  suffix?: string;
}

/** Assistant tool definition. */
export interface Tool {
  type?: string;
  [key: string]: unknown;
}

/** Thread creation body. */
export interface ThreadCreateOptions {
  messages?: unknown[];
  metadata?: Record<string, unknown>;
}

/** Message creation body. */
export interface MessageCreateOptions {
  role: string;
  content: string;
  file_ids?: string[];
}

/** Run creation body. */
export interface RunCreateOptions {
  assistant_id: string;
  instructions?: string;
  tools?: Tool[];
  [key: string]: unknown;
}

/** Assistant creation body. */
export interface AssistantCreateOptions {
  model: string;
  name?: string;
  description?: string;
  instructions?: string;
  tools?: Tool[];
  file_ids?: string[];
}
