import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  computeShadowPassActive,
  isSphereInFrustum,
  resolveScenarioProcessingSize,
  shouldRenderVillageForeground,
} from './renderOptimization';

test('shouldRenderVillageForeground keeps scene active during warmup, culls on ready title-sky, and restores immediately on descent', () => {
  assert.equal(shouldRenderVillageForeground('title-sky', false), true);
  assert.equal(shouldRenderVillageForeground('title-sky', true), false);
  assert.equal(shouldRenderVillageForeground('default', true), true);
  assert.equal(shouldRenderVillageForeground('customize-ocarina', true), true);
  assert.equal(shouldRenderVillageForeground('view-characters', true), true);
  assert.equal(shouldRenderVillageForeground('pablo-easter-egg', true), true);
});

test('computeShadowPassActive disables offscreen/software shadow passes without altering GPU gameplay shadows', () => {
  assert.equal(computeShadowPassActive(false, true), true);
  assert.equal(computeShadowPassActive(false, false), false);
  assert.equal(computeShadowPassActive(true, true), false);
  assert.equal(computeShadowPassActive(true, false), false);
});

test('resolveScenarioProcessingSize avoids pointless upscaling while preserving native detail up to 1024px', () => {
  assert.equal(resolveScenarioProcessingSize(512, 512), 512);
  assert.equal(resolveScenarioProcessingSize(1024, 1024), 1024);
  assert.equal(resolveScenarioProcessingSize(2048, 2048), 1024);
  assert.equal(resolveScenarioProcessingSize(128, 128), 256);
});

test('isSphereInFrustum accurately detects visible vs off-screen spheres with zero allocations', () => {
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
  camera.position.set(0, 2, 10);
  camera.lookAt(0, 2, 0);
  camera.updateMatrixWorld(true);

  const projScreen = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  const frustum = new THREE.Frustum().setFromProjectionMatrix(projScreen);
  const scratch = new THREE.Sphere();

  assert.equal(isSphereInFrustum(frustum, 0, 2, 0, 1.0, scratch), true);
  assert.equal(isSphereInFrustum(frustum, 40, 2, 0, 1.0, scratch), false);
  assert.equal(isSphereInFrustum(frustum, 0, 2, 30, 1.0, scratch), false);
});
