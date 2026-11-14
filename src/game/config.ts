import type { RarityKey } from '../design/tokens.ts';
import { EXPANSION_ITEMS, EXPANSION_REGIONS, EXPANSION_MARKET_IDS } from './expansion.ts';
import type { EnemyAvatarId, ItemIconId } from '../design/assets.tsx';
import {
  EXPANDED_EQUIPMENT_TEMPLATES,
  GENERATED_DUNGEONS,
  MEDICAL_TREATMENTS,
  MEDICINE_ITEM_TEMPLATES,
} from './dungeonsAndMedicine.ts';

/**
 * CONFIGURAÇÕES CENTRALIZADAS DO JOGO
 * Separação rigorosa entre dados/regras de balanceamento e camada de interface.
 */

export type EquipmentSlotType =
  | 'helmet'
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'gloves'
  | 'boots'
  | 'ring'
  | 'amulet';

export type PrimaryStatKey =
  | 'strength'
  | 'skill'
  | 'agility'
  | 'constitution'
  | 'charisma'
  | 'intelligence';

export type ForgeStatKey = 'damage' | PrimaryStatKey | 'armor' | 'healthBonus';

export type IdleFocusMode = 'gold' | 'xp' | 'loot';

export interface IdleFocusDefinition {
  id: IdleFocusMode;
  label: string;
  shortTag: string;
  description: string;
  goldMultiplier: number;
  xpMultiplier: number;
  dropChanceMultiplier: number;
}

export const IDLE_FOCUS_DEFINITIONS: Record<IdleFocusMode, IdleFocusDefinition> = {
  gold: {
    id: 'gold',
    label: 'Saque de Denários',
    shortTag: '+35% Ouro',
    description: 'Prioriza pilhagem de moedas e tributos (+35% Ouro, -15% XP).',
    goldMultiplier: 1.35,
    xpMultiplier: 0.85,
    dropChanceMultiplier: 1.0,
  },
  xp: {
    id: 'xp',
    label: 'Instrução de Combate',
    shortTag: '+35% XP',
    description: 'Prioriza manobras marciais para subir de nível (+35% XP, -15% Ouro).',
    goldMultiplier: 0.85,
    xpMultiplier: 1.35,
    dropChanceMultiplier: 1.0,
  },
  loot: {
    id: 'loot',
    label: 'Caça a Equipamentos',
    shortTag: '+50% Espólios',
    description: 'Vasculha arsenais inimigos em busca de armas e armaduras (+50% chance de item).',
    goldMultiplier: 0.9,
    xpMultiplier: 0.9,
    dropChanceMultiplier: 1.5,
  },
};

export interface StatBonuses {
  strength?: number;
  skill?: number;
  agility?: number;
  constitution?: number;
  charisma?: number;
  intelligence?: number;
  armor?: number;
  damageMin?: number;
  damageMax?: number;
  healthBonus?: number;
}

export interface ConsumableEffect {
  healHp: number;
  healPercent?: number;
  restoreEnergy: number;
}

export interface GameItem {
  id: string;
  templateId: string;
  name: string;
  slot: EquipmentSlotType;
  rarity: RarityKey;
  levelReq: number;
  buyPrice: number;
  sellPrice: number;
  iconId: ItemIconId;
  description: string;
  stats: StatBonuses;
  forgeLevel?: number;
  consumable?: ConsumableEffect;
}

export interface MedicalTreatmentDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  iconId: ItemIconId;
  minLevel: number;
  baseGoldCost: number;
  costPerLevel: number;
  healPercent: number;
  restoreEnergy: number;
}

export type DungeonDifficulty =
  | 'Iniciante'
  | 'Veterano'
  | 'Elite'
  | 'Mestre'
  | 'Pesadelo'
  | 'Abissal'
  | 'Divino';

export interface EnemyDefinition {
  id: string;
  name: string;
  title: string;
  level: number;
  avatarId: EnemyAvatarId;
  maxHp: number;
  strength: number;
  skill: number;
  agility: number;
  constitution: number;
  charisma: number;
  armor: number;
  damageMin: number;
  damageMax: number;
  goldMin: number;
  goldMax: number;
  xpReward: number;
  dropChance: number; // 0 to 1
  dropPool: string[]; // templateIds
}

