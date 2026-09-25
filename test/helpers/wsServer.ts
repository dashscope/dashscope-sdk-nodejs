import { AddressInfo } from 'net';
import nock from 'nock';
import { WebSocketServer, WebSocket } from 'ws';

/** A captured text message plus optional reply behavior. */
export interface MockWsServer {
  /** WebSocket URL (ws://127.0.0.1:port). */
  url: string;
  /** All parsed JSON messages received from the client (text frames only). */
  received: Record<string, unknown>[];
  /** Raw string messages received (includes non-JSON / binary-as-string). */
  raw: string[];
  /** Send a JSON event to the currently connected client. */
  send: (event: Record<string, unknown>) => void;
  /** Close the server. */
  close: () => Promise<void>;
}

/**
 * Start a local WebSocket server that records client messages.
 *
 * `onMessage` is invoked for each parsed JSON message and may return an event
 * (or list of events) to send back to the client.
 */
export function startMockWsServer(
  onMessage?: (msg: Record<string, unknown>, ws: WebSocket) => Record<string, unknown> | Record<string, unknown>[] | void,
): Promise<MockWsServer> {
  // Allow real connections to localhost so the ws handshake is not blocked by nock.
  nock.enableNetConnect('127.0.0.1');

  return new Promise<MockWsServer>((resolve) => {
    const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 });
    const received: Record<string, unknown>[] = [];
    const raw: string[] = [];
    let current: WebSocket | null = null;

    wss.on('connection', (ws: WebSocket) => {
      current = ws;
      ws.on('message', (data: Buffer | string) => {
        const text = Buffer.isBuffer(data) ? data.toString('utf-8') : String(data);
        raw.push(text);
        let parsed: Record<string, unknown> | null;
        try {
          parsed = JSON.parse(text) as Record<string, unknown>;
        } catch {
          parsed = null;
        }
        if (parsed) {
          received.push(parsed);
        }
        if (onMessage && parsed) {
          const reply = onMessage(parsed, ws);
          if (reply) {
            const events = Array.isArray(reply) ? reply : [reply];
            for (const ev of events) {
              ws.send(JSON.stringify(ev));
            }
          }
        }
      });
    });

    wss.on('listening', () => {
      const { port } = wss.address() as AddressInfo;
      resolve({
        url: `ws://127.0.0.1:${port}`,
        received,
        raw,
        send: (event: Record<string, unknown>) => {
          current?.send(JSON.stringify(event));
        },
        close: () =>
          new Promise<void>((res) => {
            nock.disableNetConnect();
            wss.close(() => res());
          }),
      });
    });
  });
}
