import BaseResult from '../../common/baseResult';

class GenerationResult extends BaseResult {

  private static DATA_MARK = 'data:';

  /**
   * Model output payload.
   */
  public output?: {
    /**
     * When `result_format` is `text`, the generated text (may be partial while streaming).
     */
    text?: string;
    /**
     * When `result_format` is `text`: `null` while streaming; `stop` if stopped by a stop rule; `length` if max length reached.
     */
    finish_reason?: string;
    /**
     * When `result_format` is `message`, OpenAI-style choice list.
     */
    choices?: {
      /**
       * Same semantics as top-level `finish_reason` for this choice.
       */
      finish_reason?: string;
      /**
       * Each choice has a `message` shaped like `{"role","content"}`.
       */
      message: {
        /** Typically `system`, `user`, or `assistant`. */
        role: string;
        /**
         * Plain string for text models, or multimodal segments such as `[{text}]` / `[{image: url}]`.
         * Each object should include at least one of `text` or `image`.
         */
        content: string | Array<{ text?: string; image?: string }>;
      }
    }[]
  };

  /**
   * Token usage for this request.
   */
  public usage?: {
    /**
     * Input tokens. May be higher than the raw prompt when search augmentation adds context.
     */
    input_tokens: number;
    /** Generated output tokens. */
    output_tokens: number;
  };

  digest(data: string) {
    const lines = data.split('\n');
    let updated = false;
    for (const line of lines) {
      if (line.startsWith(GenerationResult.DATA_MARK)) {
        const message = line.substring(GenerationResult.DATA_MARK.length);
        try {
          Object.assign(this, JSON.parse(message));
          updated = true;
        } catch {
          continue;
        }
      }
    }
    return updated;
  }
}

export default GenerationResult;
