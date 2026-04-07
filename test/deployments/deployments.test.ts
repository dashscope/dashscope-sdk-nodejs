import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Deployments', function() {
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('list', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get('/api/v1/deployments')
        .query({ page_no: '1', page_size: '5' })
        .reply(200, {
          data: { deployments: [{ deployed_model: 'dm-1' }] },
          request_id: 'd-1',
        });
    }
    const result = await api.listDeployments({ page_no: 1, page_size: 5 });
    ok(result !== undefined);
  });
});
