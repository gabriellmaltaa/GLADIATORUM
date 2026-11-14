import fs from 'node:fs';
import { claimContract } from '../game/contracts.ts';
import { EXPANSION_MARKET_IDS } from '../game/expansion.ts';
import path from 'node:path';
import {
  ARENA_OPPONENTS,
  DUNGEONS,
  type EquipmentSlotType,
  EXPEDITION_REGIONS,
  GAME_CONFIG,
  type ForgeStatKey,
  type GameItem,
  type IdleFocusMode,
  ITEM_TEMPLATES,
  type PrimaryStatKey,
} from '../game/config.ts';
import {
  type ActiveLibraryBuff,
  GUILD_BUILDING_DEFINITIONS,
  GUILD_CONFIG,
  GUILD_PERMISSIONS,
  type GuildApplicationRecord,
  type GuildAuditEntry,
  type GuildBankTransaction,
  type GuildBuildingId,
  type GuildEmblemId,
  type GuildMemberRecord,
  type GuildRecord,
  type GuildRecruitmentStatus,
  type GuildRole,
  getBuildingUpgradeCost,
  getGuildMaxCapacity,
  getInternalMarketTemplateIdsForLevel,
  LIBRARY_SCROLL_DEFINITIONS,
  type LibraryScrollId,
  type PlayerRankingCategory,
} from '../game/guildsAndRankings.ts';
import {
  advanceTutorialIfMatching,
  applyMedicalTreatment,
  type BaseAttributes,
  buyItemFromMarket,
  buyMedicineTemplate,
  calculateDerivedStats,
  calculateElapsedIdleProgress,
  claimPendingReward,
  type CombatReport,
  createInitialGameState,
  createItemFromTemplate,
  equipItemFromInventory,
  evaluateUnlockedFeats,
  forgeItem,
  type GameState,
  inspectAndLoadSaveState,
  type PendingRewardBatch,
  resolveCombat,
  sellItemFromInventory,
  trainGladiatorStat,
  unequipSlotToInventory,
  useMedicineFromInventory,
} from '../game/rules.ts';

export type CompetitiveStatus = 'verified_online' | 'migrated_capped';

export interface AuthenticatedIdentity {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

export interface OnlinePublicPlayerProfile {
  id: string;
  uid: string;
  name: string;
  title: string;
  level: number;
  honor: number;
  fame: number;
  wins: number;
  losses: number;
  featsCount: number;
  goldLooted: number;
  guildId: string | null;
  guildName: string | null;
  guildTag: string | null;
  damageRange: string;
  armor: number;
  competitiveStatus: CompetitiveStatus;
  updatedAtMs: number;
}

export interface AuthoritativePlayerRecord {
  uid: string;
  email: string;
  competitiveStatus: CompetitiveStatus;
  migratedFromLocal: boolean;
  migrationSummary: MigrationReport | null;
  state: GameState;
  processedOpIds: string[];
  lastVillaMediciUseMs: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface MigrationReport {
  migratedAtMs: number;
  sourceVersion: number;
  competitiveStatus: CompetitiveStatus;
  backupKey: string;
  originalLevel: number;
  cappedLevel: number;
  originalGold: number;
  cappedGold: number;
  originalHonor: number;
  cappedHonor: number;
  appliedCaps: string[];
  preservedFields: string[];
  cappedAdjustments: string[];
  policyExplanation: string;
}

export interface CursorPaginatedPlayersResponse {
  items: (OnlinePublicPlayerProfile & { rank: number; isPlayer: boolean })[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPlayers: number;
  myPosition: number | null;
  myEntry: (OnlinePublicPlayerProfile & { rank: number; isPlayer: boolean }) | null;
  playerOwnEntry: (OnlinePublicPlayerProfile & { rank: number; isPlayer: boolean }) | null;
  category: PlayerRankingCategory;
  updatedAtMs: number;
  positionStrategy: 'exact_server_index';
}

export interface OnlineGuildRankingItem {
  rank: number;
  id: string;
  name: string;
  tag: string;
  emblemId: GuildEmblemId;
  description: string;
  leaderId: string;
  leaderName: string;
  memberCount: number;
  maxCapacity: number;
  totalHonor: number;
  averageHonor: number;
  recruitmentStatus: GuildRecruitmentStatus;
  minLevelReq: number;
  minHonorReq: number;
  isPlayerGuild: boolean;
}

export interface CursorPaginatedGuildsResponse {
  items: OnlineGuildRankingItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalGuilds: number;
  myGuildPosition: number | null;
  playerGuildEntry: OnlineGuildRankingItem | null;
  updatedAtMs: number;
}

export type AuthoritativeActionType =
  | 'claim_contract'
  | 'update_gladiator_name'
  | 'equip_item'
  | 'unequip_slot'
  | 'sell_item'
  | 'buy_market_item'
  | 'train_stat'
  | 'forge_upgrade'
  | 'heal_barracks'
  | 'restore_health_barracks'
  | 'use_medicine_item'
  | 'buy_medicine_item'
  | 'apply_medical_treatment'
  | 'combat_expedition'
  | 'start_expedition'
  | 'combat_arena'
  | 'challenge_arena'
  | 'combat_dungeon'
  | 'fight_dungeon'
  | 'reset_dungeon'
  | 'claim_reward'
  | 'idle_start'
  | 'toggle_idle'
  | 'idle_stop'
  | 'stop_idle'
  | 'idle_focus'
  | 'change_idle_focus'
  | 'idle_sync'
  | 'sync_idle'
  | 'skip_tutorial'
  | 'restart_tutorial'
  | 'guild_create'
  | 'guild_apply_or_join'
  | 'guild_cancel_application'
  | 'guild_review_application'
  | 'guild_leave'
  | 'guild_transfer_leadership'
  | 'guild_dissolve'
  | 'guild_change_role'
  | 'guild_kick_member'
  | 'guild_update_profile'
  | 'guild_post_announcement'
  | 'guild_donate_gold'
  | 'guild_upgrade_building'
  | 'guild_use_villa_medici'
  | 'guild_activate_scroll'
  | 'guild_activate_library_scroll'
  | 'guild_warehouse_deposit'
  | 'guild_deposit_warehouse'
  | 'guild_warehouse_withdraw'
  | 'guild_withdraw_warehouse'
  | 'guild_buy_internal_market';

export interface AuthoritativeActionPayload {
  opId: string;
  action: AuthoritativeActionType;
  params?: Record<string, unknown>;
}

export interface AuthoritativeActionResponse {
  ok: boolean;
  idempotentReplay: boolean;
  message: string;
  error?: string;
  serverTimestampMs: number;
  state: GameState;
  statChanges?: {
    sourceLabel: string;
    deltas: { label: string; before: number | string; after: number | string }[];
  } | null;
  combatReport?: CombatReport | null;
  offlineBatchCreated?: PendingRewardBatch | null;
  leveledUp?: boolean;
  playerRank: number;
  guildRank: number | null;
}

const MAX_RETAINED_OP_IDS = 120;
const MAX_RETAINED_LEDGER_ENTRIES = 50;
const MAX_RETAINED_AUDIT_ENTRIES = 50;
const MAX_RETAINED_ANNOUNCEMENTS = 20;
const GOVERNO_VIP_OWNER_UID = 'fB4SJKCiOgU8eEXnpLBimgKglvf1';

import { MIGRATION_COMPETITIVE_CAPS } from '../game/onlinePolicy.ts';
export { MIGRATION_COMPETITIVE_CAPS } from '../game/onlinePolicy.ts';

export function normalizeGuildNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeGuildTagKey(tag: string): string {
  return tag.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Motor Autoritativo do Servidor (Server-as-Authority).
 * Executa validações de economia, combate, tempo offline, guildas compartilhadas e rankings paginados por cursor.
 */
export class OnlineAuthorityEngine {
  private players = new Map<string, AuthoritativePlayerRecord>();
  private guilds = new Map<string, GuildRecord>();
  private txChain: Promise<unknown> = Promise.resolve();
  private persistencePath: string | null;
  private launchId: string | null;
  private cachedPlayerRankings = new Map<
    PlayerRankingCategory,
    { computedAtMs: number; list: (OnlinePublicPlayerProfile & { rank: number })[] }
  >();
  private cachedGuildRankings: {
    computedAtMs: number;
    list: Omit<OnlineGuildRankingItem, 'isPlayerGuild'>[];
  } | null = null;
  private metrics = {
    totalRequests: 0,
    totalMutations: 0,
    totalTransactions: 0,
    totalIdempotentReplays: 0,
    totalErrors: 0,
    contentionRetries: 0,
    readsObserved: 0,
    writesObserved: 0,
  };

  constructor(options?: { persistencePath?: string | null; seedInitialOnlineGuilds?: boolean; launchId?: string }) {
    this.persistencePath = options?.persistencePath ?? null;
    this.launchId = options?.launchId ?? null;
    if (this.persistencePath) {
      this.loadFromDisk();
    }
    if (this.guilds.size === 0 && (options?.seedInitialOnlineGuilds ?? true)) {
      this.seedFoundationalOnlineGuilds(Date.now());
    }
    const governoOwner = this.players.get(GOVERNO_VIP_OWNER_UID);
    if (governoOwner && this.ensureGovernoVipGuild(governoOwner, Date.now())) {
      this.saveToDisk();
    }
  }

  private activeLockCount = 0;

  /**
   * Fila transacional atômica para impedir condições de corrida (ex: aprovar simultaneamente a última vaga de guilda ou doar/melhorar edifícios concorrentemente).
   */
  public async runExclusiveTransaction<T>(fn: () => T | Promise<T>): Promise<T> {
    this.metrics.totalTransactions += 1;
    if (this.activeLockCount > 0) {
      this.metrics.contentionRetries += 1;
    }
    this.activeLockCount += 1;
    const prev = this.txChain;
    let release!: () => void;
    this.txChain = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prev;
    try {
      const result = await fn();
      return result;
    } finally {
      this.activeLockCount -= 1;
      release();
    }
  }

  public getMetricsSnapshot() {
    return {
      ...this.metrics,
      totalPlayers: this.players.size,
      totalGuilds: this.guilds.size,
    };
  }

  public getDiagnostics() {
    return {
      ...this.metrics,
      contentionCount: this.metrics.contentionRetries,
      totalPlayers: this.players.size,
      totalGuilds: this.guilds.size,
    };
  }

  private cachedMemberToGuildMap: Map<string, string> | null = null;
  private cachedPublicProfiles = new Map<string, OnlinePublicPlayerProfile>();
  private cachedRankMapByCategory = new Map<PlayerRankingCategory, Map<string, number>>();

  private invalidateRankingCaches(invalidateGuildMembership = true) {
    this.cachedPlayerRankings.clear();
    this.cachedRankMapByCategory.clear();
    this.cachedGuildRankings = null;
    if (invalidateGuildMembership) {
      this.cachedMemberToGuildMap = null;
      this.cachedPublicProfiles.clear();
    }
  }

  private seedFoundationalOnlineGuilds(nowMs: number) {
    // Cria 2 guildas públicas inaugurais na província online sem inflar com os 17 NPCs do modo local
    const founderUid1 = 'founder_capua_legio';
    const founderUid2 = 'founder_capua_mars';

    const makeFounderRecord = (
      uid: string,
      name: string,
      title: string,
      level: number,
      honor: number,
      fame: number,
      wins: number,
      guildId: string
    ): AuthoritativePlayerRecord => {
      const base = createInitialGameState(nowMs);
      base.name = name;
      base.title = title;
      base.level = level;
      base.honor = honor;
      base.fame = fame;
      base.wins = wins;
      base.goldLooted = wins * 35;
      base.guildState = {
        ...base.guildState,
        playerGuildId: guildId,
        guilds: [],
        simulatedGladiators: [],
      };
      return {
        uid,
        email: `${uid}@ludus.capua.local`,
        competitiveStatus: 'verified_online',
        migratedFromLocal: false,
        migrationSummary: null,
        state: base,
        processedOpIds: [],
        lastVillaMediciUseMs: 0,
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      };
    };

    const p1 = makeFounderRecord(
      founderUid1,
      'Marcus Valerius Corvus',
      'Magister de Cápua',
      3,
      90,
      120,
      9,
      'online_guild_legio_capua'
    );
    const p2 = makeFounderRecord(
      founderUid2,
      'Titus Flavius Sabinus',
      'Centurião da Via Ápia',
      2,
      55,
      80,
      5,
      'online_guild_ordo_martis'
    );

    this.players.set(founderUid1, p1);
    this.players.set(founderUid2, p2);

    const guild1: GuildRecord = {
      id: 'online_guild_legio_capua',
      name: 'Legio Prima Capuana',
      tag: 'LPC',
      emblemId: 'aquila_imperial',
      description:
        'Aliança aberta aos gladiadores autenticados da província de Cápua. Sede online compartilhada.',
      recruitmentStatus: 'open',
      minLevelReq: 1,
      minHonorReq: 0,
      treasuryGold: 220,
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
          id: founderUid1,
          name: p1.state.name,
          title: p1.state.title,
          isPlayer: false,
          role: 'leader',
          level: p1.state.level,
          honor: p1.state.honor,
          fame: p1.state.fame,
          wins: p1.state.wins,
          goldLooted: p1.state.goldLooted,
          featsCount: evaluateUnlockedFeats(p1.state).length,
          goldContributed: 220,
          joinedAtMs: nowMs,
        },
      ],
      applications: [],
      warehouseItems: [createItemFromTemplate('galea_recruit', 'online_wh_1')],
      internalMarketTemplateIds: getInternalMarketTemplateIdsForLevel(2),
      activeBuffs: [],
      bankHistory: [
        {
          txId: 'tx_online_seed_1',
          type: 'donation',
          authorName: p1.state.name,
          amount: 220,
          description: 'Fundo inaugural do Aerarium',
          timestampMs: nowMs,
        },
      ],
      auditLog: [
        {
          id: 'audit_online_seed_1',
          actorName: p1.state.name,
          action: 'Fundou a Legio Prima Capuana [LPC] no servidor.',
          timestampMs: nowMs,
        },
      ],
      announcements: [
        {
          id: 'ann_online_seed_1',
          authorName: p1.state.name,
          authorRole: 'leader',
          content:
            'Bem-vindos à Legio Prima Capuana! Campo de Treino Nv.2 (-8% custo) ativo para todos os membros.',
          timestampMs: nowMs,
        },
      ],
      createdAtMs: nowMs,
      isSimulatedSeed: false,
    };

    const guild2: GuildRecord = {
      id: 'online_guild_ordo_martis',
      name: 'Ordo Martis Ultoris',
      tag: 'OMU',
      emblemId: 'gladius_crossed',
      description:
        'Irmandade tática consagrada a Marte Ultor. Recrutamento por avaliação de candidatura.',
      recruitmentStatus: 'application',
      minLevelReq: 1,
      minHonorReq: 10,
      treasuryGold: 160,
      buildings: {
        forum_gladiatorius: 1,
        banco: 1,
        campo_treino: 1,
        balneario: 2,
        villa_medici: 1,
        biblioteca: 1,
        armazem: 1,
        mercado_interno: 1,
      },
      members: [
        {
          id: founderUid2,
          name: p2.state.name,
          title: p2.state.title,
          isPlayer: false,
          role: 'leader',
          level: p2.state.level,
          honor: p2.state.honor,
          fame: p2.state.fame,
          wins: p2.state.wins,
          goldLooted: p2.state.goldLooted,
          featsCount: evaluateUnlockedFeats(p2.state).length,
          goldContributed: 160,
          joinedAtMs: nowMs,
        },
      ],
      applications: [],
      warehouseItems: [],
      internalMarketTemplateIds: getInternalMarketTemplateIdsForLevel(1),
      activeBuffs: [],
      bankHistory: [],
      auditLog: [
        {
          id: 'audit_online_seed_2',
          actorName: p2.state.name,
          action: 'Fundou a Ordo Martis Ultoris [OMU] no servidor.',
          timestampMs: nowMs,
        },
      ],
      announcements: [],
      createdAtMs: nowMs,
      isSimulatedSeed: false,
    };

    this.guilds.set(guild1.id, guild1);
    this.guilds.set(guild2.id, guild2);
    this.invalidateRankingCaches();
  }

