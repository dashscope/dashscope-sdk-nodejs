import { deepStrictEqual, ok, strictEqual, throws } from 'assert';
import {
  Configuration,
  OmniRealtimeConversation,
  AudioFormatConfig,
  MultiModality,
  AudioFormat,
} from '../../src/index';
import { testDashscopeConfig } from '../helpers/mockConfig';
import { MockWsServer, startMockWsServer } from '../helpers/wsServer';

/** Poll until `cond()` is true or timeout (ms) elapses. */
async function waitFor(cond: () => boolean, timeout = 2000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timed out');
    }
    await new Promise((r) => setTimeout(r, 10));
  }
}

function makeConfig(): Configuration {
  return new Configuration(testDashscopeConfig());
}

describe('OmniRealtimeConversation (qwen_omni)', function() {
  this.timeout(10000);
  let server: MockWsServer;

  before(async () => {
    server = await startMockWsServer();
  });

  after(async () => {
    await server.close();
  });

  it('AudioFormatConfig.toDict merges extraParams last', function() {
    const cfg = new AudioFormatConfig({ type: 'wav', sampleRate: 24000, extraParams: { speech_rate: 1.2 } });
    deepStrictEqual(cfg.toDict(), { type: 'wav', sample_rate: 24000, speech_rate: 1.2 });
    const def = new AudioFormatConfig();
    deepStrictEqual(def.toDict(), { type: 'pcm', sample_rate: 16000 });
  });

  it('requires model and callback', function() {
    throws(() => new OmniRealtimeConversation(makeConfig(), { model: '', callback: { onEvent: () => undefined } }));
    throws(() => new OmniRealtimeConversation(makeConfig(), { model: 'qwen-omni' } as never));
  });

  it('throws when sending before connect', function() {
    const conv = new OmniRealtimeConversation(makeConfig(), { model: 'qwen-omni', callback: { onEvent: () => undefined } });
    throws(() => conv.appendAudio('aaa'));
  });

  it('connects, sends session.update (old-style), audio frames, and tracks session id', async function() {
    const events: Record<string, unknown>[] = [];
    let opened = false;
    const conv = new OmniRealtimeConversation(makeConfig(), {
      model: 'qwen-omni-turbo',
      url: server.url,
      callback: {
        onOpen: () => { opened = true; },
        onEvent: (e) => events.push(e),
      },
    });

    server.received.length = 0;
    await conv.connect();
    ok(opened, 'onOpen should fire');

    // Server pushes session.created
    server.send({ type: 'session.created', session: { id: 'sess-123' } });
    await waitFor(() => events.some((e) => e.type === 'session.created'));
    strictEqual(conv.getSessionId(), 'sess-123');

    conv.updateSession({
      outputModalities: [MultiModality.TEXT, MultiModality.AUDIO],
      voice: 'Cherry',
      inputAudioFormat: AudioFormat.PCM_16000HZ_MONO_16BIT,
      outputAudioFormat: AudioFormat.PCM_24000HZ_MONO_16BIT,
    });
    await waitFor(() => server.received.some((m) => m.type === 'session.update'));
    const update = server.received.find((m) => m.type === 'session.update')!;
    const session = update.session as Record<string, unknown>;
    deepStrictEqual(session.modalities, ['text', 'audio']);
    strictEqual(session.voice, 'Cherry');
    strictEqual(session.input_audio_format, 'pcm16');
    strictEqual(session.output_audio_format, 'pcm16');
    ok(session.turn_detection, 'turn_detection should default on');

    conv.appendAudio('BASE64AUDIO');
    conv.commit();
    conv.createResponse('say hi', [MultiModality.AUDIO]);
    await waitFor(() => server.received.some((m) => m.type === 'response.create'));
    ok(server.received.some((m) => m.type === 'input_audio_buffer.append'));
    ok(server.received.some((m) => m.type === 'input_audio_buffer.commit'));
    const resp = server.received.find((m) => m.type === 'response.create')!;
    deepStrictEqual((resp.response as Record<string, unknown>).modalities, ['audio']);

    conv.close();
  });

  it('updateSession emits new-style audio structure when audio config provided', async function() {
    const conv = new OmniRealtimeConversation(makeConfig(), {
      model: 'qwen-omni-turbo',
      url: server.url,
      callback: { onEvent: () => undefined },
    });
    server.received.length = 0;
    await conv.connect();
    conv.updateSession({
      outputModalities: [MultiModality.AUDIO],
      inputAudioConfig: new AudioFormatConfig({ type: 'pcm', sampleRate: 16000 }),
      outputAudioConfig: new AudioFormatConfig({ type: 'wav', sampleRate: 24000 }),
    });
    await waitFor(() => server.received.some((m) => m.type === 'session.update'));
    const update = server.received.find((m) => m.type === 'session.update')!;
    const session = update.session as Record<string, unknown>;
    const audio = session.audio as Record<string, unknown>;
    deepStrictEqual((audio.input as Record<string, unknown>).format, { type: 'pcm', sample_rate: 16000 });
    deepStrictEqual((audio.output as Record<string, unknown>).format, { type: 'wav', sample_rate: 24000 });
    strictEqual(session.input_audio_format, undefined, 'legacy field must be absent in new-style');
    conv.close();
  });
});
