import { createItemFromTemplate, getInventoryCapacity, type GameState } from '../game/rules.ts';

const XXMALTA_UID = 'fB4SJKCiOgU8eEXnpLBimgKglvf1';
const XXMALTA_OBSIDIAN_GIFT_ID = 'gift_obsidian_xxmalta_next_login';
const XXMALTA_OBSIDIAN_ITEM_IDS = [
  'obsidian_weapon',
  'obsidian_shield',
  'obsidian_helmet',
  'obsidian_armor',
] as const;

export interface TargetedLoginGiftRecord {
  uid: string;
  state: GameState;
  loginGiftIds?: string[];
}

/** Entrega uma única vez o conjunto Obsidiana solicitado à conta online do XX MALTA. */
export function grantXxmaltaObsidianLoginGift(record: TargetedLoginGiftRecord): boolean {
  if (record.uid !== XXMALTA_UID) return false;
  if (record.loginGiftIds?.includes(XXMALTA_OBSIDIAN_GIFT_ID)) return false;

  const items = XXMALTA_OBSIDIAN_ITEM_IDS.map((templateId) =>
    createItemFromTemplate(templateId, 'gift_xxmalta_login'),
  );
  const nextInventory = [...record.state.inventory, ...items];

  record.state = {
    ...record.state,
    inventory: nextInventory,
    inventoryCapacity: Math.max(
      getInventoryCapacity(record.state),
      Math.min(60, nextInventory.length),
    ),
    discoveredTemplates: [...new Set([
      ...(record.state.discoveredTemplates ?? []),
      ...XXMALTA_OBSIDIAN_ITEM_IDS,
    ])],
  };
  record.loginGiftIds = [...(record.loginGiftIds ?? []), XXMALTA_OBSIDIAN_GIFT_ID];
  return true;
}
