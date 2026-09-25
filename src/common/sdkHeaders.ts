/**
 * Structured SDK identification headers for backend statistics
 * (aligned with Python `common.utils.get_sdk_headers` / `get_api_module`).
 */
import { randomUUID } from 'crypto';
import { getSdkVersion } from './sdkVersion';

/** Client identifier sent in the `x-dashscope-sdk-client` header. */
export const SDK_CLIENT = 'node-sdk';

/** Process-wide session id, stable for the lifetime of the module. */
export const SDK_SESSION_ID = randomUUID().replace(/-/g, '');

/** Env var that disables the SDK identification headers when set. */
const DISABLE_SDK_HEADERS_ENV = 'DASHSCOPE_DISABLE_SDK_HEADERS';

/**
 * Build the SDK identification headers.
 *
 * Set `DASHSCOPE_DISABLE_SDK_HEADERS` to omit them.
 *
 * @param module Optional module tag (e.g. `aigc`, `audio`, `tasks`).
 */
export function getSdkHeaders(module = ''): Record<string, string> {
  if (process.env[DISABLE_SDK_HEADERS_ENV]) {
    return {};
  }
  const parts = [SDK_CLIENT, getSdkVersion()];
  if (module) {
    parts.push(module);
  }
  return {
    'x-dashscope-sdk-client': parts.join('/'),
    'x-dashscope-sdk-session-id': SDK_SESSION_ID,
  };
}
