import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Verify the wallet signed the message with `openSignMessage` (SIP-018).
// Client sends { signature, publicKey } from the openSignMessage callback.
// We verify: (1) publicKey maps to wallet address, (2) signature is valid for the message.
async function verifyProfileSignature(
  wallet:     string,
  publicKey:  string,
  message:    string,
  signature:  string,
): Promise<boolean> {
  try {
    const { publicKeyFromSignatureRsv, getAddressFromPublicKey } = await import('@stacks/transactions');

    // Step 1: public key must derive to the claimed wallet address
    const network: 'mainnet' | 'testnet' = wallet.startsWith('SP') ? 'mainnet' : 'testnet';
    const derivedAddress = getAddressFromPublicKey(publicKey, network);
    if (derivedAddress !== wallet) return false;

    // Step 2: recover public key from signature; try double-sha256 then single-sha256
    // Wallets implement SIP-018: sha256[+sha256] of ("\x17Stacks Signed Message:\n" | varint(len) | msg)
    const prefix   = '\x17Stacks Signed Message:\n';
    const msgBytes = Buffer.from(message);
    const combined = Buffer.concat([Buffer.from(prefix), Buffer.from([msgBytes.length]), msgBytes]);

    for (const useDouble of [true, false]) {
      try {
        const h1 = Buffer.from(await crypto.subtle.digest('SHA-256', combined));
        const hash = useDouble ? Buffer.from(await crypto.subtle.digest('SHA-256', h1)) : h1;
        const recovered = publicKeyFromSignatureRsv(hash.toString('hex'), signature);
        if (recovered === publicKey) return true;
      } catch { /* try next */ }
    }

    return false;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_address, display_name, avatar_url')
    .eq('wallet_address', wallet)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? null });
}

export async function POST(req: NextRequest) {
  let body: { wallet?: string; display_name?: string; avatar_url?: string; signature?: string; publicKey?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { wallet, display_name, avatar_url = '', signature, publicKey } = body;
  if (!wallet || !display_name || !signature || !publicKey) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const message = `wave-profile:${wallet}:${display_name}`;
  const valid   = await verifyProfileSignature(wallet, publicKey, message, signature);
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ wallet_address: wallet, display_name, avatar_url })
    .select('wallet_address, display_name, avatar_url')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
