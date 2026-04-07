import BaseApi from '../../common/baseApi';
import { CodeGenerationOptions, MessageItem } from '../../types';
import { parseStreamResult } from '../generation/streamUtils';
import GenerationResult from '../generation/result';

class CodeGeneration extends BaseApi {

  protected service = 'services/aigc/code-generation/generation';

  async call(options: CodeGenerationOptions): Promise<GenerationResult | AsyncGenerator<GenerationResult>> {
    const { model, message, scene, stream = false, n = 1, ...rest } = options;
    if (!model) throw new Error('Model is required!');
    if (!scene || message == null || (Array.isArray(message) && message.length === 0)) {
      throw new Error('scene and message is required!');
    }
    const input: { message: MessageItem[]; scene: string } = { message, scene };
    const parameters: Record<string, unknown> = { n, stream, ...rest };
    if (stream) {
      const result = await this.request({
        method: 'post',
        data: { model, input, parameters },
        headers: {
          'Accept': 'text/event-stream',
          'X-Accel-Buffering': 'no',
          'X-DashScope-SSE': 'enable',
        },
        responseType: 'stream',
      });
      return parseStreamResult(result);
    }
    const result = await this.request({
      method: 'post',
      data: { model, input, parameters },
    });
    return new GenerationResult(result.status, result.data);
  }
}

export default CodeGeneration;
