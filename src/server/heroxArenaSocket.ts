import crypto from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import {
  ARENA_TICK_MS,
  arenaSnapshot,
  createArenaMatch,
  tickArena,
  type ArenaInput,
  type ArenaMatch,
} from '../game/heroxArena.ts';
import type { HeroIdentity, HeroXAuthority } from './heroxAuthority.ts';

type TokenVerifier = (token: string) => Promise<HeroIdentity>;
interface ArenaConnection {
  socket: WebSocket;
  identity: HeroIdentity | null;
  authPending: boolean;
  player: Awaited<ReturnType<HeroXAuthority['getPlayer']>>;
  matchId: string | null;
  queued: boolean;
  input: ArenaInput;
  inputCount: number;
  inputWindowAt: number;
  messageCount: number;
  messageWindowAt: number;
  lastInputAt: number;
  authTimer: ReturnType<typeof setTimeout>;
}
interface LiveMatch {
  state: ArenaMatch;
  lastBroadcastAt: number;
  settling: boolean;
}
const neutralInput = (): ArenaInput => ({ left: false, right: false, jump: false, attack: false, power: false, interact: false });
const allowedInputKeys = ['left', 'right', 'jump', 'attack', 'power', 'interact'] as const;

function send(socket: WebSocket, message: Record<string, unknown>) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function errorAndClose(socket: WebSocket, message: string, code = 1008) {
  send(socket, { type: 'error', message });
  socket.close(code, message.slice(0, 120));
}

function parseInput(value: unknown): ArenaInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const object = value as Record<string, unknown>;
  if (Object.keys(object).some((key) => !allowedInputKeys.includes(key as typeof allowedInputKeys[number]))) return null;
  if (allowedInputKeys.some((key) => typeof object[key] !== 'boolean')) return null;
  return Object.fromEntries(allowedInputKeys.map((key) => [key, object[key]])) as unknown as ArenaInput;
}

function sameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.host; }
  catch { return false; }
}

