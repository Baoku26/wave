import { NextRequest, NextResponse } from 'next/server';
import { ERAS, type EraId } from '@/lib/eras';
import { FALLBACK_CANDLES } from '@/lib/fallback-candles';

export const revalidate = 86400;

interface CoinGeckoPrice {
  prices: [number, number][];
}

interface OHLCCandle {
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  normalised: number;
}

const COINGECKO_IDS: Record<string, string> = {
  STX: 'blockstack',
  sBTC: 'bitcoin',
  ALEX: 'alexgo',
};

async function fetchPriceRange(
  coinId: string,
  from: number,
  to: number,
): Promise<[number, number][]> {
  const proKey  = process.env.COINGECKO_API_KEY;
  const demoKey = process.env.COINGECKO_DEMO_API_KEY;

  const base = proKey
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';

  const url = `${base}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (proKey)  headers['x-cg-pro-api-key']  = proKey;
  if (demoKey) headers['x-cg-demo-api-key'] = demoKey;

  const res = await fetch(url, { headers, next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`CoinGecko error ${res.status} for ${coinId}`);
  }
  const data = (await res.json()) as CoinGeckoPrice;
  return data.prices;
}

function pricesToDailyOHLC(prices: [number, number][]): Omit<OHLCCandle, 'normalised'>[] {
  const byDay = new Map<number, number[]>();

  for (const [tsMs, price] of prices) {
    const dayKey = Math.floor(tsMs / 86_400_000) * 86_400;
    const bucket = byDay.get(dayKey);
    if (bucket) {
      bucket.push(price);
    } else {
      byDay.set(dayKey, [price]);
    }
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a - b)
    .map(([date, ps]) => ({
      date,
      open: ps[0],
      high: Math.max(...ps),
      low: Math.min(...ps),
      close: ps[ps.length - 1],
    }));
}

function normalise(candles: Omit<OHLCCandle, 'normalised'>[]): OHLCCandle[] {
  const allPrices = candles.flatMap((c) => [c.open, c.high, c.low, c.close]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;

  return candles.map((c) => ({
    ...c,
    normalised: (c.close - min) / range,
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eraId = searchParams.get('era') as EraId | null;

  if (!eraId || !(eraId in ERAS)) {
    return NextResponse.json({ error: 'Unknown era' }, { status: 400 });
  }

  const era = ERAS[eraId];
  const coinId = COINGECKO_IDS[era.token];

  if (!coinId) {
    return NextResponse.json({ error: `No CoinGecko ID for ${era.token}` }, { status: 400 });
  }

  try {
    const rawPrices = await fetchPriceRange(coinId, era.from, era.to);
    const dailyCandles = pricesToDailyOHLC(rawPrices);
    const candles = normalise(dailyCandles);
    return NextResponse.json({ eraId, candles }, { status: 200 });
  } catch {
    // CoinGecko unavailable — serve hard-coded fallback so the game always works.
    const fallback = FALLBACK_CANDLES[eraId];
    if (fallback) {
      const candles = normalise(fallback);
      return NextResponse.json({ eraId, candles, isFallback: true }, { status: 200 });
    }
    return NextResponse.json({ error: 'Chart data unavailable' }, { status: 502 });
  }
}
