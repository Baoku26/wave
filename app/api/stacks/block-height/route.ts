import { NextResponse } from 'next/server';

function hiroBase() {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';
}

function hiroHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const apiKey = process.env.HIRO_API_KEY;
  if (apiKey) headers['x-api-key'] = apiKey;
  return headers;
}

// GET /api/stacks/block-height — returns { height: number }
export async function GET() {
  try {
    const res = await fetch(`${hiroBase()}/v2/info`, {
      headers: hiroHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: `Hiro ${res.status}` }, { status: 502 });
    const data = await res.json() as { stacks_tip_height: number };
    return NextResponse.json({ height: data.stacks_tip_height });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 503 });
  }
}
