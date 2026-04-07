import BaseApi from '../common/baseApi';
import { DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE } from '../common/consts';
import { DeploymentOptions, ListOptions } from '../types';

/** Manage model deployments (create, list, get, update, delete, scale). */
class Deployments extends BaseApi {

  protected service = 'deployments';

  /** Create a deployment from model name, capacity, and optional version/suffix. */
  async call(options: DeploymentOptions) {
    const { model, capacity, version, suffix } = options;
    const req: Record<string, unknown> = { model_name: model, capacity };
    if (version !== undefined) req.model_version = version;
    if (suffix !== undefined) req.suffix = suffix;
    const result = await this.request({
      method: 'post',
      data: req,
    });
    return result.data;
  }

  /** List deployments with pagination. */
  async list(options: ListOptions = {}) {
    const { page_no = DEFAULT_PAGE_NO, page_size = DEFAULT_PAGE_SIZE } = options;
    const result = await this.request({
      method: 'get',
      params: { page_no, page_size },
    });
    return result.data;
  }

  /** Get one deployment by deployed model id. */
  async get(deployedModel: string) {
    const result = await this.request({
      api: deployedModel,
      method: 'get',
    });
    return result.data;
  }

  /** Delete a deployment. */
  async delete(deployedModel: string) {
    const result = await this.request({
      api: deployedModel,
      method: 'delete',
    });
    return result.data;
  }

  /** Update deployment fields. */
  async update(deployedModel: string, data: Record<string, unknown>) {
    const result = await this.request({
      api: deployedModel,
      method: 'put',
      data,
    });
    return result.data;
  }

  /** Scale deployment capacity (Python `Deployments.scale` parity). */
  async scale(deployedModel: string, capacity: number) {
    const result = await this.request({
      method: 'put',
      api: `${deployedModel}/scale`,
      data: { deployed_model: deployedModel, capacity },
    });
    return result.data;
  }
}

export default Deployments;
