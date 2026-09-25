/**
 * Qwen Omni Realtime over WebSocket (Python `audio.qwen_omni.omni_realtime` parity).
 *
 * An OpenAI-realtime style, event-driven duplex client that connects to the
 * `.../api-ws/v1/realtime?model={model}` endpoint and exchanges JSON events.
 */
import { randomUUID } from 'crypto';
import WebSocket from 'ws';
import Configuration from '../../configuration';
import { getSdkHeaders } from '../../common/sdkHeaders';
import { getDashscopeUserAgent } from '../../common/userAgent';

/** Output/input modality values (Python `MultiModality`). */
export const MultiModality = {
  TEXT: 'text',
  AUDIO: 'audio',
} as const;
export type MultiModalityValue = (typeof MultiModality)[keyof typeof MultiModality];

/** Preset audio format types (Python `AudioFormatType`); raw strings are also accepted. */
export const AudioFormatType = {
  PCM: 'pcm',
  WAV: 'wav',
} as const;
export type AudioFormatTypeValue = (typeof AudioFormatType)[keyof typeof AudioFormatType];

/** Preset audio sample rates in Hz (Python `AudioSampleRate`); raw ints are also accepted. */
export const AudioSampleRate = {
  SAMPLE_RATE_8K: 8000,
  SAMPLE_RATE_16K: 16000,
  SAMPLE_RATE_24K: 24000,
  SAMPLE_RATE_48K: 48000,
} as const;
export type AudioSampleRateValue = (typeof AudioSampleRate)[keyof typeof AudioSampleRate];

/** Legacy preset audio format (Python `AudioFormat` enum member). */
export interface AudioFormat {
  format: string;
  sampleRate: number;
  channels: string;
  bitRate: string;
  /** Wire value used for the legacy top-level `input_audio_format` / `output_audio_format` fields. */
  formatStr: string;
}

/** Legacy preset audio formats (Python `AudioFormat`). */
export const AudioFormat = {
  PCM_16000HZ_MONO_16BIT: { format: 'pcm', sampleRate: 16000, channels: 'mono', bitRate: '16bit', formatStr: 'pcm16' },
  PCM_24000HZ_MONO_16BIT: { format: 'pcm', sampleRate: 24000, channels: 'mono', bitRate: '16bit', formatStr: 'pcm16' },
} as const satisfies Record<string, AudioFormat>;

/**
 * New-style audio format config (Python `AudioFormatConfig`). No strict validation:
 * preset enums are for convenience, raw values are passed through as-is.
 */
export class AudioFormatConfig {
  type: string;
  sampleRate: number;
  extraParams: Record<string, unknown>;

  constructor(options: { type?: string; sampleRate?: number; extraParams?: Record<string, unknown> } = {}) {
    this.type = options.type ?? AudioFormatType.PCM;
    this.sampleRate = options.sampleRate ?? AudioSampleRate.SAMPLE_RATE_16K;
    this.extraParams = options.extraParams ?? {};
  }

  /** Convert to the `format` dict used in the `session.update` request. */
  toDict(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      type: this.type,
      sample_rate: this.sampleRate,
    };
    Object.assign(result, this.extraParams);
    return result;
  }
}

/** Translation corpus (Python `TranslationParams.Corpus`). */
export interface TranslationCorpus {
  phrases?: Record<string, unknown>;
}

/** Translation params (Python `TranslationParams`). */
export interface TranslationParams {
  language?: string;
  corpus?: TranslationCorpus;
}

/** Transcription params (Python `TranscriptionParams`). */
export interface TranscriptionParams {
  language?: string;
  sampleRate?: number;
  inputAudioFormat?: string;
  corpus?: Record<string, unknown>;
  corpusText?: string;
}

/** Callback interface for receiving realtime omni events (Python `OmniRealtimeCallback`). */
export interface OmniRealtimeCallback {
  /** Invoked once the WebSocket connection is established. */
  onOpen?(): void;
  /** Invoked when the connection closes. */
  onClose?(code: number | undefined, reason: string | undefined): void;
  /** Invoked for every parsed JSON event pushed by the server. */
  onEvent(event: Record<string, unknown>): void;
}

/** Construction options for `OmniRealtimeConversation`. */
export interface OmniRealtimeOptions {
  model: string;
  callback: OmniRealtimeCallback;
  /** User-defined headers, merged with (and overridden by) the SDK defaults. */
  headers?: Record<string, string>;
  /** Workspace override; defaults to the Configuration workspace. */
  workspace?: string;
  /** Custom WebSocket base URL; defaults to the Configuration realtime base path. */
  url?: string;
  /** API key override; defaults to the Configuration API key. */
  apiKey?: string;
}

