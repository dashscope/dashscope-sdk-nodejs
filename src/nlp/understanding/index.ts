import BaseApi from '../../common/baseApi';
import { UnderstandingOptions } from '../../types';

class Understanding extends BaseApi {

  protected service = 'services/nlp/nlu/understanding';

  async call(options: UnderstandingOptions) {
    const { model, sentence, labels, task, ...rest } = options;
    const parameters: Record<string, unknown> = {};
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined) parameters[k] = v;
    });
    const result = await this.request({
      method: 'post',
      data: {
        model,
        input: { sentence, labels, ...(task ? { task } : {}) },
        parameters: Object.keys(parameters).length ? parameters : undefined,
      },
    });
    return result.data;
  }
}

export default Understanding;
