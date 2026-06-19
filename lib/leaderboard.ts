import { redis, REDIS_KEYS } from '@/lib/redis';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ERAS, type EraId } from '@/lib/eras';
import { getContracts } from '@/lib/contracts';
import { Cl, serializeCV, deserializeCV, ClarityType, cvToJSON } from '@stacks/transactions';

export const LEADERBOARD_TTL = 60;

export interface LeaderboardEntry {
  rank:        number;
  player:      string;
  displayName: string | null;
  score:       number;
  runId:       string;
}

function hiroBase() {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';
}

// In this version of @stacks/transactions, serializeCV returns a hex string.
function cvHex(cv: Parameters<typeof serializeCV>[0]): string {
  return '0x' + serializeCV(cv);
}

// Defensively extract a string from cvToJSON output (format varies by version).
function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'value' in v) return String((v as { value: unknown }).value);
  return String(v ?? '');
}

async function fetchFromChain(eraId: string): Promise<LeaderboardEntry[]> {
  const era = ERAS[eraId as EraId];
  if (!era) return [];

  const contracts = getContracts();
  const [principal, contractName] = contracts.waveGame.split('.');
  const tokenId = era.token.toLowerCase();

  let res: Response;
  try {
    res = await fetch(
      `${hiroBase()}/v2/contracts/call-read/${principal}/${contractName}/get-leaderboard`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: principal,
          arguments: [
            cvHex(Cl.stringAscii(tokenId as Parameters<typeof Cl.stringAscii>[0])),
            cvHex(Cl.stringAscii(eraId   as Parameters<typeof Cl.stringAscii>[0])),
          ],
        }),
        cache: 'no-store',
      },
    );
  } catch {
    return [];
  }

  if (!res.ok) return [];

  const body = await res.json() as { okay?: boolean; result?: string };
  if (!body.okay || !body.result) return [];

  let cv;
  try {
    // Hiro returns "0x<hex>" — slice(2) strips the prefix; deserializeCV takes raw hex.
    cv = deserializeCV(body.result.slice(2));
  } catch {
    return [];
  }

  if (cv.type !== ClarityType.ResponseOk) return [];
  const list = cv.value;
  if (list.type !== ClarityType.List) return [];

  return (list.value as unknown[]).flatMap((rawItem, idx) => {
    // TupleCV.value is a plain object keyed by field name in this version.
    const item = rawItem as { type: string; value: Record<string, { type: string; value: unknown }> };
    if (item.type !== ClarityType.Tuple) return [];

    const playerCv = item.value['player'];
    const scoreCv  = item.value['score'];
    const runIdCv  = item.value['run-id'];
    if (!playerCv || !scoreCv || !runIdCv) return [];

    // Principal value is the address string directly.
    const player = (
      playerCv.type === ClarityType.PrincipalStandard ||
      playerCv.type === ClarityType.PrincipalContract
    ) ? str(playerCv.value) : str(cvToJSON(playerCv as Parameters<typeof cvToJSON>[0]));

    // UInt value is a bigint.
    const score = scoreCv.type === ClarityType.UInt ? Number(scoreCv.value as bigint) : 0;

    // Buffer value is a hex string in this version.
    const runId = runIdCv.type === ClarityType.Buffer ? String(runIdCv.value) : '';

    return [{ rank: idx + 1, player, displayName: null, score, runId }];
  });
}

async function enrichWithProfiles(entries: LeaderboardEntry[]): Promise<LeaderboardEntry[]> {
  if (entries.length === 0) return entries;
  try {
    const supabase  = getSupabaseAdmin();
    const addresses = entries.map((e) => e.player);
    const { data }  = await supabase
      .from('profiles')
      .select('wallet_address, display_name')
      .in('wallet_address', addresses);

    const map = new Map(
      (data ?? []).map((p) => [p.wallet_address as string, p.display_name as string | null]),
    );
    return entries.map((e) => ({ ...e, displayName: map.get(e.player) ?? null }));
  } catch {
    return entries;
  }
}

export async function fetchLeaderboard(eraId: string): Promise<LeaderboardEntry[]> {
  const cacheKey = REDIS_KEYS.leaderboard(eraId);

  try {
    const cached = await redis.get<LeaderboardEntry[]>(cacheKey);
    if (cached) return cached;
  } catch {}

  const raw      = await fetchFromChain(eraId);
  const enriched = await enrichWithProfiles(raw);

  if (enriched.length > 0) {
    try {
      await redis.set(cacheKey, enriched, { ex: LEADERBOARD_TTL });
    } catch {}
  }

  return enriched;
}

export async function fetchTopScore(eraId: string): Promise<number | null> {
  try {
    const entries = await fetchLeaderboard(eraId);
    return entries.length > 0 ? entries[0].score : null;
  } catch {
    return null;
  }
}
