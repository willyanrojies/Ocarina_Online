export const DEFAULT_AMBIENT_VOLUME = 0.5;
export const AMBIENT_VOLUME_STORAGE_KEY = 'ocarina-online:ambient-volume:v1';

/**
 * Ganho máximo master aplicado ao som ambiente noturno com o controle em 100%.
 * Calibrado para que, mesmo no máximo — e especialmente no padrão de 50% —,
 * o ambiente permaneça suave e acolhedor sob a voz principal da ocarina.
 */
export const MAX_AMBIENT_MASTER_GAIN = 0.32;

export const AMBIENT_LAYER_DEFAULTS = {
  wind: 0.13,
  water: 0.11,
  crickets: 0.095,
  nightAir: 0.065,
} as const;

export type AmbientLayerName = keyof typeof AMBIENT_LAYER_DEFAULTS;

export function clampAmbientVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_AMBIENT_VOLUME;
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

/**
 * Mapeamento perceptual de ganho para o controle deslizante de volume ambiente [0..1].
 * Retorna 0 exato quando silenciado/zerado para permitir silenciar totalmente o ambiente.
 */
export function computeAmbientMasterGain(normalizedVolume: number): number {
  if (!Number.isFinite(normalizedVolume) || normalizedVolume <= 0) return 0;
  const clamped = clampAmbientVolume(normalizedVolume);
  if (clamped <= 0) return 0;
  return MAX_AMBIENT_MASTER_GAIN * Math.pow(clamped, 1.35);
}

/**
 * Aplica crossfade cosseno/seno de potência igual nas primeiras `crossfadeSamples` amostras
 * de um buffer pré-gerado usando uma cauda extra anexada em `loopSamples`,
 * garantindo um loop contínuo em Web Audio sem cliques ou estalos.
 *
 * O tamanho de entrada deve ser `loopSamples + crossfadeSamples`. Retorna um corte limpo de `loopSamples`.
 */
export function makeLoopSeamless(
  samplesWithTail: Float32Array,
  crossfadeSamples: number,
): Float32Array {
  const overlap = Math.max(0, Math.min(crossfadeSamples, Math.floor(samplesWithTail.length / 3)));
  const loopLen = samplesWithTail.length - overlap;
  const out = new Float32Array(loopLen);
  out.set(samplesWithTail.subarray(0, loopLen));

  if (overlap > 0) {
    for (let i = 0; i < overlap; i++) {
      const t = (i + 0.5) / overlap;
      const headWeight = Math.sin(t * Math.PI * 0.5);
      const tailWeight = Math.cos(t * Math.PI * 0.5);
      out[i] = samplesWithTail[i] * headWeight + samplesWithTail[loopLen + i] * tailWeight;
    }
  }
  return out;
}

export function computeNextCricketDelayMs(randomFn: () => number = Math.random): number {
  const r = Math.max(0, Math.min(0.999999, randomFn()));
  // Pausa ocasional mais longa entre cantos distantes de grilos para um ritmo noturno orgânico
  if (r > 0.82) {
    return Math.round(2800 + (r - 0.82) * 8500);
  }
  return Math.round(950 + r * 2100);
}

export function loadSavedAmbientVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_AMBIENT_VOLUME;
  try {
    const raw = window.localStorage.getItem(AMBIENT_VOLUME_STORAGE_KEY);
    if (raw === null) return DEFAULT_AMBIENT_VOLUME;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_AMBIENT_VOLUME;
    return clampAmbientVolume(parsed);
  } catch {
    return DEFAULT_AMBIENT_VOLUME;
  }
}

export function saveAmbientVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AMBIENT_VOLUME_STORAGE_KEY, String(clampAmbientVolume(volume)));
  } catch {
    // Ignora erros de armazenamento dentro de iframes restritos
  }
}

interface AmbientGraph {
  ctx: AudioContext;
  masterGain: GainNode;
  layerGains: Record<AmbientLayerName, GainNode>;
  waterBuffer: AudioBuffer;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
}

/**
 * Motor de Ambiência Noturna de Vila inspirado no Nintendo 64.
 * Sintetiza 4 camadas atmosféricas independentes em volume suave:
 * - Grilos (cantos estéreo com filtragem retrô acolhedora e intervalos orgânicos)
 * - Vento (brisa noturna lenta passando pelos telhados)
 * - Água (marola suave do canal/riacho junto ao píer)
 * - Ar noturno (base espacial grave aconchegante e marola suave ocasional)
 *
 * Opera de forma totalmente independente do OcarinaAudioEngine para nunca alterar
 * a reprodução, o volume ou os efeitos da ocarina.
 */
