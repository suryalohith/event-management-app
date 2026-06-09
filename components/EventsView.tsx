
import React, { memo, useMemo } from 'react';
import { Event, EventCategory, EventStatus, SportsSubCategory } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface EventIconProps {
  category: EventCategory;
  name: string;
}

const EventIcon: React.FC<EventIconProps> = memo(({ category, name }) => {
  const normalizedName = name.toLowerCase();
  
  if (category === EventCategory.SPORTS) {
    // 1. ESPORTS
    if (normalizedName.includes('freefire') || normalizedName.includes('free fire') || normalizedName.includes('bgmi') || normalizedName.includes('cod') || normalizedName.includes('valorant')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M6 12h4M8 10v4M15 11v.01M18 13v.01"/>
          <rect x="2" y="6" width="20" height="12" rx="2"/>
        </svg>
      );
    }
    // 2. BADMINTON
    if (normalizedName.includes('badminton')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M21 3L11 13"/><path d="M12 4l-3 3"/><path d="M16 8l-3 3"/><circle cx="7.5" cy="16.5" r="4.5"/>
        </svg>
      );
    }
    // 3. CHESS
    if (normalizedName.includes('chess')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M12 2a3 3 0 0 0-3 3c0 2 3 3 3 3s3-1 3-3a3 3 0 0 0-3-3z"/><path d="M8 8l-2 11h12l-2-11"/><path d="M6 22h12"/>
        </svg>
      );
    }
    // 4. CRICKET
    if (normalizedName.includes('cricket')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M18 2l-3 3-11 11c-1 1-1 3 0 4s3 1 4 0l11-11 3-3"/><circle cx="5" cy="19" r="2.5"/>
        </svg>
      );
    }
    // 5. FOOTBALL
    if (normalizedName.includes('football')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/><path d="m12 12-5-5M12 12l5 5M12 12-5 5M12 12l5-5"/>
        </svg>
      );
    }
    // 6. BASKETBALL
    if (normalizedName.includes('basketball')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <circle cx="12" cy="12" r="10"/><path d="M5.5 18.5c2.5-2.5 6.5-2.5 9 0"/><path d="M9.5 5.5c2.5 2.5 2.5 6.5 0 9"/>
        </svg>
      );
    }
    // 7. TABLE TENNIS
    if (normalizedName.includes('table tennis')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M16 11c0 3-2.5 5-5 5s-5-2-5-5 2.5-5 5-5 5 2 5 5z"/><path d="M11 16v5"/><circle cx="18" cy="6" r="2"/>
        </svg>
      );
    }
    // 8. KABADDI
    if (normalizedName.includes('kabaddi')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M12 3v10"/><path d="m5 10 7 3 7-3"/><path d="m17 18-5-5-5 5"/><path d="M12 13v8"/>
        </svg>
      );
    }
    // 9. CARROMS
    if (normalizedName.includes('carroms')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <rect x="3" y="3" width="18" height="18" rx="1"/>
          <circle cx="6" cy="6" r="1"/><circle cx="18" cy="6" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="18" cy="18" r="1"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      );
    }
    // 10. CUBE SOLVING
    if (normalizedName.includes('cube')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="m12 3-8 4.5v9l8 4.5 8-4.5v-9L12 3z"/><path d="m12 12 8-4.5"/><path d="M12 12 4 7.5"/><path d="M12 12v9"/>
        </svg>
      );
    }
    // 11. SPRINT / KHO-KHO (Athletics)
    if (normalizedName.includes('sprint') || normalizedName.includes('kho-kho')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <circle cx="15" cy="5" r="1"/><path d="m13 10-4 2-2 4"/><path d="m13 10 2 2 3-2"/><path d="m7 21 3-5 2-1 3 3 3 1"/>
        </svg>
      );
    }
    // 12. VOLLEYBALL / THROWBALL / DODGEBALL
    if (normalizedName.includes('volleyball') || normalizedName.includes('throw ball') || normalizedName.includes('dodge ball')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M2 12a10 10 0 0 0 10 10"/><path d="m7 7 10 10"/>
        </svg>
      );
    }
    // 13. TUG OF WAR
    if (normalizedName.includes('tug of war')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M2 12h8"/><path d="M14 12h8"/><circle cx="12" cy="12" r="2"/>
          <path d="m4 9-2 3 2 3"/><path d="m20 9 2 3-2 3"/>
        </svg>
      );
    }
  }

  // TECHNICAL CATEGORY ICON
  if (category === EventCategory.TECH) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="14" y1="4" x2="10" y2="20"/>
      </svg>
    );
  }

  // NON-TECHNICAL CATEGORY ICON
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="m12 3 8 4.5v9l-8 4.5-8-4.5v-9L12 3z"/><path d="M12 12h9"/><path d="M12 12v9"/><path d="m12 12-8-4.5"/>
    </svg>
  );
});

