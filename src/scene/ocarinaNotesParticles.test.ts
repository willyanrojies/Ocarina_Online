import test from 'node:test';
import assert from 'node:assert/strict';
import { NOTE_BY_ID } from '../audio/ocarinaNotes';
import {
  N64_MUSIC_COLORS,
  computeLeftMusicNoteKinematics,
  computeMusicParticleFrame,
  evaluateMusicEmission,
  pickMusicIconVariant,
} from './ocarinaNotesParticles';

test('picks colorful N64 note variants across different notes and pulses', () => {
  const c5 = NOTE_BY_ID.C5;
  const g6 = NOTE_BY_ID.G6;
  const v1 = pickMusicIconVariant(c5, 1, 0);
  const v2 = pickMusicIconVariant(g6, 2, 0);
  const v3 = pickMusicIconVariant(c5, 1, 1);

  assert.ok(N64_MUSIC_COLORS.some((c) => c.hex === v1.colorHex));
  assert.ok(N64_MUSIC_COLORS.some((c) => c.hex === v2.colorHex));
  assert.notEqual(v1.colorHex, v3.colorHex);
});

test('emits burst on note pulse, streams gently while held, and stays silent when idle', () => {
  const pulse = evaluateMusicEmission('playing', 1, 0, 0, 0.016);
  assert.equal(pulse.burstCount, 2);

  const midHold = evaluateMusicEmission('playing', 1, 1, 0.10, 0.05);
  assert.equal(midHold.burstCount, 0);

  const stream = evaluateMusicEmission('playing', 1, 1, 0.24, 0.05);
  assert.equal(stream.burstCount, 1);

  const idle = evaluateMusicEmission('idle', 1, 1, 0.20, 0.20);
  assert.equal(idle.burstCount, 0);
});

test('computes smooth pop-in, bright sustain, and fade-out opacity and scale', () => {
  const start = computeMusicParticleFrame(0.03, 1.2, 0.11, 0, 0.04);
  const mid = computeMusicParticleFrame(0.45, 1.2, 0.11, 0, 0.04);
  const end = computeMusicParticleFrame(1.18, 1.2, 0.11, 0, 0.04);

  assert.ok(start.opacity > 0 && start.opacity < 1);
  assert.equal(mid.opacity, 1);
  assert.ok(end.opacity < 0.15);
  assert.ok(mid.scale >= 0.10);
});

test('spawns all musical note icons strictly to the left (-X) side of the ocarina', () => {
  for (let counter = 1; counter <= 25; counter++) {
    const primary = computeLeftMusicNoteKinematics(counter, 0);
    const secondary = computeLeftMusicNoteKinematics(counter, 1);

    assert.ok(primary.offsetX < 0, `counter ${counter} sub 0 offsetX should be < 0`);
    assert.ok(secondary.offsetX < 0, `counter ${counter} sub 1 offsetX should be < 0`);
    assert.ok(primary.vx <= -0.35, `counter ${counter} sub 0 vx should drift left`);
    assert.ok(secondary.vx <= -0.50, `counter ${counter} sub 1 vx should drift further left`);
    assert.ok(primary.vy > 0 && secondary.vy > 0);
    assert.notEqual(primary.vx, secondary.vx);
  }
});
