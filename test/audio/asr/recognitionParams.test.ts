import { deepStrictEqual, ok } from 'assert';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Configuration, Recognition, TranslationRecognizer } from '../../../src/index';
import { MOCK_API_KEY } from '../../helpers/mockConfig';
import { MockWsServer, startMockWsServer } from '../../helpers/wsServer';

/** Reply task-started on run-task, task-finished on finish-task. */
function duplexResponder(msg: Record<string, unknown>): Record<string, unknown> | void {
  const header = msg.header as Record<string, unknown> | undefined;
  const action = header?.action as string | undefined;
  const taskId = (header?.task_id as string) ?? 'task-1';
  if (action === 'run-task') {
    return { header: { event: 'task-started', task_id: taskId } };
  }
  if (action === 'finish-task') {
    return { header: { event: 'task-finished', task_id: taskId }, payload: { output: {}, usage: {} } };
  }
  return undefined;
}

describe('ASR recognition params wire format', function() {
  this.timeout(10000);
  let server: MockWsServer;
  let config: Configuration;
  let audioFile: string;
  let dir: string;

  before(async () => {
    server = await startMockWsServer(duplexResponder);
    config = new Configuration({ apiKey: MOCK_API_KEY, webSocketBasePath: server.url });
    dir = mkdtempSync(join(tmpdir(), 'asr-params-'));
    audioFile = join(dir, 'sample.pcm');
    writeFileSync(audioFile, Buffer.alloc(32000, 1));
  });

  after(async () => {
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  function lastRunTaskParams(): Record<string, unknown> {
    const runTask = [...server.received].reverse().find((m) => (m.header as Record<string, unknown>)?.action === 'run-task');
    ok(runTask, 'expected a run-task message');
    return (runTask!.payload as Record<string, unknown>).parameters as Record<string, unknown>;
  }

  it('Recognition maps recognition params to snake_case', async () => {
    server.received.length = 0;
    const recognition = new Recognition(config);
    await recognition.call(audioFile, {
      model: 'paraformer-realtime-v2',
      format: 'pcm',
      sampleRate: 16000,
      disfluencyRemovalEnabled: true,
      diarizationEnabled: true,
      speakerCount: 2,
      timestampAlignmentEnabled: true,
      specialWordFilter: 'filter',
      audioEventDetectionEnabled: true,
    });
    const params = lastRunTaskParams();
    deepStrictEqual(params.disfluency_removal_enabled, true);
    deepStrictEqual(params.diarization_enabled, true);
    deepStrictEqual(params.speaker_count, 2);
    deepStrictEqual(params.timestamp_alignment_enabled, true);
    deepStrictEqual(params.special_word_filter, 'filter');
    deepStrictEqual(params.audio_event_detection_enabled, true);
    // camelCase keys must not leak onto the wire
    deepStrictEqual(params.disfluencyRemovalEnabled, undefined);
    deepStrictEqual(params.speakerCount, undefined);
  });

  it('TranslationRecognizer maps recognition params to snake_case', async () => {
    server.received.length = 0;
    const translator = new TranslationRecognizer(config);
    await translator.call(audioFile, {
      model: 'paraformer-realtime-v2',
      format: 'pcm',
      sampleRate: 16000,
      sourceLanguage: 'zh',
      transcriptionEnabled: true,
      translationEnabled: true,
      disfluencyRemovalEnabled: true,
      speakerCount: 3,
      specialWordFilter: 'wf',
    });
    const params = lastRunTaskParams();
    deepStrictEqual(params.source_language, 'zh');
    deepStrictEqual(params.transcription_enabled, true);
    deepStrictEqual(params.translation_enabled, true);
    deepStrictEqual(params.disfluency_removal_enabled, true);
    deepStrictEqual(params.speaker_count, 3);
    deepStrictEqual(params.special_word_filter, 'wf');
    deepStrictEqual(params.disfluencyRemovalEnabled, undefined);
  });
});
