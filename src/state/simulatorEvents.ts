import { NOTE_BY_ID, type NoteId, type OcarinaNoteSpec } from '../audio/ocarinaNotes';

export type CharacterAnimState = 'idle' | 'playing';

export interface SimulatorSnapshot {
  activeNotes: NoteId[];
  currentNote: OcarinaNoteSpec | null;
  characterState: CharacterAnimState;
  notePulseCounter: number;
  lastNoteTimestamp: number;
}

export type SimulatorListener = (snapshot: SimulatorSnapshot) => void;

/**
 * Controlador desacoplado que conecta o painel musical/teclado ao sistema de animação 3D.
 */
export class SimulatorController {
  private activeSet: NoteId[] = [];
  private currentNote: OcarinaNoteSpec | null = null;
  private notePulseCounter = 0;
  private lastNoteTimestamp = 0;
  private listeners = new Set<SimulatorListener>();

  getSnapshot(): SimulatorSnapshot {
    return {
      activeNotes: [...this.activeSet],
      currentNote: this.currentNote,
      characterState: this.activeSet.length > 0 ? 'playing' : 'idle',
      notePulseCounter: this.notePulseCounter,
      lastNoteTimestamp: this.lastNoteTimestamp,
    };
  }

  subscribe(listener: SimulatorListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  pressNote(noteId: NoteId, timestamp = Date.now()): boolean {
    if (this.activeSet.includes(noteId)) {
      return false;
    }
    this.activeSet.push(noteId);
    this.currentNote = NOTE_BY_ID[noteId];
    this.notePulseCounter += 1;
    this.lastNoteTimestamp = timestamp;
    this.emit();
    return true;
  }

  releaseNote(noteId: NoteId): boolean {
    const idx = this.activeSet.indexOf(noteId);
    if (idx === -1) {
      return false;
    }
    this.activeSet.splice(idx, 1);
    if (this.activeSet.length > 0) {
      const topId = this.activeSet[this.activeSet.length - 1];
      this.currentNote = NOTE_BY_ID[topId];
    } else {
      this.currentNote = null;
    }
    this.emit();
    return true;
  }

  releaseAll(): void {
    if (this.activeSet.length === 0 && this.currentNote === null) {
      return;
    }
    this.activeSet = [];
    this.currentNote = null;
    this.emit();
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }
}
