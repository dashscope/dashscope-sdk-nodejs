import { ok, throws } from 'assert';
import { Configuration } from '../src/index';

describe('Configuration', function() {

  it('accepts explicit apiKey and basePath', function() {
    const config = new Configuration({
      apiKey: 'test-key',
      basePath: 'https://custom.com/api/v1',
    });
    ok(config.getApiKey() === 'test-key');
    ok(config.getBasePath() === 'https://custom.com/api/v1');
    ok(config.getWorkspace() === undefined);
  });

  it('getCompatibleBasePath returns compatible-mode path', function() {
    const config = new Configuration({
      apiKey: 'test-key',
      basePath: 'https://dashscope.aliyuncs.com/api/v1',
    });
    ok(config.getCompatibleBasePath() === 'https://dashscope.aliyuncs.com/compatible-mode/v1');
  });

  it('workspace is optional', function() {
    const config = new Configuration({
      apiKey: 'test-key',
      workspace: 'ws-123',
    });
    ok(config.getWorkspace() === 'ws-123');
  });

  it('throws when apiKey is missing from options and environment', function() {
    const prev = process.env.DASHSCOPE_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    try {
      throws(() => new Configuration({}));
      throws(() => new Configuration({ apiKey: '' }));
    } finally {
      if (prev !== undefined) process.env.DASHSCOPE_API_KEY = prev;
    }
  });
});
