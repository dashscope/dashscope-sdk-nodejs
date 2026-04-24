import { ok, strictEqual, deepStrictEqual } from 'assert';
import nock from 'nock';
import { Readable } from 'stream';
import { Configuration, HttpSpeechSynthesizer, HttpSpeechSynthesisResult } from '../../src/index';
import { testDashscopeConfig, useLiveApi, MOCK_HTTP_ORIGIN, sseDataLines } from '../helpers/mockConfig';

describe('HTTP TTS HttpSpeechSynthesizer', function() {
  this.timeout(120000);

  afterEach(() => {
    nock.cleanAll();
  });

  describe('non-streaming mode', () => {
    it('call returns HttpSpeechSynthesisResult with audio URL', async function() {
      if (useLiveApi()) {
        const synthesizer = new HttpSpeechSynthesizer(new Configuration(testDashscopeConfig()));
        const result = await synthesizer.call({
          model: 'cosyvoice-v3-flash',
          text: 'Hello from DashScope HTTP TTS',
          voice: 'longshu',
        }) as HttpSpeechSynthesisResult;

        ok(result instanceof HttpSpeechSynthesisResult);
        ok(result.getAudioUrl() || result.getAudioData(), 'expected audio URL or data');
        return;
      }

      // Mock mode
      const scope = nock(MOCK_HTTP_ORIGIN)
        .post('/api/v1/services/audio/tts/SpeechSynthesizer')
        .reply(200, {
          request_id: 'test-request-id',
          status_code: 200,
          output: {
            audio: {
              url: 'https://example.com/audio/test.wav',
              id: 'test-audio-id',
              expires_at: 1234567890,
            },
          },
        });

      const synthesizer = new HttpSpeechSynthesizer(new Configuration(testDashscopeConfig()));
      const result = await synthesizer.call({
        model: 'cosyvoice-v3-flash',
        text: 'Hello from DashScope HTTP TTS',
        voice: 'longshu',
      }) as HttpSpeechSynthesisResult;

      ok(result instanceof HttpSpeechSynthesisResult);
      strictEqual(result.getAudioUrl(), 'https://example.com/audio/test.wav');
      strictEqual(result.getAudioId(), 'test-audio-id');
      strictEqual(result.getExpiresAt(), 1234567890);
      ok(scope.isDone());
    });

    it('validates required parameters', async function() {
      if (useLiveApi()) {
        this.skip();
        return;
      }

      const synthesizer = new HttpSpeechSynthesizer(new Configuration(testDashscopeConfig()));

      await assertRejects(
        () => synthesizer.call({ model: '', text: 'test', voice: 'longshu' } as { model: string; text: string; voice: string }),
        /model is required/
      );

      await assertRejects(
        () => synthesizer.call({ model: 'cosyvoice-v3-flash', text: '', voice: 'longshu' } as { model: string; text: string; voice: string }),
        /text is required/
      );

      await assertRejects(
        () => synthesizer.call({ model: 'cosyvoice-v3-flash', text: 'test', voice: '' } as { model: string; text: string; voice: string }),
        /voice is required/
      );
    });

    it('sends correct request body with extra parameters', async function() {
      if (useLiveApi()) {
        this.skip();
        return;
      }

      const scope = nock(MOCK_HTTP_ORIGIN)
        .post('/api/v1/services/audio/tts/SpeechSynthesizer', (body) => {
          return (
            body.model === 'cosyvoice-v3-flash' &&
            body.input.text === 'Hello' &&
            body.input.voice === 'longshu' &&
            body.input.format === 'mp3' &&
            body.input.sample_rate === 16000 &&
            body.input.volume === 50 &&
            body.input.rate === 1.0
          );
        })
        .reply(200, {
          request_id: 'test-request-id',
          status_code: 200,
          output: {
            audio: { url: 'https://example.com/audio/test.mp3' },
          },
        });

      const synthesizer = new HttpSpeechSynthesizer(new Configuration(testDashscopeConfig()));
      const result = await synthesizer.call({
        model: 'cosyvoice-v3-flash',
        text: 'Hello',
        voice: 'longshu',
        audioFormat: 'mp3',
        sampleRate: 16000,
        volume: 50,
        rate: 1.0,
      }) as HttpSpeechSynthesisResult;

      ok(result instanceof HttpSpeechSynthesisResult);
      ok(scope.isDone());
    });

    it('handles error response', async function() {
      if (useLiveApi()) {
        this.skip();
        return;
      }

      const scope = nock(MOCK_HTTP_ORIGIN)
        .post('/api/v1/services/audio/tts/SpeechSynthesizer')
        .reply(400, {
          status_code: 400,
          code: 'InvalidParameter',
          message: 'Invalid voice',
        });

      const synthesizer = new HttpSpeechSynthesizer(new Configuration(testDashscopeConfig()));

      await assertRejects(
        () => synthesizer.call({
          model: 'cosyvoice-v3-flash',
          text: 'Hello',
          voice: 'invalid-voice',
        }),
        /Request failed.*400.*InvalidParameter.*Invalid voice/
      );

      ok(scope.isDone());
    });
  });

  describe('streaming mode', () => {
    it('yields HttpSpeechSynthesisResult chunks for streaming response', async function() {
      if (useLiveApi()) {
        this.skip();
        return;
      }

      const audioData1 = Buffer.from('fake-audio-data-1');
      const audioData2 = Buffer.from('fake-audio-data-2');

      const ssePayloads = [
        {
          output: {
            type: 'sentence-begin',
            sentence: { begin_time: 0, end_time: 500, text: 'Hello' },
            audio: { data: audioData1.toString('base64') },
          },
        },
        {
          output: {
            type: 'sentence-end',
            sentence: { begin_time: 500, end_time: 1000, text: 'world' },
            audio: { data: audioData2.toString('base64') },
          },
        },
        {
          output: {
            finish_reason: 'stop',
            audio: { url: 'https://example.com/audio/stream.wav', id: 'stream-id' },
          },
        },
      ];

      const scope = nock(MOCK_HTTP_ORIGIN)
        .post('/api/v1/services/audio/tts/SpeechSynthesizer')
        .reply(200, () => {
          return Readable.from([Buffer.from(sseDataLines(ssePayloads))]);
        }, {
          'Content-Type': 'text/event-stream',
        });

      const synthesizer = new HttpSpeechSynthesizer(new Configuration(testDashscopeConfig()));
      const stream = await synthesizer.call({
        model: 'cosyvoice-v3-flash',
        text: 'Hello world',
        voice: 'longshu',
        stream: true,
      }) as AsyncGenerator<HttpSpeechSynthesisResult, void, unknown>;

      const chunks: HttpSpeechSynthesisResult[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      ok(chunks.length >= 2, 'expected at least 2 chunks');

      // Check intermediate chunks have audio data
      const chunksWithAudio = chunks.filter(c => c.getAudioData());
      ok(chunksWithAudio.length >= 1, 'expected at least one chunk with audio data');

      // Check final chunk has URL
      const finalChunk = chunks[chunks.length - 1];
      strictEqual(finalChunk.getAudioUrl(), 'https://example.com/audio/stream.wav');
      strictEqual(finalChunk.getAudioId(), 'stream-id');

      ok(scope.isDone());
    });

    it('sends SSE header for streaming mode', async function() {
      if (useLiveApi()) {
        this.skip();
        return;
      }

      const scope = nock(MOCK_HTTP_ORIGIN)
        .post('/api/v1/services/audio/tts/SpeechSynthesizer', () => true)
        .matchHeader('x-dashscope-sse', 'enable')
        .reply(200, () => {
          return Readable.from([Buffer.from(sseDataLines([{
            output: { finish_reason: 'stop', audio: {} },
          }]))]);
        }, { 'Content-Type': 'text/event-stream' });

      const synthesizer = new HttpSpeechSynthesizer(new Configuration(testDashscopeConfig()));
      const stream = await synthesizer.call({
        model: 'cosyvoice-v3-flash',
        text: 'Test',
        voice: 'longshu',
        stream: true,
      }) as AsyncGenerator<HttpSpeechSynthesisResult, void, unknown>;

      // Consume the stream
      for await (const _ of stream) { /* consume */ }

      ok(scope.isDone());
    });
  });

  describe('getters', () => {
    it('HttpSpeechSynthesisResult getters return correct values', function() {
      const audioData = Buffer.from('test-audio');
      const sentences = [{ text: 'Hello', begin_time: 0, end_time: 500 }];
      const response = { request_id: 'test-id', status_code: 200 };

      const result = new HttpSpeechSynthesisResult(
        audioData,
        'https://example.com/audio.wav',
        'audio-id-123',
        1234567890,
        sentences,
        response,
      );

      deepStrictEqual(result.getAudioData(), audioData);
      strictEqual(result.getAudioUrl(), 'https://example.com/audio.wav');
      strictEqual(result.getAudioId(), 'audio-id-123');
      strictEqual(result.getExpiresAt(), 1234567890);
      deepStrictEqual(result.getSentences(), sentences);
      deepStrictEqual(result.getResponse(), response);
    });

    it('HttpSpeechSynthesisResult handles null values', function() {
      const result = new HttpSpeechSynthesisResult();

      strictEqual(result.getAudioData(), null);
      strictEqual(result.getAudioUrl(), null);
      strictEqual(result.getAudioId(), null);
      strictEqual(result.getExpiresAt(), null);
      deepStrictEqual(result.getSentences(), []);
      strictEqual(result.getResponse(), null);
    });
  });
});

async function assertRejects(
  fn: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  try {
    await fn();
    throw new Error(`Expected function to reject with pattern ${pattern}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!pattern.test(message)) {
      throw new Error(`Expected error to match ${pattern}, but got: ${message}`);
    }
  }
}
