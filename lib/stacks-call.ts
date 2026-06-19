import { makeUnsignedContractCall, serializeTransaction, PostConditionMode } from '@stacks/transactions';
import type { ClarityValue } from '@stacks/transactions';

type Network = 'mainnet' | 'testnet';

function getNetwork(): Network {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
}

const DEFAULT_FEE = BigInt(10_000); // µSTX

/**
 * Build, sign, and broadcast a Stacks contract call via server-side API proxies.
 * Bypasses browser→Hiro direct connections that trigger CORS and timeout issues.
 *
 * Returns the txid string on success; throws on any failure.
 */
export async function callContract(
  contract: string,
  fn: string,
  args: ClarityValue[],
  sender: { address: string; publicKey: string },
  signTx: (txBytes: Uint8Array) => Promise<Uint8Array>,
): Promise<string> {
  const dot = contract.indexOf('.');
  if (dot === -1) throw new Error(`Invalid contract id "${contract}" — expected "<address>.<name>"`);
  const contractAddress = contract.slice(0, dot);
  const contractName    = contract.slice(dot + 1);

  // 1. Nonce — fetched server-side to avoid browser rate limits
  const nonceRes = await fetch(`/api/stacks/nonce?address=${encodeURIComponent(sender.address)}`);
  if (!nonceRes.ok) {
    const { error } = await nonceRes.json().catch(() => ({ error: 'nonce fetch failed' })) as { error?: string };
    throw new Error(error ?? 'Could not fetch account nonce');
  }
  const { nonce } = await nonceRes.json() as { nonce: number };

  // 2. Build unsigned transaction
  // PostConditionMode.Allow: WAVE is a game token with no monetary value; burns/mints
  // are defined by trusted contracts, so blanket allow is appropriate here.
  const tx = await makeUnsignedContractCall({
    contractAddress,
    contractName,
    functionName: fn,
    functionArgs: args,
    publicKey: sender.publicKey,
    network: getNetwork(),
    fee: DEFAULT_FEE,
    nonce: BigInt(nonce),
    postConditionMode: PostConditionMode.Allow,
  });

  // 3. Sign with caller-provided signing function (mnemonic key, no extension)
  const unsignedHex  = serializeTransaction(tx);
  const signedBytes  = await signTx(Buffer.from(unsignedHex, 'hex'));
  const signedHex    = Buffer.from(signedBytes).toString('hex');

  // 4. Broadcast — server-side to avoid CORS preflight on octet-stream POST
  const broadcastRes = await fetch('/api/stacks/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: signedHex }),
  });
  if (!broadcastRes.ok) {
    const { error } = await broadcastRes.json().catch(() => ({ error: 'broadcast failed' })) as { error?: string };
    throw new Error(error ?? 'Transaction broadcast failed');
  }
  const { txid } = await broadcastRes.json() as { txid: string };
  return txid;
}
