
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Event, EventCategory } from '../types';
import HeroBanner from './HeroSlider';
import FeaturedSlider from './FeaturedSlider';

interface HomeViewProps {
  events: Event[];
  registrationsLive: boolean;
  onRegister: (event: Event) => void;
  onNavigateToEvents: () => void;
}

type FaqItem = {
  question: string;
  answer: string;
};

type RegistrationStep = {
  title: string;
  description: string;
};

type CoordinatorContact = {
  name: string;
  role: string;
  phone: string;
};

type EventTrackConfig = {
  key: EventCategory;
  title: string;
  description: string;
  accentClass: string;
  glowClass: string;
};

type ExpectationItem = {
  title: string;
  description: string;
};

type OverviewItem = {
  title: string;
  detail: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Can one student apply for multiple events?',
    answer:
      'Yes. You can register for all events, but only in one team per event.'
  },
  {
    question: 'Who is eligible to participate?',
    answer:
      'Andhra University CSE department students can participate based on the event format. Team and individual events have their own entry limits.'
  },
  {
    question: 'How is team size decided?',
    answer:
      'Team size depends on each event. The event card and registration form both show the allowed minimum and maximum members.'
  },
  {
    question: 'How do I complete department fee payment?',
    answer:
      'Department fee is mandatory to participate. Follow the official payment instructions shared by your class CR or LR.'
  },
  {
    question: 'Can submitted details be edited later?',
    answer:
      'Yes. Contact registration desk to edit participant details when needed. Registration number updates are validated, including duplicate checks against other teams.'
  }
];

const REGISTRATION_STEPS: RegistrationStep[] = [
  {
    title: 'Choose Event',
    description:
      'Open the Events section, pick your event, and check team size details.'
  },
  {
    title: 'Add Team',
    description:
      'Enter team details and participant registration numbers carefully.'
  },
  {
    title: 'Submit',
    description:
      'Review once and submit the form to complete your registration.'
  }
];

const COORDINATOR_CONTACTS: CoordinatorContact[] = [
  {
    name: 'Registration Help Desk',
    role: 'General event queries',
    phone: '8639638688'
  },
  {
    name: 'Coordinator',
    role: 'General queries',
    phone: '7995377089'
  }
];

const EVENT_TRACKS: EventTrackConfig[] = [
  {
    key: EventCategory.TECH,
    title: 'Technical Events',
    description: 'Coding, innovation, problem solving, and project-driven rounds.',
    accentClass: 'border-indigo-500/30',
    glowClass: 'from-indigo-500/12 to-violet-500/10'
  },
  {
    key: EventCategory.NON_TECH,
    title: 'Non-Technical',
    description: 'Creative, communication, and showcase-based competitions.',
    accentClass: 'border-amber-500/30',
    glowClass: 'from-amber-500/12 to-orange-500/10'
  },
  {
    key: EventCategory.SPORTS,
    title: 'Sports',
    description: 'Outdoor, indoor, and esports events with team coordination.',
    accentClass: 'border-emerald-500/30',
    glowClass: 'from-emerald-500/12 to-teal-500/10'
  }
];

const EXPECTATION_ITEMS: ExpectationItem[] = [
  {
    title: 'Competitive Atmosphere',
    description:
      'Every event is designed for focused competition with strong peer participation.'
  },
  {
    title: 'Structured Evaluation',
    description:
      'Judging follows event-specific criteria shared by coordinators and volunteers.'
  },
  {
    title: 'On-ground Support',
    description:
      'Help desks and coordinators are available for registration and event clarifications.'
  },
  {
    title: 'Participation Value',
    description:
      'Build teamwork, visibility, and confidence through technical and non-technical tracks.'
  }
];

const OVERVIEW_ITEMS: OverviewItem[] = [
  {
    title: 'Centenary Focus',
    detail:
      'AURAX 2026 marks the centenary celebration of CSE at Andhra University.'
  },
  {
    title: 'Structured Tracks',
    detail:
      'Events are organized across Technical, Non-Technical, and Sports categories.'
  },
  {
    title: 'Registration Discipline',
    detail:
      'Clear team limits and single-roll-per-event validation keep registrations fair.'
  }
];

