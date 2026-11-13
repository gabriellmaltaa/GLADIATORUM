import React, { useEffect, useState } from 'react';
import { DESIGN_TOKENS } from '../../design/tokens';
import {
  ArtworkImage,
  EnemyPortrait,
  IMAGE_ASSETS,
  ItemArtwork,
} from '../../design/assets';
import {
  EnemyDefinition,
  EQUIPMENT_SLOT_LABELS,
  EquipmentSlotType,
  GameItem,
  IDLE_FOCUS_DEFINITIONS,
  PRIMARY_STAT_META,
  PrimaryStatKey,
} from '../../game/config';
import {
  CombatReport,
  DerivedStats,
  NextObjectiveInfo,
  PendingRewardBatch,
} from '../../game/rules';

export type MainTabId = 'character' | 'expeditions' | 'arena' | 'inventory' | 'city';

/**
 * 1. ProgressBar — Barras de Vida, Experiência, Energia e Ciclo Idle
 */
export interface ProgressBarProps {
  label: string;
  current: number;
  max: number;
  variant: 'health' | 'xp' | 'energy' | 'timer';
  compact?: boolean;
  suffix?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  current,
  max,
  variant,
  compact = false,
  suffix = '',
}) => {
  const safeMax = Math.max(1, max);
  const ratio = Math.max(0, Math.min(1, current / safeMax));
  const percent = Math.round(ratio * 100);

  const fillStyles: Record<ProgressBarProps['variant'], string> = {
    health: 'bg-gradient-to-r from-[#6A1D1B] via-[#8F2D2A] to-[#A83834]',
    xp: 'bg-gradient-to-r from-[#7D612E] via-[#B79552] to-[#D4B26A]',
    energy: 'bg-gradient-to-r from-[#2D4F2B] via-[#4B7A47] to-[#63965E]',
    timer: 'bg-gradient-to-r from-[#5E4527] via-[#947044] to-[#B79552]',
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[11px] leading-tight mb-1">
        <span className="font-semibold tracking-wide text-[#D6C29A] truncate">{label}</span>
        <span className="tabular-nums font-semibold text-[#EFE2C4] shrink-0 ml-1">
          {Math.round(current)}/{Math.round(max)}
          {suffix}
        </span>
      </div>
      <div
        className={`relative w-full overflow-hidden bg-[#140F0C] border border-[#5E4527] ${
          compact ? 'h-2' : 'h-3'
        }`}
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(current)}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
      >
        <div
          className={`h-full transition-transform duration-150 origin-left ${fillStyles[variant]}`}
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>
    </div>
  );
};

/**
 * 2. RomanPanel — Painéis em Pedra Escura, Madeira ou Pergaminho Envelhecido
 */
