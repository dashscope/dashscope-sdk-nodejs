import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import Result from '../../src/aigc/generation/result';
import { MOCK_HTTP_ORIGIN, sseDataLines, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Generation', function() {

  const path = '/api/v1/services/aigc/text-generation/generation';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('single-turn completion', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          output: { text: '• Point one\n• Point two\n• Point three' },
          request_id: 'gen-req-1',
          usage: { input_tokens: 2, output_tokens: 17 },
        });
    }
    const result = await api.createGeneration({
      model: 'qwen-turbo',
      prompt: 'Write three bullet points on reducing single-use plastics in daily life.',
    });
    ok(result instanceof Result);
    ok((result.output?.text?.length ?? 0) > 0);
  });

  it('multi-turn messages', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          output: { text: 'Braise beef brisket with tomatoes: brown meat, add tomatoes and spices, simmer until tender.' },
          request_id: 'gen-req-2',
        });
    }
    const result = await api.createGeneration({
      model: 'qwen-turbo',
      messages: [
        { 'role': 'system', 'content': 'You are a helpful assistant.' },
        { 'role': 'user', 'content': 'How do I braise beef brisket with tomatoes?' },
      ],
    });
    ok(result instanceof Result);
    ok((result.output?.text?.length ?? 0) > 10);
  });

  it('multi-turn with message result_format', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          output: {
            choices: [
              {
                finish_reason: 'stop',
                message: {
                  role: 'assistant',
                  content: 'Braise beef brisket with tomatoes: sear, simmer with tomatoes, season, cook low until tender.',
                },
              },
            ],
          },
          request_id: 'gen-req-3',
        });
    }
    const result = await api.createGeneration({
      model: 'qwen-turbo',
      messages: [
        { 'role': 'system', 'content': 'You are a helpful assistant.' },
        { 'role': 'user', 'content': 'How do I braise beef brisket with tomatoes?' },
      ],
      result_format: 'message',
    });
    ok(result instanceof Result);
    ok(Array.isArray(result.output?.choices));
    ok((result.output?.choices![0].message!.content.length ?? 0) > 10);
  });

  it('streaming', async function() {
    if (!useLiveApi()) {
      const sse = sseDataLines([
        { output: { text: '• ' }, request_id: 's1' },
        { output: { text: '• a\n• b\n• c' }, request_id: 's1' },
      ]);
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, sse, { 'Content-Type': 'text/event-stream' });
    }
    const result = await api.createGeneration({
      model: 'qwen-turbo',
      prompt: 'Write three bullet points on reducing single-use plastics in daily life.',
      stream: true,
    });
    let valid = true;
    for await (const chunk of result as AsyncGenerator<Result>) {
      valid = valid && (chunk instanceof Result);
    }
    ok(valid);
  });
});
