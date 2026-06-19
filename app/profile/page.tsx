'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useStacksWallet } from '@baoku26/sbtc-sdk';
import { useProfile } from '@/hooks/useProfile';
import { useWaveBalance } from '@/hooks/useWaveBalance';
import { Header } from '@/components/layout/Header';

export default function ProfilePage() {
  const { address, isLoaded, lockWallet, clearWallet } = useStacksWallet();
  const { profile, isLoading, error, updateProfile } = useProfile();
  const { display: balanceDisplay } = useWaveBalance();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl]     = useState('');
  const [saved, setSaved]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveErr, setSaveErr]         = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Populate form from loaded profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    setSaveErr(null);
    setSaved(false);
    const ok = await updateProfile(displayName.trim(), avatarUrl.trim());
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveErr(error ?? 'Save failed');
    }
    setSaving(false);
  }

  const noWallet = isLoaded && !address;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
        <div className="max-w-sm mx-auto px-4 py-16 flex flex-col gap-8">

          <div>
            <h1 className="text-xl font-semibold text-[#fafafa]">Profile</h1>
            <p className="text-[#444] text-xs mt-1">
              Your display name appears on the leaderboard
            </p>
          </div>

          <AnimatePresence mode="wait">

            {/* No wallet */}
            {noWallet && (
              <motion.div
                key="no-wallet"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 text-center flex flex-col gap-4"
              >
                <p className="text-[#555] text-sm leading-relaxed">
                  No wallet connected. Get started to create or import one.
                </p>
                <Link
                  href="/faucet"
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[#f7931a] text-[#0a0a0a] hover:bg-[#e8841a] transition-colors block text-center"
                >
                  Get started
                </Link>
              </motion.div>
            )}

            {/* Loading wallet state */}
            {!isLoaded && (
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

            {/* Connected */}
            {isLoaded && address && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-5"
              >
                {/* Wallet card */}
                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#444] text-xs">Wallet</span>
                    {balanceDisplay !== null && (
                      <span className="text-[#f7931a] text-xs font-semibold tabular-nums">
                        {balanceDisplay} WAVE
                      </span>
                    )}
                  </div>
                  <p className="text-[#666] text-[11px] font-mono break-all">{address}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => lockWallet()}
                      className="text-[#333] hover:text-[#555] text-xs transition-colors"
                    >
                      Lock wallet
                    </button>
                    <span className="text-[#222] text-xs">·</span>
                    <Link
                      href="/faucet"
                      className="text-[#333] hover:text-[#555] text-xs transition-colors"
                    >
                      Backup phrase
                    </Link>
                  </div>
                </div>

                {/* Profile form */}
                {isLoading && !profile ? (
                  <div className="flex justify-center py-8">
                    <div className="w-4 h-4 border-2 border-[#333] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <form onSubmit={handleSave} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 flex flex-col gap-5">
                    <p className="text-[#fafafa] text-sm font-medium">Display name</p>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[#444] text-xs">Name</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. wavesurfer42"
                          maxLength={32}
                          className="w-full bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#fafafa] text-sm placeholder-[#333] focus:outline-none focus:border-[#3a3a3a]"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[#444] text-xs">Avatar URL <span className="text-[#2a2a2a]">(optional)</span></label>
                        <input
                          type="url"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="https://…"
                          className="w-full bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#fafafa] text-sm placeholder-[#333] focus:outline-none focus:border-[#3a3a3a]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!displayName.trim() || saving}
                      className="w-full py-3 rounded-xl text-sm font-semibold bg-[#f7931a] text-[#0a0a0a] hover:bg-[#e8841a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving…' : 'Save profile'}
                    </button>

                    <AnimatePresence>
                      {saved && (
                        <motion.p
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-[#4ade80] text-xs text-center"
                        >
                          Profile saved
                        </motion.p>
                      )}
                      {saveErr && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-[#ef4444] text-xs text-center"
                        >
                          {saveErr}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </form>
                )}

                {/* Danger zone */}
                <div className="border border-[#1e1e1e] rounded-2xl p-5 flex flex-col gap-3">
                  <p className="text-[#444] text-xs font-medium">Danger zone</p>
                  {!confirmClear ? (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="text-[#ef4444]/60 hover:text-[#ef4444] text-xs transition-colors text-left"
                    >
                      Remove wallet from this browser
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-[#ef4444]/80 text-xs leading-relaxed">
                        This removes your wallet from this browser. Back up your recovery phrase first — it cannot be recovered.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmClear(false)}
                          className="flex-1 py-2 rounded-lg text-xs border border-[#2a2a2a] text-[#555] hover:text-[#888] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => clearWallet()}
                          className="flex-1 py-2 rounded-lg text-xs bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/20 transition-colors font-medium"
                        >
                          Remove wallet
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
