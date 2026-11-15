export interface ArenaBackpackState {
  carriedWeapons: string[];
  carriedGold: number;
  carriedXp: number;
}

export function drawUnmirroredText(context: Pick<CanvasRenderingContext2D, 'save' | 'scale' | 'restore'>, facing: -1 | 1, draw: () => void): void {
  context.save();
  if (facing === -1) context.scale(-1, 1);
  draw();
  context.restore();
}

export function getArenaFloatingLabel(event: unknown): { text: string; color: string } | null {
  if (!event || typeof event !== 'object') return null;
  const value = event as Record<string, unknown>;
  if (value.type === 'hit' && typeof value.damage === 'number') return { text: `POW! −${value.damage}`, color: '#ff8c73' };
  if (value.type === 'extracted') return { text: 'EXTRAÇÃO!', color: '#78fff0' };
  if (value.type === 'eliminated') return { text: 'KO!', color: '#ff6479' };
  if (value.type !== 'loot_collected' || !value.loot || typeof value.loot !== 'object') return null;
  const loot = value.loot as Record<string, unknown>;
  const amount = typeof loot.amount === 'number' ? loot.amount : undefined;
  if (loot.type === 'gold') return { text: `+${amount ?? 5} OURO`, color: '#ffe06b' };
  if (loot.type === 'xp') return { text: `+${amount ?? 15} XP`, color: '#72e3ff' };
  if (loot.type === 'weapon') return { text: 'ARMA!', color: '#f1a5ff' };
  if (loot.type === 'medkit') return { text: 'VIDA+', color: '#7dff9b' };
  if (loot.type === 'energy') return { text: 'ENERGIA+', color: '#72e3ff' };
  return null;
}

export function getArenaBackpackSlots(state: ArenaBackpackState): string[] {
  const carried = [
    ...state.carriedWeapons.map((weapon) => weapon.replaceAll('-', ' ').toUpperCase()),
    ...(state.carriedGold > 0 ? [`+${state.carriedGold} OURO`] : []),
    ...(state.carriedXp > 0 ? [`+${state.carriedXp} XP`] : []),
  ];
  return Array.from({ length: 6 }, (_, index) => carried[index] ?? 'VAZIO');
}

