import { getFirebaseIdToken } from './firebaseAuth';
import { requestHeroX } from './heroxApi';

export type HeroFaction = 'sentinel' | 'outcast';
export type HeroAttribute = 'power' | 'agility' | 'intellect' | 'vitality';
export type HeroPowerId = 'kinetic-burst' | 'aegis-field' | 'phase-step' | 'overload' | 'last-stand';

export interface HeroPlayer {
  uid: string;
  heroName: string;
  faction: HeroFaction;
  level: number;
  xp: number;
  gold: number;
  weapons: string[];
  arenaExtractions: number;
  honor: number;
  wins: number;
  losses: number;
  attributes: Record<HeroAttribute, number>;
  attributePoints: number;
  powerPoints: number;
  powers: HeroPowerId[];
  health: number;
  energy: number;
  campaign: { chapter: number; mission: number; completed: number };
}

export interface HeroXCatalog {
  levelCap: number;
  factions: { id: HeroFaction; name: string; description: string }[];
  attributes: { id: HeroAttribute; name: string; description: string }[];
  powers: { id: HeroPowerId; name: string; unlockLevel: number; cost: number; damage: number; cooldown: number }[];
  chapters: { id: number; title: string; district: string; missions: number; threat: number }[];
}

export interface HeroRankingEntry extends HeroPlayer {
  rank: number;
}

async function authenticated<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getFirebaseIdToken();
  return requestHeroX<T>(path, token, init);
}

export async function loadHeroXCatalog(): Promise<HeroXCatalog> {
  return requestHeroX<HeroXCatalog>('/catalog', null);
}

export async function loadHeroXRankings(): Promise<HeroRankingEntry[]> {
  const response = await requestHeroX<{ items: HeroRankingEntry[] }>('/rankings?limit=50', null);
  return response.items;
}

export async function bootstrapHeroX(faction: HeroFaction): Promise<{ player: HeroPlayer; isNewAccount: boolean }> {
  return authenticated('/bootstrap', { method: 'POST', body: JSON.stringify({ faction }) });
}

export async function actInHeroX(action: Record<string, unknown>): Promise<{
  player: HeroPlayer;
  result?: Record<string, unknown>;
  replayed: boolean;
}> {
  return authenticated('/action', { method: 'POST', body: JSON.stringify(action) });
}


