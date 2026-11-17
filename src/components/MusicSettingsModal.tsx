import { useEffect, type ReactNode } from 'react';
import { Volume1, Volume2, VolumeX, X } from 'lucide-react';
import { ModalCornerOrnaments, OcarinaBadgeSvg, SpeakerBadgeSvg } from './BotanicalOrnaments';
import {
  VOLUME_SEGMENT_COUNT,
  getFilledSegmentCount,
  getThumbPercent,
  stepVolume,
} from './settingsPanelMath';
import { DEFAULT_AMBIENT_VOLUME } from '../audio/nocturnalAmbience';

interface MusicSettingsModalProps {
  open: boolean;
  ambientVolume: number;
  ocarinaVolume: number;
  ocarinaMuted: boolean;
  onAmbientVolumeChange: (val: number) => void;
  onOcarinaVolumeChange: (val: number) => void;
  onToggleOcarinaMute: () => void;
  onClose: () => void;
}

interface VolumeCardProps {
  testId: string;
  title: string;
  badge: ReactNode;
  volume: number;
  muted?: boolean;
  onChange: (val: number) => void;
  onStepZero: () => void;
  onStepUp: () => void;
}

function RupeeThumbSvg() {
  return (
    <svg viewBox="0 0 28 38" className="w-[22px] h-[30px] sm:w-[24px] sm:h-[32px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]" aria-hidden="true">
      <polygon points="14,1 26,9 26,29 14,37 2,29 2,9" fill="#5e2a00" />
      <polygon points="14,3 24,10 24,28 14,35 4,28 4,10" fill="#f7b718" />
      <polygon points="14,5 22,11 22,27 14,33 6,27 6,11" fill="#ffe45c" />
      <polygon points="14,5 22,11 18,15 14,12 10,15 6,11" fill="#fff7b2" opacity="0.85" />
      <polygon points="14,12 18,15 18,23 14,26 10,23 10,15" fill="#ffc928" />
      <polygon points="14,26 18,23 22,27 14,33 6,27 10,23" fill="#c97204" opacity="0.7" />
    </svg>
  );
}

