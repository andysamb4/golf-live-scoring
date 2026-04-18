import React from 'react';
import { View } from '../types';
import { GolfFlagIcon } from './icons/GolfFlagIcon';

interface FrontPageScreenProps {
  onNavigate: (view: View) => void;
}

const FrontPageScreen: React.FC<FrontPageScreenProps> = ({ onNavigate }) => {
  return (
    <div 
      className="relative w-full min-h-[100dvh] bg-dark-slate overflow-hidden font-sans"
      style={{
        backgroundImage: "url('/hero-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark gradient overlay for text readability at top and to blend bottom with card */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80 pointer-events-none" />

      {/* Top Header / Logo Section */}
      <div className="relative z-10 p-6 pt-12 flex flex-col items-center">
        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg text-light-green mb-4">
          <GolfFlagIcon className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 text-center drop-shadow-lg" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>
          Golf Live Scoring
        </h1>
        <p className="text-gray-200 text-sm font-medium tracking-widest uppercase drop-shadow">Your Premium Caddie</p>
      </div>

      {/* Bottom Anchored Bento Card */}
      <div className="absolute bottom-0 w-full p-4 pb-8 z-10">
        <div className="backdrop-blur-xl bg-dark-slate/70 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
          
          <div className="flex flex-col gap-2">
            <h2 className="text-white font-bold text-lg px-1 drop-shadow">Play</h2>
            {/* Primary Action */}
            <button
              onClick={() => onNavigate('setup')}
              className="w-full bg-light-green hover:bg-green-500 text-dark-slate font-extrabold text-xl py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transform hover:-translate-y-1"
            >
              Start Round
            </button>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <h2 className="text-white/90 font-bold text-sm uppercase translate-y-1 px-1 drop-shadow">Tournaments</h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => onNavigate('create-tournament')}
                className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold py-3 rounded-2xl transition-all backdrop-blur-md hover:-translate-y-0.5"
              >
                Create
              </button>
              <button
                onClick={() => onNavigate('join-tournament')}
                className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold py-3 rounded-2xl transition-all backdrop-blur-md hover:-translate-y-0.5"
              >
                Join
              </button>
              <button
                onClick={() => onNavigate('tournament-hub')}
                className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold py-3 rounded-2xl transition-all backdrop-blur-md hover:-translate-y-0.5"
              >
                My Tournaments
              </button>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="mt-2 pt-4 border-t border-white/10 flex flex-col gap-1">
            <button
              onClick={() => onNavigate('watch')}
              className="w-full flex items-center justify-center gap-2 text-white/90 hover:text-white font-semibold py-3 rounded-xl border border-transparent hover:border-white/20 hover:bg-white/5 transition-all"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              Follow a Live Game
            </button>
            <button
              onClick={() => onNavigate('results-history')}
              className="w-full flex items-center justify-center gap-2 text-white/70 hover:text-white font-semibold py-3 rounded-xl border border-transparent hover:border-white/20 hover:bg-white/5 transition-all"
            >
              Past Results
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default FrontPageScreen;
