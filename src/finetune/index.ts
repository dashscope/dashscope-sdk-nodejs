import { ListOptions, FineTuneOptions } from '../types';
import BaseApi from '../common/baseApi';

class FineTune extends BaseApi {

  protected service = 'fine-tunes';
  private static readonly SUCCESS_STATUS = 'success';

  async list(options: ListOptions) {
    const result = await this.request({
      method: 'get',
      params: options,
    });
    const data = result.data || {};
    const output = data.output || {};
    return {
      ...data,
      jobs: output.jobs || [],
    };
  }

  async fetch(jobId: string) {
    const result = await this.request({
      api: jobId,
      method: 'get',
    });
    const res = result.data || {};
    const output = res.output || {};
    const status = output.status ?? output.task_status;
    return { ...res, ...output, status };
  }

  async call(options: FineTuneOptions) {
    const { mode, finetuned_output, hyper_parameters = {}, ...rest } = options;
    const data: Record<string, unknown> = {
      hyper_parameters,
      ...rest,
    };
    // `mode` is the SDK-facing name; wire format uses `training_type`.
    if (mode) data.training_type = mode;
    if (finetuned_output) data.finetuned_output = finetuned_output;
    const result = await this.request({
      method: 'post',
      data,
    });
    const res = result.data || {};
    const output = res.output || {};
    return { ...res, ...output };
  }

  async delete(jobId: string) {
    const result = await this.request({
      api: jobId,
      method: 'delete',
    });
    const res = result.data || {};
    const output = res.output || {};
    // Error envelopes include `code`; omit synthetic status in that case.
    const status = output.status ?? (res.code ? undefined : FineTune.SUCCESS_STATUS);
    return { ...res, ...output, status };
  }

  async cancel(jobId: string) {
    const result = await this.request({
      api: `${jobId}/cancel`,
      method: 'post',
    });
    return result.data;
  }

  async events(jobId: string) {
    const result = await this.request({
      api: `${jobId}/events`,
      method: 'get',
    });
    return result.data;
  }
};

export default FineTune;
