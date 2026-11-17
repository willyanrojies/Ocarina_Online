import * as THREE from 'three';
import type { SceneCameraMode } from './cameraPreset';

/**
 * Enquanto a câmera inicial aponta diretamente para o céu estrelado (e após
 * concluir o aquecimento dos shaders), a vila, a água do canal, os personagens,
 * as sombras e as luzes inferiores ficam fora da área visível e podem ser
 * ignorados sem qualquer alteração visual.
 */
export function shouldRenderVillageForeground(
  cameraMode: SceneCameraMode,
  sceneReady: boolean,
): boolean {
  if (!sceneReady) return true;
  return cameraMode !== 'title-sky';
}

export function computeShadowPassActive(
  isSoftwareGl: boolean,
  foregroundVisible: boolean,
): boolean {
  return !isSoftwareGl && foregroundVisible;
}

/**
 * Limita o processamento de textura do cenário à resolução real da imagem de
 * origem (entre [256, maxDim]) para que texturas menores não desperdicem CPU/VRAM.
 */
export function resolveScenarioProcessingSize(
  sourceWidth: number,
  sourceHeight: number,
  maxDim = 1024,
): number {
  const safeW = Number.isFinite(sourceWidth) && sourceWidth > 0 ? sourceWidth : maxDim;
  const safeH = Number.isFinite(sourceHeight) && sourceHeight > 0 ? sourceHeight : maxDim;
  const nativeMax = Math.max(safeW, safeH);
  return Math.max(256, Math.min(maxDim, Math.round(nativeMax)));
}

/**
 * Teste de esfera envolvente sem alocações contra o frustum da câmera ativa.
 */
export function isSphereInFrustum(
  frustum: THREE.Frustum,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  scratchSphere: THREE.Sphere,
): boolean {
  scratchSphere.center.set(cx, cy, cz);
  scratchSphere.radius = radius;
  return frustum.intersectsSphere(scratchSphere);
}
