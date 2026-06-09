
import React from 'react';
import { Event } from '../types';
import HeroBanner from './HeroSlider';

interface LandingViewProps {
  events: Event[];
  onRegister: (event: Event) => void;
  // Added onNavigateToEvents to match HeroBannerProps requirement
  onNavigateToEvents: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ events, onRegister, onNavigateToEvents }) => {
  return (
    <div className="space-y-12">
      <div id="vortex">
        {/* Fix: HeroBanner is a static visual component and does not accept props */}
        <HeroBanner />
      </div>
      
      {/* Centenary Recognition Section - Adds context since track list is removed */}
      <section id="about" className="py-20 md:py-32 border-y border-white/5 animate-reveal scroll-mt-32" style={{ animationDelay: '0.4s' }}>
        <div className="max-w-4xl mx-auto text-center space-y-10 px-6">
          <div className="flex flex-col items-center gap-4">
             <span className="mono text-[10px] uppercase text-zinc-500 tracking-[0.6em]">Department Vision</span>
             <h2 className="text-4xl md:text-6xl font-black tracking-tighter aura-text-glow leading-none">A Century of Engineering.</h2>
          </div>
          <p className="text-zinc-500 text-sm md:text-lg leading-relaxed max-w-2xl mx-auto font-medium">
            Founded in 1926, the Computer Science and Engineering Department at Andhra University continues its legacy through AURAX. 
            Experience the definitive confluence of tradition and technology.
          </p>
          <div className="flex flex-wrap justify-center gap-12 pt-6 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
             <div className="text-center">
                <p className="text-3xl font-black text-white">100</p>
                <p className="mono text-[8px] uppercase tracking-widest text-zinc-500">Decades</p>
             </div>
             <div className="text-center">
                <p className="text-3xl font-black text-white">50+</p>
                <p className="mono text-[8px] uppercase tracking-widest text-zinc-500">Challenges</p>
             </div>
             <div className="text-center">
                <p className="text-3xl font-black text-white">10k</p>
                <p className="mono text-[8px] uppercase tracking-widest text-zinc-500">Attendees</p>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingView;