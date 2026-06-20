'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import { usePlayerRuns, type PlayerNft } from '@/hooks/usePlayerRuns';
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

function NftCard({ nft }: { nft: PlayerNft }) {
  const era   = ERAS[nft.eraId as EraId];
  const tier  = getTier(nft.score);
  const accent = era?.accentColor ?? '#f7931a';

  return (
    <Link href={`/gallery/${nft.tokenId}`}>
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="group bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden cursor-pointer hover:border-[#2a2a2a] transition-colors"
      >
        {/* NFT image */}
        <div className="relative aspect-video bg-[#0a0a0a] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={nft.imageUrl}
            alt={`WAVE run — ${era?.name ?? nft.eraId}`}
            className="w-full h-full object-cover"
          />
          {/* Token badge */}
          <div
            className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ color: accent, borderColor: `${accent}60`, background: '#0a0a0a' }}
          >
            {nft.eraId.includes('sbtc') ? 'sBTC' : nft.eraId.includes('alex') ? 'ALEX' : 'STX'}
          </div>
        </div>

        {/* Card body */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-[#fafafa] text-sm font-medium leading-snug">
                {era?.name ?? nft.eraId}
              </p>
              <p className="text-[#444] text-xs mt-0.5">
                #{nft.tokenId} · {new Date(nft.mintedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <span
              className="text-[9px] font-bold tracking-[0.2em] shrink-0 mt-0.5"
              style={{ color: tier.color }}
            >
              {tier.label}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: tier.color }}
            >
              {nft.score.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5 text-[#333] text-xs">
              {nft.tricks.length > 0 && (
                <span>{nft.tricks.length} trick{nft.tricks.length !== 1 ? 's' : ''}</span>
              )}
              <span
                className="text-[10px] font-semibold"
                style={{ color: nft.survived ? '#4ade80' : '#ef4444' }}
              >
                {nft.survived ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

function EmptyState({ hasWallet }: { hasWallet: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#1e1e1e] flex items-center justify-center">
        <span className="text-2xl text-[#333]">~</span>
      </div>
      <div>
        <p className="text-[#888] text-sm font-medium mb-1">No runs minted yet</p>
        <p className="text-[#444] text-xs max-w-xs">
          {hasWallet
            ? 'Start an onchain run, survive the chart, and mint your score as an NFT.'
            : 'Connect a wallet and start playing to mint your runs.'}
        </p>
      </div>
      <Link
        href="/play"
        className="px-5 py-2.5 rounded-xl bg-[#f7931a] text-[#0a0a0a] text-sm font-semibold hover:bg-[#f7931a]/90 transition-colors"
      >
        Play now
      </Link>
    </motion.div>
  );
}

export default function GalleryPage() {
  const { address, isLoaded } = useWallet();
  const { nfts, isLoading }   = usePlayerRuns();
  const hasWallet = isLoaded && !!address;

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-end justify-between">
          <div>
            <h1 className="text-[#fafafa] text-xl font-semibold">Gallery</h1>
            <p className="text-[#444] text-xs mt-0.5">Your minted runs</p>
          </div>
          <div className="flex items-center gap-4">
            {hasWallet && nfts.length > 0 && (
              <span className="text-[#333] text-xs tabular-nums">
                {nfts.length} NFT{nfts.length !== 1 ? 's' : ''}
              </span>
            )}
            <Link
              href="/play"
              className="text-xs text-[#444] hover:text-[#666] transition-colors"
            >
              ← play
            </Link>
          </div>
        </div>
      </div>

      {/* Wallet notice */}
      <AnimatePresence>
        {isLoaded && !hasWallet && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[#1e1e1e] overflow-hidden"
          >
            <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
              <p className="text-[#444] text-xs">
                Gallery is per-wallet. Connect a wallet to see your runs.
              </p>
              <Link href="/faucet" className="text-xs text-[#666] hover:text-[#888] underline underline-offset-2 transition-colors whitespace-nowrap">
                Get a wallet
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-4 h-4 border-2 border-[#f7931a] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : nfts.length === 0 ? (
          <EmptyState hasWallet={hasWallet} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {nfts.map((nft, i) => (
              <motion.div
                key={nft.runId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <NftCard nft={nft} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
