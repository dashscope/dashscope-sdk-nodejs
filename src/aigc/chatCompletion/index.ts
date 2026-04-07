import BaseApi from '../../common/baseApi';
import { ChatCompletionOptions } from '../../types';
import GenerationResult from '../generation/result';
import { parseStreamResult } from '../generation/streamUtils';

class ChatCompletion extends BaseApi {

  protected service = 'chat/completions';

  protected getRequestBasePath() {
    return this.configuration.getCompatibleBasePath();
  }

  private async streamRequest(body: Record<string, unknown>, extraHeaders?: Record<string, string>) {
    const result = await this.request({
      method: 'post',
      data: body,
      headers: {
        'Accept': 'text/event-stream',
        'X-Accel-Buffering': 'no',
        'X-DashScope-SSE': 'enable',
        ...extraHeaders,
      },
      responseType: 'stream',
    });
    return parseStreamResult(result);
  }

  private async syncRequest(body: Record<string, unknown>, extraHeaders?: Record<string, string>) {
    const result = await this.request({
      method: 'post',
      data: body,
      headers: extraHeaders,
    });
    // Normalize OpenAI-style top-level `choices` vs DashScope `output.choices`
    const resData = (result.data as Record<string, unknown>) || {};
    const normalized = 'output' in resData ? resData : { ...resData, output: { choices: resData.choices ?? [] } };
    return new GenerationResult(result.status, normalized);
  }

  async create(options: ChatCompletionOptions) {
    const { model, messages, stream = false, extra_body, extra_headers, ...rest } = options;
    const body: Record<string, unknown> = { model, messages };
    if (Object.keys(rest).length) Object.assign(body, rest);
    if (extra_body && Object.keys(extra_body).length) Object.assign(body, extra_body);
    const headers = extra_headers && Object.keys(extra_headers).length ? extra_headers : undefined;
    if (stream) {
      return this.streamRequest(body, headers);
    }
    return this.syncRequest(body, headers);
  }
}

export default ChatCompletion;
