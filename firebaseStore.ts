import {
  collection,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  writeBatch,
  startAfter,
  where,
} from 'firebase/firestore';
import { app, hasFirebaseConfig } from './firebaseClient';
import { Event, EventCategory, EventStatus, Registration } from './types';

const EVENTS_COLLECTION = 'events';
const REGISTRATIONS_COLLECTION = 'registrations';
const REGISTRATION_ROLL_LOCKS_COLLECTION = 'registration_roll_locks';
const SYSTEM_SETTINGS_COLLECTION = 'system_settings';
const REGISTRATION_CONTROL_DOC = 'registration_control';
const db = app ? getFirestore(app) : null;
const DEFAULT_REGISTRATION_QUERY_LIMIT = 500;

export interface RegistrationControl {
  enabled: boolean;
  updatedAt?: number;
}

export interface RegistrationQueryOptions {
  limitCount?: number;
  cursor?: RegistrationPageCursor | null;
}

export interface RegistrationPageCursor {
  createdAt: number;
  id: string;
}

export interface RegistrationPageInfo {
  hasMore: boolean;
  nextCursor: RegistrationPageCursor | null;
}

export interface RegistrationsPage extends RegistrationPageInfo {
  registrations: Registration[];
}

export interface DeleteRegistrationsProgress {
  processedChunks: number;
  totalChunks: number;
  processedRegistrations: number;
  totalRegistrations: number;
  deletedCount: number;
}

export interface DeleteRegistrationsOptions {
  onProgress?: (progress: DeleteRegistrationsProgress) => void;
}

const DEFAULT_REGISTRATION_CONTROL: RegistrationControl = { enabled: true };

type RegistrationWritePayload = Omit<Registration, 'id'>;

const removeUndefinedDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedDeep(item));
  }

  if (value && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, itemValue] of Object.entries(value)) {
      if (itemValue !== undefined) {
        cleaned[key] = removeUndefinedDeep(itemValue);
      }
    }
    return cleaned;
  }

  return value;
};

const DEFAULT_EVENT_FALLBACK: Event = {
  id: 'event-placeholder',
  name: 'Untitled Event',
  category: EventCategory.NON_TECH,
  subCategory: 'NONE',
  description: '',
  maxTeamSize: 1,
  minTeamSize: 1,
  venue: 'TBD',
  date: 'TBD',
  time: 'TBD',
  status: 'OPEN'
};

const EVENT_STATUSES: EventStatus[] = [
  'OPEN',
  'CLOSED',
  'REGISTRATION_OPEN_SOON'
];

const toEventStatus = (value: unknown): EventStatus => {
  if (EVENT_STATUSES.includes(value as EventStatus)) {
    return value as EventStatus;
  }

  return 'OPEN';
};

const getRegistrationUnavailableMessage = (
  eventName: string,
  status: EventStatus
): string => {
  if (status === 'REGISTRATION_OPEN_SOON') {
    return `${eventName} registrations open soon. Please check back later.`;
  }

  return `Registrations are closed for ${eventName}.`;
};

const getGlobalRegistrationClosedMessage = (): string =>
  'Registrations are currently closed by admin.';

const toRegistrationControl = (raw: unknown): RegistrationControl => {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_REGISTRATION_CONTROL;
  }

  const source = raw as Record<string, unknown>;
  const enabled = source.enabled !== false;
  const updatedAt =
    typeof source.updatedAt === 'number' ? source.updatedAt : undefined;

  return { enabled, updatedAt };
};

const getNormalizedMemberRolls = (registration: Partial<Registration>): string[] => {
  const explicitRolls = Array.isArray(registration.memberRolls)
    ? registration.memberRolls
    : [];

  const derivedRolls = Array.isArray(registration.members)
    ? registration.members
        .map((member) => member.rollNumber)
        .filter((roll) => typeof roll === 'string')
    : [];

  const allRolls = [...explicitRolls, ...derivedRolls]
    .map((roll) => roll.trim())
    .filter((roll) => roll.length > 0);

  return Array.from(new Set(allRolls));
};

