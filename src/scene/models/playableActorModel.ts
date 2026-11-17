import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import type { CharacterAnimState } from '../../state/simulatorEvents';
import type { OcarinaNoteSpec } from '../../audio/ocarinaNotes';
import {
  DEFAULT_OCARINA_CUSTOMIZATION,
  getStickerPositionOption,
  type OcarinaCustomizationState,
  type OcarinaStickerId,
} from '../ocarinaCustomization';
import { createOcarinaStickerTexture } from '../ocarinaStickerTextures';
import {
  CHARACTER_METADATA,
  INITIAL_CHARACTER_SLOTS,
  type CharacterId,
  type CharacterSlotMap,
  type ScenarioSlotId,
} from '../characterRoles';
import {
  attachFlushPlayingFaceMorphTarget,
  createPlayingFaceTexture,
  FACE_PAINT_SPECS,
} from './faceTexturePaint';

import { isSphereInFrustum } from '../renderOptimization';

export interface PlayableActorsCoordinator {
  root: THREE.Group;
  setSlotAssignment: (slots: CharacterSlotMap) => void;
  setOcarinaCustomization: (config: OcarinaCustomizationState) => void;
  update: (
    dt: number,
    elapsed: number,
    state: CharacterAnimState,
    currentNote: OcarinaNoteSpec | null,
    notePulseCounter: number,
    customizeMode?: boolean,
    easterEggActive?: boolean,
    frustum?: THREE.Frustum | null,
  ) => void;
  isRoleVisible: (role: ScenarioSlotId) => boolean;
  getOcarinaWorldPosition: (out: THREE.Vector3) => THREE.Vector3;
  getRearSlotHeadPositions: (fisherOut: THREE.Vector3, killerOut: THREE.Vector3) => void;
  getCharacterCameraFocus: (charId: CharacterId, headOut: THREE.Vector3) => number;
  dispose: () => void;
}

const OCARINA_MODEL_URL = '/models/ocarina.glb';
const ROD_MODEL_URL = '/models/vara.glb';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function disposeObjectResources(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => m?.dispose());
    }
  });
}

interface OcarinaVisualController {
  applyCustomization: (config: OcarinaCustomizationState) => void;
  dispose: () => void;
}

function loadOcarinaGlbIntoGroup(
  loader: GLTFLoader,
  ocarinaGroup: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  isDisposed: () => boolean,
  initialConfig: OcarinaCustomizationState,
): OcarinaVisualController {
  const ocarinaMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialConfig.colorHex),
    roughness: 0.36,
    metalness: 0.06,
    flatShading: true,
  });
  materials.push(ocarinaMat);

  let currentConfig: OcarinaCustomizationState = { ...initialConfig };
  let ocarinaMesh: THREE.Mesh | null = null;
  let decalHolder: THREE.Group | null = null;
  let currentDecalMesh: THREE.Mesh | null = null;
  const stickerTexCache = new Map<OcarinaStickerId, THREE.CanvasTexture>();

  const raycaster = new THREE.Raycaster();
  const rayOrigin = new THREE.Vector3();
  const rayDir = new THREE.Vector3(0, 0, -1);
  const _dAxX = new THREE.Vector3();
  const _dAxY = new THREE.Vector3();
  const _dAxZ = new THREE.Vector3();
  const _dUp = new THREE.Vector3();
  const _dRot = new THREE.Matrix4();
  const _dEuler = new THREE.Euler();
  const _dSize = new THREE.Vector3();

  const clearDecal = () => {
    if (currentDecalMesh) {
      decalHolder?.remove(currentDecalMesh);
      currentDecalMesh.geometry.dispose();
      const mat = currentDecalMesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
      currentDecalMesh = null;
    }
  };

  const rebuildDecal = () => {
    clearDecal();
    if (!ocarinaMesh || !decalHolder || currentConfig.stickerId === 'none') return;

    let tex = stickerTexCache.get(currentConfig.stickerId);
    if (!tex) {
      const created = createOcarinaStickerTexture(currentConfig.stickerId);
      if (!created) return;
      stickerTexCache.set(currentConfig.stickerId, created);
      tex = created;
    }

    const posOpt = getStickerPositionOption(currentConfig.stickerPosition);
    const identityTarget = new THREE.Mesh(ocarinaMesh.geometry);
    identityTarget.updateMatrixWorld(true);

    rayOrigin.set(posOpt.localX, posOpt.localY, 2.0);
    raycaster.set(rayOrigin, rayDir);
    const hits = raycaster.intersectObject(identityTarget, false);

    let hitPoint: THREE.Vector3;
    let hitNormal: THREE.Vector3;
    if (hits.length > 0 && hits[0].face) {
      hitPoint = hits[0].point.clone();
      hitNormal = hits[0].face.normal.clone().normalize();
      if (hitNormal.z < 0) hitNormal.negate();
    } else {
      hitPoint = new THREE.Vector3(posOpt.localX, posOpt.localY, 0.36);
      hitNormal = new THREE.Vector3(0, 0, 1);
    }

    hitPoint.addScaledVector(hitNormal, posOpt.surfaceNormalBias);

    const rollRad = 0.32 - THREE.MathUtils.degToRad(currentConfig.stickerRotationDeg);
    _dUp.set(-Math.sin(rollRad), Math.cos(rollRad), 0);
    _dAxZ.copy(hitNormal);
    _dAxX.crossVectors(_dUp, _dAxZ);
    if (_dAxX.lengthSq() < 1e-5) {
      _dAxX.set(1, 0, 0);
    } else {
      _dAxX.normalize();
    }
    _dAxY.crossVectors(_dAxZ, _dAxX).normalize();
    _dRot.makeBasis(_dAxX, _dAxY, _dAxZ);
    _dEuler.setFromRotationMatrix(_dRot);

    const decalWidth = 0.38 * currentConfig.stickerScale;
    _dSize.set(decalWidth, decalWidth, 0.42);

    const decalGeo = new DecalGeometry(identityTarget, hitPoint, _dEuler, _dSize);
    const decalMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.04,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      roughness: 0.42,
      metalness: 0.08,
    });

    currentDecalMesh = new THREE.Mesh(decalGeo, decalMat);
    currentDecalMesh.renderOrder = 2;
    decalHolder.add(currentDecalMesh);
  };

  loader.load(
    OCARINA_MODEL_URL,
    (gltf) => {
      if (isDisposed()) {
        disposeObjectResources(gltf.scene);
        return;
      }

      const modelRoot = gltf.scene;
      modelRoot.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (!child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }
          const origMats = Array.isArray(child.material) ? child.material : [child.material];
          origMats.forEach((m) => m?.dispose());
          child.material = ocarinaMat;
          child.castShadow = true;
          child.receiveShadow = true;
          geometries.push(child.geometry);
          if (!ocarinaMesh) {
            ocarinaMesh = child;
          }
        }
      });

      const box = new THREE.Box3().setFromObject(modelRoot);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const targetWidth = 0.39;
      const ocarinaScale = targetWidth / Math.max(0.001, size.x);

      const pivot = new THREE.Group();
      modelRoot.scale.setScalar(ocarinaScale);
      modelRoot.position.set(
        -center.x * ocarinaScale,
        -center.y * ocarinaScale,
        -center.z * ocarinaScale,
      );

      decalHolder = new THREE.Group();
      modelRoot.add(decalHolder);

      pivot.add(modelRoot);
      pivot.position.set(-0.014, -0.036, 0.004);
      pivot.rotation.set(0, 0, -0.32);
      ocarinaGroup.add(pivot);

      rebuildDecal();
    },
    undefined,
    (err) => {
      console.error('Failed to load ocarina GLB model:', err);
    },
  );

  return {
    applyCustomization: (nextConfig: OcarinaCustomizationState) => {
      const prev = currentConfig;
      currentConfig = { ...nextConfig };
      ocarinaMat.color.set(nextConfig.colorHex);

      const stickerChanged =
        prev.stickerId !== nextConfig.stickerId ||
        prev.stickerPosition !== nextConfig.stickerPosition ||
        Math.abs(prev.stickerScale - nextConfig.stickerScale) > 1e-4 ||
        prev.stickerRotationDeg !== nextConfig.stickerRotationDeg;

      if (stickerChanged) {
        rebuildDecal();
      }
    },
    dispose: () => {
      clearDecal();
      stickerTexCache.forEach((t) => t.dispose());
      stickerTexCache.clear();
    },
  };
}

