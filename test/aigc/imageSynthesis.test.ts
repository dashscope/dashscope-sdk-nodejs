import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Image Synthesis', function() {
  const createPath = '/api/v1/services/aigc/text2image/image-synthesis';
  const taskId = 'mock-image-task-1';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('text-to-image call', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(createPath)
        .reply(200, {
          output: { task_id: taskId },
          request_id: 'img-create-1',
        });
      nock(MOCK_HTTP_ORIGIN)
        .get(`/api/v1/tasks/${taskId}`)
        .reply(200, {
          output: {
            task_status: 'SUCCEEDED',
            results: [{ url: 'https://example.com/mock.png' }],
          },
          request_id: 'img-poll-1',
        });
    }
    const result = await api.createImageSynthesis({
      model: 'wanx-v1',
      prompt: 'A cute cat on a windowsill, soft lighting',
    });
    ok(result);
    ok(result.output || (result as { data?: unknown }).data);
  });
});
