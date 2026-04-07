import BaseApi, { RequestOptions } from '../common/baseApi';
import { MessageCreateOptions, MessageListOptions } from '../types';

class Messages extends BaseApi {

  private validateThreadId(threadId: string): void {
    if (!threadId) throw new Error('thread_id is required!');
  }

  private validateMessageId(messageId: string): void {
    if (!messageId) throw new Error('message_id is required!');
  }

  private async requestAndReturnData(config: RequestOptions) {
    const result = await this.request(config);
    return result.data;
  }

  async create(threadId: string, options: MessageCreateOptions) {
    this.validateThreadId(threadId);
    return this.requestAndReturnData({
      service: `threads/${threadId}/messages`,
      method: 'post',
      data: options,
    });
  }

  async list(threadId: string, options?: MessageListOptions) {
    this.validateThreadId(threadId);
    return this.requestAndReturnData({
      service: `threads/${threadId}/messages`,
      method: 'get',
      params: options,
    });
  }

  async get(threadId: string, messageId: string) {
    this.validateThreadId(threadId);
    this.validateMessageId(messageId);
    return this.requestAndReturnData({
      service: `threads/${threadId}/messages/${messageId}`,
      method: 'get',
    });
  }
}

export default Messages;
