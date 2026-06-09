import {
  browserLocalPersistence,
  IdTokenResult,
  User,
  getIdTokenResult,
  onIdTokenChanged,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { auth } from './firebaseAuthClient';
import { app } from './firebaseClient';

export const isFirebaseAuthEnabled = (): boolean => auth !== null;

const db = app ? getFirestore(app) : null;
const ADMIN_SESSION_CONTROLS_COLLECTION = 'admin_session_controls';

const getAuthErrorMessage = (error: unknown): string => {
  const code =
    typeof (error as { code?: unknown })?.code === 'string'
      ? String((error as { code: string }).code).toLowerCase()
      : '';

  if (code.includes('auth/api-key-not-valid')) {
    return 'Admin login is blocked by Firebase API key settings. Allow this key for Identity Toolkit API and authorized web referrers.';
  }

  if (
    code.includes('auth/invalid-credential') ||
    code.includes('auth/invalid-login-credentials') ||
    code.includes('auth/wrong-password') ||
    code.includes('auth/user-not-found')
  ) {
    return 'Invalid email or password.';
  }

  if (code.includes('auth/too-many-requests')) {
    return 'Too many login attempts. Please try again later.';
  }

  if (code.includes('auth/network-request-failed')) {
    return 'Network error while signing in. Please check internet and try again.';
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Admin login failed. Please try again.';
};

let persistenceInitializationPromise: Promise<void> | null = null;

const toUnixSeconds = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedNumber = Number.parseInt(value, 10);
    if (Number.isFinite(parsedNumber)) {
      return parsedNumber;
    }

    const parsedDate = Date.parse(value);
    if (Number.isFinite(parsedDate)) {
      return Math.floor(parsedDate / 1000);
    }
  }

  return null;
};

const getTokenAuthTimeSeconds = (tokenResult: IdTokenResult): number | null => {
  const claimAuthTime = toUnixSeconds(tokenResult.claims.auth_time);
  if (claimAuthTime !== null) {
    return claimAuthTime;
  }

  return toUnixSeconds(tokenResult.authTime);
};

const getAdminSessionRevokeBefore = async (uid: string): Promise<number | null> => {
  if (!db) {
    return null;
  }

  const snapshot = await getDoc(doc(db, ADMIN_SESSION_CONTROLS_COLLECTION, uid));
  if (!snapshot.exists()) {
    return null;
  }

  return toUnixSeconds(snapshot.data()?.revokeBefore);
};

const ensureAuthPersistence = async (): Promise<void> => {
  if (!auth) {
    return;
  }

  if (!persistenceInitializationPromise) {
    persistenceInitializationPromise = setPersistence(auth, browserLocalPersistence)
      .catch((error) => {
        // Fallback to Firebase default persistence when local persistence cannot be set.
        console.warn('Failed to set local auth persistence.', error);
      })
      .then(() => undefined);
  }

  await persistenceInitializationPromise;
};

const getAdminAccessStatus = async (
  user: User,
  forceRefresh = false
): Promise<{
  hasAdminClaim: boolean;
  isEmailVerified: boolean;
  isSessionRevoked: boolean;
}> => {
  const tokenResult = await getIdTokenResult(user, forceRefresh);
  const revokeBefore = await getAdminSessionRevokeBefore(user.uid);
  const authTimeSeconds = getTokenAuthTimeSeconds(tokenResult);

  return {
    hasAdminClaim: tokenResult.claims.admin === true,
    isEmailVerified:
      tokenResult.claims.email_verified === true || user.emailVerified === true,
    isSessionRevoked:
      revokeBefore !== null &&
      authTimeSeconds !== null &&
      authTimeSeconds < revokeBefore
  };
};

export const loginWithEmailPassword = async (
  email: string,
  password: string
): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase Auth is not configured.');
  }

  await ensureAuthPersistence();

  let credentials;
  try {
    credentials = await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
  const accessStatus = await getAdminAccessStatus(credentials.user);

  if (!accessStatus.isEmailVerified) {
    await signOut(auth);
    throw new Error('Admin access requires a verified email address.');
  }

  if (!accessStatus.hasAdminClaim) {
    await signOut(auth);
    throw new Error(
      'This account does not have admin access. Ask super admin to set custom claim admin=true.'
    );
  }

  if (accessStatus.isSessionRevoked) {
    await signOut(auth);
    throw new Error('This admin session was ended. Please login again.');
  }
};

export const sendAdminVerificationEmail = async (
  email: string,
  password: string
): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase Auth is not configured.');
  }

  await ensureAuthPersistence();

  let credentials;
  try {
    credentials = await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }

  try {
    if (credentials.user.emailVerified) {
      throw new Error('This email is already verified. Please login again.');
    }

    await sendEmailVerification(credentials.user);
  } finally {
    await signOut(auth);
  }
};

export const logoutAdmin = async (): Promise<void> => {
  if (!auth) return;
  await signOut(auth);
};

export const observeAdminAuthState = (
  callback: (state: { user: User | null; isAdmin: boolean }) => void
): (() => void) => {
  if (!auth) {
    callback({ user: null, isAdmin: false });
    return () => undefined;
  }

  void ensureAuthPersistence();
  const lastKnownAdminByUid = new Map<string, boolean>();

  return onIdTokenChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, isAdmin: false });
      return;
    }

    try {
      let accessStatus = await getAdminAccessStatus(user, false);
      if (!accessStatus.hasAdminClaim || !accessStatus.isEmailVerified) {
        accessStatus = await getAdminAccessStatus(user, true);
      }

      if (accessStatus.isSessionRevoked) {
        lastKnownAdminByUid.set(user.uid, false);
        await signOut(auth);
        callback({ user: null, isAdmin: false });
        return;
      }

      const isAdmin = accessStatus.hasAdminClaim && accessStatus.isEmailVerified;
      lastKnownAdminByUid.set(user.uid, isAdmin);
      callback({
        user,
        isAdmin
      });
    } catch (error) {
      console.error('Failed to read admin claim:', error);
      // Avoid flickering/logging out admin UI on transient token/network failures.
      const fallbackIsAdmin =
        lastKnownAdminByUid.get(user.uid) === true && user.emailVerified === true;
      callback({
        user: fallbackIsAdmin ? user : null,
        isAdmin: fallbackIsAdmin
      });
    }
  });
};
