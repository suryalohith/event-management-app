#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  query,
  writeBatch,
  where
} from 'firebase/firestore';

const EVENTS_COLLECTION = 'events';
const REGISTRATIONS_COLLECTION = 'registrations';
const REGISTRATION_ROLL_LOCKS_COLLECTION = 'registration_roll_locks';

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
};

const parseDotEnv = (content) => {
  const out = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
};

const loadEnvFromFile = (filePath) => {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return {};
  return parseDotEnv(fs.readFileSync(abs, 'utf8'));
};

const pickEnv = (key, fileEnv) => {
  const runtime = process.env[key];
  if (typeof runtime === 'string' && runtime.trim().length > 0) {
    return runtime.trim();
  }
  const fromFile = fileEnv[key];
  if (typeof fromFile === 'string' && fromFile.trim().length > 0) {
    return fromFile.trim();
  }
  return '';
};

const ensureFirebaseConfig = (fileEnv) => {
  const cfg = {
    apiKey: pickEnv('VITE_FIREBASE_API_KEY', fileEnv),
    authDomain: pickEnv('VITE_FIREBASE_AUTH_DOMAIN', fileEnv),
    projectId: pickEnv('VITE_FIREBASE_PROJECT_ID', fileEnv),
    storageBucket: pickEnv('VITE_FIREBASE_STORAGE_BUCKET', fileEnv),
    messagingSenderId: pickEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', fileEnv),
    appId: pickEnv('VITE_FIREBASE_APP_ID', fileEnv)
  };
  const missing = Object.entries(cfg)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing Firebase config: ${missing.join(', ')}`);
  }

  const looksLikePlaceholder = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return (
      normalized.includes('your_') ||
      normalized.includes('placeholder') ||
      normalized === 'your_project_id' ||
      normalized === 'your_api_key_here' ||
      normalized === 'your_app_id'
    );
  };

  const placeholderFields = Object.entries(cfg)
    .filter(([, value]) => looksLikePlaceholder(value))
    .map(([key]) => key);

  if (placeholderFields.length > 0) {
    throw new Error(
      `Invalid Firebase config in env file. Replace placeholder values for: ${placeholderFields.join(', ')}`
    );
  }
  return cfg;
};

const normalizeEventStatus = (value) => {
  if (
    value === 'OPEN' ||
    value === 'CLOSED' ||
    value === 'REGISTRATION_OPEN_SOON'
  ) {
    return value;
  }
  return 'OPEN';
};

const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[idx];
};

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const buildRollNumber = (runSeed, seq) => {
  // Keep test rolls separate from real student rolls by using 9xx prefix.
  const raw = `${runSeed}${seq.toString().padStart(6, '0')}`;
  return raw.padStart(12, '9').slice(0, 12);
};

const formatMs = (value) => `${value.toFixed(2)} ms`;

const summarizeErrors = (errors) => {
  const map = new Map();
  for (const err of errors) {
    const key = err || 'unknown_error';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([message, count]) => ({ message, count }));
};

const isPermissionDeniedError = (error) => {
  const code =
    typeof error?.code === 'string' ? error.code.toLowerCase() : '';
  const message =
    typeof error?.message === 'string' ? error.message.toLowerCase() : '';

  return (
    code.includes('permission-denied') ||
    message.includes('permission denied') ||
    message.includes('missing or insufficient permissions')
  );
};

const getEventRegistrationCountOrNull = async (db, eventId) => {
  try {
    const snapshot = await getCountFromServer(
      query(collection(db, REGISTRATIONS_COLLECTION), where('eventId', '==', eventId))
    );
    return snapshot.data().count;
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn(
        '[load:test] registrations count is admin-only in current rules. Skipping count metrics.'
      );
      return null;
    }
    throw error;
  }
};

const fetchTargetEvents = async (db, eventIdArg) => {
  const normalizedEventId = String(eventIdArg || '').trim();
  const useAllOpenEvents = normalizedEventId.toUpperCase() === 'ALL';

  if (!useAllOpenEvents) {
    const eventRef = doc(db, EVENTS_COLLECTION, normalizedEventId);
    const eventSnapshot = await getDoc(eventRef);
    if (!eventSnapshot.exists()) {
      throw new Error(`Event not found: ${normalizedEventId}`);
    }

    const eventData = eventSnapshot.data();
    const eventName =
      typeof eventData.name === 'string' ? eventData.name : normalizedEventId;
    const eventStatus = normalizeEventStatus(eventData.status);
    if (eventStatus !== 'OPEN') {
      throw new Error(`Event "${eventName}" is not OPEN (status=${eventStatus}).`);
    }

    return [{ id: normalizedEventId, name: eventName }];
  }

  const snapshot = await getDocs(collection(db, EVENTS_COLLECTION));
  const openEvents = snapshot.docs
    .map((eventDoc) => {
      const raw = eventDoc.data();
      return {
        id: eventDoc.id,
        name: typeof raw.name === 'string' ? raw.name : eventDoc.id,
        status: normalizeEventStatus(raw.status)
      };
    })
    .filter((event) => event.status === 'OPEN')
    .map((event) => ({ id: event.id, name: event.name }));

  if (openEvents.length === 0) {
    throw new Error('No OPEN events found for --event-id ALL.');
  }

  return openEvents;
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const total = Math.max(1, Math.floor(toNumber(args.total, 150)));
  const parallel = Math.max(1, Math.floor(toNumber(args.parallel, total)));
  const eventId = typeof args['event-id'] === 'string' ? args['event-id'] : 'nt_poster';
  const envFile = typeof args.env === 'string' ? args.env : '.env.local';

  const fileEnv = loadEnvFromFile(envFile);
  const firebaseConfig = ensureFirebaseConfig(fileEnv);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const targetEvents = await fetchTargetEvents(db, eventId);
  const isMultiEventMode = targetEvents.length > 1;
  const eventIds = targetEvents.map((event) => event.id);
  const eventNameById = new Map(
    targetEvents.map((event) => [event.id, event.name])
  );

  const beforeCounts = new Map();
  await Promise.all(
    eventIds.map(async (id) => {
      const count = await getEventRegistrationCountOrNull(db, id);
      beforeCounts.set(id, count);
    })
  );

  const runStartedAt = Date.now();
  const runLabel = new Date(runStartedAt)
    .toISOString()
    .replaceAll(':', '')
    .replaceAll('-', '')
    .replaceAll('.', '')
    .replace('T', '_')
    .replace('Z', '');
  const runSeed = runStartedAt.toString().slice(-6);

  const timings = [];
  const failures = [];
  const successesByEvent = new Map();
  let successCount = 0;
  let completed = 0;
  let pointer = 0;

  const createOne = async (seq) => {
    const selectedEvent =
      targetEvents[Math.floor(Math.random() * targetEvents.length)];
    const eventIdForRegistration = selectedEvent.id;
    const eventNameForRegistration = selectedEvent.name;
    const rollNumber = buildRollNumber(runSeed, seq);
    const createdAt = Date.now();
    const timestamp = new Date(createdAt).toLocaleString();
    const registrationRef = doc(collection(db, REGISTRATIONS_COLLECTION));
    const lockRef = doc(
      db,
      REGISTRATION_ROLL_LOCKS_COLLECTION,
      `${eventIdForRegistration}_${rollNumber}`
    );

    const payload = {
      eventId: eventIdForRegistration,
      eventName: eventNameForRegistration,
      teamName: `LOADTEST_${runLabel}_${String(seq).padStart(3, '0')}`,
      members: [
        {
          name: `LOADTEST_${String(seq).padStart(3, '0')}`,
          rollNumber,
          section: 'LT',
          year: 'LOADTEST',
          phone: '9000000000'
        }
      ],
      memberRolls: [rollNumber],
      timestamp,
      createdAt
    };

    const startedAt = Date.now();
    const batch = writeBatch(db);
    batch.set(registrationRef, payload);
    batch.set(lockRef, {
      eventId: eventIdForRegistration,
      rollNumber,
      registrationId: registrationRef.id,
      createdAt
    });
    await batch.commit();
    const elapsed = Date.now() - startedAt;
    return { elapsed, eventId: eventIdForRegistration };
  };

  const worker = async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const seq = pointer;
      pointer += 1;
      if (seq >= total) {
        return;
      }

      try {
        const result = await createOne(seq);
        const elapsed = result.elapsed;
        timings.push(elapsed);
        successCount += 1;
        successesByEvent.set(
          result.eventId,
          (successesByEvent.get(result.eventId) || 0) + 1
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? `${error.name}:${error.message}`
            : 'UnknownError:unknown';
        failures.push(message);
      } finally {
        completed += 1;
        if (completed % 25 === 0 || completed === total) {
          // Simple progress line for long runs.
          console.log(`progress ${completed}/${total}`);
        }
      }
    }
  };

  const workerCount = Math.min(parallel, total);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const totalElapsed = Date.now() - runStartedAt;
  const sortedTimings = [...timings].sort((a, b) => a - b);

  const afterCounts = new Map();
  await Promise.all(
    eventIds.map(async (id) => {
      const count = await getEventRegistrationCountOrNull(db, id);
      afterCounts.set(id, count);
    })
  );

  const errorSummary = summarizeErrors(failures);
  const failedCount = total - successCount;

  // Approximate direct Firestore op usage per registration transaction in this script:
  // 3 reads (control/event/lock) + 2 writes (registration + lock) on success.
  const approxReads = total * 3;
  const approxWrites = successCount * 2;
  const throughput = successCount / Math.max(totalElapsed / 1000, 0.001);

  console.log('');
  console.log('=== Load Test Summary ===');
  console.log(`mode: ${isMultiEventMode ? 'multi-event-random' : 'single-event'}`);
  if (!isMultiEventMode) {
    const onlyEvent = targetEvents[0];
    console.log(`eventId: ${onlyEvent.id}`);
    console.log(`eventName: ${onlyEvent.name}`);
  } else {
    console.log(`eventsCovered: ${targetEvents.length}`);
    console.log(`eventIds: ${targetEvents.map((event) => event.id).join(', ')}`);
  }
  console.log(`runLabel: ${runLabel}`);
  console.log(`totalRequested: ${total}`);
  console.log(`parallelWorkers: ${workerCount}`);
  console.log(`success: ${successCount}`);
  console.log(`failed: ${failedCount}`);
  console.log(`duration: ${(totalElapsed / 1000).toFixed(2)} s`);
  console.log(`throughput: ${throughput.toFixed(2)} regs/sec`);
  console.log(`p50: ${formatMs(percentile(sortedTimings, 50))}`);
  console.log(`p95: ${formatMs(percentile(sortedTimings, 95))}`);
  console.log(`p99: ${formatMs(percentile(sortedTimings, 99))}`);
  console.log(`max: ${formatMs(sortedTimings[sortedTimings.length - 1] || 0)}`);
  const canShowBeforeAfterCounts = eventIds.every(
    (id) => beforeCounts.get(id) !== null && afterCounts.get(id) !== null
  );
  if (canShowBeforeAfterCounts) {
    const beforeTotal = eventIds.reduce(
      (acc, id) => acc + (beforeCounts.get(id) || 0),
      0
    );
    const afterTotal = eventIds.reduce(
      (acc, id) => acc + (afterCounts.get(id) || 0),
      0
    );
    console.log(`beforeCount(scope): ${beforeTotal}`);
    console.log(`afterCount(scope): ${afterTotal}`);
    console.log(`newRowsObserved(scope): ${afterTotal - beforeTotal}`);
  } else {
    console.log('beforeCount(scope): (skipped by rules)');
    console.log('afterCount(scope): (skipped by rules)');
  }
  console.log(`approxFirestoreReads: ${approxReads}`);
  console.log(`approxFirestoreWrites: ${approxWrites}`);

  if (isMultiEventMode) {
    console.log('');
    console.log('Per-event success distribution:');
    const distribution = [...successesByEvent.entries()]
      .map(([id, count]) => ({
        id,
        name: eventNameById.get(id) || id,
        count
      }))
      .sort((a, b) => b.count - a.count);
    for (const row of distribution) {
      console.log(`- ${row.id} (${row.name}): ${row.count}`);
    }
  }

  if (errorSummary.length > 0) {
    console.log('');
    console.log('Top Errors:');
    for (const item of errorSummary.slice(0, 10)) {
      console.log(`- ${item.count} x ${item.message}`);
    }
  }

  if (failedCount > 0) {
    process.exitCode = 2;
  }
};

run().catch((error) => {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error('Load test failed:', message);
  process.exitCode = 1;
});