  private loadFromDisk() {
    if (!this.persistencePath) return;
    try {
      if (!fs.existsSync(this.persistencePath)) return;
      const raw = fs.readFileSync(this.persistencePath, 'utf-8');
      const parsed = JSON.parse(raw) as {
        launchId?: string;
        players?: [string, AuthoritativePlayerRecord][];
        guilds?: [string, GuildRecord][];
      };
      if (this.launchId && parsed.launchId !== this.launchId) {
        // Preserve the entire prelaunch dataset on the persistent volume before resetting.
        fs.copyFileSync(this.persistencePath, `${this.persistencePath}.prelaunch-${Date.now()}.json`, fs.constants.COPYFILE_EXCL);
        this.players.clear();
        this.guilds.clear();
        this.saveToDisk();
        return;
      }
      if (Array.isArray(parsed.players)) {
        this.players = new Map(parsed.players);
      }
      if (Array.isArray(parsed.guilds)) {
        this.guilds = new Map(parsed.guilds);
      }
      this.invalidateRankingCaches();
    } catch (error) {
      if (this.launchId) throw error;
      // Se o arquivo de disco não puder ser lido, inicia limpo
    }
  }

  private saveToDisk() {
    if (!this.persistencePath) return;
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const payload = JSON.stringify({
        launchId: this.launchId,
        players: Array.from(this.players.entries()),
        guilds: Array.from(this.guilds.entries()),
      });
      const tmpPath = `${this.persistencePath}.tmp`;
      fs.writeFileSync(tmpPath, payload, 'utf-8');
      fs.renameSync(tmpPath, this.persistencePath);
    } catch (error) {
      if (this.launchId) throw error;
      // Ignora erro de escrita em ambientes read-only
    }
  }

  /**
   * Constrói a visão personalizada do estado do jogador com as guildas online compartilhadas
   * (marcando `isPlayer: true` apenas no membro correspondente ao `uid` autenticado).
   */
  private buildClientGameStateForPlayer(record: AuthoritativePlayerRecord, nowMs: number): GameState {
    if (record.state.tutorial.step === 'equip_item' && record.state.equipped.helmet) {
      record.state.tutorial = advanceTutorialIfMatching(record.state.tutorial, 'equip_item');
    }
    const stockIds = new Set(record.state.marketStock.map(item => item.templateId));
    record.state.marketStock = [...record.state.marketStock, ...EXPANSION_MARKET_IDS
      .filter(id => !stockIds.has(id)).map(id => createItemFromTemplate(id, `expansion_${id}`))];
    record.state.discoveredTemplates = [...new Set([...(record.state.discoveredTemplates ?? []),
      ...record.state.inventory.map(i => i.templateId),
      ...Object.values(record.state.equipped).filter(Boolean).map(i => i!.templateId)])];
    const playerGuildId = this.findPlayerGuildId(record.uid);
    const sharedGuildsForClient: GuildRecord[] = [];

    for (const g of this.guilds.values()) {
      // Inclui sempre a guilda do próprio jogador e até 24 guildas públicas para o diretório
      if (g.id !== playerGuildId && sharedGuildsForClient.length >= 24) {
        continue;
      }
      const hasPlayerMember = g.id === playerGuildId;
      const hasPlayerApp = g.applications.some((a) => a.applicantId === record.uid);
      if (!hasPlayerMember && !hasPlayerApp) {
        sharedGuildsForClient.push(g);
      } else {
        sharedGuildsForClient.push({
          ...g,
          members: hasPlayerMember
            ? g.members.map((m) => ({
                ...m,
                isPlayer: m.id === record.uid,
              }))
            : g.members,
          applications: hasPlayerApp
            ? g.applications.map((a) => ({
                ...a,
                isPlayer: a.applicantId === record.uid,
              }))
            : g.applications,
        });
      }
    }

    // Gladiadores públicos fora de guildas (limitado aos primeiros 20 com corte antecipado O(1))
    const independentPlayers: GameState['guildState']['simulatedGladiators'] = [];
    for (const p of this.players.values()) {
      if (independentPlayers.length >= 20) break;
      if (p.uid === record.uid || this.findPlayerGuildId(p.uid)) continue;
      const pub = this.toPublicProfile(p, nowMs);
      independentPlayers.push({
        id: pub.uid,
        name: pub.name,
        title: pub.title,
        guildId: pub.guildId,
        level: pub.level,
        honor: pub.honor,
        fame: pub.fame,
        wins: pub.wins,
        losses: pub.losses,
        featsCount: pub.featsCount,
        goldLooted: pub.goldLooted,
        damageRange: pub.damageRange,
        armor: pub.armor,
      });
    }

    return {
      ...record.state,
      completedFeats: evaluateUnlockedFeats(record.state),
      guildState: {
        playerGuildId,
        guilds: sharedGuildsForClient,
        simulatedGladiators: independentPlayers,
        processedTransactionIds: record.processedOpIds.slice(-50),
        lastVillaMediciUseMs: record.lastVillaMediciUseMs,
        lastUpdatedAtMs: nowMs,
      },
    };
  }

  private findPlayerGuildId(uid: string): string | null {
    if (!this.cachedMemberToGuildMap) {
      const map = new Map<string, string>();
      for (const guild of this.guilds.values()) {
        for (const m of guild.members) {
          map.set(m.id, guild.id);
        }
      }
      this.cachedMemberToGuildMap = map;
    }
    return this.cachedMemberToGuildMap.get(uid) ?? null;
  }

  private getPermanentGuildRewardPercent(uid: string, kind: 'gold' | 'xp'): number {
    const guildId = this.findPlayerGuildId(uid);
    const guild = guildId ? this.guilds.get(guildId) : undefined;
    if (!guild || !guild.members.some((member) => member.id === uid)) return 0;
    return Math.max(
      0,
      kind === 'gold'
        ? guild.permanentGoldBonusPercent ?? 0
        : guild.permanentXpBonusPercent ?? 0
    );
  }

  private ensureGovernoVipGuild(record: AuthoritativePlayerRecord, nowMs: number): boolean {
    if (record.uid !== GOVERNO_VIP_OWNER_UID) return false;

    const guildId = 'vip_guild_governo_xxmalta';
    let guild = this.guilds.get(guildId);
    if (!guild) {
      const nameConflict = Array.from(this.guilds.values()).find(
        (candidate) => candidate.name.trim().toLowerCase() === 'governo'
      );
      if (nameConflict) {
        console.warn(
          `A guilda VIP GOVERNO não foi provisionada: o nome já pertence à guilda [${nameConflict.tag}].`
        );
        return false;
      }

      guild = {
        id: guildId,
        name: 'GOVERNO',
        tag: 'GOV',
        emblemId: 'aquila_imperial',
        description: 'Guilda VIP exclusiva de XXMALTA. Edifícios no nível máximo e bônus permanentes de +50% Ouro e +50% XP.',
        recruitmentStatus: 'closed',
        minLevelReq: 1,
        minHonorReq: 0,
        treasuryGold: 0,
        buildings: {
          forum_gladiatorius: GUILD_CONFIG.maxBuildingLevel,
          banco: GUILD_CONFIG.maxBuildingLevel,
          campo_treino: GUILD_CONFIG.maxBuildingLevel,
          balneario: GUILD_CONFIG.maxBuildingLevel,
          villa_medici: GUILD_CONFIG.maxBuildingLevel,
          biblioteca: GUILD_CONFIG.maxBuildingLevel,
          armazem: GUILD_CONFIG.maxBuildingLevel,
          mercado_interno: GUILD_CONFIG.maxBuildingLevel,
        },
        members: [],
        applications: [],
        warehouseItems: [],
        internalMarketTemplateIds: getInternalMarketTemplateIdsForLevel(GUILD_CONFIG.maxBuildingLevel),
        activeBuffs: [],
        permanentGoldBonusPercent: 50,
        permanentXpBonusPercent: 50,
        bankHistory: [],
        announcements: [
          {
            id: 'ann_guild_governo_vip',
            authorName: record.state.name,
            authorRole: 'leader',
            content: 'GOVERNO fundada como guilda VIP: todos os edifícios no nível máximo e +50% permanente de Ouro e XP.',
            timestampMs: nowMs,
          },
        ],
        auditLog: [
          {
            id: 'audit_guild_governo_vip',
            actorName: record.state.name,
            action: 'GOVERNO fundada como guilda VIP com todos os edifícios no nível máximo.',
            timestampMs: nowMs,
          },
        ],
        createdAtMs: nowMs,
        isSimulatedSeed: false,
      };
      this.guilds.set(guildId, guild);
    } else {
      guild.name = 'GOVERNO';
      guild.tag = 'GOV';
      guild.recruitmentStatus = 'closed';
      guild.permanentGoldBonusPercent = 50;
      guild.permanentXpBonusPercent = 50;
      guild.buildings = Object.fromEntries(
        Object.keys(GUILD_BUILDING_DEFINITIONS).map((id) => [
          id,
          GUILD_CONFIG.maxBuildingLevel,
        ])
      ) as GuildRecord['buildings'];
      guild.internalMarketTemplateIds = getInternalMarketTemplateIdsForLevel(GUILD_CONFIG.maxBuildingLevel);
    }

    for (const candidate of this.guilds.values()) {
      candidate.applications = candidate.applications.filter(
        (application) => application.applicantId !== record.uid
      );
      if (candidate.id === guildId) continue;
      const previousMember = candidate.members.find((member) => member.id === record.uid);
      if (!previousMember) continue;
      candidate.members = candidate.members.filter((member) => member.id !== record.uid);
      if (previousMember.role === 'leader' && candidate.members.length > 0) {
        const successor = candidate.members.find((member) => member.role === 'admin') ?? candidate.members[0];
        successor.role = 'leader';
      }
    }

    const featsCount = evaluateUnlockedFeats(record.state).length;
    const owner: GuildMemberRecord = {
      id: record.uid,
      name: record.state.name,
      title: record.state.title,
      isPlayer: false,
      role: 'leader',
      level: record.state.level,
      honor: record.state.honor,
      fame: record.state.fame,
      wins: record.state.wins,
      goldLooted: record.state.goldLooted,
      featsCount,
      goldContributed: 0,
      joinedAtMs: guild.members.find((member) => member.id === record.uid)?.joinedAtMs ?? nowMs,
    };
    guild.members = [owner];
    record.state.guildState = {
      ...record.state.guildState,
      playerGuildId: guildId,
      guilds: [],
      simulatedGladiators: [],
    };
    this.invalidateRankingCaches();
    return true;
  }

