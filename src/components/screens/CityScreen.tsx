import React, { useEffect, useState } from 'react';
import { ChronicleScreen } from './ChronicleScreen';
import { EquipmentFilters, EMPTY_EQUIPMENT_FILTER, matchesEquipmentFilter } from '../ui/EquipmentFilters';
import { DESIGN_TOKENS } from '../../design/tokens';
import { ItemArtwork } from '../../design/assets';
import {
  DUNGEONS,
  DungeonDifficulty,
  GAME_CONFIG,
  GameItem,
  ITEM_TEMPLATES,
  MEDICAL_TREATMENTS,
  MEDICINE_ITEM_TEMPLATES,
  PRIMARY_STAT_META,
  PrimaryStatKey,
} from '../../game/config';
import {
  computePlayerRankings,
  getActiveGuildBonuses,
  GuildBuildingId,
  GuildEmblemId,
  GuildRecruitmentStatus,
  GuildRole,
  LibraryScrollId,
} from '../../game/guildsAndRankings';
import {
  CombatReport,
  DerivedStats,
  GameState,
  getEffectiveTrainingCost,
  getMedicalTreatmentCost,
  getPlayerSnapshotForRankings,
} from '../../game/rules';
import {
  EnemyCard,
  GameButton,
  ItemSlot,
  ItemTooltip,
  ProgressBar,
  RewardPanel,
  RomanPanel,
  StatRow,
} from '../ui/RomanComponents';
import { GuildScreen } from './GuildScreen';
import { RankingScreen } from './RankingScreen';

export type CitySubTab =
  | 'chronicle'
  | 'training'
  | 'market'
  | 'medicina'
  | 'dungeons'
  | 'guild'
  | 'rankings';

const DUNGEON_DIFFICULTIES: ('Todas' | DungeonDifficulty)[] = [
  'Todas',
  'Iniciante',
  'Veterano',
  'Elite',
  'Mestre',
  'Pesadelo',
  'Abissal',
  'Divino',
];

const DIFFICULTY_BADGE_STYLES: Record<DungeonDifficulty, string> = {
  Iniciante: 'bg-[#23381F] text-[#88B87E] border-[#4E7A45]',
  Veterano: 'bg-[#1E2F40] text-[#87B0D6] border-[#496B8C]',
  Elite: 'bg-[#311D38] text-[#C394D4] border-[#7D4E8D]',
  Mestre: 'bg-[#3D2E14] text-[#E5C170] border-[#B79552]',
  Pesadelo: 'bg-[#3D1610] text-[#FF9B85] border-[#C84B31]',
  Abissal: 'bg-[#3B2E0C] text-[#FFE484] border-[#D4AF37]',
  Divino: 'bg-[#103330] text-[#8CF0E5] border-[#5EC2B7]',
};

interface CityScreenProps {
  onClaimContract: (id: string) => void;
  state: GameState;
  derived: DerivedStats;
  isOnlineMode?: boolean;
  onlinePlayerRank?: number;
  initialSubTab?: CitySubTab;
  onSubTabChange?: (tab: CitySubTab) => void;
  onTrainStat: (stat: PrimaryStatKey) => void;
  onBuyMarketItem: (marketItemId: string) => void;
  onSellInventoryItem: (inventoryItemId: string) => void;
  onApplyMedicalTreatment?: (treatmentId: string) => void;
  onBuyMedicineItem?: (templateId: string) => void;
  onUseMedicineItem?: (itemId: string) => void;
  onFightDungeonEncounter: (dungeonId: string) => void;
  onResetDungeonRun: (dungeonId: string) => void;
  onClaimReward: (claimId: string) => void;
  onInspectCombatReport: (report: CombatReport) => void;
  // Handlers de Guilda
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
}

