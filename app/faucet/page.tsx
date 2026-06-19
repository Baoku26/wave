'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStacksWallet } from '@baoku26/sbtc-sdk';
import { useWaveBalance } from '@/hooks/useWaveBalance';
import { useFaucet } from '@/hooks/useFaucet';
import { Header } from '@/components/layout/Header';

type WalletSetupView = 'choice' | 'import' | 'backup';

export default function FaucetPage() {
  const { address, isLoaded, generateWallet, restoreWallet, exportMnemonic } = useStacksWallet();
  const { raw: balance, display: balanceDisplay, refetch: refetchBalance } = useWaveBalance();
  const { claim, isLoading, callError, blockError, canClaim, blocksUntilClaim, currentBlock } = useFaucet();

  const [txid, setTxid] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [setupView, setSetupView] = useState<WalletSetupView>('choice');
  const [mnemonic, setMnemonic] = useState('');
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [backupPhrase, setBackupPhrase] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleClaim() {
    setTxid(null);
    try {
      const id = await claim();
      if (id) {
        setTxid(id);
        // Poll balance every 8s for up to 90s — TX confirms after 1–2 blocks (~10–30s testnet)
        const interval = setInterval(() => refetchBalance(), 8_000);
        setTimeout(() => clearInterval(interval), 90_000);
      }
    } catch {
      // errors surface via useFaucet's error state
    }
  }

  async function handleGenerate() {
    setGenLoading(true);
    try {
      await generateWallet();
    } catch {
      // user cancelled passphrase prompt — safe to ignore
    } finally {
      setGenLoading(false);
    }
  }

  async function handleImport() {
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setImportErr('Recovery phrase must be 12 or 24 words');
      return;
    }
    setImportErr(null);
    setImportLoading(true);
    try {
      await restoreWallet(mnemonic.trim());
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Invalid recovery phrase');
    } finally {
      setImportLoading(false);
    }
  }

  async function handleBackup() {
    setBackupLoading(true);
    try {
      const phrase = await exportMnemonic();
      setBackupPhrase(phrase ?? null);
      setSetupView('backup');
    } catch {
      // user cancelled passphrase prompt — safe to ignore
    } finally {
      setBackupLoading(false);
    }
  }

  function handleCopy() {
    if (!backupPhrase) return;
    navigator.clipboard.writeText(backupPhrase).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const noWallet = isLoaded && !address;
  const loading = !isLoaded;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
        <div className="max-w-sm mx-auto px-4 py-16 flex flex-col gap-8">

          {/* Page title */}
          <div>
            <h1 className="text-xl font-semibold text-[#fafafa]">
              {noWallet ? 'Get started' : 'WAVE Faucet'}
            </h1>
            <p className="text-[#444] text-xs mt-1">
              {noWallet
                ? 'Create or import a wallet to play on testnet'
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

            {/* No wallet — setup flow */}
            {!loading && noWallet && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 flex flex-col gap-5"
              >
                {setupView === 'choice' && (
                  <>
                    <p className="text-[#555] text-sm leading-relaxed">
                      WAVE uses an in-browser wallet. No extension required.
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleGenerate}
                        disabled={genLoading}
                        className="w-full py-3 rounded-xl text-sm font-semibold bg-[#f7931a] text-[#0a0a0a] hover:bg-[#e8841a] transition-colors disabled:opacity-60"
                      >
                        {genLoading ? 'Creating wallet…' : 'Generate new wallet'}
                      </button>
                      <button
                        onClick={() => setSetupView('import')}
                        className="w-full py-3 rounded-xl text-sm font-medium border border-[#2a2a2a] text-[#888] hover:border-[#3a3a3a] hover:text-[#aaa] transition-colors"
                      >
                        Import existing wallet
                      </button>
                    </div>
                  </>
                )}

                {setupView === 'import' && (
                  <>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setSetupView('choice'); setImportErr(null); setMnemonic(''); }}
                        className="text-[#444] hover:text-[#666] text-xs transition-colors"
                      >
                        ← back
                      </button>
                      <p className="text-[#888] text-sm font-medium">Import wallet</p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <textarea
                        value={mnemonic}
                        onChange={(e) => { setMnemonic(e.target.value); setImportErr(null); }}
                        placeholder="Enter your 12 or 24-word recovery phrase…"
                        rows={4}
                        className="w-full bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#fafafa] text-sm placeholder-[#333] resize-none focus:outline-none focus:border-[#3a3a3a]"
                      />
                      {importErr && (
                        <p className="text-[#ef4444] text-xs">{importErr}</p>
                      )}
                      <button
                        onClick={handleImport}
                        disabled={!mnemonic.trim() || importLoading}
                        className="w-full py-3 rounded-xl text-sm font-semibold bg-[#f7931a] text-[#0a0a0a] hover:bg-[#e8841a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {importLoading ? 'Importing…' : 'Import wallet'}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Backup phrase view */}
            {!loading && !noWallet && setupView === 'backup' && backupPhrase && (
              <motion.div
                key="backup"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-5"
              >
                <div className="bg-[#0f1a0f] border border-[#1e3a1e] rounded-xl px-4 py-3">
                  <p className="text-[#4ade80] text-xs font-medium mb-1">Keep this safe</p>
                  <p className="text-[#2d5c2d] text-xs leading-relaxed">
                    This is the only way to recover your wallet. Never share it.
                  </p>
                </div>
                <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl p-4">
                  <p className="text-[#888] text-sm font-mono leading-loose break-all select-all">
                    {backupPhrase}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium border border-[#2a2a2a] text-[#888] hover:border-[#3a3a3a] hover:text-[#aaa] transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy phrase'}
                  </button>
                  <button
                    onClick={() => { setSetupView('choice'); setBackupPhrase(null); }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[#1a1a1a] text-[#fafafa] hover:bg-[#222] transition-colors"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}

            {/* Connected — faucet */}
            {!loading && !noWallet && setupView !== 'backup' && (
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
                      color: canClaim ? '#0a0a0a' : '#444',
                    }}
                  >
                    {isLoading
                      ? 'Claiming…'
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
                      Confirming on Stacks (~10s per block)…
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

                {/* Wallet info + actions */}
                <div className="flex flex-col gap-2">
                  <p className="text-[#2a2a2a] text-[10px] font-mono text-center break-all">
                    {address}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleBackup}
                      disabled={backupLoading}
                      className="text-[#333] hover:text-[#555] text-xs transition-colors underline underline-offset-2"
                    >
                      {backupLoading ? 'Unlocking…' : 'Backup recovery phrase'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
