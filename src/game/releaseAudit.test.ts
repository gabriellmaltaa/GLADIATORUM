import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createInitialGameState, calculateElapsedIdleProgress, resolveCombat,
  buyItemFromMarket, useMedicineFromInventory, inspectAndLoadSaveState } from './rules';
import { EXPEDITION_REGIONS, GAME_CONFIG } from './config';
import { OnlineAuthorityEngine } from '../server/onlineAuthorityEngine';

test('Auditoria: motor carrega no Node nativo usado em produção, sem resolver do bundler', () => {
  const output = execFileSync(process.execPath, ['--input-type=module', '-e',
    "import('./src/server/onlineAuthorityEngine.ts').then(() => console.log('native-runtime-ok'))"],
    { cwd: process.cwd(), encoding: 'utf-8' });
  assert.equal(output.trim(), 'native-runtime-ok');
});

test('Auditoria: relógio retrocedendo não concede recursos nem altera referência', () => {
  const state = { ...createInitialGameState(1_000_000), energy: 0, currentHp: 10 };
  const result = calculateElapsedIdleProgress(state, 900_000);
  assert.equal(result.state, state);
  assert.equal(result.offlineBatchCreated, null);
});

test('Auditoria: 24h offline de patrulha contabilizam somente o teto de 8h', () => {
  const state = createInitialGameState(1_000_000);
  state.idle.active = true;
  const result = calculateElapsedIdleProgress(state, 1_000_000 + 86_400_000);
  assert.ok(result.offlineBatchCreated);
  assert.equal(result.offlineBatchCreated.elapsedSecondsAccounted, 28_800);
  assert.equal(result.offlineBatchCreated.wasCappedAtMaxOffline, true);
  assert.ok(result.state.energy >= 0 && result.state.energy <= state.maxEnergy);
  const replay = calculateElapsedIdleProgress(result.state, 1_000_000 + 86_400_000);
  assert.equal(replay.offlineBatchCreated, null);
});

test('Auditoria: combate com mesma semente e timestamp reproduz relatório e espólios', () => {
  const state = createInitialGameState(1_000_000);
  const options = { mode: 'expedition' as const, locationName: 'Teste', seed: 42, timestampMs: 1_000_000 };
  const a = resolveCombat(state, EXPEDITION_REGIONS[0].enemies[0], options);
  const b = resolveCombat(state, EXPEDITION_REGIONS[0].enemies[0], options);
  assert.deepEqual(a, b);
  assert.equal(state.gold, 160, 'simular combate não deve creditar ouro no estado original');
});

test('Auditoria: compra com mochila cheia preserva ouro e inventário', () => {
  const state = createInitialGameState(1_000_000);
  state.gold = 10_000;
  state.inventory = Array.from({ length: GAME_CONFIG.maxInventorySlots }, (_, i) => ({ ...state.inventory[0], id: `full_${i}` }));
  const result = buyItemFromMarket(state, state.marketStock[0].id, 1_000_001);
  assert.ok(result.error);
  assert.equal(result.state.gold, 10_000);
  assert.equal(result.state.inventory.length, GAME_CONFIG.maxInventorySlots);
});

test('Auditoria: compra de item inexistente não gasta saldo', () => {
  const state = createInitialGameState(1_000_000);
  const result = buyItemFromMarket(state, 'item_inexistente', 1_000_001);
  assert.ok(result.error);
  assert.equal(result.state.gold, 160);
});

test('Auditoria: medicina com PV e energia cheios não consome item', () => {
  const state = createInitialGameState(1_000_000);
  const bandage = state.inventory.find(i => i.templateId === 'med_bandage_linen')!;
  const result = useMedicineFromInventory(state, bandage.id, 1_000_001);
  assert.ok(result.error);
  assert.equal(result.state.inventory.length, state.inventory.length);
});

test('Auditoria: JSON truncado preserva dados originais para recuperação', () => {
  const raw = '{"level":2,"gold":';
  const result = inspectAndLoadSaveState(raw, 1_000_000);
  assert.equal(result.status, 'corrupted');
  assert.equal(result.rawCorruptedData, raw);
});

test('Auditoria: nova instância do servidor restaura progresso e operação repetida do disco', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gladiatorum-audit-'));
  const file = path.join(dir, 'state.json');
  const identity = { uid: 'audit_player', email: 'audit@example.test', displayName: 'Auditor' };
  const now = 1_750_000_000_000;
  try {
    const engine = new OnlineAuthorityEngine({ persistencePath: file });
    engine.bootstrapPlayer(identity, now);
    const action = { opId: 'audit_train_once', action: 'train_stat' as const, params: { stat: 'strength' } };
    const trained = engine.executeAction(identity.uid, action, now + 1000);
    assert.equal(trained.ok, true);
    assert.equal(fs.existsSync(file), true);
    const restarted = new OnlineAuthorityEngine({ persistencePath: file });
    const loaded = restarted.bootstrapPlayer(identity, now + 2000);
    assert.equal(loaded.state.gold, trained.state.gold);
    assert.equal(loaded.state.baseStats.strength, trained.state.baseStats.strength);
    const replay = restarted.executeAction(identity.uid, action, now + 3000);
    assert.equal(replay.state.gold, trained.state.gold);
    assert.equal(replay.state.baseStats.strength, trained.state.baseStats.strength);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
