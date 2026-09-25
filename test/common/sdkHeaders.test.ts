import { deepStrictEqual, ok, strictEqual } from 'assert';
import { getSdkHeaders, SDK_CLIENT, SDK_SESSION_ID } from '../../src/common/sdkHeaders';
import { getSdkVersion } from '../../src/common/sdkVersion';

describe('sdkHeaders', function() {
  const DISABLE_ENV = 'DASHSCOPE_DISABLE_SDK_HEADERS';
  let prev: string | undefined;

  beforeEach(() => {
    prev = process.env[DISABLE_ENV];
    delete process.env[DISABLE_ENV];
  });

  afterEach(() => {
    if (prev !== undefined) process.env[DISABLE_ENV] = prev;
    else delete process.env[DISABLE_ENV];
  });

  it('builds client + session headers without module', function() {
    const headers = getSdkHeaders();
    strictEqual(headers['x-dashscope-sdk-client'], `${SDK_CLIENT}/${getSdkVersion()}`);
    strictEqual(headers['x-dashscope-sdk-session-id'], SDK_SESSION_ID);
    ok(/^[0-9a-f]{32}$/.test(SDK_SESSION_ID), 'session id is a 32-char hex');
  });

  it('appends the module tag when provided', function() {
    const headers = getSdkHeaders('audio');
    strictEqual(headers['x-dashscope-sdk-client'], `${SDK_CLIENT}/${getSdkVersion()}/audio`);
  });

  it('returns empty headers when disabled by env', function() {
    process.env[DISABLE_ENV] = '1';
    deepStrictEqual(getSdkHeaders('aigc'), {});
  });

  it('session id is stable across calls', function() {
    strictEqual(getSdkHeaders()['x-dashscope-sdk-session-id'], getSdkHeaders('x')['x-dashscope-sdk-session-id']);
  });
});
