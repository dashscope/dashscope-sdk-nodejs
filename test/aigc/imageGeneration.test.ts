import { ok, strictEqual } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import Result from '../../src/aigc/generation/result';
import { getDashscopeUserAgent } from '../../src/common/userAgent';
import { MOCK_HTTP_ORIGIN, sseDataLines, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Image Generation', function() {
  const syncPath = '/api/v1/services/aigc/multimodal-generation/generation';
  const asyncPath = '/api/v1/services/aigc/image-generation/generation';
  const taskId = 'mock-imggen-task-1';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('sync call returns result', async function() {
    if (useLiveApi()) {
      this.skip();
    }
    nock(MOCK_HTTP_ORIGIN)
      .post(syncPath)
      .reply(200, {
        output: { text: 'generated image data' },
        request_id: 'imggen-1',
      });
    const result = await api.createImageGeneration({
      model: 'wan2.6-t2i',
      messages: [{ role: 'user', content: 'a cute cat' }],
    });
    ok(result instanceof Result);
    ok(result.output?.text?.length);
  });

  it('streaming sends incremental_to_full UA', async function() {
    if (useLiveApi()) {
      this.skip();
    }
    const sse = sseDataLines([
      { output: { text: 'hel' }, request_id: 's1' },
      { output: { text: 'lo' }, request_id: 's1' },
    ]);
    let capturedUA = '';
    nock(MOCK_HTTP_ORIGIN)
      .post(syncPath)
      .reply(200, sse, { 'Content-Type': 'text/event-stream' })
      .on('request', (req) => {
        capturedUA = req.headers['user-agent'] as string;
      });
    const result = await api.createImageGeneration({
      model: 'wan2.6-t2i',
      messages: [{ role: 'user', content: 'draw' }],
      stream: true,
      incremental_output: false,
    });
    let valid = true;
    for await (const chunk of result as AsyncGenerator<Result>) {
      valid = valid && (chunk instanceof Result);
    }
    ok(valid);
    ok(capturedUA.includes(getDashscopeUserAgent()));
    ok(capturedUA.includes('incremental_to_full/1'));
  });

  it('async call creates task and waits', async function() {
    if (useLiveApi()) {
      this.skip();
    }
    nock(MOCK_HTTP_ORIGIN)
      .post(asyncPath)
      .reply(200, {
        output: { task_id: taskId },
        request_id: 'imggen-async-1',
      });
    nock(MOCK_HTTP_ORIGIN)
      .get(`/api/v1/tasks/${taskId}`)
      .reply(200, {
        output: { task_status: 'SUCCEEDED', results: [{ url: 'https://example.com/img.png' }] },
        request_id: 'imggen-poll-1',
      });
    const result = await api.createImageGeneration({
      model: 'wan2.6-image',
      messages: [{ role: 'user', content: 'a sunset' }],
      is_async: true,
    }) as { output?: { task_status?: string } };
    ok(result.output?.task_status === 'SUCCEEDED');
  });

  it('async call with wait_timeout returns timeout response', async function() {
    if (useLiveApi()) {
      this.skip();
    }
    const taskId2 = 'mock-imggen-task-2';
    nock(MOCK_HTTP_ORIGIN)
      .post(asyncPath)
      .reply(200, {
        output: { task_id: taskId2 },
        request_id: 'imggen-async-2',
      });
    nock(MOCK_HTTP_ORIGIN)
      .persist()
      .get(`/api/v1/tasks/${taskId2}`)
      .reply(200, {
        output: { task_status: 'PENDING' },
        request_id: 'imggen-poll-2',
      });
    const result = await api.createImageGeneration({
      model: 'wan2.6-image',
      messages: [{ role: 'user', content: 'a sunset' }],
      is_async: true,
      wait_timeout: 1,
    }) as { code?: string };
    strictEqual(result.code, 'WaitTaskTimeout');
    nock.cleanAll();
  });
});
