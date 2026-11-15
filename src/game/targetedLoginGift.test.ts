import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OnlineAuthorityEngine } from '../server/onlineAuthorityEngine';

const XXMALTA_UID = 'fB4SJKCiOgU8eEXnpLBimgKglvf1';
const OBSIDIAN_GIFT_TEMPLATES = [
  'obsidian_weapon',
  'obsidian_shield',
  'obsidian_helmet',
  'obsidian_armor',
];

test('XX MALTA recebe quatro equipamentos Obsidiana uma vez e a entrega persiste ao reiniciar', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gladiatorum-xxmalta-gift-'));
  const persistencePath = path.join(tempDir, 'authority.json');
  const now = 1_800_000_000_000;
  const identity = {
    uid: XXMALTA_UID,
    email: 'xxmalta@example.test',
    displayName: 'XX MALTA',
    emailVerified: true,
  };
  const engineOptions = { persistencePath, seedInitialOnlineGuilds: false };

  try {
    const firstLogin = new OnlineAuthorityEngine(engineOptions).bootstrapPlayer(identity, now);
    const giftedItems = firstLogin.state.inventory.filter((item) =>
      OBSIDIAN_GIFT_TEMPLATES.includes(item.templateId),
    );

    assert.equal(giftedItems.length, 4);
    assert.deepEqual(
      new Set(giftedItems.map((item) => item.templateId)),
      new Set(OBSIDIAN_GIFT_TEMPLATES),
    );
    assert.ok(giftedItems.every((item) => item.rarity === 'obsidian'));

    const secondLogin = new OnlineAuthorityEngine(engineOptions).bootstrapPlayer(identity, now + 1);
    assert.equal(
      secondLogin.state.inventory.filter((item) => item.rarity === 'obsidian').length,
      4,
    );

    const otherPlayer = new OnlineAuthorityEngine(engineOptions).bootstrapPlayer(
      { ...identity, uid: 'another_player', displayName: 'Outro Jogador' },
      now + 2,
    );
    assert.equal(otherPlayer.state.inventory.some((item) => item.rarity === 'obsidian'), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
