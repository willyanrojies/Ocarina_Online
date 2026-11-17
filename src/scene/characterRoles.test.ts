import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_METADATA,
  INITIAL_CHARACTER_SLOTS,
  swapOcarinaCharacterWithSlot,
} from './characterRoles';

test('INITIAL_CHARACTER_SLOTS assigns gohan to ocarina, pablo to fisher, and killer to killer', () => {
  assert.deepEqual(INITIAL_CHARACTER_SLOTS, {
    ocarina: 'gohan',
    fisher: 'pablo',
    killer: 'killer',
  });
  assert.equal(CHARACTER_METADATA.gohan.name, 'Gohan');
  assert.equal(CHARACTER_METADATA.pablo.name, 'Pablo');
  assert.equal(CHARACTER_METADATA.killer.name, 'Killer');
});

test('swapOcarinaCharacterWithSlot swaps ocarina character with fisher slot', () => {
  const next = swapOcarinaCharacterWithSlot(INITIAL_CHARACTER_SLOTS, 'fisher');
  assert.deepEqual(next, {
    ocarina: 'pablo',
    fisher: 'gohan',
    killer: 'killer',
  });
  // O objeto original permanece imutável
  assert.equal(INITIAL_CHARACTER_SLOTS.ocarina, 'gohan');
});

test('swapOcarinaCharacterWithSlot swaps again with killer slot preserving all 3 unique characters', () => {
  const afterFisher = swapOcarinaCharacterWithSlot(INITIAL_CHARACTER_SLOTS, 'fisher');
  const afterKiller = swapOcarinaCharacterWithSlot(afterFisher, 'killer');
  assert.deepEqual(afterKiller, {
    ocarina: 'killer',
    fisher: 'gohan',
    killer: 'pablo',
  });
});
