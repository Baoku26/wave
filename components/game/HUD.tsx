'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '@/lib/sound';
import { useState } from 'react';

interface HUDProps {
  score: number;
  multiplier: number;
  distanceCandles: number;
  totalCandles: number;
  eraName: string;
  token: string;
  accentColor: string;
  trickFlash: string | null;
}

export function HUD({
  score,
  multiplier,
  distanceCandles,
  totalCandles,
  eraName,
  token,
  accentColor,
  trickFlash,
}: HUDProps) {
  const [soundOn, setSoundOn] = useState(true);
  const pct = totalCandles > 0 ? Math.min(distanceCandles / totalCandles, 1) : 0;

  function toggleSound() {
    soundManager.toggle();
    setSoundOn(soundManager.enabled);
  }

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Score + multiplier */}
        <div className="flex items-center gap-2">
          <div className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-[#222] rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-[#555] text-xs">SCORE</span>
            <span className="text-[#fafafa] text-sm font-semibold tabular-nums">
              {score.toLocaleString()}
            </span>
          </div>

          <AnimatePresence>
            {multiplier > 1.05 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="rounded-lg px-2.5 py-1.5 border"
                style={{ background: `${accentColor}12`, borderColor: `${accentColor}35` }}
              >
                <span className="text-xs font-semibold tabular-nums" style={{ color: accentColor }}>
                  {multiplier.toFixed(1)}×
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Era name + sound toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-[#222] rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ color: accentColor, background: `${accentColor}18` }}
            >
              {token}
            </span>
            <span className="text-[#888] text-xs">{eraName}</span>
          </div>

          <button
            onClick={toggleSound}
            className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-[#222] rounded-lg w-8 h-8 flex items-center justify-center text-[#555] hover:text-[#888] transition-colors"
            aria-label={soundOn ? 'Mute' : 'Unmute'}
          >
            {soundOn ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Trick flash — center of canvas */}
      <AnimatePresence>
        {trickFlash && (
          <motion.div
            key={trickFlash + Date.now()}
            initial={{ opacity: 0, y: -10, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none"
          >
            <span
              className="text-2xl font-bold tracking-widest"
              style={{ color: accentColor, textShadow: `0 0 24px ${accentColor}90` }}
            >
              {trickFlash}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar — bottom of canvas */}
      <div className="absolute bottom-0 left-0 right-0 z-10 h-0.5 bg-[#1a1a1a] pointer-events-none">
        <motion.div
          className="h-full"
          style={{ background: accentColor, width: `${pct * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </>
  );
}
