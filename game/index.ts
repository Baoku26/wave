import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MATTER_GRAVITY_Y } from './constants';

export { EventBus } from './EventBus';
export type { OHLCCandle, StartRunPayload, RunCompletePayload, ScoreUpdatePayload, TrickEvent } from './EventBus';

export function createGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    parent,
    backgroundColor: '#0a0a0a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: MATTER_GRAVITY_Y },
        debug: false,
      },
    },
    scene: [PreloadScene, GameScene, UIScene],
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
    antialias: true,
  };

  return new Phaser.Game(config);
}
