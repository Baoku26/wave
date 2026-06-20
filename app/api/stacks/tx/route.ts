import { type NextRequest, NextResponse } from 'next/server';

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

// GET /api/stacks/tx?txid=<txid>
// Proxies Hiro extended TX endpoint so HIRO_API_KEY is injected server-side.
export async function GET(req: NextRequest) {
  const txid = req.nextUrl.searchParams.get('txid');
  if (!txid) return NextResponse.json({ error: 'Missing txid' }, { status: 400 });

  try {
    const res = await fetch(
      `${hiroBase()}/extended/v1/tx/${encodeURIComponent(txid)}`,
      { headers: hiroHeaders(), cache: 'no-store' },
    );
    if (!res.ok) return NextResponse.json({ error: `Hiro ${res.status}` }, { status: 502 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 503 });
  }
}
