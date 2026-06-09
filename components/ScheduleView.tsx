import React, { useMemo } from 'react';
import { Event } from '../types';

interface ScheduleViewProps {
  events: Event[];
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ events }) => {
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    events.forEach(event => {
      const date = event.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    });
    // Sort dates (assuming standard format like "Feb 12, 2026")
    return Object.entries(groups).sort((a, b) => {
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    });
  }, [events]);

  return (
    <div className="max-w-5xl mx-auto py-8 md:py-14 animate-reveal px-2 md:px-4">
      <div className="space-y-12 md:space-y-12">
        <div className="space-y-4 md:space-y-6 text-center">
          <h2 className="text-2xl md:text-5xl font-black tracking-tighter leading-none uppercase">Event Schedule</h2>
          <p className="text-[10px] md:text-sm mono tracking-[0.2em] uppercase text-zinc-400">
            Note: Schedule will be updated soon.
          </p>
        </div>

        <div className="space-y-16 md:space-y-12 relative">
          {/* Central Line - Continuous timeline axis across all breakpoints */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -translate-x-1/2"></div>

          <div className="flex justify-center sticky top-24 md:top-28 z-20">
            <div className="px-6 md:px-10 py-2.5 md:py-3 glass-premium rounded-full border-white/10 bg-black/80 backdrop-blur-xl">
              <h3 className="text-sm md:text-xl font-black text-white tracking-widest uppercase">MARCH</h3>
            </div>
          </div>

          {groupedEvents.map(([date, dateEvents], dateIdx) => (
            <div key={`${date}-${dateIdx}`} className="relative space-y-10 md:space-y-10">
              {/* Event Timeline - Fixed dual column staggered grid for all breakpoints */}
              <div className="grid grid-cols-2 gap-x-2 md:gap-x-12 gap-y-8 md:gap-y-14 relative">
                {dateEvents.sort((a, b) => a.time.localeCompare(b.time)).map((event, eventIdx) => (
                  <div
                    key={event.id}
                    className={`relative p-3 md:p-6 glass-premium rounded-[1.2rem] md:rounded-[1.6rem] border-white/5 bg-zinc-950/40 hover:border-indigo-500/30 transition-all group flex flex-col ${
                      eventIdx % 2 === 0 ? 'text-right items-end' : 'translate-y-12 md:translate-y-10 items-start text-left'
                    }`}
                  >
                    {/* Visual Connector Dot - Re-scaled and re-positioned for dual-column mobile */}
                    <div className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-zinc-900 border border-indigo-500 z-10 ${
                      eventIdx % 2 === 0 ? '-right-[12px] md:-right-[30px]' : '-left-[12px] md:-left-[30px]'
                    }`}></div>

                    <div className="space-y-2 md:space-y-4 w-full">
                      <h4 className="text-[11px] md:text-xl font-black text-white uppercase tracking-tighter group-hover:text-indigo-400 transition-colors leading-tight">
                        {event.name.replace('AURAX-', '')}
                      </h4>

                      <div className={`flex flex-wrap gap-1 md:gap-2 ${eventIdx % 2 === 0 ? 'justify-end' : ''}`}>
                        <span className="px-1.5 py-0.5 md:px-2.5 md:py-1 bg-white/5 rounded-md text-[6px] md:text-[7px] mono text-zinc-400 uppercase font-black tracking-widest">
                          {event.category}
                        </span>
                        {event.subCategory !== 'NONE' && (
                          <span className="px-1.5 py-0.5 md:px-2.5 md:py-1 bg-indigo-500/10 text-indigo-400 rounded-md text-[6px] md:text-[7px] mono uppercase font-black tracking-widest">
                            {event.subCategory}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Closing Label */}
        <div className="pt-10 md:pt-12 text-center opacity-20">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-8 md:w-12 bg-white"></div>
            <span className="mono text-[7px] md:text-[8px] font-black tracking-[0.5em] md:tracking-[1em] uppercase">End of Transmission</span>
            <div className="h-px w-8 md:w-12 bg-white"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
