import * as THREE from 'three';
import type { OcarinaNoteSpec } from '../audio/ocarinaNotes';
import type { CharacterAnimState } from '../state/simulatorEvents';

export type MusicNoteGlyph = 'eighth' | 'beamed' | 'double' | 'sparkleEighth';

export interface N64MusicColor {
  name: string;
  hex: number;
}

// Cores vibrantes clássicas estilo Nintendo 64 (dourado botão C, ciano N64, verde, carmesim, violeta)
export const N64_MUSIC_COLORS: readonly N64MusicColor[] = [
  { name: 'gold', hex: 0xffde3b },
  { name: 'cyan', hex: 0x3ce6ff },
  { name: 'green', hex: 0x52f578 },
  { name: 'red', hex: 0xff527a },
  { name: 'violet', hex: 0xd085ff },
] as const;

export const MUSIC_GLYPH_TYPES: readonly MusicNoteGlyph[] = [
  'eighth',
  'beamed',
  'sparkleEighth',
  'double',
] as const;

export interface MusicIconVariant {
  glyph: MusicNoteGlyph;
  glyphIndex: number;
  colorHex: number;
}

export function pickMusicIconVariant(
  note: OcarinaNoteSpec | null,
  pulseIndex: number,
  subIndex: number,
): MusicIconVariant {
  const noteSeed = note ? note.row * 5 + note.col : 0;
  const colorIdx = Math.abs(noteSeed + pulseIndex * 2 + subIndex) % N64_MUSIC_COLORS.length;
  const glyphIdx = Math.abs(pulseIndex + subIndex + (note ? note.col : 0)) % MUSIC_GLYPH_TYPES.length;
  return {
    glyph: MUSIC_GLYPH_TYPES[glyphIdx],
    glyphIndex: glyphIdx,
    colorHex: N64_MUSIC_COLORS[colorIdx].hex,
  };
}

export interface MusicParticleFrame {
  opacity: number;
  scale: number;
  swayOffsetX: number;
}

export interface NoteSpawnKinematics {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  vx: number;
  vy: number;
  vz: number;
  lifetime: number;
  baseScale: number;
  swayPhase: number;
  swayAmp: number;
  spinAmp: number;
}

export function computeLeftMusicNoteKinematics(
  spawnCounter: number,
  subIdx: number,
): NoteSpawnKinematics {
  const spreadStep = (spawnCounter * 17) % 5;
  const liftStep = (spawnCounter * 37) % 8;
  const depthStep = (spawnCounter * 13) % 4;
  const lifeStep = (spawnCounter * 19) % 4;
  const sizeStep = (spawnCounter * 11) % 3;

  // Emite estritamente à esquerda da tela (-X) da ocarina, abrindo em leque livre do personagem
  const baseLeftSpeed = 0.38 + spreadStep * 0.06;
  const subLeftBoost = subIdx === 1 ? 0.18 : 0;
  const vx = -(baseLeftSpeed + subLeftBoost);
  const vy = 0.68 + liftStep * 0.032 - (subIdx === 1 ? 0.09 : 0);
  const vz = 0.20 + depthStep * 0.035;

  return {
    offsetX: -0.13 - subIdx * 0.045,
    offsetY: 0.02 + subIdx * 0.025,
    offsetZ: 0.12,
    vx,
    vy,
    vz,
    lifetime: 1.32 + lifeStep * 0.09,
    baseScale: 0.096 + sizeStep * 0.012,
    swayPhase: spawnCounter * 1.3,
    swayAmp: 0.045,
    spinAmp: -0.20,
  };
}

export function computeMusicParticleFrame(
  age: number,
  lifetime: number,
  baseScale: number,
  swayPhase: number,
  swayAmp: number,
): MusicParticleFrame {
  const t = Math.min(1, Math.max(0, age / Math.max(0.001, lifetime)));

  // Aparição rápida e nítida estilo N64 (0.04s), sustentação brilhante e fade-out suave nos últimos 32%
  let opacity = 1;
  if (t < 0.035) {
    opacity = t / 0.035;
  } else if (t > 0.68) {
    opacity = Math.max(0, 1 - (t - 0.68) / 0.32);
  }

  let scaleFactor = 1;
  if (t < 0.14) {
    const p = t / 0.14;
    scaleFactor = 0.72 + 0.44 * Math.sin(p * Math.PI * 0.75);
  } else if (t > 0.75) {
    scaleFactor = 1 - ((t - 0.75) / 0.25) * 0.28;
  }

  const swayOffsetX = Math.sin(age * 4.4 + swayPhase) * swayAmp * t;

  return {
    opacity,
    scale: Math.max(0.01, baseScale * scaleFactor),
    swayOffsetX,
  };
}

export interface EmissionDecision {
  burstCount: number;
  nextStreamTimer: number;
}

