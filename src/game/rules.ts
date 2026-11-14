import {
  ARENA_OPPONENTS,
  DUNGEONS,
  type EnemyDefinition,
  EQUIPMENT_SLOT_LABELS,
  type EquipmentSlotType,
  EXPEDITION_REGIONS,
  GAME_CONFIG,
  type GameItem,
  getTrainingCost,
  getXpForNextLevel,
  IDLE_FOCUS_DEFINITIONS,
  type IdleFocusMode,
  INITIAL_MARKET_TEMPLATE_IDS,
  ITEM_TEMPLATES,
  MEDICAL_TREATMENTS,
  type MedicalTreatmentDefinition,
  MEDICINE_ITEM_TEMPLATES,
  type PrimaryStatKey,
} from './config.ts';
import {
  type ActiveGuildBonuses,
  createInitialGuildState,
  getActiveGuildBonuses,
  getBuffOverlapRatioInWindow,
  type GuildStateContainer,
  syncPlayerMemberInGuilds,
} from './guildsAndRankings.ts';

export interface BaseAttributes {
  strength: number;
  skill: number;
  agility: number;
  constitution: number;
  charisma: number;
  intelligence: number;
}

export interface DerivedStats extends BaseAttributes {
  maxHp: number;
  armor: number;
  armorReductionMin: number;
  armorReductionMax: number;
  damageMin: number;
  damageMax: number;
  critChancePercent: number;
  dodgeChancePercent: number;
  doubleHitChancePercent: number;
  xpBonusPercent: number;
  hpRegenPerMinute: number;
  tempDamageBonusPercent: number;
}

export interface CombatRoundEntry {
  round: number;
  actor: 'player' | 'enemy';
  actorName: string;
  actionType: 'hit' | 'crit' | 'miss' | 'double_hit';
  rawDamage: number;
  mitigatedByArmor: number;
  finalDamage: number;
  targetHpAfter: number;
  description: string;
}

export interface CombatReport {
  id: string;
  timestamp: number;
  mode: 'expedition' | 'arena' | 'dungeon';
  locationName: string;
  enemyName: string;
  enemyTitle: string;
  enemyLevel: number;
  enemyAvatarId: EnemyDefinition['avatarId'];
  victory: boolean;
  playerStartHp: number;
  playerEndHp: number;
  playerMaxHp: number;
  enemyStartHp: number;
  enemyEndHp: number;
  enemyMaxHp: number;
  totalPlayerDamageDealt: number;
  totalEnemyDamageDealt: number;
  rounds: CombatRoundEntry[];
  rewardClaimId: string;
  defeatDiagnosis?: string[];
}

export interface PendingRewardBatch {
  claimId: string;
  sourceTitle: string;
  sourceMode: 'expedition' | 'arena' | 'dungeon' | 'offline_idle';
  focusMode?: IdleFocusMode;
  createdAt: number;
  gold: number;
  xp: number;
  honor: number;
  items: GameItem[];
  cyclesCompleted: number;
  victories: number;
  defeats: number;
  elapsedSecondsAccounted: number;
  wasCappedAtMaxOffline: boolean;
  claimed: boolean;
}

export interface IdleActivityState {
  active: boolean;
  regionId: string;
  enemyIndex: number;
  focusMode: IdleFocusMode;
  startedAtMs: number;
  lastUpdatedAtMs: number;
  accumulatedSecondsInCurrentCycle: number;
  pausedReason: string | null;
}

export interface DungeonProgressState {
  dungeonId: string;
  currentEncounterIndex: number;
  completedCount: number;
}

export type TutorialStepId =
  | 'start_expedition'
  | 'claim_reward'
  | 'equip_item'
  | 'train_stat'
  | 'choose_next_activity'
  | 'completed';

export interface TutorialState {
  step: TutorialStepId;
  skipped: boolean;
}

export interface StatChangeNotification {
  id: string;
  summary: string;
  changes: { label: string; before: number | string; after: number | string; diff: number }[];
}

export interface GameState {
  version: number;
  name: string;
  title: string;
  level: number;
  xp: number;
  gold: number;
  honor: number;
  fame: number;
  goldLooted: number;
  completedFeats: string[];
  wins: number;
  losses: number;
  currentHp: number;
  energy: number;
  maxEnergy: number;
  lastEnergyTickMs: number;
  claimedContracts?: string[];
  discoveredTemplates?: string[];
  regenerationRemainder?: { energyMs: number; hpUnits: number };
  lastSaveTimestampMs: number;
  baseStats: BaseAttributes;
  equipped: Partial<Record<EquipmentSlotType, GameItem>>;
  inventory: GameItem[];
  marketStock: GameItem[];
  idle: IdleActivityState;
  dungeonProgress: Record<string, DungeonProgressState>;
  pendingRewards: PendingRewardBatch[];
  claimedRewardIds: string[];
  combatHistory: CombatReport[];
  tutorial: TutorialState;
  guildState: GuildStateContainer;
}

export interface NextObjectiveInfo {
  title: string;
  description: string;
  requirementText: string;
  progressCurrent: number;
  progressTarget: number;
  targetTab: 'character' | 'expeditions' | 'arena' | 'inventory' | 'city';
  ctaLabel: string;
}

export function createItemFromTemplate(templateId: string, uniqueSuffix: string): GameItem {
  const tpl = ITEM_TEMPLATES[templateId] ?? ITEM_TEMPLATES.gladius_recruit;
  return {
    ...tpl,
    id: `item_${templateId}_${uniqueSuffix}`,
    stats: { ...tpl.stats },
  };
}

/**
 * Avalia e desbloqueia proezas (feats) com base no estado persistido do jogador.
 */
export function evaluateUnlockedFeats(state: GameState): string[] {
  const set = new Set<string>(state.completedFeats ?? []);
  if (state.wins >= 1) set.add('feat_first_blood');
  if (state.wins >= 5) set.add('feat_veteran_5');
  if (state.level >= 2) set.add('feat_level_2');
  if (state.level >= 4) set.add('feat_level_4');
  if (state.honor >= 60) set.add('feat_honor_60');
  if (state.guildState?.playerGuildId) {
    set.add('feat_guild_member');
    const g = state.guildState.guilds.find((x) => x.id === state.guildState.playerGuildId);
    const pMember = g?.members.find((m) => m.isPlayer);
    if (pMember && pMember.goldContributed > 0) {
      set.add('feat_guild_patron');
    }
  }
  if ((state.dungeonProgress?.catacombs_mars?.completedCount ?? 0) > 0) {
    set.add('feat_catacombs_conqueror');
  }
  return Array.from(set);
}

export function getPlayerSnapshotForRankings(state: GameState) {
  const feats = evaluateUnlockedFeats(state);
  return {
    name: state.name,
    title: state.title,
    level: state.level,
    honor: state.honor,
    fame: state.fame,
    wins: state.wins,
    goldLooted: state.goldLooted,
    featsCount: feats.length,
  };
}

export function syncPlayerWithGuildAndFeats(state: GameState): GameState {
  const completedFeats = evaluateUnlockedFeats(state);
  const snapshot = {
    name: state.name,
    title: state.title,
    level: state.level,
    honor: state.honor,
    fame: state.fame,
    wins: state.wins,
    goldLooted: state.goldLooted,
    featsCount: completedFeats.length,
  };
  const nextGuildState = syncPlayerMemberInGuilds(state.guildState, snapshot);
  const tutorial = state.tutorial.step === 'equip_item' && state.equipped.helmet
    ? advanceTutorialIfMatching(state.tutorial, 'equip_item') : state.tutorial;
  return {
    ...state,
    tutorial,
    completedFeats,
    discoveredTemplates: [...new Set([...(state.discoveredTemplates ?? []),
      ...state.inventory.map(i => i.templateId), ...Object.values(state.equipped).filter(Boolean).map(i => i!.templateId)])],
    guildState: nextGuildState,
  };
}

