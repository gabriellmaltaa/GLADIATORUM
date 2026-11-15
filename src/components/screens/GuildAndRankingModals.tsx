import React, { useEffect, useState } from 'react';
import {
  computeGuildRankings,
  computePlayerRankings,
  FEAT_DEFINITIONS,
  getGuildMaxCapacity,
  GUILD_BUILDING_DEFINITIONS,
  GUILD_EMBLEMS,
  GUILD_RECRUITMENT_LABELS,
  GUILD_ROLE_LABELS,
  GuildBuildingId,
  GuildEmblemId,
  GuildRecord,
  PlayerRankingEntry,
} from '../../game/guildsAndRankings';
import { GameState, getPlayerSnapshotForRankings } from '../../game/rules';
import { EQUIPMENT_SLOT_LABELS, EquipmentSlotType } from '../../game/config';
import { GladiatorAvatar } from '../../design/GladiatorAvatar';
import { apiFetchOnlinePlayerProfile } from '../../services/firebaseClient';
import type { OnlinePublicPlayerProfile, OnlinePublicPlayerProfileDetails } from '../../server/onlineAuthorityEngine';
import { GameButton, GameModal, ItemSlot } from '../ui/RomanComponents';

/**
 * Emblema Romano Vetorial para Alianças (Collegia)
 */
