import type { EquipmentSlotType, GameItem } from './config';
import { getCharacterAppearance, type EquippedAppearance } from './appearance';

/** Each index selects a character already wearing that item, not a floating item icon. */
const variants: Record<string, number> = {
  lorica_leather: 1, lorica_segmentata: 2, lorica_hamata: 3,
  gladius_iron: 0, gladius_bronze: 1, spatha_imperial: 2, pugio_assassin: 3, trident_neptune: 4,
  galea_recruit: 0, galea_murmillo: 1, galea_centurion: 2,
  scutum_wood: 0, scutum_legion: 1, parma_bronze: 2, aegis_praetorian: 3,
  manica_leather: 0, manica_bronze: 1, manica_iron: 2,
  caligae_leather: 0, ocrea_bronze: 1, ocrea_imperial: 2,
  anulus_bronze: 0, anulus_ruby: 1, bulla_mars: 0, bulla_jupiter: 1,
};

export interface DressedPart { slot: EquipmentSlotType; variant: number; item: GameItem }

export function getDressedParts(equipped: EquippedAppearance): DressedPart[] {
  return Object.values(getCharacterAppearance(equipped, 1).layers)
    .filter(item => variants[item.iconId] !== undefined)
    .map(item => ({ slot: item.slot, variant: variants[item.iconId], item }));
}
