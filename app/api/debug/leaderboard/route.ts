import { type NextRequest, NextResponse } from 'next/server';
import { Cl, serializeCV, deserializeCV, ClarityType, cvToJSON } from '@stacks/transactions';
import { ERAS, type EraId } from '@/lib/eras';
import { getContracts } from '@/lib/contracts';

function hiroBase() {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';
}

function hiroHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.HIRO_API_KEY) h['x-api-key'] = process.env.HIRO_API_KEY;
  return h;
}

// GET /api/debug/leaderboard?era=stx-bull-2021
export async function GET(req: NextRequest) {
  const eraId = req.nextUrl.searchParams.get('era') ?? 'stx-bull-2021';
  const era = ERAS[eraId as EraId];
  if (!era) return NextResponse.json({ error: 'Unknown era' }, { status: 400 });

  const contracts = getContracts();
  const [principal, contractName] = contracts.waveGame.split('.');
  const tokenId = era.token.toLowerCase();

  const args = [
    '0x' + serializeCV(Cl.stringAscii(tokenId as Parameters<typeof Cl.stringAscii>[0])),
    '0x' + serializeCV(Cl.stringAscii(eraId   as Parameters<typeof Cl.stringAscii>[0])),
  ];

  const url = `${hiroBase()}/v2/contracts/call-read/${principal}/${contractName}/get-leaderboard`;

  let hiroStatus: number;
  let hiroBody: unknown;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: hiroHeaders(),
      body: JSON.stringify({ sender: principal, arguments: args }),
      cache: 'no-store',
    });
    hiroStatus = res.status;
    hiroBody   = await res.json();
  } catch (e) {
    return NextResponse.json({ error: 'Hiro fetch failed', detail: String(e) }, { status: 502 });
  }

  let parsed: unknown = null;
  let parseError: string | null = null;
  try {
    const body = hiroBody as { okay?: boolean; result?: string };
    if (body.okay && body.result) {
      const cv = deserializeCV(body.result.startsWith('0x') ? body.result.slice(2) : body.result);
      parsed = cvToJSON(cv);
    }
  } catch (e) {
    parseError = String(e);
  }

  return NextResponse.json({
    network:     process.env.NEXT_PUBLIC_NETWORK ?? 'testnet',
    contract:    contracts.waveGame,
    tokenId,
    eraId,
    args,
    hiroUrl:     url,
    hiroStatus,
    hiroBody,
    parsed,
    parseError,
  });
}
