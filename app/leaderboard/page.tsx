'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import { useLeaderboard, type LeaderboardEntry } from '@/hooks/useLeaderboard';
import { ERA_LIST, ERAS, type EraId } from '@/lib/eras';
import { Header } from '@/components/layout/Header';

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

function fmt(addr: string, displayName: string | null) {
  if (displayName) return displayName;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-[#f7931a] text-xs font-bold w-6 text-center">1</span>;
  if (rank === 2) return <span className="text-[#94a3b8] text-xs font-bold w-6 text-center">2</span>;
  if (rank === 3) return <span className="text-[#c97d36] text-xs font-bold w-6 text-center">3</span>;
  return <span className="text-[#333] text-xs tabular-nums w-6 text-center">{rank}</span>;
}

function LeaderboardRow({
  entry,
  isPlayer,
  accentColor,
  index,
}: {
  entry:       LeaderboardEntry;
  isPlayer:    boolean;
  accentColor: string;
  index:       number;
}) {
  const tier = getTier(entry.score);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
      style={{
        background: isPlayer ? `${accentColor}10` : 'transparent',
        border:     isPlayer ? `1px solid ${accentColor}25` : '1px solid transparent',
      }}
    >
      <RankBadge rank={entry.rank} />

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: isPlayer ? accentColor : '#fafafa' }}
        >
          {fmt(entry.player, entry.displayName)}
          {isPlayer && <span className="text-[10px] ml-1.5 opacity-60">you</span>}
        </p>
        <p className="text-[#444] text-[10px] font-mono truncate">{entry.player.slice(0, 10)}…</p>
      </div>

      <div className="text-right shrink-0">
        <p
          className="text-sm font-bold tabular-nums"
          style={{ color: tier.color }}
        >
          {entry.score.toLocaleString()}
        </p>
        <p
          className="text-[9px] font-semibold tracking-[0.15em]"
          style={{ color: `${tier.color}80` }}
        >
          {tier.label}
        </p>
      </div>
    </motion.div>
  );
}

function EraLeaderboard({ eraId, address }: { eraId: string; address: string | undefined }) {
  const era                  = ERAS[eraId as EraId];
  const { entries, isLoading, error } = useLeaderboard(eraId);

  const playerRank = address
    ? entries.find((e) => e.player === address)?.rank ?? null
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: `${era.accentColor} transparent transparent transparent` }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-[#555] text-sm">Couldn't load leaderboard.</p>
        <p className="text-[#333] text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[#555] text-sm">No runs yet for this era.</p>
        <p className="text-[#333] text-xs mt-1">Be the first to surf {era.name}.</p>
        <Link
          href={`/play/${eraId}`}
          className="mt-4 inline-block text-xs font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ background: era.accentColor, color: '#0a0a0a' }}
        >
          Play now
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Player rank callout */}
      <AnimatePresence>
        {playerRank && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div
              className="rounded-lg px-4 py-3 flex items-center justify-between"
              style={{ background: `${era.accentColor}15`, border: `1px solid ${era.accentColor}30` }}
            >
              <span className="text-sm font-medium" style={{ color: era.accentColor }}>
                Your rank
              </span>
              <span className="text-2xl font-bold tabular-nums" style={{ color: era.accentColor }}>
                #{playerRank}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {entries.map((entry, i) => (
        <LeaderboardRow
          key={entry.runId || entry.player}
          entry={entry}
          isPlayer={entry.player === address}
          accentColor={era.accentColor}
          index={i}
        />
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [activeEra, setActiveEra] = useState<string>(ERA_LIST[0].id);
  const { address }               = useWallet();
  const era = ERAS[activeEra as EraId];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0a0a]">
        {/* Page header */}
        <div className="border-b border-[#1a1a1a] px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-[#fafafa] text-xl font-semibold">Leaderboard</h1>
            <p className="text-[#444] text-xs mt-0.5">Top surfers across all six eras</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Era tabs */}
          <div className="flex gap-1 p-1 bg-[#111] border border-[#1e1e1e] rounded-xl mb-8 overflow-x-auto scrollbar-none">
            {ERA_LIST.map((e) => (
              <button
                key={e.id}
                onClick={() => setActiveEra(e.id)}
                className="flex-1 min-w-max px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                style={
                  activeEra === e.id
                    ? { background: e.accentColor, color: '#0a0a0a' }
                    : { color: '#555' }
                }
              >
                {e.name}
              </button>
            ))}
          </div>

          {/* Era info row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: era.accentColor, borderColor: `${era.accentColor}50` }}
              >
                {era.token}
              </span>
              <span className="text-[#555] text-xs">{era.name}</span>
            </div>
            <Link
              href={`/leaderboard/${activeEra}`}
              className="text-xs transition-colors hover:text-[#888]"
              style={{ color: era.accentColor }}
            >
              Full board →
            </Link>
          </div>

          {/* Leaderboard content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeEra}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EraLeaderboard eraId={activeEra} address={address ?? undefined} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
