/**
 * Shared constants across modules (defaults aligned with the Python SDK; changing them changes runtime behavior).
 */

/** Default timeout in ms (5 minutes) for HTTP, WebSocket, polling, etc. */
export const DEFAULT_TIMEOUT_MS = 300000;

/** Default poll interval in ms for async tasks and run wait helpers. */
export const DEFAULT_POLL_INTERVAL_MS = 500;

/** HTTP status code treated as success for DashScope envelopes. */
export const HTTP_STATUS_OK = 200;

/** Default list pagination: page number. */
export const DEFAULT_PAGE_NO = 1;

/** Default list pagination: page size. */
export const DEFAULT_PAGE_SIZE = 10;

/** Terminal async task statuses. */
export const TASK_STATUS_FINAL = new Set(['FAILED', 'CANCELED', 'SUCCEEDED', 'UNKNOWN']);

/**
 * Synthetic status code used in `BaseApi` when the client cannot reach the network.
 */
export const NETWORK_CONNECTION_ERROR_STATUS = 0;
