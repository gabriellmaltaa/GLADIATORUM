import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARENA_EXTRACTION_DELAY_MS,
  createArenaMatch,
  tickArena,
  type ArenaInput,
  type ArenaProfile,
} from './heroxArena.ts';

const profile = (uid: string, agility = 0, power = 0, intellect = 0): ArenaProfile => ({
  uid,
  heroName: uid,
  attributes: { agility, power, vitality: 0, intellect },
  health: 100,
  weapons: ['pulse-ion'],
});

const idle = (extra: Partial<ArenaInput> = {}): ArenaInput => ({ left: false, right: false, jump: false, attack: false, power: false, interact: false, ...extra });

test('agility increases movement speed and strength increases server-calculated damage', () => {
  const slow = createArenaMatch('match-slow', profile('slow'), profile('rival'), 1_000);
  const fast = createArenaMatch('match-fast', profile('fast', 20), profile('rival'), 1_000);
  const slowStart = slow.players.slow.x;
  const fastStart = fast.players.fast.x;
  tickArena(slow, { slow: idle({ right: true }), rival: idle() }, 1_100);
  tickArena(fast, { fast: idle({ right: true }), rival: idle() }, 1_100);
  assert.ok(fast.players.fast.x - fastStart > slow.players.slow.x - slowStart);

  const strong = createArenaMatch('match-strong', profile('strong', 0, 20), profile('target'), 1_000);
  strong.players.strong.x = strong.players.target.x - 60;
  strong.players.strong.facing = 1;
  const health = strong.players.target.health;
  tickArena(strong, { strong: idle({ attack: true }), target: idle() }, 2_000);
  assert.ok(health - strong.players.target.health > 17);
});

test('jump and arena movement stay within the floor and world bounds', () => {
  const match = createArenaMatch('match-physics', profile('a'), profile('b'), 1_000);
  const hero = match.players.a;
  hero.x = 25;
  const floor = hero.y;
  tickArena(match, { a: idle({ left: true, jump: true }), b: idle() }, 1_100);
  assert.ok(hero.x >= 20);
  assert.ok(hero.y < floor);
  for (let now = 1_120; now < 3_000; now += 20) tickArena(match, { a: idle(), b: idle() }, now);
  assert.equal(hero.y, 520);
  assert.equal(hero.onGround, true);
});

test('loot is carried during a run but only extracted at an active point', () => {
  const now = 1_000_000;
  const match = createArenaMatch('match-loot', profile('a'), profile('b'), now - ARENA_EXTRACTION_DELAY_MS);
  const hero = match.players.a;
  const loot = match.loot.find((item) => item.type === 'gold');
  assert.ok(loot);
  hero.x = loot.x;
  hero.y = loot.y;
  const events = tickArena(match, { a: idle(), b: idle() }, now);
  assert.ok(events.some((event) => event.type === 'loot_collected' && event.uid === 'a'));
  assert.equal(hero.carriedGold, 5);
  assert.equal(hero.carriedXp, 15);
  assert.equal(hero.extracted, false);

  hero.x = 80;
  hero.y = 520;
  hero.onGround = true;
  const extraction = tickArena(match, { a: idle({ interact: true }), b: idle() }, now + 20);
  assert.ok(extraction.some((event) => event.type === 'extracted' && event.uid === 'a'));
  assert.equal(hero.extracted, true);
  assert.equal(match.players.b.extracted, false);
});

test('vitality and level define maximum health while an injured profile keeps its current health', () => {
  const healthy = createArenaMatch('match-health', { ...profile('healthy'), level: 1, health: 152, attributes: { agility: 0, power: 0, vitality: 5, intellect: 0 } }, profile('rival'), 1_000);
  assert.equal(healthy.players.healthy.maxHealth, 152);
  assert.equal(healthy.players.healthy.health, 152);
  const injured = createArenaMatch('match-injured', { ...profile('injured'), level: 4, health: 90, attributes: { agility: 0, power: 0, vitality: 5, intellect: 0 } }, profile('rival'), 1_000);
  assert.equal(injured.players.injured.maxHealth, 188);
  assert.equal(injured.players.injured.health, 90);
});

test('a collected weapon becomes active for the current run but remains unbanked until extraction', () => {
  const match = createArenaMatch('match-weapon', profile('a'), profile('b'), 1_000);
  const hero = match.players.a;
  const weapon = match.loot.find((item) => item.type === 'weapon');
  assert.ok(weapon);
  hero.x = weapon.x;
  hero.y = weapon.y;
  tickArena(match, {}, 1_100);
  assert.equal(hero.weaponId, 'storm-carbine');
  assert.deepEqual(hero.carriedWeapons, ['storm-carbine']);
  assert.equal(hero.extracted, false);
});

test('a KO ends the round and disconnect-like elimination does not bank carried loot', () => {
  const match = createArenaMatch('match-ko', profile('a', 0, 20), profile('b'), 1_000);
  const attacker = match.players.a;
  const target = match.players.b;
  attacker.x = target.x - 60;
  attacker.facing = 1;
  target.health = 12;
  target.carriedGold = 30;
  const events = tickArena(match, { a: idle({ attack: true }), b: idle() }, 2_000);
  assert.equal(match.status, 'completed');
  assert.equal(match.winnerUid, 'a');
  assert.equal(target.carriedGold, 0);
  assert.ok(events.some((event) => event.type === 'eliminated' && event.uid === 'b'));
});

