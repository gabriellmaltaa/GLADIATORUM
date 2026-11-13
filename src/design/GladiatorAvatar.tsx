import React, { useId } from 'react';
import bodies from '../assets/images/character-bodies.png';
import equipment from '../assets/images/character-arms-helmets.png';
import limbs from '../assets/images/character-limbs.png';
import { getCharacterAppearance, type EquippedAppearance } from '../game/appearance';
import { getItemRadiance } from '../game/itemRadiance';
import type { GameItem } from '../game/config';

/** Atlas fragments share the same body coordinates; equipment never changes gameplay. */
function Fragment({ src, sheet, crop, box }: { src: string; sheet: [number, number]; crop: [number, number, number, number]; box: [number, number, number, number] }) {
  return <svg x={box[0]} y={box[1]} width={box[2]} height={box[3]} viewBox={crop.join(' ')} preserveAspectRatio="none" overflow="hidden"><image href={src} width={sheet[0]} height={sheet[1]}/></svg>;
}
export function GladiatorAvatar({ equipped, level, name }: { equipped: EquippedAppearance; level: number; name: string }) {
  const { layers, bodyColumn, aura } = getCharacterAppearance(equipped, level);
  const id = useId().replace(/:/g, '');
  const ref = (part: string) => `url(#${id}-${part})`;
  const body = <Fragment src={bodies} sheet={[1774,887]} crop={[bodyColumn * 443.5,0,443.5,887]} box={[0,0,444,888]}/>;
  const gearProps = (item: GameItem) => {
    const light = getItemRadiance(item.rarity);
    return { 'data-equipped-slot': item.slot, 'data-icon': item.iconId, 'data-rarity': item.rarity,
      style: { filter: light.strength ? `drop-shadow(0 0 ${2 + light.strength * 5}px ${light.color})` : undefined } };
  };
  const head = layers.helmet?.iconId;
  const trident = layers.weapon?.iconId === 'trident_neptune';
  const dagger = layers.weapon?.iconId === 'pugio_assassin';
  const goldBlade = /imperial|bronze/.test(layers.weapon?.iconId ?? '');
  const visibleGear = Object.values(layers).map(item => item.name).join(', ');
  return <div className="living-gladiator painted-gladiator" data-aura-tier={aura.tier} style={{ '--aura-color': aura.color, '--aura-strength': aura.strength } as React.CSSProperties}>
    <div className="gladiator-aura" aria-hidden="true"/>
    <svg viewBox="-65 -65 574 970" className="gladiator-body" role="img" aria-label={`${name}, nível ${level}. ${visibleGear ? `Equipado com ${visibleGear}.` : 'Sem equipamentos.'} ${aura.label}.`}>
      <defs>
        <clipPath id={`${id}-body`}><path d="M168 15Q222 0 279 20L285 134L354 166L402 432L403 514L351 520L344 600L391 888H49L89 600L96 520L38 520L36 430L85 166L161 134Z"/></clipPath>
        <clipPath id={`${id}-torso`}><path d="M162 139L284 139L371 170L362 297L315 306L348 580L306 600L143 600L96 579L128 306L80 293L78 170Z"/></clipPath>
        <clipPath id={`${id}-grip`}><path d="M49 457Q68 450 83 465L87 490L72 506L52 493Z"/></clipPath>
        <mask id={`${id}-open-face`} maskUnits="userSpaceOnUse" x="140" y="-40" width="170" height="220"><rect x="140" y="-40" width="170" height="220" fill="white"/><path d="M183 80Q222 70 260 80L255 105L246 111L244 127Q222 147 201 127L198 112L188 106Z" fill="black"/></mask>
      </defs>
      <ellipse cx="222" cy="871" rx="154" ry="13" fill="#000" opacity=".4"/>
      <g clipPath={ref('body')}>{body}</g>
      {layers.armor && <g {...gearProps(layers.armor)}><g clipPath={ref('torso')}>{body}</g></g>}
      {layers.boots && <g {...gearProps(layers.boots)}>{[false,true].map(right => <g key={String(right)} transform={right ? 'translate(444 0) scale(-1 1)' : undefined}>
        {layers.boots!.iconId === 'caligae_leather' ? <Fragment src={limbs} sheet={[1536,1024]} crop={[138,570,250,435]} box={[70,774,96,106]}/> : <g transform="rotate(5 130 750)"><Fragment src={limbs} sheet={[1536,1024]} crop={layers.boots!.iconId === 'ocrea_imperial' ? [1164,465,221,540] : [670,466,206,540]} box={[89,612,87,270]}/></g>}
      </g>)}</g>}
      {layers.gloves && <g {...gearProps(layers.gloves)}>{[false,true].map(right => <g key={String(right)} transform={right ? 'translate(444 0) scale(-1 1)' : undefined}><g transform="rotate(14 79 397)"><Fragment src={limbs} sheet={[1536,1024]} crop={layers.gloves!.iconId === 'manica_leather' ? [138,20,245,420] : layers.gloves!.iconId === 'manica_bronze' ? [643,20,250,420] : [1130,20,267,420]} box={[53,327,61,119]}/></g></g>)}</g>}
      {layers.amulet && <g {...gearProps(layers.amulet)}>
        <path d="M181 150Q181 220 222 238Q265 220 264 150" fill="none" stroke="#695135" strokeWidth="5"/><path d="M181 150Q181 220 222 238Q265 220 264 150" fill="none" stroke="#c8a469" strokeWidth="2"/>
        <circle cx="222" cy="240" r="17" fill="#9a7340" stroke="#e6c487" strokeWidth="3"/><circle cx="222" cy="240" r="12" fill="#46382a" stroke="#b99558"/><path d="M225 229L215 242H224L219 251L231 237H222Z" fill={layers.amulet.iconId === 'bulla_jupiter' ? '#d3d8ac' : '#bc935a'}/>
      </g>}
      {layers.helmet && <g {...gearProps(layers.helmet)} mask={head === 'galea_murmillo' ? undefined : ref('open-face')}>
        <Fragment src={equipment} sheet={[1247,1261]} crop={head === 'galea_recruit' ? [93,58,256,341] : head === 'galea_centurion' ? [497,8,255,390] : [833,8,376,395]} box={head === 'galea_recruit' ? [166,5,112,149] : head === 'galea_centurion' ? [166,-22,112,174] : [143,-29,158,181]}/>
      </g>}
      {layers.weapon && <g {...gearProps(layers.weapon)} transform={`rotate(${trident ? -7 : -17} 68 480)`}>
        {trident && <><path d="M67 465L67 844" stroke="#392819" strokeWidth="8"/><path d="M65 470L65 836" stroke="#9e7542" strokeWidth="2"/></>}
        <Fragment src={equipment} sheet={[1247,1261]} crop={trident ? [962,415,130,420] : goldBlade ? [580,419,89,415] : [179,430,83,401]} box={trident ? [32,70,72,420] : dagger ? [46,310,44,218] : [43,175,48,350]}/>
      </g>}
      {layers.weapon && <g clipPath={ref('grip')}>{body}</g>}
      {layers.ring && <g {...gearProps(layers.ring)}><path d="M57 484Q63 490 70 486" fill="none" stroke="#e2ba63" strokeWidth="3"/><circle cx="63" cy="487" r="3" fill={layers.ring.iconId === 'anulus_ruby' ? '#c84445' : '#aa813e'}/></g>}
      {layers.shield && <g {...gearProps(layers.shield)} transform="rotate(-8 385 480)"><Fragment src={equipment} sheet={[1247,1261]} crop={layers.shield.iconId === 'parma_bronze' ? [840,850,370,395] : layers.shield.iconId === 'scutum_wood' ? [86,852,258,395] : [496,850,257,397]} box={layers.shield.iconId === 'parma_bronze' ? [299,376,182,193] : [298,336,181,294]}/></g>}
    </svg>
    <span className="gladiator-aura-caption">{aura.label} <span>· Nível {level}</span></span>
  </div>;
}
