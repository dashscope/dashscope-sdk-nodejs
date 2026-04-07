/**
 * Streaming merge helpers (Python `message_utils.merge_single_response` parity).
 */

type AccumulatedData = Record<string | number, Record<string, unknown>>;

function initializeChoiceData(): Record<string, unknown> {
  return {
    content: '',
    reasoning_content: '',
    tool_calls: [],
    logprobs: { content: [] },
    finished: false,
    finish_reason: null,
    all_choices_sent: false,
    role: null,
  };
}

interface MergeableOutput {
  text?: string;
  choices?: Array<Record<string, unknown>>;
}

/**
 * Merge one streamed chunk into running accumulators.
 * @returns `true` if the chunk should be emitted downstream, `false` if it can be dropped.
 */
export function mergeSingleResponse(
  output: MergeableOutput,
  accumulatedData: AccumulatedData,
  n = 1
): boolean {
  if (n > 1 && Object.keys(accumulatedData).length > 0) {
    const allSent = Object.values(accumulatedData)
      .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null && 'all_choices_sent' in d)
      .every(d => d.all_choices_sent === true);
    if (allSent) return false;
  }

  if (!output) return true;

  // Accumulate plain `output.text` when `choices` is empty.
  if (
    'text' in output &&
    (output.choices === null || output.choices === undefined || (Array.isArray(output.choices) && output.choices.length === 0))
  ) {
    const choiceIdx = 0;
    if (!(choiceIdx in accumulatedData)) {
      accumulatedData[choiceIdx] = initializeChoiceData();
    }
    const acc = accumulatedData[choiceIdx] as Record<string, unknown>;
    if (output.text) {
      (acc.content as string) += output.text;
    }
    (output as Record<string, unknown>).text = acc.content as string;
    return true;
  }

  // Merge `output[].message.content` deltas (string or multimodal arrays).
  if (output.choices && Array.isArray(output.choices) && output.choices.length > 0) {
    const choices = output.choices;
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const choiceIdx = (choice as Record<string, unknown>).index as number ?? i;
      if (!(choiceIdx in accumulatedData)) {
        accumulatedData[choiceIdx] = initializeChoiceData();
      }
      const acc = accumulatedData[choiceIdx] as Record<string, unknown>;
      const msg = (choice as Record<string, unknown>).message as Record<string, unknown> | undefined;
      if (msg && 'content' in msg) {
        const current = msg.content;
        if (typeof current === 'string' && current) {
          (acc.content as string) += current;
          msg.content = acc.content;
        } else if (Array.isArray(current)) {
          if (!Array.isArray(acc.content)) acc.content = [];
          const accContent = acc.content as Array<{ text?: string }>;
          for (let j = 0; j < current.length; j++) {
            const item = current[j] as Record<string, unknown>;
            if (item && typeof item.text === 'string' && item.text) {
              if (!accContent[j]) accContent[j] = { text: '' };
              accContent[j].text = (accContent[j].text || '') + item.text;
            }
          }
          for (let j = 0; j < accContent.length; j++) {
            if (current[j]) {
              (current[j] as Record<string, unknown>).text = accContent[j]?.text ?? '';
            }
          }
        }
      }
    }
  }
  return true;
}