export function calculateDerivedStats(
  baseStats: BaseAttributes,
  equipped: Partial<Record<EquipmentSlotType, GameItem>>,
  level: number,
  guildState?: GuildStateContainer,
  nowMs: number = Date.now()
): DerivedStats {
  let strength = baseStats.strength;
  let skill = baseStats.skill;
  let agility = baseStats.agility;
  let constitution = baseStats.constitution;
  let charisma = baseStats.charisma;
  let intelligence = baseStats.intelligence;
  let armor = 0;
  let gearDamageMin = 0;
  let gearDamageMax = 0;
  let healthBonus = 0;

  for (const slotKey of Object.keys(equipped) as EquipmentSlotType[]) {
    const item = equipped[slotKey];
    if (!item) continue;
    strength += item.stats.strength ?? 0;
    skill += item.stats.skill ?? 0;
    agility += item.stats.agility ?? 0;
    constitution += item.stats.constitution ?? 0;
    charisma += item.stats.charisma ?? 0;
    intelligence += item.stats.intelligence ?? 0;
    armor += item.stats.armor ?? 0;
    gearDamageMin += item.stats.damageMin ?? 0;
    gearDamageMax += item.stats.damageMax ?? 0;
    healthBonus += item.stats.healthBonus ?? 0;
  }

  const guildBonuses: ActiveGuildBonuses = getActiveGuildBonuses(guildState, nowMs);
  const tempDamageBonusPercent = guildBonuses.tempDamageBonusPercent;
  const damageMult = 1 + tempDamageBonusPercent / 100;

  const maxHp = 60 + level * 18 + constitution * 12 + healthBonus;
  const strengthBonusDmg = Math.floor(strength / 3);
  const baseDamageMin = Math.max(2, 2 + gearDamageMin + strengthBonusDmg);
  const baseDamageMax = Math.max(
    baseDamageMin + 1,
    4 + gearDamageMax + Math.floor(strength * 0.55)
  );

  const damageMin = Math.max(2, Math.round(baseDamageMin * damageMult));
  const damageMax = Math.max(damageMin + 1, Math.round(baseDamageMax * damageMult));

  const armorReductionMin = Math.floor(armor / 22);
  const armorReductionMax = Math.floor(armor / 12);
  const critChancePercent = Math.min(45, Math.round(6 + skill * 1.15));
  const dodgeChancePercent = Math.min(40, Math.round(5 + agility * 1.1));
  const doubleHitChancePercent = Math.min(35, Math.round(4 + charisma * 1.05));
  const xpBonusPercent = Math.round(intelligence * 2);
  const hpRegenPerMinute =
    GAME_CONFIG.hpRegenPerMinute + guildBonuses.bathhouseHpRegenBonusPerMinute;

  return {
    strength,
    skill,
    agility,
    constitution,
    charisma,
    intelligence,
    maxHp,
    armor,
    armorReductionMin,
    armorReductionMax,
    damageMin,
    damageMax,
    critChancePercent,
    dodgeChancePercent,
    doubleHitChancePercent,
    xpBonusPercent,
    hpRegenPerMinute,
    tempDamageBonusPercent,
  };
}

/**
 * Calcula o preço de treinamento considerando o benefício do Campo de Treino da Guilda (Seção 7).
 * Mostra preço base, percentual de desconto, valor descontado e preço final.
 */
export function getEffectiveTrainingCost(
  stat: PrimaryStatKey,
  currentBaseValue: number,
  guildState?: GuildStateContainer,
  nowMs: number = Date.now()
): {
  baseCost: number;
  discountPercent: number;
  discountAmount: number;
  finalCost: number;
} {
  const baseCost = getTrainingCost(stat, currentBaseValue);
  const bonuses = getActiveGuildBonuses(guildState, nowMs);
  const discountPercent = bonuses.trainingDiscountPercent;
  if (discountPercent <= 0) {
    return {
      baseCost,
      discountPercent: 0,
      discountAmount: 0,
      finalCost: baseCost,
    };
  }
  const finalCost = Math.max(1, Math.round(baseCost * (1 - discountPercent / 100)));
  const discountAmount = Math.max(0, baseCost - finalCost);
  return {
    baseCost,
    discountPercent,
    discountAmount,
    finalCost,
  };
}

export function createInitialGameState(nowMs: number = Date.now()): GameState {
  const initialBase: BaseAttributes = {
    strength: 8,
    skill: 8,
    agility: 7,
    constitution: 8,
    charisma: 6,
    intelligence: 6,
  };

  const starterWeapon = createItemFromTemplate('gladius_recruit', 'starter_wpn');
  const starterShield = createItemFromTemplate('scutum_oak', 'starter_shd');
  const starterArmor = createItemFromTemplate('lorica_leather_vest', 'starter_arm');

  const equipped: Partial<Record<EquipmentSlotType, GameItem>> = {
    weapon: starterWeapon,
    shield: starterShield,
    armor: starterArmor,
  };

  const inventory: GameItem[] = [
    createItemFromTemplate('galea_recruit', 'starter_inv_1'),
    createItemFromTemplate('manica_leather_wrap', 'starter_inv_2'),
    createItemFromTemplate('gladius_bronze_hispania', 'starter_inv_3'),
    createItemFromTemplate('med_bandage_linen', 'starter_med_1'),
  ];

  const marketStock: GameItem[] = INITIAL_MARKET_TEMPLATE_IDS.map((tplId, idx) =>
    createItemFromTemplate(tplId, `mkt_${idx}`)
  );

  const initialGuildState = createInitialGuildState(nowMs);
  const derived = calculateDerivedStats(initialBase, equipped, 1, initialGuildState, nowMs);

  return {
    version: GAME_CONFIG.saveVersion,
    name: 'Aurelius Valerius',
    title: 'Gladiador de Cápua',
    level: 1,
    xp: 0,
    gold: 160,
    honor: 20,
    fame: 25,
    goldLooted: 0,
    completedFeats: [],
    wins: 0,
    losses: 0,
    currentHp: derived.maxHp,
    energy: GAME_CONFIG.baseMaxEnergy,
    maxEnergy: GAME_CONFIG.baseMaxEnergy,
    lastEnergyTickMs: nowMs,
    lastSaveTimestampMs: nowMs,
    baseStats: initialBase,
    equipped,
    inventory,
    marketStock,
    idle: {
      active: false,
      regionId: EXPEDITION_REGIONS[0].id,
      enemyIndex: 0,
      focusMode: 'gold',
      startedAtMs: nowMs,
      lastUpdatedAtMs: nowMs,
      accumulatedSecondsInCurrentCycle: 0,
      pausedReason: null,
    },
    dungeonProgress: {
      catacombs_mars: {
        dungeonId: 'catacombs_mars',
        currentEncounterIndex: 0,
        completedCount: 0,
      },
    },
    pendingRewards: [],
    claimedRewardIds: [],
    combatHistory: [],
    tutorial: {
      step: 'start_expedition',
      skipped: false,
    },
    guildState: initialGuildState,
  };
}

/**
 * Calcula dinamicamente o Próximo Objetivo Alcançável para orientar o jogador.
 */
