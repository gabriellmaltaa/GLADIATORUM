import type { EquipmentSlotType, GameItem } from './config.ts';

export type EquippedAppearance = Partial<Record<EquipmentSlotType, GameItem>>;
const slots: EquipmentSlotType[] = ['helmet', 'armor', 'gloves', 'boots', 'weapon', 'shield', 'ring', 'amulet'];

/** Presentation only: never changes equipment, stats or persisted progression. */
export function getCharacterAppearance(equipped: EquippedAppearance, level: number) {
  const layers: EquippedAppearance = {};
  for (const slot of slots) {
    const item = equipped[slot];
    if (item && item.slot === slot && !item.consumable) layers[slot] = item;
  }
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  const strength = Math.min(1, (safeLevel - 1) / 49);
  const tier = safeLevel >= 50 ? 5 : safeLevel >= 35 ? 4 : safeLevel >= 20 ? 3 : safeLevel >= 10 ? 2 : safeLevel >= 5 ? 1 : 0;
  const colors = ['#be9b68', '#e0a04d', '#64bfff', '#bd88fa', '#ffd46c', '#fff0bd'];
  const names = ['Tênue', 'Bronze', 'Celeste', 'Arcana', 'Imperial', 'Solar'];
  return { layers, aura: { strength, tier, color: colors[tier], label: strength === 0 ? 'Sem aura' : `Aura ${names[tier]}` } };
}
