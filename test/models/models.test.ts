import { ok, strictEqual } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Models', function() {

  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('list models', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get('/api/v1/models')
        .query({ page_no: '1', page_size: '5' })
        .reply(200, {
          output: { models: [{ name: 'qwen-turbo' }] },
          request_id: 'm-1',
        });
    }
    const result = await api.listModels({ page_no: 1, page_size: 5 });
    ok(result !== undefined && result !== null);
  });

  it('get model detail', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get('/api/v1/models')
        .query({ model: 'qwen-turbo', page_no: '1', page_size: '1' })
        .reply(200, {
          output: { models: [{ model_id: 'qwen-turbo', capabilities: ['text'] }] },
          request_id: 'm-2',
        });
    }
    const result = await api.getModel('qwen-turbo') as Record<string, unknown>;
    ok(result);
    ok(result.output, 'output should be present');
    strictEqual((result.output as Record<string, unknown>).model_id, 'qwen-turbo');
  });

  it('get non-existent model returns 404', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get('/api/v1/models')
        .query({ model: 'non-existent-model', page_no: '1', page_size: '1' })
        .reply(200, {
          output: { models: [] },
          request_id: 'm-3',
        });
    }
    const result = await api.getModel('non-existent-model') as Record<string, unknown>;
    strictEqual(result.status_code, 404);
    ok((result.message as string).includes('non-existent-model'));
    strictEqual(result.output, null);
  });
});
