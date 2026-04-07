import BaseApi from '../../common/baseApi';
import { MultiModalConversationOptions } from '../../types';
import GenerationResult from '../generation/result';
import { parseStreamResult } from '../generation/streamUtils';

class MultiModalConversation extends BaseApi {

  protected service = 'services/aigc/multimodal-generation/generation';

  private async streamRequest(data: Record<string, unknown>) {
    const result = await this.request({
      method: 'post',
      data,
      headers: {
        'Accept': 'text/event-stream',
        'X-Accel-Buffering': 'no',
        'X-DashScope-SSE': 'enable',
      },
      responseType: 'stream',
    });
    return parseStreamResult(result);
  }

  private async syncRequest(data: Record<string, unknown>) {
    const result = await this.request({
      method: 'post',
      data,
    });
    return new GenerationResult(result.status, result.data);
  }

  async call(options: MultiModalConversationOptions) {
    const { model, messages, stream = false, text, voice, language_type, ...rest } = options;
    if (!model) throw new Error('Model is required!');
    const input: Record<string, unknown> = {};
    if (text) input.text = text;
    if (voice) input.voice = voice;
    if (language_type) input.language_type = language_type;
    if (Array.isArray(messages) && messages.length > 0) input.messages = messages;
    const data: Record<string, unknown> = { model, input };
    if (Object.keys(rest).length) Object.assign(data, { parameters: rest });
    if (stream) {
      return this.streamRequest(data);
    }
    return this.syncRequest(data);
  }
}

export default MultiModalConversation;