export function getNextObjective(state: GameState, derived: DerivedStats): NextObjectiveInfo {
  if (state.pendingRewards.length > 0) {
    return {
      title: 'Recolher Espólios de Vitória',
      description: 'Você possui recompensas de combate aguardando resgate.',
      requirementText: `${state.pendingRewards.length} lote(s) disponível(is) para resgate imediato.`,
      progressCurrent: 1,
      progressTarget: 1,
      targetTab: 'expeditions',
      ctaLabel: 'Ir para Recompensas',
    };
  }

  const equipableInBag = state.inventory.find(
    (item) => state.level >= item.levelReq && !state.equipped[item.slot]
  );
  if (equipableInBag) {
    return {
      title: `Equipar ${equipableInBag.name}`,
      description: `O slot de ${EQUIPMENT_SLOT_LABELS[equipableInBag.slot]} está vazio e você possui este equipamento pronto na bolsa.`,
      requirementText: `Requisito cumprido: Nível ${equipableInBag.levelReq}`,
      progressCurrent: Object.keys(state.equipped).length,
      progressTarget: Object.keys(state.equipped).length + 1,
      targetTab: 'character',
      ctaLabel: 'Equipar no Personagem',
    };
  }

  if (state.wins === 0) {
    return {
      title: 'Vencer sua Primeira Expedição',
      description: 'Derrote o Lobo Cinzento nos Bosques Sombrios de Cápua para provar seu valor.',
      requirementText: 'Custo: 1 Energia · Recompensa: 18-28 Ouro e 26 XP',
      progressCurrent: 0,
      progressTarget: 1,
      targetTab: 'expeditions',
      ctaLabel: 'Iniciar Expedição',
    };
  }

  const totalBaseTrained =
    state.baseStats.strength +
    state.baseStats.skill +
    state.baseStats.agility +
    state.baseStats.constitution -
    31;
  if (totalBaseTrained < 2) {
    const { finalCost } = getEffectiveTrainingCost(
      'strength',
      state.baseStats.strength,
      state.guildState
    );
    return {
      title: 'Aprimorar Atributos no Ludus',
      description: 'Treine Força ou Habilidade com o Doctore para elevar seu dano e precisão.',
      requirementText: `Próximo treino de Força: ${finalCost} Ouro (Saldo: ${state.gold} Ouro)`,
      progressCurrent: Math.max(0, totalBaseTrained),
      progressTarget: 2,
      targetTab: 'city',
      ctaLabel: 'Treinar na Cidade',
    };
  }

  if (!state.guildState.playerGuildId) {
    return {
      title: 'Ingressar em uma Guilda (Collegium)',
      description:
        'Junte-se a uma aliança romana na Cidade para receber descontos de treinamento, Balneário e acesso à Villa Medici.',
      requirementText: 'Disponível na Cidade → Aba Guilda',
      progressCurrent: 0,
      progressTarget: 1,
      targetTab: 'city',
      ctaLabel: 'Visitar Guildas',
    };
  }

  if (state.level < 2) {
    const xpTarget = getXpForNextLevel(state.level);
    return {
      title: 'Alcançar o Nível 2 (Desbloquear Via Ápia)',
      description:
        'Acumule experiência em Expedições ou ative a Patrulha Idle para liberar as Ruínas da Via Ápia e usar o Gládio Hispânico.',
      requirementText: `Desbloqueia no Nível 2: Ruínas da Via Ápia e armas Incomuns`,
      progressCurrent: state.xp,
      progressTarget: xpTarget,
      targetTab: 'expeditions',
      ctaLabel: 'Combater por XP',
    };
  }

  const dungeonProg = state.dungeonProgress.catacombs_mars;
  if (!dungeonProg || dungeonProg.completedCount === 0) {
    return {
      title: 'Conquistar as Catacumbas de Marte',
      description:
        'Vença a sequência de 3 encontros subterrâneos e derrote o Legado Valério Corvo para obter uma relíquia garantida.',
      requirementText: `Progresso atual: Encontro ${(dungeonProg?.currentEncounterIndex ?? 0) + 1} de 3`,
      progressCurrent: dungeonProg?.currentEncounterIndex ?? 0,
      progressTarget: 3,
      targetTab: 'city',
      ctaLabel: 'Entrar na Masmorra',
    };
  }

  if (state.level < 4) {
    return {
      title: 'Alcançar o Nível 4 (Guarnição de Óstia)',
      description:
        'Continue evoluindo seu gladiador na Arena Provincial e na Via Ápia para desbloquear a fortaleza portuária de Óstia.',
      requirementText: `Nível atual: ${state.level}/4 · Vida Máx: ${derived.maxHp} PV`,
      progressCurrent: state.level,
      progressTarget: 4,
      targetTab: 'arena',
      ctaLabel: 'Desafiar na Arena',
    };
  }

  return {
    title: 'Dominar a Arena Provincial',
    description: 'Desafie Spiculus, o Trovão, e conquiste os equipamentos Lendários do Fórum.',
    requirementText: `Honra acumulada: ${state.honor} pontos`,
    progressCurrent: Math.min(state.honor, 200),
    progressTarget: 200,
    targetTab: 'arena',
    ctaLabel: 'Lutar na Arena',
  };
}

function createSeededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Resolve um combate turno a turno entre o Gladiador e um Inimigo com fórmulas explícitas.
 * Integra bônus temporários da Biblioteca da Guilda se estiverem ativos em `timestampMs`.
 */
