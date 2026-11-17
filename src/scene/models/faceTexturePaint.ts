import * as THREE from 'three';
import type { CharacterId } from '../characterRoles';

export interface FaceFeaturePaintSpec {
  charId: 'pablo' | 'killer';
  skinEyeRGB: [number, number, number];
  skinMouthRGB: [number, number, number];
  eyeBox: {
    absXMin: number;
    absXMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
  };
  eyeDash: {
    absXMin: number;
    absXMax: number;
    yCenter: number;
    halfHeight: number;
    zMin: number;
  };
  mouthBox: {
    absXMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
  };
  mouthCircle: {
    centerX: number;
    centerY: number;
    rx: number;
    ry: number;
    zMin: number;
  };
  featherMeters: number;
}

export const FACE_PAINT_SPECS: Partial<Record<CharacterId, FaceFeaturePaintSpec>> = {
  pablo: {
    charId: 'pablo',
    skinEyeRGB: [216, 125, 55],
    skinMouthRGB: [217, 124, 54],
    eyeBox: {
      absXMin: 0.082,
      absXMax: 0.176,
      yMin: 0.414,
      yMax: 0.528,
      zMin: 0.235,
    },
    eyeDash: {
      absXMin: 0.098,
      absXMax: 0.160,
      yCenter: 0.466,
      halfHeight: 0.0068,
      zMin: 0.235,
    },
    mouthBox: {
      absXMax: 0.072,
      yMin: 0.326,
      yMax: 0.356,
      zMin: 0.220,
    },
    mouthCircle: {
      centerX: 0,
      centerY: 0.341,
      rx: 0.032,
      ry: 0.031,
      zMin: 0.220,
    },
    featherMeters: 0.0012,
  },
  killer: {
    charId: 'killer',
    skinEyeRGB: [254, 161, 93],
    skinMouthRGB: [248, 162, 96],
    eyeBox: {
      absXMin: 0.082,
      absXMax: 0.176,
      yMin: 0.402,
      yMax: 0.511,
      zMin: 0.230,
    },
    eyeDash: {
      absXMin: 0.096,
      absXMax: 0.158,
      yCenter: 0.454,
      halfHeight: 0.0068,
      zMin: 0.230,
    },
    mouthBox: {
      absXMax: 0.066,
      yMin: 0.308,
      yMax: 0.330,
      zMin: 0.220,
    },
    mouthCircle: {
      centerX: 0,
      centerY: 0.319,
      rx: 0.026,
      ry: 0.024,
      zMin: 0.220,
    },
    featherMeters: 0.0012,
  },
};

const INK_BLACK_RGB: [number, number, number] = [9, 7, 10];

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function boxMask(val: number, min: number, max: number, feather: number): number {
  if (val < min - feather || val > max + feather) return 0;
  if (feather <= 0) return 1;
  const lo = clamp01((val - (min - feather)) / (2 * feather));
  const hi = clamp01((max + feather - val) / (2 * feather));
  return lo < hi ? lo : hi;
}

