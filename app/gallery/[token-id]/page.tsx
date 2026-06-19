'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useStacksWallet } from '@baoku26/sbtc-sdk';
import { usePlayerRuns } from '@/hooks/usePlayerRuns';
import { ERAS, type EraId } from '@/lib/eras';

const TIERS = [
  { min: 60000, label: 'PLATINUM', color: '#e2e8f0' },
  { min: 30000, label: 'GOLD',     color: '#f7931a' },
  { min: 15000, label: 'SILVER',   color: '#94a3b8' },
  { min: 5000,  label: 'BRONZE',   color: '#c97d36' },
  { min: 0,     label: 'WIPEOUT',  color: '#ef4444' },
] as const;

function getTier(score: number) {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
}

export default function NftDetailPage({ params }: { params: Promise<{ 'token-id': string }> }) {
  const { 'token-id': rawTokenId } = use(params);
  const tokenId = parseInt(rawTokenId, 10);

  const { address, isLoaded } = useStacksWallet();
  const { nfts, isLoading }   = usePlayerRuns();

  const nft = useMemo(
    () => nfts.find((n) => n.tokenId === tokenId) ?? null,
    [nfts, tokenId],
  );

  const era    = nft ? ERAS[nft.eraId as EraId] : null;
  const tier   = nft ? getTier(nft.score) : null;
  const accent = era?.accentColor ?? '#f7931a';

  const shareText = nft && tier
    ? `I scored ${nft.score.toLocaleString()} (${tier.label}) surfing ${era?.name ?? nft.eraId} on WAVE — the onchain chart surfing game on Stacks 🏄`
    : '';

  function handleShare() {
    if (navigator.share && nft) {
      navigator.share({ text: shareText, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`).catch(() => {});
    }
  }

  // ── loading ───────────────────────────────────────────────────────────────────
  if (isLoading || !isLoaded) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-[#f7931a] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // ── not found ─────────────────────────────────────────────────────────────────
  if (!nft) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-5 text-center px-6">
        <p className="text-[#888] text-sm font-medium">NFT #{rawTokenId} not found</p>
        <p className="text-[#444] text-xs max-w-xs">
          {!address
            ? 'Connect the wallet that minted this NFT to view it.'
            : 'This NFT isn\'t in your local gallery. It may have been minted from a different device.'}
        </p>
        <Link
          href="/gallery"
          className="text-xs text-[#666] hover:text-[#888] underline underline-offset-2 transition-colors"
        >
          ← back to gallery
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Nav */}
      <div className="border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/gallery" className="text-[#444] hover:text-[#666] text-xs transition-colors">
            ← gallery
          </Link>
          <span className="text-[#333] text-xs tabular-nums">#{nft.tokenId}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* NFT image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl overflow-hidden border border-[#1e1e1e] aspect-video bg-[#0a0a0a]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={nft.imageUrl}
              alt={`WAVE run — ${era?.name ?? nft.eraId}`}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-5"
          >
            {/* Title */}
            <div>
              <p
                className="text-[10px] font-bold tracking-[0.22em] mb-1.5"
                style={{ color: tier!.color }}
              >
                {tier!.label}
              </p>
              <h1 className="text-[#fafafa] text-xl font-semibold leading-snug">
                {era?.name ?? nft.eraId}
              </h1>
              <p className="text-[#444] text-xs mt-1">
                {era?.token ?? ''} ·{' '}
                {new Date(nft.mintedAt).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </p>
            </div>

            {/* Score */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-4">
              <p className="text-[#444] text-[10px] mb-1">SCORE</p>
              <p
                className="text-4xl font-bold tabular-nums"
                style={{ color: tier!.color }}
              >
                {nft.score.toLocaleString()}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-lg px-4 py-3">
                <p className="text-[#444] text-[10px] mb-1">TRICKS</p>
                <p className="text-[#fafafa] text-sm font-semibold tabular-nums">
                  {nft.tricks.length}
                </p>
              </div>
              <div className="bg-[#111] border border-[#1e1e1e] rounded-lg px-4 py-3">
                <p className="text-[#444] text-[10px] mb-1">OUTCOME</p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: nft.survived ? '#4ade80' : '#ef4444' }}
                >
                  {nft.survived ? 'Survived' : 'Wipeout'}
                </p>
              </div>
            </div>

            {/* Tricks list */}
            {nft.tricks.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {nft.tricks.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-md border"
                    style={{
                      color:       accent,
                      borderColor: `${accent}35`,
                      background:  `${accent}10`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* IPFS link */}
            <div className="text-[#2a2a2a] text-[10px] font-mono break-all">
              ipfs://{nft.ipfsCid}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleShare}
                className="flex-1 py-2.5 rounded-lg border border-[#2a2a2a] text-[#888] text-sm font-medium hover:border-[#3a3a3a] hover:text-[#fafafa] transition-colors"
              >
                Share
              </button>
              <Link
                href="/play"
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-colors"
                style={{ background: accent, color: '#0a0a0a' }}
              >
                Play again
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
