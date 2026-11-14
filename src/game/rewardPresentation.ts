import type { GameItem } from './config.ts';

export function shouldConcealRewardItem(item: Pick<GameItem, 'rarity'>, claimed: boolean): boolean {
  return item.rarity === 'obsidian' && !claimed;
}
