import test from 'node:test';
import assert from 'node:assert/strict';
import type { NoteId } from '../audio/ocarinaNotes';
import {
  advanceEasterEggSequence,
  PABLO_EASTER_EGG_DURATION_MS,
  PABLO_EASTER_EGG_SEQUENCE,
  PABLO_EASTER_EGG_TEXT,
} from './pabloEasterEgg';

test('PABLO_EASTER_EGG_SEQUENCE matches 1x Q, 2x W, 3x E, 4x R, 5x T', () => {
  assert.deepEqual(PABLO_EASTER_EGG_SEQUENCE, [
    'D6',
    'E6', 'E6',
    'F6', 'F6', 'F6',
    'G6', 'G6', 'G6', 'G6',
    'A6', 'A6', 'A6', 'A6', 'A6',
  ]);
  assert.equal(PABLO_EASTER_EGG_DURATION_MS, 30_000);
  assert.equal(PABLO_EASTER_EGG_TEXT, 'Ela nunca me amou');
});

test('triggers only on the exact final T (5th A6) and resets history afterwards', () => {
  let history: NoteId[] = [];
  for (let i = 0; i < PABLO_EASTER_EGG_SEQUENCE.length - 1; i++) {
    const res = advanceEasterEggSequence(history, PABLO_EASTER_EGG_SEQUENCE[i]);
    assert.equal(res.triggered, false);
    history = res.nextHistory;
  }

  const finalRes = advanceEasterEggSequence(history, 'A6');
  assert.equal(finalRes.triggered, true);
  assert.deepEqual(finalRes.nextHistory, []);
});

test('does not trigger if sequence is broken and succeeds after earlier unrelated notes', () => {
  let history: NoteId[] = ['A4', 'C5', 'G5'];

  // Toca sequência quebrada (faltando um E6)
  for (const n of ['D6', 'E6', 'E6', 'F6', 'F6', 'G6'] as NoteId[]) {
    history = advanceEasterEggSequence(history, n).nextHistory;
  }
  assert.equal(advanceEasterEggSequence(history, 'A6').triggered, false);

  // Agora toca a sequência completa válida de 15 notas logo após ruído anterior
  let triggered = false;
  for (const n of PABLO_EASTER_EGG_SEQUENCE) {
    const res = advanceEasterEggSequence(history, n);
    history = res.nextHistory;
    if (res.triggered) triggered = true;
  }
  assert.equal(triggered, true);
});
