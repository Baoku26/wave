'use client';

import { useMemo, useRef } from 'react';
import { SbtcProvider, WebAdapter } from '@baoku26/sbtc-sdk';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  // Auth passphrase fallback for environments without WebAuthn (e.g. some browsers).
  // Uses window.prompt as last resort — acceptable for dev / testnet.
  const adapterRef = useRef<WebAdapter | null>(null);
  if (!adapterRef.current && typeof window !== 'undefined') {
    adapterRef.current = new WebAdapter({
      onAuthRequired: (reason) =>
        window.prompt(`WAVE — ${reason}\n\nEnter your passphrase to continue:`) ?? null,
    });
  }

  const network = (process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet') as 'mainnet' | 'testnet';

  return (
    <SbtcProvider network={network} adapter={adapterRef.current ?? undefined}>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </SbtcProvider>
  );
}
