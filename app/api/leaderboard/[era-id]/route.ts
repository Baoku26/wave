import { type NextRequest, NextResponse } from 'next/server';
import { fetchLeaderboard } from '@/lib/leaderboard';
import { ERAS, type EraId } from '@/lib/eras';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ 'era-id': string }> },
) {
  const { 'era-id': eraId } = await params;

  if (!ERAS[eraId as EraId]) {
    return NextResponse.json({ error: 'Unknown era', entries: [] }, { status: 404 });
  }

  try {
    const entries = await fetchLeaderboard(eraId);
    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, entries: [] }, { status: 500 });
  }
}
