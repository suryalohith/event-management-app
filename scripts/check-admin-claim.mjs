#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const usage = [
  'Usage:',
  '  npm run admin:check -- <email> <serviceAccountKey.json>',
  '',
  'Example:',
  '  npm run admin:check -- admin@example.com ./serviceAccountKey.json'
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

try {
  ({ initializeApp, cert } = await import('firebase-admin/app'));
  ({ getAuth } = await import('firebase-admin/auth'));
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

initializeApp({ credential: cert(serviceAccount) });

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
  typeof serviceAccount.project_id === 'string' ? serviceAccount.project_id : '';

if (keyProjectId) {
  console.log(`Service account project: ${keyProjectId}`);
}
if (localProjectId) {
  console.log(`App project (.env.local): ${localProjectId}`);
}
if (keyProjectId && localProjectId && keyProjectId !== localProjectId) {
  console.error('Project mismatch: service account project and app project are different.');
  process.exit(1);
}

try {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  const claims = user.customClaims || {};
  const hasAdmin = claims.admin === true;

  console.log(`Email: ${user.email || email}`);
  console.log(`UID: ${user.uid}`);
  console.log(`Email verified: ${user.emailVerified}`);
  console.log(`Claims: ${JSON.stringify(claims, null, 2)}`);

  if (!user.emailVerified) {
    console.error('Status: BLOCKED (email not verified)');
    process.exit(2);
  }

  if (!hasAdmin) {
    console.error('Status: BLOCKED (admin claim missing)');
    process.exit(3);
  }

  console.log('Status: OK (verified email + admin=true claim).');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to check admin claim: ${message}`);
  process.exit(1);
}
