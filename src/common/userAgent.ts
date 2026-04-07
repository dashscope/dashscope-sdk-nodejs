import { arch, platform } from 'os';
import { getSdkVersion } from './sdkVersion';

function sanitizeSegment(value: string): string {
  return value.replace(/\r/g, '').replace(/\n/g, '').trim();
}

/** HTTP / WebSocket User-Agent string aligned with Python `get_user_agent` (sanitized platform segments). */
export function getDashscopeUserAgent(): string {
  let platformInfo: string;
  let processorInfo: string;
  try {
    platformInfo = sanitizeSegment(platform());
  } catch {
    platformInfo = 'unknown';
  }
  try {
    processorInfo = sanitizeSegment(arch());
  } catch {
    processorInfo = 'unknown';
  }
  return [
    `dashscope/${getSdkVersion()}`,
    `node/${process.version}`,
    `platform/${platformInfo}`,
    `processor/${processorInfo}`,
  ].join('; ');
}
