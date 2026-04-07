/** Streaming ASR over WebSocket duplex (Python `Recognition` parity). */
import BaseApi from '../../common/baseApi';
import { DEFAULT_TIMEOUT_MS } from '../../common/consts';
import { runWebSocketDuplexTask } from '../../common/websocketClient';
import { readAudioChunks, validateAudioFile } from './audioUtils';

export interface RecognitionResult {
  statusCode?: number;
  requestId?: string;
  output?: { sentence?: Record<string, unknown> | Record<string, unknown>[] };
  usage?: Record<string, unknown>;
}

export interface RecognitionOptions {
  model: string;
  format: string;
  sampleRate: number;
  /** WebSocket timeout in ms (default 300000). */
  timeout?: number;
  phraseId?: string;
  disfluencyRemovalEnabled?: boolean;
  diarizationEnabled?: boolean;
  speakerCount?: number;
  timestampAlignmentEnabled?: boolean;
  specialWordFilter?: string;
  audioEventDetectionEnabled?: boolean;
  [key: string]: unknown;
}

class Recognition extends BaseApi {
  protected service = 'services/audio/asr/recognition';

  /** Blocking helper: stream a local audio file through the recognizer. */
  async call(filePath: string, options: Partial<RecognitionOptions> = {}): Promise<RecognitionResult> {
    validateAudioFile(filePath);

    const config = this.configuration;
    const { model, format, sampleRate, timeout, phraseId, ...rest } = options as RecognitionOptions;
    if (!model || !format || sampleRate === undefined || sampleRate === null) {
      throw new Error('model, format and sampleRate are required');
    }

    const parameters: Record<string, unknown> = {
      format,
      sample_rate: sampleRate,
      ...rest,
    };
    const resources = phraseId ? [{ resource_id: phraseId, resource_type: 'asr_phrase' }] : undefined;

    const startPayload = {
      model,
      task_group: 'audio',
      task: 'recognition',
      function: 'recognition',
      input: {},
      parameters,
      resources,
    };

    const sentences: Record<string, unknown>[] = [];
    let lastResponse: RecognitionResult = {};

    for await (const part of runWebSocketDuplexTask(
      {
        url: config.getWebSocketBasePath(),
        apiKey: config.getApiKey(),
        workspace: config.getWorkspace(),
        timeout: timeout ?? DEFAULT_TIMEOUT_MS,
      },
      startPayload,
      readAudioChunks(filePath),
    )) {
      if (part.isBinary) continue;
      const output = part.output as Record<string, unknown>;
      if (output?.sentence) {
        const sent = output.sentence as Record<string, unknown>;
        if (sent.end_time !== null && sent.end_time !== undefined) {
          sentences.push(sent);
        }
      }
      lastResponse = {
        statusCode: part.statusCode,
        requestId: part.requestId,
        output,
        usage: output?.usage as Record<string, unknown> | undefined,
      };
    }

    return {
      ...lastResponse,
      output: sentences.length ? { sentence: sentences } : lastResponse.output,
    };
  }
}

export default Recognition;