function createEyelidSkinTexture(
  topOuter: string,
  topInner: string,
  bottomOuter: string,
  bottomInner: string,
): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const parseRgb = (s: string) => s.match(/\d+/g)!.map(Number);
  const c00 = parseRgb(topOuter);
  const c10 = parseRgb(topInner);
  const c01 = parseRgb(bottomOuter);
  const c11 = parseRgb(bottomInner);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    const ty = y / (size - 1);
    const ny = Math.abs(ty * 2 - 1);
    for (let x = 0; x < size; x++) {
      const tx = x / (size - 1);
      const nx = Math.abs(tx * 2 - 1);
      const rSq = Math.pow(nx, 4) + Math.pow(ny, 4);
      const alpha = rSq <= 0.72 ? 1 : Math.max(0, 1 - (rSq - 0.72) / 0.34);

      const idx = (y * size + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const top = c00[ch] * (1 - tx) + c10[ch] * tx;
        const bot = c01[ch] * (1 - tx) + c11[ch] * tx;
        data[idx + ch] = Math.round(top * (1 - ty) + bot * ty);
      }
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCurvedEyelidGeometry(
  width: number,
  height: number,
  side: -1 | 1,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 6, 4);
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const vNorm = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = pos.getY(i);
    const nx = lx / (width * 0.5);
    const ny = ly / (height * 0.5);

    const sideShift = side === -1 ? (1 - nx) * 0.5 : (1 + nx) * 0.5;
    const zCurve = -0.008 * sideShift - 0.003 * ny * ny - 0.002 * nx * nx;
    pos.setZ(i, zCurve);

    const outNx = side * (0.06 + 0.36 * sideShift);
    const outNy = 0.22 - 0.08 * ny;
    vNorm.set(outNx, outNy, 0.9).normalize();
    norm.setXYZ(i, vNorm.x, vNorm.y, vNorm.z);
  }
  pos.needsUpdate = true;
  norm.needsUpdate = true;
  return geo;
}

function buildPlayingFaceOverlay(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  texturesOut: THREE.Texture[],
): THREE.Group {
  const faceGroup = new THREE.Group();
  faceGroup.visible = false;

  const eyePatchTexL = createEyelidSkinTexture(
    'rgb(198,138,70)',
    'rgb(228,164,86)',
    'rgb(228,166,88)',
    'rgb(248,184,100)',
  );
  const eyePatchTexR = createEyelidSkinTexture(
    'rgb(208,148,76)',
    'rgb(252,188,102)',
    'rgb(212,152,80)',
    'rgb(255,193,107)',
  );
  texturesOut.push(eyePatchTexL, eyePatchTexR);

  const eyePatchMatL = new THREE.MeshStandardMaterial({
    map: eyePatchTexL,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: true,
    roughness: 0.51,
    metalness: 0.0,
    envMapIntensity: 1.0,
  });

  const eyePatchMatR = new THREE.MeshStandardMaterial({
    map: eyePatchTexR,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: true,
    roughness: 0.51,
    metalness: 0.0,
    envMapIntensity: 1.0,
  });

  const inkBlackMat = new THREE.MeshStandardMaterial({
    color: 0x08070a,
    roughness: 0.86,
    metalness: 0.0,
    envMapIntensity: 0.04,
  });
  materials.push(eyePatchMatL, eyePatchMatR, inkBlackMat);

  const eyeCoverGeoL = createCurvedEyelidGeometry(0.122, 0.09, -1);
  const eyeCoverGeoR = createCurvedEyelidGeometry(0.124, 0.092, 1);
  const closedEyeGeo = new THREE.BoxGeometry(0.064, 0.011, 0.005);
  const oMouthGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.008, 20);
  geometries.push(eyeCoverGeoL, eyeCoverGeoR, closedEyeGeo, oMouthGeo);

  const eyeCoverL = new THREE.Mesh(eyeCoverGeoL, eyePatchMatL);
  eyeCoverL.position.set(-0.105, 0.163, 0.256);
  eyeCoverL.receiveShadow = true;
  faceGroup.add(eyeCoverL);

  const closedEyeL = new THREE.Mesh(closedEyeGeo, inkBlackMat);
  closedEyeL.position.set(-0.104, 0.154, 0.256);
  closedEyeL.rotation.set(0.06, -0.22, 0.03);
  faceGroup.add(closedEyeL);

  const eyeCoverR = new THREE.Mesh(eyeCoverGeoR, eyePatchMatR);
  eyeCoverR.position.set(0.108, 0.163, 0.256);
  eyeCoverR.receiveShadow = true;
  faceGroup.add(eyeCoverR);

  const closedEyeR = new THREE.Mesh(closedEyeGeo, inkBlackMat);
  closedEyeR.position.set(0.105, 0.154, 0.256);
  closedEyeR.rotation.set(0.06, 0.22, -0.03);
  faceGroup.add(closedEyeR);

  const oMouth = new THREE.Mesh(oMouthGeo, inkBlackMat);
  oMouth.rotation.x = Math.PI / 2;
  oMouth.scale.set(1.06, 1.0, 0.9);
  oMouth.position.set(0.0, 0.047, 0.246);
  faceGroup.add(oMouth);

  return faceGroup;
}

// Esqueleto unificado de 15 ossos compartilhado pelos três personagens low-poly jogáveis
const BONE_PELVIS = 0;
const BONE_TORSO = 1;
const BONE_HEAD = 2;
const BONE_ARM_L = 3;
const BONE_ELBOW_L = 4;
const BONE_WRIST_L = 5;
const BONE_ARM_R = 6;
const BONE_ELBOW_R = 7;
const BONE_WRIST_R = 8;
const BONE_THIGH_L = 9;
const BONE_SHIN_L = 10;
const BONE_THIGH_R = 11;
const BONE_SHIN_R = 12;
const BONE_FOOT_L = 13;
const BONE_FOOT_R = 14;

interface CharacterRigProfile {
  pelvisZ: number;
  shoulderX: number;
  shoulderZ: number;
  wristLen: number;
  armPartitionMinY: number;
  armPartitionMaxY: number;
  armPartitionInnerX: number;
  armUpperCutX: number;
  armForeCutX: number;
  armHandCutX: number;
}

const RIG_PROFILES: Record<CharacterId, CharacterRigProfile> = {
  gohan: {
    pelvisZ: 0.030,
    shoulderX: 0.258,
    shoulderZ: 0.015,
    wristLen: 0.210,
    armPartitionMinY: 0.010,
    armPartitionMaxY: 0.245,
    armPartitionInnerX: 0.220,
    armUpperCutX: 0.415,
    armForeCutX: 0.635,
    armHandCutX: 0.695,
  },
  pablo: {
    pelvisZ: 0.055,
    shoulderX: 0.245,
    shoulderZ: -0.025,
    wristLen: 0.195,
    armPartitionMinY: 0.015,
    armPartitionMaxY: 0.240,
    armPartitionInnerX: 0.205,
    armUpperCutX: 0.405,
    armForeCutX: 0.595,
    armHandCutX: 0.680,
  },
  killer: {
    pelvisZ: 0.055,
    shoulderX: 0.245,
    shoulderZ: -0.015,
    wristLen: 0.205,
    armPartitionMinY: -0.055,
    armPartitionMaxY: 0.250,
    armPartitionInnerX: 0.205,
    armUpperCutX: 0.405,
    armForeCutX: 0.615,
    armHandCutX: 0.675,
  },
};

interface SkinnedActorRig {
  skinnedMesh: THREE.SkinnedMesh;
  skeleton: THREE.Skeleton;
  bones: THREE.Bone[];
  shoulderPosL: THREE.Vector3;
  shoulderPosR: THREE.Vector3;
  L1: number;
  L2: number;
  idleMap: THREE.Texture | null;
  playingMap: THREE.CanvasTexture | null;
}

