import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildProcessedScenarioTextures } from '../scenarioTextureProcessor';
import { isSphereInFrustum } from '../renderOptimization';

export interface VillageEnvironmentRig {
  root: THREE.Group;
  lanternPointLight: THREE.PointLight;
  update: (
    dt: number,
    elapsed: number,
    frustum?: THREE.Frustum | null,
    foregroundActive?: boolean,
  ) => void;
  dispose: () => void;
}

const SCENARIO_MODEL_URL = '/models/cenario.glb';

// Escala do cenário e alinhamento vertical para a base do muro do canal apoiar no plano da água (y = 0)
// e o parapeito de pedra em primeiro plano (y_glb = -0.233) ficar em y_world = 1.07
export const SCENARIO_SCALE = 10.0;
export const SCENARIO_Y_OFFSET = 3.40;
export const LEDGE_TOP_Y = -0.233 * SCENARIO_SCALE + SCENARIO_Y_OFFSET; // 1.07

interface ReflectionSource {
  x: number;
  z: number;
  width: number;
  intensity: number;
}

export function createVillageEnvironment(isSoftwareGl: boolean): VillageEnvironmentRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const glbTextures: THREE.Texture[] = [];
  const emissiveMaterials: THREE.MeshStandardMaterial[] = [];

  // --- 1. DOMO DO CÉU NOTURNO COM NEBULOSA E ESTRELAS CINTILANTES ---
  const skyGeo = new THREE.SphereGeometry(65, 24, 16);
  geometries.push(skyGeo);
  const skyShaderMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldDir;
      uniform float uTime;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.05;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y * 1.4 + 0.15, 0.0, 1.0);

        // Índigo profundo à meia-noite até horizonte azul-violeta rico
        vec3 zenith = vec3(0.015, 0.008, 0.11);
        vec3 midSky = vec3(0.055, 0.025, 0.24);
        vec3 horizon = vec3(0.14, 0.04, 0.36);
        vec3 col = mix(horizon, midSky, smoothstep(0.0, 0.45, h));
        col = mix(col, zenith, smoothstep(0.38, 0.95, h));

        // Nuvens diagonais violeta/magenta de nebulosa no céu noturno
        vec2 skyUv = vec2(atan(dir.x, -dir.z), dir.y);
        vec2 nebUv = vec2(skyUv.x * 2.6 + skyUv.y * 2.2, skyUv.y * 4.5 - skyUv.x * 1.1);
        float n1 = fbm(nebUv + vec2(uTime * 0.008, 0.0));
        float n2 = fbm(nebUv * 1.8 - vec2(1.4, uTime * 0.006));
        float nebBand = smoothstep(0.42, 0.82, n1 * 0.65 + n2 * 0.35) * smoothstep(0.02, 0.55, h);
        col += vec3(0.32, 0.06, 0.58) * nebBand * 0.72;

        // Campo nítido de estrelas cintilantes ao fundo
        vec2 starGrid = skyUv * vec2(44.0, 38.0);
        vec2 cell = floor(starGrid);
        vec2 f = fract(starGrid) - 0.5;
        float rnd = hash(cell);
        if (rnd > 0.87 && h > 0.12) {
          vec2 jitter = vec2(hash(cell + 7.1), hash(cell + 19.3)) - 0.5;
          float d = length(f - jitter * 0.65);
          float twinkle = 0.55 + 0.45 * sin(uTime * (2.2 + rnd * 3.5) + rnd * 40.0);
          float starCore = smoothstep(0.14, 0.0, d) * twinkle;
          vec3 starCol = mix(vec3(0.55, 0.72, 1.0), vec3(0.95, 0.97, 1.0), hash(cell + 3.7));
          col += starCol * starCore * 1.45;
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  materials.push(skyShaderMat);
  const skyDome = new THREE.Mesh(skyGeo, skyShaderMat);
  root.add(skyDome);

  // Estrelas cintilantes em cruz de 4 pontas em destaque no céu superior
  const crossStarCanvas = document.createElement('canvas');
  crossStarCanvas.width = 64;
  crossStarCanvas.height = 64;
  const sctx = crossStarCanvas.getContext('2d')!;
  const sg = sctx.createRadialGradient(32, 32, 1, 32, 32, 26);
  sg.addColorStop(0, 'rgba(255,255,255,1)');
  sg.addColorStop(0.18, 'rgba(160,195,255,0.88)');
  sg.addColorStop(0.5, 'rgba(90,110,255,0.22)');
  sg.addColorStop(1, 'rgba(40,50,200,0)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 64, 64);

  const vGrad = sctx.createLinearGradient(32, 4, 32, 60);
  vGrad.addColorStop(0, 'rgba(180,210,255,0)');
  vGrad.addColorStop(0.5, 'rgba(255,255,255,0.98)');
  vGrad.addColorStop(1, 'rgba(180,210,255,0)');
  sctx.fillStyle = vGrad;
  sctx.fillRect(31, 4, 2, 56);

  const hGrad = sctx.createLinearGradient(4, 32, 60, 32);
  hGrad.addColorStop(0, 'rgba(180,210,255,0)');
  hGrad.addColorStop(0.5, 'rgba(255,255,255,0.98)');
  hGrad.addColorStop(1, 'rgba(180,210,255,0)');
  sctx.fillStyle = hGrad;
  sctx.fillRect(4, 31, 56, 2);

  const crossStarTex = new THREE.CanvasTexture(crossStarCanvas);
  crossStarTex.colorSpace = THREE.SRGBColorSpace;

  const crossStarSpecs = [
    { pos: [-7.2, 11.4, -24], scale: 1.45, phase: 0.2 },
    { pos: [-1.2, 8.2, -23], scale: 1.30, phase: 1.8 },
    { pos: [4.2, 10.8, -24], scale: 1.25, phase: 3.1 },
    { pos: [-11.5, 9.6, -24], scale: 1.05, phase: 4.4 },
    { pos: [-4.2, 12.6, -25], scale: 0.95, phase: 2.3 },
    { pos: [8.4, 9.6, -23], scale: 1.15, phase: 5.2 },
  ];
  const crossSprites: Array<{ sprite: THREE.Sprite; baseScale: number; phase: number }> = [];
  const crossSpriteMaterials: THREE.SpriteMaterial[] = [];
  for (const spec of crossStarSpecs) {
    const sm = new THREE.SpriteMaterial({
      map: crossStarTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    crossSpriteMaterials.push(sm);
    const sp = new THREE.Sprite(sm);
    sp.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    sp.scale.setScalar(spec.scale);
    root.add(sp);
    crossSprites.push({ sprite: sp, baseScale: spec.scale, phase: spec.phase });
  }

  // --- 2. CENÁRIO 3D DA VILA IMPORTADO (cenario.glb — REFINO N64 E BRILHO DAS JANELAS) ---
  const scenarioGroup = new THREE.Group();
  scenarioGroup.scale.setScalar(SCENARIO_SCALE);
  scenarioGroup.position.set(0, SCENARIO_Y_OFFSET, 0);
  root.add(scenarioGroup);

  let glbDisposed = false;
  const loader = new GLTFLoader();
  loader.load(
    SCENARIO_MODEL_URL,
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

      gltf.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = !isSoftwareGl;
          obj.receiveShadow = true;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m instanceof THREE.MeshStandardMaterial) {
              if (m.map) {
                glbTextures.push(m.map);
                const processed = buildProcessedScenarioTextures(m.map, 1024);
                if (processed) {
                  m.map = processed.albedoTexture;
                  m.emissive = new THREE.Color(0xff9b1a);
                  m.emissiveMap = processed.emissiveTexture;
                  m.emissiveIntensity = 2.75;
                  glbTextures.push(processed.albedoTexture, processed.emissiveTexture);
                  emissiveMaterials.push(m);
                } else {
                  m.map.colorSpace = THREE.SRGBColorSpace;
                  m.map.needsUpdate = true;
                }
              }
              if (m.roughnessMap) glbTextures.push(m.roughnessMap);
              if (m.normalMap) {
                glbTextures.push(m.normalMap);
                // Suaviza ruídos de alta frequência do normal map para combinar com os personagens low-poly N64
                m.normalScale.set(0.22, 0.22);
              }
              // Calibra acabamento fosco estilo N64 combinando com o personagem e o gatinho
              m.roughness = 0.90;
              m.metalness = 0.03;
              m.envMapIntensity = 0.14;
              m.needsUpdate = true;
              materials.push(m);
            }
          });
          if (obj.geometry) {
            if (!obj.geometry.boundingSphere) {
              obj.geometry.computeBoundingSphere();
            }
            geometries.push(obj.geometry);
          }
        }
      });

      scenarioGroup.add(gltf.scene);
    },
    undefined,
    (err) => {
      console.error('Failed to load scenario GLB model:', err);
    },
  );

  // --- 3. LUZES PONTUAIS QUENTES NA LANTERNA PENDURADA E JANELAS ACESAS DO MAPA ---
  // Lanterna pendente principal em primeiro plano (malha próxima de [6.1, 3.95, 8.2]) banhando o tocador, gatinho e mureta
  const lanternPointLight = new THREE.PointLight(0xff9b22, 16.0, 15.0, 1.45);
  lanternPointLight.position.set(5.75, 3.65, 7.65);
  root.add(lanternPointLight);

  // Focos de luz das janelas das casas espalhadas pela vila noturna
  const windowLightSpecs: Array<{ pos: [number, number, number]; color: number; base: number; dist: number; phase: number }> = [
    { pos: [6.85, 2.35, 5.95], color: 0xff941e, base: 8.2, dist: 10.0, phase: 0.4 },   // Janela inferior direita em primeiro plano
    { pos: [-7.2, 2.6, 2.2], color: 0xff9622, base: 6.8, dist: 9.5, phase: 1.5 },     // Base da torre na margem esquerda
    { pos: [-7.08, 3.58, 2.30], color: 0xffa030, base: 2.0, dist: 3.8, phase: 2.1 },   // Brilho quente sutil na janela superior da torre
    { pos: [-4.6, 2.1, -5.4], color: 0xff941c, base: 8.0, dist: 10.0, phase: 2.7 },   // Casa da margem esquerda ao fundo do canal
    { pos: [-1.6, 2.6, -5.2], color: 0xff9e26, base: 9.8, dist: 11.0, phase: 3.9 },   // Casa central principal do canal
    { pos: [2.8, 2.1, -7.2], color: 0xff921c, base: 6.4, dist: 9.5, phase: 5.1 },     // Casa distante à direita da vila
  ];
  const windowLights = windowLightSpecs.map((spec) => {
    const pt = new THREE.PointLight(spec.color, spec.base, spec.dist, 1.55);
    pt.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    root.add(pt);
    return {
      light: pt,
      x: spec.pos[0],
      y: spec.pos[1],
      z: spec.pos[2],
      dist: spec.dist,
      base: spec.base,
      phase: spec.phase,
    };
  });

  // --- 4. ÁGUA DO CANAL SAFIRA RETRÔ N64 COM REFLEXOS DOURADOS SEGMENTADOS ---
  const waterGeo = new THREE.PlaneGeometry(34, 26, 24, 16);
  waterGeo.rotateX(-Math.PI / 2);
  geometries.push(waterGeo);

  const reflectionSources: ReflectionSource[] = [
    { x: -6.2, z: 1.2, width: 0.44, intensity: 0.85 },
    { x: -4.7, z: -4.6, width: 0.48, intensity: 1.05 },
    { x: -2.4, z: -5.4, width: 0.54, intensity: 1.22 },
    { x: -0.7, z: -5.5, width: 0.48, intensity: 1.15 },
    { x: 0.9, z: -5.2, width: 0.36, intensity: 0.78 },
  ];

  const reflVecs: THREE.Vector4[] = [];
  for (let i = 0; i < 8; i++) {
    const src = reflectionSources[i];
    if (src) {
      reflVecs.push(new THREE.Vector4(src.x, src.z, src.width, src.intensity));
    } else {
      reflVecs.push(new THREE.Vector4(999, 999, 0.5, 0));
    }
  }

  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uReflections: { value: reflVecs },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      void main() {
        vec3 pos = position;
        pos.y += sin(pos.x * 1.4 + uTime * 1.5) * 0.010 + cos(pos.z * 1.8 - uTime * 1.2) * 0.008;
        vec4 wp = modelMatrix * vec4(pos, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec4 uReflections[8];
      varying vec3 vWorldPos;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        // Quantização fina de coordenadas N64 mesclada suavemente para nitidez retrô sem blocos grosseiros
        vec2 qUv = floor(vWorldPos.xz * vec2(34.0, 64.0)) / vec2(34.0, 64.0);
        vec2 uv = mix(vWorldPos.xz, qUv, 0.35);

        float w1 = noise(vec2(uv.x * 2.1 + uTime * 0.30, uv.y * 7.8 - uTime * 0.55));
        float w2 = noise(vec2(uv.x * 4.2 - uTime * 0.25, uv.y * 14.5 + uTime * 0.42));
        float ripple = w1 * 0.62 + w2 * 0.38;

        // Base azul-marinho meia-noite e safira real com cristas cerúleas estilizadas
        vec3 deepWater = vec3(0.008, 0.025, 0.145);
        vec3 midWater = vec3(0.022, 0.088, 0.34);
        vec3 crestWater = vec3(0.065, 0.22, 0.60);
        vec3 col = mix(deepWater, midWater, smoothstep(0.38, 0.54, ripple));
        col = mix(col, crestWater, smoothstep(0.73, 0.83, ripple) * 0.78);

        // Faixas de reflexo laranja-douradas nítidas alinhadas sob as janelas iluminadas
        float totalGlow = 0.0;
        for (int i = 0; i < 8; i++) {
          vec4 r = uReflections[i];
          if (r.w > 0.01 && vWorldPos.z > r.y - 0.35) {
            float sway = (w1 - 0.5) * 0.34 + sin(uv.y * 7.5 + uTime * 2.2 + float(i) * 1.7) * 0.09;
            float dx = abs((uv.x + sway) - r.x);
            float zDist = clamp((uv.y - r.y) / 13.5, 0.0, 1.0);
            float spread = r.z * (0.44 + zDist * 0.18);
            float colMask = exp(-pow(dx / spread, 2.2));

            // Fatias horizontais estreitas de onda combinando com o visual clássico de reflexo do N64
            float streakPhase = uv.y * 18.0 - uTime * 2.3 + w1 * 4.8 + sin(uv.x * 3.8 + float(i)) * 0.9;
            float streak = smoothstep(0.52, 0.72, sin(streakPhase) * 0.5 + 0.5);
            float subBreak = smoothstep(0.30, 0.55, w2);
            totalGlow += colMask * (1.0 - zDist * 0.38) * streak * (0.35 + 0.65 * subBreak) * r.w;
          }
        }

        // Borda laranja e núcleo amarelo-dourado em dois tons nos reflexos
        float reflMask = smoothstep(0.18, 0.42, totalGlow);
        float coreMask = smoothstep(0.52, 0.82, totalGlow);
        vec3 orangeRefl = vec3(0.98, 0.36, 0.02);
        vec3 goldRefl = vec3(1.0, 0.90, 0.24);
        vec3 reflCol = mix(orangeRefl, goldRefl, coreMask);
        col = mix(col, reflCol, clamp(reflMask * 0.95, 0.0, 1.0));

        // Atenuação atmosférica sutil pela distância em direção ao índigo noturno escuro
        float dist = length(vWorldPos.xz - vec2(0.0, 5.0));
        float fogAmt = smoothstep(12.0, 26.0, dist);
        col = mix(col, vec3(0.032, 0.014, 0.13), fogAmt);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  materials.push(waterMat);
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(-0.5, 0.0, 0.0);
  root.add(waterMesh);

  // Vaga-lumes sutis / partículas de luz estelar flutuando perto do canal e da margem
  const moteGeo = new THREE.IcosahedronGeometry(0.024, 0);
  const moteMat = new THREE.MeshBasicMaterial({
    color: 0xffd86b,
    transparent: true,
    opacity: 0.72,
  });
  geometries.push(moteGeo);
  materials.push(moteMat);
  const moteCount = isSoftwareGl ? 14 : 22;
  const moteMesh = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
  const moteSeeds = Array.from({ length: moteCount }, (_, i) => ({
    x: -4.2 + (i % 8) * 1.15,
    y: 0.8 + ((i * 7) % 5) * 0.42,
    z: -2.0 + ((i * 3) % 6) * 1.15,
    phase: i * 1.37,
  }));
  moteMesh.frustumCulled = false;
  root.add(moteMesh);

  const _moteDummy = new THREE.Object3D();
  const _cullSphere = new THREE.Sphere();

  const update = (
    _dt: number,
    elapsed: number,
    frustum: THREE.Frustum | null = null,
    foregroundActive = true,
  ) => {
    skyShaderMat.uniforms.uTime.value = elapsed;

    // Cintilação suave das estrelas principais de 4 pontas
    for (let i = 0; i < crossSprites.length; i++) {
      const s = crossSprites[i];
      const pulse = 0.84 + 0.22 * Math.sin(elapsed * 2.1 + s.phase);
      s.sprite.scale.setScalar(s.baseScale * pulse);
      crossSpriteMaterials[i].opacity = 0.75 + 0.25 * Math.sin(elapsed * 2.6 + s.phase);
    }

    if (!foregroundActive) {
      scenarioGroup.visible = false;
      waterMesh.visible = false;
      moteMesh.visible = false;
      lanternPointLight.visible = false;
      for (let i = 0; i < windowLights.length; i++) {
        windowLights[i].light.visible = false;
      }
      return;
    }

    scenarioGroup.visible = true;

    const waterVisible =
      !frustum || isSphereInFrustum(frustum, -0.5, 0.0, 0.0, 22.0, _cullSphere);
    waterMesh.visible = waterVisible;
    if (waterVisible) {
      waterMat.uniforms.uTime.value = elapsed;
    }

    const lanternVisible =
      !frustum || isSphereInFrustum(frustum, 5.75, 3.65, 7.65, 15.0, _cullSphere);
    lanternPointLight.visible = lanternVisible;
    if (lanternVisible) {
      lanternPointLight.intensity =
        15.6 + Math.sin(elapsed * 3.8) * 0.65 + Math.sin(elapsed * 7.1) * 0.35;
    }

    for (let i = 0; i < windowLights.length; i++) {
      const wl = windowLights[i];
      const wlVisible =
        !frustum || isSphereInFrustum(frustum, wl.x, wl.y, wl.z, wl.dist, _cullSphere);
      wl.light.visible = wlVisible;
      if (wlVisible) {
        wl.light.intensity =
          wl.base +
          Math.sin(elapsed * 2.7 + wl.phase) * 0.22 +
          Math.sin(elapsed * 5.9 + wl.phase) * 0.10;
      }
    }

    const emissivePulse = 2.65 + Math.sin(elapsed * 3.2) * 0.14 + Math.sin(elapsed * 6.4) * 0.06;
    for (let i = 0; i < emissiveMaterials.length; i++) {
      emissiveMaterials[i].emissiveIntensity = emissivePulse;
    }

    // Flutuação suave dos vaga-lumes quentes (ignora atualização fora do frustum da câmera)
    const motesVisible =
      !frustum || isSphereInFrustum(frustum, -0.1, 1.6, 1.0, 7.2, _cullSphere);
    moteMesh.visible = motesVisible;
    if (motesVisible) {
      for (let i = 0; i < moteCount; i++) {
        const m = moteSeeds[i];
        _moteDummy.position.set(
          m.x + Math.sin(elapsed * 0.55 + m.phase) * 0.22,
          m.y + Math.cos(elapsed * 0.8 + m.phase) * 0.16,
          m.z + Math.sin(elapsed * 0.45 + m.phase * 0.7) * 0.18,
        );
        const sc = 0.65 + 0.45 * Math.sin(elapsed * 2.4 + m.phase);
        _moteDummy.scale.setScalar(Math.max(0.15, sc));
        _moteDummy.updateMatrix();
        moteMesh.setMatrixAt(i, _moteDummy.matrix);
      }
      moteMesh.instanceMatrix.needsUpdate = true;
    }
  };

  return {
    root,
    lanternPointLight,
    update,
    dispose: () => {
      glbDisposed = true;
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      glbTextures.forEach((t) => t.dispose());
      crossSpriteMaterials.forEach((m) => m.dispose());
      crossStarTex.dispose();
    },
  };
}
