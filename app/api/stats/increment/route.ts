import { type NextRequest, NextResponse } from 'next/server';
import { redis, REDIS_KEYS } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');

  if (key === 'runs') {
    await redis.incr(REDIS_KEYS.totalRuns);
  } else if (key === 'nfts') {
    await redis.incr(REDIS_KEYS.totalNfts);
  } else {
    return NextResponse.json({ error: 'Unknown key. Use key=runs or key=nfts' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
