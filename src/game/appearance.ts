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
  const strength = Math.min(1, (safeLevel - 1) / 149);
  const tier = safeLevel >= 150 ? 9 : safeLevel >= 125 ? 8 : safeLevel >= 100 ? 7 : safeLevel >= 75 ? 6 : safeLevel >= 50 ? 5 : safeLevel >= 35 ? 4 : safeLevel >= 20 ? 3 : safeLevel >= 10 ? 2 : safeLevel >= 5 ? 1 : 0;
  const colors = ['#be9b68', '#e0a04d', '#64bfff', '#bd88fa', '#ffd46c', '#fff0bd', '#73e0d2', '#a4b5ff', '#ff9e73', '#f5d9e2'];
  const names = ['Tênue', 'Bronze', 'Celeste', 'Arcana', 'Imperial', 'Solar', 'Astral', 'Eterno', 'Divino', 'Obsidiano'];
  const bodyColumn = !layers.armor ? 0 : layers.armor.iconId === 'lorica_leather' ? 1 : layers.armor.iconId === 'lorica_hamata' ? 3 : 2;
  return { layers, bodyColumn, aura: { strength, tier, color: colors[tier], label: strength === 0 ? 'Sem aura' : `Aura ${names[tier]}` } };
}
