import BaseApi from '../../common/baseApi';
import { TextReRankOptions } from '../../types';

/** Text reranking API client. */
class TextReRank extends BaseApi {

  protected service = 'services/rerank/text-rerank/text-rerank';

  async call(options: TextReRankOptions) {
    const { model, query, documents, ...rest } = options;
    if (!model) throw new Error('model is required');
    if (!query) throw new Error('query is required');
    if (!documents || documents.length === 0) throw new Error('documents is required and must not be empty');
    const parameters: Record<string, unknown> = {};
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined) parameters[k] = v;
    });
    const result = await this.request({
      method: 'post',
      data: {
        model,
        input: { query, documents },
        parameters: Object.keys(parameters).length ? parameters : undefined,
      },
    });
    return result.data;
  }
}

export default TextReRank;
