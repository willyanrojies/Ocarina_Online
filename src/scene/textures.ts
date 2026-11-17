import * as THREE from 'three';

export interface SceneTextures {
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Gera apenas as texturas procedurais usadas ativamente pela cena 3D
 * (o disco suave de sombra de contato compartilhado sob os 3 personagens e o gatinho).
 */
export function createSceneTextures(): SceneTextures {
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 64;
  shCanvas.height = 64;
  const sctx = shCanvas.getContext('2d')!;
  const shGrad = sctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  shGrad.addColorStop(0, 'rgba(4, 6, 18, 0.75)');
  shGrad.addColorStop(0.55, 'rgba(4, 6, 18, 0.35)');
  shGrad.addColorStop(1, 'rgba(4, 6, 18, 0)');
  sctx.fillStyle = shGrad;
  sctx.fillRect(0, 0, 64, 64);

  const contactShadow = new THREE.CanvasTexture(shCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  return {
    contactShadow,
    dispose: () => {
      contactShadow.dispose();
    },
  };
}