export interface ExpeditionRegion {
  id: string;
  name: string;
  subtitle: string;
  minLevel: number;
  energyCost: number;
  durationSeconds: number;
  ambientDescription: string;
  enemies: EnemyDefinition[];
}

export interface DungeonDefinition {
  id: string;
  name: string;
  subtitle: string;
  difficulty?: DungeonDifficulty;
  minLevel: number;
  energyCost: number;
  description: string;
  encounters: EnemyDefinition[];
  completionBonusGold: number;
  completionBonusXp: number;
  guaranteedDropPool: string[];
}

export const GAME_CONFIG = {
  saveKey: 'gladiatorum_public_launch_2026_11_12', // Novo início público autorizado pelo criador.
  backupCorruptedKey: 'gladiatorum_arena_aeterna_corrupted_backup',
  saveVersion: 4,
  maxOfflineSeconds: 8 * 3600, // Limite inicial de 8 horas (28.800 segundos)
  maxInventorySlots: 20,
  baseMaxEnergy: 12,
  energyRegenIntervalSeconds: 180, // +1 ponto de energia a cada 3 minutos
  hpRegenPerMinute: 12,
  defeatMinHpPercent: 0.15,
  forge: {
    maxItemLevel: 10,
    baseUpgradeCost: 100,
    costMultiplier: 1.5,
    damagePerUpgrade: 1,
    primaryStatPerUpgrade: 1,
    armorPerUpgrade: 5,
    healthBonusPerUpgrade: 10,
  },
} as const;

export const FORGE_STAT_META: Record<ForgeStatKey, { label: string; description: string }> = {
  damage: { label: 'Dano', description: '+1 dano mínimo e máximo' },
  strength: { label: 'Força', description: '+1 Força' },
  skill: { label: 'Habilidade', description: '+1 Habilidade' },
  agility: { label: 'Agilidade', description: '+1 Agilidade' },
  constitution: { label: 'Constituição', description: '+1 Constituição' },
  charisma: { label: 'Carisma', description: '+1 Carisma' },
  intelligence: { label: 'Inteligência', description: '+1 Inteligência' },
  armor: { label: 'Armadura', description: '+5 Armadura' },
  healthBonus: { label: 'Vida bônus', description: '+10 PV máximos' },
};

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlotType, string> = {
  helmet: 'Elmo',
  weapon: 'Arma',
  armor: 'Couraça',
  shield: 'Escudo',
  gloves: 'Manoplas',
  boots: 'Grevas',
  ring: 'Anel',
  amulet: 'Amuleto',
};

export const PRIMARY_STAT_META: Record<
  PrimaryStatKey,
  { label: string; shortLabel: string; description: string }
> = {
  strength: {
    label: 'Força',
    shortLabel: 'FOR',
    description: 'Aumenta o dano físico causado (+1 Dano Mín/Máx a cada 3 pontos) e penetração de impacto.',
  },
  skill: {
    label: 'Habilidade',
    shortLabel: 'HAB',
    description: 'Aumenta a precisão de ataque e a chance de golpe crítico na arena e expedições.',
  },
  agility: {
    label: 'Agilidade',
    shortLabel: 'AGI',
    description: 'Reduz a chance de ser atingido pelo inimigo e melhora a defesa evasiva.',
  },
  constitution: {
    label: 'Constituição',
    shortLabel: 'CON',
    description: 'Aumenta a Vida Máxima (+12 PV por ponto) e a regeneração natural no quartel.',
  },
  charisma: {
    label: 'Carisma',
    shortLabel: 'CAR',
    description: 'Inspira temor na arena, concedendo iniciativa de ataque duplo e prestígio.',
  },
  intelligence: {
    label: 'Inteligência',
    shortLabel: 'INT',
    description: 'Amplia o aprendizado tático (+2% de Experiência em combates e melhor cura).',
  },
};

export function getXpForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.round(100 * Math.pow(safeLevel, 1.45));
}

export function getTrainingCost(stat: PrimaryStatKey, currentBaseValue: number): number {
  const baseFactor: Record<PrimaryStatKey, number> = {
    strength: 18,
    skill: 20,
    agility: 19,
    constitution: 16,
    charisma: 17,
    intelligence: 15,
  };
  const stepsAboveBase = Math.max(0, currentBaseValue - 5);
  return Math.round(baseFactor[stat] * Math.pow(1.22, stepsAboveBase) + stepsAboveBase * 8);
}

