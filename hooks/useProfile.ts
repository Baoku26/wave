'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStacksWallet } from '@baoku26/sbtc-sdk';

export interface Profile {
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface UseProfileResult {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (displayName: string, avatarUrl?: string) => Promise<boolean>;
}

export function useProfile(): UseProfileResult {
  const { address, exportMnemonic } = useStacksWallet();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) { setProfile(null); return; }
    setIsLoading(true);
    fetch(`/api/profile?wallet=${address}`)
      .then((r) => r.ok ? r.json() as Promise<{ profile: Profile | null }> : Promise.reject())
      .then((d) => setProfile(d.profile))
      .catch(() => setError('Could not load profile'))
      .finally(() => setIsLoading(false));
  }, [address]);

  const updateProfile = useCallback(async (displayName: string, avatarUrl = '') => {
    if (!address) return false;
    try {
      setIsLoading(true);
      setError(null);

      const mnemonic = await exportMnemonic();
      const message = `wave-profile:${address}:${displayName}`;
      const msgBytes = new TextEncoder().encode(message);
      const hashBuf = new ArrayBuffer(msgBytes.length);
      new Uint8Array(hashBuf).set(msgBytes);
      const hashDigest = await crypto.subtle.digest('SHA-256', hashBuf);
      const msgHashHex = Array.from(new Uint8Array(hashDigest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const { generateWallet } = await import('@stacks/wallet-sdk');
      const { signMessageHashRsv } = await import('@stacks/transactions');
      const wallet = await generateWallet({ secretKey: mnemonic, password: '' });
      const sigHex = signMessageHashRsv({
        messageHash: msgHashHex,
        privateKey: wallet.accounts[0].stxPrivateKey,
      });

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, display_name: displayName, avatar_url: avatarUrl, signature: sigHex }),
      });

      if (!res.ok) { setError('Profile update failed'); return false; }
      const { profile: updated } = await res.json() as { profile: Profile };
      setProfile(updated);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profile update failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, exportMnemonic]);

  return { profile, isLoading, error, updateProfile };
}
