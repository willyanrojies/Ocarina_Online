export type NoteId =
  | 'D6' | 'E6' | 'F6' | 'G6' | 'A6'
  | 'F5' | 'G5' | 'A5' | 'B5' | 'C6'
  | 'A4' | 'B4' | 'C5' | 'D5' | 'E5';

export interface OcarinaNoteSpec {
  id: NoteId;
  label: NoteId;
  row: 0 | 1 | 2;
  col: 0 | 1 | 2 | 3 | 4;
  frequency: number;
  midi: number;
  keyLabel: string;
  keyAliases: string[];
  /** Máscara de bits ou padrão de levantamento dos dedos [E3, E2, E1, D1, D2, D3] (1 = aberto, 0 = fechado) */
  fingering: [number, number, number, number, number, number];
}

function midiToFreq(midi: number): number {
  return Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));
}

export const OCARINA_NOTES: readonly OcarinaNoteSpec[] = [
  // Linha 1: D6 | E6 | F6 | G6 | A6
  { id: 'D6', label: 'D6', row: 0, col: 0, midi: 86, frequency: midiToFreq(86), keyLabel: 'Q', keyAliases: ['q', '1'], fingering: [1, 0, 1, 0, 1, 1] },
  { id: 'E6', label: 'E6', row: 0, col: 1, midi: 88, frequency: midiToFreq(88), keyLabel: 'W', keyAliases: ['w', '2'], fingering: [1, 1, 0, 1, 1, 0] },
  { id: 'F6', label: 'F6', row: 0, col: 2, midi: 89, frequency: midiToFreq(89), keyLabel: 'E', keyAliases: ['e', '3'], fingering: [1, 1, 1, 0, 1, 1] },
  { id: 'G6', label: 'G6', row: 0, col: 3, midi: 91, frequency: midiToFreq(91), keyLabel: 'R', keyAliases: ['r', '4'], fingering: [1, 1, 1, 1, 0, 1] },
  { id: 'A6', label: 'A6', row: 0, col: 4, midi: 93, frequency: midiToFreq(93), keyLabel: 'T', keyAliases: ['t', '5'], fingering: [1, 1, 1, 1, 1, 1] },

  // Linha 2: F5 | G5 | A5 | B5 | C6
  { id: 'F5', label: 'F5', row: 1, col: 0, midi: 77, frequency: midiToFreq(77), keyLabel: 'A', keyAliases: ['a'], fingering: [0, 0, 1, 0, 1, 0] },
  { id: 'G5', label: 'G5', row: 1, col: 1, midi: 79, frequency: midiToFreq(79), keyLabel: 'S', keyAliases: ['s'], fingering: [0, 1, 0, 0, 1, 1] },
  { id: 'A5', label: 'A5', row: 1, col: 2, midi: 81, frequency: midiToFreq(81), keyLabel: 'D', keyAliases: ['d'], fingering: [0, 1, 1, 1, 0, 0] },
  { id: 'B5', label: 'B5', row: 1, col: 3, midi: 83, frequency: midiToFreq(83), keyLabel: 'F', keyAliases: ['f'], fingering: [1, 0, 1, 1, 0, 1] },
  { id: 'C6', label: 'C6', row: 1, col: 4, midi: 84, frequency: midiToFreq(84), keyLabel: 'G', keyAliases: ['g'], fingering: [1, 1, 0, 1, 0, 1] },

  // Linha 3: A4 | B4 | C5 | D5 | E5
  { id: 'A4', label: 'A4', row: 2, col: 0, midi: 69, frequency: midiToFreq(69), keyLabel: 'Z', keyAliases: ['z'], fingering: [0, 0, 0, 0, 0, 0] },
  { id: 'B4', label: 'B4', row: 2, col: 1, midi: 71, frequency: midiToFreq(71), keyLabel: 'X', keyAliases: ['x'], fingering: [0, 0, 0, 0, 0, 1] },
  { id: 'C5', label: 'C5', row: 2, col: 2, midi: 72, frequency: midiToFreq(72), keyLabel: 'C', keyAliases: ['c'], fingering: [0, 0, 0, 0, 1, 1] },
  { id: 'D5', label: 'D5', row: 2, col: 3, midi: 74, frequency: midiToFreq(74), keyLabel: 'V', keyAliases: ['v'], fingering: [0, 0, 0, 1, 1, 0] },
  { id: 'E5', label: 'E5', row: 2, col: 4, midi: 76, frequency: midiToFreq(76), keyLabel: 'B', keyAliases: ['b'], fingering: [0, 0, 1, 1, 0, 0] },
] as const;

export const NOTE_BY_ID: Record<NoteId, OcarinaNoteSpec> = OCARINA_NOTES.reduce(
  (acc, note) => {
    acc[note.id] = note;
    return acc;
  },
  {} as Record<NoteId, OcarinaNoteSpec>,
);

const KEY_TO_NOTE_MAP: Map<string, NoteId> = new Map();
for (const note of OCARINA_NOTES) {
  for (const alias of note.keyAliases) {
    KEY_TO_NOTE_MAP.set(alias.toLowerCase(), note.id);
  }
}

export function resolveNoteFromKey(key: string): NoteId | null {
  if (!key) return null;
  return KEY_TO_NOTE_MAP.get(key.toLowerCase()) ?? null;
}

export function getGridNotes(): OcarinaNoteSpec[][] {
  return [
    OCARINA_NOTES.filter((n) => n.row === 0),
    OCARINA_NOTES.filter((n) => n.row === 1),
    OCARINA_NOTES.filter((n) => n.row === 2),
  ];
}
