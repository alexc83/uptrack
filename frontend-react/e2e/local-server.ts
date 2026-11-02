import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RecordedRequest { method: string; url: string; headers: IncomingMessage['headers']; body: Buffer }
export interface LocalServer { origin: string; requests: RecordedRequest[]; close: () => Promise<void> }

/**
 * Real loopback HTTP server for transport specs. Unlike Playwright route interception, it observes the
 * bytes the browser actually transmits and issues genuine HTTP responses (for example a real 302).
 * Pair it with `route.continue({ url })` so the page still talks to its own /api path.
 */
export async function startLocalServer(handle: (request: RecordedRequest, response: ServerResponse) => void): Promise<LocalServer> {
  const requests: RecordedRequest[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', chunk => chunks.push(chunk as Buffer));
    request.on('end', () => {
      const recorded = { method: request.method ?? '', url: request.url ?? '', headers: request.headers, body: Buffer.concat(chunks) };
      requests.push(recorded);
      handle(recorded, response);
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }),
  };
}
