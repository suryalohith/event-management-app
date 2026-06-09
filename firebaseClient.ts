import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider
} from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const requiredKeys: Array<keyof typeof firebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

const isPlaceholderValue = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    normalized.includes('your_') ||
    normalized.includes('placeholder') ||
    normalized === 'your_project_id' ||
    normalized === 'your_api_key_here' ||
    normalized === 'your_app_id' ||
    normalized === 'your_sender_id' ||
    normalized === 'your_project.firebaseapp.com' ||
    normalized === 'your_project.appspot.com'
  );
};

export const hasFirebaseConfig = requiredKeys.every((key) => {
  const value = firebaseConfig[key];
  return typeof value === 'string' && value.trim().length > 0 && !isPlaceholderValue(value);
});

// Validate config at runtime - helps catch misconfiguration early
export const validateFirebaseConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  for (const key of requiredKeys) {
    const value = firebaseConfig[key];
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      errors.push(`Missing or empty: ${key}`);
    }
  }
  
  // Validate project ID format
  if (firebaseConfig.projectId && !firebaseConfig.projectId.match(/^[a-z0-9-]+$/)) {
    errors.push('Invalid project ID format - must be lowercase alphanumeric with hyphens');
  }
  
  // Validate API key format (Firebase API keys typically start with specific prefix)
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.length < 10) {
    errors.push('API key appears to be invalid (too short)');
  }
  
  return { valid: errors.length === 0, errors };
};

// Run validation in development only to avoid exposing errors in production
if (import.meta.env.DEV && hasFirebaseConfig) {
  const validation = validateFirebaseConfig();
  if (!validation.valid) {
    console.warn('[Firebase Config] Validation warnings:', validation.errors);
  }
}

export const app = hasFirebaseConfig
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

type AppCheckMode = 'off' | 'recaptcha' | 'enterprise' | 'debug';

const parseAppCheckMode = (rawMode: unknown): AppCheckMode => {
  if (typeof rawMode !== 'string' || rawMode.trim() === '') {
    return 'off';
  }

  const normalized = rawMode.trim().toLowerCase();
  if (
    normalized === 'off' ||
    normalized === 'recaptcha' ||
    normalized === 'enterprise' ||
    normalized === 'debug'
  ) {
    return normalized;
  }

  return 'off';
};

let appCheckInitAttempted = false;
let appCheckInitialized = false;

// Initialize Firebase App Check - REQUIRED for production with high traffic
// This protects against bot attacks and abuse
const initAppCheck = (): void => {
  if (!app || typeof window === 'undefined') {
    return;
  }

  if (appCheckInitAttempted || appCheckInitialized) {
    return;
  }
  appCheckInitAttempted = true;

  const appCheckMode = parseAppCheckMode(import.meta.env.VITE_APP_CHECK_MODE);
  
  // Default to enterprise in production when not explicitly set.
  // This avoids recaptcha-v3 token exchange failures when using Enterprise keys.
  const effectiveMode = appCheckMode === 'off' && !import.meta.env.DEV 
    ? 'enterprise' 
    : appCheckMode;
    
  if (effectiveMode === 'off') {
    console.warn('[App Check] App Check is disabled. This is NOT recommended for production with high traffic.');
    return;
  }

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    console.warn(
      '[App Check] VITE_RECAPTCHA_SITE_KEY not configured. Skipping App Check initialization.'
    );
    return;
  }

  try {
    if (appCheckMode === 'debug') {
      const debugToken = import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN;
      (
        self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
      ).FIREBASE_APPCHECK_DEBUG_TOKEN =
        typeof debugToken === 'string' && debugToken.trim().length > 0
          ? debugToken.trim()
          : true;
      console.info('[App Check] Debug mode enabled.');
    }

    const provider =
      effectiveMode === 'enterprise'
        ? new ReCaptchaEnterpriseProvider(siteKey)
        : new ReCaptchaV3Provider(siteKey);

    initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true
    });

    appCheckInitialized = true;
    console.log(`[App Check] Initialized (${effectiveMode} mode).`);
  } catch (error) {
    // App Check failed to initialize - this is not critical
    // The app will still work, just without App Check protection
    console.warn('[App Check] Failed to initialize. App will continue without App Check:', error);
    appCheckInitAttempted = false; // Allow retry on next page load
  }
};

// Run App Check initialization only in browser after app is ready
if (typeof window !== 'undefined' && app) {
  if (document.readyState === 'complete') {
    initAppCheck();
  } else {
    window.addEventListener('load', initAppCheck, { once: true });
  }
}

if (!hasFirebaseConfig) {
  console.warn(
    '[Firebase] Missing VITE_FIREBASE_* values. Using localStorage fallback for data.'
  );
}