  private syncPlayerIntoSharedGuildMember(record: AuthoritativePlayerRecord) {
    this.cachedPublicProfiles.delete(record.uid);
    const guildId = this.findPlayerGuildId(record.uid);
    if (!guildId) return;
    const guild = this.guilds.get(guildId);
    if (!guild) return;

    const featsCount = evaluateUnlockedFeats(record.state).length;
    let changed = false;
    guild.members = guild.members.map((m) => {
      if (m.id !== record.uid) return m;
      if (
        m.name !== record.state.name ||
        m.title !== record.state.title ||
        m.level !== record.state.level ||
        m.honor !== record.state.honor ||
        m.fame !== record.state.fame ||
        m.wins !== record.state.wins ||
        m.goldLooted !== record.state.goldLooted ||
        m.featsCount !== featsCount
      ) {
        changed = true;
      }
      return {
        ...m,
        name: record.state.name,
        title: record.state.title,
        level: record.state.level,
        honor: record.state.honor,
        fame: record.state.fame,
        wins: record.state.wins,
        goldLooted: record.state.goldLooted,
        featsCount,
      };
    });
    if (changed) {
      this.invalidateRankingCaches(false);
    }
  }

  public toPublicProfile(
    record: AuthoritativePlayerRecord,
    nowMs: number = Date.now()
  ): OnlinePublicPlayerProfile {
    const cached = this.cachedPublicProfiles.get(record.uid);
    if (cached) return cached;

    const guildId = this.findPlayerGuildId(record.uid);
    const guild = guildId ? this.guilds.get(guildId) ?? null : null;
    const derived = calculateDerivedStats(
      record.state.baseStats,
      record.state.equipped,
      record.state.level,
      undefined,
      nowMs
    );
    const feats = evaluateUnlockedFeats(record.state);

    const profile: OnlinePublicPlayerProfile = {
      id: record.uid,
      uid: record.uid,
      name: record.state.name,
      title: record.state.title,
      level: record.state.level,
      honor: record.state.honor,
      fame: record.state.fame,
      wins: record.state.wins,
      losses: record.state.losses,
      featsCount: feats.length,
      goldLooted: record.state.goldLooted,
      guildId: guild?.id ?? null,
      guildName: guild?.name ?? null,
      guildTag: guild?.tag ?? null,
      damageRange: `${derived.damageMin}-${derived.damageMax}`,
      armor: derived.armor,
      competitiveStatus: record.competitiveStatus,
      updatedAtMs: record.updatedAtMs,
    };
    this.cachedPublicProfiles.set(record.uid, profile);
    return profile;
  }

  private normalizeIdentity(
    identityOrUid:
      | AuthenticatedIdentity
      | { uid: string; email?: string; displayName?: string; emailVerified?: boolean }
      | string
  ): AuthenticatedIdentity {
    if (typeof identityOrUid === 'string') {
      const existing = this.players.get(identityOrUid);
      return {
        uid: identityOrUid,
        email: existing?.email ?? `${identityOrUid}@ludus.capua.test`,
        displayName: existing?.state.name ?? `Gladiador ${identityOrUid.slice(0, 8)}`,
        emailVerified: true,
      };
    }
    return {
      uid: identityOrUid.uid,
      email: identityOrUid.email ?? `${identityOrUid.uid}@ludus.capua.test`,
      displayName: identityOrUid.displayName ?? 'Aurelius Valerius',
      emailVerified: identityOrUid.emailVerified ?? true,
    };
  }

  /**
   * Inicializa ou recupera a conta autenticada no servidor, aplicando cálculo de progresso offline
   * com o relógio confiável do servidor (Seção 7).
   */
  public bootstrapPlayer(
    identityInput:
      | AuthenticatedIdentity
      | { uid: string; email?: string; displayName?: string; emailVerified?: boolean }
      | string,
    serverNowMs: number = Date.now()
  ): {
    state: GameState;
    offlineBatchCreated: PendingRewardBatch | null;
    isNewAccount: boolean;
    migratedFromLocal: boolean;
    migrationSummary: MigrationReport | null;
    competitiveStatus: CompetitiveStatus;
    playerRank: number;
    guildRank: number | null;
    serverTimestampMs: number;
  } {
    const identity = this.normalizeIdentity(identityInput);
    this.metrics.totalRequests += 1;
    this.metrics.readsObserved += 2;

    let record = this.players.get(identity.uid);
    let isNewAccount = false;
    let offlineBatchCreated: PendingRewardBatch | null = null;

    if (!record) {
      isNewAccount = true;
      const fresh = createInitialGameState(serverNowMs);
      if (this.launchId) { fresh.honor = 0; fresh.fame = 0; }
      const cleanName = (identity.displayName || 'Gladiador de Cápua')
        .trim()
        .slice(0, 28);
      fresh.name = cleanName.length >= 2 ? cleanName : 'Aurelius Valerius';
      fresh.guildState = {
        ...fresh.guildState,
        playerGuildId: null,
        guilds: [],
        simulatedGladiators: [],
      };

      record = {
        uid: identity.uid,
        email: identity.email,
        competitiveStatus: 'verified_online',
        migratedFromLocal: false,
        migrationSummary: null,
        state: fresh,
        processedOpIds: [],
        lastVillaMediciUseMs: 0,
        createdAtMs: serverNowMs,
        updatedAtMs: serverNowMs,
      };
      this.players.set(identity.uid, record);
      this.metrics.writesObserved += 2;
      this.invalidateRankingCaches();
      this.saveToDisk();
    }
    const vipGuildChanged = this.ensureGovernoVipGuild(record, serverNowMs);
    if (!isNewAccount) {
      const hydrated = this.buildClientGameStateForPlayer(record, serverNowMs);
      const elapsedRes = calculateElapsedIdleProgress(hydrated, serverNowMs);
      record.state = elapsedRes.state;
      record.updatedAtMs = serverNowMs;
      offlineBatchCreated = elapsedRes.offlineBatchCreated;
      this.syncPlayerIntoSharedGuildMember(record);
      if (offlineBatchCreated || vipGuildChanged) {
        this.metrics.writesObserved += 1;
        this.saveToDisk();
      }
    } else if (vipGuildChanged) {
      this.saveToDisk();
    }

    const clientState = this.buildClientGameStateForPlayer(record, serverNowMs);
    const playerRank = this.getPlayerRankPosition(identity.uid, 'honor', serverNowMs);
    const guildRank = this.getPlayerGuildRankPosition(identity.uid, serverNowMs);

    return {
      state: clientState,
      offlineBatchCreated,
      isNewAccount,
      migratedFromLocal: record.migratedFromLocal,
      migrationSummary: record.migrationSummary,
      competitiveStatus: record.competitiveStatus,
      playerRank,
      guildRank,
      serverTimestampMs: serverNowMs,
    };
  }

  /**
   * Migração explícita e sanitizada de Save Local (Seção 8).
   */
  public migrateLocalSave(
    identityInput:
      | AuthenticatedIdentity
      | { uid: string; email?: string; displayName?: string; emailVerified?: boolean }
      | string,
    rawLocalSaveJson: string,
    serverNowMs: number = Date.now()
  ): {
    ok: boolean;
    error?: string;
    report?: MigrationReport;
    state?: GameState;
    playerRank?: number;
    guildRank?: number | null;
  } {
    if (this.launchId) {
      return { ok: false, error: 'O lançamento público começou do zero. Saves anteriores não podem ser importados.' };
    }
    const identity = this.normalizeIdentity(identityInput);
    this.metrics.totalRequests += 1;
    this.metrics.totalMutations += 1;

    let record = this.players.get(identity.uid);
    if (!record) {
      const fresh = createInitialGameState(serverNowMs);
      record = {
        uid: identity.uid,
        email: identity.email,
        competitiveStatus: 'verified_online',
        migratedFromLocal: false,
        migrationSummary: null,
        state: fresh,
        processedOpIds: [],
        lastVillaMediciUseMs: 0,
        createdAtMs: serverNowMs,
        updatedAtMs: serverNowMs,
      };
      this.players.set(identity.uid, record);
    }

    if (record.migratedFromLocal) {
      return {
        ok: false,
        error:
          'Esta conta já realizou a migração única do save local anteriormente. Importações repetidas são bloqueadas.',
      };
    }

    const hasOnlineProgress =
      record.state.wins > 0 ||
      record.state.losses > 0 ||
      record.state.level > 1 ||
      Boolean(this.findPlayerGuildId(identity.uid));

    if (hasOnlineProgress) {
      return {
        ok: false,
        error:
          'Sua conta online já possui progresso ativo no servidor. Para proteger seus dados, não sobrescrevemos contas online em andamento.',
      };
    }

    let rawSourceVersion = 1;
    try {
      const parsedRaw = JSON.parse(rawLocalSaveJson) as Record<string, unknown>;
      if (typeof parsedRaw.version === 'number') {
        rawSourceVersion = parsedRaw.version;
      }
    } catch {
      return {
        ok: false,
        error: 'O arquivo de save local não é um JSON válido.',
      };
    }

    const inspection = inspectAndLoadSaveState(rawLocalSaveJson, serverNowMs);
    if (inspection.status !== 'loaded') {
      return {
        ok: false,
        error:
          inspection.corruptionError ??
          'Estrutura do save local inválida ou vazia para migração.',
      };
    }

    const local = inspection.state;
    const preservedFields: string[] = [];
    const cappedAdjustments: string[] = [];

    const safeLevel = Math.max(
      1,
      Math.min(MIGRATION_COMPETITIVE_CAPS.maxLevel, Math.floor(local.level))
    );
    if (local.level > safeLevel) {
      cappedAdjustments.push(
        `Nível ajustado de ${local.level} para o teto de migração (${safeLevel}).`
      );
    } else {
      preservedFields.push(`Nível ${safeLevel}`);
    }

    const safeGold = Math.max(
      0,
      Math.min(MIGRATION_COMPETITIVE_CAPS.maxGold, Math.floor(local.gold))
    );
    if (local.gold > safeGold) {
      cappedAdjustments.push(
        `Ouro ajustado de ${local.gold} para o teto competitivo de migração (${safeGold} Ouro).`
      );
    } else {
      preservedFields.push(`Ouro (${safeGold})`);
    }

    const safeHonor = Math.max(
      0,
      Math.min(MIGRATION_COMPETITIVE_CAPS.maxHonor, Math.floor(local.honor))
    );
    if (local.honor > safeHonor) {
      cappedAdjustments.push(
        `Honra ajustada de ${local.honor} para o teto competitivo de migração (${safeHonor} Honra).`
      );
    } else {
      preservedFields.push(`Honra (${safeHonor})`);
    }

    const safeFame = Math.max(
      0,
      Math.min(MIGRATION_COMPETITIVE_CAPS.maxFame, Math.floor(local.fame))
    );
    const safeWins = Math.max(
      0,
      Math.min(MIGRATION_COMPETITIVE_CAPS.maxWins, Math.floor(local.wins))
    );
    const safeLosses = Math.max(0, Math.min(500, Math.floor(local.losses)));
    const safeGoldLooted = Math.max(
      0,
      Math.min(MIGRATION_COMPETITIVE_CAPS.maxGoldLooted, Math.floor(local.goldLooted))
    );

    const clampStat = (val: number, label: string): number => {
      const c = Math.max(5, Math.min(MIGRATION_COMPETITIVE_CAPS.maxBaseStat, Math.floor(val)));
      if (val > c) {
        cappedAdjustments.push(
          `Atributo ${label} ajustado de ${val} para o limite de migração (${c}).`
        );
      }
      return c;
    };

    const safeBaseStats: BaseAttributes = {
      strength: clampStat(local.baseStats.strength, 'Força'),
      skill: clampStat(local.baseStats.skill, 'Habilidade'),
      agility: clampStat(local.baseStats.agility, 'Agilidade'),
      constitution: clampStat(local.baseStats.constitution, 'Constituição'),
      charisma: clampStat(local.baseStats.charisma, 'Carisma'),
      intelligence: clampStat(local.baseStats.intelligence, 'Inteligência'),
    };
    preservedFields.push('Atributos base validados');

    const safeEquipped: Partial<Record<EquipmentSlotType, GameItem>> = {};
    for (const slot of Object.keys(local.equipped) as EquipmentSlotType[]) {
      const rawItem = local.equipped[slot];
      if (!rawItem || !ITEM_TEMPLATES[rawItem.templateId]) continue;
      const tpl = ITEM_TEMPLATES[rawItem.templateId];
      if (tpl.slot === slot && tpl.levelReq <= safeLevel) {
        safeEquipped[slot] = createItemFromTemplate(tpl.templateId, `mig_eq_${slot}`);
      } else {
        cappedAdjustments.push(
          `Equipamento ${rawItem.name} removido do slot (requisito acima do nível migrado).`
        );
      }
    }

    const safeInventory: GameItem[] = [];
    for (let i = 0; i < Math.min(local.inventory.length, GAME_CONFIG.maxInventorySlots); i++) {
      const rawItem = local.inventory[i];
      if (!rawItem || !ITEM_TEMPLATES[rawItem.templateId]) continue;
      safeInventory.push(
        createItemFromTemplate(rawItem.templateId, `mig_inv_${i}_${serverNowMs}`)
      );
    }
    preservedFields.push(
      `${Object.keys(safeEquipped).length} equipamento(s) vestido(s) e ${safeInventory.length} item(ns) na mochila reconstruídos a partir do catálogo oficial`
    );

    if (local.guildState?.playerGuildId) {
      cappedAdjustments.push(
        'Vínculo com guilda local simulada encerrado na migração (guildas fictícias não pertencem ao servidor competitivo).'
      );
    }

    const cleanState = createInitialGameState(serverNowMs);
    cleanState.name = (local.name || identity.displayName || 'Aurelius Valerius')
      .trim()
      .slice(0, 28);
    cleanState.title = (local.title || 'Gladiador de Cápua').trim().slice(0, 40);
    cleanState.level = safeLevel;
    cleanState.xp = 0;
    cleanState.gold = safeGold;
    cleanState.honor = safeHonor;
    cleanState.fame = safeFame;
    cleanState.wins = safeWins;
    cleanState.losses = safeLosses;
    cleanState.goldLooted = safeGoldLooted;
    cleanState.baseStats = safeBaseStats;
    cleanState.equipped = safeEquipped;
    cleanState.inventory = safeInventory;
    cleanState.tutorial = local.tutorial;

    const derived = calculateDerivedStats(safeBaseStats, safeEquipped, safeLevel);
    cleanState.currentHp = derived.maxHp;

    const report: MigrationReport = {
      migratedAtMs: serverNowMs,
      sourceVersion: rawSourceVersion,
      competitiveStatus: 'migrated_capped',
      backupKey: 'gladiatorum_pre_online_migration_backup_v4',
      originalLevel: local.level,
      cappedLevel: safeLevel,
      originalGold: local.gold,
      cappedGold: safeGold,
      originalHonor: local.honor,
      cappedHonor: safeHonor,
      appliedCaps: cappedAdjustments,
      preservedFields,
      cappedAdjustments,
      policyExplanation:
        'Política de Integridade Competitiva: atributos, ouro, honra e equipamentos do localStorage foram reconstruídos a partir dos templates oficiais e limitados aos tetos de migração (Nv.5, 600 Ouro, 180 Honra, Atributos <= 16). Guildas simuladas locais permanecem isoladas fora do ranking online.',
    };

    record.state = cleanState;
    record.migratedFromLocal = true;
    record.competitiveStatus = 'migrated_capped';
    record.migrationSummary = report;
    record.updatedAtMs = serverNowMs;

    this.metrics.writesObserved += 2;
    this.invalidateRankingCaches();
    this.saveToDisk();

    const clientState = this.buildClientGameStateForPlayer(record, serverNowMs);
    return {
      ok: true,
      report,
      state: clientState,
      playerRank: this.getPlayerRankPosition(identity.uid, 'honor', serverNowMs),
      guildRank: this.getPlayerGuildRankPosition(identity.uid, serverNowMs),
    };
  }

