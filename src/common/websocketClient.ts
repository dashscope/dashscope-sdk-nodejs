/**
 * DashScope WebSocket client (header + payload framing, action/event types aligned with the Python SDK).
 */
import { randomUUID } from 'crypto';
import WebSocket from 'ws';
import { DEFAULT_TIMEOUT_MS, HTTP_STATUS_OK } from './consts';
import { getDashscopeUserAgent } from './userAgent';

const ACTION_KEY = 'action';
const EVENT_KEY = 'event';
const HEADER = 'header';
const TASK_ID = 'task_id';
const ERROR_NAME = 'error_code';
const ERROR_MESSAGE = 'error_message';

export const EventType = {
  STARTED: 'task-started',
  GENERATED: 'result-generated',
  FINISHED: 'task-finished',
  FAILED: 'task-failed',
} as const;

export const ActionType = {
  START: 'run-task',
  CONTINUE: 'continue-task',
  FINISHED: 'finish-task',
} as const;

export const WebsocketStreamingMode = {
  NONE: 'none',
  IN: 'in',
  OUT: 'out',
  DUPLEX: 'duplex',
} as const;

export interface WebSocketStreamPart {
  /** True when the payload is raw binary (e.g. audio). */
  isBinary: boolean;
  /** Parsed JSON object or raw bytes. */
  output: Buffer | Record<string, unknown>;
  /** Envelope status; 200 means success. */
  statusCode?: number;
  /** Request / task id for tracing. */
  requestId?: string;
}

export interface WebSocketClientOptions {
  url: string;
  apiKey: string;
  workspace?: string;
  /** Streaming mode: `none` | `in` | `out` | `duplex` (lowercase in wire format). */
  streaming?: (typeof WebsocketStreamingMode)[keyof typeof WebsocketStreamingMode];
  timeout?: number;
}

function buildMessage(header: Record<string, string>, payload: Record<string, unknown>): string {
  return JSON.stringify({ header, payload });
}

type QueueItem = { type: 'text' | 'binary'; data: Buffer | string };

interface MessageQueueState {
  queue: QueueItem[];
  done: boolean;
  resolveNext: (() => void) | null;
  rejectNext: ((err: Error) => void) | null;
}

function createWaitNext(state: MessageQueueState): () => Promise<QueueItem | null> {
  return (): Promise<QueueItem | null> => {
    if (state.queue.length > 0) {
      return Promise.resolve(state.queue.shift()!);
    }
    if (state.done) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      state.resolveNext = () => resolve(state.queue.length > 0 ? state.queue.shift()! : null);
      state.rejectNext = reject;
    });
  };
}

function parseMessageData(data: Buffer | string): string {
  return Buffer.isBuffer(data) ? data.toString('utf-8') : data;
}

/**
 * Open a WebSocket, send the start payload, and stream `result-generated` / terminal parts.
 */
