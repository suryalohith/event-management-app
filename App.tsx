import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  ViewState,
  Event,
  Registration,
  EventCategory,
  SportsSubCategory
} from './types';
import { INITIAL_EVENTS } from './constants';
import { INSTAGRAM_URL } from './appConfig';
import Navbar from './components/Navbar';
import HomeView from './components/HomeView';
import ScheduleView from './components/ScheduleView';
import EventsView from './components/EventsView';
import RegistrationForm from './components/RegistrationForm';
import IntroView from './components/IntroView';
import AuraxBot from './components/AuraxBot';

const AdminView = lazy(() => import('./components/AdminView'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));

type FirebaseAuthModule = typeof import('./firebaseAuth');
type FirebaseStoreModule = typeof import('./firebaseStore');

let firebaseAuthModulePromise: Promise<FirebaseAuthModule> | null = null;
let firebaseStoreModulePromise: Promise<FirebaseStoreModule> | null = null;

const loadFirebaseAuthModule = (): Promise<FirebaseAuthModule> => {
  if (!firebaseAuthModulePromise) {
    firebaseAuthModulePromise = import('./firebaseAuth');
  }
  return firebaseAuthModulePromise;
};

const loadFirebaseStoreModule = (): Promise<FirebaseStoreModule> => {
  if (!firebaseStoreModulePromise) {
    firebaseStoreModulePromise = import('./firebaseStore');
  }
  return firebaseStoreModulePromise;
};

const isFirebaseConfigured = (): boolean => {
  const requiredValues = [
    import.meta.env.VITE_FIREBASE_API_KEY,
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    import.meta.env.VITE_FIREBASE_APP_ID
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

  return requiredValues.every(
    (value) =>
      typeof value === 'string' &&
      value.trim().length > 0 &&
      !isPlaceholderValue(value)
  );
};

const getRegistrationUnavailableMessage = (event: Event): string => {
  if (event.status === 'REGISTRATION_OPEN_SOON') {
    return `${event.name} registrations open soon. Please check back later.`;
  }

  return `Registrations are closed for ${event.name}.`;
};

const getGlobalRegistrationUnavailableMessage = (): string =>
  'Registrations are currently closed by admin.';

const getRegistrationServiceUnavailableMessage = (): string =>
  'Registration service is not configured. Please contact admin.';

const isPermissionDeniedError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const errorObject = error as { code?: unknown; message?: unknown };
  const code =
    typeof errorObject.code === 'string' ? errorObject.code.toLowerCase() : '';
  const message =
    typeof errorObject.message === 'string'
      ? errorObject.message.toLowerCase()
      : '';

  return (
    code.includes('permission-denied') ||
    message.includes('missing or insufficient permissions')
  );
};

const getNormalizedRegistrationRolls = (registration: Registration): string[] => {
  const explicitRolls = Array.isArray(registration.memberRolls)
    ? registration.memberRolls
    : [];

  const memberRolls = Array.isArray(registration.members)
    ? registration.members.map((member) => member.rollNumber)
    : [];

  return Array.from(
    new Set(
      [...explicitRolls, ...memberRolls]
        .map((roll) => (typeof roll === 'string' ? roll.trim() : ''))
        .filter((roll) => roll.length > 0)
    )
  );
};

const LOCAL_STORAGE_SYNC_DEBOUNCE_MS = 350;
const REGISTRATIONS_REALTIME_LIMIT = 500;
const REGISTRATION_COUNT_POLL_INTERVAL_MS = 45000;
const INTRO_SESSION_FLAG_KEY = 'aurax_intro_shown';
const REGISTRATION_EVENT_QUERY_KEY = 'event';

type RegistrationPageCursor = {
  createdAt: number;
  id: string;
};

type RegistrationPageMeta = {
  hasMore: boolean;
  nextCursor: RegistrationPageCursor | null;
};

type DeleteRegistrationsProgress = {
  processedChunks: number;
  totalChunks: number;
  processedRegistrations: number;
  totalRegistrations: number;
  deletedCount: number;
};

type DeleteRegistrationsOptions = {
  onProgress?: (progress: DeleteRegistrationsProgress) => void;
};

const getRegistrationEventFromUrl = (): string => {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(REGISTRATION_EVENT_QUERY_KEY);
  return typeof raw === 'string' ? raw.trim() : '';
};

const getSessionFlag = (key: string): boolean => {
  try {
    return window.sessionStorage.getItem(key) === 'true';
  } catch (error) {
    console.warn(`[Storage] Unable to read session key "${key}".`, error);
    return false;
  }
};

const setSessionFlag = (key: string): void => {
  try {
    window.sessionStorage.setItem(key, 'true');
  } catch (error) {
    console.warn(`[Storage] Unable to write session key "${key}".`, error);
  }
};

const mergeEventsWithDefaults = (sourceEvents: unknown): Event[] => {
  if (!Array.isArray(sourceEvents)) {
    return INITIAL_EVENTS;
  }

  const sourceById = new Map(
    sourceEvents
      .filter(
        (event): event is Partial<Event> & { id: string } =>
          Boolean(
            event &&
            typeof event === 'object' &&
            'id' in event &&
            typeof (event as { id?: unknown }).id === 'string'
          )
      )
      .map((event) => [event.id, event])
  );

  const toEventStatus = (value: unknown): Event['status'] | null => {
    if (
      value === 'OPEN' ||
      value === 'CLOSED' ||
      value === 'REGISTRATION_OPEN_SOON'
    ) {
      return value;
    }
    return null;
  };

  return INITIAL_EVENTS.map((defaultEvent) => {
    const sourceEvent = sourceById.get(defaultEvent.id);
    if (!sourceEvent) {
      return defaultEvent;
    }

    const sourceStatus = toEventStatus(sourceEvent.status);
    return {
      ...defaultEvent,
      status: sourceStatus ?? defaultEvent.status
    };
  });
};