export const ITEM_TEMPLATES: Record<string, Omit<GameItem, 'id'>> = {
  gladius_recruit: {
    templateId: 'gladius_recruit',
    name: 'Gládio de Ferro do Recruta',
    slot: 'weapon',
    rarity: 'common',
    levelReq: 1,
    buyPrice: 45,
    sellPrice: 18,
    iconId: 'gladius_iron',
    description: 'Espada curta padrão forjada para iniciantes do Ludus de Cápua.',
    stats: { damageMin: 4, damageMax: 7, strength: 1 },
  },
  scutum_oak: {
    templateId: 'scutum_oak',
    name: 'Scutum de Carvalho Reforçado',
    slot: 'shield',
    rarity: 'common',
    levelReq: 1,
    buyPrice: 40,
    sellPrice: 16,
    iconId: 'scutum_wood',
    description: 'Escudo curvo de madeira revestido em couro cru com umbo de ferro.',
    stats: { armor: 28, constitution: 1 },
  },
  galea_recruit: {
    templateId: 'galea_recruit',
    name: 'Gálea de Bronze Simples',
    slot: 'helmet',
    rarity: 'common',
    levelReq: 1,
    buyPrice: 38,
    sellPrice: 15,
    iconId: 'galea_recruit',
    description: 'Elmo aberto que protege o crânio sem limitar a visão periférica.',
    stats: { armor: 18, agility: 1 },
  },
  lorica_leather_vest: {
    templateId: 'lorica_leather_vest',
    name: 'Subarmalis de Couro Batido',
    slot: 'armor',
    rarity: 'common',
    levelReq: 1,
    buyPrice: 52,
    sellPrice: 20,
    iconId: 'lorica_leather',
    description: 'Túnica acolchoada com tiras de couro endurecido em óleo.',
    stats: { armor: 34, constitution: 2 },
  },
  manica_leather_wrap: {
    templateId: 'manica_leather_wrap',
    name: 'Manica de Tiras de Couro',
    slot: 'gloves',
    rarity: 'common',
    levelReq: 1,
    buyPrice: 30,
    sellPrice: 12,
    iconId: 'manica_leather',
    description: 'Proteção articulada para o braço de espada.',
    stats: { armor: 14, skill: 2 },
  },
  caligae_march: {
    templateId: 'caligae_march',
    name: 'Cáligas Pregueadas da Via Ápia',
    slot: 'boots',
    rarity: 'common',
    levelReq: 1,
    buyPrice: 32,
    sellPrice: 13,
    iconId: 'caligae_leather',
    description: 'Sandálias militares com solado cravado em ferro para terreno firme.',
    stats: { armor: 14, agility: 2 },
  },
  gladius_bronze_hispania: {
    templateId: 'gladius_bronze_hispania',
    name: 'Gládio Hispânico Temperado',
    slot: 'weapon',
    rarity: 'uncommon',
    levelReq: 2,
    buyPrice: 115,
    sellPrice: 46,
    iconId: 'gladius_bronze',
    description: 'Lâmina perfeitamente equilibrada para estocadas rápidas entre escudos.',
    stats: { damageMin: 7, damageMax: 12, strength: 3, skill: 2 },
  },
  parma_eques: {
    templateId: 'parma_eques',
    name: 'Parma de Bronze Gravada',
    slot: 'shield',
    rarity: 'uncommon',
    levelReq: 2,
    buyPrice: 105,
    sellPrice: 42,
    iconId: 'parma_bronze',
    description: 'Escudo circular leve usado por gladiadores Equites e Velites.',
    stats: { armor: 46, agility: 3, skill: 1 },
  },
  galea_murmillo_crest: {
    templateId: 'galea_murmillo_crest',
    name: 'Elmo Cristado de Murmillo',
    slot: 'helmet',
    rarity: 'uncommon',
    levelReq: 2,
    buyPrice: 98,
    sellPrice: 39,
    iconId: 'galea_murmillo',
    description: 'Elmo fechado com grade ocular e crista dorsal imponente.',
    stats: { armor: 38, constitution: 3, charisma: 2 },
  },
  lorica_hamata_chain: {
    templateId: 'lorica_hamata_chain',
    name: 'Lorica Hamata Legionária',
    slot: 'armor',
    rarity: 'rare',
    levelReq: 3,
    buyPrice: 210,
    sellPrice: 84,
    iconId: 'lorica_hamata',
    description: 'Cota de malha de anéis de ferro entrelaçados, resistente a cortes profundos.',
    stats: { armor: 72, constitution: 4, strength: 2, healthBonus: 25 },
  },
  pugio_suburra: {
    templateId: 'pugio_suburra',
    name: 'Púgio Sombrio de Suburra',
    slot: 'weapon',
    rarity: 'rare',
    levelReq: 3,
    buyPrice: 195,
    sellPrice: 78,
    iconId: 'pugio_assassin',
    description: 'Lâmina larga de duplo fio favorita de veteranos furtivos.',
    stats: { damageMin: 10, damageMax: 16, skill: 5, agility: 3 },
  },
  manica_bronze_heavy: {
    templateId: 'manica_bronze_heavy',
    name: 'Manica Segmentada de Bronze',
    slot: 'gloves',
    rarity: 'uncommon',
    levelReq: 2,
    buyPrice: 88,
    sellPrice: 35,
    iconId: 'manica_bronze',
    description: 'Placas sobrepostas de bronze rebitadas sobre couro grosso.',
    stats: { armor: 30, strength: 2, skill: 3 },
  },
  ocrea_bronze_greaves: {
    templateId: 'ocrea_bronze_greaves',
    name: 'Ócreas de Bronze de Cápua',
    slot: 'boots',
    rarity: 'rare',
    levelReq: 3,
    buyPrice: 165,
    sellPrice: 66,
    iconId: 'ocrea_bronze',
    description: 'Canelas forjadas em bronze com relevos da loba romana.',
    stats: { armor: 42, agility: 4, constitution: 2 },
  },
  anulus_veteran: {
    templateId: 'anulus_veteran',
    name: 'Anel Sinete do Decurião',
    slot: 'ring',
    rarity: 'uncommon',
    levelReq: 2,
    buyPrice: 90,
    sellPrice: 36,
    iconId: 'anulus_bronze',
    description: 'Anel de bronze maciço concedido aos sobreviventes de dez combates.',
    stats: { strength: 2, skill: 2, charisma: 2 },
  },
  anulus_mars_ruby: {
    templateId: 'anulus_mars_ruby',
    name: 'Anel Carmesim de Marte',
    slot: 'ring',
    rarity: 'epic',
    levelReq: 4,
    buyPrice: 320,
    sellPrice: 128,
    iconId: 'anulus_ruby',
    description: 'Engastado com uma granada sanguínea consagrada ao templo da guerra.',
    stats: { damageMin: 3, damageMax: 5, strength: 4, skill: 4, charisma: 3 },
  },
  bulla_mars_favor: {
    templateId: 'bulla_mars_favor',
    name: 'Bulla Consagrada de Marte',
    slot: 'amulet',
    rarity: 'rare',
    levelReq: 3,
    buyPrice: 185,
    sellPrice: 74,
    iconId: 'bulla_mars',
    description: 'Amuleto militar contendo cinzas do altar de Marte Ultor.',
    stats: { constitution: 4, strength: 3, healthBonus: 30 },
  },
  spatha_imperial_gold: {
    templateId: 'spatha_imperial_gold',
    name: 'Spatha Imperial do Triunfo',
    slot: 'weapon',
    rarity: 'legendary',
    levelReq: 5,
    buyPrice: 540,
    sellPrice: 216,
    iconId: 'spatha_imperial',
    description: 'Obra-prima de aço damasco romano com punho em ouro envelhecido.',
    stats: { damageMin: 16, damageMax: 25, strength: 6, skill: 6, charisma: 4 },
  },
  aegis_praetorian_shield: {
    templateId: 'aegis_praetorian_shield',
    name: 'Égide Negra da Guarda Pretoriana',
    slot: 'shield',
    rarity: 'epic',
    levelReq: 4,
    buyPrice: 360,
    sellPrice: 144,
    iconId: 'aegis_praetorian',
    description: 'Escudo de ferro escurecido com águia dourada e bordas reforçadas.',
    stats: { armor: 95, constitution: 5, charisma: 4, healthBonus: 35 },
  },
  lorica_segmentata_elite: {
    templateId: 'lorica_segmentata_elite',
    name: 'Lorica Segmentata do Primus Pilus',
    slot: 'armor',
    rarity: 'epic',
    levelReq: 4,
    buyPrice: 390,
    sellPrice: 156,
    iconId: 'lorica_segmentata',
    description: 'Armadura laminar completa de aço romano e fivelas de latão.',
    stats: { armor: 110, constitution: 6, strength: 4, healthBonus: 45 },
  },
  ...MEDICINE_ITEM_TEMPLATES,
  ...EXPANDED_EQUIPMENT_TEMPLATES,
  ...EXPANSION_ITEMS,
};

