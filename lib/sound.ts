// Procedural sound manager — no audio files required.
// All sounds are synthesised with the Web Audio API.
// Safe to import from both game/ and React components.

class SoundManager {
  private _ctx: AudioContext | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private _enabled = true;

  get enabled(): boolean { return this._enabled; }

  toggle(): void {
    this._enabled = !this._enabled;
    if (!this._enabled) this.stopAmbient();
  }

  // ─── game sounds ─────────────────────────────────────────────────────────────

  jump(): void {
    this.sweep(380, 560, 0, 0.1, 'sine', 0.14);
  }

  land(): void {
    this.noise(0.07, 0.06);
    this.sweep(120, 80, 0, 0.06, 'sine', 0.10);
  }

  trick(): void {
    // Ascending triad stagger
    [[523, 0], [659, 0.06], [784, 0.12]].forEach(([f, d]) =>
      this.sweep(f, f * 1.02, d, d + 0.18, 'sine', 0.12),
    );
  }

  wipeout(): void {
    this.sweep(320, 60, 0, 0.55, 'sawtooth', 0.18);
    this.noise(0.12, 0.3);
  }

  milestone(): void {
    // Short upward arpeggio
    [[261, 0], [329, 0.08], [392, 0.16], [523, 0.24]].forEach(([f, d]) =>
      this.sweep(f, f, d, d + 0.12, 'sine', 0.10),
    );
  }

  // ─── ambient ─────────────────────────────────────────────────────────────────

  startAmbient(): void {
    if (!this._enabled || this.ambientOsc) return;
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 2.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.ambientOsc  = osc;
      this.ambientGain = gain;
    } catch { /* blocked by browser policy */ }
  }

  stopAmbient(): void {
    if (!this.ambientOsc || !this.ambientGain) return;
    const ctx = this.ctx;
    if (ctx) {
      this.ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      this.ambientOsc.stop(ctx.currentTime + 0.65);
    }
    this.ambientOsc  = null;
    this.ambientGain = null;
  }

  // ─── internals ───────────────────────────────────────────────────────────────

  private get ctx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this._ctx) {
      try { this._ctx = new AudioContext(); } catch { return null; }
    }
    return this._ctx;
  }

  private sweep(
    freqStart: number,
    freqEnd: number,
    tStart: number,
    tEnd: number,
    type: OscillatorType,
    vol: number,
  ): void {
    if (!this._enabled) return;
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      const t0 = ctx.currentTime + tStart;
      const t1 = ctx.currentTime + tEnd;
      osc.frequency.setValueAtTime(freqStart, t0);
      osc.frequency.linearRampToValueAtTime(freqEnd, t1);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t1 + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t1 + 0.1);
    } catch { /* ignore */ }
  }

  private noise(vol: number, duration: number): void {
    if (!this._enabled) return;
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const samples = Math.ceil(ctx.sampleRate * duration);
      const buf     = ctx.createBuffer(1, samples, ctx.sampleRate);
      const data    = buf.getChannelData(0);
      for (let i = 0; i < samples; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
      const src  = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch { /* ignore */ }
  }
}

export const soundManager = new SoundManager();
