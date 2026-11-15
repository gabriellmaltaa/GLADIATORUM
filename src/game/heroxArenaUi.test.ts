import test from 'node:test';
import assert from 'node:assert/strict';
import { drawUnmirroredText, getArenaBackpackSlots, getArenaFloatingLabel } from './heroxArenaUi';

test('shows six fixed backpack slots and only the loot the player can extract', () => {
  assert.deepEqual(getArenaBackpackSlots({ carriedWeapons: ['storm-carbine'], carriedGold: 50, carriedXp: 15 }), [
    'STORM CARBINE', '+50 OURO', '+15 XP', 'VAZIO', 'VAZIO', 'VAZIO',
  ]);
});

test('keeps all six backpack slots empty before loot is collected', () => {
  assert.deepEqual(getArenaBackpackSlots({ carriedWeapons: [], carriedGold: 0, carriedXp: 0 }), [
    'VAZIO', 'VAZIO', 'VAZIO', 'VAZIO', 'VAZIO', 'VAZIO',
  ]);
});

test('turns combat and loot events into short arcade callouts', () => {
  assert.deepEqual(getArenaFloatingLabel({ type: 'loot_collected', loot: { type: 'gold', amount: 5 } }), { text: '+5 OURO', color: '#ffe06b' });
  assert.deepEqual(getArenaFloatingLabel({ type: 'loot_collected', loot: { type: 'xp', amount: 15 } }), { text: '+15 XP', color: '#72e3ff' });
  assert.deepEqual(getArenaFloatingLabel({ type: 'hit', damage: 24 }), { text: 'POW! −24', color: '#ff8c73' });
  assert.equal(getArenaFloatingLabel({ type: 'loot_collected' }), null);
  assert.equal(getArenaFloatingLabel({ type: 'unknown' }), null);
});

test('cancels the sprite flip while drawing hero name labels', () => {
  const calls: string[] = [];
  const context = { save: () => calls.push('save'), restore: () => calls.push('restore'), scale: (x: number, y: number) => calls.push(`scale:${x},${y}`) };
  drawUnmirroredText(context, -1, () => calls.push('label'));
  assert.deepEqual(calls, ['save', 'scale:-1,1', 'label', 'restore']);
});

