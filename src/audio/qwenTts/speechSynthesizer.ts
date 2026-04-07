/**
 * Qwen TTS via HTTP `aigc/multimodal-generation` (not WebSocket).
 */
import BaseApi from '../../common/baseApi';
import { AxiosResponse } from 'axios';

export interface QwenTtsParameters {
  format?: string;
  rate?: number;
  volume?: number;
  pitch?: number;
  [key: string]: unknown;
}

export interface QwenTtsOptions {
  model: string;
  text: string;
  voice?: string;
  stream?: boolean;
  parameters?: QwenTtsParameters;
  [key: string]: unknown;
}

class QwenTtsSynthesizer extends BaseApi {
  protected service = 'services/aigc/multimodal-generation/generation';

  async call(options: QwenTtsOptions) {
    const { model, text, voice, stream = false, parameters, ...rest } = options;
    if (!text) throw new Error('text is required!');
    if (!model) throw new Error('model is required!');

    const input: Record<string, unknown> = { text };
    if (voice) input.voice = voice;

    const headers: Record<string, string> = stream
      ? { 'Accept': 'text/event-stream', 'X-Accel-Buffering': 'no', 'X-DashScope-SSE': 'enable' }
      : {};

    const requestParameters: Record<string, unknown> = { ...rest };
    if (parameters) {
      Object.assign(requestParameters, parameters);
    }

    const result = await this.request({
      method: 'post',
      data: {
        model,
        input,
        parameters: requestParameters,
      },
      headers,
      responseType: stream ? 'stream' : 'json',
    });

    if (stream) {
      return this.parseStreamResult(result);
    }
    return result.data;
  }

  /** Parse SSE chunks: buffer across TCP chunks; events separated by blank lines. */
  private async * parseStreamResult(response: AxiosResponse) {
    const { status, data } = response;
    if (status === 0) {
      yield { status_code: 0, output: null };
      return;
    }
    let buffer = '';
    for await (const chunk of data) {
      const chunkStr = chunk.toString('utf-8').trim();
      if (!chunkStr) continue;
      buffer = chunkStr.startsWith('id:') ? chunkStr : buffer + chunkStr;
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const block of lines) {
        if (block.includes('data:')) {
          const m = block.match(/data:\s*(.+)/);
          if (m) {
            try {
              const parsed = JSON.parse(m[1].trim());
              yield parsed;
            } catch (error) {
              console.error('Failed to parse SSE data:', m[1], error);
              yield { status_code: -1, code: 'ParseError', message: 'Failed to parse SSE data', output: null };
            }
          }
        }
      }
    }
  }
}

export default QwenTtsSynthesizer;
