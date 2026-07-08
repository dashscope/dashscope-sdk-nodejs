import { ok, strictEqual } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../../helpers/mockConfig';

describe('Speech transcription', function() {

  const createPath = '/api/v1/services/audio/asr/transcription';
  const taskId = 'mock-asr-task-1';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('async transcription task', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(createPath)
        .reply(200, {
          output: { task_id: taskId },
          request_id: 'asr-create-1',
        });
      nock(MOCK_HTTP_ORIGIN)
        .get(`/api/v1/tasks/${taskId}`)
        .reply(200, {
          output: {
            task_status: 'SUCCEEDED',
            transcription: 'hello world',
          },
          request_id: 'asr-poll-1',
        });
    }
    const result = await api.createTranscription({
      model: 'paraformer-v1',
      file_urls: [
        'https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female.wav',
      ],
    });
    ok(result.output?.task_status === 'SUCCEEDED');
  });

  it('wait_timeout returns timeout response', async function() {
    if (useLiveApi()) {
      this.skip();
    }
    const taskId2 = 'mock-asr-task-2';
    nock(MOCK_HTTP_ORIGIN)
      .post(createPath)
      .reply(200, {
        output: { task_id: taskId2 },
        request_id: 'asr-create-2',
      });
    nock(MOCK_HTTP_ORIGIN)
      .persist()
      .get(`/api/v1/tasks/${taskId2}`)
      .reply(200, {
        output: { task_status: 'PENDING' },
        request_id: 'asr-poll-2',
      });
    const result = await api.createTranscription({
      model: 'paraformer-v1',
      file_urls: ['https://example.com/test.wav'],
      wait_timeout: 1,
    });
    strictEqual(result.code, 'WaitTaskTimeout');
    nock.cleanAll();
  });
});
