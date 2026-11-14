import type { GameItem, ExpeditionRegion, EquipmentSlotType, StatBonuses } from './config';
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

export const ENDGAME_TIERS = [
  { rarity: 'celestial', level: 20, power: 7, name: 'Celeste' },
  { rarity: 'astral', level: 30, power: 8, name: 'Astral' },
  { rarity: 'primordial', level: 40, power: 9, name: 'Primordial' },
  { rarity: 'transcendent', level: 50, power: 10, name: 'Transcendente' },
] as const;

function getEndgameStats(slot: EquipmentSlotType, power: number): StatBonuses {
  switch (slot) {
    case 'weapon':
      return { damageMin: 4 + power * 3, damageMax: 8 + power * 5, strength: power * 2 };
    case 'shield':
      return { armor: 12 + power * 9, constitution: power * 2, strength: power };
    case 'helmet':
      return { armor: 12 + power * 9, agility: power, constitution: power };
    case 'armor':
      return { armor: 12 + power * 20, constitution: power * 2, strength: power, healthBonus: power * 14 };
    case 'gloves':
      return { armor: 12 + power * 9, strength: power, skill: power * 2 };
    case 'boots':
      return { armor: 12 + power * 9, agility: power * 2, constitution: power };
    case 'ring':
      return { strength: power * 2, skill: power * 3, charisma: power * 2 };
    case 'amulet':
      return { intelligence: power * 3, healthBonus: power * 14, constitution: power };
  }
}

export const ENDGAME_ITEMS: Record<string, Omit<GameItem, 'id'>> = Object.fromEntries(
  ENDGAME_TIERS.flatMap((tier) => slots.map((slot) => {
    const templateId = `endgame_${tier.rarity}_${slot.slot}`;
    const multiplier = tier.level / 20;
    return [templateId, {
      templateId,
      name: `${slot.name} ${tier.name}`,
      slot: slot.slot,
      rarity: tier.rarity,
      levelReq: tier.level,
      buyPrice: Math.round(2500 * multiplier * multiplier),
      sellPrice: Math.round(1000 * multiplier * multiplier),
      iconId: slot.icon,
      description: `Peça do Arsenal ${tier.name}, forjada para os desafios de nível ${tier.level}. Encontrada nas expedições da sua faixa.`,
      stats: getEndgameStats(slot.slot, tier.power),
    } satisfies Omit<GameItem, 'id'>];
  }))
);

function getMaxForgeIncrease(stat: keyof StatBonuses): number {
  if (stat === 'armor') return 50;
  if (stat === 'healthBonus') return 100;
  return 10;
}

export const OBSIDIAN_ITEMS: Record<string, Omit<GameItem, 'id'>> = Object.fromEntries(
  slots.map((slot) => {
    const templateId = `obsidian_${slot.slot}`;
    const transcendentId = `endgame_transcendent_${slot.slot}`;
    const transcendent = ENDGAME_ITEMS[transcendentId];
    const stats: StatBonuses = Object.fromEntries(
      Object.entries(transcendent.stats).map(([stat, value]) => [
        stat,
        (value ?? 0) + getMaxForgeIncrease(stat as keyof StatBonuses) + 1,
      ])
    );
    return [templateId, {
      templateId,
      name: `${slot.name} do Eclipse Obsidiano`,
      slot: slot.slot,
      rarity: 'obsidian',
      levelReq: 50,
      buyPrice: 0,
      sellPrice: 25000,
      iconId: slot.icon,
      description: 'Relíquia secreta encontrada apenas no confronto final. Sua placa negra guarda um poder que supera qualquer arsenal comum.',
      stats,
    } satisfies Omit<GameItem, 'id'>];
  })
);

export const OBSIDIAN_TO_TRANSCENDENT: Record<string, string> = Object.fromEntries(
  slots.map((slot) => [`obsidian_${slot.slot}`, `endgame_transcendent_${slot.slot}`])
);

export function isRarityDiscovered(rarity: RarityKey, discoveredTemplates: readonly string[] = []): boolean {
  if (rarity !== 'obsidian') return true;
  return discoveredTemplates.some((templateId) => Object.hasOwn(OBSIDIAN_ITEMS, templateId));
}

export function getItemsVisibleByDiscovery<T extends Pick<GameItem, 'rarity' | 'templateId'>>(
  items: readonly T[],
  discoveredTemplates: readonly string[] = []
): T[] {
  return items.filter((item) => isRarityDiscovered(item.rarity, discoveredTemplates));
}

