'use client';

import { use, useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import { GameCanvas } from '@/components/game/GameCanvas';
import { HUD } from '@/components/game/HUD';
import { PostRunScreen } from '@/components/game/PostRunScreen';
import { useWaveBalance } from '@/hooks/useWaveBalance';
import { useStartRun } from '@/hooks/useStartRun';
import { useSubmitScore } from '@/hooks/useSubmitScore';
import type { OHLCCandle, RunCompletePayload, ScoreUpdatePayload, TrickEvent } from '@/game/index';
import { ERAS, type EraId } from '@/lib/eras';

const START_RUN_COST = BigInt(50_000_000); // 50 WAVE with 6 decimals

export default function GamePage({ params }: { params: Promise<{ 'era-id': string }> }) {
  const { 'era-id': rawEraId } = use(params);
  const eraId = rawEraId as EraId;
  const era   = ERAS[eraId] ?? ERAS['stx-bull-2021'];

  // ── wallet ───────────────────────────────────────────────────────────────────
  const { address, isLoaded } = useWallet();
  const { raw: waveBalance, display: waveBalanceDisplay, refetch: refetchBalance } = useWaveBalance();
  const { startRun, isLoading: isStarting, error: startError } = useStartRun();
  const { submitScore, isLoading: isSubmitting, error: submitError } = useSubmitScore();

  const hasWallet       = isLoaded && !!address;
  const hasSufficientWave = waveBalance !== null && waveBalance >= START_RUN_COST;

  // ── chart data ──────────────────────────────────────────────────────────────
  const [candles, setCandles]       = useState<OHLCCandle[] | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch(`/api/chart-data?era=${eraId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setCandles(d.candles as OHLCCandle[]))
      .catch(() => setFetchError(true));
  }, [eraId]);

  // ── game flow ────────────────────────────────────────────────────────────────
  const [gameStarted,  setGameStarted]  = useState(false);
  const [onchainMode,  setOnchainMode]  = useState(false);
  // Promise resolves after start-run TX confirms; game starts before it resolves.
  const activeRunId    = useRef<Promise<Uint8Array> | null>(null);
  // Populated in handleRunComplete once the promise settles.
  const resolvedRunId  = useRef<Uint8Array | null>(null);
  const resolvedRunHex = useRef<string | null>(null);

  const [score,           setScore]           = useState(0);
  const [multiplier,      setMultiplier]      = useState(1);
  const [distanceCandles, setDistanceCandles] = useState(0);
  const [trickFlash,      setTrickFlash]      = useState<string | null>(null);
  const [runResult,       setRunResult]       = useState<RunCompletePayload | null>(null);
  const trickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── submit state ─────────────────────────────────────────────────────────────
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'signing' | 'confirming' | 'done'>('idle');
  const [waveEarned,  setWaveEarned]  = useState<bigint | null>(null);
  const [onchainTxid, setOnchainTxid] = useState<string | null>(null);

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

  const handleRunComplete = useCallback(async (r: RunCompletePayload) => {
    if (onchainMode && activeRunId.current) {
      // Wait for the start-run TX to confirm (should already be done after 1-3 min of gameplay)
      setSubmitPhase('signing');
      let runId: Uint8Array;
      try {
        runId = await activeRunId.current;
        resolvedRunId.current  = runId;
        resolvedRunHex.current = Array.from(runId).map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch {
        // start-run TX failed or timed out — show results without on-chain score
        setSubmitPhase('idle');
        setRunResult(r);
        return;
      }
      const result = await submitScore(runId, r.score, r.tricks, eraId);
      if (result) {
        setSubmitPhase('confirming');
        setOnchainTxid(result.txid);
        setWaveEarned(result.waveEarned);
        // Wait for on-chain confirmation before showing post-run screen.
        // This also ensures the leaderboard cache is only busted after the score lands.
        await result.confirmationPromise;
        refetchBalance();
        setSubmitPhase('done');
        setRunResult(r);
      } else {
        setSubmitPhase('idle');
        setRunResult(r);
      }
    } else {
      setRunResult(r);
    }
  }, [onchainMode, submitScore, refetchBalance, eraId]);

  const handlePlayAgain = useCallback(() => window.location.reload(), []);

  // ── launch handlers ──────────────────────────────────────────────────────────
  const handlePlayFree = useCallback(() => {
    setOnchainMode(false);
    activeRunId.current = null;
    setGameStarted(true);
  }, []);

  const handleStartOnchain = useCallback(async () => {
    if (!address) return;
    setOnchainMode(true);
    // callContract waits only for wallet approval (~1-5s), game starts immediately after
    const res = await startRun(era.token, eraId);
    if (res) {
      // run-id resolves in background; game starts now
      activeRunId.current = res.runIdPromise;
      setGameStarted(true);
    } else {
      setOnchainMode(false);
    }
  }, [address, startRun, era.token, eraId]);

  // ── submit overlay text ───────────────────────────────────────────────────────
  const submitStatusText = (() => {
    if (submitPhase === 'signing')    return 'Signing score…';
    if (submitPhase === 'confirming') return 'Confirming on Bitcoin via Stacks (~10s)…';
    return null;
  })();

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
        {/* Wallet status */}
        <div className="flex items-center gap-3">
          {hasWallet ? (
            <>
              <span className="text-[#f7931a] text-xs tabular-nums font-medium">
                {waveBalanceDisplay ?? '—'} WAVE
              </span>
              <span className="text-[#2a2a2a] text-[10px] font-mono hidden sm:block">
                {address!.slice(0, 6)}…{address!.slice(-4)}
              </span>
            </>
          ) : (
            <Link href="/faucet" className="text-[#444] hover:text-[#666] text-xs transition-colors">
              No wallet
            </Link>
          )}
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">
        <div className="w-full max-w-5xl relative">

          {candles ? (
            <>
              {/* HUD — visible once game starts */}
              {gameStarted && (
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
              )}

              {/* Score-submit overlay */}
              <AnimatePresence>
                {submitStatusText && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0a0a]/80 rounded-xl"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#f7931a] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[#888] text-sm">{submitStatusText}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Launch card — shown before game starts */}
              <AnimatePresence>
                {!gameStarted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0a]/90 rounded-xl"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-8 w-full max-w-xs mx-4 flex flex-col gap-5"
                    >
                      <div>
                        <p className="text-[#fafafa] text-base font-semibold mb-1">{era.name}</p>
                        <p className="text-[#444] text-xs">
                          {era.token} ·{' '}
                          {new Date(era.from * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      {startError && (
                        <p className="text-[#ef4444] text-xs">{startError}</p>
                      )}

                      {/* Onchain run button */}
                      {hasWallet && (
                        <div className="space-y-2">
                          <button
                            onClick={handleStartOnchain}
                            disabled={!hasSufficientWave || isStarting}
                            className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: era.accentColor, color: '#0a0a0a' }}
                          >
                            {isStarting
                              ? 'Approve in wallet…'
                              : `Start Run · 50 WAVE`}
                          </button>
                          {isStarting && (
                            <p className="text-[#333] text-[10px] text-center">
                              Approve the transaction in your wallet to start
                            </p>
                          )}
                          {!hasSufficientWave && !isStarting && (
                            <p className="text-[#444] text-[10px] text-center">
                              Need 50 WAVE ·{' '}
                              <Link href="/faucet" className="text-[#666] underline underline-offset-2 hover:text-[#888]">
                                get WAVE
                              </Link>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Free play button */}
                      <button
                        onClick={handlePlayFree}
                        className="w-full py-2.5 rounded-xl text-sm border border-[#2a2a2a] text-[#666] hover:border-[#3a3a3a] hover:text-[#888] transition-colors"
                      >
                        {hasWallet ? 'Play Free (no score)' : 'Play Free'}
                      </button>

                      {!hasWallet && isLoaded && (
                        <p className="text-[#333] text-[10px] text-center">
                          <Link href="/faucet" className="text-[#444] underline underline-offset-2 hover:text-[#666]">
                            Get a wallet + WAVE
                          </Link>{' '}
                          to record scores on-chain
                        </p>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phaser canvas — always mounted once candles are ready so it preloads */}
              <GameCanvas
                eraId={eraId}
                token={era.token}
                candles={candles}
                playerAddress={address ?? 'demo'}
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
        {gameStarted && !runResult && (
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
            waveEarned={waveEarned}
            onchainTxid={onchainTxid}
            runId={resolvedRunId.current}
            runIdHex={resolvedRunHex.current}
            eraId={eraId}
            waveBalanceRaw={waveBalance}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
