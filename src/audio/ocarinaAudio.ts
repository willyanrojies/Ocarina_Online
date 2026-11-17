import { NOTE_BY_ID, type NoteId } from './ocarinaNotes';

export interface OcarinaSampleBank {
  /** Busca opcional futura de buffer de áudio real por ID da nota */
  getBuffer(noteId: NoteId): AudioBuffer | null;
}

interface ActiveVoice {
  stop: (immediate?: boolean) => void;
}

/**
 * Sintetizador de Ocarina via Web Audio API.
 * Projetado com gancho extensível de banco de samples para que gravações reais
 * possam ser adicionadas futuramente sem alterar a interface ou a cena 3D.
 */
export class OcarinaAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private breathNoiseBuffer: AudioBuffer | null = null;
  private activeVoices = new Map<NoteId, ActiveVoice>();
  private sampleBank: OcarinaSampleBank | null = null;
  private volume = 0.7;
  private muted = false;

  setSampleBank(bank: OcarinaSampleBank | null): void {
    this.sampleBank = bank;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain && this.ctx) {
      const target = this.muted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      const target = this.muted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      // Modelagem passa-baixa acolhedora + cauda sutil de reverberação de câmara via delay com feedback
      const warmthFilter = this.ctx.createBiquadFilter();
      warmthFilter.type = 'lowpass';
      warmthFilter.frequency.value = 3400;
      warmthFilter.Q.value = 0.65;

      const dryGain = this.ctx.createGain();
      dryGain.gain.value = 0.86;

      const delayNode = this.ctx.createDelay(0.5);
      delayNode.delayTime.value = 0.14;
      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.value = 0.22;
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1800;
      const wetGain = this.ctx.createGain();
      wetGain.gain.value = 0.18;

      this.masterGain.connect(warmthFilter);
      warmthFilter.connect(dryGain);
      dryGain.connect(this.ctx.destination);

      warmthFilter.connect(delayNode);
      delayNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayFilter.connect(wetGain);
      wetGain.connect(this.ctx.destination);

      this.breathNoiseBuffer = this.createBreathNoiseBuffer(this.ctx);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private createBreathNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 1.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Ruído de sopro suave em espectro rosa/marrom
      lastOut = (lastOut + 0.08 * white) / 1.08;
      data[i] = lastOut * 2.4;
    }
    return buffer;
  }

  startNote(noteId: NoteId): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    // Para de forma limpa qualquer voz anterior da mesma nota
    const existing = this.activeVoices.get(noteId);
    if (existing) {
      existing.stop(true);
      this.activeVoices.delete(noteId);
    }

    const spec = NOTE_BY_ID[noteId];
    const now = ctx.currentTime;

    // Caminho opcional futuro para reprodução de sample gravado
    const sampleBuffer = this.sampleBank?.getBuffer(noteId);
    if (sampleBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = sampleBuffer;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.45, now + 0.03);
      source.connect(env);
      env.connect(this.masterGain);
      source.start(now);

      let stopped = false;
      this.activeVoices.set(noteId, {
        stop: (immediate = false) => {
          if (stopped) return;
          stopped = true;
          const t = ctx.currentTime;
          env.gain.cancelScheduledValues(t);
          env.gain.setValueAtTime(Math.max(0.0001, env.gain.value), t);
          env.gain.exponentialRampToValueAtTime(0.0001, t + (immediate ? 0.03 : 0.14));
          source.stop(t + (immediate ? 0.04 : 0.16));
        },
      });
      return;
    }

    // Síntese Acústica Procedural da Ocarina:
    // 1. Fundamental da câmara (senoidal pura e quente)
    const fundamental = ctx.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(spec.frequency * 0.985, now);
    fundamental.frequency.exponentialRampToValueAtTime(spec.frequency, now + 0.032);

    // 2. 2º harmônico oco suave (timbre característico de ocarina de cerâmica/barro)
    const overtone = ctx.createOscillator();
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(spec.frequency * 2, now);

    // 3. 3º harmônico sutil de ataque (chiff do sopro)
    const chiffHarmonic = ctx.createOscillator();
    chiffHarmonic.type = 'sine';
    chiffHarmonic.frequency.setValueAtTime(spec.frequency * 3, now);

    // 4. Vibrato natural suave de sopro após o ataque inicial
    const vibratoLfo = ctx.createOscillator();
    vibratoLfo.type = 'sine';
    vibratoLfo.frequency.value = 5.2;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.setValueAtTime(0, now);
    vibratoDepth.gain.linearRampToValueAtTime(spec.frequency * 0.006, now + 0.25);
    vibratoLfo.connect(vibratoDepth);
    vibratoDepth.connect(fundamental.frequency);
    vibratoDepth.connect(overtone.frequency);

    // Ganhos de mixagem das vozes
    const fundGain = ctx.createGain();
    fundGain.gain.value = 0.78;

    const overGain = ctx.createGain();
    overGain.gain.value = 0.11;

    const chiffGain = ctx.createGain();
    chiffGain.gain.setValueAtTime(0.08, now);
    chiffGain.gain.exponentialRampToValueAtTime(0.008, now + 0.09);

    // Fluxo de ar do sopro filtrado por passa-faixa
    let noiseSrc: AudioBufferSourceNode | null = null;
    const breathGain = ctx.createGain();
    if (this.breathNoiseBuffer) {
      noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.breathNoiseBuffer;
      noiseSrc.loop = true;

      const breathFilter = ctx.createBiquadFilter();
      breathFilter.type = 'bandpass';
      breathFilter.frequency.value = Math.min(4200, spec.frequency * 1.45);
      breathFilter.Q.value = 2.6;

      breathGain.gain.setValueAtTime(0.0001, now);
      breathGain.gain.linearRampToValueAtTime(0.085, now + 0.025);
      breathGain.gain.exponentialRampToValueAtTime(0.025, now + 0.14);

      noiseSrc.connect(breathFilter);
      breathFilter.connect(breathGain);
    }

    // Envelope ADSR principal sem estalos (cliques)
    const voiceEnv = ctx.createGain();
    voiceEnv.gain.setValueAtTime(0.0001, now);
    voiceEnv.gain.linearRampToValueAtTime(0.42, now + 0.036);
    voiceEnv.gain.setTargetAtTime(0.32, now + 0.05, 0.08);

    fundamental.connect(fundGain);
    overtone.connect(overGain);
    chiffHarmonic.connect(chiffGain);
    fundGain.connect(voiceEnv);
    overGain.connect(voiceEnv);
    chiffGain.connect(voiceEnv);
    breathGain.connect(voiceEnv);
    voiceEnv.connect(this.masterGain);

    fundamental.start(now);
    overtone.start(now);
    chiffHarmonic.start(now);
    vibratoLfo.start(now);
    noiseSrc?.start(now);

    let stopped = false;
    this.activeVoices.set(noteId, {
      stop: (immediate = false) => {
        if (stopped) return;
        stopped = true;
        const releaseSec = immediate ? 0.035 : 0.16;
        const t = ctx.currentTime;
        voiceEnv.gain.cancelScheduledValues(t);
        voiceEnv.gain.setValueAtTime(Math.max(0.0001, voiceEnv.gain.value), t);
        voiceEnv.gain.exponentialRampToValueAtTime(0.0001, t + releaseSec);

        const stopAt = t + releaseSec + 0.02;
        fundamental.stop(stopAt);
        overtone.stop(stopAt);
        chiffHarmonic.stop(stopAt);
        vibratoLfo.stop(stopAt);
        noiseSrc?.stop(stopAt);
      },
    });
  }

  stopNote(noteId: NoteId): void {
    const voice = this.activeVoices.get(noteId);
    if (voice) {
      voice.stop(false);
      this.activeVoices.delete(noteId);
    }
  }

  stopAll(): void {
    for (const voice of this.activeVoices.values()) {
      voice.stop(true);
    }
    this.activeVoices.clear();
  }

  playBubblePop(pitchMultiplier = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const scale = Math.max(0.65, Math.min(1.5, pitchMultiplier));

    // Varredura ressonante ascendente para um som nítido de bolha d'água
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280 * scale, now);
    osc.frequency.exponentialRampToValueAtTime(840 * scale, now + 0.052);

    // Brilho harmônico sutil no estilo clássico de bolha de menu de Nintendo 64
    const overtone = ctx.createOscillator();
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(560 * scale, now);
    overtone.frequency.exponentialRampToValueAtTime(1420 * scale, now + 0.045);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(0.24, now + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.072);

    const overGain = ctx.createGain();
    overGain.gain.setValueAtTime(0.0001, now);
    overGain.gain.linearRampToValueAtTime(0.07, now + 0.004);
    overGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);

    osc.connect(oscGain);
    overtone.connect(overGain);
    oscGain.connect(ctx.destination);
    overGain.connect(ctx.destination);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 0.082);
    overtone.stop(now + 0.06);
  }

  dispose(): void {
    this.stopAll();
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
