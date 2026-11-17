export interface CameraPose {
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const FIXED_CAMERA_POSE: CameraPose = {
  pos: [2.53, 1.42, 8.09],
  target: [0.06, 1.94, -2.58],
  fov: 80,
};

export const OCARINA_CUSTOMIZE_CAMERA_POSE: CameraPose = {
  pos: [2.56, 1.58, 7.58],
  target: [2.40, 1.32, -3.12],
  fov: 36,
};

export type SceneCameraMode =
  | 'title-sky'
  | 'default'
  | 'customize-ocarina'
  | 'view-characters'
  | 'pablo-easter-egg';

export const TITLE_SKY_CAMERA_POSE: CameraPose = {
  pos: [2.53, 8.80, 8.15],
  target: [-0.25, 19.20, -5.20],
  fov: 64,
};

export const BACKGROUND_CHARACTERS_CAMERA_POSE: CameraPose = {
  pos: [1.08, 1.78, 5.78],
  target: [1.58, 1.58, 3.55],
  fov: 46,
};

export function getTitleSkyCameraPose(aspect: number): CameraPose {
  if (aspect < 0.85) {
    return {
      pos: [2.53, 9.20, 8.30],
      target: [-0.25, 20.60, -5.20],
      fov: 68,
    };
  }
  return {
    pos: [...TITLE_SKY_CAMERA_POSE.pos],
    target: [...TITLE_SKY_CAMERA_POSE.target],
    fov: TITLE_SKY_CAMERA_POSE.fov,
  };
}

export function getResponsiveCameraPose(aspect: number): CameraPose {
  if (aspect < 0.85) {
    // Celular em retrato: recua na mesma linha de visão para enquadrar personagem e gatinho acima do painel
    return {
      pos: [3.35, 1.28, 11.40],
      target: [2.45, 1.65, 2.20],
      fov: 58,
    };
  }
  return {
    pos: [...FIXED_CAMERA_POSE.pos],
    target: [...FIXED_CAMERA_POSE.target],
    fov: FIXED_CAMERA_POSE.fov,
  };
}

export function getOcarinaCustomizeCameraPose(aspect: number): CameraPose {
  if (aspect < 0.85) {
    // Celular em retrato: mantém a ocarina centralizada horizontalmente acima do painel de edição
    return {
      pos: [2.58, 1.50, 7.86],
      target: [4.25, 0.25, -3.12],
      fov: 46,
    };
  }
  return {
    pos: [...OCARINA_CUSTOMIZE_CAMERA_POSE.pos],
    target: [...OCARINA_CUSTOMIZE_CAMERA_POSE.target],
    fov: OCARINA_CUSTOMIZE_CAMERA_POSE.fov,
  };
}

export function getBackgroundCharactersCameraPose(aspect: number): CameraPose {
  if (aspect < 0.85) {
    // Celular em retrato: campo de visão mais amplo e câmera um pouco mais recuada para caber Pablo e Killer com folga
    return {
      pos: [0.85, 1.82, 6.85],
      target: [1.56, 1.56, 3.55],
      fov: 64,
    };
  }
  return {
    pos: [...BACKGROUND_CHARACTERS_CAMERA_POSE.pos],
    target: [...BACKGROUND_CHARACTERS_CAMERA_POSE.target],
    fov: BACKGROUND_CHARACTERS_CAMERA_POSE.fov,
  };
}

/**
 * Calcula um enquadramento de close estilo N64 no rosto do Pablo
 * orientado em ângulo frontal-direito relativo à rotação atual dele,
 * deixando espaço livre na parte inferior da tela para a caixa de diálogo.
 */
export function getPabloFocusCameraPose(
  headWorldPos: readonly [number, number, number],
  facingYawRad: number,
  aspect: number,
): CameraPose {
  const fwdX = Math.sin(facingYawRad);
  const fwdZ = Math.cos(facingYawRad);
  const rightX = Math.cos(facingYawRad);
  const rightZ = -Math.sin(facingYawRad);
  const isPortrait = aspect < 0.85;

  const distFwd = isPortrait ? 1.56 : 1.36;
  const distRight = isPortrait ? 0.36 : 0.26;
  const camYOffset = isPortrait ? -0.02 : -0.05;
  const targetYOffset = isPortrait ? -0.18 : -0.11;

  return {
    pos: [
      headWorldPos[0] + fwdX * distFwd + rightX * distRight,
      headWorldPos[1] + camYOffset,
      headWorldPos[2] + fwdZ * distFwd + rightZ * distRight,
    ],
    target: [
      headWorldPos[0],
      headWorldPos[1] + targetYOffset,
      headWorldPos[2],
    ],
    fov: isPortrait ? 50 : 41,
  };
}

function dampValue(current: number, target: number, lambda: number, dt: number): number {
  const t = 1 - Math.exp(-lambda * Math.max(0, dt));
  return current + (target - current) * t;
}

export function dampCameraPose(
  current: CameraPose,
  target: CameraPose,
  lambda: number,
  dt: number,
): CameraPose {
  return {
    pos: [
      dampValue(current.pos[0], target.pos[0], lambda, dt),
      dampValue(current.pos[1], target.pos[1], lambda, dt),
      dampValue(current.pos[2], target.pos[2], lambda, dt),
    ],
    target: [
      dampValue(current.target[0], target.target[0], lambda, dt),
      dampValue(current.target[1], target.target[1], lambda, dt),
      dampValue(current.target[2], target.target[2], lambda, dt),
    ],
    fov: dampValue(current.fov, target.fov, lambda, dt),
  };
}

