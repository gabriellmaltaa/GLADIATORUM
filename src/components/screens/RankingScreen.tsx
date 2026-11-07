import React, { useCallback, useEffect, useState } from 'react';
import {
  computeGuildRankings,
  computePlayerRankings,
  GUILD_CONFIG,
  GuildRankingEntry as RankedGuildEntry,
  PlayerRankingCategory,
  PlayerRankingEntry as RankedPlayerEntry,
} from '../../game/guildsAndRankings';
import { GameState, getPlayerSnapshotForRankings } from '../../game/rules';
import {
  apiFetchOnlineGuildRankings,
  apiFetchOnlinePlayerRankings,
} from '../../services/firebaseClient';
import { GameButton, RomanPanel } from '../ui/RomanComponents';
import {
  GuildEmblemBadge,
  GuildPublicProfileModal,
  PlayerPublicProfileModal,
} from './GuildAndRankingModals';

export interface RankingScreenProps {
  state: GameState;
  isOnlineMode?: boolean;
  initialMode?: 'players' | 'guilds';
  onOpenGuildTab: () => void;
  onApplyOrJoinGuild?: (guildId: string) => void;
  onCancelApplication?: (guildId: string) => void;
}

const CATEGORY_META: Record<
  PlayerRankingCategory,
  { label: string; unit: string; description: string }
> = {
  honor: {
    label: 'Honra Geral',
    unit: 'Honra',
    description:
      'Pontuação competitiva principal conquistada em vitórias validadas na Arena, Expedições e Patrulhas.',
  },
  fame: {
    label: 'Fama Provincial',
    unit: 'Fama',
    description:
      'Prestígio acumulado ao vencer duelos na Arena, conquistar Masmorras e subir de Nível.',
  },
  wins: {
    label: 'Vitórias',
    unit: 'Vitórias',
    description: 'Total acumulado de combates vencidos pelo gladiador.',
  },
  feats: {
    label: 'Proezas',
    unit: 'Proezas',
    description: 'Marcos históricos e façanhas marciais concluídas em Cápua.',
  },
  gold_looted: {
    label: 'Ouro Saqueado',
    unit: 'Ouro',
    description:
      'Soma histórica de denários saqueados em combates (não equivale ao saldo atual na carteira).',
  },
};

