import { Redis } from '@upstash/redis';

// Singleton Redis client. Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
export const redis = Redis.fromEnv();

// Redis key constants — never construct these inline
export const REDIS_KEYS = {
  totalRuns: 'stats:total-runs',
  totalNfts: 'stats:total-nfts',
  leaderboard: (eraId: string) => `leaderboard:${eraId}`,
} as const;
