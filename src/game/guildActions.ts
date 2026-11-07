import { GAME_CONFIG, GameItem, ITEM_TEMPLATES } from './config';
import {
  ActiveLibraryBuff,
  getBuildingUpgradeCost,
  getGuildMaxCapacity,
  getInternalMarketTemplateIdsForLevel,
  GUILD_BUILDING_DEFINITIONS,
  GUILD_CONFIG,
  GUILD_PERMISSIONS,
  GuildApplicationRecord,
  GuildBuildingId,
  GuildEmblemId,
  GuildMemberRecord,
  GuildRecord,
  GuildRecruitmentStatus,
  GuildRole,
  LIBRARY_SCROLL_DEFINITIONS,
  LibraryScrollId,
} from './guildsAndRankings';
import {
  calculateDerivedStats,
  createItemFromTemplate,
  GameState,
  getPlayerSnapshotForRankings,
  syncPlayerWithGuildAndFeats,
} from './rules';

export interface GuildActionResult {
  state: GameState;
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Interface de Serviço de Domínio (Seção 1).
 * Desacopla as regras de negócio da persistência local, permitindo futura substituição por backend.
 */
export interface GuildDomainService {
  createGuild: typeof createGuild;
  applyOrJoinGuild: typeof applyOrJoinGuild;
  cancelGuildApplication: typeof cancelGuildApplication;
  reviewGuildApplication: typeof reviewGuildApplication;
  leaveGuild: typeof leaveGuild;
  transferGuildLeadership: typeof transferGuildLeadership;
  dissolveGuild: typeof dissolveGuild;
  changeGuildMemberRole: typeof changeGuildMemberRole;
  kickGuildMember: typeof kickGuildMember;
  updateGuildProfile: typeof updateGuildProfile;
  postGuildAnnouncement: typeof postGuildAnnouncement;
  donateToGuildBank: typeof donateToGuildBank;
  upgradeGuildBuilding: typeof upgradeGuildBuilding;
  useVillaMedici: typeof useVillaMedici;
  activateLibraryScroll: typeof activateLibraryScroll;
  depositItemToGuildWarehouse: typeof depositItemToGuildWarehouse;
  withdrawItemFromGuildWarehouse: typeof withdrawItemFromGuildWarehouse;
  buyFromGuildInternalMarket: typeof buyFromGuildInternalMarket;
}

/**
 * 1. CRIAR GUILDA (Seção 3)
 * Valida ausência de guilda atual, nível mínimo, ouro suficiente, nome/tag únicos e formato válido.
 */
export function createGuild(
  state: GameState,
  input: {
    name: string;
    tag: string;
    emblemId: GuildEmblemId;
    description: string;
    recruitmentStatus: GuildRecruitmentStatus;
    minLevelReq?: number;
    minHonorReq?: number;
  },
  nowMs: number = Date.now()
): GuildActionResult {
  if (state.guildState.playerGuildId) {
    return {
      state,
      success: false,
      message: '',
      error: 'Você já pertence a uma guilda. Saia da guilda atual antes de fundar outra.',
    };
  }

  if (state.level < GUILD_CONFIG.creationMinLevel) {
    return {
      state,
      success: false,
      message: '',
      error: `Requer Nível ${GUILD_CONFIG.creationMinLevel} para fundar uma guilda.`,
    };
  }

  if (state.gold < GUILD_CONFIG.creationCostGold) {
    return {
      state,
      success: false,
      message: '',
      error: `Ouro insuficiente. Fundar uma guilda custa ${GUILD_CONFIG.creationCostGold} denários.`,
    };
  }

  const cleanName = input.name.trim();
  const cleanTag = input.tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (
    cleanName.length < GUILD_CONFIG.minNameLength ||
    cleanName.length > GUILD_CONFIG.maxNameLength
  ) {
    return {
      state,
      success: false,
      message: '',
      error: `O nome da guilda deve ter entre ${GUILD_CONFIG.minNameLength} e ${GUILD_CONFIG.maxNameLength} caracteres.`,
    };
  }

  if (
    cleanTag.length < GUILD_CONFIG.minTagLength ||
    cleanTag.length > GUILD_CONFIG.maxTagLength
  ) {
    return {
      state,
      success: false,
      message: '',
      error: `A tag da guilda deve ter entre ${GUILD_CONFIG.minTagLength} e ${GUILD_CONFIG.maxTagLength} letras/números.`,
    };
  }

  const duplicate = state.guildState.guilds.some(
    (g) =>
      g.name.toLowerCase() === cleanName.toLowerCase() ||
      g.tag.toUpperCase() === cleanTag
  );
  if (duplicate) {
    return {
      state,
      success: false,
      message: '',
      error: 'Já existe uma guilda registrada com este nome ou tag em Cápua.',
    };
  }

  const snap = getPlayerSnapshotForRankings(state);
  const newGuildId = `guild_custom_${nowMs}`;

  const founderMember: GuildMemberRecord = {
    id: 'player_aurelius',
    name: snap.name,
    title: snap.title,
    isPlayer: true,
    role: 'leader',
    level: snap.level,
    honor: snap.honor,
    fame: snap.fame,
    wins: snap.wins,
    goldLooted: snap.goldLooted,
    featsCount: snap.featsCount,
    goldContributed: 0,
    joinedAtMs: nowMs,
  };

  // Remove eventuais candidaturas pendentes do jogador em outras guildas
  const cleanedGuilds = state.guildState.guilds.map((g) => ({
    ...g,
    applications: g.applications.filter((a) => !a.isPlayer),
  }));

  const newGuild: GuildRecord = {
    id: newGuildId,
    name: cleanName,
    tag: cleanTag,
    emblemId: input.emblemId,
    description:
      input.description.trim() ||
      'Aliança fundada por gladiadores de Cápua em busca de glória eterna.',
    recruitmentStatus: input.recruitmentStatus,
    minLevelReq: Math.max(1, input.minLevelReq ?? 1),
    minHonorReq: Math.max(0, input.minHonorReq ?? 0),
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
    members: [founderMember],
    applications: [
      {
        id: `app_aspirant_${nowMs}`,
        applicantId: 'sim_glad_free_1',
        applicantName: 'Tiberius Nero',
        isPlayer: false,
        level: 2,
        honor: 42,
        message: 'Saudações, Magister! Peço permissão para integrar sua nova aliança.',
        createdAtMs: nowMs,
        status: 'pending',
      },
    ],
    warehouseItems: [],
    internalMarketTemplateIds: getInternalMarketTemplateIdsForLevel(1),
    activeBuffs: [],
    bankHistory: [],
    auditLog: [
      {
        id: `audit_${nowMs}`,
        actorName: state.name,
        action: `Fundou o Collegium ${cleanName} [${cleanTag}].`,
        timestampMs: nowMs,
      },
    ],
    announcements: [
      {
        id: `ann_${nowMs}`,
        authorName: state.name,
        authorRole: 'leader',
        content: `Estandarte de ${cleanName} [${cleanTag}] erguido em Cápua!`,
        timestampMs: nowMs,
      },
    ],
    createdAtMs: nowMs,
    isSimulatedSeed: false,
  };

  const nextState: GameState = {
    ...state,
    gold: state.gold - GUILD_CONFIG.creationCostGold,
    guildState: {
      ...state.guildState,
      playerGuildId: newGuildId,
      guilds: [newGuild, ...cleanedGuilds],
      lastUpdatedAtMs: nowMs,
    },
  };

  return {
    state: syncPlayerWithGuildAndFeats(nextState),
    success: true,
    message: `Guilda ${cleanName} [${cleanTag}] fundada com sucesso! (-${GUILD_CONFIG.creationCostGold} Ouro)`,
  };
}

/**
 * 2. CANDIDATAR-SE OU ENTRAR EM UMA GUILDA (Seção 3 e 4)
 * Impede participação simultânea em duas guildas, valida requisitos, status de recrutamento e capacidade.
 */
export function applyOrJoinGuild(
  state: GameState,
  guildId: string,
  message: string = 'Desejo lutar sob o estandarte desta aliança.',
  nowMs: number = Date.now()
): GuildActionResult {
  if (state.guildState.playerGuildId) {
    return {
      state,
      success: false,
      message: '',
      error: 'Cada jogador pode pertencer a no máximo uma guilda por vez.',
    };
  }

  const targetGuild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!targetGuild) {
    return {
      state,
      success: false,
      message: '',
      error: 'Guilda não encontrada.',
    };
  }