export class NocturnalAmbienceEngine {
  private graph: AmbientGraph | null = null;
  private volume = DEFAULT_AMBIENT_VOLUME;
  private started = false;
  private disposed = false;
  private cricketTimerId: number | null = null;
  private lapTimerId: number | null = null;
  private pendingCtx: AudioContext | null = null;
  private unlockCleanup: (() => void) | null = null;
  private cricketSpotIndex = 0;
  private readonly onRunningChange?: (running: boolean) => void;

  constructor(
    initialVolume: number = DEFAULT_AMBIENT_VOLUME,
    onRunningChange?: (running: boolean) => void,
  ) {
    this.volume = clampAmbientVolume(initialVolume);
    this.onRunningChange = onRunningChange;
  }

  isStarted(): boolean {
    return this.started;
  }

  isRunning(): boolean {
    return this.graph !== null && this.graph.ctx.state === 'running';
  }

  getVolume(): number {
    return this.volume;
  }

  private getAudioContextConstructor(): typeof AudioContext | null {
    if (typeof window === 'undefined') return null;
    return (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
      null
    );
  }

  private hasUserActivation(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } })
      .userActivation;
    return Boolean(ua?.hasBeenActive);
  }

  private hasAutoplayPermission(): boolean {
    if (this.hasUserActivation()) return true;
    if (typeof navigator === 'undefined') return false;
    const navWithPolicy = navigator as Navigator & {
      getAutoplayPolicy?: (type: string) => string;
    };
    try {
      return navWithPolicy.getAutoplayPolicy?.('audiocontext') === 'allowed';
    } catch {
      return false;
    }
  }

  setVolume(value: number): void {
    this.volume = clampAmbientVolume(value);
    if (this.started && !this.disposed && !this.graph && this.volume > 0 && this.hasAutoplayPermission()) {
      this.initAudioGraph();
    }
    if (!this.graph) return;

    const { ctx, masterGain } = this.graph;
    if (ctx.state === 'suspended' && this.volume > 0 && this.hasAutoplayPermission()) {
      void ctx.resume().catch(() => {});
    }
    const targetGain = computeAmbientMasterGain(this.volume);
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.045);

    if (this.volume > 0 && ctx.state === 'running') {
      if (this.cricketTimerId === null) {
        this.scheduleNextCricket(500);
      }
      if (this.lapTimerId === null) {
        this.scheduleNextHarborLap(2200);
      }
    }
  }

  start(): void {
    if (this.started) return;
    if (!this.getAudioContextConstructor()) return;

    this.disposed = false;
    this.started = true;

    if (this.hasAutoplayPermission()) {
      this.initAudioGraph();
      return;
    }

    // Mesmo quando navigator.userActivation.hasBeenActive é falso (nova aba/iframe),
    // alguns navegadores já permitem autoplay. Testa um AudioContext sem chamar
    // resume() ou iniciar nós para começar imediatamente se já estiver rodando, sem avisos no console.
    this.probeOrDeferAudioContext();
  }

  /**
   * Chamado quando outra mídia de abertura (como a música inicial) inicia em autoplay com sucesso,
   * confirmando que o navegador permite áudio imediato sem exigir clique manual.
   */
  unlockOnAutoplaySuccess(): void {
    if (this.disposed || !this.started) return;
    if (!this.graph) {
      this.initAudioGraph(true);
      return;
    }
    const { ctx } = this.graph;
    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          if (!this.disposed && ctx.state === 'running') {
            this.detachAutoplayUnlockListeners();
            this.onContextRunning();
          }
        })
        .catch(() => {});
    }
  }

  private probeOrDeferAudioContext(): void {
    if (this.disposed || this.graph || this.pendingCtx) return;
    const AudioCtx = this.getAudioContextConstructor();
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'running') {
      this.attachRunningContext(ctx);
      return;
    }

    this.pendingCtx = ctx;
    this.attachAutoplayUnlockListeners();
  }

  private attachRunningContext(ctx: AudioContext): void {
    if (this.disposed || this.graph) return;
    this.pendingCtx = null;
    const graph = this.buildAudioGraph(ctx);
    this.graph = graph;
    this.detachAutoplayUnlockListeners();
    this.onContextRunning();
  }

  private initAudioGraph(attemptResume = false): void {
    if (this.disposed || this.graph) return;
    const AudioCtx = this.getAudioContextConstructor();
    if (!AudioCtx) return;

    const ctx = this.pendingCtx ?? new AudioCtx();
    this.pendingCtx = null;

    const graph = this.buildAudioGraph(ctx);
    this.graph = graph;

    if (ctx.state === 'running') {
      this.detachAutoplayUnlockListeners();
      this.onContextRunning();
    } else {
      this.attachAutoplayUnlockListeners();
      if (attemptResume || this.hasAutoplayPermission()) {
        void ctx
          .resume()
          .then(() => {
            if (!this.disposed && ctx.state === 'running') {
              this.detachAutoplayUnlockListeners();
              this.onContextRunning();
            }
          })
          .catch(() => {});
      }
    }
  }

  private onContextRunning(): void {
    if (this.disposed || !this.graph) return;
    const { ctx, masterGain } = this.graph;
    const now = ctx.currentTime;
    const target = computeAmbientMasterGain(this.volume);
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(0, masterGain.gain.value), now);
    masterGain.gain.linearRampToValueAtTime(target, now + 1.15);
    this.onRunningChange?.(true);

    if (this.volume > 0) {
      if (this.cricketTimerId === null) {
        this.scheduleNextCricket(650);
      }
      if (this.lapTimerId === null) {
        this.scheduleNextHarborLap(2400);
      }
    }
  }

  private attachAutoplayUnlockListeners(): void {
    if (this.unlockCleanup || typeof window === 'undefined') return;

    const handleGesture = () => {
      if (this.disposed) {
        this.detachAutoplayUnlockListeners();
        return;
      }

      if (!this.graph) {
        this.initAudioGraph(true);
        return;
      }

      const { ctx } = this.graph;
      if (ctx.state === 'suspended') {
        void ctx
          .resume()
          .then(() => {
            if (!this.disposed && ctx.state === 'running') {
              this.detachAutoplayUnlockListeners();
              this.onContextRunning();
            }
          })
          .catch(() => {});
      } else if (ctx.state === 'running') {
        this.detachAutoplayUnlockListeners();
        this.onContextRunning();
      }
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'mousedown'] as const;
    events.forEach((evt) => window.addEventListener(evt, handleGesture, { capture: true, passive: true }));

    this.unlockCleanup = () => {
      events.forEach((evt) => window.removeEventListener(evt, handleGesture, { capture: true }));
    };
  }

  private detachAutoplayUnlockListeners(): void {
    if (this.unlockCleanup) {
      this.unlockCleanup();
      this.unlockCleanup = null;
    }
  }

  private buildAudioGraph(ctx: AudioContext): AmbientGraph {
    const sources: AudioScheduledSourceNode[] = [];
    const nodes: AudioNode[] = [];

    // A saída master começa muda para que o fade-in no desbloqueio do contexto seja livre de cliques
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    // Estágio de calor nostálgico estilo N64: corte suave de subgraves + rolagem clássica de DAC 22kHz
    const warmthHP = ctx.createBiquadFilter();
    warmthHP.type = 'highpass';
    warmthHP.frequency.value = 55;
    warmthHP.Q.value = 0.6;

    const warmthLP = ctx.createBiquadFilter();
    warmthLP.type = 'lowpass';
    warmthLP.frequency.value = 3900;
    warmthLP.Q.value = 0.55;

    // Reflexão espacial sutil da vila ao ar livre
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.90;

    const airDelay = ctx.createDelay(0.5);
    airDelay.delayTime.value = 0.145;
    const airFeedback = ctx.createGain();
    airFeedback.gain.value = 0.18;
    const airDamping = ctx.createBiquadFilter();
    airDamping.type = 'lowpass';
    airDamping.frequency.value = 1550;
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.14;

    warmthHP.connect(warmthLP);
    warmthLP.connect(dryGain);
    dryGain.connect(masterGain);

    warmthLP.connect(airDelay);
    airDelay.connect(airDamping);
    airDamping.connect(airFeedback);
    airFeedback.connect(airDelay);
    airDamping.connect(wetGain);
    wetGain.connect(masterGain);

    masterGain.connect(ctx.destination);

    // Nós de ganho independentes por camada alimentando o barramento acolhedor estilo N64
    const windGain = ctx.createGain();
    windGain.gain.value = AMBIENT_LAYER_DEFAULTS.wind;
    windGain.connect(warmthHP);

    const waterGain = ctx.createGain();
    waterGain.gain.value = AMBIENT_LAYER_DEFAULTS.water;
    waterGain.connect(warmthHP);

    const cricketGain = ctx.createGain();
    cricketGain.gain.value = AMBIENT_LAYER_DEFAULTS.crickets;
    cricketGain.connect(warmthHP);

    const nightAirGain = ctx.createGain();
    nightAirGain.gain.value = AMBIENT_LAYER_DEFAULTS.nightAir;
    nightAirGain.connect(warmthHP);

    nodes.push(
      masterGain,
      warmthHP,
      warmthLP,
      dryGain,
      airDelay,
      airFeedback,
      airDamping,
      wetGain,
      windGain,
      waterGain,
      cricketGain,
      nightAirGain,
    );

    // 1. Camada de Vento Noturno Suave (brisa rosa/marrom contínua de 8,2s com modulação lenta)
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.createWindBuffer(ctx, 8.2);
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 250;
    windFilter.Q.value = 0.75;

    const windFilterLfo = ctx.createOscillator();
    windFilterLfo.type = 'sine';
    windFilterLfo.frequency.value = 0.067;
    const windFilterDepth = ctx.createGain();
    windFilterDepth.gain.value = 115;
    windFilterLfo.connect(windFilterDepth);
    windFilterDepth.connect(windFilter.frequency);

    const windSwellGain = ctx.createGain();
    windSwellGain.gain.value = 0.82;
    const windAmpLfo = ctx.createOscillator();
    windAmpLfo.type = 'sine';
    windAmpLfo.frequency.value = 0.113;
    const windAmpDepth = ctx.createGain();
    windAmpDepth.gain.value = 0.22;
    windAmpLfo.connect(windAmpDepth);
    windAmpDepth.connect(windSwellGain.gain);

    const windPan = this.createOptionalPanner(ctx, -0.10);
    windSrc.connect(windFilter);
    windFilter.connect(windSwellGain);
    if (windPan) {
      windSwellGain.connect(windPan);
      windPan.connect(windGain);
      nodes.push(windPan);
    } else {
      windSwellGain.connect(windGain);
    }

    windSrc.start();
    windFilterLfo.start();
    windAmpLfo.start();
    sources.push(windSrc, windFilterLfo, windAmpLfo);
    nodes.push(windFilter, windFilterDepth, windSwellGain, windAmpDepth);

    // 2. Camada de Água Suave do Canal / Riacho (loop primo de 7,3s, corpo grave + filete suave)
    const waterBuffer = this.createWaterBuffer(ctx, 7.3);
    const waterSrc = ctx.createBufferSource();
    waterSrc.buffer = waterBuffer;
    waterSrc.loop = true;

    const waterBodyBP = ctx.createBiquadFilter();
    waterBodyBP.type = 'bandpass';
    waterBodyBP.frequency.value = 390;
    waterBodyBP.Q.value = 0.85;

    const waterTrickleBP = ctx.createBiquadFilter();
    waterTrickleBP.type = 'bandpass';
    waterTrickleBP.frequency.value = 1080;
    waterTrickleBP.Q.value = 1.45;

    const waterTrickleGain = ctx.createGain();
    waterTrickleGain.gain.value = 0.42;

    const waterModLfo = ctx.createOscillator();
    waterModLfo.type = 'sine';
    waterModLfo.frequency.value = 0.17;
    const waterModDepth = ctx.createGain();
    waterModDepth.gain.value = 160;
    waterModLfo.connect(waterModDepth);
    waterModDepth.connect(waterTrickleBP.frequency);

    const waterSoftCap = ctx.createBiquadFilter();
    waterSoftCap.type = 'lowpass';
    waterSoftCap.frequency.value = 2150;
    waterSoftCap.Q.value = 0.6;

    const waterPan = this.createOptionalPanner(ctx, -0.26);
    waterSrc.connect(waterBodyBP);
    waterSrc.connect(waterTrickleBP);
    waterBodyBP.connect(waterSoftCap);
    waterTrickleBP.connect(waterTrickleGain);
    waterTrickleGain.connect(waterSoftCap);

    if (waterPan) {
      waterSoftCap.connect(waterPan);
      waterPan.connect(waterGain);
      nodes.push(waterPan);
    } else {
      waterSoftCap.connect(waterGain);
    }

    waterSrc.start();
    waterModLfo.start();
    sources.push(waterSrc, waterModLfo);
    nodes.push(waterBodyBP, waterTrickleBP, waterTrickleGain, waterModDepth, waterSoftCap);

    // 3. Base Silenciosa de Ar Noturno no Porto (ressonância profunda de 11,1s, não musical)
    const airSrc = ctx.createBufferSource();
    airSrc.buffer = this.createWindBuffer(ctx, 11.1);
    airSrc.loop = true;

    const airBP = ctx.createBiquadFilter();
    airBP.type = 'lowpass';
    airBP.frequency.value = 145;
    airBP.Q.value = 0.65;

    airSrc.connect(airBP);
    airBP.connect(nightAirGain);
    airSrc.start();
    sources.push(airSrc);
    nodes.push(airBP);

    return {
      ctx,
      masterGain,
      layerGains: {
        wind: windGain,
        water: waterGain,
        crickets: cricketGain,
        nightAir: nightAirGain,
      },
      waterBuffer,
      sources,
      nodes,
    };
  }

  private createOptionalPanner(ctx: AudioContext, panValue: number): StereoPannerNode | null {
    if (typeof ctx.createStereoPanner !== 'function') return null;
    const panner = ctx.createStereoPanner();
    panner.pan.value = panValue;
    return panner;
  }

  private createWindBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const loopSamples = Math.floor(sampleRate * durationSec);
    const crossfadeSamples = Math.floor(sampleRate * 0.9);
    const raw = new Float32Array(loopSamples + crossfadeSamples);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < raw.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.9965 * b0 + white * 0.045;
      b1 = 0.985 * b1 + b0 * 0.095;
      b2 = 0.92 * b2 + b1 * 0.14;
      raw[i] = Math.max(-0.9, Math.min(0.9, b2 * 2.1));
    }

    const seamless = makeLoopSeamless(raw, crossfadeSamples);
    const buffer = ctx.createBuffer(1, seamless.length, sampleRate);
    buffer.getChannelData(0).set(seamless);
    return buffer;
  }

  private createWaterBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const loopSamples = Math.floor(sampleRate * durationSec);
    const crossfadeSamples = Math.floor(sampleRate * 0.85);
    const raw = new Float32Array(loopSamples + crossfadeSamples);

    let pink0 = 0;
    let pink1 = 0;
    let dropletAmp = 0;
    let dropletPhase = 0;
    let dropletStep = 0;

    for (let i = 0; i < raw.length; i++) {
      const white = Math.random() * 2 - 1;
      pink0 = 0.982 * pink0 + white * 0.09;
      pink1 = 0.91 * pink1 + pink0 * 0.25;

      // Ressonância ocasional de micro-ondulação suave mesclada ao fluxo contínuo
      if (dropletAmp < 0.002 && Math.random() < 0.0007) {
        dropletAmp = 0.09 + Math.random() * 0.12;
        dropletPhase = 0;
        const freq = 520 + Math.random() * 640;
        dropletStep = (Math.PI * 2 * freq) / sampleRate;
      }

      const droplet = dropletAmp > 0.0005 ? Math.sin(dropletPhase) * dropletAmp : 0;
      dropletPhase += dropletStep;
      dropletAmp *= 0.9965;

      raw[i] = Math.max(-0.9, Math.min(0.9, pink1 * 0.85 + droplet));
    }

    const seamless = makeLoopSeamless(raw, crossfadeSamples);
    const buffer = ctx.createBuffer(1, seamless.length, sampleRate);
    buffer.getChannelData(0).set(seamless);
    return buffer;
  }

  private scheduleNextCricket(explicitDelayMs?: number): void {
    if (this.disposed || typeof window === 'undefined') return;
    const delayMs = explicitDelayMs ?? computeNextCricketDelayMs();
    this.cricketTimerId = window.setTimeout(() => {
      this.cricketTimerId = null;
      if (this.disposed || !this.graph) return;
      if (this.graph.ctx.state === 'running' && this.volume > 0) {
        this.triggerRetroCricketPhrase();
      }
      this.scheduleNextCricket();
    }, delayMs);
  }

  private triggerRetroCricketPhrase(): void {
    if (!this.graph || this.disposed) return;
    const { ctx, layerGains } = this.graph;
    const now = ctx.currentTime + 0.02;

    // Alterna suavemente entre 3 distâncias/ângulos da vila para profundidade noturna espacial estilo N64
    const spots = [
      { pan: -0.46, gain: 0.92, baseFreq: 3720 },
      { pan: 0.42, gain: 0.72, baseFreq: 3940 },
      { pan: -0.16, gain: 0.54, baseFreq: 3580 },
    ];
    const spot = spots[this.cricketSpotIndex % spots.length];
    this.cricketSpotIndex++;

    const pulseCount = Math.random() > 0.35 ? 4 : 3;
    const pulseOnSec = 0.032;
    const pulseGapSec = 0.024;
    const totalPhraseSec = pulseCount * (pulseOnSec + pulseGapSec) + 0.05;

    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = spot.baseFreq + (Math.random() - 0.5) * 70;

    const oscB = ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.value = oscA.frequency.value * 1.045;

    const oscBScale = ctx.createGain();
    oscBScale.gain.value = 0.24;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = oscA.frequency.value;
    bp.Q.value = 2.4;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);

    for (let p = 0; p < pulseCount; p++) {
      const start = now + p * (pulseOnSec + pulseGapSec);
      const peak = 0.28 * spot.gain;
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(peak, start + 0.007);
      env.gain.setValueAtTime(peak, start + pulseOnSec - 0.008);
      env.gain.linearRampToValueAtTime(0.0001, start + pulseOnSec);
    }

    const panner = this.createOptionalPanner(ctx, spot.pan);
    oscA.connect(bp);
    oscB.connect(oscBScale);
    oscBScale.connect(bp);
    bp.connect(env);
    if (panner) {
      env.connect(panner);
      panner.connect(layerGains.crickets);
    } else {
      env.connect(layerGains.crickets);
    }

    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + totalPhraseSec);
    oscB.stop(now + totalPhraseSec);
  }

  private scheduleNextHarborLap(explicitDelayMs?: number): void {
    if (this.disposed || typeof window === 'undefined') return;
    const delayMs = explicitDelayMs ?? Math.round(5200 + Math.random() * 5800);
    this.lapTimerId = window.setTimeout(() => {
      this.lapTimerId = null;
      if (this.disposed || !this.graph) return;
      if (this.graph.ctx.state === 'running' && this.volume > 0) {
        this.triggerSoftWaterLap();
      }
      this.scheduleNextHarborLap();
    }, delayMs);
  }

  private triggerSoftWaterLap(): void {
    if (!this.graph || this.disposed) return;
    const { ctx, layerGains, waterBuffer } = this.graph;
    const now = ctx.currentTime + 0.03;
    const dur = 1.6;

    // Marola suave grave-média da água contra o muro de pedra do canal (reutiliza buffer contínuo pré-gerado)
    const src = ctx.createBufferSource();
    src.buffer = waterBuffer;
    src.loop = true;
    const offset = Math.random() * Math.max(0.1, waterBuffer.duration - dur - 0.1);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(260, now);
    bp.frequency.exponentialRampToValueAtTime(480, now + dur * 0.45);
    bp.frequency.exponentialRampToValueAtTime(220, now + dur);
    bp.Q.value = 1.8;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.35, now + dur * 0.42);
    env.gain.linearRampToValueAtTime(0.0001, now + dur);

    const panner = this.createOptionalPanner(ctx, -0.34);
    src.connect(bp);
    bp.connect(env);
    if (panner) {
      env.connect(panner);
      panner.connect(layerGains.nightAir);
    } else {
      env.connect(layerGains.nightAir);
    }

    src.start(now, offset);
    src.stop(now + dur + 0.05);
  }

  dispose(): void {
    this.disposed = true;
    this.started = false;
    this.detachAutoplayUnlockListeners();
    this.onRunningChange?.(false);

    if (this.cricketTimerId !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.cricketTimerId);
      this.cricketTimerId = null;
    }
    if (this.lapTimerId !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.lapTimerId);
      this.lapTimerId = null;
    }

    if (this.pendingCtx) {
      void this.pendingCtx.close().catch(() => {});
      this.pendingCtx = null;
    }

    if (this.graph) {
      for (const src of this.graph.sources) {
        try {
          src.stop();
        } catch {
          // Ignora nós que já foram interrompidos
        }
        try {
          src.disconnect();
        } catch {
          // Ignora erros de desconexão
        }
      }
      for (const node of this.graph.nodes) {
        try {
          node.disconnect();
        } catch {
          // Ignora erros de desconexão
        }
      }
      void this.graph.ctx.close().catch(() => {});
      this.graph = null;
    }
  }
}
