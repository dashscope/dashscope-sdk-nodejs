import BaseResult from '../../common/baseResult';

interface MultiModalEmbeddingItem {
  text_index?: number;
  embedding: number[];
}

class MultiModalEmbeddingResult extends BaseResult {

  /**
   * Model output: multimodal embedding vectors.
   */
  public output?: {
    embeddings: MultiModalEmbeddingItem[];
  };

  /**
   * Token usage for this request.
   */
  public usage?: {
    input_tokens: number;
  };
}

export default MultiModalEmbeddingResult;