export function evaluateMusicEmission(
  state: CharacterAnimState,
  notePulseCounter: number,
  prevPulseCounter: number,
  streamTimer: number,
  dt: number,
  streamInterval = 0.26,
): EmissionDecision {
  if (notePulseCounter !== prevPulseCounter) {
    return {
      burstCount: state === 'playing' ? 2 : 1,
      nextStreamTimer: 0,
    };
  }

  if (state !== 'playing') {
    return {
      burstCount: 0,
      nextStreamTimer: 0,
    };
  }

  const updated = streamTimer + dt;
  if (updated >= streamInterval) {
    return {
      burstCount: 1,
      nextStreamTimer: updated - streamInterval,
    };
  }

  return {
    burstCount: 0,
    nextStreamTimer: updated,
  };
}

function drawNoteHead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tilt: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.restore();
}

function createMusicGlyphTexture(glyph: MusicNoteGlyph): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const grad = ctx.createLinearGradient(12, 8, 48, 56);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#eef3ff');
  grad.addColorStop(1, '#c3d0f0');

  const outline = '#080b20';

  const drawPathWithRetroOutline = (drawFn: () => void, lineW = 7) => {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = outline;
    ctx.lineWidth = lineW;
    drawFn();
    ctx.stroke();
    ctx.fillStyle = grad;
    drawFn();
    ctx.fill();
  };

  if (glyph === 'eighth' || glyph === 'sparkleEighth') {
    // Silhueta marcante de colcheia estilo N64 (haste + bandeirola curva + cabeça da nota)
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Contorno externo
    ctx.fillStyle = outline;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(31, 45);
    ctx.lineTo(31, 13);
    ctx.quadraticCurveTo(45, 16, 47, 29);
    ctx.quadraticCurveTo(40, 24, 31, 23);
    ctx.stroke();
    drawNoteHead(ctx, 23, 46, 11.5, 8.5, -0.34);
    ctx.fill();
    ctx.stroke();

    // Preenchimento interno claro
    ctx.strokeStyle = grad;
    ctx.fillStyle = grad;
    ctx.lineWidth = 4.8;
    ctx.beginPath();
    ctx.moveTo(31, 45);
    ctx.lineTo(31, 13);
    ctx.quadraticCurveTo(45, 16, 47, 29);
    ctx.quadraticCurveTo(40, 24, 31, 23);
    ctx.stroke();
    drawNoteHead(ctx, 23, 46, 10, 7.2, -0.34);
    ctx.fill();

    // Ponto de brilho especular na cabeça da nota
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(20, 44, 3.2, 2.0, -0.35, 0, Math.PI * 2);
    ctx.fill();

    if (glyph === 'sparkleEighth') {
      // Estrelinha de brilho de 4 pontas estilo N64 no canto
      const sx = 50;
      const sy = 15;
      drawPathWithRetroOutline(() => {
        ctx.beginPath();
        ctx.moveTo(sx, sy - 7);
        ctx.lineTo(sx + 2.2, sy - 2.2);
        ctx.lineTo(sx + 7, sy);
        ctx.lineTo(sx + 2.2, sy + 2.2);
        ctx.lineTo(sx, sy + 7);
        ctx.lineTo(sx - 2.2, sy + 2.2);
        ctx.lineTo(sx - 7, sy);
        ctx.lineTo(sx - 2.2, sy - 2.2);
        ctx.closePath();
      }, 4.5);
    }
  } else {
    // Colcheia dupla ligada (♫)
    const offsetY = glyph === 'double' ? -1.5 : 0;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Contorno externo
    ctx.strokeStyle = outline;
    ctx.fillStyle = outline;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(23, 46 + offsetY);
    ctx.lineTo(23, 17 + offsetY);
    ctx.lineTo(48, 12 + offsetY);
    ctx.lineTo(48, 41 + offsetY);
    ctx.stroke();
    drawNoteHead(ctx, 16, 48 + offsetY, 9.5, 7.2, -0.32);
    ctx.fill();
    ctx.stroke();
    drawNoteHead(ctx, 41, 43 + offsetY, 9.5, 7.2, -0.32);
    ctx.fill();
    ctx.stroke();

    // Preenchimento interno claro
    ctx.strokeStyle = grad;
    ctx.fillStyle = grad;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(23, 46 + offsetY);
    ctx.lineTo(23, 17 + offsetY);
    ctx.lineTo(48, 12 + offsetY);
    ctx.lineTo(48, 41 + offsetY);
    ctx.stroke();

    // Barra superior espessa
    ctx.beginPath();
    ctx.moveTo(21, 18 + offsetY);
    ctx.lineTo(50, 12 + offsetY);
    ctx.lineTo(50, 19 + offsetY);
    ctx.lineTo(21, 25 + offsetY);
    ctx.closePath();
    ctx.fill();

    drawNoteHead(ctx, 16, 48 + offsetY, 8.2, 6.0, -0.32);
    ctx.fill();
    drawNoteHead(ctx, 41, 43 + offsetY, 8.2, 6.0, -0.32);
    ctx.fill();

    // Pontos de brilho especular
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(13.5, 46 + offsetY, 2.6, 1.7, -0.35, 0, Math.PI * 2);
    ctx.ellipse(38.5, 41 + offsetY, 2.6, 1.7, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

interface ActiveSlot {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  active: boolean;
  age: number;
  lifetime: number;
  baseScale: number;
  origin: THREE.Vector3;
  velocity: THREE.Vector3;
  swayPhase: number;
  swayAmp: number;
  spinAmp: number;
}

export interface OcarinaMusicParticlesRig {
  root: THREE.Group;
  update: (
    dt: number,
    state: CharacterAnimState,
    currentNote: OcarinaNoteSpec | null,
    notePulseCounter: number,
    spawnOriginWorld: THREE.Vector3,
  ) => void;
  dispose: () => void;
}

const MAX_NOTE_SLOTS = 18;

export function createOcarinaMusicParticles(): OcarinaMusicParticlesRig {
  const root = new THREE.Group();
  const textures = MUSIC_GLYPH_TYPES.map((g) => createMusicGlyphTexture(g));

  const slots: ActiveSlot[] = [];
  for (let i = 0; i < MAX_NOTE_SLOTS; i++) {
    const material = new THREE.SpriteMaterial({
      map: textures[0],
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.08,
      opacity: 0,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.renderOrder = 6;
    root.add(sprite);
    slots.push({
      sprite,
      material,
      active: false,
      age: 0,
      lifetime: 1.2,
      baseScale: 0.11,
      origin: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      swayPhase: 0,
      swayAmp: 0.05,
      spinAmp: 0.18,
    });
  }

  let prevCounter = 0;
  let streamTimer = 0;
  let spawnCounter = 0;
  let activeCount = 0;
  root.visible = false;

  const spawnNoteIcon = (
    originWorld: THREE.Vector3,
    note: OcarinaNoteSpec | null,
    pulseIdx: number,
    subIdx: number,
  ) => {
    // Seleciona o primeiro slot inativo ou recicla o slot ativo mais antigo se estiver cheio
    let target = slots.find((s) => !s.active);
    if (!target) {
      target = slots.reduce((oldest, cur) => (cur.age > oldest.age ? cur : oldest), slots[0]);
    } else {
      activeCount += 1;
    }

    spawnCounter += 1;
    const variant = pickMusicIconVariant(note, pulseIdx + spawnCounter, subIdx);
    const kin = computeLeftMusicNoteKinematics(spawnCounter, subIdx);

    target.active = true;
    target.age = 0;
    target.lifetime = kin.lifetime;
    target.baseScale = kin.baseScale;
    target.origin.copy(originWorld);
    target.origin.x += kin.offsetX;
    target.origin.y += kin.offsetY;
    target.origin.z += kin.offsetZ;
    target.velocity.set(kin.vx, kin.vy, kin.vz);
    target.swayPhase = kin.swayPhase;
    target.swayAmp = kin.swayAmp;
    target.spinAmp = kin.spinAmp;

    target.material.map = textures[variant.glyphIndex];
    target.material.color.setHex(variant.colorHex);
    target.material.opacity = 1;
    target.sprite.position.copy(target.origin);
    target.sprite.scale.setScalar(target.baseScale * 0.85);
    target.sprite.visible = true;
  };

  const update = (
    dt: number,
    state: CharacterAnimState,
    currentNote: OcarinaNoteSpec | null,
    notePulseCounter: number,
    spawnOriginWorld: THREE.Vector3,
  ) => {
    const decision = evaluateMusicEmission(
      state,
      notePulseCounter,
      prevCounter,
      streamTimer,
      dt,
    );
    prevCounter = notePulseCounter;
    streamTimer = decision.nextStreamTimer;

    for (let s = 0; s < decision.burstCount; s++) {
      spawnNoteIcon(spawnOriginWorld, currentNote, notePulseCounter, s);
    }

    if (activeCount === 0) {
      root.visible = false;
      return;
    }
    root.visible = true;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot.active) continue;

      slot.age += dt;
      if (slot.age >= slot.lifetime) {
        slot.active = false;
        slot.sprite.visible = false;
        activeCount = Math.max(0, activeCount - 1);
        continue;
      }

      const frame = computeMusicParticleFrame(
        slot.age,
        slot.lifetime,
        slot.baseScale,
        slot.swayPhase,
        slot.swayAmp,
      );

      slot.sprite.position.set(
        slot.origin.x + slot.velocity.x * slot.age + frame.swayOffsetX,
        slot.origin.y + slot.velocity.y * slot.age,
        slot.origin.z + slot.velocity.z * slot.age,
      );
      slot.sprite.scale.setScalar(frame.scale);
      slot.material.opacity = frame.opacity;
      slot.material.rotation = Math.sin(slot.age * 3.5 + slot.swayPhase) * slot.spinAmp;
    }
    root.visible = activeCount > 0;
  };

  return {
    root,
    update,
    dispose: () => {
      for (const slot of slots) {
        slot.material.dispose();
      }
      for (const tex of textures) {
        tex.dispose();
      }
    },
  };
}
