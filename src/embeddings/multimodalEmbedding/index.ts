import BaseApi from '../../common/baseApi';
import { MultiModalEmbeddingOptions } from '../../types';
import MultiModalEmbeddingResult from './result';

class MultiModalEmbedding extends BaseApi {

  protected service = 'services/embeddings/multimodal-embedding/one-peace';

  async call(options: MultiModalEmbeddingOptions) {
    const { model, input, ...rest } = options;
    if (!input) throw new Error('prompt is required!');
    if (!model) throw new Error('Model is required!');
    const result = await this.request({
      method: 'post',
      data: {
        model,
        input: { contents: input },
        ...(Object.keys(rest).length > 0 ? { parameters: rest } : {}),
      },
    });
    return new MultiModalEmbeddingResult(result.status, result.data);
  }
};

export default MultiModalEmbedding;
