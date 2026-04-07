import { ConfigurationOptions } from './types';

const DASHSCOPE_API_KEY_ENV = 'DASHSCOPE_API_KEY';
const DASHSCOPE_HTTP_BASE_URL_ENV = 'DASHSCOPE_HTTP_BASE_URL';
const DASHSCOPE_WEBSOCKET_BASE_URL_ENV = 'DASHSCOPE_WEBSOCKET_BASE_URL';
const DEFAULT_BASE_PATH = 'https://dashscope.aliyuncs.com/api/v1';
const DEFAULT_WEBSOCKET_BASE_PATH = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';
const DEFAULT_COMPATIBLE_MODE_PATH = '/compatible-mode/v1';

class Configuration {

  private apiKey: string;
  private basePath: string;
  private workspace?: string;
  private webSocketBasePath: string;

  constructor(options: ConfigurationOptions) {
    this.apiKey = (options.apiKey || process.env[DASHSCOPE_API_KEY_ENV] || '').trim();
    if (this.apiKey === '') {
      throw new Error('apiKey is required, or set DASHSCOPE_API_KEY environment variable');
    }
    this.basePath = options.basePath || process.env[DASHSCOPE_HTTP_BASE_URL_ENV] || DEFAULT_BASE_PATH;
    this.workspace = options.workspace;
    this.webSocketBasePath = options.webSocketBasePath || process.env[DASHSCOPE_WEBSOCKET_BASE_URL_ENV] || DEFAULT_WEBSOCKET_BASE_PATH;
  }

  /** WebSocket base URL (TTS, etc.). Override with `DASHSCOPE_WEBSOCKET_BASE_URL`. */
  getWebSocketBasePath(): string {
    return this.webSocketBasePath;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  getBasePath(): string {
    return this.basePath;
  }

  getWorkspace(): string | undefined {
    return this.workspace;
  }

  /** OpenAI-compatible HTTP base path for chat completions. */
  getCompatibleBasePath(): string {
    const regex = /\/api\/v\d+$/;
    if (!regex.test(this.basePath)) {
      throw new Error(`Cannot generate compatible base path from '${this.basePath}'. Please ensure it matches the pattern '/api/v{version}'`);
    }
    return this.basePath.replace(regex, DEFAULT_COMPATIBLE_MODE_PATH);
  }
}

export default Configuration;
