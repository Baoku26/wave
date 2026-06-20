'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  connect as connectWallet,
  disconnect as disconnectWallet,
  getLocalStorage,
  isConnected as checkConnected,
} from '@stacks/connect';

interface WalletContextType {
  address:     string | null;
  isConnected: boolean;
  isLoaded:    boolean;
  connect:     () => Promise<void>;
  disconnect:  () => void;
}

const WalletContext = createContext<WalletContextType>({
  address:     null,
  isConnected: false,
  isLoaded:    false,
  connect:     async () => {},
  disconnect:  () => {},
});

const NET = (process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet') as 'mainnet' | 'testnet';

function readStoredAddress(): string | null {
  try {
    const stored = getLocalStorage();
    return stored?.addresses?.stx?.[0]?.address ?? null;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address,  setAddress]  = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    if (checkConnected()) {
      setAddress(readStoredAddress());
    }
    setIsLoaded(true);
  }, []);

  const connect = useCallback(async () => {
    try {
      const result = await connectWallet({ network: NET });
      // Prefer stx address from stored data (already network-filtered by connect)
      const stxAddr =
        readStoredAddress() ??
        result.addresses.find((a) => a.address.startsWith('ST') || a.address.startsWith('SP'))?.address ??
        null;
      setAddress(stxAddr);
    } catch {
      // user cancelled or wallet error — stay disconnected
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectWallet();
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider value={{ address, isConnected: !!address, isLoaded, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  return useContext(WalletContext);
}