EventIcon.displayName = 'EventIcon';

interface EventsViewProps {
  events: Event[];
  registrationsLive: boolean;
  activeCategory: EventCategory;
  activeSportsType: SportsSubCategory;
  onCategoryChange: (category: EventCategory) => void;
  onSportsTypeChange: (sportsType: SportsSubCategory) => void;
  onRegister: (event: Event) => void;
}

const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  REGISTRATION_OPEN_SOON: 'REGISTRATIONS OPEN SOON'
};

const getEventStatusClassName = (status: EventStatus): string => {
  if (status === 'OPEN') {
    return 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5';
  }

  if (status === 'REGISTRATION_OPEN_SOON') {
    return 'border-amber-500/40 text-amber-300 bg-amber-500/10';
  }

  return 'border-zinc-800 text-zinc-700 bg-zinc-900/50';
};

const getEventStatusDotClassName = (status: EventStatus): string => {
  if (status === 'OPEN') {
    return 'bg-indigo-500 animate-pulse';
  }

  if (status === 'REGISTRATION_OPEN_SOON') {
    return 'bg-amber-400';
  }

  return 'bg-zinc-800';
};

const getCapacityLabel = (event: Event): string => {
  if (event.id === 's_cri') {
    return '11 Players + 4 Substitutes';
  }

  if (event.id === 's_fb') {
    return '7 Players + 3 Substitutes';
  }

  if (event.category === EventCategory.TECH) {
    return event.maxTeamSize === 1
      ? '1 Participant'
      : `Team of ${event.maxTeamSize}`;
  }

  if (event.category === EventCategory.NON_TECH) {
    return `${event.maxTeamSize} ${
      event.maxTeamSize > 1 ? 'Participants' : 'Participant'
    }`;
  }

  return `${event.maxTeamSize} ${event.maxTeamSize > 1 ? 'Players' : 'Player'}`;
};

