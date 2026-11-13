import test from 'node:test';
import assert from 'node:assert/strict';
import { getCharacterAppearance } from './appearance';
import { createInitialGameState } from './rules';

test('aparência mostra apenas os itens realmente equipados e acompanha remoção', () => {
  const state = createInitialGameState(1000);
  const before = JSON.stringify(state.equipped);
  const appearance = getCharacterAppearance(state.equipped, 1);
  assert.equal(appearance.layers.weapon?.iconId, state.equipped.weapon?.iconId);
  assert.equal(appearance.layers.armor?.iconId, state.equipped.armor?.iconId);
  assert.equal(appearance.layers.helmet, undefined);
  assert.equal(JSON.stringify(state.equipped), before);
  const removed = getCharacterAppearance({ ...state.equipped, armor: undefined, shield: undefined }, 1);
  assert.equal(removed.layers.armor, undefined);
  assert.equal(removed.layers.shield, undefined);
  assert.deepEqual(getCharacterAppearance({}, 1).layers, {});
});

test('aura cresce com o nível e muda de patamar sem depender dos equipamentos', () => {
  assert.equal(getCharacterAppearance({}, 1).aura.strength, 0);
  for (let level = 2; level <= 50; level++) {
    assert.ok(getCharacterAppearance({}, level).aura.strength > getCharacterAppearance({}, level - 1).aura.strength);
  }
  const colors = [5, 10, 20, 35, 50].map(level => getCharacterAppearance({}, level).aura.color);
  assert.equal(new Set(colors).size, 5);
  assert.equal(getCharacterAppearance({}, 5000).aura.strength, 1);
  assert.equal(getCharacterAppearance({}, NaN).aura.strength, 0);
  assert.equal(getCharacterAppearance({}, -5).aura.strength, 0);
});

test('consumíveis e itens colocados no slot errado não viram roupa', () => {
  const state = createInitialGameState(1000);
  const medicine = state.inventory.find(item => item.consumable)!;
  assert.ok(medicine);
  const appearance = getCharacterAppearance({ amulet: medicine, helmet: state.equipped.weapon }, 20);
  assert.deepEqual(appearance.layers, {});
});

test('retrato pintado segue a couraça e volta ao corpo neutro ao removê-la', () => {
  const state = createInitialGameState(1000);
  const armor = state.equipped.armor!;
  assert.equal(getCharacterAppearance({}, 1).bodyColumn, 0);
  assert.equal(getCharacterAppearance({ weapon: state.equipped.weapon }, 1).bodyColumn, 0);
  assert.equal(getCharacterAppearance({ armor: { ...armor, iconId: 'lorica_leather' } }, 1).bodyColumn, 1);
  assert.equal(getCharacterAppearance({ armor: { ...armor, iconId: 'lorica_segmentata' } }, 1).bodyColumn, 2);
  assert.equal(getCharacterAppearance({ armor: { ...armor, iconId: 'lorica_hamata' } }, 1).bodyColumn, 3);
});
