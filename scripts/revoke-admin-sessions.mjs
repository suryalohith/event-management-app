#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const usage = [
  'Usage:',
  '  npm run admin:logout-all -- <email> <serviceAccountKey.json>',
  '',
  'Example:',
  '  npm run admin:logout-all -- admin@example.com ./serviceAccountKey.json'
].join('\n');

const [, , rawEmail, rawKeyPath] = process.argv;
const email = rawEmail ? rawEmail.trim() : '';
const keyPath = rawKeyPath ? rawKeyPath.trim() : '';

if (!email || !keyPath) {
  console.error(usage);
  process.exit(1);
}

let initializeApp;
let cert;
let getAuth;
let getFirestore;

try {
  ({ initializeApp, cert } = await import('firebase-admin/app'));
  ({ getAuth } = await import('firebase-admin/auth'));
  ({ getFirestore } = await import('firebase-admin/firestore'));
} catch (error) {
  console.error('Missing dependency: firebase-admin');
  console.error('Install it with: npm install -D firebase-admin');
  process.exit(1);
}

let serviceAccount;
const resolvedKeyPath = resolve(keyPath);

try {
  const file = readFileSync(resolvedKeyPath, 'utf8');
  serviceAccount = JSON.parse(file);
} catch (error) {
  console.error(`Failed to read service account key: ${resolvedKeyPath}`);
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

try {
  let localProjectId = '';
  const localEnvPath = resolve('.env.local');
  if (existsSync(localEnvPath)) {
    const envText = readFileSync(localEnvPath, 'utf8');
    const line = envText
      .split('\n')
      .find((entry) => entry.startsWith('VITE_FIREBASE_PROJECT_ID='));
    if (line) {
      localProjectId = line.split('=')[1]?.trim() || '';
    }
  }

  const keyProjectId =
    typeof serviceAccount.project_id === 'string'
      ? serviceAccount.project_id
      : '';

  if (keyProjectId) {
    console.log(`Service account project: ${keyProjectId}`);
  }
  if (localProjectId) {
    console.log(`App project (.env.local): ${localProjectId}`);
  }
  if (keyProjectId && localProjectId && keyProjectId !== localProjectId) {
    console.error(
      'Project mismatch: service account project and app project are different.'
    );
    console.error('Use a service account key from the same Firebase project.');
    process.exit(1);
  }

  const auth = getAuth();
  const db = getFirestore();
  const user = await auth.getUserByEmail(email);

  await auth.revokeRefreshTokens(user.uid);

  const updated = await auth.getUser(user.uid);
  const tokensValidAfterMs = updated.tokensValidAfterTime
    ? Date.parse(updated.tokensValidAfterTime)
    : Date.now();
  const revokeBefore = Number.isFinite(tokensValidAfterMs)
    ? Math.floor(tokensValidAfterMs / 1000)
    : Math.floor(Date.now() / 1000);

  await db.collection('admin_session_controls').doc(user.uid).set(
    {
      uid: user.uid,
      email: updated.email || email,
      revokeBefore,
      updatedAt: Date.now()
    },
    { merge: true }
  );

  console.log('Admin sessions revoked successfully.');
  console.log(`Email: ${updated.email || email}`);
  console.log(`UID: ${updated.uid}`);
  console.log(`Revoke before (unix seconds): ${revokeBefore}`);
  console.log('All existing sessions for this admin will be forced out.');
  console.log('Registration data was not modified.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to revoke admin sessions: ${message}`);
  process.exit(1);
}
