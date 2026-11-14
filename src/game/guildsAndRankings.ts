import { type GameItem, ITEM_TEMPLATES, type PrimaryStatKey } from './config.ts';

/**
 * ARQUITETURA DE DOMÍNIO: GUILDAS (COLLEGIA) E CLASSIFICAÇÃO (RANKINGS)
 * Modo Local — Dados Simulados com separação explícita entre serviços de domínio e persistência.
 */

export type GuildRole = 'leader' | 'admin' | 'member';

export type GuildRecruitmentStatus = 'open' | 'application' | 'closed';

export type GuildEmblemId =
  | 'aquila_imperial'
  | 'gladius_crossed'
  | 'laurel_crown'
  | 'lupa_capitolina'
  | 'galea_centurion'
  | 'scutum_praetorian';

export type GuildBuildingId =
  | 'forum_gladiatorius'
  | 'banco'
  | 'campo_treino'
  | 'balneario'
  | 'villa_medici'
  | 'biblioteca'
  | 'armazem'
  | 'mercado_interno';

export type LibraryScrollId = 'scroll_mars_damage' | 'scroll_mercury_gold' | 'scroll_minerva_xp';

export type PlayerRankingCategory = 'honor' | 'fame' | 'wins' | 'feats' | 'gold_looted';

export interface GuildPermissionMatrix {
  editDescriptionAndRecruitment: boolean;
  reviewApplications: boolean;
  kickRegularMember: boolean;
  kickAdminMember: boolean;
  changeMemberRole: boolean;
  upgradeBuildings: boolean;
  activateLibraryBuff: boolean;
  postAnnouncement: boolean;
  donateGold: boolean;
  useWarehouse: boolean;
  transferLeadership: boolean;
  dissolveGuild: boolean;
}

export const GUILD_ROLE_LABELS: Record<GuildRole, string> = {
  leader: 'Líder (Magister)',
  admin: 'Administrador (Decurião)',
  member: 'Membro (Gregário)',
};

export const GUILD_RECRUITMENT_LABELS: Record<GuildRecruitmentStatus, string> = {
  open: 'Aberto (Entrada Imediata)',
  application: 'Por Candidatura (Aprovação)',
  closed: 'Fechado',
};

export const GUILD_EMBLEMS: Record<
  GuildEmblemId,
  { id: GuildEmblemId; name: string; motto: string }
> = {
  aquila_imperial: {
    id: 'aquila_imperial',
    name: 'Águia Imperial',
    motto: 'Sub Umbra Alarum',
  },
  gladius_crossed: {
    id: 'gladius_crossed',
    name: 'Gládios Cruzados',
    motto: 'Ferro et Sanguine',
  },
  laurel_crown: {
    id: 'laurel_crown',
    name: 'Coroa de Louros',
    motto: 'Victoria Aeterna',
  },
  lupa_capitolina: {
    id: 'lupa_capitolina',
    name: 'Loba Capitolina',
    motto: 'Stirps Martia',
  },
  galea_centurion: {
    id: 'galea_centurion',
    name: 'Elmo do Centurião',
    motto: 'Disciplina et Honor',
  },
  scutum_praetorian: {
    id: 'scutum_praetorian',
    name: 'Égide Pretoriana',
    motto: 'Custodes Imperii',
  },
};

/**
 * Matriz explícita de permissões por cargo (Seção 4).
 * Administradores NÃO podem assumir poderes de líder (transferir liderança, dissolver, alterar cargos ou expulsar outros administradores).
 */
export const GUILD_PERMISSIONS: Record<GuildRole, GuildPermissionMatrix> = {
  leader: {
    editDescriptionAndRecruitment: true,
    reviewApplications: true,
    kickRegularMember: true,
    kickAdminMember: true,
    changeMemberRole: true,
    upgradeBuildings: true,
    activateLibraryBuff: true,
    postAnnouncement: true,
    donateGold: true,
    useWarehouse: true,
    transferLeadership: true,
    dissolveGuild: true,
  },
  admin: {
    editDescriptionAndRecruitment: true,
    reviewApplications: true,
    kickRegularMember: true,
    kickAdminMember: false,
    changeMemberRole: false,
    upgradeBuildings: true,
    activateLibraryBuff: true,
    postAnnouncement: true,
    donateGold: true,
    useWarehouse: true,
    transferLeadership: false,
    dissolveGuild: false,
  },
  member: {
    editDescriptionAndRecruitment: false,
    reviewApplications: false,
    kickRegularMember: false,
    kickAdminMember: false,
    changeMemberRole: false,
    upgradeBuildings: false,
    activateLibraryBuff: false,
    postAnnouncement: false,
    donateGold: true,
    useWarehouse: true,
    transferLeadership: false,
    dissolveGuild: false,
  },
};

/**
 * Custos, limites, requisitos e tempos centralizados (Seção 3).
 * Valores definidos para o balanceamento de Gladiatorum: Arena Aeterna.
 */
export const GUILD_CONFIG = {
  creationCostGold: 120,
  creationMinLevel: 1,
  minNameLength: 3,
  maxNameLength: 32,
  minTagLength: 2,
  maxTagLength: 4,
  baseCapacityAtLevel1: 5,
  capacityPerForumLevel: 3,
  maxBuildingLevel: 5,
  trainingDiscountPerLevelPercent: 4, // -4% por nível (até -20% no nv 5)
  bathhouseHpRegenBonusPerLevel: 3, // +3 PV/min por nível
  villaMediciCooldownMs: 15 * 60 * 1000, // 15 minutos de espera
  villaMediciBaseGoldFee: 6,
  warehouseSlotsPerLevel: 4, // 4 slots por nível (até 20 slots no nv 5)
  internalMarketDiscountPercent: 15, // 15% mais barato que o mercado comum
  libraryBuffDurationMs: 2 * 60 * 60 * 1000, // 2 horas de duração
  rankingPageSize: 8,
} as const;

