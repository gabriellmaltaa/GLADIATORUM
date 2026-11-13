import React from 'react';
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

interface ArenaScreenProps {
  state: GameState;
  derived: DerivedStats;
  onChallengeArenaOpponent: (opponentId: string) => void;
  onClaimReward: (claimId: string) => void;
  onInspectCombatReport: (report: CombatReport) => void;
  onOpenRankingScreen?: () => void;
}

export const ArenaScreen: React.FC<ArenaScreenProps> = ({
  state,
  derived,
  onChallengeArenaOpponent,
  onClaimReward,
  onOpenRankingScreen,
}) => {
  const snap = getPlayerSnapshotForRankings(state);
  const playerRankEntry = computePlayerRankings(state.guildState, snap, 'honor').find(
    (p) => p.isPlayer
  );
  const guildBonuses = getActiveGuildBonuses(state.guildState);

  return (
    <div className="space-y-4">
      <RomanPanel
        title="Arena Provincial de Cápua"
        subtitle="Desafios contra NPCs · prepare seu gladiador e conquiste prestígio"
        variant="parchment"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-[#30251A]">
          <p className="leading-relaxed">
            Enfrente os campeões fixos da escada da Arena Provincial para conquistar{' '}
            <strong>Honra</strong>, <strong>Fama</strong> e <strong>Denários</strong>. Os 4
            campeões abaixo são <strong>desafiantes locais de escalão fixo</strong>, separados da
            Classificação Geral de Gladiadores e Guildas.
          </p>
          <div className="shrink-0 bg-[#C2AB7E] border border-[#947044] p-2.5 text-center tabular-nums space-y-1.5">
            <div>
              <span className="block text-[10px] uppercase font-bold text-[#5C4935]">
                {guildBonuses.guildTag ? `[${guildBonuses.guildTag}] ` : ''}Sua Honra Geral
              </span>
              <span className="font-roman font-bold text-base text-[#30251A]">
                {state.honor} Pontos (Rank #{playerRankEntry?.rank ?? '-'})
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
        title="Desafiantes da Escada da Arena (Simulados)"
        subtitle="Custo por duelo: 1 Energia · Compare seus atributos antes de lutar"
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
                simulationTag={`${opp.simulationTag} · Escalão Fixo #${opp.arenaRank} · ${opp.ludusOrigin}`}
                energyCost={1}
                actionLabel="Desafiar na Arena"
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
    </div>
  );
};