const getWriteMemberRolls = (
  registration: Pick<Registration, 'members'>
): string[] => {
  if (!Array.isArray(registration.members)) {
    return [];
  }

  const normalizedRolls = registration.members
    .map((member) => member.rollNumber)
    .filter((roll) => typeof roll === 'string')
    .map((roll) => roll.trim())
    .filter((roll) => roll.length > 0);

  return Array.from(new Set(normalizedRolls));
};

const getRawMemberRolls = (
  registration: Pick<Registration, 'members'>
): string[] => {
  if (!Array.isArray(registration.members)) {
    return [];
  }

  return registration.members
    .map((member) => member.rollNumber)
    .filter((roll) => typeof roll === 'string')
    .map((roll) => roll.trim())
    .filter((roll) => roll.length > 0);
};

const hasDuplicateRolls = (rolls: string[]): boolean =>
  new Set(rolls).size !== rolls.length;

const getRegistrationDisplayName = (
  registration: Partial<Registration>
): string => {
  if (typeof registration.teamName === 'string' && registration.teamName.trim()) {
    return registration.teamName.trim();
  }

  if (Array.isArray(registration.members)) {
    const firstNamedMember = registration.members.find(
      (member) =>
        typeof member?.name === 'string' && member.name.trim().length > 0
    );
    if (firstNamedMember?.name) {
      return firstNamedMember.name.trim();
    }
  }

  return 'another team';
};

const isPermissionDeniedFirestoreError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const source = error as { code?: unknown; message?: unknown };
  const code = typeof source.code === 'string' ? source.code.toLowerCase() : '';
  const message =
    typeof source.message === 'string' ? source.message.toLowerCase() : '';

  return (
    code.includes('permission-denied') ||
    message.includes('missing or insufficient permissions') ||
    message.includes('permission denied')
  );
};

const toSafeEvent = (
  eventId: string,
  rawValue: Partial<Event>,
  knownDefaults: Map<string, Event>
): Event => {
  const fallback = knownDefaults.get(eventId) || {
    ...DEFAULT_EVENT_FALLBACK,
    id: eventId,
    name: rawValue.name || eventId
  };

  return {
    ...fallback,
    id: eventId,
    // Keep status remotely controllable, but lock all other event fields to curated defaults.
    status: toEventStatus(rawValue.status ?? fallback.status)
  };
};

const toRegistration = (registrationId: string, raw: Partial<Registration>): Registration => {
  const source = raw as Record<string, unknown>;

  const pickFirstString = (...values: unknown[]): string | undefined => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    return undefined;
  };

  const createdAt =
    typeof raw.createdAt === 'number'
      ? raw.createdAt
      : Date.parse(raw.timestamp || '') || Date.now();

  return {
    id: registrationId,
    eventId: typeof raw.eventId === 'string' ? raw.eventId : '',
    eventName: typeof raw.eventName === 'string' ? raw.eventName : 'Unknown Event',
    teamName: typeof raw.teamName === 'string' ? raw.teamName : undefined,
    alternatePhone:
      typeof raw.alternatePhone === 'string' ? raw.alternatePhone : undefined,
    instagramLink: pickFirstString(
      source.instagramLink,
      source.instagramMemeLink,
      source.instagramReelLink,
      source.instagramUrl
    ),
    driveLink: pickFirstString(
      source.driveLink,
      source.googleDriveLink,
      source.photoDriveLink,
      source.posterDriveLink
    ),
    ideaText: pickFirstString(source.ideaText, source.idea, source.departmentIdea),
    substituteName:
      typeof raw.substituteName === 'string' ? raw.substituteName : undefined,
    members: Array.isArray(raw.members) ? raw.members : [],
    memberRolls: getNormalizedMemberRolls(raw),
    timestamp:
      typeof raw.timestamp === 'string'
        ? raw.timestamp
        : new Date(createdAt).toLocaleString(),
    createdAt
  };
};

