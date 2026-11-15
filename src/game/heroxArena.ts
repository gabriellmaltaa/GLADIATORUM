export const ARENA_WIDTH = 1600;
export const ARENA_FLOOR = 520;
export const ARENA_MATCH_DURATION_MS = 8 * 60 * 1000 + 42_000;
export const ARENA_EXTRACTION_DELAY_MS = 45_000;
export const ARENA_TICK_MS = 50;

export type ArenaLootType = 'gold' | 'xp' | 'weapon' | 'medkit' | 'energy';
export interface ArenaProfile {
  uid: string;
  heroName: string;
  level?: number;
  attributes: { agility: number; power: number; vitality: number; intellect: number };
  health: number;
  isBot?: boolean;
  weapons?: string[];
}
export interface ArenaInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  power: boolean;
  interact: boolean;
}
export interface ArenaWeapon { id: string; name: string; damage: number; range: number }
export interface ArenaPlayerState {
  uid: string;
  heroName: string;
  isBot: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  facing: -1 | 1;
  onGround: boolean;
  jumpLocked: boolean;
  eliminated: boolean;
  extracted: boolean;
  lastAttackAtMs: number;
  lastPowerAtMs: number;
  carriedGold: number;
  carriedXp: number;
  carriedWeapons: string[];
  attributes: ArenaProfile['attributes'];
  weaponId: string;
}
export interface ArenaLoot {
  id: string;
  type: ArenaLootType;
  x: number;
  y: number;
  amount?: number;
  weaponId?: string;
  collectedBy?: string;
}
export type ArenaEvent =
  | { type: 'loot_collected'; uid: string; loot: ArenaLoot }
  | { type: 'hit'; attackerUid: string; targetUid: string; damage: number; health: number }
  | { type: 'extracted'; uid: string }
  | { type: 'eliminated'; uid: string; byUid: string }
  | { type: 'match_complete'; winnerUid: string | null; reason: 'extraction' | 'elimination' | 'timeout' };
export interface ArenaMatch {
  id: string;
  status: 'active' | 'completed';
  startedAtMs: number;
  endsAtMs: number;
  extractionActiveAtMs: number;
  players: Record<string, ArenaPlayerState>;
  loot: ArenaLoot[];
  winnerUid: string | null;
  completionReason: 'extraction' | 'elimination' | 'timeout' | null;
}

export const ARENA_WEAPONS: readonly ArenaWeapon[] = [
  { id: 'pulse-ion', name: 'Pulso de Íon', damage: 8, range: 104 },
  { id: 'storm-carbine', name: 'Carabina Tempestade', damage: 13, range: 138 },
  { id: 'phase-blade', name: 'Lâmina de Fase', damage: 17, range: 70 },
  { id: 'solar-repeater', name: 'Repetidor Solar', damage: 11, range: 122 },
];
const PLATFORM = [
  { left: 315, right: 575, top: 402 },
  { left: 660, right: 930, top: 320 },
  { left: 1030, right: 1300, top: 402 },
];
const extractionPoints = [80, ARENA_WIDTH - 80];
const weaponById = new Map(ARENA_WEAPONS.map((weapon) => [weapon.id, weapon]));

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const createPlayer = (profile: ArenaProfile, x: number): ArenaPlayerState => {
  const maxHealth = 100 + Math.max(1, Math.floor(profile.level ?? 1)) * 12 + Math.max(0, profile.attributes.vitality) * 8;
  const health = Math.min(maxHealth, Math.max(1, Math.floor(profile.health || maxHealth)));
  const weapons = (profile.weapons ?? []).filter((id) => weaponById.has(id));
  return {
    uid: profile.uid,
    heroName: profile.heroName.slice(0, 24),
    isBot: profile.isBot === true,
    x,
    y: ARENA_FLOOR,
    vx: 0,
    vy: 0,
    health,
    maxHealth,
    energy: 100,
    maxEnergy: 100,
    facing: x < ARENA_WIDTH / 2 ? 1 : -1,
    onGround: true,
    jumpLocked: false,
    eliminated: false,
    extracted: false,
    lastAttackAtMs: 0,
    lastPowerAtMs: 0,
    carriedGold: 0,
    carriedXp: 0,
    carriedWeapons: [],
    attributes: profile.attributes,
    weaponId: weapons[0] ?? 'pulse-ion',
  };
};

