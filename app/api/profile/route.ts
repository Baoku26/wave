import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Verify the wallet signed `wave-profile:<wallet>:<display_name>` via sha256 + secp256k1.
// Matches the signing logic in hooks/useProfile.ts.
async function verifyProfileSignature(
  wallet: string,
  displayName: string,
  signatureHex: string,
): Promise<boolean> {
  try {
    const { publicKeyFromSignatureRsv, getAddressFromPublicKey } = await import('@stacks/transactions');

    const message = `wave-profile:${wallet}:${displayName}`;
    const msgBytes = new TextEncoder().encode(message);
    const hashBuf = await crypto.subtle.digest('SHA-256', msgBytes);
    const msgHashHex = Buffer.from(hashBuf).toString('hex');

    const recoveredPubKey = publicKeyFromSignatureRsv(msgHashHex, signatureHex);
    const network = wallet.startsWith('SP') ? 'mainnet' : 'testnet';
    const recoveredAddress = getAddressFromPublicKey(recoveredPubKey, network);

    return recoveredAddress === wallet;
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
  let body: { wallet?: string; display_name?: string; avatar_url?: string; signature?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { wallet, display_name, avatar_url = '', signature } = body;
  if (!wallet || !display_name || !signature) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const valid = await verifyProfileSignature(wallet, display_name, signature);
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
