import React, { useEffect, useState } from 'react';
import { RomanSceneArt } from '../../design/RomanIdentity';
import { ARENA_OPPONENTS } from '../../game/config';
import {
  computePlayerRankings,
  getActiveGuildBonuses,
} from '../../game/guildsAndRankings';
import {
  CombatReport,
  DerivedStats,
  GameState,
  getPlayerSnapshotForRankings,
} from '../../game/rules';
import {
  EnemyCard,
  GameButton,
  RewardPanel,
  RomanPanel,
} from '../ui/RomanComponents';
import { apiFetchOnlinePlayerRankings } from '../../services/firebaseClient';
import type { OnlinePublicPlayerProfile } from '../../server/onlineAuthorityEngine';

interface ArenaScreenProps {
  state: GameState;
  derived: DerivedStats;
  onChallengeArenaOpponent: (opponentId: string) => void;
  onClaimReward: (claimId: string) => void;
  onInspectCombatReport: (report: CombatReport) => void;
  onOpenRankingScreen?: () => void;
  isOnlineMode?: boolean;
  onChallengePlayer?: (opponentUid: string) => void;
}

export const ArenaScreen: React.FC<ArenaScreenProps> = ({
  state,
  derived,
  onChallengeArenaOpponent,
  onClaimReward,
  onOpenRankingScreen,
  isOnlineMode = false,
  onChallengePlayer,
}) => {
  const [onlineOpponents, setOnlineOpponents] = useState<(OnlinePublicPlayerProfile & { rank: number; isPlayer: boolean })[]>([]);
  const [opponentsLoading, setOpponentsLoading] = useState(false);
  const [opponentsError, setOpponentsError] = useState<string | null>(null);
  const snap = getPlayerSnapshotForRankings(state);
  const playerRankEntry = computePlayerRankings(state.guildState, snap, 'honor').find(
    (p) => p.isPlayer
  );
  const guildBonuses = getActiveGuildBonuses(state.guildState);

  useEffect(() => {
    if (!isOnlineMode) {
      setOnlineOpponents([]);
      return;
    }
    let cancelled = false;
    setOpponentsLoading(true);
    setOpponentsError(null);
    void apiFetchOnlinePlayerRankings({ category: 'honor', limit: 50 }).then((page) => {
      if (!cancelled) setOnlineOpponents(page.items.filter((entry) => !entry.isPlayer));
    }).catch((error: unknown) => {
      if (!cancelled) setOpponentsError(error instanceof Error ? error.message : 'Não foi possível carregar os heróis.');
    }).finally(() => {
      if (!cancelled) setOpponentsLoading(false);
    });
    return () => { cancelled = true; };
  }, [isOnlineMode]);

  return (
    <div className="arena-screen space-y-4">
      <RomanSceneArt scene="arena" label="Simulador holográfico de combate da Vigília" className="arena-panorama">
        <div className="arena-proclamation"><span>SIMULAÇÃO TÁTICA · PROTOCOLO 01</span><h2>Teste seus limites.</h2><p>Treino não letal para preparar sua próxima operação.</p><span className="arena-laurel" aria-hidden="true">V</span></div>
      </RomanSceneArt>
      <RomanPanel
        title="Simulação Tática da Vigília"
        subtitle="Treino competitivo não letal · prepare seu herói e conquiste reputação"
        variant="parchment"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-[#30251A]">
          <p className="leading-relaxed">
            Enfrente os agentes simulados para conquistar{' '}
            <strong>Reputação</strong>, <strong>Fama</strong> e <strong>Créditos</strong>. Os 4
            campeões abaixo são <strong>desafiantes locais com posição fixa na escada</strong>, separados da
            Classificação Geral de Heróis e Alianças.
          </p>
          <div className="shrink-0 bg-[#C2AB7E] border border-[#947044] p-2.5 text-center tabular-nums space-y-1.5">
            <div>
              <span className="block text-[10px] uppercase font-bold text-[#5C4935]">
                {guildBonuses.guildTag ? `[${guildBonuses.guildTag}] ` : ''}Sua Reputação Geral
              </span>
              <span className="font-roman font-bold text-base text-[#30251A]">
                {state.honor} Pontos (Posição #{playerRankEntry?.rank ?? '-'})
              </span>
            </div>
            {onOpenRankingScreen && (
              <GameButton
                variant="parchment"
                size="sm"
                fullWidth
                onClick={onOpenRankingScreen}
              >
                Ver Classificação (#{playerRankEntry?.rank ?? '-'})
              </GameButton>
            )}
          </div>
        </div>
      </RomanPanel>

      {state.pendingRewards.length > 0 && (
        <div className="space-y-3">
          {state.pendingRewards.map((batch) => (
            <RewardPanel key={batch.claimId} batch={batch} onClaim={onClaimReward} />
          ))}
        </div>
      )}

      <RomanPanel
        title="Agentes de Treino"
        subtitle="Treino contra campeões locais · 1 Energia · não afetam a classificação de jogadores"
        variant="stone"
      >
        <div className="space-y-3">
          {ARENA_OPPONENTS.map((opp) => {
            const notEnoughEnergy = state.energy < 1;
            return (
              <EnemyCard
                key={opp.id}
                enemy={opp}
                playerStats={derived}
                simulationTag={`${opp.simulationTag} · posição fixa na escada #${opp.arenaRank} · ${opp.ludusOrigin}`}
                energyCost={1}
                actionLabel="Iniciar Simulação"
                onAction={() => onChallengeArenaOpponent(opp.id)}
                disabled={notEnoughEnergy}
                disabledReason={
                  notEnoughEnergy ? 'Sem Energia suficiente (Requer 1 Energia)' : undefined
                }
              />
            );
          })}
        </div>
      </RomanPanel>

      <RomanPanel
        title="Desafios PvP"
        subtitle="Duelo assíncrono contra heróis reais · 1 Energia · até 5 desafios por dia"
        variant="parchment"
      >
        {!isOnlineMode ? (
          <p className="text-sm text-[#30251A]">Entre na sua conta online para encontrar jogadores reais. O treino continua disponível sem login.</p>
        ) : opponentsLoading ? (
          <p className="text-sm text-[#30251A]">Carregando heróis online…</p>
        ) : opponentsError ? (
          <p className="text-sm text-[#7A2723]">{opponentsError}</p>
        ) : onlineOpponents.length === 0 ? (
          <p className="text-sm text-[#30251A]">Ainda não há outros heróis elegíveis. Assim que jogadores entrarem, eles aparecerão aqui.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {onlineOpponents.slice(0, 12).map((opponent) => {
              const levelGap = Math.abs(state.level - opponent.level);
              const eligible = levelGap <= 10 && state.energy >= 1;
              return (
                <div key={opponent.uid} className="flex items-center justify-between gap-3 border border-[#947044] bg-[#E4D0A5] p-3 text-[#30251A]">
                  <div className="min-w-0">
                    <strong className="block truncate">{opponent.name}</strong>
                    <span className="text-xs">{opponent.title} · Nv. {opponent.level} · Rank #{opponent.rank}</span>
                    <span className="block text-xs">{opponent.guildTag ? `[${opponent.guildTag}] ` : ''}{opponent.honor} Reputação</span>
                  </div>
                  <GameButton variant="parchment" size="sm" disabled={!eligible || !onChallengePlayer} onClick={() => onChallengePlayer?.(opponent.uid)}>
                    {levelGap > 10 ? 'Nível distante' : state.energy < 1 ? 'Sem energia' : 'Desafiar'}
                  </GameButton>
                </div>
              );
            })}
          </div>
        )}
      </RomanPanel>
    </div>
  );
};


