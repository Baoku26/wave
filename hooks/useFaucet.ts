'use client';

import { useCallback, useEffect, useState } from 'react';
import { Cl, serializeCV, deserializeCV, ClarityType } from '@stacks/transactions';
import { useWallet } from '@/contexts/WalletContext';
import { callContract } from '@/lib/contract-call';
import { getContracts } from '@/lib/contracts';

export interface UseFaucetResult {
  claim:            () => Promise<string | null>;
  isLoading:        boolean;
  callError:        string | null;
  blockError:       string | null;
  lastClaimBlock:   number | null;
  canClaim:         boolean;
  currentBlock:     number | null;
  blocksUntilClaim: number;
}

const CLAIM_COOLDOWN = 144;

function cvHex(cv: Parameters<typeof serializeCV>[0]): string {
  return '0x' + serializeCV(cv);
}

async function fetchBlockHeight(): Promise<number> {
  const res = await fetch('/api/stacks/block-height');
  if (!res.ok) throw new Error('block-height fetch failed');
  const { height } = await res.json() as { height: number };
  return height;
}

async function fetchLastClaim(contract: string, address: string): Promise<number> {
  const res = await fetch('/api/stacks/call-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contract,
      fn:     'get-last-claim',
      sender: address,
      args:   [cvHex(Cl.principal(address))],
    }),
  });
  if (!res.ok) return 0;
  const { okay, result } = await res.json() as { okay?: boolean; result?: string };
  if (!okay || !result) return 0;

  try {
    const cv = deserializeCV(result.startsWith('0x') ? result.slice(2) : result);
    // Returns (some uint) or none; unwrap the optional
    if (cv.type === ClarityType.OptionalSome && cv.value.type === ClarityType.UInt) {
      return Number(cv.value.value as bigint);
    }
  } catch {}
  return 0;
}

export function useFaucet(): UseFaucetResult {
  const { address, isConnected } = useWallet();
  const contracts = getContracts();

  const [currentBlock,  setCurrentBlock]  = useState<number | null>(null);
  const [lastClaimBlock, setLastClaimBlock] = useState<number | null>(null);
  const [blockError,    setBlockError]    = useState<string | null>(null);
  const [callError,     setCallError]     = useState<string | null>(null);
  const [isLoading,     setIsLoading]     = useState(false);

  // Load block height + last-claim on mount / address change
  useEffect(() => {
    setBlockError(null);
    fetchBlockHeight()
      .then(setCurrentBlock)
      .catch(() => setBlockError('Block height unavailable'));

    if (address) {
      fetchLastClaim(contracts.waveToken, address)
        .then(setLastClaimBlock)
        .catch(() => {});
    } else {
      setLastClaimBlock(null);
    }
  }, [address, contracts.waveToken]);

  const canClaim = (() => {
    if (!isConnected) return false;
    if (lastClaimBlock === null || lastClaimBlock === 0) return true;
    if (currentBlock === null) return false;
    return currentBlock - lastClaimBlock >= CLAIM_COOLDOWN;
  })();

  const blocksUntilClaim = (() => {
    if (canClaim) return 0;
    if (lastClaimBlock === null || currentBlock === null) return CLAIM_COOLDOWN;
    return Math.max(0, CLAIM_COOLDOWN - (currentBlock - lastClaimBlock));
  })();

  const claim = useCallback(async () => {
    if (!canClaim || !address) return null;
    setCallError(null);
    setIsLoading(true);
    try {
      const txid = await callContract(contracts.waveToken, 'claim-daily', []);
      // Refresh block height and last-claim after broadcast
      fetchBlockHeight().then(setCurrentBlock).catch(() => null);
      fetchLastClaim(contracts.waveToken, address).then(setLastClaimBlock).catch(() => null);
      return txid;
    } catch (e) {
      setCallError(e instanceof Error ? e.message : 'Claim failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [canClaim, address, contracts.waveToken]);

  return { claim, isLoading, callError, blockError, lastClaimBlock, canClaim, currentBlock, blocksUntilClaim };
}
