import { useState, type ReactNode } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Move,
  Palette,
  Star,
  Undo2,
} from 'lucide-react';
import { ModalCornerOrnaments } from './BotanicalOrnaments';
import { MiniOcarinaPositionPreviewSvg, StickerGlyphSvg } from './OcarinaStickerIcons';
import {
  OCARINA_COLOR_OPTIONS,
  OCARINA_STICKER_OPTIONS,
  OCARINA_STICKER_POSITIONS,
  type OcarinaCustomizationState,
} from '../scene/ocarinaCustomization';

interface OcarinaCustomizePanelProps {
  open: boolean;
  value: OcarinaCustomizationState;
  onChange: (next: OcarinaCustomizationState) => void;
  onCancel: () => void;
  onApply: () => void;
  onPlaySound: (pitchMultiplier?: number) => void;
}

const COLORS_PER_PAGE = 9;
const STICKERS_PER_PAGE = 12;

function GoldHeaderOcarinaIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true">
      <defs>
        <linearGradient id="editOcaGold" x1="12" y1="12" x2="54" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff7a8" />
          <stop offset="50%" stopColor="#ffd028" />
          <stop offset="100%" stopColor="#b85d00" />
        </linearGradient>
      </defs>
      <path
        d="M36 22 L33 11 C33 9.5 44 9 45 11 L47 21 C53 23 56 30 51 39 C44 49 23 53 12 46 C7 38 18 23 36 22 Z"
        fill="url(#editOcaGold)"
        stroke="#2b1200"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="39" r="2.3" fill="#2b1200" />
      <circle cx="31" cy="34" r="2.4" fill="#2b1200" />
      <circle cx="38" cy="30" r="2.3" fill="#2b1200" />
      <circle cx="44" cy="28" r="2.0" fill="#2b1200" />
    </svg>
  );
}

