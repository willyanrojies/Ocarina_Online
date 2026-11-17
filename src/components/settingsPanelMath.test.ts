import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VOLUME_SEGMENT_COUNT,
  clampVolume,
  getFilledSegmentCount,
  getThumbPercent,
  stepVolume,
} from './settingsPanelMath';

test('clamps volume cleanly between 0 and 1', () => {
  assert.equal(clampVolume(-0.4), 0);
  assert.equal(clampVolume(1.6), 1);
  assert.equal(clampVolume(0.7), 0.7);
});

test('computes filled N64 bar segments and handles mute state', () => {
  assert.equal(VOLUME_SEGMENT_COUNT, 10);
  assert.equal(getFilledSegmentCount(0.7, false), 7);
  assert.equal(getFilledSegmentCount(0.6, false), 6);
  assert.equal(getFilledSegmentCount(1, false), 10);
  assert.equal(getFilledSegmentCount(0.7, true), 0);
});

test('steps volume safely and calculates thumb percentage', () => {
  assert.equal(stepVolume(0.7, 0.1), 0.8);
  assert.equal(stepVolume(0.95, 0.2), 1);
  assert.equal(stepVolume(0.05, -0.2), 0);
  assert.equal(getThumbPercent(0.6, false), 60);
  assert.equal(getThumbPercent(0.6, true), 0);
});
