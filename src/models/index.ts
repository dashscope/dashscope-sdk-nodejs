import BaseApi from '../common/baseApi';
import { DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, HTTP_STATUS_OK } from '../common/consts';
import { ModelsListOptions } from '../types';

class Models extends BaseApi {

  protected service = 'models';

  async list(options: ModelsListOptions = {}) {
    const { page_no = DEFAULT_PAGE_NO, page_size = DEFAULT_PAGE_SIZE } = options;
    const result = await this.request({
      method: 'get',
      params: { page_no, page_size },
    });
    return result.data;
  }

  /**
   * Get model information by name.
   *
   * Uses query-parameter filtering (`?model={name}&page_no=1&page_size=1`)
   * aligned with Python `Models.get()` (v1.26+). Returns 404 when the
   * model is not found.
   *
   * **Breaking**: unlike the previous path-based lookup which returned
   * the raw response body, this method now returns `{ ...response, output: model }`
   * on success, or `{ status_code: 404, message, output: null }` when
   * the model is not found.
   */
  async get(name: string): Promise<Record<string, unknown>> {
    const result = await this.request({
      method: 'get',
      params: { model: name, page_no: DEFAULT_PAGE_NO, page_size: 1 },
    });

    if (result.status !== HTTP_STATUS_OK) {
      return result.data;
    }

    const output = result.data?.output;
    if (!output || !output.models || !output.models.length) {
      return {
        status_code: 404,
        message: `Model '${name}' not found`,
        output: null,
      };
    }

    return {
      ...result.data,
      output: output.models[0],
    };
  }
}

export default Models;
