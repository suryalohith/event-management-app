
import React from 'react';

const AboutView: React.FC = () => {
  return (
    <section className="py-12 md:py-24 animate-reveal">
      <div className="max-w-4xl mx-auto space-y-16 px-6">
        <div className="space-y-6 text-center">
          <span className="mono text-[10px] uppercase text-zinc-500 tracking-[0.6em] block">Legacy // Vision</span>
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter aura-text-glow leading-none">A Century of Engineering.</h2>
        </div>

        <div className="glass-premium p-8 md:p-16 rounded-[3rem] border-white/5 bg-zinc-950/40 space-y-10">
          <p className="text-zinc-300 text-lg md:text-2xl leading-relaxed font-light text-balance text-center">
            Founded in <span className="text-white font-bold">1926</span>, the Department of Computer Science and Engineering at Andhra University stands as a beacon of academic rigor and technological advancement.
          </p>
          
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-zinc-400 text-sm md:text-base leading-relaxed">
            <p>
              As we approach our centenary, AURAX-2026 serves as a definitive platform to celebrate our historical milestones while pioneering the future of computing. From early algorithmic foundations to modern AI-driven architectures, AU CSE has nurtured generations of leaders.
            </p>
            <p>
              Our mission is to foster an environment where technical proficiency meets creative inquiry. This year's festival is more than a series of events—it's a convergence of 10 decades of engineering spirit, unified by a single, powerful aura.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-16 md:gap-24 pt-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-1000">
           <div className="text-center group">
              <p className="text-5xl font-black text-white group-hover:text-indigo-500 transition-colors">100</p>
              <p className="mono text-[9px] uppercase tracking-widest text-zinc-500 mt-2">Years of Excellence</p>
           </div>
           <div className="text-center group">
              <p className="text-5xl font-black text-white group-hover:text-indigo-500 transition-colors">50+</p>
              <p className="mono text-[9px] uppercase tracking-widest text-zinc-500 mt-2">Technical Tracks</p>
           </div>
           <div className="text-center group">
              <p className="text-5xl font-black text-white group-hover:text-indigo-500 transition-colors">10k</p>
              <p className="mono text-[9px] uppercase tracking-widest text-zinc-500 mt-2">Global Alumni</p>
           </div>
        </div>
      </div>
    </section>
  );
};

export default AboutView;
