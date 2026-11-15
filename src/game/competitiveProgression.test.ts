import assert from 'node:assert/strict';
import test from 'node:test';
import { getAffixChanceForRarity, getCompetitiveTitle, maybeAffixItem, rollEquipmentAffix } from './competitiveProgression.ts';
import { ITEM_TEMPLATES } from './config.ts';
import { calculateDerivedStats, createInitialGameState } from './rules.ts';

test('atribui títulos por marcos de dez níveis e título dinâmico ao rank #1', () => {
  assert.equal(getCompetitiveTitle(1, 5), 'Recruta da Vigília');
  assert.equal(getCompetitiveTitle(10, 2), 'Vanguarda');
  assert.equal(getCompetitiveTitle(19, 2), 'Vanguarda');
  assert.equal(getCompetitiveTitle(20, 2), 'Guardião do Limiar');
  assert.equal(getCompetitiveTitle(150, 2), 'Ícone Supremo');
  assert.equal(getCompetitiveTitle(1, 1), 'Lenda do Limiar');
  assert.equal(getCompetitiveTitle(150, 1), 'Lenda do Limiar');
});

test('sorteia afixos válidos sem modificar template ou reaplicar afixo', () => {
  const template = ITEM_TEMPLATES.gladius_recruit;
  const item = { ...template, id: 'item-test', stats: { ...template.stats } };
  const precise = rollEquipmentAffix(item, () => 0);
  assert.equal(precise.affix, 'precise');
  assert.equal(precise.stats.critChancePercent, 1);
  assert.match(precise.name, /^Preciso /);
  assert.equal(item.affix, undefined);

  const cruel = rollEquipmentAffix(item, () => 0.4);
  assert.equal(cruel.affix, 'cruel');
  assert.ok((cruel.stats.damageMin ?? 0) > (item.stats.damageMin ?? 0));
  assert.ok((cruel.stats.damageMax ?? 0) > (item.stats.damageMax ?? 0));

  const swift = rollEquipmentAffix(item, () => 0.8);
  assert.equal(swift.affix, 'swift');
  assert.ok((swift.stats.agility ?? 0) > (item.stats.agility ?? 0));
  assert.equal(rollEquipmentAffix(precise, () => 0.8), precise);
});

test('afixo respeita faixas e limites recebidos pelo gerador aleatório', () => {
  const base = ITEM_TEMPLATES.gladius_recruit;
  const item = { ...base, id: 'item-test-2', stats: { ...base.stats } };
  const maxPrecise = rollEquipmentAffix(item, () => 0.33);
  assert.equal(maxPrecise.stats.critChancePercent, 3);
  const maxCruel = rollEquipmentAffix(item, () => 0.66);
  assert.ok((maxCruel.stats.damageMax ?? 0) - (item.stats.damageMax ?? 0) <= 3);
  const maxSwift = rollEquipmentAffix(item, () => 0.999999);
  assert.ok((maxSwift.stats.agility ?? 0) - (item.stats.agility ?? 0) <= 4);
});

test('crítico do afixo entra no cálculo e respeita o teto de combate de 45%', () => {
  const state = createInitialGameState(1_800_000_000_000);
  const base = calculateDerivedStats(state.baseStats, state.equipped, state.level, state.guildState);
  const criticalItem = {
    ...ITEM_TEMPLATES.gladius_recruit,
    id: 'critical-item',
    affix: 'precise' as const,
    stats: { ...ITEM_TEMPLATES.gladius_recruit.stats, critChancePercent: 3 },
  };
  const withItem = calculateDerivedStats(
    state.baseStats,
    { ...state.equipped, weapon: criticalItem },
    state.level,
    state.guildState
  );
  assert.equal(withItem.critChancePercent, Math.min(45, base.critChancePercent + 3));
  const capped = calculateDerivedStats(
    { ...state.baseStats, skill: 100 },
    { ...state.equipped, weapon: criticalItem },
    state.level,
    state.guildState
  );
  assert.equal(capped.critChancePercent, 45);
});

test('drops usam chance de afixo mais alta para raridades melhores sem garantir afixo', () => {
  const template = ITEM_TEMPLATES.gladius_recruit;
  const item = { ...template, id: 'drop-affix-test', stats: { ...template.stats } };
  assert.equal(getAffixChanceForRarity(0.08, 'common'), 0.08);
  assert.equal(getAffixChanceForRarity(0.08, 'legendary'), 0.14);
  assert.equal(maybeAffixItem(item, 0.08, () => 0.5), item);
  let samples = [0, 0.1];
  const afflicted = maybeAffixItem(item, 0.08, () => samples.shift() ?? 0);
  assert.ok(afflicted.affix);
});


