import assert from 'node:assert/strict';
import test from 'node:test';
import { keepPreviousOnRefreshFailure, requestHeroX } from './heroxApi.ts';

test('requestHeroX sends the Firebase bearer token to the HEROX API', async () => {
  let capturedUrl = '';
  let capturedHeaders: HeadersInit | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedHeaders = init?.headers;
    return new Response(JSON.stringify({ ok: true, items: [] }), { status: 200 });
  };

  const result = await requestHeroX<{ ok: boolean; items: unknown[] }>(
    '/rankings',
    'firebase-id-token',
    undefined,
    fetchImpl
  );

  assert.equal(capturedUrl, '/api/herox/v1/rankings');
  assert.equal(new Headers(capturedHeaders).get('authorization'), 'Bearer firebase-id-token');
  assert.deepEqual(result, { ok: true, items: [] });
});

test('requestHeroX rejects protected requests without a token', async () => {
  await assert.rejects(requestHeroX('/me', null), /Conecte sua conta/);
});

test('requestHeroX returns the server message for non-success responses', async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ ok: false, error: 'Energia insuficiente.' }), { status: 400 });

  await assert.rejects(
    requestHeroX('/action', 'token', { method: 'POST' }, fetchImpl),
    /Energia insuficiente/
  );
});

test('requestHeroX reports malformed server responses', async () => {
  const fetchImpl: typeof fetch = async () => new Response('<html>bad gateway</html>', { status: 502 });

  await assert.rejects(
    requestHeroX('/rankings', 'token', undefined, fetchImpl),
    /Resposta inválida do servidor/
  );
});

test('keepPreviousOnRefreshFailure preserves the successful result when ranking refresh fails', async () => {
  const previous = [{ uid: 'hero-1', rank: 1 }];
  const result = await keepPreviousOnRefreshFailure(previous, async () => {
    throw new Error('ranking offline');
  });

  assert.equal(result, previous);
});