  /**
   * Executa uma ação autoritativa solicitada pelo cliente (Seções 6, 7 e 9).
   * Toda operação econômica exige `opId` único por jogador para garantir idempotência.
   */
  public executeAction(
    identityInput:
      | AuthenticatedIdentity
      | { uid: string; email?: string; displayName?: string; emailVerified?: boolean }
      | string,
    payload: AuthoritativeActionPayload,
    serverNowMs: number = Date.now()
  ): AuthoritativeActionResponse {
    const identity = this.normalizeIdentity(identityInput);
    this.metrics.totalRequests += 1;
    this.metrics.readsObserved += 2;

    const opId = (payload.opId || '').trim();
    if (!opId || opId.length > 128) {
      this.metrics.totalErrors += 1;
      throw new Error('Identificador de operação (opId) inválido.');
    }

    let record = this.players.get(identity.uid);
    if (!record) {
      const fresh = createInitialGameState(serverNowMs);
      record = {
        uid: identity.uid,
        email: identity.email,
        competitiveStatus: 'verified_online',
        migratedFromLocal: false,
        migrationSummary: null,
        state: fresh,
        processedOpIds: [],
        lastVillaMediciUseMs: 0,
        createdAtMs: serverNowMs,
        updatedAtMs: serverNowMs,
      };
      this.players.set(identity.uid, record);
    }

    // Verificação de Idempotência: se o opId já foi processado, retorna o estado atual sem duplicar efeito
    if (record.processedOpIds.includes(opId)) {
      this.metrics.totalIdempotentReplays += 1;
      const clientState = this.buildClientGameStateForPlayer(record, serverNowMs);
      return {
        ok: true,
        idempotentReplay: true,
        message: 'Operação idempotente já processada anteriormente.',
        serverTimestampMs: serverNowMs,
        state: clientState,
        playerRank: this.getPlayerRankPosition(identity.uid, 'honor', serverNowMs),
        guildRank: this.getPlayerGuildRankPosition(identity.uid, serverNowMs),
      };
    }

      // Atualiza regeneração/progresso pelo relógio do servidor antes de validar a ação
      const hydratedBefore = this.buildClientGameStateForPlayer(record, serverNowMs);
      const { state: syncedBefore, offlineBatchCreated } = calculateElapsedIdleProgress(
        hydratedBefore,
        serverNowMs
      );
      record.state = syncedBefore;

      const params = payload.params ?? {};
      let message = 'Ação executada no servidor.';
      let combatReport: CombatReport | null = null;
      let leveledUp = false;

      const fail = (errorMsg: string): AuthoritativeActionResponse => {
        this.metrics.totalErrors += 1;
        const currentClientState = this.buildClientGameStateForPlayer(record!, serverNowMs);
        return {
          ok: false,
          idempotentReplay: false,
          message: errorMsg,
          error: errorMsg,
          serverTimestampMs: serverNowMs,
          state: currentClientState,
          playerRank: this.getPlayerRankPosition(identity.uid, 'honor', serverNowMs),
          guildRank: this.getPlayerGuildRankPosition(identity.uid, serverNowMs),
        };
      };

      switch (payload.action) {
        case 'update_gladiator_name': {
          const rawName = String(params.name ?? '').trim();
          if (rawName.length < 3 || rawName.length > 28) {
            return fail('O nome do gladiador deve ter entre 3 e 28 caracteres.');
          }
          record.state = {
            ...record.state,
            name: rawName,
          };
          this.syncPlayerIntoSharedGuildMember(record);
          message = `Nome de arena atualizado para ${rawName}.`;
          break;
        }

        case 'equip_item': {
          const itemId = String(params.itemId ?? '');
          const res = equipItemFromInventory(record.state, itemId);
          if (res.error) return fail(res.error);
          record.state = res.state;
          message = 'Equipamento vestido e validado no servidor.';
          break;
        }

        case 'unequip_slot': {
          const slot = String(params.slot ?? '') as EquipmentSlotType;
          const res = unequipSlotToInventory(record.state, slot);
          if (res.error) return fail(res.error);
          record.state = res.state;
          message = 'Equipamento guardado na mochila.';
          break;
        }

        case 'sell_item': {
          const itemId = String(params.itemId ?? '');
          const goldMultiplier =
            1 + this.getPermanentGuildRewardPercent(identity.uid, 'gold') / 100;
          const res = sellItemFromInventory(record.state, itemId, goldMultiplier);
          if (res.error) return fail(res.error);
          record.state = res.state;
          message = `Item vendido por +${res.goldReceived} denários de ouro.`;
          break;
        }

        case 'buy_market_item': {
          const marketItemId = String(params.marketItemId ?? '');
          const res = buyItemFromMarket(record.state, marketItemId, serverNowMs);
          if (res.error) return fail(res.error);
          record.state = res.state;
          message = 'Equipamento adquirido no Mercado.';
          break;
        }

        case 'train_stat': {
          const stat = String(params.stat ?? '') as PrimaryStatKey;
          const validStats: PrimaryStatKey[] = [
            'strength',
            'skill',
            'agility',
            'constitution',
            'charisma',
            'intelligence',
          ];
          if (!validStats.includes(stat)) {
            return fail('Atributo de treinamento inválido.');
          }
          const stateWithGuild = this.buildClientGameStateForPlayer(record, serverNowMs);
          const res = trainGladiatorStat(stateWithGuild, stat);
          if (res.error) return fail(res.error);
          record.state = res.state;
          message =
            res.discountAmount > 0
              ? `Atributo treinado (-${res.costPaid}g com desconto de -${res.discountAmount}g da Guilda)!`
              : `Atributo treinado com sucesso (-${res.costPaid} denários)!`;
          break;
        }

        case 'forge_upgrade': {
          const itemId = String(params.itemId ?? '');
          const stat = String(params.stat ?? '') as ForgeStatKey;
          const stateWithGuild = this.buildClientGameStateForPlayer(record, serverNowMs);
          const res = forgeItem(stateWithGuild, itemId, stat);
          if (res.error) return fail(res.error);
          record.state = res.state;
          message = `${res.itemName ?? 'Equipamento'} aprimorado na Forja para o nível ${res.forgeLevel} (-${res.costPaid} denários).`;
          break;
        }

        case 'heal_barracks':
        case 'restore_health_barracks': {
          const stateWithGuild = this.buildClientGameStateForPlayer(record, serverNowMs);
          const derived = calculateDerivedStats(
            stateWithGuild.baseStats,
            stateWithGuild.equipped,
            stateWithGuild.level,
            stateWithGuild.guildState,
            serverNowMs
          );
          const missing = Math.max(0, derived.maxHp - record.state.currentHp);
          if (missing <= 0) {
            return fail('Sua vitalidade já está no máximo.');
          }
          const cost = Math.max(5, Math.ceil(missing * 0.25));
          if (record.state.gold < cost) {
            return fail(`Ouro insuficiente para o médico (${cost} Ouro).`);
          }
          record.state = {
            ...record.state,
            gold: record.state.gold - cost,
            currentHp: derived.maxHp,
          };
          message = 'Ferimentos tratados pelo médico do Ludus!';
          break;
        }

        case 'use_medicine_item': {
          const itemId = String(params.itemId ?? '');
          const stateWithGuild = this.buildClientGameStateForPlayer(record, serverNowMs);
          const res = useMedicineFromInventory(stateWithGuild, itemId, serverNowMs);
          if (res.error) return fail(res.error);
          record.state = res.state;
          const parts: string[] = [];
          if (res.healedHp > 0) parts.push(`+${res.healedHp} PV`);
          if (res.restoredEnergy > 0) parts.push(`+${res.restoredEnergy} Energia`);
          message = `${res.itemUsed?.name ?? 'Suprimento'} consumido (${parts.join(' e ') || 'Restaurado'})!`;
          break;
        }

        case 'buy_medicine_item': {
          const templateId = String(params.templateId ?? '');
          const res = buyMedicineTemplate(record.state, templateId, serverNowMs);
          if (res.error) return fail(res.error);
          record.state = res.state;
          message = `${res.itemBought?.name ?? 'Suprimento médico'} adquirido e guardado na mochila!`;
          break;
        }

        case 'apply_medical_treatment': {
          const treatmentId = String(params.treatmentId ?? '');
          const stateWithGuild = this.buildClientGameStateForPlayer(record, serverNowMs);
          const res = applyMedicalTreatment(stateWithGuild, treatmentId, serverNowMs);
          if (res.error) return fail(res.error);
          record.state = res.state;
          const parts: string[] = [];
          if (res.healedHp > 0) parts.push(`+${res.healedHp} PV`);
          if (res.restoredEnergy > 0) parts.push(`+${res.restoredEnergy} Energia`);
          message = `Tratamento no Valetudinarium concluído (-${res.costPaid} Ouro: ${parts.join(', ')})!`;
          break;
        }

        case 'combat_expedition':
        case 'start_expedition': {
          const regionId = String(params.regionId ?? EXPEDITION_REGIONS[0].id);
          const enemyIndex = Number(params.enemyIndex ?? 0);
          const rawFocus = String(params.focusMode ?? 'gold');
          const focusMode: IdleFocusMode =
            rawFocus === 'xp' || rawFocus === 'gold' || rawFocus === 'loot'
              ? rawFocus
              : 'gold';
          const region =
            EXPEDITION_REGIONS.find((r) => r.id === regionId) ?? EXPEDITION_REGIONS[0];
          const enemy = region.enemies[enemyIndex] ?? region.enemies[0];

          if (record.state.level < region.minLevel) {
            return fail(`Requer Nível ${region.minLevel} para explorar ${region.name}.`);
          }
          if (record.state.energy < region.energyCost) {
            return fail(`Energia insuficiente (${record.state.energy}/${region.energyCost}).`);
          }

          const stateWithGuild = this.buildClientGameStateForPlayer(record, serverNowMs);
          const combatRes = resolveCombat(stateWithGuild, enemy, {
            mode: 'expedition',
            locationName: region.name,
            focusMode,
            timestampMs: serverNowMs,
          });

          const step1 = advanceTutorialIfMatching(record.state.tutorial, 'start_expedition');
          const step2 = advanceTutorialIfMatching(step1, 'choose_next_activity');

          record.state = {
            ...record.state,
            energy: Math.max(0, record.state.energy - region.energyCost),
            currentHp: combatRes.playerRemainingHp,
            wins: combatRes.report.victory ? record.state.wins + 1 : record.state.wins,
            losses: combatRes.report.victory ? record.state.losses : record.state.losses + 1,
            lastSaveTimestampMs: serverNowMs,
            idle: {
              ...record.state.idle,
              focusMode,
            },
            pendingRewards: [...record.state.pendingRewards.slice(-19), combatRes.rewardBatch],
            combatHistory: [combatRes.report, ...record.state.combatHistory.slice(0, 14)],
            tutorial: step2,
          };
          combatReport = combatRes.report;
          this.syncPlayerIntoSharedGuildMember(record);
          message = combatRes.report.victory
            ? `Vitória contra ${enemy.name}!`
            : `Derrota contra ${enemy.name}.`;
          break;
        }

        case 'combat_arena':
        case 'challenge_arena': {
          const opponentId = String(params.opponentId ?? ARENA_OPPONENTS[0].id);
          const opponent =
            ARENA_OPPONENTS.find((o) => o.id === opponentId) ?? ARENA_OPPONENTS[0];
          if (record.state.energy < 1) {
            return fail('Energia insuficiente para desafiar na Arena.');
          }

          const stateWithGuild = this.buildClientGameStateForPlayer(record, serverNowMs);
          const combatRes = resolveCombat(stateWithGuild, opponent, {
            mode: 'arena',
            locationName: 'Arena Provincial de Cápua',
            timestampMs: serverNowMs,
          });

          const enrichedBatch: PendingRewardBatch = {
            ...combatRes.rewardBatch,
            honor: combatRes.report.victory ? opponent.honorReward : 0,
          };

          record.state = {
            ...record.state,
            energy: Math.max(0, record.state.energy - 1),
            currentHp: combatRes.playerRemainingHp,
            wins: combatRes.report.victory ? record.state.wins + 1 : record.state.wins,
            losses: combatRes.report.victory ? record.state.losses : record.state.losses + 1,
            lastSaveTimestampMs: serverNowMs,
            pendingRewards: [...record.state.pendingRewards.slice(-19), enrichedBatch],
            combatHistory: [combatRes.report, ...record.state.combatHistory.slice(0, 14)],
            tutorial: advanceTutorialIfMatching(
              record.state.tutorial,
              'choose_next_activity'
            ),
          };
          combatReport = combatRes.report;
          this.syncPlayerIntoSharedGuildMember(record);
          message = combatRes.report.victory
            ? `Vitória na Arena contra ${opponent.name}!`
            : `Derrota na Arena contra ${opponent.name}.`;
          break;
        }

        case 'combat_dungeon':
        case 'fight_dungeon': {
          const dungeonId = String(params.dungeonId ?? DUNGEONS[0].id);
          const dungeon = DUNGEONS.find((d) => d.id === dungeonId) ?? DUNGEONS[0];
          if (record.state.level < dungeon.minLevel) {
            return fail(`Requer Nível ${dungeon.minLevel} para adentrar ${dungeon.name}.`);
          }
          if (record.state.energy < dungeon.energyCost) {
            return fail('Energia insuficiente para avançar na masmorra.');
          }

          const currentProg = record.state.dungeonProgress[dungeon.id] ?? {
            dungeonId: dungeon.id,
            currentEncounterIndex: 0,
            completedCount: 0,
          };
          const enemy =
            dungeon.encounters[currentProg.currentEncounterIndex] ?? dungeon.encounters[0];

          const stateWithGuild = this.buildClientGameStateForPlayer(record, serverNowMs);
          const combatRes = resolveCombat(stateWithGuild, enemy, {
            mode: 'dungeon',
            locationName: dungeon.name,
            timestampMs: serverNowMs,
          });

          const isBoss =
            currentProg.currentEncounterIndex === dungeon.encounters.length - 1;
          const bossDefeated = combatRes.report.victory && isBoss;

          const finalBatch: PendingRewardBatch = bossDefeated
            ? {
                ...combatRes.rewardBatch,
                sourceTitle: `${dungeon.name} — Chefe Derrotado (${enemy.name})`,
                gold:
                  combatRes.rewardBatch.gold +
                  Math.round(
                    dungeon.completionBonusGold *
                      (1 + this.getPermanentGuildRewardPercent(identity.uid, 'gold') / 100)
                  ),
                xp:
                  combatRes.rewardBatch.xp +
                  Math.round(
                    dungeon.completionBonusXp *
                      (1 + this.getPermanentGuildRewardPercent(identity.uid, 'xp') / 100)
                  ),
                items: [
                  ...combatRes.rewardBatch.items,
                  createItemFromTemplate(
                    dungeon.guaranteedDropPool[
                      currentProg.completedCount % dungeon.guaranteedDropPool.length
                    ],
                    `dungeon_boss_${serverNowMs}`
                  ),
                ],
              }
            : combatRes.rewardBatch;

          const nextEncounterIdx = combatRes.report.victory
            ? isBoss
              ? 0
              : currentProg.currentEncounterIndex + 1
            : currentProg.currentEncounterIndex;

          record.state = {
            ...record.state,
            energy: Math.max(0, record.state.energy - dungeon.energyCost),
            currentHp: combatRes.playerRemainingHp,
            wins: combatRes.report.victory ? record.state.wins + 1 : record.state.wins,
            losses: combatRes.report.victory ? record.state.losses : record.state.losses + 1,
            lastSaveTimestampMs: serverNowMs,
            dungeonProgress: {
              ...record.state.dungeonProgress,
              [dungeon.id]: {
                dungeonId: dungeon.id,
                currentEncounterIndex: nextEncounterIdx,
                completedCount: bossDefeated
                  ? currentProg.completedCount + 1
                  : currentProg.completedCount,
              },
            },
            pendingRewards: [...record.state.pendingRewards.slice(-19), finalBatch],
            combatHistory: [combatRes.report, ...record.state.combatHistory.slice(0, 14)],
            tutorial: advanceTutorialIfMatching(
              record.state.tutorial,
              'choose_next_activity'
            ),
          };
          combatReport = combatRes.report;
          this.syncPlayerIntoSharedGuildMember(record);
          message = combatRes.report.victory
            ? `Vitória na masmorra contra ${enemy.name}!`
            : `Derrota na masmorra contra ${enemy.name}.`;
          break;
        }

        case 'reset_dungeon': {
          const dungeonId = String(params.dungeonId ?? DUNGEONS[0].id);
          record.state = {
            ...record.state,
            dungeonProgress: {
              ...record.state.dungeonProgress,
              [dungeonId]: {
                ...(record.state.dungeonProgress[dungeonId] ?? {
                  dungeonId,
                  completedCount: 0,
                }),
                currentEncounterIndex: 0,
              },
            },
          };
          message = 'Incursão na masmorra reiniciada.';
          break;
        }

        case 'claim_contract': {
          const result = claimContract(record.state, String(params.contractId ?? ''));
          if (result.error) return fail(result.error);
          const contractGold = result.state.gold - record.state.gold;
          const goldMultiplier =
            1 + this.getPermanentGuildRewardPercent(identity.uid, 'gold') / 100;
          record.state = {
            ...result.state,
            gold: record.state.gold + Math.round(contractGold * goldMultiplier),
          };
          message = 'Contrato concluído. Denários creditados no servidor.';
          break;
        }
        case 'claim_reward': {
          const claimId = String(params.claimId ?? '');
          const stateWithGuild = this.buildClientGameStateForPlayer(record, serverNowMs);
          const claimRes = claimPendingReward(stateWithGuild, claimId);
          if (!claimRes.claimedNow) {
            return fail('Esta recompensa já foi resgatada anteriormente.');
          }
          record.state = claimRes.state;
          leveledUp = claimRes.leveledUp;
          this.syncPlayerIntoSharedGuildMember(record);
          message = claimRes.leveledUp
            ? `Recompensas resgatadas no servidor! Você alcançou o Nível ${claimRes.state.level}!`
            : 'Espólios de vitória creditados na sua conta!';
          break;
        }

        case 'idle_start':
        case 'toggle_idle': {
          const regionId = String(params.regionId ?? EXPEDITION_REGIONS[0].id);
          const enemyIndex = Number(params.enemyIndex ?? 0);
          const focusMode = (params.focusMode as IdleFocusMode) ?? 'gold';
          const region =
            EXPEDITION_REGIONS.find((r) => r.id === regionId) ?? EXPEDITION_REGIONS[0];
          if (record.state.level < region.minLevel) {
            return fail(`Requer Nível ${region.minLevel} para patrulhar ${region.name}.`);
          }
          record.state = {
            ...record.state,
            lastSaveTimestampMs: serverNowMs,
            idle: {
              active: true,
              regionId,
              enemyIndex,
              focusMode,
              startedAtMs: serverNowMs,
              lastUpdatedAtMs: serverNowMs,
              accumulatedSecondsInCurrentCycle: 0,
              pausedReason: null,
            },
            tutorial: advanceTutorialIfMatching(
              record.state.tutorial,
              'choose_next_activity'
            ),
          };
          message = `Patrulha Automática registrada no servidor em ${region.name}!`;
          break;
        }

        case 'idle_stop':
        case 'stop_idle': {
          record.state = {
            ...record.state,
            lastSaveTimestampMs: serverNowMs,
            idle: {
              ...record.state.idle,
              active: false,
              accumulatedSecondsInCurrentCycle: 0,
              pausedReason: null,
            },
          };
          message = 'Patrulha Automática pausada no servidor.';
          break;
        }

        case 'idle_focus':
        case 'change_idle_focus': {
          const focusMode = (params.focusMode as IdleFocusMode) ?? 'gold';
          record.state = {
            ...record.state,
            idle: {
              ...record.state.idle,
              focusMode,
            },
          };
          message = 'Foco da patrulha atualizado.';
          break;
        }

        case 'idle_sync':
        case 'sync_idle': {
          message = 'Progresso sincronizado com o relógio do servidor.';
          break;
        }

        case 'skip_tutorial': {
          record.state = {
            ...record.state,
            tutorial: {
              ...record.state.tutorial,
              skipped: true,
            },
          };
          message = 'Guia inicial concluído.';
          break;
        }

        case 'restart_tutorial': {
          record.state = {
            ...record.state,
            tutorial: {
              step: 'start_expedition',
              skipped: false,
            },
          };
          message = 'Guia inicial reativado.';
          break;
        }

        case 'guild_create': {
          if (this.findPlayerGuildId(identity.uid)) {
            return fail('Você já pertence a uma guilda. Saia da atual antes de fundar outra.');
          }
          const cleanName = String(params.name ?? '')
            .trim()
            .replace(/\s+/g, ' ');
          const cleanTag = normalizeGuildTagKey(String(params.tag ?? ''));
          const cleanDesc =
            String(params.description ?? '').trim() ||
            'Aliança fundada por gladiadores de Cápua.';
          const emblemId = (params.emblemId as GuildEmblemId) ?? 'aquila_imperial';
          const recruitmentStatus =
            (params.recruitmentStatus as GuildRecruitmentStatus) ?? 'open';
          const minLevelReq = Math.max(1, Math.floor(Number(params.minLevelReq ?? 1)));
          const minHonorReq = Math.max(0, Math.floor(Number(params.minHonorReq ?? 0)));

          if (
            cleanName.length < GUILD_CONFIG.minNameLength ||
            cleanName.length > GUILD_CONFIG.maxNameLength
          ) {
            return fail(
              `O nome da guilda deve ter entre ${GUILD_CONFIG.minNameLength} e ${GUILD_CONFIG.maxNameLength} caracteres.`
            );
          }
          if (
            cleanTag.length < GUILD_CONFIG.minTagLength ||
            cleanTag.length > GUILD_CONFIG.maxTagLength
          ) {
            return fail(
              `A tag deve ter entre ${GUILD_CONFIG.minTagLength} e ${GUILD_CONFIG.maxTagLength} letras/números.`
            );
          }
          if (record.state.gold < GUILD_CONFIG.creationCostGold) {
            return fail(
              `Ouro insuficiente para fundar uma guilda (${GUILD_CONFIG.creationCostGold} Ouro).`
            );
          }

          const normName = normalizeGuildNameKey(cleanName);
          for (const g of this.guilds.values()) {
            if (normalizeGuildNameKey(g.name) === normName) {
              return fail(`Já existe uma guilda com o nome "${cleanName}".`);
            }
            if (normalizeGuildTagKey(g.tag) === cleanTag) {
              return fail(`A tag [${cleanTag}] já está em uso por outra aliança.`);
            }
          }

          // Remove candidaturas pendentes do fundador em outras guildas
          for (const g of this.guilds.values()) {
            g.applications = g.applications.filter((a) => a.applicantId !== identity.uid);
          }

          record.state = {
            ...record.state,
            gold: record.state.gold - GUILD_CONFIG.creationCostGold,
          };

          const guildId = `guild_online_${serverNowMs}_${identity.uid.slice(0, 8)}`;
          const featsCount = evaluateUnlockedFeats(record.state).length;
          const newGuild: GuildRecord = {
            id: guildId,
            name: cleanName,
            tag: cleanTag,
            emblemId,
            description: cleanDesc.slice(0, 220),
            recruitmentStatus,
            minLevelReq,
            minHonorReq,
            treasuryGold: 0,
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
                id: identity.uid,
                name: record.state.name,
                title: record.state.title,
                isPlayer: false,
                role: 'leader',
                level: record.state.level,
                honor: record.state.honor,
                fame: record.state.fame,
                wins: record.state.wins,
                goldLooted: record.state.goldLooted,
                featsCount,
                goldContributed: 0,
                joinedAtMs: serverNowMs,
              },
            ],
            applications: [],
            warehouseItems: [],
            internalMarketTemplateIds: getInternalMarketTemplateIdsForLevel(1),
            activeBuffs: [],
            bankHistory: [],
            auditLog: [
              {
                id: `audit_${serverNowMs}`,
                actorName: record.state.name,
                action: `Fundou a guilda ${cleanName} [${cleanTag}] (-${GUILD_CONFIG.creationCostGold} Ouro).`,
                timestampMs: serverNowMs,
              },
            ],
            announcements: [
              {
                id: `ann_${serverNowMs}`,
                authorName: record.state.name,
                authorRole: 'leader',
                content: `O estandarte de ${cleanName} [${cleanTag}] foi erguido em Cápua!`,
                timestampMs: serverNowMs,
              },
            ],
            createdAtMs: serverNowMs,
            isSimulatedSeed: false,
          };

          this.guilds.set(guildId, newGuild);
          message = `Guilda ${cleanName} [${cleanTag}] fundada no servidor!`;
          break;
        }

