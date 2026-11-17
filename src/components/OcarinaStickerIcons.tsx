import type { OcarinaStickerId } from '../scene/ocarinaCustomization';

export function StickerGlyphSvg({
  stickerId,
  className = 'w-6 h-6',
}: {
  stickerId: OcarinaStickerId;
  className?: string;
}) {
  switch (stickerId) {
    case 'none':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <circle cx="32" cy="32" r="20" fill="none" stroke="#d5deed" strokeWidth="6" />
          <line x1="18" y1="46" x2="46" y2="18" stroke="#d5deed" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );

    case 'triforce':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <polygon points="32,9 20,30 44,30" fill="#ffd938" stroke="#361800" strokeWidth="2.4" strokeLinejoin="round" />
          <polygon points="20,30 8,51 32,51" fill="#ffd938" stroke="#361800" strokeWidth="2.4" strokeLinejoin="round" />
          <polygon points="44,30 32,51 56,51" fill="#ffd938" stroke="#361800" strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
      );

    case 'royal-crest':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M32 30 L24 38 L32 54 L40 38 Z"
            fill="#ffd938"
            stroke="#361800"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M28 32 C18 22, 10 20, 4 21 L12 29 L7 32 L18 37 L15 41 L26 40 Z"
            fill="#ffd938"
            stroke="#361800"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M36 32 C46 22, 54 20, 60 21 L52 29 L57 32 L46 37 L49 41 L38 40 Z"
            fill="#ffd938"
            stroke="#361800"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <polygon points="32,10 26,20 38,20" fill="#ffe766" stroke="#361800" strokeWidth="1.8" strokeLinejoin="round" />
          <polygon points="26,20 20,30 32,30" fill="#ffd938" stroke="#361800" strokeWidth="1.8" strokeLinejoin="round" />
          <polygon points="38,20 32,30 44,30" fill="#ffd938" stroke="#361800" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );

    case 'music-note':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M34 42 V14 C46 18, 49 25, 48 31 C43 26, 39 24, 37 24 V42 Z"
            fill="#ffd938"
            stroke="#361800"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <ellipse cx="26" cy="44" rx="11" ry="8" transform="rotate(-22 26 44)" fill="#ffd938" stroke="#361800" strokeWidth="2.8" />
        </svg>
      );

    case 'treble-clef':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M35 37 C43 35, 44 47, 34 47 C24 47, 23 34, 32 27 C41 20, 40 9, 34 9 C29 9, 30 19, 32 29 L34 52 C34 57, 27 57, 26 51"
            fill="none"
            stroke="#361800"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M35 37 C43 35, 44 47, 34 47 C24 47, 23 34, 32 27 C41 20, 40 9, 34 9 C29 9, 30 19, 32 29 L34 52 C34 57, 27 57, 26 51"
            fill="none"
            stroke="#ffd938"
            strokeWidth="4.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'pixel-heart':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M14 20 H26 V26 H38 V20 H50 V34 H44 V40 H38 V46 H26 V40 H20 V34 H14 Z"
            fill="#eb1c2c"
            stroke="#2b0408"
            strokeWidth="3"
            strokeLinejoin="miter"
          />
          <rect x="18" y="23" width="6" height="6" fill="#ff7582" />
        </svg>
      );

    case 'fairy':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path d="M26 30 C16 14, 8 16, 10 25 C12 31, 20 33, 26 32 Z" fill="#e8f7ff" stroke="#183878" strokeWidth="2" />
          <path d="M38 30 C48 14, 56 16, 54 25 C52 31, 44 33, 38 32 Z" fill="#e8f7ff" stroke="#183878" strokeWidth="2" />
          <path d="M26 36 C16 38, 12 45, 17 48 C22 50, 26 44, 27 38 Z" fill="#d9f0ff" stroke="#183878" strokeWidth="2" />
          <path d="M38 36 C48 38, 52 45, 47 48 C42 50, 38 44, 37 38 Z" fill="#d9f0ff" stroke="#183878" strokeWidth="2" />
          <circle cx="32" cy="33" r="10.5" fill="#4ebeff" stroke="#082468" strokeWidth="2.4" />
          <circle cx="30" cy="30" r="4.5" fill="#ffffff" opacity="0.9" />
        </svg>
      );

    case 'kokiri-emerald':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M32 34 C35 31, 39 34, 37 39 C34 45, 23 44, 21 36 C19 25, 31 17, 42 21 C53 25, 55 41, 44 49 C32 57, 13 50, 12 34 C11 19, 25 10, 39 11"
            fill="none"
            stroke="#0b2908"
            strokeWidth="8.5"
            strokeLinecap="round"
          />
          <path
            d="M32 34 C35 31, 39 34, 37 39 C34 45, 23 44, 21 36 C19 25, 31 17, 42 21 C53 25, 55 41, 44 49 C32 57, 13 50, 12 34 C11 19, 25 10, 39 11"
            fill="none"
            stroke="#4ee64e"
            strokeWidth="4.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'red-rupee':
      return <RupeeSvg light="#ff8590" mid="#e61c2c" dark="#8a0814" className={className} />;

    case 'blue-rupee':
      return <RupeeSvg light="#8be5ff" mid="#167dff" dark="#0a3999" className={className} />;

    case 'green-rupee':
      return <RupeeSvg light="#9cff8c" mid="#1cc738" dark="#0c691b" className={className} />;

    case 'gold-star':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <polygon
            points="32,8 39,23 55,25 43,36 46,53 32,45 18,53 21,36 9,25 25,23"
            fill="#ffd938"
            stroke="#361800"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'moon-crescent':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M40 12 C24 13, 15 26, 19 40 C22 50, 34 55, 44 50 C33 50, 27 40, 28 29 C29 20, 34 15, 40 12 Z"
            fill="#ffd938"
            stroke="#361800"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'sun-emblem':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <polygon
              key={deg}
              points="32,6 28,15 36,15"
              transform={`rotate(${deg} 32 32)`}
              fill="#ffd938"
              stroke="#361800"
              strokeWidth="1.8"
            />
          ))}
          <circle cx="32" cy="32" r="12" fill="#ffe25c" stroke="#361800" strokeWidth="2.5" />
        </svg>
      );

    case 'double-note':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M23 43 V17 L48 11 V38"
            fill="none"
            stroke="#361800"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M23 43 V17 L48 11 V38"
            fill="none"
            stroke="#ffd938"
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="18.5" cy="45" rx="7.5" ry="5.5" transform="rotate(-22 18.5 45)" fill="#ffd938" stroke="#361800" strokeWidth="2.2" />
          <ellipse cx="43.5" cy="39" rx="7.5" ry="5.5" transform="rotate(-22 43.5 39)" fill="#ffd938" stroke="#361800" strokeWidth="2.2" />
        </svg>
      );

    case 'korok-leaf':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M14 50 C14 26, 28 14, 52 12 C48 36, 36 48, 14 50 Z"
            fill="#66cf18"
            stroke="#133304"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path d="M16 48 Q32 32 48 16" fill="none" stroke="#245905" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );

    case 'ocarina-crest':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path
            d="M40 20 L38 11 L47 10 L49 18 C54 20, 56 29, 50 38 C42 48, 22 52, 12 44 C8 36, 20 21, 40 20 Z"
            fill="#ffd938"
            stroke="#361800"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <circle cx="26" cy="38" r="2.2" fill="#361800" />
          <circle cx="33" cy="33" r="2.2" fill="#361800" />
          <circle cx="40" cy="29" r="2.2" fill="#361800" />
        </svg>
      );

    case 'diamond-ice':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <polygon
            points="32,8 52,32 32,56 12,32"
            fill="#4ee6ff"
            stroke="#06265c"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <polygon points="32,12 46,32 32,32" fill="#d9fbff" opacity="0.7" />
        </svg>
      );
  }
}

