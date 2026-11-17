import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulatorController } from './simulatorEvents';

test('starts in idle state with no active notes', () => {
  const controller = new SimulatorController();
  const snap = controller.getSnapshot();
  assert.equal(snap.characterState, 'idle');
  assert.deepEqual(snap.activeNotes, []);
  assert.equal(snap.currentNote, null);
});

test('transitions to playing on note press and returns to idle when all notes release', () => {
  const controller = new SimulatorController();
  assert.equal(controller.pressNote('C5', 1000), true);

  let snap = controller.getSnapshot();
  assert.equal(snap.characterState, 'playing');
  assert.deepEqual(snap.activeNotes, ['C5']);
  assert.equal(snap.currentNote?.id, 'C5');
  assert.equal(snap.notePulseCounter, 1);

  // Ignora pressionar novamente uma nota que já está segurada
  assert.equal(controller.pressNote('C5', 1100), false);

  // Sequência de notas sobrepostas atualiza currentNote mantendo o estado 'playing'
  assert.equal(controller.pressNote('E5', 1200), true);
  snap = controller.getSnapshot();
  assert.equal(snap.characterState, 'playing');
  assert.equal(snap.currentNote?.id, 'E5');
  assert.equal(snap.notePulseCounter, 2);

  // Soltar E5 retorna para C5 enquanto ainda estiver tocando
  assert.equal(controller.releaseNote('E5'), true);
  snap = controller.getSnapshot();
  assert.equal(snap.characterState, 'playing');
  assert.equal(snap.currentNote?.id, 'C5');

  // Soltar C5 retorna suavemente ao estado 'idle'
  assert.equal(controller.releaseNote('C5'), true);
  snap = controller.getSnapshot();
  assert.equal(snap.characterState, 'idle');
  assert.deepEqual(snap.activeNotes, []);
  assert.equal(snap.currentNote, null);
});
