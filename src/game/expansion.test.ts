import test from 'node:test';
import assert from 'node:assert/strict';
import { ENDGAME_REGIONS, EXPANSION_ITEMS, EXPANSION_REGIONS, OBSIDIAN_ITEMS } from './expansion';
import { DUNGEONS, ITEM_TEMPLATES, EXPEDITION_REGIONS, INITIAL_MARKET_TEMPLATE_IDS } from './config';
import { createInitialGameState, claimPendingReward, buyItemFromMarket, createItemFromTemplate, resolveCombat, sellItemFromInventory } from './rules';
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

test('regiões de expansão e endgame têm progressão e pools de loot válidos', () => {
  assert.equal(EXPANSION_REGIONS.length, 3);
  assert.equal(ENDGAME_REGIONS.length, 14);
  assert.equal(EXPEDITION_REGIONS.length, 20);
  for (const region of EXPEDITION_REGIONS) {
    for (const enemy of region.enemies) for (const id of enemy.dropPool) assert.ok(ITEM_TEMPLATES[id], id);
  }
});

test('novas expedições cobrem os níveis 60 a 150 e liberam o jackpot secreto somente em chefes', () => {
  const highLevelRegions = ENDGAME_REGIONS.slice(4);
  assert.deepEqual(highLevelRegions.map(region => region.minLevel), [60, 70, 80, 90, 100, 110, 120, 130, 140, 150]);
  for (const region of highLevelRegions) {
    assert.deepEqual(region.enemies.map(enemy => enemy.level), [region.minLevel - 2, region.minLevel - 1, region.minLevel]);
    const boss = region.enemies.at(-1)!;
    assert.ok(boss.specialDropChance !== undefined && boss.specialDropChance > 0.001 && boss.specialDropChance <= 0.002);
    assert.deepEqual(new Set(boss.specialDropPool), new Set(Object.keys(OBSIDIAN_ITEMS)));
    assert.ok(region.enemies.slice(0, -1).every(enemy => enemy.specialDropChance === undefined));
  }
});

test('masmorras avançadas cobrem até nível 150 e chefes de alto nível podem liberar Obsidiana', () => {
  const highLevelDungeons = DUNGEONS.filter(dungeon => dungeon.minLevel >= 40);
  assert.deepEqual(highLevelDungeons.map(dungeon => dungeon.minLevel), [40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]);
  assert.equal(Math.max(...DUNGEONS.map(dungeon => dungeon.minLevel)), 150);
  for (const dungeon of highLevelDungeons.filter(dungeon => dungeon.minLevel >= 50)) {
    const boss = dungeon.encounters.at(-1)!;
    assert.equal(boss.specialDropChance, 0.001 + Math.max(0, dungeon.minLevel - 50) / 100_000);
    assert.deepEqual(new Set(boss.specialDropPool), new Set(Object.keys(OBSIDIAN_ITEMS)));
  }
});

test('gladiador de nível 150 com arsenal Transcendente consegue vencer o chefe final', () => {
  const state = createInitialGameState(1_000_000);
  state.level = 150;
  state.baseStats = { strength: 1_000, skill: 1_000, agility: 1_000, constitution: 1_000, charisma: 1_000, intelligence: 1_000 };
  for (const item of Object.values(ITEM_TEMPLATES).filter(item => item.rarity === 'transcendent')) {
    state.equipped[item.slot] = createItemFromTemplate(item.templateId, `level150_${item.slot}`);
  }
  state.currentHp = 100_000;
  const finalDungeon = DUNGEONS.find(dungeon => dungeon.minLevel === 150)!;
  const outcome = resolveCombat(state, finalDungeon.encounters.at(-1)!, {
    mode: 'dungeon', locationName: finalDungeon.name, seed: 15150, timestampMs: 1_000_001,
  });
  assert.equal(outcome.report.victory, true, JSON.stringify({ rounds: outcome.report.rounds, playerDamage: outcome.report.totalPlayerDamageDealt, enemyDamage: outcome.report.totalEnemyDamageDealt, playerHp: outcome.report.playerEndHp, enemyHp: outcome.report.enemyEndHp }));
  assert.equal(outcome.report.enemyLevel, 150);
  assert.ok(outcome.rewardBatch.xp >= 1);
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
  assert.equal(claimed.state.mailbox, undefined);
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
  assert.equal(paid.state.mailbox, undefined);
  const duplicate = engine.executeAction(identity.uid, { opId: 'contract_duplicate', action: 'claim_contract', params: { contractId: 'first_blood' } }, now + 5);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.state.gold, paid.state.gold);
});

test('servidor rejeita expansão de mochila sem saldo e preserva ouro e capacidade', () => {
  const engine = new OnlineAuthorityEngine();
  const now = 1_750_000_100_000;
  const identity = { uid: 'inventory_expansion_tester', email: 'inventory@example.test', displayName: 'Auditor' };
  const imported = createInitialGameState(now);
  imported.gold = 200;
  assert.equal(engine.migrateLocalSave(identity, JSON.stringify(imported), now).ok, true);
  const first = engine.executeAction(identity.uid, { opId: 'buy_bag_1', action: 'buy_inventory_expansion', params: {} }, now + 10);
  assert.equal(first.ok, false);
  assert.equal(first.state.inventoryCapacity, 20);
  assert.equal(first.state.gold, 200);
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
