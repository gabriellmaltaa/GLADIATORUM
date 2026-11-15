export const LAYOUT_CARD_IDS = ['objective', 'avatar', 'stats'] as const;
export type LayoutCardId = (typeof LAYOUT_CARD_IDS)[number];
export type LayoutPreset = 'classic' | 'compact' | 'immersive';
export interface LayoutPreferences {
  preset: LayoutPreset;
  order: LayoutCardId[];
  hiddenCards: LayoutCardId[];
}
export const DEFAULT_LAYOUT_PREFERENCES: LayoutPreferences = {
  preset: 'classic', order: [...LAYOUT_CARD_IDS], hiddenCards: [],
};

export function createLayoutPreset(preset: LayoutPreset): LayoutPreferences {
  if (preset === 'compact') return { preset, order: ['avatar', 'objective', 'stats'], hiddenCards: [] };
  if (preset === 'immersive') return { preset, order: ['avatar', 'stats', 'objective'], hiddenCards: [] };
  return { ...DEFAULT_LAYOUT_PREFERENCES, order: [...DEFAULT_LAYOUT_PREFERENCES.order], hiddenCards: [] };
}

export function normalizeLayoutPreferences(value: unknown): LayoutPreferences {
  if (!value || typeof value !== 'object') return createLayoutPreset('classic');
  const input = value as Record<string, unknown>;
  const preset: LayoutPreset = ['classic', 'compact', 'immersive'].includes(String(input.preset)) ? input.preset as LayoutPreset : 'classic';
  const base = createLayoutPreset(preset);
  const order = Array.isArray(input.order) ? input.order.filter((id): id is LayoutCardId => LAYOUT_CARD_IDS.includes(id as LayoutCardId)) : [];
  const hiddenCards = Array.isArray(input.hiddenCards) ? [...new Set(input.hiddenCards.filter((id): id is LayoutCardId => LAYOUT_CARD_IDS.includes(id as LayoutCardId)))] : [];
  return { preset, order: [...new Set([...order, ...base.order])], hiddenCards };
}