const HomeView: React.FC<HomeViewProps> = ({
  events,
  registrationsLive,
  onRegister,
  onNavigateToEvents
}) => {
  const [isEthnicVisible, setIsEthnicVisible] = useState(false);
  const [isDepartmentVisible, setIsDepartmentVisible] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const ethnicRef = useRef<HTMLDivElement | null>(null);
  const departmentRef = useRef<HTMLDivElement | null>(null);

  const eventsByTrack = useMemo(() => {
    return EVENT_TRACKS.reduce(
      (acc, track) => {
        acc[track.key] = events.filter((event) => event.category === track.key);
        return acc;
      },
      {
        [EventCategory.TECH]: [] as Event[],
        [EventCategory.NON_TECH]: [] as Event[],
        [EventCategory.SPORTS]: [] as Event[]
      }
    );
  }, [events]);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setIsEthnicVisible(true);
      setIsDepartmentVisible(true);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setIsEthnicVisible(true);
      setIsDepartmentVisible(true);
      return;
    }

    const getVisibilityRatio = (element: HTMLDivElement | null) => {
      if (!element) {
        return 0;
      }

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      if (visibleHeight <= 0 || rect.height <= 0) {
        return 0;
      }

      return visibleHeight / rect.height;
    };

    const syncVisibilityFromViewport = () => {
      const ethnicVisible = getVisibilityRatio(ethnicRef.current) >= 0.18;
      const departmentVisible = getVisibilityRatio(departmentRef.current) >= 0.18;

      setIsEthnicVisible((prev) => (prev === ethnicVisible ? prev : ethnicVisible));
      setIsDepartmentVisible((prev) => (prev === departmentVisible ? prev : departmentVisible));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visible = entry.intersectionRatio >= 0.18;
          if (entry.target === ethnicRef.current) {
            setIsEthnicVisible((prev) => (prev === visible ? prev : visible));
          }
          if (entry.target === departmentRef.current) {
            setIsDepartmentVisible((prev) => (prev === visible ? prev : visible));
          }
        });
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    if (ethnicRef.current) observer.observe(ethnicRef.current);
    if (departmentRef.current) observer.observe(departmentRef.current);

    // Fallback for browsers where observer callbacks can be inconsistent during rapid scroll direction changes.
    let rafId: number | null = null;
    const scheduleViewportSync = () => {
      if (rafId !== null) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        syncVisibilityFromViewport();
      });
    };

    window.addEventListener('scroll', scheduleViewportSync, { passive: true });
    window.addEventListener('resize', scheduleViewportSync);
    scheduleViewportSync();

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', scheduleViewportSync);
      window.removeEventListener('resize', scheduleViewportSync);
      observer.disconnect();
    };
  }, []);

  const smoothInClass =
    'transform-gpu will-change-[transform,opacity] transition-[transform,opacity] duration-700 md:duration-900 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none';
  const sectionKickerClass =
    'mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-bold mb-2';
  const sectionTitleClass =
    'text-2xl md:text-3xl font-bold text-white tracking-tight';
  const panelClass =
    'rounded-[1.2rem] md:rounded-[1.5rem] border border-white/10 bg-zinc-950/60 backdrop-blur-sm p-5 md:p-7';

  return (
    <div className="animate-reveal w-full pb-0 md:pb-20">
      {/* 1. Cinematic Visual Header */}
      <HeroBanner />

      {/* 1.3 Program Overview */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pt-10 md:pt-14">
        <div className={`${panelClass} text-left`}>
          <p className={sectionKickerClass}>Program Overview</p>
          <h2 className={sectionTitleClass}>AURAX 2026 at a glance</h2>
          <p className="text-zinc-300 text-sm md:text-base leading-relaxed mt-3 max-w-3xl">
            A professional multi-track event platform built for high-participation
            student engagement, transparent rules, and smooth registrations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            {OVERVIEW_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-black/30 p-4"
              >
                <p className="text-white text-sm md:text-base font-semibold">{item.title}</p>
                <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* 1.5. Tech Fest Day & Farewell Day Highlights */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <p className="text-center text-base md:text-xl font-semibold text-zinc-200 mb-6 md:mb-8">
          What&apos;s coming up?
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
          {/* Ethnic Day */}
          <div
            ref={ethnicRef}
            className={`relative w-full overflow-hidden rounded-[1.8rem] border border-orange-500/30 bg-gradient-to-br from-orange-500/12 via-zinc-950/75 to-rose-500/10 px-6 md:px-8 py-7 md:py-8 text-left shadow-[0_16px_40px_rgba(0,0,0,0.45)] ${smoothInClass} ${
              isEthnicVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-16'
            }`}
          >
            <div className="absolute -top-10 -right-8 w-28 h-28 rounded-full bg-orange-500/10 blur-2xl pointer-events-none"></div>
            <div className="relative z-10 flex items-center justify-start gap-3 mb-4">
              <span className="mono text-[9px] md:text-[10px] uppercase tracking-[0.24em] text-orange-400 font-black">
                Special Highlight
              </span>
            </div>
            <h3 className="relative z-10 text-2xl md:text-3xl font-black text-white tracking-tight mb-3 md:mb-4">
              Tech Fest Day
            </h3>
            <p className="relative z-10 text-zinc-300 text-sm md:text-[15px] leading-relaxed font-medium mb-5 max-w-2xl">
              Starts at 1:00 PM on 16-03-2026 at CS&amp;SE Department.
            </p>
            <p className="relative z-10 text-zinc-400 text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em]">
              Venue: CS&amp;SE Department
            </p>
            <p className="relative z-10 mt-3 text-orange-200/90 text-[11px] md:text-xs font-semibold uppercase tracking-[0.14em]">
              Bootcamp | Flashmob | Farewell Poster Launch
            </p>
          </div>

          {/* Farewell Day */}
          <div
            ref={departmentRef}
            className={`relative w-full overflow-hidden rounded-[1.8rem] border border-indigo-500/30 bg-gradient-to-br from-indigo-500/12 via-zinc-950/75 to-purple-500/10 px-6 md:px-8 py-7 md:py-8 text-left shadow-[0_16px_40px_rgba(0,0,0,0.45)] ${smoothInClass} delay-100 ${
              isDepartmentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-16'
            }`}
          >
            <div className="absolute -top-10 -left-8 w-28 h-28 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none"></div>
            <div className="relative z-10 flex items-center justify-start gap-3 mb-4">
              <span className="mono text-[9px] md:text-[10px] uppercase tracking-[0.24em] text-indigo-400 font-black">
                Closing Highlight
              </span>
            </div>
            <h3 className="relative z-10 text-2xl md:text-3xl font-black text-white tracking-tight mb-3 md:mb-4">
              Farewell Day
            </h3>
            <p className="relative z-10 text-zinc-300 text-sm md:text-[15px] leading-relaxed font-medium mb-5 max-w-2xl">
              April 4th at 9:00 AM.
            </p>
            <p className="relative z-10 text-zinc-400 text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em]">
              Venue: AU Convention, Beach Road
            </p>
          </div>
        </div>
      </div>

      {/* 2. Featured Events Slideshow (Automatic) */}
      <FeaturedSlider
        events={events}
        registrationsLive={registrationsLive}
        onRegister={onRegister}
      />

      {/* 2.5 Event Tracks Preview */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="mb-4 md:mb-6 text-left">
          <p className={sectionKickerClass}>
            Event Tracks
          </p>
          <h3 className={sectionTitleClass}>
            Explore By Category
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          {EVENT_TRACKS.map((track) => {
            const categoryEvents = eventsByTrack[track.key];
            const previewEvents = categoryEvents.slice(0, 3);
            return (
              <div
                key={track.key}
                className={`rounded-[1.4rem] border ${track.accentClass} bg-gradient-to-br ${track.glowClass} via-zinc-950/80 p-5 md:p-6 text-left shadow-[0_8px_22px_rgba(0,0,0,0.35)]`}
              >
                <p className="mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-black">
                  {track.title}
                </p>
                <p className="text-zinc-300 text-sm leading-relaxed mt-2 mb-5">
                  {track.description}
                </p>

                <div className="space-y-2">
                  {previewEvents.length > 0 ? (
                    previewEvents.map((event) => (
                      <div
                        key={`${track.key}-${event.id}`}
                        className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-zinc-100 text-sm font-semibold"
                      >
                        {event.name.replace(/^AURAX-\s*/i, '')}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-white/15 bg-black/20 px-3 py-2 text-zinc-400 text-sm">
                      Event list will be updated soon.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onNavigateToEvents}
                  className="mt-5 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-zinc-200 hover:bg-white/10 transition-colors"
                >
                  View {categoryEvents.length} Events
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2.6 What To Expect */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className={`${panelClass} text-left`}>
          <div className="mb-4 md:mb-5">
            <p className={sectionKickerClass}>
              What To Expect
            </p>
            <h3 className={sectionTitleClass}>
              Event Day Experience
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {EXPECTATION_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-black/35 px-4 py-4"
              >
                <h4 className="text-base md:text-lg font-bold text-white mb-2">
                  {item.title}
                </h4>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Quick Rules + FAQ */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8">
          <div className={`${panelClass} text-left`}>
            <p className={sectionKickerClass}>
              Quick Rules
            </p>
            <h3 className={sectionTitleClass}>
              Before You Register
            </h3>
            <div className="space-y-3 text-zinc-200 text-sm md:text-[15px] mt-5">
              <div className="flex items-start gap-2.5">
                <span className="mt-1 inline-flex w-2 h-2 rounded-full bg-amber-300 flex-shrink-0"></span>
                <p>
                  One roll number can register only once per event. Multiple
                  registrations with the same roll number in the same event are
                  not allowed.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-1 inline-flex w-2 h-2 rounded-full bg-amber-300 flex-shrink-0"></span>
                <p>Department fee is mandatory to participate.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-1 inline-flex w-2 h-2 rounded-full bg-amber-300 flex-shrink-0"></span>
                <p>ID card is compulsory for every event.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-1 inline-flex w-2 h-2 rounded-full bg-amber-300 flex-shrink-0"></span>
                <p>Teams must report exactly at the given time.</p>
              </div>
            </div>
          </div>

          <div className={`${panelClass} text-left`}>
            <div className="mb-4 md:mb-5">
              <p className={sectionKickerClass}>
                FAQ
              </p>
              <h3 className={sectionTitleClass}>
                Common Questions
              </h3>
            </div>

            <div className="space-y-2.5 mt-5">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={item.question}
                    className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaqIndex((previous) =>
                          previous === index ? null : index
                        )
                      }
                      className="w-full px-4 md:px-5 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm md:text-base font-bold text-white pr-3">
                        {item.question}
                      </span>
                      <span className="text-indigo-300 text-lg leading-none">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 md:px-5 pb-4 text-zinc-300 text-sm md:text-[15px] leading-relaxed">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Registration Guide */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className={`${panelClass} text-left`}>
          <div className="mb-4 md:mb-5">
            <p className={sectionKickerClass}>
              How To Register
            </p>
            <h3 className={sectionTitleClass}>
              3 Simple Steps
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-5">
            {REGISTRATION_STEPS.map((step, index) => (
              <div
                key={step.title}
                className="rounded-xl border border-white/10 bg-black/35 px-4 py-4"
              >
                <span className="mono text-[10px] uppercase tracking-[0.2em] text-indigo-300 font-bold">
                  Step {index + 1}
                </span>
                <h4 className="text-base md:text-lg font-bold text-white mt-2 mb-2">
                  {step.title}
                </h4>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* 5. Primary CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-14">
        <div className={`${panelClass} text-center`}>
          <p className={sectionKickerClass}>Next Step</p>
          <h3 className={sectionTitleClass}>
            Explore all events and register your team
          </h3>
          <p className="text-zinc-300 text-sm md:text-base max-w-2xl mx-auto mt-3">
            Check team size, event status, and rules before submitting your registration.
          </p>
          <button
            onClick={onNavigateToEvents}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-xs md:text-sm font-bold tracking-[0.06em] text-indigo-100 hover:bg-indigo-500/25 transition-colors"
          >
            Explore All Events
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </button>
        </div>
      </section>

      {/* 6. Brand Legacy Statement */}
      <section className="max-w-5xl mx-auto px-6 py-8 md:py-12 text-center">
        <p className="mono text-[10px] uppercase tracking-[0.24em] text-zinc-500 font-black mb-3">
          Established // Legacy
        </p>
        <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-3xl mx-auto">
          A century of engineering vision. The 2026 centenary celebration of
          Computer Science at Andhra University.
        </p>
      </section>

      {/* 7. Coordinator Help */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-6 md:pb-10">
        <div className={`${panelClass} text-left`}>
          <div className="mb-4 md:mb-5">
            <p className={sectionKickerClass}>Coordinator Help</p>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Need Assistance?
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            {COORDINATOR_CONTACTS.map((contact) => {
              const phone = contact.phone.replace(/\D/g, '');
              return (
                <div
                  key={`${contact.name}-${contact.phone}`}
                  className="rounded-xl border border-white/10 bg-black/35 p-4"
                >
                  <p className="text-white text-base font-bold">{contact.name}</p>
                  <p className="text-zinc-400 text-sm mt-1">{contact.role}</p>
                  <div className="mt-3 flex items-center gap-2.5">
                    <a
                      href={`https://wa.me/91${phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={`tel:+91${phone}`}
                      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-zinc-200 hover:bg-white/10 transition-colors"
                    >
                      Call
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeView;
