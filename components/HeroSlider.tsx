
import React from 'react';
import aulogo from '../aulogo.png';
import centenaryBadge from '../100.png';

const HeroBanner: React.FC = () => {
  return (
    <div className="relative w-full px-3 md:px-10 lg:px-16 pt-1 md:pt-4 pb-1 md:pb-2">
      {/* AU Logo - Top Left */}
      <div className="absolute top-6 left-5 sm:left-10 md:top-10 md:left-36 z-30">
        <img 
          src={aulogo} 
          alt="Andhra University Logo" 
          className="w-14 h-14 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain"
        />
      </div>

      {/* Centenary Badge */}
      <div className="absolute top-6 right-3 sm:right-3 md:top-10 md:right-16 z-30 select-none pointer-events-none">
        <img
          src={centenaryBadge}
          alt="Centenary Badge"
          className="w-14 h-14 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain"
        />
      </div>

      <div className="relative h-[250px] sm:h-[360px] md:h-[500px] w-full overflow-hidden rounded-[1.5rem] md:rounded-[4rem] border border-white/5 bg-[#020202]">
        
        {/* Cinematic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08)_0%,transparent_70%)] aura-pulse-element"></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>
        
        {/* Main Brand Identity */}
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-6 md:px-8">
          <div className="relative z-10 flex flex-col items-center gap-2 mb-3 md:mb-6">
            <span className="mono text-[10px] sm:text-[11px] md:text-[14px] tracking-[0.25em] md:tracking-[0.5em] uppercase text-indigo-500/60 font-black aura-text-glow">
              Andhra University
            </span>
          </div>
          
          <div className="relative z-10 w-full max-w-full overflow-hidden">
            <h1
              className="font-black tracking-tight leading-[0.84] select-none uppercase mb-2 md:mb-4 px-1 sm:px-2"
              style={{ fontSize: 'clamp(3.6rem, 19vw, 10rem)' }}
            >
              <span className="text-red-600">AU</span><span className="text-white">RAX</span>
            </h1>

            <div className="flex flex-col items-center gap-2 md:gap-4">
              {/* Refined Tracking for the Tagline: Significantly wider for premium feel */}
              <h2
                className="font-extralight text-white/40 uppercase px-2 text-center"
                style={{
                  fontSize: 'clamp(0.66rem, 2.8vw, 1.25rem)',
                  letterSpacing: 'clamp(0.08em, 0.35vw, 0.5em)'
                }}
              >
                10 Decades <span className="text-zinc-900/50 mx-1 md:mx-4 font-black">|</span> 1 Aura
              </h2>
              
              <div className="flex items-center gap-2 md:gap-6 mt-1 md:mt-2 max-w-full">
                <div className="h-[1px] w-6 md:w-20 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
                <span
                  className="mono uppercase font-black text-zinc-700 text-center"
                  style={{
                    fontSize: 'clamp(0.32rem, 1.55vw, 0.5rem)',
                    letterSpacing: 'clamp(0.16em, 0.3vw, 0.5em)'
                  }}
                >
                  Farewell Day // April 4 // 9 AM
                </span>
                <div className="h-[1px] w-6 md:w-20 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Technical Accents - Desktop only */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-10 opacity-10 hidden md:flex">
          <div className="flex flex-col items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-white"></div>
            <div className="w-[1px] h-8 bg-gradient-to-b from-white to-transparent"></div>
          </div>
        </div>
      </div>
      
      {/* AURAX Event Description */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="relative z-10 w-full text-left">
            <h3 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight mb-4 md:mb-6">
              About AURAX 2026
            </h3>
            <p className="text-zinc-300 text-sm md:text-base leading-relaxed font-medium mb-4">
              AURAX 2026 marks the centenary celebration of the Department of Computer Science & Engineering at Andhra University.
              This historic event brings together students, faculty, alumni, and industry experts to celebrate 100 years of excellence in computing education and research.
            </p>
            <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-6">
              Join us with full energy for technical symposiums, cultural events, hackathons, debates, and networking opportunities
              as we celebrate our legacy and shape the future of technology together.
            </p>

            <div className="space-y-5 mb-6">
              <div>
                <p className="mono text-[9px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-1">Innovation</p>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">Hands-on hackathons, coding challenges, and project showcases across modern technology domains.</p>
              </div>
              <div>
                <p className="mono text-[9px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-1">Collaboration</p>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">A shared platform where students connect with mentors, researchers, alumni, and industry leaders.</p>
              </div>
              <div>
                <p className="mono text-[9px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-1">Culture</p>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">Festive cultural showcases and community-driven programs that reflect the spirit of AU.</p>
              </div>
              <div>
                <p className="mono text-[9px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-1">Legacy</p>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">A centenary milestone that honors our past achievements while setting the course for the next era.</p>
              </div>
            </div>

            <p className="text-zinc-500 text-xs md:text-sm leading-relaxed">
              More than a festival, AURAX is a launchpad for ideas, talent, and partnerships that will define the coming decade of computing at Andhra University.
            </p>
          </div>
      </div>
    </div>
  );
};

export default HeroBanner;