  if (targetGuild.recruitmentStatus === 'closed') {
    return {
      state,
      success: false,
      message: '',
      error: 'Esta guilda está com o recrutamento fechado no momento.',
    };
  }

  if (state.level < targetGuild.minLevelReq) {
    return {
      state,
      success: false,
      message: '',
      error: `Requisito não cumprido: Nível mínimo ${targetGuild.minLevelReq} (Seu nível: ${state.level}).`,
    };
  }

  if (state.honor < targetGuild.minHonorReq) {
    return {
      state,
      success: false,
      message: '',
      error: `Requisito não cumprido: Honra mínima ${targetGuild.minHonorReq} (Sua honra: ${state.honor}).`,
    };
  }

  const maxCap = getGuildMaxCapacity(targetGuild.buildings.forum_gladiatorius ?? 1);
  if (targetGuild.members.length >= maxCap) {
    return {
      state,
      success: false,
      message: '',
      error: `Capacidade máxima atingida (${targetGuild.members.length}/${maxCap}). O Forum Gladiatorius precisa ser expandido.`,
    };
  }

  // Se o recrutamento for 'open', o jogador ingressa imediatamente como membro;
  // se for 'application', cria uma candidatura pendente.
  if (targetGuild.recruitmentStatus === 'open') {
    const snap = getPlayerSnapshotForRankings(state);
    const playerMember: GuildMemberRecord = {
      id: 'player_aurelius',
      name: snap.name,
      title: snap.title,
      isPlayer: true,
      role: 'member',
      level: snap.level,
      honor: snap.honor,
      fame: snap.fame,
      wins: snap.wins,
      goldLooted: snap.goldLooted,
      featsCount: snap.featsCount,
      goldContributed: 0,
      joinedAtMs: nowMs,
    };

    const nextGuilds = state.guildState.guilds.map((g) => {
      if (g.id !== guildId) {
        return {
          ...g,
          applications: g.applications.filter((a) => !a.isPlayer),
        };
      }
      return {
        ...g,
        members: [...g.members, playerMember],
        applications: g.applications.filter((a) => !a.isPlayer),
        auditLog: [
          {
            id: `audit_join_${nowMs}`,
            actorName: state.name,
            action: `${state.name} ingressou na guilda (Recrutamento Aberto).`,
            timestampMs: nowMs,
          },
          ...g.auditLog,
        ],
      };
    });

    const nextState: GameState = {
      ...state,
      guildState: {
        ...state.guildState,
        playerGuildId: guildId,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    };

    return {
      state: syncPlayerWithGuildAndFeats(nextState),
      success: true,
      message: `Você ingressou em ${targetGuild.name} [${targetGuild.tag}]! Benefícios da sede ativos.`,
    };
  }

  // Recrutamento por candidatura
  const existingApp = targetGuild.applications.find(
    (a) => a.isPlayer && a.status === 'pending'
  );
  if (existingApp) {
    return {
      state,
      success: false,
      message: '',
      error: 'Você já possui uma candidatura pendente nesta guilda.',
    };
  }

  const newApp: GuildApplicationRecord = {
    id: `app_player_${nowMs}`,
    applicantId: 'player_aurelius',
    applicantName: state.name,
    isPlayer: true,
    level: state.level,
    honor: state.honor,
    message: message.trim() || 'Solicito ingresso no Collegium.',
    createdAtMs: nowMs,
    status: 'pending',
  };

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guildId
      ? {
          ...g,
          applications: [...g.applications, newApp],
          auditLog: [
            {
              id: `audit_app_${nowMs}`,
              actorName: state.name,
              action: `${state.name} enviou candidatura de ingresso.`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `Candidatura enviada para ${targetGuild.name} [${targetGuild.tag}].`,
  };
}

/**
 * 3. CANCELAR CANDIDATURA PENDENTE (Seção 3)
 */
export function cancelGuildApplication(
  state: GameState,
  guildId: string,
  nowMs: number = Date.now()
): GuildActionResult {
  const targetGuild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!targetGuild) {
    return { state, success: false, message: '', error: 'Guilda não encontrada.' };
  }

  const hadPending = targetGuild.applications.some(
    (a) => a.isPlayer && a.status === 'pending'
  );
  if (!hadPending) {
    return {
      state,
      success: false,
      message: '',
      error: 'Nenhuma candidatura pendente encontrada para cancelar.',
    };
  }

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guildId
      ? {
          ...g,
          applications: g.applications.filter((a) => !a.isPlayer),
          auditLog: [
            {
              id: `audit_cancel_app_${nowMs}`,
              actorName: state.name,
              action: `${state.name} cancelou sua candidatura pendente.`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `Candidatura para ${targetGuild.name} cancelada.`,
  };
}

/**
 * Permite no Modo Local que o conselho simulado aprove ou rejeite a candidatura do jogador,
 * para testar ambos os caminhos (aprovação/rejeição) mesmo em guildas simuladas.
 */
export function simulateCouncilDecisionForPlayerApplication(
  state: GameState,
  guildId: string,
  decision: 'approve' | 'reject',
  nowMs: number = Date.now()
): GuildActionResult {
  const targetGuild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!targetGuild) {
    return { state, success: false, message: '', error: 'Guilda não encontrada.' };
  }

  const app = targetGuild.applications.find(
    (a) => a.isPlayer && a.status === 'pending'
  );
  if (!app) {
    return {
      state,
      success: false,
      message: '',
      error: 'Não há candidatura pendente sua nesta guilda.',
    };
  }

  if (decision === 'reject') {
    const nextGuilds = state.guildState.guilds.map((g) =>
      g.id === guildId
        ? {
            ...g,
            applications: g.applications.filter((a) => a.id !== app.id),
            auditLog: [
              {
                id: `audit_sim_rej_${nowMs}`,
                actorName: 'Conselho da Guilda (Simulado)',
                action: `Candidatura de ${state.name} foi rejeitada.`,
                timestampMs: nowMs,
              },
              ...g.auditLog,
            ],
          }
        : g
    );
    return {
      state: {
        ...state,
        guildState: {
          ...state.guildState,
          guilds: nextGuilds,
          lastUpdatedAtMs: nowMs,
        },
      },
      success: true,
      message: `O conselho de ${targetGuild.name} rejeitou a candidatura.`,
    };
  }

  if (state.guildState.playerGuildId) {
    return {
      state,
      success: false,
      message: '',
      error: 'Você já pertence a uma guilda.',
    };
  }

  const maxCap = getGuildMaxCapacity(targetGuild.buildings.forum_gladiatorius ?? 1);
  if (targetGuild.members.length >= maxCap) {
    return {
      state,
      success: false,
      message: '',
      error: `A guilda atingiu a capacidade máxima (${targetGuild.members.length}/${maxCap}).`,
    };
  }

  const snap = getPlayerSnapshotForRankings(state);
  const playerMember: GuildMemberRecord = {
    id: 'player_aurelius',
    name: snap.name,
    title: snap.title,
    isPlayer: true,
    role: 'member',
    level: snap.level,
    honor: snap.honor,
    fame: snap.fame,
    wins: snap.wins,
    goldLooted: snap.goldLooted,
    featsCount: snap.featsCount,
    goldContributed: 0,
    joinedAtMs: nowMs,
  };

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guildId
      ? {
          ...g,
          members: [...g.members, playerMember],
          applications: g.applications.filter((a) => !a.isPlayer),
          auditLog: [
            {
              id: `audit_sim_app_${nowMs}`,
              actorName: 'Conselho da Guilda (Simulado)',
              action: `Candidatura de ${state.name} aprovada!`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : {
          ...g,
          applications: g.applications.filter((a) => !a.isPlayer),
        }
  );

  const nextState: GameState = {
    ...state,
    guildState: {
      ...state.guildState,
      playerGuildId: guildId,
      guilds: nextGuilds,
      lastUpdatedAtMs: nowMs,
    },
  };

  return {
    state: syncPlayerWithGuildAndFeats(nextState),
    success: true,
    message: `Sua candidatura em ${targetGuild.name} [${targetGuild.tag}] foi aprovada!`,
  };
}

/**
 * 4. APROVAR OU REJEITAR CANDIDATURA COMO LÍDER / ADMINISTRADOR (Seção 4)
 */
export function reviewGuildApplication(
  state: GameState,
  applicationId: string,
  decision: 'approve' | 'reject',
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return {
      state,
      success: false,
      message: '',
      error: 'Você não pertence a uma guilda.',
    };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember || !GUILD_PERMISSIONS[playerMember.role].reviewApplications) {
    return {
      state,
      success: false,
      message: '',
      error: 'Permissão negada: apenas Líder ou Administrador podem avaliar candidaturas.',
    };
  }

  const app = guild.applications.find((a) => a.id === applicationId);
  if (!app) {
    return {
      state,
      success: false,
      message: '',
      error: 'Candidatura não encontrada.',
    };
  }

  if (decision === 'reject') {
    const nextGuilds = state.guildState.guilds.map((g) =>
      g.id === guild.id
        ? {
            ...g,
            applications: g.applications.filter((a) => a.id !== applicationId),
            auditLog: [
              {
                id: `audit_rej_${nowMs}`,
                actorName: state.name,
                action: `Rejeitou a candidatura de ${app.applicantName}.`,
                timestampMs: nowMs,
              },
              ...g.auditLog,
            ],
          }
        : g
    );
    return {
      state: {
        ...state,
        guildState: {
          ...state.guildState,
          guilds: nextGuilds,
          lastUpdatedAtMs: nowMs,
        },
      },
      success: true,
      message: `Candidatura de ${app.applicantName} rejeitada.`,
    };
  }

  const maxCap = getGuildMaxCapacity(guild.buildings.forum_gladiatorius ?? 1);
  if (guild.members.length >= maxCap) {
    return {
      state,
      success: false,
      message: '',
      error: `Capacidade máxima atingida (${guild.members.length}/${maxCap}). Expanda o Forum Gladiatorius antes de aprovar novos membros.`,
    };
  }

  // Verifica se o candidato já está em outra guilda
  const alreadyInAnotherGuild = state.guildState.guilds.some((g) =>
    g.members.some((m) => m.id === app.applicantId)
  );
  if (alreadyInAnotherGuild) {
    return {
      state,
      success: false,
      message: '',
      error: `${app.applicantName} já ingressou em outra guilda.`,
    };
  }

  const simProfile = state.guildState.simulatedGladiators.find(
    (s) => s.id === app.applicantId
  );

  const newMember: GuildMemberRecord = {
    id: app.applicantId,
    name: app.applicantName,
    title: simProfile?.title ?? 'Gladiador Aspirante',
    isPlayer: false,
    role: 'member',
    level: app.level,
    honor: app.honor,
    fame: simProfile?.fame ?? app.honor + 15,
    wins: simProfile?.wins ?? Math.max(1, app.level * 2),
    goldLooted: simProfile?.goldLooted ?? app.level * 90,
    featsCount: simProfile?.featsCount ?? 2,
    goldContributed: 0,
    joinedAtMs: nowMs,
  };

  const nextSimulatedGladiators = state.guildState.simulatedGladiators.map((s) =>
    s.id === app.applicantId ? { ...s, guildId: guild.id } : s
  );

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id
      ? {
          ...g,
          members: [...g.members, newMember],
          applications: g.applications.filter((a) => a.id !== applicationId),
          auditLog: [
            {
              id: `audit_app_ok_${nowMs}`,
              actorName: state.name,
              action: `Aprovou o ingresso de ${app.applicantName} (+${app.honor} Honra somada à guilda).`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        simulatedGladiators: nextSimulatedGladiators,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `${app.applicantName} foi aprovado e agora integra a guilda!`,
  };
}

/**
 * Gera um novo candidato simulado para a fila da guilda atual (útil para testar aprovação/rejeição e limite de vagas).
 */
export function addSimulatedApplicantToPlayerGuild(
  state: GameState,
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const candidatePool = [
    { id: `sim_cand_${nowMs}_1`, name: 'Varro Lucullus', level: 2, honor: 38 },
    { id: `sim_cand_${nowMs}_2`, name: 'Octavia Minor', level: 3, honor: 64 },
    { id: `sim_cand_${nowMs}_3`, name: 'Sulla Felix', level: 1, honor: 24 },
  ];
  const pick = candidatePool[guild.applications.length % candidatePool.length];

  const newApp: GuildApplicationRecord = {
    id: `app_gen_${nowMs}`,
    applicantId: pick.id,
    applicantName: pick.name,
    isPlayer: false,
    level: pick.level,
    honor: pick.honor,
    message: 'Desejo jurar lealdade ao estandarte desta guilda nas arenas da Campânia.',
    createdAtMs: nowMs,
    status: 'pending',
  };

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id ? { ...g, applications: [...g.applications, newApp] } : g
  );

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `Novo aspirante (${pick.name}, Nv.${pick.level}, ${pick.honor} Honra) apresentou candidatura!`,
  };
}

/**
 * 5. SAIR DA GUILDA (Seção 4)
 * Regra: O líder DEVE transferir a liderança antes de sair quando houver outros membros.
 * Sair encerra imediatamente os benefícios da guilda para o jogador.
 */
export function leaveGuild(
  state: GameState,
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return {
      state,
      success: false,
      message: '',
      error: 'Você não pertence a nenhuma guilda.',
    };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember) {
    return {
      state,
      success: false,
      message: '',
      error: 'Registro de membro não encontrado.',
    };
  }

  if (playerMember.role === 'leader' && guild.members.length > 1) {
    return {
      state,
      success: false,
      message: '',
      error:
        'Como Líder, você deve transferir a liderança para outro membro antes de sair da guilda.',
    };
  }

  if (playerMember.role === 'leader' && guild.members.length === 1) {
    return {
      state,
      success: false,
      message: '',
      error:
        'Você é o único membro e Líder. Use a opção "Dissolver Guilda" com confirmação caso deseje encerrar a aliança.',
    };
  }

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id
      ? {
          ...g,
          members: g.members.filter((m) => !m.isPlayer),
          auditLog: [
            {
              id: `audit_leave_${nowMs}`,
              actorName: state.name,
              action: `${state.name} deixou a guilda voluntariamente (-${playerMember.honor} Honra da soma da guilda).`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  // Recalcula a vida máxima sem bônus da guilda
  const nextDerived = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    state.level,
    undefined,
    nowMs
  );

  return {
    state: {
      ...state,
      currentHp: Math.min(state.currentHp, nextDerived.maxHp),
      guildState: {
        ...state.guildState,
        playerGuildId: null,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `Você saiu de ${guild.name}. Os benefícios da guilda foram encerrados.`,
  };
}

/**
 * 6. TRANSFERIR LIDERANÇA (Seção 4)
 * Exclusivo do Líder. Rebaixa o líder atual para Administrador e promove o membro alvo a Líder.
 */
export function transferGuildLeadership(
  state: GameState,
  targetMemberId: string,
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember || !GUILD_PERMISSIONS[playerMember.role].transferLeadership) {
    return {
      state,
      success: false,
      message: '',
      error: 'Permissão negada: apenas o Líder pode transferir a liderança.',
    };
  }

  const target = guild.members.find((m) => m.id === targetMemberId && !m.isPlayer);
  if (!target) {
    return {
      state,
      success: false,
      message: '',
      error: 'Selecione um membro válido para receber a liderança.',
    };
  }

  const nextMembers: GuildMemberRecord[] = guild.members.map((m) => {
    if (m.isPlayer) return { ...m, role: 'admin' };
    if (m.id === targetMemberId) return { ...m, role: 'leader' };
    return m;
  });

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id
      ? {
          ...g,
          members: nextMembers,
          auditLog: [
            {
              id: `audit_lead_${nowMs}`,
              actorName: state.name,
              action: `Transferiu a liderança da guilda para ${target.name}.`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `Liderança transferida para ${target.name}. Seu cargo agora é Administrador.`,
  };
}

/**
 * 7. DISSOLVER GUILDA (Seção 4)
 * Exclusivo do Líder, exige confirmação explícita (confirmed === true).
 */
export function dissolveGuild(
  state: GameState,
  confirmed: boolean,
  nowMs: number = Date.now()
): GuildActionResult {
  if (!confirmed) {
    return {
      state,
      success: false,
      message: '',
      error: 'A dissolução da guilda exige confirmação explícita.',
    };
  }

  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember || !GUILD_PERMISSIONS[playerMember.role].dissolveGuild) {
    return {
      state,
      success: false,
      message: '',
      error: 'Permissão negada: apenas o Líder pode dissolver a guilda.',
    };
  }

  // Libera os membros simulados que pertenciam à guilda dissolvida
  const memberIds = new Set(guild.members.map((m) => m.id));
  const nextSimulated = state.guildState.simulatedGladiators.map((s) =>
    memberIds.has(s.id) ? { ...s, guildId: null } : s
  );

  const nextGuilds = state.guildState.guilds.filter((g) => g.id !== guild.id);

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        playerGuildId: null,
        guilds: nextGuilds,
        simulatedGladiators: nextSimulated,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `A guilda ${guild.name} [${guild.tag}] foi dissolvida e seus benefícios encerrados.`,
  };
}

/**
 * 8. ALTERAR CARGO DE MEMBRO (Seção 4)
 * Exclusivo do Líder. Administradores não podem alterar cargos nem assumir poderes de líder.
 */
export function changeGuildMemberRole(
  state: GameState,
  targetMemberId: string,
  newRole: 'admin' | 'member',
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember || !GUILD_PERMISSIONS[playerMember.role].changeMemberRole) {
    return {
      state,
      success: false,
      message: '',
      error: 'Permissão negada: apenas o Líder pode alterar cargos de membros.',
    };
  }

  const target = guild.members.find((m) => m.id === targetMemberId && !m.isPlayer);
  if (!target) {
    return { state, success: false, message: '', error: 'Membro não encontrado.' };
  }

  if (target.role === newRole) {
    return { state, success: false, message: '', error: 'O membro já possui este cargo.' };
  }

  const nextMembers = guild.members.map((m) =>
    m.id === targetMemberId ? { ...m, role: newRole } : m
  );

  const roleText = newRole === 'admin' ? 'Administrador (Decurião)' : 'Membro (Gregário)';
  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id
      ? {
          ...g,
          members: nextMembers,
          auditLog: [
            {
              id: `audit_role_${nowMs}`,
              actorName: state.name,
              action: `Alterou o cargo de ${target.name} para ${roleText}.`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `Cargo de ${target.name} atualizado para ${roleText}.`,
  };
}

/**
 * 9. REMOVER / EXPULSAR MEMBRO (Seção 4 e 9)
 * Líder pode remover Admin ou Membro. Admin só pode remover Membro comum.
 * O membro removido deixa imediatamente de somar pontos de Honra para a guilda.
 */
export function kickGuildMember(
  state: GameState,
  targetMemberId: string,
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember) {
    return { state, success: false, message: '', error: 'Permissão negada.' };
  }

  const target = guild.members.find((m) => m.id === targetMemberId && !m.isPlayer);
  if (!target) {
    return { state, success: false, message: '', error: 'Membro não encontrado.' };
  }

  if (target.role === 'leader') {
    return {
      state,
      success: false,
      message: '',
      error: 'O Líder da guilda não pode ser removido.',
    };
  }

  const perms = GUILD_PERMISSIONS[playerMember.role];
  if (target.role === 'admin' && !perms.kickAdminMember) {
    return {
      state,
      success: false,
      message: '',
      error: 'Permissão negada: Administradores não podem remover outros Administradores.',
    };
  }

  if (target.role === 'member' && !perms.kickRegularMember) {
    return {
      state,
      success: false,
      message: '',
      error: 'Permissão negada: seu cargo não permite remover membros.',
    };
  }

  const removedClone: SimulatedGladiatorProfileIfNeeded = {
    id: target.id,
    name: target.name,
    title: target.title,
    guildId: null,
    level: target.level,
    honor: target.honor,
    fame: target.fame,
    wins: target.wins,
    losses: 2,
    featsCount: target.featsCount,
    goldLooted: target.goldLooted,
    damageRange: `${4 + target.level * 2}-${8 + target.level * 3}`,
    armor: 25 + target.level * 18,
  };

  const existsInSim = state.guildState.simulatedGladiators.some(
    (s) => s.id === target.id
  );
  const nextSimulated = existsInSim
    ? state.guildState.simulatedGladiators.map((s) =>
        s.id === target.id ? { ...s, guildId: null } : s
      )
    : [...state.guildState.simulatedGladiators, removedClone];

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id
      ? {
          ...g,
          members: g.members.filter((m) => m.id !== targetMemberId),
          auditLog: [
            {
              id: `audit_kick_${nowMs}`,
              actorName: state.name,
              action: `Removeu ${target.name} da guilda (-${target.honor} Honra da soma coletiva).`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        simulatedGladiators: nextSimulated,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `${target.name} foi removido da guilda. A classificação foi recalculada.`,
  };
}

type SimulatedGladiatorProfileIfNeeded = GameState['guildState']['simulatedGladiators'][number];

/**
 * 10. EDITAR DESCRIÇÃO E RECRUTAMENTO (Seção 4)
 */
export function updateGuildProfile(
  state: GameState,
  updates: {
    description: string;
    recruitmentStatus: GuildRecruitmentStatus;
    minLevelReq: number;
    minHonorReq: number;
  },
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (
    !playerMember ||
    !GUILD_PERMISSIONS[playerMember.role].editDescriptionAndRecruitment
  ) {
    return {
      state,
      success: false,
      message: '',
      error: 'Permissão negada: apenas Líder ou Administrador podem editar o recrutamento.',
    };
  }

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id
      ? {
          ...g,
          description: updates.description.trim() || g.description,
          recruitmentStatus: updates.recruitmentStatus,
          minLevelReq: Math.max(1, Math.floor(updates.minLevelReq)),
          minHonorReq: Math.max(0, Math.floor(updates.minHonorReq)),
          auditLog: [
            {
              id: `audit_prof_${nowMs}`,
              actorName: state.name,
              action: `Atualizou a descrição e regras de recrutamento (${updates.recruitmentStatus}).`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: 'Configurações de perfil e recrutamento da guilda atualizadas.',
  };
}

/**
 * 11. PUBLICAR AVISO INTERNO (Seção 4)
 */
export function postGuildAnnouncement(
  state: GameState,
  content: string,
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember || !GUILD_PERMISSIONS[playerMember.role].postAnnouncement) {
    return {
      state,
      success: false,
      message: '',
      error: 'Permissão negada: apenas Líder ou Administrador podem publicar avisos.',
    };
  }

  const trimmed = content.trim();
  if (trimmed.length < 3) {
    return {
      state,
      success: false,
      message: '',
      error: 'Digite uma mensagem com pelo menos 3 caracteres.',
    };
  }

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id
      ? {
          ...g,
          announcements: [
            {
              id: `ann_${nowMs}`,
              authorName: state.name,
              authorRole: playerMember.role,
              content: trimmed,
              timestampMs: nowMs,
            },
            ...g.announcements.slice(0, 19),
          ],
          auditLog: [
            {
              id: `audit_ann_${nowMs}`,
              actorName: state.name,
              action: 'Publicou um novo édito no mural da guilda.',
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: 'Aviso publicado no Forum Gladiatorius!',
  };
}

/**
 * 12. DOAR OURO AO BANCO DA GUILDA — ESTRITAMENTE IDEMPOTENTE (Seção 6 e 9)
 * - Valida valor positivo e inteiro.
 * - Verifica saldo do jogador.
 * - Desconta do jogador e credita no banco.
 * - Registra autor, valor e data.
 * - É aplicada uma única vez por transactionId.
 * - NÃO aumenta a honra da guilda nem do jogador (Seção 9).
 */
export function donateToGuildBank(
  state: GameState,
  amount: number,
  transactionId: string,
  nowMs: number = Date.now()
): GuildActionResult {
  if (!transactionId || state.guildState.processedTransactionIds.includes(transactionId)) {
    return {
      state,
      success: false,
      message: '',
      error: 'Transação já processada (proteção idempotente contra clique duplo).',
    };
  }

  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return {
      state,
      success: false,
      message: '',
      error: 'Informe um valor de doação inteiro e positivo.',
    };
  }

  if (state.gold < amount) {
    return {
      state,
      success: false,
      message: '',
      error: `Saldo insuficiente. Você possui ${state.gold} Ouro.`,
    };
  }

  const nextGuilds = state.guildState.guilds.map((g) => {
    if (g.id !== guild.id) return g;
    return {
      ...g,
      treasuryGold: g.treasuryGold + amount,
      members: g.members.map((m) =>
        m.isPlayer ? { ...m, goldContributed: m.goldContributed + amount } : m
      ),
      bankHistory: [
        {
          txId: transactionId,
          type: 'donation' as const,
          authorName: state.name,
          amount,
          description: `Doação voluntária ao Aerarium (+${amount} Ouro)`,
          timestampMs: nowMs,
        },
        ...g.bankHistory.slice(0, 49),
      ],
      auditLog: [
        {
          id: `audit_don_${transactionId}`,
          actorName: state.name,
          action: `Doou ${amount} denários de ouro para o Banco da Guilda.`,
          timestampMs: nowMs,
        },
        ...g.auditLog,
      ],
    };
  });

  const rawNext: GameState = {
    ...state,
    gold: state.gold - amount,
    guildState: {
      ...state.guildState,
      guilds: nextGuilds,
      processedTransactionIds: [
        ...state.guildState.processedTransactionIds.slice(-99),
        transactionId,
      ],
      lastUpdatedAtMs: nowMs,
    },
  };

  return {
    state: syncPlayerWithGuildAndFeats(rawNext),
    success: true,
    message: `Doação de ${amount} Ouro registrada no Banco da Guilda!`,
  };
}

/**
 * 13. MELHORAR EDIFÍCIO DA SEDE — ESTRITAMENTE IDEMPOTENTE (Seção 5 e 6)
 * Verifica permissão (Líder ou Admin), nível máximo, requisito do Forum Gladiatorius e saldo no Banco.
 */
export function upgradeGuildBuilding(
  state: GameState,
  buildingId: GuildBuildingId,
  transactionId: string,
  nowMs: number = Date.now()
): GuildActionResult {
  if (!transactionId || state.guildState.processedTransactionIds.includes(transactionId)) {
    return {
      state,
      success: false,
      message: '',
      error: 'Melhoria já processada (proteção idempotente).',
    };
  }

  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember || !GUILD_PERMISSIONS[playerMember.role].upgradeBuildings) {
    return {
      state,
      success: false,
      message: '',
      error: 'Permissão negada: apenas Líder ou Administrador podem financiar melhorias da sede.',
    };
  }

  const def = GUILD_BUILDING_DEFINITIONS[buildingId];
  const currentLevel = guild.buildings[buildingId] ?? 1;
  if (currentLevel >= def.maxLevel) {
    return {
      state,
      success: false,
      message: '',
      error: `${def.name} já atingiu o Nível Máximo (${def.maxLevel}).`,
    };
  }

  const forumLevel = guild.buildings.forum_gladiatorius ?? 1;
  if (def.requiresForumLevel && currentLevel >= forumLevel) {
    return {
      state,
      success: false,
      message: '',
      error: `Expanda primeiro o Forum Gladiatorius para o Nível ${
        currentLevel + 1
      } antes de elevar ${def.name}.`,
    };
  }

  const upgradeCost = getBuildingUpgradeCost(buildingId, currentLevel);
  if (guild.treasuryGold < upgradeCost) {
    return {
      state,
      success: false,
      message: '',
      error: `Saldo insuficiente no Banco da Guilda (${guild.treasuryGold}/${upgradeCost} Ouro). Realize uma doação primeiro.`,
    };
  }

  const nextLevel = currentLevel + 1;
  const nextGuilds = state.guildState.guilds.map((g) => {
    if (g.id !== guild.id) return g;
    const nextBuildings = {
      ...g.buildings,
      [buildingId]: nextLevel,
    };
    const nextInternalMarket =
      buildingId === 'mercado_interno'
        ? getInternalMarketTemplateIdsForLevel(nextLevel)
        : g.internalMarketTemplateIds;

    return {
      ...g,
      treasuryGold: g.treasuryGold - upgradeCost,
      buildings: nextBuildings,
      internalMarketTemplateIds: nextInternalMarket,
      bankHistory: [
        {
          txId: transactionId,
          type: 'upgrade' as const,
          authorName: state.name,
          amount: -upgradeCost,
          description: `Ampliação: ${def.name} para Nível ${nextLevel} (-${upgradeCost} Ouro)`,
          timestampMs: nowMs,
        },
        ...g.bankHistory.slice(0, 49),
      ],
      auditLog: [
        {
          id: `audit_upg_${transactionId}`,
          actorName: state.name,
          action: `Expandiu ${def.name} para o Nível ${nextLevel} (-${upgradeCost} Ouro do Banco).`,
          timestampMs: nowMs,
        },
        ...g.auditLog,
      ],
    };
  });

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        processedTransactionIds: [
          ...state.guildState.processedTransactionIds.slice(-99),
          transactionId,
        ],
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `${def.name} expandido para o Nível ${nextLevel}!`,
  };
}

/**
 * 14. USAR A VILLA MEDICI (Seção 5 e 7)
 * Cura respeitando a Vida Máxima, custo reduzido e tempo de espera de 15 minutos.
 */
export function useVillaMedici(
  state: GameState,
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const derived = calculateDerivedStats(
    state.baseStats,
    state.equipped,
    state.level,
    state.guildState,
    nowMs
  );
  if (state.currentHp >= derived.maxHp) {
    return {
      state,
      success: false,
      message: '',
      error: 'Sua Vida já está no máximo.',
    };
  }

  const cooldownElapsed = nowMs - state.guildState.lastVillaMediciUseMs;
  if (
    state.guildState.lastVillaMediciUseMs > 0 &&
    cooldownElapsed < GUILD_CONFIG.villaMediciCooldownMs
  ) {
    const remainingMin = Math.ceil(
      (GUILD_CONFIG.villaMediciCooldownMs - cooldownElapsed) / 60000
    );
    return {
      state,
      success: false,
      message: '',
      error: `Os cirurgiões da Villa Medici estão preparando novos unguentos. Aguarde ${remainingMin} min.`,
    };
  }

  const mediciLv = guild.buildings.villa_medici ?? 1;
  const fee = Math.max(2, GUILD_CONFIG.villaMediciBaseGoldFee - mediciLv);
  if (state.gold < fee) {
    return {
      state,
      success: false,
      message: '',
      error: `Ouro insuficiente para a taxa da Villa Medici (${fee} Ouro).`,
    };
  }

  const healPercent = 25 + mediciLv * 10;
  const maxHealAmount = Math.round(derived.maxHp * (healPercent / 100));
  const nextHp = Math.min(derived.maxHp, state.currentHp + maxHealAmount);
  const actualHealed = nextHp - state.currentHp;

  return {
    state: {
      ...state,
      gold: state.gold - fee,
      currentHp: nextHp,
      guildState: {
        ...state.guildState,
        lastVillaMediciUseMs: nowMs,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `Tratamento na Villa Medici concluído: +${actualHealed} PV restaurados (-${fee} Ouro).`,
  };
}

/**
 * 15. ATIVAR BENEFÍCIO TEMPORÁRIO NA BIBLIOTECA (Seção 5 e 7)
 * Não aplica o mesmo bônus duas vezes e registra timestamps exatos de início e expiração.
 */
export function activateLibraryScroll(
  state: GameState,
  scrollId: LibraryScrollId,
  transactionId: string,
  nowMs: number = Date.now()
): GuildActionResult {
  if (!transactionId || state.guildState.processedTransactionIds.includes(transactionId)) {
    return {
      state,
      success: false,
      message: '',
      error: 'Pergaminho já ativado (proteção idempotente).',
    };
  }

  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember || !GUILD_PERMISSIONS[playerMember.role].activateLibraryBuff) {
    return {
      state,
      success: false,
      message: '',
      error: 'Permissão negada: apenas Líder ou Administrador podem ativar pergaminhos na Biblioteca.',
    };
  }

  const def = LIBRARY_SCROLL_DEFINITIONS[scrollId];
  const libraryLevel = guild.buildings.biblioteca ?? 1;

  // Verifica se já está ativo (impede aplicar duas vezes o mesmo bônus)
  const alreadyActive = guild.activeBuffs.some(
    (b) => b.scrollId === scrollId && b.expiresAtMs > nowMs
  );
  if (alreadyActive) {
    return {
      state,
      success: false,
      message: '',
      error: `${def.name} já está ativo na guilda! Aguarde sua expiração para não duplicar o efeito.`,
    };
  }

  if (guild.treasuryGold < def.treasuryCost) {
    return {
      state,
      success: false,
      message: '',
      error: `Saldo insuficiente no Banco da Guilda (${guild.treasuryGold}/${def.treasuryCost} Ouro).`,
    };
  }

  const newBuff: ActiveLibraryBuff = {
    scrollId,
    name: def.name,
    activatedBy: state.name,
    startedAtMs: nowMs,
    expiresAtMs: nowMs + GUILD_CONFIG.libraryBuffDurationMs,
    libraryLevelAtActivation: libraryLevel,
  };

  const nextGuilds = state.guildState.guilds.map((g) => {
    if (g.id !== guild.id) return g;
    const validExisting = g.activeBuffs.filter(
      (b) => b.expiresAtMs > nowMs && b.scrollId !== scrollId
    );
    return {
      ...g,
      treasuryGold: g.treasuryGold - def.treasuryCost,
      activeBuffs: [...validExisting, newBuff],
      bankHistory: [
        {
          txId: transactionId,
          type: 'library_buff' as const,
          authorName: state.name,
          amount: -def.treasuryCost,
          description: `Biblioteca: Ativou ${def.name} por 2h (-${def.treasuryCost} Ouro)`,
          timestampMs: nowMs,
        },
        ...g.bankHistory.slice(0, 49),
      ],
      auditLog: [
        {
          id: `audit_lib_${transactionId}`,
          actorName: state.name,
          action: `Ativou o benefício temporário ${def.name} (2h).`,
          timestampMs: nowMs,
        },
        ...g.auditLog,
      ],
    };
  });

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        processedTransactionIds: [
          ...state.guildState.processedTransactionIds.slice(-99),
          transactionId,
        ],
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `${def.name} ativado por 2 horas para toda a guilda!`,
  };
}

/**
 * 16. DEPOSITAR E RETIRAR ITEM DO ARMAZÉM DA GUILDA (Seção 5)
 */
export function depositItemToGuildWarehouse(
  state: GameState,
  inventoryItemId: string,
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember || !GUILD_PERMISSIONS[playerMember.role].useWarehouse) {
    return {
      state,
      success: false,
      message: '',
      error: 'Sem permissão para usar o Armazém.',
    };
  }

  const warehouseCap =
    (guild.buildings.armazem ?? 1) * GUILD_CONFIG.warehouseSlotsPerLevel;
  if (guild.warehouseItems.length >= warehouseCap) {
    return {
      state,
      success: false,
      message: '',
      error: `O Armazém da Guilda está cheio (${guild.warehouseItems.length}/${warehouseCap}). Expanda o Armazém.`,
    };
  }

  const itemIdx = state.inventory.findIndex((i) => i.id === inventoryItemId);
  if (itemIdx === -1) {
    return { state, success: false, message: '', error: 'Item não encontrado na sua mochila.' };
  }

  const item = state.inventory[itemIdx];
  const nextInventory = [...state.inventory];
  nextInventory.splice(itemIdx, 1);

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id
      ? {
          ...g,
          warehouseItems: [...g.warehouseItems, item],
          auditLog: [
            {
              id: `audit_wh_in_${nowMs}`,
              actorName: state.name,
              action: `Depositou ${item.name} no Armazém da Guilda.`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      inventory: nextInventory,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `${item.name} depositado no Armazém da Guilda.`,
  };
}

export function withdrawItemFromGuildWarehouse(
  state: GameState,
  warehouseItemId: string,
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const playerMember = guild.members.find((m) => m.isPlayer);
  if (!playerMember || !GUILD_PERMISSIONS[playerMember.role].useWarehouse) {
    return {
      state,
      success: false,
      message: '',
      error: 'Sem permissão para retirar itens do Armazém.',
    };
  }

  if (state.inventory.length >= GAME_CONFIG.maxInventorySlots) {
    return {
      state,
      success: false,
      message: '',
      error: 'Sua mochila pessoal está cheia (20/20)!',
    };
  }

  const itemIdx = guild.warehouseItems.findIndex((i) => i.id === warehouseItemId);
  if (itemIdx === -1) {
    return { state, success: false, message: '', error: 'Item não encontrado no Armazém.' };
  }

  const item = guild.warehouseItems[itemIdx];
  const nextWh = [...guild.warehouseItems];
  nextWh.splice(itemIdx, 1);

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id
      ? {
          ...g,
          warehouseItems: nextWh,
          auditLog: [
            {
              id: `audit_wh_out_${nowMs}`,
              actorName: state.name,
              action: `Retirou ${item.name} do Armazém da Guilda.`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      inventory: [...state.inventory, item],
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `${item.name} transferido do Armazém para sua mochila.`,
  };
}

/**
 * 17. COMPRAR NO MERCADO INTERNO DA GUILDA (Seção 5)
 * Ofertas acessíveis apenas aos membros da guilda com 15% de desconto.
 */
export function buyFromGuildInternalMarket(
  state: GameState,
  templateId: string,
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return {
      state,
      success: false,
      message: '',
      error: 'O Mercado Interno é exclusivo para membros de uma guilda.',
    };
  }

  if (!guild.internalMarketTemplateIds.includes(templateId)) {
    return {
      state,
      success: false,
      message: '',
      error: 'Este item ainda não está disponível no nível atual do Mercado Interno.',
    };
  }

  const tpl = ITEM_TEMPLATES[templateId];
  if (!tpl) {
    return { state, success: false, message: '', error: 'Item inválido.' };
  }

  const discountedPrice = Math.max(
    1,
    Math.round(tpl.buyPrice * (1 - GUILD_CONFIG.internalMarketDiscountPercent / 100))
  );

  if (state.gold < discountedPrice) {
    return {
      state,
      success: false,
      message: '',
      error: `Ouro insuficiente. Preço de membro: ${discountedPrice} Ouro (Seu saldo: ${state.gold}).`,
    };
  }

  if (state.inventory.length >= GAME_CONFIG.maxInventorySlots) {
    return {
      state,
      success: false,
      message: '',
      error: 'Sua mochila está cheia (20/20)!',
    };
  }

  const newItem = createItemFromTemplate(
    templateId,
    `guild_mkt_${nowMs}_${state.inventory.length}`
  );

  return {
    state: {
      ...state,
      gold: state.gold - discountedPrice,
      inventory: [...state.inventory, newItem],
    },
    success: true,
    message: `${newItem.name} adquirido no Mercado Interno por ${discountedPrice} Ouro (-15% desconto de membro)!`,
  };
}

/**
 * Permite no Modo Local alternar o cargo do jogador dentro de uma guilda simulada para facilitar
 * a inspeção e verificação de todas as permissões de cargo (Membro, Administrador e Líder).
 */
export function setPlayerRoleInCurrentGuildLocalMode(
  state: GameState,
  targetRole: GuildRole,
  nowMs: number = Date.now()
): GuildActionResult {
  const guildId = state.guildState.playerGuildId;
  const guild = state.guildState.guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { state, success: false, message: '', error: 'Você não pertence a uma guilda.' };
  }

  const nextMembers = guild.members.map((m) => {
    if (m.isPlayer) {
      return { ...m, role: targetRole };
    }
    if (targetRole === 'leader' && m.role === 'leader') {
      return { ...m, role: 'admin' as GuildRole };
    }
    return m;
  });

  // Se o jogador deixou de ser líder e nenhum outro membro era líder, promove o primeiro membro simulado
  if (!nextMembers.some((m) => m.role === 'leader')) {
    const firstNpc = nextMembers.find((m) => !m.isPlayer);
    if (firstNpc) {
      firstNpc.role = 'leader';
    } else {
      // Se só há o jogador na guilda, ele permanece líder
      const p = nextMembers.find((m) => m.isPlayer);
      if (p) p.role = 'leader';
    }
  }

  const nextGuilds = state.guildState.guilds.map((g) =>
    g.id === guild.id
      ? {
          ...g,
          members: nextMembers,
          auditLog: [
            {
              id: `audit_local_role_${nowMs}`,
              actorName: 'Conselho (Modo Local)',
              action: `Cargo de ${state.name} ajustado para ${targetRole}.`,
              timestampMs: nowMs,
            },
            ...g.auditLog,
          ],
        }
      : g
  );

  return {
    state: {
      ...state,
      guildState: {
        ...state.guildState,
        guilds: nextGuilds,
        lastUpdatedAtMs: nowMs,
      },
    },
    success: true,
    message: `Cargo ajustado para ${targetRole.toUpperCase()} (Modo Local).`,
  };
}
