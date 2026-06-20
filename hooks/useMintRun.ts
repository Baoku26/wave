'use client';

import { useCallback, useState } from 'react';
import { Cl, deserializeCV, ClarityType } from '@stacks/transactions';
import { useWallet } from '@/contexts/WalletContext';
import { callContract } from '@/lib/contract-call';
import { getContracts } from '@/lib/contracts';
import type { TrickEvent } from '@/game/index';
import type { PlayerNft } from '@/hooks/usePlayerRuns';

export type MintPhase = 'idle' | 'image' | 'minting' | 'done';

export interface MintResult {
  ipfsCid:  string;
  imageUrl: string;
  tokenId:  number;
}

interface UseMintRunResult {
  mintRun: (
    runId:    Uint8Array,
    runIdHex: string,
    eraId:    string,
    score:    number,
    tricks:   TrickEvent[],
    survived: boolean,
    onSave:   (nft: PlayerNft) => void,
  ) => Promise<MintResult | null>;
  phase:  MintPhase;
  error:  string | null;
  result: MintResult | null;
  reset:  () => void;
}

async function fetchLastTokenId(contract: string, sender: string): Promise<number> {
  const res = await fetch('/api/stacks/call-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contract,
      fn:     'get-last-token-id',
      sender,
      args:   [],
    }),
  });
  if (!res.ok) return 0;
  const { okay, result } = await res.json() as { okay?: boolean; result?: string };
  if (!okay || !result) return 0;
  try {
    const cv = deserializeCV(result.startsWith('0x') ? result.slice(2) : result);
    // Returns (ok (some uint))
    if (cv.type === ClarityType.ResponseOk) {
      const inner = cv.value;
      if (inner.type === ClarityType.OptionalSome && inner.value.type === ClarityType.UInt) {
        return Number(inner.value.value as bigint);
      }
    }
  } catch {}
  return 0;
}

export function useMintRun(): UseMintRunResult {
  const { address, isConnected } = useWallet();
  const contracts = getContracts();

  const [phase,  setPhase]  = useState<MintPhase>('idle');
  const [error,  setError]  = useState<string | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);

  const mintRun = useCallback(async (
    runId:    Uint8Array,
    runIdHex: string,
    eraId:    string,
    score:    number,
    tricks:   TrickEvent[],
    survived: boolean,
    onSave:   (nft: PlayerNft) => void,
  ): Promise<MintResult | null> => {
    if (!isConnected || !address) { setError('Wallet not connected'); return null; }

    setPhase('image');
    setError(null);
    setResult(null);

    try {
      // Step 1: Generate image + upload to IPFS
      const imgRes = await fetch('/api/mint-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: runIdHex, eraId, score, tricks: tricks.map((t) => t.name), survived }),
      });
      if (!imgRes.ok) {
        const body = await imgRes.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Image generation failed');
      }
      const { ipfsCid, imageUrl } = await imgRes.json() as { ipfsCid: string; imageUrl: string };

      setPhase('minting');

      // Step 2: Open wallet for mint-nft approval
      const tokenUri = `ipfs://${ipfsCid}`;
      await callContract(
        contracts.waveGame,
        'mint-nft',
        [
          Cl.buffer(runId),
          Cl.stringAscii(ipfsCid  as Parameters<typeof Cl.stringAscii>[0]),
          Cl.stringAscii(tokenUri as Parameters<typeof Cl.stringAscii>[0]),
        ],
      );

      // Step 3: Fetch the new token ID after a brief delay for indexer propagation
      await new Promise<void>((r) => setTimeout(r, 5_000));
      const tokenId = await fetchLastTokenId(contracts.waveNft, address);

      const mintResult: MintResult = { ipfsCid, imageUrl, tokenId };
      setResult(mintResult);
      setPhase('done');

      // Fire-and-forget: increment NFT counter
      fetch('/api/stats/increment?key=nfts', { method: 'POST' }).catch(() => {});

      onSave({
        tokenId,
        runId: runIdHex,
        eraId,
        score,
        tricks:   tricks.map((t) => t.name),
        survived,
        ipfsCid,
        imageUrl,
        mintedAt: Date.now(),
      });

      return mintResult;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mint failed');
      setPhase('idle');
      return null;
    }
  }, [isConnected, address, contracts.waveGame, contracts.waveNft]);

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
    setResult(null);
  }, []);

  return { mintRun, phase, error, result, reset };
}
