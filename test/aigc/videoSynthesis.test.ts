import { strictEqual } from 'assert';
import nock from 'nock';
import { Configuration } from '../../src/index';
import VideoSynthesis from '../../src/aigc/videoSynthesis';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('VideoSynthesis', function() {

  let client: VideoSynthesis;

  before(function() {
    client = new VideoSynthesis(new Configuration(testDashscopeConfig()));
  });

  it('asyncCall sends reference_urls, reference_url, and media in input', async function() {
    if (useLiveApi()) {
      this.skip();
    }
    const scope = nock(MOCK_HTTP_ORIGIN)
      .post('/api/v1/services/aigc/video-generation/video-synthesis', (body: Record<string, unknown>) => {
        const input = body.input as Record<string, unknown>;
        strictEqual(input.prompt, 'hello');
        strictEqual(input.extend_prompt, true);
        strictEqual(JSON.stringify(input.reference_urls), JSON.stringify(['https://a.example/ref.png']));
        strictEqual(input.reference_url, 'https://b.example/one.png');
        strictEqual(Array.isArray(input.media), true);
        const media = input.media as Array<Record<string, string>>;
        strictEqual(media[0].url, 'https://c.example/clip.mp4');
        strictEqual(media[0].type, 'reference_video');
        return true;
      })
      .reply(200, { output: { task_id: 'task-vs-1' }, request_id: 'r1' });

    await client.asyncCall({
      model: 'wanx2.1-i2v-plus',
      prompt: 'hello',
      reference_urls: ['https://a.example/ref.png'],
      reference_url: 'https://b.example/one.png',
      media: [{ url: 'https://c.example/clip.mp4', type: 'reference_video' }],
    });
    scope.done();
  });
});
