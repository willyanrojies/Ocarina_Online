export type OcarinaStickerId =
  | 'none'
  | 'triforce'
  | 'royal-crest'
  | 'music-note'
  | 'treble-clef'
  | 'pixel-heart'
  | 'fairy'
  | 'kokiri-emerald'
  | 'red-rupee'
  | 'blue-rupee'
  | 'green-rupee'
  | 'gold-star'
  | 'moon-crescent'
  | 'sun-emblem'
  | 'double-note'
  | 'korok-leaf'
  | 'ocarina-crest'
  | 'diamond-ice';

export type OcarinaStickerPositionId =
  | 'left-belly'
  | 'center-belly'
  | 'right-belly'
  | 'upper-tip';

export interface OcarinaColorOption {
  id: string;
  label: string;
  hex: string;
  rimHex: string;
}

export interface OcarinaStickerOption {
  id: OcarinaStickerId;
  label: string;
}

export interface OcarinaStickerPositionOption {
  id: OcarinaStickerPositionId;
  label: string;
  /** Origem X do raycast no espaço nativo de ocarina.glb */
  localX: number;
  /** Origem Y do raycast no espaço nativo de ocarina.glb */
  localY: number;
  /** Fator de profundidade/tamanho da caixa do decalque */
  surfaceNormalBias: number;
  /** Coordenadas do indicador na prévia SVG da mini ocarina (viewBox 0 0 100 56) */
  previewX: number;
  previewY: number;
}

export interface OcarinaCustomizationState {
  colorHex: string;
  stickerId: OcarinaStickerId;
  stickerPosition: OcarinaStickerPositionId;
  stickerScale: number;
  stickerRotationDeg: number;
}

export const MIN_STICKER_SCALE = 0.6;
export const MAX_STICKER_SCALE = 1.6;
export const STICKER_SCALE_STEP = 0.1;
export const STICKER_ROTATION_STEP_DEG = 15;

export const OCARINA_COLOR_OPTIONS: OcarinaColorOption[] = [
  { id: 'royal-blue', label: 'Azul Real', hex: '#1e30ee', rimHex: '#7fb3ff' },
  { id: 'emerald-green', label: 'Verde Esmeralda', hex: '#169c24', rimHex: '#7ef08a' },
  { id: 'crimson-red', label: 'Vermelho Rubi', hex: '#d91e24', rimHex: '#ff8a8e' },
  { id: 'mystic-purple', label: 'Roxo Místico', hex: '#8f24eb', rimHex: '#d29eff' },
  { id: 'solar-gold', label: 'Amarelo Dourado', hex: '#f2c216', rimHex: '#fff08a' },
  { id: 'pearl-white', label: 'Branco Pérola', hex: '#e6e4e0', rimHex: '#ffffff' },
  { id: 'obsidian-black', label: 'Preto Obsidiana', hex: '#282a30', rimHex: '#6c7282' },
  { id: 'sakura-pink', label: 'Rosa Flor', hex: '#ef7ea6', rimHex: '#ffc7dc' },
  { id: 'ice-cyan', label: 'Ciano Gelo', hex: '#1ad2f7', rimHex: '#a8f4ff' },
  { id: 'ember-orange', label: 'Laranja Fogo', hex: '#f06b14', rimHex: '#ffb982' },
  { id: 'midnight-indigo', label: 'Azul Noturno', hex: '#121c6e', rimHex: '#6578e0' },
];

export const OCARINA_STICKER_OPTIONS: OcarinaStickerOption[] = [
  { id: 'none', label: 'Sem adesivo' },
  { id: 'triforce', label: 'Triforce' },
  { id: 'royal-crest', label: 'Brasão Real' },
  { id: 'music-note', label: 'Nota Musical' },
  { id: 'treble-clef', label: 'Clave de Sol' },
  { id: 'pixel-heart', label: 'Coração' },
  { id: 'fairy', label: 'Fada Azul' },
  { id: 'kokiri-emerald', label: 'Espiral Kokiri' },
  { id: 'red-rupee', label: 'Rupia Vermelha' },
  { id: 'blue-rupee', label: 'Rupia Azul' },
  { id: 'green-rupee', label: 'Rupia Verde' },
  { id: 'gold-star', label: 'Estrela Dourada' },
  { id: 'moon-crescent', label: 'Lua Crescente' },
  { id: 'sun-emblem', label: 'Sol Dourado' },
  { id: 'double-note', label: 'Notas Duplas' },
  { id: 'korok-leaf', label: 'Folha da Floresta' },
  { id: 'ocarina-crest', label: 'Ocarina Dourada' },
  { id: 'diamond-ice', label: 'Cristal Celeste' },
];

