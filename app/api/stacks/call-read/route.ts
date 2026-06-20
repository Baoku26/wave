import { type NextRequest, NextResponse } from 'next/server';

function hiroBase() {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';
}

function hiroHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const apiKey = process.env.HIRO_API_KEY;
  if (apiKey) headers['x-api-key'] = apiKey;
  return headers;
}

// POST /api/stacks/call-read
// Body: { contract: "ST....name", fn: "function-name", sender: "ST...", args: ["0x..."] }
// Proxies Hiro call-read-only with the server-side API key.
export async function POST(req: NextRequest) {
  let body: { contract?: string; fn?: string; sender?: string; args?: string[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { contract, fn, sender, args = [] } = body;
  if (!contract || !fn || !sender) {
    return NextResponse.json({ error: 'Missing contract, fn, or sender' }, { status: 400 });
  }

  const dot = contract.indexOf('.');
  if (dot === -1) return NextResponse.json({ error: 'Invalid contract format' }, { status: 400 });
  const principal    = contract.slice(0, dot);
  const contractName = contract.slice(dot + 1);

  try {
    const res = await fetch(
      `${hiroBase()}/v2/contracts/call-read/${principal}/${contractName}/${fn}`,
      {
        method: 'POST',
        headers: hiroHeaders(),
        body: JSON.stringify({ sender, arguments: args }),
        cache: 'no-store',
      },
    );
    if (!res.ok) return NextResponse.json({ error: `Hiro ${res.status}` }, { status: 502 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 503 });
  }
}
