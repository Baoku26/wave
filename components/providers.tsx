'use client';

import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WalletProvider } from '@/contexts/WalletContext';

function XverseFix() {
  useEffect(() => {
    // Problem: Xverse's inpage.js calls JSON.parse on every window.message event
    // without a try/catch. The YuzuJS setImmediate polyfill bundled by Next.js sends
    // "setImmediate$<random>$<n>" strings via window.postMessage("*"), which crashes
    // Xverse and drops the wallet approval callback.
    //
    // Strategy:
    //   1. Always replace window.setImmediate with a MessageChannel version so new
    //      setImmediate(fn) calls NEVER go through window.postMessage.
    //   2. Suppress any "setImmediate$..." postMessage calls that still slip through
    //      (e.g., code that captured a local reference to YuzuJS's setImmediate before
    //      we replaced it on window).
    //
    // NOTE: suppress-only (without replacing setImmediate) breaks the UI because
    // YuzuJS's callbacks are queued via postMessage — suppressing those drops the
    // callbacks and React's scheduler tasks never fire.
    const w = window as unknown as Record<string, unknown>;

    const ch = new MessageChannel();
    const cbs: Record<number, () => void> = {};
    let id = 0;
    ch.port1.onmessage = (e: MessageEvent<number>) => {
      const cb = cbs[e.data];
      if (cb) { delete cbs[e.data]; cb(); }
    };
    const prevSetImmediate = w['setImmediate'];
    w['setImmediate'] = (fn: () => void) => {
      const i = ++id;
      cbs[i] = typeof fn === 'function' ? fn : () => { new Function(String(fn))(); };
      ch.port2.postMessage(i);
      return i;
    };
    w['clearImmediate'] = (i: number) => { delete cbs[i]; };

    // Suppress any lingering postMessage("setImmediate$...") calls.
    const origPM = window.postMessage.bind(window);
    window.postMessage = (msg: unknown, ...rest: unknown[]) => {
      if (typeof msg === 'string' && msg.startsWith('setImmediate$')) return;
      (origPM as (...a: unknown[]) => void)(msg, ...rest);
    };

    return () => {
      w['setImmediate'] = prevSetImmediate;
      window.postMessage = origPM;
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <TooltipProvider>
        <XverseFix />
        {children}
      </TooltipProvider>
    </WalletProvider>
  );
}