function SectionHeader({
  badge,
  title,
  compact = false,
}: {
  badge: ReactNode;
  title: string;
  compact?: boolean;
}) {
  return (
    <div className="relative flex items-center pl-7 sm:pl-8 mb-1.5">
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full ocarina-gold-frame p-[2.5px] ${
          compact ? 'w-8 h-8' : 'w-9 h-9'
        }`}
      >
        <div className="w-full h-full rounded-full ocarina-navy-surface border border-[#020826] flex items-center justify-center text-[#ffd84d] shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)]">
          {badge}
        </div>
      </div>

      <div className="ocarina-n64-plaque rounded-[5px] py-0.5 pl-4 pr-3.5 inline-flex items-center">
        <span className="font-ocarina text-[12px] sm:text-[13.5px] font-bold text-white tracking-wide leading-tight drop-shadow-[0_1.5px_0_rgba(8,20,66,0.95)] whitespace-nowrap">
          {title}
        </span>
      </div>
    </div>
  );
}

export function OcarinaCustomizePanel({
  open,
  value,
  onChange,
  onCancel,
  onApply,
  onPlaySound,
}: OcarinaCustomizePanelProps) {
  const [colorOffset, setColorOffset] = useState(0);
  const [stickerPage, setStickerPage] = useState(0);

  if (!open) return null;

  const maxColorOffset = Math.max(0, OCARINA_COLOR_OPTIONS.length - COLORS_PER_PAGE);
  const visibleColors = OCARINA_COLOR_OPTIONS.slice(colorOffset, colorOffset + COLORS_PER_PAGE);

  const totalStickerPages = Math.ceil(OCARINA_STICKER_OPTIONS.length / STICKERS_PER_PAGE);
  const safeStickerPage = stickerPage % totalStickerPages;
  const visibleStickers = OCARINA_STICKER_OPTIONS.slice(
    safeStickerPage * STICKERS_PER_PAGE,
    (safeStickerPage + 1) * STICKERS_PER_PAGE,
  );

  const handleShiftColors = (dir: -1 | 1) => {
    onPlaySound(dir > 0 ? 1.06 : 0.94);
    if (maxColorOffset === 0) return;
    setColorOffset((prev) => (prev + dir + (maxColorOffset + 1)) % (maxColorOffset + 1));
  };

  const handleShiftStickers = (dir: -1 | 1) => {
    onPlaySound(dir > 0 ? 1.06 : 0.94);
    setStickerPage((prev) => (prev + dir + totalStickerPages) % totalStickerPages);
  };

  return (
    <aside
      role="dialog"
      aria-label="Editar Ocarina"
      data-testid="ocarina-customize-panel"
      className="fixed z-30 left-3 right-3 bottom-3 md:bottom-auto md:right-auto md:left-5 md:top-[54%] md:-translate-y-1/2 md:w-[392px] lg:w-[424px] max-w-[440px] mx-auto md:mx-0 modal-pop-in"
    >
      <div className="relative ocarina-gold-frame p-[9px] sm:p-[11px] rounded-[10px]">
        <ModalCornerOrnaments />

        {/* Placa de título no topo sobreposta à borda dourada */}
        <div className="relative z-30 -mt-5 sm:-mt-6 mb-1.5 flex items-center justify-center">
          <div className="relative flex items-center pl-6">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 sm:w-[54px] sm:h-[54px] rounded-full ocarina-gold-frame p-[3.5px]">
              <div className="w-full h-full rounded-full ocarina-navy-surface border border-[#020826] flex items-center justify-center shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]">
                <GoldHeaderOcarinaIcon />
              </div>
            </div>

            <div className="ocarina-n64-plaque rounded-[8px] pl-9 pr-7 sm:pl-10 sm:pr-8 py-1.5">
              <h2 className="font-ocarina text-[18px] sm:text-[21px] font-bold text-white tracking-wide leading-none drop-shadow-[0_2px_0_rgba(7,20,66,0.95)] whitespace-nowrap">
                Editar Ocarina
              </h2>
            </div>
          </div>
        </div>

        {/* Contêiner interno azul-marinho escuro */}
        <div className="relative z-10 ocarina-navy-surface rounded-[5px] border-2 border-[#020826] px-2.5 py-2.5 sm:px-3 sm:py-3 space-y-2.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)]">
          {/* 1. Cor da Ocarina */}
          <div data-testid="customize-color-section">
            <SectionHeader badge={<Palette className="w-4 h-4" />} title="Cor da Ocarina" />
            <div className="ocarina-n64-subcard ocarina-navy-surface rounded-[6px] px-1.5 py-1.5 flex items-center gap-1">
              <button
                type="button"
                aria-label="Cores anteriores"
                data-testid="color-prev-btn"
                onClick={() => handleShiftColors(-1)}
                className="flex items-center justify-center w-5 h-7 text-[#ffd238] hover:text-white cursor-pointer shrink-0 transition-transform active:scale-90"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
              </button>

              <div className="flex-1 grid grid-cols-9 gap-1 sm:gap-1.5">
                {visibleColors.map((swatch) => {
                  const selected = value.colorHex.toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <button
                      key={swatch.id}
                      type="button"
                      data-testid={`color-swatch-${swatch.id}`}
                      aria-label={`Cor ${swatch.label}`}
                      aria-pressed={selected}
                      onClick={() => {
                        onPlaySound(1.04);
                        onChange({ ...value, colorHex: swatch.hex });
                      }}
                      className={`group relative aspect-square w-full rounded-[5px] cursor-pointer transition-transform duration-100 hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ffd24c] ${
                        selected
                          ? 'ring-2 ring-[#ffe970] shadow-[0_0_10px_rgba(255,214,68,0.85)] scale-105 z-10'
                          : 'border border-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
                      }`}
                      style={{
                        background: `linear-gradient(145deg, ${swatch.rimHex} 0%, ${swatch.hex} 48%, #070914 135%)`,
                      }}
                    >
                      {/* Realce interno facetado estilo rupee */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-[3px] rounded-[2px] border border-white/25"
                        style={{ backgroundColor: swatch.hex }}
                      />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                aria-label="Mais cores"
                data-testid="color-next-btn"
                onClick={() => handleShiftColors(1)}
                className="flex items-center justify-center w-5 h-7 text-[#ffd238] hover:text-white cursor-pointer shrink-0 transition-transform active:scale-90"
              >
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* 2. Adesivos (grade 6x2 com setas < >) */}
          <div data-testid="customize-sticker-section">
            <SectionHeader badge={<Star className="w-4 h-4 fill-current" />} title="Adesivos" />
            <div className="ocarina-n64-subcard ocarina-navy-surface rounded-[6px] px-1.5 py-1.5 flex items-center gap-1">
              <button
                type="button"
                aria-label="Página anterior de adesivos"
                data-testid="sticker-prev-btn"
                onClick={() => handleShiftStickers(-1)}
                className="flex items-center justify-center w-5 h-10 text-[#ffd238] hover:text-white cursor-pointer shrink-0 transition-transform active:scale-90"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
              </button>

              <div className="flex-1 grid grid-cols-6 gap-1 sm:gap-1.5">
                {visibleStickers.map((sticker) => {
                  const selected = value.stickerId === sticker.id;
                  return (
                    <button
                      key={sticker.id}
                      type="button"
                      data-testid={`sticker-option-${sticker.id}`}
                      aria-label={`Adesivo ${sticker.label}`}
                      aria-pressed={selected}
                      onClick={() => {
                        onPlaySound(sticker.id === 'none' ? 0.9 : 1.08);
                        onChange({ ...value, stickerId: sticker.id });
                      }}
                      className={`h-8 sm:h-9 rounded-[5px] flex items-center justify-center cursor-pointer transition-all duration-100 hover:brightness-125 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ffd24c] ${
                        selected
                          ? 'bg-gradient-to-b from-[#1746b5] to-[#0b236b] ring-2 ring-[#ffe45c] shadow-[0_0_10px_rgba(255,214,68,0.75)]'
                          : 'bg-gradient-to-b from-[#071a62] to-[#030b38] border border-[#254ea8]/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.75)]'
                      }`}
                    >
                      <StickerGlyphSvg stickerId={sticker.id} className="w-6 h-6 sm:w-6.5 sm:h-6.5" />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                aria-label="Próxima página de adesivos"
                data-testid="sticker-next-btn"
                onClick={() => handleShiftStickers(1)}
                className="flex items-center justify-center w-5 h-10 text-[#ffd238] hover:text-white cursor-pointer shrink-0 transition-transform active:scale-90"
              >
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* 3. Posição do Adesivo */}
          <div data-testid="customize-position-section">
            <SectionHeader badge={<Move className="w-4 h-4" />} title="Posição do Adesivo" />
            <div className="ocarina-n64-subcard ocarina-navy-surface rounded-[6px] px-2 py-1.5 grid grid-cols-4 gap-1.5">
              {OCARINA_STICKER_POSITIONS.map((posOpt) => {
                const selected = value.stickerPosition === posOpt.id;
                return (
                  <button
                    key={posOpt.id}
                    type="button"
                    data-testid={`sticker-pos-${posOpt.id}`}
                    aria-label={`Posição ${posOpt.label}`}
                    aria-pressed={selected}
                    onClick={() => {
                      onPlaySound(1.03);
                      onChange({ ...value, stickerPosition: posOpt.id });
                    }}
                    className={`rounded-[5px] px-1 py-0.5 flex items-center justify-center cursor-pointer transition-all duration-100 hover:brightness-115 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ffd24c] ${
                      selected
                        ? 'bg-gradient-to-b from-[#1746b5] to-[#0b236b] ring-2 ring-[#ffe45c] shadow-[0_0_10px_rgba(255,214,68,0.8)]'
                        : 'bg-gradient-to-b from-[#071a62] to-[#030b38] border border-[#254ea8]/70'
                    }`}
                  >
                    <MiniOcarinaPositionPreviewSvg
                      ocarinaColorHex={value.colorHex}
                      markerX={posOpt.previewX}
                      markerY={posOpt.previewY}
                      className="w-full h-8 sm:h-9"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Cancelar & Aplicar */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <button
              type="button"
              data-testid="ocarina-customize-cancel"
              onClick={() => {
                onPlaySound(0.88);
                onCancel();
              }}
              className="ocarina-n64-plaque rounded-[6px] py-1.5 px-3 flex items-center justify-center gap-2 cursor-pointer transition-transform duration-100 hover:brightness-115 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ffd24c]"
            >
              <Undo2 className="w-4 h-4 text-[#ffd938] stroke-[2.8]" />
              <span className="font-ocarina text-[15px] sm:text-[16px] font-bold text-white tracking-wide drop-shadow-[0_1.5px_0_rgba(7,20,66,0.95)]">
                Cancelar
              </span>
            </button>

            <button
              type="button"
              data-testid="ocarina-customize-apply"
              onClick={() => {
                onPlaySound(1.15);
                onApply();
              }}
              className="ocarina-n64-plaque rounded-[6px] py-1.5 px-3 flex items-center justify-center gap-2 cursor-pointer transition-transform duration-100 hover:brightness-115 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ffd24c]"
            >
              <Check className="w-4 h-4 text-[#ffd938] stroke-[3.2]" />
              <span className="font-ocarina text-[15px] sm:text-[16px] font-bold text-white tracking-wide drop-shadow-[0_1.5px_0_rgba(7,20,66,0.95)]">
                Aplicar
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
