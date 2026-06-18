import Link from 'next/link';
import { ERA_LIST } from '@/lib/eras';

const DIFFICULTY: Record<string, { label: string; color: string }> = {
  easy:   { label: 'BEGINNER',     color: '#22c55e' },
  medium: { label: 'INTERMEDIATE', color: '#f7931a' },
  hard:   { label: 'EXPERT',       color: '#ef4444' },
};

function fmt(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-[#444] hover:text-[#666] text-sm transition-colors">
            ← WAVE
          </Link>
          <h1 className="text-2xl font-semibold text-[#fafafa] mt-6">Pick a chart.</h1>
          <p className="text-[#555] text-sm mt-1">Six historic Stacks moments. One run each.</p>
        </div>

        {/* Era grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ERA_LIST.map((era) => {
            const diff = DIFFICULTY[era.difficulty] ?? DIFFICULTY.medium;
            return (
              <Link key={era.id} href={`/play/${era.id}`} className="group block">
                <div className="relative h-full bg-[#111] border border-[#1e1e1e] rounded-xl p-5 flex flex-col gap-4 transition-all duration-200 group-hover:border-[#2a2a2a] group-hover:bg-[#141414]">

                  {/* Token + difficulty */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{ color: era.accentColor, borderColor: `${era.accentColor}40`, background: `${era.accentColor}12` }}
                    >
                      {era.token}
                    </span>
                    <span
                      className="text-[10px] font-medium tracking-wide"
                      style={{ color: diff.color }}
                    >
                      {diff.label}
                    </span>
                  </div>

                  {/* Chart sparkline decoration */}
                  <div className="h-10 relative overflow-hidden opacity-30 group-hover:opacity-50 transition-opacity">
                    <svg viewBox="0 0 200 40" className="w-full h-full" preserveAspectRatio="none">
                      {era.difficulty === 'hard' ? (
                        <polyline points="0,30 30,25 50,35 70,10 90,28 110,5 140,20 170,8 200,15"
                          fill="none" stroke={era.accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      ) : era.difficulty === 'easy' ? (
                        <polyline points="0,32 40,28 80,22 120,18 160,12 200,8"
                          fill="none" stroke={era.accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      ) : (
                        <polyline points="0,28 30,22 60,26 90,14 120,18 150,10 180,16 200,12"
                          fill="none" stroke={era.accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      )}
                    </svg>
                  </div>

                  {/* Name + description */}
                  <div className="flex-1">
                    <h2 className="text-[#fafafa] text-sm font-semibold">{era.name}</h2>
                    <p className="text-[#555] text-xs mt-1 leading-relaxed">{era.description}</p>
                  </div>

                  {/* Date range */}
                  <p className="text-[#333] text-[10px] tabular-nums">
                    {fmt(era.from)} – {fmt(era.to)}
                  </p>

                  {/* Hover arrow */}
                  <div
                    className="absolute right-4 bottom-4 text-[#333] group-hover:text-[#555] transition-colors text-xs"
                    aria-hidden
                  >
                    →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
