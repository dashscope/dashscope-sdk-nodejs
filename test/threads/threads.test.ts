import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Threads', function() {
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('create thread', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post('/api/v1/threads')
        .reply(200, {
          id: 'thread_mock_1',
          request_id: 't-1',
        });
    }
    const result = await api.createThread();
    ok(result);
    ok((result as { id?: string }).id || (result as { data?: { id?: string } }).data?.id);
  });
});
