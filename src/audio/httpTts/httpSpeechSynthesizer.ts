/**
 * HTTP-based text-to-speech over HTTP API (Python `HttpSpeechSynthesizer` parity).
 * Synced from dashscope-sdk-python v1.25.17
 */
import BaseApi from '../../common/baseApi';
import { HTTP_STATUS_OK } from '../../common/consts';

/** Audio format options for HTTP speech synthesis. */
export type HttpAudioFormat = 'wav' | 'pcm' | 'mp3';

/** The result of HTTP speech synthesis. */
export class HttpSpeechSynthesisResult {
  private _audioData: Buffer | null;
  private _audioUrl: string | null;
  private _audioId: string | null;
  private _expiresAt: number | null;
  /** Sentence-level synthesis results (for streaming mode). */
  private _sentences: Array<Record<string, unknown>>;
  private _response: HttpSpeechSynthesisResponse | null;

  constructor(
    audioData: Buffer | null = null,
    audioUrl: string | null = null,
    audioId: string | null = null,
    expiresAt: number | null = null,
    sentences: Array<Record<string, unknown>> = [],
    response: HttpSpeechSynthesisResponse | null = null,
  ) {
    this._audioData = audioData;
    this._audioUrl = audioUrl;
    this._audioId = audioId;
    this._expiresAt = expiresAt;
    this._sentences = sentences;
    this._response = response;
  }

  /** Get the audio data (for streaming mode). */
  getAudioData(): Buffer | null {
    return this._audioData;
  }

  /** Get the audio URL (for non-streaming mode). */
  getAudioUrl(): string | null {
    return this._audioUrl;
  }

  /** Get the audio ID. */
  getAudioId(): string | null {
    return this._audioId;
  }

  /** Get the URL expiration timestamp. */
  getExpiresAt(): number | null {
    return this._expiresAt;
  }

  /** Get the sentence-level synthesis results (for streaming mode). */
  getSentences(): Array<Record<string, unknown>> {
    return this._sentences;
  }

  /** Get the full API response. */
  getResponse(): HttpSpeechSynthesisResponse | null {
    return this._response;
  }
}

/** Raw HTTP synthesis envelope from the service. */
export interface HttpSpeechSynthesisResponse {
  request_id?: string;
  status_code?: number;
  code?: string;
  message?: string;
  output?: Record<string, unknown>;
  usage?: Record<string, unknown>;
}

/** Options for HTTP speech synthesis. */
export interface HttpSpeechSynthesisOptions {
  /** The speech synthesis model, e.g., 'cosyvoice-v3-flash'. */
  model: string;
  /** The text to synthesize. */
  text: string;
  /** The voice to use for synthesis. */
  voice: string;
  /** Audio encoding format ('wav', 'pcm', 'mp3'). Defaults to 'wav'. */
  audioFormat?: HttpAudioFormat;
  /** Audio sample rate in Hz. Defaults to 24000. */
  sampleRate?: number;
  /** Whether to use streaming (SSE) mode. Defaults to false. */
  stream?: boolean;
  /** Per-request workspace header override. */
  workspace?: string;
  /** Per-request API key override. */
  apiKey?: string;
  /** Custom HTTP URL if needed. */
  url?: string;
  /** Additional parameters like volume, rate, pitch, etc. */
  [key: string]: unknown;
}

/** SSE chunk from HTTP TTS streaming response. */
interface SseChunk {
  output?: {
    type?: string;
    sentence?: Record<string, unknown>;
    audio?: {
      data?: string;
      url?: string;
      id?: string;
      expires_at?: number;
    };
    finish_reason?: string;
  };
}

class HttpSpeechSynthesizer extends BaseApi {
  protected service = 'services/audio/tts/SpeechSynthesizer';

  /**
   * Convert text to speech via HTTP API.
   * Supports both streaming (SSE) and non-streaming modes.
   */
  async call(options: HttpSpeechSynthesisOptions): Promise<HttpSpeechSynthesisResult | AsyncGenerator<HttpSpeechSynthesisResult, void, unknown>> {
    const {
      model,
      text,
      voice,
      audioFormat = 'wav',
      sampleRate = 24000,
      stream = false,
      workspace,
      // Destructure and exclude from extraParams (handled by BaseApi.request)
      apiKey: _apiKey,
      url: _url,
      ...extraParams
    } = options;

    if (!model) throw new Error('model is required!');
    if (!text) throw new Error('text is required!');
    if (!voice) throw new Error('voice is required!');

    // Build request body
    const body: Record<string, unknown> = {
      model,
      input: {
        text,
        voice,
        format: audioFormat,
        sample_rate: sampleRate,
        ...Object.fromEntries(
          Object.entries(extraParams).filter(([, v]) => v !== null && v !== undefined),
        ),
      },
    };

    // Prepare headers
    const headers: Record<string, string> = {};
    if (stream) {
      headers['X-DashScope-SSE'] = 'enable';
    }

    // Make the HTTP request
    const response = await this.request({
      method: 'post',
      data: body,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      workspace,
      service: this.service,
      responseType: stream ? 'stream' : undefined,
    });

    if (stream) {
      return this.handleStreamingResponse(response);
    } else {
      return this.handleNonStreamingResponse(response);
    }
  }

