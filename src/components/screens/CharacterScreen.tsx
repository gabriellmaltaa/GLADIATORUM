import React, { useState } from 'react';
import { ArtworkImage, IMAGE_ASSETS } from '../../design/assets';
import {
  EquipmentSlotType,
  GAME_CONFIG,
  GameItem,
  getXpForNextLevel,
  PRIMARY_STAT_META,
  PrimaryStatKey,
} from '../../game/config';
import {
  computePlayerRankings,
  getActiveGuildBonuses,
} from '../../game/guildsAndRankings';
import {
  DerivedStats,
  GameState,
  getPlayerSnapshotForRankings,
  NextObjectiveInfo,
  StatChangeNotification,
} from '../../game/rules';
import {
  GameButton,
  ItemSlot,
  ItemTooltip,
  MainTabId,
  NextObjectiveBanner,
  ProgressBar,
  RomanPanel,
  StatRow,
} from '../ui/RomanComponents';

interface CharacterScreenProps {
  state: GameState;
  derived: DerivedStats;
  nextObjective: NextObjectiveInfo;
  lastStatChange: StatChangeNotification | null;
  onEquipItem: (itemId: string) => void;
  onUseMedicineItem?: (itemId: string) => void;
  onUnequipSlot: (slot: EquipmentSlotType) => void;
  onSellItem: (itemId: string) => void;
  onRestoreHealthAtBarracks: () => void;
  onNavigateTab: (tab: MainTabId) => void;
  onOpenGuildScreen?: () => void;
  onOpenRankingScreen?: () => void;
}

