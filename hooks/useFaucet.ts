'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStacksContract, useStacksWallet, useSbtcContext } from '@baoku26/sbtc-sdk';
import { Cl } from '@stacks/transactions';
import { getContracts } from '@/lib/contracts';
import { useSignTx } from '@/hooks/useSignTx';
import { callContract } from '@/lib/stacks-call';

interface UseFaucetResult {
  claim: () => Promise<string | null>;
  isLoading: boolean;
  /** Error from the claim-daily contract call. */
  callError: string | null;
  /** Non-fatal: block height unavailable (cooldown display only). */
  blockError: string | null;
  lastClaimBlock: number | null;
  canClaim: boolean;
  currentBlock: number | null;
  blocksUntilClaim: number;
}

const CLAIM_COOLDOWN = 144;

async function fetchBlockHeight(hiroApiUrl: string): Promise<number> {
  const res = await fetch(`${hiroApiUrl}/v2/info`);
  if (!res.ok) throw new Error('block-height fetch failed');
  const json = await res.json() as { stacks_tip_height: number };
  return json.stacks_tip_height;
}

export function useFaucet(): UseFaucetResult {
  const { address, publicKey } = useStacksWallet();
  const { apiConfig } = useSbtcContext();
  const contracts = getContracts();
  const signTx = useSignTx();

  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setBlockError(null);
    fetchBlockHeight(apiConfig.hiroApiUrl)
      .then(setCurrentBlock)
      .catch(() => setBlockError('Block height unavailable'));
  }, [apiConfig.hiroApiUrl]);

  const { data: lastClaimData, refetch: refetchClaim } = useStacksContract<bigint>({
    contract: contracts.waveToken,
    readOnly: address ? {
      fn: 'get-last-claim',
      args: [Cl.principal(address)],
      sender: address,
    } : undefined,
  });

  const lastClaimBlock = lastClaimData !== null && lastClaimData !== undefined
    ? Number(lastClaimData)
    : null;

  const canClaim = (() => {
    if (!address || !publicKey) return false;
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
    if (!canClaim || !address || !publicKey) return null;
    setCallError(null);
    setIsLoading(true);
    try {
      const txid = await callContract(
        contracts.waveToken,
        'claim-daily',
        [],
        { address, publicKey },
        signTx,
      );
      fetchBlockHeight(apiConfig.hiroApiUrl).then(setCurrentBlock).catch(() => null);
      refetchClaim();
      return txid;
    } catch (e) {
      setCallError(e instanceof Error ? e.message : 'Claim failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [contracts.waveToken, address, publicKey, signTx, canClaim, apiConfig.hiroApiUrl, refetchClaim]);

  return { claim, isLoading, callError, blockError, lastClaimBlock, canClaim, currentBlock, blocksUntilClaim };
}
