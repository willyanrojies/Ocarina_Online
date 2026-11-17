import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_OCARINA_CUSTOMIZATION,
  DEFAULT_STICKER_ROTATION_DEG,
  DEFAULT_STICKER_SCALE,
  OCARINA_COLOR_OPTIONS,
  OCARINA_STICKER_OPTIONS,
  OCARINA_STICKER_POSITIONS,
  getStickerPositionOption,
  sanitizeOcarinaCustomization,
} from './ocarinaCustomization';

test('default ocarina customization starts royal blue, no sticker, large scale, and 0 rotation', () => {
  assert.equal(DEFAULT_OCARINA_CUSTOMIZATION.colorHex, '#1e30ee');
  assert.equal(DEFAULT_OCARINA_CUSTOMIZATION.stickerId, 'none');
  assert.equal(DEFAULT_OCARINA_CUSTOMIZATION.stickerPosition, 'center-belly');
  assert.equal(DEFAULT_OCARINA_CUSTOMIZATION.stickerScale, DEFAULT_STICKER_SCALE);
  assert.ok(DEFAULT_OCARINA_CUSTOMIZATION.stickerScale >= 1.3);
  assert.equal(DEFAULT_OCARINA_CUSTOMIZATION.stickerRotationDeg, 0);
});

test('color, sticker, and position presets expose rich valid options', () => {
  assert.ok(OCARINA_COLOR_OPTIONS.length >= 9);
  assert.ok(OCARINA_STICKER_OPTIONS.length >= 12);
  assert.equal(OCARINA_STICKER_POSITIONS.length, 4);
  for (const pos of OCARINA_STICKER_POSITIONS) {
    assert.equal(getStickerPositionOption(pos.id).id, pos.id);
  }
});

test('sanitizeOcarinaCustomization enforces fixed large sticker scale and 0 rotation', () => {
  const sanitized = sanitizeOcarinaCustomization({
    colorHex: 'not-a-color',
    stickerId: 'unknown-id' as never,
    stickerPosition: 'invalid-pos' as never,
    stickerScale: 0.5,
    stickerRotationDeg: 45,
  });
  assert.equal(sanitized.colorHex, DEFAULT_OCARINA_CUSTOMIZATION.colorHex);
  assert.equal(sanitized.stickerId, 'none');
  assert.equal(sanitized.stickerPosition, 'center-belly');
  assert.equal(sanitized.stickerScale, DEFAULT_STICKER_SCALE);
  assert.equal(sanitized.stickerRotationDeg, DEFAULT_STICKER_ROTATION_DEG);
});
