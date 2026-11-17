import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { SimulatorController, SimulatorSnapshot } from '../state/simulatorEvents';
import { createSceneTextures } from './textures';
import {
  DEFAULT_OCARINA_CUSTOMIZATION,
  type OcarinaCustomizationState,
} from './ocarinaCustomization';
import {
  INITIAL_CHARACTER_SLOTS,
  type CharacterSlotMap,
} from './characterRoles';
import {
  createPlayableActorsCoordinator,
  type PlayableActorsCoordinator,
} from './models/playableActorModel';
import { createKittenModel } from './models/kittenModel';
import { createVillageEnvironment } from './models/villageEnvironment';
import {
  dampCameraPose,
  getBackgroundCharactersCameraPose,
  getOcarinaCustomizeCameraPose,
  getPabloFocusCameraPose,
  getResponsiveCameraPose,
  getTitleSkyCameraPose,
  type CameraPose,
  type SceneCameraMode,
} from './cameraPreset';
import { computeScenePixelRatio } from './crtFilter';
import { createOcarinaMusicParticles } from './ocarinaNotesParticles';
import {
  computeShadowPassActive,
  isSphereInFrustum,
  shouldRenderVillageForeground,
} from './renderOptimization';

interface OcarinaSceneCanvasProps {
  controller: SimulatorController;
  crtEnabled: boolean;
  cameraMode?: SceneCameraMode;
  ocarinaCustomization?: OcarinaCustomizationState;
  characterSlots?: CharacterSlotMap;
  easterEggActive?: boolean;
  fisherNameplateRef?: RefObject<HTMLButtonElement | null>;
  killerNameplateRef?: RefObject<HTMLButtonElement | null>;
  onSceneLoadProgress?: (progress: number, ready: boolean) => void;
}

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export function OcarinaSceneCanvas({
  controller,
  crtEnabled,
  cameraMode = 'default',
  ocarinaCustomization = DEFAULT_OCARINA_CUSTOMIZATION,
  characterSlots = INITIAL_CHARACTER_SLOTS,
  easterEggActive = false,
  fisherNameplateRef,
  killerNameplateRef,
  onSceneLoadProgress,
}: OcarinaSceneCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<SimulatorSnapshot>(controller.getSnapshot());
  const crtEnabledRef = useRef<boolean>(crtEnabled);
  const cameraModeRef = useRef<SceneCameraMode>(cameraMode);
  const customizationRef = useRef<OcarinaCustomizationState>(ocarinaCustomization);
  const characterSlotsRef = useRef<CharacterSlotMap>(characterSlots);
  const easterEggActiveRef = useRef<boolean>(easterEggActive);
  const fisherBtnRef = useRef<RefObject<HTMLButtonElement | null> | undefined>(fisherNameplateRef);
  const killerBtnRef = useRef<RefObject<HTMLButtonElement | null> | undefined>(killerNameplateRef);
  const onSceneLoadProgressRef = useRef(onSceneLoadProgress);
  const actorsRef = useRef<PlayableActorsCoordinator | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isSoftwareGlRef = useRef<boolean>(false);

  useEffect(() => {
    onSceneLoadProgressRef.current = onSceneLoadProgress;
  }, [onSceneLoadProgress]);

  const isDescendingFromTitleRef = useRef<boolean>(false);

  useEffect(() => {
    const prevMode = cameraModeRef.current;
    cameraModeRef.current = cameraMode;
    if (prevMode === 'title-sky' && cameraMode === 'default') {
      isDescendingFromTitleRef.current = true;
    } else if (cameraMode !== 'default') {
      isDescendingFromTitleRef.current = false;
    }
  }, [cameraMode]);

  useEffect(() => {
    fisherBtnRef.current = fisherNameplateRef;
    killerBtnRef.current = killerNameplateRef;
  }, [fisherNameplateRef, killerNameplateRef]);

  useEffect(() => {
    customizationRef.current = ocarinaCustomization;
    actorsRef.current?.setOcarinaCustomization(ocarinaCustomization);
  }, [ocarinaCustomization]);

  useEffect(() => {
    characterSlotsRef.current = characterSlots;
    actorsRef.current?.setSlotAssignment(characterSlots);
  }, [characterSlots]);

  useEffect(() => {
    easterEggActiveRef.current = easterEggActive;
  }, [easterEggActive]);

  useEffect(() => {
    const unsub = controller.subscribe((snap) => {
      snapshotRef.current = snap;
    });
    return unsub;
  }, [controller]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    isSoftwareGlRef.current = isSoftwareGl;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040218);
    scene.fog = new THREE.FogExp2(0x080320, 0.024);
    sceneRef.current = scene;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / Math.max(1, height);

    let currentCameraPose: CameraPose =
      cameraModeRef.current === 'title-sky'
        ? getTitleSkyCameraPose(aspect)
        : cameraModeRef.current === 'customize-ocarina'
          ? getOcarinaCustomizeCameraPose(aspect)
          : cameraModeRef.current === 'view-characters'
            ? getBackgroundCharactersCameraPose(aspect)
            : getResponsiveCameraPose(aspect);
    const camera = new THREE.PerspectiveCamera(currentCameraPose.fov, aspect, 0.1, 140);
    cameraRef.current = camera;

    const applyCameraPoseToThree = (pose: CameraPose, a: number) => {
      camera.aspect = a;
      camera.fov = pose.fov;
      camera.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
      camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
      camera.updateProjectionMatrix();
    };
    applyCameraPoseToThree(currentCameraPose, aspect);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(
      computeScenePixelRatio(isSoftwareGl, window.devicePixelRatio || 1, crtEnabledRef.current),
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.11;
    pmremGenerator.dispose();

    const hemiFill = new THREE.HemisphereLight(0x324098, 0x0c0820, 0.38);
    scene.add(hemiFill);

    const moonKey = new THREE.DirectionalLight(0x5e7de0, 0.26);
    moonKey.position.set(-5, 9, 4);
    scene.add(moonKey);

    const warmLanternKey = new THREE.SpotLight(0xffa838, 22.0, 11.5, Math.PI * 0.34, 0.65, 1.5);
    warmLanternKey.position.set(5.8, 3.85, 8.0);
    warmLanternKey.target.position.set(2.95, 1.35, 6.65);
    scene.add(warmLanternKey.target);
    warmLanternKey.castShadow = !isSoftwareGl;
    warmLanternKey.shadow.mapSize.set(1024, 1024);
    warmLanternKey.shadow.camera.near = 0.8;
    warmLanternKey.shadow.camera.far = 12;
    warmLanternKey.shadow.bias = -0.0005;
    warmLanternKey.shadow.normalBias = 0.02;
    scene.add(warmLanternKey);

    const rimLight = new THREE.DirectionalLight(0x4e2eb8, 0.24);
    rimLight.position.set(-2.5, 5.0, -5.5);
    scene.add(rimLight);

    const textures = createSceneTextures();

    let disposed = false;
    let maxReportedSceneProgress = 0;
    let sceneReadyReported = false;
    let warmupTimeoutId = 0;
    let safetyTimeoutId = 0;
    const emitSceneProgress = (rawProgress: number, ready: boolean) => {
      if (disposed) return;
      maxReportedSceneProgress = Math.max(maxReportedSceneProgress, Math.min(1, rawProgress));
      if (ready) {
        sceneReadyReported = true;
      }
      onSceneLoadProgressRef.current?.(maxReportedSceneProgress, sceneReadyReported);
    };

    emitSceneProgress(0.12, false);

    const prevOnStart = THREE.DefaultLoadingManager.onStart;
    const prevOnProgress = THREE.DefaultLoadingManager.onProgress;
    const prevOnLoad = THREE.DefaultLoadingManager.onLoad;
    const prevOnError = THREE.DefaultLoadingManager.onError;

    const handleManagerProgress = (loaded: number, total: number) => {
      const ratio = total > 0 ? Math.min(1, loaded / total) : 0;
      emitSceneProgress(0.15 + ratio * 0.72, false);
    };

    THREE.DefaultLoadingManager.onStart = (url, loaded, total) => {
      handleManagerProgress(loaded, Math.max(7, total));
      prevOnStart?.(url, loaded, total);
    };
    THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
      handleManagerProgress(loaded, Math.max(7, total));
      prevOnProgress?.(url, loaded, total);
    };
    THREE.DefaultLoadingManager.onError = (url) => {
      prevOnError?.(url);
    };

    const village = createVillageEnvironment(isSoftwareGl);
    scene.add(village.root);

    // Trio unificado de personagens jogáveis (Gohan, Pablo, Killer) capaz de alternar livremente entre os 3 papéis do cenário
    const actors = createPlayableActorsCoordinator(
      customizationRef.current,
      characterSlotsRef.current,
    );
    actorsRef.current = actors;
    scene.add(actors.root);

    const musicParticles = createOcarinaMusicParticles();
    scene.add(musicParticles.root);
    const ocarinaSpawnOrigin = new THREE.Vector3();
    const fisherHeadWorld = new THREE.Vector3();
    const killerHeadWorld = new THREE.Vector3();
    const pabloHeadWorld = new THREE.Vector3();
    const projVec = new THREE.Vector3();

    const kitten = createKittenModel();
    kitten.root.position.set(3.38, 1.19, 6.82);
    kitten.root.rotation.y = -0.08;
    scene.add(kitten.root);

    // Discos suaves de sombra radial de contato sob os 3 assentos dos personagens + gatinho
    const shadowDiscGeo = new THREE.CircleGeometry(0.32, 16);
    shadowDiscGeo.rotateX(-Math.PI / 2);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const boyShadow = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    boyShadow.position.set(2.75, 1.155, 6.52);
    boyShadow.scale.set(1.15, 1, 0.95);
    const catShadow = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    catShadow.position.set(3.38, 1.205, 6.82);
    catShadow.scale.set(0.75, 1, 0.75);
    const fisherShadow = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    fisherShadow.position.set(1.36, 1.028, 3.16);
    fisherShadow.scale.set(1.10, 1, 0.95);
    const killerShadow = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    killerShadow.position.set(1.77, 1.038, 3.93);
    killerShadow.scale.set(1.10, 1, 0.95);
    scene.add(boyShadow, catShadow, fisherShadow, killerShadow);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const finalizeSceneWarmup = () => {
      if (disposed || sceneReadyReported) return;
      emitSceneProgress(0.92, false);
      warmupTimeoutId = window.setTimeout(() => {
        if (disposed || sceneReadyReported) return;
        actors.update(0.016, 0.016, 'idle', null, 0, false);
        kitten.update(0.016, 0.016, false);
        village.update(0.016, 0.016);
        if (!isSoftwareGl) {
          renderer.compile(scene, camera);
        }
        renderer.render(scene, camera);
        emitSceneProgress(1, true);
      }, 60);
    };

    THREE.DefaultLoadingManager.onLoad = () => {
      finalizeSceneWarmup();
      prevOnLoad?.();
    };

    // Contingência de segurança para que recursos lentos nunca impeçam a entrada no aplicativo
    safetyTimeoutId = window.setTimeout(() => {
      finalizeSceneWarmup();
    }, 14000);

    let cachedWidth = width;
    let cachedHeight = height;

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      cachedWidth = w;
      cachedHeight = h;
      const a = w / Math.max(1, h);
      applyCameraPoseToThree(currentCameraPose, a);
      renderer.setPixelRatio(
        computeScenePixelRatio(isSoftwareGl, window.devicePixelRatio || 1, crtEnabledRef.current),
      );
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', handleResize);

    const _projScreenMatrix = new THREE.Matrix4();
    const _frustum = new THREE.Frustum();
    const _frustumSphere = new THREE.Sphere();

    let frameId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let lastSpawnPulseCounter = -1;
    let pausedByVisibility = typeof document !== 'undefined' && document.hidden;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed || pausedByVisibility) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function scheduleNextFrame() {
      if (disposed || pausedByVisibility) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    function tick() {
      if (disposed || pausedByVisibility) return;
      const now = performance.now();
      const rawDt = Math.max(0.001, (now - lastTime) / 1000);
      const dt = Math.min(0.25, rawDt);
      const cameraDt = Math.min(1.5, rawDt);
      lastTime = now;
      elapsed += dt;

      const w = cachedWidth;
      const h = cachedHeight;
      const a = w / Math.max(1, h);
      const mode = cameraModeRef.current;
      const isCustomizing = mode === 'customize-ocarina';
      const isEasterEgg = easterEggActiveRef.current || mode === 'pablo-easter-egg';

      const snap = snapshotRef.current;
      let targetPose: CameraPose;
      if (mode === 'pablo-easter-egg') {
        const pabloYaw = actors.getCharacterCameraFocus('pablo', pabloHeadWorld);
        targetPose = getPabloFocusCameraPose(
          [pabloHeadWorld.x, pabloHeadWorld.y, pabloHeadWorld.z],
          pabloYaw,
          a,
        );
      } else if (mode === 'title-sky') {
        targetPose = getTitleSkyCameraPose(a);
      } else if (mode === 'customize-ocarina') {
        targetPose = getOcarinaCustomizeCameraPose(a);
      } else if (mode === 'view-characters') {
        targetPose = getBackgroundCharactersCameraPose(a);
      } else {
        targetPose = getResponsiveCameraPose(a);
      }

      const dampLambda = isDescendingFromTitleRef.current ? 2.6 : mode === 'pablo-easter-egg' ? 4.8 : 6.5;
      currentCameraPose = dampCameraPose(currentCameraPose, targetPose, dampLambda, cameraDt);
      if (
        isDescendingFromTitleRef.current &&
        Math.abs(currentCameraPose.target[1] - targetPose.target[1]) < 0.05 &&
        Math.abs(currentCameraPose.pos[1] - targetPose.pos[1]) < 0.04
      ) {
        isDescendingFromTitleRef.current = false;
      }
      applyCameraPoseToThree(currentCameraPose, a);
      camera.updateMatrixWorld();

      const foregroundActive = shouldRenderVillageForeground(mode, sceneReadyReported);
      warmLanternKey.visible = foregroundActive;
      warmLanternKey.castShadow = computeShadowPassActive(isSoftwareGl, foregroundActive);

      if (!foregroundActive) {
        actors.root.visible = false;
        kitten.root.visible = false;
        musicParticles.root.visible = false;
        boyShadow.visible = false;
        catShadow.visible = false;
        fisherShadow.visible = false;
        killerShadow.visible = false;
        village.update(dt, elapsed, null, false);
        renderer.render(scene, camera);
        scheduleNextFrame();
        return;
      }

      _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      _frustum.setFromProjectionMatrix(_projScreenMatrix);

      actors.root.visible = true;
      actors.update(
        dt,
        elapsed,
        snap.characterState,
        snap.currentNote,
        snap.notePulseCounter,
        isCustomizing,
        isEasterEgg,
        _frustum,
      );

      if (
        !isEasterEgg &&
        (snap.characterState === 'playing' || snap.notePulseCounter !== lastSpawnPulseCounter)
      ) {
        lastSpawnPulseCounter = snap.notePulseCounter;
        actors.getOcarinaWorldPosition(ocarinaSpawnOrigin);
      }
      musicParticles.update(
        dt,
        isEasterEgg ? 'idle' : snap.characterState,
        snap.currentNote,
        snap.notePulseCounter,
        ocarinaSpawnOrigin,
      );

      const kittenVisible = isSphereInFrustum(_frustum, 3.38, 1.45, 6.82, 0.85, _frustumSphere);
      kitten.root.visible = kittenVisible;
      if (kittenVisible) {
        kitten.update(
          dt,
          elapsed,
          snap.characterState === 'playing' && !isCustomizing && !isEasterEgg,
        );
      }

      boyShadow.visible = actors.isRoleVisible('ocarina');
      catShadow.visible = kittenVisible;
      fisherShadow.visible = actors.isRoleVisible('fisher');
      killerShadow.visible = actors.isRoleVisible('killer');

      village.update(dt, elapsed, _frustum, true);

      if (mode === 'view-characters') {
        const fisherBtn = fisherBtnRef.current?.current;
        const killerBtn = killerBtnRef.current?.current;
        if (fisherBtn || killerBtn) {
          actors.getRearSlotHeadPositions(fisherHeadWorld, killerHeadWorld);

          const padX = w < 640 ? 74 : 96;
          const topPadY = w < 640 ? 116 : 96;
          const botPadY = 24;

          projVec.copy(fisherHeadWorld).project(camera);
          const fVisible = projVec.z < 1 && projVec.z > -1;
          let fx = (projVec.x * 0.5 + 0.5) * w;
          const fy = THREE.MathUtils.clamp((-projVec.y * 0.5 + 0.5) * h, topPadY, h - botPadY);

          projVec.copy(killerHeadWorld).project(camera);
          const kVisible = projVec.z < 1 && projVec.z > -1;
          let kx = (projVec.x * 0.5 + 0.5) * w;
          const ky = THREE.MathUtils.clamp((-projVec.y * 0.5 + 0.5) * h, topPadY, h - botPadY);

          fx = THREE.MathUtils.clamp(fx, padX, w - padX);
          kx = THREE.MathUtils.clamp(kx, padX, w - padX);

          // Mantém um espaçamento horizontal limpo para nenhuma placa sobrepor a outra em telas estreitas
          const minSepX = w < 640 ? 132 : 168;
          if (fVisible && kVisible && Math.abs(kx - fx) < minSepX) {
            const mid = (fx + kx) * 0.5;
            const sign = fx <= kx ? -1 : 1;
            fx = THREE.MathUtils.clamp(mid + sign * (minSepX * 0.5), padX, w - padX);
            kx = THREE.MathUtils.clamp(mid - sign * (minSepX * 0.5), padX, w - padX);
          }

          if (fisherBtn) {
            fisherBtn.style.transform = `translate3d(${fx.toFixed(1)}px, ${fy.toFixed(1)}px, 0) translate(-50%, -100%)`;
            fisherBtn.style.opacity = fVisible ? '1' : '0';
          }
          if (killerBtn) {
            killerBtn.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0) translate(-50%, -100%)`;
            killerBtn.style.opacity = kVisible ? '1' : '0';
          }
        }
      }

      renderer.render(scene, camera);
      scheduleNextFrame();
    }

    const handleVisibilityChange = () => {
      if (disposed) return;
      if (document.hidden) {
        pausedByVisibility = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
      } else {
        pausedByVisibility = false;
        lastTime = performance.now();
        tick();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (!pausedByVisibility) {
      tick();
    }

    return () => {
      disposed = true;
      window.clearTimeout(warmupTimeoutId);
      window.clearTimeout(safetyTimeoutId);
      THREE.DefaultLoadingManager.onStart = prevOnStart;
      THREE.DefaultLoadingManager.onProgress = prevOnProgress;
      THREE.DefaultLoadingManager.onLoad = prevOnLoad;
      THREE.DefaultLoadingManager.onError = prevOnError;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      actors.dispose();
      actorsRef.current = null;
      musicParticles.dispose();
      kitten.dispose();
      village.dispose();
      textures.dispose();
      shadowDiscGeo.dispose();
      shadowDiscMat.dispose();
      envTarget.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    crtEnabledRef.current = crtEnabled;
    const renderer = rendererRef.current;
    const container = mountRef.current;
    if (!renderer || !container) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setPixelRatio(
      computeScenePixelRatio(isSoftwareGlRef.current, window.devicePixelRatio || 1, crtEnabled),
    );
    renderer.setSize(w, h);
    if (sceneRef.current && cameraRef.current) {
      renderer.render(sceneRef.current, cameraRef.current);
    }
  }, [crtEnabled]);

  return (
    <div
      ref={mountRef}
      data-testid="ocarina-3d-canvas"
      className="absolute inset-0 w-full h-full overflow-hidden"
    />
  );
}