export interface GuildBuildingDefinition {
  id: GuildBuildingId;
  name: string;
  latinSubtitle: string;
  description: string;
  maxLevel: number;
  baseUpgradeCost: number;
  requiresForumLevel: boolean;
  formatCurrentBenefit: (level: number) => string;
  formatNextBenefit: (level: number, maxLevel: number) => string;
}

export function getBuildingUpgradeCost(buildingId: GuildBuildingId, currentLevel: number): number {
  const def = GUILD_BUILDING_DEFINITIONS[buildingId];
  return Math.round(def.baseUpgradeCost * Math.pow(1.65, Math.max(0, currentLevel - 1)));
}

export function getGuildMaxCapacity(forumLevel: number): number {
  return (
    GUILD_CONFIG.baseCapacityAtLevel1 +
    Math.max(0, forumLevel - 1) * GUILD_CONFIG.capacityPerForumLevel
  );
}

export const GUILD_BUILDING_DEFINITIONS: Record<GuildBuildingId, GuildBuildingDefinition> = {
  forum_gladiatorius: {
    id: 'forum_gladiatorius',
    name: 'Forum Gladiatorius',
    latinSubtitle: 'Centro Administrativo e Expansão',
    description:
      'Sede do conselho da aliança. Define a capacidade máxima de membros e o nível limite dos demais edifícios da guilda.',
    maxLevel: 5,
    baseUpgradeCost: 140,
    requiresForumLevel: false,
    formatCurrentBenefit: (lv) =>
      `Capacidade máxima: ${getGuildMaxCapacity(lv)} membros · Limite dos edifícios: Nível ${lv}`,
    formatNextBenefit: (lv, max) =>
      lv >= max
        ? 'Nível Máximo Alcançado'
        : `Capacidade: ${getGuildMaxCapacity(lv + 1)} membros · Limite dos edifícios: Nível ${lv + 1}`,
  },
  banco: {
    id: 'banco',
    name: 'Banco (Aerarium)',
    latinSubtitle: 'Tesouro Coletivo e Livro-Razão',
    description:
      'Cofre subterrâneo guardado pela guilda. Recebe doações de denários e financia todas as ampliações da sede.',
    maxLevel: 5,
    baseUpgradeCost: 100,
    requiresForumLevel: true,
    formatCurrentBenefit: (lv) =>
      `Proteção do Tesouro Nv.${lv} · Bônus de Prestígio nas Doações (+${lv * 5}% registro cívico)`,
    formatNextBenefit: (lv, max) =>
      lv >= max
        ? 'Nível Máximo Alcançado'
        : `Proteção do Tesouro Nv.${lv + 1} · Registro cívico +${(lv + 1) * 5}%`,
  },
  campo_treino: {
    id: 'campo_treino',
    name: 'Campo de Treino',
    latinSubtitle: 'Campus Martius da Aliança',
    description:
      'Instrutores veteranos reduzem diretamente o custo em ouro de todos os treinamentos de atributos dos membros.',
    maxLevel: 5,
    baseUpgradeCost: 120,
    requiresForumLevel: true,
    formatCurrentBenefit: (lv) =>
      `-${lv * GUILD_CONFIG.trainingDiscountPerLevelPercent}% de desconto no custo de Treinamento de atributos`,
    formatNextBenefit: (lv, max) =>
      lv >= max
        ? 'Nível Máximo Alcançado'
        : `-${(lv + 1) * GUILD_CONFIG.trainingDiscountPerLevelPercent}% de desconto no custo de Treinamento`,
  },
  balneario: {
    id: 'balneario',
    name: 'Balneário (Thermae)',
    latinSubtitle: 'Águas Termais e Recuperação',
    description:
      'Banhos aquecidos que aceleram a regeneração natural de Pontos de Vida dos membros em repouso e patrulha.',
    maxLevel: 5,
    baseUpgradeCost: 110,
    requiresForumLevel: true,
    formatCurrentBenefit: (lv) =>
      `+${lv * GUILD_CONFIG.bathhouseHpRegenBonusPerLevel} PV/minuto na regeneração de Vida (Total: ${
        12 + lv * GUILD_CONFIG.bathhouseHpRegenBonusPerLevel
      } PV/min)`,
    formatNextBenefit: (lv, max) =>
      lv >= max
        ? 'Nível Máximo Alcançado'
        : `+${(lv + 1) * GUILD_CONFIG.bathhouseHpRegenBonusPerLevel} PV/minuto na regeneração de Vida`,
  },
  villa_medici: {
    id: 'villa_medici',
    name: 'Villa Medici',
    latinSubtitle: 'Cirurgiões do Collegium',
    description:
      'Enfermaria da guilda que realiza tratamento imediato com custo reduzido e tempo de espera definido (15 min).',
    maxLevel: 5,
    baseUpgradeCost: 115,
    requiresForumLevel: true,
    formatCurrentBenefit: (lv) =>
      `Cura até ${25 + lv * 10}% da Vida Máxima por ${Math.max(
        2,
        GUILD_CONFIG.villaMediciBaseGoldFee - lv
      )} Ouro (Espera: 15 min)`,
    formatNextBenefit: (lv, max) =>
      lv >= max
        ? 'Nível Máximo Alcançado'
        : `Cura até ${25 + (lv + 1) * 10}% da Vida Máxima por ${Math.max(
            2,
            GUILD_CONFIG.villaMediciBaseGoldFee - (lv + 1)
          )} Ouro`,
  },
  biblioteca: {
    id: 'biblioteca',
    name: 'Biblioteca (Tabularium)',
    latinSubtitle: 'Éditos e Pergaminhos Temporários',
    description:
      'Permite ativar tratados táticos temporários (2h) que fortalecem todos os membros atuais da guilda.',
    maxLevel: 5,
    baseUpgradeCost: 125,
    requiresForumLevel: true,
    formatCurrentBenefit: (lv) =>
      `Pergaminhos Coletivos Nv.${lv} (+${8 + lv * 2}% Dano ou +${10 + lv * 3}% Ouro/XP por 2h)`,
    formatNextBenefit: (lv, max) =>
      lv >= max
        ? 'Nível Máximo Alcançado'
        : `Pergaminhos Coletivos Nv.${lv + 1} (+${8 + (lv + 1) * 2}% Dano ou +${
            10 + (lv + 1) * 3
          }% Ouro/XP)`,
  },
  armazem: {
    id: 'armazem',
    name: 'Armazém (Horreum)',
    latinSubtitle: 'Arsenal Compartilhado da Guilda',
    description:
      'Depósito coletivo para guarda e retirada de armas e armaduras entre os membros conforme permissões.',
    maxLevel: 5,
    baseUpgradeCost: 105,
    requiresForumLevel: true,
    formatCurrentBenefit: (lv) =>
      `Capacidade do Armazém: ${lv * GUILD_CONFIG.warehouseSlotsPerLevel} equipamentos`,
    formatNextBenefit: (lv, max) =>
      lv >= max
        ? 'Nível Máximo Alcançado'
        : `Capacidade do Armazém: ${(lv + 1) * GUILD_CONFIG.warehouseSlotsPerLevel} equipamentos`,
  },
  mercado_interno: {
    id: 'mercado_interno',
    name: 'Mercado Interno',
    latinSubtitle: 'Macellum Exclusivo dos Membros',
    description:
      'Fornecedores aliados que vendem equipamentos selecionados com 15% de desconto exclusivo para membros.',
    maxLevel: 5,
    baseUpgradeCost: 115,
    requiresForumLevel: true,
    formatCurrentBenefit: (lv) =>
      `Desconto de ${GUILD_CONFIG.internalMarketDiscountPercent}% · Desbloqueia itens até Nível ${lv}`,
    formatNextBenefit: (lv, max) =>
      lv >= max
        ? 'Nível Máximo Alcançado'
        : `Desconto de ${GUILD_CONFIG.internalMarketDiscountPercent}% · Desbloqueia itens até Nível ${
            lv + 1
          }`,
  },
};

