import { ok } from 'assert';
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
          data: { models: [{ name: 'qwen-turbo' }] },
          request_id: 'm-1',
        });
    }
    const result = await api.listModels({ page_no: 1, page_size: 5 });
    ok(result !== undefined && result !== null);
  });

  it('get model detail', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get('/api/v1/models/qwen-turbo')
        .reply(200, {
          data: { model_id: 'qwen-turbo', capabilities: ['text'] },
          request_id: 'm-2',
        });
    }
    const result = await api.getModel('qwen-turbo');
    ok(result);
  });
});