        case 'guild_apply_or_join': {
          if (this.findPlayerGuildId(identity.uid)) {
            return fail('Você já pertence a uma guilda.');
          }
          const targetGuildId = String(params.guildId ?? '');
          const appMsg =
            String(params.message ?? '').trim() ||
            'Solicito ingresso nas fileiras da aliança.';
          const guild = this.guilds.get(targetGuildId);
          if (!guild) return fail('Guilda não encontrada no servidor.');

          if (guild.recruitmentStatus === 'closed') {
            return fail('Esta guilda está com o recrutamento fechado.');
          }
          if (record.state.level < guild.minLevelReq) {
            return fail(`Requer Nível ${guild.minLevelReq} para ingressar em ${guild.name}.`);
          }
          if (record.state.honor < guild.minHonorReq) {
            return fail(`Requer ${guild.minHonorReq} de Honra para ingressar em ${guild.name}.`);
          }

          const maxCap = getGuildMaxCapacity(guild.buildings.forum_gladiatorius ?? 1);
          if (guild.members.length >= maxCap) {
            return fail(
              `A guilda atingiu a capacidade máxima do Forum Gladiatorius (${guild.members.length}/${maxCap}).`
            );
          }

          if (guild.recruitmentStatus === 'open') {
            for (const g of this.guilds.values()) {
              g.applications = g.applications.filter((a) => a.applicantId !== identity.uid);
            }
            guild.members.push({
              id: identity.uid,
              name: record.state.name,
              title: record.state.title,
              isPlayer: false,
              role: 'member',
              level: record.state.level,
              honor: record.state.honor,
              fame: record.state.fame,
              wins: record.state.wins,
              goldLooted: record.state.goldLooted,
              featsCount: evaluateUnlockedFeats(record.state).length,
              goldContributed: 0,
              joinedAtMs: serverNowMs,
            });
            guild.auditLog = [
              {
                id: `audit_join_${serverNowMs}_${identity.uid.slice(0, 6)}`,
                actorName: record.state.name,
                action: `Ingressou na guilda (Recrutamento Aberto).`,
                timestampMs: serverNowMs,
              },
              ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
            ];
            message = `Você ingressou em ${guild.name} [${guild.tag}]!`;
          } else {
            const existingApp = guild.applications.find(
              (a) => a.applicantId === identity.uid && a.status === 'pending'
            );
            if (existingApp) {
              return fail('Você já possui uma candidatura pendente nesta guilda.');
            }
            const newApp: GuildApplicationRecord = {
              id: `app_${serverNowMs}_${identity.uid.slice(0, 8)}`,
              applicantId: identity.uid,
              applicantName: record.state.name,
              isPlayer: false,
              level: record.state.level,
              honor: record.state.honor,
              message: appMsg.slice(0, 160),
              createdAtMs: serverNowMs,
              status: 'pending',
            };
            guild.applications = [
              newApp,
              ...guild.applications
                .filter((a) => a.applicantId !== identity.uid)
                .slice(0, 49),
            ];
            guild.auditLog = [
              {
                id: `audit_app_${serverNowMs}`,
                actorName: record.state.name,
                action: 'Enviou candidatura de ingresso ao conselho.',
                timestampMs: serverNowMs,
              },
              ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
            ];
            message = `Candidatura enviada para ${guild.name} [${guild.tag}].`;
          }
          break;
        }