const ENDGAME_REGION_DEFS = [
  { id: 'dacian_limes', name: 'Limes da Dácia', subtitle: 'A fronteira de ferro', minLevel: 20, rarity: 'celestial', theme: 'as montanhas da Dácia e suas legiões rebeldes' },
  { id: 'parthian_kingdom', name: 'Reino Parta', subtitle: 'Flechas além do horizonte', minLevel: 30, rarity: 'astral', theme: 'as rotas de seda guardadas por arqueiros montados' },
  { id: 'carthage_walls', name: 'Muralhas de Cartago', subtitle: 'Cinzas do antigo império', minLevel: 40, rarity: 'primordial', theme: 'os portões de pedra defendidos por veteranos cartagineses' },
  { id: 'hades_gates', name: 'Portões de Hades', subtitle: 'A última descida', minLevel: 50, rarity: 'transcendent', theme: 'as catacumbas sob Roma, onde repousa o guardião final' },
  { id: 'eternal_forge', name: 'Forja Eterna de Vulcano', subtitle: 'O aço que atravessa os séculos', minLevel: 60, rarity: 'transcendent', theme: 'as fornalhas divinas de Vulcano, onde o fogo nunca se apaga' },
  { id: 'sibyl_oracle', name: 'Oráculo das Sete Sibilas', subtitle: 'Profecias escritas em bronze', minLevel: 70, rarity: 'transcendent', theme: 'as câmaras proféticas guardadas pelas sete vozes de Roma' },
  { id: 'titanic_causeway', name: 'Calçada dos Titãs', subtitle: 'Passos que abalam o Lácio', minLevel: 80, rarity: 'transcendent', theme: 'a estrada colossal construída pelos Titãs antes da fundação de Roma' },
  { id: 'void_adriatic', name: 'Fenda do Adriático', subtitle: 'Além das águas conhecidas', minLevel: 90, rarity: 'transcendent', theme: 'as fortalezas submersas onde os antigos mapas terminam' },
  { id: 'styx_delta', name: 'Delta Sombrio do Estige', subtitle: 'A travessia dos imortais', minLevel: 100, rarity: 'transcendent', theme: 'o delta escuro do Estige, patrulhado pelos remadores de Caronte' },
  { id: 'hercules_west', name: 'Colunas de Hércules', subtitle: 'O limite do mundo romano', minLevel: 110, rarity: 'transcendent', theme: 'as colunas no extremo ocidente, além das rotas de Hércules' },
  { id: 'saturn_golden_age', name: 'Jardins da Era Dourada', subtitle: 'O domínio de Saturno', minLevel: 120, rarity: 'transcendent', theme: 'os jardins de Saturno, suspensos no tempo antes da guerra dos deuses' },
  { id: 'ages_colosseum', name: 'Coliseu das Eras', subtitle: 'Todos os campeões em uma arena', minLevel: 130, rarity: 'transcendent', theme: 'a arena que reúne gladiadores de todas as eras de Roma' },
  { id: 'romulus_pinnacle', name: 'Cume de Rômulo', subtitle: 'O juramento do fundador', minLevel: 140, rarity: 'transcendent', theme: 'o primeiro palácio de Rômulo, reconstruído no topo do mundo' },
  { id: 'ludus_aeternus', name: 'Ludus Aeternus', subtitle: 'O último desafio', minLevel: 150, rarity: 'transcendent', theme: 'a arena final, onde cada campeão enfrenta o legado de Roma' },
] as const;

export const ENDGAME_REGIONS: ExpeditionRegion[] = ENDGAME_REGION_DEFS.map((region, regionIndex) => {
  const dropPool = Object.values(ENDGAME_ITEMS)
    .filter((item) => item.rarity === region.rarity)
    .map((item) => item.templateId);
  return {
    id: region.id,
    name: region.name,
    subtitle: region.subtitle,
    minLevel: region.minLevel,
    energyCost: 3,
    durationSeconds: 45 + regionIndex * 10,
    ambientDescription: `Explore ${region.theme} e recupere o arsenal da região.`,
    enemies: [0, 1, 2].map((index) => {
      const level = regionIndex < 4
        ? region.minLevel + index * 2
        : region.minLevel - 2 + index;
      const isBoss = index === 2;
      const enemyNames = [
        ['Batedor Dácio', 'Centurião da Montanha', 'Rei dos Limes'],
        ['Lanceiro Parta', 'Arqueiro do Sol', 'Xá das Rotas'],
        ['Legionário Cartaginês', 'Campeão de Baal', 'Colosso das Muralhas'],
        ['Guardião das Catacumbas', 'Arauto do Submundo', 'Guardião de Hades'],
      ][regionIndex] ?? [
        `Vigia de ${region.name}`,
        `Campeão de ${region.name}`,
        `Guardião de ${region.name}`,
      ];
      return {
        id: `${region.id}_${index}`,
        name: enemyNames[index],
        title: isBoss ? 'Chefe Regional' : 'Veterano de Fronteira',
        level,
        avatarId: (isBoss ? 'praetorian_boss' : regionIndex === 1 ? 'retiarius' : 'centurion') as 'centurion' | 'retiarius' | 'praetorian_boss',
        maxHp: 160 + level * 34,
        strength: 10 + level * 2,
        skill: 10 + level * 2,
        agility: 8 + level,
        constitution: 10 + level,
        charisma: 8 + level,
        armor: 30 + level * 14,
        damageMin: 8 + level * 2,
        damageMax: 13 + level * 3,
        goldMin: 80 + level * 12,
        goldMax: 120 + level * 16,
        xpReward: 300 + level * 30,
        dropChance: isBoss ? 0.65 : 0.4,
        dropPool,
        ...(regionIndex >= 3 && isBoss
          ? {
              specialDropChance: 0.001 + Math.max(0, region.minLevel - 50) / 100_000,
              specialDropPool: Object.keys(OBSIDIAN_ITEMS),
            }
          : {}),
      };
    }),
  };
});

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
