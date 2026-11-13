import React from 'react';
import atlas from '../assets/images/equipment-atlas.png';
import { EquipmentArt } from './EquipmentArt';
import type { ItemIconId } from './assets';
import type { RarityKey } from './tokens';
import { getItemRadiance } from '../game/itemRadiance';

const portraits: ItemIconId[] = [
  'gladius_iron', 'gladius_bronze', 'spatha_imperial', 'pugio_assassin', 'trident_neptune',
  'scutum_wood', 'scutum_legion', 'parma_bronze', 'aegis_praetorian', 'galea_recruit',
  'galea_murmillo', 'galea_centurion', 'lorica_leather', 'lorica_hamata', 'lorica_segmentata',
  'manica_leather', 'manica_bronze', 'manica_iron', 'caligae_leather', 'ocrea_bronze',
  'ocrea_imperial', 'anulus_bronze', 'anulus_ruby', 'bulla_mars', 'bulla_jupiter',
];

/** Shared portraits for every equipment surface, with rarity supplied by the item. */
export function ItemArtwork({ iconId, rarity = 'common', size = 48, className = '' }: {
  iconId: ItemIconId; rarity?: RarityKey; size?: number; className?: string;
}) {
  const index = portraits.indexOf(iconId);
  const effect = getItemRadiance(rarity);
  return <span className={`item-portrait ${effect.strength ? 'item-portrait-radiant' : ''} ${className}`}
    data-rarity={rarity} aria-hidden="true"
    style={{ width: size, height: size, '--item-light': effect.color, '--item-power': effect.strength } as React.CSSProperties}>
    {index >= 0 ? <span className="item-portrait-painting" style={{
      backgroundImage: `url(${atlas})`, backgroundPosition: `${((index % 5) + .04) / 4.08 * 100}% ${(Math.floor(index / 5) + .04) / 4.08 * 100}%`,
    }} /> : <EquipmentArt iconId={iconId} size={size} />}
    {effect.strength > 0 && <span className="item-portrait-aura" />}
    {effect.strength >= .38 && <span className="item-portrait-stars">✦</span>}
  </span>;
}

