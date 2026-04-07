import { ok } from 'assert';
import { Configuration, Recognition, TranslationRecognizer, Vocabulary, AsrPhraseManager, QwenTtsSynthesizer } from '../../../src/index';
import { testDashscopeConfig } from '../../helpers/mockConfig';

describe('ASR extended clients', function() {
  let config: Configuration;
  this.timeout(10000);

  before(() => {
    config = new Configuration(testDashscopeConfig());
  });

  it('Recognition exposes call()', () => {
    const r = new Recognition(config);
    ok(typeof r.call === 'function');
  });

  it('TranslationRecognizer exposes call()', () => {
    const t = new TranslationRecognizer(config);
    ok(typeof t.call === 'function');
  });

  it('Vocabulary exposes CRUD methods', () => {
    const v = new Vocabulary(config);
    ok(typeof v.createVocabulary === 'function');
    ok(typeof v.listVocabularies === 'function');
    ok(typeof v.queryVocabulary === 'function');
    ok(typeof v.updateVocabulary === 'function');
    ok(typeof v.deleteVocabulary === 'function');
  });

  it('AsrPhraseManager exposes CRUD methods', () => {
    const p = new AsrPhraseManager(config);
    ok(typeof p.createPhrases === 'function');
    ok(typeof p.updatePhrases === 'function');
    ok(typeof p.queryPhrases === 'function');
    ok(typeof p.listPhrases === 'function');
    ok(typeof p.deletePhrases === 'function');
  });

  it('QwenTtsSynthesizer exposes call()', () => {
    const q = new QwenTtsSynthesizer(config);
    ok(typeof q.call === 'function');
  });
});
