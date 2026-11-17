import type { NoteId } from '../audio/ocarinaNotes';

/**
 * Sequência exata de notas: 1x Q (D6), 2x W (E6), 3x E (F6), 4x R (G6), 5x T (A6).
 */
export const PABLO_EASTER_EGG_SEQUENCE: readonly NoteId[] = [
  'D6',
  'E6', 'E6',
  'F6', 'F6', 'F6',
  'G6', 'G6', 'G6', 'G6',
  'A6', 'A6', 'A6', 'A6', 'A6',
] as const;

export const PABLO_EASTER_EGG_DURATION_MS = 30_000;
export const PABLO_EASTER_EGG_TEXT = 'Ela nunca me amou';
export const PABLO_EASTER_EGG_TYPE_INTERVAL_MS = 85;

export const PABLO_EASTER_EGG_DIALOG_ASSET_PATH =
  '/assets/aistudio/Caixa_de_Di_logo_Fantasia_Floral_2c5a3b31.png';
export const PABLO_EASTER_EGG_MUSIC_PATH =
  '/assets/aistudio/Where_the_Kingdom_Sleeps_ea2b23eb.mp3';

export interface EasterEggSequenceAdvanceResult {
  nextHistory: NoteId[];
  triggered: boolean;
}

/**
 * Adiciona uma nota tocada ao buffer rolante da sequência (limitado ao tamanho da sequência)
 * e retorna true quando as últimas notas correspondem a PABLO_EASTER_EGG_SEQUENCE.
 * Reinicia o histórico ao disparar para exigir a sequência completa novamente da próxima vez.
 */
export function advanceEasterEggSequence(
  history: readonly NoteId[],
  noteId: NoteId,
): EasterEggSequenceAdvanceResult {
  const maxLen = PABLO_EASTER_EGG_SEQUENCE.length;
  const combined = [...history, noteId];
  const trimmed = combined.length > maxLen ? combined.slice(combined.length - maxLen) : combined;

  if (trimmed.length === maxLen) {
    let matches = true;
    for (let i = 0; i < maxLen; i++) {
      if (trimmed[i] !== PABLO_EASTER_EGG_SEQUENCE[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return { nextHistory: [], triggered: true };
    }
  }

  return { nextHistory: trimmed, triggered: false };
}
