import BaseApi from '../common/baseApi';
import { DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE } from '../common/consts';
import { AssistantCreateOptions, ListOptions } from '../types';

class Assistants extends BaseApi {

  protected service = 'assistants';

  /** Create an assistant (model, tools, files, etc.). */
  async call(options: AssistantCreateOptions) {
    const { model, name, description, instructions, tools, file_ids = [], ...rest } = options;
    if (!model) throw new Error('Model is required!');
    const data: Record<string, unknown> = { model, file_ids, ...rest };
    if (name) data.name = name;
    if (description) data.description = description;
    if (instructions) data.instructions = instructions;
    if (tools) data.tools = tools;
    const result = await this.request({
      method: 'post',
      data,
    });
    return result.data;
  }

  /** List assistants. */
  async list(options: ListOptions = {}) {
    const { page_no = DEFAULT_PAGE_NO, page_size = DEFAULT_PAGE_SIZE, ...rest } = options;
    const params: Record<string, unknown> = { page_no, page_size, ...rest };
    const result = await this.request({
      method: 'get',
      params,
    });
    return result.data;
  }

  private validateAssistantId(assistantId: string): void {
    if (!assistantId) throw new Error('assistant_id is required!');
  }

  /** Retrieve an assistant by id. */
  async get(assistantId: string) {
    this.validateAssistantId(assistantId);
    const result = await this.request({
      api: assistantId,
      method: 'get',
    });
    return result.data;
  }

  /** Patch an assistant. */
  async update(assistantId: string, data: Partial<AssistantCreateOptions>) {
    this.validateAssistantId(assistantId);
    const result = await this.request({
      api: assistantId,
      method: 'put',
      data,
    });
    return result.data;
  }

  /** Delete an assistant. */
  async delete(assistantId: string) {
    this.validateAssistantId(assistantId);
    const result = await this.request({
      api: assistantId,
      method: 'delete',
    });
    return result.data;
  }

  /** Cancel an assistant run / lifecycle operation. */
  async cancel(assistantId: string) {
    this.validateAssistantId(assistantId);
    const result = await this.request({
      api: `${assistantId}/cancel`,
      method: 'post',
    });
    return result.data;
  }
}

export default Assistants;
