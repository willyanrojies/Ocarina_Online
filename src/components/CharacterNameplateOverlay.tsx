import type { RefObject } from 'react';
import {
  CHARACTER_METADATA,
  type CharacterSlotMap,
  type RearSlotId,
} from '../scene/characterRoles';
import { LeafSvg, PurpleFlowerSvg } from './BotanicalOrnaments';

interface CharacterNameplateOverlayProps {
  open: boolean;
  slots: CharacterSlotMap;
  fisherButtonRef: RefObject<HTMLButtonElement | null>;
  killerButtonRef: RefObject<HTMLButtonElement | null>;
  onSelectSlot: (slot: RearSlotId) => void;
}

const REAR_SLOTS: RearSlotId[] = ['fisher', 'killer'];

export function CharacterNameplateOverlay({
  open,
  slots,
  fisherButtonRef,
  killerButtonRef,
  onSelectSlot,
}: CharacterNameplateOverlayProps) {
  if (!open) return null;

  return (
    <div
      data-testid="character-nameplates-overlay"
      className="fixed inset-0 z-30 pointer-events-none select-none"
      aria-label="Selecionar personagem"
    >
      {REAR_SLOTS.map((slot) => {
        const charId = slots[slot];
        const meta = CHARACTER_METADATA[charId];
        const btnRef = slot === 'fisher' ? fisherButtonRef : killerButtonRef;

        return (
          <button
            key={slot}
            ref={btnRef}
            type="button"
            data-testid={`select-character-slot-${slot}`}
            data-character-id={charId}
            data-character-name={meta.name}
            aria-label={`Trocar para ${meta.name}`}
            onClick={() => onSelectSlot(slot)}
            style={{
              left: 0,
              top: 0,
              transform: 'translate3d(-9999px, -9999px, 0) translate(-50%, -100%)',
              opacity: 0,
            }}
            className="pointer-events-auto fixed group cursor-pointer focus:outline-none transition-[filter] duration-150 hover:brightness-110 active:brightness-95"
          >
            <div className="relative flex items-center justify-center min-w-[116px] sm:min-w-[144px] h-[44px] sm:h-[52px] px-5 sm:px-7 transition-transform duration-150 group-hover:scale-[1.07] group-active:scale-95">
              {/* Borda dourada octogonal texturizada estilo N64 e interior azul-marinho com pontilhado */}
              <svg
                viewBox="0 0 220 76"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full drop-shadow-[0_6px_12px_rgba(0,0,0,0.82)]"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id={`plaqueGoldRim-${slot}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffe16b" />
                    <stop offset="22%" stopColor="#e39214" />
                    <stop offset="72%" stopColor="#b86006" />
                    <stop offset="100%" stopColor="#703200" />
                  </linearGradient>
                  <linearGradient id={`plaqueGoldInner-${slot}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffca38" />
                    <stop offset="50%" stopColor="#c26b08" />
                    <stop offset="100%" stopColor="#ffdc6b" />
                  </linearGradient>
                  <pattern
                    id={`plaqueNavyDither-${slot}`}
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="8" height="8" fill="#031047" />
                    <rect x="0" y="0" width="4" height="4" fill="#061963" opacity="0.55" />
                    <rect x="4" y="4" width="4" height="4" fill="#020a2e" opacity="0.65" />
                  </pattern>
                </defs>

                {/* Contorno externo escuro e moldura dourada chanfrada */}
                <polygon
                  points="14,3 206,3 217,14 217,62 206,73 14,73 3,62 3,14"
                  fill={`url(#plaqueGoldRim-${slot})`}
                  stroke="#3b1800"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />

                {/* Filete especular superior */}
                <polyline
                  points="15,6 205,6 214,15"
                  fill="none"
                  stroke="#fff1a6"
                  strokeWidth="2"
                  opacity="0.85"
                />

                {/* Recorte interno octogonal em degraus */}
                <polygon
                  points="24,13 196,13 196,21 207,21 207,55 196,55 196,63 24,63 24,55 13,55 13,21 24,21"
                  fill={`url(#plaqueNavyDither-${slot})`}
                  stroke={`url(#plaqueGoldInner-${slot})`}
                  strokeWidth="3.2"
                  strokeLinejoin="miter"
                />

                {/* Sombra interna azul sutil da borda */}
                <polygon
                  points="26,15 194,15 194,23 205,23 205,53 194,53 194,61 26,61 26,53 15,53 15,23 26,23"
                  fill="none"
                  stroke="#020829"
                  strokeWidth="2"
                  opacity="0.85"
                />
              </svg>

              {/* Ornamentos botânicos nos cantos da placa */}
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {/* Folhas superior esquerdo */}
                <LeafSvg className="absolute -top-3.5 -left-3 w-7 h-7 sm:w-8 sm:h-8 -rotate-[74deg]" />
                <LeafSvg className="absolute -top-4 left-0.5 w-8 h-8 sm:w-9 sm:h-9 -rotate-[26deg]" />
                <LeafSvg className="absolute -top-3 left-3.5 w-6 h-6 sm:w-7 sm:h-7 rotate-[18deg]" />

                {/* Folhas superior direito */}
                <LeafSvg className="absolute -top-3 right-3.5 w-6 h-6 sm:w-7 sm:h-7 -rotate-[18deg]" flip />
                <LeafSvg className="absolute -top-4 right-0.5 w-8 h-8 sm:w-9 sm:h-9 rotate-[26deg]" flip />
                <LeafSvg className="absolute -top-3.5 -right-3 w-7 h-7 sm:w-8 sm:h-8 rotate-[74deg]" flip />

                {/* Flor roxa e folhas inferior esquerdo */}
                <LeafSvg className="absolute -bottom-2 -left-2.5 w-6 h-6 sm:w-7 sm:h-7 -rotate-[95deg]" />
                <LeafSvg className="absolute -bottom-3 left-1 w-6 h-6 sm:w-7 sm:h-7 rotate-[32deg]" />
                <PurpleFlowerSvg className="absolute -bottom-2.5 -left-1.5 w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)]" />

                {/* Flor roxa e folhas inferior direito */}
                <LeafSvg className="absolute -bottom-3 right-1 w-6 h-6 sm:w-7 sm:h-7 -rotate-[32deg]" flip />
                <LeafSvg className="absolute -bottom-2 -right-2.5 w-6 h-6 sm:w-7 sm:h-7 rotate-[95deg]" flip />
                <PurpleFlowerSvg className="absolute -bottom-2.5 -right-1.5 w-7 h-7 sm:w-8 sm:h-8 -rotate-[10deg] drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)]" />
              </div>

              {/* Anel dourado externo ao passar o mouse */}
              <div className="pointer-events-none absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-[0_0_16px_rgba(255,212,72,0.75)]" />

              {/* Nome do personagem em destaque */}
              <span className="relative z-10 font-ocarina ocarina-note-label font-bold tracking-wide text-[17px] sm:text-[21px] leading-none">
                {meta.name}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
