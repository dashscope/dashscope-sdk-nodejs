import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import Result from '../../src/aigc/generation/result';
import { getDashscopeUserAgent } from '../../src/common/userAgent';
import { MOCK_HTTP_ORIGIN, sseDataLines, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('MultiModal Conversation', function() {
  const path = '/api/v1/services/aigc/multimodal-generation/generation';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('call', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          output: { text: 'The image shows a dog and a person outdoors.' },
          request_id: 'mm-1',
        });
    }
    const result = await api.createMultiModalConversation({
      model: 'qwen-vl-chat-v1',
      messages: [
        {
          role: 'user',
          content: [
            { text: 'Describe this image briefly.' },
            { image: 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg' },
          ],
        },
      ],
    });
    ok(result);
    ok((result as { output?: { text?: string } }).output?.text?.length);
  });

  it('streaming with incremental_output=false sends merge flag', async function() {
    if (useLiveApi()) {
      this.skip();
    }
    const sse = sseDataLines([
      { output: { text: 'hel' }, request_id: 'mm-2' },
      { output: { text: 'lo' }, request_id: 'mm-2' },
    ]);
    let capturedUA = '';
    nock(MOCK_HTTP_ORIGIN)
      .post(path)
      .reply(200, sse, { 'Content-Type': 'text/event-stream' })
      .on('request', (req) => {
        capturedUA = req.headers['user-agent'] as string;
      });
    const result = await api.createMultiModalConversation({
      model: 'qwen-vl-max',
      messages: [{ role: 'user', content: 'describe' }],
      stream: true,
      incremental_output: false,
    });
    let valid = true;
    for await (const chunk of result as AsyncGenerator<Result>) {
      valid = valid && (chunk instanceof Result);
    }
    ok(valid);
    // Should include SDK UA + incremental_to_full/1 flag
    ok(capturedUA.includes(getDashscopeUserAgent()));
    ok(capturedUA.includes('incremental_to_full/1'));
  });

  it('merges pass_through_params into parameters and sends sdk headers', async function() {
    if (useLiveApi()) {
      this.skip();
    }
    let capturedSdkClient = '';
    nock(MOCK_HTTP_ORIGIN)
      .post(path, (body: Record<string, unknown>) => {
        const parameters = body.parameters as Record<string, unknown>;
        ok(parameters.foo === 'bar');
        ok(parameters.baz === 42);
        return true;
      })
      .reply(200, { output: { text: 'ok' }, request_id: 'mm-3' })
      .on('request', (req) => {
        capturedSdkClient = req.headers['x-dashscope-sdk-client'] as string;
      });
    await api.createMultiModalConversation({
      model: 'qwen-vl-max',
      messages: [{ role: 'user', content: 'describe' }],
      pass_through_params: { foo: 'bar', baz: 42 },
    });
    ok(capturedSdkClient && capturedSdkClient.startsWith('node-sdk/'));
    ok(capturedSdkClient.endsWith('/aigc'));
  });
});