const getRegistrationsLimitCount = (options: RegistrationQueryOptions): number => {
  return typeof options.limitCount === 'number' && options.limitCount > 0
    ? Math.floor(options.limitCount)
    : DEFAULT_REGISTRATION_QUERY_LIMIT;
};

const toRegistrationsPage = (
  fetchedRegistrations: Registration[],
  limitCount: number
): RegistrationsPage => {
  const hasMore = fetchedRegistrations.length > limitCount;
  const registrations = hasMore
    ? fetchedRegistrations.slice(0, limitCount)
    : fetchedRegistrations;
  const lastRegistration = registrations[registrations.length - 1];

  return {
    registrations,
    hasMore,
    nextCursor:
      hasMore && lastRegistration
        ? { createdAt: lastRegistration.createdAt, id: lastRegistration.id }
        : null
  };
};

const buildRegistrationsQuery = (
  options: RegistrationQueryOptions
) => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const limitCount = getRegistrationsLimitCount(options);
  const registrationsCollection = collection(db, REGISTRATIONS_COLLECTION);

  if (
    options.cursor &&
    typeof options.cursor.createdAt === 'number' &&
    typeof options.cursor.id === 'string' &&
    options.cursor.id.length > 0
  ) {
    return query(
      registrationsCollection,
      orderBy('createdAt', 'desc'),
      orderBy(documentId(), 'desc'),
      startAfter(options.cursor.createdAt, options.cursor.id),
      limit(limitCount + 1)
    );
  }

  return query(
    registrationsCollection,
    orderBy('createdAt', 'desc'),
    orderBy(documentId(), 'desc'),
    limit(limitCount + 1)
  );
};

const getRollLockDocId = (eventId: string, rollNumber: string): string =>
  `${eventId}_${rollNumber}`;

const getRegistrationWritePayload = (
  registration: Registration,
  createdAtOverride?: number
): RegistrationWritePayload => {
  const createdAt =
    typeof createdAtOverride === 'number'
      ? createdAtOverride
      : typeof registration.createdAt === 'number'
        ? registration.createdAt
        : Date.parse(registration.timestamp) || Date.now();

  return removeUndefinedDeep({
    eventId: registration.eventId,
    eventName: registration.eventName,
    teamName: registration.teamName,
    alternatePhone: registration.alternatePhone,
    instagramLink: registration.instagramLink,
    driveLink: registration.driveLink,
    ideaText: registration.ideaText,
    substituteName: registration.substituteName,
    members: registration.members,
    memberRolls: getWriteMemberRolls(registration),
    timestamp: registration.timestamp,
    createdAt
  }) as RegistrationWritePayload;
};

export const isFirebaseEnabled = (): boolean => hasFirebaseConfig && db !== null;

export const fetchEvents = async (fallbackEvents: Event[]): Promise<Event[]> => {
  if (!db) return fallbackEvents;

  const defaultsById = new Map(fallbackEvents.map((event) => [event.id, event]));
  const snapshot = await getDocs(collection(db, EVENTS_COLLECTION));

  if (snapshot.empty) {
    return fallbackEvents;
  }

  const remoteById = new Map(
    snapshot.docs.map((eventDoc) => [eventDoc.id, eventDoc.data() as Partial<Event>])
  );

  return fallbackEvents.map((fallbackEvent) =>
    toSafeEvent(
      fallbackEvent.id,
      remoteById.get(fallbackEvent.id) ?? {},
      defaultsById
    )
  );
};

