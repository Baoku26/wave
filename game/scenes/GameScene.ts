import Phaser from 'phaser';
import { EventBus, type OHLCCandle, type StartRunPayload } from '../EventBus';
import { generateTerrain, getSegmentAtX, type TerrainMesh } from '../terrain/TerrainGenerator';
import { renderTerrain } from '../terrain/TerrainRenderer';
import { Surfer } from '../player/Surfer';
import { TrickSystem } from '../player/TrickSystem';
import { ScoreEngine } from '../scoring/ScoreEngine';
import { soundManager } from '../../lib/sound';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  SEGMENT_WIDTH,
  CAMERA_LERP_X,
  CAMERA_OFFSET_X,
  TERRAIN_THICKNESS,
  TERRAIN_MIN_Y_RATIO,
  COLORS,
} from '../constants';

// Pre-terrain runway: surfer spawns on a flat platform before the chart starts.
// RUNWAY_WIDTH must be at least CAMERA_OFFSET_X wide so the camera doesn't
// overshoot into negative space past the runway on startup.
const RUNWAY_WIDTH          = SEGMENT_WIDTH * 4;    // 320 px
const SURFER_START_X        = -(RUNWAY_WIDTH / 2);  // -160 px — centre of runway
const SURFER_START_Y_OFFSET = -30;
const MILESTONE_STEP        = 5000;

export class GameScene extends Phaser.Scene {
  private surfer!: Surfer;
  private trickSystem!: TrickSystem;
  private scoreEngine!: ScoreEngine;
  private terrain!: TerrainMesh;
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private terrainBodies: MatterJS.BodyType[] = [];
  private candles: OHLCCandle[] = [];
  private eraToken   = 'STX';
  private runActive  = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private wasInAir   = false;
  private lastMilestone = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.matter.world.setGravity(0, 1);

    this.terrainGraphics = this.add.graphics();
    this.surfer          = new Surfer(this);
    this.trickSystem     = new TrickSystem((name) => this.scoreEngine.onTrick(name));
    this.scoreEngine     = new ScoreEngine(false);

    this.cursors  = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // off-before-on: prevents duplicate listeners if Phaser restarts this scene
    // without a full shutdown cycle (e.g. rapid navigation before RAF destroy fires).
    EventBus.off('start-run', this.startRun,    this);
    EventBus.off('wipeout',   this.handleWipeout, this);
    EventBus.on('start-run', this.startRun,    this);
    EventBus.on('wipeout',   this.handleWipeout, this);

    // Launch the UI overlay scene in parallel.
    this.scene.launch('UIScene');

