import { ConfigurationOptions } from './types';
import {
  buildMaasBaseUrls,
  MAAS_REGIONS,
  resolveBaseURL,
  SUPPORTED_REGIONS,
} from './common/region';

const DASHSCOPE_API_KEY_ENV = 'DASHSCOPE_API_KEY';
const DASHSCOPE_HTTP_BASE_URL_ENV = 'DASHSCOPE_HTTP_BASE_URL';
const DASHSCOPE_WEBSOCKET_BASE_URL_ENV = 'DASHSCOPE_WEBSOCKET_BASE_URL';
const DASHSCOPE_API_REGION_ENV = 'DASHSCOPE_API_REGION';
const DASHSCOPE_WORKSPACE_ID_ENV = 'DASHSCOPE_WORKSPACE_ID';
const DEFAULT_BASE_PATH = 'https://dashscope.aliyuncs.com/api/v1';
const DEFAULT_WEBSOCKET_BASE_PATH = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';
const DEFAULT_COMPATIBLE_MODE_PATH = '/compatible-mode/v1';

class Configuration {

  private apiKey: string;
  private basePath: string;
  private workspace?: string;
  private webSocketBasePath: string;
  private region?: string;

  constructor(options: ConfigurationOptions) {
    this.apiKey = (options.apiKey || process.env[DASHSCOPE_API_KEY_ENV] || '').trim();
    if (this.apiKey === '') {
      throw new Error('apiKey is required, or set DASHSCOPE_API_KEY environment variable');
    }

    this.workspace = options.workspace || process.env[DASHSCOPE_WORKSPACE_ID_ENV] || undefined;

    // An explicit `region` option mirrors Python `set_region()` and forces the
    // MaaS endpoint (including cn-beijing); the env region only does so for the
    // non-default MaaS regions.
    const envRegion = process.env[DASHSCOPE_API_REGION_ENV];
    this.region = options.region || envRegion || undefined;
    const maasRegion = options.region
      ? this.assertSupportedRegion(options.region)
      : (this.region && MAAS_REGIONS[this.region] ? this.region : undefined);

    const envHttpBase = process.env[DASHSCOPE_HTTP_BASE_URL_ENV];
    const envWsBase = process.env[DASHSCOPE_WEBSOCKET_BASE_URL_ENV];

    if (options.basePath) {
      this.basePath = options.basePath;
    } else if (envHttpBase) {
      this.basePath = envHttpBase;
    } else if (maasRegion) {
      this.basePath = buildMaasBaseUrls(maasRegion, this.workspace).http;
    } else {
      this.basePath = DEFAULT_BASE_PATH;
    }

    if (options.webSocketBasePath) {
      this.webSocketBasePath = options.webSocketBasePath;
    } else if (envWsBase) {
      this.webSocketBasePath = envWsBase;
    } else if (maasRegion) {
      this.webSocketBasePath = buildMaasBaseUrls(maasRegion, this.workspace).websocket;
    } else {
      this.webSocketBasePath = DEFAULT_WEBSOCKET_BASE_PATH;
    }
  }

  private assertSupportedRegion(region: string): string {
    if (!SUPPORTED_REGIONS.includes(region)) {
      throw new Error(
        `Unsupported region '${region}'. Supported regions: ${[...SUPPORTED_REGIONS].sort().join(', ')}`,
      );
    }
    return region;
  }

  /** WebSocket base URL (TTS, etc.). Override with `DASHSCOPE_WEBSOCKET_BASE_URL`. */
  getWebSocketBasePath(): string {
    return resolveBaseURL(this.webSocketBasePath, this.workspace);
  }

  /**
   * WebSocket base URL for realtime APIs (e.g. Qwen Omni Realtime), derived from
   * the inference WebSocket base by swapping the trailing `inference` for `realtime`.
   */
  getRealtimeBasePath(): string {
    const wsBase = this.getWebSocketBasePath();
    return wsBase.replace(/\/inference\/?$/, '/realtime');
  }

  getApiKey(): string {
    return this.apiKey;
  }

  getBasePath(): string {
    return resolveBaseURL(this.basePath, this.workspace);
  }

  getWorkspace(): string | undefined {
    return this.workspace;
  }

  /** The resolved MaaS region, if any. */
  getRegion(): string | undefined {
    return this.region;
  }

  /** OpenAI-compatible HTTP base path for chat completions. */
  getCompatibleBasePath(): string {
    const basePath = this.getBasePath();
    const regex = /\/api\/v\d+$/;
    if (!regex.test(basePath)) {
      throw new Error(`Cannot generate compatible base path from '${basePath}'. Please ensure it matches the pattern '/api/v{version}'`);
    }
    return basePath.replace(regex, DEFAULT_COMPATIBLE_MODE_PATH);
  }
}

export default Configuration;