export const CharacterScreen: React.FC<CharacterScreenProps> = ({
  state,
  derived,
  nextObjective,
  lastStatChange,
  onEquipItem,
  onUseMedicineItem,
  onUnequipSlot,
  onSellItem,
  onRestoreHealthAtBarracks,
  onNavigateTab,
  onOpenGuildScreen,
  onOpenRankingScreen,
}) => {
  const [selectedItem, setSelectedItem] = useState<{
    item: GameItem;
    source: 'equipped' | 'inventory';
  } | null>(null);

  const xpForNext = getXpForNextLevel(state.level);
  const needsHealing = state.currentHp < derived.maxHp;
  const healCost = Math.max(5, Math.ceil((derived.maxHp - state.currentHp) * 0.25));
  const inventoryFull = state.inventory.length >= GAME_CONFIG.maxInventorySlots;

  const guildBonuses = getActiveGuildBonuses(state.guildState);
  const snap = getPlayerSnapshotForRankings(state);
  const playerRankEntry = computePlayerRankings(state.guildState, snap, 'honor').find(
    (p) => p.isPlayer
  );
  const displayNameWithTag = guildBonuses.guildTag
    ? `[${guildBonuses.guildTag}] ${state.name}`
    : state.name;

  const leftSlots: EquipmentSlotType[] = ['helmet', 'weapon', 'armor', 'gloves'];
  const rightSlots: EquipmentSlotType[] = ['amulet', 'shield', 'boots', 'ring'];

  return (
    <div className="character-screen space-y-4">
      {/* Próximo Objetivo de Progressão */}
      <NextObjectiveBanner
        objective={nextObjective}
        onNavigate={() => onNavigateTab(nextObjective.targetTab)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Coluna Esquerda: Retrato Clássico + Paper Doll de Equipamentos */}
        <div className="lg:col-span-6 space-y-4">
          <RomanPanel
            title={`${displayNameWithTag} — Nível ${state.level}`}
            subtitle={`${state.title} · Vitórias: ${state.wins} · Derrotas: ${state.losses}`}
            variant="stone"
            headerAction={
              <div className="flex items-center gap-1.5">
                {guildBonuses.guildTag && onOpenGuildScreen && (
                  <GameButton
                    variant="bronze"
                    size="sm"
                    onClick={onOpenGuildScreen}
                    title={`Abrir sede da guilda ${guildBonuses.guildName}`}
                  >
                    [{guildBonuses.guildTag}]
                  </GameButton>
                )}
                {onOpenRankingScreen && (
                  <GameButton
                    variant="iron"
                    size="sm"
                    onClick={onOpenRankingScreen}
                    title="Abrir Classificação Geral de Gladiadores"
                  >
                    Rank #{playerRankEntry?.rank ?? '-'}
                  </GameButton>
                )}
              </div>
            }
          >
            <div className="grid grid-cols-[64px_1fr_64px] gap-2 sm:gap-3 items-center">
              {/* Slots da Esquerda */}
              <div className="flex flex-col items-center gap-2">
                {leftSlots.map((slot) => {
                  const item = state.equipped[slot];
                  return (
                    <ItemSlot
                      key={slot}
                      slotType={slot}
                      item={item}
                      selected={
                        selectedItem?.source === 'equipped' &&
                        selectedItem.item.slot === slot
                      }
                      onClick={() => {
                        if (item) {
                          setSelectedItem({ item, source: 'equipped' });
                        }
                      }}
                    />
                  );
                })}
              </div>

              {/* Retrato Central do Gladiador */}
              <div className="flex flex-col items-center">
                <div className="gladiator-stage relative w-full max-w-[320px] aspect-[3/4] frame-bronze overflow-hidden bg-[#17120F] shadow-xl">
                  <ArtworkImage
                    src={IMAGE_ASSETS.playerPortrait}
                    alt={state.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-2 text-center">
                    <span className="font-roman font-bold text-xs sm:text-sm text-[#EFE2C4] block truncate">
                      {displayNameWithTag}
                    </span>
                    <button
                      type="button"
                      onClick={onOpenRankingScreen}
                      className="text-[11px] text-[#D4B26A] font-semibold hover:underline cursor-pointer"
                    >
                      Honra: {state.honor} (Posição #{playerRankEntry?.rank ?? '-'})
                    </button>
                  </div>
                </div>
              </div>

              {/* Slots da Direita */}
              <div className="flex flex-col items-center gap-2">
                {rightSlots.map((slot) => {
                  const item = state.equipped[slot];
                  return (
                    <ItemSlot
                      key={slot}
                      slotType={slot}
                      item={item}
                      selected={
                        selectedItem?.source === 'equipped' &&
                        selectedItem.item.slot === slot
                      }
                      onClick={() => {
                        if (item) {
                          setSelectedItem({ item, source: 'equipped' });
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Barras de Vida e Experiência */}
            <div className="mt-4 pt-3 border-t border-[#5E4527] space-y-2.5">
              <ProgressBar
                label="Pontos de Vida (Vitalidade)"
                current={state.currentHp}
                max={derived.maxHp}
                variant="health"
                suffix=" PV"
              />
              <ProgressBar
                label={`Experiência (Nível ${state.level} → ${state.level + 1})`}
                current={state.xp}
                max={xpForNext}
                variant="xp"
                suffix=" XP"
              />

              {needsHealing && (
                <div className="pt-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-[#B8A686]">
                    Ferimentos de batalha reduzem sua resistência.
                  </span>
                  <GameButton
                    variant="crimson"
                    size="sm"
                    onClick={onRestoreHealthAtBarracks}
                    disabled={state.gold < healCost}
                    disabledReason={
                      state.gold < healCost ? `Requer ${healCost} Ouro` : undefined
                    }
                  >
                    Curar no Médico ({healCost} Ouro)
                  </GameButton>
                </div>
              )}
            </div>
          </RomanPanel>

          {/* Inspeção de Item Selecionado por Toque */}
          {selectedItem && (
            <ItemTooltip
              item={selectedItem.item}
              comparedEquippedItem={
                selectedItem.source === 'inventory'
                  ? state.equipped[selectedItem.item.slot]
                  : null
              }
              playerLevel={state.level}
              inventoryFull={inventoryFull}
              mode={selectedItem.source === 'equipped' ? 'equipped' : 'inventory'}
              onEquip={() => {
                onEquipItem(selectedItem.item.id);
                setSelectedItem(null);
              }}
              onUseMedicine={
                onUseMedicineItem
                  ? () => {
                      onUseMedicineItem(selectedItem.item.id);
                      setSelectedItem(null);
                    }
                  : undefined
              }
              onUnequip={() => {
                onUnequipSlot(selectedItem.item.slot);
                setSelectedItem(null);
              }}
              onSell={() => {
                onSellItem(selectedItem.item.id);
                setSelectedItem(null);
              }}
              onClose={() => setSelectedItem(null)}
            />
          )}

          {/* Bolsa Rápida de Equipamentos na Tela de Personagem */}
          <RomanPanel
            title={`Alforje Rápido (${state.inventory.length}/${GAME_CONFIG.maxInventorySlots})`}
            subtitle="Toque em um equipamento para comparar com o slot atual e equipar"
            variant="wood"
          >
            {state.inventory.length === 0 ? (
              <p className="text-xs text-[#B8A686] py-2">
                Sua bolsa está vazia. Conquiste espólios nas Expedições ou visite o Mercado na Cidade.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {state.inventory.map((item) => (
                  <ItemSlot
                    key={item.id}
                    item={item}
                    slotType={item.slot}
                    selected={selectedItem?.item.id === item.id}
                    onClick={() => setSelectedItem({ item, source: 'inventory' })}
                  />
                ))}
              </div>
            )}
          </RomanPanel>
        </div>

        {/* Coluna Direita: Tábua de Atributos em Pergaminho Envelhecido */}
        <div className="lg:col-span-6 space-y-4">
          {lastStatChange && lastStatChange.changes.length > 0 && (
            <div
              role="status"
              className="bg-[#253B23] border-2 border-[#B79552] p-3 text-xs text-[#EFE2C4] space-y-1.5"
            >
              <div className="font-roman font-bold text-xs uppercase tracking-wider text-[#D4B26A]">
                Atualização de Atributos — {lastStatChange.summary}
              </div>
              <div className="flex flex-wrap gap-2 tabular-nums">
                {lastStatChange.changes.map((c) => (
                  <span
                    key={c.label}
                    className="px-2 py-0.5 bg-[#17120F] border border-[#5E4527] font-semibold"
                  >
                    {c.label}: {c.before} → <strong>{c.after}</strong> (
                    {c.diff > 0 ? `▲ +${c.diff}` : `▼ ${c.diff}`})
                  </span>
                ))}
              </div>
            </div>
          )}

          <RomanPanel
            title="Atributos do Gladiador"
            subtitle="Valores atualizados imediatamente por treinos e equipamentos"
            variant="parchment"
          >
            <div className="divide-y divide-[#947044]/40">
              {(Object.keys(PRIMARY_STAT_META) as PrimaryStatKey[]).map((key) => {
                const meta = PRIMARY_STAT_META[key];
                const recentDelta = lastStatChange?.changes.find(
                  (c) => c.label === meta.label
                )?.diff;
                return (
                  <StatRow
                    key={key}
                    label={meta.label}
                    baseValue={state.baseStats[key]}
                    totalValue={derived[key]}
                    delta={recentDelta}
                    description={meta.description}
                    onParchment
                  />
                );
              })}
            </div>
          </RomanPanel>

          <RomanPanel
            title="Estatísticas de Combate Militar"
            subtitle="Fórmulas explícitas aplicadas nas Expedições, Arena e Masmorras"
            variant="stone"
          >
            <div className="divide-y divide-[#5E4527]/50">
              <StatRow
                label="Dano de Ataque"
                totalValue={`${derived.damageMin} - ${derived.damageMax}`}
                description={
                  derived.tempDamageBonusPercent > 0
                    ? `Dano base + Força + Pergaminho Temporário da Guilda (+${derived.tempDamageBonusPercent}%).`
                    : 'Dano base da arma somado ao bônus de Força.'
                }
              />
              <StatRow
                label="Armadura Total"
                totalValue={`${derived.armor} (Absorve ${derived.armorReductionMin}-${derived.armorReductionMax})`}
                description="Reduz diretamente o dano físico recebido a cada turno."
              />
              <StatRow
                label="Chance de Golpe Crítico"
                totalValue={`${derived.critChancePercent}%`}
                description="Derivada da Habilidade; multiplica o dano do golpe em 1,55x."
              />
              <StatRow
                label="Chance de Esquiva"
                totalValue={`${derived.dodgeChancePercent}%`}
                description="Derivada da Agilidade; reduz a precisão do adversário."
              />
              <StatRow
                label="Regeneração de Vida"
                totalValue={`${derived.hpRegenPerMinute} PV/min`}
                description={
                  guildBonuses.bathhouseHpRegenBonusPerMinute > 0
                    ? `Base 12 PV/min + ${guildBonuses.bathhouseHpRegenBonusPerMinute} PV/min do Balneário da Guilda.`
                    : 'Regeneração natural em repouso e patrulha (expansível no Balneário da Guilda).'
                }
              />
              <StatRow
                label="Bônus de Aprendizado (XP)"
                totalValue={`+${derived.xpBonusPercent}%`}
                description="Derivado da Inteligência em todas as vitórias."
              />
            </div>
          </RomanPanel>
        </div>
      </div>
    </div>
  );
};
