import BaseApi from '../../common/baseApi';
import { TextEmbeddingOptions } from '../../types';
import EmbeddingResult from './result';

class TextEmbedding extends BaseApi {

  protected service = 'services/embeddings/text-embedding/text-embedding';

  async call(options: TextEmbeddingOptions) {
    const { model, input, text_type, ...rest } = options;
    const parameters = text_type !== undefined ? { ...rest, text_type } : rest;
    const result = await this.request({
      method: 'post',
      data: {
        model,
        ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
        input: {
          texts: Array.isArray(input) ? input : [input],
        },
      },
    });
    return new EmbeddingResult(result.status, result.data);
  }
};

export default TextEmbedding;