export async function* runWebSocketStreamTask(
  options: WebSocketClientOptions,
  startPayload: Record<string, unknown>,
): AsyncGenerator<WebSocketStreamPart> {
  const { url, apiKey, workspace, streaming = 'out', timeout = DEFAULT_TIMEOUT_MS } = options;
  const taskId = generateTaskId();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'user-agent': getDashscopeUserAgent(),
  };
  if (workspace) {
    headers['X-DashScope-WorkSpace'] = workspace;
  }

  const ws = new WebSocket(url, {
    headers,
  });

  const queueStateRef: { current: MessageQueueState | null } = { current: null };
  let rejectOpen: ((err: Error) => void) | null = null;
  const timeoutId = setTimeout(() => {
    const error = new Error(`WebSocket connection timeout after ${timeout}ms`);
    if (rejectOpen) {
      rejectOpen(error);
    } else {
      queueStateRef.current?.rejectNext?.(error);
    }
    ws.terminate();
  }, timeout);

  await new Promise<void>((resolve, reject) => {
    rejectOpen = reject;
    ws.on('open', () => {
      rejectOpen = null;
      resolve();
    });
    ws.on('error', (err: Error) => {
      rejectOpen = null;
      reject(err);
    });
  });

  try {
    // Send run-task
    const taskHeader = {
      task_id: taskId,
      streaming,
      [ACTION_KEY]: ActionType.START,
    };
    const startMsg = buildMessage(taskHeader, startPayload);
    ws.send(startMsg);

    // Wait for task-started
    await waitForEvent(ws, EventType.STARTED);

    // Consume streamed messages
    const queueState: MessageQueueState = {
      queue: [],
      done: false,
      resolveNext: null,
      rejectNext: null,
    };
    queueStateRef.current = queueState;

    ws.on('message', (data: Buffer | string) => {
      const type = Buffer.isBuffer(data) ? 'binary' : 'text';
      queueState.queue.push({ type, data });
      if (queueState.resolveNext) {
        queueState.resolveNext();
        queueState.resolveNext = null;
      }
    });

    ws.on('close', () => {
      queueState.done = true;
      if (queueState.resolveNext) {
        queueState.resolveNext();
        queueState.resolveNext = null;
      }
    });

    ws.on('error', (err: Error) => {
      if (queueState.rejectNext) queueState.rejectNext(err);
    });

    const waitNext = createWaitNext(queueState);

    while (true) {
      const msg = await waitNext();
      if (!msg) break;

      if (msg.type === 'binary') {
        yield {
          isBinary: true,
          output: msg.data as Buffer,
          statusCode: HTTP_STATUS_OK,
          requestId: taskId,
        };
        continue;
      }

      const text = parseMessageData(msg.data);
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        continue;
      }

      const header = (json[HEADER] as Record<string, string>) || {};
      const event = header[EVENT_KEY];

      if (event === EventType.GENERATED) {
        const payload = (json.payload || {}) as Record<string, unknown>;
        yield {
          isBinary: false,
          output: payload,
          statusCode: HTTP_STATUS_OK,
          requestId: header[TASK_ID] || taskId,
        };
      } else if (event === EventType.FINISHED) {
        const payload = json.payload as Record<string, unknown> | undefined;
        if (payload?.output || payload?.usage) {
          yield {
            isBinary: false,
            output: payload,
            statusCode: HTTP_STATUS_OK,
            requestId: header[TASK_ID] || taskId,
          };
        }
        break;
      } else if (event === EventType.FAILED) {
        const code = header[ERROR_NAME] || '';
        const message = header[ERROR_MESSAGE] || 'Task failed';
        throw new Error(`WebSocket task failed: ${code} - ${message}`);
      }
    }
  } finally {
    clearTimeout(timeoutId);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }
}

async function waitForEvent(ws: WebSocket, expectedEvent: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const handler = (data: Buffer | string) => {
      if (Buffer.isBuffer(data)) return; // task-started is always text
      const text = parseMessageData(data);
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return;
      }
      const header = (json[HEADER] as Record<string, string>) || {};
      const event = header[EVENT_KEY];
      if (event === expectedEvent) {
        ws.removeListener('message', handler);
        ws.removeListener('close', closeHandler);
        resolve();
      } else if (event === EventType.FAILED) {
        ws.removeListener('message', handler);
        ws.removeListener('close', closeHandler);
        const code = header[ERROR_NAME] || '';
        const message = header[ERROR_MESSAGE] || 'Task failed';
        reject(new Error(`WebSocket task failed: ${code} - ${message}`));
      }
    };

    const closeHandler = () => {
      ws.removeListener('message', handler);
      ws.removeListener('close', closeHandler);
      reject(new Error('WebSocket connection closed before receiving expected event'));
    };

    ws.on('message', handler);
    ws.on('close', closeHandler);
  });
}

/**
 * Duplex mode: stream binary uplink (e.g. audio) while receiving streamed JSON/binary downlink.
 */
