#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const usage = [
  'Usage:',
  '  npm run events:sync -- <serviceAccountKey.json>',
  '',
  'Example:',
  '  npm run events:sync -- ./serviceAccountKey.json'
].join('\n');

const [, , rawKeyPath] = process.argv;
const keyPath = rawKeyPath ? rawKeyPath.trim() : '';

if (!keyPath) {
  console.error(usage);
  process.exit(1);
}

let initializeApp;
let cert;
let getFirestore;

try {
  ({ initializeApp, cert } = await import('firebase-admin/app'));
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

const TECHNICAL_EVENTS = [
  {
    id: 't_hackathon',
    name: 'Hackathon',
    category: 'TECH',
    subCategory: 'NONE',
    description: 'Prototype development competition.',
    maxTeamSize: 4,
    minTeamSize: 2,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 't_business_combat',
    name: 'Business Combat',
    category: 'TECH',
    subCategory: 'NONE',
    description: 'Business case strategy simulation.',
    maxTeamSize: 4,
    minTeamSize: 2,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 't_paper_presentation',
    name: 'Paper Presentation',
    category: 'TECH',
    subCategory: 'NONE',
    description: 'Research communication and presentation competition.',
    maxTeamSize: 2,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 't_ai_challenge',
    name: 'AI Challenge in 1 Day',
    category: 'TECH',
    subCategory: 'NONE',
    description: 'A one-day AI challenge where participants build and present innovative solutions to real-world problems using any AI tools.',
    maxTeamSize: 4,
    minTeamSize: 2,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 't_technical_debate',
    name: 'Technical Quiz',
    category: 'TECH',
    subCategory: 'NONE',
    description: 'Technical knowledge and rapid-fire quiz challenge.',
    maxTeamSize: 3,
    minTeamSize: 2,
    venue: 'Quiz Arena',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 't_coding_contest',
    name: 'Coding Contest',
    category: 'TECH',
    subCategory: 'NONE',
    description: 'Competitive coding and algorithmic problem-solving contest.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'Coding Lab',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  }
];

try {
  const db = getFirestore();
  const eventsCollection = db.collection('events');

  const existingSnapshot = await eventsCollection.get();
  const existingIds = new Set(existingSnapshot.docs.map((doc) => doc.id));
  const targetIds = new Set(TECHNICAL_EVENTS.map((event) => event.id));
  let created = 0;
  let updated = 0;
  let deleted = 0;

  const batch = db.batch();
  for (const existingDoc of existingSnapshot.docs) {
    const existingData = existingDoc.data();
    if (
      existingData?.category === 'TECH' &&
      !targetIds.has(existingDoc.id)
    ) {
      batch.delete(existingDoc.ref);
      deleted += 1;
    }
  }

  for (const event of TECHNICAL_EVENTS) {
    const eventRef = eventsCollection.doc(event.id);
    batch.set(eventRef, event, { merge: true });
    if (existingIds.has(event.id)) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  await batch.commit();

  console.log(`Technical events sync complete.`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Deleted stale technical events: ${deleted}`);
  console.log(`Upserted total: ${TECHNICAL_EVENTS.length}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to sync technical events: ${message}`);
  process.exit(1);
}
