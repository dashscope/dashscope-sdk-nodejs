/**
 * Text-to-speech over WebSocket (Python `SpeechSynthesizer` parity).
 */
import BaseApi from '../../common/baseApi';
import { DEFAULT_TIMEOUT_MS, HTTP_STATUS_OK } from '../../common/consts';
import { runWebSocketStreamTask } from '../../common/websocketClient';

export interface SpeechSynthesisOptions {
  model: string;
  text: string;
  format?: 'wav' | 'pcm' | 'mp3';
  sample_rate?: number;
  volume?: number;
  rate?: number;
  pitch?: number;
  word_timestamp_enabled?: boolean;
  phoneme_timestamp_enabled?: boolean;
  /** WebSocket timeout in ms (default 300000). */
  timeout?: number;
  /** Model-specific extension fields. */
  [key: string]: unknown;
}

/** Aggregated audio + metadata for one synthesis call. */
export class SpeechSynthesisResult {
  private _audioData: Buffer | null;
  /** Sentence-level timestamps (shape varies by model). */
  private _sentences: Array<Record<string, string>>;
  private _response: SpeechSynthesisResponse | null;

  constructor(
    audioData: Buffer | null,
    sentences: Array<Record<string, string>>,
    response: SpeechSynthesisResponse | null,
  ) {
    this._audioData = audioData;
    this._sentences = sentences;
    this._response = response;
  }

  getAudioData(): Buffer | null {
    return this._audioData;
  }

  getTimestamps(): Array<Record<string, string>> {
    return this._sentences;
  }

  getResponse(): SpeechSynthesisResponse | null {
    return this._response;
  }
}

/** Raw synthesis envelope from the service. */
export interface SpeechSynthesisResponse {
  request_id?: string;
  status_code?: number;
  code?: string;
  message?: string;
  output?: Record<string, unknown>;
  usage?: Record<string, unknown>;
}

class SpeechSynthesizer extends BaseApi {
  protected service = 'services/audio/speech-synthesizer/SpeechSynthesizer';

  async call(options: SpeechSynthesisOptions): Promise<SpeechSynthesisResult> {
    const { model, text, timeout = DEFAULT_TIMEOUT_MS, ...rest } = options;
    if (!model) throw new Error('model is required!');
    if (!text) throw new Error('text is required!');
    const config = this.configuration;
    const url = config.getWebSocketBasePath();
    const apiKey = config.getApiKey();
    const workspace = config.getWorkspace();

    const restParams = rest as Omit<SpeechSynthesisOptions, 'model' | 'text' | 'timeout'>;
    const parameters: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(restParams)) {
      if (v !== null && v !== undefined) parameters[k] = v;
    }

    const startPayload = {
      model,
      task_group: 'audio',
      task: 'speech-synthesizer',
      function: 'SpeechSynthesizer',
      input: { text },
      parameters,
    };

    let audioData: Buffer | null = null;
    const sentences: Array<Record<string, string>> = [];
    let lastResponse: SpeechSynthesisResponse | null = null;

    try {
      for await (const part of runWebSocketStreamTask(
        {
          url,
          apiKey,
          workspace,
          streaming: 'out',
          timeout,
        },
        startPayload,
      )) {
        if (part.isBinary) {
          const chunk = part.output as Buffer;
          if (chunk?.length > 0) {
            audioData = audioData ? Buffer.concat([audioData, chunk]) : chunk;
          }
        } else {
          const output = part.output as Record<string, unknown>;
          if (output && output.sentence) {
            const sent = output.sentence as Record<string, string>;
            // Replace the last sentence entry when the end time advances for the same begin_time.
            if (sentences.length === 0) {
              sentences.push(sent);
            } else {
              const last = sentences[sentences.length - 1];
              if (last?.begin_time === sent?.begin_time && last?.end_time !== sent?.end_time) {
                sentences.pop();
                sentences.push(sent);
              } else {
                sentences.push(sent);
              }
            }
          }
          if (part.statusCode === HTTP_STATUS_OK && output) {
            lastResponse = {
              request_id: part.requestId,
              status_code: part.statusCode,
              code: '',
              message: '',
              output: (output.output || output) as Record<string, unknown>,
              usage: output.usage as Record<string, unknown> | undefined,
            };
          }
        }
      }
    } catch (error) {
      throw new Error(`Speech synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return new SpeechSynthesisResult(audioData, sentences, lastResponse);
  }
}

export default SpeechSynthesizer;
