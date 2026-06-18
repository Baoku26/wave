import type { OHLCCandle } from '../EventBus';
import {
  CANVAS_HEIGHT,
  SEGMENT_WIDTH,
  TERRAIN_HEIGHT_RATIO,
  TERRAIN_MIN_Y_RATIO,
  WICK_DANGER_RATIO,
} from '../constants';

export interface TerrainPoint {
  x: number;
  y: number;
}

export interface TerrainSegment {
  startX: number;
  endX: number;
  surfaceY: number;
  highY: number;
  lowY: number;
  isWickZone: boolean;
  candleIndex: number;
}

export interface TerrainMesh {
  points: TerrainPoint[];
  segments: TerrainSegment[];
  totalWidth: number;
}

function candleToY(normalisedValue: number): number {
  const availableHeight = CANVAS_HEIGHT * TERRAIN_HEIGHT_RATIO;
  const topMargin = CANVAS_HEIGHT * TERRAIN_MIN_Y_RATIO;
  return topMargin + (1 - normalisedValue) * availableHeight;
}

function normaliseRange(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => (v - min) / range);
}

function cubicBezierPoints(
  p0: TerrainPoint,
  p1: TerrainPoint,
  steps: number,
): TerrainPoint[] {
  const pts: TerrainPoint[] = [];
  const cp0x = p0.x + (p1.x - p0.x) * 0.4;
  const cp0y = p0.y;
  const cp1x = p0.x + (p1.x - p0.x) * 0.6;
  const cp1y = p1.y;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * mt * p0.x + 3 * mt * mt * t * cp0x + 3 * mt * t * t * cp1x + t * t * t * p1.x;
    const y = mt * mt * mt * p0.y + 3 * mt * mt * t * cp0y + 3 * mt * t * t * cp1y + t * t * t * p1.y;
    pts.push({ x, y });
  }
  return pts;
}

export function generateTerrain(candles: OHLCCandle[]): TerrainMesh {
  if (candles.length === 0) {
    return { points: [], segments: [], totalWidth: 0 };
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const allPrices = [...closes, ...highs, ...lows];
  const globalMin = Math.min(...allPrices);
  const globalMax = Math.max(...allPrices);
  const globalRange = globalMax - globalMin || 1;

  const normClose = closes.map((v) => (v - globalMin) / globalRange);
  const normHigh = highs.map((v) => (v - globalMin) / globalRange);
  const normLow = lows.map((v) => (v - globalMin) / globalRange);

  const controlPoints: TerrainPoint[] = normClose.map((norm, i) => ({
    x: i * SEGMENT_WIDTH,
    y: candleToY(norm),
  }));

  const points: TerrainPoint[] = [];
  for (let i = 0; i < controlPoints.length - 1; i++) {
    const bezier = cubicBezierPoints(controlPoints[i], controlPoints[i + 1], 8);
    if (i === 0) {
      points.push(...bezier);
    } else {
      points.push(...bezier.slice(1));
    }
  }
  points.push(controlPoints[controlPoints.length - 1]);

  const segments: TerrainSegment[] = candles.map((candle, i) => {
    const bodyRange = Math.abs(candle.close - candle.open);
    const wickRange = candle.high - candle.low;
    const isWickZone = bodyRange > 0 && wickRange / bodyRange > WICK_DANGER_RATIO;

    return {
      startX: i * SEGMENT_WIDTH,
      endX: (i + 1) * SEGMENT_WIDTH,
      surfaceY: candleToY(normClose[i]),
      highY: candleToY(normHigh[i]),
      lowY: candleToY(normLow[i]),
      isWickZone,
      candleIndex: i,
    };
  });

  const totalWidth = candles.length * SEGMENT_WIDTH;

  return { points, segments, totalWidth };
}

export function getSegmentAtX(mesh: TerrainMesh, x: number): TerrainSegment | null {
  return mesh.segments.find((s) => x >= s.startX && x < s.endX) ?? null;
}
