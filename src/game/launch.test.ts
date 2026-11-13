import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OnlineAuthorityEngine } from '../server/onlineAuthorityEngine';
import { createInitialGameState } from './rules';

test('lançamento faz backup, reinicia progresso uma vez e bloqueia migração antiga', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gladiatorum-launch-'));
  const file = path.join(dir, 'state.json');
  const identity = { uid: 'launch_player', email: 'launch@example.test', displayName: 'Veterano' };
  const now = 1_750_000_000_000;
  try {
    const old = new OnlineAuthorityEngine({ persistencePath: file });
    old.bootstrapPlayer(identity, now);
    old.executeAction(identity.uid, { opId: 'old_training', action: 'train_stat', params: { stat: 'strength' } }, now + 1);
    const before = fs.readFileSync(file, 'utf-8');
    const options = { persistencePath: file, seedInitialOnlineGuilds: false, launchId: 'public-launch-1' };
    const launched = new OnlineAuthorityEngine(options);
    const fresh = launched.bootstrapPlayer(identity, now + 2);
    assert.equal(fresh.state.gold, 160);
    assert.equal(fresh.state.baseStats.strength, 8);
    assert.equal(fresh.state.honor, 0);
    assert.equal(fresh.state.fame, 0);
    assert.equal(fresh.state.guildState.guilds.length, 0);
    const backups = fs.readdirSync(dir).filter(n => n.includes('prelaunch'));
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(dir, backups[0]), 'utf-8'), before);
    const migrated = launched.migrateLocalSave(identity.uid, JSON.stringify(createInitialGameState(now)), now + 3);
    assert.equal(migrated.ok, false);
    const trained = launched.executeAction(identity.uid, { opId: 'new_training', action: 'train_stat', params: { stat: 'strength' } }, now + 4);
    const restarted = new OnlineAuthorityEngine(options).bootstrapPlayer(identity, now + 5);
    assert.equal(restarted.state.gold, trained.state.gold);
    assert.equal(restarted.state.baseStats.strength, 9);
    assert.equal(fs.readdirSync(dir).filter(n => n.includes('prelaunch')).length, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
