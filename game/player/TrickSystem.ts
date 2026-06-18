import { TRICK_POINTS } from '../constants';

type TrickName = keyof typeof TRICK_POINTS;

export interface TrickFrameState {
  surfaceY: number;
  surferY: number;
  isInAir: boolean;
  isInWickZone: boolean;
  isAccelerating: boolean;
  isBraking: boolean;
  velocityX: number;
}

const COOLDOWN_MS           = 2500;
const AERIAL_HEIGHT_PX      = 70;
const AERIAL_SUSTAIN_MS     = 250;
const TUBE_SUSTAIN_MS       = 700;
const CUTBACK_SPEED_MIN     = 5;
const CUTBACK_WINDOW_MS     = 650;

export class TrickSystem {
  private readonly onTrick: (name: TrickName) => void;
  private cooldowns        = new Map<TrickName, number>();
  private aerialStart: number | null = null;
  private tubeStart: number | null   = null;
  private lastDir: 'accel' | 'brake' | null = null;
  private lastDirSwitch: number | null      = null;

  constructor(onTrick: (name: TrickName) => void) {
    this.onTrick = onTrick;
  }

  update(s: TrickFrameState): void {
    this.checkAerial(s);
    this.checkTube(s);
    this.checkCutback(s);
  }

  reset(): void {
    this.cooldowns.clear();
    this.aerialStart    = null;
    this.tubeStart      = null;
    this.lastDir        = null;
    this.lastDirSwitch  = null;
  }

  // ─── detectors ─────────────────────────────────────────────────────────────

  private checkAerial({ isInAir, surfaceY, surferY }: TrickFrameState): void {
    if (!isInAir) { this.aerialStart = null; return; }

    const height = surfaceY - surferY;
    if (height >= AERIAL_HEIGHT_PX) {
      if (this.aerialStart === null) {
        this.aerialStart = Date.now();
      } else if (Date.now() - this.aerialStart >= AERIAL_SUSTAIN_MS) {
        this.emit('aerial');
        this.aerialStart = Date.now() + 99_999; // lock until next air
      }
    } else {
      this.aerialStart = null;
    }
  }

  private checkTube({ isInAir, isInWickZone }: TrickFrameState): void {
    if (isInAir && isInWickZone) {
      if (this.tubeStart === null) {
        this.tubeStart = Date.now();
      } else if (Date.now() - this.tubeStart >= TUBE_SUSTAIN_MS) {
        this.emit('tube');
        this.tubeStart = Date.now() + 99_999;
      }
    } else {
      this.tubeStart = null;
    }
  }

  // Cutback: rapid direction switch (accel → brake or brake → accel) in a wick zone.
  private checkCutback({ isAccelerating, isBraking, velocityX, isInWickZone }: TrickFrameState): void {
    if (!isInWickZone || velocityX < CUTBACK_SPEED_MIN) return;

    const dir = isAccelerating ? 'accel' : isBraking ? 'brake' : null;
    if (!dir || dir === this.lastDir) return;

    const now = Date.now();
    if (
      this.lastDir !== null &&
      this.lastDirSwitch !== null &&
      now - this.lastDirSwitch < CUTBACK_WINDOW_MS
    ) {
      this.emit('cutback');
    }
    this.lastDirSwitch = now;
    this.lastDir       = dir;
  }

  private emit(name: TrickName): void {
    const now = Date.now();
    if ((this.cooldowns.get(name) ?? 0) > now) return;
    this.cooldowns.set(name, now + COOLDOWN_MS);
    this.onTrick(name);
  }
}
