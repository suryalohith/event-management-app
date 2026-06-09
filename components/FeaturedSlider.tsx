
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Event } from '../types';

interface FeaturedSliderProps {
  events: Event[];
  registrationsLive: boolean;
  onRegister: (event: Event) => void;
}

const FEATURED_EVENT_KEYS = [
  'bgmi',
  'aichallenge',
  'bestreel',
  'freefire',
  'cricket'
] as const;

const normalizeEventName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

const getFeaturedEvents = (events: Event[]): Event[] => {
  if (events.length <= 5) {
    return events;
  }

  const usedEventIds = new Set<string>();
  const normalizedEvents = events.map((event) => ({
    event,
    normalizedName: normalizeEventName(event.name)
  }));

  const preferredEvents = FEATURED_EVENT_KEYS.flatMap((key) => {
    const matched = normalizedEvents.find(
      ({ event, normalizedName }) =>
        !usedEventIds.has(event.id) && normalizedName.includes(key)
    );

    if (!matched) {
      return [];
    }

    usedEventIds.add(matched.event.id);
    return [matched.event];
  });

  const fallbackEvents = events.filter((event) => !usedEventIds.has(event.id));
  return [...preferredEvents, ...fallbackEvents].slice(0, 5);
};

const getCapacityMeta = (
  event: Event
): { heading: string; value: string } => {
  if (event.category === 'TECH') {
    return {
      heading: 'Team',
      value:
        event.maxTeamSize === 1
          ? '1 Participant'
          : `Team of ${event.maxTeamSize}`
    };
  }

  return {
    heading: 'Capacity',
    value: `${event.maxTeamSize} PPL`
  };
};

const getEventBadgeLabel = (event: Event): string =>
  event.category === 'SPORTS' && event.subCategory === 'ESPORTS'
    ? 'ESPORTS'
    : event.category === 'NON_TECH'
      ? 'NON TECH'
      : event.category;

const getEventBadgeTextClassName = (label: string): string =>
  label.length > 7
    ? 'text-[9px] md:text-2xl tracking-[0.16em] md:tracking-[0.2em] leading-tight'
    : 'text-sm md:text-3xl tracking-[0.24em] leading-none';

const getFeaturedCtaLabel = (
  event: Event,
  registrationsLive: boolean
): string => {
  if (!registrationsLive) {
    return 'REGISTRATIONS CLOSED';
  }

  if (event.status === 'OPEN') {
    return 'REGISTER';
  }

  if (event.status === 'REGISTRATION_OPEN_SOON') {
    return 'REGISTRATIONS OPEN SOON';
  }

  return 'CLOSED';
};

const getFeaturedCtaClassName = (
  event: Event,
  registrationsLive: boolean
): string => {
  if (registrationsLive && event.status === 'OPEN') {
    return 'bg-white text-black hover:bg-indigo-500 hover:text-white';
  }

  if (!registrationsLive) {
    return 'bg-rose-950/30 text-rose-300 border border-rose-500/20 cursor-not-allowed';
  }

  if (event.status === 'REGISTRATION_OPEN_SOON') {
    return 'bg-amber-950/30 text-amber-300 border border-amber-500/20 cursor-not-allowed';
  }

  return 'bg-zinc-900/80 text-zinc-600 cursor-not-allowed';
};

