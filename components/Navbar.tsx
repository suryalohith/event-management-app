
import React from 'react';
import { ViewState } from '../types';
import { INSTAGRAM_URL } from '../appConfig';

interface NavbarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange }) => {
  return (
    <nav className="fixed left-0 right-0 z-50 px-2 sm:px-3 md:px-0 pt-[max(env(safe-area-inset-top),8px)] md:top-8 md:pt-0">
      <div className="max-w-7xl mx-auto glass-premium rounded-2xl md:rounded-full px-3 sm:px-4 md:px-10 py-2.5 md:py-4 border-white/5 bg-zinc-950/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-3 md:gap-5">
            <div
              className="flex items-center gap-2 md:gap-5 cursor-pointer group flex-shrink-0 min-w-0"
              onClick={() => onViewChange('HOME')}
            >
              <div className="w-8 h-8 md:w-11 md:h-11 border border-white/20 rounded-lg md:rounded-2xl flex items-center justify-center group-hover:border-indigo-500 transition-all group-hover:bg-white/5">
                <span className="text-[8px] md:text-[11px] font-black text-white">AU</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] md:text-sm font-black tracking-tighter uppercase leading-none truncate">AURAX-2026</span>
                <span className="text-[6px] md:text-[8px] mono text-zinc-600 uppercase tracking-widest mt-1 hidden xs:block">AU CSE LEGACY</span>
              </div>
            </div>

            <InstagramLink className="md:hidden" />
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="grid grid-cols-3 md:flex items-center gap-1 md:gap-12 py-1 rounded-xl md:rounded-none bg-zinc-900/35 md:bg-transparent p-1 md:p-0 w-full md:w-auto">
              <NavLink
                active={currentView === 'HOME'}
                onClick={() => onViewChange('HOME')}
              >
                Home
              </NavLink>

              <NavLink
                active={currentView === 'SCHEDULE'}
                onClick={() => onViewChange('SCHEDULE')}
              >
                Schedule
              </NavLink>

              <NavLink
                active={currentView === 'EVENTS'}
                onClick={() => onViewChange('EVENTS')}
              >
                Events
              </NavLink>
            </div>

            <InstagramLink className="hidden md:flex" />
          </div>
        </div>
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ active: boolean; children: React.ReactNode; onClick: () => void }> = ({ active, children, onClick }) => (
  <button 
    onClick={onClick}
    className={`mobile-tight w-full min-w-0 md:w-auto text-center text-[8px] sm:text-[9px] md:text-[10px] uppercase font-black tracking-[0.08em] sm:tracking-[0.12em] md:tracking-[0.25em] transition-all relative py-2 md:py-1 truncate ${
      active ? 'text-white' : 'text-zinc-500 hover:text-white'
    }`}
  >
    {children}
    {active && <span className="absolute bottom-0 md:-bottom-2 left-2 md:left-0 right-2 md:right-0 h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>}
  </button>
);

const InstagramLink: React.FC<{ className?: string }> = ({ className }) => (
  <a
    href={INSTAGRAM_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Follow us on Instagram"
    title="Follow us on Instagram"
    className={`h-8 md:h-11 px-2.5 md:px-4 border border-white/20 rounded-full md:rounded-2xl inline-flex items-center justify-center gap-1.5 md:gap-2 text-zinc-300 hover:text-white hover:border-fuchsia-400/60 hover:bg-white/5 transition-all flex-shrink-0 ${className || ''}`}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 md:w-5 md:h-5"
      aria-hidden="true"
    >
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" />
    </svg>
    <span className="text-[7px] sm:text-[8px] md:text-[9px] uppercase font-black tracking-[0.1em] whitespace-nowrap">
      Follow us on Instagram
    </span>
  </a>
);

export default Navbar;
