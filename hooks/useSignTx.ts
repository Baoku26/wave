'use client';

import { useCallback } from 'react';
import { useStacksWallet } from '@baoku26/sbtc-sdk';
import { mnemonicSignTx } from '@/lib/sign-tx';

// Returns a signTx function compatible with useStacksContract.call() options.
// Signs directly with the stored mnemonic key; no browser extension required.
export function useSignTx(): (tx: Uint8Array) => Promise<Uint8Array> {
  const { exportMnemonic } = useStacksWallet();

  return useCallback(async (txBytes: Uint8Array): Promise<Uint8Array> => {
    const mnemonic = await exportMnemonic();
    if (!mnemonic) throw new Error('Wallet locked — enter your passphrase to continue');
    return mnemonicSignTx(mnemonic, txBytes);
  }, [exportMnemonic]);
}
