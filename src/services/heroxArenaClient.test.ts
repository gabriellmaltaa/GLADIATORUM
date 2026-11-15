import assert from 'node:assert/strict';
import test from 'node:test';
import { toArenaWebSocketUrl } from './heroxArenaClient.ts';

test('arena websocket URL preserves the app host and uses a secure websocket for HTTPS', () => {
  assert.equal(toArenaWebSocketUrl('https://herox.example.test'), 'wss://herox.example.test/api/herox/arena');
  assert.equal(toArenaWebSocketUrl('http://localhost:4173'), 'ws://localhost:4173/api/herox/arena');
});

test('arena websocket URL rejects invalid origins and unsupported schemes', () => {
  assert.throws(() => toArenaWebSocketUrl('file:///tmp/index.html'));
  assert.throws(() => toArenaWebSocketUrl('not a URL'));
});

