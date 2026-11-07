import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  AuthoritativeActionPayload,
  AuthoritativeActionResponse,
  CompetitiveStatus,
  CursorPaginatedGuildsResponse,
  CursorPaginatedPlayersResponse,
  MigrationReport,
} from '../server/onlineAuthorityEngine';
import { PlayerRankingCategory } from '../game/guildsAndRankings';
import {
  calculateDerivedStats,
  evaluateUnlockedFeats,
  GameState,
  PendingRewardBatch,
} from '../game/rules';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionValidated = false;

export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  projectId: string;
  databaseId: string;
  error?: string;
}> {
  if (connectionValidated) {
    return {
      connected: true,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
    };
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    connectionValidated = true;
    return {
      connected: true,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return {
        connected: false,
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId,
        error: 'Cliente Firestore offline. Verifique sua conexão.',
      };
    }
    // Missing or insufficient permissions on /test/connection (default-deny rule) proves live reachability to Firestore!
    connectionValidated = true;
    return {
      connected: true,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
    };
  }
}

// Dispara validação de conexão ao inicializar o módulo
void testFirestoreConnection();

export interface OnlineSessionUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  isTestSession: boolean;
}

let activeTestToken: string | null = null;
let activeTestUser: OnlineSessionUser | null = null;
let activeSnapshotUnsubscribers: Unsubscribe[] = [];

export function cleanupFirestoreListeners() {
  for (const unsub of activeSnapshotUnsubscribers) {
    try {
      unsub();
    } catch {
      // Ignora falha ao cancelar listener
    }
  }
  activeSnapshotUnsubscribers = [];
}

export function initDevTestSessionFromUrl(): OnlineSessionUser | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const testUid = params.get('testAuthUid');
  if (!testUid || !/^[a-zA-Z0-9_-]{2,64}$/.test(testUid)) {
    return null;
  }
  const testName = params.get('testAuthName') || `Gladiador_${testUid.slice(0, 6)}`;
  const testEmail = `${testUid}@ludus.capua.test`;
  activeTestToken = `test_token:${testUid}:${testEmail}:${encodeURIComponent(testName)}`;
  activeTestUser = {
    uid: testUid,
    email: testEmail,
    displayName: testName,
    emailVerified: true,
    isTestSession: true,
  };
  return activeTestUser;
}

export function subscribeToAuthState(
  callback: (user: OnlineSessionUser | null) => void
): Unsubscribe {
  const devUser = initDevTestSessionFromUrl();
  if (devUser) {
    callback(devUser);
    return () => {};
  }

  return onAuthStateChanged(auth, (firebaseUser: User | null) => {
    if (!firebaseUser) {
      cleanupFirestoreListeners();
      callback(null);
      return;
    }
    callback({
      uid: firebaseUser.uid,
      email: firebaseUser.email || `${firebaseUser.uid}@firebase.user`,
      displayName:
        firebaseUser.displayName ||
        firebaseUser.email?.split('@')[0] ||
        'Aurelius Valerius',
      emailVerified: firebaseUser.emailVerified,
      isTestSession: false,
    });
  });
}

export async function signInWithGooglePopup(): Promise<{
  ok: boolean;
  user?: OnlineSessionUser;
  errorCode?: string;
  errorMessage?: string;
}> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const fbUser = cred.user;
    return {
      ok: true,
      user: {
        uid: fbUser.uid,
        email: fbUser.email || `${fbUser.uid}@firebase.user`,
        displayName:
          fbUser.displayName || fbUser.email?.split('@')[0] || 'Aurelius Valerius',
        emailVerified: fbUser.emailVerified,
        isTestSession: false,
      },
    };
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : 'auth/unknown';

    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      return {
        ok: false,
        errorCode: code,
        errorMessage:
          'Login com Google cancelado. Seu progresso local permanece preservado.',
      };
    }
    if (code === 'auth/network-request-failed') {
      return {
        ok: false,
        errorCode: code,
        errorMessage:
          'Falha de conexão com a rede durante o login. Verifique sua internet e tente novamente.',
      };
    }
    if (code === 'auth/unauthorized-domain' || code === 'auth/operation-not-allowed') {
      return {
        ok: false,
        errorCode: code,
        errorMessage:
          'Domínio ou provedor Google não autorizado no projeto Firebase selecionado.',
      };
    }
    return {
      ok: false,
      errorCode: code,
      errorMessage:
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir o login com Google.',
    };
  }
}

export async function logoutOnlineSession(): Promise<void> {
  cleanupFirestoreListeners();
  activeTestToken = null;
  activeTestUser = null;
  if (auth.currentUser) {
    await signOut(auth);
  }
}

async function getBearerToken(): Promise<string> {
  if (activeTestToken) {
    return activeTestToken;
  }
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Sessão expirada ou usuário desconectado. Faça login novamente.');
  }
  return currentUser.getIdToken();
}

/**
 * Sincroniza os documentos validados do jogador no Cloud Firestore (/players_public/{uid} e /players_private/{uid})
 * respeitando estritamente o schema de `firebase-blueprint.json` e `firestore.rules`.
 */
