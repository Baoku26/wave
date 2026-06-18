'use client';

import { use, useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { GameCanvas } from '@/components/game/GameCanvas';
import { HUD } from '@/components/game/HUD';
import { PostRunScreen } from '@/components/game/PostRunScreen';
import type { OHLCCandle, RunCompletePayload, ScoreUpdatePayload, TrickEvent } from '@/game/index';
import { ERAS, type EraId } from '@/lib/eras';

export default function GamePage({ params }: { params: Promise<{ 'era-id': string }> }) {
  const { 'era-id': rawEraId } = use(params);
  const eraId = rawEraId as EraId;
  const era   = ERAS[eraId] ?? ERAS['stx-bull-2021'];

  // ── chart data ──────────────────────────────────────────────────────────────
  const [candles, setCandles]       = useState<OHLCCandle[] | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch(`/api/chart-data?era=${eraId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setCandles(d.candles as OHLCCandle[]))
      .catch(() => setFetchError(true));
  }, [eraId]);

  // ── game state ───────────────────────────────────────────────────────────────
  const [score,           setScore]           = useState(0);
  const [multiplier,      setMultiplier]      = useState(1);
  const [distanceCandles, setDistanceCandles] = useState(0);
  const [trickFlash,      setTrickFlash]      = useState<string | null>(null);
  const [runResult,       setRunResult]       = useState<RunCompletePayload | null>(null);
  const trickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScoreUpdate = useCallback((u: ScoreUpdatePayload) => {
    setScore(u.score);
    setMultiplier(u.multiplier);
    setDistanceCandles(u.distanceCandles);
  }, []);

  const handleTrickLanded = useCallback((t: TrickEvent) => {
    setTrickFlash(t.name.toUpperCase());
    if (trickTimer.current) clearTimeout(trickTimer.current);
    trickTimer.current = setTimeout(() => setTrickFlash(null), 1200);
  }, []);

  const handleRunComplete = useCallback((r: RunCompletePayload) => {
    setRunResult(r);
  }, []);

  const handlePlayAgain = useCallback(() => window.location.reload(), []);

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col">

      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
        <Link href="/play" className="text-[#444] hover:text-[#666] text-sm transition-colors">
          ← charts
        </Link>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
            style={{ color: era.accentColor, borderColor: `${era.accentColor}40` }}
          >
            {era.token}
          </span>
          <span className="text-[#fafafa] text-sm font-medium">{era.name}</span>
        </div>
        <span className="text-[#333] text-xs tabular-nums">
          {new Date(era.from * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          {' – '}
          {new Date(era.to   * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">
        <div className="w-full max-w-5xl relative">

          {candles ? (
            <>
              <HUD
                score={score}
                multiplier={multiplier}
                distanceCandles={distanceCandles}
                totalCandles={candles.length}
                eraName={era.name}
                token={era.token}
                accentColor={era.accentColor}
                trickFlash={trickFlash}
              />
              <GameCanvas
                eraId={eraId}
                token={era.token}
                candles={candles}
                playerAddress="demo"
                onRunComplete={handleRunComplete}
                onScoreUpdate={handleScoreUpdate}
                onTrickLanded={handleTrickLanded}
              />
            </>
          ) : fetchError ? (
            <div className="w-full aspect-video bg-[#111] rounded-xl flex flex-col items-center justify-center gap-4 border border-[#1e1e1e]">
              <p className="text-[#555] text-sm">Couldn&apos;t load chart data.</p>
              <button
                onClick={() => { setFetchError(false); setCandles(null); }}
                className="text-xs text-[#888] border border-[#2a2a2a] rounded-lg px-4 py-2 hover:border-[#3a3a3a] transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="w-full aspect-video bg-[#111] rounded-xl flex items-center justify-center border border-[#1a1a1a]">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: `${era.accentColor} transparent transparent transparent` }}
                />
                <span className="text-[#444] text-xs tracking-wide">Loading chart data…</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls hint */}
        {!runResult && candles && (
          <div className="flex items-center gap-6 text-[#333] text-xs">
            <span><kbd className="text-[#555]">SPACE</kbd> / <kbd className="text-[#555]">↑</kbd> Jump · hold to float</span>
            <span><kbd className="text-[#555]">→</kbd> Accelerate</span>
            <span><kbd className="text-[#555]">←</kbd> Brake</span>
          </div>
        )}
      </div>

      {/* Post-run screen */}
      <AnimatePresence>
        {runResult && (
          <PostRunScreen
            result={runResult}
            era={{ name: era.name, token: era.token, accentColor: era.accentColor }}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
