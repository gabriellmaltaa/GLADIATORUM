import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response, type NextFunction } from 'express';
import {
  type AuthenticatedIdentity,
  type AuthoritativeActionPayload,
  OnlineAuthorityEngine,
} from './src/server/onlineAuthorityEngine.ts';
import type { PlayerRankingCategory } from './src/game/guildsAndRankings.ts';

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf-8')
) as {
  projectId: string;
  firestoreDatabaseId?: string;
};

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

// Cache das chaves públicas X.509 do Google SecureToken para verificação criptográfica RS256 de ID Tokens do Firebase
let cachedGoogleCerts: { certs: Record<string, string>; expiresAtMs: number } | null =
  null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedGoogleCerts && cachedGoogleCerts.expiresAtMs > now) {
    return cachedGoogleCerts.certs;
  }
  const response = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!response.ok) {
    throw new Error('Falha ao obter certificados públicos do Firebase Auth.');
  }
  const certs = (await response.json()) as Record<string, string>;
  cachedGoogleCerts = {
    certs,
    expiresAtMs: now + 3600 * 1000,
  };
  return certs;
}

function base64UrlToBuffer(b64u: string): Buffer {
  const padded = b64u.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

export async function verifyFirebaseBearerToken(
  authHeader: string | undefined,
  allowDevTestTokens: boolean = !IS_PROD
): Promise<AuthenticatedIdentity> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token de autenticação ausente.');
  }
  const rawToken = authHeader.slice('Bearer '.length).trim();
  if (!rawToken) {
    throw new Error('Token de autenticação vazio.');
  }

  // Suporte a tokens de teste isolados para suítes de integração e verificação E2E em desenvolvimento
  if (allowDevTestTokens && rawToken.startsWith('test_token:')) {
    const parts = rawToken.split(':');
    const uid = (parts[1] || '').trim();
    const email = (parts[2] || `${uid}@ludus.test`).trim();
    const displayName = decodeURIComponent(parts.slice(3).join(':') || 'Gladiador Romano');
    if (!uid || !/^[a-zA-Z0-9_-]{2,128}$/.test(uid)) {
      throw new Error('UID de teste inválido.');
    }
    return {
      uid,
      email,
      displayName,
      emailVerified: true,
    };
  }

  const segments = rawToken.split('.');
  if (segments.length !== 3) {
    throw new Error('Formato de JWT Firebase inválido.');
  }

  const [headerB64, payloadB64, signatureB64] = segments;
  const header = JSON.parse(base64UrlToBuffer(headerB64).toString('utf-8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(base64UrlToBuffer(payloadB64).toString('utf-8')) as {
    iss?: string;
    aud?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    name?: string;
    email_verified?: boolean;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Cabeçalho JWT Firebase inválido.');
  }

  const expectedProjectId = firebaseConfig.projectId;
  if (payload.aud !== expectedProjectId) {
    throw new Error(
      `Token emitido para projeto incorreto (${payload.aud ?? 'desconhecido'}). Esperado: ${expectedProjectId}.`
    );
  }
  if (payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) {
    throw new Error('Emissor (iss) do token inválido.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < nowSec - 30) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Identificador de usuário (sub) ausente no token.');
  }

  const certs = await getGooglePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Chave pública de assinatura não encontrada para o token.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signatureValid = verifier.verify(certPem, base64UrlToBuffer(signatureB64));
  if (!signatureValid) {
    throw new Error('Assinatura criptográfica do token Firebase inválida.');
  }

  return {
    uid: payload.sub,
    email: payload.email || `${payload.sub}@firebase.user`,
    displayName: payload.name || payload.email?.split('@')[0] || 'Aurelius Valerius',
    emailVerified: payload.email_verified !== false,
  };
}

