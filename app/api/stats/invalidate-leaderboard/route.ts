import { type NextRequest, NextResponse } from 'next/server';
import { redis, REDIS_KEYS } from '@/lib/redis';
import { ERAS, type EraId } from '@/lib/eras';

export async function POST(req: NextRequest) {
  const eraId = req.nextUrl.searchParams.get('era');

  if (!eraId || !(eraId in ERAS)) {
    return NextResponse.json({ error: 'Missing or unknown era' }, { status: 400 });
  }

  await redis.del(REDIS_KEYS.leaderboard(eraId as EraId));
  return NextResponse.json({ ok: true });
}
