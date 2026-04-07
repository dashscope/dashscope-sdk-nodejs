import type { ConfigurationOptions } from '../../src/types';

/** Fixed HTTP origin for nock; no real server listens here. */
export const MOCK_HTTP_ORIGIN = 'http://127.0.0.1:4010';

export const MOCK_API_KEY = 'mock-dashscope-api-key';

/** True when running against the real DashScope HTTP API (see `npm run test:live`). */
export function useLiveApi(): boolean {
  const v = process.env.DASHSCOPE_LIVE_API;
  return v === '1' || v === 'true';
}

/** Configuration for tests: mocked HTTP by default, or real API when `DASHSCOPE_LIVE_API=1`. */
export function testDashscopeConfig(): ConfigurationOptions {
  if (useLiveApi()) {
    const key = process.env.DASHSCOPE_API_KEY?.trim();
    if (!key) {
      throw new Error(
        'Live API tests require DASHSCOPE_API_KEY. Example: DASHSCOPE_LIVE_API=1 DASHSCOPE_API_KEY=sk-... npm run test:live'
      );
    }
    return { apiKey: key };
  }
  return {
    apiKey: MOCK_API_KEY,
    basePath: `${MOCK_HTTP_ORIGIN}/api/v1`,
  };
}

export function mockDashscopeConfig(): ConfigurationOptions {
  return {
    apiKey: MOCK_API_KEY,
    basePath: `${MOCK_HTTP_ORIGIN}/api/v1`,
  };
}

/** Build SSE body chunks for streaming tests (`data: {...}\\n\\n`). */
export function sseDataLines(payloads: Record<string, unknown>[]) {
  return payloads.map((p) => `data: ${JSON.stringify(p)}\n\n`).join('');
}
