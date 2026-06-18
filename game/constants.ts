// Matter.js gravity.y (applied with scale=0.001 internally).
// y=1 → ~0.278 px/frame² acceleration at 60fps with default deltaTime.
export const MATTER_GRAVITY_Y = 1;

// Jump sets velocity directly (px/frame) — consistent height regardless of framerate.
// At MATTER_GRAVITY_Y=1 and 60fps this gives ~115px peak height.
export const JUMP_VELOCITY = 8;

// Lean accumulates angular velocity each frame the key is held, capped at max.
export const LEAN_INCREMENT = 0.008;
export const LEAN_MAX = 0.05;

// The wave always pushes the surfer rightward.
// SURF_SPEED: initial velocity when the run starts.
// SURF_MIN_SPEED: floor applied when the player isn't actively braking.
// SURF_ACCEL / SURF_BRAKE: velocity delta per frame when holding right / left.
// SURF_MAX_SPEED: hard cap on forward velocity.
export const SURF_SPEED     = 5;
export const SURF_MIN_SPEED = 2.5;
export const SURF_ACCEL     = 0.7;
export const SURF_BRAKE     = 0.45;
export const SURF_MAX_SPEED = 13;

// Hold-to-float jump: while holding jump in-air within FLOAT_MAX_MS of the jump,
// apply a small upward boost and strongly damp the fall velocity.
export const FLOAT_UPBOOST   = 0.3;
export const FLOAT_FALL_MULT = 0.92;
export const FLOAT_MAX_MS    = 380;

export const SURFER_MASS = 1;
export const SURFER_FRICTION = 0.6;
export const SURFER_FRICTION_AIR = 0.015;
export const SURFER_RESTITUTION = 0;

export const TERRAIN_HEIGHT_RATIO = 0.55;
export const TERRAIN_MIN_Y_RATIO = 0.15;
export const SEGMENT_WIDTH = 80;
export const TERRAIN_THICKNESS = 60;

export const WIPEOUT_ANGULAR_VELOCITY = 0.4;
export const WIPEOUT_TILT_DEGREES = 70;
export const WIPEOUT_RECOVERY_MS = 1500;

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const TRICK_POINTS = {
  cutback: 500,
  aerial: 800,
  tube: 1200,
} as const;

export const SCORE_TIERS = {
  bronze: 5000,
  silver: 15000,
  gold: 30000,
  platinum: 60000,
} as const;

export const DISTANCE_POINTS_PER_CANDLE = 10;
export const AIRTIME_POINTS_PER_100MS = 5;
export const SURVIVAL_BONUS = 2000;
export const COMEBACK_BONUS = 500;

export const TRICK_MULTIPLIER_STEP = 0.1;
export const TRICK_MULTIPLIER_MAX = 3.0;
export const DAILY_FIRST_ATTEMPT_BONUS = 0.05;

export const WICK_DANGER_RATIO = 2;

export const CAMERA_LERP_X = 0.08;
export const CAMERA_OFFSET_X = 300;

export const COLORS = {
  STX: 0x3b82f6,
  sBTC: 0xf7931a,
  ALEX: 0x8b5cf6,
  terrain: 0x1a1a1a,
  terrainStroke: 0x2a2a2a,
  wickDanger: 0xeab308,
  background: 0x0a0a0a,
  surfer: 0xfafafa,
} as const;
