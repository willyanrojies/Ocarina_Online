import test from 'node:test';
import assert from 'node:assert/strict';
import { getGridNotes, NOTE_BY_ID, OCARINA_NOTES, resolveNoteFromKey } from './ocarinaNotes';

test('contains exact 15 notes in the 5x3 grid order', () => {
  assert.equal(OCARINA_NOTES.length, 15);
  const grid = getGridNotes();
  assert.equal(grid.length, 3);
  assert.deepEqual(
    grid[0].map((n) => n.id),
    ['D6', 'E6', 'F6', 'G6', 'A6'],
  );
  assert.deepEqual(
    grid[1].map((n) => n.id),
    ['F5', 'G5', 'A5', 'B5', 'C6'],
  );
  assert.deepEqual(
    grid[2].map((n) => n.id),
    ['A4', 'B4', 'C5', 'D5', 'E5'],
  );
});

test('computes accurate equal-temperament frequencies', () => {
  assert.equal(NOTE_BY_ID.A4.frequency, 440);
  assert.equal(NOTE_BY_ID.A5.frequency, 880);
  assert.equal(NOTE_BY_ID.A6.frequency, 1760);
  assert.ok(Math.abs(NOTE_BY_ID.C5.frequency - 523.25) < 0.05);
  assert.ok(Math.abs(NOTE_BY_ID.D6.frequency - 1174.66) < 0.05);
});

test('maps keyboard keys case-insensitively to expected notes', () => {
  assert.equal(resolveNoteFromKey('q'), 'D6');
  assert.equal(resolveNoteFromKey('Q'), 'D6');
  assert.equal(resolveNoteFromKey('1'), 'D6');
  assert.equal(resolveNoteFromKey('a'), 'F5');
  assert.equal(resolveNoteFromKey('z'), 'A4');
  assert.equal(resolveNoteFromKey('b'), 'E5');
  assert.equal(resolveNoteFromKey('Escape'), null);
});
