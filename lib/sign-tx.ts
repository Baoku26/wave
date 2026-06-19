import { generateWallet } from '@stacks/wallet-sdk';
import { deserializeTransaction, serializeTransaction, TransactionSigner } from '@stacks/transactions';

// Signs a Stacks unsigned transaction using the player's mnemonic private key,
// bypassing browser extension requirement. Safe for testnet game flows.
export async function mnemonicSignTx(mnemonic: string, txBytes: Uint8Array): Promise<Uint8Array> {
  const wallet = await generateWallet({ secretKey: mnemonic, password: '' });
  const { stxPrivateKey } = wallet.accounts[0];
  const tx = deserializeTransaction(txBytes);
  const signer = new TransactionSigner(tx);
  signer.signOrigin(stxPrivateKey);
  const signedHex = serializeTransaction(signer.getTxInComplete());
  return Buffer.from(signedHex, 'hex');
}
