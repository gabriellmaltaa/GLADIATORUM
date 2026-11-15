export const HEROX_API_PREFIX = '/api/herox/v1';

const PUBLIC_PATHS = new Set(['/catalog', '/rankings']);

export async function keepPreviousOnRefreshFailure<T>(previous: T, refresh: () => Promise<T>): Promise<T> {
  try {
    return await refresh();
  } catch {
    return previous;
  }
}

export async function requestHeroX<T>(
  path: string,
  token: string | null,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('Rota HEROX inválida.');
  }
  if (!token && !PUBLIC_PATHS.has(path.split('?')[0])) {
    throw new Error('Conecte sua conta para acessar o HEROX online.');
  }

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body != null) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  let payload: unknown;
  try {
    response = await fetchImpl(`${HEROX_API_PREFIX}${path}`, { ...init, headers });
    payload = await response.json();
  } catch {
    throw new Error('Resposta inválida do servidor HEROX. Verifique a conexão e tente novamente.');
  }

  if (!response.ok) {
    const error =
      payload && typeof payload === 'object' && 'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `O servidor HEROX respondeu com erro (${response.status}).`;
    throw new Error(error);
  }
  return payload as T;
}
