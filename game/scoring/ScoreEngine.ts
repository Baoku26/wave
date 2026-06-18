import {
  DISTANCE_POINTS_PER_CANDLE,
  AIRTIME_POINTS_PER_100MS,
  SURVIVAL_BONUS,
  COMEBACK_BONUS,
  TRICK_MULTIPLIER_STEP,
  TRICK_MULTIPLIER_MAX,
  DAILY_FIRST_ATTEMPT_BONUS,
  TRICK_POINTS,
  SEGMENT_WIDTH,
} from '../constants';
import { EventBus, type TrickEvent } from '../EventBus';

export class ScoreEngine {
  private baseScore = 0;
  private multiplier = 1.0;
  private tricks: TrickEvent[] = [];
  private uniqueTrickTypes = new Set<string>();
  private distanceCandles = 0;
  private totalAirtimeMs = 0;
  private hadWipeout = false;
  private isFirstAttemptToday: boolean;
  private lastEmitTime = 0;

  constructor(isFirstAttemptToday = false) {
    this.isFirstAttemptToday = isFirstAttemptToday;
    if (isFirstAttemptToday) {
      this.multiplier += DAILY_FIRST_ATTEMPT_BONUS;
    }
  }

  onDistanceUpdate(surferX: number) {
    const newDistance = Math.floor(surferX / SEGMENT_WIDTH);
    if (newDistance > this.distanceCandles) {
      const candlesDelta = newDistance - this.distanceCandles;
      this.distanceCandles = newDistance;
      this.baseScore += candlesDelta * DISTANCE_POINTS_PER_CANDLE;
    }
  }

  onAirtimeUpdate(airtimeMs: number) {
    this.totalAirtimeMs = airtimeMs;
    const airtimeScore = Math.floor(airtimeMs / 100) * AIRTIME_POINTS_PER_100MS;
    this.emitUpdate(airtimeScore);
  }

  onTrick(name: TrickEvent['name']) {
    if (!this.uniqueTrickTypes.has(name)) {
      this.uniqueTrickTypes.add(name);
      const newMultiplier = Math.min(
        this.multiplier + TRICK_MULTIPLIER_STEP,
        TRICK_MULTIPLIER_MAX,
      );
      this.multiplier = newMultiplier;
    }

    const points = TRICK_POINTS[name];
    const trick: TrickEvent = { name, points };
    this.tricks.push(trick);
    this.baseScore += points;

    EventBus.emit('trick-landed', trick);
    this.emitUpdate(0);
  }

  onWipeout() {
    this.hadWipeout = true;
  }

  onComeback() {
    this.baseScore += COMEBACK_BONUS;
  }

  finalScore(survived: boolean): number {
    let score = Math.round(this.baseScore * this.multiplier);
    if (survived) score += SURVIVAL_BONUS;
    return score;
  }

  getLiveScore(): number {
    const airtimeScore = Math.floor(this.totalAirtimeMs / 100) * AIRTIME_POINTS_PER_100MS;
    return Math.round((this.baseScore + airtimeScore) * this.multiplier);
  }

  getMultiplier(): number {
    return this.multiplier;
  }

  getTricks(): TrickEvent[] {
    return [...this.tricks];
  }

  getDistanceCandles(): number {
    return this.distanceCandles;
  }

  getTotalAirtimeMs(): number {
    return this.totalAirtimeMs;
  }

  private emitUpdate(extraScore: number) {
    const now = Date.now();
    if (now - this.lastEmitTime < 100) return;
    this.lastEmitTime = now;

    EventBus.emit('score-update', {
      score: Math.round((this.baseScore + extraScore) * this.multiplier),
      multiplier: this.multiplier,
      distanceCandles: this.distanceCandles,
      airtimeMs: this.totalAirtimeMs,
    });
  }
}
