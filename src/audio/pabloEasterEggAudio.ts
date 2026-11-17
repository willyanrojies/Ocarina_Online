import { PABLO_EASTER_EGG_MUSIC_PATH } from '../state/pabloEasterEgg';

const EASTER_EGG_BGM_MAX_VOLUME = 0.22;

/**
 * Controla a música suave de fundo e os efeitos sonoros de digitação estilo N64
 * exclusivamente para o Easter Egg do Pablo, sem alterar o motor da ocarina.
 */
export class PabloEasterEggAudioEngine {
  private ctx: AudioContext | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private fadeTimer: number | null = null;
  private disposed = false;

  private ensureAudioContext(): AudioContext | null {
    if (this.disposed || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        this.ctx = new Ctor();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private clearFade(): void {
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  public startMusic(): void {
    if (this.disposed || typeof window === 'undefined') return;
    this.clearFade();

    if (!this.audioEl) {
      const el = new Audio(PABLO_EASTER_EGG_MUSIC_PATH);
      el.loop = true;
      el.preload = 'auto';
      this.audioEl = el;
    }

    const el = this.audioEl;
    el.currentTime = 0;
    el.volume = 0;
    void el.play().catch(() => {});

    const startedAt = performance.now();
    this.fadeTimer = window.setInterval(() => {
      if (this.disposed || !this.audioEl) {
        this.clearFade();
        return;
      }
      const t = Math.min(1, (performance.now() - startedAt) / 1100);
      this.audioEl.volume = t * EASTER_EGG_BGM_MAX_VOLUME;
      if (t >= 1) {
        this.clearFade();
      }
    }, 30);
  }

  public stopMusic(immediate = false): void {
    this.clearFade();
    const el = this.audioEl;
    if (!el) return;

    if (immediate || typeof window === 'undefined') {
      el.pause();
      el.volume = 0;
      return;
    }

    const startVol = el.volume;
    const startedAt = performance.now();
    this.fadeTimer = window.setInterval(() => {
      if (!this.audioEl) {
        this.clearFade();
        return;
      }
      const t = Math.min(1, (performance.now() - startedAt) / 900);
      this.audioEl.volume = Math.max(0, startVol * (1 - t));
      if (t >= 1) {
        this.clearFade();
        this.audioEl.pause();
      }
    }, 30);
  }

  /**
   * Efeito sonoro clássico de máquina de escrever estilo N64 (pulso triangular curto e abafado).
   */
  public playTypewriterTick(charIndex: number): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    // Cadência orgânica sutil de texto estilo N64 entre 640-720Hz
    const baseFreq = 640 + ((charIndex * 37) % 4) * 26;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.82, now + 0.042);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1450, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.052);
  }

  public dispose(): void {
    this.disposed = true;
    this.stopMusic(true);
    this.audioEl = null;
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