export const GuildEmblemBadge: React.FC<{
  emblemId: GuildEmblemId;
  tag?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ emblemId, tag, size = 'md' }) => {
  const dimClass =
    size === 'sm'
      ? 'w-9 h-9'
      : size === 'lg'
      ? 'w-14 h-14'
      : 'w-11 h-11';

  return (
    <div
      className={`${dimClass} shrink-0 relative bg-gradient-to-b from-[#6A1D1B] to-[#3B1210] border-2 border-[#B79552] rounded-[2px] flex flex-col items-center justify-center shadow-md select-none`}
      title={GUILD_EMBLEMS[emblemId]?.name ?? 'Estandarte da Aliança'}
    >
      <svg
        viewBox="0 0 32 32"
        className={size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'}
        fill="none"
        stroke="#EFE2C4"
        strokeWidth="1.8"
      >
        {emblemId === 'aquila_imperial' && (
          <>
            <path d="M4 11 C9 8 13 10 16 14 C19 10 23 8 28 11 C25 16 21 18 16 18 C11 18 7 16 4 11 Z" fill="#D4B26A" />
            <path d="M16 7 V25 M11 25 H21" stroke="#EFE2C4" strokeWidth="2" />
          </>
        )}
        {emblemId === 'gladius_crossed' && (
          <>
            <path d="M6 26 L26 6 M21 6 H26 V11" stroke="#D4B26A" strokeWidth="2.2" />
            <path d="M26 26 L6 6 M11 6 H6 V11" stroke="#EFE2C4" strokeWidth="2.2" />
            <circle cx="16" cy="16" r="3" fill="#B79552" />
          </>
        )}
        {emblemId === 'laurel_crown' && (
          <>
            <path d="M16 25 C9 23 6 17 8 9 C10 13 12 17 16 21" stroke="#D4B26A" strokeWidth="2.2" />
            <path d="M16 25 C23 23 26 17 24 9 C22 13 20 17 16 21" stroke="#D4B26A" strokeWidth="2.2" />
            <circle cx="16" cy="12" r="2.5" fill="#EFE2C4" />
          </>
        )}
        {emblemId === 'lupa_capitolina' && (
          <>
            <polygon points="8,22 12,10 16,13 20,9 24,22" fill="#D4B26A" />
            <path d="M6 24 H26" stroke="#EFE2C4" strokeWidth="2" />
          </>
        )}
        {emblemId === 'galea_centurion' && (
          <>
            <path d="M8 12 C12 5 20 5 24 12" stroke="#D4B26A" strokeWidth="3" />
            <path d="M9 14 H23 V23 H9 Z" fill="#947044" />
            <path d="M13 18 H19" stroke="#17120F" strokeWidth="2" />
          </>
        )}
        {emblemId === 'scutum_praetorian' && (
          <>
            <rect x="8" y="6" width="16" height="20" rx="2" fill="#947044" stroke="#EFE2C4" />
            <circle cx="16" cy="16" r="3.5" fill="#D4B26A" />
            <path d="M10 10 L22 22 M22 10 L10 22" stroke="#EFE2C4" strokeWidth="1.5" />
          </>
        )}
      </svg>
      {tag && (
        <span className="text-[9px] font-roman font-bold tracking-tighter text-[#D4B26A] leading-none mt-0.5">
          [{tag}]
        </span>
      )}
    </div>
  );
};

/**
 * Modal de Perfil Público da Aliança (Seções 3, 9 e 10)
 * Acessível tanto na listagem de Alianças quanto na Classificação.
 */
export const GuildPublicProfileModal: React.FC<{
  open: boolean;
  guildId: string | null;
  state: GameState;
  onClose: () => void;
  onInspectPlayer?: (playerId: string) => void;
  onApplyOrJoinGuild?: (guildId: string) => void;
  onCancelApplication?: (guildId: string) => void;
}> = ({
  open,
  guildId,
  state,
  onClose,
  onInspectPlayer,
  onApplyOrJoinGuild,
  onCancelApplication,
}) => {
  if (!open || !guildId) return null;

  const guild: GuildRecord | undefined = state.guildState.guilds.find(
    (g) => g.id === guildId
  );
  if (!guild) return null;

  const snap = getPlayerSnapshotForRankings(state);
  const guildRankings = computeGuildRankings(state.guildState, snap);
  const rankEntry = guildRankings.find((r) => r.id === guild.id);
  const maxCap = getGuildMaxCapacity(guild.buildings.forum_gladiatorius ?? 1);
  const leader = guild.members.find((m) => m.role === 'leader') ?? guild.members[0];
  const hasPendingApp = guild.applications.some(
    (a) => a.isPlayer && a.status === 'pending'
  );
  const isFull = guild.members.length >= maxCap;
  const meetsReqs =
    state.level >= guild.minLevelReq && state.honor >= guild.minHonorReq;

  return (
    <GameModal
      open={open}
      title={`[${guild.tag}] ${guild.name}`}
      subtitle={`Perfil Público da Aliança · Posição #${rankEntry?.rank ?? '-'} na Classificação`}
      onClose={onClose}
    >
      <div className="space-y-3 text-xs sm:text-sm">
        {/* Cabeçalho do Estandarte */}
        <div className="p-3 bg-[#1D1510] border border-[#947044] flex items-start gap-3">
          <GuildEmblemBadge emblemId={guild.emblemId} tag={guild.tag} size="lg" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-roman font-bold text-sm sm:text-base text-[#EFE2C4]">
                {guild.name}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#2B2119] border border-[#B79552] text-[#D4B26A]">
                [{guild.tag}]
              </span>
              {guild.isSimulatedSeed && (
                <span className="px-1.5 py-0.5 text-[10px] bg-[#2B2119] border border-[#5E4527] text-[#B8A686]">
                  Aliança Simulada (Modo Local)
                </span>
              )}
            </div>
            <p className="text-xs text-[#D6C29A] leading-relaxed">{guild.description}</p>
            <div className="pt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#B8A686]">
              <span>
                Líder: <strong className="text-[#EFE2C4]">{leader?.name ?? '-'}</strong>
              </span>
              <span>
                Emblema:{' '}
                <strong className="text-[#EFE2C4]">
                  {GUILD_EMBLEMS[guild.emblemId]?.name}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Indicadores de Classificação, Membros e Requisitos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
          <div className="p-2 bg-[#2B2119] border border-[#5E4527] text-center">
            <span className="block text-[10px] uppercase text-[#B8A686]">Posição Geral</span>
            <span className="font-roman font-bold text-sm text-[#D4B26A]">
              #{rankEntry?.rank ?? '-'}
            </span>
          </div>
          <div className="p-2 bg-[#2B2119] border border-[#5E4527] text-center">
            <span className="block text-[10px] uppercase text-[#B8A686]">Reputação Total</span>
            <span className="font-roman font-bold text-sm text-[#EFE2C4]">
              {rankEntry?.totalHonor ?? 0}
            </span>
          </div>
          <div className="p-2 bg-[#2B2119] border border-[#5E4527] text-center">
            <span className="block text-[10px] uppercase text-[#B8A686]">Média / Membro</span>
            <span className="font-roman font-bold text-sm text-[#D6C29A]">
              {rankEntry?.averageHonor ?? 0}
            </span>
          </div>
          <div className="p-2 bg-[#2B2119] border border-[#5E4527] text-center">
            <span className="block text-[10px] uppercase text-[#B8A686]">Membros / Vagas</span>
            <span className="font-roman font-bold text-sm text-[#EFE2C4]">
              {guild.members.length}/{maxCap}
            </span>
          </div>
        </div>

        {/* Situação do Recrutamento e Requisitos */}
        <div className="p-2.5 surface-parchment frame-parchment text-[#30251A] space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-roman font-bold text-xs uppercase">
              Recrutamento: {GUILD_RECRUITMENT_LABELS[guild.recruitmentStatus]}
            </span>
            <span className="text-xs font-semibold tabular-nums">
              Requisitos: Nível {guild.minLevelReq}+ · Reputação {guild.minHonorReq}+
            </span>
          </div>

          {!state.guildState.playerGuildId && onApplyOrJoinGuild && (
            <div className="pt-1 flex flex-wrap items-center gap-2">
              {hasPendingApp ? (
                <>
                  <span className="text-xs font-bold text-[#792B28]">
                    Candidatura pendente enviada por você.
                  </span>
                  {onCancelApplication && (
                    <GameButton
                      variant="iron"
                      size="sm"
                      onClick={() => onCancelApplication(guild.id)}
                    >
                      Cancelar Candidatura
                    </GameButton>
                  )}
                </>
              ) : (
                <GameButton
                  variant="crimson"
                  size="sm"
                  onClick={() => onApplyOrJoinGuild(guild.id)}
                  disabled={
                    guild.recruitmentStatus === 'closed' || isFull || !meetsReqs
                  }
                  disabledReason={
                    guild.recruitmentStatus === 'closed'
                      ? 'Recrutamento fechado'
                      : isFull
                      ? `Sem vagas (${guild.members.length}/${maxCap})`
                      : !meetsReqs
                      ? `Requer Nv.${guild.minLevelReq} e ${guild.minHonorReq} Reputação`
                      : undefined
                  }
                >
                  {guild.recruitmentStatus === 'open'
                    ? 'Ingressar na Aliança'
                    : 'Enviar Candidatura'}
                </GameButton>
              )}
            </div>
          )}
        </div>

        {/* Edifícios da Sede */}
        <div className="p-2.5 bg-[#1D1510] border border-[#5E4527]">
          <div className="font-roman font-bold text-xs text-[#D4B26A] uppercase mb-2">
            Edifícios da Sede (Níveis Atuais)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] tabular-nums">
            {(Object.keys(GUILD_BUILDING_DEFINITIONS) as GuildBuildingId[]).map(
              (bKey) => (
                <div
                  key={bKey}
                  className="px-2 py-1 bg-[#2B2119] border border-[#5E4527]/70 flex items-center justify-between gap-1"
                >
                  <span className="text-[#D6C29A] truncate">
                    {GUILD_BUILDING_DEFINITIONS[bKey].name.split(' ')[0]}
                  </span>
                  <span className="font-bold text-[#EFE2C4]">
                    Nv.{guild.buildings[bKey] ?? 1}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Quadro de Membros Atuais com Link para Perfil Público */}
        <div className="p-2.5 bg-[#1D1510] border border-[#5E4527]">
          <div className="font-roman font-bold text-xs text-[#D4B26A] uppercase mb-2">
            Membros Atuais ({guild.members.length}/{maxCap}) — Soma de Reputação:{' '}
            {rankEntry?.totalHonor ?? 0}
          </div>
          <div className="divide-y divide-[#5E4527]/50">
            {guild.members.map((m) => (
              <div
                key={m.id}
                className="py-2 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#EFE2C4] truncate">{m.name}</span>
                    {m.isPlayer && (
                      <span className="px-1 py-0.2 text-[10px] bg-[#792B28] text-[#EFE2C4] border border-[#D4B26A]">
                        Você
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#B8A686]">
                    {GUILD_ROLE_LABELS[m.role]} · Nível {m.level} · Doações:{' '}
                    {m.goldContributed}g
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="font-bold text-[#D4B26A]">{m.honor} Reputação</span>
                  {onInspectPlayer && (
                    <GameButton
                      variant="iron"
                      size="sm"
                      onClick={() => onInspectPlayer(m.id)}
                    >
                      Perfil
                    </GameButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameModal>
  );
};

/**
 * Modal de Perfil Público de Jogador / Herói (Seções 8, 10 e 11)
 * Nunca expõe dados privados (saldo de ouro pessoal na carteira, itens da mochila ou tempos internos).
 */
export const PlayerPublicProfileModal: React.FC<{
  open: boolean;
  playerId: string | null;
  state: GameState;
  isOnlineMode?: boolean;
  onlineSummary?: PlayerRankingEntry & Partial<OnlinePublicPlayerProfile>;
  onClose: () => void;
  onInspectGuild?: (guildId: string) => void;
}> = ({ open, playerId, state, isOnlineMode = false, onlineSummary, onClose, onInspectGuild }) => {
  const [onlineDetails, setOnlineDetails] = useState<OnlinePublicPlayerProfileDetails | null>(null);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let active = true;
    setOnlineDetails(null);
    setProfileError('');
    if (open && isOnlineMode && playerId) {
      void apiFetchOnlinePlayerProfile(playerId).then((details) => {
        if (active) setOnlineDetails(details);
      }).catch((error: unknown) => {
        if (active) setProfileError(error instanceof Error ? error.message : 'Não foi possível carregar o perfil do herói.');
      });
    }
    return () => { active = false; };
  }, [open, isOnlineMode, playerId]);

  const online = isOnlineMode && onlineSummary?.id === playerId ? onlineSummary : null;
  const entry: PlayerRankingEntry | undefined = online
    ? { ...online, rank: online.rank, isPlayer: online.isPlayer }
    : (() => {
        if (!playerId) return undefined;
        const snap = getPlayerSnapshotForRankings(state);
        return computePlayerRankings(state.guildState, snap, 'honor').find((p) => p.id === playerId);
      })();

  if (!open || !playerId || !entry) return null;
  const equipped = onlineDetails?.equipped ?? {};
  const equipmentSlots: EquipmentSlotType[] = ['helmet', 'weapon', 'armor', 'gloves', 'amulet', 'shield', 'boots', 'ring'];

  return (
    <GameModal
      open={open}
      title={`${entry.guildTag ? `[${entry.guildTag}] ` : ''}${entry.name}`}
      subtitle={`${isOnlineMode ? 'Herói Online' : 'Perfil Público de Herói'} · Posição #${entry.rank} em Reputação`}
      onClose={onClose}
    >
      <div className="space-y-3 text-xs sm:text-sm">
        <div className="p-3 bg-[#1D1510] border border-[#947044] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-roman font-bold text-base text-[#EFE2C4]">
                {entry.name}
              </span>
              {entry.isPlayer ? (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#792B28] text-[#EFE2C4] border border-[#D4B26A]">
                  Seu Herói
                </span>
              ) : (
                <span className="px-1.5 py-0.5 text-[10px] bg-[#2B2119] border border-[#5E4527] text-[#B8A686]">
                  Herói Simulado (Modo Local)
                </span>
              )}
            </div>
            <p className="text-xs text-[#D6C29A] mt-0.5">
              {entry.title} · Nível {entry.level}
            </p>
          </div>

          {entry.guildId && entry.guildName && (
            <div className="shrink-0">
              <GameButton
                variant="bronze"
                size="sm"
                onClick={() => {
                  if (onInspectGuild && entry.guildId) {
                    onInspectGuild(entry.guildId);
                  }
                }}
              >
                Aliança [{entry.guildTag}] {entry.guildName}
              </GameButton>
            </div>
          )}
        </div>

        <section className="p-3 bg-[#17120F] border border-[#5E4527]" aria-label="Personagem e equipamentos públicos">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(150px,0.8fr)_1.2fr] gap-3 items-center">
            <div className="mx-auto w-full max-w-[190px]">
              <div className="gladiator-stage dynamic-gladiator-stage relative frame-bronze overflow-hidden shadow-xl">
                <GladiatorAvatar equipped={equipped} level={entry.level} name={entry.name} appearance={onlineDetails?.appearance} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-2 text-center">
                  <span className="font-roman font-bold text-xs text-[#EFE2C4] block truncate">{entry.name}</span>
                  <span className="text-[10px] text-[#D4B26A]">{entry.title} · Nível {entry.level}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-roman font-bold text-sm text-[#D4B26A] mb-2">Equipamentos ativos</h3>
              {isOnlineMode && !onlineDetails && !profileError && (
                <p className="text-xs text-[#B8A686] py-3" role="status">Carregando equipamentos públicos…</p>
              )}
              {profileError && <p className="text-xs text-[#E18A78] py-3" role="alert">{profileError}</p>}
              {(!isOnlineMode || onlineDetails) && (
                <div className="grid grid-cols-2 gap-2">
                  {equipmentSlots.map((slot) => {
                    const item = equipped[slot];
                    return (
                      <div key={slot} className="min-w-0 flex items-center gap-2 p-1.5 bg-[#211912] border border-[#47341F]">
                        <ItemSlot item={item} slotType={slot} disabled />
                        <div className="min-w-0">
                          <span className="block text-[9px] uppercase tracking-wide text-[#B8A686]">{EQUIPMENT_SLOT_LABELS[slot]}</span>
                          <span className="block text-[10px] text-[#EFE2C4] leading-tight break-words">{item?.name ?? 'Vazio'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-[10px] text-[#8C7A65]">Somente itens vestidos ficam visíveis. Mochila e saldo são privados.</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 tabular-nums">
          <div className="p-2.5 bg-[#2B2119] border border-[#5E4527]">
            <span className="block text-[10px] uppercase text-[#B8A686]">
              Reputação Geral (#{entry.rank})
            </span>
            <span className="font-roman font-bold text-base text-[#D4B26A]">
              {entry.honor} pts
            </span>
          </div>
          <div className="p-2.5 bg-[#2B2119] border border-[#5E4527]">
            <span className="block text-[10px] uppercase text-[#B8A686]">
              Fama Provincial
            </span>
            <span className="font-roman font-bold text-base text-[#EFE2C4]">
              {entry.fame} pts
            </span>
          </div>
          <div className="p-2.5 bg-[#2B2119] border border-[#5E4527]">
            <span className="block text-[10px] uppercase text-[#B8A686]">
              Vitórias em Combate
            </span>
            <span className="font-roman font-bold text-base text-[#88B87E]">
              {entry.wins}
            </span>
          </div>
          <div className="p-2.5 bg-[#2B2119] border border-[#5E4527]">
            <span className="block text-[10px] uppercase text-[#B8A686]">
              Proezas Cumpridas
            </span>
            <span className="font-roman font-bold text-base text-[#EFE2C4]">
              {entry.featsCount} / {FEAT_DEFINITIONS.length}
            </span>
          </div>
          <div className="p-2.5 bg-[#2B2119] border border-[#5E4527]">
            <span className="block text-[10px] uppercase text-[#B8A686]">
              Créditos Saqueado (Acumulado)
            </span>
            <span className="font-roman font-bold text-base text-[#D6C29A]">
              {entry.goldLooted} créditos
            </span>
          </div>
          <div className="p-2.5 bg-[#2B2119] border border-[#5E4527]">
            <span className="block text-[10px] uppercase text-[#B8A686]">
              Aliança Atual
            </span>
            <span className="font-roman font-bold text-sm text-[#EFE2C4] truncate block">
              {entry.guildTag ? `[${entry.guildTag}] ${entry.guildName}` : 'Independente'}
            </span>
          </div>
        </div>

        <div className="p-2.5 bg-[#17120F] border border-[#5E4527] text-[11px] text-[#B8A686]">
          <strong>Privacidade e Integridade (Seção 11):</strong> O perfil público exibe estatísticas
          competitivas e apenas os equipamentos vestidos. O saldo atual na bolsa pessoal e o
          conteúdo privado da mochila nunca são expostos.
        </div>
      </div>
    </GameModal>
  );
};

