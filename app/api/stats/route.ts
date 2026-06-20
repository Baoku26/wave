import { NextResponse } from 'next/server';
import { redis, REDIS_KEYS } from '@/lib/redis';

export async function GET() {
  const [totalRuns, totalNfts] = await Promise.all([
    redis.get<number>(REDIS_KEYS.totalRuns),
    redis.get<number>(REDIS_KEYS.totalNfts),
  ]);

  return NextResponse.json({
    totalRuns: totalRuns ?? 0,
    totalNfts: totalNfts ?? 0,
  });
}
