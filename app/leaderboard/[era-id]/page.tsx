'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import { useLeaderboard, type LeaderboardEntry } from '@/hooks/useLeaderboard';
import { ERAS, type EraId } from '@/lib/eras';
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
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}

function RankBadge({ rank }: { rank: number }) {
  const gold   = rank === 1;
  const silver = rank === 2;
  const bronze = rank === 3;
  return (
    <span
      className="text-sm font-bold tabular-nums w-8 text-center shrink-0"
      style={{
        color: gold ? '#f7931a' : silver ? '#94a3b8' : bronze ? '#c97d36' : '#333',
      }}
    >
      {rank}
    </span>
  );
}

function Row({
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-4 px-4 py-3.5 rounded-lg"
      style={{
        background: isPlayer ? `${accentColor}0d` : index % 2 === 0 ? 'transparent' : '#111111',
        outline:    isPlayer ? `1px solid ${accentColor}30` : 'none',
      }}
    >
      <RankBadge rank={entry.rank} />

      {/* Player */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate" style={{ color: isPlayer ? accentColor : '#fafafa' }}>
            {fmt(entry.player, entry.displayName)}
          </p>
          {isPlayer && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide shrink-0"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              YOU
            </span>
          )}
        </div>
        <p className="text-[#333] text-[10px] font-mono mt-0.5 hidden sm:block truncate">
          {entry.player}
        </p>
      </div>

      {/* Score */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums" style={{ color: tier.color }}>
          {entry.score.toLocaleString()}
        </p>
        <p className="text-[9px] font-semibold tracking-[0.14em]" style={{ color: `${tier.color}70` }}>
          {tier.label}
        </p>
      </div>
    </motion.div>
  );
}

export default function EraLeaderboardPage({
  params,
}: {
  params: Promise<{ 'era-id': string }>;
}) {
  const { 'era-id': eraId } = use(params);
  const era                 = ERAS[eraId as EraId] ?? ERAS['stx-bull-2021'];

  const { address }                      = useWallet();
  const { entries, isLoading, error, refetch } = useLeaderboard(eraId);

  const playerEntry = address ? entries.find((e) => e.player === address) : null;

  function fmt2(ts: number) {
    return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0a0a]">

        {/* Era header */}
        <div className="border-b border-[#1a1a1a] px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Link
                href="/leaderboard"
                className="text-[#444] hover:text-[#666] text-xs transition-colors"
              >
                ← Leaderboard
              </Link>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ color: era.accentColor, borderColor: `${era.accentColor}50` }}
                  >
                    {era.token}
                  </span>
                  <span className="text-[#444] text-xs">
                    {fmt2(era.from)} – {fmt2(era.to)}
                  </span>
                </div>
                <h1 className="text-[#fafafa] text-xl font-semibold">{era.name}</h1>
                <p className="text-[#444] text-xs mt-0.5">{era.description}</p>
              </div>
              <Link
                href={`/play/${eraId}`}
                className="text-xs font-semibold px-4 py-2 rounded-lg shrink-0 transition-colors hover:opacity-90"
                style={{ background: era.accentColor, color: '#0a0a0a' }}
              >
                Play
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* Player rank callout */}
          {playerEntry && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl px-5 py-4 flex items-center justify-between"
              style={{ background: `${era.accentColor}12`, border: `1px solid ${era.accentColor}30` }}
            >
              <div>
                <p className="text-xs font-medium" style={{ color: `${era.accentColor}99` }}>Your rank</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: era.accentColor }}>
                  #{playerEntry.rank}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium" style={{ color: `${era.accentColor}99` }}>Your score</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: era.accentColor }}>
                  {playerEntry.score.toLocaleString()}
                </p>
              </div>
            </motion.div>
          )}

          {/* Table header */}
          {entries.length > 0 && (
            <div className="flex items-center gap-4 px-4 pb-2 mb-1">
              <span className="text-[#333] text-[10px] w-8 text-center">#</span>
              <span className="text-[#333] text-[10px] flex-1">Player</span>
              <span className="text-[#333] text-[10px] text-right">Score</span>
            </div>
          )}

          {/* Rows */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: `${era.accentColor} transparent transparent transparent` }}
              />
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <p className="text-[#555] text-sm mb-2">Couldn&apos;t load leaderboard.</p>
              <button
                onClick={refetch}
                className="text-xs text-[#444] border border-[#2a2a2a] rounded-lg px-4 py-2 hover:border-[#3a3a3a] transition-colors"
              >
                Try again
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[#555] text-sm">No runs yet.</p>
              <p className="text-[#333] text-xs mt-1">Be the first to surf {era.name}.</p>
            </div>
          ) : (
            <div>
              {entries.map((entry, i) => (
                <Row
                  key={entry.runId || entry.player}
                  entry={entry}
                  isPlayer={entry.player === address}
                  accentColor={era.accentColor}
                  index={i}
                />
              ))}
              <p className="text-[#2a2a2a] text-[10px] text-center mt-6">
                Updates every 60s · Source: Stacks blockchain
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