function createUnifiedSkinnedActor(
  sourceMesh: THREE.Mesh,
  charId: CharacterId,
): SkinnedActorRig {
  const prof = RIG_PROFILES[charId];
  const geo = sourceMesh.geometry.clone();
  if (!geo.attributes.normal) {
    geo.computeVertexNormals();
  }

  const pos = geo.attributes.position;
  const count = pos.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);

  const assign4 = (
    idx: number,
    b0: number,
    w0: number,
    b1 = 0,
    w1 = 0,
    b2 = 0,
    w2 = 0,
    b3 = 0,
    w3 = 0,
  ) => {
    const sum = w0 + w1 + w2 + w3 || 1;
    const o = idx * 4;
    skinIndices[o] = b0;
    skinIndices[o + 1] = b1;
    skinIndices[o + 2] = b2;
    skinIndices[o + 3] = b3;
    skinWeights[o] = w0 / sum;
    skinWeights[o + 1] = w1 / sum;
    skinWeights[o + 2] = w2 / sum;
    skinWeights[o + 3] = w3 / sum;
  };

  const legMidX = -0.002;
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    if (y >= 0.275) {
      const headW = smoothstep(0.230, 0.285, y);
      assign4(i, BONE_HEAD, headW, BONE_TORSO, 1 - headW);
    } else if (y > prof.armPartitionMinY && y < prof.armPartitionMaxY && x < -prof.armPartitionInnerX) {
      if (x > -0.295) {
        const armW = smoothstep(-prof.armPartitionInnerX, -0.295, x);
        assign4(i, BONE_ARM_L, armW, BONE_TORSO, 1 - armW);
      } else if (x > -prof.armUpperCutX) {
        assign4(i, BONE_ARM_L, 1);
      } else if (x > -(prof.armUpperCutX + 0.080)) {
        const foreW = smoothstep(-prof.armUpperCutX, -(prof.armUpperCutX + 0.080), x);
        assign4(i, BONE_ELBOW_L, foreW, BONE_ARM_L, 1 - foreW);
      } else if (x > -prof.armForeCutX) {
        assign4(i, BONE_ELBOW_L, 1);
      } else if (x > -prof.armHandCutX) {
        const handW = smoothstep(-prof.armForeCutX, -prof.armHandCutX, x);
        assign4(i, BONE_WRIST_L, handW, BONE_ELBOW_L, 1 - handW);
      } else {
        assign4(i, BONE_WRIST_L, 1);
      }
    } else if (y > prof.armPartitionMinY && y < prof.armPartitionMaxY && x > prof.armPartitionInnerX) {
      if (x < 0.295) {
        const armW = smoothstep(prof.armPartitionInnerX, 0.295, x);
        assign4(i, BONE_ARM_R, armW, BONE_TORSO, 1 - armW);
      } else if (x < prof.armUpperCutX) {
        assign4(i, BONE_ARM_R, 1);
      } else if (x < prof.armUpperCutX + 0.080) {
        const foreW = smoothstep(prof.armUpperCutX, prof.armUpperCutX + 0.080, x);
        assign4(i, BONE_ELBOW_R, foreW, BONE_ARM_R, 1 - foreW);
      } else if (x < prof.armForeCutX) {
        assign4(i, BONE_ELBOW_R, 1);
      } else if (x < prof.armHandCutX) {
        const handW = smoothstep(prof.armForeCutX, prof.armHandCutX, x);
        assign4(i, BONE_WRIST_R, handW, BONE_ELBOW_R, 1 - handW);
      } else {
        assign4(i, BONE_WRIST_R, 1);
      }
    } else if (y >= -0.305) {
      if (y > 0.230) {
        const headW = smoothstep(0.230, 0.285, y);
        assign4(i, BONE_HEAD, headW, BONE_TORSO, 1 - headW);
      } else if (y < -0.250) {
        const pelvisW = smoothstep(-0.250, -0.320, y);
        assign4(i, BONE_PELVIS, pelvisW, BONE_TORSO, 1 - pelvisW);
      } else {
        assign4(i, BONE_TORSO, 1);
      }
    } else {
      const isLeft = x < legMidX;
      const thighB = isLeft ? BONE_THIGH_L : BONE_THIGH_R;
      const shinB = isLeft ? BONE_SHIN_L : BONE_SHIN_R;
      const footB = isLeft ? BONE_FOOT_L : BONE_FOOT_R;

      if (y > -0.395) {
        const thighW = smoothstep(-0.305, -0.395, y);
        assign4(i, thighB, thighW, BONE_PELVIS, 1 - thighW);
      } else if (y > -0.540) {
        assign4(i, thighB, 1);
      } else if (y > -0.660) {
        const shinW = smoothstep(-0.540, -0.660, y);
        assign4(i, shinB, shinW, thighB, 1 - shinW);
      } else if (y > -0.785) {
        assign4(i, shinB, 1);
      } else if (y > -0.835) {
        const footW = smoothstep(-0.785, -0.835, y);
        assign4(i, footB, footW, shinB, 1 - footW);
      } else {
        assign4(i, footB, 1);
      }
    }
  }

  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  const pelvis = new THREE.Bone();
  pelvis.name = `${charId}Pelvis`;
  pelvis.position.set(-0.002, -0.340, prof.pelvisZ);

  const torso = new THREE.Bone();
  torso.name = `${charId}Torso`;
  torso.position.set(0, 0.100, 0);
  pelvis.add(torso);

  const head = new THREE.Bone();
  head.name = `${charId}Head`;
  head.position.set(0, 0.490, 0);
  torso.add(head);

  const armL = new THREE.Bone();
  armL.name = `${charId}UpperArmL`;
  armL.position.set(-prof.shoulderX, 0.385, prof.shoulderZ);
  torso.add(armL);

  const elbowL = new THREE.Bone();
  elbowL.name = `${charId}ForearmL`;
  elbowL.position.set(-0.195, 0, 0);
  armL.add(elbowL);

  const wristL = new THREE.Bone();
  wristL.name = `${charId}HandL`;
  wristL.position.set(-prof.wristLen, 0, 0);
  elbowL.add(wristL);

  const armR = new THREE.Bone();
  armR.name = `${charId}UpperArmR`;
  armR.position.set(prof.shoulderX, 0.385, prof.shoulderZ);
  torso.add(armR);

  const elbowR = new THREE.Bone();
  elbowR.name = `${charId}ForearmR`;
  elbowR.position.set(0.195, 0, 0);
  armR.add(elbowR);

  const wristR = new THREE.Bone();
  wristR.name = `${charId}HandR`;
  wristR.position.set(prof.wristLen, 0, 0);
  elbowR.add(wristR);

  const thighL = new THREE.Bone();
  thighL.name = `${charId}ThighL`;
  thighL.position.set(-0.136, -0.020, 0);
  pelvis.add(thighL);

  const shinL = new THREE.Bone();
  shinL.name = `${charId}ShinL`;
  shinL.position.set(0, -0.250, 0);
  thighL.add(shinL);

  const footL = new THREE.Bone();
  footL.name = `${charId}FootL`;
  footL.position.set(0, -0.210, 0);
  shinL.add(footL);

  const thighR = new THREE.Bone();
  thighR.name = `${charId}ThighR`;
  thighR.position.set(0.136, -0.020, 0);
  pelvis.add(thighR);

  const shinR = new THREE.Bone();
  shinR.name = `${charId}ShinR`;
  shinR.position.set(0, -0.250, 0);
  thighR.add(shinR);

  const footR = new THREE.Bone();
  footR.name = `${charId}FootR`;
  footR.position.set(0, -0.210, 0);
  shinR.add(footR);

  const bones = [
    pelvis,
    torso,
    head,
    armL,
    elbowL,
    wristL,
    armR,
    elbowR,
    wristR,
    thighL,
    shinL,
    thighR,
    shinR,
    footL,
    footR,
  ];

  const rawMat = sourceMesh.material;
  let finalMat: THREE.Material;
  let idleMap: THREE.Texture | null = null;
  let playingMap: THREE.CanvasTexture | null = null;

  if (rawMat instanceof THREE.MeshStandardMaterial) {
    finalMat = rawMat.clone();
    const std = finalMat as THREE.MeshStandardMaterial;
    if (std.map) {
      std.map.colorSpace = THREE.SRGBColorSpace;
      std.map.needsUpdate = true;
      idleMap = std.map;
      const paintSpec = FACE_PAINT_SPECS[charId];
      if (paintSpec) {
        playingMap = createPlayingFaceTexture(geo, std.map, paintSpec);
        attachFlushPlayingFaceMorphTarget(geo, paintSpec);
      }
    }
    if (std.roughnessMap) {
      std.roughnessMap.dispose();
      std.roughnessMap = null;
    }
    if (std.metalnessMap) {
      std.metalnessMap.dispose();
      std.metalnessMap = null;
    }
    if (std.normalMap) {
      std.normalScale.set(0.28, 0.28);
    }
    std.roughness = 0.92;
    std.metalness = 0.0;
    std.envMapIntensity = 0.14;
    std.needsUpdate = true;
  } else {
    finalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.14,
    });
  }

  geo.computeBoundingSphere();
  if (geo.boundingSphere) {
    geo.boundingSphere.radius *= 1.5;
  }

  const skinnedMesh = new THREE.SkinnedMesh(geo, finalMat);
  skinnedMesh.castShadow = true;
  skinnedMesh.receiveShadow = true;
  skinnedMesh.frustumCulled = true;
  skinnedMesh.add(pelvis);

  const skeleton = new THREE.Skeleton(bones);
  pelvis.updateMatrixWorld(true);
  skinnedMesh.bind(skeleton);

  return {
    skinnedMesh,
    skeleton,
    bones,
    shoulderPosL: armL.position.clone(),
    shoulderPosR: armR.position.clone(),
    L1: 0.195,
    L2: prof.wristLen,
    idleMap,
    playingMap,
  };
}

