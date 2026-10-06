import { Howler } from 'howler';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private wakaToggle: boolean = false;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isSirenPlaying: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    Howler.mute(this.muted);
    if (this.sirenGain) {
      this.sirenGain.gain.value = this.muted ? 0 : 0.05;
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playWaka(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    const freq = this.wakaToggle ? 460 : 320;
    this.wakaToggle = !this.wakaToggle;

    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playPowerPellet(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playEatGhost(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [350, 480, 680, 920];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const start = now + idx * 0.05;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(start);
      osc.stop(start + 0.07);
    });
  }

  public playDeath(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.7);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  public startSiren(): void {
    if (this.isSirenPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();

      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.setValueAtTime(200, this.ctx.currentTime);

      // Low frequency modulation (wobble)
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 2.5; // 2.5 Hz wobble
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 60;
      lfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc.frequency);
      lfo.start();

      this.sirenGain.gain.value = this.muted ? 0 : 0.04;

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);

      this.sirenOsc.start();
      this.isSirenPlaying = true;
    } catch {
      // Ignored if audio not yet primed
    }
  }

  public stopSiren(): void {
    if (!this.isSirenPlaying) return;
    try {
      if (this.sirenOsc) {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
        this.sirenOsc = null;
      }
      this.isSirenPlaying = false;
    } catch {
      // Ignored
    }
  }

  public playVictory(): void {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [
      { f: 261.63, d: 0.12 },
      { f: 329.63, d: 0.12 },
      { f: 392.00, d: 0.12 },
      { f: 523.25, d: 0.35 }
    ];

    let t = this.ctx.currentTime;
    notes.forEach((note) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + note.d + 0.05);

      t += note.d + 0.03;
    });
  }
}