export async function* runWebSocketDuplexTask(
  options: WebSocketClientOptions,
  startPayload: Record<string, unknown>,
  audioChunks: AsyncIterable<Buffer>,
): AsyncGenerator<WebSocketStreamPart> {
  const { url, apiKey, workspace, timeout = DEFAULT_TIMEOUT_MS } = options;
  const streaming = 'duplex';
  const taskId = generateTaskId();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'user-agent': getDashscopeUserAgent(),
  };
  if (workspace) headers['X-DashScope-WorkSpace'] = workspace;

  const ws = new WebSocket(url, { headers });
  const duplexQueueStateRef: { current: MessageQueueState | null } = { current: null };
  const timeoutId = setTimeout(() => {
    if (duplexQueueStateRef.current?.rejectNext) {
      duplexQueueStateRef.current.rejectNext(new Error(`WebSocket connection timeout after ${timeout}ms`));
    }
    ws.terminate();
  }, timeout);

  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => resolve());
    ws.on('error', (err: Error) => reject(err));
  });

  const taskHeader = { task_id: taskId, streaming, [ACTION_KEY]: ActionType.START };
  ws.send(buildMessage(taskHeader, startPayload));
  await waitForEvent(ws, EventType.STARTED);

  const duplexQueueState: MessageQueueState = {
    queue: [],
    done: false,
    resolveNext: null,
    rejectNext: null,
  };
  duplexQueueStateRef.current = duplexQueueState;

  ws.on('message', (data: Buffer | string) => {
    duplexQueueState.queue.push({
      type: Buffer.isBuffer(data) ? 'binary' : 'text',
      data,
    });
    if (duplexQueueState.resolveNext) {
      duplexQueueState.resolveNext();
      duplexQueueState.resolveNext = null;
    }
  });
  ws.on('close', () => {
    duplexQueueState.done = true;
    if (duplexQueueState.resolveNext) {
      duplexQueueState.resolveNext();
      duplexQueueState.resolveNext = null;
    }
  });
  ws.on('error', (err: Error) => {
    duplexQueueState.rejectNext?.(err);
  });

  const waitNext = createWaitNext(duplexQueueState);

  const sendFinished = () => {
    if (ws.readyState === WebSocket.OPEN) {
      const finHeader = { task_id: taskId, [ACTION_KEY]: ActionType.FINISHED };
      ws.send(buildMessage(finHeader, { input: {} }));
    }
  };

  let sendError: Error | null = null;
  (async () => {
    try {
      for await (const chunk of audioChunks) {
        // Stop sending if the connection has been closed; the downstream
        // consumer will see the 'close' event and end the stream naturally.
        if (ws.readyState !== WebSocket.OPEN) break;
        if (chunk && chunk.length > 0) ws.send(chunk);
      }
      sendFinished();
    } catch (e) {
      sendError = e instanceof Error ? e : new Error(String(e));
      sendFinished();
      if (duplexQueueState.rejectNext) duplexQueueState.rejectNext(sendError);
    }
  })();

  while (true) {
    const msg = await waitNext();
    if (!msg) break;

    if (msg.type === 'binary') {
      yield { isBinary: true, output: msg.data as Buffer, statusCode: HTTP_STATUS_OK, requestId: taskId };
      continue;
    }

    const text = parseMessageData(msg.data);
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      continue;
    }
    const header = (json[HEADER] as Record<string, string>) || {};
    const event = header[EVENT_KEY];

    if (event === EventType.GENERATED) {
      yield { isBinary: false, output: (json.payload || {}) as Record<string, unknown>, statusCode: HTTP_STATUS_OK, requestId: header[TASK_ID] || taskId };
    } else if (event === EventType.FINISHED) {
      const payload = json.payload as Record<string, unknown> | undefined;
      if (payload?.output || payload?.usage) {
        yield { isBinary: false, output: payload, statusCode: HTTP_STATUS_OK, requestId: header[TASK_ID] || taskId };
      }
      break;
    } else if (event === EventType.FAILED) {
      throw new Error(`WebSocket task failed: ${header[ERROR_NAME] || ''} - ${header[ERROR_MESSAGE] || 'Task failed'}`);
    }
  }

  try {
    if (sendError) {
      throw sendError;
    }
  } finally {
    clearTimeout(timeoutId);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }
}

function generateTaskId(): string {
  return randomUUID().replace(/-/g, '');
}
