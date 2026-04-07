import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Assistants', function() {
  let api: DashscopeApi;
  this.timeout(60000);

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('list', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get('/api/v1/assistants')
        .query({ page_no: '1', page_size: '5' })
        .reply(200, {
          data: { assistants: [{ id: 'asst_1' }] },
          request_id: 'asst-1',
        });
    }
    const list = await api.listAssistants({ page_no: 1, page_size: 5 });
    ok(list !== undefined);
  });
});
