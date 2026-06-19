'use client';

import { useCallback, useState } from 'react';
import { useStacksContract, useStacksWallet } from '@baoku26/sbtc-sdk';
import { Cl } from '@stacks/transactions';
import { getContracts } from '@/lib/contracts';
import { useSignTx } from '@/hooks/useSignTx';
import { callContract } from '@/lib/stacks-call';
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

export function useMintRun(): UseMintRunResult {
  const { address, publicKey } = useStacksWallet();
  const contracts = getContracts();
  const signTx = useSignTx();

  const [phase,  setPhase]  = useState<MintPhase>('idle');
  const [error,  setError]  = useState<string | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);

  // Read last-token-id after mint to identify the minted NFT
  const { refetch: refetchLastId, data: lastTokenIdData } = useStacksContract<bigint>({
    contract: contracts.waveNft,
    readOnly: { fn: 'get-last-token-id' },
  });

  const mintRun = useCallback(async (
    runId:    Uint8Array,
    runIdHex: string,
    eraId:    string,
    score:    number,
    tricks:   TrickEvent[],
    survived: boolean,
    onSave:   (nft: PlayerNft) => void,
  ): Promise<MintResult | null> => {
    if (!address || !publicKey) { setError('Wallet not connected'); return null; }

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

      // Step 2: Mint on-chain via server-side proxy (avoids browser timeout)
      const tokenUri = `ipfs://${ipfsCid}`;
      const txid = await callContract(
        contracts.waveNft,
        'mint-nft',
        [
          Cl.buffer(runId),
          Cl.stringAscii(ipfsCid  as Parameters<typeof Cl.stringAscii>[0]),
          Cl.stringAscii(tokenUri as Parameters<typeof Cl.stringAscii>[0]),
        ],
        { address, publicKey },
        signTx,
      );

      // Step 3: Determine token ID
      await new Promise<void>((r) => setTimeout(r, 4000));
      refetchLastId();
      await new Promise<void>((r) => setTimeout(r, 1000));
      const tokenId = lastTokenIdData !== null && lastTokenIdData !== undefined
        ? Number(lastTokenIdData)
        : 0;

      const mintResult: MintResult = { ipfsCid, imageUrl, tokenId };
      setResult(mintResult);
      setPhase('done');

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
  }, [address, publicKey, contracts.waveNft, signTx, refetchLastId, lastTokenIdData]);

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
    setResult(null);
  }, []);

  return { mintRun, phase, error, result, reset };
}
