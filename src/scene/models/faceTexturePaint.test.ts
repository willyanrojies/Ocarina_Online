import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  attachFlushPlayingFaceMorphTarget,
  evaluateFacePaintAt3D,
  FACE_PAINT_SPECS,
} from './faceTexturePaint';

test('Pablo playing face paints closed eye dash and skin lid without touching eyebrow', () => {
  const spec = FACE_PAINT_SPECS.pablo!;
  assert.ok(spec);

  const dashSample = evaluateFacePaintAt3D(-0.128, 0.466, 0.275, spec);
  assert.ok(dashSample);
  assert.ok(dashSample.alpha > 0.99);
  assert.ok(dashSample.r < 20 && dashSample.g < 20 && dashSample.b < 20);

  // Borda superior da pálpebra (0.522) é coberta suavemente mantendo a sobrancelha (0.554) intacta
  const lidSample = evaluateFacePaintAt3D(-0.128, 0.522, 0.275, spec);
  assert.ok(lidSample);
  assert.ok(lidSample.alpha > 0.99);
  assert.equal(Math.round(lidSample.r), 216);
  assert.equal(Math.round(lidSample.g), 125);
  assert.equal(Math.round(lidSample.b), 55);

  const browSample = evaluateFacePaintAt3D(-0.128, 0.554, 0.285, spec);
  assert.equal(browSample, null);
});

test('Pablo playing face paints skin over closed mouth corners and black O circle at center', () => {
  const spec = FACE_PAINT_SPECS.pablo!;

  const mouthCenter = evaluateFacePaintAt3D(0.0, 0.341, 0.26, spec);
  assert.ok(mouthCenter);
  assert.ok(mouthCenter.alpha > 0.99);
  assert.ok(mouthCenter.r < 20 && mouthCenter.g < 20 && mouthCenter.b < 20);

  const mouthCorner = evaluateFacePaintAt3D(0.052, 0.341, 0.26, spec);
  assert.ok(mouthCorner);
  assert.ok(mouthCorner.alpha > 0.95);
  assert.equal(Math.round(mouthCorner.r), 217);
  assert.equal(Math.round(mouthCorner.g), 124);
  assert.equal(Math.round(mouthCorner.b), 54);
});

test('Killer playing face closes eyes and draws black O mouth while preserving eyebrows, mustache, and goatee', () => {
  const spec = FACE_PAINT_SPECS.killer!;
  assert.ok(spec);

  const dashSample = evaluateFacePaintAt3D(0.125, 0.454, 0.275, spec);
  assert.ok(dashSample);
  assert.ok(dashSample.alpha > 0.99);
  assert.ok(dashSample.r < 20);

  // Borda superior da pálpebra (0.506) é coberta suavemente mantendo a sobrancelha (0.535) intacta
  const upperEyeSample = evaluateFacePaintAt3D(0.125, 0.506, 0.295, spec);
  assert.ok(upperEyeSample);
  assert.ok(upperEyeSample.alpha > 0.99);
  assert.equal(Math.round(upperEyeSample.r), 254);

  const browSample = evaluateFacePaintAt3D(0.125, 0.535, 0.293, spec);
  assert.equal(browSample, null);

  const mouthCenter = evaluateFacePaintAt3D(0.0, 0.319, 0.265, spec);
  assert.ok(mouthCenter);
  assert.ok(mouthCenter.alpha > 0.99);
  assert.ok(mouthCenter.r < 20);

  const mustacheSample = evaluateFacePaintAt3D(0.05, 0.348, 0.265, spec);
  assert.equal(mustacheSample, null);

  const goateeSample = evaluateFacePaintAt3D(0.0, 0.275, 0.265, spec);
  assert.equal(goateeSample, null);
});

test('attachFlushPlayingFaceMorphTarget pulls recessed eye cavity forward and aligns normals', () => {
  const spec = FACE_PAINT_SPECS.pablo!;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -0.070, 0.455, 0.268, // vértice de perímetro na bochecha
    -0.128, 0.455, 0.246, // vértice recuado da órbita ocular
    0.0, 0.341, 0.252, // centro da boca
    0.0, 0.365, 0.258, // lábio superior do perímetro
  ]);
  const normals = new Float32Array([
    0, 0, 1,
    0, -0.8, 0.6,
    0, -0.5, 0.866,
    0, 0, 1,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  attachFlushPlayingFaceMorphTarget(geo, spec);

  assert.equal(geo.morphTargetsRelative, true);
  const morphPos = geo.morphAttributes.position?.[0];
  const morphNorm = geo.morphAttributes.normal?.[0];
  assert.ok(morphPos && morphNorm);

  // O vértice de perímetro permanece inalterado
  assert.equal(morphPos.getZ(0), 0);
  // O vértice recuado da órbita avança em direção a ~0.268
  assert.ok(morphPos.getZ(1) > 0.015);
  // A normal também inclina para frente em direção a z ~ +0.986
  assert.ok(morphNorm.getZ(1) > 0.25);
});
