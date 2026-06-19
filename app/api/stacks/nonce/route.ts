import { NextRequest, NextResponse } from 'next/server';

function hiroBase() {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';
}

function hiroHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json', ...extra };
  const apiKey = process.env.HIRO_API_KEY;
  if (apiKey) headers['x-api-key'] = apiKey;
  return headers;
}

// Server-side proxy for nonce fetch — avoids browser CORS / rate-limit issues.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });

  try {
    const res = await fetch(
      `${hiroBase()}/v2/accounts/${address}?proof=0`,
      { headers: hiroHeaders(), cache: 'no-store' },
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Hiro API ${res.status}` }, { status: 502 });
    }
    const data = await res.json() as { nonce: number };
    return NextResponse.json({ nonce: data.nonce ?? 0 });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 503 });
  }
}
