import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import type { StartRunPayload, ScoreUpdatePayload } from '../EventBus';
import { CANVAS_WIDTH, COLORS } from '../constants';

const BAR_H = 3;
const WARN_ALPHA_PEAK = 0.18;

const TOKEN_COLOR: Record<string, number> = {
  STX:  COLORS.STX,
  sBTC: COLORS.sBTC,
  ALEX: COLORS.ALEX,
};

export class UIScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Graphics;
  private warnOverlay!: Phaser.GameObjects.Graphics;

  private totalCandles   = 0;
  private currentCandles = 0;
  private token          = 'STX';
  private warnAlpha      = 0;

  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create() {
    this.bar         = this.add.graphics();
    this.warnOverlay = this.add.graphics();

    EventBus.on('start-run',    this.onStartRun,    this);
    EventBus.on('score-update', this.onScoreUpdate, this);
    EventBus.on('wipeout-warn', this.onWipeoutWarn, this);
    EventBus.on('run-complete', this.onRunComplete,  this);
  }

  update() {
    if (this.warnAlpha > 0) {
      this.warnAlpha = Math.max(0, this.warnAlpha - 0.012);
      this.drawWarn();
    }
  }

  shutdown() {
    EventBus.off('start-run',    this.onStartRun,    this);
    EventBus.off('score-update', this.onScoreUpdate, this);
    EventBus.off('wipeout-warn', this.onWipeoutWarn, this);
    EventBus.off('run-complete', this.onRunComplete,  this);
  }

  // ─── event handlers ─────────────────────────────────────────────────────────

  private onStartRun(payload: StartRunPayload): void {
    this.totalCandles   = payload.candles.length;
    this.token          = payload.token ?? 'STX';
    this.currentCandles = 0;
    this.drawBar();
  }

  private onScoreUpdate(payload: ScoreUpdatePayload): void {
    this.currentCandles = payload.distanceCandles;
    this.drawBar();
  }

  private onWipeoutWarn(): void {
    this.warnAlpha = WARN_ALPHA_PEAK;
  }

  private onRunComplete(): void {
    this.bar.clear();
    this.warnOverlay.clear();
    this.warnAlpha = 0;
  }

  // ─── draw ────────────────────────────────────────────────────────────────────

  private drawBar(): void {
    if (this.totalCandles === 0) return;
    const pct   = Math.min(this.currentCandles / this.totalCandles, 1);
    const color = TOKEN_COLOR[this.token] ?? COLORS.STX;

    this.bar.clear();
    this.bar.fillStyle(0x111111, 1);
    this.bar.fillRect(0, 0, CANVAS_WIDTH, BAR_H);
    this.bar.fillStyle(color, 0.85);
    this.bar.fillRect(0, 0, CANVAS_WIDTH * pct, BAR_H);
  }

  private drawWarn(): void {
    if (this.warnAlpha <= 0) {
      this.warnOverlay.clear();
      return;
    }
    const h = 40;
    this.warnOverlay.clear();
    this.warnOverlay.fillStyle(0xef4444, this.warnAlpha);
    // Top edge
    this.warnOverlay.fillRect(0, 0, CANVAS_WIDTH, h);
    // Bottom edge — note: height relative to canvas; UIScene camera is fixed so Y starts at 0
    this.warnOverlay.fillRect(0, this.cameras.main.height - h, CANVAS_WIDTH, h);
    // Left edge
    this.warnOverlay.fillRect(0, 0, 20, this.cameras.main.height);
    // Right edge
    this.warnOverlay.fillRect(CANVAS_WIDTH - 20, 0, 20, this.cameras.main.height);
  }
}
