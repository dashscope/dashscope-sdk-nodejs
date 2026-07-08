import BaseApi from '../../common/baseApi';
import { getDashscopeUserAgent } from '../../common/userAgent';
import { MultiModalConversationOptions } from '../../types';
import { shouldModifyIncrementalOutput } from '../../utils/paramUtils';
import GenerationResult from '../generation/result';
import { parseStreamResult } from '../generation/streamUtils';

class MultiModalConversation extends BaseApi {

  protected service = 'services/aigc/multimodal-generation/generation';

  private async streamRequest(data: Record<string, unknown>, mergeIncremental: boolean, n: number) {
    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
      'X-Accel-Buffering': 'no',
      'X-DashScope-SSE': 'enable',
    };
    headers['User-Agent'] = `${getDashscopeUserAgent()}; incremental_to_full/${mergeIncremental ? '1' : '0'}`;
    const result = await this.request({
      method: 'post',
      data,
      headers,
      responseType: 'stream',
    });
    const opts = mergeIncremental ? { mergeIncremental: true, n } : {};
    return parseStreamResult(result, opts);
  }

  private async syncRequest(data: Record<string, unknown>) {
    const result = await this.request({
      method: 'post',
      data,
    });
    return new GenerationResult(result.status, result.data);
  }

  async call(options: MultiModalConversationOptions) {
    const { model, messages, stream = false, text, voice, language_type, incremental_output, n, ...rest } = options;
    if (!model) throw new Error('Model is required!');
    const input: Record<string, unknown> = {};
    if (text) input.text = text;
    if (voice) input.voice = voice;
    if (language_type) input.language_type = language_type;
    if (Array.isArray(messages) && messages.length > 0) input.messages = messages;
    const parameters: Record<string, unknown> = { ...rest };
    if (n !== undefined) parameters.n = n;

    // Check if we need to merge incremental output (aligned with Python)
    let mergeIncremental = false;
    if (stream && shouldModifyIncrementalOutput(model) && incremental_output === false) {
      mergeIncremental = true;
      parameters.incremental_output = true;
    } else if (incremental_output !== undefined) {
      parameters.incremental_output = incremental_output;
    }

    const data: Record<string, unknown> = { model, input };
    if (Object.keys(parameters).length) Object.assign(data, { parameters });
    if (stream) {
      return this.streamRequest(data, mergeIncremental, n ?? 1);
    }
    return this.syncRequest(data);
  }
}

export default MultiModalConversation;
