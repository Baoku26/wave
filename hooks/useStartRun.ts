'use client';

import { useCallback, useRef, useState } from 'react';
import { useStacksWallet, useSbtcContext } from '@baoku26/sbtc-sdk';
import { Cl } from '@stacks/transactions';
import { getContracts } from '@/lib/contracts';
import { useSignTx } from '@/hooks/useSignTx';
import { callContract } from '@/lib/stacks-call';

interface UseStartRunResult {
  startRun: (tokenId: string, eraId: string) => Promise<{ txid: string; runId: Uint8Array } | null>;
  isLoading: boolean;
  error: string | null;
  runId: Uint8Array | null;
}

// Poll the Hiro API until a tx confirms, then extract the run-id from tx_result.
async function waitForRunId(
  txid: string,
  hiroApiUrl: string,
  timeoutMs = 90_000,
): Promise<Uint8Array> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${hiroApiUrl}/extended/v1/tx/${txid}`);
    if (res.ok) {
      const tx = await res.json() as {
        tx_status: string;
        tx_result?: { hex?: string };
      };
      if (tx.tx_status === 'success') {
        // start-run returns (ok (buff 32)).
        // Clarity hex encoding: 07=ok 02=buff 00000020=len(32) <32 bytes>
        // tx_result.hex may include a leading "0x".
        const raw = tx.tx_result?.hex ?? '';
        const hex = raw.startsWith('0x') ? raw.slice(2) : raw;
        // Expect: 07(ok) 02(buff) 00000020(len) + 64 hex chars = 76 chars minimum
        if (hex.length >= 76 && hex.startsWith('0702')) {
          return hexToBytes(hex.slice(12, 76)); // skip 07 02 00000020, take 32 bytes
        }
        throw new Error(`Unexpected tx_result format: ${hex.slice(0, 20)}…`);
      }
      if (tx.tx_status === 'abort_by_response' || tx.tx_status === 'abort_by_post_condition') {
        throw new Error(`tx aborted: ${tx.tx_status}`);
      }
    }
    await new Promise<void>((r) => setTimeout(r, 4000));
  }
  throw new Error('start-run tx confirmation timed out');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function useStartRun(): UseStartRunResult {
  const { address, publicKey } = useStacksWallet();
  const { apiConfig } = useSbtcContext();
  const contracts = getContracts();
  const signTx = useSignTx();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<Uint8Array | null>(null);
  const abortRef = useRef(false);

  const startRun = useCallback(async (tokenId: string, eraId: string) => {
    if (!address || !publicKey) {
      setError('Wallet not connected');
      return null;
    }
    setIsLoading(true);
    setError(null);
    abortRef.current = false;

    try {
      const tokenIdLower = tokenId.toLowerCase();
      const txid = await callContract(
        contracts.waveGame,
        'start-run',
        [
          Cl.stringAscii(tokenIdLower as Parameters<typeof Cl.stringAscii>[0]),
          Cl.stringAscii(eraId       as Parameters<typeof Cl.stringAscii>[0]),
        ],
        { address, publicKey },
        signTx,
      );
      if (!txid) throw new Error('Transaction failed to broadcast');

      if (abortRef.current) return null;

      const id = await waitForRunId(txid, apiConfig.hiroApiUrl);
      if (abortRef.current) return null;

      setRunId(id);
      return { txid, runId: id };
    } catch (e) {
      if (!abortRef.current) setError(e instanceof Error ? e.message : 'start-run failed');
      return null;
    } finally {
      if (!abortRef.current) setIsLoading(false);
    }
  }, [address, publicKey, contracts.waveGame, signTx, apiConfig.hiroApiUrl]);

  return { startRun, isLoading, error, runId };
}