export const OCARINA_STICKER_POSITIONS: OcarinaStickerPositionOption[] = [
  {
    id: 'left-belly',
    label: 'Centro-Esquerda',
    localX: -0.22,
    localY: -0.30,
    surfaceNormalBias: 0.008,
    previewX: 43,
    previewY: 36,
  },
  {
    id: 'center-belly',
    label: 'Centro',
    localX: 0.04,
    localY: -0.24,
    surfaceNormalBias: 0.008,
    previewX: 54,
    previewY: 35,
  },
  {
    id: 'right-belly',
    label: 'Direita',
    localX: 0.30,
    localY: -0.14,
    surfaceNormalBias: 0.008,
    previewX: 66,
    previewY: 32,
  },
  {
    id: 'upper-tip',
    label: 'Ponta Superior',
    localX: 0.46,
    localY: 0.08,
    surfaceNormalBias: 0.008,
    previewX: 73,
    previewY: 23,
  },
];

export const DEFAULT_STICKER_SCALE = 1.4;
export const DEFAULT_STICKER_ROTATION_DEG = 0;

export const DEFAULT_OCARINA_CUSTOMIZATION: OcarinaCustomizationState = {
  colorHex: '#1e30ee',
  stickerId: 'none',
  stickerPosition: 'center-belly',
  stickerScale: DEFAULT_STICKER_SCALE,
  stickerRotationDeg: DEFAULT_STICKER_ROTATION_DEG,
};

const STORAGE_KEY = 'ocarina-online:customization:v1';

export function getStickerPositionOption(id: OcarinaStickerPositionId): OcarinaStickerPositionOption {
  return (
    OCARINA_STICKER_POSITIONS.find((pos) => pos.id === id) ??
    OCARINA_STICKER_POSITIONS[1]
  );
}

export function sanitizeOcarinaCustomization(
  raw: Partial<OcarinaCustomizationState> | null | undefined,
): OcarinaCustomizationState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_OCARINA_CUSTOMIZATION };
  }
  const colorValid =
    typeof raw.colorHex === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.colorHex)
      ? raw.colorHex.toLowerCase()
      : DEFAULT_OCARINA_CUSTOMIZATION.colorHex;
  const stickerValid = OCARINA_STICKER_OPTIONS.some((s) => s.id === raw.stickerId)
    ? (raw.stickerId as OcarinaStickerId)
    : DEFAULT_OCARINA_CUSTOMIZATION.stickerId;
  const posValid = OCARINA_STICKER_POSITIONS.some((p) => p.id === raw.stickerPosition)
    ? (raw.stickerPosition as OcarinaStickerPositionId)
    : DEFAULT_OCARINA_CUSTOMIZATION.stickerPosition;

  return {
    colorHex: colorValid,
    stickerId: stickerValid,
    stickerPosition: posValid,
    stickerScale: DEFAULT_STICKER_SCALE,
    stickerRotationDeg: DEFAULT_STICKER_ROTATION_DEG,
  };
}

export function loadSavedOcarinaCustomization(): OcarinaCustomizationState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_OCARINA_CUSTOMIZATION };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OCARINA_CUSTOMIZATION };
    return sanitizeOcarinaCustomization(JSON.parse(raw) as Partial<OcarinaCustomizationState>);
  } catch {
    return { ...DEFAULT_OCARINA_CUSTOMIZATION };
  }
}

export function saveOcarinaCustomization(state: OcarinaCustomizationState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeOcarinaCustomization(state)));
  } catch {
    // Ignora erros de cota de armazenamento em iframes restritos
  }
}
