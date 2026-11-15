import type { EquipmentSlotType, GameItem } from './config.ts';
import { normalizeHeroAppearance, type HeroAppearance } from './heroCustomization.ts';

export type EquippedAppearance = Partial<Record<EquipmentSlotType, GameItem>>;
const slots: EquipmentSlotType[] = ['helmet', 'armor', 'gloves', 'boots', 'weapon', 'shield', 'ring', 'amulet'];

/** Presentation only: never changes equipment, stats or persisted progression. */
export function getCharacterAppearance(equipped: EquippedAppearance, level: number, hero?: HeroAppearance) {
  const layers: EquippedAppearance = {};
  for (const slot of slots) {
    const item = equipped[slot];
    if (item && item.slot === slot && !item.consumable) layers[slot] = item;
  }
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  const strength = Math.min(1, (safeLevel - 1) / 149);
  const tier = safeLevel >= 150 ? 9 : safeLevel >= 125 ? 8 : safeLevel >= 100 ? 7 : safeLevel >= 75 ? 6 : safeLevel >= 50 ? 5 : safeLevel >= 35 ? 4 : safeLevel >= 20 ? 3 : safeLevel >= 10 ? 2 : safeLevel >= 5 ? 1 : 0;
  const colors = ['#be9b68', '#e0a04d', '#64bfff', '#bd88fa', '#ffd46c', '#fff0bd', '#73e0d2', '#a4b5ff', '#ff9e73', '#f5d9e2'];
  const normalizedHero = normalizeHeroAppearance(hero);
  const energyColors = { cyan: '#54dcff', violet: '#bd8cff', amber: '#ffbd65', crimson: '#ff667f', jade: '#69e7ba' };
  const paletteColors = { cyan: '#54dcff', violet: '#bd8cff', amber: '#ffbd65', crimson: '#ff667f', jade: '#69e7ba' };
  const names = ['Tênue', 'Bronze', 'Celeste', 'Arcana', 'Imperial', 'Solar', 'Astral', 'Eterno', 'Divino', 'Obsidiano'];
  const legacyBodyColumn = !layers.armor ? 0 : layers.armor.iconId === 'lorica_leather' ? 1 : layers.armor.iconId === 'lorica_hamata' ? 3 : 2;
  const heroColumns = { sentinel: 0, weaver: 1, vanguard: 2, oracle: 3 };
  const bodyColumn = hero ? heroColumns[normalizedHero.archetype] : legacyBodyColumn;
  const color = energyColors[normalizedHero.energy];
  return { layers, bodyColumn, paletteColor: paletteColors[normalizedHero.palette], mask: normalizedHero.mask,
    aura: { strength, tier, color: hero ? color : colors[tier], label: strength === 0 ? 'Energia latente' : `Energia ${names[tier]}` } };
}
