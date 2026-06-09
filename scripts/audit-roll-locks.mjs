#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const usage = [
  'Usage:',
  '  node scripts/audit-roll-locks.mjs <serviceAccountKey.json> [--apply] [--event <eventId>]',
  '',
  'Examples:',
  '  node scripts/audit-roll-locks.mjs ./serviceAccountKey.json',
  '  node scripts/audit-roll-locks.mjs ./serviceAccountKey.json --apply',
  '  node scripts/audit-roll-locks.mjs ./serviceAccountKey.json --event nt_poster --apply'
].join('\n');

const args = process.argv.slice(2);
const keyPathArg = args.find((arg) => !arg.startsWith('--')) || '';
const applyChanges = args.includes('--apply');
const eventFlagIndex = args.findIndex((arg) => arg === '--event');
const eventFilter =
  eventFlagIndex >= 0 && eventFlagIndex + 1 < args.length
    ? String(args[eventFlagIndex + 1] || '').trim()
    : '';

if (!keyPathArg) {
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
  console.error('Install it with: npm install firebase-admin');
  process.exit(1);
}

const resolvedKeyPath = resolve(keyPathArg);
if (!existsSync(resolvedKeyPath)) {
  console.error(`Service account key not found: ${resolvedKeyPath}`);
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(resolvedKeyPath, 'utf8'));
} catch (error) {
  console.error(`Failed to parse service account key JSON: ${resolvedKeyPath}`);
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const REGISTRATIONS_COLLECTION = 'registrations';
const ROLL_LOCKS_COLLECTION = 'registration_roll_locks';
const MAX_BATCH_WRITES = 450;

const normalizeRolls = (data) => {
  const memberRolls = Array.isArray(data.memberRolls) ? data.memberRolls : [];
  const memberDerivedRolls = Array.isArray(data.members)
    ? data.members
        .map((member) => (typeof member?.rollNumber === 'string' ? member.rollNumber : ''))
    : [];

  return Array.from(
    new Set(
      [...memberRolls, ...memberDerivedRolls]
        .map((roll) => (typeof roll === 'string' ? roll.trim() : ''))
        .filter((roll) => roll.length > 0)
    )
  );
};

const toCreatedAt = (data) => {
  if (typeof data.createdAt === 'number' && Number.isFinite(data.createdAt)) {
    return data.createdAt;
  }
  if (typeof data.timestamp === 'string') {
    const parsed = Date.parse(data.timestamp);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

const registrationsSnap = await db.collection(REGISTRATIONS_COLLECTION).get();

const groupedByEventRoll = new Map();
let scannedRegistrations = 0;
let scannedRollEntries = 0;
let skippedNoEvent = 0;

for (const regDoc of registrationsSnap.docs) {
  const data = regDoc.data() || {};
  const eventId = typeof data.eventId === 'string' ? data.eventId.trim() : '';
  if (!eventId) {
    skippedNoEvent += 1;
    continue;
  }
  if (eventFilter && eventId !== eventFilter) {
    continue;
  }

  scannedRegistrations += 1;
  const rolls = normalizeRolls(data);
  const createdAt = toCreatedAt(data);
  const eventName =
    typeof data.eventName === 'string' && data.eventName.trim().length > 0
      ? data.eventName
      : eventId;

  for (const roll of rolls) {
    scannedRollEntries += 1;
    const key = `${eventId}__${roll}`;
    const entry = groupedByEventRoll.get(key) || {
      eventId,
      eventName,
      roll,
      registrations: []
    };
    entry.registrations.push({
      id: regDoc.id,
      createdAt
    });
    groupedByEventRoll.set(key, entry);
  }
}

for (const entry of groupedByEventRoll.values()) {
  entry.registrations.sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id.localeCompare(b.id);
  });
}

const uniqueKeys = [...groupedByEventRoll.keys()];
const lockRefById = new Map(
  uniqueKeys.map((key) => {
    const { eventId, roll } = groupedByEventRoll.get(key);
    const lockId = `${eventId}_${roll}`;
    return [lockId, db.collection(ROLL_LOCKS_COLLECTION).doc(lockId)];
  })
);

const lockSnapsById = new Map();
for (const refs of chunk([...lockRefById.values()], 300)) {
  const snaps = await db.getAll(...refs);
  for (const lockSnap of snaps) {
    lockSnapsById.set(lockSnap.id, lockSnap);
  }
}

const duplicateGroups = [];
const missingLocks = [];
const staleLocks = [];

for (const key of uniqueKeys) {
  const entry = groupedByEventRoll.get(key);
  const canonical = entry.registrations[0];
  const lockId = `${entry.eventId}_${entry.roll}`;
  const lockSnap = lockSnapsById.get(lockId);

  if (entry.registrations.length > 1) {
    duplicateGroups.push({
      eventId: entry.eventId,
      eventName: entry.eventName,
      roll: entry.roll,
      registrations: entry.registrations.map((reg) => reg.id),
      lockId,
      lockRegistrationId: lockSnap?.exists ? lockSnap.data()?.registrationId : null,
      canonicalRegistrationId: canonical.id
    });
  }

  if (!lockSnap || !lockSnap.exists) {
    missingLocks.push({
      lockId,
      eventId: entry.eventId,
      roll: entry.roll,
      registrationId: canonical.id,
      createdAt: canonical.createdAt
    });
    continue;
  }

  const lockData = lockSnap.data() || {};
  const lockRegistrationId =
    typeof lockData.registrationId === 'string' ? lockData.registrationId : '';
  const knownRegistrationIds = new Set(entry.registrations.map((reg) => reg.id));
  if (!knownRegistrationIds.has(lockRegistrationId)) {
    staleLocks.push({
      lockId,
      eventId: entry.eventId,
      roll: entry.roll,
      lockRegistrationId,
      expectedRegistrationId: canonical.id,
      createdAt: canonical.createdAt
    });
  }
}

let writesQueued = 0;
let writesCommitted = 0;
let batch = db.batch();

const commitBatchIfNeeded = async (force = false) => {
  if (!force && writesQueued < MAX_BATCH_WRITES) {
    return;
  }
  if (writesQueued === 0) {
    return;
  }
  await batch.commit();
  writesCommitted += writesQueued;
  writesQueued = 0;
  batch = db.batch();
};

if (applyChanges) {
  const lockRepairInputs = [
    ...missingLocks,
    ...staleLocks.map((item) => ({
      lockId: item.lockId,
      eventId: item.eventId,
      roll: item.roll,
      registrationId: item.expectedRegistrationId,
      createdAt: item.createdAt
    }))
  ];

  for (const lock of lockRepairInputs) {
    const lockRef = db.collection(ROLL_LOCKS_COLLECTION).doc(lock.lockId);
    batch.set(lockRef, {
      eventId: lock.eventId,
      rollNumber: lock.roll,
      registrationId: lock.registrationId,
      createdAt: lock.createdAt || Date.now()
    });
    writesQueued += 1;
    await commitBatchIfNeeded();
  }

  await commitBatchIfNeeded(true);
}

console.log('=== Roll Lock Audit ===');
console.log(`Scanned registrations: ${scannedRegistrations}`);
console.log(`Scanned roll entries: ${scannedRollEntries}`);
console.log(`Skipped (missing eventId): ${skippedNoEvent}`);
console.log(`Unique event+roll keys: ${uniqueKeys.length}`);
console.log(`Duplicate event+roll groups: ${duplicateGroups.length}`);
console.log(`Missing lock docs: ${missingLocks.length}`);
console.log(`Stale/mismatched lock docs: ${staleLocks.length}`);
console.log(`Mode: ${applyChanges ? 'APPLY' : 'DRY-RUN'}`);
if (applyChanges) {
  console.log(`Lock writes committed: ${writesCommitted}`);
}

if (duplicateGroups.length > 0) {
  console.log('\nTop duplicate groups (first 20):');
  for (const item of duplicateGroups.slice(0, 20)) {
    console.log(
      JSON.stringify({
        eventId: item.eventId,
        eventName: item.eventName,
        roll: item.roll,
        registrations: item.registrations,
        lockRegistrationId: item.lockRegistrationId,
        canonicalRegistrationId: item.canonicalRegistrationId
      })
    );
  }
  console.log('\nNote: Audit/repair sets one lock per event+roll but does not delete duplicate registrations.');
}
