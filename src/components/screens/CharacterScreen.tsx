import React, { useEffect, useState } from 'react';
import { GladiatorAvatar } from '../../design/GladiatorAvatar';
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
  getInventoryCapacity,
  getPlayerSnapshotForRankings,
  NextObjectiveInfo,
  StatChangeNotification,
} from '../../game/rules';
import { HERO_ARCHETYPES, HERO_ENERGIES, HERO_MASKS, HERO_PALETTES, type HeroAppearance } from '../../game/heroCustomization';
import { createLayoutPreset, DEFAULT_LAYOUT_PREFERENCES, normalizeLayoutPreferences, type LayoutCardId, type LayoutPreferences, type LayoutPreset } from '../../game/layoutPreferences';
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
  competitiveTitle?: string;
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
  onSaveHeroAppearance?: (appearance: HeroAppearance) => void;
}

export const CharacterScreen: React.FC<CharacterScreenProps> = ({
  state,
  derived,
  competitiveTitle,
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
  onSaveHeroAppearance,
}) => {
  const [selectedItem, setSelectedItem] = useState<{
    item: GameItem;
    source: 'equipped' | 'inventory';
  } | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [draftAppearance, setDraftAppearance] = useState<HeroAppearance>(state.heroAppearance);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [layout, setLayout] = useState<LayoutPreferences>(() => {
    try { return normalizeLayoutPreferences(JSON.parse(localStorage.getItem('vigilia_layout_v1') ?? 'null')); }
    catch { return createLayoutPreset('classic'); }
  });
  useEffect(() => { try { localStorage.setItem('vigilia_layout_v1', JSON.stringify(layout)); } catch { /* preferências são opcionais */ } }, [layout]);
  useEffect(() => { setDraftAppearance(state.heroAppearance); }, [state.heroAppearance]);

  const xpForNext = getXpForNextLevel(state.level);
  const needsHealing = state.currentHp < derived.maxHp;
  const healCost = Math.max(5, Math.ceil((derived.maxHp - state.currentHp) * 0.25));
  const inventoryCapacity = getInventoryCapacity(state);
  const inventoryFull = state.inventory.length >= inventoryCapacity;

  const guildBonuses = getActiveGuildBonuses(state.guildState);
  const snap = getPlayerSnapshotForRankings(state);
  const playerRankEntry = computePlayerRankings(state.guildState, snap, 'honor').find(
    (p) => p.isPlayer
  );
  const displayNameWithTag = guildBonuses.guildTag
    ? `[${guildBonuses.guildTag}] ${state.name}`
    : state.name;
  const setLayoutPreset = (preset: LayoutPreset) => setLayout(createLayoutPreset(preset));
  const moveLayoutCard = (card: LayoutCardId, delta: -1 | 1) => setLayout(current => {
    const order = [...current.order];
    const index = order.indexOf(card);
    const next = Math.max(0, Math.min(order.length - 1, index + delta));
    [order[index], order[next]] = [order[next], order[index]];
    return { ...current, order };
  });
  const updateAppearance = (key: keyof HeroAppearance, value: string) => {
    setDraftAppearance(current => ({ ...current, [key]: value } as HeroAppearance));
  };
  const layoutOrder = (card: LayoutCardId) => layout.order.indexOf(card);

  const leftSlots: EquipmentSlotType[] = ['helmet', 'weapon', 'armor', 'gloves'];
  const rightSlots: EquipmentSlotType[] = ['amulet', 'shield', 'boots', 'ring'];

  return (
    <div className={`character-screen character-layout-grid grid grid-cols-1 lg:grid-cols-12 gap-4 ${layout.preset === 'compact' ? 'is-compact' : ''} ${layout.preset === 'immersive' ? 'is-immersive' : ''}`}>
      <div className="lg:col-span-12 flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <GameButton variant={studioOpen ? 'bronze' : 'iron'} size="sm" onClick={() => setStudioOpen(value => !value)} aria-expanded={studioOpen}>
            {studioOpen ? 'Fechar Estúdio do Herói' : 'Personalizar Herói'}
          </GameButton>
          <GameButton variant={layoutOpen ? 'bronze' : 'iron'} size="sm" onClick={() => setLayoutOpen(value => !value)} aria-expanded={layoutOpen}>
            {layoutOpen ? 'Fechar Layout' : 'Personalizar Layout'}
          </GameButton>
        </div>
        {studioOpen && <span className="text-xs text-slate-300">Aparência cosmética · seus atributos e equipamentos continuam intactos</span>}
      </div>

      {studioOpen && <section className="hero-studio-panel lg:col-span-12" aria-label="Estúdio do herói">
        <div><h2 className="font-semibold text-slate-100">Estúdio do Herói</h2><p className="text-xs text-slate-400">Escolha identidade, máscara, cores e energia. A armadura exibida continua ligada aos itens equipados.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <label className="hero-studio-field">Identidade
            <select value={draftAppearance.archetype} onChange={event => updateAppearance('archetype', event.target.value)}>{HERO_ARCHETYPES.map((value, index) => <option key={value} value={value}>{['Sentinela', 'Tecelã', 'Vanguarda', 'Oráculo'][index]}</option>)}</select>
          </label>
          <label className="hero-studio-field">Paleta do traje
            <select value={draftAppearance.palette} onChange={event => updateAppearance('palette', event.target.value)}>{HERO_PALETTES.map((value, index) => <option key={value} value={value}>{['Ciano', 'Violeta', 'Âmbar', 'Carmesim', 'Jade'][index]}</option>)}</select>
          </label>
          <label className="hero-studio-field">Máscara
            <select value={draftAppearance.mask} onChange={event => updateAppearance('mask', event.target.value)}>{HERO_MASKS.map((value, index) => <option key={value} value={value}>{['Sem máscara', 'Meia máscara', 'Visor'][index]}</option>)}</select>
          </label>
          <label className="hero-studio-field">Energia
            <select value={draftAppearance.energy} onChange={event => updateAppearance('energy', event.target.value)}>{HERO_ENERGIES.map((value, index) => <option key={value} value={value}>{['Ciano', 'Violeta', 'Âmbar', 'Carmesim', 'Jade'][index]}</option>)}</select>
          </label>
        </div>
        <div className="flex justify-end mt-3"><GameButton variant="bronze" size="sm" onClick={() => onSaveHeroAppearance?.(draftAppearance)} disabled={JSON.stringify(draftAppearance) === JSON.stringify(state.heroAppearance)} disabledReason="A aparência já está salva">Salvar aparência</GameButton></div>
      </section>}

      {layoutOpen && <section className="hero-studio-panel layout-customizer lg:col-span-12" aria-label="Personalizador de layout">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-100">Organize sua central</h2><p className="text-xs text-slate-400">Mova os cartões e oculte os painéis informativos que não usa. As abas principais continuam fixas.</p></div>
          <button type="button" className="layout-reset-button" onClick={() => setLayout({ ...DEFAULT_LAYOUT_PREFERENCES, order: [...DEFAULT_LAYOUT_PREFERENCES.order], hiddenCards: [] })}>Restaurar padrão</button></div>
        <div className="flex flex-wrap gap-2 mt-3">{(['classic', 'compact', 'immersive'] as LayoutPreset[]).map((preset, index) => <button key={preset} type="button" className={`layout-preset ${layout.preset === preset ? 'active' : ''}`} aria-pressed={layout.preset === preset} onClick={() => setLayoutPreset(preset)}>{['Clássico', 'Compacto', 'Imersivo'][index]}</button>)}</div>
        <div className="grid sm:grid-cols-3 gap-2 mt-3">{layout.order.map((card, index) => <div className="layout-card-control" key={card}><span>{({ objective: 'Objetivo', avatar: 'Herói e mochila', stats: 'Atributos' } as const)[card]}</span><div className="flex gap-1"><button type="button" aria-label={`Mover ${card} para cima`} disabled={index === 0} onClick={() => moveLayoutCard(card, -1)}>↑</button><button type="button" aria-label={`Mover ${card} para baixo`} disabled={index === layout.order.length - 1} onClick={() => moveLayoutCard(card, 1)}>↓</button><button type="button" aria-pressed={layout.hiddenCards.includes(card)} onClick={() => setLayout(current => ({ ...current, hiddenCards: current.hiddenCards.includes(card) ? current.hiddenCards.filter(id => id !== card) : [...current.hiddenCards, card] }))}>{layout.hiddenCards.includes(card) ? 'Mostrar' : 'Ocultar'}</button></div></div>)}</div>
      </section>}

      {/* Próximo Objetivo de Progressão */}
      {!layout.hiddenCards.includes('objective') && <div className="lg:col-span-12 layout-card-objective" style={{ order: layoutOrder('objective') + 2 }}><NextObjectiveBanner
        objective={nextObjective}
        onNavigate={() => onNavigateTab(nextObjective.targetTab)}
      /></div>}

      <div className={`contents layout-card-avatar ${layout.hiddenCards.includes('avatar') ? 'hidden' : ''}`} style={{ order: layoutOrder('avatar') + 2 }}>
        {/* Coluna Esquerda: Retrato Clássico + Paper Doll de Equipamentos */}
        <div className="lg:col-span-6 space-y-4" style={{ order: layoutOrder('avatar') + 2 }}>
          <RomanPanel
            title={`${displayNameWithTag} — Nível ${state.level}`}
            subtitle={`${competitiveTitle ?? state.title} · Vitórias: ${state.wins} · Derrotas: ${state.losses}`}
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
                    title="Abrir Classificação Geral de Heróis"
                  >
                    Classificação #{playerRankEntry?.rank ?? '-'}
                  </GameButton>
                )}
              </div>
            }
          >
            <div className="arsenal-equipment grid grid-cols-[64px_1fr_64px] gap-2 sm:gap-3 items-center">
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

              {/* Retrato Central do Herói */}
              <div className="flex flex-col items-center">
                <div className="gladiator-stage dynamic-gladiator-stage relative w-full frame-bronze overflow-hidden shadow-xl">
                  <GladiatorAvatar equipped={state.equipped} level={state.level} name={displayNameWithTag} appearance={draftAppearance} />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-2 text-center">
                    <span className="font-roman font-bold text-xs sm:text-sm text-[#EFE2C4] block truncate">
                      {displayNameWithTag}
                    </span>
                    <button
                      type="button"
                      onClick={onOpenRankingScreen}
                      className="text-[11px] text-[#D4B26A] font-semibold hover:underline cursor-pointer"
                    >
                      Reputação: {state.honor} (Posição #{playerRankEntry?.rank ?? '-'})
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
                      state.gold < healCost ? `Requer ${healCost} Créditos` : undefined
                    }
                  >
                    Curar no Médico ({healCost} Créditos)
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
            title={`Alforje Rápido (${state.inventory.length}/${inventoryCapacity} espaços)`}
            subtitle="Toque em um equipamento para comparar com o espaço atual e equipar"
            variant="wood"
          >
            {state.inventory.length === 0 ? (
              <p className="text-xs text-[#B8A686] py-2">
                Sua bolsa está vazia. Conquiste espólios nas Operações ou visite o Mercado na Agência.
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
        <div className={`lg:col-span-6 space-y-4 layout-card-stats ${layout.hiddenCards.includes('stats') ? 'hidden' : ''}`} style={{ order: layoutOrder('stats') + 2 }}>
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
            title="Atributos do Herói"
            subtitle="Atributos atualizados com seus treinos e equipamentos."
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
            title="Atributos de combate"
            subtitle="Fórmulas explícitas aplicadas nas Operações, Arena e Masmorras"
            variant="stone"
          >
            <div className="divide-y divide-[#5E4527]/50">
              <StatRow
                label="Dano de Ataque"
                totalValue={`${derived.damageMin} - ${derived.damageMax}`}
                description={
                  derived.tempDamageBonusPercent > 0
                    ? `Dano base + Força + Pergaminho Temporário da Aliança (+${derived.tempDamageBonusPercent}%).`
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
                    ? `Base 12 PV/min + ${guildBonuses.bathhouseHpRegenBonusPerMinute} PV/min do Balneário da Aliança.`
                    : 'Regeneração natural em repouso e patrulha (expansível no Balneário da Aliança).'
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

