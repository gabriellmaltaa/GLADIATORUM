import React, { useState } from 'react';
import { GAME_CONFIG, ITEM_TEMPLATES } from '../../game/config';
import {
  computeGuildRankings,
  getActiveGuildBonuses,
  getBuildingUpgradeCost,
  getGuildMaxCapacity,
  GUILD_BUILDING_DEFINITIONS,
  GUILD_CONFIG,
  GUILD_EMBLEMS,
  GUILD_PERMISSIONS,
  GUILD_RECRUITMENT_LABELS,
  GUILD_ROLE_LABELS,
  GuildBuildingId,
  GuildEmblemId,
  GuildRecruitmentStatus,
  GuildRole,
  LIBRARY_SCROLL_DEFINITIONS,
  LibraryScrollId,
} from '../../game/guildsAndRankings';
import {
  DerivedStats,
  GameState,
  getPlayerSnapshotForRankings,
} from '../../game/rules';
import {
  GameButton,
  ItemSlot,
  RomanPanel,
} from '../ui/RomanComponents';
import {
  GuildEmblemBadge,
  GuildPublicProfileModal,
  PlayerPublicProfileModal,
} from './GuildAndRankingModals';

export interface GuildScreenProps {
  state: GameState;
  derived: DerivedStats;
  isOnlineMode?: boolean;
  onCreateGuild: (input: {
    name: string;
    tag: string;
    emblemId: GuildEmblemId;
    description: string;
    recruitmentStatus: GuildRecruitmentStatus;
    minLevelReq: number;
    minHonorReq: number;
  }) => void;
  onApplyOrJoinGuild: (guildId: string, message?: string) => void;
  onCancelApplication: (guildId: string) => void;
  onSimulateCouncilDecision: (guildId: string, decision: 'approve' | 'reject') => void;
  onReviewApplication: (applicationId: string, decision: 'approve' | 'reject') => void;
  onAddSimulatedApplicant: () => void;
  onLeaveGuild: () => void;
  onTransferLeadership: (targetMemberId: string) => void;
  onDissolveGuild: (confirmed: boolean) => void;
  onChangeMemberRole: (targetMemberId: string, newRole: 'admin' | 'member') => void;
  onKickMember: (targetMemberId: string) => void;
  onUpdateProfile: (updates: {
    description: string;
    recruitmentStatus: GuildRecruitmentStatus;
    minLevelReq: number;
    minHonorReq: number;
  }) => void;
  onPostAnnouncement: (content: string) => void;
  onDonateGold: (amount: number, txId: string) => void;
  onUpgradeBuilding: (buildingId: GuildBuildingId, txId: string) => void;
  onUseVillaMedici: () => void;
  onActivateLibraryScroll: (scrollId: LibraryScrollId, txId: string) => void;
  onDepositWarehouseItem: (inventoryItemId: string) => void;
  onWithdrawWarehouseItem: (warehouseItemId: string) => void;
  onBuyInternalMarketItem: (templateId: string) => void;
  onSetLocalTestRole: (role: GuildRole) => void;
  onOpenRankings: () => void;
}

type MemberGuildTab = 'headquarters' | 'members' | 'bank_warehouse' | 'announcements_log';