export function resolveCombat(
  state: GameState,
  enemy: EnemyDefinition,
  options: {
    mode: 'expedition' | 'arena' | 'dungeon';
    locationName: string;
    focusMode?: IdleFocusMode;
    seed?: number;
    timestampMs?: number;
    ignoreGuildLibraryBuffs?: boolean;
  }
): {
  report: CombatReport;
  rewardBatch: PendingRewardBatch;
  playerRemainingHp: number;
} {
  const nowMs = options.timestampMs ?? Date.now();
  const rng = createSeededRng(options.seed ?? nowMs);
  const effectiveGuildState = options.ignoreGuildLibraryBuffs && state.guildState
    ? {
        ...state.guildState,
        guilds: state.guildState.guilds.map((guild) =>
          guild.id === state.guildState?.playerGuildId
            ? { ...guild, activeBuffs: [] }
            : guild
        ),
      }
    : state.guildState;
  const playerStats = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    state.level,
    effectiveGuildState,
    nowMs
  );
  const guildBonuses = getActiveGuildBonuses(effectiveGuildState, nowMs);
  const focus = IDLE_FOCUS_DEFINITIONS[options.focusMode ?? state.idle.focusMode ?? 'gold'];

  const playerStartHp = Math.max(1, Math.min(state.currentHp, playerStats.maxHp));
  let playerHp = playerStartHp;
  let enemyHp = enemy.maxHp;

  const rounds: CombatRoundEntry[] = [];
  let totalPlayerDamageDealt = 0;
  let totalEnemyDamageDealt = 0;
  let playerMisses = 0;
  let totalMitigatedByEnemyArmor = 0;

  const maxRounds = 16;

  const playerHitChance = clamp(
    0.58 + (playerStats.skill - enemy.agility) * 0.032,
    0.3,
    0.94
  );
  const enemyHitChance = clamp(
    0.52 + (enemy.skill - playerStats.agility) * 0.03,
    0.22,
    0.88
  );

  const playerCritChance = clamp(playerStats.critChancePercent / 100, 0.05, 0.45);
  const enemyCritChance = clamp(0.06 + enemy.skill * 0.008, 0.05, 0.3);

  const enemyArmorMin = Math.floor(enemy.armor / 24);
  const enemyArmorMax = Math.floor(enemy.armor / 13);

  for (let roundNum = 1; roundNum <= maxRounds; roundNum++) {
    if (playerHp <= 0 || enemyHp <= 0) break;

    const hitRoll = rng();
    if (hitRoll <= playerHitChance) {
      const rawRoll =
        playerStats.damageMin +
        Math.floor(rng() * (playerStats.damageMax - playerStats.damageMin + 1));
      const isCrit = rng() <= playerCritChance;
      const isDouble =
        !isCrit &&
        rng() <= clamp((playerStats.charisma - enemy.charisma) * 0.025 + 0.06, 0.03, 0.28);
      const mult = isCrit ? 1.55 : isDouble ? 1.35 : 1.0;
      const rawDamage = Math.max(1, Math.round(rawRoll * mult));
      const armorMitigation =
        enemyArmorMin + Math.floor(rng() * Math.max(1, enemyArmorMax - enemyArmorMin + 1));
      const finalDamage = Math.max(2, rawDamage - armorMitigation);
      const mitigated = Math.max(0, rawDamage - finalDamage);

      enemyHp = Math.max(0, enemyHp - finalDamage);
      totalPlayerDamageDealt += finalDamage;
      totalMitigatedByEnemyArmor += mitigated;

      rounds.push({
        round: roundNum,
        actor: 'player',
        actorName: state.name,
        actionType: isCrit ? 'crit' : isDouble ? 'double_hit' : 'hit',
        rawDamage,
        mitigatedByArmor: mitigated,
        finalDamage,
        targetHpAfter: enemyHp,
        description: isCrit
          ? `Golpe Crítico certeiro na guarda de ${enemy.name}!`
          : isDouble
          ? `Investida dupla impetuosa contra ${enemy.name}.`
          : `Estocada firme contra ${enemy.name}.`,
      });
    } else {
      playerMisses += 1;
      rounds.push({
        round: roundNum,
        actor: 'player',
        actorName: state.name,
        actionType: 'miss',
        rawDamage: 0,
        mitigatedByArmor: 0,
        finalDamage: 0,
        targetHpAfter: enemyHp,
        description: `${enemy.name} esquivou da investida.`,
      });
    }

    if (enemyHp <= 0) break;

    const enemyHitRoll = rng();
    if (enemyHitRoll <= enemyHitChance) {
      const rawRoll =
        enemy.damageMin + Math.floor(rng() * (enemy.damageMax - enemy.damageMin + 1));
      const isCrit = rng() <= enemyCritChance;
      const rawDamage = Math.max(1, Math.round(rawRoll * (isCrit ? 1.45 : 1.0)));
      const playerMitigation =
        playerStats.armorReductionMin +
        Math.floor(
          rng() * Math.max(1, playerStats.armorReductionMax - playerStats.armorReductionMin + 1)
        );
      const finalDamage = Math.max(1, rawDamage - playerMitigation);

      playerHp = Math.max(0, playerHp - finalDamage);
      totalEnemyDamageDealt += finalDamage;

      rounds.push({
        round: roundNum,
        actor: 'enemy',
        actorName: enemy.name,
        actionType: isCrit ? 'crit' : 'hit',
        rawDamage,
        mitigatedByArmor: Math.max(0, rawDamage - finalDamage),
        finalDamage,
        targetHpAfter: playerHp,
        description: isCrit
          ? `${enemy.name} desferiu um ataque brutal!`
          : `${enemy.name} atingiu sua armadura.`,
      });
    } else {
      rounds.push({
        round: roundNum,
        actor: 'enemy',
        actorName: enemy.name,
        actionType: 'miss',
        rawDamage: 0,
        mitigatedByArmor: 0,
        finalDamage: 0,
        targetHpAfter: playerHp,
        description: `Você aparou o golpe de ${enemy.name} com o escudo.`,
      });
    }
  }

  const victory =
    enemyHp <= 0 ||
    (playerHp > 0 &&
      totalPlayerDamageDealt / enemy.maxHp >= totalEnemyDamageDealt / playerStats.maxHp);

  const playerEndHp = Math.max(1, playerHp);
  const rewardClaimId = `claim_${options.mode}_${nowMs}_${Math.floor(rng() * 100000)}`;

  let goldEarned = 0;
  let xpEarned = 0;
  let honorEarned = 0;
  const droppedItems: GameItem[] = [];

  if (victory) {
    const rawGold =
      enemy.goldMin + Math.floor(rng() * (enemy.goldMax - enemy.goldMin + 1));
    const goldWithFocus = rawGold * focus.goldMultiplier;
    goldEarned = Math.max(
      1,
      Math.round(
        goldWithFocus *
          (1 + (guildBonuses.tempGoldBonusPercent + guildBonuses.permanentGoldBonusPercent) / 100)
      )
    );

    const baseXp = enemy.xpReward * focus.xpMultiplier;
    const totalXpBonusPercent =
      playerStats.xpBonusPercent +
      guildBonuses.tempXpBonusPercent +
      guildBonuses.permanentXpBonusPercent;
    xpEarned = Math.max(1, Math.round(baseXp * (1 + totalXpBonusPercent / 100)));
    honorEarned = options.mode === 'arena' ? 20 + enemy.level * 8 : enemy.level * 3;

    const effectiveDropChance = Math.min(0.95, enemy.dropChance * focus.dropChanceMultiplier);
    if (enemy.dropPool.length > 0 && rng() <= effectiveDropChance) {
      const tplId = enemy.dropPool[Math.floor(rng() * enemy.dropPool.length)];
      droppedItems.push(createItemFromTemplate(tplId, `${nowMs}_drop`));
    }
  } else {
    goldEarned = Math.round(
      Math.max(4, Math.floor(enemy.goldMin * 0.25)) *
        (1 + guildBonuses.permanentGoldBonusPercent / 100)
    );
    xpEarned = Math.round(
      Math.max(5, Math.floor(enemy.xpReward * 0.25)) *
        (1 + guildBonuses.permanentXpBonusPercent / 100)
    );
  }

  const defeatDiagnosis: string[] = [];
  if (!victory) {
    if (playerStartHp < playerStats.maxHp * 0.65) {
      defeatDiagnosis.push(
        `Você iniciou o combate com apenas ${playerStartHp}/${playerStats.maxHp} PV. Cure-se no Médico ou na Villa Medici da Guilda antes de enfrentar inimigos fortes.`
      );
    }
    if (playerMisses >= 2 || enemy.agility > playerStats.skill) {
      defeatDiagnosis.push(
        `${enemy.name} esquivou de ${playerMisses} ataques seus (Agilidade inimiga ${enemy.agility} vs sua Habilidade ${playerStats.skill}). Treine Habilidade na Cidade.`
      );
    }
    if (totalMitigatedByEnemyArmor >= 8 || enemy.armor > playerStats.damageMax * 3) {
      defeatDiagnosis.push(
        `A armadura de ${enemy.name} (${enemy.armor}) absorveu ${totalMitigatedByEnemyArmor} pontos de dano. Equipe uma arma superior ou treine Força.`
      );
    }
    if (defeatDiagnosis.length === 0) {
      defeatDiagnosis.push(
        `${enemy.name} (Nível ${enemy.level}) superou sua resistência atual. Equipe todos os slots vazios no Personagem ou acumule ouro/XP contra o Lobo Cinzento.`
      );
    }
  }

  const report: CombatReport = {
    id: `combat_${nowMs}_${Math.floor(rng() * 10000)}`,
    timestamp: nowMs,
    mode: options.mode,
    locationName: options.locationName,
    enemyName: enemy.name,
    enemyTitle: enemy.title,
    enemyLevel: enemy.level,
    enemyAvatarId: enemy.avatarId,
    victory,
    playerStartHp,
    playerEndHp,
    playerMaxHp: playerStats.maxHp,
    enemyStartHp: enemy.maxHp,
    enemyEndHp: enemyHp,
    enemyMaxHp: enemy.maxHp,
    totalPlayerDamageDealt,
    totalEnemyDamageDealt,
    rounds,
    rewardClaimId,
    defeatDiagnosis: !victory ? defeatDiagnosis : undefined,
  };

  const rewardBatch: PendingRewardBatch = {
    claimId: rewardClaimId,
    sourceTitle: `${options.locationName} — ${enemy.name}`,
    sourceMode: options.mode,
    focusMode: focus.id,
    createdAt: nowMs,
    gold: goldEarned,
    xp: xpEarned,
    honor: honorEarned,
    items: droppedItems,
    cyclesCompleted: 1,
    victories: victory ? 1 : 0,
    defeats: victory ? 0 : 1,
    elapsedSecondsAccounted: 0,
    wasCappedAtMaxOffline: false,
    claimed: false,
  };

  return {
    report,
    rewardBatch,
    playerRemainingHp: playerEndHp,
  };
}

/**
 * Avança o passo do tutorial contextual quando a ação correspondente é realizada.
 */
export function advanceTutorialIfMatching(
  tutorial: TutorialState,
  completedStep: TutorialStepId
): TutorialState {
  if (tutorial.skipped || tutorial.step === 'completed') {
    return tutorial;
  }

  const order: TutorialStepId[] = [
    'start_expedition',
    'claim_reward',
    'equip_item',
    'train_stat',
    'choose_next_activity',
    'completed',
  ];

  const currentIdx = order.indexOf(tutorial.step);
  const completedIdx = order.indexOf(completedStep);

  if (completedIdx === currentIdx && currentIdx < order.length - 1) {
    return {
      ...tutorial,
      step: order[currentIdx + 1],
    };
  }
  return tutorial;
}

/**
 * Resgata um lote de recompensas de forma estritamente IDEMPOTENTE.
 * Atualiza também Honra, Fama, Ouro Saqueado, Proezas e a Honra Total da Guilda.
 */