/** Parameters for `updateSession` (Python `update_session`). */
export interface OmniSessionOptions {
  outputModalities: MultiModalityValue[];
  voice?: string;
  /** Legacy input audio format; prefer `inputAudioConfig`. */
  inputAudioFormat?: AudioFormat;
  /** Legacy output audio format; prefer `outputAudioConfig`. */
  outputAudioFormat?: AudioFormat;
  enableInputAudioTranscription?: boolean;
  inputAudioTranscriptionModel?: string;
  enableTurnDetection?: boolean;
  turnDetectionType?: string;
  prefixPaddingMs?: number;
  turnDetectionThreshold?: number;
  turnDetectionSilenceDurationMs?: number;
  turnDetectionParam?: Record<string, unknown>;
  translationParams?: TranslationParams;
  transcriptionParams?: TranscriptionParams;
  inputAudioConfig?: AudioFormatConfig;
  outputAudioConfig?: AudioFormatConfig;
  inputVideoRepresentationCompact?: string;
  /** Extra fields merged verbatim into the session config. */
  [key: string]: unknown;
}

const CONNECT_TIMEOUT_MS = 5000;

const KNOWN_SESSION_KEYS = new Set([
  'outputModalities', 'voice', 'inputAudioFormat', 'outputAudioFormat',
  'enableInputAudioTranscription', 'inputAudioTranscriptionModel',
  'enableTurnDetection', 'turnDetectionType', 'prefixPaddingMs',
  'turnDetectionThreshold', 'turnDetectionSilenceDurationMs', 'turnDetectionParam',
  'translationParams', 'transcriptionParams', 'inputAudioConfig', 'outputAudioConfig',
  'inputVideoRepresentationCompact',
]);

class OmniRealtimeConversation {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly workspace?: string;
  private readonly userHeaders?: Record<string, string>;
  private readonly model: string;
  private readonly callback: OmniRealtimeCallback;

  private ws: WebSocket | null = null;
  private config: Record<string, unknown> = {};
  private sessionId: string | null = null;
  private lastMessage: Record<string, unknown> | null = null;
  private lastResponseId: string | null = null;
  private lastResponseCreateTime: number | null = null;
  private lastFirstTextDelay: number | null = null;
  private lastFirstAudioDelay: number | null = null;
  private disconnectResolve: (() => void) | null = null;
  private disconnectError: unknown = null;

  constructor(configuration: Configuration, options: OmniRealtimeOptions) {
    if (!options || !options.model) {
      throw new Error('Model is required!');
    }
    if (!options.callback) {
      throw new Error('Callback is required!');
    }
    this.model = options.model;
    this.callback = options.callback;
    this.userHeaders = options.headers;
    this.workspace = options.workspace ?? configuration.getWorkspace();
    this.apiKey = options.apiKey ?? configuration.getApiKey();
    const base = options.url ?? configuration.getRealtimeBasePath();
    this.url = `${base}?model=${this.model}`;
  }

