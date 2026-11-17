export const TITLE_MENU_MUSIC_PATH = '/assets/aistudio/Under_Still_Skies_cbbf38e3.mp3';

/**
 * Mantém o mesmo volume suave de fundo do tema do Easter Egg do Pablo (0.22)
 * para que a música inicial seja aconchegante e atmosférica sem assustar.
 */
export const TITLE_MENU_MUSIC_MAX_VOLUME = 0.22;
export const TITLE_MENU_MUSIC_FADE_IN_MS = 950;
export const TITLE_MENU_MUSIC_FADE_OUT_MS = 1500;

export type TitleMenuMusicStatus =
  | 'idle'
  | 'awaiting-unlock'
  | 'playing'
  | 'fading-out'
  | 'stopped';

export interface TitleMusicAudioLike {
  loop: boolean;
  preload: string;
  volume: number;
  currentTime: number;
  paused: boolean;
  play: () => Promise<void> | void;
  pause: () => void;
}

export function computeMenuMusicFadeInVolume(
  elapsedMs: number,
  fadeInMs: number = TITLE_MENU_MUSIC_FADE_IN_MS,
  maxVolume: number = TITLE_MENU_MUSIC_MAX_VOLUME,
): number {
  const safeMax = Math.max(0, Math.min(1, maxVolume));
  if (fadeInMs <= 0) return safeMax;
  const progress = Math.max(0, Math.min(1, elapsedMs / fadeInMs));
  // Curva suave de desaceleração (ease-out) para entrada gentil
  const eased = 1 - Math.pow(1 - progress, 2);
  return Math.max(0, Math.min(safeMax, safeMax * eased));
}

export function computeMenuMusicFadeOutVolume(
  startVolume: number,
  elapsedMs: number,
  fadeOutMs: number = TITLE_MENU_MUSIC_FADE_OUT_MS,
): number {
  const safeStart = Math.max(0, Math.min(1, startVolume));
  if (safeStart <= 0 || fadeOutMs <= 0) return 0;
  const progress = Math.max(0, Math.min(1, elapsedMs / fadeOutMs));
  return Math.max(0, safeStart * (1 - progress));
}

function isPlayButtonTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false;
  return Boolean((target as Element).closest('[data-testid="title-play-button"]'));
}

export interface TitleMenuMusicEngineOptions {
  createAudio?: (src: string) => TitleMusicAudioLike;
  onStatusChange?: (status: TitleMenuMusicStatus) => void;
}

/**
 * Controlador independente da música de fundo em loop para a tela inicial do Ocarina Online.
 * Toca suavemente em loop até o jogador clicar em Play, realizando então um fade-out suave
 * para que o jogo siga apenas com o som ambiente noturno e a ocarina.
 */
export class TitleMenuMusicEngine {
  private audioEl: TitleMusicAudioLike | null = null;
  private fadeTimer: number | null = null;
  private unlockCleanup: (() => void) | null = null;
  private shouldPlay = false;
  private disposed = false;
  private status: TitleMenuMusicStatus = 'idle';
  private readonly createAudio: (src: string) => TitleMusicAudioLike;
  private readonly hasCustomFactory: boolean;
  private readonly onStatusChange?: (status: TitleMenuMusicStatus) => void;

  constructor(options: TitleMenuMusicEngineOptions = {}) {
    this.hasCustomFactory = typeof options.createAudio === 'function';
    this.createAudio =
      options.createAudio ??
      ((src: string) => {
        const el = new Audio(src);
        el.loop = true;
        el.preload = 'auto';
        return el;
      });
    this.onStatusChange = options.onStatusChange;
  }

  public getStatus(): TitleMenuMusicStatus {
    return this.status;
  }

  private setStatus(next: TitleMenuMusicStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.onStatusChange?.(next);
  }