function VolumeCard({
  testId,
  title,
  badge,
  volume,
  muted = false,
  onChange,
  onStepZero,
  onStepUp,
}: VolumeCardProps) {
  const filledSegments = getFilledSegmentCount(volume, muted);
  const thumbPercent = getThumbPercent(volume, muted);
  const displayPercent = muted ? 0 : Math.round(volume * 100);

  return (
    <div
      data-testid={testId}
      className="ocarina-navy-surface ocarina-n64-subcard rounded-[8px] px-3 pt-2.5 pb-3.5 sm:px-3.5"
    >
      {/* Faixa de cabeçalho com medalhão circular sobreposto */}
      <div className="relative flex items-center pl-10 sm:pl-11 mb-3.5">
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full ocarina-gold-frame p-[4px]">
          <div className="w-full h-full rounded-full ocarina-navy-surface border border-[#020826] flex items-center justify-center shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]">
            {badge}
          </div>
        </div>

        <div className="ocarina-n64-plaque w-full rounded-[5px] py-1.5 pl-4 pr-3 flex items-center justify-between gap-2">
          <span className="font-ocarina text-[15px] sm:text-[17px] font-bold text-white tracking-wide leading-tight drop-shadow-[0_1.5px_0_rgba(8,20,66,0.95)] whitespace-nowrap">
            {title}
          </span>
          <span className="font-ocarina text-xs font-bold text-[#ffe58f] tabular-nums shrink-0">
            {displayPercent}%
          </span>
        </div>
      </div>

      {/* Barra estilo N64 com 10 segmentos azul-celeste e marcador rupee */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={onStepZero}
          aria-label={`Silenciar ${title.toLowerCase()}`}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-white/10 text-[#e4e8f5] transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[#ffd24c]"
        >
          {muted || filledSegments === 0 ? (
            <VolumeX className="w-4 h-4 text-[#ffd24c]" />
          ) : (
            <Volume1 className="w-4 h-4" />
          )}
        </button>

        <div className="relative flex-1 py-1.5">
          {/* Canaleta com borda dourada contendo 10 blocos LED azuis */}
          <div className="relative h-6 sm:h-[26px] rounded-[4px] bg-[#020824] p-[3px] border-2 border-[#d98d12] shadow-[inset_0_2px_5px_rgba(0,0,0,0.95),0_0_0_2px_#2d1300]">
            <div className="grid grid-cols-10 gap-[2px] w-full h-full">
              {Array.from({ length: VOLUME_SEGMENT_COUNT }, (_, idx) => {
                const isFilled = idx < filledSegments;
                return (
                  <span
                    key={idx}
                    className={`h-full rounded-[1.5px] transition-colors duration-100 ${
                      isFilled ? 'ocarina-n64-segment-on' : 'ocarina-n64-segment-off'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Marcador deslizante dourado em formato de rupee */}
          <div
            aria-hidden="true"
            style={{ left: `${thumbPercent}%` }}
            className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-[left] duration-100"
          >
            <RupeeThumbSvg />
          </div>

          {/* Controle deslizante acessível nativo sincronizado diretamente sobre a barra */}
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={displayPercent}
            aria-label={title}
            data-testid={`${testId}-slider`}
            onChange={(e) => onChange(Number(e.target.value) / 100)}
            className="absolute inset-0 z-20 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={onStepUp}
          aria-label={`Aumentar ${title.toLowerCase()}`}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-white/10 text-[#e4e8f5] transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[#ffd24c]"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function MusicSettingsModal({
  open,
  ambientVolume,
  ocarinaVolume,
  ocarinaMuted,
  onAmbientVolumeChange,
  onOcarinaVolumeChange,
  onToggleOcarinaMute,
  onClose,
}: MusicSettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Painel de configurações musicais"
        data-testid="music-settings-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[390px] sm:max-w-[420px] ocarina-gold-frame p-[11px] sm:p-[14px] rounded-[10px] modal-pop-in"
      >
        <ModalCornerOrnaments />

        {/* Placa de título estilo N64 centralizada no topo */}
        <div className="relative z-30 -mt-6 sm:-mt-7 mb-2 flex justify-center">
          <div className="ocarina-n64-plaque rounded-[8px] px-7 sm:px-9 py-1.5 sm:py-2">
            <h2 className="font-ocarina text-[20px] sm:text-[24px] font-bold text-white tracking-wide leading-none drop-shadow-[0_2px_0_rgba(7,20,66,0.95)] whitespace-nowrap">
              Configurações
            </h2>
          </div>

          <button
            type="button"
            data-testid="close-music-settings"
            aria-label="Fechar configurações musicais"
            onClick={onClose}
            className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full ocarina-gold-frame p-[2.5px] cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ffd24c]"
          >
            <span className="w-full h-full rounded-full ocarina-navy-surface flex items-center justify-center text-[#ffe58f] hover:text-white border border-[#020826]">
              <X className="w-4 h-4" />
            </span>
          </button>
        </div>

        {/* Painel interno azul-marinho */}
        <div className="relative z-10 ocarina-navy-surface rounded-[4px] border-2 border-[#020826] px-3.5 py-4 sm:px-4 sm:py-5 space-y-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)]">
          <VolumeCard
            testId="ambient-volume-card"
            title="Volume do ambiente"
            badge={<SpeakerBadgeSvg className="w-6 h-6 sm:w-7 sm:h-7" />}
            volume={ambientVolume}
            onChange={onAmbientVolumeChange}
            onStepZero={() =>
              onAmbientVolumeChange(ambientVolume > 0 ? 0 : DEFAULT_AMBIENT_VOLUME)
            }
            onStepUp={() => onAmbientVolumeChange(stepVolume(ambientVolume, 0.1))}
          />

          <VolumeCard
            testId="ocarina-volume-card"
            title="Volume da Ocarina"
            badge={<OcarinaBadgeSvg className="w-7 h-7 sm:w-8 sm:h-8" />}
            volume={ocarinaVolume}
            muted={ocarinaMuted}
            onChange={onOcarinaVolumeChange}
            onStepZero={onToggleOcarinaMute}
            onStepUp={() => {
              if (ocarinaMuted) {
                onToggleOcarinaMute();
              } else {
                onOcarinaVolumeChange(stepVolume(ocarinaVolume, 0.1));
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
