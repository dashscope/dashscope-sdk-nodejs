/**
 * Whether incremental streaming output should be tweaked for the given model.
 *
 * Some families (TTS, Omni, qwen-deep-research, etc.) do not support incremental mode the same way.
 *
 * @param modelName Model id or name from the caller.
 * @returns `false` when incremental tweaks should be skipped.
 */
const EXCLUDED_MODEL_PREFIXES = ['tts', 'omni', 'qwen-deep-research'];

export function shouldModifyIncrementalOutput(modelName: string): boolean {
  if (typeof modelName !== 'string') return true;
  const lower = modelName.toLowerCase();
  if (EXCLUDED_MODEL_PREFIXES.some(prefix => lower.includes(prefix))) return false;
  return true;
}
