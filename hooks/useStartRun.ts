'use client';

import { useCallback, useRef, useState } from 'react';
import { Cl } from '@stacks/transactions';
import { useWallet } from '@/contexts/WalletContext';
import { callContract } from '@/lib/contract-call';
import { getContracts } from '@/lib/contracts';

export interface UseStartRunResult {
  /** Waits only for wallet approval, resolves immediately with a promise for the run-id */
  startRun:     (tokenId: string, eraId: string) => Promise<{ txid: string; runIdPromise: Promise<Uint8Array> } | null>;
  isLoading:    boolean;
  error:        string | null;
}

// Poll /api/stacks/tx until confirmed, then extract run-id from tx_result.hex.
// start-run returns (ok (buff 32)): 07=ok 02=buff 00000020=len <32 bytes>
async function waitForRunId(txid: string, timeoutMs = 120_000): Promise<Uint8Array> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`/api/stacks/tx?txid=${encodeURIComponent(txid)}`);
    if (res.ok) {
      const tx = await res.json() as {
        tx_status: string;
        tx_result?: { hex?: string };
      };
      if (tx.tx_status === 'success') {
        const raw = tx.tx_result?.hex ?? '';
        const hex = raw.startsWith('0x') ? raw.slice(2) : raw;
        if (hex.length >= 76 && hex.startsWith('0702')) {
          return hexToBytes(hex.slice(12, 76));
        }
        throw new Error(`Unexpected tx_result format: ${hex.slice(0, 20)}…`);
      }
      if (tx.tx_status === 'abort_by_response' || tx.tx_status === 'abort_by_post_condition') {
        throw new Error(`Transaction aborted: ${tx.tx_status}`);
      }
    }
    await new Promise<void>((r) => setTimeout(r, 5_000));
  }
  throw new Error('start-run confirmation timed out');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function useStartRun(): UseStartRunResult {
  const { address, isConnected } = useWallet();
  const contracts = getContracts();

  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const abortRef = useRef(false);

  const startRun = useCallback(async (tokenId: string, eraId: string) => {
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return null;
    }
    setIsLoading(true);
    setError(null);
    abortRef.current = false;

    try {
      // Wait only for wallet approval — typically 1-5s
      const txid = await callContract(
        contracts.waveGame,
        'start-run',
        [
          Cl.stringAscii(tokenId.toLowerCase() as Parameters<typeof Cl.stringAscii>[0]),
          Cl.stringAscii(eraId                 as Parameters<typeof Cl.stringAscii>[0]),
        ],
      );

      if (abortRef.current) return null;

      // Resolve run-id in the background — game starts now, run-id is ready by end of run
      const runIdPromise = waitForRunId(txid);

      return { txid, runIdPromise };
    } catch (e) {
      if (!abortRef.current) setError(e instanceof Error ? e.message : 'start-run failed');
      return null;
    } finally {
      if (!abortRef.current) setIsLoading(false);
    }
  }, [isConnected, address, contracts.waveGame]);

  return { startRun, isLoading, error };
}
