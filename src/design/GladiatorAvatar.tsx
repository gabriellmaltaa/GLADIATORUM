import React, { useId } from 'react';
import heroes from '../assets/images/vigilia-heroes-atlas.png';
import { getCharacterAppearance, type EquippedAppearance } from '../game/appearance';
import { getDressedParts } from '../game/dressedAppearance';
import { getItemRadiance } from '../game/itemRadiance';
import type { GameItem } from '../game/config';
import type { HeroAppearance } from '../game/heroCustomization';

const CELL = 443.5;
function Figure({ column = 0 }: { column?: number }) {
  return <image href={heroes} x={-column * CELL} y="0" width="1774" height="887" />;
}

const slotLabel = (item?: GameItem) => item ? `${item.name} (${item.rarity})` : '';

/** Original Vigília hero art with equipment rendered from the actual equipped slots. */
export function GladiatorAvatar({ equipped, level, name, appearance }: {
  equipped: EquippedAppearance;
  level: number;
  name: string;
  appearance?: HeroAppearance;
}) {
  const { layers, bodyColumn, aura, paletteColor, mask } = getCharacterAppearance(equipped, level, appearance);
  const parts = getDressedParts(equipped);
  const variant = (slot: string) => parts.find(part => part.slot === slot)?.variant ?? 0;
  const id = useId().replace(/:/g, '');
  const ref = (part: string) => `url(#${id}-${part})`;
  const gearProps = (item: GameItem) => {
    const light = getItemRadiance(item.rarity);
    return { 'data-equipped-slot': item.slot, 'data-icon': item.iconId, 'data-rarity': item.rarity,
      style: { filter: light.strength ? `drop-shadow(0 0 ${2 + light.strength * 5}px ${light.color})` : undefined } };
  };
  const visibleGear = Object.values(layers).map(item => item.name).join(', ');
  const armorTone = layers.armor ? getItemRadiance(layers.armor.rarity).color : paletteColor;
  const weaponTone = layers.weapon ? getItemRadiance(layers.weapon.rarity).color : '#69e7ff';
  const shieldTone = layers.shield ? getItemRadiance(layers.shield.rarity).color : '#69e7ff';
  const helmetVariant = variant('helmet');
  return <div className="living-gladiator dressed-gladiator vigilia-hero" data-aura-tier={aura.tier} data-archetype={appearance?.archetype ?? 'sentinel'} style={{ '--aura-color': aura.color, '--aura-strength': aura.strength, '--hero-accent': paletteColor } as React.CSSProperties}>
    <div className="gladiator-aura" aria-hidden="true"/>
    <svg viewBox="-62 -100 570 1070" className="gladiator-body" role="img" aria-label={`${name}, nível ${level}. ${visibleGear ? `Equipamentos: ${visibleGear}.` : 'Sem equipamentos.'} ${aura.label}.`}>
      <defs>
        <clipPath id={`${id}-cell`}><rect width="443.5" height="887"/></clipPath>
        <clipPath id={`${id}-torso`}><path d="M145 132H299L365 165L367 240L320 263L345 548H99L125 265L76 240L79 165Z"/></clipPath>
        <clipPath id={`${id}-head`}><path d="M120 -95H325V110L270 143H175L120 110Z"/></clipPath>
        <clipPath id={`${id}-legs`}><path d="M128 355H316L350 550V880H0V550L94 550Z"/></clipPath>
        <clipPath id={`${id}-weapon`}><path d="M22 195L53 220L76 395L93 400L91 420L101 435L96 474L93 515H34L29 470L28 410L17 223Z"/></clipPath>
        <clipPath id={`${id}-shield`}><path d="M310 220H443V650H250V280L270 250L310 245Z"/></clipPath>
      </defs>
      <ellipse cx="222" cy="881" rx="169" ry="13" fill="#000" opacity=".35"/>
      <g clipPath={ref('cell')}><Figure column={bodyColumn}/></g>
      {mask !== 'none' && <g clipPath={ref('head')} className="hero-cosmetic-mask" aria-hidden="true">
        {mask === 'visor' ? <path d="M161 62Q222 38 283 62L275 98Q222 116 169 98Z" fill="#101c2b" stroke={paletteColor} strokeWidth="7"/> : <path d="M164 71L202 62L210 94L222 100L234 94L242 62L280 71L268 120Q222 145 176 120Z" fill="#101c2b" stroke={paletteColor} strokeWidth="6"/>}
        <path d="M177 78L207 72M237 72L267 78" stroke={paletteColor} strokeWidth="4" opacity=".9"/>
      </g>}
      {layers.armor && <g {...gearProps(layers.armor)} clipPath={ref('torso')} className="hero-equipment-armor">
        <path d="M145 145L185 130L222 152L259 130L299 145L350 176L329 245L295 252L310 382L276 405L222 386L168 405L134 382L149 252L115 245L94 176Z" fill="#182637" stroke={armorTone} strokeWidth="9"/>
        <path d="M145 168L188 155L222 174L256 155L299 168L315 222L280 235L276 340L222 362L168 340L164 235L129 222Z" fill="#263b50" stroke={paletteColor} strokeWidth="4"/>
        <path d="M222 174V360M168 235H276M164 285H280" stroke={armorTone} strokeWidth="5" opacity=".9"/>
        <path d="M188 156L202 191H242L256 156" fill="none" stroke={paletteColor} strokeWidth="7"/>
        <circle cx="222" cy="223" r="12" fill={armorTone} stroke="#eaf7ff" strokeWidth="3"/>
      </g>}
      {layers.gloves && <g {...gearProps(layers.gloves)} fill="#17293b" stroke={getItemRadiance(layers.gloves.rarity).color} strokeWidth="7">
        <path d="M38 328Q72 314 110 339L94 418Q64 409 38 420Z"/><path d="M405 328Q371 314 333 339L349 418Q379 409 405 420Z"/>
        <path d="M48 350L102 357M395 350L341 357" stroke={paletteColor} strokeWidth="4"/>
      </g>}
      {layers.boots && <g {...gearProps(layers.boots)} clipPath={ref('legs')} fill="#17293b" stroke={getItemRadiance(layers.boots.rarity).color} strokeWidth="7">
        <path d="M81 650L165 650L161 820L187 850L180 875H90L72 850Z"/><path d="M279 650L363 650L372 850L354 875H264L257 850L283 820Z"/>
        <path d="M83 786L166 786M276 786L361 786" stroke={paletteColor} strokeWidth="5"/>
      </g>}
      {layers.helmet && <g {...gearProps(layers.helmet)} clipPath={ref('head')} className="hero-equipment-helmet">
        <path d={helmetVariant % 2 ? 'M145 89Q150 18 222 6Q294 18 299 89L278 105L250 79L222 84L194 79L166 105Z' : 'M150 79Q151 8 222 1Q293 8 294 79L269 95L250 67H194L175 95Z'} fill="#17283a" stroke={getItemRadiance(layers.helmet.rarity).color} strokeWidth="8"/>
        <path d="M177 58Q222 42 267 58L261 78H183Z" fill="#112b3e" stroke={paletteColor} strokeWidth="5"/>
        <path d="M164 93L177 112M280 93L267 112" stroke={getItemRadiance(layers.helmet.rarity).color} strokeWidth="8"/>
      </g>}
      {layers.amulet && <g {...gearProps(layers.amulet)}>
        <path d="M186 134Q179 207 222 225Q265 207 258 134" fill="none" stroke={paletteColor} strokeWidth="5"/>
        <path d="M222 210L239 229L222 250L205 229Z" fill="#14293a" stroke={getItemRadiance(layers.amulet.rarity).color} strokeWidth="5"/>
        <circle cx="222" cy="229" r="6" fill={paletteColor}/>
      </g>}
      {layers.weapon && <g {...gearProps(layers.weapon)} clipPath={ref('weapon')}>
        <path d="M42 411L29 205L48 154L71 205L65 411Z" fill="#dceeff" stroke={weaponTone} strokeWidth="7"/>
        <path d="M30 396L77 408L82 424L25 416ZM41 421L67 426L69 480L37 477Z" fill="#14283b" stroke={weaponTone} strokeWidth="6"/>
        <path d="M48 180L48 398" stroke="#fff" strokeWidth="5" opacity=".8"/>
      </g>}
      {layers.ring && <g {...gearProps(layers.ring)}><path d="M45 440Q57 453 71 443" fill="none" stroke={getItemRadiance(layers.ring.rarity).color} strokeWidth="6"/><circle cx="58" cy="444" r="5" fill={paletteColor}/></g>}
      {layers.shield && <g {...gearProps(layers.shield)} clipPath={ref('shield')}>
        <path d="M277 255L348 230L421 255L409 470L349 514L289 470Z" fill="#15283c" stroke={shieldTone} strokeWidth="11"/>
        <path d="M294 270L348 251L403 270L393 450L349 484L305 450Z" fill="#1d3b54" stroke={paletteColor} strokeWidth="5"/>
        <path d="M349 266V474M303 353H397" stroke={shieldTone} strokeWidth="5"/>
        <path d="M349 305L369 350L349 397L329 350Z" fill={paletteColor} opacity=".85"/>
      </g>}
    </svg>
    <span className="gladiator-aura-caption">{aura.label} <span>· Nível {level}</span></span>
  </div>;
}
