'use client';

import { request } from '@stacks/connect';
import { serializeCV } from '@stacks/transactions';
import type { ContractIdString, ClarityValue } from '@stacks/transactions';

const NET = (process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet') as 'mainnet' | 'testnet';

/**
 * Opens the connected wallet for the user to sign and broadcast a contract call.
 * Resolves with the txId once the user approves; rejects if they cancel.
 */
export async function callContract(
  contract: string,
  fn: string,
  args: ClarityValue[],
): Promise<string> {
  const result = await request('stx_callContract', {
    contract: contract as ContractIdString,
    functionName:      fn,
    functionArgs:      args.map((cv) => serializeCV(cv)),
    postConditionMode: 'allow',
    network:           NET,
  });
  if (!result.txid) throw new Error('Wallet did not return a transaction ID');
  return result.txid;
}

/**
 * Opens the connected wallet for the user to sign a plain-text message (SIP-018).
 * Resolves with { signature, publicKey } once the user approves.
 */
export async function signMessage(message: string): Promise<{ signature: string; publicKey: string }> {
  const result = await request('stx_signMessage', { message });
  return { signature: result.signature, publicKey: result.publicKey };
}
