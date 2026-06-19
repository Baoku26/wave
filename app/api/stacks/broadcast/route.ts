import { NextRequest, NextResponse } from 'next/server';

function hiroBase() {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';
}

function hiroHeaders(extra: Record<string, string>): Record<string, string> {
  const headers = { ...extra };
  const apiKey = process.env.HIRO_API_KEY;
  if (apiKey) (headers as Record<string, string>)['x-api-key'] = apiKey;
  return headers;
}

// Server-side proxy for TX broadcast — avoids CORS preflight on octet-stream POST.
export async function POST(req: NextRequest) {
  let body: { tx?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { tx } = body;
  if (!tx) return NextResponse.json({ error: 'Missing tx hex' }, { status: 400 });

  let txBuffer: ArrayBuffer;
  try {
    const buf = Buffer.from(tx, 'hex');
    txBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  catch { return NextResponse.json({ error: 'Invalid tx hex' }, { status: 400 }); }

  try {
    const res = await fetch(`${hiroBase()}/v2/transactions`, {
      method: 'POST',
      headers: hiroHeaders({ 'Content-Type': 'application/octet-stream' }),
      body: txBuffer,
    });
    const text = (await res.text()).trim();
    if (!res.ok) {
      return NextResponse.json({ error: text }, { status: 502 });
    }
    // Hiro returns the txid as a quoted JSON string: "\"0xabc...\""
    const txid = text.replace(/^"|"$/g, '');
    return NextResponse.json({ txid });
  } catch (e) {
    return NextResponse.json({ error: 'Broadcast failed' }, { status: 503 });
  }
}