const FeaturedSlider: React.FC<FeaturedSliderProps> = ({
  events,
  registrationsLive,
  onRegister
}) => {
  const [current, setCurrent] = useState(0);
  const featured = useMemo(() => getFeaturedEvents(events), [events]);
  const INTERVAL = 5000;
  const SWIPE_THRESHOLD = 50;
  const WHEEL_THRESHOLD = 20;
  const swipeStartXRef = useRef<number | null>(null);
  const swipeDeltaXRef = useRef(0);
  const wheelLockRef = useRef(false);

  const nextSlide = useCallback(() => {
    if (featured.length === 0) return;
    setCurrent((prev) => (prev + 1) % featured.length);
  }, [featured.length]);

  const prevSlide = useCallback(() => {
    if (featured.length === 0) return;
    setCurrent((prev) => (prev - 1 + featured.length) % featured.length);
  }, [featured.length]);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(nextSlide, INTERVAL);
    return () => clearInterval(timer);
  }, [nextSlide, featured.length]);

  useEffect(() => {
    if (current >= featured.length) {
      setCurrent(0);
    }
  }, [current, featured.length]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    swipeStartXRef.current = event.clientX;
    swipeDeltaXRef.current = 0;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeStartXRef.current === null) return;
    swipeDeltaXRef.current = event.clientX - swipeStartXRef.current;
  };

  const handlePointerEnd = () => {
    if (swipeStartXRef.current === null) return;
    const deltaX = swipeDeltaXRef.current;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (deltaX < 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }

    swipeStartXRef.current = null;
    swipeDeltaXRef.current = 0;
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const horizontalDelta =
      Math.abs(event.deltaX) >= Math.abs(event.deltaY)
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0;

    if (Math.abs(horizontalDelta) < WHEEL_THRESHOLD || wheelLockRef.current) {
      return;
    }

    event.preventDefault();
    wheelLockRef.current = true;

    if (horizontalDelta > 0) {
      nextSlide();
    } else {
      prevSlide();
    }

    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 220);
  };

  return (
    <div className="relative w-full py-8 md:py-16 px-4 md:px-10 lg:px-16 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* Header with Nav */}
        <div className="flex items-end justify-between mb-8 md:mb-12 border-b border-white/5 pb-6 md:pb-8 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2 md:gap-3">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,1)]"></span>
              <span className="mono text-[8px] md:text-[9px] uppercase text-zinc-500 tracking-[0.3em] md:tracking-[0.5em] font-bold">Priority // Broadcast</span>
            </div>
            <h2 className="text-3xl md:text-6xl font-black tracking-tighter uppercase aura-text-glow leading-none">Top Events</h2>
          </div>
          
          <div className="hidden md:flex gap-4 items-center">
            <div className="flex gap-1.5">
              {featured.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => { setCurrent(idx); }}
                  className={`h-1 transition-all duration-700 rounded-full ${
                    idx === current ? 'w-8 md:w-10 bg-indigo-500' : 'w-2 md:w-3 bg-zinc-800 hover:bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Slideshow Container */}
        <div
          className="relative w-full overflow-hidden rounded-[1.5rem] md:rounded-[4.5rem] bg-zinc-950/20 border border-white/5"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onWheel={handleWheel}
          style={{
            touchAction: 'pan-y',
            height: 'clamp(430px, 78vw, 600px)'
          }}
        >
          
          {featured.map((event, idx) => (
            <div
              key={event.id}
              className={`absolute inset-0 transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col md:flex-row p-6 sm:p-8 md:p-24 items-center gap-6 sm:gap-10 md:gap-16 ${
                idx === current ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-20 scale-95 pointer-events-none'
              }`}
            >
              {/* Event Visual (Big Icon/Number) */}
              <div className="relative flex-shrink-0 w-28 h-28 xs:w-36 xs:h-36 md:w-64 md:h-64 flex items-center justify-center">
                {/* Background Glow */}
                <div className={`absolute inset-0 blur-[60px] md:blur-[100px] opacity-20 bg-gradient-to-br ${
                  event.category === 'TECH' ? 'from-indigo-600' : 'from-rose-600'
                } rounded-full`}></div>
                
                {/* Number Frame */}
                <div className="relative z-10 w-full h-full rounded-[3rem] md:rounded-[4rem] border border-white/10 bg-black/40 backdrop-blur-3xl flex items-center justify-center overflow-hidden transition-transform duration-700 group-hover:scale-105">
                  <span className="text-[4rem] md:text-[10rem] font-black text-white/5 select-none absolute leading-none">
                    0{idx + 1}
                  </span>
                  <div className="text-center relative z-20 max-w-full px-1 md:px-2">
                    <p className="mono text-[6px] md:text-[10px] text-zinc-500 tracking-[0.3em] md:tracking-[0.6em] uppercase mb-1 md:mb-2">Event</p>
                    <p
                      className={`font-black text-white uppercase text-center whitespace-nowrap max-w-full ${getEventBadgeTextClassName(
                        getEventBadgeLabel(event)
                      )}`}
                    >
                      {getEventBadgeLabel(event)}
                    </p>
                  </div>
                  {/* Internal border accent */}
                  <div className="absolute inset-3 md:inset-4 border border-white/5 rounded-[2.5rem] md:rounded-[3rem]"></div>
                </div>
              </div>

              {/* Event Details */}
              <div className="flex-grow space-y-6 md:space-y-8 text-center md:text-left overflow-hidden">
                <div className="space-y-1 md:space-y-2">
                  <h3
                    className="font-black tracking-tighter text-white uppercase leading-[1] md:leading-[0.9] group-hover:aura-text-glow transition-all duration-500 break-words px-2"
                    style={{ fontSize: 'clamp(1.25rem, 5vw, 3.75rem)' }}
                  >
                    {event.name.replace('AURAX-', '')}
                  </h3>
                </div>

                <p
                  className="text-zinc-500 leading-relaxed max-w-2xl font-medium text-pretty line-clamp-3 md:line-clamp-none"
                  style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}
                >
                  {event.description}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-12 pt-2 md:pt-4">
                  <div className="space-y-0.5 md:space-y-1">
                    <p className="mono text-[7px] md:text-[8px] uppercase text-zinc-700 tracking-widest font-bold">
                      {getCapacityMeta(event).heading}
                    </p>
                    <p className="text-[9px] md:text-sm text-zinc-300 font-black uppercase tracking-widest">
                      {getCapacityMeta(event).value}
                    </p>
                  </div>
                </div>

                <div className="pt-4 md:pt-8">
                  <button
                    disabled={!registrationsLive || event.status !== 'OPEN'}
                    onClick={() => onRegister(event)}
                    className={`group/btn relative w-full md:w-auto px-6 md:px-16 py-3 md:py-7 text-[9px] md:text-[12px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] rounded-xl md:rounded-2xl transition-all active:scale-95 flex items-center justify-center md:justify-start gap-2 md:gap-5 ${getFeaturedCtaClassName(
                      event,
                      registrationsLive
                    )}`}
                  >
                    <span>{getFeaturedCtaLabel(event, registrationsLive)}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover/btn:translate-x-1.5 transition-transform"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Navigation Controls - Hidden on mobile, visible on laptop hover */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 md:px-10 pointer-events-none">
            <button 
              onClick={prevSlide}
              className="pointer-events-auto w-10 h-10 md:w-16 md:h-16 rounded-full bg-black/20 backdrop-blur-md border border-white/5 hidden md:flex items-center justify-center text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all group/nav opacity-0 group-hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover/nav:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button 
              onClick={nextSlide}
              className="pointer-events-auto w-10 h-10 md:w-16 md:h-16 rounded-full bg-black/20 backdrop-blur-md border border-white/5 hidden md:flex items-center justify-center text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all group-hover/nav:translate-x-1 transition-transform group/nav opacity-0 group-hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        {/* Mobile-only slide indicators */}
        <div className="flex md:hidden justify-center gap-2 mt-6">
          {featured.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { setCurrent(idx); }}
              className={`h-1.5 transition-all duration-500 rounded-full ${
                idx === current ? 'w-8 bg-indigo-500' : 'w-2 bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedSlider;
