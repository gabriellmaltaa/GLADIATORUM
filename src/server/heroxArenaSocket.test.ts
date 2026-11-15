import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { WebSocket } from 'ws';
import { createHeroRepository, HeroXAuthority, type HeroIdentity } from './heroxAuthority.ts';
import { attachHeroXArenaSocket } from './heroxArenaSocket.ts';

function messageOfType(socket: WebSocket, expectedType: string, timeoutMs = 3_000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${expectedType}`)), timeoutMs);
    const onMessage = (raw: Buffer) => {
      const message = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (message.type === 'error' && expectedType !== 'error') {
        clearTimeout(timer);
        socket.off('message', onMessage);
        reject(new Error(String(message.message)));
        return;
      }
      if (message.type !== expectedType) return;
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(message);
    };
    socket.on('message', onMessage);
  });
}

test('authenticated human sockets pair into a live match and unauthenticated clients are rejected', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'herox-ws-'));
  const oldServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const oldCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const authority = new HeroXAuthority(createHeroRepository({ projectId: 'test', databaseId: '(default)', volumePath: path.join(directory, 'state.json') }));
  const identities: Record<string, HeroIdentity> = {
    arena_token_a: { uid: 'arena-a', email: 'a@example.test', displayName: 'Alpha' },
    arena_token_b: { uid: 'arena-b', email: 'b@example.test', displayName: 'Beta' },
  };
  await authority.bootstrap(identities.arena_token_a!, 'sentinel', 1_000);
  await authority.bootstrap(identities.arena_token_b!, 'outcast', 1_000);
  const server = http.createServer();
  const arena = attachHeroXArenaSocket(server, authority, async (token) => {
    const identity = identities[token];
    if (!identity) throw new Error('invalid token');
    return identity;
  }, { botFallbackMs: 40 });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const a = new WebSocket(`ws://127.0.0.1:${address.port}/api/herox/arena`);
  const b = new WebSocket(`ws://127.0.0.1:${address.port}/api/herox/arena`);
  try {
    await Promise.all([
      new Promise<void>((resolve) => a.once('open', () => resolve())),
      new Promise<void>((resolve) => b.once('open', () => resolve())),
    ]);
    const authA = messageOfType(a, 'authenticated');
    const authB = messageOfType(b, 'authenticated');
    a.send(JSON.stringify({ type: 'auth', token: 'arena_token_a' }));
    b.send(JSON.stringify({ type: 'auth', token: 'arena_token_b' }));
    await Promise.all([authA, authB]);
    const queued = messageOfType(a, 'queued');
    a.send(JSON.stringify({ type: 'queue' }));
    await queued;
    const foundA = messageOfType(a, 'match_found');
    const foundB = messageOfType(b, 'match_found');
    b.send(JSON.stringify({ type: 'queue' }));
    const [matchA, matchB] = await Promise.all([foundA, foundB]);
    assert.equal(matchA.matchId, matchB.matchId);
    assert.equal(matchA.opponent, 'Beta');
    assert.equal(matchB.opponent, 'Alpha');
    assert.ok(await messageOfType(a, 'snapshot'));

    const cancelled = messageOfType(b, 'match_cancelled');
    a.close();
    assert.match(String((await cancelled).message), /Nenhuma vitória ou saque/i);
    const queuedAgain = messageOfType(b, 'queued');
    b.send(JSON.stringify({ type: 'queue' }));
    assert.equal((await queuedAgain).position, 1);
    const botMatch = messageOfType(b, 'match_found');
    assert.equal((await botMatch).opponent, 'Sentinela de Treino');
    const botSnapshot = await messageOfType(b, 'snapshot');
    const botPlayers = Object.values((botSnapshot.state as { players: Record<string, { isBot?: boolean }> }).players);
    assert.equal(botPlayers.filter((entry) => entry.isBot).length, 1);
    assert.equal((await authority.rankings()).some((entry) => entry.heroName === 'Sentinela de Treino'), false);

    const invalid = new WebSocket(`ws://127.0.0.1:${address.port}/api/herox/arena`);
    await new Promise<void>((resolve) => invalid.once('open', () => resolve()));
    const rejected = messageOfType(invalid, 'error');
    invalid.send(JSON.stringify({ type: 'auth', token: 'invalid_token' }));
    assert.match(String((await rejected).message), /inválida|expirada/i);
    invalid.close();

    const noisy = new WebSocket(`ws://127.0.0.1:${address.port}/api/herox/arena`);
    await new Promise<void>((resolve) => noisy.once('open', () => resolve()));
    const noisyAuthenticated = messageOfType(noisy, 'authenticated');
    noisy.send(JSON.stringify({ type: 'auth', token: 'arena_token_a' }));
    await noisyAuthenticated;
    const limited = messageOfType(noisy, 'error');
    for (let index = 0; index < 61; index += 1) noisy.send(JSON.stringify({ type: 'cancel' }));
    assert.match(String((await limited).message), /Limite de mensagens/i);
    noisy.close();
  } finally {
    a.close();
    b.close();
    await arena.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (oldServiceAccount === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = oldServiceAccount;
    if (oldCredentials === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    else process.env.GOOGLE_APPLICATION_CREDENTIALS = oldCredentials;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