  private handleNonStreamingResponse(response: { status: number; data?: unknown }): HttpSpeechSynthesisResult {
    const output = this.extractOutput(response);
    const audioInfo = (output?.audio || {}) as Record<string, unknown>;

    return new HttpSpeechSynthesisResult(
      null,
      (audioInfo.url as string) || null,
      (audioInfo.id as string) || null,
      (audioInfo.expires_at as number) || null,
      [],
      response.data as HttpSpeechSynthesisResponse,
    );
  }

  private async* handleStreamingResponse(
    response: { status: number; data?: unknown },
  ): AsyncGenerator<HttpSpeechSynthesisResult, void, unknown> {
    const audioDataParts: Buffer[] = [];
    const sentences: Array<Record<string, unknown>> = [];

    // For streaming, data should be a readable stream
    const streamData = response.data;
    if (!streamData || typeof streamData !== 'object') {
      return;
    }

    // Handle different stream types (Node stream or AsyncIterable)
    const dataStream = streamData as AsyncIterable<Buffer>;

    let buffer = '';
    try {
      for await (const chunk of dataStream) {
        const chunkStr = chunk.toString('utf-8');
        buffer += chunkStr;

        // Process SSE events
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep incomplete event in buffer

        for (const event of events) {
          const lines = event.split('\n');
          let dataLine = '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              dataLine = line.slice(5).trim();
            }
          }

          if (!dataLine) continue;

          try {
            const parsed = JSON.parse(dataLine) as SseChunk;
            const output = parsed.output || {};
            const outputType = output.type || '';

            if (outputType.startsWith('sentence-')) {
              const sentenceInfo = output.sentence;
              if (sentenceInfo) {
                sentences.push(sentenceInfo);
              }

              const audioData = output.audio?.data;
              if (audioData) {
                const audioBytes = Buffer.from(audioData, 'base64');
                audioDataParts.push(audioBytes);
                yield new HttpSpeechSynthesisResult(
                  audioBytes,
                  null,
                  null,
                  null,
                  [...sentences],
                  null,
                );
              }
            } else if (output.finish_reason === 'stop') {
              yield this.createFinalResult(audioDataParts, sentences, output.audio || {}, parsed);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_e) {
            // Skip malformed JSON
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        let dataLine = '';
        for (const line of lines) {
          if (line.startsWith('data:')) {
            dataLine = line.slice(5).trim();
          }
        }
        if (dataLine) {
          try {
            const parsed = JSON.parse(dataLine) as SseChunk;
            const output = parsed.output || {};
            if (output.finish_reason === 'stop') {
              yield this.createFinalResult(audioDataParts, sentences, output.audio || {}, parsed);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_e) {
            // Skip malformed JSON
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Stream error - yield final result with collected data
      yield new HttpSpeechSynthesisResult(
        audioDataParts.length > 0 ? Buffer.concat(audioDataParts) : null,
        null,
        null,
        null,
        sentences,
        null,
      );
    }
  }

  private extractOutput(response: { status: number; data?: unknown }): Record<string, unknown> {
    if (response.status !== HTTP_STATUS_OK) {
      const data = response.data as { status_code?: number; code?: string; message?: string } | undefined;
      throw new Error(
        `Request failed: ${data?.status_code || response.status} ${data?.code || ''} ${data?.message || ''}`,
      );
    }
    const data = response.data as { output?: Record<string, unknown> } | undefined;
    return data?.output || {};
  }

  /**
   * Create a final HttpSpeechSynthesisResult from collected data.
   * Used for both regular finish events and remaining buffer processing.
   */
  private createFinalResult(
    audioDataParts: Buffer[],
    sentences: Array<Record<string, unknown>>,
    audioInfo: Record<string, unknown>,
    parsed: SseChunk,
  ): HttpSpeechSynthesisResult {
    return new HttpSpeechSynthesisResult(
      audioDataParts.length > 0 ? Buffer.concat(audioDataParts) : null,
      (audioInfo.url as string) || null,
      (audioInfo.id as string) || null,
      (audioInfo.expires_at as number) || null,
      [...sentences],
      parsed as unknown as HttpSpeechSynthesisResponse,
    );
  }
}

export default HttpSpeechSynthesizer;
