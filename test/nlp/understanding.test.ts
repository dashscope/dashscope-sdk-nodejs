import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Understanding (NLU)', function() {
  const path = '/api/v1/nlp/nlu/understanding';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('call', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          output: { labels: [{ name: 'weather', value: 'query' }] },
          request_id: 'nlu-1',
        });
    }
    const result = await api.createUnderstanding({
      model: 'opennlu-v1',
      sentence: 'What is the weather like in Beijing today?',
      labels: 'time,location,weather',
      task: 'extraction',
    });
    ok(result);
  });
});