export function createArenaMatch(matchId: string, a: ArenaProfile, b: ArenaProfile, now = Date.now()): ArenaMatch {
  if (!matchId || !a.uid || !b.uid || a.uid === b.uid) throw new Error('Dois heróis diferentes são necessários para iniciar a incursão.');
  return {
    id: matchId,
    status: 'active',
    startedAtMs: now,
    endsAtMs: now + ARENA_MATCH_DURATION_MS,
    extractionActiveAtMs: now + ARENA_EXTRACTION_DELAY_MS,
    players: { [a.uid]: createPlayer(a, 190), [b.uid]: createPlayer(b, ARENA_WIDTH - 190) },
    loot: [
      { id: 'loot-gold-1', type: 'gold', x: 410, y: 480, amount: 5 },
      { id: 'loot-xp-1', type: 'xp', x: 790, y: 290, amount: 15 },
      { id: 'loot-medkit-1', type: 'medkit', x: 520, y: 480, amount: 30 },
      { id: 'loot-weapon-1', type: 'weapon', x: 1160, y: 370, weaponId: 'storm-carbine' },
      { id: 'loot-energy-1', type: 'energy', x: 860, y: 290, amount: 35 },
      { id: 'loot-gold-2', type: 'gold', x: 1250, y: 480, amount: 5 },
    ],
    winnerUid: null,
    completionReason: null,
  };
}

function finish(match: ArenaMatch, winnerUid: string | null, reason: NonNullable<ArenaMatch['completionReason']>, events: ArenaEvent[]) {
  if (match.status === 'completed') return;
  match.status = 'completed';
  match.winnerUid = winnerUid;
  match.completionReason = reason;
  events.push({ type: 'match_complete', winnerUid, reason });
}

function collectNearbyLoot(match: ArenaMatch, player: ArenaPlayerState, events: ArenaEvent[]) {
  for (const loot of match.loot) {
    if (loot.collectedBy || Math.abs(player.x - loot.x) > 34 || Math.abs(player.y - loot.y) > 78) continue;
    loot.collectedBy = player.uid;
    player.carriedGold += 5;
    player.carriedXp += 15;
    if (loot.type === 'weapon' && loot.weaponId && weaponById.has(loot.weaponId) && !player.carriedWeapons.includes(loot.weaponId)) {
      player.carriedWeapons.push(loot.weaponId);
      player.weaponId = loot.weaponId;
    } else if (loot.type === 'medkit') player.health = Math.min(player.maxHealth, player.health + (loot.amount ?? 30));
    else if (loot.type === 'energy') player.energy = Math.min(player.maxEnergy, player.energy + (loot.amount ?? 35));
    events.push({ type: 'loot_collected', uid: player.uid, loot: { ...loot } });
  }
}