export { MEDICAL_TREATMENTS, MEDICINE_ITEM_TEMPLATES };

export const EXPEDITION_REGIONS: ExpeditionRegion[] = [
  {
    id: 'woods_capua',
    name: 'Bosques Sombrios de Cápua',
    subtitle: 'Território de Feras e Desertores',
    minLevel: 1,
    energyCost: 1,
    durationSeconds: 15,
    ambientDescription:
      'Trilhas lamacentas cercadas por ciprestes antigos onde escravos fugitivos e alcateias famintas emboscam viajantes.',
    enemies: [
      {
        id: 'wolf_starving',
        name: 'Lobo Cinzento dos Apeninos',
        title: 'Fera Selvagem',
        level: 1,
        avatarId: 'wolf',
        maxHp: 75,
        strength: 6,
        skill: 7,
        agility: 8,
        constitution: 6,
        charisma: 4,
        armor: 15,
        damageMin: 5,
        damageMax: 9,
        goldMin: 18,
        goldMax: 28,
        xpReward: 26,
        dropChance: 0.35,
        dropPool: ['gladius_recruit', 'manica_leather_wrap', 'caligae_march'],
      },
      {
        id: 'deserter_auxilia',
        name: 'Desertor Auxiliar Trácio',
        title: 'Foragido Armado',
        level: 2,
        avatarId: 'deserter',
        maxHp: 95,
        strength: 8,
        skill: 8,
        agility: 7,
        constitution: 8,
        charisma: 6,
        armor: 32,
        damageMin: 7,
        damageMax: 12,
        goldMin: 26,
        goldMax: 40,
        xpReward: 38,
        dropChance: 0.4,
        dropPool: ['scutum_oak', 'galea_recruit', 'lorica_leather_vest', 'gladius_bronze_hispania'],
      },
    ],
  },
  {
    id: 'ruins_via_appia',
    name: 'Ruínas da Via Ápia',
    subtitle: 'Aquedutos Quebrados e Saqueadores',
    minLevel: 2,
    energyCost: 1,
    durationSeconds: 20,
    ambientDescription:
      'Mausoléus de mármore rachado e arcos de aqueduto tomados por mercenários renegados e veteranos banidos.',
    enemies: [
      {
        id: 'brigand_appia',
        name: 'Salteador da Via Ápia',
        title: 'Saqueador de Caravanas',
        level: 3,
        avatarId: 'brigand',
        maxHp: 130,
        strength: 11,
        skill: 10,
        agility: 10,
        constitution: 10,
        charisma: 8,
        armor: 52,
        damageMin: 10,
        damageMax: 16,
        goldMin: 42,
        goldMax: 64,
        xpReward: 55,
        dropChance: 0.42,
        dropPool: ['gladius_bronze_hispania', 'parma_eques', 'galea_murmillo_crest', 'anulus_veteran'],
      },
      {
        id: 'secutor_renegade',
        name: 'Vorenus, o Secutor Renegado',
        title: 'Ex-Gladiador de Pompeia',
        level: 4,
        avatarId: 'secutor',
        maxHp: 165,
        strength: 14,
        skill: 13,
        agility: 11,
        constitution: 13,
        charisma: 11,
        armor: 78,
        damageMin: 13,
        damageMax: 20,
        goldMin: 60,
        goldMax: 88,
        xpReward: 78,
        dropChance: 0.48,
        dropPool: ['lorica_hamata_chain', 'pugio_suburra', 'manica_bronze_heavy', 'ocrea_bronze_greaves'],
      },
    ],
  },
  {
    id: 'garrison_ostia',
    name: 'Guarnição Rebelde de Óstia',
    subtitle: 'Fortaleza Portuária Sitiada',
    minLevel: 4,
    energyCost: 2,
    durationSeconds: 25,
    ambientDescription:
      'Antigos armazéns navais fortificados por centuriões amotinados que controlam o contrabando de armas do Tibre.',
    enemies: [
      {
        id: 'centurion_mutineer',
        name: 'Centurião Cássio Severo',
        title: 'Comandante Amotinado',
        level: 5,
        avatarId: 'centurion',
        maxHp: 220,
        strength: 18,
        skill: 17,
        agility: 14,
        constitution: 17,
        charisma: 16,
        armor: 115,
        damageMin: 17,
        damageMax: 26,
        goldMin: 95,
        goldMax: 135,
        xpReward: 115,
        dropChance: 0.55,
        dropPool: ['bulla_mars_favor', 'anulus_mars_ruby', 'aegis_praetorian_shield', 'spatha_imperial_gold'],
      },
    ],
  },
];

