import { deepStrictEqual, ok, strictEqual, throws } from 'assert';
import {
  MAAS_REGIONS,
  SUPPORTED_REGIONS,
  buildMaasBaseUrls,
  resolveBaseURL,
  validateRegion,
  validateWorkspaceId,
} from '../../src/common/region';

describe('region helpers', function() {
  it('exposes the expected MaaS regions', function() {
    deepStrictEqual(Object.keys(MAAS_REGIONS).sort(), [
      'ap-northeast-1', 'ap-southeast-1', 'cn-hongkong', 'eu-central-1', 'us-east-1',
    ]);
    ok(SUPPORTED_REGIONS.includes('cn-beijing'));
  });

  it('validateWorkspaceId accepts valid ids and rejects invalid', function() {
    strictEqual(validateWorkspaceId('ws_123-ABC'), 'ws_123-ABC');
    throws(() => validateWorkspaceId(''));
    throws(() => validateWorkspaceId('-lead'));
    throws(() => validateWorkspaceId('has/slash'));
    throws(() => validateWorkspaceId('x'.repeat(65)));
  });

  it('validateRegion checks hostname labels', function() {
    strictEqual(validateRegion('ap-southeast-1'), 'ap-southeast-1');
    throws(() => validateRegion('-bad'));
    throws(() => validateRegion('bad-'));
    throws(() => validateRegion(''));
  });

  it('resolveBaseURL substitutes the placeholder', function() {
    strictEqual(
      resolveBaseURL('https://{workspace_id}.ap-southeast-1.maas.aliyuncs.com/api/v1', 'ws1'),
      'https://ws1.ap-southeast-1.maas.aliyuncs.com/api/v1',
    );
    strictEqual(resolveBaseURL('https://dashscope.aliyuncs.com/api/v1'), 'https://dashscope.aliyuncs.com/api/v1');
    throws(() => resolveBaseURL('https://{workspace_id}.x.maas.aliyuncs.com/api/v1'));
  });

  it('buildMaasBaseUrls builds http/ws/compatible hosts', function() {
    const urls = buildMaasBaseUrls('ap-southeast-1', 'ws1');
    strictEqual(urls.http, 'https://ws1.ap-southeast-1.maas.aliyuncs.com/api/v1');
    strictEqual(urls.websocket, 'wss://ws1.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/inference');
    strictEqual(urls.compatible, 'https://ws1.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1');
  });

  it('buildMaasBaseUrls keeps placeholder when workspace omitted', function() {
    const urls = buildMaasBaseUrls('us-east-1');
    strictEqual(urls.http, 'https://{workspace_id}.us-east-1.maas.aliyuncs.com/api/v1');
  });
});