export async function syncValidatedStateToFirestore(
  user: OnlineSessionUser,
  state: GameState,
  competitiveStatus: CompetitiveStatus,
  opId: string
): Promise<void> {
  if (user.isTestSession || !auth.currentUser || !auth.currentUser.emailVerified) {
    return;
  }

  const uid = auth.currentUser.uid;
  const derived = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    state.level,
    state.guildState
  );
  const feats = evaluateUnlockedFeats(state);
  const playerGuild = state.guildState.playerGuildId
    ? state.guildState.guilds.find((g) => g.id === state.guildState.playerGuildId)
    : null;

  const publicPath = `players_public/${uid}`;
  const publicRef = doc(db, 'players_public', uid);

  try {
    const existingSnap = await getDoc(publicRef);
    if (!existingSnap.exists()) {
      await setDoc(publicRef, {
        uid,
        name: state.name.slice(0, 32),
        title: state.title.slice(0, 48),
        level: Math.max(1, Math.min(5, state.level)),
        honor: Math.max(0, Math.min(180, state.honor)),
        fame: Math.max(0, state.fame),
        wins: Math.max(0, state.wins),
        losses: Math.max(0, state.losses),
        featsCount: Math.max(0, Math.min(50, feats.length)),
        goldLooted: Math.max(0, state.goldLooted),
        guildId: (playerGuild?.id ?? '').slice(0, 128),
        guildName: (playerGuild?.name ?? '').slice(0, 32),
        guildTag: (playerGuild?.tag ?? '').slice(0, 4),
        damageRange: `${derived.damageMin}-${derived.damageMax}`.slice(0, 20),
        armor: Math.max(0, derived.armor),
        competitiveStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const prevHonor = Number(existingSnap.data()?.honor ?? 0);
      const boundedHonor = Math.max(prevHonor, Math.min(prevHonor + 500, state.honor));
      await updateDoc(publicRef, {
        level: Math.max(1, Math.min(999, state.level)),
        honor: boundedHonor,
        fame: Math.max(0, state.fame),
        wins: Math.max(0, state.wins),
        losses: Math.max(0, state.losses),
        featsCount: Math.max(0, Math.min(50, feats.length)),
        goldLooted: Math.max(0, state.goldLooted),
        damageRange: `${derived.damageMin}-${derived.damageMax}`.slice(0, 20),
        armor: Math.max(0, derived.armor),
        guildId: (playerGuild?.id ?? '').slice(0, 128),
        guildName: (playerGuild?.name ?? '').slice(0, 32),
        guildTag: (playerGuild?.tag ?? '').slice(0, 4),
        competitiveStatus,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Missing or insufficient permissions')
    ) {
      handleFirestoreError(error, OperationType.WRITE, publicPath);
    }
  }

  const privatePath = `players_private/${uid}`;
  const privateRef = doc(db, 'players_private', uid);
  try {
    const existingPrivate = await getDoc(privateRef);
    if (!existingPrivate.exists()) {
      await setDoc(privateRef, {
        uid,
        email: (user.email || `${uid}@firebase.user`).slice(0, 160),
        gold: Math.max(0, Math.min(600, state.gold)),
        xp: Math.max(0, state.xp),
        currentHp: Math.max(1, state.currentHp),
        energy: Math.max(0, Math.min(50, state.energy)),
        maxEnergy: Math.max(1, Math.min(50, state.maxEnergy)),
        str: Math.max(1, Math.min(999, state.baseStats.strength)),
        ski: Math.max(1, Math.min(999, state.baseStats.skill)),
        agi: Math.max(1, Math.min(999, state.baseStats.agility)),
        con: Math.max(1, Math.min(999, state.baseStats.constitution)),
        cha: Math.max(1, Math.min(999, state.baseStats.charisma)),
        intStat: Math.max(1, Math.min(999, state.baseStats.intelligence)),
        idleActive: Boolean(state.idle.active),
        idleRegionId: (state.idle.regionId || 'capua_woods').slice(0, 64),
        idleEnemyIndex: Math.max(0, Math.min(10, state.idle.enemyIndex)),
        idleFocusMode: state.idle.focusMode,
        idleStartedAtMs: Math.max(0, state.idle.startedAtMs),
        lastServerSyncMs: Date.now(),
        migratedFromLocal: competitiveStatus === 'migrated_capped',
        lastOpId: opId.slice(0, 128),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (existingPrivate.data()?.lastOpId !== opId) {
      const prevGold = Number(existingPrivate.data()?.gold ?? 0);
      await updateDoc(privateRef, {
        gold: Math.max(0, Math.min(prevGold + 2500, state.gold)),
        xp: Math.max(0, state.xp),
        currentHp: Math.max(1, state.currentHp),
        energy: Math.max(0, Math.min(50, state.energy)),
        maxEnergy: Math.max(1, Math.min(50, state.maxEnergy)),
        str: Math.max(1, Math.min(999, state.baseStats.strength)),
        ski: Math.max(1, Math.min(999, state.baseStats.skill)),
        agi: Math.max(1, Math.min(999, state.baseStats.agility)),
        con: Math.max(1, Math.min(999, state.baseStats.constitution)),
        cha: Math.max(1, Math.min(999, state.baseStats.charisma)),
        intStat: Math.max(1, Math.min(999, state.baseStats.intelligence)),
        idleActive: Boolean(state.idle.active),
        idleRegionId: (state.idle.regionId || 'capua_woods').slice(0, 64),
        idleEnemyIndex: Math.max(0, Math.min(10, state.idle.enemyIndex)),
        idleFocusMode: state.idle.focusMode,
        idleStartedAtMs: Math.max(0, state.idle.startedAtMs),
        lastServerSyncMs: Date.now(),
        migratedFromLocal: competitiveStatus === 'migrated_capped',
        lastOpId: opId.slice(0, 128),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Missing or insufficient permissions')
    ) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }
}

export function attachOwnProfileListener(
  uid: string,
  onProfileUpdate: (data: Record<string, unknown>) => void
): Unsubscribe {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return () => {};
  }
  const path = `players_public/${uid}`;
  const unsub = onSnapshot(
    doc(db, 'players_public', uid),
    (snapshot) => {
      if (snapshot.exists()) {
        onProfileUpdate(snapshot.data() as Record<string, unknown>);
      }
    },
    (error) => {
      if (
        error instanceof Error &&
        error.message.includes('Missing or insufficient permissions')
      ) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
  activeSnapshotUnsubscribers.push(unsub);
  return unsub;
}

export async function apiBootstrapOnlinePlayer(user: OnlineSessionUser): Promise<{
  ok: boolean;
  state: GameState;
  offlineBatchCreated: PendingRewardBatch | null;
  isNewAccount: boolean;
  migratedFromLocal: boolean;
  migrationSummary: MigrationReport | null;
  competitiveStatus: CompetitiveStatus;
  playerRank: number;
  guildRank: number | null;
  serverTimestampMs: number;
}> {
  const token = await getBearerToken();
  const res = await fetch('/api/online/bootstrap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Falha ao carregar progresso do servidor.');
  }
  void syncValidatedStateToFirestore(
    user,
    data.state,
    data.competitiveStatus,
    `boot_${data.serverTimestampMs}`
  );
  return data;
}

export async function apiMigrateLocalSave(
  user: OnlineSessionUser,
  rawLocalSaveJson: string
): Promise<{
  ok: boolean;
  error?: string;
  report?: MigrationReport;
  state?: GameState;
  playerRank?: number;
  guildRank?: number | null;
}> {
  const token = await getBearerToken();
  const res = await fetch('/api/online/migrate-local-save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rawLocalSaveJson }),
  });
  const data = await res.json();
  if (res.ok && data.ok && data.state) {
    void syncValidatedStateToFirestore(
      user,
      data.state,
      'migrated_capped',
      `migrate_${Date.now()}`
    );
  }
  return data;
}

export async function apiExecuteAuthoritativeAction(
  user: OnlineSessionUser,
  payload: AuthoritativeActionPayload
): Promise<AuthoritativeActionResponse> {
  const token = await getBearerToken();
  const res = await fetch('/api/online/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as AuthoritativeActionResponse;
  if (res.ok && data.ok && data.state) {
    void syncValidatedStateToFirestore(user, data.state, 'verified_online', payload.opId);
  }
  return data;
}

export async function apiFetchOnlinePlayerRankings(options: {
  category: PlayerRankingCategory;
  limit?: number;
  cursor?: string | null;
  search?: string;
  jumpToMyPosition?: boolean;
}): Promise<CursorPaginatedPlayersResponse> {
  const headers: Record<string, string> = {};
  try {
    const token = await getBearerToken();
    headers.Authorization = `Bearer ${token}`;
  } catch {
    // Permite consulta pública se estiver em modo visitante
  }

  const params = new URLSearchParams();
  params.set('category', options.category);
  params.set('limit', String(options.limit ?? 8));
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.search) params.set('search', options.search);
  if (options.jumpToMyPosition) params.set('jumpToMyPosition', '1');

  const res = await fetch(`/api/online/rankings/players?${params.toString()}`, {
    headers,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Falha ao consultar ranking online.');
  }
  return data;
}

export async function apiFetchOnlineGuildRankings(options: {
  limit?: number;
  cursor?: string | null;
  search?: string;
  jumpToMyGuild?: boolean;
}): Promise<CursorPaginatedGuildsResponse> {
  const headers: Record<string, string> = {};
  try {
    const token = await getBearerToken();
    headers.Authorization = `Bearer ${token}`;
  } catch {
    // Permite consulta pública
  }

  const params = new URLSearchParams();
  params.set('limit', String(options.limit ?? 8));
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.search) params.set('search', options.search);
  if (options.jumpToMyGuild) params.set('jumpToMyGuild', '1');

  const res = await fetch(`/api/online/rankings/guilds?${params.toString()}`, {
    headers,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Falha ao consultar ranking de guildas online.');
  }
  return data;
}
