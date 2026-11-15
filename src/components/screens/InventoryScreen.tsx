import React, { useState } from 'react';
import { EquipmentFilters, EMPTY_EQUIPMENT_FILTER, matchesEquipmentFilter } from '../ui/EquipmentFilters';
import {
  EQUIPMENT_SLOT_LABELS,
  EquipmentSlotType,
  GAME_CONFIG,
  GameItem,
} from '../../game/config';
import { GameState, getInventoryCapacity, getInventoryExpansionCost } from '../../game/rules';
import {
  GameButton,
  ItemSlot,
  ItemTooltip,
  RomanPanel,
} from '../ui/RomanComponents';

interface InventoryScreenProps {
  state: GameState;
  onEquipItem: (itemId: string) => void;
  onUseMedicineItem?: (itemId: string) => void;
  onUnequipSlot: (slot: EquipmentSlotType) => void;
  onSellItem: (itemId: string) => void;
  onBuyExpansion?: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  state,
  onEquipItem,
  onUseMedicineItem,
  onUnequipSlot,
  onSellItem,
  onBuyExpansion,
}) => {
  const [slotFilter, setSlotFilter] = useState<'all' | 'medicine' | EquipmentSlotType>('all');
  const [equipmentFilter, setEquipmentFilter] = useState(EMPTY_EQUIPMENT_FILTER);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    state.inventory[0]?.id ?? null
  );

  const inventoryCapacity = getInventoryCapacity(state);
  const expansionCost = getInventoryExpansionCost(state);
  const inventoryFull = state.inventory.length >= inventoryCapacity;
  const medicineCount = state.inventory.filter((i) => Boolean(i.consumable)).length;

  const categoryItems =
    slotFilter === 'all'
      ? state.inventory
      : slotFilter === 'medicine'
      ? state.inventory.filter((i) => Boolean(i.consumable))
      : state.inventory.filter((i) => i.slot === slotFilter && !i.consumable);
  const filteredItems = categoryItems.filter(item => matchesEquipmentFilter(item, equipmentFilter, state.level));

  const activeItem =
    filteredItems.find((i) => i.id === selectedItemId) ?? filteredItems[0] ?? null;

  const allSlots: EquipmentSlotType[] = [
    'weapon',
    'shield',
    'helmet',
    'armor',
    'gloves',
    'boots',
    'ring',
    'amulet',
  ];

  return (
    <div className="inventory-screen space-y-4">
      <RomanPanel
        title="Equipamento Ativo do Herói"
        subtitle={
          inventoryFull
            ? `Inventário cheio (${inventoryCapacity}/${inventoryCapacity})! Venda itens abaixo antes de remover equipamentos.`
            : 'Toque em um item equipado para guardá-lo no inventário'
        }
        variant="stone"
      >
        <div className="flex flex-wrap gap-2">
          {allSlots.map((slot) => {
            const eqItem = state.equipped[slot];
            return (
              <div key={slot} className="flex flex-col items-center">
                <ItemSlot
                  slotType={slot}
                  item={eqItem}
                  onClick={() => {
                    if (eqItem) {
                      onUnequipSlot(slot);
                    }
                  }}
                />
                <span className="mt-1 text-[10px] text-[#B8A686]">
                  {EQUIPMENT_SLOT_LABELS[slot]}
                </span>
              </div>
            );
          })}
        </div>
      </RomanPanel>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7">
          <RomanPanel
            title={`Inventário de Equipamentos (${state.inventory.length}/${inventoryCapacity} espaços)`}
            subtitle="Filtre por categoria ou toque em um item para usar medicamentos ou comparar com o espaço atual"
            variant="wood"
            headerAction={expansionCost === null ? <span className="text-xs text-[#D6C29A]">Limite máximo</span> : (
              <GameButton size="sm" disabled={!onBuyExpansion || state.gold < expansionCost} onClick={onBuyExpansion}>
                +5 espaços · {expansionCost} ouro
              </GameButton>
            )}
          >
            <div className="flex flex-wrap gap-1.5 mb-3 pb-2 border-b border-[#5E4527]">
              <button
                type="button"
                onClick={() => setSlotFilter('all')}
                className={`min-h-[36px] px-2.5 py-1 text-xs font-roman font-bold border rounded-[2px] cursor-pointer ${
                  slotFilter === 'all'
                    ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
                    : 'bg-[#1D1510] text-[#B8A686] border-[#5E4527]'
                }`}
              >
                Todos ({state.inventory.length})
              </button>
              <button
                type="button"
                onClick={() => setSlotFilter('medicine')}
                className={`min-h-[36px] px-2.5 py-1 text-xs font-roman font-bold border rounded-[2px] cursor-pointer ${
                  slotFilter === 'medicine'
                    ? 'bg-[#3E6B3A] text-[#EFE2C4] border-[#D4B26A]'
                    : 'bg-[#1D1510] text-[#88B87E] border-[#4E7A45]'
                }`}
              >
                Medicamentos ({medicineCount})
              </button>
              {allSlots.map((slot) => {
                const count = state.inventory.filter(
                  (i) => i.slot === slot && !i.consumable
                ).length;
                if (count === 0 && slotFilter !== slot) return null;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSlotFilter(slot)}
                    className={`min-h-[36px] px-2.5 py-1 text-xs font-roman font-bold border rounded-[2px] cursor-pointer ${
                      slotFilter === slot
                        ? 'bg-[#792B28] text-[#EFE2C4] border-[#D4B26A]'
                        : 'bg-[#1D1510] text-[#B8A686] border-[#5E4527]'
                    }`}
                  >
                    {EQUIPMENT_SLOT_LABELS[slot]} ({count})
                  </button>
                );
              })}
            </div>

            {state.inventory.length === 0 ? (
              <div className="p-4 bg-[#17120F]/70 border border-[#5E4527] text-xs text-[#D6C29A] mb-3">
                Sua arca de couro está vazia. Realize Operações com foco em{' '}
                <strong>Caça a Equipamentos</strong> ou compre armas e medicinas na Agência.
              </div>
            ) : null}

            <EquipmentFilters value={equipmentFilter} onChange={setEquipmentFilter} discoveredTemplates={state.discoveredTemplates} />
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {Array.from({ length: inventoryCapacity }).map((_, idx) => {
                const item: GameItem | undefined = filteredItems[idx];
                return (
                  <ItemSlot
                    key={item ? item.id : `empty_${idx}`}
                    item={item}
                    slotType={item?.slot}
                    selected={Boolean(item && activeItem?.id === item.id)}
                    onClick={() => {
                      if (item) {
                        setSelectedItemId(item.id);
                      }
                    }}
                  />
                );
              })}
            </div>
          </RomanPanel>
        </div>

        <div className="lg:col-span-5">
          {activeItem ? (
            <ItemTooltip
              item={activeItem}
              comparedEquippedItem={state.equipped[activeItem.slot] ?? null}
              playerLevel={state.level}
              playerGold={state.gold}
              inventoryFull={inventoryFull}
              mode="inventory"
              onEquip={() => onEquipItem(activeItem.id)}
              onUseMedicine={
                onUseMedicineItem ? () => onUseMedicineItem(activeItem.id) : undefined
              }
              onSell={() => onSellItem(activeItem.id)}
            />
          ) : (
            <RomanPanel title="Inspeção de Equipamento e Medicamentos" variant="parchment">
              <p className="text-xs sm:text-sm text-[#5C4935]">
                Selecione qualquer item na arca de couro para visualizar seus atributos, raridade,
                efeito medicinal ou comparação com o equipamento atual.
              </p>
            </RomanPanel>
          )}
        </div>
      </div>
    </div>
  );
};


