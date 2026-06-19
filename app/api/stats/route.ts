import { NextRequest, NextResponse } from 'next/server';
import { redis, REDIS_KEYS } from '@/lib/redis';

export async function GET() {
  const [totalRuns, totalNfts] = await Promise.all([
    redis.get<number>(REDIS_KEYS.totalRuns),
    redis.get<number>(REDIS_KEYS.totalNfts),
  ]);

  return NextResponse.json({
    totalRuns:  totalRuns  ?? 0,
    totalNfts:  totalNfts  ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const url = req.nextUrl;

  // POST /api/stats/increment?key=runs|nfts — increment a counter
  if (url.pathname.endsWith('/increment')) {
    const key = url.searchParams.get('key');
    if (key === 'runs') {
      await redis.incr(REDIS_KEYS.totalRuns);
    } else if (key === 'nfts') {
      await redis.incr(REDIS_KEYS.totalNfts);
    } else {
      return NextResponse.json({ error: 'Unknown key' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  // POST /api/stats/invalidate-leaderboard?era=<eraId>
  if (url.pathname.endsWith('/invalidate-leaderboard')) {
    const eraId = url.searchParams.get('era');
    if (!eraId) return NextResponse.json({ error: 'Missing era' }, { status: 400 });
    await redis.del(REDIS_KEYS.leaderboard(eraId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
