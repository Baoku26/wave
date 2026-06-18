import Link from 'next/link';
import { ERA_LIST } from '@/lib/eras';

function fmt(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Pick a chart',
    body: 'Choose from six curated Stacks moments — bull runs, crashes, launches.',
  },
  {
    step: '02',
    title: 'Surf the wave',
    body: 'Ride the price action. Jump wicks, string tricks, survive to the close.',
  },
  {
    step: '03',
    title: 'Own the moment',
    body: 'Mint your best run as an NFT on Bitcoin via Stacks. The chart is yours.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 overflow-hidden">

        {/* Background chart decoration */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center opacity-[0.06]" aria-hidden>
          <svg viewBox="0 0 1280 400" className="w-full" preserveAspectRatio="xMidYMax meet">
            <defs>
              <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f7931a" stopOpacity="1"/>
                <stop offset="100%" stopColor="#f7931a" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polyline
              points="0,340 80,310 160,290 240,260 320,200 400,230 480,150 560,180 640,100 720,130 800,80 880,110 960,60 1040,90 1120,50 1200,70 1280,40"
              fill="none" stroke="#f7931a" strokeWidth="2"
            />
            <polygon
              points="0,340 80,310 160,290 240,260 320,200 400,230 480,150 560,180 640,100 720,130 800,80 880,110 960,60 1040,90 1120,50 1200,70 1280,40 1280,400 0,400"
              fill="url(#hero-fill)"
            />
          </svg>
        </div>

        {/* Token badges */}
        <div className="flex items-center gap-2 mb-8">
          {['STX', 'sBTC', 'ALEX'].map((t, i) => (
            <span
              key={t}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
              style={{
                color:       ['#3b82f6','#f7931a','#8b5cf6'][i],
                borderColor: ['#3b82f620','#f7931a20','#8b5cf620'][i],
                background:  ['#3b82f610','#f7931a10','#8b5cf610'][i],
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-none max-w-2xl" style={{ textWrap: 'balance' } as React.CSSProperties}>
          Ride the chart.{' '}
          <span className="text-[#f7931a]">Own the moment.</span>
        </h1>

        <p className="mt-6 text-[#555] text-lg max-w-md leading-relaxed" style={{ textWrap: 'pretty' } as React.CSSProperties}>
          Surf historic Stacks price action. String tricks. Mint your best run as an NFT on Bitcoin.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/play"
            className="px-7 py-3 rounded-xl bg-[#f7931a] text-[#0a0a0a] text-sm font-semibold hover:bg-[#e8841a] transition-colors"
          >
            Pick a Chart
          </Link>
          <span className="text-[#333] text-xs">No wallet required to play</span>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(({ step, title, body }) => (
            <div key={step} className="flex flex-col gap-3">
              <span className="text-[#2a2a2a] text-4xl font-bold tabular-nums select-none">{step}</span>
              <h2 className="text-[#fafafa] text-base font-semibold">{title}</h2>
              <p className="text-[#555] text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Era cards ── */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="border-t border-[#1a1a1a] pt-12 mb-8 flex items-center justify-between">
          <h2 className="text-[#fafafa] text-sm font-semibold">Six charts. Six stories.</h2>
          <Link href="/play" className="text-[#444] hover:text-[#666] text-xs transition-colors">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ERA_LIST.map((era) => (
            <Link key={era.id} href={`/play/${era.id}`} className="group">
              <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 flex flex-col gap-3 hover:border-[#252525] hover:bg-[#131313] transition-all duration-200">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ color: era.accentColor, background: `${era.accentColor}18` }}
                  >
                    {era.token}
                  </span>
                </div>
                <div>
                  <p className="text-[#e0e0e0] text-xs font-medium">{era.name}</p>
                  <p className="text-[#333] text-[10px] mt-0.5 tabular-nums">{fmt(era.from)} – {fmt(era.to)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1a1a1a] px-6 py-8 flex items-center justify-between max-w-5xl mx-auto">
        <span className="text-[#2a2a2a] text-xs font-semibold tracking-widest">WAVE</span>
        <span className="text-[#2a2a2a] text-xs">Built on Stacks · Secured by Bitcoin</span>
      </footer>

    </main>
  );
}