  private clearFade(): void {
    if (this.fadeTimer !== null) {
      globalThis.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private detachUnlockListeners(): void {
    if (this.unlockCleanup) {
      this.unlockCleanup();
      this.unlockCleanup = null;
    }
  }

  private attachUnlockListeners(): void {
    if (this.unlockCleanup || this.disposed || typeof window === 'undefined') return;

    const onUnlockGesture = (event: Event) => {
      // Nunca inicia a música de menu no próprio clique do botão Play — Play sai imediatamente do menu.
      if (isPlayButtonTarget(event.target)) {
        return;
      }
      if (!this.shouldPlay || this.disposed) {
        this.detachUnlockListeners();
        return;
      }
      this.attemptPlayback();
    };

    const options: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener('pointerdown', onUnlockGesture, options);
    window.addEventListener('keydown', onUnlockGesture, options);
    window.addEventListener('touchstart', onUnlockGesture, options);

    this.unlockCleanup = () => {
      window.removeEventListener('pointerdown', onUnlockGesture, { capture: true });
      window.removeEventListener('keydown', onUnlockGesture, { capture: true });
      window.removeEventListener('touchstart', onUnlockGesture, { capture: true });
    };
  }

  private startFadeIn(): void {
    if (this.disposed || !this.shouldPlay || !this.audioEl) return;
    this.clearFade();

    const startedAt = Date.now();
    this.audioEl.volume = 0;

    this.fadeTimer = globalThis.setInterval(() => {
      if (this.disposed || !this.shouldPlay || !this.audioEl) {
        this.clearFade();
        return;
      }
      const elapsed = Date.now() - startedAt;
      const nextVolume = computeMenuMusicFadeInVolume(
        elapsed,
        TITLE_MENU_MUSIC_FADE_IN_MS,
        TITLE_MENU_MUSIC_MAX_VOLUME,
      );
      this.audioEl.volume = nextVolume;
      if (elapsed >= TITLE_MENU_MUSIC_FADE_IN_MS) {
        this.audioEl.volume = TITLE_MENU_MUSIC_MAX_VOLUME;
        this.clearFade();
      }
    }, 30) as unknown as number;
  }

  private attemptPlayback(): void {
    if (this.disposed || !this.shouldPlay) return;
    if (typeof window === 'undefined' && !this.hasCustomFactory) return;

    if (!this.audioEl) {
      const el = this.createAudio(TITLE_MENU_MUSIC_PATH);
      el.loop = true;
      el.preload = 'auto';
      el.currentTime = 0;
      el.volume = 0;
      this.audioEl = el;
    }

    const el = this.audioEl;
    el.loop = true;
    el.volume = 0;

    try {
      const result = el.play();
      if (result && typeof (result as Promise<void>).then === 'function') {
        void (result as Promise<void>)
          .then(() => {
            if (this.disposed || !this.shouldPlay) {
              el.pause();
              el.volume = 0;
              return;
            }
            this.detachUnlockListeners();
            this.setStatus('playing');
            this.startFadeIn();
          })
          .catch(() => {
            if (this.disposed || !this.shouldPlay) return;
            this.setStatus('awaiting-unlock');
            this.attachUnlockListeners();
          });
      } else {
        this.detachUnlockListeners();
        this.setStatus('playing');
        this.startFadeIn();
      }
    } catch {
      if (!this.disposed && this.shouldPlay) {
        this.setStatus('awaiting-unlock');
        this.attachUnlockListeners();
      }
    }
  }

  public start(): void {
    if (this.disposed) return;
    this.shouldPlay = true;
    this.attemptPlayback();
  }

  public fadeOutAndStop(durationMs: number = TITLE_MENU_MUSIC_FADE_OUT_MS): void {
    this.shouldPlay = false;
    this.detachUnlockListeners();
    this.clearFade();

    const el = this.audioEl;
    if (!el || el.paused || durationMs <= 0) {
      if (el) {
        el.pause();
        el.currentTime = 0;
        el.volume = 0;
      }
      this.setStatus('stopped');
      return;
    }

    const startVolume = el.volume;
    if (startVolume <= 0.001) {
      el.pause();
      el.currentTime = 0;
      el.volume = 0;
      this.setStatus('stopped');
      return;
    }

    this.setStatus('fading-out');
    const startedAt = Date.now();
    this.fadeTimer = globalThis.setInterval(() => {
      const activeEl = this.audioEl;
      if (!activeEl || this.disposed) {
        this.clearFade();
        return;
      }
      const elapsed = Date.now() - startedAt;
      const nextVolume = computeMenuMusicFadeOutVolume(startVolume, elapsed, durationMs);
      activeEl.volume = nextVolume;
      if (elapsed >= durationMs || nextVolume <= 0) {
        this.clearFade();
        activeEl.pause();
        activeEl.currentTime = 0;
        activeEl.volume = 0;
        this.setStatus('stopped');
      }
    }, 30) as unknown as number;
  }

  public dispose(): void {
    this.disposed = true;
    this.shouldPlay = false;
    this.detachUnlockListeners();
    this.clearFade();
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
      this.audioEl.volume = 0;
      this.audioEl = null;
    }
    this.setStatus('stopped');
  }
}
