import BaseApi from '../../common/baseApi';
import { getDashscopeUserAgent } from '../../common/userAgent';
import { GenerateOptions } from '../../types';
import { shouldModifyIncrementalOutput } from '../../utils/paramUtils';
import GenerationResult from './result';
import { parseStreamResult } from './streamUtils';

class Generation extends BaseApi {

  protected service = 'services/aigc/text-generation/generation';

  async call(options: GenerateOptions) {
    const { model, prompt, history, messages, stream = false, enable_search, plugins, incremental_output, customized_model_id, ...rest } = options;

    const { input, parameters, streamHeaders, mergeIncremental } = this.buildInputParameters(
      model, prompt, history, messages, stream, enable_search, incremental_output, customized_model_id, rest
    );

    const pluginHeader: Record<string, string> = {};
    if (plugins) pluginHeader['X-DashScope-Plugin'] = typeof plugins === 'string' ? plugins : JSON.stringify(plugins);

    const data = { model, parameters, input };

    if (stream) {
      Object.assign(streamHeaders, pluginHeader);
      const opts = mergeIncremental ? { mergeIncremental: true, n: (parameters.n as number) ?? 1 } : {};
      const gen = parseStreamResult(
        await this.request({
          method: 'post',
          data,
          headers: {
            'Accept': 'text/event-stream',
            'X-Accel-Buffering': 'no',
            'X-DashScope-SSE': 'enable',
            ...streamHeaders,
          },
          responseType: 'stream',
        }),
        opts
      );
      return gen;
    }
    return await this.syncRequest(data, Object.keys(pluginHeader).length ? pluginHeader : undefined);
  }

  private async syncRequest(data: Record<string, unknown>, extraHeaders?: Record<string, string>) {
    const result = await this.request({
      method: 'post',
      data,
      headers: extraHeaders && Object.keys(extraHeaders).length ? extraHeaders : undefined,
    });
    return new GenerationResult(result.status, result.data);
  }

  private buildInputParameters(
    model: string,
    prompt: string | undefined,
    history: GenerateOptions['history'],
    messages: GenerateOptions['messages'],
    stream: boolean,
    enable_search: boolean | undefined,
    incremental_output: boolean | undefined,
    customized_model_id: string | undefined,
    rest: Record<string, unknown>
  ) {
    const parameters: Record<string, unknown> = { ...rest };
    const streamHeaders: Record<string, string> = {};

    let input: Record<string, unknown>;
    if (history) {
      input = { history };
      if (prompt) input.prompt = prompt;
    } else if (messages) {
      const msgs = messages.map(m => ({ ...m }));
      if (prompt) msgs.push({ role: 'user' as const, content: prompt });
      input = { messages: msgs };
    } else {
      input = { prompt: prompt ?? '' };
    }

    if (model.toLowerCase().startsWith('qwen')) {
      if (enable_search) parameters.enable_search = enable_search;
    } else if (model.toLowerCase().startsWith('bailian')) {
      if (customized_model_id === null || customized_model_id === undefined) {
        throw new Error(`customized_model_id is required for ${model}`);
      }
      input.customized_model_id = customized_model_id;
    }

    let mergeIncremental = false;
    if (stream && shouldModifyIncrementalOutput(model) && incremental_output === false) {
      mergeIncremental = true;
      parameters.incremental_output = true;
    }
    if (stream) {
      streamHeaders['User-Agent'] = `${getDashscopeUserAgent()}; incremental_to_full/${mergeIncremental ? '1' : '0'}`;
    }

    return { input, parameters, streamHeaders, mergeIncremental };
  }
}

export default Generation;
