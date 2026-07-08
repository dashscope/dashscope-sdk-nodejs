import BaseApi from '../../common/baseApi';
import { waitForTask } from '../../common/asyncTask';
import { BatchTextEmbeddingOptions } from '../../types';

class BatchTextEmbedding extends BaseApi {

  protected service = 'services/embeddings/text-embedding/text-embedding-async';

  async asyncCall(options: BatchTextEmbeddingOptions) {
    const { model, url, text_type, ...rest } = options;
    if (!url) {
      throw new Error('url parameter is required');
    }
    const parameters = text_type !== undefined ? { ...rest, text_type } : rest;
    const result = await this.request({
      method: 'post',
      headers: { 'X-DashScope-Async': 'enable' },
      data: {
        model,
        input: { url },
        ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
      },
    });
    return result.data;
  }

  async fetch(taskId: string) {
    const result = await this.request({
      service: 'tasks',
      api: taskId,
      method: 'get',
      headers: { 'X-DashScope-Async': 'enable' },
    });
    return result.data;
  }

  async call(options: BatchTextEmbeddingOptions) {
    const { wait_timeout, ...callOptions } = options;
    const createResult = await this.asyncCall(callOptions);
    const taskOpts = typeof wait_timeout === 'number' ? { waitTimeout: wait_timeout } : undefined;
    return waitForTask(createResult, (taskId) => this.fetch(taskId), taskOpts);
  }
}

export default BatchTextEmbedding;
