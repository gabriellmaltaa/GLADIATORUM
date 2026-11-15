declare module 'ws' {
  import { EventEmitter } from 'node:events';
  import type { IncomingMessage } from 'node:http';
  import type { Duplex } from 'node:stream';

  export class WebSocket extends EventEmitter {
    constructor(address: string);
    static readonly OPEN: number;
    readonly readyState: number;
    send(data: string): void;
    close(code?: number, reason?: string): void;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options: { noServer: boolean; maxPayload?: number; perMessageDeflate?: boolean });
    handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer, callback: (client: WebSocket) => void): void;
    close(callback?: () => void): void;
    on(event: 'connection', listener: (socket: WebSocket) => void): this;
  }
}