export function createAuthoritativeExpressApp(engine: OnlineAuthorityEngine) {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  interface AuthenticatedRequest extends Request {
    authIdentity?: AuthenticatedIdentity;
  }

  const requireAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const identity = await verifyFirebaseBearerToken(req.headers.authorization);
      req.authIdentity = identity;
      next();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha de autorização.';
      res.status(401).json({
        ok: false,
        code: 'UNAUTHENTICATED',
        error: msg,
      });
    }
  };

  app.get('/api/online/health', (_req, res) => {
    res.json({
      ok: true,
      projectId: firebaseConfig.projectId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
      environment: IS_PROD ? 'production' : 'development',
      serverTimestampMs: Date.now(),
      metrics: engine.getMetricsSnapshot(),
    });
  });

  app.post('/api/online/bootstrap', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await engine.bootstrapPlayer(req.authIdentity!, Date.now());
      res.json({
        ok: true,
        ...result,
      });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Falha ao inicializar conta online.',
      });
    }
  });

  app.post(
    '/api/online/migrate-local-save',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const rawLocalSaveJson =
          typeof req.body?.rawLocalSaveJson === 'string'
            ? req.body.rawLocalSaveJson
            : JSON.stringify(req.body?.localSave ?? {});
        const result = await engine.migrateLocalSave(
          req.authIdentity!,
          rawLocalSaveJson,
          Date.now()
        );
        if (!result.ok) {
          res.status(400).json(result);
          return;
        }
        res.json(result);
      } catch (err) {
        res.status(400).json({
          ok: false,
          error: err instanceof Error ? err.message : 'Erro ao migrar save local.',
        });
      }
    }
  );

  app.post('/api/online/action', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const payload = req.body as AuthoritativeActionPayload;
      const result = await engine.executeAction(req.authIdentity!, payload, Date.now());
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao processar ação no servidor.',
      });
    }
  });

  app.get('/api/online/rankings/players', async (req: AuthenticatedRequest, res) => {
    try {
      let viewerUid: string | null = null;
      if (req.headers.authorization) {
        try {
          const id = await verifyFirebaseBearerToken(req.headers.authorization);
          viewerUid = id.uid;
        } catch {
          // Consulta pública permitida mesmo se o header opcional falhar
        }
      }
      const category = (req.query.category as PlayerRankingCategory) || 'honor';
      const limit = Number(req.query.limit || 8);
      const cursor = req.query.cursor ? String(req.query.cursor) : null;
      const search = req.query.search ? String(req.query.search) : '';
      const jumpToViewerPage = req.query.jumpToMyPosition === '1';

      const result = engine.queryPlayerRankings({
        category,
        limit,
        cursor,
        search,
        viewerUid,
        jumpToViewerPage,
        nowMs: Date.now(),
      });
      res.json({
        ok: true,
        ...result,
      });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao consultar ranking de jogadores.',
      });
    }
  });

  app.get('/api/online/rankings/guilds', async (req: AuthenticatedRequest, res) => {
    try {
      let viewerUid: string | null = null;
      if (req.headers.authorization) {
        try {
          const id = await verifyFirebaseBearerToken(req.headers.authorization);
          viewerUid = id.uid;
        } catch {
          // Consulta pública permitida
        }
      }
      const limit = Number(req.query.limit || 8);
      const cursor = req.query.cursor ? String(req.query.cursor) : null;
      const search = req.query.search ? String(req.query.search) : '';
      const jumpToViewerGuild = req.query.jumpToMyGuild === '1';

      const result = engine.queryGuildRankings({
        limit,
        cursor,
        search,
        viewerUid,
        jumpToViewerGuild,
        nowMs: Date.now(),
      });
      res.json({
        ok: true,
        ...result,
      });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao consultar ranking de guildas.',
      });
    }
  });

  if (!IS_PROD) {
    app.post('/api/online/dev-seed-volume', (req, res) => {
      const resetClean = Boolean(req.body?.resetClean);
      if (resetClean) {
        const cleanReport = engine.resetSyntheticVolumeDataset(Date.now());
        res.json({ ok: true, mode: 'reset_clean', ...cleanReport });
        return;
      }
      const count = Number(req.body?.count || 1000);
      const seedReport = engine.seedThousandPlayersDataset(count, Date.now());
      res.json({ ok: true, mode: 'seeded_volume', ...seedReport });
    });
  }

  return app;
}

async function startServer() {
  const persistencePath = path.resolve(process.cwd(), '.data', 'online_authority_state.json');
  const engine = new OnlineAuthorityEngine({
    persistencePath,
    seedInitialOnlineGuilds: false,
    launchId: 'gladiatorum-public-launch-2026-11-12',
  });
  const app = createAuthoritativeExpressApp(engine);

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[GLADIATORUM Authority Server] Rodando em http://0.0.0.0:${PORT} (Firebase Project: ${firebaseConfig.projectId})`
    );
  });
}

// Inicia apenas quando executado diretamente (permite importar createAuthoritativeExpressApp nos testes)
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    console.error('Erro fatal ao iniciar servidor:', err);
    process.exit(1);
  });
}
