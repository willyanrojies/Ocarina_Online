import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRT_FILTER_DEFAULT_ENABLED,
  N64_CRT_PIXEL_RATIO,
  computeScenePixelRatio,
} from './crtFilter';

test('CRT filter is enabled by default for classic N64 TV look', () => {
  assert.equal(CRT_FILTER_DEFAULT_ENABLED, true);
});

test('uses N64 low-res pixel ratio when CRT filter is enabled', () => {
  assert.equal(computeScenePixelRatio(false, 2, true), N64_CRT_PIXEL_RATIO);
  assert.equal(computeScenePixelRatio(true, 1, true), N64_CRT_PIXEL_RATIO);
});

test('restores native/capped pixel ratio when CRT filter is disabled', () => {
  assert.equal(computeScenePixelRatio(true, 2, false), 1);
  assert.equal(computeScenePixelRatio(false, 1.5, false), 1.5);
  assert.equal(computeScenePixelRatio(false, 3, false), 2);
  assert.equal(computeScenePixelRatio(false, 0, false), 1);
});
