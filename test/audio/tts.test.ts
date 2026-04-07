import { ok } from 'assert';
import { Configuration, SpeechSynthesizer, SpeechSynthesisResult } from '../../src/index';
import { testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('TTS SpeechSynthesizer', function() {
  this.timeout(120000);

  it('call returns SpeechSynthesisResult with audio bytes', async function() {
    if (!useLiveApi()) {
      this.skip();
    }
    const synthesizer = new SpeechSynthesizer(new Configuration(testDashscopeConfig()));
    const result: SpeechSynthesisResult = await synthesizer.call({
      model: 'cosyvoice-v1',
      text: 'Hello from DashScope',
      format: 'wav',
    });
    ok(result instanceof SpeechSynthesisResult);
    const audio = result.getAudioData();
    ok(audio && audio.length > 0, 'expected audio payload');
    ok(result.getResponse(), 'expected response envelope');
  });
});
