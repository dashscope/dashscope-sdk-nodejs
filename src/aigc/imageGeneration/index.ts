import BaseApi from '../../common/baseApi';
import { getDashscopeUserAgent } from '../../common/userAgent';
import { waitForTask } from '../../common/asyncTask';
import { ImageGenerationOptions } from '../../types';
import { shouldModifyIncrementalOutput } from '../../utils/paramUtils';
import GenerationResult from '../generation/result';
import { parseStreamResult } from '../generation/streamUtils';

/** Model ids supported by ImageGeneration (aligned with Python `ImageGeneration.Models`). */
export const ImageGenerationModels = {
  WAN2_6_IMAGE: 'wan2.6-image',
  WAN2_6_T2I: 'wan2.6-t2i',
} as const;

/**
 * Image generation API based on a `messages` interface (wan2.6-image / wan2.6-t2i).
 *
 * Supports both synchronous (streaming / non-streaming) and asynchronous task modes.
 * Aligned with Python `dashscope.aigc.image_generation.ImageGeneration`.
 */
class ImageGeneration extends BaseApi {

  /** Sync service path (multimodal-generation). */
  private static SYNC_SERVICE = 'services/aigc/multimodal-generation/generation';
  /** Async service path (image-generation). */
  private static ASYNC_SERVICE = 'services/aigc/image-generation/generation';

  protected service = ImageGeneration.SYNC_SERVICE;

  /** Synchronous / streaming call. */
  async call(options: ImageGenerationOptions) {
    const { model, messages, stream = false, incremental_output, n, is_async, wait_timeout, ...rest } = options;
    if (!model) throw new Error('model is required');
    if (!messages || messages.length === 0) throw new Error('messages is required');

    const input: Record<string, unknown> = { messages };
    const parameters: Record<string, unknown> = { ...rest };

    // Incremental merge logic (aligned with Python)
    let mergeIncremental = false;
    if (stream && shouldModifyIncrementalOutput(model) && incremental_output === false) {
      mergeIncremental = true;
      parameters.incremental_output = true;
    } else if (incremental_output !== undefined) {
      parameters.incremental_output = incremental_output;
    }

    const data: Record<string, unknown> = { model, input };
    if (Object.keys(parameters).length) Object.assign(data, { parameters });

    // Async mode: create task then wait
    if (is_async) {
      return this.asyncCallAndWait(data, wait_timeout);
    }

    // Sync mode
    const headers: Record<string, string> = {};
    if (stream) {
      headers['Accept'] = 'text/event-stream';
      headers['X-Accel-Buffering'] = 'no';
      headers['X-DashScope-SSE'] = 'enable';
      headers['User-Agent'] = `${getDashscopeUserAgent()}; incremental_to_full/${mergeIncremental ? '1' : '0'}`;
      const result = await this.request({
        method: 'post',
        data,
        headers,
        responseType: 'stream',
      });
      const opts = mergeIncremental ? { mergeIncremental: true, n: (n as number) ?? 1 } : {};
      return parseStreamResult(result, opts);
    }

    const result = await this.request({ method: 'post', data, headers: undefined });
    return new GenerationResult(result.status, result.data);
  }

  /** Create an async image generation task. Returns task info with `output.task_id`. */
  async asyncCall(options: ImageGenerationOptions) {
    const { model, messages, ...rest } = options;
    if (!model) throw new Error('model is required');
    if (!messages || messages.length === 0) throw new Error('messages is required');
    const input: Record<string, unknown> = { messages };
    const parameters: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && k !== 'is_async' && k !== 'wait_timeout') parameters[k] = v;
    }
    const data: Record<string, unknown> = { model, input };
    if (Object.keys(parameters).length) Object.assign(data, { parameters });
    const result = await this.request({
      method: 'post',
      service: ImageGeneration.ASYNC_SERVICE,
      headers: { 'X-DashScope-Async': 'enable' },
      data,
    });
    return result.data;
  }

  /** Internal: send async request and wait for completion. */
  private async asyncCallAndWait(data: Record<string, unknown>, waitTimeout?: number) {
    const result = await this.request({
      method: 'post',
      service: ImageGeneration.ASYNC_SERVICE,
      headers: { 'X-DashScope-Async': 'enable' },
      data,
    });
    const createResult = result.data;
    const taskOpts = typeof waitTimeout === 'number' ? { waitTimeout } : undefined;
    return waitForTask(createResult, (taskId) => this.fetch(taskId), taskOpts);
  }

  /** Fetch task status by task id. */
  async fetch(taskId: string) {
    const result = await this.request({
      service: 'tasks',
      api: taskId,
      method: 'get',
      headers: { 'X-DashScope-Async': 'enable' },
    });
    return result.data;
  }

  /** Wait for an async task to complete, with optional `wait_timeout` (seconds). */
  async wait(taskId: string, waitTimeout?: number) {
    const taskOpts = typeof waitTimeout === 'number' ? { waitTimeout } : undefined;
    return waitForTask(
      { output: { task_id: taskId } },
      (id) => this.fetch(id),
      taskOpts,
    );
  }
}

export default ImageGeneration;