export interface LibraryScrollDefinition {
  id: LibraryScrollId;
  name: string;
  treasuryCost: number;
  minLibraryLevel: number;
  description: (libraryLevel: number) => string;
}

export const LIBRARY_SCROLL_DEFINITIONS: Record<LibraryScrollId, LibraryScrollDefinition> = {
  scroll_mars_damage: {
    id: 'scroll_mars_damage',
    name: 'Tratado de Marte Ultor',
    treasuryCost: 60,
    minLibraryLevel: 1,
    description: (lv) => `+${8 + lv * 2}% de Dano Mín/Máx temporário por 2 horas.`,
  },
  scroll_mercury_gold: {
    id: 'scroll_mercury_gold',
    name: 'Édito de Mercúrio',
    treasuryCost: 55,
    minLibraryLevel: 1,
    description: (lv) => `+${10 + lv * 3}% de Ouro em Expedições e Patrulhas por 2 horas.`,
  },
  scroll_minerva_xp: {
    id: 'scroll_minerva_xp',
    name: 'Códice de Minerva',
    treasuryCost: 55,
    minLibraryLevel: 1,
    description: (lv) => `+${10 + lv * 3}% de Experiência em combates por 2 horas.`,
  },
};

export interface ActiveLibraryBuff {
  scrollId: LibraryScrollId;
  name: string;
  activatedBy: string;
  startedAtMs: number;
  expiresAtMs: number;
  libraryLevelAtActivation: number;
}

export interface GuildMemberRecord {
  id: string;
  name: string;
  isPlayer: boolean;
  role: GuildRole;
  level: number;
  honor: number;
  fame: number;
  wins: number;
  goldLooted: number;
  featsCount: number;
  goldContributed: number;
  joinedAtMs: number;
  title: string;
}