        case 'guild_cancel_application': {
          const targetGuildId = String(params.guildId ?? '');
          const guild = this.guilds.get(targetGuildId);
          if (!guild) return fail('Guilda não encontrada.');
          guild.applications = guild.applications.filter(
            (a) => a.applicantId !== identity.uid
          );
          message = 'Candidatura pendente cancelada.';
          break;
        }

        case 'guild_review_application': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const actorMember = guild.members.find((m) => m.id === identity.uid);
          if (!actorMember || !GUILD_PERMISSIONS[actorMember.role].reviewApplications) {
            return fail('Seu cargo não possui permissão para aprovar ou recusar candidaturas.');
          }

          const applicationId = String(params.applicationId ?? '');
          const decision = String(params.decision ?? '') as 'approve' | 'reject';
          const app = guild.applications.find(
            (a) => a.id === applicationId && a.status === 'pending'
          );
          if (!app) {
            return fail('Candidatura pendente não encontrada ou já processada.');
          }

          if (decision === 'approve') {
            const maxCap = getGuildMaxCapacity(guild.buildings.forum_gladiatorius ?? 1);
            if (guild.members.length >= maxCap) {
              return fail(
                `Capacidade máxima atingida (${guild.members.length}/${maxCap}). Melhore o Forum Gladiatorius.`
              );
            }
            if (this.findPlayerGuildId(app.applicantId)) {
              guild.applications = guild.applications.filter((a) => a.id !== applicationId);
              return fail('O candidato já ingressou em outra guilda.');
            }

            const applicantRecord = this.players.get(app.applicantId);
            const newMember: GuildMemberRecord = {
              id: app.applicantId,
              name: applicantRecord?.state.name ?? app.applicantName,
              title: applicantRecord?.state.title ?? 'Gladiador de Cápua',
              isPlayer: false,
              role: 'member',
              level: applicantRecord?.state.level ?? app.level,
              honor: applicantRecord?.state.honor ?? app.honor,
              fame: applicantRecord?.state.fame ?? app.level * 25,
              wins: applicantRecord?.state.wins ?? 1,
              goldLooted: applicantRecord?.state.goldLooted ?? 50,
              featsCount: applicantRecord
                ? evaluateUnlockedFeats(applicantRecord.state).length
                : 1,
              goldContributed: 0,
              joinedAtMs: serverNowMs,
            };

            // Remove candidaturas pendentes do candidato em outras guildas
            for (const g of this.guilds.values()) {
              g.applications = g.applications.filter(
                (a) => a.applicantId !== app.applicantId
              );
            }
            guild.members.push(newMember);
            guild.auditLog = [
              {
                id: `audit_app_ok_${serverNowMs}`,
                actorName: record.state.name,
                action: `Aprovou a candidatura de ${newMember.name}.`,
                timestampMs: serverNowMs,
              },
              ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
            ];
            message = `Candidatura de ${newMember.name} aprovada!`;
          } else {
            guild.applications = guild.applications.filter((a) => a.id !== applicationId);
            guild.auditLog = [
              {
                id: `audit_app_rej_${serverNowMs}`,
                actorName: record.state.name,
                action: `Recusou a candidatura de ${app.applicantName}.`,
                timestampMs: serverNowMs,
              },
              ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
            ];
            message = `Candidatura de ${app.applicantName} recusada.`;
          }
          break;
        }

        case 'guild_leave': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a nenhuma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const actorMember = guild.members.find((m) => m.id === identity.uid);
          if (!actorMember) return fail('Membro não encontrado na guilda.');
          if (guild.id === 'vip_guild_governo_xxmalta') {
            return fail('A guilda VIP GOVERNO está vinculada permanentemente a XXMALTA.');
          }

          if (actorMember.role === 'leader' && guild.members.length > 1) {
            return fail(
              'O Líder não pode abandonar a guilda enquanto houver outros membros. Transfira a liderança primeiro.'
            );
          }

