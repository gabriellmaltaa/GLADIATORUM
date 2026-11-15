import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

export type HeroFaction = 'sentinel' | 'outcast';
export type HeroAttribute = 'power' | 'agility' | 'intellect' | 'vitality';
export type HeroPowerId = 'kinetic-burst' | 'aegis-field' | 'phase-step' | 'overload' | 'last-stand';

export interface HeroPlayer {
  uid: string;
  email: string;
  heroName: string;
  faction: HeroFaction;
  level: number;
  xp: number;
  honor: number;
  wins: number;
  losses: number;
  attributes: Record<HeroAttribute, number>;
  attributePoints: number;
  powerPoints: number;
  powers: HeroPowerId[];
  health: number;
  energy: number;
  lastEnergyAtMs: number;
  campaign: { chapter: number; mission: number; completed: number };
  recentOperationIds: string[];
  lastArenaAtMs: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface HeroIdentity {
  uid: string;
  email: string;
  displayName: string;
}

export const HEROX_CATALOG = {
  levelCap: 150,
  factions: [
    { id: 'sentinel', name: 'Sentinela', description: 'Protege os distritos e as pessoas da cidade.' },
    { id: 'outcast', name: 'Dissidente', description: 'Enfrenta o sistema e disputa o controle da cidade.' },
  ] as const,
  attributes: [
    { id: 'power', name: 'Poder', description: 'Aumenta o dano dos ataques.' },
    { id: 'agility', name: 'Agilidade', description: 'Aumenta a iniciativa e a chance de esquiva.' },
    { id: 'intellect', name: 'Intelecto', description: 'Melhora a eficiência de habilidades.' },
    { id: 'vitality', name: 'Vitalidade', description: 'Aumenta a vida máxima.' },
  ] as const,
  powers: [
    { id: 'kinetic-burst', name: 'Impacto Cinético', unlockLevel: 1, cost: 0, damage: 1.25, cooldown: 0 },
    { id: 'aegis-field', name: 'Campo Égide', unlockLevel: 5, cost: 1, damage: 0.65, cooldown: 2 },
    { id: 'phase-step', name: 'Passo de Fase', unlockLevel: 12, cost: 1, damage: 0.9, cooldown: 2 },
    { id: 'overload', name: 'Sobrecarga', unlockLevel: 25, cost: 2, damage: 1.8, cooldown: 3 },
    { id: 'last-stand', name: 'Último Recurso', unlockLevel: 40, cost: 2, damage: 1.45, cooldown: 3 },
  ] as const,
  chapters: [
    { id: 1, title: 'Sinais no Centro', district: 'Centro', missions: 10, threat: 1 },
    { id: 2, title: 'Sombras do Porto', district: 'Porto', missions: 10, threat: 1.5 },
    { id: 3, title: 'Cerco ao Distrito Industrial', district: 'Zona Industrial', missions: 10, threat: 2.2 },
    { id: 4, title: 'A Cidade Dividida', district: 'Setor Norte', missions: 10, threat: 3 },
    { id: 5, title: 'O Protocolo HÉROX', district: 'Distrito Zero', missions: 10, threat: 4 },
  ] as const,
};

type State = { players: Record<string, HeroPlayer> };
type Persistence = 'firestore' | 'railway-volume';

interface TransactionView {
  players: Map<string, HeroPlayer | null>;
}

interface HeroRepository {
  readonly persistence: Persistence;
  transact<T>(uids: string[], mutate: (view: TransactionView) => { value: T; writes: HeroPlayer[] }): Promise<T>;
  top(limit: number): Promise<HeroPlayer[]>;
}

class FileHeroRepository implements HeroRepository {
  readonly persistence = 'railway-volume' as const;
  private readonly pathName: string;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(pathName: string) {
    this.pathName = pathName;
  }

  private read(): State {
    if (!fs.existsSync(this.pathName)) return { players: {} };
    const parsed = JSON.parse(fs.readFileSync(this.pathName, 'utf8')) as Partial<State>;
    return { players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {} };
  }

