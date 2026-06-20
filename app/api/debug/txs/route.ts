import { type NextRequest, NextResponse } from 'next/server';
import { getContracts } from '@/lib/contracts';

function hiroBase() {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';
}

function hiroHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (process.env.HIRO_API_KEY) h['x-api-key'] = process.env.HIRO_API_KEY;
  return h;
}

// GET /api/debug/txs?address=ST...
// Returns recent wave-game contract calls for a given wallet address.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Pass ?address=ST... (your connected wallet address)' }, { status: 400 });
  }

  const contracts = getContracts();
  const waveGame  = contracts.waveGame;

  try {
    const res = await fetch(
      `${hiroBase()}/extended/v1/address/${encodeURIComponent(address)}/transactions?limit=20&offset=0`,
      { headers: hiroHeaders(), cache: 'no-store' },
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Hiro ${res.status}`, url: `${hiroBase()}/extended/v1/address/${address}/transactions` }, { status: 502 });
    }
    const data = await res.json() as {
      total?: number;
      results?: Array<{
        tx_id: string;
        tx_type: string;
        tx_status: string;
        block_height?: number;
        contract_call?: { contract_id: string; function_name: string };
        tx_result?: { hex: string; repr: string };
        error?: string;
      }>;
    };

    const gameTxs = (data.results ?? [])
      .filter((tx) => tx.tx_type === 'contract_call' && tx.contract_call?.contract_id === waveGame)
      .map((tx) => ({
        txid:         tx.tx_id,
        fn:           tx.contract_call?.function_name,
        status:       tx.tx_status,
        block_height: tx.block_height,
        result_repr:  tx.tx_result?.repr,
        result_hex:   tx.tx_result?.hex,
        error:        tx.error,
      }));

    return NextResponse.json({
      network:        process.env.NEXT_PUBLIC_NETWORK ?? 'testnet',
      contract:       waveGame,
      address,
      total_returned: data.results?.length ?? 0,
      game_txs:       gameTxs,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
