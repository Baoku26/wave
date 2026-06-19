'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStacksWallet } from '@baoku26/sbtc-sdk';
import { useWaveBalance } from '@/hooks/useWaveBalance';

const NAV = [
  { href: '/play',        label: 'Play' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/faucet',      label: 'Faucet' },
  { href: '/gallery',     label: 'Gallery' },
] as const;

export function Header() {
  const pathname = usePathname();
  const { address, isLoaded } = useStacksWallet();
  const { raw: waveBalance }  = useWaveBalance();

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#1a1a1a]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

        {/* Wordmark */}
        <Link
          href="/"
          className="text-[#f7931a] text-sm font-bold tracking-[0.18em] shrink-0 hover:text-[#e8841a] transition-colors"
        >
          WAVE
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-5 text-xs font-medium">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:text-[#888]"
                style={{ color: active ? '#fafafa' : '#555' }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Wallet status */}
        <div className="flex items-center gap-3 shrink-0">
          {isLoaded && address ? (
            <>
              {waveBalance !== null && (
                <span className="text-[#f7931a] text-xs tabular-nums font-medium hidden sm:block">
                  {waveBalance.toLocaleString()} WAVE
                </span>
              )}
              <Link
                href="/profile"
                className="text-[#2a2a2a] text-[10px] font-mono hidden md:block hover:text-[#444] transition-colors"
              >
                {address.slice(0, 6)}…{address.slice(-4)}
              </Link>
            </>
          ) : isLoaded ? (
            <Link
              href="/faucet"
              className="text-xs px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[#555] hover:border-[#3a3a3a] hover:text-[#888] transition-colors"
            >
              Get started
            </Link>
          ) : null}
        </div>

      </div>
    </header>
  );
}
