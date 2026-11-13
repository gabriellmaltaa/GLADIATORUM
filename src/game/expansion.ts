import type { GameItem, ExpeditionRegion, EquipmentSlotType } from './config';
import type { ItemIconId } from '../design/assets';
import type { RarityKey } from '../design/tokens';

export const COLLECTIONS: { id: string; name: string; level: number; rarity: RarityKey; origin: string }[] = [
  { id: 'capua', name: 'Recrutas de Cápua', level: 1, rarity: 'uncommon', origin: 'Armeiro do Fórum' },
  { id: 'vesuvius', name: 'Cinzas do Vesúvio', level: 3, rarity: 'rare', origin: 'Armeiro do Fórum' },
  { id: 'ostia', name: 'Corsários de Óstia', level: 5, rarity: 'epic', origin: 'Porto de Óstia' },
  { id: 'numidia', name: 'Sol da Numídia', level: 8, rarity: 'legendary', origin: 'Areias da Numídia' },
  { id: 'rhenus', name: 'Legião do Reno', level: 12, rarity: 'mythic', origin: 'Fronteira do Reno' },
  { id: 'olympus', name: 'Juramento dos Deuses', level: 18, rarity: 'divine', origin: 'Fronteira do Reno · guardião final' },
];
const slots: { slot: EquipmentSlotType; name: string; icon: ItemIconId }[] = [
  { slot: 'weapon', name: 'Gládio', icon: 'gladius_iron' },
  { slot: 'shield', name: 'Scutum', icon: 'scutum_legion' },
  { slot: 'helmet', name: 'Gálea', icon: 'galea_centurion' },
  { slot: 'armor', name: 'Lorica', icon: 'lorica_hamata' },
  { slot: 'gloves', name: 'Manica', icon: 'manica_iron' },
  { slot: 'boots', name: 'Ócreas', icon: 'ocrea_imperial' },
  { slot: 'ring', name: 'Sinete', icon: 'anulus_ruby' },
  { slot: 'amulet', name: 'Talismã', icon: 'bulla_jupiter' },
];
export const EXPANSION_ITEMS: Record<string, Omit<GameItem, 'id'>> = Object.fromEntries(
  COLLECTIONS.flatMap((collection, tier) => slots.map(({ slot, name, icon }, index) => {
    const id = `collection_${collection.id}_${slot}`;
    const power = tier + 1;
    const stats: GameItem['stats'] = slot === 'weapon'
      ? { damageMin: 4 + power * 3, damageMax: 8 + power * 5, strength: power * 2 }
      : slot === 'ring' ? { skill: power * 3, charisma: power * 2 }
      : slot === 'amulet' ? { intelligence: power * 3, healthBonus: power * 14 }
      : { armor: 12 + power * (slot === 'armor' ? 20 : 9), constitution: power, agility: index % 2 ? power : 0 };
    return [id, { templateId: id, name: `${name} · ${collection.name}`, slot,
      rarity: collection.rarity, levelReq: collection.level, buyPrice: 65 * power * power,
      sellPrice: 20 * power * power, iconId: ({
        weapon: ['gladius_iron', 'gladius_bronze', 'pugio_assassin', 'trident_neptune', 'spatha_imperial', 'spatha_imperial'],
        shield: ['scutum_wood', 'parma_bronze', 'scutum_legion', 'parma_bronze', 'aegis_praetorian', 'aegis_praetorian'],
        helmet: ['galea_recruit', 'galea_murmillo', 'galea_murmillo', 'galea_centurion', 'galea_centurion', 'galea_centurion'],
      } as Partial<Record<EquipmentSlotType, ItemIconId[]>>)[slot]?.[tier] ?? icon,
      description: `Coleção ${collection.name}. Origem: ${collection.origin}. ${slot === 'weapon' ? 'Equilíbrio entre impacto e força.' : slot === 'ring' ? 'Disciplina e precisão para a arena.' : slot === 'amulet' ? 'Conhecimento e resistência em longas jornadas.' : 'Proteção trabalhada para os desafios desta região.'}`,
      stats } satisfies Omit<GameItem, 'id'>];
  }))
);
const loot = (id: string) => slots.map(s => `collection_${id}_${s.slot}`);
export const EXPANSION_MARKET_IDS = [...loot('capua'), ...loot('vesuvius')];
export const EXPANSION_REGIONS: ExpeditionRegion[] = [
  { id: 'ostia_harbor', name: 'Porto de Óstia', subtitle: 'O preço do mar', minLevel: 5, energyCost: 2, durationSeconds: 30,
    ambientDescription: 'Galés silenciosas, contrabandistas e duelos nos cais. Recupere o arsenal dos corsários.', enemies: [] },
  { id: 'numidia_sands', name: 'Areias da Numídia', subtitle: 'Sob o sol de África', minLevel: 8, energyCost: 2, durationSeconds: 40,
    ambientDescription: 'Caravanas perdidas e guerreiros ligeiros guardam relíquias do deserto.', enemies: [] },
  { id: 'rhenus_frontier', name: 'Fronteira do Reno', subtitle: 'O último estandarte', minLevel: 12, energyCost: 3, durationSeconds: 50,
    ambientDescription: 'Além da névoa, uma legião desaparecida e um guardião do juramento divino.', enemies: [] },
].map((region, r) => ({ ...region, enemies: [0, 1, 2].map(i => {
  const level = region.minLevel + i * (r + 1);
  return { id: `${region.id}_${i}`, name: [ ['Saqueador do Cais', 'Capitão das Galés', 'Corsário do Tridente'],
    ['Caçador das Dunas', 'Guardião da Caravana', 'Rei do Sol'],
    ['Batedor da Névoa', 'Centurião Esquecido', 'Guardião do Juramento'] ][r][i],
    title: i === 2 ? 'Guardião regional' : 'Combatente de fronteira', level,
    avatarId: (i === 2 ? 'praetorian_boss' : r === 1 ? 'retiarius' : 'centurion') as 'centurion' | 'retiarius' | 'praetorian_boss',
    maxHp: 100 + level * 24, strength: 8 + level * 2, skill: 8 + level * 2, agility: 6 + level,
    constitution: 8 + level, charisma: 5 + level, armor: 25 + level * 13,
    damageMin: 5 + level * 2, damageMax: 10 + level * 3,
    goldMin: 25 + level * 12, goldMax: 40 + level * 17, xpReward: 25 + level * 18,
    dropChance: i === 2 ? 0.55 : 0.35,
    dropPool: loot(['ostia', 'numidia', 'rhenus'][r]).concat(r === 2 && i === 2 ? loot('olympus') : []),
  };
}) }));
