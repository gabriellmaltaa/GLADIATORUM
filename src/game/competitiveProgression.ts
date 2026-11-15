import type { GameItem } from './config.ts';

const NOBILITY_TITLES = [
  'Cavaleiro',
  'Patrício',
  'Tribuno',
  'Questor',
  'Edil',
  'Pretor',
  'Cônsul',
  'Procônsul',
  'Censor',
  'Senador',
  'Príncipe do Senado',
  'Legado Imperial',
  'César',
  'Imperator',
  'Augusto',
] as const;

export function getCompetitiveTitle(level: number, honorRank: number | null): string {
  if (honorRank === 1) return 'Augusto Supremo do Coliseu';
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  const milestone = Math.min(NOBILITY_TITLES.length, Math.floor(safeLevel / 10));
  return milestone > 0 ? NOBILITY_TITLES[milestone - 1] : 'Gladiador de Cápua';
}

export type ItemAffixId = 'precise' | 'cruel' | 'swift';

const AFFIX_PREFIX: Record<ItemAffixId, string> = {
  precise: 'Preciso',
  cruel: 'Cruel',
  swift: 'Veloz',
};

/** Sorteia um afixo no servidor. O RNG é injetável apenas para testes; o chamador valida a chance. */
export function rollEquipmentAffix<T extends GameItem>(item: T, random: () => number = Math.random): T {
  if (item.affix) return item;
  const sample = Math.min(0.999999999, Math.max(0, random()));
  const segment = Math.min(2, Math.floor(sample * 3));
  const id: ItemAffixId = segment === 0 ? 'precise' : segment === 1 ? 'cruel' : 'swift';
  const localRoll = sample * 3 - segment;
  const amount = 1 + Math.floor(localRoll * (id === 'swift' ? 4 : 3));
  const stats = { ...item.stats };
  if (id === 'precise') stats.critChancePercent = amount;
  if (id === 'cruel') {
    stats.damageMin = (stats.damageMin ?? 0) + amount;
    stats.damageMax = (stats.damageMax ?? 0) + amount;
  }
  if (id === 'swift') stats.agility = (stats.agility ?? 0) + amount;
  return {
    ...item,
    name: `${AFFIX_PREFIX[id]} ${item.name}`,
    description: `${item.description} Afixo: ${AFFIX_PREFIX[id]}.`,
    affix: id,
    stats,
  };
}

export const ITEM_AFFIX_CHANCES = {
  expedition: 0.08,
  dungeon: 0.08,
  arena: 0.12,
  guildWar: 0.2,
} as const;

export function maybeAffixItem<T extends GameItem>(
  item: T,
  chance: number,
  random: () => number = Math.random
): T {
  if (item.affix || random() >= Math.max(0, Math.min(1, chance))) return item;
  return rollEquipmentAffix(item, random);
}

export function getAffixChanceForRarity(baseChance: number, rarity: string): number {
  const multiplier = /common|comum|uncommon|incomum/i.test(rarity) ? 1 : 1.75;
  return Math.min(0.35, baseChance * multiplier);
}

