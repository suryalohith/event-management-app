import React, { useEffect, useMemo, useState } from 'react';
import { Event, EventCategory } from '../types';

type BotIntent = 'TEAM_SIZE' | 'STATUS' | 'HOW_TO_REGISTER' | 'RULES' | 'FEE_ID' | 'HELP';

interface AuraxBotProps {
  events: Event[];
  registrationsLive: boolean;
  onRegister: (event: Event) => void;
  onNavigateHome: () => void;
  onNavigateEvents: () => void;
}

const HELP_CONTACTS = [
  {
    name: 'Registration Help Desk',
    phone: '8639638688'
  },
  {
    name: 'Coordinator',
    phone: '7995377089'
  }
] as const;

const EVENT_STATUS_LABELS: Record<Event['status'], string> = {
  OPEN: 'Registrations Open',
  CLOSED: 'Closed',
  REGISTRATION_OPEN_SOON: 'Registrations Open Soon'
};

const INTENT_LABELS: Record<BotIntent, string> = {
  TEAM_SIZE: 'Team Size',
  STATUS: 'Status',
  HOW_TO_REGISTER: 'How To Register',
  RULES: 'Rules',
  FEE_ID: 'Fee / ID',
  HELP: 'Help'
};

const REGISTER_STEPS: string[] = [
  'Go to Events and choose your event.',
  'Add team details and valid registration numbers.',
  'Review once and submit registration.'
];

const getCategoryLabel = (category: EventCategory): string => {
  if (category === EventCategory.TECH) return 'Technical';
  if (category === EventCategory.NON_TECH) return 'Non Technical';
  return 'Sports';
};

const getParticipantLabel = (event: Event): string => {
  if (event.category === EventCategory.SPORTS) {
    return event.maxTeamSize > 1 ? 'players' : 'player';
  }

  if (event.category === EventCategory.NON_TECH) {
    return event.maxTeamSize > 1 ? 'participants' : 'participant';
  }

  return event.maxTeamSize > 1 ? 'members' : 'participant';
};

const getTeamSizeText = (event: Event): string => {
  const participantLabel = getParticipantLabel(event);
  if (event.minTeamSize === event.maxTeamSize) {
    return `${event.minTeamSize} ${participantLabel} required.`;
  }

  return `Minimum ${event.minTeamSize}, maximum ${event.maxTeamSize} ${participantLabel}.`;
};