const areEventsEquivalent = (a: Event[], b: Event[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!right) return false;

    if (
      left.id !== right.id ||
      left.status !== right.status ||
      left.name !== right.name
    ) {
      return false;
    }
  }

  return true;
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
  const [eventsViewCategory, setEventsViewCategory] = useState<EventCategory>(
    EventCategory.TECH
  );
  const [eventsViewSportsType, setEventsViewSportsType] =
    useState<SportsSubCategory>('NONE');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [pagedRegistrations, setPagedRegistrations] = useState<Registration[]>([]);
  const [pagedRegistrationsByPage, setPagedRegistrationsByPage] = useState<
    Record<number, Registration[]>
  >({});
  const [registrationsPageInfoByPage, setRegistrationsPageInfoByPage] =
    useState<Record<number, RegistrationPageMeta>>({});
  const [totalRegistrationsCount, setTotalRegistrationsCount] = useState(0);
  const [registrationPageNumber, setRegistrationPageNumber] = useState(1);
  const [hasNextRegistrationsPage, setHasNextRegistrationsPage] = useState(false);
  const [nextRegistrationsCursor, setNextRegistrationsCursor] =
    useState<RegistrationPageCursor | null>(null);
  const [isLoadingNextRegistrationsPage, setIsLoadingNextRegistrationsPage] =
    useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [registrationsLive, setRegistrationsLive] = useState(true);
  const [hasSeenIntro, setHasSeenIntro] = useState(() => {
    // Check if intro has been shown in this session (storage-safe for mobile/private modes)
    return getSessionFlag(INTRO_SESSION_FLAG_KEY);
  });
  const [registrationEventIdFromUrl, setRegistrationEventIdFromUrl] = useState(
    () => getRegistrationEventFromUrl()
  );
  const firebaseEnabled = isFirebaseConfigured();
  const isShowingPagedRegistrations = registrationPageNumber > 1;
  const isShowingPagedRegistrationsRef = useRef(false);

  const currentPage = new URLSearchParams(window.location.search).get('page');
  const showAdminLogin = currentPage === 'admin-login';
  const isAdminRoute = currentPage === 'admin' || currentPage === 'admin-login';

  const setRegistrationEventInUrl = (eventId: string | null): void => {
    const url = new URL(window.location.href);

    if (eventId && eventId.trim().length > 0) {
      url.searchParams.set(REGISTRATION_EVENT_QUERY_KEY, eventId.trim());
    } else {
      url.searchParams.delete(REGISTRATION_EVENT_QUERY_KEY);
    }

    const nextSearch = url.searchParams.toString();
    const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
    window.history.replaceState({}, '', nextUrl);
    setRegistrationEventIdFromUrl(eventId ? eventId.trim() : '');
  };

  const syncEventsViewFilterToEvent = (event: Event): void => {
    if (event.category !== EventCategory.SPORTS) {
      setEventsViewCategory(event.category);
      setEventsViewSportsType('NONE');
      return;
    }

    setEventsViewCategory(EventCategory.SPORTS);
    setEventsViewSportsType(event.subCategory);
  };

  const openRegistrationForEvent = (
    event: Event,
    options?: { syncUrl?: boolean }
  ) => {
    if (options?.syncUrl !== false) {
      setRegistrationEventInUrl(event.id);
    }
    syncEventsViewFilterToEvent(event);
    setSelectedEvent(event);
    setView('REGISTRATION');
  };

  const navigateToEventsView = (options?: { preserveLink?: boolean }) => {
    if (!options?.preserveLink) {
      setRegistrationEventInUrl(null);
    }
    setSelectedEvent(null);
    setView('EVENTS');
  };

  const handleViewChange = (nextView: ViewState) => {
    if (nextView !== 'REGISTRATION') {
      setRegistrationEventInUrl(null);
      setSelectedEvent(null);
    }
    setView(nextView);
  };

  const handleEventsCategoryChange = (category: EventCategory): void => {
    setEventsViewCategory(category);
    if (category !== EventCategory.SPORTS) {
      setEventsViewSportsType('NONE');
    }
  };

  const handleEventsSportsTypeChange = (
    sportsType: SportsSubCategory
  ): void => {
    setEventsViewCategory(EventCategory.SPORTS);
    setEventsViewSportsType(sportsType);
  };

  const scrollToPageTop = (): void => {
    const useInstantScroll =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.innerWidth < 768;

    window.scrollTo({ top: 0, behavior: useInstantScroll ? 'auto' : 'smooth' });
  };

  // Keep admin auth state synced with Firebase Authentication + custom admin claim.
  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    if (!isAdminRoute) {
      setIsAuthReady(true);
      return () => {
        isCancelled = true;
      };
    }

    setIsAuthReady(false);

    const startObserver = async () => {
      try {
        const { observeAdminAuthState } = await loadFirebaseAuthModule();
        if (isCancelled) {
          return;
        }

        unsubscribe = observeAdminAuthState(({ isAdmin }) => {
          setIsAdminAuthenticated(isAdmin);
          setIsAuthReady(true);
        });
      } catch (error) {
        console.error('Failed to load admin auth module:', error);
        if (!isCancelled) {
          setIsAdminAuthenticated(false);
          setIsAuthReady(true);
        }
      }
    };

    void startObserver();

    return () => {
      isCancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAdminRoute]);

  // Route handling for admin pages.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');

    if (page === 'admin' || page === 'admin-login') {
      if (isAdminAuthenticated) {
        setView('ADMIN');
        if (page === 'admin-login') {
          window.history.replaceState({}, '', '/?page=admin');
        }
      } else if (isAuthReady && page === 'admin') {
        window.location.href = '/?page=admin-login';
      }
    }
  }, [isAdminAuthenticated, isAuthReady]);

  useEffect(() => {
    const handlePopState = () => {
      setRegistrationEventIdFromUrl(getRegistrationEventFromUrl());
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Ensure we start at the top when navigating between views
  useEffect(() => {
    scrollToPageTop();
  }, [view]);

  useEffect(() => {
    isShowingPagedRegistrationsRef.current = isShowingPagedRegistrations;
  }, [isShowingPagedRegistrations]);

  useEffect(() => {
    let isCancelled = false;
    let eventsUnsubscribe = () => undefined;
    let registrationsUnsubscribe = () => undefined;
    let registrationControlUnsubscribe = () => undefined;
    let registrationsCountPollTimer: number | null = null;

    const loadLocalData = () => {
      try {
        const savedRegs = localStorage.getItem('aurax_registrations');
        if (savedRegs && !isCancelled) {
          const parsedRegistrations = JSON.parse(savedRegs) as Registration[];
          setRegistrations(parsedRegistrations);
          setTotalRegistrationsCount(parsedRegistrations.length);
          setPagedRegistrations([]);
          setPagedRegistrationsByPage({});
          setRegistrationPageNumber(1);
          setHasNextRegistrationsPage(false);
          setNextRegistrationsCursor(null);
          setRegistrationsPageInfoByPage({
            1: { hasMore: false, nextCursor: null }
          });
        } else if (!savedRegs && !isCancelled) {
          setTotalRegistrationsCount(0);
          setPagedRegistrations([]);
          setPagedRegistrationsByPage({});
          setRegistrationPageNumber(1);
          setHasNextRegistrationsPage(false);
          setNextRegistrationsCursor(null);
          setRegistrationsPageInfoByPage({
            1: { hasMore: false, nextCursor: null }
          });
        }
      } catch (error) {
        console.error('Failed to parse registrations from localStorage:', error);
      }

      try {
        const savedEvents = localStorage.getItem('aurax_events');
        if (savedEvents && !isCancelled) {
          const parsedEvents = JSON.parse(savedEvents);
          setEvents(mergeEventsWithDefaults(parsedEvents));
        }
      } catch (error) {
        console.error('Failed to parse events from localStorage:', error);
      }
    };

    if (!firebaseEnabled) {
      if (import.meta.env.DEV) {
        loadLocalData();
      } else {
        // Production fallback: keep curated event list visible, disable live registrations.
        setEvents(INITIAL_EVENTS);
        setRegistrations([]);
        setPagedRegistrations([]);
        setPagedRegistrationsByPage({});
        setRegistrationPageNumber(1);
        setHasNextRegistrationsPage(false);
        setNextRegistrationsCursor(null);
        setRegistrationsPageInfoByPage({
          1: { hasMore: false, nextCursor: null }
        });
        setTotalRegistrationsCount(0);
        setRegistrationsLive(false);
      }
      return () => {
        isCancelled = true;
      };
    }

    const subscribeToFirebase = async () => {
      try {
        const {
          subscribeEvents,
          subscribeRegistrations,
          subscribeRegistrationControl,
          fetchRegistrationsCount
        } =
          await loadFirebaseStoreModule();
        if (isCancelled) {
          return;
        }

        eventsUnsubscribe = subscribeEvents(
          INITIAL_EVENTS,
          (remoteEvents) => {
            if (!isCancelled) {
              setEvents((previousEvents) =>
                areEventsEquivalent(previousEvents, remoteEvents)
                  ? previousEvents
                  : remoteEvents
              );
            }
          },
          (error) => {
            console.error('Live events subscription failed:', error);
          }
        );

        if (isAdminAuthenticated) {
          registrationsUnsubscribe = subscribeRegistrations(
            (remoteRegistrations, pageInfo, metadata) => {
              if (!isCancelled) {
                setRegistrations(remoteRegistrations);
                setRegistrationsPageInfoByPage((previousInfoByPage) => ({
                  ...previousInfoByPage,
                  1: {
                    hasMore: pageInfo?.hasMore ?? false,
                    nextCursor: pageInfo?.nextCursor ?? null
                  }
                }));
                if (!pageInfo?.hasMore && !metadata?.fromCache) {
                  setTotalRegistrationsCount(remoteRegistrations.length);
                }
                if (!isShowingPagedRegistrationsRef.current) {
                  setHasNextRegistrationsPage(pageInfo?.hasMore ?? false);
                  setNextRegistrationsCursor(pageInfo?.nextCursor ?? null);
                }
              }
            },
            (error) => {
              console.error('Live registrations subscription failed:', error);
            },
            { limitCount: REGISTRATIONS_REALTIME_LIMIT }
          );
        }

        const scheduleRegistrationsCountRefresh = () => {
          if (registrationsCountPollTimer !== null) {
            window.clearTimeout(registrationsCountPollTimer);
          }

          registrationsCountPollTimer = window.setTimeout(() => {
            void refreshRegistrationsCount();
          }, REGISTRATION_COUNT_POLL_INTERVAL_MS);
        };

        const refreshRegistrationsCount = async () => {
          try {
            const registrationsCount = await fetchRegistrationsCount();
            if (!isCancelled) {
              setTotalRegistrationsCount(registrationsCount);
              scheduleRegistrationsCountRefresh();
            }
          } catch (error) {
            if (isPermissionDeniedError(error)) {
              // Public clients may not have read access for aggregate counts.
              // Keep local optimistic count and skip polling until auth changes.
              return;
            }

            console.error('Failed to fetch registrations count:', error);
            if (!isCancelled) {
              scheduleRegistrationsCountRefresh();
            }
          }
        };

        void refreshRegistrationsCount();

        registrationControlUnsubscribe = subscribeRegistrationControl(
          (control) => {
            if (!isCancelled) {
              setRegistrationsLive(control.enabled);
            }
          },
          (error) => {
            console.error('Live registration control subscription failed:', error);
            if (!isCancelled) {
              // Fail-safe: close registrations in UI when live control cannot be verified.
              setRegistrationsLive(false);
            }
          }
        );
      } catch (error) {
        console.error('Failed to load firebase store module:', error);
      }
    };

    void subscribeToFirebase();

    return () => {
      isCancelled = true;
      if (registrationsCountPollTimer !== null) {
        window.clearTimeout(registrationsCountPollTimer);
      }
      eventsUnsubscribe();
      registrationsUnsubscribe();
      registrationControlUnsubscribe();
    };
  }, [firebaseEnabled, isAdminAuthenticated]);

  useEffect(() => {
    if (firebaseEnabled || !import.meta.env.DEV) {
      return;
    }

    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem('aurax_registrations', JSON.stringify(registrations));
      } catch (error) {
        console.warn('Failed to persist registrations to localStorage:', error);
      }
    }, LOCAL_STORAGE_SYNC_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [firebaseEnabled, registrations]);

  useEffect(() => {
    if (firebaseEnabled || !import.meta.env.DEV) {
      return;
    }

    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem('aurax_events', JSON.stringify(events));
      } catch (error) {
        console.warn('Failed to persist events to localStorage:', error);
      }
    }, LOCAL_STORAGE_SYNC_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [firebaseEnabled, events]);

  useEffect(() => {
    if (!firebaseEnabled) {
      return;
    }

    try {
      localStorage.removeItem('aurax_registrations');
      localStorage.removeItem('aurax_events');
    } catch (error) {
      console.warn('Failed to clear stale localStorage cache in Firebase mode:', error);
    }
  }, [firebaseEnabled]);

  useEffect(() => {
    if (!hasSeenIntro || isAdminRoute || !registrationEventIdFromUrl) {
      return;
    }

    const linkedEvent = events.find(
      (event) => event.id === registrationEventIdFromUrl
    );

    if (!linkedEvent) {
      setRegistrationEventInUrl(null);
      return;
    }

    if (!registrationsLive || linkedEvent.status !== 'OPEN') {
      navigateToEventsView();
      return;
    }

    if (view === 'REGISTRATION' && selectedEvent?.id === linkedEvent.id) {
      return;
    }

    openRegistrationForEvent(linkedEvent, { syncUrl: false });
  }, [
    events,
    hasSeenIntro,
    isAdminRoute,
    registrationEventIdFromUrl,
    registrationsLive,
    selectedEvent,
    view
  ]);

  useEffect(() => {
    if (!selectedEvent) return;

    if (view === 'REGISTRATION' && !registrationsLive) {
      alert(getGlobalRegistrationUnavailableMessage());
      navigateToEventsView();
      return;
    }

    const latestSelectedEvent = events.find((event) => event.id === selectedEvent.id);
    if (!latestSelectedEvent) return;

    if (latestSelectedEvent !== selectedEvent) {
      setSelectedEvent(latestSelectedEvent);
    }

    if (view === 'REGISTRATION' && latestSelectedEvent.status !== 'OPEN') {
      alert(getRegistrationUnavailableMessage(latestSelectedEvent));
      navigateToEventsView();
    }
  }, [events, selectedEvent, view, registrationsLive]);

  const handleRegisterClick = (event: Event) => {
    if (!firebaseEnabled && !import.meta.env.DEV) {
      alert(getRegistrationServiceUnavailableMessage());
      return;
    }

    if (!registrationsLive) {
      alert(getGlobalRegistrationUnavailableMessage());
      return;
    }

    if (event.status !== 'OPEN') {
      alert(getRegistrationUnavailableMessage(event));
      return;
    }

    openRegistrationForEvent(event);
  };

  const handleRegistrationSubmit = async (reg: Registration) => {
    try {
      if (!firebaseEnabled && !import.meta.env.DEV) {
        throw new Error(getRegistrationServiceUnavailableMessage());
      }

      if (!registrationsLive) {
        throw new Error(getGlobalRegistrationUnavailableMessage());
      }

      const latestEvent = events.find((event) => event.id === reg.eventId);

      if (!latestEvent) {
        throw new Error('This event is no longer available.');
      }

      if (latestEvent.status !== 'OPEN') {
        throw new Error(getRegistrationUnavailableMessage(latestEvent));
      }

      // In Firebase mode, rely on server-side roll-lock transaction checks to
      // avoid false positives from stale local state.
      if (!firebaseEnabled) {
        const submittedRolls = getNormalizedRegistrationRolls(reg);
        const duplicateRoll = registrations
          .filter((registration) => registration.eventId === reg.eventId)
          .flatMap((registration) => getNormalizedRegistrationRolls(registration))
          .find((roll) => submittedRolls.includes(roll));

        if (duplicateRoll) {
          throw new Error(
            `Reg no ${duplicateRoll} is already registered for this event.`
          );
        }
      }

      if (firebaseEnabled) {
        const { createRegistration } = await loadFirebaseStoreModule();
        const firebaseId = await createRegistration(reg);
        setRegistrations((prev) => [{ ...reg, id: firebaseId }, ...prev]);
        setTotalRegistrationsCount((previousCount) => previousCount + 1);
      } else {
        setRegistrations((prev) => [{ ...reg }, ...prev]);
        setTotalRegistrationsCount((previousCount) => previousCount + 1);
      }

      alert('Registration Confirmed! Welcome to AURAX-2026.');
    } catch (error) {
      console.error('Registration failed:', error);

      if (isPermissionDeniedError(error)) {
        const latestEvent = events.find((event) => event.id === reg.eventId);

        if (!registrationsLive) {
          throw new Error(getGlobalRegistrationUnavailableMessage());
        }

        if (latestEvent && latestEvent.status !== 'OPEN') {
          throw new Error(getRegistrationUnavailableMessage(latestEvent));
        }

        throw new Error(
          'Registration is temporarily unavailable. Please try again in a few seconds.'
        );
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Registration failed. Please try again.');
    }
  };

  const handleUpdateRegistration = async (updatedReg: Registration) => {
    const previousRegistrations = registrations;
    const previousPagedRegistrations = pagedRegistrations;
    const previousPagedRegistrationsByPage = pagedRegistrationsByPage;
    setRegistrations((prev) =>
      prev.map((registration) =>
        registration.id === updatedReg.id ? updatedReg : registration
      )
    );
    setPagedRegistrations((prev) =>
      prev.map((registration) =>
        registration.id === updatedReg.id ? updatedReg : registration
      )
    );
    setPagedRegistrationsByPage((previous) => {
      const entries = (Object.entries(previous) as Array<[string, Registration[]]>).map(([pageNumber, pageRegs]) => [
        pageNumber,
        pageRegs.map((registration) =>
          registration.id === updatedReg.id ? updatedReg : registration
        )
      ] as const);
      return Object.fromEntries(entries) as Record<number, Registration[]>;
    });

    if (!firebaseEnabled) return;

    try {
      const { updateRegistration } = await loadFirebaseStoreModule();
      await updateRegistration(updatedReg);
    } catch (error) {
      console.error('Failed to update registration in Firebase:', error);
      setRegistrations(previousRegistrations);
      setPagedRegistrations(previousPagedRegistrations);
      setPagedRegistrationsByPage(previousPagedRegistrationsByPage);
      if (error instanceof Error && error.message.trim().length > 0) {
        throw error;
      }
      throw new Error('Failed to sync registration update to Firebase.');
    }
  };

  const handleUpdateEvent = async (updatedEvent: Event) => {
    const previousEvents = events;
    setEvents((prev) =>
      prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event))
    );

    if (!firebaseEnabled) return;

    try {
      const { updateEvent } = await loadFirebaseStoreModule();
      await updateEvent(updatedEvent);
    } catch (error) {
      console.error('Failed to update event in Firebase:', error);
      setEvents(previousEvents);
      if (error instanceof Error) {
        alert(`Failed to sync event update to Firebase: ${error.message}`);
      } else {
        alert('Failed to sync event update to Firebase.');
      }
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this registration? This cannot be undone.'
      )
    ) {
      return;
    }

    const previousRegistrations = registrations;
    const previousPagedRegistrations = pagedRegistrations;
    const previousPagedRegistrationsByPage = pagedRegistrationsByPage;
    const previousTotalRegistrationsCount = totalRegistrationsCount;
    setRegistrations((prev) =>
      prev.filter((registration) => registration.id !== id)
    );
    setPagedRegistrations((prev) =>
      prev.filter((registration) => registration.id !== id)
    );
    setPagedRegistrationsByPage((previous) => {
      const entries = (Object.entries(previous) as Array<[string, Registration[]]>).map(([pageNumber, pageRegs]) => [
        pageNumber,
        pageRegs.filter((registration) => registration.id !== id)
      ] as const);
      return Object.fromEntries(entries) as Record<number, Registration[]>;
    });
    setTotalRegistrationsCount((previousCount) =>
      previousCount > 0 ? previousCount - 1 : 0
    );

    if (!firebaseEnabled) return;

    try {
      const { deleteRegistration } = await loadFirebaseStoreModule();
      await deleteRegistration(id);
    } catch (error) {
      console.error('Failed to delete registration from Firebase:', error);
      setRegistrations(previousRegistrations);
      setPagedRegistrations(previousPagedRegistrations);
      setPagedRegistrationsByPage(previousPagedRegistrationsByPage);
      setTotalRegistrationsCount(previousTotalRegistrationsCount);
      alert('Failed to delete registration from Firebase.');
    }
  };

  const handleDeleteRegistrations = async (
    ids: string[],
    options: DeleteRegistrationsOptions = {}
  ): Promise<{ deletedCount: number; errors: string[] }> => {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      return { deletedCount: 0, errors: [] };
    }

    const requestedIdSet = new Set(uniqueIds);
    const knownRegistrations = new Set([
      ...registrations.map((registration) => registration.id),
      ...pagedRegistrations.map((registration) => registration.id),
      ...(Object.values(pagedRegistrationsByPage) as Registration[][]).flatMap((pageRegistrations) =>
        pageRegistrations.map((registration) => registration.id)
      )
    ]);
    const knownDeletionsCount = uniqueIds.filter((id) =>
      knownRegistrations.has(id)
    ).length;

    if (!firebaseEnabled) {
      const totalRegistrations = uniqueIds.length;
      const totalChunks = Math.max(1, Math.ceil(totalRegistrations / 20));
      options.onProgress?.({
        processedChunks: 0,
        totalChunks,
        processedRegistrations: 0,
        totalRegistrations,
        deletedCount: 0
      });

      setRegistrations((previousRegistrations) =>
        previousRegistrations.filter(
          (registration) => !requestedIdSet.has(registration.id)
        )
      );
      setPagedRegistrations((previousRegistrations) =>
        previousRegistrations.filter(
          (registration) => !requestedIdSet.has(registration.id)
        )
      );
      setPagedRegistrationsByPage((previous) => {
        const entries = (Object.entries(previous) as Array<[string, Registration[]]>).map(([pageNumber, pageRegs]) => [
          pageNumber,
          pageRegs.filter((registration) => !requestedIdSet.has(registration.id))
        ] as const);
        return Object.fromEntries(entries) as Record<number, Registration[]>;
      });
      setTotalRegistrationsCount((previousCount) =>
        Math.max(0, previousCount - knownDeletionsCount)
      );

      options.onProgress?.({
        processedChunks: totalChunks,
        totalChunks,
        processedRegistrations: totalRegistrations,
        totalRegistrations,
        deletedCount: knownDeletionsCount
      });

      return { deletedCount: knownDeletionsCount, errors: [] };
    }

    try {
      const { deleteRegistrations } = await loadFirebaseStoreModule();
      const result = await deleteRegistrations(uniqueIds, options);

      if (result.deletedCount > 0) {
        if (result.errors.length === 0) {
          setRegistrations((previousRegistrations) =>
            previousRegistrations.filter(
              (registration) => !requestedIdSet.has(registration.id)
            )
          );
          setPagedRegistrations((previousRegistrations) =>
            previousRegistrations.filter(
              (registration) => !requestedIdSet.has(registration.id)
            )
          );
          setPagedRegistrationsByPage((previous) => {
            const entries = (Object.entries(previous) as Array<[string, Registration[]]>).map(
              ([pageNumber, pageRegs]) =>
                [
                  pageNumber,
                  pageRegs.filter(
                    (registration) => !requestedIdSet.has(registration.id)
                  )
                ] as const
            );
            return Object.fromEntries(entries) as Record<number, Registration[]>;
          });
          setTotalRegistrationsCount((previousCount) =>
            Math.max(0, previousCount - result.deletedCount)
          );
        } else {
          // Partial failures are easier to recover by refreshing from source of truth.
          await handleRefreshAdminData();
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to delete registrations from Firebase:', error);
      return {
        deletedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  };

  const handleRefreshAdminData = async () => {
    try {
      if (firebaseEnabled) {
        const { fetchEvents, fetchRegistrationsPage, fetchRegistrationsCount } =
          await loadFirebaseStoreModule();
        const [remoteEvents, registrationsPage, registrationsCount] = await Promise.all([
          fetchEvents(INITIAL_EVENTS),
          fetchRegistrationsPage({ limitCount: REGISTRATIONS_REALTIME_LIMIT }),
          fetchRegistrationsCount()
        ]);
        setEvents(remoteEvents);
        setRegistrations(registrationsPage.registrations);
        setTotalRegistrationsCount(registrationsCount);
        setPagedRegistrations([]);
        setPagedRegistrationsByPage({});
        setRegistrationsPageInfoByPage({
          1: {
            hasMore: registrationsPage.hasMore,
            nextCursor: registrationsPage.nextCursor
          }
        });
        setRegistrationPageNumber(1);
        setHasNextRegistrationsPage(registrationsPage.hasMore);
        setNextRegistrationsCursor(registrationsPage.nextCursor);
        setIsLoadingNextRegistrationsPage(false);
        return;
      }

      const savedRegs = localStorage.getItem('aurax_registrations');
      const savedEvents = localStorage.getItem('aurax_events');
      const parsedRegistrations = savedRegs
        ? (JSON.parse(savedRegs) as Registration[])
        : [];
      setRegistrations(parsedRegistrations);
      setTotalRegistrationsCount(parsedRegistrations.length);
      setEvents(
        savedEvents
          ? mergeEventsWithDefaults(JSON.parse(savedEvents))
          : INITIAL_EVENTS
      );
      setPagedRegistrations([]);
      setPagedRegistrationsByPage({});
      setRegistrationsPageInfoByPage({
        1: { hasMore: false, nextCursor: null }
      });
      setRegistrationPageNumber(1);
      setHasNextRegistrationsPage(false);
      setNextRegistrationsCursor(null);
      setIsLoadingNextRegistrationsPage(false);
    } catch (error) {
      console.error('Failed to refresh admin data:', error);
      throw error;
    }
  };

  const handleGetFilteredRegistrationsCount = async (
    eventId: string,
    searchTerm: string
  ): Promise<number> => {
    const normalizedEventId = eventId.trim();
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const matchesFilters = (registration: Registration): boolean => {
      const matchesEvent =
        normalizedEventId === 'ALL' || registration.eventId === normalizedEventId;

      if (!matchesEvent) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const matchesRoll = registration.members.some((member) =>
        member.rollNumber.toLowerCase().includes(normalizedSearchTerm)
      );
      const matchesTeam = (registration.teamName || '')
        .toLowerCase()
        .includes(normalizedSearchTerm);
      return matchesRoll || matchesTeam;
    };

    if (!firebaseEnabled) {
      return registrations.filter(matchesFilters).length;
    }

    try {
      const { fetchRegistrationsCountByFilter } = await loadFirebaseStoreModule();
      return fetchRegistrationsCountByFilter(
        normalizedEventId === 'ALL' ? null : normalizedEventId,
        normalizedSearchTerm
      );
    } catch (error) {
      console.error('Failed to fetch filtered registrations count:', error);
      return registrations.filter(matchesFilters).length;
    }
  };

  const handleGetFilteredRegistrations = async (
    eventId: string,
    searchTerm: string
  ): Promise<Registration[]> => {
    const normalizedEventId = eventId.trim();
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const matchesFilters = (registration: Registration): boolean => {
      const matchesEvent =
        normalizedEventId === 'ALL' || registration.eventId === normalizedEventId;

      if (!matchesEvent) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const matchesRoll = registration.members.some((member) =>
        member.rollNumber.toLowerCase().includes(normalizedSearchTerm)
      );
      const matchesTeam = (registration.teamName || '')
        .toLowerCase()
        .includes(normalizedSearchTerm);
      return matchesRoll || matchesTeam;
    };

    const sortByCreatedAtDesc = (
      left: Registration,
      right: Registration
    ): number => {
      const leftCreatedAt =
        typeof left.createdAt === 'number'
          ? left.createdAt
          : Date.parse(left.timestamp || '') || 0;
      const rightCreatedAt =
        typeof right.createdAt === 'number'
          ? right.createdAt
          : Date.parse(right.timestamp || '') || 0;
      return rightCreatedAt - leftCreatedAt;
    };

    if (!firebaseEnabled) {
      return [...registrations].filter(matchesFilters).sort(sortByCreatedAtDesc);
    }

    try {
      const { fetchRegistrationsByFilter } = await loadFirebaseStoreModule();
      return fetchRegistrationsByFilter(
        normalizedEventId === 'ALL' ? null : normalizedEventId,
        normalizedSearchTerm
      );
    } catch (error) {
      console.error('Failed to fetch filtered registrations:', error);
      return [...registrations].filter(matchesFilters).sort(sortByCreatedAtDesc);
    }
  };

  const handleNextRegistrationsPage = async () => {
    if (!firebaseEnabled) {
      return;
    }

    if (isLoadingNextRegistrationsPage) {
      return;
    }

    const targetPage = registrationPageNumber + 1;
    const cachedTargetPage = pagedRegistrationsByPage[targetPage];
    if (cachedTargetPage) {
      const targetPageInfo = registrationsPageInfoByPage[targetPage];
      setPagedRegistrations(cachedTargetPage);
      setRegistrationPageNumber(targetPage);
      setHasNextRegistrationsPage(targetPageInfo?.hasMore ?? false);
      setNextRegistrationsCursor(targetPageInfo?.nextCursor ?? null);
      return;
    }

    if (!nextRegistrationsCursor) {
      return;
    }

    setIsLoadingNextRegistrationsPage(true);

    try {
      const { fetchRegistrationsPage } = await loadFirebaseStoreModule();
      const nextPage = await fetchRegistrationsPage({
        limitCount: REGISTRATIONS_REALTIME_LIMIT,
        cursor: nextRegistrationsCursor
      });

      setPagedRegistrations(nextPage.registrations);
      setPagedRegistrationsByPage((previous) => ({
        ...previous,
        [targetPage]: nextPage.registrations
      }));
      setRegistrationsPageInfoByPage((previous) => ({
        ...previous,
        [targetPage]: {
          hasMore: nextPage.hasMore,
          nextCursor: nextPage.nextCursor
        }
      }));
      setRegistrationPageNumber(targetPage);
      setHasNextRegistrationsPage(nextPage.hasMore);
      setNextRegistrationsCursor(nextPage.nextCursor);
    } catch (error) {
      console.error('Failed to fetch next registrations page:', error);
      alert('Failed to load next registrations page.');
    } finally {
      setIsLoadingNextRegistrationsPage(false);
    }
  };

  const handleShowLatestRegistrationsPage = async () => {
    if (registrationPageNumber === 1) {
      return;
    }

    setPagedRegistrations([]);
    setRegistrationPageNumber(1);

    const firstPageInfo = registrationsPageInfoByPage[1];
    if (firstPageInfo) {
      setHasNextRegistrationsPage(firstPageInfo.hasMore);
      setNextRegistrationsCursor(firstPageInfo.nextCursor);
      return;
    }

    if (!firebaseEnabled) {
      setHasNextRegistrationsPage(false);
      setNextRegistrationsCursor(null);
      return;
    }

    try {
      const { fetchRegistrationsPage } = await loadFirebaseStoreModule();
      const latestPage = await fetchRegistrationsPage({
        limitCount: REGISTRATIONS_REALTIME_LIMIT
      });
      setRegistrations(latestPage.registrations);
      setRegistrationsPageInfoByPage((previous) => ({
        ...previous,
        1: {
          hasMore: latestPage.hasMore,
          nextCursor: latestPage.nextCursor
        }
      }));
      if (!latestPage.hasMore) {
        setTotalRegistrationsCount(latestPage.registrations.length);
      }
      setHasNextRegistrationsPage(latestPage.hasMore);
      setNextRegistrationsCursor(latestPage.nextCursor);
    } catch (error) {
      console.error('Failed to load latest registrations page:', error);
      alert('Failed to load latest registrations page.');
    }
  };

  const handlePreviousRegistrationsPage = async () => {
    if (registrationPageNumber <= 1) {
      return;
    }

    const targetPage = registrationPageNumber - 1;
    if (targetPage === 1) {
      await handleShowLatestRegistrationsPage();
      return;
    }

    const targetPageRegistrations = pagedRegistrationsByPage[targetPage];
    if (!targetPageRegistrations) {
      alert('Previous page data is not available. Please load again.');
      return;
    }

    const targetPageInfo = registrationsPageInfoByPage[targetPage];
    setPagedRegistrations(targetPageRegistrations);
    setRegistrationPageNumber(targetPage);
    setHasNextRegistrationsPage(targetPageInfo?.hasMore ?? false);
    setNextRegistrationsCursor(targetPageInfo?.nextCursor ?? null);
  };

  const handleGoToRegistrationsPage = async (pageNumber: number) => {
    const targetPage = Math.max(1, Math.floor(pageNumber));

    if (targetPage === registrationPageNumber) {
      return;
    }

    if (targetPage === 1) {
      await handleShowLatestRegistrationsPage();
      return;
    }

    const cachedTargetPage = pagedRegistrationsByPage[targetPage];
    if (cachedTargetPage) {
      const targetPageInfo = registrationsPageInfoByPage[targetPage];
      setPagedRegistrations(cachedTargetPage);
      setRegistrationPageNumber(targetPage);
      setHasNextRegistrationsPage(targetPageInfo?.hasMore ?? false);
      setNextRegistrationsCursor(targetPageInfo?.nextCursor ?? null);
      return;
    }

    const loadedPageNumbers = Object.keys(pagedRegistrationsByPage)
      .map((pageKey) => Number(pageKey))
      .filter((page) => Number.isFinite(page) && page >= 2)
      .sort((left, right) => left - right);
    const highestLoadedPage = loadedPageNumbers[loadedPageNumbers.length - 1] ?? 1;

    if (!firebaseEnabled || targetPage !== highestLoadedPage + 1) {
      return;
    }

    const sourcePageInfo =
      highestLoadedPage === 1
        ? registrationsPageInfoByPage[1]
        : registrationsPageInfoByPage[highestLoadedPage];

    if (!sourcePageInfo?.nextCursor) {
      return;
    }

    setIsLoadingNextRegistrationsPage(true);
    try {
      const { fetchRegistrationsPage } = await loadFirebaseStoreModule();
      const nextPage = await fetchRegistrationsPage({
        limitCount: REGISTRATIONS_REALTIME_LIMIT,
        cursor: sourcePageInfo.nextCursor
      });

      setPagedRegistrations(nextPage.registrations);
      setPagedRegistrationsByPage((previous) => ({
        ...previous,
        [targetPage]: nextPage.registrations
      }));
      setRegistrationsPageInfoByPage((previous) => ({
        ...previous,
        [targetPage]: {
          hasMore: nextPage.hasMore,
          nextCursor: nextPage.nextCursor
        }
      }));
      setRegistrationPageNumber(targetPage);
      setHasNextRegistrationsPage(nextPage.hasMore);
      setNextRegistrationsCursor(nextPage.nextCursor);
    } catch (error) {
      console.error(`Failed to load registrations page ${targetPage}:`, error);
      alert(`Failed to load registrations page ${targetPage}.`);
    } finally {
      setIsLoadingNextRegistrationsPage(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      const { logoutAdmin } = await loadFirebaseAuthModule();
      await logoutAdmin();
      setIsAdminAuthenticated(false);
      setPagedRegistrations([]);
      setPagedRegistrationsByPage({});
      setRegistrationsPageInfoByPage({});
      setRegistrationPageNumber(1);
      setHasNextRegistrationsPage(false);
      setNextRegistrationsCursor(null);
      setIsLoadingNextRegistrationsPage(false);
      setTotalRegistrationsCount(0);
      setView('HOME');
      window.location.href = '/?page=admin-login';
    } catch (error) {
      console.error('Failed to logout admin:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  const handleSetRegistrationsLive = async (enabled: boolean) => {
    const previousState = registrationsLive;
    setRegistrationsLive(enabled);

    if (!firebaseEnabled) {
      return;
    }

    try {
      const { updateRegistrationControl } = await loadFirebaseStoreModule();
      await updateRegistrationControl(enabled);
    } catch (error) {
      setRegistrationsLive(previousState);
      throw error;
    }
  };

  const handleIntroComplete = (redirectPath: string) => {
    // Mark intro as shown for this session (best effort)
    setSessionFlag(INTRO_SESSION_FLAG_KEY);
    setHasSeenIntro(true);

    // Route without forcing full-page reload to avoid mobile/browser storage edge cases.
    const targetUrl = new URL(redirectPath, window.location.origin);
    const targetPage = targetUrl.searchParams.get('page');
    const shouldPreserveLinkedEvent =
      registrationEventIdFromUrl.length > 0 &&
      targetPage !== 'admin' &&
      targetPage !== 'admin-login';

    if (shouldPreserveLinkedEvent) {
      setView('EVENTS');
      return;
    }

    switch (targetPage) {
      case 'admin':
        window.history.replaceState({}, '', '/?page=admin');
        setView('ADMIN');
        break;
      case 'admin-login':
        window.history.replaceState({}, '', '/?page=admin-login');
        setView('HOME');
        break;
      case 'events':
        window.history.replaceState({}, '', '/');
        setRegistrationEventIdFromUrl('');
        setView('EVENTS');
        break;
      default:
        window.history.replaceState({}, '', '/');
        setRegistrationEventIdFromUrl('');
        setView('HOME');
        break;
    }
  };

  // Redirect unauthenticated users trying to access admin view
  useEffect(() => {
    if (isAuthReady && view === 'ADMIN' && !isAdminAuthenticated) {
      window.location.href = '/?page=admin-login';
    }
  }, [view, isAdminAuthenticated, isAuthReady]);

  // Show intro animation if user hasn't seen it
  if (!hasSeenIntro) {
    return <IntroView onComplete={handleIntroComplete} />;
  }

  const registrationsForAdmin = isShowingPagedRegistrations
    ? pagedRegistrations
    : registrations;
  const registrationPageNumbers = (() => {
    const loadedPages = Object.keys(pagedRegistrationsByPage)
      .map((pageKey) => Number(pageKey))
      .filter((page) => Number.isFinite(page) && page >= 2)
      .sort((left, right) => left - right);
    const pages = [1, ...loadedPages];

    const highestLoadedPage = loadedPages[loadedPages.length - 1] ?? 1;
    const highestPageInfo =
      highestLoadedPage === 1
        ? registrationsPageInfoByPage[1]
        : registrationsPageInfoByPage[highestLoadedPage];
    if (highestPageInfo?.hasMore) {
      pages.push(highestLoadedPage + 1);
    }

    return Array.from(new Set(pages)).sort((left, right) => left - right);
  })();

  if (showAdminLogin && !isAdminAuthenticated) {
    return (
      <Suspense
        fallback={<div className="min-h-screen flex items-center justify-center text-zinc-400">Loading admin login...</div>}
      >
        <AdminLogin
          onLogin={async (email, pwd) => {
            try {
              const { loginWithEmailPassword } = await loadFirebaseAuthModule();
              await loginWithEmailPassword(email, pwd);
              setView('ADMIN');
              window.location.href = '/?page=admin';
              return { success: true };
            } catch (error) {
              console.error('Admin login failed:', error);
              return {
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Admin login failed. Please try again.'
              };
            }
          }}
          onSendVerification={async (email, pwd) => {
            const { sendAdminVerificationEmail } = await loadFirebaseAuthModule();
            await sendAdminVerificationEmail(email, pwd);
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      <Navbar currentView={view} onViewChange={handleViewChange} />

      <main className="flex-grow pt-32 sm:pt-36 md:pt-32 pb-8 md:pb-20 relative z-10 w-full">
        {view === 'HOME' && (
          <HomeView
            events={events}
            registrationsLive={registrationsLive}
            onRegister={handleRegisterClick}
            onNavigateToEvents={() => navigateToEventsView()}
          />
        )}

        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          {view === 'SCHEDULE' && <ScheduleView events={events} />}

          {view === 'EVENTS' && (
            <EventsView
              events={events}
              registrationsLive={registrationsLive}
              activeCategory={eventsViewCategory}
              activeSportsType={eventsViewSportsType}
              onCategoryChange={handleEventsCategoryChange}
              onSportsTypeChange={handleEventsSportsTypeChange}
              onRegister={handleRegisterClick}
            />
          )}

          {view === 'REGISTRATION' && selectedEvent && (
            <RegistrationForm
              event={selectedEvent}
              onSubmit={handleRegistrationSubmit}
              onCancel={() => navigateToEventsView()}
            />
          )}

          {view === 'ADMIN' && (
            <Suspense
              fallback={<div className="py-12 text-center text-zinc-400">Loading admin panel...</div>}
            >
              <AdminView
                registrations={registrationsForAdmin}
                totalRegistrationsCount={totalRegistrationsCount}
                events={events}
                registrationsLive={registrationsLive}
                registrationPage={registrationPageNumber}
                hasNextRegistrationsPage={hasNextRegistrationsPage}
                hasPreviousRegistrationsPage={registrationPageNumber > 1}
                registrationPageNumbers={registrationPageNumbers}
                isLoadingNextRegistrationsPage={isLoadingNextRegistrationsPage}
                onNextRegistrationsPage={handleNextRegistrationsPage}
                onPreviousRegistrationsPage={handlePreviousRegistrationsPage}
                onGoToRegistrationsPage={handleGoToRegistrationsPage}
                onUpdateEvent={handleUpdateEvent}
                onSetRegistrationsLive={handleSetRegistrationsLive}
                onDeleteRegistration={handleDeleteRegistration}
                onDeleteRegistrations={handleDeleteRegistrations}
                onUpdateRegistration={handleUpdateRegistration}
                onRefreshData={handleRefreshAdminData}
                onGetFilteredRegistrationsCount={
                  handleGetFilteredRegistrationsCount
                }
                onGetFilteredRegistrations={handleGetFilteredRegistrations}
                onLogout={handleAdminLogout}
              />
            </Suspense>
          )}
        </div>
      </main>

      <footer className="py-24 border-t border-white/5 bg-zinc-950/40 backdrop-blur-xl w-full">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-[12px] font-black text-white cursor-pointer hover:border-indigo-500 transition-colors"
                  onClick={() => {
                    window.location.href = isAdminAuthenticated
                      ? '/?page=admin'
                      : '/?page=admin-login';
                  }}
                >
                  AU
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white">
                    AURAX-2026
                  </p>
                  <p className="text-[9px] mono uppercase tracking-[0.2em] text-zinc-500">
                    Andhra University CSE Department
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 max-w-xs leading-relaxed font-medium">
                Celebrating the Centenary Legacy of Engineering Excellence at Andhra
                University. 10 Decades of vision, 1 Aura of dominance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 md:gap-14">
              <div className="space-y-3">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-zinc-300">
                  Quick Links
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView('HOME');
                      scrollToPageTop();
                    }}
                    className="block text-[11px] mono uppercase tracking-[0.14em] text-zinc-400 hover:text-white transition-colors"
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigateToEventsView();
                      scrollToPageTop();
                    }}
                    className="block text-[11px] mono uppercase tracking-[0.14em] text-zinc-400 hover:text-white transition-colors"
                  >
                    Events
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-zinc-300">
                  Categories
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleEventsCategoryChange(EventCategory.TECH);
                      navigateToEventsView();
                      scrollToPageTop();
                    }}
                    className="block text-[11px] mono uppercase tracking-[0.14em] text-zinc-400 hover:text-white transition-colors"
                  >
                    Technical Events
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEventsViewSportsType('NONE');
                      handleEventsCategoryChange(EventCategory.SPORTS);
                      navigateToEventsView();
                      scrollToPageTop();
                    }}
                    className="block text-[11px] mono uppercase tracking-[0.14em] text-zinc-400 hover:text-white transition-colors"
                  >
                    Sports
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleEventsCategoryChange(EventCategory.NON_TECH);
                      navigateToEventsView();
                      scrollToPageTop();
                    }}
                    className="block text-[11px] mono uppercase tracking-[0.14em] text-zinc-400 hover:text-white transition-colors"
                  >
                    Non Technical
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-6">
              <div className="space-y-2 text-left md:text-right">
                <p className="text-white text-xs md:text-sm font-black uppercase tracking-widest">
                  Follow us for more updates
                </p>
              </div>

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 px-6 md:px-10 py-4 md:py-6 rounded-2xl md:rounded-[2rem] border border-white/5 bg-white/[0.02] hover:bg-white hover:text-black transition-all duration-700 shadow-2xl"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:scale-110 transition-transform"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span className="text-[11px] md:text-xs font-black uppercase tracking-[0.3em]">
                  Instagram
                </span>
              </a>
            </div>
          </div>

          <div className="mt-20 pt-10 border-t border-white/[0.03] text-center">
            <p className="text-[8px] mono uppercase tracking-[0.6em] text-zinc-300 font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]">
              &copy; 2026 Andhra University // Department of CSE // Developed by Team AURAX
            </p>
          </div>
        </div>
      </footer>

      {view !== 'ADMIN' && (
        <AuraxBot
          events={events}
          registrationsLive={registrationsLive}
          onRegister={handleRegisterClick}
          onNavigateHome={() => setView('HOME')}
          onNavigateEvents={() => navigateToEventsView()}
        />
      )}
    </div>
  );
};

export default App;
