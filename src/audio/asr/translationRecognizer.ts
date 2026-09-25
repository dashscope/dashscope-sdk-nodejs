/** Real-time speech translation over WebSocket duplex (Python parity). */
import BaseApi from '../../common/baseApi';
import { DEFAULT_TIMEOUT_MS } from '../../common/consts';
import { runWebSocketDuplexTask } from '../../common/websocketClient';
import { readAudioChunks, validateAudioFile } from './audioUtils';

export interface TranslationRecognizerOptions {
  model: string;
  format: string;
  sampleRate: number;
  sourceLanguage?: string;
  transcriptionEnabled?: boolean;
  translationEnabled?: boolean;
  phraseId?: string;
  disfluencyRemovalEnabled?: boolean;
  diarizationEnabled?: boolean;
  speakerCount?: number;
  timestampAlignmentEnabled?: boolean;
  specialWordFilter?: string;
  audioEventDetectionEnabled?: boolean;
  /** WebSocket timeout in ms (default 300000). */
  timeout?: number;
  [key: string]: unknown;
}

class TranslationRecognizer extends BaseApi {
  protected service = 'services/audio/asr/translation-recognizer';
  protected sdkModule = 'audio';

  async call(filePath: string, options: Partial<TranslationRecognizerOptions> = {}): Promise<{ transcriptions: Record<string, unknown>[] }> {
    validateAudioFile(filePath);

    const {
      model, format, sampleRate, sourceLanguage, transcriptionEnabled, translationEnabled, phraseId,
      disfluencyRemovalEnabled, diarizationEnabled, speakerCount,
      timestampAlignmentEnabled, specialWordFilter, audioEventDetectionEnabled,
      timeout = DEFAULT_TIMEOUT_MS, ...rest
    } =
      options as TranslationRecognizerOptions & { timeout?: number };
    if (!model || !format || sampleRate === undefined || sampleRate === null) {
      throw new Error('model, format and sampleRate are required');
    }
    if (sampleRate <= 0) {
      throw new Error('sampleRate must be a positive number');
    }

    const parameters: Record<string, unknown> = { format, sample_rate: sampleRate, ...rest };
    if (sourceLanguage) parameters.source_language = sourceLanguage;
    if (transcriptionEnabled !== undefined) parameters.transcription_enabled = transcriptionEnabled;
    if (translationEnabled !== undefined) parameters.translation_enabled = translationEnabled;
    // Map recognition params to their snake_case wire keys (Python parity).
    if (disfluencyRemovalEnabled !== undefined) parameters.disfluency_removal_enabled = disfluencyRemovalEnabled;
    if (diarizationEnabled !== undefined) parameters.diarization_enabled = diarizationEnabled;
    if (speakerCount !== undefined) parameters.speaker_count = speakerCount;
    if (timestampAlignmentEnabled !== undefined) parameters.timestamp_alignment_enabled = timestampAlignmentEnabled;
    if (specialWordFilter !== undefined) parameters.special_word_filter = specialWordFilter;
    if (audioEventDetectionEnabled !== undefined) parameters.audio_event_detection_enabled = audioEventDetectionEnabled;
    const resources = phraseId ? [{ resource_id: phraseId, resource_type: 'asr_phrase' }] : undefined;

    const config = this.configuration;
    const startPayload = {
      model,
      task_group: 'audio',
      task: 'translation-recognizer',
      function: 'recognition',
      input: {},
      parameters,
      resources,
    };

    const results: Record<string, unknown>[] = [];
    try {
      for await (const part of runWebSocketDuplexTask(
        {
          url: config.getWebSocketBasePath(),
          apiKey: config.getApiKey(),
          workspace: config.getWorkspace(),
          timeout,
          module: 'audio',
        },
        startPayload,
        readAudioChunks(filePath),
      )) {
        if (!part.isBinary && part.output) {
          results.push(part.output as Record<string, unknown>);
        }
      }
    } catch (error) {
      throw new Error(`WebSocket translation recognition failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return { transcriptions: results };
  }
}

export default TranslationRecognizer;
