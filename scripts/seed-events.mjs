#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const usage = [
  'Usage:',
  '  npm run events:seed -- <serviceAccountKey.json> [--clean]',
  '',
  'Examples:',
  '  npm run events:seed -- ./serviceAccountKey.json',
  '  npm run events:seed -- ./serviceAccountKey.json --clean',
  '',
  'Options:',
  '  --clean   Remove event docs not present in the final curated list.'
].join('\n');

const args = process.argv.slice(2);
const keyPathArg = args.find((arg) => !arg.startsWith('--'));
const shouldClean = args.includes('--clean');
const keyPath = keyPathArg ? keyPathArg.trim() : '';

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

const resolvedKeyPath = resolve(keyPath);

let serviceAccount;
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

const EVENTS_COLLECTION = 'events';
const SYSTEM_SETTINGS_COLLECTION = 'system_settings';
const REGISTRATION_CONTROL_DOC = 'registration_control';

const FINAL_EVENTS = [
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
  },
  {
    id: 'nt_best_meme',
    name: 'Best Meme',
    category: 'NON_TECH',
    subCategory: 'NONE',
    description: 'Original meme creation challenge.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 'nt_best_reel',
    name: 'Best Reel',
    category: 'NON_TECH',
    subCategory: 'NONE',
    description: 'Short-form creative reel competition.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 'nt_photography',
    name: 'Photography',
    category: 'NON_TECH',
    subCategory: 'NONE',
    description: 'Theme-based photography contest.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 'nt_department_ideas',
    name: 'Ideas for Department Development',
    category: 'NON_TECH',
    subCategory: 'NONE',
    description: 'Pitch practical ideas to improve the department.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 'nt_poster',
    name: 'Poster Competition',
    category: 'NON_TECH',
    subCategory: 'NONE',
    description: 'Visual communication through poster design.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_bgmi',
    name: 'BGMI',
    category: 'SPORTS',
    subCategory: 'ESPORTS',
    description: 'Battlegrounds Mobile India tournament.',
    maxTeamSize: 4,
    minTeamSize: 4,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_ff',
    name: 'Free Fire',
    category: 'SPORTS',
    subCategory: 'ESPORTS',
    description: 'Battle royale esports competition.',
    maxTeamSize: 4,
    minTeamSize: 4,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_cod',
    name: 'COD',
    category: 'SPORTS',
    subCategory: 'ESPORTS',
    description: 'Call of Duty mobile showdown.',
    maxTeamSize: 4,
    minTeamSize: 4,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_bad1',
    name: 'Badminton Singles',
    category: 'SPORTS',
    subCategory: 'INDOOR',
    description: 'Singles indoor badminton showdown.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_bad2',
    name: 'Badminton Doubles',
    category: 'SPORTS',
    subCategory: 'INDOOR',
    description: 'Doubles indoor badminton challenge.',
    maxTeamSize: 2,
    minTeamSize: 2,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_bad3',
    name: 'Badminton Mixed Doubles',
    category: 'SPORTS',
    subCategory: 'INDOOR',
    description: 'Mixed doubles indoor badminton contest.',
    maxTeamSize: 2,
    minTeamSize: 2,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_kab',
    name: 'Kabaddi',
    category: 'SPORTS',
    subCategory: 'INDOOR',
    description: 'Traditional indoor team raid game.',
    maxTeamSize: 10,
    minTeamSize: 7,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_chess',
    name: 'Chess',
    category: 'SPORTS',
    subCategory: 'INDOOR',
    description: 'Classic strategy board game.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_car',
    name: 'Carroms',
    category: 'SPORTS',
    subCategory: 'INDOOR',
    description: 'Precision strike board game.',
    maxTeamSize: 2,
    minTeamSize: 2,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_tt',
    name: 'Table Tennis',
    category: 'SPORTS',
    subCategory: 'INDOOR',
    description: 'Fast-paced indoor table sport.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_cube',
    name: 'Cube Solving',
    category: 'SPORTS',
    subCategory: 'INDOOR',
    description: 'Rubik\'s cube speed-solving.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_cri',
    name: 'Cricket (Men)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Full team cricket championship (Peace Ball).',
    maxTeamSize: 15,
    minTeamSize: 11,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_criw',
    name: 'Cricket (Women)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Women\'s full team cricket championship (Tennis Ball).',
    maxTeamSize: 11,
    minTeamSize: 11,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_vol',
    name: 'Volleyball (Men)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Net-play dominance.',
    maxTeamSize: 9,
    minTeamSize: 6,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_towm',
    name: 'Tug of War (Men)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Raw power and unity.',
    maxTeamSize: 10,
    minTeamSize: 8,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_bb',
    name: 'Basketball (Men)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'High-flying hoops action.',
    maxTeamSize: 5,
    minTeamSize: 5,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_fb',
    name: 'Football (Men)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'The beautiful game.',
    maxTeamSize: 10,
    minTeamSize: 7,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_s100m',
    name: 'Sprint 100m (Men)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Explosive speed.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_s400m',
    name: 'Sprint 400m (Men)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Endurance and speed.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_tbw',
    name: 'Throw Ball (Women)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Women\'s court strategy.',
    maxTeamSize: 10,
    minTeamSize: 7,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_khw',
    name: 'Kho-Kho (Women)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Traditional agility game.',
    maxTeamSize: 12,
    minTeamSize: 9,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_toww',
    name: 'Tug of War (Women)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Strength challenge.',
    maxTeamSize: 10,
    minTeamSize: 8,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_dbw',
    name: 'Dodge Ball (Women)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Reflexes and aim.',
    maxTeamSize: 10,
    minTeamSize: 6,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_s100w',
    name: 'Sprint 100m (Women)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Power dash.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  },
  {
    id: 's_s400w',
    name: 'Sprint 400m (Women)',
    category: 'SPORTS',
    subCategory: 'OUTDOOR',
    description: 'Speed endurance.',
    maxTeamSize: 1,
    minTeamSize: 1,
    venue: 'TBA',
    date: 'TBA',
    time: 'TBA',
    status: 'OPEN'
  }
];

try {
  const db = getFirestore();
  const eventsCollection = db.collection(EVENTS_COLLECTION);
  const settingsCollection = db.collection(SYSTEM_SETTINGS_COLLECTION);

  const existingSnapshot = await eventsCollection.get();
  const existingIds = new Set(existingSnapshot.docs.map((doc) => doc.id));
  const targetIds = new Set(FINAL_EVENTS.map((event) => event.id));

  let created = 0;
  let updated = 0;
  let deleted = 0;

  const batch = db.batch();

  if (shouldClean) {
    for (const existingDoc of existingSnapshot.docs) {
      if (!targetIds.has(existingDoc.id)) {
        batch.delete(existingDoc.ref);
        deleted += 1;
      }
    }
  }

  for (const event of FINAL_EVENTS) {
    const eventRef = eventsCollection.doc(event.id);
    batch.set(eventRef, event, { merge: false });
    if (existingIds.has(event.id)) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  batch.set(
    settingsCollection.doc(REGISTRATION_CONTROL_DOC),
    {
      enabled: true,
      updatedAt: Date.now()
    },
    { merge: true }
  );

  await batch.commit();

  console.log('Final events seed complete.');
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  if (shouldClean) {
    console.log(`Deleted stale events: ${deleted}`);
  }
  console.log(`Upserted total: ${FINAL_EVENTS.length}`);
  console.log('Registration control set to enabled=true.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to seed events: ${message}`);
  process.exit(1);
}
