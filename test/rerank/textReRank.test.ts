import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Text ReRank', function() {
  const path = '/api/v1/services/rerank/text-rerank/text-rerank';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('call', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          output: {
            results: [
              { index: 0, relevance_score: 0.9 },
              { index: 2, relevance_score: 0.7 },
            ],
          },
          request_id: 'rr-1',
        });
    }
    const result = await api.createTextReRank({
      model: 'gte-rerank',
      query: 'What is machine learning?',
      documents: [
        'Machine learning is a branch of artificial intelligence.',
        'The weather is nice today.',
        'Deep learning is a subfield of machine learning.',
      ],
    });
    ok(result);
  });
});
