import * as THREE from 'three';
import { resolveScenarioProcessingSize } from './renderOptimization';

export interface ProcessedScenarioPixelBuffers {
  albedo: Uint8ClampedArray;
  emissive: Uint8ClampedArray;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function smoothRamp(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Calcula a intensidade normalizada [0, 1] de brilho para janelas e lanternas
 * âmbar luminosas no atlas baseColor de cenario.glb, ignorando portas marrons,
 * madeira e pedras neutras.
 */
export function computeWindowEmissiveStrength(r: number, g: number, b: number): number {
  if (r < 150 || g < 92 || b > 112) return 0;
  if (r - g < 12 || g - b < 18 || r - b < 64) return 0;

  const redGate = smoothRamp(148, 215, r);
  const greenGate = smoothRamp(90, 162, g);
  const warmSpread = smoothRamp(62, 136, r - b);
  const blueSuppress = smoothRamp(122, 68, b);

  return redGate * greenGate * warmSpread * blueSuppress;
}

/**
 * Aplica limpeza sutil estilo N64 e harmonização de paleta crepuscular aos pixels
 * baseColor existentes do cenário (sem substituir a textura) e gera um buffer
 * emissivo correspondente para janelas e lanternas.
 */
export function transformScenarioTexturePixels(
  srcRgba: Uint8ClampedArray,
  pixelCount: number,
): ProcessedScenarioPixelBuffers {
  const byteLen = pixelCount * 4;
  const albedo = new Uint8ClampedArray(byteLen);
  const emissive = new Uint8ClampedArray(byteLen);

  for (let i = 0; i < byteLen; i += 4) {
    const r = srcRgba[i];
    const g = srcRgba[i + 1];
    const b = srcRgba[i + 2];
    const a = srcRgba[i + 3];

    const glow = computeWindowEmissiveStrength(r, g, b);

    if (glow > 0.04) {
      // Vidros de janelas e lanternas em âmbar dourado luminoso combinando com o brilho noturno
      const eScale = Math.pow(glow, 0.78);
      emissive[i] = clampByte(255 * eScale);
      emissive[i + 1] = clampByte(178 * eScale);
      emissive[i + 2] = clampByte(34 * eScale);
      emissive[i + 3] = 255;

      // Cor difusa amarelo-dourada limpa para vidros acesos
      const boost = 0.45 + 0.55 * glow;
      albedo[i] = clampByte(r * (1 - boost) + 255 * boost);
      albedo[i + 1] = clampByte(g * (1 - boost) + 206 * boost);
      albedo[i + 2] = clampByte(b * (1 - boost) + 56 * boost);
      albedo[i + 3] = a;
      continue;
    }

    emissive[i] = 0;
    emissive[i + 1] = 0;
    emissive[i + 2] = 0;
    emissive[i + 3] = 255;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Aprofundamento sutil de frestas e limpeza de contraste para destacar os blocos de pedra
    const contrastCurve = Math.pow(Math.max(0.001, lum), 1.07);
    const scale = lum > 0.01 ? contrastCurve / lum : 1;

    let nr = r * scale;
    let ng = g * scale;
    let nb = b * scale;

    if (b > g + 14 && r > g + 8) {
      // Flores violeta / magenta: destaque vívido estilo vilas clássicas do N64
      const mean = (nr + ng + nb) / 3;
      nr = mean + (nr - mean) * 1.24;
      ng = mean + (ng - mean) * 1.10;
      nb = mean + (nb - mean) * 1.26;
    } else if (g > r + 9 && g > b + 10) {
      // Musgo e folhagens: verde musgo vibrante e limpo
      const mean = (nr + ng + nb) / 3;
      nr = mean + (nr - mean) * 1.08;
      ng = mean + (ng - mean) * 1.22;
      nb = mean + (nb - mean) * 0.95;
    } else if (b > r + 4 && b >= g) {
      // Telhados azul-escuros e silhuetas de pinheiros: índigo mais profundo
      nr *= 0.84;
      ng *= 0.88;
      nb *= 1.02;
    } else if (sat < 0.34) {
      // Muros de pedra e paralelepípedos neutros: tom levemente mais frio e limpo, longe do sépia turvo
      nr *= 0.89;
      ng *= 0.93;
      nb *= 1.06;
    } else {
      // Portas de madeira, caixas e esquadrias: contraste rico e quente
      nr *= 0.94;
      ng *= 0.92;
      nb *= 0.88;
    }

    // Quantização suave de paleta estilo N64 (tons escalonados limpos sem manchas de compressão)
    const step = 10;
    const qr = Math.round(nr / step) * step;
    const qg = Math.round(ng / step) * step;
    const qb = Math.round(nb / step) * step;

    albedo[i] = clampByte(nr * 0.45 + qr * 0.55);
    albedo[i + 1] = clampByte(ng * 0.45 + qg * 0.55);
    albedo[i + 2] = clampByte(nb * 0.45 + qb * 0.55);
    albedo[i + 3] = a;
  }

  return { albedo, emissive };
}

export interface ProcessedScenarioTextures {
  albedoTexture: THREE.CanvasTexture;
  emissiveTexture: THREE.CanvasTexture;
}

/**
 * Gera CanvasTextures de albedo harmonizado no estilo N64 e emissivo das janelas
 * diretamente a partir da textura difusa original de cenario.glb (preservando UVs e flipY).
 */
export function buildProcessedScenarioTextures(
  sourceTexture: THREE.Texture,
  maxDim = 1024,
): ProcessedScenarioTextures | null {
  const srcImg = sourceTexture.image as
    | (CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number })
    | undefined;
  if (!srcImg) return null;

  const rawW = Number(srcImg.naturalWidth ?? srcImg.width ?? maxDim);
  const rawH = Number(srcImg.naturalHeight ?? srcImg.height ?? maxDim);
  const targetSize = resolveScenarioProcessingSize(rawW, rawH, maxDim);

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = targetSize;
  srcCanvas.height = targetSize;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return null;

  srcCtx.drawImage(srcImg, 0, 0, targetSize, targetSize);
  const srcData = srcCtx.getImageData(0, 0, targetSize, targetSize);
  // Libera imediatamente a memória temporária do canvas auxiliar
  srcCanvas.width = 0;
  srcCanvas.height = 0;

  const { albedo, emissive } = transformScenarioTexturePixels(
    srcData.data,
    targetSize * targetSize,
  );

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = targetSize;
  albedoCanvas.height = targetSize;
  const albedoCtx = albedoCanvas.getContext('2d')!;
  const albedoImgData = albedoCtx.createImageData(targetSize, targetSize);
  albedoImgData.data.set(albedo);
  albedoCtx.putImageData(albedoImgData, 0, 0);

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = targetSize;
  emissiveCanvas.height = targetSize;
  const emissiveCtx = emissiveCanvas.getContext('2d')!;
  const emissiveImgData = emissiveCtx.createImageData(targetSize, targetSize);
  emissiveImgData.data.set(emissive);
  emissiveCtx.putImageData(emissiveImgData, 0, 0);

  const albedoTexture = new THREE.CanvasTexture(albedoCanvas);
  albedoTexture.flipY = sourceTexture.flipY;
  albedoTexture.wrapS = sourceTexture.wrapS;
  albedoTexture.wrapT = sourceTexture.wrapT;
  albedoTexture.colorSpace = THREE.SRGBColorSpace;
  // Texels nítidos estilo N64 de perto mantendo mipmaps suaves à distância
  albedoTexture.magFilter = THREE.NearestFilter;
  albedoTexture.minFilter = THREE.LinearMipmapLinearFilter;
  albedoTexture.generateMipmaps = true;
  albedoTexture.needsUpdate = true;

  const emissiveTexture = new THREE.CanvasTexture(emissiveCanvas);
  emissiveTexture.flipY = sourceTexture.flipY;
  emissiveTexture.wrapS = sourceTexture.wrapS;
  emissiveTexture.wrapT = sourceTexture.wrapT;
  emissiveTexture.colorSpace = THREE.SRGBColorSpace;
  emissiveTexture.magFilter = THREE.LinearFilter;
  emissiveTexture.minFilter = THREE.LinearMipmapLinearFilter;
  emissiveTexture.generateMipmaps = true;
  emissiveTexture.needsUpdate = true;

  return { albedoTexture, emissiveTexture };
}
