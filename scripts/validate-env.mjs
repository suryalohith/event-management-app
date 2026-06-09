#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ENV_FILE = '.env.local';
const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const parseDotEnv = (content) => {
  const map = new Map();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const splitIndex = trimmed.indexOf('=');
    if (splitIndex < 0) continue;
    const key = trimmed.slice(0, splitIndex).trim();
    const value = trimmed.slice(splitIndex + 1).trim();
    map.set(key, value);
  }

  return map;
};

const isPlaceholderValue = (rawValue) => {
  const value = String(rawValue || '').trim().toLowerCase();
  if (!value) return true;

  return (
    value.includes('your_') ||
    value.includes('placeholder') ||
    value === 'your_project_id' ||
    value === 'your_api_key_here' ||
    value === 'your_app_id' ||
    value === 'your_sender_id' ||
    value === 'your_project.firebaseapp.com' ||
    value === 'your_project.appspot.com'
  );
};

const envPath = path.resolve(process.cwd(), ENV_FILE);

if (!fs.existsSync(envPath)) {
  console.error(`Missing ${ENV_FILE}. Create it before deploy.`);
  process.exit(1);
}

const parsed = parseDotEnv(fs.readFileSync(envPath, 'utf8'));

const missingKeys = REQUIRED_KEYS.filter((key) => !parsed.has(key));
if (missingKeys.length > 0) {
  console.error(`Missing required keys in ${ENV_FILE}: ${missingKeys.join(', ')}`);
  process.exit(1);
}

const placeholderKeys = REQUIRED_KEYS.filter((key) =>
  isPlaceholderValue(parsed.get(key))
);

if (placeholderKeys.length > 0) {
  console.error(
    `Invalid placeholder values in ${ENV_FILE}: ${placeholderKeys.join(', ')}`
  );
  process.exit(1);
}

const appCheckMode = String(parsed.get('VITE_APP_CHECK_MODE') || '')
  .trim()
  .toLowerCase();

if (appCheckMode && appCheckMode !== 'off') {
  const siteKey = parsed.get('VITE_RECAPTCHA_SITE_KEY');
  if (isPlaceholderValue(siteKey)) {
    console.error(
      `VITE_RECAPTCHA_SITE_KEY is required in ${ENV_FILE} when VITE_APP_CHECK_MODE is "${appCheckMode}".`
    );
    process.exit(1);
  }
}

console.log(`${ENV_FILE} validation passed.`);
