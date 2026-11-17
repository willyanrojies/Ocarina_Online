import { useState } from 'react';
import {
  CharacterBadgeSvg,
  LeafSvg,
  MusicNoteBadgeSvg,
  OcarinaBadgeSvg,
  PurpleFlowerSvg,
} from './BotanicalOrnaments';
import { MusicSettingsModal } from './MusicSettingsModal';

interface MenuButtonProps {
  hidden?: boolean;
  ambientVolume: number;
  ocarinaVolume: number;
  ocarinaMuted: boolean;
  customizingOcarina: boolean;
  viewingCharacters: boolean;
  onAmbientVolumeChange: (val: number) => void;
  onOcarinaVolumeChange: (val: number) => void;
  onToggleOcarinaMute: () => void;
  onToggleCustomizeOcarina: () => void;
  onToggleViewCharacters: () => void;
  onPlayMenuSound: (pitchMultiplier?: number) => void;
}

export function MenuButton({
  hidden = false,
  ambientVolume,
  ocarinaVolume,
  ocarinaMuted,
  customizingOcarina,
  viewingCharacters,
  onAmbientVolumeChange,
  onOcarinaVolumeChange,
  onToggleOcarinaMute,
  onToggleCustomizeOcarina,
  onToggleViewCharacters,
  onPlayMenuSound,
}: MenuButtonProps) {
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuHopping, setMenuHopping] = useState(false);
  const [musicHopping, setMusicHopping] = useState(false);
  const [ocarinaHopping, setOcarinaHopping] = useState(false);
  const [charactersHopping, setCharactersHopping] = useState(false);

  const triggerMenuToggle = () => {
    onPlayMenuSound();
    setMenuHopping(false);
    requestAnimationFrame(() => setMenuHopping(true));
    setMenuExpanded((prev) => !prev);
  };

  const triggerMusicSettings = () => {
    onPlayMenuSound();
    setMusicHopping(false);
    requestAnimationFrame(() => setMusicHopping(true));
    setSettingsOpen((prev) => !prev);
  };

  const triggerOcarinaCustomize = () => {
    onPlayMenuSound();
    setOcarinaHopping(false);
    requestAnimationFrame(() => setOcarinaHopping(true));
    setSettingsOpen(false);
    onToggleCustomizeOcarina();
  };

  const triggerViewCharacters = () => {
    onPlayMenuSound(1.06);
    setCharactersHopping(false);
    requestAnimationFrame(() => setCharactersHopping(true));
    setSettingsOpen(false);
    onToggleViewCharacters();
  };

  return (
    <>
      <div
        aria-hidden={hidden}
        className={`fixed top-4 left-4 sm:top-5 sm:left-6 z-30 flex items-center gap-3 transition-opacity duration-500 ${
          hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Botão principal do menu (tamanho compacto, animação de salto e som de bolha) */}
        <button
          type="button"
          data-testid="menu-button"
          aria-label="Menu de opções da ocarina"
          aria-expanded={menuExpanded}
          onClick={triggerMenuToggle}
          onAnimationEnd={() => setMenuHopping(false)}
          className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full ocarina-gold-frame p-[4px] cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ffd24c] ${
            menuHopping ? 'menu-hop-anim' : ''
          }`}
        >
          {/* Folhas superior esquerdo */}
          <span className="pointer-events-none absolute -top-2 -left-2 w-6 h-6" aria-hidden="true">
            <LeafSvg className="absolute top-0 left-0 w-5 h-5 -rotate-[35deg]" />
            <LeafSvg className="absolute top-1.5 -left-1 w-4 h-4 -rotate-[95deg]" />
          </span>

          {/* Folhas e flor roxa inferior direito */}
          <span className="pointer-events-none absolute -bottom-2 -right-2 w-7 h-7" aria-hidden="true">
            <LeafSvg className="absolute bottom-1 right-0 w-5 h-5 rotate-[40deg]" flip />
            <LeafSvg className="absolute bottom-0 right-2 w-4 h-4 rotate-[110deg]" flip />
            <PurpleFlowerSvg className="absolute bottom-0 right-0.5 w-6 h-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" />
          </span>

          {/* Disco azul-marinho interno com 3 barras douradas */}
          <span className="w-full h-full rounded-full ocarina-navy-surface flex flex-col items-center justify-center gap-[3.5px] border border-[#020826] shadow-[inset_0_2px_5px_rgba(0,0,0,0.85)]">
            <span className="w-5 h-[3px] rounded-[2px] bg-gradient-to-b from-[#ffe266] via-[#e59816] to-[#914902] shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
            <span className="w-5 h-[3px] rounded-[2px] bg-gradient-to-b from-[#ffe266] via-[#e59816] to-[#914902] shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
            <span className="w-5 h-[3px] rounded-[2px] bg-gradient-to-b from-[#ffe266] via-[#e59816] to-[#914902] shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
          </span>
        </button>

        {/* Botões laterais de opções exibidos ao lado do botão de menu */}
        {menuExpanded && (
          <div className="flex items-center gap-3 side-option-pop" role="toolbar" aria-label="Opções do menu">
            <button
              type="button"
              data-testid="music-settings-button"
              aria-label="Painel com configuração musical"
              aria-expanded={settingsOpen}
              onClick={triggerMusicSettings}
              onAnimationEnd={() => setMusicHopping(false)}
              className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full ocarina-gold-frame p-[4px] cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ffd24c] ${
                musicHopping ? 'menu-hop-anim' : ''
              }`}
            >
              {/* Folhas superior esquerdo */}
              <span className="pointer-events-none absolute -top-2 -left-2 w-6 h-6" aria-hidden="true">
                <LeafSvg className="absolute top-0 left-0 w-5 h-5 -rotate-[35deg]" />
                <LeafSvg className="absolute top-1.5 -left-1 w-4 h-4 -rotate-[95deg]" />
              </span>

              {/* Folhas e flor roxa inferior direito */}
              <span className="pointer-events-none absolute -bottom-2 -right-2 w-7 h-7" aria-hidden="true">
                <LeafSvg className="absolute bottom-1 right-0 w-5 h-5 rotate-[40deg]" flip />
                <LeafSvg className="absolute bottom-0 right-2 w-4 h-4 rotate-[110deg]" flip />
                <PurpleFlowerSvg className="absolute bottom-0 right-0.5 w-6 h-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" />
              </span>

              {/* Disco azul-marinho interno com ícone dourado de nota musical */}
              <span className="w-full h-full rounded-full ocarina-navy-surface flex items-center justify-center border border-[#020826] shadow-[inset_0_2px_5px_rgba(0,0,0,0.85)]">
                <MusicNoteBadgeSvg className="w-6 h-6 sm:w-7 sm:h-7" />
              </span>
            </button>

            <button
              type="button"
              data-testid="ocarina-customize-button"
              aria-label="Personalizar ocarina"
              aria-pressed={customizingOcarina}
              onClick={triggerOcarinaCustomize}
              onAnimationEnd={() => setOcarinaHopping(false)}
              className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full ocarina-gold-frame p-[4px] cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ffd24c] ${
                ocarinaHopping ? 'menu-hop-anim' : ''
              } ${customizingOcarina ? 'ring-2 ring-[#70ebff] shadow-[0_0_16px_rgba(94,212,255,0.75)]' : ''}`}
            >
              {/* Folhas superior esquerdo */}
              <span className="pointer-events-none absolute -top-2 -left-2 w-6 h-6" aria-hidden="true">
                <LeafSvg className="absolute top-0 left-0 w-5 h-5 -rotate-[35deg]" />
                <LeafSvg className="absolute top-1.5 -left-1 w-4 h-4 -rotate-[95deg]" />
              </span>

              {/* Folhas e flor roxa inferior direito */}
              <span className="pointer-events-none absolute -bottom-2 -right-2 w-7 h-7" aria-hidden="true">
                <LeafSvg className="absolute bottom-1 right-0 w-5 h-5 rotate-[40deg]" flip />
                <LeafSvg className="absolute bottom-0 right-2 w-4 h-4 rotate-[110deg]" flip />
                <PurpleFlowerSvg className="absolute bottom-0 right-0.5 w-6 h-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" />
              </span>

              {/* Disco azul-marinho interno com ícone da ocarina azul */}
              <span className="w-full h-full rounded-full ocarina-navy-surface flex items-center justify-center border border-[#020826] shadow-[inset_0_2px_5px_rgba(0,0,0,0.85)]">
                <OcarinaBadgeSvg className="w-7 h-7 sm:w-8 sm:h-8" />
              </span>
            </button>

            <button
              type="button"
              data-testid="characters-view-button"
              aria-label="Personagens"
              aria-pressed={viewingCharacters}
              onClick={triggerViewCharacters}
              onAnimationEnd={() => setCharactersHopping(false)}
              className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full ocarina-gold-frame p-[4px] cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ffd24c] ${
                charactersHopping ? 'menu-hop-anim' : ''
              } ${viewingCharacters ? 'ring-2 ring-[#ffe45c] shadow-[0_0_16px_rgba(255,212,72,0.75)]' : ''}`}
            >
              {/* Folhas superior esquerdo */}
              <span className="pointer-events-none absolute -top-2 -left-2 w-6 h-6" aria-hidden="true">
                <LeafSvg className="absolute top-0 left-0 w-5 h-5 -rotate-[35deg]" />
                <LeafSvg className="absolute top-1.5 -left-1 w-4 h-4 -rotate-[95deg]" />
              </span>

              {/* Folhas e flor roxa inferior direito */}
              <span className="pointer-events-none absolute -bottom-2 -right-2 w-7 h-7" aria-hidden="true">
                <LeafSvg className="absolute bottom-1 right-0 w-5 h-5 rotate-[40deg]" flip />
                <LeafSvg className="absolute bottom-0 right-2 w-4 h-4 rotate-[110deg]" flip />
                <PurpleFlowerSvg className="absolute bottom-0 right-0.5 w-6 h-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" />
              </span>

              {/* Disco azul-marinho interno com ícone dourado de personagem */}
              <span className="w-full h-full rounded-full ocarina-navy-surface flex items-center justify-center border border-[#020826] shadow-[inset_0_2px_5px_rgba(0,0,0,0.85)]">
                <CharacterBadgeSvg className="w-7 h-7 sm:w-8 sm:h-8" />
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Modal centralizado de configurações de áudio */}
      <MusicSettingsModal
        open={settingsOpen}
        ambientVolume={ambientVolume}
        ocarinaVolume={ocarinaVolume}
        ocarinaMuted={ocarinaMuted}
        onAmbientVolumeChange={onAmbientVolumeChange}
        onOcarinaVolumeChange={onOcarinaVolumeChange}
        onToggleOcarinaMute={onToggleOcarinaMute}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

