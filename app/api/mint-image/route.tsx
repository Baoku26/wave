import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';
import { ERAS, type EraId } from '@/lib/eras';

export const runtime = 'edge';

const W = 1200;
const H = 630;

interface MintImageBody {
  runId:   string;   // hex
  eraId:   string;
  score:   number;
  tricks:  string[];
  survived: boolean;
}

function tierLabel(score: number): string {
  if (score >= 60000) return 'PLATINUM';
  if (score >= 30000) return 'GOLD';
  if (score >= 15000) return 'SILVER';
  if (score >= 5000)  return 'BRONZE';
  return 'WIPEOUT';
}

function tierColor(score: number): string {
  if (score >= 60000) return '#e2e8f0';
  if (score >= 30000) return '#f7931a';
  if (score >= 15000) return '#94a3b8';
  if (score >= 5000)  return '#c97d36';
  return '#ef4444';
}

async function uploadToIpfs(pngBuffer: ArrayBuffer): Promise<string> {
  const token = process.env.WEB3_STORAGE_TOKEN;
  if (!token) throw new Error('WEB3_STORAGE_TOKEN not set');

  const res = await fetch('https://api.web3.storage/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/png',
    },
    body: pngBuffer,
  });

  if (!res.ok) throw new Error(`IPFS upload failed: ${res.status}`);
  const { cid } = await res.json() as { cid: string };
  return cid;
}

export async function POST(req: NextRequest) {
  let body: MintImageBody;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { eraId, score, tricks, survived } = body;
  const era = ERAS[eraId as EraId];
  if (!era) return NextResponse.json({ error: 'Unknown era' }, { status: 400 });

  const accent = era.accentColor;
  const tier   = tierLabel(score);
  const color  = tierColor(score);

  // Generate 1200×630 NFT card
  const imgResponse = new ImageResponse(
    (
      <div
        style={{
          width: W, height: H,
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Accent glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(ellipse 70% 50% at 80% 50%, ${accent}18 0%, transparent 70%)`,
          display: 'flex',
        }} />

        {/* Top row: WAVE + token badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: accent, fontSize: 28, fontWeight: 700, letterSpacing: 6 }}>
            WAVE
          </span>
          <div style={{
            border: `1.5px solid ${accent}60`,
            borderRadius: 999, padding: '6px 18px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: 2 }}>
              {era.token}
            </span>
            <span style={{ color: '#444', fontSize: 13 }}>·</span>
            <span style={{ color: '#666', fontSize: 13 }}>
              {era.name}
            </span>
          </div>
        </div>

        {/* Center: tier + score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
          <span style={{
            color: color, fontSize: 13, fontWeight: 700,
            letterSpacing: 10, opacity: 0.8,
          }}>
            {tier}
          </span>
          <span style={{
            color: color, fontSize: 120, fontWeight: 800,
            lineHeight: 1, letterSpacing: -4, fontVariantNumeric: 'tabular-nums',
          }}>
            {score.toLocaleString()}
          </span>
        </div>

        {/* Bottom row: tricks + outcome */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tricks.slice(0, 4).map((t, i) => (
              <span key={i} style={{ color: `${accent}99`, fontSize: 14, fontWeight: 600 }}>
                + {t}
              </span>
            ))}
            {tricks.length > 4 && (
              <span style={{ color: '#444', fontSize: 13 }}>+{tricks.length - 4} more</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ color: survived ? '#4ade80' : '#ef4444', fontSize: 15, fontWeight: 600 }}>
              {survived ? 'SURVIVED' : 'WIPEOUT'}
            </span>
            <span style={{ color: '#2a2a2a', fontSize: 13 }}>wave.surf</span>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );

  // Extract PNG bytes from the response
  const blob = await imgResponse.blob();
  const pngBuffer = await blob.arrayBuffer();

  // Upload to IPFS
  let ipfsCid: string;
  try {
    ipfsCid = await uploadToIpfs(pngBuffer);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({
    ipfsCid,
    imageUrl: `https://${ipfsCid}.ipfs.w3s.link`,
  });
}