EXPEDITION_REGIONS.push(...EXPANSION_REGIONS);

export interface SimulatedArenaOpponent extends EnemyDefinition {
  arenaRank: number;
  ludusOrigin: string;
  simulationTag: 'Oponente Simulado (Local)';
  honorReward: number;
}

export const ARENA_OPPONENTS: SimulatedArenaOpponent[] = [
  {
    id: 'arena_bot_1',
    name: 'Titus Flamma',
    title: 'Tiro da Arena de Cápua',
    ludusOrigin: 'Ludus Lentulus (Simulado)',
    simulationTag: 'Oponente Simulado (Local)',
    arenaRank: 5,
    level: 1,
    avatarId: 'deserter',
    maxHp: 90,
    strength: 7,
    skill: 7,
    agility: 7,
    constitution: 7,
    charisma: 6,
    armor: 26,
    damageMin: 6,
    damageMax: 10,
    goldMin: 30,
    goldMax: 42,
    xpReward: 32,
    honorReward: 15,
    dropChance: 0.25,
    dropPool: ['gladius_recruit', 'scutum_oak'],
  },
  {
    id: 'arena_bot_2',
    name: 'Draco de Siracusa',
    title: 'Retiarius Veterano',
    ludusOrigin: 'Ludus Magnus (Simulado)',
    simulationTag: 'Oponente Simulado (Local)',
    arenaRank: 4,
    level: 2,
    avatarId: 'brigand',
    maxHp: 120,
    strength: 9,
    skill: 11,
    agility: 11,
    constitution: 9,
    charisma: 8,
    armor: 44,
    damageMin: 9,
    damageMax: 14,
    goldMin: 48,
    goldMax: 68,
    xpReward: 50,
    honorReward: 25,
    dropChance: 0.3,
    dropPool: ['gladius_bronze_hispania', 'parma_eques', 'anulus_veteran'],
  },
  {
    id: 'arena_bot_3',
    name: 'Marcus Attilius',
    title: 'Murmillo Invicto',
    ludusOrigin: 'Ludus Gallicus (Simulado)',
    simulationTag: 'Oponente Simulado (Local)',
    arenaRank: 3,
    level: 3,
    avatarId: 'secutor',
    maxHp: 160,
    strength: 13,
    skill: 12,
    agility: 10,
    constitution: 13,
    charisma: 11,
    armor: 76,
    damageMin: 12,
    damageMax: 19,
    goldMin: 75,
    goldMax: 105,
    xpReward: 75,
    honorReward: 40,
    dropChance: 0.35,
    dropPool: ['galea_murmillo_crest', 'lorica_hamata_chain', 'ocrea_bronze_greaves'],
  },
  {
    id: 'arena_bot_4',
    name: 'Spiculus, o Trovão',
    title: 'Primus Palus da Província',
    ludusOrigin: 'Guarda Imperial (Simulado)',
    simulationTag: 'Oponente Simulado (Local)',
    arenaRank: 2,
    level: 5,
    avatarId: 'praetorian_boss',
    maxHp: 235,
    strength: 18,
    skill: 17,
    agility: 15,
    constitution: 18,
    charisma: 16,
    armor: 118,
    damageMin: 17,
    damageMax: 27,
    goldMin: 130,
    goldMax: 175,
    xpReward: 130,
    honorReward: 75,
    dropChance: 0.5,
    dropPool: ['spatha_imperial_gold', 'lorica_segmentata_elite', 'aegis_praetorian_shield'],
  },
];