function RupeeSvg({
  light,
  mid,
  dark,
  className,
}: {
  light: string;
  mid: string;
  dark: string;
  className: string;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <polygon points="32,7 48,19 48,45 32,57 16,45 16,19" fill={mid} stroke="#1d0d00" strokeWidth="2.8" strokeLinejoin="round" />
      <polygon points="32,9 46,20 39,26 32,21 25,26 18,20" fill={light} />
      <polygon points="32,55 46,44 39,38 32,43 25,38 18,44" fill={dark} />
    </svg>
  );
}

export function MiniOcarinaPositionPreviewSvg({
  ocarinaColorHex,
  markerX,
  markerY,
  className = 'w-full h-10',
}: {
  ocarinaColorHex: string;
  markerX: number;
  markerY: number;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 56" className={className} aria-hidden="true">
      {/* Pescoço do bocal */}
      <path
        d="M65 20 L63 8 C63 6.5 76 6.5 76 8 L78 21 Z"
        fill={ocarinaColorHex}
        stroke="#041038"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Silhueta principal da ocarina orientada como o modelo 3D (ponta à esquerda, bocal à direita) */}
      <path
        d="M11 40 C16 25, 36 16, 63 16 C82 16, 90 22, 87 32 C83 43, 62 49, 36 49 C20 49, 10 46, 11 40 Z"
        fill={ocarinaColorHex}
        stroke="#041038"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Realce superior sutil */}
      <path
        d="M23 30 C33 23, 47 20, 62 20"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.45"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Pequenos furos escuros dos dedos */}
      <circle cx="29" cy="36" r="2.2" fill="#031036" />
      <circle cx="38" cy="32" r="2.3" fill="#031036" />
      <circle cx="47" cy="29" r="2.2" fill="#031036" />
      <circle cx="56" cy="27.5" r="2.1" fill="#031036" />

      {/* Marcador dourado indicando a posição selecionada para o adesivo */}
      <g transform={`translate(${markerX}, ${markerY})`}>
        <polygon
          points="0,-7 -6,4 6,4"
          fill="#ffe44d"
          stroke="#2b1200"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <polygon
          points="-9,-2 -2,-1 -3,3"
          fill="#ffd128"
          stroke="#2b1200"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <polygon
          points="9,-2 2,-1 3,3"
          fill="#ffd128"
          stroke="#2b1200"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
