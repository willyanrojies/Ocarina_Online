import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKGROUND_CHARACTERS_CAMERA_POSE,
  FIXED_CAMERA_POSE,
  OCARINA_CUSTOMIZE_CAMERA_POSE,
  TITLE_SKY_CAMERA_POSE,
  dampCameraPose,
  getBackgroundCharactersCameraPose,
  getOcarinaCustomizeCameraPose,
  getPabloFocusCameraPose,
  getResponsiveCameraPose,
  getTitleSkyCameraPose,
} from './cameraPreset';

test('TITLE_SKY_CAMERA_POSE looks up into the starry sky above the village', () => {
  assert.ok(TITLE_SKY_CAMERA_POSE.pos[1] > FIXED_CAMERA_POSE.pos[1]);
  assert.ok(TITLE_SKY_CAMERA_POSE.target[1] > TITLE_SKY_CAMERA_POSE.pos[1] + 6);
  assert.deepEqual(getTitleSkyCameraPose(1440 / 900), TITLE_SKY_CAMERA_POSE);

  const mobileSky = getTitleSkyCameraPose(390 / 844);
  assert.ok(mobileSky.target[1] > mobileSky.pos[1] + 6);
  assert.ok(mobileSky.fov >= TITLE_SKY_CAMERA_POSE.fov);
});

test('FIXED_CAMERA_POSE matches exact user coordinates and 80deg FOV', () => {
  assert.deepEqual(FIXED_CAMERA_POSE.pos, [2.53, 1.42, 8.09]);
  assert.deepEqual(FIXED_CAMERA_POSE.target, [0.06, 1.94, -2.58]);
  assert.equal(FIXED_CAMERA_POSE.fov, 80);
});

test('getResponsiveCameraPose returns exact desktop pose and responsive portrait mobile framing', () => {
  const desktop = getResponsiveCameraPose(1440 / 900);
  assert.deepEqual(desktop, FIXED_CAMERA_POSE);

  const mobile = getResponsiveCameraPose(390 / 844);
  assert.equal(mobile.pos.length, 3);
  assert.equal(mobile.target.length, 3);
  assert.ok(mobile.fov >= 45 && mobile.fov <= 90);
});

test('getOcarinaCustomizeCameraPose zooms closer to the character hands with narrower FOV', () => {
  const desktopZoom = getOcarinaCustomizeCameraPose(1440 / 900);
  assert.deepEqual(desktopZoom, OCARINA_CUSTOMIZE_CAMERA_POSE);
  assert.ok(desktopZoom.fov < FIXED_CAMERA_POSE.fov);
  assert.ok(desktopZoom.pos[2] < FIXED_CAMERA_POSE.pos[2]);

  const mobileZoom = getOcarinaCustomizeCameraPose(390 / 844);
  assert.ok(mobileZoom.fov < 58);
  assert.ok(mobileZoom.target[1] < OCARINA_CUSTOMIZE_CAMERA_POSE.target[1]);
});

test('getBackgroundCharactersCameraPose frames background characters Pablo and Killer', () => {
  const desktopChars = getBackgroundCharactersCameraPose(1440 / 900);
  assert.deepEqual(desktopChars, BACKGROUND_CHARACTERS_CAMERA_POSE);
  assert.ok(desktopChars.pos[2] < FIXED_CAMERA_POSE.pos[2]);
  assert.ok(desktopChars.target[2] > 2.5 && desktopChars.target[2] < 4.5);

  const mobileChars = getBackgroundCharactersCameraPose(390 / 844);
  assert.ok(mobileChars.pos[2] >= desktopChars.pos[2]);
  assert.ok(mobileChars.fov >= desktopChars.fov);
});

test('dampCameraPose smoothly interpolates camera position, target, and fov toward target pose', () => {
  const step1 = dampCameraPose(FIXED_CAMERA_POSE, OCARINA_CUSTOMIZE_CAMERA_POSE, 6.0, 0.1);
  assert.ok(step1.fov < FIXED_CAMERA_POSE.fov && step1.fov > OCARINA_CUSTOMIZE_CAMERA_POSE.fov);
  assert.ok(step1.pos[1] > FIXED_CAMERA_POSE.pos[1] && step1.pos[1] < OCARINA_CUSTOMIZE_CAMERA_POSE.pos[1]);

  let current = FIXED_CAMERA_POSE;
  for (let i = 0; i < 60; i++) {
    current = dampCameraPose(current, OCARINA_CUSTOMIZE_CAMERA_POSE, 6.0, 0.05);
  }
  assert.ok(Math.abs(current.fov - OCARINA_CUSTOMIZE_CAMERA_POSE.fov) < 0.01);
  assert.ok(Math.abs(current.target[2] - OCARINA_CUSTOMIZE_CAMERA_POSE.target[2]) < 0.01);
});

test('getPabloFocusCameraPose frames Pablo up close and shifts target slightly below head for dialog box room', () => {
  const desktop = getPabloFocusCameraPose([1.36, 1.82, 3.16], -1.34, 1440 / 900);
  assert.ok(desktop.fov < 45);
  assert.ok(desktop.target[1] < 1.82);
  const dx = desktop.pos[0] - 1.36;
  const dz = desktop.pos[2] - 3.16;
  const dist = Math.hypot(dx, dz);
  assert.ok(dist > 1.0 && dist < 1.6);

  const mobile = getPabloFocusCameraPose([1.36, 1.82, 3.16], -1.34, 390 / 844);
  assert.ok(mobile.fov > desktop.fov);
  assert.ok(mobile.target[1] < desktop.target[1]);
});