  private write(state: State) {
    fs.mkdirSync(path.dirname(this.pathName), { recursive: true });
    const temporary = `${this.pathName}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(state), 'utf8');
    fs.renameSync(temporary, this.pathName);
  }

  async transact<T>(uids: string[], mutate: (view: TransactionView) => { value: T; writes: HeroPlayer[] }): Promise<T> {
    const previous = this.chain;
    let release!: () => void;
    this.chain = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const state = this.read();
      const unique = [...new Set(uids)];
      const view = { players: new Map(unique.map((uid) => [uid, state.players[uid] ?? null])) };
      const result = mutate(view);
      for (const player of result.writes) state.players[player.uid] = player;
      if (result.writes.length) this.write(state);
      return result.value;
    } finally {
      release();
    }
  }

  async top(limit: number): Promise<HeroPlayer[]> {
    return Object.values(this.read().players)
      .sort((a, b) => b.honor - a.honor || b.level - a.level || a.heroName.localeCompare(b.heroName))
      .slice(0, limit);
  }
}

class FirestoreHeroRepository implements HeroRepository {
  readonly persistence = 'firestore' as const;
  private readonly db: Firestore;
  private readonly collection = 'herox_players';

  constructor(db: Firestore) {
    this.db = db;
  }

  async transact<T>(uids: string[], mutate: (view: TransactionView) => { value: T; writes: HeroPlayer[] }): Promise<T> {
    const unique = [...new Set(uids)];
    return this.db.runTransaction(async (transaction) => {
      const refs = unique.map((uid) => this.db.collection(this.collection).doc(uid));
      const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
      const view = {
        players: new Map(unique.map((uid, index) => [uid, snapshots[index].exists ? snapshots[index].data() as HeroPlayer : null])),
      };
      const result = mutate(view);
      for (const player of result.writes) {
        transaction.set(this.db.collection(this.collection).doc(player.uid), player);
      }
      return result.value;
    });
  }

  async top(limit: number): Promise<HeroPlayer[]> {
    const snapshot = await this.db.collection(this.collection)
      .orderBy('honor', 'desc').limit(limit).get();
    return snapshot.docs.map((doc) => doc.data() as HeroPlayer);
  }
}

export function createHeroRepository(options: { projectId: string; databaseId: string; volumePath: string }): HeroRepository {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const existing = getApps().find((candidate) => candidate.name === 'herox-backend');
  if (serviceAccountJson || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    let app = existing;
    if (!app) {
      const credential = serviceAccountJson
        ? cert(JSON.parse(serviceAccountJson) as ServiceAccount)
        : applicationDefault();
      app = initializeApp({ credential, projectId: options.projectId }, 'herox-backend');
    }
    return new FirestoreHeroRepository(getFirestore(app, options.databaseId));
  }
  return new FileHeroRepository(options.volumePath);
}

const xpForNextLevel = (level: number) => Math.floor(80 + level * 42 + level * level * 3.5);
const maxHealth = (player: HeroPlayer) => 100 + player.level * 12 + player.attributes.vitality * 8;
const attributeNames: HeroAttribute[] = ['power', 'agility', 'intellect', 'vitality'];
const powerIds = new Set<string>(HEROX_CATALOG.powers.map((power) => power.id));

type PublicHeroPlayer = Omit<HeroPlayer, 'email' | 'recentOperationIds'>;

function publicPlayer(player: HeroPlayer): PublicHeroPlayer {
  const { email: _email, recentOperationIds: _operations, ...publicData } = player;
  return publicData;
}

function makePlayer(identity: HeroIdentity, faction: HeroFaction, now: number): HeroPlayer {
  const name = (identity.displayName || 'Novo Herói').trim().replace(/[<>]/g, '').slice(0, 24);
  return {
    uid: identity.uid,
    email: identity.email,
    heroName: name.length >= 2 ? name : 'Novo Herói',
    faction,
    level: 1,
    xp: 0,
    honor: 0,
    wins: 0,
    losses: 0,
    attributes: { power: 5, agility: 5, intellect: 5, vitality: 5 },
    attributePoints: 0,
    powerPoints: 0,
    powers: ['kinetic-burst'],
    health: 152,
    energy: 100,
    lastEnergyAtMs: now,
    campaign: { chapter: 1, mission: 1, completed: 0 },
    recentOperationIds: [],
    lastArenaAtMs: 0,
    createdAtMs: now,
    updatedAtMs: now,
  };
}

function grantXp(player: HeroPlayer, amount: number) {
  player.xp += amount;
  let levels = 0;
  while (player.level < HEROX_CATALOG.levelCap && player.xp >= xpForNextLevel(player.level)) {
    player.xp -= xpForNextLevel(player.level);
    player.level += 1;
    player.attributePoints += 3;
    if (player.level % 5 === 0) player.powerPoints += 1;
    levels += 1;
  }
  player.health = Math.min(maxHealth(player), player.health + levels * 12);
}

function settleEnergy(player: HeroPlayer, now: number) {
  const regenEveryMs = 45_000;
  const elapsed = Math.max(0, now - player.lastEnergyAtMs);
  const restored = Math.floor(elapsed / regenEveryMs);
  if (restored > 0) {
    player.energy = Math.min(100, player.energy + restored);
    player.lastEnergyAtMs = player.energy >= 100 ? now : player.lastEnergyAtMs + restored * regenEveryMs;
  }
}

function battle(a: HeroPlayer, b: HeroPlayer) {
  let aHealth = maxHealth(a);
  let bHealth = maxHealth(b);
  const order = a.attributes.agility >= b.attributes.agility ? ['a', 'b'] : ['b', 'a'];
  const log: string[] = [];
  const attack = (attacker: HeroPlayer, defender: HeroPlayer) => {
    const powerId = attacker.powers.at(-1) ?? 'kinetic-burst';
    const move = HEROX_CATALOG.powers.find((item) => item.id === powerId)!;
    const base = 9 + attacker.attributes.power * 1.8 + attacker.attributes.intellect * 0.55;
    const dodgeChance = Math.min(0.28, defender.attributes.agility * 0.008);
    if (crypto.randomInt(0, 1000) < dodgeChance * 1000) {
      log.push(`${defender.heroName} esquivou o golpe de ${attacker.heroName}.`);
      return 0;
    }
    const damage = Math.max(1, Math.round(base * move.damage * (0.85 + crypto.randomInt(0, 31) / 100)));
    log.push(`${attacker.heroName} usou ${move.name} e causou ${damage} de dano.`);
    return damage;
  };
  for (let round = 0; round < 12 && aHealth > 0 && bHealth > 0; round += 1) {
    for (const actor of order) {
      if (aHealth <= 0 || bHealth <= 0) break;
      const attacker = actor === 'a' ? a : b;
      const defender = actor === 'a' ? b : a;
      const damage = attack(attacker, defender);
      if (actor === 'a') bHealth -= damage;
      else aHealth -= damage;
    }
  }
  const winner = aHealth === bHealth ? (crypto.randomInt(0, 2) === 0 ? a : b) : aHealth > bHealth ? a : b;
  return { winnerUid: winner.uid, log: log.slice(0, 12), remainingHealth: { [a.uid]: Math.max(0, aHealth), [b.uid]: Math.max(0, bHealth) } };
}

export class HeroXAuthority {
  constructor(private readonly repository: HeroRepository) {}

  get persistenceMode(): Persistence { return this.repository.persistence; }

  async bootstrap(identity: HeroIdentity, factionInput: unknown, now = Date.now()) {
    const faction: HeroFaction = factionInput === 'outcast' ? 'outcast' : 'sentinel';
    return this.repository.transact([identity.uid], (view) => {
      const current = view.players.get(identity.uid);
      const player = current ?? makePlayer(identity, faction, now);
      return { value: { player: publicPlayer(player), isNewAccount: !current }, writes: current ? [] : [player] };
    });
  }

  async getPlayer(uid: string) {
    return this.repository.transact([uid], (view) => ({ value: view.players.get(uid) ? publicPlayer(view.players.get(uid)!) : null, writes: [] }));
  }

  async rankings(limit = 50) {
    return (await this.repository.top(Math.max(1, Math.min(100, Math.floor(limit))))).map((player, index) => ({ ...publicPlayer(player), rank: index + 1 }));
  }

  async act(identity: HeroIdentity, input: unknown, now = Date.now()): Promise<{ replayed: boolean; result?: Record<string, unknown>; player: PublicHeroPlayer }> {
    if (!input || typeof input !== 'object') throw new Error('Ação inválida.');
    const body = input as Record<string, unknown>;
    const opId = typeof body.opId === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(body.opId) ? body.opId : '';
    if (!opId) throw new Error('Envie um opId único para proteger a ação contra repetição.');
    const action = typeof body.action === 'string' ? body.action : '';
    if (!['allocate_attribute', 'unlock_power', 'campaign_mission', 'arena_challenge'].includes(action)) throw new Error('Ação HEROX desconhecida.');
    const opponentUid = typeof body.targetUid === 'string' ? body.targetUid : '';
    const uids = action === 'arena_challenge' ? [identity.uid, opponentUid] : [identity.uid];
    if (action === 'arena_challenge' && (!opponentUid || opponentUid === identity.uid || !/^[A-Za-z0-9_-]{2,128}$/.test(opponentUid))) throw new Error('Escolha outro herói válido para o duelo.');

    return this.repository.transact<{ replayed: boolean; result?: Record<string, unknown>; player: PublicHeroPlayer }>(uids, (view) => {
      const player = view.players.get(identity.uid);
      if (!player) throw new Error('Crie seu herói antes de agir.');
      if (player.recentOperationIds.includes(opId)) return { value: { replayed: true, player: publicPlayer(player) }, writes: [] };
      settleEnergy(player, now);
      let result: Record<string, unknown>;
      if (action === 'allocate_attribute') {
        const attribute = body.attribute;
        const points = Number(body.points ?? 1);
        if (!attributeNames.includes(attribute as HeroAttribute) || !Number.isInteger(points) || points < 1 || points > 5 || points > player.attributePoints) throw new Error('Atributo ou quantidade de pontos inválida.');
        player.attributes[attribute as HeroAttribute] += points;
        player.attributePoints -= points;
        if (attribute === 'vitality') player.health = Math.min(maxHealth(player), player.health + points * 8);
        result = { action, attribute, points };
      } else if (action === 'unlock_power') {
        const power = HEROX_CATALOG.powers.find((item) => item.id === body.powerId);
        if (!power || !powerIds.has(power.id) || player.powers.includes(power.id) || player.level < power.unlockLevel || player.powerPoints < power.cost) throw new Error('Poder ainda bloqueado ou pontos insuficientes.');
        player.powerPoints -= power.cost;
        player.powers.push(power.id);
        result = { action, powerId: power.id };
      } else if (action === 'campaign_mission') {
        if (player.energy < 5) throw new Error('Energia insuficiente. Aguarde a recuperação antes de iniciar outra missão.');
        player.energy -= 5;
        const chapter = HEROX_CATALOG.chapters[player.campaign.chapter - 1];
        if (!chapter) throw new Error('Você concluiu a primeira temporada da campanha HEROX.');
        if (player.level < 1 + (player.campaign.chapter - 1) * 2) throw new Error('A campanha exige nível maior para este capítulo.');
        const enemyPower = (12 + player.campaign.mission * 2) * chapter.threat;
        const heroPower = player.attributes.power * 1.8 + player.attributes.agility + player.attributes.intellect * 0.6 + player.level * 2;
        const winChance = Math.max(0.2, Math.min(0.9, 0.48 + (heroPower - enemyPower) / Math.max(100, enemyPower * 3)));
        const won = crypto.randomInt(0, 10000) < winChance * 10000;
        if (won) {
          const xp = Math.round(40 + player.level * 12 + chapter.threat * 25);
          const honor = Math.round(4 + chapter.threat * 3);
          grantXp(player, xp);
          player.honor += honor;
          player.campaign.completed += 1;
          player.campaign.mission += 1;
          if (player.campaign.mission > chapter.missions) {
            player.campaign.chapter += 1;
            player.campaign.mission = 1;
          }
          result = { action, won, chapter: chapter.title, xp, honor };
        } else {
          player.health = Math.max(1, player.health - Math.round(maxHealth(player) * 0.12));
          result = { action, won, chapter: chapter.title, health: player.health };
        }
      } else {
        if (player.energy < 10) throw new Error('Energia insuficiente para iniciar um duelo.');
        if (now - player.lastArenaAtMs < 10_000) throw new Error('Aguarde alguns segundos antes de iniciar outro duelo.');
        const opponent = view.players.get(opponentUid);
        if (!opponent) throw new Error('Esse jogador não está no HEROX. Bots não participam do ranking.');
        if (opponent.level < Math.max(1, player.level - 10) || opponent.level > player.level + 10) throw new Error('O nível do rival está fora da faixa competitiva.');
        player.energy -= 10;
        const report = battle(player, opponent);
        const playerWon = report.winnerUid === player.uid;
        if (playerWon) {
          player.wins += 1;
          player.honor += 18;
          grantXp(player, 35 + player.level * 7);
          opponent.losses += 1;
          opponent.honor = Math.max(0, opponent.honor - 8);
        } else {
          player.losses += 1;
          player.honor = Math.max(0, player.honor - 4);
          opponent.wins += 1;
          opponent.honor += 10;
          grantXp(opponent, 18 + opponent.level * 4);
        }
        player.lastArenaAtMs = now;
        result = { action, ...report, outcome: playerWon ? 'victory' : 'defeat', opponent: opponent.heroName };
        opponent.updatedAtMs = now;
      }
      player.recentOperationIds = [...player.recentOperationIds.slice(-99), opId];
      player.updatedAtMs = now;
      player.health = Math.min(player.health, maxHealth(player));
      const writes = [player];
      if (action === 'arena_challenge') writes.push(view.players.get(opponentUid)!);
      return { value: { replayed: false, result, player: publicPlayer(player) }, writes };
    });
  }
}