const AuraxBot: React.FC<AuraxBotProps> = ({
  events,
  registrationsLive,
  onRegister,
  onNavigateHome,
  onNavigateEvents
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIntent, setActiveIntent] = useState<BotIntent>('TEAM_SIZE');
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id ?? '');
  const [showAssistNudge, setShowAssistNudge] = useState(false);

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId('');
      return;
    }

    setSelectedEventId((previous) => {
      if (previous && events.some((event) => event.id === previous)) {
        return previous;
      }
      return events[0].id;
    });
  }, [events]);

  useEffect(() => {
    if (isOpen) {
      setShowAssistNudge(false);
      return;
    }

    const showTimer = window.setTimeout(() => {
      setShowAssistNudge(true);
    }, 1000);

    const hideTimer = window.setTimeout(() => {
      setShowAssistNudge(false);
    }, 6500);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isOpen]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const statusText = useMemo(() => {
    if (!selectedEvent) {
      return 'Select an event to check registration status.';
    }

    if (!registrationsLive) {
      return 'Registrations are currently closed by admin for all events.';
    }

    return EVENT_STATUS_LABELS[selectedEvent.status];
  }, [selectedEvent, registrationsLive]);

  const canRegisterSelectedEvent =
    selectedEvent !== null && registrationsLive && selectedEvent.status === 'OPEN';

  return (
    <div className="fixed bottom-4 md:bottom-6 right-3 md:right-6 z-[70]">
      {!isOpen && (
        <div className="group relative">
          {showAssistNudge && (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="absolute bottom-[110%] right-0 rounded-full border border-indigo-400/35 bg-zinc-950/95 px-3 py-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] text-indigo-100 shadow-[0_10px_24px_rgba(0,0,0,0.45)] animate-pulse"
            >
              Need Assistance?
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative inline-flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full border border-indigo-400/40 bg-zinc-950/90 shadow-[0_18px_38px_rgba(0,0,0,0.5)] backdrop-blur-xl hover:border-indigo-400/70 hover:bg-zinc-900 transition-all"
            aria-label="Open AURAX assistant"
          >
            <span className="absolute top-2 right-2 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[7px] md:text-[8px] leading-[1.1] font-black uppercase tracking-[0.08em] text-white text-center">
              AURAX
              <br />
              BOT
            </span>
          </button>
          <div className="pointer-events-none absolute right-[115%] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-zinc-950/90 px-3 py-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity">
            AURAX Assist
          </div>
        </div>
      )}

      {isOpen && (
        <div className="w-[min(92vw,380px)] rounded-[1.6rem] border border-indigo-500/30 bg-zinc-950/95 shadow-[0_26px_50px_rgba(0,0,0,0.58)] backdrop-blur-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="mono text-[9px] uppercase tracking-[0.2em] text-indigo-300 font-black">
                AURAX Bot
              </p>
              <p className="text-[11px] text-zinc-400">Fast event help and guidance</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors text-lg leading-none"
              aria-label="Close AURAX assistant"
            >
              ×
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(INTENT_LABELS) as BotIntent[]).map((intent) => (
                <button
                  key={intent}
                  type="button"
                  onClick={() => setActiveIntent(intent)}
                  className={`rounded-lg px-2 py-2 text-[10px] md:text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${
                    activeIntent === intent
                      ? 'bg-indigo-500/30 border border-indigo-400/40 text-indigo-200'
                      : 'bg-black/30 border border-white/10 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {INTENT_LABELS[intent]}
                </button>
              ))}
            </div>

            {(activeIntent === 'TEAM_SIZE' || activeIntent === 'STATUS') && (
              <div className="space-y-2">
                <label className="text-[10px] mono uppercase tracking-[0.15em] text-zinc-500">
                  Select Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-400"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              {activeIntent === 'TEAM_SIZE' && selectedEvent && (
                <div className="space-y-1.5">
                  <p className="text-zinc-200 text-sm font-bold">{selectedEvent.name}</p>
                  <p className="text-zinc-400 text-xs">
                    Category: {getCategoryLabel(selectedEvent.category)}
                  </p>
                  <p className="text-zinc-200 text-sm">{getTeamSizeText(selectedEvent)}</p>
                </div>
              )}

              {activeIntent === 'STATUS' && (
                <div className="space-y-1.5">
                  <p className="text-zinc-200 text-sm font-bold">
                    {selectedEvent ? selectedEvent.name : 'Event Status'}
                  </p>
                  <p className="text-zinc-200 text-sm">{statusText}</p>
                </div>
              )}

              {activeIntent === 'HOW_TO_REGISTER' && (
                <div className="space-y-2">
                  <p className="text-zinc-200 text-sm font-bold">How to Register</p>
                  <ol className="space-y-1.5 text-zinc-200 text-sm list-decimal pl-4">
                    {REGISTER_STEPS.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {activeIntent === 'RULES' && (
                <ul className="space-y-1.5 text-zinc-200 text-sm">
                  <li>One roll number can register only once per event.</li>
                  <li>Multiple registrations in the same event are not allowed.</li>
                  <li>Teams must report exactly at the given time.</li>
                </ul>
              )}

              {activeIntent === 'FEE_ID' && (
                <ul className="space-y-1.5 text-zinc-200 text-sm">
                  <li>Department fee is mandatory to participate.</li>
                  <li>ID card is compulsory for every event.</li>
                </ul>
              )}

              {activeIntent === 'HELP' && (
                <div className="space-y-3">
                  <p className="text-zinc-200 text-sm">
                    For general event queries, contact any of these:
                  </p>
                  <div className="space-y-2">
                    {HELP_CONTACTS.map((contact) => (
                      <div
                        key={`${contact.name}-${contact.phone}`}
                        className="rounded-lg border border-white/10 bg-black/25 p-2.5"
                      >
                        <p className="text-zinc-100 text-[11px] font-bold">{contact.name}</p>
                        <p className="text-zinc-300 text-xs mt-0.5">{contact.phone}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <a
                            href={`https://wa.me/91${contact.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                          >
                            WhatsApp
                          </a>
                          <a
                            href={`tel:+91${contact.phone}`}
                            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-200 hover:bg-white/10 transition-colors"
                          >
                            Call
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onNavigateHome}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-200 hover:bg-white/10 transition-colors"
              >
                Home
              </button>
              <button
                type="button"
                onClick={onNavigateEvents}
                className="rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200 hover:bg-indigo-500/25 transition-colors"
              >
                Events
              </button>
            </div>

            {canRegisterSelectedEvent && (
              <button
                type="button"
                onClick={() => {
                  if (selectedEvent) {
                    onRegister(selectedEvent);
                  }
                }}
                className="w-full rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-indigo-100 hover:bg-indigo-500/30 transition-colors"
              >
                Register Selected Event
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuraxBot;