// Auxiliares matemáticos pré-alocados para IK de 2 ossos em T-pose sem gerar lixo de memória
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _bend = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _axX = new THREE.Vector3();
const _axY = new THREE.Vector3();
const _axZ = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _qUpper = new THREE.Quaternion();
const _qWorldFore = new THREE.Quaternion();
const _qHand = new THREE.Quaternion();

function solveTposeArmToGrip(
  side: -1 | 1,
  shoulderPos: THREE.Vector3,
  wristTarget: THREE.Vector3,
  poleDir: THREE.Vector3,
  palmTipTarget: THREE.Vector3,
  palmInwardNormal: THREE.Vector3,
  L1: number,
  L2: number,
  upperArm: THREE.Bone,
  forearm: THREE.Bone,
  handBone: THREE.Bone,
  forearmSupinationBlend = 0,
): void {
  _dir.copy(wristTarget).sub(shoulderPos);
  const dist = THREE.MathUtils.clamp(_dir.length(), Math.abs(L1 - L2) + 0.008, L1 + L2 - 0.004);
  _dir.normalize();

  const cosA = THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));

  _pole.copy(poleDir).normalize();
  _bend.copy(_pole).addScaledVector(_dir, -_pole.dot(_dir));
  if (_bend.lengthSq() < 1e-5) {
    _bend.set(0, -1, 0);
  } else {
    _bend.normalize();
  }

  _elbow
    .copy(shoulderPos)
    .addScaledVector(_dir, L1 * cosA)
    .addScaledVector(_bend, L1 * sinA);

  _v1.copy(_elbow).sub(shoulderPos).normalize();
  _axX.copy(_v1).multiplyScalar(side);
  _axZ.crossVectors(_bend, _axX);
  if (_axZ.lengthSq() < 1e-5) _axZ.set(0, 0, 1);
  _axZ.normalize();
  _axY.crossVectors(_axZ, _axX).normalize();
  _mat4.makeBasis(_axX, _axY, _axZ);
  _qUpper.setFromRotationMatrix(_mat4);
  upperArm.quaternion.copy(_qUpper);

  _v2.copy(wristTarget).sub(_elbow).normalize();
  _axX.copy(_v2).multiplyScalar(side);
  _v3.copy(palmInwardNormal).negate();
  _v3.lerpVectors(_bend, _v3, forearmSupinationBlend);
  _axZ.crossVectors(_v3, _axX);
  if (_axZ.lengthSq() < 1e-5) _axZ.set(0, 0, 1);
  _axZ.normalize();
  _axY.crossVectors(_axZ, _axX).normalize();
  _mat4.makeBasis(_axX, _axY, _axZ);
  _qWorldFore.setFromRotationMatrix(_mat4);

  forearm.quaternion.copy(_qUpper).invert().multiply(_qWorldFore);

  _v3.copy(palmTipTarget).sub(wristTarget).normalize();
  _axX.copy(_v3).multiplyScalar(side);
  _axY.copy(palmInwardNormal).negate();
  _axY.addScaledVector(_axX, -_axY.dot(_axX));
  if (_axY.lengthSq() < 1e-5) _axY.set(0, 1, 0);
  _axY.normalize();
  _axZ.crossVectors(_axX, _axY).normalize();
  _mat4.makeBasis(_axX, _axY, _axZ);
  _qHand.setFromRotationMatrix(_mat4);

  handBone.quaternion.copy(_qWorldFore).invert().multiply(_qHand);
}

