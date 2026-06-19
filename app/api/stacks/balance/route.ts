import { NextRequest, NextResponse } from 'next/server';

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

interface HiroBalances {
  fungible_tokens: Record<string, { balance: string }>;
}

// GET /api/stacks/balance?address=ST...&asset=ST....wave-token::wave-token
// Returns { raw: "500000000" } — string to avoid JSON bigint loss
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  const asset   = req.nextUrl.searchParams.get('asset');

  if (!address || !asset) {
    return NextResponse.json({ error: 'Missing address or asset' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${hiroBase()}/extended/v1/address/${encodeURIComponent(address)}/balances`,
      { headers: hiroHeaders(), cache: 'no-store' },
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Hiro ${res.status}` }, { status: 502 });
    }

    const data = await res.json() as HiroBalances;
    const raw = data.fungible_tokens?.[asset]?.balance ?? '0';
    return NextResponse.json({ raw });
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 503 });
  }
}