export function claimPendingReward(
  state: GameState,
  claimId: string
): { state: GameState; claimedNow: boolean; leveledUp: boolean } {
  if (state.claimedRewardIds.includes(claimId)) {
    return { state, claimedNow: false, leveledUp: false };
  }

  const targetBatch = state.pendingRewards.find((r) => r.claimId === claimId);
  if (!targetBatch || targetBatch.claimed) {
    return { state, claimedNow: false, leveledUp: false };
  }

  let newLevel = state.level;
  let newXp = state.xp + targetBatch.xp;
  let leveledUp = false;

  while (newXp >= getXpForNextLevel(newLevel)) {
    newXp -= getXpForNextLevel(newLevel);
    newLevel += 1;
    leveledUp = true;
  }

  const newInventory = [...state.inventory];
  let extraGoldFromOverflow = 0;

  for (const item of targetBatch.items) {
    if (newInventory.length < GAME_CONFIG.maxInventorySlots) {
      newInventory.push(item);
    } else {
      extraGoldFromOverflow += item.sellPrice;
    }
  }
  const overflowGoldBonus = getActiveGuildBonuses(state.guildState).permanentGoldBonusPercent;
  extraGoldFromOverflow = Math.round(extraGoldFromOverflow * (1 + overflowGoldBonus / 100));

  const derivedAfter = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    newLevel,
    state.guildState
  );
  const newCurrentHp = leveledUp
    ? derivedAfter.maxHp
    : Math.min(state.currentHp, derivedAfter.maxHp);

  const updatedPending = state.pendingRewards.map((batch) =>
    batch.claimId === claimId ? { ...batch, claimed: true } : batch
  );

  const fameGain =
    targetBatch.sourceMode === 'arena'
      ? Math.max(8, targetBatch.victories * 14)
      : targetBatch.sourceMode === 'dungeon'
      ? Math.max(6, targetBatch.victories * 10)
      : targetBatch.victories * 4;

  const rawNextState: GameState = {
    ...state,
    level: newLevel,
    xp: newXp,
    gold: state.gold + targetBatch.gold + extraGoldFromOverflow,
    honor: state.honor + targetBatch.honor,
    fame: state.fame + fameGain + (leveledUp ? 15 : 0),
    goldLooted: state.goldLooted + targetBatch.gold,
    currentHp: newCurrentHp,
    inventory: newInventory,
    discoveredTemplates: [...new Set([...(state.discoveredTemplates ?? []), ...targetBatch.items.map(item => item.templateId)])],
    pendingRewards: updatedPending.filter((b) => !b.claimed),
    claimedRewardIds: [...state.claimedRewardIds.slice(-99), claimId],
    tutorial: advanceTutorialIfMatching(state.tutorial, 'claim_reward'),
  };

  return {
    state: syncPlayerWithGuildAndFeats(rawNextState),
    claimedNow: true,
    leveledUp,
  };
}

/**
 * Calcula diferenças explícitas entre dois estados de atributos derivados para feedback visual claro.
 */
export function diffDerivedStats(
  before: DerivedStats,
  after: DerivedStats
): { label: string; before: number | string; after: number | string; diff: number }[] {
  const changes: { label: string; before: number | string; after: number | string; diff: number }[] = [];

  if (after.damageMax !== before.damageMax || after.damageMin !== before.damageMin) {
    const avgBefore = (before.damageMin + before.damageMax) / 2;
    const avgAfter = (after.damageMin + after.damageMax) / 2;
    changes.push({
      label: 'Dano',
      before: `${before.damageMin}-${before.damageMax}`,
      after: `${after.damageMin}-${after.damageMax}`,
      diff: Math.round(avgAfter - avgBefore),
    });
  }
  if (after.armor !== before.armor) {
    changes.push({
      label: 'Armadura',
      before: before.armor,
      after: after.armor,
      diff: after.armor - before.armor,
    });
  }
  if (after.maxHp !== before.maxHp) {
    changes.push({
      label: 'Vida Máx.',
      before: before.maxHp,
      after: after.maxHp,
      diff: after.maxHp - before.maxHp,
    });
  }
  if (after.strength !== before.strength) {
    changes.push({
      label: 'Força',
      before: before.strength,
      after: after.strength,
      diff: after.strength - before.strength,
    });
  }
  if (after.skill !== before.skill) {
    changes.push({
      label: 'Habilidade',
      before: before.skill,
      after: after.skill,
      diff: after.skill - before.skill,
    });
  }
  if (after.agility !== before.agility) {
    changes.push({
      label: 'Agilidade',
      before: before.agility,
      after: after.agility,
      diff: after.agility - before.agility,
    });
  }
  if (after.constitution !== before.constitution) {
    changes.push({
      label: 'Constituição',
      before: before.constitution,
      after: after.constitution,
      diff: after.constitution - before.constitution,
    });
  }
  if (after.charisma !== before.charisma) {
    changes.push({
      label: 'Carisma',
      before: before.charisma,
      after: after.charisma,
      diff: after.charisma - before.charisma,
    });
  }
  if (after.intelligence !== before.intelligence) {
    changes.push({
      label: 'Inteligência',
      before: before.intelligence,
      after: after.intelligence,
      diff: after.intelligence - before.intelligence,
    });
  }

  return changes;
}

/**
 * Equipar item do inventário atualizando imediatamente os atributos derivados e Vida Máxima.
 */
export function equipItemFromInventory(
  state: GameState,
  inventoryItemId: string
): { state: GameState; statChanges?: StatChangeNotification; error?: string } {
  const itemIndex = state.inventory.findIndex((i) => i.id === inventoryItemId);
  if (itemIndex === -1) {
    return { state, error: 'Item não encontrado no inventário.' };
  }

  const itemToEquip = state.inventory[itemIndex];
  if (state.level < itemToEquip.levelReq) {
    return {
      state,
      error: `Requer Nível ${itemToEquip.levelReq} para equipar ${itemToEquip.name}.`,
    };
  }

  const previouslyEquipped = state.equipped[itemToEquip.slot];
  const nextInventory = [...state.inventory];
  nextInventory.splice(itemIndex, 1);

  if (previouslyEquipped) {
    nextInventory.splice(itemIndex, 0, previouslyEquipped);
  }

  const nextEquipped: Partial<Record<EquipmentSlotType, GameItem>> = {
    ...state.equipped,
    [itemToEquip.slot]: itemToEquip,
  };

  const prevDerived = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    state.level,
    state.guildState
  );
  const nextDerived = calculateDerivedStats(
    state.baseStats,
    nextEquipped,
    state.level,
    state.guildState
  );
  const hpDelta = Math.max(0, nextDerived.maxHp - prevDerived.maxHp);
  const nextHp = Math.min(nextDerived.maxHp, state.currentHp + hpDelta);

  const changes = diffDerivedStats(prevDerived, nextDerived);

  return {
    state: {
      ...state,
      equipped: nextEquipped,
      inventory: nextInventory,
      currentHp: nextHp,
      tutorial: advanceTutorialIfMatching(state.tutorial, 'equip_item'),
    },
    statChanges: {
      id: `equip_${Date.now()}`,
      summary: `Equipado: ${itemToEquip.name}`,
      changes,
    },
  };
}

/**
 * Remover item equipado de volta para o inventário.
 */
export function unequipSlotToInventory(
  state: GameState,
  slot: EquipmentSlotType
): { state: GameState; statChanges?: StatChangeNotification; error?: string } {
  const item = state.equipped[slot];
  if (!item) {
    return { state, error: 'Nenhum equipamento neste slot.' };
  }

  if (state.inventory.length >= GAME_CONFIG.maxInventorySlots) {
    return { state, error: 'Inventário cheio! Venda ou descarte itens primeiro.' };
  }

  const prevDerived = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    state.level,
    state.guildState
  );
  const nextEquipped = { ...state.equipped };
  delete nextEquipped[slot];

  const nextDerived = calculateDerivedStats(
    state.baseStats,
    nextEquipped,
    state.level,
    state.guildState
  );
  const nextHp = Math.min(state.currentHp, nextDerived.maxHp);

  return {
    state: {
      ...state,
      equipped: nextEquipped,
      inventory: [...state.inventory, item],
      currentHp: nextHp,
    },
    statChanges: {
      id: `unequip_${Date.now()}`,
      summary: `Removido: ${item.name}`,
      changes: diffDerivedStats(prevDerived, nextDerived),
    },
  };
}

/**
 * Treinar atributo primário no Ludus aplicando o desconto do Campo de Treino da Guilda (se houver).
 */
