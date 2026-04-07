/**
 * SSE stream parser shared by chat completion and multimodal conversation helpers.
 */
import { AxiosResponse } from 'axios';
import { NETWORK_CONNECTION_ERROR_STATUS } from '../../common/consts';
import { mergeSingleResponse } from '../../utils/messageUtils';
import GenerationResult from './result';

const SSE_ID_PREFIX = 'id:';

export interface ParseStreamOptions {
  /** When true, merge incremental deltas into a growing full response (Python parity). */
  mergeIncremental?: boolean;
  n?: number;
}

/** Parse an SSE stream and yield `GenerationResult` instances. */
export async function* parseStreamResult(
  response: AxiosResponse,
  options: ParseStreamOptions = {}
): AsyncGenerator<GenerationResult> {
  if (!response) {
    yield new GenerationResult(NETWORK_CONNECTION_ERROR_STATUS);
    return;
  }
  const { status, data } = response;
  const result = new GenerationResult(status);
  if (status === NETWORK_CONNECTION_ERROR_STATUS) {
    yield result;
    return;
  }
  const { mergeIncremental = false, n = 1 } = options;
  const accumulatedData: Record<string | number, Record<string, unknown>> = {};
  let buffer = '';
  try {
    for await (const chunk of data) {
      const chunkStr = chunk.toString('utf-8').trim();
      if (!chunkStr) continue;
      buffer = chunkStr.startsWith(SSE_ID_PREFIX) ? chunkStr : buffer + chunkStr;
      if (result.digest(buffer)) {
        if (mergeIncremental && result.output) {
          const shouldYield = mergeSingleResponse(result.output as { text?: string; choices?: Record<string, unknown>[] }, accumulatedData, n);
          if (shouldYield) yield result;
        } else {
          yield result;
        }
      }
    }
  } catch (error) {
    console.error('Stream parsing error:', error);
    yield new GenerationResult(NETWORK_CONNECTION_ERROR_STATUS);
  }
}