export interface FacePaintSample {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

/**
 * Função pura que mapeia um ponto 3D local da cabeça (x, y, z) em pablo.glb ou killer.glb
 * para a cor de pele nivelada + traço de olho fechado + boca 'o' preta ao soprar.
 * Retorna null quando o ponto está fora das regiões faciais.
 */
export function evaluateFacePaintAt3D(
  x: number,
  y: number,
  z: number,
  spec: FaceFeaturePaintSpec,
): FacePaintSample | null {
  const absX = Math.abs(x);
  const f = spec.featherMeters;

  // 1. Preenchimento de pele na órbita + traço nítido de olho fechado
  if (z >= spec.eyeBox.zMin) {
    const mx = boxMask(absX, spec.eyeBox.absXMin, spec.eyeBox.absXMax, f);
    const my = boxMask(y, spec.eyeBox.yMin, spec.eyeBox.yMax, f);
    const eyeCoverAlpha = mx < my ? mx : my;
    if (eyeCoverAlpha > 0) {
      const dx = boxMask(absX, spec.eyeDash.absXMin, spec.eyeDash.absXMax, 0.0012);
      const dy = boxMask(
        y,
        spec.eyeDash.yCenter - spec.eyeDash.halfHeight,
        spec.eyeDash.yCenter + spec.eyeDash.halfHeight,
        0.0012,
      );
      const dashAlpha = dx < dy ? dx : dy;
      const r = spec.skinEyeRGB[0] * (1 - dashAlpha) + INK_BLACK_RGB[0] * dashAlpha;
      const g = spec.skinEyeRGB[1] * (1 - dashAlpha) + INK_BLACK_RGB[1] * dashAlpha;
      const b = spec.skinEyeRGB[2] * (1 - dashAlpha) + INK_BLACK_RGB[2] * dashAlpha;
      const alpha = eyeCoverAlpha > dashAlpha ? eyeCoverAlpha : dashAlpha;
      return { r, g, b, alpha };
    }
  }

  // 2. Preenchimento de pele na boca + círculo preto em 'o' centralizado
  let mouthCoverAlpha = 0;
  if (z >= spec.mouthBox.zMin) {
    const mx = boxMask(absX, 0, spec.mouthBox.absXMax, f);
    const my = boxMask(y, spec.mouthBox.yMin, spec.mouthBox.yMax, f);
    mouthCoverAlpha = mx < my ? mx : my;
  }

  let circleAlpha = 0;
  if (z >= spec.mouthCircle.zMin) {
    const nx = (x - spec.mouthCircle.centerX) / spec.mouthCircle.rx;
    const ny = (y - spec.mouthCircle.centerY) / spec.mouthCircle.ry;
    const dist = Math.hypot(nx, ny);
    if (dist <= 1.08) {
      circleAlpha = clamp01((1.08 - dist) / 0.12);
    }
  }

  if (mouthCoverAlpha > 0 || circleAlpha > 0) {
    if (mouthCoverAlpha >= circleAlpha) {
      const r = spec.skinMouthRGB[0] * (1 - circleAlpha) + INK_BLACK_RGB[0] * circleAlpha;
      const g = spec.skinMouthRGB[1] * (1 - circleAlpha) + INK_BLACK_RGB[1] * circleAlpha;
      const b = spec.skinMouthRGB[2] * (1 - circleAlpha) + INK_BLACK_RGB[2] * circleAlpha;
      return { r, g, b, alpha: mouthCoverAlpha };
    }
    // Fora de mouthBox (ex.: borda superior do 'o' do Killer dentro do arco do bigode):
    // mescla o círculo de tinta diretamente sobre o pixel subjacente da textura.
    return {
      r: INK_BLACK_RGB[0],
      g: INK_BLACK_RGB[1],
      b: INK_BLACK_RGB[2],
      alpha: circleAlpha,
    };
  }

  return null;
}

/**
 * Gera uma CanvasTexture clonada de `baseMap` com olhos fechados nivelados e boca 'o' preta
 * pintados diretamente nos texels faciais frontais via rasterização baricêntrica de triângulos UV.
 */
export function createPlayingFaceTexture(
  geo: THREE.BufferGeometry,
  baseMap: THREE.Texture,
  spec: FaceFeaturePaintSpec,
): THREE.CanvasTexture | null {
  const image = baseMap.image as
    | (CanvasImageSource & { width?: number; height?: number })
    | undefined;
  if (!image || !image.width || !image.height) {
    return null;
  }

  const width = image.width;
  const height = image.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const origData = new Uint8ClampedArray(imgData.data);
  const outData = imgData.data;

  const posAttr = geo.attributes.position;
  const uvAttr = geo.attributes.uv;
  if (!posAttr || !uvAttr) return null;

  const indexAttr = geo.index;
  const triCount = indexAttr ? Math.floor(indexAttr.count / 3) : Math.floor(posAttr.count / 3);
  const flipY = baseMap.flipY;

  const minBandX = -Math.max(spec.eyeBox.absXMax, spec.mouthBox.absXMax) - 0.04;
  const maxBandX = Math.max(spec.eyeBox.absXMax, spec.mouthBox.absXMax) + 0.04;
  const minBandY = Math.min(spec.mouthBox.yMin, spec.mouthCircle.centerY - spec.mouthCircle.ry) - 0.04;
  const maxBandY = spec.eyeBox.yMax + 0.04;
  const minBandZ = Math.min(spec.eyeBox.zMin, spec.mouthBox.zMin) - 0.03;

  // Rastreia a melhor confiança baricêntrica interna por pixel pintado para preencher
  // frestas de filtragem bilinear/mipmap sem sobrescrever pixels internos reais.
  const bestMinW = new Map<number, number>();

  for (let t = 0; t < triCount; t++) {
    const i0 = indexAttr ? indexAttr.getX(t * 3) : t * 3;
    const i1 = indexAttr ? indexAttr.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = indexAttr ? indexAttr.getX(t * 3 + 2) : t * 3 + 2;

    const z0 = posAttr.getZ(i0);
    const z1 = posAttr.getZ(i1);
    const z2 = posAttr.getZ(i2);
    if (Math.max(z0, z1, z2) < minBandZ) continue;

    const x0 = posAttr.getX(i0);
    const x1 = posAttr.getX(i1);
    const x2 = posAttr.getX(i2);
    if (Math.max(x0, x1, x2) < minBandX || Math.min(x0, x1, x2) > maxBandX) continue;

    const y0 = posAttr.getY(i0);
    const y1 = posAttr.getY(i1);
    const y2 = posAttr.getY(i2);
    if (Math.max(y0, y1, y2) < minBandY || Math.min(y0, y1, y2) > maxBandY) continue;

    const u0 = uvAttr.getX(i0);
    const v0 = uvAttr.getY(i0);
    const u1 = uvAttr.getX(i1);
    const v1 = uvAttr.getY(i1);
    const u2 = uvAttr.getX(i2);
    const v2 = uvAttr.getY(i2);

    const p0y = flipY ? (1 - v0) * height : v0 * height;
    const p1y = flipY ? (1 - v1) * height : v1 * height;
    const p2y = flipY ? (1 - v2) * height : v2 * height;

    const denom = (v1 - v2) * (u0 - u2) + (u2 - u1) * (v0 - v2);
    if (Math.abs(denom) < 1e-10) continue;

    const minPx = Math.max(0, Math.floor(Math.min(u0, u1, u2) * width) - 3);
    const maxPx = Math.min(width - 1, Math.ceil(Math.max(u0, u1, u2) * width) + 3);
    const minPy = Math.max(0, Math.floor(Math.min(p0y, p1y, p2y)) - 3);
    const maxPy = Math.min(height - 1, Math.ceil(Math.max(p0y, p1y, p2y)) + 3);

    for (let py = minPy; py <= maxPy; py++) {
      const v = flipY ? 1 - (py + 0.5) / height : (py + 0.5) / height;
      for (let px = minPx; px <= maxPx; px++) {
        const u = (px + 0.5) / width;

        const w0 = ((v1 - v2) * (u - u2) + (u2 - u1) * (v - v2)) / denom;
        const w1 = ((v2 - v0) * (u - u2) + (u0 - u2) * (v - v2)) / denom;
        const w2 = 1 - w0 - w1;
        const minW = Math.min(w0, w1, w2);

        if (minW < -0.09) continue;

        const cw0 = w0 < 0 ? 0 : w0;
        const cw1 = w1 < 0 ? 0 : w1;
        const cw2 = w2 < 0 ? 0 : w2;
        const wSum = cw0 + cw1 + cw2 || 1;
        const nw0 = cw0 / wSum;
        const nw1 = cw1 / wSum;
        const nw2 = cw2 / wSum;

        const x = nw0 * x0 + nw1 * x1 + nw2 * x2;
        const y = nw0 * y0 + nw1 * y1 + nw2 * y2;
        const z = nw0 * z0 + nw1 * z1 + nw2 * z2;

        const sample = evaluateFacePaintAt3D(x, y, z, spec);
        if (!sample || sample.alpha <= 0) continue;

        const pixelIdx = py * width + px;
        const prevMinW = bestMinW.get(pixelIdx);
        if (prevMinW !== undefined && prevMinW >= minW) continue;
        bestMinW.set(pixelIdx, minW);

        const dataIdx = pixelIdx * 4;
        const a = sample.alpha;
        outData[dataIdx] = Math.round(origData[dataIdx] * (1 - a) + sample.r * a);
        outData[dataIdx + 1] = Math.round(origData[dataIdx + 1] * (1 - a) + sample.g * a);
        outData[dataIdx + 2] = Math.round(origData[dataIdx + 2] * (1 - a) + sample.b * a);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const playingTex = new THREE.CanvasTexture(canvas);
  playingTex.flipY = baseMap.flipY;
  playingTex.wrapS = baseMap.wrapS;
  playingTex.wrapT = baseMap.wrapT;
  playingTex.colorSpace = THREE.SRGBColorSpace;
  playingTex.needsUpdate = true;
  return playingTex;
}

interface PerimeterVertex {
  absX: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
}

function collectPerimeterVertices(
  posAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  normAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  absXMin: number,
  absXMax: number,
  yMin: number,
  yMax: number,
  zMin: number,
): PerimeterVertex[] {
  const innerPad = 0.004;
  const outerPad = 0.018;
  const ring: PerimeterVertex[] = [];
  for (let i = 0; i < posAttr.count; i++) {
    const absX = Math.abs(posAttr.getX(i));
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    if (z < zMin) continue;
    const inOuter =
      absX >= absXMin - outerPad &&
      absX <= absXMax + outerPad &&
      y >= yMin - outerPad &&
      y <= yMax + outerPad;
    if (!inOuter) continue;
    const inInner =
      absX >= absXMin - innerPad &&
      absX <= absXMax + innerPad &&
      y >= yMin - innerPad &&
      y <= yMax + innerPad;
    if (!inInner) {
      ring.push({
        absX,
        y,
        z,
        nx: Math.abs(normAttr.getX(i)),
        ny: normAttr.getY(i),
        nz: normAttr.getZ(i),
      });
    }
  }
  return ring;
}

function interpolatePerimeterSurface(
  ring: PerimeterVertex[],
  absX: number,
  y: number,
  signX: number,
  fallbackZ: number,
): { z: number; nx: number; ny: number; nz: number } {
  if (ring.length === 0) {
    return { z: fallbackZ, nx: signX * 0.13, ny: -0.10, nz: 0.986 };
  }
  let wSum = 0;
  let zSum = 0;
  let nxSum = 0;
  let nySum = 0;
  let nzSum = 0;
  for (let k = 0; k < ring.length; k++) {
    const p = ring[k];
    const dx = absX - p.absX;
    const dy = y - p.y;
    const w = 1 / (dx * dx + dy * dy + 0.00025);
    wSum += w;
    zSum += p.z * w;
    nxSum += p.nx * w;
    nySum += p.ny * w;
    nzSum += p.nz * w;
  }
  const nx = signX * (nxSum / wSum);
  const ny = nySum / wSum;
  const nz = Math.max(0.5, nzSum / wSum);
  const len = Math.hypot(nx, ny, nz) || 1;
  return {
    z: zSum / wSum,
    nx: nx / len,
    ny: ny / len,
    nz: nz / len,
  };
}

/**
 * Adiciona um morph target relativo (índice 0) em `geo` que traz os vértices recuados
 * da órbita ocular e fenda da boca para o nível da superfície interpolada do rosto
 * e alinha as normais para que a expressão tocando fique totalmente plana/rente ao rosto,
 * sem sombras de cavidade nem remendos salientes.
 */
export function attachFlushPlayingFaceMorphTarget(
  geo: THREE.BufferGeometry,
  spec: FaceFeaturePaintSpec,
): void {
  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  if (!posAttr || !normAttr) return;

  const count = posAttr.count;
  const posDelta = new Float32Array(count * 3);
  const normDelta = new Float32Array(count * 3);

  const eyeRing = collectPerimeterVertices(
    posAttr,
    normAttr,
    spec.eyeBox.absXMin,
    spec.eyeBox.absXMax,
    spec.eyeBox.yMin,
    spec.eyeBox.yMax,
    spec.eyeBox.zMin,
  );
  const mouthRing = collectPerimeterVertices(
    posAttr,
    normAttr,
    0,
    spec.mouthBox.absXMax,
    spec.mouthBox.yMin,
    spec.mouthBox.yMax,
    spec.mouthBox.zMin,
  );

  const eyeMargin = 0.005;
  const mouthMargin = 0.004;

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const absX = Math.abs(x);
    const signX = x < 0 ? -1 : 1;

    const nx = normAttr.getX(i);
    const ny = normAttr.getY(i);
    const nz = normAttr.getZ(i);

    let blend = 0;
    let targetZ = z;
    let targetNx = nx;
    let targetNy = ny;
    let targetNz = nz;

    // 1. Nivelamento da cavidade e borda da órbita ocular (100% em eyeBox, suavizado fora)
    if (z >= spec.eyeBox.zMin - 0.020) {
      const mx = boxMask(
        absX,
        spec.eyeBox.absXMin - 0.002,
        spec.eyeBox.absXMax + 0.002,
        eyeMargin,
      );
      const my = boxMask(y, spec.eyeBox.yMin - 0.002, spec.eyeBox.yMax + 0.002, eyeMargin);
      const eyeW = mx < my ? mx : my;
      if (eyeW > 0) {
        blend = eyeW;
        const surf = interpolatePerimeterSurface(eyeRing, absX, y, signX, 0.268);
        targetZ = surf.z;
        targetNx = surf.nx;
        targetNy = surf.ny;
        targetNz = surf.nz;
      }
    }

    // 2. Nivelamento do vinco da boca
    if (blend === 0 && z >= spec.mouthBox.zMin - 0.020) {
      const mx = boxMask(absX, 0, spec.mouthBox.absXMax, mouthMargin);
      const my = boxMask(y, spec.mouthBox.yMin, spec.mouthBox.yMax, mouthMargin);
      const mouthW = mx < my ? mx : my;
      if (mouthW > 0) {
        blend = mouthW;
        const surf = interpolatePerimeterSurface(mouthRing, absX, y, signX, 0.258);
        targetZ = z < surf.z ? surf.z : z;
        targetNx = surf.nx;
        targetNy = surf.ny;
        targetNz = surf.nz;
      }
    }

    if (blend > 0) {
      const o = i * 3;
      posDelta[o] = 0;
      posDelta[o + 1] = 0;
      posDelta[o + 2] = (targetZ - z) * blend;

      normDelta[o] = (targetNx - nx) * blend;
      normDelta[o + 1] = (targetNy - ny) * blend;
      normDelta[o + 2] = (targetNz - nz) * blend;
    }
  }

  geo.morphTargetsRelative = true;
  geo.morphAttributes.position = [new THREE.BufferAttribute(posDelta, 3)];
  geo.morphAttributes.normal = [new THREE.BufferAttribute(normDelta, 3)];
}
