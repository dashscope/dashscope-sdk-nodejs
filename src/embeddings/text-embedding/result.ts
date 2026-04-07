import BaseResult from '../../common/baseResult';

interface Embedding {
  text_index: number;
  embedding: number[];
}

class EmbeddingResult extends BaseResult {

  /**
   * Model output: embedding vectors per input span.
   */
  public output?: {
    embeddings: Embedding[];
  };

  /**
   * Token usage for this request.
   */
  public usage?: {
    input_tokens: number;
  };
}

export default EmbeddingResult;
