import BaseApi, { RequestOptions } from '../common/baseApi';
import { DEFAULT_POLL_INTERVAL_MS, DEFAULT_TIMEOUT_MS } from '../common/consts';
import { RunCreateOptions } from '../types';

const RUN_STATUS_FINAL = ['completed', 'failed', 'cancelled', 'expired'];

class Runs extends BaseApi {

  protected service = 'threads';

  private validateThreadId(threadId: string): void {
    if (!threadId) throw new Error('thread_id is required!');
  }

  private validateRunId(runId: string): void {
    if (!runId) throw new Error('run_id is required!');
  }

  private async requestAndReturnData(config: RequestOptions) {
    const result = await this.request(config);
    return result.data;
  }

  async create(threadId: string, options: RunCreateOptions) {
    this.validateThreadId(threadId);
    return this.requestAndReturnData({
      service: `threads/${threadId}/runs`,
      method: 'post',
      data: options,
    });
  }

  async get(threadId: string, runId: string) {
    this.validateThreadId(threadId);
    this.validateRunId(runId);
    return this.requestAndReturnData({
      service: `threads/${threadId}/runs/${runId}`,
      method: 'get',
    });
  }

  async list(threadId: string, options?: { limit?: number }) {
    this.validateThreadId(threadId);
    return this.requestAndReturnData({
      service: `threads/${threadId}/runs`,
      method: 'get',
      params: options,
    });
  }

  async cancel(threadId: string, runId: string) {
    this.validateThreadId(threadId);
    this.validateRunId(runId);
    return this.requestAndReturnData({
      service: `threads/${threadId}/runs/${runId}/cancel`,
      method: 'post',
    });
  }

  /**
   * Poll until the run reaches a terminal status or timeout.
   * @param pollInterval Defaults to 500 ms.
   * @param maxWait Defaults to 300000 ms (5 minutes).
   */
  async wait(
    threadId: string,
    runId: string,
    options?: { pollInterval?: number; maxWait?: number },
  ) {
    this.validateThreadId(threadId);
    this.validateRunId(runId);
    const { pollInterval = DEFAULT_POLL_INTERVAL_MS, maxWait = DEFAULT_TIMEOUT_MS } = options ?? {};
    const start = Date.now();
    while (true) {
      const elapsed = Date.now() - start;
      if (elapsed > maxWait) {
        throw new Error(`Run ${runId} timed out after ${maxWait}ms`);
      }
      const run = await this.get(threadId, runId);
      const status = run?.status;
      if (!status) {
        await new Promise(r => setTimeout(r, pollInterval));
        continue;
      }
      if (RUN_STATUS_FINAL.includes(status)) {
        return run;
      }
      await new Promise(r => setTimeout(r, pollInterval));
    }
  }
}

export default Runs;