export function tickArena(match: ArenaMatch, inputs: Record<string, ArenaInput>, now = Date.now()): ArenaEvent[] {
  const events: ArenaEvent[] = [];
  if (match.status !== 'active') return events;
  const players = Object.values(match.players);
  for (const player of players) {
    if (player.eliminated || player.extracted) continue;
    const input = inputs[player.uid] ?? { left: false, right: false, jump: false, attack: false, power: false, interact: false };
    const direction = Number(input.right) - Number(input.left);
    const speed = 4.1 + clamp(player.attributes.agility, 0, 100) * 0.12;
    player.vx = direction * speed;
    if (direction) player.facing = direction > 0 ? 1 : -1;
    player.x = clamp(player.x + player.vx, 20, ARENA_WIDTH - 20);
    if (!input.jump) player.jumpLocked = false;
    if (input.jump && player.onGround && !player.jumpLocked) {
      player.vy = -12.6 - Math.min(player.attributes.agility, 50) * 0.035;
      player.onGround = false;
      player.jumpLocked = true;
    }
    const previousY = player.y;
    player.vy = Math.min(15, player.vy + 0.72);
    player.y += player.vy;
    player.onGround = false;
    for (const platform of PLATFORM) {
      if (previousY <= platform.top && player.y >= platform.top && player.x >= platform.left - 24 && player.x <= platform.right + 24 && player.vy >= 0) {
        player.y = platform.top;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
    if (player.y >= ARENA_FLOOR) {
      player.y = ARENA_FLOOR;
      player.vy = 0;
      player.onGround = true;
    }
    collectNearbyLoot(match, player, events);
    if (input.interact && now >= match.extractionActiveAtMs && extractionPoints.some((point) => Math.abs(player.x - point) <= 70 && player.onGround)) {
      player.extracted = true;
      finish(match, player.uid, 'extraction', events);
      events.push({ type: 'extracted', uid: player.uid });
      break;
    }
    const target = players.find((candidate) => candidate.uid !== player.uid && !candidate.eliminated && !candidate.extracted);
    if (!target) continue;
    const weapon = weaponById.get(player.weaponId) ?? ARENA_WEAPONS[0]!;
    const inRange = Math.abs(target.x - player.x) <= weapon.range && Math.abs(target.y - player.y) <= 92;
    if (input.attack && now - player.lastAttackAtMs >= 700 && inRange) {
      const damage = Math.round(weapon.damage + Math.max(0, player.attributes.power) * 1.25);
      target.health = Math.max(0, target.health - damage);
      player.lastAttackAtMs = now;
      events.push({ type: 'hit', attackerUid: player.uid, targetUid: target.uid, damage, health: target.health });
    }
    if (input.power && player.energy >= 35 && now - player.lastPowerAtMs >= 4_000 && inRange) {
      const damage = Math.round((weapon.damage + player.attributes.power * 1.25) * (1.35 + Math.min(100, player.attributes.intellect) * 0.005));
      target.health = Math.max(0, target.health - damage);
      player.energy -= 35;
      player.lastPowerAtMs = now;
      events.push({ type: 'hit', attackerUid: player.uid, targetUid: target.uid, damage, health: target.health });
    }
    if (target.health <= 0) {
      target.eliminated = true;
      target.carriedGold = 0;
      target.carriedXp = 0;
      target.carriedWeapons = [];
      finish(match, player.uid, 'elimination', events);
      events.push({ type: 'eliminated', uid: target.uid, byUid: player.uid });
      break;
    }
  }
  if (match.status === 'active' && now >= match.endsAtMs) {
    const a = players[0]!;
    const b = players[1]!;
    const winner = a.health === b.health ? null : a.health > b.health ? a.uid : b.uid;
    finish(match, winner, 'timeout', events);
    for (const player of players) {
      if (!player.extracted) { player.carriedGold = 0; player.carriedXp = 0; player.carriedWeapons = []; }
    }
  }
  return events;
}

export function arenaSnapshot(match: ArenaMatch, now = Date.now()) {
  return {
    id: match.id,
    status: match.status,
    remainingMs: Math.max(0, match.endsAtMs - now),
    extractionActive: now >= match.extractionActiveAtMs,
    winnerUid: match.winnerUid,
    completionReason: match.completionReason,
    players: Object.fromEntries(Object.entries(match.players).map(([uid, player]) => [uid, {
      uid, heroName: player.heroName, isBot: player.isBot, x: player.x, y: player.y, health: player.health, maxHealth: player.maxHealth,
      energy: player.energy, maxEnergy: player.maxEnergy, facing: player.facing, eliminated: player.eliminated,
      extracted: player.extracted, carriedGold: player.carriedGold, carriedXp: player.carriedXp,
      carriedWeapons: [...player.carriedWeapons], weaponId: player.weaponId,
    }])),
    loot: match.loot.filter((loot) => !loot.collectedBy).map((loot) => ({ ...loot })),
  };
}