  private generateEventId(): string {
    return `event_${randomUUID().replace(/-/g, '')}`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      ...(this.userHeaders || {}),
      'user-agent': getDashscopeUserAgent(),
      Authorization: `Bearer ${this.apiKey}`,
      ...getSdkHeaders('audio'),
    };
    if (this.workspace) {
      headers['X-DashScope-WorkSpace'] = this.workspace;
    }
    return headers;
  }

  /** Connect to the server. Resolves once the connection is open. */
  connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url, { headers: this.buildHeaders() });
      this.ws = ws;

      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            ws.terminate();
          } catch {
            /* ignore */
          }
          reject(new Error(
            'websocket connection could not established within 5s. ' +
            'Please check your network connection, firewall settings, or server status.',
          ));
        }
      }, CONNECT_TIMEOUT_MS);

      ws.on('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.attachHandlers(ws);
        this.callback.onOpen?.();
        resolve();
      });

      ws.on('error', (err: Error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  private attachHandlers(ws: WebSocket): void {
    ws.on('message', (data: Buffer | string) => {
      this.onMessage(Buffer.isBuffer(data) ? data.toString('utf-8') : String(data));
    });
    ws.on('close', (code: number, reason: Buffer) => {
      this.callback.onClose?.(code, reason ? reason.toString('utf-8') : undefined);
    });
    ws.on('error', () => {
      // Do not raise here; let the connection close naturally (Python parity).
    });
  }

  private onMessage(message: string): void {
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(message) as Record<string, unknown>;
    } catch {
      throw new Error('Failed to parse message as JSON.');
    }
    this.lastMessage = json;
    this.callback.onEvent(json);

    const type = json.type as string | undefined;
    if (type === 'session.created') {
      const session = json.session as Record<string, unknown> | undefined;
      this.sessionId = (session?.id as string) ?? null;
    } else if (type === 'session.finished') {
      this.disconnectResolve?.();
    } else if (type === 'error') {
      this.disconnectError = json.error;
      this.disconnectResolve?.();
    } else if (type === 'response.created') {
      const response = json.response as Record<string, unknown> | undefined;
      this.lastResponseId = (response?.id as string) ?? null;
      this.lastResponseCreateTime = Date.now();
      this.lastFirstAudioDelay = null;
      this.lastFirstTextDelay = null;
    } else if (type === 'response.audio_transcript.delta') {
      if (this.lastResponseCreateTime && this.lastFirstTextDelay === null) {
        this.lastFirstTextDelay = Date.now() - this.lastResponseCreateTime;
      }
    } else if (type === 'response.audio.delta') {
      if (this.lastResponseCreateTime && this.lastFirstAudioDelay === null) {
        this.lastFirstAudioDelay = Date.now() - this.lastResponseCreateTime;
      }
    }
  }

  private sendStr(data: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(
        'WebSocket connection is not established or has been closed. ' +
        'Please call connect() first and ensure the connection is active.',
      );
    }
    this.ws.send(data);
  }

  /** Send a `conversation.item.create` request. */
  createItem(item: Record<string, unknown>): void {
    this.sendStr(JSON.stringify({
      event_id: this.generateEventId(),
      type: 'conversation.item.create',
      item,
    }));
  }

  private applyAudioFormat(
    config: Record<string, unknown>,
    inputAudioFormat: AudioFormat,
    outputAudioFormat: AudioFormat,
    inputAudioConfig?: AudioFormatConfig,
    outputAudioConfig?: AudioFormatConfig,
  ): void {
    if (!inputAudioConfig && !outputAudioConfig) {
      // old-style: keep backward compatibility
      config.input_audio_format = inputAudioFormat.formatStr;
      config.output_audio_format = outputAudioFormat.formatStr;
      return;
    }
    const audio: Record<string, unknown> = {};
    if (inputAudioConfig) {
      audio.input = { format: inputAudioConfig.toDict() };
    }
    if (outputAudioConfig) {
      audio.output = { format: outputAudioConfig.toDict() };
    }
    config.audio = audio;
  }

  private applyTranscriptionParams(config: Record<string, unknown>, params: TranscriptionParams): void {
    const transcription: Record<string, unknown> = {};
    config.input_audio_transcription = transcription;
    if (params.language !== undefined && params.language !== null) {
      transcription.language = params.language;
    }
    let corpus = params.corpus;
    if (params.corpusText !== undefined && params.corpusText !== null) {
      corpus = { text: params.corpusText };
    }
    if (corpus !== undefined && corpus !== null) {
      transcription.corpus = corpus;
    }
    if ('audio' in config) {
      // input/output audio config is set; skip conflicting top-level fields.
      return;
    }
    config.input_audio_format = params.inputAudioFormat ?? 'pcm';
    config.sample_rate = params.sampleRate ?? 16000;
  }

  /** Update the session configuration; should be used before creating a response. */
  updateSession(options: OmniSessionOptions): void {
    const {
      outputModalities, voice,
      inputAudioFormat = AudioFormat.PCM_16000HZ_MONO_16BIT,
      outputAudioFormat = AudioFormat.PCM_24000HZ_MONO_16BIT,
      enableInputAudioTranscription = true,
      inputAudioTranscriptionModel,
      enableTurnDetection = true,
      turnDetectionType = 'server_vad',
      prefixPaddingMs = 300,
      turnDetectionThreshold = 0.2,
      turnDetectionSilenceDurationMs = 800,
      turnDetectionParam,
      translationParams,
      transcriptionParams,
      inputAudioConfig,
      outputAudioConfig,
      inputVideoRepresentationCompact,
    } = options;

    const config: Record<string, unknown> = {
      modalities: outputModalities,
      voice: voice ?? null,
    };

    this.applyAudioFormat(config, inputAudioFormat, outputAudioFormat, inputAudioConfig, outputAudioConfig);

    if (enableInputAudioTranscription) {
      config.input_audio_transcription = { model: inputAudioTranscriptionModel ?? null };
    } else {
      config.input_audio_transcription = null;
    }

    if (enableTurnDetection) {
      const turnDetection: Record<string, unknown> = {
        type: turnDetectionType,
        threshold: turnDetectionThreshold,
        prefix_padding_ms: prefixPaddingMs,
        silence_duration_ms: turnDetectionSilenceDurationMs,
      };
      if (turnDetectionParam) {
        Object.assign(turnDetection, turnDetectionParam);
      }
      config.turn_detection = turnDetection;
    } else {
      config.turn_detection = null;
    }

    if (translationParams) {
      const translation: Record<string, unknown> = { language: translationParams.language ?? null };
      if (translationParams.corpus && translationParams.corpus.phrases !== undefined && translationParams.corpus.phrases !== null) {
        translation.corpus = { phrases: translationParams.corpus.phrases };
      }
      config.translation = translation;
    }

    if (transcriptionParams) {
      this.applyTranscriptionParams(config, transcriptionParams);
    }

    if (inputVideoRepresentationCompact !== undefined && inputVideoRepresentationCompact !== null) {
      config.video = { input: { representation_compact: inputVideoRepresentationCompact } };
    }

    // Merge any extra kwargs (unknown keys) verbatim.
    for (const [key, value] of Object.entries(options)) {
      if (!KNOWN_SESSION_KEYS.has(key)) {
        config[key] = value;
      }
    }

    this.config = config;
    this.sendStr(JSON.stringify({
      event_id: this.generateEventId(),
      type: 'session.update',
      session: this.config,
    }));
  }

  /**
   * End the session and wait for the server to finish.
   * @param timeout Seconds to wait for the session to end (default 20).
   */
  endSession(timeout = 20): Promise<void> {
    this.sendStr(JSON.stringify({
      event_id: this.generateEventId(),
      type: 'session.finish',
    }));

    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.disconnectResolve = null;
      };
      const timer = setTimeout(() => {
        cleanup();
        this.close();
        reject(new Error(`Session end timeout after ${timeout} seconds`));
      }, timeout * 1000);

      this.disconnectResolve = () => {
        cleanup();
        const error = this.disconnectError;
        this.disconnectError = null;
        if (error !== null && error !== undefined) {
          this.close();
          reject(new Error(`Session ended with error: ${JSON.stringify(error)}`));
          return;
        }
        this.close();
        resolve();
      };
    });
  }

  /** End the session asynchronously; the caller must close the connection manually. */
  endSessionAsync(): void {
    this.sendStr(JSON.stringify({
      event_id: this.generateEventId(),
      type: 'session.finish',
    }));
  }

  /** Send base64-encoded audio. */
  appendAudio(audioB64: string): void {
    this.sendStr(JSON.stringify({
      event_id: this.generateEventId(),
      type: 'input_audio_buffer.append',
      audio: audioB64,
    }));
  }

  /** Send one base64-encoded image frame. */
  appendVideo(videoB64: string): void {
    this.sendStr(JSON.stringify({
      event_id: this.generateEventId(),
      type: 'input_image_buffer.append',
      image: videoB64,
    }));
  }

  /** Commit the audio/video sent before (not needed in server VAD mode). */
  commit(): void {
    this.sendStr(JSON.stringify({
      event_id: this.generateEventId(),
      type: 'input_audio_buffer.commit',
    }));
  }

  /** Clear the audio sent to the server before. */
  clearAppendedAudio(): void {
    this.sendStr(JSON.stringify({
      event_id: this.generateEventId(),
      type: 'input_audio_buffer.clear',
    }));
  }

  /** Create a response from the committed audio/video (not needed in server VAD mode). */
  createResponse(instructions?: string, outputModalities?: MultiModalityValue[]): void {
    const response: Record<string, unknown> = { instructions: instructions ?? null };
    if (outputModalities && outputModalities.length > 0) {
      response.modalities = outputModalities;
    }
    this.sendStr(JSON.stringify({
      event_id: this.generateEventId(),
      type: 'response.create',
      response,
    }));
  }

  /** Cancel the current response. */
  cancelResponse(): void {
    this.sendStr(JSON.stringify({
      event_id: this.generateEventId(),
      type: 'response.cancel',
    }));
  }

  /** Send a raw JSON string to the server. */
  sendRaw(rawData: string): void {
    this.sendStr(rawData);
  }

  /** Close the connection to the server. */
  close(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getLastMessage(): Record<string, unknown> | null {
    return this.lastMessage;
  }

  getLastResponseId(): string | null {
    return this.lastResponseId;
  }

  getLastFirstTextDelay(): number | null {
    return this.lastFirstTextDelay;
  }

  getLastFirstAudioDelay(): number | null {
    return this.lastFirstAudioDelay;
  }
}

export default OmniRealtimeConversation;
