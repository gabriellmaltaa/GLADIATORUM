import React, { useId } from 'react';
import bodies from '../assets/images/dressed-bodies.png';
import weapons from '../assets/images/dressed-weapons.png';
import shields from '../assets/images/dressed-shields.png';
import wear from '../assets/images/dressed-wear.png';
import { getCharacterAppearance, type EquippedAppearance } from '../game/appearance';
import { getDressedParts } from '../game/dressedAppearance';
import { getItemRadiance } from '../game/itemRadiance';
import type { GameItem } from '../game/config';

const CELL = 443.5;
/** All regions are painted on a complete character. Never stretch a loose item onto a limb. */
function Figure({ src, column = 0, x = 0, y = 0 }: { src: string; column?: number; x?: number; y?: number }) {
  return <image href={src} x={x - column * CELL} y={y} width="1774" height="887"/>;
}

export function GladiatorAvatar({ equipped, level, name }: { equipped: EquippedAppearance; level: number; name: string }) {
  const { layers, bodyColumn, aura } = getCharacterAppearance(equipped, level);
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
  // The weapon sheet has five figures. These are hand landmarks, not item offsets.
  const handCenters = [56, 420, 775, 1130, 1487];
  const weaponX = 65 - handCenters[variant('weapon')];
  const weaponContours = [
    'M22 195L53 220L76 395L93 400L91 420L101 435L96 474L93 515H34L29 470L28 410L17 223Z',
    'M18 195L48 205L76 390L98 402L94 420L101 436L96 477L94 517H33L30 470L28 410Z',
    'M24 45L64 45L85 385L110 385V413L99 423L101 476L105 530H28V478L27 418L17 410V385H40Z',
    'M36 310L65 315L82 405L99 408L96 430L100 473L92 512H35L31 470L28 410Z',
    'M0 20H125V200H80V400H104V480H80V880H48V480H26V402H48V200H0Z',
  ];
  const bracerContours = [
    'M40 330Q70 318 110 343L90 419Q60 412 38 418Z',
    'M39 324Q65 311 112 335L91 419Q65 411 39 419Z',
    'M41 319Q74 314 114 333L95 419Q62 412 39 420Z',
  ];
  // Replace the entire lower body at the cloth belt, never cut through bare knees.
  const lowerBody = 'M128 355H316L350 550L443.5 560V888H0V560L94 550Z';
  return <div className="living-gladiator dressed-gladiator" data-aura-tier={aura.tier} style={{ '--aura-color': aura.color, '--aura-strength': aura.strength } as React.CSSProperties}>
    <div className="gladiator-aura" aria-hidden="true"/>
    <svg viewBox="-62 -100 570 1070" className="gladiator-body" role="img" aria-label={`${name}, nível ${level}. ${visibleGear ? `Equipado com ${visibleGear}.` : 'Sem equipamentos.'} ${aura.label}.`}>
      <defs>
        <clipPath id={`${id}-cell`}><rect width="443.5" height="887"/></clipPath>
        <mask id={`${id}-body`} maskUnits="userSpaceOnUse" x="0" y="0" width="444" height="888">
          <rect width="444" height="888" fill="white"/>
          {layers.helmet && <rect x="150" y="0" width="145" height="137" fill="black"/>}
          {layers.weapon && <path d="M20 408H105V480H20Z" fill="black"/>}
          {layers.shield && <path d="M320 250H444V490H320Z" fill="black"/>}
          {layers.boots && <path d={lowerBody} fill="black"/>}
        </mask>
        <clipPath id={`${id}-head`}><path d="M120 -95H325V110L270 143H175L120 110Z"/></clipPath>
        <clipPath id={`${id}-torso`}><path d="M145 132H299L365 165L367 240L320 263L345 548H99L125 265L76 240L79 165Z"/></clipPath>
        <clipPath id={`${id}-bracers`}><path d={bracerContours[variant('gloves')]}/><path d={bracerContours[variant('gloves')]} transform="translate(443.5 0) scale(-1 1)"/></clipPath>
        <clipPath id={`${id}-legs`}><path d={lowerBody}/></clipPath>
        <clipPath id={`${id}-weapon`}><path d={weaponContours[variant('weapon')]}/></clipPath>
        <clipPath id={`${id}-shield`}><path d={variant('shield') === 2 ? 'M310 235H443V590H249V350L280 303L310 288Z' : 'M310 220H443V650H250V280L270 250L310 245Z'}/></clipPath>
      </defs>
      <ellipse cx="222" cy="881" rx="169" ry="13" fill="#000" opacity=".35"/>
      <g clipPath={ref('cell')} mask={ref('body')}><Figure src={bodies} column={bodyColumn}/></g>
      {layers.boots && <g {...gearProps(layers.boots)} clipPath={ref('legs')}><g transform="translate(-9 -34) scale(1.04)"><Figure src={wear} column={variant('boots')}/></g></g>}
      {layers.armor && <g {...gearProps(layers.armor)} clipPath={ref('torso')}><Figure src={bodies} column={bodyColumn}/></g>}
      {layers.gloves && <g {...gearProps(layers.gloves)} clipPath={ref('bracers')}><Figure src={wear} column={variant('gloves')} y={-22}/></g>}
      {layers.helmet && <g {...gearProps(layers.helmet)} clipPath={ref('head')}><Figure src={wear} column={variant('helmet')} y={-40}/></g>}
      {layers.amulet && <g {...gearProps(layers.amulet)}>
        <path d="M186 134Q179 207 222 225Q265 207 258 134" fill="none" stroke="#614320" strokeWidth="6"/>
        <path d="M186 134Q179 207 222 225Q265 207 258 134" fill="none" stroke="#d9b363" strokeWidth="3"/>
        <circle cx="222" cy="229" r="17" fill="#a77932" stroke="#f0ce78" strokeWidth="3"/><circle cx="222" cy="229" r="12" fill="#64471e"/>
        <path d={variant('amulet') ? 'M225 217L213 231H224L218 241L232 226H222Z' : 'M217 219H227V235H217ZM214 223H230'} fill="#ebc568" stroke="#ebc568" strokeWidth="2"/>
      </g>}
      {layers.weapon && <g {...gearProps(layers.weapon)} clipPath={ref('weapon')}><Figure src={weapons} x={weaponX} y={38}/></g>}
      {layers.ring && <g {...gearProps(layers.ring)}><path d={layers.weapon ? 'M44 445Q55 451 68 447' : 'M49 440Q60 449 73 444'} fill="none" stroke="#edc66f" strokeWidth="4"/>{variant('ring') === 1 && <circle cx="57" cy="447" r="5" fill="#ae1537" stroke="#e6b95f" strokeWidth="2"/>}</g>}
      {layers.shield && <g {...gearProps(layers.shield)} clipPath={ref('shield')}><Figure src={shields} column={variant('shield')}/></g>}
    </svg>
    <span className="gladiator-aura-caption">{aura.label} <span>· Nível {level}</span></span>
  </div>;
}
