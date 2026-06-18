import { describe, it, expect, beforeEach } from 'vitest';
import { Cl, cvToValue } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1  = accounts.get('wallet_1')!;
const wallet2  = accounts.get('wallet_2')!;

describe('wave-token', () => {
  describe('SIP-010 interface', () => {
    it('get-name returns WAVE', () => {
      const { result } = simnet.callReadOnlyFn('wave-token', 'get-name', [], deployer);
      expect(result).toBeOk(Cl.stringAscii('WAVE'));
    });

    it('get-symbol returns WAVE', () => {
      const { result } = simnet.callReadOnlyFn('wave-token', 'get-symbol', [], deployer);
      expect(result).toBeOk(Cl.stringAscii('WAVE'));
    });

    it('get-decimals returns 6', () => {
      const { result } = simnet.callReadOnlyFn('wave-token', 'get-decimals', [], deployer);
      expect(result).toBeOk(Cl.uint(6));
    });

    it('get-balance returns 0 for new wallet', () => {
      const { result } = simnet.callReadOnlyFn('wave-token', 'get-balance', [Cl.principal(wallet1)], deployer);
      expect(result).toBeOk(Cl.uint(0));
    });
  });

  describe('claim-daily (faucet)', () => {
    it('mints 500 WAVE to caller on first claim', () => {
      const { result } = simnet.callPublicFn('wave-token', 'claim-daily', [], wallet1);
      expect(result).toBeOk(Cl.uint(500_000_000));

      const { result: balance } = simnet.callReadOnlyFn('wave-token', 'get-balance', [Cl.principal(wallet1)], wallet1);
      expect(balance).toBeOk(Cl.uint(500_000_000));
    });

    it('records a non-zero last-claim block after claiming', () => {
      simnet.callPublicFn('wave-token', 'claim-daily', [], wallet1);
      const { result } = simnet.callReadOnlyFn('wave-token', 'get-last-claim', [Cl.principal(wallet1)], wallet1);
      // Just assert it was recorded (> 0); simnet block height increments per tx
      const val = cvToValue(result, true) as { value: bigint };
      expect(Number(val.value)).toBeGreaterThan(0);
    });

    it('rejects second claim within 144 blocks (ERR_FAUCET_TOO_SOON = u101)', () => {
      simnet.callPublicFn('wave-token', 'claim-daily', [], wallet1);
      const { result } = simnet.callPublicFn('wave-token', 'claim-daily', [], wallet1);
      expect(result).toBeErr(Cl.uint(101));
    });

    it('allows claim again after 144 blocks', () => {
      simnet.callPublicFn('wave-token', 'claim-daily', [], wallet1);
      simnet.mineEmptyBlocks(144);
      const { result } = simnet.callPublicFn('wave-token', 'claim-daily', [], wallet1);
      expect(result).toBeOk(Cl.uint(500_000_000));
    });
  });

  describe('transfer', () => {
    beforeEach(() => {
      simnet.callPublicFn('wave-token', 'claim-daily', [], wallet1);
    });

    it('transfers WAVE between wallets', () => {
      const { result } = simnet.callPublicFn('wave-token', 'transfer', [
        Cl.uint(100_000_000),
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.none(),
      ], wallet1);
      expect(result).toBeOk(Cl.bool(true));

      const { result: b1 } = simnet.callReadOnlyFn('wave-token', 'get-balance', [Cl.principal(wallet1)], wallet1);
      const { result: b2 } = simnet.callReadOnlyFn('wave-token', 'get-balance', [Cl.principal(wallet2)], wallet1);
      expect(b1).toBeOk(Cl.uint(400_000_000));
      expect(b2).toBeOk(Cl.uint(100_000_000));
    });

    it('rejects transfer when sender is not tx-sender (ERR_NOT_AUTHORIZED = u100)', () => {
      const { result } = simnet.callPublicFn('wave-token', 'transfer', [
        Cl.uint(100_000_000),
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.none(),
      ], wallet2); // wallet2 trying to spend wallet1's WAVE
      expect(result).toBeErr(Cl.uint(100));
    });
  });

  describe('burn (restricted)', () => {
    it('rejects burn from non-game-contract (ERR_NOT_AUTHORIZED = u100)', () => {
      simnet.callPublicFn('wave-token', 'claim-daily', [], wallet1);
      const { result } = simnet.callPublicFn('wave-token', 'burn', [
        Cl.uint(50_000_000),
        Cl.principal(wallet1),
      ], wallet1);
      expect(result).toBeErr(Cl.uint(100));
    });
  });

  describe('mint-reward (restricted)', () => {
    it('rejects mint-reward from non-game-contract (ERR_NOT_AUTHORIZED = u100)', () => {
      const { result } = simnet.callPublicFn('wave-token', 'mint-reward', [
        Cl.uint(100_000_000),
        Cl.principal(wallet1),
      ], wallet1);
      expect(result).toBeErr(Cl.uint(100));
    });
  });
});