export function trainGladiatorStat(
  state: GameState,
  stat: PrimaryStatKey,
  nowMs: number = Date.now()
): {
  state: GameState;
  costPaid: number;
  baseCost: number;
  discountAmount: number;
  statChanges?: StatChangeNotification;
  error?: string;
} {
  const currentVal = state.baseStats[stat];
  const pricing = getEffectiveTrainingCost(stat, currentVal, state.guildState, nowMs);
  const cost = pricing.finalCost;

  if (state.gold < cost) {
    return {
      state,
      costPaid: 0,
      baseCost: pricing.baseCost,
      discountAmount: pricing.discountAmount,
      error: `Ouro insuficiente. Necessário: ${cost} denários.`,
    };
  }

  const nextBaseStats: BaseAttributes = {
    ...state.baseStats,
    [stat]: currentVal + 1,
  };

  const prevDerived = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    state.level,
    state.guildState,
    nowMs
  );
  const nextDerived = calculateDerivedStats(
    nextBaseStats,
    state.equipped,
    state.level,
    state.guildState,
    nowMs
  );
  const hpGain = Math.max(0, nextDerived.maxHp - prevDerived.maxHp);

  const discountLabel =
    pricing.discountAmount > 0
      ? ` (Base ${pricing.baseCost}g - ${pricing.discountPercent}% Guilda = ${cost}g)`
      : ` (-${cost} Ouro)`;

  return {
    state: {
      ...state,
      gold: state.gold - cost,
      baseStats: nextBaseStats,
      currentHp: Math.min(nextDerived.maxHp, state.currentHp + hpGain),
      tutorial: advanceTutorialIfMatching(state.tutorial, 'train_stat'),
    },
    costPaid: cost,
    baseCost: pricing.baseCost,
    discountAmount: pricing.discountAmount,
    statChanges: {
      id: `train_${stat}_${nowMs}`,
      summary: `Treinamento concluído${discountLabel}`,
      changes: diffDerivedStats(prevDerived, nextDerived),
    },
  };
}

/**
 * Comprar item no Mercado Romano
 */
export function buyItemFromMarket(
  state: GameState,
  marketItemId: string,
  nowMs: number = Date.now()
): { state: GameState; error?: string } {
  const item = state.marketStock.find((i) => i.id === marketItemId);
  if (!item) {
    return { state, error: 'Mercadoria não encontrada.' };
  }

  if (state.gold < item.buyPrice) {
    return {
      state,
      error: `Saldo insuficiente. ${item.name} custa ${item.buyPrice} denários.`,
    };
  }

  if (state.inventory.length >= GAME_CONFIG.maxInventorySlots) {
    return {
      state,
      error: 'Inventário cheio! Libere espaço antes de comprar.',
    };
  }

  const purchasedCopy: GameItem = {
    ...item,
    id: `item_${item.templateId}_bought_${nowMs}_${state.inventory.length}`,
    stats: { ...item.stats },
  };

  return {
    state: {
      ...state,
      gold: state.gold - item.buyPrice,
      discoveredTemplates: [...new Set([...(state.discoveredTemplates ?? []), item.templateId])],
      inventory: [...state.inventory, purchasedCopy],
    },
  };
}

/**
 * Vender item do Inventário no Mercado
 */
export function sellItemFromInventory(
  state: GameState,
  inventoryItemId: string,
  goldMultiplier: number =
    1 + getActiveGuildBonuses(state.guildState).permanentGoldBonusPercent / 100
): { state: GameState; goldReceived: number; error?: string } {
  const idx = state.inventory.findIndex((i) => i.id === inventoryItemId);
  if (idx === -1) {
    return { state, goldReceived: 0, error: 'Item não encontrado no inventário.' };
  }

  const item = state.inventory[idx];
  const goldReceived = Math.round(item.sellPrice * Math.max(1, goldMultiplier));
  const nextInventory = [...state.inventory];
  nextInventory.splice(idx, 1);

  return {
    state: {
      ...state,
      gold: state.gold + goldReceived,
      discoveredTemplates: [...new Set([...(state.discoveredTemplates ?? []), item.templateId])],
      inventory: nextInventory,
    },
    goldReceived,
  };
}

/**
 * Calcula o custo em Ouro de um tratamento clínico no Valetudinarium (Medicina da Cidade).
 */
export function getMedicalTreatmentCost(
  treatment: MedicalTreatmentDefinition,
  playerLevel: number
): number {
  const safeLevel = Math.max(1, Math.floor(playerLevel));
  return Math.max(
    5,
    Math.round(treatment.baseGoldCost + (safeLevel - 1) * treatment.costPerLevel)
  );
}

/**
 * Executa um tratamento clínico imediato no Valetudinarium (Medicina da Cidade).
 */
export function applyMedicalTreatment(
  state: GameState,
  treatmentId: string,
  nowMs: number = Date.now()
): {
  state: GameState;
  healedHp: number;
  restoredEnergy: number;
  costPaid: number;
  error?: string;
} {
  const treatment = MEDICAL_TREATMENTS.find((t) => t.id === treatmentId);
  if (!treatment) {
    return {
      state,
      healedHp: 0,
      restoredEnergy: 0,
      costPaid: 0,
      error: 'Tratamento médico não encontrado no Valetudinarium.',
    };
  }

  if (state.level < treatment.minLevel) {
    return {
      state,
      healedHp: 0,
      restoredEnergy: 0,
      costPaid: 0,
      error: `Requer Nível ${treatment.minLevel} para receber ${treatment.name}.`,
    };
  }

  const derived = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    state.level,
    state.guildState,
    nowMs
  );

  const missingHp = Math.max(0, derived.maxHp - state.currentHp);
  const missingEnergy = Math.max(0, state.maxEnergy - state.energy);

  if (missingHp <= 0 && (treatment.restoreEnergy <= 0 || missingEnergy <= 0)) {
    return {
      state,
      healedHp: 0,
      restoredEnergy: 0,
      costPaid: 0,
      error: 'Sua vitalidade e vigor já estão no limite máximo.',
    };
  }

  const cost = getMedicalTreatmentCost(treatment, state.level);
  if (state.gold < cost) {
    return {
      state,
      healedHp: 0,
      restoredEnergy: 0,
      costPaid: 0,
      error: `Ouro insuficiente para ${treatment.name} (${cost} Ouro).`,
    };
  }

  const rawHeal = Math.ceil((derived.maxHp * treatment.healPercent) / 100);
  const nextHp = Math.min(derived.maxHp, state.currentHp + rawHeal);
  const nextEnergy = Math.min(state.maxEnergy, state.energy + treatment.restoreEnergy);

  return {
    state: {
      ...state,
      gold: state.gold - cost,
      currentHp: nextHp,
      energy: nextEnergy,
      lastSaveTimestampMs: nowMs,
    },
    healedHp: Math.max(0, nextHp - state.currentHp),
    restoredEnergy: Math.max(0, nextEnergy - state.energy),
    costPaid: cost,
  };
}

/**
 * Compra um suprimento médico diretamente no Valetudinarium da Cidade.
 */
export function buyMedicineTemplate(
  state: GameState,
  templateId: string,
  nowMs: number = Date.now()
): { state: GameState; itemBought?: GameItem; error?: string } {
  const tpl = MEDICINE_ITEM_TEMPLATES[templateId] ?? ITEM_TEMPLATES[templateId];
  if (!tpl || !tpl.consumable) {
    return { state, error: 'Suprimento médico não encontrado no catálogo.' };
  }

  if (state.gold < tpl.buyPrice) {
    return {
      state,
      error: `Saldo insuficiente. ${tpl.name} custa ${tpl.buyPrice} denários.`,
    };
  }

  if (state.inventory.length >= GAME_CONFIG.maxInventorySlots) {
    return {
      state,
      error: 'Mochila cheia (20/20)! Consuma ou venda itens antes de comprar.',
    };
  }

  const medItem = createItemFromTemplate(
    templateId,
    `med_${nowMs}_${state.inventory.length}`
  );

  return {
    state: {
      ...state,
      gold: state.gold - tpl.buyPrice,
      inventory: [...state.inventory, medItem],
    },
    itemBought: medItem,
  };
}

/**
 * Consome um suprimento médico da mochila para restaurar Vida (PV) e/ou Energia imediatamente.
 */
