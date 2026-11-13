import React, { useState } from 'react';
import { RomanSceneArt } from '../../design/RomanIdentity';
import { ArtworkImage, IMAGE_ASSETS } from '../../design/assets';
import {
  EXPEDITION_REGIONS,
  GAME_CONFIG,
  IDLE_FOCUS_DEFINITIONS,
  IdleFocusMode,
} from '../../game/config';
import {
  CombatReport,
  DerivedStats,
  GameState,
} from '../../game/rules';
import {
  EnemyCard,
  GameButton,
  ProgressBar,
  RewardPanel,
  RomanPanel,
} from '../ui/RomanComponents';

interface ExpeditionsScreenProps {
  state: GameState;
  derived: DerivedStats;
  onStartManualExpedition: (
    regionId: string,
    enemyIndex: number,
    focusMode: IdleFocusMode
  ) => void;
  onToggleIdleActivity: (
    regionId: string,
    enemyIndex: number,
    focusMode: IdleFocusMode
  ) => void;
  onChangeIdleFocus: (focusMode: IdleFocusMode) => void;
  onStopIdleActivity: () => void;
  onClaimReward: (claimId: string) => void;
  onInspectCombatReport: (report: CombatReport) => void;
}

export const ExpeditionsScreen: React.FC<ExpeditionsScreenProps> = ({
  state,
  derived,
  onStartManualExpedition,
  onToggleIdleActivity,
  onChangeIdleFocus,
  onStopIdleActivity,
  onClaimReward,
  onInspectCombatReport,
}) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>(
    state.idle.regionId || EXPEDITION_REGIONS[0].id
  );

  const selectedFocusMode: IdleFocusMode = state.idle.focusMode ?? 'gold';
  const activeFocusDef = IDLE_FOCUS_DEFINITIONS[selectedFocusMode];

  const selectedRegion =
    EXPEDITION_REGIONS.find((r) => r.id === selectedRegionId) ?? EXPEDITION_REGIONS[0];

  const idleRegion =
    EXPEDITION_REGIONS.find((r) => r.id === state.idle.regionId) ?? EXPEDITION_REGIONS[0];
  const idleEnemy = idleRegion.enemies[state.idle.enemyIndex] ?? idleRegion.enemies[0];

  return (
    <div className="expeditions-screen space-y-4">
      <section className="campaign-map" aria-label="Mapa das expedições">
        <RomanSceneArt scene="map" label="Mapa ilustrado com florestas, montanhas e ruínas romanas">
          <div className="map-cartouche"><span>PROVÍNCIAS DO IMPÉRIO</span><h2>Mapa de Expedição</h2><p>Escolha seu próximo destino</p></div>
          <div className="map-destinations">
            {EXPEDITION_REGIONS.map((region, index) => <button key={region.id} type="button"
              aria-pressed={region.id === selectedRegionId}
              onClick={() => setSelectedRegionId(region.id)}
              className={`map-destination destination-${index}`}>
              <span aria-hidden="true" className="map-pin">{index + 1}</span>
              <strong>{region.name}</strong><small>{state.level < region.minLevel ? `Requer nível ${region.minLevel}` : `Nível ${region.minLevel}+ · ${region.energyCost} energia`}</small>
            </button>)}
          </div>
          <div className="map-selection"><span>DESTINO SELECIONADO</span><strong>{selectedRegion.name}</strong><p>{selectedRegion.subtitle}</p></div>
        </RomanSceneArt>
      </section>
      {/* Espólios Pendentes para Resgate Idempotente no topo para visibilidade imediata */}
      {state.pendingRewards.length > 0 && (
        <div className="space-y-3">
          {state.pendingRewards.map((batch) => (
            <RewardPanel key={batch.claimId} batch={batch} onClaim={onClaimReward} />
          ))}
        </div>
      )}

      {/* Painel de Estratégia e Comando de Progressão Idle (Item 10) */}
      <RomanPanel
        title="Comando de Patrulha e Foco Tático (Modo Idle)"
        subtitle={`Repetição automática em segundo plano · Limite offline de ${
          GAME_CONFIG.maxOfflineSeconds / 3600
        } horas`}
        variant="wood"
      >
        <div className="space-y-3">
          {/* Escolha de Foco de Atividade: Ouro, Experiência ou Equipamentos */}
          <div>
            <span className="block text-xs font-roman font-bold text-[#D4B26A] mb-1.5">
              1. Escolha o Foco da Atividade (Afeta incursões manuais e patrulha idle):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(IDLE_FOCUS_DEFINITIONS) as IdleFocusMode[]).map((modeKey) => {
                const def = IDLE_FOCUS_DEFINITIONS[modeKey];
                const isSelected = selectedFocusMode === modeKey;
                return (
                  <button
                    key={modeKey}
                    type="button"
                    onClick={() => onChangeIdleFocus(modeKey)}
                    className={`min-h-[54px] p-2.5 text-left border-2 rounded-[2px] transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#541B19] border-[#D4B26A] text-[#EFE2C4]'
                        : 'bg-[#1D1510] border-[#5E4527] text-[#D6C29A] hover:text-[#EFE2C4]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-roman font-bold text-xs">{def.label}</span>
                      <span className="text-[10px] font-bold px-1 bg-[#17120F] text-[#D4B26A] border border-[#947044]">
                        {def.shortTag}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#B8A686] leading-snug mt-1">
                      {def.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estado Atual da Patrulha Idle */}
          {state.idle.active ? (
            <div className="bg-[#17120F]/90 p-3 border border-[#947044] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-[#D4B26A] block">
                    Patrulha Contínua Ativa · Foco: {activeFocusDef.label} ({activeFocusDef.shortTag})
                  </span>
                  <span className="text-sm font-roman font-bold text-[#EFE2C4]">
                    {idleRegion.name} — Alvo: {idleEnemy.name} (Nível {idleEnemy.level})
                  </span>
                </div>
                <GameButton variant="crimson" size="sm" onClick={onStopIdleActivity}>
                  Pausar Patrulha
                </GameButton>
              </div>

              <ProgressBar
                label={`Ciclo Repetitivo (${idleRegion.durationSeconds}s por incursão · Custo ${idleRegion.energyCost} EN)`}
                current={state.idle.accumulatedSecondsInCurrentCycle}
                max={idleRegion.durationSeconds}
                variant="timer"
                suffix="s"
              />

              {state.idle.pausedReason && (
                <p className="text-xs text-[#D4B26A] bg-[#2B2119] p-2 border border-[#947044]">
                  {state.idle.pausedReason}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-[#17120F]/80 p-3 border border-[#5E4527] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#D6C29A] space-y-1">
                <div className="font-bold text-[#EFE2C4]">
                  Status: Patrulha Automática em Pausa (Foco atual: {activeFocusDef.label})
                </div>
                <p className="leading-relaxed text-[#B8A686]">
                  <strong>Regras da Patrulha:</strong> Repete automaticamente a cada ciclo, consumindo Energia ({selectedRegion.energyCost} EN) e ajustando a Vida conforme o combate. Se a energia acabar, aguarda regeneração (+1 EN a cada 3 min). Ao pausar ou trocar de alvo, os espólios já obtidos permanecem salvos. As mesmas regras aplicam-se offline por até 8h.
                </p>
              </div>
              <GameButton
                variant="bronze"
                size="sm"
                onClick={() => onToggleIdleActivity(selectedRegion.id, 0, selectedFocusMode)}
              >
                Ativar Patrulha em {selectedRegion.name}
              </GameButton>
            </div>
          )}
        </div>
      </RomanPanel>

      {/* Seletor de Regiões de Expedição */}
      <RomanPanel
        title="Territórios Hostis da Itália"
        subtitle="Selecione a região para ver inimigos, requisitos de desbloqueio e ganhos ajustados pelo Foco"
        variant="stone"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          {EXPEDITION_REGIONS.map((region) => {
            const isSelected = region.id === selectedRegion.id;
            const locked = state.level < region.minLevel;
            return (
              <button
                key={region.id}
                type="button"
                onClick={() => setSelectedRegionId(region.id)}
                className={`min-h-[54px] p-2.5 text-left border-2 rounded-[2px] transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#36281E] border-[#D4B26A] text-[#EFE2C4]'
                    : 'bg-[#1D1510] border-[#5E4527] text-[#B8A686] hover:text-[#EFE2C4]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-roman font-bold text-xs sm:text-sm">
                    {region.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold tabular-nums px-1 shrink-0 ${
                      locked ? 'bg-[#541B19] text-[#EFE2C4]' : 'bg-[#2B2119] text-[#D4B26A]'
                    }`}
                  >
                    {locked ? `Bloq. Nv.${region.minLevel}` : `Nv.${region.minLevel}+`}
                  </span>
                </div>
                <p className="text-[11px] text-[#B8A686] mt-0.5">
                  {region.energyCost} Energia · Ciclo {region.durationSeconds}s
                </p>
              </button>
            );
          })}
        </div>

        {/* Banner Pictórico da Região Selecionada */}
        <div className="relative h-36 sm:h-44 w-full frame-bronze overflow-hidden mb-4 bg-[#17120F]">
          <ArtworkImage
            src={IMAGE_ASSETS.expeditionBanner}
            alt={selectedRegion.name}
            fallbackType="banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3 flex flex-col justify-end">
            <span className="text-xs font-semibold text-[#D4B26A]">
              {selectedRegion.subtitle} ·{' '}
              {state.level >= selectedRegion.minLevel
                ? `Região Desbloqueada (Nível mín. ${selectedRegion.minLevel})`
                : `Requisito de Desbloqueio: Alcançar Nível ${selectedRegion.minLevel} (Você está no Nível ${state.level})`}
            </span>
            <h3 className="font-roman font-bold text-lg text-[#EFE2C4]">
              {selectedRegion.name}
            </h3>
            <p className="text-xs text-[#D6C29A] leading-snug max-w-2xl mt-0.5">
              {selectedRegion.ambientDescription}
            </p>
          </div>
        </div>

        {/* Lista de Inimigos da Região com ganhos ajustados pelo Foco selecionado */}
        <div className="space-y-3">
          {selectedRegion.enemies.map((enemy, idx) => {
            const levelLocked = state.level < selectedRegion.minLevel;
            const notEnoughEnergy = state.energy < selectedRegion.energyCost;
            const isCurrentIdleTarget =
              state.idle.active &&
              state.idle.regionId === selectedRegion.id &&
              state.idle.enemyIndex === idx;

            const focusedEnemyView = {
              ...enemy,
              goldMin: Math.max(1, Math.round(enemy.goldMin * activeFocusDef.goldMultiplier)),
              goldMax: Math.max(1, Math.round(enemy.goldMax * activeFocusDef.goldMultiplier)),
              xpReward: Math.max(1, Math.round(enemy.xpReward * activeFocusDef.xpMultiplier)),
              dropChance: Math.min(0.95, enemy.dropChance * activeFocusDef.dropChanceMultiplier),
            };

            let disabledReason: string | undefined;
            if (levelLocked) {
              disabledReason = `Desbloqueia no Nível ${selectedRegion.minLevel} (Faltam ${
                selectedRegion.minLevel - state.level
              } nível(is))`;
            } else if (notEnoughEnergy) {
              disabledReason = `Energia insuficiente (${state.energy}/${selectedRegion.energyCost} EN). Regenera +1 EN a cada 3 min.`;
            }

            return (
              <EnemyCard
                key={enemy.id}
                enemy={focusedEnemyView}
                playerStats={derived}
                simulationTag={`Foco ativo: ${activeFocusDef.label} (${activeFocusDef.shortTag})`}
                energyCost={selectedRegion.energyCost}
                durationSeconds={selectedRegion.durationSeconds}
                isIdleTarget={isCurrentIdleTarget}
                actionLabel="Combater Agora"
                onAction={() =>
                  onStartManualExpedition(selectedRegion.id, idx, selectedFocusMode)
                }
                disabled={levelLocked || notEnoughEnergy}
                disabledReason={disabledReason}
                secondaryActionLabel={
                  isCurrentIdleTarget
                    ? 'Pausar Patrulha Neste Alvo'
                    : 'Repetir em Patrulha Idle'
                }
                onSecondaryAction={() => {
                  if (levelLocked) return;
                  if (isCurrentIdleTarget) {
                    onStopIdleActivity();
                  } else {
                    onToggleIdleActivity(selectedRegion.id, idx, selectedFocusMode);
                  }
                }}
              />
            );
          })}
        </div>
      </RomanPanel>

      {/* Histórico Recente de Relatórios de Combate */}
      {state.combatHistory.length > 0 && (
        <RomanPanel
          title="Crônicas de Batalha Recentes"
          subtitle="Toque em qualquer registro para rever os golpes e o diagnóstico"
          variant="parchment"
        >
          <div className="divide-y divide-[#947044]/40">
            {state.combatHistory.slice(0, 5).map((rep) => (
              <div
                key={rep.id}
                className="py-2 flex items-center justify-between gap-2 text-xs sm:text-sm"
              >
                <div className="min-w-0">
                  <span
                    className={`font-bold ${
                      rep.victory ? 'text-[#295221]' : 'text-[#9E332E]'
                    }`}
                  >
                    {rep.victory ? 'VITÓRIA' : 'DERROTA'}
                  </span>
                  <span className="mx-1.5 text-[#5C4935]">·</span>
                  <span className="font-semibold text-[#30251A]">
                    {rep.enemyName} ({rep.locationName})
                  </span>
                  <span className="block text-[11px] text-[#5C4935] tabular-nums">
                    Dano causado: {rep.totalPlayerDamageDealt} · Dano sofrido:{' '}
                    {rep.totalEnemyDamageDealt} · {rep.rounds.length} ações
                  </span>
                </div>
                <GameButton
                  variant="parchment"
                  size="sm"
                  onClick={() => onInspectCombatReport(rep)}
                >
                  Ver Relatório
                </GameButton>
              </div>
            ))}
          </div>
        </RomanPanel>
      )}
    </div>
  );
};