export const subscribeEvents = (
  fallbackEvents: Event[],
  onNext: (events: Event[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!db) {
    onNext(fallbackEvents);
    return () => undefined;
  }

  const defaultsById = new Map(fallbackEvents.map((event) => [event.id, event]));

  const unsubscribe = onSnapshot(
    collection(db, EVENTS_COLLECTION),
    (snapshot) => {
      if (snapshot.empty) {
        onNext(fallbackEvents);
        return;
      }

      const remoteById = new Map(
        snapshot.docs.map((eventDoc) => [eventDoc.id, eventDoc.data() as Partial<Event>])
      );

      const mergedEvents = fallbackEvents.map((fallbackEvent) =>
        toSafeEvent(
          fallbackEvent.id,
          remoteById.get(fallbackEvent.id) ?? {},
          defaultsById
        )
      );

      onNext(mergedEvents);
    },
    (error) => {
      if (onError) {
        onError(error as Error);
      }
    }
  );

  return unsubscribe;
};

export const fetchRegistrations = async (
  options: RegistrationQueryOptions = {}
): Promise<Registration[]> => {
  const page = await fetchRegistrationsPage(options);
  return page.registrations;
};

export const fetchRegistrationsPage = async (
  options: RegistrationQueryOptions = {}
): Promise<RegistrationsPage> => {
  if (!db) {
    return {
      registrations: [],
      hasMore: false,
      nextCursor: null
    };
  }

  const limitCount = getRegistrationsLimitCount(options);
  const snapshot = await getDocs(buildRegistrationsQuery(options));
  const fetchedRegistrations = snapshot.docs.map((regDoc) =>
    toRegistration(regDoc.id, regDoc.data() as Partial<Registration>)
  );

  return toRegistrationsPage(fetchedRegistrations, limitCount);
};

export const fetchRegistrationsCount = async (): Promise<number> => {
  if (!db) return 0;

  const registrationsCollection = collection(db, REGISTRATIONS_COLLECTION);
  const countSnapshot = await getCountFromServer(registrationsCollection);
  return countSnapshot.data().count;
};

export const fetchRegistrationsCountByEvent = async (
  eventId: string
): Promise<number> => {
  if (!db) return 0;

  const normalizedEventId = eventId.trim();
  if (!normalizedEventId) {
    return 0;
  }

  const registrationsCollection = collection(db, REGISTRATIONS_COLLECTION);
  const countSnapshot = await getCountFromServer(
    query(registrationsCollection, where('eventId', '==', normalizedEventId))
  );
  return countSnapshot.data().count;
};

const matchesRegistrationSearch = (
  registration: Registration,
  normalizedSearchTerm: string
): boolean => {
  if (!normalizedSearchTerm) {
    return true;
  }

  const teamName = (registration.teamName || '').toLowerCase();
  if (teamName.includes(normalizedSearchTerm)) {
    return true;
  }

  return registration.members.some((member) =>
    member.rollNumber.toLowerCase().includes(normalizedSearchTerm)
  );
};

export const fetchRegistrationsCountByFilter = async (
  eventId: string | null,
  searchTerm: string
): Promise<number> => {
  if (!db) {
    return 0;
  }

  const normalizedEventId =
    typeof eventId === 'string' ? eventId.trim() : '';
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  if (!normalizedSearchTerm) {
    if (normalizedEventId) {
      return fetchRegistrationsCountByEvent(normalizedEventId);
    }
    return fetchRegistrationsCount();
  }

  const registrationsCollection = collection(db, REGISTRATIONS_COLLECTION);
  const sourceQuery = normalizedEventId
    ? query(
        registrationsCollection,
        where('eventId', '==', normalizedEventId),
        orderBy('createdAt', 'desc')
      )
    : query(registrationsCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(sourceQuery);

  return snapshot.docs.reduce((count, regDoc) => {
    const registration = toRegistration(
      regDoc.id,
      regDoc.data() as Partial<Registration>
    );
    return matchesRegistrationSearch(registration, normalizedSearchTerm)
      ? count + 1
      : count;
  }, 0);
};

const getRegistrationSortValue = (registration: Registration): number => {
  if (typeof registration.createdAt === 'number') {
    return registration.createdAt;
  }

  const parsedTimestamp = Date.parse(registration.timestamp || '');
  return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
};

export const fetchRegistrationsByFilter = async (
  eventId: string | null,
  searchTerm: string
): Promise<Registration[]> => {
  if (!db) {
    return [];
  }

  const normalizedEventId =
    typeof eventId === 'string' ? eventId.trim() : '';
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const registrationsCollection = collection(db, REGISTRATIONS_COLLECTION);
  const sourceQuery = normalizedEventId
    ? query(registrationsCollection, where('eventId', '==', normalizedEventId))
    : registrationsCollection;
  const snapshot = await getDocs(sourceQuery);

  return snapshot.docs
    .map((regDoc) =>
      toRegistration(regDoc.id, regDoc.data() as Partial<Registration>)
    )
    .filter((registration) =>
      matchesRegistrationSearch(registration, normalizedSearchTerm)
    )
    .sort(
      (left, right) =>
        getRegistrationSortValue(right) - getRegistrationSortValue(left)
    );
};

export const subscribeRegistrations = (
  onNext: (
    registrations: Registration[],
    pageInfo?: RegistrationPageInfo,
    metadata?: { fromCache: boolean }
  ) => void,
  onError?: (error: Error) => void,
  options: RegistrationQueryOptions = {}
): (() => void) => {
  if (!db) {
    onNext([], { hasMore: false, nextCursor: null }, { fromCache: true });
    return () => undefined;
  }

  const limitCount = getRegistrationsLimitCount(options);
  const registrationsQuery = buildRegistrationsQuery(options);

  const unsubscribe = onSnapshot(
    registrationsQuery,
    (snapshot) => {
      const fetchedRegistrations = snapshot.docs.map((regDoc) =>
        toRegistration(regDoc.id, regDoc.data() as Partial<Registration>)
      );
      const page = toRegistrationsPage(fetchedRegistrations, limitCount);
      onNext(page.registrations, {
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      }, {
        fromCache: snapshot.metadata.fromCache
      });
    },
    (error) => {
      if (onError) {
        onError(error as Error);
      }
    }
  );

  return unsubscribe;
};

export const createRegistration = async (registration: Registration): Promise<string> => {
  if (!db) throw new Error('Firebase is not configured.');
  if (typeof registration.eventId !== 'string' || registration.eventId.trim().length === 0) {
    throw new Error('Invalid event selected. Please close and reopen registration.');
  }

  const rawMemberRolls = getRawMemberRolls(registration);
  if (hasDuplicateRolls(rawMemberRolls)) {
    throw new Error('Duplicate roll numbers are not allowed in the same event.');
  }

  const createdAt =
    typeof registration.createdAt === 'number'
      ? registration.createdAt
      : Date.parse(registration.timestamp) || Date.now();

  const payload = getRegistrationWritePayload(registration, createdAt);
  const memberRolls = payload.memberRolls || [];

  if (memberRolls.length === 0) {
    throw new Error('Registration must include at least one valid roll number.');
  }

  let registrationId = '';

  const duplicateMessageForRoll = (rollNumber: string): string =>
    `Reg no ${rollNumber} is already registered for this event.`;

  try {
    await runTransaction(db, async (transaction) => {
      const registrationControlRef = doc(
        db,
        SYSTEM_SETTINGS_COLLECTION,
        REGISTRATION_CONTROL_DOC
      );
      const eventRef = doc(db, EVENTS_COLLECTION, payload.eventId);

      const registrationControlSnapshot = await transaction.get(
        registrationControlRef
      );
      const eventSnapshot = await transaction.get(eventRef);

      const registrationControl = registrationControlSnapshot.exists()
        ? toRegistrationControl(registrationControlSnapshot.data())
        : DEFAULT_REGISTRATION_CONTROL;

      if (!registrationControl.enabled) {
        throw new Error(getGlobalRegistrationClosedMessage());
      }

      if (!eventSnapshot.exists()) {
        throw new Error('This event is no longer available.');
      }

      const eventData = eventSnapshot.data() as Partial<Event>;
      const eventStatus = toEventStatus(eventData.status);
      if (eventStatus !== 'OPEN') {
        const eventName =
          typeof eventData.name === 'string' ? eventData.name : payload.eventName;
        throw new Error(getRegistrationUnavailableMessage(eventName, eventStatus));
      }

      for (const rollNumber of memberRolls) {
        const lockRef = doc(
          db,
          REGISTRATION_ROLL_LOCKS_COLLECTION,
          getRollLockDocId(payload.eventId, rollNumber)
        );
        const lockSnapshot = await transaction.get(lockRef);
        if (lockSnapshot.exists()) {
          throw new Error(duplicateMessageForRoll(rollNumber));
        }
      }

      const registrationRef = doc(collection(db, REGISTRATIONS_COLLECTION));
      registrationId = registrationRef.id;
      transaction.set(registrationRef, { ...payload, createdAt });

      for (const rollNumber of memberRolls) {
        const lockRef = doc(
          db,
          REGISTRATION_ROLL_LOCKS_COLLECTION,
          getRollLockDocId(payload.eventId, rollNumber)
        );
        transaction.set(lockRef, {
          eventId: payload.eventId,
          rollNumber,
          registrationId,
          createdAt
        });
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    if (isPermissionDeniedFirestoreError(error)) {
      throw new Error('Registration is temporarily unavailable. Please try again.');
    }
    throw error;
  }

  if (!registrationId) {
    throw new Error('Registration failed. Please try again.');
  }

  return registrationId;
};

export const updateRegistration = async (
  registration: Registration
): Promise<void> => {
  if (!db) throw new Error('Firebase is not configured.');
  if (typeof registration.eventId !== 'string' || registration.eventId.trim().length === 0) {
    throw new Error('Invalid event selected. Please close and reopen registration.');
  }

  const rawMemberRolls = getRawMemberRolls(registration);
  if (hasDuplicateRolls(rawMemberRolls)) {
    throw new Error('Duplicate roll numbers are not allowed in the same event.');
  }

  const payload = getRegistrationWritePayload(registration);
  const registrationRef = doc(db, REGISTRATIONS_COLLECTION, registration.id);

  await runTransaction(db, async (transaction) => {
    const existingSnapshot = await transaction.get(registrationRef);
    if (!existingSnapshot.exists()) {
      throw new Error('Registration not found.');
    }

    const existing = existingSnapshot.data() as Partial<Registration>;
    const existingEventId =
      typeof existing.eventId === 'string' ? existing.eventId : payload.eventId;
    const oldMemberRolls = getNormalizedMemberRolls(existing);
    const newMemberRolls = payload.memberRolls || [];

    const removeLocks =
      existingEventId === payload.eventId
        ? oldMemberRolls.filter((roll) => !newMemberRolls.includes(roll)).map((roll) => ({
            eventId: existingEventId,
            roll
          }))
        : oldMemberRolls.map((roll) => ({ eventId: existingEventId, roll }));

    const addLocks =
      existingEventId === payload.eventId
        ? newMemberRolls.filter((roll) => !oldMemberRolls.includes(roll)).map((roll) => ({
            eventId: payload.eventId,
            roll
          }))
        : newMemberRolls.map((roll) => ({ eventId: payload.eventId, roll }));

    for (const { eventId, roll } of addLocks) {
      const lockRef = doc(
        db,
        REGISTRATION_ROLL_LOCKS_COLLECTION,
        getRollLockDocId(eventId, roll)
      );
      const lockSnapshot = await transaction.get(lockRef);
      if (
        lockSnapshot.exists() &&
        lockSnapshot.data().registrationId !== registration.id
      ) {
        const conflictingRegistrationId = lockSnapshot.data().registrationId;
        const conflictingRegistrationRef = doc(
          db,
          REGISTRATIONS_COLLECTION,
          conflictingRegistrationId
        );
        const conflictingRegistrationSnapshot = await transaction.get(
          conflictingRegistrationRef
        );
        const conflictingRegistration = conflictingRegistrationSnapshot.exists()
          ? (conflictingRegistrationSnapshot.data() as Partial<Registration>)
          : {};
        const conflictingTeam = getRegistrationDisplayName(
          conflictingRegistration
        );
        throw new Error(
          `Reg no ${roll} is already registered in team ${conflictingTeam}.`
        );
      }
    }

    transaction.update(registrationRef, payload);

    for (const { eventId, roll } of removeLocks) {
      const lockRef = doc(
        db,
        REGISTRATION_ROLL_LOCKS_COLLECTION,
        getRollLockDocId(eventId, roll)
      );
      transaction.delete(lockRef);
    }

    for (const { eventId, roll } of addLocks) {
      const lockRef = doc(
        db,
        REGISTRATION_ROLL_LOCKS_COLLECTION,
        getRollLockDocId(eventId, roll)
      );
      transaction.set(lockRef, {
        eventId,
        rollNumber: roll,
        registrationId: registration.id,
        createdAt: payload.createdAt
      });
    }
  });
};

export const deleteRegistration = async (registrationId: string): Promise<void> => {
  if (!db) throw new Error('Firebase is not configured.');

  const registrationRef = doc(db, REGISTRATIONS_COLLECTION, registrationId);
  const existingSnapshot = await getDoc(registrationRef);
  if (!existingSnapshot.exists()) {
    return;
  }

  const existing = existingSnapshot.data() as Partial<Registration>;
  const eventId = typeof existing.eventId === 'string' ? existing.eventId : '';
  const memberRolls = getNormalizedMemberRolls(existing);

  const batch = writeBatch(db);
  batch.delete(registrationRef);

  for (const rollNumber of memberRolls) {
    if (!eventId) continue;
    const lockRef = doc(
      db,
      REGISTRATION_ROLL_LOCKS_COLLECTION,
      getRollLockDocId(eventId, rollNumber)
    );
    batch.delete(lockRef);
  }

  await batch.commit();
};

// Batch delete multiple registrations at once
export const deleteRegistrations = async (
  registrationIds: string[],
  options: DeleteRegistrationsOptions = {}
): Promise<{ deletedCount: number; errors: string[] }> => {
  if (!db) throw new Error('Firebase is not configured.');
  
  if (!registrationIds || registrationIds.length === 0) {
    return { deletedCount: 0, errors: [] };
  }

  const errors: string[] = [];
  let deletedCount = 0;

  // A registration can generate up to 16 delete operations (registration + 15 locks).
  // Keep chunks small enough to stay well under Firestore's 500 writes/batch limit.
  const CHUNK_SIZE = 20;
  const MAX_CONCURRENT_CHUNKS = 4;
  const chunks: string[][] = [];

  for (let i = 0; i < registrationIds.length; i += CHUNK_SIZE) {
    chunks.push(registrationIds.slice(i, i + CHUNK_SIZE));
  }

  const totalChunks = chunks.length;
  const totalRegistrations = registrationIds.length;
  let processedChunks = 0;
  let processedRegistrations = 0;

  options.onProgress?.({
    processedChunks,
    totalChunks,
    processedRegistrations,
    totalRegistrations,
    deletedCount
  });

  let nextChunkIndex = 0;

  const processChunk = async (
    chunkIds: string[],
    chunkNumber: number
  ): Promise<void> => {
    try {
      const registrationsToDelete = (
        await Promise.all(
          chunkIds.map(async (registrationId) => {
            const registrationRef = doc(db, REGISTRATIONS_COLLECTION, registrationId);
            const existingSnapshot = await getDoc(registrationRef);

            if (!existingSnapshot.exists()) {
              return null;
            }

            const existing = existingSnapshot.data() as Partial<Registration>;
            return {
              registrationId,
              eventId:
                typeof existing.eventId === 'string' ? existing.eventId : '',
              memberRolls: getNormalizedMemberRolls(existing)
            };
          })
        )
      ).filter(
        (
          item
        ): item is {
          registrationId: string;
          eventId: string;
          memberRolls: string[];
        } => item !== null
      );

      if (registrationsToDelete.length === 0) {
        return;
      }

      const batch = writeBatch(db);

      for (const { registrationId, eventId, memberRolls } of registrationsToDelete) {
        const registrationRef = doc(db, REGISTRATIONS_COLLECTION, registrationId);
        batch.delete(registrationRef);

        for (const rollNumber of memberRolls) {
          if (!eventId) continue;
          const lockRef = doc(
            db,
            REGISTRATION_ROLL_LOCKS_COLLECTION,
            getRollLockDocId(eventId, rollNumber)
          );
          batch.delete(lockRef);
        }
      }

      await batch.commit();
      deletedCount += registrationsToDelete.length;
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`Chunk ${chunkNumber}: ${error.message}`);
      } else {
        errors.push(`Chunk ${chunkNumber}: Unknown error`);
      }
    } finally {
      processedChunks += 1;
      processedRegistrations += chunkIds.length;
      options.onProgress?.({
        processedChunks,
        totalChunks,
        processedRegistrations,
        totalRegistrations,
        deletedCount
      });
    }
  };

  const workerCount = Math.min(MAX_CONCURRENT_CHUNKS, chunks.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const chunkIndex = nextChunkIndex;
      nextChunkIndex += 1;

      if (chunkIndex >= chunks.length) {
        return;
      }

      const chunkIds = chunks[chunkIndex];
      await processChunk(chunkIds, chunkIndex + 1);
    }
  });

  await Promise.all(workers);

  return { deletedCount, errors };
};

export const updateEvent = async (event: Event): Promise<void> => {
  if (!db) throw new Error('Firebase is not configured.');
  await setDoc(doc(db, EVENTS_COLLECTION, event.id), event, { merge: true });
};

export const fetchRegistrationControl = async (): Promise<RegistrationControl> => {
  if (!db) return DEFAULT_REGISTRATION_CONTROL;

  const settingsDoc = await getDoc(
    doc(db, SYSTEM_SETTINGS_COLLECTION, REGISTRATION_CONTROL_DOC)
  );

  if (!settingsDoc.exists()) {
    return DEFAULT_REGISTRATION_CONTROL;
  }

  return toRegistrationControl(settingsDoc.data());
};

export const subscribeRegistrationControl = (
  onNext: (control: RegistrationControl) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!db) {
    onNext(DEFAULT_REGISTRATION_CONTROL);
    return () => undefined;
  }

  const unsubscribe = onSnapshot(
    doc(db, SYSTEM_SETTINGS_COLLECTION, REGISTRATION_CONTROL_DOC),
    (snapshot) => {
      if (!snapshot.exists()) {
        onNext(DEFAULT_REGISTRATION_CONTROL);
        return;
      }

      onNext(toRegistrationControl(snapshot.data()));
    },
    (error) => {
      if (onError) {
        onError(error as Error);
      }
    }
  );

  return unsubscribe;
};

export const updateRegistrationControl = async (enabled: boolean): Promise<void> => {
  if (!db) throw new Error('Firebase is not configured.');

  await setDoc(
    doc(db, SYSTEM_SETTINGS_COLLECTION, REGISTRATION_CONTROL_DOC),
    {
      enabled,
      updatedAt: Date.now()
    },
    { merge: true }
  );
};
