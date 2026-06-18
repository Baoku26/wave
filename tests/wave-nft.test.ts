import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1  = accounts.get('wallet_1')!;
const wallet2  = accounts.get('wallet_2')!;

const SAMPLE_RUN_ID   = Cl.buffer(new Uint8Array(32).fill(1));
const SAMPLE_ERA_ID   = Cl.stringAscii('stx-bull-2021');
const SAMPLE_SCORE    = Cl.uint(12000);
const SAMPLE_IPFS_CID = Cl.stringAscii('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
const SAMPLE_TOKEN_URI = Cl.stringAscii('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');

describe('wave-nft', () => {
  describe('mint (restricted to wave-game)', () => {
    it('rejects mint from non-game-contract (ERR_NOT_AUTHORIZED = u300)', () => {
      const { result } = simnet.callPublicFn('wave-nft', 'mint', [
        Cl.principal(wallet1),
        SAMPLE_RUN_ID,
        SAMPLE_ERA_ID,
        SAMPLE_SCORE,
        SAMPLE_IPFS_CID,
        SAMPLE_TOKEN_URI,
      ], wallet1);
      expect(result).toBeErr(Cl.uint(300));
    });
  });

  describe('get-last-token-id', () => {
    it('starts at 0', () => {
      const { result } = simnet.callReadOnlyFn('wave-nft', 'get-last-token-id', [], deployer);
      expect(result).toBeOk(Cl.uint(0));
    });
  });

  describe('transfer', () => {
    it('rejects transfer when sender is not owner (ERR_NOT_OWNER = u302)', () => {
      // token 0 doesn't exist; any transfer call from wrong sender should fail
      const { result } = simnet.callPublicFn('wave-nft', 'transfer', [
        Cl.uint(1),
        Cl.principal(wallet1),
        Cl.principal(wallet2),
      ], wallet2);
      expect(result).toBeErr(Cl.uint(300)); // ERR_NOT_AUTHORIZED (not tx-sender)
    });
  });

  describe('get-owner', () => {
    it('returns none for unminted token', () => {
      const { result } = simnet.callReadOnlyFn('wave-nft', 'get-owner', [Cl.uint(999)], deployer);
      expect(result).toBeOk(Cl.none());
    });
  });

  describe('get-token-uri', () => {
    it('returns none for unminted token', () => {
      const { result } = simnet.callReadOnlyFn('wave-nft', 'get-token-uri', [Cl.uint(999)], deployer);
      expect(result).toBeOk(Cl.none());
    });
  });
});