export interface GuildApplicationRecord {
  id: string;
  applicantId: string;
  applicantName: string;
  isPlayer: boolean;
  level: number;
  honor: number;
  message: string;
  createdAtMs: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface GuildBankTransaction {
  txId: string;
  type: 'donation' | 'upgrade' | 'library_buff';
  authorName: string;
  amount: number;
  description: string;
  timestampMs: number;
}

export interface GuildAuditEntry {
  id: string;
  actorName: string;
  action: string;
  timestampMs: number;
}

export interface GuildAnnouncement {
  id: string;
  authorName: string;
  authorRole: GuildRole;
  content: string;
  timestampMs: number;
}

export interface GuildRecord {
  id: string;
  name: string;
  tag: string;
  emblemId: GuildEmblemId;
  description: string;
  recruitmentStatus: GuildRecruitmentStatus;
  minLevelReq: number;
  minHonorReq: number;
  treasuryGold: number;
  buildings: Record<GuildBuildingId, number>;
  members: GuildMemberRecord[];
  applications: GuildApplicationRecord[];
  warehouseItems: GameItem[];
  internalMarketTemplateIds: string[];
  activeBuffs: ActiveLibraryBuff[];
  /** Permanent, server-owned VIP rewards. Missing values on older saves mean no bonus. */
  permanentGoldBonusPercent?: number;
  permanentXpBonusPercent?: number;
  bankHistory: GuildBankTransaction[];
  auditLog: GuildAuditEntry[];
  announcements: GuildAnnouncement[];
  createdAtMs: number;
  isSimulatedSeed: boolean;
}

export interface SimulatedGladiatorProfile {
  id: string;
  name: string;
  title: string;
  guildId: string | null;
  level: number;
  honor: number;
  fame: number;
  wins: number;
  losses: number;
  featsCount: number;
  goldLooted: number;
  damageRange: string;
  armor: number;
}

export interface GuildStateContainer {
  playerGuildId: string | null;
  guilds: GuildRecord[];
  simulatedGladiators: SimulatedGladiatorProfile[];
  processedTransactionIds: string[];
  lastVillaMediciUseMs: number;
  lastUpdatedAtMs: number;
}

export interface ActiveGuildBonuses {
  belongsToGuild: boolean;
  guildId: string | null;
  guildName: string | null;
  guildTag: string | null;
  trainingDiscountPercent: number;
  bathhouseHpRegenBonusPerMinute: number;
  villaMediciHealPercent: number;
  villaMediciGoldCost: number;
  internalMarketDiscountPercent: number;
  tempDamageBonusPercent: number;
  tempGoldBonusPercent: number;
  tempXpBonusPercent: number;
  permanentGoldBonusPercent: number;
  permanentXpBonusPercent: number;
  activeBuffs: ActiveLibraryBuff[];
}

export interface FeatDefinition {
  id: string;
  title: string;
  description: string;
}

export const FEAT_DEFINITIONS: FeatDefinition[] = [
  {
    id: 'feat_first_blood',
    title: 'Primeiro Sangue em Cápua',
    description: 'Vencer seu primeiro combate em Expedições ou na Arena.',
  },
  {
    id: 'feat_veteran_5',
    title: 'Veterano das Estradas',
    description: 'Acumular pelo menos 5 vitórias em combates.',
  },
  {
    id: 'feat_level_2',
    title: 'Ascensão de Tiro (Nível 2)',
    description: 'Alcançar o Nível 2 com seu gladiador.',
  },
  {
    id: 'feat_level_4',
    title: 'Campeão Provincial (Nível 4)',
    description: 'Alcançar o Nível 4 com seu gladiador.',
  },
  {
    id: 'feat_honor_60',
    title: 'Renome na Arena (60 Honra)',
    description: 'Alcançar 60 ou mais pontos de Honra.',
  },
  {
    id: 'feat_guild_member',
    title: 'Irmandade de Armas',
    description: 'Ingressar ou fundar uma Guilda (Collegium) em Cápua.',
  },
  {
    id: 'feat_guild_patron',
    title: 'Mecenas do Aerarium',
    description: 'Realizar uma doação de ouro para o Banco da Guilda.',
  },
  {
    id: 'feat_catacombs_conqueror',
    title: 'Conquistador das Catacumbas',
    description: 'Derrotar o Chefe das Catacumbas do Templo de Marte.',
  },
];

export const INTERNAL_MARKET_TEMPLATES_BY_LEVEL: Record<number, string[]> = {
  1: ['gladius_recruit', 'scutum_oak', 'galea_recruit', 'manica_leather_wrap'],
  2: ['gladius_bronze_hispania', 'parma_eques', 'galea_murmillo_crest', 'anulus_veteran'],
  3: ['lorica_hamata_chain', 'pugio_suburra', 'ocrea_bronze_greaves', 'bulla_mars_favor'],
  4: ['anulus_mars_ruby', 'aegis_praetorian_shield', 'lorica_segmentata_elite'],
  5: ['spatha_imperial_gold'],
};

export function getInternalMarketTemplateIdsForLevel(level: number): string[] {
  const result: string[] = [];
  for (let lv = 1; lv <= Math.min(5, Math.max(1, level)); lv++) {
    result.push(...(INTERNAL_MARKET_TEMPLATES_BY_LEVEL[lv] ?? []));
  }
  return result;
}

/**
 * Cria o estado inicial de Guildas e Gladiadores Simulados (Modo Local).
 */
export function createInitialGuildState(nowMs: number = Date.now()): GuildStateContainer {
  const baseDate = nowMs - 7 * 24 * 3600 * 1000;

  const starterWarehouseItem1: GameItem = {
    ...ITEM_TEMPLATES.galea_recruit,
    id: 'guild_wh_item_1',
    stats: { ...ITEM_TEMPLATES.galea_recruit.stats },
  };
  const starterWarehouseItem2: GameItem = {
    ...ITEM_TEMPLATES.caligae_march,
    id: 'guild_wh_item_2',
    stats: { ...ITEM_TEMPLATES.caligae_march.stats },
  };

  const guilds: GuildRecord[] = [
    {
      id: 'guild_legio_ferrea',
      name: 'Legio Ferrea Capuana',
      tag: 'LFC',
      emblemId: 'aquila_imperial',
      description:
        'Aliança tradicional de veteranos de Cápua dedicada ao treinamento rigoroso e domínio das Catacumbas. (Guilda Local Simulada)',
      recruitmentStatus: 'open',
      minLevelReq: 1,
      minHonorReq: 15,
      treasuryGold: 340,
      buildings: {
        forum_gladiatorius: 2,
        banco: 2,
        campo_treino: 2,
        balneario: 1,
        villa_medici: 1,
        biblioteca: 1,
        armazem: 2,
        mercado_interno: 2,
      },
      members: [
        {
          id: 'sim_glad_1',
          name: 'Gaius Crassus',
          title: 'Magister da Legião',
          isPlayer: false,
          role: 'leader',
          level: 4,
          honor: 145,
          fame: 190,
          wins: 18,
          goldLooted: 920,
          featsCount: 6,
          goldContributed: 260,
          joinedAtMs: baseDate,
        },
        {
          id: 'sim_glad_2',
          name: 'Lucia Valeria',
          title: 'Decuriã de Escudo',
          isPlayer: false,
          role: 'admin',
          level: 3,
          honor: 95,
          fame: 130,
          wins: 12,
          goldLooted: 610,
          featsCount: 5,
          goldContributed: 140,
          joinedAtMs: baseDate + 86400000,
        },
        {
          id: 'sim_glad_3',
          name: 'Quintus Sertorius',
          title: 'Murmillo de Bronze',
          isPlayer: false,
          role: 'member',
          level: 2,
          honor: 58,
          fame: 85,
          wins: 7,
          goldLooted: 340,
          featsCount: 4,
          goldContributed: 60,
          joinedAtMs: baseDate + 172800000,
        },
      ],
      applications: [
        {
          id: 'app_sim_1',
          applicantId: 'sim_glad_free_1',
          applicantName: 'Tiberius Nero',
          isPlayer: false,
          level: 2,
          honor: 42,
          message: 'Busco honrar o estandarte da Legio Ferrea nas incursões da Via Ápia.',
          createdAtMs: nowMs - 3600000,
          status: 'pending',
        },
      ],
      warehouseItems: [starterWarehouseItem1, starterWarehouseItem2],
      internalMarketTemplateIds: getInternalMarketTemplateIdsForLevel(2),
      activeBuffs: [],
      bankHistory: [
        {
          txId: 'seed_tx_1',
          type: 'donation',
          authorName: 'Gaius Crassus',
          amount: 260,
          description: 'Doação de fundação ao Aerarium',
          timestampMs: baseDate,
        },
        {
          txId: 'seed_tx_2',
          type: 'donation',
          authorName: 'Lucia Valeria',
          amount: 140,
          description: 'Tributo da Via Ápia',
          timestampMs: baseDate + 90000000,
        },
      ],
      auditLog: [
        {
          id: 'audit_seed_1',
          actorName: 'Gaius Crassus',
          action: 'Fundou o Collegium Legio Ferrea Capuana [LFC].',
          timestampMs: baseDate,
        },
        {
          id: 'audit_seed_2',
          actorName: 'Gaius Crassus',
          action: 'Expandiu o Campo de Treino para o Nível 2 (-8% custo de treino).',
          timestampMs: baseDate + 120000000,
        },
      ],
      announcements: [
        {
          id: 'ann_seed_1',
          authorName: 'Gaius Crassus',
          authorRole: 'leader',
          content:
            'Salve, irmãos de armas! Nosso Campo de Treino está no Nível 2 (-8% de desconto nos treinos). Contribuam ao Banco para expandirmos o Balneário.',
          timestampMs: nowMs - 7200000,
        },
      ],
      createdAtMs: baseDate,
      isSimulatedSeed: true,
    },
    {
      id: 'guild_custodes_martis',
      name: 'Custodes Martis',
      tag: 'MARS',
      emblemId: 'gladius_crossed',
      description:
        'Irmandade marcial consagrada ao Templo de Marte. Recrutamento mediante avaliação de candidatura. (Guilda Local Simulada)',
      recruitmentStatus: 'application',
      minLevelReq: 1,
      minHonorReq: 10,
      treasuryGold: 280,
      buildings: {
        forum_gladiatorius: 2,
        banco: 1,
        campo_treino: 1,
        balneario: 2,
        villa_medici: 2,
        biblioteca: 1,
        armazem: 1,
        mercado_interno: 1,
      },
      members: [
        {
          id: 'sim_glad_4',
          name: 'Aulus Vitellius',
          title: 'Pontífice de Ferro',
          isPlayer: false,
          role: 'leader',
          level: 4,
          honor: 132,
          fame: 175,
          wins: 16,
          goldLooted: 840,
          featsCount: 6,
          goldContributed: 210,
          joinedAtMs: baseDate,
        },
        {
          id: 'sim_glad_5',
          name: 'Decimus Brutus',
          title: 'Secutor Consagrado',
          isPlayer: false,
          role: 'admin',
          level: 3,
          honor: 84,
          fame: 118,
          wins: 10,
          goldLooted: 520,
          featsCount: 5,
          goldContributed: 110,
          joinedAtMs: baseDate + 86400000,
        },
      ],
      applications: [],
      warehouseItems: [],
      internalMarketTemplateIds: getInternalMarketTemplateIdsForLevel(1),
      activeBuffs: [],
      bankHistory: [
        {
          txId: 'seed_tx_3',
          type: 'donation',
          authorName: 'Aulus Vitellius',
          amount: 210,
          description: 'Oferenda inicial ao cofre',
          timestampMs: baseDate,
        },
      ],
      auditLog: [
        {
          id: 'audit_seed_3',
          actorName: 'Aulus Vitellius',
          action: 'Estabeleceu o recrutamento por candidatura.',
          timestampMs: baseDate,
        },
      ],
      announcements: [
        {
          id: 'ann_seed_2',
          authorName: 'Aulus Vitellius',
          authorRole: 'leader',
          content: 'Candidatos de Nível 1+ com espírito combativo serão avaliados pelo conselho.',
          timestampMs: nowMs - 14400000,
        },
      ],
      createdAtMs: baseDate,
      isSimulatedSeed: true,
    },
    {
      id: 'guild_cohors_praetoria',
      name: 'Cohors Praetoria',
      tag: 'CP',
      emblemId: 'scutum_praetorian',
      description:
        'Guarda de elite dos campeões provinciais. Capacidade inicial lotada no Forum Nv.1 para demonstração de limite de vagas. (Guilda Local Simulada)',
      recruitmentStatus: 'open',
      minLevelReq: 2,
      minHonorReq: 40,
      treasuryGold: 520,
      buildings: {
        forum_gladiatorius: 1, // Capacidade = 5 membros (lotada com 5 membros)
        banco: 1,
        campo_treino: 1,
        balneario: 1,
        villa_medici: 1,
        biblioteca: 1,
        armazem: 1,
        mercado_interno: 1,
      },
      members: [
        {
          id: 'sim_glad_6',
          name: 'Servius Galba',
          title: 'Prefeito da Coorte',
          isPlayer: false,
          role: 'leader',
          level: 5,
          honor: 170,
          fame: 230,
          wins: 22,
          goldLooted: 1250,
          featsCount: 7,
          goldContributed: 300,
          joinedAtMs: baseDate,
        },
        {
          id: 'sim_glad_7',
          name: 'Cassius Longinus',
          title: 'Tribuno da Arena',
          isPlayer: false,
          role: 'admin',
          level: 4,
          honor: 115,
          fame: 155,
          wins: 14,
          goldLooted: 780,
          featsCount: 5,
          goldContributed: 150,
          joinedAtMs: baseDate + 40000000,
        },
        {
          id: 'sim_glad_8',
          name: 'Flavius Vespasianus',
          title: 'Hopliomachus',
          isPlayer: false,
          role: 'member',
          level: 3,
          honor: 76,
          fame: 105,
          wins: 9,
          goldLooted: 490,
          featsCount: 4,
          goldContributed: 90,
          joinedAtMs: baseDate + 80000000,
        },
        {
          id: 'sim_glad_9',
          name: 'Publius Ovidius',
          title: 'Dimachaerus',
          isPlayer: false,
          role: 'member',
          level: 2,
          honor: 52,
          fame: 74,
          wins: 6,
          goldLooted: 310,
          featsCount: 3,
          goldContributed: 50,
          joinedAtMs: baseDate + 100000000,
        },
        {
          id: 'sim_glad_10',
          name: 'Marius Aquila',
          title: 'Velite da Coorte',
          isPlayer: false,
          role: 'member',
          level: 2,
          honor: 45,
          fame: 65,
          wins: 5,
          goldLooted: 260,
          featsCount: 3,
          goldContributed: 40,
          joinedAtMs: baseDate + 120000000,
        },
      ],
      applications: [],
      warehouseItems: [],
      internalMarketTemplateIds: getInternalMarketTemplateIdsForLevel(1),
      activeBuffs: [],
      bankHistory: [],
      auditLog: [
        {
          id: 'audit_seed_4',
          actorName: 'Servius Galba',
          action: 'Atingiu a capacidade máxima do Forum Gladiatorius Nv.1 (5/5).',
          timestampMs: baseDate + 120000000,
        },
      ],
      announcements: [],
      createdAtMs: baseDate,
      isSimulatedSeed: true,
    },
    {
      id: 'guild_filii_lupae',
      name: 'Filii Lupae',
      tag: 'LUPA',
      emblemId: 'lupa_capitolina',
      description:
        'Recrutas e caçadores de recompensas dos Bosques de Cápua. Entrada aberta para novos gladiadores. (Guilda Local Simulada)',
      recruitmentStatus: 'open',
      minLevelReq: 1,
      minHonorReq: 0,
      treasuryGold: 150,
      buildings: {
        forum_gladiatorius: 1,
        banco: 1,
        campo_treino: 1,
        balneario: 1,
        villa_medici: 1,
        biblioteca: 1,
        armazem: 1,
        mercado_interno: 1,
      },
      members: [
        {
          id: 'sim_glad_11',
          name: 'Remus Silvius',
          title: 'Caçador dos Apeninos',
          isPlayer: false,
          role: 'leader',
          level: 2,
          honor: 48,
          fame: 70,
          wins: 6,
          goldLooted: 290,
          featsCount: 4,
          goldContributed: 100,
          joinedAtMs: baseDate,
        },
        {
          id: 'sim_glad_12',
          name: 'Faustus Cornelius',
          title: 'Batedor de Cápua',
          isPlayer: false,
          role: 'member',
          level: 1,
          honor: 22,
          fame: 35,
          wins: 2,
          goldLooted: 110,
          featsCount: 2,
          goldContributed: 50,
          joinedAtMs: baseDate + 60000000,
        },
      ],
      applications: [],
      warehouseItems: [],
      internalMarketTemplateIds: getInternalMarketTemplateIdsForLevel(1),
      activeBuffs: [],
      bankHistory: [],
      auditLog: [],
      announcements: [],
      createdAtMs: baseDate,
      isSimulatedSeed: true,
    },
  ];

  // Gladiadores independentes adicionais para compor uma Classificação Geral com paginação e desempates reais
  const independentGladiators: SimulatedGladiatorProfile[] = [
    {
      id: 'sim_glad_free_1',
      name: 'Tiberius Nero',
      title: 'Trácio Errante',
      guildId: null,
      level: 2,
      honor: 42,
      fame: 60,
      wins: 5,
      losses: 2,
      featsCount: 3,
      goldLooted: 240,
      damageRange: '8-13',
      armor: 56,
    },
    {
      id: 'sim_glad_free_2',
      name: 'Horatius Cocles',
      title: 'Defensor da Ponte',
      guildId: null,
      level: 2,
      honor: 35,
      fame: 52,
      wins: 4,
      losses: 1,
      featsCount: 3,
      goldLooted: 195,
      damageRange: '7-11',
      armor: 64,
    },
    {
      id: 'sim_glad_free_3',
      name: 'Valeria Messalina',
      title: 'Amazona da Arena',
      guildId: null,
      level: 1,
      honor: 20, // Mesmo valor inicial do jogador (20) para testar ordenação estável de empates
      fame: 30,
      wins: 1,
      losses: 1,
      featsCount: 2,
      goldLooted: 85,
      damageRange: '6-10',
      armor: 42,
    },
    {
      id: 'sim_glad_free_4',
      name: 'Cato Uticensis',
      title: 'Tiro Disciplinado',
      guildId: null,
      level: 1,
      honor: 15,
      fame: 20,
      wins: 1,
      losses: 2,
      featsCount: 1,
      goldLooted: 60,
      damageRange: '5-9',
      armor: 38,
    },
  ];

  return {
    playerGuildId: null,
    guilds,
    simulatedGladiators: independentGladiators,
    processedTransactionIds: [],
    lastVillaMediciUseMs: 0,
    lastUpdatedAtMs: nowMs,
  };
}

/**
 * Sincroniza os dados atuais do jogador dentro do registro de membros da sua guilda.
 * Garante que a Honra da Guilda seja SEMPRE a soma exata da honra dos membros atuais (Seção 9).
 */
export function syncPlayerMemberInGuilds(
  guildState: GuildStateContainer,
  playerSnapshot: {
    name: string;
    title: string;
    level: number;
    honor: number;
    fame: number;
    wins: number;
    goldLooted: number;
    featsCount: number;
  }
): GuildStateContainer {
  if (!guildState.playerGuildId) {
    return guildState;
  }

  const nextGuilds = guildState.guilds.map((g) => {
    if (g.id !== guildState.playerGuildId) {
      return g;
    }
    const nextMembers = g.members.map((m) =>
      m.isPlayer
        ? {
            ...m,
            name: playerSnapshot.name,
            title: playerSnapshot.title,
            level: playerSnapshot.level,
            honor: playerSnapshot.honor,
            fame: playerSnapshot.fame,
            wins: playerSnapshot.wins,
            goldLooted: playerSnapshot.goldLooted,
            featsCount: playerSnapshot.featsCount,
          }
        : m
    );
    return {
      ...g,
      members: nextMembers,
    };
  });

  return {
    ...guildState,
    guilds: nextGuilds,
  };
}

/**
 * Calcula os bônus ativos da guilda para o jogador em um determinado timestamp (nowMs).
 * Remove automaticamente benefícios ao sair da guilda ou quando o pergaminho expira.
 */
export function getActiveGuildBonuses(
  guildState: GuildStateContainer | undefined,
  nowMs: number = Date.now()
): ActiveGuildBonuses {
  if (!guildState || !guildState.playerGuildId) {
    return {
      belongsToGuild: false,
      guildId: null,
      guildName: null,
      guildTag: null,
      trainingDiscountPercent: 0,
      bathhouseHpRegenBonusPerMinute: 0,
      villaMediciHealPercent: 0,
      villaMediciGoldCost: 0,
      internalMarketDiscountPercent: 0,
      tempDamageBonusPercent: 0,
      tempGoldBonusPercent: 0,
      tempXpBonusPercent: 0,
      permanentGoldBonusPercent: 0,
      permanentXpBonusPercent: 0,
      activeBuffs: [],
    };
  }

  const guild = guildState.guilds.find((g) => g.id === guildState.playerGuildId);
  if (!guild || !guild.members.some((m) => m.isPlayer)) {
    return {
      belongsToGuild: false,
      guildId: null,
      guildName: null,
      guildTag: null,
      trainingDiscountPercent: 0,
      bathhouseHpRegenBonusPerMinute: 0,
      villaMediciHealPercent: 0,
      villaMediciGoldCost: 0,
      internalMarketDiscountPercent: 0,
      tempDamageBonusPercent: 0,
      tempGoldBonusPercent: 0,
      tempXpBonusPercent: 0,
      permanentGoldBonusPercent: 0,
      permanentXpBonusPercent: 0,
      activeBuffs: [],
    };
  }

  const trainingLv = guild.buildings.campo_treino ?? 1;
  const bathLv = guild.buildings.balneario ?? 1;
  const mediciLv = guild.buildings.villa_medici ?? 1;

  const validBuffs = guild.activeBuffs.filter(
    (b) => b.startedAtMs <= nowMs && b.expiresAtMs > nowMs
  );

  let tempDamageBonusPercent = 0;
  let tempGoldBonusPercent = 0;
  let tempXpBonusPercent = 0;

  for (const buff of validBuffs) {
    const lv = Math.max(1, buff.libraryLevelAtActivation);
    if (buff.scrollId === 'scroll_mars_damage') {
      tempDamageBonusPercent = Math.max(tempDamageBonusPercent, 8 + lv * 2);
    } else if (buff.scrollId === 'scroll_mercury_gold') {
      tempGoldBonusPercent = Math.max(tempGoldBonusPercent, 10 + lv * 3);
    } else if (buff.scrollId === 'scroll_minerva_xp') {
      tempXpBonusPercent = Math.max(tempXpBonusPercent, 10 + lv * 3);
    }
  }

  return {
    belongsToGuild: true,
    guildId: guild.id,
    guildName: guild.name,
    guildTag: guild.tag,
    trainingDiscountPercent: trainingLv * GUILD_CONFIG.trainingDiscountPerLevelPercent,
    bathhouseHpRegenBonusPerMinute: bathLv * GUILD_CONFIG.bathhouseHpRegenBonusPerLevel,
    villaMediciHealPercent: 25 + mediciLv * 10,
    villaMediciGoldCost: Math.max(2, GUILD_CONFIG.villaMediciBaseGoldFee - mediciLv),
    internalMarketDiscountPercent: GUILD_CONFIG.internalMarketDiscountPercent,
    tempDamageBonusPercent,
    tempGoldBonusPercent,
    tempXpBonusPercent,
    permanentGoldBonusPercent: Math.max(0, guild.permanentGoldBonusPercent ?? 0),
    permanentXpBonusPercent: Math.max(0, guild.permanentXpBonusPercent ?? 0),
    activeBuffs: validBuffs,
  };
}

/**
 * Calcula a fração de tempo [0..1] em que um benefício temporário da Biblioteca esteve ativo
 * durante uma janela offline [windowStartMs, windowEndMs] (Seção 7: nunca aplica retroativamente a todo o período).
 */
export function getBuffOverlapRatioInWindow(
  buffs: ActiveLibraryBuff[],
  scrollId: LibraryScrollId,
  windowStartMs: number,
  windowEndMs: number
): { ratio: number; bonusPercent: number } {
  const totalWindowMs = Math.max(1, windowEndMs - windowStartMs);
  const matching = buffs.find((b) => b.scrollId === scrollId);
  if (!matching) {
    return { ratio: 0, bonusPercent: 0 };
  }

  const overlapStart = Math.max(windowStartMs, matching.startedAtMs);
  const overlapEnd = Math.min(windowEndMs, matching.expiresAtMs);
  if (overlapEnd <= overlapStart) {
    return { ratio: 0, bonusPercent: 0 };
  }

  const ratio = Math.min(1, (overlapEnd - overlapStart) / totalWindowMs);
  const lv = Math.max(1, matching.libraryLevelAtActivation);
  const bonusPercent =
    scrollId === 'scroll_mars_damage' ? 8 + lv * 2 : 10 + lv * 3;

  return { ratio, bonusPercent };
}

/**
 * CLASSIFICAÇÃO DINÂMICA DE JOGADORES (Seções 8 e 10)
 * Ordenação principal por categoria selecionada (padrão: Honra).
 * Desempate estável e documentado:
 * 1. Pontuação da categoria (decrescente)
 * 2. Honra Geral (decrescente)
 * 3. Nível (decrescente)
 * 4. Vitórias (decrescente)
 * 5. ID alfabético (crescente)
 */
export interface PlayerRankingEntry {
  rank: number;
  id: string;
  name: string;
  title: string;
  isPlayer: boolean;
  guildId: string | null;
  guildName: string | null;
  guildTag: string | null;
  level: number;
  honor: number;
  fame: number;
  wins: number;
  featsCount: number;
  goldLooted: number;
}

export function computePlayerRankings(
  guildState: GuildStateContainer,
  playerSnapshot: {
    name: string;
    title: string;
    level: number;
    honor: number;
    fame: number;
    wins: number;
    featsCount: number;
    goldLooted: number;
  },
  category: PlayerRankingCategory = 'honor'
): PlayerRankingEntry[] {
  const entries: Omit<PlayerRankingEntry, 'rank'>[] = [];
  const seenIds = new Set<string>();

  // 1. Membros de todas as guildas
  for (const guild of guildState.guilds) {
    for (const member of guild.members) {
      if (member.isPlayer) continue; // Adicionamos o jogador a partir do snapshot ao vivo logo abaixo
      seenIds.add(member.id);
      entries.push({
        id: member.id,
        name: member.name,
        title: member.title,
        isPlayer: false,
        guildId: guild.id,
        guildName: guild.name,
        guildTag: guild.tag,
        level: member.level,
        honor: member.honor,
        fame: member.fame,
        wins: member.wins,
        featsCount: member.featsCount,
        goldLooted: member.goldLooted,
      });
    }
  }

  // 2. Gladiadores independentes
  for (const glad of guildState.simulatedGladiators) {
    if (seenIds.has(glad.id)) continue;
    const gladGuild = glad.guildId
      ? guildState.guilds.find((g) => g.id === glad.guildId)
      : null;
    entries.push({
      id: glad.id,
      name: glad.name,
      title: glad.title,
      isPlayer: false,
      guildId: gladGuild?.id ?? null,
      guildName: gladGuild?.name ?? null,
      guildTag: gladGuild?.tag ?? null,
      level: glad.level,
      honor: glad.honor,
      fame: glad.fame,
      wins: glad.wins,
      featsCount: glad.featsCount,
      goldLooted: glad.goldLooted,
    });
  }

  // 3. O próprio jogador (sempre sincronizado em tempo real)
  const playerGuild = guildState.playerGuildId
    ? guildState.guilds.find((g) => g.id === guildState.playerGuildId) ?? null
    : null;

  entries.push({
    id: 'player_aurelius',
    name: playerSnapshot.name,
    title: playerSnapshot.title,
    isPlayer: true,
    guildId: playerGuild?.id ?? null,
    guildName: playerGuild?.name ?? null,
    guildTag: playerGuild?.tag ?? null,
    level: playerSnapshot.level,
    honor: playerSnapshot.honor,
    fame: playerSnapshot.fame,
    wins: playerSnapshot.wins,
    featsCount: playerSnapshot.featsCount,
    goldLooted: playerSnapshot.goldLooted,
  });

  const getMetric = (e: Omit<PlayerRankingEntry, 'rank'>): number => {
    switch (category) {
      case 'honor':
        return e.honor;
      case 'fame':
        return e.fame;
      case 'wins':
        return e.wins;
      case 'feats':
        return e.featsCount;
      case 'gold_looted':
        return e.goldLooted;
    }
  };

  entries.sort((a, b) => {
    const diffPrimary = getMetric(b) - getMetric(a);
    if (diffPrimary !== 0) return diffPrimary;
    if (b.honor !== a.honor) return b.honor - a.honor;
    if (b.level !== a.level) return b.level - a.level;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.id.localeCompare(b.id);
  });

  return entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

/**
 * CLASSIFICAÇÃO DINÂMICA DE GUILDAS (Seção 9)
 * Soma estritamente a Honra dos membros atuais (doações de ouro nunca somam honra; membros removidos deixam de somar imediatamente).
 * Desempate estável e documentado:
 * 1. Honra Total (decrescente)
 * 2. Média de Honra por membro (decrescente)
 * 3. Quantidade de membros (decrescente)
 * 4. ID alfabético (crescente)
 */
export interface GuildRankingEntry {
  rank: number;
  id: string;
  name: string;
  tag: string;
  emblemId: GuildEmblemId;
  leaderName: string;
  memberCount: number;
  maxCapacity: number;
  totalHonor: number;
  averageHonor: number;
  recruitmentStatus: GuildRecruitmentStatus;
  isPlayerGuild: boolean;
}

export function computeGuildRankings(
  guildState: GuildStateContainer,
  playerSnapshot?: {
    name: string;
    title: string;
    level: number;
    honor: number;
    fame: number;
    wins: number;
    goldLooted: number;
    featsCount: number;
  }
): GuildRankingEntry[] {
  const syncedState = playerSnapshot
    ? syncPlayerMemberInGuilds(guildState, playerSnapshot)
    : guildState;

  const rawEntries = syncedState.guilds.map((g) => {
    const memberCount = g.members.length;
    const totalHonor = g.members.reduce((sum, m) => sum + m.honor, 0);
    const averageHonor = memberCount > 0 ? Math.round(totalHonor / memberCount) : 0;
    const leader = g.members.find((m) => m.role === 'leader') ?? g.members[0];
    const maxCapacity = getGuildMaxCapacity(g.buildings.forum_gladiatorius ?? 1);

    return {
      id: g.id,
      name: g.name,
      tag: g.tag,
      emblemId: g.emblemId,
      leaderName: leader?.name ?? 'Desconhecido',
      memberCount,
      maxCapacity,
      totalHonor,
      averageHonor,
      recruitmentStatus: g.recruitmentStatus,
      isPlayerGuild: g.id === syncedState.playerGuildId,
    };
  });

  rawEntries.sort((a, b) => {
    if (b.totalHonor !== a.totalHonor) return b.totalHonor - a.totalHonor;
    if (b.averageHonor !== a.averageHonor) return b.averageHonor - a.averageHonor;
    if (b.memberCount !== a.memberCount) return b.memberCount - a.memberCount;
    return a.id.localeCompare(b.id);
  });

  return rawEntries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

