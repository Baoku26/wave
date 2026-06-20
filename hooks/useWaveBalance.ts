'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { getContracts } from '@/lib/contracts';

export interface UseWaveBalanceResult {
  raw:       bigint | null;
  display:   string | null;
  isLoading: boolean;
  error:     string | null;
  refetch:   () => void;
}

const DECIMALS = 1_000_000;

async function fetchBalance(address: string, asset: string): Promise<bigint> {
  const res = await fetch(
    `/api/stacks/balance?address=${encodeURIComponent(address)}&asset=${encodeURIComponent(asset)}`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Balance fetch failed (${res.status})`);
  }
  const { raw } = await res.json() as { raw: string };
  return BigInt(raw);
}

export function useWaveBalance(): UseWaveBalanceResult {
  const { address } = useWallet();
  const contracts   = getContracts();

  const [raw,       setRaw]       = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const mountedRef  = useRef(true);

  const asset = `${contracts.waveToken}::wave-token`;

  const load = useCallback(async () => {
    if (!address) { setRaw(null); return; }
    setIsLoading(true);
    setError(null);
    try {
      const balance = await fetchBalance(address, asset);
      if (mountedRef.current) setRaw(balance);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Balance unavailable');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [address, asset]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => { mountedRef.current = false; clearInterval(id); };
  }, [load]);

  const display = raw !== null ? (Number(raw) / DECIMALS).toLocaleString() : null;

  return { raw, display, isLoading, error, refetch: load };
}

export function formatWave(n: bigint): string {
  return (Number(n) / 1_000_000).toLocaleString();
}