export function attachHeroXArenaSocket(server: Server, authority: HeroXAuthority, verifyToken: TokenVerifier) {
  const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 2_048, perMessageDeflate: false });
  const clients = new Map<string, ArenaConnection>();
  const queue: string[] = [];
  const matches = new Map<string, LiveMatch>();
  let closed = false;

  const handleUpgrade = (request: IncomingMessage, socket: import('node:stream').Duplex, head: Buffer) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (pathname !== '/api/herox/arena') return;
    if (!sameOrigin(request)) { socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
    websocketServer.handleUpgrade(request, socket, head, (client) => websocketServer.emit('connection', client, request));
  };
  server.on('upgrade', handleUpgrade);

  function removeFromQueue(uid: string) {
    const index = queue.indexOf(uid);
    if (index >= 0) queue.splice(index, 1);
  }

  function snapshotToPlayers(match: LiveMatch) {
    const snapshot = arenaSnapshot(match.state);
    for (const uid of Object.keys(match.state.players)) {
      const client = clients.get(uid);
      if (!client) continue;
      send(client.socket, { type: 'snapshot', state: snapshot, selfUid: uid });
    }
  }

  async function settleMatch(match: LiveMatch) {
    if (match.settling) return;
    match.settling = true;
    const { state } = match;
    const winners = Object.values(state.players).filter((player) => player.uid === state.winnerUid);
    const winner = winners[0];
    await Promise.all(Object.values(state.players).map(async (player) => {
      const outcome = player.extracted ? 'extracted'
        : state.completionReason === 'elimination' && player.uid === state.winnerUid ? 'victory'
          : player.eliminated ? 'eliminated' : 'timeout';
      try {
        const result = await authority.completeArenaMatch(
          { uid: player.uid, email: clients.get(player.uid)?.identity?.email ?? '', displayName: player.heroName },
          {
            matchId: state.id,
            outcome,
            carriedXp: outcome === 'extracted' ? player.carriedXp : 0,
            carriedGold: outcome === 'extracted' ? player.carriedGold : 0,
            weaponIds: outcome === 'extracted' ? player.carriedWeapons : [],
          },
        );
        const client = clients.get(player.uid);
        if (client) {
          client.matchId = null;
          client.player = result.player;
          client.input = neutralInput();
          send(client.socket, {
            type: 'match_result', winnerUid: state.winnerUid, reason: state.completionReason,
            outcome, xp: result.result.xp, gold: result.result.gold, weaponUnlocked: result.result.weaponUnlocked,
            player: result.player,
          });
        }
      } catch {
        const client = clients.get(player.uid);
        if (client) send(client.socket, { type: 'error', message: 'A partida terminou, mas o resultado não foi salvo. Atualize seu perfil antes de entrar novamente.' });
      }
    }));
    if (winner && state.completionReason === 'elimination') {
      const winnerClient = clients.get(winner.uid);
      if (winnerClient) send(winnerClient.socket, { type: 'notice', message: 'O rival foi derrotado. A cidade registrou sua vitória.' });
    }
    setTimeout(() => matches.delete(state.id), 25_000).unref?.();
  }

  async function startMatch(a: ArenaConnection, b: ArenaConnection) {
    if (!a.identity || !b.identity || !a.player || !b.player) return;
    const id = crypto.randomUUID();
    const state = createArenaMatch(id, a.player, b.player);
    const match: LiveMatch = { state, lastBroadcastAt: 0, settling: false };
    matches.set(id, match);
    a.matchId = id;
    b.matchId = id;
    a.queued = false;
    b.queued = false;
    send(a.socket, { type: 'match_found', matchId: id, opponent: b.player.heroName, weapon: state.players[a.identity.uid]?.weaponId });
    send(b.socket, { type: 'match_found', matchId: id, opponent: a.player.heroName, weapon: state.players[b.identity.uid]?.weaponId });
    snapshotToPlayers(match);
  }

  function enqueue(client: ArenaConnection) {
    if (!client.identity || !client.player) { errorAndClose(client.socket, 'Autentique e crie seu herói antes de entrar na fila.'); return; }
    if (client.matchId) { send(client.socket, { type: 'error', message: 'Você já está em uma partida.' }); return; }
    if (client.queued) return;
    client.queued = true;
    const opponentUid = queue.find((uid) => uid !== client.identity!.uid && clients.get(uid)?.socket.readyState === WebSocket.OPEN);
    if (!opponentUid) {
      queue.push(client.identity.uid);
      send(client.socket, { type: 'queued', position: queue.length });
      return;
    }
    removeFromQueue(opponentUid);
    const opponent = clients.get(opponentUid)!;
    void startMatch(opponent, client);
  }

  websocketServer.on('connection', (socket: WebSocket) => {
    const client: ArenaConnection = {
      socket, identity: null, authPending: false, player: null, matchId: null, queued: false, input: neutralInput(),
      inputCount: 0, inputWindowAt: Date.now(), lastInputAt: 0,
      messageCount: 0, messageWindowAt: Date.now(),
      authTimer: setTimeout(() => errorAndClose(socket, 'Tempo de autenticação esgotado.'), 8_000),
    };
    socket.on('message', (raw: Buffer) => {
      if (raw.byteLength > 2_048) { errorAndClose(socket, 'Mensagem muito grande.', 1009); return; }
      const now = Date.now();
      if (now - client.messageWindowAt >= 1_000) { client.messageWindowAt = now; client.messageCount = 0; }
      client.messageCount += 1;
      if (client.messageCount > 60) { errorAndClose(socket, 'Limite de mensagens da arena excedido.'); return; }
      let message: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(raw.toString());
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        message = parsed as Record<string, unknown>;
      } catch { errorAndClose(socket, 'Mensagem inválida.'); return; }
      if (!client.identity) {
        if (client.authPending) { errorAndClose(socket, 'Autenticação já está em andamento.'); return; }
        if (message.type !== 'auth' || typeof message.token !== 'string' || message.token.length < 12 || message.token.length > 5_000) {
          errorAndClose(socket, 'Autenticação obrigatória para entrar na arena.'); return;
        }
        client.authPending = true;
        void verifyToken(message.token).then(async (identity) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const player = await authority.getPlayer(identity.uid);
          if (!player) { errorAndClose(socket, 'Crie seu herói antes de entrar na arena.'); return; }
          const existingClient = clients.get(identity.uid);
          if (existingClient && existingClient.socket !== socket && existingClient.socket.readyState === WebSocket.OPEN) {
            errorAndClose(socket, 'Este herói já está conectado à arena em outra aba.'); return;
          }
          clearTimeout(client.authTimer);
          client.identity = identity;
          client.player = player;
          clients.set(identity.uid, client);
          send(socket, { type: 'authenticated', heroName: player.heroName, weapons: player.weapons ?? ['pulse-ion'] });
        }).catch(() => errorAndClose(socket, 'Sessão inválida ou expirada.'));
        return;
      }
      if (message.type === 'queue') { enqueue(client); return; }
      if (message.type === 'cancel') {
        if (client.identity) removeFromQueue(client.identity.uid);
        client.queued = false;
        send(socket, { type: 'queue_cancelled' });
        return;
      }
      if (message.type === 'input') {
        if (now - client.inputWindowAt >= 1_000) { client.inputWindowAt = now; client.inputCount = 0; }
        client.inputCount += 1;
        if (client.inputCount > 35) { errorAndClose(socket, 'Limite de comandos da partida excedido.'); return; }
        const input = parseInput(message.input);
        if (!input || !client.matchId) { errorAndClose(socket, 'Comando de jogo inválido.'); return; }
        client.input = input;
        client.lastInputAt = now;
        return;
      }
      if (message.type === 'leave') { socket.close(1000, 'Saindo da partida'); return; }
      errorAndClose(socket, 'Comando de arena desconhecido.');
    });
    socket.on('close', () => {
      clearTimeout(client.authTimer);
      if (!client.identity) return;
      const uid = client.identity.uid;
      clients.delete(uid);
      removeFromQueue(uid);
      const live = client.matchId ? matches.get(client.matchId) : null;
      if (live && live.state.status === 'active') {
        live.state.status = 'completed';
        live.state.winnerUid = null;
        live.state.completionReason = 'timeout';
        for (const player of Object.values(live.state.players)) {
          player.carriedGold = 0;
          player.carriedXp = 0;
          player.carriedWeapons = [];
        }
        for (const playerId of Object.keys(live.state.players)) {
          const connected = clients.get(playerId);
          if (connected) {
            connected.matchId = null;
            connected.queued = false;
            connected.input = neutralInput();
            send(connected.socket, { type: 'match_cancelled', reason: 'disconnect', message: 'A conexão caiu. Nenhuma vitória ou saque foi concedido.' });
          }
        }
        live.settling = true;
        setTimeout(() => matches.delete(live.state.id), 25_000).unref?.();
      }
    });
  });

  const timer = setInterval(() => {
    const now = Date.now();
    for (const match of matches.values()) {
      if (match.state.status !== 'active') {
        if (!match.settling) void settleMatch(match);
        continue;
      }
      const inputs: Record<string, ArenaInput> = {};
      for (const uid of Object.keys(match.state.players)) {
        const client = clients.get(uid);
        inputs[uid] = client && now - client.lastInputAt < 250 ? client.input : neutralInput();
      }
      const events = tickArena(match.state, inputs, now);
      for (const event of events) {
        for (const uid of Object.keys(match.state.players)) {
          const client = clients.get(uid);
          if (client) send(client.socket, { type: 'event', event });
        }
      }
      if (now - match.lastBroadcastAt >= ARENA_TICK_MS) {
        snapshotToPlayers(match);
        match.lastBroadcastAt = now;
      }
      if ((match.state as ArenaMatch).status === 'completed') void settleMatch(match);
    }
  }, ARENA_TICK_MS);

  return {
    async close() {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      server.off('upgrade', handleUpgrade);
      for (const client of clients.values()) client.socket.close(1001, 'Servidor encerrando');
      await new Promise<void>((resolve) => websocketServer.close(() => resolve()));
    },
    get activeMatchCount() { return [...matches.values()].filter((match) => match.state.status === 'active').length; },
  };
}

