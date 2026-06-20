'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { signMessage } from '@/lib/contract-call';

export interface Profile {
  wallet_address: string;
  display_name:   string | null;
  avatar_url:     string | null;
}

interface UseProfileResult {
  profile:       Profile | null;
  isLoading:     boolean;
  error:         string | null;
  updateProfile: (displayName: string, avatarUrl?: string) => Promise<boolean>;
}

export function useProfile(): UseProfileResult {
  const { address, isConnected } = useWallet();

  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

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
    if (!isConnected || !address) { setError('Wallet not connected'); return false; }

    setIsLoading(true);
    setError(null);

    try {
      const message = `wave-profile:${address}:${displayName}`;
      const { signature, publicKey } = await signMessage(message);

      const res = await fetch('/api/profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet: address, display_name: displayName, avatar_url: avatarUrl, signature, publicKey }),
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
  }, [isConnected, address]);

  return { profile, isLoading, error, updateProfile };
}