export function useMedicineFromInventory(
  state: GameState,
  inventoryItemId: string,
  nowMs: number = Date.now()
): {
  state: GameState;
  itemUsed?: GameItem;
  healedHp: number;
  restoredEnergy: number;
  error?: string;
} {
  const idx = state.inventory.findIndex((i) => i.id === inventoryItemId);
  if (idx === -1) {
    return {
      state,
      healedHp: 0,
      restoredEnergy: 0,
      error: 'Suprimento médico não encontrado na mochila.',
    };
  }

  const item = state.inventory[idx];
  const consumable = item.consumable ?? ITEM_TEMPLATES[item.templateId]?.consumable;
  if (!consumable) {
    return {
      state,
      healedHp: 0,
      restoredEnergy: 0,
      error: `${item.name} é um equipamento de combate, não um consumível médico.`,
    };
  }

  if (state.level < item.levelReq) {
    return {
      state,
      healedHp: 0,
      restoredEnergy: 0,
      error: `Requer Nível ${item.levelReq} para utilizar ${item.name}.`,
    };
  }

  const derived = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    state.level,
    state.guildState,
    nowMs
  );

  const missingHp = Math.max(0, derived.maxHp - state.currentHp);
  const missingEnergy = Math.max(0, state.maxEnergy - state.energy);

  if (missingHp <= 0 && (consumable.restoreEnergy <= 0 || missingEnergy <= 0)) {
    return {
      state,
      healedHp: 0,
      restoredEnergy: 0,
      error: 'Sua Vida e Energia já estão cheias; guarde o suprimento para quando precisar.',
    };
  }

  const nextInventory = [...state.inventory];
  nextInventory.splice(idx, 1);

  const nextHp = Math.min(derived.maxHp, state.currentHp + consumable.healHp);
  const nextEnergy = Math.min(state.maxEnergy, state.energy + consumable.restoreEnergy);

  return {
    state: {
      ...state,
      currentHp: nextHp,
      energy: nextEnergy,
      inventory: nextInventory,
      lastSaveTimestampMs: nowMs,
    },
    itemUsed: item,
    healedHp: Math.max(0, nextHp - state.currentHp),
    restoredEnergy: Math.max(0, nextEnergy - state.energy),
  };
}

/**
 * Cálculo de Progressão por Timestamps (Segundo Plano e Offline).
 * Respeita o limite de 8 horas (28.800s), aplica o Balneário da Guilda na regeneração de Vida,
 * e calcula a janela proporcional exata dos Pergaminhos Temporários da Biblioteca (Seção 7).
 */
export function calculateElapsedIdleProgress(
  state: GameState,
  nowMs: number
): {
  state: GameState;
  offlineBatchCreated: PendingRewardBatch | null;
} {
  const rawElapsedSeconds = Math.max(0, (nowMs - state.lastSaveTimestampMs) / 1000);
  if (rawElapsedSeconds <= 0) {
    return { state, offlineBatchCreated: null };
  }

  const wasCapped = rawElapsedSeconds > GAME_CONFIG.maxOfflineSeconds;
  const effectiveSeconds = Math.min(rawElapsedSeconds, GAME_CONFIG.maxOfflineSeconds);
  const windowStartMs = state.lastSaveTimestampMs;
  const windowEndMs = windowStartMs + effectiveSeconds * 1000;

  const derived = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    state.level,
    state.guildState,
    nowMs
  );

  // Acumule frações antes de arredondar: o tick da interface ocorre a cada 1s.
  // Milissegundos e unidades de PV/min evitam perder progresso em cada chamada.
  const elapsedMs = Math.round(effectiveSeconds * 1000);
  const energyIntervalMs = GAME_CONFIG.energyRegenIntervalSeconds * 1000;
  const energyMs = (state.regenerationRemainder?.energyMs ?? 0) + elapsedMs;
  const hpUnits = (state.regenerationRemainder?.hpUnits ?? 0) +
    elapsedMs * derived.hpRegenPerMinute;
  const energyRegenPoints = Math.floor(energyMs / energyIntervalMs);
  const hpRegenPoints = Math.floor(hpUnits / 60_000);

  let nextEnergy = Math.min(state.maxEnergy, state.energy + energyRegenPoints);
  let nextHp = Math.min(derived.maxHp, state.currentHp + hpRegenPoints);

  state = {
    ...state,
    regenerationRemainder: {
      energyMs: nextEnergy >= state.maxEnergy ? 0 : energyMs % energyIntervalMs,
      hpUnits: nextHp >= derived.maxHp ? 0 : hpUnits % 60_000,
    },
  };

  // Limpa buffs expirados do registro da guilda após contabilizar a janela
  const playerGuild = state.guildState?.playerGuildId
    ? state.guildState.guilds.find((g) => g.id === state.guildState.playerGuildId)
    : undefined;
  const guildBuffsDuringWindow = playerGuild?.activeBuffs ?? [];

  if (!state.idle.active) {
    return {
      state: {
        ...state,
        energy: nextEnergy,
        currentHp: nextHp,
        lastSaveTimestampMs: nowMs,
        idle: {
          ...state.idle,
          lastUpdatedAtMs: nowMs,
        },
      },
      offlineBatchCreated: null,
    };
  }

  const region =
    EXPEDITION_REGIONS.find((r) => r.id === state.idle.regionId) ?? EXPEDITION_REGIONS[0];
  const enemy = region.enemies[state.idle.enemyIndex] ?? region.enemies[0];
  const focusMode: IdleFocusMode = state.idle.focusMode ?? 'gold';

  const totalCycleSeconds = state.idle.accumulatedSecondsInCurrentCycle + effectiveSeconds;
  const maxCyclesByTime = Math.floor(totalCycleSeconds / region.durationSeconds);
  const remainingCycleSeconds = totalCycleSeconds % region.durationSeconds;

  if (maxCyclesByTime <= 0) {
    return {
      state: {
        ...state,
        energy: nextEnergy,
        currentHp: nextHp,
        lastSaveTimestampMs: nowMs,
        idle: {
          ...state.idle,
          lastUpdatedAtMs: nowMs,
          accumulatedSecondsInCurrentCycle: remainingCycleSeconds,
        },
      },
      offlineBatchCreated: null,
    };
  }

  const totalAvailableEnergy = state.energy + energyRegenPoints;
  const maxCyclesByEnergy = Math.floor(
    totalAvailableEnergy / Math.max(1, region.energyCost)
  );

  if (maxCyclesByEnergy <= 0) {
    return {
      state: {
        ...state,
        energy: nextEnergy,
        currentHp: nextHp,
        lastSaveTimestampMs: nowMs,
        idle: {
          ...state.idle,
          lastUpdatedAtMs: nowMs,
          accumulatedSecondsInCurrentCycle: 0,
          pausedReason:
            'Energia esgotada. A patrulha retomará automaticamente assim que regenerar 1 ponto de Energia (a cada 3 min).',
        },
      },
      offlineBatchCreated: null,
    };
  }

  const cyclesToExecute = Math.min(maxCyclesByTime, maxCyclesByEnergy);

  const sampleCount = Math.min(cyclesToExecute, 5);
  let sampleWins = 0;
  let sampleGold = 0;
  let sampleXp = 0;
  let sampleDamageTaken = 0;
  const droppedItems: GameItem[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const outcome = resolveCombat(
      { ...state, currentHp: derived.maxHp },
      enemy,
      {
        mode: 'expedition',
        locationName: region.name,
        focusMode,
        seed: state.lastSaveTimestampMs + (i + 1) * 7919,
        timestampMs: windowStartMs,
        ignoreGuildLibraryBuffs: true, // Calculamos a fração exata da janela abaixo (Seção 7)
      }
    );
    if (outcome.report.victory) {
      sampleWins += 1;
    }
    sampleGold += outcome.rewardBatch.gold;
    sampleXp += outcome.rewardBatch.xp;
    sampleDamageTaken += outcome.report.totalEnemyDamageDealt;
    if (outcome.rewardBatch.items.length > 0 && droppedItems.length < 4) {
      droppedItems.push(
        ...outcome.rewardBatch.items.map((it, idx) => ({
          ...it,
          id: `${it.id}_idle_${i}_${idx}`,
        }))
      );
    }
  }

  // Cálculo proporcional exato de benefícios temporários da Biblioteca na janela [windowStartMs, windowEndMs]
  const goldBuffOverlap = getBuffOverlapRatioInWindow(
    guildBuffsDuringWindow,
    'scroll_mercury_gold',
    windowStartMs,
    windowEndMs
  );
  const xpBuffOverlap = getBuffOverlapRatioInWindow(
    guildBuffsDuringWindow,
    'scroll_minerva_xp',
    windowStartMs,
    windowEndMs
  );

  const permanentGuildBonuses = getActiveGuildBonuses(state.guildState, windowStartMs);
  const permanentGoldMultiplier =
    1 + permanentGuildBonuses.permanentGoldBonusPercent / 100;
  const permanentXpMultiplier =
    1 + permanentGuildBonuses.permanentXpBonusPercent / 100;
  const goldWindowMult =
    (1 + (permanentGuildBonuses.permanentGoldBonusPercent +
      goldBuffOverlap.bonusPercent * goldBuffOverlap.ratio) / 100) /
    permanentGoldMultiplier;
  const xpWindowMult =
    (1 + (permanentGuildBonuses.permanentXpBonusPercent +
      xpBuffOverlap.bonusPercent * xpBuffOverlap.ratio) / 100) /
    permanentXpMultiplier;

  const scaleFactor = cyclesToExecute / sampleCount;
  const totalVictories = Math.round(sampleWins * scaleFactor);
  const totalDefeats = Math.max(0, cyclesToExecute - totalVictories);
  const totalGold = Math.round(sampleGold * scaleFactor * goldWindowMult);
  const totalXp = Math.round(sampleXp * scaleFactor * xpWindowMult);
  const totalHonor = totalVictories * enemy.level * 2;

  const energySpent = cyclesToExecute * region.energyCost;
  nextEnergy = Math.max(0, Math.min(state.maxEnergy, totalAvailableEnergy - energySpent));

  const netHpAfterCombat =
    nextHp - Math.round((sampleDamageTaken / sampleCount) * 0.65);
  const floorHp = Math.max(10, Math.round(derived.maxHp * GAME_CONFIG.defeatMinHpPercent));
  nextHp = Math.max(floorHp, Math.min(derived.maxHp, netHpAfterCombat));

  const deterministicClaimId = `idle_batch_${state.lastSaveTimestampMs}_${nowMs}`;
  const alreadyClaimed =
    state.claimedRewardIds.includes(deterministicClaimId) ||
    state.pendingRewards.some((b) => b.claimId === deterministicClaimId);

  const focusDef = IDLE_FOCUS_DEFINITIONS[focusMode];
  const batch: PendingRewardBatch | null = alreadyClaimed
    ? null
    : {
        claimId: deterministicClaimId,
        sourceTitle: `Patrulha (${focusDef.label}): ${region.name}`,
        sourceMode: 'offline_idle',
        focusMode,
        createdAt: nowMs,
        gold: totalGold,
        xp: totalXp,
        honor: totalHonor,
        items: droppedItems,
        cyclesCompleted: cyclesToExecute,
        victories: totalVictories,
        defeats: totalDefeats,
        elapsedSecondsAccounted: effectiveSeconds,
        wasCappedAtMaxOffline: wasCapped,
        claimed: false,
      };

  const nextState: GameState = {
    ...state,
    energy: nextEnergy,
    currentHp: nextHp,
    wins: state.wins + totalVictories,
    losses: state.losses + totalDefeats,
    lastSaveTimestampMs: nowMs,
    idle: {
      ...state.idle,
      focusMode,
      lastUpdatedAtMs: nowMs,
      accumulatedSecondsInCurrentCycle: remainingCycleSeconds,
      pausedReason:
        nextEnergy < region.energyCost
          ? 'Aguardando regeneração de energia (+1 a cada 3 min) para o próximo ciclo.'
          : null,
    },
    pendingRewards: batch ? [...state.pendingRewards, batch] : state.pendingRewards,
  };

  return {
    state: syncPlayerWithGuildAndFeats(nextState),
    offlineBatchCreated: batch,
  };
}

