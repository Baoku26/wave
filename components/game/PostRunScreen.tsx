'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useWaveBalance } from '@/hooks/useWaveBalance';
import { useMintRun, type MintPhase } from '@/hooks/useMintRun';
import { usePlayerRuns } from '@/hooks/usePlayerRuns';
import type { RunCompletePayload, TrickEvent } from '@/game/index';

interface Era {
  name: string;
  token: string;
  accentColor: string;
}

interface PostRunScreenProps {
  result:        RunCompletePayload;
  era:           Era;
  onPlayAgain:   () => void;
  waveEarned?:   bigint | null;
  onchainTxid?:  string | null;
  runId?:        Uint8Array | null;
  runIdHex?:     string | null;
  eraId?:        string;
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

const MINT_PHASE_LABEL: Record<MintPhase, string | null> = {
  idle:    null,
  image:   'Generating NFT image…',
  minting: 'Confirming on Stacks (~10s)…',
  done:    null,
};

const MINT_COST = BigInt(100);

export function PostRunScreen({
  result,
  era,
  onPlayAgain,
  waveEarned,
  onchainTxid,
  runId,
  runIdHex,
  eraId,
}: PostRunScreenProps) {
  const displayScore = useCountUp(result.score);
  const tier         = getTier(result.score);

  const { raw: waveBalance } = useWaveBalance();
  const { mintRun, phase: mintPhase, error: mintError, result: mintResult } = useMintRun();
  const { addNft } = usePlayerRuns();

  // Can mint when: onchain run submitted, survived, enough WAVE
  const canMint = Boolean(
    runId &&
    runIdHex &&
    eraId &&
    waveEarned != null &&   // score was submitted on-chain
    result.survived &&
    waveBalance !== null && waveBalance >= MINT_COST &&
    mintPhase === 'idle',
  );

  const mintLabel = MINT_PHASE_LABEL[mintPhase];

  async function handleMint() {
    if (!runId || !runIdHex || !eraId) return;
    await mintRun(runId, runIdHex, eraId, result.score, result.tricks, result.survived, addNft);
  }

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
        className="bg-[#111111] border border-[#222222] rounded-2xl p-8 w-full max-w-sm mx-4 flex flex-col gap-6 max-h-[92vh] overflow-y-auto"
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

        {/* WAVE earned */}
        <AnimatePresence>
          {waveEarned != null && waveEarned > BigInt(0) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1100] border border-[#3a2500] rounded-lg px-4 py-3 text-center"
            >
              <p className="text-[#f7931a] text-lg font-bold tabular-nums">
                +{waveEarned.toLocaleString()} WAVE
              </p>
              <p className="text-[#5a3a00] text-[10px] mt-0.5">
                {onchainTxid
                  ? `Score submitted · ${onchainTxid.slice(0, 8)}…`
                  : 'Reward pending confirmation'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NFT mint success */}
        <AnimatePresence>
          {mintPhase === 'done' && mintResult && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden border border-[#2a2a2a]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mintResult.imageUrl}
                alt="Your NFT"
                className="w-full aspect-video object-cover"
              />
              <div className="p-3 flex items-center justify-between bg-[#161616]">
                <span className="text-[#666] text-xs">NFT #{mintResult.tokenId}</span>
                <Link
                  href={`/gallery/${mintResult.tokenId}`}
                  className="text-xs font-medium"
                  style={{ color: era.accentColor }}
                >
                  View in gallery →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mint error */}
        {mintError && (
          <p className="text-[#ef4444] text-xs text-center -mt-2">{mintError}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onPlayAgain}
            disabled={mintPhase !== 'idle' && mintPhase !== 'done'}
            className="flex-1 py-2.5 rounded-lg border border-[#2a2a2a] text-[#888888] text-sm font-medium hover:border-[#3a3a3a] hover:text-[#fafafa] transition-colors disabled:opacity-40"
          >
            Play Again
          </button>
          <button
            onClick={handleMint}
            disabled={!canMint || mintPhase !== 'idle'}
            title={!canMint ? 'Need on-chain run + survived + 100 WAVE' : undefined}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ background: era.accentColor, color: '#0a0a0a' }}
          >
            {mintPhase === 'done' ? 'Minted ✓' : mintLabel ?? 'Mint NFT'}
          </button>
        </div>

        <p className="text-center text-[#333333] text-[10px] -mt-2">
          {mintPhase === 'done'
            ? 'NFT minted on Stacks · 100 WAVE burned'
            : waveEarned != null
            ? 'score on-chain · 100 WAVE to mint'
            : 'demo mode · wallet required to mint'}
        </p>
      </motion.div>
    </motion.div>
  );
}
