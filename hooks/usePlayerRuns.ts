'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';

export interface PlayerNft {
  tokenId:  number;
  runId:    string;   // hex
  eraId:    string;
  score:    number;
  tricks:   string[];
  survived: boolean;
  ipfsCid:  string;
  imageUrl: string;
  mintedAt: number;   // timestamp ms
}

interface UsePlayerRunsResult {
  nfts:      PlayerNft[];
  isLoading: boolean;
  addNft:    (nft: PlayerNft) => void;
  clear:     () => void;
}

// Key per wallet so switching accounts shows the right NFTs.
function storageKey(address: string) {
  return `wave:nfts:${address}`;
}

function load(address: string): PlayerNft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(address));
    return raw ? (JSON.parse(raw) as PlayerNft[]) : [];
  } catch {
    return [];
  }
}

function save(address: string, nfts: PlayerNft[]) {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(nfts));
  } catch {}
}

export function usePlayerRuns(): UsePlayerRunsResult {
  const { address } = useWallet();
  const [nfts, setNfts]           = useState<PlayerNft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setNfts(address ? load(address) : []);
    setIsLoading(false);
  }, [address]);

  const addNft = useCallback((nft: PlayerNft) => {
    if (!address) return;
    setNfts((prev) => {
      const next = [nft, ...prev.filter((n) => n.runId !== nft.runId)];
      save(address, next);
      return next;
    });
  }, [address]);

  const clear = useCallback(() => {
    if (!address) return;
    localStorage.removeItem(storageKey(address));
    setNfts([]);
  }, [address]);

  return { nfts, isLoading, addNft, clear };
}