interface SlotPlacementSpec {
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

const SLOT_PLACEMENTS: Record<ScenarioSlotId, SlotPlacementSpec> = {
  ocarina: {
    position: [2.75, 1.14, 6.52],
    rotationY: -0.18,
    scale: 0.90,
  },
  fisher: {
    position: [1.36, 1.11, 3.16],
    rotationY: -1.34,
    scale: 0.88,
  },
  killer: {
    position: [1.77, 1.05, 3.93],
    rotationY: -0.18,
    scale: 0.88,
  },
};

interface ActorInstance {
  id: CharacterId;
  root: THREE.Group;
  modelWrapper: THREE.Group;
  rig: SkinnedActorRig | null;
  role: ScenarioSlotId;
  playingFaceOverlay: THREE.Group | null;
}

export function createPlayableActorsCoordinator(
  initialCustomization: OcarinaCustomizationState = DEFAULT_OCARINA_CUSTOMIZATION,
  initialSlots: CharacterSlotMap = INITIAL_CHARACTER_SLOTS,
): PlayableActorsCoordinator {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const root = new THREE.Group();
  const sharedLoader = new GLTFLoader();
  let disposed = false;
  let currentSlots: CharacterSlotMap = { ...initialSlots };

  // Ocarina compartilhada acoplada ao personagem que ocupa atualmente o papel 'ocarina'
  const ocarinaGroup = new THREE.Group();
  ocarinaGroup.scale.setScalar(0.88);
  const ocarinaVisuals = loadOcarinaGlbIntoGroup(
    sharedLoader,
    ocarinaGroup,
    geometries,
    materials,
    () => disposed,
    initialCustomization,
  );

  // Vara de pesca compartilhada + extensão vertical da linha acoplada a quem ocupa o papel 'fisher'
  const rodHolderGroup = new THREE.Group();
  const rodScale = 1.18;
  const linePivot = new THREE.Group();
  linePivot.position.set(-0.002 * rodScale, -0.722 * rodScale, (0.85 + 0.933) * rodScale);
  const lineExtGeo = new THREE.CylinderGeometry(0.0038, 0.0038, 1.15, 5);
  const lineExtMat = new THREE.MeshBasicMaterial({
    color: 0xcbd5e1,
    transparent: true,
    opacity: 0.72,
  });
  geometries.push(lineExtGeo);
  materials.push(lineExtMat);
  const lineExtension = new THREE.Mesh(lineExtGeo, lineExtMat);
  lineExtension.position.set(0, -0.575, 0);
  linePivot.add(lineExtension);
  rodHolderGroup.add(linePivot);

  const playingFaceOverlay = buildPlayingFaceOverlay(geometries, materials, textures);

  const findRoleForCharacter = (slots: CharacterSlotMap, id: CharacterId): ScenarioSlotId => {
    if (slots.ocarina === id) return 'ocarina';
    if (slots.fisher === id) return 'fisher';
    return 'killer';
  };

  const actors: Record<CharacterId, ActorInstance> = {
    gohan: {
      id: 'gohan',
      root: new THREE.Group(),
      modelWrapper: new THREE.Group(),
      rig: null,
      role: findRoleForCharacter(currentSlots, 'gohan'),
      playingFaceOverlay,
    },
    pablo: {
      id: 'pablo',
      root: new THREE.Group(),
      modelWrapper: new THREE.Group(),
      rig: null,
      role: findRoleForCharacter(currentSlots, 'pablo'),
      playingFaceOverlay: null,
    },
    killer: {
      id: 'killer',
      root: new THREE.Group(),
      modelWrapper: new THREE.Group(),
      rig: null,
      role: findRoleForCharacter(currentSlots, 'killer'),
      playingFaceOverlay: null,
    },
  };

  const applyTransformForRole = (actor: ActorInstance, role: ScenarioSlotId) => {
    const spec = SLOT_PLACEMENTS[role];
    actor.role = role;
    actor.root.position.set(spec.position[0], spec.position[1], spec.position[2]);
    actor.root.rotation.y = spec.rotationY;
    actor.modelWrapper.scale.setScalar(spec.scale);
    actor.modelWrapper.position.set(0.002 * spec.scale, 0.43 * spec.scale, 0.06);
  };

  const attachPropsForSlots = (slots: CharacterSlotMap) => {
    (['gohan', 'pablo', 'killer'] as CharacterId[]).forEach((charId) => {
      const actor = actors[charId];
      const nextRole = findRoleForCharacter(slots, charId);
      applyTransformForRole(actor, nextRole);
      if (actor.playingFaceOverlay && nextRole !== 'ocarina') {
        actor.playingFaceOverlay.visible = false;
      }
      if (actor.rig) {
        if (
          nextRole !== 'ocarina' &&
          actor.rig.idleMap &&
          actor.rig.skinnedMesh.material instanceof THREE.MeshStandardMaterial &&
          actor.rig.skinnedMesh.material.map !== actor.rig.idleMap
        ) {
          actor.rig.skinnedMesh.material.map = actor.rig.idleMap;
          actor.rig.skinnedMesh.material.needsUpdate = true;
        }
        if (
          nextRole !== 'ocarina' &&
          actor.rig.skinnedMesh.morphTargetInfluences &&
          actor.rig.skinnedMesh.morphTargetInfluences.length > 0
        ) {
          actor.rig.skinnedMesh.morphTargetInfluences[0] = 0;
        }
        const torsoBone = actor.rig.bones[BONE_TORSO];
        if (nextRole === 'ocarina') {
          torsoBone.add(ocarinaGroup);
        } else if (nextRole === 'fisher') {
          torsoBone.add(rodHolderGroup);
        }
      }
    });
  };

  (['gohan', 'pablo', 'killer'] as CharacterId[]).forEach((charId) => {
    const actor = actors[charId];
    actor.root.add(actor.modelWrapper);
    root.add(actor.root);
    applyTransformForRole(actor, actor.role);
  });

  (['gohan', 'pablo', 'killer'] as CharacterId[]).forEach((charId) => {
    sharedLoader.load(
      CHARACTER_METADATA[charId].modelUrl,
      (gltf) => {
        if (disposed) {
          disposeObjectResources(gltf.scene);
          return;
        }

        let primaryMesh: THREE.Mesh | null = null;
        gltf.scene.traverse((obj) => {
          if (!primaryMesh && obj instanceof THREE.Mesh) {
            primaryMesh = obj;
          }
        });
        if (!primaryMesh) return;

        const rig = createUnifiedSkinnedActor(primaryMesh, charId);
        actors[charId].rig = rig;
        geometries.push(rig.skinnedMesh.geometry);
        const rigMat = rig.skinnedMesh.material;
        if (rigMat instanceof THREE.Material) {
          materials.push(rigMat);
          if (rigMat instanceof THREE.MeshStandardMaterial) {
            if (rigMat.map) textures.push(rigMat.map);
            if (rigMat.roughnessMap) textures.push(rigMat.roughnessMap);
            if (rigMat.normalMap) textures.push(rigMat.normalMap);
          }
        }
        if (rig.playingMap) {
          textures.push(rig.playingMap);
        }

        actors[charId].modelWrapper.add(rig.skinnedMesh);
        if (actors[charId].playingFaceOverlay) {
          rig.bones[BONE_HEAD].add(actors[charId].playingFaceOverlay);
        }
        // Anexa a ocarina ou vara de pesca caso este personagem ocupe um desses papéis agora
        const activeRole = findRoleForCharacter(currentSlots, charId);
        if (activeRole === 'ocarina') {
          rig.bones[BONE_TORSO].add(ocarinaGroup);
        } else if (activeRole === 'fisher') {
          rig.bones[BONE_TORSO].add(rodHolderGroup);
        }

        (primaryMesh as THREE.Mesh).geometry?.dispose();
        const srcMat = (primaryMesh as THREE.Mesh).material;
        if (Array.isArray(srcMat)) srcMat.forEach((m) => m.dispose());
        else srcMat?.dispose();
      },
      undefined,
      (err) => {
        console.error(`Failed to load ${charId} GLB model:`, err);
      },
    );
  });

  // Carrega a vara de pesca (vara.glb)
  sharedLoader.load(
    ROD_MODEL_URL,
    (gltf) => {
      if (disposed) {
        disposeObjectResources(gltf.scene);
        return;
      }

      gltf.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          if (obj.geometry) geometries.push(obj.geometry);
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m) {
              materials.push(m);
              if (m instanceof THREE.MeshStandardMaterial) {
                if (m.map) {
                  m.map.colorSpace = THREE.SRGBColorSpace;
                  m.map.needsUpdate = true;
                  textures.push(m.map);
                }
                if (m.roughnessMap) textures.push(m.roughnessMap);
                if (m.normalMap) textures.push(m.normalMap);
                m.needsUpdate = true;
              }
            }
          });
        }
      });

      const varaRoot = gltf.scene;
      varaRoot.rotation.y = Math.PI / 2;
      varaRoot.scale.setScalar(rodScale);
      varaRoot.position.set(0, 0, 0.85 * rodScale);
      rodHolderGroup.add(varaRoot);
    },
    undefined,
    (err) => {
      console.error('Failed to load fishing rod GLB model:', err);
    },
  );

  // Pegada lateral na ocarina: pulsos nas laterais inferiores com as pontas dos dedos segurando as extremidades
  const ocaWristL = new THREE.Vector3(-0.295, -0.062, -0.048);
  const ocaPalmTipL = new THREE.Vector3(-0.165, -0.036, 0.008);
  const ocaPalmNormL = new THREE.Vector3(0.78, -0.32, -0.54).normalize();
  const ocaWristR = new THREE.Vector3(0.290, -0.042, -0.048);
  const ocaPalmTipR = new THREE.Vector3(0.160, -0.018, 0.008);
  const ocaPalmNormR = new THREE.Vector3(-0.78, -0.32, -0.54).normalize();

  // Apresentação anatômica com palmas para cima em concha durante a personalização (y = +0.86)
  const custWristL = new THREE.Vector3(-0.175, 0.122, 0.215);
  const custPalmTipL = new THREE.Vector3(-0.032, 0.142, 0.335);
  const custPalmNormL = new THREE.Vector3(0.38, 0.86, 0.34).normalize();
  const custPoleL = new THREE.Vector3(-0.82, -0.58, -0.10);

  const custWristR = new THREE.Vector3(0.175, 0.122, 0.215);
  const custPalmTipR = new THREE.Vector3(0.032, 0.142, 0.335);
  const custPalmNormR = new THREE.Vector3(-0.38, 0.86, 0.34).normalize();
  const custPoleR = new THREE.Vector3(0.82, -0.58, -0.10);

  const rodWristL = new THREE.Vector3(-0.075, 0.015, 0.22);
  const rodPalmTipL = new THREE.Vector3(0.0, 0.025, 0.28);
  const rodPalmNormL = new THREE.Vector3(0.85, -0.35, -0.35).normalize();
  const rodWristR = new THREE.Vector3(0.085, 0.005, -0.02);
  const rodPalmTipR = new THREE.Vector3(0.01, 0.015, 0.05);
  const rodPalmNormR = new THREE.Vector3(-0.85, -0.35, -0.35).normalize();
  const rodPoleL = new THREE.Vector3(-0.72, -0.82, -0.25);
  const rodPoleR = new THREE.Vector3(0.72, -0.82, -0.25);

  const kWristTargetL = new THREE.Vector3();
  const kPalmTipL = new THREE.Vector3();
  const kPalmNormL = new THREE.Vector3(0.14, -0.95, -0.28).normalize();
  const kPoleL = new THREE.Vector3(-0.18, -0.22, -0.96);
  const kWristTargetR = new THREE.Vector3();
  const kPalmTipR = new THREE.Vector3();
  const kPalmNormR = new THREE.Vector3(-0.14, -0.95, -0.28).normalize();
  const kPoleR = new THREE.Vector3(0.18, -0.22, -0.96);

  const wristTarget = new THREE.Vector3();
  const palmTipTarget = new THREE.Vector3();
  const palmNormal = new THREE.Vector3();
  const activePole = new THREE.Vector3();
  const ocaPoleL = new THREE.Vector3(-0.92, -0.45, 0.04);
  const ocaPoleR = new THREE.Vector3(0.92, -0.45, 0.04);
  const propQuat = new THREE.Quaternion();
  const headAnchorLocal = new THREE.Vector3(0, 0.34, 0);

  let playBlend = 0;
  let customizeBlend = 0;
  let noteEmphasis = 0;
  let lastCounter = 0;

  const updateOcarinaPose = (
    actor: ActorInstance,
    elapsed: number,
    state: CharacterAnimState,
    currentNote: OcarinaNoteSpec | null,
  ) => {
    const rig = actor.rig;
    if (!rig) return;

    const pitchNormalized = currentNote ? (currentNote.midi - 69) / 24 : 0.4;
    const bones = rig.bones;

    bones[BONE_PELVIS].rotation.set(0, 0, 0);

    const idleTorsoPitch = Math.sin(elapsed * 1.4) * 0.022;
    const playTorsoPitch = 0.04 + Math.sin(elapsed * 3.8) * 0.025 + noteEmphasis * 0.022;
    const custTorsoPitch = 0.02 + Math.sin(elapsed * 1.2) * 0.012;
    const baseTorsoPitch = THREE.MathUtils.lerp(idleTorsoPitch, playTorsoPitch, playBlend);
    bones[BONE_TORSO].rotation.x = THREE.MathUtils.lerp(baseTorsoPitch, custTorsoPitch, customizeBlend);
    bones[BONE_TORSO].rotation.y = 0;

    const baseTorsoRoll = THREE.MathUtils.lerp(
      Math.sin(elapsed * 0.7) * 0.012,
      Math.sin(elapsed * 2.4) * 0.038,
      playBlend,
    );
    bones[BONE_TORSO].rotation.z = THREE.MathUtils.lerp(baseTorsoRoll, 0, customizeBlend);

    const idleHeadY = Math.sin(elapsed * 0.65) * 0.055;
    const idleHeadX = -0.02 + Math.sin(elapsed * 1.1) * 0.022;
    const playHeadY = Math.sin(elapsed * 2.4) * 0.035;
    const playHeadX = 0.05 - pitchNormalized * 0.04 + noteEmphasis * 0.025;
    const playHeadZ = Math.sin(elapsed * 1.9) * 0.025;

    bones[BONE_HEAD].rotation.y = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(idleHeadY, playHeadY, playBlend),
      0.0,
      customizeBlend,
    );
    bones[BONE_HEAD].rotation.x = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(idleHeadX, playHeadX, playBlend),
      0.16,
      customizeBlend,
    );
    bones[BONE_HEAD].rotation.z = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(0, playHeadZ, playBlend),
      0.0,
      customizeBlend,
    );

    const showPlayingFace =
      (state === 'playing' || playBlend > 0.35) && customizeBlend < 0.3;

    if (actor.playingFaceOverlay) {
      actor.playingFaceOverlay.visible = showPlayingFace;
    }

    if (
      rig.idleMap &&
      rig.playingMap &&
      rig.skinnedMesh.material instanceof THREE.MeshStandardMaterial
    ) {
      const targetMap = showPlayingFace ? rig.playingMap : rig.idleMap;
      if (rig.skinnedMesh.material.map !== targetMap) {
        rig.skinnedMesh.material.map = targetMap;
        rig.skinnedMesh.material.needsUpdate = true;
      }
    }

    if (rig.skinnedMesh.morphTargetInfluences && rig.skinnedMesh.morphTargetInfluences.length > 0) {
      rig.skinnedMesh.morphTargetInfluences[0] = showPlayingFace ? 1 : 0;
    }

    const idleOcaY = 0.358 + Math.sin(elapsed * 1.4) * 0.008;
    const idleOcaZ = 0.272;
    const idleOcaRotX = 0.14;
    const playOcaY = 0.444 + Math.sin(elapsed * 3.8) * 0.004 - pitchNormalized * 0.005;
    const playOcaZ = 0.246;
    const playOcaRotX = 0.04 - pitchNormalized * 0.04;

    const baseOcaX = THREE.MathUtils.lerp(-0.036, -0.068, playBlend);
    const baseOcaY = THREE.MathUtils.lerp(idleOcaY, playOcaY, playBlend);
    const baseOcaZ = THREE.MathUtils.lerp(idleOcaZ, playOcaZ, playBlend);

    const custOcaX = 0.008;
    const custOcaY = 0.354 + Math.sin(elapsed * 1.5) * 0.004;
    const custOcaZ = 0.344;

    ocarinaGroup.position.set(
      THREE.MathUtils.lerp(baseOcaX, custOcaX, customizeBlend),
      THREE.MathUtils.lerp(baseOcaY, custOcaY, customizeBlend),
      THREE.MathUtils.lerp(baseOcaZ, custOcaZ, customizeBlend),
    );

    const baseRotX = THREE.MathUtils.lerp(idleOcaRotX, playOcaRotX, playBlend);
    const baseRotY = THREE.MathUtils.lerp(-0.04, -0.06, playBlend);
    const baseRotZ = THREE.MathUtils.lerp(0.04, 0.06 + Math.sin(elapsed * 3.2) * 0.02, playBlend);

    ocarinaGroup.rotation.set(
      THREE.MathUtils.lerp(baseRotX, 0.14, customizeBlend),
      THREE.MathUtils.lerp(baseRotY, -0.04 + Math.sin(elapsed * 1.2) * 0.03, customizeBlend),
      THREE.MathUtils.lerp(baseRotZ, 0.03, customizeBlend),
    );
    ocarinaGroup.updateMatrix();
    propQuat.setFromEuler(ocarinaGroup.rotation);

    const custBreathY = Math.sin(elapsed * 1.5) * 0.004;

    wristTarget.copy(ocaWristL).applyMatrix4(ocarinaGroup.matrix);
    palmTipTarget.copy(ocaPalmTipL).applyMatrix4(ocarinaGroup.matrix);
    palmNormal.copy(ocaPalmNormL).applyQuaternion(propQuat);

    if (customizeBlend > 0.0001) {
      wristTarget.x = THREE.MathUtils.lerp(wristTarget.x, custWristL.x, customizeBlend);
      wristTarget.y = THREE.MathUtils.lerp(wristTarget.y, custWristL.y + custBreathY, customizeBlend);
      wristTarget.z = THREE.MathUtils.lerp(wristTarget.z, custWristL.z, customizeBlend);

      palmTipTarget.x = THREE.MathUtils.lerp(palmTipTarget.x, custPalmTipL.x, customizeBlend);
      palmTipTarget.y = THREE.MathUtils.lerp(palmTipTarget.y, custPalmTipL.y + custBreathY, customizeBlend);
      palmTipTarget.z = THREE.MathUtils.lerp(palmTipTarget.z, custPalmTipL.z, customizeBlend);

      palmNormal.lerp(custPalmNormL, customizeBlend).normalize();
      activePole.copy(ocaPoleL).lerp(custPoleL, customizeBlend);
    } else {
      activePole.copy(ocaPoleL);
    }

    solveTposeArmToGrip(
      -1,
      rig.shoulderPosL,
      wristTarget,
      activePole,
      palmTipTarget,
      palmNormal,
      rig.L1,
      rig.L2,
      bones[BONE_ARM_L],
      bones[BONE_ELBOW_L],
      bones[BONE_WRIST_L],
      THREE.MathUtils.lerp(0.45, 0.65, customizeBlend),
    );

    wristTarget.copy(ocaWristR).applyMatrix4(ocarinaGroup.matrix);
    palmTipTarget.copy(ocaPalmTipR).applyMatrix4(ocarinaGroup.matrix);
    palmNormal.copy(ocaPalmNormR).applyQuaternion(propQuat);

    if (customizeBlend > 0.0001) {
      wristTarget.x = THREE.MathUtils.lerp(wristTarget.x, custWristR.x, customizeBlend);
      wristTarget.y = THREE.MathUtils.lerp(wristTarget.y, custWristR.y + custBreathY, customizeBlend);
      wristTarget.z = THREE.MathUtils.lerp(wristTarget.z, custWristR.z, customizeBlend);

      palmTipTarget.x = THREE.MathUtils.lerp(palmTipTarget.x, custPalmTipR.x, customizeBlend);
      palmTipTarget.y = THREE.MathUtils.lerp(palmTipTarget.y, custPalmTipR.y + custBreathY, customizeBlend);
      palmTipTarget.z = THREE.MathUtils.lerp(palmTipTarget.z, custPalmTipR.z, customizeBlend);

      palmNormal.lerp(custPalmNormR, customizeBlend).normalize();
      activePole.copy(ocaPoleR).lerp(custPoleR, customizeBlend);
    } else {
      activePole.copy(ocaPoleR);
    }

    solveTposeArmToGrip(
      1,
      rig.shoulderPosR,
      wristTarget,
      activePole,
      palmTipTarget,
      palmNormal,
      rig.L1,
      rig.L2,
      bones[BONE_ARM_R],
      bones[BONE_ELBOW_R],
      bones[BONE_WRIST_R],
      THREE.MathUtils.lerp(0.45, 0.65, customizeBlend),
    );

    const idleSwingL = Math.sin(elapsed * 1.15) * 0.045;
    const idleSwingR = Math.sin(elapsed * 1.15 + Math.PI * 0.85) * 0.045;
    const playSwingL = Math.sin(elapsed * 3.1) * 0.085;
    const playSwingR = Math.sin(elapsed * 3.1 + Math.PI) * 0.085;

    bones[BONE_THIGH_L].rotation.set(-1.40, 0, -0.012);
    bones[BONE_THIGH_R].rotation.set(-1.40, 0, 0.012);

    bones[BONE_SHIN_L].rotation.set(1.48 + THREE.MathUtils.lerp(idleSwingL, playSwingL, playBlend), 0, 0);
    bones[BONE_SHIN_R].rotation.set(1.48 + THREE.MathUtils.lerp(idleSwingR, playSwingR, playBlend), 0, 0);

    bones[BONE_FOOT_L].rotation.set(0, 0, 0);
    bones[BONE_FOOT_R].rotation.set(0, 0, 0);
  };

  const updateFisherPose = (actor: ActorInstance, elapsed: number) => {
    const rig = actor.rig;
    if (!rig) return;
    const bones = rig.bones;

    bones[BONE_PELVIS].rotation.set(0, 0, 0);

    const breathPitch = Math.sin(elapsed * 1.15) * 0.020;
    const calmSway = Math.sin(elapsed * 0.52 + 0.7) * 0.014;
    bones[BONE_TORSO].rotation.set(0.05 + breathPitch, 0, calmSway);

    bones[BONE_HEAD].rotation.set(
      0.06 + Math.sin(elapsed * 0.9 + 0.4) * 0.022,
      Math.sin(elapsed * 0.38) * 0.048,
      Math.sin(elapsed * 0.62) * 0.018,
    );

    rodHolderGroup.position.set(
      0.03 + Math.sin(elapsed * 0.52) * 0.006,
      0.16 + Math.sin(elapsed * 1.15 - 0.35) * 0.010,
      0.34,
    );
    rodHolderGroup.rotation.set(
      -0.08 + Math.sin(elapsed * 1.15 - 0.5) * 0.016,
      0.02 + Math.sin(elapsed * 0.45) * 0.012,
      0.02,
    );
    rodHolderGroup.updateMatrix();
    propQuat.setFromEuler(rodHolderGroup.rotation);

    linePivot.rotation.x = -rodHolderGroup.rotation.x - bones[BONE_TORSO].rotation.x;

    wristTarget.copy(rodWristL).applyMatrix4(rodHolderGroup.matrix);
    palmTipTarget.copy(rodPalmTipL).applyMatrix4(rodHolderGroup.matrix);
    palmNormal.copy(rodPalmNormL).applyQuaternion(propQuat);
    solveTposeArmToGrip(
      -1,
      rig.shoulderPosL,
      wristTarget,
      rodPoleL,
      palmTipTarget,
      palmNormal,
      rig.L1,
      rig.L2,
      bones[BONE_ARM_L],
      bones[BONE_ELBOW_L],
      bones[BONE_WRIST_L],
    );

    wristTarget.copy(rodWristR).applyMatrix4(rodHolderGroup.matrix);
    palmTipTarget.copy(rodPalmTipR).applyMatrix4(rodHolderGroup.matrix);
    palmNormal.copy(rodPalmNormR).applyQuaternion(propQuat);
    solveTposeArmToGrip(
      1,
      rig.shoulderPosR,
      wristTarget,
      rodPoleR,
      palmTipTarget,
      palmNormal,
      rig.L1,
      rig.L2,
      bones[BONE_ARM_R],
      bones[BONE_ELBOW_R],
      bones[BONE_WRIST_R],
    );

    bones[BONE_THIGH_L].rotation.set(-1.48, 0, -0.025);
    bones[BONE_THIGH_R].rotation.set(-1.48, 0, 0.025);
    bones[BONE_SHIN_L].rotation.set(0.14 + Math.sin(elapsed * 0.85) * 0.018, 0, 0);
    bones[BONE_SHIN_R].rotation.set(0.14 + Math.sin(elapsed * 0.85 + 2.3) * 0.018, 0, 0);
    bones[BONE_FOOT_L].rotation.set(0.42 + Math.sin(elapsed * 0.85 + 0.5) * 0.025, 0, 0);
    bones[BONE_FOOT_R].rotation.set(0.42 + Math.sin(elapsed * 0.85 + 2.8) * 0.025, 0, 0);
  };

  const updateKillerPose = (actor: ActorInstance, elapsed: number) => {
    const rig = actor.rig;
    if (!rig) return;
    const bones = rig.bones;

    const breathPitch = Math.sin(elapsed * 1.2 + 0.7) * 0.018;
    const calmSway = Math.sin(elapsed * 0.68 + 1.1) * 0.020;
    bones[BONE_PELVIS].rotation.set(-0.08, 0, 0);
    bones[BONE_TORSO].rotation.set(-0.26 + breathPitch, 0, calmSway);

    bones[BONE_HEAD].rotation.set(
      -0.34 + Math.sin(elapsed * 1.45 + 0.2) * 0.040,
      -0.06 + Math.sin(elapsed * 0.72) * 0.090 + Math.sin(elapsed * 0.31 + 1.0) * 0.038,
      Math.sin(elapsed * 1.35 + 0.5) * 0.072,
    );

    const armBreath = Math.sin(elapsed * 1.2 + 0.7) * 0.002;
    const armShift = Math.sin(elapsed * 0.68 + 1.1) * 0.005;
    kWristTargetL.set(-0.31 - armShift, -0.01 + armBreath, -0.13);
    kPalmTipL.set(-0.35 - armShift, -0.07 + armBreath, -0.19);
    solveTposeArmToGrip(
      -1,
      rig.shoulderPosL,
      kWristTargetL,
      kPoleL,
      kPalmTipL,
      kPalmNormL,
      rig.L1,
      rig.L2,
      bones[BONE_ARM_L],
      bones[BONE_ELBOW_L],
      bones[BONE_WRIST_L],
    );

    kWristTargetR.set(0.31 - armShift, -0.01 - armBreath * 0.5, -0.13);
    kPalmTipR.set(0.35 - armShift, -0.07 - armBreath * 0.5, -0.19);
    solveTposeArmToGrip(
      1,
      rig.shoulderPosR,
      kWristTargetR,
      kPoleR,
      kPalmTipR,
      kPalmNormR,
      rig.L1,
      rig.L2,
      bones[BONE_ARM_R],
      bones[BONE_ELBOW_R],
      bones[BONE_WRIST_R],
    );

    bones[BONE_THIGH_L].rotation.set(-1.38, 0, -0.025);
    bones[BONE_THIGH_R].rotation.set(-1.38, 0, 0.025);
    bones[BONE_SHIN_L].rotation.set(0.10 + Math.sin(elapsed * 0.85 + 0.4) * 0.015, 0, 0);
    bones[BONE_SHIN_R].rotation.set(0.10 + Math.sin(elapsed * 0.85 + 2.7) * 0.015, 0, 0);
    bones[BONE_FOOT_L].rotation.set(0.06 + Math.sin(elapsed * 1.1 + 0.8) * 0.022, 0, 0);
    bones[BONE_FOOT_R].rotation.set(0.06 + Math.sin(elapsed * 1.1 + 3.1) * 0.022, 0, 0);
  };

  let pabloSadBlend = 0;
  let pabloShakePhase = 0;

  const applyPabloSadOverride = (actor: ActorInstance, blend: number) => {
    const rig = actor.rig;
    if (!rig || blend <= 0.001) return;
    const bones = rig.bones;

    // Olha para baixo de forma expressiva e balança a cabeça rapidamente negando algo
    const shakeYaw = Math.sin(pabloShakePhase) * 0.34;
    const shakeRoll = Math.sin(pabloShakePhase) * 0.055;
    const downcastHeadPitch = 0.36;
    const downcastTorsoPitch = 0.16;

    bones[BONE_TORSO].rotation.x = THREE.MathUtils.lerp(
      bones[BONE_TORSO].rotation.x,
      downcastTorsoPitch,
      blend,
    );
    bones[BONE_HEAD].rotation.x = THREE.MathUtils.lerp(
      bones[BONE_HEAD].rotation.x,
      downcastHeadPitch,
      blend,
    );
    bones[BONE_HEAD].rotation.y = THREE.MathUtils.lerp(
      bones[BONE_HEAD].rotation.y,
      shakeYaw,
      blend,
    );
    bones[BONE_HEAD].rotation.z = THREE.MathUtils.lerp(
      bones[BONE_HEAD].rotation.z,
      shakeRoll,
      blend,
    );
  };

  const _actorSphere = new THREE.Sphere();
  const roleVisibility: Record<ScenarioSlotId, boolean> = {
    ocarina: true,
    fisher: true,
    killer: true,
  };

  const update = (
    dt: number,
    elapsed: number,
    state: CharacterAnimState,
    currentNote: OcarinaNoteSpec | null,
    notePulseCounter: number,
    customizeMode = false,
    easterEggActive = false,
    frustum: THREE.Frustum | null = null,
  ) => {
    const targetPlay = state === 'playing' && !customizeMode && !easterEggActive ? 1 : 0;
    const targetCustomize = customizeMode && !easterEggActive ? 1 : 0;
    playBlend = THREE.MathUtils.damp(playBlend, targetPlay, 7.5, dt);
    customizeBlend = THREE.MathUtils.damp(customizeBlend, targetCustomize, 6.5, dt);

    const targetSad = easterEggActive ? 1 : 0;
    pabloSadBlend = THREE.MathUtils.damp(pabloSadBlend, targetSad, 6.0, dt);
    if (easterEggActive || pabloSadBlend > 0.01) {
      pabloShakePhase += dt * 18.5;
    } else {
      pabloShakePhase = 0;
    }

    if (notePulseCounter !== lastCounter) {
      lastCounter = notePulseCounter;
      noteEmphasis = 1.0;
    }
    noteEmphasis = THREE.MathUtils.damp(noteEmphasis, 0, 6.0, dt);

    const ocarinaActor = actors[currentSlots.ocarina];
    const fisherActor = actors[currentSlots.fisher];
    const killerActor = actors[currentSlots.killer];

    const checkRoleVisible = (role: ScenarioSlotId): boolean => {
      if (!frustum) return true;
      const spec = SLOT_PLACEMENTS[role];
      return isSphereInFrustum(
        frustum,
        spec.position[0],
        spec.position[1] + 0.55,
        spec.position[2],
        1.55,
        _actorSphere,
      );
    };

    const ocarinaVisible = checkRoleVisible('ocarina');
    const fisherVisible = checkRoleVisible('fisher');
    const killerVisible = checkRoleVisible('killer');
    roleVisibility.ocarina = ocarinaVisible;
    roleVisibility.fisher = fisherVisible;
    roleVisibility.killer = killerVisible;

    ocarinaActor.root.visible = ocarinaVisible;
    fisherActor.root.visible = fisherVisible;
    killerActor.root.visible = killerVisible;

    if (ocarinaVisible) {
      updateOcarinaPose(ocarinaActor, elapsed, state, currentNote);
    }
    if (fisherVisible) {
      updateFisherPose(fisherActor, elapsed);
    }
    if (killerVisible) {
      updateKillerPose(killerActor, elapsed);
    }

    if (pabloSadBlend > 0.001 && actors.pablo.root.visible) {
      applyPabloSadOverride(actors.pablo, pabloSadBlend);
    }
  };

  const getOcarinaWorldPosition = (out: THREE.Vector3): THREE.Vector3 => {
    const activeOcaActor = actors[currentSlots.ocarina];
    activeOcaActor.root.updateMatrixWorld(true);
    if (activeOcaActor.rig) {
      return ocarinaGroup.getWorldPosition(out);
    }
    return out.copy(activeOcaActor.root.position);
  };

  const computeSlotHeadTop = (actor: ActorInstance, out: THREE.Vector3, worldYOffset: number) => {
    actor.root.updateMatrixWorld(true);
    if (actor.rig) {
      out.copy(headAnchorLocal).applyMatrix4(actor.rig.bones[BONE_HEAD].matrixWorld);
      out.y += worldYOffset;
    } else {
      out.copy(actor.root.position);
      out.y += 1.28;
    }
  };

  const getRearSlotHeadPositions = (fisherOut: THREE.Vector3, killerOut: THREE.Vector3) => {
    computeSlotHeadTop(actors[currentSlots.fisher], fisherOut, 0.50);
    computeSlotHeadTop(actors[currentSlots.killer], killerOut, 0.52);
  };

  const headCenterLocal = new THREE.Vector3(0, 0.14, 0);
  const getCharacterCameraFocus = (charId: CharacterId, headOut: THREE.Vector3): number => {
    const actor = actors[charId];
    actor.root.updateMatrixWorld(true);
    if (actor.rig) {
      headOut.copy(headCenterLocal).applyMatrix4(actor.rig.bones[BONE_HEAD].matrixWorld);
    } else {
      headOut.set(
        actor.root.position.x,
        actor.root.position.y + 0.72,
        actor.root.position.z,
      );
    }
    return actor.root.rotation.y;
  };

  return {
    root,
    setSlotAssignment: (nextSlots: CharacterSlotMap) => {
      currentSlots = { ...nextSlots };
      attachPropsForSlots(currentSlots);
    },
    setOcarinaCustomization: ocarinaVisuals.applyCustomization,
    update,
    isRoleVisible: (role: ScenarioSlotId) => roleVisibility[role],
    getOcarinaWorldPosition,
    getRearSlotHeadPositions,
    getCharacterCameraFocus,
    dispose: () => {
      disposed = true;
      ocarinaVisuals.dispose();
      (['gohan', 'pablo', 'killer'] as CharacterId[]).forEach((charId) => {
        actors[charId].rig?.skeleton.dispose();
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
