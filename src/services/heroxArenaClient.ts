import { getFirebaseIdToken } from './firebaseAuth';

export interface ArenaWireMessage extends Record<string, unknown> { type: string }
export interface ArenaInputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  power: boolean;
  interact: boolean;
}
export interface HeroXArenaConnection {
  queue(): void;
  cancelQueue(): void;
  updateInput(input: ArenaInputState): void;
  leave(): void;
}

export function toArenaWebSocketUrl(origin: string): string {
  const url = new URL(origin);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('A arena requer um endereço HTTP(S).');
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/api/herox/arena';
  url.search = '';
  url.hash = '';
  return url.toString();
}

export async function connectHeroXArena(onMessage: (message: ArenaWireMessage) => void): Promise<HeroXArenaConnection> {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') throw new Error('Este navegador não oferece WebSocket.');
  const token = await getFirebaseIdToken();
  const socket = new WebSocket(toArenaWebSocketUrl(window.location.origin));
  return new Promise((resolve, reject) => {
    let authenticated = false;
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.close();
      reject(new Error('O servidor demorou para autenticar a arena.'));
    }, 10_000);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'auth', token })), { once: true });
    socket.addEventListener('message', (event) => {
      let message: ArenaWireMessage;
      try {
        const parsed: unknown = JSON.parse(String(event.data));
        if (!parsed || typeof parsed !== 'object' || typeof (parsed as Record<string, unknown>).type !== 'string') throw new Error();
        message = parsed as ArenaWireMessage;
      } catch {
        if (!settled) { settled = true; window.clearTimeout(timeout); reject(new Error('O servidor enviou uma resposta inválida.')); }
        return;
      }
      onMessage(message);
      if (message.type === 'error' && !authenticated) {
        if (!settled) { settled = true; window.clearTimeout(timeout); reject(new Error(String(message.message ?? 'Não foi possível entrar na arena.'))); }
      }
      if (message.type === 'authenticated' && !authenticated) {
        authenticated = true;
        settled = true;
        window.clearTimeout(timeout);
        resolve({
          queue: () => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: 'queue' })),
          cancelQueue: () => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: 'cancel' })),
          updateInput: (input) => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: 'input', input })),
          leave: () => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'leave' })); socket.close(); },
        });
      }
    });
    socket.addEventListener('error', () => {
      if (!settled) { settled = true; window.clearTimeout(timeout); reject(new Error('Não foi possível conectar à arena. Verifique a conexão e tente novamente.')); }
    });
    socket.addEventListener('close', () => {
      if (authenticated) onMessage({ type: 'closed' });
      if (!settled) { settled = true; window.clearTimeout(timeout); reject(new Error('A conexão da arena foi encerrada antes da autenticação.')); }
    });
  });
}

