export function PurpleFlowerSvg({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* 5 pétalas pontudas arredondadas com contorno escuro e sombreamento violeta vivo */}
      {[0, 72, 144, 216, 288].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 32 32)`}>
          <path
            d="M32 30 C23 22, 24 8, 32 4 C40 8, 41 22, 32 30 Z"
            fill="#8b2cf5"
            stroke="#1b0736"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M32 26 C27 20, 27.5 11, 32 7.5 C36.5 11, 37 20, 32 26 Z"
            fill="#b65cff"
            opacity="0.85"
          />
        </g>
      ))}
      {/* Miolo de contas douradas */}
      {[
        [32, 27],
        [27.5, 30.5],
        [36.5, 30.5],
        [29, 35.5],
        [35, 35.5],
        [32, 31.8],
      ].map(([cx, cy], idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r={idx === 5 ? 3.3 : 2.8}
          fill="#ffd93b"
          stroke="#613300"
          strokeWidth="1.2"
        />
      ))}
    </svg>
  );
}

export function LeafSvg({ className = 'w-10 h-10', flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      <path
        d="M10 52 C10 26, 28 10, 56 8 C52 34, 36 50, 10 52 Z"
        fill="#72c914"
        stroke="#102904"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 49 C16 30, 30 16, 52 12 C42 26, 28 40, 14 49 Z"
        fill="#a3eb28"
        opacity="0.82"
      />
      <path
        d="M12 50 Q31 32 51 12"
        fill="none"
        stroke="#2d6307"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PanelCornerOrnaments() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* Ramo de folhas superior esquerdo */}
      <div className="absolute -top-5 -left-5 w-20 h-16">
        <LeafSvg className="absolute top-1 left-0 w-11 h-11 -rotate-[72deg]" />
        <LeafSvg className="absolute -top-2 left-3 w-12 h-12 -rotate-[25deg]" />
        <LeafSvg className="absolute -top-1 left-7 w-10 h-10 rotate-[14deg]" />
        <LeafSvg className="absolute top-4 left-1 w-9 h-9 -rotate-[115deg]" />
      </div>

      {/* Ramo de folhas superior direito */}
      <div className="absolute -top-5 -right-5 w-20 h-16">
        <LeafSvg className="absolute -top-1 right-7 w-10 h-10 -rotate-[14deg]" flip />
        <LeafSvg className="absolute -top-2 right-3 w-12 h-12 rotate-[25deg]" flip />
        <LeafSvg className="absolute top-1 right-0 w-11 h-11 rotate-[72deg]" flip />
        <LeafSvg className="absolute top-5 right-1 w-9 h-9 rotate-[110deg]" flip />
      </div>

      {/* Flores roxas e folhas inferior esquerdo */}
      <div className="absolute -bottom-5 -left-5 w-28 h-20">
        <LeafSvg className="absolute bottom-4 left-0 w-10 h-10 -rotate-[110deg]" />
        <LeafSvg className="absolute bottom-1 left-2 w-11 h-11 -rotate-[35deg]" />
        <LeafSvg className="absolute bottom-0 left-9 w-10 h-10 rotate-[35deg]" />
        <LeafSvg className="absolute bottom-6 left-6 w-9 h-9 rotate-[12deg]" />
        <PurpleFlowerSvg className="absolute bottom-1 left-1 w-12 h-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        <PurpleFlowerSvg className="absolute bottom-0 left-11 w-9 h-9 rotate-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Ramo de folhas inferior direito */}
      <div className="absolute -bottom-5 -right-5 w-20 h-16">
        <LeafSvg className="absolute bottom-4 right-1 w-10 h-10 rotate-[100deg]" flip />
        <LeafSvg className="absolute bottom-0 right-2 w-11 h-11 rotate-[35deg]" flip />
        <LeafSvg className="absolute bottom-1 right-7 w-9 h-9 -rotate-[25deg]" flip />
      </div>
    </div>
  );
}

export function ModalCornerOrnaments() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* Ramo de folhas superior esquerdo */}
      <div className="absolute -top-6 -left-5 w-24 h-20">
        <LeafSvg className="absolute top-3 -left-1 w-12 h-12 -rotate-[88deg]" />
        <LeafSvg className="absolute -top-2 left-3 w-13 h-13 -rotate-[34deg]" />
        <LeafSvg className="absolute -top-1 left-9 w-11 h-11 rotate-[12deg]" />
      </div>

      {/* Ramo de folhas superior direito */}
      <div className="absolute -top-6 -right-5 w-24 h-20">
        <LeafSvg className="absolute -top-1 right-9 w-11 h-11 -rotate-[12deg]" flip />
        <LeafSvg className="absolute -top-2 right-3 w-13 h-13 rotate-[34deg]" flip />
        <LeafSvg className="absolute top-3 -right-1 w-12 h-12 rotate-[88deg]" flip />
      </div>

      {/* Flores roxas e folhas inferior esquerdo */}
      <div className="absolute -bottom-5 -left-5 w-36 h-24">
        <LeafSvg className="absolute bottom-5 left-0 w-11 h-11 -rotate-[106deg]" />
        <LeafSvg className="absolute bottom-1 left-3 w-12 h-12 -rotate-[36deg]" />
        <LeafSvg className="absolute bottom-0 left-11 w-11 h-11 rotate-[34deg]" />
        <PurpleFlowerSvg className="absolute bottom-1 left-1 w-14 h-14 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]" />
        <PurpleFlowerSvg className="absolute bottom-0 left-12 w-10 h-10 rotate-[14deg] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]" />
      </div>

      {/* Flor roxa e folhas inferior direito */}
      <div className="absolute -bottom-5 -right-5 w-28 h-24">
        <LeafSvg className="absolute bottom-5 right-0 w-11 h-11 rotate-[102deg]" flip />
        <LeafSvg className="absolute bottom-1 right-3 w-12 h-12 rotate-[34deg]" flip />
        <LeafSvg className="absolute bottom-0 right-10 w-10 h-10 -rotate-[24deg]" flip />
        <PurpleFlowerSvg className="absolute bottom-1 right-2 w-13 h-13 -rotate-[10deg] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]" />
      </div>
    </div>
  );
}

export function MusicNoteBadgeSvg({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="n64GoldNote" x1="14" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff9b8" />
          <stop offset="45%" stopColor="#ffd438" />
          <stop offset="100%" stopColor="#cc6c00" />
        </linearGradient>
      </defs>
      {/* Contorno escuro */}
      <path
        d="M24 44 V17 L50 10 V38"
        fill="none"
        stroke="#240e00"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="18.5" cy="46" rx="10.8" ry="8" transform="rotate(-22 18.5 46)" fill="#240e00" />
      <ellipse cx="44.5" cy="39.5" rx="10.8" ry="8" transform="rotate(-22 44.5 39.5)" fill="#240e00" />
      {/* Preenchimento dourado brilhante */}
      <path
        d="M24 44 V17 L50 10 V38"
        fill="none"
        stroke="url(#n64GoldNote)"
        strokeWidth="7.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21 15 L53 7 L53 16 L21 24 Z" fill="url(#n64GoldNote)" stroke="#240e00" strokeWidth="2.2" strokeLinejoin="round" />
      <ellipse cx="18.5" cy="46" rx="8.6" ry="6.2" transform="rotate(-22 18.5 46)" fill="url(#n64GoldNote)" />
      <ellipse cx="44.5" cy="39.5" rx="8.6" ry="6.2" transform="rotate(-22 44.5 39.5)" fill="url(#n64GoldNote)" />
      {/* Brilho especular */}
      <ellipse cx="15.8" cy="43.8" rx="3" ry="1.8" transform="rotate(-22 15.8 43.8)" fill="#fffdf0" opacity="0.95" />
      <ellipse cx="41.8" cy="37.3" rx="3" ry="1.8" transform="rotate(-22 41.8 37.3)" fill="#fffdf0" opacity="0.95" />
    </svg>
  );
}

export function SpeakerBadgeSvg({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="n64GoldSpeaker" x1="12" y1="14" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff399" />
          <stop offset="50%" stopColor="#f5b818" />
          <stop offset="100%" stopColor="#9f4a00" />
        </linearGradient>
      </defs>
      <path
        d="M12 24 H23 L38 12 V52 L23 40 H12 Z"
        fill="url(#n64GoldSpeaker)"
        stroke="#2b1200"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M44 23 C49 27.5 49 36.5 44 41"
        fill="none"
        stroke="url(#n64GoldSpeaker)"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <path
        d="M50 17 C58 24.5 58 39.5 50 47"
        fill="none"
        stroke="url(#n64GoldSpeaker)"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function OcarinaBadgeSvg({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="n64BlueOcarina" x1="12" y1="18" x2="54" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#70ebff" />
          <stop offset="38%" stopColor="#1e88ff" />
          <stop offset="78%" stopColor="#0d47b8" />
          <stop offset="100%" stopColor="#07226e" />
        </linearGradient>
        <linearGradient id="n64SilverCollar" x1="16" y1="11" x2="32" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff2ba" />
          <stop offset="48%" stopColor="#deb045" />
          <stop offset="100%" stopColor="#7a4c0b" />
        </linearGradient>
      </defs>
      {/* Anel dourado/latão do bocal no canto superior esquerdo */}
      <path
        d="M19 26 L16 14 C16 12 24 9.5 27 11.5 L32 21 Z"
        fill="url(#n64SilverCollar)"
        stroke="#1b0e00"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Vinco sutil e faixa do colar no bocal */}
      <path d="M20.5 13 L25 22.5" stroke="#8c5810" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      <path
        d="M18.5 24.5 Q25.5 20.5 31.8 20.5"
        fill="none"
        stroke="#593300"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Corpo curvo principal da ocarina azul */}
      <path
        d="M10 47 C8.5 34.5 21.5 20.5 39.5 18 C51.5 16.5 57.5 21.5 55.2 31 C52 44 36.5 52.5 19.5 53.2 C12.5 53.5 10.5 50.5 10 47 Z"
        fill="url(#n64BlueOcarina)"
        stroke="#041036"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Realce especular azul-celeste superior */}
      <path
        d="M21 30.5 C28.5 23.5 39 20.8 50 21.5"
        fill="none"
        stroke="#b0f4ff"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.78"
      />
      {/* Furos dos dedos (arco superior e inferior) */}
      <circle cx="32.5" cy="28.5" r="2.6" fill="#031238" stroke="#5cdbff" strokeWidth="0.7" />
      <circle cx="40.5" cy="25.2" r="2.7" fill="#031238" stroke="#5cdbff" strokeWidth="0.7" />
      <circle cx="48.0" cy="23.5" r="2.3" fill="#031238" stroke="#5cdbff" strokeWidth="0.7" />
      <circle cx="24.2" cy="36.2" r="2.7" fill="#031238" stroke="#45b6ff" strokeWidth="0.7" />
      <circle cx="31.5" cy="37.2" r="2.6" fill="#031238" stroke="#45b6ff" strokeWidth="0.7" />
      <circle cx="20.0" cy="43.0" r="2.4" fill="#031238" stroke="#2c92eb" strokeWidth="0.6" />
    </svg>
  );
}

export function CharacterBadgeSvg({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="n64CharGoldBody" x1="18" y1="10" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff394" />
          <stop offset="42%" stopColor="#ffca28" />
          <stop offset="82%" stopColor="#e58e09" />
          <stop offset="100%" stopColor="#b05800" />
        </linearGradient>
        <linearGradient id="n64CharGoldShade" x1="34" y1="14" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffd740" />
          <stop offset="100%" stopColor="#9e4d00" />
        </linearGradient>
      </defs>
      {/* Silhueta facetada da cabeça estilo low-poly N64 com orelhas */}
      <polygon
        points="26,10 38,10 44,16 44,23 47,25 45,30 42,31 39,37 35,39 29,39 25,37 22,31 19,30 17,25 20,23 20,16"
        fill="url(#n64CharGoldBody)"
        stroke="#4a2100"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Plano facetado sutil na bochecha direita para profundidade poligonal N64 */}
      <polygon
        points="32,11 38,11 43,16 43,29 38,36 32,38"
        fill="url(#n64CharGoldShade)"
        opacity="0.34"
      />
      {/* Pescoço e ombros com decote em V */}
      <path
        d="M28 38.5 L36 38.5 L37 42 L48 45 L53 53 L47 55 L45 50 L44 55 L20 55 L19 50 L17 55 L11 53 L16 45 L27 42 Z"
        fill="url(#n64CharGoldBody)"
        stroke="#4a2100"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Destaque da gola em V */}
      <polyline
        points="25,42.5 32,46.5 39,42.5"
        fill="none"
        stroke="#fff7b8"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

