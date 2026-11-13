import React from 'react';
import { DESIGN_TOKENS } from '../../design/tokens';
import { EQUIPMENT_SLOT_LABELS, GameItem } from '../../game/config';
export interface EquipmentFilter { query: string; rarity: string; slot: string; levelOnly: boolean; }
export const EMPTY_EQUIPMENT_FILTER: EquipmentFilter = { query: '', rarity: 'all', slot: 'all', levelOnly: false };
export function matchesEquipmentFilter(item: GameItem, filter: EquipmentFilter, level: number) {
  return item.name.toLocaleLowerCase('pt-BR').includes(filter.query.toLocaleLowerCase('pt-BR')) &&
    (filter.rarity === 'all' || filter.rarity === item.rarity) &&
    (filter.slot === 'all' || filter.slot === item.slot) && (!filter.levelOnly || item.levelReq <= level);
}
export function EquipmentFilters({ value, onChange }: { value: EquipmentFilter; onChange: (value: EquipmentFilter) => void }) {
  return <div className="collection-filters mb-4">
    <input aria-label="Buscar itens" placeholder="Buscar item…" value={value.query} onChange={e => onChange({ ...value, query: e.target.value })} />
    <select aria-label="Raridade do item" value={value.rarity} onChange={e => onChange({ ...value, rarity: e.target.value })}><option value="all">Toda raridade</option>{Object.entries(DESIGN_TOKENS.colors.rarity).map(([id, rarity]) => <option key={id} value={id}>{rarity.label}</option>)}</select>
    <select aria-label="Slot do item" value={value.slot} onChange={e => onChange({ ...value, slot: e.target.value })}><option value="all">Todo equipamento</option>{Object.entries(EQUIPMENT_SLOT_LABELS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
    <label><input type="checkbox" checked={value.levelOnly} onChange={e => onChange({ ...value, levelOnly: e.target.checked })} /> Meu nível</label>
  </div>;
}