export interface SaveLoadInspectionResult {
  status: 'fresh' | 'loaded' | 'corrupted';
  state: GameState;
  rawCorruptedData?: string;
  corruptionError?: string;
}

/**
 * Inspeciona, valida e migra saves existentes (v1/v2/v3 -> v4) sem nunca apagar silenciosamente
 * um save corrompido. Preserva Honra, Ouro, Nível e Inventário.
 */
export function inspectAndLoadSaveState(
  rawJson: string | null,
  nowMs: number = Date.now()
): SaveLoadInspectionResult {
  if (!rawJson) {
    return {
      status: 'fresh',
      state: createInitialGameState(nowMs),
    };
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.level !== 'number' ||
      parsed.level < 1 ||
      typeof parsed.gold !== 'number' ||
      !parsed.baseStats ||
      typeof parsed.baseStats.strength !== 'number'
    ) {
      return {
        status: 'corrupted',
        state: createInitialGameState(nowMs),
        rawCorruptedData: rawJson,
        corruptionError:
          'Os dados salvos localmente possuem campos ausentes ou estrutura incompatível.',
      };
    }

    const fallback = createInitialGameState(nowMs);
    const hasExistingProgress =
      (parsed.wins ?? 0) > 0 || (parsed.level ?? 1) > 1 || (parsed.gold ?? 160) !== 160;

    const migratedTutorial: TutorialState =
      parsed.tutorial && typeof parsed.tutorial === 'object'
        ? {
            step: parsed.tutorial.step ?? 'start_expedition',
            skipped: Boolean(parsed.tutorial.skipped),
          }
        : {
            step: hasExistingProgress ? 'completed' : 'start_expedition',
            skipped: false,
          };

    const migratedGuildState: GuildStateContainer =
      parsed.guildState &&
      typeof parsed.guildState === 'object' &&
      Array.isArray(parsed.guildState.guilds)
        ? {
            ...fallback.guildState,
            ...parsed.guildState,
            processedTransactionIds: Array.isArray(
              parsed.guildState.processedTransactionIds
            )
              ? parsed.guildState.processedTransactionIds
              : [],
            lastVillaMediciUseMs:
              typeof parsed.guildState.lastVillaMediciUseMs === 'number'
                ? parsed.guildState.lastVillaMediciUseMs
                : 0,
          }
        : fallback.guildState;

    const migratedFame =
      typeof parsed.fame === 'number'
        ? parsed.fame
        : Math.max(25, (parsed.honor ?? 20) + (parsed.wins ?? 0) * 6 + ((parsed.level ?? 1) - 1) * 15);

    const migratedGoldLooted =
      typeof parsed.goldLooted === 'number'
        ? parsed.goldLooted
        : Math.max(0, (parsed.wins ?? 0) * 24);

    const rawMigrated: GameState = {
      ...fallback,
      ...parsed,
      version: GAME_CONFIG.saveVersion,
      fame: migratedFame,
      goldLooted: migratedGoldLooted,
      completedFeats: Array.isArray(parsed.completedFeats) ? parsed.completedFeats : [],
      baseStats: {
        ...fallback.baseStats,
        ...parsed.baseStats,
      },
      equipped:
        parsed.equipped && typeof parsed.equipped === 'object'
          ? parsed.equipped
          : fallback.equipped,
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : fallback.inventory,
      marketStock: (() => {
        if (!Array.isArray(parsed.marketStock) || parsed.marketStock.length === 0) {
          return fallback.marketStock;
        }
        const existingTemplates = new Set(
          parsed.marketStock.map((m: GameItem) => m?.templateId)
        );
        const missingItems = fallback.marketStock.filter(
          (fItem) => !existingTemplates.has(fItem.templateId)
        );
        return [...parsed.marketStock, ...missingItems];
      })(),
      idle: {
        ...fallback.idle,
        ...(parsed.idle || {}),
        focusMode: parsed.idle?.focusMode ?? 'gold',
      },
      dungeonProgress: {
        ...fallback.dungeonProgress,
        ...(parsed.dungeonProgress || {}),
      },
      pendingRewards: Array.isArray(parsed.pendingRewards) ? parsed.pendingRewards : [],
      claimedRewardIds: Array.isArray(parsed.claimedRewardIds) ? parsed.claimedRewardIds : [],
      combatHistory: Array.isArray(parsed.combatHistory) ? parsed.combatHistory : [],
      tutorial: migratedTutorial,
      guildState: migratedGuildState,
    };

    const syncedState = syncPlayerWithGuildAndFeats(rawMigrated);

    return {
      status: 'loaded',
      state: syncedState,
    };
  } catch (err) {
    return {
      status: 'corrupted',
      state: createInitialGameState(nowMs),
      rawCorruptedData: rawJson,
      corruptionError:
        err instanceof Error
          ? `Falha ao ler o arquivo de progresso: ${err.message}`
          : 'Formato JSON inválido no armazenamento local.',
    };
  }
}

/**
 * Mantém compatibilidade retroativa para chamadas diretas.
 */
export function parseAndValidateSaveState(
  rawJson: string | null,
  nowMs: number = Date.now()
): GameState {
  return inspectAndLoadSaveState(rawJson, nowMs).state;
}

export { ARENA_OPPONENTS, DUNGEONS, EXPEDITION_REGIONS };

