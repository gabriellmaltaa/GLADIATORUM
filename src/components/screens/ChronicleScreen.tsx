import React, { useState } from 'react';
import type { GameState } from '../../game/rules';
import { ITEM_TEMPLATES, EQUIPMENT_SLOT_LABELS, EquipmentSlotType } from '../../game/config';
import { CONTRACTS, contractProgress } from '../../game/contracts';
import { COLLECTIONS } from '../../game/expansion';
import { DESIGN_TOKENS, RarityKey } from '../../design/tokens';
import { ItemArtwork } from '../../design/assets';

export function ChronicleScreen({ state, onClaim }: { state: GameState; onClaim: (id: string) => void }) {
  const [tab, setTab] = useState<'contracts' | 'collection'>('contracts');
  const [search, setSearch] = useState('');
  const [rarity, setRarity] = useState('all');
  const [slot, setSlot] = useState('all');
  const [maxLevel, setMaxLevel] = useState(false);
  const discovered = new Set([...(state.discoveredTemplates ?? []), ...state.inventory.map(i => i.templateId),
    ...Object.values(state.equipped).filter(Boolean).map(i => i!.templateId)]);
  const items = Object.values(ITEM_TEMPLATES).filter(i => !i.consumable);
  const filtered = items.filter(i => i.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) &&
    (rarity === 'all' || i.rarity === rarity) && (slot === 'all' || i.slot === slot) && (!maxLevel || i.levelReq <= state.level));
  return <section className="chronicle">
    <div className="chronicle-tabs" role="tablist" aria-label="Crônicas">
      <button role="tab" aria-selected={tab === 'contracts'} onClick={() => setTab('contracts')}>Contratos <span>{CONTRACTS.filter(c => !state.claimedContracts?.includes(c.id)).length}</span></button>
      <button role="tab" aria-selected={tab === 'collection'} onClick={() => setTab('collection')}>Coleção <span>{items.filter(i => discovered.has(i.templateId)).length}/{items.length}</span></button>
    </div>
    {tab === 'contracts' ? <>
      <div className="section-intro"><span className="eyebrow">QUADRO DO LUDUS</span><h2>Todo feito merece ser lembrado.</h2><p>Contratos permanentes. Avance no seu ritmo e recolha cada recompensa uma única vez.</p></div>
      <div className="contract-grid">{CONTRACTS.map((contract, index) => {
        const progress = contractProgress(state, contract);
        const claimed = state.claimedContracts?.includes(contract.id);
        return <article className={`contract-card ${claimed ? 'is-complete' : ''}`} key={contract.id}>
          <span className="contract-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="eyebrow">{contract.kind === 'wins' ? 'COMBATE' : contract.kind === 'loot' ? 'ESPÓLIOS' : 'DISCIPLINA'}</span>
          <h3>{contract.title}</h3><p>{contract.description}</p>
          <div className="contract-progress"><span style={{ width: `${progress / contract.target * 100}%` }} /></div>
          <div className="contract-footer"><span>{progress}/{contract.target}</span><strong>{contract.gold} denários</strong></div>
          <button disabled={claimed || progress < contract.target} onClick={() => onClaim(contract.id)}>{claimed ? 'Recompensa recolhida' : progress >= contract.target ? 'Recolher recompensa' : 'Em andamento'}</button>
        </article>;
      })}</div>
    </> : <>
      <div className="section-intro"><span className="eyebrow">ARSENAL DA PROVÍNCIA</span><h2>Tesouros para conquistar.</h2><p>Conheça as oito raridades e planeje sua próxima melhoria. Itens descobertos permanecem no registro.</p></div>
      <div className="collection-themes">{COLLECTIONS.map(c => <span key={c.id}>{c.name}<small>Nv. {c.level} · {c.origin}</small></span>)}</div>
      <div className="collection-filters">
        <input aria-label="Buscar equipamento na coleção" placeholder="Buscar equipamento…" value={search} onChange={e => setSearch(e.target.value)} />
        <select aria-label="Filtrar raridade" value={rarity} onChange={e => setRarity(e.target.value)}><option value="all">Todas as raridades</option>{Object.entries(DESIGN_TOKENS.colors.rarity).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}</select>
        <select aria-label="Filtrar slot" value={slot} onChange={e => setSlot(e.target.value)}><option value="all">Todos os slots</option>{Object.entries(EQUIPMENT_SLOT_LABELS).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select>
        <label><input type="checkbox" checked={maxLevel} onChange={e => setMaxLevel(e.target.checked)} /> Meu nível</label>
      </div>
      <p className="collection-count">{filtered.length} equipamentos encontrados</p>
      <div className="collection-grid">{filtered.sort((a, b) => a.levelReq - b.levelReq).map(item => {
        const color = DESIGN_TOKENS.colors.rarity[item.rarity as RarityKey];
        return <article className="collection-card" style={{ '--rarity': color.border } as React.CSSProperties} key={item.templateId}>
          <div className="collection-art"><ItemArtwork iconId={item.iconId} rarity={item.rarity} size={88} /><span>Nv. {item.levelReq}</span></div>
          <span className="rarity-label" style={{ color: color.textOnDark }}>{color.label} · {EQUIPMENT_SLOT_LABELS[item.slot as EquipmentSlotType]}</span>
          <h3>{item.name}</h3><p>{item.description}</p>
          <div className="collection-stats">{Object.entries(item.stats).filter(([, v]) => v).map(([key, value]) => <span key={key}>{({ armor: 'Armadura', strength: 'Força', skill: 'Habilidade', agility: 'Agilidade', constitution: 'Constituição', charisma: 'Carisma', intelligence: 'Inteligência', healthBonus: 'PV', damageMin: 'Dano mín.', damageMax: 'Dano máx.' } as Record<string,string>)[key]} +{value}</span>)}</div>
          <span className={`discovery ${discovered.has(item.templateId) ? 'found' : ''}`}>{discovered.has(item.templateId) ? '◆ Descoberto' : '◇ A descobrir'}</span>
        </article>;
      })}</div>
      {!filtered.length && <p className="empty-state">Nenhum equipamento corresponde aos filtros.</p>}
    </>}
  </section>;
}


