import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Code Generation', function() {
  const path = '/api/v1/services/aigc/code-generation/generation';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('call', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          output: { text: 'console.log("hello world");' },
          request_id: 'code-1',
        });
    }
    const result = await api.createCodeGeneration({
      model: 'tongyi-lingma-v1',
      message: [{ role: 'user', content: 'Write a minimal hello world in JavaScript.' }],
      scene: 'nl2code',
    });
    ok(result);
    ok((result as { output?: { text?: string } }).output?.text?.includes('hello'));
  });
});
