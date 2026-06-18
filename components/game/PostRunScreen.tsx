'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RunCompletePayload, TrickEvent } from '@/game/index';

interface Era {
  name: string;
  token: string;
  accentColor: string;
}

interface PostRunScreenProps {
  result: RunCompletePayload;
  era: Era;
  onPlayAgain: () => void;
}

const TIERS = [
  { min: 60000, label: 'PLATINUM', color: '#e2e8f0' },
  { min: 30000, label: 'GOLD',     color: '#f7931a' },
  { min: 15000, label: 'SILVER',   color: '#94a3b8' },
  { min: 5000,  label: 'BRONZE',   color: '#c97d36' },
  { min: 0,     label: 'WIPEOUT',  color: '#ef4444' },
] as const;

function getTier(score: number) {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
}

function useCountUp(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const pct     = Math.min(elapsed / durationMs, 1);
      // ease-out cubic
      const eased   = 1 - Math.pow(1 - pct, 3);
      setValue(Math.round(target * eased));
      if (pct < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, durationMs]);

  return value;
}

function TrickBadge({ trick, accentColor }: { trick: TrickEvent; accentColor: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-xs px-2 py-1 rounded-md border tabular-nums"
      style={{
        color:       accentColor,
        borderColor: `${accentColor}35`,
        background:  `${accentColor}10`,
      }}
    >
      {trick.name} +{trick.points.toLocaleString()}
    </motion.span>
  );
}

export function PostRunScreen({ result, era, onPlayAgain }: PostRunScreenProps) {
  const displayScore = useCountUp(result.score);
  const tier         = getTier(result.score);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/88 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#111111] border border-[#222222] rounded-2xl p-8 w-full max-w-sm mx-4 flex flex-col gap-6"
      >
        {/* Tier + score */}
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-[10px] font-semibold tracking-[0.22em] mb-2"
            style={{ color: tier.color }}
          >
            {tier.label}
          </motion.p>

          <p
            className="text-5xl font-bold tabular-nums"
            style={{ color: tier.color }}
          >
            {displayScore.toLocaleString()}
          </p>

          <p className="text-[#444444] text-xs mt-1.5">
            {result.survived ? `${era.token} · ${era.name}` : 'wiped out'}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'candles', value: result.distanceCandles.toString() },
            { label: 'airtime', value: `${(result.airtimeMs / 1000).toFixed(1)}s` },
            { label: 'tricks',  value: result.tricks.length.toString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#1a1a1a] rounded-lg py-3 px-1">
              <p className="text-[#fafafa] text-sm font-semibold tabular-nums">{value}</p>
              <p className="text-[#444444] text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tricks list */}
        <AnimatePresence>
          {result.tricks.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-1.5"
            >
              {result.tricks.map((t, i) => (
                <TrickBadge key={i} trick={t} accentColor={era.accentColor} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-2.5 rounded-lg border border-[#2a2a2a] text-[#888888] text-sm font-medium hover:border-[#3a3a3a] hover:text-[#fafafa] transition-colors"
          >
            Play Again
          </button>
          <button
            disabled
            title="Connect wallet to mint"
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold opacity-35 cursor-not-allowed"
            style={{ background: era.accentColor, color: '#0a0a0a' }}
          >
            Mint NFT
          </button>
        </div>

        <p className="text-center text-[#333333] text-[10px] -mt-2">
          demo mode · wallet required to mint
        </p>
      </motion.div>
    </motion.div>
  );
}
