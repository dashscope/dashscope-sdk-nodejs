import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import Result from '../../src/aigc/generation/result';
import { MOCK_HTTP_ORIGIN, sseDataLines, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Chat Completion', function() {

  const path = '/compatible-mode/v1/chat/completions';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('sync call', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          choices: [
            {
              message: { role: 'assistant', content: 'Hello — here is one short sentence.' },
              finish_reason: 'stop',
            },
          ],
          request_id: 'cc-1',
        });
    }
    const result = await api.createChatCompletion({
      model: 'qwen-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, reply in one short sentence.' },
      ],
    });
    ok(result instanceof Result);
    ok(result.output?.text || (result.output?.choices && result.output.choices.length > 0));
  });

  it('streaming call', async function() {
    if (!useLiveApi()) {
      const sse = sseDataLines([
        { output: { choices: [{ message: { role: 'assistant', content: 'Hi' } }] } },
        { output: { choices: [{ message: { role: 'assistant', content: 'word' } }] } },
      ]);
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, sse, { 'Content-Type': 'text/event-stream' });
    }
    const result = await api.createChatCompletion({
      model: 'qwen-turbo',
      messages: [{ role: 'user', content: 'Say exactly one word.' }],
      stream: true,
    });
    let valid = true;
    for await (const chunk of result as AsyncGenerator<Result>) {
      valid = valid && (chunk instanceof Result);
    }
    ok(valid);
  });
});
