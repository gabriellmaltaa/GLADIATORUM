import type { RarityKey } from '../design/tokens.ts';

/** Cosmetic only. Kept independent of level, stats and saves. */
const radiance: Record<RarityKey, { color: string; strength: number }> = {
  common: { color: '#b6a58b', strength: 0 },
  uncommon: { color: '#88b87e', strength: 0 },
  rare: { color: '#75bfff', strength: .22 },
  epic: { color: '#ce8aff', strength: .38 },
  legendary: { color: '#ffc65c', strength: .54 },
  mythic: { color: '#ff795b', strength: .68 },
  imperial: { color: '#ffe99a', strength: .84 },
  divine: { color: '#8cfff0', strength: 1 },
};
export function getItemRadiance(rarity?: RarityKey) {
  return radiance[rarity ?? 'common'] ?? radiance.common;
}
