export type CharacterId = 'gohan' | 'pablo' | 'killer';

export type RearSlotId = 'fisher' | 'killer';

export type ScenarioSlotId = 'ocarina' | RearSlotId;

export type CharacterSlotMap = Record<ScenarioSlotId, CharacterId>;

export interface CharacterMeta {
  id: CharacterId;
  name: string;
  modelUrl: string;
  hasPlayingFaceOverlay: boolean;
}

export const CHARACTER_METADATA: Record<CharacterId, CharacterMeta> = {
  gohan: {
    id: 'gohan',
    name: 'Gohan',
    modelUrl: '/models/pessonagem.glb',
    hasPlayingFaceOverlay: true,
  },
  pablo: {
    id: 'pablo',
    name: 'Pablo',
    modelUrl: '/models/pablo.glb',
    hasPlayingFaceOverlay: true,
  },
  killer: {
    id: 'killer',
    name: 'Killer',
    modelUrl: '/models/killer.glb',
    hasPlayingFaceOverlay: true,
  },
};

export const INITIAL_CHARACTER_SLOTS: CharacterSlotMap = {
  ocarina: 'gohan',
  fisher: 'pablo',
  killer: 'killer',
};

/**
 * Troca quem está tocando a ocarina em primeiro plano (posição 'ocarina')
 * pelo personagem sentado na posição de fundo escolhida ('fisher' ou 'killer').
 */
export function swapOcarinaCharacterWithSlot(
  slots: CharacterSlotMap,
  rearSlot: RearSlotId,
): CharacterSlotMap {
  if (slots.ocarina === slots[rearSlot]) {
    return { ...slots };
  }
  return {
    ...slots,
    ocarina: slots[rearSlot],
    [rearSlot]: slots.ocarina,
  };
}
