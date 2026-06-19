'use client';

import { useCallback, useState } from 'react';
import { useStacksWallet } from '@baoku26/sbtc-sdk';
import { Cl } from '@stacks/transactions';
import { signScore } from '@/lib/score-signer';
import { getContracts } from '@/lib/contracts';
import { useSignTx } from '@/hooks/useSignTx';
import { callContract } from '@/lib/stacks-call';
import type { TrickEvent } from '@/game/index';

interface UseSubmitScoreResult {
  submitScore: (
    runId: Uint8Array,
    score: number,
    tricks: TrickEvent[],
  ) => Promise<{ txid: string; waveEarned: bigint } | null>;
  isLoading: boolean;
  error: string | null;
}

export function useSubmitScore(): UseSubmitScoreResult {
  const { address, publicKey, exportMnemonic } = useStacksWallet();
  const contracts = getContracts();
  const signTx = useSignTx();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitScore = useCallback(async (
    runId: Uint8Array,
    score: number,
    tricks: TrickEvent[],
  ) => {
    if (!address || !publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mnemonic = await exportMnemonic();
      const trickNames = tricks.map((t) => t.name).slice(0, 10);
      const sig = await signScore(mnemonic, runId, score, trickNames);

      const txid = await callContract(
        contracts.waveGame,
        'submit-score',
        [
          Cl.buffer(runId),
          Cl.uint(BigInt(score)),
          Cl.list(trickNames.map((n) => Cl.stringAscii(n as Parameters<typeof Cl.stringAscii>[0]))),
          Cl.buffer(sig),
        ],
        { address, publicKey },
        signTx,
      );

      const waveEarned = BigInt(Math.min(Math.floor(score / 100) + 100, 10000));
      return { txid, waveEarned };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'submit-score failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, publicKey, exportMnemonic, contracts.waveGame, signTx]);

  return { submitScore, isLoading, error };
}
