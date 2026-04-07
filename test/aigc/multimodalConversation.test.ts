import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

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
});
