import { Howler } from 'howler';
import { AudioSettings } from '../settings/SettingsTypes';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private sfxEnabled: boolean = true;
  private masterVol: number = 0.8;
  private sfxVol: number = 0.85;
  private musicVol: number = 0.7;
  private wakaToggle: boolean = false;

  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isSirenPlaying: boolean = false;

  public onSubtitle?: (text: string) => void;

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

  public applySettings(settings: AudioSettings): void {
    this.masterVol = settings.masterVolume / 100;
    this.sfxVol = settings.sfxVolume / 100;
    this.musicVol = settings.musicVolume / 100;
    this.muted = settings.muteAll;
    this.sfxEnabled = settings.sfxEnabled;

    Howler.mute(this.muted);
    Howler.volume(this.masterVol * this.sfxVol);

    if (this.sirenGain) {
      this.sirenGain.gain.value = this.muted ? 0 : 0.05 * this.masterVol * this.musicVol;
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    Howler.mute(this.muted);
    if (this.sirenGain) {
      this.sirenGain.gain.value = this.muted ? 0 : 0.05 * this.masterVol * this.musicVol;
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playWaka(): void {
    if (this.muted || !this.sfxEnabled) return;
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

    const gainValue = 0.12 * this.masterVol * this.sfxVol;
    gain.gain.setValueAtTime(Math.max(0.0001, gainValue), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);

    if (this.onSubtitle) this.onSubtitle('🟡 Waka-Waka (Pellet)');
  }

  public playPowerPellet(): void {
    if (this.muted || !this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    const gainValue = 0.2 * this.masterVol * this.sfxVol;
    gain.gain.setValueAtTime(Math.max(0.0001, gainValue), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);

    if (this.onSubtitle) this.onSubtitle('⚡ Energizer Power Active!');
  }

  public playEatGhost(): void {
    if (this.muted || !this.sfxEnabled) return;
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

      const gainValue = 0.15 * this.masterVol * this.sfxVol;
      gain.gain.setValueAtTime(Math.max(0.0001, gainValue), start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(start);
      osc.stop(start + 0.07);
    });

    if (this.onSubtitle) this.onSubtitle('👻 Ghost Devoured (+Points!)');
  }

  public playDeath(): void {
    if (this.muted || !this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.7);

    const gainValue = 0.25 * this.masterVol * this.sfxVol;
    gain.gain.setValueAtTime(Math.max(0.0001, gainValue), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);

    if (this.onSubtitle) this.onSubtitle('💀 Pac-Man Caught!');
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

      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 2.5;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 60;
      lfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc.frequency);
      lfo.start();

      this.sirenGain.gain.value = this.muted ? 0 : 0.04 * this.masterVol * this.musicVol;

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);

      this.sirenOsc.start();
      this.isSirenPlaying = true;
    } catch {
      // Ignored
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
    if (this.muted || !this.sfxEnabled) return;
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

      const gainValue = 0.2 * this.masterVol * this.sfxVol;
      gain.gain.setValueAtTime(Math.max(0.0001, gainValue), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.d);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + note.d + 0.05);

      t += note.d + 0.03;
    });

    if (this.onSubtitle) this.onSubtitle('🎉 Level Victory Fanfare!');
  }
}
