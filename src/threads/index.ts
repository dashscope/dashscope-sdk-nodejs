import BaseApi from '../common/baseApi';
import type { RequestOptions } from '../common/baseApi';
import { ThreadCreateOptions } from '../types';

class Threads extends BaseApi {

  protected service = 'threads';

  private validateThreadId(threadId: string): void {
    if (!threadId) throw new Error('thread_id is required!');
  }

  private async requestAndReturnData(config: RequestOptions): Promise<unknown> {
    const result = await this.request(config);
    return result.data;
  }

  /** Create a thread (optional seed messages / metadata). */
  async create(options: ThreadCreateOptions = {}) {
    const { messages, metadata, ...rest } = options;
    const data: Record<string, unknown> = { ...rest };
    if (messages) data.messages = messages;
    if (metadata) data.metadata = metadata;
    const result = await this.request({
      method: 'post',
      data,
    });
    return result.data;
  }

  /** Get thread by id. */
  async get(threadId: string) {
    this.validateThreadId(threadId);
    return this.requestAndReturnData({ api: threadId, method: 'get' });
  }

  /** Update thread metadata. */
  async update(threadId: string, data: Record<string, unknown>) {
    this.validateThreadId(threadId);
    return this.requestAndReturnData({ api: threadId, method: 'put', data });
  }

  /** Delete a thread. */
  async delete(threadId: string) {
    this.validateThreadId(threadId);
    return this.requestAndReturnData({ api: threadId, method: 'delete' });
  }
}

export default Threads;
