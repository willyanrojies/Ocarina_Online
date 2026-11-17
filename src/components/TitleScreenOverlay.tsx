import { useEffect, useRef, useState } from 'react';
import {
  LOADING_BAR_TRACK_INSET,
  loadProcessedLoadingBarAssetUrl,
  loadProcessedTitleAssetUrl,
} from './titleAssetKeying';

export const TITLE_LOGO_ASSET_PATH =
  '/assets/aistudio/Logo_Flutuante_Ocarina_Online_1ff9f4e3.png';
export const TITLE_PLAY_ASSET_PATH =
  '/assets/aistudio/Bot_o_Play_Dourado_com_Folhas_e_Flores_cb1c9ebd.png';
export const TITLE_LOADING_BAR_ASSET_PATH =
  '/assets/aistudio/Barra_de_Carregamento_Ocarina_Transparente_f6687e1f.png';

interface TitleScreenOverlayProps {
  visible: boolean;
  exiting: boolean;
  sceneProgress: number;
  sceneReady: boolean;
  onPlay: () => void;
}

export function TitleScreenOverlay({
  visible,
  exiting,
  sceneProgress,
  sceneReady,
  onPlay,
}: TitleScreenOverlayProps) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [loadingBarSrc, setLoadingBarSrc] = useState<string | null>(null);
  const [playSrc, setPlaySrc] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [logoFadedIn, setLogoFadedIn] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [barCompleteHeld, setBarCompleteHeld] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);

  const displayProgressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const allResourcesReadyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void loadProcessedLoadingBarAssetUrl(TITLE_LOADING_BAR_ASSET_PATH).then((url) => {
      if (!cancelled) setLoadingBarSrc(url);
    });
    void loadProcessedTitleAssetUrl(TITLE_LOGO_ASSET_PATH, 960).then((url) => {
      if (!cancelled) setLogoSrc(url);
    });
    void loadProcessedTitleAssetUrl(TITLE_PLAY_ASSET_PATH, 512).then((url) => {
      if (!cancelled) setPlaySrc(url);
    });

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready
        .then(() => {
          if (!cancelled) setFontsReady(true);
        })
        .catch(() => {
          if (!cancelled) setFontsReady(true);
        });
    } else {
      setFontsReady(true);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const allResourcesReady =
    logoSrc !== null &&
    loadingBarSrc !== null &&
    playSrc !== null &&
    fontsReady &&
    sceneReady;

  // Progresso total ponderado do carregamento (assets da interface + fontes = 18%, cena 3D/texturas/shaders = 82%)
  const uiFraction =
    (logoSrc ? 0.35 : 0) +
    (loadingBarSrc ? 0.25 : 0) +
    (playSrc ? 0.2 : 0) +
    (fontsReady ? 0.2 : 0);
  const targetProgress = allResourcesReady
    ? 1
    : Math.min(0.95, uiFraction * 0.18 + Math.min(1, sceneProgress) * 0.82);

  targetProgressRef.current = targetProgress;
  allResourcesReadyRef.current = allResourcesReady;

  useEffect(() => {
    if (!logoSrc) return;
    const raf = requestAnimationFrame(() => {
      setLogoFadedIn(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [logoSrc]);

  // Loop rAF contínuo único para animar a barra suavemente de 0% -> 100% sem reiniciar a cada pulso de progresso
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.08, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      const cur = displayProgressRef.current;
      const goal = targetProgressRef.current;
      const ready = allResourcesReadyRef.current;

      if (cur < goal) {
        const rate = ready ? Math.min(1.25, Math.max(0.42, (goal - cur) * 2.2)) : Math.min(0.85, Math.max(0.2, (goal - cur) * 2.4));
        const next = Math.min(goal, cur + rate * dt);
        displayProgressRef.current = next;
        setDisplayProgress(next >= 0.998 && ready ? 1 : next);
        if (next >= 0.998 && ready) {
          displayProgressRef.current = 1;
          setDisplayProgress(1);
          return;
        }
      } else if (goal >= 1 && ready && cur >= 0.998) {
        displayProgressRef.current = 1;
        setDisplayProgress(1);
        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Segura brevemente em 100%, depois oculta a barra de carregamento e exibe o botão Play no lugar
  useEffect(() => {
    if (!allResourcesReady || displayProgress < 0.998 || barCompleteHeld) return;
    const holdTimer = window.setTimeout(() => {
      setBarCompleteHeld(true);
    }, 360);
    return () => window.clearTimeout(holdTimer);
  }, [allResourcesReady, displayProgress, barCompleteHeld]);

  useEffect(() => {
    if (!barCompleteHeld) return;
    const swapTimer = window.setTimeout(() => {
      setShowPlayButton(true);
    }, 320);
    return () => window.clearTimeout(swapTimer);
  }, [barCompleteHeld]);

  if (!visible) return null;

  const showLogo = logoSrc !== null && logoFadedIn && !exiting;
  const showLoadingBar = loadingBarSrc !== null && !barCompleteHeld && !exiting;
  const canClickPlay = allResourcesReady && showPlayButton && !exiting;
  const fillPercent = Math.round(Math.max(0, Math.min(1, displayProgress)) * 100);

  return (
    <div
      data-testid="title-screen-overlay"
      data-title-state={exiting ? 'exiting' : canClickPlay ? 'ready' : 'loading'}
      data-loading-progress={fillPercent}
      data-loading-ready={allResourcesReady ? 'true' : 'false'}
      className={`fixed inset-0 z-30 flex flex-col items-center justify-center px-4 sm:px-8 select-none ${
        exiting ? 'pointer-events-none' : ''
      }`}
    >
      {/* Vinheta celestial sutil atrás do brasão para dar contraste sem esconder as estrelas */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,7,36,0.34)_0%,transparent_64%)] transition-opacity ${
          exiting ? 'duration-700 opacity-0' : 'duration-[2600ms]'
        } ${showLogo || showLoadingBar ? 'opacity-100' : 'opacity-0'}`}
      />

      <div className="relative z-10 flex flex-col items-center justify-center gap-4 sm:gap-6 max-w-full">
        {/* Brasão Ocarina Online (fade-in celestial lento de 3,4s + flutuação suave) */}
        <div
          className={`transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
            exiting ? 'duration-700 scale-[1.03]' : 'duration-[3400ms] scale-100'
          } ${
            showLogo
              ? 'opacity-100 translate-y-0'
              : exiting
                ? 'opacity-0 -translate-y-2'
                : 'opacity-0 translate-y-3 scale-[0.97]'
          }`}
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="Ocarina Online — Feito por WR Gohan (willyan)"
              draggable={false}
              className="title-logo-float w-[min(90vw,640px)] md:w-[min(68vw,760px)] lg:w-[min(58vw,800px)] max-h-[50vh] h-auto object-contain pointer-events-none drop-shadow-[0_14px_34px_rgba(0,0,0,0.85)]"
            />
          ) : (
            <div className="w-[min(90vw,640px)] md:w-[min(68vw,760px)] lg:w-[min(58vw,800px)] aspect-[16/9] max-h-[50vh]" />
          )}
        </div>

        {/* Espaço central inferior compartilhado: barra de carregamento -> botão Play quando pronto */}
        <div className="relative grid place-items-center min-h-[118px] sm:min-h-[146px] w-full">
          {/* Barra de carregamento botânica estilo N64 */}
          <div
            role="progressbar"
            aria-label="Carregando o jogo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fillPercent}
            data-testid="title-loading-bar"
            className={`col-start-1 row-start-1 relative w-[min(86vw,430px)] sm:w-[min(68vw,500px)] transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none ${
              showLoadingBar
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 translate-y-1'
            }`}
          >
            {loadingBarSrc && (
              <div className="relative w-full">
                {/* Moldura base (com o canal interno esvaziado para azul-marinho escuro) */}
                <img
                  src={loadingBarSrc}
                  alt="Carregando..."
                  draggable={false}
                  className="block w-full h-auto object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.85)]"
                />

                {/* Preenchimento líquido azul-royal animado estritamente dentro da canaleta dourada */}
                <div
                  aria-hidden="true"
                  style={{
                    left: `${LOADING_BAR_TRACK_INSET.leftPct}%`,
                    top: `${LOADING_BAR_TRACK_INSET.topPct}%`,
                    width: `${LOADING_BAR_TRACK_INSET.widthPct}%`,
                    height: `${LOADING_BAR_TRACK_INSET.heightPct}%`,
                  }}
                  className="absolute rounded-full overflow-hidden"
                >
                  <div
                    style={{ width: `${fillPercent}%` }}
                    className="h-full rounded-full transition-[width] duration-75 ease-out bg-[linear-gradient(180deg,#8ec5ff_0%,#2568fc_22%,#1352f2_56%,#0221c8_100%)] shadow-[inset_0_1.5px_2px_rgba(220,242,255,0.85),inset_0_-2px_3px_rgba(0,12,78,0.9)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botão Play dourado botânico centralizado — surge no lugar ao concluir 100% do carregamento */}
          <button
            type="button"
            data-testid="title-play-button"
            aria-label="Iniciar Ocarina Online"
            disabled={!canClickPlay}
            onClick={onPlay}
            className={`col-start-1 row-start-1 group relative flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#ffd24c] rounded-full transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
              canClickPlay ? 'cursor-pointer' : 'pointer-events-none'
            } ${
              exiting
                ? 'duration-700 opacity-0 scale-90'
                : canClickPlay
                  ? 'duration-[950ms] opacity-100 translate-y-0 scale-100'
                  : 'duration-500 opacity-0 translate-y-2 scale-95'
            }`}
          >
            {playSrc && (
              <img
                src={playSrc}
                alt="Play"
                draggable={false}
                className="w-[138px] sm:w-[168px] md:w-[192px] h-auto object-contain transition-transform duration-150 group-hover:scale-[1.07] group-active:scale-95 drop-shadow-[0_10px_22px_rgba(0,0,0,0.88)] group-hover:drop-shadow-[0_0_22px_rgba(255,212,72,0.75)]"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
