import Phaser from 'phaser';
import {
  JUMP_VELOCITY,
  LEAN_INCREMENT,
  LEAN_MAX,
  SURF_SPEED,
  SURF_MIN_SPEED,
  SURF_ACCEL,
  SURF_BRAKE,
  SURF_MAX_SPEED,
  FLOAT_UPBOOST,
  FLOAT_FALL_MULT,
  FLOAT_MAX_MS,
  SURFER_MASS,
  SURFER_FRICTION,
  SURFER_FRICTION_AIR,
  SURFER_RESTITUTION,
  WIPEOUT_ANGULAR_VELOCITY,
  WIPEOUT_TILT_DEGREES,
  COLORS,
} from '../constants';
import { EventBus } from '../EventBus';

const SURFER_W = 28;
const SURFER_H = 16;
const BOARD_W  = 44;
const BOARD_H  = 6;

export class Surfer {
  private scene: Phaser.Scene;
  private body!: Phaser.Physics.Matter.Image;
  private graphics!: Phaser.GameObjects.Graphics;

  private groundContacts = 0;
  private isWipedOut     = false;
  private airtimeStart: number | null   = null;
  private jumpFloatStart: number | null = null;
  totalAirtimeMs = 0;
  private wipeoutWarned    = false;
  private wipeoutGraceUntil = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(x: number, y: number) {
    this.graphics       = this.scene.add.graphics();
    this.groundContacts = 0;
    this.isWipedOut     = false;
    this.wipeoutWarned  = false;
    this.airtimeStart   = null;
    this.jumpFloatStart = null;
    this.totalAirtimeMs = 0;
    this.wipeoutGraceUntil = Date.now() + 2000;

    const matter = (this.scene as Phaser.Scene & {
      matter: Phaser.Physics.Matter.MatterPhysics;
    }).matter;

    this.body = matter.add.image(x, y, '__DEFAULT', undefined, {
      mass:       SURFER_MASS,
      frictionAir: SURFER_FRICTION_AIR,
      friction:   SURFER_FRICTION,
      restitution: SURFER_RESTITUTION,
      label:      'surfer',
      shape:      { type: 'rectangle', width: BOARD_W, height: SURFER_H + BOARD_H },
    });
    this.body.setVisible(false);
    this.body.setVelocityX(SURF_SPEED);

    matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) {
        if (pair.bodyA.label === 'surfer' || pair.bodyB.label === 'surfer') {
          this.onLand();
        }
      }
    });

    matter.world.on('collisionend', (event: Phaser.Physics.Matter.Events.CollisionEndEvent) => {
      for (const pair of event.pairs) {
        if (pair.bodyA.label === 'surfer' || pair.bodyB.label === 'surfer') {
          this.onLeaveGround();
        }
      }
    });
  }

  // Called once when the jump key is first pressed.
  jump() {
    if (this.isWipedOut)    return;
    if (!this.isGrounded()) return; // single jump only — no double jump

    this.body.setVelocityY(-JUMP_VELOCITY);
    this.jumpFloatStart = Date.now();
  }

  // Called every frame while the jump key is held.
  floatStep() {
    if (this.isWipedOut)            return;
    if (!this.isInAir())            return;
    if (this.jumpFloatStart === null) return;
    if (Date.now() - this.jumpFloatStart > FLOAT_MAX_MS) return;

    const mb = this.body.body as MatterJS.BodyType;
    if (mb.velocity.y < 0) {
      // Ascending — gentle extra lift.
      this.body.setVelocityY(mb.velocity.y - FLOAT_UPBOOST);
    } else {
      // Falling — strongly dampen the descent.
      this.body.setVelocityY(mb.velocity.y * FLOAT_FALL_MULT);
    }
  }

  // Right key held — speeds up and tilts forward.
  accelerate() {
    if (this.isWipedOut) return;
    const mb  = this.body.body as MatterJS.BodyType;
    this.body.setVelocityX(Math.min(mb.velocity.x + SURF_ACCEL, SURF_MAX_SPEED));
    const av = Math.min(LEAN_MAX, mb.angularVelocity + LEAN_INCREMENT);
    this.body.setAngularVelocity(av);
  }

  // Left key held — slows down and tilts backward.
  brake() {
    if (this.isWipedOut) return;
    const mb = this.body.body as MatterJS.BodyType;
    // Allow braking below SURF_MIN_SPEED but not to a full stop.
    this.body.setVelocityX(Math.max(mb.velocity.x - SURF_BRAKE, 0.5));
    const av = Math.max(-LEAN_MAX, mb.angularVelocity - LEAN_INCREMENT);
    this.body.setAngularVelocity(av);
  }

  // isAccelerating / isBraking — whether the player has a key held this frame.
  update(isAccelerating: boolean, isBraking: boolean) {
    if (!this.body) return;
    this.enforceWavePush(isBraking, isAccelerating || isBraking);
    this.drawSurfer();
    this.checkWipeout();
  }

  getX(): number { return this.body.x; }
  getY(): number { return this.body.y; }
  getVelocityX(): number { return (this.body.body as MatterJS.BodyType).velocity.x; }
  isInAir(): boolean { return !this.isGrounded(); }
  getWipedOut(): boolean { return this.isWipedOut; }

  destroy() {
    this.body?.destroy();
    this.graphics?.destroy();
  }

  // ─── private ────────────────────────────────────────────────────────────────

  private isGrounded(): boolean {
    return this.groundContacts > 0;
  }

  // Maintains a minimum forward speed when the player isn't braking,
  // and damps angular velocity when no horizontal key is held.
  private enforceWavePush(isBraking: boolean, activeHorizontal: boolean): void {
    if (this.isWipedOut) return;
    const mb = this.body.body as MatterJS.BodyType;

    if (!activeHorizontal) {
      // Return to upright when no key is held.
      this.body.setAngularVelocity(mb.angularVelocity * 0.5);
    }

    if (!isBraking && mb.velocity.x < SURF_MIN_SPEED) {
      this.body.setVelocityX(
        mb.velocity.x + (SURF_MIN_SPEED - mb.velocity.x) * 0.12,
      );
    }
  }

  private onLand() {
    const wasAirborne = this.groundContacts === 0;
    this.groundContacts++;

    if (wasAirborne && this.airtimeStart !== null) {
      this.totalAirtimeMs += Date.now() - this.airtimeStart;
      this.airtimeStart    = null;
    }
    this.jumpFloatStart = null;
    this.wipeoutWarned  = false;
  }

  private onLeaveGround() {
    this.groundContacts = Math.max(0, this.groundContacts - 1);
    if (this.groundContacts === 0 && this.airtimeStart === null) {
      this.airtimeStart = Date.now();
    }
  }

  private drawSurfer() {
    const pos   = this.body.getCenter();
    const angle = Phaser.Math.DegToRad(this.body.angle);

    this.graphics.clear();
    this.graphics.save();
    this.graphics.translateCanvas(pos.x, pos.y);
    this.graphics.rotateCanvas(angle);

    // Board
    this.graphics.fillStyle(0xf7931a, 1);
    this.graphics.fillRoundedRect(-BOARD_W / 2, SURFER_H / 2 - BOARD_H / 2, BOARD_W, BOARD_H, 2);

    // Rider
    this.graphics.fillStyle(this.isWipedOut ? 0xef4444 : COLORS.surfer, 1);
    this.graphics.fillRoundedRect(-SURFER_W / 2, -SURFER_H / 2 - BOARD_H / 2, SURFER_W, SURFER_H, 4);

    this.graphics.restore();
  }

  private checkWipeout() {
    if (this.isWipedOut) return;
    if (Date.now() < this.wipeoutGraceUntil) return;

    const mb     = this.body.body as MatterJS.BodyType;
    const absAV  = Math.abs(mb.angularVelocity);
    const tilt   = Math.abs(this.body.angle % 360);
    const norm   = tilt > 180 ? 360 - tilt : tilt;

    if (!this.wipeoutWarned && (absAV > WIPEOUT_ANGULAR_VELOCITY || norm > WIPEOUT_TILT_DEGREES)) {
      this.wipeoutWarned = true;
      EventBus.emit('wipeout-warn');

      this.scene.time.delayedCall(300, () => {
        const still =
          Math.abs((this.body.body as MatterJS.BodyType).angularVelocity) > WIPEOUT_ANGULAR_VELOCITY * 0.7 ||
          Math.abs(this.body.angle % 360) > WIPEOUT_TILT_DEGREES * 0.8;
        if (still) {
          this.triggerWipeout();
        } else {
          this.wipeoutWarned = false;
        }
      });
    }
  }

  private triggerWipeout() {
    if (this.isWipedOut) return;
    this.isWipedOut = true;
    EventBus.emit('wipeout');
  }
}
