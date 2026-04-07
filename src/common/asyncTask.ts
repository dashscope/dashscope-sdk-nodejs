/**
 * Async task polling helper reused by transcription, image synthesis, video synthesis, etc.
 * Backoff matches Python `BaseAsyncApi.wait`: 1s → 2s → 4s → 5s (double every 3 attempts, cap 5s).
 */
import { DEFAULT_TIMEOUT_MS, TASK_STATUS_FINAL } from './consts';

export interface AsyncTaskResult {
  output?: { task_id?: string; task_status?: string };
  [key: string]: unknown;
}

export interface AsyncTaskFetchFn {
  (taskId: string): Promise<AsyncTaskResult>;
}

export interface AsyncTaskOptions {
  /** Max wait time in ms (default 300000 = 5 minutes). */
  maxWait?: number;
}

const WAIT_MS_INITIAL = 1000;
const WAIT_MS_MAX = 5000;
const INCREMENT_STEPS = 3;

/**
 * Poll an async task until it reaches a terminal status.
 * @param createResult Response from the create call; must include `output.task_id`.
 * @param fetch Function that loads the latest task state by id.
 * @param options Polling options.
 */
export async function waitForTask(
  createResult: AsyncTaskResult,
  fetch: AsyncTaskFetchFn,
  options: AsyncTaskOptions = {}
): Promise<AsyncTaskResult> {
  const taskId = createResult?.output?.task_id;
  if (typeof taskId !== 'string') return createResult;
  const { maxWait = DEFAULT_TIMEOUT_MS } = options;
  const start = Date.now();
  let waitMs = WAIT_MS_INITIAL;
  let step = 0;
  while (true) {
    if (Date.now() - start > maxWait) throw new Error(`Task ${taskId} timed out after ${maxWait}ms`);
    try {
      const taskResult = await fetch(taskId);
      const status = taskResult?.output?.task_status;
      if (status && TASK_STATUS_FINAL.has(status)) return taskResult;
    } catch (error) {
      console.warn(`Polling task ${taskId} failed:`, error);
    }
    await new Promise(resolve => setTimeout(resolve, waitMs));
    step += 1;
    if (waitMs < WAIT_MS_MAX && step % INCREMENT_STEPS === 0) {
      waitMs = Math.min(waitMs * 2, WAIT_MS_MAX);
    }
  }
}