export const CityScreen: React.FC<CityScreenProps> = ({
  onClaimContract,
  state,
  derived,
  isOnlineMode = false,
  onlinePlayerRank,
  initialSubTab = 'training',
  onSubTabChange,
  onTrainStat,
  onBuyMarketItem,
  onSellInventoryItem,
  onApplyMedicalTreatment,
  onBuyMedicineItem,
  onUseMedicineItem,
  onFightDungeonEncounter,
  onResetDungeonRun,
  onClaimReward,
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
}) => {
  const [subTab, setSubTab] = useState<CitySubTab>(initialSubTab);
  const [marketMode, setMarketMode] = useState<'buy' | 'sell'>('buy');
  const [equipmentFilter, setEquipmentFilter] = useState(EMPTY_EQUIPMENT_FILTER);
  const [marketFilter, setMarketFilter] = useState<'all' | 'equipment' | 'medicine' | 'high_rarity'>('all');
  const [selectedMarketItemId, setSelectedMarketItemId] = useState<string | null>(
    state.marketStock[0]?.id ?? null
  );
  const [selectedSellItemId, setSelectedSellItemId] = useState<string | null>(
    state.inventory[0]?.id ?? null
  );
  const [dungeonDifficultyFilter, setDungeonDifficultyFilter] = useState<
    'Todas' | DungeonDifficulty
  >('Todas');
  const [selectedDungeonId, setSelectedDungeonId] = useState<string>(DUNGEONS[0].id);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const selectSubTab = (next: CitySubTab) => {
    setSubTab(next);
    if (onSubTabChange) {
      onSubTabChange(next);
    }
  };

  const inventoryFull = state.inventory.length >= GAME_CONFIG.maxInventorySlots;
  const guildBonuses = getActiveGuildBonuses(state.guildState);
  const snap = getPlayerSnapshotForRankings(state);
  const playerRank =
    isOnlineMode && onlinePlayerRank
      ? onlinePlayerRank
      : computePlayerRankings(state.guildState, snap, 'honor').find((p) => p.isPlayer)
          ?.rank ?? '-';

  const filteredMarketStock = state.marketStock.filter((item) => {
    if (!matchesEquipmentFilter(item, equipmentFilter, state.level)) return false;
    if (marketFilter === 'medicine') return Boolean(item.consumable);
    if (marketFilter === 'equipment') return !item.consumable;
    if (marketFilter === 'high_rarity') {
      return (
        item.rarity === 'legendary' ||
        item.rarity === 'mythic' ||
        item.rarity === 'imperial' ||
        item.rarity === 'divine'
      );
    }
    return true;
  });

  const selectedBuyItem: GameItem | null =
    filteredMarketStock.find((i) => i.id === selectedMarketItemId) ??
    filteredMarketStock[0] ??
    null;

  const selectedSellItem: GameItem | null =
    state.inventory.find((i) => i.id === selectedSellItemId) ??
    state.inventory[0] ??
    null;

  const filteredDungeons =
    dungeonDifficultyFilter === 'Todas'
      ? DUNGEONS
      : DUNGEONS.filter((d) => (d.difficulty ?? 'Iniciante') === dungeonDifficultyFilter);

  const activeDungeon =
    filteredDungeons.find((d) => d.id === selectedDungeonId) ??
    filteredDungeons[0] ??
    DUNGEONS[0];

  const dungeonProg = state.dungeonProgress[activeDungeon.id] ?? {
    dungeonId: activeDungeon.id,
    currentEncounterIndex: 0,
    completedCount: 0,
  };
  const currentDungeonEnemy =
    activeDungeon.encounters[dungeonProg.currentEncounterIndex] ??
    activeDungeon.encounters[0];

  const medicineInBag = state.inventory.filter((i) => Boolean(i.consumable));
  const totalDungeonsCompleted = Object.values(state.dungeonProgress).reduce(
    (acc, p) => acc + (p?.completedCount ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      <button className="chronicle-banner" onClick={() => selectSubTab('chronicle')}>
        <span className="eyebrow">O SEU LEGADO COMEÇA AQUI</span>
        <strong>Contratos & Coleção</strong>
        <span>Objetivos, tesouros e novas fronteiras <span aria-hidden="true">↗</span></span>
      </button>
      {subTab === 'chronicle' && <ChronicleScreen state={state} onClaim={onClaimContract} />}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
        <button
          type="button"
          onClick={() => selectSubTab('training')}
          className={`min-h-[46px] px-2.5 py-2 font-roman font-bold text-xs sm:text-sm border-2 rounded-[2px] transition-colors cursor-pointer ${
            subTab === 'training'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527] hover:text-[#EFE2C4]'
          }`}
        >
          Treinamento
        </button>
        <button
          type="button"
          onClick={() => selectSubTab('market')}
          className={`min-h-[46px] px-2.5 py-2 font-roman font-bold text-xs sm:text-sm border-2 rounded-[2px] transition-colors cursor-pointer ${
            subTab === 'market'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527] hover:text-[#EFE2C4]'
          }`}
        >
          Mercado
        </button>
        <button
          type="button"
          onClick={() => selectSubTab('medicina')}
          className={`min-h-[46px] px-2.5 py-2 font-roman font-bold text-xs sm:text-sm border-2 rounded-[2px] transition-colors cursor-pointer ${
            subTab === 'medicina'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527] hover:text-[#EFE2C4]'
          }`}
        >
          Medicina
        </button>
        <button
          type="button"
          onClick={() => selectSubTab('dungeons')}
          className={`min-h-[46px] px-2.5 py-2 font-roman font-bold text-xs sm:text-sm border-2 rounded-[2px] transition-colors cursor-pointer ${
            subTab === 'dungeons'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527] hover:text-[#EFE2C4]'
          }`}
        >
          Masmorras ({DUNGEONS.length})
        </button>
        <button
          type="button"
          onClick={() => selectSubTab('guild')}
          className={`min-h-[46px] px-2.5 py-2 font-roman font-bold text-xs sm:text-sm border-2 rounded-[2px] transition-colors cursor-pointer ${
            subTab === 'guild'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527] hover:text-[#EFE2C4]'
          }`}
        >
          Guilda {guildBonuses.guildTag ? `[${guildBonuses.guildTag}]` : ''}
        </button>
        <button
          type="button"
          onClick={() => selectSubTab('rankings')}
          className={`min-h-[46px] px-2.5 py-2 font-roman font-bold text-xs sm:text-sm border-2 rounded-[2px] transition-colors cursor-pointer ${
            subTab === 'rankings'
              ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
              : 'bg-[#2B2119] text-[#D6C29A] border-[#5E4527] hover:text-[#EFE2C4]'
          }`}
        >
          Classificação (#{playerRank})
        </button>
      </div>

      {state.pendingRewards.length > 0 && (
        <div className="space-y-3">
          {state.pendingRewards.map((batch) => (
            <RewardPanel key={batch.claimId} batch={batch} onClaim={onClaimReward} />
          ))}
        </div>
      )}

      {subTab === 'training' && (
        <RomanPanel
          title="Campo de Treinamento do Doctore"
          subtitle={`Saldo disponível: ${state.gold} denários · ${
            guildBonuses.belongsToGuild
              ? `Desconto da Guilda [${guildBonuses.guildTag}]: -${guildBonuses.trainingDiscountPercent}% ativo`
              : 'Sem desconto de guilda (Junte-se a uma Guilda para descontos)'
          }`}
          variant="parchment"
        >
          <p className="text-xs sm:text-sm text-[#5C4935] mb-3 leading-relaxed">
            Aperfeiçoe sua disciplina física e tática sob o comando do Doctore. Cada treino eleva
            permanentemente o atributo base e atualiza suas estatísticas de combate imediatamente.
          </p>

          {guildBonuses.belongsToGuild && (
            <div className="mb-3 p-2.5 bg-[#253B23] border border-[#4B7A47] text-xs text-[#EFE2C4] flex flex-wrap items-center justify-between gap-2 tabular-nums">
              <span>
                <strong>Benefício do Campo de Treino ([{guildBonuses.guildTag}]):</strong> Todos
                os treinamentos exibem Preço Base, Desconto (-
                {guildBonuses.trainingDiscountPercent}%) e Preço Final.
              </span>
              <GameButton
                variant="iron"
                size="sm"
                onClick={() => selectSubTab('guild')}
              >
                Ver Sede
              </GameButton>
            </div>
          )}

          <div className="divide-y divide-[#947044]/50">
            {(Object.keys(PRIMARY_STAT_META) as PrimaryStatKey[]).map((statKey) => {
              const meta = PRIMARY_STAT_META[statKey];
              const baseVal = state.baseStats[statKey];
              const totalVal = derived[statKey];
              const pricing = getEffectiveTrainingCost(
                statKey,
                baseVal,
                state.guildState
              );
              const canAfford = state.gold >= pricing.finalCost;

              const descWithDiscount =
                pricing.discountPercent > 0
                  ? `${meta.description} · Preço Base: ${pricing.baseCost}g | Desconto Guilda (-${pricing.discountPercent}%): -${pricing.discountAmount}g | Final: ${pricing.finalCost}g`
                  : `${meta.description} · Preço Base: ${pricing.baseCost} Ouro`;

              return (
                <StatRow
                  key={statKey}
                  label={meta.label}
                  baseValue={baseVal}
                  totalValue={totalVal}
                  description={descWithDiscount}
                  onParchment
                  actionSlot={
                    <GameButton
                      variant="crimson"
                      size="sm"
                      onClick={() => onTrainStat(statKey)}
                      disabled={!canAfford}
                      disabledReason={
                        !canAfford
                          ? `Faltam ${pricing.finalCost - state.gold} Ouro`
                          : undefined
                      }
                    >
                      Treinar +1 ({pricing.finalCost} Ouro)
                    </GameButton>
                  }
                />
              );
            })}
          </div>
        </RomanPanel>
      )}

      {subTab === 'market' && (
        <div className="space-y-4">
          <RomanPanel
            title="Mercado de Armamentos e Raridades do Fórum"
            subtitle={`Saldo: ${state.gold} denários · Mochila: ${state.inventory.length}/${GAME_CONFIG.maxInventorySlots} · 8 Raridades (Comum a Divino)`}
            variant="stone"
          >
            <EquipmentFilters value={equipmentFilter} onChange={setEquipmentFilter} />
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#5E4527]">
              <div className="flex items-center gap-2">
                <GameButton
                  variant={marketMode === 'buy' ? 'crimson' : 'iron'}
                  size="sm"
                  onClick={() => setMarketMode('buy')}
                >
                  Comprar do Armeiro ({state.marketStock.length})
                </GameButton>
                <GameButton
                  variant={marketMode === 'sell' ? 'crimson' : 'iron'}
                  size="sm"
                  onClick={() => setMarketMode('sell')}
                >
                  Vender da Mochila ({state.inventory.length})
                </GameButton>
              </div>

              {marketMode === 'buy' && (
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'Todos' },
                      { id: 'equipment', label: 'Armas & Armaduras' },
                      { id: 'medicine', label: 'Medicina' },
                      { id: 'high_rarity', label: 'Lendário / Mítico / Imperial / Divino' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setMarketFilter(f.id)}
                      className={`min-h-[34px] px-2.5 py-1 text-xs font-roman font-bold border rounded-[2px] cursor-pointer ${
                        marketFilter === f.id
                          ? 'bg-[#6E512F] text-[#EFE2C4] border-[#D4B26A]'
                          : 'bg-[#17120F] text-[#B8A686] border-[#5E4527]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {marketMode === 'buy' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-7">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                    {filteredMarketStock.map((item) => (
                      <ItemSlot
                        key={item.id}
                        item={item}
                        slotType={item.slot}
                        badgeText={`${item.buyPrice}g`}
                        selected={selectedBuyItem?.id === item.id}
                        onClick={() => setSelectedMarketItemId(item.id)}
                      />
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-5">
                  {selectedBuyItem && (
                    <ItemTooltip
                      item={selectedBuyItem}
                      comparedEquippedItem={state.equipped[selectedBuyItem.slot] ?? null}
                      playerLevel={state.level}
                      playerGold={state.gold}
                      inventoryFull={inventoryFull}
                      mode="market_buy"
                      onBuy={() => onBuyMarketItem(selectedBuyItem.id)}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-7">
                  {state.inventory.length === 0 ? (
                    <p className="text-xs sm:text-sm text-[#B8A686] py-4">
                      Sua mochila está vazia. Não há itens para vender no momento.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                      {state.inventory.map((item) => (
                        <ItemSlot
                          key={item.id}
                          item={item}
                          slotType={item.slot}
                          badgeText={`+${item.sellPrice}g`}
                          selected={selectedSellItem?.id === item.id}
                          onClick={() => setSelectedSellItemId(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="lg:col-span-5">
                  {selectedSellItem && (
                    <ItemTooltip
                      item={selectedSellItem}
                      comparedEquippedItem={state.equipped[selectedSellItem.slot] ?? null}
                      playerLevel={state.level}
                      playerGold={state.gold}
                      inventoryFull={inventoryFull}
                      mode="inventory"
                      onUseMedicine={
                        onUseMedicineItem
                          ? () => onUseMedicineItem(selectedSellItem.id)
                          : undefined
                      }
                      onSell={() => onSellInventoryItem(selectedSellItem.id)}
                    />
                  )}
                </div>
              </div>
            )}
          </RomanPanel>
        </div>
      )}

      {subTab === 'medicina' && (
        <div className="space-y-4">
          <RomanPanel
            title="Valetudinarium — Medicina Romana e Cirurgia Militar"
            subtitle={`Vitalidade: ${state.currentHp}/${derived.maxHp} PV · Energia: ${state.energy}/${state.maxEnergy} · Saldo: ${state.gold} Ouro`}
            variant="stone"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-[#17120F] p-3 border border-[#947044]">
              <ProgressBar
                label="Pontos de Vida (Vitalidade)"
                current={state.currentHp}
                max={derived.maxHp}
                variant="health"
                suffix=" PV"
              />
              <ProgressBar
                label="Vigor de Campanha (Energia)"
                current={state.energy}
                max={state.maxEnergy}
                variant="energy"
                suffix=" Energia"
              />
            </div>

            {medicineInBag.length > 0 && (
              <div className="mb-4 p-3 bg-[#23381F]/80 border border-[#4E7A45] rounded-[2px]">
                <div className="font-roman font-bold text-xs uppercase tracking-wider text-[#88B87E] mb-2">
                  Suprimentos Médicos Prontos na Sua Mochila ({medicineInBag.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {medicineInBag.map((med) => (
                    <div
                      key={med.id}
                      className="flex items-center justify-between gap-2 bg-[#17120F] border border-[#5E4527] p-2 rounded-[2px] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <ItemArtwork iconId={med.iconId} size={32} />
                        <div>
                          <div className="font-bold text-[#EFE2C4]">{med.name}</div>
                          <div className="text-[10px] text-[#88B87E]">
                            +{med.consumable?.healHp ?? 0} PV
                            {(med.consumable?.restoreEnergy ?? 0) > 0
                              ? ` · +${med.consumable?.restoreEnergy} Energia`
                              : ''}
                          </div>
                        </div>
                      </div>
                      {onUseMedicineItem && (
                        <GameButton
                          variant="crimson"
                          size="sm"
                          onClick={() => onUseMedicineItem(med.id)}
                          disabled={state.level < med.levelReq}
                          disabledReason={
                            state.level < med.levelReq
                              ? `Requer Nv.${med.levelReq}`
                              : undefined
                          }
                        >
                          Usar Agora
                        </GameButton>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="font-roman font-bold text-xs sm:text-sm uppercase tracking-wider text-[#D4B26A] mb-2">
              1. Tratamentos Clínicos Imediatos do Medicus
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MEDICAL_TREATMENTS.map((trt) => {
                const cost = getMedicalTreatmentCost(trt, state.level);
                const healAmount = Math.ceil((derived.maxHp * trt.healPercent) / 100);
                const meetsLevel = state.level >= trt.minLevel;
                const canAfford = state.gold >= cost;
                const alreadyFull =
                  state.currentHp >= derived.maxHp &&
                  (trt.restoreEnergy <= 0 || state.energy >= state.maxEnergy);

                return (
                  <div
                    key={trt.id}
                    className="surface-wood frame-bronze p-3 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <ItemArtwork iconId={trt.iconId} size={48} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold text-[#88B87E]">
                            Requisito: Nível {trt.minLevel}
                          </span>
                          <span className="text-xs font-bold tabular-nums text-[#D4B26A]">
                            Custo: {cost} Ouro
                          </span>
                        </div>
                        <h4 className="font-roman font-bold text-sm sm:text-base text-[#EFE2C4] mt-0.5">
                          {trt.name}
                        </h4>
                        <p className="text-xs text-[#D6C29A] mt-0.5">{trt.description}</p>
                        <div className="mt-2 inline-flex flex-wrap items-center gap-2 px-2 py-1 bg-[#17120F] border border-[#5E4527] text-xs font-bold text-[#88B87E] tabular-nums">
                          <span>
                            Restaura +{healAmount} PV ({trt.healPercent}%)
                          </span>
                          {trt.restoreEnergy > 0 && (
                            <span>· +{trt.restoreEnergy} Energia</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <GameButton
                        variant="crimson"
                        size="sm"
                        onClick={() =>
                          onApplyMedicalTreatment && onApplyMedicalTreatment(trt.id)
                        }
                        disabled={!meetsLevel || !canAfford || alreadyFull}
                        disabledReason={
                          !meetsLevel
                            ? `Requer Nível ${trt.minLevel}`
                            : alreadyFull
                            ? 'Vitalidade/Energia já estão no máximo'
                            : !canAfford
                            ? `Faltam ${cost - state.gold} Ouro`
                            : undefined
                        }
                      >
                        Receber Tratamento ({cost} Ouro)
                      </GameButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </RomanPanel>

          <RomanPanel
            title="2. Farmácia Militar de Galeno — Suprimentos Médicos para Levar"
            subtitle="Adquira bandagens, unguentos, vinhos medicinais e panaceias para usar entre combates nas Masmorras"
            variant="parchment"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(MEDICINE_ITEM_TEMPLATES).map((tpl) => {
                const rarity = DESIGN_TOKENS.colors.rarity[tpl.rarity];
                const canAfford = state.gold >= tpl.buyPrice;
                const ownedCount = state.inventory.filter(
                  (i) => i.templateId === tpl.templateId
                ).length;

                return (
                  <div
                    key={tpl.templateId}
                    className="bg-[#C2AB7E]/55 border-2 p-3 flex flex-col justify-between gap-2.5"
                    style={{ borderColor: rarity.border }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-14 h-14 shrink-0 surface-leather border-2 flex items-center justify-center"
                        style={{ borderColor: rarity.border }}
                      >
                        <ItemArtwork iconId={tpl.iconId} size={42} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="text-[11px] font-bold uppercase tracking-wider"
                            style={{ color: rarity.textOnParchment }}
                          >
                            {rarity.label} · Nível {tpl.levelReq}
                          </span>
                          <span className="text-xs font-bold tabular-nums text-[#30251A]">
                            Na bolsa: {ownedCount}
                          </span>
                        </div>
                        <h4 className="font-roman font-bold text-sm text-[#30251A]">
                          {tpl.name}
                        </h4>
                        <p className="text-xs text-[#5C4935] mt-0.5 leading-snug">
                          {tpl.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#947044]/40">
                      <span className="text-xs font-bold text-[#295221] tabular-nums">
                        +{tpl.consumable?.healHp ?? 0} PV
                        {(tpl.consumable?.restoreEnergy ?? 0) > 0
                          ? ` / +${tpl.consumable?.restoreEnergy} Energia`
                          : ''}
                      </span>
                      <GameButton
                        variant="crimson"
                        size="sm"
                        onClick={() =>
                          onBuyMedicineItem && onBuyMedicineItem(tpl.templateId)
                        }
                        disabled={!canAfford || inventoryFull}
                        disabledReason={
                          inventoryFull
                            ? 'Mochila cheia (20/20)'
                            : !canAfford
                            ? `Faltam ${tpl.buyPrice - state.gold} Ouro`
                            : undefined
                        }
                      >
                        Comprar ({tpl.buyPrice} Ouro)
                      </GameButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </RomanPanel>
        </div>
      )}

      {subTab === 'dungeons' && (
        <div className="space-y-4">
          {/* Painel de Filtro de Dificuldades e Seleção das 32 Masmorras */}
          <RomanPanel
            title={`Atlas de Masmorras e Catacumbas (${DUNGEONS.length} Masmorras)`}
            subtitle={`7 Graus de Dificuldade (Iniciante a Divino) · Total de incursões concluídas: ${totalDungeonsCompleted}`}
            variant="stone"
          >
            <div className="flex flex-wrap gap-1.5 mb-3 pb-2.5 border-b border-[#5E4527]">
              {DUNGEON_DIFFICULTIES.map((diff) => {
                const count =
                  diff === 'Todas'
                    ? DUNGEONS.length
                    : DUNGEONS.filter((d) => (d.difficulty ?? 'Iniciante') === diff).length;
                const isSelected = dungeonDifficultyFilter === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => {
                      setDungeonDifficultyFilter(diff);
                      const firstMatch =
                        diff === 'Todas'
                          ? DUNGEONS[0]
                          : DUNGEONS.find((d) => (d.difficulty ?? 'Iniciante') === diff);
                      if (firstMatch) {
                        setSelectedDungeonId(firstMatch.id);
                      }
                    }}
                    className={`min-h-[36px] px-2.5 py-1 text-xs font-roman font-bold border rounded-[2px] cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
                        : 'bg-[#17120F] text-[#D6C29A] border-[#5E4527] hover:text-[#EFE2C4]'
                    }`}
                  >
                    {diff} ({count})
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
              {filteredDungeons.map((dng, idx) => {
                const diff: DungeonDifficulty = dng.difficulty ?? 'Iniciante';
                const prog = state.dungeonProgress[dng.id];
                const completed = prog?.completedCount ?? 0;
                const encIdx = prog?.currentEncounterIndex ?? 0;
                const isSelected = activeDungeon.id === dng.id;
                const lockedByLevel = state.level < dng.minLevel;

                return (
                  <button
                    key={dng.id}
                    type="button"
                    onClick={() => setSelectedDungeonId(dng.id)}
                    className={`text-left p-2.5 border-2 rounded-[2px] transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#36281E] border-[#D4B26A] text-[#EFE2C4] shadow-md'
                        : 'bg-[#1D1510] border-[#5E4527] text-[#D6C29A] hover:border-[#947044]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-roman font-bold uppercase px-1.5 py-0.5 border ${DIFFICULTY_BADGE_STYLES[diff]}`}
                      >
                        {diff}
                      </span>
                      <span
                        className={`text-[11px] font-bold tabular-nums ${
                          lockedByLevel ? 'text-[#C4514E]' : 'text-[#D4B26A]'
                        }`}
                      >
                        Nv.{dng.minLevel} · {dng.energyCost} Energia
                      </span>
                    </div>
                    <div className="font-roman font-bold text-xs sm:text-sm text-[#EFE2C4] mt-1 truncate">
                      {idx + 1}. {dng.name}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#B8A686] mt-1 tabular-nums">
                      <span>
                        Encontro {encIdx + 1}/{dng.encounters.length}
                      </span>
                      <span className={completed > 0 ? 'text-[#88B87E] font-bold' : ''}>
                        {completed > 0 ? `✓ ${completed}x vencida` : 'Não concluída'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </RomanPanel>

          {/* Detalhes e Combate da Masmorra Selecionada */}
          <RomanPanel
            title={`${activeDungeon.name} [${activeDungeon.difficulty ?? 'Iniciante'}]`}
            subtitle={`${activeDungeon.subtitle} · Nível Mínimo: ${activeDungeon.minLevel} · Concluída ${dungeonProg.completedCount} vez(es)`}
            variant="wood"
          >
            <p className="text-xs sm:text-sm text-[#D6C29A] mb-3 leading-relaxed">
              {activeDungeon.description}
            </p>

            <ProgressBar
              label={`Progresso da Incursão: Encontro ${
                dungeonProg.currentEncounterIndex + 1
              } de ${activeDungeon.encounters.length}`}
              current={dungeonProg.currentEncounterIndex + 1}
              max={activeDungeon.encounters.length}
              variant="xp"
            />

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {activeDungeon.encounters.map((enc, idx) => {
                const isDone = idx < dungeonProg.currentEncounterIndex;
                const isCurrent = idx === dungeonProg.currentEncounterIndex;
                return (
                  <div
                    key={enc.id}
                    className={`p-2 border rounded-[2px] text-xs ${
                      isCurrent
                        ? 'bg-[#36281E] border-[#D4B26A] text-[#EFE2C4]'
                        : isDone
                        ? 'bg-[#1E2E1C] border-[#4B7A47] text-[#88B87E]'
                        : 'bg-[#17120F] border-[#5E4527] text-[#B8A686]'
                    }`}
                  >
                    <div className="font-bold leading-tight">
                      {idx + 1}. {enc.name}
                    </div>
                    <div className="text-[10px] mt-0.5">
                      Nv.{enc.level} ·{' '}
                      {isDone ? 'Derrotado' : isCurrent ? 'Encontro Atual' : 'Bloqueado'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <EnemyCard
                enemy={currentDungeonEnemy}
                playerStats={derived}
                energyCost={activeDungeon.energyCost}
                actionLabel={
                  dungeonProg.currentEncounterIndex === activeDungeon.encounters.length - 1
                    ? 'Enfrentar Chefe da Masmorra'
                    : `Enfrentar Guardião (${dungeonProg.currentEncounterIndex + 1}/${
                        activeDungeon.encounters.length
                      })`
                }
                onAction={() => onFightDungeonEncounter(activeDungeon.id)}
                disabled={
                  state.level < activeDungeon.minLevel ||
                  state.energy < activeDungeon.energyCost
                }
                disabledReason={
                  state.level < activeDungeon.minLevel
                    ? `Requer Nível ${activeDungeon.minLevel} (Você: Nv.${state.level})`
                    : state.energy < activeDungeon.energyCost
                    ? `Sem Energia suficiente (${state.energy}/${activeDungeon.energyCost})`
                    : undefined
                }
                secondaryActionLabel={
                  dungeonProg.currentEncounterIndex > 0 ? 'Reiniciar Masmorra' : undefined
                }
                onSecondaryAction={
                  dungeonProg.currentEncounterIndex > 0
                    ? () => onResetDungeonRun(activeDungeon.id)
                    : undefined
                }
              />
            </div>

            <div className="mt-3 p-3 bg-[#17120F]/90 border border-[#947044] text-xs text-[#D6C29A] space-y-2">
              <div>
                <strong>Recompensa Final ao Vencer o Chefe:</strong> +
                {activeDungeon.completionBonusGold} Denários Bônus, +
                {activeDungeon.completionBonusXp} XP Bônus e 1 Relíquia ou Medicina Garantida do
                Cofre abaixo:
              </div>
              <div className="flex flex-wrap gap-2">
                {activeDungeon.guaranteedDropPool.map((tplId) => {
                  const tpl = ITEM_TEMPLATES[tplId];
                  if (!tpl) return null;
                  const rInfo = DESIGN_TOKENS.colors.rarity[tpl.rarity];
                  return (
                    <div
                      key={tplId}
                      className="flex items-center gap-2 bg-[#211711] p-1.5 border rounded-[2px]"
                      style={{ borderColor: rInfo.border }}
                    >
                      <ItemArtwork iconId={tpl.iconId} size={28} />
                      <div>
                        <div
                          className="font-bold text-[11px]"
                          style={{ color: rInfo.textOnDark }}
                        >
                          {tpl.name}
                        </div>
                        <div className="text-[10px] text-[#B8A686]">
                          {rInfo.label} · Nv.{tpl.levelReq}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </RomanPanel>
        </div>
      )}

      {subTab === 'guild' && (
        <GuildScreen
          state={state}
          derived={derived}
          isOnlineMode={isOnlineMode}
          onCreateGuild={onCreateGuild}
          onApplyOrJoinGuild={onApplyOrJoinGuild}
          onCancelApplication={onCancelApplication}
          onSimulateCouncilDecision={onSimulateCouncilDecision}
          onReviewApplication={onReviewApplication}
          onAddSimulatedApplicant={onAddSimulatedApplicant}
          onLeaveGuild={onLeaveGuild}
          onTransferLeadership={onTransferLeadership}
          onDissolveGuild={onDissolveGuild}
          onChangeMemberRole={onChangeMemberRole}
          onKickMember={onKickMember}
          onUpdateProfile={onUpdateProfile}
          onPostAnnouncement={onPostAnnouncement}
          onDonateGold={onDonateGold}
          onUpgradeBuilding={onUpgradeBuilding}
          onUseVillaMedici={onUseVillaMedici}
          onActivateLibraryScroll={onActivateLibraryScroll}
          onDepositWarehouseItem={onDepositWarehouseItem}
          onWithdrawWarehouseItem={onWithdrawWarehouseItem}
          onBuyInternalMarketItem={onBuyInternalMarketItem}
          onSetLocalTestRole={onSetLocalTestRole}
          onOpenRankings={() => selectSubTab('rankings')}
        />
      )}

      {subTab === 'rankings' && (
        <RankingScreen
          state={state}
          isOnlineMode={isOnlineMode}
          onOpenGuildTab={() => selectSubTab('guild')}
          onApplyOrJoinGuild={onApplyOrJoinGuild}
          onCancelApplication={onCancelApplication}
        />
      )}
    </div>
  );
};
