import axios, { AxiosResponse } from 'axios';
import Configuration from '../configuration';
import { DEFAULT_TIMEOUT_MS } from './consts';
import { getSdkHeaders } from './sdkHeaders';
import { getDashscopeUserAgent } from './userAgent';

export interface RequestOptions {
  method?: 'get' | 'post' | 'put' | 'delete';
  api?: string;
  service?: string;
  data?: unknown;
  /** Query string parameters (plain object or URLSearchParams). */
  params?: object | URLSearchParams;
  headers?: Record<string, string>;
  responseType?: 'json' | 'arraybuffer' | 'blob' | 'document' | 'text' | 'stream';
  timeout?: number;
  request_timeout?: number;
  /** Per-request workspace header override. */
  workspace?: string;
  /** SDK module tag for the `x-dashscope-sdk-client` header (overrides the class default). */
  sdkModule?: string;
}

class BaseApi {

  protected configuration: Configuration;
  protected service: string = '';
  /** SDK module tag (aligned with Python top-level package, e.g. `aigc`, `audio`). */
  protected sdkModule: string = '';

  constructor(configuration: Configuration) {
    this.configuration = configuration;
  }

  /** Subclasses may override to use another HTTP base (e.g. OpenAI-compatible path). */
  protected getRequestBasePath(): string {
    return this.configuration.getBasePath();
  }

  protected async request(options: RequestOptions) {
    const basePath = this.getRequestBasePath();
    const apiKey = this.configuration.getApiKey();
    const workspace = options.workspace ?? this.configuration.getWorkspace();
    const {
      headers = {},
      api,
      service,
      timeout = DEFAULT_TIMEOUT_MS,
      request_timeout,
      method,
      data,
      params,
      responseType,
    } = options;
    const urlParts = [basePath, service || this.service];
    if (api) {
      urlParts.push(api);
    }
    const finalTimeout = request_timeout ?? timeout;
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': getDashscopeUserAgent(),
      ...getSdkHeaders(options.sdkModule ?? this.sdkModule),
      ...headers,
    };
    if (workspace) {
      requestHeaders['X-DashScope-WorkSpace'] = workspace;
    }
    const axiosOptions = {
      method: method || 'post',
      url: urlParts.join('/'),
      headers: requestHeaders,
      timeout: finalTimeout,
      validateStatus: () => true,
      data,
      params,
      responseType,
    };
    try {
      const result: AxiosResponse = await axios(axiosOptions);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 0,
        data: {
          code: 'NetworkError',
          message: errorMessage,
        },
      } as AxiosResponse;
    }
  }
}

export default BaseApi;