    EventBus.emit('game-scene-ready');
  }

  update(_time: number, _delta: number) {
    if (!this.runActive) return;

    const isAccelerating = !!(this.cursors.right?.isDown);
    const isBraking      = !!(this.cursors.left?.isDown);
    const jumpHeld       = !!(this.spaceKey.isDown || this.cursors.up?.isDown);

    this.surfer.update(isAccelerating, isBraking);

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
      this.surfer.jump();
      soundManager.jump();
    }
    if (jumpHeld) this.surfer.floatStep();
    if (isAccelerating) this.surfer.accelerate();
    else if (isBraking)  this.surfer.brake();

    // Landing sound
    const nowInAir = this.surfer.isInAir();
    if (this.wasInAir && !nowInAir) soundManager.land();
    this.wasInAir = nowInAir;

    this.scoreEngine.onDistanceUpdate(this.surfer.getX());
    this.scoreEngine.onAirtimeUpdate(this.surfer.totalAirtimeMs);

    const seg = getSegmentAtX(this.terrain, this.surfer.getX());

    this.trickSystem.update({
      surfaceY:      seg?.surfaceY ?? CANVAS_HEIGHT / 2,
      surferY:       this.surfer.getY(),
      isInAir:       this.surfer.isInAir(),
      isInWickZone:  seg?.isWickZone ?? false,
      isAccelerating,
      isBraking,
      velocityX:     this.surfer.getVelocityX(),
    });

    // Score milestone sounds
    const live      = this.scoreEngine.getLiveScore();
    const milestone = Math.floor(live / MILESTONE_STEP) * MILESTONE_STEP;
    if (milestone > 0 && milestone > this.lastMilestone) {
      this.lastMilestone = milestone;
      soundManager.milestone();
    }

    // Camera follow
    const camX       = this.surfer.getX() - CAMERA_OFFSET_X;
    const currentCamX = this.cameras.main.scrollX;
    this.cameras.main.scrollX = currentCamX + (camX - currentCamX) * CAMERA_LERP_X;

    if (this.surfer.getX() >= this.terrain.totalWidth - SEGMENT_WIDTH) {
      this.endRun(true);
    }
  }

  shutdown() {
    EventBus.off('start-run', this.startRun,     this);
    EventBus.off('wipeout',   this.handleWipeout, this);
    this.scene.stop('UIScene');
    this.destroyTerrainBodies();
    this.surfer?.destroy();
    soundManager.stopAmbient();
  }

  // ─── private ────────────────────────────────────────────────────────────────

  private startRun(payload: StartRunPayload) {
    // Guard: scene plugins are nulled when Phaser destroys the game. If this
    // listener fires after destruction (stale EventBus reference from a prior
    // game instance), bail out instead of crashing into null plugin APIs.
    if (!this.add) return;
    this.candles   = payload.candles;
    this.eraToken  = payload.token ?? 'STX';
    this.lastMilestone = 0;
    this.wasInAir   = false;
    this.buildTerrain();
    this.trickSystem.reset();
    this.runActive = true;
    soundManager.startAmbient();
  }

  private buildTerrain() {
    this.destroyTerrainBodies();
    this.terrain = generateTerrain(this.candles);

    renderTerrain(this.terrainGraphics, this.terrain, this.eraToken);

    const startY = this.terrain.points[0]?.y ?? CANVAS_HEIGHT / 2;
    this.surfer.create(SURFER_START_X, startY + SURFER_START_Y_OFFSET);

    this.buildTerrainPhysics();

    // Place camera so the surfer appears at CAMERA_OFFSET_X from the left edge.
    this.cameras.main.scrollX = SURFER_START_X - CAMERA_OFFSET_X;
    this.cameras.main.setBounds(
      -(RUNWAY_WIDTH + CAMERA_OFFSET_X),
      0,
      this.terrain.totalWidth + CANVAS_WIDTH + RUNWAY_WIDTH + CAMERA_OFFSET_X,
      CANVAS_HEIGHT,
    );
  }

  private buildTerrainPhysics() {
    const pts = this.terrain.points;
    const chunkSize = 10;
    for (let i = 0; i < pts.length - chunkSize; i += chunkSize) {
      this.createTerrainBody(pts.slice(i, i + chunkSize + 1));
    }
    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      const totalW = this.terrain.totalWidth;

      const floor = this.matter.add.rectangle(
        last.x + CANVAS_WIDTH / 2,
        CANVAS_HEIGHT + TERRAIN_THICKNESS / 2,
        CANVAS_WIDTH * 2,
        TERRAIN_THICKNESS,
        { isStatic: true, label: 'terrain-floor', friction: 0.8 },
      );
      this.terrainBodies.push(floor as unknown as MatterJS.BodyType);

      // Hard ceiling at the top chart line — prevents the surfer from jumping
      // above the visible terrain band regardless of chart shape.
      const ceilingY = CANVAS_HEIGHT * TERRAIN_MIN_Y_RATIO - TERRAIN_THICKNESS / 2;
      const ceiling = this.matter.add.rectangle(
        totalW / 2,
        ceilingY,
        totalW + CANVAS_WIDTH + RUNWAY_WIDTH + CAMERA_OFFSET_X,
        TERRAIN_THICKNESS,
        { isStatic: true, label: 'terrain-ceiling', friction: 0, restitution: 0 },
      );
      this.terrainBodies.push(ceiling as unknown as MatterJS.BodyType);

      // Flat runway before the chart — surfer spawns here and rides into the terrain.
      // Level is locked to the first terrain point so the transition is seamless.
      const platformY = pts[0].y;
      const platform = this.matter.add.rectangle(
        -(RUNWAY_WIDTH / 2),
        platformY + TERRAIN_THICKNESS / 2,
        RUNWAY_WIDTH + SEGMENT_WIDTH, // small right-side overlap with terrain start
        TERRAIN_THICKNESS,
        { isStatic: true, label: 'terrain-platform', friction: 0.8, restitution: 0 },
      );
      this.terrainBodies.push(platform as unknown as MatterJS.BodyType);
    }
  }

  private createTerrainBody(points: { x: number; y: number }[]) {
    for (let i = 0; i < points.length - 1; i++) {
      const p0  = points[i];
      const p1  = points[i + 1];
      const midX  = (p0.x + p1.x) / 2;
      const dx    = p1.x - p0.x;
      const dy    = p1.y - p0.y;
      const len   = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      // For a rotated slab the top surface sits at centre_y - THICKNESS*cos(θ)/2.
      // Setting centre_y = avg_y + THICKNESS*cos(θ)/2 places the top corners
      // exactly on p0 and p1, keeping the physics surface on the chart line
      // regardless of slope angle (fixes surfer sinking on steeper segments).
      const midY  = (p0.y + p1.y) / 2 + TERRAIN_THICKNESS * (dx / len) / 2;
      const body  = this.matter.add.rectangle(midX, midY, len, TERRAIN_THICKNESS, {
        isStatic:    true,
        label:       'terrain',
        friction:    0.8,
        restitution: 0,
        angle,
      });
      this.terrainBodies.push(body as unknown as MatterJS.BodyType);
    }
  }

  private destroyTerrainBodies() {
    if (this.matter?.world) {
      for (const body of this.terrainBodies) this.matter.world.remove(body);
    }
    this.terrainBodies = [];
  }

  private handleWipeout() {
    if (!this.runActive) return;
    soundManager.wipeout();
    this.scoreEngine.onWipeout();
    this.time.delayedCall(1500, () => this.endRun(false));
  }

  private endRun(survived: boolean) {
    if (!this.runActive) return;
    this.runActive = false;
    soundManager.stopAmbient();

    EventBus.emit('run-complete', {
      score:           this.scoreEngine.finalScore(survived),
      tricks:          this.scoreEngine.getTricks(),
      survived,
      distanceCandles: this.scoreEngine.getDistanceCandles(),
      airtimeMs:       this.scoreEngine.getTotalAirtimeMs(),
    });
  }
}