          if (guild.members.length === 1) {
            this.guilds.delete(guildId);
            message = `Você deixou ${guild.name} e a aliança foi encerrada.`;
          } else {
            guild.members = guild.members.filter((m) => m.id !== identity.uid);
            guild.auditLog = [
              {
                id: `audit_leave_${serverNowMs}`,
                actorName: record.state.name,
                action: 'Deixou as fileiras da guilda.',
                timestampMs: serverNowMs,
              },
              ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
            ];
            message = `Você saiu de ${guild.name}. Benefícios da guilda encerrados.`;
          }
          break;
        }

        case 'guild_transfer_leadership': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const actorMember = guild.members.find((m) => m.id === identity.uid);
          if (guild.id === 'vip_guild_governo_xxmalta') {
            return fail('A liderança da guilda VIP GOVERNO não pode ser transferida.');
          }
          if (!actorMember || !GUILD_PERMISSIONS[actorMember.role].transferLeadership) {
            return fail('Apenas o Líder atual pode transferir a liderança.');
          }

          const targetMemberId = String(params.targetMemberId ?? '');
          const target = guild.members.find((m) => m.id === targetMemberId);
          if (!target || target.id === identity.uid) {
            return fail('Selecione outro membro válido para receber a liderança.');
          }

          guild.members = guild.members.map((m) => {
            if (m.id === identity.uid) return { ...m, role: 'admin' };
            if (m.id === targetMemberId) return { ...m, role: 'leader' };
            return m;
          });
          guild.auditLog = [
            {
              id: `audit_lead_${serverNowMs}`,
              actorName: record.state.name,
              action: `Transferiu a liderança da guilda para ${target.name}.`,
              timestampMs: serverNowMs,
            },
            ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
          ];
          message = `Liderança transferida para ${target.name}!`;
          break;
        }

        case 'guild_dissolve': {
          const confirmed = Boolean(params.confirmed);
          if (!confirmed) return fail('Confirmação explícita obrigatória para dissolver.');
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');
          if (guild.id === 'vip_guild_governo_xxmalta') {
            return fail('A guilda VIP GOVERNO é permanente e não pode ser dissolvida.');
          }

          const actorMember = guild.members.find((m) => m.id === identity.uid);
          if (!actorMember || !GUILD_PERMISSIONS[actorMember.role].dissolveGuild) {
            return fail('Apenas o Líder pode dissolver a guilda.');
          }

          this.guilds.delete(guildId);
          message = `A guilda ${guild.name} [${guild.tag}] foi dissolvida.`;
          break;
        }

        case 'guild_change_role': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const actorMember = guild.members.find((m) => m.id === identity.uid);
          if (!actorMember || !GUILD_PERMISSIONS[actorMember.role].changeMemberRole) {
            return fail('Apenas o Líder pode promover ou rebaixar membros.');
          }

          const targetMemberId = String(params.targetMemberId ?? '');
          const newRole = String(params.newRole ?? '') as 'admin' | 'member';
          if (newRole !== 'admin' && newRole !== 'member') {
            return fail('Cargo inválido.');
          }

          const target = guild.members.find((m) => m.id === targetMemberId);
          if (!target || target.id === identity.uid) {
            return fail('Membro alvo inválido.');
          }

          guild.members = guild.members.map((m) =>
            m.id === targetMemberId ? { ...m, role: newRole } : m
          );
          guild.auditLog = [
            {
              id: `audit_role_${serverNowMs}`,
              actorName: record.state.name,
              action: `Alterou o cargo de ${target.name} para ${newRole === 'admin' ? 'Administrador' : 'Membro'}.`,
              timestampMs: serverNowMs,
            },
            ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
          ];
          message = `Cargo de ${target.name} atualizado!`;
          break;
        }

        case 'guild_kick_member': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const actorMember = guild.members.find((m) => m.id === identity.uid);
          const targetMemberId = String(params.targetMemberId ?? '');
          const target = guild.members.find((m) => m.id === targetMemberId);
          if (!actorMember || !target || target.id === identity.uid) {
            return fail('Operação inválida.');
          }
          if (target.role === 'leader') {
            return fail('O Líder da guilda não pode ser expulso.');
          }
          const perms = GUILD_PERMISSIONS[actorMember.role];
          if (target.role === 'admin' && !perms.kickAdminMember) {
            return fail('Administradores não podem expulsar outros Administradores.');
          }
          if (target.role === 'member' && !perms.kickRegularMember) {
            return fail('Seu cargo não possui permissão para remover membros.');
          }

          guild.members = guild.members.filter((m) => m.id !== targetMemberId);
          guild.auditLog = [
            {
              id: `audit_kick_${serverNowMs}`,
              actorName: record.state.name,
              action: `Removeu ${target.name} da guilda.`,
              timestampMs: serverNowMs,
            },
            ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
          ];
          message = `${target.name} foi removido da guilda. A Honra Total foi recalculada imediatamente.`;
          break;
        }

        case 'guild_update_profile': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const actorMember = guild.members.find((m) => m.id === identity.uid);
          if (
            !actorMember ||
            !GUILD_PERMISSIONS[actorMember.role].editDescriptionAndRecruitment
          ) {
            return fail('Apenas o Líder ou Administradores podem editar o perfil.');
          }

          guild.description =
            String(params.description ?? guild.description).trim().slice(0, 220) ||
            guild.description;
          guild.recruitmentStatus =
            guild.id === 'vip_guild_governo_xxmalta'
              ? 'closed'
              : (params.recruitmentStatus as GuildRecruitmentStatus) ??
                guild.recruitmentStatus;
          guild.minLevelReq = Math.max(
            1,
            Math.floor(Number(params.minLevelReq ?? guild.minLevelReq))
          );
          guild.minHonorReq = Math.max(
            0,
            Math.floor(Number(params.minHonorReq ?? guild.minHonorReq))
          );
          guild.auditLog = [
            {
              id: `audit_prof_${serverNowMs}`,
              actorName: record.state.name,
              action: 'Atualizou descrição e regras de recrutamento.',
              timestampMs: serverNowMs,
            },
            ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
          ];
          message = 'Perfil e requisitos da guilda atualizados!';
          break;
        }

        case 'guild_post_announcement': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const actorMember = guild.members.find((m) => m.id === identity.uid);
          if (!actorMember || !GUILD_PERMISSIONS[actorMember.role].postAnnouncement) {
            return fail('Apenas o Líder ou Administradores podem publicar avisos.');
          }

          const content = String(params.content ?? '').trim();
          if (content.length < 3) {
            return fail('Escreva uma mensagem com pelo menos 3 caracteres.');
          }

          guild.announcements = [
            {
              id: `ann_${serverNowMs}`,
              authorName: record.state.name,
              authorRole: actorMember.role,
              content: content.slice(0, 200),
              timestampMs: serverNowMs,
            },
            ...guild.announcements.slice(0, MAX_RETAINED_ANNOUNCEMENTS - 1),
          ];
          message = 'Anúncio publicado no quadro da guilda.';
          break;
        }

        case 'guild_donate_gold': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você precisa pertencer a uma guilda para doar.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const amount = Number(params.amount ?? 0);
          if (!Number.isInteger(amount) || amount <= 0) {
            return fail('Informe um valor inteiro positivo de ouro para doar.');
          }
          if (record.state.gold < amount) {
            return fail(`Ouro insuficiente na carteira (${record.state.gold} Ouro).`);
          }

          // Desconta atomicamente do jogador e credita no banco da guilda
          record.state = {
            ...record.state,
            gold: record.state.gold - amount,
          };
          guild.treasuryGold += amount;
          guild.members = guild.members.map((m) =>
            m.id === identity.uid
              ? { ...m, goldContributed: m.goldContributed + amount }
              : m
          );
          const bankTx: GuildBankTransaction = {
            txId: opId,
            type: 'donation',
            authorName: record.state.name,
            amount,
            description: 'Doação voluntária ao Aerarium',
            timestampMs: serverNowMs,
          };
          guild.bankHistory = [
            bankTx,
            ...guild.bankHistory.slice(0, MAX_RETAINED_LEDGER_ENTRIES - 1),
          ];
          guild.auditLog = [
            {
              id: `audit_don_${serverNowMs}_${opId.slice(-6)}`,
              actorName: record.state.name,
              action: `Doou +${amount} Ouro ao Banco da Guilda.`,
              timestampMs: serverNowMs,
            },
            ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
          ];
          this.syncPlayerIntoSharedGuildMember(record);
          message = `Você doou +${amount} Ouro ao Banco da Guilda!`;
          break;
        }

        case 'guild_upgrade_building': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const actorMember = guild.members.find((m) => m.id === identity.uid);
          if (!actorMember || !GUILD_PERMISSIONS[actorMember.role].upgradeBuildings) {
            return fail('Apenas o Líder ou Administradores podem melhorar edifícios.');
          }

          const buildingId = String(params.buildingId ?? '') as GuildBuildingId;
          const def = GUILD_BUILDING_DEFINITIONS[buildingId];
          if (!def) return fail('Edifício inválido.');

          const currentLevel = guild.buildings[buildingId] ?? 1;
          if (currentLevel >= def.maxLevel) {
            return fail(`${def.name} já atingiu o nível máximo (${def.maxLevel}).`);
          }

          const forumLevel = guild.buildings.forum_gladiatorius ?? 1;
          if (def.requiresForumLevel && currentLevel >= forumLevel) {
            return fail(
              `Requer Forum Gladiatorius Nível ${currentLevel + 1} antes de expandir ${def.name}.`
            );
          }

          const cost = getBuildingUpgradeCost(buildingId, currentLevel);
          if (guild.treasuryGold < cost) {
            return fail(
              `Saldo insuficiente no Banco da Guilda (${guild.treasuryGold}/${cost} Ouro).`
            );
          }

          const nextLevel = currentLevel + 1;
          guild.treasuryGold -= cost;
          guild.buildings = {
            ...guild.buildings,
            [buildingId]: nextLevel,
          };
          if (buildingId === 'mercado_interno') {
            guild.internalMarketTemplateIds = getInternalMarketTemplateIdsForLevel(nextLevel);
          }
          guild.bankHistory = [
            {
              txId: opId,
              type: 'upgrade',
              authorName: record.state.name,
              amount: cost,
              description: `Melhoria: ${def.name} Nv.${nextLevel}`,
              timestampMs: serverNowMs,
            },
            ...guild.bankHistory.slice(0, MAX_RETAINED_LEDGER_ENTRIES - 1),
          ];
          guild.auditLog = [
            {
              id: `audit_upg_${serverNowMs}_${buildingId}`,
              actorName: record.state.name,
              action: `Melhorou ${def.name} para o Nível ${nextLevel} (-${cost} Ouro do Banco).`,
              timestampMs: serverNowMs,
            },
            ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
          ];
          message = `${def.name} expandido para o Nível ${nextLevel}!`;
          break;
        }

        case 'guild_use_villa_medici': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) {
            return fail('Você precisa pertencer a uma guilda para usar a Villa Medici.');
          }
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const elapsedSinceLastUse = serverNowMs - record.lastVillaMediciUseMs;
          if (
            record.lastVillaMediciUseMs > 0 &&
            elapsedSinceLastUse < GUILD_CONFIG.villaMediciCooldownMs
          ) {
            const remMinutes = Math.ceil(
              (GUILD_CONFIG.villaMediciCooldownMs - elapsedSinceLastUse) / 60000
            );
            return fail(`A Villa Medici está em tempo de espera (${remMinutes} min).`);
          }

          const stateWithGuild = this.buildClientGameStateForPlayer(record, serverNowMs);
          const derived = calculateDerivedStats(
            stateWithGuild.baseStats,
            stateWithGuild.equipped,
            stateWithGuild.level,
            stateWithGuild.guildState,
            serverNowMs
          );
          if (record.state.currentHp >= derived.maxHp) {
            return fail('Sua Vida já está no máximo.');
          }

          const mediciLv = guild.buildings.villa_medici ?? 1;
          const goldFee = Math.max(2, GUILD_CONFIG.villaMediciBaseGoldFee - mediciLv);
          if (record.state.gold < goldFee) {
            return fail(`Ouro insuficiente para a taxa da Villa Medici (${goldFee} Ouro).`);
          }

          const healPercent = 25 + mediciLv * 10;
          const healAmount = Math.max(15, Math.round((derived.maxHp * healPercent) / 100));
          const nextHp = Math.min(derived.maxHp, record.state.currentHp + healAmount);
          const actualHealed = nextHp - record.state.currentHp;

          record.state = {
            ...record.state,
            gold: record.state.gold - goldFee,
            currentHp: nextHp,
          };
          record.lastVillaMediciUseMs = serverNowMs;
          message = `Villa Medici restaurou +${actualHealed} PV (-${goldFee} Ouro).`;
          break;
        }

        case 'guild_activate_scroll':
        case 'guild_activate_library_scroll': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const actorMember = guild.members.find((m) => m.id === identity.uid);
          if (!actorMember || !GUILD_PERMISSIONS[actorMember.role].activateLibraryBuff) {
            return fail('Apenas o Líder ou Administradores podem ativar pergaminhos.');
          }

          const scrollId = String(params.scrollId ?? '') as LibraryScrollId;
          const scrollDef = LIBRARY_SCROLL_DEFINITIONS[scrollId];
          if (!scrollDef) return fail('Pergaminho inválido.');

          const libLv = guild.buildings.biblioteca ?? 1;
          if (guild.treasuryGold < scrollDef.treasuryCost) {
            return fail(
              `Tesouro insuficiente no Banco (${guild.treasuryGold}/${scrollDef.treasuryCost} Ouro).`
            );
          }

          const validBuffs = guild.activeBuffs.filter((b) => b.expiresAtMs > serverNowMs);
          if (validBuffs.some((b) => b.scrollId === scrollId)) {
            return fail(`${scrollDef.name} já está ativo no momento.`);
          }

          const newBuff: ActiveLibraryBuff = {
            scrollId,
            name: scrollDef.name,
            activatedBy: record.state.name,
            startedAtMs: serverNowMs,
            expiresAtMs: serverNowMs + GUILD_CONFIG.libraryBuffDurationMs,
            libraryLevelAtActivation: libLv,
          };

          guild.treasuryGold -= scrollDef.treasuryCost;
          guild.activeBuffs = [...validBuffs, newBuff];
          guild.bankHistory = [
            {
              txId: opId,
              type: 'library_buff',
              authorName: record.state.name,
              amount: scrollDef.treasuryCost,
              description: `Ativação: ${scrollDef.name} (2h)`,
              timestampMs: serverNowMs,
            },
            ...guild.bankHistory.slice(0, MAX_RETAINED_LEDGER_ENTRIES - 1),
          ];
          guild.auditLog = [
            {
              id: `audit_buff_${serverNowMs}`,
              actorName: record.state.name,
              action: `Ativou ${scrollDef.name} na Biblioteca (-${scrollDef.treasuryCost} Ouro do Banco).`,
              timestampMs: serverNowMs,
            },
            ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
          ];
          message = `${scrollDef.name} ativado por 2 horas para toda a guilda!`;
          break;
        }

        case 'guild_warehouse_deposit':
        case 'guild_deposit_warehouse': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const maxSlots =
            (guild.buildings.armazem ?? 1) * GUILD_CONFIG.warehouseSlotsPerLevel;
          if (guild.warehouseItems.length >= maxSlots) {
            return fail(
              `Armazém da guilda cheio (${guild.warehouseItems.length}/${maxSlots}).`
            );
          }

          const inventoryItemId = String(params.inventoryItemId ?? params.itemId ?? '');
          const idx = record.state.inventory.findIndex((i) => i.id === inventoryItemId);
          if (idx === -1) {
            return fail('Item não encontrado na sua mochila.');
          }
          const item = record.state.inventory[idx];
          const nextInv = [...record.state.inventory];
          nextInv.splice(idx, 1);

          record.state = {
            ...record.state,
            inventory: nextInv,
          };
          guild.warehouseItems.push(item);
          guild.auditLog = [
            {
              id: `audit_wh_in_${serverNowMs}`,
              actorName: record.state.name,
              action: `Depositou ${item.name} no Armazém.`,
              timestampMs: serverNowMs,
            },
            ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
          ];
          message = `${item.name} depositado no Armazém da Guilda.`;
          break;
        }

        case 'guild_warehouse_withdraw':
        case 'guild_withdraw_warehouse': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          if (record.state.inventory.length >= GAME_CONFIG.maxInventorySlots) {
            return fail('Sua mochila está cheia!');
          }

          const warehouseItemId = String(params.warehouseItemId ?? params.itemId ?? '');
          const idx = guild.warehouseItems.findIndex((i) => i.id === warehouseItemId);
          if (idx === -1) {
            return fail('Item não encontrado no Armazém (pode ter sido retirado por outro membro).');
          }
          const item = guild.warehouseItems[idx];
          guild.warehouseItems.splice(idx, 1);

          record.state = {
            ...record.state,
            inventory: [...record.state.inventory, item],
          };
          guild.auditLog = [
            {
              id: `audit_wh_out_${serverNowMs}`,
              actorName: record.state.name,
              action: `Retirou ${item.name} do Armazém.`,
              timestampMs: serverNowMs,
            },
            ...guild.auditLog.slice(0, MAX_RETAINED_AUDIT_ENTRIES - 1),
          ];
          message = `${item.name} retirado do Armazém para sua mochila.`;
          break;
        }

        case 'guild_buy_internal_market': {
          const guildId = this.findPlayerGuildId(identity.uid);
          if (!guildId) return fail('Você não pertence a uma guilda.');
          const guild = this.guilds.get(guildId);
          if (!guild) return fail('Guilda não encontrada.');

          const templateId = String(params.templateId ?? '');
          const allowedTemplates = getInternalMarketTemplateIdsForLevel(
            guild.buildings.mercado_interno ?? 1
          );
          if (!allowedTemplates.includes(templateId)) {
            return fail('Este equipamento requer um nível superior do Mercado Interno.');
          }
          const tpl = ITEM_TEMPLATES[templateId];
          if (!tpl) return fail('Item inválido.');

          if (record.state.inventory.length >= GAME_CONFIG.maxInventorySlots) {
            return fail('Sua mochila está cheia!');
          }

          const discountedPrice = Math.max(
            1,
            Math.round(
              tpl.buyPrice * (1 - GUILD_CONFIG.internalMarketDiscountPercent / 100)
            )
          );
          if (record.state.gold < discountedPrice) {
            return fail(
              `Ouro insuficiente (${record.state.gold}/${discountedPrice} Ouro).`
            );
          }

          const newItem: GameItem = {
            ...tpl,
            id: `item_${tpl.templateId}_gmkt_${serverNowMs}_${record.state.inventory.length}`,
            stats: { ...tpl.stats },
          };

          record.state = {
            ...record.state,
            gold: record.state.gold - discountedPrice,
            inventory: [...record.state.inventory, newItem],
          };
          message = `${tpl.name} adquirido no Mercado Interno por ${discountedPrice} Ouro (-15%)!`;
          break;
        }

        default:
          return fail(`Ação desconhecida: ${String(payload.action)}`);
      }

      // Registra opId processado com retenção limitada
      record.processedOpIds = [
        ...record.processedOpIds.slice(-(MAX_RETAINED_OP_IDS - 1)),
        opId,
      ];
      record.updatedAtMs = serverNowMs;
      this.metrics.totalMutations += 1;
      this.metrics.writesObserved += 2;
      this.cachedPublicProfiles.delete(identity.uid);

      const guildMembershipActions = new Set([
        'guild_create',
        'guild_apply_or_join',
        'guild_approve_application',
        'guild_remove_member',
        'guild_leave',
        'guild_transfer_leader',
        'guild_update_settings',
        'guild_upgrade_building',
      ]);
      const playerRankingActions = new Set([
        'claim_reward',
        'claim_all_rewards',
        'rename_gladiator',
      ]);
      if (guildMembershipActions.has(payload.action)) {
        this.invalidateRankingCaches(true);
      } else if (playerRankingActions.has(payload.action)) {
        this.invalidateRankingCaches(false);
      }

      this.saveToDisk();

      const updatedClientState = this.buildClientGameStateForPlayer(record, serverNowMs);
      return {
        ok: true,
        idempotentReplay: false,
        message,
        serverTimestampMs: serverNowMs,
        state: updatedClientState,
        combatReport,
        offlineBatchCreated,
        leveledUp,
        playerRank: this.getPlayerRankPosition(identity.uid, 'honor', serverNowMs),
        guildRank: this.getPlayerGuildRankPosition(identity.uid, serverNowMs),
      };
  }

  private getSortedPlayerRankingIndex(
    category: PlayerRankingCategory,
    nowMs: number = Date.now()
  ): (OnlinePublicPlayerProfile & { rank: number })[] {
    const cached = this.cachedPlayerRankings.get(category);
    if (cached && nowMs - cached.computedAtMs < 5000) {
      return cached.list;
    }

    const profiles: OnlinePublicPlayerProfile[] = [];
    for (const rec of this.players.values()) {
      profiles.push(this.toPublicProfile(rec, nowMs));
    }

    const getMetric = (p: OnlinePublicPlayerProfile): number => {
      switch (category) {
        case 'honor':
          return p.honor;
        case 'fame':
          return p.fame;
        case 'wins':
          return p.wins;
        case 'feats':
          return p.featsCount;
        case 'gold_looted':
          return p.goldLooted;
      }
    };

    profiles.sort((a, b) => {
      const diff = getMetric(b) - getMetric(a);
      if (diff !== 0) return diff;
      if (b.honor !== a.honor) return b.honor - a.honor;
      if (b.level !== a.level) return b.level - a.level;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.uid.localeCompare(b.uid);
    });

    const rankMap = new Map<string, number>();
    const ranked = profiles.map((p, idx) => {
      const rank = idx + 1;
      rankMap.set(p.uid, rank);
      return {
        ...p,
        rank,
      };
    });

    this.cachedRankMapByCategory.set(category, rankMap);
    this.cachedPlayerRankings.set(category, {
      computedAtMs: nowMs,
      list: ranked,
    });
    return ranked;
  }

  private getSortedGuildRankingIndex(
    nowMs: number = Date.now()
  ): Omit<OnlineGuildRankingItem, 'isPlayerGuild'>[] {
    if (this.cachedGuildRankings && nowMs - this.cachedGuildRankings.computedAtMs < 5000) {
      return this.cachedGuildRankings.list;
    }

    const entries = Array.from(this.guilds.values()).map((g) => {
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
        description: g.description,
        leaderId: leader?.id ?? '',
        leaderName: leader?.name ?? 'Desconhecido',
        memberCount,
        maxCapacity,
        totalHonor,
        averageHonor,
        recruitmentStatus: g.recruitmentStatus,
        minLevelReq: g.minLevelReq,
        minHonorReq: g.minHonorReq,
      };
    });

    entries.sort((a, b) => {
      if (b.totalHonor !== a.totalHonor) return b.totalHonor - a.totalHonor;
      if (b.averageHonor !== a.averageHonor) return b.averageHonor - a.averageHonor;
      if (b.memberCount !== a.memberCount) return b.memberCount - a.memberCount;
      return a.id.localeCompare(b.id);
    });

    const ranked = entries.map((e, idx) => ({
      ...e,
      rank: idx + 1,
    }));

    this.cachedGuildRankings = {
      computedAtMs: nowMs,
      list: ranked,
    };
    return ranked;
  }

  public getPlayerRankPosition(
    uid: string,
    category: PlayerRankingCategory = 'honor',
    nowMs: number = Date.now()
  ): number {
    const list = this.getSortedPlayerRankingIndex(category, nowMs);
    return this.cachedRankMapByCategory.get(category)?.get(uid) ?? list.length + 1;
  }

  public getPlayerGuildRankPosition(uid: string, nowMs: number = Date.now()): number | null {
    const guildId = this.findPlayerGuildId(uid);
    if (!guildId) return null;
    const list = this.getSortedGuildRankingIndex(nowMs);
    return list.find((g) => g.id === guildId)?.rank ?? null;
  }

  /**
   * Consulta paginada por cursor do Ranking Geral de Jogadores (Seção 10).
   */
  public queryPlayerRankings(options: {
    category?: PlayerRankingCategory;
    limit?: number;
    cursor?: string | null;
    search?: string;
    viewerUid?: string | null;
    jumpToViewerPage?: boolean;
    jumpToMyPosition?: boolean;
    nowMs?: number;
  }): CursorPaginatedPlayersResponse {
    const nowMs = options.nowMs ?? Date.now();
    const category = options.category ?? 'honor';
    const limit = Math.max(1, Math.min(50, options.limit ?? GUILD_CONFIG.rankingPageSize));
    const search = (options.search ?? '').trim().toLowerCase();

    this.metrics.totalRequests += 1;
    const fullRanked = this.getSortedPlayerRankingIndex(category, nowMs);

    const viewerRanked = options.viewerUid
      ? fullRanked.find((p) => p.uid === options.viewerUid) ?? null
      : null;

    const filtered = search
      ? fullRanked.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            (p.guildTag && p.guildTag.toLowerCase().includes(search)) ||
            (p.guildName && p.guildName.toLowerCase().includes(search))
        )
      : fullRanked;

    let startIndex = 0;
    const shouldJump = Boolean(options.jumpToViewerPage || options.jumpToMyPosition);
    if (shouldJump && options.viewerUid) {
      const vIdx = filtered.findIndex((p) => p.uid === options.viewerUid);
      if (vIdx >= 0) {
        startIndex = Math.floor(vIdx / limit) * limit;
      }
    } else if (options.cursor) {
      const cIdx = filtered.findIndex((p) => p.uid === options.cursor);
      if (cIdx >= 0) {
        startIndex = cIdx + 1;
      }
    }

    const slice = filtered.slice(startIndex, startIndex + limit);
    this.metrics.readsObserved += slice.length;

    const hasMore = startIndex + limit < filtered.length;
    const nextCursor = hasMore && slice.length > 0 ? slice[slice.length - 1].uid : null;
    const ownEntry = viewerRanked
      ? {
          ...viewerRanked,
          isPlayer: true,
        }
      : null;

    return {
      items: slice.map((p) => ({
        ...p,
        isPlayer: p.uid === options.viewerUid,
      })),
      nextCursor,
      hasMore,
      totalCount: filtered.length,
      totalPlayers: filtered.length,
      myPosition: viewerRanked?.rank ?? null,
      myEntry: ownEntry,
      playerOwnEntry: ownEntry,
      category,
      updatedAtMs: nowMs,
      positionStrategy: 'exact_server_index',
    };
  }

  /**
   * Consulta paginada por cursor do Ranking de Guildas Online (Seção 10).
   */
  public queryGuildRankings(options: {
    limit?: number;
    cursor?: string | null;
    search?: string;
    viewerUid?: string | null;
    jumpToViewerGuild?: boolean;
    jumpToMyGuild?: boolean;
    nowMs?: number;
  }): CursorPaginatedGuildsResponse {
    const nowMs = options.nowMs ?? Date.now();
    const limit = Math.max(1, Math.min(50, options.limit ?? GUILD_CONFIG.rankingPageSize));
    const search = (options.search ?? '').trim().toLowerCase();

    this.metrics.totalRequests += 1;
    const fullRanked = this.getSortedGuildRankingIndex(nowMs);
    const viewerGuildId = options.viewerUid
      ? this.findPlayerGuildId(options.viewerUid)
      : null;

    const viewerGuildItem = viewerGuildId
      ? fullRanked.find((g) => g.id === viewerGuildId) ?? null
      : null;
    const myGuildPosition = viewerGuildItem?.rank ?? null;

    const filtered = search
      ? fullRanked.filter(
          (g) =>
            g.name.toLowerCase().includes(search) ||
            g.tag.toLowerCase().includes(search) ||
            g.leaderName.toLowerCase().includes(search)
        )
      : fullRanked;

    let startIndex = 0;
    const shouldJump = Boolean(options.jumpToViewerGuild || options.jumpToMyGuild);
    if (shouldJump && viewerGuildId) {
      const gIdx = filtered.findIndex((g) => g.id === viewerGuildId);
      if (gIdx >= 0) {
        startIndex = Math.floor(gIdx / limit) * limit;
      }
    } else if (options.cursor) {
      const cIdx = filtered.findIndex((g) => g.id === options.cursor);
      if (cIdx >= 0) {
        startIndex = cIdx + 1;
      }
    }

    const slice = filtered.slice(startIndex, startIndex + limit);
    this.metrics.readsObserved += slice.length;

    const hasMore = startIndex + limit < filtered.length;
    const nextCursor = hasMore && slice.length > 0 ? slice[slice.length - 1].id : null;

    return {
      items: slice.map((g) => ({
        ...g,
        isPlayerGuild: g.id === viewerGuildId,
      })),
      nextCursor,
      hasMore,
      totalCount: filtered.length,
      totalGuilds: filtered.length,
      myGuildPosition,
      playerGuildEntry: viewerGuildItem
        ? {
            ...viewerGuildItem,
            isPlayerGuild: true,
          }
        : null,
      updatedAtMs: nowMs,
    };
  }

  /**
   * Gera um dataset reproduzível de N jogadores sintéticos (ex.: 1.000 jogadores e 80 guildas)
   * exclusivamente para a bateria de testes de Volume, Concorrência e Desempenho de Interface (Seção 12).
   */
  public seedThousandPlayersDataset(
    totalPlayers: number = 1000,
    nowMs: number = Date.now()
  ): { playersSeeded: number; guildsSeeded: number } {
    this.players.clear();
    this.guilds.clear();

    const guildCount = Math.max(1, Math.min(80, Math.floor(totalPlayers / 12.5)));
    const emblems: GuildEmblemId[] = [
      'aquila_imperial',
      'gladius_crossed',
      'laurel_crown',
      'lupa_capitolina',
      'galea_centurion',
      'scutum_praetorian',
    ];

    // Cria as guildas sintéticas
    for (let gIdx = 1; gIdx <= guildCount; gIdx++) {
      const gId = `syn_guild_${String(gIdx).padStart(3, '0')}`;
      const tag = `G${String(gIdx).padStart(2, '0')}`;
      const guild: GuildRecord = {
        id: gId,
        name: `Legio Cohortis #${gIdx}`,
        tag,
        emblemId: emblems[gIdx % emblems.length],
        description: `Aliança de teste de volume #${gIdx}`,
        recruitmentStatus: 'open',
        minLevelReq: 1,
        minHonorReq: 0,
        treasuryGold: 500 + gIdx * 20,
        buildings: {
          forum_gladiatorius: 4, // até 14 membros
          banco: 2,
          campo_treino: 2,
          balneario: 2,
          villa_medici: 2,
          biblioteca: 2,
          armazem: 2,
          mercado_interno: 2,
        },
        members: [],
        applications: [],
        warehouseItems: [],
        internalMarketTemplateIds: getInternalMarketTemplateIdsForLevel(2),
        activeBuffs: [],
        bankHistory: [],
        auditLog: [],
        announcements: [],
        createdAtMs: nowMs,
        isSimulatedSeed: false,
      };
      this.guilds.set(gId, guild);
    }

    const guildList = Array.from(this.guilds.values());

    // Cria os 1.000 jogadores sintéticos e distribui nas guildas
    for (let i = 1; i <= totalPlayers; i++) {
      const uid = `syn_player_${String(i).padStart(4, '0')}`;
      const state = createInitialGameState(nowMs);
      state.name = `Gladiador #${String(i).padStart(4, '0')}`;
      state.title = i <= 50 ? 'Campeão da Campânia' : 'Secutor de Cápua';
      state.level = 1 + ((totalPlayers - i) % 15);
      state.honor = (totalPlayers - i + 1) * 12;
      state.fame = (totalPlayers - i + 1) * 18;
      state.wins = 3 + ((totalPlayers - i) % 80);
      state.losses = i % 15;
      state.gold = 350 + (i % 500);
      state.goldLooted = state.wins * 40;

      const assignedGuild = guildList[(i - 1) % guildList.length];
      const maxCap = getGuildMaxCapacity(assignedGuild.buildings.forum_gladiatorius ?? 4);
      let joinedGuildId: string | null = null;

      if (assignedGuild.members.length < maxCap) {
        joinedGuildId = assignedGuild.id;
        assignedGuild.members.push({
          id: uid,
          name: state.name,
          title: state.title,
          isPlayer: false,
          role: assignedGuild.members.length === 0 ? 'leader' : 'member',
          level: state.level,
          honor: state.honor,
          fame: state.fame,
          wins: state.wins,
          goldLooted: state.goldLooted,
          featsCount: 2 + (i % 4),
          goldContributed: 25,
          joinedAtMs: nowMs,
        });
      }

      state.guildState = {
        ...state.guildState,
        playerGuildId: joinedGuildId,
        guilds: [],
        simulatedGladiators: [],
      };

      this.players.set(uid, {
        uid,
        email: `${uid}@ludus.test`,
        competitiveStatus: 'verified_online',
        migratedFromLocal: false,
        migrationSummary: null,
        state,
        processedOpIds: [],
        lastVillaMediciUseMs: 0,
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      });
    }

    this.invalidateRankingCaches();
    return {
      playersSeeded: this.players.size,
      guildsSeeded: this.guilds.size,
    };
  }

  public resetSyntheticVolumeDataset(nowMs: number = Date.now()) {
    for (const key of Array.from(this.players.keys())) {
      if (key.startsWith('syn_player_')) {
        this.players.delete(key);
      }
    }
    for (const key of Array.from(this.guilds.keys())) {
      if (key.startsWith('syn_guild_')) {
        this.guilds.delete(key);
      }
    }
    if (this.guilds.size === 0) {
      this.seedFoundationalOnlineGuilds(nowMs);
    }
    this.invalidateRankingCaches();
    this.saveToDisk();
    return {
      playersRemaining: this.players.size,
      guildsRemaining: this.guilds.size,
    };
  }
}
