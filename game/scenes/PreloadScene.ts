import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // No external assets — terrain is generated procedurally.
    // Surfer is drawn with graphics primitives.
    this.createLoadingBar();
  }

  create() {
    EventBus.emit('game-ready');
    this.scene.start('GameScene');
  }

  private createLoadingBar() {
    const { width, height } = this.scale;
    const barWidth = 320;
    const barHeight = 6;
    const x = width / 2 - barWidth / 2;
    const y = height / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 1);
    bg.fillRoundedRect(x, y, barWidth, barHeight, 3);

    const bar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0xf7931a, 1);
      bar.fillRoundedRect(x, y, barWidth * value, barHeight, 3);
    });
  }
}
