import { useRef } from 'react';
import { getGridNotes, type NoteId } from '../audio/ocarinaNotes';
import { PanelCornerOrnaments } from './BotanicalOrnaments';

interface OcarinaPanelProps {
  activeNotes: NoteId[];
  showKeyHints?: boolean;
  hidden?: boolean;
  onNotePress: (noteId: NoteId) => void;
  onNoteRelease: (noteId: NoteId) => void;
}

const NOTE_ROWS = getGridNotes();

export function OcarinaPanel({
  activeNotes,
  showKeyHints = true,
  hidden = false,
  onNotePress,
  onNoteRelease,
}: OcarinaPanelProps) {
  const activePointerNotes = useRef<Map<number, NoteId>>(new Map());

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, noteId: NoteId) => {
    if (hidden) return;
    e.preventDefault();
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignora caso captura de ponteiro não seja suportada em eventos sintéticos de teste
      }
    }
    const prev = activePointerNotes.current.get(e.pointerId);
    if (prev && prev !== noteId) {
      onNoteRelease(prev);
    }
    activePointerNotes.current.set(e.pointerId, noteId);
    onNotePress(noteId);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLButtonElement>, noteId: NoteId) => {
    const held = activePointerNotes.current.get(e.pointerId);
    if (held) {
      onNoteRelease(held);
      activePointerNotes.current.delete(e.pointerId);
    } else {
      onNoteRelease(noteId);
    }
  };

  return (
    <section
      aria-label="Painel musical da ocarina"
      aria-hidden={hidden}
      data-testid="ocarina-panel"
      data-hidden={hidden ? 'true' : 'false'}
      className={`fixed z-20 left-3 right-3 bottom-3 mx-auto max-w-[440px] sm:mx-0 sm:right-auto sm:left-5 sm:bottom-5 sm:w-[440px] md:w-[495px] lg:left-4 lg:bottom-4 lg:max-w-none lg:w-[clamp(560px,40vw,780px)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        hidden
          ? 'opacity-0 translate-y-12 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100'
      }`}
    >
      <div className="relative ocarina-gold-frame p-[10px] sm:p-[13px] rounded-[6px]">
        <PanelCornerOrnaments />

        {/* Borda interna escura chanfrada */}
        <div className="relative z-10 p-[3px] bg-[#010724] rounded-[3px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.95)]">
          <div
            role="group"
            aria-label="Notas musicais da ocarina"
            className="ocarina-navy-surface grid grid-cols-5 gap-[4px] sm:gap-[5px] p-[4px] sm:p-[5px] rounded-[2px]"
          >
            {NOTE_ROWS.flat().map((note) => {
              const isActive = activeNotes.includes(note.id);
              return (
                <button
                  key={note.id}
                  type="button"
                  data-testid={`note-btn-${note.id}`}
                  data-active={isActive ? 'true' : 'false'}
                  aria-pressed={isActive}
                  aria-label={`Nota ${note.label} (Tecla ${note.keyLabel})`}
                  onPointerDown={(e) => handlePointerDown(e, note.id)}
                  onPointerUp={(e) => handlePointerUpOrCancel(e, note.id)}
                  onPointerCancel={(e) => handlePointerUpOrCancel(e, note.id)}
                  onLostPointerCapture={(e) => handlePointerUpOrCancel(e, note.id)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                      e.preventDefault();
                      onNotePress(note.id);
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNoteRelease(note.id);
                    }
                  }}
                  className="ocarina-cell-btn relative flex items-center justify-center h-[48px] sm:h-[58px] md:h-[64px] lg:h-[clamp(86px,13vh,142px)] rounded-[2px] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#ffd24c]"
                >
                  <span className="font-ocarina ocarina-note-label text-[20px] sm:text-[26px] md:text-[28px] lg:text-[clamp(28px,2.2vw,40px)] font-bold leading-none tracking-wide pointer-events-none">
                    {note.label}
                  </span>

                  {showKeyHints && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 right-1.5 text-[10px] font-bold text-[#9bc0ff]/80 leading-none pointer-events-none"
                    >
                      {note.keyLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
