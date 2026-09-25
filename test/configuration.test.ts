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

  it('explicit region + workspace resolves MaaS base URLs', function() {
    const config = new Configuration({
      apiKey: 'test-key',
      region: 'ap-southeast-1',
      workspace: 'ws1',
    });
    ok(config.getBasePath() === 'https://ws1.ap-southeast-1.maas.aliyuncs.com/api/v1');
    ok(config.getWebSocketBasePath() === 'wss://ws1.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/inference');
    ok(config.getCompatibleBasePath() === 'https://ws1.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1');
    ok(config.getRegion() === 'ap-southeast-1');
  });

  it('getRealtimeBasePath swaps inference for realtime', function() {
    const config = new Configuration({ apiKey: 'test-key', region: 'us-east-1', workspace: 'ws2' });
    ok(config.getRealtimeBasePath() === 'wss://ws2.us-east-1.maas.aliyuncs.com/api-ws/v1/realtime');
    const legacy = new Configuration({ apiKey: 'test-key' });
    ok(legacy.getRealtimeBasePath() === 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime');
  });

  it('explicit region without workspace leaves placeholder and throws on resolve', function() {
    const config = new Configuration({ apiKey: 'test-key', region: 'eu-central-1' });
    throws(() => config.getBasePath());
  });

  it('rejects an unsupported explicit region', function() {
    throws(() => new Configuration({ apiKey: 'test-key', region: 'mars-1', workspace: 'ws1' }));
  });

  it('cn-beijing via explicit region uses MaaS, via env stays legacy', function() {
    const explicit = new Configuration({ apiKey: 'test-key', region: 'cn-beijing', workspace: 'ws3' });
    ok(explicit.getBasePath() === 'https://ws3.cn-beijing.maas.aliyuncs.com/api/v1');

    const prevRegion = process.env.DASHSCOPE_API_REGION;
    process.env.DASHSCOPE_API_REGION = 'cn-beijing';
    try {
      const fromEnv = new Configuration({ apiKey: 'test-key' });
      ok(fromEnv.getBasePath() === 'https://dashscope.aliyuncs.com/api/v1');
    } finally {
      if (prevRegion !== undefined) process.env.DASHSCOPE_API_REGION = prevRegion;
      else delete process.env.DASHSCOPE_API_REGION;
    }
  });

  it('reads region and workspace from environment', function() {
    const prevRegion = process.env.DASHSCOPE_API_REGION;
    const prevWs = process.env.DASHSCOPE_WORKSPACE_ID;
    process.env.DASHSCOPE_API_REGION = 'ap-southeast-1';
    process.env.DASHSCOPE_WORKSPACE_ID = 'envws';
    try {
      const config = new Configuration({ apiKey: 'test-key' });
      ok(config.getBasePath() === 'https://envws.ap-southeast-1.maas.aliyuncs.com/api/v1');
      ok(config.getWorkspace() === 'envws');
    } finally {
      if (prevRegion !== undefined) process.env.DASHSCOPE_API_REGION = prevRegion; else delete process.env.DASHSCOPE_API_REGION;
      if (prevWs !== undefined) process.env.DASHSCOPE_WORKSPACE_ID = prevWs; else delete process.env.DASHSCOPE_WORKSPACE_ID;
    }
  });

  it('explicit basePath wins over region', function() {
    const config = new Configuration({
      apiKey: 'test-key',
      region: 'ap-southeast-1',
      workspace: 'ws1',
      basePath: 'https://custom.com/api/v1',
    });
    ok(config.getBasePath() === 'https://custom.com/api/v1');
  });
});