export const RankingScreen: React.FC<RankingScreenProps> = ({
  state,
  isOnlineMode = false,
  initialMode = 'players',
  onOpenGuildTab,
  onApplyOrJoinGuild,
  onCancelApplication,
}) => {
  const [rankingMode, setRankingMode] = useState<'players' | 'guilds'>(initialMode);
  const [category, setCategory] = useState<PlayerRankingCategory>('honor');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  // Estado de Paginação por Cursor (Modo Online Autoritativo)
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [jumpToMineFlag, setJumpToMineFlag] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreOnline, setHasMoreOnline] = useState(false);
  const [onlinePlayersPage, setOnlinePlayersPage] = useState<RankedPlayerEntry[]>([]);
  const [onlineGuildsPage, setOnlineGuildsPage] = useState<RankedGuildEntry[]>([]);
  const [onlineTotalPlayers, setOnlineTotalPlayers] = useState(0);
  const [onlineTotalGuilds, setOnlineTotalGuilds] = useState(0);
  const [onlinePlayerOwnEntry, setOnlinePlayerOwnEntry] =
    useState<RankedPlayerEntry | null>(null);
  const [onlineGuildOwnEntry, setOnlineGuildOwnEntry] =
    useState<RankedGuildEntry | null>(null);
  const [lastServerUpdatedAtMs, setLastServerUpdatedAtMs] = useState<number>(Date.now());

  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);
  const [inspectedGuildId, setInspectedGuildId] = useState<string | null>(null);

  const pageSize = GUILD_CONFIG.rankingPageSize;
  const activeCursor = cursorStack[cursorStack.length - 1] ?? null;

  const fetchOnlineRankingsPage = useCallback(
    async (opts?: { cursorOverride?: string | null; jumpToMine?: boolean }) => {
      if (!isOnlineMode) return;
      setSyncStatus('loading');
      setSyncErrorMessage(null);
      const cursorToUse =
        opts && 'cursorOverride' in opts ? opts.cursorOverride : activeCursor;
      const shouldJump = opts?.jumpToMine ?? jumpToMineFlag;

      try {
        if (rankingMode === 'players') {
          const [res, guildSummary] = await Promise.all([
            apiFetchOnlinePlayerRankings({
              category,
              limit: pageSize,
              cursor: shouldJump ? null : cursorToUse,
              search: searchQuery.trim() || undefined,
              jumpToMyPosition: shouldJump,
            }),
            apiFetchOnlineGuildRankings({ limit: 1 }),
          ]);
          setOnlinePlayersPage(res.items);
          setOnlineTotalPlayers(res.totalPlayers);
          setOnlinePlayerOwnEntry(res.playerOwnEntry);
          setOnlineTotalGuilds(guildSummary.totalGuilds);
          setOnlineGuildOwnEntry(guildSummary.playerGuildEntry);
          setNextCursor(res.nextCursor);
          setHasMoreOnline(res.hasMore);
          setLastServerUpdatedAtMs(res.updatedAtMs);
        } else {
          const res = await apiFetchOnlineGuildRankings({
            limit: pageSize,
            cursor: shouldJump ? null : cursorToUse,
            search: searchQuery.trim() || undefined,
            jumpToMyGuild: shouldJump,
          });
          setOnlineGuildsPage(res.items);
          setOnlineTotalGuilds(res.totalGuilds);
          setOnlineGuildOwnEntry(res.playerGuildEntry);
          setNextCursor(res.nextCursor);
          setHasMoreOnline(res.hasMore);
          setLastServerUpdatedAtMs(res.updatedAtMs);
        }
        setSyncStatus('idle');
      } catch (err: unknown) {
        setSyncStatus('error');
        setSyncErrorMessage(
          err instanceof Error
            ? err.message
            : 'Falha de comunicação ao consultar a classificação no servidor.'
        );
      }
    },
    [isOnlineMode, rankingMode, category, pageSize, activeCursor, searchQuery, jumpToMineFlag]
  );

  useEffect(() => {
    if (isOnlineMode) {
      void fetchOnlineRankingsPage();
    }
  }, [isOnlineMode, fetchOnlineRankingsPage, state.honor, state.fame, state.wins, state.guildState.playerGuildId]);

  // Fallback Local (Modo Visitante Local)
  const snap = getPlayerSnapshotForRankings(state);
  const localPlayers = computePlayerRankings(state.guildState, snap, category);
  const localGuilds = computeGuildRankings(state.guildState, snap);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredLocalPlayers = localPlayers.filter(
    (p) =>
      !normalizedSearch ||
      p.name.toLowerCase().includes(normalizedSearch) ||
      (p.guildName && p.guildName.toLowerCase().includes(normalizedSearch)) ||
      (p.guildTag && p.guildTag.toLowerCase().includes(normalizedSearch))
  );
  const filteredLocalGuilds = localGuilds.filter(
    (g) =>
      !normalizedSearch ||
      g.name.toLowerCase().includes(normalizedSearch) ||
      g.tag.toLowerCase().includes(normalizedSearch) ||
      g.leaderName.toLowerCase().includes(normalizedSearch)
  );

  const localTotalItems =
    rankingMode === 'players'
      ? filteredLocalPlayers.length
      : filteredLocalGuilds.length;
  const localTotalPages = Math.max(1, Math.ceil(localTotalItems / pageSize));
  const safeLocalPage = Math.max(1, Math.min(currentPage, localTotalPages));

  const displayedPlayers = isOnlineMode
    ? onlinePlayersPage
    : filteredLocalPlayers.slice(
        (safeLocalPage - 1) * pageSize,
        safeLocalPage * pageSize
      );

  const displayedGuilds = isOnlineMode
    ? onlineGuildsPage
    : filteredLocalGuilds.slice(
        (safeLocalPage - 1) * pageSize,
        safeLocalPage * pageSize
      );

  const playerOwnEntry = isOnlineMode
    ? onlinePlayerOwnEntry
    : localPlayers.find((p) => p.isPlayer) ?? null;

  const playerGuildEntry = isOnlineMode
    ? onlineGuildOwnEntry
    : localGuilds.find((g) => g.isPlayerGuild) ?? null;

  const totalPlayersCount = isOnlineMode ? onlineTotalPlayers : localPlayers.length;
  const totalGuildsCount = isOnlineMode ? onlineTotalGuilds : localGuilds.length;
  const totalItemsDisplayed =
    rankingMode === 'players'
      ? isOnlineMode
        ? onlineTotalPlayers
        : filteredLocalPlayers.length
      : isOnlineMode
      ? onlineTotalGuilds
      : filteredLocalGuilds.length;

  const handleJumpToMyPosition = () => {
    setSearchQuery('');
    if (isOnlineMode) {
      setCursorStack([null]);
      setJumpToMineFlag(true);
      void fetchOnlineRankingsPage({ cursorOverride: null, jumpToMine: true });
      return;
    }
    if (rankingMode === 'players') {
      const idx = localPlayers.findIndex((p) => p.isPlayer);
      if (idx >= 0) {
        setCurrentPage(Math.floor(idx / pageSize) + 1);
      }
    } else {
      const idx = localGuilds.findIndex((g) => g.isPlayerGuild);
      if (idx >= 0) {
        setCurrentPage(Math.floor(idx / pageSize) + 1);
      } else {
        setCurrentPage(1);
      }
    }
  };

  const handleRefreshSnapshot = () => {
    if (isOnlineMode) {
      void fetchOnlineRankingsPage();
      return;
    }
    setSyncStatus('loading');
    window.setTimeout(() => {
      setSyncStatus('idle');
    }, 150);
  };

  const handleNextPage = () => {
    setJumpToMineFlag(false);
    if (isOnlineMode) {
      if (hasMoreOnline && nextCursor) {
        setCursorStack((prev) => [...prev, nextCursor]);
      }
    } else {
      setCurrentPage((p) => Math.min(localTotalPages, p + 1));
    }
  };

  const handlePrevPage = () => {
    setJumpToMineFlag(false);
    if (isOnlineMode) {
      if (cursorStack.length > 1) {
        setCursorStack((prev) => prev.slice(0, prev.length - 1));
      }
    } else {
      setCurrentPage((p) => Math.max(1, p - 1));
    }
  };

  const getCategoryScore = (p: RankedPlayerEntry) => {
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

  const formattedUpdatedTime = (() => {
    try {
      return new Date(lastServerUpdatedAtMs).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Agora';
    }
  })();

  return (
    <div className="space-y-4">
      {/* Cabeçalho Transparente de Modo Online Competitivo vs Modo Visitante Local (Seção 6) */}
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
              ? 'Modo Online Competitivo — Servidor Autoritativo & Firebase:'
              : 'Modo Visitante Local — Dados Simulados:'}
          </strong>{' '}
          {isOnlineMode
            ? `Classificação paginada por cursor com dados validados pelo servidor (Atualizado às ${formattedUpdatedTime}). Adversários fixos da Arena e NPCs de demonstração não entram neste ranking.`
            : 'Você está jogando sem login online. Os dados abaixo são simulados localmente. Conecte sua conta no topo para disputar o Ranking Online real.'}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GameButton variant="iron" size="sm" onClick={handleRefreshSnapshot}>
            {syncStatus === 'loading' ? 'Sincronizando...' : 'Atualizar'}
          </GameButton>
        </div>
      </div>

      {/* Alternador Principal: Jogadores vs Guildas */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setRankingMode('players');
            setCurrentPage(1);
            setCursorStack([null]);
          }}
          className={`min-h-[46px] px-3 py-2 font-roman font-bold text-xs sm:text-sm border-2 rounded-[2px] cursor-pointer ${
            rankingMode === 'players'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527]'
          }`}
        >
          Gladiadores ({totalPlayersCount}) · Sua Posição: #{playerOwnEntry?.rank ?? '-'}
        </button>
        <button
          type="button"
          onClick={() => {
            setRankingMode('guilds');
            setCurrentPage(1);
            setCursorStack([null]);
          }}
          className={`min-h-[46px] px-3 py-2 font-roman font-bold text-xs sm:text-sm border-2 rounded-[2px] cursor-pointer ${
            rankingMode === 'guilds'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527]'
          }`}
        >
          Guildas ({totalGuildsCount})
          {playerGuildEntry ? ` · Sua Guilda: #${playerGuildEntry.rank}` : ''}
        </button>
      </div>

      {/* Categorias da Classificação de Jogadores */}
      {rankingMode === 'players' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {(Object.keys(CATEGORY_META) as PlayerRankingCategory[]).map((catKey) => {
              const meta = CATEGORY_META[catKey];
              const isSelected = category === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => {
                    setCategory(catKey);
                    setCurrentPage(1);
                    setCursorStack([null]);
                  }}
                  className={`min-h-[44px] px-2 py-1.5 font-roman font-bold text-xs border rounded-[2px] cursor-pointer ${
                    isSelected
                      ? 'bg-[#36241B] text-[#D4B26A] border-[#D4B26A]'
                      : 'bg-[#1D1510] text-[#B8A686] border-[#5E4527] hover:text-[#EFE2C4]'
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[#B8A686] px-1">
            <strong>Critério ({CATEGORY_META[category].label}):</strong>{' '}
            {CATEGORY_META[category].description} Desempate determinístico por Honra, Nível,
            Vitórias e UID.
          </p>
        </div>
      )}

      {rankingMode === 'guilds' && (
        <p className="text-[11px] text-[#B8A686] px-1">
          <strong>Critério de Guildas:</strong> Soma exata da Honra dos membros atuais validados
          no servidor. Doações de ouro nunca somam Honra e membros removidos deixam de pontuar
          imediatamente.
        </p>
      )}

      {/* Barra de Busca e Botão "Minha Posição" */}
      <RomanPanel
        title={
          rankingMode === 'players'
            ? `Tábua de Classificação — ${CATEGORY_META[category].label}`
            : 'Tábua de Classificação — Guildas de Cápua'
        }
        subtitle={
          isOnlineMode
            ? `Cursor Página ${cursorStack.length} · ${totalItemsDisplayed} registros validados · Atualizado às ${formattedUpdatedTime}`
            : `Página ${safeLocalPage} de ${localTotalPages} · Toque em qualquer linha para abrir o Perfil Público`
        }
        variant="stone"
        headerAction={
          <GameButton
            variant="crimson"
            size="sm"
            onClick={handleJumpToMyPosition}
            disabled={rankingMode === 'guilds' && !playerGuildEntry}
            disabledReason={
              rankingMode === 'guilds' && !playerGuildEntry
                ? 'Você ainda não pertence a uma guilda'
                : undefined
            }
          >
            Minha Posição (
            {rankingMode === 'players'
              ? `#${playerOwnEntry?.rank ?? '-'}`
              : playerGuildEntry
              ? `#${playerGuildEntry.rank}`
              : 'Sem Guilda'}
            )
          </GameButton>
        }
      >
        <div className="mb-3 flex flex-col sm:flex-row gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
              setCursorStack([null]);
            }}
            placeholder={
              rankingMode === 'players'
                ? 'Buscar por nome do jogador, guilda ou [TAG]...'
                : 'Buscar por nome da guilda, [TAG] ou líder...'
            }
            aria-label="Buscar na classificação"
            className="flex-1 min-h-[44px] px-3 py-2 bg-[#140F0C] border-2 border-[#5E4527] text-xs sm:text-sm text-[#EFE2C4] placeholder-[#7A6C5D] focus:outline-none focus:border-[#D4B26A]"
          />
          {searchQuery && (
            <GameButton
              variant="iron"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
                setCursorStack([null]);
              }}
            >
              Limpar Filtro
            </GameButton>
          )}
        </div>

        {syncStatus === 'loading' ? (
          <div className="p-6 text-center text-xs text-[#D4B26A] font-roman">
            Sincronizando registros do Tabularium...
          </div>
        ) : syncStatus === 'error' ? (
          <div className="p-4 bg-[#541B19] border border-[#D4B26A] text-xs text-[#EFE2C4] flex items-center justify-between gap-2">
            <span>
              {syncErrorMessage ?? 'Falha ao consultar a classificação.'}
            </span>
            <GameButton variant="iron" size="sm" onClick={handleRefreshSnapshot}>
              Tentar Novamente
            </GameButton>
          </div>
        ) : (rankingMode === 'players' ? displayedPlayers.length : displayedGuilds.length) ===
          0 ? (
          <div className="p-5 bg-[#17120F] border border-[#5E4527] text-center space-y-2 text-xs text-[#B8A686]">
            <p>Nenhum registro encontrado para a busca &ldquo;{searchQuery}&rdquo;.</p>
            <GameButton
              variant="iron"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCursorStack([null]);
              }}
            >
              Mostrar Todos
            </GameButton>
          </div>
        ) : rankingMode === 'players' ? (
          <div className="space-y-2">
            {displayedPlayers.map((entry) => {
              const score = getCategoryScore(entry);
              return (
                <div
                  key={entry.id}
                  onClick={() => setInspectedPlayerId(entry.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setInspectedPlayerId(entry.id);
                    }
                  }}
                  className={`min-h-[54px] p-2.5 border-2 rounded-[2px] flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                    entry.isPlayer
                      ? 'bg-[#3D251C] border-[#D4B26A] text-[#EFE2C4]'
                      : 'bg-[#1D1510] border-[#5E4527] hover:border-[#947044]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-8 h-8 shrink-0 flex items-center justify-center font-roman font-bold text-xs border tabular-nums ${
                        entry.rank === 1
                          ? 'bg-[#6E512F] text-[#EFE2C4] border-[#D4B26A]'
                          : entry.isPlayer
                          ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
                          : 'bg-[#140F0C] text-[#D6C29A] border-[#5E4527]'
                      }`}
                    >
                      #{entry.rank}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {entry.guildTag && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (entry.guildId) setInspectedGuildId(entry.guildId);
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-roman font-bold bg-[#2B2119] border border-[#B79552] text-[#D4B26A] hover:underline cursor-pointer"
                            title={`Ver perfil da guilda [${entry.guildTag}]`}
                          >
                            [{entry.guildTag}]
                          </button>
                        )}
                        <span className="font-roman font-bold text-xs sm:text-sm text-[#EFE2C4] truncate">
                          {entry.name}
                        </span>
                        {entry.isPlayer && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#792B28] text-[#EFE2C4] border border-[#D4B26A]">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#B8A686] tabular-nums">
                        Nível {entry.level} · {entry.title}
                        {category !== 'honor' ? ` · ${entry.honor} Honra` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    <span className="font-roman font-bold text-sm sm:text-base text-[#D4B26A] block">
                      {score}
                    </span>
                    <span className="text-[10px] uppercase text-[#B8A686]">
                      {CATEGORY_META[category].unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {displayedGuilds.map((g) => (
              <div
                key={g.id}
                onClick={() => setInspectedGuildId(g.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setInspectedGuildId(g.id);
                  }
                }}
                className={`min-h-[58px] p-2.5 border-2 rounded-[2px] flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                  g.isPlayerGuild
                    ? 'bg-[#3D251C] border-[#D4B26A] text-[#EFE2C4]'
                    : 'bg-[#1D1510] border-[#5E4527] hover:border-[#947044]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 shrink-0 flex items-center justify-center font-roman font-bold text-xs border tabular-nums ${
                      g.rank === 1
                        ? 'bg-[#6E512F] text-[#EFE2C4] border-[#D4B26A]'
                        : g.isPlayerGuild
                        ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
                        : 'bg-[#140F0C] text-[#D6C29A] border-[#5E4527]'
                    }`}
                  >
                    #{g.rank}
                  </span>

                  <GuildEmblemBadge emblemId={g.emblemId} size="sm" />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-roman font-bold text-xs sm:text-sm text-[#EFE2C4] truncate">
                        [{g.tag}] {g.name}
                      </span>
                      {g.isPlayerGuild && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#792B28] text-[#EFE2C4] border border-[#D4B26A]">
                          Sua Guilda
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#B8A686] tabular-nums">
                      Membros: <strong>{g.memberCount}/{g.maxCapacity}</strong> · Média:{' '}
                      <strong>{g.averageHonor} Honra</strong> · Líder: {g.leaderName}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <span className="font-roman font-bold text-sm sm:text-base text-[#D4B26A] block">
                    {g.totalHonor}
                  </span>
                  <span className="text-[10px] uppercase text-[#B8A686]">
                    Honra Total
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Controles de Paginação por Cursor (Online) ou Índice (Local) */}
        <div className="mt-3 pt-2.5 border-t border-[#5E4527] flex items-center justify-between gap-2 text-xs tabular-nums">
          <GameButton
            variant="iron"
            size="sm"
            onClick={handlePrevPage}
            disabled={isOnlineMode ? cursorStack.length <= 1 : safeLocalPage <= 1}
          >
            ← Anterior
          </GameButton>
          <span className="text-[#D6C29A] font-semibold">
            {isOnlineMode
              ? `Página ${cursorStack.length} (${totalItemsDisplayed} registros)`
              : `Página ${safeLocalPage} de ${localTotalPages} (${localTotalItems} registros)`}
          </span>
          <GameButton
            variant="iron"
            size="sm"
            onClick={handleNextPage}
            disabled={
              isOnlineMode ? !hasMoreOnline || !nextCursor : safeLocalPage >= localTotalPages
            }
          >
            Próxima →
          </GameButton>
        </div>
      </RomanPanel>

      {/* Atalho para a aba Guilda */}
      <div className="p-3 bg-[#1D1510] border border-[#5E4527] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span className="text-[#D6C29A]">
          {playerGuildEntry
            ? `Sua guilda [${playerGuildEntry.tag}] ${playerGuildEntry.name} ocupa a posição #${playerGuildEntry.rank} com ${playerGuildEntry.totalHonor} pontos de Honra.`
            : 'Você ainda é um gladiador independente. Junte-se a uma guilda ou funde a sua para disputar o ranking de alianças!'}
        </span>
        <GameButton variant="bronze" size="sm" onClick={onOpenGuildTab}>
          {playerGuildEntry ? 'Abrir Sede da Guilda' : 'Explorar Guildas'}
        </GameButton>
      </div>

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

      <GuildPublicProfileModal
        open={Boolean(inspectedGuildId)}
        guildId={inspectedGuildId}
        state={state}
        onClose={() => setInspectedGuildId(null)}
        onInspectPlayer={(pId) => {
          setInspectedGuildId(null);
          setInspectedPlayerId(pId);
        }}
        onApplyOrJoinGuild={onApplyOrJoinGuild}
        onCancelApplication={onCancelApplication}
      />
    </div>
  );
};
