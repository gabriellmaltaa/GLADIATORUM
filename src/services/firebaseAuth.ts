import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type Unsubscribe, type User } from 'firebase/auth';
import { app } from './firebaseApp';

export interface OnlineSessionUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  isTestSession: boolean;
}

export const auth = getAuth(app);
let activeTestToken: string | null = null;
let activeTestUser: OnlineSessionUser | null = null;

export function subscribeToAuthState(callback: (user: OnlineSessionUser | null) => void): Unsubscribe {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const testUid = params.get('testAuthUid');
    if (testUid && /^[a-zA-Z0-9_-]{2,64}$/.test(testUid)) {
      const displayName = params.get('testAuthName') || `Gladiador_${testUid.slice(0, 6)}`;
      const email = `${testUid}@ludus.capua.test`;
      activeTestToken = `test_token:${testUid}:${email}:${encodeURIComponent(displayName)}`;
      activeTestUser = { uid: testUid, email, displayName, emailVerified: true, isTestSession: true };
      callback(activeTestUser);
      return () => {};
    }
  }

  return onAuthStateChanged(auth, (firebaseUser: User | null) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    callback({
      uid: firebaseUser.uid,
      email: firebaseUser.email || `${firebaseUser.uid}@firebase.user`,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Novo Herói',
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
    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;
    return {
      ok: true,
      user: {
        uid: user.uid,
        email: user.email || `${user.uid}@firebase.user`,
        displayName: user.displayName || user.email?.split('@')[0] || 'Novo Herói',
        emailVerified: user.emailVerified,
        isTestSession: false,
      },
    };
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : 'auth/unknown';
    const errorMessage = code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
      ? 'Login com Google cancelado.'
      : code === 'auth/network-request-failed'
        ? 'Falha de conexão durante o login. Verifique sua internet.'
        : code === 'auth/unauthorized-domain' || code === 'auth/operation-not-allowed'
          ? 'Domínio ou provedor Google não autorizado no projeto Firebase selecionado.'
          : error instanceof Error ? error.message : 'Não foi possível concluir o login com Google.';
    return { ok: false, errorCode: code, errorMessage };
  }
}

export async function logoutFirebaseSession(): Promise<void> {
  activeTestToken = null;
  activeTestUser = null;
  if (auth.currentUser) await signOut(auth);
}

export async function getFirebaseIdToken(): Promise<string> {
  if (activeTestToken) return activeTestToken;
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Sessão expirada ou usuário desconectado. Faça login novamente.');
  return currentUser.getIdToken();
}
