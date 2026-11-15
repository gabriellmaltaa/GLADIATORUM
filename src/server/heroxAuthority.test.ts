import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createHeroRepository, HeroXAuthority } from './heroxAuthority.ts';

test('arena match settlement banks extracted loot once and unlocks a weapon every third extraction', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'herox-arena-'));
  const oldServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const oldCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
    const authority = new HeroXAuthority(createHeroRepository({ projectId: 'test', databaseId: '(default)', volumePath: path.join(directory, 'state.json') }));
    await authority.bootstrap({ uid: 'runner-1', email: 'runner@example.test', displayName: 'Runner' }, 'sentinel', 1_000);
    for (let i = 1; i <= 3; i++) {
      await authority.completeArenaMatch(
        { uid: 'runner-1', email: 'runner@example.test', displayName: 'Runner' },
        { matchId: `arena_match_${i}`, outcome: 'extracted', carriedXp: 15, carriedGold: 5, weaponIds: ['storm-carbine'] },
        2_000 + i,
      );
    }
    const beforeReplay = await authority.getPlayer('runner-1');
    const replay = await authority.completeArenaMatch(
      { uid: 'runner-1', email: 'runner@example.test', displayName: 'Runner' },
      { matchId: 'arena_match_3', outcome: 'extracted', carriedXp: 15, carriedGold: 5, weaponIds: ['storm-carbine'] },
      9_000,
    );
    const afterReplay = await authority.getPlayer('runner-1');
    assert.equal(beforeReplay?.gold, 15);
    assert.deepEqual(beforeReplay?.weapons, ['pulse-ion', 'storm-carbine', 'phase-blade']);
    assert.equal(beforeReplay?.arenaExtractions, 3);
    assert.equal(replay.replayed, true);
    assert.deepEqual(afterReplay, beforeReplay);

    await authority.bootstrap({ uid: 'runner-2', email: 'runner2@example.test', displayName: 'Runner Two' }, 'outcast', 1_000);
    await authority.completeArenaMatch(
      { uid: 'runner-2', email: 'runner2@example.test', displayName: 'Runner Two' },
      { matchId: 'arena_loss_001', outcome: 'eliminated', carriedXp: 90, carriedGold: 100, weaponIds: ['solar-repeater'] },
      10_000,
    );
    const defeated = await authority.getPlayer('runner-2');
    assert.equal(defeated?.gold, 0);
    assert.deepEqual(defeated?.weapons, ['pulse-ion']);
  } finally {
    if (oldServiceAccount === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = oldServiceAccount;
    if (oldCredentials === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    else process.env.GOOGLE_APPLICATION_CREDENTIALS = oldCredentials;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

