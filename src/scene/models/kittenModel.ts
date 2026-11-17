import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface KittenRig {
  root: THREE.Group;
  headGroup: THREE.Group;
  update: (dt: number, elapsed: number, isCharacterPlaying: boolean) => void;
  dispose: () => void;
}

const KITTEN_MODEL_URL = '/models/gato.glb';

const BONE_BODY = 0;
const BONE_HEAD = 1;
const BONE_TAIL = 2;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

interface SkinnedKittenRig {
  skinnedMesh: THREE.SkinnedMesh;
  skeleton: THREE.Skeleton;
  bones: THREE.Bone[];
}

function createProceduralSkinnedKitten(sourceMesh: THREE.Mesh): SkinnedKittenRig {
  const geo = sourceMesh.geometry.clone();
  if (!geo.attributes.normal) {
    geo.computeVertexNormals();
  }

  const pos = geo.attributes.position;
  const count = pos.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);

    let b0 = BONE_BODY;
    let w0 = 1;
    let b1 = BONE_BODY;
    let w1 = 0;

    if (y > -0.11) {
      // Transição do pescoço entre y=-0.11 e y=-0.04
      const headW = smoothstep(-0.11, -0.04, y);
      b0 = BONE_HEAD;
      w0 = headW;
      b1 = BONE_BODY;
      w1 = 1 - headW;
    } else if (y < -0.25 && z < -0.22) {
      // Balanço da ponta da cauda enrolada atrás
      const tailZ = smoothstep(-0.22, -0.32, z);
      const tailY = smoothstep(-0.25, -0.34, y);
      const tailW = tailZ * tailY;
      b0 = BONE_TAIL;
      w0 = tailW;
      b1 = BONE_BODY;
      w1 = 1 - tailW;
    }

    const o = i * 4;
    skinIndices[o] = b0;
    skinIndices[o + 1] = b1;
    skinIndices[o + 2] = 0;
    skinIndices[o + 3] = 0;
    skinWeights[o] = w0;
    skinWeights[o + 1] = w1;
    skinWeights[o + 2] = 0;
    skinWeights[o + 3] = 0;
  }

  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  const bodyBone = new THREE.Bone();
  bodyBone.name = 'Body';
  bodyBone.position.set(0, -0.5, 0);

  const headBone = new THREE.Bone();
  headBone.name = 'Head';
  headBone.position.set(0, 0.425, 0.11); // pivô do pescoço no mundo (0, -0.075, +0.11)
  bodyBone.add(headBone);

  const tailBone = new THREE.Bone();
  tailBone.name = 'Tail';
  tailBone.position.set(0, 0.14, -0.24); // pivô da curvatura da cauda no mundo (0, -0.36, -0.24)
  bodyBone.add(tailBone);

  const bones = [bodyBone, headBone, tailBone];

  const rawMat = sourceMesh.material;
  let finalMat: THREE.Material;
  if (rawMat instanceof THREE.MeshStandardMaterial) {
    finalMat = rawMat.clone();
    const std = finalMat as THREE.MeshStandardMaterial;
    std.flatShading = true;
    std.roughness = 0.85;
    std.metalness = 0.02;
    std.envMapIntensity = 0.45;
    if (std.map) {
      std.map.colorSpace = THREE.SRGBColorSpace;
      std.map.needsUpdate = true;
    }
    std.needsUpdate = true;
  } else {
    finalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.02,
      flatShading: true,
    });
  }

  geo.computeBoundingSphere();
  if (geo.boundingSphere) {
    geo.boundingSphere.radius *= 1.45;
  }

  const skinnedMesh = new THREE.SkinnedMesh(geo, finalMat);
  skinnedMesh.castShadow = true;
  skinnedMesh.receiveShadow = true;
  skinnedMesh.frustumCulled = true;
  skinnedMesh.add(bodyBone);

  const skeleton = new THREE.Skeleton(bones);
  bodyBone.updateMatrixWorld(true);
  skinnedMesh.bind(skeleton);

  return { skinnedMesh, skeleton, bones };
}

export function createKittenModel(): KittenRig {
  const root = new THREE.Group();
  const modelWrapper = new THREE.Group();
  const scale = 0.68;
  modelWrapper.scale.setScalar(scale);
  // Eleva em 0.5006 * scale para que as patas apoiem rente a y=0 na mureta de pedra
  modelWrapper.position.set(0, 0.5006 * scale, -0.02);
  root.add(modelWrapper);

  const headGroup = new THREE.Group();
  modelWrapper.add(headGroup);

  let rig: SkinnedKittenRig | null = null;
  let glbDisposed = false;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const loader = new GLTFLoader();
  loader.load(
    KITTEN_MODEL_URL,
    (gltf) => {
      if (glbDisposed) {
        gltf.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => m?.dispose());
          }
        });
        return;
      }

      let primaryMesh: THREE.Mesh | null = null;
      gltf.scene.traverse((obj) => {
        if (!primaryMesh && obj instanceof THREE.Mesh) {
          primaryMesh = obj;
        }
      });

      if (!primaryMesh) return;

      rig = createProceduralSkinnedKitten(primaryMesh);
      geometries.push(rig.skinnedMesh.geometry);
      const mat = rig.skinnedMesh.material;
      if (mat instanceof THREE.Material) {
        materials.push(mat);
        if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
          textures.push(mat.map);
        }
      }

      modelWrapper.add(rig.skinnedMesh);

      (primaryMesh as THREE.Mesh).geometry?.dispose();
      const srcMat = (primaryMesh as THREE.Mesh).material;
      if (Array.isArray(srcMat)) srcMat.forEach((m) => m.dispose());
      else srcMat?.dispose();
    },
    undefined,
    (err) => {
      console.error('Failed to load kitten GLB model:', err);
    },
  );

  const update = (dt: number, elapsed: number, isCharacterPlaying: boolean) => {
    if (!rig) return;
    const bones = rig.bones;

    // Respiração suave
    bones[BONE_BODY].scale.y = 1 + Math.sin(elapsed * 2.1) * 0.014;

    // Inclinação curiosa da cabeça acompanhando quando o personagem toca a ocarina
    const playTilt = isCharacterPlaying ? 0.1 + Math.sin(elapsed * 2.5) * 0.055 : 0;
    bones[BONE_HEAD].rotation.z = THREE.MathUtils.damp(
      bones[BONE_HEAD].rotation.z,
      Math.sin(elapsed * 0.8) * 0.038 + playTilt,
      4.5,
      dt,
    );
    bones[BONE_HEAD].rotation.y = THREE.MathUtils.damp(
      bones[BONE_HEAD].rotation.y,
      Math.sin(elapsed * 0.55) * 0.07 + (isCharacterPlaying ? -0.12 : 0),
      3.5,
      dt,
    );
    bones[BONE_HEAD].rotation.x = THREE.MathUtils.damp(
      bones[BONE_HEAD].rotation.x,
      Math.sin(elapsed * 1.1) * 0.025 + (isCharacterPlaying ? -0.04 : 0),
      4.0,
      dt,
    );

    // Balanço leve da ponta da cauda
    const tailFreq = isCharacterPlaying ? 2.4 : 1.1;
    bones[BONE_TAIL].rotation.y = Math.sin(elapsed * tailFreq) * 0.1;
  };

  return {
    root,
    headGroup,
    update,
    dispose: () => {
      glbDisposed = true;
      rig?.skeleton.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
