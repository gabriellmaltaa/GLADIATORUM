import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPANSION_ITEMS, EXPANSION_REGIONS } from './expansion';
import { ITEM_TEMPLATES, EXPEDITION_REGIONS, INITIAL_MARKET_TEMPLATE_IDS } from './config';
import { createInitialGameState, claimPendingReward, buyItemFromMarket, sellItemFromInventory } from './rules';
import { OnlineAuthorityEngine } from '../server/onlineAuthorityEngine';
import { CONTRACTS, claimContract, contractProgress } from './contracts';

test('48 equipamentos novos possuem IDs únicos, oito slots e origem obtível', () => {
  assert.equal(Object.keys(EXPANSION_ITEMS).length, 48);
  const items = Object.values(EXPANSION_ITEMS);
  assert.equal(new Set(items.map(i => i.templateId)).size, 48);
  assert.equal(new Set(items.map(i => i.slot)).size, 8);
  for (const item of items) {
    assert.ok(ITEM_TEMPLATES[item.templateId]);
    assert.ok(item.buyPrice > item.sellPrice && item.sellPrice > 0);
    assert.ok(INITIAL_MARKET_TEMPLATE_IDS.includes(item.templateId) ||
      EXPEDITION_REGIONS.some(r => r.enemies.some(e => e.dropPool.includes(item.templateId))));
  }
});

test('três novas regiões têm progressão e pools de loot válidos', () => {
  assert.equal(EXPANSION_REGIONS.length, 3);
  assert.equal(EXPEDITION_REGIONS.length, 6);
  for (const region of EXPEDITION_REGIONS) {
    for (const enemy of region.enemies) for (const id of enemy.dropPool) assert.ok(ITEM_TEMPLATES[id], id);
  }
});

test('contrato bloqueia requisito não cumprido e paga uma única vez', () => {
  const state = createInitialGameState(1_000_000);
  const contract = CONTRACTS.find(c => c.id === 'first_blood')!;
  assert.equal(claimContract(state, contract.id).error !== undefined, true);
  state.wins = 1;
  assert.equal(contractProgress(state, contract), 1);
  const claimed = claimContract(state, contract.id);
  assert.equal(claimed.error, undefined);
  assert.equal(claimed.state.gold, 200);
  const restored = JSON.parse(JSON.stringify(claimed.state));
  assert.ok(claimContract(restored, contract.id).error);
  assert.equal(claimContract(restored, contract.id).state.gold, 200);
  assert.ok(claimContract(state, 'unknown').error);
});

test('tutorial reconhece equipamento vestido antes do resgate', () => {
  const state = createInitialGameState(1_000_000);
  state.tutorial.step = 'claim_reward';
  state.equipped.helmet = state.inventory.find(i => i.slot === 'helmet')!;
  state.pendingRewards = [{ claimId: 'tutorial_claim', sourceTitle: 'Teste', sourceMode: 'expedition', focusMode: 'gold', createdAt: 1_000_000, gold: 1, xp: 1, honor: 0, items: [], cyclesCompleted: 1, victories: 1, defeats: 0, elapsedSecondsAccounted: 0, wasCappedAtMaxOffline: false, claimed: false }];
  assert.equal(claimPendingReward(state, 'tutorial_claim').state.tutorial.step, 'train_stat');
});

test('servidor valida contrato por conta e rejeita novo opId para contrato já recolhido', () => {
  const engine = new OnlineAuthorityEngine();
  const now = 1_750_000_000_000;
  const identity = { uid: 'contract_tester', email: 'contract@example.test', displayName: 'Auditor' };
  engine.bootstrapPlayer(identity, now);
  const denied = engine.executeAction(identity.uid, { opId: 'contract_denied', action: 'claim_contract', params: { contractId: 'first_blood' } }, now + 1);
  assert.equal(denied.ok, false);
  engine.executeAction(identity.uid, { opId: 'contract_fight', action: 'start_expedition', params: { regionId: EXPEDITION_REGIONS[0].id, enemyIndex: 0 } }, now + 2);
  const before = engine.bootstrapPlayer(identity, now + 3);
  assert.equal(before.state.wins, 1);
  const paid = engine.executeAction(identity.uid, { opId: 'contract_paid', action: 'claim_contract', params: { contractId: 'first_blood' } }, now + 4);
  assert.equal(paid.ok, true);
  assert.equal(paid.state.gold, before.state.gold + 40);
  const duplicate = engine.executeAction(identity.uid, { opId: 'contract_duplicate', action: 'claim_contract', params: { contractId: 'first_blood' } }, now + 5);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.state.gold, paid.state.gold);
});

test('coleção preserva descoberta após comprar, vender e carregar o save', () => {
  const state = createInitialGameState(1_000_000);
  const market = state.marketStock.find(i => i.templateId === 'collection_capua_weapon')!;
  const bought = buyItemFromMarket(state, market.id, 1_000_001).state;
  const item = bought.inventory[bought.inventory.length - 1];
  const sold = sellItemFromInventory(bought, item.id).state;
  assert.ok(JSON.parse(JSON.stringify(sold)).discoveredTemplates.includes(market.templateId));
});

test('espólio convertido por mochila cheia continua descoberto na coleção', () => {
  const state = createInitialGameState(1_000_000);
  state.inventory = Array.from({ length: 20 }, (_, i) => ({ ...state.inventory[0], id: `full_${i}` }));
  const rewardItem = { ...EXPANSION_ITEMS.collection_ostia_weapon, id: 'overflow_new_drop' };
  state.pendingRewards = [{ claimId: 'overflow_discovery', sourceTitle: 'Teste', sourceMode: 'expedition', focusMode: 'loot', createdAt: 1_000_000, gold: 1, xp: 1, honor: 0, items: [rewardItem], cyclesCompleted: 1, victories: 1, defeats: 0, elapsedSecondsAccounted: 0, wasCappedAtMaxOffline: false, claimed: false }];
  const claimed = claimPendingReward(state, 'overflow_discovery').state;
  assert.equal(claimed.inventory.length, 20);
  assert.ok(claimed.discoveredTemplates?.includes(rewardItem.templateId));
});