const EventsView: React.FC<EventsViewProps> = ({
  events,
  registrationsLive,
  activeCategory,
  activeSportsType,
  onCategoryChange,
  onSportsTypeChange,
  onRegister
}) => {
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (e.category !== activeCategory) return false;
      if (activeCategory === EventCategory.SPORTS && activeSportsType !== 'NONE') {
        return e.subCategory === activeSportsType;
      }
      return true;
    });
  }, [events, activeCategory, activeSportsType]);

  const sportsTypes: SportsSubCategory[] = ['NONE', 'ESPORTS', 'INDOOR', 'OUTDOOR'];

  return (
    <div className="space-y-8 md:space-y-16 animate-reveal">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-8 border-b border-white/5 pb-8 md:pb-12 px-2">
        <div className="relative pl-6 md:pl-8">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-500 to-transparent"></div>
          <span className="mono text-[9px] md:text-[11px] uppercase text-zinc-600 tracking-[0.5em] block mb-2 md:mb-3 font-bold">Catalogue // Event 2026</span>
          <h2 className="text-3xl md:text-6xl font-black tracking-tighter leading-none uppercase">Event Tracks</h2>
        </div>
        
        {/* Navigation Bar - Horizontal flex for 3 items, no scrollbar */}
        <div className="flex gap-1 p-1 bg-zinc-900/40 rounded-[1.2rem] md:rounded-[2rem] border border-white/5 backdrop-blur-3xl w-full lg:w-auto overflow-hidden">
          {Object.values(EventCategory).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                onCategoryChange(cat);
              }}
              className={`flex-1 lg:flex-none px-3 md:px-14 py-2.5 md:py-5 rounded-[0.9rem] md:rounded-[1.5rem] text-[8px] md:text-[11px] font-black uppercase tracking-[0.1em] md:tracking-[0.25em] transition-all whitespace-nowrap ${
                activeCategory === cat 
                  ? 'bg-white text-black shadow-2xl scale-[1.02]' 
                  : 'text-zinc-600 hover:text-zinc-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {activeCategory === EventCategory.SPORTS && (
        <div className="flex flex-wrap gap-3 pl-2 md:pl-10 justify-center md:justify-start">
          {sportsTypes.map(st => (
            <button
              key={st}
              onClick={() => onSportsTypeChange(st)}
              className={`px-4 md:px-10 py-2 rounded-full text-[8px] md:text-[10px] uppercase font-black tracking-widest transition-all border ${
                activeSportsType === st
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                  : 'border-white/5 text-zinc-600 hover:border-white/20 hover:text-white'
              }`}
            >
              {st === 'NONE' ? 'All' : st}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-10 pb-24 px-2">
        {filteredEvents.map((event, idx) => (
          <div 
            key={event.id}
            className="group relative flex flex-col bg-[#080808] border border-white/5 rounded-[1.5rem] md:rounded-[3.5rem] p-5 md:p-14 overflow-hidden transition-all duration-700 hover:border-indigo-500/30 hover:-translate-y-1"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            {/* Holographic Decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            
            <div className="flex justify-between items-start mb-6 md:mb-8 relative z-10">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 p-3 md:p-4 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                <EventIcon category={event.category} name={event.name} />
              </div>
              
              <div
                className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full border text-[8px] md:text-[9px] mono font-black uppercase tracking-widest flex items-center gap-1.5 md:gap-2 ${
                  registrationsLive
                    ? getEventStatusClassName(event.status)
                    : 'border-rose-500/40 text-rose-300 bg-rose-500/10'
                }`}
              >
                <div
                  className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${
                    registrationsLive
                      ? getEventStatusDotClassName(event.status)
                      : 'bg-rose-400'
                  }`}
                ></div>
                {registrationsLive
                  ? EVENT_STATUS_LABELS[event.status]
                  : 'REGISTRATIONS CLOSED'}
              </div>
            </div>

            <div className="flex-grow space-y-4 md:space-y-6 relative z-10">
              <div className="space-y-1">
                <h3 className="text-xl md:text-4xl font-black tracking-tighter text-white leading-tight group-hover:text-indigo-400 transition-colors duration-500 uppercase">
                  {event.name.replace('AURAX-', '')}
                </h3>
              </div>
              <p className="text-zinc-500 text-[12px] md:text-sm leading-relaxed font-medium line-clamp-3 md:line-clamp-none">
                {event.description}
              </p>
            </div>
            
            <div className="mt-4 md:mt-10 pt-4 md:pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
              <div className="flex flex-col gap-1 md:gap-1.5">
                <p className="text-[8px] md:text-[9px] uppercase text-zinc-600 mono tracking-[0.3em] font-bold">Squad Scale</p>
                <p className="text-[11px] md:text-sm text-zinc-200 font-black uppercase tracking-widest">
                  {getCapacityLabel(event)}
                </p>
              </div>
              
              <button
                disabled={!registrationsLive || event.status !== 'OPEN'}
                onClick={() => onRegister(event)}
                className={`w-12 h-12 md:w-16 md:h-16 rounded-[1.2rem] md:rounded-[1.8rem] flex items-center justify-center transition-all duration-300 shadow-2xl relative group/btn ${
                  registrationsLive && event.status === 'OPEN'
                    ? 'bg-zinc-900 border border-white/10 text-white hover:bg-indigo-600 hover:border-indigo-400 hover:scale-110 md:hover:scale-125 hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] active:scale-90 md:group-hover:rotate-[360deg]' 
                    : !registrationsLive
                      ? 'bg-rose-950/30 border border-rose-500/20 text-rose-700 cursor-not-allowed'
                      : event.status === 'REGISTRATION_OPEN_SOON'
                      ? 'bg-amber-950/30 border border-amber-500/20 text-amber-700 cursor-not-allowed'
                      : 'bg-zinc-950/50 border border-zinc-900 text-zinc-800 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 md:w-[22px] md:h-[22px]">
                  <path d="M5 12h14m-7-7 7 7-7 7"/>
                </svg>
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
              </button>
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="col-span-full py-24 md:py-40 text-center border border-white/5 rounded-[2.5rem] md:rounded-[4rem] bg-zinc-950/20 backdrop-blur-xl">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 border border-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <p className="mono text-[9px] md:text-[11px] uppercase tracking-[0.5em] text-zinc-700 font-black px-4">Zero_Entries_Detected_In_Event_Track</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsView;
