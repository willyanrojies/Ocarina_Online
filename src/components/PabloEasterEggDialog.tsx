import { useEffect, useState } from 'react';
import {
  PABLO_EASTER_EGG_DIALOG_ASSET_PATH,
  PABLO_EASTER_EGG_TEXT,
  PABLO_EASTER_EGG_TYPE_INTERVAL_MS,
} from '../state/pabloEasterEgg';
import { loadProcessedTitleAssetUrl } from './titleAssetKeying';

interface PabloEasterEggDialogProps {
  open: boolean;
  onTypeCharacter: (charIndex: number) => void;
}

export function PabloEasterEggDialog({ open, onTypeCharacter }: PabloEasterEggDialogProps) {
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [visibleChars, setVisibleChars] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadProcessedTitleAssetUrl(PABLO_EASTER_EGG_DIALOG_ASSET_PATH, 960).then((url) => {
      if (!cancelled) setFrameSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setVisibleChars(0);
      return;
    }

    const enterRaf = requestAnimationFrame(() => {
      setEntered(true);
    });

    setVisibleChars(0);
    let idx = 0;
    const total = PABLO_EASTER_EGG_TEXT.length;
    const timer = window.setInterval(() => {
      idx += 1;
      setVisibleChars(idx);
      const ch = PABLO_EASTER_EGG_TEXT[idx - 1];
      if (ch && ch !== ' ') {
        onTypeCharacter(idx);
      }
      if (idx >= total) {
        window.clearInterval(timer);
      }
    }, PABLO_EASTER_EGG_TYPE_INTERVAL_MS);

    return () => {
      cancelAnimationFrame(enterRaf);
      window.clearInterval(timer);
    };
  }, [open, onTypeCharacter]);

  if (!open) return null;

  const typedText = PABLO_EASTER_EGG_TEXT.slice(0, visibleChars);
  const finishedTyping = visibleChars >= PABLO_EASTER_EGG_TEXT.length;

  return (
    <div
      role="dialog"
      aria-label="Diálogo de Pablo"
      aria-live="polite"
      data-testid="pablo-easter-egg-dialog"
      data-typed-text={typedText}
      data-typing-done={finishedTyping ? 'true' : 'false'}
      className={`pointer-events-none fixed inset-x-0 bottom-4 sm:bottom-8 z-30 flex justify-center px-3 sm:px-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        entered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
      }`}
    >
      <div className="relative w-[min(94vw,660px)] select-none">
        {frameSrc ? (
          <img
            src={frameSrc}
            alt=""
            draggable={false}
            className="block w-full h-auto object-contain drop-shadow-[0_14px_30px_rgba(0,0,0,0.88)]"
          />
        ) : (
          <div className="w-full aspect-[2130/624]" />
        )}

        {/* Área clássica de texto estilo N64 alinhada dentro da moldura floral azul-marinho */}
        <div
          style={{
            left: '7.5%',
            right: '7.5%',
            top: '25%',
            bottom: '19%',
          }}
          className="absolute flex flex-col justify-center items-center px-3 sm:px-6 text-center"
        >
          <p
            style={{
              textShadow: '0 2px 0 #02061c, 2px 2px 0 #02061c, -1px -1px 0 #02061c, 0 0 10px rgba(72, 138, 255, 0.35)',
            }}
            className="font-ocarina text-[1.15rem] sm:text-[1.65rem] md:text-[1.85rem] font-bold tracking-[0.04em] text-[#fff6dc] leading-snug"
          >
            {typedText}
            {!finishedTyping && (
              <span
                aria-hidden="true"
                className="inline-block w-[0.55ch] h-[0.95em] ml-1 align-middle bg-[#ffd24c]/90 animate-pulse"
              />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
