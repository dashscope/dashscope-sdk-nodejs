import BaseApi from '../common/baseApi';
import { DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE } from '../common/consts';
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

  async get(name: string) {
    const result = await this.request({
      api: name,
      method: 'get',
    });
    return result.data;
  }
}

export default Models;
