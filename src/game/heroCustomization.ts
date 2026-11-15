export const HERO_ARCHETYPES = ['sentinel', 'weaver', 'vanguard', 'oracle'] as const;
export const HERO_PALETTES = ['cyan', 'violet', 'amber', 'crimson', 'jade'] as const;
export const HERO_MASKS = ['none', 'half', 'visor'] as const;
export const HERO_ENERGIES = ['cyan', 'violet', 'amber', 'crimson', 'jade'] as const;
export type HeroArchetype = (typeof HERO_ARCHETYPES)[number];
export type HeroPalette = (typeof HERO_PALETTES)[number];
export type HeroMask = (typeof HERO_MASKS)[number];
export type HeroEnergy = (typeof HERO_ENERGIES)[number];

export interface HeroAppearance {
  archetype: HeroArchetype;
  palette: HeroPalette;
  mask: HeroMask;
  energy: HeroEnergy;
}

export const DEFAULT_HERO_APPEARANCE: HeroAppearance = {
  archetype: 'sentinel', palette: 'cyan', mask: 'none', energy: 'cyan',
};

export function isHeroAppearance(value: unknown): value is HeroAppearance {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  return HERO_ARCHETYPES.includes(input.archetype as HeroArchetype)
    && HERO_PALETTES.includes(input.palette as HeroPalette)
    && HERO_MASKS.includes(input.mask as HeroMask)
    && HERO_ENERGIES.includes(input.energy as HeroEnergy);
}

export function normalizeHeroAppearance(value: unknown): HeroAppearance {
  if (!value || typeof value !== 'object') return { ...DEFAULT_HERO_APPEARANCE };
  const input = value as Record<string, unknown>;
  return {
    archetype: HERO_ARCHETYPES.includes(input.archetype as HeroArchetype) ? input.archetype as HeroArchetype : DEFAULT_HERO_APPEARANCE.archetype,
    palette: HERO_PALETTES.includes(input.palette as HeroPalette) ? input.palette as HeroPalette : DEFAULT_HERO_APPEARANCE.palette,
    mask: HERO_MASKS.includes(input.mask as HeroMask) ? input.mask as HeroMask : DEFAULT_HERO_APPEARANCE.mask,
    energy: HERO_ENERGIES.includes(input.energy as HeroEnergy) ? input.energy as HeroEnergy : DEFAULT_HERO_APPEARANCE.energy,
  };
}