export const DUNGEONS: DungeonDefinition[] = [
  {
    id: 'catacombs_mars',
    name: 'Catacumbas do Templo de Marte',
    subtitle: '3 Encontros · Chefe: Prefeito Pretoriano',
    difficulty: 'Iniciante',
    minLevel: 1,
    energyCost: 1,
    description:
      'Galerias subterrâneas sob as ruínas antigas onde cultistas da Legião Perdida guardam relíquias imperiais.',
    completionBonusGold: 120,
    completionBonusXp: 95,
    guaranteedDropPool: [
      'gladius_bronze_hispania',
      'lorica_hamata_chain',
      'bulla_mars_favor',
      'anulus_mars_ruby',
      'med_unguent_galen',
    ],
    encounters: [
      {
        id: 'dungeon_1_guard',
        name: 'Sentinela das Cinzas (1/3)',
        title: 'Guardião do Átrio',
        level: 1,
        avatarId: 'deserter',
        maxHp: 85,
        strength: 7,
        skill: 7,
        agility: 6,
        constitution: 7,
        charisma: 5,
        armor: 25,
        damageMin: 6,
        damageMax: 10,
        goldMin: 22,
        goldMax: 32,
        xpReward: 28,
        dropChance: 0.3,
        dropPool: ['manica_bronze_heavy', 'anulus_veteran', 'med_bandage_linen'],
      },
      {
        id: 'dungeon_2_champion',
        name: 'Carcereiro de Ferro (2/3)',
        title: 'Executor Subterrâneo',
        level: 2,
        avatarId: 'secutor',
        maxHp: 120,
        strength: 10,
        skill: 10,
        agility: 8,
        constitution: 10,
        charisma: 8,
        armor: 48,
        damageMin: 9,
        damageMax: 14,
        goldMin: 35,
        goldMax: 52,
        xpReward: 44,
        dropChance: 0.45,
        dropPool: ['galea_murmillo_crest', 'parma_eques', 'pugio_suburra', 'med_unguent_galen'],
      },
      {
        id: 'dungeon_3_boss',
        name: 'Legado Valério Corvo (Chefe 3/3)',
        title: 'Chefe da Catacumba · Campeão Pretoriano',
        level: 3,
        avatarId: 'praetorian_boss',
        maxHp: 170,
        strength: 13,
        skill: 12,
        agility: 10,
        constitution: 13,
        charisma: 12,
        armor: 75,
        damageMin: 12,
        damageMax: 18,
        goldMin: 75,
        goldMax: 110,
        xpReward: 85,
        dropChance: 1.0,
        dropPool: [
          'lorica_hamata_chain',
          'bulla_mars_favor',
          'aegis_praetorian_shield',
          'spatha_imperial_gold',
        ],
      },
    ],
  },
  ...GENERATED_DUNGEONS,
];

export const INITIAL_MARKET_TEMPLATE_IDS: string[] = [
  ...EXPANSION_MARKET_IDS,
  'gladius_recruit',
  'scutum_oak',
  'galea_recruit',
  'lorica_leather_vest',
  'manica_leather_wrap',
  'caligae_march',
  'med_bandage_linen',
  'med_unguent_galen',
  'gladius_bronze_hispania',
  'parma_eques',
  'galea_murmillo_crest',
  'manica_bronze_heavy',
  'anulus_veteran',
  'lorica_hamata_chain',
  'pugio_suburra',
  'ocrea_bronze_greaves',
  'bulla_mars_favor',
  'med_elixir_poppy',
  'anulus_mars_ruby',
  'aegis_praetorian_shield',
  'lorica_segmentata_elite',
  'spatha_imperial_gold',
  'trident_neptune_gold',
  'galea_centurion_primus',
  'med_amphora_falernian',
  'gladius_spartacus_rebel',
  'scutum_tenth_legion',
  'lorica_mythic_scales',
  'med_tonic_aesculapius',
  'spatha_trajan_conquest',
  'aegis_palatine_guard',
  'lorica_augustus_consular',
  'blade_mars_ultor_divine',
  'aegis_minerva_divine',
];
