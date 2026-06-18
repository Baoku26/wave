import type Phaser from 'phaser';
import type { TerrainMesh, TerrainSegment } from './TerrainGenerator';
import { CANVAS_HEIGHT, COLORS } from '../constants';

const TOKEN_ACCENT: Record<string, number> = {
  STX:  COLORS.STX,
  sBTC: COLORS.sBTC,
  ALEX: COLORS.ALEX,
};

const GRID_COLOR = 0x1a1a1a;

type Pt = { x: number; y: number };

export function renderTerrain(
  graphics: Phaser.GameObjects.Graphics,
  mesh: TerrainMesh,
  token: string,
): void {
  if (mesh.points.length < 2) return;

  const accent = TOKEN_ACCENT[token] ?? COLORS.STX;
  const pts    = mesh.points;
  const segs   = mesh.segments;

  graphics.clear();

  // 1. Subtle horizontal grid
  drawGrid(graphics, mesh.totalWidth);

  // 2. Area fill — three stacked strips for gradient depth
  //    Base:  full area to canvas floor at 5 %
  //    Mid:   100 px band below the chart line at 8 %
  //    Near:  30 px band immediately below the line at 12 %
  fillStrip(graphics, pts, CANVAS_HEIGHT + 10, accent, 0.05);
  fillStrip(graphics, pts, 100,                accent, 0.08);
  fillStrip(graphics, pts, 30,                 accent, 0.12);

  // 3. Chart line — four passes: outer glow → inner glow → core → main
  drawLine(graphics, pts, accent, 22, 0.03);
  drawLine(graphics, pts, accent, 11, 0.07);
  drawLine(graphics, pts, accent,  5, 0.15);
  drawLine(graphics, pts, accent,  2, 0.95);

  // 4. Three-ring dot markers at each candle close price
  drawDots(graphics, segs, accent);
}

// ─── helpers ────────────────────────────────────────────────────────────────

function drawGrid(graphics: Phaser.GameObjects.Graphics, totalWidth: number): void {
  for (let i = 1; i < 5; i++) {
    const y = (CANVAS_HEIGHT / 5) * i;
    graphics.lineStyle(1, GRID_COLOR, 0.7);
    graphics.beginPath();
    graphics.moveTo(0, y);
    graphics.lineTo(totalWidth, y);
    graphics.strokePath();
  }
}

// Fills the polygon: chart line on top, a copy shifted downward by `depth` on the bottom.
// Stacking three calls with different depths simulates a gradient without a real gradient API.
function fillStrip(
  graphics: Phaser.GameObjects.Graphics,
  pts: Pt[],
  depth: number,
  accent: number,
  alpha: number,
): void {
  graphics.fillStyle(accent, alpha);
  graphics.beginPath();
  graphics.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    graphics.lineTo(pts[i].x, pts[i].y);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    graphics.lineTo(pts[i].x, Math.min(pts[i].y + depth, CANVAS_HEIGHT + 10));
  }
  graphics.closePath();
  graphics.fillPath();
}

function drawLine(
  graphics: Phaser.GameObjects.Graphics,
  pts: Pt[],
  color: number,
  width: number,
  alpha: number,
): void {
  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    graphics.lineTo(pts[i].x, pts[i].y);
  }
  graphics.strokePath();
}

function drawDots(
  graphics: Phaser.GameObjects.Graphics,
  segs: TerrainSegment[],
  accent: number,
): void {
  for (const seg of segs) {
    const { startX: x, surfaceY: y } = seg;
    graphics.fillStyle(accent,   0.12); graphics.fillCircle(x, y, 9);   // outer glow ring
    graphics.fillStyle(accent,   0.30); graphics.fillCircle(x, y, 5.5); // mid fill ring
    graphics.fillStyle(0xffffff, 0.92); graphics.fillCircle(x, y, 2.5); // bright center
  }
}

// No-op stub — kept for import compatibility.
export function renderWickZones(
  _graphics: Phaser.GameObjects.Graphics,
  _segments: TerrainSegment[],
): void {}
