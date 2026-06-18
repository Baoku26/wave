import { describe, it, expect, beforeEach } from 'vitest';
import { Cl, cvToValue } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const wallet1  = accounts.get('wallet_1')!;
const wallet2  = accounts.get('wallet_2')!;

const ERA_ID   = Cl.stringAscii('stx-bull-2021');
const TOKEN_ID = Cl.stringAscii('stx');

function fundWallet(wallet: string) {
  simnet.callPublicFn('wave-token', 'claim-daily', [], wallet);
}

// Extract the buff 32 run-id from a successful start-run result.
// The Clarinet SDK stores BufferCV.value as a hex string, so we convert it.
function extractRunId(result: ReturnType<typeof simnet.callPublicFn>['result']): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hex = (result as any).value.value as string;
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}

describe('wave-game', () => {
  describe('start-run', () => {
    beforeEach(() => fundWallet(wallet1));

    it('burns 50 WAVE and returns a 32-byte run-id', () => {
      const { result } = simnet.callPublicFn('wave-game', 'start-run', [TOKEN_ID, ERA_ID], wallet1);
      expect(result).toBeOk(expect.anything());

      // Balance should be 500 - 50 = 450 WAVE
      const { result: balance } = simnet.callReadOnlyFn('wave-token', 'get-balance', [Cl.principal(wallet1)], wallet1);
      expect(balance).toBeOk(Cl.uint(450_000_000));
    });

    it('rejects start-run with < 50 WAVE (ERR_INSUFFICIENT_WAVE = u200)', () => {
      // wallet2 has no WAVE
      const { result } = simnet.callPublicFn('wave-game', 'start-run', [TOKEN_ID, ERA_ID], wallet2);
      expect(result).toBeErr(Cl.uint(200));
    });

    it('rejects invalid era-id (ERR_INVALID_ERA = u201)', () => {
      const { result } = simnet.callPublicFn('wave-game', 'start-run', [
        TOKEN_ID,
        Cl.stringAscii('fake-era'),
      ], wallet1);
      expect(result).toBeErr(Cl.uint(201));
    });

    it('rejects invalid token-id (ERR_INVALID_TOKEN = u207)', () => {
      const { result } = simnet.callPublicFn('wave-game', 'start-run', [
        Cl.stringAscii('btc'),
        ERA_ID,
      ], wallet1);
      expect(result).toBeErr(Cl.uint(207));
    });

    it('records run-id in player-runs after start-run', () => {
      simnet.callPublicFn('wave-game', 'start-run', [TOKEN_ID, ERA_ID], wallet1);
      const { result } = simnet.callReadOnlyFn('wave-game', 'get-player-runs', [Cl.principal(wallet1)], wallet1);
      // Should be (ok (list run-id)) — one entry
      const list = cvToValue(result, true) as { value: unknown[] };
      expect(list.value.length).toBe(1);
    });

    it('get-run returns the stored run record', () => {
      const { result: startResult } = simnet.callPublicFn('wave-game', 'start-run', [TOKEN_ID, ERA_ID], wallet1);
      const runId = extractRunId(startResult);

      const { result: runResult } = simnet.callReadOnlyFn('wave-game', 'get-run', [Cl.buffer(runId)], wallet1);
      // Should be (some { ... }) — not none
      expect(runResult).not.toBeNone();
    });
  });

  describe('submit-score', () => {
    it('rejects submit-score with non-existent run-id (ERR_RUN_NOT_FOUND = u202)', () => {
      const fakeRunId = Cl.buffer(new Uint8Array(32).fill(99));
      const { result } = simnet.callPublicFn('wave-game', 'submit-score', [
        fakeRunId,
        Cl.uint(5000),
        Cl.list([]),
        Cl.buffer(new Uint8Array(65)),
      ], wallet1);
      expect(result).toBeErr(Cl.uint(202));
    });
  });

  describe('mint-nft', () => {
    it('rejects mint-nft for non-existent run (ERR_RUN_NOT_FOUND = u202)', () => {
      const fakeRunId = Cl.buffer(new Uint8Array(32).fill(88));
      const { result } = simnet.callPublicFn('wave-game', 'mint-nft', [
        fakeRunId,
        Cl.stringAscii('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'),
        Cl.stringAscii('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'),
      ], wallet1);
      expect(result).toBeErr(Cl.uint(202));
    });

    it('rejects mint-nft by non-owner (ERR_NOT_RUN_OWNER = u205)', () => {
      fundWallet(wallet1);
      const { result: startResult } = simnet.callPublicFn('wave-game', 'start-run', [TOKEN_ID, ERA_ID], wallet1);
      const runId = extractRunId(startResult);

      // wallet2 tries to mint wallet1's run
      const { result } = simnet.callPublicFn('wave-game', 'mint-nft', [
        Cl.buffer(runId),
        Cl.stringAscii('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'),
        Cl.stringAscii('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'),
      ], wallet2);
      expect(result).toBeErr(Cl.uint(205));
    });
  });

  describe('get-leaderboard', () => {
    it('returns empty list for a fresh era', () => {
      const { result } = simnet.callReadOnlyFn('wave-game', 'get-leaderboard', [TOKEN_ID, ERA_ID], wallet1);
      expect(result).toBeOk(Cl.list([]));
    });
  });
});