export interface RomanPanelProps {
  title?: string;
  subtitle?: string;
  variant?: 'stone' | 'parchment' | 'wood';
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const RomanPanel: React.FC<RomanPanelProps> = ({
  title,
  subtitle,
  variant = 'stone',
  headerAction,
  children,
  className = '',
}) => {
  const surfaceClass =
    variant === 'parchment'
      ? 'surface-parchment frame-parchment text-[#30251A]'
      : variant === 'wood'
      ? 'surface-wood frame-bronze text-[#EFE2C4]'
      : 'surface-stone frame-bronze text-[#EFE2C4]';

  const headerBg =
    variant === 'parchment'
      ? 'bg-[#30251A] text-[#EFE2C4] border-b-2 border-[#947044]'
      : 'bg-[#1D1510] text-[#D6C29A] border-b border-[#5E4527]';

  return (
    <section className={`roman-panel relative rounded-[2px] overflow-hidden ${surfaceClass} ${className}`}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#B79552]/70"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#B79552]/70"
      />
      {title && (
        <header className={`px-3 py-2 flex items-center justify-between gap-2 ${headerBg}`}>
          <div className="min-w-0 flex-1">
            <h2 className="font-roman text-xs sm:text-base font-bold tracking-wide leading-snug text-[#EFE2C4]">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-[#B8A686] leading-snug mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </header>
      )}
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
};

/**
 * 3. GameButton — Botões Romanos Chanfrados em Carmesim, Bronze ou Ferro
 */
export interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'crimson' | 'bronze' | 'iron' | 'parchment';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabledReason?: string;
}

export const GameButton: React.FC<GameButtonProps> = ({
  variant = 'bronze',
  size = 'md',
  fullWidth = false,
  disabledReason,
  disabled,
  children,
  className = '',
  ...rest
}) => {
  const variantClasses: Record<NonNullable<GameButtonProps['variant']>, string> = {
    crimson:
      'bg-gradient-to-b from-[#8E332F] to-[#611F1C] text-[#EFE2C4] border-[#B79552] hover:from-[#9E3A36] hover:to-[#6E2421] active:translate-y-[1px]',
    bronze:
      'bg-gradient-to-b from-[#6E512F] to-[#46321C] text-[#EFE2C4] border-[#947044] hover:from-[#7E5D37] hover:to-[#543C22] active:translate-y-[1px]',
    iron:
      'bg-gradient-to-b from-[#3E3732] to-[#26211E] text-[#D6C29A] border-[#6E6256] hover:from-[#4A423C] hover:to-[#302A26] active:translate-y-[1px]',
    parchment:
      'bg-[#30251A] text-[#EFE2C4] border-[#947044] hover:bg-[#3F3123] active:translate-y-[1px]',
  };

  const sizeClasses: Record<NonNullable<GameButtonProps['size']>, string> = {
    sm: 'min-h-[44px] px-3 py-1.5 text-xs',
    md: 'min-h-[44px] px-4 py-2 text-xs sm:text-sm',
    lg: 'min-h-[48px] px-5 py-2.5 text-sm sm:text-base',
  };

  return (
    <div className={fullWidth ? 'w-full' : 'inline-flex flex-col'}>
      <button
        type="button"
        disabled={disabled}
        title={disabled && disabledReason ? disabledReason : rest.title}
        className={`min-w-[44px] border-2 rounded-[2px] font-roman font-bold tracking-wider transition-transform duration-100 flex items-center justify-center gap-2 select-none whitespace-nowrap shadow-sm focus-visible:outline-2 focus-visible:outline-[#D4B26A] ${
          sizeClasses[size]
        } ${
          disabled
            ? 'bg-[#241D18] text-[#7A6C5D] border-[#4A3F35] cursor-not-allowed opacity-75'
            : `${variantClasses[variant]} cursor-pointer`
        } ${fullWidth ? 'w-full' : ''} ${className}`}
        {...rest}
      >
        {children}
      </button>
      {disabled && disabledReason && (
        <span className="mt-1 text-[11px] leading-tight text-[#C4514E] font-medium">
          {disabledReason}
        </span>
      )}
    </div>
  );
};

/**
 * 4. StatRow — Linha Tabular de Atributos com Sinais Explícitos (não depende só de cor)
 */
export interface StatRowProps {
  label: string;
  baseValue?: number;
  totalValue: number | string;
  delta?: number;
  description?: string;
  onParchment?: boolean;
  actionSlot?: React.ReactNode;
}

export const StatRow: React.FC<StatRowProps> = ({
  label,
  baseValue,
  totalValue,
  delta,
  description,
  onParchment = false,
  actionSlot,
}) => {
  const borderClass = onParchment ? 'border-[#947044]/40' : 'border-[#5E4527]/50';
  const labelColor = onParchment ? 'text-[#30251A]' : 'text-[#EFE2C4]';
  const mutedColor = onParchment ? 'text-[#5C4935]' : 'text-[#B8A686]';

  const bonusFromGear =
    typeof baseValue === 'number' && typeof totalValue === 'number'
      ? totalValue - baseValue
      : 0;

  return (
    <div className={`py-2 border-b last:border-b-0 ${borderClass} flex items-center justify-between gap-2`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`font-semibold text-xs sm:text-sm ${labelColor}`}>{label}</span>
          {typeof baseValue === 'number' && (
            <span className={`text-[11px] tabular-nums ${mutedColor}`}>
              (Base {baseValue}
              {bonusFromGear > 0 ? ` ▲ +${bonusFromGear} equip.` : ''})
            </span>
          )}
        </div>
        {description && (
          <p className={`text-[11px] leading-snug mt-0.5 ${mutedColor}`}>{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`tabular-nums font-bold text-sm sm:text-base ${
            onParchment ? 'text-[#30251A]' : 'text-[#D4B26A]'
          }`}
        >
          {totalValue}
        </span>
        {typeof delta === 'number' && delta !== 0 && (
          <span
            className={`tabular-nums text-xs font-bold ${
              delta > 0
                ? onParchment
                  ? 'text-[#295221]'
                  : 'text-[#88B87E]'
                : 'text-[#C4514E]'
            }`}
          >
            {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
          </span>
        )}
        {actionSlot}
      </div>
    </div>
  );
};

/**
 * 5. ItemSlot — Slot Quadrado de Equipamento ou Inventário (mínimo 56x56px)
 */
export interface ItemSlotProps {
  item?: GameItem | null;
  slotType?: EquipmentSlotType;
  selected?: boolean;
  onClick?: () => void;
  size?: 'md' | 'lg';
  badgeText?: string;
}

export const ItemSlot: React.FC<ItemSlotProps> = ({
  item,
  slotType,
  selected = false,
  onClick,
  size = 'md',
  badgeText,
}) => {
  const rarityInfo = item
    ? DESIGN_TOKENS.colors.rarity[item.rarity]
    : DESIGN_TOKENS.colors.rarity.common;

  const slotLabel = item?.consumable
    ? 'Medicina'
    : slotType
    ? EQUIPMENT_SLOT_LABELS[slotType]
    : 'Slot';
  const ariaLabel = item
    ? `${item.name} (${rarityInfo.label}) — ${slotLabel}`
    : `${slotLabel} vazio`;

  const effectiveBadge = badgeText ?? (item?.consumable ? 'CURA' : undefined);

  const dimClass =
    size === 'lg'
      ? 'w-16 h-16 min-w-[64px] min-h-[64px]'
      : 'w-14 h-14 min-w-[56px] min-h-[56px]';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        borderColor: item ? rarityInfo.border : '#5E4527',
      }}
      className={`equipment-slot relative ${dimClass} surface-leather border-2 rounded-[2px] flex flex-col items-center justify-center p-1 transition-transform duration-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#D4B26A] cursor-pointer ${
        selected ? 'ring-2 ring-[#D4B26A] shadow-md' : ''
      }`}
    >
      {item ? (
        <>
          <ItemArtwork iconId={item.iconId} size={size === 'lg' ? 48 : 40} />
          <span className="absolute bottom-0.5 right-0.5 text-[9.5px] font-bold tabular-nums px-1 bg-[#17120F]/90 text-[#EFE2C4] border border-[#5E4527]">
            Nv.{item.levelReq}
          </span>
          {effectiveBadge && (
            <span
              className={`absolute top-0.5 left-0.5 text-[8.5px] font-bold px-1 text-[#EFE2C4] ${
                item.consumable ? 'bg-[#3E6B3A]' : 'bg-[#792B28]'
              }`}
            >
              {effectiveBadge}
            </span>
          )}
        </>
      ) : (
        <span className="text-[9px] font-roman tracking-tighter text-[#8C7A65] text-center leading-tight px-0.5">
          {slotLabel}
        </span>
      )}
    </button>
  );
};

/**
 * 6. ItemTooltip — Inspeção e Comparação Completa de Itens (Sinais e Rótulos Explícitos)
 */
export interface ItemTooltipProps {
  item: GameItem;
  comparedEquippedItem?: GameItem | null;
  playerLevel: number;
  playerGold?: number;
  inventoryFull?: boolean;
  mode: 'inventory' | 'equipped' | 'market_buy' | 'inspect_only';
  onEquip?: () => void;
  onUseMedicine?: () => void;
  onUnequip?: () => void;
  onSell?: () => void;
  onBuy?: () => void;
  onClose?: () => void;
}

export const ItemTooltip: React.FC<ItemTooltipProps> = ({
  item,
  comparedEquippedItem,
  playerLevel,
  playerGold = 0,
  inventoryFull = false,
  mode,
  onEquip,
  onUseMedicine,
  onUnequip,
  onSell,
  onBuy,
  onClose,
}) => {
  const rarity = DESIGN_TOKENS.colors.rarity[item.rarity];
  const meetsLevel = playerLevel >= item.levelReq;
  const canAfford = playerGold >= item.buyPrice;
  const isComparingDifferentItem = Boolean(
    !item.consumable && comparedEquippedItem && comparedEquippedItem.id !== item.id
  );

  // Construímos a união de todos os atributos presentes no item inspecionado OU no item equipado comparado
  const comparisonRows: {
    label: string;
    itemDisplay: string;
    diff?: number;
  }[] = [];

  const itemDmgAvg =
    ((item.stats.damageMin ?? 0) + (item.stats.damageMax ?? 0)) / 2;
  const eqDmgAvg = comparedEquippedItem
    ? ((comparedEquippedItem.stats.damageMin ?? 0) +
        (comparedEquippedItem.stats.damageMax ?? 0)) /
      2
    : 0;

  if (itemDmgAvg > 0 || (isComparingDifferentItem && eqDmgAvg > 0)) {
    comparisonRows.push({
      label: 'Dano de Arma',
      itemDisplay: `${item.stats.damageMin ?? 0} - ${item.stats.damageMax ?? 0}`,
      diff: isComparingDifferentItem ? Math.round(itemDmgAvg - eqDmgAvg) : undefined,
    });
  }

  const itemArmor = item.stats.armor ?? 0;
  const eqArmor = comparedEquippedItem?.stats.armor ?? 0;
  if (itemArmor > 0 || (isComparingDifferentItem && eqArmor > 0)) {
    comparisonRows.push({
      label: 'Armadura',
      itemDisplay: `+${itemArmor}`,
      diff: isComparingDifferentItem ? itemArmor - eqArmor : undefined,
    });
  }

  const itemHp = item.stats.healthBonus ?? 0;
  const eqHp = comparedEquippedItem?.stats.healthBonus ?? 0;
  if (itemHp > 0 || (isComparingDifferentItem && eqHp > 0)) {
    comparisonRows.push({
      label: 'Vitalidade Bônus',
      itemDisplay: `+${itemHp} PV`,
      diff: isComparingDifferentItem ? itemHp - eqHp : undefined,
    });
  }

  (Object.keys(PRIMARY_STAT_META) as PrimaryStatKey[]).forEach((key) => {
    const val = item.stats[key] ?? 0;
    const eqVal = comparedEquippedItem?.stats[key] ?? 0;
    if (val > 0 || (isComparingDifferentItem && eqVal > 0)) {
      comparisonRows.push({
        label: PRIMARY_STAT_META[key].label,
        itemDisplay: `+${val}`,
        diff: isComparingDifferentItem ? val - eqVal : undefined,
      });
    }
  });

  return (
    <div className="surface-parchment frame-parchment p-3 sm:p-4 text-[#30251A]">
      <div className="flex items-start gap-3">
        <div
          className="w-16 h-16 shrink-0 surface-leather border-2 flex items-center justify-center"
          style={{ borderColor: rarity.border }}
        >
          <ItemArtwork iconId={item.iconId} size={50} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span
              className="text-xs font-bold tracking-wider uppercase"
              style={{ color: rarity.textOnParchment }}
            >
              {rarity.label} ·{' '}
              {item.consumable
                ? 'Suprimento Médico'
                : EQUIPMENT_SLOT_LABELS[item.slot]}
            </span>
            <span
              className={`text-xs font-bold tabular-nums ${
                meetsLevel ? 'text-[#30251A]' : 'text-[#9E332E]'
              }`}
            >
              {meetsLevel
                ? `Requisito: Nível ${item.levelReq} (OK)`
                : `Requer Nível ${item.levelReq} (Você: Nv.${playerLevel})`}
            </span>
          </div>
          <h3 className="font-roman font-bold text-base sm:text-lg text-[#30251A] leading-snug mt-0.5">
            {item.name}
          </h3>
          <p className="text-xs text-[#5C4935] mt-1 leading-relaxed">{item.description}</p>
        </div>
      </div>

      {/* Efeito imediato se for um Suprimento Médico Consumível */}
      {item.consumable && (
        <div className="mt-3 p-2.5 bg-[#23381F] border border-[#4E7A45] text-[#EFE2C4] text-xs space-y-1">
          <div className="font-roman font-bold uppercase tracking-wider text-[#88B87E]">
            Efeito Imediato ao Consumir (Valetudinarium):
          </div>
          <div className="flex flex-wrap items-center gap-3 tabular-nums font-bold">
            <span>Restaura +{item.consumable.healHp} PV de Vitalidade</span>
            {item.consumable.restoreEnergy > 0 && (
              <span>· Recupera +{item.consumable.restoreEnergy} Energia</span>
            )}
          </div>
        </div>
      )}

      {/* Atributos e comparação com sinais não dependentes apenas de cor */}
      <div className="mt-3 pt-2 border-t border-[#947044]/50 space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#5C4935]">
          {item.consumable
            ? 'Bônus Adicional (se equipado como talismã):'
            : isComparingDifferentItem
            ? `Comparação com equipado (${comparedEquippedItem?.name}):`
            : !comparedEquippedItem && mode !== 'equipped'
            ? `Slot de ${EQUIPMENT_SLOT_LABELS[item.slot]} está vazio (Ganho direto):`
            : 'Atributos do Equipamento:'}
        </div>
        {comparisonRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-2 text-xs sm:text-sm py-0.5 border-b last:border-b-0 border-[#947044]/20"
          >
            <span className="font-semibold text-[#30251A]">{row.label}</span>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="font-bold text-[#30251A]">{row.itemDisplay}</span>
              {typeof row.diff === 'number' && (
                <span
                  className={`text-xs font-bold ${
                    row.diff > 0
                      ? 'text-[#295221]'
                      : row.diff < 0
                      ? 'text-[#9E332E]'
                      : 'text-[#5C4935]'
                  }`}
                >
                  {row.diff > 0
                    ? `[▲ +${row.diff} Melhoria]`
                    : row.diff < 0
                    ? `[▼ ${row.diff} Redução]`
                    : '[= Igual]'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Preços */}
      <div className="mt-3 pt-2 border-t border-[#947044]/50 flex items-center justify-between text-xs tabular-nums">
        <span>
          Compra: <strong>{item.buyPrice} Ouro</strong>
        </span>
        <span>
          Valor de Venda: <strong>+{item.sellPrice} Ouro</strong>
        </span>
      </div>

      {/* Botões de ação com explicação quando indisponíveis */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mode === 'inventory' && item.consumable && onUseMedicine && (
          <GameButton
            variant="crimson"
            size="sm"
            onClick={onUseMedicine}
            disabled={!meetsLevel}
            disabledReason={!meetsLevel ? `Requer Nível ${item.levelReq} para consumir` : undefined}
          >
            Usar Medicina (+{item.consumable.healHp} PV
            {item.consumable.restoreEnergy > 0
              ? ` / +${item.consumable.restoreEnergy} Energia`
              : ''}
            )
          </GameButton>
        )}
        {mode === 'inventory' && onEquip && (
          <GameButton
            variant={item.consumable ? 'bronze' : 'crimson'}
            size="sm"
            onClick={onEquip}
            disabled={!meetsLevel}
            disabledReason={!meetsLevel ? `Requer Nível ${item.levelReq} para equipar` : undefined}
          >
            Equipar no {EQUIPMENT_SLOT_LABELS[item.slot]}
          </GameButton>
        )}
        {mode === 'inventory' && onSell && (
          <GameButton variant="bronze" size="sm" onClick={onSell}>
            Vender (+{item.sellPrice} Ouro)
          </GameButton>
        )}
        {mode === 'equipped' && onUnequip && (
          <GameButton
            variant="bronze"
            size="sm"
            onClick={onUnequip}
            disabled={inventoryFull}
            disabledReason={inventoryFull ? 'Inventário cheio (20/20)' : undefined}
          >
            Remover para Mochila
          </GameButton>
        )}
        {mode === 'market_buy' && onBuy && (
          <GameButton
            variant="crimson"
            size="sm"
            onClick={onBuy}
            disabled={!canAfford || inventoryFull}
            disabledReason={
              inventoryFull
                ? 'Mochila cheia (20/20)'
                : !canAfford
                ? `Saldo insuficiente (Faltam ${item.buyPrice - playerGold} Ouro)`
                : undefined
            }
          >
            Comprar ({item.buyPrice} Ouro)
          </GameButton>
        )}
        {onClose && (
          <GameButton variant="iron" size="sm" onClick={onClose}>
            Fechar Inspeção
          </GameButton>
        )}
      </div>
    </div>
  );
};

/**
 * 7. NextObjectiveBanner — Painel de Próximo Objetivo de Progressão (Item 11)
 */
export interface NextObjectiveBannerProps {
  objective: NextObjectiveInfo;
  onNavigate: () => void;
}

export const NextObjectiveBanner: React.FC<NextObjectiveBannerProps> = ({
  objective,
  onNavigate,
}) => {
  return (
    <div className="surface-wood frame-bronze p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-roman font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#792B28] text-[#EFE2C4] border border-[#B79552]">
            Próximo Objetivo
          </span>
          <span className="text-xs font-semibold text-[#D4B26A] truncate">
            {objective.requirementText}
          </span>
        </div>
        <h3 className="font-roman font-bold text-sm sm:text-base text-[#EFE2C4] mt-1">
          {objective.title}
        </h3>
        <p className="text-xs text-[#D6C29A] leading-snug mt-0.5">{objective.description}</p>
      </div>
      <div className="shrink-0">
        <GameButton variant="crimson" size="sm" onClick={onNavigate}>
          {objective.ctaLabel}
        </GameButton>
      </div>
    </div>
  );
};

/**
 * 8. EnemyCard — Cartão de Inimigo / Adversário com Comparação de Atributos e Recompensas
 */
export interface EnemyCardProps {
  enemy: EnemyDefinition;
  playerStats: DerivedStats;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  disabledReason?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  isIdleTarget?: boolean;
  simulationTag?: string;
  energyCost?: number;
  durationSeconds?: number;
}

export const EnemyCard: React.FC<EnemyCardProps> = ({
  enemy,
  playerStats,
  actionLabel,
  onAction,
  disabled,
  disabledReason,
  secondaryActionLabel,
  onSecondaryAction,
  isIdleTarget = false,
  simulationTag,
  energyCost,
  durationSeconds,
}) => {
  return (
    <div
      className={`surface-stone frame-bronze p-3 rounded-[2px] transition-colors ${
        isIdleTarget ? 'ring-2 ring-[#D4B26A]' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <EnemyPortrait
          avatarId={enemy.avatarId}
          name={enemy.name}
          className="w-16 h-16 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-[#B79552]">
              Nível {enemy.level} · {enemy.title}
            </span>
            {simulationTag && (
              <span className="text-[11px] text-[#B8A686] font-medium">
                {simulationTag}
              </span>
            )}
          </div>
          <h3 className="font-roman font-bold text-sm sm:text-base text-[#EFE2C4] leading-snug">
            {enemy.name}
          </h3>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs tabular-nums bg-[#17120F]/70 p-2 border border-[#5E4527]/60">
            <div>
              <span className="text-[#B8A686] block text-[10px]">Vida Máx.</span>
              <span className="font-bold text-[#EFE2C4]">{enemy.maxHp} PV</span>
            </div>
            <div>
              <span className="text-[#B8A686] block text-[10px]">Dano (vs Seu)</span>
              <span className="font-bold text-[#EFE2C4]">
                {enemy.damageMin}-{enemy.damageMax}{' '}
                <span className="text-[10px] text-[#D4B26A]">
                  ({playerStats.damageMin}-{playerStats.damageMax})
                </span>
              </span>
            </div>
            <div>
              <span className="text-[#B8A686] block text-[10px]">Armadura (vs Sua)</span>
              <span className="font-bold text-[#EFE2C4]">
                {enemy.armor}{' '}
                <span className="text-[10px] text-[#D4B26A]">({playerStats.armor})</span>
              </span>
            </div>
            <div>
              <span className="text-[#B8A686] block text-[10px]">Ganhos Base</span>
              <span className="font-bold text-[#D4B26A]">
                {enemy.goldMin}-{enemy.goldMax} Ouro · {enemy.xpReward} XP
              </span>
            </div>
          </div>

          {(energyCost !== undefined || durationSeconds !== undefined) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#B8A686] tabular-nums">
              {energyCost !== undefined && <span>Custo: {energyCost} Energia</span>}
              {durationSeconds !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Duração: {durationSeconds}s</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>Chance Base de Espólio: {Math.round(enemy.dropChance * 100)}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {secondaryActionLabel && onSecondaryAction && (
          <GameButton
            variant={isIdleTarget ? 'crimson' : 'iron'}
            size="sm"
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </GameButton>
        )}
        <GameButton
          variant="crimson"
          size="sm"
          onClick={onAction}
          disabled={disabled}
          disabledReason={disabledReason}
        >
          {actionLabel}
        </GameButton>
      </div>
    </div>
  );
};

/**
 * 9. RewardPanel — Painel de Resgate Idempotente de Recompensas e Espólios
 */
export interface RewardPanelProps {
  batch: PendingRewardBatch;
  onClaim: (claimId: string) => void;
}

export const RewardPanel: React.FC<RewardPanelProps> = ({ batch, onClaim }) => {
  const focusInfo = batch.focusMode ? IDLE_FOCUS_DEFINITIONS[batch.focusMode] : null;

  return (
    <div className="surface-parchment frame-parchment p-3 sm:p-4 text-[#30251A]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#947044]/50 pb-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#792B28]">
            Espólios Disponíveis {focusInfo ? `· Foco: ${focusInfo.label}` : ''}
          </span>
          <h4 className="font-roman font-bold text-sm sm:text-base text-[#30251A]">
            {batch.sourceTitle}
          </h4>
        </div>
        {batch.cyclesCompleted > 1 && (
          <span className="text-xs font-bold tabular-nums text-[#5C4935]">
            {batch.cyclesCompleted} atividades ({batch.victories}V / {batch.defeats}D)
          </span>
        )}
      </div>

      {batch.elapsedSecondsAccounted > 0 && (
        <div className="mt-2 p-2 bg-[#C2AB7E]/40 border border-[#947044]/60 text-xs text-[#30251A] tabular-nums space-y-0.5">
          <div>
            Tempo contabilizado:{' '}
            <strong>
              {Math.floor(batch.elapsedSecondsAccounted / 60)} min e{' '}
              {batch.elapsedSecondsAccounted % 60}s ({batch.elapsedSecondsAccounted}s)
            </strong>
          </div>
          <div>
            Atividades concluídas: <strong>{batch.cyclesCompleted} incursões</strong> (
            {batch.victories} vitórias, {batch.defeats} derrotas)
          </div>
          {batch.wasCappedAtMaxOffline && (
            <div className="text-[#792B28] font-bold">
              Aviso: O tempo ausente atingiu o limite máximo offline de 8 horas (28.800s).
            </div>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center bg-[#C2AB7E]/50 p-2 border border-[#947044]">
        <div>
          <span className="block text-[10px] uppercase font-bold text-[#5C4935]">Denários</span>
          <span className="font-roman font-bold text-sm sm:text-base tabular-nums text-[#30251A]">
            +{batch.gold} Ouro
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-[#5C4935]">Experiência</span>
          <span className="font-roman font-bold text-sm sm:text-base tabular-nums text-[#30251A]">
            +{batch.xp} XP
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-[#5C4935]">Honra</span>
          <span className="font-roman font-bold text-sm sm:text-base tabular-nums text-[#30251A]">
            +{batch.honor}
          </span>
        </div>
      </div>

      {batch.items.length > 0 && (
        <div className="mt-3">
          <span className="block text-xs font-bold text-[#30251A] mb-1.5">
            Itens Obtidos ({batch.items.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {batch.items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-2 bg-[#211711] text-[#EFE2C4] p-1.5 border border-[#947044]"
              >
                <ItemArtwork iconId={it.iconId} size={32} />
                <div className="text-xs">
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-[10px] text-[#B8A686]">Nível {it.levelReq}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <GameButton
          variant="crimson"
          size="md"
          fullWidth
          disabled={batch.claimed}
          disabledReason={batch.claimed ? 'Recompensa já resgatada' : undefined}
          onClick={() => onClaim(batch.claimId)}
        >
          {batch.claimed ? 'Espólios Resgatados' : 'Resgatar Recompensas'}
        </GameButton>
      </div>
    </div>
  );
};

/**
 * 10. CombatPresentationView — Apresentação Interativa do Combate Automático (Item 9)
 * Reflete o cálculo real turno a turno, permite Acelerar ou Resumir sem alterar a recompensa,
 * respeita prefers-reduced-motion e orienta caminhos de melhoria em caso de derrota.
 */
export interface CombatPresentationViewProps {
  report: CombatReport;
  playerName: string;
  linkedBatch?: PendingRewardBatch | null;
  onClaimReward: (claimId: string) => void;
  onNavigateRecovery?: (targetTab: MainTabId) => void;
}

export const CombatPresentationView: React.FC<CombatPresentationViewProps> = ({
  report,
  playerName,
  linkedBatch,
  onClaimReward,
  onNavigateRecovery,
}) => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const totalSteps = report.rounds.length;
  const [visibleSteps, setVisibleSteps] = useState<number>(() =>
    prefersReducedMotion ? totalSteps : Math.min(1, totalSteps)
  );
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleSteps(totalSteps);
      return;
    }
    setVisibleSteps(Math.min(1, totalSteps));
  }, [report.id, prefersReducedMotion, totalSteps]);

  useEffect(() => {
    if (visibleSteps >= totalSteps) return;
    const delay = speedMultiplier === 2 ? 120 : 280;
    const timer = window.setTimeout(() => {
      setVisibleSteps((prev) => Math.min(totalSteps, prev + 1));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [visibleSteps, totalSteps, speedMultiplier]);

  const isFinished = visibleSteps >= totalSteps;
  const shownRounds = report.rounds.slice(0, visibleSteps);

  // Calcula a vida atual exibida até o passo visível
  let displayedPlayerHp = report.playerStartHp;
  let displayedEnemyHp = report.enemyStartHp;
  for (const r of shownRounds) {
    if (r.actor === 'player') {
      displayedEnemyHp = r.targetHpAfter;
    } else {
      displayedPlayerHp = r.targetHpAfter;
    }
  }
  if (isFinished) {
    displayedPlayerHp = report.playerEndHp;
    displayedEnemyHp = report.enemyEndHp;
  }

  const lastAction = shownRounds[shownRounds.length - 1];

  return (
    <div className="space-y-3">
      {/* Identidade e Vida Atual/Máxima dos Combatentes */}
      <div className="grid grid-cols-2 gap-2.5 bg-[#17120F] p-3 border border-[#947044]">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 shrink-0 frame-bronze overflow-hidden">
            <ArtworkImage
              src={IMAGE_ASSETS.playerPortrait}
              alt={playerName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-roman font-bold text-xs text-[#EFE2C4] truncate">
              {playerName}
            </div>
            <div className="text-[11px] text-[#D4B26A] tabular-nums">
              Dano: {report.totalPlayerDamageDealt}
            </div>
            <ProgressBar
              label="Vida"
              current={displayedPlayerHp}
              max={report.playerMaxHp}
              variant="health"
              compact
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EnemyPortrait
            avatarId={report.enemyAvatarId}
            name={report.enemyName}
            className="w-12 h-12 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="font-roman font-bold text-xs text-[#EFE2C4] truncate">
              {report.enemyName}
            </div>
            <div className="text-[11px] text-[#C4514E] tabular-nums">
              Dano: {report.totalEnemyDamageDealt}
            </div>
            <ProgressBar
              label="Vida"
              current={displayedEnemyHp}
              max={report.enemyMaxHp}
              variant="health"
              compact
            />
          </div>
        </div>
      </div>

      {/* Barra de Progresso do Confronto + Controles de Acelerar/Resumir */}
      <div className="bg-[#241A14] p-2.5 border border-[#5E4527] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <ProgressBar
              label={
                isFinished
                  ? report.victory
                    ? 'Confronto Concluído — VITÓRIA!'
                    : 'Confronto Concluído — DERROTA'
                  : `Andamento do Confronto (Ação ${visibleSteps}/${totalSteps})`
              }
              current={visibleSteps}
              max={Math.max(1, totalSteps)}
              variant="timer"
              compact
            />
          </div>
          {!isFinished && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setSpeedMultiplier((prev) => (prev === 1 ? 2 : 1))}
                className="min-h-[36px] px-2.5 py-1 bg-[#2B2119] border border-[#947044] text-xs font-roman font-bold text-[#D4B26A] cursor-pointer"
              >
                {speedMultiplier === 2 ? 'Velocidade 2x' : 'Acelerar 2x'}
              </button>
              <button
                type="button"
                onClick={() => setVisibleSteps(totalSteps)}
                className="min-h-[36px] px-2.5 py-1 bg-[#792B28] border border-[#B79552] text-xs font-roman font-bold text-[#EFE2C4] cursor-pointer"
              >
                Resumir
              </button>
            </div>
          )}
        </div>

        {lastAction && (
          <div className="text-xs text-[#EFE2C4] bg-[#17120F] px-2.5 py-1.5 border border-[#5E4527] flex items-center justify-between gap-2">
            <span>
              <strong>[Turno {lastAction.round}]</strong> {lastAction.description}
            </span>
            <span className="font-bold tabular-nums text-[#D4B26A] shrink-0">
              {lastAction.actionType === 'miss'
                ? 'Bloqueio / Esquiva'
                : `-${lastAction.finalDamage} PV`}
            </span>
          </div>
        )}
      </div>

      {/* Diagnóstico de Derrota com Caminhos de Melhoria (Item 9) */}
      {!report.victory && report.defeatDiagnosis && (
        <div className="bg-[#3D1614] border-2 border-[#B79552] p-3 text-xs text-[#EFE2C4] space-y-2">
          <div className="font-roman font-bold text-sm text-[#D4B26A]">
            Diagnóstico do Doctore — Como Superar Este Adversário:
          </div>
          <ul className="list-disc pl-4 space-y-1 text-[#EFE2C4]">
            {report.defeatDiagnosis.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
          {onNavigateRecovery && (
            <div className="flex flex-wrap gap-2 pt-1">
              <GameButton
                variant="bronze"
                size="sm"
                onClick={() => onNavigateRecovery('city')}
              >
                Treinar Atributos na Cidade
              </GameButton>
              <GameButton
                variant="iron"
                size="sm"
                onClick={() => onNavigateRecovery('character')}
              >
                Equipar / Curar no Personagem
              </GameButton>
            </div>
          )}
        </div>
      )}

      {/* Recompensa e Consequências */}
      {linkedBatch && <RewardPanel batch={linkedBatch} onClaim={onClaimReward} />}

      {/* Registro Tático Turno a Turno */}
      <div className="surface-parchment frame-parchment p-3 text-[#30251A]">
        <h4 className="font-roman font-bold text-xs uppercase tracking-wider border-b border-[#947044] pb-1.5 mb-2">
          Crônica Completa dos Golpes ({shownRounds.length}/{totalSteps})
        </h4>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs">
          {shownRounds.map((r, idx) => (
            <div
              key={`${r.round}_${r.actor}_${idx}`}
              className="py-1 border-b last:border-b-0 border-[#947044]/30 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <span className="font-bold tabular-nums text-[#5C4935] mr-1">
                  [T{r.round}]
                </span>
                <span
                  className={`font-semibold ${
                    r.actor === 'player' ? 'text-[#30251A]' : 'text-[#792B28]'
                  }`}
                >
                  {r.description}
                </span>
              </div>
              <span className="shrink-0 tabular-nums font-bold">
                {r.actionType === 'miss'
                  ? 'Bloqueado (0)'
                  : `-${r.finalDamage} PV (${r.mitigatedByArmor} abs.)`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 11. ResourceBar — Topo Mobile Compacto: Retrato, Nível, Ouro, Vida, Energia e Ajuda
 */
export interface ResourceBarProps {
  name: string;
  guildTag?: string | null;
  playerRank?: number;
  level: number;
  gold: number;
  honor: number;
  currentHp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  idleActive: boolean;
  pendingCount: number;
  isOnlineMode?: boolean;
  onlineAccountLabel?: string;
  onOpenAccountModal?: () => void;
  onOpenHelp: () => void;
  onOpenRankings?: () => void;
  onSimulateOfflineClick: () => void;
}

export const ResourceBar: React.FC<ResourceBarProps> = ({
  name,
  guildTag,
  playerRank,
  level,
  gold,
  honor,
  currentHp,
  maxHp,
  energy,
  maxEnergy,
  idleActive,
  pendingCount,
  isOnlineMode = false,
  onlineAccountLabel,
  onOpenAccountModal,
  onOpenHelp,
  onOpenRankings,
  onSimulateOfflineClick,
}) => {
  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / Math.max(1, maxHp)) * 100)));
  const energyPercent = Math.max(
    0,
    Math.min(100, Math.round((energy / Math.max(1, maxEnergy)) * 100))
  );
  const isDevEnv =
    typeof window !== 'undefined' && window.location.search.includes('dev=1');

  return (
    <header className="sticky top-0 z-20 w-full bg-[#1D1510] border-b-2 border-[#947044] shadow-md">
      <div className="max-w-5xl mx-auto px-2.5 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative w-10 h-10 shrink-0 frame-bronze overflow-hidden bg-[#17120F]">
            <ArtworkImage
              src={IMAGE_ASSETS.playerPortrait}
              alt={name}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0 right-0 bg-[#792B28] text-[#EFE2C4] text-[10px] font-bold tabular-nums px-1 border-t border-l border-[#B79552]">
              {level}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {guildTag && (
                <span className="px-1 py-0.2 text-[10px] font-roman font-bold bg-[#2B2119] border border-[#B79552] text-[#D4B26A] shrink-0">
                  [{guildTag}]
                </span>
              )}
              <span className="font-roman font-bold text-xs sm:text-sm text-[#EFE2C4] truncate">
                {name}
              </span>
              <span
                className={`px-1 py-0.2 text-[9px] font-roman font-bold border shrink-0 ${
                  isOnlineMode
                    ? 'bg-[#1E2E1C] text-[#88B87E] border-[#4B7A47]'
                    : 'bg-[#2B2119] text-[#B8A686] border-[#5E4527]'
                }`}
              >
                {isOnlineMode ? 'ONLINE' : 'LOCAL'}
              </span>
              {idleActive && (
                <span className="text-[10px] font-bold text-[#D4B26A] shrink-0">
                  · Auto
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[11px] sm:text-xs tabular-nums text-[#D4B26A] font-semibold leading-tight mt-0.5">
              <span className="whitespace-nowrap">{gold} Ouro</span>
              <span aria-hidden="true" className="text-[#5E4527]">·</span>
              {onOpenRankings ? (
                <button
                  type="button"
                  onClick={onOpenRankings}
                  className="text-[#D6C29A] hover:text-[#EFE2C4] hover:underline cursor-pointer whitespace-nowrap"
                  title="Abrir Classificação Geral"
                >
                  {honor} Honra{playerRank ? ` (#${playerRank})` : ''}
                </button>
              ) : (
                <span className="text-[#D6C29A] whitespace-nowrap">
                  {honor} Honra{playerRank ? ` (#${playerRank})` : ''}
                </span>
              )}
              {pendingCount > 0 && (
                <>
                  <span aria-hidden="true" className="text-[#5E4527]">·</span>
                  <span className="text-[#88B87E] font-bold whitespace-nowrap">{pendingCount} Esp.</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-16 sm:w-28 space-y-1">
            <div>
              <div className="flex justify-between text-[9px] sm:text-[10px] tabular-nums leading-none mb-0.5">
                <span className="text-[#D6C29A]">PV</span>
                <span className="text-[#EFE2C4] font-semibold">
                  {Math.round(currentHp)}/{Math.round(maxHp)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#120D0A] border border-[#5E4527] overflow-hidden">
                <div
                  className="h-full bg-[#8F2D2A] origin-left transition-transform duration-150"
                  style={{ transform: `scaleX(${hpPercent / 100})` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] sm:text-[10px] tabular-nums leading-none mb-0.5">
                <span className="text-[#D6C29A]">EN</span>
                <span className="text-[#EFE2C4] font-semibold">
                  {energy}/{maxEnergy}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#120D0A] border border-[#5E4527] overflow-hidden">
                <div
                  className="h-full bg-[#4B7A47] origin-left transition-transform duration-150"
                  style={{ transform: `scaleX(${energyPercent / 100})` }}
                />
              </div>
            </div>
          </div>

          {onOpenAccountModal && (
            <button
              type="button"
              onClick={onOpenAccountModal}
              aria-label={isOnlineMode ? 'Conta Online Conectada' : 'Conectar Conta Online'}
              title={
                isOnlineMode
                  ? `Conta Online: ${onlineAccountLabel ?? 'Conectada'}`
                  : 'Entrar com Google / Migrar Progresso Local'
              }
              className={`min-w-[44px] min-h-[44px] px-1.5 border text-[10px] font-roman font-bold flex flex-col items-center justify-center leading-tight cursor-pointer ${
                isOnlineMode
                  ? 'bg-[#1E2E1C] border-[#4B7A47] text-[#EFE2C4]'
                  : 'bg-[#541B19] border-[#B79552] text-[#EFE2C4]'
              }`}
            >
              <span>{isOnlineMode ? 'Conta' : 'Entrar'}</span>
              <span className="text-[8px] text-[#D4B26A]">
                {isOnlineMode ? 'Online' : 'Google'}
              </span>
            </button>
          )}

          {isDevEnv && (
            <button
              type="button"
              onClick={onSimulateOfflineClick}
              aria-label="Avançar 1h de Patrulha Offline (Somente Desenvolvimento)"
              title="Simular 1 hora de progresso em segundo plano (Restrito ao ambiente DEV)"
              className="min-w-[44px] min-h-[44px] px-1.5 bg-[#2B2119] border border-[#947044] text-[#D6C29A] hover:text-[#EFE2C4] text-[10px] font-roman font-bold flex flex-col items-center justify-center leading-tight cursor-pointer"
            >
              <span>+1h</span>
              <span className="text-[8px] text-[#B8A686]">DEV</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="Como Jogar e Regras do Ludus"
            title="Como Jogar"
            className="min-w-[44px] min-h-[44px] px-1.5 bg-[#2B2119] border border-[#947044] text-[#D6C29A] hover:text-[#EFE2C4] text-[10px] font-roman font-bold flex flex-col items-center justify-center leading-tight cursor-pointer"
          >
            <span>Ajuda</span>
            <span className="text-[9px] text-[#B8A686]">Guia</span>
          </button>
        </div>
      </div>
    </header>
  );
};

/**
 * 12. BottomNavigation — Navegação Persistente Inferior com 5 Abas Principais
 */
export interface BottomNavigationProps {
  activeTab: MainTabId;
  onSelectTab: (tab: MainTabId) => void;
  inventoryCount: number;
  maxInventory: number;
  idleActive: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
  inventoryCount,
  maxInventory,
  idleActive,
}) => {
  const navItems: { id: MainTabId; label: string; badge?: string; svg: React.ReactNode }[] = [
    {
      id: 'character',
      label: 'Personagem',
      svg: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3 C8 3 6 6 6 10 L6 15 L9 17 L9 12 L15 12 L15 17 L18 15 L18 10 C18 6 16 3 12 3 Z" />
          <path d="M5 21 C6 18 18 18 19 21" />
        </svg>
      ),
    },
    {
      id: 'expeditions',
      label: 'Expedições',
      badge: idleActive ? 'Auto' : undefined,
      svg: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
    },
    {
      id: 'arena',
      label: 'Arena',
      svg: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 19 L19 5 M15 5 L19 5 L19 9" />
          <path d="M19 19 L5 5 M9 5 L5 5 L5 9" />
        </svg>
      ),
    },
    {
      id: 'inventory',
      label: 'Inventário',
      badge: `${inventoryCount}/${maxInventory}`,
      svg: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <path d="M9 6 V4 H15 V6 M4 11 H20" />
        </svg>
      ),
    },
    {
      id: 'city',
      label: 'Cidade',
      svg: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 10 L12 4 L21 10" />
          <path d="M6 10 V19 M10 10 V19 M14 10 V19 M18 10 V19" />
          <path d="M3 19 H21" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Navegação Principal do Ludus"
      className="ludus-navigation fixed bottom-0 left-0 right-0 z-30 bg-[#1B140F] border-t-2 border-[#947044] shadow-lg"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative min-h-[52px] min-w-[44px] py-1 px-0.5 flex flex-col items-center justify-center transition-colors border-r last:border-r-0 border-[#5E4527]/50 cursor-pointer select-none ${
                isActive
                  ? 'bg-gradient-to-t from-[#541B19] to-[#2B2119] text-[#EFE2C4]'
                  : 'text-[#B8A686] hover:text-[#EFE2C4] hover:bg-[#241A14]'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-0 right-0 h-0.5 bg-[#D4B26A]"
                />
              )}
              {item.svg}
              <span className="mt-0.5 text-[9.5px] sm:text-xs font-roman font-bold tracking-tighter whitespace-nowrap">
                {item.label}
              </span>
              {item.badge && (
                <span className="absolute top-0.5 right-0.5 text-[8.5px] font-bold tabular-nums px-1 bg-[#2B2119] text-[#D4B26A] border border-[#947044]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

/**
 * 13. GameModal — Camada de Modal em Pedra e Pergaminho
 */
export interface GameModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const GameModal: React.FC<GameModalProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col surface-stone frame-bronze overflow-hidden shadow-2xl">
        <header className="px-4 py-2.5 bg-[#1D1510] border-b-2 border-[#947044] flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h2 className="font-roman font-bold text-sm sm:text-lg text-[#EFE2C4] leading-snug">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#B8A686] truncate">{subtitle}</p>
            )}
          </div>
          <GameButton variant="iron" size="sm" onClick={onClose} aria-label="Fechar modal">
            Fechar
          </GameButton>
        </header>
        <div className="p-3 sm:p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

/**
 * 14. GameShell — Estrutura Principal Responsiva
 */
export interface GameShellProps {
  sectionTitle?: string;
  resourceBar: React.ReactNode;
  bottomNav: React.ReactNode;
  guidedOnboardingBar?: React.ReactNode;
  bannerFeedback?: { message: string; type: 'info' | 'success' | 'error' } | null;
  onDismissFeedback?: () => void;
  children: React.ReactNode;
}

export const GameShell: React.FC<GameShellProps> = ({
  sectionTitle = 'Seu gladiador',
  resourceBar,
  bottomNav,
  guidedOnboardingBar,
  bannerFeedback,
  onDismissFeedback,
  children,
}) => {
  return (
    <div className="imperium-shell min-h-screen w-full bg-[#17120F] text-[#EFE2C4] flex flex-col overflow-x-hidden">
      {resourceBar}

      {guidedOnboardingBar}

      {bannerFeedback && (
        <div
          role="status"
          className={`max-w-5xl w-full mx-auto px-3 py-2 border-b border-[#947044] flex items-center justify-between gap-2 text-xs sm:text-sm font-medium ${
            bannerFeedback.type === 'error'
              ? 'bg-[#541B19] text-[#EFE2C4]'
              : bannerFeedback.type === 'success'
              ? 'bg-[#253B23] text-[#EFE2C4]'
              : 'bg-[#2B2119] text-[#D6C29A]'
          }`}
        >
          <span>{bannerFeedback.message}</span>
          {onDismissFeedback && (
            <button
              type="button"
              onClick={onDismissFeedback}
              className="text-xs underline font-semibold px-2 py-1 min-h-[32px] cursor-pointer"
            >
              OK
            </button>
          )}
        </div>
      )}

      <main className="imperium-main flex-1 w-full max-w-5xl mx-auto px-2.5 sm:px-4 pt-3 pb-20">
        <div className="imperium-hero" style={{ backgroundImage: `linear-gradient(90deg, #0c1016 5%, #0c1016a8 60%, #0c101633), url(${IMAGE_ASSETS.titleBackdrop})` }}>
          <div><span className="eyebrow">GLADIATORUM / ARENA AETERNA</span><h1>{sectionTitle}</h1><p>Forje seu nome. Conquiste seu legado.</p></div>
          <span className="hero-seal" aria-hidden="true">SPQR</span>
        </div>
        {children}
      </main>

      {bottomNav}
    </div>
  );
};
