'use client';

import { useCallback, useState } from 'react';
import { Cl } from '@stacks/transactions';
import { useWallet } from '@/contexts/WalletContext';
import { callContract } from '@/lib/contract-call';
import { getContracts } from '@/lib/contracts';
import type { TrickEvent } from '@/game/index';

interface UseSubmitScoreResult {
  submitScore: (
    runId:  Uint8Array,
    score:  number,
    tricks: TrickEvent[],
    eraId:  string,
  ) => Promise<{ txid: string; waveEarned: bigint; confirmationPromise: Promise<boolean> } | null>;
  isLoading: boolean;
  error:     string | null;
}

// Mirrors the on-chain score-to-reward tiers in wave-game.clar
function calcWaveReward(score: number): bigint {
  if (score >= 30_000) return BigInt(400_000_000);
  if (score >= 15_000) return BigInt(200_000_000);
  if (score >= 5_000)  return BigInt(100_000_000);
  if (score >= 1_000)  return BigInt(50_000_000);
  return BigInt(20_000_000);
}

// Poll /api/stacks/tx until confirmed or timed out. Returns true on success.
async function waitForTx(txid: string, timeoutMs = 120_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`/api/stacks/tx?txid=${encodeURIComponent(txid)}`);
      if (res.ok) {
        const tx = await res.json() as { tx_status: string };
        if (tx.tx_status === 'success') return true;
        if (tx.tx_status === 'abort_by_response' || tx.tx_status === 'abort_by_post_condition') return false;
      }
    } catch { /* network hiccup — retry */ }
    await new Promise<void>((r) => setTimeout(r, 5_000));
  }
  return false;
}

export function useSubmitScore(): UseSubmitScoreResult {
  const { address, isConnected } = useWallet();
  const contracts = getContracts();

  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const submitScore = useCallback(async (
    runId:  Uint8Array,
    score:  number,
    tricks: TrickEvent[],
    eraId:  string,
  ) => {
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const trickNames = tricks.map((t) => t.name).slice(0, 10);

      const txid = await callContract(
        contracts.waveGame,
        'submit-score',
        [
          Cl.buffer(runId),
          Cl.uint(BigInt(score)),
          Cl.list(trickNames.map((n) => Cl.stringAscii(n as Parameters<typeof Cl.stringAscii>[0]))),
        ],
      );

      const waveEarned = calcWaveReward(score);

      // Increment run counter immediately (doesn't need TX confirmation)
      fetch('/api/stats/increment?key=runs', { method: 'POST' }).catch(() => {});

      // Bust leaderboard cache ONLY after the submit-score TX confirms.
      // Invalidating before confirmation causes the next leaderboard read to
      // repopulate Redis from the chain while the score is still pending.
      const confirmationPromise = waitForTx(txid).then((ok) => {
        if (ok) {
          fetch(`/api/stats/invalidate-leaderboard?era=${encodeURIComponent(eraId)}`, { method: 'POST' }).catch(() => {});
        }
        return ok;
      });

      return { txid, waveEarned, confirmationPromise };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'submit-score failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, contracts.waveGame]);

  return { submitScore, isLoading, error };
}
