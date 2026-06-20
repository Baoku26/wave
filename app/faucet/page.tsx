'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import { useWaveBalance } from '@/hooks/useWaveBalance';
import { useFaucet } from '@/hooks/useFaucet';
import { Header } from '@/components/layout/Header';

export default function FaucetPage() {
  const { address, isLoaded, connect } = useWallet();
  const { display: balanceDisplay, refetch: refetchBalance } = useWaveBalance();
  const { claim, isLoading, callError, blockError, canClaim, blocksUntilClaim, currentBlock } = useFaucet();

  const [txid, setTxid] = useState<string | null>(null);

  async function handleClaim() {
    setTxid(null);
    try {
      const id = await claim();
      if (id) {
        setTxid(id);
        // Poll balance every 8s for up to 90s (~1–2 testnet blocks)
        const iv = setInterval(() => refetchBalance(), 8_000);
        setTimeout(() => clearInterval(iv), 90_000);
      }
    } catch {
      // errors surface via useFaucet's callError state
    }
  }

  const noWallet  = isLoaded && !address;
  const loading   = !isLoaded;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
        <div className="max-w-sm mx-auto px-4 py-16 flex flex-col gap-8">

          <div>
            <h1 className="text-xl font-semibold text-[#fafafa]">
              {noWallet ? 'Connect to play' : 'WAVE Faucet'}
            </h1>
            <p className="text-[#444] text-xs mt-1">
              {noWallet
                ? 'Connect Leather or Xverse to claim WAVE tokens'
                : 'Claim 500 WAVE every 144 blocks (~24h)'}
            </p>
          </div>

          <AnimatePresence mode="wait">

            {/* Loading */}
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center py-12"
              >
                <div className="w-5 h-5 border-2 border-[#f7931a] border-t-transparent rounded-full animate-spin" />
              </motion.div>
            )}

            {/* Not connected */}
            {!loading && noWallet && (
              <motion.div
                key="no-wallet"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 flex flex-col gap-5"
              >
                <p className="text-[#555] text-sm leading-relaxed">
                  WAVE runs on Stacks testnet. Install{' '}
                  <span className="text-[#888]">Leather</span> or{' '}
                  <span className="text-[#888]">Xverse</span> to get a testnet wallet, then
                  connect below.
                </p>
                <button
                  onClick={connect}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[#f7931a] text-[#0a0a0a] hover:bg-[#e8841a] transition-colors"
                >
                  Connect Wallet
                </button>
              </motion.div>
            )}

            {/* Connected — faucet */}
            {!loading && !noWallet && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-5"
              >
                {/* Balance */}
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 text-center">
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-[#333] uppercase mb-3">
                    WAVE Balance
                  </p>
                  <p className="text-5xl font-bold tabular-nums text-[#fafafa]">
                    {balanceDisplay ?? '—'}
                  </p>
                  <p className="text-[#333] text-xs mt-2">WAVE tokens</p>
                </div>

                {/* Claim */}
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 flex flex-col gap-5">
                  <div className="space-y-1">
                    <p className="text-[#fafafa] text-sm font-medium">Claim 500 WAVE</p>
                    <p className="text-[#444] text-xs leading-relaxed">
                      Free testnet tokens · 144-block cooldown (~24h)
                      {currentBlock !== null && (
                        <> · block <span className="tabular-nums">{currentBlock.toLocaleString()}</span></>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={handleClaim}
                    disabled={!canClaim || isLoading}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: canClaim ? '#f7931a' : '#1e1e1e',
                      color:      canClaim ? '#0a0a0a' : '#444',
                    }}
                  >
                    {isLoading
                      ? 'Approve in wallet…'
                      : canClaim
                      ? 'Claim 500 WAVE'
                      : `${blocksUntilClaim} blocks until next claim`}
                  </button>

                  {isLoading && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[#444] text-xs text-center"
                    >
                      Waiting for confirmation (~10s per block)…
                    </motion.p>
                  )}

                  <AnimatePresence>
                    {txid && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-[#0f1f0f] border border-[#1e3a1e] rounded-lg px-4 py-3"
                      >
                        <p className="text-[#4ade80] text-xs font-medium mb-1">Claim submitted!</p>
                        <p className="text-[#2a5a2a] text-[10px] font-mono break-all">{txid}</p>
                        <p className="text-[#2d5c2d] text-[10px] mt-1">
                          +500 WAVE appears after confirmation (~10s)
                        </p>
                      </motion.div>
                    )}
                    {callError && !txid && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[#ef4444] text-xs text-center"
                      >
                        {callError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {blockError && !callError && !txid && (
                    <p className="text-[#333] text-[10px] text-center">
                      {blockError} — cooldown display may be inaccurate
                    </p>
                  )}
                </div>

                {/* Address */}
                <p className="text-[#2a2a2a] text-[10px] font-mono text-center break-all">
                  {address}
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