export const GuildScreen: React.FC<GuildScreenProps> = ({
  state,
  derived,
  isOnlineMode = false,
  onCreateGuild,
  onApplyOrJoinGuild,
  onCancelApplication,
  onSimulateCouncilDecision,
  onReviewApplication,
  onAddSimulatedApplicant,
  onLeaveGuild,
  onTransferLeadership,
  onDissolveGuild,
  onChangeMemberRole,
  onKickMember,
  onUpdateProfile,
  onPostAnnouncement,
  onDonateGold,
  onUpgradeBuilding,
  onUseVillaMedici,
  onActivateLibraryScroll,
  onDepositWarehouseItem,
  onWithdrawWarehouseItem,
  onBuyInternalMarketItem,
  onSetLocalTestRole,
  onOpenRankings,
}) => {
  // Estados para Visitante (sem guilda)
  const [visitorMode, setVisitorMode] = useState<'directory' | 'create'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildTag, setNewGuildTag] = useState('');
  const [newGuildEmblem, setNewGuildEmblem] = useState<GuildEmblemId>('aquila_imperial');
  const [newGuildRecruitment, setNewGuildRecruitment] =
    useState<GuildRecruitmentStatus>('open');
  const [newGuildMinLevel, setNewGuildMinLevel] = useState(1);
  const [newGuildMinHonor, setNewGuildMinHonor] = useState(0);
  const [newGuildDesc, setNewGuildDesc] = useState(
    'Aliança forjada nas arenas da Campânia em busca de honra e glória.'
  );

  // Estados para Membro de Guilda
  const [memberTab, setMemberTab] = useState<MemberGuildTab>('headquarters');
  const [donationInput, setDonationInput] = useState('25');
  const [announcementInput, setAnnouncementInput] = useState('');
  const [confirmDissolve, setConfirmDissolve] = useState(false);
  const [editDescInput, setEditDescInput] = useState('');
  const [editRecruitmentInput, setEditRecruitmentInput] =
    useState<GuildRecruitmentStatus>('open');
  const [editMinLevelInput, setEditMinLevelInput] = useState(1);
  const [editMinHonorInput, setEditMinHonorInput] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Modais de Perfil Público
  const [inspectedGuildId, setInspectedGuildId] = useState<string | null>(null);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);

  const nowMs = Date.now();
  const snap = getPlayerSnapshotForRankings(state);
  const guildRankings = computeGuildRankings(state.guildState, snap);
  const activeBonuses = getActiveGuildBonuses(state.guildState, nowMs);

  const playerGuild = state.guildState.playerGuildId
    ? state.guildState.guilds.find((g) => g.id === state.guildState.playerGuildId) ?? null
    : null;

  const formatDateShort = (ts: number) => {
    try {
      return new Date(ts).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return 'Recente';
    }
  };

  // ============================================================================
  // VISÃO 1: VISITANTE (JOGADOR SEM GUILDA) — Seção 3
  // ============================================================================
  if (!playerGuild) {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredGuilds = state.guildState.guilds.filter(
      (g) =>
        !normalizedQuery ||
        g.name.toLowerCase().includes(normalizedQuery) ||
        g.tag.toLowerCase().includes(normalizedQuery)
    );

    const guildsWithPendingPlayerApp = state.guildState.guilds.filter((g) =>
      g.applications.some((a) => a.isPlayer && a.status === 'pending')
    );

    return (
      <div className="space-y-4">
        {/* Aviso Transparente de Modo Online vs Modo Local */}
        <div
          className={`p-2.5 border-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
            isOnlineMode
              ? 'bg-[#1E2E1C] border-[#4B7A47] text-[#EFE2C4]'
              : 'bg-[#2B2119] border-[#947044] text-[#D6C29A]'
          }`}
        >
          <div>
            <strong className="text-[#D4B26A] font-roman uppercase">
              {isOnlineMode
                ? 'Guildas Online Compartilhadas (Servidor Autoritativo):'
                : 'Modo Visitante Local — Dados Simulados:'}
            </strong>{' '}
            {isOnlineMode
              ? 'Alianças persistidas no servidor e compartilhadas entre contas reais. Vagas, cargos, banco e honra são validados em transações atômicas.'
              : 'As guildas e gladiadores abaixo são simulados localmente. Conecte sua conta no topo para ingressar em Guildas Online compartilhadas.'}
          </div>
          <GameButton variant="iron" size="sm" onClick={onOpenRankings}>
            Ver Classificação
          </GameButton>
        </div>

        {/* Alternador Diretório vs Criar Guilda */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setVisitorMode('directory')}
            className={`min-h-[44px] px-3 py-2 font-roman font-bold text-xs sm:text-sm border-2 rounded-[2px] cursor-pointer ${
              visitorMode === 'directory'
                ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
                : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527]'
            }`}
          >
            Diretório de Guildas ({state.guildState.guilds.length})
          </button>
          <button
            type="button"
            onClick={() => setVisitorMode('create')}
            className={`min-h-[44px] px-3 py-2 font-roman font-bold text-xs sm:text-sm border-2 rounded-[2px] cursor-pointer ${
              visitorMode === 'create'
                ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
                : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527]'
            }`}
          >
            Fundar Guilda ({GUILD_CONFIG.creationCostGold} Ouro)
          </button>
        </div>

        {/* Candidaturas Pendentes do Jogador */}
        {guildsWithPendingPlayerApp.length > 0 && (
          <RomanPanel
            title="Suas Candidaturas Pendentes"
            subtitle="Você pode cancelar sua candidatura ou simular a decisão do conselho local"
            variant="wood"
          >
            <div className="space-y-2">
              {guildsWithPendingPlayerApp.map((g) => (
                <div
                  key={g.id}
                  className="p-2.5 bg-[#17120F] border border-[#B79552] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-roman font-bold text-[#EFE2C4]">
                      [{g.tag}] {g.name}
                    </span>
                    <span className="block text-[11px] text-[#D4B26A]">
                      Status: Aguardando avaliação do conselho
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!isOnlineMode && (
                      <>
                        <GameButton
                          variant="crimson"
                          size="sm"
                          onClick={() => onSimulateCouncilDecision(g.id, 'approve')}
                        >
                          Aprovar (Simular Local)
                        </GameButton>
                        <GameButton
                          variant="bronze"
                          size="sm"
                          onClick={() => onSimulateCouncilDecision(g.id, 'reject')}
                        >
                          Rejeitar (Simular Local)
                        </GameButton>
                      </>
                    )}
                    <GameButton
                      variant="iron"
                      size="sm"
                      onClick={() => onCancelApplication(g.id)}
                    >
                      Cancelar Candidatura
                    </GameButton>
                  </div>
                </div>
              ))}
            </div>
          </RomanPanel>
        )}

        {visitorMode === 'directory' ? (
          <RomanPanel
            title="Collegia e Alianças de Cápua"
            subtitle="Busque por nome ou tag, consulte o perfil público ou envie sua candidatura"
            variant="stone"
          >
            <div className="mb-3 flex flex-col sm:flex-row gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar guilda por nome ou [TAG]..."
                aria-label="Buscar guilda por nome ou tag"
                className="flex-1 min-h-[44px] px-3 py-2 bg-[#140F0C] border-2 border-[#5E4527] text-xs sm:text-sm text-[#EFE2C4] placeholder-[#7A6C5D] focus:outline-none focus:border-[#D4B26A]"
              />
              {searchQuery && (
                <GameButton
                  variant="iron"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                >
                  Limpar Busca
                </GameButton>
              )}
            </div>

            {filteredGuilds.length === 0 ? (
              <div className="p-4 bg-[#17120F] border border-[#5E4527] text-center text-xs text-[#B8A686]">
                Nenhuma guilda encontrada para &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGuilds.map((g) => {
                  const rankInfo = guildRankings.find((r) => r.id === g.id);
                  const maxCap = getGuildMaxCapacity(
                    g.buildings.forum_gladiatorius ?? 1
                  );
                  const isFull = g.members.length >= maxCap;
                  const meetsReqs =
                    state.level >= g.minLevelReq && state.honor >= g.minHonorReq;
                  const hasPendingApp = g.applications.some(
                    (a) => a.isPlayer && a.status === 'pending'
                  );
                  const leader =
                    g.members.find((m) => m.role === 'leader') ?? g.members[0];

                  return (
                    <div
                      key={g.id}
                      className="p-3 bg-[#1D1510] border-2 border-[#5E4527] rounded-[2px] flex flex-col gap-2.5"
                    >
                      <div className="flex items-start gap-3">
                        <GuildEmblemBadge emblemId={g.emblemId} tag={g.tag} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-roman font-bold text-sm sm:text-base text-[#EFE2C4]">
                              [{g.tag}] {g.name}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#2B2119] border border-[#947044] text-[#D4B26A] tabular-nums">
                              Rank #{rankInfo?.rank ?? '-'}
                            </span>
                          </div>
                          <p className="text-xs text-[#B8A686] mt-0.5 line-clamp-2">
                            {g.description}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#D6C29A] tabular-nums">
                            <span>
                              Líder: <strong>{leader?.name ?? '-'}</strong>
                            </span>
                            <span>
                              Membros:{' '}
                              <strong className={isFull ? 'text-[#C4514E]' : 'text-[#EFE2C4]'}>
                                {g.members.length}/{maxCap}
                              </strong>
                            </span>
                            <span>
                              Honra Total:{' '}
                              <strong className="text-[#D4B26A]">
                                {rankInfo?.totalHonor ?? 0}
                              </strong>
                            </span>
                            <span>
                              Requisitos: Nv.{g.minLevelReq}+ · {g.minHonorReq}+ Honra
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#5E4527]/60 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-[#B8A686]">
                          Situação:{' '}
                          <strong className="text-[#D6C29A]">
                            {GUILD_RECRUITMENT_LABELS[g.recruitmentStatus]}
                          </strong>
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          <GameButton
                            variant="iron"
                            size="sm"
                            onClick={() => setInspectedGuildId(g.id)}
                          >
                            Perfil Público
                          </GameButton>

                          {hasPendingApp ? (
                            <GameButton
                              variant="bronze"
                              size="sm"
                              onClick={() => onCancelApplication(g.id)}
                            >
                              Cancelar Candidatura
                            </GameButton>
                          ) : (
                            <GameButton
                              variant="crimson"
                              size="sm"
                              onClick={() => onApplyOrJoinGuild(g.id)}
                              disabled={
                                g.recruitmentStatus === 'closed' || isFull || !meetsReqs
                              }
                              disabledReason={
                                g.recruitmentStatus === 'closed'
                                  ? 'Recrutamento fechado'
                                  : isFull
                                  ? `Capacidade lotada (${g.members.length}/${maxCap})`
                                  : !meetsReqs
                                  ? `Requer Nv.${g.minLevelReq} e ${g.minHonorReq} Honra`
                                  : undefined
                              }
                            >
                              {g.recruitmentStatus === 'open'
                                ? 'Ingressar na Guilda'
                                : 'Enviar Candidatura'}
                            </GameButton>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </RomanPanel>
        ) : (
          <RomanPanel
            title="Fundar Novo Collegium Romano"
            subtitle={`Custo de fundação: ${GUILD_CONFIG.creationCostGold} Ouro · Nível mínimo: ${GUILD_CONFIG.creationMinLevel} · Seu saldo: ${state.gold} Ouro`}
            variant="parchment"
          >
            <div className="space-y-3 text-xs sm:text-sm text-[#30251A]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-roman font-bold text-xs uppercase mb-1">
                    Nome da Guilda (3–32 caracteres)
                  </label>
                  <input
                    type="text"
                    value={newGuildName}
                    onChange={(e) => setNewGuildName(e.target.value)}
                    placeholder="Ex.: Gladiadores do Vesúvio"
                    maxLength={GUILD_CONFIG.maxNameLength}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#EFE2C4] border-2 border-[#947044] text-[#30251A] font-semibold focus:outline-none focus:border-[#792B28]"
                  />
                </div>
                <div>
                  <label className="block font-roman font-bold text-xs uppercase mb-1">
                    Tag (2–4 letras/números)
                  </label>
                  <input
                    type="text"
                    value={newGuildTag}
                    onChange={(e) =>
                      setNewGuildTag(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                      )
                    }
                    placeholder="Ex.: VES"
                    maxLength={GUILD_CONFIG.maxTagLength}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#EFE2C4] border-2 border-[#947044] text-[#30251A] font-bold uppercase focus:outline-none focus:border-[#792B28]"
                  />
                </div>
              </div>

              <div>
                <span className="block font-roman font-bold text-xs uppercase mb-1.5">
                  Escolha o Estandarte Romano
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(GUILD_EMBLEMS) as GuildEmblemId[]).map((embId) => {
                    const emb = GUILD_EMBLEMS[embId];
                    const selected = newGuildEmblem === embId;
                    return (
                      <button
                        key={embId}
                        type="button"
                        onClick={() => setNewGuildEmblem(embId)}
                        className={`min-h-[48px] p-2 border-2 flex items-center gap-2 text-left cursor-pointer ${
                          selected
                            ? 'bg-[#30251A] text-[#EFE2C4] border-[#792B28]'
                            : 'bg-[#C2AB7E] text-[#30251A] border-[#947044]'
                        }`}
                      >
                        <GuildEmblemBadge emblemId={embId} size="sm" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">{emb.name}</div>
                          <div className="text-[10px] opacity-80 truncate">{emb.motto}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-roman font-bold text-xs uppercase mb-1">
                    Recrutamento Inicial
                  </label>
                  <select
                    value={newGuildRecruitment}
                    onChange={(e) =>
                      setNewGuildRecruitment(e.target.value as GuildRecruitmentStatus)
                    }
                    className="w-full min-h-[44px] px-2 py-2 bg-[#EFE2C4] border-2 border-[#947044] text-[#30251A] font-semibold"
                  >
                    <option value="open">Aberto (Entrada Imediata)</option>
                    <option value="application">Por Candidatura</option>
                    <option value="closed">Fechado</option>
                  </select>
                </div>
                <div>
                  <label className="block font-roman font-bold text-xs uppercase mb-1">
                    Nível Mínimo
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newGuildMinLevel}
                    onChange={(e) =>
                      setNewGuildMinLevel(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-full min-h-[44px] px-3 py-2 bg-[#EFE2C4] border-2 border-[#947044] text-[#30251A] font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-roman font-bold text-xs uppercase mb-1">
                    Honra Mínima
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={newGuildMinHonor}
                    onChange={(e) =>
                      setNewGuildMinHonor(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full min-h-[44px] px-3 py-2 bg-[#EFE2C4] border-2 border-[#947044] text-[#30251A] font-semibold tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-roman font-bold text-xs uppercase mb-1">
                  Descrição e Lema da Aliança
                </label>
                <textarea
                  rows={2}
                  value={newGuildDesc}
                  onChange={(e) => setNewGuildDesc(e.target.value)}
                  className="w-full p-2.5 bg-[#EFE2C4] border-2 border-[#947044] text-[#30251A] text-xs"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[#5C4935]">
                  Ao fundar a guilda, você assume o cargo de <strong>Líder (Magister)</strong> com
                  todos os 8 edifícios no Nível 1.
                </span>
                <GameButton
                  variant="crimson"
                  onClick={() =>
                    onCreateGuild({
                      name: newGuildName,
                      tag: newGuildTag,
                      emblemId: newGuildEmblem,
                      description: newGuildDesc,
                      recruitmentStatus: newGuildRecruitment,
                      minLevelReq: newGuildMinLevel,
                      minHonorReq: newGuildMinHonor,
                    })
                  }
                  disabled={
                    state.gold < GUILD_CONFIG.creationCostGold ||
                    newGuildName.trim().length < GUILD_CONFIG.minNameLength ||
                    newGuildTag.trim().length < GUILD_CONFIG.minTagLength
                  }
                  disabledReason={
                    state.gold < GUILD_CONFIG.creationCostGold
                      ? `Requer ${GUILD_CONFIG.creationCostGold} Ouro (Saldo: ${state.gold})`
                      : newGuildName.trim().length < GUILD_CONFIG.minNameLength
                      ? 'Informe um nome com 3+ caracteres'
                      : newGuildTag.trim().length < GUILD_CONFIG.minTagLength
                      ? 'Informe uma Tag com 2 a 4 caracteres'
                      : undefined
                  }
                >
                  Fundar Guilda ({GUILD_CONFIG.creationCostGold} Ouro)
                </GameButton>
              </div>
            </div>
          </RomanPanel>
        )}

        <GuildPublicProfileModal
          open={Boolean(inspectedGuildId)}
          guildId={inspectedGuildId}
          state={state}
          onClose={() => setInspectedGuildId(null)}
          onInspectPlayer={(pId) => {
            setInspectedGuildId(null);
            setInspectedPlayerId(pId);
          }}
          onApplyOrJoinGuild={(gId) => {
            onApplyOrJoinGuild(gId);
            setInspectedGuildId(null);
          }}
          onCancelApplication={(gId) => {
            onCancelApplication(gId);
          }}
        />

        <PlayerPublicProfileModal
          open={Boolean(inspectedPlayerId)}
          playerId={inspectedPlayerId}
          state={state}
          onClose={() => setInspectedPlayerId(null)}
          onInspectGuild={(gId) => {
            setInspectedPlayerId(null);
            setInspectedGuildId(gId);
          }}
        />
      </div>
    );
  }

  // ============================================================================
  // VISÃO 2: JOGADOR É MEMBRO DE UMA GUILDA — Seções 4, 5, 6 e 7
  // ============================================================================
  const playerMember =
    playerGuild.members.find((m) => m.isPlayer) ?? playerGuild.members[0];
  const playerRole: GuildRole = playerMember?.role ?? 'member';
  const perms = GUILD_PERMISSIONS[playerRole];
  const maxCap = getGuildMaxCapacity(playerGuild.buildings.forum_gladiatorius ?? 1);
  const guildRankEntry = guildRankings.find((r) => r.id === playerGuild.id);
  const warehouseCap =
    (playerGuild.buildings.armazem ?? 1) * GUILD_CONFIG.warehouseSlotsPerLevel;

  const mediciCooldownRemainingMs = Math.max(
    0,
    GUILD_CONFIG.villaMediciCooldownMs - (nowMs - state.guildState.lastVillaMediciUseMs)
  );
  const mediciOnCooldown =
    state.guildState.lastVillaMediciUseMs > 0 && mediciCooldownRemainingMs > 0;

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Sede da Guilda */}
      <RomanPanel
        title={`[${playerGuild.tag}] ${playerGuild.name}`}
        subtitle={`Posição na Classificação de Guildas: #${
          guildRankEntry?.rank ?? '-'
        } · Seu Cargo: ${GUILD_ROLE_LABELS[playerRole]}`}
        variant="stone"
        headerAction={
          <GameButton variant="iron" size="sm" onClick={onOpenRankings}>
            Ranking #{guildRankEntry?.rank ?? '-'}
          </GameButton>
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <GuildEmblemBadge
              emblemId={playerGuild.emblemId}
              tag={playerGuild.tag}
              size="lg"
            />
            <div className="space-y-1 text-xs">
              <p className="text-[#D6C29A] leading-relaxed">{playerGuild.description}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#B8A686] tabular-nums">
                <span>
                  Tesouro no Banco:{' '}
                  <strong className="text-[#D4B26A]">
                    {playerGuild.treasuryGold} Ouro
                  </strong>
                </span>
                <span>
                  Membros:{' '}
                  <strong className="text-[#EFE2C4]">
                    {playerGuild.members.length}/{maxCap}
                  </strong>
                </span>
                <span>
                  Honra Total (Soma):{' '}
                  <strong className="text-[#EFE2C4]">
                    {guildRankEntry?.totalHonor ?? 0}
                  </strong>
                </span>
                <span>
                  Média: <strong>{guildRankEntry?.averageHonor ?? 0}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Seletor de Cargo para Teste Local de Permissões (ocultado no Modo Online Competitivo) */}
          {!isOnlineMode ? (
            <div className="p-2 bg-[#140F0C] border border-[#5E4527] text-[11px] shrink-0">
              <span className="block text-[#B8A686] mb-1 font-semibold">
                Inspeção de Permissões (Modo Local):
              </span>
              <div className="flex items-center gap-1">
                {(['member', 'admin', 'leader'] as GuildRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onSetLocalTestRole(r)}
                    className={`min-h-[36px] px-2 py-1 text-[10px] font-roman font-bold border cursor-pointer ${
                      playerRole === r
                        ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
                        : 'bg-[#2B2119] text-[#B8A686] border-[#5E4527]'
                    }`}
                  >
                    {r === 'leader' ? 'Líder' : r === 'admin' ? 'Admin' : 'Membro'}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2 bg-[#1E2E1C] border border-[#4B7A47] text-[11px] text-[#EFE2C4] shrink-0">
              <span className="font-roman font-bold text-[#D4B26A] block uppercase">
                Sede Online Sincronizada
              </span>
              <span>Cargo validado no servidor: {GUILD_ROLE_LABELS[playerRole]}</span>
            </div>
          )}
        </div>

        {/* Resumo dos Benefícios Ativos Integrados ao Jogo (Seção 7) */}
        <div className="mt-3 pt-2.5 border-t border-[#5E4527] flex flex-wrap gap-2 text-[11px] tabular-nums">
          <span className="px-2 py-1 bg-[#253B23] border border-[#4B7A47] text-[#EFE2C4]">
            Campo de Treino: <strong>-{activeBonuses.trainingDiscountPercent}% custo</strong>
          </span>
          <span className="px-2 py-1 bg-[#253B23] border border-[#4B7A47] text-[#EFE2C4]">
            Balneário:{' '}
            <strong>+{activeBonuses.bathhouseHpRegenBonusPerMinute} PV/min</strong>
          </span>
          <span className="px-2 py-1 bg-[#253B23] border border-[#4B7A47] text-[#EFE2C4]">
            Villa Medici: <strong>Cura {activeBonuses.villaMediciHealPercent}%</strong> (
            {activeBonuses.villaMediciGoldCost}g)
          </span>
          {activeBonuses.activeBuffs.map((buff) => {
            const remMin = Math.max(
              1,
              Math.ceil((buff.expiresAtMs - nowMs) / 60000)
            );
            return (
              <span
                key={buff.scrollId}
                className="px-2 py-1 bg-[#541B19] border border-[#D4B26A] text-[#EFE2C4]"
              >
                Pergaminho Ativo: <strong>{buff.name}</strong> ({remMin} min restantes)
              </span>
            );
          })}
        </div>
      </RomanPanel>

      {/* Sub-navegação Interna da Guilda */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setMemberTab('headquarters')}
          className={`min-h-[44px] px-2.5 py-2 font-roman font-bold text-xs border-2 rounded-[2px] cursor-pointer ${
            memberTab === 'headquarters'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527]'
          }`}
        >
          Sede & Edifícios (8)
        </button>
        <button
          type="button"
          onClick={() => setMemberTab('members')}
          className={`min-h-[44px] px-2.5 py-2 font-roman font-bold text-xs border-2 rounded-[2px] cursor-pointer ${
            memberTab === 'members'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527]'
          }`}
        >
          Membros ({playerGuild.members.length}/{maxCap})
          {playerGuild.applications.length > 0
            ? ` · ${playerGuild.applications.length} Cand.`
            : ''}
        </button>
        <button
          type="button"
          onClick={() => setMemberTab('bank_warehouse')}
          className={`min-h-[44px] px-2.5 py-2 font-roman font-bold text-xs border-2 rounded-[2px] cursor-pointer ${
            memberTab === 'bank_warehouse'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527]'
          }`}
        >
          Banco & Armazém ({playerGuild.warehouseItems.length}/{warehouseCap})
        </button>
        <button
          type="button"
          onClick={() => setMemberTab('announcements_log')}
          className={`min-h-[44px] px-2.5 py-2 font-roman font-bold text-xs border-2 rounded-[2px] cursor-pointer ${
            memberTab === 'announcements_log'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527]'
          }`}
        >
          Avisos & Registro ({playerGuild.auditLog.length})
        </button>
      </div>

      {/* ABA 1: SEDE E OS 8 EDIFÍCIOS ROMANOS (Seção 5) */}
      {memberTab === 'headquarters' && (
        <div className="space-y-4">
          {/* Serviços Diretos da Sede: Villa Medici, Biblioteca e Mercado Interno */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Villa Medici */}
            <RomanPanel
              title={`Villa Medici (Nv.${playerGuild.buildings.villa_medici ?? 1})`}
              subtitle="Cura com limite, custo reduzido e espera de 15 min"
              variant="wood"
            >
              <div className="space-y-2 text-xs">
                <p className="text-[#D6C29A]">
                  Restaura até <strong>{activeBonuses.villaMediciHealPercent}%</strong> da
                  sua Vida Máxima ({derived.maxHp} PV). Vida atual:{' '}
                  <strong>
                    {state.currentHp}/{derived.maxHp} PV
                  </strong>
                  .
                </p>
                <GameButton
                  variant="crimson"
                  size="sm"
                  fullWidth
                  onClick={onUseVillaMedici}
                  disabled={
                    state.currentHp >= derived.maxHp ||
                    mediciOnCooldown ||
                    state.gold < activeBonuses.villaMediciGoldCost
                  }
                  disabledReason={
                    state.currentHp >= derived.maxHp
                      ? 'Sua Vida já está cheia'
                      : mediciOnCooldown
                      ? `Em espera (${Math.ceil(mediciCooldownRemainingMs / 60000)} min restantes)`
                      : state.gold < activeBonuses.villaMediciGoldCost
                      ? `Requer ${activeBonuses.villaMediciGoldCost} Ouro`
                      : undefined
                  }
                >
                  Curar na Villa Medici ({activeBonuses.villaMediciGoldCost} Ouro)
                </GameButton>
              </div>
            </RomanPanel>

            {/* Biblioteca (Tabularium) */}
            <RomanPanel
              title={`Biblioteca (Nv.${playerGuild.buildings.biblioteca ?? 1})`}
              subtitle={`Ativação de pergaminhos coletivos por 2h · Tesouro: ${playerGuild.treasuryGold}g`}
              variant="wood"
            >
              <div className="space-y-2 text-xs">
                {(Object.keys(LIBRARY_SCROLL_DEFINITIONS) as LibraryScrollId[]).map(
                  (scrollId) => {
                    const def = LIBRARY_SCROLL_DEFINITIONS[scrollId];
                    const activeBuff = activeBonuses.activeBuffs.find(
                      (b) => b.scrollId === scrollId
                    );
                    const libLv = playerGuild.buildings.biblioteca ?? 1;
                    const canAfford = playerGuild.treasuryGold >= def.treasuryCost;

                    return (
                      <div
                        key={scrollId}
                        className="p-2 bg-[#17120F] border border-[#5E4527] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[#EFE2C4] truncate">
                            {def.name}
                          </div>
                          <div className="text-[11px] text-[#B8A686]">
                            {def.description(libLv)}
                          </div>
                        </div>
                        <GameButton
                          variant={activeBuff ? 'iron' : 'bronze'}
                          size="sm"
                          onClick={() =>
                            onActivateLibraryScroll(
                              scrollId,
                              `tx_lib_${scrollId}_${Date.now()}`
                            )
                          }
                          disabled={
                            Boolean(activeBuff) || !perms.activateLibraryBuff || !canAfford
                          }
                          disabledReason={
                            activeBuff
                              ? 'Já ativo'
                              : !perms.activateLibraryBuff
                              ? 'Requer Líder/Admin'
                              : !canAfford
                              ? `Banco requer ${def.treasuryCost}g`
                              : undefined
                          }
                        >
                          {activeBuff ? 'Ativo' : `${def.treasuryCost}g Banco`}
                        </GameButton>
                      </div>
                    );
                  }
                )}
              </div>
            </RomanPanel>

            {/* Mercado Interno (Macellum Collegii) */}
            <RomanPanel
              title={`Mercado Interno (Nv.${
                playerGuild.buildings.mercado_interno ?? 1
              })`}
              subtitle={`Ofertas exclusivas para membros (-${GUILD_CONFIG.internalMarketDiscountPercent}% preço)`}
              variant="wood"
            >
              <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1 text-xs">
                {playerGuild.internalMarketTemplateIds.map((tplId) => {
                  const tpl = ITEM_TEMPLATES[tplId];
                  if (!tpl) return null;
                  const memberPrice = Math.max(
                    1,
                    Math.round(
                      tpl.buyPrice *
                        (1 - GUILD_CONFIG.internalMarketDiscountPercent / 100)
                    )
                  );
                  const canAfford = state.gold >= memberPrice;
                  const bagFull =
                    state.inventory.length >= GAME_CONFIG.maxInventorySlots;

                  return (
                    <div
                      key={tplId}
                      className="p-2 bg-[#17120F] border border-[#5E4527] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-[#EFE2C4] truncate">
                          {tpl.name} (Nv.{tpl.levelReq})
                        </div>
                        <div className="text-[11px] text-[#D4B26A] tabular-nums">
                          Preço Membro: <strong>{memberPrice}g</strong>{' '}
                          <span className="line-through text-[#7A6C5D]">
                            ({tpl.buyPrice}g)
                          </span>
                        </div>
                      </div>
                      <GameButton
                        variant="crimson"
                        size="sm"
                        onClick={() => onBuyInternalMarketItem(tplId)}
                        disabled={!canAfford || bagFull}
                        disabledReason={
                          bagFull
                            ? 'Mochila cheia'
                            : !canAfford
                            ? `Faltam ${memberPrice - state.gold}g`
                            : undefined
                        }
                      >
                        Comprar
                      </GameButton>
                    </div>
                  );
                })}
              </div>
            </RomanPanel>
          </div>

          {/* Lista Completa dos 8 Edifícios da Sede (Seção 5) */}
          <RomanPanel
            title="Planta Arquitetônica da Sede — 8 Edifícios do Collegium"
            subtitle={`Tesouro no Banco da Guilda: ${playerGuild.treasuryGold} Ouro · Melhorias financiadas pelo Banco`}
            variant="parchment"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(GUILD_BUILDING_DEFINITIONS) as GuildBuildingId[]).map(
                (bId) => {
                  const def = GUILD_BUILDING_DEFINITIONS[bId];
                  const curLv = playerGuild.buildings[bId] ?? 1;
                  const forumLv = playerGuild.buildings.forum_gladiatorius ?? 1;
                  const isMax = curLv >= def.maxLevel;
                  const cost = getBuildingUpgradeCost(bId, curLv);
                  const blockedByForum = def.requiresForumLevel && curLv >= forumLv;
                  const canAffordBank = playerGuild.treasuryGold >= cost;

                  return (
                    <div
                      key={bId}
                      className="p-3 bg-[#1D1510] border-2 border-[#947044] text-[#EFE2C4] flex flex-col justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-roman font-bold text-sm text-[#D4B26A]">
                            {def.name}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-bold bg-[#2B2119] border border-[#B79552] tabular-nums">
                            Nível {curLv}/{def.maxLevel}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#B8A686]">{def.description}</p>
                        <div className="pt-1 text-xs space-y-0.5">
                          <div className="text-[#88B87E]">
                            <strong>Atual:</strong> {def.formatCurrentBenefit(curLv)}
                          </div>
                          <div className="text-[#D6C29A]">
                            <strong>Próximo Nível:</strong>{' '}
                            {def.formatNextBenefit(curLv, def.maxLevel)}
                          </div>
                          <div className="text-[11px] text-[#B8A686] tabular-nums">
                            <strong>Condição:</strong>{' '}
                            {isMax
                              ? 'Edifício concluído no nível máximo'
                              : def.requiresForumLevel
                              ? `Requer Forum Gladiatorius Nv.${curLv + 1} e Cargo Líder/Admin`
                              : 'Requer Cargo Líder/Admin'}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#5E4527] flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#D4B26A] tabular-nums">
                          {isMax ? 'Nível Máximo' : `Custo: ${cost} Ouro (Banco)`}
                        </span>
                        {!isMax && (
                          <GameButton
                            variant="crimson"
                            size="sm"
                            onClick={() =>
                              onUpgradeBuilding(
                                bId,
                                `tx_upg_${bId}_lv${curLv + 1}_${Date.now()}`
                              )
                            }
                            disabled={
                              !perms.upgradeBuildings ||
                              blockedByForum ||
                              !canAffordBank
                            }
                            disabledReason={
                              !perms.upgradeBuildings
                                ? 'Requer cargo Líder ou Admin'
                                : blockedByForum
                                ? `Eleve o Forum para Nv.${curLv + 1}`
                                : !canAffordBank
                                ? `Faltam ${cost - playerGuild.treasuryGold}g no Banco`
                                : undefined
                            }
                          >
                            Melhorar Nv.{curLv + 1}
                          </GameButton>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </RomanPanel>
        </div>
      )}

      {/* ABA 2: MEMBROS, CANDIDATURAS E ADMINISTRAÇÃO (Seção 4) */}
      {memberTab === 'members' && (
        <div className="space-y-4">
          {/* Candidaturas Pendentes */}
          <RomanPanel
            title={`Candidaturas de Recrutamento (${playerGuild.applications.length})`}
            subtitle={`Capacidade atual do Forum: ${playerGuild.members.length}/${maxCap} membros`}
            variant="wood"
            headerAction={
              !isOnlineMode ? (
                <GameButton
                  variant="iron"
                  size="sm"
                  onClick={onAddSimulatedApplicant}
                >
                  + Aspirante (Teste Local)
                </GameButton>
              ) : undefined
            }
          >
            {playerGuild.applications.length === 0 ? (
              <p className="text-xs text-[#B8A686]">
                {isOnlineMode
                  ? 'Não há candidaturas pendentes de jogadores reais no momento.'
                  : 'Não há candidaturas pendentes no momento. Use o botão "+ Aspirante" no topo caso queira testar aprovação, rejeição ou limite de capacidade.'}
              </p>
            ) : (
              <div className="space-y-2">
                {playerGuild.applications.map((app) => {
                  const isFull = playerGuild.members.length >= maxCap;
                  return (
                    <div
                      key={app.id}
                      className="p-2.5 bg-[#17120F] border border-[#947044] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#EFE2C4]">
                          {app.applicantName} (Nível {app.level} · {app.honor} Honra)
                        </div>
                        <p className="text-[11px] text-[#D6C29A]">&ldquo;{app.message}&rdquo;</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <GameButton
                          variant="crimson"
                          size="sm"
                          onClick={() => onReviewApplication(app.id, 'approve')}
                          disabled={!perms.reviewApplications || isFull}
                          disabledReason={
                            !perms.reviewApplications
                              ? 'Requer Líder/Admin'
                              : isFull
                              ? `Capacidade cheia (${playerGuild.members.length}/${maxCap})`
                              : undefined
                          }
                        >
                          Aprovar
                        </GameButton>
                        <GameButton
                          variant="iron"
                          size="sm"
                          onClick={() => onReviewApplication(app.id, 'reject')}
                          disabled={!perms.reviewApplications}
                          disabledReason={
                            !perms.reviewApplications ? 'Requer Líder/Admin' : undefined
                          }
                        >
                          Rejeitar
                        </GameButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </RomanPanel>

          {/* Quadro de Membros Atuais */}
          <RomanPanel
            title={`Hierarquia de Membros (${playerGuild.members.length}/${maxCap})`}
            subtitle="Exibe nome, cargo, nível, honra, contribuição e data de entrada (Sem indicador online fictício)"
            variant="stone"
          >
            <div className="space-y-2.5">
              {playerGuild.members.map((m) => {
                const canKick =
                  !m.isPlayer &&
                  m.role !== 'leader' &&
                  ((m.role === 'admin' && perms.kickAdminMember) ||
                    (m.role === 'member' && perms.kickRegularMember));

                return (
                  <div
                    key={m.id}
                    className={`p-3 border rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                      m.isPlayer
                        ? 'bg-[#36241B] border-[#D4B26A]'
                        : 'bg-[#1D1510] border-[#5E4527]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-roman font-bold text-sm text-[#EFE2C4]">
                          {m.name}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#2B2119] border border-[#947044] text-[#D4B26A]">
                          {GUILD_ROLE_LABELS[m.role]}
                        </span>
                        {m.isPlayer && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#792B28] text-[#EFE2C4]">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#D6C29A] tabular-nums">
                        <span>Nível: <strong>{m.level}</strong></span>
                        <span>Honra: <strong className="text-[#D4B26A]">{m.honor}</strong></span>
                        <span>Contribuição: <strong>{m.goldContributed} Ouro</strong></span>
                        <span>Entrada: <strong>{formatDateShort(m.joinedAtMs)}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <GameButton
                        variant="iron"
                        size="sm"
                        onClick={() => setInspectedPlayerId(m.id)}
                      >
                        Perfil
                      </GameButton>

                      {!m.isPlayer && perms.changeMemberRole && m.role !== 'leader' && (
                        <GameButton
                          variant="bronze"
                          size="sm"
                          onClick={() =>
                            onChangeMemberRole(
                              m.id,
                              m.role === 'admin' ? 'member' : 'admin'
                            )
                          }
                        >
                          {m.role === 'admin' ? 'Rebaixar p/ Membro' : 'Promover a Admin'}
                        </GameButton>
                      )}

                      {!m.isPlayer && perms.transferLeadership && (
                        <GameButton
                          variant="bronze"
                          size="sm"
                          onClick={() => onTransferLeadership(m.id)}
                        >
                          Transferir Liderança
                        </GameButton>
                      )}

                      {!m.isPlayer && m.role !== 'leader' && (
                        <GameButton
                          variant="crimson"
                          size="sm"
                          onClick={() => onKickMember(m.id)}
                          disabled={!canKick}
                          disabledReason={
                            !canKick
                              ? 'Seu cargo não permite remover este membro'
                              : undefined
                          }
                        >
                          Remover
                        </GameButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </RomanPanel>

          {/* Administração de Recrutamento, Saída e Dissolução */}
          <RomanPanel
            title="Administração de Recrutamento e Vínculo"
            subtitle="Regras de liderança, edição de perfil e dissolução com confirmação"
            variant="parchment"
          >
            <div className="space-y-3 text-xs text-[#30251A]">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#947044]/50">
                <div>
                  <strong>Política Atual:</strong>{' '}
                  {GUILD_RECRUITMENT_LABELS[playerGuild.recruitmentStatus]} (Nível{' '}
                  {playerGuild.minLevelReq}+ · Honra {playerGuild.minHonorReq}+)
                </div>
                <GameButton
                  variant="parchment"
                  size="sm"
                  disabled={!perms.editDescriptionAndRecruitment}
                  disabledReason={
                    !perms.editDescriptionAndRecruitment
                      ? 'Requer cargo Líder ou Admin'
                      : undefined
                  }
                  onClick={() => {
                    setEditDescInput(playerGuild.description);
                    setEditRecruitmentInput(playerGuild.recruitmentStatus);
                    setEditMinLevelInput(playerGuild.minLevelReq);
                    setEditMinHonorInput(playerGuild.minHonorReq);
                    setIsEditingProfile((v) => !v);
                  }}
                >
                  {isEditingProfile ? 'Fechar Edição' : 'Editar Recrutamento'}
                </GameButton>
              </div>

              {isEditingProfile && perms.editDescriptionAndRecruitment && (
                <div className="p-3 bg-[#C2AB7E] border border-[#947044] space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block font-bold mb-1">Status</label>
                      <select
                        value={editRecruitmentInput}
                        onChange={(e) =>
                          setEditRecruitmentInput(
                            e.target.value as GuildRecruitmentStatus
                          )
                        }
                        className="w-full min-h-[40px] px-2 bg-[#EFE2C4] border border-[#947044]"
                      >
                        <option value="open">Aberto</option>
                        <option value="application">Por Candidatura</option>
                        <option value="closed">Fechado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Nível Mín.</label>
                      <input
                        type="number"
                        min={1}
                        value={editMinLevelInput}
                        onChange={(e) =>
                          setEditMinLevelInput(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-full min-h-[40px] px-2 bg-[#EFE2C4] border border-[#947044]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Honra Mín.</label>
                      <input
                        type="number"
                        min={0}
                        value={editMinHonorInput}
                        onChange={(e) =>
                          setEditMinHonorInput(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full min-h-[40px] px-2 bg-[#EFE2C4] border border-[#947044]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Descrição Pública</label>
                    <textarea
                      rows={2}
                      value={editDescInput}
                      onChange={(e) => setEditDescInput(e.target.value)}
                      className="w-full p-2 bg-[#EFE2C4] border border-[#947044]"
                    />
                  </div>
                  <GameButton
                    variant="crimson"
                    size="sm"
                    onClick={() => {
                      onUpdateProfile({
                        description: editDescInput,
                        recruitmentStatus: editRecruitmentInput,
                        minLevelReq: editMinLevelInput,
                        minHonorReq: editMinHonorInput,
                      });
                      setIsEditingProfile(false);
                    }}
                  >
                    Salvar Alterações
                  </GameButton>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <GameButton
                    variant="iron"
                    size="sm"
                    onClick={onLeaveGuild}
                    disabled={
                      playerRole === 'leader' && playerGuild.members.length > 1
                    }
                    disabledReason={
                      playerRole === 'leader' && playerGuild.members.length > 1
                        ? 'Transfira a liderança para outro membro antes de sair'
                        : undefined
                    }
                  >
                    Sair da Guilda
                  </GameButton>

                  {perms.dissolveGuild && !confirmDissolve && (
                    <GameButton
                      variant="crimson"
                      size="sm"
                      onClick={() => setConfirmDissolve(true)}
                    >
                      Dissolver Guilda
                    </GameButton>
                  )}
                </div>

                {confirmDissolve && (
                  <div className="p-2 bg-[#541B19] text-[#EFE2C4] border border-[#D4B26A] flex flex-wrap items-center gap-2">
                    <span>Confirmar dissolução definitiva de {playerGuild.name}?</span>
                    <GameButton
                      variant="crimson"
                      size="sm"
                      onClick={() => {
                        onDissolveGuild(true);
                        setConfirmDissolve(false);
                      }}
                    >
                      Confirmar Dissolução
                    </GameButton>
                    <GameButton
                      variant="iron"
                      size="sm"
                      onClick={() => setConfirmDissolve(false)}
                    >
                      Cancelar
                    </GameButton>
                  </div>
                )}
              </div>
            </div>
          </RomanPanel>
        </div>
      )}

      {/* ABA 3: BANCO (AERARIUM) E ARMAZÉM (HORREUM) — Seções 5 e 6 */}
      {memberTab === 'bank_warehouse' && (
        <div className="space-y-4">
          <RomanPanel
            title={`Banco da Guilda (Aerarium Nv.${playerGuild.buildings.banco ?? 1})`}
            subtitle={`Tesouro Coletivo: ${playerGuild.treasuryGold} Ouro · Sua Bolsa Pessoal: ${state.gold} Ouro`}
            variant="parchment"
          >
            <div className="space-y-3 text-xs text-[#30251A]">
              <p>
                As doações de denários financiam ampliações dos edifícios e pergaminhos da
                Biblioteca. <strong>Regra do Aerarium:</strong> Doações são registradas com
                identificador único (idempotente), não aumentam pontos de Honra e o tesouro só
                pode ser utilizado em melhorias e benefícios coletivos.
              </p>

              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block font-roman font-bold uppercase text-[11px] mb-1">
                    Valor da Doação (Inteiro Positivo)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={donationInput}
                    onChange={(e) => setDonationInput(e.target.value)}
                    aria-label="Valor da doação em ouro"
                    className="w-36 min-h-[44px] px-3 py-2 bg-[#EFE2C4] border-2 border-[#947044] font-bold tabular-nums text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[15, 30, 60].map((preset) => (
                    <GameButton
                      key={preset}
                      variant="parchment"
                      size="sm"
                      onClick={() => setDonationInput(String(preset))}
                    >
                      {preset}g
                    </GameButton>
                  ))}
                  <GameButton
                    variant="crimson"
                    size="sm"
                    onClick={() => {
                      const parsed = Number(donationInput);
                      onDonateGold(parsed, `tx_don_${Date.now()}_${parsed}`);
                    }}
                    disabled={
                      !Number.isInteger(Number(donationInput)) ||
                      Number(donationInput) <= 0 ||
                      state.gold < Number(donationInput)
                    }
                    disabledReason={
                      !Number.isInteger(Number(donationInput)) ||
                      Number(donationInput) <= 0
                        ? 'Informe um inteiro positivo'
                        : state.gold < Number(donationInput)
                        ? `Saldo insuficiente (${state.gold} Ouro)`
                        : undefined
                    }
                  >
                    Doar {Number(donationInput) > 0 ? `${donationInput} Ouro` : 'Ouro'}
                  </GameButton>
                </div>
              </div>

              <div className="pt-2 border-t border-[#947044]/50">
                <div className="font-roman font-bold uppercase text-xs mb-1.5">
                  Livro-Razão de Doações e Despesas ({playerGuild.bankHistory.length})
                </div>
                {playerGuild.bankHistory.length === 0 ? (
                  <p className="text-[#5C4935]">Nenhuma movimentação registrada ainda.</p>
                ) : (
                  <div className="max-h-44 overflow-y-auto divide-y divide-[#947044]/40">
                    {playerGuild.bankHistory.map((tx) => (
                      <div
                        key={tx.txId}
                        className="py-1.5 flex items-center justify-between gap-2 tabular-nums"
                      >
                        <div>
                          <span className="font-bold">{tx.authorName}:</span>{' '}
                          <span>{tx.description}</span>
                        </div>
                        <span
                          className={`font-bold shrink-0 ${
                            tx.amount >= 0 ? 'text-[#253B23]' : 'text-[#792B28]'
                          }`}
                        >
                          {tx.amount >= 0 ? `+${tx.amount}g` : `${tx.amount}g`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </RomanPanel>

          {/* Armazém (Horreum) */}
          <RomanPanel
            title={`Armazém Coletivo (Horreum Nv.${playerGuild.buildings.armazem ?? 1})`}
            subtitle={`Ocupação do Armazém: ${playerGuild.warehouseItems.length}/${warehouseCap} slots · Sua Mochila: ${state.inventory.length}/${GAME_CONFIG.maxInventorySlots}`}
            variant="stone"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <h3 className="font-roman font-bold text-[#D4B26A] uppercase mb-2">
                  Itens Guardados no Armazém ({playerGuild.warehouseItems.length}/{warehouseCap})
                </h3>
                {playerGuild.warehouseItems.length === 0 ? (
                  <p className="text-[#B8A686]">O Armazém da Guilda está vazio.</p>
                ) : (
                  <div className="space-y-2">
                    {playerGuild.warehouseItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 bg-[#1D1510] border border-[#5E4527] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemSlot item={item} slotType={item.slot} />
                          <div className="min-w-0">
                            <div className="font-bold text-[#EFE2C4] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[#B8A686]">
                              Requer Nível {item.levelReq}
                            </div>
                          </div>
                        </div>
                        <GameButton
                          variant="bronze"
                          size="sm"
                          onClick={() => onWithdrawWarehouseItem(item.id)}
                          disabled={
                            state.inventory.length >= GAME_CONFIG.maxInventorySlots
                          }
                          disabledReason={
                            state.inventory.length >= GAME_CONFIG.maxInventorySlots
                              ? 'Mochila cheia'
                              : undefined
                          }
                        >
                          Retirar
                        </GameButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-roman font-bold text-[#D4B26A] uppercase mb-2">
                  Depositar da Sua Mochila ({state.inventory.length}/{GAME_CONFIG.maxInventorySlots})
                </h3>
                {state.inventory.length === 0 ? (
                  <p className="text-[#B8A686]">Sua mochila pessoal está vazia.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {state.inventory.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 bg-[#1D1510] border border-[#5E4527] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemSlot item={item} slotType={item.slot} />
                          <div className="min-w-0">
                            <div className="font-bold text-[#EFE2C4] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[#B8A686]">
                              Nv.{item.levelReq} · Venda {item.sellPrice}g
                            </div>
                          </div>
                        </div>
                        <GameButton
                          variant="crimson"
                          size="sm"
                          onClick={() => onDepositWarehouseItem(item.id)}
                          disabled={playerGuild.warehouseItems.length >= warehouseCap}
                          disabledReason={
                            playerGuild.warehouseItems.length >= warehouseCap
                              ? 'Armazém cheio'
                              : undefined
                          }
                        >
                          Depositar
                        </GameButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </RomanPanel>
        </div>
      )}

      {/* ABA 4: MURAL DE AVISOS E REGISTRO DE AUDITORIA (Seção 4) */}
      {memberTab === 'announcements_log' && (
        <div className="space-y-4">
          <RomanPanel
            title="Mural de Avisos do Collegium"
            subtitle="Éditos e ordens táticas publicados pelo Líder e Administradores"
            variant="parchment"
          >
            <div className="space-y-3 text-xs text-[#30251A]">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={announcementInput}
                  onChange={(e) => setAnnouncementInput(e.target.value)}
                  placeholder="Escrever novo aviso para os membros..."
                  className="flex-1 min-h-[44px] px-3 py-2 bg-[#EFE2C4] border-2 border-[#947044] text-[#30251A]"
                />
                <GameButton
                  variant="crimson"
                  size="sm"
                  onClick={() => {
                    onPostAnnouncement(announcementInput);
                    setAnnouncementInput('');
                  }}
                  disabled={
                    !perms.postAnnouncement || announcementInput.trim().length < 3
                  }
                  disabledReason={
                    !perms.postAnnouncement
                      ? 'Apenas Líder ou Admin podem publicar'
                      : announcementInput.trim().length < 3
                      ? 'Mínimo 3 caracteres'
                      : undefined
                  }
                >
                  Publicar Aviso
                </GameButton>
              </div>

              {playerGuild.announcements.length === 0 ? (
                <p className="text-[#5C4935]">Nenhum aviso publicado.</p>
              ) : (
                <div className="space-y-2">
                  {playerGuild.announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-2.5 bg-[#C2AB7E] border border-[#947044]"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#5C4935]">
                        <span>
                          {ann.authorName} ({GUILD_ROLE_LABELS[ann.authorRole]})
                        </span>
                        <span>{formatDateShort(ann.timestampMs)}</span>
                      </div>
                      <p className="mt-1 font-medium text-[#30251A]">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </RomanPanel>

          <RomanPanel
            title="Acta Collegii — Registro de Ações e Auditoria"
            subtitle="Histórico cronológico de entradas, saídas, cargos, doações e melhorias"
            variant="stone"
          >
            <div className="max-h-60 overflow-y-auto divide-y divide-[#5E4527]/50 text-xs">
              {playerGuild.auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="py-2 flex items-center justify-between gap-2"
                >
                  <div>
                    <strong className="text-[#D4B26A]">{entry.actorName}:</strong>{' '}
                    <span className="text-[#EFE2C4]">{entry.action}</span>
                  </div>
                  <span className="text-[11px] text-[#B8A686] shrink-0 tabular-nums">
                    {formatDateShort(entry.timestampMs)}
                  </span>
                </div>
              ))}
            </div>
          </RomanPanel>
        </div>
      )}

      <GuildPublicProfileModal
        open={Boolean(inspectedGuildId)}
        guildId={inspectedGuildId}
        state={state}
        onClose={() => setInspectedGuildId(null)}
        onInspectPlayer={(pId) => {
          setInspectedGuildId(null);
          setInspectedPlayerId(pId);
        }}
      />

      <PlayerPublicProfileModal
        open={Boolean(inspectedPlayerId)}
        playerId={inspectedPlayerId}
        state={state}
        onClose={() => setInspectedPlayerId(null)}
        onInspectGuild={(gId) => {
          setInspectedPlayerId(null);
          setInspectedGuildId(gId);
        }}
      />
    </div>
  );
};
