import { Cl, serializeCV, signMessageHashRsv } from '@stacks/transactions';
import { generateWallet } from '@stacks/wallet-sdk';

// Build the exact msg-hash the wave-game.clar submit-score function verifies.
//
// msg-hash = sha256(run-id(32) || to-consensus-buff?(score)(17) || tricks-hash(32))
// tricks-hash = fold sha256 over tricks starting from 0x00...0
// Each trick: acc = sha256(concat(acc, to-consensus-buff?(trick)))

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// SHA-256 via Web Crypto, using an explicit ArrayBuffer copy to satisfy strict TS.
async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const buf = new ArrayBuffer(data.length);
  new Uint8Array(buf).set(data);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  return bytesToHex(await sha256Bytes(data));
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const buf = new ArrayBuffer(total);
  const out = new Uint8Array(buf);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

export async function buildMsgHash(
  runId: Uint8Array,   // 32 bytes
  score: number,
  tricks: string[],
): Promise<string> {
  // tricks-hash: fold sha256, starting accumulator is 32 zero bytes
  let tricksHashHex = '0'.repeat(64);
  for (const trick of tricks) {
    const trickBuff = hexToBytes(serializeCV(Cl.stringAscii(trick as Parameters<typeof Cl.stringAscii>[0])));
    const combined = concatBytes(hexToBytes(tricksHashHex), trickBuff);
    tricksHashHex = await sha256Hex(combined);
  }

  const scoreBuff = hexToBytes(serializeCV(Cl.uint(BigInt(score))));
  const msgData = concatBytes(runId, scoreBuff, hexToBytes(tricksHashHex));
  return sha256Hex(msgData);
}

// Sign a score payload with the player's wallet. Returns a 65-byte RSV signature as Uint8Array.
//
// Security note: exportMnemonic() is auth-gated (WebAuthn / passphrase) and the
// derived key lives only briefly in memory. For mainnet, a hardware-wallet raw
// signing API is preferred once Leather/Xverse expose one.
export async function signScore(
  mnemonic: string,
  runId: Uint8Array,
  score: number,
  tricks: string[],
): Promise<Uint8Array> {
  const msgHashHex = await buildMsgHash(runId, score, tricks);

  const wallet = await generateWallet({ secretKey: mnemonic, password: '' });
  const { stxPrivateKey } = wallet.accounts[0];

  const sigHex = signMessageHashRsv({ messageHash: msgHashHex, privateKey: stxPrivateKey });
  return hexToBytes(sigHex);
}
